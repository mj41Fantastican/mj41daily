import { NextResponse } from "next/server";
import { publishDueIssues } from "@/db/actions/issues";

/**
 * Cron route — checks for scheduled issues whose time has arrived and publishes them.
 * Should be called every minute via a cron job (Vercel Cron: * * * * *).
 *
 * GET /api/cron/publish-scheduled
 */
export async function GET(request: Request) {
  // Simple auth check — cron secret prevents public triggering
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await publishDueIssues();
    return NextResponse.json({
      ok: true,
      published: result.published,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Scheduled publish cron failed:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
