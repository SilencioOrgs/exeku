import { readFileSync } from "node:fs";
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

test("W3Schools-style Learn curriculum covers Python, Java, C++, and C basics including printing arrays and Easy-to-Hard labels", () => {
  assert.equal(LEARN_CHAPTERS.length, 8);
  const arrayChapter = findLearnChapterById("printing-arrays");
  assert.ok(arrayChapter, "printing-arrays chapter must exist");
  assert.match(arrayChapter.title, /Printing an Array/i);

  const difficulties = new Set(LEARN_CHAPTERS.map((c) => c.difficulty));
  assert.deepEqual(difficulties, new Set(["beginner", "intermediate", "advanced"]));

  for (const chapter of LEARN_CHAPTERS) {
    assert.ok(chapter.category.length > 2, `${chapter.id} category label`);
    assert.ok(chapter.tags.length >= 2, `${chapter.id} topic tags`);
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

import {
  getLanguageDocTopic,
  LANGUAGE_DOC_TOPICS,
  LANGUAGE_OVERVIEW_META,
} from "../lib/learn/docs.ts";

test("database migration defines learn_chapters, learn_progress, and seeds Easy, Medium, and Hard problems with labels and no answers", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20261122020000_learn_and_curated_problems.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /create table if not exists learn_chapters/i);
  assert.match(sql, /create table if not exists learn_progress/i);
  assert.match(sql, /delete from problems where id in \('hello-world', 'sum-two-integers', 'even-or-odd'\)/i);
  assert.match(sql, /'array-elements-sum'/);
  assert.match(sql, /'two-sum-target'/);
  assert.match(sql, /'maximum-subarray-sum'/);
  assert.match(sql, /'beginner'/);
  assert.match(sql, /'intermediate'/);
  assert.match(sql, /'advanced'/);
  assert.doesNotMatch(sql, /"explanation":/);
});

test("Language Reference Docs cover all 4 languages across 8 topics and problems do not display answers", () => {
  assert.equal(LANGUAGE_DOC_TOPICS.length, 8);
  for (const lang of ["python", "java", "cpp", "c"]) {
    assert.ok(LANGUAGE_OVERVIEW_META[lang].version.length > 0);
    assert.ok(LANGUAGE_OVERVIEW_META[lang].entryFile.length > 0);
  }
  for (const topic of LANGUAGE_DOC_TOPICS) {
    for (const lang of ["python", "java", "cpp", "c"]) {
      const sec = topic.byLanguage[lang];
      assert.ok(sec.title.length > 3, `${topic.id}:${lang} title`);
      assert.ok(sec.referenceTable.length >= 2, `${topic.id}:${lang} referenceTable`);
      assert.ok(sec.codeSnippet.length > 10, `${topic.id}:${lang} codeSnippet`);
      assert.ok(sec.pitfalls.length >= 1, `${topic.id}:${lang} pitfalls`);
    }
  }
  assert.equal(getLanguageDocTopic("non-existent").id, "program-structure");

  const problemPane = readFileSync(
    new URL("../components/app/workspace/problem-pane.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(problemPane, /sample\.output/);
  assert.doesNotMatch(problemPane, /sample\.explanation/);

  const learnView = readFileSync(
    new URL("../components/app/learn/learn-view.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(learnView, /Show answer/);
});


