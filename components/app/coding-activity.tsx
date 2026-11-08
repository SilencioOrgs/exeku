"use client";

import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import {
  CODING_ACTIVITY_EVENT,
  getActivityCalendar,
  getActivityStreaks,
  localDayKey,
  readCodingDays,
} from "@/lib/storage/coding-activity";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

function Stat({ label, value, lit }: { label: string; value: number; lit?: boolean }) {
  return (
    <div className="skeuo-recess min-w-24 rounded-xl px-3.5 py-2">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="font-code flex items-center gap-1.5 text-xl font-semibold">
        {lit && <Flame size={16} aria-hidden="true" className="text-[var(--color-primary-text)]" />}{value}
      </p>
    </div>
  );
}

export function CodingActivity({ profileId }: { profileId: string }) {
  const [today] = useState(() => new Date());
  const [days, setDays] = useState<string[] | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => setDays(readCodingDays(profileId));
    // Defer initialization so effects subscribe without synchronous cascading renders.
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) refresh(); });
    const onLocalChange = (event: Event) => {
      const detail = (event as CustomEvent<{ profileId?: string }>).detail;
      if (!detail?.profileId || detail.profileId === profileId) refresh();
    };
    window.addEventListener(CODING_ACTIVITY_EVENT, onLocalChange);
    window.addEventListener("storage", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(CODING_ACTIVITY_EVENT, onLocalChange);
      window.removeEventListener("storage", refresh);
    };
  }, [profileId]);

  // On narrow screens the chart scrolls, so start at the most recent weeks.
  const loaded = days !== null;
  useEffect(() => {
    if (loaded && scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [loaded]);

  const calendar = getActivityCalendar(today, days ?? []);
  const count = calendar.filter((day) => !day.future && day.active).length;
  const { current, longest } = getActivityStreaks(calendar);
  const todayKey = localDayKey(today);
  const weeks = Math.ceil(calendar.length / 7);
  const monthLabels = Array.from({ length: weeks }, (_, week) => calendar[week * 7].date.slice(5, 7))
    .flatMap((month, week, all) => (week > 0 && month !== all[week - 1] ? [{ week, label: MONTHS[Number(month) - 1] }] : []));

  return (
    <section className="coding-activity" aria-labelledby="coding-activity-heading">
      <div className="coding-activity-header">
        <div>
          <h2 id="coding-activity-heading" className="text-lg font-semibold">Coding activity</h2>
          <p className="text-xs text-[var(--color-text-muted)]">Days you saved code on this device, last 12 months</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Stat label="Current streak" value={current} lit={current > 0} />
          <Stat label="Longest streak" value={longest} />
          <Stat label="Active days" value={count} />
        </div>
      </div>
      {days === null ? (
        <p role="status" className="text-sm text-[var(--color-text-muted)]">Local activity history is unavailable in this browser.</p>
      ) : (
        <>
          <div ref={scroller} className="coding-activity-scroll skeuo-recess rounded-xl" tabIndex={0} role="region" aria-label="Scroll coding activity calendar horizontally">
            <div className="coding-activity-chart" style={{ "--weeks": weeks } as React.CSSProperties}>
              <div className="coding-activity-months" aria-hidden="true">
                {monthLabels.map(({ week, label }) => <span key={week} style={{ gridColumn: week + 2 }}>{label}</span>)}
              </div>
              <div className="coding-activity-grid" role="img" aria-label={`${count} days with saved code edits in the past year`}>
                {WEEKDAYS.map((label, index) => <span key={index} className="coding-activity-weekday" aria-hidden="true">{label}</span>)}
                {calendar.map((day) => (
                  <span
                    key={day.date}
                    className={`coding-activity-cell ${day.active ? "is-active" : ""} ${day.future ? "is-future" : ""} ${day.date === todayKey ? "is-today" : ""}`}
                    aria-hidden="true"
                    title={day.future ? "" : `${day.date}: ${day.active ? "Saved code" : "No saved code"}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="coding-activity-footer">
            <span className="coding-activity-legend" aria-hidden="true"><i /> No saved code <i className="is-active" /> Saved code</span>
          </div>
        </>
      )}
    </section>
  );
}
