import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/token-lookup?ca=0x...&network=base
 *
 * Looks up a token by contract address and returns normalized data
 * for use in PinnedTokensEditor. Proxies through /api/gecko-token.
 */
export async function GET(req: NextRequest) {
  const ca = req.nextUrl.searchParams.get("ca")?.toLowerCase().trim();
  const network = req.nextUrl.searchParams.get("network") ?? "base";

  if (!ca) {
    return NextResponse.json({ error: "Missing ca param" }, { status: 400 });
  }

  try {
    const baseUrl = req.nextUrl.origin;
    const res = await fetch(
      `${baseUrl}/api/gecko-token?ca=${encodeURIComponent(ca)}&network=${encodeURIComponent(network)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error ?? `Token not found (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Return a simplified shape for the token editor
    return NextResponse.json({
      symbol: data.symbol ? `$${data.symbol.replace(/^\$/, '')}` : null,
      name: data.name ?? null,
      contractAddress: ca,
      network,
      price: data.price ?? "—",
      change: data.change24h ?? "—",
      marketCap: data.marketCap ?? null,
      volume24h: data.volume24h ?? null,
      imageUrl: null,
    });
  } catch (err) {
    console.error("token-lookup error:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
