"use client";

import { useViewer } from "@/hooks/use-viewer";

/**
 * Whether the current visitor may edit the paper.
 *
 * Delegates to useViewer, which accepts either credential: a wallet on the
 * allowlist or the editor's Farcaster ID. Previously this checked the FID alone,
 * which meant the dashboard could only be opened from inside Farcaster.
 */
export function useIsEditor(): { isEditor: boolean; isLoading: boolean } {
  const { isEditor, isLoading } = useViewer();
  return { isEditor: !isLoading && isEditor, isLoading };
}
