"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { useAppearance } from "@/hooks/use-appearance";
import { STYLE_PRESENTATIONS } from "@/lib/appearance-styles";
import { AppearancePreview } from "./appearance-preview";
import { DEFAULT_APPEARANCE_PREFERENCES, DEFAULT_PALETTES, type AppearancePreferences, type UIStyle } from "@/types/appearance";

export function StyleSelector({
  preferences,
  savedStyle,
  onSelect,
}: {
  preferences: AppearancePreferences;
  savedStyle: UIStyle;
  onSelect: (style: UIStyle) => void;
}) {
  const id = useId();
  return (
    <fieldset className="theme-gallery min-w-0">
      <legend className="sr-only">Interface style</legend>
      <div className="theme-gallery-grid">
        {(Object.entries(STYLE_PRESENTATIONS) as [UIStyle, typeof STYLE_PRESENTATIONS[UIStyle]][]).map(
          ([style, meta]) => {
            const isSelected = preferences.uiStyle === style;
            const isSaved = savedStyle === style;
            const previewPalette = isSelected
              ? preferences.colorPalette
              : DEFAULT_PALETTES[style];

            return (
              <label key={style} className="theme-option group">
                <input
                  className="peer sr-only"
                  type="radio"
                  name={id}
                  value={style}
                  checked={isSelected}
                  onChange={() => onSelect(style)}
                />
                <span className="theme-option-frame">
                  <span aria-hidden="true" className="theme-option-preview">
                    <AppearancePreview
                      miniature
                      preferences={{
                        ...DEFAULT_APPEARANCE_PREFERENCES,
                        uiStyle: style,
                        colorPalette: previewPalette,
                        colorMode: preferences.colorMode,
                        density: meta.density,
                      }}
                    />
                  </span>
                  <span className="theme-option-caption">
                    <span className="theme-option-title">
                      <span className="truncate">{meta.name}</span>
                      {isSelected && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs shrink-0">
                          <Check aria-hidden="true" size={12} strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="theme-option-description line-clamp-2">
                      {meta.description}
                    </span>
                    <span className="theme-option-state">
                      {isSaved
                        ? "Saved style"
                        : isSelected
                        ? "Previewing · not applied"
                        : "Preview this style"}
                    </span>
                  </span>
                </span>
              </label>
            );
          }
        )}
      </div>
    </fieldset>
  );
}
export function AppearanceSaveStatus() {
  const { persistenceMessage } = useAppearance();
  return <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{persistenceMessage}</p>;
}
