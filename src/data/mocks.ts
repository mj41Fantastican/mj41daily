// ── THE DAILY FARCASTER TRIBUNE — MOCK DATA ────────────────────────────
// All hardcoded data lives here. Phase 5 will replace with real API calls.

import type {
  IssueMetadata,
  MainStory,
  SecondaryStory,
  MidStory,
  Brief,
  Teaser,
  MockFeed,
  ArchiveIssue,
  TimezoneOption,
  FallbackOption,
  Theme,
  ThemeId,
} from '@/features/app/types';

// ── ISSUE METADATA ────────────────────────────────────────────

export const MOCK_ISSUE: IssueMetadata = {
  version: 'v2',
  editor: '@mj41fantastican',
  issueNumber: 'Issue #1',
  vol: 'Vol. 1',
  date: 'Saturday, March 7, 2026',
  price: '$0.041',
  website: 'dailyfarcaster.fc',
};

// ── FRONT PAGE CONTENT ────────────────────────────────────────

export const MOCK_MAIN_STORY: MainStory = {
  headline: "Today's Issue Is Being Prepared — Check Back Shortly",
  byline: 'Editorial Staff · Coming Soon',
  body: `Today marks the first edition of The Daily Farcaster Tribune — a daily newspaper built for and on Farcaster. Our mission is simple: to make sure news travels more evenly across the network.

Farcaster's algorithmic feeds favor the already-seen. Large accounts get larger. Smaller builders, writers, and creators get buried. We're here to fix that — one front page at a time.

We're actively recruiting writers and contributors. We're even exploring bringing on a dedicated journalist to give coverage the depth that pure curation can't provide.

Welcome to The Daily Farcaster Tribune. Issue #2 drops tomorrow.`,
};

export const MOCK_SECONDARY_LEFT: SecondaryStory = {
  label: '⚠ CLOSING',
  headline: 'Bracky Shuts Its Doors',
  summary:
    '@bracky, one of Farcaster\'s earliest and most beloved bots, has gone offline. In a final cast that stunned the community, @bracky wrote: "This will be my last cast. Thank you all." The post drew hundreds of replies within minutes — tributes, memories, and heartfelt goodbyes from across the network. A fixture of Farcaster since its earliest days, Bracky\'s absence marks the end of an era.',
  body: `@bracky was not a bot in the conventional sense. Launched in the early days of the network, it occupied a unique role — part utility, part personality, part mascot. Its responses to casts were fast, occasionally witty, and reliably present in ways that human accounts rarely managed.\n\nThe final cast — "This will be my last cast. Thank you all." — was posted at 3:47 AM UTC and drew 876 likes and 445 recasts before the account went silent. Replies came in waves: first confusion, then grief, then a long thread of tributes from builders who had interacted with @bracky since their first days on the protocol.\n\nNo explanation was offered for the shutdown. The account's creator, who has never publicly identified themselves, did not respond to cast replies asking for comment. Speculation ranges from a personal decision to sunset the project to infrastructure costs becoming unsustainable.\n\nWhat @bracky represented — a non-human presence that nonetheless felt like a community member — is harder to replace than the bot itself. Several builders have already proposed tribute accounts. None of them are likely to fill the same space.`,
};

export const MOCK_SECONDARY_RIGHT: SecondaryStory = {
  label: '✦ MILESTONE',
  headline: 'Cast 0xdf7b38f4 Sparks Community Wave',
  summary:
    'A cast caught fire this week, drawing hundreds of replies. A reminder of how organically Farcaster communities rally around an idea.',
  body: `The cast in question asked a simple question: "What did you build this week?" Posted on a Tuesday afternoon with no accompanying thread or context, it accumulated 634 replies over 48 hours — an unusual number for a single cast that didn't come from one of the network's largest accounts.\n\nWhat made it work was the replies themselves. Builders, writers, channel moderators, and first-time posters all responded. The thread became an informal showcase of work that would otherwise have stayed buried in individual profiles: side projects, channel experiments, frame tools, small essays, single good casts.\n\nThe moment is notable less for the original cast than for what the responses revealed: a large number of people doing quiet, consistent work on Farcaster who rarely see engagement beyond their immediate followers. The algorithmic feed, optimized for recasts and reactions, doesn't surface this kind of low-key productivity well.\n\nSeveral people in the replies have proposed turning the question into a weekly recurring thread. Whether it retains the organic energy of the original remains to be seen — these things rarely do — but the appetite is clearly there.`,
};

