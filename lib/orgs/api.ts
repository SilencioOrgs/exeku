import { call } from "@/lib/accounts/api";
import type { OrgDetail, OrgSummary } from "@/types/org";

export const fetchOrgs = (campusId: string) => call<{ orgs: OrgSummary[] }>(`/api/orgs?campus=${encodeURIComponent(campusId)}`);
export const fetchOrg = (orgId: string, viewerId: string) =>
  call<OrgDetail>(`/api/orgs/${encodeURIComponent(orgId)}?viewer=${encodeURIComponent(viewerId)}`);
export const orgAction = (orgId: string, body: Record<string, unknown>) => call<{ ok: true }>(`/api/orgs/${encodeURIComponent(orgId)}`, body);
