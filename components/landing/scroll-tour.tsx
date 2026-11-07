"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { buttonVariants } from "@/components/ui/button";
import { DotIcon } from "@/components/retro/dot-icon";
import { cn } from "@/lib/utils";
import { CLOCK_CASE, CLOCK_PARTS } from "@/lib/three/clock-spec";

type Vec = [number, number, number];
/** Camera position and look-at target for each step, relative to the circuit's center. */
const SHOTS: Array<{ pos: Vec; look: Vec }> = [
  { pos: [-5, 95, 115], look: [-44, 4, 0] },
  { pos: [30, 175, 95], look: [8, 6, -8] },
  { pos: [78, 52, 48], look: [36, 14, -11] },
  { pos: [115, 195, 170], look: [0, 14, 0] },
  { pos: [-120, 80, 225], look: [0, 22, 0] },
];

const STEPS = [
  { kicker: "01 · Write", title: "Start with a sketch", body: "Write Arduino code in the same editor you use for problems, with VS Code colors and shortcuts." },
  { kicker: "02 · Wire", title: "Wire a real breadboard", body: "Pin 13 to a 220 Ω resistor, the resistor to the LED, the LED back to ground. Parts are modeled to the millimetre." },
  { kicker: "03 · Run", title: "Press Run. Watch it blink.", body: "The sketch runs step by step. The LED and the board's own L light follow pin 13, and Serial prints to the monitor." },
  { kicker: "04 · Organize", title: "From breadboard to a real build", body: "The same kind of parts, laid out on a tidy carrier board, with a case printed around them: a window for the display, holes for the buttons, a port for USB." },
  { kicker: "05 · Print", title: "Close it. Print it. Use it.", body: "The prototype becomes a desk clock you can keep on your table. STL export is next on the roadmap." },
];

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp = (t: number) => Math.min(1, Math.max(0, t));

