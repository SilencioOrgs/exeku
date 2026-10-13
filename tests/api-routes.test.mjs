import test from "node:test";
import assert from "node:assert/strict";
import { POST as executeHandler } from "../app/api/execute/route.ts";
import { POST as judgeHandler } from "../app/api/judge/route.ts";
import { GET as problemsHandler } from "../app/api/problems/route.ts";
import { GET as problemDetailHandler } from "../app/api/problems/[id]/route.ts";

test("API /api/execute - rejects invalid language payload with 400", async () => {
  const req = new Request("http://localhost:3000/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "rust",
      sourceCode: "fn main() {}",
    }),
  });

  const res = await executeHandler(req);
  assert.equal(res.status, 400);

  const data = await res.json();
  assert.match(data.error, /unsupported language/i);
});

test("API /api/judge - rejects unknown problem ID with 404", async () => {
  const req = new Request("http://localhost:3000/api/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      problemId: "non-existent-problem",
      language: "python",
      sourceCode: "print('test')",
    }),
  });

  const res = await judgeHandler(req);
  assert.equal(res.status, 404);

  const data = await res.json();
  assert.match(data.error, /not found/i);
});

test("API /api/problems - returns problem list with sample counts", async () => {
  const req = new Request("http://localhost:3000/api/problems?search=hello");
  const res = await problemsHandler(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(Array.isArray(data.problems), true);
  assert.equal(data.problems.length, 1);
  assert.equal(data.problems[0].id, "hello-world");
});

test("API /api/problems/[id] - returns single problem without hidden tests", async () => {
  const req = new Request("http://localhost:3000/api/problems/hello-world");
  const res = await problemDetailHandler(req, {
    params: Promise.resolve({ id: "hello-world" }),
  });
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.id, "hello-world");
  assert.equal("testCases" in data, false);
  assert.equal(Array.isArray(data.visibleTestCases), true);
});
