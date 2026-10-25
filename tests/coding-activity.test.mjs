import test from "node:test";
import assert from "node:assert/strict";
import {
  CODING_ACTIVITY_EVENT,
  localDayKey,
  getActivityCalendar,
  recordCodingDay,
  readCodingDays,
  clearCodingDays,
} from "../lib/storage/coding-activity.ts";

test("coding activity generates a Sunday-aligned yearly calendar with no fake edits", () => {
  const date = new Date(2026, 9, 14, 12);
  const calendar = getActivityCalendar(date, ["2026-10-13"]);
  assert.equal(calendar.length % 7, 0);
  assert.equal(new Date(calendar[0].date + "T12:00:00").getDay(), 0);
  assert.equal(calendar.filter((cell) => cell.active).length, 1);
  assert.equal(calendar.find((cell) => cell.date === "2026-10-13")?.active, true);
  assert.equal(calendar.find((cell) => cell.date === "2026-10-14")?.active, false);
  assert.ok(calendar.slice(-1)[0].date >= "2026-10-14");
  assert.equal(calendar.some((cell) => cell.future && cell.active), false);
  assert.equal(localDayKey(date), "2026-10-14");
});

test("coding activity records successful edit days once per profile, with reset isolation", () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  const records = new Map();
  const events = [];
  globalThis.window = {
    localStorage: {
      getItem: (key) => records.get(key) ?? null,
      setItem: (key, value) => records.set(key, value),
      removeItem: (key) => records.delete(key),
    },
    dispatchEvent: (event) => { events.push(event); return true; },
  };
  globalThis.CustomEvent = class {
    constructor(type, options) { this.type = type; this.detail = options?.detail; }
  };
  try {
    const today = new Date(2026, 9, 14, 12);
    assert.equal(recordCodingDay("a", today), true);
    assert.equal(recordCodingDay("a", today), true);
    assert.deepEqual(readCodingDays("a"), ["2026-10-14"]);
    assert.equal(events.filter((e) => e.type === CODING_ACTIVITY_EVENT).length, 1);
    assert.equal(recordCodingDay("b", today), true);
    assert.deepEqual(readCodingDays("b"), ["2026-10-14"]);
    clearCodingDays("a");
    assert.deepEqual(readCodingDays("a"), []);
    assert.deepEqual(readCodingDays("b"), ["2026-10-14"]);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousCustomEvent === undefined) delete globalThis.CustomEvent;
    else globalThis.CustomEvent = previousCustomEvent;
  }
});

test("coding activity gracefully handles unavailable browser storage", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
      removeItem: () => { throw new Error("denied"); },
    },
  };
  try {
    assert.equal(readCodingDays("a"), null);
    assert.equal(recordCodingDay("a", new Date(2026, 9, 14)), false);
    assert.doesNotThrow(() => clearCodingDays("a"));
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
