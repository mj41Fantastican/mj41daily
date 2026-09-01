import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/widgets?type=weather|cat|anilist|book|color|agify|art|serp
 *
 * Proxy for all 8 front-page widget APIs. Single endpoint, type-dispatched.
 * All responses return { ok: true, data: ... } or { ok: false, error: string }
 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');

  try {
    switch (type) {

      // ── NOAA Weather ─────────────────────────────────────────────────────────
      // Uses National Weather Service public API (no key required)
      // Returns current conditions for a random US office for editorial fun
      case 'weather': {
        const city = req.nextUrl.searchParams.get('city') ?? 'New York';
        // Use NWS gridpoints API via geocode fallback to Open-Meteo (no key needed)
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
          { signal: AbortSignal.timeout(6000) }
        );
        const geoData = await geoRes.json();
        const loc = geoData?.results?.[0];
        if (!loc) return NextResponse.json({ ok: false, error: 'City not found' });

        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m&temperature_unit=fahrenheit&wind_speed_unit=mph`,
          { signal: AbortSignal.timeout(6000) }
        );
        const wxData = await wxRes.json();
        const c = wxData?.current;
        if (!c) return NextResponse.json({ ok: false, error: 'Weather unavailable' });

        // WMO weather codes → description
        const wmoDesc: Record<number, string> = {
          0:'Clear skies', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
          45:'Foggy', 48:'Icy fog', 51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
          61:'Light rain', 63:'Rain', 65:'Heavy rain', 71:'Light snow', 73:'Snow', 75:'Heavy snow',
          80:'Rain showers', 81:'Rain showers', 82:'Violent rain showers',
          95:'Thunderstorm', 96:'Thunderstorm w/hail', 99:'Thunderstorm w/heavy hail',
        };

        return NextResponse.json({
          ok: true,
          data: {
            city: loc.name,
            country: loc.country_code,
            tempF: Math.round(c.temperature_2m),
            tempC: Math.round((c.temperature_2m - 32) * 5/9),
            humidity: c.relative_humidity_2m,
            windMph: Math.round(c.wind_speed_10m),
            condition: wmoDesc[c.weather_code] ?? `Code ${c.weather_code}`,
            code: c.weather_code,
          },
        });
      }

      // ── Cat as a Service ─────────────────────────────────────────────────────
      // CATAAS: https://cataas.com/cat — returns a random cat image
      case 'cat': {
        const tag = req.nextUrl.searchParams.get('tag') ?? '';
        const tagPath = tag ? `/cat/${encodeURIComponent(tag)}` : '/cat';
        // We can't stream the image here; return the direct URL for client to load
        const url = `https://cataas.com${tagPath}?t=${Date.now()}`;
        return NextResponse.json({ ok: true, data: { imageUrl: url, tag: tag || 'random' } });
      }

      // ── AniList Birthday Characters ──────────────────────────────────────────
      case 'anilist': {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        // Helper to shape a raw AniList character node
        type AniChar = {
          name: { full: string; native?: string };
          image: { medium: string };
          description?: string;
          media: { nodes: Array<{ title: { romaji: string; english?: string }; type: string }> };
        };
        function shapeChar(c: AniChar) {
          return {
            name: c.name.full,
            nativeName: c.name.native,
            imageUrl: c.image.medium,
            description: c.description?.replace(/<[^>]+>/g, '').slice(0, 200),
            media: c.media?.nodes?.[0]?.title?.english ?? c.media?.nodes?.[0]?.title?.romaji ?? null,
            mediaType: c.media?.nodes?.[0]?.type ?? null,
          };
        }

        // Step 1 — try birthday query
        const birthdayQuery = `
          query ($month: Int, $day: Int) {
            Page(page: 1, perPage: 8) {
              characters(birthday: { month: $month, day: $day }, sort: FAVOURITES_DESC) {
                name { full native }
                image { medium }
                description(asHtml: false)
                media(sort: POPULARITY_DESC, perPage: 1) {
                  nodes { title { romaji english } type }
                }
              }
            }
          }
        `;

        const birthdayRes = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ query: birthdayQuery, variables: { month, day } }),
          signal: AbortSignal.timeout(8000),
        });
        const birthdayData = await birthdayRes.json();
        const birthdayChars: AniChar[] = birthdayData?.data?.Page?.characters ?? [];

        if (birthdayChars.length > 0) {
          return NextResponse.json({
            ok: true,
            data: {
              month, day,
              isBirthday: true,
              characters: birthdayChars.slice(0, 4).map(shapeChar),
            },
          });
        }

        // Step 2 — no birthdays today: fetch a random popular character seeded by date
        const dateSeed = today.getFullYear() * 10000 + month * 100 + day;
        const randomPage = 1 + (dateSeed % 20); // pages 1-20 of popular characters

        const randomQuery = `
          query ($page: Int) {
            Page(page: $page, perPage: 10) {
              characters(sort: FAVOURITES_DESC) {
                name { full native }
                image { medium }
                description(asHtml: false)
                media(sort: POPULARITY_DESC, perPage: 1) {
                  nodes { title { romaji english } type }
                }
              }
            }
          }
        `;

        const randomRes = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ query: randomQuery, variables: { page: randomPage } }),
          signal: AbortSignal.timeout(8000),
        });
        const randomData = await randomRes.json();
        const pool: AniChar[] = randomData?.data?.Page?.characters ?? [];

        // Pick one deterministically from the pool, then return up to 4 from that page
        const startIdx = (dateSeed * 3) % Math.max(pool.length, 1);
        const featured = pool.slice(startIdx, startIdx + 4);
        const chars = featured.length > 0 ? featured : pool.slice(0, 4);

        return NextResponse.json({
          ok: true,
          data: {
            month, day,
            isBirthday: false,
            characters: chars.map(shapeChar),
          },
        });
      }

      // ── Open Library / Big Book API ──────────────────────────────────────────
      case 'book': {
        const q = req.nextUrl.searchParams.get('q');
        if (q) {
          // Search mode
          const res = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5&fields=key,title,author_name,first_publish_year,cover_i`,
            { signal: AbortSignal.timeout(8000) }
          );
          const data = await res.json();
          const books = (data?.docs ?? []).map((b: {
            key: string; title: string; author_name?: string[]; first_publish_year?: number; cover_i?: number;
          }) => ({
            key: b.key,
            title: b.title,
            author: b.author_name?.[0] ?? 'Unknown',
            year: b.first_publish_year ?? null,
            coverUrl: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
          }));
          return NextResponse.json({ ok: true, data: { results: books, query: q } });
        } else {
          // Daily book — seeded by day of year so it changes daily
          const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
          const DAILY_QUERIES = [
            'philosophy', 'science fiction', 'history', 'mathematics', 'poetry',
            'architecture', 'psychology', 'mystery', 'nature', 'biography',
            'economics', 'art', 'music', 'technology', 'adventure',
          ];
          const subject = DAILY_QUERIES[doy % DAILY_QUERIES.length];
          const res = await fetch(
            `https://openlibrary.org/search.json?subject=${encodeURIComponent(subject)}&limit=10&fields=key,title,author_name,first_publish_year,cover_i&sort=rating`,
            { signal: AbortSignal.timeout(8000) }
          );
          const data = await res.json();
          const docs = data?.docs ?? [];
          const pick = docs[(doy * 7) % Math.max(docs.length, 1)];
          if (!pick) return NextResponse.json({ ok: false, error: 'No book found' });
          return NextResponse.json({
            ok: true,
            data: {
              daily: true,
              subject,
              title: pick.title,
              author: pick.author_name?.[0] ?? 'Unknown',
              year: pick.first_publish_year ?? null,
              coverUrl: pick.cover_i ? `https://covers.openlibrary.org/b/id/${pick.cover_i}-M.jpg` : null,
              key: pick.key,
            },
          });
        }
      }

      // ── The Color API ────────────────────────────────────────────────────────
      case 'color': {
        // Generate a daily color seeded by date
        const today2 = new Date();
        const seed = today2.getFullYear() * 10000 + (today2.getMonth()+1) * 100 + today2.getDate();
        // Simple deterministic HSL from seed
        const h = (seed * 137) % 360;
        const s = 60 + (seed % 30);
        const l = 40 + (seed % 20);
        const hex = hslToHex(h, s, l);

        const res = await fetch(
          `https://www.thecolorapi.com/id?hex=${hex.slice(1)}&format=json`,
          { signal: AbortSignal.timeout(6000) }
        );
        const data = await res.json();
        return NextResponse.json({
          ok: true,
          data: {
            name: data?.name?.value ?? 'Daily Color',
            hex: data?.hex?.value ?? `#${hex}`,
            rgb: data?.rgb?.value ?? `rgb(${h},${s},${l})`,
            hsl: data?.hsl?.value ?? `hsl(${h},${s}%,${l}%)`,
            nearest_named: data?.name?.closest_named_hex ?? hex,
            image: `https://www.thecolorapi.com/id?hex=${hex.slice(1)}&format=svg`,
          },
        });
      }

      // ── Agify Name-to-Age ─────────────────────────────────────────────────────
      case 'agify': {
        const name = req.nextUrl.searchParams.get('name');
        if (!name) return NextResponse.json({ ok: false, error: 'name param required' });
        const res = await fetch(
          `https://api.agify.io?name=${encodeURIComponent(name)}`,
          { signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();
        return NextResponse.json({
          ok: true,
          data: {
            name: data.name,
            age: data.age ?? null,
            count: data.count ?? null,
          },
        });
      }

      // ── Art Institute of Chicago ─────────────────────────────────────────────
      case 'art': {
        // Daily artwork — seed by day
        const today3 = new Date();
        const artSeed = today3.getFullYear() * 10000 + (today3.getMonth()+1) * 100 + today3.getDate();
        const page = 1 + (artSeed % 40); // pages 1-40 of results

        const res = await fetch(
          `https://api.artic.edu/api/v1/artworks?fields=id,title,artist_display,date_display,medium_display,image_id,place_of_origin,dimensions&limit=10&page=${page}`,
          { signal: AbortSignal.timeout(8000) }
        );
        const data = await res.json();
        const artworks = data?.data ?? [];
        const pick = artworks[(artSeed * 3) % Math.max(artworks.length, 1)];
        if (!pick) return NextResponse.json({ ok: false, error: 'Artwork unavailable' });

        const imageUrl = pick.image_id
          ? `https://www.artic.edu/iiif/2/${pick.image_id}/full/400,/0/default.jpg`
          : null;

        return NextResponse.json({
          ok: true,
          data: {
            title: pick.title,
            artist: pick.artist_display,
            date: pick.date_display,
            medium: pick.medium_display,
            origin: pick.place_of_origin,
            dimensions: pick.dimensions,
            imageUrl,
            artUrl: `https://www.artic.edu/artworks/${pick.id}`,
          },
        });
      }

      // ── SERP / Google Rankings ────────────────────────────────────────────────
      // Note: Real SERP data requires a paid key (ValueSERP, SerpAPI, etc.).
      // We return a placeholder with instructions + a direct Google link.
      case 'serp': {
        const keyword = req.nextUrl.searchParams.get('q');
        if (!keyword) return NextResponse.json({ ok: false, error: 'q param required' });
        // Return Google search link + note about SERP key
        return NextResponse.json({
          ok: true,
          data: {
            keyword,
            googleUrl: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`,
            note: 'Live SERP rank data requires a SerpAPI or ValueSERP key. Set SERP_API_KEY in .env to enable.',
            results: [],
          },
        });
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown widget type: ${type}` }, { status: 400 });
    }
  } catch (err) {
    console.error(`[widgets/${type}] error:`, err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
