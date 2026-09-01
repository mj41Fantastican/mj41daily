"use server";

import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API = "https://api.neynar.com/v2/farcaster";

export interface ChannelLookupResult {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  followerCount: number;
  url: string;
  pinnedCastText: string | null;
  pinnedCastAuthor: string | null;
  pinnedCastHash: string | null;
  leadFid: number | null;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing channel id" }, { status: 400 });

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  // Normalize: strip leading slash
  const channelId = id.replace(/^\//, "").trim().toLowerCase();

  try {
    const headers = { "x-api-key": apiKey, "Content-Type": "application/json" };

    // Fetch channel details
    const chanRes = await fetch(`${NEYNAR_API}/channel?id=${encodeURIComponent(channelId)}`, { headers });
    if (!chanRes.ok) {
      const err = await chanRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.message ?? "Channel not found" }, { status: chanRes.status });
    }
    const chanData = await chanRes.json();
    const ch = chanData.channel;
    if (!ch) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    // Fetch pinned cast if exists
    let pinnedCastText: string | null = null;
    let pinnedCastAuthor: string | null = null;
    let pinnedCastHash: string | null = null;

    const pinnedHash = ch.pinned_cast_hash ?? null;
    if (pinnedHash) {
      try {
        const castRes = await fetch(`${NEYNAR_API}/cast?identifier=${pinnedHash}&type=hash`, { headers });
        if (castRes.ok) {
          const castData = await castRes.json();
          const cast = castData.cast;
          if (cast) {
            pinnedCastText = cast.text ?? null;
            pinnedCastAuthor = cast.author?.username ? `@${cast.author.username}` : null;
            pinnedCastHash = pinnedHash;
          }
        }
      } catch {
        // pinned cast fetch is best-effort
      }
    }

    const result: ChannelLookupResult = {
      id: ch.id ?? channelId,
      name: ch.name ?? channelId,
      description: ch.description ?? "",
      imageUrl: ch.image_url ?? null,
      followerCount: ch.follower_count ?? 0,
      url: ch.url ?? `https://warpcast.com/~/channel/${channelId}`,
      pinnedCastText,
      pinnedCastAuthor,
      pinnedCastHash,
      leadFid: ch.lead?.fid ?? null,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("channel-lookup error:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
