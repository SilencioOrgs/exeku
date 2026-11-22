"use client";

import { useState } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { DEFAULT_APPEARANCE_PREFERENCES, normalizeAppearancePreferences, type AppearancePreferences } from "@/types/appearance";

export function useAppearanceDraft() {
  const { preferences: savedPreferences, preferenceOwner, updatePreferences, persistenceStatus } = useAppearance();
  const [edits, setEdits] = useState<Partial<AppearancePreferences>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [draftOwner, setDraftOwner] = useState(preferenceOwner);
  if (draftOwner !== preferenceOwner) {
    setDraftOwner(preferenceOwner);
    setEdits({});
  }
  const draftPreferences = normalizeAppearancePreferences({ ...savedPreferences, ...(draftOwner === preferenceOwner ? edits : {}) });
  const isDirty = JSON.stringify(draftPreferences) !== JSON.stringify(savedPreferences);
  const updateDraft = (updates: Partial<AppearancePreferences>) => {
    setEdits(current => ({ ...current, ...updates }));
  };
  const discard = () => { setEdits({}); };
  const reset = () => { setEdits({ ...DEFAULT_APPEARANCE_PREFERENCES }); };
  const apply = async () => {
    if (isApplying || !isDirty) return false;
    setIsApplying(true);
    try {
      const saved = await updatePreferences(edits);
      if (saved) discard();
      return saved;
    } finally { setIsApplying(false); }
  };
  return { savedPreferences, draftPreferences, isDirty, isApplying, persistenceStatus, updateDraft, discard, reset, apply };
}
