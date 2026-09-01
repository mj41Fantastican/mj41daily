import { nextConfig } from "@neynar/eslint-plugin";

const config = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "eslint.config.mjs",
      "postcss.config.mjs",
      "next.config.ts",
      "tailwind.config.ts",
      "src/neynar-scripts/**",
    ],
  },
  {
    files: [
      "src/neynar-farcaster-sdk/**/*.{ts,tsx}",
      "src/neynar-web-sdk/**/*.{ts,tsx}",
      "src/neynar-db-sdk/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/neynar-farcaster-sdk/**",
                "@/neynar-web-sdk/**",
                "@/neynar-db-sdk/**",
              ],
              message:
                "Use relative imports within SDK packages to avoid circular dependencies.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/app/api/**/*.{ts,tsx}",
      "src/features/app/components/paywall-gate.tsx",
      "src/hooks/use-is-editor.ts",
    ],
    rules: {
      "@neynar/no-process-env": "off",
    },
  },
];

export default config;
