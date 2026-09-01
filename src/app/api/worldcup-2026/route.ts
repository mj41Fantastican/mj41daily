import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/worldcup-2026
 *
 * Returns all 2026 FIFA World Cup group stage matches with live scores
 * where available, plus today's and tomorrow's fixtures.
 *
 * Data source: github.com/openfootball/world-cup.json (public domain)
 * Live scores are only available once that repo is updated; we cache 15min.
 */

const WC_URL = 'https://raw.githubusercontent.com/openfootball/world-cup.json/master/2026/worldcup.json';

export interface WCMatch {
  id: number;
  date: string;        // "2026-06-11"
  time: string;        // "13:00 UTC-6"
  team1: string;
  team2: string;
  group: string;
  ground: string;
  score: { ft: [number, number]; ht?: [number, number] } | null;
  winner: string | null; // team name or "Draw" or null if not played
  goals1: { name: string; minute: string }[];
  goals2: { name: string; minute: string }[];
  round: string;
}

export interface WCGroup {
  name: string;        // "Group A"
  teams: string[];
  matches: WCMatch[];
  standings: WCStanding[];
}

export interface WCStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

function computeGroupStandings(matches: WCMatch[], teams: string[]): WCStanding[] {
  const table: Record<string, WCStanding> = {};
  for (const t of teams) {
    table[t] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  }

  for (const m of matches) {
    if (!m.score) continue;
    const [g1, g2] = m.score.ft;
    const t1 = table[m.team1];
    const t2 = table[m.team2];
    if (!t1 || !t2) continue;

    t1.played++; t2.played++;
    t1.gf += g1; t1.ga += g2;
    t2.gf += g2; t2.ga += g1;

    if (g1 > g2) {
      t1.won++; t1.pts += 3; t2.lost++;
    } else if (g1 < g2) {
      t2.won++; t2.pts += 3; t1.lost++;
    } else {
      t1.drawn++; t2.drawn++; t1.pts++; t2.pts++;
    }
  }

  for (const s of Object.values(table)) {
    s.gd = s.gf - s.ga;
  }

  return Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team);
  });
}

function dateString(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(WC_URL, {
      next: { revalidate: 900 }, // 15 min cache — source updates periodically
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'Failed to fetch WC data' }, { status: 502 });
    }

    const raw = await res.json() as { matches: Record<string, unknown>[] };
    const rawMatches = raw.matches ?? [];

    // Parse all matches
    const allMatches: WCMatch[] = rawMatches.map((m, i) => {
      const score = m.score as { ft?: [number, number]; ht?: [number, number] } | undefined;
      const goals1 = (m.goals1 as { name: string; minute: string }[]) ?? [];
      const goals2 = (m.goals2 as { name: string; minute: string }[]) ?? [];

      let winner: string | null = null;
      if (score?.ft) {
        const [g1, g2] = score.ft;
        if (g1 > g2) winner = m.team1 as string;
        else if (g2 > g1) winner = m.team2 as string;
        else winner = 'Draw';
      }

      return {
        id:     i + 1,
        date:   m.date as string ?? '',
        time:   m.time as string ?? '',
        team1:  m.team1 as string ?? '',
        team2:  m.team2 as string ?? '',
        group:  m.group as string ?? '',
        ground: m.ground as string ?? '',
        round:  m.round as string ?? '',
        score:  score?.ft ? { ft: score.ft, ht: score.ht } : null,
        winner,
        goals1,
        goals2,
      };
    });

    // Group stage only (has group assigned)
    const groupMatches = allMatches.filter((m) => m.group && m.group.startsWith('Group'));

    // Build groups
    const groupMap: Record<string, { teams: Set<string>; matches: WCMatch[] }> = {};
    for (const m of groupMatches) {
      if (!groupMap[m.group]) groupMap[m.group] = { teams: new Set(), matches: [] };
      groupMap[m.group].teams.add(m.team1);
      groupMap[m.group].teams.add(m.team2);
      groupMap[m.group].matches.push(m);
    }

    const groups: WCGroup[] = Object.entries(groupMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, data]) => {
        const teams = [...data.teams].sort();
        return {
          name,
          teams,
          matches: data.matches.sort((a, b) => a.date.localeCompare(b.date)),
          standings: computeGroupStandings(data.matches, teams),
        };
      });

    const today    = dateString(0);
    const tomorrow = dateString(1);

    const todayMatches    = groupMatches.filter((m) => m.date === today);
    const tomorrowMatches = groupMatches.filter((m) => m.date === tomorrow);

    // Most recent completed matches (last 3 days)
    const recentDates = [-1, -2, -3].map((o) => dateString(o));
    const recentMatches = groupMatches
      .filter((m) => recentDates.includes(m.date) && m.score !== null)
      .sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      today,
      tomorrow,
      groups,
      todayMatches,
      tomorrowMatches,
      recentMatches: recentMatches.slice(0, 12),
      totalMatches: groupMatches.length,
    });
  } catch (err) {
    console.error('worldcup-2026 error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to fetch World Cup data' }, { status: 500 });
  }
}
