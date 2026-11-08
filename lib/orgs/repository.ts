import "server-only";
import { isObject, text } from "@/lib/accounts/rules";
import { isSampleData } from "@/lib/competition/repository";
import { mockDb } from "@/lib/mock/db";
import type { FieldErrors } from "@/types/account";
import type { OrgDetail, OrgPermission, OrgRole, OrgSummary } from "@/types/org";
import { can, checkEvent, checkPost, slugify } from "./rules";

export type ActionResult = { ok: true } | { ok: false; status: number; error?: string; fieldErrors?: FieldErrors };

const failed = (status: number, error: string): ActionResult => ({ ok: false, status, error });
const summarize = (org: (typeof mockDb.orgs)[number]): OrgSummary => ({ ...org, memberCount: mockDb.members.filter((m) => m.orgId === org.id).length });
const roleOf = (orgId: string, personId: string): OrgRole | null =>
  mockDb.members.find((m) => m.orgId === orgId && m.id === personId)?.role ?? null;

export async function listOrgs(campusId?: string): Promise<OrgSummary[]> {
  return mockDb.orgs.filter((o) => !campusId || o.campusId === campusId).map(summarize);
}

export async function getOrgDetail(orgId: string, viewerId: string): Promise<OrgDetail | null> {
  const org = mockDb.orgs.find((o) => o.id === orgId);
  if (!org) return null;
  const viewerRole = roleOf(orgId, viewerId);
  const applications = mockDb.applications.filter((a) => a.orgId === orgId);
  return {
    org: summarize(org),
    viewerRole,
    applicationStatus: applications.find((a) => a.applicantId === viewerId)?.status ?? "none",
    members: mockDb.members.filter((m) => m.orgId === orgId).map(({ id, name, role }) => ({ id, name, role })),
    applications: can(viewerRole, "reviewApplications")
      ? applications.filter((a) => a.status === "pending").map(({ id, name, program }) => ({ id, name, program }))
      : [],
    events: mockDb.events.filter((e) => e.orgId === orgId),
    posts: mockDb.posts.filter((p) => p.orgId === orgId).map(({ slug, title }) => ({ slug, title })),
    sample: isSampleData,
  };
}

// shortcut: actorId and applicantId come from the request so roles can be previewed, take them from the signed-in session when Supabase lands.
export async function performOrgAction(orgId: string, input: unknown): Promise<ActionResult> {
  if (!mockDb.orgs.some((o) => o.id === orgId)) return failed(404, "That organization doesn't exist.");
  if (!isObject(input)) return failed(400, "Invalid request.");
  const org = mockDb.orgs.find((o) => o.id === orgId)!;
  const actorRole = roleOf(orgId, text(input, "actorId"));
  const denied = (permission: OrgPermission) => !can(actorRole, permission);

  switch (input.action) {
    case "apply": {
      const applicantId = text(input, "actorId");
      const name = text(input, "name");
      if (!applicantId || name.length < 2 || name.length > 80) return failed(400, "Invalid application.");
      if (actorRole) return failed(409, "You're already a member.");
      if (mockDb.applications.some((a) => a.orgId === orgId && a.applicantId === applicantId)) return failed(409, "You've already applied.");
      mockDb.applications.push({ id: crypto.randomUUID(), orgId, applicantId, name, program: text(input, "program") || undefined, status: "pending" });
      return { ok: true };
    }
    case "decide": {
      if (denied("reviewApplications")) return failed(403, "Only officers can review applications.");
      const application = mockDb.applications.find((a) => a.orgId === orgId && a.id === text(input, "applicationId") && a.status === "pending");
      if (!application) return failed(404, "That application is no longer pending.");
      if (input.accept === true) {
        mockDb.members.push({ orgId, id: application.applicantId, name: application.name, role: "member" });
        mockDb.applications.splice(mockDb.applications.indexOf(application), 1);
      } else {
        application.status = "rejected";
      }
      return { ok: true };
    }
    case "setOfficer": {
      if (denied("manageOfficers")) return failed(403, "Only the president can assign officers.");
      const member = mockDb.members.find((m) => m.orgId === orgId && m.id === text(input, "memberId"));
      if (!member) return failed(404, "That member wasn't found.");
      if (member.role === "president") return failed(400, "The president's role can't be changed here.");
      member.role = input.officer === true ? "officer" : "member";
      return { ok: true };
    }
    case "createEvent": {
      if (denied("publish")) return failed(403, "Only officers can create events.");
      const checked = checkEvent(input);
      if (!checked.ok) return { ok: false, status: 422, fieldErrors: checked.fieldErrors };
      const { title, summary, access, banner, featured } = checked;
      if (featured) mockDb.events.forEach((e) => { e.featured = false; });
      mockDb.events.unshift({ id: crypto.randomUUID(), orgId, orgName: org.name, title, summary, access, banner, featured });
      return { ok: true };
    }
    case "feature": {
      if (denied("publish")) return failed(403, "Only officers can choose the banner.");
      const event = mockDb.events.find((e) => e.orgId === orgId && e.id === text(input, "eventId"));
      if (!event) return failed(404, "That event wasn't found.");
      mockDb.events.forEach((e) => { e.featured = false; });
      event.featured = true;
      return { ok: true };
    }
    case "createPost": {
      if (denied("publish")) return failed(403, "Only officers can write posts.");
      const checked = checkPost(input);
      if (!checked.ok) return { ok: false, status: 422, fieldErrors: checked.fieldErrors };
      const { title, paragraphs, excerpt } = checked;
      mockDb.posts.unshift({ slug: `${slugify(title)}-${mockDb.posts.length + 1}`, orgId, title, excerpt, paragraphs, placements: [], publishedOn: new Date().toISOString().slice(0, 10) });
      return { ok: true };
    }
    default:
      return failed(400, "Unknown action.");
  }
}
