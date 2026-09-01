import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/neynar-db-sdk/db';
import { readerAccess } from '@/db/schema';
import { sql } from 'drizzle-orm';

/**
 * POST /api/notify-readers
 * Sends a Farcaster mini-app push notification to all FIDs that have
 * ever paid to read or mint any issue (from readerAccess table).
 *
 * This is distinct from /api/notify-subscribers which targets free subscribers.
 * Paid readers already engaged enough to pay — they're the core audience.
 *
 * Body: { title: string; body: string; targetUrl?: string }
 * Returns: { ok, sent, failed, total }
 */
export async function POST(req: NextRequest) {
  let body: { title?: string; body?: string; targetUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.title || !body.body) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
  }

  const neynarApiKey = process.env.NEYNAR_API_KEY;
  if (!neynarApiKey) {
    return NextResponse.json({ error: 'NEYNAR_API_KEY not configured' }, { status: 500 });
  }

  try {
    // Get all unique FIDs that have ever paid to read/mint
    const rows = await db
      .selectDistinct({ fid: readerAccess.fid })
      .from(readerAccess);

    const fids = rows.map((r) => r.fid);

    if (fids.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, total: 0, message: 'No paid readers yet' });
    }

    // Neynar send frame notification API — batched to 100 FIDs max per call
    const BATCH_SIZE = 100;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < fids.length; i += BATCH_SIZE) {
      const batch = fids.slice(i, i + BATCH_SIZE);
      const payload = {
        target_fids: batch,
        notification: {
          title: body.title.slice(0, 32),
          body: body.body.slice(0, 128),
          ...(body.targetUrl ? { target_url: body.targetUrl } : {}),
        },
      };

      try {
        const res = await fetch('https://api.neynar.com/v2/farcaster/frame/notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': neynarApiKey,
          },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (res.ok) {
          totalSent += result.notification_deliveries?.length ?? batch.length;
          totalFailed += result.errors?.length ?? 0;
        } else {
          console.error('Neynar notify-readers batch error:', result);
          totalFailed += batch.length;
        }
      } catch (batchErr) {
        console.error('notify-readers batch fetch error:', batchErr);
        totalFailed += batch.length;
      }
    }

    return NextResponse.json({
      ok: true,
      sent: totalSent,
      failed: totalFailed,
      total: fids.length,
      message: `Notified ${totalSent} paid reader${totalSent !== 1 ? 's' : ''}`,
    });
  } catch (err) {
    console.error('notify-readers error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * GET /api/notify-readers
 * Returns count of unique paid reader FIDs.
 */
export async function GET() {
  try {
    const rows = await db
      .selectDistinct({ fid: readerAccess.fid })
      .from(readerAccess);
    return NextResponse.json({ count: rows.length });
  } catch (err) {
    console.error('notify-readers GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
