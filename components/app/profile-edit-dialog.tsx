"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import React, { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { LocalProfile, ProfileInput, ExperienceLevel, PreferredLanguage } from "@/types/profile";
import { AVATARS, unlocksAt } from "@/lib/avatars";
import { AVATAR_BORDERS } from "@/lib/avatar-borders";
import { validateDisplayName } from "@/lib/profile-validation";
import { fetchProgress } from "@/lib/accounts/api";
import { birthdayBounds, computeAgeFromBirthday, MAX_ACCOUNT_AGE, MIN_ACCOUNT_AGE } from "@/lib/accounts/birthday";
import { parseGithub, parseLinkedin, parseWebsite } from "@/lib/social-links";
import { Input } from "@/components/ui/input";
import { TextField } from "./school/field";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { Code2, FileCode2, Lock, type LucideIcon } from "lucide-react";

export interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LocalProfile;
  onSave: (updates: Partial<ProfileInput>) => Promise<void>;
}

type EditableField = "displayName" | "birthday" | "github" | "linkedin" | "website";

const FIELD_INPUT_IDS: Record<EditableField, string> = {
  displayName: "edit-name",
  birthday: "edit-birthday",
  github: "edit-github",
  linkedin: "edit-linkedin",
  website: "edit-website",
};

const FIELD_ORDER: EditableField[] = ["displayName", "birthday", "github", "linkedin", "website"];

const LANGUAGES: { id: PreferredLanguage; label: string; icon: LucideIcon }[] = [
  { id: "python", label: "Python 3", icon: Code2 },
  { id: "java", label: "Java", icon: Code2 },
  { id: "cpp", label: "C++", icon: Code2 },
  { id: "c", label: "C", icon: FileCode2 },
];

