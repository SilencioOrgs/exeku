import "server-only";
import type { CompetitionEvent, LeaderboardScore } from "@/types/competition";

/**
 * SAMPLE DATA. Every mock name, score, event and org lives in lib/mock/.
 * When the database is ready: delete lib/mock/, then update the two files that import it,
 * lib/competition/repository.ts and lib/orgs/repository.ts.
 */
const ACOES = { orgId: "acoes", orgName: "ACOES", campusId: "santa-cruz", campusName: "Santa Cruz Campus (Main)" };

export const MOCK_EVENTS: CompetitionEvent[] = [
  {
    ...ACOES,
    id: "acoes-sprint",
    title: "ACOES members code sprint",
    summary: "A one-hour sprint for ACOES members.",
    startsOn: "2026-12-05",
    access: "org-only",
    banner: "codelines",
    featured: false,
  },
  {
    ...ACOES,
    id: "santa-cruz-night",
    title: "Santa Cruz coding night",
    summary: "An evening of problem solving for students at this campus.",
    startsOn: "2026-12-12",
    access: "campus-only",
    banner: "circuit",
    featured: false,
  },
  {
    ...ACOES,
    id: "cpe-days",
    title: "CPE Days programming competition",
    summary: "LSPU SCC held the CPE Days programming competition.",
    startsOn: "2026-10-20",
    access: "open",
    banner: "podium",
    featured: true,
    winners: [
      { place: 1, name: "Asnor", campusName: "Santa Cruz Campus (Main)" },
      { place: 2, name: "Al Thor", campusName: "Santa Cruz Campus (Main)" },
      { place: 3, name: "Jan Eriz", campusName: "Siniloan Campus (Host)" },
    ],
  },
];

export const MOCK_SCORES: LeaderboardScore[] = [
  { name: "Asnor", campusId: "santa-cruz", campusName: "Santa Cruz Campus (Main)", solved: 42, points: 1240 },
  { name: "Al Thor", campusId: "santa-cruz", campusName: "Santa Cruz Campus (Main)", solved: 37, points: 1120 },
  { name: "Jan Eriz", campusId: "siniloan", campusName: "Siniloan Campus (Host)", solved: 31, points: 980 },
];
