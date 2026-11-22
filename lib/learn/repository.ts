import "server-only";
import { isObject, text } from "@/lib/accounts/rules";
import type { Viewer } from "@/lib/auth/viewer";
import { db } from "@/lib/db/client";
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

function rowToChapter(row: LearnChapterRow): LearnChapter | null {
  if (!row.id || !row.title || !row.lessons || typeof row.lessons !== "object") return null;
  return {
    id: row.id as LearnChapterId,
    number: row.number || "01",
    title: row.title,
    shortTitle: row.short_title || row.title,
    category: row.category || "Language Basics",
    difficulty: VALID_DIFFICULTIES.has(row.difficulty) ? row.difficulty : "beginner",
    summary: row.summary || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    lessons: row.lessons,
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

    if (!chapterError && Array.isArray(chapterRows) && chapterRows.length > 0) {
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
  } catch {
    /* Table not migrated yet — fall back to built-in LEARN_CHAPTERS. */
  }

  try {
    const { data: progressRows, error: progressError } = await db()
      .from("learn_progress")
      .select("chapter_id,language")
      .eq("user_id", viewer.id);

    if (!progressError && Array.isArray(progressRows)) {
      completedKeys = (progressRows as LearnProgressRow[])
        .filter((r) => r.chapter_id && r.language)
        .map((r) => `${r.language}:${r.chapter_id}`);
    }
  } catch {
    /* Table not migrated yet — client still caches locally. */
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

  if (!chapterId) {
    return { ok: false, status: 400, error: "Chapter ID is required." };
  }
  if (!ALL_SUPPORTED_LANGUAGES.includes(language)) {
    return { ok: false, status: 400, error: "Unsupported programming language." };
  }

  try {
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
      return { ok: false, status: 500, error: "Could not save your lesson progress." };
    }
  } catch {
    /* Ignore if learn_progress table is not migrated yet in dev. */
  }

  return { ok: true, key: `${language}:${chapterId}` };
}
