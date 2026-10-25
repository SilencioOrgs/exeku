import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DotIcon } from "../components/retro/dot-icon.tsx";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("profile route exists and displays activity without trusting online submissions", () => {
  assert.match(read("app/app/profile/page.tsx"), /<ProfileView\s*\/>/);
  assert.match(read("components/app/profile-view.tsx"), /<CodingActivity profileId=\{profile\.id\}/);
  assert.match(read("components/app/app-sidebar.tsx"), /href: "\/app\/profile"/);
  assert.match(read("components/app/app-topbar.tsx"), /"\/app\/profile": "Profile"/);
});

test("application icons use modern stroke icons with legacy DotIcon API retained", () => {
  const icon = read("components/retro/dot-icon.tsx");
  assert.match(icon, /lucide-react/);
  assert.doesNotMatch(icon, /imageRendering: "pixelated"/);
  assert.match(icon, /aria-label/);
  assert.match(read("components/app/profile-view.tsx"), /<DotIcon/);
  const markup = renderToStaticMarkup(React.createElement(DotIcon, { name: "cog", "aria-label": "Settings" }));
  assert.match(markup, /aria-label="Settings"/);
  assert.match(markup, /stroke=/);
});

test("application uses one modern layout while preserving old appearance records", () => {
  assert.match(read("hooks/use-appearance.tsx"), /root.dataset.uiStyle = "minimal-saas"/);
  assert.match(read("components/app/appearance-studio.tsx"), /ColorModeChoice/);
  assert.doesNotMatch(read("components/app/appearance-studio.tsx"), /<StyleSelector|<PaletteSelector/);
  assert.doesNotMatch(read("components/app/command-station.tsx"), /pixel-arcade/);
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
