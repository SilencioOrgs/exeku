import test from "node:test";
import assert from "node:assert/strict";
import {
  getAllProblems,
  getProblemById,
  getVisibleProblem,
  getProblemSummaries,
} from "../lib/problems/catalog.ts";
import { validateProblemSchema } from "../lib/problems/validation.ts";

test("problem catalog - contains 3 initial problems", () => {
  const problems = getAllProblems();
  assert.equal(problems.length, 3);

  const ids = problems.map((p) => p.id);
  assert.deepEqual(ids, ["hello-world", "sum-two-integers", "even-or-odd"]);
});

test("problem catalog - all problems pass schema validation", () => {
  const problems = getAllProblems();
  for (const prob of problems) {
    const val = validateProblemSchema(prob);
    assert.equal(val.valid, true, `Problem ${prob.id} failed validation: ${val.error}`);
  }
});

test("getProblemById - retrieves full problem with hidden tests", () => {
  const prob = getProblemById("sum-two-integers");
  assert.notEqual(prob, null);
  assert.equal(prob?.id, "sum-two-integers");
  assert.equal(prob?.difficulty, "beginner");

  const hiddenTests = prob?.testCases.filter((t) => t.isHidden);
  assert.equal((hiddenTests?.length ?? 0) > 0, true);
});

test("getVisibleProblem - redacts hidden tests for client-safe payload", () => {
  const visible = getVisibleProblem("sum-two-integers");
  assert.notEqual(visible, null);
  assert.equal(visible?.id, "sum-two-integers");

  // Should NOT have raw testCases field with hidden flag
  assert.equal("testCases" in visible, false);
  assert.equal(Array.isArray(visible?.visibleTestCases), true);

  // All visible test cases must be present
  assert.equal((visible?.visibleTestCases.length ?? 0) >= 2, true);
});

test("getProblemSummaries - filters by difficulty and search term", () => {
  const allSummaries = getProblemSummaries();
  assert.equal(allSummaries.length, 3);

  const searchSum = getProblemSummaries({ search: "integers" });
  assert.equal(searchSum.length, 1);
  assert.equal(searchSum[0].id, "sum-two-integers");

  const diffFilter = getProblemSummaries({ difficulty: "advanced" });
  assert.equal(diffFilter.length, 0);
});
