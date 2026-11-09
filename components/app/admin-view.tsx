"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { BrandLoader } from "@/components/brand-loader";
import { Button } from "@/components/ui/button";
import { adminEventAction, fetchAdminStatus, fetchAdminUsers, fetchEventsOverview, fetchManagedProblems, resetDatabase } from "@/lib/admin/api";
import type { AdminUser, EventsOverview, ManagedProblemView } from "@/types/admin";
import { CompetitionsPanel, ProblemSetsPanel } from "./admin-events";
import { ProblemsPanel } from "./admin/problems-panel";
import { UsersPanel } from "./admin/users-panel";
import { TextField } from "./school/field";

function ResetPanel() {
  const [confirm, setConfirm] = useState("");
  const [includeAccounts, setIncludeAccounts] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);

  const reset = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await resetDatabase(confirm, includeAccounts);
    setBusy(false);
    setConfirm("");
    setMessage(result.ok ? { ok: true, text: "Done. Tournaments reopen for registration for 3 minutes." } : { ok: false, text: result.error ?? "The reset failed." });
  };

  return (
    <section aria-labelledby="reset-heading" className="space-y-3">
      <h2 id="reset-heading" className="text-lg font-semibold">Reset test data</h2>
      <form onSubmit={reset} className="profile-panel space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">Deleted</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-[var(--color-text-muted)]">
              <li>Submissions, scores and E rewards</li><li>Tournament teams and warnings</li><li>Friendships</li><li>Org applications and school requests</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Kept</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-[var(--color-text-muted)]">
              <li>Problems and problem sets</li><li>Schools, organizations and events</li><li>Student accounts, unless you tick the box below</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">Every tournament restarts with a new 3-minute registration. This can&apos;t be undone.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeAccounts} onChange={(e) => setIncludeAccounts(e.target.checked)} />Also delete student accounts (admins are kept)</label>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1"><TextField id="reset-confirm" label="Type RESET to confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></div>
          <Button type="submit" variant="destructive" className="h-10 px-4" disabled={confirm !== "RESET" || busy}>{busy ? "Resetting…" : "Reset"}</Button>
        </div>
        {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-[var(--color-primary-text)]" : "text-[var(--color-pink)]"}`}>{message.text}</p>}
      </form>
    </section>
  );
}

type TabId = "users" | "problems" | "sets" | "events" | "reset";

export function AdminView() {
  const [status, setStatus] = useState<{ isAdmin: boolean; canReset: boolean } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [created, setCreated] = useState<ManagedProblemView[]>([]);
  const [overview, setOverview] = useState<EventsOverview | null>(null);
  const [tab, setTab] = useState<TabId>("users");
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const [userResult, problemResult, overviewResult] = await Promise.all([fetchAdminUsers(), fetchManagedProblems(), fetchEventsOverview()]);
    if (userResult.ok) setUsers(userResult.data.users);
    if (problemResult.ok) setCreated(problemResult.data.problems);
    if (overviewResult.ok) setOverview(overviewResult.data);
    const failed = [userResult, problemResult, overviewResult].find((result) => !result.ok);
    setError(failed && !failed.ok ? failed.error ?? "Part of this page couldn't load. Refresh to try again." : undefined);
  }, []);

  useEffect(() => {
    void fetchAdminStatus().then((result) => {
      if (!result.ok) { setError(result.error ?? "We couldn't check your access."); return; }
      setStatus(result.data);
      if (result.data.isAdmin) void load();
    });
  }, [load]);

  const act = useCallback(async (action: string, body: Record<string, unknown>) => {
    setError(undefined);
    const result = await adminEventAction(action, body);
    if (result.ok) void load();
    else setError(result.error ?? "That didn't work. Try again.");
    return result.ok;
  }, [load]);

  if (!status) return error ? <p role="alert" className="p-8 text-sm text-[var(--color-pink)]">{error}</p> : <BrandLoader label="Loading admin…" />;
  if (!status.isAdmin) return <p role="alert" className="p-8 text-sm text-[var(--color-pink)]">Admins only.</p>;
  if (!overview) return error ? <p role="alert" className="p-8 text-sm text-[var(--color-pink)]">{error}</p> : <BrandLoader label="Loading admin…" />;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "users", label: "Users", count: users.length },
    { id: "problems", label: "Problems", count: overview.problems.length },
    { id: "sets", label: "Problem sets", count: overview.sets.length },
    { id: "events", label: "Competitions", count: overview.events.length },
    ...(status.canReset ? [{ id: "reset" as const, label: "Reset" }] : []),
  ];
  // Every section stays mounted, so a half-written problem survives a look at another section.
  const panel = (id: TabId, children: ReactNode) => <div hidden={tab !== id}>{children}</div>;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      <div role="group" aria-label="Admin sections" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tabs.map((item) => (
          <Button key={item.id} variant="outline" aria-pressed={tab === item.id} onClick={() => setTab(item.id)} className="h-auto flex-col items-start gap-0.5 px-4 py-3">
            <span className="text-xs font-normal">{item.label}</span>
            {item.count === undefined ? <span className="py-1 text-sm font-semibold">Test data</span> : <span className="font-code text-xl font-semibold">{item.count}</span>}
          </Button>
        ))}
      </div>
      {error && <p role="alert" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-pink)]">{error}</p>}
      {panel("users", <UsersPanel users={users} />)}
      {panel("problems", <ProblemsPanel problems={overview.problems} created={created} onChange={() => void load()} onError={setError} />)}
      {panel("sets", <ProblemSetsPanel data={overview} act={act} />)}
      {panel("events", <CompetitionsPanel data={overview} act={act} />)}
      {status.canReset && panel("reset", <ResetPanel />)}
    </div>
  );
}
