'use client';

import { useState, useEffect } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import { useTheme } from '@/features/app/theme-context';
import { ThemePicker } from '@/features/app/components/theme-picker';
import { PaywallGate } from '@/features/app/components/paywall-gate';
import { StoryModal } from '@/features/app/components/story-modal';
import { useCurrentIssue } from '@/hooks/use-current-issue';
import { usePaywall } from '@/hooks/use-paywall';
import { useDailyFeed } from '@/hooks/use-daily-feed';
import { ShareButton, useFarcasterUser } from '@/neynar-farcaster-sdk/mini';
import { useIsEditor } from '@/hooks/use-is-editor';
import { WidgetPanel } from '@/features/app/components/widget-panel';
import type { WidgetId } from '@/features/app/components/widget-panel';
import { CopperTicker } from '@/features/app/components/copper-ticker';
import { usePaperSettings } from '@/hooks/use-paper-settings';
import { PAPER, parseMasthead, mastheadFontSize, mastheadTracking } from '@/config/paper';
import type { Teaser, TopToken } from '@/features/app/types';

const SF = { fontFamily: 'Arial,sans-serif' };
const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };

// ── Modal state ───────────────────────────────────────────────
interface ModalContent {
  label?: string;
  headline: string;
  byline?: string;
  body: string;
  sources?: { label: string; url: string }[];
}

