"use client";

import { useState, useEffect } from "react";
import { getCurrentIssue, type IssueRow } from "@/db/actions/issues";
import type { MainStory, SecondaryStory, MidStory, Brief, Teaser, IssueMetadata, ArticleSource, TrackerToken } from "@/features/app/types";
import {
  MOCK_ISSUE,
  MOCK_MAIN_STORY,
  MOCK_SECONDARY_LEFT,
  MOCK_SECONDARY_RIGHT,
  MOCK_MID_STORIES,
  MOCK_BRIEFS,
  MOCK_TEASERS,
} from "@/data/mocks";

export type CurrentIssueData = {
  metadata: IssueMetadata;
  mainStory: MainStory;
  secondaryLeft: SecondaryStory;
  secondaryRight: SecondaryStory;
  midStories: MidStory[];
  briefs: Brief[];
  teasers: Teaser[];
  trackerTokens: TrackerToken[];
  issueId: number | null;
  isLoading: boolean;
  editorialNote: string | null;
  editorByline: string | null;
  leadSources: ArticleSource[];
  secondaryLeftSources: ArticleSource[];
  secondaryRightSources: ArticleSource[];
};

function rowToIssueData(row: IssueRow): CurrentIssueData {
  return {
    metadata: {
      version: row.version ?? "v2",
      editor: row.editor ?? "@mj41fantastican",
      issueNumber: `Issue #${row.issueNumber}`,
      vol: `Vol. ${row.vol}`,
      date: row.date,
      price: row.price ?? "$0.041",
      website: row.website ?? "dailyfarcaster.fc",
    },
    mainStory: {
      headline: row.leadHeadline ?? MOCK_MAIN_STORY.headline,
      byline: row.leadByline ?? MOCK_MAIN_STORY.byline,
      body: row.leadBody ?? MOCK_MAIN_STORY.body,
    },
    secondaryLeft: {
      label: row.secondaryLeftLabel ?? MOCK_SECONDARY_LEFT.label,
      headline: row.secondaryLeftHeadline ?? MOCK_SECONDARY_LEFT.headline,
      summary: row.secondaryLeftSummary ?? MOCK_SECONDARY_LEFT.summary,
    },
    secondaryRight: {
      label: row.secondaryRightLabel ?? MOCK_SECONDARY_RIGHT.label,
      headline: row.secondaryRightHeadline ?? MOCK_SECONDARY_RIGHT.headline,
      summary: row.secondaryRightSummary ?? MOCK_SECONDARY_RIGHT.summary,
    },
    midStories: row.midStoriesJson ? JSON.parse(row.midStoriesJson) : MOCK_MID_STORIES,
    briefs: row.briefsJson ? JSON.parse(row.briefsJson) : MOCK_BRIEFS,
    teasers: row.teasersJson ? JSON.parse(row.teasersJson) : MOCK_TEASERS,
    trackerTokens: row.trackerTokensJson ? JSON.parse(row.trackerTokensJson) : [],
    issueId: row.id,
    isLoading: false,
    editorialNote: row.editorialNote ?? null,
    editorByline: row.editorByline ?? null,
    leadSources: row.leadSourcesJson ? JSON.parse(row.leadSourcesJson) : [],
    secondaryLeftSources: row.secondaryLeftSourcesJson ? JSON.parse(row.secondaryLeftSourcesJson) : [],
    secondaryRightSources: row.secondaryRightSourcesJson ? JSON.parse(row.secondaryRightSourcesJson) : [],
  };
}

// Always use today's date for the fallback so it never shows a stale date
const todayLong = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

const FALLBACK: CurrentIssueData = {
  metadata: { ...MOCK_ISSUE, date: todayLong },
  mainStory: MOCK_MAIN_STORY,
  secondaryLeft: MOCK_SECONDARY_LEFT,
  secondaryRight: MOCK_SECONDARY_RIGHT,
  midStories: MOCK_MID_STORIES,
  briefs: MOCK_BRIEFS,
  teasers: MOCK_TEASERS,
  trackerTokens: [],
  issueId: null,
  isLoading: false,
  editorialNote: null,
  editorByline: null,
  leadSources: [],
  secondaryLeftSources: [],
  secondaryRightSources: [],
};

/**
 * Fetches the current (most recently published) issue from the DB.
 * Falls back to mock data if no issue exists yet.
 */
export function useCurrentIssue(): CurrentIssueData {
  const [data, setData] = useState<CurrentIssueData>({ ...FALLBACK, isLoading: true });

  useEffect(() => {
    getCurrentIssue()
      .then((row) => {
        if (row) {
          setData(rowToIssueData(row));
        } else {
          setData(FALLBACK);
        }
      })
      .catch(() => setData(FALLBACK));
  }, []);

  return data;
}
