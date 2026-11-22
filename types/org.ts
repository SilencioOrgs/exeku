import type { CompetitionEvent } from "./competition";

export type OrgRole = "president" | "officer" | "member";
export type OrgPermission = "reviewApplications" | "publish" | "manageOfficers";
export type ApplicationStatus = "none" | "pending" | "rejected";

export interface OrgSummary {
  id: string;
  name: string;
  schoolName: string;
  campusId: string;
  campusName: string;
  programName: string;
  memberCount: number;
  presidentName?: string;
  adviserName?: string;
  viewerRole?: OrgRole | null;
  applicationStatus?: ApplicationStatus;
}

export interface OrgMember {
  id: string;
  name: string;
  role: OrgRole;
}

export interface OrgApplication {
  id: string;
  name: string;
  program?: string;
}

/** What one viewer may see. Applications are only sent to people allowed to review them. */
export interface OrgDetail {
  org: OrgSummary;
  viewerRole: OrgRole | null;
  applicationStatus: ApplicationStatus;
  members: OrgMember[];
  applications: OrgApplication[];
  events: CompetitionEvent[];
}
