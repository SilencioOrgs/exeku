"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { useAppearance } from "@/hooks/use-appearance";
import { STYLE_PRESENTATIONS } from "@/lib/appearance-styles";
import { AppearancePreview } from "./appearance-preview";
import { DEFAULT_APPEARANCE_PREFERENCES, type AppearancePreferences, type UIStyle } from "@/types/appearance";

export function StyleSelector({ preferences, savedStyle, onSelect }: { preferences: AppearancePreferences; savedStyle: UIStyle; onSelect: (style: UIStyle) => void }) {
  const id = useId();
  return <fieldset className="theme-gallery min-w-0"><legend className="sr-only">Interface style</legend><div className="theme-gallery-grid">
    {(Object.entries(STYLE_PRESENTATIONS) as [UIStyle, typeof STYLE_PRESENTATIONS[UIStyle]][]).map(([style, meta]) => <label key={style} className="theme-option">
      <input className="peer sr-only" type="radio" name={id} value={style} checked={preferences.uiStyle === style} onChange={() => onSelect(style)} />
      <span className="theme-option-frame"><span aria-hidden="true" className="theme-option-preview"><AppearancePreview miniature preferences={{ ...DEFAULT_APPEARANCE_PREFERENCES, uiStyle: style, colorMode: preferences.colorMode, density: meta.density }} /></span>
        <span className="theme-option-caption"><span className="theme-option-title">{meta.name}{preferences.uiStyle === style && <Check aria-hidden="true" size={16} />}</span><span className="theme-option-description">{meta.description}</span><span className="theme-option-state">{savedStyle === style ? "Saved style" : preferences.uiStyle === style ? "Previewing · not applied" : "Preview this style"}</span></span>
      </span>
    </label>)}
  </div></fieldset>;
}
export function AppearanceSaveStatus() {
  const { persistenceMessage } = useAppearance();
  return <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{persistenceMessage}</p>;
}
