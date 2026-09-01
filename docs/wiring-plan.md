# Wiring Plan — The Daily Tribune

> Created: Phase 4 (Feature Planning)
> Last Updated: 2026-03-07

---

## Features Overview

| Feature            | Type       | Mock(s)                                                                                      | Priority |
| ------------------ | ---------- | -------------------------------------------------------------------------------------------- | -------- |
| Issue Content      | database   | `MOCK_ISSUE`, `MOCK_MAIN_STORY`, `MOCK_SECONDARY_LEFT`, `MOCK_SECONDARY_RIGHT`, `MOCK_MID_STORIES`, `MOCK_BRIEFS`, `MOCK_TEASERS` | High |
| Neynar Feed        | social     | `MOCK_FEED` (trendingCasts, topChannels, topTokens, newMiniApps, networkStats)               | High |
| Paywall / Unlock   | blockchain | `PaywallGate` — mock `handlePay` with `setTimeout`                                           | High |
| User Unlock Record | database   | `unlocked` useState in `FrontPage` + `ArchivePanel` (local state, not persisted)             | High |
| Archive Issues     | database   | `MOCK_ARCHIVE`                                                                               | High |
| Paper Settings     | database   | `SettingsPanel` — deadline/timezone/fallback/notifications/paywall/identity (all local state) | High |
| FID Auth Gating    | social     | No mock — Editor and Settings tabs must be gated to editor FID                               | High |
| Share Button       | sharing    | `FrontPage` — mock `console.log('Sharing will be wired in Phase 5!')`                       | High |

---

## Feature Implementation Details

---

### 1. Issue Content (Current Issue)

- **Type**: `database`
- **Mock**: `MOCK_ISSUE`, `MOCK_MAIN_STORY`, `MOCK_SECONDARY_LEFT`, `MOCK_SECONDARY_RIGHT`, `MOCK_MID_STORIES`, `MOCK_BRIEFS`, `MOCK_TEASERS` in `src/data/mocks.ts`
- **Used by**: `src/features/app/components/front-page.tsx`
- **What it represents**: The published content of the current daily issue

**DB Schema** — `issues` table:
```ts
issues: {
  id: serial primary key,
  issueNumber: integer not null,       // 1, 2, 3...
  vol: integer not null default 1,
  date: text not null,                  // display string e.g. "Saturday, March 7, 2026"
  publishedAt: timestamp not null,
  autoPublished: boolean default false,

  // Front page content (stored as JSON or text columns)
  leadHeadline: text,
  leadByline: text,
  leadBody: text,
  secondaryLeftLabel: text,
  secondaryLeftHeadline: text,
  secondaryLeftSummary: text,
  secondaryRightLabel: text,
  secondaryRightHeadline: text,
  secondaryRightSummary: text,
  midStoriesJson: text,                 // JSON array of MidStory[]
  briefsJson: text,                     // JSON array of Brief[]
  teasersJson: text,                    // JSON array of Teaser[]

  // Metadata
  price: text default '$0.041',
  website: text default 'thedailytribune.fc',
  editor: text default '@mj41fantastican',
  version: text default 'v1.0',
}
```

**Files to create**:
- `src/db/schema.ts` — add `issues` table (Drizzle)
- `src/db/actions/issues.ts` — `getCurrentIssue()`, `getIssueById(id)`, `publishIssue(data)`, `listIssues()`
- `src/hooks/use-current-issue.ts` — calls `getCurrentIssue()` server action, returns issue or null

**Mock swap in**:
- `src/features/app/components/front-page.tsx` — replace 7 MOCK_* imports with `useCurrentIssue()` hook result

**Implementation notes**:
- For Phase 5, seed with a real Issue #1 row in the DB so front page has content
- `midStoriesJson`, `briefsJson`, `teasersJson` stored as serialized JSON strings, parsed client-side
- If no current issue exists, show a "First issue coming soon" state in `FrontPage`

---

### 2. Neynar Feed (Curator Data)

