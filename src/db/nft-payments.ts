import { db } from '@/neynar-db-sdk/db';
import { nftPaymentTxns } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function isPaymentTxUsed(txHash: string): Promise<boolean> {
  const result = await db
    .select()
    .from(nftPaymentTxns)
    .where(eq(nftPaymentTxns.txHash, txHash))
    .limit(1);
  return result.length > 0;
}

export async function markPaymentTxUsed(
  txHash: string,
  fid: number,
  collectionSlug: string,
): Promise<void> {
  await db
    .insert(nftPaymentTxns)
    .values({ txHash, fid, collectionSlug, usedAt: new Date() });
}
