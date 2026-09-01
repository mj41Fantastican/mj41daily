'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/features/app/theme-context';
import { getUserCollectibles, getAllMints, type PersonalCoverMintRow } from '@/db/actions/collectibles';
import { useFarcasterUser } from '@/neynar-farcaster-sdk/mini';
import { usePaywall } from '@/hooks/use-paywall';
import { useCurrentIssue } from '@/hooks/use-current-issue';

const SF = { fontFamily: 'Arial,sans-serif' };
const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };

function saveImageToDevice(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function MintCard({ mint, showOwner = false }: { mint: PersonalCoverMintRow; showOwner?: boolean }) {
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSaveImage() {
    setSaving(true);
    saveImageToDevice(mint.imageUrl, `${mint.serial}.png`);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 500);
  }

  return (
    <div className={`border-2 mb-3 ${theme.border}`}>
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
          <span className="text-[11px] font-black tracking-widest" style={SF}>
            {mint.serial}
          </span>
          {mint.tokenId && (
            <span className={`text-[8px] px-1 py-[1px] ${theme.fill} ${theme.fillText}`} style={SF}>
              #{mint.tokenId}
            </span>
          )}
        </div>
        <p className="text-[9px] leading-snug" style={SERIF}>
          &ldquo;{mint.headline}&rdquo;
        </p>
        {showOwner && mint.displayName && (
          <p className={`text-[8px] mt-[2px] ${theme.mutedClass}`} style={SF}>
            @{mint.username} · {mint.displayName}
          </p>
        )}
      </div>

      {/* Traits grid */}
      <div className={`grid grid-cols-2 gap-[1px] border-b ${theme.borderLight}`} style={{ background: 'currentColor' }}>
        {[
          { label: 'Issue Date',    value: mint.issueDate },
          { label: 'Issue Value',   value: mint.issueValue },
          { label: 'Farcaster ID',  value: `FID #${mint.fid}` },
          { label: 'Neynar Score',  value: mint.neynarScore ?? '—' },
          { label: 'Network',       value: 'Base' },
          { label: 'Edition',       value: 'Personal Cover' },
        ].map((t) => (
          <div key={t.label} className={`px-2 py-1 ${theme.bg}`}>
            <p className={`text-[7px] uppercase tracking-widest ${theme.mutedClass}`} style={SF}>{t.label}</p>
            <p className="text-[9px] font-bold leading-tight truncate">{t.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className={`flex gap-1 p-2 ${theme.bg}`}>
        <button
          onClick={handleSaveImage}
          disabled={saving}
          className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider border transition-all min-h-[36px] ${
            saved ? 'border-green-600 text-green-600' : `${theme.borderLight} ${theme.text}`
          }`}
          style={SF}
        >
          {saved ? '✓ Saved' : saving ? '…' : '⬇ Save Image'}
        </button>

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
      </div>

      {/* Mint date */}
      <div className={`px-2 pb-2 text-right ${theme.bg}`}>
        <p className={`text-[7px] ${theme.mutedClass}`} style={SF}>
          Minted {new Date(mint.mintedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

type Tab = 'mine' | 'all';

export function CollectiblesPanel({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const { theme } = useTheme();
  const { data: farcasterUser } = useFarcasterUser();
  const issue = useCurrentIssue();
  const { unlocked } = usePaywall(issue.issueId);
  const fid = farcasterUser?.fid;

  const [tab, setTab] = useState<Tab>('mine');
  const [myMints, setMyMints] = useState<PersonalCoverMintRow[]>([]);
  const [allMints, setAllMints] = useState<PersonalCoverMintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [mine, all] = await Promise.all([
        fid ? getUserCollectibles(fid) : Promise.resolve([]),
        getAllMints(50),
      ]);
      setMyMints(mine);
      setAllMints(all);
    } catch {
      setError('Could not load collectibles.');
    } finally {
      setLoading(false);
    }
  }, [fid]);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  const mints = tab === 'mine' ? myMints : allMints;

  return (
    <div className={`overflow-y-auto ${theme.bg} ${theme.text}`} style={SERIF}>
      <div className="px-2 py-2">

        {/* Header */}
        <div className={`border-2 mb-3 ${theme.border}`}>
          <div className={`px-2 py-[6px] flex justify-between items-center border-b ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
            <p className="text-[8px] uppercase tracking-[0.2em]" style={SF}>Miscellany Collectibles</p>
            <button
              onClick={load}
              className="text-[8px] uppercase tracking-wide active:opacity-50"
              style={SF}
            >
              ↻
            </button>
          </div>
          <div className="px-2 py-2 text-center">
            <p className="text-[18px] font-black uppercase tracking-tight leading-none" style={SERIF}>
              Collector&apos;s Gallery
            </p>
            <p className={`text-[8px] uppercase tracking-[0.2em] mt-1 ${theme.mutedClass}`} style={SF}>
              Personal Cover Editions · Base Network
            </p>
          </div>
          <div className={`h-[2px] ${theme.fill}`} />
        </div>

        {/* Tab switcher */}
        <div className={`flex border-2 mb-3 ${theme.border}`}>
          <button
            onClick={() => setTab('mine')}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider transition-all min-h-[36px] ${
              tab === 'mine' ? `${theme.fill} ${theme.fillText}` : `${theme.bg} ${theme.text}`
            }`}
            style={SF}
          >
            My Mints {myMints.length > 0 ? `(${myMints.length})` : ''}
          </button>
          <button
            onClick={() => setTab('all')}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider transition-all min-h-[36px] border-l ${theme.borderLight} ${
              tab === 'all' ? `${theme.fill} ${theme.fillText}` : `${theme.bg} ${theme.text}`
            }`}
            style={SF}
          >
            All Editions {allMints.length > 0 ? `(${allMints.length})` : ''}
          </button>
        </div>

        {/* Content */}
        {!fid && tab === 'mine' ? (
          <p className={`text-[10px] text-center py-8 ${theme.mutedClass}`} style={SF}>
            Sign in with Farcaster to see your collectibles.
          </p>
        ) : loading ? (
          <p className={`text-[10px] text-center py-8 ${theme.mutedClass}`} style={SF}>
            Setting type…
          </p>
        ) : error ? (
          <p className="text-[10px] text-center py-8 text-red-500" style={SF}>{error}</p>
        ) : !unlocked && tab === 'all' ? (
          <div className={`border-2 p-6 text-center ${theme.borderLight}`}>
            <p className="text-[24px] mb-2">🔒</p>
            <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={SF}>
              Paid Readers Only
            </p>
            <p className={`text-[9px] leading-snug ${theme.mutedClass}`} style={SF}>
              Unlock today&apos;s issue to browse the full Collector&apos;s Gallery.
            </p>
          </div>
        ) : mints.length === 0 ? (
          <div className={`border-2 p-6 text-center ${theme.borderLight}`}>
            <p className="text-[24px] mb-2">🗞</p>
            <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={SF}>
              {tab === 'mine' ? 'No Collectibles Yet' : 'No Editions Minted Yet'}
            </p>
            <p className={`text-[9px] leading-snug ${theme.mutedClass}`} style={SF}>
              {tab === 'mine'
                ? 'Generate and mint your personal Miscellany cover from the Front Page to start your collection.'
                : 'Be the first to mint a personal cover edition.'}
            </p>
          </div>
        ) : (
          <>
            <p className={`text-[9px] mb-3 ${theme.mutedClass}`} style={SF}>
              {mints.length} cover edition{mints.length !== 1 ? 's' : ''}
              {tab === 'mine' ? ' in your collection' : ' minted on Base'}
            </p>
            {mints.map((mint) => (
              <MintCard key={mint.serial} mint={mint} showOwner={tab === 'all'} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