export const MOCK_MID_STORIES: MidStory[] = [
  {
    label: 'ON-CHAIN',
    headline: '/zora Channel Hits 10K Members',
    summary: "One of Farcaster's most active collector communities with 500+ daily casts.",
    body: `The /zora channel crossed 10,000 members yesterday, making it one of the ten largest channels on the network by membership. The milestone is notable because /zora's growth has been entirely organic — no incentive campaigns, no airdrop farming, just a consistent daily cast volume from a community genuinely interested in on-chain collecting.\n\nThe channel's moderators have cultivated a culture that rewards discovery over volume. Daily posts highlighting overlooked collections, mint alerts, and collector commentary have made it a destination for people who want signal rather than noise in the NFT space.\n\nDaily cast count sits at 500+, with peak activity between 2 PM and 6 PM UTC. Engagement per cast is significantly higher than the platform average, suggesting the membership is active rather than passive. Several collectors in the channel have publicly credited /zora with introducing them to projects they later minted at significant gains.`,
  },
  {
    label: 'NETWORK',
    headline: 'Farcaster Tops 500K Accounts',
    summary: 'Daily active casters up 18% month-over-month, with mini apps driving new signups.',
    body: `Farcaster crossed 500,000 registered accounts this week, according to network stats surfaced by several analytics tools. The number carries symbolic weight for a protocol that spent much of 2023 and early 2024 growing slowly and deliberately.\n\nMore meaningful than the total account count is the daily active figure: 48,391 accounts casting at least once in the last 24 hours, up 18% from a month ago. The growth is being attributed primarily to mini apps, which have dramatically lowered the barrier to meaningful participation. Users who would never compose a written cast will tap through a mini app daily.\n\nNew account signups today numbered 1,847, with mini app referrals accounting for an estimated 60% of new registrations. The cast count for the day sits at 234,109 — a number that would have been remarkable eighteen months ago and is now routine.\n\nThe protocol's next threshold to watch is DAU above 50,000, which several data trackers expect within the next two to three weeks.`,
  },
  {
    label: 'TOKENS',
    headline: '$DEGEN Volume Climbs Past $2M',
    summary:
      'Cumulative tip volume surpassed $2M. The token remains the most tipped on the network.',
    body: `$DEGEN's cumulative tip volume crossed $2 million this week, a milestone that would have seemed implausible when the token launched as an experiment in channel-native value transfer. The token, distributed via tips in the /degen channel and beyond, has outlasted dozens of competitors to remain the dominant tip currency on the network.\n\nThe $2M figure represents tips sent, not market capitalization — a distinction worth emphasizing. This is real value transferred between users as a form of social acknowledgment, which gives the number a different character than a price chart milestone.\n\nCurrent price sits at $0.0041, with 24-hour volume up 18% following a cluster of high-engagement casts that triggered large tip distributions. The /degen channel's 102,000 members make it the most active community on the network by cast count, and the token's integration into the channel's culture has proven remarkably durable.\n\nCompetitor tip tokens continue to launch and fade. $DEGEN's persistence suggests that first-mover advantage in social token mechanics is more durable than many observers expected.`,
  },
];

export const MOCK_BRIEFS: Brief[] = [
  { text: '🆕 /poll launches daily voting frames', tag: 'APPS' },
  { text: '🪙 $FRAME token launched by builder collective', tag: 'TOKENS' },
  { text: '🔧 Warpcast adds reply threading improvements', tag: 'BUILDER' },
  { text: '🌐 /books channel: 2.3K members, daily recs', tag: 'CHANNELS' },
  { text: '📱 Supercast ships v2 notification filters', tag: 'APPS' },
];

