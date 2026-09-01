"use client";

import { useState, useEffect, useCallback } from "react";
import { getSettings, saveSettings, type PaperSettingsRow } from "@/db/actions/settings";

export type UsePaperSettings = {
  settings: PaperSettingsRow | null;
  isLoading: boolean;
  isSaving: boolean;
  save: (data: Partial<Omit<PaperSettingsRow, "id" | "updatedAt">>) => Promise<boolean>;
};

/**
 * Loads paper settings from DB and provides a save function.
 */
export function usePaperSettings(): UsePaperSettings {
  const [settings, setSettings] = useState<PaperSettingsRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings(s);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const save = useCallback(
    async (data: Partial<Omit<PaperSettingsRow, "id" | "updatedAt">>) => {
      setIsSaving(true);
      const result = await saveSettings(data);
      if (result.success) {
        setSettings((prev) => (prev ? { ...prev, ...data } : null));
      }
      setIsSaving(false);
      return result.success;
    },
    [],
  );

  return { settings, isLoading, isSaving, save };
}
