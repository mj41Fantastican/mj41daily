'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import {
  Button,
  Card,
  CardContent,
  H3,
  P,
  Small,
  Skeleton,
  Stack,
} from '@neynar/ui';
import {
  useNftMint,
  useNftPrice,
  type NftMintResponse,
} from '@/neynar-web-sdk/neynar';

type PaidNftMintProps = {
  fid?: number;
  serverWalletAddress: `0x${string}`;
  quantity?: number;
  collectionSlug: string;
  onSuccess?: (result: NftMintResponse) => void;
  onError?: (error: Error) => void;
  className?: string;
};

export function PaidNftMint({
  fid,
  serverWalletAddress,
  quantity = 1,
  collectionSlug,
  onSuccess,
  onError,
  className,
}: PaidNftMintProps) {
  const [mintResult, setMintResult] = useState<NftMintResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: price } = useNftPrice(
    { fid: fid ?? 0, collectionSlug, quantity },
    { enabled: !!fid },
  );

  const {
    sendTransaction,
    data: txHash,
    isPending: isSending,
  } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });
  const mint = useNftMint();

  const totalCost = price?.cost_eth ?? 0;
  const isDisabled =
    !fid || !price || isSending || isConfirming || mint.isPending;

  function handleError(err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    setError(e.message);
    onError?.(e);
  }

  function handlePay() {
    setError(null);
    sendTransaction(
      { to: serverWalletAddress, value: parseEther(totalCost.toFixed(18)) },
      { onError: handleError },
    );
  }

  async function handleMint() {
    if (!fid || !txHash) return;
    setError(null);
    try {
      const result = await mint.mutateAsync({
        fid,
        quantity,
        collectionSlug,
        paymentTxHash: txHash,
      });
      setMintResult(result);
      onSuccess?.(result);
    } catch (err) {
      handleError(err);
    }
  }

  if (mintResult) {
    return (
      <Card className={className}>
        <CardContent>
          <Stack direction="vertical" spacing={4}>
            {mintResult.tokens.map((token) => (
              <Stack key={token.token_id} direction="vertical" spacing={2}>
                {token.image_url && (
                  <div className="relative w-full" style={{ aspectRatio: '1' }}>
                    <Image
                      src={token.image_url}
                      alt={`NFT #${token.token_id}`}
                      fill
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}
                <H3>Token #{token.token_id}</H3>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (mint.isPending) {
    return (
      <Card className={className}>
        <CardContent>
          <Stack direction="vertical" spacing={4}>
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Button variant="default" disabled>
              Minting...
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (isConfirmed) {
    return (
      <Stack direction="vertical" spacing={4} className={className}>
        <Small color="muted">Payment confirmed!</Small>
        <Button variant="default" onClick={handleMint}>
          Mint NFT
        </Button>
      </Stack>
    );
  }

  return (
    <Stack direction="vertical" spacing={4} className={className}>
      <P>
        Cost: {totalCost.toFixed(4)} ETH
        {quantity > 1 && <Small color="muted"> ({quantity} tokens)</Small>}
      </P>
      <Button variant="default" disabled={isDisabled} onClick={handlePay}>
        {isSending
          ? 'Confirm in wallet...'
          : isConfirming
            ? 'Confirming payment...'
            : `Pay & Mint`}
      </Button>
      {error && <P color="destructive">{error}</P>}
    </Stack>
  );
}
