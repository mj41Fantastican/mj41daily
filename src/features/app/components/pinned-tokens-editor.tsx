'use client';

import { useState } from 'react';
import { useTheme } from '@/features/app/theme-context';
import type { TrackerToken } from '@/features/app/types';

const SF = { fontFamily: 'Arial,sans-serif' };

// ── Your pinned tokens — always available ──────────────────────────────────────
const PINNED_TOKENS: Array<{ symbol: string; name: string; contractAddress: string; network: string; description: string }> = [
  {
    symbol: '$HW',
    name: 'HOMEwork',
    contractAddress: '0x5c159901128e11eef6e431aa53152b976a26cb07',
    network: 'base',
    description: 'HOMEwork token on Base',
  },
  {
    symbol: '$RWACu',
    name: 'RWACu',
    contractAddress: '0x184f5aacdbb3e482ce6e5e4a7075500e589a5e68',
    network: 'base',
    description: 'Real World Asset Copper token on Base',
  },
  {
    symbol: '$MASTERS',
    name: 'MASTERS',
    contractAddress: '0x4c18ae7f817e886e9dbbce9637617f8f37bee016',
    network: 'base',
    description: 'MASTERS token on Base',
  },
];

function makeTrackerToken(p: typeof PINNED_TOKENS[0], idx: number): TrackerToken {
  return {
    id: `pinned-${idx}`,
    symbol: p.symbol,
    name: p.name,
    contractAddress: p.contractAddress,
    network: p.network,
    price: '—',
    change24h: '—',
  };
}

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  contractAddress: string | null;
  network: string;
}

interface PinnedTokensEditorProps {
  trackerTokens: TrackerToken[];
  onTrackerTokensChange: (tokens: TrackerToken[]) => void;
  // poolTokens kept for API compat but no longer rendered
  poolTokens?: Array<{ id: string; symbol: string; name?: string; price: string; change: string; contractAddress?: string }>;
}

