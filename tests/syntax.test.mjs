import test from "node:test";
import assert from "node:assert/strict";
import { tokenize, tokenLines } from "../lib/syntax.ts";

const kinds = (code, lang) => tokenize(code, lang).filter((t) => t.type !== "plain" && t.type !== "variable").map((t) => `${t.type}:${t.text}`);

test("python: keywords, control flow, builtins, strings, numbers, comments, calls", () => {
  assert.deepEqual(kinds('def solve(n):\n    return n * 2  # double\nprint(f"{x}", 1e9, None)', "python"), [
    "keyword:def", "function:solve", "bracket0:(", "bracket0:)", "control:return", "number:2", "comment:# double",
    "function:print", "bracket0:(", 'string:f"{x}"', "number:1e9", "constant:None", "bracket0:)",
  ]);
  assert.equal(tokenize('s = """a\nb"""', "python").find((t) => t.type === "string").text, '"""a\nb"""');
  assert.deepEqual(tokenize("total = n", "python").filter((t) => t.type === "variable").map((t) => t.text), ["total", "n"]);
});

test("c++: preprocessor, include path, types, char literals, nested brackets cycle colors", () => {
  assert.deepEqual(kinds("#include <bits/stdc++.h>\nvector<int> a; if (a[(0)]) {}", "cpp"), [
    "preproc:#include", "string:<bits/stdc++.h>", "type:vector", "keyword:int", "control:if",
    "bracket0:(", "bracket1:[", "bracket2:(", "number:0", "bracket2:)", "bracket1:]", "bracket0:)", "bracket0:{", "bracket0:}",
  ]);
  assert.ok(kinds("char c = 'x'; /* note\n */", "cpp").includes("comment:/* note\n */"));
});

test("java: capitalized names are types and calls are functions", () => {
  assert.deepEqual(kinds("Scanner sc = new Scanner(System.in);", "java"), [
    "type:Scanner", "keyword:new", "type:Scanner", "bracket0:(", "type:System", "bracket0:)",
  ]);
});

test("tokens round-trip to the exact source and split per line", () => {
  const code = 'int main() {\n  printf("%d\\n", 42); // hi\n}\n';
  assert.equal(tokenize(code, "c").map((t) => t.text).join(""), code);
  assert.equal(tokenLines(code, "c").length, code.split("\n").length);
  assert.equal(tokenize("", "python").length, 0);
});
