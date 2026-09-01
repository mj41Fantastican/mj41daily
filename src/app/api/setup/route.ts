import { NextResponse } from "next/server";
import { connection } from "@/neynar-db-sdk/db";

/**
 * Database setup route — creates all core tables if they don't exist.
 * Safe to call multiple times (uses IF NOT EXISTS throughout).
 * GET /api/setup
 *
 * Run this once after first deploy if issues table is missing.
 */
export async function GET() {
  try {
    const migrations = [
      // ── KV store (required by platform)
      `CREATE TABLE IF NOT EXISTS kv (
        key text PRIMARY KEY,
        value text NOT NULL
      )`,

      // ── Issues — each published daily issue
      `CREATE TABLE IF NOT EXISTS issues (
        id serial PRIMARY KEY,
        issue_number integer NOT NULL,
        vol integer NOT NULL DEFAULT 1,
        date text NOT NULL,
        published_at timestamp NOT NULL DEFAULT now(),
        auto_published boolean DEFAULT false,
        lead_headline text,
        lead_byline text,
        lead_body text,
        secondary_left_label text,
        secondary_left_headline text,
        secondary_left_summary text,
        secondary_right_label text,
        secondary_right_headline text,
        secondary_right_summary text,
        mid_stories_json text,
        briefs_json text,
        teasers_json text,
        lead_sources_json text,
        secondary_left_sources_json text,
        secondary_right_sources_json text,
        tracker_tokens_json text,
        editorial_note text,
        editor_byline text,
        price text DEFAULT '$0.041',
        website text DEFAULT 'dailyfarcaster.fc',
        editor text DEFAULT '@mj41fantastican',
        version text DEFAULT 'v2',
        airdrop_enabled boolean DEFAULT false,
        status text DEFAULT 'published',
        scheduled_for timestamp
      )`,

      // ── Daily feed — Neynar API fetches
      `CREATE TABLE IF NOT EXISTS daily_feed (
        id serial PRIMARY KEY,
        fetched_at timestamp NOT NULL DEFAULT now(),
        trending_casts_json text,
        top_channels_json text,
        top_tokens_json text,
        new_mini_apps_json text,
        network_stats_json text,
        news_categories_json text,
        on_chain_insight_json text,
        deadline text DEFAULT '12:00 UTC',
        time_left text
      )`,

      // ── Reader access — paywall unlock records per user per issue
      `CREATE TABLE IF NOT EXISTS reader_access (
        id serial PRIMARY KEY,
        fid integer NOT NULL,
        issue_id integer NOT NULL,
        access_type text NOT NULL,
        payment_method text NOT NULL,
        tx_hash text,
        granted_at timestamp NOT NULL DEFAULT now()
      )`,

      // ── Issue mints — NFT mint records
      `CREATE TABLE IF NOT EXISTS issue_mints (
        id serial PRIMARY KEY,
        fid integer NOT NULL,
        issue_id integer NOT NULL,
        tx_hash text NOT NULL,
        minted_at timestamp NOT NULL DEFAULT now()
      )`,

      // ── Paper settings — singleton editor config
      `CREATE TABLE IF NOT EXISTS paper_settings (
        id integer PRIMARY KEY DEFAULT 1,
        deadline_hour text DEFAULT '12:00',
        timezone text DEFAULT 'UTC',
        fallback_rule text DEFAULT 'auto',
        notify_on_publish boolean DEFAULT true,
        notify_deadline_warning boolean DEFAULT true,
        warning_minutes integer DEFAULT 30,
        read_price_usdc text DEFAULT '0.01',
        mint_price_usdc text DEFAULT '0.041',
        rwac_read_amount text DEFAULT '4141',
        rwac_mint_amount text DEFAULT '41041',
        enabled_currencies text DEFAULT 'USDC,ETH,$RWACu',
        cover_price text DEFAULT '$0.041',
        tagline text DEFAULT 'All the news that''s fit to cast',
        editor_handle text DEFAULT '@mj41fantastican',
        color_scheme text DEFAULT 'bw',
        paper_name text DEFAULT 'The Daily Tribune',
        channel_url text DEFAULT '',
        website_url text DEFAULT 'dailyfarcaster.fc',
        editorial_note_enabled boolean DEFAULT false,
        editorial_note text DEFAULT '',
        airdrop_default boolean DEFAULT false,
        updated_at timestamp DEFAULT now()
      )`,

      // ── Personal cover mints — minted parody Tribune covers
      `CREATE TABLE IF NOT EXISTS personal_cover_mints (
        id serial PRIMARY KEY,
        serial text NOT NULL UNIQUE,
        serial_index integer NOT NULL,
        fid integer NOT NULL,
        username text NOT NULL,
        display_name text NOT NULL,
        token_id text,
        contract_address text NOT NULL,
        network text NOT NULL DEFAULT 'base',
        tx_hash text,
        metadata_uri text,
        image_url text NOT NULL,
        issue_date text NOT NULL,
        issue_value text NOT NULL DEFAULT '$0.041',
        neynar_score text,
        headline text NOT NULL,
        open_sea_url text,
        minted_at timestamp NOT NULL DEFAULT now()
      )`,

      // ── Backfill new paper_settings columns (safe on existing tables)
      `ALTER TABLE paper_settings
        ADD COLUMN IF NOT EXISTS color_scheme text DEFAULT 'bw',
        ADD COLUMN IF NOT EXISTS paper_name text DEFAULT 'The Daily Tribune',
        ADD COLUMN IF NOT EXISTS channel_url text DEFAULT '',
        ADD COLUMN IF NOT EXISTS website_url text DEFAULT 'dailyfarcaster.fc',
        ADD COLUMN IF NOT EXISTS editorial_note_enabled boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS editorial_note text DEFAULT '',
        ADD COLUMN IF NOT EXISTS airdrop_default boolean DEFAULT false
      `,

      // ── Airdrop whitelist — buyers eligible for token drops
      `CREATE TABLE IF NOT EXISTS airdrop_whitelist (
        id serial PRIMARY KEY,
        issue_id integer NOT NULL,
        fid integer NOT NULL,
        wallet_address text NOT NULL,
        access_type text NOT NULL,
        payment_method text NOT NULL,
        tx_hash text,
        added_at timestamp NOT NULL DEFAULT now()
      )`,

      // ── NFT payment txns — replay protection
      `CREATE TABLE IF NOT EXISTS nft_payment_txns (
        tx_hash text PRIMARY KEY,
        fid integer NOT NULL,
        collection_slug text NOT NULL,
        used_at timestamp NOT NULL DEFAULT now()
      )`,

      // ── NFT previews — preview-first mint images
      `CREATE TABLE IF NOT EXISTS nft_previews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        fid integer NOT NULL,
        collection_slug text NOT NULL,
        image_url text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        UNIQUE (fid, collection_slug)
      )`,
    ];

    const results: string[] = [];
    for (const sql of migrations) {
      const label = sql.trim().split("\n")[0].slice(0, 80);
      try {
        await connection.unsafe(sql);
        results.push(`✓ ${label}`);
      } catch (err) {
        results.push(`✗ ${label} — ${err}`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
