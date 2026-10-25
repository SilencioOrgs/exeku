"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Pencil, UserRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/appearance/theme-toggle";
import { useProfile } from "@/hooks/use-profile";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { ProfileResetDialog } from "./profile-reset-dialog";
import { draftRepository } from "@/lib/storage/draft-repository";
import { LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";

export function SettingsView() {
  const router = useRouter();
  const { profile, updateProfile, resetProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [draftCount, setDraftCount] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    draftRepository.getAllDraftsForProfile(profile.id)
      .then((drafts) => { if (active) setDraftCount(drafts.length); })
      .catch(() => { if (active) setDraftCount(null); });
    return () => { active = false; };
  }, [profile]);

  if (!profile) {
    return <p role="status" className="mx-auto max-w-3xl px-5 py-10 text-sm text-[var(--color-text-muted)]">Loading settings…</p>;
  }

  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="settings-page mx-auto w-full max-w-3xl space-y-7 px-4 py-6 sm:px-6 sm:py-9">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Manage your profile and workspace preferences.</p>
      </header>

      <section aria-labelledby="settings-appearance-title" className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0 space-y-1">
            <h2 id="settings-appearance-title" className="text-base font-semibold">Theme</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Switch between light and dark mode.</p>
          </div>
          <ThemeToggle showLabel />
        </div>
      </section>

      <section aria-labelledby="settings-profile-title" className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
          <div>
            <h2 id="settings-profile-title" className="flex items-center gap-2 text-base font-semibold"><UserRound size={17} aria-hidden="true" /> Profile</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Your local coding identity.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setEditing(true)}><Pencil size={14} aria-hidden="true" /> Edit profile</Button>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-text-muted)]">Display name</p>
            <p className="mt-1 break-words text-sm font-medium">{profile.displayName}</p>
            {profile.bio && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{profile.bio}</p>}
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Preferred language</p>
            <p className="mt-1 text-sm font-medium">{LANGUAGE_DISPLAY_NAMES[profile.preferredLanguage]}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Experience</p>
            <p className="mt-1 text-sm font-medium capitalize">{profile.experienceLevel}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Profile created</p>
            <p className="mt-1 text-sm font-medium">{joined}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="settings-data-title" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <Database size={18} className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 id="settings-data-title" className="text-base font-semibold">Local data</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Your profile and saved drafts remain in this browser. Running code sends source to the configured sandbox through the application server.</p>
            <p className="mt-3 text-sm">Saved drafts: <strong>{draftCount ?? "Unavailable"}</strong></p>
          </div>
        </div>
        <details className="border-t border-[var(--color-border)]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] sm:px-5">Advanced · Reset local profile</summary>
          <div className="space-y-3 border-t border-[var(--color-border)] px-4 py-4 sm:px-5">
            <p className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Reset permanently deletes your local profile and its saved code drafts. This cannot be undone.</p>
            <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmReset(true)}>Reset local profile</Button>
          </div>
        </details>
      </section>

      <ProfileEditDialog
        isOpen={editing}
        onClose={() => setEditing(false)}
        profile={profile}
        onSave={async (updates) => { await updateProfile(profile.id, updates); }}
      />
      <ProfileResetDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        profileName={profile.displayName}
        onConfirmReset={async () => {
          await draftRepository.deleteProfileDrafts(profile.id);
          await resetProfile(profile.id);
          router.push("/setup");
        }}
      />
    </div>
  );
}
