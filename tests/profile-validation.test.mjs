import test from "node:test";
import assert from "node:assert/strict";
import { validateDisplayName } from "../lib/profile-validation.ts";

test("validateDisplayName - valid alphanumeric names", () => {
  const result = validateDisplayName("PixelCoder");
  assert.equal(result.isValid, true);
  assert.equal(result.error, undefined);

  const spaced = validateDisplayName("Neo Hacker 42");
  assert.equal(spaced.isValid, true);

  const dashed = validateDisplayName("cyber-ninja_01");
  assert.equal(dashed.isValid, true);
});

test("validateDisplayName - trims surrounding whitespace", () => {
  const result = validateDisplayName("   RetroDev   ");
  assert.equal(result.isValid, true);
  assert.equal(result.trimmed, "RetroDev");
});

test("validateDisplayName - rejects empty or whitespace-only", () => {
  const empty = validateDisplayName("");
  assert.equal(empty.isValid, false);
  assert.match(empty.error, /cannot be empty/i);

  const spaces = validateDisplayName("     ");
  assert.equal(spaces.isValid, false);
  assert.match(spaces.error, /cannot be empty/i);
});

test("validateDisplayName - rejects names shorter than 2 characters", () => {
  const short = validateDisplayName("X");
  assert.equal(short.isValid, false);
  assert.match(short.error, /at least 2 characters/i);
});

test("validateDisplayName - rejects names longer than 32 characters", () => {
  const overlong = validateDisplayName("A".repeat(33));
  assert.equal(overlong.isValid, false);
  assert.match(overlong.error, /at most 32 characters/i);
});

test("validateDisplayName - rejects dangerous or invalid symbols", () => {
  const script = validateDisplayName("<script>alert(1)</script>");
  assert.equal(script.isValid, false);
  assert.match(script.error, /letters, numbers, spaces, underscores, and dashes/i);
});
