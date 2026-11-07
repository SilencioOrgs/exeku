"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { DotIcon, type DotIconName } from "@/components/retro/dot-icon";
import { BreadboardScene } from "@/components/lab/breadboard-scene";

const STEPS: Array<{ icon: DotIconName; title: string; body: string; tile: string }> = [
  { icon: "play", title: "Simulate", body: "Write a sketch, press Run, watch the LED and the serial monitor.", tile: "tile-mint" },
  { icon: "box", title: "Design in 3D", body: "Spin the parts in a Three.js scene for a dashboard or landing page.", tile: "tile-lavender" },
  { icon: "download", title: "Print the case", body: "Exeku sizes an enclosure around your breadboard, ready to print.", tile: "tile-peach" },
];

/** Landing teaser for the Hardware Lab. The LED blinks on its own unless the visitor prefers reduced motion. */
export function LabTeaser() {
  const [ledOn, setLedOn] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setLedOn((on) => !on), 700);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section id="lab" className="border-b border-[var(--color-border)] bg-[var(--color-canvas)] py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
        <div>
          <span className="rounded-full bg-[var(--tint-lavender)] px-3 py-1 text-xs font-semibold text-[var(--color-text-main)]">Hardware Lab · Preview</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-4xl md:text-5xl">
            Code that blinks.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
            Practice Arduino on a virtual breadboard, then get a 3D-printable chassis that fits the prototype. No kit needed to start.
          </p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className={`skeuo-card ${step.tile} rounded-2xl border border-[var(--color-border)] p-4`}>
                <span className="skeuo-key inline-grid size-9 place-items-center rounded-lg bg-[var(--color-surface)]">
                  <DotIcon name={step.icon} size={16} aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-[var(--color-text-main)]"><span className="font-code text-[var(--color-text-muted)]">{i + 1}</span> {step.title}</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
          <Link href="/app/lab" className={buttonVariants({ size: "lg", className: "mt-8" })}>
            <DotIcon name="play" size={16} aria-hidden="true" />Click to simulate
          </Link>
        </div>
        <div className="skeuo-card tile-sky rounded-3xl border border-[var(--color-border)] p-4 sm:p-6">
          <div className="rounded-2xl bg-[var(--color-surface)] p-3 shadow-[var(--shadow-inset)]">
            <BreadboardScene ledOn={ledOn} className="h-auto w-full" />
          </div>
          <p className="font-code mt-3 text-xs text-[var(--color-text-muted)]">digitalWrite(13, {ledOn ? "HIGH" : "LOW"});</p>
        </div>
      </div>
    </section>
  );
}
