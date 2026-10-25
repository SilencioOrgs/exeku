"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { draftRepository } from "@/lib/storage/draft-repository";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { DotIcon } from "@/components/retro/dot-icon";
import { CodingActivity } from "./coding-activity";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";

export function ProfileView() {
  const { profile, updateProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [draftCount, setDraftCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    if (profile) {
      draftRepository.getAllDraftsForProfile(profile.id)
        .then((drafts) => { if (active) setDraftCount(drafts.length); })
        .catch(() => { if (active) setDraftCount(null); });
    }
    return () => { active = false; };
  }, [profile]);

  if (!profile) return <p role="status" className="p-6 text-sm text-[var(--color-text-muted)]">Loading local profile…</p>;

  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="profile-view mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-medium text-[var(--color-text-muted)]">Personal workspace</p><h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1></div>
        <button type="button" onClick={() => setEditing(true)} className="profile-action">
          <DotIcon name="cog" size={16} aria-hidden="true" /> Edit profile
        </button>
      </header>
      <section aria-label="Your profile" className="profile-panel flex flex-wrap items-center gap-4 p-5 sm:gap-6 sm:p-6">
        <PixelAvatar avatarId={profile.avatarId} size={72} className="shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="break-words text-xl font-semibold sm:text-2xl">{profile.displayName}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">{profile.bio || "Your personal coding workspace"}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Coding locally since {joined}</p>
        </div>
        <Link href="/app/settings" className="profile-action">
          <DotIcon name="cog" size={16} aria-hidden="true" /> Appearance
        </Link>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="profile-panel p-4 sm:p-5">
          <p className="text-xs text-[var(--color-text-muted)]">Preferred language</p>
          <p className="mt-2 text-lg font-semibold">{LANGUAGE_DISPLAY_NAMES[profile.preferredLanguage]}</p>
          <p className="text-xs capitalize text-[var(--color-text-muted)]">{profile.experienceLevel} experience</p>
        </div>
        <div className="profile-panel p-4 sm:p-5">
          <p className="text-xs text-[var(--color-text-muted)]">Saved workspace drafts</p>
          <p className="mt-2 text-lg font-semibold">{draftCount === null ? "Unavailable" : draftCount}</p>
          <Link href="/app/workspace" className="mt-1 inline-flex items-center gap-1 text-sm underline underline-offset-4"><DotIcon name="arrowRight" size={14} aria-hidden="true" /> Open editor</Link>
        </div>
      </div>
      <CodingActivity profileId={profile.id} />
      <div className="flex flex-wrap items-center gap-2">
        <Link className="profile-action" href="/app/challenges"><DotIcon name="list" size={16} aria-hidden="true" /> Browse problems</Link>
        <Link className="profile-action" href="/app/workspace"><DotIcon name="vscode" size={16} aria-hidden="true" /> Continue coding</Link>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">Activity reflects days with saved edits on this browser only. It is not linked to your GitHub account or a verified competition history.</p>
      <ProfileEditDialog
        isOpen={editing}
        onClose={() => setEditing(false)}
        profile={profile}
        onSave={async (updates) => { await updateProfile(profile.id, updates); }}
      />
    </div>
  );
}
