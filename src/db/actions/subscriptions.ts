import { db } from '@/neynar-db-sdk/db';
import { paidSubscriptions } from '@/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { addCredits, CREDITS_PER_PURCHASE } from '@/db/actions/credits';

export type SubscriptionPlan = 'weekly' | 'monthly' | 'yearly';

export interface SubscriptionRow {
  id: number;
  fid: number;
  walletAddress: string;
  username: string | null;
  displayName: string | null;
  plan: string;
  weeksGranted: number;
  rwacAmount: string;
  txHash: string;
  startsAt: Date;
  expiresAt: Date;
  active: boolean;
  createdAt: Date;
}

// 41 $RWACu per week — base unit
export const RWAC_PER_WEEK = 41;

export const PLAN_WEEKS: Record<SubscriptionPlan, number> = {
  weekly:  1,
  monthly: 4,
  yearly:  52,
};

export const PLAN_RWAC: Record<SubscriptionPlan, number> = {
  weekly:  41,
  monthly: 164,   // 41 × 4
  yearly:  2132,  // 41 × 52
};

/** Grant a paid subscription after a confirmed $RWACu transfer. */
export async function grantSubscription(params: {
  fid: number;
  walletAddress: string;
  username?: string;
  displayName?: string;
  plan: SubscriptionPlan;
  txHash: string;
}): Promise<{ ok: boolean; alreadyUsed: boolean; expiresAt: Date }> {
  // Replay-attack guard: reject if tx already used
  const existing = await db
    .select({ id: paidSubscriptions.id })
    .from(paidSubscriptions)
    .where(eq(paidSubscriptions.txHash, params.txHash))
    .limit(1);

  if (existing.length > 0) {
    const row = await db
      .select()
      .from(paidSubscriptions)
      .where(eq(paidSubscriptions.txHash, params.txHash))
      .limit(1);
    return { ok: true, alreadyUsed: true, expiresAt: row[0].expiresAt };
  }

  const weeks = PLAN_WEEKS[params.plan];
  const rwac  = PLAN_RWAC[params.plan];

  // If user already has an active subscription, extend from current expiry
  const active = await getActiveSubscription(params.fid);
  const base = (active && active.expiresAt > new Date()) ? active.expiresAt : new Date();
  const expiresAt = new Date(base.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);

  await db.insert(paidSubscriptions).values({
    fid:          params.fid,
    walletAddress: params.walletAddress,
    username:     params.username ?? null,
    displayName:  params.displayName ?? null,
    plan:         params.plan,
    weeksGranted: weeks,
    rwacAmount:   String(rwac),
    txHash:       params.txHash,
    startsAt:     new Date(),
    expiresAt,
    active:       true,
  });

  // Grant 7 credits per purchase regardless of plan
  // (user buys more = more credits, simple and clean)
  await addCredits(params.fid, CREDITS_PER_PURCHASE);

  return { ok: true, alreadyUsed: false, expiresAt };
}

/** Returns the most recent active subscription for a FID, or null. */
export async function getActiveSubscription(fid: number): Promise<SubscriptionRow | null> {
  const now = new Date();
  const rows = await db
    .select()
    .from(paidSubscriptions)
    .where(and(eq(paidSubscriptions.fid, fid), gte(paidSubscriptions.expiresAt, now)))
    .orderBy(desc(paidSubscriptions.expiresAt))
    .limit(1);
  return rows.length > 0 ? (rows[0] as SubscriptionRow) : null;
}

/** Check if a FID currently has an active subscription. */
export async function hasActiveSubscription(fid: number): Promise<boolean> {
  const sub = await getActiveSubscription(fid);
  return sub !== null;
}

/** Get all subscription records for a FID (history). */
export async function getSubscriptionHistory(fid: number): Promise<SubscriptionRow[]> {
  return db
    .select()
    .from(paidSubscriptions)
    .where(eq(paidSubscriptions.fid, fid))
    .orderBy(desc(paidSubscriptions.createdAt)) as Promise<SubscriptionRow[]>;
}

/** Admin: total unique subscriber FIDs (ever paid). */
export async function getTotalSubscriberCount(): Promise<number> {
  const result = await db
    .selectDistinct({ fid: paidSubscriptions.fid })
    .from(paidSubscriptions);
  return result.length;
}

/** Admin: total active subscribers right now. */
export async function getActiveSubscriberCount(): Promise<number> {
  const now = new Date();
  const result = await db
    .selectDistinct({ fid: paidSubscriptions.fid })
    .from(paidSubscriptions)
    .where(gte(paidSubscriptions.expiresAt, now));
  return result.length;
}

/** Admin: total $RWACu revenue across all subscriptions. */
export async function getTotalRevenue(): Promise<number> {
  const rows = await db
    .select({ amount: paidSubscriptions.rwacAmount })
    .from(paidSubscriptions);
  return rows.reduce((sum, r) => sum + (parseInt(r.amount, 10) || 0), 0);
}

/** Admin: all subscribers list (for airdrop whitelist — editor-only). */
export async function getAllSubscribersForAirdrop(): Promise<{
  fid: number;
  walletAddress: string;
  username: string | null;
  plan: string;
  expiresAt: Date;
  createdAt: Date;
}[]> {
  const rows = await db
    .selectDistinct({
      fid:           paidSubscriptions.fid,
      walletAddress: paidSubscriptions.walletAddress,
      username:      paidSubscriptions.username,
      plan:          paidSubscriptions.plan,
      expiresAt:     paidSubscriptions.expiresAt,
      createdAt:     paidSubscriptions.createdAt,
    })
    .from(paidSubscriptions)
    .orderBy(desc(paidSubscriptions.createdAt));
  return rows as {
    fid: number; walletAddress: string; username: string | null;
    plan: string; expiresAt: Date; createdAt: Date;
  }[];
}

/** Admin: recent subscriptions (last N). */
export async function getRecentSubscriptions(limit = 50): Promise<SubscriptionRow[]> {
  return db
    .select()
    .from(paidSubscriptions)
    .orderBy(desc(paidSubscriptions.createdAt))
    .limit(limit) as Promise<SubscriptionRow[]>;
}

/** Admin: revenue by plan breakdown. */
export async function getRevenuByPlan(): Promise<Record<string, { count: number; rwac: number }>> {
  const rows = await db
    .select({
      plan:   paidSubscriptions.plan,
      amount: paidSubscriptions.rwacAmount,
    })
    .from(paidSubscriptions);

  const result: Record<string, { count: number; rwac: number }> = {};
  for (const r of rows) {
    if (!result[r.plan]) result[r.plan] = { count: 0, rwac: 0 };
    result[r.plan].count++;
    result[r.plan].rwac += parseInt(r.amount, 10) || 0;
  }
  return result;
}