- **Type**: `social`
- **Mock**: `MOCK_FEED` in `src/data/mocks.ts`
- **Used by**: `src/features/app/components/curator-dashboard.tsx`
- **What it represents**: Daily data the editor picks stories from — trending casts, top channels, top tokens, new mini apps, network stats

**Neynar SDK approach**:

The feed data needs daily curation suggestions. In Phase 5, we'll use:

- **Trending casts**: `useUser` + direct Neynar API call to fetch trending casts ranked by engagement (last 24h)
- **Top channels**: Neynar API channel search/ranking endpoint
- **Top tokens**: Neynar API token mention endpoint
- **New mini apps**: Neynar API frames/mini-apps endpoint (last 24h)
- **Network stats**: Neynar API network stats endpoint

Since many of these Neynar calls are best done server-side with a cron job, the pattern will be:

1. A server action `fetchDailyFeedData()` that calls Neynar API and stores results in DB
2. A cron route `src/app/api/cron/daily-fetch/route.ts` that triggers this daily
3. A hook `useDailyFeed()` that reads the stored feed data from DB

**Files to create**:
- `src/db/schema.ts` — add `daily_feed` table (stores daily fetch results as JSON)
- `src/db/actions/feed.ts` — `getLatestFeed()`, `saveFeedData(data)`
- `src/app/api/cron/daily-fetch/route.ts` — calls Neynar API, stores to DB
- `src/hooks/use-daily-feed.ts` — fetches stored feed data for curator dashboard

**DB Schema** — `daily_feed` table:
```ts
daily_feed: {
  id: serial primary key,
  fetchedAt: timestamp not null,
  trendingCastsJson: text,      // TrendingCast[] as JSON
  topChannelsJson: text,         // TopChannel[] as JSON
  topTokensJson: text,           // TopToken[] as JSON
  newMiniAppsJson: text,         // MiniApp[] as JSON
  networkStatsJson: text,        // NetworkStats as JSON
  deadline: text,                // e.g. "12:00 UTC"
  timeLeft: text,                // computed at fetch time
}
```

**Mock swap in**:
- `src/features/app/components/curator-dashboard.tsx` — replace `MOCK_FEED` with `useDailyFeed()` hook

**Implementation notes**:
- If no feed data exists yet, fall back to `MOCK_FEED` constants for graceful degradation during initial setup
- The `autoSelect()` function in curator-dashboard will use real feed data after swap
- Neynar API base URL: `https://api.neynar.com/v2/farcaster/`
- Use `NEYNAR_API_KEY` env var for server-side calls

---

### 3. Paywall / Unlock (Blockchain Payment)

- **Type**: `blockchain`
- **Mock**: `handlePay()` in `PaywallGate` — `setTimeout` simulating payment with `onUnlock()` callback
- **Used by**: `src/features/app/components/paywall-gate.tsx`
- **What it represents**: Real on-chain payment to unlock or mint an issue

**Blockchain integration**:

1. **Provider setup**: Add `NeynarWagmiProvider` to `src/app/providers-and-initialization.tsx` (inside QueryClientProvider + JotaiProvider)

2. **USDC read unlock** ($0.01):
   - Use `ExperimentalTransferUsdcButton` from `@neynar/ui`
   - Amount: `0.01` USDC on Base
   - On success: call server action to record unlock, then call `onUnlock()`

3. **ETH read unlock** ($0.01 equiv):
   - Use wagmi `useSendTransaction` with ETH value
   - Or use a custom transfer button with `useWriteContract`

4. **$RWACu read unlock** (4,141 tokens):
   - ERC-20 transfer to editor wallet
   - Contract: `0x184f5aacdbb3e482ce6e5e4a7075500e589a5e68` on Base
   - Use wagmi `useWriteContract` with ERC-20 `transfer()` ABI

5. **Mint NFT** ($0.041 / 41,041 $RWACu):
   - Separate flow — higher price, permanent ownership
   - Same payment options but higher amounts
   - On success: record mint in DB

