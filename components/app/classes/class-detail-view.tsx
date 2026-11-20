"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { BrandLoader } from "@/components/brand-loader";
import { DifficultyBadge } from "@/components/app/difficulty-badge";
import { TextField } from "@/components/app/school/field";
import { ConfirmDialog } from "@/components/app/workspace/submission-modals";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { fetchClassDetail, postClassAction } from "@/lib/classes/api";
import type { ClassDetailPayload } from "@/types/classes";

export function ClassDetailView({ classId }: { classId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<ClassDetailPayload | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [groupError, setGroupError] = useState<string>();
  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [confirmDeleteClass, setConfirmDeleteClass] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    body: Record<string, unknown>;
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

  const act = async (body: Record<string, unknown>, reload = true) => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await postClassAction(classId, body);
      if (!res.ok) {
        setError(res.error ?? "Action failed. Try again.");
        return res;
      }
      if (reload) await load();
      return res;
    } finally {
      setBusy(false);
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
    const res = await act({ action: "createGroup", name: groupName });
    if (!res.ok) {
      setGroupError(res.fieldErrors?.name ?? res.error);
      return;
    }
    setGroupName("");
  };

  const handleAddProblem = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProblemId) return;
    const res = await act({ action: "addProblem", problemId: selectedProblemId });
    if (res.ok) setSelectedProblemId("");
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
      <BrandLoader label="Loading class…" />
    );
  }

  const assignedIds = new Set(detail.problems.map((p) => p.id));
  const unassignedCatalog = (detail.catalogProblems ?? []).filter((p) => !assignedIds.has(p.id));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="space-y-3">
        <Link href="/app/classes" className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
          <ArrowLeft size={14} aria-hidden="true" /> Back to Classes
        </Link>

        <div className="skeuo-panel flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
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
              Teacher: <strong className="font-medium text-[var(--color-text-main)]">{detail.teacherName}</strong> ·{" "}
              <span className="font-code">{detail.members.length}</span> students ·{" "}
              <span className="font-code">{detail.groups.length}</span> groups ·{" "}
              <span className="font-code">{detail.problems.length}</span> problems
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
                  disabled={busy}
                  onClick={() => void act({ action: "regenerateCode" })}
                  title="Generate a new invite code"
                >
                  <RefreshCw size={14} aria-hidden="true" /> New code
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => setConfirmDeleteClass(true)}
                >
                  <Trash2 size={14} aria-hidden="true" /> Delete
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirmLeave(true)}>
                <LogOut size={14} aria-hidden="true" /> Leave class
              </Button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <p role="alert" className="skeuo-recess rounded-xl p-3.5 text-sm text-[var(--color-pink)]">
          {error}
        </p>
      )}

      {/* Assigned Problems */}
      <section aria-labelledby="class-problems-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="class-problems-heading" className="text-xl font-semibold">Class problems</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Open any problem in the Exeku workspace to code and submit against hidden tests.
            </p>
          </div>
        </div>

        {detail.isTeacher && (
          <form onSubmit={handleAddProblem} className="skeuo-recess flex flex-col gap-3 rounded-xl p-3.5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="assign-problem-select" className="mb-1.5 block text-xs text-[var(--color-text-muted)]">
                Assign a problem to this class
              </label>
              <Select
                id="assign-problem-select"
                value={selectedProblemId}
                onChange={setSelectedProblemId}
                disabled={busy || unassignedCatalog.length === 0}
              >
                <option value="">{unassignedCatalog.length === 0 ? "All catalog problems already assigned" : "Choose a problem…"}</option>
                {unassignedCatalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.category})
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={busy || !selectedProblemId} className="h-10 px-4">
              <Plus size={15} aria-hidden="true" /> Assign problem
            </Button>
          </form>
        )}

        {detail.problems.length === 0 ? (
          <div className="skeuo-well rounded-xl border p-5 text-sm text-[var(--color-text-muted)]">
            {detail.isTeacher
              ? "No problems assigned yet. Pick one above so students can solve it right from this class."
              : "Your teacher has not assigned any problems to this class yet."}
          </div>
        ) : (
          <div className="space-y-2.5">
            {detail.problems.map((problem) => (
              <div
                key={problem.id}
                className="skeuo-recess flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--color-text-main)]">{problem.title}</span>
                    <DifficultyBadge difficulty={problem.difficulty} />
                    {problem.solvedByViewer && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-easy-bg)] px-2 py-0.5 font-code text-xs text-[var(--color-mint)]">
                        <CheckCircle2 size={12} aria-hidden="true" /> AC Solved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {problem.category} · Solved by <span className="font-code text-[var(--color-text-main)]">{problem.solvedByCount}/{detail.members.length}</span> students
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/app/workspace?problem=${encodeURIComponent(problem.id)}`} className={buttonVariants({ size: "sm" })}>
                    <Code2 size={14} aria-hidden="true" /> Solve
                  </Link>
                  {detail.isTeacher && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={busy}
                      onClick={() =>
                        setPendingConfirm({
                          title: `Remove "${problem.title}"?`,
                          description: "Students will no longer see this problem in the class assignment list. Existing submissions stay on their profiles.",
                          confirmLabel: "Remove problem",
                          body: { action: "removeProblem", problemId: problem.id },
                        })
                      }
                      aria-label={`Remove ${problem.title} from class`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Student Groups + Roster */}
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
        {/* Groups */}
        <section aria-labelledby="groups-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Users size={18} aria-hidden="true" className="text-[var(--color-primary-text)]" />
            <h2 id="groups-heading" className="text-xl font-semibold">Student groups</h2>
          </div>

          {detail.isTeacher && (
            <form onSubmit={handleCreateGroup} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextField
                  id="new-group-name"
                  label="Create a group"
                  placeholder="Group 1 · Team Alpha"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  error={groupError}
                  required
                />
              </div>
              <Button type="submit" disabled={busy || !groupName.trim()} className="h-10 px-4">
                <Plus size={14} aria-hidden="true" /> Add
              </Button>
            </form>
          )}

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
                return (
                  <div key={group.id} className="skeuo-well space-y-2.5 rounded-xl border p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-[var(--color-text-main)]">{group.name}</h3>
                        <p className="font-code text-xs text-[var(--color-text-muted)]">
                          {groupMembers.length} {groupMembers.length === 1 ? "student" : "students"} · {group.solvedCount}/{group.totalPossibleSolves} solves
                        </p>
                      </div>
                      {detail.isTeacher && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={busy}
                          onClick={() =>
                            setPendingConfirm({
                              title: `Delete group "${group.name}"?`,
                              description: "Members in this group will become unassigned, but they will remain enrolled in the class.",
                              confirmLabel: "Delete group",
                              body: { action: "deleteGroup", groupId: group.id },
                            })
                          }
                          aria-label={`Delete group ${group.name}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </Button>
                      )}
                    </div>

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
            <h2 id="roster-heading" className="text-xl font-semibold">Students ({detail.members.length})</h2>
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
                            disabled={busy}
                            onChange={(next) =>
                              void act({
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
                          size="icon"
                          className="size-8"
                          disabled={busy}
                          onClick={() =>
                            setPendingConfirm({
                              title: `Remove ${member.name} from this class?`,
                              description: "They will be removed from the class roster and group, but can rejoin later with the invite code.",
                              confirmLabel: "Remove student",
                              body: { action: "removeMember", userId: member.userId },
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

      <ConfirmDialog
        open={confirmDeleteClass}
        onOpenChange={setConfirmDeleteClass}
        title="Delete this class?"
        description="All groups, enrollments, and class problem assignments will be permanently removed. Student submissions stay on their profiles."
        confirmLabel="Delete class"
        destructive
        onConfirm={async () => {
          setConfirmDeleteClass(false);
          const res = await act({ action: "deleteClass" }, false);
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
          const res = await act({ action: "leaveClass" }, false);
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
          if (action) await act(action.body);
        }}
      />
    </div>
  );
}
