import { NextResponse } from "next/server";

const NEYNAR = "https://api.neynar.com/v2/farcaster";

/**
 * GET /api/protocol-stats
 *
 * Neynar has no dedicated /stats endpoint, so we derive live Farcaster
 * network signals from real endpoints that do exist:
 *   - /feed/trending      → engagement pulse (likes, recasts, replies)
 *   - /channel/list       → top channels with follower counts
 *   - /user/power         → power-user roster + Neynar scores
 */
export async function GET() {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NEYNAR_API_KEY not configured" }, { status: 500 });
  }

  const headers = { "x-api-key": apiKey, "Content-Type": "application/json" };
  const opts = { headers, next: { revalidate: 0 } as const, signal: AbortSignal.timeout(10000) };

  try {
    // Fetch all three in parallel
    const [trendingRes, channelRes, powerRes] = await Promise.allSettled([
      fetch(`${NEYNAR}/feed/trending?limit=10&time_window=24h`, opts),
      fetch(`${NEYNAR}/channel/list?limit=20`, opts),
      fetch(`${NEYNAR}/user/power?limit=100`, opts),
    ]);

    // ── Trending feed stats ────────────────────────────────────────────
    let topCast: { text: string; author: string; likes: number } | null = null;
    let totalLikes = 0;
    let totalRecasts = 0;
    let totalReplies = 0;
    let trendingCount = 0;

    // Full top-10 trending cast list (exposed for Page 2)
    let top10Casts: { rank: number; text: string; author: string; likes: number; recasts: number; replies: number }[] = [];

    if (trendingRes.status === "fulfilled" && trendingRes.value.ok) {
      const data = await trendingRes.value.json();
      const casts: {
        text: string;
        author: { username: string };
        reactions: { likes_count: number; recasts_count: number };
        replies: { count: number };
      }[] = data.casts ?? [];
      trendingCount = casts.length;

      for (const c of casts) {
        totalLikes += c.reactions?.likes_count ?? 0;
        totalRecasts += c.reactions?.recasts_count ?? 0;
        totalReplies += c.replies?.count ?? 0;
      }

      top10Casts = casts.map((c, i) => ({
        rank: i + 1,
        text: c.text?.slice(0, 140) ?? "",
        author: c.author?.username ?? "unknown",
        likes: c.reactions?.likes_count ?? 0,
        recasts: c.reactions?.recasts_count ?? 0,
        replies: c.replies?.count ?? 0,
      }));

      if (casts.length > 0) {
        const top = casts[0];
        topCast = {
          text: top.text?.slice(0, 120) ?? "",
          author: top.author?.username ?? "unknown",
          likes: top.reactions?.likes_count ?? 0,
        };
      }
    }

    // ── Channel stats ──────────────────────────────────────────────────
    let totalChannelFollowers = 0;
    let topChannel: { name: string; followers: number } | null = null;
    let channelCount = 0;

    if (channelRes.status === "fulfilled" && channelRes.value.ok) {
      const data = await channelRes.value.json();
      const channels: { name: string; follower_count: number; member_count?: number }[] =
        data.channels ?? [];
      channelCount = channels.length;

      // Sort by follower count descending
      const sorted = [...channels].sort(
        (a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0)
      );

      totalChannelFollowers = sorted.reduce((s, c) => s + (c.follower_count ?? 0), 0);

      if (sorted.length > 0) {
        topChannel = {
          name: sorted[0].name,
          followers: sorted[0].follower_count ?? 0,
        };
      }
    }

    // ── Power user stats ───────────────────────────────────────────────
    let powerUserCount = 0;
    let avgScore = 0;
    let topPowerUser: { username: string; score: number } | null = null;

    if (powerRes.status === "fulfilled" && powerRes.value.ok) {
      const data = await powerRes.value.json();
      const users: {
        username: string;
        score?: number;
        experimental?: { neynar_user_score?: number };
      }[] = data.users ?? [];
      powerUserCount = users.length;

      const scores = users
        .map((u) => u.experimental?.neynar_user_score ?? u.score ?? 0)
        .filter((s) => s > 0);

      if (scores.length > 0) {
        avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      }

      if (users.length > 0) {
        const top = users[0];
        topPowerUser = {
          username: top.username,
          score: top.experimental?.neynar_user_score ?? top.score ?? 0,
        };
      }
    }

    const fmt = (n: number) => {
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
      return String(n);
    };

    return NextResponse.json({
      // Trending pulse (from top-10 trending casts, last 24h)
      trendingCasts: trendingCount,
      totalLikes: fmt(totalLikes),
      totalRecasts: fmt(totalRecasts),
      totalReplies: fmt(totalReplies),
      engagementTotal: fmt(totalLikes + totalRecasts + totalReplies),
      topCast,
      top10Casts,

      // Channel health
      channelCount,
      totalChannelFollowers: fmt(totalChannelFollowers),
      topChannel,

      // Power user network
      powerUserCount,
      avgNeynarScore: avgScore > 0 ? avgScore.toFixed(2) : null,
      topPowerUser,

      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[protocol-stats] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
