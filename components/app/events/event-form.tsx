"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ApiResult } from "@/lib/accounts/api";
import type { FieldErrors } from "@/types/account";
import { DEFAULT_BANNER, type BannerId } from "@/lib/banners";
import type { EventAccess } from "@/types/competition";
import { BannerPicker } from "../banner-picker";
import { SelectField, TextAreaField, TextField } from "../school/field";

const ACCESS: { id: EventAccess; label: string }[] = [
  { id: "open", label: "Open to everyone" },
  { id: "campus-only", label: "My campus only" },
  { id: "org-only", label: "Org members only" },
];

export interface EventFormProps {
  orgs: { id: string; name: string }[];
  today: string;
  onPost: (orgId: string, body: Record<string, unknown>) => Promise<ApiResult<unknown>>;
  onDone: () => void;
}

export function EventForm({ orgs, today, onPost, onDone }: EventFormProps) {
  const [orgId, setOrgId] = useState(orgs[0].id);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [access, setAccess] = useState<EventAccess>("open");
  const [banner, setBanner] = useState<BannerId>(DEFAULT_BANNER);
  const [featured, setFeatured] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const edited = <T,>(key: string, set: (value: T) => void) => (value: T) => {
    set(value);
    setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  };
  const changeTitle = edited("title", setTitle);
  const changeSummary = edited("summary", setSummary);
  const changeDate = edited("startsOn", setStartsOn);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFormError(undefined);
    const result = await onPost(orgId, { action: "createEvent", title, summary, startsOn, access, banner, featured });
    setBusy(false);
    if (result.ok) return onDone();
    setErrors(result.fieldErrors ?? {});
    setFormError(result.error);
  };

  return (
    <form className="skeuo-panel space-y-3 p-5" noValidate onSubmit={submit}>
      <h2 className="font-semibold">Post an event</h2>
      {orgs.length > 1 && (
        <SelectField id="event-org" label="Organization" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </SelectField>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
        <TextField id="event-title" label="Event title" value={title} error={errors.title} maxLength={120} autoFocus onChange={(e) => changeTitle(e.target.value)} />
        <TextField id="event-date" label="Date" type="date" min={today} value={startsOn} error={errors.startsOn} onChange={(e) => changeDate(e.target.value)} />
      </div>
      <TextAreaField id="event-summary" label="Summary" rows={2} value={summary} error={errors.summary} maxLength={300} onChange={(e) => changeSummary(e.target.value)} />
      <div role="group" aria-label="Who can compete" className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">Who can compete</span>
        {ACCESS.map((a) => <Button key={a.id} type="button" variant="outline" size="sm" aria-pressed={access === a.id} onClick={() => setAccess(a.id)}>{a.label}</Button>)}
      </div>
      <div className="space-y-1.5">
        <span className="text-xs text-[var(--color-text-muted)]">Banner</span>
        <BannerPicker value={banner} onChange={setBanner} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
        Show on the dashboard
      </label>
      {formError && <p role="alert" className="text-xs text-[var(--color-pink)]">{formError}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? "Posting…" : "Post event"}</Button>
      </div>
    </form>
  );
}
