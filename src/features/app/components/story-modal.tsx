'use client';

import sdk from '@farcaster/miniapp-sdk';
import { useTheme } from '@/features/app/theme-context';

const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };
const SF = { fontFamily: 'Arial,sans-serif' };

interface ArticleSource {
  label: string;
  url: string;
}

interface StoryModalProps {
  label?: string;
  headline: string;
  byline?: string;
  body: string;
  sources?: ArticleSource[];
  onClose: () => void;
}

export function StoryModal({ label, headline, byline, body, sources, onClose }: StoryModalProps) {
  const { theme } = useTheme();

  const openUrl = (url: string) => {
    try {
      sdk.actions.openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={SERIF}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal panel — slides up from bottom */}
      <div
        className={`relative mt-auto rounded-t-2xl shadow-2xl flex flex-col ${theme.bg} ${theme.text}`}
        style={{ maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className={`flex items-start justify-between px-4 pt-4 pb-3 border-b ${theme.borderLight}`}>
          <div className="flex-1 pr-3">
            {label && (
              <div
                className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${theme.mutedClass}`}
                style={SF}
              >
                {label}
              </div>
            )}
            <h2 className="text-[16px] font-black leading-tight uppercase">{headline}</h2>
            {byline && (
              <p className={`text-[10px] italic mt-1 ${theme.mutedClass}`} style={SF}>
                {byline}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${theme.fill} ${theme.fillText}`}
            style={SF}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Rule */}
        <div className={`h-[2px] ${theme.fill} opacity-80`} />

        {/* Body */}
        <div className="overflow-y-auto px-4 py-4">
          {body.split('\n\n').map((paragraph, i) => (
            <p
              key={i}
              className={`text-[13px] leading-relaxed mb-4 ${i === 0 ? 'font-medium' : ''}`}
            >
              {paragraph}
            </p>
          ))}

          {/* Further Reading */}
          {sources && sources.length > 0 && (
            <div className={`border-t pt-3 mt-1 ${theme.borderLight}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${theme.mutedClass}`} style={SF}>
                Further Reading
              </p>
              <div className="space-y-[6px]">
                {sources.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => openUrl(src.url)}
                    className={`w-full flex items-center gap-2 text-left active:opacity-70 transition-opacity`}
                  >
                    <span className={`text-[9px] shrink-0 ${theme.mutedClass}`} style={SF}>→</span>
                    <span className="text-[11px] font-bold underline underline-offset-2 leading-tight">
                      {src.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom padding for safe area */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
