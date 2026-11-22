"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, BadgeCheck, GraduationCap, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { isClerkEmailVerified, type ClerkEmailUser } from "@/lib/auth/clerk-email";
import type { StudentAccount } from "@/types/account";
import type { LocalProfile } from "@/types/profile";
import type { FacultyStatusPayload } from "@/types/roles";
import { IdCard } from "./id-card";
import { SchoolEmailForm } from "./school-email-form";
import { useSchoolEmailForm } from "./use-school-email-form";

export interface SchoolEmailSectionProps {
  profile: LocalProfile;
  facultyStatus?: FacultyStatusPayload | null;
  onSave: (account: StudentAccount) => Promise<void>;
  /** Identity details shown above the school email, beside the ID card. */
  children: React.ReactNode;
}

export function SchoolEmailSection({ profile, facultyStatus, onSave, children }: SchoolEmailSectionProps) {
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

  const role = facultyStatus?.role ?? "student";
  const isTeacher = role === "teacher";
  const approvedFaculty = facultyStatus?.request?.status === "approved" ? facultyStatus.request : null;

  const idFullName = isTeacher && approvedFaculty?.fullName ? approvedFaculty.fullName : profile.displayName;
  const idSchool = isTeacher && approvedFaculty?.schoolName ? approvedFaculty.schoolName : (newSchool?.name ?? form.schoolLabel);
  const idCampus = isTeacher && approvedFaculty?.department ? approvedFaculty.department : (newSchool?.campus ?? form.campusLabel);
  const idRoleDetail = isTeacher && approvedFaculty?.positionTitle ? approvedFaculty.positionTitle : undefined;
  const idSerial =
    isTeacher && approvedFaculty?.employeeId
      ? approvedFaculty.employeeId.toUpperCase()
      : `EXK-${profile.id.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`;

  return (
    <section aria-label="Your profile" className="skeuo-panel flex flex-col gap-8 p-5 sm:p-7 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        {children}

        {isTeacher ? (
          <div className="mt-6 border-t border-[var(--color-border)] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <GraduationCap size={16} className="text-[var(--color-primary-text)]" aria-hidden="true" />
                Teacher credentials
              </h3>
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-easy-bg)] px-2 py-0.5 font-code text-xs text-[var(--color-mint)]">
                <BadgeCheck size={12} aria-hidden="true" /> Verified teacher
              </span>
            </div>

            {approvedFaculty ? (
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <div className="skeuo-recess rounded-xl px-3.5 py-2.5 text-xs">
                  <p className="text-[var(--color-text-muted)]">School &amp; department</p>
                  <p className="mt-0.5 font-semibold text-[var(--color-text-main)]">{approvedFaculty.schoolName}</p>
                  <p className="text-[var(--color-text-muted)]">{approvedFaculty.positionTitle} · {approvedFaculty.department}</p>
                </div>
                <div className="skeuo-recess rounded-xl px-3.5 py-2.5 text-xs">
                  <p className="text-[var(--color-text-muted)]">Faculty ID &amp; Gmail</p>
                  <p className="mt-0.5 font-code font-semibold text-[var(--color-primary-text)]">{approvedFaculty.employeeId}</p>
                  <p className="truncate font-code text-[var(--color-text-muted)]">{approvedFaculty.schoolEmail}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Your account has verified Teacher permissions. You can create classes, build custom coding problems, and serve as an organization adviser.
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/app/classes" className={buttonVariants({ size: "sm" })}>
                Open teacher classes <ArrowRight size={14} aria-hidden="true" />
              </Link>
              {!editing && (
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil size={14} aria-hidden="true" /> {saved ? "Edit campus link" : "Link campus (optional)"}
                </Button>
              )}
            </div>

            {editing && (
              <div className="mt-4">
                {formError && <p role="alert" className="skeuo-recess mb-3 rounded-xl p-3 text-sm text-[var(--color-pink)]">{formError}</p>}
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
              </div>
            )}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
      <div className="order-first lg:order-none lg:w-60 lg:shrink-0">
        <IdCard
          fullName={idFullName}
          school={idSchool}
          campus={idCampus}
          pending={!isTeacher && newSchool !== null}
          avatarId={profile.avatarId}
          borderId={profile.borderId}
          serial={idSerial}
          role={role}
          roleDetail={idRoleDetail}
        />
      </div>
    </section>
  );
}
