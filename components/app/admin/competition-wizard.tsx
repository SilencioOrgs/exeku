"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkCompetition } from "@/lib/admin/rules";
import type { FieldErrors } from "@/types/account";
import type { EventsOverview } from "@/types/admin";
import { DifficultyBadge } from "../difficulty-badge";
import { TextField } from "../school/field";
import { ReviewRow } from "./problem-wizard";
import { WizardSteps } from "./wizard-steps";

const STEPS = [
  { title: "Details", hint: "Name the competition and set when it runs.", fields: ["title", "schedule", "teamSize"] },
  { title: "Who can join", hint: "Only students at these campuses or in these organizations will see it.", fields: ["audience"] },
  { title: "Problems", hint: "Pick the problems, or start from a saved set. Students get them in this order.", fields: ["problemIds"] },
  { title: "Review", hint: "Check everything before you create it.", fields: [] as string[] },
];

const toLocalInput = (ms: number) => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
const ERROR = "text-sm text-[var(--color-pink)]";

export function CompetitionWizard({ data, onCreate, onCancel }: { data: EventsOverview; onCreate: (body: Record<string, unknown>) => Promise<boolean>; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(() => toLocalInput(Date.now() + 10 * 60000));
  const [minutes, setMinutes] = useState("30");
  const [teamSize, setTeamSize] = useState("3");
  const [everyone, setEveryone] = useState(false);
  const [campusIds, setCampusIds] = useState<string[]>([]);
  const [orgIds, setOrgIds] = useState<string[]>([]);
  const [problemIds, setProblemIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (moved.current) heading.current?.focus();
    moved.current = true;
  }, [step]);

  const payload = () => ({ title, startsAt: start ? new Date(start).toISOString() : "", minutes: Number(minutes), teamSize: Number(teamSize), everyone, campusIds, orgIds, problemIds });
  const allErrors = (): FieldErrors => {
    const checked = checkCompetition(payload(), { problems: new Set(data.problems.map((p) => p.id)), campuses: new Set(data.campuses.map((c) => c.id)), orgs: new Set(data.orgs.map((o) => o.id)) });
    return checked.ok ? {} : checked.fieldErrors;
  };
  const errorsIn = (index: number, all: FieldErrors) => Object.fromEntries(Object.entries(all).filter(([key]) => STEPS[index].fields.includes(key)));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const all = allErrors();
    if (step < STEPS.length - 1) {
      const here = errorsIn(step, all);
      setErrors(here);
      if (Object.keys(here).length === 0) setStep(step + 1);
      return;
    }
    // The clock may have passed the start time while the form was open.
    const first = STEPS.findIndex((_, index) => Object.keys(errorsIn(index, all)).length > 0);
    if (first >= 0) { setErrors(errorsIn(first, all)); setStep(first); return; }
    setBusy(true);
    await onCreate(payload());
    setBusy(false);
  };

  const needle = query.trim().toLowerCase();
  const shownProblems = data.problems.filter((p) => !needle || p.title.toLowerCase().includes(needle) || p.category?.toLowerCase().includes(needle));
  const nameOf = (list: { id: string; name: string }[], id: string) => list.find((item) => item.id === id)?.name ?? id;
  const titleOf = (id: string) => data.problems.find((p) => p.id === id)?.title ?? id;
  const audience = everyone ? "Everyone" : [...campusIds.map((id) => nameOf(data.campuses, id)), ...orgIds.map((id) => nameOf(data.orgs, id))].join("\n");

  return (
    <form onSubmit={submit} noValidate className="profile-panel space-y-5 p-5 sm:p-6">
      <WizardSteps titles={STEPS.map((item) => item.title)} step={step} onGo={(index) => { setErrors({}); setStep(index); }} />

      <div className="space-y-1">
        <h3 ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">Step {step + 1} of {STEPS.length}: {STEPS[step].title}</h3>
        <p className="text-sm text-[var(--color-text-muted)]">{STEPS[step].hint}</p>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <TextField id="c-title" label="Competition name" placeholder="CPE Days programming competition" maxLength={120} value={title} error={errors.title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField id="c-start" label="Starts" type="datetime-local" value={start} error={errors.schedule} onChange={(e) => setStart(e.target.value)} />
            <TextField id="c-minutes" label="Length (minutes)" hint="5 to 480." type="number" min={5} max={480} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            <TextField id="c-team" label="Team size" hint="1 means everyone competes alone." type="number" min={1} max={10} value={teamSize} error={errors.teamSize} onChange={(e) => setTeamSize(e.target.value)} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div role="group" aria-label="Audience" className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" aria-pressed={!everyone} className="h-10" onClick={() => setEveryone(false)}>Chosen campuses or organizations</Button>
            <Button type="button" variant="outline" aria-pressed={everyone} className="h-10" onClick={() => { setErrors({}); setEveryone(true); }}>Everyone</Button>
          </div>
          {!everyone && <>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Campuses</h4>
              {data.campuses.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">No campuses yet.</p> : (
                <div role="group" aria-label="Campuses" className="flex flex-wrap gap-2">
                  {data.campuses.map((c) => <Button key={c.id} type="button" variant="outline" size="sm" aria-pressed={campusIds.includes(c.id)} onClick={() => { setErrors({}); setCampusIds((all) => toggle(all, c.id)); }}>{c.name}</Button>)}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Organizations</h4>
              {data.orgs.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">No organizations yet.</p> : (
                <div role="group" aria-label="Organizations" className="flex flex-wrap gap-2">
                  {data.orgs.map((o) => <Button key={o.id} type="button" variant="outline" size="sm" aria-pressed={orgIds.includes(o.id)} onClick={() => { setErrors({}); setOrgIds((all) => toggle(all, o.id)); }}>{o.name}</Button>)}
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">{campusIds.length + orgIds.length} selected</p>
          </>}
          {errors.audience && <p role="alert" className={ERROR}>{errors.audience}</p>}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {data.sets.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Add a saved set</h4>
              <div className="flex flex-wrap gap-2">
                {data.sets.map((set) => <Button key={set.id} type="button" variant="outline" size="sm" onClick={() => { setErrors({}); setProblemIds((all) => [...new Set([...all, ...set.problems.map((p) => p.id)])]); }}>{set.name}</Button>)}
              </div>
            </div>
          )}
          <TextField id="c-search" label="Search problems" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          {shownProblems.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">No problems match that search.</p> : (
            <ul className="space-y-2">
              {shownProblems.map((p) => {
                const order = problemIds.indexOf(p.id);
                return (
                  <li key={p.id}>
                    <Button type="button" variant="outline" aria-pressed={order >= 0} onClick={() => { setErrors({}); setProblemIds((all) => toggle(all, p.id)); }} className="h-11 w-full justify-start gap-3 px-3">
                      <span className="font-code w-5 shrink-0 text-center text-xs">{order >= 0 ? order + 1 : "+"}</span>
                      <span className="min-w-0 flex-1 truncate text-left">{p.title}</span>
                      <DifficultyBadge difficulty={p.difficulty} />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-[var(--color-text-muted)]">{problemIds.length} selected</p>
          {errors.problemIds && <p role="alert" className={ERROR}>{errors.problemIds}</p>}
        </div>
      )}

      {step === 3 && (
        <dl className="skeuo-recess divide-y divide-[var(--color-border-subtle)] rounded-xl px-4 py-1">
          <ReviewRow label="Name">{title}</ReviewRow>
          <ReviewRow label="Starts">{start ? new Date(start).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : ""}</ReviewRow>
          <ReviewRow label="Length">{minutes} minutes</ReviewRow>
          <ReviewRow label="Team size">{teamSize}</ReviewRow>
          <ReviewRow label="Who can join">{audience}</ReviewRow>
          <ReviewRow label="Problems">{problemIds.map((id, index) => `${index + 1}. ${titleOf(id)}`).join("\n")}</ReviewRow>
        </dl>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <div className="flex gap-2">
          {step > 0 && <Button type="button" variant="outline" className="h-10 px-4" onClick={() => { setErrors({}); setStep(step - 1); }}><ArrowLeft size={15} aria-hidden="true" />Back</Button>}
          {step < STEPS.length - 1
            ? <Button type="submit" className="h-10 px-4">Next<ArrowRight size={15} aria-hidden="true" /></Button>
            : <Button type="submit" className="h-10 px-4" disabled={busy}>{busy ? "Creating…" : "Create competition"}</Button>}
        </div>
      </div>
    </form>
  );
}
