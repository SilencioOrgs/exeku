import "server-only";
import { isObject, isUuid, text } from "@/lib/accounts/rules";
import type { Viewer } from "@/lib/auth/viewer";
import { db, fetchAllPages, isMissingRelationError, must } from "@/lib/db/client";
import { listProblemSummaries } from "@/lib/problems/store";
import type { NotificationItem, NotificationKind, NotificationsPayload } from "@/types/notifications";

interface NotificationRow {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  due_at: string | null;
  read_at: string | null;
  created_at: string;
}

const IN_CHUNK_SIZE = 100;
const DEADLINE_LOOKAHEAD_MS = 72 * 60 * 60 * 1000;
const DEADLINE_OVERDUE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface NewNotificationInput {
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;
  dueAt?: string;
}

/** Fan out a notification to a list of users. Gracefully no-ops if notifications migration is not applied yet. */
export async function notifyUsers(userIds: string[], input: NewNotificationInput): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;

  for (let i = 0; i < unique.length; i += IN_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + IN_CHUNK_SIZE);
    const rows = chunk.map((userId) => ({
      user_id: userId,
      kind: input.kind,
      title: input.title.slice(0, 160),
      body: input.body ? input.body.slice(0, 400) : null,
      href: input.href ?? null,
      due_at: input.dueAt ?? null,
      read_at: null,
    }));
    const { error } = await db().from("notifications").insert(rows);
    if (error) {
      if (isMissingRelationError(error, ["notifications"])) return;
      // Non-critical side effect: log and continue remaining chunks instead of dropping later recipients.
      console.error("[notifications] failed to insert notifications:", error.message);
      continue;
    }
  }
}

async function fetchStoredNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await db()
    .from("notifications")
    .select("id,user_id,kind,title,body,href,due_at,read_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingRelationError(error, ["notifications"])) return [];
    throw new Error(`Database error: ${error.message}`);
  }

  return ((data ?? []) as NotificationRow[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body ?? undefined,
    href: row.href ?? undefined,
    dueAt: row.due_at ?? undefined,
    read: Boolean(row.read_at),
    createdAt: row.created_at,
  }));
}

/**
 * Synthesizes upcoming/recently-overdue deadline alerts from enrolled class_problems
 * that the student has not solved yet, so deadlines stay visible even across migrations.
 */
