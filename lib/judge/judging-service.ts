import {
  type IExecutionAdapter,
  type ExecutionRequest,
  type ExecutionResult,
  type ExecutionLanguage,
} from "@/types/execution";
import { getProblemById } from "@/lib/problems/catalog";
import { compareOutputs } from "@/lib/judge/output-normalizer";
import { createExecutionAdapter } from "@/lib/execution/engine";
import { ExecutionQueue, globalExecutionQueue, type QueueClient } from "@/lib/execution/queue";
import type { ProgrammingProblem } from "@/types/problem";

export type OverallVerdict =
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "INTERNAL_JUDGE_ERROR"
  | "SERVICE_UNAVAILABLE";

export interface TestCaseVerdict {
  testCaseId: string;
  isHidden: boolean;
  passed: boolean;
  verdict:
    | "PASSED"
    | "WRONG_ANSWER"
    | "TIME_LIMIT_EXCEEDED"
    | "RUNTIME_ERROR"
    | "MEMORY_LIMIT_EXCEEDED"
    | "COMPILATION_ERROR";
  durationMs: number;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  compilerOutput?: string;
  stderr?: string;
}

export interface SolveMilestone {
  firstSolve: boolean;
  points: number;
  solved: number;
}

export interface JudgingResult {
  /** Set by the judge route when the answer was accepted and saved. */
  milestone?: SolveMilestone;
  problemId: string;
  language: ExecutionLanguage;
  overallVerdict: OverallVerdict;
  passedTests: number;
  totalTests: number;
  scorePercentage: number;
  maxDurationMs: number;
  testResults: TestCaseVerdict[];
  compilerOutput?: string;
  error?: string;
}

export interface JudgingServiceOptions {
  adapter?: IExecutionAdapter;
  queue?: ExecutionQueue;
}

/** The only place a test result is built. A hidden test reports its verdict and nothing from its input or the program's output. */
function testVerdict(
  testCase: ProgrammingProblem["testCases"][number],
  verdict: TestCaseVerdict["verdict"],
  run: ExecutionResult,
  compilerOutput?: string
): TestCaseVerdict {
  return {
    testCaseId: testCase.id,
    isHidden: testCase.isHidden,
    passed: verdict === "PASSED",
    verdict,
    durationMs: run.durationMs,
    compilerOutput,
    ...(testCase.isHidden
      ? {}
      : { input: testCase.input, expectedOutput: testCase.expectedOutput, actualOutput: run.stdout, stderr: run.stderr }),
  };
}

export class JudgingService {
  private readonly adapter: IExecutionAdapter;
  private readonly queue: ExecutionQueue;

  constructor(options?: JudgingServiceOptions) {
    this.adapter = options?.adapter || createExecutionAdapter();
    this.queue = options?.queue || globalExecutionQueue;
  }

  /**
   * Executes code with optional standard input through the execution queue.
   */
  async runCode(request: ExecutionRequest, client?: QueueClient): Promise<ExecutionResult> {
    return this.queue.enqueue(() => this.adapter.execute(request), client);
  }

  /**
   * Evaluates code against a problem's test cases, computing deterministic verdicts
   * and redacting hidden test case inputs/outputs.
   */
  async judgeSubmission(
    problemId: string,
    submission: {
      language: ExecutionLanguage;
      sourceCode: string;
      files?: { name: string; content: string }[];
    },
    client?: QueueClient
  ): Promise<JudgingResult> {
    const problem = getProblemById(problemId);
    if (!problem) {
      return {
        problemId,
        language: submission.language,
        overallVerdict: "INTERNAL_JUDGE_ERROR",
        passedTests: 0,
        totalTests: 0,
        scorePercentage: 0,
        maxDurationMs: 0,
        testResults: [],
        error: `Problem with ID '${problemId}' not found in catalog.`,
      };
    }

    const testResults: TestCaseVerdict[] = [];
    let passedTests = 0;
    let maxDurationMs = 0;
    let compilationError: string | undefined = undefined;
    let overallVerdict: OverallVerdict = "ACCEPTED";

    const baseRequest: ExecutionRequest = {
      language: submission.language,
      sourceCode: submission.sourceCode,
      files: submission.files,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
    };
    // Engines that support batches compile once and take one queue slot for the whole submission.
    const batch = this.adapter.executeBatch && problem.testCases.length > 0
      ? await this.queue.enqueue(() => this.adapter.executeBatch!(baseRequest, problem.testCases.map((testCase) => testCase.input)), client)
      : null;

    for (const [index, testCase] of problem.testCases.entries()) {
      const execResult = batch
        ? batch[index]
        : await this.queue.enqueue(() => this.adapter.execute({ ...baseRequest, stdin: testCase.input }), client);

      if (execResult.durationMs > maxDurationMs) {
        maxDurationMs = execResult.durationMs;
      }

      // Handle service unavailability
      if (execResult.status === "SERVICE_UNAVAILABLE") {
        return {
          problemId,
          language: submission.language,
          overallVerdict: "SERVICE_UNAVAILABLE",
          passedTests: 0,
          totalTests: problem.testCases.length,
          scorePercentage: 0,
          maxDurationMs,
          testResults: [],
          error: execResult.stderr || "Sandbox execution engine is unreachable.",
        };
      }

      // Any other non-verdict status (sandbox HTTP error, unknown state) is the judge's failure,
      // never the student's wrong answer.
      if (!["SUCCESS", "COMPILATION_ERROR", "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED", "RUNTIME_ERROR"].includes(execResult.status)) {
        return {
          problemId,
          language: submission.language,
          overallVerdict: "INTERNAL_JUDGE_ERROR",
          passedTests: 0,
          totalTests: problem.testCases.length,
          scorePercentage: 0,
          maxDurationMs,
          testResults: [],
          error: execResult.error || "The sandbox returned an unexpected error. Nothing was judged.",
        };
      }

      // Handle compilation error -> short circuit remaining tests
      if (execResult.status === "COMPILATION_ERROR") {
        compilationError = execResult.compilerOutput || execResult.stderr;
        overallVerdict = "COMPILATION_ERROR";
        testResults.push(testVerdict(testCase, "COMPILATION_ERROR", execResult, compilationError));
        break;
      }

      // Handle programs that ended early: timeout, runtime error, memory limit
      if (execResult.status === "TIME_LIMIT_EXCEEDED" || execResult.status === "RUNTIME_ERROR" || execResult.status === "MEMORY_LIMIT_EXCEEDED") {
        if (overallVerdict === "ACCEPTED") overallVerdict = execResult.status;
        testResults.push(testVerdict(testCase, execResult.status, execResult));
        continue;
      }

      // Compare output with normalizer
      const passed = compareOutputs(execResult.stdout, testCase.expectedOutput);
      if (passed) passedTests++;
      else if (overallVerdict === "ACCEPTED") overallVerdict = "WRONG_ANSWER";
      testResults.push(testVerdict(testCase, passed ? "PASSED" : "WRONG_ANSWER", execResult));
    }

    const totalTests = problem.testCases.length;
    const scorePercentage =
      totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    return {
      problemId,
      language: submission.language,
      overallVerdict,
      passedTests,
      totalTests,
      scorePercentage,
      maxDurationMs,
      testResults,
      compilerOutput: compilationError,
    };
  }
}

export const defaultJudgingService = new JudgingService();