export const MOCK_TEASERS: Teaser[] = [
  {
    section: 'Protocol',
    blurb: 'How FIDs will scale to 10M',
    page: 'A2',
    body: `The question of how Farcaster's FID system scales to ten million users has quietly become one of the protocol's most important engineering challenges. Currently, FIDs are assigned sequentially from a small set of registries — a model that works elegantly at hundreds of thousands of accounts but strains under the weight of a mass-market network.\n\nCore contributors have been exploring two paths: a sharded registry model where FID ranges are distributed across multiple independent contracts, and a hybrid approach that keeps the root registry on-chain while pushing metadata resolution off-chain to a decentralized storage layer.\n\nThe sharded approach is cleaner in theory but introduces coordination complexity when resolving custody across chains. The hybrid model trades some decentralization for speed, which has divided the technical community. A formal FIP is expected before the end of Q2. Whatever direction is chosen, the implications will ripple across every client, indexer, and third-party app built on the protocol.`,
  },
  {
    section: 'Culture',
    blurb: 'Meme channels redefining fc tone',
    page: 'B1',
    body: `There's a quiet cultural shift underway on Farcaster, and it's being driven not by builders or investors but by the meme channels. Spaces like /lp, /memes, and the recently-launched /gm-or-die have become hubs of a distinctly Farcaster sensibility — irreverent, self-aware, and oddly intellectual.\n\nWhat makes Farcaster meme culture different from Twitter or Reddit is the density of context. References to FIDs, frame exploits, and arcane DAO governance decisions appear casually alongside absurdist humor. It's a community laughing at itself from the inside, which gives the content a warmth that broadcast-style networks rarely produce.\n\nThe growth numbers back this up. Meme-heavy channels have among the highest cast-per-member ratios on the network, and they disproportionately attract new users who stick around. Some veteran builders have credited meme channels with being the real onboarding funnel — not the protocol documentation or the client tutorials, but the jokes.`,
  },
  {
    section: 'Builders',
    blurb: 'Five mini apps to watch',
    page: 'C1',
    body: `The mini app ecosystem is maturing fast, and five projects in particular have caught the attention of builders and investors alike this week.\n\n**WordCast** by @accountless turns the daily word game format into a Farcaster-native social experience. Streaks are public, scores are cast automatically, and channels have formed around shared daily results. Daily active users crossed 5,000 this week.\n\n**TipDash** by @web3pm solves a real problem: tracking your $DEGEN tip history across dozens of casts is tedious. TipDash aggregates it into a clean dashboard with weekly summaries and recipient analytics.\n\n**ChanStats** by @ccarella gives channel moderators the data they've been missing — member growth curves, cast velocity, and churn rates, all in one view.\n\n**CastPoll** by @rish is exactly what it sounds like, but the implementation is slick. Polls close automatically, results are tallied on-chain, and the winning option gets auto-cast to the channel.\n\n**GlassFrame** is the dark horse. No public launch yet, but a private beta invite went to 200 builders last Tuesday. Early screenshots suggest it's a new kind of curation tool — but details are being kept close.`,
  },
  {
    section: 'Tokens',
    blurb: 'Daily launches: the new wave',
    page: 'D1',
    body: `Token launches on Farcaster have entered a new phase. The era of community-wide fanfare around each new launch has given way to a quieter, faster-moving rhythm — five to fifteen new tokens a day, most born inside specific channels, many gone within a week.\n\nThe pattern has become familiar: a builder or creator launches a token tied to their channel or cast activity. A core group of early holders forms within hours. If the token catches a mention from a high-follower account, volume spikes. If it doesn't, it quietly fades.\n\n$FRAME is the latest to escape this cycle with genuine momentum. Launched by a loose collective of frame builders, it trades at a small premium to most channel tokens and has developed actual utility as a coordination mechanism for frame development bounties.\n\nThe critical question facing this wave of launches is whether token utility can precede token price — whether the community can sustain interest long enough to build something real before the initial excitement fades. A small number of tokens from earlier waves have managed it. The new launches are watching closely.`,
  },
];

// ── CURATOR / NEYNAR FEED ─────────────────────────────────────

