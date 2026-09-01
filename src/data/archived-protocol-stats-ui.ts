/**
 * ARCHIVED: Protocol Stats UI Code
 *
 * The protocol stats panels were removed from the Editor dashboard on 2026-04-18.
 * They are preserved here for future use (e.g., a dedicated Stats page, admin panel,
 * or re-integration into the editor). The supporting state variables and fetchLiveStats
 * function are reproduced below.
 *
 * API endpoint: /api/protocol-stats
 * Type: NetworkStats (from @/features/app/types)
 *
 * To restore, add the following to curator-dashboard.tsx:
 *
 * --- STATE ---
 *
 *   const [liveStats, setLiveStats] = useState<NetworkStats | null>(null);
 *   const [liveStatsLoading, setLiveStatsLoading] = useState(false);
 *   const [liveStatsError, setLiveStatsError] = useState('');
 *
 * --- FUNCTION ---
 *
 *   async function fetchLiveStats() {
 *     setLiveStatsLoading(true);
 *     setLiveStatsError('');
 *     try {
 *       const res = await fetch('/api/protocol-stats');
 *       if (!res.ok) throw new Error(`HTTP ${res.status}`);
 *       const data = await res.json();
 *       if (data.error) throw new Error(data.error);
 *       setLiveStats(data);
 *     } catch (err) {
 *       setLiveStatsError('Could not fetch live stats — hit 🔄 Refresh to retry');
 *     } finally {
 *       setLiveStatsLoading(false);
 *     }
 *   }
 *
 * --- FIRST PANEL (compact summary, placed after action row) ---
 *
 *   <div className={`border-2 mb-2 ${theme.border}`}>
 *     <div className={`px-2 py-1 border-b flex items-center justify-between ${theme.borderLight} ${theme.fillLight}`}>
 *       <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>📡 Protocol Stats</p>
 *       <div className="flex items-center gap-2">
 *         {liveStats && <span className="text-[7px] text-green-600 font-bold" style={SF}>● LIVE</span>}
 *         <button
 *           onClick={fetchLiveStats}
 *           disabled={liveStatsLoading}
 *           className={`text-[8px] font-bold uppercase tracking-wide px-2 py-[2px] border min-h-[22px] disabled:opacity-40 ${theme.borderLight} ${theme.mutedClass}`}
 *           style={SF}
 *         >
 *           {liveStatsLoading ? '⏳' : '↻'}
 *         </button>
 *       </div>
 *     </div>
 *     <div className="p-2">
 *       {liveStatsError && !liveStats && (
 *         <p className="text-[9px] text-red-500 mb-2" style={SF}>{liveStatsError}</p>
 *       )}
 *       {(() => {
 *         const ns = liveStats ?? feed.networkStats;
 *         return (
 *           <>
 *             <div className="grid grid-cols-3 gap-[1px] mb-[1px]">
 *               {[
 *                 { label: 'DAU', value: ns.dau, sub: ns.dauChange && ns.dauChange !== '—' ? ns.dauChange : null, subColor: ns.dauChange?.startsWith('+') ? 'text-green-500' : 'text-red-400' },
 *                 { label: 'Casts Today', value: ns.castsToday, sub: null, subColor: '' },
 *                 { label: 'New Users', value: ns.newToday, sub: null, subColor: '' },
 *               ].map((s) => (
 *                 <div key={s.label} className={`border text-center px-1 py-2 ${theme.borderLight}`}>
 *                   <p className="text-[12px] font-black leading-none">{s.value}</p>
 *                   <p className={`text-[7px] uppercase tracking-wide mt-[2px] ${theme.mutedClass}`} style={SF}>{s.label}</p>
 *                   {s.sub && <p className={`text-[8px] font-bold ${s.subColor}`} style={SF}>{s.sub}</p>}
 *                 </div>
 *               ))}
 *             </div>
 *             <div className="grid grid-cols-3 gap-[1px]">
 *               {[
 *                 { label: 'Total Users', value: ns.totalAccounts },
 *                 { label: 'Total Casts', value: ns.totalCasts ?? '—' },
 *                 { label: 'Channels', value: ns.totalChannels ?? '—' },
 *                 { label: 'Reactions', value: ns.reactionsToday ?? '—' },
 *                 { label: 'Follows', value: ns.followsToday ?? '—' },
 *                 { label: 'Verified', value: ns.verifiedUsers ?? '—' },
 *               ].map((s) => (
 *                 <div key={s.label} className={`border text-center px-1 py-[5px] ${theme.borderLight}`}>
 *                   <p className="text-[10px] font-bold leading-none">{s.value}</p>
 *                   <p className={`text-[6px] uppercase tracking-wide mt-[2px] ${theme.mutedClass}`} style={SF}>{s.label}</p>
 *                 </div>
 *               ))}
 *             </div>
 *           </>
 *         );
 *       })()}
 *       {onChainInsight && (
 *         <div className={`mt-2 border-t pt-2 ${theme.borderLight}`}>
 *           <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${theme.mutedClass}`} style={SF}>
 *             ⛓ On-Chain Insight
 *             <span className={`ml-1 text-[7px] font-normal ${onChainInsight.difficulty === 'expert' ? 'text-purple-500' : 'text-blue-500'}`}>
 *               [{onChainInsight.difficulty}]
 *             </span>
 *           </p>
 *           <p className={`text-[9px] leading-snug ${theme.text}`} style={SF}>{onChainInsight.text}</p>
 *         </div>
 *       )}
 *     </div>
 *   </div>
 *
 * --- SECOND PANEL (detailed live stats, placed before Reader Stats) ---
 *
 *   <div className={`border-2 mb-2 ${theme.border}`}>
 *     <div className={`px-2 py-1 border-b flex justify-between items-center ${theme.borderLight}`}>
 *       <p className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1" style={SF}>
 *         <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
 *         LIVE · Farcaster Network
 *       </p>
 *       <button onClick={fetchLiveStats} disabled={liveStatsLoading} className={...} style={SF}>↻ Refresh</button>
 *     </div>
 *     ... (full detailed stats grid with topCast, powerUsers, topChannel etc.)
 *   </div>
 */

export {};
