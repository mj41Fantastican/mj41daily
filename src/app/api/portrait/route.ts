import { NextRequest, NextResponse } from "next/server";
import { resolvePortrait } from "@/lib/portrait";

/**
 * GET /api/portrait?fid=887819&address=0x…
 *
 * Works out which portrait a reader gets — their Farcaster picture, their ENS
 * avatar, or a mark cut from their wallet address. Never fails: a wallet on its
 * own is always enough to produce something.
 */
export async function GET(req: NextRequest) {
  const fidRaw = req.nextUrl.searchParams.get("fid");
  const address = req.nextUrl.searchParams.get("address");
  const fid = fidRaw ? Number(fidRaw) : null;

  if (!fid && !address) {
    return NextResponse.json({ error: "Pass fid or address" }, { status: 400 });
  }

  const portrait = await resolvePortrait({
    fid: Number.isFinite(fid) && fid! > 0 ? fid : null,
    address,
  });

  return NextResponse.json(portrait, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