**Files to create/modify**:
- `src/app/providers-and-initialization.tsx` — add `NeynarWagmiProvider`
- `src/db/actions/access.ts` — `recordUnlock(fid, issueId)`, `recordMint(fid, issueId)`, `hasAccess(fid, issueId)`
- `src/db/schema.ts` — add `reader_access` and `issue_mints` tables
- `src/hooks/use-paywall.ts` — wraps payment flow, checks/records access
- `src/features/app/components/paywall-gate.tsx` — replace mock with real payment buttons

**DB Schema additions**:
```ts
reader_access: {
  id: serial primary key,
  fid: integer not null,
  issueId: integer not null,
  accessType: text not null,     // 'read' | 'mint'
  paymentMethod: text not null,  // 'usdc' | 'eth' | 'rwac'
  txHash: text,
  grantedAt: timestamp not null,
}

issue_mints: {
  id: serial primary key,
  fid: integer not null,
  issueId: integer not null,
  txHash: text not null,
  mintedAt: timestamp not null,
}
```

**Mock swap in**:
- `src/features/app/components/paywall-gate.tsx` — replace `handlePay` mock with real payment flow
- `src/features/app/components/front-page.tsx` — replace `useState(false)` for `unlocked` with `useHasAccess(fid, currentIssueId)`
- `src/features/app/components/archive-panel.tsx` — replace local `unlocked` array with DB query

**Implementation notes**:
- Editor's wallet address for payment recipient: need to resolve from FID or use a fixed address
- Use `useFarcasterUser()` to get current user FID for access records
- On cold load, check `hasAccess(fid, issueId)` to pre-unlock if user already paid

---

### 4. Archive Issues

- **Type**: `database`
- **Mock**: `MOCK_ARCHIVE` in `src/data/mocks.ts`
- **Used by**: `src/features/app/components/archive-panel.tsx`
- **What it represents**: List of all past published issues with stats

**DB**: Uses same `issues` table defined in Feature #1, plus `reader_access` table from Feature #3.

**Files to create**:
- `src/db/actions/issues.ts` — `listIssues()`, `getIssueStats(issueId)`
- `src/hooks/use-archive.ts` — fetches issue list + per-issue stats + user access status

**Mock swap in**:
- `src/features/app/components/archive-panel.tsx` — replace `MOCK_ARCHIVE` with `useArchive()` hook
- Cumulative stats (total mints, revenue) computed from real DB data

**Implementation notes**:
- Revenue = `(readCount * 0.01) + (mintCount * 0.041)` per issue
- `unlocked` local state replaced by checking `reader_access` table per FID

---

### 5. Paper Settings (Editor Configuration)

- **Type**: `database`
- **Mock**: All `useState` in `SettingsPanel` — deadline, timezone, fallback, notifications, pricing, identity
- **Used by**: `src/features/app/components/settings-panel.tsx`
- **What it represents**: Editor-configurable settings for the paper

**DB Schema** — `paper_settings` table:
```ts
paper_settings: {
  id: integer primary key default 1,    // singleton row
  deadlineHour: text default '12:00',
  timezone: text default 'UTC',
  fallbackRule: text default 'auto',
  notifyOnPublish: boolean default true,
  notifyDeadlineWarning: boolean default true,
  warningMinutes: integer default 30,
  readPriceUsdc: text default '0.01',
  mintPriceUsdc: text default '0.041',
  rwacReadAmount: text default '4141',
  rwacMintAmount: text default '41041',
  enabledCurrencies: text default 'USDC,ETH,$RWACu',
  coverPrice: text default '$0.041',
  tagline: text default "All the news that's fit to cast",
  editorHandle: text default '@mj41fantastican',
  updatedAt: timestamp,
}
```

**Files to create**:
- `src/db/actions/settings.ts` — `getSettings()`, `saveSettings(data)` (upsert singleton row)
- `src/hooks/use-paper-settings.ts` — loads settings, provides `save()` function

