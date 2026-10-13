import {
  type IExecutionAdapter,
  type ExecutionRequest,
  type ExecutionResult,
  type ExecutionLanguage,
} from "@/types/execution";
import { getProblemById } from "@/lib/problems/catalog";
import { compareOutputs } from "@/lib/judge/output-normalizer";
import { PistonAdapter } from "@/lib/execution/piston-adapter";
import { ExecutionQueue, globalExecutionQueue } from "@/lib/execution/queue";

export type OverallVerdict =
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
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
    | "COMPILATION_ERROR";
  durationMs: number;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  compilerOutput?: string;
  stderr?: string;
}

export interface JudgingResult {
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

export class JudgingService {
  private readonly adapter: IExecutionAdapter;
  private readonly queue: ExecutionQueue;

  constructor(options?: JudgingServiceOptions) {
    this.adapter = options?.adapter || new PistonAdapter();
    this.queue = options?.queue || globalExecutionQueue;
  }

  /**
   * Executes code with optional standard input through the execution queue.
   */
  async runCode(request: ExecutionRequest): Promise<ExecutionResult> {
    return this.queue.enqueue(() => this.adapter.execute(request));
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
    }
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

    for (const testCase of problem.testCases) {
      const execRequest: ExecutionRequest = {
        language: submission.language,
        sourceCode: submission.sourceCode,
        stdin: testCase.input,
        timeLimitMs: problem.timeLimitMs,
        memoryLimitKb: problem.memoryLimitKb,
      };

      const execResult = await this.queue.enqueue(() =>
        this.adapter.execute(execRequest)
      );

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

      // Handle compilation error -> short circuit remaining tests
      if (execResult.status === "COMPILATION_ERROR") {
        compilationError = execResult.compilerOutput || execResult.stderr;
        overallVerdict = "COMPILATION_ERROR";

        testResults.push({
          testCaseId: testCase.id,
          isHidden: testCase.isHidden,
          passed: false,
          verdict: "COMPILATION_ERROR",
          durationMs: execResult.durationMs,
          compilerOutput: compilationError,
          stderr: execResult.stderr,
        });
        break;
      }

      // Handle timeout
      if (execResult.status === "TIME_LIMIT_EXCEEDED") {
        if (overallVerdict === "ACCEPTED") overallVerdict = "TIME_LIMIT_EXCEEDED";
        testResults.push({
          testCaseId: testCase.id,
          isHidden: testCase.isHidden,
          passed: false,
          verdict: "TIME_LIMIT_EXCEEDED",
          durationMs: execResult.durationMs,
          stderr: execResult.stderr,
          // Redaction: only expose inputs on visible test cases
          input: testCase.isHidden ? undefined : testCase.input,
          expectedOutput: testCase.isHidden ? undefined : testCase.expectedOutput,
          actualOutput: testCase.isHidden ? undefined : execResult.stdout,
        });
        continue;
      }

      // Handle runtime error
      if (execResult.status === "RUNTIME_ERROR") {
        if (overallVerdict === "ACCEPTED") overallVerdict = "RUNTIME_ERROR";
        testResults.push({
          testCaseId: testCase.id,
          isHidden: testCase.isHidden,
          passed: false,
          verdict: "RUNTIME_ERROR",
          durationMs: execResult.durationMs,
          stderr: execResult.stderr,
          input: testCase.isHidden ? undefined : testCase.input,
          expectedOutput: testCase.isHidden ? undefined : testCase.expectedOutput,
          actualOutput: testCase.isHidden ? undefined : execResult.stdout,
        });
        continue;
      }

      // Compare output with normalizer
      const matches = compareOutputs(execResult.stdout, testCase.expectedOutput);

      if (matches) {
        passedTests++;
        testResults.push({
          testCaseId: testCase.id,
          isHidden: testCase.isHidden,
          passed: true,
          verdict: "PASSED",
          durationMs: execResult.durationMs,
          input: testCase.isHidden ? undefined : testCase.input,
          expectedOutput: testCase.isHidden ? undefined : testCase.expectedOutput,
          actualOutput: testCase.isHidden ? undefined : execResult.stdout,
        });
      } else {
        if (overallVerdict === "ACCEPTED") overallVerdict = "WRONG_ANSWER";
        testResults.push({
          testCaseId: testCase.id,
          isHidden: testCase.isHidden,
          passed: false,
          verdict: "WRONG_ANSWER",
          durationMs: execResult.durationMs,
          input: testCase.isHidden ? undefined : testCase.input,
          expectedOutput: testCase.isHidden ? undefined : testCase.expectedOutput,
          actualOutput: testCase.isHidden ? undefined : execResult.stdout,
        });
      }
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
