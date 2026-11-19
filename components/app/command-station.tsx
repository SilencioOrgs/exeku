"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { syncProfile } from "@/lib/accounts/api";
import { draftRepository } from "@/lib/storage/draft-repository";
import type { WorkspaceDraft } from "@/types/draft";
import { ModernOverview } from "./modern-overview";
import { BrandLoader } from "@/components/brand-loader";

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

  if (!profile) return <BrandLoader label="Loading workspace…" />;

  return <ModernOverview profile={profile} activeDraft={activeDraft}
    totalDrafts={totalDrafts} onSaveProfile={async (updates) => {
      const saved = await updateProfile(profile.id, updates);
      await syncProfile(saved);
    }} />;
}
