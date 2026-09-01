// ── THE DAILY TRIBUNE — APP-WIDE TYPES ───────────────────────

// ── THEME ────────────────────────────────────────────────────

export type ThemeId =
  | 'bw'
  | 'purple'
  | 'inverted'
  | 'cream'
  | 'terminal'
  | 'sepia'
  | 'telegraph'
  | 'crimson'
  | 'rainbow'
  | 'sunset'
  | 'four20';

export interface Theme {
  id: ThemeId;
  name: string;
  emoji: string;
  bg: string;
  text: string;
  border: string;
  borderLight: string;
  borderDashed: string;
  fill: string;
  fillText: string;
  fillLight: string;
  buttonUnselected: string;
  svgBg: string;
  svgFg: string;
  svgText: string;
  mutedClass: string;
}

// ── ISSUE ─────────────────────────────────────────────────────

export interface IssueMetadata {
  version: string;
  editor: string;
  issueNumber: string;  // e.g. "Issue #2"
  vol: string;          // e.g. "Vol. 1"
  date: string;
  price: string;
  website: string;
}

// ── STORIES ──────────────────────────────────────────────────

export interface MainStory {
  headline: string;
  byline: string;
  body: string;
}

export interface SecondaryStory {
  label: string;
  headline: string;
  summary: string;
  body?: string;
}

export interface MidStory {
  label: string;
  headline: string;
  summary: string;
  body?: string;
}

export interface Brief {
  text: string;
  tag: string;
  url?: string;      // Optional link — used for mini app briefs
  appName?: string;  // App name for card display
  appAuthor?: string; // Builder handle for card display
}

export interface Teaser {
  section: string;
  blurb: string;
  page: string;
  body?: string;
}

// ── CURATOR / EDITOR ─────────────────────────────────────────

export type Slot = 'lead' | 'negative' | 'positive' | 'channel' | 'token';

export type Picks = Partial<Record<Slot, string>>;

export interface ArticleSource {
  label: string;
  url: string;
}

export interface WriteInContent {
  headline: string;
  body: string;
  byline: string;
  sources?: ArticleSource[];
  // Token write-in extra fields
  tokenName?: string;
  tokenTicker?: string;
  tokenCA?: string;
}

export interface MiniAppWriteIn {
  name: string;
  author: string;
  desc: string;
  url: string;
}

export type WriteIns = Partial<Record<Slot, WriteInContent>>;

export type WriteInMode = Partial<Record<Slot, boolean>>;

export interface SlotDefinition {
  id: Slot;
  label: string;
  required: boolean;
}

// ── NEYNAR FEED DATA ─────────────────────────────────────────

export interface TrendingCast {
  id: string;
  author: string;
  text: string;
  likes: number;
  recasts: number;
  signal: 'positive' | 'negative';
}

export interface TopChannel {
  id: string;
  name: string;
  members: string;
  casts24h: number;
  growth: string;
}

export interface TopToken {
  id: string;
  symbol: string;
  name?: string;
  mentions: number;
  price: string;
  change: string;
  signal: 'positive' | 'negative';
  // Optional extended stats for the token modal
  change7d?: string;
  change30d?: string;
  change1y?: string;
  marketCap?: string;
  volume24h?: string;
  contractAddress?: string;
  imageUrl?: string;
}

export interface MiniApp {
  id: string;
  name: string;
  desc: string;
  author: string;
  url?: string;      // Link to the mini app
  imageUrl?: string; // App icon/logo URL
}

export interface NetworkStats {
  // Trending engagement (top-10 casts, last 24h)
  trendingCasts?: number;
  totalLikes?: string;
  totalRecasts?: string;
  totalReplies?: string;
  engagementTotal?: string;
  topCast?: { text: string; author: string; likes: number } | null;
  // Channel health
  channelCount?: number;
  totalChannelFollowers?: string;
  topChannel?: { name: string; followers: number } | null;
  // Power user network
  powerUserCount?: number;
  avgNeynarScore?: string | null;
  topPowerUser?: { username: string; score: number } | null;
  fetchedAt?: string;
  // Legacy fields kept for mock/fallback data compatibility
  totalAccounts?: string;
  dau?: string;
  dauChange?: string;
  newToday?: string;
  castsToday?: string;
  totalCasts?: string;
  totalChannels?: string;
  verifiedUsers?: string;
  reactionsToday?: string;
  followsToday?: string;
}

export interface MockFeed {
  deadline: string;
  timeLeft: string;
  autoSelectsIn: string;
  trendingCasts: TrendingCast[];
  topChannels: TopChannel[];
  topTokens: TopToken[];
  newMiniApps: MiniApp[];
  networkStats: NetworkStats;
  newsCategories?: NewsCategories;
}

// ── EXTERNAL NEWS ─────────────────────────────────────────────

export type NewsCategory = 'technology' | 'business' | 'sports' | 'blockchain' | 'science';

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  technology: 'Technology',
  business: 'Business',
  sports: 'Sports',
  blockchain: 'Blockchain',
  science: 'Science',
};

export interface NewsStory {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  category: NewsCategory;
}

export type NewsCategories = Record<NewsCategory, NewsStory[]>;

// ── TOKEN TRACKER ─────────────────────────────────────────────

export interface TrackerToken {
  id: string;            // unique slot id: "slot-0" … "slot-5"
  symbol: string;
  name: string;
  contractAddress: string;
  network: string;
  price: string;
  change24h: string;
  marketCap?: string;
  volume24h?: string;
  imageUrl?: string;
  // Used when slot is manually edited without gecko lookup
  manual?: boolean;
}

// ── ARCHIVE ───────────────────────────────────────────────────

export interface ArchiveIssue {
  issue: number;
  vol: number;
  date: string;
  price: string;
  lead: string;
  secondary: string[];
  mints: number;
  readers: number;
  revenue: string;
  autoPublished: boolean;
}

export type ArchiveView = 'list' | 'detail';

// ── SETTINGS ─────────────────────────────────────────────────

export interface TimezoneOption {
  label: string;
  offset: string;
}

export interface FallbackOption {
  id: string;
  label: string;
  desc: string;
}

export type PayOption = 'usdc' | 'eth' | 'rwac';

export interface PaymentOption {
  id: PayOption;
  label: string;
  amount: string;
  sub: string;
}
