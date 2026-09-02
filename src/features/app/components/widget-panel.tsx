'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/features/app/theme-context';
import sdk from '@farcaster/miniapp-sdk';

const SF = { fontFamily: 'Arial,sans-serif' };
const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };

export type WidgetId =
  | 'weather' | 'cat' | 'anilist' | 'book' | 'color' | 'agify' | 'art' | 'quakes';

export const WIDGET_META: Record<WidgetId, { label: string; icon: string; desc: string }> = {
  weather: { label: 'Weather', icon: '🌤', desc: 'Live weather by city' },
  cat:     { label: 'Cat of the Day', icon: '🐱', desc: 'Random cat from CATAAS' },
  anilist: { label: 'Anime Birthdays', icon: '🎂', desc: "Today's anime character birthdays" },
  book:    { label: 'Book of the Day', icon: '📚', desc: 'Daily book pick + search' },
  color:   { label: 'Color of the Day', icon: '🎨', desc: "Today's color via The Color API" },
  agify:   { label: 'Agify', icon: '🎲', desc: 'Guess a name\'s age' },
  art:     { label: 'AIC Artwork', icon: '🖼', desc: 'Daily Art Institute of Chicago piece' },
  quakes:  { label: 'Where Earth Quaked', icon: '🌋', desc: 'Live seismic wire from USGS' },
};

// ── Individual widget components ──────────────────────────────────────────────