const LEVELS: { id: ExperienceLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

export function ProfileEditDialog(props: ProfileEditDialogProps) {
  if (!props.isOpen) return null;
  return <ProfileEditModalContent {...props} />;
}

function ProfileEditModalContent({
  onClose,
  profile,
  onSave,
}: ProfileEditDialogProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio || "");
  const [birthday, setBirthday] = useState(profile.birthday ?? profile.account?.birthday ?? "");
  const [avatarId, setAvatarId] = useState(profile.avatarId);
  const [borderId, setBorderId] = useState(profile.borderId ?? "none");
  const [experienceLevel, setExperienceLevel] = useState(profile.experienceLevel);
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferredLanguage);
  const [github, setGithub] = useState(profile.socialLinks?.github ?? "");
  const [linkedin, setLinkedin] = useState(profile.socialLinks?.linkedin ?? "");
  const [website, setWebsite] = useState(profile.socialLinks?.website ?? "");
  const [solved, setSolved] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<EditableField, string>>>({});
  const scrollBodyRef = useRef<HTMLFormElement | null>(null);

  const validation = validateDisplayName(displayName);
  const bounds = useMemo(() => birthdayBounds(), []);
  const computedAge = birthday.trim() ? computeAgeFromBirthday(birthday) : null;
  const birthdayHint =
    computedAge !== null && computedAge >= MIN_ACCOUNT_AGE && computedAge <= MAX_ACCOUNT_AGE
      ? `Age: ${computedAge} years old · Kept private on your account.`
      : "Optional · Kept private and used to calculate your age (13–100).";

  useEffect(() => {
    let live = true;
    void fetchProgress().then((result) => { if (live && result.ok) setSolved(result.data.solved); });
    return () => { live = false; };
  }, []);

  const clearFieldError = (field: EditableField) => {
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const scrollToField = (field: EditableField) => {
    const id = FIELD_INPUT_IDS[field];
    requestAnimationFrame(() => {
      const target = document.getElementById(id) as HTMLElement | null;
      if (!target) return;
      const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      target.focus({ preventScroll: true });
    });
  };

  const scrollToTop = () => {
    requestAnimationFrame(() => {
      const container = scrollBodyRef.current;
      if (!container) return;
      const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      container.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  };

  const handleSave = async (event?: FormEvent) => {
    event?.preventDefault();
    const nextErrors: Partial<Record<EditableField, string>> = {};

    if (!validation.isValid) {
      nextErrors.displayName = validation.error || "Invalid display name";
    }

    const trimmedBirthday = birthday.trim();
    let validAge: number | null = null;
    if (trimmedBirthday) {
      const age = computeAgeFromBirthday(trimmedBirthday);
      if (age === null) {
        nextErrors.birthday = "Enter a valid birthday.";
      } else if (age < MIN_ACCOUNT_AGE || age > MAX_ACCOUNT_AGE) {
        nextErrors.birthday = `You must be between ${MIN_ACCOUNT_AGE} and ${MAX_ACCOUNT_AGE} years old.`;
      } else {
        validAge = age;
      }
    }

    const parsedGithub = parseGithub(github);
    if (parsedGithub.error) nextErrors.github = parsedGithub.error;
    const parsedLinkedin = parseLinkedin(linkedin);
    if (parsedLinkedin.error) nextErrors.linkedin = parsedLinkedin.error;
    const parsedWebsite = parseWebsite(website);
    if (parsedWebsite.error) nextErrors.website = parsedWebsite.error;

    const firstInvalid = FIELD_ORDER.find((field) => Boolean(nextErrors[field]));
    if (firstInvalid) {
      setFieldErrors(nextErrors);
      setError(null);
      scrollToField(firstInvalid);
      return;
    }

    setIsSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const updates: Partial<ProfileInput> = {
        displayName: validation.trimmed,
        bio: bio.trim(),
        birthday: trimmedBirthday,
        avatarId,
        borderId,
        experienceLevel,
        preferredLanguage,
        socialLinks: { github: parsedGithub.handle, linkedin: parsedLinkedin.handle, website: parsedWebsite.url },
      };
      if (profile.account && trimmedBirthday && validAge !== null) {
        updates.account = { ...profile.account, birthday: trimmedBirthday, age: validAge };
      }
      await onSave(updates);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
      scrollToTop();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 overflow-hidden border border-[var(--color-primary)] bg-[var(--color-surface)] p-0 text-foreground [box-shadow:var(--shadow-card)] [border-radius:var(--radius-card)] sm:max-w-lg">
        {/* Fixed Header */}
        <div className="shrink-0 border-b border-[var(--color-border)] px-6 py-4 pr-12">
          <DialogTitle className="text-lg font-semibold">Edit profile</DialogTitle>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="edit-profile-form"
          ref={scrollBodyRef}
          onSubmit={handleSave}
          noValidate
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5"
        >
          {error && (
            <div role="alert" className="rounded-lg border border-[var(--color-pink)] bg-[var(--color-elevated)] p-2.5 text-xs text-[var(--color-pink)]">
              {error}
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <label htmlFor="edit-name" className="text-[var(--color-text-main)]">
                Display name
              </label>
              <span className={validation.isValid ? "text-[var(--color-primary-text)]" : "text-[var(--color-pink)]"}>
                {displayName.length}/32
              </span>
            </div>
            <Input
              id="edit-name"
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); clearFieldError("displayName"); }}
              maxLength={32}
              aria-invalid={Boolean(fieldErrors.displayName)}
              aria-describedby={fieldErrors.displayName ? "edit-name-error" : undefined}
              className="skeuo-well h-10"
            />
            {fieldErrors.displayName && (
              <p id="edit-name-error" role="alert" className="text-xs text-[var(--color-pink)]">
                {fieldErrors.displayName}
              </p>
            )}
          </div>

          {/* Tagline / Bio */}
          <TextField
            id="edit-bio"
            label="Tagline or bio (optional)"
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={100}
          />

          {/* Birthday */}
          <TextField
            id="edit-birthday"
            label="Birthday (optional)"
            type="date"
            autoComplete="bday"
            min={bounds.min}
            max={bounds.max}
            hint={birthdayHint}
            value={birthday}
            error={fieldErrors.birthday}
            onChange={(e) => { setBirthday(e.target.value); clearFieldError("birthday"); }}
          />

          {/* Social Links */}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="edit-github"
              label="GitHub username or link (optional)"
              type="text"
              value={github}
              error={fieldErrors.github}
              onChange={(e) => { setGithub(e.target.value); clearFieldError("github"); }}
              maxLength={120}
              autoCapitalize="none"
              spellCheck={false}
            />
            <TextField
              id="edit-linkedin"
              label="LinkedIn name or link (optional)"
              type="text"
              value={linkedin}
              error={fieldErrors.linkedin}
              onChange={(e) => { setLinkedin(e.target.value); clearFieldError("linkedin"); }}
              maxLength={160}
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <TextField
            id="edit-website"
            label="Portfolio website (optional)"
            type="text"
            inputMode="url"
            placeholder="yourname.dev"
            value={website}
            error={fieldErrors.website}
            onChange={(e) => { setWebsite(e.target.value); clearFieldError("website"); }}
            maxLength={200}
            autoCapitalize="none"
            spellCheck={false}
            hint="Your name, avatar, bio and links are visible to other students."
          />

          {/* Avatar Selection Grid */}
          <div className="space-y-1.5">
            <span className="block text-xs text-[var(--color-text-main)]">
              Avatar
            </span>
            <div role="group" aria-label="Avatar" className="grid grid-cols-4 gap-2">
              {AVATARS.map((av) => {
                const isSelected = av.id === avatarId;
                const needed = unlocksAt(av.id);
                const locked = solved < needed && av.id !== profile.avatarId;
                return (
                  <Button
                    key={av.id}
                    type="button"
                    variant="outline"
                    aria-pressed={isSelected}
                    disabled={locked}
                    title={locked ? `Solve ${needed} ${needed === 1 ? "problem" : "problems"} to unlock` : undefined}
                    onClick={() => setAvatarId(av.id)}
                    className="relative h-auto flex-col gap-1 py-2"
                  >
                    <PixelAvatar avatarId={av.id} size={48} className={locked ? "opacity-40 grayscale" : undefined} />
                    {locked && <Lock size={14} aria-hidden="true" className="absolute top-2 right-2 text-[var(--color-primary-text)]" />}
                    <span className="w-full truncate text-center text-xs text-[var(--color-text-muted)]">{locked ? `Solve ${needed}` : av.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Avatar Border */}
          <div className="space-y-1.5">
            <span className="block text-xs text-[var(--color-text-main)]">Avatar border</span>
            <div role="group" aria-label="Avatar border" className="grid grid-cols-4 gap-2">
              {AVATAR_BORDERS.map((border) => (
                <Button key={border.id} type="button" variant="outline" aria-pressed={border.id === borderId} onClick={() => setBorderId(border.id)} className="h-auto flex-col gap-2.5 pt-4 pb-2">
                  <PixelAvatar avatarId={avatarId} borderId={border.id} size={40} />
                  <span className="w-full truncate text-center text-xs text-[var(--color-text-muted)]">{border.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Primary Language */}
          <div className="space-y-1.5">
            <span className="block text-xs text-[var(--color-text-main)]">
              Primary language
            </span>
            <div role="group" aria-label="Primary language" className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((lang) => {
                const isSelected = lang.id === preferredLanguage;
                return (
                  <Button
                    key={lang.id}
                    type="button"
                    variant="outline"
                    aria-pressed={isSelected}
                    onClick={() => setPreferredLanguage(lang.id)}
                    className="justify-start"
                  >
                    <lang.icon size={15} aria-hidden="true" />{lang.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Experience Level */}
          <div className="space-y-1.5">
            <span className="block text-xs text-[var(--color-text-main)]">
              Experience level
            </span>
            <div role="group" aria-label="Experience level" className="grid grid-cols-3 gap-2">
              {LEVELS.map((lvl) => {
                const isSelected = lvl.id === experienceLevel;
                return (
                  <Button
                    key={lvl.id}
                    type="button"
                    variant="outline"
                    aria-pressed={isSelected}
                    onClick={() => setExperienceLevel(lvl.id)}
                  >
                    {lvl.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Fixed Footer Actions */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3.5">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-profile-form" size="sm" loading={isSaving} loadingText="Saving…">
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
