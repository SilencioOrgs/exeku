"use client";

import { useId } from "react";
import { DotIcon } from "@/components/retro/dot-icon";
import { useAppearance } from "@/hooks/use-appearance";
import { STYLE_PRESENTATIONS } from "@/lib/appearance-styles";
import { DEFAULT_PALETTES, type AppearancePreferences, type UIStyle } from "@/types/appearance";

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
  const { systemColorMode } = useAppearance();
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
                  <span aria-hidden="true" className="theme-option-preview"
                    data-ui-style={style} data-palette={previewPalette}
                    data-color-mode={preferences.colorMode === "system" ? systemColorMode : preferences.colorMode}>
                    <span className="theme-type-sample">Aa</span>
                    <span className="theme-color-sample"><span /><span /><span /></span>
                  </span>
                  <span className="theme-option-caption">
                    <span className="theme-option-title">
                      <span className="truncate">{meta.name}</span>
                      {isSelected && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs shrink-0">
                          <DotIcon name="circleCheck" aria-hidden="true" size={14} />
                        </span>
                      )}
                    </span>
                    <span className="theme-option-description line-clamp-2">
                      {meta.description}
                    </span>
                    <span className="theme-option-state sr-only">
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
