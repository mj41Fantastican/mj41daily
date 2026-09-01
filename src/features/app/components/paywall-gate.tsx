'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@neynar/ui';
import { useWriteContract, useConnect, useAccount } from 'wagmi';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { useFarcasterUser } from '@/neynar-farcaster-sdk/mini';
import { useTheme } from '@/features/app/theme-context';
import { publicConfig } from '@/config/public-config';
import sdk from '@farcaster/miniapp-sdk';

const APP_HOME_URL = publicConfig.homeUrl ?? 'https://dailytribune.xyz';

const SF    = { fontFamily: 'Arial,sans-serif' };
const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };

const EDITOR_FID     = publicConfig.fid;
const EDITOR_WALLET  = '0x758AF4a670adE40C2FfE1B6C4746340910a44B96' as `0x${string}`;
const RWAC_CONTRACT  = '0x184f5aacdbb3e482ce6e5e4a7075500e589a5e68' as `0x${string}`;
const WETH_BASE      = '0x4200000000000000000000000000000000000006'; // WETH on Base
const RWAC_LOGO      = 'https://cyan-worrying-constrictor-793.mypinata.cloud/ipfs/bafybeidrbcmbstd33tnsstiy4j45qkidvlez6la623tqhp3hxvyvchcnda';

// 41 $RWACu = 7 credits (one per day of the week)
// RWACu has 18 decimals
const RWAC_SUB_AMOUNT = BigInt('41') * BigInt('1000000000000000000');

// Mint amounts (unchanged)
const RWAC_GEN_AMOUNT  = BigInt('20705') * BigInt('1000000000000000000');
const RWAC_MINT_AMOUNT = BigInt('41041') * BigInt('1000000000000000000');

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

// Uniswap swap URL — Base network, output = $RWACu, input = ETH
const SWAP_URL = `https://app.uniswap.org/swap?chain=base&outputCurrency=${RWAC_CONTRACT}&inputCurrency=${WETH_BASE}`;

const BTN: React.CSSProperties = {
  display: 'block', width: '100%', padding: '13px 16px',
  background: '#111111', color: '#ffffff', border: '2px solid #111111',
  fontFamily: 'Arial,sans-serif', fontWeight: 700, fontSize: 12,
  textAlign: 'center', cursor: 'pointer', letterSpacing: '0.04em',
  textTransform: 'uppercase', minHeight: 44,
};
const BTN_DISABLED: React.CSSProperties = {
  ...BTN, background: '#555555', border: '2px solid #555555', cursor: 'not-allowed', opacity: 0.6,
};
const BTN_OUTLINE: React.CSSProperties = {
  ...BTN, background: 'transparent', color: '#111111', border: '2px solid #111111',
};
const BTN_SWAP: React.CSSProperties = {
  ...BTN, background: '#6d28d9', border: '2px solid #6d28d9', fontSize: 11,
};

function openSwap() {
  try {
    sdk.actions.openUrl(SWAP_URL);
  } catch {
    window.open(SWAP_URL, '_blank');
  }
}

// ── Personalized Mint Section ─────────────────────────────────────────────────
interface CoverData {
  imageUrl: string;
  headline: string;
  issueNumber: string;
  displayName: string;
  username: string;
  neynarScore?: string;
}

interface MintResult {
  serial: string;
  tokenId: string | null;
  txHash: string | null;
  openSeaUrl: string | null;
  metadataUri: string | null;
  pending?: boolean;
}

type MintStage = 'idle' | 'paying-gen' | 'generating' | 'preview' | 'paying-mint' | 'minting-chain' | 'done';

