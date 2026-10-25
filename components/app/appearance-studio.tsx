"use client";

import { useId, useState, type ReactNode } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/hooks/use-appearance";
import { useAppearanceDraft } from "@/hooks/use-appearance-draft";
import type { AppearancePreferences, ColorMode } from "@/types/appearance";

function Choice({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  const id = useId();
  return <div className="minimal-settings-field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="minimal-settings-select">{children}</select></div>;
}

function Range({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  const id = useId();
  return <div className="minimal-settings-field"><div className="flex justify-between gap-3"><label htmlFor={id}>{label}</label><output htmlFor={id} className="tabular-nums text-[var(--color-text-muted)]">{value}{unit}</output></div><input id={id} type="range" min={min} max={max} value={value} aria-valuetext={value + unit} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[var(--color-text-main)]" /></div>;
}

const MODES: { value: ColorMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ColorModeChoice({ value, onChange }: { value: ColorMode; onChange: (value: ColorMode) => void }) {
  return <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Appearance</legend>
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Color mode">
      {MODES.map(({ value: mode, label, icon: Icon }) => (
        <label key={mode} className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-[var(--color-ring)] ${value === mode ? "border-[var(--color-text-main)] bg-[var(--color-elevated)] font-semibold" : "border-[var(--color-border)] hover:bg-[var(--color-elevated)]"}`}>
          <input type="radio" name="exeku-color-mode" value={mode} checked={value === mode} onChange={() => onChange(mode)} className="sr-only" />
          <Icon size={16} aria-hidden="true" />{label}
        </label>
      ))}
    </div>
  </fieldset>;
}

export function AppearanceStudio({ compact = false, onApplied }: { compact?: boolean; onApplied?: () => void } = {}) {
  const { draftPreferences: prefs, updateDraft, isDirty, isApplying, apply, discard, reset, persistenceStatus } = useAppearanceDraft();
  const { persistenceMessage, systemColorMode } = useAppearance();
  const [notice, setNotice] = useState("");
  const busy = persistenceStatus === "loading" || isApplying;
  const mode = prefs.colorMode === "system" ? systemColorMode : prefs.colorMode;
  const preview = mode === "dark"
    ? { canvas: "#0a0a0a", surface: "#171717", border: "#343434", text: "#fafafa", muted: "#a3a3a3", button: "#fafafa", buttonText: "#171717" }
    : { canvas: "#fafafa", surface: "#ffffff", border: "#e4e4e7", text: "#18181b", muted: "#71717a", button: "#18181b", buttonText: "#ffffff" };
  const status = isApplying ? "Saving appearance…" : isDirty
    ? "Changes are being previewed. Apply to save them."
    : notice || "Your appearance is saved on this device.";

  return <section aria-label="Appearance settings" className={`minimal-appearance-studio mx-auto w-full max-w-4xl space-y-5 ${compact ? "is-compact" : ""}`}>
    {!compact && <header className="space-y-1"><h2 className="text-xl font-semibold tracking-tight">Appearance</h2><p className="text-sm text-[var(--color-text-muted)]">Choose how Exeku looks on this device.</p></header>}
    <fieldset disabled={busy} className="min-w-0 space-y-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,.85fr)]">
        <div className="space-y-5">
          <ColorModeChoice value={prefs.colorMode} onChange={(colorMode) => { updateDraft({ colorMode }); setNotice(""); }} />
          {!compact && <div className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-2">
            <Choice label="Interface font" value={prefs.uiFontFamily === "pixelify-sans" ? "geist-sans" : prefs.uiFontFamily} onChange={(uiFontFamily) => updateDraft({ uiFontFamily: uiFontFamily as AppearancePreferences["uiFontFamily"] })}>
              <option value="geist-sans">Geist Sans</option><option value="system-sans">System Sans</option>
            </Choice>
            <Choice label="Density" value={prefs.density} onChange={(density) => updateDraft({ density: density as AppearancePreferences["density"] })}>
              <option value="comfortable">Comfortable</option><option value="compact">Compact</option><option value="spacious">Spacious</option>
            </Choice>
            <Range label="Text size" value={prefs.uiFontScale} min={80} max={150} unit="%" onChange={(uiFontScale) => updateDraft({ uiFontScale })} />
            <Choice label="Line spacing" value={prefs.lineHeight} onChange={(lineHeight) => updateDraft({ lineHeight: lineHeight as AppearancePreferences["lineHeight"] })}>
              <option value="compact">Compact</option><option value="normal">Normal</option><option value="comfortable">Comfortable</option>
            </Choice>
          </div>}
        </div>
        <div className="min-w-0 space-y-2">
          <h3 className="text-sm font-medium">Preview</h3>
          <div className="rounded-xl border p-4 transition-colors" style={{ backgroundColor: preview.canvas, borderColor: preview.border, color: preview.text }} aria-label={`${mode} mode preview`}>
            <div className="space-y-3 rounded-lg border p-4" style={{ backgroundColor: preview.surface, borderColor: preview.border }}>
              <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">Your workspace</span><span className="text-xs" style={{ color: preview.muted }}>Exeku</span></div>
              <div className="rounded-md border px-3 py-2 font-mono text-xs" style={{ borderColor: preview.border, backgroundColor: preview.canvas }}>print("Hello, world!")</div>
              <div className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium" style={{ backgroundColor: preview.button, color: preview.buttonText }}><Check size={13} aria-hidden="true" /> Run code</div>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">Preview only. Your workspace changes after you apply.</p>
        </div>
      </div>

      {!compact && <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">Editor & accessibility options</summary>
        <div className="grid gap-4 border-t border-[var(--color-border)] p-4 sm:grid-cols-2">
          <Choice label="Editor font" value={prefs.editorFontFamily} onChange={(editorFontFamily) => updateDraft({ editorFontFamily: editorFontFamily as AppearancePreferences["editorFontFamily"] })}>
            <option value="geist-mono">Geist Mono</option><option value="consolas">Consolas</option><option value="monospace">System Monospace</option>
          </Choice>
          <Choice label="Editor colors" value={prefs.editorTheme} onChange={(editorTheme) => updateDraft({ editorTheme: editorTheme as AppearancePreferences["editorTheme"] })}>
            <option value="auto">Follow appearance</option><option value="dark">Dark</option><option value="light">Light</option><option value="high-contrast">High contrast</option>
          </Choice>
          <Range label="Editor font size" value={prefs.editorFontSize} min={12} max={20} unit="px" onChange={(editorFontSize) => updateDraft({ editorFontSize })} />
          <Range label="Editor line height" value={prefs.editorLineHeight} min={18} max={32} unit="px" onChange={(editorLineHeight) => updateDraft({ editorLineHeight })} />
          <Choice label="Contrast" value={prefs.contrastMode} onChange={(contrastMode) => updateDraft({ contrastMode: contrastMode as AppearancePreferences["contrastMode"] })}><option value="standard">Standard</option><option value="high">High contrast</option></Choice>
          <Choice label="Motion" value={String(prefs.reducedMotion)} onChange={(value) => updateDraft({ reducedMotion: value === "system" ? "system" : value === "true" })}><option value="system">Follow system</option><option value="true">Reduce motion</option><option value="false">Standard motion</option></Choice>
          <Range label="Surface brightness" value={prefs.brightness} min={80} max={120} unit="%" onChange={(brightness) => updateDraft({ brightness })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prefs.editorLigatures} onChange={(event) => updateDraft({ editorLigatures: event.target.checked })} />Editor font ligatures</label>
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
