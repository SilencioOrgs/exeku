"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Code2, FileCode2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProfileEditDialog } from "./profile-edit-dialog";
import { getProblemSummaries } from "@/lib/problems/catalog";
import { getFilenameForLanguage } from "@/lib/workspace-defaults";
import type { LocalProfile, ProfileInput } from "@/types/profile";
import type { WorkspaceDraft } from "@/types/draft";

interface ModernOverviewProps {
  profile: LocalProfile;
  activeDraft: WorkspaceDraft | null;
  totalDrafts: number;
  onSaveProfile: (updates: Partial<ProfileInput>) => Promise<unknown>;
}

export function ModernOverview({ profile, activeDraft, totalDrafts, onSaveProfile }: ModernOverviewProps) {
  const [editing, setEditing] = useState(false);
  const problems = getProblemSummaries({}).slice(0, 3);
  const filename = getFilenameForLanguage(profile.preferredLanguage);

  return (
    <div className="modern-overview space-y-7">
      <header className="modern-page-header flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="modern-eyebrow">Your workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back, {profile.displayName}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Choose a problem or open your code editor. Keep building.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/challenges" className={buttonVariants({ variant: "default", size: "lg" })}>
            Browse problems <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link href="/app/workspace" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Open editor <Code2 aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="modern-feature-card">
          <CardHeader>
            <div className="modern-card-icon"><Code2 aria-hidden="true" className="size-5" /></div>
            <CardTitle>Practice problems</CardTitle>
            <CardDescription>Build your skills with focused exercises in Python, Java, C++, or C.</CardDescription>
          </CardHeader>
          <CardContent><Link href="/app/challenges" className="modern-card-link">Explore problems <ArrowRight aria-hidden="true" className="size-4" /></Link></CardContent>
        </Card>
        <Card className="modern-feature-card">
          <CardHeader>
            <div className="modern-card-icon"><FileCode2 aria-hidden="true" className="size-5" /></div>
            <CardTitle>Continue coding</CardTitle>
            <CardDescription>{filename} · {totalDrafts} saved {totalDrafts === 1 ? "draft" : "drafts"} on this device</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="modern-draft-preview">{activeDraft?.code?.trim() ? activeDraft.code.split("\n").slice(0, 3).join("\n") : "Your editor is ready for a new session."}</pre>
            <Link href="/app/workspace" className="modern-card-link">Open editor <ArrowRight aria-hidden="true" className="size-4" /></Link>
          </CardContent>
        </Card>
      </div>
      <section aria-label="Available programming problems" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-xl font-semibold tracking-tight">Start with a problem</h2><p className="text-sm text-muted-foreground">Exercises from the local problem catalog.</p></div>
          <Link href="/app/challenges" className="modern-card-link">View all <ArrowRight aria-hidden="true" className="size-4" /></Link>
        </div>
        <div className="grid gap-3">
          {problems.map((problem) => (
            <Link key={problem.id} href={`/app/workspace?problem=${encodeURIComponent(problem.id)}`} className="modern-problem-row">
              <span className="modern-problem-icon"><Code2 aria-hidden="true" className="size-4" /></span>
              <span className="min-w-0 flex-1"><strong className="block font-medium">{problem.title}</strong><span className="block text-xs text-muted-foreground">{problem.category}</span></span>
              <span className="modern-difficulty">{problem.difficulty}</span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          ))}
        </div>
      </section>
      <footer className="modern-footnote flex flex-wrap items-center justify-between gap-3">
        <p><ShieldAlert aria-hidden="true" className="size-4 shrink-0" /> Run and Submit require a connected sandbox. Exeku is in local developer preview.</p>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit profile</Button>
      </footer>
      <ProfileEditDialog isOpen={editing} onClose={() => setEditing(false)} profile={profile} onSave={async (updates) => { await onSaveProfile(updates); }} />
    </div>
  );
}
