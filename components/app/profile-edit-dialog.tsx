"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import React, { useState } from "react";
import type { LocalProfile, ProfileInput, ExperienceLevel, PreferredLanguage } from "@/types/profile";
import { AVATARS } from "@/lib/avatars";
import { AVATAR_BORDERS } from "@/lib/avatar-borders";
import { validateDisplayName } from "@/lib/profile-validation";
import { parseGithub, parseLinkedin } from "@/lib/social-links";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { Code2, FileCode2, type LucideIcon } from "lucide-react";

export interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LocalProfile;
  onSave: (updates: Partial<ProfileInput>) => Promise<void>;
}

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
  const [avatarId, setAvatarId] = useState(profile.avatarId);
  const [borderId, setBorderId] = useState(profile.borderId ?? "none");
  const [experienceLevel, setExperienceLevel] = useState(profile.experienceLevel);
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferredLanguage);
  const [github, setGithub] = useState(profile.socialLinks?.github ?? "");
  const [linkedin, setLinkedin] = useState(profile.socialLinks?.linkedin ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = validateDisplayName(displayName);

  const handleSave = async () => {
    if (!validation.isValid) {
      setError(validation.error || "Invalid display name");
      return;
    }
    const parsedGithub = parseGithub(github);
    const parsedLinkedin = parseLinkedin(linkedin);
    if (parsedGithub.error || parsedLinkedin.error) {
      setError(parsedGithub.error || parsedLinkedin.error || null);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        displayName: validation.trimmed,
        bio: bio.trim(),
        avatarId,
        borderId,
        experienceLevel,
        preferredLanguage,
        socialLinks: { github: parsedGithub.handle, linkedin: parsedLinkedin.handle },
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto border border-[var(--color-primary)] bg-[var(--color-surface)] p-6 text-foreground [box-shadow:var(--shadow-card)] [border-radius:var(--radius-card)] sm:max-w-lg">
        <DialogTitle className="border-b border-[var(--color-border)] pb-3 text-lg font-semibold">Edit local profile</DialogTitle>

        {error && (
          <div role="alert" className="p-2.5 bg-[var(--color-elevated)] border border-[var(--color-pink)] text-[var(--color-pink)] text-xs">
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
          <input
            id="edit-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={32}
            className="w-full px-3 py-2 bg-[var(--color-canvas)] border border-[var(--color-border)] focus:border-[var(--color-accent)] text-foreground text-sm outline-none transition-colors"
          />
        </div>

        {/* Tagline / Bio */}
        <div className="space-y-1.5">
          <label htmlFor="edit-bio" className="block text-xs text-[var(--color-text-muted)]">
            Tagline or bio (optional)
          </label>
          <input
            id="edit-bio"
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 bg-[var(--color-canvas)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-foreground text-sm outline-none transition-colors"
          />
        </div>

        {/* Social Links */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="edit-github" className="block text-xs text-[var(--color-text-muted)]">GitHub username or link (optional)</label>
            <input id="edit-github" type="text" value={github} onChange={(e) => setGithub(e.target.value)} maxLength={120} autoCapitalize="none" spellCheck={false}
              className="w-full px-3 py-2 bg-[var(--color-canvas)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-foreground text-sm outline-none transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-linkedin" className="block text-xs text-[var(--color-text-muted)]">LinkedIn name or link (optional)</label>
            <input id="edit-linkedin" type="text" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} maxLength={160} autoCapitalize="none" spellCheck={false}
              className="w-full px-3 py-2 bg-[var(--color-canvas)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-foreground text-sm outline-none transition-colors" />
          </div>
        </div>

        {/* Avatar Selection Grid */}
        <div className="space-y-1.5">
          <span className="block text-xs text-[var(--color-text-main)]">
            Avatar
          </span>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map((av) => {
              const isSelected = av.id === avatarId;
              return (
                <Button
                  key={av.id}
                  type="button"
                  variant="outline"
                  aria-pressed={isSelected}
                  onClick={() => setAvatarId(av.id)}
                  className="h-auto flex-col gap-1 py-2"
                >
                  <PixelAvatar avatarId={av.id} size={48} />
                  <span className="w-full truncate text-center text-xs text-[var(--color-text-muted)]">{av.name}</span>
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
          <div className="grid grid-cols-2 gap-2">
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
          <div className="grid grid-cols-3 gap-2">
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
