'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/features/app/theme-context';
import type { MiniAppWriteIn } from '@/features/app/types';

const SF = { fontFamily: 'Arial,sans-serif' };

// ── Your pinned apps — always available ───────────────────────────────────────
const PINNED_APPS: Array<{ name: string; author: string; desc: string; url: string; emoji: string }> = [
  {
    name: 'The Daily Miscellany',
    author: '@mj41fantastican',
    desc: 'Daily curated Farcaster miscellany with top stories, trending casts, and NFT covers.',
    url: '', // self-referential — no external link needed
    emoji: '📰',
  },
  {
    name: 'Wormcaster',
    author: '@mj41fantastican',
    desc: 'Wormcaster — a Farcaster mini app experience.',
    url: 'https://farcaster.xyz/miniapps/V4IIR2vZji4j/wormcaster',
    emoji: '🪱',
  },
  {
    name: 'IdeaMint',
    author: '@mj41fantastican',
    desc: 'Mint your ideas on-chain. Capture and immortalize your best thoughts as NFTs.',
    url: 'https://farcaster.xyz/miniapps/H6EM_xbYgNQR/ideamint',
    emoji: '💡',
  },
  {
    name: 'Happy B Days',
    author: '@mj41fantastican',
    desc: 'Birthday wishes on Farcaster. Celebrate your friends on-chain.',
    url: 'https://farcaster.xyz/miniapps/ygitr6HLd8c0/happy-b-days',
    emoji: '🎂',
  },
  {
    name: 'BAM',
    author: '@mj41fantastican',
    desc: 'Blockchain Activity Monitor — track on-chain activity and wallet movements.',
    url: 'https://farcaster.xyz/miniapps/By71EK-KI-Y3/bam-blockchain-activity-monitor',
    emoji: '📊',
  },
  {
    name: 'Dick Tracy Blockchain Detective',
    author: '@mj41fantastican',
    desc: 'Investigate wallets and on-chain activity like a classic noir detective.',
    url: 'https://farcaster.xyz/miniapps/IFPHc1ipHS49/richard-tracy',
    emoji: '🕵️',
  },
];

// ── Apps I Like — daily rotation of 4 from this collection ───────────────────
// All @mj41fantastican apps; 4 rotate in each day
const APP_POOL: Array<{ name: string; author: string; desc: string; url: string; emoji: string }> = [
  {
    name: 'The Daily Miscellany',
    author: '@mj41fantastican',
    desc: 'Daily curated Farcaster miscellany with top stories, trending casts, and NFT covers.',
    url: 'https://farcaster.xyz/miniapps/THgZKwBy_DWr/the-copper-wire-miscellany',
    emoji: '📰',
  },
  {
    name: 'Wormcaster',
    author: '@mj41fantastican',
    desc: 'Wormcaster — a Farcaster mini app experience.',
    url: 'https://farcaster.xyz/miniapps/V4IIR2vZji4j/wormcaster',
    emoji: '🪱',
  },
  {
    name: 'IdeaMint',
    author: '@mj41fantastican',
    desc: 'Mint your ideas on-chain. Capture and immortalize your best thoughts as NFTs.',
    url: 'https://farcaster.xyz/miniapps/H6EM_xbYgNQR/ideamint',
    emoji: '💡',
  },
  {
    name: 'Happy B Days',
    author: '@mj41fantastican',
    desc: 'Birthday wishes on Farcaster. Celebrate your friends on-chain.',
    url: 'https://farcaster.xyz/miniapps/ygitr6HLd8c0/happy-b-days',
    emoji: '🎂',
  },
  {
    name: 'BAM',
    author: '@mj41fantastican',
    desc: 'Blockchain Activity Monitor — track on-chain activity and wallet movements.',
    url: 'https://farcaster.xyz/miniapps/By71EK-KI-Y3/bam-blockchain-activity-monitor',
    emoji: '📊',
  },
  {
    name: 'Dick Tracy Blockchain Detective',
    author: '@mj41fantastican',
    desc: 'Investigate wallets and on-chain activity like a classic noir detective.',
    url: 'https://farcaster.xyz/miniapps/IFPHc1ipHS49/richard-tracy',
    emoji: '🕵️',
  },
];

