"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DotIcon } from "@/components/retro/dot-icon";
import { CodeEditor } from "@/components/app/code-editor";
import { CircuitView } from "./circuit-view";
import { BLINK_SKETCH, parseSketch } from "@/lib/lab/blink";

const WIRED_PIN = 13;

/** Edit the blink sketch, press Run, and watch the LED on the breadboard follow it. */
export function BreadboardSim() {
  const [code, setCode] = useState(BLINK_SKETCH);
  const [running, setRunning] = useState(false);
  const [ledOn, setLedOn] = useState(false);
  const [serial, setSerial] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setRunning(false);
    setLedOn(false);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const run = () => {
    stop();
    const sketch = parseSketch(code);
    if (sketch.error) { setProblem(sketch.error); return; }
    const writesWiredPin = sketch.steps.some((s) => s.kind === "write" && s.pin === WIRED_PIN);
    setProblem(writesWiredPin ? null : `Your sketch never writes pin ${WIRED_PIN}. The LED on this breadboard is wired to pin ${WIRED_PIN}.`);
    if (writesWiredPin && !sketch.outputPins.includes(WIRED_PIN)) setProblem(`Tip: add pinMode(${WIRED_PIN}, OUTPUT) in setup(). Real boards need it.`);
    setSerial([]);
    setRunning(true);
    let index = 0;
    const tick = () => {
      // Run statements until a delay, then wait, like the real loop().
      for (let guard = 0; guard < sketch.steps.length; guard++) {
        const step = sketch.steps[index];
        index = (index + 1) % sketch.steps.length;
        if (step.kind === "write" && step.pin === WIRED_PIN) setLedOn(step.high);
        if (step.kind === "print") setSerial((lines) => [...lines.slice(-49), step.text]);
        if (step.kind === "delay") { timer.current = setTimeout(tick, step.ms); return; }
      }
    };
    tick();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="skeuo-card flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
          <span className="font-code text-sm">blink.ino</span>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => { stop(); setCode(BLINK_SKETCH); setProblem(null); setSerial([]); }}>
              <DotIcon name="reset" size={14} aria-hidden="true" />Reset
            </Button>
            {running
              ? <Button type="button" variant="outline" size="sm" onClick={stop}><DotIcon name="close" size={14} aria-hidden="true" />Stop</Button>
              : <Button type="button" size="sm" onClick={run}><DotIcon name="play" size={14} aria-hidden="true" />Run</Button>}
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor filename="blink.ino" value={code} onChange={(next) => { setCode(next); if (running) stop(); }} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="skeuo-card bg-grid relative overflow-hidden rounded-xl border border-[var(--color-border)]">
          <CircuitView ledOn={ledOn} view={[80, 95, 120]} className="h-72 sm:h-80" label={`Arduino Uno wired to a breadboard: pin 13, a 220 ohm resistor and a red LED, which is ${ledOn ? "on" : "off"}. Drag to rotate.`} />
          <span className="absolute top-3 right-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-medium" aria-live="polite">
            {running ? (ledOn ? "LED on" : "LED off") : "Stopped"}
          </span>
        </div>
        {problem && <p role="status" className="tile-butter rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">{problem}</p>}
        <div className="skeuo-card overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5"><DotIcon name="powershell" size={13} aria-hidden="true" />Serial monitor · 9600 baud</span>
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => setSerial([])}>Clear</button>
          </div>
          <pre className="font-code h-28 overflow-y-auto px-3 py-2 text-xs" aria-live="off">{serial.length ? serial.join("\n") : "Press Run to start the sketch."}</pre>
        </div>
      </div>
    </div>
  );
}
