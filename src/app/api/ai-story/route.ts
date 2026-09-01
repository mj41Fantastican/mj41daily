"use server";

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, context } = body as {
    type: "story-body" | "channel-logline" | "onchain-insight";
    context: Record<string, string>;
  };

  try {
    if (type === "story-body") {
      // Generate a full news story body from a headline + byline
      const { headline, byline, notes } = context;
      const msg = await client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `You are a journalist writing for The Daily Farcaster Tribune, a newspaper about the Farcaster social protocol ecosystem.

Write a concise, engaging news story body (3-4 paragraphs, ~200-250 words) for this headline:
HEADLINE: ${headline}
BYLINE: ${byline ?? "Staff Reporter"}
${notes ? `EDITOR NOTES: ${notes}` : ""}

Style: newspaper prose, factual-sounding, engaging. Focus on the Farcaster ecosystem context. Do not include the headline — just the body paragraphs.`,
        }],
      });
      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      return NextResponse.json({ body: text.trim() });
    }

    if (type === "channel-logline") {
      // Generate an exciting 1-3 sentence log line for a Farcaster channel
      const { channelName, description, pinnedCast, followerCount } = context;
      const msg = await client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 120,
        messages: [{
          role: "user",
          content: `Write a punchy, persuasive 1-3 sentence "log line" for a Farcaster channel. A log line is like a movie pitch — exciting, specific, makes you want to join immediately.

Channel: /${channelName}
Description: ${description ?? "No description"}
Followers: ${followerCount ?? "unknown"}
${pinnedCast ? `Pinned cast: "${pinnedCast}"` : ""}

Rules: No hashtags. No emojis unless extremely apt. Sound like a journalist, not a marketer. Max 3 sentences. Be specific about what makes this channel worth reading.`,
        }],
      });
      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      return NextResponse.json({ logline: text.trim() });
    }

    if (type === "onchain-insight") {
      // Generate a daily on-chain insight — 3.1:1 expert:novice ratio
      // Use a random roll to decide difficulty level
      const isExpert = Math.random() < (3.1 / 4.1); // ~75.6% expert
      const difficulty = isExpert ? "expert" : "novice";

      const msg = await client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 280,
        messages: [{
          role: "user",
          content: `You are an on-chain data analyst for The Daily Farcaster Tribune. Generate a compelling daily ON-CHAIN insight about the Base blockchain or Farcaster ecosystem.

Difficulty: ${difficulty === "expert" ? "MASTERY LEVEL — use precise technical terms: MEV, EIP numbers, gas mechanics, contract opcodes, liquidity math, bridging architecture, etc. Assume deep familiarity." : "NOVICE LEVEL — explain one interesting on-chain fact in plain English that anyone can understand and find fascinating. No jargon."}

Requirements:
- 2-3 sentences maximum
- Must reference REAL, plausible current data patterns (you can cite realistic approximations, just don't fabricate specific real-time prices)
- End with why it matters or what it implies
- Today's date context: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
- Vary the topic: could be gas patterns, NFT activity, DeFi flows, bridge volumes, contract deployments, protocol fees, etc.

Return ONLY the insight text, no labels or prefixes.`,
        }],
      });
      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      return NextResponse.json({ insight: text.trim(), difficulty });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("ai-story error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
