import test from "node:test";
import assert from "node:assert/strict";
import { countInTopic, inTopic, sortProblems } from "../lib/problems/topics.ts";
import { getActivityCalendar, getActivityStreaks } from "../lib/storage/coding-activity.ts";

const problem = (title, difficulty, tags, totalTestsCount) => ({ id: title, slug: title, title, difficulty, tags, category: "c", supportedLanguages: [], sampleCount: 1, totalTestsCount });
const set = [problem("B", "advanced", ["Arrays", "math"], 2), problem("A", "beginner", ["strings"], 9), problem("C", "intermediate", ["logic"], 5)];

test("topics match catalog tags, ignoring case", () => {
  assert.equal(inTopic(set[0], "array"), true);
  assert.equal(inTopic(set[0], "string"), false);
  assert.equal(inTopic(set[0], "all"), true);
  assert.equal(countInTopic(set, "math"), 1);
  assert.equal(countInTopic(set, "hash-table"), 0);
});

test("sorting orders a copy and leaves the catalog order alone", () => {
  const titles = (sort) => sortProblems(set, sort).map((p) => p.title).join("");
  assert.equal(titles("default"), "BAC");
  assert.equal(titles("title"), "ABC");
  assert.equal(titles("easiest"), "ACB");
  assert.equal(titles("hardest"), "BCA");
  assert.equal(titles("tests"), "ACB");
  assert.equal(set[0].title, "B");
});

test("streaks survive a day not coded yet, and break on a missed day", () => {
  const today = new Date(2026, 9, 14, 12);
  const streaks = (days) => getActivityStreaks(getActivityCalendar(today, days));
  assert.deepEqual(streaks([]), { current: 0, longest: 0 });
  assert.deepEqual(streaks(["2026-10-12", "2026-10-13", "2026-10-14"]), { current: 3, longest: 3 });
  assert.deepEqual(streaks(["2026-10-12", "2026-10-13"]), { current: 2, longest: 2 });
  assert.deepEqual(streaks(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-12"]), { current: 0, longest: 3 });
});
