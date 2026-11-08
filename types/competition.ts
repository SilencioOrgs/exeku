export type EventAccess = "open" | "org-only";
export type BannerStyle = "ember" | "spotlight" | "graphite";

export interface CompetitionEvent {
  id: string;
  orgId: string;
  orgName: string;
  title: string;
  summary: string;
  access: EventAccess;
  banner: BannerStyle;
  featured: boolean;
  resultsSlug?: string;
}

export interface LeaderboardScore {
  name: string;
  campusId: string;
  campusName: string;
  solved: number;
  points: number;
}

export type LeaderboardEntry = LeaderboardScore & { rank: number };

export interface WinnerPlacement {
  place: number;
  name: string;
  campusName: string;
}

export interface WinnerPost {
  slug: string;
  orgId?: string;
  title: string;
  excerpt: string;
  publishedOn: string;
  placements: WinnerPlacement[];
  paragraphs: string[];
}
