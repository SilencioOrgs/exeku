"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { BadgeCheck, Clock3, GraduationCap, KeyRound, MailCheck, RefreshCw, ShieldAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  clerkErrorMessage,
  prepareClerkEmailOtp,
  resendClerkEmailOtp,
  verifyClerkEmailOtp,
  type ClerkEmailUser,
} from "@/lib/auth/clerk-email";
import { fetchFacultyStatus, submitFacultyVerification } from "@/lib/roles/api";
import { checkFacultyRequest } from "@/lib/roles/rules";
import type { FieldErrors } from "@/types/account";
import type { LocalProfile } from "@/types/profile";
import type { FacultyStatusPayload } from "@/types/roles";
import { TextAreaField, TextField } from "./field";

export function FacultyVerificationSection({
  profile,
  onStatusChange,
}: {
  profile: LocalProfile;
  onStatusChange?: (status: FacultyStatusPayload) => void;
}) {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<FacultyStatusPayload | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [openForm, setOpenForm] = useState(false);

  const clerkGmail =
    user?.primaryEmailAddress?.emailAddress?.toLowerCase().endsWith("@gmail.com")
      ? user.primaryEmailAddress.emailAddress
      : "";
  const [fullName, setFullName] = useState(profile.displayName || "");
  const [schoolEmail, setSchoolEmail] = useState(clerkGmail);
  const [schoolName, setSchoolName] = useState(profile.account?.school.name ?? "");
  const [department, setDepartment] = useState(profile.account?.school.program ?? "");
  const [positionTitle, setPositionTitle] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [note, setNote] = useState("");

  const [step, setStep] = useState<"details" | "otp">("details");
  const [pendingEmailId, setPendingEmailId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string>();
  const [otpNotice, setOtpNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

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

  const payload = () => ({
    fullName: fullName.trim(),
    schoolEmail: schoolEmail.trim().toLowerCase(),
    schoolName: schoolName.trim(),
    department: department.trim(),
    positionTitle: positionTitle.trim(),
    employeeId: employeeId.trim(),
    note: note.trim() || undefined,
  });

  const finalizeSubmission = async () => {
    const res = await submitFacultyVerification(payload());
    if (!res.ok) {
      const nextErrors = res.fieldErrors ?? {};
      setFieldErrors(nextErrors);
      setSubmitError(res.error ?? "Could not send verification to admin.");
      if (Object.keys(nextErrors).length > 0) setStep("details");
      return false;
    }
    setStatus((prev) => ({ role: prev?.role ?? "student", request: res.data.request }));
    setOpenForm(false);
    setStep("details");
    setOtpCode("");
    setPendingEmailId(null);
    setOtpNotice(undefined);
    return true;
  };

  const handleRequestOtp = async (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setSubmitError(undefined);
    setOtpNotice(undefined);

    const data = payload();
    const checked = checkFacultyRequest(data);
    if (!checked.ok) {
      setFieldErrors(checked.fieldErrors);
      return;
    }
    if (!isLoaded || !user) {
      setSubmitError("Wait for your session to finish loading, then try again.");
      return;
    }

    setBusy(true);
    try {
      const normalized = checked.request.schoolEmail;
      const prepared = await prepareClerkEmailOtp(user as unknown as ClerkEmailUser, normalized);
      if (prepared.status === "already_verified") {
        await finalizeSubmission();
        return;
      }
      setPendingEmailId(prepared.emailId);
      setStep("otp");
      setOtpCode("");
      setOtpNotice(`Verification code sent to ${normalized}. Check your Gmail inbox.`);
    } catch (err) {
      setSubmitError(
        clerkErrorMessage(
          err,
          "Clerk could not send a verification code to that Gmail address. Make sure it is valid and not linked to another account.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtpAndSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(undefined);
    setOtpNotice(undefined);

    if (!user) {
      setSubmitError("Sign in again to complete verification.");
      return;
    }

    const normalized = schoolEmail.trim().toLowerCase();
    setBusy(true);
    try {
      const verified = await verifyClerkEmailOtp(user as unknown as ClerkEmailUser, pendingEmailId, normalized, otpCode);
      if (!verified.ok) {
        setSubmitError(verified.error);
        if (verified.expired) setStep("details");
        return;
      }
      await finalizeSubmission();
    } catch (err) {
      setSubmitError(clerkErrorMessage(err, "Invalid or expired verification code. Try again or resend."));
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (!user) return;
    setBusy(true);
    setSubmitError(undefined);
    setOtpNotice(undefined);
    const normalized = schoolEmail.trim().toLowerCase();
    try {
      const res = await resendClerkEmailOtp(user as unknown as ClerkEmailUser, pendingEmailId, normalized);
      if (!res.ok) {
        setStep("details");
        setSubmitError("Verification session expired. Request a new code.");
      } else if (res.alreadyVerified) {
        await finalizeSubmission();
      } else {
        setOtpNotice(`A fresh verification code was sent to ${normalized}.`);
      }
    } catch (err) {
      setSubmitError(clerkErrorMessage(err, "Could not resend verification code. Wait a moment and try again."));
    } finally {
      setBusy(false);
    }
  };

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
          <Button type="button" variant="outline" size="sm" onClick={() => { setOpenForm(true); setStep("details"); }}>
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

          {openForm && step === "details" && (
            <form onSubmit={handleRequestOtp} className="space-y-4 border-t border-[var(--color-border)] pt-4">
              {submitError && (
                <p role="alert" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-pink)]">
                  {submitError}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  id="faculty-fullname"
                  label="Complete name"
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  error={fieldErrors.fullName}
                  autoComplete="name"
                  required
                />
                <TextField
                  id="faculty-email"
                  type="email"
                  label="Gmail address (Clerk sends OTP here)"
                  placeholder="yourname@gmail.com"
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  error={fieldErrors.schoolEmail}
                  autoComplete="email"
                  required
                />
                <TextField
                  id="faculty-school"
                  label="School name"
                  placeholder="Your university or college"
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
                  <KeyRound size={15} aria-hidden="true" />
                  {busy ? "Sending code…" : "Send OTP verification code"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpenForm(false)} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {openForm && step === "otp" && (
            <form onSubmit={handleVerifyOtpAndSubmit} className="space-y-4 border-t border-[var(--color-border)] pt-4">
              {otpNotice && (
                <p role="status" className="skeuo-recess flex items-center gap-2 rounded-xl p-3 text-sm text-[var(--color-primary-text)]">
                  <MailCheck size={16} aria-hidden="true" className="shrink-0" />
                  <span>{otpNotice}</span>
                </p>
              )}
              {submitError && (
                <p role="alert" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-pink)]">
                  {submitError}
                </p>
              )}

              <div className="max-w-xs">
                <TextField
                  id="faculty-otp"
                  label={`Enter 6-digit code sent to ${schoolEmail.trim().toLowerCase()}`}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="font-code tracking-[0.25em]"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy || otpCode.length < 6}>
                  {busy ? "Verifying & sending…" : "Verify OTP & send to admin"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleResendOtp()} disabled={busy}>
                  <RefreshCw size={14} aria-hidden="true" /> Resend code
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep("details"); setSubmitError(undefined); setOtpNotice(undefined); }}
                  disabled={busy}
                >
                  Edit details
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
