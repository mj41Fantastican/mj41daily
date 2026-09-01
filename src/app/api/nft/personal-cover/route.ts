import { NextRequest, NextResponse } from "next/server";
import { privateConfig } from "@/config/private-config";
import { generateNftImage } from "@/neynar-web-sdk/nextjs";
import { saveGeneratedImage } from "@/db/actions/generated-images";

// 4/20 special: today only
const TODAY_IS_420 = (() => {
  const d = new Date();
  return d.getMonth() === 3 && d.getDate() === 20; // month is 0-indexed
})();

function buildHeadline(username: string): string {
  if (TODAY_IS_420) {
    return `@${username} GOT HIGH AF TODAY`;
  }
  return `EXTRA! EXTRA! @${username} IS A BIG DEAL!`;
}

/**
 * GET /api/nft/personal-cover?fid=12345
 *
 * Fetches the user's Farcaster profile, builds a personalized
 * AI image prompt, and generates a parody Miscellany front page
 * starring the user. Payment must be completed client-side first.
 */
export async function GET(req: NextRequest) {
  const fid = req.nextUrl.searchParams.get("fid");
  if (!fid) {
    return NextResponse.json({ error: "fid is required" }, { status: 400 });
  }

  try {
    // 1. Fetch user profile
    const userRes = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          "x-api-key": privateConfig.neynarApiKey,
          "Content-Type": "application/json",
        },
        next: { revalidate: 0 },
      },
    );

    if (!userRes.ok) {
      throw new Error(`Neynar user fetch failed: ${userRes.status}`);
    }

    const userData = await userRes.json();
    const user = userData?.users?.[0];
    const username: string = user?.username ?? `fid${fid}`;
    const displayName: string = user?.display_name ?? username;
    const pfpUrl: string | null = user?.pfp_url ?? null;
    // Neynar score lives at experimental.neynar_user_score or score or viewer_context fields
    const neynarScore: number | null =
      user?.experimental?.neynar_user_score ??
      user?.score ??
      user?.neynar_score ??
      null;

    // 2. Build headline
    const headline = buildHeadline(username);
    const issueNumber = `FID #${fid}`;
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // 3. Build prompt — 4/20 special edition vs standard
    const prompt = TODAY_IS_420
      ? [
          "Classic American broadsheet newspaper front page. Black ink on white newsprint. Dramatic editorial design. Square 1:1.",
          `Top masthead in bold serif capitals: "THE DAILY MISCELLANY — 4/20 SPECIAL EDITION".`,
          `Below masthead: left side reads "${issueNumber}", right side reads "${today}". Thin rule line separating masthead from content.`,
          pfpUrl
            ? `Center: a large circular portrait medallion of the featured person (use the face from the source image). The person has extremely glassy, bloodshot, half-closed eyes and a huge dopey grin. Faint smoke wisps curling around the portrait. Ink-engraving illustration style.`
            : `Center: a large circular silhouette medallion with smoke wisps. Ink-engraving illustration style.`,
          `Bold serif headline beneath portrait: "${headline}".`,
          `Sub-headline in smaller serif italic: "420 Commemorative Print — The Daily Miscellany".`,
          "Decorative marijuana leaf motifs in the border corners. Column rules on left and right. Celebratory stoner holiday front-page feel.",
          "No color. High-contrast black ink only. Typographic, no photography.",
        ].join(" ")
      : [
          "Classic American broadsheet newspaper front page. Black ink on white newsprint. Dramatic editorial design. Square 1:1.",
          `Top masthead in bold serif capitals: "THE DAILY MISCELLANY".`,
          `Below masthead: left side reads "${issueNumber}", right side reads "${today}". Thin rule line separating masthead from content.`,
          pfpUrl
            ? `Center: a large circular portrait medallion of the featured person (use the face from the source image). Ink-engraving illustration style.`
            : `Center: a large circular silhouette medallion. Ink-engraving illustration style.`,
          `Bold serif headline beneath portrait: "${headline}".`,
          `Sub-headline in smaller serif italic: "Exclusive Report — The Daily Miscellany".`,
          "Decorative column rules on left and right. Confetti dots along the border. Celebratory front-page edition feel.",
          "No color. High-contrast black ink only. Typographic, no photography.",
        ].join(" ");

    // 4. Generate via Neynar SDK (correct endpoint, with wallet-id, high_fidelity for text)
    const config = { apiKey: privateConfig.neynarApiKey, walletId: privateConfig.neynarWalletId };
    const imageResult = await generateNftImage(
      prompt,
      config,
      {
        source_image_urls: pfpUrl ? [pfpUrl] : undefined,
        width: 1024,
        height: 1024,
        format: "png",
        high_fidelity: true,
      },
    );

    // 5. Persist generated image to collection (fire-and-forget, non-fatal)
    saveGeneratedImage({
      fid: Number(fid),
      username,
      displayName,
      imageUrl: imageResult.image_url,
      headline,
      prompt,
      edition: TODAY_IS_420 ? '420-special' : 'standard',
    }).catch((e) => console.warn('[personal-cover] saveGeneratedImage non-fatal:', e));

    return NextResponse.json({
      imageUrl: imageResult.image_url,
      headline,
      issueNumber,
      username,
      displayName,
      neynarScore: neynarScore !== null ? String(neynarScore) : null,
    });
  } catch (err) {
    console.error("Personal cover generation error:", err);
    return NextResponse.json(
      { error: "Cover generation failed", details: String(err) },
      { status: 500 },
    );
  }
}
