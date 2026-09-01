import { NextResponse } from 'next/server';
import { db } from '@/neynar-db-sdk/db';
import { issues, readerAccess, personalCoverMints, paidSubscriptions } from '@/db/schema';
import { sql, gte, desc } from 'drizzle-orm';
import {
  getTotalSubscriberCount,
  getActiveSubscriberCount,
  getTotalRevenue,
  getRevenuByPlan,
  getRecentSubscriptions,
  getAllSubscribersForAirdrop,
} from '@/db/actions/subscriptions';

/**
 * GET /api/editor-stats
 * Returns publication stats + airdrop-eligible wallet list.
 * No auth check here — the component is only rendered for isEditor === true.
 */
export async function GET() {
  try {
    const [
      totalIssuesResult,
      totalReadersResult,
      totalMintsResult,
      totalSubs,
      activeSubs,
      totalRevenue,
      revenueByPlan,
      recentSubs,
      airdropList,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(issues),
      db.selectDistinct({ fid: readerAccess.fid }).from(readerAccess),
      db.select({ count: sql<number>`count(*)::int` }).from(personalCoverMints),
      getTotalSubscriberCount(),
      getActiveSubscriberCount(),
      getTotalRevenue(),
      getRevenuByPlan(),
      getRecentSubscriptions(50),
      getAllSubscribersForAirdrop(),
    ]);

    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      totalIssues:     totalIssuesResult[0]?.count ?? 0,
      totalReaders:    totalReadersResult.length,
      totalMints:      totalMintsResult[0]?.count ?? 0,
      totalSubscribers: totalSubs,
      activeSubscribers: activeSubs,
      totalRevenue,
      revenueByPlan,
      recentSubs: recentSubs.map((s) => ({
        fid:           s.fid,
        username:      s.username,
        plan:          s.plan,
        rwacAmount:    s.rwacAmount,
        createdAt:     s.createdAt.toISOString(),
        expiresAt:     s.expiresAt.toISOString(),
        walletAddress: s.walletAddress,
      })),
      airdropList: airdropList.map((r) => ({
        fid:           r.fid,
        walletAddress: r.walletAddress,
        username:      r.username,
        plan:          r.plan,
      })),
    });
  } catch (err) {
    console.error('editor-stats error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to load stats' }, { status: 500 });
  }
}
