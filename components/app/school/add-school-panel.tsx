"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { requestNewSchool } from "@/lib/accounts/api";
import type { FieldErrors, NewSchoolRequest } from "@/types/account";
import { TextField } from "./field";

export function AddSchoolPanel({ onAdded, onCancel }: { onAdded: (school: NewSchoolRequest) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<NewSchoolRequest>({ name: "", location: "", campus: "", emailDomain: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    const result = await requestNewSchool(draft);
    setBusy(false);
    if (result.ok) return onAdded(result.data.school);
    setErrors(result.fieldErrors ?? {});
    setFormError(result.error);
  };

  // This panel sits inside the sign-up form, so Enter here must not submit the whole form.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void add();
  };

  const field = (key: keyof NewSchoolRequest) => ({
    value: draft[key] ?? "",
    error: errors[key],
    onChange: (event: { target: { value: string } }) => setDraft((d) => ({ ...d, [key]: event.target.value })),
  });

  return (
    <fieldset className="skeuo-recess space-y-3 rounded-xl p-4" onKeyDown={onKeyDown}>
      <legend className="float-left mb-3 w-full text-sm font-medium text-[var(--color-text-main)]">Add your school</legend>
      <TextField id="new-school-name" label="School name" autoFocus {...field("name")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="new-school-location" label="City or province" {...field("location")} />
        <TextField id="new-school-campus" label="Campus (optional)" {...field("campus")} />
      </div>
      <TextField id="new-school-domain" label="School email domain" placeholder="school.edu.ph" autoCapitalize="none" spellCheck={false} {...field("emailDomain")} />
      {formError && <p role="alert" className="text-xs text-[var(--color-pink)]">{formError}</p>}
      <p className="text-xs text-[var(--color-text-muted)]">We review new schools before listing them. You can keep signing up in the meantime.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="button" variant="outline" onClick={add} loading={busy} loadingText="Checking…">Add school</Button>
      </div>
    </fieldset>
  );
}
