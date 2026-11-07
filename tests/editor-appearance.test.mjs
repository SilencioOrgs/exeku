import test from "node:test";
import assert from "node:assert/strict";
import { resolveEditorAppearance } from "../lib/editor-appearance.ts";
import { DEFAULT_APPEARANCE_PREFERENCES as defaults } from "../types/appearance.ts";

test("editor colors follow the UI unless pinned, and high contrast always follows the UI", () => {
  assert.equal(resolveEditorAppearance(defaults, "dark").mode, "dark");
  assert.equal(resolveEditorAppearance({ ...defaults, editorTheme: "light" }, "dark").mode, "light");
  assert.equal(resolveEditorAppearance({ ...defaults, editorTheme: "dark" }, "light").mode, "dark");
  assert.equal(resolveEditorAppearance({ ...defaults, editorTheme: "high-contrast" }, "light").mode, "light");
  assert.equal(resolveEditorAppearance({ ...defaults, editorTheme: "light", contrastMode: "high" }, "dark").mode, "dark");
});

test("editor typography comes from preferences without mutating them", () => {
  const prefs = Object.freeze({ ...defaults, editorFontFamily: "monospace", editorFontSize: 20, editorLineHeight: 18, editorLigatures: true });
  const { style } = resolveEditorAppearance(prefs, "dark");
  assert.equal(style.fontSize, "20px");
  assert.equal(style.lineHeight, "22px");
  assert.equal(style.fontVariantLigatures, "normal");
  assert.equal(prefs.editorLineHeight, 18);
});
