'use client';

import { createContext, useContext } from 'react';
import type { Theme, ThemeId } from '@/features/app/types';
import { THEMES } from '@/data/mocks';

interface ThemeContextValue {
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES.bw,
  setThemeId: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
