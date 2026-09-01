"use client";

import { useState, useEffect } from "react";
import { getLatestFeed } from "@/db/actions/feed";
import { MOCK_FEED } from "@/data/mocks";
import type { MockFeed } from "@/features/app/types";

/**
 * Fetches the latest daily feed data from the DB.
 * Falls back to MOCK_FEED if no data exists yet.
 */
export function useDailyFeed(): {
  feed: MockFeed;
  onChainInsight: { text: string; difficulty: "expert" | "novice" } | null;
  isLoading: boolean;
} {
  const [feed, setFeed] = useState<MockFeed>(MOCK_FEED);
  const [onChainInsight, setOnChainInsight] = useState<{ text: string; difficulty: "expert" | "novice" } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getLatestFeed()
      .then((parsed) => {
        if (parsed) {
          setFeed({
            deadline: parsed.deadline,
            timeLeft: parsed.timeLeft,
            autoSelectsIn: parsed.timeLeft,
            trendingCasts: parsed.trendingCasts,
            topChannels: parsed.topChannels,
            topTokens: parsed.topTokens,
            newMiniApps: parsed.newMiniApps,
            networkStats: parsed.networkStats,
            newsCategories: parsed.newsCategories,
          });
          setOnChainInsight(parsed.onChainInsight ?? null);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return { feed, onChainInsight, isLoading };
}
