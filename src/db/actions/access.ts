"use server";

import { db } from "@/neynar-db-sdk/db";
import { readerAccess, issueMints } from "@/db/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { addToAirdropWhitelist } from "@/db/actions/airdrop";

/**
 * Who a reader is.
 *
 * Every reader has a wallet; only readers arriving through Farcaster have an FID.
 * Access is therefore matched on either credential, so a reader who pays inside
 * Farcaster and comes back in a browser with the same wallet keeps their access —
 * and a browser reader with no FID can be recorded at all, which the old
 * FID-only schema made impossible.
 */
export type ReaderIdentity = {
  walletAddress?: string | null;
  fid?: number | null;
};

/** Normalise once, so casing never causes a missed match. */
function normalize(identity: ReaderIdentity) {
  return {
    walletAddress: identity.walletAddress ? identity.walletAddress.toLowerCase() : null,
    fid: identity.fid ?? null,
  };
}

/** Match rows belonging to this reader by either credential. */
function identityMatch(
  table: typeof readerAccess | typeof issueMints,
  identity: ReaderIdentity,
) {
  const { walletAddress, fid } = normalize(identity);
  const clauses = [];
  if (walletAddress) clauses.push(eq(table.walletAddress, walletAddress));
  if (fid) clauses.push(eq(table.fid, fid));
  if (clauses.length === 0) return undefined;
  return clauses.length === 1 ? clauses[0] : or(...clauses);
}

/**
 * Record that a reader has unlocked an issue.
 * If the issue has airdrop enabled, the wallet is added to the whitelist.
 */
export async function recordUnlock(
  identity: ReaderIdentity,
  issueId: number,
  paymentMethod: "usdc" | "eth" | "rwac",
  txHash?: string,
) {
  const { walletAddress, fid } = normalize(identity);
  if (!walletAddress && !fid) {
    return { success: false, error: "No wallet or Farcaster ID to record against" };
  }
  try {
    await db.insert(readerAccess).values({
      walletAddress,
      fid,
      issueId,
      accessType: "read",
      paymentMethod,
      txHash: txHash ?? null,
    });
    // Fire-and-forget — only inserts if the issue has airdrop enabled
    if (walletAddress) {
      addToAirdropWhitelist({
        issueId,
        fid: fid ?? 0,
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
 * Record an issue NFT mint. Also grants read access.
 */
export async function recordMint(
  identity: ReaderIdentity,
  issueId: number,
  txHash: string,
  paymentMethod: "usdc" | "eth" | "rwac" = "usdc",
) {
  const { walletAddress, fid } = normalize(identity);
  if (!walletAddress && !fid) {
    return { success: false, error: "No wallet or Farcaster ID to record against" };
  }
  try {
    await Promise.all([
      db.insert(issueMints).values({ walletAddress, fid, issueId, txHash }),
      db.insert(readerAccess).values({
        walletAddress,
        fid,
        issueId,
        accessType: "mint",
        paymentMethod,
        txHash,
      }),
    ]);
    if (walletAddress) {
      addToAirdropWhitelist({
        issueId,
        fid: fid ?? 0,
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

/** Whether this reader has any access — read or mint — to an issue. */
export async function hasAccess(
  identity: ReaderIdentity,
  issueId: number,
): Promise<boolean> {
  const match = identityMatch(readerAccess, identity);
  if (!match) return false;
  try {
    const rows = await db
      .select({ id: readerAccess.id })
      .from(readerAccess)
      .where(and(match, eq(readerAccess.issueId, issueId)))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    console.error("Failed to check access:", error);
    return false;
  }
}

/** Clear a reader's access records. Editor dev tool. */
export async function resetAccess(identity: ReaderIdentity): Promise<{ success: boolean }> {
  const accessMatch = identityMatch(readerAccess, identity);
  const mintMatch = identityMatch(issueMints, identity);
  if (!accessMatch || !mintMatch) return { success: false };
  try {
    await Promise.all([
      db.delete(readerAccess).where(accessMatch),
      db.delete(issueMints).where(mintMatch),
    ]);
    return { success: true };
  } catch (error) {
    console.error("Failed to reset access:", error);
    return { success: false };
  }
}

/** Every issue id this reader can open. */
export async function getUserAccessList(identity: ReaderIdentity): Promise<number[]> {
  const match = identityMatch(readerAccess, identity);
  if (!match) return [];
  try {
    const rows = await db
      .select({ issueId: readerAccess.issueId })
      .from(readerAccess)
      .where(match);
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
