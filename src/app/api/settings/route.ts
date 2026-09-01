import { NextRequest, NextResponse } from "next/server";
import { saveSettings } from "@/db/actions/settings";

/**
 * POST /api/settings
 * Accepts a partial PaperSettings payload and upserts the singleton row.
 * Used by the editor dashboard to save colorScheme, activeWidgets, etc.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Only allow safe fields — never allow id or updatedAt from client
    const {
      colorScheme,
      activeWidgets,
      paperName,
      tagline,
      editorHandle,
      channelUrl,
      websiteUrl,
      readPriceUsdc,
      mintPriceUsdc,
      rwacReadAmount,
      rwacMintAmount,
      enabledCurrencies,
      coverPrice,
      deadlineHour,
      timezone,
      fallbackRule,
      notifyOnPublish,
      notifyDeadlineWarning,
      warningMinutes,
      editorialNoteEnabled,
      editorialNote,
      airdropDefault,
    } = body;

    const patch: Record<string, unknown> = {};
    if (colorScheme !== undefined) patch.colorScheme = colorScheme;
    if (activeWidgets !== undefined) patch.activeWidgets = activeWidgets;
    if (paperName !== undefined) patch.paperName = paperName;
    if (tagline !== undefined) patch.tagline = tagline;
    if (editorHandle !== undefined) patch.editorHandle = editorHandle;
    if (channelUrl !== undefined) patch.channelUrl = channelUrl;
    if (websiteUrl !== undefined) patch.websiteUrl = websiteUrl;
    if (readPriceUsdc !== undefined) patch.readPriceUsdc = readPriceUsdc;
    if (mintPriceUsdc !== undefined) patch.mintPriceUsdc = mintPriceUsdc;
    if (rwacReadAmount !== undefined) patch.rwacReadAmount = rwacReadAmount;
    if (rwacMintAmount !== undefined) patch.rwacMintAmount = rwacMintAmount;
    if (enabledCurrencies !== undefined) patch.enabledCurrencies = enabledCurrencies;
    if (coverPrice !== undefined) patch.coverPrice = coverPrice;
    if (deadlineHour !== undefined) patch.deadlineHour = deadlineHour;
    if (timezone !== undefined) patch.timezone = timezone;
    if (fallbackRule !== undefined) patch.fallbackRule = fallbackRule;
    if (notifyOnPublish !== undefined) patch.notifyOnPublish = notifyOnPublish;
    if (notifyDeadlineWarning !== undefined) patch.notifyDeadlineWarning = notifyDeadlineWarning;
    if (warningMinutes !== undefined) patch.warningMinutes = warningMinutes;
    if (editorialNoteEnabled !== undefined) patch.editorialNoteEnabled = editorialNoteEnabled;
    if (editorialNote !== undefined) patch.editorialNote = editorialNote;
    if (airdropDefault !== undefined) patch.airdropDefault = airdropDefault;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await saveSettings(patch as any);
    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Save failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
