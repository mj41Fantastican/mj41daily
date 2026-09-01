# Requirements

> **Created**: 2026-03-07
> **Last Updated**: 2026-03-07

---

## App Overview

| Field               | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| **Name**            | The Daily Tribune: A Farcaster Newspaper v1.0                         |
| **Type**            | Daily newspaper / media / content platform                            |
| **Target Audience** | Farcaster users who want curated daily news about the ecosystem       |
| **Core Experience** | Read today's front page — headlines visible free, full content paywalled |
| **Editor**          | @mj41fantastican                                                      |

---

## Visual Style

| Field               | Value                                                              |
| ------------------- | ------------------------------------------------------------------ |
| **Vibe**            | Classic broadsheet newspaper — serious, editorial, black and white |
| **Colors**          | Black and white only — ink on paper aesthetic                      |
| **Style Direction** | Traditional newspaper masthead with rules, column dividers, serif  |
| **Typography**      | Georgia/Times New Roman serif for body, Arial sans-serif for labels |

**User's Words**: "classic broadsheet", "traditional newspaper logo", "dramatic and classic"

---

## Core Features

### Must-Have (Phase 3 Priority: High)

- [ ] **Front Page Display**: Full newspaper layout — nameplate, 6 sections in exact order (nameplate, 3-col headline row, feature image, 3-col mid stories, briefs strip, 4-col section teasers)
- [ ] **Paywall — Read Unlock**: $0.01 USDC, ETH, or 4,141 $RWACu (0x184f5aacdbb3e482ce6e5e4a7075500e589a5e68) to unlock full content. Headlines always visible free.
- [ ] **Paywall — Mint NFT**: $0.041 USDC, ETH, or 41,041 $RWACu to mint Issue NFT and own permanently. Includes read access + collector status.
- [ ] **Curator Dashboard (Editor-only)**: FID-gated. Pick stories from Neynar-fetched suggestions per slot. Each slot has pick list + ✏️ write-in toggle for custom articles.
- [ ] **Auto-publish Fallback**: If editor misses deadline, system auto-selects by engagement score and publishes automatically.
- [ ] **Archive**: Browse all past issues. Per-issue stats (mints, readers, revenue). Unlock/mint individual back issues.
- [ ] **Settings Panel**: Configure deadline time + timezone, fallback rule, notifications, paywall pricing, paper identity.
- [ ] **Issue Database**: Store issues, stories, unlock records, mint records per user FID.

### Nice-to-Have (Phase 3 Priority: Medium)

- [ ] **Preview Before Publish**: Editor can preview the front page before hitting publish.
- [ ] **Reader Breakdown Per Issue**: In archive detail, show split of USDC vs ETH vs $RWACu payments.
- [ ] **Editorial Note**: Optional write-in field per issue that appears in nameplate area. Weekly or monthly cadence.
- [ ] **Writer Attribution**: Stories can have bylines from contributing writers, not just "Staff Reporter".

### Future Considerations (Not in Current Scope)

- **Writer Portal**: Dedicated interface for contributors to submit stories for editor review.
- **Journalist Integration**: Dedicated journalist role with their own beats and bylines.
- **Subscriber Model**: Pay once for a weekly/monthly subscription rather than per-issue.
- **Cast-to-Story**: Automatically expand a cast into a full article draft using AI.

---

## Daily Data Flow

### Neynar API Fetches (automated, runs daily before deadline)
- **Top 10 trending casts** (last 24h) — ranked by engagement, tagged pos/neg signal
- **Top 10 channels** by 24h cast activity — with member count and growth %
- **Top 10 tokens** by mention volume — with price and change %
- **All new mini app launches** (last 24h) — auto-added to briefs, no editor action needed
- **Network stats** — DAU, new signups, total casts today

### Editor Slots (required to publish)
1. **Lead Story** — pick from top 10 trending OR write in custom article
2. **Secondary Negative** — pick from neg-signal casts OR write in
3. **Secondary Positive** — pick from pos-signal casts OR write in
4. **Channel Spotlight** — pick from top 10 channels OR write in
5. **Token Story** — pick from top 10 tokens OR write in custom take

### Auto-added (no editor action)
- New mini apps → briefs strip
- Network stats → mid stories row

---

## Front Page Layout (exact section order)

```
1. NAMEPLATE        — full-width: title, issue #, date, price, editor, tagline
2. HEADLINE ROW     — 3 cols: secondary-left | MAIN HEADLINE (2x wide) | secondary-right
3. FEATURE IMAGE    — full-width: Tribune logo + caption
4. MID STORIES      — 3 equal cols: on-chain | network | tokens
5. BRIEFS STRIP     — full-width: 5 bullet items with section tags
6. SECTION TEASERS  — 4 equal cols: Protocol | Culture | Builders | Tokens
```

---

## Issue Pricing

| Action       | USDC/ETH  | $RWACu                                       |
| ------------ | --------- | -------------------------------------------- |
| Read unlock  | $0.01     | 4,141 tokens                                 |
| Mint (own)   | $0.041    | 41,041 tokens                                |
| Cover price  | $0.041    | displayed in nameplate only                  |

**$RWACu contract**: `0x184f5aacdbb3e482ce6e5e4a7075500e589a5e68` on Base

---

## Sharing Configuration

| Field                      | Value                                              |
| -------------------------- | -------------------------------------------------- |
| **Share Button Placement** | Bottom of front page, visible after unlock         |
| **shareButtonTitle**       | "Read Today's Tribune"                             |
| **Personalization Data**   | Issue number, date, lead headline                  |

---

## Data Requirements

| Field                 | Value                                                               |
| --------------------- | ------------------------------------------------------------------- |
| **Persistence**       | Yes — issues, stories, per-user unlock/mint records                 |
| **What Needs Saving** | Issues (content), user unlock records, mint records, editor settings |
| **User-Specific**     | Yes — each user's unlock/mint status tracked by FID                 |
| **Authentication**    | Farcaster login via SDK. Editor dashboard gated to @mj41fantastican FID. |

---

## Technical Constraints

| Field                    | Value                                                                    |
| ------------------------ | ------------------------------------------------------------------------ |
| **Platform Focus**       | Mobile-first, 424px Farcaster mini app viewport                          |
| **Blockchain**           | Base — USDC transfers, ETH transfers, ERC-20 $RWACu transfers, ERC-721 NFT mint |
| **Special Requirements** | Cron job for daily Neynar data fetch + auto-publish fallback at deadline  |

---

## Design Decisions & Rationale

| Decision                              | Rationale                                                           | Phase   |
| ------------------------------------- | ------------------------------------------------------------------- | ------- |
| Headlines always free, body paywalled | Newspaper convention — teases value without hiding existence        | Phase 1 |
| Read fee ($0.01) separate from mint   | Lower friction for casual readers, higher for collectors            | Phase 1 |
| $RWACu as third currency              | Editor's own token — creates utility and demand                     | Phase 1 |
| Auto-publish fallback                 | Daily paper can't miss an issue — keeps cadence even if editor busy | Phase 1 |
| Write-in toggle on every slot         | Editor may get contributors or write original pieces                | Phase 1 |
| 4 tabs: Front Page / Editor / Archive / Settings | Clean separation of reader vs editor views          | Phase 1 |
| Serif + black/white only              | Newspaper aesthetic — no color needed, ink on paper feel            | Phase 1 |

---

## Change Log

| Timestamp   | Phase   | Description                              |
| ----------- | ------- | ---------------------------------------- |
| 2026-03-07  | Phase 1 | Initial specs documented from sketch session |
