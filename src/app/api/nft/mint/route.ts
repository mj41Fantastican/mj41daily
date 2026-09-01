import {
  createNftMintHandler,
  estimateNftMintCost,
} from '@/neynar-web-sdk/nextjs';
import { privateConfig } from '@/config/private-config';
import { getCollection } from '@/config/nft-config';
import { getPreview, deletePreview } from '@/db/actions/nft-actions';
import { isPaymentTxUsed, markPaymentTxUsed } from '@/db/nft-payments';

export const { POST } = createNftMintHandler({
  config: ({ collectionSlug }) => {
    const c = getCollection(collectionSlug);
    return {
      apiKey: privateConfig.neynarApiKey,
      walletId: privateConfig.neynarWalletId,
      network: c.network,
      contractAddress: c.contractAddress,
    };
  },
  imagePrompt: ({ collectionSlug }) =>
    getCollection(collectionSlug).tokenImagePrompt,
  metadata: (tokenId, imageUrl, { collectionSlug }) => {
    const c = getCollection(collectionSlug);
    return {
      name: `${c.tokenNamePrefix}${tokenId}`,
      description: c.description,
      image: imageUrl,
    };
  },
  previewStorage: {
    get: ({ fid, collectionSlug }) =>
      getPreview(fid, collectionSlug).then((r) => r?.imageUrl ?? null),
    delete: ({ fid, collectionSlug }) => deletePreview(fid, collectionSlug),
  },
  paymentVerification: {
    rpcUrl: privateConfig.rpcUrls,
    serverWalletAddress: process.env.NEYNAR_WALLET_ADDRESS!,
    expectedCost: async (ctx, quantity) => {
      const c = getCollection(ctx.collectionSlug);
      if (c.pricingTier !== 'paid') return null;
      return estimateNftMintCost(
        {
          apiKey: privateConfig.neynarApiKey,
          network: c.network,
          contractAddress: c.contractAddress,
        },
        { fid: ctx.fid, quantity },
      );
    },
    txHashStore: {
      isUsed: (txHash) => isPaymentTxUsed(txHash),
      markUsed: (txHash, ctx) =>
        markPaymentTxUsed(txHash, ctx.fid, ctx.collectionSlug),
    },
  },
});
