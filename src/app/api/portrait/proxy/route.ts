import { NextRequest } from "next/server";

/**
 * GET /api/portrait/proxy?url=…
 *
 * Passes a portrait through so the browser can engrave it on a canvas.
 *
 * Without this the canvas is "tainted": a browser refuses to read back pixels
 * from an image served by another origin, and the halftone cannot be computed.
 * Serving the same bytes from our own origin removes the restriction.
 *
 * Only image responses are relayed, and only over https, so this cannot be used
 * as an open proxy for arbitrary content.
 */
const MAX_BYTES = 8 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return new Response("Missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Bad url", { status: 400 });
  }
  if (target.protocol !== "https:") {
    return new Response("Only https", { status: 400 });
  }

  try {
    const upstream = await fetch(target, {
      headers: { "User-Agent": "TheDailyMiscellany/2.0 (+https://mj41daily.com)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) return new Response("Upstream error", { status: 502 });

    const type = upstream.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) {
      return new Response("Not an image", { status: 415 });
    }
    const length = Number(upstream.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) return new Response("Too large", { status: 413 });

    const body = await upstream.arrayBuffer();
    if (body.byteLength > MAX_BYTES) return new Response("Too large", { status: 413 });

    return new Response(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Fetch failed", { status: 502 });
  }
}
