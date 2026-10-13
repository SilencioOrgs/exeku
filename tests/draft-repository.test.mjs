import test from "node:test";
import assert from "node:assert/strict";
import { draftRepository } from "../lib/storage/draft-repository.ts";

test("draftRepository - returns null when no draft exists for profile and language", async () => {
  const draft = await draftRepository.getDraft("user_123", "python");
  assert.equal(draft, null);
});

test("draftRepository - saves and retrieves draft for profile and language", async () => {
  const code = 'print("Custom code from test")';
  const saved = await draftRepository.saveDraft("user_123", "python", code);

  assert.equal(saved.profileId, "user_123");
  assert.equal(saved.language, "python");
  assert.equal(saved.filename, "main.py");
  assert.equal(saved.code, code);
  assert.ok(saved.updatedAt);

  const retrieved = await draftRepository.getDraft("user_123", "python");
  assert.ok(retrieved);
  assert.equal(retrieved.code, code);
  assert.equal(retrieved.id, "user_123_python");
});

test("draftRepository - keeps drafts separated across languages for the same profile", async () => {
  await draftRepository.saveDraft("user_123", "cpp", 'std::cout << "cpp code";');

  const pyDraft = await draftRepository.getDraft("user_123", "python");
  const cppDraft = await draftRepository.getDraft("user_123", "cpp");

  assert.ok(pyDraft);
  assert.ok(cppDraft);
  assert.notEqual(pyDraft.code, cppDraft.code);
  assert.equal(cppDraft.filename, "main.cpp");
});

test("draftRepository - resets draft back to default starter code", async () => {
  const reset = await draftRepository.resetDraft("user_123", "python");
  assert.match(reset.code, /Hello, Exeku!/i);

  const reloaded = await draftRepository.getDraft("user_123", "python");
  assert.ok(reloaded);
  assert.match(reloaded.code, /Hello, Exeku!/i);
});

test("draftRepository - deletes all drafts for a profile without touching other profiles", async () => {
  await draftRepository.saveDraft("user_999", "python", 'print("other user")');

  await draftRepository.deleteProfileDrafts("user_123");

  const py123 = await draftRepository.getDraft("user_123", "python");
  const cpp123 = await draftRepository.getDraft("user_123", "cpp");
  const py999 = await draftRepository.getDraft("user_999", "python");

  assert.equal(py123, null);
  assert.equal(cpp123, null);
  assert.ok(py999, "Other profile drafts must remain intact");
});
