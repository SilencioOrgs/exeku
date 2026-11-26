import "server-only";
import { isObject, text } from "@/lib/accounts/rules";
import type { Viewer } from "@/lib/auth/viewer";
import { db, isMissingRelationError } from "@/lib/db/client";
import { LEARN_CHAPTERS, type LearnChapter, type LearnChapterId } from "@/lib/learn/curriculum";
import { ALL_SUPPORTED_LANGUAGES } from "@/lib/workspace-defaults";
import type { ProblemDifficulty } from "@/types/problem";
import type { PreferredLanguage } from "@/types/profile";

interface LearnChapterRow {
  id: string;
  order_index: number;
  number: string;
  title: string;
  short_title: string;
  category: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  summary: string;
  lessons: LearnChapter["lessons"];
}

interface LearnProgressRow {
  chapter_id: string;
  language: PreferredLanguage;
}

const VALID_DIFFICULTIES = new Set<ProblemDifficulty>(["beginner", "intermediate", "advanced"]);
const CHAPTER_ID_RE = /^[a-z0-9-]+$/;
const BUILT_IN_BY_ID = new Map(LEARN_CHAPTERS.map((c) => [c.id as string, c]));

function isValidLesson(value: unknown): boolean {
  if (!isObject(value)) return false;
  return (
    typeof value.headline === "string" &&
    typeof value.intro === "string" &&
    Array.isArray(value.keyRules) &&
    typeof value.syntaxSnippet === "string" &&
    typeof value.exampleTitle === "string" &&
    typeof value.exampleCode === "string" &&
    typeof value.expectedOutput === "string" &&
    isObject(value.exercise) &&
    typeof value.exercise.prompt === "string" &&
    typeof value.exercise.codeTemplate === "string" &&
    typeof value.exercise.answer === "string" &&
    typeof value.exercise.hint === "string"
  );
}

function rowToChapter(row: LearnChapterRow): LearnChapter | null {
  if (!row.id || !CHAPTER_ID_RE.test(row.id) || !row.title || !isObject(row.lessons)) return null;
  const fallback = BUILT_IN_BY_ID.get(row.id);
  const rawLessons = row.lessons as Record<string, unknown>;
  const mergedLessons: Partial<LearnChapter["lessons"]> = {};

  for (const lang of ALL_SUPPORTED_LANGUAGES) {
    if (isValidLesson(rawLessons[lang])) {
      mergedLessons[lang] = rawLessons[lang] as LearnChapter["lessons"][PreferredLanguage];
    } else if (fallback?.lessons[lang]) {
      mergedLessons[lang] = fallback.lessons[lang];
    } else {
      return null;
    }
  }

  return {
    id: row.id as LearnChapterId,
    number: row.number || fallback?.number || "01",
    title: row.title,
    shortTitle: row.short_title || fallback?.shortTitle || row.title,
    category: row.category || fallback?.category || "Language Basics",
    difficulty: VALID_DIFFICULTIES.has(row.difficulty) ? row.difficulty : (fallback?.difficulty ?? "beginner"),
    summary: row.summary || fallback?.summary || "",
    tags: Array.isArray(row.tags) ? row.tags : (fallback?.tags ?? []),
    lessons: mergedLessons as LearnChapter["lessons"],
  };
}

export async function listLearnForViewer(viewer: Viewer): Promise<{
  chapters: LearnChapter[];
  completedKeys: string[];
}> {
  let chapters: LearnChapter[] = LEARN_CHAPTERS;
  let completedKeys: string[] = [];

  try {
    const { data: chapterRows, error: chapterError } = await db()
      .from("learn_chapters")
      .select("id,order_index,number,title,short_title,category,difficulty,tags,summary,lessons")
      .order("order_index", { ascending: true });

    if (chapterError) {
      if (!isMissingRelationError(chapterError, ["learn_chapters"])) {
        console.error("[learn] failed to load learn_chapters:", chapterError.message);
      }
    } else if (Array.isArray(chapterRows) && chapterRows.length > 0) {
      const dbById = new Map<string, LearnChapter>();
      for (const raw of chapterRows as LearnChapterRow[]) {
        const parsed = rowToChapter(raw);
        if (parsed) dbById.set(parsed.id, parsed);
      }
      const merged: LearnChapter[] = LEARN_CHAPTERS.map((ch) => dbById.get(ch.id) ?? ch);
      for (const [id, ch] of dbById.entries()) {
        if (!merged.some((m) => m.id === id)) merged.push(ch);
      }
      chapters = merged;
    }
  } catch (err) {
    console.error("[learn] unexpected error loading learn_chapters:", err instanceof Error ? err.message : "unknown error");
  }

  const validChapterIds = new Set(chapters.map((c) => c.id as string));

  try {
    const { data: progressRows, error: progressError } = await db()
      .from("learn_progress")
      .select("chapter_id,language")
      .eq("user_id", viewer.id);

    if (progressError) {
      if (!isMissingRelationError(progressError, ["learn_progress"])) {
        console.error("[learn] failed to load learn_progress:", progressError.message);
      }
    } else if (Array.isArray(progressRows)) {
      completedKeys = (progressRows as LearnProgressRow[])
        .filter((r) => r.chapter_id && validChapterIds.has(r.chapter_id) && ALL_SUPPORTED_LANGUAGES.includes(r.language))
        .map((r) => `${r.language}:${r.chapter_id}`);
    }
  } catch (err) {
    console.error("[learn] unexpected error loading learn_progress:", err instanceof Error ? err.message : "unknown error");
  }

  return { chapters, completedKeys };
}

export async function recordLearnCompletion(
  viewer: Viewer,
  body: unknown,
): Promise<{ ok: true; key: string } | { ok: false; status: number; error: string }> {
  if (!isObject(body)) return { ok: false, status: 400, error: "Invalid request body." };
  const chapterId = text(body, "chapterId").slice(0, 64);
  const language = text(body, "language") as PreferredLanguage;

  if (!chapterId || !CHAPTER_ID_RE.test(chapterId)) {
    return { ok: false, status: 400, error: "Valid chapter ID is required." };
  }
  if (!ALL_SUPPORTED_LANGUAGES.includes(language)) {
    return { ok: false, status: 400, error: "Unsupported programming language." };
  }
  if (!BUILT_IN_BY_ID.has(chapterId)) {
    const { data, error } = await db().from("learn_chapters").select("id").eq("id", chapterId).maybeSingle();
    if (error && !isMissingRelationError(error, ["learn_chapters"])) {
      console.error("[learn] failed to verify chapter:", error.message);
      return { ok: false, status: 500, error: "Could not verify chapter." };
    }
    if (!data) {
      return { ok: false, status: 404, error: "Chapter not found." };
    }
  }

  const { error } = await db()
    .from("learn_progress")
    .upsert(
      {
        user_id: viewer.id,
        chapter_id: chapterId,
        language,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,chapter_id,language" },
    );

  if (error) {
    if (isMissingRelationError(error, ["learn_progress"])) {
      return { ok: true, key: `${language}:${chapterId}` };
    }
    console.error("[learn] failed to save lesson progress:", error.message);
    return { ok: false, status: 500, error: "Could not save your lesson progress." };
  }

  return { ok: true, key: `${language}:${chapterId}` };
}
