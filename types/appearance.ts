/**
 * EXEKU — APPEARANCE STUDIO & GLOBAL THEMING CONTRACTS
 */

export type UIStyle = "pixel-arcade" | "minimal-saas" | "studio-crm";

export type ColorMode = "dark" | "light" | "system";

export type ContrastMode = "standard" | "high";

export type UIFontFamily =
  | "geist-sans"
  | "inter"
  | "pixelify-sans"
  | "system-sans";

export type EditorFontFamily =
  | "geist-mono"
  | "consolas"
  | "monospace";

export type LineHeightOption = "compact" | "normal" | "comfortable";

export interface AppearancePreferences {
  uiStyle: UIStyle;
  colorMode: ColorMode;
  contrastMode: ContrastMode;
  uiFontFamily: UIFontFamily;
  uiFontScale: number; // 80 - 150 (%)
  lineHeight: LineHeightOption;
  editorFontFamily: EditorFontFamily;
  editorFontSize: number; // 12 - 20 (px)
  editorLineHeight: number; // 18 - 32 (px)
  brightness: number; // 80 - 120 (%)
  reducedMotion: boolean;
}

export const VALID_UI_STYLES: readonly UIStyle[] = [
  "pixel-arcade",
  "minimal-saas",
  "studio-crm",
] as const;

export const VALID_COLOR_MODES: readonly ColorMode[] = [
  "dark",
  "light",
  "system",
] as const;

export const VALID_CONTRAST_MODES: readonly ContrastMode[] = [
  "standard",
  "high",
] as const;

export const VALID_UI_FONTS: readonly UIFontFamily[] = [
  "geist-sans",
  "inter",
  "pixelify-sans",
  "system-sans",
] as const;

export const VALID_EDITOR_FONTS: readonly EditorFontFamily[] = [
  "geist-mono",
  "consolas",
  "monospace",
] as const;

export const VALID_LINE_HEIGHTS: readonly LineHeightOption[] = [
  "compact",
  "normal",
  "comfortable",
] as const;

export const DEFAULT_APPEARANCE_PREFERENCES: AppearancePreferences = {
  uiStyle: "pixel-arcade",
  colorMode: "dark",
  contrastMode: "standard",
  uiFontFamily: "geist-sans",
  uiFontScale: 100,
  lineHeight: "normal",
  editorFontFamily: "geist-mono",
  editorFontSize: 14,
  editorLineHeight: 22,
  brightness: 100,
  reducedMotion: false,
};

function clamp(value: number, min: number, max: number, defaultValue: number): number {
  if (typeof value !== "number" || isNaN(value)) return defaultValue;
  return Math.min(Math.max(value, min), max);
}

export function normalizeAppearancePreferences(
  input?: Partial<AppearancePreferences> | null
): AppearancePreferences {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_APPEARANCE_PREFERENCES };
  }

  const uiStyle: UIStyle = VALID_UI_STYLES.includes(input.uiStyle as UIStyle)
    ? (input.uiStyle as UIStyle)
    : DEFAULT_APPEARANCE_PREFERENCES.uiStyle;

  const colorMode: ColorMode = VALID_COLOR_MODES.includes(input.colorMode as ColorMode)
    ? (input.colorMode as ColorMode)
    : DEFAULT_APPEARANCE_PREFERENCES.colorMode;

  const contrastMode: ContrastMode = VALID_CONTRAST_MODES.includes(input.contrastMode as ContrastMode)
    ? (input.contrastMode as ContrastMode)
    : DEFAULT_APPEARANCE_PREFERENCES.contrastMode;

  const uiFontFamily: UIFontFamily = VALID_UI_FONTS.includes(input.uiFontFamily as UIFontFamily)
    ? (input.uiFontFamily as UIFontFamily)
    : DEFAULT_APPEARANCE_PREFERENCES.uiFontFamily;

  const lineHeight: LineHeightOption = VALID_LINE_HEIGHTS.includes(input.lineHeight as LineHeightOption)
    ? (input.lineHeight as LineHeightOption)
    : DEFAULT_APPEARANCE_PREFERENCES.lineHeight;

  const editorFontFamily: EditorFontFamily = VALID_EDITOR_FONTS.includes(input.editorFontFamily as EditorFontFamily)
    ? (input.editorFontFamily as EditorFontFamily)
    : DEFAULT_APPEARANCE_PREFERENCES.editorFontFamily;

  const uiFontScale = clamp(
    Number(input.uiFontScale),
    80,
    150,
    DEFAULT_APPEARANCE_PREFERENCES.uiFontScale
  );

  const brightness = clamp(
    Number(input.brightness),
    80,
    120,
    DEFAULT_APPEARANCE_PREFERENCES.brightness
  );

  const editorFontSize = clamp(
    Number(input.editorFontSize),
    12,
    20,
    DEFAULT_APPEARANCE_PREFERENCES.editorFontSize
  );

  const editorLineHeight = clamp(
    Number(input.editorLineHeight),
    18,
    32,
    DEFAULT_APPEARANCE_PREFERENCES.editorLineHeight
  );

  const reducedMotion =
    typeof input.reducedMotion === "boolean"
      ? input.reducedMotion
      : DEFAULT_APPEARANCE_PREFERENCES.reducedMotion;

  return {
    uiStyle,
    colorMode,
    contrastMode,
    uiFontFamily,
    uiFontScale,
    lineHeight,
    editorFontFamily,
    editorFontSize,
    editorLineHeight,
    brightness,
    reducedMotion,
  };
}
