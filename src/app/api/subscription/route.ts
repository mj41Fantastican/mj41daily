import { NextRequest, NextResponse } from 'next/server';
import {
  grantSubscription,
  getActiveSubscription,
  hasActiveSubscription,
  PLAN_RWAC,
  type SubscriptionPlan,
} from '@/db/actions/subscriptions';
import { getCreditBalance, spendCredit } from '@/db/actions/credits';

/**
 * GET /api/subscription?fid=X
 * Returns subscription status + credit balance for a user.
 */
export async function GET(req: NextRequest) {
  const fid = parseInt(req.nextUrl.searchParams.get('fid') ?? '0', 10);
  if (!fid) return NextResponse.json({ error: 'fid required' }, { status: 400 });

  const [sub, credits] = await Promise.all([
    getActiveSubscription(fid),
    getCreditBalance(fid),
  ]);

  return NextResponse.json({
    ok: true,
    hasSubscription: sub !== null,
    subscription: sub ? {
      plan: sub.plan,
      expiresAt: sub.expiresAt,
      weeksGranted: sub.weeksGranted,
    } : null,
    credits,
  });
}

/**
 * POST /api/subscription
 * Called after a confirmed $RWACu transfer.
 * Body: { fid, walletAddress, username?, displayName?, txHash, plan? }
 *
 * Always grants 7 credits (41 $RWACu = 7 credits = 1 week of daily issues).
 * plan field is kept for record-keeping but credits are always 7.
 */
export async function POST(req: NextRequest) {
  let body: {
    fid?: number;
    walletAddress?: string;
    username?: string;
    displayName?: string;
    txHash?: string;
    plan?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.fid || !body.walletAddress || !body.txHash) {
    return NextResponse.json({ error: 'fid, walletAddress, txHash required' }, { status: 400 });
  }

  const plan = (body.plan ?? 'weekly') as SubscriptionPlan;

  const result = await grantSubscription({
    fid:          body.fid,
    walletAddress: body.walletAddress,
    username:     body.username,
    displayName:  body.displayName,
    plan,
    txHash:       body.txHash,
  });

  return NextResponse.json({
    ok: result.ok,
    alreadyUsed: result.alreadyUsed,
    credits: await getCreditBalance(body.fid),
    expiresAt: result.expiresAt,
  });
}

/**
 * POST /api/subscription/spend
 * Spend 1 credit to unlock an issue.
 * Body: { fid, issueId }
 */
export async function PATCH(req: NextRequest) {
  let body: { fid?: number; issueId?: number };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.fid) return NextResponse.json({ error: 'fid required' }, { status: 400 });

  const credits = await getCreditBalance(body.fid);
  if (credits <= 0) {
    return NextResponse.json({ ok: false, error: 'No credits remaining', credits: 0 });
  }

  await spendCredit(body.fid);
  return NextResponse.json({ ok: true, credits: credits - 1 });
}
