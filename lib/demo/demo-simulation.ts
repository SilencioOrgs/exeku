/**
 * EXEKU — DEMO PROBLEM SIMULATION SERVICE
 *
 * Provides frontend-only demonstration simulation for evaluating the workspace UI,
 * submission modals, and result flows without requiring a running Piston sandbox.
 *
 * HONEST DEMONSTRATION GUARANTEE:
 * - Predefined simulated results are explicitly labeled as "SIMULATED / DEMO".
 * - Editing source code marks the buffer as "Custom code not evaluated".
 * - Never calls real /api/judge or /api/execute endpoints with fake data.
 * - Does not leak hidden test cases.
 */

import type { JudgingResult, TestCaseVerdict } from "@/lib/judge/judging-service";
import type { ExecutionResult } from "@/types/execution";

export const DEMO_PROBLEM_ID = "sum-two-integers";

export const DEMO_SOLVED_PYTHON = `# Exeku Demonstration Problem: Sum of Two Integers (Solved Example)
# Reads two space-separated integers from standard input and prints their sum.
import sys

def main():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        a = int(tokens[0])
        b = int(tokens[1])
        print(a + b)

if __name__ == "__main__":
    main()
`;

export const DEMO_INCORRECT_PYTHON = `# Exeku Demonstration Problem: Sum of Two Integers (Incorrect Example)
# Bug: Subtracts b from a instead of adding them.
import sys

def main():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        a = int(tokens[0])
        b = int(tokens[1])
        print(a - b)

if __name__ == "__main__":
    main()
`;

export function isCodeMatchingDemoSolved(code: string): boolean {
  return code.trim() === DEMO_SOLVED_PYTHON.trim();
}

export function isCodeMatchingDemoIncorrect(code: string): boolean {
  return code.trim() === DEMO_INCORRECT_PYTHON.trim();
}

export function getSimulatedAcceptedResult(): JudgingResult {
  const testResults: TestCaseVerdict[] = [
    {
      testCaseId: "sum-v1",
      isHidden: false,
      passed: true,
      verdict: "PASSED",
      durationMs: 42,
      input: "10 20",
      expectedOutput: "30\n",
      actualOutput: "30\n",
    },
    {
      testCaseId: "sum-v2",
      isHidden: false,
      passed: true,
      verdict: "PASSED",
      durationMs: 38,
      input: "-5 12",
      expectedOutput: "7\n",
      actualOutput: "7\n",
    },
    {
      testCaseId: "sum-h1",
      isHidden: true,
      passed: true,
      verdict: "PASSED",
      durationMs: 45,
    },
    {
      testCaseId: "sum-h2",
      isHidden: true,
      passed: true,
      verdict: "PASSED",
      durationMs: 39,
    },
    {
      testCaseId: "sum-h3",
      isHidden: true,
      passed: true,
      verdict: "PASSED",
      durationMs: 41,
    },
  ];

  return {
    problemId: DEMO_PROBLEM_ID,
    language: "python",
    overallVerdict: "ACCEPTED",
    passedTests: 5,
    totalTests: 5,
    scorePercentage: 100,
    maxDurationMs: 45,
    testResults,
  };
}

export function getSimulatedWrongAnswerResult(): JudgingResult {
  const testResults: TestCaseVerdict[] = [
    {
      testCaseId: "sum-v1",
      isHidden: false,
      passed: false,
      verdict: "WRONG_ANSWER",
      durationMs: 41,
      input: "10 20",
      expectedOutput: "30\n",
      actualOutput: "-10\n",
    },
    {
      testCaseId: "sum-v2",
      isHidden: false,
      passed: false,
      verdict: "WRONG_ANSWER",
      durationMs: 37,
      input: "-5 12",
      expectedOutput: "7\n",
      actualOutput: "-17\n",
    },
    {
      testCaseId: "sum-h1",
      isHidden: true,
      passed: true, // 0 - 0 == 0
      verdict: "PASSED",
      durationMs: 40,
    },
    {
      testCaseId: "sum-h2",
      isHidden: true,
      passed: false,
      verdict: "WRONG_ANSWER",
      durationMs: 38,
    },
    {
      testCaseId: "sum-h3",
      isHidden: true,
      passed: false,
      verdict: "WRONG_ANSWER",
      durationMs: 42,
    },
  ];

  return {
    problemId: DEMO_PROBLEM_ID,
    language: "python",
    overallVerdict: "WRONG_ANSWER",
    passedTests: 1,
    totalTests: 5,
    scorePercentage: 20,
    maxDurationMs: 42,
    testResults,
  };
}

export function getSimulatedExecutionResult(input: string, isSolved: boolean): ExecutionResult {
  const tokens = input.trim().split(/\s+/);
  if (tokens.length >= 2) {
    const a = parseInt(tokens[0], 10);
    const b = parseInt(tokens[1], 10);
    if (!isNaN(a) && !isNaN(b)) {
      const output = isSolved ? String(a + b) : String(a - b);
      return {
        status: "SUCCESS",
        exitCode: 0,
        stdout: output + "\n",
        stderr: "",
        durationMs: 38,
      };
    }
  }
  return {
    status: "SUCCESS",
    exitCode: 0,
    stdout: isSolved ? "8\n" : "-2\n",
    stderr: "",
    durationMs: 35,
  };
}
