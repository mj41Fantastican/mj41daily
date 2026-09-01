'use server';

import { db } from '@/neynar-db-sdk/db';
import { nftPreviews } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function getPreview(fid: number, collectionSlug: string) {
  const result = await db
    .select()
    .from(nftPreviews)
    .where(
      and(
        eq(nftPreviews.fid, fid),
        eq(nftPreviews.collectionSlug, collectionSlug),
      ),
    )
    .limit(1);
  return result[0] ?? null;
}

export async function savePreview(
  fid: number,
  collectionSlug: string,
  imageUrl: string,
) {
  await db
    .insert(nftPreviews)
    .values({ fid, collectionSlug, imageUrl })
    .onConflictDoUpdate({
      target: [nftPreviews.fid, nftPreviews.collectionSlug],
      set: { imageUrl },
    });
}

export async function deletePreview(fid: number, collectionSlug: string) {
  await db
    .delete(nftPreviews)
    .where(
      and(
        eq(nftPreviews.fid, fid),
        eq(nftPreviews.collectionSlug, collectionSlug),
      ),
    );
}
