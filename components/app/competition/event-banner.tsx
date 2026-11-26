"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { peekApiCache } from "@/lib/accounts/api";
import { bannerSrc } from "@/lib/banners";
import { subscribeClientCache } from "@/lib/client/swr-cache";
import { fetchEvents } from "@/lib/orgs/api";
import { eventAccessLabel } from "@/lib/orgs/rules";
import type { CompetitionEvent, EventsFeed } from "@/types/competition";
import type { LocalProfile } from "@/types/profile";

export function EventBanner({ profile }: { profile: LocalProfile }) {
  const [event, setEvent] = useState<CompetitionEvent | null>(
    () => peekApiCache<EventsFeed>("/api/events")?.events.find((e) => e.featured) ?? null,
  );
  const campusId = profile.account?.school.campusId;

  useEffect(() => {
    let live = true;
    const load = () => void fetchEvents().then((result) => {
      if (live && result.ok) setEvent(result.data.events.find((e) => e.featured) ?? null);
    });
    load();
    const unsubscribe = subscribeClientCache((prefixes) => {
      if (prefixes.some((p) => p === "*" || p.startsWith("/api/events"))) load();
    });
    return () => { live = false; unsubscribe(); };
  }, [campusId]);

  if (!event) return null;
  return (
    <aside aria-label="Event" className="profile-panel relative flex flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden p-4 sm:px-5">
      <Image src={bannerSrc(event.banner)} alt="" width={1500} height={500} sizes="(min-width: 40rem) 70vw, 100vw" className="banner-art" />
      <Trophy size={20} className="relative text-[var(--color-primary-text)]" />
      <div className="relative min-w-0 flex-1 basis-56">
        <p className="font-semibold">{event.title}</p>
        <p className="text-sm text-[var(--color-text-muted)]">{event.summary}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{eventAccessLabel(event)}</p>
      </div>
      <Link href="/app/events" className={`${buttonVariants({ variant: "outline" })} relative`}>View events<ArrowRight size={14} /></Link>
    </aside>
  );
}
