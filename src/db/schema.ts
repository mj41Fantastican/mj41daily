import { pgTable, text, integer, boolean, timestamp, serial, uuid, unique } from "drizzle-orm/pg-core";

/**
 * Key-Value Store Table
 *
 * Built-in table for simple key-value storage.
 * Available immediately without schema changes.
 *
 * ⚠️ CRITICAL: DO NOT DELETE OR EDIT THIS TABLE DEFINITION ⚠️
 * This table is required for the app to function properly.
 * DO NOT delete, modify, rename, or change any part of this table.
 * Removing or editing it will cause database schema conflicts and prevent
 * the app from starting.
 *
 * Use for:
 * - User preferences/settings
 * - App configuration
 * - Simple counters
 * - Temporary data
 */
export const kv = pgTable("kv", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ── ISSUES ────────────────────────────────────────────────────────────
// Stores each published daily issue with full front page content.

export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  issueNumber: integer("issue_number").notNull(),
  vol: integer("vol").notNull().default(1),
  date: text("date").notNull(),                        // e.g. "Saturday, March 7, 2026"
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  autoPublished: boolean("auto_published").default(false),

  // Front page content
  leadHeadline: text("lead_headline"),
  leadByline: text("lead_byline"),
  leadBody: text("lead_body"),
  secondaryLeftLabel: text("secondary_left_label"),
  secondaryLeftHeadline: text("secondary_left_headline"),
  secondaryLeftSummary: text("secondary_left_summary"),
  secondaryRightLabel: text("secondary_right_label"),
  secondaryRightHeadline: text("secondary_right_headline"),
  secondaryRightSummary: text("secondary_right_summary"),
  midStoriesJson: text("mid_stories_json"),            // JSON array of MidStory[]
  briefsJson: text("briefs_json"),                     // JSON array of Brief[]
  teasersJson: text("teasers_json"),                   // JSON array of Teaser[]

  // Article sources (further reading links, JSON array of {label, url})
  leadSourcesJson: text("lead_sources_json"),
  secondaryLeftSourcesJson: text("secondary_left_sources_json"),
  secondaryRightSourcesJson: text("secondary_right_sources_json"),

  // Token Tracker — 6 curated tokens for the front-page TOKENS block
  trackerTokensJson: text("tracker_tokens_json"),      // TrackerToken[] as JSON

  // Editorial
  editorialNote: text("editorial_note"),               // Optional editor's note shown above headline row
  editorByline: text("editor_byline"),                 // Default byline for this issue e.g. "By @mj41fantastican"

  // Metadata
  price: text("price").default("$0.041"),
  website: text("website").default("dailyfarcaster.fc"),
  editor: text("editor").default("@mj41fantastican"),
  version: text("version").default("v2"),

  // Airdrop — if true, every buyer's wallet address is added to the whitelist
  airdropEnabled: boolean("airdrop_enabled").default(false),

  // Scheduling
  status: text("status").default("published"),  // 'published' | 'scheduled' | 'draft'
  scheduledFor: timestamp("scheduled_for"),      // null = publish immediately
});

// ── DAILY FEED ────────────────────────────────────────────────────────
// Stores daily Neynar API fetch results for the curator dashboard.

