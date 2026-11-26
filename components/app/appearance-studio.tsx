"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/hooks/use-appearance";
import { useAppearanceDraft } from "@/hooks/use-appearance-draft";
import type { AppearancePreferences, ColorMode, EditorFontFamily, EditorTheme, UIFontFamily } from "@/types/appearance";
import { SelectField } from "./school/field";

const COLOR_MODES: { id: ColorMode; label: string; icon: typeof Moon }[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: Monitor },
];

const EDITOR_THEMES: { id: EditorTheme; label: string }[] = [
  { id: "auto", label: "Match interface" },
  { id: "dark", label: "VS Code Dark+" },
  { id: "light", label: "VS Code Light+" },
];

// System fonts only, so the app still works with no internet. A device without one falls back to a similar font.
const UI_FONTS: { id: UIFontFamily; label: string }[] = [
  { id: "geist-sans", label: "Geist Sans (default)" },
  { id: "system-sans", label: "System default" },
  { id: "verdana", label: "Verdana" },
  { id: "georgia", label: "Georgia" },
];
const CODE_FONTS: { id: EditorFontFamily; label: string }[] = [
  { id: "geist-mono", label: "Geist Mono (default)" },
  { id: "consolas", label: "Consolas" },
  { id: "courier-new", label: "Courier New" },
  { id: "monospace", label: "System monospace" },
];
const TEXT_SIZES = [80, 90, 100, 110, 125, 150];
const CODE_SIZES = [12, 13, 14, 15, 16, 18, 20];

function SizeSelect({ id, label, value, sizes, unit, onChange }: { id: string; label: string; value: number; sizes: number[]; unit: string; onChange: (value: number) => void }) {
  // Sizes saved from the old slider can fall between these steps, so keep them selectable.
  const options = sizes.includes(value) ? sizes : [...sizes, value].sort((a, b) => a - b);
  return (
    <SelectField id={id} label={label} value={value} onChange={(event) => onChange(Number(event.target.value))}>
      {options.map((size) => <option key={size} value={size}>{size}{unit}</option>)}
    </SelectField>
  );
}

export function AppearanceStudio({ compact = false, onApplied }: { compact?: boolean; onApplied?: () => void } = {}) {
  const { draftPreferences: prefs, updateDraft, isDirty, isApplying, apply, discard, reset, persistenceStatus } = useAppearanceDraft();
  const { persistenceMessage } = useAppearance();
  const [notice, setNotice] = useState("");
  const busy = persistenceStatus === "loading" || isApplying;
  const status = isApplying ? "Saving appearance…" : isDirty
    ? "Not saved yet. Apply to use these settings."
    : notice || "Saved on this device.";
  const change = (updates: Partial<AppearancePreferences>) => { updateDraft(updates); setNotice(""); };

  return <section aria-label="Appearance settings" className={`minimal-appearance-studio w-full space-y-5 ${compact ? "is-compact" : ""}`}>
    {!compact && <header className="space-y-1"><h2 className="text-xl font-semibold tracking-tight">Appearance</h2><p className="text-sm text-[var(--color-text-muted)]">Choose dark, light, or system theme for the app. The landing page stays dark for its 3D arena.</p></header>}
    <fieldset disabled={busy} className="min-w-0">
      <div className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <span className="block text-xs text-[var(--color-text-muted)]">Theme</span>
          <div role="group" aria-label="Theme" className="grid grid-cols-3 gap-2">
            {COLOR_MODES.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={prefs.colorMode === id}
                onClick={() => change({ colorMode: id })}
                className="h-10"
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </Button>
            ))}
          </div>
        </div>
        <SelectField
          id="editor-theme"
          label="Code editor theme"
          value={prefs.editorTheme === "high-contrast" ? "auto" : prefs.editorTheme}
          onChange={(event) => change({ editorTheme: event.target.value as EditorTheme })}
        >
          {EDITOR_THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}
        </SelectField>
        <SelectField id="ui-font" label="Interface font" value={prefs.uiFontFamily === "pixelify-sans" ? "geist-sans" : prefs.uiFontFamily} onChange={(event) => change({ uiFontFamily: event.target.value as UIFontFamily })}>
          {UI_FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
        </SelectField>
        <SizeSelect id="text-size" label="Text size" value={prefs.uiFontScale} sizes={TEXT_SIZES} unit="%" onChange={(uiFontScale) => change({ uiFontScale })} />
        <SelectField id="code-font" label="Code font" value={prefs.editorFontFamily} onChange={(event) => change({ editorFontFamily: event.target.value as EditorFontFamily })}>
          {CODE_FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
        </SelectField>
        <SizeSelect id="code-size" label="Code font size" value={prefs.editorFontSize} sizes={CODE_SIZES} unit="px" onChange={(editorFontSize) => change({ editorFontSize })} />
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="accent-[var(--color-primary)]" checked={prefs.reducedMotion === true} onChange={(event) => change({ reducedMotion: event.target.checked ? true : "system" })} />Reduce motion</label>
      </div>
    </fieldset>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
      <div className="space-y-1"><p role="status" aria-live="polite" className="text-xs text-[var(--color-text-muted)]">{status}</p>
        {!compact && <Button type="button" variant="link" size="xs" className="px-0" disabled={busy} onClick={() => { reset(); setNotice(""); }}>Reset to defaults</Button>}
        {(persistenceStatus === "error" || persistenceStatus === "session") && <p role="alert" className="max-w-md text-xs text-[var(--color-text-muted)]">{persistenceMessage}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" disabled={!isDirty || busy} onClick={() => { discard(); setNotice(""); }}>Discard</Button>
        <Button type="button" disabled={!isDirty || busy} loading={isApplying} loadingText="Saving…" onClick={async () => {
          if (await apply()) { setNotice("Appearance saved."); onApplied?.(); }
        }}>Apply changes</Button>
      </div>
    </div>
  </section>;
}
