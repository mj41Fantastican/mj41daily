"use server";

import { NextRequest, NextResponse } from "next/server";

// Search tokens by name or symbol using GeckoTerminal + CoinGecko
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const network = req.nextUrl.searchParams.get("network") ?? "base";
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const cgKey = process.env.COINGECKO_API_KEY ?? "CG-CaEsrDJisDK1Cn5AWTyLjWvR";

  try {
    // Search CoinGecko for matching tokens
    const searchRes = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
      {
        headers: { "x-cg-demo-api-key": cgKey, Accept: "application/json" },
        next: { revalidate: 300 },
      }
    );

    if (!searchRes.ok) return NextResponse.json({ results: [] });

    const searchData = await searchRes.json();
    const coins = (searchData.coins ?? []).slice(0, 8).map((c: {
      id: string; name: string; symbol: string; thumb?: string; market_cap_rank?: number;
      platforms?: Record<string, string>;
    }) => ({
      id: c.id,
      name: c.name,
      symbol: `$${c.symbol.toUpperCase()}`,
      imageUrl: c.thumb ?? null,
      rank: c.market_cap_rank ?? 9999,
      // Try to extract contract address from platforms
      contractAddress: c.platforms?.["base"] ?? c.platforms?.["ethereum"] ?? null,
      network: c.platforms?.["base"] ? "base" : c.platforms?.["ethereum"] ? "eth" : network,
    }));

    return NextResponse.json({ results: coins });
  } catch (err) {
    console.error("token-search error:", err);
    return NextResponse.json({ results: [] });
  }
}
