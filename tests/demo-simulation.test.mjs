import test from "node:test";
import assert from "node:assert/strict";

import {
  DEMO_PROBLEM_ID,
  DEMO_SOLVED_PYTHON,
  DEMO_INCORRECT_PYTHON,
  isCodeMatchingDemoSolved,
  isCodeMatchingDemoIncorrect,
  getSimulatedAcceptedResult,
  getSimulatedWrongAnswerResult,
  getSimulatedExecutionResult,
} from "../lib/demo/demo-simulation.ts";

test("demo-simulation - identifies solved and incorrect Python demonstration code", () => {
  assert.equal(DEMO_PROBLEM_ID, "sum-two-integers");

  // Solved matching
  assert.equal(isCodeMatchingDemoSolved(DEMO_SOLVED_PYTHON), true);
  assert.equal(isCodeMatchingDemoSolved(DEMO_SOLVED_PYTHON + "\n  \n"), true);
  assert.equal(isCodeMatchingDemoSolved(DEMO_INCORRECT_PYTHON), false);
  assert.equal(isCodeMatchingDemoSolved("print('hello')"), false);

  // Incorrect matching
  assert.equal(isCodeMatchingDemoIncorrect(DEMO_INCORRECT_PYTHON), true);
  assert.equal(isCodeMatchingDemoIncorrect(DEMO_INCORRECT_PYTHON + "   "), true);
  assert.equal(isCodeMatchingDemoIncorrect(DEMO_SOLVED_PYTHON), false);
  assert.equal(isCodeMatchingDemoIncorrect("x = 1"), false);
});

test("demo-simulation - generates simulated ACCEPTED verdict with 100% score", () => {
  const result = getSimulatedAcceptedResult();

  assert.equal(result.problemId, DEMO_PROBLEM_ID);
  assert.equal(result.language, "python");
  assert.equal(result.overallVerdict, "ACCEPTED");
  assert.equal(result.passedTests, 5);
  assert.equal(result.totalTests, 5);
  assert.equal(result.scorePercentage, 100);
  assert.equal(result.testResults.length, 5);

  // Check visible vs hidden test cases
  const visible = result.testResults.filter((t) => !t.isHidden);
  const hidden = result.testResults.filter((t) => t.isHidden);

  assert.equal(visible.length, 2);
  assert.equal(hidden.length, 3);

  // Hidden test cases must not expose input or expected output
  hidden.forEach((t) => {
    assert.equal(t.input, undefined);
    assert.equal(t.expectedOutput, undefined);
    assert.equal(t.passed, true);
  });
});

test("demo-simulation - generates simulated WRONG_ANSWER verdict with 20% score", () => {
  const result = getSimulatedWrongAnswerResult();

  assert.equal(result.problemId, DEMO_PROBLEM_ID);
  assert.equal(result.overallVerdict, "WRONG_ANSWER");
  assert.equal(result.passedTests, 1);
  assert.equal(result.totalTests, 5);
  assert.equal(result.scorePercentage, 20);

  const visible = result.testResults.filter((t) => !t.isHidden);
  const hidden = result.testResults.filter((t) => t.isHidden);

  assert.equal(visible.length, 2);
  assert.equal(hidden.length, 3);

  // Visible test cases have mismatched outputs
  const v1 = visible.find((t) => t.testCaseId === "sum-v1");
  assert.ok(v1);
  assert.equal(v1.passed, false);
  assert.equal(v1.expectedOutput, "30\n");
  assert.equal(v1.actualOutput, "-10\n");

  // Hidden test cases must not leak sensitive data
  hidden.forEach((t) => {
    assert.equal(t.input, undefined);
    assert.equal(t.expectedOutput, undefined);
  });
});

test("demo-simulation - simulates console execution without invoking backend", () => {
  // Solved execution: 10 + 25 = 35
  const resSolved = getSimulatedExecutionResult("10 25", true);
  assert.equal(resSolved.status, "SUCCESS");
  assert.equal(resSolved.exitCode, 0);
  assert.equal(resSolved.stdout, "35\n");
  assert.equal(resSolved.stderr, "");

  // Incorrect execution: 10 - 25 = -15
  const resIncorrect = getSimulatedExecutionResult("10 25", false);
  assert.equal(resIncorrect.status, "SUCCESS");
  assert.equal(resIncorrect.exitCode, 0);
  assert.equal(resIncorrect.stdout, "-15\n");
  assert.equal(resIncorrect.stderr, "");
});
