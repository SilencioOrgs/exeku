/**
 * EXEKU — APPEARANCE STUDIO & GLOBAL THEMING CONTRACTS
 */

export type UIStyle = "pixel-arcade" | "minimal-saas" | "studio-crm";

export type ColorMode = "dark" | "light" | "system";

export type ContrastMode = "standard" | "high";

export type UIFontFamily =
  | "geist-sans"
  | "pixelify-sans"
  | "system-sans";

export type EditorFontFamily =
  | "geist-mono"
  | "consolas"
  | "monospace";

export type LineHeightOption = "compact" | "normal" | "comfortable";

export type Density = "compact" | "comfortable" | "spacious";
export type EditorTheme = "auto" | "dark" | "light" | "high-contrast";
export type ReducedMotion = boolean | "system";

export type PixelArcadePalette =
  | "neon-violet"
  | "pastel-dream"
  | "mint-terminal"
  | "sunset-arcade"
  | "ocean-pixel";

export type ClarityPalette =
  | "sapphire"
  | "lavender"
  | "forest"
  | "rose"
  | "monochrome";

export type CommandPalette =
  | "emerald-console"
  | "amber-terminal"
  | "steel-blue"
  | "graphite"
  | "crimson-control";

export type ColorPalette = PixelArcadePalette | ClarityPalette | CommandPalette;

export interface AppearancePreferences {
  uiStyle: UIStyle;
  colorPalette: ColorPalette;
  colorMode: ColorMode;
  contrastMode: ContrastMode;
  uiFontFamily: UIFontFamily;
  uiFontScale: number; // 80 - 150 (%)
  lineHeight: LineHeightOption;
  editorFontFamily: EditorFontFamily;
  editorFontSize: number; // 12 - 20 (px)
  editorLineHeight: number; // 18 - 32 (px)
  brightness: number; // 80 - 120 (%)
  reducedMotion: ReducedMotion;
  density: Density;
  editorTheme: EditorTheme;
  editorLigatures: boolean;
}

export const VALID_UI_STYLES: readonly UIStyle[] = [
  "pixel-arcade",
  "minimal-saas",
  "studio-crm",
] as const;

export const VALID_PALETTES_BY_STYLE: Record<UIStyle, readonly ColorPalette[]> = {
  "pixel-arcade": [
    "neon-violet",
    "pastel-dream",
    "mint-terminal",
    "sunset-arcade",
    "ocean-pixel",
  ],
  "minimal-saas": [
    "sapphire",
    "lavender",
    "forest",
    "rose",
    "monochrome",
  ],
  "studio-crm": [
    "emerald-console",
    "amber-terminal",
    "steel-blue",
    "graphite",
    "crimson-control",
  ],
} as const;

export const DEFAULT_PALETTES: Record<UIStyle, ColorPalette> = {
  "pixel-arcade": "neon-violet",
  "minimal-saas": "sapphire",
  "studio-crm": "emerald-console",
} as const;

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
  colorPalette: "neon-violet",
  colorMode: "dark",
  contrastMode: "standard",
  uiFontFamily: "geist-sans",
  uiFontScale: 100,
  lineHeight: "normal",
  editorFontFamily: "geist-mono",
  editorFontSize: 14,
  editorLineHeight: 22,
  brightness: 100,
  reducedMotion: "system",
  density: "comfortable",
  editorTheme: "auto",
  editorLigatures: false,
};

function clamp(value: number, min: number, max: number, defaultValue: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return defaultValue;
  return Math.min(Math.max(value, min), max);
}

export function normalizeAppearancePreferences(
  input?: unknown
): AppearancePreferences {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_APPEARANCE_PREFERENCES };
  }

  const values = input as Record<string, unknown>;

  const uiStyle: UIStyle = VALID_UI_STYLES.includes(values.uiStyle as UIStyle)
    ? (values.uiStyle as UIStyle)
    : DEFAULT_APPEARANCE_PREFERENCES.uiStyle;

  const colorMode: ColorMode = VALID_COLOR_MODES.includes(values.colorMode as ColorMode)
    ? (values.colorMode as ColorMode)
    : DEFAULT_APPEARANCE_PREFERENCES.colorMode;

  const contrastMode: ContrastMode = VALID_CONTRAST_MODES.includes(values.contrastMode as ContrastMode)
    ? (values.contrastMode as ContrastMode)
    : DEFAULT_APPEARANCE_PREFERENCES.contrastMode;

  const uiFontFamily: UIFontFamily = values.uiFontFamily === "inter" ? "system-sans" : VALID_UI_FONTS.includes(values.uiFontFamily as UIFontFamily)
    ? (values.uiFontFamily as UIFontFamily)
    : DEFAULT_APPEARANCE_PREFERENCES.uiFontFamily;

  const lineHeight: LineHeightOption = VALID_LINE_HEIGHTS.includes(values.lineHeight as LineHeightOption)
    ? (values.lineHeight as LineHeightOption)
    : DEFAULT_APPEARANCE_PREFERENCES.lineHeight;

  const editorFontFamily: EditorFontFamily = VALID_EDITOR_FONTS.includes(values.editorFontFamily as EditorFontFamily)
    ? (values.editorFontFamily as EditorFontFamily)
    : DEFAULT_APPEARANCE_PREFERENCES.editorFontFamily;

  const uiFontScale = clamp(
    values.uiFontScale as number,
    80,
    150,
    DEFAULT_APPEARANCE_PREFERENCES.uiFontScale
  );

  const brightness = clamp(
    values.brightness as number,
    80,
    120,
    DEFAULT_APPEARANCE_PREFERENCES.brightness
  );

  const editorFontSize = clamp(
    values.editorFontSize as number,
    12,
    20,
    DEFAULT_APPEARANCE_PREFERENCES.editorFontSize
  );

  const editorLineHeight = clamp(
    values.editorLineHeight as number,
    18,
    32,
    DEFAULT_APPEARANCE_PREFERENCES.editorLineHeight
  );

  const reducedMotion =
    typeof values.reducedMotion === "boolean" || values.reducedMotion === "system"
      ? values.reducedMotion
      : DEFAULT_APPEARANCE_PREFERENCES.reducedMotion;

  const validPalettes = VALID_PALETTES_BY_STYLE[uiStyle] || VALID_PALETTES_BY_STYLE["pixel-arcade"];
  const colorPalette: ColorPalette = (typeof values.colorPalette === "string" && validPalettes.includes(values.colorPalette as ColorPalette))
    ? (values.colorPalette as ColorPalette)
    : (DEFAULT_PALETTES[uiStyle] || "neon-violet");

  return {
    uiStyle,
    colorPalette,
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
    density: (["compact", "comfortable", "spacious"] as unknown[]).includes(values.density) ? values.density as Density : "comfortable",
    editorTheme: (["auto", "dark", "light", "high-contrast"] as unknown[]).includes(values.editorTheme) ? values.editorTheme as EditorTheme : "auto",
    editorLigatures: typeof values.editorLigatures === "boolean" ? values.editorLigatures : false,
  };
}
