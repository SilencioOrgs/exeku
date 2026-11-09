import { call } from "@/lib/accounts/api";
import type { EventsFeed } from "@/types/competition";
import type { OrgDetail, OrgSummary } from "@/types/org";
import type { ActiveTournament, TournamentView } from "@/types/tournament";

export const fetchOrgs = (campusId: string) => call<{ orgs: OrgSummary[] }>(`/api/orgs?campus=${encodeURIComponent(campusId)}`);
export const fetchOrg = (orgId: string) => call<OrgDetail>(`/api/orgs/${encodeURIComponent(orgId)}`);
export const orgAction = (orgId: string, body: Record<string, unknown>) => call<{ ok: true }>(`/api/orgs/${encodeURIComponent(orgId)}`, body);
/** Tells the tournament lock to check now instead of waiting for its next poll. */
export const TOURNAMENT_REFRESH_EVENT = "exeku:tournament-refresh";
export const fetchActiveTournament = () => call<{ active: ActiveTournament | null }>("/api/tournaments/active");
export const fetchTournament = (id: string) => call<TournamentView>(`/api/events/${encodeURIComponent(id)}/tournament`);
export const tournamentAction = (id: string, body: Record<string, unknown>) => call<{ ok: true }>(`/api/events/${encodeURIComponent(id)}/tournament`, body);
export const fetchEvents = () => call<EventsFeed>("/api/events");
