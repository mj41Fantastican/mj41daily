/**
 * The paper's identity — one source of truth.
 *
 * Before this file the name was hardcoded in at least five places and the paper
 * answered to five different names at once: "The Copper Wire Miscellany" in the
 * Farcaster listing, "The Copper Wire" on the nameplate, "The Daily Miscellany"
 * on page two, "The Daily Farcaster Tribune" on every NFT, and "The Daily
 * Tribune" in the settings row.
 *
 * Nothing should hardcode the name again. Read it from paper settings, fall back
 * to the defaults here, and let `parseMasthead` work out how to set it.
 */

export const PAPER = {
  /** Full title. The part after the colon becomes the subtitle rule. */
  name: "The Daily Miscellany: A Compendium Of Interesting Things",
  tagline: "All the news that's fit to cast",
  editorHandle: "@mj41fantastican",
  publisher: "An MJ41 Publication",
  established: "EST. 2026",
  domain: "mj41daily.com",
} as const;

export type Masthead = {
  /** Small wide-tracked line above the name, e.g. "THE". Empty if the name has no article. */
  article: string;
  /** One or two dominant lines, uppercased. */
  lines: string[];
  /** The rule beneath the name. Empty if the title had no colon. */
  subtitle: string;
};

/**
 * Turns a paper name into a broadsheet nameplate.
 *
 *   "The Daily Miscellany: A Compendium Of Interesting Things"
 *     → article "THE", lines ["DAILY", "MISCELLANY"],
 *       subtitle "A COMPENDIUM OF INTERESTING THINGS"
 *
 *   "The Copper Wire"  → "THE" / ["COPPER", "WIRE"]
 *   "Miscellany"       → ""    / ["MISCELLANY"]
 *
 * Two dominant lines is the ceiling. A name with more words than that gets
 * balanced across the two lines rather than shrinking to illegibility.
 */
export function parseMasthead(fullName: string): Masthead {
  const [rawName = "", ...rest] = fullName.split(":");
  const subtitle = rest.join(":").trim().toUpperCase();

  const words = rawName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { article: "", lines: [""], subtitle };

  // A leading article rides above the name in small caps, as broadsheets set it.
  let article = "";
  if (words.length > 1 && /^(the|a|an)$/i.test(words[0])) {
    article = words.shift()!.toUpperCase();
  }

  const upper = words.map((w) => w.toUpperCase());
  if (upper.length <= 1) return { article, lines: upper, subtitle };
  if (upper.length === 2) return { article, lines: upper, subtitle };

  // Three or more words: split where the two halves come closest in length.
  let bestAt = 1;
  let bestGap = Infinity;
  for (let i = 1; i < upper.length; i++) {
    const a = upper.slice(0, i).join(" ").length;
    const b = upper.slice(i).join(" ").length;
    const gap = Math.abs(a - b);
    if (gap < bestGap) {
      bestGap = gap;
      bestAt = i;
    }
  }
  return {
    article,
    lines: [upper.slice(0, bestAt).join(" "), upper.slice(bestAt).join(" ")],
    subtitle,
  };
}

/**
 * Font size for a nameplate line, in rem.
 *
 * The nameplate has roughly 400px of usable width on a 424px mini-app viewport.
 * A heavy serif capital averages about 0.62em wide, so a line of n characters
 * needs about n * 0.62 * fontSize. Solve for the size that fills the width and
 * clamp it so short names don't become billboards and long ones stay readable.
 */
export function mastheadFontSize(line: string): number {
  const AVAILABLE_PX = 400;
  const CAP_WIDTH_RATIO = 0.62;
  const ROOT_PX = 16;
  const chars = Math.max(line.length, 1);
  const rem = AVAILABLE_PX / (chars * CAP_WIDTH_RATIO) / ROOT_PX;
  return Math.max(1.1, Math.min(2.6, Number(rem.toFixed(2))));
}

/**
 * Letter-spacing for a nameplate line, in em.
 *
 * Short lines are tracked out so both decks of the nameplate optically fill the
 * same width — the treatment that made "COPPER / WIRE" read as one wordmark.
 */
export function mastheadTracking(line: string, longest: number): string {
  if (line.length >= longest || line.length === 0) return "-0.01em";
  const slack = (longest - line.length) / line.length;
  return `${Math.min(0.3, slack * 0.55).toFixed(3)}em`;
}
