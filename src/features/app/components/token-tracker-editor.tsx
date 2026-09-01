'use client';

import { useState, useRef } from 'react';
import { useTheme } from '@/features/app/theme-context';
import type { TrackerToken, TopToken } from '@/features/app/types';

const SF = { fontFamily: 'Arial,sans-serif' };

const NETWORKS = [
  { id: 'base', label: 'Base' },
  { id: 'eth', label: 'ETH' },
  { id: 'solana', label: 'SOL' },
  { id: 'arbitrum', label: 'ARB' },
  { id: 'polygon_pos', label: 'POLY' },
];

interface TokenTrackerEditorProps {
  /** 10 random tokens from the feed pool — repopulated on Refresh */
  poolTokens: TopToken[];
  /** Currently committed 6-slot tracker tokens */
  trackerTokens: TrackerToken[];
  onTrackerTokensChange: (tokens: TrackerToken[]) => void;
}

interface SlotState {
  editing: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
  geckoLoading: boolean;
  geckoError: string;
  network: string;
}

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  contractAddress: string | null;
  network: string;
  rank: number;
}

const EMPTY_SLOT = (id: string): TrackerToken => ({
  id,
  symbol: '',
  name: '',
  contractAddress: '',
  network: 'base',
  price: '—',
  change24h: '—',
});

const INITIAL_SLOT_STATE: SlotState = {
  editing: false,
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
  geckoLoading: false,
  geckoError: '',
  network: 'base',
};

