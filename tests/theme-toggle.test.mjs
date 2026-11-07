import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("landing navbar and app top bar use the one-click light/dark icon, not a pop-up", () => {
  for (const file of ["../components/landing/navbar.tsx", "../components/app/app-topbar.tsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /<ThemeToggle/, file);
    assert.doesNotMatch(source, /AppearanceModal|Dialog/, file);
  }
});
