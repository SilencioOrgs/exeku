"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  Copy,
  GraduationCap,
  KeyRound,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import { ClassesGridSkeleton } from "@/components/app/page-skeletons";
import { TextAreaField, TextField } from "@/components/app/school/field";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { peekApiCache } from "@/lib/accounts/api";
import { createTeacherClass, fetchClasses, joinClassWithCode } from "@/lib/classes/api";
import { subscribeClientCache } from "@/lib/client/swr-cache";
import type { FieldErrors } from "@/types/account";
import type { ClassListPayload, ClassSummary } from "@/types/classes";

function formatShortDue(dueAt: string): { label: string; urgent: boolean } {
  const ms = Date.parse(dueAt);
  if (Number.isNaN(ms)) return { label: "Deadline", urgent: false };
  const diff = ms - Date.now();
  if (diff < 0) return { label: "Past due", urgent: true };
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return { label: `Due in ${Math.max(1, hours)}h`, urgent: true };
  const days = Math.round(hours / 24);
  if (days <= 3) return { label: `Due in ${days}d`, urgent: true };
  return {
    label: `Due ${new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    urgent: false,
  };
}

function ClassCard({ cls }: { cls: ClassSummary }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!cls.inviteCode) return;
    try {
      await navigator.clipboard.writeText(cls.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable.
    }
  };

  const solved = cls.solvedCount ?? 0;
  const pct = cls.problemCount > 0 ? Math.min(100, Math.round((solved / cls.problemCount) * 100)) : 0;
  const due = cls.nextDueAt ? formatShortDue(cls.nextDueAt) : null;

  return (
    <article className="skeuo-panel flex flex-col justify-between gap-4 p-5 transition-colors hover:border-[var(--color-primary-edge)]">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-[var(--color-text-main)]">{cls.name}</h3>
              {cls.section && (
                <span className="skeuo-well rounded-md border px-2 py-0.5 font-code text-xs text-[var(--color-primary-text)]">
                  {cls.section}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Teacher: <strong className="font-medium text-[var(--color-text-main)]">{cls.teacherName}</strong>
            </p>
          </div>
          {cls.isTeacher ? (
            <span className="rounded-md bg-[var(--color-easy-bg)] px-2 py-0.5 font-code text-xs text-[var(--color-mint)]">
              Teaching
            </span>
          ) : cls.myGroupName ? (
            <span className="skeuo-well rounded-md border px-2 py-0.5 font-code text-xs text-[var(--color-primary-text)]">
              {cls.myGroupName}
            </span>
          ) : null}
        </div>

        {cls.description && (
          <p className="line-clamp-2 text-sm text-[var(--color-text-muted)]">{cls.description}</p>
        )}

        {due && (
          <div
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-code text-xs ${
              due.urgent
                ? "bg-[var(--color-hard-bg)] text-[var(--color-pink)]"
                : "bg-[var(--color-surface)] text-[var(--color-primary-text)]"
            }`}
          >
            <CalendarClock size={12} aria-hidden="true" />
            {due.label}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {!cls.isTeacher && cls.problemCount > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-muted)]">Your progress</span>
              <span className="font-code text-[var(--color-text-main)]">
                {solved}/{cls.problemCount} solved ({pct}%)
              </span>
            </div>
            <div className="skeuo-well h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
                style={{ width: `${Math.max(solved > 0 ? 6 : 0, pct)}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="skeuo-well rounded-lg border px-2.5 py-2">
            <p className="text-xs text-[var(--color-text-muted)]">Students</p>
            <p className="font-code text-base font-semibold">{cls.memberCount}</p>
          </div>
          <div className="skeuo-well rounded-lg border px-2.5 py-2">
            <p className="text-xs text-[var(--color-text-muted)]">Groups</p>
            <p className="font-code text-base font-semibold">{cls.groupCount}</p>
          </div>
          <div className="skeuo-well rounded-lg border px-2.5 py-2">
            <p className="text-xs text-[var(--color-text-muted)]">Problems</p>
            <p className="font-code text-base font-semibold">{cls.problemCount}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
          {cls.inviteCode ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void copyCode()} className="font-code text-xs">
              {copied ? <Check size={13} aria-hidden="true" className="text-[var(--color-mint)]" /> : <Copy size={13} aria-hidden="true" />}
              {copied ? "Copied" : cls.inviteCode}
            </Button>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">Enrolled class</span>
          )}
          <Link href={`/app/classes/${cls.id}`} className={buttonVariants({ size: "sm" })}>
            Open class <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ClassesView() {
  const router = useRouter();
  const [data, setData] = useState<ClassListPayload | null>(() => peekApiCache<ClassListPayload>("/api/classes") ?? null);
  const [error, setError] = useState<string>();

  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string>();
  const [joining, setJoining] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");
  const [createErrors, setCreateErrors] = useState<FieldErrors>({});
  const [createError, setCreateError] = useState<string>();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () => void fetchClasses().then((res) => {
      if (!live) return;
      if (res.ok) {
        setData(res.data);
        setError(undefined);
      } else {
        setError(res.error ?? "Could not load classes.");
      }
    });
    load();
    const unsubscribe = subscribeClientCache((prefixes) => {
      if (prefixes.some((p) => p === "*" || p.startsWith("/api/classes"))) load();
    });
    return () => {
      live = false;
      unsubscribe();
    };
  }, []);

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    if (joining) return;
    setJoining(true);
    setJoinError(undefined);
    try {
      const res = await joinClassWithCode(inviteCode);
      if (!res.ok) {
        setJoinError(res.fieldErrors?.inviteCode ?? res.error ?? "Could not join class.");
        return;
      }
      setInviteCode("");
      setJoinOpen(false);
      router.push(`/app/classes/${res.data.classId}`);
    } finally {
      setJoining(false);
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setCreateErrors({});
    setCreateError(undefined);
    try {
      const res = await createTeacherClass({ name, section, description });
      if (!res.ok) {
        setCreateErrors(res.fieldErrors ?? {});
        setCreateError(res.error);
        return;
      }
      setName("");
      setSection("");
      setDescription("");
      setCreateOpen(false);
      router.push(`/app/classes/${res.data.id}`);
    } finally {
      setCreating(false);
    }
  };

  if (!data) {
    return error ? (
      <p role="alert" className="p-8 text-sm text-[var(--color-pink)]">{error}</p>
    ) : (
      <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
        <header className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">Classes</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Join a class with an invite code to solve assigned problems and track deadlines.
          </p>
        </header>
        <ClassesGridSkeleton />
      </div>
    );
  }

  const allClasses = [...data.teaching, ...data.enrolled];
  const totalProblems = allClasses.reduce((sum, c) => sum + c.problemCount, 0);
  const upcomingDeadlines = allClasses.filter((c) => c.nextDueAt).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Classes</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {data.canCreateClass
              ? "Manage your coding classrooms, create custom problems, post activities, and track student progress."
              : "Join a class with your teacher's invite code to solve assigned problems and follow deadlines."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={data.canCreateClass ? "outline" : "default"} onClick={() => setJoinOpen(true)}>
            <KeyRound size={15} aria-hidden="true" /> Join with code
          </Button>
          {data.canCreateClass ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus size={15} aria-hidden="true" /> Create class
            </Button>
          ) : (
            <Link href="/app/profile" className={buttonVariants({ variant: "outline" })}>
              <GraduationCap size={15} aria-hidden="true" /> Teacher verification
            </Link>
          )}
        </div>
      </header>

      {/* Summary Strip */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.canCreateClass && (
          <div className="skeuo-panel p-4">
            <dt className="text-xs text-[var(--color-text-muted)]">Teaching</dt>
            <dd className="font-code mt-1 text-2xl font-semibold text-[var(--color-mint)]">{data.teaching.length}</dd>
          </div>
        )}
        <div className="skeuo-panel p-4">
          <dt className="text-xs text-[var(--color-text-muted)]">Enrolled classes</dt>
          <dd className="font-code mt-1 text-2xl font-semibold">{data.enrolled.length}</dd>
        </div>
        <div className="skeuo-panel p-4">
          <dt className="text-xs text-[var(--color-text-muted)]">Assigned problems</dt>
          <dd className="font-code mt-1 text-2xl font-semibold">{totalProblems}</dd>
        </div>
        <div className="skeuo-panel p-4">
          <dt className="text-xs text-[var(--color-text-muted)]">Active deadlines</dt>
          <dd className="font-code mt-1 text-2xl font-semibold text-[var(--color-primary-text)]">{upcomingDeadlines}</dd>
        </div>
        {!data.canCreateClass && (
          <div className="skeuo-panel p-4">
            <dt className="text-xs text-[var(--color-text-muted)]">Role</dt>
            <dd className="mt-1 text-lg font-semibold capitalize">{data.role}</dd>
          </div>
        )}
      </dl>

      {data.teaching.length > 0 && (
        <section aria-labelledby="teaching-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="teaching-heading" className="text-xl font-semibold">Classes you teach</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} aria-hidden="true" /> New class
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.teaching.map((cls) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="enrolled-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="enrolled-heading" className="text-xl font-semibold">Enrolled classes</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setJoinOpen(true)}>
            <KeyRound size={14} aria-hidden="true" /> Enter code
          </Button>
        </div>
        {data.enrolled.length === 0 ? (
          <div className="skeuo-panel flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-start gap-3">
              <span className="skeuo-well grid size-10 shrink-0 place-items-center rounded-xl border text-[var(--color-primary-text)]">
                <BookOpen size={18} aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--color-text-main)]">No enrolled classes yet</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Ask your teacher for a class invite code (like EXK-7Q4M2K) to unlock assignments and deadline alerts.
                </p>
              </div>
            </div>
            <Button type="button" size="sm" onClick={() => setJoinOpen(true)}>
              <KeyRound size={14} aria-hidden="true" /> Join class
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.enrolled.map((cls) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </section>

      {!data.canCreateClass && (
        <section className="skeuo-panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="skeuo-key grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-elevated)] text-[var(--color-primary-text)]">
              <Users size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Teaching a programming course?</h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Complete Gmail faculty verification on Profile to create classes, custom problems, and student groups.
              </p>
            </div>
          </div>
          <Link href="/app/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Go to Profile <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
      )}

      {/* Join Class Modal */}
      <Dialog
        open={joinOpen}
        onOpenChange={(open) => {
          if (!joining) {
            setJoinOpen(open);
            setJoinError(undefined);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleJoin} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound size={17} className="text-[var(--color-primary-text)]" aria-hidden="true" />
                Join a class
              </DialogTitle>
              <DialogDescription>
                Enter the invite code shared by your teacher to join their classroom and receive problem &amp; deadline notifications.
              </DialogDescription>
            </DialogHeader>
            <TextField
              id="modal-class-invite-code"
              label="Invite code"
              placeholder="EXK-7Q4M2K"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              error={joinError}
              className="font-code uppercase"
              autoComplete="off"
              disabled={joining}
              required
            />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={joining} onClick={() => setJoinOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={joining || !inviteCode.trim()}>
                {joining ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    Joining class…
                  </>
                ) : (
                  "Join class"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Class Modal */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!creating) {
            setCreateOpen(open);
            setCreateError(undefined);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap size={18} className="text-[var(--color-primary-text)]" aria-hidden="true" />
                Create a new class
              </DialogTitle>
              <DialogDescription>
                Generates a shareable EXK invite code so students can join, get grouped, and solve your problems.
              </DialogDescription>
            </DialogHeader>
            {createError && (
              <p role="alert" className="skeuo-recess rounded-xl p-3 text-xs text-[var(--color-pink)]">
                {createError}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                id="modal-class-name"
                label="Class name"
                placeholder="Data Structures & Algorithms"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={createErrors.name}
                disabled={creating}
                required
              />
              <TextField
                id="modal-class-section"
                label="Section (optional)"
                placeholder="BSCPE 2A"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                error={createErrors.section}
                disabled={creating}
              />
            </div>
            <TextAreaField
              id="modal-class-desc"
              label="Description (optional)"
              placeholder="Weekly lab exercises and group problem sets."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={createErrors.description}
              disabled={creating}
            />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={creating} onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    Creating class…
                  </>
                ) : (
                  <>
                    <Plus size={14} aria-hidden="true" />
                    Create class
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
