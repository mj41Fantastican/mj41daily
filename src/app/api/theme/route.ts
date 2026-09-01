import { NextResponse } from "next/server";
import { getSettings } from "@/db/actions/settings";

/**
 * GET /api/theme
 * Returns the current color scheme — always fresh, never cached.
 * Used by clients on cold mount to load the latest editor-set theme.
 */
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(
    {
      colorScheme: settings.colorScheme ?? "bw",
      activeWidgets: (settings.activeWidgets ?? "art,weather,cat,anilist").split(",").filter(Boolean),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    },
  );
}
