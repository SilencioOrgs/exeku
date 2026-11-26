"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarPlus, Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { bannerSrc } from "@/lib/banners";
import { fetchEvents, orgAction } from "@/lib/orgs/api";
import { eventAccessLabel } from "@/lib/orgs/rules";
import type { CompetitionEvent, EventAccess, EventsFeed } from "@/types/competition";
import { EventDate } from "./event-date";
import { EventForm } from "./event-form";
import { EventsListSkeleton } from "@/components/app/page-skeletons";

const PLACE_LABELS = ["1st", "2nd", "3rd"];
const FILTERS: { id: EventAccess | "all"; label: string }[] = [
  { id: "all", label: "All events" },
  { id: "open", label: "Open" },
  { id: "campus-only", label: "My campus" },
  { id: "org-only", label: "My orgs" },
];

function EventCard({ event, solved }: { event: CompetitionEvent; solved: string[] }) {
  return (
    <li className="profile-panel overflow-hidden">
      <Image src={bannerSrc(event.banner)} alt="" width={1500} height={500} sizes="(min-width: 56rem) 52rem, 100vw" className="aspect-[3/1] max-h-44 w-full object-cover" />
      <div className="space-y-2 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="text-lg font-semibold">{event.title}</h3>
          <EventDate value={event.startsOn} />
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">{event.summary}</p>
        <p className="text-xs text-[var(--color-primary-text)]">
          {eventAccessLabel(event)}
          {event.tournament && (
            <span> · {event.tournament.teamSize === 1 ? "Solo competition" : `Team competition (up to ${event.tournament.teamSize})`}</span>
          )}
          <span className="text-[var(--color-text-muted)]"> · Hosted by {event.orgName}</span>
        </p>
        {event.tournament && (
          <Link href={`/app/events/${encodeURIComponent(event.id)}`} className={buttonVariants({ variant: "outline" })}>
            {event.tournament.teamSize === 1 ? "Open solo competition" : "Open team competition"}
          </Link>
        )}
        {!event.tournament && event.problems && event.problems.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-[var(--color-text-muted)]">{event.problems.filter((p) => solved.includes(p.id)).length} of {event.problems.length} problems solved</p>
            <ol className="grid gap-2 sm:grid-cols-3">
              {event.problems.map((p, i) => (
                <li key={p.id}>
                  <Link href={`/app/workspace?problem=${encodeURIComponent(p.id)}&event=${encodeURIComponent(event.id)}`} className={`${buttonVariants({ variant: "outline" })} h-auto w-full justify-between gap-2 py-2`}>
                    <span className="truncate">{i + 1}. {p.title}</span>
                    {solved.includes(p.id) && <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--color-primary-text)]"><Check size={13} aria-hidden="true" />Solved</span>}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
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

function EventList({ title, events, empty, solved }: { title: string; events: CompetitionEvent[]; empty: string; solved: string[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {events.length === 0
        ? <p className="profile-panel p-5 text-sm text-[var(--color-text-muted)]">{empty}</p>
        : <ul className="space-y-3">{events.map((event) => <EventCard key={event.id} event={event} solved={solved} />)}</ul>}
    </section>
  );
}

export function EventsView() {
  const { profile } = useProfile();
  const [feed, setFeed] = useState<EventsFeed | null>(null);
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<EventAccess | "all">("all");
  const [posting, setPosting] = useState(false);
  const [version, setVersion] = useState(0);
  const campusId = profile?.account?.school.campusId;

  useEffect(() => {
    let live = true;
    void fetchEvents().then((result) => {
      if (!live) return;
      if (result.ok) { setFeed(result.data); setError(undefined); }
      else setError(result.error ?? "We couldn't load events.");
    });
    return () => { live = false; };
  }, [campusId, version]);

  const ready = Boolean(feed && profile);
  const shown = feed ? feed.events.filter((e) => filter === "all" || e.access === filter) : [];
  const upcoming = feed ? shown.filter((e) => e.startsOn >= feed.today).reverse() : [];
  const past = feed ? shown.filter((e) => e.startsOn < feed.today) : [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Competitions you can join.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {feed && feed.postableOrgs.length > 0 && !posting && <Button size="lg" className="h-10 px-4" onClick={() => setPosting(true)}><CalendarPlus size={15} />Post an event</Button>}
        </div>
      </header>

      {posting && feed && (
        <EventForm orgs={feed.postableOrgs} today={feed.today}
          onPost={(orgId, body) => orgAction(orgId, body)}
          onCancel={() => setPosting(false)}
          onDone={() => { setPosting(false); setVersion((v) => v + 1); }} />
      )}

      <div role="group" aria-label="Filter events" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => <Button key={f.id} type="button" variant="outline" size="sm" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Button>)}
      </div>

      {error ? (
        <p role="alert" className="skeuo-recess rounded-xl p-4 text-sm text-[var(--color-pink)]">{error}</p>
      ) : !ready || !feed ? (
        <EventsListSkeleton />
      ) : (
        <>
          <EventList title="Upcoming" events={upcoming} empty="No upcoming events here yet." solved={feed.solvedProblemIds} />
          {past.length > 0 && <EventList title="Past events" events={past} empty="" solved={feed.solvedProblemIds} />}
        </>
      )}
    </div>
  );
}
