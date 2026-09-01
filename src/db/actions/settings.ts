"use server";

import { db } from "@/neynar-db-sdk/db";
import { paperSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export type PaperSettingsRow = typeof paperSettings.$inferSelect;

function defaultSettings(): PaperSettingsRow {
  return {
    id: 1,
    deadlineHour: "12:00",
    timezone: "UTC",
    fallbackRule: "auto",
    notifyOnPublish: true,
    notifyDeadlineWarning: true,
    warningMinutes: 30,
    readPriceUsdc: "0.01",
    mintPriceUsdc: "0.041",
    rwacReadAmount: "4141",
    rwacMintAmount: "41041",
    enabledCurrencies: "USDC,ETH,$RWACu",
    coverPrice: "$0.041",
    tagline: "All the news that's fit to cast",
    editorHandle: "@mj41fantastican",
    colorScheme: "bw",
    paperName: "The Daily Tribune",
    channelUrl: "",
    websiteUrl: "dailyfarcaster.fc",
    editorialNoteEnabled: false,
    editorialNote: "",
    airdropDefault: false,
    activeWidgets: "art,weather,cat,anilist",
    updatedAt: new Date(),
  };
}

/**
 * Get the paper settings (singleton row id=1).
 * Returns defaults if not yet configured.
 */
export async function getSettings(): Promise<PaperSettingsRow> {
  try {
    const rows = await db.select().from(paperSettings).where(eq(paperSettings.id, 1)).limit(1);
    if (rows.length > 0) return rows[0];

    // Return in-memory defaults if row doesn't exist yet
    return defaultSettings();
  } catch (error) {
    console.error("Failed to get settings:", error);
    return defaultSettings();
  }
}

/**
 * Save paper settings (upsert singleton row id=1).
 */
export async function saveSettings(
  data: Partial<Omit<PaperSettingsRow, "id" | "updatedAt">>,
) {
  try {
    await db
      .insert(paperSettings)
      .values({ id: 1, ...data })
      .onConflictDoUpdate({
        target: paperSettings.id,
        set: { ...data, updatedAt: new Date() },
      });
    return { success: true };
  } catch (error) {
    console.error("Failed to save settings:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
