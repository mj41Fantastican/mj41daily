import { NextResponse } from "next/server";
import { refreshFeed, saveFeedData } from "@/db/actions/feed";
import type { TrendingCast, TopChannel, TopToken, MiniApp as MiniAppType, NetworkStats } from "@/features/app/types";

const NEYNAR_API = "https://api.neynar.com/v2/farcaster";

/**
 * Daily cron route — fetches Neynar data and stores in DB for curator dashboard.
 * Call this endpoint via a cron job (e.g. Vercel Cron, GitHub Actions).
 *
 * GET /api/cron/daily-fetch
 *
 * Protected by CRON_SECRET env var (optional but recommended).
 */
export async function GET(request: Request) {
  // Optional: protect with a secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Delegate to refreshFeed() which handles Neynar + news categories + tokens
  const result = await refreshFeed();
  if (result.success) {
    return NextResponse.json({ success: true, message: "Daily feed data fetched and saved (via refreshFeed)" });
  }

  // Fallback: manual fetch without news categories (legacy path)
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NEYNAR_API_KEY not configured" }, { status: 500 });
  }

  const headers = { "x-api-key": apiKey, "Content-Type": "application/json" };

  try {
    // Fetch trending casts (last 24h, ranked by engagement)
    const trendingRes = await fetch(
      `${NEYNAR_API}/feed/trending?limit=10&time_window=24h`,
      { headers },
    );
    const trendingData = await trendingRes.json();

    const trendingCasts: TrendingCast[] = (trendingData.casts ?? [])
      .slice(0, 10)
      .map((cast: { hash: string; author: { username: string }; text: string; reactions: { likes_count: number; recasts_count: number } }, idx: number) => ({
        id: cast.hash ?? `c${idx}`,
        author: `@${cast.author?.username ?? "unknown"}`,
        text: cast.text ?? "",
        likes: cast.reactions?.likes_count ?? 0,
        recasts: cast.reactions?.recasts_count ?? 0,
        signal: (cast.reactions?.likes_count ?? 0) > 500 ? "positive" : "negative",
      }));

    // Fetch top channels by activity
    const channelsRes = await fetch(
      `${NEYNAR_API}/channel/list?limit=10`,
      { headers },
    );
    const channelsData = await channelsRes.json();

    const topChannels: TopChannel[] = (channelsData.channels ?? [])
      .slice(0, 10)
      .map((ch: { id: string; name: string; follower_count: number }, idx: number) => ({
        id: ch.id ?? `ch${idx}`,
        name: `/${ch.name ?? ch.id}`,
        members: ch.follower_count?.toLocaleString() ?? "0",
        casts24h: Math.floor(Math.random() * 5000) + 100, // TODO: replace with real cast count endpoint
        growth: "+0%",
      }));

    // Fetch new frames/mini apps (last 24h)
    const framesRes = await fetch(
      `${NEYNAR_API}/frame/list?limit=10`,
      { headers },
    );
    const framesData = await framesRes.json();

    const newMiniApps: MiniAppType[] = (framesData.frames ?? [])
      .slice(0, 5)
      .map((frame: { uuid?: string; name?: string; description?: string; creator_displays?: { username?: string }[]; url?: string }, idx: number) => ({
        id: frame.uuid ?? `a${idx}`,
        name: frame.name ?? `App ${idx + 1}`,
        desc: frame.description ?? "A new mini app",
        author: `@${frame.creator_displays?.[0]?.username ?? "builder"}`,
        url: frame.url ?? undefined,
      }));

    // Network stats — use cast feed to approximate
    const networkStats: NetworkStats = {
      totalAccounts: "500K+",
      dau: "50K+",
      dauChange: "+0%",
      newToday: "1,000+",
      castsToday: "200K+",
    };

    // Top tokens — fetch real price data from CoinGecko
    // Token IDs on CoinGecko: degen-base, moxie, higher
    const FARCASTER_TOKENS = [
      { id: "t1", symbol: "$DEGEN",  cgId: "degen-base",  mentions: 3000, contractAddress: "0x4ed4e862860bed51a9570b96d89af5e1b0efefed" },
      { id: "t2", symbol: "$MOXIE",  cgId: "moxie-protocol-2", mentions: 1500, contractAddress: "0x8c9037d1ef5c6d1f6816278c7aaf5491d24cd527" },
      { id: "t3", symbol: "$HIGHER", cgId: "higher",      mentions: 1000, contractAddress: "0x0578d8a44db98b23bf096a382e016e29a5ce0ffe" },
    ];

    let topTokens: TopToken[];
    try {
      const cgIds = FARCASTER_TOKENS.map((t) => t.cgId).join(",");
      const cgRes = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cgIds}&price_change_percentage=24h,7d,30d,1y`,
        { headers: { Accept: "application/json" } },
      );
      const cgData = await cgRes.json();
      topTokens = FARCASTER_TOKENS.map((t) => {
        const cg = (cgData as Array<{id: string; current_price: number; price_change_percentage_24h: number; price_change_percentage_7d_in_currency: number; price_change_percentage_30d_in_currency: number; price_change_percentage_1y_in_currency: number; market_cap: number; total_volume: number}>).find((c) => c.id === t.cgId);
        const fmt = (n: number | undefined | null) => n != null ? `${n >= 0 ? "+" : ""}${n.toFixed(1)}%` : "—";
        const fmtPrice = (n: number | undefined | null) => n != null ? n < 0.01 ? `$${n.toFixed(6)}` : `$${n.toFixed(4)}` : "—";
        const fmtLarge = (n: number | undefined | null) => n != null ? n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}` : "—";
        return {
          id: t.id,
          symbol: t.symbol,
          mentions: t.mentions,
          price: fmtPrice(cg?.current_price),
          change: fmt(cg?.price_change_percentage_24h),
          change7d: fmt(cg?.price_change_percentage_7d_in_currency),
          change30d: fmt(cg?.price_change_percentage_30d_in_currency),
          change1y: fmt(cg?.price_change_percentage_1y_in_currency),
          marketCap: fmtLarge(cg?.market_cap),
          volume24h: fmtLarge(cg?.total_volume),
          contractAddress: t.contractAddress,
          signal: (cg?.price_change_percentage_24h ?? 0) >= 0 ? "positive" : "negative",
        };
      });
    } catch {
      // Fallback if CoinGecko fails
      topTokens = FARCASTER_TOKENS.map((t) => ({
        ...t, price: "—", change: "—", signal: "positive" as const,
      }));
    }

    // Compute deadline and time left
    const deadline = "12:00 UTC";
    const now = new Date();
    const deadlineToday = new Date();
    deadlineToday.setUTCHours(12, 0, 0, 0);
    const diffMs = deadlineToday.getTime() - now.getTime();
    const hoursLeft = Math.max(0, Math.floor(diffMs / 1000 / 60 / 60));
    const minsLeft = Math.max(0, Math.floor((diffMs / 1000 / 60) % 60));
    const timeLeft = diffMs > 0 ? `${hoursLeft}h ${minsLeft}m` : "Past deadline";

    await saveFeedData({
      trendingCasts,
      topChannels,
      topTokens,
      newMiniApps,
      networkStats,
      deadline,
      timeLeft,
    });

    return NextResponse.json({
      success: true,
      message: "Daily feed data fetched and saved",
      counts: {
        trendingCasts: trendingCasts.length,
        topChannels: topChannels.length,
        newMiniApps: newMiniApps.length,
      },
    });
  } catch (error) {
    console.error("Cron daily-fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily data", detail: String(error) },
      { status: 500 },
    );
  }
}
