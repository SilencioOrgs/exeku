"use client";

import { useState } from "react";
import { GraduationCap, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudentAccount } from "@/types/account";
import type { LocalProfile } from "@/types/profile";
import { IdCard } from "./id-card";
import { SchoolEmailForm } from "./school-email-form";
import { useSchoolEmailForm } from "./use-school-email-form";

export interface SchoolEmailSectionProps {
  profile: LocalProfile;
  onSave: (account: StudentAccount) => Promise<void>;
  /** Identity details shown above the school email, beside the ID card. */
  children: React.ReactNode;
}

export function SchoolEmailSection({ profile, onSave, children }: SchoolEmailSectionProps) {
  const saved = profile.account;
  const [editing, setEditing] = useState(false);
  const school = useSchoolEmailForm(saved, async (account) => {
    await onSave(account);
    setEditing(false);
  });
  const { form, newSchool, errors, formError, busy } = school;

  return (
    <section aria-label="Your profile" className="skeuo-panel flex flex-col gap-8 p-5 sm:p-7 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        {children}
        <h3 className="mt-6 border-t border-[var(--color-border)] pt-5 font-semibold">School email</h3>
        {formError && <p role="alert" className="skeuo-recess mt-3 rounded-xl p-3 text-sm text-[var(--color-pink)]">{formError}</p>}
        {editing ? (
          <SchoolEmailForm form={form} errors={errors} newSchool={newSchool} busy={busy}
            onChange={school.updateForm} onNewSchool={school.setNewSchool} onSubmit={school.submit}
            onCancel={() => { school.reset(); setEditing(false); }} />
        ) : saved ? (
          <div className="mt-2 space-y-3">
            <div className="text-sm">
              <p className="font-medium break-all">{saved.email}</p>
              <p className="text-[var(--color-text-muted)]">
                {saved.school.name}{saved.school.campus ? `, ${saved.school.campus}` : ""}{saved.school.program ? `, ${saved.school.program}` : ""}
                {saved.school.status === "pending_review" ? " · Pending review" : ""}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Not verified yet. We&apos;ll verify it once accounts are connected.</p>
            </div>
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil size={15} />Edit school email</Button>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <p className="max-w-prose text-sm text-[var(--color-text-muted)]">Add the email your school gave you to put your school on your ID.</p>
            <Button onClick={() => setEditing(true)}><GraduationCap size={15} />Add school email</Button>
          </div>
        )}
      </div>
      <div className="order-first lg:order-none lg:w-60 lg:shrink-0">
        <IdCard fullName={profile.displayName} school={newSchool?.name ?? form.schoolLabel} campus={newSchool?.campus ?? form.campusLabel} pending={newSchool !== null} avatarId={profile.avatarId} borderId={profile.borderId} serial={`EXK-${profile.id.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`} />
      </div>
    </section>
  );
}
