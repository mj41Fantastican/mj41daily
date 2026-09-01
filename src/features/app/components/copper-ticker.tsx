'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/features/app/theme-context';

const SF = { fontFamily: 'Arial,sans-serif' };

interface CopperPrice {
  label: string;
  price: number;
  unit: string;
  timestamp?: number;
  contract: string;
}

interface CopperData {
  ok: boolean;
  fetchedAt: string;
  prices: {
    A: CopperPrice;
    B: CopperPrice;
    C: CopperPrice;
  };
}

function fmt(price: number) {
  return `$${price.toFixed(2)}`;
}

export function CopperTicker() {
  const { theme } = useTheme();
  const [data, setData] = useState<CopperData | null>(null);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/copper-prices', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: CopperData) => { if (d.ok) setData(d); else setError(true); })
      .catch(() => setError(true));
  }, []);

  // Build ticker items — 3 oracles repeated for seamless loop
  const items = data
    ? [
        { key: 'A', label: 'Cu-A COMEX', price: fmt(data.prices.A.price), unit: '/lb' },
        { key: 'B', label: 'Cu-B SCRAP',  price: fmt(data.prices.B.price), unit: '/lb' },
        { key: 'C', label: 'Cu-C INDUS',  price: fmt(data.prices.C.price), unit: '/lb' },
      ]
    : null;

  // Don't render anything while loading or on error (silent degradation)
  if (!items || error) return null;

  // Duplicate items for seamless CSS scroll loop
  const doubled = [...items, ...items, ...items];

  const tickerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0',
    animation: 'copper-ticker-scroll 22s linear infinite',
    whiteSpace: 'nowrap',
  };

  // Resolve theme ink color from Tailwind class to a real CSS value
  // theme.text is something like "text-black" or "text-white" or "text-[#2c1a0e]"
  const inkColor = theme.svgFg ?? '#000000';
  const paperBg  = theme.svgBg ?? '#ffffff';

  return (
    <>
      <style>{`
        @keyframes copper-ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .copper-ticker-wrap:hover .copper-ticker-inner {
          animation-play-state: paused;
        }
      `}</style>

      <div
        className={`copper-ticker-wrap overflow-hidden border-y ${theme.borderLight}`}
        style={{ background: paperBg }}
      >
        <div className="flex items-stretch">

          {/* COPPER badge — always copper-brown on white, high contrast */}
          <div
            className="shrink-0 px-2 flex items-center border-r"
            style={{
              ...SF,
              background: '#b87333',
              color: '#ffffff',
              borderColor: '#8b5a2b',
              fontSize: 8,
              fontWeight: 900,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            COPPER
          </div>

          {/* Scrolling prices */}
          <div className="flex-1 overflow-hidden py-[4px]" ref={scrollRef}>
            <div className="copper-ticker-inner flex" style={tickerStyle}>
              {doubled.map((item, i) => (
                <span
                  key={`${item.key}-${i}`}
                  className="inline-flex items-center gap-[5px] px-4"
                  style={SF}
                >
                  {/* Label in copper */}
                  <span style={{ color: '#b87333', fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {item.label}
                  </span>
                  {/* Price in theme ink — always readable */}
                  <span style={{ color: inkColor, fontSize: 10, fontWeight: 900 }}>
                    {item.price}
                  </span>
                  <span style={{ color: inkColor, fontSize: 7, opacity: 0.5 }}>{item.unit}</span>
                  <span style={{ color: inkColor, opacity: 0.2, marginLeft: 6 }}>·</span>
                </span>
              ))}
            </div>
          </div>

          {/* ON-CHAIN badge */}
          <div
            className="shrink-0 px-2 flex items-center border-l"
            style={{
              ...SF,
              color: '#b87333',
              borderColor: '#b87333',
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            ON-CHAIN
          </div>

        </div>
      </div>
    </>
  );
}
