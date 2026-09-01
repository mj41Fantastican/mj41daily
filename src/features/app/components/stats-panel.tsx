'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/features/app/theme-context';

const SF   = { fontFamily: 'Arial,sans-serif' };
const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };

interface StatsData {
  // Subscription stats
  totalSubscribers: number;
  activeSubscribers: number;
  totalRevenue: number;       // total $RWACu collected
  revenueByPlan: Record<string, { count: number; rwac: number }>;
  recentSubs: {
    fid: number; username: string | null; plan: string;
    rwacAmount: string; createdAt: string; expiresAt: string;
    walletAddress: string;
  }[];

  // Issue stats
  totalIssues: number;
  totalReaders: number;       // unique FIDs that ever paid to read
  totalMints: number;         // personal cover mints

  // Airdrop list (FIDs + wallets — editor only, no UI label)
  airdropList: { fid: number; walletAddress: string; username: string | null; plan: string }[];
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  const { theme } = useTheme();
  return (
    <div className={`border ${theme.border} p-3 text-center`}>
      <div className={`text-[8px] uppercase tracking-widest font-bold mb-1 ${theme.mutedClass}`} style={SF}>{label}</div>
      <div className="text-[22px] font-black leading-none" style={SERIF}>{value}</div>
      {sub && <div className={`text-[8px] mt-1 ${theme.mutedClass}`} style={SF}>{sub}</div>}
    </div>
  );
}

