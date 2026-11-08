"use client";

import { Button, buttonVariants } from "@/components/ui/button";
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
        <div><h1 className="text-3xl font-semibold tracking-tight">Profile</h1></div>
        <Button type="button" variant="outline" onClick={() => setEditing(true)}>
          <DotIcon name="pencil" size={15} aria-hidden="true" />Edit profile
        </Button>
      </header>
      <section aria-label="Your profile" className="profile-panel flex flex-wrap items-center gap-4 p-5 sm:gap-6 sm:p-6">
        <PixelAvatar avatarId={profile.avatarId} size={72} className="shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="break-words text-xl font-semibold sm:text-2xl">{profile.displayName}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">{profile.bio || "Your personal coding workspace"}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Coding locally since {joined}</p>
        </div>
        <Link href="/app/settings" className={buttonVariants({ variant: "outline" })}>
          <DotIcon name="cog" size={15} aria-hidden="true" />Appearance
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
          <Link href="/app/workspace" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2" })}>Open editor</Link>
        </div>
      </div>
      <CodingActivity profileId={profile.id} />
      <div className="flex flex-wrap items-center gap-2">
        <Link className={buttonVariants()} href="/app/challenges"><DotIcon name="list" size={15} aria-hidden="true" />Browse problems</Link>
        <Link className={buttonVariants({ variant: "outline" })} href="/app/workspace"><DotIcon name="vscode" size={15} aria-hidden="true" />Continue coding</Link>
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