function WeatherWidget() {
  const { theme } = useTheme();
  const [city, setCity] = useState('New York');
  const [input, setInput] = useState('New York');
  const [data, setData] = useState<{
    city: string; country: string; tempF: number; tempC: number;
    humidity: number; windMph: number; condition: string; code: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function fetch_weather(c: string) {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/widgets?type=weather&city=${encodeURIComponent(c)}`);
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setData(d.data); setCity(c);
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetch_weather('New York'); }, []);

  const WMO_EMOJI: Record<number, string> = {
    0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',
    51:'🌦',53:'🌧',55:'🌧',61:'🌧',63:'🌧',65:'🌧',
    71:'❄️',73:'❄️',75:'❄️',80:'🌦',81:'🌦',82:'⛈',
    95:'⛈',96:'⛈',99:'⛈',
  };

  return (
    <div className={`border-2 ${theme.border}`}>
      <div className={`px-2 py-[3px] border-b flex items-center gap-1 ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
        <span style={SF} className="text-[9px] font-black uppercase tracking-widest">🌤 Weather Report</span>
      </div>
      <div className={`p-2 ${theme.bg}`}>
        <div className="flex gap-1 mb-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetch_weather(input)}
            className={`flex-1 border px-2 py-1 text-[10px] min-h-[32px] outline-none ${theme.borderLight} ${theme.bg} ${theme.text}`}
            placeholder="City name..."
            style={SF}
          />
          <button
            onClick={() => fetch_weather(input)}
            disabled={loading}
            className={`px-3 border text-[9px] font-bold min-h-[32px] uppercase tracking-wide ${theme.border} ${theme.fill} ${theme.fillText} disabled:opacity-40`}
            style={SF}
          >
            {loading ? '⏳' : 'Go'}
          </button>
        </div>
        {err && <p className="text-[9px] text-red-500 mb-1" style={SF}>{err}</p>}
        {data && (
          <div className="flex items-start gap-2">
            <div className="text-[3rem] leading-none">{WMO_EMOJI[data.code] ?? '🌡'}</div>
            <div className="flex-1">
              <p className="text-[14px] font-black leading-none" style={SERIF}>{data.tempF}°F <span className={`text-[10px] font-normal ${theme.mutedClass}`}>/ {data.tempC}°C</span></p>
              <p className="text-[10px] font-bold mt-[2px]">{data.condition}</p>
              <p className={`text-[8px] mt-1 ${theme.mutedClass}`} style={SF}>
                {data.city}, {data.country} · 💧 {data.humidity}% · 💨 {data.windMph} mph
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CatWidget() {
  const { theme } = useTheme();
  const [data, setData] = useState<{ imageUrl: string; tag: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tag, setTag] = useState('');

  async function fetchCat(t?: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/widgets?type=cat${t ? `&tag=${encodeURIComponent(t)}` : ''}`);
      const d = await res.json();
      if (d.ok) setData(d.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchCat(); }, []);

  return (
    <div className={`border-2 ${theme.border}`}>
      <div className={`px-2 py-[3px] border-b flex items-center justify-between ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
        <span style={SF} className="text-[9px] font-black uppercase tracking-widest">🐱 Cat of the Day</span>
        <button onClick={() => fetchCat(tag)} disabled={loading}
          className={`text-[8px] font-bold uppercase tracking-wide opacity-80 hover:opacity-100 disabled:opacity-40`} style={SF}>
          {loading ? '⏳' : '↻ New Cat'}
        </button>
      </div>
      <div className={`${theme.bg}`}>
        {data ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.imageUrl} alt="Cat of the day"
              className="w-full object-cover" style={{ maxHeight: 180, background: '#f0f0f0' }}
              onError={() => fetchCat()}
            />
            <div className="px-2 py-1 flex gap-1">
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchCat(tag)}
                className={`flex-1 border px-2 py-[3px] text-[9px] outline-none ${theme.borderLight} ${theme.bg} ${theme.text}`}
                placeholder="Filter by tag (e.g. cute, funny)..."
                style={SF}
              />
            </div>
          </>
        ) : (
          <div className="p-4 text-center">
            <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>{loading ? 'Fetching cat...' : 'Cat unavailable 😿'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AniListWidget() {
  const { theme } = useTheme();
  const [data, setData] = useState<{
    month: number; day: number;
    isBirthday: boolean;
    characters: Array<{ name: string; nativeName?: string; imageUrl: string; description?: string; media: string | null; mediaType: string | null }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/widgets?type=anilist')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const headerLabel = data?.isBirthday ? '🎂 Anime Birthdays' : '🎌 Featured Characters';
  const subLabel = data
    ? data.isBirthday
      ? `${months[data.month - 1]} ${data.day}`
      : 'Today\'s picks'
    : null;

  return (
    <div className={`border-2 ${theme.border}`}>
      <div className={`px-2 py-[3px] border-b flex items-center justify-between ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
        <span style={SF} className="text-[9px] font-black uppercase tracking-widest">{headerLabel}</span>
        {subLabel && <span className="text-[8px] opacity-80" style={SF}>{subLabel}</span>}
      </div>
      <div className={`p-2 ${theme.bg}`}>
        {loading && <p className={`text-[9px] text-center py-3 ${theme.mutedClass}`} style={SF}>Loading...</p>}
        {!loading && data?.isBirthday === false && data.characters.length > 0 && (
          <p className={`text-[7px] italic mb-2 ${theme.mutedClass}`} style={SF}>
            No birthdays today — here are some fan favorites instead.
          </p>
        )}
        <div className="space-y-1">
          {(data?.characters ?? []).slice(0, 3).map((c, i) => (
            <div key={i} className={`flex items-center gap-2 border p-1 ${theme.borderLight}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt={c.name} className="w-8 h-8 object-cover shrink-0" style={{ borderRadius: 2 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold leading-none truncate">{c.name}</p>
                {c.media && <p className={`text-[8px] leading-tight truncate ${theme.mutedClass}`} style={SF}>{c.media}</p>}
                {data?.isBirthday && c.mediaType && (
                  <p className={`text-[7px] uppercase tracking-wide ${theme.mutedClass}`} style={SF}>{c.mediaType}</p>
                )}
              </div>
              {data?.isBirthday && (
                <span className="text-[11px] shrink-0">🎂</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BookWidget() {
  const { theme } = useTheme();
  const [data, setData] = useState<{
    title?: string; author?: string; year?: number; coverUrl?: string; subject?: string;
    results?: Array<{ title: string; author: string; year: number; coverUrl?: string }>;
    query?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function doSearch(q: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/widgets?type=book&q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (d.ok) setData(d.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetch('/api/widgets?type=book')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isSearch = !!data?.results;

  return (
    <div className={`border-2 ${theme.border}`}>
      <div className={`px-2 py-[3px] border-b flex items-center justify-between ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
        <span style={SF} className="text-[9px] font-black uppercase tracking-widest">📚 Book of the Day</span>
        {isSearch && <button onClick={() => { setSearch(''); setLoading(true); fetch('/api/widgets?type=book').then(r=>r.json()).then(d=>{if(d.ok)setData(d.data)}).catch(()=>{}).finally(()=>setLoading(false)); }}
          className="text-[8px] uppercase tracking-wide opacity-80" style={SF}>← Daily pick</button>}
      </div>
      <div className={`p-2 ${theme.bg}`}>
        <div className="flex gap-1 mb-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search.trim() && doSearch(search)}
            className={`flex-1 border px-2 py-1 text-[10px] min-h-[30px] outline-none ${theme.borderLight} ${theme.bg} ${theme.text}`}
            placeholder="Search books..."
            style={SF}
          />
          <button onClick={() => search.trim() && doSearch(search)} disabled={loading || !search.trim()}
            className={`px-2 border text-[9px] font-bold min-h-[30px] ${theme.border} ${theme.fill} ${theme.fillText} disabled:opacity-40`}
            style={SF}>🔍</button>
        </div>
        {loading && <p className={`text-[9px] py-2 text-center ${theme.mutedClass}`} style={SF}>Loading...</p>}
        {!loading && !isSearch && data && (
          <div className="flex gap-2">
            {data.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.coverUrl} alt={data.title} className="w-12 shrink-0 object-cover" style={{ maxHeight: 72 }} />
            )}
            <div>
              {data.subject && <p className={`text-[7px] uppercase tracking-widest mb-[2px] ${theme.mutedClass}`} style={SF}>Today in {data.subject}</p>}
              <p className="text-[11px] font-bold leading-tight" style={SERIF}>{data.title}</p>
              <p className={`text-[9px] mt-[2px] ${theme.mutedClass}`} style={SF}>{data.author}{data.year ? ` · ${data.year}` : ''}</p>
            </div>
          </div>
        )}
        {!loading && isSearch && (data?.results ?? []).slice(0, 4).map((b, i) => (
          <div key={i} className={`flex items-center gap-2 border-b py-1 last:border-0 ${theme.borderLight}`}>
            {b.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.coverUrl} alt="" className="w-6 h-8 object-cover shrink-0" />
            ) : (
              <div className={`w-6 h-8 shrink-0 border text-center leading-8 text-[8px] ${theme.borderLight}`}>📖</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate leading-none">{b.title}</p>
              <p className={`text-[8px] truncate ${theme.mutedClass}`} style={SF}>{b.author}{b.year ? ` (${b.year})` : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorWidget() {
  const { theme } = useTheme();
  const [data, setData] = useState<{
    name: string; hex: string; rgb: string; hsl: string; nearest_named: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/widgets?type=color')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Opens Base Colors mini app pre-loaded to the given hex.
  // basecolors.com is a registered Farcaster mini app — Warpcast intercepts
  // the URL and opens it in-app rather than in an external browser.
  function openBaseColors(hex: string) {
    const clean = hex.replace('#', '').toLowerCase();
    void sdk.actions.openUrl(`https://www.basecolors.com/?color=${clean}`);
  }

  return (
    <div className={`border-2 ${theme.border}`}>
      <div className={`px-2 py-[3px] border-b ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
        <span style={SF} className="text-[9px] font-black uppercase tracking-widest">🎨 Color of the Day</span>
      </div>
      <div className={`${theme.bg}`}>
        {loading && <p className={`text-[9px] p-3 text-center ${theme.mutedClass}`} style={SF}>Loading...</p>}
        {data && (
          <>
            {/* Color swatch — tap to open Base Colors pre-loaded with this exact hex */}
            <button
              className="w-full block border-0 p-0 cursor-pointer relative group"
              style={{ height: 72, backgroundColor: data.hex }}
              onClick={() => openBaseColors(data.hex)}
              title={`Mint ${data.hex} on Base Colors`}
            >
              {/* Tap/hover overlay */}
              <span
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.45)' }}
              >
                <span className="text-white text-[10px] font-black tracking-widest" style={SF}>
                  MINT ON BASE COLORS ↗
                </span>
              </span>
            </button>

            <div className="px-2 pt-1 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-black leading-tight" style={SERIF}>{data.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-[2px] mt-[3px]">
                    {[['HEX', data.hex], ['RGB', data.rgb], ['HSL', data.hsl]].map(([k, v]) => (
                      <p key={k} className={`text-[8px] ${theme.mutedClass}`} style={SF}>
                        <span className="font-bold">{k}</span> {v}
                      </p>
                    ))}
                  </div>
                </div>
                {/* Mint button — styled in the day's own color */}
                <button
                  className="shrink-0 mt-[2px] px-2 py-[5px] text-[8px] font-black uppercase tracking-wider border-2 leading-none active:opacity-70 transition-opacity"
                  style={{
                    ...SF,
                    backgroundColor: data.hex,
                    borderColor: data.hex,
                    color: isLightColor(data.hex) ? '#000' : '#fff',
                  }}
                  onClick={() => openBaseColors(data.hex)}
                >
                  Mint ↗
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Returns true if a hex color is perceptually light (for contrast) */
function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Perceived luminance (ITU-R BT.709)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 128;
}

function AgifyWidget() {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [result, setResult] = useState<{ name: string; age: number | null; count: number | null } | null>(null);
  const [loading, setLoading] = useState(false);

  async function guess() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/widgets?type=agify&name=${encodeURIComponent(name.trim())}`);
      const d = await res.json();
      if (d.ok) setResult(d.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  return (
    <div className={`border-2 ${theme.border}`}>
      <div className={`px-2 py-[3px] border-b ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
        <span style={SF} className="text-[9px] font-black uppercase tracking-widest">🎲 Agify — Age by Name</span>
      </div>
      <div className={`p-2 ${theme.bg}`}>
        <p className={`text-[9px] mb-2 leading-snug ${theme.mutedClass}`} style={SF}>
          Enter a first name and we&apos;ll predict the average age of people who have it.
        </p>
        <div className="space-y-1 mb-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && guess()}
            className={`w-full border px-2 py-2 text-[11px] min-h-[40px] outline-none ${theme.borderLight} ${theme.bg} ${theme.text}`}
            placeholder="e.g. Michael, Zara, Kenji..."
            style={SF}
          />
          <button onClick={guess} disabled={loading || !name.trim()}
            className={`w-full border-2 text-[10px] font-black min-h-[44px] uppercase tracking-widest ${theme.border} ${theme.fill} ${theme.fillText} disabled:opacity-40 active:opacity-70`}
            style={SF}>{loading ? '⏳ Guessing...' : '🎲 Guess My Age'}</button>
        </div>
        {result && (
          <div className={`border p-2 text-center ${theme.borderLight}`}>
            <p className={`text-[9px] uppercase tracking-widest ${theme.mutedClass}`} style={SF}>
              People named <strong>{result.name}</strong> are typically aged
            </p>
            <p className="text-[36px] font-black leading-none my-1" style={SERIF}>
              {result.age ?? '?'}
            </p>
            {result.count && (
              <p className={`text-[8px] ${theme.mutedClass}`} style={SF}>
                Based on {result.count.toLocaleString()} people in the dataset
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ArtWidget() {
  const { theme } = useTheme();
  const [data, setData] = useState<{
    title: string; artist: string; date: string; medium: string;
    origin: string; imageUrl: string | null; artUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/widgets?type=art')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openArt() {
    if (!data?.artUrl) return;
    try { sdk.actions.openUrl(data.artUrl); } catch { window.open(data.artUrl, '_blank'); }
  }

  return (
    <div className={`border-2 ${theme.border}`}>
      <div className={`px-2 py-[3px] border-b flex items-center justify-between ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
        <span style={SF} className="text-[9px] font-black uppercase tracking-widest">🖼 Art Institute of Chicago</span>
        <span className={`text-[7px] uppercase tracking-wide opacity-70`} style={SF}>Daily Pick</span>
      </div>
      <div className={`${theme.bg}`}>
        {loading && <p className={`text-[9px] p-3 text-center ${theme.mutedClass}`} style={SF}>Loading artwork...</p>}
        {data && (
          <button onClick={openArt} className="w-full text-left active:opacity-70">
            {data.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.imageUrl} alt={data.title}
                className="w-full object-contain bg-gray-100" style={{ maxHeight: 160 }} />
            )}
            <div className="px-2 py-1">
              <p className="text-[11px] font-bold leading-tight" style={SERIF}>{data.title}</p>
              <p className={`text-[9px] mt-[2px] leading-snug ${theme.mutedClass}`} style={SF}>{data.artist}</p>
              <div className={`flex flex-wrap gap-x-3 mt-1 text-[7px] ${theme.mutedClass}`} style={SF}>
                {data.date && <span>{data.date}</span>}
                {data.origin && <span>{data.origin}</span>}
              </div>
              {data.medium && <p className={`text-[7px] mt-[2px] italic ${theme.mutedClass}`} style={SF}>{data.medium}</p>}
              <p className="text-[7px] uppercase tracking-wide mt-1 opacity-40" style={SF}>Tap to view on AIC ↗</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// ── WidgetPanel (main export) ─────────────────────────────────────────────────
interface WidgetPanelProps {
  /** Which widgets are active for this issue */
  activeWidgets: WidgetId[];
}

/**
 * Where Earth Quaked — the seismic wire.
 *
 * USGS records a few hundred quakes a day, almost all of them too small to feel.
 * Printing the count alongside the largest few gives the reader both the scale of
 * the day and the ones that actually mattered.
 */
function QuakeWidget() {
  const { theme } = useTheme();
  const [data, setData] = useState<{
    total: number;
    felt: number;
    largest: { mag: number; place: string; time: number; url: string; tsunami: boolean }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/widgets?type=quakes')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /** Magnitude sets the type size, the way a newspaper sizes a headline. */
  function magSize(mag: number) {
    if (mag >= 6) return 15;
    if (mag >= 5) return 13;
    return 11;
  }

  return (
    <div className={`border-2 ${theme.border}`}>
      <div className={`px-2 py-[3px] border-b flex items-center justify-between ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
        <span style={SF} className="text-[9px] font-black uppercase tracking-widest">
          🌋 Where Earth Quaked
        </span>
        {data && (
          <span style={SF} className="text-[8px] opacity-70 tabular-nums">
            {data.total} in 24h
          </span>
        )}
      </div>
      <div className={theme.bg}>
        {loading && (
          <p className={`text-[9px] p-3 text-center ${theme.mutedClass}`} style={SF}>Reading the seismographs…</p>
        )}
        {!loading && !data && (
          <p className={`text-[9px] p-3 text-center ${theme.mutedClass}`} style={SF}>Seismic wire unavailable.</p>
        )}
        {data && (
          <>
            {data.largest.map((q, i) => (
              <button
                key={`${q.time}-${i}`}
                onClick={() => { try { void sdk.actions.openUrl(q.url); } catch { window.open(q.url, '_blank'); } }}
                className={`w-full flex items-baseline gap-2 px-2 py-[5px] text-left active:opacity-60 ${
                  i > 0 ? `border-t ${theme.borderLight}` : ''
                }`}
              >
                <span
                  className="font-black tabular-nums shrink-0"
                  style={{ ...SERIF, fontSize: magSize(q.mag) }}
                >
                  {q.mag.toFixed(1)}
                </span>
                <span className="flex-1 min-w-0 text-[9px] leading-tight truncate" style={SERIF}>
                  {q.place}
                </span>
                {q.tsunami && (
                  <span className="text-[7px] font-black uppercase tracking-widest shrink-0" style={{ ...SF, color: '#b91c1c' }}>
                    Tsunami
                  </span>
                )}
              </button>
            ))}
            <p className={`text-[7px] px-2 py-1 border-t ${theme.borderLight} ${theme.mutedClass}`} style={SF}>
              {data.felt.toLocaleString()} of {data.total.toLocaleString()} strong enough to feel · USGS
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const WIDGET_COMPONENTS: Record<WidgetId, React.ComponentType> = {
  weather: WeatherWidget,
  cat: CatWidget,
  anilist: AniListWidget,
  book: BookWidget,
  color: ColorWidget,
  agify: AgifyWidget,
  art: ArtWidget,
  quakes: QuakeWidget,
};

export function WidgetPanel({ activeWidgets }: WidgetPanelProps) {
  const { theme } = useTheme();

  if (activeWidgets.length === 0) return null;

  return (
    <div className="space-y-1 mb-1">
      {/* Section header */}
      <div className={`border-2 ${theme.border}`}>
        <div className={`text-[9px] font-black uppercase tracking-[0.2em] border-b px-2 py-[3px] text-center ${theme.borderLight} ${theme.fill} ${theme.fillText}`} style={SF}>
          Today&apos;s Dispatches
        </div>
        <div className={`grid gap-0 ${activeWidgets.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {activeWidgets.map((id) => {
            const Widget = WIDGET_COMPONENTS[id];
            return (
              <div key={id} className={`border-r border-b last:border-r-0 ${theme.borderLight}`}>
                <Widget />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
