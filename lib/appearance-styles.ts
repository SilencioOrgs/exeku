import { type AppearancePreferences, type UIStyle } from "@/types/appearance";

export const STYLE_PRESENTATIONS = {
  "pixel-arcade": { name: "Pixel Arcade", description: "A programming arcade. Neon, pixel type, tactile controls.", density: "comfortable", heading: "pixel", radius: 0 },
  "minimal-saas": { name: "Clarity", description: "Room to think. Clean type, soft surfaces, considered space.", density: "spacious", heading: "sans", radius: 14 },
  "studio-crm": { name: "Command", description: "A focused developer workspace. Structured, precise, efficient.", density: "compact", heading: "sans", radius: 4 },
} as const;

export function selectStylePreferences(preferences: AppearancePreferences, uiStyle: UIStyle, preserveDensity = false): AppearancePreferences {
  return { ...preferences, uiStyle, density: preserveDensity || preferences.density !== STYLE_PRESENTATIONS[preferences.uiStyle].density ? preferences.density : STYLE_PRESENTATIONS[uiStyle].density };
}

export function restoreStyleDefaults(preferences: AppearancePreferences): AppearancePreferences {
  return { ...preferences, uiFontFamily: "geist-sans", uiFontScale: 100, lineHeight: "normal", density: STYLE_PRESENTATIONS[preferences.uiStyle].density };
}
