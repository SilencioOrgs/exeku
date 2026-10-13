import test from "node:test";
import assert from "node:assert/strict";
import { profileRepository } from "../lib/storage/profile-repository.ts";

test("profileRepository - returns null when no profile exists", async () => {
  // Ensure fresh state
  await profileRepository.clearAll();
  const profile = await profileRepository.getActiveProfile();
  assert.equal(profile, null);
  const exists = await profileRepository.hasProfile();
  assert.equal(exists, false);
});

test("profileRepository - saves profile with generated UUID and timestamps", async () => {
  await profileRepository.clearAll();
  const created = await profileRepository.saveProfile({
    displayName: "PixelDev",
    bio: "Lover of 8-bit systems",
    avatarId: "glitch-bot",
    experienceLevel: "intermediate",
    preferredLanguage: "python",
  });

  assert.ok(created.id, "Profile must have an ID");
  assert.equal(created.displayName, "PixelDev");
  assert.equal(created.bio, "Lover of 8-bit systems");
  assert.equal(created.avatarId, "glitch-bot");
  assert.equal(created.experienceLevel, "intermediate");
  assert.equal(created.preferredLanguage, "python");
  assert.ok(created.createdAt, "Must have createdAt ISO date");
  assert.ok(created.updatedAt, "Must have updatedAt ISO date");

  const active = await profileRepository.getActiveProfile();
  assert.deepEqual(active, created);
  assert.equal(await profileRepository.hasProfile(), true);
});

test("profileRepository - updates existing profile preserving id and createdAt", async () => {
  const active = await profileRepository.getActiveProfile();
  assert.ok(active, "Active profile should exist from previous test");

  const originalCreatedAt = active.createdAt;
  const originalId = active.id;

  const updated = await profileRepository.updateProfile(originalId, {
    displayName: "SuperHacker",
    preferredLanguage: "cpp",
  });

  assert.equal(updated.id, originalId);
  assert.equal(updated.displayName, "SuperHacker");
  assert.equal(updated.preferredLanguage, "cpp");
  assert.equal(updated.createdAt, originalCreatedAt);
  assert.notEqual(updated.updatedAt, originalCreatedAt);

  const reloaded = await profileRepository.getActiveProfile();
  assert.equal(reloaded?.displayName, "SuperHacker");
  assert.equal(reloaded?.preferredLanguage, "cpp");
});

test("profileRepository - deletes profile cleanly", async () => {
  const active = await profileRepository.getActiveProfile();
  assert.ok(active);

  await profileRepository.deleteProfile(active.id);

  const afterDelete = await profileRepository.getActiveProfile();
  assert.equal(afterDelete, null);
  assert.equal(await profileRepository.hasProfile(), false);
});

test("profileRepository - rejects saving when invalid display name is provided", async () => {
  await assert.rejects(
    async () => {
      await profileRepository.saveProfile({
        displayName: " ",
        avatarId: "glitch-bot",
        experienceLevel: "beginner",
        preferredLanguage: "python",
      });
    },
    /Display name cannot be empty/i
  );
});
