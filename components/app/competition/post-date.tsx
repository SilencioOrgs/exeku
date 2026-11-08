/** Dates are calendar days, so format them in UTC to avoid shifting by a day. */
export function PostDate({ value }: { value: string }) {
  const label = new Date(value).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return <time dateTime={value} className="text-xs text-[var(--color-text-muted)]">{label}</time>;
}
