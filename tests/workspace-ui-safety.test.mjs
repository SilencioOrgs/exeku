import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("client routes do not bundle private problem catalog or hidden tests", () => {
  const clients = [
    "components/app/modern-overview.tsx",
    "components/app/challenges-view.tsx",
    "components/app/workspace-view.tsx",
  ];
  for (const client of clients) {
    const source = fs.readFileSync(path.join(root, client), "utf8");
    assert.doesNotMatch(source, /from ["']@\/lib\/problems\/catalog["']/,
      `${client} imports server-only catalog`);
  }
});

test("workspace offers editor focus mode without remounting Monaco", () => {
  const source = fs.readFileSync(path.join(root, "components/app/workspace-view.tsx"), "utf8");
  assert.match(source, /aria-label=\{editorExpanded \? "Restore problem and results panels" : "Expand code editor"\}/);
  assert.match(source, /data-editor-expanded=\{editorExpanded\}/);
  assert.match(source, /<MonacoEditorPane/);
  assert.match(source, /recordCodingDay\(profile\.id\)/);
});
