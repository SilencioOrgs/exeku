import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";
import { restoreUpdates } from "../lib/accounts/restore.ts";

const school = { id: "lspu", campusId: "santa-cruz", name: "Laguna State Polytechnic University", shortName: "LSPU", location: "Laguna", campus: "Santa Cruz Campus (Main)", status: "listed" };
const saved = {
  userId: "u1",
  account: { email: "ada@lspu.edu.ph", age: 20, school, verified: true },
  displayName: "Ada L",
  avatarId: "pixel-cat",
  borderId: "gold",
  bio: "Hello",
  socialLinks: { github: "ada", linkedin: null, website: null },
};
const fresh = { id: "p1", ownerId: "u1", displayName: "Ada", avatarId: "glitch-bot", experienceLevel: "beginner", preferredLanguage: "python", createdAt: "", updatedAt: "" };

test("a new laptop restores the saved school and profile, so the student is not asked again", () => {
  const updates = restoreUpdates(fresh, saved);
  assert.deepEqual(updates.account, saved.account);
  assert.equal(updates.userType, "student");
  assert.equal(updates.displayName, "Ada L");
  assert.equal(updates.avatarId, "pixel-cat");
  assert.equal(updates.borderId, "gold");
  assert.equal(updates.bio, "Hello");
  assert.deepEqual(updates.socialLinks, { github: "ada", linkedin: undefined, website: undefined });

  const restored = { ...fresh, ...updates };
  assert.equal(restoreUpdates(restored, saved), null, "an up-to-date browser makes no writes");
});

test("restore never applies another account's data on a shared computer", () => {
  assert.equal(restoreUpdates({ ...fresh, ownerId: "someone-else" }, saved), null);
  assert.equal(restoreUpdates({ ...fresh, ownerId: undefined }, saved), null);
});

test("an account with no saved school keeps the welcome choice", () => {
  const updates = restoreUpdates(fresh, { ...saved, account: null });
  assert.equal(updates.account, undefined);
  assert.equal(updates.userType, undefined);
});

function loadRoute(row, viewer) {
  const source = readFileSync(new URL("../app/api/account/me/route.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  const asked = [];
  const db = () => ({
    from: () => ({ select: () => ({ eq: (column, value) => { asked.push([column, value]); return { maybeSingle: async () => ({ data: row, error: null }) }; } }) }),
  });
  vm.runInNewContext(output, {
    module: loaded,
    exports: loaded.exports,
    require: (name) => ({
      "next/server": { NextResponse },
      "@/lib/api/route-handler": { withApiErrors: (_label, fn) => fn() },
      "@/lib/auth/viewer": { getViewer: async () => viewer },
      "@/lib/db/client": { db, must: (result) => result.data },
    })[name] ?? (() => { throw Error(`unexpected import: ${name}`); })(),
  });
  return { GET: loaded.exports.GET, asked };
}

test("GET /api/account/me returns only the signed-in account's saved school and is never cached", async () => {
  const row = { display_name: "Ada L", avatar_id: "pixel-cat", border_id: "gold", bio: "Hello", social_links: { github: "ada" }, school_email: "ada@lspu.edu.ph", age: 20, school };
  const { GET, asked } = loadRoute(row, { id: "u1", name: "Ada", role: "student" });
  const res = await GET();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(asked, [["user_id", "u1"]], "identity comes from the session");
  const body = await res.json();
  assert.equal(body.userId, "u1");
  assert.deepEqual(body.account, { email: "ada@lspu.edu.ph", age: 20, school, verified: true });

  const signedOut = loadRoute(row, null);
  assert.equal((await signedOut.GET()).status, 401);

  const noSchool = loadRoute({ ...row, school: null, school_email: null, age: null }, { id: "u1", name: "Ada", role: "student" });
  assert.equal((await (await noSchool.GET()).json()).account, null);
});
