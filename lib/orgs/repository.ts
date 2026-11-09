import "server-only";
import { isObject, text } from "@/lib/accounts/rules";
import type { Viewer } from "@/lib/auth/viewer";
import { EVENT_COLUMNS, toEvent, viewerScope, type EventRow } from "@/lib/competition/repository";
import { todayInManila } from "@/lib/dates";
import { db, must } from "@/lib/db/client";
import type { FieldErrors } from "@/types/account";
import type { OrgDetail, OrgPermission, OrgRole, OrgSummary } from "@/types/org";
import { can, canViewEvent, checkEvent } from "./rules";

export type ActionResult = { ok: true } | { ok: false; status: number; error?: string; fieldErrors?: FieldErrors };

const ORG_COLUMNS = "id,name,school_name,campus_id,campus_name,program_name,org_members(count)";
const UNIQUE_VIOLATION = "23505";

type OrgRow = { id: string; name: string; school_name: string; campus_id: string; campus_name: string; program_name: string; org_members: { count: number }[] };
type MemberRow = { user_id: string; role: OrgRole; profiles: { display_name: string } };
type ApplicationRow = { id: string; user_id: string; program: string | null; status: "pending" | "rejected"; profiles: { display_name: string } };

const failed = (status: number, error: string): ActionResult => ({ ok: false, status, error });
const toSummary = (o: OrgRow): OrgSummary => ({
  id: o.id, name: o.name, schoolName: o.school_name, campusId: o.campus_id, campusName: o.campus_name, programName: o.program_name,
  memberCount: o.org_members[0]?.count ?? 0,
});

async function findOrg(orgId: string) {
  return must(await db().from("orgs").select(ORG_COLUMNS).eq("id", orgId).maybeSingle()) as unknown as OrgRow | null;
}

/** Each org has its own dashboard event, so choosing one never touches another org's. */
async function clearFeatured(orgId: string) {
  must(await db().from("events").update({ featured: false }).eq("org_id", orgId).eq("featured", true));
}

export async function listOrgs(campusId?: string): Promise<OrgSummary[]> {
  const query = db().from("orgs").select(ORG_COLUMNS).order("name");
  return (must(await (campusId ? query.eq("campus_id", campusId) : query)) as unknown as OrgRow[]).map(toSummary);
}

export async function getOrgDetail(orgId: string, viewer: Viewer): Promise<OrgDetail | null> {
  const org = await findOrg(orgId);
  if (!org) return null;
  const members = must(await db().from("org_members").select("user_id,role,profiles(display_name)").eq("org_id", orgId)) as unknown as MemberRow[];
  const applications = must(await db().from("org_applications").select("id,user_id,program,status,profiles(display_name)").eq("org_id", orgId)) as unknown as ApplicationRow[];
  const events = must(await db().from("events").select(EVENT_COLUMNS).eq("org_id", orgId).order("starts_on", { ascending: false })) as unknown as EventRow[];
  const viewerRole = members.find((m) => m.user_id === viewer.id)?.role ?? null;
  const scope = await viewerScope(viewer);
  return {
    org: toSummary(org),
    viewerRole,
    applicationStatus: applications.find((a) => a.user_id === viewer.id)?.status ?? "none",
    members: members.map((m) => ({ id: m.user_id, name: m.profiles.display_name, role: m.role })),
    applications: can(viewerRole, "reviewApplications")
      ? applications.filter((a) => a.status === "pending").map((a) => ({ id: a.id, name: a.profiles.display_name, program: a.program ?? undefined }))
      : [],
    events: events.map(toEvent).filter((e) => canViewEvent(e, scope)),
  };
}

/** The actor is always the signed-in viewer. Any identity in the request body is ignored. */
export async function performOrgAction(orgId: string, viewer: Viewer, input: unknown): Promise<ActionResult> {
  if (!(await findOrg(orgId))) return failed(404, "That organization doesn't exist.");
  if (!isObject(input)) return failed(400, "Invalid request.");
  const memberRow = must(await db().from("org_members").select("role").eq("org_id", orgId).eq("user_id", viewer.id).maybeSingle()) as { role: OrgRole } | null;
  const actorRole = memberRow?.role ?? null;
  const denied = (permission: OrgPermission) => !can(actorRole, permission);

  switch (input.action) {
    case "apply": {
      if (actorRole) return failed(409, "You're already a member.");
      const { error } = await db().from("org_applications").insert({ org_id: orgId, user_id: viewer.id, program: text(input, "program").slice(0, 80) || null });
      if (error?.code === UNIQUE_VIOLATION) return failed(409, "You've already applied.");
      if (error) throw new Error(`Database error: ${error.message}`);
      return { ok: true };
    }
    case "decide": {
      if (denied("reviewApplications")) return failed(403, "Only officers can review applications.");
      const applicationId = text(input, "applicationId");
      const application = must(await db().from("org_applications").select("id,user_id").eq("org_id", orgId).eq("id", applicationId).eq("status", "pending").maybeSingle()) as { id: string; user_id: string } | null;
      if (!application) return failed(404, "That application is no longer pending.");
      if (input.accept === true) {
        // Member first and upsert, so a failure between the two steps can simply be accepted again.
        must(await db().from("org_members").upsert({ org_id: orgId, user_id: application.user_id, role: "member" }, { onConflict: "org_id,user_id", ignoreDuplicates: true }));
        must(await db().from("org_applications").delete().eq("id", application.id));
      } else {
        must(await db().from("org_applications").update({ status: "rejected" }).eq("id", application.id));
      }
      return { ok: true };
    }
    case "setOfficer": {
      if (denied("manageOfficers")) return failed(403, "Only the president can assign officers.");
      const memberId = text(input, "memberId");
      const member = must(await db().from("org_members").select("role").eq("org_id", orgId).eq("user_id", memberId).maybeSingle()) as { role: OrgRole } | null;
      if (!member) return failed(404, "That member wasn't found.");
      if (member.role === "president") return failed(400, "The president's role can't be changed here.");
      must(await db().from("org_members").update({ role: input.officer === true ? "officer" : "member" }).eq("org_id", orgId).eq("user_id", memberId));
      return { ok: true };
    }
    case "createEvent": {
      if (denied("publish")) return failed(403, "Only officers can create events.");
      const checked = checkEvent(input, todayInManila());
      if (!checked.ok) return { ok: false, status: 422, fieldErrors: checked.fieldErrors };
      const { title, summary, startsOn, access, banner, featured } = checked;
      if (featured) await clearFeatured(orgId);
      must(await db().from("events").insert({ org_id: orgId, title, summary, starts_on: startsOn, access, banner, featured }));
      return { ok: true };
    }
    case "feature": {
      if (denied("publish")) return failed(403, "Only officers can choose the banner.");
      const eventId = text(input, "eventId");
      const event = must(await db().from("events").select("id").eq("org_id", orgId).eq("id", eventId).maybeSingle());
      if (!event) return failed(404, "That event wasn't found.");
      await clearFeatured(orgId);
      must(await db().from("events").update({ featured: true }).eq("org_id", orgId).eq("id", eventId));
      return { ok: true };
    }
    default:
      return failed(400, "Unknown action.");
  }
}
