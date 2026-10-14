import {
  type AppearancePreferences,
  type UIStyle,
  type ColorPalette,
  VALID_PALETTES_BY_STYLE,
  DEFAULT_PALETTES,
} from "@/types/appearance";

export const STYLE_PRESENTATIONS = {
  "pixel-arcade": { name: "Pixel Arcade", description: "Retro, expressive, colorful.", density: "comfortable", heading: "pixel", radius: 0 },
  "minimal-saas": { name: "Clarity", description: "Clean, minimal, distraction-free.", density: "spacious", heading: "sans", radius: 14 },
  "studio-crm": { name: "Command", description: "Structured, focused, professional.", density: "compact", heading: "sans", radius: 4 },
} as const;

export interface PalettePresentation {
  id: ColorPalette;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
}

export const PALETTE_PRESENTATIONS: Record<UIStyle, readonly PalettePresentation[]> = {
  "pixel-arcade": [
    {
      id: "neon-violet",
      name: "Neon Violet",
      description: "Original Exeku arcade glow. Electric purple and neon cyan.",
      primaryColor: "#9E00FF",
      accentColor: "#00F0FF",
    },
    {
      id: "pastel-dream",
      name: "Pastel Dream",
      description: "Lavender glow, soft rose pink, and pale sky cyan.",
      primaryColor: "#A855F7",
      accentColor: "#38BDF8",
    },
    {
      id: "mint-terminal",
      name: "Mint Terminal",
      description: "Phosphor mint green and deep arcade charcoal.",
      primaryColor: "#00FF9D",
      accentColor: "#00F0FF",
    },
    {
      id: "sunset-arcade",
      name: "Sunset Arcade",
      description: "Synthwave sunset with coral orange, ruby, and violet.",
      primaryColor: "#FF6B4A",
      accentColor: "#FF007A",
    },
    {
      id: "ocean-pixel",
      name: "Ocean Pixel",
      description: "Electric cobalt, marine cyan, and deep navy tones.",
      primaryColor: "#3B82F6",
      accentColor: "#00F0FF",
    },
  ],
  "minimal-saas": [
    {
      id: "sapphire",
      name: "Sapphire",
      description: "Professional cobalt blue. Restrained and balanced.",
      primaryColor: "#2563EB",
      accentColor: "#60A5FA",
    },
    {
      id: "lavender",
      name: "Lavender",
      description: "Soft violet and amethyst accents for calm concentration.",
      primaryColor: "#7C3AED",
      accentColor: "#A78BFA",
    },
    {
      id: "forest",
      name: "Forest",
      description: "Deep pine green and emerald tones.",
      primaryColor: "#059669",
      accentColor: "#34D399",
    },
    {
      id: "rose",
      name: "Rose",
      description: "Muted rose and raspberry accents with warm neutral backing.",
      primaryColor: "#E11D48",
      accentColor: "#FB7185",
    },
    {
      id: "monochrome",
      name: "Monochrome",
      description: "Pure architectural grayscale. Stripped to black, white, and slate.",
      primaryColor: "#4B5563",
      accentColor: "#9CA3AF",
    },
  ],
  "studio-crm": [
    {
      id: "emerald-console",
      name: "Emerald Console",
      description: "High-density emerald terminal for engineering precision.",
      primaryColor: "#10B981",
      accentColor: "#34D399",
    },
    {
      id: "amber-terminal",
      name: "Amber Terminal",
      description: "Warm amber phosphor cathode with sharp contrast.",
      primaryColor: "#F59E0B",
      accentColor: "#FBBF24",
    },
    {
      id: "steel-blue",
      name: "Steel Blue",
      description: "Industrial slate and steel blue for focused telemetry.",
      primaryColor: "#0EA5E9",
      accentColor: "#38BDF8",
    },
    {
      id: "graphite",
      name: "Graphite",
      description: "Subdued zinc and graphite tones for minimal fatigue.",
      primaryColor: "#64748B",
      accentColor: "#94A3B8",
    },
    {
      id: "crimson-control",
      name: "Crimson Control",
      description: "Command telemetry with alert crimson and ruby accents.",
      primaryColor: "#EF4444",
      accentColor: "#F87171",
    },
  ],
};

export function selectStylePreferences(
  preferences: AppearancePreferences,
  uiStyle: UIStyle,
  preserveDensity = false
): AppearancePreferences {
  const density =
    preserveDensity || preferences.density !== STYLE_PRESENTATIONS[preferences.uiStyle].density
      ? preferences.density
      : STYLE_PRESENTATIONS[uiStyle].density;

  const validPalettes = VALID_PALETTES_BY_STYLE[uiStyle];
  const colorPalette = validPalettes.includes(preferences.colorPalette)
    ? preferences.colorPalette
    : DEFAULT_PALETTES[uiStyle];

  return {
    ...preferences,
    uiStyle,
    colorPalette,
    density,
  };
}

export function restoreStyleDefaults(preferences: AppearancePreferences): AppearancePreferences {
  return {
    ...preferences,
    uiFontFamily: "geist-sans",
    uiFontScale: 100,
    lineHeight: "normal",
    density: STYLE_PRESENTATIONS[preferences.uiStyle].density,
    colorPalette: DEFAULT_PALETTES[preferences.uiStyle],
  };
}
