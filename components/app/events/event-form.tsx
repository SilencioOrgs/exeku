"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Calendar, Check, Loader2, Search, Trophy, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { call, type ApiResult } from "@/lib/accounts/api";
import type { FieldErrors } from "@/types/account";
import { DEFAULT_BANNER, type BannerId } from "@/lib/banners";
import type { EventAccess } from "@/types/competition";
import type { ProblemSummary } from "@/types/problem";
import { BannerPicker } from "../banner-picker";
import { SelectField, TextAreaField, TextField } from "../school/field";

const ACCESS: { id: EventAccess; label: string }[] = [
  { id: "org-only", label: "Org members only" },
  { id: "campus-only", label: "My campus only" },
  { id: "open", label: "Open to everyone" },
];

const TEAM_SIZES = [2, 3, 4, 5] as const;
const DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 90, label: "90 min" },
  { minutes: 120, label: "2 hours" },
  { minutes: 180, label: "3 hours" },
];

function defaultStartLocal(): string {
  const d = new Date(Date.now() + 15 * 60_000);
  d.setSeconds(0, 0);
  const rem = d.getMinutes() % 5;
  if (rem !== 0) d.setMinutes(d.getMinutes() + (5 - rem));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface EventFormProps {
  orgs: { id: string; name: string }[];
  today: string;
  defaultKind?: "competition" | "announcement";
  defaultAccess?: EventAccess;
  inDialog?: boolean;
  onPost: (orgId: string, body: Record<string, unknown>) => Promise<ApiResult<unknown>>;
  onDone: (meta?: { isCompetition: boolean }) => void;
  onCancel?: () => void;
}

export function EventForm({
  orgs,
  today,
  defaultKind = "competition",
  defaultAccess = "open",
  inDialog = false,
  onPost,
  onDone,
  onCancel,
}: EventFormProps) {
  const [kind, setKind] = useState<"competition" | "announcement">(defaultKind);
  const [orgId, setOrgId] = useState(orgs[0].id);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [startsOn, setStartsOn] = useState(today);
  const [startsAtLocal, setStartsAtLocal] = useState(defaultStartLocal);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [mode, setMode] = useState<"solo" | "team">("solo");
  const [teamSize, setTeamSize] = useState<number>(3);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [problemsError, setProblemsError] = useState<string>();
  const [problemSearch, setProblemSearch] = useState("");
  const [access, setAccess] = useState<EventAccess>(defaultAccess);
  const [banner, setBanner] = useState<BannerId>(DEFAULT_BANNER);
  const [featured, setFeatured] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const isCompetition = kind === "competition";

  useEffect(() => {
    if (!isCompetition || problems !== null) return;
    let live = true;
    void call<{ problems: ProblemSummary[] }>("/api/problems").then((res) => {
      if (!live) return;
      if (res.ok) {
        setProblems(res.data.problems);
        setProblemsError(undefined);
      } else {
        setProblems([]);
        setProblemsError(res.error ?? "Couldn't load problems.");
      }
    });
    return () => { live = false; };
  }, [isCompetition, problems]);

  const filteredProblems = useMemo(() => {
    if (!problems) return [];
    const q = problemSearch.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter(
      (p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.difficulty.toLowerCase().includes(q),
    );
  }, [problems, problemSearch]);

  const clearError = (key: string) =>
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  const toggleProblem = (id: string) => {
    clearError("problemIds");
    setSelectedProblems((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 10) return prev;
      return [...prev, id];
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFormError(undefined);

    const payload: Record<string, unknown> = {
      action: "createEvent",
      title,
      summary,
      access,
      banner,
      featured,
      isCompetition,
    };

    if (isCompetition) {
      const startMs = Date.parse(startsAtLocal);
      payload.mode = mode;
      payload.teamSize = mode === "solo" ? 1 : teamSize;
      payload.startsAt = Number.isNaN(startMs) ? "" : new Date(startMs).toISOString();
      payload.endsAt = Number.isNaN(startMs) ? "" : new Date(startMs + durationMinutes * 60_000).toISOString();
      payload.problemIds = selectedProblems;
    } else {
      payload.startsOn = startsOn;
    }

    const result = await onPost(orgId, payload);
    setBusy(false);
    if (result.ok) return onDone({ isCompetition });
    setErrors(result.fieldErrors ?? {});
    setFormError(result.error);
  };

  return (
    <form className={inDialog ? "space-y-4" : "skeuo-panel space-y-4 p-5"} noValidate onSubmit={submit}>
      {!inDialog && <h2 className="font-semibold">Post an event</h2>}

      <div role="group" aria-label="Event type" className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          aria-pressed={isCompetition}
          disabled={busy}
          onClick={() => setKind("competition")}
          className="h-auto justify-start gap-2.5 px-3 py-2.5 text-left"
        >
          <Trophy size={16} aria-hidden="true" className="shrink-0 text-[var(--color-primary-text)]" />
          <span className="min-w-0">
            <span className="block text-xs font-semibold">Timed competition</span>
            <span className="block truncate text-[11px] font-normal text-[var(--color-text-muted)]">Solo or team contest with problems</span>
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-pressed={!isCompetition}
          disabled={busy}
          onClick={() => setKind("announcement")}
          className="h-auto justify-start gap-2.5 px-3 py-2.5 text-left"
        >
          <Calendar size={16} aria-hidden="true" className="shrink-0 text-[var(--color-text-muted)]" />
          <span className="min-w-0">
            <span className="block text-xs font-semibold">Announcement</span>
            <span className="block truncate text-[11px] font-normal text-[var(--color-text-muted)]">Simple dated org event</span>
          </span>
        </Button>
      </div>

      {orgs.length > 1 && (
        <SelectField id="event-org" label="Organization" value={orgId} disabled={busy} onChange={(e) => setOrgId(e.target.value)}>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </SelectField>
      )}

      {isCompetition ? (
        <TextField
          id="event-title"
          label="Competition title"
          placeholder="Weekly Algorithm Sprint"
          value={title}
          error={errors.title}
          maxLength={120}
          autoFocus
          disabled={busy}
          onChange={(e) => { setTitle(e.target.value); clearError("title"); }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
          <TextField
            id="event-title"
            label="Event title"
            value={title}
            error={errors.title}
            maxLength={120}
            autoFocus
            disabled={busy}
            onChange={(e) => { setTitle(e.target.value); clearError("title"); }}
          />
          <TextField
            id="event-date"
            label="Date"
            type="date"
            min={today}
            value={startsOn}
            error={errors.startsOn}
            disabled={busy}
            onChange={(e) => { setStartsOn(e.target.value); clearError("startsOn"); }}
          />
        </div>
      )}

      <TextAreaField
        id="event-summary"
        label="Summary"
        placeholder={isCompetition ? "Describe the rules, topics, and prizes." : "What should members know about this event?"}
        rows={2}
        value={summary}
        error={errors.summary}
        maxLength={300}
        disabled={busy}
        onChange={(e) => { setSummary(e.target.value); clearError("summary"); }}
      />

      {isCompetition && (
        <div className="skeuo-recess space-y-4 rounded-xl p-4">
          {/* Solo vs Team */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-[var(--color-text-main)]">Participation mode</span>
            <div role="group" aria-label="Participation mode" className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={mode === "solo"}
                disabled={busy}
                onClick={() => { setMode("solo"); clearError("teamSize"); }}
              >
                <User size={14} aria-hidden="true" /> Solo (1 player)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={mode === "team"}
                disabled={busy}
                onClick={() => { setMode("team"); clearError("teamSize"); }}
              >
                <Users size={14} aria-hidden="true" /> Team
              </Button>

              {mode === "team" && (
                <div className="flex flex-wrap items-center gap-1.5 pl-1">
                  <span className="text-xs text-[var(--color-text-muted)]">Max size:</span>
                  {TEAM_SIZES.map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant="outline"
                      size="xs"
                      aria-pressed={teamSize === size}
                      disabled={busy}
                      onClick={() => { setTeamSize(size); clearError("teamSize"); }}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {errors.teamSize && <p className="text-xs text-[var(--color-pink)]">{errors.teamSize}</p>}
          </div>

          {/* Start time & duration */}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="competition-start"
              label="Starts at (registration closes then)"
              type="datetime-local"
              value={startsAtLocal}
              error={errors.startsAt}
              disabled={busy}
              onChange={(e) => { setStartsAtLocal(e.target.value); clearError("startsAt"); clearError("endsAt"); }}
            />
            <div className="space-y-1.5">
              <span className="block text-xs text-[var(--color-text-muted)]">Duration</span>
              <div role="group" aria-label="Competition duration" className="flex flex-wrap gap-1.5 pt-0.5">
                {DURATIONS.map((d) => (
                  <Button
                    key={d.minutes}
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={durationMinutes === d.minutes}
                    disabled={busy}
                    onClick={() => { setDurationMinutes(d.minutes); clearError("endsAt"); }}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
              {errors.endsAt && <p className="text-xs text-[var(--color-pink)]">{errors.endsAt}</p>}
            </div>
          </div>

          {/* Problem picker */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--color-text-main)]">
                Problems ({selectedProblems.length}/10 selected)
              </span>
              <div className="relative w-full sm:w-52">
                <Search size={13} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <Input
                  type="search"
                  placeholder="Filter problems…"
                  value={problemSearch}
                  disabled={busy}
                  onChange={(e) => setProblemSearch(e.target.value)}
                  className="skeuo-well h-8 pl-8 text-xs"
                />
              </div>
            </div>

            {problems === null ? (
              <p className="flex items-center gap-2 py-3 text-xs text-[var(--color-text-muted)]">
                <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading problems…
              </p>
            ) : problemsError ? (
              <p role="alert" className="text-xs text-[var(--color-pink)]">{problemsError}</p>
            ) : filteredProblems.length === 0 ? (
              <p className="py-2 text-xs text-[var(--color-text-muted)]">No matching problems found.</p>
            ) : (
              <ul className="skeuo-well max-h-44 space-y-1 overflow-y-auto rounded-lg p-2">
                {filteredProblems.map((p) => {
                  const checked = selectedProblems.includes(p.id);
                  const limitReached = !checked && selectedProblems.length >= 10;
                  return (
                    <li key={p.id}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy || limitReached}
                        aria-pressed={checked}
                        onClick={() => toggleProblem(p.id)}
                        className={`h-auto w-full justify-between gap-2 px-2.5 py-1.5 text-left text-xs ${
                          checked
                            ? "bg-[color-mix(in_srgb,var(--color-primary)_16%,var(--color-canvas))] text-[var(--color-text-main)]"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`grid size-4 shrink-0 place-items-center rounded border ${checked ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--primary-foreground)]" : "border-[var(--color-border)]"}`}>
                            {checked && <Check size={11} aria-hidden="true" />}
                          </span>
                          <span className="truncate font-medium">{p.title}</span>
                        </span>
                        <span className="shrink-0 font-code text-[11px] capitalize text-[var(--color-text-muted)]">{p.difficulty}</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {errors.problemIds && <p className="text-xs text-[var(--color-pink)]">{errors.problemIds}</p>}
          </div>
        </div>
      )}

      <div role="group" aria-label="Who can compete" className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">Who can compete</span>
        {ACCESS.map((a) => (
          <Button key={a.id} type="button" variant="outline" size="sm" aria-pressed={access === a.id} disabled={busy} onClick={() => setAccess(a.id)}>
            {a.label}
          </Button>
        ))}
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-[var(--color-text-muted)]">Banner</span>
        <BannerPicker value={banner} onChange={setBanner} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={featured} disabled={busy} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
          Show on the dashboard
        </label>
        <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Bell size={13} aria-hidden="true" className="text-[var(--color-primary-text)]" />
          Members will be notified automatically.
        </p>
      </div>

      {formError && <p role="alert" className="text-xs text-[var(--color-pink)]">{formError}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel ?? (() => onDone())} disabled={busy}>Cancel</Button>
        <Button type="submit" loading={busy} loadingText="Posting…">
          {isCompetition ? "Post competition" : "Post event"}
        </Button>
      </div>
    </form>
  );
}
