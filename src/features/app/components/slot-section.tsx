'use client';

import { useState } from 'react';
import { useTheme } from '@/features/app/theme-context';
import type { Slot, WriteInContent } from '@/features/app/types';

const SF = { fontFamily: 'Arial,sans-serif' };

interface SlotSectionProps {
  slot: Slot;
  label: string;
  filled: boolean;
  writeInMode: boolean;
  writeIn?: WriteInContent;
  onToggleWriteIn: () => void;
  onWriteInChange: (field: 'headline' | 'body' | 'byline', val: string) => void;
  children: React.ReactNode;
  showWriteFirst?: boolean;
}

export function SlotSection({
  label,
  filled,
  writeInMode,
  writeIn,
  onToggleWriteIn,
  onWriteInChange,
  children,
  showWriteFirst,
}: SlotSectionProps) {
  const { theme } = useTheme();
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  async function handleAiGenerate() {
    if (!writeIn?.headline) {
      setAiError('Add a headline first, then generate the story.');
      return;
    }
    setAiGenerating(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'story-body',
          context: {
            headline: writeIn.headline,
            byline: writeIn.byline ?? 'Staff Reporter',
          },
        }),
      });
      const data = await res.json();
      if (data.body) {
        onWriteInChange('body', data.body);
      } else {
        setAiError(data.error ?? 'Generation failed — try again');
      }
    } catch {
      setAiError('Generation failed — check connection');
    } finally {
      setAiGenerating(false);
    }
  }

  return (
    <div className={`border-2 mb-2 ${theme.border}`}>
      {/* Header */}
      <div
        className={`px-2 py-1 border-b flex justify-between items-center ${theme.borderLight} ${
          filled ? `${theme.fill} ${theme.fillText}` : `${theme.bg} ${theme.text}`
        }`}
      >
        <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
          {label} {filled ? '✓' : '*'}
        </p>
        <button
          onClick={onToggleWriteIn}
          className={`text-[8px] px-2 py-[2px] border uppercase tracking-wide transition-all min-h-[28px] ${
            writeInMode
              ? filled
                ? 'border-current opacity-60'
                : `${theme.border} ${theme.fill} ${theme.fillText}`
              : filled
              ? 'border-current opacity-40'
              : `${theme.borderLight} ${theme.mutedClass}`
          }`}
          style={SF}
        >
          {writeInMode ? '← Pick list' : '✏️ Write in'}
        </button>
      </div>

      {writeInMode ? (
        /* Write-in form */
        <div className={`p-2 space-y-2 ${theme.bg}`}>
          {/* Headline */}
          <div>
            <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>
              Headline *
            </label>
            <input
              className={`w-full border px-2 py-2 text-[11px] outline-none min-h-[44px] ${theme.borderLight} ${theme.bg} ${theme.text}`}
              placeholder="Write your headline..."
              value={writeIn?.headline ?? ''}
              onChange={(e) => onWriteInChange('headline', e.target.value)}
              style={SF}
            />
          </div>

          {/* Author / Byline */}
          <div>
            <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>
              Author / Byline
            </label>
            <input
              className={`w-full border px-2 py-2 text-[11px] outline-none min-h-[44px] ${theme.borderLight} ${theme.bg} ${theme.text}`}
              placeholder="By Jane Smith  or  Staff Reporter"
              value={writeIn?.byline ?? ''}
              onChange={(e) => onWriteInChange('byline', e.target.value)}
              style={SF}
            />
          </div>

          {/* Story body + AI generate */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-[8px] uppercase tracking-widest ${theme.mutedClass}`} style={SF}>
                Story body *
              </label>
              <button
                onClick={handleAiGenerate}
                disabled={aiGenerating || !writeIn?.headline}
                className={`text-[8px] px-2 py-[3px] border font-bold uppercase tracking-wide min-h-[24px] transition-all disabled:opacity-40 ${
                  aiGenerating
                    ? `${theme.borderLight} ${theme.mutedClass}`
                    : `border-purple-500 text-purple-600 bg-purple-50 hover:bg-purple-100`
                }`}
                style={SF}
              >
                {aiGenerating ? '⏳ Writing…' : '✨ AI Generate'}
              </button>
            </div>
            <textarea
              className={`w-full border px-2 py-2 text-[10px] outline-none resize-none leading-relaxed ${theme.borderLight} ${theme.bg} ${theme.text}`}
              rows={6}
              placeholder="Write the full story here — or hit ✨ AI Generate to auto-write from your headline."
              value={writeIn?.body ?? ''}
              onChange={(e) => onWriteInChange('body', e.target.value)}
              style={SF}
            />
            {aiError && <p className="text-[9px] text-red-500 mt-1" style={SF}>{aiError}</p>}
          </div>

          {writeIn?.headline && writeIn?.body && (
            <p className="text-[9px] text-green-600 font-bold" style={SF}>
              ✓ Write-in ready
            </p>
          )}
        </div>
      ) : (
        /* Pick list */
        <div className={`divide-y ${theme.borderLight} ${theme.bg}`}>
          {showWriteFirst && (
            <button
              onClick={onToggleWriteIn}
              className={`w-full px-2 py-2 text-[9px] font-bold uppercase tracking-wide text-left min-h-[36px] active:opacity-70 ${theme.mutedClass}`}
              style={SF}
            >
              ✏️ Write original article instead →
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
