import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";
import { hasUnsyncedLocalDetails, restoreUpdates } from "../lib/accounts/restore.ts";

const school = { id: "lspu", campusId: "santa-cruz", name: "Laguna State Polytechnic University", shortName: "LSPU", location: "Laguna", campus: "Santa Cruz Campus (Main)", status: "listed" };
const saved = {
  userId: "u1",
  account: { email: "ada@lspu.edu.ph", age: 20, school, verified: true },
  displayName: "Ada L",
  avatarId: "pixel-cat",
  borderId: "gold",
  bio: "Hello",
  socialLinks: { github: "ada", linkedin: null, website: "https://ada.dev/" },
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
  assert.deepEqual(updates.socialLinks, { github: "ada", linkedin: undefined, website: "https://ada.dev/" });

  const restored = { ...fresh, ...updates };
  assert.equal(restoreUpdates(restored, saved), null, "an up-to-date browser makes no writes");
  assert.equal(hasUnsyncedLocalDetails(restored, saved), false);
});

test("empty server links or bio do not wipe a PC's saved links, and are flagged for one-click sync", () => {
  const pcProfile = {
    ...fresh,
    displayName: "Ada L",
    avatarId: "pixel-cat",
    borderId: "gold",
    bio: "Hello",
    socialLinks: { github: "ada", website: "https://ada.dev/" },
  };
  const emptyServer = { ...saved, bio: null, socialLinks: {} };
  const updates = restoreUpdates(pcProfile, emptyServer);
  assert.equal(updates?.bio, undefined, "must not erase local bio");
  assert.equal(updates?.socialLinks, undefined, "must not erase local social links");
  assert.equal(hasUnsyncedLocalDetails(pcProfile, emptyServer), true);
  assert.equal(hasUnsyncedLocalDetails({ ...pcProfile, ownerId: "other-user" }, emptyServer), false, "shared PC must not flag another user's links");
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

function loadRoute(row, viewer, options = {}) {
  const source = readFileSync(new URL("../app/api/account/me/route.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  const asked = [];
  const db = () => ({
    from: (table) => ({
      select: (cols) => ({
        eq: (column, value) => {
          asked.push([table, column, value]);
          return {
            maybeSingle: async () => {
              if (table === "profiles" && options.missingBirthdayColumn && /birthday/.test(cols)) {
                return { data: null, error: { code: "42703", message: "column profiles.birthday does not exist" } };
              }
              if (table === "faculty_requests") {
                return { data: options.facultyRequest ?? null, error: null };
              }
              return { data: row, error: null };
            },
          };
        },
      }),
    }),
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

test("GET /api/account/me returns only the signed-in account's saved school, birthday, and faculty role, and is never cached", async () => {
  const row = { display_name: "Ada L", avatar_id: "pixel-cat", border_id: "gold", bio: "Hello", social_links: { github: "ada" }, school_email: "ada@lspu.edu.ph", age: 20, birthday: "2006-05-10", school };
  const { GET, asked } = loadRoute(row, { id: "u1", name: "Ada", role: "student" });
  const res = await GET();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(asked, [["profiles", "user_id", "u1"], ["faculty_requests", "user_id", "u1"]], "identity comes from the session");
  const body = await res.json();
  assert.equal(body.userId, "u1");
  assert.equal(body.userType, "student");
  assert.deepEqual(body.account, { email: "ada@lspu.edu.ph", age: 20, birthday: "2006-05-10", school, verified: true });

  const signedOut = loadRoute(row, null);
  assert.equal((await signedOut.GET()).status, 401);

  const noSchool = loadRoute({ ...row, school: null, school_email: null, age: null, birthday: null }, { id: "u1", name: "Ada", role: "student" });
  assert.equal((await (await noSchool.GET()).json()).account, null);

  // Pending faculty accounts restore userType="faculty" so they skip WelcomeDialog on a new laptop too.
  const pendingFaculty = loadRoute(
    { ...row, school: null, school_email: null, age: null, birthday: null },
    { id: "u1", name: "Ada", role: "student" },
    { facultyRequest: { status: "pending" } },
  );
  const facultyBody = await (await pendingFaculty.GET()).json();
  assert.equal(facultyBody.userType, "faculty");
  assert.equal(restoreUpdates(fresh, facultyBody)?.userType, "faculty");

  // Missing birthday column degrades gracefully before SQL migration runs.
  const preMigration = loadRoute(
    { ...row, birthday: undefined },
    { id: "u1", name: "Ada", role: "student" },
    { missingBirthdayColumn: true },
  );
  const preBody = await (await preMigration.GET()).json();
  assert.equal(preBody.account?.age, 20);
  assert.equal(preBody.account?.birthday, undefined);
});
