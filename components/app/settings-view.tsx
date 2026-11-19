"use client";

import { AppearanceStudio } from "./appearance-studio";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { PixelCard } from "@/components/retro/pixel-card";
import { Button } from "@/components/ui/button";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { X } from "lucide-react";
import { ProfileResetDialog } from "./profile-reset-dialog";
import { draftRepository } from "@/lib/storage/draft-repository";
import { BrandLoader } from "@/components/brand-loader";

export function SettingsView() {
  const router = useRouter();
  const { profile, resetProfile } = useProfile();
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [draftsCount, setDraftsCount] = useState<number>(0);

  useEffect(() => {
    if (!profile) return;
    let isCancelled = false;

    async function loadDraftsCount() {
      try {
        if (!profile) return;
        const all = await draftRepository.getAllDraftsForProfile(profile.id);
        if (!isCancelled) {
          setDraftsCount(all.length);
        }
      } catch {
        // Fall back gracefully
      }
    }

    loadDraftsCount();
    return () => {
      isCancelled = true;
    };
  }, [profile]);

  if (!profile) {
    return <BrandLoader label="Loading settings…" />;
  }

  return (
    <div className="settings-page space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Customize your workspace.
          </p>
        </div>
      </div>

      <AppearanceStudio />

      {/* Advanced details remain available without overwhelming regular settings. */}
      <details className="settings-advanced">
        <summary>Advanced device settings <span>Local storage and reset</span></summary>
      {/* Storage Health & Locality Panel */}
      <PixelCard variant="default" className="p-5 sm:p-6 border border-[var(--color-border)] space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="font-semibold">Device storage</h2>
            <p className="text-xs text-[var(--color-text-dim)]">
              Browser-side IndexedDB stores for workspace drafts and local preferences.
            </p>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">IndexedDB</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--color-text-dim)] text-xs">Database target</span>
            <div className="font-code text-foreground font-bold">exeku_local_v1</div>
            <span className="text-[var(--color-primary-text)] text-xs">Version 2 (Active)</span>
          </div>

          <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--color-text-dim)] text-xs">Profile store</span>
            <div className="font-code text-foreground font-bold">profiles</div>
            <span className="text-[var(--color-text-muted)] text-xs">1 record mounted</span>
          </div>

          <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--color-text-dim)] text-xs">Drafts store</span>
            <div className="font-code text-foreground font-bold">drafts</div>
            <span className="text-[var(--color-accent)] text-xs">
              {draftsCount} language buffer{draftsCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1">
            <span className="text-[var(--color-text-dim)] text-xs">Account sync</span>
            <div className="text-foreground font-bold">Google &amp; server</div>
            <span className="text-[var(--color-text-dim)] text-xs">Drafts stay on this device</span>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="p-3.5 bg-[var(--color-canvas)]/60 border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] leading-relaxed">
          <strong>Storage notes:</strong> Your Google sign-in, profile details, submissions, and tournament
          standings are synced with the Exeku server. Unsubmitted editor drafts and appearance preferences
          are saved locally in this browser&apos;s IndexedDB.
        </div>
      </PixelCard>

      {/* Danger Zone: Machine Reset */}
      <PixelCard
        variant="elevated"
        className="p-5 sm:p-6 border border-[var(--color-pink)]/60 bg-[var(--color-surface)] space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-pink)]/40 pb-3">
          <div>
            <h2 className="font-semibold text-[var(--color-pink)]">Reset local data</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Permanently wipe local profile records and workspace drafts from this browser.
            </p>
          </div>
          <PixelBadge variant="pink">Destructive</PixelBadge>
        </div>

        <div className="flex flex-wrap flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-text-muted)] max-w-xl leading-relaxed">
            Resetting your local profile permanently erases your cached profile settings
            and all saved code scratchpads from IndexedDB on this device, then returns you to setup.
          </p>
          <Button type="button" variant="destructive" onClick={() => setIsResetOpen(true)} className="w-full sm:w-auto shrink-0">
            Reset local profile <X size={14} aria-hidden="true" />
          </Button>
        </div>
      </PixelCard>

      </details>

      {/* Reset Profile Dialog */}
      <ProfileResetDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
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
