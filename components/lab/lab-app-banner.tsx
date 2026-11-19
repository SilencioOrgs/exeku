"use client";

import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Box } from "lucide-react";
import { useAppearance } from "@/hooks/use-appearance";
import { LAB_APP } from "@/lib/lab-app";
import { cn } from "@/lib/utils";
import { CircuitView } from "./circuit-view";

function DownloadButtons({ size = "default" }: { size?: "default" | "sm" | "lg" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LAB_APP.downloads.map((d, i) =>
        d.url ? (
          <a key={d.id} href={d.url} className={buttonVariants({ variant: i === 0 ? "default" : "outline", size })}>
            <d.icon size={15} aria-hidden="true" />{d.label}
          </a>
        ) : (
          <Button key={d.id} type="button" variant="outline" size={size} disabled title="Coming soon">
            <d.icon size={15} aria-hidden="true" />{d.label} · coming soon
          </Button>
        ),
      )}
    </div>
  );
}

/** Slim promo for the dashboard. */
export function LabAppStrip({ className }: { className?: string }) {
  return (
    <aside aria-label={`${LAB_APP.name} app`} className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3", className)}>
      <Box size={18} aria-hidden="true" className="text-[var(--color-primary-text)]" />
      <p className="min-w-0 flex-1 text-sm">
        <strong className="font-medium">{LAB_APP.name}</strong>
        <span className="text-[var(--color-text-muted)]"> · simulate Arduino and MCU projects in 3D, on desktop and mobile.</span>
      </p>
      <DownloadButtons size="sm" />
    </aside>
  );
}

/** Landing banner: a live 3D board next to the app pitch. */
export function LabAppShowcase() {
  const { effectiveReducedMotion } = useAppearance();
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [ledOn, setLedOn] = useState(true);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (effectiveReducedMotion || !visible) return;
    const id = window.setInterval(() => setLedOn((on) => !on), 700);
    return () => window.clearInterval(id);
  }, [effectiveReducedMotion, visible]);

  return (
    <section ref={sectionRef} id="lab-app" aria-labelledby="lab-app-heading" className="border-b border-[var(--color-border)] py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="skeuo-card tile-peach grid items-center gap-6 overflow-hidden rounded-3xl border border-[var(--color-border)] p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="font-code text-xs font-medium text-[var(--color-primary-text)]">Also from Exeku</p>
            <h2 id="lab-app-heading" className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{LAB_APP.name}: code that leaves the screen.</h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-text-muted)] md:text-lg">
              A separate app for hardware: wire an Arduino or MCU on a 3D breadboard, run the sketch, then turn the prototype into a printable case.
            </p>
            <div className="mt-6"><DownloadButtons size="lg" /></div>
          </div>
          <CircuitView
            ledOn={ledOn}
            interactive={false}
            view={[95, 105, 145]}
            className="pointer-events-none h-64 sm:h-80"
            label="A 3D Arduino Uno wired to a breadboard with a blinking red LED, from the Exeku Lab app."
          />
        </div>
      </div>
    </section>
  );
}
