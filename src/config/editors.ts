/**
 * Who may edit the paper.
 *
 * The editor gate used to be a single Farcaster ID, which meant the dashboard was
 * unreachable from a desktop browser. Now either credential opens it: a wallet on
 * the allowlist, or the editor's FID from inside Farcaster.
 *
 * Wallet addresses are compared lowercase — never trust the casing a wallet returns.
 */

/** Farcaster IDs that may edit. NEXT_PUBLIC_USER_FID stays the primary. */
export const EDITOR_FIDS: number[] = [
  Number(process.env.NEXT_PUBLIC_USER_FID ?? "0"),
].filter((fid) => Number.isFinite(fid) && fid > 0);

/**
 * Wallet addresses that may edit.
 *
 * Set NEXT_PUBLIC_EDITOR_WALLETS to a comma-separated list to add more without a
 * code change. The address below is the paper's own treasury wallet, kept here so
 * the dashboard is reachable even if the environment variable is ever unset.
 */
export const EDITOR_WALLETS: string[] = [
  "0x758af4a670ade40c2ffe1b6c4746340910a44b96",
  ...(process.env.NEXT_PUBLIC_EDITOR_WALLETS ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean),
].map((a) => a.toLowerCase());

export function isEditorWallet(address?: string | null): boolean {
  if (!address) return false;
  return EDITOR_WALLETS.includes(address.toLowerCase());
}

export function isEditorFid(fid?: number | null): boolean {
  if (!fid) return false;
  return EDITOR_FIDS.includes(fid);
}