export function StatsPanel() {
  const { theme } = useTheme();
  const [data, setData]       = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAirdrop, setShowAirdrop] = useState(false);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    fetch('/api/editor-stats')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function copyAirdropList() {
    if (!data) return;
    const csv = ['FID,Wallet,Username,Plan', ...data.airdropList.map(
      (r) => `${r.fid},${r.walletAddress},${r.username ?? ''},${r.plan}`
    )].join('\n');
    navigator.clipboard.writeText(csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (loading) {
    return (
      <div className={`p-4 text-center text-[11px] ${theme.mutedClass}`} style={SF}>
        Loading stats…
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`p-4 text-center text-[11px] ${theme.mutedClass}`} style={SF}>
        Could not load stats.
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── HEADLINE STATS ── */}
      <div>
        <div className={`px-3 py-[3px] ${theme.fill} ${theme.fillText} mb-3`}>
          <span className="text-[9px] font-black uppercase tracking-widest" style={SF}>Publication Overview</span>
        </div>
        <div className="grid grid-cols-2 gap-2 px-3">
          <StatBox label="Issues Published"  value={data.totalIssues} />
          <StatBox label="Total Readers"     value={data.totalReaders}  sub="unique FIDs ever paid" />
          <StatBox label="Cover Mints"       value={data.totalMints}    sub="personal NFTs minted" />
          <StatBox label="Total $RWACu"      value={data.totalRevenue.toLocaleString()} sub="revenue collected" />
        </div>
      </div>

      {/* ── SUBSCRIBER STATS ── */}
      <div>
        <div className={`px-3 py-[3px] ${theme.fill} ${theme.fillText} mb-3`}>
          <span className="text-[9px] font-black uppercase tracking-widest" style={SF}>Credit Subscribers</span>
        </div>
        <div className="grid grid-cols-2 gap-2 px-3 mb-3">
          <StatBox label="All-Time Subscribers" value={data.totalSubscribers} />
          <StatBox label="Active Now"            value={data.activeSubscribers} sub="valid credits remaining" />
        </div>

        {/* Plan breakdown */}
        {Object.keys(data.revenueByPlan).length > 0 && (
          <div className={`mx-3 border ${theme.border}`}>
            <div className={`flex px-2 py-[3px] border-b ${theme.borderLight}`}>
              {['Plan','Purchases','$RWACu'].map((h) => (
                <div key={h} className={`flex-1 text-[7px] uppercase tracking-widest font-bold ${theme.mutedClass}`} style={SF}>{h}</div>
              ))}
            </div>
            {Object.entries(data.revenueByPlan).map(([plan, d]) => (
              <div key={plan} className={`flex px-2 py-[4px] border-b last:border-0 ${theme.borderLight}`}>
                <div className="flex-1 text-[10px] capitalize font-bold" style={SF}>{plan}</div>
                <div className="flex-1 text-[10px]" style={SF}>{d.count}</div>
                <div className="flex-1 text-[10px]" style={SF}>{d.rwac.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RECENT SUBSCRIBERS ── */}
      {data.recentSubs.length > 0 && (
        <div>
          <div className={`px-3 py-[3px] ${theme.fill} ${theme.fillText} mb-3`}>
            <span className="text-[9px] font-black uppercase tracking-widest" style={SF}>Recent Subscribers</span>
          </div>
          <div className={`mx-3 border ${theme.border}`}>
            <div className={`flex px-2 py-[3px] border-b ${theme.borderLight}`}>
              {['FID','User','Plan','Credits','Date'].map((h) => (
                <div key={h} className={`flex-1 text-[7px] uppercase tracking-widest font-bold ${theme.mutedClass}`} style={SF}>{h}</div>
              ))}
            </div>
            {data.recentSubs.slice(0, 20).map((s) => (
              <div key={`${s.fid}-${s.createdAt}`} className={`flex items-center px-2 py-[4px] border-b last:border-0 ${theme.borderLight}`}>
                <div className="flex-1 text-[9px]" style={SF}>{s.fid}</div>
                <div className="flex-1 text-[9px] truncate" style={SF}>{s.username ? `@${s.username}` : '—'}</div>
                <div className="flex-1 text-[9px] capitalize" style={SF}>{s.plan}</div>
                <div className="flex-1 text-[9px]" style={SF}>{s.rwacAmount} ⚡</div>
                <div className={`flex-1 text-[8px] ${theme.mutedClass}`} style={SF}>
                  {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AIRDROP ELIGIBLE LIST (editor-only, no label explaining purpose) ── */}
      <div>
        <div className={`px-3 py-[3px] ${theme.fill} ${theme.fillText} mb-3`}>
          <span className="text-[9px] font-black uppercase tracking-widest" style={SF}>Eligible Wallet List</span>
        </div>
        <div className="px-3 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowAirdrop((v) => !v)}
              className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider border-2 ${theme.border} ${theme.text} active:opacity-70`}
              style={SF}
            >
              {showAirdrop ? '▲ Hide List' : `▼ Show ${data.airdropList.length} Wallets`}
            </button>
            <button
              onClick={copyAirdropList}
              className={`px-4 py-2 text-[9px] font-black uppercase tracking-wider border-2 ${theme.fill} ${theme.fillText} border-transparent active:opacity-70`}
              style={SF}
            >
              {copied ? '✓ Copied' : '⎘ CSV'}
            </button>
          </div>

          {showAirdrop && (
            <div className={`border ${theme.border} max-h-48 overflow-y-auto`}>
              <div className={`flex px-2 py-[3px] border-b ${theme.borderLight} sticky top-0 ${theme.bg}`}>
                {['FID','Wallet','User'].map((h) => (
                  <div key={h} className={`flex-1 text-[7px] uppercase tracking-widest font-bold ${theme.mutedClass}`} style={SF}>{h}</div>
                ))}
              </div>
              {data.airdropList.map((r) => (
                <div key={r.fid} className={`flex items-center px-2 py-[3px] border-b last:border-0 ${theme.borderLight}`}>
                  <div className="flex-1 text-[9px]" style={SF}>{r.fid}</div>
                  <div className="flex-1 text-[8px] font-mono truncate" style={{ fontFamily: 'monospace' }}>
                    {r.walletAddress.slice(0, 6)}…{r.walletAddress.slice(-4)}
                  </div>
                  <div className={`flex-1 text-[9px] ${theme.mutedClass}`} style={SF}>
                    {r.username ? `@${r.username}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
