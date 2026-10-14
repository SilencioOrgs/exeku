"use client";

import { useState } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { DEFAULT_APPEARANCE_PREFERENCES, normalizeAppearancePreferences, type AppearancePreferences, type UIStyle, type ColorPalette } from "@/types/appearance";
import { selectStylePreferences, restoreStyleDefaults } from "@/lib/appearance-styles";

export function useAppearanceDraft() {
  const { preferences: savedPreferences, preferenceOwner, updatePreferences, persistenceStatus } = useAppearance();
  const [edits, setEdits] = useState<Partial<AppearancePreferences>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [densityOverride, setDensityOverride] = useState(false);
  const [draftOwner, setDraftOwner] = useState(preferenceOwner);
  if (draftOwner !== preferenceOwner) {
    setDraftOwner(preferenceOwner);
    setEdits({});
    setDensityOverride(false);
  }
  const draftPreferences = normalizeAppearancePreferences({ ...savedPreferences, ...(draftOwner === preferenceOwner ? edits : {}) });
  const isDirty = JSON.stringify(draftPreferences) !== JSON.stringify(savedPreferences);
  const updateDraft = (updates: Partial<AppearancePreferences>) => {
    if (updates.density !== undefined) setDensityOverride(true);
    setEdits(current => ({ ...current, ...updates }));
  };
  const selectStyle = (style: UIStyle) => {
    const next = selectStylePreferences(draftPreferences, style, densityOverride);
    setEdits(current => ({ ...current, uiStyle: next.uiStyle, colorPalette: next.colorPalette, density: next.density }));
  };
  const selectPalette = (palette: ColorPalette) => {
    setEdits(current => ({ ...current, colorPalette: palette }));
  };
  const discard = () => { setEdits({}); setDensityOverride(false); };
  const reset = () => { setEdits({ ...DEFAULT_APPEARANCE_PREFERENCES }); setDensityOverride(false); };
  const restoreDefaults = () => {
    const defaults = restoreStyleDefaults(draftPreferences);
    setEdits(current => ({ ...current, uiFontFamily: defaults.uiFontFamily, uiFontScale: defaults.uiFontScale, lineHeight: defaults.lineHeight, density: defaults.density, colorPalette: defaults.colorPalette }));
    setDensityOverride(false);
  };
  const apply = async () => {
    if (isApplying || !isDirty) return false;
    setIsApplying(true);
    try {
      const saved = await updatePreferences(edits);
      if (saved) discard();
      return saved;
    } finally { setIsApplying(false); }
  };
  return { savedPreferences, draftPreferences, isDirty, isApplying, persistenceStatus, updateDraft, selectStyle, selectPalette, discard, reset, restoreDefaults, apply };
}
