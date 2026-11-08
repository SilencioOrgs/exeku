/** Today's calendar date in the Philippines, as YYYY-MM-DD. Events are planned in local days, not UTC ones. */
export function todayInManila(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}
