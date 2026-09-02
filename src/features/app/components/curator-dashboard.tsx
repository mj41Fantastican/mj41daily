'use client';

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
const StatsPanel = lazy(() => import('@/features/app/components/stats-panel').then((m) => ({ default: m.StatsPanel })));
import { Button } from '@neynar/ui';
import { useTheme } from '@/features/app/theme-context';
import { THEMES } from '@/data/mocks';
import type { ThemeId } from '@/features/app/types';
import { FrontPage } from '@/features/app/components/front-page';
import { SlotSection } from '@/features/app/components/slot-section';
import { useDailyFeed } from '@/hooks/use-daily-feed';
import { useCurrentIssue } from '@/hooks/use-current-issue';
import { publishIssue, getNextIssueNumber, deleteAllIssues, scheduleIssue, getScheduledIssues, cancelScheduledIssue } from '@/db/actions/issues';
import { resetAccess, resetAllStats, getIssueStats, type IssueStats } from '@/db/actions/access';
import { refreshFeed } from '@/db/actions/feed';
import { useFarcasterUser } from '@/neynar-farcaster-sdk/mini';
import { useViewer } from '@/hooks/use-viewer';
import { PinnedTokensEditor } from '@/features/app/components/pinned-tokens-editor';
import { MiniAppShowcaseEditor, type AppBrief } from '@/features/app/components/mini-app-showcase-editor';
import { getAirdropIssues, getAirdropWhitelist, setAirdropEnabled, type AirdropEntry } from '@/db/actions/airdrop';
import type { Slot, Picks, WriteIns, WriteInMode, SlotDefinition, NewsCategory, NewsStory, MiniAppWriteIn, TrackerToken } from '@/features/app/types';
import type { WidgetId } from '@/features/app/components/widget-panel';
import { NEWS_CATEGORY_LABELS } from '@/features/app/types';
import { MOCK_TEASERS, PAYWALL_CURRENCIES } from '@/data/mocks';
import { usePaperSettings } from '@/hooks/use-paper-settings';

interface GeckoTokenData {
  name: string;
  symbol: string;
  contractAddress: string;
  network: string;
  price: string;
  change24h: string;
  change1h: string;
  change6h: string;
  volume24h: string;
  marketCap: string;
  fdv: string;
  liquidity: string;
  topDex: string | null;
  poolName: string | null;
  buys24h: number;
  sells24h: number;
  imageUrl: string | null;
  description: string;
  projectDescription: string;
  homepage: string | null;
  twitterHandle: string | null;
  coingeckoId: string | null;
}

const NETWORKS = [
  { id: 'base', label: 'Base' },
  { id: 'eth', label: 'Ethereum' },
  { id: 'solana', label: 'Solana' },
  { id: 'bsc', label: 'BNB Chain' },
  { id: 'arbitrum', label: 'Arbitrum' },
  { id: 'polygon_pos', label: 'Polygon' },
];

const SF = { fontFamily: 'Arial,sans-serif' };

const ALL_SLOTS: SlotDefinition[] = [
  { id: 'lead',     label: 'Lead Story',        required: true },
  { id: 'negative', label: 'Secondary Left',    required: true },
  { id: 'positive', label: 'Secondary Right',   required: true },
  { id: 'channel',  label: 'Channel Spotlight', required: true },
  // 'token' slot removed — Token Tracker editor handles the TOKENS mid-story block
  // 'editorial' is handled separately via the editorialNote textarea in Issue Options
];

// Default all story slots enabled
const DEFAULT_ENABLED_SLOTS: Record<'lead' | 'negative' | 'positive' | 'channel', boolean> = {
  lead: true, negative: true, positive: true, channel: true,
};

