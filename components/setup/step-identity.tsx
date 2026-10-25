"use client";

import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface StepIdentityProps {
  displayName: string;
  bio: string;
  onChangeName: (name: string) => void;
  onChangeBio: (bio: string) => void;
  error?: string;
  touched: boolean;
  onBlurName: () => void;
}

export function StepIdentity({
  displayName, bio, onChangeName, onChangeBio, error, touched, onBlurName,
}: StepIdentityProps) {
  const isInvalid = touched && Boolean(error);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--color-text-muted)]">Step 1 of 3 · Your identity</p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Create your profile</h2>
        <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
          Choose a display name for your coding workspace. No email or password required.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="display-name" className="text-sm font-medium">Display name <span aria-hidden="true">*</span></label>
          <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{displayName.length}/32</span>
        </div>
        <Input
          id="display-name" value={displayName} onChange={(event) => onChangeName(event.target.value)}
          onBlur={onBlurName} maxLength={32} autoFocus aria-required="true"
          aria-invalid={isInvalid} aria-describedby={isInvalid ? "name-error" : "name-hint"}
          placeholder="e.g. Alex"
          className="h-11 rounded-lg border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm"
        />
        {isInvalid ? <p id="name-error" role="alert" className="text-xs text-[var(--color-pink)]">{error}</p> :
          <p id="name-hint" className="text-xs text-[var(--color-text-muted)]">2–32 characters: letters, numbers, spaces, underscores and dashes.</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="profile-bio" className="text-sm font-medium">Bio <span className="font-normal text-[var(--color-text-muted)]">(optional)</span></label>
          <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{bio.length}/100</span>
        </div>
        <Input
          id="profile-bio" value={bio} onChange={(event) => onChangeBio(event.target.value)}
          maxLength={100} placeholder="A little about what you're learning"
          className="h-11 rounded-lg border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm"
        />
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3 text-sm text-[var(--color-text-muted)]">
        <Info size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
        <p>Your profile is stored in this browser. Clearing site data may remove it. Code execution uses a separate sandbox service when connected.</p>
      </div>
    </div>
  );
}
