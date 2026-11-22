import {
  type IExecutionAdapter,
  type ExecutionRequest,
  type ExecutionResult,
  type ExecutionLanguage,
} from "@/types/execution";
import { getProblemById } from "@/lib/problems/catalog";
import { compareOutputs } from "@/lib/judge/output-normalizer";
import { createExecutionAdapter } from "@/lib/execution/engine";
import { ExecutionQueue, globalExecutionQueue, QueueAbortedError, type QueueClient } from "@/lib/execution/queue";
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
  async runCode(request: ExecutionRequest, client?: QueueClient, signal?: AbortSignal): Promise<ExecutionResult> {
    return this.queue.enqueue(() => this.adapter.execute(request, signal), client, signal);
  }

  /**
   * Evaluates code against a problem's test cases, computing deterministic verdicts
   * and redacting hidden test case inputs/outputs.
   */
  async judgeSubmission(
    problemRef: string | ProgrammingProblem,
    submission: {
      language: ExecutionLanguage;
      sourceCode: string;
      files?: { name: string; content: string }[];
    },
    client?: QueueClient,
    signal?: AbortSignal
  ): Promise<JudgingResult> {
    if (signal?.aborted) throw new QueueAbortedError();
    const problem = typeof problemRef === "string" ? getProblemById(problemRef) : problemRef;
    const problemId = typeof problemRef === "string" ? problemRef : problemRef.id;
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

    if (problem.testCases.length === 0) {
      return {
        problemId,
        language: submission.language,
        overallVerdict: "INTERNAL_JUDGE_ERROR",
        passedTests: 0,
        totalTests: 0,
        scorePercentage: 0,
        maxDurationMs: 0,
        testResults: [],
        error: `Problem '${problemId}' has no test cases configured.`,
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
    // Chunk to both the judge worker's 64-input cap and 8 MB total stdin cap (leaving headroom for JSON escaping).
    const MAX_BATCH_INPUTS = 64;
    const MAX_BATCH_STDIN_BYTES = 7 * 1024 * 1024;
    let batch: ExecutionResult[] | null = null;
    if (this.adapter.executeBatch) {
      const inputs = problem.testCases.map((testCase) => testCase.input);
      const chunks: string[][] = [];
      let currentChunk: string[] = [];
      let currentBytes = 0;
      for (const input of inputs) {
        const bytes = Buffer.byteLength(input, "utf8");
        if (
          currentChunk.length > 0 &&
          (currentChunk.length >= MAX_BATCH_INPUTS || currentBytes + bytes > MAX_BATCH_STDIN_BYTES)
        ) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentBytes = 0;
        }
        currentChunk.push(input);
        currentBytes += bytes;
      }
      if (currentChunk.length > 0) chunks.push(currentChunk);

      batch = await this.queue.enqueue(async () => {
        const collected: ExecutionResult[] = [];
        for (const chunk of chunks) {
          if (signal?.aborted) throw new QueueAbortedError();
          const results = await this.adapter.executeBatch!(baseRequest, chunk, signal);
          collected.push(...results);
          const first = results[0];
          if (
            first &&
            (first.status === "COMPILATION_ERROR" ||
              first.status === "SERVICE_UNAVAILABLE" ||
              first.status === "INTERNAL_ERROR")
          ) {
            break;
          }
        }
        return collected;
      }, client, signal);
    }

    for (const [index, testCase] of problem.testCases.entries()) {
      if (signal?.aborted) throw new QueueAbortedError();
      const execResult = batch
        ? batch[index]
        : await this.queue.enqueue(() => this.adapter.execute({ ...baseRequest, stdin: testCase.input }, signal), client, signal);
      if (!execResult) {
        return {
          problemId,
          language: submission.language,
          overallVerdict: "INTERNAL_JUDGE_ERROR",
          passedTests: 0,
          totalTests: problem.testCases.length,
          scorePercentage: 0,
          maxDurationMs,
          testResults: [],
          error: "The judge returned fewer test results than expected. Nothing was judged.",
        };
      }

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
          error: "The sandbox returned an unexpected error. Nothing was judged.",
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

    if (overallVerdict === "ACCEPTED" && testResults.length !== problem.testCases.length) {
      return {
        problemId,
        language: submission.language,
        overallVerdict: "INTERNAL_JUDGE_ERROR",
        passedTests: 0,
        totalTests: problem.testCases.length,
        scorePercentage: 0,
        maxDurationMs,
        testResults: [],
        error: "Judging ended early before all test cases were checked.",
      };
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
