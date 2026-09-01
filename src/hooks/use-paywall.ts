"use client";

import { useState, useEffect, useCallback } from "react";
import { hasAccess, recordUnlock, recordMint } from "@/db/actions/access";
import { useViewer } from "@/hooks/use-viewer";

/**
 * Paywall access for the current reader and issue.
 *
 * Access is keyed on identity rather than on a Farcaster ID, so a reader who
 * pays inside Farcaster keeps their access when they open the paper in a browser
 * with the same wallet — and a browser-only reader can be recorded at all.
 *
 * The editor always reads free.
 */
export function usePaywall(issueId: number | null) {
  const { address, fid, isEditor, isLoading: viewerLoading } = useViewer();
  const [unlocked, setUnlocked] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    if (isEditor) {
      setUnlocked(true);
      setIsCheckingAccess(false);
      return;
    }
    // Wait for the wallet to settle before deciding — checking too early would
    // report "locked" for a reader who is about to be identified.
    if (viewerLoading) return;
    if ((!address && !fid) || !issueId) {
      setIsCheckingAccess(false);
      return;
    }
    let cancelled = false;
    hasAccess({ walletAddress: address, fid }, issueId)
      .then((access) => {
        if (cancelled) return;
        setUnlocked(access);
        setIsCheckingAccess(false);
      })
      .catch(() => {
        if (!cancelled) setIsCheckingAccess(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, fid, issueId, isEditor, viewerLoading]);

  /** Grant read access after a successful payment. */
  const grantReadAccess = useCallback(
    async (
      paymentMethod: "usdc" | "eth" | "rwac",
      txHash?: string,
      walletAddress?: string,
    ) => {
      const wallet = walletAddress ?? address;
      if ((!wallet && !fid) || !issueId) {
        setUnlocked(true); // optimistic for guests
        return;
      }
      await recordUnlock({ walletAddress: wallet, fid }, issueId, paymentMethod, txHash);
      setUnlocked(true);
    },
    [address, fid, issueId],
  );

  /** Grant ownership access after a successful mint. */
  const grantMintAccess = useCallback(
    async (
      txHash: string,
      paymentMethod: "usdc" | "eth" | "rwac" = "usdc",
      walletAddress?: string,
    ) => {
      const wallet = walletAddress ?? address;
      if ((!wallet && !fid) || !issueId) {
        setUnlocked(true);
        return;
      }
      await recordMint({ walletAddress: wallet, fid }, issueId, txHash, paymentMethod);
      setUnlocked(true);
    },
    [address, fid, issueId],
  );

  return {
    unlocked,
    isCheckingAccess,
    grantReadAccess,
    grantMintAccess,
  };
}