export const MOCK_FEED: MockFeed = {
  deadline: '12:00 UTC',
  timeLeft: '3h 42m',
  autoSelectsIn: '3h 42m',

  trendingCasts: [
    {
      id: 'c1',
      author: '@v',
      text: 'Protocol upgrade ships today — FIP-8 is live',
      likes: 1204,
      recasts: 341,
      signal: 'positive',
    },
    {
      id: 'c2',
      author: '@dwr',
      text: 'Thinking about how to make Farcaster more open',
      likes: 987,
      recasts: 212,
      signal: 'positive',
    },
    {
      id: 'c3',
      author: '@bracky',
      text: '"This will be my last cast. Thank you all." — @bracky\'s final cast before going offline. 876 likes, 445 recasts. Community in mourning.',
      likes: 876,
      recasts: 445,
      signal: 'negative',
    },
    {
      id: 'c4',
      author: '@jessepollak',
      text: 'Base just hit 1M daily active addresses',
      likes: 754,
      recasts: 290,
      signal: 'positive',
    },
    {
      id: 'c5',
      author: '@accountless',
      text: 'Built a new mini app for daily word games',
      likes: 612,
      recasts: 189,
      signal: 'positive',
    },
    {
      id: 'c6',
      author: '@0xDesigner',
      text: 'Farcaster design is getting so much better',
      likes: 543,
      recasts: 167,
      signal: 'positive',
    },
    {
      id: 'c7',
      author: '@web3pm',
      text: 'App X is shutting down end of month',
      likes: 498,
      recasts: 203,
      signal: 'negative',
    },
    {
      id: 'c8',
      author: '@ccarella',
      text: 'New channel analytics tool just launched',
      likes: 445,
      recasts: 134,
      signal: 'positive',
    },
    {
      id: 'c9',
      author: '@rish',
      text: 'Neynar API now supports batch cast fetching',
      likes: 401,
      recasts: 122,
      signal: 'positive',
    },
    {
      id: 'c10',
      author: '@jayme',
      text: 'Thinking about sunsetting this project',
      likes: 389,
      recasts: 98,
      signal: 'negative',
    },
  ],

  topChannels: [
    { id: 'ch1', name: '/degen', members: '102K', casts24h: 4821, growth: '+12%' },
    { id: 'ch2', name: '/zora', members: '10.2K', casts24h: 2341, growth: '+8%' },
    { id: 'ch3', name: '/base', members: '34K', casts24h: 1987, growth: '+5%' },
    { id: 'ch4', name: '/frames', members: '8.9K', casts24h: 1654, growth: '+22%' },
    { id: 'ch5', name: '/ens', members: '12K', casts24h: 1203, growth: '+3%' },
    { id: 'ch6', name: '/nounsdao', members: '6.7K', casts24h: 987, growth: '+1%' },
    { id: 'ch7', name: '/warpcast', members: '45K', casts24h: 876, growth: '+2%' },
    { id: 'ch8', name: '/books', members: '2.3K', casts24h: 654, growth: '+41%' },
    { id: 'ch9', name: '/art', members: '9.1K', casts24h: 598, growth: '+7%' },
    { id: 'ch10', name: '/crypto', members: '18K', casts24h: 543, growth: '+4%' },
  ],

  topTokens: [
    { id: 't1', symbol: '$DEGEN',   mentions: 3421, price: '$0.000685', change: '-0.5%',  signal: 'negative', marketCap: '$25.3M',  volume24h: '$1.2M',  contractAddress: '0x4ed4e862860bed51a9570b96d89af5e1b0efefed' },
    { id: 't2', symbol: '$MOXIE',   mentions: 1987, price: '$0.00412',  change: '+3.2%',  signal: 'positive', marketCap: '$18.7M',  volume24h: '$890K',  contractAddress: '0x8c9037d1ef5c6d1f6816278c7aaf5491d24cd527' },
    { id: 't3', symbol: '$CLANKER', mentions: 1654, price: '$3.14',     change: '+11.4%', signal: 'positive', marketCap: '$31.4M',  volume24h: '$4.1M',  contractAddress: '0x1bc0c42215582d5a085795f4badbac3ff36d1bcb' },
    { id: 't4', symbol: '$BUILD',   mentions: 1203, price: '$0.00071',  change: '+5.8%',  signal: 'positive', marketCap: '$7.1M',   volume24h: '$310K',  contractAddress: '0x3c281a39944a2319aa653d81cfd93ca10983d234' },
    { id: 't5', symbol: '$HIGHER',  mentions: 987,  price: '$0.00388',  change: '-2.1%',  signal: 'negative', marketCap: '$3.9M',   volume24h: '$180K',  contractAddress: '0x0578d8a44db98b23bf096a382e016e29a5ce0ffe' },
    { id: 't6', symbol: '$HAM',     mentions: 876,  price: '$0.00092',  change: '+1.7%',  signal: 'positive', marketCap: '$9.2M',   volume24h: '$420K',  contractAddress: '0x01f0a31698c4d065659b9bdc21b3610292a1c506' },
  ],

  newMiniApps: [
    { id: 'a1', name: 'WordCast', desc: 'Daily word game for Farcaster', author: '@accountless' },
    { id: 'a2', name: 'TipDash', desc: 'Track your $DEGEN tips in one place', author: '@web3pm' },
    { id: 'a3', name: 'ChanStats', desc: 'Channel analytics and growth tracking', author: '@ccarella' },
    { id: 'a4', name: 'CastPoll', desc: 'Create polls directly in casts', author: '@rish' },
  ],

  networkStats: {
    totalAccounts: '501,204',
    dau: '48,391',
    dauChange: '+18%',
    newToday: '1,847',
    castsToday: '234,109',
  },
};

