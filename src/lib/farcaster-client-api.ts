/**
 * Farcaster's own client API — api.farcaster.xyz.
 *
 * Not Neynar. These endpoints need no API key and no billing, which makes them
 * the right place to resolve identity: after Neynar wound down their builder and
 * put NFT minting behind metered billing, every dependency on them we can drop is
 * one less thing that can be taken away.
 *
 * The endpoint that matters here is primary-address. It maps a Farcaster ID to
 * the wallet the user actually chose, which is what lets the paper key everything
 * on a wallet address while still working for readers who arrive with only an FID.
 */

const FC_API = "https://api.farcaster.xyz";

/** Batch limit documented by Farcaster. */
const MAX_FIDS_PER_CALL = 100;

type PrimaryAddressResult = {
  fid: number;
  success: boolean;
  address?: { fid: number; protocol: string; address: string };
};

async function getJson<T>(url: string, timeoutMs = 8000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The wallet a Farcaster user has chosen as their primary Ethereum address.
 * Returns null when the user has no verified address, or the lookup fails —
 * identity resolution should degrade, never throw.
 */
export async function getPrimaryAddress(fid: number): Promise<string | null> {
  const data = await getJson<{ result?: { address?: { address?: string } } }>(
    `${FC_API}/fc/primary-address?fid=${fid}&protocol=ethereum`,
  );
  const address = data?.result?.address?.address;
  return address ? address.toLowerCase() : null;
}

/**
 * Batched form of the above. Chunks past Farcaster's 100-fid limit and returns a
 * map of fid → lowercased address, omitting anyone without a verified wallet.
 */
export async function getPrimaryAddresses(
  fids: number[],
): Promise<Map<number, string>> {
  const unique = [...new Set(fids.filter((f) => Number.isFinite(f) && f > 0))];
  const out = new Map<number, string>();

  for (let i = 0; i < unique.length; i += MAX_FIDS_PER_CALL) {
    const chunk = unique.slice(i, i + MAX_FIDS_PER_CALL);
    const data = await getJson<{ result?: { addresses?: PrimaryAddressResult[] } }>(
      `${FC_API}/fc/primary-addresses?fids=${chunk.join(",")}&protocol=ethereum`,
    );
    for (const row of data?.result?.addresses ?? []) {
      if (row.success && row.address?.address) {
        out.set(row.fid, row.address.address.toLowerCase());
      }
    }
  }
  return out;
}

/**
 * A channel's public details. Used by the editor's channel spotlight, and free
 * where the equivalent Neynar lookup is not.
 */
export async function getChannel(channelId: string): Promise<{
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  followerCount: number;
  memberCount: number;
} | null> {
  const data = await getJson<{
    result?: {
      channel?: {
        id: string;
        name: string;
        description?: string;
        imageUrl?: string;
        followerCount?: number;
        memberCount?: number;
      };
    };
  }>(`${FC_API}/v1/channel?channelId=${encodeURIComponent(channelId)}`);

  const c = data?.result?.channel;
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    imageUrl: c.imageUrl ?? null,
    followerCount: c.followerCount ?? 0,
    memberCount: c.memberCount ?? 0,
  };
}