// ── Mints Diagnostic Panel ────────────────────────────────────────────────────
function MintsDiagnostic() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ count: number; mints: Array<{ serial: string; fid: number; username: string; headline: string; mintedAt: string; tokenId: string | null }> } | null>(null);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/admin/mints');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'fetch failed');
      setData(json);
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }

  return (
    <div className={`border-2 mb-2 ${theme.border}`}>
      <button
        className={`w-full flex items-center justify-between px-2 py-1 border-b ${theme.borderLight} ${theme.fillLight}`}
        onClick={() => { setOpen((v) => !v); if (!data) load(); }}
      >
        <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>🗃 Mints Database ({data?.count ?? '?'})</p>
        <span className="text-[10px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-2">
          <div className="flex gap-1 mb-2">
            <button onClick={load} disabled={loading}
              className={`px-2 py-1 text-[9px] font-bold border min-h-[28px] ${theme.borderLight} disabled:opacity-40`} style={SF}>
              {loading ? '⏳' : '↻ Refresh'}
            </button>
            {data && <p className="text-[9px] self-center" style={SF}>{data.count} mint record{data.count !== 1 ? 's' : ''} in DB</p>}
          </div>
          {err && <p className="text-[9px] text-red-500 mb-2" style={SF}>{err}</p>}
          {data?.count === 0 && (
            <p className={`text-[9px] text-center py-3 ${theme.mutedClass}`} style={SF}>
              No mints in database yet. Records are saved when the mint API succeeds.
            </p>
          )}
          {(data?.mints ?? []).map((m) => (
            <div key={m.serial} className={`border mb-1 p-2 ${theme.borderLight}`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black" style={SF}>{m.serial}</span>
                <span className={`text-[8px] ${theme.mutedClass}`} style={SF}>
                  {m.tokenId ? `#${m.tokenId}` : '⏳ pending'}
                </span>
              </div>
              <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>@{m.username} · FID {m.fid}</p>
              <p className="text-[8px] leading-snug truncate" style={SF}>{m.headline}</p>
              <p className={`text-[7px] ${theme.mutedClass} text-right`} style={SF}>
                {new Date(m.mintedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Generated Image Collection ─────────────────────────────────────────────────
type GeneratedImageRow = {
  id: number;
  fid: number;
  username: string;
  displayName: string;
  imageUrl: string;
  headline: string;
  edition: string;
  wasMinted: boolean;
  mintSerial: string | null;
  generatedAt: string;
};

function ImageCollection() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<GeneratedImageRow[]>([]);
  const [stats, setStats] = useState<{ total: number; minted: number; unminted: number } | null>(null);
  const [filter, setFilter] = useState<'all' | '420-special' | 'standard'>('all');
  const [err, setErr] = useState('');

  async function load(edition?: string) {
    setLoading(true); setErr('');
    try {
      const url = edition && edition !== 'all'
        ? `/api/admin/generated-images?edition=${edition}`
        : '/api/admin/generated-images';
      const [imgRes, statsRes] = await Promise.all([
        fetch(url),
        fetch('/api/admin/generated-images?stats=1'),
      ]);
      const imgData = await imgRes.json();
      const statsData = await statsRes.json();
      if (!imgRes.ok) throw new Error(imgData.error ?? 'fetch failed');
      setImages(imgData.images ?? []);
      setStats(statsData);
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }

  function applyFilter(f: typeof filter) {
    setFilter(f);
    load(f === 'all' ? undefined : f);
  }

  return (
    <div className={`border-2 mb-2 ${theme.border}`}>
      <button
        className={`w-full flex items-center justify-between px-2 py-1 border-b ${theme.borderLight} ${theme.fillLight}`}
        onClick={() => { setOpen((v) => !v); if (!images.length && !err) load(); }}
      >
        <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
          🎨 Image Collection ({stats?.total ?? '?'} generated · {stats?.minted ?? '?'} minted)
        </p>
        <span className="text-[10px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-2">
          {/* Filter row */}
          <div className="flex gap-1 mb-2 flex-wrap">
            {(['all', 'standard', '420-special'] as const).map((f) => (
              <button
                key={f}
                onClick={() => applyFilter(f)}
                className={`px-2 py-[3px] text-[8px] font-bold border min-h-[24px] transition-colors ${
                  filter === f ? `${theme.fill} ${theme.fillText} ${theme.border}` : `${theme.borderLight} ${theme.mutedClass}`
                }`}
                style={SF}
              >
                {f === 'all' ? 'All' : f === '420-special' ? '🌿 4/20 Special' : 'Standard'}
              </button>
            ))}
            <button onClick={() => load(filter === 'all' ? undefined : filter)} disabled={loading}
              className={`ml-auto px-2 py-1 text-[9px] font-bold border min-h-[24px] ${theme.borderLight} disabled:opacity-40`} style={SF}>
              {loading ? '⏳' : '↻'}
            </button>
          </div>

          {err && <p className="text-[9px] text-red-500 mb-2" style={SF}>{err}</p>}

          {stats && (
            <div className={`flex gap-3 px-2 py-1 mb-2 border ${theme.borderLight} ${theme.fillLight}`}>
              <span className="text-[9px] font-bold" style={SF}>{stats.total} total</span>
              <span className="text-[9px] text-green-600 font-bold" style={SF}>{stats.minted} minted</span>
              <span className={`text-[9px] ${theme.mutedClass}`} style={SF}>{stats.unminted} not yet minted</span>
            </div>
          )}

          {images.length === 0 && !loading && !err && (
            <p className={`text-[9px] text-center py-4 ${theme.mutedClass}`} style={SF}>
              No generated images yet — they appear here as users generate personal covers.
            </p>
          )}

          {/* Image grid */}
          <div className="grid grid-cols-2 gap-2">
            {images.map((img) => (
              <div key={img.id} className={`border ${theme.borderLight} overflow-hidden`}>
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt={img.headline}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  {/* Edition badge */}
                  {img.edition === '420-special' && (
                    <span className="absolute top-1 right-1 bg-green-600 text-white text-[7px] font-bold px-1 py-[1px]" style={SF}>
                      🌿 4/20
                    </span>
                  )}
                  {/* Minted badge */}
                  {img.wasMinted && (
                    <span className="absolute bottom-1 left-1 bg-black text-white text-[7px] font-bold px-1 py-[1px]" style={SF}>
                      ✓ MINTED
                    </span>
                  )}
                </div>
                <div className={`p-1 ${theme.bg}`}>
                  <p className="text-[8px] font-bold leading-snug truncate" style={SF}>@{img.username}</p>
                  <p className={`text-[7px] leading-snug truncate ${theme.mutedClass}`} style={SF}>{img.headline}</p>
                  {img.mintSerial && (
                    <p className={`text-[7px] font-bold truncate`} style={{ ...SF, color: '#00aa44' }}>{img.mintSerial}</p>
                  )}
                  <p className={`text-[6px] text-right mt-[2px] ${theme.mutedClass}`} style={SF}>
                    {new Date(img.generatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Theme preview colors (inline, no import from settings-panel)
const THEME_PREVIEWS: Record<ThemeId, { bg: string; ink: string; accent: string; gradient?: string }> = {
  bw:         { bg: '#ffffff', ink: '#000000', accent: '#000000' },
  inverted:   { bg: '#000000', ink: '#ffffff', accent: '#ffffff' },
  cream:      { bg: '#f5f0e8', ink: '#2c1a0e', accent: '#7a5c3a' },
  purple:     { bg: '#ffffff', ink: '#4c1d95', accent: '#4c1d95' },
  terminal:   { bg: '#0d0d0d', ink: '#00ff41', accent: '#00ff41' },
  sepia:      { bg: '#1a1008', ink: '#d4a96a', accent: '#d4a96a' },
  telegraph:  { bg: '#f0f4f8', ink: '#0a2540', accent: '#0a2540' },
  crimson:    { bg: '#faf5f5', ink: '#8b0000', accent: '#8b0000' },
  rainbow:    { bg: '#ffffff', ink: '#1a0533', accent: '#7c3aed', gradient: 'linear-gradient(135deg, #ff0080, #ff4500, #ffd700, #00c851, #00bcd4, #7c3aed)' },
  sunset:     { bg: '#fff7f0', ink: '#c2410c', accent: '#c2410c', gradient: 'linear-gradient(160deg, #fff7f0 0%, #ffd0aa 100%)' },
  four20:     { bg: '#f0f7e6', ink: '#2d6a0a', accent: '#2d6a0a', gradient: 'linear-gradient(135deg, #f0f7e6 0%, #d8f0b8 100%)' },
};

export function CuratorDashboard() {
  const { theme, setThemeId } = useTheme();
  const { feed } = useDailyFeed();
  const issue = useCurrentIssue();
  const { data: farcasterUser } = useFarcasterUser();
  const viewer = useViewer();
  const [picks, setPicks] = useState<Picks>({});
  const [writeIns, setWriteIns] = useState<WriteIns>({});
  const [writeInMode, setWriteInMode] = useState<WriteInMode>({});
  const [published, setPublished] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [resettingStats, setResettingStats] = useState(false);
  const [statsResetDone, setStatsResetDone] = useState(false);
  const [resettingArchive, setResettingArchive] = useState(false);
  const [archiveResetDone, setArchiveResetDone] = useState(false);

  // Feed refresh
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);

  // Color scheme (moved from Settings)
  const [colorScheme, setColorSchemeLocal] = useState<ThemeId>('bw');

  // Airdrop state
  const [airdropEnabled, setAirdropEnabledState] = useState(false);
  const [airdropIssues, setAirdropIssues] = useState<{ issueId: number; issueNumber: number; date: string; count: number }[]>([]);
  const [airdropWhitelistData, setAirdropWhitelistData] = useState<AirdropEntry[]>([]);
  const [airdropLoadingId, setAirdropLoadingId] = useState<number | null>(null);
  const [showAirdropPanel, setShowAirdropPanel] = useState(false);

  // AI expand
  const [expanding, setExpanding] = useState<Slot | null>(null);

  // Subscriber count + notify state
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');

  // ── Paper Settings (Paywall, Paper ID) ──────────────────────
  const { settings: paperSettings, isSaving: paperSaving, save: savePaper } = usePaperSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen]       = useState(false);
  // Paywall
  const [readPrice, setReadPrice] = useState('0.01');
  const [mintPrice, setMintPrice] = useState('0.041');
  const [rwacRead, setRwacRead] = useState('4141');
  const [rwacMint, setRwacMint] = useState('41041');
  const [enabledCurrencies, setEnabledCurrencies] = useState<string[]>(['USDC', 'ETH', '$RWACu']);
  // Airdrop default
  const [airdropDefault, setAirdropDefault] = useState(false);
  // Paper Identity
  const [paperName, setPaperName] = useState('The Daily Miscellany: A Compendium Of Interesting Things');
  const [editorHandle, setEditorHandle] = useState('@mj41fantastican');
  const [paperTagline, setPaperTagline] = useState("All the news that's fit to cast");
  const [issuePrice, setIssuePrice] = useState('$0.041');
  const [websiteUrl, setWebsiteUrl] = useState('dailyfarcaster.fc');
  const [channelUrl, setChannelUrl] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Custom section labels, editorial note, byline
  const [leftLabel, setLeftLabel] = useState('NEWS');
  const [rightLabel, setRightLabel] = useState('ANALYSIS');
  const [editorialNote, setEditorialNote] = useState('');
  const [editorByline, setEditorByline] = useState('@mj41fantastican');

  // Which story slots are enabled for this issue
  const [enabledSlots, setEnabledSlots] = useState<Record<'lead' | 'negative' | 'positive' | 'channel', boolean>>(DEFAULT_ENABLED_SLOTS);

  function toggleSlot(slot: 'lead' | 'negative' | 'positive' | 'channel') {
    setEnabledSlots((prev) => ({ ...prev, [slot]: !prev[slot] }));
  }

  // Write-in first mode per slot
  const [writeFirst, setWriteFirst] = useState<Partial<Record<Slot, boolean>>>({});

  // Active news category tab per story slot ('farcaster' | NewsCategory)
  const [storyTab, setStoryTab] = useState<Record<'lead' | 'negative' | 'positive', 'farcaster' | NewsCategory>>({
    lead: 'farcaster',
    negative: 'farcaster',
    positive: 'farcaster',
  });

  // News story picks (story data for assembly at publish)
  const [newsPicks, setNewsPicks] = useState<Partial<Record<Slot, NewsStory>>>({});

  // Token Tracker — 6 editable slots for the front-page TOKENS block
  const [trackerTokens, setTrackerTokens] = useState<TrackerToken[]>(
    Array.from({ length: 6 }, (_, i) => ({
      id: `slot-${i}`,
      symbol: '',
      name: '',
      contractAddress: '',
      network: 'base',
      price: '—',
      change24h: '—',
    })),
  );

  // GeckoTerminal token lookup
  const [tokenCA, setTokenCA] = useState('');
  const [tokenNetwork, setTokenNetwork] = useState('base');
  const [tokenLookupLoading, setTokenLookupLoading] = useState(false);
  const [tokenLookupError, setTokenLookupError] = useState('');
  const [geckoToken, setGeckoToken] = useState<GeckoTokenData | null>(null);

  // Token search autocomplete
  const [tokenSearchResults, setTokenSearchResults] = useState<{
    id: string; name: string; symbol: string; imageUrl: string | null;
    contractAddress: string | null; network: string; rank: number;
  }[]>([]);
  const [tokenSearchTimer, setTokenSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleTokenInputChange(val: string) {
    setTokenCA(val);
    setGeckoToken(null);
    setTokenLookupError('');
    // If it looks like a CA (starts with 0x, >10 chars) skip search
    if (val.startsWith('0x') && val.length > 10) {
      setTokenSearchResults([]);
      return;
    }
    // Debounced ticker/name search
    if (tokenSearchTimer) clearTimeout(tokenSearchTimer);
    if (val.trim().length < 2) { setTokenSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/token-search?q=${encodeURIComponent(val.trim())}&network=${tokenNetwork}`);
        const data = await res.json();
        setTokenSearchResults(data.results ?? []);
      } catch { setTokenSearchResults([]); }
    }, 350);
    setTokenSearchTimer(timer);
  }

  // Editor preview mode — shows the front page as a reader would see it
  const [showReaderPreview, setShowReaderPreview] = useState(false);
  // 'locked' = unpaid reader, 'unlocked' = paid reader
  const [previewPaidMode, setPreviewPaidMode] = useState<'locked' | 'unlocked'>('locked');

  // Token manual write-in mode (separate from gecko lookup)
  const [tokenManualMode, setTokenManualMode] = useState(false);

  // Featured app write-in (legacy — kept for schedule/publish compat)
  const [miniAppWriteIn, setMiniAppWriteIn] = useState<MiniAppWriteIn>({ name: '', author: '', desc: '', url: '' });
  const [miniAppWriteInMode, setMiniAppWriteInMode] = useState(false);

  // Mini App Showcase — curated selection for briefs strip
  const [selectedApps, setSelectedApps] = useState<AppBrief[]>([]);

  // Active widgets — which live data panels show on the front page
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>(['art', 'weather', 'cat', 'anilist']);
  const [widgetSaving, setWidgetSaving] = useState(false);

  // Channel log line
  const [channelLogLine, setChannelLogLine] = useState('');
  const [logLineGenerating, setLogLineGenerating] = useState(false);

  async function handleGenerateLogLine() {
    if (!lookedUpChannel) return;
    setLogLineGenerating(true);
    try {
      const res = await fetch('/api/ai-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'channel-logline',
          context: {
            channelName: lookedUpChannel.id,
            description: lookedUpChannel.description,
            pinnedCast: lookedUpChannel.pinnedCastText ?? '',
            followerCount: String(lookedUpChannel.followerCount),
          },
        }),
      });
      const data = await res.json();
      if (data.logline) setChannelLogLine(data.logline);
    } catch { /* silently fail */ }
    setLogLineGenerating(false);
  }

  // Channel quick-lookup (write-in via /slug)
  const [channelSlug, setChannelSlug] = useState('');
  const [channelLookupLoading, setChannelLookupLoading] = useState(false);
  const [channelLookupError, setChannelLookupError] = useState('');
  const [lookedUpChannel, setLookedUpChannel] = useState<{
    id: string; name: string; description: string; imageUrl: string | null;
    followerCount: number; url: string;
    pinnedCastText: string | null; pinnedCastAuthor: string | null;
  } | null>(null);

  async function handleChannelLookup() {
    const slug = channelSlug.trim().replace(/^\//, '');
    if (!slug || channelLookupLoading) return;
    setChannelLookupLoading(true);
    setChannelLookupError('');
    setLookedUpChannel(null);
    try {
      const res = await fetch(`/api/channel-lookup?id=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (!res.ok) { setChannelLookupError(data.error ?? 'Channel not found'); return; }
      setLookedUpChannel(data);
      // Auto-fill write-in and mark slot filled
      const desc = [
        data.description ? data.description.slice(0, 160) : `/${data.id} is a Farcaster channel.`,
        data.pinnedCastText ? `Pinned: "${data.pinnedCastText.slice(0, 120)}"` : '',
        `${data.followerCount.toLocaleString()} followers`,
      ].filter(Boolean).join(' ');
      setWriteIns((w) => ({
        ...w,
        channel: {
          headline: `Channel Spotlight: /${data.id} — ${data.name}`,
          byline: `${data.followerCount.toLocaleString()} followers · Farcaster`,
          body: desc,
        },
      }));
      setWriteInMode((m) => ({ ...m, channel: true }));
      setPicks((p) => ({ ...p, channel: `lookup-${data.id}` }));
    } catch {
      setChannelLookupError('Lookup failed — check the channel name');
    } finally {
      setChannelLookupLoading(false);
    }
  }

  // Scheduling
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduling, setScheduling] = useState(false);
  const [scheduledIssues, setScheduledIssues] = useState<{ id: number; scheduledFor: Date | null; issueNumber: number }[]>([]);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Load stats + scheduled issues on mount
  useEffect(() => {
    setStatsLoading(true);
    getIssueStats()
      .then((s) => { setStats(s); setStatsLoading(false); })
      .catch(() => setStatsLoading(false));
    getScheduledIssues()
      .then((rows) => setScheduledIssues(rows.map((r) => ({ id: r.id, scheduledFor: r.scheduledFor, issueNumber: r.issueNumber }))))
      .catch(() => {});
    // Default schedule date to today
    const today = new Date();
    setScheduleDate(today.toISOString().split('T')[0]);
    // Load current color scheme + active widgets from DB
    fetch('/api/theme', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { colorScheme?: string; activeWidgets?: string[] }) => {
        const id = (d.colorScheme ?? 'bw') as ThemeId;
        if (THEMES[id]) setColorSchemeLocal(id);
        if (d.activeWidgets?.length) setActiveWidgets(d.activeWidgets as WidgetId[]);
      })
      .catch(() => {});
    // Load airdrop issues
    getAirdropIssues().then(setAirdropIssues).catch(() => {});
    // Load subscriber count
    fetch('/api/notify-subscribers', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setSubscriberCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  // Sync paper settings from DB when loaded
  useEffect(() => {
    if (!paperSettings) return;
    setReadPrice(paperSettings.readPriceUsdc ?? '0.01');
    setMintPrice(paperSettings.mintPriceUsdc ?? '0.041');
    setRwacRead(paperSettings.rwacReadAmount ?? '4141');
    setRwacMint(paperSettings.rwacMintAmount ?? '41041');
    setEnabledCurrencies((paperSettings.enabledCurrencies ?? 'USDC,ETH,$RWACu').split(','));
    setAirdropDefault(paperSettings.airdropDefault ?? false);
    setPaperName(paperSettings.paperName ?? 'The Daily Miscellany: A Compendium Of Interesting Things');
    setEditorHandle(paperSettings.editorHandle ?? '@mj41fantastican');
    setPaperTagline(paperSettings.tagline ?? "All the news that's fit to cast");
    setIssuePrice(paperSettings.coverPrice ?? '$0.041');
    setWebsiteUrl(paperSettings.websiteUrl ?? 'dailyfarcaster.fc');
    setChannelUrl(paperSettings.channelUrl ?? '');
  }, [paperSettings]);

  function isSlotFilled(slot: Slot): boolean {
    if (writeInMode[slot]) {
      const wi = writeIns[slot];
      return !!(wi?.headline && wi?.body);
    }
    // News story pick (for lead/negative/positive when on a news category tab)
    if (newsPicks[slot]) return true;
    return !!picks[slot];
  }

  function pickNews(slot: 'lead' | 'negative' | 'positive', story: NewsStory) {
    setNewsPicks((p) => ({ ...p, [slot]: story }));
    // Clear Farcaster pick for this slot
    setPicks((p) => { const n = { ...p }; delete n[slot]; return n; });
  }

  function pickFarcaster(slot: Slot, id: string) {
    pick(slot, id);
    // Clear news pick for this slot
    setNewsPicks((p) => { const n = { ...p }; delete n[slot]; return n; });
  }

  const activeSlots = ALL_SLOTS.filter((s) => enabledSlots[s.id as keyof typeof enabledSlots] !== false);
  const filledCount = activeSlots.filter((s) => s.required && isSlotFilled(s.id)).length;
  const requiredCount = activeSlots.filter((s) => s.required).length;
  const ready = filledCount === requiredCount;

  function pick(slot: Slot, id: string) {
    setPicks((p) => ({ ...p, [slot]: id }));
  }

  function toggleWriteIn(slot: Slot) {
    setWriteInMode((m) => ({ ...m, [slot]: !m[slot] }));
  }

  function updateWriteIn(slot: Slot, field: 'headline' | 'body' | 'byline', val: string) {
    setWriteIns((w) => ({
      ...w,
      [slot]: { headline: '', body: '', byline: '', ...w[slot], [field]: val },
    }));
  }

  function autoSelect() {
    setAutoMode(true);
    setTimeout(() => {
      const negCast = feed.trendingCasts.find((c) => c.signal === 'negative');
      const posCast = feed.trendingCasts.find((c) => c.signal === 'positive');
      setPicks({
        lead:     feed.trendingCasts[0]?.id ?? '',
        negative: negCast?.id ?? feed.trendingCasts[2]?.id ?? '',
        positive: posCast?.id ?? feed.trendingCasts[1]?.id ?? '',
        channel:  feed.topChannels[0]?.id ?? '',
      });
      // Auto-fill tracker tokens from pool if all slots are empty
      setTrackerTokens((prev) => {
        const hasAny = prev.some((t) => t.symbol);
        if (hasAny) return prev;
        return feed.topTokens.slice(0, 6).map((t, i) => ({
          id: `slot-${i}`,
          symbol: t.symbol,
          name: t.symbol,
          contractAddress: t.contractAddress ?? '',
          network: 'base',
          price: t.price,
          change24h: t.change,
          marketCap: t.marketCap,
          volume24h: t.volume24h,
        }));
      });
      // Auto-fill selected apps from feed if none chosen yet
      setSelectedApps((prev) => {
        if (prev.length > 0) return prev;
        return feed.newMiniApps.slice(0, 5).map((a) => ({
          name: a.name, author: a.author, desc: a.desc, url: a.url ?? '',
          tag: 'APPS' as const, appName: a.name, appAuthor: a.author,
          text: `🆕 ${a.name}: ${a.desc}`,
        }));
      });
      setWriteInMode({});
      setNewsPicks({});
      setAutoMode(false);
    }, 900);
  }

  async function handleSchemeSelect(id: ThemeId) {
    setColorSchemeLocal(id);
    setThemeId(id); // live preview immediately
    // Persist to DB
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorScheme: id }),
      });
    } catch { /* non-fatal */ }
  }

  async function handleWidgetToggle(id: WidgetId) {
    const next = activeWidgets.includes(id)
      ? activeWidgets.filter((w) => w !== id)
      : [...activeWidgets, id];
    setActiveWidgets(next);
    setWidgetSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeWidgets: next.join(',') }),
      });
    } catch { /* non-fatal */ }
    finally { setWidgetSaving(false); }
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshDone(false);
    try {
      await refreshFeed();
      setRefreshDone(true);
      setTimeout(() => setRefreshDone(false), 3000);
      // Reload the page to pick up new feed data
      window.location.reload();
    } catch {
      setRefreshing(false);
    }
  }

  async function handleExpandNews(slot: 'lead' | 'negative' | 'positive', story: NewsStory) {
    if (expanding) return;
    setExpanding(slot);
    try {
      const castText = `${story.title}. ${story.description}`;
      const author = story.source;
      const res = await fetch('/api/ai/rewrite-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ castText, author, slot }),
      });
      const article = await res.json();
      if (article.headline) {
        setWriteIns((w) => ({
          ...w,
          [slot]: {
            headline: article.headline,
            byline: article.byline,
            body: article.body,
            sources: [{ label: story.title, url: story.url }, ...(article.sources ?? [])],
          },
        }));
        setWriteInMode((m) => ({ ...m, [slot]: true }));
      }
    } catch {
      // silently fail
    } finally {
      setExpanding(null);
    }
  }

  async function handleExpand(slot: Slot, castText: string, author: string) {
    if (expanding) return;
    setExpanding(slot);
    try {
      const res = await fetch('/api/ai/rewrite-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ castText, author, slot }),
      });
      const article = await res.json();
      if (article.headline) {
        setWriteIns((w) => ({
          ...w,
          [slot]: {
            headline: article.headline,
            byline: article.byline,
            body: article.body,
            sources: article.sources ?? [],
          },
        }));
        setWriteInMode((m) => ({ ...m, [slot]: true }));
      }
    } catch {
      // silently fail — cast text stays as-is
    } finally {
      setExpanding(null);
    }
  }

  async function handleTokenLookup() {
    if (!tokenCA.trim() || tokenLookupLoading) return;
    setTokenLookupLoading(true);
    setTokenLookupError('');
    setGeckoToken(null);
    try {
      const res = await fetch(`/api/gecko-token?network=${tokenNetwork}&ca=${tokenCA.trim().toLowerCase()}`);
      const data = await res.json();
      if (!res.ok) {
        setTokenLookupError(data.error ?? 'Token not found');
        return;
      }
      setGeckoToken(data);
      // Auto-fill the write-in with token data (including name/ticker/CA for display)
      setWriteIns((w) => ({
        ...w,
        token: {
          tokenName: data.name,
          tokenTicker: data.symbol,
          tokenCA: data.contractAddress,
          headline: `${data.symbol} ${data.change24h.startsWith('+') ? '▲' : '▼'} ${data.change24h} — ${data.name} Market Update`,
          byline: `${data.topDex ?? data.network.toUpperCase()} · GeckoTerminal`,
          body: [
            data.projectDescription ? data.projectDescription : `${data.name} (${data.symbol}) is trading on ${data.network.toUpperCase()}.`,
            `Currently priced at ${data.price} — 24h: ${data.change24h} · 1h: ${data.change1h} · 6h: ${data.change6h}.`,
            `Market cap: ${data.marketCap} · FDV: ${data.fdv} · 24h volume: ${data.volume24h}.`,
            `Liquidity: ${data.liquidity} · ${(data.buys24h + data.sells24h).toLocaleString()} txns today (${data.buys24h.toLocaleString()} buys · ${data.sells24h.toLocaleString()} sells).`,
          ].filter(Boolean).join(' '),
          sources: [
            { label: `View ${data.symbol} on GeckoTerminal`, url: `https://www.geckoterminal.com/${data.network}/pools/${data.contractAddress}` },
            ...(data.homepage ? [{ label: `${data.name} official website`, url: data.homepage }] : []),
          ],
        },
      }));
      setWriteInMode((m) => ({ ...m, token: true }));
      setTokenManualMode(false); // gecko data takes priority
      // Also mark as a "pick" so isSlotFilled returns true
      setPicks((p) => ({ ...p, token: `gecko-${tokenCA.trim()}` }));
    } catch (err) {
      setTokenLookupError('Lookup failed — check the contract address');
    } finally {
      setTokenLookupLoading(false);
    }
  }

  function assembleStoryContent(slot: 'lead' | 'negative' | 'positive') {
    const castMap = { lead: picks.lead, negative: picks.negative, positive: picks.positive };
    const writeInMap = { lead: writeIns.lead, negative: writeIns.negative, positive: writeIns.positive };
    const writeInModeMap = { lead: writeInMode.lead, negative: writeInMode.negative, positive: writeInMode.positive };

    const wi = writeInMap[slot];
    const isWriteIn = writeInModeMap[slot];
    const newsStory = newsPicks[slot];
    const castId = castMap[slot];
    const cast = feed.trendingCasts.find((c) => c.id === castId);

    if (isWriteIn && wi?.headline && wi?.body) {
      return {
        headline: wi.headline,
        byline: wi.byline || 'Staff Reporter',
        body: wi.body,
        sources: wi.sources ?? [],
      };
    }
    if (newsStory) {
      return {
        headline: newsStory.title,
        byline: `${newsStory.source} · ${NEWS_CATEGORY_LABELS[newsStory.category]}`,
        body: newsStory.description,
        sources: [{ label: `Read full story on ${newsStory.source}`, url: newsStory.url }],
      };
    }
    return {
      headline: cast?.text ?? '',
      byline: cast ? `${cast.author} · Cast` : 'Staff Reporter',
      body: cast?.text ?? '',
      sources: [],
    };
  }

  function buildTokenTrackerMidStory() {
    const filledSlots = trackerTokens.filter((t) => t.symbol);
    if (filledSlots.length === 0) {
      return { headline: 'Token Tracker', summary: 'No tokens selected' };
    }
    const symbols = filledSlots.slice(0, 3).map((t) => {
      const arrow = t.change24h.startsWith('+') ? '▲' : t.change24h === '—' ? '' : '▼';
      return `${t.symbol} ${arrow}${t.change24h !== '—' ? t.change24h : ''}`.trim();
    });
    return {
      headline: `Token Tracker: ${filledSlots.map((t) => t.symbol).join(', ')}`,
      summary: symbols.join(' · '),
    };
  }

  async function notifySubscribersOnPublish(issueNumber: string, headline: string, _dateStr: string) {
    setNotifying(true);
    setNotifyMsg('');
    try {
      // Notify free subscribers AND paid readers in parallel
      const [subRes, readerRes] = await Promise.allSettled([
        fetch('/api/notify-subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${issueNumber} is out`,
            body: headline.slice(0, 128),
          }),
        }).then((r) => r.json()),
        fetch('/api/notify-readers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${issueNumber} is out`,
            body: headline.slice(0, 128),
          }),
        }).then((r) => r.json()),
      ]);

      const subSent = subRes.status === 'fulfilled' && subRes.value?.ok ? (subRes.value.sent ?? 0) : 0;
      const readerSent = readerRes.status === 'fulfilled' && readerRes.value?.ok ? (readerRes.value.sent ?? 0) : 0;
      const total = subSent + readerSent;
      if (total > 0) {
        setNotifyMsg(`📬 Notified ${total} reader${total !== 1 ? 's' : ''} (${subSent} subscribers + ${readerSent} paid)`);
        setTimeout(() => setNotifyMsg(''), 8000);
      }
    } catch {
      // non-fatal
    } finally {
      setNotifying(false);
    }
  }

  async function handlePublish() {
    if (!ready || publishing) return;
    setPublishing(true);
    try {
      const nextNum = await getNextIssueNumber();
      const channelPick = feed.topChannels.find((c) => c.id === picks.channel);

      const lead = assembleStoryContent('lead');
      const neg = assembleStoryContent('negative');
      const pos = assembleStoryContent('positive');

      const tokenMid = buildTokenTrackerMidStory();

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      await publishIssue({
        issueNumber: nextNum,
        vol: 1,
        date: dateStr,
        autoPublished: false,
        leadHeadline: lead.headline,
        leadByline: lead.byline,
        leadBody: lead.body,
        leadSources: lead.sources,
        secondaryLeftLabel: leftLabel || 'NEWS',
        secondaryLeftHeadline: neg.headline,
        secondaryLeftSummary: neg.body,
        secondaryLeftSources: neg.sources,
        secondaryRightLabel: rightLabel || 'ANALYSIS',
        secondaryRightHeadline: pos.headline,
        secondaryRightSummary: pos.body,
        secondaryRightSources: pos.sources,
        midStories: [
          { label: 'ON-CHAIN', headline: channelPick ? `${channelPick.name} Spotlight` : 'Channel Update', summary: channelPick ? `${channelPick.members} members · ${channelPick.casts24h} casts today` : '' },
          { label: 'NETWORK', headline: `Farcaster Today: ${feed.networkStats.dau} DAU`, summary: `${feed.networkStats.dauChange} · ${feed.networkStats.castsToday} casts` },
          { label: 'TOKENS', headline: tokenMid.headline, summary: tokenMid.summary },
        ],
        trackerTokens: trackerTokens.filter((t) => t.symbol),
        airdropEnabled,
        briefs: selectedApps.length > 0
          ? selectedApps.slice(0, 5).map((a) => ({ text: a.text, tag: a.tag, url: a.url || undefined, appName: a.appName, appAuthor: a.appAuthor }))
          : [
              ...(miniAppWriteInMode && miniAppWriteIn.name.trim()
                ? [{ text: `🆕 ${miniAppWriteIn.name}: ${miniAppWriteIn.desc}`, tag: 'APPS', url: miniAppWriteIn.url || undefined, appName: miniAppWriteIn.name, appAuthor: miniAppWriteIn.author || 'Unknown' }]
                : []),
              ...feed.newMiniApps.slice(0, miniAppWriteInMode && miniAppWriteIn.name.trim() ? 4 : 5).map((app) => ({ text: `🆕 ${app.name}: ${app.desc}`, tag: 'APPS', url: app.url, appName: app.name, appAuthor: app.author })),
            ],
        teasers: MOCK_TEASERS,
        editorialNote: editorialNote.trim() || undefined,
        editorByline: editorByline.trim() || undefined,
      });
      setPublished(true);
      // Notify subscribers after successful publish
      const issueLabel = `Issue #${nextNum}`;
      void notifySubscribersOnPublish(issueLabel, lead.headline, dateStr);
    } catch (err) {
      console.error('Publish failed:', err);
    } finally {
      setPublishing(false);
    }
  }

  async function handleSchedule() {
    if (!ready || scheduling || !scheduleDate || !scheduleTime) return;
    setScheduling(true);
    try {
      const nextNum = await getNextIssueNumber();
      const channelPick = feed.topChannels.find((c) => c.id === picks.channel);

      const lead = assembleStoryContent('lead');
      const neg = assembleStoryContent('negative');
      const pos = assembleStoryContent('positive');

      const tokenMidS = buildTokenTrackerMidStory();

      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}:00`);
      const dateStr = scheduledFor.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      const result = await scheduleIssue({
        issueNumber: nextNum,
        vol: 1,
        date: dateStr,
        autoPublished: false,
        scheduledFor,
        leadHeadline: lead.headline,
        leadByline: lead.byline,
        leadBody: lead.body,
        leadSources: lead.sources,
        secondaryLeftLabel: leftLabel || 'NEWS',
        secondaryLeftHeadline: neg.headline,
        secondaryLeftSummary: neg.body,
        secondaryLeftSources: neg.sources,
        secondaryRightLabel: rightLabel || 'ANALYSIS',
        secondaryRightHeadline: pos.headline,
        secondaryRightSummary: pos.body,
        secondaryRightSources: pos.sources,
        midStories: [
          { label: 'ON-CHAIN', headline: channelPick ? `${channelPick.name} Spotlight` : 'Channel Update', summary: channelPick ? `${channelPick.members} members · ${channelPick.casts24h} casts today` : '' },
          { label: 'NETWORK', headline: `Farcaster Today: ${feed.networkStats.dau} DAU`, summary: `${feed.networkStats.dauChange} · ${feed.networkStats.castsToday} casts` },
          { label: 'TOKENS', headline: tokenMidS.headline, summary: tokenMidS.summary },
        ],
        trackerTokens: trackerTokens.filter((t) => t.symbol),
        airdropEnabled,
        briefs: selectedApps.length > 0
          ? selectedApps.slice(0, 5).map((a) => ({ text: a.text, tag: a.tag, url: a.url || undefined, appName: a.appName, appAuthor: a.appAuthor }))
          : [
              ...(miniAppWriteInMode && miniAppWriteIn.name.trim()
                ? [{ text: `🆕 ${miniAppWriteIn.name}: ${miniAppWriteIn.desc}`, tag: 'APPS', url: miniAppWriteIn.url || undefined, appName: miniAppWriteIn.name, appAuthor: miniAppWriteIn.author || 'Unknown' }]
                : []),
              ...feed.newMiniApps.slice(0, miniAppWriteInMode && miniAppWriteIn.name.trim() ? 4 : 5).map((app) => ({ text: `🆕 ${app.name}: ${app.desc}`, tag: 'APPS', url: app.url, appName: app.name, appAuthor: app.author })),
            ],
        teasers: MOCK_TEASERS,
        editorialNote: editorialNote.trim() || undefined,
        editorByline: editorByline.trim() || undefined,
      });
      if (result.success && result.issue) {
        setScheduledIssues((prev) => [...prev, { id: result.issue!.id, scheduledFor, issueNumber: nextNum }]);
        setShowScheduler(false);
        setPublished(true);
      }
    } catch (err) {
      console.error('Schedule failed:', err);
    } finally {
      setScheduling(false);
    }
  }

  // ── PUBLISHED STATE ──
  if (published) {
    return (
      <div className={`p-6 text-center ${theme.bg} ${theme.text}`} style={SF}>
        <div className="text-4xl mb-3">{scheduledIssues.length > 0 ? '📅' : '🗞️'}</div>
        <p className="text-[13px] font-black uppercase tracking-widest mb-1">
          {scheduledIssues.length > 0 ? 'Issue Scheduled!' : 'Issue Published!'}
        </p>
        <p className={`text-[10px] mb-4 ${theme.mutedClass}`}>
          {scheduledIssues.length > 0
            ? `Goes live ${new Date(scheduledIssues[scheduledIssues.length - 1]?.scheduledFor ?? '').toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
            : 'Live on dailyfarcaster.fc · Paywall active'}
        </p>
        <div className={`border p-2 text-left mb-4 ${theme.borderLight}`}>
          <p className="text-[9px] font-black uppercase tracking-widest mb-2">Your selections:</p>
          {ALL_SLOTS.filter((s) => isSlotFilled(s.id)).map((s) => (
            <p key={s.id} className={`text-[9px] mb-1 ${theme.mutedClass}`}>
              ✓ {s.label}:{' '}
              <span className="font-bold">{writeInMode[s.id] ? 'written in' : 'picked'}</span>
            </p>
          ))}
        </div>
        <Button
          className="w-full"
          onClick={() => {
            setPublished(false);
            setPicks({});
            setWriteIns({});
            setWriteInMode({});
          }}
        >
          Start Tomorrow&apos;s Issue
        </Button>
      </div>
    );
  }

  // ── READER PREVIEW OVERLAY ──
  if (showReaderPreview) {
    return (
      <div className="relative h-full flex flex-col overflow-hidden">
        {/* Sticky banner */}
        <div className="shrink-0 px-2 py-1 z-10" style={{ background: '#1e3a5f' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white" style={SF}>
              👁 Editor Preview
            </p>
            <button
              onClick={() => setShowReaderPreview(false)}
              className="text-[9px] font-black uppercase tracking-wide px-2 py-1 bg-white text-black min-h-[28px]"
              style={SF}
            >
              ✕ Exit
            </button>
          </div>
          {/* Paid / Unpaid toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setPreviewPaidMode('locked')}
              className="flex-1 py-1 text-[8px] font-black uppercase tracking-widest border min-h-[28px]"
              style={{
                ...SF,
                background: previewPaidMode === 'locked' ? '#ef4444' : 'transparent',
                color: '#fff',
                borderColor: previewPaidMode === 'locked' ? '#ef4444' : '#ffffff60',
              }}
            >
              🔒 Unpaid Reader
            </button>
            <button
              onClick={() => setPreviewPaidMode('unlocked')}
              className="flex-1 py-1 text-[8px] font-black uppercase tracking-widest border min-h-[28px]"
              style={{
                ...SF,
                background: previewPaidMode === 'unlocked' ? '#16a34a' : 'transparent',
                color: '#fff',
                borderColor: previewPaidMode === 'unlocked' ? '#16a34a' : '#ffffff60',
              }}
            >
              ✓ Paid Reader
            </button>
          </div>
        </div>
        {/* Front page — previewMode=true overrides paywall; previewUnlocked controls paid/unpaid */}
        <div className="flex-1 overflow-y-auto" key={previewPaidMode}>
          <FrontPage previewMode previewUnlocked={previewPaidMode === 'unlocked'} />
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto ${theme.bg} ${theme.text}`} style={SF}>
      <div className="px-2 py-2">

        {/* ── HEADER ── */}
        <div className={`border-2 mb-2 p-2 ${theme.border}`}>
          <div className="flex justify-between items-center mb-1">
            <p className="text-[11px] font-black uppercase tracking-widest">Editor Dashboard</p>
            <span className={`text-[9px] px-2 py-[2px] uppercase tracking-wide ${theme.fill} ${theme.fillText}`}>
              🔐 Private
            </span>
          </div>
          <div className={`flex justify-between items-center text-[9px] ${theme.mutedClass}`}>
            <span>{issue.metadata.date}</span>
            <span>⏰ {feed.deadline}</span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`text-[9px] font-bold uppercase tracking-wide px-2 py-[3px] border min-h-[28px] active:opacity-70 disabled:opacity-50 ${theme.border}`}
              style={SF}
            >
              {refreshing ? '⏳' : refreshDone ? '✓ Fresh' : '🔄 Refresh'}
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-2">
            <div className={`flex justify-between text-[9px] mb-1`}>
              <span className={theme.mutedClass}>Slots filled</span>
              <span className="font-bold">{filledCount}/{requiredCount} required</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${theme.fillLight}`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${theme.fill}`}
                style={{ width: `${(filledCount / requiredCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── PREVIEW BUTTON ── */}
        <button
          onClick={() => setShowReaderPreview(true)}
          className={`w-full mb-2 py-2 text-[10px] font-bold uppercase tracking-widest border-2 min-h-[40px] active:opacity-70 ${theme.border} ${theme.text}`}
          style={{ ...SF, borderStyle: 'dashed' }}
        >
          👁 Preview as Reader
        </button>

        {/* ── SUBSCRIBER BADGE ── */}
        {subscriberCount !== null && subscriberCount > 0 && (
          <div className={`flex items-center gap-2 mb-1 px-2 py-[5px] border ${theme.borderLight} ${theme.fillLight}`}>
            <span className="text-[11px]">📬</span>
            <p className={`text-[9px] font-bold flex-1`} style={SF}>
              {subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''} will be notified on publish
            </p>
            {notifying && <span className={`text-[8px] ${theme.mutedClass}`} style={SF}>Sending…</span>}
            {notifyMsg && <span className="text-[8px] text-green-600 font-bold" style={SF}>{notifyMsg}</span>}
          </div>
        )}

        {/* ── ACTION ROW ── */}
        <div className="flex gap-1 mb-2">
          <button
            onClick={autoSelect}
            className={`flex-1 border-2 py-2 text-[10px] font-bold uppercase tracking-wide text-center min-h-[44px] active:opacity-70 ${theme.border} ${theme.fill} ${theme.fillText}`}
          >
            {autoMode ? '⚙️ Selecting...' : '⚡ Auto-Select All'}
          </button>
          <button
            onClick={() => ready && handlePublish()}
            className={`flex-1 border-2 py-2 text-[10px] font-bold uppercase tracking-wide text-center min-h-[44px] transition-all active:opacity-70 ${
              ready
                ? 'bg-green-600 text-white border-green-700'
                : `${theme.border} ${theme.fill} ${theme.fillText} opacity-50`
            }`}
          >
            {publishing ? '📰 Publishing...' : ready ? '🗞 Publish Now' : `${requiredCount - filledCount} slots left`}
          </button>
          <button
            onClick={() => ready && setShowScheduler((v) => !v)}
            className={`flex-1 border-2 py-2 text-[10px] font-bold uppercase tracking-wide text-center min-h-[44px] transition-all active:opacity-70 ${
              ready
                ? showScheduler
                  ? `bg-blue-600 text-white border-blue-700`
                  : `border-blue-600 text-blue-700 bg-blue-50`
                : `${theme.border} ${theme.fill} ${theme.fillText} opacity-50`
            }`}
          >
            🕐 Schedule
          </button>
        </div>

        {/* ── SCHEDULER PANEL ── */}
        {showScheduler && ready && (
          <div className={`border-2 mb-2 ${theme.border}`}>
            <div className={`px-2 py-1 border-b flex justify-between items-center ${theme.borderLight} bg-blue-50`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-800" style={SF}>
                🕐 Schedule Publication
              </p>
              <button onClick={() => setShowScheduler(false)} className="text-[10px] text-blue-600 font-bold">✕</button>
            </div>
            <div className="p-2 bg-blue-50 space-y-3">
              <p className="text-[9px] text-blue-700 leading-snug" style={SF}>
                Pick a date and time — the issue goes live automatically.
              </p>

              {/* Date picker */}
              <div>
                <label className="text-[8px] uppercase tracking-widest block mb-1 text-blue-800 font-bold" style={SF}>
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full border-2 border-blue-300 px-2 py-2 text-[11px] text-black bg-white outline-none min-h-[44px]"
                  style={SF}
                />
              </div>

              {/* Preset times */}
              <div>
                <label className="text-[8px] uppercase tracking-widest block mb-1 text-blue-800 font-bold" style={SF}>
                  Time
                </label>
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {[
                    { label: 'Morning', time: '07:00' },
                    { label: 'Midday', time: '12:00' },
                    { label: 'Evening', time: '18:00' },
                    { label: 'Night', time: '21:00' },
                  ].map((preset) => (
                    <button
                      key={preset.time}
                      onClick={() => setScheduleTime(preset.time)}
                      className={`py-2 text-[9px] font-bold border-2 text-center min-h-[44px] transition-all ${
                        scheduleTime === preset.time
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'border-blue-300 text-blue-700 bg-white'
                      }`}
                      style={SF}
                    >
                      <div>{preset.label}</div>
                      <div className="text-[8px] opacity-70">{preset.time}</div>
                    </button>
                  ))}
                </div>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full border-2 border-blue-300 px-2 py-2 text-[11px] text-black bg-white outline-none min-h-[44px]"
                  style={SF}
                />
              </div>

              {/* Summary */}
              <div className="border-2 border-blue-300 p-2 text-center bg-white">
                <p className="text-[9px] uppercase tracking-widest text-blue-700 mb-1" style={SF}>Scheduled for</p>
                <p className="text-[13px] font-black text-black">
                  {scheduleDate ? new Date(`${scheduleDate}T${scheduleTime}`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                </p>
                <p className="text-[12px] font-bold text-black">{scheduleTime}</p>
              </div>

              <button
                onClick={handleSchedule}
                disabled={scheduling || !scheduleDate}
                className="w-full py-3 text-[11px] font-black uppercase tracking-wide border-2 min-h-[44px] bg-blue-600 text-white border-blue-700 active:opacity-70 disabled:opacity-50"
                style={SF}
              >
                {scheduling ? '⏳ Scheduling...' : '✓ Confirm Schedule'}
              </button>
            </div>
          </div>
        )}

        {/* ── UPCOMING SCHEDULED ISSUES ── */}
        {scheduledIssues.length > 0 && (
          <div className={`border-2 mb-2 ${theme.border}`}>
            <div className={`px-2 py-1 border-b ${theme.borderLight}`}>
              <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
                📅 Scheduled Issues
              </p>
            </div>
            <div className={`divide-y ${theme.borderLight}`}>
              {scheduledIssues.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-2 py-2">
                  <div>
                    <p className="text-[10px] font-bold">Issue #{s.issueNumber}</p>
                    <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>
                      {s.scheduledFor
                        ? new Date(s.scheduledFor).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setCancellingId(s.id);
                      await cancelScheduledIssue(s.id);
                      setScheduledIssues((prev) => prev.filter((x) => x.id !== s.id));
                      setCancellingId(null);
                    }}
                    disabled={cancellingId === s.id}
                    className="text-[9px] text-red-500 border border-red-300 px-2 py-1 active:opacity-70"
                    style={SF}
                  >
                    {cancellingId === s.id ? '...' : 'Cancel'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ISSUE OPTIONS ── */}
        <div className={`border-2 mb-2 ${theme.border}`}>
          <div className={`px-2 py-1 border-b ${theme.borderLight}`}>
            <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>Issue Options</p>
          </div>
          <div className="p-2 space-y-2">
            {/* ── ARTICLE SLOT TOGGLES ── */}
            <div>
              <p className={`text-[8px] uppercase tracking-widest font-black mb-1 ${theme.mutedClass}`} style={SF}>
                📰 Article Slots — On / Off
              </p>
              <p className={`text-[7px] leading-snug mb-2 ${theme.mutedClass}`} style={SF}>
                Disable a slot to skip it for this issue — it won&apos;t count toward the publish requirement.
              </p>
              <div className="grid grid-cols-2 gap-1">
                {([
                  { id: 'lead', label: 'Lead Story' },
                  { id: 'negative', label: 'Secondary Left' },
                  { id: 'positive', label: 'Secondary Right' },
                  { id: 'channel', label: 'Channel Spotlight' },
                ] as const).map((s) => {
                  const on = enabledSlots[s.id];
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSlot(s.id)}
                      className={`flex items-center justify-between px-2 py-2 border-2 min-h-[44px] text-left transition-all ${
                        on ? `${theme.border} ${theme.fill} ${theme.fillText}` : `${theme.borderLight} opacity-60`
                      }`}
                    >
                      <span className="text-[9px] font-black leading-tight">{s.label}</span>
                      <span className="text-[9px] font-black shrink-0 ml-1">{on ? '✓' : '—'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom section labels */}
            <div>
              <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>
                Section Labels
              </label>
              <div className="flex gap-1">
                <input
                  className={`flex-1 border px-2 py-1 text-[10px] outline-none ${theme.borderLight} ${theme.bg} ${theme.text}`}
                  placeholder="Left (e.g. NEWS)"
                  value={leftLabel}
                  onChange={(e) => setLeftLabel(e.target.value.toUpperCase())}
                />
                <input
                  className={`flex-1 border px-2 py-1 text-[10px] outline-none ${theme.borderLight} ${theme.bg} ${theme.text}`}
                  placeholder="Right (e.g. ANALYSIS)"
                  value={rightLabel}
                  onChange={(e) => setRightLabel(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            {/* Editor byline */}
            <div>
              <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>
                Default Byline
              </label>
              <input
                className={`w-full border px-2 py-1 text-[10px] outline-none ${theme.borderLight} ${theme.bg} ${theme.text}`}
                placeholder="By @mj41fantastican"
                value={editorByline}
                onChange={(e) => setEditorByline(e.target.value)}
              />
            </div>
            {/* Editorial note */}
            <div>
              <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>
                Editor&apos;s Note <span className="opacity-50">(optional — appears above headlines)</span>
              </label>
              <textarea
                className={`w-full border px-2 py-1 text-[10px] outline-none resize-none ${theme.borderLight} ${theme.bg} ${theme.text}`}
                rows={3}
                placeholder="Welcome to Sunday's edition..."
                value={editorialNote}
                onChange={(e) => setEditorialNote(e.target.value)}
              />
            </div>
            {/* Airdrop toggle */}
            <div className={`border-t pt-2 ${theme.borderLight}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>🎯 Airdrop Whitelist</p>
                  <p className={`text-[8px] mt-[2px] ${theme.mutedClass}`} style={SF}>
                    Every buyer&apos;s wallet added to a whitelist you can export
                  </p>
                </div>
                <button
                  onClick={() => setAirdropEnabledState((v) => !v)}
                  className={`shrink-0 px-3 py-2 text-[9px] font-black uppercase tracking-wide border-2 min-h-[36px] min-w-[52px] transition-all ${
                    airdropEnabled
                      ? 'bg-green-600 text-white border-green-700'
                      : `${theme.borderLight} ${theme.mutedClass} ${theme.bg}`
                  }`}
                  style={SF}
                >
                  {airdropEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {airdropEnabled && (
                <p className="text-[8px] text-green-600 font-bold mt-1" style={SF}>
                  ✓ Enabled — all buyers this issue will be whitelisted
                </p>
              )}
            </div>

            {/* ── COLOR SCHEME ── */}
            <div className={`border-t pt-2 ${theme.borderLight}`}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={SF}>
                🎨 Color Scheme
              </p>
              <p className={`text-[8px] leading-snug mb-2 ${theme.mutedClass}`} style={SF}>
                Pick the look for today's issue. Saved instantly — all readers see it.
              </p>
              <div className="grid grid-cols-2 gap-1">
                {(Object.values(THEMES) as (typeof THEMES)[ThemeId][]).map((t) => {
                  const preview = THEME_PREVIEWS[t.id as ThemeId];
                  const selected = colorScheme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSchemeSelect(t.id as ThemeId)}
                      className={`border-2 p-1.5 text-left transition-all min-h-[56px] flex flex-col gap-1 ${
                        selected ? `ring-2 ring-offset-1 ${theme.border}` : `${theme.borderLight}`
                      }`}
                      style={{ background: preview.gradient ?? preview.bg }}
                    >
                      <div
                        className="w-full py-[2px] px-1 text-center"
                        style={
                          preview.gradient
                            ? { background: preview.gradient, backgroundSize: '200% 200%' }
                            : { backgroundColor: preview.ink }
                        }
                      >
                        <span className="text-[6px] font-black tracking-widest uppercase"
                          style={{ color: preview.gradient ? '#fff' : preview.bg, fontFamily: 'Georgia,serif' }}
                        >
                          THE MISCELLANY
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-auto px-[2px]">
                        <span className="text-[8px] font-bold" style={{ color: preview.ink, fontFamily: 'Arial,sans-serif' }}>
                          {t.emoji} {t.name}
                        </span>
                        {selected && (
                          <span className="text-[7px] font-black" style={{ color: preview.ink }}>✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── WIDGET PANEL SELECTOR ── */}
            <div className={`border-t pt-2 ${theme.borderLight}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
                  🧩 Live Widget Panels
                </p>
                {widgetSaving && (
                  <span className={`text-[8px] ${theme.mutedClass}`} style={SF}>saving...</span>
                )}
              </div>
              <p className={`text-[8px] leading-snug mb-2 ${theme.mutedClass}`} style={SF}>
                Choose which live data panels appear below the lead story. Changes take effect immediately for all readers.
              </p>
              <div className="space-y-1">
                {([
                  { id: 'art', icon: '🎨', label: 'Art of the Day', desc: 'Art Institute of Chicago daily pick' },
                  { id: 'weather', icon: '🌤', label: 'Weather', desc: 'Live weather via Open-Meteo' },
                  { id: 'cat', icon: '🐱', label: 'Cat of the Day', desc: 'CATAAS random cat photo' },
                  { id: 'anilist', icon: '🎌', label: 'Anime Birthdays', desc: 'Characters born today (AniList)' },
                  { id: 'book', icon: '📚', label: 'Book of the Day', desc: 'Open Library daily recommendation' },
                  { id: 'color', icon: '🎨', label: 'Color of the Day', desc: 'The Color API daily color' },
                  { id: 'agify', icon: '🔢', label: 'Age by Name', desc: 'Agify.ai name-to-age game' },
                  { id: 'quakes', icon: '🌋', label: 'Where Earth Quaked', desc: 'Live seismic wire from USGS' },
                ] as Array<{ id: WidgetId; icon: string; label: string; desc: string }>).map((w) => {
                  const on = activeWidgets.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => handleWidgetToggle(w.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 border-2 min-h-[44px] text-left transition-all ${
                        on ? `${theme.border} ${theme.fill} ${theme.fillText}` : `${theme.borderLight}`
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[14px]">{w.icon}</span>
                        <div>
                          <p className="text-[10px] font-black leading-none">{w.label}</p>
                          <p className={`text-[8px] mt-[1px] ${on ? 'opacity-70' : theme.mutedClass}`} style={SF}>{w.desc}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black shrink-0 ml-2`}>{on ? '✓ ON' : 'OFF'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── STORY SLOTS — shared tabbed layout for lead / secondary-left / secondary-right ── */}
        {(['lead', 'negative', 'positive'] as const).filter((k) => enabledSlots[k]).map((slotKey) => {
          const slotLabel = slotKey === 'lead' ? 'Lead Story' : slotKey === 'negative' ? 'Secondary Left (News)' : 'Secondary Right (Analysis)';
          const activeTab = storyTab[slotKey];
          const pickedNews = newsPicks[slotKey];
          const pickedCastId = picks[slotKey];
          const news = feed.newsCategories ?? { technology: [], business: [], sports: [], blockchain: [], science: [] };
          const TABS: Array<{ id: 'farcaster' | NewsCategory; label: string }> = [
            { id: 'farcaster', label: '🟣 Protocol' },
            { id: 'technology', label: '💻 Tech' },
            { id: 'business', label: '📈 Biz' },
            { id: 'sports', label: '🏆 Sports' },
            { id: 'blockchain', label: '⛓ Chain' },
            { id: 'science', label: '🔬 Science' },
          ];

          return (
            <SlotSection
              key={slotKey}
              slot={slotKey}
              label={slotLabel}
              filled={isSlotFilled(slotKey)}
              writeInMode={!!writeInMode[slotKey]}
              writeIn={writeIns[slotKey]}
              onToggleWriteIn={() => {
                toggleWriteIn(slotKey);
                // Clear picks when switching to write-in
                if (!writeInMode[slotKey]) {
                  setNewsPicks((p) => { const n = { ...p }; delete n[slotKey]; return n; });
                  setPicks((p) => { const n = { ...p }; delete n[slotKey]; return n; });
                }
              }}
              showWriteFirst={true}
              onWriteInChange={(f, v) => updateWriteIn(slotKey, f, v)}
            >
              {/* Category tab bar */}
              <div className={`flex overflow-x-auto gap-0 border-b ${theme.borderLight}`} style={{ scrollbarWidth: 'none' }}>
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStoryTab((t) => ({ ...t, [slotKey]: tab.id }))}
                    className={`shrink-0 px-2 py-[6px] text-[8px] font-bold uppercase tracking-wide whitespace-nowrap border-r transition-colors ${theme.borderLight} ${
                      activeTab === tab.id
                        ? `${theme.fill} ${theme.fillText}`
                        : `${theme.bg} ${theme.mutedClass}`
                    }`}
                    style={SF}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'farcaster' ? (
                /* Farcaster trending casts */
                <div className={`divide-y ${theme.borderLight}`}>
                  <p className={`px-2 py-1 text-[8px] italic ${theme.mutedClass}`} style={SF}>
                    What&apos;s going on in the protocol?
                  </p>
                  {feed.trendingCasts.length === 0 ? (
                    <p className={`px-2 py-3 text-[9px] text-center ${theme.mutedClass}`} style={SF}>
                      No casts yet — hit 🔄 Refresh to fetch live data
                    </p>
                  ) : feed.trendingCasts.map((c) => {
                    const isSel = pickedCastId === c.id && !pickedNews;
                    return (
                      <div key={c.id}>
                        <button
                          onClick={() => pickFarcaster(slotKey, c.id)}
                          className={`w-full text-left px-2 py-2 flex gap-2 items-start min-h-[44px] ${theme.text} ${isSel ? theme.fillLight : ''}`}
                        >
                          <div className={`mt-[2px] w-3 h-3 rounded-full border-2 shrink-0 ${isSel ? `${theme.border} ${theme.fill}` : theme.borderLight}`} />
                          <div className="flex-1 min-w-0">
                            <span className={`text-[9px] font-bold ${theme.mutedClass}`}>{c.author}</span>
                            <p className="text-[10px] leading-tight mt-[1px] line-clamp-2">{c.text}</p>
                            <p className="text-[8px] opacity-40 mt-[2px]">❤ {c.likes.toLocaleString()} · 🔁 {c.recasts}</p>
                          </div>
                          <span className={`text-[8px] px-1 py-[1px] shrink-0 ${c.signal === 'positive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {c.signal === 'positive' ? '✦' : '⚠'}
                          </span>
                        </button>
                        {isSel && !writeInMode[slotKey] && (
                          <button
                            onClick={() => handleExpand(slotKey, c.text, c.author)}
                            disabled={expanding === slotKey}
                            className="w-full px-2 py-[6px] text-[9px] font-bold uppercase tracking-wide text-left border-t active:opacity-70 disabled:opacity-50"
                            style={{ ...SF, borderColor: '#e5e7eb', background: '#fafafa', color: '#6b7280' }}
                          >
                            {expanding === slotKey ? '⏳ Writing article...' : '✨ Expand into full article'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* External news category */
                <div className={`divide-y ${theme.borderLight}`}>
                  {(news[activeTab as NewsCategory] ?? []).length === 0 ? (
                    <p className={`px-2 py-3 text-[9px] text-center ${theme.mutedClass}`} style={SF}>
                      No {NEWS_CATEGORY_LABELS[activeTab as NewsCategory]} stories yet — hit 🔄 Refresh to fetch
                    </p>
                  ) : (news[activeTab as NewsCategory] ?? []).map((story) => {
                    const isSel = pickedNews?.id === story.id;
                    const pubDate = story.publishedAt ? new Date(story.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                    return (
                      <div key={story.id}>
                        <button
                          onClick={() => pickNews(slotKey, story)}
                          className={`w-full text-left px-2 py-2 flex gap-2 items-start min-h-[44px] ${theme.text} ${isSel ? theme.fillLight : ''}`}
                        >
                          <div className={`mt-[2px] w-3 h-3 rounded-full border-2 shrink-0 ${isSel ? `${theme.border} ${theme.fill}` : theme.borderLight}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-[2px]">
                              <span className={`text-[8px] font-bold uppercase tracking-wide ${theme.mutedClass}`} style={SF}>{story.source}</span>
                              {pubDate && <span className={`text-[8px] opacity-40`} style={SF}>· {pubDate}</span>}
                            </div>
                            <p className="text-[10px] font-bold leading-tight line-clamp-2">{story.title}</p>
                            {story.description && (
                              <p className={`text-[9px] leading-snug mt-[2px] line-clamp-2 ${theme.mutedClass}`}>{story.description}</p>
                            )}
                          </div>
                        </button>
                        {isSel && !writeInMode[slotKey] && (
                          <button
                            onClick={() => handleExpandNews(slotKey, story)}
                            disabled={expanding === slotKey}
                            className="w-full px-2 py-[6px] text-[9px] font-bold uppercase tracking-wide text-left border-t active:opacity-70 disabled:opacity-50"
                            style={{ ...SF, borderColor: '#e5e7eb', background: '#fafafa', color: '#6b7280' }}
                          >
                            {expanding === slotKey ? '⏳ Writing article...' : '✨ Expand into a full article'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SlotSection>
          );
        })}

        {/* ── CHANNEL SPOTLIGHT ── */}
        {enabledSlots.channel && <SlotSection
          slot="channel"
          label="Channel Spotlight"
          filled={isSlotFilled('channel')}
          writeInMode={!!writeInMode.channel}
          writeIn={writeIns.channel}
          onToggleWriteIn={() => {
            if (writeInMode.channel) {
              setLookedUpChannel(null);
              setChannelSlug('');
              setPicks((p) => { const n = { ...p }; delete n.channel; return n; });
            }
            toggleWriteIn('channel');
          }}
          onWriteInChange={(f, v) => updateWriteIn('channel', f, v)}
        >
          {/* ── SLASH CHANNEL QUICK LOOKUP ── */}
          <div className={`p-2 border-b ${theme.borderLight}`}>
            <p className={`text-[8px] font-black uppercase tracking-widest mb-2 ${theme.mutedClass}`} style={SF}>
              Look up a channel by name
            </p>
            <div className="flex gap-1">
              <div className={`flex items-center border flex-1 min-h-[44px] ${theme.borderLight} ${theme.bg}`}>
                <span className={`pl-2 text-[14px] font-black leading-none ${theme.mutedClass}`}>/</span>
                <input
                  className={`flex-1 px-1 py-2 text-[11px] font-mono outline-none bg-transparent ${theme.text}`}
                  placeholder="channel-name"
                  value={channelSlug.replace(/^\//, '')}
                  onChange={(e) => { setChannelSlug(e.target.value.replace(/^\//, '')); setLookedUpChannel(null); setChannelLookupError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleChannelLookup(); }}
                  style={SF}
                />
              </div>
              <button
                onClick={handleChannelLookup}
                disabled={!channelSlug.trim() || channelLookupLoading}
                className={`shrink-0 px-3 py-2 text-[10px] font-black uppercase tracking-wide border-2 min-h-[44px] min-w-[64px] transition-all active:opacity-70 disabled:opacity-40 ${theme.border} ${theme.fill} ${theme.fillText}`}
                style={SF}
              >
                {channelLookupLoading ? '⏳' : '🔍 Go'}
              </button>
            </div>
            {channelLookupError && (
              <p className="text-[9px] text-red-500 mt-1" style={SF}>{channelLookupError}</p>
            )}

            {/* Looked-up channel result card */}
            {lookedUpChannel && (
              <div className={`mt-2 p-2 border ${theme.border} ${theme.fillLight}`}>
                <div className="flex items-center gap-2 mb-1">
                  {lookedUpChannel.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lookedUpChannel.imageUrl} alt={lookedUpChannel.name} className="w-8 h-8 rounded-full border" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
                  ) : (
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[12px] font-black ${theme.borderLight} ${theme.fillLight}`}>
                      #{lookedUpChannel.id[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black">/{lookedUpChannel.id}</p>
                    <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>{lookedUpChannel.followerCount.toLocaleString()} followers</p>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                </div>
                {lookedUpChannel.description && (
                  <p className={`text-[9px] leading-snug ${theme.mutedClass} mb-1`} style={SF}>
                    {lookedUpChannel.description.slice(0, 140)}{lookedUpChannel.description.length > 140 ? '…' : ''}
                  </p>
                )}
                {lookedUpChannel.pinnedCastText && (
                  <div className={`border-t pt-1 mt-1 ${theme.borderLight}`}>
                    <p className={`text-[8px] font-black uppercase tracking-widest mb-[2px] ${theme.mutedClass}`} style={SF}>📌 Pinned cast</p>
                    <p className={`text-[9px] leading-snug italic ${theme.mutedClass}`}>
                      "{lookedUpChannel.pinnedCastText.slice(0, 120)}{lookedUpChannel.pinnedCastText.length > 120 ? '…' : ''}"
                      {lookedUpChannel.pinnedCastAuthor && <span className="not-italic font-bold"> — {lookedUpChannel.pinnedCastAuthor}</span>}
                    </p>
                  </div>
                )}
                {/* Log line field */}
                <div className={`border-t mt-2 pt-2 ${theme.borderLight}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-[8px] font-black uppercase tracking-widest ${theme.mutedClass}`} style={SF}>📝 Log Line</p>
                    <button
                      onClick={handleGenerateLogLine}
                      disabled={logLineGenerating}
                      className={`text-[8px] px-2 py-[2px] border font-bold uppercase tracking-wide min-h-[22px] disabled:opacity-40 border-purple-500 text-purple-600 bg-purple-50`}
                      style={SF}
                    >
                      {logLineGenerating ? '⏳' : '✨ AI'}
                    </button>
                  </div>
                  <textarea
                    className={`w-full border px-2 py-1 text-[9px] outline-none resize-none ${theme.borderLight} ${theme.bg} ${theme.text}`}
                    rows={2}
                    placeholder="Write a 1-3 sentence persuasive teaser about this channel, or hit ✨ AI to generate one..."
                    value={channelLogLine}
                    onChange={(e) => setChannelLogLine(e.target.value)}
                    style={SF}
                  />
                </div>
                <p className="text-[9px] text-green-700 font-bold mt-1" style={SF}>✓ Channel story auto-filled — edit in ✏️ write-in above</p>
              </div>
            )}
          </div>

          {/* ── FEED CHANNELS (pick list, refreshes with 🔄) ── */}
          {feed.topChannels.length === 0 ? (
            <p className={`px-2 py-3 text-[9px] text-center ${theme.mutedClass}`} style={SF}>
              Hit 🔄 Refresh to load active channels
            </p>
          ) : (
            <>
              <p className={`px-2 py-1 text-[8px] italic border-b ${theme.mutedClass} ${theme.borderLight}`} style={SF}>
                Or pick from today&apos;s most active channels
              </p>
              {feed.topChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => pick('channel', ch.id)}
                  className={`w-full text-left px-2 py-2 flex items-center gap-2 min-h-[44px] ${theme.text} ${
                    picks.channel === ch.id ? theme.fillLight : ''
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${picks.channel === ch.id ? `${theme.border} ${theme.fill}` : theme.borderLight}`} />
                  <span className="text-[11px] font-black flex-1">{ch.name}</span>
                  <span className={`text-[9px] ${theme.mutedClass}`} style={SF}>{ch.members}</span>
                  <span className={`text-[8px] opacity-40`} style={SF}>{ch.casts24h.toLocaleString()} casts</span>
                </button>
              ))}
            </>
          )}
        </SlotSection>}

        {/* ── TOKEN TRACKER EDITOR ── */}
        <div className={`border-2 mb-2 ${theme.border}`}>
          <div className={`px-2 py-1 border-b flex items-center justify-between ${theme.borderLight} ${theme.fillLight}`}>
            <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>💹 Token Tracker</p>
            <span className={`text-[8px] ${theme.mutedClass}`} style={SF}>select tokens for this issue</span>
          </div>
          <div className="p-2">
            <PinnedTokensEditor
              poolTokens={feed.topTokens}
              trackerTokens={trackerTokens}
              onTrackerTokensChange={setTrackerTokens}
            />
          </div>
        </div>

        {/* ── MINI APP SHOWCASE ── */}
        <div className={`border-2 mb-2 ${theme.border}`}>
          <div className={`px-2 py-1 border-b flex items-center justify-between ${theme.borderLight} ${theme.fillLight}`}>
            <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
              📱 Mini App Showcase
            </p>
            <span className={`text-[8px] ${theme.mutedClass}`} style={SF}>
              {selectedApps.length > 0 ? `${selectedApps.length} selected` : 'tap to feature · up to 5 in briefs'}
            </span>
          </div>
          <div className="p-2">
            <MiniAppShowcaseEditor
              selectedApps={selectedApps}
              onSelectedAppsChange={setSelectedApps}
              miniAppWriteIn={miniAppWriteIn}
              miniAppWriteInMode={miniAppWriteInMode}
              onMiniAppWriteInChange={setMiniAppWriteIn}
              onMiniAppWriteInModeChange={setMiniAppWriteInMode}
            />
          </div>
        </div>

        {/* ── PUBLISH CTA ── */}
        <div className="pb-2">
          {ready ? (
            <Button className="w-full" onClick={handlePublish} disabled={publishing}>
              {publishing ? '📰 Publishing...' : '🗞 Publish New Issue'}
            </Button>
          ) : (
            <div className={`border-2 p-3 text-center ${theme.borderLight}`}>
              <p className={`text-[10px] uppercase tracking-widest ${theme.mutedClass}`} style={SF}>
                Fill {requiredCount - filledCount} more required slot
                {requiredCount - filledCount !== 1 ? 's' : ''} to publish
              </p>
              <p className="text-[9px] mt-1 opacity-30" style={SF}>
                Or hit ⚡ Auto-Select to fill everything algorithmically
              </p>
            </div>
          )}
        </div>

        {/* ── READER STATS ── */}
        <div className={`border-2 mb-2 ${theme.border}`}>
          <div className={`px-2 py-1 border-b flex justify-between items-center ${theme.borderLight}`}>
            <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
              📊 Reader Stats — All Issues
            </p>
            <button
              onClick={async () => {
                setStatsLoading(true);
                const s = await getIssueStats();
                setStats(s);
                setStatsLoading(false);
              }}
              className={`text-[8px] uppercase tracking-wide ${theme.mutedClass} active:opacity-50`}
              style={SF}
            >
              ↻ Refresh
            </button>
          </div>
          <div className={`p-2 ${theme.bg}`}>
            {statsLoading ? (
              <p className={`text-[9px] text-center py-2 ${theme.mutedClass}`} style={SF}>Loading stats...</p>
            ) : stats ? (
              <>
                {/* Totals row */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className={`border p-2 text-center ${theme.borderLight}`}>
                    <p className="text-[20px] font-black leading-none">{stats.totalReaders}</p>
                    <p className={`text-[9px] uppercase tracking-wide mt-1 ${theme.mutedClass}`} style={SF}>Total Readers</p>
                  </div>
                  <div className={`border p-2 text-center ${theme.borderLight}`}>
                    <p className="text-[20px] font-black leading-none">{stats.totalMints}</p>
                    <p className={`text-[9px] uppercase tracking-wide mt-1 ${theme.mutedClass}`} style={SF}>NFT Mints</p>
                  </div>
                </div>

                {/* Revenue estimate */}
                <div className={`border p-2 text-center mb-3 ${theme.borderLight}`}>
                  <p className="text-[18px] font-black leading-none">${stats.estimatedRevenueUsdc.toFixed(3)}</p>
                  <p className={`text-[9px] uppercase tracking-wide mt-1 ${theme.mutedClass}`} style={SF}>Est. Revenue (USDC + ETH)</p>
                </div>

                {/* Payment method breakdown — Reads */}
                <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${theme.mutedClass}`} style={SF}>
                  Reads by payment method
                </p>
                <div className={`border divide-y mb-3 ${theme.borderLight}`}>
                  {(['usdc', 'eth', 'rwac'] as const).map((method) => {
                    const count = stats.byMethod[method];
                    const pct = stats.totalReaders > 0 ? Math.round((count / stats.totalReaders) * 100) : 0;
                    return (
                      <div key={method} className="flex items-center justify-between px-2 py-[5px]">
                        <span className="text-[10px] font-bold uppercase" style={SF}>
                          {method === 'rwac' ? '$RWACu' : method.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className={`h-1.5 w-16 rounded-full overflow-hidden ${theme.fillLight}`}>
                            <div
                              className={`h-full rounded-full ${theme.fill}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-[9px] w-6 text-right font-bold`}>{count}</span>
                          <span className={`text-[8px] w-7 text-right ${theme.mutedClass}`}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Payment method breakdown — Mints */}
                <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${theme.mutedClass}`} style={SF}>
                  Mints by payment method
                </p>
                <div className={`border divide-y ${theme.borderLight}`}>
                  {(['usdc', 'eth', 'rwac'] as const).map((method) => {
                    const count = stats.mintsByMethod[method];
                    const pct = stats.totalMints > 0 ? Math.round((count / stats.totalMints) * 100) : 0;
                    return (
                      <div key={method} className="flex items-center justify-between px-2 py-[5px]">
                        <span className="text-[10px] font-bold uppercase" style={SF}>
                          {method === 'rwac' ? '$RWACu' : method.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className={`h-1.5 w-16 rounded-full overflow-hidden ${theme.fillLight}`}>
                            <div
                              className={`h-full rounded-full ${theme.fill}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-[9px] w-6 text-right font-bold`}>{count}</span>
                          <span className={`text-[8px] w-7 text-right ${theme.mutedClass}`}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className={`text-[9px] text-center py-2 ${theme.mutedClass}`} style={SF}>No stats available.</p>
            )}
          </div>
        </div>

        {/* ── AIRDROP WHITELIST ── */}
        <div className={`border-2 mb-2 ${theme.border}`}>
          <button
            className={`w-full flex items-center justify-between px-2 py-1 border-b ${theme.borderLight} ${theme.fillLight}`}
            onClick={() => setShowAirdropPanel((v) => !v)}
          >
            <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
              🎯 Airdrop Whitelist
            </p>
            <span className="text-[10px]">{showAirdropPanel ? '▲' : '▼'}</span>
          </button>
          {showAirdropPanel && (
            <div className="p-2 space-y-2">
              <p className={`text-[9px] leading-snug ${theme.mutedClass}`} style={SF}>
                Issues with airdrop enabled — every buyer's wallet is captured. Export the list to use in your $RWACu drop.
              </p>

              {airdropIssues.length === 0 ? (
                <p className={`text-[9px] text-center py-3 ${theme.mutedClass}`} style={SF}>
                  No airdrop issues yet. Enable the airdrop toggle when composing an issue.
                </p>
              ) : (
                <div className={`border divide-y ${theme.border}`}>
                  {airdropIssues.map((ai) => (
                    <div key={ai.issueId} className="p-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black" style={SF}>Issue #{ai.issueNumber}</span>
                          <span className={`text-[9px] ml-2 ${theme.mutedClass}`} style={SF}>{ai.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-green-700" style={SF}>
                            {ai.count} wallet{ai.count !== 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={async () => {
                              if (airdropLoadingId === ai.issueId) return;
                              setAirdropLoadingId(ai.issueId);
                              const entries = await getAirdropWhitelist(ai.issueId);
                              setAirdropWhitelistData(entries);
                              setAirdropLoadingId(null);
                            }}
                            disabled={airdropLoadingId === ai.issueId}
                            className={`px-2 py-1 text-[9px] font-bold border min-h-[28px] transition-all ${theme.border} active:opacity-70`}
                            style={SF}
                          >
                            {airdropLoadingId === ai.issueId ? '⏳' : '↓ Load'}
                          </button>
                        </div>
                      </div>

                      {/* Expanded whitelist entries for this issue */}
                      {airdropWhitelistData.length > 0 && airdropWhitelistData[0]?.issueId === ai.issueId && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-[8px] font-black uppercase tracking-widest ${theme.mutedClass}`} style={SF}>
                              Wallet Addresses
                            </p>
                            <button
                              onClick={() => {
                                const csv = [
                                  'fid,wallet_address,access_type,payment_method,tx_hash,added_at',
                                  ...airdropWhitelistData.map((e) =>
                                    `${e.fid},${e.walletAddress},${e.accessType},${e.paymentMethod},${e.txHash ?? ''},${e.addedAt}`
                                  ),
                                ].join('\n');
                                navigator.clipboard.writeText(csv).catch(() => null);
                              }}
                              className="text-[8px] font-bold border px-2 py-0.5 border-green-600 text-green-700 active:opacity-70"
                              style={SF}
                            >
                              📋 Copy CSV
                            </button>
                          </div>
                          <div className={`border divide-y max-h-40 overflow-y-auto ${theme.borderLight}`}>
                            {airdropWhitelistData.map((e, i) => (
                              <div key={e.id} className="flex items-center justify-between px-2 py-1 gap-1">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className={`text-[8px] shrink-0 ${theme.mutedClass}`} style={SF}>{i + 1}.</span>
                                  <span className="text-[8px] font-mono truncate" style={SF}>
                                    {e.walletAddress.slice(0, 10)}...{e.walletAddress.slice(-8)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className={`text-[7px] uppercase ${theme.mutedClass}`} style={SF}>
                                    fid:{e.fid}
                                  </span>
                                  <span className={`text-[7px] px-1 border ${e.accessType === 'mint' ? 'border-yellow-500 text-yellow-700' : 'border-gray-400 text-gray-600'}`} style={SF}>
                                    {e.accessType === 'mint' ? 'MINT' : 'READ'}
                                  </span>
                                  <span className={`text-[7px] ${theme.mutedClass}`} style={SF}>
                                    {e.paymentMethod.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              const addresses = airdropWhitelistData.map((e) => e.walletAddress).join('\n');
                              navigator.clipboard.writeText(addresses).catch(() => null);
                            }}
                            className="w-full py-1.5 text-[9px] font-bold border min-h-[32px] border-green-600 text-green-700 active:opacity-70"
                            style={SF}
                          >
                            📋 Copy Addresses Only
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── PAPER SETTINGS ── */}
        <div className={`border-2 mb-2 ${theme.border}`}>
          <button
            className={`w-full flex items-center justify-between px-2 py-1 border-b ${theme.borderLight} ${theme.fillLight}`}
            onClick={() => setSettingsOpen((v) => !v)}
          >
            <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>⚙️ Paper Settings</p>
            <span className="text-[10px]">{settingsOpen ? '▲' : '▼'}</span>
          </button>
          {settingsOpen && (
            <div className="p-2 space-y-4">

              {/* ── PAPER IDENTITY ── */}
              <div>
                <p className={`text-[8px] uppercase tracking-widest font-black mb-2 ${theme.mutedClass}`} style={SF}>📰 Paper Identity</p>
                <div className="space-y-2">
                  {[
                    { label: 'Paper Name', value: paperName, set: setPaperName, placeholder: 'The Daily Miscellany: A Compendium Of Interesting Things' },
                    { label: 'Editor Handle', value: editorHandle, set: setEditorHandle, placeholder: '@mj41fantastican' },
                    { label: 'Nameplate Tagline', value: paperTagline, set: setPaperTagline, placeholder: "All the news that's fit to cast" },
                    { label: 'Cover Price (display)', value: issuePrice, set: setIssuePrice, placeholder: '$0.041' },
                    { label: 'Website / Domain', value: websiteUrl, set: setWebsiteUrl, placeholder: 'dailyfarcaster.fc' },
                    { label: 'Farcaster Channel', value: channelUrl, set: setChannelUrl, placeholder: '/tribune' },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>{f.label}</label>
                      <input
                        className={`w-full border px-2 py-2 text-[10px] outline-none ${theme.borderLight} ${theme.bg} ${theme.text}`}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        placeholder={f.placeholder}
                        style={SF}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── PAYWALL PRICING ── */}
              <div>
                <p className={`text-[8px] uppercase tracking-widest font-black mb-2 ${theme.mutedClass}`} style={SF}>💰 Paywall Pricing</p>
                <div className="space-y-2">
                  <div>
                    <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>Accepted Currencies</label>
                    <div className="flex gap-1">
                      {PAYWALL_CURRENCIES.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEnabledCurrencies((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
                          className={`flex-1 py-2 text-[10px] border font-bold text-center transition-all min-h-[36px] ${
                            enabledCurrencies.includes(c)
                              ? `${theme.fill} ${theme.fillText} ${theme.border}`
                              : `${theme.borderLight} ${theme.mutedClass}`
                          }`}
                          style={SF}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>Read Fee (USDC)</label>
                      <div className={`flex items-center border ${theme.borderLight}`}>
                        <span className={`px-2 text-[10px] ${theme.mutedClass}`}>$</span>
                        <input className={`flex-1 py-2 text-[10px] outline-none pr-2 ${theme.bg} ${theme.text}`} value={readPrice} onChange={(e) => setReadPrice(e.target.value)} style={SF} />
                      </div>
                    </div>
                    <div>
                      <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>Mint Price (USDC)</label>
                      <div className={`flex items-center border ${theme.borderLight}`}>
                        <span className={`px-2 text-[10px] ${theme.mutedClass}`}>$</span>
                        <input className={`flex-1 py-2 text-[10px] outline-none pr-2 ${theme.bg} ${theme.text}`} value={mintPrice} onChange={(e) => setMintPrice(e.target.value)} style={SF} />
                      </div>
                    </div>
                  </div>
                  {enabledCurrencies.includes('$RWACu') && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>$RWACu Read</label>
                        <input className={`w-full border px-2 py-2 text-[10px] outline-none ${theme.borderLight} ${theme.bg} ${theme.text}`} value={rwacRead} onChange={(e) => setRwacRead(e.target.value)} style={SF} />
                      </div>
                      <div>
                        <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>$RWACu Mint</label>
                        <input className={`w-full border px-2 py-2 text-[10px] outline-none ${theme.borderLight} ${theme.bg} ${theme.text}`} value={rwacMint} onChange={(e) => setRwacMint(e.target.value)} style={SF} />
                      </div>
                    </div>
                  )}
                  <div className={`border border-dashed p-2 ${theme.borderLight}`}>
                    <p className={`text-[7px] uppercase tracking-widest mb-1 ${theme.mutedClass}`} style={SF}>Summary</p>
                    <p className="text-[9px]">Read: <span className="font-bold">${readPrice}</span>{enabledCurrencies.includes('$RWACu') ? ` · ${Number(rwacRead).toLocaleString()} $RWACu` : ''}</p>
                    <p className="text-[9px]">Mint: <span className="font-bold">${mintPrice}</span>{enabledCurrencies.includes('$RWACu') ? ` · ${Number(rwacMint).toLocaleString()} $RWACu` : ''}</p>
                  </div>
                </div>
              </div>

              {/* ── AIRDROP DEFAULT ── */}
              <div>
                <p className={`text-[8px] uppercase tracking-widest font-black mb-2 ${theme.mutedClass}`} style={SF}>🎯 Airdrop Default</p>
                <button
                  onClick={() => setAirdropDefault((v) => !v)}
                  className={`w-full flex justify-between items-center px-2 py-3 border min-h-[52px] ${theme.borderLight}`}
                >
                  <div className="text-left">
                    <p className="text-[10px] font-bold">Enable airdrop by default on new issues</p>
                    <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>Every paying reader&apos;s wallet is whitelisted automatically</p>
                  </div>
                  <div className={`w-8 h-4 rounded-full border-2 flex items-center transition-all shrink-0 ml-2 ${airdropDefault ? `${theme.fill} ${theme.border}` : theme.borderLight}`}>
                    <div className={`w-3 h-3 rounded-full bg-white border border-black/20 transition-all mx-[1px] ${airdropDefault ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>

              {/* ── SAVE BUTTON ── */}
              <button
                onClick={async () => {
                  try { await fetch('/api/setup'); } catch { /* non-fatal */ }
                  const ok = await savePaper({
                    readPriceUsdc: readPrice,
                    mintPriceUsdc: mintPrice,
                    rwacReadAmount: rwacRead,
                    rwacMintAmount: rwacMint,
                    enabledCurrencies: enabledCurrencies.join(','),
                    airdropDefault,
                    paperName,
                    editorHandle,
                    tagline: paperTagline,
                    coverPrice: issuePrice,
                    websiteUrl,
                    channelUrl,
                  });
                  if (ok) {
                    setSettingsSaved(true);
                    setTimeout(() => setSettingsSaved(false), 3000);
                  }
                }}
                disabled={paperSaving}
                className="w-full py-3 text-[11px] font-black uppercase tracking-widest min-h-[48px] transition-all disabled:opacity-50"
                style={{ ...SF, background: settingsSaved ? '#14532d' : '#000000', color: '#ffffff' }}
              >
                {paperSaving ? '⏳ Saving…' : settingsSaved ? '✓ Settings Saved' : 'Save Paper Settings'}
              </button>
            </div>
          )}
        </div>

        {/* ── PUBLICATION STATS ── */}
        <div className={`border-2 mb-2 ${theme.border}`}>
          <button
            className={`w-full flex items-center justify-between px-3 py-2 border-b ${theme.borderLight} ${theme.fill} ${theme.fillText} active:opacity-70`}
            onClick={() => setStatsOpen((v) => !v)}
          >
            <span className="text-[10px] font-black uppercase tracking-widest" style={SF}>📊 Publication Stats</span>
            <span className="text-[9px]" style={SF}>{statsOpen ? '▲' : '▼'}</span>
          </button>
          {statsOpen && (
            <div className="py-3">
              <Suspense fallback={<div className={`p-4 text-center text-[11px] ${theme.mutedClass}`} style={SF}>Loading…</div>}>
                <StatsPanel />
              </Suspense>
            </div>
          )}
        </div>

        {/* ── MINTS DIAGNOSTIC ── */}
        <MintsDiagnostic />

        {/* ── GENERATED IMAGE COLLECTION ── */}
        <ImageCollection />

        {/* ── DEV TOOLS ── */}
        <div className={`border-2 mb-2 ${theme.border}`}>
          <div className={`px-2 py-1 border-b ${theme.borderLight} bg-yellow-50`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-yellow-800" style={SF}>
              🛠 Dev Tools — Editor Only
            </p>
          </div>
          <div className="p-2 space-y-2 bg-yellow-50">
            {/* Reset my paywall access */}
            <p className="text-[9px] text-yellow-700 leading-snug" style={SF}>
              Reset your own paywall access to re-test the payment flow.
            </p>
            <button
              onClick={async () => {
                if ((!viewer.address && !viewer.fid) || resetting) return;
                setResetting(true);
                setResetDone(false);
                await resetAccess({ fid: viewer.fid, walletAddress: viewer.address });
                setResetting(false);
                setResetDone(true);
                setTimeout(() => setResetDone(false), 3000);
              }}
              disabled={resetting || (!viewer.address && !viewer.fid)}
              className={`w-full py-2 text-[10px] font-bold uppercase tracking-wide border-2 min-h-[44px] transition-all ${
                resetDone
                  ? 'border-green-500 text-green-700 bg-green-50'
                  : 'border-yellow-600 text-yellow-800 bg-yellow-100 active:opacity-70'
              }`}
              style={SF}
            >
              {resetting ? '⏳ Resetting...' : resetDone ? '✓ Access Reset! Reload the app.' : '🔄 Reset My Paywall Access'}
            </button>

            {/* Reset ALL stats */}
            <p className="text-[9px] text-yellow-700 leading-snug mt-2" style={SF}>
              ⚠️ Wipe all reader & mint stats to start fresh tracking from zero.
            </p>
            <button
              onClick={async () => {
                if (resettingStats) return;
                setResettingStats(true);
                setStatsResetDone(false);
                await resetAllStats();
                const s = await getIssueStats();
                setStats(s);
                setResettingStats(false);
                setStatsResetDone(true);
                setTimeout(() => setStatsResetDone(false), 3000);
              }}
              disabled={resettingStats}
              className={`w-full py-2 text-[10px] font-bold uppercase tracking-wide border-2 min-h-[44px] transition-all ${
                statsResetDone
                  ? 'border-green-500 text-green-700 bg-green-50'
                  : 'border-red-400 text-red-700 bg-red-50 active:opacity-70'
              }`}
              style={SF}
            >
              {resettingStats ? '⏳ Clearing...' : statsResetDone ? '✓ Stats Cleared!' : '🗑 Reset All Reader Stats'}
            </button>

            {/* Reset archive (delete all issues) */}
            <p className="text-[9px] text-yellow-700 leading-snug mt-2" style={SF}>
              ⚠️ Delete all published issues from the archive. Use before launch to start clean from Issue #1.
            </p>
            <button
              onClick={async () => {
                if (resettingArchive) return;
                setResettingArchive(true);
                setArchiveResetDone(false);
                await deleteAllIssues();
                setResettingArchive(false);
                setArchiveResetDone(true);
                setTimeout(() => setArchiveResetDone(false), 3000);
              }}
              disabled={resettingArchive}
              className={`w-full py-2 text-[10px] font-bold uppercase tracking-wide border-2 min-h-[44px] transition-all ${
                archiveResetDone
                  ? 'border-green-500 text-green-700 bg-green-50'
                  : 'border-red-400 text-red-700 bg-red-50 active:opacity-70'
              }`}
              style={SF}
            >
              {resettingArchive ? '⏳ Deleting...' : archiveResetDone ? '✓ Archive Cleared! Publish Issue #1.' : '🗑 Delete All Issues (Fresh Start)'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
