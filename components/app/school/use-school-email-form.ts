"use client";

import { useCallback, useState } from "react";
import { submitSchoolAccount } from "@/lib/accounts/api";
import type { FieldErrors, NewSchoolRequest, StudentAccount } from "@/types/account";
import type { SchoolForm } from "./school-email-form";

const formFrom = (saved?: StudentAccount): SchoolForm => ({
  email: saved?.email ?? "",
  age: saved ? String(saved.age) : "",
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
  const [form, setForm] = useState(() => formFrom(saved));
  const [newSchool, setNewSchool] = useState(() => newSchoolFrom(saved));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const updateForm = useCallback((patch: Partial<SchoolForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      // Error keys drop the Id suffix: schoolId edits clear errors.school.
      for (const key of Object.keys(patch)) delete next[key.replace(/Id$/, "")];
      return next;
    });
  }, []);

  const reset = () => {
    setForm(formFrom(saved));
    setNewSchool(newSchoolFrom(saved));
    setErrors({});
    setFormError(undefined);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(undefined);
    setBusy(true);
    const result = await submitSchoolAccount({
      email: form.email,
      age: form.age,
      school: newSchool ? { kind: "new", ...newSchool } : { kind: "listed", schoolId: form.schoolId, campusId: form.campusId, programId: form.programId },
    });
    if (!result.ok) {
      setBusy(false);
      setFormError(result.error);
      setErrors(result.fieldErrors ?? {});
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#school-form [aria-invalid="true"]')?.focus());
      return;
    }
    try {
      await onSave(result.data.account);
    } catch {
      setFormError("We couldn't save your school email. Try again.");
    }
    setBusy(false);
  };

  return { form, newSchool, errors, formError, busy, updateForm, setNewSchool, reset, submit };
}
