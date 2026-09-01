import { NextResponse } from "next/server";

/**
 * GET /api/gecko-token?network=base&ca=0x...
 *
 * Looks up a token by contract address on GeckoTerminal.
 * Returns normalized token data: price, changes, volume, market cap, description.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ca = searchParams.get("ca")?.toLowerCase().trim();
  const network = searchParams.get("network") ?? "base";

  if (!ca) {
    return NextResponse.json({ error: "Missing ca param" }, { status: 400 });
  }

  // CG-xxx keys are "demo" keys — use x-cg-demo-api-key for both GeckoTerminal and CoinGecko REST
  const apiKey = process.env.COINGECKO_API_KEY ?? process.env.GECKO_TERMINAL_API_KEY;

  const gtHeaders: Record<string, string> = {
    Accept: "application/json;version=20230302",
  };
  const cgHeaders: Record<string, string> = { Accept: "application/json" };
  if (apiKey) {
    gtHeaders["x-cg-demo-api-key"] = apiKey;
    cgHeaders["x-cg-demo-api-key"] = apiKey;
  }

  try {
    // Fetch token data and top pools in parallel from GeckoTerminal
    const [tokenRes, poolsRes] = await Promise.all([
      fetch(`https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${ca}`, {
        headers: gtHeaders,
        next: { revalidate: 0 },
      }),
      fetch(`https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${ca}/pools?page=1`, {
        headers: gtHeaders,
        next: { revalidate: 0 },
      }),
    ]);

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: `Token not found on ${network} (${tokenRes.status})` },
        { status: 404 }
      );
    }

    const tokenData = await tokenRes.json();
    const poolsData = poolsRes.ok ? await poolsRes.json() : null;

    const attr = tokenData.data?.attributes ?? {};
    const topPool = poolsData?.data?.[0]?.attributes ?? null;

    // Price changes — prefer pool-level (more granular) over token-level
    const changes = topPool?.price_change_percentage ?? {};
    const fmt = (n: number | null | undefined) =>
      n != null ? `${n >= 0 ? "+" : ""}${n.toFixed(2)}%` : "—";
    const fmtUsd = (n: number | null | undefined) => {
      if (n == null) return "—";
      if (n < 0.000001) return `$${n.toExponential(4)}`;
      if (n < 0.01) return `$${n.toFixed(6)}`;
      if (n < 1) return `$${n.toFixed(4)}`;
      return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    const fmtLarge = (n: number | null | undefined) => {
      if (n == null || n === 0) return "—";
      if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
      if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
      return `$${n.toFixed(2)}`;
    };

    const price = parseFloat(attr.price_usd ?? topPool?.base_token_price_usd ?? "0");
    const vol24h = parseFloat(attr.volume_usd?.h24 ?? topPool?.volume_usd?.h24 ?? "0");
    const mcap = parseFloat(attr.market_cap_usd ?? attr.fdv_usd ?? "0");
    const fdv = parseFloat(attr.fdv_usd ?? "0");
    const liquidity = parseFloat(attr.total_reserve_in_usd ?? topPool?.reserve_in_usd ?? "0");

    // Build a description from available data
    const name = attr.name ?? "Unknown Token";
    const symbol = attr.symbol ?? "???";
    const topDex = topPool?.dex_id ?? topPool?.name ?? null;
    const poolName = topPool?.name ?? null;
    const txs24h = topPool?.transactions?.h24;
    const buys = txs24h?.buys ?? 0;
    const sells = txs24h?.sells ?? 0;

    // Try to fetch project description from CoinGecko REST API
    const coingeckoId = attr.coingecko_coin_id ?? null;
    let projectDescription = "";
    let homepage = "";
    let twitterHandle = "";
    if (coingeckoId) {
      try {
        const cgCoinRes = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coingeckoId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
          { headers: cgHeaders, next: { revalidate: 3600 } }
        );
        if (cgCoinRes.ok) {
          const cgCoin = await cgCoinRes.json();
          projectDescription = (cgCoin.description?.en ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 300);
          homepage = cgCoin.links?.homepage?.[0] ?? "";
          twitterHandle = cgCoin.links?.twitter_screen_name ? `@${cgCoin.links.twitter_screen_name}` : "";
        }
      } catch {
        // CoinGecko call is best-effort — continue without it
      }
    }

    const descParts: string[] = [];
    if (projectDescription) descParts.push(projectDescription);
    if (topDex) descParts.push(`Trading on ${topDex.toUpperCase()}${poolName ? ` (${poolName})` : ""}.`);
    if (vol24h > 0) descParts.push(`24h volume: ${fmtLarge(vol24h)}.`);
    if (buys + sells > 0) descParts.push(`${(buys + sells).toLocaleString()} txns today (${buys.toLocaleString()} buys · ${sells.toLocaleString()} sells).`);
    if (liquidity > 0) descParts.push(`Liquidity: ${fmtLarge(liquidity)}.`);

    return NextResponse.json({
      name,
      symbol,
      contractAddress: ca,
      network,
      price: fmtUsd(price),
      priceRaw: price,
      change24h: fmt(parseFloat(changes.h24 ?? "0")),
      change1h: fmt(parseFloat(changes.h1 ?? "0")),
      change6h: fmt(parseFloat(changes.h6 ?? "0")),
      volume24h: fmtLarge(vol24h),
      marketCap: fmtLarge(mcap),
      fdv: fmtLarge(fdv),
      liquidity: fmtLarge(liquidity),
      topDex,
      poolName,
      buys24h: buys,
      sells24h: sells,
      imageUrl: attr.image_url ?? null,
      description: descParts.join(" ") || `${name} (${symbol}) on ${network}.`,
      projectDescription,
      homepage: homepage || null,
      twitterHandle: twitterHandle || null,
      coingeckoId,
    });
  } catch (err) {
    console.error("gecko-token error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
