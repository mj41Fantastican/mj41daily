import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { publicConfig } from "@/config/public-config";
import { parseNextRequestSearchParams } from "@/neynar-farcaster-sdk/nextjs";

// Revalidate every 10 minutes — copper prices update frequently
export const revalidate = 600;

const showDevWarning = publicConfig.appEnv !== "production";

// ── Style tokens ──────────────────────────────────────────────────────────
const SERIF = "Georgia,'Times New Roman',serif";
const SANS  = "Arial,Helvetica,sans-serif";
const INK   = "#000000";
const MUTED = "#555555";
const LIGHT = "#888888";
const COPPER_BG = "#b87333";
const WHITE = "#ffffff";
const OFF_WHITE = "#f9f7f4";

// ── Live copper price fetch (direct Base RPC, no self-calls) ──────────────
const BASE_RPC = "https://mainnet.base.org";

interface CopperPrice { label: string; price: number }

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

async function fetchCopperPrices(): Promise<CopperPrice[]> {
  const oracles = [
    { address: "0x02a0FeE571E63e9a81AE944469deA7207ac56D8f", selector: "0xa035b1fe", decimals: 1e8, label: "Spot" },
    { address: "0x4D54f30dBa2e28c1096aE72745b6f5a29139bb58", selector: "0x98d5fdca", decimals: 1e2,  label: "Scrap" },
    { address: "0x1d4E108bE284d73fDC0704457D4A4c2A36aC1D4a", selector: "0x98d5fdca", decimals: 1e8,  label: "Industrial" },
  ];

  const results = await Promise.allSettled(
    oracles.map(async (o) => {
      const fetchPromise = fetch(BASE_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_call",
          params: [{ to: o.address, data: o.selector }, "latest"],
          id: 1,
        }),
      });
      const res = await withTimeout(fetchPromise, 7000);
      const json = await res.json() as { result: string; error?: { message: string } };
      if (json.error || !json.result) throw new Error("oracle error");
      const firstWord = json.result.slice(2, 66);
      const price = Number(BigInt("0x" + firstWord)) / o.decimals;
      if (!isFinite(price) || price <= 0) throw new Error("invalid price");
      return { label: o.label, price };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<CopperPrice> => r.status === "fulfilled")
    .map((r) => r.value);
}

// ── Route ─────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    return await handleShareImage(request, params);
  } catch (err) {
    console.error("[share-image] Unhandled error:", err);
    return new Response("Image generation failed", { status: 500 });
  }
}

