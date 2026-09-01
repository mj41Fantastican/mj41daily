import { NextResponse } from "next/server";
import { privateConfig } from "@/config/private-config";

export async function POST() {
  try {
    const { neynarApiKey, neynarWalletId } = privateConfig;

    if (!neynarApiKey || !neynarWalletId) {
      return NextResponse.json(
        { error: "Missing NEYNAR_API_KEY or NEYNAR_WALLET_ID" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.neynar.com/v2/farcaster/nft/deploy/erc721",
      {
        method: "POST",
        headers: {
          "x-api-key": neynarApiKey,
          "x-wallet-id": neynarWalletId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          network: "base",
          name: "The Daily Tribune: A Farcaster Newspaper",
          symbol: "TRIB",
          description:
            "Daily curated newspaper for Farcaster. Each issue is a unique NFT capturing the top stories, trending casts, and channel highlights of that day.",
          image:
            "https://cdn.neynar.com/nft/generated/4a71b5c4-6cf0-4321-9638-0f8d033b6f8b/1772902576753-473f0484-01a9-4da4-9029-ca0216088d1a.png",
          max_supply: 0,
          royalty_bps: 0,
          mint_config: {
            price_per_token: "4000000000000",
            max_per_wallet: 0,
            max_per_tx: 0,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Deploy failed", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
