'use client';

import { useState, useEffect, useCallback } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import { useTheme } from '@/features/app/theme-context';
import type { MLBDivision, MLBGame } from '@/app/api/mlb-sports/route';
import type { WCGroup, WCMatch } from '@/app/api/worldcup-2026/route';

const SF   = { fontFamily: 'Arial,sans-serif' };
const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };

// ── MLB division config ─────────────────────────────────────────────────────
type MLBDivKey = 'AL East' | 'AL Central' | 'AL West' | 'NL East' | 'NL Central' | 'NL West';
const MLB_DIVS: MLBDivKey[] = ['AL East', 'AL Central', 'AL West', 'NL East', 'NL Central', 'NL West'];

// ── WC Group config ─────────────────────────────────────────────────────────
const WC_GROUPS = ['Group A','Group B','Group C','Group D','Group E','Group F',
                   'Group G','Group H','Group I','Group J','Group K','Group L'];

// ── Persisted prefs key ─────────────────────────────────────────────────────
const PREFS_KEY = 'sports_prefs_v1';
interface SportsPrefs {
  mlbDivs: MLBDivKey[];
  wcGroups: string[];
  activeTab: 'mlb' | 'worldcup';
}
function loadPrefs(): SportsPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as SportsPrefs;
  } catch { /* noop */ }
  return { mlbDivs: ['AL East', 'NL East'], wcGroups: ['Group A', 'Group B'], activeTab: 'mlb' };
}
function savePrefs(p: SportsPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <div className={`px-3 py-[3px] ${theme.fill} ${theme.fillText} mb-2`}>
      <span className="text-[9px] font-black uppercase tracking-widest" style={SF}>{title}</span>
    </div>
  );
}

function Rule() {
  const { theme } = useTheme();
  return <div className={`border-t ${theme.borderLight} my-2`} />;
}

// ── MLB Standings Table ─────────────────────────────────────────────────────
function MLBDivisionTable({ div }: { div: MLBDivision }) {
  const { theme } = useTheme();
  const cols = [
    { key: 'team',   label: 'TEAM',  w: 'flex-1',  align: 'text-left'   },
    { key: 'w',      label: 'W',     w: 'w-7',     align: 'text-center' },
    { key: 'l',      label: 'L',     w: 'w-7',     align: 'text-center' },
    { key: 'pct',    label: 'PCT',   w: 'w-10',    align: 'text-center' },
    { key: 'gb',     label: 'GB',    w: 'w-8',     align: 'text-center' },
    { key: 'l10',    label: 'L10',   w: 'w-10',    align: 'text-center' },
    { key: 'strk',   label: 'STRK',  w: 'w-9',     align: 'text-center' },
    { key: 'home',   label: 'HOME',  w: 'w-12',    align: 'text-center' },
    { key: 'away',   label: 'AWAY',  w: 'w-12',    align: 'text-center' },
  ];

  return (
    <div className={`mb-3 border ${theme.border}`}>
      {/* Division header */}
      <div className={`px-2 py-[4px] border-b ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
        <span className="text-[10px] font-black uppercase tracking-widest" style={SF}>{div.divisionName}</span>
      </div>
      {/* Col headers */}
      <div className={`flex px-2 py-[3px] border-b ${theme.borderLight}`}>
        {cols.map((c) => (
          <div key={c.key} className={`${c.w} ${c.align} text-[7px] font-bold uppercase tracking-widest ${theme.mutedClass}`} style={SF}>
            {c.label}
          </div>
        ))}
      </div>
      {/* Team rows */}
      {div.teams.map((t, i) => (
        <div key={t.team.id} className={`flex items-center px-2 py-[4px] ${i < div.teams.length - 1 ? `border-b ${theme.borderLight}` : ''}`}>
          {/* Team name — abbreviated */}
          <div className="flex-1 text-[10px] font-bold leading-none truncate" style={SF}>
            {t.team.name.split(' ').pop()}
          </div>
          <div className="w-7 text-center text-[10px]" style={SF}>{t.wins}</div>
          <div className="w-7 text-center text-[10px]" style={SF}>{t.losses}</div>
          <div className="w-10 text-center text-[10px]" style={SF}>{t.pct}</div>
          <div className={`w-8 text-center text-[10px] ${theme.mutedClass}`} style={SF}>{t.gamesBack === '-' ? '—' : t.gamesBack}</div>
          <div className="w-10 text-center text-[10px]" style={SF}>{t.last10}</div>
          <div className={`w-9 text-center text-[9px] font-bold ${t.streak.startsWith('W') ? 'text-green-600' : t.streak.startsWith('L') ? 'text-red-600' : ''}`} style={SF}>{t.streak}</div>
          <div className={`w-12 text-center text-[9px] ${theme.mutedClass}`} style={SF}>{t.home}</div>
          <div className={`w-12 text-center text-[9px] ${theme.mutedClass}`} style={SF}>{t.away}</div>
        </div>
      ))}
    </div>
  );
}

// ── MLB Game Row ────────────────────────────────────────────────────────────
function MLBGameRow({ game }: { game: MLBGame }) {
  const { theme } = useTheme();
  const isFinal = game.abstractState === 'Final';
  const isLive  = game.abstractState === 'Live';

  const awayWon = isFinal && game.awayScore !== null && game.homeScore !== null && game.awayScore > game.homeScore;
  const homeWon = isFinal && game.awayScore !== null && game.homeScore !== null && game.homeScore > game.awayScore;

  return (
    <div className={`flex items-center gap-2 px-3 py-[5px] border-b ${theme.borderLight}`} style={SF}>
      {/* Teams */}
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] leading-tight truncate ${awayWon ? 'font-black' : ''}`}>
          {game.awayTeam.split(' ').pop()}
          {game.awayScore !== null && (
            <span className={`ml-1 ${awayWon ? 'font-black' : `${theme.mutedClass}`}`}>{game.awayScore}</span>
          )}
        </div>
        <div className={`text-[10px] leading-tight truncate ${homeWon ? 'font-black' : ''}`}>
          {game.homeTeam.split(' ').pop()}
          {game.homeScore !== null && (
            <span className={`ml-1 ${homeWon ? 'font-black' : `${theme.mutedClass}`}`}>{game.homeScore}</span>
          )}
        </div>
      </div>
      {/* Status */}
      <div className="text-right shrink-0">
        {isFinal && (
          <span className={`text-[8px] font-bold uppercase ${theme.mutedClass}`}>Final</span>
        )}
        {isLive && game.inning && (
          <span className="text-[8px] font-bold uppercase text-green-600">{game.inning}</span>
        )}
        {!isFinal && !isLive && (
          <span className={`text-[9px] ${theme.mutedClass}`}>{game.gameTime}</span>
        )}
      </div>
    </div>
  );
}

