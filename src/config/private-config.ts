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

const rawPrivateConfig = {
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
};

/**
 * Validate but don't throw.
 *
 * This module is evaluated while Next collects page data at build time, where
 * secrets are legitimately absent — a hard `.parse()` here fails the build
 * before anyone has a chance to set the variables, which is exactly the
 * chicken-and-egg that blocks a first deploy. Warn instead, matching how
 * public-config already behaves, and let the routes that actually need a key
 * fail at request time with a real error.
 */
const parsed = privateConfigSchema.safeParse(rawPrivateConfig);
if (!parsed.success) {
  console.warn(
    "[private-config] missing or invalid environment variables:",
    parsed.error.issues.map((i) => i.message).join("; "),
  );
}

export const privateConfig = rawPrivateConfig;
