import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionQueue, QueueAbortedError, QueueFullError } from "../lib/execution/queue.ts";

test("ExecutionQueue - executes tasks within concurrency limit", async () => {
  const queue = new ExecutionQueue({ maxConcurrency: 2, maxQueueLength: 10 });
  let running = 0;
  let maxObservedRunning = 0;

  const makeTask = (id, delayMs) => async () => {
    running++;
    if (running > maxObservedRunning) {
      maxObservedRunning = running;
    }
    await new Promise((r) => setTimeout(r, delayMs));
    running--;
    return `result-${id}`;
  };

  const p1 = queue.enqueue(makeTask(1, 30));
  const p2 = queue.enqueue(makeTask(2, 30));
  const p3 = queue.enqueue(makeTask(3, 30));

  const results = await Promise.all([p1, p2, p3]);

  assert.deepEqual(results, ["result-1", "result-2", "result-3"]);
  assert.equal(maxObservedRunning <= 2, true);
  assert.equal(queue.getStats().activeCount, 0);
  assert.equal(queue.getStats().waitingCount, 0);
});

test("ExecutionQueue - rejects when queue is saturated", async () => {
  const queue = new ExecutionQueue({ maxConcurrency: 1, maxQueueLength: 2 });
  const blocker = () => new Promise((r) => setTimeout(r, 60));

  // Task 1: active (concurrency 1)
  const p1 = queue.enqueue(blocker);
  // Task 2: waiting (queue 1)
  const p2 = queue.enqueue(blocker);
  // Task 3: waiting (queue 2, max length reached)
  const p3 = queue.enqueue(blocker);

  // Task 4: exceeds maxQueueLength (2) -> rejects with QueueFullError
  await assert.rejects(
    async () => {
      await queue.enqueue(blocker);
    },
    (err) => err instanceof QueueFullError
  );

  await Promise.all([p1, p2, p3]);
});

test("ExecutionQueue - aborting a queued task cancels it and frees the student slot", async () => {
  const queue = new ExecutionQueue({ maxConcurrency: 1, maxQueueLength: 5, maxPerClient: 2 });
  const client = { key: "student-1", ip: "local" };
  let releaseFirst;
  const p1 = queue.enqueue(() => new Promise((r) => { releaseFirst = r; }), client);

  const controller = new AbortController();
  let ranCanceled = false;
  const p2 = queue.enqueue(async () => { ranCanceled = true; return "never"; }, client, controller.signal);

  controller.abort();
  await assert.rejects(p2, QueueAbortedError);
  assert.equal(queue.getStats().waitingCount, 0);

  // Student should now be able to enqueue another task without hitting maxPerClient=2.
  const p3 = queue.enqueue(async () => "ok", client);
  releaseFirst("first");
  assert.equal(await p1, "first");
  assert.equal(await p3, "ok");
  assert.equal(ranCanceled, false);
});
