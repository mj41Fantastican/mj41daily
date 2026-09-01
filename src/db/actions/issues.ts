"use server";

import { db } from "@/neynar-db-sdk/db";
import { issues, readerAccess, issueMints } from "@/db/schema";
import { desc, eq, lte, and } from "drizzle-orm";
import type { MidStory, Brief, Teaser, ArticleSource, TrackerToken } from "@/features/app/types";

export type IssueRow = typeof issues.$inferSelect;

/**
 * Get the most recently published issue (current issue).
 */
export async function getCurrentIssue(): Promise<IssueRow | null> {
  try {
    const results = await db
      .select()
      .from(issues)
      .where(eq(issues.status, "published"))
      .orderBy(desc(issues.publishedAt))
      .limit(1);
    return results[0] ?? null;
  } catch (error) {
    console.error("Failed to get current issue:", error);
    return null;
  }
}

/**
 * Get a specific issue by ID.
 */
export async function getIssueById(id: number): Promise<IssueRow | null> {
  try {
    const results = await db.select().from(issues).where(eq(issues.id, id)).limit(1);
    return results[0] ?? null;
  } catch (error) {
    console.error("Failed to get issue by id:", error);
    return null;
  }
}

/**
 * List all issues ordered by most recent first.
 */
export async function listIssues(): Promise<IssueRow[]> {
  try {
    return await db
      .select()
      .from(issues)
      .where(eq(issues.status, "published"))
      .orderBy(desc(issues.publishedAt));
  } catch (error) {
    console.error("Failed to list issues:", error);
    return [];
  }
}

/**
 * Get stats for a specific issue (mints + reader count).
 */
export async function getIssueStats(issueId: number) {
  try {
    const [accessRows, mintRows] = await Promise.all([
      db.select().from(readerAccess).where(eq(readerAccess.issueId, issueId)),
      db.select().from(issueMints).where(eq(issueMints.issueId, issueId)),
    ]);
    const readers = accessRows.filter((r) => r.accessType === "read").length;
    const mints = mintRows.length;
    // Revenue: read × $0.01 + mint × $0.041
    const revenue = readers * 0.01 + mints * 0.041;
    return { readers, mints, revenue: `$${revenue.toFixed(2)}` };
  } catch (error) {
    console.error("Failed to get issue stats:", error);
    return { readers: 0, mints: 0, revenue: "$0.00" };
  }
}

/**
 * Publish a new issue. Assembles all content fields and inserts.
 */
