import "server-only";
import type { CompetitionEvent, LeaderboardScore, WinnerPost } from "@/types/competition";

/**
 * SAMPLE DATA. Every mock name, score, post and org lives in lib/mock/.
 * When the database is ready: delete lib/mock/, then update the two files that import it,
 * lib/competition/repository.ts and lib/orgs/repository.ts.
 */
export const MOCK_EVENTS: CompetitionEvent[] = [
  {
    id: "cpe-days",
    orgId: "acoes",
    orgName: "ACOES",
    title: "CPE Days programming competition",
    summary: "LSPU SCC held the CPE Days programming competition.",
    access: "org-only",
    banner: "ember",
    featured: true,
    resultsSlug: "cpe-days-winners",
  },
];

export const MOCK_SCORES: LeaderboardScore[] = [
  { name: "Asnor", campusId: "santa-cruz", campusName: "Santa Cruz Campus (Main)", solved: 42, points: 1240 },
  { name: "Al Thor", campusId: "santa-cruz", campusName: "Santa Cruz Campus (Main)", solved: 37, points: 1120 },
  { name: "Jan Eriz", campusId: "siniloan", campusName: "Siniloan Campus (Host)", solved: 31, points: 980 },
];

export const MOCK_POSTS: WinnerPost[] = [
  {
    slug: "cpe-days-winners",
    orgId: "acoes",
    title: "Who won the CPE Days programming competition",
    excerpt: "Asnor took first place at the LSPU SCC competition, ahead of Al Thor and Jan Eriz.",
    publishedOn: "2026-11-08",
    placements: [
      { place: 1, name: "Asnor", campusName: "Santa Cruz Campus (Main)" },
      { place: 2, name: "Al Thor", campusName: "Santa Cruz Campus (Main)" },
      { place: 3, name: "Jan Eriz", campusName: "Siniloan Campus (Host)" },
    ],
    paragraphs: [
      "LSPU SCC held the CPE Days programming competition. Asnor finished first, with Al Thor in second place and Jan Eriz in third.",
      "Congratulations to the winners and to everyone who competed.",
    ],
  },
];
