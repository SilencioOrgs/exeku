import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getVisibleProblem } from "../lib/problems/catalog.ts";
import {
  ALL_SUPPORTED_LANGUAGES,
  getFilenameForLanguage,
  getMonacoLanguage,
} from "../lib/workspace-defaults.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const globalsCssPath = path.resolve(__dirname, "../app/globals.css");

test("workspace-three-pane - catalog problems satisfy three-pane data contract", () => {
  const problem = getVisibleProblem("sum-two-integers");
  assert.ok(problem);

  // Left Pane Data Requirements
  assert.ok(problem.title);
  assert.ok(problem.description);
  assert.ok(problem.inputSpec);
  assert.ok(problem.outputSpec);
  assert.ok(problem.constraints.length > 0);
  assert.ok(problem.sampleTestCases.length > 0);
  assert.ok(problem.timeLimitMs > 0);
  assert.ok(problem.memoryLimitKb > 0);

  // Security: visible test cases only, no hidden test cases
  assert.ok(problem.visibleTestCases.length > 0);
  problem.visibleTestCases.forEach((tc) => {
    assert.equal("isHidden" in tc, false);
  });

  // Center Pane Data Requirements
  ALL_SUPPORTED_LANGUAGES.forEach((lang) => {
    const filename = getFilenameForLanguage(lang);
    const monacoMode = getMonacoLanguage(lang);
    assert.ok(filename.includes("."));
    assert.ok(monacoMode);
    assert.ok(problem.starterCodes[lang]);
  });
});

test("workspace-three-pane - globals.css contains palette overrides for all 15 palette variations", () => {
  const css = fs.readFileSync(globalsCssPath, "utf8");

  const expectedPalettes = [
    // Pixel Arcade
    "neon-violet",
    "pastel-dream",
    "mint-terminal",
    "sunset-arcade",
    "ocean-pixel",
    // Clarity
    "sapphire",
    "lavender",
    "forest",
    "rose",
    "monochrome",
    // Command
    "emerald-console",
    "amber-terminal",
    "steel-blue",
    "graphite",
    "crimson-control",
  ];

  expectedPalettes.forEach((palette) => {
    const pattern = `[data-palette="${palette}"]`;
    assert.ok(
      css.includes(pattern),
      `Expected globals.css to define CSS token overrides for palette: ${palette}`
    );
  });
});

test("workspace-three-pane - components implement responsive classes without horizontal document scroll", () => {
  const workspaceViewCode = fs.readFileSync(
    path.resolve(__dirname, "../components/app/workspace-view.tsx"),
    "utf8"
  );

  // Desktop three-pane grid layout
  assert.ok(
    workspaceViewCode.includes("xl:grid-cols-[29%_minmax(0,1fr)_27%]"),
    "Expected xl:grid-cols 3-pane layout for desktop viewports"
  );

  // Mobile / tablet switcher
  assert.ok(
    workspaceViewCode.includes("xl:hidden"),
    "Expected responsive tab switcher for screen widths below desktop"
  );

  // Independent vertical scrolling containers
  assert.ok(
    workspaceViewCode.includes("flex-1 min-h-0"),
    "Expected flex-1 min-h-0 for proper independent pane height containment"
  );
});
