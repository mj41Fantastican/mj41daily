'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useTheme } from '@/features/app/theme-context';
import { useViewer } from '@/hooks/use-viewer';

const SF = { fontFamily: 'Arial,sans-serif' };

/**
 * Connect a wallet — the browser door's handle.
 *
 * Inside Farcaster the wallet connects itself and this stays out of the way. In a
 * plain browser nothing connects on its own, which previously left the app sitting
 * on "Connecting wallet…" forever: readers could not pay, and the editor could not
 * reach the dashboard. This is the control that was missing.
 */
export function WalletButton() {
  const { theme } = useTheme();
  const { isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isFarcaster, isEditor } = useViewer();
  const [open, setOpen] = useState(false);

  // Inside Farcaster the wallet is handled for us — no button needed.
  if (isFarcaster) return null;

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className={`text-[8px] uppercase tracking-widest font-bold px-2 py-1 border ${theme.borderLight} ${theme.mutedClass}`}
        style={SF}
        title="Disconnect"
      >
        {isEditor ? '✎ ' : ''}
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  // Farcaster's connector is useless outside Farcaster — don't offer it.
  //
  // Wallets announce themselves twice: once as the generic "Injected" provider
  // and again by name via EIP-6963. Showing both produced a list with two
  // entries that were both Coinbase. Keep the named ones, and keep "Injected"
  // only when it is the sole option.
  const named = connectors.filter(
    (c) => c.id !== 'farcaster' && c.id !== 'injected',
  );
  const seen = new Set<string>();
  const deduped = named.filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const browserConnectors = deduped.length
    ? deduped
    : connectors.filter((c) => c.id !== 'farcaster');

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`text-[8px] uppercase tracking-widest font-bold px-2 py-1 border ${theme.border}`}
        style={SF}
      >
        {isPending ? 'Connecting…' : 'Connect Wallet'}
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full mt-1 z-50 border-2 min-w-[160px] ${theme.border} ${theme.bg}`}
        >
          {browserConnectors.length === 0 && (
            <p className={`text-[9px] px-2 py-2 ${theme.mutedClass}`} style={SF}>
              No wallet found. Install MetaMask or Coinbase Wallet.
            </p>
          )}
          {browserConnectors.map((c) => (
            <button
              key={c.uid}
              onClick={() => {
                connect({ connector: c });
                setOpen(false);
              }}
              className={`w-full text-left text-[9px] px-2 py-2 border-b last:border-b-0 active:opacity-60 ${theme.borderLight}`}
              style={SF}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