function saveImageToDevice(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function PersonalMintSection({
  fid,
  onMintUnlock,
  walletAddress,
  onCollectiblesOpen,
}: {
  fid?: number;
  onMintUnlock: (txHash: string, method?: 'usdc' | 'eth' | 'rwac', walletAddress?: string) => Promise<void>;
  walletAddress?: string;
  onCollectiblesOpen?: () => void;
}) {
  const [stage, setStage] = useState<MintStage>('idle');
  const [coverData, setCoverData] = useState<CoverData | null>(null);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [error, setError] = useState('');
  const [imageSaved, setImageSaved] = useState(false);
  const [shared, setShared] = useState(false);

  const { theme } = useTheme();
  const { writeContract } = useWriteContract();

  const issueDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  async function generateCover() {
    if (!fid) return;
    setStage('generating');
    setError('');
    try {
      const res = await fetch(`/api/nft/personal-cover?fid=${fid}`);
      const data = await res.json();
      if (!res.ok || !data.imageUrl) throw new Error(data.error ?? 'Generation failed');
      setCoverData(data);
      setStage('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cover generation failed');
      setStage('idle');
    }
  }

  function payForGeneration() {
    if (!fid) return;
    setStage('paying-gen');
    setError('');
    writeContract(
      { address: RWAC_CONTRACT, abi: ERC20_TRANSFER_ABI, functionName: 'transfer', args: [EDITOR_WALLET, RWAC_GEN_AMOUNT] },
      {
        onSuccess: () => generateCover(),
        onError: (err) => {
          if (!err.message?.includes('rejected')) console.error('Gen fee error:', err);
          setStage('idle');
          setError('Payment rejected or failed.');
        },
      },
    );
  }

  function payToMint() {
    setStage('paying-mint');
    setError('');
    writeContract(
      { address: RWAC_CONTRACT, abi: ERC20_TRANSFER_ABI, functionName: 'transfer', args: [EDITOR_WALLET, RWAC_MINT_AMOUNT] },
      {
        onSuccess: async (hash) => {
          setStage('minting-chain');
          try {
            const mintRes = await fetch('/api/nft/personal-cover/mint', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fid,
                username: coverData?.username ?? `fid${fid}`,
                displayName: coverData?.displayName ?? `FID #${fid}`,
                imageUrl: coverData?.imageUrl,
                headline: coverData?.headline,
                issueDate,
                colorTheme: theme.name,
                paymentTxHash: hash,
              }),
            });
            const mintData = await mintRes.json();
            // Only treat as fatal if serial reservation itself failed (no serial returned)
            if (!mintRes.ok && !mintData.serial) {
              throw new Error(mintData.error ?? 'Could not register mint');
            }
            setMintResult(mintData);
            await onMintUnlock(hash, 'rwac', walletAddress);
            setStage('done');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not register mint. Please contact support.');
            setStage('preview');
          }
        },
        onError: (err) => {
          if (!err.message?.includes('rejected')) console.error('Mint fee error:', err);
          setStage('preview');
          setError('Mint payment rejected or failed.');
        },
      },
    );
  }

  function handleSaveImage() {
    if (!coverData) return;
    const filename = mintResult ? `${mintResult.serial}.png` : `tribune-cover-fid${fid}.png`;
    saveImageToDevice(coverData.imageUrl, filename);
    setImageSaved(true);
    setTimeout(() => setImageSaved(false), 2000);
  }

  function handleShareMint() {
    if (!coverData || !mintResult) return;
    const serial = mintResult.serial;
    const headline = coverData.headline ?? 'My Copper Wire cover';
    const text = `I just minted my personalized Copper Wire cover — ${serial} 🗞️\n\n"${headline.slice(0, 100)}"\n\nGet yours:`;
    try {
      sdk.actions.composeCast({
        text,
        embeds: [APP_HOME_URL],
      });
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch {
      // fallback — open warpcast compose in browser
      const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(APP_HOME_URL)}`;
      window.open(url, '_blank');
    }
  }

  const busy = stage === 'paying-gen' || stage === 'generating' || stage === 'paying-mint' || stage === 'minting-chain';

  return (
    <div style={{ border: '2px solid #111', padding: '12px 12px 14px' }}>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <p style={{ ...SF, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111', margin: '0 0 4px' }}>
          🗞 Mint Your Personal Cover
        </p>
        <p style={{ ...SERIF, fontSize: 10, color: '#555', margin: 0, lineHeight: 1.4 }}>
          A one-of-a-kind parody front page starring <em>you</em>. Own it on-chain.
        </p>
      </div>

      {error && (
        <p style={{ ...SF, fontSize: 9, color: '#cc0000', textAlign: 'center', marginBottom: 8 }}>{error}</p>
      )}

      {stage === 'idle' && (
        <div>
          <p style={{ ...SF, fontSize: 9, color: '#555', textAlign: 'center', marginBottom: 8 }}>
            Generation fee: <strong>20,705 $RWACu</strong>
          </p>
          <button onClick={payForGeneration} disabled={!fid} style={!fid ? BTN_DISABLED : BTN}>
            ✨ Pay & Generate My Cover
          </button>
          <button onClick={openSwap} style={{ ...BTN_SWAP, marginTop: 6, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={RWAC_LOGO} alt="" width={16} height={16} style={{ borderRadius: '50%', flexShrink: 0 }} />
            Get $RWACu to pay
          </button>
        </div>
      )}

      {stage === 'paying-gen' && (
        <div style={{ ...SF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', fontSize: 10, color: '#444' }}>
          <Spinner className="size-3" /> Confirm payment in wallet…
        </div>
      )}

      {stage === 'generating' && (
        <div style={{ ...SF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', fontSize: 10, color: '#444' }}>
          <Spinner className="size-3" /> Generating your cover… ~15s
        </div>
      )}

      {stage === 'preview' && coverData && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverData.imageUrl} alt="Your personal Tribune cover"
            style={{ width: '100%', display: 'block', border: '1px solid #ccc', marginBottom: 6 }} />
          <div style={{ ...SF, fontSize: 8, color: '#555', textAlign: 'center', marginBottom: 4 }}>
            FID #{fid} · {issueDate}
          </div>
          <div style={{ ...SERIF, fontSize: 9, color: '#444', textAlign: 'center', marginBottom: 10, fontStyle: 'italic' }}>
            &ldquo;{coverData.headline}&rdquo;
          </div>
          <button onClick={handleSaveImage}
            style={{ ...BTN_OUTLINE, marginBottom: 6, fontSize: 10 }}>
            {imageSaved ? '✓ Image Saved' : '⬇ Save Image'}
          </button>
          <button onClick={payToMint} style={BTN}>
            Mint This Cover — 41,041 $RWACu
          </button>
          <button onClick={payForGeneration} disabled={busy}
            style={{ ...BTN_OUTLINE, marginTop: 6, opacity: 0.55, fontSize: 9 }}>
            ↺ Regenerate (20,705 $RWACu)
          </button>
        </div>
      )}

      {stage === 'paying-mint' && (
        <div style={{ ...SF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', fontSize: 10, color: '#444' }}>
          <Spinner className="size-3" /> Confirm mint payment in wallet…
        </div>
      )}

      {stage === 'minting-chain' && (
        <div style={{ ...SF, textAlign: 'center', padding: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 10, color: '#444', marginBottom: 4 }}>
            <Spinner className="size-3" /> Minting on Base…
          </div>
          <div style={{ fontSize: 9, color: '#888' }}>~20s. Don&apos;t close the app.</div>
        </div>
      )}

      {stage === 'done' && coverData && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverData.imageUrl} alt="Your minted Tribune cover"
            style={{ width: '100%', display: 'block', border: '2px solid #111', marginBottom: 8 }} />
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <p style={{ ...SF, fontSize: 13, fontWeight: 900, color: '#15803d', margin: '0 0 2px' }}>
              🎉 {mintResult?.pending ? 'Minted — Confirming On-Chain' : 'Minted!'}
            </p>
            {mintResult && (
              <p style={{ ...SF, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#111', margin: '0 0 2px' }}>
                {mintResult.serial}
              </p>
            )}
            {mintResult?.pending && (
              <p style={{ ...SF, fontSize: 9, color: '#d97706', margin: '0 0 4px', fontWeight: 600 }}>
                ⏳ Your edition is registered. The on-chain token is confirming — check your collectibles shortly.
              </p>
            )}
            <p style={{ ...SERIF, fontSize: 9, color: '#555', margin: 0, fontStyle: 'italic' }}>
              &ldquo;{coverData.headline}&rdquo;
            </p>
          </div>
          {mintResult && (
            <div style={{ border: '1px solid #ddd', marginBottom: 10 }}>
              {[
                { label: 'Serial',       value: mintResult.serial },
                { label: 'Token ID',     value: mintResult.tokenId ? `#${mintResult.tokenId}` : 'Confirming…' },
                { label: 'Issue Date',   value: issueDate },
                { label: 'Farcaster ID', value: `FID #${fid}` },
                { label: 'Neynar Score', value: coverData.neynarScore ?? '—' },
                { label: 'Network',      value: 'Base' },
                { label: 'Status',       value: mintResult.pending ? '⏳ Confirming' : '✓ On-chain' },
              ].map((t, i) => (
                <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderTop: i > 0 ? '1px solid #eee' : 'none' }}>
                  <span style={{ ...SF, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888' }}>{t.label}</span>
                  <span style={{ ...SF, fontSize: 9, fontWeight: 700, color: '#111' }}>{t.value}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleSaveImage}
            style={{ ...BTN_OUTLINE, marginBottom: 6 }}>
            {imageSaved ? '✓ Image Saved' : '⬇ Save Image to Device'}
          </button>
          <button
            onClick={handleShareMint}
            style={{ ...BTN, marginBottom: 6, background: '#1d4ed8', borderColor: '#1d4ed8' }}
          >
            {shared ? '✓ Cast Opened!' : '📢 Share My Cover on Farcaster'}
          </button>
          {mintResult?.openSeaUrl && (
            <a href={mintResult.openSeaUrl} target="_blank" rel="noopener noreferrer"
              style={{ ...BTN, display: 'block', textDecoration: 'none', marginBottom: 6 }}>
              View on OpenSea ↗
            </a>
          )}
          {onCollectiblesOpen && (
            <button onClick={onCollectiblesOpen}
              style={{ ...BTN_OUTLINE, fontSize: 10 }}>
              View My Collectibles →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main PaywallGate ──────────────────────────────────────────────────────────
export function PaywallGate({
  issueId: _issueId,
  issueNumber,
  onReadUnlock,
  onMintUnlock,
  onCollectiblesOpen,
}: {
  issueId: number | null;
  issueNumber: string;
  onReadUnlock: (method: 'usdc' | 'eth' | 'rwac', txHash?: string, walletAddress?: string) => Promise<void>;
  onMintUnlock: (txHash: string, method?: 'usdc' | 'eth' | 'rwac', walletAddress?: string) => Promise<void>;
  onCollectiblesOpen?: () => void;
}) {
  const [busy, setBusy]           = useState(false);
  const [crediting, setCrediting] = useState(false);
  const [credits, setCredits]     = useState<number | null>(null);
  const [msg, setMsg]             = useState('');

  const { data: farcasterUser } = useFarcasterUser();
  const { isConnected, address: walletAddress } = useAccount();
  const { connect } = useConnect();
  const { writeContract } = useWriteContract();

  const fid = farcasterUser?.fid;

  useEffect(() => {
    if (!isConnected) connect({ connector: farcasterMiniApp() });
  }, [isConnected, connect]);

  // Load current credit balance
  useEffect(() => {
    if (!fid) return;
    fetch(`/api/subscription?fid=${fid}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setCredits(d.credits ?? 0); })
      .catch(() => {});
  }, [fid]);

  // Pay 41 $RWACu → get 7 credits
  function handleBuyCredits() {
    if (busy || !isConnected) return;
    setBusy(true);
    setMsg('');
    writeContract(
      {
        address: RWAC_CONTRACT,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [EDITOR_WALLET, RWAC_SUB_AMOUNT],
      },
      {
        onSuccess: async (hash) => {
          setCrediting(true);
          try {
            const res = await fetch('/api/subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fid,
                walletAddress,
                username:     farcasterUser?.username,
                displayName:  farcasterUser?.displayName,
                txHash: hash,
                plan: 'weekly',
              }),
            });
            const data = await res.json();
            if (data.ok) {
              setCredits(data.credits ?? 7);
              setMsg('✓ 7 credits added!');
            }
          } catch {
            setMsg('Credits added — refresh if balance doesn\'t update.');
          } finally {
            setBusy(false);
            setCrediting(false);
          }
        },
        onError: (err) => {
          if (!err.message?.includes('rejected')) console.error('$RWACu sub error:', err);
          setBusy(false);
        },
      },
    );
  }

  // Spend 1 credit to read
  async function handleSpendCredit() {
    if (!fid || credits === null || credits < 1) return;
    setBusy(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid }),
      });
      const data = await res.json();
      if (data.ok) {
        setCredits(data.credits);
        await onReadUnlock('rwac', undefined, walletAddress);
      }
    } catch {
      setMsg('Error spending credit — try again.');
    } finally {
      setBusy(false);
    }
  }

  const hasCredits = credits !== null && credits > 0;

  return (
    <div style={{ border: '3px solid #111111', marginBottom: 4, ...SERIF }}>
      {/* Header */}
      <div style={{ background: '#111111', padding: '10px 12px', textAlign: 'center' }}>
        <p style={{ ...SF, fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ffffff', margin: '0 0 2px' }}>
          🔒 Members Only
        </p>
        <p style={{ ...SF, fontSize: 9, color: 'rgba(255,255,255,0.6)', margin: 0, letterSpacing: '0.06em' }}>
          {issueNumber} · Powered by $RWACu
        </p>
      </div>

      <div style={{ background: '#ffffff', padding: '14px 14px 16px' }}>

        {/* Credit balance display */}
        {credits !== null && (
          <div style={{ border: '2px solid #111', padding: '10px 12px', textAlign: 'center', marginBottom: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={RWAC_LOGO} alt="$RWACu" width={40} height={40}
              style={{ borderRadius: '50%', display: 'block', margin: '0 auto 6px' }} />
            <p style={{ ...SERIF, fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1, margin: '0 0 2px' }}>
              {credits} {credits === 1 ? 'credit' : 'credits'}
            </p>
            <p style={{ ...SF, fontSize: 9, color: '#888', margin: '2px 0 0' }}>
              {hasCredits ? 'Use 1 credit to read this issue' : 'Top up to keep reading'}
            </p>
          </div>
        )}

        {/* READ with credit */}
        {!isConnected ? (
          <div style={{ ...SF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', fontSize: 10, color: '#444' }}>
            <Spinner className="size-3" /> Connecting wallet…
          </div>
        ) : hasCredits ? (
          <button onClick={handleSpendCredit} disabled={busy} style={busy ? BTN_DISABLED : BTN}>
            {busy ? '⏳ Unlocking…' : `✦ Use 1 Credit — Read Now (${credits} remaining)`}
          </button>
        ) : null}

        {/* Top-up section */}
        <div style={{ border: '1px solid #ddd', padding: '12px', marginTop: 12, textAlign: 'center' }}>
          <p style={{ ...SF, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
            {hasCredits ? 'Top Up Credits' : 'Get Reading Credits'}
          </p>
          <p style={{ ...SERIF, fontSize: 22, fontWeight: 900, color: '#111', margin: '0 0 2px', lineHeight: 1 }}>
            41 $RWACu
          </p>
          <p style={{ ...SF, fontSize: 9, color: '#888', margin: '0 0 10px' }}>
            = 7 credits · one per daily issue
          </p>
          <button onClick={handleBuyCredits} disabled={busy || crediting || !isConnected}
            style={busy || crediting ? BTN_DISABLED : BTN}>
            {crediting ? '⏳ Adding credits…' : busy ? '⏳ Confirm in wallet…' : '✦ Buy 7 Credits — 41 $RWACu'}
          </button>
        </div>

        {msg && (
          <p style={{ ...SF, fontSize: 9, color: msg.startsWith('✓') ? '#15803d' : '#b91c1c', textAlign: 'center', marginTop: 8, fontWeight: 700 }}>
            {msg}
          </p>
        )}

        {/* Swap */}
        <button onClick={openSwap} style={{ ...BTN_SWAP, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={RWAC_LOGO} alt="" width={16} height={16} style={{ borderRadius: '50%', flexShrink: 0 }} />
          Don&apos;t have $RWACu? Swap now
        </button>
        <p style={{ ...SF, fontSize: 8, color: '#aaa', textAlign: 'center', marginTop: 4 }}>
          Opens Uniswap on Base · ETH → $RWACu
        </p>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 10px' }}>
          <div style={{ flex: 1, height: 1, background: '#111', opacity: 0.15 }} />
          <span style={{ ...SF, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#444' }}>
            or own it forever
          </span>
          <div style={{ flex: 1, height: 1, background: '#111', opacity: 0.15 }} />
        </div>

        {/* Personalized Mint */}
        {isConnected && (
          <PersonalMintSection
            fid={farcasterUser?.fid}
            onMintUnlock={onMintUnlock}
            walletAddress={walletAddress}
            onCollectiblesOpen={onCollectiblesOpen}
          />
        )}
      </div>
    </div>
  );
}
