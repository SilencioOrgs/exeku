import test from "node:test";
import assert from "node:assert/strict";
import { dragTilt, hoverTilt } from "../lib/tilt.ts";

const rect = { left: 100, top: 100, width: 200, height: 300 };

test("the ID is flat at its center and leans the most at its edges", () => {
  assert.deepEqual(hoverTilt(200, 250, rect), { rx: 0, ry: 0, gx: 50 });
  assert.deepEqual(hoverTilt(300, 100, rect), { rx: 14, ry: 14, gx: 100 });
  assert.deepEqual(hoverTilt(9999, 9999, rect), { rx: -14, ry: 14, gx: 100 });
});

test("dragging never turns the ID past the angle that would show its back", () => {
  assert.equal(dragTilt(5000, 0).ry, 55);
  assert.equal(dragTilt(-5000, 0).ry, -55);
  assert.equal(dragTilt(0, 5000).rx, -35);
});
