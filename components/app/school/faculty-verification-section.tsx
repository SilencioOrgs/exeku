"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Clock3, GraduationCap, MailCheck, RefreshCw, ShieldAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { fetchFacultyStatus } from "@/lib/roles/api";
import type { LocalProfile } from "@/types/profile";
import type { FacultyStatusPayload } from "@/types/roles";
import { FacultyVerificationForm } from "./faculty-verification-form";

export function FacultyVerificationSection({
  profile,
  onStatusChange,
}: {
  profile: LocalProfile;
  onStatusChange?: (status: FacultyStatusPayload) => void;
}) {
  const [status, setStatus] = useState<FacultyStatusPayload | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [openForm, setOpenForm] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const reloadStatus = async () => {
    setLoadingStatus(true);
    setLoadError(undefined);
    const res = await fetchFacultyStatus();
    setLoadingStatus(false);
    if (res.ok) {
      setStatus(res.data);
      onStatusChange?.(res.data);
    } else {
      setLoadError(res.error ?? "Could not load faculty status.");
    }
  };

  useEffect(() => {
    let live = true;
    void fetchFacultyStatus().then((res) => {
      if (!live) return;
      setLoadingStatus(false);
      if (res.ok) {
        setStatus(res.data);
        onStatusChange?.(res.data);
      } else {
        setLoadError(res.error ?? "Could not load faculty status.");
      }
    });
    return () => {
      live = false;
    };
  }, [onStatusChange]);

  if (loadError) {
    return (
      <section aria-labelledby="faculty-heading" className="skeuo-panel flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <div className="space-y-1">
          <h2 id="faculty-heading" className="text-base font-semibold">Faculty verification</h2>
          <p role="alert" className="text-xs text-[var(--color-pink)]">{loadError}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void reloadStatus()}>
          <RefreshCw size={14} aria-hidden="true" /> Retry
        </Button>
      </section>
    );
  }

  if (loadingStatus && !status) {
    return (
      <section aria-labelledby="faculty-heading" className="skeuo-panel p-5 sm:p-6">
        <h2 id="faculty-heading" className="text-base font-semibold">Faculty verification</h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Checking your faculty status…</p>
      </section>
    );
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
            Verify your Gmail address with a Clerk OTP code to submit your faculty details for admin approval. Approved teachers can create classes, invite codes, and student groups.
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
          <div className="flex flex-wrap items-center gap-2 font-medium text-[var(--color-primary-text)]">
            <Clock3 size={16} aria-hidden="true" />
            <span>Pending admin approval</span>
            {req.emailVerified && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-easy-bg)] px-2 py-0.5 font-code text-xs text-[var(--color-mint)]">
                <MailCheck size={12} aria-hidden="true" /> Gmail verified
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Submitted as <strong className="text-[var(--color-text-main)]">{req.fullName || profile.displayName}</strong>
            {req.schoolEmail ? <> (<span className="font-code text-[var(--color-text-main)]">{req.schoolEmail}</span>)</> : null} ·{" "}
            {req.schoolName} · {req.department} · {req.positionTitle} (ID: <span className="font-code">{req.employeeId}</span>). An administrator will review and upgrade your account.
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
            <div className="border-t border-[var(--color-border)] pt-4">
              <FacultyVerificationForm
                defaultFullName={profile.displayName || ""}
                defaultSchoolName={profile.account?.school.name ?? ""}
                defaultDepartment={profile.account?.school.program ?? ""}
                onSubmitted={(request) => {
                  const next = { role: status?.role ?? ("student" as const), request };
                  setStatus(next);
                  onStatusChange?.(next);
                  setOpenForm(false);
                }}
                onCancel={() => setOpenForm(false)}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
