"use client";

import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import { fetchProgress, peekApiCache } from "@/lib/accounts/api";
import { subscribeClientCache } from "@/lib/client/swr-cache";
import type { Medal } from "@/types/tournament";
import {
  CODING_ACTIVITY_EVENT,
  getActivityCalendar,
  getActivityStreaks,
  localDayKey,
  readCodingDays,
} from "@/lib/storage/coding-activity";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MEDALS = [{ name: "gold", label: "1st" }, { name: "silver", label: "2nd" }, { name: "bronze", label: "3rd" }];

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
  const [solvedAt, setSolvedAt] = useState<string[]>(
    () => peekApiCache<{ solved: number; solvedAt: string[]; medals: Medal[] }>("/api/account/profile")?.solvedAt ?? [],
  );
  const [medals, setMedals] = useState<Medal[]>(
    () => peekApiCache<{ solved: number; solvedAt: string[]; medals: Medal[] }>("/api/account/profile")?.medals ?? [],
  );
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    const load = () => void fetchProgress().then((result) => {
      if (live && result.ok) {
        setSolvedAt(result.data.solvedAt);
        setMedals(result.data.medals);
      }
    });
    load();
    const unsubscribe = subscribeClientCache((prefixes) => {
      if (prefixes.some((p) => p === "*" || p.startsWith("/api/account/profile"))) load();
    });
    return () => { live = false; unsubscribe(); };
  }, [profileId]);

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
  const solvedOn = new Map<string, number>();
  for (const at of solvedAt) {
    const key = localDayKey(new Date(at));
    solvedOn.set(key, (solvedOn.get(key) ?? 0) + 1);
  }
  const weeks = Math.ceil(calendar.length / 7);
  const monthLabels = Array.from({ length: weeks }, (_, week) => calendar[week * 7].date.slice(5, 7))
    .flatMap((month, week, all) => (week > 0 && month !== all[week - 1] ? [{ week, label: MONTHS[Number(month) - 1] }] : []));

  const medalOn = new Map<string, Medal>();
  for (const medal of medals) {
    const key = localDayKey(new Date(medal.at));
    const held = medalOn.get(key);
    if (!held || medal.place < held.place) medalOn.set(key, medal);
  }

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
              <div className="coding-activity-grid" role="img" aria-label={`${count} days with saved code edits and ${solvedOn.size} days with solved problems in the past year`}>
                {WEEKDAYS.map((label, index) => <span key={index} className="coding-activity-weekday" aria-hidden="true">{label}</span>)}
                {calendar.map((day) => {
                  const solved = solvedOn.get(day.date) ?? 0;
                  const medal = medalOn.get(day.date);
                  const reward = medal ? `is-solved is-${MEDALS[medal.place - 1].name}` : solved > 0 ? "is-solved" : "";
                  return (
                    <span
                      key={day.date}
                      className={`coding-activity-cell ${day.active ? "is-active" : ""} ${reward} ${day.future ? "is-future" : ""} ${day.date === todayKey ? "is-today" : ""}`}
                      aria-hidden="true"
                      title={day.future ? "" : `${day.date}: ${medal ? `${MEDALS[medal.place - 1].label} place in ${medal.title}` : solved > 0 ? `Solved ${solved} ${solved === 1 ? "problem" : "problems"}` : day.active ? "Saved code" : "No saved code"}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          <div className="coding-activity-footer">
            <span className="coding-activity-legend" aria-hidden="true"><i /> No saved code <i className="is-active" /> Saved code <i className="is-solved" /> Solved a problem <i className="is-solved is-gold" /> Top 3 in a tournament</span>
          </div>
        </>
      )}
    </section>
  );
}
