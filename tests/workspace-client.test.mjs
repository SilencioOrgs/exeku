import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { postJson } from "../hooks/use-judge.ts";
import { verdictInfo, isRealVerdict } from "../lib/verdicts.ts";

const reply = (status, body) => async () => new Response(JSON.stringify(body), { status });

test("postJson sends extra headers, such as the browser id Run and Submit use", async () => {
  let sent;
  await postJson("/api/execute", {}, async (_url, init) => { sent = init.headers; return new Response("{}", { status: 200 }); }, { "x-exeku-client": "abc" });
  assert.equal(sent["x-exeku-client"], "abc");
  assert.equal(sent["Content-Type"], "application/json");
});

test("postJson throws the server error on a non-2xx reply instead of returning it as a result", async () => {
  await assert.rejects(postJson("/api/judge", {}, reply(429, { error: "Execution queue is at full capacity." })), /full capacity/);
  await assert.rejects(postJson("/api/judge", {}, async () => new Response("oops", { status: 500 })), /HTTP 500/);
  assert.deepEqual(await postJson("/api/judge", {}, reply(200, { overallVerdict: "ACCEPTED" })), { overallVerdict: "ACCEPTED" });
});

test("every verdict has its own short code, and judge failures are not student attempts", () => {
  assert.equal(verdictInfo("ACCEPTED").code, "AC");
  assert.equal(verdictInfo("WRONG_ANSWER").code, "WA");
  assert.equal(verdictInfo("COMPILATION_ERROR").code, "CE");
  assert.equal(verdictInfo("RUNTIME_ERROR").code, "RE");
  assert.equal(verdictInfo("TIME_LIMIT_EXCEEDED").code, "TLE");
  assert.equal(verdictInfo(undefined).code, "ERR");
  assert.equal(isRealVerdict("WRONG_ANSWER"), true);
  assert.equal(isRealVerdict("SERVICE_UNAVAILABLE"), false);
  assert.equal(isRealVerdict("INTERNAL_JUDGE_ERROR"), false);
  assert.equal(isRealVerdict(undefined), false);
});

test("results pane labels a result as demo only when the result itself is simulated", () => {
  const view = readFileSync(new URL("../components/app/workspace-view.tsx", import.meta.url), "utf8");
  assert.match(view, /isResultDemo=\{judge\.isResultDemo\}/);
  assert.doesNotMatch(view, /challengeParam/, "the ?challenge=true auto-start path was removed");
});

test("a put reports success only after its transaction commits, and rejects if it aborts", async () => {
  const { idbPut } = await import("../lib/storage/db.ts");
  const previous = globalThis.window;
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  const tx = { objectStore: () => ({ put() { const request = {}; queueMicrotask(() => request.onsuccess?.()); return request; } }) };
  globalThis.window = { indexedDB: { open() { const request = {}; queueMicrotask(() => request.onsuccess({ target: { result: { transaction: () => tx } } })); return request; } } };
  try {
    let settled = false;
    const saving = idbPut("drafts", { id: "a" }).then((value) => { settled = true; return value; });
    await tick();
    assert.equal(settled, false, "the put request finishing is not a commit");
    tx.oncomplete();
    assert.deepEqual(await saving, { id: "a" });

    const failing = idbPut("drafts", { id: "b" });
    await tick();
    tx.error = new Error("quota exceeded");
    tx.onabort();
    await assert.rejects(failing, /quota exceeded/);
  } finally {
    if (previous === undefined) delete globalThis.window; else globalThis.window = previous;
  }
});

test("IndexedDB connection is opened once and reused", async () => {
  const { idbGet } = await import("../lib/storage/db.ts");
  const previous = globalThis.window;
  let opens = 0;
  const store = { get() { const request = { result: undefined }; queueMicrotask(() => request.onsuccess()); return request; } };
  const db = { transaction: () => ({ objectStore: () => store }) };
  globalThis.window = { indexedDB: { open() { opens++; const request = {}; queueMicrotask(() => request.onsuccess({ target: { result: db } })); return request; } } };
  try {
    await idbGet("profiles", "a");
    await idbGet("profiles", "b");
    await idbGet("drafts", "c");
    assert.equal(opens, 1);
  } finally {
    if (previous === undefined) delete globalThis.window; else globalThis.window = previous;
  }
});
