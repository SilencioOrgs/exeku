import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { isObject, text } from "../lib/accounts/rules.ts";
import { unlocksAt } from "../lib/avatars.ts";
import { parseWebsite } from "../lib/social-links.ts";
import { fakeDb, must } from "./fixtures/fake-db.mjs";

function load(path, modules) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, { module: loaded, exports: loaded.exports, require: (name) => { if (name in modules) return modules[name]; throw Error(`unexpected import: ${name}`); } });
  return loaded.exports;
}

const person = (user_id, campus_id = null) => ({ user_id, display_name: user_id, avatar_id: "glitch-bot", border_id: "none", campus_id, school: campus_id ? { campus: campus_id } : null, school_email: `${user_id}@school.edu`, age: 20, bio: "hi", social_links: { github: "octo" } });
const accepted = (requester, addressee) => ({ requester, addressee, status: "accepted" });

function harness(friendships = []) {
  const tables = { profiles: [person("me", "sc"), person("mate", "sc"), person("far", "other"), person("pal", "other")], friendships, leaderboard: [{ user_id: "far", solved: 3, points: 500 }] };
  const repo = load("lib/friends/repository.ts", { "server-only": {}, "@/lib/db/client": { db: fakeDb(tables), must }, "@/lib/accounts/rules": { isObject, text } });
  return { tables, repo, me: { id: "me", name: "me", campusId: "sc" } };
}

test("classmates are suggested without leaking email or age", async () => {
  const { repo, me } = harness();
  const feed = await repo.getFriendsFeed(me, "");
  assert.equal(feed.people.map((p) => p.id).join(), "mate");
  assert.equal(feed.people[0].sameCampus, true);
  assert.doesNotMatch(JSON.stringify(feed), /school\.edu|"age"/);
});

test("a friend's friend is suggested with a mutual count even from another campus", async () => {
  const { repo, me } = harness([accepted("me", "pal"), accepted("pal", "far")]);
  const feed = await repo.getFriendsFeed(me, "");
  const far = feed.people.find((p) => p.id === "far");
  assert.equal(far.mutualFriends, 1);
  assert.equal(far.sameCampus, false);
  assert.equal(feed.friends.map((p) => p.id).join(), "pal");
});

test("an opened profile shows score, links and relationship, never email or age", async () => {
  const { repo, me } = harness([accepted("me", "pal"), accepted("pal", "far")]);
  const far = await repo.getPublicProfile(me, "far");
  assert.equal(far.solved, 3);
  assert.equal(far.socialLinks.github, "octo");
  assert.equal(far.mutualFriends, 1);
  assert.equal(far.isSelf, false);
  assert.doesNotMatch(JSON.stringify(far), /school\.edu|"age"/);
  assert.equal(await repo.getPublicProfile(me, "ghost"), null);
});

test("only the person who received a request can accept it", async () => {
  const { tables, repo, me } = harness([{ requester: "me", addressee: "far", status: "pending" }]);
  const denied = await repo.performFriendAction(me, { action: "accept", userId: "far" });
  assert.equal(denied.status, 404);
  assert.equal(tables.friendships[0].status, "pending");
  const asFar = await repo.performFriendAction({ id: "far", name: "far" }, { action: "accept", userId: "me" });
  assert.equal(asFar.ok, true);
  assert.equal(tables.friendships[0].status, "accepted");
});

test("you cannot friend yourself, and removing only touches your own pair", async () => {
  const { tables, repo, me } = harness([accepted("pal", "far")]);
  assert.equal((await repo.performFriendAction(me, { action: "request", userId: "me" })).status, 400);
  assert.equal((await repo.performFriendAction(me, { action: "remove", userId: "far" })).ok, true);
  assert.equal(tables.friendships.length, 1);
});

test("portfolio links must be plain web addresses", () => {
  assert.equal(parseWebsite("asnor.dev").url, "https://asnor.dev/");
  assert.equal(parseWebsite("http://a.io/x").url, "http://a.io/x");
  assert.deepEqual(parseWebsite("  "), {});
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "localhost", "https://u:p@a.io"]) assert.ok(parseWebsite(bad).error, bad);
});

test("four avatars are free and the rest need solved problems", () => {
  assert.equal(unlocksAt("glitch-bot"), 0);
  assert.equal(unlocksAt("matrix-mage"), 0);
  assert.equal(unlocksAt("retro-ninja"), 25);
});
