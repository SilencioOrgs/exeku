"use client";

import { Check, Code2 } from "lucide-react";
import type { ExperienceLevel, PreferredLanguage } from "@/types/profile";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { cn } from "@/lib/utils";

export interface StepLoadoutProps {
  displayName: string;
  avatarId: string;
  experienceLevel: ExperienceLevel;
  preferredLanguage: PreferredLanguage;
  onChangeExperience: (level: ExperienceLevel) => void;
  onChangeLanguage: (lang: PreferredLanguage) => void;
}

const LANGUAGES: { id: PreferredLanguage; label: string; detail: string }[] = [
  { id: "python", label: "Python 3", detail: "Great for learning fundamentals" },
  { id: "java", label: "Java", detail: "Object-oriented programming" },
  { id: "cpp", label: "C++", detail: "Algorithms and systems" },
  { id: "c", label: "C", detail: "Low-level fundamentals" },
];
const LEVELS: { id: ExperienceLevel; label: string; detail: string }[] = [
  { id: "beginner", label: "Beginner", detail: "I'm new to programming" },
  { id: "intermediate", label: "Intermediate", detail: "I know the basics" },
  { id: "advanced", label: "Advanced", detail: "I'm comfortable with algorithms" },
];

export function StepLoadout({
  displayName, avatarId, experienceLevel, preferredLanguage, onChangeExperience, onChangeLanguage,
}: StepLoadoutProps) {
  const languageName = LANGUAGES.find((language) => language.id === preferredLanguage)?.label ?? "Python 3";
  const levelName = LEVELS.find((level) => level.id === experienceLevel)?.label ?? "Beginner";
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--color-text-muted)]">Step 3 of 3 · Preferences</p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Personalize your workspace</h2>
        <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">Pick a language and experience level. These preferences can be edited anytime.</p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Preferred language</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {LANGUAGES.map((language) => {
            const selected = language.id === preferredLanguage;
            return <label key={language.id} className={cn(
              "relative flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-ring)]",
              selected ? "border-[var(--color-text-main)] bg-[var(--color-elevated)]" : "border-[var(--color-border)] hover:bg-[var(--color-elevated)]",
            )}>
              <input type="radio" name="preferred-language" className="sr-only"
                checked={selected} onChange={() => onChangeLanguage(language.id)} />
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--color-border)]"><Code2 size={17} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{language.label}</span>
                <span className="block text-xs text-[var(--color-text-muted)]">{language.detail}</span>
              </span>
              {selected && <Check size={16} aria-hidden="true" className="shrink-0" />}
            </label>;
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Experience level</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((level) => {
            const selected = level.id === experienceLevel;
            return <label key={level.id} className={cn(
              "relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-ring)]",
              selected ? "border-[var(--color-text-main)] bg-[var(--color-elevated)]" : "border-[var(--color-border)] hover:bg-[var(--color-elevated)]",
            )}>
              <input type="radio" name="experience-level" className="sr-only"
                checked={selected} onChange={() => onChangeExperience(level.id)} />
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">{level.label}{selected && <Check size={16} aria-hidden="true" />}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{level.detail}</span>
            </label>;
          })}
        </div>
      </fieldset>

      <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-4">
        <PixelAvatar avatarId={avatarId} size={44} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{displayName || "Your profile"}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{languageName} · {levelName}</p>
        </div>
      </div>
    </div>
  );
}
