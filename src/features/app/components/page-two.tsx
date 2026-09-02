'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/features/app/theme-context';
import { Magic8Ball } from '@/features/app/components/magic-8-ball';
import sdk from '@farcaster/miniapp-sdk';

/** Open a link through the Farcaster client when inside it, the browser otherwise. */
function openUrl(url: string) {
  try {
    sdk.actions.openUrl(url);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

const SF    = { fontFamily: 'Arial,sans-serif' };
const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };
const MONO  = { fontFamily: '"Courier New",Courier,monospace' };

interface Page2Data {
  joke: string | null;
  fact: string | null;
  /** Wikipedia's most-read articles from yesterday — the day's collective curiosity. */
  mostRead: {
    date: string;
    articles: { rank: number; title: string; views: number; url: string; thumb: string | null }[];
  } | null;
  /** What happened on today's date, through history. */
  onThisDay: { year: number; text: string; url: string | null }[] | null;
  agify: { name: string; age: number | null; count: number } | null;
  holidays: { name: string; description: string; type: string[] }[];
  numberFact: { text: string; number: number } | null;
  roboSeed: string;
  generatedAt: string;
}

// ── Sub-components ────────────────────────────────────────────────────

function SectionRule({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className={`flex-1 h-[2px] ${theme.fill}`} />
      <p className={`text-[8px] font-black uppercase tracking-[0.25em] px-1 ${theme.mutedClass}`} style={SF}>
        {label}
      </p>
      <div className={`flex-1 h-[2px] ${theme.fill}`} />
    </div>
  );
}

// ── RoboHash mascot ───────────────────────────────────────────────────
function DailyRobot({ seed }: { seed: string }) {
  const { theme } = useTheme();
  const url = `https://robohash.org/${encodeURIComponent(seed)}?set=set1&size=120x120&bgset=bg1`;
  return (
    <div className={`border-2 mb-4 ${theme.border}`}>
      <div className={`px-2 py-1 border-b flex items-center justify-between ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
        <p className="text-[8px] font-black uppercase tracking-widest" style={SF}>Miscellany Mascot</p>
        <p className="text-[7px] uppercase tracking-wide opacity-70" style={SF}>Daily Edition</p>
      </div>
      <div className={`flex items-center gap-3 p-3 ${theme.bg}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Today's Miscellany Robot"
          width={80}
          height={80}
          className={`border ${theme.borderLight} shrink-0`}
          style={{ imageRendering: 'pixelated' }}
        />
        <div>
          <p className="text-[13px] font-black leading-tight" style={SERIF}>
            Meet Today&apos;s Miscellany Robot
          </p>
          <p className={`text-[9px] leading-snug mt-1 ${theme.mutedClass}`} style={SF}>
            A new robot is generated for each issue. This one was assigned to today&apos;s edition.
            Built on RoboHash — identity through cryptographic seed.
          </p>
          <p className={`text-[7px] mt-1 ${theme.mutedClass}`} style={SF}>
            Seed: <span style={MONO}>{seed}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── ISS Location + Active Missions ────────────────────────────────────
interface IssLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

// Curated list of current active space missions (updated periodically)
const ACTIVE_MISSIONS = [
  { name: 'ISS', agency: 'NASA/Roscosmos/JAXA/ESA/CSA', desc: 'International Space Station — continuously crewed since 2000', orbit: 'LEO ~400 km' },
  { name: 'Hubble', agency: 'NASA/ESA', desc: 'Space telescope operating since 1990, still returning science data', orbit: 'LEO ~540 km' },
  { name: 'James Webb', agency: 'NASA/ESA/CSA', desc: 'Infrared space telescope at L2 point, launched Dec 2021', orbit: 'L2 Lagrange Point' },
  { name: 'Voyager 1', agency: 'NASA', desc: 'In interstellar space — farthest human-made object from Earth', orbit: 'Interstellar Space' },
  { name: 'Voyager 2', agency: 'NASA', desc: 'Second spacecraft to reach interstellar space', orbit: 'Interstellar Space' },
  { name: 'Mars Perseverance', agency: 'NASA', desc: 'Rover exploring Jezero Crater since Feb 2021', orbit: 'Mars Surface' },
  { name: 'Mars Ingenuity', agency: 'NASA', desc: 'First powered aircraft to fly on another planet', orbit: 'Mars Surface' },
  { name: 'JWST NIRCam', agency: 'NASA/ESA/CSA', desc: 'Primary imager aboard James Webb, near-infrared camera', orbit: 'L2 Lagrange Point' },
  { name: 'Parker Solar Probe', agency: 'NASA', desc: 'Closest spacecraft to the Sun ever — touching the solar corona', orbit: 'Heliocentric (Solar)' },
  { name: 'New Horizons', agency: 'NASA', desc: 'Past Pluto, now in the Kuiper Belt conducting distant observations', orbit: 'Kuiper Belt' },
  { name: 'Lunar Gateway', agency: 'NASA/ESA/JAXA/CSA', desc: 'Planned lunar orbital station, Artemis program', orbit: 'Lunar Orbit (planned)' },
  { name: 'Chandrayaan-3', agency: 'ISRO', desc: 'India lunar lander — first to land near the lunar south pole (Aug 2023)', orbit: 'Lunar Surface' },
];

function SpaceTracker() {
  const { theme } = useTheme();
  const [iss, setIss] = useState<IssLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [spotlight] = useState(() => ACTIVE_MISSIONS[Math.floor(Math.random() * 4)]); // ISS-JWST range

  useEffect(() => {
    fetch('https://api.open-notify.org/iss-now.json', { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((d) => {
        if (d?.iss_position) {
          setIss({
            latitude: parseFloat(d.iss_position.latitude),
            longitude: parseFloat(d.iss_position.longitude),
            timestamp: d.timestamp,
          });
        }
      })
      .catch(() => { /* silently fail */ })
      .finally(() => setLoading(false));
  }, []);

  function latStr(lat: number) {
    return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
  }
  function lonStr(lon: number) {
    return `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
  }

  return (
    <div className={`border-2 mb-4 ${theme.border}`}>
      <div className={`px-2 py-1 border-b flex items-center justify-between ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
        <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
          🛸 Space · Active Missions
        </p>
        <p className="text-[7px] uppercase tracking-wide opacity-70" style={SF}>Open Notify · NASA</p>
      </div>
      <div className={`p-2 ${theme.bg}`}>

        {/* ISS live position */}
        <div className={`border mb-2 p-2 ${theme.borderLight}`}>
          <div className="flex items-center gap-1 mb-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className={`text-[7px] uppercase tracking-widest font-bold ${theme.mutedClass}`} style={SF}>
              ISS Live Position
            </p>
          </div>
          {loading ? (
            <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>Locating ISS…</p>
          ) : iss ? (
            <>
              <div className="flex gap-3">
                <div>
                  <p className="text-[18px] font-black leading-none" style={SERIF}>{latStr(iss.latitude)}</p>
                  <p className={`text-[7px] uppercase tracking-widest mt-[2px] ${theme.mutedClass}`} style={SF}>Latitude</p>
                </div>
                <div>
                  <p className="text-[18px] font-black leading-none" style={SERIF}>{lonStr(iss.longitude)}</p>
                  <p className={`text-[7px] uppercase tracking-widest mt-[2px] ${theme.mutedClass}`} style={SF}>Longitude</p>
                </div>
              </div>
              <p className={`text-[8px] mt-1 ${theme.mutedClass}`} style={SF}>
                Orbital altitude ~408 km · Speed ~27,600 km/h
              </p>
            </>
          ) : (
            <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>ISS position temporarily unavailable.</p>
          )}
        </div>

        {/* Mission spotlight */}
        <div className={`border mb-2 p-2 ${theme.borderLight}`}>
          <p className={`text-[7px] uppercase tracking-widest mb-[2px] ${theme.mutedClass}`} style={SF}>Mission Spotlight</p>
          <p className="text-[14px] font-black leading-tight" style={SERIF}>{spotlight.name}</p>
          <p className={`text-[8px] mt-[2px] ${theme.mutedClass}`} style={SF}>
            {spotlight.agency} · <span style={MONO}>{spotlight.orbit}</span>
          </p>
          <p className={`text-[9px] mt-1 leading-snug ${theme.text}`} style={SF}>{spotlight.desc}</p>
        </div>

        {/* Active missions grid */}
        <p className={`text-[7px] uppercase tracking-widest mb-1 ${theme.mutedClass}`} style={SF}>
          {ACTIVE_MISSIONS.length} active missions in catalog
        </p>
        <div className="flex flex-wrap gap-[3px]">
          {ACTIVE_MISSIONS.map((m) => (
            <span key={m.name} className={`text-[7px] px-1 py-[1px] border ${theme.borderLight} ${theme.mutedClass}`} style={SF}>
              {m.name}
            </span>
          ))}
        </div>
        <p className={`text-[7px] mt-1 text-right ${theme.mutedClass}`} style={SF}>
          — Open Notify API · open-notify.org
        </p>
      </div>
    </div>
  );
}

// ── Main PageTwo ──────────────────────────────────────────────────────
export function PageTwo() {
  const { theme } = useTheme();
  const [data, setData] = useState<Page2Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/page2-data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={`overflow-y-auto ${theme.bg} ${theme.text}`} style={SERIF}>
      <div className="px-2 py-2">

        {/* ── PAGE 2 NAMEPLATE ── */}
        <div className={`border-2 mb-3 ${theme.border}`}>
          <div className={`px-2 py-[6px] flex justify-between items-center border-b ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
            <p className="text-[8px] uppercase tracking-[0.2em]" style={SF}>Page Two</p>
            <div className="flex items-center gap-2">
              <p className="text-[8px] uppercase tracking-[0.2em]" style={SF}>{today}</p>
              <button
                onClick={load}
                disabled={loading}
                className="text-[9px] opacity-70 active:opacity-40 disabled:opacity-30"
                style={SF}
              >
                ↻
              </button>
            </div>
          </div>
          <div className="px-2 py-2 text-center">
            <p className="text-[18px] font-black uppercase tracking-tight leading-none" style={SERIF}>
              The Daily Miscellany
            </p>
            <p className={`text-[8px] uppercase tracking-[0.2em] mt-1 ${theme.mutedClass}`} style={SF}>
              Network · Spacecraft · Curiosities · Ephemera
            </p>
          </div>
          <div className={`h-[2px] ${theme.fill}`} />
        </div>

        {loading && (
          <div className={`text-center py-10 ${theme.mutedClass}`} style={SF}>
            <p className="text-[10px]">Setting the press…</p>
          </div>
        )}

        {error && !loading && (
          <div className={`border-2 p-3 text-center mb-3 ${theme.borderLight}`}>
            <p className="text-[10px] text-red-500" style={SF}>{error}</p>
            <button onClick={load} className={`text-[9px] uppercase tracking-wide mt-2 ${theme.mutedClass}`} style={SF}>
              ↻ Try Again
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* ── DAILY ROBOT MASCOT ── */}
            <SectionRule label="Miscellany Identity" />
            <DailyRobot seed={data.roboSeed} />

            {/* ── WHAT THE WORLD LOOKED UP ── */}
            {data.mostRead && data.mostRead.articles.length > 0 && (
              <>
                <SectionRule label="What the World Looked Up" />
                <div className={`border-2 mb-4 ${theme.border}`}>
                  <div className={`px-2 py-1 border-b flex justify-between items-center ${theme.borderLight} ${theme.fillLight}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
                      Most Read on Wikipedia
                    </p>
                    <p className={`text-[8px] uppercase tracking-widest ${theme.mutedClass}`} style={SF}>
                      Yesterday
                    </p>
                  </div>
                  <div>
                    {data.mostRead.articles.map((a) => (
                      <button
                        key={a.rank}
                        onClick={() => openUrl(a.url)}
                        className={`w-full flex items-center gap-2 px-2 py-[6px] border-b text-left active:opacity-60 ${theme.borderLight}`}
                      >
                        <span
                          className={`text-[13px] font-black tabular-nums w-5 shrink-0 ${theme.mutedClass}`}
                          style={SERIF}
                        >
                          {a.rank}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[11px] font-bold leading-tight truncate" style={SERIF}>
                            {a.title}
                          </span>
                          <span className={`block text-[8px] tabular-nums ${theme.mutedClass}`} style={SF}>
                            {a.views.toLocaleString()} readers
                          </span>
                        </span>
                        <span className={`text-[9px] shrink-0 ${theme.mutedClass}`}>↗</span>
                      </button>
                    ))}
                  </div>
                  <p className={`text-[7px] px-2 py-1 ${theme.mutedClass}`} style={SF}>
                    Source: Wikimedia · English Wikipedia
                  </p>
                </div>
              </>
            )}

            {/* ── ON THIS DAY ── */}
            {data.onThisDay && data.onThisDay.length > 0 && (
              <>
                <SectionRule label="On This Day" />
                <div className={`border-2 mb-4 ${theme.border}`}>
                  {data.onThisDay.map((e, i) => (
                    <button
                      key={`${e.year}-${i}`}
                      onClick={() => e.url && openUrl(e.url)}
                      disabled={!e.url}
                      className={`w-full flex gap-2 px-2 py-2 text-left ${
                        i > 0 ? `border-t ${theme.borderLight}` : ""
                      } ${e.url ? "active:opacity-60" : ""}`}
                    >
                      <span className="text-[14px] font-black tabular-nums shrink-0 w-9" style={SERIF}>
                        {e.year}
                      </span>
                      <span className="flex-1 text-[10px] leading-snug" style={SERIF}>
                        {e.text}
                      </span>
                    </button>
                  ))}
                  <p className={`text-[7px] px-2 py-1 border-t ${theme.borderLight} ${theme.mutedClass}`} style={SF}>
                    Source: Wikimedia
                  </p>
                </div>
              </>
            )}

            {/* ── TODAY'S OBSERVANCES ── */}
            {data.holidays.length > 0 && (
              <>
                <SectionRule label="Today's Observances" />
                <div className={`border-2 mb-4 ${theme.border}`}>
                  <div className={`px-2 py-1 border-b ${theme.borderLight} ${theme.fillLight}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
                      Holidays & Observances · {today.split(',')[0]}
                    </p>
                  </div>
                  <div>
                    {data.holidays.map((h, i) => (
                      <div
                        key={i}
                        className={`px-2 py-2 border-b ${theme.bg} ${theme.borderLight}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] font-black leading-tight flex-1">{h.name}</p>
                          <span className={`text-[7px] uppercase tracking-wide px-1 py-[1px] border shrink-0 ${theme.borderLight} ${theme.mutedClass}`} style={SF}>
                            {Array.isArray(h.type) ? h.type[0] : h.type}
                          </span>
                        </div>
                        {h.description && (
                          <p className={`text-[9px] mt-[2px] leading-snug ${theme.mutedClass}`} style={SF}>
                            {h.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── YO MOMMA + USELESS FACT — 2-col ── */}
            <SectionRule label="Page Two Filler" />
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className={`border-2 flex flex-col ${theme.border}`}>
                <div className={`px-2 py-1 border-b ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
                  <p className="text-[8px] font-black uppercase tracking-widest" style={SF}>Yo Momma</p>
                </div>
                <div className={`p-2 flex-1 ${theme.bg}`}>
                  <p className="text-[10px] leading-snug" style={SERIF}>{data.joke}</p>
                </div>
                <p className={`px-2 pb-1 text-[7px] ${theme.mutedClass}`} style={SF}>— yomomma-api</p>
              </div>

              <div className={`border-2 flex flex-col ${theme.border}`}>
                <div className={`px-2 py-1 border-b ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
                  <p className="text-[8px] font-black uppercase tracking-widest" style={SF}>Useless Fact</p>
                </div>
                <div className={`p-2 flex-1 ${theme.bg}`}>
                  {data.fact ? (
                    <p className="text-[10px] leading-snug" style={SERIF}>{data.fact}</p>
                  ) : (
                    <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>Unavailable today.</p>
                  )}
                </div>
                <p className={`px-2 pb-1 text-[7px] ${theme.mutedClass}`} style={SF}>— uselessfacts.jsph.pl</p>
              </div>
            </div>

            {/* ── NUMBER FACT + AGIFY — 2-col ── */}
            <SectionRule label="By the Numbers" />
            <div className="grid grid-cols-2 gap-2 mb-4">

              {/* Numbers API */}
              {data.numberFact && (
                <div className={`border-2 flex flex-col ${theme.border}`}>
                  <div className={`px-2 py-1 border-b ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
                    <p className="text-[8px] font-black uppercase tracking-widest" style={SF}>
                      The Number {data.numberFact.number}
                    </p>
                  </div>
                  <div className={`p-2 flex-1 ${theme.bg}`}>
                    <p className="text-[28px] font-black leading-none mb-1 text-center" style={SERIF}>
                      {data.numberFact.number}
                    </p>
                    <p className="text-[9px] leading-snug" style={SERIF}>{data.numberFact.text}</p>
                  </div>
                  <p className={`px-2 pb-1 text-[7px] ${theme.mutedClass}`} style={SF}>— numbersapi.com</p>
                </div>
              )}

              {/* Agify */}
              {data.agify && (
                <div className={`border-2 flex flex-col ${theme.border}`}>
                  <div className={`px-2 py-1 border-b ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
                    <p className="text-[8px] font-black uppercase tracking-widest" style={SF}>Name of the Day</p>
                  </div>
                  <div className={`p-2 flex-1 text-center ${theme.bg}`}>
                    <p className="text-[22px] font-black uppercase leading-none mb-1" style={SERIF}>
                      {data.agify.name}
                    </p>
                    {data.agify.age ? (
                      <p className={`text-[9px] leading-snug ${theme.mutedClass}`} style={SF}>
                        Average age <strong>{data.agify.age}</strong>
                        <br />
                        {data.agify.count.toLocaleString()} records
                      </p>
                    ) : (
                      <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>Age unknown</p>
                    )}
                  </div>
                  <p className={`px-2 pb-1 text-[7px] ${theme.mutedClass}`} style={SF}>— agify.io</p>
                </div>
              )}
            </div>

            {/* ── SPACE TRACKER ── */}
            <SectionRule label="Beyond the Atmosphere" />
            <SpaceTracker />

            {/* ── MAGIC 8-BALL ── */}
            <SectionRule label="Oracle Corner" />
            <Magic8Ball />

            {/* ── FOOTER ── */}
            <div className={`border-t-2 pt-2 pb-4 text-center ${theme.border}`}>
              <p className={`text-[7px] uppercase tracking-[0.25em] ${theme.mutedClass}`} style={SF}>
                End of Page Two · The Daily Miscellany
              </p>
              <p className={`text-[7px] mt-1 ${theme.mutedClass}`} style={SF}>
                Refreshed {new Date(data.generatedAt).toLocaleTimeString()}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
