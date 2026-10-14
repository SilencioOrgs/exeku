import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateExecutionRequest } from "../lib/execution/validation.ts";
import { PistonAdapter } from "../lib/execution/piston-adapter.ts";
import { draftRepository } from "../lib/storage/draft-repository.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (pathName) => fs.readFileSync(path.join(root, pathName), "utf8");

const python = {
  language: "python",
  sourceCode: "print('ok')",
  files: [
    { name: "main.py", content: "print('ok')" },
    { name: "helpers.py", content: "def helper(): return 1" },
  ],
};

test("workspace multi-file: validates main + companion sources and supports Piston order", () => {
  const validated = validateExecutionRequest(python);
  assert.equal(validated.valid, true);
  if (!validated.valid) return;
  const payload = new PistonAdapter().buildPistonPayload(validated.request);
  assert.deepEqual(payload.files, python.files);
  assert.equal(payload.files[0].name, "main.py");
});

test("workspace multi-file: Java main entry remains Main.java", () => {
  const raw = {
    language: "java",
    sourceCode: "public class Main {}",
    files: [
      { name: "Main.java", content: "public class Main {}" },
      { name: "Helper.java", content: "public class Helper {}" },
    ],
  };
  const value = validateExecutionRequest(raw);
  assert.equal(value.valid, true);
  if (value.valid) {
    const payload = new PistonAdapter().buildPistonPayload(value.request);
    assert.equal(payload.files[0].name, "Main.java");
    assert.equal(payload.files[1].name, "Helper.java");
  }
});

test("workspace multi-file: reject mismatched main, duplicates, invalid extensions, traversal and oversized total", () => {
  const cases = [
    { ...python, sourceCode: "print('different')" },
    { ...python, files: [...python.files, { name: "HELPERS.py", content: "" }] },
    { ...python, files: [...python.files, { name: "../private.py", content: "" }] },
    { ...python, files: [...python.files, { name: "test.js", content: "" }] },
    { ...python, files: [...python.files, { name: "a.py", content: "x".repeat(65536) }] },
    { ...python, files: [...python.files, ...Array.from({ length: 5 }, (_, i) => ({ name: `mod${i}.py`, content: "" }))] },
  ];
  for (const entry of cases) assert.equal(validateExecutionRequest(entry).valid, false);
});

test("workspace multi-file: legacy free drafts load as main file and problem-specific data stays isolated", async () => {
  const profile = "multifile-test";
  await draftRepository.saveDraft(profile, "python", "print('legacy')");
  const legacy = await draftRepository.getDraft(profile, "python");
  assert.equal(legacy?.code, "print('legacy')");
  assert.deepEqual(legacy?.files, [{ name: "main.py", content: "print('legacy')" }]);
  assert.equal(await draftRepository.getDraft(profile, "python", "hello-world"), null);
  await draftRepository.saveDraft(profile, "python", "print('problem')", [
    { name: "main.py", content: "print('problem')" }, { name: "other.py", content: "" },
  ], "hello-world");
  assert.equal((await draftRepository.getDraft(profile, "python", "hello-world"))?.files?.length, 2);
  assert.equal((await draftRepository.getDraft(profile, "python"))?.code, "print('legacy')");
  await draftRepository.deleteProfileDrafts(profile);
});

test("workspace multi-file: toolbar avoids unlayered touch minimums and keeps a mounted Monaco path", () => {
  const view = read("components/app/workspace-view.tsx");
  const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const editor = read("components/app/monaco-editor-pane.tsx");
  assert.match(view, /className="workspace-toolbar/);
  assert.match(view, /<FileTabs/);
  assert.match(view, /<Group/);
  assert.match(view, /<Panel id="editor"/);
  assert.match(view, /sourceCode: mainCode/);
  assert.match(view, /files,/);
  const blocks = [];
  for (const match of css.matchAll(/([^{}]*)([{}])/g)) {
    if (match[2] === "{") {
      blocks.push(match[1].trim());
    } else {
      if (/min-height:\s*2\.75rem\b/.test(match[1]) && /button|select|appearance-checkbox|appearance-reset/.test(blocks.at(-1))) {
        assert.ok(
          blocks.some(block => /^@layer\b/.test(block) || /^@media\s*\(pointer:\s*coarse\)/.test(block)),
          "44px control minimum must be layered or limited to coarse pointers: " + blocks.at(-1)
        );
      }
      blocks.pop();
    }
  }
  assert.match(editor, /keepCurrentModel/);
  assert.match(editor, /path=\{path\}/);
});
