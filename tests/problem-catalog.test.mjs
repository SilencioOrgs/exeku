import test from "node:test";
import assert from "node:assert/strict";
import {
  getAllProblems as getProductionProblems,
  summarizeProblems,
  toVisibleProblem,
} from "../lib/problems/catalog.ts";
import {
  checkExerciseAnswer,
  findLearnChapterById,
  getLearnChapter,
  LEARN_CHAPTERS,
} from "../lib/learn/curriculum.ts";
import {
  getAllProblems,
  getProblemById,
  getVisibleProblem,
  getProblemSummaries,
} from "./fixtures/sample-problems.ts";
import { validateProblemSchema } from "./fixtures/problem-validation.ts";

test("production problem catalog ships with zero dummy problems", () => {
  assert.deepEqual(getProductionProblems(), []);
});

test("sample fixtures pass schema validation and redaction helpers", () => {
  const problems = getAllProblems();
  assert.equal(problems.length, 3);
  for (const prob of problems) {
    const val = validateProblemSchema(prob);
    assert.equal(val.valid, true, `Problem ${prob.id} failed validation: ${val.error}`);
  }
});

test("getProblemById & toVisibleProblem - retrieves full problem and redacts hidden tests for client-safe payload", () => {
  const prob = getProblemById("sum-two-integers");
  assert.notEqual(prob, null);
  assert.equal(prob?.id, "sum-two-integers");
  assert.equal(prob?.difficulty, "beginner");
  assert.equal((prob?.testCases.filter((t) => t.isHidden).length ?? 0) > 0, true);

  const visible = toVisibleProblem(prob);
  assert.equal(visible.id, "sum-two-integers");
  assert.equal("testCases" in visible, false);
  assert.equal(Array.isArray(visible.visibleTestCases), true);
  assert.equal(visible.visibleTestCases.length >= 2, true);
  assert.deepEqual(getVisibleProblem("sum-two-integers"), visible);
});

test("summarizeProblems - filters by difficulty and search term", () => {
  const allSummaries = getProblemSummaries();
  assert.equal(allSummaries.length, 3);

  const searchSum = summarizeProblems(getAllProblems(), { search: "integers" });
  assert.equal(searchSum.length, 1);
  assert.equal(searchSum[0].id, "sum-two-integers");

  const diffFilter = summarizeProblems(getAllProblems(), { difficulty: "advanced" });
  assert.equal(diffFilter.length, 0);
});

test("W3Schools-style Learn curriculum covers Python, Java, C++, and C basics including printing arrays", () => {
  assert.equal(LEARN_CHAPTERS.length, 8);
  const arrayChapter = findLearnChapterById("printing-arrays");
  assert.ok(arrayChapter, "printing-arrays chapter must exist");
  assert.match(arrayChapter.title, /Printing an Array/i);

  for (const chapter of LEARN_CHAPTERS) {
    for (const lang of ["python", "java", "cpp", "c"]) {
      const lesson = chapter.lessons[lang];
      assert.ok(lesson.headline.length > 3, `${chapter.id}:${lang} headline`);
      assert.ok(lesson.intro.length > 20, `${chapter.id}:${lang} intro`);
      assert.ok(lesson.keyRules.length >= 2, `${chapter.id}:${lang} keyRules`);
      assert.ok(lesson.exampleCode.length > 10, `${chapter.id}:${lang} exampleCode`);
      assert.ok(lesson.expectedOutput.length > 0, `${chapter.id}:${lang} expectedOutput`);
      assert.equal(
        checkExerciseAnswer(lesson, lesson.exercise.answer),
        true,
        `${chapter.id}:${lang} canonical exercise answer must pass`,
      );
      assert.equal(
        checkExerciseAnswer(lesson, "definitely_wrong_answer_xyz"),
        false,
        `${chapter.id}:${lang} wrong exercise answer must fail`,
      );
    }
  }

  assert.equal(getLearnChapter("non-existent").id, "syntax-output");
});
