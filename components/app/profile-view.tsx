"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useProfile } from "@/hooks/use-profile";
import { draftRepository } from "@/lib/storage/draft-repository";
import { BadgeCheck, CloudUpload, Globe, GraduationCap, LogOut, Pencil, Settings } from "lucide-react";
import { fetchAccountSnapshot, syncProfile } from "@/lib/accounts/api";
import { hasUnsyncedLocalDetails, restoreUpdates } from "@/lib/accounts/restore";
import { fetchFacultyStatus } from "@/lib/roles/api";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import { githubUrl, linkedinUrl } from "@/lib/social-links";
import type { FacultyStatusPayload } from "@/types/roles";
import { GithubIcon, LinkedinIcon } from "./brand-icons";
import { CodingActivity } from "./coding-activity";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { ConfirmDialog } from "./workspace/submission-modals";
import { SchoolEmailSection } from "./school/school-email-section";
import { FacultyVerificationSection } from "./school/faculty-verification-section";
import { LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import { PageSkeleton } from "@/components/app/page-skeletons";

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SocialLink({ icon, label, handle, text, href }: { icon: ReactNode; label: string; handle?: string; text?: string; href: string }) {
  return (
    <div className="skeuo-recess flex min-w-0 items-center gap-3 rounded-xl px-3.5 py-2.5">
      <span className="text-[var(--color-text-main)]">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        {handle || text ? (
          <a href={href} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline">{text ?? `@${handle}`}</a>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">Not set</p>
        )}
      </div>
    </div>
  );
}

export function Readout({ label, value, capitalize }: { label: string; value: ReactNode; capitalize?: boolean }) {
  return (
    <div className="skeuo-recess min-w-0 rounded-xl px-3.5 py-2.5">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className={`truncate text-sm font-semibold ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

export function ProfileView() {
  const { profile, updateProfile, signOut } = useProfile();
  const clerk = useClerk();
  const router = useRouter();
  const { isTimedActive } = useChallengeSession();
  const [editing, setEditing] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [draftCount, setDraftCount] = useState<number | null>(null);
  const [facultyStatus, setFacultyStatus] = useState<FacultyStatusPayload | null>(null);
  const [needsCloudSync, setNeedsCloudSync] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const profileRef = useRef(profile);
  const profileId = profile?.id;

  useEffect(() => { profileRef.current = profile; });

  useEffect(() => {
    let active = true;
    if (profileId) {
      draftRepository.getAllDraftsForProfile(profileId)
        .then((drafts) => { if (active) setDraftCount(drafts.length); })
        .catch(() => { if (active) setDraftCount(null); });
      void fetchFacultyStatus().then((res) => {
        if (active && res.ok) setFacultyStatus(res.data);
      });
      void fetchAccountSnapshot().then(async (res) => {
        const current = profileRef.current;
        if (!active || !res.ok || !current || current.id !== profileId) return;
        const updates = restoreUpdates(current, res.data);
        const merged = updates ? await updateProfile(profileId, updates).catch(() => current) : current;
        if (active) setNeedsCloudSync(hasUnsyncedLocalDetails(merged, res.data));
      });
    }
    return () => { active = false; };
  }, [profileId, updateProfile]);

  if (!profile) return <PageSkeleton label="Loading your profile…" />;

  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const github = profile.socialLinks?.github;
  const linkedin = profile.socialLinks?.linkedin;
  const website = profile.socialLinks?.website;
  const role = facultyStatus?.role ?? "student";
  const isTeacher = role === "teacher";
  const isAdmin = role === "admin";
  const isVerifiedStudent = Boolean(profile.account?.verified);
  const isPendingFaculty = facultyStatus?.request?.status === "pending";
  const logOut = async () => {
    await clerk.signOut();
    signOut();
    router.push("/");
  };

  const handleSyncToAccount = async () => {
    setSyncingCloud(true);
    setSyncError(null);
    const res = await syncProfile(profile);
    setSyncingCloud(false);
    if (!res.ok) {
      setSyncError(res.error || "Could not sync your profile to your account. Try again.");
      return;
    }
    setNeedsCloudSync(false);
  };

  return (
    <div className="profile-view mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
          {isTeacher && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-primary-edge)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary-text)]">
              <GraduationCap size={14} aria-hidden="true" /> Teacher account
            </span>
          )}
          {isAdmin && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-easy-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-mint)]">
              <BadgeCheck size={14} aria-hidden="true" /> Administrator
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            <Pencil size={15} aria-hidden="true" />Edit profile
          </Button>
          <Link href="/app/settings" className={buttonVariants({ variant: "outline" })}>
            <Settings size={15} aria-hidden="true" />Appearance
          </Link>
          <Button type="button" variant="outline" onClick={() => setConfirmingLogout(true)} disabled={isTimedActive} title={isTimedActive ? "Finish your timed challenge before logging out" : undefined}>
            <LogOut size={15} aria-hidden="true" />Log out
          </Button>
        </div>
      </header>

      {needsCloudSync && (
        <div className="skeuo-card flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] p-3.5 text-sm">
          <div className="space-y-0.5">
            <p className="font-medium text-[var(--color-text-main)]">Your profile details on this browser are not synced to your account yet.</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {syncError ?? "Sync once so they show up on your other devices."}
            </p>
          </div>
          <Button type="button" size="sm" onClick={() => void handleSyncToAccount()} loading={syncingCloud} loadingText="Syncing…">
            <CloudUpload size={14} aria-hidden="true" /> Sync to account
          </Button>
        </div>
      )}

      <SchoolEmailSection
        profile={profile}
        facultyStatus={facultyStatus}
        onSave={async (account) => { await updateProfile(profile.id, { account, userType: "student" }); }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">{profile.displayName}</h2>
          {isTeacher && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-easy-bg)] px-2 py-0.5 font-code text-xs text-[var(--color-mint)]">
              <BadgeCheck size={12} aria-hidden="true" /> Verified Teacher
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{profile.bio || (isTeacher ? "Exeku instructor workspace" : "Your personal coding workspace")}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Coding locally since {joined}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SocialLink icon={<GithubIcon />} label="GitHub" handle={github} href={github ? githubUrl(github) : ""} />
          <SocialLink icon={<LinkedinIcon />} label="LinkedIn" handle={linkedin} href={linkedin ? linkedinUrl(linkedin) : ""} />
          <SocialLink icon={<Globe size={18} aria-hidden="true" />} label="Portfolio" text={website ? hostOf(website) : undefined} href={website ?? ""} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Readout label="Account role" value={isTeacher ? "Teacher" : isAdmin ? "Admin" : isPendingFaculty ? "Faculty (pending)" : "Student"} />
          <Readout label="Language" value={LANGUAGE_DISPLAY_NAMES[profile.preferredLanguage]} />
          <Readout label="Saved drafts" value={draftCount === null ? "Unavailable" : draftCount} />
        </div>
      </SchoolEmailSection>

      {!isTeacher && !isAdmin && !isVerifiedStudent && (
        <FacultyVerificationSection profile={profile} onStatusChange={setFacultyStatus} />
      )}

      <CodingActivity profileId={profile.id} />
      <p className="text-xs text-[var(--color-text-muted)]">Activity reflects days with saved edits on this browser only. It is not linked to your GitHub account or a verified competition history.</p>
      <ConfirmDialog
        open={confirmingLogout}
        onOpenChange={setConfirmingLogout}
        title="Log out of Exeku?"
        description="Your saved code stays on this browser. You can sign back in with Google anytime."
        confirmLabel="Log out"
        onConfirm={() => { setConfirmingLogout(false); void logOut(); }}
      />
      <ProfileEditDialog
        isOpen={editing}
        onClose={() => setEditing(false)}
        profile={profile}
        onSave={async (updates) => {
          const saved = await updateProfile(profile.id, updates);
          const synced = await syncProfile(saved);
          if (!synced.ok) {
            setNeedsCloudSync(true);
            throw new Error(synced.error || "Saved on this browser, but couldn't sync to your account. Try again.");
          }
          setNeedsCloudSync(false);
        }}
      />
    </div>
  );
}
