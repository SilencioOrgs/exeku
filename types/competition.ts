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
}

export interface LeaderboardScore {
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
  previewPeople: { id: string; name: string }[];
  today: string;
  sample: boolean;
}
