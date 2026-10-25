import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (filename) => readFileSync(path.join(root, filename), "utf8");

test("Settings exposes one light/dark toggle and retains safe profile actions", () => {
  const view = read("components/app/settings-view.tsx");
  assert.match(view, /<ThemeToggle showLabel/);
  assert.doesNotMatch(view, /<AppearanceStudio/);
  assert.match(view, /ProfileEditDialog/);
  assert.match(view, /ProfileResetDialog/);
  assert.match(view, /draftRepository\.deleteProfileDrafts/);
});

test("Landing and workspace topbars use the same light/dark control", () => {
  const navbar = read("components/landing/navbar.tsx");
  const topbar = read("components/app/app-topbar.tsx");
  const toggle = read("components/appearance/theme-toggle.tsx");
  assert.match(navbar, /<ThemeToggle/);
  assert.match(topbar, /<ThemeToggle/);
  assert.doesNotMatch(navbar, /<AppearanceModal/);
  assert.match(toggle, /effectiveColorMode/);
  assert.match(toggle, /setColorMode\(next\)/);
  assert.match(toggle, /"light"/);
  assert.match(toggle, /"dark"/);
  assert.doesNotMatch(toggle, /"pixel-arcade"|"studio-crm"/);
});

test("Neutral design is forced without deleting old profile theme records", () => {
  const provider = read("hooks/use-appearance.tsx");
  const css = read("app/globals.css");
  assert.match(provider, /root\.dataset\.uiStyle = "minimal-saas"/);
  assert.match(css, /SaaS UI foundation/);
  assert.match(css, /--radius-card: 0\.75rem/);
  assert.match(css, /scanlines/);
  const setting = read("components/app/settings-view.tsx");
  assert.doesNotMatch(setting, /Profile UUID|Appearance Studio|Theme Color Palette/);
});
