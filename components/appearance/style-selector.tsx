"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { useAppearance } from "@/hooks/use-appearance";

const styles = [
  { id: "pixel-arcade", name: "Pixel Arcade", description: "Neon accents, pixel headings, tactile edges." },
  { id: "minimal-saas", name: "Minimal SaaS", description: "Quiet surfaces, soft corners, room to think." },
  { id: "studio-crm", name: "Studio / CRM", description: "Structured panels, technical type, efficient space." },
] as const;

export function StyleSelector() {
  const { preferences, effectiveColorMode, setStyle, persistenceStatus } = useAppearance();
  const id = useId();
  return (
    <fieldset disabled={persistenceStatus === "loading"} className="min-w-0">
      <legend className="mb-3 font-heading text-lg">Interface style</legend>
      <p className="mb-4 text-sm text-muted-foreground">Select a preview to apply it everywhere.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {styles.map(style => (
          <label key={style.id} className="relative min-w-0 cursor-pointer">
            <input className="peer sr-only" type="radio" name={id} value={style.id}
              checked={preferences.uiStyle === style.id} onChange={() => setStyle(style.id)} />
            <span className="block h-full overflow-hidden border-2 border-border [border-radius:var(--radius-card)] peer-checked:border-[var(--color-ring)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[var(--color-ring)]">
              <span aria-hidden="true" data-ui-style={style.id} data-color-mode={effectiveColorMode} data-contrast="standard"
                className="appearance-style-preview flex h-28 overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text-main)]">
                <span className="flex w-1/4 flex-col gap-2 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <span className="h-2 w-full bg-[var(--color-accent)]" />
                  <span className="h-1.5 w-full bg-[var(--color-text-muted)]" />
                  <span className="h-1.5 w-2/3 bg-[var(--color-text-muted)]" />
                </span>
                <span className="flex flex-1 flex-col gap-2 p-3">
                  <span className="text-left text-sm [font-family:var(--font-heading-active)]">Your workspace</span>
                  <span className="flex flex-1 gap-2">
                    <span className="flex-1 border border-[var(--color-border)] bg-[var(--color-surface)] p-2 [border-radius:var(--radius-card)] [box-shadow:var(--shadow-card)]"><span className="block h-1.5 w-3/4 bg-[var(--color-text-muted)]" /></span>
                    <span className="w-1/3 bg-[var(--color-elevated)] [border-radius:var(--radius-card)]" />
                  </span>
                  <span className="h-2 w-1/3 bg-[var(--color-primary)] [border-radius:var(--radius-btn)]" />
                </span>
              </span>
              <span className="block p-3">
                <span className="flex items-center justify-between gap-2 font-semibold">{style.name}{preferences.uiStyle === style.id && <Check aria-label="Active style" className="size-4 shrink-0" />}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{style.description}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function AppearanceSaveStatus() {
  const { persistenceStatus, persistenceMessage } = useAppearance();
  const messages = {
    loading: "Loading appearance…", saving: "Saving appearance…", saved: "Appearance saved on this device.",
    session: "Appearance applies for this session. Browser storage is unavailable.",
    error: "Appearance changed, but could not be saved. Check browser storage permissions and try again.",
  };
  return <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{persistenceMessage || messages[persistenceStatus]}</p>;
}
