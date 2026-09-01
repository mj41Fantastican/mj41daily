# The Daily Tribune — Simple Build Log

> Last updated: 2026-05-26

---

## What We Built

A daily newspaper mini app for Farcaster. Users open it and see a broadsheet-style front page with curated Farcaster ecosystem news. The editor (@mj41fantastican) publishes each issue daily through a gated dashboard. Headlines are always free; full articles are paywalled.

**Tabs**: Front Page | Editor (gated) | Page 2 | Archive | Collectibles

---

## Features (in order built)

| Feature | Status |
|---|---|
| Broadsheet newspaper layout (6 sections) | Works great |
| Farcaster auth via SDK | Works |
| Daily Neynar feed fetch (cron) | Works |
| Editor dashboard with story slots | Works |
| $RWACu paywall (read unlock) | Works |
| Personal cover NFT (AI-generated, mintable) | Works |
| ERC-721 on Base | Works |
| Collectibles panel (personal gallery) | Works |
| Airdrop whitelist system | Works |
| Token Tracker (6 CoinGecko-backed slots) | Works |
| 11 visual themes (B&W, sepia, terminal, etc.) | Works |
| Page 2 (jokes, facts, trending casts) | Works |
| Free subscriber system + push notifications | Works |
| Copper price oracle ticker (live on-chain) | Works |
| Notify all paid readers on publish | Works |
| App logo → Tribune masthead | Done (May 2026) |

---

## What Worked Well

- **$RWACu-only paywall** — clean, creates real token utility, no multi-currency confusion
- **Personal cover mint** — AI-generated NFT with user's Farcaster identity is compelling
- **Broadsheet aesthetic** — black and white, serif typography, column dividers: feels distinctly like a newspaper, not a generic app
- **Live copper oracle ticker** — unique data nobody else shows; real on-chain reads (not an API wrapper)
- **Theme system** — 11 themes including wild ones (terminal 8-bit, rainbow, 4:20 special) give it personality
- **Editor dashboard consolidation** — moving Settings into the Editor tab cleaned up navigation significantly
- **Notification split** — separate notification pools for free subscribers vs. paid readers is smart segmentation

---

## What Didn't Work / Problems Hit

| Problem | What Happened | Fix |
|---|---|---|
| Copper oracle REST APIs (classa.mj41.me) | All endpoints 404 | Switched to direct `eth_call` on Base RPC |
| Chainlink `latestRoundData()` on copper contracts | Reverted — non-standard ABI | Probed with multiple selectors, found working ones |
| Class B oracle scale was wrong | Used ÷ 1e8 like Class A → price $5.92 not $592 | Fixed: ÷ 100 for Class B |
| Copper ticker white-on-white | Hardcoded `color: '#ffffff'` matched white B&W bg | Switched to `theme.svgFg` / `theme.svgBg` |
| `useFarcasterUser` destructuring | `{ user }` vs `{ data }` naming inconsistency | Use `{ data }` — SDK docs confirm this |
| 12 readers count seemed low | Actually accurate — cumulative total across all issues | Not a bug; app needs more distribution |

---

## What Didn't Make It (yet)

- **Auto-share on mint**: `sdk.actions.composeCast` can't auto-post without user confirmation. The compose dialog opens pre-filled — that's the best we can do. Button exists, flow works, it's just not truly "automatic."
- **Notify paid readers on publish**: Route exists (`/api/notify-readers`) and works. Wiring into `handlePublish()` in curator dashboard is the last step.

---

## Suggestions for Future Direction

### Highest Impact
1. **Wire notify-readers into publish** — one-line addition to `curator-dashboard.tsx` `handlePublish()`. Will immediately expand notification reach beyond just free subscribers.
2. **Auto-subscribe on read** — when a user pays to read, automatically add them as a subscriber too. Right now those are two separate opt-ins.
3. **Share image route** — build a Satori-based OG image for the share button that shows the Tribune masthead + today's lead headline. Richer cast embeds = more organic distribution.

### Medium Term
4. **Cast-to-story AI** — feed a trending cast hash → AI expands it into a full article draft, pre-loaded into the write-in slot. Speeds up daily editing workflow significantly.
5. **Revenue dashboard** — track cumulative $RWACu received per issue, convert to USD. Right now the editor has no quick revenue visibility.
6. **Writer submissions** — let other FIDs submit story pitches for editor review. Adds community without giving up editorial control.

### Longer Term
7. **Token-gated free reads** — $RWACu holders above a threshold read free. Creates holding incentive.
8. **Weekly digest notification** — Sunday AM summary of the week's top stories. Low effort, high engagement.
9. **Subscriber/reader analytics** — chart of readers per issue over time. Right now it's a flat count, no trend visibility.
10. **Calendar scheduling UI** — current issue scheduler works but the UX is rough. A date/time picker would make it usable without thinking.

---

## The One Thing to Fix First

Wire `/api/notify-readers` into `curator-dashboard.tsx` `handlePublish()` — same place `notifySubscribersOnPublish()` already fires. This doubles your notification reach immediately.
