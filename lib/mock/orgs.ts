import "server-only";
import type { OrgMember, OrgSummary } from "@/types/org";

/** SAMPLE DATA. See the note in lib/mock/competition.ts. */
export const MOCK_ORGS: Omit<OrgSummary, "memberCount">[] = [
  { id: "acoes", name: "ACOES", schoolName: "LSPU", campusId: "santa-cruz", campusName: "Santa Cruz Campus (Main)", programName: "BSCPE" },
];

export const MOCK_MEMBERS: (OrgMember & { orgId: string })[] = [
  { orgId: "acoes", id: "mock-asnor", name: "Asnor", role: "president" },
  { orgId: "acoes", id: "mock-al-thor", name: "Al Thor", role: "officer" },
  { orgId: "acoes", id: "mock-jan-eriz", name: "Jan Eriz", role: "member" },
];
