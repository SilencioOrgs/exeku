"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useProfile } from "@/hooks/use-profile";
import { draftRepository } from "@/lib/storage/draft-repository";
import { Globe, LogOut, Pencil, Settings } from "lucide-react";
import { syncProfile } from "@/lib/accounts/api";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import { githubUrl, linkedinUrl } from "@/lib/social-links";
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

  useEffect(() => {
    let active = true;
    if (profile) {
      draftRepository.getAllDraftsForProfile(profile.id)
        .then((drafts) => { if (active) setDraftCount(drafts.length); })
        .catch(() => { if (active) setDraftCount(null); });
    }
    return () => { active = false; };
  }, [profile]);

  if (!profile) return <PageSkeleton label="Loading your profile…" />;

  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const github = profile.socialLinks?.github;
  const linkedin = profile.socialLinks?.linkedin;
  const website = profile.socialLinks?.website;
  const logOut = async () => {
    await clerk.signOut();
    signOut();
    router.push("/");
  };

  return (
    <div className="profile-view mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
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

      <SchoolEmailSection profile={profile} onSave={async (account) => { await updateProfile(profile.id, { account, userType: "student" }); }}>
        <h2 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">{profile.displayName}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{profile.bio || "Your personal coding workspace"}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Coding locally since {joined}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SocialLink icon={<GithubIcon />} label="GitHub" handle={github} href={github ? githubUrl(github) : ""} />
          <SocialLink icon={<LinkedinIcon />} label="LinkedIn" handle={linkedin} href={linkedin ? linkedinUrl(linkedin) : ""} />
          <SocialLink icon={<Globe size={18} aria-hidden="true" />} label="Portfolio" text={website ? hostOf(website) : undefined} href={website ?? ""} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Readout label="Language" value={LANGUAGE_DISPLAY_NAMES[profile.preferredLanguage]} />
          <Readout label="Experience" value={profile.experienceLevel} capitalize />
          <Readout label="Saved drafts" value={draftCount === null ? "Unavailable" : draftCount} />
        </div>
      </SchoolEmailSection>

      <FacultyVerificationSection profile={profile} />

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
          await syncProfile(saved);
        }}
      />
    </div>
  );
}
