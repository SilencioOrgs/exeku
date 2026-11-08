import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rankScores } from "../lib/competition/rank.ts";
import { githubUrl, linkedinUrl, parseGithub, parseLinkedin } from "../lib/social-links.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("leaderboard sorts by points and ties share a rank", () => {
  const score = (name, points) => ({ name, points, solved: 1, campusId: "c", campusName: "C" });
  const ranked = rankScores([score("low", 10), score("tieA", 50), score("tieB", 50)]);
  assert.deepEqual(ranked.map((e) => [e.name, e.rank]), [["tieA", 1], ["tieB", 1], ["low", 3]]);
});

test("social links accept usernames and profile links, and reject other sites", () => {
  assert.equal(parseGithub("https://github.com/asnor/").handle, "asnor");
  assert.equal(parseGithub("@asnor").handle, "asnor");
  assert.equal(parseLinkedin("https://www.linkedin.com/in/asnor-sumdad?trk=x").handle, "asnor-sumdad");
  assert.deepEqual(parseGithub("   "), {});
  for (const bad of ["javascript:alert(1)", "https://evil.com/asnor", "github.com/a/b", "a b"]) assert.ok(parseGithub(bad).error, bad);
  for (const bad of ["javascript:alert(1)", "https://evil.com/in/asnor"]) assert.ok(parseLinkedin(bad).error, bad);
  assert.equal(githubUrl("a"), "https://github.com/a");
  assert.equal(linkedinUrl("a"), "https://www.linkedin.com/in/a");
});

test("mock names and the mock module stay out of everything except the repository", () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : /\.tsx?$/.test(e.name) ? [full] : [];
  });
  const sources = ["app", "components", "hooks", "lib"].flatMap((d) => walk(path.join(root, d)));
  for (const file of sources) {
    const rel = path.relative(root, file).replaceAll("\\", "/");
    if (rel.startsWith("lib/mock/")) continue;
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /Al Thor|Jan Eriz/, rel);
    if (rel !== "lib/competition/repository.ts" && rel !== "lib/orgs/repository.ts") assert.doesNotMatch(source, /lib\/mock/, rel);
  }
});
