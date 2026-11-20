"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BadgeCheck, Clock3, GraduationCap, ShieldAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { fetchFacultyStatus, submitFacultyVerification } from "@/lib/roles/api";
import type { FieldErrors } from "@/types/account";
import type { LocalProfile } from "@/types/profile";
import type { FacultyStatusPayload } from "@/types/roles";
import { TextAreaField, TextField } from "./field";

export function FacultyVerificationSection({ profile }: { profile: LocalProfile }) {
  const [status, setStatus] = useState<FacultyStatusPayload | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [openForm, setOpenForm] = useState(false);

  const [schoolName, setSchoolName] = useState(profile.account?.school.name ?? "");
  const [department, setDepartment] = useState(profile.account?.school.program ?? "");
  const [positionTitle, setPositionTitle] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchFacultyStatus().then((res) => {
      if (!live) return;
      if (res.ok) setStatus(res.data);
      else setLoadError(res.error);
    });
    return () => {
      live = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFieldErrors({});
    setSubmitError(undefined);
    const res = await submitFacultyVerification({
      schoolName,
      department,
      positionTitle,
      employeeId,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setFieldErrors(res.fieldErrors ?? {});
      setSubmitError(res.error);
      return;
    }
    setStatus((prev) => ({ role: prev?.role ?? "student", request: res.data.request }));
    setOpenForm(false);
  };

  if (loadError) {
    return null;
  }

  const role = status?.role ?? "student";
  const req = status?.request ?? null;

  return (
    <section aria-labelledby="faculty-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="faculty-heading" className="text-lg font-semibold">
            Are you a faculty member of the school?
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
            Verified teachers can create classes with invite codes, group students, assign problems, and track class progress.
          </p>
        </div>

        {role === "teacher" || role === "admin" ? (
          <Link href="/app/classes" className={buttonVariants({ size: "sm" })}>
            <GraduationCap size={15} aria-hidden="true" />
            Manage classes
          </Link>
        ) : req?.status !== "pending" && !openForm ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setOpenForm(true)}>
            <GraduationCap size={15} aria-hidden="true" />
            {req?.status === "rejected" ? "Submit new verification" : "Verify as faculty"}
          </Button>
        ) : null}
      </div>

      {role === "teacher" || role === "admin" ? (
        <div className="skeuo-recess flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm">
          <BadgeCheck size={18} aria-hidden="true" className="shrink-0 text-[var(--color-mint)]" />
          <div className="min-w-0">
            <p className="font-medium text-[var(--color-text-main)]">
              Role · {role === "admin" ? "Admin & Teacher" : "Verified Teacher"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              You can create classes, generate student invite codes, organize groups, and assign problems in Classes.
            </p>
          </div>
        </div>
      ) : req?.status === "pending" ? (
        <div className="skeuo-recess space-y-2 rounded-xl p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-[var(--color-primary-text)]">
            <Clock3 size={16} aria-hidden="true" />
            <span>Pending admin approval</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Submitted for <strong className="text-[var(--color-text-main)]">{req.schoolName}</strong> · {req.department} · {req.positionTitle} (ID: <span className="font-code">{req.employeeId}</span>). An administrator will review and upgrade your account.
          </p>
        </div>
      ) : (
        <>
          {req?.status === "rejected" && (
            <div role="status" className="skeuo-recess flex items-start gap-2.5 rounded-xl p-3.5 text-sm">
              <ShieldAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--color-pink)]" />
              <div className="min-w-0">
                <p className="font-medium text-[var(--color-pink)]">Previous faculty verification was not approved</p>
                {req.reviewNote && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{req.reviewNote}</p>}
              </div>
            </div>
          )}

          {openForm && (
            <form onSubmit={handleSubmit} className="space-y-4 border-t border-[var(--color-border)] pt-4">
              {submitError && (
                <p role="alert" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-pink)]">
                  {submitError}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  id="faculty-school"
                  label="School name"
                  placeholder="Laguna State Polytechnic University"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  error={fieldErrors.schoolName}
                  required
                />
                <TextField
                  id="faculty-dept"
                  label="College or department"
                  placeholder="College of Computer Studies"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  error={fieldErrors.department}
                  required
                />
                <TextField
                  id="faculty-title"
                  label="Position or title"
                  placeholder="Instructor I"
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  error={fieldErrors.positionTitle}
                  required
                />
                <TextField
                  id="faculty-id"
                  label="Faculty / employee ID"
                  placeholder="FAC-2026-014"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  error={fieldErrors.employeeId}
                  required
                />
              </div>
              <TextAreaField
                id="faculty-note"
                label="Additional details (optional)"
                placeholder="Subjects or sections you teach"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                error={fieldErrors.note}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Sending…" : "Send to admin for approval"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpenForm(false)} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
