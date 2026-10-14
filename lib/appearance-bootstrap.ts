import { DEFAULT_APPEARANCE_PREFERENCES, VALID_UI_STYLES, VALID_COLOR_MODES, VALID_CONTRAST_MODES, VALID_UI_FONTS, VALID_EDITOR_FONTS, VALID_LINE_HEIGHTS } from "@/types/appearance";

// Only root attributes change before hydration; React children start from identical defaults.
function initialize(config: { defaults: typeof DEFAULT_APPEARANCE_PREFERENCES; choices: Record<string, readonly unknown[]> }) {
  const prefs = { ...config.defaults };
  let raw: Record<string, unknown> = {};
  try {
    const snapshot = localStorage.getItem("exeku_appearance_snapshot");
    const guest = localStorage.getItem("exeku_appearance_settings");
    try { raw = JSON.parse(snapshot || guest || "{}"); }
    catch { raw = JSON.parse(guest || "{}"); }
    if (!raw || typeof raw !== "object") raw = {};
  } catch { /* Blocked or corrupt storage uses safe defaults before first paint. */ }
  for (const [key, choices] of Object.entries(config.choices)) {
    if (choices.includes(raw[key])) Object.assign(prefs, { [key]: raw[key] });
  }
  if (raw.uiFontFamily === "inter") prefs.uiFontFamily = "system-sans";
  for (const [key, min, max] of [["uiFontScale", 80, 150], ["brightness", 80, 120]] as const) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) prefs[key] = Math.min(max, Math.max(min, value));
  }
  if (typeof raw.reducedMotion === "boolean" || raw.reducedMotion === "system") prefs.reducedMotion = raw.reducedMotion;
  const dark = prefs.colorMode === "dark" || (prefs.colorMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const reduced = prefs.reducedMotion === "system" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : prefs.reducedMotion;
  const root = document.documentElement;
  Object.assign(root.dataset, { uiStyle: prefs.uiStyle, colorMode: dark ? "dark" : "light", contrast: prefs.contrastMode, uiFont: prefs.uiFontFamily, editorFont: prefs.editorFontFamily, lineHeight: prefs.lineHeight, density: prefs.density, reducedMotion: String(reduced) });
  root.classList.toggle("dark", dark);
  const brightness = prefs.contrastMode === "high" ? 100 : prefs.brightness;
  root.style.setProperty("--ui-font-scale", prefs.uiFontScale + "%");
  root.style.setProperty("--app-brightness", brightness + "%");
  root.style.setProperty("--brightness-factor", String(brightness / 100));
}

export const appearanceBootstrap = "(" + initialize.toString() + ")(" + JSON.stringify({
  defaults: DEFAULT_APPEARANCE_PREFERENCES,
  choices: { uiStyle: VALID_UI_STYLES, colorMode: VALID_COLOR_MODES, contrastMode: VALID_CONTRAST_MODES, uiFontFamily: VALID_UI_FONTS, editorFontFamily: VALID_EDITOR_FONTS, lineHeight: VALID_LINE_HEIGHTS, density: ["compact", "comfortable", "spacious"] },
}) + ");";
