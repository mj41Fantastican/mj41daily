import { db } from '@/neynar-db-sdk/db';
import { kv } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Credits are stored in the KV table as "credits:FID" -> number string
// 41 $RWACu = 7 credits (one per day of the week)
export const CREDITS_PER_PURCHASE = 7;
export const RWAC_PER_PURCHASE = 41;

function creditKey(fid: number): string {
  return `credits:${fid}`;
}

/** Get current credit balance for a FID. Returns 0 if none. */
export async function getCreditBalance(fid: number): Promise<number> {
  const rows = await db
    .select({ value: kv.value })
    .from(kv)
    .where(eq(kv.key, creditKey(fid)))
    .limit(1);
  return rows.length > 0 ? parseInt(rows[0].value, 10) || 0 : 0;
}

/** Add credits to a FID (called after confirmed payment). */
export async function addCredits(fid: number, amount = CREDITS_PER_PURCHASE): Promise<number> {
  const current = await getCreditBalance(fid);
  const newBalance = current + amount;
  await db
    .insert(kv)
    .values({ key: creditKey(fid), value: String(newBalance) })
    .onConflictDoUpdate({ target: kv.key, set: { value: String(newBalance) } });
  return newBalance;
}

/** Spend 1 credit. Returns new balance. Throws if no credits. */
export async function spendCredit(fid: number): Promise<number> {
  const current = await getCreditBalance(fid);
  if (current <= 0) throw new Error('No credits');
  const newBalance = current - 1;
  await db
    .insert(kv)
    .values({ key: creditKey(fid), value: String(newBalance) })
    .onConflictDoUpdate({ target: kv.key, set: { value: String(newBalance) } });
  return newBalance;
}

/** Check if a FID has at least 1 credit. */
export async function hasCredits(fid: number): Promise<boolean> {
  return (await getCreditBalance(fid)) > 0;
}
