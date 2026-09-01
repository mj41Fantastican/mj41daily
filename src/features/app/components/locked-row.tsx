'use client';

import { useTheme } from '@/features/app/theme-context';

const SF = { fontFamily: 'Arial, sans-serif' };

export function LockedRow({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="relative mb-1 select-none">
      <div style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`text-[9px] uppercase tracking-widest px-3 py-1 ${theme.fill} ${theme.fillText}`}
          style={SF}
        >
          🔒 Unlock to read
        </span>
      </div>
    </div>
  );
}
