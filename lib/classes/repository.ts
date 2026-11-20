import "server-only";
import { isObject, isUuid, text } from "@/lib/accounts/rules";
import type { Viewer } from "@/lib/auth/viewer";
import { db, fetchAllPages, must } from "@/lib/db/client";
import { listProblemSummaries, problemExists } from "@/lib/problems/store";
import { canCreateClasses } from "@/lib/roles/rules";
import type { FieldErrors } from "@/types/account";
import type {
  ClassDetailPayload,
  ClassGroupView,
  ClassListPayload,
  ClassMemberView,
  ClassProblemView,
  ClassSummary,
} from "@/types/classes";
import { checkGroupName, checkInviteCode, checkNewClass, generateInviteCode } from "./rules";

export type ClassActionResult<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; status: number; error?: string; fieldErrors?: FieldErrors };

interface ClassRow {
  id: string;
  teacher_id: string;
  name: string;
  section: string | null;
  description: string | null;
  invite_code: string;
  created_at: string;
}

interface MemberRow {
  class_id: string;
  user_id: string;
  group_id: string | null;
  joined_at: string;
}

interface GroupRow {
  id: string;
  class_id: string;
  name: string;
  created_at: string;
}

interface ClassProblemRow {
  class_id: string;
  problem_id: string;
  assigned_at: string;
  due_at: string | null;
}

interface ProfileMiniRow {
  user_id: string;
  display_name: string;
  avatar_id: string;
  border_id: string;
  school_email: string | null;
}

const PROFILE_CHUNK_SIZE = 500;

async function loadProfiles(userIds: string[]): Promise<Map<string, ProfileMiniRow>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, ProfileMiniRow>();
  for (let i = 0; i < unique.length; i += PROFILE_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + PROFILE_CHUNK_SIZE);
    const rows = must(
      await db()
        .from("profiles")
        .select("user_id,display_name,avatar_id,border_id,school_email")
        .in("user_id", chunk),
    ) as ProfileMiniRow[];
    for (const row of rows) map.set(row.user_id, row);
  }
  return map;
}

function countByClass<T extends { class_id: string }>(rows: T[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1);
  return counts;
}

export async function listClassesForViewer(viewer: Viewer): Promise<ClassListPayload> {
  const viewerCanTeach = canCreateClasses(viewer.role);
  const [teachingRows, myMemberships] = await Promise.all([
    viewerCanTeach
      ? fetchAllPages<ClassRow>((from, to) =>
          db()
            .from("classes")
            .select("id,teacher_id,name,section,description,invite_code,created_at")
            .eq("teacher_id", viewer.id)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(from, to),
        )
      : Promise.resolve([] as ClassRow[]),
    fetchAllPages<MemberRow>((from, to) =>
      db()
        .from("class_members")
        .select("class_id,user_id,group_id,joined_at")
        .eq("user_id", viewer.id)
        .order("class_id")
        .range(from, to),
    ),
  ]);

  const enrolledIds = myMemberships
    .map((m) => m.class_id)
    .filter((id) => !teachingRows.some((c) => c.id === id));

  const enrolledRows = enrolledIds.length
    ? (must(
        await db()
          .from("classes")
          .select("id,teacher_id,name,section,description,invite_code,created_at")
          .in("id", enrolledIds)
          .order("created_at", { ascending: false }),
      ) as ClassRow[])
    : [];

  const allClasses = [...teachingRows, ...enrolledRows];
  const allClassIds = allClasses.map((c) => c.id);
  if (allClassIds.length === 0) {
    return {
      role: viewer.role,
      canCreateClass: viewerCanTeach,
      teaching: [],
      enrolled: [],
    };
  }

  const [allMembers, allGroups, allProblems, teacherProfiles] = await Promise.all([
    fetchAllPages<{ class_id: string }>((from, to) =>
      db().from("class_members").select("class_id").in("class_id", allClassIds).order("class_id").order("user_id").range(from, to),
    ),
    fetchAllPages<GroupRow>((from, to) =>
      db().from("class_groups").select("id,class_id,name,created_at").in("class_id", allClassIds).order("id").range(from, to),
    ),
    fetchAllPages<{ class_id: string }>((from, to) =>
      db().from("class_problems").select("class_id").in("class_id", allClassIds).order("class_id").order("problem_id").range(from, to),
    ),
    loadProfiles(allClasses.map((c) => c.teacher_id)),
  ]);

  const memberCountByClass = countByClass(allMembers);
  const groupCountByClass = countByClass(allGroups);
  const problemCountByClass = countByClass(allProblems);
  const groupNameById = new Map(allGroups.map((g) => [g.id, g.name]));
  const membershipByClass = new Map(myMemberships.map((m) => [m.class_id, m]));

  const summarize = (row: ClassRow): ClassSummary => {
    const isTeacher = viewerCanTeach && row.teacher_id === viewer.id;
    const myMem = membershipByClass.get(row.id);
    return {
      id: row.id,
      name: row.name,
      section: row.section ?? undefined,
      description: row.description ?? undefined,
      inviteCode: isTeacher ? row.invite_code : undefined,
      teacherId: row.teacher_id,
      teacherName: teacherProfiles.get(row.teacher_id)?.display_name ?? "Instructor",
      memberCount: memberCountByClass.get(row.id) ?? 0,
      groupCount: groupCountByClass.get(row.id) ?? 0,
      problemCount: problemCountByClass.get(row.id) ?? 0,
      isTeacher,
      myGroupName: myMem?.group_id ? groupNameById.get(myMem.group_id) : undefined,
      createdAt: row.created_at,
    };
  };

  return {
    role: viewer.role,
    canCreateClass: viewerCanTeach,
    teaching: teachingRows.map(summarize),
    enrolled: enrolledRows.map(summarize),
  };
}

