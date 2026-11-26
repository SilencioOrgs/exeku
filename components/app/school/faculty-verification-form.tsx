"use client";

import { useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { KeyRound, MailCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clerkErrorMessage,
  prepareClerkEmailOtp,
  resendClerkEmailOtp,
  verifyClerkEmailOtp,
  type ClerkEmailUser,
} from "@/lib/auth/clerk-email";
import { submitFacultyVerification } from "@/lib/roles/api";
import { checkFacultyRequest } from "@/lib/roles/rules";
import type { FieldErrors } from "@/types/account";
import type { FacultyRequestView } from "@/types/roles";
import { TextAreaField, TextField } from "./field";

export interface FacultyVerificationFormProps {
  defaultFullName: string;
  defaultSchoolName?: string;
  defaultDepartment?: string;
  cancelLabel?: string;
  onSubmitted: (request: FacultyRequestView) => void | Promise<void>;
  onCancel: () => void;
}

export function FacultyVerificationForm({
  defaultFullName,
  defaultSchoolName = "",
  defaultDepartment = "",
  cancelLabel = "Cancel",
  onSubmitted,
  onCancel,
}: FacultyVerificationFormProps) {
  const { user, isLoaded } = useUser();
  const clerkGmail =
    user?.primaryEmailAddress?.emailAddress?.toLowerCase().endsWith("@gmail.com")
      ? user.primaryEmailAddress.emailAddress
      : "";

  const [fullName, setFullName] = useState(defaultFullName);
  const [schoolEmail, setSchoolEmail] = useState(clerkGmail);
  const [schoolName, setSchoolName] = useState(defaultSchoolName);
  const [department, setDepartment] = useState(defaultDepartment);
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
    setStep("details");
    setOtpCode("");
    setPendingEmailId(null);
    setOtpNotice(undefined);
    await onSubmitted(res.data.request);
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

  if (step === "otp") {
    return (
      <form onSubmit={handleVerifyOtpAndSubmit} className="space-y-4">
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
          <Button type="submit" disabled={otpCode.length < 6} loading={busy} loadingText="Verifying & sending…">
            Verify OTP &amp; send to admin
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
    );
  }

  return (
    <form onSubmit={handleRequestOtp} className="space-y-4">
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
        <Button type="submit" loading={busy} loadingText="Sending code…">
          <KeyRound size={15} aria-hidden="true" />
          Send OTP verification code
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}