export const dailyFeed = pgTable("daily_feed", {
  id: serial("id").primaryKey(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  trendingCastsJson: text("trending_casts_json"),      // TrendingCast[] as JSON
  topChannelsJson: text("top_channels_json"),           // TopChannel[] as JSON
  topTokensJson: text("top_tokens_json"),               // TopToken[] as JSON
  newMiniAppsJson: text("new_mini_apps_json"),          // MiniApp[] as JSON
  networkStatsJson: text("network_stats_json"),         // NetworkStats as JSON
  newsCategoriesJson: text("news_categories_json"),     // NewsCategories as JSON
  onChainInsightJson: text("on_chain_insight_json"),    // {text, difficulty} as JSON
  deadline: text("deadline").default("12:00 UTC"),
  timeLeft: text("time_left"),
});

// ── READER ACCESS ─────────────────────────────────────────────────────
// Tracks per-user unlock and mint access to issues.

export const readerAccess = pgTable("reader_access", {
  id: serial("id").primaryKey(),
  // Wallet address, lowercased — the identity every reader has, through either
  // door. Nullable only so the 14 pre-existing FID-only rows survive migration.
  walletAddress: text("wallet_address"),
  // Farcaster ID, present only for readers who arrived through Farcaster.
  fid: integer("fid"),
  issueId: integer("issue_id").notNull(),
  accessType: text("access_type").notNull(),           // 'read' | 'mint'
  paymentMethod: text("payment_method").notNull(),     // 'usdc' | 'eth' | 'rwac'
  txHash: text("tx_hash"),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
});

// ── ISSUE MINTS ───────────────────────────────────────────────────────
// Tracks NFT mints per issue (collector records).

export const issueMints = pgTable("issue_mints", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address"),
  fid: integer("fid"),
  issueId: integer("issue_id").notNull(),
  txHash: text("tx_hash").notNull(),
  mintedAt: timestamp("minted_at").notNull().defaultNow(),
});

// ── PAPER SETTINGS ────────────────────────────────────────────────────
// Singleton row (id=1) for editor-configurable settings.

