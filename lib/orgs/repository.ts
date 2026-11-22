import "server-only";
import { isObject, isUuid, text } from "@/lib/accounts/rules";
import type { Viewer } from "@/lib/auth/viewer";
import { EVENT_COLUMNS, maskTournamentProblems, toEvents, viewerScope, type EventRow } from "@/lib/competition/repository";
import { todayInManila } from "@/lib/dates";
import { db, fetchAllPages, must } from "@/lib/db/client";
import { notifyUsers } from "@/lib/notifications/repository";
import type { FieldErrors } from "@/types/account";
import type { ApplicationStatus, OrgDetail, OrgPermission, OrgRole, OrgSummary } from "@/types/org";
import { can, canViewEvent, checkEvent } from "./rules";

export type ActionResult = { ok: true } | { ok: false; status: number; error?: string; fieldErrors?: FieldErrors };

const ORG_COLUMNS = "id,name,school_name,campus_id,campus_name,program_name,adviser_id,org_members(count)";
const ORG_COLUMNS_FALLBACK = "id,name,school_name,campus_id,campus_name,program_name,org_members(count)";
const UNIQUE_VIOLATION = "23505";

type OrgRow = {
  id: string;
  name: string;
  school_name: string;
  campus_id: string;
  campus_name: string;
  program_name: string;
  adviser_id?: string | null;
  org_members: { count: number }[];
};
type MemberRow = { user_id: string; role: OrgRole; profiles: { display_name: string } };
type ApplicationRow = { id: string; user_id: string; program: string | null; status: "pending" | "rejected"; profiles: { display_name: string } };

const failed = (status: number, error: string): ActionResult => ({ ok: false, status, error });
const isMissingAdviserColumn = (message?: string | null) => typeof message === "string" && /adviser_id/i.test(message);

const toSummary = (
  o: OrgRow,
  extras?: {
    presidentName?: string;
    adviserName?: string;
    viewerRole?: OrgRole | null;
    applicationStatus?: ApplicationStatus;
  },
): OrgSummary => ({
  id: o.id,
  name: o.name,
  schoolName: o.school_name,
  campusId: o.campus_id,
  campusName: o.campus_name,
  programName: o.program_name,
  memberCount: o.org_members[0]?.count ?? 0,
  presidentName: extras?.presidentName,
  adviserName: extras?.adviserName,
  viewerRole: extras?.viewerRole,
  applicationStatus: extras?.applicationStatus,
});

async function findOrg(orgId: string): Promise<OrgRow | null> {
  const res = await db().from("orgs").select(ORG_COLUMNS).eq("id", orgId).maybeSingle();
  if (res.error && isMissingAdviserColumn(res.error.message)) {
    return must(await db().from("orgs").select(ORG_COLUMNS_FALLBACK).eq("id", orgId).maybeSingle()) as unknown as OrgRow | null;
  }
  return must(res) as unknown as OrgRow | null;
}

/** Each org has its own dashboard event, so choosing one never touches another org's. */
async function clearFeatured(orgId: string) {
  must(await db().from("events").update({ featured: false }).eq("org_id", orgId).eq("featured", true));
}

const IN_CHUNK_SIZE = 100;

async function fetchProfileNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  for (let i = 0; i < unique.length; i += IN_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + IN_CHUNK_SIZE);
    const rows = must(
      await db().from("profiles").select("user_id,display_name").in("user_id", chunk),
    ) as { user_id: string; display_name: string }[];
    for (const r of rows) map.set(r.user_id, r.display_name);
  }
  return map;
}

