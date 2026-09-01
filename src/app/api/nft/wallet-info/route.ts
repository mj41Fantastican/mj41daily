import { NextResponse } from "next/server";
import { privateConfig } from "@/config/private-config";

export async function GET() {
  try {
    const { neynarApiKey, neynarWalletId } = privateConfig;

    // Try fetching wallet address from Neynar managed wallets API
    const endpoints = [
      `https://api.neynar.com/v2/farcaster/nft/deployer`,
      `https://api.neynar.com/v2/farcaster/wallet/${neynarWalletId}`,
      `https://api.neynar.com/v2/wallet/${neynarWalletId}`,
    ];

    const results: Record<string, unknown> = { walletId: neynarWalletId };

    for (const url of endpoints) {
      const r = await fetch(url, {
        headers: { "x-api-key": neynarApiKey, "x-wallet-id": neynarWalletId },
      });
      const d = await r.json();
      results[url] = d;
    }

    // Also check if NEYNAR_WALLET_ADDRESS is set
    results["NEYNAR_WALLET_ADDRESS"] = process.env.NEYNAR_WALLET_ADDRESS ?? "not set";

    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
