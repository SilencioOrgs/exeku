"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock, Crown } from "lucide-react";
import { DetailPageSkeleton } from "@/components/app/page-skeletons";
import { PixelAvatar } from "@/components/retro/pixel-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { fetchTournament, TOURNAMENT_REFRESH_EVENT, tournamentAction } from "@/lib/orgs/api";
import type { TournamentTeam, TournamentView } from "@/types/tournament";
import { ConfirmDialog } from "@/components/app/workspace/submission-modals";
import { TextField } from "../school/field";

const PLACES = ["1st", "2nd", "3rd"];
const MEDAL_CLASS = ["medal-gold", "medal-silver", "medal-bronze"];

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const parts = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60];
  return parts.map((n) => String(n).padStart(2, "0")).join(":");
}

function TeamCard({
  team,
  view,
  onJoin,
  busyKey,
}: {
  team: TournamentTeam;
  view: TournamentView;
  onJoin: (id: string) => void;
  busyKey: string | null;
}) {
  const slots = view.teamSize - team.members.length;
  const onPodium = team.rank !== undefined && team.rank <= 3 && team.points > 0;
  return (
    <li className="profile-panel space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {team.rank !== undefined && (
          <span className={`font-code flex items-center gap-1 text-sm font-semibold ${onPodium ? MEDAL_CLASS[team.rank - 1] : "text-[var(--color-text-muted)]"}`}>
            {onPodium && <Crown size={15} aria-hidden="true" />}{onPodium ? PLACES[team.rank - 1] : `#${team.rank}`}
          </span>
        )}
        <h3 className="min-w-0 flex-1 truncate font-semibold">{team.name}{team.id === view.myTeamId && <span className="ml-2 text-xs font-normal text-[var(--color-primary-text)]">Your team</span>}</h3>
        {team.rank !== undefined
          ? <span className="font-code text-sm">{team.points} pts · {team.solved}/{view.problems.length || "–"}</span>
          : <span className="text-xs text-[var(--color-text-muted)]">{team.members.length}/{view.teamSize} members</span>}
        {team.warnings > 0 && <span className="text-xs text-[var(--color-pink)]">{team.warnings} {team.warnings === 1 ? "warning" : "warnings"}</span>}
        {view.status === "registration" && !view.myTeamId && slots > 0 && (
          <Button
            size="sm"
            variant="outline"
            loading={busyKey === `join:${team.id}`}
            loadingText="Joining…"
            disabled={busyKey !== null}
            onClick={() => onJoin(team.id)}
          >
            Join {team.name}
          </Button>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-3">
        {team.members.map((m) => (
          <li key={m.id}>
            <Link href={`/app/friends/${encodeURIComponent(m.id)}`} className="flex items-center gap-3 rounded-lg text-sm hover:text-[var(--color-primary-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
              <PixelAvatar avatarId={m.avatarId} borderId={m.borderId} size={30} className="m-1" />{m.name}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function TournamentPage({ id }: { id: string }) {
  const [view, setView] = useState<TournamentView | null>(null);
  const [offset, setOffset] = useState(0);
  const [tick, setTick] = useState(0);
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [teamName, setTeamName] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const mounted = useRef(false);
  const loading = useRef(false);
  const loadAgain = useRef(false);
  const lastStatus = useRef<TournamentView["status"]>(undefined);

  const lastReloadAt = useRef(0);

  // One request at a time, and each reply is used. Cancelling the previous request on every tick meant a reply slower than a second never arrived.
  const load = useCallback(async () => {
    if (loading.current) { loadAgain.current = true; return; }
    loading.current = true;
    try {
      do {
        loadAgain.current = false;
        lastReloadAt.current = Date.now();
        const result = await fetchTournament(id);
        if (!mounted.current) break;
        if (!result.ok) { setLoadError(result.error ?? "We couldn't load this tournament."); continue; }
        setView(result.data);
        setOffset(Date.parse(result.data.now) - Date.now());
        setTick(Date.now());
        setLoadError(undefined);
        if (lastStatus.current && lastStatus.current !== result.data.status) window.dispatchEvent(new Event(TOURNAMENT_REFRESH_EVENT));
        lastStatus.current = result.data.status;
      } while (loadAgain.current && mounted.current);
    } finally {
      loading.current = false;
    }
  }, [id]);

  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => void load());
    return () => { mounted.current = false; };
  }, [load]);

  const status = view?.status;
  const target = view && (view.status === "registration" ? Date.parse(view.startsAt) : Date.parse(view.endsAt));

  // Counts down each second, reloads when the phase changes (throttled on failure), and refreshes every 15s while visible.
  useEffect(() => {
    if (!target || status === "ended") return;
    const timer = setInterval(() => {
      const now = Date.now();
      setTick(now);
      if (document.hidden) return;
      const elapsedSinceReload = now - lastReloadAt.current;
      if ((now + offset >= target && elapsedSinceReload >= 5000) || elapsedSinceReload >= 15_000) {
        void load();
      }
    }, 1000);
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [target, status, offset, load]);

  const back = <Link href="/app/events" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"><ArrowLeft size={14} aria-hidden="true" />All events</Link>;
  if (loadError && !view) return <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6 lg:p-8">{back}<p role="alert" className="text-sm text-[var(--color-pink)]">{loadError}</p></div>;
  if (!view || !target) return <DetailPageSkeleton label="Loading tournament…" />;

  const act = async (key: string, body: Record<string, unknown>) => {
    if (busyKey) return false;
    setBusyKey(key);
    setActionError(undefined);
    try {
      const result = await tournamentAction(id, body);
      if (result.ok) {
        await load();
        setTeamName("");
        return true;
      }
      setActionError(result.error ?? "That didn't work. Try again.");
      return false;
    } finally {
      setBusyKey(null);
    }
  };
  const createTeam = (event: FormEvent) => { event.preventDefault(); void act("createTeam", { action: "createTeam", name: teamName }); };
  const registration = view.status === "registration";
  const finished = view.status === "live" && view.problems.length > 0 && view.problems.every((p) => view.solvedProblemIds.includes(p.id));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      {back}
      <header className="profile-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0 flex-1 basis-64 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{view.title}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{view.summary}</p>
          <p className="text-xs text-[var(--color-primary-text)]">{view.accessLabel} · Teams of up to {view.teamSize}</p>
        </div>
        <div className="skeuo-recess rounded-xl px-4 py-2.5 text-right">
          <p className="flex items-center justify-end gap-1.5 text-xs text-[var(--color-text-muted)]"><Clock size={13} aria-hidden="true" />{registration ? "Starts in" : view.status === "live" ? "Ends in" : "Tournament"}</p>
          <p className="font-code text-2xl font-semibold tabular-nums" role="timer">{view.status === "ended" ? "Ended" : clock(target - (tick + offset))}</p>
        </div>
      </header>

      {actionError && <p role="alert" className="skeuo-recess rounded-xl p-3 text-sm text-[var(--color-pink)]">{actionError}</p>}

      {registration && (view.myTeamId ? (
        <section aria-label="Your registration" className="profile-panel flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm">You&apos;re registered. Problems unlock when the timer reaches zero.</p>
          <Button variant="ghost" loading={busyKey === "leave"} loadingText="Leaving…" disabled={busyKey !== null} onClick={() => setConfirmLeave(true)}>Leave team</Button>
        </section>
      ) : (
        <form onSubmit={createTeam} className="profile-panel flex items-end gap-2 p-5">
          <div className="min-w-0 flex-1"><TextField id="team-name" label="Register a new team, or join one below" placeholder="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={40} disabled={busyKey !== null} /></div>
          <Button type="submit" className="h-10 px-4" loading={busyKey === "createTeam"} loadingText="Registering…" disabled={busyKey !== null}>Register</Button>
        </form>
      ))}

      {!registration && view.problems.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Problems</h2>
          <ol className="grid gap-2 sm:grid-cols-3">
            {view.problems.map((p, i) => (
              <li key={p.id}>
                <Link href={`/app/workspace?problem=${encodeURIComponent(p.id)}&event=${encodeURIComponent(view.id)}`} className={`${buttonVariants({ variant: "outline" })} h-auto w-full justify-between gap-2 py-2`}>
                  <span className="truncate">{i + 1}. {p.title}</span>
                  {view.solvedProblemIds.includes(p.id) && <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--color-primary-text)]"><Check size={13} aria-hidden="true" />Solved</span>}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
      {finished && <p className="profile-panel p-5 text-sm">Your team solved every problem, so you&apos;re free to leave full screen. Standings appear when the timer ends.</p>}
      {view.status === "live" && !view.myTeamId && <p className="profile-panel p-5 text-sm text-[var(--color-text-muted)]">Registration has closed. Standings appear when the timer ends.</p>}

      <section className="space-y-3">
        <h2 className="font-semibold">{registration ? "Registered teams" : view.status === "live" ? "Teams" : "Standings"}</h2>
        {view.status === "live" && <p className="text-xs text-[var(--color-text-muted)]">Scores are hidden until the tournament ends.</p>}
        {view.teams.length === 0
          ? <p className="profile-panel p-5 text-sm text-[var(--color-text-muted)]">No teams yet. Be the first to register.</p>
          : <ul className="space-y-3">{view.teams.map((team) => <TeamCard key={team.id} team={team} view={view} busyKey={busyKey} onJoin={(teamId) => void act(`join:${teamId}`, { action: "joinTeam", teamId })} />)}</ul>}
      </section>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave your team?"
        description="Your spot will open for other students until registration closes."
        confirmLabel="Leave team"
        loadingLabel="Leaving…"
        loading={busyKey === "leave"}
        destructive
        onConfirm={async () => {
          await act("leave", { action: "leave" });
          setConfirmLeave(false);
        }}
      />
    </div>
  );
}
