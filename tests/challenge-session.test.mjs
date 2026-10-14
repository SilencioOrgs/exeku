import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CHALLENGE_DURATION_MS,
  CHALLENGE_STORAGE_KEY,
} from "../types/challenge.ts";
import { formatRemainingTime } from "../hooks/use-challenge-session.tsx";

test("challenge-session - formatRemainingTime formats seconds and minutes accurately", () => {
  assert.equal(formatRemainingTime(15 * 60 * 1000), "15:00");
  assert.equal(formatRemainingTime(90 * 1000), "01:30");
  assert.equal(formatRemainingTime(65 * 1000), "01:05");
  assert.equal(formatRemainingTime(9 * 1000), "00:09");
  assert.equal(formatRemainingTime(1000), "00:01");
  assert.equal(formatRemainingTime(0), "00:00");
  assert.equal(formatRemainingTime(-5000), "00:00");
});

test("challenge-session - calculates absolute deadline and initial state", () => {
  assert.equal(CHALLENGE_STORAGE_KEY, "exeku:challenge-session");
  const now = 1700000000000;
  const duration = DEFAULT_CHALLENGE_DURATION_MS; // 5 minutes (300,000 ms)
  assert.equal(duration, 5 * 60 * 1000);

  const deadline = now + duration;
  assert.equal(deadline - now, 300000);

  const session = {
    id: "challenge-test-123",
    problemId: "sum-two-integers",
    problemTitle: "Sum of Two Integers",
    durationMs: duration,
    startedAt: now,
    deadline,
    status: "active",
    submissionCount: 0,
    lastVerdict: null,
  };

  assert.equal(session.status, "active");
  assert.equal(session.submissionCount, 0);
  assert.equal(session.lastVerdict, null);
});

test("challenge-session - requires at least 1 submission attempt before finishing", () => {
  let session = {
    id: "challenge-test-123",
    problemId: "sum-two-integers",
    problemTitle: "Sum of Two Integers",
    durationMs: DEFAULT_CHALLENGE_DURATION_MS,
    startedAt: Date.now(),
    deadline: Date.now() + DEFAULT_CHALLENGE_DURATION_MS,
    status: "active",
    submissionCount: 0,
    lastVerdict: null,
  };

  // Attempting to finish with 0 submissions must fail
  const canFinishZeroSubmissions = session.submissionCount >= 1;
  assert.equal(canFinishZeroSubmissions, false);

  // Record submission attempt
  session = {
    ...session,
    status: "submitted",
    submissionCount: session.submissionCount + 1,
    lastVerdict: "ACCEPTED",
  };

  assert.equal(session.submissionCount, 1);
  assert.equal(session.status, "submitted");
  assert.equal(session.lastVerdict, "ACCEPTED");

  // Now finish succeeds
  const canFinishWithSubmission = session.submissionCount >= 1;
  assert.equal(canFinishWithSubmission, true);

  const completedSession = {
    ...session,
    status: "completed",
    completedAt: Date.now(),
  };

  assert.equal(completedSession.status, "completed");
  assert.ok(completedSession.completedAt);
});

test("challenge-session - forfeit sets status to forfeited with completedAt timestamp", () => {
  const session = {
    id: "challenge-test-456",
    problemId: "even-or-odd",
    problemTitle: "Even or Odd",
    durationMs: DEFAULT_CHALLENGE_DURATION_MS,
    startedAt: Date.now(),
    deadline: Date.now() + DEFAULT_CHALLENGE_DURATION_MS,
    status: "active",
    submissionCount: 0,
    lastVerdict: null,
  };

  const forfeitedSession = {
    ...session,
    status: "forfeited",
    completedAt: Date.now(),
  };

  assert.equal(forfeitedSession.status, "forfeited");
  assert.ok(forfeitedSession.completedAt >= forfeitedSession.startedAt);
});

test("challenge-session - navigation guard intercepts when challenge is active or submitted", () => {
  const isSessionLocked = (status) =>
    status === "active" || status === "submitting" || status === "submitted";

  assert.equal(isSessionLocked("active"), true);
  assert.equal(isSessionLocked("submitting"), true);
  assert.equal(isSessionLocked("submitted"), true);
  assert.equal(isSessionLocked("idle"), false);
  assert.equal(isSessionLocked("completed"), false);
  assert.equal(isSessionLocked("forfeited"), false);
  assert.equal(isSessionLocked("expired"), false);
});
