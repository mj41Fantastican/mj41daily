'use client';

import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@neynar/ui';
import { ThemeContext } from '@/features/app/theme-context';
import { FrontPage } from '@/features/app/components/front-page';
import { CuratorDashboard } from '@/features/app/components/curator-dashboard';
import { MintArchive } from '@/features/app/components/mint-archive';
import { CollectiblesPanel } from '@/features/app/components/collectibles-panel';
import { PageTwo } from '@/features/app/components/page-two';
import { SportsPage } from '@/features/app/components/sports-page';
import { useIsEditor } from '@/hooks/use-is-editor';
import { THEMES } from '@/data/mocks';
import type { ThemeId } from '@/features/app/types';

export function MiniApp() {
  const [themeId, setThemeId] = useState<ThemeId>('bw');
  const theme = THEMES[themeId] ?? THEMES.bw;
  const { isEditor } = useIsEditor();
  const [activeTab, setActiveTab] = useState('front');
  const [collectiblesRefresh, setCollectiblesRefresh] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Load persisted color scheme via fresh API endpoint (no-store, bypasses Next.js cache).
  // After mount, setThemeId is driven directly by ThemeContext
  // (settings panel calls it immediately on every swatch tap).
  useEffect(() => {
    fetch('/api/theme', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { colorScheme?: string }) => {
        const id = (data.colorScheme ?? 'bw') as ThemeId;
        setThemeId(THEMES[id] ? id : 'bw');
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once — settings panel owns live updates via context

  function openCollectibles() {
    setCollectiblesRefresh((n) => n + 1);
    setActiveTab('collectibles');
  }

  // Tab text color — theme-aware. Terminal gets animated 8-bit rainbow.
  const isTerminal = themeId === 'terminal';
  const tabClass = isTerminal ? 'tribune-8bit-tab' : '';
  const tabStyle = isTerminal
    ? {} // color driven by CSS animation
    : { color: theme.svgFg ?? '#000000' };

  return (
    <ThemeContext.Provider value={{ theme, setThemeId }}>
      <div className={`h-dvh flex flex-col overflow-hidden ${theme.bg} ${theme.text}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList
            ref={tabsRef}
            className={`shrink-0 w-full justify-start rounded-none border-b overflow-x-auto ${theme.borderLight}`}
            style={{ fontFamily: 'Arial,sans-serif', background: theme.svgBg }}
          >
            <TabsTrigger value="front"        className={tabClass} style={tabStyle}>Front Page</TabsTrigger>
            {isEditor && <TabsTrigger value="editor"  className={tabClass} style={tabStyle}>Editor</TabsTrigger>}
            <TabsTrigger value="page2"        className={tabClass} style={tabStyle}>Page 2</TabsTrigger>
            <TabsTrigger value="archive"      className={tabClass} style={tabStyle}>Archive</TabsTrigger>
            <TabsTrigger value="sports"       className={tabClass} style={tabStyle}>Sports</TabsTrigger>
            <TabsTrigger value="collectibles" className={tabClass} style={tabStyle}>Collectibles</TabsTrigger>
          </TabsList>

          <TabsContent value="front" className="flex-1 overflow-y-auto mt-0 p-0">
            <FrontPage onCollectiblesOpen={openCollectibles} />
          </TabsContent>
          <TabsContent value="editor" className="flex-1 overflow-y-auto mt-0 p-0">
            <CuratorDashboard />
          </TabsContent>
          <TabsContent value="page2" className="flex-1 overflow-y-auto mt-0 p-0">
            <PageTwo />
          </TabsContent>
          <TabsContent value="archive" className="flex-1 overflow-y-auto mt-0 p-0">
            <MintArchive />
          </TabsContent>
          <TabsContent value="sports" className="flex-1 overflow-hidden mt-0 p-0">
            <SportsPage />
          </TabsContent>
          <TabsContent value="collectibles" className="flex-1 overflow-y-auto mt-0 p-0">
            <CollectiblesPanel refreshTrigger={collectiblesRefresh} />
          </TabsContent>
        </Tabs>
      </div>
    </ThemeContext.Provider>
  );
}
