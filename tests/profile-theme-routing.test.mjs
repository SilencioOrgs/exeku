import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { DotIcon } from "../components/retro/dot-icon.tsx";
import { DOT_ICONS_16, DOT_ICONS_32 } from "../components/retro/dot-icon-paths.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("profile route exists and displays activity without trusting online submissions", () => {
  assert.match(read("app/app/profile/page.tsx"), /<ProfileView\s*\/>/);
  assert.match(read("components/app/profile-view.tsx"), /<CodingActivity profileId=\{profile\.id\}/);
  assert.match(read("components/app/app-sidebar.tsx"), /href: "\/app\/profile"/);
  assert.match(read("components/app/app-topbar.tsx"), /"\/app\/profile": "Profile"/);
});

test("DotIcon always renders official bundled Doticons for every UI style", () => {
  const icon = read("components/retro/dot-icon.tsx");
  assert.match(icon, /DOT_ICONS_16/);
  assert.match(icon, /DOT_ICONS_32/);
  assert.doesNotMatch(icon, /MODERN_ICONS|<ModernIcon/);
  assert.match(read("components/app/profile-view.tsx"), /<DotIcon/);
  for (const [grid, icons] of [[16, DOT_ICONS_16], [32, DOT_ICONS_32]]) {
    for (const [name, iconPath] of Object.entries(icons)) {
      const official = read(`public/icons/doticons/${grid}/${name}.svg`);
      assert.ok(official.includes(`d="${iconPath}"`), `${name} must match bundled official artwork`);
      const markup = renderToStaticMarkup(React.createElement(DotIcon, { name, grid, "aria-label": name }));
      assert.ok(markup.includes(`d="${iconPath}"`));
      assert.ok(markup.includes(`aria-label="${name}"`));
      assert.ok(markup.includes('fill="currentColor"'));
    }
  }
});

test("application icon imports use Doticons, including shared controls and landing pages", () => {
  for (const filename of fs.readdirSync(path.join(root, "components"), { recursive: true }).filter(name => name.endsWith(".tsx"))) {
    const source = ts.createSourceFile(filename, read(path.join("components", filename)), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement)) assert.notEqual(statement.moduleSpecifier.text, "lucide-react", filename);
    }
  }
});

test("theme navigation routes and public problems API have route modules", () => {
  for (const route of ["app/app/page.tsx", "app/app/profile/page.tsx",
    "app/app/challenges/page.tsx", "app/app/workspace/page.tsx",
    "app/app/settings/page.tsx", "app/api/problems/route.ts",
    "app/api/problems/[id]/route.ts"]) {
    assert.ok(fs.existsSync(path.join(root, route)), `Missing route ${route}`);
  }
  for (const client of ["components/app/challenges-view.tsx", "components/app/workspace-view.tsx", "components/app/modern-overview.tsx"]) {
    assert.doesNotMatch(read(client), /from ["']@\/lib\/problems\/catalog["']/);
  }
});
