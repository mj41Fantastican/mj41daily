import "server-only";
import { z } from "zod";

const privateConfigSchema = z.object({
  neynarApiKey: z
    .string()
    .min(1, "NEYNAR_API_KEY environment variable is required"),
  neynarWalletId: z
    .string()
    .min(1, "NEYNAR_WALLET_ID environment variable is required"),
  coingeckoApiKey: z.string(),
  rpcUrls: z.object({
    base: z.string().optional(),
    optimism: z.string().optional(),
    'base-sepolia': z.string().optional(),
  }),
});

export const privateConfig = privateConfigSchema.parse({
  neynarApiKey: process.env.NEYNAR_API_KEY || "",
  neynarWalletId: process.env["NEYNAR_WALLET_ID"] || "",
  coingeckoApiKey:
    // demo coingecko key, not sensitive
    process.env.COINGECKO_API_KEY || "CE-UviYfmkExfr86X5JFTZfaVbb",
  rpcUrls: {
    base: process.env.BASE_RPC_URL,
    optimism: process.env.OPTIMISM_RPC_URL,
    'base-sepolia': process.env.BASE_SEPOLIA_RPC_URL,
  },
});
