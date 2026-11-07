"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DotIcon } from "@/components/retro/dot-icon";
import { CircuitView } from "./circuit-view";

const WALL = 2.4;

/**
 * The blink circuit inside an enclosure sized from its real parts (see buildEnclosure).
 * shortcut: the layout is the fixed blink circuit; upgrade by measuring the student's own Lab layout.
 */
export function ChassisPreview() {
  const [showLid, setShowLid] = useState(false);
  const [outer, setOuter] = useState<{ w: number; d: number; h: number } | null>(null);
  const size = outer ? `${outer.w.toFixed(0)}×${outer.d.toFixed(0)}×${outer.h.toFixed(0)} mm` : "Measuring…";

  return (
    <div className="skeuo-card overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-sm font-medium">Auto chassis</span>
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="sm" aria-pressed={showLid} onClick={() => setShowLid((v) => !v)}>
            {showLid ? "Hide lid" : "Show lid"}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled title="Coming soon">
            <DotIcon name="download" size={14} aria-hidden="true" />Export STL
          </Button>
        </div>
      </div>
      <CircuitView
        ledOn
        chassis
        lidOn={showLid}
        view={[120, 230, 190]}
        onSize={setOuter}
        className="bg-grid h-80 sm:h-96"
        label={`3D preview of a ${size} printed enclosure around an Arduino Uno and a half breadboard. Drag to rotate.`}
      />
      <dl className="font-code grid grid-cols-3 gap-2 border-t border-[var(--color-border)] px-3 py-2 text-center text-xs">
        <div><dt className="text-[var(--color-text-muted)]">Size</dt><dd>{size}</dd></div>
        <div><dt className="text-[var(--color-text-muted)]">Wall</dt><dd>{WALL} mm</dd></div>
        <div><dt className="text-[var(--color-text-muted)]">Fits</dt><dd>Uno + half board</dd></div>
      </dl>
    </div>
  );
}
