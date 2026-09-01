# The Daily Tribune — Full AI Agent Build Log

> **Project**: The Daily Tribune (Farcaster Mini App)
> **Working Directory**: `gen/app/`
> **Editor / Owner**: @mj41fantastican
> **Build Period**: March 2026 – May 2026
> **Platform**: Neynar App Studio / Next.js 15 / Base blockchain
> **Last Updated**: 2026-05-26

---

## 0. Project Identity

| Field | Value |
|---|---|
| App Name | The Daily Tribune |
| Short Name | Daily Tribune |
| Tagline | "News fit to cast" |
| App Type | Daily newspaper / media / content platform |
| Audience | Farcaster users who want curated daily Farcaster ecosystem news |
| Editor FID | `NEXT_PUBLIC_USER_FID` (mj41fantastican) |
| Primary Chain | Base (eip155:8453) |
| Secondary Chain | Ethereum mainnet (eip155:1) |
| Payment Token | $RWACu — `0x184f5aacdbb3e482ce6e5e4a7075500e589a5e68` (Base) |
| Category | news-media |

---

## 1. Architecture Overview

### Tab Structure (current)
```
Front Page  |  Editor (gated)  |  Page 2  |  Archive  |  Collectibles
```

### Key Files
```
src/features/app/
  mini-app.tsx                    — root composition, Tabs, ThemeContext
  types.ts                        — all TypeScript interfaces & enums
  theme-context.tsx               — React context for theme switching
  components/
    front-page.tsx                — primary reader view (large, ~937 lines)
    paywall-gate.tsx              — all payment flows (read + personal cover mint)
    curator-dashboard.tsx         — editor-only publish/manage UI
    mint-archive.tsx              — NFT mints-only archive (all users)
    collectibles-panel.tsx        — personal collectibles viewer
    page-two.tsx                  — supplemental content (jokes, facts, stats)
    tribune-logo-svg.tsx          — SVG masthead logo (theme-aware)
    copper-ticker.tsx             — live on-chain copper price scrolling ticker
    slot-section.tsx              — per-story-slot editor widget
    story-modal.tsx               — full article modal
    theme-picker.tsx              — color scheme selector (editor)
    widget-panel.tsx              — modular content widgets
    token-tracker-editor.tsx      — token slot editor (CoinGecko-backed)
    pinned-tokens-editor.tsx      — front-page token pins
    mini-app-showcase-editor.tsx  — mini app briefs editor
    magic-8-ball.tsx              — Page 2 widget
    settings-panel.tsx            — (legacy, no longer on any tab)
    archive-panel.tsx             — (legacy, no longer on any tab)
    locked-row.tsx                — paywall-locked content row UI

src/db/
  schema.ts                       — Drizzle ORM schema (all tables)
  actions/
    issues.ts                     — publish, schedule, fetch issues
    access.ts                     — reader access grants
    feed.ts                       — daily Neynar feed refresh
    collectibles.ts               — personal cover mint records
    airdrop.ts                    — whitelist management
    subscribers.ts                — free subscriber management

src/app/api/
  copper-prices/route.ts          — reads 3 Base oracle contracts via eth_call
  subscribe/route.ts              — GET/POST/DELETE subscriber management
  notify-subscribers/route.ts     — push notification to free subscribers
  notify-readers/route.ts         — push notification to all paid readers
  nft/personal-cover/route.ts     — generates AI cover image
  nft/personal-cover/mint/route.ts — mints NFT + records in DB
  nft/mint/route.ts               — general NFT mint
  nft/preview/route.ts            — preview-first mint pattern
  nft/price/route.ts              — price estimation
  nft/deploy/route.ts             — contract deploy
  nft/wallet-info/route.ts        — wallet lookup
  ai-story/route.ts               — AI article generation
  ai/rewrite-article/route.ts     — AI article rewriter
  settings/route.ts               — paper settings CRUD
  theme/route.ts                  — color scheme persist/load
  token-lookup/route.ts           — token CA lookup
  token-search/route.ts           — token search
  gecko-token/route.ts            — CoinGecko price data
  channel-lookup/route.ts         — Neynar channel lookup
  protocol-stats/route.ts         — Farcaster network stats
  page2-data/route.ts             — Page 2 content (jokes, facts, etc.)
  magic8/route.ts                 — Magic 8-Ball API
  widgets/route.ts                — widget config
  setup/route.ts                  — DB setup
  migrate/route.ts                — DB migrations
  admin/mints/route.ts            — admin mint viewer
  admin/generated-images/route.ts — admin generated images viewer
  cron/daily-fetch/route.ts       — daily Neynar data fetch
  cron/publish-scheduled/route.ts — scheduled issue publisher
  neynar/[...route]/route.ts      — Neynar SDK proxy
  coingecko/[...route]/route.ts   — CoinGecko proxy

src/hooks/
  use-current-issue.ts            — loads latest published issue from DB
  use-paywall.ts                  — per-issue unlock/mint status for user
  use-daily-feed.ts               — loads curator feed data
  use-is-editor.ts                — checks if current user FID === editor FID
  use-paper-settings.ts           — loads/saves paper settings singleton

src/data/
  mocks.ts                        — THEMES object, MOCK_TEASERS, PAYWALL_CURRENCIES

public/
  app-logo.png                    — Tribune masthead logo (broadsheet style, black/white)
  app-splash.png                  — splash screen image
  app-hero.png                    — hero image
  app-farcaster-image.png         — OG embed image
```

