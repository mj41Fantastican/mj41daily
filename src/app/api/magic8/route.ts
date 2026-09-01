import { NextRequest, NextResponse } from 'next/server';

const POSITIVE = [
  'It is certain.',
  'It is decidedly so.',
  'Without a doubt.',
  'Yes, definitely.',
  'You may rely on it.',
  'As I see it, yes.',
  'Most likely.',
  'Outlook good.',
  'Yes.',
  'Signs point to yes.',
];

const NEUTRAL = [
  'Reply hazy, try again.',
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  'Concentrate and ask again.',
];

const NEGATIVE = [
  "Don't count on it.",
  'My reply is no.',
  'My sources say no.',
  'Outlook not so good.',
  'Very doubtful.',
];

const ALL = [...POSITIVE, ...NEUTRAL, ...NEGATIVE];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Naive sentiment analysis — counts positive vs negative word matches.
 * Returns a score: positive = good, negative = bad, 0 = neutral.
 */
function scoreSentiment(question: string): number {
  const pos = ['will', 'can', 'succeed', 'win', 'yes', 'good', 'happy', 'love', 'great', 'best', 'achieve', 'get', 'find', 'help', 'work', 'pass', 'grow'];
  const neg = ['fail', 'lose', 'bad', 'never', 'no', 'not', 'wrong', 'quit', 'stop', 'hate', 'worst', 'terrible', 'broken', 'dead'];
  const words = question.toLowerCase().split(/\W+/);
  let score = 0;
  for (const w of words) {
    if (pos.includes(w)) score++;
    if (neg.includes(w)) score--;
  }
  return score;
}

/**
 * GET /api/magic8
 * Query params:
 *   question (optional) — biased response based on sentiment
 *   lucky    (optional) — always pick a positive if true
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const question = searchParams.get('question');
  const lucky    = searchParams.get('lucky') === 'true';

  if (lucky) {
    return NextResponse.json({ reading: rand(POSITIVE) });
  }

  if (question && question.trim()) {
    const score = scoreSentiment(question);
    let pool: string[];
    if (score > 0)       pool = POSITIVE;
    else if (score < 0)  pool = NEGATIVE;
    else                 pool = ALL;

    const reading = rand(pool);
    return NextResponse.json({
      reading,
      question,
      sentiment: { score },
    });
  }

  // Random from all 20
  return NextResponse.json({ reading: rand(ALL) });
}