export async function createClass(viewer: Viewer, input: unknown): Promise<ClassActionResult<{ id: string; inviteCode: string }>> {
  if (!canCreateClasses(viewer.role)) {
    return {
      ok: false,
      status: 403,
      error: "Only approved faculty teachers can create a class. Submit faculty verification on your profile.",
    };
  }
  const checked = checkNewClass(input);
  if (!checked.ok) return { ok: false, status: 422, fieldErrors: checked.fieldErrors };

  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    const { data, error } = await db()
      .from("classes")
      .insert({
        teacher_id: viewer.id,
        name: checked.name,
        section: checked.section ?? null,
        description: checked.description ?? null,
        invite_code: inviteCode,
      })
      .select("id,invite_code")
      .single();
    if (error?.code === "23505") continue;
    if (error || !data) throw new Error(`Database error: ${error?.message ?? "Could not create class."}`);
    const created = data as { id: string; invite_code: string };
    return { ok: true, id: created.id, inviteCode: created.invite_code };
  }

  return { ok: false, status: 500, error: "Could not allocate a unique invite code. Try again." };
}

export async function joinClassByCode(viewer: Viewer, input: unknown): Promise<ClassActionResult<{ classId: string; className: string }>> {
  const checked = checkInviteCode(input);
  if (!checked.ok) return { ok: false, status: 422, fieldErrors: checked.fieldErrors };

  const target = must(
    await db()
      .from("classes")
      .select("id,teacher_id,name")
      .eq("invite_code", checked.inviteCode)
      .maybeSingle(),
  ) as { id: string; teacher_id: string; name: string } | null;

  if (!target) {
    return { ok: false, status: 404, fieldErrors: { inviteCode: "No class matches that invite code." } };
  }
  if (target.teacher_id === viewer.id) {
    return { ok: false, status: 409, error: "You are already the teacher of this class." };
  }

  const { error } = await db()
    .from("class_members")
    .insert({ class_id: target.id, user_id: viewer.id });

  if (error?.code === "23505") {
    return { ok: true, classId: target.id, className: target.name };
  }
  if (error) throw new Error(`Database error: ${error.message}`);
  return { ok: true, classId: target.id, className: target.name };
}