export function TokenTrackerEditor({
  poolTokens,
  trackerTokens,
  onTrackerTokensChange,
}: TokenTrackerEditorProps) {
  const { theme } = useTheme();

  // Per-slot UI state
  const [slotStates, setSlotStates] = useState<Record<string, SlotState>>(
    () => {
      const init: Record<string, SlotState> = {};
      for (let i = 0; i < 6; i++) init[`slot-${i}`] = { ...INITIAL_SLOT_STATE };
      return init;
    },
  );

  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function updateSlotState(id: string, patch: Partial<SlotState>) {
    setSlotStates((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  }

  function getToken(id: string): TrackerToken {
    return trackerTokens.find((t) => t.id === id) ?? EMPTY_SLOT(id);
  }

  function setToken(updated: TrackerToken) {
    const next = [...trackerTokens];
    const idx = next.findIndex((t) => t.id === updated.id);
    if (idx >= 0) next[idx] = updated;
    else next.push(updated);
    // Keep only 6 slots
    onTrackerTokensChange(next.slice(0, 6));
  }

  function clearToken(id: string) {
    onTrackerTokensChange(trackerTokens.map((t) => (t.id === id ? EMPTY_SLOT(id) : t)));
    updateSlotState(id, { ...INITIAL_SLOT_STATE });
  }

  // Pick a token from the pool into a slot
  function pickFromPool(slotId: string, poolToken: TopToken) {
    setToken({
      id: slotId,
      symbol: poolToken.symbol,
      name: poolToken.symbol,
      contractAddress: poolToken.contractAddress ?? '',
      network: 'base',
      price: poolToken.price,
      change24h: poolToken.change,
      marketCap: poolToken.marketCap,
      volume24h: poolToken.volume24h,
      imageUrl: undefined,
      manual: false,
    });
    updateSlotState(slotId, { editing: false, searchQuery: '', searchResults: [] });
  }

  // Debounced search as user types ticker/name
  function handleSearchInput(slotId: string, val: string) {
    updateSlotState(slotId, { searchQuery: val, geckoError: '' });
    if (searchTimers.current[slotId]) clearTimeout(searchTimers.current[slotId]);
    if (val.trim().length < 2) {
      updateSlotState(slotId, { searchResults: [] });
      return;
    }
    // If looks like a CA, skip name search
    if (val.startsWith('0x') && val.length > 10) {
      updateSlotState(slotId, { searchResults: [] });
      return;
    }
    updateSlotState(slotId, { searchLoading: true });
    const net = slotStates[slotId]?.network ?? 'base';
    searchTimers.current[slotId] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/token-search?q=${encodeURIComponent(val.trim())}&network=${net}`);
        const data = await res.json();
        updateSlotState(slotId, { searchResults: data.results ?? [], searchLoading: false });
      } catch {
        updateSlotState(slotId, { searchResults: [], searchLoading: false });
      }
    }, 350);
  }

  // Gecko lookup by CA for a specific slot
  async function handleGeckoLookup(slotId: string) {
    const ss = slotStates[slotId];
    const query = ss?.searchQuery?.trim();
    if (!query || ss?.geckoLoading) return;
    updateSlotState(slotId, { geckoLoading: true, geckoError: '' });
    try {
      const res = await fetch(`/api/gecko-token?network=${ss?.network ?? 'base'}&ca=${encodeURIComponent(query.toLowerCase())}`);
      const data = await res.json();
      if (!res.ok) {
        updateSlotState(slotId, { geckoError: data.error ?? 'Not found', geckoLoading: false });
        return;
      }
      setToken({
        id: slotId,
        symbol: data.symbol,
        name: data.name,
        contractAddress: data.contractAddress,
        network: data.network,
        price: data.price,
        change24h: data.change24h,
        marketCap: data.marketCap,
        volume24h: data.volume24h,
        imageUrl: data.imageUrl ?? undefined,
        manual: false,
      });
      updateSlotState(slotId, { geckoLoading: false, editing: false, searchQuery: '', searchResults: [] });
    } catch {
      updateSlotState(slotId, { geckoError: 'Lookup failed', geckoLoading: false });
    }
  }

  // Pick from search autocomplete
  async function pickSearchResult(slotId: string, r: SearchResult) {
    if (r.contractAddress) {
      const ss = slotStates[slotId];
      updateSlotState(slotId, {
        searchQuery: r.contractAddress,
        searchResults: [],
        network: r.network,
        geckoLoading: true,
        geckoError: '',
      });
      try {
        const res = await fetch(`/api/gecko-token?network=${r.network}&ca=${encodeURIComponent(r.contractAddress.toLowerCase())}`);
        const data = await res.json();
        if (res.ok) {
          setToken({
            id: slotId,
            symbol: data.symbol,
            name: data.name,
            contractAddress: data.contractAddress,
            network: data.network,
            price: data.price,
            change24h: data.change24h,
            marketCap: data.marketCap,
            volume24h: data.volume24h,
            imageUrl: data.imageUrl ?? undefined,
            manual: false,
          });
          updateSlotState(slotId, { geckoLoading: false, editing: false, searchQuery: '', searchResults: [] });
          return;
        }
      } catch { /* fallthrough to manual */ }
      updateSlotState(slotId, { geckoLoading: false });
    }
    // Manual fallback
    setToken({
      id: slotId,
      symbol: r.symbol,
      name: r.name,
      contractAddress: r.contractAddress ?? '',
      network: r.network,
      price: '—',
      change24h: '—',
      imageUrl: r.imageUrl ?? undefined,
      manual: true,
    });
    updateSlotState(slotId, { editing: false, searchQuery: '', searchResults: [] });
  }

  const slots = Array.from({ length: 6 }, (_, i) => `slot-${i}`);

  return (
    <div className={`border-2 mb-2 ${theme.border}`}>
      {/* Header */}
      <div className={`px-2 py-1 border-b flex items-center justify-between ${theme.borderLight} ${theme.fillLight}`}>
        <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
          📈 Token Tracker — 6 Slots
        </p>
        <span className={`text-[8px] ${theme.mutedClass}`} style={SF}>
          click slot to edit
        </span>
      </div>

      {/* Pool hint */}
      {poolTokens.length > 0 && (
        <div className={`px-2 py-[6px] border-b text-[8px] italic ${theme.borderLight} ${theme.mutedClass}`} style={SF}>
          10 rotating Base tokens below — check slots or edit manually
        </div>
      )}

      {/* 6 slots */}
      <div className={`divide-y ${theme.borderLight}`}>
        {slots.map((slotId, idx) => {
          const token = getToken(slotId);
          const ss = slotStates[slotId] ?? INITIAL_SLOT_STATE;
          const filled = !!token.symbol;
          const isEditing = ss.editing;
          const changeColor = token.change24h.startsWith('+') ? 'text-green-600' : token.change24h === '—' ? '' : 'text-red-500';

          return (
            <div key={slotId}>
              {/* Slot summary row */}
              <div className={`flex items-center gap-2 px-2 py-2 min-h-[44px] ${filled ? theme.fillLight : ''}`}>
                {/* Slot number */}
                <span className={`text-[8px] font-black w-4 shrink-0 ${theme.mutedClass}`} style={SF}>
                  {idx + 1}
                </span>

                {/* Token info */}
                <div className="flex-1 min-w-0">
                  {filled ? (
                    <div className="flex items-center gap-1">
                      {token.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={token.imageUrl} alt={token.symbol} className="w-5 h-5 rounded-full shrink-0" />
                      ) : (
                        <div className={`w-5 h-5 rounded-full shrink-0 border text-[7px] flex items-center justify-center font-black ${theme.borderLight}`}>
                          {token.symbol[0] ?? '?'}
                        </div>
                      )}
                      <span className="text-[11px] font-black">{token.symbol}</span>
                      <span className={`text-[9px] ml-1 font-bold ${changeColor}`}>{token.change24h}</span>
                      <span className={`text-[9px] ml-1 ${theme.mutedClass}`}>{token.price}</span>
                      {token.manual && (
                        <span className={`text-[7px] px-1 ml-1 border ${theme.borderLight} ${theme.mutedClass}`} style={SF}>manual</span>
                      )}
                    </div>
                  ) : (
                    <span className={`text-[9px] italic ${theme.mutedClass}`} style={SF}>Empty slot</span>
                  )}
                </div>

                {/* Edit / clear buttons */}
                <div className="flex gap-1 shrink-0">
                  {filled && (
                    <button
                      onClick={() => clearToken(slotId)}
                      className={`text-[8px] px-2 py-1 border min-h-[28px] ${theme.borderLight} text-red-400 active:opacity-60`}
                      style={SF}
                    >
                      ✕
                    </button>
                  )}
                  <button
                    onClick={() => updateSlotState(slotId, { editing: !isEditing, searchQuery: filled ? token.contractAddress : '', searchResults: [] })}
                    className={`text-[8px] px-2 py-1 border min-h-[28px] font-bold uppercase tracking-wide active:opacity-70 ${
                      isEditing ? `${theme.fill} ${theme.fillText} ${theme.border}` : `${theme.borderLight} ${theme.mutedClass}`
                    }`}
                    style={SF}
                  >
                    {isEditing ? '▲ done' : '✏️ edit'}
                  </button>
                </div>
              </div>

              {/* Edit panel */}
              {isEditing && (
                <div className={`px-2 pb-2 pt-1 border-t ${theme.borderLight} ${theme.bg}`}>
                  {/* Network selector */}
                  <div className="flex gap-1 mb-2 flex-wrap">
                    {NETWORKS.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => updateSlotState(slotId, { network: n.id })}
                        className={`px-2 py-[3px] text-[8px] font-bold border min-h-[26px] transition-colors ${
                          (ss.network ?? 'base') === n.id
                            ? `${theme.fill} ${theme.fillText} ${theme.border}`
                            : `${theme.borderLight} ${theme.mutedClass} ${theme.bg}`
                        }`}
                        style={SF}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>

                  {/* Search / CA input */}
                  <div className="flex gap-1 relative">
                    <div className="flex-1 relative">
                      <input
                        className={`w-full border px-2 py-2 text-[10px] font-mono outline-none min-h-[44px] ${theme.borderLight} ${theme.bg} ${theme.text}`}
                        placeholder="Paste 0x CA or type ticker…"
                        value={ss.searchQuery}
                        onChange={(e) => handleSearchInput(slotId, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { updateSlotState(slotId, { searchResults: [] }); handleGeckoLookup(slotId); }
                          if (e.key === 'Escape') updateSlotState(slotId, { searchResults: [] });
                        }}
                        style={SF}
                      />
                      {/* Autocomplete */}
                      {ss.searchResults.length > 0 && (
                        <div
                          className={`absolute left-0 right-0 top-full z-50 border-2 shadow-lg ${theme.border} ${theme.bg}`}
                          style={{ marginTop: 2 }}
                        >
                          {ss.searchResults.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => pickSearchResult(slotId, r)}
                              className={`w-full flex items-center gap-2 px-2 py-2 text-left min-h-[36px] border-b last:border-0 ${theme.borderLight} ${theme.bg} ${theme.text} active:opacity-70`}
                            >
                              {r.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.imageUrl} alt={r.symbol} className="w-5 h-5 rounded-full shrink-0" />
                              ) : (
                                <div className={`w-5 h-5 rounded-full shrink-0 border text-[7px] flex items-center justify-center font-black ${theme.borderLight}`}>
                                  {r.symbol[0] ?? '?'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-black">{r.symbol}</span>
                                <span className={`text-[8px] ml-1 ${theme.mutedClass}`}>{r.name}</span>
                              </div>
                              {r.rank < 9000 && <span className={`text-[7px] ${theme.mutedClass}`}>#{r.rank}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { updateSlotState(slotId, { searchResults: [] }); handleGeckoLookup(slotId); }}
                      disabled={!ss.searchQuery?.trim() || ss.geckoLoading}
                      className={`shrink-0 px-3 py-2 text-[10px] font-black uppercase tracking-wide border-2 min-h-[44px] min-w-[56px] active:opacity-70 disabled:opacity-40 ${theme.border} ${theme.fill} ${theme.fillText}`}
                      style={SF}
                    >
                      {ss.geckoLoading ? '⏳' : ss.searchLoading ? '…' : '🔍'}
                    </button>
                  </div>
                  {ss.geckoError && (
                    <p className="text-[9px] text-red-500 mt-1" style={SF}>{ss.geckoError}</p>
                  )}

                  {/* Pool quick-pick */}
                  {poolTokens.length > 0 && (
                    <div className={`mt-2 border-t pt-2 ${theme.borderLight}`}>
                      <p className={`text-[8px] uppercase tracking-widest font-black mb-1 ${theme.mutedClass}`} style={SF}>
                        Or pick from pool
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {poolTokens.map((pt) => (
                          <button
                            key={pt.id}
                            onClick={() => pickFromPool(slotId, pt)}
                            className={`px-2 py-1 text-[9px] font-bold border min-h-[28px] transition-colors ${theme.borderLight} ${theme.bg} ${theme.text} active:${theme.fillLight}`}
                            style={SF}
                          >
                            {pt.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className={`px-2 py-[6px] border-t flex items-center justify-between ${theme.borderLight}`}>
        <span className={`text-[8px] ${theme.mutedClass}`} style={SF}>
          {trackerTokens.filter((t) => t.symbol).length}/6 slots filled
        </span>
        {trackerTokens.filter((t) => t.symbol).length > 0 && (
          <span className="text-[8px] text-green-600 font-bold" style={SF}>
            ✓ Token tracker ready for publish
          </span>
        )}
      </div>
    </div>
  );
}
