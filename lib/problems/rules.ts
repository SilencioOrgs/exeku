import { isObject, text } from "@/lib/accounts/rules";
import { ALL_SUPPORTED_LANGUAGES } from "@/lib/workspace-defaults";
import type { FieldErrors } from "@/types/account";
import type { ProblemDifficulty, TestCase } from "@/types/problem";
import type { PreferredLanguage } from "@/types/profile";

const DIFFICULTIES: ProblemDifficulty[] = ["beginner", "intermediate", "advanced"];
const MAX_TESTS = 50;
const MAX_TEST_CHARS = 65536;
const MAX_TOTAL_TEST_CHARS = 1_500_000;
export const MAX_PROBLEM_BODY_BYTES = 2 * 1024 * 1024;

export interface NewProblem {
  id: string;
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  category: string;
  supportedLanguages: PreferredLanguage[];
  inputSpec: string;
  outputSpec: string;
  constraints: string[];
  testCases: TestCase[];
  timeLimitMs: number;
  memoryLimitKb: number;
}

export const slugify = (title: string) =>
  title.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const between = (value: unknown, min: number, max: number) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
};

/** Runs on the server for every new problem. Limits match what the sandbox is allowed to run. */
export function checkNewProblem(input: unknown): { ok: true; problem: NewProblem } | { ok: false; fieldErrors: FieldErrors } {
  const source = isObject(input) ? input : {};
  const errors: FieldErrors = {};

  const title = text(source, "title");
  const id = slugify(title);
  if (title.length < 3 || title.length > 80 || !id) errors.title = "Enter a title of 3 to 80 characters.";
  const description = text(source, "description");
  if (description.length < 10 || description.length > 5000) errors.description = "Enter a description of 10 to 5000 characters.";
  const category = text(source, "category");
  if (category.length < 2 || category.length > 40) errors.category = "Enter a category of 2 to 40 characters.";
  const difficulty = DIFFICULTIES.find((d) => d === source.difficulty);
  if (!difficulty) errors.difficulty = "Choose a difficulty.";
  const inputSpec = text(source, "inputSpec");
  if (!inputSpec || inputSpec.length > 2000) errors.inputSpec = "Describe the input in up to 2000 characters.";
  const outputSpec = text(source, "outputSpec");
  if (!outputSpec || outputSpec.length > 2000) errors.outputSpec = "Describe the output in up to 2000 characters.";

  const requested = Array.isArray(source.supportedLanguages) ? source.supportedLanguages : [];
  const supportedLanguages = ALL_SUPPORTED_LANGUAGES.filter((language) => requested.includes(language));
  if (supportedLanguages.length === 0) errors.supportedLanguages = "Choose at least one language.";

  const timeLimitMs = between(source.timeLimitMs, 1000, 5000);
  if (timeLimitMs === null) errors.timeLimitMs = "Enter 1000 to 5000 milliseconds.";
  const memoryMb = between(source.memoryMb, 64, 256);
  if (memoryMb === null) errors.memoryMb = "Enter 64 to 256 MB.";

  const constraints = text(source, "constraints").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 20);

  // Expected output keeps its inner spacing. The judge normalizes line endings and trailing space when comparing.
  const rawTests = Array.isArray(source.testCases) ? source.testCases.filter(isObject) : [];
  const testCases: TestCase[] = rawTests.map((test, index) => ({
    id: `${id}-${index + 1}`,
    input: typeof test.input === "string" ? test.input : "",
    expectedOutput: typeof test.expectedOutput === "string" ? test.expectedOutput : "",
    isHidden: test.isHidden === true,
  }));
  const totalTestChars = testCases.reduce((sum, t) => sum + t.input.length + t.expectedOutput.length, 0);
  if (testCases.length > MAX_TESTS) errors.testCases = `Use at most ${MAX_TESTS} tests.`;
  else if (testCases.some((t) => t.input.length > MAX_TEST_CHARS || t.expectedOutput.length > MAX_TEST_CHARS)) errors.testCases = "Each test must be under 64 KB.";
  else if (totalTestChars > MAX_TOTAL_TEST_CHARS) errors.testCases = "Total test case data must stay under 1.5 MB.";
  else if (testCases.some((t) => !t.expectedOutput.trim())) errors.testCases = "Every test needs an expected output.";
  else if (!testCases.some((t) => !t.isHidden) || !testCases.some((t) => t.isHidden)) errors.testCases = "Add at least one sample test and one hidden test.";

  if (Object.keys(errors).length > 0 || !difficulty || timeLimitMs === null || memoryMb === null) return { ok: false, fieldErrors: errors };
  return { ok: true, problem: { id, title, description, difficulty, category, supportedLanguages, inputSpec, outputSpec, constraints, testCases, timeLimitMs, memoryLimitKb: memoryMb * 1000 } };
}
