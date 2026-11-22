import "server-only";
import { isObject, isUuid, text } from "@/lib/accounts/rules";
import type { Viewer } from "@/lib/auth/viewer";
import { db, fetchAllPages, must } from "@/lib/db/client";
import { notifyUsers } from "@/lib/notifications/repository";
import { listProblemSummaries, problemExists } from "@/lib/problems/store";
import { canCreateClasses } from "@/lib/roles/rules";
import { ALL_SUPPORTED_LANGUAGES } from "@/lib/workspace-defaults";
import type { FieldErrors } from "@/types/account";
import type {
  ClassActivityKind,
  ClassActivityView,
  ClassDetailPayload,
  ClassGroupView,
  ClassListPayload,
  ClassMemberView,
  ClassProblemView,
  ClassSummary,
} from "@/types/classes";
import { checkClassActivity, checkTeacherProblem, parseOptionalDueAt, slugifyClassProblem } from "./problem-rules";
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

interface ClassActivityRow {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  body: string | null;
  kind: ClassActivityKind;
  problem_id: string | null;
  due_at: string | null;
  created_at: string;
}

interface ProfileMiniRow {
  user_id: string;
  display_name: string;
  avatar_id: string;
  border_id: string;
  school_email: string | null;
}

const IN_CHUNK_SIZE = 100;

function isMissingActivitiesTable(message?: string | null): boolean {
  return typeof message === "string" && /class_activities|does not exist|schema cache/i.test(message);
}

async function loadProfiles(userIds: string[]): Promise<Map<string, ProfileMiniRow>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, ProfileMiniRow>();
  for (let i = 0; i < unique.length; i += IN_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + IN_CHUNK_SIZE);
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

async function fetchChunked<T>(
  ids: string[],
  fetchChunk: (chunk: string[]) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    out.push(...(await fetchChunk(ids.slice(i, i + IN_CHUNK_SIZE))));
  }
  return out;
}

function countByClass<T extends { class_id: string }>(rows: T[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1);
  return counts;
}

async function listClassMemberIds(classId: string): Promise<string[]> {
  const rows = await fetchAllPages<{ user_id: string }>((from, to) =>
    db().from("class_members").select("user_id").eq("class_id", classId).order("user_id").range(from, to),
  );
  return rows.map((r) => r.user_id);
}

async function recordClassActivitySafe(row: {
  class_id: string;
  teacher_id: string;
  title: string;
  body: string | null;
  kind: ClassActivityKind;
  problem_id: string | null;
  due_at: string | null;
}): Promise<void> {
  const { error } = await db().from("class_activities").insert(row);
  if (error && !isMissingActivitiesTable(error.message)) {
    console.error("[classes] failed to record class activity:", error.message);
  }
}

