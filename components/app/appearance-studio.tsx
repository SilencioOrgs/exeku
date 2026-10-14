"use client";

import { useId, useState, type ReactNode } from "react";
import { DotIcon } from "@/components/retro/dot-icon";
import { useAppearance } from "@/hooks/use-appearance";
import { useAppearanceDraft } from "@/hooks/use-appearance-draft";
import { StyleSelector } from "@/components/appearance/style-selector";
import { PaletteSelector } from "@/components/appearance/palette-selector";
import { AppearancePreview } from "@/components/appearance/appearance-preview";
import { STYLE_PRESENTATIONS } from "@/lib/appearance-styles";
import { PixelButton } from "@/components/retro/pixel-button";
import type { AppearancePreferences } from "@/types/appearance";

function Choice({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  const id = useId();
  return <div className="appearance-control"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={event => onChange(event.target.value)}>{children}</select></div>;
}
function Range({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  const id = useId();
  return <div className="appearance-control"><div className="flex flex-wrap justify-between gap-2"><label htmlFor={id}>{label}</label><output htmlFor={id} className="tabular-nums">{value}{unit}</output></div><input id={id} type="range" min={min} max={max} value={value} aria-valuetext={value + unit} onChange={event => onChange(Number(event.target.value))} /></div>;
}
export function ColorModeChoice({ value, onChange }: { value: AppearancePreferences["colorMode"]; onChange: (value: AppearancePreferences["colorMode"]) => void }) {
  return <Choice label="Color mode" value={value} onChange={mode => onChange(mode as AppearancePreferences["colorMode"])}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></Choice>;
}
const groups = [{ id: "display", name: "Color & display", icon: "box" }, { id: "typography", name: "Typography", icon: "file" }, { id: "editor", name: "Code editor", icon: "vscode" }, { id: "accessibility", name: "Accessibility", icon: "shield" }] as const;

export function AppearanceStudio({ compact = false, onApplied }: { compact?: boolean; onApplied?: () => void } = {}) {
  const { draftPreferences: p, savedPreferences, updateDraft, isDirty, isApplying, apply, discard, reset, restoreDefaults, selectStyle, selectPalette, persistenceStatus } = useAppearanceDraft();
  const { persistenceMessage } = useAppearance();
  const [group, setGroup] = useState<typeof groups[number]["id"]>("display");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [applied, setApplied] = useState(false);
  const panelId = useId();
  const busy = persistenceStatus === "loading" || isApplying;
  const status = isApplying ? "Applying your appearance…" : isDirty && (persistenceStatus === "error" || persistenceStatus === "session") ? persistenceMessage : isDirty ? "Unsaved changes. Only the preview has changed." : applied ? "Appearance applied and saved on this device." : "Your saved appearance is active.";
  return <section aria-label="Appearance Studio" className={`appearance-studio ${compact ? "studio-compact" : ""}`}>
    {!compact && <header className="studio-header"><div><h2>Appearance Studio</h2><p>Personalize how Exeku looks and feels.</p></div><span className="studio-state">{isDirty ? "Unsaved changes" : "Saved appearance"}</span></header>}
    <fieldset disabled={busy} className="studio-fields">
      <StyleSelector preferences={p} savedStyle={savedPreferences.uiStyle} onSelect={selectStyle} />
      <PaletteSelector uiStyle={p.uiStyle} activePalette={p.colorPalette} onSelectPalette={selectPalette} compact={compact} />
      <div className="appearance-workbench"><div className="appearance-controls-panel">
        {!compact && <nav aria-label="Appearance controls" className="appearance-control-nav">{groups.map(item => <button type="button" key={item.id} aria-pressed={group === item.id} aria-controls={panelId} onClick={() => setGroup(item.id)}><DotIcon name={item.icon} size={16} aria-hidden="true" />{item.name}</button>)}</nav>}
        <div id={panelId} className="appearance-control-body">
          {(compact || group === "display") && <fieldset className="appearance-control-group"><legend>Color &amp; display</legend><p>Choose the light, space, and pace of your workspace.</p><ColorModeChoice value={p.colorMode} onChange={colorMode => updateDraft({ colorMode })} />
            {!compact && <><Choice label="Interface density" value={p.density} onChange={density => updateDraft({ density: density as AppearancePreferences["density"] })}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></Choice><Range label="Surface brightness" value={p.brightness} min={80} max={120} unit="%" onChange={brightness => updateDraft({ brightness })} /><p>Brightness affects surfaces only. High contrast uses fixed, readable surfaces.</p></>}
          </fieldset>}
          {!compact && group === "typography" && <fieldset className="appearance-control-group"><legend>Typography</legend><p>Style defaults set the tone. Your font and size choices take precedence.</p>
            <Choice label="UI font family" value={p.uiFontFamily} onChange={uiFontFamily => updateDraft({ uiFontFamily: uiFontFamily as AppearancePreferences["uiFontFamily"] })}><option value="geist-sans">Geist Sans</option><option value="system-sans">System Sans</option><option value="pixelify-sans">Pixelify Sans</option></Choice><Range label="UI font size" value={p.uiFontScale} min={80} max={150} unit="%" onChange={uiFontScale => updateDraft({ uiFontScale })} />
            <Choice label="UI line height" value={p.lineHeight} onChange={lineHeight => updateDraft({ lineHeight: lineHeight as AppearancePreferences["lineHeight"] })}><option value="compact">Compact · 1.25</option><option value="normal">Normal · 1.5</option><option value="comfortable">Comfortable · 1.75</option></Choice><PixelButton type="button" variant="secondary" size="sm" onClick={restoreDefaults}>Restore style defaults</PixelButton>
          </fieldset>}
          {!compact && group === "editor" && <fieldset className="appearance-control-group"><legend>Code editor</legend><p>Customize code independently. Previewing never touches your real editor.</p>
            <Choice label="Editor font family" value={p.editorFontFamily} onChange={editorFontFamily => updateDraft({ editorFontFamily: editorFontFamily as AppearancePreferences["editorFontFamily"] })}><option value="geist-mono">Geist Mono</option><option value="consolas">Consolas</option><option value="monospace">System Monospace</option></Choice><Choice label="Editor syntax theme" value={p.editorTheme} onChange={editorTheme => updateDraft({ editorTheme: editorTheme as AppearancePreferences["editorTheme"] })}><option value="auto">Follow interface</option><option value="dark">Dark</option><option value="light">Light</option><option value="high-contrast">High contrast</option></Choice>
            <Range label="Editor font size" value={p.editorFontSize} min={12} max={20} unit="px" onChange={editorFontSize => updateDraft({ editorFontSize })} /><Range label="Editor line height" value={p.editorLineHeight} min={18} max={32} unit="px" onChange={editorLineHeight => updateDraft({ editorLineHeight })} /><label className="appearance-checkbox"><input type="checkbox" checked={p.editorLigatures} onChange={event => updateDraft({ editorLigatures: event.target.checked })} />Font ligatures, when supported</label>
          </fieldset>}
          {!compact && group === "accessibility" && <fieldset className="appearance-control-group"><legend>Accessibility &amp; motion</legend><p>Keep focus, contrast, and motion comfortable for you.</p><Choice label="Contrast" value={p.contrastMode} onChange={contrastMode => updateDraft({ contrastMode: contrastMode as AppearancePreferences["contrastMode"] })}><option value="standard">Standard</option><option value="high">High contrast</option></Choice><Choice label="Motion" value={String(p.reducedMotion)} onChange={value => updateDraft({ reducedMotion: value === "system" ? "system" : value === "true" })}><option value="system">Follow system</option><option value="true">Reduce motion</option><option value="false">Allow standard motion</option></Choice></fieldset>}
        </div>
      </div><div className="appearance-preview-panel"><div className="preview-panel-header"><div><h3>Live preview</h3><p>{STYLE_PRESENTATIONS[p.uiStyle].name} · {p.colorPalette} · {isDirty ? "Not applied" : "Current appearance"}</p></div>{!compact && <div className="preview-device-controls"><button aria-label="Desktop preview" aria-pressed={!mobilePreview} type="button" onClick={() => setMobilePreview(false)}><DotIcon name="windows" size={17} aria-hidden="true" /></button><button aria-label="Mobile preview" aria-pressed={mobilePreview} type="button" onClick={() => setMobilePreview(true)}><DotIcon name="box" size={17} aria-hidden="true" /></button></div>}</div><div className="preview-stage"><AppearancePreview preferences={p} mobile={mobilePreview} /></div></div></div>
    </fieldset>
    <footer className="appearance-actions"><div className="appearance-action-status"><p role="status" aria-live="polite">{status}</p>{!compact && <button type="button" className="appearance-reset" onClick={reset} disabled={busy}><DotIcon name="arrowRight" className="rotate-180" size={14} aria-hidden="true" />Reset to defaults</button>}</div><div className="appearance-action-buttons"><PixelButton type="button" variant="secondary" size="sm" disabled={!isDirty || busy} onClick={() => { discard(); setApplied(false); }}>Discard changes</PixelButton><PixelButton type="button" size="sm" disabled={!isDirty || busy} onClick={async () => { if (await apply()) { setApplied(true); onApplied?.(); } }}><DotIcon name="circleCheck" size={16} aria-hidden="true" />{isApplying ? "Applying…" : "Apply changes"}</PixelButton></div></footer>
  </section>;
}
