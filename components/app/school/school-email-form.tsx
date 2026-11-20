"use client";

import { useEffect, useState } from "react";
import { KeyRound, MailCheck, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchLocations, fetchSchools } from "@/lib/accounts/api";
import type { FieldErrors, NewSchoolRequest, SchoolLocation, SchoolOption } from "@/types/account";
import { AddSchoolPanel } from "./add-school-panel";
import { SelectField, TextField } from "./field";

export interface SchoolForm {
  age: string;
  email: string;
  locationId: string;
  schoolId: string;
  schoolLabel: string;
  campusId: string;
  campusLabel: string;
  programId: string;
}

export interface SchoolEmailFormProps {
  form: SchoolForm;
  errors: FieldErrors;
  newSchool: NewSchoolRequest | null;
  step?: "details" | "otp";
  otpCode?: string;
  otpNotice?: string;
  busy: boolean;
  onChange: (patch: Partial<SchoolForm>) => void;
  onNewSchool: (school: NewSchoolRequest | null) => void;
  onOtpCodeChange?: (code: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onVerifyOtp?: (event: React.FormEvent) => void;
  onResendOtp?: () => void;
  onBackToDetails?: () => void;
  onCancel: () => void;
}

export function SchoolEmailForm({
  form,
  errors,
  newSchool,
  step = "details",
  otpCode = "",
  otpNotice,
  busy,
  onChange,
  onNewSchool,
  onOtpCodeChange,
  onSubmit,
  onVerifyOtp,
  onResendOtp,
  onBackToDetails,
  onCancel,
}: SchoolEmailFormProps) {
  const [locations, setLocations] = useState<SchoolLocation[] | null>(null);
  const [loaded, setLoaded] = useState<{ locationId: string; schools: SchoolOption[] } | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchLocations().then((result) => {
      if (!live) return;
      if (!result.ok) return setLoadError(result.error ?? "We couldn't load the school list.");
      setLoadError(undefined);
      setLocations(result.data.locations);
      if (result.data.locations.length === 1) onChange({ locationId: result.data.locations[0].id });
    });
    return () => { live = false; };
  }, [attempt, onChange]);

  const { locationId } = form;
  useEffect(() => {
    if (!locationId) return;
    let live = true;
    void fetchSchools(locationId).then((result) => {
      if (!live) return;
      if (!result.ok) return setLoadError(result.error ?? "We couldn't load the school list.");
      setLoadError(undefined);
      setLoaded({ locationId, schools: result.data.schools });
    });
    return () => { live = false; };
  }, [locationId, attempt]);

  const schools = loaded?.locationId === locationId ? loaded.schools : null;
  const selectedSchool = schools?.find((s) => s.id === form.schoolId);
  const campuses = selectedSchool?.campuses ?? [];
  const programs = selectedSchool?.programs ?? [];

  const pickSchool = (schoolId: string) => {
    const school = schools?.find((s) => s.id === schoolId);
    onChange({ schoolId, schoolLabel: school?.shortName ?? "", campusId: "", campusLabel: "", programId: "" });
  };

  if (step === "otp" && onVerifyOtp) {
    return (
      <form id="school-otp-form" onSubmit={onVerifyOtp} noValidate className="mt-4 space-y-4">
        {otpNotice && (
          <p role="status" className="skeuo-recess flex items-center gap-2 rounded-xl p-3 text-sm text-[var(--color-primary-text)]">
            <MailCheck size={16} aria-hidden="true" className="shrink-0" />
            <span>{otpNotice}</span>
          </p>
        )}
        <div className="max-w-xs">
          <TextField
            id="school-otp"
            label={`Enter 6-digit code sent to ${form.email.trim().toLowerCase()}`}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={otpCode}
            onChange={(e) => onOtpCodeChange?.(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="font-code tracking-[0.25em]"
            required
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {onResendOtp && (
              <Button type="button" variant="outline" size="sm" onClick={onResendOtp} disabled={busy}>
                <RefreshCw size={14} aria-hidden="true" /> Resend code
              </Button>
            )}
            {onBackToDetails && (
              <Button type="button" variant="ghost" size="sm" onClick={onBackToDetails} disabled={busy}>
                Edit details
              </Button>
            )}
          </div>
          <Button type="submit" size="lg" className="px-5" disabled={busy || otpCode.length < 6}>
            <KeyRound size={15} aria-hidden="true" />
            {busy ? "Verifying…" : "Verify & save"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form id="school-form" onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_5.5rem]">
        <TextField id="email" label="School email" type="email" autoComplete="email" placeholder="you@school.edu.ph" hint="Use the email your school gave you."
          autoCapitalize="none" spellCheck={false} autoFocus value={form.email} error={errors.email} onChange={(e) => onChange({ email: e.target.value })} />
        <TextField id="age" label="Age" inputMode="numeric" maxLength={3} autoComplete="off" value={form.age} error={errors.age} onChange={(e) => onChange({ age: e.target.value })} />
      </div>

      {adding ? (
        <AddSchoolPanel onCancel={() => setAdding(false)} onAdded={(school) => {
          onNewSchool(school);
          onChange({ schoolId: "", schoolLabel: "", campusId: "", campusLabel: "", programId: "" });
          setAdding(false);
        }} />
      ) : newSchool ? (
        <div className="skeuo-recess flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium break-words">{newSchool.name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{newSchool.location} · Pending review</p>
            {errors.school && <p className="mt-1 text-xs text-[var(--color-pink)]">{errors.school}</p>}
          </div>
          <Button type="button" variant="ghost" onClick={() => onNewSchool(null)}>Pick from the list</Button>
        </div>
      ) : (
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField id="location" label="Location" value={form.locationId} disabled={!locations}
              onChange={(e) => onChange({ locationId: e.target.value, schoolId: "", schoolLabel: "", campusId: "", campusLabel: "", programId: "" })}>
              {!locations && <option value="">Loading…</option>}
              {locations && <option value="" disabled>Choose</option>}
              {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </SelectField>
            <SelectField id="school" label="School" value={form.schoolId} disabled={!schools} error={errors.school} onChange={(e) => pickSchool(e.target.value)}>
              <option value="" disabled>{locationId && !schools ? "Loading…" : "Choose"}</option>
              {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectField>
            <SelectField id="campus" label="Campus" value={form.campusId} disabled={campuses.length === 0} error={errors.campus}
              onChange={(e) => onChange({ campusId: e.target.value, campusLabel: campuses.find((c) => c.id === e.target.value)?.name ?? "" })}>
              <option value="" disabled>Choose</option>
              {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <SelectField id="program" label="Program" value={form.programId} disabled={programs.length === 0} error={errors.program}
              onChange={(e) => onChange({ programId: e.target.value })}>
              <option value="" disabled>Choose</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectField>
          </div>
          {loadError && (
            <p role="alert" className="mt-2 flex items-center gap-2 text-xs text-[var(--color-pink)]">
              {loadError}
              <Button type="button" variant="link" size="xs" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
            </p>
          )}
          <Button type="button" variant="link" size="sm" className="mt-1 px-0 text-[var(--color-accent)] underline" onClick={() => setAdding(true)}>
            School not listed? Add it
          </Button>
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
        <Shield size={14} className="mt-px shrink-0" />
        We&apos;ll send a 6-digit verification code to confirm this email belongs to you. If it&apos;s already verified on your account, it saves right away.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" className="px-4" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="lg" className="px-5" disabled={busy}>{busy ? "Checking…" : "Verify & save"}</Button>
      </div>
    </form>
  );
}
