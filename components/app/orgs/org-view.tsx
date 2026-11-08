"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { fetchOrg, orgAction } from "@/lib/orgs/api";
import { can, eventAccessLabel } from "@/lib/orgs/rules";
import type { OrgDetail } from "@/types/org";
import { SelectField } from "../school/field";

const ROLE_LABELS = { president: "President", officer: "Officer", member: "Member" };

export function OrgView({ orgId }: { orgId: string }) {
  const { profile } = useProfile();
  const [preview, setPreview] = useState("");
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [version, setVersion] = useState(0);
  const viewerId = preview || profile?.id || "";
  const campusId = preview ? undefined : profile?.account?.school.campusId;

  useEffect(() => {
    if (!viewerId) return;
    let live = true;
    void fetchOrg(orgId, viewerId, campusId).then((result) => {
      if (!live) return;
      if (result.ok) { setDetail(result.data); setLoadError(undefined); }
      else setLoadError(result.error ?? "We couldn't load this organization.");
    });
    return () => { live = false; };
  }, [orgId, viewerId, campusId, version]);

  const act = useCallback(async (body: Record<string, unknown>) => {
    const result = await orgAction(orgId, { actorId: viewerId, ...body });
    if (result.ok) setVersion((v) => v + 1);
    return result;
  }, [orgId, viewerId]);

  const run = async (body: Record<string, unknown>) => {
    setActionError(undefined);
    const result = await act(body);
    if (!result.ok) setActionError(result.error ?? "That didn't work. Try again.");
  };

  if (loadError) return <p role="alert" className="p-8 text-sm text-[var(--color-pink)]">{loadError}</p>;
  if (!detail || !profile) return <p role="status" className="p-8 text-sm text-[var(--color-text-muted)]">Loading organization…</p>;

  const { org, viewerRole, applicationStatus, members, applications, events, sample } = detail;
  const isStudent = profile.userType === "student" || Boolean(profile.account);
  const canPublish = can(viewerRole, "publish");
  const canManageOfficers = can(viewerRole, "manageOfficers");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link href="/app/orgs" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"><ArrowLeft size={14} />All organizations</Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{org.name}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{org.schoolName} · {org.campusName} · {org.programName}</p>
          {sample && <p className="text-xs text-[var(--color-text-muted)]">Sample organization for preview.</p>}
        </div>
        {sample && (
          <div className="w-56">
            <SelectField id="preview-as" label="Preview as" value={preview} onChange={(e) => { setActionError(undefined); setPreview(e.target.value); }}>
              <option value="">You ({profile.displayName})</option>
              {members.filter((m) => m.id !== profile.id).map((m) => <option key={m.id} value={m.id}>{m.name} ({ROLE_LABELS[m.role]})</option>)}
            </SelectField>
          </div>
        )}
      </header>

      {actionError && <p role="alert" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-pink)]">{actionError}</p>}

      {!viewerRole && (
        <section aria-label="Membership" className="profile-panel flex flex-wrap items-center justify-between gap-3 p-5">
          {applicationStatus === "pending" ? (
            <p className="text-sm">Your application is pending. An officer will review it.</p>
          ) : applicationStatus === "rejected" ? (
            <p className="text-sm">Your application wasn&apos;t accepted. Ask an officer if you think this is a mistake.</p>
          ) : isStudent ? (
            <>
              <p className="text-sm">Are you a member of {org.name}? Apply so an officer can confirm it.</p>
              <Button onClick={() => void run({ action: "apply", name: profile.displayName, program: profile.account?.school.program })}>Apply to join</Button>
            </>
          ) : (
            <>
              <p className="text-sm">Add your school email to apply to this organization.</p>
              <Link href="/app/profile" className={buttonVariants({ variant: "outline" })}>Go to Profile</Link>
            </>
          )}
        </section>
      )}

      {canPublish && (
        <section aria-labelledby="applications-heading" className="profile-panel space-y-3 p-5">
          <h2 id="applications-heading" className="font-semibold">Applications</h2>
          {applications.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">No pending applications.</p> : (
            <ul className="space-y-2">
              {applications.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{a.name}{a.program ? <span className="font-normal text-[var(--color-text-muted)]"> · {a.program}</span> : null}</span>
                  <span className="flex gap-2">
                    <Button size="sm" onClick={() => void run({ action: "decide", applicationId: a.id, accept: true })}>Accept {a.name}</Button>
                    <Button size="sm" variant="ghost" onClick={() => void run({ action: "decide", applicationId: a.id, accept: false })}>Decline</Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="members-heading" className="profile-panel space-y-3 p-5">
        <h2 id="members-heading" className="font-semibold">Members</h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm"><span className="font-medium">{m.name}</span> <span className="text-[var(--color-text-muted)]">· {ROLE_LABELS[m.role]}</span></span>
              {canManageOfficers && m.role !== "president" && (
                <Button size="sm" variant="outline" onClick={() => void run({ action: "setOfficer", memberId: m.id, officer: m.role !== "officer" })}>
                  {m.role === "officer" ? `Remove ${m.name} as officer` : `Make ${m.name} an officer`}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="events-heading" className="profile-panel space-y-3 p-5">
        <h2 id="events-heading" className="font-semibold">Events</h2>
        {events.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">No events yet.</p> : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 text-sm"><span className="font-medium">{e.title}</span> <span className="text-[var(--color-text-muted)]">· {eventAccessLabel(e)}</span></span>
                {e.featured ? <span className="text-xs text-[var(--color-primary-text)]">On the dashboard</span>
                  : canPublish && <Button size="sm" variant="outline" onClick={() => void run({ action: "feature", eventId: e.id })}>Show on dashboard</Button>}
              </li>
            ))}
          </ul>
        )}
        {canPublish && <Link href="/app/events" className={buttonVariants({ variant: "outline" })}>Post an event</Link>}
      </section>

    </div>
  );
}
