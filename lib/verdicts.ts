/** Short codes and plain labels for judge and execution statuses. Shown as words, never as color. */
const VERDICTS: Record<string, { code: string; label: string; pass?: boolean }> = {
  ACCEPTED: { code: "AC", label: "Accepted", pass: true },
  PASSED: { code: "AC", label: "Passed", pass: true },
  SUCCESS: { code: "OK", label: "Ran successfully", pass: true },
  WRONG_ANSWER: { code: "WA", label: "Wrong answer" },
  COMPILATION_ERROR: { code: "CE", label: "Compile error" },
  RUNTIME_ERROR: { code: "RE", label: "Runtime error" },
  TIME_LIMIT_EXCEEDED: { code: "TLE", label: "Time limit exceeded" },
  MEMORY_LIMIT_EXCEEDED: { code: "MLE", label: "Memory limit exceeded" },
  SERVICE_UNAVAILABLE: { code: "OFF", label: "Sandbox unavailable" },
  INTERNAL_JUDGE_ERROR: { code: "ERR", label: "Judge error" },
  INTERNAL_ERROR: { code: "ERR", label: "Sandbox error" },
};

export function verdictInfo(status: string | undefined | null): { code: string; label: string; pass: boolean } {
  const known = status ? VERDICTS[status] : undefined;
  return known ? { pass: false, ...known } : { code: "ERR", label: "Unknown result", pass: false };
}

/** Judge or sandbox failures are not attempts by the student. */
export function isRealVerdict(status: string | undefined | null): boolean {
  return Boolean(status && VERDICTS[status]) && status !== "SERVICE_UNAVAILABLE" && status !== "INTERNAL_JUDGE_ERROR" && status !== "INTERNAL_ERROR";
}
