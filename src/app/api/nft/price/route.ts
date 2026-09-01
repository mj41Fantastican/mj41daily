import { createNftPriceHandler } from '@/neynar-web-sdk/nextjs';
import { privateConfig } from '@/config/private-config';
import { getCollection } from '@/config/nft-config';

export const { GET } = createNftPriceHandler({
  config: ({ collectionSlug }) => {
    const c = getCollection(collectionSlug);
    return {
      apiKey: privateConfig.neynarApiKey,
      network: c.network,
      contractAddress: c.contractAddress,
    };
  },
  pricingTier: ({ collectionSlug }) => {
    const c = getCollection(collectionSlug);
    return c.pricingTier;
  },
});
