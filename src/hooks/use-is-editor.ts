"use client";

import { useFarcasterUser } from "@/neynar-farcaster-sdk/mini";

/**
 * Returns whether the current logged-in user is the editor.
 * Editor FID is stored in NEXT_PUBLIC_USER_FID env var.
 */
export function useIsEditor(): { isEditor: boolean; isLoading: boolean } {
  const { data: user, isLoading } = useFarcasterUser();
  const editorFid = Number(process.env.NEXT_PUBLIC_USER_FID ?? "0");
  const isEditor = !isLoading && !!user && user.fid === editorFid;
  return { isEditor, isLoading };
}
