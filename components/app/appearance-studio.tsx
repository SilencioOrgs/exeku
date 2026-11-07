"use client";

import { useId, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/hooks/use-appearance";
import { useAppearanceDraft } from "@/hooks/use-appearance-draft";
import { cn } from "@/lib/utils";
import type { ColorMode } from "@/types/appearance";

function Range({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  const id = useId();
  return <div className="minimal-settings-field"><div className="flex justify-between gap-3"><label htmlFor={id}>{label}</label><output htmlFor={id} className="tabular-nums text-[var(--color-text-muted)]">{value}{unit}</output></div><input id={id} type="range" min={min} max={max} value={value} aria-valuetext={value + unit} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[var(--color-primary)]" /></div>;
}

/** A tiny preview of the workspace in that mode: blue UI plus VS Code-style code colors. */
function ModePreview({ mode }: { mode: "light" | "dark" }) {
  return (
    <div data-theme-scope={mode} className="pointer-events-none w-full overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] text-left">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5">
        <span className="text-[0.7rem] font-medium text-[var(--color-text-main)]">main.py</span>
        <span className="rounded bg-[var(--color-primary)] px-1.5 py-0.5 text-[0.7rem] font-medium text-[var(--color-primary-foreground)]">Submit</span>
      </div>
      <pre data-theme-scope={mode} className="code-editor font-code m-0 px-2 py-2 text-[0.7rem] leading-5">
        <span className="tok-keyword">def</span> <span className="tok-function">solve</span><span className="tok-bracket0">(</span>n<span className="tok-bracket0">)</span>:{"\n"}
        {"    "}<span className="tok-control">return</span> n <span>*</span> <span className="tok-number">2</span>  <span className="tok-comment"># ok</span>
      </pre>
    </div>
  );
}

const MODES: { value: "light" | "dark"; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ColorModeChoice({ value, onChange }: { value: "light" | "dark"; onChange: (value: ColorMode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Color mode">
      {MODES.map(({ value: mode, label, icon: Icon }) => (
        <label key={mode} className={cn(
          "flex cursor-pointer flex-col gap-2 rounded-xl border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-[var(--color-ring)]",
          value === mode ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))]" : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-muted)]",
        )}>
          <input type="radio" name="exeku-color-mode" value={mode} checked={value === mode} onChange={() => onChange(mode)} className="sr-only" />
          <span className={cn("flex items-center gap-2", value === mode && "font-semibold text-[var(--color-primary-text)]")}><Icon size={16} aria-hidden="true" />{label}</span>
          <ModePreview mode={mode} />
        </label>
      ))}
    </div>
  );
}

export function AppearanceStudio({ compact = false, onApplied }: { compact?: boolean; onApplied?: () => void } = {}) {
  const { draftPreferences: prefs, updateDraft, isDirty, isApplying, apply, discard, reset, persistenceStatus } = useAppearanceDraft();
  const { persistenceMessage, systemColorMode } = useAppearance();
  const [notice, setNotice] = useState("");
  const busy = persistenceStatus === "loading" || isApplying;
  // "system" is still read from older saves; the choice shown is whatever it resolves to.
  const mode = prefs.colorMode === "system" ? systemColorMode : prefs.colorMode;
  const status = isApplying ? "Saving appearance…" : isDirty
    ? "Previewing. Apply to save."
    : notice || "Saved on this device.";

  return <section aria-label="Appearance settings" className={`minimal-appearance-studio mx-auto w-full max-w-3xl space-y-5 ${compact ? "is-compact" : ""}`}>
    {!compact && <header className="space-y-1"><h2 className="text-xl font-semibold tracking-tight">Appearance</h2><p className="text-sm text-[var(--color-text-muted)]">Pick light or dark. Code is colored like VS Code in both.</p></header>}
    <fieldset disabled={busy} className="min-w-0 space-y-4">
      <ColorModeChoice value={mode} onChange={(colorMode) => { updateDraft({ colorMode }); setNotice(""); }} />
      {!compact && <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">More options</summary>
        <div className="grid gap-4 border-t border-[var(--color-border)] p-4 sm:grid-cols-2">
          <Range label="Code font size" value={prefs.editorFontSize} min={12} max={20} unit="px" onChange={(editorFontSize) => updateDraft({ editorFontSize })} />
          <Range label="Text size" value={prefs.uiFontScale} min={80} max={150} unit="%" onChange={(uiFontScale) => updateDraft({ uiFontScale })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[var(--color-primary)]" checked={prefs.contrastMode === "high"} onChange={(event) => updateDraft({ contrastMode: event.target.checked ? "high" : "standard" })} />High contrast</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[var(--color-primary)]" checked={prefs.reducedMotion === true} onChange={(event) => updateDraft({ reducedMotion: event.target.checked ? true : "system" })} />Reduce motion</label>
        </div>
      </details>}
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
