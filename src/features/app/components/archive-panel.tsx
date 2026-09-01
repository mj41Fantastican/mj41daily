'use client';

import { useState } from 'react';
import { Button } from '@neynar/ui';
import { useTheme } from '@/features/app/theme-context';
import { useArchive } from '@/hooks/use-archive';
import { recordUnlock } from '@/db/actions/access';
import { useFarcasterUser } from '@/neynar-farcaster-sdk/mini';
import { useIsEditor } from '@/hooks/use-is-editor';
import type { ArchiveIssue, ArchiveView } from '@/features/app/types';

const SF = { fontFamily: 'Arial,sans-serif' };
const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };

// ── DETAIL VIEW ───────────────────────────────────────────────

function ArchiveDetail({
  selectedIssue,
  unlocked,
  isEditor,
  onUnlock,
  onBack,
}: {
  selectedIssue: ArchiveIssue;
  unlocked: boolean;
  isEditor: boolean;
  onUnlock: () => void;
  onBack: () => void;
}) {
  const { theme } = useTheme();

  return (
    <div className={`overflow-y-auto ${theme.bg} ${theme.text}`} style={SERIF}>
      <div className="px-2 py-2">
        <button
          onClick={onBack}
          className={`flex items-center gap-1 text-[9px] uppercase tracking-widest mb-2 transition-opacity min-h-[36px] ${theme.mutedClass}`}
          style={SF}
        >
          ← Back to Archive
        </button>

        {/* Mini nameplate */}
        <div className={`border-2 mb-2 ${theme.border}`}>
          <div className={`border-b px-2 py-[3px] flex justify-between ${theme.borderLight}`} style={SF}>
            <span className="text-[9px] uppercase tracking-widest">
              Issue #{selectedIssue.issue}, Vol. {selectedIssue.vol}
            </span>
            <span className="text-[9px] uppercase tracking-widest">{selectedIssue.date}</span>
          </div>
          <div className="text-center px-2 py-2">
            <div className="leading-none font-black" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
              THE DAILY MISCELLANY
            </div>
            {selectedIssue.autoPublished && (
              <div
                className={`mt-1 inline-block px-2 py-[2px] text-[8px] uppercase tracking-widest ${theme.fillLight} ${theme.text}`}
                style={SF}
              >
                ⚡ Auto-published
              </div>
            )}
          </div>
        </div>

        {/* Lead */}
        <div className={`border-2 mb-1 p-2 ${theme.border}`}>
          <div className={`text-[8px] uppercase tracking-widest mb-1 ${theme.mutedClass}`} style={SF}>
            Lead Story
          </div>
          <p className="text-[13px] font-black leading-tight uppercase">{selectedIssue.lead}</p>
          {unlocked ? (
            <p className={`text-[10px] mt-2 leading-snug ${theme.mutedClass}`}>
              Full story available. Tap to read the complete article as published in this issue.
            </p>
          ) : (
            <p className="text-[10px] mt-2 opacity-30 italic">
              🔒 Pay to read — $0.01 USDC/ETH or 4,141 $RWACu
            </p>
          )}
        </div>

        {/* Secondary */}
        <div className={`border-2 mb-1 flex ${theme.border}`}>
          {selectedIssue.secondary.map((s, i) => (
            <div
              key={i}
              className={`flex-1 p-2 ${i === 0 ? `border-r ${theme.borderLight}` : ''}`}
            >
              <div className={`text-[8px] uppercase tracking-widest mb-1 ${theme.mutedClass}`} style={SF}>
                {i === 0 ? '⚠ Neg' : '✦ Pos'}
              </div>
              <p className="text-[10px] font-bold leading-tight">{s}</p>
              {!unlocked && <p className="text-[9px] mt-1 opacity-30 italic">🔒</p>}
            </div>
          ))}
        </div>

        {/* Stats — editor only */}
        {isEditor && (
          <div className={`border-2 mb-2 p-2 ${theme.border}`}>
            <p
              className={`text-[8px] uppercase tracking-widest border-b pb-1 mb-2 ${theme.borderLight} ${theme.mutedClass}`}
              style={SF}
            >
              Issue Stats
            </p>
            <div className="grid grid-cols-3 gap-1 text-center">
              {[
                { val: selectedIssue.mints, label: 'Mints' },
                { val: selectedIssue.readers, label: 'Readers' },
                { val: selectedIssue.revenue, label: 'Revenue' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-[13px] font-black">{stat.val}</p>
                  <p className={`text-[8px] ${theme.mutedClass}`} style={SF}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unlock/access */}
        {unlocked ? (
          <div className={`border-2 p-2 text-center mb-2 ${theme.borderLight}`}>
            <p className="text-[10px] font-bold text-green-600" style={SF}>
              ✓ You have access to this issue
            </p>
          </div>
        ) : (
          <div className="space-y-1 mb-2">
            <Button className="w-full" onClick={onUnlock}>
              Unlock Issue #{selectedIssue.issue} — $0.01
            </Button>
            <Button variant="secondary" className="w-full" onClick={onUnlock}>
              Mint &amp; Own Forever — $0.041
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── LIST VIEW ─────────────────────────────────────────────────

export function ArchivePanel() {
  const { theme } = useTheme();
  const { data: user } = useFarcasterUser();
  const { isEditor } = useIsEditor();
  const { issues: archiveIssues, totalMints, totalRevenue, unlockedIssueIds, isLoading } = useArchive();
  const [view, setView] = useState<ArchiveView>('list');
  const [selectedIssue, setSelectedIssue] = useState<ArchiveIssue | null>(null);
  const [localUnlocked, setLocalUnlocked] = useState<number[]>([]);

  const allUnlocked = [...unlockedIssueIds, ...localUnlocked];

  async function handleUnlock(archiveIssue: ArchiveIssue) {
    if (user?.fid) {
      await recordUnlock(user.fid, archiveIssue.issue, 'usdc');
    }
    setLocalUnlocked((u) => [...u, archiveIssue.issue]);
  }

  function openIssue(issue: ArchiveIssue) {
    setSelectedIssue(issue);
    setView('detail');
  }

  if (view === 'detail' && selectedIssue) {
    return (
      <ArchiveDetail
        selectedIssue={selectedIssue}
        unlocked={allUnlocked.includes(selectedIssue.issue)}
        isEditor={isEditor}
        onUnlock={() => handleUnlock(selectedIssue)}
        onBack={() => setView('list')}
      />
    );
  }

  if (isLoading) {
    return (
      <div className={`p-6 text-center ${theme.bg} ${theme.text}`}>
        <p className="text-[10px] opacity-50" style={SF}>Loading archive...</p>
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto ${theme.bg} ${theme.text}`} style={SERIF}>
      <div className="px-2 py-2">

        {/* Header + cumulative stats */}
        <div className={`border-2 mb-2 ${theme.border}`}>
          <div className={`px-2 py-1 border-b ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
            <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
              📚 Issue Archive
            </p>
          </div>
          <div className={`grid divide-x ${theme.borderLight} text-center ${isEditor ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {[
              { val: archiveIssues.length, label: 'Issues published' },
              ...(isEditor ? [
                { val: totalMints, label: 'Total mints' },
                { val: totalRevenue, label: 'Revenue' },
              ] : []),
            ].map((stat) => (
              <div key={stat.label} className="p-2">
                <p className="text-[13px] font-black">{stat.val}</p>
                <p className={`text-[8px] ${theme.mutedClass}`} style={SF}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filter row */}
        <div className="flex gap-1 mb-2" style={SF}>
          {['All Issues', 'Auto-published', 'Manual'].map((f, i) => (
            <button
              key={f}
              className={`flex-1 py-1 text-[9px] border text-center uppercase tracking-wide min-h-[36px] ${
                i === 0
                  ? `${theme.fill} ${theme.fillText} ${theme.border} font-bold`
                  : `${theme.borderLight} ${theme.text}`
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Issue list */}
        <div className="space-y-1">
          {archiveIssues.length === 0 && (
            <div className={`border-2 p-6 text-center ${theme.border}`}>
              <p className="text-[11px] font-black uppercase tracking-widest mb-1">No issues yet</p>
              <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>
                The first issue will appear here once published.
              </p>
            </div>
          )}
          {[...archiveIssues].reverse().map((archiveIssue) => (
            <button
              key={archiveIssue.issue}
              onClick={() => openIssue(archiveIssue)}
              className={`w-full text-left border-2 p-2 transition-colors ${theme.border} ${theme.text} ${theme.bg}`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[9px] font-black px-1 ${theme.fill} ${theme.fillText}`}
                      style={SF}
                    >
                      #{archiveIssue.issue}
                    </span>
                    <span className={`text-[9px] ${theme.mutedClass}`} style={SF}>
                      {archiveIssue.date}
                    </span>
                    {archiveIssue.autoPublished && (
                      <span className={`text-[8px] uppercase tracking-wide ${theme.mutedClass}`} style={SF}>
                        ⚡ auto
                      </span>
                    )}
                    {allUnlocked.includes(archiveIssue.issue) && (
                      <span className="text-[8px] text-green-500 font-bold" style={SF}>
                        ✓ owned
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold leading-tight">{archiveIssue.lead}</p>
                  <p className={`text-[8px] leading-tight mt-1 ${theme.mutedClass}`}>
                    ⚠ {archiveIssue.secondary[0]}
                  </p>
                </div>
                {isEditor && (
                  <div className="shrink-0 text-right" style={SF}>
                    <p className="text-[10px] font-black">{archiveIssue.mints}</p>
                    <p className={`text-[8px] ${theme.mutedClass}`}>mints</p>
                    <p className="text-[9px] font-bold mt-1">{archiveIssue.revenue}</p>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-2 pb-2">
          <button
            className={`w-full border-2 py-2 text-[9px] uppercase tracking-widest text-center ${theme.borderLight} ${theme.mutedClass}`}
            style={SF}
          >
            Load older issues
          </button>
        </div>

      </div>
    </div>
  );
}
