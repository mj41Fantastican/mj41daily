export const NFT_COLLECTIONS = {
  'the-daily-tribune': {
    contractAddress: '0x7b80abcfb1feb4dea794358361c625481727ff5d',
    network: 'base' as const,
    name: 'The Daily Miscellany: A Compendium Of Interesting Things',
    description: 'Daily curated newspaper for Farcaster. Each issue is a unique NFT capturing the top stories, trending casts, and channel highlights of that day.',
    tokenNamePrefix: 'The Daily Miscellany Issue #',
    tokenImagePrompt: 'Classic newspaper front page in black and white ink style. Large masthead reading THE DAILY MISCELLANY at top with thick rule lines. Bold serif headline text below. Aged newsprint texture. Square 1:1 composition, no photographs, pure typographic editorial design, no color.',
    pricingTier: 'paid' as const,
  },
} as const;

export function getCollection(slug: string) {
  const collection = NFT_COLLECTIONS[slug as keyof typeof NFT_COLLECTIONS];
  if (!collection) throw new Error(`Unknown collection: ${slug}`);
  return collection;
}
