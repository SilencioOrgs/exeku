import { NextResponse } from "next/server";
import { defaultJudgingService } from "@/lib/judge/judging-service";
import { getProblemById } from "@/lib/problems/catalog";
import {
  type ExecutionLanguage,
  SUPPORTED_EXECUTION_LANGUAGES,
} from "@/types/execution";
import { MAX_SOURCE_LENGTH } from "@/lib/execution/validation";
import { QueueFullError } from "@/lib/execution/queue";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid submission payload: expected JSON object." },
        { status: 400 }
      );
    }

    const { problemId, language, sourceCode } = body as {
      problemId?: string;
      language?: string;
      sourceCode?: string;
    };

    if (!problemId || typeof problemId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'problemId'." },
        { status: 400 }
      );
    }

    const problem = getProblemById(problemId);
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

    if (!sourceCode || typeof sourceCode !== "string" || sourceCode.trim().length === 0) {
      return NextResponse.json(
        { error: "Source code cannot be empty." },
        { status: 400 }
      );
    }

    if (sourceCode.length > MAX_SOURCE_LENGTH) {
      return NextResponse.json(
        {
          error: `Source code length (${sourceCode.length} bytes) exceeds maximum allowed length of ${MAX_SOURCE_LENGTH} bytes.`,
        },
        { status: 400 }
      );
    }

    const judgingResult = await defaultJudgingService.judgeSubmission(
      problem.id,
      {
        language: execLang,
        sourceCode,
      }
    );

    return NextResponse.json(judgingResult);
  } catch (err: unknown) {
    if (err instanceof QueueFullError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }

    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