export async function getClassDetail(viewer: Viewer, classId: string): Promise<ClassDetailPayload | null> {
  if (!isUuid(classId)) return null;
  const cls = must(
    await db()
      .from("classes")
      .select("id,teacher_id,name,section,description,invite_code,created_at")
      .eq("id", classId)
      .maybeSingle(),
  ) as ClassRow | null;
  if (!cls) return null;

  const isTeacher = canCreateClasses(viewer.role) && cls.teacher_id === viewer.id;
  const [members, groups, assigned] = await Promise.all([
    fetchAllPages<MemberRow>((from, to) =>
      db().from("class_members").select("class_id,user_id,group_id,joined_at").eq("class_id", classId).order("joined_at").order("user_id").range(from, to),
    ),
    fetchAllPages<GroupRow>((from, to) =>
      db().from("class_groups").select("id,class_id,name,created_at").eq("class_id", classId).order("name").order("id").range(from, to),
    ),
    fetchAllPages<ClassProblemRow>((from, to) =>
      db().from("class_problems").select("class_id,problem_id,assigned_at,due_at").eq("class_id", classId).order("assigned_at", { ascending: false }).order("problem_id").range(from, to),
    ),
  ]);

  const isMember = members.some((m) => m.user_id === viewer.id);
  if (!isTeacher && !isMember && viewer.role !== "admin") return null;

  const [profiles, catalogSummaries] = await Promise.all([
    loadProfiles([cls.teacher_id, ...members.map((m) => m.user_id)]),
    // Classes only expose unlocked practice problems (never upcoming or private live tournament problems).
    listProblemSummaries(undefined, { includeLocked: false }),
  ]);

  const problemIds = assigned.map((p) => p.problem_id);
  const memberIds = members.map((m) => m.user_id);

  // Pull accepted solves for class members on class-assigned problems, paginated past PostgREST's 1,000-row cap.
  const solvedByUser = new Map<string, Set<string>>();
  if (problemIds.length > 0 && memberIds.length > 0) {
    const subs = await fetchAllPages<{ user_id: string; problem_id: string }>((from, to) =>
      db()
        .from("submissions")
        .select("user_id,problem_id")
        .eq("verdict", "ACCEPTED")
        .in("user_id", memberIds)
        .in("problem_id", problemIds)
        .order("id")
        .range(from, to),
    );
    for (const s of subs) {
      const set = solvedByUser.get(s.user_id) ?? new Set<string>();
      set.add(s.problem_id);
      solvedByUser.set(s.user_id, set);
    }
  }

  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
  const catalogById = new Map(catalogSummaries.map((p) => [p.id, p]));

  const memberViews: ClassMemberView[] = members.map((m) => {
    const p = profiles.get(m.user_id);
    const solved = [...(solvedByUser.get(m.user_id) ?? new Set<string>())];
    return {
      userId: m.user_id,
      name: p?.display_name ?? "Student",
      avatarId: p?.avatar_id ?? "glitch-bot",
      borderId: p?.border_id ?? "none",
      schoolEmail: isTeacher ? p?.school_email ?? undefined : undefined,
      groupId: m.group_id,
      groupName: m.group_id ? groupNameById.get(m.group_id) : undefined,
      solvedProblemIds: solved,
      joinedAt: m.joined_at,
    };
  });

  const groupViews: ClassGroupView[] = groups.map((g) => {
    const gMembers = memberViews.filter((m) => m.groupId === g.id);
    const solvedCount = gMembers.reduce((sum, m) => sum + m.solvedProblemIds.length, 0);
    return {
      id: g.id,
      name: g.name,
      memberIds: gMembers.map((m) => m.userId),
      solvedCount,
      totalPossibleSolves: gMembers.length * problemIds.length,
    };
  });

  const problemViews: ClassProblemView[] = assigned
    .map((row): ClassProblemView | null => {
      const info = catalogById.get(row.problem_id);
      if (!info) return null;
      const solvedByCount = memberViews.filter((m) => m.solvedProblemIds.includes(row.problem_id)).length;
      const viewerSolved = solvedByUser.get(viewer.id)?.has(row.problem_id) ?? false;
      return {
        id: info.id,
        title: info.title,
        difficulty: info.difficulty,
        category: info.category,
        assignedAt: row.assigned_at,
        dueAt: row.due_at ?? undefined,
        solvedByViewer: viewerSolved,
        solvedByCount,
      };
    })
    .filter((p): p is ClassProblemView => p !== null);

  return {
    id: cls.id,
    name: cls.name,
    section: cls.section ?? undefined,
    description: cls.description ?? undefined,
    inviteCode: isTeacher ? cls.invite_code : undefined,
    teacherId: cls.teacher_id,
    teacherName: profiles.get(cls.teacher_id)?.display_name ?? "Instructor",
    isTeacher,
    createdAt: cls.created_at,
    groups: groupViews,
    members: memberViews,
    problems: problemViews,
    catalogProblems: isTeacher
      ? catalogSummaries.map((p) => ({
          id: p.id,
          title: p.title,
          difficulty: p.difficulty,
          category: p.category,
        }))
      : undefined,
  };
}