---

## 2. Database Schema

All tables use Neon PostgreSQL via Drizzle ORM. Connection string in `.env` as `DATABASE_URL`.

### Tables

| Table | Purpose |
|---|---|
| `kv` | Generic key-value store (protected, do not modify) |
| `issues` | Every published issue with full front-page content |
| `daily_feed` | Daily Neynar API data for curator dashboard |
| `reader_access` | Per-user unlock + mint records (tracks paid readers) |
| `issue_mints` | NFT mints per issue (general, not personal cover) |
| `paper_settings` | Singleton (id=1) — all editor-configurable settings |
| `airdrop_whitelist` | Wallet addresses eligible for $RWACu airdrops |
| `subscribers` | Free subscribers opted in for push notifications |
| `nft_payment_txns` | Used tx hashes to prevent replay attacks |
| `personal_cover_mints` | Every minted personal Tribune cover (serial: FCDailyTrib#####) |
| `generated_images` | Every AI-generated cover image (minted or not) |
| `nft_previews` | Preview images for preview-first mint pattern |

### Key `issues` Columns
- `leadHeadline`, `leadByline`, `leadBody` — main story
- `secondaryLeft*`, `secondaryRight*` — flanking stories
- `midStoriesJson`, `briefsJson`, `teasersJson` — JSON arrays
- `trackerTokensJson` — 6 curated tokens (TrackerToken[])
- `editorialNote`, `editorByline` — editorial fields
- `airdropEnabled` — flag to add buyers to whitelist
- `status` — 'published' | 'scheduled' | 'draft'

### Key `paper_settings` Columns
- `deadlineHour`, `timezone`, `fallbackRule`
- `readPriceUsdc` (currently "0.01"), `rwacReadAmount` (currently "4141")
- `mintPriceUsdc` ("0.041"), `rwacMintAmount` ("41041")
- `enabledCurrencies` — currently "USDC,ETH,$RWACu" but paywall enforces $RWACu-only
- `colorScheme` — persisted theme ID
- `paperName`, `editorHandle`, `tagline`, `websiteUrl`, `channelUrl`
- `airdropDefault` — default for new issues
- `activeWidgets` — comma-separated widget IDs

---

## 3. Payment / Paywall System

### Current Pricing (as of May 2026)
| Action | $RWACu Amount | Notes |
|---|---|---|
| Read unlock | 4,141 $RWACu | ≈ $0.01 USD |
| Generate personal cover | 20,705 $RWACu | ≈ $0.05 USD |
| Mint personal cover NFT | 41,041 $RWACu | ≈ $0.10 USD |

**IMPORTANT**: Only $RWACu is accepted (USDC/ETH stripped from UI). Editor wallet receives all payments.

### $RWACu Contract
- Address: `0x184f5aacdbb3e482ce6e5e4a7075500e589a5e68` (Base)
- Decimals: 18
- Logo: Pinata IPFS CDN

### Payment Flow (ERC-20)
1. User calls `writeContract` via wagmi with `farcasterMiniApp` connector
2. Calls `transfer(EDITOR_WALLET, AMOUNT)` on RWACu contract
3. On success → API grants access / generates image / mints NFT
4. Access stored in `reader_access` table by FID + issueId

### Editor Wallet
- Address: `0x758AF4a670adE40C2FfE1B6C4746340910a44B96`
- Defined in `paywall-gate.tsx` as `EDITOR_WALLET`

### Swap Link
- Uniswap deep link: `https://app.uniswap.org/swap?chain=base&outputCurrency=${RWAC_CONTRACT}&inputCurrency=${WETH_BASE}`
- Shown to users who don't have $RWACu

---

## 4. Personal Cover Mint Flow (Detailed)

Located in `paywall-gate.tsx` → `PersonalMintSection` component.

### Stages
```
idle → paying-gen → generating → preview → paying-mint → minting-chain → done
```

### Stage Details
1. **idle**: Shows "Generate My Cover" button
2. **paying-gen**: ERC-20 transfer of 20,705 $RWACu
3. **generating**: Calls `GET /api/nft/personal-cover?fid=X` → AI image generation
4. **preview**: Shows generated image; user can mint or abandon
5. **paying-mint**: ERC-20 transfer of 41,041 $RWACu
6. **minting-chain**: Calls `POST /api/nft/personal-cover/mint` → NFT minted on-chain
7. **done**: Shows cover image, serial, OpenSea link, download button, share button

### Cover Data Structure
```ts
interface CoverData {
  imageUrl: string;
  headline: string;
  issueNumber: string;
  displayName: string;
  username: string;
  neynarScore?: string;
}
interface MintResult {
  serial: string;     // "FCDailyTrib00001"
  tokenId: string | null;
  txHash: string | null;
  openSeaUrl: string | null;
  metadataUri: string | null;
  pending?: boolean;
}
```

### Serial Format
- Pattern: `FCDailyTrib` + 5-digit zero-padded number
- Example: `FCDailyTrib00001`, `FCDailyTrib00042`
- Stored in `personal_cover_mints.serial` (unique constraint)

---

## 5. Copper Price Oracle (Live On-Chain Data)

### Oracles (Base Mainnet)
| Class | Contract Address | Selector | Scale |
|---|---|---|---|
| A (COMEX spot) | `0x02a0FeE571E63e9a81AE944469deA7207ac56D8f` | `0xa035b1fe` | ÷ 1e8 |
| B (Scrap/secondary) | `0x4D54f30dBa2e28c1096aE72745b6f5a29139bb58` | `0x98d5fdca` (first word) | ÷ 100 |
| C (Industrial alloy) | `0x1d4E108bE284d73fDC0704457D4A4c2A36aC1D4a` | `0x98d5fdca` (first word) | ÷ 1e8 |

### API Route: `GET /api/copper-prices`
- Reads contracts via `eth_call` on `https://mainnet.base.org`
- 60s Next.js cache (`next: { revalidate: 60 }`)
- Returns `{ ok, fetchedAt, prices: { A: {label, price, unit, timestamp, contract}, B: {...}, C: {...} } }`

### Ticker Component: `CopperTicker`
- CSS `@keyframes copper-ticker-scroll` animation (22s linear infinite)
- 3 items doubled to 6 for seamless scroll loop
- Hover pauses animation
- Colors: `theme.svgFg` for price text (theme-aware), `#b87333` copper-brown for labels/badges
- Renders silently `null` on load/error — no broken UI state

### Previous Failure Mode (documented for future agents)
- Direct REST API calls to `classa.mj41.me/api/price` → 404
- Chainlink `latestRoundData()` selector → reverted (non-standard ABI)
- Fix: Direct `eth_call` with discovered function selectors

---

## 6. Notification System

### Two Audiences

#### A. Free Subscribers (`subscribers` table)
- Subscribe via toggle on front page (logged-in Farcaster users only)
- `POST /api/subscribe` — idempotent upsert
- `GET /api/notify-subscribers` — returns count
- `POST /api/notify-subscribers` — sends Neynar push to all subscribers

#### B. Paid Readers (`reader_access` table)
- All FIDs that have ever paid to read or mint any issue
- `GET /api/notify-readers` — returns unique FID count
- `POST /api/notify-readers` — sends Neynar push to all paid reader FIDs
- Batched 100 FIDs per Neynar API call

### Neynar Push Notification Payload
```json
{
  "target_fids": [1234, 5678, ...],
  "notification": {
    "title": "...",    // max 32 chars
    "body": "...",     // max 128 chars
    "target_url": "https://..."  // optional
  }
}
```
Endpoint: `POST https://api.neynar.com/v2/farcaster/frame/notification`
Auth: `x-api-key: NEYNAR_API_KEY`

### On-Publish Notification (wired in curator-dashboard.tsx)
Function `notifySubscribersOnPublish(issueNumber, headline, dateStr)` fires after `setPublished(true)`.
- Notifies free subscribers via `/api/notify-subscribers`
- TODO (pending as of 2026-05-26): also call `/api/notify-readers` on publish

---

## 7. Theme System

### Available Themes (ThemeId)
```
bw | purple | inverted | cream | terminal | sepia | telegraph | crimson | rainbow | sunset | four20
```

### Theme Object
```ts
interface Theme {
  id: ThemeId;
  name: string; emoji: string;
  bg: string;         // Tailwind bg class
  text: string;       // Tailwind text class
  border: string;     // Tailwind border class
  borderLight: string;
  borderDashed: string;
  fill: string;       // solid fill (inverted button bg)
  fillText: string;   // text on fill
  fillLight: string;
  buttonUnselected: string;
  svgBg: string;      // hex/CSS value for SVG/canvas bg
  svgFg: string;      // hex/CSS value for SVG/canvas fg (ink)
  svgText: string;    // text color for SVG
  mutedClass: string; // Tailwind muted text class
}
```

### Persistence
- `GET/POST /api/theme` — reads/writes `colorScheme` to `paper_settings` KV
- `ThemeContext` propagates live updates throughout app without page reload
- Terminal theme gets animated 8-bit rainbow CSS tab labels

---

## 8. Editor (Curator) Dashboard

Access: gated to `NEXT_PUBLIC_USER_FID` via `useIsEditor()` hook.

### Story Slots
| Slot ID | Label | Content Source |
|---|---|---|
| lead | Lead Story | Trending casts (top 10, 24h) or write-in |
| negative | Secondary Left | Neg-signal casts or write-in |
| positive | Secondary Right | Pos-signal casts or write-in |
| channel | Channel Spotlight | Top channels or write-in |

Token story removed as dedicated slot — handled by Token Tracker Editor.

### Publishing Flow
1. Editor fills required slots (lead, negative, positive, channel)
2. Optionally adds: editorial note, airdrop toggle, issue date override
3. Clicks "Publish" → calls `publishIssue()` DB action
4. `notifySubscribersOnPublish()` fires automatically

### ⚙️ Paper Settings (collapsible in Editor tab)
- **Paper Identity**: name, tagline, editor handle, website URL, channel URL
- **Paywall Pricing**: USDC/ETH/RWACu read/mint amounts
- **Airdrop Default**: toggle for new issues
- Saved via `POST /api/settings`

### Other Editor Features
- **Token Tracker Editor**: 6 token slots with CoinGecko lookup
- **Mini App Showcase Editor**: curate up to 6 mini apps for briefs
- **Pinned Tokens Editor**: tokens shown on front-page ticker
- **Airdrop Dashboard**: manage whitelist per issue
- **Mints Diagnostic Panel**: view all personal cover mints
- **Scheduled Publishing**: set future publish time
- **Daily Feed Refresh**: manually trigger Neynar data fetch

---

## 9. Front Page Layout (Section Order)

```
┌─────────────────────────────────────┐
│  TAB BAR (Front Page | Editor | ...) │
├─────────────────────────────────────┤
│  COPPER TICKER (live oracle prices) │
├─────────────────────────────────────┤
│  NAMEPLATE                          │
│  Title + Vol/Issue/Date/Price/Editor│
├─────────────────────────────────────┤
│  EDITORIAL NOTE (if enabled)        │
├─────────────────────────────────────┤
│  HEADLINE ROW (3 cols)              │
│  [Secondary Left] [MAIN] [Secondary R]│
├─────────────────────────────────────┤
│  FEATURE IMAGE (Tribune logo)       │
├─────────────────────────────────────┤
│  MID STORIES (3 cols)               │
│  [On-chain] [Network] [Tokens]      │
├─────────────────────────────────────┤
│  BRIEFS STRIP (5 bullets)           │
├─────────────────────────────────────┤
│  SECTION TEASERS (4 cols)           │
│  [Protocol] [Culture] [Builders] [Tokens]│
├─────────────────────────────────────┤
│  PAYWALL GATE                       │
│  - Read Unlock (4,141 $RWACu)       │
│  - Personal Cover Mint              │
├─────────────────────────────────────┤
│  SUBSCRIBE TOGGLE (logged-in users) │
├─────────────────────────────────────┤
│  SHARE BUTTON                       │
└─────────────────────────────────────┘
```

Paywall Rule: Headlines always visible. Body content locked behind read unlock. Personal cover always requires separate payment regardless of read status.

---

## 10. Page 2 Content

Route: `/api/page2-data`
Renders via `page-two.tsx`.

Content sourced from free public APIs:
- Daily joke (official joke API or fallback)
- Random fact (uselessfacts.jsph.pl)
- Farcaster network stats (protocol-stats API → Neynar)
- Agify name age prediction (agify.io)
- Today's holidays (abstractapi.com holidays)
- Number fact (numbersapi.com)
- Robo-seed (random hash for identicon)
- Magic 8-Ball (magic8/route.ts)
- Top 10 trending Farcaster casts with engagement stats

---

## 11. NFT System

### Contract
- ERC-721 deployed on Base (via `nft/deploy/route.ts`)
- Server wallet mints via Neynar wallet API (`x-wallet-id` header)
- Contract address stored in `nft-config.ts`

### Personal Cover NFT
- AI-generated using Neynar image generation API
- Unique per user per issue date
- Stored in `personal_cover_mints` + `generated_images` tables
- Traits: Issue Date, Serial Index, FID, Network (Base)
- Metadata stored on-chain or IPFS
- OpenSea link generated from token ID

### General Issue NFT (Mint Archive)
- Separate from personal cover
- Tracked in `issue_mints` table
- Archive tab shows all minted covers (community gallery)

---

## 12. App Logo / Branding

### Image Files
| File | Purpose | Current State |
|---|---|---|
| `public/app-logo.png` | App icon in Warpcast search | Broadsheet masthead (updated May 2026) |
| `public/app-splash.png` | Splash screen | Generated |
| `public/app-hero.png` | Hero/banner image | Generated |
| `public/app-farcaster-image.png` | OG embed image | Generated |

### Logo Design (app-logo.png as of May 2026)
- Classic broadsheet newspaper masthead
- "THE DAILY / TRIBUNE" large serif typography
- Double border rules with corner ornaments
- "EST. 2026 ✦ A FARCASTER NEWSPAPER ✦ v1.0"
- "ALL THE NEWS THAT'S FIT TO CAST" tagline
- Black and white, ink-on-paper aesthetic

---

## 13. Environment Variables

```
DATABASE_URL            — Neon PostgreSQL connection string
NEYNAR_API_KEY          — Neynar API authentication key
NEYNAR_WALLET_ID        — Server wallet identifier (used in x-wallet-id header)
NEYNAR_WALLET_ADDRESS   — Server wallet Ethereum address (0x27df...)
NEXT_PUBLIC_USER_FID    — Editor's Farcaster FID (mj41fantastican)
```

---

## 14. Cron Jobs

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/daily-fetch` | Daily (before deadline) | Fetch Neynar trending casts, channels, tokens, mini apps, network stats |
| `/api/cron/publish-scheduled` | Every 5 min or hourly | Check for scheduled issues and auto-publish |

Auto-publish fallback: if editor misses deadline, system selects top engagement stories from `daily_feed` and publishes automatically.

---

## 15. Widget System

Widgets render on `front-page.tsx` (bottom area) and `widget-panel.tsx`.

Active widgets stored in `paper_settings.activeWidgets` (comma-separated):
- `art` — generative art
- `weather` — local weather
- `cat` — cat facts
- `anilist` — anime trending

---

## 16. Build History & Feature Changelog

### Phase 1: Foundation
- Core newspaper layout with 6-section broadsheet structure
- Neynar SDK integration for Farcaster auth
- Base blockchain payments (wagmi + farcasterMiniApp connector)
- Drizzle ORM + Neon PostgreSQL schema
- Daily feed system (Neynar API cron)
- Curator dashboard with story slots
- Auto-publish fallback

### Phase 2: Monetization & Collectibles
- Paywall system ($RWACu ERC-20 payment)
- Read unlock + issue mint flows
- Personal cover NFT (AI-generated, per-user)
- ERC-721 contract deployment on Base
- Collectibles panel (personal gallery)
- Airdrop whitelist system
- Token Tracker (CoinGecko-backed, 6 token slots)
- Archive panel (all past issues)

### Phase 3: Polish & Features
- Theme system (11 themes, terminal has animated tabs)
- Page 2 (jokes, facts, Farcaster stats, Magic 8-Ball)
- Mini App Showcase Editor (curated briefs section)
- AI story rewriter
- Scheduled publishing
- Settings panel (deadline, fallback, branding)
- Share button integration
- Widget panel system

### Phase 4: Community & Distribution (current session)
- **Free subscriber system**: subscribe toggle on front page, push notifications
- **Settings consolidated into Editor tab**: removed Settings tab entirely
- **Archive replaced with Mint Gallery**: shows only NFT mints (all collectors visible)
- **Copper price ticker**: live on-chain oracle data scrolling below masthead
  - Three oracle classes (A/COMEX, B/Scrap, C/Industrial) via `eth_call` on Base
  - Color fix: theme-aware `svgFg`/`svgBg` values instead of hardcoded white
- **Read price reduced**: 8,282 → 4,141 $RWACu (≈$0.01), $RWACu-only
- **Paid reader notifications**: `/api/notify-readers` notifies ALL past paid readers on publish
- **App logo updated**: Tribune broadsheet masthead as Warpcast search icon
- **Share on mint**: `sdk.actions.composeCast` share flow after cover mint

---

## 17. Known Issues & Edge Cases

### Paywall
- `wagmi` connector requires user to have Farcaster wallet connected
- If user rejects transaction, error is caught and stage resets to `idle`
- No refund mechanism — payments are transfers to editor wallet, not contract escrow

### Copper Ticker
- Silently hides if oracle fetch fails (no error shown to user)
- Class B scale: value ÷ 100 (not ÷ 1e8) — different from A/C
- Oracle contracts have no public ABI; selectors discovered by trial/error

### Notifications
- Neynar push requires user to have added the app and enabled notifications
- Batch size: 100 FIDs per API call (Neynar limit)
- `lastNotifiedAt` tracked in `subscribers` table but not rate-limited in code

### Auto-publish
- Fallback selects by `engagement_score` — field must exist in `daily_feed` data
- If `daily_feed` is empty (first run), fallback will fail gracefully

### Archive (MintArchive)
- Shows `getAllMints(100)` — hard limit 100 mints
- Old `archive-panel.tsx` still exists in components/ but is not rendered anywhere

### Settings Panel
- `settings-panel.tsx` still exists in components/ but is not rendered anywhere
- Paper settings now inline in curator dashboard

---

## 18. Future Roadmap / Suggestions

See `BUILD_LOG_SIMPLE.md` for concise version. Detailed items:

1. **Auto-share on mint**: `sdk.actions.composeCast` requires user interaction (Warpcast opens compose dialog). Cannot truly auto-post. Best practice: trigger compose immediately when `stage === 'done'`, pre-filled with cover image embed and app URL.

2. **Notify paid readers on publish** (in-progress): `/api/notify-readers` exists and works. Need to wire call in `curator-dashboard.tsx` `handlePublish()` alongside existing `notifySubscribersOnPublish()`.

3. **Subscriber funnel**: Currently subscribers ≠ paid readers. Consider merging: automatically subscribe anyone who pays to read, so notification audience grows organically.

4. **Cast embed for share image**: The share image route (`/api/share/image/`) could generate a cover-preview image using Satori with issue headline + Tribune logo for rich OG embeds.

5. **Token-gated discount**: $RWACu holders above threshold (e.g., 100K) get discounted or free reads. Feasible via on-chain balance check before paywall.

6. **Writer portal**: Allow FIDs other than editor to submit story drafts for editor review. Store in new `submissions` table.

7. **Weekly digest**: Batch notification Sunday AM summarizing week's top stories.

8. **Revenue dashboard**: Track cumulative $RWACu received, convert to USD for at-a-glance revenue visibility.

9. **Issue scheduling UI improvement**: Current scheduled publishing works but UX is minimal. A calendar picker would improve usability.

10. **Cast-to-story AI**: Take a trending cast hash, expand it into full article draft using AI, load into write-in slot.
