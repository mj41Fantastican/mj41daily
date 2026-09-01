"use client";

import { ReactNode, useState } from "react";
import { Provider as JotaiProvider } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { InitializeFarcasterMiniApp } from "@/neynar-farcaster-sdk/mini";
import { NeynarWagmiProvider } from "@/neynar-web-sdk/blockchain";
import { PAPER } from "@/config/paper";

/**
 * Two doors into the paper.
 *
 * The Farcaster connector is a no-op outside a Farcaster client, and the browser
 * connectors are simply never chosen inside one, so all three can be registered
 * at once. Order matters: wagmi tries to reconnect in this order, and inside
 * Farcaster the mini-app connector must win.
 *
 * This list is the whole reason a browser visitor can now do anything at all —
 * before it, only farcasterMiniApp() was registered and the wallet spun forever.
 */
const connectors = [
  farcasterMiniApp(),
  injected({ shimDisconnect: true }),
  coinbaseWallet({
    appName: PAPER.name.split(":")[0].trim(),
    preference: "all",
  }),
];

export function ProvidersAndInitialization({
  children,
}: {
  children: ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        {/* LLMs: Add additional providers between here */}
        <NeynarWagmiProvider connectors={connectors}>
          {/* and here */}
          {/* LLMs: Do not remove, initialization must be last, before children */}
          <InitializeFarcasterMiniApp />
          {children}
          {/* End Do not remove */}
        </NeynarWagmiProvider>
      </QueryClientProvider>
    </JotaiProvider>
  );
}