// ── ARCHIVE ───────────────────────────────────────────────────

export const MOCK_ARCHIVE: ArchiveIssue[] = [
  {
    issue: 1,
    vol: 1,
    date: 'Sat, Mar 7 2026',
    price: '$0.041',
    lead: 'The Daily Farcaster Tribune Launches: A New Voice for the Farcaster Universe',
    secondary: ['Bracky Shuts Its Doors', 'Cast 0xdf7b38f4 Sparks Community Wave'],
    mints: 142,
    readers: 891,
    revenue: '$9.77',
    autoPublished: false,
  },
  {
    issue: 2,
    vol: 1,
    date: 'Sun, Mar 8 2026',
    price: '$0.041',
    lead: 'Farcaster Protocol Upgrade FIP-8 Goes Live — What Changes for Casters',
    secondary: ['App X Announces Shutdown by End of Month', 'Base Hits 1M Daily Active Addresses'],
    mints: 98,
    readers: 703,
    revenue: '$6.77',
    autoPublished: false,
  },
  {
    issue: 3,
    vol: 1,
    date: 'Mon, Mar 9 2026',
    price: '$0.041',
    lead: '$DEGEN Tips Cross $2M Cumulative Volume — Community Celebrates',
    secondary: ['Popular Channel /books Loses Moderator Team', '/frames Channel Surges 22% in 24h'],
    mints: 77,
    readers: 612,
    revenue: '$5.50',
    autoPublished: true,
  },
  {
    issue: 4,
    vol: 1,
    date: 'Tue, Mar 10 2026',
    price: '$0.041',
    lead: 'Warpcast Ships Major Reply Threading Update — Users React Positively',
    secondary: ['Token $TN100X Down 11% on Low Volume', 'WordCast Mini App Tops 5K Daily Players'],
    mints: 113,
    readers: 788,
    revenue: '$7.95',
    autoPublished: false,
  },
  {
    issue: 5,
    vol: 1,
    date: 'Wed, Mar 11 2026',
    price: '$0.041',
    lead: 'Neynar API Adds Batch Cast Fetching — Builders Cheer the Speed Gains',
    secondary: ['Veteran Builder Steps Away from Farcaster', 'Supercast v2 Launches to Rave Reviews'],
    mints: 89,
    readers: 654,
    revenue: '$6.09',
    autoPublished: false,
  },
];

// ── SETTINGS ──────────────────────────────────────────────────

export const TIMEZONES: TimezoneOption[] = [
  { label: 'UTC', offset: '+00:00' },
  { label: 'ET — New York', offset: '-05:00' },
  { label: 'CT — Chicago', offset: '-06:00' },
  { label: 'MT — Denver', offset: '-07:00' },
  { label: 'PT — Los Angeles', offset: '-08:00' },
  { label: 'GMT — London', offset: '+00:00' },
  { label: 'CET — Paris/Berlin', offset: '+01:00' },
  { label: 'IST — Mumbai', offset: '+05:30' },
  { label: 'JST — Tokyo', offset: '+09:00' },
  { label: 'AEST — Sydney', offset: '+10:00' },
];