// ── WC Match Row ────────────────────────────────────────────────────────────
function WCMatchRow({ match }: { match: WCMatch }) {
  const { theme } = useTheme();
  const played = match.score !== null;
  const [g1, g2] = match.score?.ft ?? [null, null];
  const t1Won = played && g1 !== null && g2 !== null && g1 > g2;
  const t2Won = played && g1 !== null && g2 !== null && g2 > g1;

  return (
    <div className={`flex items-center px-3 py-[5px] border-b ${theme.borderLight}`}>
      {/* Date */}
      <div className={`w-14 text-[8px] shrink-0 ${theme.mutedClass}`} style={SF}>
        {match.date.slice(5).replace('-', '/')}
      </div>
      {/* Team 1 */}
      <div className={`flex-1 text-[10px] text-right truncate ${t1Won ? 'font-black' : ''}`} style={SF}>
        {match.team1}
      </div>
      {/* Score / Time */}
      <div className="w-14 text-center shrink-0" style={SF}>
        {played ? (
          <span className="text-[11px] font-black">{g1} – {g2}</span>
        ) : (
          <span className={`text-[8px] ${theme.mutedClass}`}>{match.time.replace(' UTC', 'u')}</span>
        )}
      </div>
      {/* Team 2 */}
      <div className={`flex-1 text-[10px] text-left truncate ${t2Won ? 'font-black' : ''}`} style={SF}>
        {match.team2}
      </div>
      {/* Venue */}
      <div className={`w-20 text-right text-[8px] shrink-0 truncate ${theme.mutedClass}`} style={SF}>
        {match.ground}
      </div>
    </div>
  );
}

