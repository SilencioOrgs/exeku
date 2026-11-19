/** Calendar date in the Philippines as YYYY-MM-DD. Events are planned in local days, not UTC ones. */
export function todayInManila(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}
