import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_APPEARANCE_PREFERENCES,
  normalizeAppearancePreferences,
} from "../types/appearance.js";
import { AppearanceRepository } from "../lib/storage/appearance-repository.js";

test("DEFAULT_APPEARANCE_PREFERENCES - has expected default values", () => {
  assert.equal(DEFAULT_APPEARANCE_PREFERENCES.uiStyle, "pixel-arcade");
  assert.equal(DEFAULT_APPEARANCE_PREFERENCES.colorMode, "dark");
  assert.equal(DEFAULT_APPEARANCE_PREFERENCES.contrastMode, "standard");
  assert.equal(DEFAULT_APPEARANCE_PREFERENCES.uiFontFamily, "geist-sans");
  assert.equal(DEFAULT_APPEARANCE_PREFERENCES.uiFontScale, 100);
  assert.equal(DEFAULT_APPEARANCE_PREFERENCES.lineHeight, "normal");
  assert.equal(DEFAULT_APPEARANCE_PREFERENCES.editorFontFamily, "geist-mono");
  assert.equal(DEFAULT_APPEARANCE_PREFERENCES.editorFontSize, 14);
  assert.equal(DEFAULT_APPEARANCE_PREFERENCES.editorLineHeight, 22);
  assert.equal(DEFAULT_APPEARANCE_PREFERENCES.brightness, 100);
  assert.equal(DEFAULT_APPEARANCE_PREFERENCES.reducedMotion, false);
});

test("normalizeAppearancePreferences - validates and clamps preferences", () => {
  // Clamps font scale and brightness
  const normalized = normalizeAppearancePreferences({
    uiStyle: "unknown-style",
    colorMode: "invalid-mode",
    uiFontScale: 200, // max 150
    brightness: 60, // min 80
    editorFontSize: 30, // max 20
    editorLineHeight: 10, // min 18
  });

  assert.equal(normalized.uiStyle, "pixel-arcade");
  assert.equal(normalized.colorMode, "dark");
  assert.equal(normalized.uiFontScale, 150);
  assert.equal(normalized.brightness, 80);
  assert.equal(normalized.editorFontSize, 20);
  assert.equal(normalized.editorLineHeight, 18);
});

test("normalizeAppearancePreferences - accepts valid styles and options", () => {
  const custom = normalizeAppearancePreferences({
    uiStyle: "minimal-saas",
    colorMode: "light",
    contrastMode: "high",
    uiFontFamily: "inter",
    uiFontScale: 110,
    lineHeight: "compact",
    editorFontFamily: "consolas",
    editorFontSize: 16,
    editorLineHeight: 24,
    brightness: 110,
    reducedMotion: true,
  });

  assert.equal(custom.uiStyle, "minimal-saas");
  assert.equal(custom.colorMode, "light");
  assert.equal(custom.contrastMode, "high");
  assert.equal(custom.uiFontFamily, "inter");
  assert.equal(custom.uiFontScale, 110);
  assert.equal(custom.lineHeight, "compact");
  assert.equal(custom.editorFontFamily, "consolas");
  assert.equal(custom.editorFontSize, 16);
  assert.equal(custom.editorLineHeight, 24);
  assert.equal(custom.brightness, 110);
  assert.equal(custom.reducedMotion, true);
});

test("AppearanceRepository - in-memory storage fallback works", () => {
  const repo = new AppearanceRepository({ storage: null });

  const initial = repo.getPreferences();
  assert.deepEqual(initial, DEFAULT_APPEARANCE_PREFERENCES);

  const updated = repo.savePreferences({
    uiStyle: "studio-crm",
    colorMode: "system",
  });
  assert.equal(updated.uiStyle, "studio-crm");
  assert.equal(updated.colorMode, "system");

  const retrieved = repo.getPreferences();
  assert.equal(retrieved.uiStyle, "studio-crm");

  const reset = repo.resetPreferences();
  assert.deepEqual(reset, DEFAULT_APPEARANCE_PREFERENCES);
  assert.equal(repo.getPreferences().uiStyle, "pixel-arcade");
});

test("AppearanceRepository - resolveEffectiveColorMode resolves system preference correctly", () => {
  const repo = new AppearanceRepository({ storage: null });

  assert.equal(repo.resolveEffectiveColorMode("dark", false), "dark");
  assert.equal(repo.resolveEffectiveColorMode("light", true), "light");
  assert.equal(repo.resolveEffectiveColorMode("system", true), "dark");
  assert.equal(repo.resolveEffectiveColorMode("system", false), "light");
});
