import test from "node:test";
import assert from "node:assert/strict";
import { submissionRepository, getProblemStatus } from "../lib/storage/submission-repository.ts";
import { profileRepository } from "../lib/storage/profile-repository.ts";

const result = (overrides = {}) => ({
  problemId: "sum-two-integers",
  language: "python",
  overallVerdict: "WRONG_ANSWER",
  passedTests: 1,
  totalTests: 5,
  scorePercentage: 20,
  maxDurationMs: 12,
  testResults: [{ isHidden: true, input: "secret input", expectedOutput: "secret output" }],
  sourceCode: "print('should never persist source')",
  ...overrides,
});

test("submission history stores actual verdict metadata without source or test payloads", async () => {
  const saved = await submissionRepository.recordSubmission("profile-history-a", result());
  assert.equal(saved.profileId, "profile-history-a");
  assert.equal(saved.problemId, "sum-two-integers");
  assert.equal(saved.verdict, "WRONG_ANSWER");
  assert.equal(saved.passedTests, 1);
  assert.equal(saved.totalTests, 5);
  assert.equal("sourceCode" in saved, false);
  assert.equal("testResults" in saved, false);
  assert.equal("input" in saved, false);

  const all = await submissionRepository.getAllForProfile("profile-history-a");
  assert.equal(all.length, 1);
  assert.equal(all[0].id, saved.id);
});

test("problem status treats Accepted as solved and other real submissions as attempted", async () => {
  const wrong = await submissionRepository.recordSubmission("profile-history-b", result());
  assert.equal(getProblemStatus("sum-two-integers", [wrong]), "attempted");
  assert.equal(getProblemStatus("hello-world", [wrong]), "unsolved");

  const accepted = await submissionRepository.recordSubmission("profile-history-b", result({
    overallVerdict: "ACCEPTED", passedTests: 5, scorePercentage: 100,
  }));
  assert.equal(getProblemStatus("sum-two-integers", [wrong, accepted]), "solved");
});

test("submission history is isolated by profile and sorted newest first", async () => {
  const first = await submissionRepository.recordSubmission("profile-history-c", result({ problemId: "hello-world" }));
  const second = await submissionRepository.recordSubmission("profile-history-c", result({ problemId: "even-or-odd" }));
  await submissionRepository.recordSubmission("profile-history-d", result({ problemId: "sum-two-integers" }));
  const all = await submissionRepository.getAllForProfile("profile-history-c");
  assert.equal(all.length, 2);
  assert.equal(all[0].id, second.id);
  assert.equal(all[1].id, first.id);
});

test("deleting a local profile removes that profile's submission history", async () => {
  const profile = await profileRepository.saveProfile({
    displayName: "History Cleanup",
    avatarId: "default",
    experienceLevel: "beginner",
    preferredLanguage: "python",
  });
  await submissionRepository.recordSubmission(profile.id, result());
  assert.equal((await submissionRepository.getAllForProfile(profile.id)).length, 1);
  await profileRepository.deleteProfile(profile.id);
  assert.deepEqual(await submissionRepository.getAllForProfile(profile.id), []);
});
