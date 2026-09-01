"use server";

import { db } from "@/neynar-db-sdk/db";
import { airdropWhitelist, issues } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Add a wallet address to the airdrop whitelist for an issue.
 * Called automatically when a reader pays for an issue that has airdropEnabled=true.
 */
export async function addToAirdropWhitelist(params: {
  issueId: number;
  fid: number;
  walletAddress: string;
  accessType: "read" | "mint";
  paymentMethod: "usdc" | "eth" | "rwac";
  txHash?: string;
}): Promise<{ success: boolean }> {
  try {
    // Check if issue has airdrop enabled
    const issueRows = await db
      .select({ airdropEnabled: issues.airdropEnabled })
      .from(issues)
      .where(eq(issues.id, params.issueId))
      .limit(1);

    if (!issueRows[0]?.airdropEnabled) return { success: false };

    // Avoid duplicates — one entry per (issueId, fid)
    const existing = await db
      .select({ id: airdropWhitelist.id })
      .from(airdropWhitelist)
      .where(
        eq(airdropWhitelist.issueId, params.issueId),
      )
      .limit(1000);

    const alreadyIn = existing.some((r) => (r as unknown as { fid: number }).fid === params.fid);
    if (alreadyIn) return { success: true };

    await db.insert(airdropWhitelist).values({
      issueId: params.issueId,
      fid: params.fid,
      walletAddress: params.walletAddress,
      accessType: params.accessType,
      paymentMethod: params.paymentMethod,
      txHash: params.txHash ?? null,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to add to airdrop whitelist:", error);
    return { success: false };
  }
}

export interface AirdropEntry {
  id: number;
  issueId: number;
  fid: number;
  walletAddress: string;
  accessType: string;
  paymentMethod: string;
  txHash: string | null;
  addedAt: Date;
}

/**
 * Get the full airdrop whitelist for an issue.
 */
export async function getAirdropWhitelist(issueId: number): Promise<AirdropEntry[]> {
  try {
    const rows = await db
      .select()
      .from(airdropWhitelist)
      .where(eq(airdropWhitelist.issueId, issueId))
      .orderBy(airdropWhitelist.addedAt);
    return rows as AirdropEntry[];
  } catch (error) {
    console.error("Failed to get airdrop whitelist:", error);
    return [];
  }
}

/**
 * Get all issues that have airdrop enabled, with their whitelist counts.
 */
export async function getAirdropIssues(): Promise<
  { issueId: number; issueNumber: number; date: string; count: number }[]
> {
  try {
    const airdropIssues = await db
      .select({
        id: issues.id,
        issueNumber: issues.issueNumber,
        date: issues.date,
        airdropEnabled: issues.airdropEnabled,
      })
      .from(issues)
      .where(eq(issues.airdropEnabled, true))
      .orderBy(desc(issues.publishedAt));

    const results = await Promise.all(
      airdropIssues.map(async (issue) => {
        const rows = await db
          .select({ id: airdropWhitelist.id })
          .from(airdropWhitelist)
          .where(eq(airdropWhitelist.issueId, issue.id));
        return {
          issueId: issue.id,
          issueNumber: issue.issueNumber,
          date: issue.date,
          count: rows.length,
        };
      }),
    );

    return results;
  } catch (error) {
    console.error("Failed to get airdrop issues:", error);
    return [];
  }
}

/**
 * Toggle airdrop on/off for an issue.
 */
export async function setAirdropEnabled(
  issueId: number,
  enabled: boolean,
): Promise<{ success: boolean }> {
  try {
    await db
      .update(issues)
      .set({ airdropEnabled: enabled })
      .where(eq(issues.id, issueId));
    return { success: true };
  } catch (error) {
    console.error("Failed to set airdrop enabled:", error);
    return { success: false };
  }
}
