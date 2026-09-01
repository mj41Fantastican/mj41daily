import { NextRequest, NextResponse } from 'next/server';
import { subscribe, unsubscribe, isSubscribed } from '@/db/actions/subscribers';

/**
 * POST /api/subscribe
 * Body: { fid: number, walletAddress?: string, username?: string }
 * Subscribes the user for free — no payment required.
 * Idempotent.
 *
 * DELETE /api/subscribe
 * Body: { fid: number }
 * Unsubscribes the user.
 *
 * GET /api/subscribe?fid=123
 * Returns { subscribed: boolean }
 */

export async function GET(req: NextRequest) {
  const fid = Number(req.nextUrl.searchParams.get('fid'));
  if (!fid || isNaN(fid)) {
    return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
  }
  try {
    const subscribed = await isSubscribed(fid);
    return NextResponse.json({ subscribed });
  } catch (err) {
    console.error('subscribe GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { fid?: number; walletAddress?: string; username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const fid = Number(body.fid);
  if (!fid || isNaN(fid)) {
    return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
  }

  try {
    const result = await subscribe({
      fid,
      walletAddress: body.walletAddress,
      username: body.username,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('subscribe POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let body: { fid?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const fid = Number(body.fid);
  if (!fid || isNaN(fid)) {
    return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
  }

  try {
    await unsubscribe(fid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('subscribe DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
