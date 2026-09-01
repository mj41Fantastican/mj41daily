"use client";

import { useAccount } from "wagmi";
import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";
import { isEditorFid, isEditorWallet } from "@/config/editors";

/**
 * Who is reading the paper, and which door they came through.
 *
 * The paper has two entrances: inside Farcaster, where the reader has both a
 * wallet and an FID, and a plain browser, where they have only a wallet. Every
 * feature that needs to know "who is this" should ask this hook rather than
 * reaching for useFarcasterUser directly — that was the assumption that made the
 * app Farcaster-only.
 *
 * `key` is the durable identity: the wallet address, lowercased. It exists for
 * both kinds of visitor, which is why access records are keyed on it rather than
 * on an FID that browser readers will never have.
 */
export type Viewer = {
  /** Lowercased wallet address, or null before the wallet connects. */
  address: string | null;
  /** Farcaster ID when inside Farcaster, otherwise null. */
  fid: number | null;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
  /** True when running inside a Farcaster client. */
  isFarcaster: boolean;
  /** True once we have any usable identity at all. */
  isConnected: boolean;
  isLoading: boolean;
  /** Editor by wallet allowlist or by FID — either opens the dashboard. */
  isEditor: boolean;
  /** The identity to store against reads, mints and subscriptions. */
  key: string | null;
};

export function useViewer(): Viewer {
  const { data: farcasterUser, isLoading: fcLoading } = useFarcasterUser();
  const { address, isConnecting, isReconnecting } = useAccount();

  const lowered = address ? address.toLowerCase() : null;
  const fid = farcasterUser?.fid ?? null;

  return {
    address: lowered,
    fid,
    username: farcasterUser?.username ?? null,
    displayName: farcasterUser?.displayName ?? null,
    pfpUrl: farcasterUser?.pfpUrl ?? null,
    isFarcaster: !!fid,
    isConnected: !!lowered || !!fid,
    isLoading: fcLoading || isConnecting || isReconnecting,
    isEditor: isEditorWallet(lowered) || isEditorFid(fid),
    key: lowered,
  };
}
