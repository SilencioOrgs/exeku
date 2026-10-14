"use client";

import React, { useId } from "react";
import { DotIcon } from "@/components/retro/dot-icon";
import { PALETTE_PRESENTATIONS } from "@/lib/appearance-styles";
import type { UIStyle, ColorPalette } from "@/types/appearance";

export interface PaletteSelectorProps {
  uiStyle: UIStyle;
  activePalette: ColorPalette;
  onSelectPalette: (palette: ColorPalette) => void;
  compact?: boolean;
}

export function PaletteSelector({
  uiStyle,
  activePalette,
  onSelectPalette,
}: PaletteSelectorProps) {
  const id = useId();
  const palettes = PALETTE_PRESENTATIONS[uiStyle] || PALETTE_PRESENTATIONS["pixel-arcade"];

  return (
    <fieldset className="appearance-control-group palette-selector-group">
      <legend className="font-heading text-sm font-semibold text-[var(--color-text-main)] mb-1">
        Color palette
      </legend>

      <div
        role="radiogroup"
        aria-label="Color palette selection"
        className="palette-swatch-grid"
      >
        {palettes.map((p) => {
          const isSelected = activePalette === p.id;

          return (
            <label
              key={p.id}
              title={`${p.name}: ${p.description}`}
              className={`palette-swatch-card group relative text-left border cursor-pointer ${
                isSelected
                  ? "bg-[var(--color-elevated)] border-[var(--color-primary)] [box-shadow:var(--shadow-btn)]"
                  : "bg-[var(--color-canvas)] border-[var(--color-border)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]"
              }`}
            >
              <input type="radio" name={id} value={p.id} checked={isSelected}
                aria-label={`${p.name} palette`} className="sr-only"
                onChange={() => onSelectPalette(p.id)} />
              <div className="flex items-center gap-1">
                {/* Visual Swatch: Primary & Accent side by side */}
                <div className="flex items-center -space-x-1.5 shrink-0">
                  <span
                    className="w-4 h-4 rounded-full border border-black/30 shadow-xs inline-block"
                    style={{ backgroundColor: p.primaryColor }}
                    aria-hidden="true"
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-black/30 shadow-xs inline-block"
                    style={{ backgroundColor: p.accentColor }}
                    aria-hidden="true"
                  />
                </div>

                {isSelected && (
                  <span className="w-3.5 h-3.5 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] flex items-center justify-center shrink-0">
                    <DotIcon name="circleCheck" size={12} aria-hidden="true" />
                  </span>
                )}
              </div>

              <span className="text-xs font-medium text-[var(--color-text-main)]">
                {p.name}
              </span>

            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
