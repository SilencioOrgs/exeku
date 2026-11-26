"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, Clock3, Compass, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fetchOrgs, orgAction } from "@/lib/orgs/api";
import type { OrgSummary } from "@/types/org";
import type { LocalProfile, ProfileInput } from "@/types/profile";
import { RegisterOrgNote } from "../orgs/register-org-note";
import { FacultyVerificationForm } from "./faculty-verification-form";
import { SchoolEmailForm } from "./school-email-form";
import { useSchoolEmailForm } from "./use-school-email-form";

function OrgStep({ profile, onDone }: { profile: LocalProfile; onDone: () => void }) {
  const campusId = profile.account?.school.campusId;
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!campusId) return;
    let live = true;
    void fetchOrgs(campusId).then((result) => { if (live && result.ok) setOrgs(result.data.orgs); });
    return () => { live = false; };
  }, [campusId]);

  const apply = async (orgId: string) => {
    setError(undefined);
    const result = await orgAction(orgId, { action: "apply", program: profile.account?.school.program });
    if (result.ok) setApplied((ids) => [...ids, orgId]);
    else setError(result.error ?? "We couldn't send your application. Try again.");
  };

  return (
    <div className="space-y-4">
      {orgs.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No organizations are listed for your school yet.</p>
      ) : (
        <ul className="space-y-2">
          {orgs.map((org) => (
            <li key={org.id} className="skeuo-recess flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{org.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{org.campusName} · {org.programName}</p>
              </div>
              {applied.includes(org.id) ? <span className="text-xs text-[var(--color-primary-text)]">Pending</span>
                : <Button variant="outline" onClick={() => void apply(org.id)}>Apply to {org.name}</Button>}
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-xs text-[var(--color-pink)]">{error}</p>}
      <RegisterOrgNote />
      <div className="flex justify-end"><Button size="lg" className="px-5" onClick={onDone}>Done</Button></div>
    </div>
  );
}

const TITLES = {
  choose: ["Welcome to Exeku", "How will you use Exeku?"],
  school: ["Add your school", "Tell us where you study."],
  faculty: ["Verify as faculty", "Submit your faculty details and verify your Gmail for admin approval."],
  facultyDone: ["Faculty verification submitted", "An administrator will review your request and unlock teacher tools."],
  orgs: ["Join your organization", "Officers confirm who belongs. You can skip this for now."],
} as const;

export function WelcomeDialog({ profile, onUpdate }: { profile: LocalProfile; onUpdate: (updates: Partial<ProfileInput>) => Promise<unknown> }) {
  const [open, setOpen] = useState(!profile.userType && !profile.account);
  const [step, setStep] = useState<keyof typeof TITLES>("choose");
  const [error, setError] = useState<string>();
  const school = useSchoolEmailForm(undefined, async (account) => {
    await onUpdate({ account, userType: "student" });
    setStep("orgs");
  });

  const explore = async () => {
    try {
      await onUpdate({ userType: "explorer" });
      setOpen(false);
    } catch {
      setError("We couldn't save your choice. Try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="skeuo-panel max-h-[90svh] overflow-y-auto p-5 sm:max-w-2xl sm:p-6" showCloseButton={false}>
        <div className="space-y-1">
          <DialogTitle className="text-xl font-semibold tracking-tight">{TITLES[step][0]}</DialogTitle>
          <DialogDescription>{TITLES[step][1]}</DialogDescription>
        </div>
        {step === "choose" && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Button variant="outline" className="h-auto flex-col items-start gap-1 p-4 text-left whitespace-normal" onClick={() => setStep("school")}>
                <span className="flex items-center gap-2 font-semibold"><GraduationCap size={16} aria-hidden="true" />I&apos;m a student</span>
                <span className="text-xs font-normal text-[var(--color-text-muted)]">Add your school, join organizations and compete.</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col items-start gap-1 p-4 text-left whitespace-normal" onClick={() => setStep("faculty")}>
                <span className="flex items-center gap-2 font-semibold"><BriefcaseBusiness size={16} aria-hidden="true" />I&apos;m faculty</span>
                <span className="text-xs font-normal text-[var(--color-text-muted)]">Verify as an instructor to create classes and advise organizations.</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col items-start gap-1 p-4 text-left whitespace-normal" onClick={() => void explore()}>
                <span className="flex items-center gap-2 font-semibold"><Compass size={16} aria-hidden="true" />Just exploring</span>
                <span className="text-xs font-normal text-[var(--color-text-muted)]">Practice problems. You can verify your role later.</span>
              </Button>
            </div>
            {error && <p role="alert" className="text-xs text-[var(--color-pink)]">{error}</p>}
            <div className="flex justify-end"><Button variant="ghost" onClick={() => setOpen(false)}>Decide later</Button></div>
          </div>
        )}
        {step === "school" && (
          <>
            {school.formError && <p role="alert" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-pink)]">{school.formError}</p>}
            <SchoolEmailForm
              form={school.form}
              errors={school.errors}
              newSchool={school.newSchool}
              step={school.step}
              otpCode={school.otpCode}
              otpNotice={school.otpNotice}
              busy={school.busy}
              onChange={school.updateForm}
              onNewSchool={school.setNewSchool}
              onOtpCodeChange={school.setOtpCode}
              onSubmit={school.submit}
              onVerifyOtp={school.verifyOtp}
              onResendOtp={() => void school.resendOtp()}
              onBackToDetails={school.backToDetails}
              onCancel={() => { school.reset(); setStep("choose"); }}
            />
          </>
        )}
        {step === "faculty" && (
          <FacultyVerificationForm
            defaultFullName={profile.displayName || ""}
            cancelLabel="Back"
            onSubmitted={async () => {
              await onUpdate({ userType: "faculty" }).catch(() => undefined);
              setStep("facultyDone");
            }}
            onCancel={() => setStep("choose")}
          />
        )}
        {step === "facultyDone" && (
          <div className="space-y-4">
            <div className="skeuo-recess flex items-start gap-3 rounded-xl p-4 text-sm">
              <Clock3 size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--color-primary-text)]" />
              <div className="space-y-1">
                <p className="font-medium text-[var(--color-text-main)]">Pending admin approval</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  You can check your verification status anytime on your Profile page. Once approved, Classes and Adviser tools unlock automatically.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="lg" className="px-5" onClick={() => setOpen(false)}>Continue to Exeku</Button>
            </div>
          </div>
        )}
        {step === "orgs" && <OrgStep profile={profile} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
