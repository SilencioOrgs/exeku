"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Copy, Check, GraduationCap, KeyRound, Plus, Users } from "lucide-react";
import { BrandLoader } from "@/components/brand-loader";
import { Button, buttonVariants } from "@/components/ui/button";
import { createTeacherClass, fetchClasses, joinClassWithCode } from "@/lib/classes/api";
import type { FieldErrors } from "@/types/account";
import type { ClassListPayload, ClassSummary } from "@/types/classes";
import { TextAreaField, TextField } from "@/components/app/school/field";

function ClassCard({ cls }: { cls: ClassSummary }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!cls.inviteCode) return;
    try {
      await navigator.clipboard.writeText(cls.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable in restricted contexts.
    }
  };

  return (
    <article className="skeuo-panel flex flex-col justify-between gap-4 p-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-[var(--color-text-main)]">{cls.name}</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              {cls.section ? `${cls.section} · ` : ""}
              Teacher: {cls.teacherName}
            </p>
          </div>
          {cls.myGroupName && (
            <span className="skeuo-well rounded-lg border px-2.5 py-1 font-code text-xs text-[var(--color-primary-text)]">
              {cls.myGroupName}
            </span>
          )}
        </div>
        {cls.description && (
          <p className="line-clamp-2 text-sm text-[var(--color-text-muted)]">{cls.description}</p>
        )}
      </div>

      <div className="space-y-3">
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          {cls.inviteCode ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void copyCode()} className="font-code text-xs">
              {copied ? <Check size={13} aria-hidden="true" className="text-[var(--color-mint)]" /> : <Copy size={13} aria-hidden="true" />}
              {copied ? "Copied code" : cls.inviteCode}
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
  const [data, setData] = useState<ClassListPayload | null>(null);
  const [error, setError] = useState<string>();

  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string>();
  const [joining, setJoining] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");
  const [createErrors, setCreateErrors] = useState<FieldErrors>({});
  const [createError, setCreateError] = useState<string>();
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchClasses();
    if (res.ok) {
      setData(res.data);
      setError(undefined);
    } else {
      setError(res.error ?? "Could not load classes.");
    }
  }, []);

  useEffect(() => {
    let live = true;
    void fetchClasses().then((res) => {
      if (!live) return;
      if (res.ok) setData(res.data);
      else setError(res.error ?? "Could not load classes.");
    });
    return () => {
      live = false;
    };
  }, []);

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    setJoining(true);
    setJoinError(undefined);
    const res = await joinClassWithCode(inviteCode);
    setJoining(false);
    if (!res.ok) {
      setJoinError(res.fieldErrors?.inviteCode ?? res.error ?? "Could not join class.");
      return;
    }
    setInviteCode("");
    router.push(`/app/classes/${res.data.classId}`);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setCreateErrors({});
    setCreateError(undefined);
    const res = await createTeacherClass({ name, section, description });
    setCreating(false);
    if (!res.ok) {
      setCreateErrors(res.fieldErrors ?? {});
      setCreateError(res.error);
      return;
    }
    setName("");
    setSection("");
    setDescription("");
    setShowCreate(false);
    await load();
    router.push(`/app/classes/${res.data.id}`);
  };

  if (!data) {
    return error ? (
      <p role="alert" className="p-8 text-sm text-[var(--color-pink)]">{error}</p>
    ) : (
      <BrandLoader label="Loading classes…" />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">Classes</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Join a class with an invite code to solve assigned problems with your group.
          </p>
        </div>

        {data.canCreateClass ? (
          <Button type="button" onClick={() => setShowCreate((v) => !v)}>
            <Plus size={16} aria-hidden="true" />
            {showCreate ? "Close form" : "Create class"}
          </Button>
        ) : (
          <Link href="/app/profile" className={buttonVariants({ variant: "outline" })}>
            <GraduationCap size={16} aria-hidden="true" />
            Faculty verification on Profile
          </Link>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Join by Invite Code */}
        <section aria-labelledby="join-class-heading" className="skeuo-panel space-y-4 p-5">
          <div className="flex items-center gap-2.5">
            <span className="skeuo-key grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-elevated)] text-[var(--color-primary-text)]">
              <KeyRound size={16} aria-hidden="true" />
            </span>
            <div>
              <h2 id="join-class-heading" className="font-semibold">Join with an invite code</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Ask your teacher for their class code (like EXK-7Q4M2K).</p>
            </div>
          </div>

          <form onSubmit={handleJoin} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <TextField
                id="class-invite-code"
                label="Invite code"
                placeholder="EXK-7Q4M2K"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                error={joinError}
                className="font-code uppercase"
                autoComplete="off"
                required
              />
            </div>
            <Button type="submit" disabled={joining || !inviteCode.trim()} className="h-10 px-5">
              {joining ? "Joining…" : "Join class"}
            </Button>
          </form>
        </section>

        {/* Teacher Create Class or Faculty Info */}
        {data.canCreateClass ? (
          <section aria-labelledby="create-class-heading" className="skeuo-panel space-y-4 p-5">
            <div className="flex items-center gap-2.5">
              <span className="skeuo-key grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-elevated)] text-[var(--color-primary-text)]">
                <GraduationCap size={16} aria-hidden="true" />
              </span>
              <div>
                <h2 id="create-class-heading" className="font-semibold">Teacher workspace</h2>
                <p className="text-xs text-[var(--color-text-muted)]">Create classes, invite students, form groups, and assign problems.</p>
              </div>
            </div>

            {showCreate ? (
              <form onSubmit={handleCreate} className="space-y-3">
                {createError && (
                  <p role="alert" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-pink)]">{createError}</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    id="new-class-name"
                    label="Class name"
                    placeholder="Data Structures & Algorithms"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={createErrors.name}
                    required
                  />
                  <TextField
                    id="new-class-section"
                    label="Section (optional)"
                    placeholder="BSCPE 2A"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    error={createErrors.section}
                  />
                </div>
                <TextAreaField
                  id="new-class-desc"
                  label="Description (optional)"
                  placeholder="Weekly lab exercises and group problem sets."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  error={createErrors.description}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create class"}</Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <div className="skeuo-recess flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm">
                <span className="text-[var(--color-text-muted)]">
                  Teaching <strong className="font-code text-[var(--color-text-main)]">{data.teaching.length}</strong>{" "}
                  {data.teaching.length === 1 ? "class" : "classes"}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(true)}>
                  <Plus size={14} aria-hidden="true" /> New class
                </Button>
              </div>
            )}
          </section>
        ) : (
          <section className="skeuo-panel flex flex-col justify-between gap-3 p-5">
            <div className="flex items-center gap-2.5">
              <span className="skeuo-key grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-elevated)] text-[var(--color-primary-text)]">
                <Users size={16} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold">Are you teaching a class?</h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Submit faculty verification on your Profile page. Once approved by an admin, you can create classes and groups here.
                </p>
              </div>
            </div>
            <div>
              <Link href="/app/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Go to Profile verification <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}
      </div>

      {data.teaching.length > 0 && (
        <section aria-labelledby="teaching-heading" className="space-y-4">
          <h2 id="teaching-heading" className="text-xl font-semibold">Classes you teach</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.teaching.map((cls) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="enrolled-heading" className="space-y-4">
        <h2 id="enrolled-heading" className="text-xl font-semibold">Enrolled classes</h2>
        {data.enrolled.length === 0 ? (
          <div className="skeuo-panel flex flex-col items-start gap-2 p-6 text-sm text-[var(--color-text-muted)]">
            <BookOpen size={20} aria-hidden="true" className="text-[var(--color-primary-text)]" />
            <p>You haven&apos;t joined any classes yet. Enter an invite code from your teacher above to get started.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.enrolled.map((cls) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
