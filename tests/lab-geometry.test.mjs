import test from "node:test";
import assert from "node:assert/strict";
import { bbHole, bbRail, PITCH } from "../lib/three/circuit.ts";
import { digitSegments } from "../lib/three/clock-spec.ts";

test("breadboard holes sit on the 2.54 mm grid with the center channel between e and f", () => {
  assert.ok(Math.abs(bbHole(2, "a").x - bbHole(1, "a").x - PITCH) < 1e-9);
  assert.ok(Math.abs(bbHole(1, "e").z - 3.81) < 1e-9);
  assert.ok(Math.abs(bbHole(1, "f").z + 3.81) < 1e-9);
  assert.ok(bbRail("far", "-", 0).z < bbHole(1, "j").z, "far rails are beyond row j");
});

test("7-segment digits light the right segments", () => {
  assert.equal(digitSegments(8).length, 7);
  assert.equal(digitSegments(1), "bc");
  assert.equal(digitSegments(0).includes("g"), false, "zero has no middle bar");
  assert.equal(digitSegments(42), "", "out of range lights nothing");
});
