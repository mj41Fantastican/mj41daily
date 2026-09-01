"use client";

import { useState, useEffect, useCallback } from "react";
import { hasAccess, recordUnlock, recordMint } from "@/db/actions/access";
import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";
import { publicConfig } from "@/config/public-config";

// Editor FID — always gets free access
const EDITOR_FID = publicConfig.fid;

/**
 * Manages paywall access state for the current user + issue.
 * Checks DB on load, provides grant functions after payment.
 * Editor (NEXT_PUBLIC_USER_FID) always has free access.
 */
export function usePaywall(issueId: number | null) {
  const { data: user } = useFarcasterUser();
  const isEditor = !!user?.fid && user.fid === EDITOR_FID;
  const [unlocked, setUnlocked] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Check existing access on load
  useEffect(() => {
    // Editor always has access — no DB check needed
    if (isEditor) {
      setUnlocked(true);
      setIsCheckingAccess(false);
      return;
    }
    if (!user?.fid || !issueId) {
      setIsCheckingAccess(false);
      return;
    }
    hasAccess(user.fid, issueId)
      .then((access) => {
        setUnlocked(access);
        setIsCheckingAccess(false);
      })
      .catch(() => setIsCheckingAccess(false));
  }, [user?.fid, issueId, isEditor]);

  /**
   * Grant read access after a successful payment.
   */
  const grantReadAccess = useCallback(
    async (
      paymentMethod: "usdc" | "eth" | "rwac",
      txHash?: string,
      walletAddress?: string,
    ) => {
      if (!user?.fid || !issueId) {
        setUnlocked(true); // Optimistic for guests
        return;
      }
      await recordUnlock(user.fid, issueId, paymentMethod, txHash, walletAddress);
      setUnlocked(true);
    },
    [user?.fid, issueId],
  );

  /**
   * Grant mint (ownership) access after a successful mint transaction.
   */
  const grantMintAccess = useCallback(
    async (
      txHash: string,
      paymentMethod: "usdc" | "eth" | "rwac" = "usdc",
      walletAddress?: string,
    ) => {
      if (!user?.fid || !issueId) {
        setUnlocked(true); // Optimistic for guests
        return;
      }
      await recordMint(user.fid, issueId, txHash, paymentMethod, walletAddress);
      setUnlocked(true);
    },
    [user?.fid, issueId],
  );

  return {
    unlocked,
    isCheckingAccess,
    grantReadAccess,
    grantMintAccess,
  };
}