export async function publishIssue(data: {
  issueNumber: number;
  vol: number;
  date: string;
  autoPublished: boolean;
  leadHeadline: string;
  leadByline: string;
  leadBody: string;
  leadSources?: ArticleSource[];
  secondaryLeftLabel: string;
  secondaryLeftHeadline: string;
  secondaryLeftSummary: string;
  secondaryLeftSources?: ArticleSource[];
  secondaryRightLabel: string;
  secondaryRightHeadline: string;
  secondaryRightSummary: string;
  secondaryRightSources?: ArticleSource[];
  midStories: MidStory[];
  briefs: Brief[];
  teasers: Teaser[];
  trackerTokens?: TrackerToken[];
  airdropEnabled?: boolean;
  price?: string;
  editor?: string;
  editorialNote?: string;
  editorByline?: string;
}) {
  try {
    const result = await db
      .insert(issues)
      .values({
        issueNumber: data.issueNumber,
        vol: data.vol,
        date: data.date,
        autoPublished: data.autoPublished,
        leadHeadline: data.leadHeadline,
        leadByline: data.leadByline,
        leadBody: data.leadBody,
        leadSourcesJson: data.leadSources ? JSON.stringify(data.leadSources) : null,
        secondaryLeftLabel: data.secondaryLeftLabel,
        secondaryLeftHeadline: data.secondaryLeftHeadline,
        secondaryLeftSummary: data.secondaryLeftSummary,
        secondaryLeftSourcesJson: data.secondaryLeftSources ? JSON.stringify(data.secondaryLeftSources) : null,
        secondaryRightLabel: data.secondaryRightLabel,
        secondaryRightHeadline: data.secondaryRightHeadline,
        secondaryRightSummary: data.secondaryRightSummary,
        secondaryRightSourcesJson: data.secondaryRightSources ? JSON.stringify(data.secondaryRightSources) : null,
        midStoriesJson: JSON.stringify(data.midStories),
        briefsJson: JSON.stringify(data.briefs),
        teasersJson: JSON.stringify(data.teasers),
        trackerTokensJson: data.trackerTokens ? JSON.stringify(data.trackerTokens) : null,
        airdropEnabled: data.airdropEnabled ?? false,
        price: data.price ?? "$0.041",
        editor: data.editor ?? "@mj41fantastican",
        editorialNote: data.editorialNote ?? null,
        editorByline: data.editorByline ?? null,
      })
      .returning();
    return { success: true, issue: result[0] };
  } catch (error) {
    console.error("Failed to publish issue:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Schedule an issue for future publication.
 * Same as publishIssue but sets status='scheduled' and scheduledFor timestamp.
 */
export async function scheduleIssue(data: Parameters<typeof publishIssue>[0] & { scheduledFor: Date }) {
  try {
    const result = await db
      .insert(issues)
      .values({
        issueNumber: data.issueNumber,
        vol: data.vol,
        date: data.date,
        autoPublished: false,
        leadHeadline: data.leadHeadline,
        leadByline: data.leadByline,
        leadBody: data.leadBody,
        secondaryLeftLabel: data.secondaryLeftLabel,
        secondaryLeftHeadline: data.secondaryLeftHeadline,
        secondaryLeftSummary: data.secondaryLeftSummary,
        secondaryRightLabel: data.secondaryRightLabel,
        secondaryRightHeadline: data.secondaryRightHeadline,
        secondaryRightSummary: data.secondaryRightSummary,
        leadSourcesJson: data.leadSources ? JSON.stringify(data.leadSources) : null,
        secondaryLeftSourcesJson: data.secondaryLeftSources ? JSON.stringify(data.secondaryLeftSources) : null,
        secondaryRightSourcesJson: data.secondaryRightSources ? JSON.stringify(data.secondaryRightSources) : null,
        midStoriesJson: JSON.stringify(data.midStories),
        briefsJson: JSON.stringify(data.briefs),
        teasersJson: JSON.stringify(data.teasers),
        trackerTokensJson: data.trackerTokens ? JSON.stringify(data.trackerTokens) : null,
        price: data.price ?? "$0.041",
        editor: data.editor ?? "@mj41fantastican",
        editorialNote: data.editorialNote ?? null,
        editorByline: data.editorByline ?? null,
        status: "scheduled",
        scheduledFor: data.scheduledFor,
      })
      .returning();
    return { success: true, issue: result[0] };
  } catch (error) {
    console.error("Failed to schedule issue:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get all scheduled (not yet published) issues.
 */
export async function getScheduledIssues() {
  try {
    return await db
      .select()
      .from(issues)
      .where(eq(issues.status, "scheduled"))
      .orderBy(issues.scheduledFor);
  } catch (error) {
    console.error("Failed to get scheduled issues:", error);
    return [];
  }
}

/**
 * Publish all scheduled issues whose scheduledFor time has passed.
 * Called by the cron job.
 */
export async function publishDueIssues(): Promise<{ published: number }> {
  try {
    const now = new Date();
    const due = await db
      .select()
      .from(issues)
      .where(and(eq(issues.status, "scheduled"), lte(issues.scheduledFor, now)));

    if (due.length === 0) return { published: 0 };

    await Promise.all(
      due.map((issue) =>
        db.update(issues).set({ status: "published" }).where(eq(issues.id, issue.id))
      )
    );
    return { published: due.length };
  } catch (error) {
    console.error("Failed to publish due issues:", error);
    return { published: 0 };
  }
}

/**
 * Cancel a scheduled issue (delete it).
 */
export async function cancelScheduledIssue(id: number): Promise<{ success: boolean }> {
  try {
    await db.delete(issues).where(and(eq(issues.id, id), eq(issues.status, "scheduled")));
    return { success: true };
  } catch (error) {
    console.error("Failed to cancel scheduled issue:", error);
    return { success: false };
  }
}

/**
 * Delete all issues (dev/testing only — resets archive to zero).
 */
export async function deleteAllIssues(): Promise<{ success: boolean }> {
  try {
    await db.delete(issues);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete all issues:", error);
    return { success: false };
  }
}

/**
 * Get the next issue number (last issue number + 1).
 */
export async function getNextIssueNumber(): Promise<number> {
  try {
    const results = await db
      .select()
      .from(issues)
      .orderBy(desc(issues.issueNumber))
      .limit(1);
    return (results[0]?.issueNumber ?? 1) + 1;
  } catch (error) {
    console.error("Failed to get next issue number:", error);
    return 2;
  }
}