export const FALLBACK_OPTIONS: FallbackOption[] = [
  { id: 'auto', label: 'Auto-select', desc: 'Algorithm picks highest-engagement stories' },
  { id: 'yesterday', label: 'Repeat yesterday', desc: 'Republish previous issue with updated date' },
  { id: 'skip', label: 'Skip issue', desc: 'No issue published — gap in the archive' },
];

export const PAYWALL_CURRENCIES = ['USDC', 'ETH', '$RWACu'];

// ── THEMES ────────────────────────────────────────────────────

export const THEMES: Record<ThemeId, Theme> = {
  bw: {
    id: 'bw',
    name: 'Black & White',
    emoji: '📰',
    bg: 'bg-white',
    text: 'text-black',
    border: 'border-black',
    borderLight: 'border-black/20',
    borderDashed: 'border-black/20',
    fill: 'bg-black',
    fillText: 'text-white',
    fillLight: 'bg-black/5',
    buttonUnselected: 'bg-gray-100 text-black',
    svgBg: 'white',
    svgFg: 'black',
    svgText: 'black',
    mutedClass: 'opacity-60',
  },
  purple: {
    id: 'purple',
    name: 'Purple & White',
    emoji: '🟣',
    bg: 'bg-white',
    text: 'text-purple-900',
    border: 'border-purple-800',
    borderLight: 'border-purple-200',
    borderDashed: 'border-purple-200',
    fill: 'bg-purple-900',
    fillText: 'text-white',
    fillLight: 'bg-purple-50',
    buttonUnselected: 'bg-purple-100 text-purple-900',
    svgBg: 'white',
    svgFg: '#4c1d95',
    svgText: '#4c1d95',
    mutedClass: 'opacity-70',
  },
  inverted: {
    id: 'inverted',
    name: 'Inverted',
    emoji: '🌑',
    bg: 'bg-black',
    text: 'text-white',
    border: 'border-white',
    borderLight: 'border-white/20',
    borderDashed: 'border-white/20',
    fill: 'bg-white',
    fillText: 'text-black',
    fillLight: 'bg-white/10',
    buttonUnselected: 'bg-gray-700 text-white',
    svgBg: 'black',
    svgFg: 'white',
    svgText: 'white',
    mutedClass: 'opacity-60',
  },
  cream: {
    id: 'cream',
    name: 'Aged Cream',
    emoji: '📜',
    bg: 'bg-[#f5f0e8]',
    text: 'text-[#2c1a0e]',
    border: 'border-[#7a5c3a]',
    borderLight: 'border-[#7a5c3a]/25',
    borderDashed: 'border-[#7a5c3a]/25',
    fill: 'bg-[#2c1a0e]',
    fillText: 'text-[#f5f0e8]',
    fillLight: 'bg-[#2c1a0e]/5',
    buttonUnselected: 'bg-[#e8dcc8] text-[#2c1a0e]',
    svgBg: '#f5f0e8',
    svgFg: '#2c1a0e',
    svgText: '#2c1a0e',
    mutedClass: 'opacity-60',
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal Green',
    emoji: '💾',
    bg: 'bg-[#0d0d0d]',
    text: 'text-[#00ff41]',
    border: 'border-[#00ff41]',
    borderLight: 'border-[#00ff41]/30',
    borderDashed: 'border-[#00ff41]/30',
    fill: 'bg-[#00ff41]',
    fillText: 'text-[#0d0d0d]',
    fillLight: 'bg-[#00ff41]/10',
    buttonUnselected: 'bg-[#00ff41]/10 text-[#00ff41]',
    svgBg: '#0d0d0d',
    svgFg: '#00ff41',
    svgText: '#00ff41',
    mutedClass: 'text-[#00ff41]/50',
  },
  sepia: {
    id: 'sepia',
    name: 'Deep Sepia',
    emoji: '🏛',
    bg: 'bg-[#1a1008]',
    text: 'text-[#d4a96a]',
    border: 'border-[#d4a96a]',
    borderLight: 'border-[#d4a96a]/30',
    borderDashed: 'border-[#d4a96a]/30',
    fill: 'bg-[#d4a96a]',
    fillText: 'text-[#1a1008]',
    fillLight: 'bg-[#d4a96a]/10',
    buttonUnselected: 'bg-[#d4a96a]/10 text-[#d4a96a]',
    svgBg: '#1a1008',
    svgFg: '#d4a96a',
    svgText: '#d4a96a',
    mutedClass: 'text-[#d4a96a]/50',
  },
  telegraph: {
    id: 'telegraph',
    name: 'Telegraph Blue',
    emoji: '📡',
    bg: 'bg-[#f0f4f8]',
    text: 'text-[#0a2540]',
    border: 'border-[#0a2540]',
    borderLight: 'border-[#0a2540]/20',
    borderDashed: 'border-[#0a2540]/20',
    fill: 'bg-[#0a2540]',
    fillText: 'text-[#e8f0fe]',
    fillLight: 'bg-[#0a2540]/5',
    buttonUnselected: 'bg-[#d8e6f0] text-[#0a2540]',
    svgBg: '#f0f4f8',
    svgFg: '#0a2540',
    svgText: '#0a2540',
    mutedClass: 'opacity-55',
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Edition',
    emoji: '🔴',
    bg: 'bg-[#faf5f5]',
    text: 'text-[#1a0505]',
    border: 'border-[#8b0000]',
    borderLight: 'border-[#8b0000]/25',
    borderDashed: 'border-[#8b0000]/25',
    fill: 'bg-[#8b0000]',
    fillText: 'text-[#faf5f5]',
    fillLight: 'bg-[#8b0000]/6',
    buttonUnselected: 'bg-[#f0e0e0] text-[#1a0505]',
    svgBg: '#faf5f5',
    svgFg: '#8b0000',
    svgText: '#8b0000',
    mutedClass: 'opacity-55',
  },
  rainbow: {
    id: 'rainbow',
    name: 'Rainbow Edition',
    emoji: '🌈',
    bg: 'bg-white',
    text: 'text-[#1a0533]',
    border: 'border-[#7c3aed]',
    borderLight: 'border-[#c4b5fd]',
    borderDashed: 'border-[#c4b5fd]',
    fill: 'tribune-rainbow-fill',
    fillText: 'text-white',
    fillLight: 'bg-[#f3e8ff]',
    buttonUnselected: 'bg-[#f3e8ff] text-[#1a0533]',
    svgBg: '#ffffff',
    svgFg: '#7c3aed',
    svgText: '#1a0533',
    mutedClass: 'opacity-60',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Edition',
    emoji: '🌅',
    bg: 'tribune-sunset-bg',
    text: 'text-[#2d0a00]',
    border: 'border-[#c2410c]',
    borderLight: 'border-[#fed7aa]',
    borderDashed: 'border-[#fed7aa]',
    fill: 'bg-[#c2410c]',
    fillText: 'text-white',
    fillLight: 'bg-[#fff1e6]',
    buttonUnselected: 'bg-[#fde8d8] text-[#2d0a00]',
    svgBg: '#fff7f0',
    svgFg: '#c2410c',
    svgText: '#2d0a00',
    mutedClass: 'opacity-60',
  },
  four20: {
    id: 'four20',
    name: '4/20 Special',
    emoji: '🌿',
    bg: 'bg-[#f0f7e6]',
    text: 'text-[#1a3a0a]',
    border: 'border-[#2d6a0a]',
    borderLight: 'border-[#2d6a0a]/25',
    borderDashed: 'border-[#2d6a0a]/25',
    fill: 'bg-[#2d6a0a]',
    fillText: 'text-[#f0f7e6]',
    fillLight: 'bg-[#2d6a0a]/8',
    buttonUnselected: 'bg-[#d8f0b8] text-[#1a3a0a]',
    svgBg: '#f0f7e6',
    svgFg: '#2d6a0a',
    svgText: '#1a3a0a',
    mutedClass: 'opacity-60',
  },
};