**Mock swap in**:
- `src/features/app/components/settings-panel.tsx` — init state from `usePaperSettings()` hook; `handleSave` calls `save()`

**Implementation notes**:
- Settings are editor-only — this component is already behind FID gate (Feature #6)
- `enabledCurrencies` stored as comma-separated string, parsed to array on load

---

### 6. FID Auth Gating (Editor-Only Access)

- **Type**: `social`
- **Mock**: No mock — Editor and Settings tabs currently accessible to everyone
- **Used by**: `src/features/app/mini-app.tsx` (tab navigation), `src/features/app/components/curator-dashboard.tsx`, `src/features/app/components/settings-panel.tsx`
- **What it represents**: Only the editor FID (from `process.env.NEXT_PUBLIC_USER_FID`) can access the Editor and Settings tabs

**SDK**: `useFarcasterUser` from `@/neynar-farcaster-sdk/mini`

**Pattern**:
```ts
const { user } = useFarcasterUser();
const isEditor = user?.fid === Number(process.env.NEXT_PUBLIC_USER_FID);
```

**Files to create**:
- `src/hooks/use-is-editor.ts` — wraps the FID check, returns `{ isEditor: boolean, isLoading: boolean }`

**Implementation**:
1. In `mini-app.tsx`: conditionally render Editor and Settings `TabsTrigger` only if `isEditor`
2. In `curator-dashboard.tsx` and `settings-panel.tsx`: add a guard at top — if `!isEditor`, render "🔐 Editor access required" message

**Implementation notes**:
- Editor FID stored in `NEXT_PUBLIC_USER_FID` env var (pre-configured in the platform)
- Show tabs to everyone but guard the content — better UX than hiding tabs entirely
- Or hide tabs entirely for cleaner experience — decision: hide tabs (cleaner newspaper feel)

---

### 7. Share Button

- **Type**: `sharing`
- **Mock**: `onClick={() => console.log('Sharing will be wired in Phase 5!')}` in `FrontPage`
- **Used by**: `src/features/app/components/front-page.tsx` (bottom, visible after unlock)
- **Delegate to**: `share-manager` subagent

**Personalization data available**:
- Issue number (e.g., "Issue #1")
- Issue date (e.g., "Saturday, March 7, 2026")
- Lead headline text
- Reader unlock status

**Share context**:
- User just unlocked and read today's issue
- Sharing promotes the paper to their followers
- The share image should look like a newspaper front page miniature

**Component**: `src/features/app/components/front-page.tsx`
- Button is at the bottom, inside `{unlocked && (...)}` block
- Currently: `<Button className="w-full" onClick={() => console.log(...)}>Share Issue #1</Button>`
- Needs to become: `<ShareButton ... />`

---

## Wiring Order for Phase 5

Recommended implementation sequence:

1. **DB Schema first** — create all tables in `src/db/schema.ts` at once (issues, daily_feed, reader_access, issue_mints, paper_settings)
2. **Server actions** — create all action files
3. **FID Auth** — wire `use-is-editor` and hide Editor/Settings tabs (quick win, no dependencies)
4. **Issue Content** — seed Issue #1, wire `useCurrentIssue` in FrontPage
5. **Archive** — wire `useArchive` (depends on issues table)
6. **Paper Settings** — wire `usePaperSettings` in SettingsPanel (depends on settings table)
7. **Neynar Feed** — wire `useDailyFeed` in CuratorDashboard (depends on feed table + cron)
8. **Paywall/Blockchain** — add NeynarWagmiProvider, wire payment buttons (most complex)
9. **Share Button** — delegate to share-manager subagent last

## Notes on Publish Flow

The curator dashboard's "Publish Now" button currently calls `setPublished(true)` locally. In Phase 5:
- It should call `publishIssue(data)` server action
- Which saves the assembled issue to the DB
- Which makes it appear on the Front Page for all readers
- The issue number increments based on the last published issue

The `autoSelect()` function uses `MOCK_FEED` picks — after feed wiring, it will use real Neynar data.
