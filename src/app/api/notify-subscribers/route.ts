import { NextRequest, NextResponse } from 'next/server';
import { getNotifiableSubscribers, markAllNotified, getSubscriberCount } from '@/db/actions/subscribers';

/**
 * POST /api/notify-subscribers
 * Sends a Farcaster mini-app push notification to all subscribed users.
 *
 * Body: {
 *   title: string;           — notification title (max 32 chars)
 *   body: string;            — notification body (max 128 chars)
 *   targetUrl?: string;      — deep link URL (defaults to app root)
 *   secret?: string;         — optional editor secret for direct calls
 * }
 *
 * Returns: { sent: number, failed: number, total: number }
 */
export async function POST(req: NextRequest) {
  // Optional lightweight secret check for direct API calls
  const editorSecret = process.env.EDITOR_NOTIFY_SECRET;
  if (editorSecret) {
    const auth = req.headers.get('x-notify-secret');
    if (auth !== editorSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

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

  // Get the app's FID from env (set as NEXT_PUBLIC_USER_FID for this platform)
  const appFid = process.env.NEXT_PUBLIC_USER_FID;

  try {
    const subs = await getNotifiableSubscribers();
    if (subs.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, total: 0, message: 'No subscribers to notify' });
    }

    const fids = subs.map((s) => s.fid);

    // Neynar send frame notification API
    // https://docs.neynar.com/reference/publish-frame-notifications
    const payload = {
      target_fids: fids,
      notification: {
        title: body.title.slice(0, 32),
        body: body.body.slice(0, 128),
        ...(body.targetUrl ? { target_url: body.targetUrl } : {}),
      },
    };

    const res = await fetch('https://api.neynar.com/v2/farcaster/frame/notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': neynarApiKey,
        ...(appFid ? { 'x-neynar-experimental': 'true' } : {}),
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('Neynar notify error:', result);
      return NextResponse.json(
        { error: result.message ?? 'Notification delivery failed', detail: result },
        { status: res.status }
      );
    }

    // Mark all subscribers as notified
    await markAllNotified();

    const sent = result.notification_deliveries?.length ?? fids.length;
    const failed = result.errors?.length ?? 0;

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      total: fids.length,
      message: `Notified ${sent} subscriber${sent !== 1 ? 's' : ''}`,
    });
  } catch (err) {
    console.error('notify-subscribers error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * GET /api/notify-subscribers
 * Returns subscriber count (for editor dashboard display).
 */
export async function GET() {
  try {
    const count = await getSubscriberCount();
    return NextResponse.json({ count });
  } catch (err) {
    console.error('notify-subscribers GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
