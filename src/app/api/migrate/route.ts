import { NextResponse } from "next/server";
import { connection } from "@/neynar-db-sdk/db";

/**
 * Migration route — adds missing columns to existing tables.
 * Safe to call multiple times (uses IF NOT EXISTS).
 * GET /api/migrate
 */
export async function GET() {
  try {
    const migrations = [
      // Add news_categories_json to daily_feed if missing
      `ALTER TABLE daily_feed ADD COLUMN IF NOT EXISTS news_categories_json text`,
      // Add on_chain_insight_json to daily_feed if missing
      `ALTER TABLE daily_feed ADD COLUMN IF NOT EXISTS on_chain_insight_json text`,
      // Add lead/secondary sources columns to issues if missing
      `ALTER TABLE issues ADD COLUMN IF NOT EXISTS lead_sources_json text`,
      `ALTER TABLE issues ADD COLUMN IF NOT EXISTS secondary_left_sources_json text`,
      `ALTER TABLE issues ADD COLUMN IF NOT EXISTS secondary_right_sources_json text`,
      // Add tracker tokens column to issues if missing
      `ALTER TABLE issues ADD COLUMN IF NOT EXISTS tracker_tokens_json text`,
      // Add airdrop enabled flag to issues if missing
      `ALTER TABLE issues ADD COLUMN IF NOT EXISTS airdrop_enabled boolean DEFAULT false`,
      // Create airdrop whitelist table if missing
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
    ];

    const results: string[] = [];
    for (const sql of migrations) {
      try {
        await connection.unsafe(sql);
        results.push(`✓ ${sql}`);
      } catch (err) {
        results.push(`✗ ${sql} — ${err}`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
