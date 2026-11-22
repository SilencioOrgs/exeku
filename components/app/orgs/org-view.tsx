"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock3,
  Crown,
  GraduationCap,
  Loader2,
  Send,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { DetailPageSkeleton } from "@/components/app/page-skeletons";
import { ConfirmDialog } from "@/components/app/workspace/submission-modals";
import { Button, buttonVariants } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { fetchOrg, orgAction } from "@/lib/orgs/api";
import { can, eventAccessLabel } from "@/lib/orgs/rules";
import type { OrgDetail } from "@/types/org";
import { ApplyOrgDialog } from "./apply-org-dialog";

const ROLE_LABELS = { president: "President", officer: "Officer", member: "Member" };

export function OrgView({ orgId }: { orgId: string }) {
  const { profile } = useProfile();
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [pendingDecline, setPendingDecline] = useState<{ id: string; name: string } | null>(null);
  const [version, setVersion] = useState(0);
  const campusId = profile?.account?.school.campusId;

  useEffect(() => {
    let live = true;
    void fetchOrg(orgId).then((result) => {
      if (!live) return;
      if (result.ok) { setDetail(result.data); setLoadError(undefined); }
      else setLoadError(result.error ?? "We couldn't load this organization.");
    });
    return () => { live = false; };
  }, [orgId, campusId, version]);

  const act = useCallback(async (key: string, body: Record<string, unknown>, okMessage?: string) => {
    setBusyKey(key);
    setActionError(undefined);
    setNotice(undefined);
    try {
      const result = await orgAction(orgId, body);
      if (result.ok) {
        if (okMessage) setNotice(okMessage);
        setVersion((v) => v + 1);
      } else {
        setActionError(result.error ?? "That didn't work. Try again.");
      }
      return result;
    } finally {
      setBusyKey(null);
    }
  }, [orgId]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-8">
        <p role="alert" className="text-sm text-[var(--color-pink)]">{loadError}</p>
        <Link href="/app/orgs" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft size={14} aria-hidden="true" /> All organizations
        </Link>
      </div>
    );
  }
  if (!detail || !profile) return <DetailPageSkeleton label="Loading organization…" maxWidth="max-w-5xl" />;

  const { org, viewerRole, applicationStatus, members, applications, events } = detail;
  const isStudent = profile.userType === "student" || Boolean(profile.account);
  const canPublish = can(viewerRole, "publish");
  const canManageOfficers = can(viewerRole, "manageOfficers");
  const anyBusy = busyKey !== null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link href="/app/orgs" className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
        <ArrowLeft size={14} aria-hidden="true" /> All organizations
      </Link>

      {/* Engaging Org Hero */}
      <header className="skeuo-panel space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{org.name}</h1>
              {viewerRole && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-easy-bg)] px-2.5 py-0.5 font-code text-xs text-[var(--color-mint)]">
                  <CheckCircle2 size={12} aria-hidden="true" /> {ROLE_LABELS[viewerRole]}
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {org.schoolName} · {org.campusName} · {org.programName}
            </p>
          </div>

          {!viewerRole && isStudent && applicationStatus === "none" && (
            <Button type="button" onClick={() => setApplyOpen(true)}>
              <Send size={14} aria-hidden="true" /> Apply to join
            </Button>
          )}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="skeuo-well rounded-xl border px-3.5 py-2.5">
            <p className="text-[11px] text-[var(--color-text-muted)]">Members</p>
            <p className="font-code mt-0.5 text-lg font-semibold">{members.length}</p>
          </div>
          <div className="skeuo-well rounded-xl border px-3.5 py-2.5">
            <p className="text-[11px] text-[var(--color-text-muted)]">Events</p>
            <p className="font-code mt-0.5 text-lg font-semibold">{events.length}</p>
          </div>
          <div className="skeuo-well rounded-xl border px-3.5 py-2.5">
            <p className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
              <Crown size={11} className="text-[var(--color-primary-text)]" aria-hidden="true" /> President
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">{org.presidentName ?? "Unassigned"}</p>
          </div>
          <div className="skeuo-well rounded-xl border px-3.5 py-2.5">
            <p className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
              <GraduationCap size={11} className="text-[var(--color-mint)]" aria-hidden="true" /> Adviser
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">{org.adviserName ?? "Unassigned"}</p>
          </div>
        </div>
      </header>

      {actionError && <p role="alert" className="skeuo-recess rounded-xl p-3.5 text-sm text-[var(--color-pink)]">{actionError}</p>}
      {notice && <p role="status" className="skeuo-recess rounded-xl p-3.5 text-sm text-[var(--color-mint)]">{notice}</p>}

      {/* Membership Action Banner */}
      {!viewerRole && (
        <section aria-label="Membership" className="skeuo-panel flex flex-wrap items-center justify-between gap-3 p-5">
          {applicationStatus === "pending" ? (
            <>
              <div className="flex items-center gap-2.5 text-sm">
                <Clock3 size={16} className="shrink-0 text-[var(--color-primary-text)]" aria-hidden="true" />
                <span>Your application is pending review by an officer or admin.</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={anyBusy}
                onClick={() => void act("cancel", { action: "cancelApplication" }, "Cancelled your pending application.")}
              >
                {busyKey === "cancel" ? (
                  <>
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Cancelling…
                  </>
                ) : (
                  <>
                    <X size={13} aria-hidden="true" /> Cancel application
                  </>
                )}
              </Button>
            </>
          ) : applicationStatus === "rejected" ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Your application wasn&apos;t accepted. Reach out to an officer if you think this was a mistake.
            </p>
          ) : isStudent ? (
            <>
              <p className="text-sm">Are you part of {org.name}? Submit an application so an officer can confirm your membership.</p>
              <Button type="button" onClick={() => setApplyOpen(true)}>
                <Send size={14} aria-hidden="true" /> Apply to join
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm">Add and verify your school email on Profile to apply to this organization.</p>
              <Link href="/app/profile" className={buttonVariants({ variant: "outline" })}>Go to Profile</Link>
            </>
          )}
        </section>
      )}

      {/* Officer Application Review Queue */}
      {canPublish && (
        <section aria-labelledby="applications-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 id="applications-heading" className="text-lg font-semibold">Pending applications ({applications.length})</h2>
          </div>
          {applications.length === 0 ? (
            <p className="skeuo-well rounded-xl border p-4 text-sm text-[var(--color-text-muted)]">No pending applications right now.</p>
          ) : (
            <ul className="space-y-2.5">
              {applications.map((a) => {
                const acceptKey = `accept:${a.id}`;
                const declineKey = `decline:${a.id}`;
                return (
                  <li key={a.id} className="skeuo-recess flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{a.name}</p>
                      {a.program && <p className="text-xs text-[var(--color-text-muted)]">{a.program}</p>}
                    </div>
                    <span className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={anyBusy}
                        onClick={() => void act(acceptKey, { action: "decide", applicationId: a.id, accept: true }, `Accepted ${a.name} into ${org.name}.`)}
                      >
                        {busyKey === acceptKey ? (
                          <>
                            <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Accepting…
                          </>
                        ) : (
                          <>
                            <Check size={13} aria-hidden="true" /> Accept
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={anyBusy}
                        onClick={() => setPendingDecline({ id: a.id, name: a.name })}
                      >
                        {busyKey === declineKey ? (
                          <>
                            <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Declining…
                          </>
                        ) : (
                          <>
                            <X size={13} aria-hidden="true" /> Decline
                          </>
                        )}
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Members */}
        <section aria-labelledby="members-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Users size={17} className="text-[var(--color-primary-text)]" aria-hidden="true" />
            <h2 id="members-heading" className="text-lg font-semibold">Members ({members.length})</h2>
          </div>
          {members.length === 0 ? (
            <p className="skeuo-well rounded-xl border p-4 text-sm text-[var(--color-text-muted)]">No members listed yet.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => {
                const officerKey = `officer:${m.id}`;
                return (
                  <li key={m.id} className="skeuo-recess flex flex-wrap items-center justify-between gap-2 rounded-xl px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">{m.name}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-code text-[11px] ${
                          m.role === "president"
                            ? "bg-[var(--color-medium-bg)] text-[var(--color-primary-text)]"
                            : m.role === "officer"
                              ? "bg-[var(--color-easy-bg)] text-[var(--color-mint)]"
                              : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {m.role === "president" && <Crown size={11} aria-hidden="true" />}
                        {m.role === "officer" && <Shield size={11} aria-hidden="true" />}
                        {ROLE_LABELS[m.role]}
                      </span>
                    </div>
                    {canManageOfficers && m.role !== "president" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={anyBusy}
                        onClick={() =>
                          void act(
                            officerKey,
                            { action: "setOfficer", memberId: m.id, officer: m.role !== "officer" },
                            m.role === "officer" ? `Removed ${m.name} as officer.` : `Promoted ${m.name} to officer.`,
                          )
                        }
                      >
                        {busyKey === officerKey ? (
                          <>
                            <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Updating…
                          </>
                        ) : m.role === "officer" ? (
                          "Remove officer"
                        ) : (
                          "Make officer"
                        )}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Events */}
        <section aria-labelledby="events-heading" className="skeuo-panel space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={17} className="text-[var(--color-primary-text)]" aria-hidden="true" />
              <h2 id="events-heading" className="text-lg font-semibold">Events ({events.length})</h2>
            </div>
            {canPublish && (
              <Link href="/app/events" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Post an event
              </Link>
            )}
          </div>

          {events.length === 0 ? (
            <p className="skeuo-well rounded-xl border p-4 text-sm text-[var(--color-text-muted)]">No events posted yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {events.map((e) => {
                const featKey = `feature:${e.id}`;
                return (
                  <li key={e.id} className="skeuo-recess flex flex-wrap items-center justify-between gap-2 rounded-xl px-3.5 py-3">
                    <Link href={`/app/events/${e.id}`} className="min-w-0 flex-1 hover:text-[var(--color-primary-text)]">
                      <p className="truncate text-sm font-semibold">{e.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{eventAccessLabel(e)}</p>
                    </Link>
                    {e.featured ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-medium-bg)] px-2 py-0.5 font-code text-[11px] text-[var(--color-primary-text)]">
                        <Sparkles size={11} aria-hidden="true" /> Featured
                      </span>
                    ) : canPublish ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={anyBusy}
                        onClick={() => void act(featKey, { action: "feature", eventId: e.id }, `Featured ${e.title} on the dashboard.`)}
                      >
                        {busyKey === featKey ? (
                          <>
                            <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Updating…
                          </>
                        ) : (
                          "Feature"
                        )}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ApplyOrgDialog
        key={applyOpen ? org.id : "closed"}
        org={applyOpen ? org : null}
        defaultProgram={profile.account?.school.program}
        onClose={() => setApplyOpen(false)}
        onApplied={() => {
          setNotice(`Application sent to ${org.name}.`);
          setVersion((v) => v + 1);
        }}
      />

      <ConfirmDialog
        open={pendingDecline !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDecline(null);
        }}
        title={`Decline ${pendingDecline?.name ?? "applicant"}?`}
        description="They will be notified that their application was declined."
        confirmLabel="Decline application"
        destructive
        onConfirm={() => {
          const target = pendingDecline;
          setPendingDecline(null);
          if (target) {
            void act(`decline:${target.id}`, { action: "decide", applicationId: target.id, accept: false }, `Declined ${target.name}'s application.`);
          }
        }}
      />
    </div>
  );
}