// ── Token Stats Modal ─────────────────────────────────────────
function TokenStatsModal({
  tokens,
  onClose,
}: {
  tokens: TopToken[];
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<TopToken | null>(tokens[0] ?? null);

  const StatCell = ({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) => (
    <div className={`flex-1 text-center px-1 py-2 border-r last:border-0 ${theme.borderLight}`}>
      <div className={`text-[7px] uppercase tracking-widest font-bold mb-[2px] ${theme.mutedClass}`} style={SF}>
        {label}
      </div>
      <div
        className={`text-[11px] font-black leading-none ${
          highlight
            ? value?.startsWith('+')
              ? 'text-green-600'
              : value?.startsWith('-')
              ? 'text-red-600'
              : ''
            : ''
        }`}
      >
        {value ?? '—'}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ fontFamily: 'Arial,sans-serif' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div
        className={`relative mt-auto rounded-t-2xl shadow-2xl flex flex-col ${theme.bg} ${theme.text}`}
        style={{ maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 pt-4 pb-3 border-b ${theme.borderLight}`}>
          <div>
            <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${theme.mutedClass}`}>
              Tokens
            </div>
            <h2 className="text-[16px] font-black leading-tight uppercase" style={{ fontFamily: 'Georgia,"Times New Roman",serif' }}>
              Farcaster Token Tracker
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${theme.fill} ${theme.fillText}`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Token picker tabs */}
        <div className={`flex border-b overflow-x-auto ${theme.borderLight}`}>
          {tokens.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`shrink-0 px-3 py-2 text-[10px] font-black uppercase tracking-wide border-r ${theme.borderLight} transition-colors ${
                selected?.id === t.id ? `${theme.fill} ${theme.fillText}` : `${theme.mutedClass}`
              }`}
            >
              {t.symbol}
            </button>
          ))}
        </div>

        {/* Stats body */}
        <div className="overflow-y-auto">
          {selected && (
            <div className="px-4 py-4">
              {/* Current price row */}
              <div className={`border-2 mb-3 ${theme.border}`}>
                <div className={`text-[8px] font-bold uppercase tracking-widest px-3 py-[3px] border-b ${theme.borderLight} ${theme.mutedClass}`}>
                  Current Price
                </div>
                <div className="flex items-baseline gap-3 px-3 py-2">
                  <span className="text-[24px] font-black leading-none" style={{ fontFamily: 'Georgia,"Times New Roman",serif' }}>
                    {selected.price}
                  </span>
                  <span
                    className={`text-[14px] font-bold ${
                      selected.change?.startsWith('+') ? 'text-green-600' : selected.change?.startsWith('-') ? 'text-red-600' : ''
                    }`}
                  >
                    {selected.change} <span className={`text-[10px] ${theme.mutedClass}`}>24h</span>
                  </span>
                </div>
              </div>

              {/* Multi-period performance */}
              <div className={`border-2 mb-3 ${theme.border}`}>
                <div className={`text-[8px] font-bold uppercase tracking-widest px-3 py-[3px] border-b ${theme.borderLight} ${theme.mutedClass}`}>
                  Performance
                </div>
                <div className="flex">
                  <StatCell label="24h" value={selected.change} highlight />
                  <StatCell label="7d" value={selected.change7d} highlight />
                  <StatCell label="30d" value={selected.change30d} highlight />
                  <StatCell label="1y" value={selected.change1y} highlight />
                </div>
              </div>

              {/* Market stats */}
              <div className={`border-2 mb-3 ${theme.border}`}>
                <div className={`text-[8px] font-bold uppercase tracking-widest px-3 py-[3px] border-b ${theme.borderLight} ${theme.mutedClass}`}>
                  Market Stats
                </div>
                <div className="flex">
                  <StatCell label="Mkt Cap" value={selected.marketCap} />
                  <StatCell label="Vol 24h" value={selected.volume24h} />
                  <StatCell label="Mentions" value={selected.mentions?.toLocaleString()} />
                </div>
              </div>

              {/* Contract address */}
              {selected.contractAddress && (
                <div className={`border-2 ${theme.border}`}>
                  <div className={`text-[8px] font-bold uppercase tracking-widest px-3 py-[3px] border-b ${theme.borderLight} ${theme.mutedClass}`}>
                    Contract (Base)
                  </div>
                  <div className="px-3 py-2">
                    <p className={`text-[9px] font-mono break-all ${theme.mutedClass}`}>
                      {selected.contractAddress}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}

// ── Page 2 view ───────────────────────────────────────────────
function PageTwo({
  teaser,
  onBack,
}: {
  teaser: Teaser;
  onBack: () => void;
}) {
  const { theme } = useTheme();

  return (
    <div className={`h-full overflow-y-auto ${theme.bg} ${theme.text}`} style={SERIF}>
      <div className="px-2 py-2">
        {/* Page 2 header */}
        <div className={`border-2 mb-2 ${theme.border}`}>
          <div className={`border-b px-2 py-[3px] flex items-center justify-between ${theme.borderLight}`}>
            <button
              onClick={onBack}
              className={`text-[9px] uppercase tracking-widest font-bold flex items-center gap-1 ${theme.mutedClass}`}
              style={SF}
            >
              ← Front Page
            </button>
            <span className={`text-[9px] uppercase tracking-widest ${theme.mutedClass}`} style={SF}>
              Page {teaser.page}
            </span>
          </div>
          <div className="text-center px-2 py-2">
            <div className={`text-[9px] tracking-[0.3em] uppercase mb-1 ${theme.mutedClass}`} style={SF}>
              {PAPER.name.split(':')[0].trim()} — Section {teaser.section}
            </div>
            <div className="leading-none text-[1.4rem] font-black uppercase">
              {teaser.section}
            </div>
          </div>
        </div>

        {/* Section story */}
        {teaser.body ? (
          <div className={`border-2 p-4 ${theme.border}`}>
            {/* Section label */}
            <div
              className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${theme.mutedClass}`}
              style={SF}
            >
              {teaser.section} · Page {teaser.page}
            </div>

            {/* Headline */}
            <h1 className="text-[18px] font-black leading-tight uppercase mb-3">
              {teaser.blurb}
            </h1>

            {/* Rule */}
            <div className={`border-t mb-3 ${theme.borderLight}`} />

            {/* Body */}
            {teaser.body.split('\n\n').map((paragraph, i) => (
              <p
                key={i}
                className={`text-[13px] leading-relaxed mb-4 last:mb-0 ${i === 0 ? 'font-medium' : ''}`}
              >
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <div className={`border-2 p-4 text-center ${theme.border}`}>
            <p className={`text-[12px] italic ${theme.mutedClass}`} style={SF}>
              Full story coming in the next issue.
            </p>
          </div>
        )}

        {/* Bottom nav back */}
        <div className="mt-3 pb-2">
          <button
            onClick={onBack}
            className={`w-full py-3 text-[11px] font-bold uppercase tracking-widest border-2 ${theme.border} ${theme.mutedClass}`}
            style={SF}
          >
            ← Return to Front Page
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 4/20 Smoke & Leaf Overlay ─────────────────────────────────
// SVG pot leaf path (simplified 7-point cannabis leaf)
const POT_LEAF_PATH =
  'M12 2 C12 2 10 7 7 8 C4 9 1 7 1 7 C1 7 3 12 7 12 C7 12 6 15 5 17 C7 16 9 15 12 15 C15 15 17 16 19 17 C18 15 17 12 17 12 C21 12 23 7 23 7 C23 7 20 9 17 8 C14 7 12 2 12 2Z M12 15 L12 22';

function FourTwentyOverlay() {
  // Smoke puff positions (x%, bottom-offset)
  const smokes = [
    { cls: 'tribune-smoke-1', x: '8%',  size: 56 },
    { cls: 'tribune-smoke-2', x: '22%', size: 44 },
    { cls: 'tribune-smoke-3', x: '55%', size: 60 },
    { cls: 'tribune-smoke-4', x: '78%', size: 48 },
    { cls: 'tribune-smoke-5', x: '92%', size: 38 },
  ];
  // Falling leaf positions (x%, negative top to start above viewport)
  const leaves = [
    { cls: 'tribune-leaf-1', x: '5%',  size: 18, color: '#2d6a0a' },
    { cls: 'tribune-leaf-2', x: '30%', size: 22, color: '#4a9a16' },
    { cls: 'tribune-leaf-3', x: '60%', size: 16, color: '#2d6a0a' },
    { cls: 'tribune-leaf-4', x: '80%', size: 20, color: '#3d8a12' },
    { cls: 'tribune-leaf-5', x: '45%', size: 14, color: '#4a9a16' },
  ];

  return (
    /* pointer-events-none: overlay never blocks taps/clicks */
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 40 }}
      aria-hidden="true"
    >
      {/* ── Smoke puffs rising from bottom ── */}
      {smokes.map((s) => (
        <div
          key={s.cls}
          className={s.cls}
          style={{
            position: 'absolute',
            bottom: 60,
            left: s.x,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,230,140,0.55) 0%, rgba(180,230,140,0) 70%)',
            filter: 'blur(6px)',
          }}
        />
      ))}

      {/* ── Falling pot leaves ── */}
      {leaves.map((l) => (
        <div
          key={l.cls}
          className={l.cls}
          style={{ position: 'absolute', top: -30, left: l.x }}
        >
          <svg width={l.size} height={l.size} viewBox="0 0 24 24" fill={l.color} opacity={0.65}>
            <path d={POT_LEAF_PATH} strokeWidth="0.5" stroke={l.color} />
          </svg>
        </div>
      ))}

      {/* ── Corner pot leaves (decorative, pulsing) ── */}
      {/* Top-left */}
      <div className="tribune-420-corner" style={{ position: 'absolute', top: 8, left: 8 }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="#2d6a0a" opacity={0.22}>
          <path d={POT_LEAF_PATH} />
        </svg>
      </div>
      {/* Top-right */}
      <div className="tribune-420-corner" style={{ position: 'absolute', top: 8, right: 8, animationDelay: '1s' }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="#2d6a0a" opacity={0.22} style={{ transform: 'scaleX(-1)' }}>
          <path d={POT_LEAF_PATH} />
        </svg>
      </div>
      {/* Bottom-left */}
      <div className="tribune-420-corner" style={{ position: 'absolute', bottom: 80, left: 10, animationDelay: '1.5s' }}>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="#4a9a16" opacity={0.20}>
          <path d={POT_LEAF_PATH} />
        </svg>
      </div>
      {/* Bottom-right */}
      <div className="tribune-420-corner" style={{ position: 'absolute', bottom: 80, right: 10, animationDelay: '0.7s' }}>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="#4a9a16" opacity={0.20} style={{ transform: 'scaleX(-1)' }}>
          <path d={POT_LEAF_PATH} />
        </svg>
      </div>

      {/* ── Little joint in bottom-right corner ── */}
      <div
        className="tribune-joint"
        style={{ position: 'absolute', bottom: 100, right: 20 }}
      >
        <svg width={38} height={14} viewBox="0 0 38 14" fill="none">
          {/* Paper body */}
          <rect x="2" y="4" width="28" height="6" rx="3" fill="#f5f0e0" stroke="#2d6a0a" strokeWidth="1" />
          {/* Filter tip */}
          <rect x="28" y="5" width="6" height="4" rx="1" fill="#e8c88a" stroke="#c4a060" strokeWidth="0.8" />
          {/* Lit end */}
          <circle cx="3" cy="7" r="2.5" fill="#ff6600" opacity="0.9" />
          <circle cx="3" cy="7" r="1.5" fill="#ffaa00" />
          {/* Smoke wisp from lit end */}
          <path d="M1 4 Q0 1 2 0" stroke="rgba(180,230,140,0.7)" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M2 3 Q4 0 2 -2" stroke="rgba(180,230,140,0.5)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ── Main FrontPage ────────────────────────────────────────────
export function FrontPage({
  onCollectiblesOpen,
  previewMode = false,
  previewUnlocked = false,
}: {
  onCollectiblesOpen?: () => void;
  /** true = override paywall for preview purposes */
  previewMode?: boolean;
  /** when previewMode=true: true = show paid view, false = show locked view */
  previewUnlocked?: boolean;
}) {
  const { theme, setThemeId } = useTheme();
  const { settings: paperSettings } = usePaperSettings();

  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>(['art', 'weather', 'cat', 'anilist']);

  // Load theme + active widgets from DB on mount
  useEffect(() => {
    fetch('/api/theme', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { colorScheme?: string; activeWidgets?: string[] }) => {
        // 4/20 auto-activate
        const d = new Date();
        const is420 = d.getMonth() === 3 && d.getDate() === 20;
        if (is420 && (!data.colorScheme || data.colorScheme === 'bw')) {
          setThemeId('four20');
        }
        if (data.activeWidgets?.length) {
          setActiveWidgets(data.activeWidgets as WidgetId[]);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const issue = useCurrentIssue();
  const paywall = usePaywall(issue.issueId);
  // previewMode=true + previewUnlocked=true  → force fully open (paid reader)
  // previewMode=true + previewUnlocked=false → force locked (unpaid reader)
  // previewMode=false                        → real paywall state
  const unlocked = previewMode ? previewUnlocked : paywall.unlocked;
  const { grantReadAccess, grantMintAccess } = paywall;
  const { metadata, mainStory, secondaryLeft, secondaryRight, midStories, briefs, teasers, trackerTokens, editorialNote, leadSources, secondaryLeftSources, secondaryRightSources } = issue;
  const { feed, onChainInsight } = useDailyFeed();

  // Use curated tracker tokens from the issue if available, fall back to live feed pool
  const tokenModalTokens: TopToken[] = trackerTokens.length > 0
    ? trackerTokens
        .filter((t) => t.symbol)
        .map((t) => ({
          id: t.id,
          symbol: t.symbol,
          name: t.name || t.symbol,
          contractAddress: t.contractAddress || undefined,
          price: t.price,
          change: t.change24h,
          marketCap: t.marketCap,
          volume24h: t.volume24h,
          mentions: 0,
          imageUrl: t.imageUrl,
          signal: (t.change24h.startsWith('+') ? 'positive' : 'negative') as 'positive' | 'negative',
        }))
    : feed.topTokens;
  const { isEditor } = useIsEditor();
  const isMockData = issue.issueId === null && !issue.isLoading;
  const { data: fcUser } = useFarcasterUser();

  // ── Subscribe state ──────────────────────────────────────────
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subMsg, setSubMsg] = useState('');

  // Check subscription status on mount (if user is logged in)
  useEffect(() => {
    if (!fcUser?.fid) return;
    fetch(`/api/subscribe?fid=${fcUser.fid}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setSubscribed(d.subscribed ?? false))
      .catch(() => {});
  }, [fcUser?.fid]);

  async function handleSubscribe() {
    if (!fcUser?.fid || subscribing || subscribed) return;
    setSubscribing(true);
    setSubMsg('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: fcUser.fid,
          walletAddress: undefined,
          username: fcUser.username ?? undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSubscribed(true);
        setSubMsg(data.alreadySubscribed ? 'Already subscribed!' : 'Subscribed! You\'ll get pinged on new issues.');
        setTimeout(() => setSubMsg(''), 4000);
      }
    } catch {
      setSubMsg('Subscribe failed — try again.');
      setTimeout(() => setSubMsg(''), 3000);
    } finally {
      setSubscribing(false);
    }
  }

  async function handleUnsubscribe() {
    if (!fcUser?.fid || subscribing || !subscribed) return;
    setSubscribing(true);
    try {
      await fetch('/api/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: fcUser.fid }),
      });
      setSubscribed(false);
      setSubMsg('Unsubscribed.');
      setTimeout(() => setSubMsg(''), 3000);
    } catch {
      setSubMsg('Failed — try again.');
      setTimeout(() => setSubMsg(''), 3000);
    } finally {
      setSubscribing(false);
    }
  }

  const [modal, setModal] = useState<ModalContent | null>(null);
  const [page2, setPage2] = useState<Teaser | null>(null);
  const [tokenModal, setTokenModal] = useState(false);
  const [networkExpanded, setNetworkExpanded] = useState(false);

  const openModal = (content: ModalContent) => setModal(content);
  const closeModal = () => setModal(null);

  const handleOpenUrl = (url: string) => {
    try {
      sdk.actions.openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  if (page2) {
    return <PageTwo teaser={page2} onBack={() => setPage2(null)} />;
  }

  const is420Theme = theme.id === 'four20';

  // The nameplate is set from the paper's own settings, never hardcoded.
  const masthead = parseMasthead(paperSettings?.paperName || PAPER.name);
  const mastheadLongest = Math.max(...masthead.lines.map((l) => l.length), 1);
  const mastheadSize = mastheadFontSize(
    masthead.lines.reduce((a, b) => (a.length >= b.length ? a : b), ''),
  );
  const paperTagline = paperSettings?.tagline || PAPER.tagline;

  return (
    <div className={`overflow-y-auto ${theme.bg} ${theme.text}`} style={SERIF}>
      {/* 4/20 animated overlay — rendered outside scroll container, fixed to viewport */}
      {is420Theme && <FourTwentyOverlay />}

      <div className="px-2 py-2">

        {/* ── NAMEPLATE ── */}
        <div className={`border-2 mb-1 ${theme.border}`} style={is420Theme ? { position: 'relative', overflow: 'hidden' } : undefined}>
          {is420Theme && <div className="tribune-420-stripe" style={{ height: 4, width: '100%' }} />}

          {/* Top rule pair */}
          <div className={`h-[3px] ${theme.fill}`} />
          <div className={`h-px ${theme.fill} opacity-40 mb-0`} />

          {/* Meta row — issue / date / price */}
          <div className={`px-3 py-[4px] flex justify-between items-center border-b ${theme.borderLight}`}>
            <span className={`text-[8px] uppercase tracking-widest ${theme.mutedClass}`} style={SF}>{metadata.issueNumber} · {metadata.vol}</span>
            <span className={`text-[8px] uppercase tracking-widest ${theme.mutedClass}`} style={SF}>{metadata.date}</span>
            <span className={`text-[8px] uppercase tracking-widest ${theme.mutedClass}`} style={SF}>Price: {metadata.price}</span>
          </div>

          {/* Main nameplate block */}
          <div className="text-center px-3 pt-3 pb-2">
            {is420Theme && (
              <div className="text-[8px] tracking-[0.2em] uppercase mb-2 font-bold" style={{ ...SF, color: '#2d6a0a' }}>
                🌿 4/20 Special Edition 🌿
              </div>
            )}

            {/* Kicker line */}
            <div className={`text-[8px] tracking-[0.35em] uppercase mb-2 ${theme.mutedClass}`} style={SF}>
              {is420Theme ? 'High Thoughts · Sharp Headlines' : 'An MJ41 Publication · {metadata.version}'.replace('{metadata.version}', metadata.version)}
            </div>

            {/* Article — small, wide-tracked, sits above the name */}
            {masthead.article && (
              <div className="leading-none text-[1rem] font-black uppercase tracking-[0.55em]" style={SERIF}>
                {masthead.article}
              </div>
            )}

            {/* The name — one or two dominant decks, tracked to fill equal width */}
            {masthead.lines.map((line, i) => (
              <div
                key={`${line}-${i}`}
                className="leading-none font-black uppercase"
                style={{
                  ...SERIF,
                  fontSize: `${mastheadSize}rem`,
                  letterSpacing: mastheadTracking(line, mastheadLongest),
                  lineHeight: 1.0,
                }}
              >
                {line}
              </div>
            ))}

            {/* Subtitle rule + text */}
            {masthead.subtitle && (
              <div className={`flex items-center gap-2 mt-2 mb-1`}>
                <div className={`flex-1 h-px ${theme.fill}`} />
                <span className={`text-[8px] tracking-[0.3em] uppercase font-bold ${theme.mutedClass}`} style={SF}>
                  {is420Theme ? `🌿 ${masthead.subtitle} 🌿` : masthead.subtitle}
                </span>
                <div className={`flex-1 h-px ${theme.fill}`} />
              </div>
            )}
          </div>

          {/* Bottom strip — tagline + theme picker */}
          <div className={`border-t px-3 py-[4px] flex items-center justify-between ${theme.borderLight}`}>
            <span className={`text-[8px] uppercase tracking-widest ${theme.mutedClass}`} style={SF}>
              {is420Theme ? '"Smoke \'em if you got \'em"' : `"${paperTagline}"`}
            </span>
            <ThemePicker />
          </div>
          {is420Theme && <div className="tribune-420-stripe" style={{ height: 4, width: '100%', animationDirection: 'reverse' }} />}
        </div>

        {/* ── COPPER PRICE TICKER ── */}
        <CopperTicker />

        {/* ── MOCK DATA NOTICE (editor only) ── */}
        {isMockData && isEditor && (
          <div className="mb-1 px-3 py-2 bg-amber-50 border-2 border-amber-400 rounded" style={SF}>
            <div className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-[2px]">
              ⚠ Preview Mode — No Published Issue
            </div>
            <p className="text-[10px] text-amber-800 leading-snug">
              This is placeholder content. Go to the <strong>Editor</strong> tab to build and publish Issue #2.
            </p>
          </div>
        )}

        {/* ── EDITORIAL NOTE ── */}
        {editorialNote && (
          <div className={`border-2 mb-1 px-3 py-2 ${theme.border}`}>
            <div className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${theme.mutedClass}`} style={SF}>
              Editor&apos;s Note
            </div>
            <p className="text-[11px] leading-snug italic">{editorialNote}</p>
          </div>
        )}

        {/* ── HEADLINE ROW ── Full-width lead story */}
        <div className={`border-2 mb-1 ${theme.border}`}>
          <button
            className={`w-full p-3 text-left active:opacity-70 transition-opacity cursor-pointer`}
            onClick={() => openModal({
              headline: mainStory.headline,
              byline: mainStory.byline,
              body: unlocked
                ? mainStory.body
                : '🔒 Unlock this issue to read the full lead story.',
              sources: unlocked ? leadSources : undefined,
            })}
          >
            <p className="text-[15px] font-black leading-tight uppercase">
              {mainStory.headline}
              <span className="ml-1 text-[10px] opacity-40">↗</span>
            </p>
            <div className={`my-1 border-t border-b py-[2px] ${theme.borderLight}`}>
              <p className={`text-[8px] italic ${theme.mutedClass}`} style={SF}>{mainStory.byline}</p>
            </div>
            <p className={`text-[10px] leading-snug line-clamp-3 ${
              unlocked ? 'opacity-75' : 'opacity-25 italic'
            }`}>
              {unlocked ? mainStory.body : 'Pay $0.01 to unlock. Tap to see payment options.'}
            </p>
          </button>
        </div>

        {/* ── WIDGET PANEL ── Replaces secondary left + right columns */}
        <WidgetPanel activeWidgets={activeWidgets} />

        {/* Feature image removed — nameplate above is the canonical masthead */}

        {/* ── PAYWALL ── */}
        {!unlocked && (
          <PaywallGate
            issueId={issue.issueId}
            issueNumber={metadata.issueNumber}
            onReadUnlock={grantReadAccess}
            onMintUnlock={grantMintAccess}
            onCollectiblesOpen={onCollectiblesOpen}
          />
        )}

        {/* ── MID STORIES ── */}
        <div className={`border-2 mb-1 ${theme.border}`}>
          <div className="flex" style={{ height: 88 }}>
            {midStories.map((s, i) => {
              const isTokens = s.label.toUpperCase() === 'TOKENS';
              const isNetwork = s.label.toUpperCase() === 'NETWORK';
              const hasAction = unlocked && (isTokens || isNetwork || !!s.body);
              return (
                <button
                  key={i}
                  className={`flex-1 p-2 text-left overflow-hidden active:opacity-70 transition-opacity ${
                    i < 2 ? `border-r ${theme.borderLight}` : ''
                  } ${hasAction ? 'cursor-pointer' : 'cursor-default'} ${isNetwork && networkExpanded ? theme.fillLight : ''}`}
                  onClick={() => {
                    if (!unlocked) return;
                    if (isTokens) setTokenModal(true);
                    else if (isNetwork) setNetworkExpanded((v) => !v);
                    else if (s.body) openModal({ label: s.label, headline: s.headline, body: s.body });
                  }}
                >
                  <div className={`text-[8px] font-bold uppercase tracking-wider mb-[3px] ${theme.mutedClass}`} style={SF}>
                    {s.label}
                    {hasAction && <span className="ml-1 opacity-40">{isNetwork ? (networkExpanded ? '▲' : '▼') : '↗'}</span>}
                  </div>

                  {/* TOKENS box — show live mini ticker instead of headline */}
                  {isTokens ? (
                    <div className={`space-y-[2px] ${!unlocked ? 'opacity-30' : ''}`}>
                      {tokenModalTokens.slice(0, 3).map((t) => {
                        const up = t.change?.startsWith('+');
                        const flat = t.change === '—' || !t.change;
                        return (
                          <div key={t.id} className="flex items-center justify-between leading-none">
                            <span className="text-[9px] font-black tracking-tight">{t.symbol}</span>
                            <span className={`text-[8px] font-bold ml-1 ${flat ? 'opacity-40' : up ? 'text-green-600' : 'text-red-500'}`}>{t.change}</span>
                          </div>
                        );
                      })}
                      {tokenModalTokens.length > 3 && (
                        <p className={`text-[7px] uppercase tracking-wide ${theme.mutedClass}`} style={SF}>
                          +{tokenModalTokens.length - 3} more ↗
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className={`text-[10px] font-bold leading-tight line-clamp-2 ${!unlocked ? 'opacity-30' : ''}`}>
                        {s.headline}
                      </p>
                      {unlocked && (
                        <p className={`text-[8px] leading-snug mt-[2px] line-clamp-2 ${theme.mutedClass}`}>{s.summary}</p>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── NETWORK EXPANDED PANEL ── */}
          {networkExpanded && unlocked && (
            <div className={`border-t p-2 ${theme.borderLight}`}>
              <p className={`text-[8px] font-black uppercase tracking-widest mb-2 ${theme.mutedClass}`} style={SF}>
                📡 Protocol Stats · Live
              </p>
              <div className="grid grid-cols-3 gap-[1px] mb-[1px]">
                {[
                  { label: 'DAU', value: feed.networkStats.dau, sub: feed.networkStats.dauChange !== '—' ? feed.networkStats.dauChange : null },
                  { label: 'Casts Today', value: feed.networkStats.castsToday, sub: null },
                  { label: 'New Users', value: feed.networkStats.newToday, sub: null },
                  { label: 'Total Users', value: feed.networkStats.totalAccounts, sub: null },
                  { label: 'Total Casts', value: feed.networkStats.totalCasts ?? '—', sub: null },
                  { label: 'Channels', value: feed.networkStats.totalChannels ?? '—', sub: null },
                  { label: 'Reactions', value: feed.networkStats.reactionsToday ?? '—', sub: null },
                  { label: 'Follows', value: feed.networkStats.followsToday ?? '—', sub: null },
                  { label: 'Verified', value: feed.networkStats.verifiedUsers ?? '—', sub: null },
                ].map((s) => (
                  <div key={s.label} className={`border text-center px-1 py-[5px] mb-[1px] ${theme.borderLight}`}>
                    <p className="text-[10px] font-bold leading-none">{s.value}</p>
                    {s.sub && <p className="text-[7px] font-bold text-green-500">{s.sub}</p>}
                    <p className={`text-[6px] uppercase tracking-wide mt-[2px] ${theme.mutedClass}`} style={SF}>{s.label}</p>
                  </div>
                ))}
              </div>
              {onChainInsight && (
                <div className={`border-t pt-2 mt-1 ${theme.borderLight}`}>
                  <p className={`text-[7px] font-black uppercase tracking-widest mb-1 ${theme.mutedClass}`} style={SF}>
                    ⛓ On-Chain
                    <span className={`ml-1 font-normal ${onChainInsight.difficulty === 'expert' ? 'text-purple-500' : 'text-blue-500'}`}>
                      [{onChainInsight.difficulty}]
                    </span>
                  </p>
                  <p className={`text-[9px] leading-snug ${theme.text}`} style={SF}>{onChainInsight.text}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── NEW APPS SHOWCASE (app briefs with name/author) ── */}
        {(() => {
          const appBriefs = briefs.filter((b) => b.tag === 'APPS' && b.appName);
          if (appBriefs.length === 0) return null;
          return (
            <div className={`border-2 mb-1 ${theme.border}`}>
              <div className={`flex items-center justify-between border-b px-2 py-[3px] ${theme.borderLight} ${theme.fillLight}`}>
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.text}`} style={SF}>
                  📱 Mini App Showcase
                </span>
                <span className={`text-[8px] uppercase tracking-wide ${theme.mutedClass}`} style={SF}>
                  {appBriefs.length} launching today
                </span>
              </div>
              <div className={`divide-y ${theme.borderLight}`}>
                {appBriefs.slice(0, 3).map((app, i) => (
                  <button
                    key={i}
                    onClick={() => app.url && unlocked && handleOpenUrl(app.url)}
                    className={`w-full flex items-center gap-3 px-3 py-[7px] text-left transition-opacity ${
                      app.url && unlocked ? 'active:opacity-60 cursor-pointer' : 'cursor-default'
                    } ${!unlocked ? 'opacity-40' : ''}`}
                  >
                    {/* App icon placeholder */}
                    <div className={`shrink-0 w-8 h-8 flex items-center justify-center border text-[14px] ${theme.borderLight} ${theme.fillLight}`}>
                      📱
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1">
                        <p className="text-[11px] font-black leading-none">{app.appName}</p>
                        {app.url && unlocked && <span className="text-[8px] opacity-40">↗</span>}
                      </div>
                      <p className={`text-[9px] leading-tight mt-[1px] line-clamp-1 ${theme.mutedClass}`} style={SF}>
                        {app.text.replace(/^🆕 [^:]+:\s*/, '')}
                      </p>
                    </div>
                    <span className={`text-[8px] font-bold shrink-0 ${theme.mutedClass}`} style={SF}>
                      {app.appAuthor}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── BRIEFS ── fixed height, non-app briefs only */}
        {(() => {
          const textBriefs = briefs.filter((b) => !b.appName || b.tag !== 'APPS');
          if (textBriefs.length === 0) return null;
          return (
            <div className={`border-2 mb-1 ${theme.border}`}>
              <div
                className={`text-[9px] font-black uppercase tracking-[0.2em] border-b px-2 py-[3px] text-center ${theme.borderLight} ${theme.fillLight}`}
                style={SF}
              >
                Today&apos;s Briefs
              </div>
              <div className="px-2 py-[3px]">
                {textBriefs.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-baseline py-[3px] border-b border-dashed last:border-0 ${theme.borderDashed} ${!unlocked ? 'opacity-30' : ''}`}
                  >
                    <p className="text-[9px] leading-tight line-clamp-1">{item.text}</p>
                    <span className={`text-[8px] font-bold ml-2 shrink-0 uppercase ${theme.mutedClass}`} style={SF}>
                      {item.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── TEASERS (Section Links → Page 2) ── fixed height, 4 equal cols */}
        <div className={`border-2 mb-2 flex ${theme.border}`} style={{ height: 64 }}>
          {teasers.map((t, i) => (
            <button
              key={i}
              className={`flex-1 p-2 text-center overflow-hidden active:opacity-70 transition-opacity ${
                unlocked ? 'cursor-pointer' : 'cursor-default opacity-40'
              } ${i < 3 ? `border-r ${theme.borderLight}` : ''}`}
              onClick={() => unlocked && setPage2(t)}
            >
              <p className="text-[8px] font-black uppercase tracking-wide" style={SF}>{t.section}</p>
              <p className={`text-[7px] italic leading-tight mt-[2px] line-clamp-2 ${theme.mutedClass}`}>&quot;{t.blurb}&quot;</p>
              {unlocked && <p className="text-[7px] mt-[2px] font-bold" style={SF}>pg. {t.page} →</p>}
            </button>
          ))}
        </div>

        {/* ── SUBSCRIBE — free, whitelists address ── */}
        {fcUser?.fid && (
          <div className={`border-2 mb-2 ${theme.border}`}>
            <div className={`border-b px-2 py-[3px] text-center text-[9px] font-black uppercase tracking-[0.2em] ${theme.borderLight} ${theme.fillLight}`} style={SF}>
              Tribune Subscribers
            </div>
            <div className="px-3 py-3">
              {subscribed ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px]">✅</span>
                    <div>
                      <p className="text-[11px] font-black leading-none">You&apos;re subscribed</p>
                      <p className={`text-[8px] mt-[2px] leading-snug ${theme.mutedClass}`} style={SF}>
                        You&apos;ll get pinged on new issues and features. Still pay per issue to read.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleUnsubscribe}
                    disabled={subscribing}
                    className={`text-[8px] uppercase tracking-widest font-bold ${theme.mutedClass} opacity-60 hover:opacity-100 disabled:opacity-30`}
                    style={SF}
                  >
                    {subscribing ? '⏳' : 'Unsubscribe'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className={`text-[10px] leading-snug ${theme.mutedClass}`} style={SF}>
                    Subscribe free — get notified when new issues drop and your address gets whitelisted. Still pay to read each issue.
                  </p>
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing || subscribed === null}
                    className={`w-full border-2 py-3 text-[11px] font-black uppercase tracking-widest min-h-[44px] transition-opacity disabled:opacity-40 ${theme.border} ${theme.fill} ${theme.fillText}`}
                    style={SF}
                  >
                    {subscribing ? '⏳ Subscribing…' : '📬 Subscribe Free'}
                  </button>
                </div>
              )}
              {subMsg && (
                <p className="text-[9px] mt-1 font-bold" style={SF}>{subMsg}</p>
              )}
            </div>
          </div>
        )}

        {/* ── SHARE — visible to ALL readers ── */}
        {(() => {
          const qs = new URLSearchParams({
            issueNumber: metadata.issueNumber,
            vol: metadata.vol,
            date: metadata.date,
            headline: mainStory.headline.slice(0, 120),
            secLeft: secondaryLeft.headline.slice(0, 80),
            secRight: secondaryRight.headline.slice(0, 80),
            ...(briefs[0] ? { brief1: briefs[0].text.slice(0, 80) } : {}),
            ...(briefs[1] ? { brief2: briefs[1].text.slice(0, 80) } : {}),
            ...(briefs[2] ? { brief3: briefs[2].text.slice(0, 80) } : {}),
          }).toString();
          const shortName = (paperSettings?.paperName || PAPER.name).split(':')[0].trim();
          const shareText = unlocked
            ? `${metadata.issueNumber} of ${shortName} is out 📰\n\n"${mainStory.headline.slice(0, 100)}"\n\nRead the full issue:`
            : `Today's ${shortName} is out 📰 — "${mainStory.headline.slice(0, 80)}" — tap to read:`;
          return (
            <div className="pb-2 px-2">
              <ShareButton
                className="w-full"
                path={`/api/share/image/front-page?${qs}`}
                text={shareText}
              >
                {unlocked ? `Share ${metadata.issueNumber}` : '📢 Share Today\'s Issue'}
              </ShareButton>
            </div>
          );
        })()}
      </div>

      {/* ── STORY MODAL ── */}
      {modal && (
        <StoryModal
          label={modal.label}
          headline={modal.headline}
          byline={modal.byline}
          body={modal.body}
          sources={modal.sources}
          onClose={closeModal}
        />
      )}

      {/* ── TOKEN STATS MODAL ── */}
      {tokenModal && (
        <TokenStatsModal
          tokens={tokenModalTokens}
          onClose={() => setTokenModal(false)}
        />
      )}
    </div>
  );
}