// ── WC Group Table ──────────────────────────────────────────────────────────
function WCGroupTable({ group }: { group: WCGroup }) {
  const { theme } = useTheme();
  const [showMatches, setShowMatches] = useState(false);

  return (
    <div className={`mb-3 border ${theme.border}`}>
      {/* Group header */}
      <button
        className={`w-full flex items-center justify-between px-2 py-[5px] border-b ${theme.borderLight} ${theme.fill} ${theme.fillText} active:opacity-70 transition-opacity`}
        onClick={() => setShowMatches((v) => !v)}
      >
        <span className="text-[10px] font-black uppercase tracking-widest" style={SF}>{group.name}</span>
        <span className="text-[8px]" style={SF}>{showMatches ? '▲ Hide' : '▼ Fixtures'}</span>
      </button>

      {/* Standings mini-table */}
      <div>
        {/* Header */}
        <div className={`flex px-2 py-[2px] border-b ${theme.borderLight}`}>
          {[['TEAM','flex-1 text-left'],['P','w-5 text-center'],['W','w-5 text-center'],['D','w-5 text-center'],['L','w-5 text-center'],['GF','w-6 text-center'],['GA','w-6 text-center'],['GD','w-6 text-center'],['PTS','w-7 text-center']].map(([label, cls]) => (
            <div key={label} className={`${cls} text-[7px] font-bold uppercase tracking-widest ${theme.mutedClass}`} style={SF}>{label}</div>
          ))}
        </div>
        {group.standings.map((s, i) => (
          <div key={s.team} className={`flex items-center px-2 py-[3px] ${i < group.standings.length - 1 ? `border-b ${theme.borderLight}` : ''} ${i < 2 ? '' : ''}`}>
            <div className={`flex-1 text-[10px] truncate ${i < 2 ? 'font-bold' : ''}`} style={SF}>
              {i < 2 && <span className="text-green-600 mr-1">•</span>}{s.team}
            </div>
            <div className="w-5 text-center text-[10px]" style={SF}>{s.played}</div>
            <div className="w-5 text-center text-[10px]" style={SF}>{s.won}</div>
            <div className="w-5 text-center text-[10px]" style={SF}>{s.drawn}</div>
            <div className="w-5 text-center text-[10px]" style={SF}>{s.lost}</div>
            <div className="w-6 text-center text-[10px]" style={SF}>{s.gf}</div>
            <div className="w-6 text-center text-[10px]" style={SF}>{s.ga}</div>
            <div className={`w-6 text-center text-[10px] ${s.gd > 0 ? 'text-green-600' : s.gd < 0 ? 'text-red-600' : ''}`} style={SF}>{s.gd > 0 ? `+${s.gd}` : s.gd}</div>
            <div className="w-7 text-center text-[10px] font-black" style={SF}>{s.pts}</div>
          </div>
        ))}
      </div>

      {/* Fixtures (toggle) */}
      {showMatches && (
        <div className={`border-t ${theme.borderLight}`}>
          {group.matches.map((m) => <WCMatchRow key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREFS PANEL
// ─────────────────────────────────────────────────────────────────────────────
function PrefsPanel({
  prefs,
  onChange,
  onClose,
}: {
  prefs: SportsPrefs;
  onChange: (p: SportsPrefs) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();

  function toggleMLB(div: MLBDivKey) {
    const next = prefs.mlbDivs.includes(div)
      ? prefs.mlbDivs.filter((d) => d !== div)
      : [...prefs.mlbDivs, div];
    onChange({ ...prefs, mlbDivs: next });
  }

  function toggleWC(grp: string) {
    const next = prefs.wcGroups.includes(grp)
      ? prefs.wcGroups.filter((g) => g !== grp)
      : [...prefs.wcGroups, grp];
    onChange({ ...prefs, wcGroups: next });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative mt-auto rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] ${theme.bg} ${theme.text}`}>
        <div className={`flex items-center justify-between px-4 pt-4 pb-3 border-b ${theme.borderLight} shrink-0`}>
          <h2 className="text-[15px] font-black uppercase tracking-wide" style={SERIF}>Sports Preferences</h2>
          <button onClick={onClose} className={`text-[20px] leading-none ${theme.mutedClass} active:opacity-50`}>×</button>
        </div>
        <div className="overflow-y-auto px-4 pb-6 pt-3 space-y-5">
          {/* MLB Divisions */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={SF}>MLB Divisions to Show</p>
            <div className="grid grid-cols-2 gap-2">
              {MLB_DIVS.map((div) => {
                const on = prefs.mlbDivs.includes(div);
                return (
                  <button
                    key={div}
                    onClick={() => toggleMLB(div)}
                    className={`px-3 py-2 text-[10px] font-bold border-2 text-left transition-colors ${on ? `${theme.fill} ${theme.fillText} border-transparent` : `${theme.bg} ${theme.text} ${theme.border}`}`}
                    style={SF}
                  >
                    {on ? '✓ ' : ''}{div}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => onChange({ ...prefs, mlbDivs: [...MLB_DIVS] })} className={`text-[9px] underline ${theme.mutedClass}`} style={SF}>All</button>
              <button onClick={() => onChange({ ...prefs, mlbDivs: [] })} className={`text-[9px] underline ${theme.mutedClass}`} style={SF}>None</button>
            </div>
          </div>

          <Rule />

          {/* WC Groups */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={SF}>World Cup Groups to Show</p>
            <div className="grid grid-cols-3 gap-2">
              {WC_GROUPS.map((grp) => {
                const on = prefs.wcGroups.includes(grp);
                return (
                  <button
                    key={grp}
                    onClick={() => toggleWC(grp)}
                    className={`px-2 py-2 text-[10px] font-bold border-2 text-center transition-colors ${on ? `${theme.fill} ${theme.fillText} border-transparent` : `${theme.bg} ${theme.text} ${theme.border}`}`}
                    style={SF}
                  >
                    {on ? '✓ ' : ''}{grp.replace('Group ', 'Grp ')}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => onChange({ ...prefs, wcGroups: [...WC_GROUPS] })} className={`text-[9px] underline ${theme.mutedClass}`} style={SF}>All</button>
              <button onClick={() => onChange({ ...prefs, wcGroups: [] })} className={`text-[9px] underline ${theme.mutedClass}`} style={SF}>None</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SPORTS PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function SportsPage() {
  const { theme } = useTheme();
  const [prefs, setPrefs]       = useState<SportsPrefs>(() => loadPrefs());
  const [showPrefs, setShowPrefs] = useState(false);

  // MLB data
  const [mlbData, setMlbData]   = useState<{
    divisions: MLBDivision[];
    todayGames: MLBGame[];
    yesterdayGames: MLBGame[];
    today: string;
    yesterday: string;
  } | null>(null);
  const [mlbLoading, setMlbLoading] = useState(true);

  // WC data
  const [wcData, setWcData] = useState<{
    groups: WCGroup[];
    todayMatches: WCMatch[];
    tomorrowMatches: WCMatch[];
    recentMatches: WCMatch[];
    today: string;
    tomorrow: string;
  } | null>(null);
  const [wcLoading, setWcLoading] = useState(true);

  const handlePrefsChange = useCallback((p: SportsPrefs) => {
    setPrefs(p);
    savePrefs(p);
  }, []);

  useEffect(() => {
    fetch('/api/mlb-sports')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setMlbData(d); })
      .catch(() => {})
      .finally(() => setMlbLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/worldcup-2026')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setWcData(d); })
      .catch(() => {})
      .finally(() => setWcLoading(false));
  }, []);

  const visibleMLBDivs  = mlbData?.divisions.filter((d) => prefs.mlbDivs.includes(d.divisionName as MLBDivKey)) ?? [];
  const visibleWCGroups = wcData?.groups.filter((g) => prefs.wcGroups.includes(g.name)) ?? [];

  return (
    <div className={`flex flex-col h-full ${theme.bg} ${theme.text}`}>
      {/* ── HEADER ── */}
      <div className={`shrink-0 border-b-2 ${theme.border}`}>
        {/* Masthead strip */}
        <div className={`flex items-center justify-between px-3 py-2 border-b ${theme.borderLight}`}>
          <div>
            <div className="text-[8px] uppercase tracking-widest font-bold" style={{ ...SF, color: '#b87333' }}>The Daily Miscellany</div>
            <div className="text-[13px] font-black uppercase tracking-wide" style={SERIF}>Sports & Scores</div>
          </div>
          <button
            onClick={() => setShowPrefs(true)}
            className={`px-3 py-[6px] text-[9px] font-black uppercase tracking-wider border-2 ${theme.border} ${theme.text} active:opacity-70`}
            style={SF}
          >
            ⚙ Prefs
          </button>
        </div>

        {/* Sport tabs */}
        <div className="flex">
          {(['mlb', 'worldcup'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handlePrefsChange({ ...prefs, activeTab: tab })}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-colors border-r last:border-0 ${theme.borderLight} ${prefs.activeTab === tab ? `${theme.fill} ${theme.fillText}` : `${theme.bg} ${theme.text}`}`}
              style={SF}
            >
              {tab === 'mlb' ? '⚾ MLB' : '⚽ World Cup'}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ══ MLB TAB ══ */}
        {prefs.activeTab === 'mlb' && (
          <div className="p-3 space-y-0">

            {/* TODAY'S GAMES */}
            {mlbLoading ? (
              <div className={`text-center py-8 text-[11px] ${theme.mutedClass}`} style={SF}>Loading MLB data…</div>
            ) : (
              <>
                {mlbData?.todayGames && mlbData.todayGames.length > 0 && (
                  <div className={`mb-3 border-2 ${theme.border}`}>
                    <SectionHeader title={`Today's Games — ${mlbData.today}`} />
                    <div>
                      {mlbData.todayGames.map((g) => <MLBGameRow key={g.id} game={g} />)}
                    </div>
                  </div>
                )}

                {/* YESTERDAY'S SCORES */}
                {mlbData?.yesterdayGames && mlbData.yesterdayGames.length > 0 && (
                  <div className={`mb-3 border-2 ${theme.border}`}>
                    <SectionHeader title={`Yesterday's Scores — ${mlbData.yesterday}`} />
                    <div>
                      {mlbData.yesterdayGames.map((g) => <MLBGameRow key={g.id} game={g} />)}
                    </div>
                  </div>
                )}

                {/* STANDINGS */}
                {visibleMLBDivs.length === 0 ? (
                  <div className={`text-center py-8 text-[11px] ${theme.mutedClass}`} style={SF}>
                    No divisions selected.{' '}
                    <button onClick={() => setShowPrefs(true)} className="underline">Open Prefs</button>
                  </div>
                ) : (
                  <>
                    <div className={`mb-2 px-1`}>
                      <span className="text-[9px] uppercase tracking-widest font-black" style={SF}>— Standings —</span>
                    </div>
                    {visibleMLBDivs.map((div) => <MLBDivisionTable key={div.divisionId} div={div} />)}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ WORLD CUP TAB ══ */}
        {prefs.activeTab === 'worldcup' && (
          <div className="p-3 space-y-0">

            {/* MJ41 World Cup app link banner */}
            <button
              className={`w-full mb-3 border-2 p-3 text-left active:opacity-70 transition-opacity`}
              style={{ borderColor: '#b87333' }}
              onClick={() => void sdk.actions.openUrl('https://farcaster.xyz/miniapps/wp9uwy3KBJ2c/mj41-world-cup')}
            >
              <div className="text-[8px] uppercase tracking-widest font-bold mb-1" style={{ ...SF, color: '#b87333' }}>
                MJ41 World Cup Predictions App ↗
              </div>
              <div className="text-[11px] font-black" style={SERIF}>
                Make Your Predictions on Farcaster
              </div>
              <div className={`text-[9px] mt-[2px] ${theme.mutedClass}`} style={SF}>
                Tap to open the MJ41 World Cup mini app
              </div>
            </button>

            {wcLoading ? (
              <div className={`text-center py-8 text-[11px] ${theme.mutedClass}`} style={SF}>Loading World Cup data…</div>
            ) : (
              <>
                {/* TODAY'S MATCHES */}
                {wcData?.todayMatches && wcData.todayMatches.length > 0 && (
                  <div className={`mb-3 border-2 ${theme.border}`}>
                    <SectionHeader title={`Today's Matches — ${wcData.today}`} />
                    {wcData.todayMatches.map((m) => <WCMatchRow key={m.id} match={m} />)}
                  </div>
                )}

                {/* TOMORROW'S FIXTURES */}
                {wcData?.tomorrowMatches && wcData.tomorrowMatches.length > 0 && (
                  <div className={`mb-3 border-2 ${theme.border}`}>
                    <SectionHeader title={`Tomorrow — ${wcData.tomorrow}`} />
                    {wcData.tomorrowMatches.map((m) => <WCMatchRow key={m.id} match={m} />)}
                  </div>
                )}

                {/* RECENT RESULTS */}
                {wcData?.recentMatches && wcData.recentMatches.length > 0 && (
                  <div className={`mb-3 border-2 ${theme.border}`}>
                    <SectionHeader title="Recent Results" />
                    {wcData.recentMatches.map((m) => <WCMatchRow key={m.id} match={m} />)}
                  </div>
                )}

                {/* GROUP STANDINGS + FIXTURES */}
                {visibleWCGroups.length === 0 ? (
                  <div className={`text-center py-8 text-[11px] ${theme.mutedClass}`} style={SF}>
                    No groups selected.{' '}
                    <button onClick={() => setShowPrefs(true)} className="underline">Open Prefs</button>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 px-1">
                      <span className="text-[9px] uppercase tracking-widest font-black" style={SF}>— Group Standings —</span>
                    </div>
                    <div className={`text-[8px] ${theme.mutedClass} px-1 mb-2`} style={SF}>
                      <span className="text-green-600">•</span> = qualifies · tap group header to expand fixtures
                    </div>
                    {visibleWCGroups.map((g) => <WCGroupTable key={g.name} group={g} />)}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Prefs modal */}
      {showPrefs && (
        <PrefsPanel
          prefs={prefs}
          onChange={handlePrefsChange}
          onClose={() => setShowPrefs(false)}
        />
      )}
    </div>
  );
}
