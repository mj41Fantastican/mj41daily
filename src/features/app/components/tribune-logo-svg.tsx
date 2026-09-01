'use client';

import { useTheme } from '@/features/app/theme-context';

export function TribuneLogoSvg() {
  const { theme } = useTheme();
  const bg = theme.svgBg;
  const fg = theme.svgFg;
  const textFill = theme.svgText;

  // viewBox is 400 wide x 260 tall — gives COPPER/WIRE room to breathe
  return (
    <svg
      viewBox="0 0 400 260"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      {/* Background */}
      <rect width="400" height="260" fill={bg} />

      {/* Outer border rule */}
      <rect x="3" y="3" width="394" height="254" fill="none" stroke={fg} strokeWidth="4" />
      {/* Inner border rule */}
      <rect x="9" y="9" width="382" height="242" fill="none" stroke={fg} strokeWidth="1" />

      {/* Corner ornaments */}
      <polygon points="22,14 29,21 22,28 15,21" fill={fg} />
      <polygon points="378,14 385,21 378,28 371,21" fill={fg} />
      <polygon points="22,232 29,239 22,246 15,239" fill={fg} />
      <polygon points="378,232 385,239 378,246 371,239" fill={fg} />

      {/* Top rule pair */}
      <line x1="38" y1="26" x2="362" y2="26" stroke={fg} strokeWidth="2" />
      <line x1="38" y1="30" x2="362" y2="30" stroke={fg} strokeWidth="0.75" />

      {/* EST. line */}
      <text
        x="200" y="43"
        textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontSize="8.5" letterSpacing="2.5"
        fill={textFill}
      >
        EST. 2026  ✦  AN MJ41 PUBLICATION  ✦  v2
      </text>

      {/* Rule pair below EST. */}
      <line x1="38" y1="50" x2="362" y2="50" stroke={fg} strokeWidth="0.75" />
      <line x1="38" y1="54" x2="362" y2="54" stroke={fg} strokeWidth="2" />

      {/* ── NAMEPLATE: three stacked words with generous spacing ── */}

      {/* THE — smaller, wide letter-spacing */}
      <text
        x="200" y="95"
        textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontSize="30" fontWeight="900"
        fill={textFill} letterSpacing="18"
      >
        THE
      </text>

      {/* COPPER — dominant, sized to fit 400px wide with margin */}
      <text
        x="200" y="147"
        textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontSize="48" fontWeight="900"
        fill={textFill} letterSpacing="4"
      >
        COPPER
      </text>

      {/* WIRE — same scale as COPPER, wide letter-spacing to fill width */}
      <text
        x="200" y="196"
        textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontSize="48" fontWeight="900"
        fill={textFill} letterSpacing="22"
      >
        WIRE
      </text>

      {/* Mid rule pair */}
      <line x1="38" y1="206" x2="362" y2="206" stroke={fg} strokeWidth="2" />
      <line x1="38" y1="210" x2="362" y2="210" stroke={fg} strokeWidth="0.75" />

      {/* A DAILY MISCELLANY */}
      <text
        x="200" y="228"
        textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontSize="13" fontWeight="700"
        fill={textFill} letterSpacing="5"
      >
        A DAILY MISCELLANY
      </text>

      {/* Bottom rule pair */}
      <line x1="38" y1="235" x2="362" y2="235" stroke={fg} strokeWidth="0.75" />
      <line x1="38" y1="239" x2="362" y2="239" stroke={fg} strokeWidth="2" />

      {/* Tagline */}
      <text
        x="200" y="252"
        textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontSize="7" letterSpacing="2"
        fill={textFill} opacity="0.55"
      >
        &quot;ALL THE NEWS THAT&apos;S FIT TO CAST&quot;
      </text>
    </svg>
  );
}
