"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Code2,
  Copy,
  Loader2,
  LogOut,
  Megaphone,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { DifficultyBadge } from "@/components/app/difficulty-badge";
import { DetailPageSkeleton } from "@/components/app/page-skeletons";
import { TextAreaField, TextField } from "@/components/app/school/field";
import { ConfirmDialog } from "@/components/app/workspace/submission-modals";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { fetchClassDetail, postClassAction } from "@/lib/classes/api";
import type { ClassActivityKind, ClassDetailPayload } from "@/types/classes";
import { CreateProblemDialog } from "./create-problem-dialog";

function formatDueBadge(dueAt: string): { label: string; urgent: boolean } {
  const ms = Date.parse(dueAt);
  if (Number.isNaN(ms)) return { label: "Deadline", urgent: false };
  const diff = ms - Date.now();
  if (diff < 0) return { label: "Past due", urgent: true };
  const hours = Math.round(diff / 3_600_000);
  if (hours < 1) return { label: "Due < 1h", urgent: true };
  if (hours < 24) return { label: `Due in ${hours}h`, urgent: true };
  const days = Math.round(hours / 24);
  if (days <= 3) return { label: `Due in ${days}d`, urgent: true };
  return {
    label: `Due ${new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
    urgent: false,
  };
}

export function ClassDetailView({ classId }: { classId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<ClassDetailPayload | null>(null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Modals
  const [createProblemOpen, setCreateProblemOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  // Assign catalog problem modal state
  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [assignDueAt, setAssignDueAt] = useState("");

  // Post activity/deadline modal state
  const [actTitle, setActTitle] = useState("");
  const [actKind, setActKind] = useState<ClassActivityKind>("activity");
  const [actBody, setActBody] = useState("");
  const [actDueAt, setActDueAt] = useState("");
  const [actError, setActError] = useState<string>();

  // Create group modal state
  const [groupName, setGroupName] = useState("");
  const [groupError, setGroupError] = useState<string>();

  // Confirmations
  const [confirmDeleteClass, setConfirmDeleteClass] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    body: Record<string, unknown>;
    okMessage?: string;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetchClassDetail(classId);
    if (res.ok) {
      setDetail(res.data);
      setError(undefined);
    } else {
      setError(res.error ?? "Could not load class.");
    }
  }, [classId]);

  useEffect(() => {
    let live = true;
    void fetchClassDetail(classId).then((res) => {
      if (!live) return;
      if (res.ok) setDetail(res.data);
      else setError(res.error ?? "Could not load class.");
    });
    return () => {
      live = false;
    };
  }, [classId]);

  const act = async (key: string, body: Record<string, unknown>, options?: { reload?: boolean; okMessage?: string }) => {
    setBusyKey(key);
    setError(undefined);
    setNotice(undefined);
    try {
      const res = await postClassAction(classId, body);
      if (!res.ok) {
        setError(res.error ?? "Action failed. Try again.");
        return res;
      }
      if (options?.okMessage) setNotice(options.okMessage);
      if (options?.reload !== false) await load();
      return res;
    } finally {
      setBusyKey(null);
    }
  };

  const handleCopyCode = async () => {
    if (!detail?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(detail.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable.
    }
  };

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    setGroupError(undefined);
    const res = await act("createGroup", { action: "createGroup", name: groupName }, { okMessage: `Created group "${groupName.trim()}".` });
    if (!res.ok) {
      setGroupError(res.fieldErrors?.name ?? res.error);
      return;
    }
    setGroupName("");
    setGroupModalOpen(false);
  };

  const handleAddProblem = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProblemId) return;
    const res = await act(
      "addProblem",
      {
        action: "addProblem",
        problemId: selectedProblemId,
        dueAt: assignDueAt ? new Date(assignDueAt).toISOString() : undefined,
      },
      { okMessage: "Assigned problem and notified enrolled students." },
    );
    if (res.ok) {
      setSelectedProblemId("");
      setAssignDueAt("");
      setAssignModalOpen(false);
    }
  };

  const handlePostActivity = async (event: FormEvent) => {
    event.preventDefault();
    setActError(undefined);
    const res = await act(
      "postActivity",
      {
        action: "postActivity",
        title: actTitle,
        kind: actKind,
        body: actBody,
        dueAt: actDueAt ? new Date(actDueAt).toISOString() : undefined,
      },
      { okMessage: "Posted activity and notified enrolled students." },
    );
    if (!res.ok) {
      setActError(res.fieldErrors?.title ?? res.fieldErrors?.dueAt ?? res.error);
      return;
    }
    setActTitle("");
    setActBody("");
    setActDueAt("");
    setActKind("activity");
    setActivityModalOpen(false);
  };

  if (!detail) {
    return error ? (
      <div className="mx-auto max-w-4xl space-y-4 p-8">
        <p role="alert" className="text-sm text-[var(--color-pink)]">{error}</p>
        <Link href="/app/classes" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft size={14} aria-hidden="true" /> Back to Classes
        </Link>
      </div>
    ) : (
      <DetailPageSkeleton label="Loading class…" maxWidth="max-w-6xl" />
    );
  }

  const anyBusy = busyKey !== null;
  const assignedIds = new Set(detail.problems.map((p) => p.id));
  const unassignedCatalog = (detail.catalogProblems ?? []).filter((p) => !assignedIds.has(p.id));
  const viewerSolvedCount = detail.problems.filter((p) => p.solvedByViewer).length;
  const totalPossible = detail.members.length * detail.problems.length;
  const totalClassSolves = detail.problems.reduce((sum, p) => sum + p.solvedByCount, 0);
  const overallPct = detail.isTeacher
    ? totalPossible > 0 ? Math.round((totalClassSolves / totalPossible) * 100) : 0
    : detail.problems.length > 0 ? Math.round((viewerSolvedCount / detail.problems.length) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="space-y-3">
        <Link href="/app/classes" className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
          <ArrowLeft size={14} aria-hidden="true" /> Back to Classes
        </Link>

        <div className="skeuo-panel space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{detail.name}</h1>
                {detail.section && (
                  <span className="skeuo-well rounded-lg border px-2.5 py-0.5 font-code text-xs text-[var(--color-primary-text)]">
                    {detail.section}
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                Teacher: <strong className="font-medium text-[var(--color-text-main)]">{detail.teacherName}</strong>
              </p>
              {detail.description && (
                <p className="max-w-2xl text-sm text-[var(--color-text-muted)]">{detail.description}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {detail.isTeacher && detail.inviteCode ? (
                <>
                  <div className="skeuo-well flex items-center gap-2 rounded-xl border px-3 py-1.5">
                    <span className="text-xs text-[var(--color-text-muted)]">Invite</span>
                    <span className="font-code text-sm font-semibold text-[var(--color-primary-text)]">{detail.inviteCode}</span>
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => void handleCopyCode()} aria-label="Copy invite code">
                      {copied ? <Check size={14} aria-hidden="true" className="text-[var(--color-mint)]" /> : <Copy size={14} aria-hidden="true" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={anyBusy}
                    onClick={() => void act("regenerateCode", { action: "regenerateCode" }, { okMessage: "Generated a fresh invite code." })}
                    title="Generate a new invite code"
                  >
                    {busyKey === "regenerateCode" ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw size={14} aria-hidden="true" />
                    )}
                    {busyKey === "regenerateCode" ? "Rotating…" : "New code"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={anyBusy}
                    onClick={() => setConfirmDeleteClass(true)}
                  >
                    <Trash2 size={14} aria-hidden="true" /> Delete
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled={anyBusy} onClick={() => setConfirmLeave(true)}>
                  <LogOut size={14} aria-hidden="true" /> Leave class
                </Button>
              )}
            </div>
          </div>

          {/* Class stats + progress bar */}
          <div className="grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="skeuo-well rounded-xl border px-3.5 py-2.5">
              <p className="text-[11px] text-[var(--color-text-muted)]">Students</p>
              <p className="font-code mt-0.5 text-lg font-semibold">{detail.members.length}</p>
            </div>
            <div className="skeuo-well rounded-xl border px-3.5 py-2.5">
              <p className="text-[11px] text-[var(--color-text-muted)]">Problems</p>
              <p className="font-code mt-0.5 text-lg font-semibold">{detail.problems.length}</p>
            </div>
            <div className="skeuo-well rounded-xl border px-3.5 py-2.5">
              <p className="text-[11px] text-[var(--color-text-muted)]">Groups</p>
              <p className="font-code mt-0.5 text-lg font-semibold">{detail.groups.length}</p>
            </div>
            <div className="skeuo-well space-y-1.5 rounded-xl border px-3.5 py-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--color-text-muted)]">{detail.isTeacher ? "Class solve rate" : "Your progress"}</span>
                <span className="font-code font-semibold text-[var(--color-primary-text)]">{overallPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Teacher Quick Action Bar */}
          {detail.isTeacher && (
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4">
              <Button type="button" size="sm" onClick={() => setCreateProblemOpen(true)}>
                <Sparkles size={14} aria-hidden="true" /> Create own problem
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalOpen(true)}>
                <Plus size={14} aria-hidden="true" /> Assign catalog problem
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setActivityModalOpen(true)}>
                <Megaphone size={14} aria-hidden="true" /> Post activity / deadline
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setGroupModalOpen(true)}>
                <Users size={14} aria-hidden="true" /> New group
              </Button>
            </div>
          )}
        </div>
      </header>

      {error && <p role="alert" className="skeuo-recess rounded-xl p-3.5 text-sm text-[var(--color-pink)]">{error}</p>}
      {notice && <p role="status" className="skeuo-recess rounded-xl p-3.5 text-sm text-[var(--color-mint)]">{notice}</p>}

      {/* Class Activities & Deadlines */}
      <section aria-labelledby="activities-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-[var(--color-primary-text)]" aria-hidden="true" />
            <div>
              <h2 id="activities-heading" className="text-lg font-semibold">Activities &amp; deadlines ({detail.activities.length})</h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Announcements, assignments, and due dates posted by your teacher trigger student notifications automatically.
              </p>
            </div>
          </div>
          {detail.isTeacher && (
            <Button type="button" variant="outline" size="sm" onClick={() => setActivityModalOpen(true)}>
              <Plus size={14} aria-hidden="true" /> Post update
            </Button>
          )}
        </div>

        {detail.activities.length === 0 ? (
          <div className="skeuo-well rounded-xl border p-4 text-sm text-[var(--color-text-muted)]">
            {detail.isTeacher
              ? "No activities or announcements posted yet. Use Post activity / deadline above to notify your students."
              : "No announcements or deadlines posted by your teacher yet."}
          </div>
        ) : (
          <div className="space-y-2.5">
            {detail.activities.map((item) => {
              const due = item.dueAt ? formatDueBadge(item.dueAt) : null;
              return (
                <article key={item.id} className="skeuo-recess flex flex-wrap items-start justify-between gap-3 rounded-xl px-4 py-3.5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 font-code text-[10px] capitalize ${
                          item.kind === "deadline"
                            ? "bg-[var(--color-hard-bg)] text-[var(--color-pink)]"
                            : item.kind === "activity"
                              ? "bg-[var(--color-medium-bg)] text-[var(--color-primary-text)]"
                              : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {item.kind}
                      </span>
                      <h3 className="text-sm font-semibold text-[var(--color-text-main)]">{item.title}</h3>
                      {due && (
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-code text-[11px] ${
                            due.urgent
                              ? "bg-[var(--color-hard-bg)] text-[var(--color-pink)]"
                              : "bg-[var(--color-surface)] text-[var(--color-primary-text)]"
                          }`}
                        >
                          <CalendarClock size={11} aria-hidden="true" /> {due.label}
                        </span>
                      )}
                    </div>
                    {item.body && <p className="text-xs text-[var(--color-text-muted)]">{item.body}</p>}
                    <p className="font-code text-[10px] text-[var(--color-text-muted)]">
                      Posted {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.problemId && (
                      <Link href={`/app/workspace?problem=${encodeURIComponent(item.problemId)}`} className={buttonVariants({ size: "sm" })}>
                        <Code2 size={13} aria-hidden="true" /> Open problem
                      </Link>
                    )}
                    {detail.isTeacher && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={anyBusy}
                        aria-label={`Delete activity ${item.title}`}
                        onClick={() =>
                          setPendingConfirm({
                            title: `Delete "${item.title}"?`,
                            description: "This removes the post from the class activity feed.",
                            confirmLabel: "Delete post",
                            body: { action: "deleteActivity", activityId: item.id },
                            okMessage: "Removed activity post.",
                          })
                        }
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Assigned & Custom Problems */}
      <section aria-labelledby="class-problems-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="class-problems-heading" className="text-lg font-semibold">Class problems ({detail.problems.length})</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Open any problem in the Exeku workspace to write code and submit against automated tests.
            </p>
          </div>
          {detail.isTeacher && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => setCreateProblemOpen(true)}>
                <Sparkles size={14} aria-hidden="true" /> Create own problem
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalOpen(true)}>
                <Plus size={14} aria-hidden="true" /> Assign existing
              </Button>
            </div>
          )}
        </div>

        {detail.problems.length === 0 ? (
          <div className="skeuo-well rounded-xl border p-5 text-sm text-[var(--color-text-muted)]">
            {detail.isTeacher
              ? "No problems assigned yet. Create your own custom problem or assign one from the catalog."
              : "Your teacher has not assigned any problems to this class yet."}
          </div>
        ) : (
          <div className="space-y-2.5">
            {detail.problems.map((problem) => {
              const due = problem.dueAt ? formatDueBadge(problem.dueAt) : null;
              const solvePct = detail.members.length > 0 ? Math.round((problem.solvedByCount / detail.members.length) * 100) : 0;
              return (
                <div
                  key={problem.id}
                  className="skeuo-recess flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--color-text-main)]">{problem.title}</span>
                      <DifficultyBadge difficulty={problem.difficulty} />
                      {problem.isCustom && (
                        <span className="rounded-md border border-[var(--color-primary-edge)] bg-[var(--color-surface)] px-1.5 py-0.5 font-code text-[10px] text-[var(--color-primary-text)]">
                          Custom
                        </span>
                      )}
                      {due && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-code text-[11px] ${
                            due.urgent
                              ? "bg-[var(--color-hard-bg)] text-[var(--color-pink)]"
                              : "bg-[var(--color-surface)] text-[var(--color-primary-text)]"
                          }`}
                        >
                          <CalendarClock size={11} aria-hidden="true" /> {due.label}
                        </span>
                      )}
                      {problem.solvedByViewer && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-easy-bg)] px-2 py-0.5 font-code text-xs text-[var(--color-mint)]">
                          <CheckCircle2 size={12} aria-hidden="true" /> AC Solved
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
                      <span>{problem.category}</span>
                      <span>
                        Solved by <span className="font-code text-[var(--color-text-main)]">{problem.solvedByCount}/{detail.members.length}</span> ({solvePct}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/app/workspace?problem=${encodeURIComponent(problem.id)}`} className={buttonVariants({ size: "sm" })}>
                      <Code2 size={14} aria-hidden="true" /> {problem.solvedByViewer ? "Review" : "Solve"}
                    </Link>
                    {detail.isTeacher && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        disabled={anyBusy}
                        onClick={() =>
                          setPendingConfirm({
                            title: `Remove "${problem.title}"?`,
                            description: "Students will no longer see this problem in the class assignment list. Existing submissions stay on their profiles.",
                            confirmLabel: "Remove problem",
                            body: { action: "removeProblem", problemId: problem.id },
                            okMessage: `Removed "${problem.title}" from this class.`,
                          })
                        }
                        aria-label={`Remove ${problem.title} from class`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Student Groups + Roster */}
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
        {/* Groups */}
        <section aria-labelledby="groups-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users size={18} aria-hidden="true" className="text-[var(--color-primary-text)]" />
              <h2 id="groups-heading" className="text-lg font-semibold">Student groups ({detail.groups.length})</h2>
            </div>
            {detail.isTeacher && (
              <Button type="button" variant="outline" size="sm" onClick={() => setGroupModalOpen(true)}>
                <Plus size={14} aria-hidden="true" /> Add group
              </Button>
            )}
          </div>

          {detail.groups.length === 0 ? (
            <div className="skeuo-well rounded-xl border p-4 text-sm text-[var(--color-text-muted)]">
              {detail.isTeacher
                ? "Create groups (e.g. Group A, Lab 1) and assign students from the roster."
                : "No groups have been created in this class yet."}
            </div>
          ) : (
            <div className="space-y-3">
              {detail.groups.map((group) => {
                const groupMembers = detail.members.filter((m) => m.groupId === group.id);
                const gPct = group.totalPossibleSolves > 0
                  ? Math.round((group.solvedCount / group.totalPossibleSolves) * 100)
                  : 0;
                return (
                  <div key={group.id} className="skeuo-well space-y-2.5 rounded-xl border p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-[var(--color-text-main)]">{group.name}</h3>
                        <p className="font-code text-xs text-[var(--color-text-muted)]">
                          {groupMembers.length} {groupMembers.length === 1 ? "student" : "students"} · {group.solvedCount}/{group.totalPossibleSolves} solves ({gPct}%)
                        </p>
                      </div>
                      {detail.isTeacher && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={anyBusy}
                          onClick={() =>
                            setPendingConfirm({
                              title: `Delete group "${group.name}"?`,
                              description: "Members in this group will become unassigned, but they will remain enrolled in the class.",
                              confirmLabel: "Delete group",
                              body: { action: "deleteGroup", groupId: group.id },
                              okMessage: `Deleted group "${group.name}".`,
                            })
                          }
                          aria-label={`Delete group ${group.name}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </Button>
                      )}
                    </div>

                    {group.totalPossibleSolves > 0 && (
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
                        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${gPct}%` }} />
                      </div>
                    )}

                    {groupMembers.length === 0 ? (
                      <p className="text-xs text-[var(--color-text-muted)]">No students assigned yet.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {groupMembers.map((member) => (
                          <li key={member.userId} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-[var(--color-text-main)]">{member.name}</span>
                            <span className="font-code text-[var(--color-primary-text)]">
                              {member.solvedProblemIds.length}/{detail.problems.length} AC
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Roster & Group Assignment */}
        <section aria-labelledby="roster-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
          <div>
            <h2 id="roster-heading" className="text-lg font-semibold">Students ({detail.members.length})</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              {detail.isTeacher
                ? "Assign students to groups and monitor their Accepted submissions."
                : "Classmates enrolled in this class and their group placements."}
            </p>
          </div>

          {detail.members.length === 0 ? (
            <div className="skeuo-well rounded-xl border p-5 text-sm text-[var(--color-text-muted)]">
              No students have joined yet. Share the invite code <span className="font-code text-[var(--color-primary-text)]">{detail.inviteCode}</span> so students can enroll.
            </div>
          ) : (
            <div className="space-y-2.5">
              {detail.members.map((member) => (
                <div
                  key={member.userId}
                  className="skeuo-recess flex flex-wrap items-center justify-between gap-3 rounded-xl px-3.5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <PixelAvatar avatarId={member.avatarId} borderId={member.borderId} size={34} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-text-main)]">{member.name}</p>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">
                        {member.schoolEmail ? `${member.schoolEmail} · ` : ""}
                        <span className="font-code text-[var(--color-primary-text)]">
                          {member.solvedProblemIds.length}/{detail.problems.length} solved
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {detail.isTeacher ? (
                      <>
                        <div className="w-40">
                          <Select
                            aria-label={`Assign group for ${member.name}`}
                            value={member.groupId ?? ""}
                            disabled={anyBusy}
                            onChange={(next) =>
                              void act(`assign:${member.userId}`, {
                                action: "assignMemberGroup",
                                userId: member.userId,
                                groupId: next || null,
                              })
                            }
                          >
                            <option value="">No group</option>
                            {detail.groups.map((g) => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={anyBusy}
                          onClick={() =>
                            setPendingConfirm({
                              title: `Remove ${member.name} from this class?`,
                              description: "They will be removed from the class roster and group, but can rejoin later with the invite code.",
                              confirmLabel: "Remove student",
                              body: { action: "removeMember", userId: member.userId },
                              okMessage: `Removed ${member.name} from the class.`,
                            })
                          }
                          aria-label={`Remove ${member.name} from class`}
                        >
                          <UserMinus size={14} aria-hidden="true" />
                        </Button>
                      </>
                    ) : (
                      <span className="skeuo-well rounded-lg border px-2.5 py-1 font-code text-xs text-[var(--color-text-muted)]">
                        {member.groupName ?? "Unassigned"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Teacher Modals */}
      <CreateProblemDialog
        classId={classId}
        open={createProblemOpen}
        onOpenChange={setCreateProblemOpen}
        onCreated={(createdTitle) => {
          setNotice(`Created "${createdTitle}" and notified enrolled students.`);
          void load();
        }}
      />

      {/* Assign Catalog Problem Modal */}
      <Dialog
        open={assignModalOpen}
        onOpenChange={(open) => {
          if (busyKey !== "addProblem") setAssignModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddProblem} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Assign catalog problem</DialogTitle>
              <DialogDescription>
                Pick an existing Exeku problem and set an optional deadline. Enrolled students will be notified.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <label htmlFor="modal-assign-problem" className="block text-sm font-medium">
                Problem
              </label>
              <Select
                id="modal-assign-problem"
                value={selectedProblemId}
                onChange={setSelectedProblemId}
                disabled={busyKey === "addProblem" || unassignedCatalog.length === 0}
              >
                <option value="">
                  {unassignedCatalog.length === 0 ? "All catalog problems already assigned" : "Choose a problem…"}
                </option>
                {unassignedCatalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.category})
                  </option>
                ))}
              </Select>
            </div>
            <TextField
              id="modal-assign-due"
              label="Deadline (optional)"
              type="datetime-local"
              value={assignDueAt}
              onChange={(e) => setAssignDueAt(e.target.value)}
              disabled={busyKey === "addProblem"}
            />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busyKey === "addProblem"} onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busyKey === "addProblem" || !selectedProblemId}>
                {busyKey === "addProblem" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Assigning…
                  </>
                ) : (
                  <>
                    <Plus size={14} aria-hidden="true" /> Assign problem
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Post Activity / Deadline Modal */}
      <Dialog
        open={activityModalOpen}
        onOpenChange={(open) => {
          if (busyKey !== "postActivity") {
            setActivityModalOpen(open);
            setActError(undefined);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handlePostActivity} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone size={17} className="text-[var(--color-primary-text)]" aria-hidden="true" />
                Post class activity or deadline
              </DialogTitle>
              <DialogDescription>
                Every student enrolled in {detail.name} receives a notification right away.
              </DialogDescription>
            </DialogHeader>
            {actError && (
              <p role="alert" className="skeuo-recess rounded-xl p-3 text-xs text-[var(--color-pink)]">
                {actError}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="modal-activity-kind" className="block text-sm font-medium">
                  Type
                </label>
                <Select
                  id="modal-activity-kind"
                  value={actKind}
                  onChange={(v) => setActKind(v as ClassActivityKind)}
                  disabled={busyKey === "postActivity"}
                >
                  <option value="activity">Activity</option>
                  <option value="deadline">Deadline</option>
                  <option value="announcement">Announcement</option>
                </Select>
              </div>
              <TextField
                id="modal-activity-due"
                label={actKind === "deadline" ? "Due date & time" : "Due date (optional)"}
                type="datetime-local"
                value={actDueAt}
                onChange={(e) => setActDueAt(e.target.value)}
                disabled={busyKey === "postActivity"}
                required={actKind === "deadline"}
              />
            </div>
            <TextField
              id="modal-activity-title"
              label="Title"
              placeholder="Lab 3: Recursion & Arrays"
              value={actTitle}
              onChange={(e) => setActTitle(e.target.value)}
              disabled={busyKey === "postActivity"}
              required
            />
            <TextAreaField
              id="modal-activity-body"
              label="Instructions / details (optional)"
              placeholder="Complete all assigned problems before Friday 11:59 PM."
              rows={3}
              value={actBody}
              onChange={(e) => setActBody(e.target.value)}
              disabled={busyKey === "postActivity"}
            />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busyKey === "postActivity"} onClick={() => setActivityModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busyKey === "postActivity" || !actTitle.trim()}>
                {busyKey === "postActivity" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Posting…
                  </>
                ) : (
                  "Post & notify students"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Group Modal */}
      <Dialog
        open={groupModalOpen}
        onOpenChange={(open) => {
          if (busyKey !== "createGroup") {
            setGroupModalOpen(open);
            setGroupError(undefined);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create student group</DialogTitle>
              <DialogDescription>
                Organize students into teams or lab groups to compare solve progress together.
              </DialogDescription>
            </DialogHeader>
            <TextField
              id="modal-group-name"
              label="Group name"
              placeholder="Group 1 · Team Alpha"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              error={groupError}
              disabled={busyKey === "createGroup"}
              required
            />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busyKey === "createGroup"} onClick={() => setGroupModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busyKey === "createGroup" || !groupName.trim()}>
                {busyKey === "createGroup" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Creating…
                  </>
                ) : (
                  "Create group"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteClass}
        onOpenChange={setConfirmDeleteClass}
        title="Delete this class?"
        description="All groups, enrollments, activities, and class problem assignments will be permanently removed. Student submissions stay on their profiles."
        confirmLabel="Delete class"
        destructive
        onConfirm={async () => {
          setConfirmDeleteClass(false);
          const res = await act("deleteClass", { action: "deleteClass" }, { reload: false });
          if (res.ok) router.push("/app/classes");
        }}
      />

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave this class?"
        description="You can rejoin later with the teacher's invite code."
        confirmLabel="Leave class"
        destructive
        onConfirm={async () => {
          setConfirmLeave(false);
          const res = await act("leaveClass", { action: "leaveClass" }, { reload: false });
          if (res.ok) router.push("/app/classes");
        }}
      />

      <ConfirmDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
        title={pendingConfirm?.title ?? "Confirm action"}
        description={pendingConfirm?.description ?? ""}
        confirmLabel={pendingConfirm?.confirmLabel ?? "Confirm"}
        destructive
        onConfirm={async () => {
          const action = pendingConfirm;
          setPendingConfirm(null);
          if (action) await act("confirmAction", action.body, { okMessage: action.okMessage });
        }}
      />
    </div>
  );
}