export type AppBrief = {
  name: string;
  author: string;
  desc: string;
  url: string;
  tag: 'APPS';
  appName: string;
  appAuthor: string;
  text: string;
};

interface MiniAppShowcaseEditorProps {
  selectedApps: AppBrief[];
  onSelectedAppsChange: (apps: AppBrief[]) => void;
  /** legacy write-in support */
  miniAppWriteIn: MiniAppWriteIn;
  miniAppWriteInMode: boolean;
  onMiniAppWriteInChange: (w: MiniAppWriteIn) => void;
  onMiniAppWriteInModeChange: (v: boolean) => void;
}

function appToBrief(a: { name: string; author: string; desc: string; url: string }): AppBrief {
  return {
    name: a.name, author: a.author, desc: a.desc, url: a.url,
    tag: 'APPS', appName: a.name, appAuthor: a.author,
    text: `🆕 ${a.name}: ${a.desc}`,
  };
}

export function MiniAppShowcaseEditor({
  selectedApps,
  onSelectedAppsChange,
  miniAppWriteIn,
  miniAppWriteInMode,
  onMiniAppWriteInChange,
  onMiniAppWriteInModeChange,
}: MiniAppShowcaseEditorProps) {
  const { theme } = useTheme();
  const [dailyPool, setDailyPool] = useState<typeof APP_POOL>([]);
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');

  // Seed today's random pool from the full pool — changes daily
  useEffect(() => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth()+1) * 100 + today.getDate();
    // Fisher-Yates shuffle seeded by date
    const pool = [...APP_POOL];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = ((seed * (i + 7)) % (i + 1) + (i + 1)) % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setDailyPool(pool.slice(0, 4));
  }, []);

  function isSelected(name: string) {
    return selectedApps.some((a) => a.name === name);
  }

  function toggle(app: { name: string; author: string; desc: string; url: string }) {
    if (isSelected(app.name)) {
      onSelectedAppsChange(selectedApps.filter((a) => a.name !== app.name));
    } else {
      onSelectedAppsChange([...selectedApps, appToBrief(app)]);
    }
  }

  function addCustom() {
    if (!customName.trim()) return;
    toggle({ name: customName.trim(), author: customAuthor.trim() || 'Unknown', desc: customDesc.trim() || '', url: customUrl.trim() });
    setCustomName(''); setCustomDesc(''); setCustomUrl(''); setCustomAuthor('');
  }

  return (
    <div className="space-y-2">
      {/* Selected count */}
      <div className="flex items-center justify-between">
        <p className={`text-[8px] uppercase tracking-widest font-bold ${theme.mutedClass}`} style={SF}>
          {selectedApps.length} app{selectedApps.length !== 1 ? 's' : ''} selected for showcase
        </p>
        {selectedApps.length > 0 && (
          <button onClick={() => onSelectedAppsChange([])}
            className={`text-[8px] uppercase tracking-wide opacity-60 hover:opacity-100`} style={SF}>
            Clear
          </button>
        )}
      </div>

      {/* Selected preview strip */}
      {selectedApps.length > 0 && (
        <div className={`flex flex-wrap gap-1 p-2 border ${theme.borderLight} ${theme.fillLight}`}>
          {selectedApps.map((a) => (
            <div key={a.name} className={`flex items-center gap-1 px-2 py-[2px] border text-[8px] ${theme.border}`}>
              <span className="font-bold">{a.appName}</span>
              <button onClick={() => toggle(a)} className={`${theme.mutedClass} ml-1 opacity-60 hover:opacity-100`}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── YOUR APPS (PINNED) ── */}
      <div>
        <p className={`text-[8px] uppercase tracking-widest font-black mb-1 ${theme.mutedClass}`} style={SF}>
          📌 Your Apps
        </p>
        <div className="space-y-1">
          {PINNED_APPS.map((app) => {
            const active = isSelected(app.name);
            return (
              <button key={app.name} onClick={() => toggle(app)}
                className={`w-full flex items-center gap-2 px-3 py-2 border-2 min-h-[48px] text-left transition-all ${
                  active ? `${theme.border} ${theme.fill} ${theme.fillText}` : `${theme.borderLight}`
                }`}>
                <span className="text-[18px] shrink-0">{app.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black leading-none">{app.name}</p>
                  <p className={`text-[8px] truncate mt-[1px] ${active ? 'opacity-80' : theme.mutedClass}`} style={SF}>{app.desc}</p>
                </div>
                <span className={`text-[10px] font-bold shrink-0 ${active ? '' : theme.mutedClass}`}>
                  {active ? '✓ ON' : 'OFF'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DAILY RANDOM PICKS ── */}
      <div>
        <p className={`text-[8px] uppercase tracking-widest font-black mb-1 ${theme.mutedClass}`} style={SF}>
          ⭐ Apps I Like
        </p>
        <p className={`text-[8px] mb-2 leading-snug ${theme.mutedClass}`} style={SF}>
          4 apps from your collection rotate in daily.
        </p>
        <div className="space-y-1">
          {dailyPool.map((app) => {
            const active = isSelected(app.name);
            return (
              <button key={app.name} onClick={() => toggle(app)}
                className={`w-full flex items-center gap-2 px-2 py-2 border min-h-[40px] text-left transition-all ${
                  active ? `${theme.border} ${theme.fillLight}` : `${theme.borderLight}`
                }`}>
                <span className="text-[14px] shrink-0">{app.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold leading-none">{app.name}</p>
                  <p className={`text-[8px] truncate ${theme.mutedClass}`} style={SF}>{app.author}</p>
                </div>
                <span className={`text-[9px] font-bold shrink-0 ${active ? '' : theme.mutedClass}`}>
                  {active ? '✓' : '+'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CUSTOM ADD ── */}
      <div>
        <button
          onClick={() => onMiniAppWriteInModeChange(!miniAppWriteInMode)}
          className={`w-full flex items-center justify-between px-3 py-2 border min-h-[40px] ${theme.borderLight}`}
        >
          <p className={`text-[9px] font-bold uppercase tracking-wide ${theme.mutedClass}`} style={SF}>
            ✏️ Add custom app
          </p>
          <span className={`text-[9px] ${theme.mutedClass}`}>{miniAppWriteInMode ? '▲' : '▼'}</span>
        </button>
        {miniAppWriteInMode && (
          <div className={`border border-t-0 p-2 space-y-1 ${theme.borderLight}`}>
            {[
              { label: 'App name *', val: customName, set: setCustomName, ph: 'e.g. WordCast' },
              { label: 'Author handle', val: customAuthor, set: setCustomAuthor, ph: '@builder' },
              { label: 'Description', val: customDesc, set: setCustomDesc, ph: 'What does it do?' },
              { label: 'URL', val: customUrl, set: setCustomUrl, ph: 'https://farcaster.xyz/miniapps/...' },
            ].map((f) => (
              <div key={f.label}>
                <label className={`text-[7px] uppercase tracking-widest block mb-[2px] ${theme.mutedClass}`} style={SF}>{f.label}</label>
                <input value={f.val} onChange={(e) => f.set(e.target.value)}
                  className={`w-full border px-2 py-1 text-[10px] outline-none min-h-[34px] ${theme.borderLight} ${theme.bg} ${theme.text}`}
                  placeholder={f.ph} style={SF} />
              </div>
            ))}
            <button onClick={addCustom} disabled={!customName.trim()}
              className={`w-full py-2 text-[10px] font-bold uppercase tracking-wide border-2 min-h-[40px] ${theme.border} ${theme.fill} ${theme.fillText} disabled:opacity-40`}
              style={SF}>
              + Add to Showcase
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
