import "server-only";
import { schoolDirectory } from "@/lib/accounts/school-directory";
import { mockDb } from "@/lib/mock/db";
import type { Campus } from "@/types/account";
import type { CompetitionEvent, LeaderboardEntry, WinnerPost } from "@/types/competition";
import { rankScores } from "./rank";

// shortcut: reads lib/mock/, replace these bodies with database queries and set this to false when Supabase lands.
export const isSampleData = true;

export async function getFeaturedEvent(): Promise<CompetitionEvent | null> {
  return mockDb.events.find((e) => e.featured) ?? null;
}

export async function getCampuses(): Promise<Campus[]> {
  return (await schoolDirectory.findSchool("lspu"))?.campuses ?? [];
}

/** Ranks within the scope, so a campus board starts again at 1. */
export async function getLeaderboard(campusId?: string): Promise<LeaderboardEntry[]> {
  return rankScores(campusId ? mockDb.scores.filter((s) => s.campusId === campusId) : mockDb.scores);
}

export async function getWinnerPosts(): Promise<WinnerPost[]> {
  return mockDb.posts;
}

export async function getWinnerPost(slug: string): Promise<WinnerPost | null> {
  return mockDb.posts.find((p) => p.slug === slug) ?? null;
}
