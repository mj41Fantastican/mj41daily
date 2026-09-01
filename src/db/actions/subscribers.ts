'use server';

import { db } from '@/neynar-db-sdk/db';
import { subscribers } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export interface SubscriberRow {
  id: number;
  fid: number;
  walletAddress: string | null;
  username: string | null;
  subscribedAt: Date;
  notificationsEnabled: boolean | null;
  lastNotifiedAt: Date | null;
}

/** Subscribe a user — idempotent (upsert by FID). */
export async function subscribe(params: {
  fid: number;
  walletAddress?: string;
  username?: string;
}): Promise<{ ok: boolean; alreadySubscribed: boolean }> {
  const existing = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.fid, params.fid))
    .limit(1);

  if (existing.length > 0) {
    // Update wallet/username if provided
    if (params.walletAddress || params.username) {
      await db
        .update(subscribers)
        .set({
          walletAddress: params.walletAddress ?? existing[0].walletAddress,
          username: params.username ?? existing[0].username,
        })
        .where(eq(subscribers.fid, params.fid));
    }
    return { ok: true, alreadySubscribed: true };
  }

  await db.insert(subscribers).values({
    fid: params.fid,
    walletAddress: params.walletAddress ?? null,
    username: params.username ?? null,
    notificationsEnabled: true,
  });

  return { ok: true, alreadySubscribed: false };
}

/** Unsubscribe a user by FID. */
export async function unsubscribe(fid: number): Promise<void> {
  await db.delete(subscribers).where(eq(subscribers.fid, fid));
}

/** Check if a FID is subscribed. */
export async function isSubscribed(fid: number): Promise<boolean> {
  const rows = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(eq(subscribers.fid, fid))
    .limit(1);
  return rows.length > 0;
}

/** Get total subscriber count. */
export async function getSubscriberCount(): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)::int` }).from(subscribers);
  return result[0]?.count ?? 0;
}

/** Get all subscribers with notifications enabled (for broadcasting). */
export async function getNotifiableSubscribers(): Promise<SubscriberRow[]> {
  const rows = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.notificationsEnabled, true));
  return rows as SubscriberRow[];
}

/** Mark all subscribers as notified (update lastNotifiedAt). */
export async function markAllNotified(): Promise<void> {
  await db.update(subscribers).set({ lastNotifiedAt: new Date() });
}

/** Get all subscribers (for admin view). */
export async function getAllSubscribers(): Promise<SubscriberRow[]> {
  return db.select().from(subscribers) as Promise<SubscriberRow[]>;
}
