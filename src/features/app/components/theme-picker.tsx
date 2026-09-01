'use client';

import { useState } from 'react';
import { useTheme } from '@/features/app/theme-context';
import { THEMES } from '@/data/mocks';
import type { ThemeId } from '@/features/app/types';

const SF = { fontFamily: 'Arial,sans-serif' };

export function ThemePicker() {
  const { theme, setThemeId } = useTheme();
  const [open, setOpen] = useState(false);

  function handleSelect(id: ThemeId) {
    setThemeId(id);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`text-[9px] px-2 py-[3px] border uppercase tracking-widest transition-all ${theme.border} ${theme.text}`}
        style={SF}
        title="Change newspaper aesthetic"
      >
        🎨 {theme.emoji}
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full mt-1 z-50 border-2 shadow-lg min-w-[160px] ${theme.bg} ${theme.border}`}
        >
          <div
            className={`px-2 py-[3px] border-b text-[8px] uppercase tracking-widest ${theme.borderLight} ${theme.mutedClass} ${theme.text}`}
            style={SF}
          >
            Aesthetic
          </div>
          {Object.values(THEMES).map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={`w-full flex items-center gap-2 px-2 py-[7px] text-left transition-all ${
                theme.id === t.id
                  ? `${theme.fill} ${theme.fillText}`
                  : `${theme.text} ${theme.bg}`
              }`}
              style={SF}
            >
              <span>{t.emoji}</span>
              <span className="text-[10px] font-bold">{t.name}</span>
              {theme.id === t.id && <span className="ml-auto text-[9px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
