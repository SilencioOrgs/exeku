"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { draftRepository } from "@/lib/storage/draft-repository";
import type { WorkspaceDraft } from "@/types/draft";
import { ModernOverview } from "./modern-overview";

export function CommandStation() {
  const { profile, updateProfile } = useProfile();
  const [activeDraft, setActiveDraft] = useState<WorkspaceDraft | null>(null);
  const [totalDrafts, setTotalDrafts] = useState(0);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    Promise.all([
      draftRepository.getDraft(profile.id, profile.preferredLanguage),
      draftRepository.getAllDraftsForProfile(profile.id),
    ]).then(([draft, drafts]) => {
      if (!active) return;
      setActiveDraft(draft);
      setTotalDrafts(drafts.length);
    }).catch(() => {
      if (active) { setActiveDraft(null); setTotalDrafts(0); }
    });
    return () => { active = false; };
  }, [profile]);

  if (!profile) return <p role="status" className="p-8 text-sm text-[var(--color-text-muted)]">Loading workspace…</p>;

  return <ModernOverview profile={profile} activeDraft={activeDraft}
    totalDrafts={totalDrafts} onSaveProfile={(updates) => updateProfile(profile.id, updates)} />;
}
