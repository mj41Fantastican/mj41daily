"use client";

import { useState, useEffect } from "react";
import { listIssues, getIssueStats } from "@/db/actions/issues";
import { getUserAccessList } from "@/db/actions/access";
import type { ArchiveIssue } from "@/features/app/types";
import { useViewer } from "@/hooks/use-viewer";

export type ArchiveData = {
  issues: ArchiveIssue[];
  totalMints: number;
  totalRevenue: string;
  unlockedIssueIds: number[];
  isLoading: boolean;
};

/**
 * Fetches the full issue archive from DB with stats and user access status.
 * Falls back to mock data if DB is empty.
 */
export function useArchive(): ArchiveData {
  const viewer = useViewer();
  const [data, setData] = useState<ArchiveData>({
    issues: [],
    totalMints: 0,
    totalRevenue: "$0.00",
    unlockedIssueIds: [],
    isLoading: true,
  });

  useEffect(() => {
    async function load() {
      try {
        const [rows, accessIds] = await Promise.all([
          listIssues(),
          viewer.address || viewer.fid
            ? getUserAccessList({ walletAddress: viewer.address, fid: viewer.fid })
            : Promise.resolve([] as number[]),
        ]);

        if (rows.length === 0) {
          // No issues published yet — show empty state
          setData({
            issues: [],
            totalMints: 0,
            totalRevenue: "$0.00",
            unlockedIssueIds: [],
            isLoading: false,
          });
          return;
        }

        // Fetch stats for all issues in parallel
        const statsArr = await Promise.all(rows.map((r) => getIssueStats(r.id)));

        const archiveIssues: ArchiveIssue[] = rows.map((row, idx) => ({
          issue: row.issueNumber,
          vol: row.vol,
          date: row.date,
          price: row.price ?? "$0.041",
          lead: row.leadHeadline ?? "",
          secondary: [
            row.secondaryLeftHeadline ?? "",
            row.secondaryRightHeadline ?? "",
          ],
          mints: statsArr[idx].mints,
          readers: statsArr[idx].readers,
          revenue: statsArr[idx].revenue,
          autoPublished: row.autoPublished ?? false,
        }));

        const totalMints = archiveIssues.reduce((s, i) => s + i.mints, 0);
        const totalRevenue =
          "$" +
          archiveIssues
            .reduce((s, i) => s + parseFloat(i.revenue.replace("$", "")), 0)
            .toFixed(2);

        setData({
          issues: archiveIssues,
          totalMints,
          totalRevenue,
          unlockedIssueIds: accessIds,
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to load archive:", error);
        setData((prev) => ({ ...prev, isLoading: false }));
      }
    }

    load();
  }, [viewer.address, viewer.fid]);

  return data;
}
