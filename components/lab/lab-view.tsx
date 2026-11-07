"use client";

import { DotIcon } from "@/components/retro/dot-icon";
import { BreadboardSim } from "./breadboard-sim";
import { ChassisPreview } from "./chassis-preview";

const ROADMAP = [
  { title: "Simulate Arduino", body: "Wire parts on a breadboard and run your sketch.", status: "Preview", tile: "tile-mint", icon: "play" },
  { title: "Design in 3D", body: "Lay out boards and parts for a dashboard or landing page.", status: "Preview", tile: "tile-lavender", icon: "box" },
  { title: "Auto chassis", body: "Exeku lays out your prototype's parts and designs the case around them, like this desk clock, ready to 3D print.", status: "Planned", tile: "tile-peach", icon: "download" },
];

export function LabView() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--color-primary-text)]">Hardware Lab · Preview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Build it, run it, print it</h1>
          <p className="mt-1 max-w-[65ch] text-sm text-[var(--color-text-muted)]">Prototype on the breadboard: edit the sketch and press Run. Then see where it ends up: the same kind of parts organized into a finished, printable product.</p>
        </div>
      </header>

      <section aria-labelledby="sim-heading" className="space-y-3">
        <h2 id="sim-heading" className="text-lg font-semibold">Breadboard simulator</h2>
        <BreadboardSim />
      </section>

      <section aria-labelledby="chassis-heading" id="chassis" className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 id="chassis-heading" className="text-lg font-semibold">From prototype to product</h2>
          <ChassisPreview />
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">What is coming</h2>
          <ol className="space-y-3">
            {ROADMAP.map((step, i) => (
              <li key={step.title} className={`skeuo-card ${step.tile} flex gap-3 rounded-xl border border-[var(--color-border)] p-3`}>
                <span className="skeuo-key grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-surface)]"><DotIcon name={step.icon} size={16} aria-hidden="true" /></span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold"><span className="font-code text-xs text-[var(--color-text-muted)]">{i + 1}</span>{step.title}
                    <span className="rounded-full bg-[var(--color-surface)] px-2 text-xs font-medium text-[var(--color-text-muted)]">{step.status}</span></p>
                  <p className="text-sm text-[var(--color-text-muted)]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
