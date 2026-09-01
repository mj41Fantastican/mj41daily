"use server";

import { db } from "@/neynar-db-sdk/db";
import { readerAccess, issueMints } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { addToAirdropWhitelist } from "@/db/actions/airdrop";

/**
 * Record that a user has unlocked (read access) an issue.
 * If the issue has airdrop enabled, the wallet address is added to the whitelist.
 */
export async function recordUnlock(
  fid: number,
  issueId: number,
  paymentMethod: "usdc" | "eth" | "rwac",
  txHash?: string,
  walletAddress?: string,
) {
  try {
    await db.insert(readerAccess).values({
      fid,
      issueId,
      accessType: "read",
      paymentMethod,
      txHash: txHash ?? null,
    });
    // Fire-and-forget airdrop whitelist — only inserts if issue has airdrop enabled
    if (walletAddress) {
      addToAirdropWhitelist({
        issueId,
        fid,
        walletAddress,
        accessType: "read",
        paymentMethod,
        txHash,
      }).catch((e) => console.error("Airdrop whitelist error:", e));
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to record unlock:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Record that a user has minted (owned) an issue NFT.
 * Also grants read access and adds wallet to airdrop whitelist if enabled.
 */
export async function recordMint(
  fid: number,
  issueId: number,
  txHash: string,
  paymentMethod: "usdc" | "eth" | "rwac" = "usdc",
  walletAddress?: string,
) {
  try {
    await Promise.all([
      db.insert(issueMints).values({ fid, issueId, txHash }),
      db.insert(readerAccess).values({
        fid,
        issueId,
        accessType: "mint",
        paymentMethod,
        txHash,
      }),
    ]);
    // Fire-and-forget airdrop whitelist — only inserts if issue has airdrop enabled
    if (walletAddress) {
      addToAirdropWhitelist({
        issueId,
        fid,
        walletAddress,
        accessType: "mint",
        paymentMethod,
        txHash,
      }).catch((e) => console.error("Airdrop whitelist error:", e));
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to record mint:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Check if a user has any access (read or mint) to an issue.
 */
export async function hasAccess(fid: number, issueId: number): Promise<boolean> {
  try {
    const rows = await db
      .select()
      .from(readerAccess)
      .where(and(eq(readerAccess.fid, fid), eq(readerAccess.issueId, issueId)))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    console.error("Failed to check access:", error);
    return false;
  }
}

/**
 * Reset all access records for a user (dev/testing only).
 * Clears both read unlocks and mint records.
 */
export async function resetAccess(fid: number): Promise<{ success: boolean }> {
  try {
    await Promise.all([
      db.delete(readerAccess).where(eq(readerAccess.fid, fid)),
      db.delete(issueMints).where(eq(issueMints.fid, fid)),
    ]);
    return { success: true };
  } catch (error) {
    console.error("Failed to reset access:", error);
    return { success: false };
  }
}

/**
 * Get all issue IDs the user has access to.
 */
export async function getUserAccessList(fid: number): Promise<number[]> {
  try {
    const rows = await db
      .select({ issueId: readerAccess.issueId })
      .from(readerAccess)
      .where(eq(readerAccess.fid, fid));
    return [...new Set(rows.map((r) => r.issueId))];
  } catch (error) {
    console.error("Failed to get user access list:", error);
    return [];
  }
}

export interface IssueStats {
  totalReaders: number;
  totalMints: number;
  byMethod: {
    usdc: number;
    eth: number;
    rwac: number;
  };
  mintsByMethod: {
    usdc: number;
    eth: number;
    rwac: number;
  };
  estimatedRevenueUsdc: number;
}

/**
 * Get aggregate stats for a specific issue (or all issues if issueId is null).
 */
export async function getIssueStats(issueId?: number | null): Promise<IssueStats> {
  try {
    // Reader access rows
    const accessQuery = db
      .select({
        paymentMethod: readerAccess.paymentMethod,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(readerAccess)
      .groupBy(readerAccess.paymentMethod);

    // Mint rows (no pre-applied .where() so we can conditionally add filters below)
    const mintsQuery = db
      .select({
        paymentMethod: readerAccess.paymentMethod,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(readerAccess)
      .groupBy(readerAccess.paymentMethod);

    const [accessRows, mintRows] = await Promise.all([
      issueId ? accessQuery.where(eq(readerAccess.issueId, issueId)) : accessQuery,
      issueId
        ? mintsQuery.where(and(eq(readerAccess.accessType, "mint"), eq(readerAccess.issueId, issueId)))
        : mintsQuery.where(eq(readerAccess.accessType, "mint")),
    ]);

    const byMethod = { usdc: 0, eth: 0, rwac: 0 };
    let totalReaders = 0;
    for (const row of accessRows) {
      const m = row.paymentMethod as "usdc" | "eth" | "rwac";
      if (m in byMethod) byMethod[m] += row.count;
      totalReaders += row.count;
    }

    const mintsByMethod = { usdc: 0, eth: 0, rwac: 0 };
    let totalMints = 0;
    for (const row of mintRows) {
      const m = row.paymentMethod as "usdc" | "eth" | "rwac";
      if (m in mintsByMethod) mintsByMethod[m] += row.count;
      totalMints += row.count;
    }

    // Estimate revenue: reads=$0.01, mints=$0.041 (USDC/ETH only, $RWACu excluded)
    const readRevenue = (byMethod.usdc + byMethod.eth - mintsByMethod.usdc - mintsByMethod.eth) * 0.01;
    const mintRevenue = (mintsByMethod.usdc + mintsByMethod.eth) * 0.041;
    const estimatedRevenueUsdc = Math.max(0, readRevenue + mintRevenue);

    return { totalReaders, totalMints, byMethod, mintsByMethod, estimatedRevenueUsdc };
  } catch (error) {
    console.error("Failed to get issue stats:", error);
    return {
      totalReaders: 0,
      totalMints: 0,
      byMethod: { usdc: 0, eth: 0, rwac: 0 },
      mintsByMethod: { usdc: 0, eth: 0, rwac: 0 },
      estimatedRevenueUsdc: 0,
    };
  }
}

/**
 * Reset ALL access stats across all issues (dev/testing only).
 */
export async function resetAllStats(): Promise<{ success: boolean }> {
  try {
    await Promise.all([
      db.delete(readerAccess),
      db.delete(issueMints),
    ]);
    return { success: true };
  } catch (error) {
    console.error("Failed to reset all stats:", error);
    return { success: false };
  }
}
