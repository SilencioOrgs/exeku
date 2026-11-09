"use client";

import { useId, useState, type FormEvent } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventsOverview, ProblemSetView, ScheduledEvent } from "@/types/admin";
import { CompetitionWizard } from "./admin/competition-wizard";
import { SelectField, TextField } from "./school/field";
import { ConfirmDialog } from "./workspace/submission-modals";

/** The value a datetime-local input expects, in the admin's own timezone. */
const toLocalInput = (ms: number) => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const soon = () => toLocalInput(Date.now() + 10 * 60000);
const minutesBetween = (start: string, end: string) => Math.round((Date.parse(end) - Date.parse(start)) / 60000);
const STATUS_LABELS = { upcoming: "Upcoming", live: "Live now", ended: "Ended" };
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function TimeFields({ start, minutes, onStart, onMinutes }: { start: string; minutes: string; onStart: (v: string) => void; onMinutes: (v: string) => void }) {
  const id = useId();
  return <>
    <TextField id={`${id}-start`} label="Starts" type="datetime-local" value={start} onChange={(e) => onStart(e.target.value)} />
    <TextField id={`${id}-minutes`} label="Length (minutes)" type="number" min={5} max={480} value={minutes} onChange={(e) => onMinutes(e.target.value)} />
  </>;
}

function ScheduleForm({ set, orgs, onSubmit, onCancel }: { set: ProblemSetView; orgs: EventsOverview["orgs"]; onSubmit: (body: Record<string, unknown>) => Promise<boolean>; onCancel: () => void }) {
  const [title, setTitle] = useState(set.name);
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [access, setAccess] = useState("campus-only");
  const [start, setStart] = useState(soon);
  const [minutes, setMinutes] = useState("30");
  const [teamSize, setTeamSize] = useState("3");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    await onSubmit({ setId: set.id, title, orgId, access, startsAt: start ? new Date(start).toISOString() : "", minutes: Number(minutes), teamSize: Number(teamSize) });
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="skeuo-recess space-y-3 rounded-xl p-3">
      <div className="grid gap-3 sm:grid-cols-2"><TimeFields start={start} minutes={minutes} onStart={setStart} onMinutes={setMinutes} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="event-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        <SelectField id="event-org" label="Host" value={orgId} onChange={(e) => setOrgId(e.target.value)}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</SelectField>
        <SelectField id="event-access" label="Who can join" value={access} onChange={(e) => setAccess(e.target.value)}>
          <option value="campus-only">Host campus only</option><option value="org-only">Host members only</option><option value="open">Everyone</option>
        </SelectField>
        <TextField id="event-team" label="Team size" type="number" min={1} max={10} value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy || !orgId}>{busy ? "Creating…" : "Create event"}</Button>
      </div>
    </form>
  );
}

