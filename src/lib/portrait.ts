import { createPublicClient, http, isAddress } from "viem";
import { mainnet } from "viem/chains";

/**
 * Where a reader's portrait comes from.
 *
 * Three sources, in order of preference, and none of them can be switched off by
 * a company:
 *
 *   farcaster  — the profile picture on their Farcaster account, read from
 *                Farcaster's own API. No key, no billing.
 *   ens        — the `avatar` text record on their ENS name, read from Ethereum.
 *   generated  — no picture exists anywhere, so the paper cuts one: a woodcut
 *                mark derived from the wallet address itself. Deterministic, so
 *                the same wallet always gets the same mark.
 *
 * Deliberately not included: X. It needs an OAuth app and X now charges for
 * profile access, which would put a vendor back in the middle of something that
 * currently has none.
 */

export type PortraitSource = "farcaster" | "ens" | "generated";

export type Portrait = {
  source: PortraitSource;
  /** Remote image to engrave. Null when the mark is generated instead. */
  imageUrl: string | null;
  /** How to name the holder on the cover, e.g. "@mj41fantastican". */
  handle: string;
  /** Inline SVG for the generated mark. Null unless source is "generated". */
  markSvg: string | null;
};

const FC_API = "https://api.farcaster.xyz";

async function getJson<T>(url: string, ms = 8000): Promise<T | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { Accept: "application/json" } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Farcaster profile picture and username, straight from Farcaster. */
export async function fromFarcaster(fid: number): Promise<Portrait | null> {
  const d = await getJson<{
    result?: { user?: { username?: string; displayName?: string; pfp?: { url?: string } } };
  }>(`${FC_API}/v2/user?fid=${fid}`);

  const u = d?.result?.user;
  if (!u?.pfp?.url) return null;
  return {
    source: "farcaster",
    imageUrl: u.pfp.url,
    handle: `@${u.username ?? `fid${fid}`}`,
    markSvg: null,
  };
}

/**
 * Ethereum endpoints tried in order.
 *
 * Deliberately a list rather than one URL: a single public RPC going down or
 * rate-limiting should degrade a portrait to a woodcut mark, not decide that
 * nobody has an ENS avatar. Set MAINNET_RPC_URL to put a private endpoint first.
 */
const MAINNET_RPCS = [
  process.env.MAINNET_RPC_URL,
  "https://ethereum-rpc.publicnode.com",
  "https://cloudflare-eth.com",
  "https://rpc.ankr.com/eth",
  "https://eth.llamarpc.com",
].filter(Boolean) as string[];

/** The ENS `avatar` record, if the wallet has a primary name that sets one. */
export async function fromEns(address: string): Promise<Portrait | null> {
  if (!isAddress(address)) return null;

  for (const url of MAINNET_RPCS) {
    try {
      const client = createPublicClient({ chain: mainnet, transport: http(url, { timeout: 6000 }) });
      const name = await client.getEnsName({ address: address as `0x${string}` });
      if (!name) return null;                       // resolved fine, simply has no name
      const avatar = await client.getEnsAvatar({ name });
      if (!avatar) return { source: "ens", imageUrl: null, handle: name, markSvg: null };
      return { source: "ens", imageUrl: avatar, handle: name, markSvg: null };
    } catch {
      continue;                                      // this endpoint is unwell; try the next
    }
  }
  return null;
}

/**
 * A woodcut mark cut from the address.
 *
 * Eight rows of ink, mirrored down the middle so it reads as a carved block
 * rather than noise. Pure rectangles, so it renders identically on every device
 * and costs almost nothing to store — the same reason a press used woodcuts.
 */
export function generatedMark(address: string, size = 170): string {
  const hex = address.toLowerCase().replace(/^0x/, "").padEnd(40, "0");
  const cells = 8;
  const half = Math.ceil(cells / 2);
  const unit = size / cells;

  let rects = "";
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < half; x++) {
      // One nibble decides one cell; the row's own nibble shifts the threshold
      // so the block has light and heavy passages instead of even static.
      const n = parseInt(hex[(y * half + x) % hex.length], 16);
      const bias = parseInt(hex[(y * 3 + 7) % hex.length], 16) > 7 ? 6 : 8;
      if (n < bias) continue;
      for (const cx of [x, cells - 1 - x]) {
        rects += `<rect x="${(cx * unit).toFixed(1)}" y="${(y * unit).toFixed(1)}" `
               + `width="${unit.toFixed(1)}" height="${unit.toFixed(1)}" fill="#111"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`
       + `<rect width="${size}" height="${size}" fill="#f7f5f0"/>${rects}</svg>`;
}

/**
 * Resolve the best portrait available for a reader.
 * Never throws and never returns null — a wallet alone is always enough.
 */
export async function resolvePortrait(opts: {
  fid?: number | null;
  address?: string | null;
}): Promise<Portrait> {
  if (opts.fid) {
    const fc = await fromFarcaster(opts.fid);
    if (fc) return fc;
  }
  if (opts.address) {
    const ens = await fromEns(opts.address);
    // A name with an avatar wins outright. A name without one still beats a bare
    // address for the byline, but the mark is cut from the wallet.
    if (ens?.imageUrl) return ens;
    if (ens) {
      return { ...ens, source: "generated", markSvg: generatedMark(opts.address) };
    }
  }
  const addr = opts.address ?? "0x0000000000000000000000000000000000000000";
  return {
    source: "generated",
    imageUrl: null,
    handle: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
    markSvg: generatedMark(addr),
  };
}
