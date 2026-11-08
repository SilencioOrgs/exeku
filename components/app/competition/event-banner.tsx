import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { CompetitionEvent } from "@/types/competition";

export function EventBanner({ event, sample }: { event: CompetitionEvent; sample: boolean }) {
  const access = event.access === "open" ? "Open to everyone" : `Org only: ${event.orgName}`;
  return (
    <aside aria-label="Event" className={`profile-panel event-banner-${event.banner} flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:px-5`}>
      <Trophy size={20} className="text-[var(--color-primary-text)]" />
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-semibold">{event.title}</p>
        <p className="text-sm text-[var(--color-text-muted)]">{event.summary}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{access}{sample ? " · Sample event" : ""}</p>
      </div>
      <Link href={event.resultsSlug ? `/app/blog/${event.resultsSlug}` : `/app/orgs/${event.orgId}`} className={buttonVariants({ variant: "outline" })}>
        {event.resultsSlug ? "See who won" : "View organization"}<ArrowRight size={14} />
      </Link>
    </aside>
  );
}