function EventRow({ event, onSave, onDelete }: { event: ScheduledEvent; onSave: (body: Record<string, unknown>) => Promise<boolean>; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState("");
  const [minutes, setMinutes] = useState("");
  const open = () => { setStart(toLocalInput(Date.parse(event.startsAt))); setMinutes(String(minutesBetween(event.startsAt, event.endsAt))); setEditing(true); };
  const save = async (form: FormEvent) => {
    form.preventDefault();
    if (await onSave({ id: event.id, startsAt: start ? new Date(start).toISOString() : "", minutes: Number(minutes) })) setEditing(false);
  };
  return (
    <li className="profile-panel space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold"><span className="truncate">{event.title}</span><span className={`shrink-0 rounded-full border px-2 text-xs font-normal ${event.status === "live" ? "border-[var(--color-primary)] text-[var(--color-primary-text)]" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}>{STATUS_LABELS[event.status]}</span></p>
          <p className="text-xs text-[var(--color-text-muted)]">{when(event.startsAt)} · {minutesBetween(event.startsAt, event.endsAt)} minutes · {event.problemCount} {event.problemCount === 1 ? "problem" : "problems"} · {event.audience}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={open}><CalendarClock size={14} aria-hidden="true" />Edit time</Button>
          <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 size={14} aria-hidden="true" />Delete</Button>
        </div>
      </div>
      {editing && (
        <form onSubmit={save} className="skeuo-recess space-y-3 rounded-xl p-3">
          <div className="grid gap-3 sm:grid-cols-2"><TimeFields start={start} minutes={minutes} onStart={setStart} onMinutes={setMinutes} /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button><Button type="submit">Save time</Button></div>
        </form>
      )}
    </li>
  );
}

type Act = (action: string, body: Record<string, unknown>) => Promise<boolean>;

export function ProblemSetsPanel({ data, act }: { data: EventsOverview; act: Act }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{ id: string; title: string } | null>(null);

  const saveSet = async (event: FormEvent) => {
    event.preventDefault();
    if (await act("createSet", { name, problemIds: picked })) { setName(""); setPicked([]); }
  };

  return (
    <section aria-labelledby="sets-heading" className="space-y-3">
      <div>
        <h2 id="sets-heading" className="text-lg font-semibold">Problem sets</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Save a group of problems once, then schedule it whenever you want to run it.</p>
      </div>
      {data.sets.length === 0 ? <p className="profile-panel p-5 text-sm text-[var(--color-text-muted)]">No sets yet. Create your first one below.</p> : (
        <ul className="space-y-2">
          {data.sets.map((set) => (
            <li key={set.id} className="profile-panel space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{set.name}</p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">{set.problems.map((p) => p.title).join(" · ") || "No problems left in this set"}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" aria-expanded={scheduling === set.id} aria-label={`Schedule ${set.name}`} onClick={() => setScheduling(scheduling === set.id ? null : set.id)}>Schedule</Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${set.name}`} onClick={() => setRemoving({ id: set.id, title: set.name })}><Trash2 size={14} aria-hidden="true" /></Button>
                </div>
              </div>
              {scheduling === set.id && (data.orgs.length === 0
                ? <p className="text-sm text-[var(--color-text-muted)]">Add an organization first. Events need a host.</p>
                : <ScheduleForm set={set} orgs={data.orgs} onCancel={() => setScheduling(null)}
                    onSubmit={async (body) => { const ok = await act("createEvent", body); if (ok) setScheduling(null); return ok; }} />)}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={saveSet} className="profile-panel space-y-3 p-5">
        <h3 className="font-semibold">New set</h3>
        <TextField id="set-name" label="Set name" placeholder="Warm-up round" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <div className="space-y-1.5">
          <p className="text-xs text-[var(--color-text-muted)]">Click the problems to include</p>
          <div role="group" aria-label="Problems in this set" className="flex flex-wrap gap-2">
            {data.problems.map((p) => (
              <Button key={p.id} type="button" variant="outline" size="sm" aria-pressed={picked.includes(p.id)}
                onClick={() => setPicked((all) => (all.includes(p.id) ? all.filter((id) => id !== p.id) : [...all, p.id]))}>{p.title}</Button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">{picked.length} selected</p>
          <Button type="submit" variant="outline">Save set</Button>
        </div>
      </form>
      <ConfirmDialog open={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }} title={`Delete ${removing?.title ?? "this set"}?`} description="Events already scheduled from it stay." confirmLabel="Delete"
        onConfirm={() => { if (removing) void act("deleteSet", { id: removing.id }); setRemoving(null); }} />
    </section>
  );
}

export function CompetitionsPanel({ data, act }: { data: EventsOverview; act: Act }) {
  const [removing, setRemoving] = useState<{ id: string; title: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState<string>();
  const events = data.events;

  if (creating) {
    return (
      <section aria-labelledby="new-competition-heading" className="space-y-3">
        <h2 id="new-competition-heading" className="text-lg font-semibold">New competition</h2>
        <CompetitionWizard data={data} onCancel={() => setCreating(false)} onCreate={async (body) => {
          const ok = await act("createCompetition", body);
          if (ok) { setCreating(false); setSaved(`${String(body.title).trim()} was created.`); }
          return ok;
        }} />
      </section>
    );
  }

  return (
    <section aria-labelledby="events-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="events-heading" className="text-lg font-semibold">Competitions</h2>
        <Button className="h-10 px-4" onClick={() => { setSaved(undefined); setCreating(true); }}><Plus size={15} aria-hidden="true" />Create competition</Button>
      </div>
      {saved && <p role="status" className="text-sm text-[var(--color-primary-text)]">{saved}</p>}
      {events.length === 0 ? <p className="profile-panel p-5 text-sm text-[var(--color-text-muted)]">No competitions yet.</p> : (
        <ul className="space-y-2">
          {events.map((event) => <EventRow key={event.id} event={event} onSave={(body) => act("rescheduleEvent", body)} onDelete={() => setRemoving({ id: event.id, title: event.title })} />)}
        </ul>
      )}
      <ConfirmDialog open={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }} title={`Delete ${removing?.title ?? "this event"}?`} description="Its teams, scores and warnings are removed too. This can't be undone." confirmLabel="Delete"
        onConfirm={() => { if (removing) void act("deleteEvent", { id: removing.id }); setRemoving(null); }} />
    </section>
  );
}