export function ScrollTour() {
  const sectionRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const { effectiveReducedMotion } = useAppearance();

  // Scroll position -> 0..1 progress through the pinned section.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const p = clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
      progressRef.current = p;
      setStep(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const [THREE, { createStage }, { buildCircuit }, { buildClock }, { applyModelOverrides }] = await Promise.all([
        import("three"), import("@/lib/three/stage"), import("@/lib/three/circuit"), import("@/lib/three/clock"), import("@/lib/three/overrides"),
      ]);
      if (disposed) return;
      const stage = createStage(mount, { fov: 30 });
      const circuit = buildCircuit();
      const center = circuit.bounds.getCenter(new THREE.Vector3()).setY(0);
      // The finished product the prototype turns into, in the same spot.
      const clock = buildClock();
      clock.group.position.copy(center);
      stage.scene.add(circuit.group, clock.group);
      void applyModelOverrides(circuit.group, () => disposed);
      const pos = new THREE.Vector3(), look = new THREE.Vector3(), lookNow = new THREE.Vector3();
      const a = new THREE.Vector3(), b = new THREE.Vector3();

      // Hold each step's shot, then glide to the next one over the last 40% of the step.
      const shotAt = (p: number) => {
        const x = p * STEPS.length;
        const i = Math.min(STEPS.length - 1, Math.floor(x));
        const j = Math.min(STEPS.length - 1, i + 1);
        const f = ease(clamp((x - i - 0.6) / 0.4));
        pos.copy(a.fromArray(SHOTS[i].pos).lerp(b.fromArray(SHOTS[j].pos), f)).add(center);
        look.copy(a.fromArray(SHOTS[i].look).lerp(b.fromArray(SHOTS[j].look), f)).add(center);
        // Narrow screens see less sideways, so step the camera back.
        if (stage.camera.aspect < 1) pos.sub(look).multiplyScalar(1.9 - stage.camera.aspect * 0.6).add(look);
      };
      // Desktop: push the subject right of the text column. Phone: push it up above the text card.
      let lastW = 0, lastH = 0;
      const frameSubject = () => {
        const { width: w, height: h } = stage.renderer.domElement;
        if (w === lastW && h === lastH) return;
        lastW = w; lastH = h;
        if (window.innerWidth >= 768) stage.camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
        else stage.camera.setViewOffset(w, h, 0, h * 0.1, w, h);
      };
      shotAt(progressRef.current);
      stage.camera.position.copy(pos);
      lookNow.copy(look);

      stage.onFrame((time, delta) => {
        frameSubject();
        const p = progressRef.current;
        shotAt(p);
        const k = effectiveReducedMotion ? 1 : 1 - Math.exp(-delta * 5);
        stage.camera.position.lerp(pos, k);
        lookNow.lerp(look, k);
        stage.camera.lookAt(lookNow);
        // Blink once the sketch is "running" (step 3 onward).
        const running = p >= 2 / STEPS.length - 0.01;
        circuit.setLed(running && (effectiveReducedMotion || Math.floor(time * 2) % 2 === 0));
        // Step 4 swaps the breadboard for the organized build and prints the walls; step 5 closes the lid.
        const product = p >= 0.6;
        circuit.group.visible = !product;
        clock.group.visible = product;
        clock.setBuild(ease(clamp((p - 0.6) / 0.12)));
        clock.setOpen(1 - ease(clamp((p - 0.8) / 0.08)));
        const now = new Date();
        clock.setTime(now.getHours(), now.getMinutes(), effectiveReducedMotion || now.getSeconds() % 2 === 0);
      });
      setReady(true);
      cleanup = () => { stage.dispose(); };
    })();
    return () => { disposed = true; cleanup(); };
  }, [effectiveReducedMotion]);

  return (
    <section id="tour" ref={sectionRef} aria-label="How the Hardware Lab works" className="relative border-b border-[var(--color-border)]" style={{ height: `${STEPS.length * 100}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-70" />
        <div aria-hidden="true" className="pointer-events-none absolute top-1/2 right-0 h-[70vh] w-[70vw] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_161_22/0.14),transparent)]" />
        <div ref={mountRef} className="absolute inset-0" role="img" aria-label="3D tour: an Arduino blink circuit on a breadboard turns into a finished, printed desk clock as you scroll.">
          {!ready && <span className="absolute inset-0 grid place-items-center text-sm text-[var(--color-text-muted)]">Loading 3D parts…</span>}
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[var(--color-canvas)] via-[var(--color-canvas)]/80 to-transparent md:hidden" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] bg-gradient-to-r from-[var(--color-canvas)] via-[var(--color-canvas)]/85 to-transparent md:block" />
        <div className="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-8 sm:px-6 md:items-center md:pb-0 lg:px-8">
          <div className="relative w-full max-w-md">
            <ol className="mb-5 flex gap-1.5" aria-hidden="true">
              {STEPS.map((s, i) => (
                <li key={s.kicker} className={cn("h-1 flex-1 rounded-full transition-colors duration-500", i <= step ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]")} />
              ))}
            </ol>
            <div className="grid">
              {STEPS.map((s, i) => (
                <article
                  key={s.kicker}
                  inert={i !== step}
                  className={cn(
                    "col-start-1 row-start-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/85 p-5 backdrop-blur transition-all duration-500 md:bg-transparent md:p-0 md:backdrop-blur-none md:border-0",
                    i === step ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
                  )}
                >
                  <p className="font-code text-xs font-medium text-[var(--color-primary-text)]">{s.kicker}</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">{s.title}</h2>
                  <p className="mt-3 text-base leading-relaxed text-[var(--color-text-muted)] md:text-lg">{s.body}</p>
                  <StepDetail index={i} />
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepDetail({ index }: { index: number }) {
  const box = "mt-5 hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3";
  if (index === 0) return (
    <pre className={cn(box, "code-editor font-code text-xs leading-5 md:block")}>
      <span className="tok-keyword">void</span> <span className="tok-function">loop</span>() {"{\n"}
      {"  "}<span className="tok-function">digitalWrite</span>(<span className="tok-number">13</span>, <span className="tok-constant">HIGH</span>);{"\n"}
      {"  "}<span className="tok-function">delay</span>(<span className="tok-number">500</span>);{"\n"}
      {"  "}<span className="tok-function">digitalWrite</span>(<span className="tok-number">13</span>, <span className="tok-constant">LOW</span>);{"\n"}
      {"  "}<span className="tok-function">delay</span>(<span className="tok-number">500</span>);{"\n}"}
    </pre>
  );
  if (index === 1) return (
    <ol className={cn(box, "font-code flex-wrap items-center gap-2 text-xs md:flex")}>
      {["Pin 13", "220 Ω", "LED", "GND"].map((part, i) => (
        <li key={part} className="flex items-center gap-2">
          {i > 0 && <DotIcon name="arrowRight" size={12} aria-hidden="true" className="text-[var(--color-text-muted)]" />}
          <span className={cn("rounded-md border px-2 py-1", i === 0 ? "border-[var(--color-primary)] text-[var(--color-primary-text)]" : "border-[var(--color-border)]")}>{part}</span>
        </li>
      ))}
    </ol>
  );
  if (index === 2) return <pre className={cn(box, "font-code text-xs leading-5 text-[var(--color-text-muted)] md:block")}>{"> LED on\n> LED off\n> LED on"}</pre>;
  if (index === 3) return (
    <ul className={cn(box, "flex-wrap gap-1.5 text-xs md:flex")} aria-label="Parts inside">
      {CLOCK_PARTS.map((part) => <li key={part} className="rounded-md border border-[var(--color-border)] bg-[var(--color-elevated)] px-2 py-0.5">{part}</li>)}
      <li className="font-code px-1 py-0.5 text-[var(--color-text-muted)]">{CLOCK_CASE.w} × {CLOCK_CASE.d} × {CLOCK_CASE.h} mm</li>
    </ul>
  );
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <Link href="/app/lab" className={buttonVariants({ size: "lg" })}><DotIcon name="play" size={15} aria-hidden="true" />Click to simulate</Link>
      <Link href="/app/lab#chassis" className={buttonVariants({ variant: "outline", size: "lg" })}>See the finished build</Link>
    </div>
  );
}
