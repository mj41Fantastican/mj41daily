import { NextRequest, NextResponse } from "next/server";
import { mintNft, uploadNftMetadata } from "@/neynar-web-sdk/nextjs";
import { privateConfig } from "@/config/private-config";
import { getCollection } from "@/config/nft-config";
import { nextSerial, saveCoverMint, updateMintToken } from "@/db/actions/collectibles";
import { markImageMinted } from "@/db/actions/generated-images";

const CONTRACT = getCollection('the-daily-tribune').contractAddress;
const NETWORK = 'base' as const;
const OPENSEA_BASE = `https://opensea.io/assets/base/${CONTRACT}`;

/**
 * POST /api/nft/personal-cover/mint
 *
 * Body: {
 *   fid: number,
 *   username: string,
 *   displayName: string,
 *   imageUrl: string,
 *   headline: string,
 *   issueDate: string,       // "Sunday, April 6, 2026"
 *   colorTheme?: string,     // e.g. "Terminal Green"
 *   issueValue?: string,     // "41,041 $RWACu"
 *   paymentTxHash?: string,  // $RWACu payment tx
 * }
 *
 * Always returns success once payment is received + serial reserved.
 * On-chain mint is best-effort — if it fails, returns { pending: true }
 * so the UI can show a success screen. The DB record is saved regardless.
 */
export async function POST(req: NextRequest) {
  let serial = '';
  let serialIndex = 0;

  try {
    const body = await req.json();
    const {
      fid, username, displayName, imageUrl, headline,
      issueDate, colorTheme, issueValue = '41,041 $RWACu', paymentTxHash,
    } = body as {
      fid: number;
      username: string;
      displayName: string;
      imageUrl: string;
      headline: string;
      issueDate: string;
      colorTheme?: string;
      issueValue?: string;
      paymentTxHash?: string;
    };

    if (!fid || !imageUrl || !headline || !issueDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const neynarConfig = {
      apiKey: privateConfig.neynarApiKey,
      walletId: privateConfig.neynarWalletId,
    };

    // 1. Reserve serial number (FCDailyTrib#####)
    const result = await nextSerial();
    serial = result.serial;
    serialIndex = result.index;

    // 2. Save pending record first (serial reserved, payment confirmed)
    await saveCoverMint({
      serial,
      serialIndex,
      fid,
      username,
      displayName,
      contractAddress: CONTRACT,
      network: NETWORK,
      txHash: paymentTxHash,
      imageUrl,
      issueDate,
      issueValue,
      neynarScore: colorTheme ?? null,
      headline,
    });

    // 2b. Mark this image as minted in the generated-images collection (non-fatal)
    markImageMinted(imageUrl, serial).catch((e) =>
      console.warn('[personal-cover/mint] markImageMinted non-fatal:', e)
    );

    // 3. Attempt on-chain mint via Neynar (best-effort)
    // If this fails the user still has their serial + DB record.
    // We return { pending: true } so the UI shows success, not failure.
    let tokenId: string | undefined;
    let mintTxHash: string | undefined;
    let openSeaUrl: string | undefined;
    let metadataUri: string | undefined;
    let mintPending = false;

    try {
      const mintResult = await mintNft(
        { fid, quantity: 1, network: NETWORK, contractAddress: CONTRACT },
        neynarConfig,
      );

      tokenId = mintResult.token_ids[0];
      mintTxHash = mintResult.transaction_hash;

      if (!tokenId) throw new Error('No token ID returned');

      openSeaUrl = `${OPENSEA_BASE}/${tokenId}`;

      // 4. Upload metadata (best-effort too)
      try {
        const metadataResult = await uploadNftMetadata(
          {
            tokenId,
            network: NETWORK,
            contractAddress: CONTRACT,
            metadata: {
              name: `${serial} - ${displayName}'s Daily Tribune`,
              description: `A PFP front page Special Edition Print for Farcasters. Starring @${username} and minted with proof of date on farcaster on chain. Extra Extra @${username} is a big deal. an mj41 nft pegged to copper. This nft, as with all official 'MJ41' serial nft's, is pegged to one ounce of copper.`,
              image: imageUrl,
              external_url: openSeaUrl,
              attributes: [
                { trait_type: "Serial Number",   value: serial },
                { trait_type: "Farcaster ID",    value: String(fid) },
                { trait_type: "Issue Date",       value: issueDate },
                { trait_type: "Issue Value",      value: issueValue },
                { trait_type: "Edition",          value: `Special Edition Print For Farcasters Starring @${username}` },
                { trait_type: "Color Theme",      value: colorTheme ?? "Classic B&W" },
                { trait_type: "Publication",      value: "The Daily Tribune" },
                { trait_type: "Network",          value: "Base" },
                { trait_type: "Pegged To",        value: "1 oz Copper" },
              ],
            },
          },
          neynarConfig,
          { maxRetries: 3 },
        );
        metadataUri = metadataResult.metadata_uri;
      } catch (metaErr) {
        // Metadata upload failed — log it but don't block success
        console.warn('[personal-cover/mint] metadata upload failed (non-fatal):', metaErr);
      }

      // 5. Update DB with on-chain data
      if (tokenId && mintTxHash) {
        await updateMintToken(
          serial,
          tokenId,
          metadataUri ?? '',
          mintTxHash,
          openSeaUrl ?? '',
        );
      }
    } catch (chainErr) {
      // On-chain mint failed — log it but return success anyway
      // The serial + DB record are saved; the NFT will be minted manually if needed
      console.error('[personal-cover/mint] on-chain mint failed (non-fatal):', chainErr);
      mintPending = true;
    }

    // Always return success — user paid and has a serial number
    return NextResponse.json({
      serial,
      serialIndex,
      tokenId: tokenId ?? null,
      txHash: mintTxHash ?? paymentTxHash ?? null,
      openSeaUrl: openSeaUrl ?? null,
      metadataUri: metadataUri ?? null,
      pending: mintPending,
      colorTheme: colorTheme ?? null,
    });

  } catch (err) {
    // Only reach here if serial reservation or DB save failed
    console.error("[personal-cover/mint] fatal error:", err);
    return NextResponse.json(
      { error: "Mint record could not be created", details: String(err) },
      { status: 500 },
    );
  }
}
