import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shiftLines, newlineFor } from "../components/app/code-editor.tsx";

test("code editor indents and outdents whole lines", () => {
  assert.equal(shiftLines("a\n  b", false), "    a\n      b");
  assert.equal(shiftLines("    a\n  b\n\tc\nd", true), "a\nb\nc\nd");
});

test("code editor keeps indentation on Enter and opens a block after : { ( [", () => {
  assert.equal(newlineFor("    x = 1"), "\n    ");
  assert.equal(newlineFor("def main():"), "\n    ");
  assert.equal(newlineFor("  if (a) {  "), "\n      ");
  assert.equal(newlineFor(""), "\n");
});

test("workspace ships no Monaco or CDN editor", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.dependencies["monaco-editor"], undefined);
  assert.equal(pkg.dependencies["@monaco-editor/react"], undefined);
  const view = readFileSync(new URL("../components/app/workspace-view.tsx", import.meta.url), "utf8");
  assert.match(view, /<CodeEditor/);
});