async function requireClassTeacher(viewer: Viewer, classId: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!canCreateClasses(viewer.role)) return { ok: false, status: 403, error: "Only approved faculty teachers can manage classes." };
  if (!isUuid(classId)) return { ok: false, status: 404, error: "Class not found." };
  const cls = must(await db().from("classes").select("teacher_id").eq("id", classId).maybeSingle()) as { teacher_id: string } | null;
  if (!cls) return { ok: false, status: 404, error: "Class not found." };
  if (cls.teacher_id !== viewer.id) return { ok: false, status: 403, error: "Only the class teacher can do that." };
  return { ok: true };
}

export async function performClassAction(viewer: Viewer, classId: string, body: unknown): Promise<ClassActionResult<{ inviteCode?: string }>> {
  if (!isObject(body)) return { ok: false, status: 400, error: "Missing action." };
  const action = text(body, "action");

  if (action === "leaveClass") {
    if (!isUuid(classId)) return { ok: false, status: 404, error: "Class not found." };
    must(await db().from("class_members").delete().eq("class_id", classId).eq("user_id", viewer.id));
    return { ok: true };
  }

  const gate = await requireClassTeacher(viewer, classId);
  if (!gate.ok) return gate;

  if (action === "createGroup") {
    const checked = checkGroupName(body);
    if (!checked.ok) return { ok: false, status: 422, fieldErrors: checked.fieldErrors };
    const { error } = await db().from("class_groups").insert({ class_id: classId, name: checked.name });
    if (error?.code === "23505") return { ok: false, status: 409, fieldErrors: { name: "A group with that name already exists." } };
    if (error) throw new Error(`Database error: ${error.message}`);
    return { ok: true };
  }

  if (action === "deleteGroup") {
    const groupId = text(body, "groupId");
    if (!isUuid(groupId)) return { ok: false, status: 400, error: "Choose a valid group." };
    must(await db().from("class_groups").delete().eq("id", groupId).eq("class_id", classId));
    return { ok: true };
  }

  if (action === "assignMemberGroup") {
    const userId = text(body, "userId");
    const rawGroupId = body.groupId === null || body.groupId === "" ? null : text(body, "groupId");
    if (!userId) return { ok: false, status: 400, error: "Choose a student." };
    if (rawGroupId !== null) {
      if (!isUuid(rawGroupId)) return { ok: false, status: 400, error: "Choose a valid group." };
      const group = must(await db().from("class_groups").select("id").eq("id", rawGroupId).eq("class_id", classId).maybeSingle());
      if (!group) return { ok: false, status: 404, error: "Group not found in this class." };
    }
    must(await db().from("class_members").update({ group_id: rawGroupId }).eq("class_id", classId).eq("user_id", userId));
    return { ok: true };
  }

  if (action === "removeMember") {
    const userId = text(body, "userId");
    if (!userId) return { ok: false, status: 400, error: "Choose a student." };
    must(await db().from("class_members").delete().eq("class_id", classId).eq("user_id", userId));
    return { ok: true };
  }

  if (action === "addProblem") {
    const problemId = text(body, "problemId");
    if (!problemId) return { ok: false, status: 400, error: "Choose a problem to assign." };
    if (!(await problemExists(problemId, { includeLocked: false }))) {
      return { ok: false, status: 404, error: "Problem not found." };
    }
    const { error } = await db().from("class_problems").insert({ class_id: classId, problem_id: problemId });
    if (error?.code === "23505") return { ok: true };
    if (error) throw new Error(`Database error: ${error.message}`);
    return { ok: true };
  }

  if (action === "removeProblem") {
    const problemId = text(body, "problemId");
    if (!problemId) return { ok: false, status: 400, error: "Choose a problem." };
    must(await db().from("class_problems").delete().eq("class_id", classId).eq("problem_id", problemId));
    return { ok: true };
  }

  if (action === "regenerateCode") {
    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = generateInviteCode();
      const { error } = await db().from("classes").update({ invite_code: inviteCode }).eq("id", classId);
      if (error?.code === "23505") continue;
      if (error) throw new Error(`Database error: ${error.message}`);
      return { ok: true, inviteCode };
    }
    return { ok: false, status: 500, error: "Could not regenerate invite code." };
  }

  if (action === "deleteClass") {
    must(await db().from("classes").delete().eq("id", classId));
    return { ok: true };
  }

  return { ok: false, status: 400, error: "Unknown class action." };
}
