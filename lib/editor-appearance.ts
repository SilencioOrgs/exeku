import type { CSSProperties } from "react";
import type { AppearancePreferences } from "@/types/appearance";

const FONTS = {
  "geist-mono": "var(--font-geist-mono), monospace",
  consolas: "Consolas, 'Liberation Mono', Menlo, Courier, monospace",
  "courier-new": "'Courier New', Courier, monospace",
  monospace: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

/** Editor colors follow the UI unless the student pinned light or dark for the editor only. */
export function resolveEditorAppearance(preferences: AppearancePreferences, effectiveMode: "dark" | "light") {
  const followsUi = preferences.contrastMode === "high" || preferences.editorTheme === "auto" || preferences.editorTheme === "high-contrast";
  const mode: "dark" | "light" = followsUi ? effectiveMode : preferences.editorTheme as "dark" | "light";
  const style: CSSProperties = {
    fontFamily: FONTS[preferences.editorFontFamily],
    fontSize: `${preferences.editorFontSize}px`,
    lineHeight: `${Math.max(preferences.editorLineHeight, preferences.editorFontSize + 2)}px`,
    fontVariantLigatures: preferences.editorLigatures ? "normal" : "none",
  };
  return { mode, style };
}
