import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(root, name), "utf8");

test("signup uses shared rounded, neutral components instead of pixel decoration", () => {
  const wizard = read("components/setup/onboarding-wizard.tsx");
  assert.match(wizard, /rounded-xl border border-\[var\(--color-border\)\]/);
  assert.match(wizard, /<ThemeToggle/);
  assert.match(wizard, /saveProfile\(/);
  assert.doesNotMatch(wizard, /Background Pixel Grid|OFFLINE PROFILE V1|border-2/);
});

test("onboarding steps use accessible neutral selection and rounded controls", () => {
  const identity = read("components/setup/step-identity.tsx");
  const avatar = read("components/setup/step-avatar.tsx");
  const loadout = read("components/setup/step-loadout.tsx");
  assert.match(identity, /<Input/);
  assert.match(identity, /rounded-lg/);
  assert.match(avatar, /aria-pressed=\{active\}/);
  assert.match(avatar, /rounded-xl/);
  assert.match(loadout, /type="radio"/);
  assert.match(loadout, /rounded-xl/);
  for (const source of [identity, avatar, loadout]) {
    assert.doesNotMatch(source, /border-2|shadow-btn|pixel-box|neon-violet/);
  }
});

test("profile edit and reset dialogs keep rounded surfaces", () => {
  for (const name of ["profile-edit-dialog.tsx", "profile-reset-dialog.tsx"]) {
    const source = read("components/app/" + name);
    assert.match(source, /rounded-xl border border-\[var\(--color-border\)\]/);
    assert.doesNotMatch(source, /border-2|shadow-card/);
  }
});
