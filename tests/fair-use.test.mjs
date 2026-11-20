import test from "node:test";
import assert from "node:assert/strict";
import { readJson } from "../lib/accounts/read-json.ts";
import { MAX_BODY_BYTES } from "../lib/execution/validation.ts";
import { clientFrom, ExecutionQueue, globalExecutionQueue, QueueFullError } from "../lib/execution/queue.ts";
import { loadRoute } from "./fixtures/load-route.mjs";

const execute = loadRoute("app/api/execute/route.ts");
const judge = loadRoute("app/api/judge/route.ts");

const held = () => {
  let release;
  const task = () => new Promise((resolve) => { release = () => resolve("done"); });
  return { task, release: () => release() };
};
const post = (body, headers) => new Request("http://exeku.test/api", { method: "POST", body, headers });
const student = (name, ip = "school") => ({ ip, key: `${ip}/${name}` });

test("one student gets at most 2 active plus waiting runs, and a finished run frees a slot", async () => {
  const queue = new ExecutionQueue({ maxConcurrency: 1 });
  const first = held();
  const second = held();
  const running = queue.enqueue(first.task, student("a"));
  const waiting = queue.enqueue(second.task, student("a"));

  await assert.rejects(queue.enqueue(async () => "x", student("a")), (err) => err instanceof QueueFullError && /2 runs in progress/.test(err.message));
  const other = queue.enqueue(async () => "other", student("b"));

  first.release();
  assert.equal(await running, "done");
  await new Promise((resolve) => setImmediate(resolve));
  const again = queue.enqueue(async () => "again", student("a"));
  second.release();
  assert.deepEqual(await Promise.all([waiting, other, again]), ["done", "other", "again"]);
});

test("60 runs on one school IP are allowed, and the network stops there", async () => {
  const queue = new ExecutionQueue({ maxConcurrency: 1, maxQueueLength: 100 });
  let open;
  const gate = new Promise((resolve) => { open = () => resolve("done"); });
  const runs = Array.from({ length: 60 }, (_, i) => queue.enqueue(() => gate, student(`s${i}`)));

  await assert.rejects(queue.enqueue(async () => "x", student("s60")), (err) => err instanceof QueueFullError && /This network already has 60/.test(err.message));
  const elsewhere = queue.enqueue(async () => "elsewhere", student("s0", "other-school"));

  open();
  assert.equal((await Promise.all(runs)).filter((result) => result === "done").length, 60);
  assert.equal(await elsewhere, "elsewhere");
});

test("forwarded addresses count only with TRUST_PROXY=1 and prefer x-real-ip or rightmost hop", () => {
  const spoofedAndProxy = { "x-forwarded-for": "1.2.3.4, 203.0.113.9", "x-real-ip": "198.51.100.2" };
  const xffOnly = { "x-forwarded-for": "1.2.3.4, 203.0.113.9" };
  const trusted = { TRUST_PROXY: "1" };
  assert.deepEqual(clientFrom(new Headers(spoofedAndProxy), "user_1", {}), { ip: "local", key: "user_1" }, "a faked header changes nothing");
  assert.deepEqual(clientFrom(new Headers(spoofedAndProxy), "user_1", { TRUST_PROXY: "0" }), { ip: "local", key: "user_1" });
  assert.equal(clientFrom(new Headers(spoofedAndProxy), "user_1", trusted).ip, "198.51.100.2");
  assert.equal(clientFrom(new Headers(xffOnly), "user_1", trusted).ip, "203.0.113.9");
  assert.equal(clientFrom(new Headers(), "user_1", trusted).ip, "local");
});

test("the limit follows the signed-in user, and nothing the browser sends can change that", () => {
  assert.equal(clientFrom(new Headers({ "x-exeku-client": "someone-else" }), "user_1", {}).key, "user_1");
});

test("signed-out visitors can't run or submit code", async () => {
  for (const path of ["app/api/execute/route.ts", "app/api/judge/route.ts"]) {
    const response = await loadRoute(path, null)(post(JSON.stringify({ language: "python", sourceCode: "print(1)" })));
    assert.equal(response.status, 401, path);
  }
});

test("over the per-client limit, Run and Submit answer 429 with a clear message", async () => {
  const headers = {};
  const blockers = [held(), held()];
  const running = blockers.map((blocker) => globalExecutionQueue.enqueue(blocker.task, clientFrom(new Headers(headers), "user_route", {})));
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
