import { createNftPreviewHandler } from '@/neynar-web-sdk/nextjs';
import { privateConfig } from '@/config/private-config';
import { getCollection } from '@/config/nft-config';
import { getPreview, savePreview } from '@/db/actions/nft-actions';

export const { POST } = createNftPreviewHandler({
  config: () => ({
    apiKey: privateConfig.neynarApiKey,
    walletId: privateConfig.neynarWalletId,
  }),
  imagePrompt: ({ collectionSlug }) =>
    getCollection(collectionSlug).tokenImagePrompt,
  previewStorage: {
    get: ({ fid, collectionSlug }) =>
      getPreview(fid, collectionSlug).then((r) => r?.imageUrl ?? null),
    save: ({ fid, collectionSlug }, imageUrl) =>
      savePreview(fid, collectionSlug, imageUrl),
  },
});
