"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/hooks/use-appearance";
import { useAppearanceDraft } from "@/hooks/use-appearance-draft";

function Range({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  const id = useId();
  return <div className="minimal-settings-field"><div className="flex justify-between gap-3"><label htmlFor={id}>{label}</label><output htmlFor={id} className="tabular-nums text-[var(--color-text-muted)]">{value}{unit}</output></div><input id={id} type="range" min={min} max={max} value={value} aria-valuetext={value + unit} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[var(--color-primary)]" /></div>;
}

export function AppearanceStudio({ compact = false, onApplied }: { compact?: boolean; onApplied?: () => void } = {}) {
  const { draftPreferences: prefs, updateDraft, isDirty, isApplying, apply, discard, reset, persistenceStatus } = useAppearanceDraft();
  const { persistenceMessage } = useAppearance();
  const [notice, setNotice] = useState("");
  const busy = persistenceStatus === "loading" || isApplying;
  const status = isApplying ? "Saving appearance…" : isDirty
    ? "Previewing. Apply to save."
    : notice || "Saved on this device.";

  return <section aria-label="Appearance settings" className={`minimal-appearance-studio mx-auto w-full max-w-3xl space-y-5 ${compact ? "is-compact" : ""}`}>
    {!compact && <header className="space-y-1"><h2 className="text-xl font-semibold tracking-tight">Appearance</h2><p className="text-sm text-[var(--color-text-muted)]">Exeku is dark: orange on black, with code colored like VS Code Dark+.</p></header>}
    <fieldset disabled={busy} className="min-w-0">
      <div className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-2">
        <Range label="Code font size" value={prefs.editorFontSize} min={12} max={20} unit="px" onChange={(editorFontSize) => { updateDraft({ editorFontSize }); setNotice(""); }} />
        <Range label="Text size" value={prefs.uiFontScale} min={80} max={150} unit="%" onChange={(uiFontScale) => { updateDraft({ uiFontScale }); setNotice(""); }} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[var(--color-primary)]" checked={prefs.contrastMode === "high"} onChange={(event) => updateDraft({ contrastMode: event.target.checked ? "high" : "standard" })} />High contrast</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[var(--color-primary)]" checked={prefs.reducedMotion === true} onChange={(event) => updateDraft({ reducedMotion: event.target.checked ? true : "system" })} />Reduce motion</label>
      </div>
    </fieldset>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
      <div className="space-y-1"><p role="status" aria-live="polite" className="text-xs text-[var(--color-text-muted)]">{status}</p>
        {!compact && <button type="button" disabled={busy} onClick={() => { reset(); setNotice(""); }} className="text-xs underline underline-offset-4 disabled:opacity-50">Reset to defaults</button>}
        {(persistenceStatus === "error" || persistenceStatus === "session") && <p role="alert" className="max-w-md text-xs text-[var(--color-text-muted)]">{persistenceMessage}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" disabled={!isDirty || busy} onClick={() => { discard(); setNotice(""); }}>Discard</Button>
        <Button type="button" disabled={!isDirty || busy} onClick={async () => {
          if (await apply()) { setNotice("Appearance saved."); onApplied?.(); }
        }}>{isApplying ? "Saving…" : "Apply changes"}</Button>
      </div>
    </div>
  </section>;
}
