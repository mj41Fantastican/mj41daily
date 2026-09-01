'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/features/app/theme-context';
import { usePaperSettings } from '@/hooks/use-paper-settings';
import { TIMEZONES, FALLBACK_OPTIONS, PAYWALL_CURRENCIES, THEMES } from '@/data/mocks';
import type { ThemeId } from '@/features/app/types';

const SF = { fontFamily: 'Arial,sans-serif' };
const SERIF = { fontFamily: 'Georgia,"Times New Roman",serif' };

function SectionHeader({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className={`px-2 py-1 border-b ${theme.borderLight} ${theme.fill} ${theme.fillText}`}>
      <p className="text-[9px] font-black uppercase tracking-widest" style={SF}>
        {children}
      </p>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  label,
  sub,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
}) {
  const { theme } = useTheme();
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-full flex justify-between items-center px-2 py-2 border min-h-[52px] ${theme.borderLight}`}
    >
      <div className="text-left">
        <p className="text-[10px] font-bold">{label}</p>
        {sub && <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>{sub}</p>}
      </div>
      <div
        className={`w-8 h-4 rounded-full border-2 flex items-center transition-all shrink-0 ml-2 ${
          value ? `${theme.fill} ${theme.border}` : theme.borderLight
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full bg-white border border-black/20 transition-all mx-[1px] ${
            value ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
}) {
  const { theme } = useTheme();
  return (
    <div>
      <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>
        {label}
      </label>
      <div className={`flex items-center border ${theme.borderLight}`}>
        {prefix && <span className={`px-2 text-[10px] ${theme.mutedClass}`}>{prefix}</span>}
        <input
          className={`flex-1 py-1 text-[10px] outline-none pr-2 ${prefix ? '' : 'px-2'} ${theme.bg} ${theme.text}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={SF}
        />
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const { theme, setThemeId } = useTheme();
  const { settings, isLoading, isSaving, save } = usePaperSettings();

  // Deadline
  const [deadlineHour, setDeadlineHour] = useState('12:00');
  const [timezone, setTimezone] = useState('UTC');
  // Fallback
  const [fallback, setFallback] = useState('auto');
  // Paywall
  const [readPrice, setReadPrice] = useState('0.01');
  const [mintPrice, setMintPrice] = useState('0.041');
  const [rwacRead, setRwacRead] = useState('4141');
  const [rwacMint, setRwacMint] = useState('41041');
  const [enabledCurrencies, setEnabledCurrencies] = useState<string[]>(['USDC', 'ETH', '$RWACu']);
  // Notifications
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);
  const [notifyDeadlineWarning, setNotifyDeadlineWarning] = useState(true);
  const [warningMinutes, setWarningMinutes] = useState('30');
  // Paper identity
  const [issuePrice, setIssuePrice] = useState('$0.041');
  const [tagline, setTagline] = useState("All the news that's fit to cast");
  const [editorHandle, setEditorHandle] = useState('@mj41fantastican');
  const [paperName, setPaperName] = useState('The Copper Wire: A Daily Miscellany');
  const [channelUrl, setChannelUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('dailyfarcaster.fc');
  // Editorial note
  const [editorialNoteEnabled, setEditorialNoteEnabled] = useState(false);
  const [editorialNote, setEditorialNote] = useState('');
  // Appearance
  const [colorScheme, setColorScheme] = useState<ThemeId>('bw');
  // Airdrop
  const [airdropDefault, setAirdropDefault] = useState(false);
  // UI
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Sync from DB
  useEffect(() => {
    if (!settings) return;
    setDeadlineHour(settings.deadlineHour ?? '12:00');
    setTimezone(settings.timezone ?? 'UTC');
    setFallback(settings.fallbackRule ?? 'auto');
    setReadPrice(settings.readPriceUsdc ?? '0.01');
    setMintPrice(settings.mintPriceUsdc ?? '0.041');
    setRwacRead(settings.rwacReadAmount ?? '4141');
    setRwacMint(settings.rwacMintAmount ?? '41041');
    setEnabledCurrencies((settings.enabledCurrencies ?? 'USDC,ETH,$RWACu').split(','));
    setNotifyOnPublish(settings.notifyOnPublish ?? true);
    setNotifyDeadlineWarning(settings.notifyDeadlineWarning ?? true);
    setWarningMinutes(String(settings.warningMinutes ?? 30));
    setIssuePrice(settings.coverPrice ?? '$0.041');
    setTagline(settings.tagline ?? "All the news that's fit to cast");
    setEditorHandle(settings.editorHandle ?? '@mj41fantastican');
    setPaperName(settings.paperName ?? 'The Daily Tribune');
    setChannelUrl(settings.channelUrl ?? '');
    setWebsiteUrl(settings.websiteUrl ?? 'dailyfarcaster.fc');
    setEditorialNoteEnabled(settings.editorialNoteEnabled ?? false);
    setEditorialNote(settings.editorialNote ?? '');
    const scheme = (settings.colorScheme ?? 'bw') as ThemeId;
    setColorScheme(scheme);
    if (THEMES[scheme]) setThemeId(scheme);
    setAirdropDefault(settings.airdropDefault ?? false);
  }, [settings, setThemeId]);

  function toggleCurrency(c: string) {
    setEnabledCurrencies((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function handleSave() {
    setSaved(false);
    setSaveError(false);

    // Ensure all DB columns exist before saving (idempotent)
    try { await fetch('/api/setup'); } catch { /* non-fatal */ }

    const ok = await save({
      deadlineHour,
      timezone,
      fallbackRule: fallback,
      readPriceUsdc: readPrice,
      mintPriceUsdc: mintPrice,
      rwacReadAmount: rwacRead,
      rwacMintAmount: rwacMint,
      enabledCurrencies: enabledCurrencies.join(','),
      notifyOnPublish,
      notifyDeadlineWarning,
      warningMinutes: Number(warningMinutes),
      coverPrice: issuePrice,
      tagline,
      editorHandle,
      paperName,
      channelUrl,
      websiteUrl,
      editorialNoteEnabled,
      editorialNote,
      colorScheme,
      airdropDefault,
    });

    if (ok) {
      // Confirm the theme is locked in via context (affects all pages immediately)
      setThemeId(colorScheme);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    }
  }

  if (isLoading) {
    return (
      <div className={`p-6 text-center ${theme.bg} ${theme.text}`}>
        <p className="text-[10px] opacity-50" style={SF}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto ${theme.bg} ${theme.text}`} style={SERIF}>
      <div className="px-2 py-2 space-y-2">

        {/* Header */}
        <div className={`border-2 p-2 flex justify-between items-center ${theme.border}`}>
          <p className="text-[11px] font-black uppercase tracking-widest" style={SF}>
            Paper Settings
          </p>
          <span className={`text-[9px] px-2 py-[2px] uppercase tracking-wide ${theme.fill} ${theme.fillText}`} style={SF}>
            Editor Only
          </span>
        </div>

        {/* ── PAPER IDENTITY ── */}
        <div className={`border-2 ${theme.border}`}>
          <SectionHeader>Paper Identity</SectionHeader>
          <div className={`p-2 space-y-2 ${theme.bg}`}>
            <TextInput label="Paper name" value={paperName} onChange={setPaperName} placeholder="The Copper Wire: A Daily Miscellany" />
            <TextInput label="Editor handle" value={editorHandle} onChange={setEditorHandle} placeholder="@mj41fantastican" />
            <TextInput label="Nameplate tagline" value={tagline} onChange={setTagline} placeholder="All the news that's fit to cast" />
            <TextInput label="Cover price (display only)" value={issuePrice} onChange={setIssuePrice} placeholder="$0.041" />
            <TextInput label="Website / domain" value={websiteUrl} onChange={setWebsiteUrl} placeholder="dailyfarcaster.fc" />
            <TextInput label="Farcaster channel (e.g. /tribune)" value={channelUrl} onChange={setChannelUrl} placeholder="/tribune" />
          </div>
        </div>

        {/* ── EDITORIAL NOTE ── */}
        <div className={`border-2 ${theme.border}`}>
          <SectionHeader>Editorial Note</SectionHeader>
          <div className={`p-2 space-y-2 ${theme.bg}`}>
            <Toggle
              value={editorialNoteEnabled}
              onChange={setEditorialNoteEnabled}
              label="Show editorial note in nameplate"
              sub="A short message from the editor shown below the masthead"
            />
            {editorialNoteEnabled && (
              <div>
                <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>
                  Note text
                </label>
                <textarea
                  className={`w-full border px-2 py-1 text-[10px] outline-none resize-none ${theme.borderLight} ${theme.bg} ${theme.text}`}
                  rows={3}
                  value={editorialNote}
                  onChange={(e) => setEditorialNote(e.target.value)}
                  placeholder="A note from the editor..."
                  style={SF}
                />
                <p className={`text-[8px] mt-1 ${theme.mutedClass}`} style={SF}>
                  {editorialNote.length} / 200 chars
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── DEADLINE ── */}
        <div className={`border-2 ${theme.border}`}>
          <SectionHeader>Auto-Publish Deadline</SectionHeader>
          <div className={`p-2 space-y-3 ${theme.bg}`}>
            <p className={`text-[9px] leading-snug ${theme.mutedClass}`} style={SF}>
              If you haven&apos;t manually published by this time, the fallback rule fires automatically.
            </p>
            <div>
              <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>
                Deadline time
              </label>
              <div className="grid grid-cols-4 gap-1">
                {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'].map((h) => (
                  <button
                    key={h}
                    onClick={() => setDeadlineHour(h)}
                    className={`py-1 text-[10px] border text-center transition-all min-h-[36px] ${
                      deadlineHour === h
                        ? `${theme.fill} ${theme.fillText} ${theme.border} font-bold`
                        : `${theme.borderLight} ${theme.text}`
                    }`}
                    style={SF}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>
                Timezone
              </label>
              <div className="space-y-1">
                {TIMEZONES.map((tz) => (
                  <button
                    key={tz.label}
                    onClick={() => setTimezone(tz.label)}
                    className={`w-full text-left px-2 py-[6px] flex justify-between items-center border transition-all min-h-[36px] ${
                      timezone === tz.label
                        ? `${theme.fill} ${theme.fillText} ${theme.border}`
                        : `${theme.borderLight} ${theme.text}`
                    }`}
                  >
                    <span className="text-[10px] font-bold">{tz.label}</span>
                    <span className={`text-[9px] ${timezone === tz.label ? 'opacity-60' : theme.mutedClass}`} style={SF}>
                      {tz.offset}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className={`border p-2 text-center ${theme.borderLight}`}>
              <p className={`text-[8px] uppercase tracking-widest mb-1 ${theme.mutedClass}`} style={SF}>
                Current deadline
              </p>
              <p className="text-[14px] font-black">{deadlineHour}</p>
              <p className={`text-[9px] ${theme.mutedClass}`} style={SF}>{timezone}</p>
            </div>
          </div>
        </div>

        {/* ── FALLBACK ── */}
        <div className={`border-2 ${theme.border}`}>
          <SectionHeader>Missed Deadline Fallback</SectionHeader>
          <div className={`p-2 space-y-1 ${theme.bg}`}>
            <p className={`text-[9px] leading-snug mb-2 ${theme.mutedClass}`} style={SF}>
              What happens if you miss the deadline without publishing.
            </p>
            {FALLBACK_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFallback(opt.id)}
                className={`w-full text-left px-2 py-2 flex gap-2 items-start border transition-all min-h-[44px] ${
                  fallback === opt.id
                    ? `${theme.fill} ${theme.fillText} ${theme.border}`
                    : `${theme.borderLight} ${theme.text}`
                }`}
              >
                <div
                  className={`mt-[3px] w-3 h-3 rounded-full border-2 shrink-0 ${
                    fallback === opt.id ? 'border-current bg-current opacity-70' : theme.borderLight
                  }`}
                />
                <div>
                  <p className="text-[10px] font-bold">{opt.label}</p>
                  <p className={`text-[9px] mt-[1px] ${fallback === opt.id ? 'opacity-70' : theme.mutedClass}`} style={SF}>
                    {opt.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── PAYWALL ── */}
        <div className={`border-2 ${theme.border}`}>
          <SectionHeader>Paywall Pricing</SectionHeader>
          <div className={`p-2 space-y-3 ${theme.bg}`}>
            <div>
              <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>
                Accepted currencies
              </label>
              <div className="flex gap-1">
                {PAYWALL_CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCurrency(c)}
                    className={`flex-1 py-1 text-[10px] border font-bold text-center transition-all min-h-[36px] ${
                      enabledCurrencies.includes(c)
                        ? `${theme.fill} ${theme.fillText} ${theme.border}`
                        : `${theme.borderLight} ${theme.mutedClass}`
                    }`}
                    style={SF}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TextInput label="Read fee (USDC/ETH $)" value={readPrice} onChange={setReadPrice} prefix="$" />
              <TextInput label="Mint price (USDC/ETH $)" value={mintPrice} onChange={setMintPrice} prefix="$" />
            </div>
            {enabledCurrencies.includes('$RWACu') && (
              <div className="grid grid-cols-2 gap-2">
                <TextInput label="$RWACu read amount" value={rwacRead} onChange={setRwacRead} />
                <TextInput label="$RWACu mint amount" value={rwacMint} onChange={setRwacMint} />
              </div>
            )}
            <div className={`border border-dashed p-2 ${theme.borderLight}`}>
              <p className={`text-[8px] uppercase tracking-widest mb-1 ${theme.mutedClass}`} style={SF}>
                Paywall summary
              </p>
              <p className="text-[9px]">
                Read: <span className="font-bold">${readPrice} USDC/ETH</span>
                {enabledCurrencies.includes('$RWACu') ? ` · ${Number(rwacRead).toLocaleString()} $RWACu` : ''}
              </p>
              <p className="text-[9px]">
                Mint: <span className="font-bold">${mintPrice} USDC/ETH</span>
                {enabledCurrencies.includes('$RWACu') ? ` · ${Number(rwacMint).toLocaleString()} $RWACu` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* ── AIRDROP ── */}
        <div className={`border-2 ${theme.border}`}>
          <SectionHeader>Airdrop</SectionHeader>
          <div className={`p-2 ${theme.bg}`}>
            <Toggle
              value={airdropDefault}
              onChange={setAirdropDefault}
              label="Enable airdrop by default on new issues"
              sub="Every paying reader's wallet address is added to the airdrop whitelist"
            />
            {airdropDefault && (
              <p className={`text-[9px] mt-2 px-1 ${theme.mutedClass}`} style={SF}>
                When enabled, reader and mint payments automatically whitelist the buyer's wallet. You can override this per-issue in the Editor tab.
              </p>
            )}
          </div>
        </div>

        {/* ── NOTIFICATIONS ── */}
        <div className={`border-2 ${theme.border}`}>
          <SectionHeader>Notifications</SectionHeader>
          <div className={`p-2 space-y-2 ${theme.bg}`}>
            <Toggle
              value={notifyOnPublish}
              onChange={setNotifyOnPublish}
              label="Notify when issue publishes"
              sub="Farcaster notification when issue goes live"
            />
            <Toggle
              value={notifyDeadlineWarning}
              onChange={setNotifyDeadlineWarning}
              label="Deadline warning reminder"
              sub="Alert before auto-publish fires"
            />
            {notifyDeadlineWarning && (
              <div>
                <label className={`text-[8px] uppercase tracking-widest block mb-1 ${theme.mutedClass}`} style={SF}>
                  Warn me _ minutes before deadline
                </label>
                <div className="flex gap-1">
                  {['15', '30', '60', '120'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setWarningMinutes(m)}
                      className={`flex-1 py-1 text-[10px] border text-center min-h-[36px] ${
                        warningMinutes === m
                          ? `${theme.fill} ${theme.fillText} ${theme.border} font-bold`
                          : `${theme.borderLight} ${theme.text}`
                      }`}
                      style={SF}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save */}
        <div className="pb-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 text-[11px] font-black uppercase tracking-widest min-h-[52px] transition-all disabled:opacity-50"
            style={{
              ...SF,
              background: saveError ? '#7f1d1d' : saved ? '#14532d' : '#000000',
              color: '#ffffff',
            }}
          >
            {isSaving
              ? '⏳ Saving…'
              : saved
                ? `✓ Saved — ${colorScheme.toUpperCase()} theme is now live`
                : saveError
                  ? '✗ Save failed — tap to retry'
                  : 'Save Settings'}
          </button>
          {saved && (
            <p className="text-[8px] text-center mt-1 text-green-700 font-bold" style={SF}>
              Color scheme applied to all pages. Readers will see it on their next load.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
