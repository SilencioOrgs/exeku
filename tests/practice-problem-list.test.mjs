import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("practice list uses shared semantic table and responsive filter controls", () => {
  const view = read("components/app/challenges-view.tsx");
  const filters = read("components/app/problem-filters.tsx");
  assert.match(view, /<Table/);
  assert.match(view, /<ProblemFilters/);
  assert.match(view, /<Sheet/);
  assert.match(view, /paginateProblems/);
  assert.doesNotMatch(view, /PixelCard|PixelButton|PixelBadge|DotIcon/);
  for (const label of ["Problem search", "Status filter", "Difficulty filter", "Category filter", "Language filter", "Tag filter"]) {
    assert.ok(filters.includes(label), `missing accessible label: ${label}`);
  }
  assert.match(filters, /Solved/);
  assert.match(filters, /Attempted/);
  assert.match(filters, /Unsolved/);
});

test("problem preview uses redacted endpoint and does not load full catalog", () => {
  const preview = read("components/app/problem-preview-sheet.tsx");
  assert.match(preview, /\/api\/problems\//);
  assert.match(preview, /sampleTestCases/);
  assert.doesNotMatch(preview, /@\/lib\/problems\/catalog|testCases\.filter|isHidden/);
});

test("judge result persistence records metadata only and does not change judge API contract", () => {
  const workspace = read("components/app/workspace-view.tsx");
  const repository = read("lib/storage/submission-repository.ts");
  assert.match(workspace, /submissionRepository\.recordSubmission/);
  assert.match(workspace, /fetch\("\/api\/judge"/);
  assert.match(repository, /passedTests/);
  assert.match(repository, /overallVerdict/);
  assert.doesNotMatch(repository, /sourceCode|testResults|expectedOutput|stdin/);
});
