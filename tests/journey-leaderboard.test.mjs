import test from "node:test";
import assert from "node:assert/strict";
import { leaderboardRows } from "../lib/three/journey.ts";

test("your team climbs from 7th to 1st as the tour scrolls", () => {
  const start = leaderboardRows(0);
  assert.equal(start.rank, 7);
  assert.equal(start.rows.length, 7);
  assert.ok(start.rows[6].you);
  const end = leaderboardRows(1);
  assert.equal(end.rank, 1);
  assert.ok(end.rows[0].you);
  assert.equal(leaderboardRows(5).rank, 1, "clamped");
});
