import test from "node:test";
import assert from "node:assert/strict";
import { parseSketch, BLINK_SKETCH } from "../lib/lab/blink.ts";

test("the starter blink sketch becomes on/print/delay/off/print/delay steps on pin 13", () => {
  const sketch = parseSketch(BLINK_SKETCH);
  assert.equal(sketch.error, undefined);
  assert.deepEqual(sketch.outputPins, [13]);
  assert.deepEqual(sketch.steps, [
    { kind: "write", pin: 13, high: true }, { kind: "print", text: "LED on" }, { kind: "delay", ms: 500 },
    { kind: "write", pin: 13, high: false }, { kind: "print", text: "LED off" }, { kind: "delay", ms: 500 },
  ]);
});

test("LED_BUILTIN maps to 13, commented code is ignored, delays are clamped", () => {
  const sketch = parseSketch("void setup(){pinMode(LED_BUILTIN,OUTPUT);} void loop(){ /* delay(1) */ digitalWrite(LED_BUILTIN,HIGH); delay(5); delay(999999); // delay(3)\n}");
  assert.deepEqual(sketch.outputPins, [13]);
  assert.deepEqual(sketch.steps.filter((s) => s.kind === "delay").map((s) => s.ms), [50, 10000]);
});

test("missing setup/loop or delay explains the problem instead of running", () => {
  assert.match(parseSketch("int x = 1;").error, /setup\(\).*loop\(\)/);
  assert.match(parseSketch("void setup(){} void loop(){ digitalWrite(13, HIGH); }").error, /delay/);
});