export async function listOrgs(campusId?: string, viewerId?: string): Promise<OrgSummary[]> {
  let rows: OrgRow[];
  try {
    rows = await fetchAllPages<OrgRow>((from, to) => {
      const base = db().from("orgs").select(ORG_COLUMNS).order("name").order("id").range(from, to);
      return campusId ? base.eq("campus_id", campusId) : base;
    });
  } catch (err) {
    if (err instanceof Error && isMissingAdviserColumn(err.message)) {
      rows = await fetchAllPages<OrgRow>((from, to) => {
        const base = db().from("orgs").select(ORG_COLUMNS_FALLBACK).order("name").order("id").range(from, to);
        return campusId ? base.eq("campus_id", campusId) : base;
      });
    } else {
      throw err;
    }
  }

  if (rows.length === 0) return [];
  const orgIds = rows.map((r) => r.id);

  const presidents: { org_id: string; user_id: string }[] = [];
  const viewerMemberships: { org_id: string; role: OrgRole }[] = [];
  const viewerApps: { org_id: string; status: "pending" | "rejected" }[] = [];

  for (let i = 0; i < orgIds.length; i += IN_CHUNK_SIZE) {
    const chunk = orgIds.slice(i, i + IN_CHUNK_SIZE);
    const [pBatch, mBatch, aBatch] = await Promise.all([
      fetchAllPages<{ org_id: string; user_id: string }>((from, to) =>
        db().from("org_members").select("org_id,user_id").eq("role", "president").in("org_id", chunk).order("org_id").range(from, to),
      ),
      viewerId
        ? fetchAllPages<{ org_id: string; role: OrgRole }>((from, to) =>
            db().from("org_members").select("org_id,role").eq("user_id", viewerId).in("org_id", chunk).order("org_id").range(from, to),
          )
        : Promise.resolve([] as { org_id: string; role: OrgRole }[]),
      viewerId
        ? fetchAllPages<{ org_id: string; status: "pending" | "rejected" }>((from, to) =>
            db().from("org_applications").select("org_id,status").eq("user_id", viewerId).in("org_id", chunk).order("org_id").range(from, to),
          )
        : Promise.resolve([] as { org_id: string; status: "pending" | "rejected" }[]),
    ]);
    presidents.push(...pBatch);
    viewerMemberships.push(...mBatch);
    viewerApps.push(...aBatch);
  }

  const presByOrg = new Map(presidents.map((p) => [p.org_id, p.user_id]));
  const roleByOrg = new Map(viewerMemberships.map((m) => [m.org_id, m.role]));
  const appByOrg = new Map(viewerApps.map((a) => [a.org_id, a.status]));
  const names = await fetchProfileNames([
    ...presidents.map((p) => p.user_id),
    ...rows.map((r) => r.adviser_id ?? "").filter(Boolean),
  ]);

  return rows.map((o) => {
    const presId = presByOrg.get(o.id);
    const advId = o.adviser_id ?? undefined;
    return toSummary(o, {
      presidentName: presId ? names.get(presId) : undefined,
      adviserName: advId ? names.get(advId) : undefined,
      viewerRole: viewerId ? (roleByOrg.get(o.id) ?? null) : undefined,
      applicationStatus: viewerId ? (appByOrg.get(o.id) ?? "none") : undefined,
    });
  });
}

export async function getOrgDetail(orgId: string, viewer: Viewer): Promise<OrgDetail | null> {
  const org = await findOrg(orgId);
  if (!org) return null;

  const [viewerMember, viewerApp, members, events, scope, adviserNames] = await Promise.all([
    db().from("org_members").select("role").eq("org_id", orgId).eq("user_id", viewer.id).maybeSingle().then((r) => must(r) as { role: OrgRole } | null),
    db().from("org_applications").select("status").eq("org_id", orgId).eq("user_id", viewer.id).maybeSingle().then((r) => must(r) as { status: "pending" | "rejected" } | null),
    fetchAllPages<MemberRow>((from, to) =>
      db().from("org_members").select("user_id,role,profiles(display_name)").eq("org_id", orgId).order("user_id").range(from, to),
    ),
    fetchAllPages<EventRow>((from, to) =>
      db().from("events").select(EVENT_COLUMNS).eq("org_id", orgId).order("starts_on", { ascending: false }).order("id").range(from, to),
    ),
    viewerScope(viewer),
    org.adviser_id ? fetchProfileNames([org.adviser_id]) : Promise.resolve(new Map<string, string>()),
  ]);

  const viewerRole = viewerMember?.role ?? null;
  const pendingApplications = can(viewerRole, "reviewApplications")
    ? await fetchAllPages<ApplicationRow>((from, to) =>
        db()
          .from("org_applications")
          .select("id,user_id,program,status,profiles(display_name)")
          .eq("org_id", orgId)
          .eq("status", "pending")
          .order("id")
          .range(from, to),
      )
    : [];

  const president = members.find((m) => m.role === "president");
  const visibleEvents = (await toEvents(events)).filter((e) => canViewEvent(e, scope));
  return {
    org: toSummary(org, {
      presidentName: president?.profiles.display_name,
      adviserName: org.adviser_id ? adviserNames.get(org.adviser_id) : undefined,
      viewerRole,
      applicationStatus: viewerApp?.status ?? "none",
    }),
    viewerRole,
    applicationStatus: viewerApp?.status ?? "none",
    members: members.map((m) => ({ id: m.user_id, name: m.profiles.display_name, role: m.role })),
    applications: pendingApplications.map((a) => ({ id: a.id, name: a.profiles.display_name, program: a.program ?? undefined })),
    events: await maskTournamentProblems(visibleEvents, viewer.id),
  };
}

