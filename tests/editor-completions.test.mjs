import test from "node:test";
import assert from "node:assert/strict";
import { caretPosition, getCompletions } from "../lib/completions.ts";

const at = (text, lang = "python") => getCompletions(text, text.length, lang);
const words = (state) => state?.items.map((item) => item.word) ?? [];

test("typing pri in Python suggests print first and replaces only the typed word", () => {
  const state = at("x = 1\npri");
  assert.equal(words(state)[0], "print");
  assert.equal(state.prefix, "pri");
  assert.equal(state.start, "x = 1\n".length);
});

test("each language gets its own words, plus names already in the file", () => {
  assert.ok(words(at("Sys", "java")).includes("System"));
  assert.ok(words(at("push", "cpp")).includes("push_back"));
  assert.ok(words(at("pri", "c")).includes("printf"));
  assert.ok(!words(at("Sys", "python")).includes("System"));
  assert.deepEqual(words(at("total_count = 0\nfor x in a:\n    tot")), ["total_count"]);
});

test("common contest words win ties: ra offers range before raise", () => {
  assert.deepEqual(words(at("for x in ra")).slice(0, 2), ["range", "raise"]);
});

test("exact-case matches come before other cases, then shorter words", () => {
  assert.deepEqual(words(at("st", "java")).slice(0, 1), ["static"]);
  assert.ok(words(at("st", "java")).includes("String"));
});

test("no suggestions for one letter, mid-word, finished words, comments or strings", () => {
  assert.equal(at("p"), null);
  assert.equal(getCompletions("print", 3, "python"), null, "caret inside a word");
  assert.equal(at("print"), null, "nothing longer than print in Python");
  assert.equal(at("# pri"), null);
  assert.equal(at('x = "pri'), null);
  assert.equal(at("// Sys", "java"), null);
  assert.ok(at('x = "a" + pri'), "a closed string before the word is fine");
});

test("caret column counts tabs to the next stop", () => {
  assert.deepEqual(caretPosition("ab\n\tcd", 6), { line: 1, column: 6 });
  assert.deepEqual(caretPosition("abc", 2), { line: 0, column: 2 });
});
