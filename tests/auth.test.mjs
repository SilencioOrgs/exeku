import test from "node:test";
import assert from "node:assert/strict";
import { accessFor } from "../lib/auth/access.ts";
import { toDisplayName } from "../lib/profile-validation.ts";
import { profileRepository } from "../lib/storage/profile-repository.ts";

test("signed-out visitors go to sign in on pages and get 401 from APIs", () => {
  assert.equal(accessFor("/app", false), "sign-in");
  assert.equal(accessFor("/app/workspace", false), "sign-in");
  assert.equal(accessFor("/api/execute", false), "reject");
  assert.equal(accessFor("/api/orgs/acoes", false), "reject");
  assert.equal(accessFor("/api/health", false), "allow", "setup checks stay open");
  assert.equal(accessFor("/setup", false), "allow");
  assert.equal(accessFor("/application", false), "allow", "only the real /app path is protected");
  for (const path of ["/app", "/api/execute", "/setup"]) assert.equal(accessFor(path, true), "allow");
});

test("Google names become valid display names", () => {
  assert.equal(toDisplayName("José Rizal"), "Jose Rizal");
  assert.equal(toDisplayName("a".repeat(40)), "a".repeat(32));
  for (const unusable of ["", null, undefined, "!", "李"]) assert.equal(toDisplayName(unusable), "Student", String(unusable));
});

test("students sharing a computer each get their own profile", async () => {
  await profileRepository.clearAll();
  const before = await profileRepository.saveProfile({ displayName: "Earlier", avatarId: "glitch-bot", experienceLevel: "beginner", preferredLanguage: "python" });

  const first = await profileRepository.claimProfile("user_a", "Student A");
  assert.equal(first.id, before.id, "a profile from before sign-in is kept");
  assert.equal(first.ownerId, "user_a");
  assert.equal(first.displayName, "Earlier");

  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = await profileRepository.claimProfile("user_b", "Student B");
  assert.notEqual(second.id, first.id);
  assert.equal(second.displayName, "Student B");
  assert.equal((await profileRepository.getActiveProfile()).id, second.id);

  await new Promise((resolve) => setTimeout(resolve, 5));
  const back = await profileRepository.claimProfile("user_a", "Renamed on Google");
  assert.equal(back.id, first.id);
  assert.equal(back.displayName, "Earlier", "a name the student chose is not overwritten");
  assert.equal((await profileRepository.getActiveProfile()).id, first.id, "the returning student is active again");
});
