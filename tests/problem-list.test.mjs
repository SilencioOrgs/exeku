import test from "node:test";
import assert from "node:assert/strict";
import { filterProblemSummaries, paginateProblems } from "../lib/problems/problem-list.ts";

const problems = [
  { id: "p1", title: "Hello World", difficulty: "beginner", category: "Syntax", tags: ["intro", "io"], supportedLanguages: ["python", "java"], slug: "hello-world", sampleCount: 1, totalTestsCount: 2 },
  { id: "p2", title: "Sum Integers", difficulty: "beginner", category: "Math", tags: ["arithmetic", "io"], supportedLanguages: ["python", "cpp"], slug: "sum-integers", sampleCount: 2, totalTestsCount: 5 },
  { id: "p3", title: "Graph Paths", difficulty: "advanced", category: "Graphs", tags: ["graph", "bfs"], supportedLanguages: ["cpp", "java"], slug: "graph-paths", sampleCount: 3, totalTestsCount: 7 },
];

const defaults = { query: "", status: "all", difficulty: "all", category: "all", language: "all", tag: "all", statuses: new Map() };

test("problem filters match title, category, and tags case-insensitively", () => {
  assert.deepEqual(filterProblemSummaries(problems, { ...defaults, query: "SUM" }).map(p => p.id), ["p2"]);
  assert.deepEqual(filterProblemSummaries(problems, { ...defaults, query: "graphs" }).map(p => p.id), ["p3"]);
  assert.deepEqual(filterProblemSummaries(problems, { ...defaults, query: "BFS" }).map(p => p.id), ["p3"]);
});

test("problem filters compose difficulty, category, language, tag, and local status", () => {
  const statuses = new Map([["p1", "solved"], ["p2", "attempted"], ["p3", "unsolved"]]);
  const filtered = filterProblemSummaries(problems, { ...defaults, difficulty: "beginner", category: "Math", language: "python", tag: "arithmetic", status: "attempted", statuses });
  assert.deepEqual(filtered.map(p => p.id), ["p2"]);
  assert.deepEqual(filterProblemSummaries(problems, { ...defaults, status: "solved", statuses }).map(p => p.id), ["p1"]);
  assert.deepEqual(filterProblemSummaries(problems, { ...defaults, status: "unsolved", statuses }).map(p => p.id), ["p3"]);
});

test("problem filters return empty list when no records match", () => {
  assert.deepEqual(filterProblemSummaries(problems, { ...defaults, query: "does not exist" }), []);
});

test("pagination clamps out-of-range page and handles empty results", () => {
  const last = paginateProblems(problems, 99, 2);
  assert.equal(last.page, 2);
  assert.equal(last.pageCount, 2);
  assert.deepEqual(last.items.map(p => p.id), ["p3"]);
  const empty = paginateProblems([], 3, 10);
  assert.equal(empty.page, 1);
  assert.equal(empty.pageCount, 0);
  assert.deepEqual(empty.items, []);
});
