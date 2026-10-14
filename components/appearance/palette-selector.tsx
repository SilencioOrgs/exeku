"use client";

import React from "react";
import { Check } from "lucide-react";
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
  compact = false,
}: PaletteSelectorProps) {
  const palettes = PALETTE_PRESENTATIONS[uiStyle] || PALETTE_PRESENTATIONS["pixel-arcade"];

  return (
    <fieldset className="appearance-control-group palette-selector-group">
      <legend className="font-heading text-sm font-semibold text-[var(--color-text-main)] mb-1">
        Theme Color Palette
      </legend>
      <p className="text-xs text-[var(--color-text-muted)] mb-2.5">
        Choose a color scheme tailored for {uiStyle === "pixel-arcade" ? "Pixel Arcade" : uiStyle === "minimal-saas" ? "Clarity" : "Command"}.
      </p>

      <div
        role="radiogroup"
        aria-label="Color palette selection"
        className="palette-swatch-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2"
      >
        {palettes.map((p) => {
          const isSelected = activePalette === p.id;

          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${p.name} palette`}
              title={`${p.name}: ${p.description}`}
              onClick={() => onSelectPalette(p.id)}
              className={`palette-swatch-card group relative p-2 text-left border transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
                isSelected
                  ? "bg-[var(--color-elevated)] border-[var(--color-primary)] [box-shadow:var(--shadow-btn)]"
                  : "bg-[var(--color-canvas)] border-[var(--color-border)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]"
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
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
                    <Check size={10} strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </div>

              <span className="block font-mono text-xs font-semibold text-[var(--color-text-main)] truncate">
                {p.name}
              </span>

              {!compact && (
                <span className="block text-[0.6875rem] text-[var(--color-text-muted)] line-clamp-1 mt-0.5">
                  {p.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
