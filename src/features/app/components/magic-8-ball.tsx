'use client';

import { useState, useRef } from 'react';
import { useTheme } from '@/features/app/theme-context';

const SF = { fontFamily: 'Arial,sans-serif' };
const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };

// Sentiment detection for category colouring
function getSentiment(reading: string): 'positive' | 'negative' | 'neutral' {
  const pos = ['certain', 'decidedly', 'without a doubt', 'yes', 'definitely', 'rely on it',
               'good', 'signs point', 'outlook good'];
  const neg = ["don't count", "my reply is no", "outlook not", "very doubtful", "sources say no",
               "cannot predict", "doubtful"];
  const r = reading.toLowerCase();
  if (pos.some((p) => r.includes(p))) return 'positive';
  if (neg.some((p) => r.includes(p))) return 'negative';
  return 'neutral';
}

const SENTIMENT_STYLE = {
  positive: { color: '#15803d', label: '✦ FAVOURABLE', border: '#16a34a' },
  negative: { color: '#b91c1c', label: '✦ UNFAVOURABLE', border: '#dc2626' },
  neutral:  { color: '#78350f', label: '✦ UNCLEAR', border: '#92400e' },
};

type Stage = 'idle' | 'shaking' | 'revealed';

export function Magic8Ball() {
  const { theme } = useTheme();
  const [question, setQuestion] = useState('');
  const [reading, setReading] = useState<string | null>(null);
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const [stage, setStage] = useState<Stage>('idle');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function consult() {
    if (stage === 'revealed') {
      // Reset for another question
      setReading(null);
      setStage('idle');
      setQuestion('');
      inputRef.current?.focus();
      return;
    }

    if (!question.trim() && stage === 'idle') {
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setStage('shaking');

    try {
      const params = new URLSearchParams({ question: question.trim() });
      const res = await fetch(`/api/magic8?${params}`);
      const data = await res.json();
      const r: string = data.reading ?? 'Reply hazy, try again.';

      // Small delay for drama
      await new Promise((resolve) => setTimeout(resolve, 900));

      setReading(r);
      setSentiment(getSentiment(r));
      setStage('revealed');
    } catch {
      setReading('Reply hazy, try again.');
      setSentiment('neutral');
      setStage('revealed');
    } finally {
      setLoading(false);
    }
  }

  const sentStyle = SENTIMENT_STYLE[sentiment];

  return (
    <div className={`border-2 mb-4 overflow-hidden ${theme.border}`}>
      {/* Sponsored header */}
      <div className={`px-2 py-[5px] border-b flex items-center justify-between ${theme.borderLight}`}
           style={{ background: '#000', color: '#fff' }}>
        <p className="text-[8px] uppercase tracking-[0.3em]" style={SF}>
          Brought to you free by $RWACu
        </p>
        <p className="text-[8px] uppercase tracking-[0.2em] opacity-60" style={SF}>
          SPONSORED
        </p>
      </div>

      {/* Section title */}
      <div className={`px-2 py-2 text-center border-b ${theme.borderLight}`}>
        <p className="text-[20px] font-black uppercase tracking-tight leading-none" style={SERIF}>
          The Magic 8-Ball Oracle
        </p>
        <p className={`text-[8px] uppercase tracking-[0.2em] mt-1 ${theme.mutedClass}`} style={SF}>
          Ask the oracle · Receive the truth
        </p>
      </div>

      <div className="p-3">
        {/* The Ball */}
        <div className="flex justify-center mb-4">
          <div
            className={`relative flex items-center justify-center transition-transform duration-100 ${
              stage === 'shaking' ? 'animate-bounce' : ''
            }`}
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 35%, #444 0%, #111 55%, #000 100%)',
              boxShadow: '0 6px 32px rgba(0,0,0,0.5), inset 0 2px 6px rgba(255,255,255,0.08)',
            }}
          >
            {/* Specular highlight */}
            <div style={{
              position: 'absolute', top: 22, left: 30,
              width: 36, height: 20, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)', transform: 'rotate(-20deg)',
            }} />

            {/* Inner window */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: stage === 'revealed'
                ? 'radial-gradient(circle at 40% 35%, #1e3a5f 0%, #0a1628 100%)'
                : 'radial-gradient(circle at 40% 35%, #1a1a2e 0%, #0d0d1a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 8, textAlign: 'center',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
              transition: 'background 0.5s',
            }}>
              {stage === 'idle' && (
                <span style={{ fontSize: 28, color: '#fff', fontFamily: 'Georgia,serif', fontWeight: 900 }}>8</span>
              )}
              {stage === 'shaking' && (
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: 'Arial,sans-serif',
                               textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.3 }}>
                  Consulting…
                </span>
              )}
              {stage === 'revealed' && reading && (
                <span style={{ fontSize: 8, color: '#e8d8b0', fontFamily: 'Georgia,serif',
                               fontStyle: 'italic', lineHeight: 1.3, textAlign: 'center' }}>
                  {reading}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reading verdict */}
        {stage === 'revealed' && reading && (
          <div className="mb-3 text-center"
               style={{ border: `1px solid ${sentStyle.border}`, padding: '8px 12px' }}>
            <p className="text-[8px] uppercase tracking-[0.3em] mb-1"
               style={{ ...SF, color: sentStyle.color }}>{sentStyle.label}</p>
            <p className="text-[13px] font-black leading-tight" style={SERIF}>&ldquo;{reading}&rdquo;</p>
          </div>
        )}

        {/* Question input */}
        {stage !== 'revealed' && (
          <div className={`mb-3 border ${theme.borderLight}`}>
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && consult()}
              placeholder="Ask your question…"
              disabled={stage === 'shaking'}
              className={`w-full px-3 py-2 text-[11px] bg-transparent outline-none ${theme.text}`}
              style={SERIF}
              maxLength={200}
            />
          </div>
        )}

        {/* CTA button */}
        <button
          onClick={consult}
          disabled={loading || stage === 'shaking'}
          className="w-full py-3 text-[10px] font-black uppercase tracking-widest min-h-[44px] transition-opacity disabled:opacity-50"
          style={{ ...SF, background: '#000', color: '#fff' }}
        >
          {stage === 'revealed'
            ? '↺ Ask Another Question'
            : stage === 'shaking'
              ? 'Consulting the Oracle…'
              : 'Consult the Oracle'}
        </button>

        {/* Sponsor footnote */}
        <p className={`text-[7px] text-center mt-2 ${theme.mutedClass}`} style={SF}>
          Sponsored by{' '}
          <span className="font-black">$RWACu</span>{' '}
          · 0x184f5aacdbb3e482ce6e5e4a7075500e589a5e68
        </p>
      </div>
    </div>
  );
}