async function fetchClassActivitiesSafe(classId: string): Promise<ClassActivityView[]> {
  const { data, error } = await db()
    .from("class_activities")
    .select("id,class_id,teacher_id,title,body,kind,problem_id,due_at,created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) {
    if (isMissingActivitiesTable(error.message)) return [];
    throw new Error(`Database error: ${error.message}`);
  }
  return ((data ?? []) as ClassActivityRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body ?? undefined,
    kind: row.kind,
    problemId: row.problem_id ?? undefined,
    dueAt: row.due_at ?? undefined,
    createdAt: row.created_at,
  }));
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
    ? await fetchChunked(enrolledIds, async (chunk) =>
        must(
          await db()
            .from("classes")
            .select("id,teacher_id,name,section,description,invite_code,created_at")
            .in("id", chunk)
            .order("created_at", { ascending: false }),
        ) as ClassRow[],
      )
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

  const [allMembers, allGroups, rawProblems, teacherProfiles, unlockedSummaries] = await Promise.all([
    fetchChunked(allClassIds, (chunk) =>
      fetchAllPages<{ class_id: string }>((from, to) =>
        db().from("class_members").select("class_id").in("class_id", chunk).order("class_id").order("user_id").range(from, to),
      ),
    ),
    fetchChunked(allClassIds, (chunk) =>
      fetchAllPages<GroupRow>((from, to) =>
        db().from("class_groups").select("id,class_id,name,created_at").in("class_id", chunk).order("id").range(from, to),
      ),
    ),
    fetchChunked(allClassIds, (chunk) =>
      fetchAllPages<{ class_id: string; problem_id: string; due_at: string | null }>((from, to) =>
        db().from("class_problems").select("class_id,problem_id,due_at").in("class_id", chunk).order("class_id").order("problem_id").range(from, to),
      ),
    ),
    loadProfiles(allClasses.map((c) => c.teacher_id)),
    listProblemSummaries(undefined, { includeLocked: false, includeClassProblems: true }),
  ]);

  const validProblemIds = new Set(unlockedSummaries.map((p) => p.id));
  const allProblems = rawProblems.filter((p) => validProblemIds.has(p.problem_id));

  // Compute viewer's accepted solves across enrolled class problems for card progress bars.
  const enrolledProblemIds = [
    ...new Set(
      allProblems
        .filter((p) => enrolledIds.includes(p.class_id))
        .map((p) => p.problem_id),
    ),
  ];
  const viewerSolvedSet = new Set<string>();
  if (enrolledProblemIds.length > 0) {
    const subs = await fetchChunked(enrolledProblemIds, (chunk) =>
      fetchAllPages<{ problem_id: string }>((from, to) =>
        db()
          .from("submissions")
          .select("problem_id")
          .eq("user_id", viewer.id)
          .eq("verdict", "ACCEPTED")
          .in("problem_id", chunk)
          .order("id")
          .range(from, to),
      ),
    );
    for (const s of subs) viewerSolvedSet.add(s.problem_id);
  }

  const memberCountByClass = countByClass(allMembers);
  const groupCountByClass = countByClass(allGroups);
  const problemCountByClass = countByClass(allProblems);
  const groupNameById = new Map(allGroups.map((g) => [g.id, g.name]));
  const membershipByClass = new Map(myMemberships.map((m) => [m.class_id, m]));

  const nowMs = Date.now();
  const nextDueByClass = new Map<string, string>();
  const solvedByClass = new Map<string, number>();
  for (const row of allProblems) {
    if (viewerSolvedSet.has(row.problem_id)) {
      solvedByClass.set(row.class_id, (solvedByClass.get(row.class_id) ?? 0) + 1);
    }
    if (row.due_at) {
      const dueMs = Date.parse(row.due_at);
      if (!Number.isNaN(dueMs) && dueMs >= nowMs - 24 * 60 * 60 * 1000) {
        const cur = nextDueByClass.get(row.class_id);
        if (!cur || dueMs < Date.parse(cur)) nextDueByClass.set(row.class_id, row.due_at);
      }
    }
  }

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
      solvedCount: isTeacher ? undefined : solvedByClass.get(row.id) ?? 0,
      nextDueAt: nextDueByClass.get(row.id),
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
  const [members, groups, assigned, activities] = await Promise.all([
    fetchAllPages<MemberRow>((from, to) =>
      db().from("class_members").select("class_id,user_id,group_id,joined_at").eq("class_id", classId).order("joined_at").order("user_id").range(from, to),
    ),
    fetchAllPages<GroupRow>((from, to) =>
      db().from("class_groups").select("id,class_id,name,created_at").eq("class_id", classId).order("name").order("id").range(from, to),
    ),
    fetchAllPages<ClassProblemRow>((from, to) =>
      db().from("class_problems").select("class_id,problem_id,assigned_at,due_at").eq("class_id", classId).order("assigned_at", { ascending: false }).order("problem_id").range(from, to),
    ),
    fetchClassActivitiesSafe(classId),
  ]);

  const isMember = members.some((m) => m.user_id === viewer.id);
  if (!isTeacher && !isMember && viewer.role !== "admin") return null;

  const [profiles, catalogSummaries] = await Promise.all([
    loadProfiles([cls.teacher_id, ...members.map((m) => m.user_id)]),
    // Classes only expose unlocked practice problems (never upcoming or private live tournament problems).
    listProblemSummaries(undefined, { includeLocked: false, includeClassProblems: true }),
  ]);

  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
  const catalogById = new Map(catalogSummaries.map((p) => [p.id, p]));
  const visibleAssigned = assigned.filter((p) => catalogById.has(p.problem_id));
  const problemIds = visibleAssigned.map((p) => p.problem_id);
  const memberIds = members.map((m) => m.user_id);

  // Pull accepted solves for class members on visible class-assigned problems, chunked to stay under URL limits.
  const solvedByUser = new Map<string, Set<string>>();
  if (problemIds.length > 0 && memberIds.length > 0) {
    for (let mi = 0; mi < memberIds.length; mi += IN_CHUNK_SIZE) {
      const mChunk = memberIds.slice(mi, mi + IN_CHUNK_SIZE);
      for (let pi = 0; pi < problemIds.length; pi += IN_CHUNK_SIZE) {
        const pChunk = problemIds.slice(pi, pi + IN_CHUNK_SIZE);
        const subs = await fetchAllPages<{ user_id: string; problem_id: string }>((from, to) =>
          db()
            .from("submissions")
            .select("user_id,problem_id")
            .eq("verdict", "ACCEPTED")
            .in("user_id", mChunk)
            .in("problem_id", pChunk)
            .order("id")
            .range(from, to),
        );
        for (const s of subs) {
          const set = solvedByUser.get(s.user_id) ?? new Set<string>();
          set.add(s.problem_id);
          solvedByUser.set(s.user_id, set);
        }
      }
    }
  }

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
        isCustom: info.id.startsWith("cls-"),
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
    activities,
    catalogProblems: isTeacher
      ? catalogSummaries
          .filter((p) => !p.id.startsWith("cls-"))
          .map((p) => ({
            id: p.id,
            title: p.title,
            difficulty: p.difficulty,
            category: p.category,
          }))
      : undefined,
  };
}

