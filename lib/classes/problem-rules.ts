import { isObject, text } from "@/lib/accounts/rules";
import type { FieldErrors } from "@/types/account";
import type { ClassActivityKind } from "@/types/classes";
import type { ProblemDifficulty, TestCase } from "@/types/problem";

const DIFFICULTIES = new Set<ProblemDifficulty>(["beginner", "intermediate", "advanced"]);
const ACTIVITY_KINDS = new Set<ClassActivityKind>(["announcement", "activity", "deadline"]);
const MAX_TEST_CASE_CHARS = 16_384;
const MAX_TOTAL_TEST_CHARS = 48_000;

export interface ValidatedClassProblem {
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  category: string;
  tags: string[];
  inputSpec: string;
  outputSpec: string;
  constraints: string[];
  testCases: TestCase[];
  timeLimitMs: number;
  memoryLimitKb: number;
  dueAt?: string;
}

export interface ValidatedClassActivity {
  title: string;
  body?: string;
  kind: ClassActivityKind;
  problemId?: string;
  dueAt?: string;
}

export function parseOptionalDueAt(raw: unknown): { ok: true; value?: string } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: undefined };
  if (typeof raw !== "string") return { ok: false, error: "Enter a valid due date." };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: undefined };
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return { ok: false, error: "Enter a valid due date and time." };
  return { ok: true, value: new Date(ms).toISOString() };
}

export function checkClassActivity(
  input: unknown,
): { ok: true; activity: ValidatedClassActivity } | { ok: false; fieldErrors: FieldErrors } {
  const o = isObject(input) ? input : {};
  const title = text(o, "title");
  const body = text(o, "body");
  const rawKind = text(o, "kind") || "announcement";
  const problemId = text(o, "problemId").slice(0, 64) || undefined;
  const due = parseOptionalDueAt(o.dueAt);
  const fieldErrors: FieldErrors = {};

  if (title.length < 3 || title.length > 120) {
    fieldErrors.title = "Title must be between 3 and 120 characters.";
  }
  if (body.length > 2000) {
    fieldErrors.body = "Details must be 2000 characters or fewer.";
  }
  if (!ACTIVITY_KINDS.has(rawKind as ClassActivityKind)) {
    fieldErrors.kind = "Choose Announcement, Activity, or Deadline.";
  }
  if (!due.ok) {
    fieldErrors.dueAt = due.error;
  } else if (rawKind === "deadline" && !due.value) {
    fieldErrors.dueAt = "Deadline posts must include a due date and time.";
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    activity: {
      title,
      body: body || undefined,
      kind: rawKind as ClassActivityKind,
      problemId,
      dueAt: due.ok ? due.value : undefined,
    },
  };
}

export function checkTeacherProblem(
  input: unknown,
): { ok: true; problem: ValidatedClassProblem } | { ok: false; fieldErrors: FieldErrors } {
  const o = isObject(input) ? input : {};
  const title = text(o, "title");
  const description = text(o, "description");
  const rawDiff = text(o, "difficulty") || "beginner";
  const category = text(o, "category") || "Class Exercise";
  const inputSpec = text(o, "inputSpec");
  const outputSpec = text(o, "outputSpec");
  const due = parseOptionalDueAt(o.dueAt);

  const rawTime = Number(o.timeLimitMs ?? 2000);
  const timeLimitMs = Number.isFinite(rawTime) ? Math.round(rawTime) : 2000;
  const rawMem = Number(o.memoryLimitKb ?? 131072);
  const memoryLimitKb = Number.isFinite(rawMem) ? Math.round(rawMem) : 131072;

  const fieldErrors: FieldErrors = {};
  if (title.length < 3 || title.length > 120) {
    fieldErrors.title = "Problem title must be between 3 and 120 characters.";
  }
  if (description.length < 10 || description.length > 8000) {
    fieldErrors.description = "Problem statement must be at least 10 characters.";
  }
  if (!DIFFICULTIES.has(rawDiff as ProblemDifficulty)) {
    fieldErrors.difficulty = "Choose Easy, Medium, or Hard.";
  }
  if (category.length < 2 || category.length > 60) {
    fieldErrors.category = "Topic/category must be between 2 and 60 characters.";
  }
  if (inputSpec.length < 2 || inputSpec.length > 1000) {
    fieldErrors.inputSpec = "Describe the input format.";
  }
  if (outputSpec.length < 2 || outputSpec.length > 1000) {
    fieldErrors.outputSpec = "Describe the expected output format.";
  }
  if (timeLimitMs < 1000 || timeLimitMs > 5000) {
    fieldErrors.timeLimitMs = "Time limit must be between 1000 and 5000 ms.";
  }
  if (memoryLimitKb < 64000 || memoryLimitKb > 256000) {
    fieldErrors.memoryLimitKb = "Memory limit must be between 64000 and 256000 KB.";
  }
  if (!due.ok) {
    fieldErrors.dueAt = due.error;
  }

  const rawTags = Array.isArray(o.tags)
    ? o.tags.filter((t): t is string => typeof t === "string")
    : typeof o.tags === "string"
      ? o.tags.split(",")
      : [];
  const tags = [...new Set(rawTags.map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2 && t.length <= 32))].slice(0, 8);

  const rawConstraints = Array.isArray(o.constraints)
    ? o.constraints.filter((c): c is string => typeof c === "string")
    : typeof o.constraints === "string"
      ? o.constraints.split(/\r?\n/)
      : [];
  const constraints = rawConstraints.map((c) => c.trim()).filter(Boolean).slice(0, 12);

  const rawCases = Array.isArray(o.testCases) ? o.testCases : [];
  const testCases: TestCase[] = [];
  let totalTestChars = 0;
  for (let i = 0; i < rawCases.length && testCases.length < 20; i++) {
    const tc = rawCases[i];
    if (!isObject(tc)) continue;
    const tcInput = typeof tc.input === "string" ? tc.input : "";
    const tcOut = typeof tc.expectedOutput === "string" ? tc.expectedOutput : "";
    if (!tcOut.trim()) continue;
    if (tcInput.length > MAX_TEST_CASE_CHARS || tcOut.length > MAX_TEST_CASE_CHARS) {
      fieldErrors.testCases = "Each test case input and output must be 16 KB or smaller.";
      break;
    }
    totalTestChars += tcInput.length + tcOut.length;
    if (totalTestChars > MAX_TOTAL_TEST_CHARS) {
      fieldErrors.testCases = "Total test case data must be 48 KB or smaller.";
      break;
    }
    const explanation = text(tc, "explanation") || undefined;
    testCases.push({
      id: `tc-${testCases.length + 1}`,
      input: tcInput,
      expectedOutput: tcOut,
      isHidden: Boolean(tc.isHidden),
      explanation,
    });
  }

  if (!fieldErrors.testCases && testCases.length === 0) {
    fieldErrors.testCases = "Add at least one test case with expected output.";
  } else if (!fieldErrors.testCases && !testCases.some((t) => !t.isHidden)) {
    fieldErrors.testCases = "Keep at least one sample test case visible to students.";
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    problem: {
      title,
      description,
      difficulty: rawDiff as ProblemDifficulty,
      category,
      tags: tags.length > 0 ? tags : ["class"],
      inputSpec,
      outputSpec,
      constraints,
      testCases,
      timeLimitMs,
      memoryLimitKb,
      dueAt: due.ok ? due.value : undefined,
    },
  };
}

export function slugifyClassProblem(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  return `cls-${base || "problem"}-${rand}`;
}
