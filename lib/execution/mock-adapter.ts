import {
  type IExecutionAdapter,
  type ExecutionRequest,
  type ExecutionResult,
  type SandboxHealth,
  SUPPORTED_EXECUTION_LANGUAGES,
} from "@/types/execution";

export class MockSandboxAdapter implements IExecutionAdapter {
  private mockResponses: Map<string, ExecutionResult> = new Map();
  private isAvailable: boolean = true;

  setMockResponse(key: string, result: ExecutionResult): void {
    this.mockResponses.set(key, result);
  }

  setAvailable(available: boolean): void {
    this.isAvailable = available;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    if (!this.isAvailable) {
      return {
        status: "SERVICE_UNAVAILABLE",
        exitCode: null,
        stdout: "",
        stderr: "Mock sandbox is configured as unavailable.",
        durationMs: 5,
        error: "Sandbox offline",
      };
    }

    // Exact key lookup: language:stdin or language
    const keyWithStdin = `${request.language}:${request.stdin ?? ""}`;
    if (this.mockResponses.has(keyWithStdin)) {
      return this.mockResponses.get(keyWithStdin)!;
    }

    if (this.mockResponses.has(request.language)) {
      return this.mockResponses.get(request.language)!;
    }

    // Default mock response
    return {
      status: "SUCCESS",
      exitCode: 0,
      stdout: `[Mock Execution: ${request.language}]\n`,
      stderr: "",
      durationMs: 15,
    };
  }

  async checkHealth(): Promise<SandboxHealth> {
    return {
      isAvailable: this.isAvailable,
      engine: "Mock Sandbox Adapter (Testing)",
      supportedLanguages: [...SUPPORTED_EXECUTION_LANGUAGES],
    };
  }
}
