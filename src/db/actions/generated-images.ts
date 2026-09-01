'use server';

import { db } from '@/neynar-db-sdk/db';
import { generatedImages } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export type GeneratedImageRow = typeof generatedImages.$inferSelect;

/** Save a newly generated cover image to the collection */
export async function saveGeneratedImage(data: {
  fid: number;
  username: string;
  displayName: string;
  imageUrl: string;
  headline: string;
  prompt?: string;
  edition?: string;
}): Promise<GeneratedImageRow> {
  // Ensure table exists (idempotent)
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS generated_images (
        id SERIAL PRIMARY KEY,
        fid INTEGER NOT NULL,
        username TEXT NOT NULL,
        display_name TEXT NOT NULL,
        image_url TEXT NOT NULL,
        headline TEXT NOT NULL,
        prompt TEXT,
        edition TEXT NOT NULL DEFAULT 'standard',
        was_minted BOOLEAN NOT NULL DEFAULT FALSE,
        mint_serial TEXT,
        generated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch { /* table already exists */ }

  const rows = await db
    .insert(generatedImages)
    .values({
      fid: data.fid,
      username: data.username,
      displayName: data.displayName,
      imageUrl: data.imageUrl,
      headline: data.headline,
      prompt: data.prompt ?? null,
      edition: data.edition ?? 'standard',
    })
    .returning();
  return rows[0];
}

/** Mark a generated image as minted and link its serial number */
export async function markImageMinted(imageUrl: string, serial: string): Promise<void> {
  await db
    .update(generatedImages)
    .set({ wasMinted: true, mintSerial: serial })
    .where(eq(generatedImages.imageUrl, imageUrl));
}

/** Get all generated images, newest first */
export async function getAllGeneratedImages(limit = 100): Promise<GeneratedImageRow[]> {
  return db
    .select()
    .from(generatedImages)
    .orderBy(desc(generatedImages.generatedAt))
    .limit(limit);
}

/** Get generated images for a specific FID */
export async function getGeneratedImagesByFid(fid: number): Promise<GeneratedImageRow[]> {
  return db
    .select()
    .from(generatedImages)
    .where(eq(generatedImages.fid, fid))
    .orderBy(desc(generatedImages.generatedAt));
}

/** Get generated images by edition (e.g. '420-special') */
export async function getGeneratedImagesByEdition(edition: string): Promise<GeneratedImageRow[]> {
  return db
    .select()
    .from(generatedImages)
    .where(eq(generatedImages.edition, edition))
    .orderBy(desc(generatedImages.generatedAt));
}

/** Get count of generated vs minted images */
export async function getImageCollectionStats(): Promise<{
  total: number;
  minted: number;
  unminted: number;
}> {
  const result = await db
    .select({
      total: sql<number>`COUNT(*)`,
      minted: sql<number>`COUNT(*) FILTER (WHERE was_minted = TRUE)`,
    })
    .from(generatedImages);
  const total = result[0]?.total ?? 0;
  const minted = result[0]?.minted ?? 0;
  return { total, minted, unminted: total - minted };
}
