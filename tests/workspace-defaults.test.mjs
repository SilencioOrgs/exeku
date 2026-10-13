import test from "node:test";
import assert from "node:assert/strict";
import {
  getFilenameForLanguage,
  getMonacoLanguage,
  getStarterCode,
  ALL_SUPPORTED_LANGUAGES,
} from "../lib/workspace-defaults.ts";

test("workspace-defaults - maps languages to correct filenames", () => {
  assert.equal(getFilenameForLanguage("python"), "main.py");
  assert.equal(getFilenameForLanguage("java"), "Main.java");
  assert.equal(getFilenameForLanguage("cpp"), "main.cpp");
  assert.equal(getFilenameForLanguage("c"), "main.c");
});

test("workspace-defaults - maps languages to correct Monaco modes", () => {
  assert.equal(getMonacoLanguage("python"), "python");
  assert.equal(getMonacoLanguage("java"), "java");
  assert.equal(getMonacoLanguage("cpp"), "cpp");
  assert.equal(getMonacoLanguage("c"), "c");
});

test("workspace-defaults - provides language-specific starter code", () => {
  for (const lang of ALL_SUPPORTED_LANGUAGES) {
    const code = getStarterCode(lang);
    assert.ok(code.length > 20, `Starter code for ${lang} must not be empty`);
    assert.match(code, /Hello, Exeku!/i, `Starter code for ${lang} must mention Exeku`);
  }
});