export function PinnedTokensEditor({ trackerTokens, onTrackerTokensChange }: PinnedTokensEditorProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [lookupLoading, setLookupLoading] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState('');

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function isPinned(symbol: string) {
    return trackerTokens.some((t) => t.symbol === symbol);
  }

  function togglePinned(p: typeof PINNED_TOKENS[0], idx: number) {
    if (isPinned(p.symbol)) {
      onTrackerTokensChange(trackerTokens.filter((t) => t.symbol !== p.symbol));
    } else {
      onTrackerTokensChange([...trackerTokens, makeTrackerToken(p, idx)]);
    }
  }

  const isCA = (q: string) => /^0x[0-9a-fA-F]{10,}/.test(q.trim());

  async function doSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setLookupError('');

    // If it looks like a contract address, go straight to lookup
    if (isCA(q)) {
      await lookupAndAdd(q.toLowerCase(), 'base', '');
      return;
    }

    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/token-search?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
      if ((data.results ?? []).length === 0) setLookupError('No tokens found — try pasting a contract address instead.');
    } catch {
      setLookupError('Search failed. Try pasting the contract address directly.');
    } finally {
      setSearching(false);
    }
  }

  async function lookupAndAdd(contractAddress: string, network: string, _symbol: string) {
    setLookupLoading(contractAddress);
    setLookupError('');
    try {
      const res = await fetch(`/api/token-lookup?ca=${encodeURIComponent(contractAddress)}&network=${encodeURIComponent(network || 'base')}`);
      const data = await res.json();
      if (!res.ok || !data.symbol) {
        setLookupError(data.error ?? 'Token not found on Base. Check the address and try again.');
        return;
      }
      const newToken: TrackerToken = {
        id: `search-${contractAddress}`,
        symbol: data.symbol,
        name: data.name ?? data.symbol,
        contractAddress,
        network: network || 'base',
        price: data.price ?? '—',
        change24h: data.change ?? '—',
        imageUrl: data.imageUrl,
        marketCap: data.marketCap,
        volume24h: data.volume24h,
      };
      if (!isPinned(newToken.symbol)) {
        onTrackerTokensChange([...trackerTokens, newToken]);
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch {
      setLookupError('Lookup failed — check the contract address.');
    } finally {
      setLookupLoading(null); }
  }

  const activeCount = trackerTokens.filter((t) => t.symbol).length;

  return (
    <div className="space-y-2">
      {/* Active count */}
      <div className="flex items-center justify-between">
        <p className={`text-[8px] uppercase tracking-widest font-bold ${theme.mutedClass}`} style={SF}>
          {activeCount} token{activeCount !== 1 ? 's' : ''} active for this issue
        </p>
        {activeCount > 0 && (
          <button onClick={() => onTrackerTokensChange([])}
            className={`text-[8px] uppercase tracking-wide ${theme.mutedClass} hover:opacity-100 opacity-60`}
            style={SF}>
            Clear all
          </button>
        )}
      </div>

      {/* Active tokens preview strip */}
      {activeCount > 0 && (
        <div className={`flex flex-wrap gap-1 p-2 border ${theme.borderLight} ${theme.fillLight}`}>
          {trackerTokens.filter(t => t.symbol).map((t) => (
            <div key={t.symbol} className={`flex items-center gap-1 px-2 py-[3px] border ${theme.border}`}>
              <span className="text-[9px] font-bold">{t.symbol}</span>
              <button onClick={() => onTrackerTokensChange(trackerTokens.filter(x => x.symbol !== t.symbol))}
                className={`text-[9px] leading-none ${theme.mutedClass} hover:opacity-100 opacity-60 ml-1`}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── PINNED TOKENS ── */}
      <div>
        <p className={`text-[8px] uppercase tracking-widest font-black mb-1 ${theme.mutedClass}`} style={SF}>
          📌 Your Pinned Tokens
        </p>
        <div className="space-y-1">
          {PINNED_TOKENS.map((p, idx) => {
            const active = isPinned(p.symbol);
            return (
              <button
                key={p.symbol}
                onClick={() => togglePinned(p, idx)}
                className={`w-full flex items-center justify-between px-3 py-2 border-2 min-h-[44px] text-left transition-all ${
                  active
                    ? `${theme.border} ${theme.fill} ${theme.fillText}`
                    : `${theme.borderLight}`
                }`}
              >
                <div>
                  <span className={`text-[11px] font-black ${active ? '' : ''}`}>{p.symbol}</span>
                  <span className={`ml-2 text-[9px] ${active ? 'opacity-80' : theme.mutedClass}`} style={SF}>{p.name}</span>
                  <p className={`text-[8px] mt-[1px] font-mono truncate ${active ? 'opacity-70' : theme.mutedClass}`} style={SF}>
                    {p.contractAddress.slice(0,10)}…{p.contractAddress.slice(-6)}
                  </p>
                </div>
                <span className={`text-[10px] font-bold shrink-0 ml-2 ${active ? '' : theme.mutedClass}`}>
                  {active ? '✓ ON' : 'OFF'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TOKEN SEARCH / CA PASTE ── */}
      <div>
        <p className={`text-[8px] uppercase tracking-widest font-black mb-1 ${theme.mutedClass}`} style={SF}>
          🔍 Add Token by Name or Contract Address
        </p>
        <p className={`text-[7px] mb-2 leading-snug ${theme.mutedClass}`} style={SF}>
          Paste a 0x… contract address for instant lookup, or type a ticker to search.
        </p>
        <div className="flex gap-1">
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setLookupError(''); setSearchResults([]); }}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            className={`flex-1 border px-2 py-2 text-[10px] font-mono outline-none min-h-[40px] ${theme.borderLight} ${theme.bg} ${theme.text}`}
            placeholder="0x… or DEGEN, $BASED..."
            style={SF}
          />
          <button onClick={doSearch} disabled={(searching || !!lookupLoading) || !searchQuery.trim()}
            className={`px-3 border text-[10px] font-bold min-h-[40px] uppercase ${theme.border} ${theme.fill} ${theme.fillText} disabled:opacity-40`}
            style={SF}>{searching || lookupLoading ? '⏳' : isCA(searchQuery) ? 'Lookup' : 'Search'}</button>
        </div>
        {lookupError && (
          <p className="text-[9px] text-red-500 mt-1" style={SF}>{lookupError}</p>
        )}
        {searchResults.length > 0 && (
          <div className={`mt-1 border ${theme.borderLight}`}>
            {searchResults.map((r) => (
              <button key={r.id}
                onClick={() => r.contractAddress && lookupAndAdd(r.contractAddress, r.network, r.symbol)}
                disabled={!r.contractAddress || !!lookupLoading}
                className={`w-full flex items-center gap-2 px-2 py-2 border-b last:border-0 text-left min-h-[40px] ${theme.borderLight} disabled:opacity-40`}
              >
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.imageUrl} alt="" className="w-5 h-5 rounded-full shrink-0" />
                ) : (
                  <div className={`w-5 h-5 border shrink-0 flex items-center justify-center text-[8px] ${theme.borderLight}`}>$</div>
                )}
                <div className="flex-1">
                  <p className="text-[10px] font-bold leading-none">{r.symbol}</p>
                  <p className={`text-[8px] ${theme.mutedClass}`} style={SF}>{r.name} · {r.network}</p>
                  {r.contractAddress && (
                    <p className={`text-[7px] font-mono ${theme.mutedClass}`} style={SF}>
                      {r.contractAddress.slice(0, 10)}…{r.contractAddress.slice(-6)}
                    </p>
                  )}
                </div>
                <span className={`text-[9px] font-bold shrink-0 ml-1 ${theme.mutedClass}`} style={SF}>
                  {lookupLoading === r.contractAddress ? '⏳' : isPinned(r.symbol) ? '✓ added' : '+ Add'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
