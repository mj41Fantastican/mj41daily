import { NextResponse } from "next/server";
import { refreshFeed } from "@/db/actions/feed";

/**
 * Daily cron route — pulls the news wire and stores it for the editor.
 *
 * Sources are RSS (Hacker News, the NYT desks, WSJ, Ars Technica, CoinTelegraph,
 * ScienceDaily and others) plus CoinGecko for token prices. No API key, no
 * vendor that can wind down or start billing.
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

  const result = await refreshFeed();
  if (!result.success) {
    console.error("[daily-fetch]", result.error);
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({
    success: true,
    message: "Daily feed fetched and saved",
    fetchedAt: new Date().toISOString(),
  });
}