export const paperSettings = pgTable("paper_settings", {
  id: integer("id").primaryKey().default(1),
  deadlineHour: text("deadline_hour").default("12:00"),
  timezone: text("timezone").default("UTC"),
  fallbackRule: text("fallback_rule").default("auto"),
  notifyOnPublish: boolean("notify_on_publish").default(true),
  notifyDeadlineWarning: boolean("notify_deadline_warning").default(true),
  warningMinutes: integer("warning_minutes").default(30),
  readPriceUsdc: text("read_price_usdc").default("0.01"),
  mintPriceUsdc: text("mint_price_usdc").default("0.041"),
  rwacReadAmount: text("rwac_read_amount").default("4141"),
  rwacMintAmount: text("rwac_mint_amount").default("41041"),
  enabledCurrencies: text("enabled_currencies").default("USDC,ETH,$RWACu"),
  coverPrice: text("cover_price").default("$0.041"),
  tagline: text("tagline").default("All the news that's fit to cast"),
  editorHandle: text("editor_handle").default("@mj41fantastican"),
  // Appearance
  colorScheme: text("color_scheme").default("bw"),
  paperName: text("paper_name").default("The Daily Miscellany: A Compendium Of Interesting Things"),
  // Social / branding
  channelUrl: text("channel_url").default(""),
  websiteUrl: text("website_url").default("dailyfarcaster.fc"),
  // Editorial note (shown in nameplate)
  editorialNoteEnabled: boolean("editorial_note_enabled").default(false),
  editorialNote: text("editorial_note").default(""),
  // Airdrop default for new issues
  airdropDefault: boolean("airdrop_default").default(false),
  // Widget panel — comma-separated list of active widget IDs
  activeWidgets: text("active_widgets").default("art,weather,cat,anilist,quakes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── AIRDROP WHITELIST ─────────────────────────────────────────────────
// Tracks wallet addresses eligible for airdrop from a specific issue purchase.
// Populated whenever a reader pays to unlock or mint an issue that has airdropEnabled=true.

export const airdropWhitelist = pgTable("airdrop_whitelist", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id").notNull(),
  fid: integer("fid").notNull(),
  walletAddress: text("wallet_address").notNull(),
  accessType: text("access_type").notNull(),      // 'read' | 'mint'
  paymentMethod: text("payment_method").notNull(), // 'usdc' | 'eth' | 'rwac'
  txHash: text("tx_hash"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

// ── SUBSCRIBERS ───────────────────────────────────────────────────────
// Free subscribers who opted in for issue/feature notifications.
// Subscription is free — readers still pay per issue to read.

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  fid: integer("fid").unique(),
  walletAddress: text("wallet_address").unique(),
  username: text("username"),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  lastNotifiedAt: timestamp("last_notified_at"),
});

// ── PAID SUBSCRIPTIONS ────────────────────────────────────────────────
// Tracks paid $RWACu subscriptions granting full read access.
// Plan: 'weekly' | 'monthly' | 'yearly'
// Cost: 41 / week  (weekly=41, monthly=164=41×4, yearly=2132=41×52)
// walletAddress is silently added to the airdrop whitelist.

export const paidSubscriptions = pgTable('paid_subscriptions', {
  id: serial('id').primaryKey(),
  fid: integer('fid').notNull(),
  walletAddress: text('wallet_address').notNull(),
  username: text('username'),
  displayName: text('display_name'),
  plan: text('plan').notNull(),           // 'weekly' | 'monthly' | 'yearly'
  weeksGranted: integer('weeks_granted').notNull(),  // 1 | 4 | 52
  rwacAmount: text('rwac_amount').notNull(),          // raw token amount as string
  txHash: text('tx_hash').notNull().unique(),
  startsAt: timestamp('starts_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),       // startsAt + weeksGranted weeks
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── NFT PAYMENT TXNS ──────────────────────────────────────────────────
// Tracks used payment transaction hashes to prevent replay attacks.

export const nftPaymentTxns = pgTable('nft_payment_txns', {
  txHash: text('tx_hash').primaryKey(),
  fid: integer('fid').notNull(),
  collectionSlug: text('collection_slug').notNull(),
  usedAt: timestamp('used_at').defaultNow().notNull(),
});

// ── PERSONAL COVER MINTS ──────────────────────────────────────────────
// Stores every minted personal Miscellany cover. Serial: FCDailyTrib#####.

export const personalCoverMints = pgTable('personal_cover_mints', {
  id: serial('id').primaryKey(),
  // Serial number: FCDailyTrib00001, FCDailyTrib00002, …
  serial: text('serial').notNull().unique(),
  serialIndex: integer('serial_index').notNull(),   // raw int for ordering/display
  walletAddress: text('wallet_address'),
  fid: integer('fid'),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  // NFT data
  tokenId: text('token_id'),                        // on-chain token ID from mintNft
  contractAddress: text('contract_address').notNull(),
  network: text('network').notNull().default('base'),
  txHash: text('tx_hash'),
  metadataUri: text('metadata_uri'),
  imageUrl: text('image_url').notNull(),
  // Traits
  issueDate: text('issue_date').notNull(),          // "Sunday, April 6, 2026"
  issueValue: text('issue_value').notNull().default('$0.041'), // cover price
  neynarScore: text('neynar_score'),                // stored as string "0.98"
  headline: text('headline').notNull(),
  // OpenSea external URL
  openSeaUrl: text('open_sea_url'),
  mintedAt: timestamp('minted_at').notNull().defaultNow(),
});

// ── GENERATED IMAGES COLLECTION ───────────────────────────────────────
// Every AI-generated personal cover image is stored here, whether or not
// the user proceeds to mint. Acts as a permanent creative archive for
// the editor's collection, display, and future use.

export const generatedImages = pgTable('generated_images', {
  id: serial('id').primaryKey(),
  fid: integer('fid').notNull(),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  imageUrl: text('image_url').notNull(),
  headline: text('headline').notNull(),
  prompt: text('prompt'),                               // full AI prompt used
  edition: text('edition').notNull().default('standard'), // 'standard' | '420-special' | etc.
  wasMinted: boolean('was_minted').notNull().default(false),
  mintSerial: text('mint_serial'),                      // linked MJ41FCTRB serial if minted
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
});

// ── NFT PREVIEWS ───────────────────────────────────────────────────────
// Stores generated preview images for preview-first mint pattern.

export const nftPreviews = pgTable(
  'nft_previews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fid: integer('fid').notNull(),
    collectionSlug: text('collection_slug').notNull(),
    imageUrl: text('image_url').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [unique().on(t.fid, t.collectionSlug)],
);
