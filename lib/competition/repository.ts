import "server-only";
import { schoolDirectory } from "@/lib/accounts/school-directory";
import { todayInManila } from "@/lib/dates";
import { mockDb } from "@/lib/mock/db";
import { can, canViewEvent } from "@/lib/orgs/rules";
import type { Campus } from "@/types/account";
import type { EventsFeed, LeaderboardEntry } from "@/types/competition";
import { rankScores } from "./rank";

// shortcut: reads lib/mock/, replace these bodies with database queries and set isSampleData to false when Supabase lands.
export const isSampleData = true;

export async function getCampuses(): Promise<Campus[]> {
  return (await schoolDirectory.findSchool("lspu"))?.campuses ?? [];
}

/** Ranks within the scope, so a campus board starts again at 1. */
export async function getLeaderboard(campusId?: string): Promise<LeaderboardEntry[]> {
  return rankScores(campusId ? mockDb.scores.filter((s) => s.campusId === campusId) : mockDb.scores);
}

/** Which campuses and orgs count for this viewer when deciding what events they can see. */
export function viewerScope(viewerId: string, claimedCampusId?: string) {
  const orgIds = mockDb.members.filter((m) => m.id === viewerId).map((m) => m.orgId);
  const campusIds = [
    ...(claimedCampusId ? [claimedCampusId] : []),
    ...mockDb.orgs.filter((o) => orgIds.includes(o.id)).map((o) => o.campusId),
  ];
  return { campusIds, orgIds };
}

// shortcut: viewerId and campusId come from the request so roles can be previewed, take them from the signed-in session when Supabase lands.
export async function getEventsFeed(viewerId: string, claimedCampusId?: string): Promise<EventsFeed> {
  const memberships = mockDb.members.filter((m) => m.id === viewerId);
  const scope = viewerScope(viewerId, claimedCampusId);
  const people = new Map(mockDb.members.map((m) => [m.id, m.name]));
  return {
    events: [...mockDb.events].filter((e) => canViewEvent(e, scope)).sort((a, b) => b.startsOn.localeCompare(a.startsOn)),
    postableOrgs: mockDb.orgs
      .filter((o) => can(memberships.find((m) => m.orgId === o.id)?.role ?? null, "publish"))
      .map(({ id, name }) => ({ id, name })),
    previewPeople: isSampleData ? [...people].map(([id, name]) => ({ id, name })) : [],
    today: todayInManila(),
    sample: isSampleData,
  };
}
