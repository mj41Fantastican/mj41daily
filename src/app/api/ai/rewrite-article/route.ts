import { NextResponse } from "next/server";

/**
 * POST /api/ai/rewrite-article
 * Takes raw cast text and a slot type, returns a polished newspaper article
 * with context, explanation, and further reading sources.
 *
 * Body: { castText: string, author: string, slot: string }
 * Returns: { headline: string, byline: string, body: string, sources: { label: string, url: string }[] }
 */
export async function POST(request: Request) {
  try {
    const { castText, author, slot } = await request.json();

    if (!castText) {
      return NextResponse.json({ error: "castText is required" }, { status: 400 });
    }

    const slotContext: Record<string, string> = {
      lead:     "This is the LEAD STORY — the most important story of the day. Write with urgency and authority. Go deeper than the original cast.",
      negative: "This is a NEWS story covering a challenge, concern, or critical development in the Farcaster ecosystem. Explain why this matters.",
      positive: "This is an ANALYSIS piece offering insight or a positive development. Provide context and explain the significance.",
      channel:  "This is a CHANNEL SPOTLIGHT story covering a notable Farcaster channel. Explain the community, what makes it worth following.",
      token:    "This is a MARKET & TOKENS story. Explain the token's role in the ecosystem, why the movement matters, and what to watch.",
    };

    const context = slotContext[slot] ?? "This is a general news story for The Daily Miscellany.";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const prompt = `You are a senior journalist at The Daily Miscellany, a daily newspaper for the Farcaster web3 social protocol. Write in the style of a quality broadsheet — authoritative, informative, and accessible to readers who may not know all the technical details.

${context}

Original cast by ${author}:
"${castText}"

Your job:
1. Write a short but substantive newspaper article explaining what this means and why it matters
2. Provide 2-3 real, relevant sources for further reading (use real URLs from well-known crypto/web3 sources like warpcast.com, farcaster.xyz, base.org, degen.tips, coindesk.com, theblock.co, decrypt.co, etc.)

Return ONLY a JSON object with these exact fields:
- headline: A punchy, newspaper-style headline (max 10 words, ALL CAPS)
- byline: Author credit (e.g. "By Staff Reporter" or "By ${author} · Reported by Miscellany Staff")
- body: The article body — 2-3 short paragraphs. First paragraph: what happened. Second: why it matters / context. Third (optional): what to watch next. Each paragraph separated by a blank line (\\n\\n). Total 90-130 words.
- sources: Array of 2-3 objects, each with "label" (short descriptive text, max 6 words) and "url" (a real, valid URL relevant to the topic). Use real URLs — Warpcast channels, project sites, Dune dashboards, CoinGecko pages, etc.

Example sources format:
[{"label": "Farcaster protocol docs", "url": "https://docs.farcaster.xyz"}, {"label": "View on Warpcast", "url": "https://warpcast.com/~/channel/degen"}]

Return valid JSON only, no markdown, no code fences.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const raw = data.content?.[0]?.text ?? "";

    // Parse the JSON response
    const article = JSON.parse(raw);

    return NextResponse.json({
      headline: article.headline ?? "",
      byline: article.byline ?? `By ${author}`,
      body: article.body ?? "",
      sources: Array.isArray(article.sources) ? article.sources : [],
    });
  } catch (error) {
    console.error("AI rewrite error:", error);
    return NextResponse.json(
      { error: "Failed to rewrite article", detail: String(error) },
      { status: 500 },
    );
  }
}
