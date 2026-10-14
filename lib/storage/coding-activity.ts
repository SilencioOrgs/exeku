/**
 * Profile-scoped, local-only coding activity. Each day is counted once when
 * a changed Monaco buffer is successfully persisted. Not GitHub commits,
 * execution results, or server-authoritative contest progress.
 */
export const CODING_ACTIVITY_EVENT = "exeku:coding-activity";
const PREFIX = "exeku:coding-days:v1:";

export function localDayKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function storageKey(profileId: string): string {
  return PREFIX + profileId;
}

function parseDates(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter(
      (value): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ))].sort();
  } catch {
    return [];
  }
}

export function readCodingDays(profileId: string): string[] | null {
  if (typeof window === "undefined" || !profileId) return null;
  try {
    return parseDates(window.localStorage.getItem(storageKey(profileId)));
  } catch {
    return null;
  }
}

export function recordCodingDay(profileId: string, at: Date = new Date()): boolean {
  if (typeof window === "undefined" || !profileId || !Number.isFinite(at.getTime())) return false;
  try {
    const key = storageKey(profileId);
    const today = localDayKey(at);
    const days = parseDates(window.localStorage.getItem(key));
    if (days.includes(today)) return true;
    // Keep only the last 13 months; a calendar year is rendered in the UI.
    const oldest = new Date(at.getFullYear(), at.getMonth() - 13, at.getDate());
    const cutoff = localDayKey(oldest);
    const updated = [...days.filter((day) => day >= cutoff && day <= today), today].sort();
    window.localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(CODING_ACTIVITY_EVENT, { detail: { profileId } }));
    return true;
  } catch {
    // Activity is optional; never fail a successful code save.
    return false;
  }
}

export function clearCodingDays(profileId: string): void {
  if (typeof window === "undefined" || !profileId) return;
  try {
    window.localStorage.removeItem(storageKey(profileId));
    window.dispatchEvent(new CustomEvent(CODING_ACTIVITY_EVENT, { detail: { profileId } }));
  } catch {
    // Storage may be restricted.
  }
}

export function getActivityCalendar(today: Date = new Date(), activeDays: readonly string[] = []) {
  // Full Sunday-aligned weeks, ending with the week containing today.
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());
  const active = new Set(activeDays);
  const cells: { date: string; active: boolean; future: boolean }[] = [];
  for (const date = new Date(start); date <= new Date(end.getFullYear(), end.getMonth(), end.getDate() + (6 - end.getDay())); date.setDate(date.getDate() + 1)) {
    const key = localDayKey(date);
    cells.push({ date: key, active: active.has(key), future: date > end });
  }
  return cells;
}
