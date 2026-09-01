# The Daily Miscellany

**A Compendium Of Interesting Things** — a daily newspaper that runs as a Farcaster
mini app and as a website at [mj41daily.com](https://mj41daily.com).

An mj41, LLC publication. Editor: [@mj41fantastican](https://warpcast.com/mj41fantastican).

---

## What this is

A broadsheet-style daily paper. Headlines are free; full articles are paywalled.
Readers pay in ETH or USDC at a price the editor sets, and **41 $RWACu is burned on
every purchase** — a fixed ritual regardless of what was paid.

Volume 2 begins with Issue #1 and an empty archive. Volume 1 (issues #1–129) lived in
the previous Neynar-hosted deployment; recovering it is pending and not blocking.

## Stack

Next.js 16 · React 19 · Drizzle ORM · Postgres · wagmi + viem · Base mainnet ·
Neynar SDK · Tailwind 4

## Running locally

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL and NEYNAR_API_KEY
pnpm dev
```

`pnpm dev` pushes the schema to the database before starting. With no `DATABASE_URL`
the app still boots — it just persists nothing.

```bash
pnpm validate     # type-check + lint + format check
pnpm type-check
pnpm lint:fix
```

## Deployment

Vercel, auto-deploying from `main`. Environment variables live in Project Settings,
never in the repo — this repository is public.

### Scheduled jobs

`vercel.json` defines two crons:

| Job | Schedule (UTC) | Purpose |
| --- | --- | --- |
| `/api/cron/daily-fetch` | `0 10 * * *` | Pull the day's Farcaster feed before deadline |
| `/api/cron/publish-scheduled` | `0 17 * * *` | Publish any issue whose scheduled time has passed |

The editor's deadline is 12:00 America/Chicago. Both jobs run once daily, which is
what the Vercel Hobby plan allows. On Pro, `publish-scheduled` should move to
`*/15 * * * *` so scheduled issues publish close to their actual time rather than
once a day.

Set `CRON_SECRET` in Vercel and it is sent automatically as
`Authorization: Bearer <secret>`; both routes reject anything else.

### Farcaster manifest

`src/config/account-association.json` is signed against a specific domain. It still
carries the old Neynar domain and **must be re-signed for mj41daily.com** before the
mini app will load inside Farcaster.

## Contracts on Base

| | Address |
| --- | --- |
| $RWACu | `0x184f5aacdbb3e482ce6e5e4a7075500e589a5e68` |
| NFT (legacy, Neynar-owned — being replaced) | `0x7b80abcfb1feb4dea794358361c625481727ff5d` |

The legacy NFT contract is owned by Neynar's server wallet and has never successfully
minted a token; `totalSupply()` is 0. A replacement owned by mj41 is planned.

## Layout

```
src/
  app/            routes, API endpoints, cron jobs
  features/app/   the paper — front page, editor dashboard, page 2, archive
  db/             Drizzle schema and server actions
  hooks/          issue, paywall, settings, archive
  config/         public/private config, Farcaster manifest, NFT collection
  settings/       app name, description, images
```

The `kv` table in `src/db/schema.ts` is required by the platform. Do not remove it.
