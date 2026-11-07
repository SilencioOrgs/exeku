"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DotIcon } from "@/components/retro/dot-icon";
import { CLOCK_CASE, CLOCK_PARTS } from "@/lib/three/clock-spec";
import { ClockView } from "./clock-view";

/**
 * The finished product a prototype becomes: an Arduino desk clock in a printed case,
 * with the parts organized inside instead of on a breadboard.
 * shortcut: one hand-modeled template (desk clock); upgrade by generating the layout from the student's own project.
 */
export function ChassisPreview() {
  const [open, setOpen] = useState(false);
  const size = `${CLOCK_CASE.w}×${CLOCK_CASE.d}×${CLOCK_CASE.h} mm`;

  return (
    <div className="skeuo-card overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-sm font-medium">Desk clock · finished build</span>
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="sm" aria-pressed={open} onClick={() => setOpen((v) => !v)}>
            <DotIcon name={open ? "box" : "search"} size={14} aria-hidden="true" />{open ? "Close the case" : "Look inside"}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled title="Coming soon">
            <DotIcon name="download" size={14} aria-hidden="true" />Export STL
          </Button>
        </div>
      </div>
      <ClockView
        open={open}
        view={[110, 85, 150]}
        className="bg-grid h-80 sm:h-96"
        label={`3D model of a finished Arduino desk clock in an orange printed case, ${size}, showing the current time on a 4-digit display.${open ? " The lid is lifted to show the Nano, real-time clock, display and buzzer laid out inside." : ""} Drag to rotate.`}
      />
      <div className="grid gap-3 border-t border-[var(--color-border)] px-3 py-3 text-xs sm:grid-cols-[auto_1fr]">
        <dl className="font-code grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="text-[var(--color-text-muted)]">Case</dt><dd>{size}</dd>
          <dt className="text-[var(--color-text-muted)]">Wall</dt><dd>{CLOCK_CASE.wall} mm PLA</dd>
        </dl>
        <ul className="flex flex-wrap gap-1.5" aria-label="Parts inside">
          {CLOCK_PARTS.map((part) => <li key={part} className="rounded-md border border-[var(--color-border)] bg-[var(--color-elevated)] px-2 py-0.5">{part}</li>)}
        </ul>
      </div>
    </div>
  );
}
