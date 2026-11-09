import type { BannerId } from "@/lib/banners";

export type EventAccess = "open" | "campus-only" | "org-only";

export interface WinnerPlacement {
  place: number;
  name: string;
  campusName: string;
}

export interface CompetitionEvent {
  id: string;
  orgId: string;
  orgName: string;
  campusId: string;
  campusName: string;
  title: string;
  summary: string;
  startsOn: string;
  access: EventAccess;
  banner: BannerId;
  featured: boolean;
  winners?: WinnerPlacement[];
  /** Only id and title, never test cases. */
  problems?: { id: string; title: string }[];
  /** Set for timed tournaments, which open on their own page. */
  tournament?: { startsAt: string; endsAt: string };
  /** A tournament's own solved list, since only answers during its window count. */
  solvedProblemIds?: string[];
}

export interface LeaderboardScore {
  id: string;
  name: string;
  campusId: string;
  campusName: string;
  solved: number;
  points: number;
}

export type LeaderboardEntry = LeaderboardScore & { rank: number };

/** What one viewer may see. Campus-only and org-only events are filtered on the server. */
export interface EventsFeed {
  events: CompetitionEvent[];
  postableOrgs: { id: string; name: string }[];
  solvedProblemIds: string[];
  today: string;
}