/** The actor is always the signed-in viewer. Any identity in the request body is ignored. */
export async function performOrgAction(orgId: string, viewer: Viewer, input: unknown): Promise<ActionResult> {
  const org = await findOrg(orgId);
  if (!org) return failed(404, "That organization doesn't exist.");
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
    case "cancelApplication": {
      must(await db().from("org_applications").delete().eq("org_id", orgId).eq("user_id", viewer.id).eq("status", "pending"));
      return { ok: true };
    }
    case "decide": {
      if (denied("reviewApplications")) return failed(403, "Only officers can review applications.");
      if (typeof input.accept !== "boolean") return failed(400, "Specify whether to accept or reject.");
      const applicationId = text(input, "applicationId");
      if (!isUuid(applicationId)) return failed(404, "That application is no longer pending.");
      const application = must(await db().from("org_applications").select("id,user_id").eq("org_id", orgId).eq("id", applicationId).eq("status", "pending").maybeSingle()) as { id: string; user_id: string } | null;
      if (!application) return failed(404, "That application is no longer pending.");
      if (input.accept) {
        // Member first and upsert, so a failure between the two steps can simply be accepted again.
        must(await db().from("org_members").upsert({ org_id: orgId, user_id: application.user_id, role: "member" }, { onConflict: "org_id,user_id", ignoreDuplicates: true }));
        must(await db().from("org_applications").delete().eq("id", application.id).eq("status", "pending"));
        await notifyUsers([application.user_id], {
          kind: "org_status",
          title: `Accepted into ${org.name}`,
          body: "Your organization membership application has been approved.",
          href: `/app/orgs/${orgId}`,
        });
      } else {
        must(await db().from("org_applications").update({ status: "rejected" }).eq("id", application.id).eq("status", "pending"));
        await notifyUsers([application.user_id], {
          kind: "org_status",
          title: `Application update: ${org.name}`,
          body: "Your membership application was declined by an officer.",
          href: `/app/orgs/${orgId}`,
        });
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
      const { error } = await db().from("events").insert({ org_id: orgId, title, summary, starts_on: startsOn, access, banner, featured });
      if (error?.code === UNIQUE_VIOLATION) return failed(409, "Another officer just changed the featured banner. Please try again.");
      if (error) throw new Error(`Database error: ${error.message}`);
      return { ok: true };
    }
    case "feature": {
      if (denied("publish")) return failed(403, "Only officers can choose the banner.");
      const eventId = text(input, "eventId");
      if (!isUuid(eventId)) return failed(404, "That event wasn't found.");
      const event = must(await db().from("events").select("id").eq("org_id", orgId).eq("id", eventId).maybeSingle());
      if (!event) return failed(404, "That event wasn't found.");
      await clearFeatured(orgId);
      const { error } = await db().from("events").update({ featured: true }).eq("org_id", orgId).eq("id", eventId);
      if (error?.code === UNIQUE_VIOLATION) return failed(409, "Another officer just changed the featured banner. Please try again.");
      if (error) throw new Error(`Database error: ${error.message}`);
      return { ok: true };
    }
    default:
      return failed(400, "Unknown action.");
  }
}
