import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_APPEARANCE_PREFERENCES,
  normalizeAppearancePreferences,
  VALID_PALETTES_BY_STYLE,
  DEFAULT_PALETTES,
} from "../types/appearance.js";
import {
  PALETTE_PRESENTATIONS,
  selectStylePreferences,
  restoreStyleDefaults,
} from "../lib/appearance-styles.js";

test("PALETTE_PRESENTATIONS - defines exactly 5 distinct palettes per visual style", () => {
  for (const style of ["pixel-arcade", "minimal-saas", "studio-crm"]) {
    const list = PALETTE_PRESENTATIONS[style];
    assert.equal(list.length, 5, `Expected 5 palettes for ${style}`);

    const ids = new Set(list.map((p) => p.id));
    assert.equal(ids.size, 5, `All 5 palette IDs must be unique for ${style}`);

    for (const p of list) {
      assert.ok(p.id, "Palette must have an id");
      assert.ok(p.name, "Palette must have a human-readable name");
      assert.ok(p.description, "Palette must have a description");
      assert.match(p.primaryColor, /^#[0-9a-f]{6}$/i, "Primary color must be hex");
      assert.match(p.accentColor, /^#[0-9a-f]{6}$/i, "Accent color must be hex");
      assert.ok(VALID_PALETTES_BY_STYLE[style].includes(p.id), `${p.id} must be in VALID_PALETTES_BY_STYLE`);
    }
  }
});

test("normalizeAppearancePreferences - validates palette and assigns default per style", () => {
  // 1. Missing palette (legacy preference) receives default for the style
  const legacyArcade = normalizeAppearancePreferences({ uiStyle: "pixel-arcade" });
  assert.equal(legacyArcade.colorPalette, "neon-violet");

  const legacySaaS = normalizeAppearancePreferences({ uiStyle: "minimal-saas" });
  assert.equal(legacySaaS.colorPalette, "monochrome");

  const legacyCommand = normalizeAppearancePreferences({ uiStyle: "studio-crm" });
  assert.equal(legacyCommand.colorPalette, "emerald-console");

  // 2. Valid palette for the style is preserved
  const pastel = normalizeAppearancePreferences({
    uiStyle: "pixel-arcade",
    colorPalette: "pastel-dream",
  });
  assert.equal(pastel.colorPalette, "pastel-dream");

  const forest = normalizeAppearancePreferences({
    uiStyle: "minimal-saas",
    colorPalette: "forest",
  });
  assert.equal(forest.colorPalette, "forest");

  // 3. Incompatible palette for a style falls back to that style's default
  const mismatched = normalizeAppearancePreferences({
    uiStyle: "minimal-saas",
    colorPalette: "pastel-dream", // pastel-dream belongs to pixel-arcade
  });
  assert.equal(mismatched.colorPalette, "monochrome");
});

test("selectStylePreferences - switches to valid palette when style changes", () => {
  const currentArcade = {
    ...DEFAULT_APPEARANCE_PREFERENCES,
    uiStyle: "pixel-arcade",
    colorPalette: "sunset-arcade",
  };

  const switchedToSaaS = selectStylePreferences(currentArcade, "minimal-saas");
  assert.equal(switchedToSaaS.uiStyle, "minimal-saas");
  assert.equal(switchedToSaaS.colorPalette, DEFAULT_PALETTES["minimal-saas"]); // "monochrome"

  const switchedToCommand = selectStylePreferences(switchedToSaaS, "studio-crm");
  assert.equal(switchedToCommand.uiStyle, "studio-crm");
  assert.equal(switchedToCommand.colorPalette, DEFAULT_PALETTES["studio-crm"]); // "emerald-console"
});

test("restoreStyleDefaults - restores both style defaults and default palette", () => {
  const modified = {
    ...DEFAULT_APPEARANCE_PREFERENCES,
    uiStyle: "minimal-saas",
    colorPalette: "rose",
    uiFontScale: 120,
  };

  const restored = restoreStyleDefaults(modified);
  assert.equal(restored.uiStyle, "minimal-saas");
  assert.equal(restored.colorPalette, "monochrome");
  assert.equal(restored.uiFontScale, 100);
});
