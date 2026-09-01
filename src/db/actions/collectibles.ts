'use server';

import { db } from '@/neynar-db-sdk/db';
import { personalCoverMints } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export type PersonalCoverMintRow = typeof personalCoverMints.$inferSelect;

/** Generate the next serial number string, e.g. MJ41FCTRB0000001 */
export async function nextSerial(): Promise<{ serial: string; index: number }> {
  const result = await db
    .select({ maxIndex: sql<number>`COALESCE(MAX(serial_index), 0)` })
    .from(personalCoverMints);
  const index = (result[0]?.maxIndex ?? 0) + 1;
  const serial = `MJ41FCTRB${String(index).padStart(7, '0')}`;
  return { serial, index };
}

/** Save a new minted cover record */
export async function saveCoverMint(data: {
  serial: string;
  serialIndex: number;
  fid: number;
  username: string;
  displayName: string;
  tokenId?: string;
  contractAddress: string;
  network?: string;
  txHash?: string;
  metadataUri?: string;
  imageUrl: string;
  issueDate: string;
  issueValue?: string;
  neynarScore?: string | null;
  headline: string;
  openSeaUrl?: string;
}): Promise<PersonalCoverMintRow> {
  const rows = await db
    .insert(personalCoverMints)
    .values({
      serial: data.serial,
      serialIndex: data.serialIndex,
      fid: data.fid,
      username: data.username,
      displayName: data.displayName,
      tokenId: data.tokenId ?? null,
      contractAddress: data.contractAddress,
      network: data.network ?? 'base',
      txHash: data.txHash ?? null,
      metadataUri: data.metadataUri ?? null,
      imageUrl: data.imageUrl,
      issueDate: data.issueDate,
      issueValue: data.issueValue ?? '$0.041',
      neynarScore: data.neynarScore ?? null,
      headline: data.headline,
      openSeaUrl: data.openSeaUrl ?? null,
    })
    .returning();
  return rows[0];
}

/** Update a mint record with token ID + metadata URI after on-chain mint */
export async function updateMintToken(
  serial: string,
  tokenId: string,
  metadataUri: string,
  txHash: string,
  openSeaUrl: string,
) {
  await db
    .update(personalCoverMints)
    .set({ tokenId, metadataUri, txHash, openSeaUrl })
    .where(eq(personalCoverMints.serial, serial));
}

/** Fetch all mints for a user ordered newest first */
export async function getUserCollectibles(fid: number): Promise<PersonalCoverMintRow[]> {
  return db
    .select()
    .from(personalCoverMints)
    .where(eq(personalCoverMints.fid, fid))
    .orderBy(desc(personalCoverMints.mintedAt));
}

/** Fetch ALL mints across all users, newest first (for public gallery) */
export async function getAllMints(limit = 50): Promise<PersonalCoverMintRow[]> {
  return db
    .select()
    .from(personalCoverMints)
    .orderBy(desc(personalCoverMints.mintedAt))
    .limit(limit);
}

/** Fetch a single mint by serial */
export async function getMintBySerial(serial: string): Promise<PersonalCoverMintRow | null> {
  const rows = await db
    .select()
    .from(personalCoverMints)
    .where(eq(personalCoverMints.serial, serial))
    .limit(1);
  return rows[0] ?? null;
}
