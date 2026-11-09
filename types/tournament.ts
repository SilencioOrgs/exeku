import type { AvatarBorderId } from "@/lib/avatar-borders";

export type TournamentStatus = "registration" | "live" | "ended";

export interface TournamentMember { id: string; name: string; avatarId: string; borderId?: AvatarBorderId }

export interface TournamentTeam {
  id: string;
  name: string;
  members: TournamentMember[];
  points: number;
  solved: number;
  /** Times a member left full screen or the tab while it was live. */
  warnings: number;
  /** Set once the tournament has started. */
  rank?: number;
}

export interface TournamentView {
  id: string;
  title: string;
  summary: string;
  accessLabel: string;
  status: TournamentStatus;
  startsAt: string;
  endsAt: string;
  /** Server time, so the countdown doesn't depend on the student's clock. */
  now: string;
  teamSize: number;
  teams: TournamentTeam[];
  myTeamId: string | null;
  /** Empty until the tournament starts and the viewer is registered. */
  problems: { id: string; title: string }[];
  solvedProblemIds: string[];
}

export interface ActiveTournament { id: string; title: string; warnings: number }

export interface Medal { place: number; at: string; title: string }
