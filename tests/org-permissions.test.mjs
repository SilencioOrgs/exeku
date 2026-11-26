import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { AVATAR_BORDERS, borderSrc } from "../lib/avatar-borders.ts";
import { BANNERS, bannerSrc } from "../lib/banners.ts";
import { can, canViewEvent, checkEvent, eventAccessLabel } from "../lib/orgs/rules.ts";

test("only the president manages officers, officers and advisers publish and review, members do neither", () => {
  for (const permission of ["reviewApplications", "publish", "manageOfficers"]) assert.equal(can("president", permission), true);
  assert.equal(can("officer", "publish"), true);
  assert.equal(can("officer", "reviewApplications"), true);
  assert.equal(can("officer", "manageOfficers"), false);
  assert.equal(can(null, "publish", true), true);
  assert.equal(can(null, "reviewApplications", true), true);
  assert.equal(can(null, "manageOfficers", true), false);
  for (const role of ["member", null]) {
    for (const permission of ["reviewApplications", "publish", "manageOfficers"]) assert.equal(can(role, permission), false);
  }
});

test("events are shown by access: open to all, campus to that campus, org to its members", () => {
  const event = (access) => ({ access, campusId: "scc", orgId: "acoes" });
  const outsider = { campusIds: [], orgIds: [] };
  const sameCampus = { campusIds: ["scc"], orgIds: [] };
  const otherCampus = { campusIds: ["siniloan"], orgIds: [] };
  const member = { campusIds: [], orgIds: ["acoes"] };

  assert.equal(canViewEvent(event("open"), outsider), true);
  assert.equal(canViewEvent(event("campus-only"), outsider), false);
  assert.equal(canViewEvent(event("campus-only"), otherCampus), false);
  assert.equal(canViewEvent(event("campus-only"), sameCampus), true);
  assert.equal(canViewEvent(event("org-only"), sameCampus), false);
  assert.equal(canViewEvent(event("org-only"), member), true);
  assert.equal(eventAccessLabel({ access: "campus-only", campusName: "Main", orgName: "X" }), "Campus only: Main");
});

test("events are validated, must be upcoming, and unknown options are rejected", () => {
  const today = "2026-11-08";
  const event = { title: "CPE Days", summary: "A contest", startsOn: "2026-12-01", access: "campus-only", banner: "podium", featured: true };
  assert.equal(checkEvent(event, today).ok, true);
  assert.equal(checkEvent({ ...event, startsOn: today }, today).ok, true);
  assert.match(checkEvent({ ...event, startsOn: "2026-11-07" }, today).fieldErrors.startsOn, /later/);
  assert.deepEqual(Object.keys(checkEvent({ title: "x", summary: "", startsOn: "soon", access: "secret", banner: "<b>" }, today).fieldErrors).sort(), ["access", "banner", "startsOn", "summary", "title"]);
  assert.equal(checkEvent(null, today).ok, false);
});

test("impossible calendar dates are refused, real leap days are not", () => {
  const today = "2026-11-08";
  const event = { title: "CPE Days", summary: "A contest", access: "open", banner: "podium" };
  assert.match(checkEvent({ ...event, startsOn: "2027-02-31" }, today).fieldErrors.startsOn, /Choose the event date/);
  assert.match(checkEvent({ ...event, startsOn: "2027-13-01" }, today).fieldErrors.startsOn, /Choose the event date/);
  assert.equal(checkEvent({ ...event, startsOn: "2028-02-29" }, today).ok, true);
});

test("timed competitions validate solo/team mode, schedule window, and selected problems", () => {
  const now = Date.parse("2026-11-08T10:00:00Z");
  const base = {
    isCompetition: true,
    title: "Algorithm Sprint",
    summary: "Solve 3 problems in 1 hour.",
    access: "org-only",
    banner: "podium",
    startsAt: "2026-11-08T11:00:00Z",
    endsAt: "2026-11-08T12:00:00Z",
    problemIds: ["hello-world"],
  };
  const solo = checkEvent({ ...base, mode: "solo" }, "2026-11-08", now);
  assert.equal(solo.ok, true);
  assert.equal(solo.tournament.teamSize, 1);

  const team = checkEvent({ ...base, mode: "team", teamSize: 4 }, "2026-11-08", now);
  assert.equal(team.ok, true);
  assert.equal(team.tournament.teamSize, 4);

  const badTeam = checkEvent({ ...base, mode: "team", teamSize: 1, problemIds: [], endsAt: "2026-11-08T11:01:00Z" }, "2026-11-08", now);
  assert.equal(badTeam.ok, false);
  assert.ok(badTeam.fieldErrors.teamSize);
  assert.ok(badTeam.fieldErrors.problemIds);
  assert.ok(badTeam.fieldErrors.endsAt);
});

test("banner art resolves to a shipped file and never echoes an unknown value into the path", () => {
  assert.equal(bannerSrc("podium"), "/banners/podium.webp");
  assert.equal(bannerSrc("../../secret"), "/banners/keycaps.webp");
  assert.equal(bannerSrc(undefined), "/banners/keycaps.webp");
  for (const { id } of BANNERS) assert.equal(existsSync(`public/banners/${id}.webp`), true, id);
});

test("avatar borders resolve to shipped art, and none or unknown means no frame", () => {
  for (const value of ["none", undefined, "../../secret"]) assert.equal(borderSrc(value), null);
  for (const { id } of AVATAR_BORDERS.filter((b) => b.id !== "none")) assert.equal(existsSync(`public${borderSrc(id)}`), true, id);
});
