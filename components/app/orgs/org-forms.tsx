"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ApiResult } from "@/lib/accounts/api";
import type { FieldErrors } from "@/types/account";
import type { BannerStyle, EventAccess } from "@/types/competition";
import { TextAreaField, TextField } from "../school/field";

type Act = (body: Record<string, unknown>) => Promise<ApiResult<unknown>>;

const BANNERS: { id: BannerStyle; label: string }[] = [
  { id: "ember", label: "Ember" },
  { id: "spotlight", label: "Spotlight" },
  { id: "graphite", label: "Graphite" },
];

function useSubmit(act: Act, onDone: () => void) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async (body: Record<string, unknown>) => {
    setBusy(true);
    setFormError(undefined);
    const result = await act(body);
    setBusy(false);
    if (result.ok) { setErrors({}); onDone(); return; }
    setErrors(result.fieldErrors ?? {});
    setFormError(result.error);
  };
  return { errors, formError, busy, submit };
}

export function EventForm({ act }: { act: Act }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [access, setAccess] = useState<EventAccess>("open");
  const [banner, setBanner] = useState<BannerStyle>("ember");
  const [featured, setFeatured] = useState(true);
  const { errors, formError, busy, submit } = useSubmit(act, () => { setTitle(""); setSummary(""); });

  return (
    <form className="space-y-3" noValidate onSubmit={(e) => { e.preventDefault(); void submit({ action: "createEvent", title, summary, access, banner, featured }); }}>
      <TextField id="event-title" label="Event title" value={title} error={errors.title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      <TextAreaField id="event-summary" label="Summary" rows={2} value={summary} error={errors.summary} maxLength={300} onChange={(e) => setSummary(e.target.value)} />
      <div role="group" aria-label="Who can compete" className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">Who can compete</span>
        <Button type="button" variant="outline" size="sm" aria-pressed={access === "open"} onClick={() => setAccess("open")}>Open to everyone</Button>
        <Button type="button" variant="outline" size="sm" aria-pressed={access === "org-only"} onClick={() => setAccess("org-only")}>Org members only</Button>
      </div>
      <div role="group" aria-label="Banner" className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">Banner</span>
        {BANNERS.map((b) => (
          <Button key={b.id} type="button" variant="outline" size="sm" aria-pressed={banner === b.id} onClick={() => setBanner(b.id)}>
            <span aria-hidden="true" className={`event-banner-${b.id} size-3.5 rounded-sm border border-[var(--color-border)]`} />{b.label}
          </Button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
        Show on the dashboard
      </label>
      {formError && <p role="alert" className="text-xs text-[var(--color-pink)]">{formError}</p>}
      <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create event"}</Button></div>
    </form>
  );
}

export function PostForm({ act }: { act: Act }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { errors, formError, busy, submit } = useSubmit(act, () => { setTitle(""); setBody(""); });

  return (
    <form className="space-y-3" noValidate onSubmit={(e) => { e.preventDefault(); void submit({ action: "createPost", title, body }); }}>
      <TextField id="post-title" label="Post title" value={title} error={errors.title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      <TextAreaField id="post-body" label="Post" rows={4} value={body} error={errors.body} maxLength={5000} hint="Leave a blank line between paragraphs." onChange={(e) => setBody(e.target.value)} />
      {formError && <p role="alert" className="text-xs text-[var(--color-pink)]">{formError}</p>}
      <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Publishing…" : "Publish post"}</Button></div>
    </form>
  );
}
