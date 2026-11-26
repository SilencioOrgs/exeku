"use client";

import { useCallback, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { submitSchoolAccount } from "@/lib/accounts/api";
import {
  clerkErrorMessage,
  prepareClerkEmailOtp,
  resendClerkEmailOtp,
  verifyClerkEmailOtp,
  type ClerkEmailUser,
} from "@/lib/auth/clerk-email";
import type { FieldErrors, NewSchoolRequest, StudentAccount } from "@/types/account";
import type { SchoolForm } from "./school-email-form";

const formFrom = (saved?: StudentAccount): SchoolForm => ({
  email: saved?.email ?? "",
  birthday: saved?.birthday ?? "",
  locationId: "",
  schoolId: saved?.school.id ?? "",
  schoolLabel: saved?.school.id ? saved.school.shortName : "",
  campusId: saved?.school.campusId ?? "",
  campusLabel: saved?.school.id ? saved.school.campus ?? "" : "",
  programId: saved?.school.programId ?? "",
});

const newSchoolFrom = (saved?: StudentAccount): NewSchoolRequest | null =>
  saved?.school.status === "pending_review"
    ? { name: saved.school.name, location: saved.school.location, campus: saved.school.campus, emailDomain: saved.email.split("@")[1] }
    : null;

export function useSchoolEmailForm(saved: StudentAccount | undefined, onSave: (account: StudentAccount) => Promise<void>) {
  const { user, isLoaded } = useUser();
  const [form, setForm] = useState(() => formFrom(saved));
  const [newSchool, setNewSchool] = useState(() => newSchoolFrom(saved));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [pendingEmailId, setPendingEmailId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpNotice, setOtpNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  const updateForm = useCallback((patch: Partial<SchoolForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      // Error keys drop the Id suffix: schoolId edits clear errors.school.
      for (const key of Object.keys(patch)) {
        delete next[key.replace(/Id$/, "")];
        if (key === "birthday") delete next.age;
      }
      return next;
    });
  }, []);

  const reset = () => {
    setForm(formFrom(saved));
    setNewSchool(newSchoolFrom(saved));
    setErrors({});
    setFormError(undefined);
    setStep("details");
    setPendingEmailId(null);
    setOtpCode("");
    setOtpNotice(undefined);
  };

  const backToDetails = () => {
    setStep("details");
    setFormError(undefined);
    setOtpNotice(undefined);
    setOtpCode("");
  };

  const requestPayload = () => ({
    email: form.email,
    birthday: form.birthday,
    school: newSchool
      ? { kind: "new" as const, ...newSchool }
      : { kind: "listed" as const, schoolId: form.schoolId, campusId: form.campusId, programId: form.programId },
  });

  const persistAccount = async (account: StudentAccount) => {
    try {
      await onSave(account);
      setStep("details");
      setPendingEmailId(null);
      setOtpCode("");
      setOtpNotice(undefined);
    } catch {
      setFormError("We couldn't save your school email. Try again.");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(undefined);
    setOtpNotice(undefined);
    setBusy(true);

    const result = await submitSchoolAccount(requestPayload());
    if (result.ok) {
      await persistAccount(result.data.account);
      setBusy(false);
      return;
    }

    if (result.code === "VERIFICATION_REQUIRED") {
      if (!isLoaded || !user) {
        setBusy(false);
        setFormError("Wait for your session to finish loading, then try again.");
        return;
      }
      const normalized = form.email.trim().toLowerCase();
      try {
        const prepared = await prepareClerkEmailOtp(user as unknown as ClerkEmailUser, normalized);
        if (prepared.status === "already_verified") {
          const retry = await submitSchoolAccount(requestPayload());
          if (retry.ok) {
            await persistAccount(retry.data.account);
          } else {
            setFormError(retry.error);
            setErrors(retry.fieldErrors ?? {});
          }
        } else {
          setPendingEmailId(prepared.emailId);
          setStep("otp");
          setOtpCode("");
          setOtpNotice(`Verification code sent to ${normalized}. Check your school inbox.`);
        }
      } catch (err) {
        setFormError(
          clerkErrorMessage(
            err,
            "We couldn't send a verification code to that email. Make sure it's valid and not linked to another account.",
          ),
        );
      }
      setBusy(false);
      return;
    }

    setBusy(false);
    setFormError(result.error);
    setErrors(result.fieldErrors ?? {});
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#school-form [aria-invalid="true"]')?.focus());
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(undefined);
    setOtpNotice(undefined);

    if (!user) {
      setFormError("Sign in again to complete verification.");
      return;
    }

    const normalized = form.email.trim().toLowerCase();
    setBusy(true);
    try {
      const verified = await verifyClerkEmailOtp(user as unknown as ClerkEmailUser, pendingEmailId, normalized, otpCode);
      if (!verified.ok) {
        setFormError(verified.error);
        if (verified.expired) setStep("details");
        setBusy(false);
        return;
      }
      const result = await submitSchoolAccount(requestPayload());
      if (!result.ok) {
        const nextErrors = result.fieldErrors ?? {};
        setErrors(nextErrors);
        setFormError(result.error);
        if (Object.keys(nextErrors).length > 0) setStep("details");
        setBusy(false);
        return;
      }
      await persistAccount(result.data.account);
    } catch (err) {
      setFormError(clerkErrorMessage(err, "Invalid or expired verification code. Try again or resend."));
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (!user) return;
    setBusy(true);
    setFormError(undefined);
    setOtpNotice(undefined);
    const normalized = form.email.trim().toLowerCase();
    try {
      const res = await resendClerkEmailOtp(user as unknown as ClerkEmailUser, pendingEmailId, normalized);
      if (!res.ok) {
        setStep("details");
        setFormError("Verification session expired. Request a new code.");
      } else if (res.alreadyVerified) {
        const result = await submitSchoolAccount(requestPayload());
        if (result.ok) await persistAccount(result.data.account);
        else setFormError(result.error);
      } else {
        setOtpNotice(`A fresh verification code was sent to ${normalized}.`);
      }
    } catch (err) {
      setFormError(clerkErrorMessage(err, "Could not resend verification code. Wait a moment and try again."));
    } finally {
      setBusy(false);
    }
  };

  return {
    form,
    newSchool,
    errors,
    formError,
    step,
    otpCode,
    otpNotice,
    busy,
    updateForm,
    setNewSchool,
    setOtpCode,
    reset,
    backToDetails,
    submit,
    verifyOtp,
    resendOtp,
  };
}
