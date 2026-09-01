'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/features/app/theme-context';
import { getAllMints, getUserCollectibles, type PersonalCoverMintRow } from '@/db/actions/collectibles';
import { useFarcasterUser } from '@/neynar-farcaster-sdk/mini';

const SF = { fontFamily: 'Arial,sans-serif' };
const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };

function MintCard({ mint, showOwner = false }: { mint: PersonalCoverMintRow; showOwner?: boolean }) {
  const { theme } = useTheme();

  return (
    <div className={`border-2 ${theme.border}`}>
      {/* Cover image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mint.imageUrl}
        alt={`${mint.serial} — ${mint.headline}`}
        className="w-full block"
        style={{ aspectRatio: '1/1', objectFit: 'cover' }}
      />

      {/* Serial + headline */}
      <div className={`px-2 pt-2 pb-1 border-b ${theme.borderLight}`}>
        <div className="flex items-center justify-between mb-[2px]">
          <span className="text-[11px] font-black tracking-widest" style={SF}>{mint.serial}</span>
          {mint.tokenId && (
            <span className={`text-[8px] px-1 py-[1px] ${theme.fill} ${theme.fillText}`} style={SF}>#{mint.tokenId}</span>
          )}
        </div>
        <p className="text-[9px] leading-snug" style={SERIF}>&ldquo;{mint.headline}&rdquo;</p>
        {showOwner && mint.displayName && (
          <p className={`text-[8px] mt-[2px] ${theme.mutedClass}`} style={SF}>
            @{mint.username} · {mint.displayName}
          </p>
        )}
      </div>

      {/* Traits */}
      <div className={`grid grid-cols-2 gap-[1px] border-b ${theme.borderLight}`} style={{ background: 'currentColor' }}>
        {[
          { label: 'Issue Date', value: mint.issueDate },
          { label: 'Issue',      value: String(mint.serialIndex) },
          { label: 'Farcaster',  value: `FID #${mint.fid}` },
          { label: 'Network',    value: 'Base' },
        ].map((t) => (
          <div key={t.label} className={`px-2 py-1 ${theme.bg}`}>
            <p className={`text-[7px] uppercase tracking-widest ${theme.mutedClass}`} style={SF}>{t.label}</p>
            <p className="text-[9px] font-bold leading-tight truncate">{t.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className={`flex gap-1 p-2 ${theme.bg}`}>
        {mint.openSeaUrl ? (
          <a
            href={mint.openSeaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider border text-center min-h-[36px] flex items-center justify-center ${theme.fill} ${theme.fillText}`}
            style={SF}
          >
            View on OpenSea ↗
          </a>
        ) : (
          <div className={`flex-1 py-2 text-[9px] text-center border min-h-[36px] flex items-center justify-center ${theme.borderLight} ${theme.mutedClass}`} style={SF}>
            Pending on-chain…
          </div>
        )}
        <p className={`text-[7px] self-center ml-auto pr-1 ${theme.mutedClass}`} style={SF}>
          {new Date(mint.mintedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

type Filter = 'all' | 'mine';

export function MintArchive() {
  const { theme } = useTheme();
  const { data: farcasterUser } = useFarcasterUser();
  const fid = farcasterUser?.fid;

  const [filter, setFilter] = useState<Filter>('all');
  const [allMints, setAllMints] = useState<PersonalCoverMintRow[]>([]);
  const [myMints, setMyMints] = useState<PersonalCoverMintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [all, mine] = await Promise.all([
        getAllMints(100),
        fid ? getUserCollectibles(fid) : Promise.resolve([]),
      ]);
      setAllMints(all);
      setMyMints(mine);
    } catch {
      setError('Could not load minted NFTs.');
    } finally {
      setLoading(false);
    }
  }, [fid]);

  useEffect(() => { load(); }, [load]);

  const mints = filter === 'mine' ? myMints : allMints;

  return (
    <div className={`overflow-y-auto ${theme.bg} ${theme.text}`} style={SERIF}>
      <div className="px-2 py-2">

        {/* Masthead */}
        <div className={`border-2 mb-3 ${theme.border}`}>
          <div className={`border-b px-2 py-[6px] flex justify-between items-center ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
            <p className="text-[8px] uppercase tracking-[0.2em]" style={SF}>Tribune Archive</p>
            <button onClick={load} className="text-[8px] uppercase tracking-wide active:opacity-50" style={SF}>↻</button>
          </div>
          <div className="px-2 py-3 text-center">
            <p className="text-[20px] font-black uppercase tracking-tight leading-none" style={SERIF}>NFT Mint Archive</p>
            <p className={`text-[9px] mt-1 ${theme.mutedClass}`} style={SF}>
              Every Tribune NFT ever minted — your permanent record on Base
            </p>
          </div>

          {/* Stats bar */}
          <div className={`border-t grid grid-cols-2 divide-x ${theme.borderLight}`}>
            <div className="py-2 text-center">
              <p className="text-[16px] font-black leading-none">{allMints.length}</p>
              <p className={`text-[8px] uppercase tracking-widest mt-1 ${theme.mutedClass}`} style={SF}>Total Mints</p>
            </div>
            <div className="py-2 text-center">
              <p className="text-[16px] font-black leading-none">{myMints.length}</p>
              <p className={`text-[8px] uppercase tracking-widest mt-1 ${theme.mutedClass}`} style={SF}>Your Mints</p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className={`flex border-2 mb-3 ${theme.border}`}>
          {(['all', 'mine'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest min-h-[40px] transition-all ${
                filter === f ? `${theme.fill} ${theme.fillText}` : `${theme.bg} ${theme.text}`
              }`}
              style={SF}
            >
              {f === 'all' ? 'All Mints' : 'My Mints'}
            </button>
          ))}
        </div>

        {loading && (
          <p className={`text-[10px] text-center py-8 ${theme.mutedClass}`} style={SF}>Loading mints…</p>
        )}

        {error && (
          <p className="text-[10px] text-center py-4 text-red-500" style={SF}>{error}</p>
        )}

        {!loading && !error && mints.length === 0 && (
          <div className={`border-2 p-6 text-center ${theme.border}`}>
            <p className="text-[24px] mb-2">🗞️</p>
            <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={SF}>
              {filter === 'mine' ? 'No mints yet' : 'No NFTs minted yet'}
            </p>
            <p className={`text-[9px] leading-snug ${theme.mutedClass}`} style={SF}>
              {filter === 'mine'
                ? 'Mint your first Tribune cover to see it here — yours forever on Base.'
                : 'When readers mint their personalized Tribune covers, they appear here.'}
            </p>
          </div>
        )}

        {!loading && mints.length > 0 && (
          <div className="space-y-4">
            {mints.map((m) => (
              <MintCard key={m.id} mint={m} showOwner={filter === 'all'} />
            ))}
          </div>
        )}

        <div className="pb-4" />
      </div>
    </div>
  );
}