async function requireClassTeacher(
  viewer: Viewer,
  classId: string,
): Promise<{ ok: true; className: string } | { ok: false; status: number; error: string }> {
  if (!canCreateClasses(viewer.role)) return { ok: false, status: 403, error: "Only approved faculty teachers can manage classes." };
  if (!isUuid(classId)) return { ok: false, status: 404, error: "Class not found." };
  const cls = must(await db().from("classes").select("teacher_id,name").eq("id", classId).maybeSingle()) as { teacher_id: string; name: string } | null;
  if (!cls) return { ok: false, status: 404, error: "Class not found." };
  if (cls.teacher_id !== viewer.id) return { ok: false, status: 403, error: "Only the class teacher can do that." };
  return { ok: true, className: cls.name };
}

export async function performClassAction(
  viewer: Viewer,
  classId: string,
  body: unknown,
): Promise<ClassActionResult<{ inviteCode?: string; problemId?: string }>> {
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
    const due = parseOptionalDueAt(body.dueAt);
    if (!due.ok) return { ok: false, status: 422, fieldErrors: { dueAt: due.error } };
    if (!(await problemExists(problemId, { includeLocked: false }))) {
      return { ok: false, status: 404, error: "Problem not found." };
    }
    const { error } = await db()
      .from("class_problems")
      .insert({ class_id: classId, problem_id: problemId, due_at: due.value ?? null });
    if (error?.code === "23505") return { ok: true };
    if (error) throw new Error(`Database error: ${error.message}`);

    const [members, summaries] = await Promise.all([
      listClassMemberIds(classId),
      listProblemSummaries(undefined, { includeLocked: false }),
    ]);
    const problemTitle = summaries.find((p) => p.id === problemId)?.title ?? problemId;
    await recordClassActivitySafe({
      class_id: classId,
      teacher_id: viewer.id,
      title: `Assigned: ${problemTitle}`,
      body: due.value ? "New coding assignment with a deadline." : "New coding problem added to this class.",
      kind: due.value ? "deadline" : "activity",
      problem_id: problemId,
      due_at: due.value ?? null,
    });
    await notifyUsers(members, {
      kind: due.value ? "class_deadline" : "class_problem",
      title: `${gate.className}: ${problemTitle}`,
      body: due.value
        ? `${viewer.name} assigned a problem with a deadline.`
        : `${viewer.name} assigned a new coding problem.`,
      href: `/app/workspace?problem=${encodeURIComponent(problemId)}`,
      dueAt: due.value,
    });
    return { ok: true };
  }

  if (action === "createProblem") {
    const checked = checkTeacherProblem(body);
    if (!checked.ok) return { ok: false, status: 422, fieldErrors: checked.fieldErrors };
    const p = checked.problem;
    const problemId = slugifyClassProblem(p.title);

    const { error: insertErr } = await db().from("problems").insert({
      id: problemId,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      category: p.category,
      tags: p.tags,
      supported_languages: ALL_SUPPORTED_LANGUAGES,
      input_spec: p.inputSpec,
      output_spec: p.outputSpec,
      constraints: p.constraints,
      test_cases: p.testCases,
      time_limit_ms: p.timeLimitMs,
      memory_limit_kb: p.memoryLimitKb,
      created_by: viewer.id,
    });
    if (insertErr) throw new Error(`Database error: ${insertErr.message}`);

    const { error: assignErr } = await db()
      .from("class_problems")
      .insert({ class_id: classId, problem_id: problemId, due_at: p.dueAt ?? null });
    if (assignErr) {
      await db().from("problems").delete().eq("id", problemId);
      throw new Error(`Database error: ${assignErr.message}`);
    }

    const members = await listClassMemberIds(classId);
    await recordClassActivitySafe({
      class_id: classId,
      teacher_id: viewer.id,
      title: `New problem: ${p.title}`,
      body: p.dueAt ? "Custom class problem with a deadline." : "Custom coding problem posted by your teacher.",
      kind: p.dueAt ? "deadline" : "activity",
      problem_id: problemId,
      due_at: p.dueAt ?? null,
    });
    await notifyUsers(members, {
      kind: p.dueAt ? "class_deadline" : "class_problem",
      title: `${gate.className}: ${p.title}`,
      body: p.dueAt
        ? `${viewer.name} created a new class problem with a deadline.`
        : `${viewer.name} created a new class problem for you to solve.`,
      href: `/app/workspace?problem=${encodeURIComponent(problemId)}`,
      dueAt: p.dueAt,
    });

    return { ok: true, problemId };
  }

  if (action === "postActivity") {
    const checked = checkClassActivity(body);
    if (!checked.ok) return { ok: false, status: 422, fieldErrors: checked.fieldErrors };
    const act = checked.activity;
    if (act.problemId && !(await problemExists(act.problemId, { includeLocked: false }))) {
      return { ok: false, status: 404, error: "Problem not found." };
    }
    const { error } = await db().from("class_activities").insert({
      class_id: classId,
      teacher_id: viewer.id,
      title: act.title,
      body: act.body ?? null,
      kind: act.kind,
      problem_id: act.problemId ?? null,
      due_at: act.dueAt ?? null,
    });
    if (error) {
      if (isMissingActivitiesTable(error.message)) {
        return {
          ok: false,
          status: 503,
          error: "Run migration 20261122010000_class_activities_and_notifications.sql in Supabase first to post activities.",
        };
      }
      throw new Error(`Database error: ${error.message}`);
    }

    const members = await listClassMemberIds(classId);
    await notifyUsers(members, {
      kind: act.kind === "deadline" || act.dueAt ? "class_deadline" : "class_activity",
      title: `${gate.className}: ${act.title}`,
      body: act.body ?? `${viewer.name} posted a new ${act.kind}.`,
      href: `/app/classes/${classId}`,
      dueAt: act.dueAt,
    });
    return { ok: true };
  }

  if (action === "deleteActivity") {
    const activityId = text(body, "activityId");
    if (!isUuid(activityId)) return { ok: false, status: 400, error: "Choose a valid activity." };
    const { error } = await db().from("class_activities").delete().eq("id", activityId).eq("class_id", classId);
    if (error && !isMissingActivitiesTable(error.message)) throw new Error(`Database error: ${error.message}`);
    return { ok: true };
  }

  if (action === "removeProblem") {
    const problemId = text(body, "problemId");
    if (!problemId) return { ok: false, status: 400, error: "Choose a problem." };
    must(await db().from("class_problems").delete().eq("class_id", classId).eq("problem_id", problemId));
    if (problemId.startsWith("cls-")) {
      await db().from("problems").delete().eq("id", problemId).eq("created_by", viewer.id);
    }
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
    const assignedCustom = await fetchAllPages<{ problem_id: string }>((from, to) =>
      db().from("class_problems").select("problem_id").eq("class_id", classId).order("problem_id").range(from, to),
    );
    must(await db().from("classes").delete().eq("id", classId));
    const customIds = assignedCustom.map((r) => r.problem_id).filter((id) => id.startsWith("cls-"));
    for (const pid of customIds) {
      await db().from("problems").delete().eq("id", pid).eq("created_by", viewer.id);
    }
    return { ok: true };
  }

  return { ok: false, status: 400, error: "Unknown class action." };
}
