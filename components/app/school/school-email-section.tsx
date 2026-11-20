"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { BadgeCheck, GraduationCap, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isClerkEmailVerified, type ClerkEmailUser } from "@/lib/auth/clerk-email";
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
  const { user } = useUser();
  const saved = profile.account;
  const [editing, setEditing] = useState(false);
  const school = useSchoolEmailForm(saved, async (account) => {
    await onSave(account);
    setEditing(false);
  });
  const { form, newSchool, errors, formError, step, otpCode, otpNotice, busy } = school;
  const emailVerified = Boolean(
    saved && (saved.verified || isClerkEmailVerified(user as unknown as ClerkEmailUser | null | undefined, saved.email)),
  );

  return (
    <section aria-label="Your profile" className="skeuo-panel flex flex-col gap-8 p-5 sm:p-7 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        {children}
        <h3 className="mt-6 border-t border-[var(--color-border)] pt-5 font-semibold">School email</h3>
        {formError && <p role="alert" className="skeuo-recess mt-3 rounded-xl p-3 text-sm text-[var(--color-pink)]">{formError}</p>}
        {editing ? (
          <SchoolEmailForm
            form={form}
            errors={errors}
            newSchool={newSchool}
            step={step}
            otpCode={otpCode}
            otpNotice={otpNotice}
            busy={busy}
            onChange={school.updateForm}
            onNewSchool={school.setNewSchool}
            onOtpCodeChange={school.setOtpCode}
            onSubmit={school.submit}
            onVerifyOtp={school.verifyOtp}
            onResendOtp={() => void school.resendOtp()}
            onBackToDetails={school.backToDetails}
            onCancel={() => { school.reset(); setEditing(false); }}
          />
        ) : saved ? (
          <div className="mt-2 space-y-3">
            <div className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium break-all">{saved.email}</p>
                {emailVerified && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-easy-bg)] px-2 py-0.5 font-code text-xs text-[var(--color-mint)]">
                    <BadgeCheck size={12} aria-hidden="true" /> Verified
                  </span>
                )}
              </div>
              <p className="text-[var(--color-text-muted)]">
                {saved.school.name}{saved.school.campus ? `, ${saved.school.campus}` : ""}{saved.school.program ? `, ${saved.school.program}` : ""}
                {saved.school.status === "pending_review" ? " · Pending review" : ""}
              </p>
              {!emailVerified && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Not verified yet. Save your school email to verify it with a 6-digit code.</p>
              )}
            </div>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={15} />
              {emailVerified ? "Edit school email" : "Verify school email"}
            </Button>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <p className="max-w-prose text-sm text-[var(--color-text-muted)]">Add and verify the email your school gave you to put your school on your ID.</p>
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
