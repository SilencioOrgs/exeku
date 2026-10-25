"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/appearance/theme-toggle";
import { useProfile } from "@/hooks/use-profile";
import { validateDisplayName } from "@/lib/profile-validation";
import { DEFAULT_AVATAR_ID } from "@/lib/avatars";
import type { ExperienceLevel, PreferredLanguage } from "@/types/profile";
import { StepIdentity } from "./step-identity";
import { StepAvatar } from "./step-avatar";
import { StepLoadout } from "./step-loadout";
import { cn } from "@/lib/utils";

const STEPS = ["Identity", "Avatar", "Preferences"] as const;

export function OnboardingWizard() {
  const router = useRouter();
  const { profile, isLoading, saveProfile } = useProfile();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>("python");
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validation = validateDisplayName(displayName);

  const handleNextFromIdentity = () => {
    setTouched(true);
    if (validation.isValid) setStep(2);
  };

  const handleFinalSubmit = async () => {
    setTouched(true);
    if (!validation.isValid) { setStep(1); return; }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await saveProfile({
        displayName: displayName.trim(), bio: bio.trim() || undefined,
        avatarId, experienceLevel, preferredLanguage,
      });
      router.push("/app");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save your profile");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <main className="grid min-h-dvh place-items-center bg-[var(--color-canvas)] p-5">
      <p role="status" className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
        <LoaderCircle size={18} aria-hidden="true" className="animate-spin" /> Loading local profile…
      </p>
    </main>;
  }

  return (
    <main className="min-h-dvh bg-[var(--color-canvas)] px-4 py-6 text-[var(--color-text-main)] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-base font-semibold tracking-tight hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
            <span className="grid size-9 place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] text-sm font-semibold">E</span>
            exeku
          </Link>
          <ThemeToggle />
        </header>

        {profile && (
          <section aria-label="Existing profile" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Welcome back, {profile.displayName}</h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Continue with your saved local profile, or update its details.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" type="button" onClick={() => {
                setDisplayName(profile.displayName); setBio(profile.bio || "");
                setAvatarId(profile.avatarId); setExperienceLevel(profile.experienceLevel);
                setPreferredLanguage(profile.preferredLanguage);
              }}>Use saved details</Button>
              <Button type="button" onClick={() => router.push("/app")}>Open workspace <ArrowRight size={16} aria-hidden="true" /></Button>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-7">
            <p className="mb-3 text-sm font-semibold">Set up Exeku</p>
            <ol aria-label="Profile setup progress" className="grid grid-cols-3 gap-2">
              {STEPS.map((label, index) => {
                const number = index + 1;
                const current = step === number;
                const complete = step > number;
                return <li key={label} aria-current={current ? "step" : undefined}
                  className={cn("flex min-w-0 items-center gap-2 rounded-lg border px-2 py-2 text-xs sm:px-3",
                    current ? "border-[var(--color-text-main)] bg-[var(--color-elevated)] font-semibold" :
                      "border-[var(--color-border)] text-[var(--color-text-muted)]")}>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
                    current || complete ? "border-[var(--color-text-main)]" : "border-[var(--color-border)]")}>
                    {complete ? <Check size={12} aria-hidden="true" /> : number}
                  </span>
                  <span className="truncate">{label}</span>
                </li>;
              })}
            </ol>
          </div>

          <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-8">
            {submitError && <div role="alert" className="rounded-lg border border-[var(--color-pink)] bg-[var(--color-elevated)] p-3 text-sm text-[var(--color-pink)]">{submitError}</div>}

            {step === 1 && <StepIdentity displayName={displayName} bio={bio} onChangeName={setDisplayName}
              onChangeBio={setBio} error={validation.error} touched={touched} onBlurName={() => setTouched(true)} />}
            {step === 2 && <StepAvatar selectedAvatarId={avatarId} onSelectAvatar={setAvatarId} />}
            {step === 3 && <StepLoadout displayName={displayName} avatarId={avatarId}
              experienceLevel={experienceLevel} preferredLanguage={preferredLanguage}
              onChangeExperience={setExperienceLevel} onChangeLanguage={setPreferredLanguage} />}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:px-7">
            {step > 1
              ? <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setStep((current) => (current - 1) as 1 | 2)}>
                  <ArrowLeft size={16} aria-hidden="true" /> Back
                </Button>
              : <span className="text-xs text-[var(--color-text-muted)]">Step 1 of 3</span>}
            {step < 3
              ? <Button type="button" onClick={step === 1 ? handleNextFromIdentity : () => setStep(3)}>
                  Continue <ArrowRight size={16} aria-hidden="true" />
                </Button>
              : <Button type="button" onClick={() => void handleFinalSubmit()} disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Create profile"} {!isSubmitting && <Check size={16} aria-hidden="true" />}
                </Button>}
          </footer>
        </section>
        <p className="text-center text-xs text-[var(--color-text-muted)]">Your Exeku profile is saved to this browser. No account registration is required.</p>
      </div>
    </main>
  );
}
