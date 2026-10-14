"use client";

import { useEffect, useState } from "react";
import { DotIcon } from "@/components/retro/dot-icon";
import {
  CODING_ACTIVITY_EVENT,
  getActivityCalendar,
  readCodingDays,
} from "@/lib/storage/coding-activity";

export function CodingActivity({ profileId }: { profileId: string }) {
  const [today, setToday] = useState<Date | null>(null);
  const [days, setDays] = useState<string[] | null>(null);

  useEffect(() => {
    const refresh = () => setDays(readCodingDays(profileId));
    setToday(new Date());
    refresh();
    const onLocalChange = (event: Event) => {
      const detail = (event as CustomEvent<{ profileId?: string }>).detail;
      if (!detail?.profileId || detail.profileId === profileId) refresh();
    };
    window.addEventListener(CODING_ACTIVITY_EVENT, onLocalChange);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CODING_ACTIVITY_EVENT, onLocalChange);
      window.removeEventListener("storage", refresh);
    };
  }, [profileId]);

  if (!today) {
    return <section className="coding-activity" aria-label="Coding activity"><p className="text-sm text-[var(--color-text-muted)]">Loading coding activity…</p></section>;
  }

  const calendar = getActivityCalendar(today, days ?? []);
  const count = calendar.filter((day) => !day.future && day.active).length;

  return (
    <section className="coding-activity" aria-labelledby="coding-activity-heading">
      <div className="coding-activity-header">
        <div>
          <h2 id="coding-activity-heading" className="flex items-center gap-2 font-semibold text-base sm:text-lg">
            <DotIcon name="stars" adaptive size={18} aria-hidden="true" />
            Coding activity
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Days with saved code edits on this device · last 12 months
          </p>
        </div>
        <div className="coding-activity-count"><strong>{count}</strong> active {count === 1 ? "day" : "days"}</div>
      </div>
      {days === null ? (
        <p role="status" className="text-sm text-[var(--color-text-muted)]">Local activity history is unavailable in this browser.</p>
      ) : (
        <>
          <div className="coding-activity-scroll" tabIndex={0} role="region" aria-label="Scroll coding activity calendar horizontally">
            <div className="coding-activity-chart">
              <div className="coding-activity-weekdays" aria-hidden="true">
                <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>
              <div className="coding-activity-grid" role="img" aria-label={`${count} days with saved code edits in the past year`}>
                {calendar.map((day) => (
                  <span
                    key={day.date}
                    className={`coding-activity-cell ${day.active ? "is-active" : ""} ${day.future ? "is-future" : ""}`}
                    aria-hidden="true"
                    title={day.future ? "" : `${day.date}: ${day.active ? "Saved a code edit" : "No recorded edit"}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="coding-activity-footer">
            <span>New activity is recorded after an edited draft is successfully saved. Previous days cannot be reconstructed.</span>
            <span className="coding-activity-legend" aria-hidden="true">Less <i /> <i className="is-active" /> More</span>
          </div>
        </>
      )}
    </section>
  );
}
