import { NextResponse } from "next/server";

const CALENDARIFIC_KEY = "7b5WtfF8M69x1oMwU7UGk1YvQNsILgj3";

// Rotating pool of names — one per day of the year (cycles)
const DAILY_NAMES = [
  "Alice","Bob","Charlie","David","Emma","Fiona","George","Hannah","Ivan","Julia",
  "Kevin","Laura","Michael","Nina","Oscar","Paula","Quinn","Rachel","Samuel","Tara",
  "Uma","Victor","Wendy","Xander","Yara","Zane","Aria","Blake","Clara","Dylan",
  "Elena","Felix","Grace","Henry","Iris","Jake","Kira","Liam","Mia","Noah",
];

function dailyName(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_NAMES[dayOfYear % DAILY_NAMES.length];
}

// Today's number (day of month) for Numbers API
function todayNumber(): number {
  return new Date().getDate();
}

// RoboHash seed — changes daily so users see a new robot each day
function dailyRoboSeed(): string {
  const d = new Date();
  return `tribune-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Fallback jokes — used if JokeAPI is down
const FALLBACK_JOKES = [
  "Yo momma so slow, she still loading from the last block.",
  "Yo momma so old, she knew Satoshi when he was just Satoshi Nakamoto Jr.",
  "Yo momma so extra, even her gas fees have gas fees.",
  "Yo momma so basic, her wallet address is just her name.",
  "Yo momma so late to mint, the floor price already moved on.",
  "Yo momma so big, when she casts on Farcaster the whole feed scrolls.",
  "Yo momma so slow, she's still waiting for her Ethereum transaction to confirm.",
  "Yo momma so gullible, she thought 'seed phrase' meant she was gardening.",
  "Yo momma so old, she remembers when Bitcoin was peer-reviewed.",
  "Yo momma so frugal, she bridges assets just to avoid paying for lunch.",
];

function randomFallbackJoke(): string {
  return FALLBACK_JOKES[Math.floor(Math.random() * FALLBACK_JOKES.length)];
}

// Local facts for each day of the month (1–31) — fallback when Numbers API is unreachable
const DAILY_NUMBER_FACTS: Record<number, string> = {
  1:  "1 is the only positive integer that is neither prime nor composite.",
  2:  "2 is the only even prime number in existence.",
  3:  "3 is the number of spatial dimensions we perceive in everyday life.",
  4:  "4 is the smallest composite number and the first perfect square after 1.",
  5:  "5 is a Fibonacci number and also a prime — a rare combo.",
  6:  "6 is the smallest perfect number: 1 + 2 + 3 = 6.",
  7:  "7 is consistently rated the world's favorite number in global surveys.",
  8:  "8 is the only cubic number that is one less than a perfect square (9).",
  9:  "9 is the largest single-digit number and the basis of many casting-out-nines tricks.",
  10: "10 is the base of our decimal number system, likely because humans have 10 fingers.",
  11: "11 is the smallest two-digit prime number and a repunit (11 = '11' in base 10).",
  12: "12 is a highly composite number with 6 divisors: 1, 2, 3, 4, 6, and 12.",
  13: "13 is considered unlucky in Western culture but lucky in many Asian traditions.",
  14: "14 is the number of lines in a Shakespearean sonnet.",
  15: "15 is the sum of the first 5 positive integers: 1+2+3+4+5.",
  16: "16 is the only number that is both a perfect square and a perfect fourth power.",
  17: "17 is the least random number — humans asked to pick one 'at random' choose 17 most often.",
  18: "18 is the only number where the sum of its digits equals half the number itself.",
  19: "19 is a prime number and also the atomic number of potassium.",
  20: "20 is the number of faces on an icosahedron, one of the five Platonic solids.",
  21: "21 is the sum of the first 6 natural numbers and a triangular number.",
  22: "22 divided by 7 is the classic approximation of pi (≈ 3.14285...).",
  23: "23 is the lowest prime that consists of consecutive digits: 2 and 3.",
  24: "24 is the number of hours in a day and the factorial of 4 (4! = 24).",
  25: "25 is the smallest perfect square that is the sum of two other perfect squares (9+16).",
  26: "26 is the only integer that sits between a perfect square (25) and a perfect cube (27).",
  27: "27 is 3 cubed (3³) and the atomic number of cobalt.",
  28: "28 is a perfect number: its proper divisors (1+2+4+7+14) sum to 28.",
  29: "29 is a prime number and the number of days in February during a leap year.",
  30: "30 is the largest number where all smaller coprime integers are also prime.",
  31: "31 is a Mersenne prime: 2⁵ − 1 = 31.",
};

/**
 * GET /api/page2-data
 *
 * Aggregates all Page 2 content in parallel:
 *   1. Yo Momma joke     — api.yomomma.info (+ local fallback bank)
 *   2. Useless fact      — uselessfacts.jsph.pl
 *   3. Farcaster stats   — /api/protocol-stats (internal, includes top-10 casts)
 *   4. Agify             — api.agify.io (daily rotating name)
 *   5. US holidays       — calendarific.com
 *   6. Number fact       — numbersapi.com (day-of-month trivia)
 *
 * RoboHash is client-only (URL construction) — seed returned here.
 */
export async function GET(req: Request) {
  const baseUrl = new URL(req.url).origin;
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const day   = now.getDate();
  const name  = dailyName();
  const num   = todayNumber();

  const [jokeRes, factRes, statsRes, agifyRes, holidayRes, numberRes] =
    await Promise.allSettled([
      // 1. Yo Momma via JokeAPI v2 (reliable, https, free)
      fetch("https://v2.jokeapi.dev/joke/Any?type=single&blacklistFlags=racist,sexist,explicit&contains=momma", {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(5000),
      }),
      // 2. Useless fact
      fetch("https://uselessfacts.jsph.pl/api/v2/facts/today?language=en", {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(5000),
      }),
      // 3. Farcaster live stats (internal)
      fetch(`${baseUrl}/api/protocol-stats`, {
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(10000),
      }),
      // 4. Agify — estimated age for daily name (free tier, no key needed)
      fetch(`https://api.agify.io?name=${encodeURIComponent(name)}`, {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(5000),
      }),
      // 5. Today's US holidays
      fetch(
        `https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_KEY}&country=US&year=${year}&month=${month}&day=${day}`,
        { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) },
      ),
      // 6. Numbers API — trivia about today's date number
      // Note: numbersapi.com blocks server-side requests; we try anyway and fall back to local bank
      fetch(`https://numbersapi.com/${num}/date?json`, {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(5000),
      }),
    ]);

  // ── Joke (JokeAPI v2) ─────────────────────────────────────────────────
  let joke: string | null = null;
  if (jokeRes.status === "fulfilled" && jokeRes.value.ok) {
    try {
      const d = await jokeRes.value.json();
      // JokeAPI v2 single-type returns { joke: "..." }
      // twopart type returns { setup, delivery } — join them
      if (d.joke) {
        joke = d.joke;
      } else if (d.setup && d.delivery) {
        joke = `${d.setup} ${d.delivery}`;
      }
    } catch { /* noop */ }
  }
  if (!joke) joke = randomFallbackJoke();

  // ── Fact ──────────────────────────────────────────────────────────────
  let fact: string | null = null;
  if (factRes.status === "fulfilled" && factRes.value.ok) {
    try {
      const d = await factRes.value.json();
      fact = d.text ?? d.fact ?? null;
    } catch { /* noop */ }
  }

  // ── Farcaster stats (includes top10Casts) ─────────────────────────────
  let farcasterStats: Record<string, unknown> | null = null;
  if (statsRes.status === "fulfilled" && statsRes.value.ok) {
    try { farcasterStats = await statsRes.value.json(); } catch { /* noop */ }
  }

  // ── Agify ─────────────────────────────────────────────────────────────
  let agify: { name: string; age: number | null; count: number } | null = null;
  if (agifyRes.status === "fulfilled" && agifyRes.value.ok) {
    try { agify = await agifyRes.value.json(); } catch { /* noop */ }
  }
  // Ensure name always matches our daily pick even if API returns differently
  if (agify) agify.name = name;

  // ── Holidays ──────────────────────────────────────────────────────────
  let holidays: { name: string; description: string; type: string[] }[] = [];
  if (holidayRes.status === "fulfilled" && holidayRes.value.ok) {
    try {
      const d = await holidayRes.value.json();
      holidays = (d?.response?.holidays ?? []).map((h: {
        name: string; description: string; type: string[];
      }) => ({ name: h.name, description: h.description, type: h.type }));
    } catch { /* noop */ }
  }

  // ── Number fact ───────────────────────────────────────────────────────
  let numberFact: { text: string; number: number } | null = null;
  if (numberRes.status === "fulfilled" && numberRes.value.ok) {
    try {
      const d = await numberRes.value.json();
      // numbersapi returns { text, number, found, type }
      if (d.found !== false && d.text) {
        numberFact = { text: d.text, number: d.number ?? num };
      }
    } catch { /* noop */ }
  }
  // Fall back to curated local bank (numbersapi.com blocks many server environments)
  if (!numberFact) {
    numberFact = {
      text: DAILY_NUMBER_FACTS[num] ?? `${num} is today's date — a fine number by any measure.`,
      number: num,
    };
  }

  return NextResponse.json({
    joke,
    fact,
    farcasterStats,
    agify,
    holidays,
    numberFact,
    roboSeed: dailyRoboSeed(),
    generatedAt: new Date().toISOString(),
  });
}
