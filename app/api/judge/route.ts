import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { readJson } from "@/lib/accounts/read-json";
import { isAdmin } from "@/lib/auth/admin-check";
import { defaultJudgingService } from "@/lib/judge/judging-service";
import { recordSubmission } from "@/lib/judge/record-submission";
import { findProblem } from "@/lib/problems/store";
import {
  type ExecutionLanguage,
  SUPPORTED_EXECUTION_LANGUAGES,
} from "@/types/execution";
import { MAX_BODY_BYTES, validateExecutionRequest } from "@/lib/execution/validation";
import { clientFrom, QueueFullError } from "@/lib/execution/queue";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to run code." }, { status: 401 });
    }

    const parsed = await readJson(req, MAX_BODY_BYTES);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const body = parsed.value;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid submission payload: expected JSON object." },
        { status: 400 }
      );
    }

    const { problemId, language, sourceCode, files } = body as {
      problemId?: string;
      language?: string;
      sourceCode?: string;
      files?: unknown;
    };

    if (!problemId || typeof problemId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'problemId'." },
        { status: 400 }
      );
    }

    const problem = await findProblem(problemId, { includeLocked: await isAdmin(userId) });
    if (!problem) {
      return NextResponse.json(
        { error: `Problem with ID '${problemId}' not found.` },
        { status: 404 }
      );
    }

    if (!language || typeof language !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'language'." },
        { status: 400 }
      );
    }

    const execLang = language.toLowerCase() as ExecutionLanguage;
    if (!SUPPORTED_EXECUTION_LANGUAGES.includes(execLang)) {
      return NextResponse.json(
        {
          error: `Unsupported language '${language}'. Supported: ${SUPPORTED_EXECUTION_LANGUAGES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if (!problem.supportedLanguages.includes(execLang)) {
      return NextResponse.json(
        {
          error: `Language '${language}' is not supported for problem '${problem.title}'.`,
        },
        { status: 400 }
      );
    }

    // Share execution validation, including total source size and companion files.
    const validation = validateExecutionRequest({ language: execLang, sourceCode, files });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const judgingResult = await defaultJudgingService.judgeSubmission(
      problem,
      {
        language: execLang,
        sourceCode: validation.request.sourceCode,
        files: validation.request.files,
      },
      clientFrom(req.headers, userId)
    );

    const milestone = await recordSubmission(problem, execLang, judgingResult.overallVerdict);
    return NextResponse.json(milestone ? { ...judgingResult, milestone } : judgingResult);
  } catch (err: unknown) {
    if (err instanceof QueueFullError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }

    console.error("Judge route failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "Submission judging failed. Please try again." }, { status: 500 });
  }
}
