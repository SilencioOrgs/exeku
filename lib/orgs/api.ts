import { call } from "@/lib/accounts/api";
import type { EventsFeed } from "@/types/competition";
import type { OrgDetail, OrgSummary } from "@/types/org";

export const fetchOrgs = (campusId: string) => call<{ orgs: OrgSummary[] }>(`/api/orgs?campus=${encodeURIComponent(campusId)}`);
export const fetchOrg = (orgId: string, viewerId: string, campusId?: string) =>
  call<OrgDetail>(`/api/orgs/${encodeURIComponent(orgId)}?viewer=${encodeURIComponent(viewerId)}${campusId ? `&campus=${encodeURIComponent(campusId)}` : ""}`);
export const orgAction = (orgId: string, body: Record<string, unknown>) => call<{ ok: true }>(`/api/orgs/${encodeURIComponent(orgId)}`, body);
export const fetchEvents = (viewerId: string, campusId?: string) =>
  call<EventsFeed>(`/api/events?viewer=${encodeURIComponent(viewerId)}${campusId ? `&campus=${encodeURIComponent(campusId)}` : ""}`);
