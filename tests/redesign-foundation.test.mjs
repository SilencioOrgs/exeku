import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const base = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(base,p),"utf8");
const css = read("app/globals.css");

test("phase 1 uses a single light/dark green design system with preserved tokens", () => {
  for (const token of ["--color-canvas","--color-surface","--color-elevated","--color-border","--color-primary","--color-accent","--color-text-main","--color-text-muted","--color-text-dim","--color-ring","--radius-card","--radius-btn","--shadow-card"]) {
    assert.ok(css.includes(token+":") || css.includes(token+": "), `Missing ${token}`);
  }
  assert.match(css,/--color-primary:\s*#087[Ff]44/);
  assert.match(css,/--color-primary:\s*#2[Ff][Dd]27[Aa]/);
  assert.match(css,/--radius-card:\s*8px/);
  assert.match(css,/--radius-btn:\s*6px/);
  assert.doesNotMatch(css,/\[data-ui-style="pixel-arcade"\]|\[data-ui-style="studio-crm"\]|\[data-palette=/);
  // Compatibility aliases stay until the final retro-component removal phase.
});

test("phase 1 uses shared rounded buttons, cards and badges, preserving Base UI functionality", () => {
  const button=read("components/ui/button.tsx");
  const badge=read("components/ui/badge.tsx");
  const card=read("components/ui/card.tsx");
  assert.match(button, /@base-ui\/react\/button/);
  assert.match(button,/rounded-\[var\(--radius-btn\)\]/);
  assert.match(button,/bg-primary text-primary-foreground/);
  assert.match(badge,/rounded-\[var\(--radius-btn\)\]/);
  assert.match(card,/rounded-\[var\(--radius-card\)\]/);
  assert.match(card,/border-border/);
});

test("phase 1 provides semantic scrollable shadcn-compatible table components", () => {
  const table=read("components/ui/table.tsx");
  for (const name of ["Table","TableHeader","TableBody","TableFooter","TableHead","TableRow","TableCell","TableCaption"]) {
    assert.match(table,new RegExp("\\b"+name+"\\b"));
  }
  assert.match(table, /overflow-x-auto/);
  assert.match(table,/scope=/);
});
