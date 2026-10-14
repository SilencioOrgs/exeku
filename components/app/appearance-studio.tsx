"use client";

import { useId, useState, type ReactNode } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { StyleSelector, AppearanceSaveStatus } from "@/components/appearance/style-selector";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { AppearancePreferences } from "@/types/appearance";

function Choice({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  const id = useId();
  return <div className="min-w-0 space-y-2"><label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value)} className="min-h-11 w-full min-w-0 border border-input bg-background px-3 py-2 text-foreground [border-radius:var(--radius-btn)]">{children}</select></div>;
}
function Range({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  const id = useId();
  return <div className="min-w-0 space-y-2"><div className="flex flex-wrap justify-between gap-2"><label htmlFor={id} className="text-sm font-medium">{label}</label><output htmlFor={id} className="font-mono text-sm tabular-nums">{value}{unit}</output></div>
    <input id={id} type="range" min={min} max={max} value={value} aria-valuetext={value + unit} onChange={event => onChange(Number(event.target.value))} className="min-h-11 w-full accent-[var(--color-primary)]" /></div>;
}

export function ColorModeChoice() {
  const { preferences, setColorMode } = useAppearance();
  return <Choice label="Color mode" value={preferences.colorMode} onChange={value => setColorMode(value as AppearancePreferences["colorMode"])}>
    <option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option>
  </Choice>;
}

export function AppearanceStudio() {
  const { preferences: p, updatePreferences, resetPreferences, persistenceStatus } = useAppearance();
  const [resetOpen, setResetOpen] = useState(false);
  return <section aria-labelledby="appearance-heading" className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="appearance-heading" className="font-heading text-2xl">Appearance Studio</h2><p className="mt-2 max-w-prose text-sm text-muted-foreground">Make Exeku comfortable for you. Changes apply immediately across this device.</p></div>
      <PixelButton variant="secondary" size="sm" onClick={() => setResetOpen(true)}>Reset appearance</PixelButton>
    </div>
    <fieldset disabled={persistenceStatus === "loading"} className="min-w-0 space-y-8">
    <StyleSelector />
    <div className="grid gap-5 sm:grid-cols-2"><ColorModeChoice />
      <Choice label="Interface density" value={p.density} onChange={value => updatePreferences({ density: value as AppearancePreferences["density"] })}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></Choice>
    </div>
    <fieldset className="min-w-0 border-t border-border pt-5"><legend className="px-1 font-heading text-lg">Interface typography</legend>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Choice label="UI font family" value={p.uiFontFamily} onChange={value => updatePreferences({ uiFontFamily: value as AppearancePreferences["uiFontFamily"] })}><option value="geist-sans">Geist Sans</option><option value="system-sans">System Sans</option><option value="pixelify-sans">Pixelify Sans</option></Choice>
        <Choice label="UI line height" value={p.lineHeight} onChange={value => updatePreferences({ lineHeight: value as AppearancePreferences["lineHeight"] })}><option value="compact">Compact · 1.25</option><option value="normal">Normal · 1.5</option><option value="comfortable">Comfortable · 1.75</option></Choice>
        <Range label="UI font size" value={p.uiFontScale} min={80} max={150} unit="%" onChange={uiFontScale => updatePreferences({ uiFontScale })} />
      </div><p className="mt-2 text-sm text-muted-foreground">Display headings follow your style. Reading text and forms remain legible with every font.</p>
    </fieldset>
    <fieldset className="min-w-0 border-t border-border pt-5"><legend className="px-1 font-heading text-lg">Code editor</legend>
      <p className="mt-2 text-sm text-muted-foreground">Independent from the interface. Your code, cursor, and drafts stay in place.</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Choice label="Editor font family" value={p.editorFontFamily} onChange={value => updatePreferences({ editorFontFamily: value as AppearancePreferences["editorFontFamily"] })}><option value="geist-mono">Geist Mono</option><option value="consolas">Consolas / local monospace</option><option value="monospace">System Monospace</option></Choice>
        <Choice label="Editor syntax theme" value={p.editorTheme} onChange={value => updatePreferences({ editorTheme: value as AppearancePreferences["editorTheme"] })}><option value="auto">Follow interface</option><option value="dark">Dark</option><option value="light">Light</option><option value="high-contrast">High contrast</option></Choice>
        <Range label="Editor font size" value={p.editorFontSize} min={12} max={20} unit="px" onChange={editorFontSize => updatePreferences({ editorFontSize })} />
        <Range label="Editor line height" value={p.editorLineHeight} min={18} max={32} unit="px" onChange={editorLineHeight => updatePreferences({ editorLineHeight })} />
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={p.editorLigatures} onChange={event => updatePreferences({ editorLigatures: event.target.checked })} className="size-5 accent-[var(--color-primary)]" />Font ligatures, when supported by the font</label>
      </div>
    </fieldset>
    <fieldset className="min-w-0 border-t border-border pt-5"><legend className="px-1 font-heading text-lg">Display &amp; accessibility</legend>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Choice label="Contrast" value={p.contrastMode} onChange={value => updatePreferences({ contrastMode: value as AppearancePreferences["contrastMode"] })}><option value="standard">Standard</option><option value="high">High contrast</option></Choice>
        <Choice label="Motion" value={String(p.reducedMotion)} onChange={value => updatePreferences({ reducedMotion: value === "system" ? "system" : value === "true" })}><option value="system">Follow system</option><option value="true">Reduce motion</option><option value="false">Allow standard motion</option></Choice>
        <Range label="Surface brightness" value={p.brightness} min={80} max={120} unit="%" onChange={brightness => updatePreferences({ brightness })} />
      </div><p className="mt-2 text-sm text-muted-foreground">Brightness changes application surfaces, not your monitor or code colors. High contrast uses fixed surfaces for readability.</p>
    </fieldset>
    <section aria-label="Live appearance preview" className="space-y-4 border border-border bg-card p-5 [border-radius:var(--radius-card)] [box-shadow:var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-heading text-xl">Your workspace, your way</h3><PixelBadge variant="mint">Ready</PixelBadge></div>
      <p className="max-w-prose text-sm text-muted-foreground">This live preview uses your current text, surfaces, borders, and controls.</p>
      <pre className="overflow-auto border border-border bg-background p-3 font-mono text-sm"><code><span className="text-[var(--color-accent)]">print</span>(<span className="text-[var(--color-mint)]">&quot;Hello, Exeku!&quot;</span>)</code></pre>
      <div className="flex flex-wrap gap-3"><PixelButton type="button" size="sm">Primary button</PixelButton><PixelButton type="button" variant="secondary" size="sm">Secondary button</PixelButton></div>
    </section>
    </fieldset>
    <AppearanceSaveStatus />
    <Dialog open={resetOpen} onOpenChange={setResetOpen}>
      <DialogContent><DialogTitle>Reset appearance?</DialogTitle><DialogDescription>Restore Pixel Arcade and default typography, editor, and accessibility settings. Your profile and code drafts stay intact.</DialogDescription>
        <DialogFooter><PixelButton variant="secondary" size="sm" onClick={() => setResetOpen(false)}>Cancel</PixelButton><PixelButton size="sm" onClick={() => { resetPreferences(); setResetOpen(false); }}>Reset appearance</PixelButton></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
