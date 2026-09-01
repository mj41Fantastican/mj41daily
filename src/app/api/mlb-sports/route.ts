import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/mlb-sports
 *
 * Returns:
 *  - standings: all 6 MLB divisions (AL East/Central/West, NL East/Central/West)
 *  - todayGames: today's schedule
 *  - yesterdayGames: yesterday's final scores
 *
 * Uses the free MLB Stats API (no key required).
 */

const MLB_BASE = 'https://statsapi.mlb.com/api/v1';

export interface MLBTeamRecord {
  team: { id: number; name: string };
  wins: number;
  losses: number;
  pct: string;
  gamesBack: string;
  streak: string;
  last10: string;
  home: string;
  away: string;
}

export interface MLBDivision {
  divisionId: number;
  divisionName: string;
  league: 'AL' | 'NL';
  teams: MLBTeamRecord[];
}

export interface MLBGame {
  id: number;
  status: string; // 'Preview' | 'Live' | 'Final' | 'Postponed'
  abstractState: string; // 'Preview' | 'Live' | 'Final'
  awayTeam: string;
  awayScore: number | null;
  homeTeam: string;
  homeScore: number | null;
  gameTime: string; // "7:05 PM ET"
  inning?: string;
}

const DIV_META: Record<number, { name: string; league: 'AL' | 'NL' }> = {
  200: { name: 'AL West',    league: 'AL' },
  201: { name: 'AL East',    league: 'AL' },
  202: { name: 'AL Central', league: 'AL' },
  203: { name: 'NL West',    league: 'NL' },
  204: { name: 'NL East',    league: 'NL' },
  205: { name: 'NL Central', league: 'NL' },
};

function isoToET(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) + ' ET';
  } catch {
    return '';
  }
}

function dateString(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const today     = dateString(0);
    const yesterday = dateString(-1);

    const [standingsRes, todayRes, yesterdayRes] = await Promise.all([
      fetch(`${MLB_BASE}/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason`, {
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`${MLB_BASE}/schedule?sportId=1&date=${today}&hydrate=team,linescore`, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(6000),
      }),
      fetch(`${MLB_BASE}/schedule?sportId=1&date=${yesterday}&hydrate=team,linescore`, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(6000),
      }),
    ]);

    // ── Standings ───────────────────────────────────────────────────────
    const divisions: MLBDivision[] = [];
    if (standingsRes.ok) {
      const sd = await standingsRes.json();
      for (const record of sd.records ?? []) {
        const divId   = record.division?.id as number;
        const meta    = DIV_META[divId];
        if (!meta) continue;

        const teams: MLBTeamRecord[] = (record.teamRecords ?? []).map((tr: Record<string, unknown>) => {
          const lr  = tr.leagueRecord as Record<string, unknown>;
          const splits = (tr.records as Record<string, unknown>)?.splitRecords as Record<string, unknown>[] ?? [];
          const homeRec  = splits.find((s) => s.type === 'home') as Record<string, unknown> | undefined;
          const awayRec  = splits.find((s) => s.type === 'away') as Record<string, unknown> | undefined;
          const last10   = splits.find((s) => s.type === 'lastTen') as Record<string, unknown> | undefined;
          const streak   = tr.streak as Record<string, unknown>;

          return {
            team:     { id: (tr.team as Record<string, unknown>).id as number, name: (tr.team as Record<string, unknown>).name as string },
            wins:     lr?.wins as number ?? 0,
            losses:   lr?.losses as number ?? 0,
            pct:      lr?.pct as string ?? '.000',
            gamesBack: tr.divisionGamesBack as string ?? '-',
            streak:   streak?.streakCode as string ?? '-',
            last10:   last10 ? `${last10.wins}-${last10.losses}` : '-',
            home:     homeRec ? `${homeRec.wins}-${homeRec.losses}` : '-',
            away:     awayRec ? `${awayRec.wins}-${awayRec.losses}` : '-',
          };
        });

        divisions.push({ divisionId: divId, divisionName: meta.name, league: meta.league, teams });
      }
    }

    // Sort: AL East, Central, West, NL East, Central, West
    const SORT: Record<number, number> = { 201: 0, 202: 1, 200: 2, 204: 3, 205: 4, 203: 5 };
    divisions.sort((a, b) => (SORT[a.divisionId] ?? 9) - (SORT[b.divisionId] ?? 9));

    // ── Game parser ─────────────────────────────────────────────────────
    function parseGames(schedData: Record<string, unknown>): MLBGame[] {
      const dates = schedData.dates as Record<string, unknown>[] ?? [];
      const games = (dates[0]?.games as Record<string, unknown>[] ?? []);
      return games.map((g) => {
        const teams  = g.teams as Record<string, Record<string, unknown>>;
        const status = g.status as Record<string, unknown>;
        const ls     = g.linescore as Record<string, unknown> | undefined;
        const inningOrdinal = ls?.currentInningOrdinal as string | undefined;
        const inningState   = ls?.inningState as string | undefined;

        return {
          id:           g.gamePk as number,
          status:       status?.detailedState as string ?? '',
          abstractState: status?.abstractGameState as string ?? 'Preview',
          awayTeam:     (teams?.away?.team as Record<string, unknown>)?.name as string ?? '',
          awayScore:    teams?.away?.score as number ?? null,
          homeTeam:     (teams?.home?.team as Record<string, unknown>)?.name as string ?? '',
          homeScore:    teams?.home?.score as number ?? null,
          gameTime:     isoToET(g.gameDate as string),
          inning:       (inningState && inningOrdinal) ? `${inningState} ${inningOrdinal}` : undefined,
        };
      });
    }

    const todayGames     = todayRes.ok     ? parseGames(await todayRes.json())     : [];
    const yesterdayGames = yesterdayRes.ok ? parseGames(await yesterdayRes.json()) : [];

    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      today,
      yesterday,
      divisions,
      todayGames,
      yesterdayGames,
    });
  } catch (err) {
    console.error('mlb-sports error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to fetch MLB data' }, { status: 500 });
  }
}