async function synthesizeDeadlineAlerts(viewer: Viewer, nowMs: number): Promise<NotificationItem[]> {
  const memberships = await fetchAllPages<{ class_id: string }>((from, to) =>
    db().from("class_members").select("class_id").eq("user_id", viewer.id).order("class_id").range(from, to),
  );
  const classIds = memberships.map((m) => m.class_id);
  if (classIds.length === 0) return [];

  const classRows: { id: string; name: string }[] = [];
  const problemRows: { class_id: string; problem_id: string; assigned_at: string; due_at: string | null }[] = [];
  for (let i = 0; i < classIds.length; i += IN_CHUNK_SIZE) {
    const chunk = classIds.slice(i, i + IN_CHUNK_SIZE);
    const [cBatch, pBatch] = await Promise.all([
      db().from("classes").select("id,name").in("id", chunk).then((r) => must(r) as { id: string; name: string }[]),
      db()
        .from("class_problems")
        .select("class_id,problem_id,assigned_at,due_at")
        .in("class_id", chunk)
        .not("due_at", "is", null)
        .then((r) => must(r) as { class_id: string; problem_id: string; assigned_at: string; due_at: string | null }[]),
    ]);
    classRows.push(...cBatch);
    problemRows.push(...pBatch);
  }

  const urgent = problemRows.filter((row) => {
    if (!row.due_at) return false;
    const dueMs = Date.parse(row.due_at);
    if (Number.isNaN(dueMs)) return false;
    return dueMs <= nowMs + DEADLINE_LOOKAHEAD_MS && dueMs >= nowMs - DEADLINE_OVERDUE_WINDOW_MS;
  });
  if (urgent.length === 0) return [];

  const urgentProblemIds = [...new Set(urgent.map((u) => u.problem_id))];
  const solvedRows: { problem_id: string }[] = [];
  for (let i = 0; i < urgentProblemIds.length; i += IN_CHUNK_SIZE) {
    const chunk = urgentProblemIds.slice(i, i + IN_CHUNK_SIZE);
    const batch = must(
      await db()
        .from("submissions")
        .select("problem_id")
        .eq("user_id", viewer.id)
        .eq("verdict", "ACCEPTED")
        .in("problem_id", chunk),
    ) as { problem_id: string }[];
    solvedRows.push(...batch);
  }
  const catalog = await listProblemSummaries(undefined, { includeLocked: false, includeClassProblems: true });

  const solvedSet = new Set(solvedRows.map((s) => s.problem_id));
  const classNameById = new Map(classRows.map((c) => [c.id, c.name]));
  const problemTitleById = new Map(catalog.map((p) => [p.id, p.title]));

  return urgent
    .filter((row) => !solvedSet.has(row.problem_id) && problemTitleById.has(row.problem_id))
    .map((row) => {
      const dueMs = Date.parse(row.due_at!);
      const overdue = dueMs < nowMs;
      const problemTitle = problemTitleById.get(row.problem_id)!;
      const className = classNameById.get(row.class_id) ?? "Class";
      return {
        id: `deadline:${row.class_id}:${row.problem_id}`,
        kind: "class_deadline" as const,
        title: overdue ? `Past due: ${problemTitle}` : `Upcoming deadline: ${problemTitle}`,
        body: `Assigned in ${className}. Open the workspace to submit your solution.`,
        href: `/app/workspace?problem=${encodeURIComponent(row.problem_id)}`,
        dueAt: row.due_at!,
        read: false,
        synthetic: true,
        createdAt: row.assigned_at,
      };
    })
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!));
}

export async function listNotificationsForViewer(viewer: Viewer, nowMs = Date.now()): Promise<NotificationsPayload> {
  const [stored, deadlineAlerts] = await Promise.all([
    fetchStoredNotifications(viewer.id),
    synthesizeDeadlineAlerts(viewer, nowMs),
  ]);

  // Avoid duplicating an unread stored notification with the same synthetic deadline alert.
  const unreadStoredKeys = new Set(
    stored.filter((n) => !n.read && n.dueAt && n.href).map((n) => `${n.href}|${n.dueAt}`),
  );
  const uniqueDeadlines = deadlineAlerts.filter((d) => !unreadStoredKeys.has(`${d.href}|${d.dueAt}`));

  const merged = [...uniqueDeadlines, ...stored].slice(0, 35);
  const unreadCount = merged.filter((n) => !n.read).length;

  return {
    notifications: merged,
    unreadCount,
    role: viewer.role,
  };
}

export async function handleNotificationAction(
  viewer: Viewer,
  body: unknown,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!isObject(body)) return { ok: false, status: 400, error: "Invalid request." };
  const action = text(body, "action");

  if (action === "markRead") {
    const id = text(body, "id");
    if (id.startsWith("deadline:")) return { ok: true };
    if (!isUuid(id)) return { ok: false, status: 400, error: "Invalid notification ID." };
    const { error } = await db()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", viewer.id)
      .is("read_at", null);
    if (error && !isMissingRelationError(error, ["notifications"])) throw new Error(`Database error: ${error.message}`);
    return { ok: true };
  }

  if (action === "markAllRead") {
    const { error } = await db()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", viewer.id)
      .is("read_at", null);
    if (error && !isMissingRelationError(error, ["notifications"])) throw new Error(`Database error: ${error.message}`);
    return { ok: true };
  }

  return { ok: false, status: 400, error: "Unknown notification action." };
}