async function handleShareImage(
  request: NextRequest,
  params: Promise<{ type: string }>,
) {
  const { type } = await params;
  const p = parseNextRequestSearchParams(request);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });

  // ── Farcaster embed + misc types: masthead + copper ticker ──────────────
  // "farcaster" is what Warpcast scrapes for the fc:miniapp imageUrl embed
  if (type === "farcaster" || type === "miscellany" || type === "default" || type === "logo") {

    // Fetch copper prices — fully settled before render
    let spotPrice: CopperPrice | undefined;
    let scrapPrice: CopperPrice | undefined;
    let indPrice: CopperPrice | undefined;
    try {
      const prices = await fetchCopperPrices();
      spotPrice = prices.find((cp) => cp.label === "Spot");
      scrapPrice = prices.find((cp) => cp.label === "Scrap");
      indPrice = prices.find((cp) => cp.label === "Industrial");
    } catch { /* show without prices */ }

    const hasPrices = !!(spotPrice || scrapPrice || indPrice);

    return new ImageResponse(
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#111111", padding: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#ffffff", fontFamily: SERIF }}>

          {/* ── MASTHEAD ── */}
          <div style={{ display: "flex", flexDirection: "column", paddingTop: 20, paddingLeft: 32, paddingRight: 32 }}>
            <div style={{ display: "flex", height: 8, backgroundColor: "#000000", marginBottom: 3 }} />
            <div style={{ display: "flex", height: 2, backgroundColor: "#000000", marginBottom: 3 }} />
            <div style={{ display: "flex", height: 1, backgroundColor: "#000000", marginBottom: 10 }} />

            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", fontSize: 10, color: MUTED, letterSpacing: 3, textTransform: "uppercase", fontFamily: SANS }}>AN MJ41 PUBLICATION</div>
              <div style={{ display: "flex", fontSize: 10, color: MUTED, letterSpacing: 2, fontFamily: SANS }}>{dateStr}</div>
              <div style={{ display: "flex", fontSize: 10, color: MUTED, letterSpacing: 3, textTransform: "uppercase", fontFamily: SANS }}>FREE TO CAST</div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#000000", letterSpacing: 18, textTransform: "uppercase" }}>THE</div>
            <div style={{ display: "flex", justifyContent: "center", fontSize: 68, fontWeight: 900, color: "#000000", letterSpacing: 5, textTransform: "uppercase", lineHeight: 1 }}>COPPER</div>
            <div style={{ display: "flex", justifyContent: "center", fontSize: 68, fontWeight: 900, color: "#000000", letterSpacing: 22, textTransform: "uppercase", lineHeight: 1 }}>WIRE</div>

            <div style={{ display: "flex", justifyContent: "center", fontSize: 11, color: MUTED, letterSpacing: 5, textTransform: "uppercase", marginTop: 8, marginBottom: 10, fontFamily: SANS }}>A DAILY MISCELLANY</div>

            <div style={{ display: "flex", height: 5, backgroundColor: "#000000", marginBottom: 2 }} />
            <div style={{ display: "flex", height: 1, backgroundColor: "#000000" }} />
          </div>

          {/* ── COPPER TICKER ── */}
          <div style={{ display: "flex", flexDirection: "row", backgroundColor: "#b87333", paddingTop: 8, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 9, fontWeight: 900, color: "#ffffff", letterSpacing: 3, textTransform: "uppercase", fontFamily: SANS, marginRight: 20 }}>COPPER</div>
            {hasPrices ? (
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                {spotPrice ? <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginRight: 20 }}>
                  <div style={{ display: "flex", fontSize: 9, color: "#eeeeee", fontFamily: SANS, marginRight: 5 }}>SPOT</div>
                  <div style={{ display: "flex", fontSize: 16, fontWeight: 900, color: "#ffffff", fontFamily: SANS }}>${spotPrice.price.toFixed(2)}</div>
                  <div style={{ display: "flex", fontSize: 8, color: "#dddddd", fontFamily: SANS, marginLeft: 3 }}>/lb</div>
                </div> : null}
                {scrapPrice ? <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginRight: 20 }}>
                  <div style={{ display: "flex", fontSize: 9, color: "#eeeeee", fontFamily: SANS, marginRight: 5 }}>SCRAP</div>
                  <div style={{ display: "flex", fontSize: 16, fontWeight: 900, color: "#ffffff", fontFamily: SANS }}>${scrapPrice.price.toFixed(2)}</div>
                  <div style={{ display: "flex", fontSize: 8, color: "#dddddd", fontFamily: SANS, marginLeft: 3 }}>/lb</div>
                </div> : null}
                {indPrice ? <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                  <div style={{ display: "flex", fontSize: 9, color: "#eeeeee", fontFamily: SANS, marginRight: 5 }}>INDUSTRIAL</div>
                  <div style={{ display: "flex", fontSize: 16, fontWeight: 900, color: "#ffffff", fontFamily: SANS }}>${indPrice.price.toFixed(2)}</div>
                  <div style={{ display: "flex", fontSize: 8, color: "#dddddd", fontFamily: SANS, marginLeft: 3 }}>/lb</div>
                </div> : null}
              </div>
            ) : (
              <div style={{ display: "flex", fontSize: 11, color: "#eeeeee", fontFamily: SANS }}>Live Base oracle prices</div>
            )}
            <div style={{ display: "flex", flex: 1 }} />
            <div style={{ display: "flex", fontSize: 8, color: "#dddddd", fontFamily: SANS }}>live on Base</div>
          </div>

          {/* ── 3 COLUMNS ── */}
          <div style={{ display: "flex", flexDirection: "row", flex: 1, paddingTop: 14, paddingLeft: 24, paddingRight: 24 }}>

            {/* LEFT */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 16, borderRightWidth: 1, borderRightStyle: "solid", borderRightColor: "#cccccc" }}>
              <div style={{ display: "flex", fontSize: 8, color: MUTED, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontFamily: SANS }}>WHAT IS THIS</div>
              <div style={{ display: "flex", fontSize: 14, fontWeight: 900, color: "#000000", lineHeight: 1.3, marginBottom: 8 }}>Your daily Farcaster broadsheet</div>
              <div style={{ display: "flex", fontSize: 10, color: "#333333", lineHeight: 1.5, fontFamily: SANS, marginBottom: 10 }}>Top casts, trending channels, token news, and daily curiosities - curated every morning.</div>
              <div style={{ display: "flex", height: 1, backgroundColor: "#eeeeee", marginBottom: 8 }} />
              <div style={{ display: "flex", fontSize: 8, color: MUTED, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontFamily: SANS }}>INSIDE EVERY ISSUE</div>
              {["Lead story + analysis", "Channel spotlight", "Token and DeFi news", "Color of the Day mint", "Magic 8-Ball and Briefs"].map((item, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "row", fontSize: 10, color: "#000000", fontFamily: SANS, marginBottom: 5, alignItems: "center" }}>
                  <div style={{ display: "flex", color: "#b87333", fontWeight: 900, fontSize: 8, marginRight: 6 }}>+</div>
                  <div style={{ display: "flex" }}>{item}</div>
                </div>
              ))}
            </div>

            {/* CENTER */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", paddingLeft: 16, paddingRight: 16, borderRightWidth: 1, borderRightStyle: "solid", borderRightColor: "#cccccc" }}>
              <div style={{ display: "flex", fontSize: 8, color: MUTED, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12, fontFamily: SANS }}>COPPER ORACLE</div>
              <div style={{ display: "flex", width: 96, height: 96, borderRadius: 48, backgroundColor: "#b87333", alignItems: "center", justifyContent: "center", borderWidth: 4, borderStyle: "solid", borderColor: "#7a4b1e" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ display: "flex", fontSize: 30, fontWeight: 900, color: "#ffffff", fontFamily: SANS }}>Cu</div>
                  <div style={{ display: "flex", fontSize: 8, color: "#eeeeee", fontFamily: SANS, letterSpacing: 2 }}>29</div>
                </div>
              </div>
              {spotPrice ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 10 }}>
                  <div style={{ display: "flex", fontSize: 22, fontWeight: 900, color: "#b87333", fontFamily: SANS }}>${spotPrice.price.toFixed(2)}</div>
                  <div style={{ display: "flex", fontSize: 9, color: LIGHT, fontFamily: SANS }}>per lb, COMEX spot</div>
                </div>
              ) : null}
              <div style={{ display: "flex", height: 1, width: "100%", backgroundColor: "#eeeeee", marginTop: 12, marginBottom: 12 }} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ display: "flex", fontSize: 8, color: MUTED, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontFamily: SANS }}>3 ORACLES ON BASE</div>
                <div style={{ display: "flex", fontSize: 10, color: "#333333", lineHeight: 1.5, fontFamily: SANS }}>COMEX spot, scrap, and industrial prices on-chain</div>
              </div>
            </div>

            {/* RIGHT */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: 16 }}>
              <div style={{ display: "flex", fontSize: 8, color: MUTED, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontFamily: SANS }}>SUBSCRIBE</div>
              <div style={{ display: "flex", fontSize: 14, fontWeight: 900, color: "#000000", lineHeight: 1.3, marginBottom: 6 }}>Read with $RWACu</div>
              <div style={{ display: "flex", fontSize: 10, color: "#333333", lineHeight: 1.5, fontFamily: SANS, marginBottom: 10 }}>Pay 41 $RWACu for 7 daily credits. One credit unlocks one issue.</div>
              <div style={{ display: "flex", height: 1, backgroundColor: "#eeeeee", marginBottom: 10 }} />
              <div style={{ display: "flex", fontSize: 8, color: MUTED, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontFamily: SANS }}>PRICING</div>
              {[["Weekly", "41 $RWACu"], ["Monthly", "164 $RWACu"], ["Yearly", "2,132 $RWACu"]].map(([plan, price], i) => (
                <div key={i} style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", fontSize: 10, color: "#000000", fontFamily: SANS, marginBottom: 6, paddingBottom: 5 }}>
                  <div style={{ display: "flex" }}>{plan}</div>
                  <div style={{ display: "flex", fontWeight: 900, color: "#b87333" }}>{price}</div>
                </div>
              ))}
              <div style={{ display: "flex", flex: 1 }} />
              <div style={{ display: "flex", fontSize: 8, color: LIGHT, fontFamily: SANS }}>Base: 0x184f5...e68</div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          {showDevWarning ? (
            <div style={{ display: "flex", justifyContent: "center", backgroundColor: "#b91c1c", paddingTop: 10, paddingBottom: 10, marginTop: 10 }}>
              <div style={{ display: "flex", color: "#ffffff", fontSize: 18, fontWeight: 700, fontFamily: SANS }}>Preview only - Publish before sharing</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "row", backgroundColor: "#000000", paddingTop: 12, paddingBottom: 12, paddingLeft: 32, paddingRight: 32, justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <div style={{ display: "flex", fontSize: 13, color: "#ffffff", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, fontFamily: SANS }}>Read The Copper Wire on Farcaster</div>
              <div style={{ display: "flex", fontSize: 10, color: "#aaaaaa", fontFamily: SANS }}>AN MJ41 PUBLICATION</div>
            </div>
          )}

        </div>
      </div>,
      { width: 1200, height: 800 }
    );
  }

  // ── OG / front-page share image ──────────────────────────────────────────
  const issueNumber = p.issueNumber ?? "Issue #1";
  const headline    = p.headline    ?? "Today's Top Stories";
  const secLeft     = p.secLeft     ?? "";
  const secRight    = p.secRight    ?? "";
  const brief1      = p.brief1      ?? "";
  const brief2      = p.brief2      ?? "";
  const brief3      = p.brief3      ?? "";

  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#111111", padding: "12px" }}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", backgroundColor: WHITE, padding: "18px 28px", fontFamily: SERIF }}>

        <div style={{ display: "flex", height: "5px", backgroundColor: INK, marginBottom: "2px" }} />
        <div style={{ display: "flex", height: "1px", backgroundColor: INK, marginBottom: "8px" }} />

        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", fontSize: "10px", color: MUTED, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px", fontFamily: SANS }}>
          <div style={{ display: "flex" }}>{issueNumber}</div>
          <div style={{ display: "flex" }}>{dateStr}</div>
          <div style={{ display: "flex" }}>41 $RWACu</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "4px" }}>
          <div style={{ display: "flex", fontSize: "16px", fontWeight: 900, color: INK, letterSpacing: "14px", textTransform: "uppercase" }}>THE</div>
          <div style={{ display: "flex", fontSize: "40px", fontWeight: 900, color: INK, letterSpacing: "4px", textTransform: "uppercase", lineHeight: "1.0" }}>COPPER</div>
          <div style={{ display: "flex", fontSize: "40px", fontWeight: 900, color: INK, letterSpacing: "14px", textTransform: "uppercase", lineHeight: "1.0" }}>WIRE</div>
        </div>
        <div style={{ display: "flex", fontSize: "9px", color: MUTED, letterSpacing: "3px", textTransform: "uppercase", justifyContent: "center", marginBottom: "8px", fontFamily: SANS }}>
          A DAILY MISCELLANY
        </div>

        <div style={{ display: "flex", height: "3px", backgroundColor: INK, marginBottom: "2px" }} />
        <div style={{ display: "flex", height: "1px", backgroundColor: INK, marginBottom: "10px" }} />

        <div style={{ display: "flex", flexDirection: "row", flex: 1, marginBottom: "8px" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, borderRight: "1px solid #000000", paddingRight: "10px" }}>
            <div style={{ display: "flex", fontSize: "8px", color: MUTED, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px", fontFamily: SANS }}>Analysis</div>
            <div style={{ display: "flex", fontSize: "13px", fontWeight: 900, color: INK, lineHeight: "1.2" }}>
              {secLeft || "Trending on the Network"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 2, paddingLeft: "12px", paddingRight: "12px", borderRight: "1px solid #000000", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: "8px", color: MUTED, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "6px", fontFamily: SANS }}>Top Story</div>
            <div style={{ display: "flex", fontSize: "20px", fontWeight: 900, color: INK, lineHeight: "1.1", textAlign: "center", textTransform: "uppercase" }}>
              {headline}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: "10px" }}>
            <div style={{ display: "flex", fontSize: "8px", color: MUTED, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px", fontFamily: SANS }}>Spotlight</div>
            <div style={{ display: "flex", fontSize: "13px", fontWeight: 900, color: INK, lineHeight: "1.2" }}>
              {secRight || "Channel Highlights"}
            </div>
          </div>
        </div>

        {(brief1 || brief2 || brief3) && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", height: "1px", backgroundColor: INK, marginBottom: "5px" }} />
            <div style={{ display: "flex", flexDirection: "row", marginBottom: "6px" }}>
              {[brief1, brief2, brief3].filter(Boolean).map((b, i) => (
                <div key={i} style={{ display: "flex", flex: 1, fontSize: "8px", color: "#333333", lineHeight: "1.3", fontFamily: SANS }}>
                  <div style={{ display: "flex", marginRight: "4px", fontWeight: 900, color: COPPER_BG }}>+</div>
                  <div style={{ display: "flex" }}>{b}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", height: "1px", backgroundColor: INK, marginBottom: "5px" }} />
        <div style={{ display: "flex", flexDirection: "row", backgroundColor: INK, padding: "9px 14px", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: "11px", color: WHITE, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700, fontFamily: SANS }}>
            Read The Copper Wire on Farcaster
          </div>
          <div style={{ display: "flex", fontSize: "9px", color: "#aaaaaa", fontFamily: SANS }}>
            An MJ41 Publication
          </div>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
