import type { AppearancePreferences } from "@/types/appearance";

const FONTS = {
  "geist-mono": "var(--font-geist-mono), monospace",
  consolas: "Consolas, 'Liberation Mono', Menlo, Courier, monospace",
  monospace: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

export function resolveEditorAppearance(preferences: AppearancePreferences, effectiveMode: "dark" | "light", reducedMotion: boolean) {
  const mode = preferences.contrastMode === "high" || preferences.editorTheme === "auto" || preferences.editorTheme === "high-contrast" ? effectiveMode : preferences.editorTheme;
  // Legacy appearance IDs may remain in local storage, but the editor uses one modern syntax skin.
  const style = "minimal";
  const highContrast = preferences.contrastMode === "high" || preferences.editorTheme === "high-contrast";
  return {
    theme: "exeku-" + (highContrast ? "hc" : style) + "-" + mode,
    options: {
      fontFamily: FONTS[preferences.editorFontFamily],
      fontSize: preferences.editorFontSize,
      lineHeight: Math.max(preferences.editorLineHeight, preferences.editorFontSize + 2),
      fontLigatures: preferences.editorLigatures,
      cursorBlinking: reducedMotion ? "solid" as const : "smooth" as const,
      smoothScrolling: !reducedMotion,
    },
  };
}
