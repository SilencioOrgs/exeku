import test from "node:test";
import assert from "node:assert/strict";
import { readJson } from "../lib/accounts/read-json.ts";
import { MAX_BODY_BYTES } from "../lib/execution/validation.ts";
import { clientKeyFrom, ExecutionQueue, globalExecutionQueue, QueueFullError } from "../lib/execution/queue.ts";
import { POST as execute } from "../app/api/execute/route.ts";
import { POST as judge } from "../app/api/judge/route.ts";

const held = () => {
  let release;
  const task = () => new Promise((resolve) => { release = () => resolve("done"); });
  return { task, release: () => release() };
};
const post = (body, headers) => new Request("http://exeku.test/api", { method: "POST", body, headers });

test("each client gets at most 2 active plus waiting runs, and a finished run frees its slot", async () => {
  const queue = new ExecutionQueue({ maxConcurrency: 1 });
  const first = held();
  const second = held();
  const running = queue.enqueue(first.task, "a");
  const waiting = queue.enqueue(second.task, "a");

  await assert.rejects(queue.enqueue(async () => "x", "a"), (err) => err instanceof QueueFullError && /2 runs in progress/.test(err.message));
  const other = queue.enqueue(async () => "other", "b");

  first.release();
  assert.equal(await running, "done");
  await new Promise((resolve) => setImmediate(resolve));
  const again = queue.enqueue(async () => "again", "a");
  second.release();
  assert.deepEqual(await Promise.all([waiting, other, again]), ["done", "other", "again"]);
});

test("the client key is the first forwarded IP, then x-real-ip, then local", () => {
  assert.equal(clientKeyFrom(new Headers({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1", "x-real-ip": "198.51.100.2" })), "203.0.113.9");
  assert.equal(clientKeyFrom(new Headers({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(clientKeyFrom(new Headers()), "local");
});

test("over the per-client limit, Run and Submit answer 429 with a clear message", async () => {
  const headers = { "x-forwarded-for": "203.0.113.50" };
  const blockers = [held(), held()];
  const running = blockers.map((blocker) => globalExecutionQueue.enqueue(blocker.task, "203.0.113.50"));
  try {
    const run = await execute(post(JSON.stringify({ language: "python", sourceCode: "print(1)" }), headers));
    assert.equal(run.status, 429);
    assert.match((await run.json()).error, /runs in progress/);
    const submit = await judge(post(JSON.stringify({ problemId: "hello-world", language: "python", sourceCode: "print(1)" }), headers));
    assert.equal(submit.status, 429);
  } finally {
    blockers.forEach((blocker) => blocker.release());
    await Promise.all(running);
  }
});

test("readJson stops reading once the byte limit is passed", async () => {
  let pulls = 0;
  const endless = new ReadableStream({ pull(controller) { pulls++; controller.enqueue(new Uint8Array(1024)); } });
  const result = await readJson(new Request("http://exeku.test/", { method: "POST", body: endless, duplex: "half" }), 4096);
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
  assert.ok(pulls <= 7, `kept reading: ${pulls} chunks`);
});

test("readJson counts bytes, keeps split characters whole and reports bad JSON as 400", async () => {
  assert.equal((await readJson(post(JSON.stringify("é".repeat(10))), 11)).status, 413);
  assert.deepEqual(await readJson(post(JSON.stringify({ name: "José" }))), { ok: true, value: { name: "José" } });
  assert.equal((await readJson(post("{not json"))).status, 400);
  assert.equal((await readJson(new Request("http://exeku.test/", { method: "POST" }))).status, 400);
});

test("Run and Submit answer 400 for bad JSON and 413 for an oversized body", async () => {
  for (const route of [execute, judge]) {
    assert.equal((await route(post("{not json"))).status, 400);
    assert.equal((await route(post("x".repeat(MAX_BODY_BYTES + 1)))).status, 413);
  }
});
