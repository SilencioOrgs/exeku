"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { bannerSrc } from "@/lib/banners";
import { fetchEvents, orgAction } from "@/lib/orgs/api";
import { eventAccessLabel } from "@/lib/orgs/rules";
import type { CompetitionEvent, EventAccess, EventsFeed } from "@/types/competition";
import { SampleNote } from "../competition/sample-note";
import { SelectField } from "../school/field";
import { EventDate } from "./event-date";
import { EventForm } from "./event-form";

const PLACE_LABELS = ["1st", "2nd", "3rd"];
const FILTERS: { id: EventAccess | "all"; label: string }[] = [
  { id: "all", label: "All events" },
  { id: "open", label: "Open" },
  { id: "campus-only", label: "My campus" },
  { id: "org-only", label: "My orgs" },
];

function EventCard({ event }: { event: CompetitionEvent }) {
  return (
    <li className="profile-panel overflow-hidden">
      <Image src={bannerSrc(event.banner)} alt="" width={1500} height={500} sizes="(min-width: 56rem) 52rem, 100vw" className="aspect-[3/1] max-h-44 w-full object-cover" />
      <div className="space-y-2 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="text-lg font-semibold">{event.title}</h3>
          <EventDate value={event.startsOn} />
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">{event.summary}</p>
        <p className="text-xs text-[var(--color-primary-text)]">{eventAccessLabel(event)}<span className="text-[var(--color-text-muted)]"> · Hosted by {event.orgName}</span></p>
        {event.winners && (
          <ol className="grid gap-2 pt-1 sm:grid-cols-3">
            {event.winners.map((w) => (
              <li key={w.place} className="skeuo-recess rounded-xl px-3.5 py-2">
                <p className="text-xs text-[var(--color-primary-text)]">{PLACE_LABELS[w.place - 1]} place</p>
                <p className="font-semibold">{w.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{w.campusName}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </li>
  );
}

function EventList({ title, events, empty }: { title: string; events: CompetitionEvent[]; empty: string }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {events.length === 0
        ? <p className="profile-panel p-5 text-sm text-[var(--color-text-muted)]">{empty}</p>
        : <ul className="space-y-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</ul>}
    </section>
  );
}

export function EventsView() {
  const { profile } = useProfile();
  const [preview, setPreview] = useState("");
  const [feed, setFeed] = useState<EventsFeed | null>(null);
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<EventAccess | "all">("all");
  const [posting, setPosting] = useState(false);
  const [version, setVersion] = useState(0);
  const viewerId = preview || profile?.id || "";
  const campusId = preview ? undefined : profile?.account?.school.campusId;

  useEffect(() => {
    if (!viewerId) return;
    let live = true;
    void fetchEvents(viewerId, campusId).then((result) => {
      if (!live) return;
      if (result.ok) { setFeed(result.data); setError(undefined); }
      else setError(result.error ?? "We couldn't load events.");
    });
    return () => { live = false; };
  }, [viewerId, campusId, version]);

  if (error) return <p role="alert" className="p-8 text-sm text-[var(--color-pink)]">{error}</p>;
  if (!feed || !profile) return <p role="status" className="p-8 text-sm text-[var(--color-text-muted)]">Loading events…</p>;

  const shown = feed.events.filter((e) => filter === "all" || e.access === filter);
  const upcoming = shown.filter((e) => e.startsOn >= feed.today).reverse();
  const past = shown.filter((e) => e.startsOn < feed.today);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Competitions you can join.</p>
          {feed.sample && <SampleNote />}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {feed.sample && (
            <div className="w-52">
              <SelectField id="events-preview-as" label="Preview as" value={preview} onChange={(e) => { setPosting(false); setPreview(e.target.value); }}>
                <option value="">You ({profile.displayName})</option>
                {feed.previewPeople.filter((p) => p.id !== profile.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SelectField>
            </div>
          )}
          {feed.postableOrgs.length > 0 && !posting && <Button size="lg" className="h-10 px-4" onClick={() => setPosting(true)}><CalendarPlus size={15} />Post an event</Button>}
        </div>
      </header>

      {posting && (
        <EventForm orgs={feed.postableOrgs} today={feed.today}
          onPost={(orgId, body) => orgAction(orgId, { actorId: viewerId, ...body })}
          onDone={() => { setPosting(false); setVersion((v) => v + 1); }} />
      )}

      <div role="group" aria-label="Filter events" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => <Button key={f.id} type="button" variant="outline" size="sm" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Button>)}
      </div>

      <EventList title="Upcoming" events={upcoming} empty="No upcoming events here yet." />
      {past.length > 0 && <EventList title="Past events" events={past} empty="" />}
    </div>
  );
}
