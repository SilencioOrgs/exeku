import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { bbHole, bbRail, buildEnclosure, PITCH } from "../lib/three/circuit.ts";

test("breadboard holes sit on the 2.54 mm grid with the center channel between e and f", () => {
  assert.ok(Math.abs(bbHole(2, "a").x - bbHole(1, "a").x - PITCH) < 1e-9);
  assert.ok(Math.abs(bbHole(1, "e").z - 3.81) < 1e-9);
  assert.ok(Math.abs(bbHole(1, "f").z + 3.81) < 1e-9);
  assert.ok(bbRail("far", "-", 0).z < bbHole(1, "j").z, "far rails are beyond row j");
});

test("enclosure wraps the parts with the gap and wall on every side", () => {
  const bounds = new THREE.Box3(new THREE.Vector3(-90, 0, -27), new THREE.Vector3(88, 30, 27));
  const { outer, wall } = buildEnclosure(bounds, { wall: 2.4, gap: 5 });
  assert.equal(wall, 2.4);
  assert.ok(Math.abs(outer.w - (178 + 10 + 4.8)) < 1e-9);
  assert.ok(Math.abs(outer.d - (54 + 10 + 4.8)) < 1e-9);
  assert.ok(outer.h >= 30 + wall, "lid clears the tallest part");
});
