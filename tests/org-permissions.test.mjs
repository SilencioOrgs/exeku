import test from "node:test";
import assert from "node:assert/strict";
import { can, checkEvent, checkPost, slugify } from "../lib/orgs/rules.ts";

test("only the president manages officers, officers publish and review, members do neither", () => {
  for (const permission of ["reviewApplications", "publish", "manageOfficers"]) assert.equal(can("president", permission), true);
  assert.equal(can("officer", "publish"), true);
  assert.equal(can("officer", "reviewApplications"), true);
  assert.equal(can("officer", "manageOfficers"), false);
  for (const role of ["member", null]) {
    for (const permission of ["reviewApplications", "publish", "manageOfficers"]) assert.equal(can(role, permission), false);
  }
});

test("events and posts are validated, and unknown options are rejected", () => {
  const event = { title: "CPE Days", summary: "A contest", access: "org-only", banner: "ember", featured: true };
  assert.equal(checkEvent(event).ok, true);
  assert.deepEqual(Object.keys(checkEvent({ title: "x", summary: "", access: "secret", banner: "<b>" }).fieldErrors).sort(), ["access", "banner", "summary", "title"]);
  assert.equal(checkEvent(null).ok, false);
  const post = checkPost({ title: "Results", body: "First paragraph.\n\nSecond paragraph." });
  assert.deepEqual(post.paragraphs, ["First paragraph.", "Second paragraph."]);
  assert.equal(checkPost({ title: "Results", body: "short" }).ok, false);
  assert.equal(slugify("CPE Days: Results!"), "cpe-days-results");
  assert.equal(slugify("!!!"), "post");
});
