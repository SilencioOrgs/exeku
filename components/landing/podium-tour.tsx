"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { useProfile } from "@/hooks/use-profile";
import { buttonVariants } from "@/components/ui/button";
import { DotIcon } from "@/components/retro/dot-icon";
import { cn } from "@/lib/utils";

/** Zones are laid out along X so the camera can fly between them. */
const ZONE = { arena: 0, team: 900, podium: 1800 } as const;
type Vec = [number, number, number];
const SHOTS: Array<{ pos: Vec; look: Vec }> = [
  { pos: [0, 190, 700], look: [0, 98, 0] },
  { pos: [-250, 190, 175], look: [-55, 108, 0] },
  { pos: [ZONE.team, 300, 720], look: [ZONE.team, 90, 0] },
  { pos: [ZONE.team, 170, 340], look: [ZONE.team, 135, 0] },
  { pos: [ZONE.podium, 175, 680], look: [ZONE.podium, 140, 0] },
];

const STEPS = [
  { kicker: "01 · Match", icon: "versus", title: "Sit down with your rival", body: "Same problem, same clock. A one-on-one round is the fastest way to find out what you really know." },
  { kicker: "02 · Solve", icon: "check", title: "Ten out of ten", body: "Read, code, run, submit. Every submission is judged on hidden tests until the verdict says Accepted." },
  { kicker: "03 · Team up", icon: "users", title: "Bring your team", body: "Three coders, one scoreboard. Split the problem set and share the clock. Team rounds are coming soon." },
  { kicker: "04 · Climb", icon: "ranking", title: "Climb the leaderboard", body: "Every accepted solution moves your team up the table. Leaderboards are coming soon." },
  { kicker: "05 · Win", icon: "trophy", title: "Take the podium", body: "Practice here until contest day feels familiar. Then go get the trophy." },
] as const;

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp = (t: number) => Math.min(1, Math.max(0, t));

export function PodiumTour() {
  const sectionRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const { effectiveReducedMotion } = useAppearance();
  const { profile } = useProfile();

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
      const [THREE, { createStage }, { buildArena }, { buildTeamZone, buildPodiumZone }] = await Promise.all([
        import("three"), import("@/lib/three/stage"), import("@/lib/three/arena"), import("@/lib/three/journey"),
      ]);
      if (disposed) return;
      const stage = createStage(mount, { fov: 30, shadowExtent: 280 });
      stage.scene.environmentIntensity = 0.35;
      const arena = buildArena();
      const team = buildTeamZone();
      team.group.position.x = ZONE.team;
      const podium = buildPodiumZone();
      podium.group.position.x = ZONE.podium;
      stage.scene.add(arena.group, team.group, podium.group);

      const pos = new THREE.Vector3(), look = new THREE.Vector3(), lookNow = new THREE.Vector3();
      const a = new THREE.Vector3(), b = new THREE.Vector3();
      const keyOffset = stage.key.position.clone();
      // Hold each step's shot, then glide to the next over the last 40% of the step.
      const shotAt = (p: number) => {
        const x = p * STEPS.length;
        const i = Math.min(STEPS.length - 1, Math.floor(x));
        const j = Math.min(STEPS.length - 1, i + 1);
        const f = ease(clamp((x - i - 0.6) / 0.4));
        pos.copy(a.fromArray(SHOTS[i].pos).lerp(b.fromArray(SHOTS[j].pos), f));
        look.copy(a.fromArray(SHOTS[i].look).lerp(b.fromArray(SHOTS[j].look), f));
        if (stage.camera.aspect < 1) pos.sub(look).multiplyScalar(1.9 - stage.camera.aspect * 0.6).add(look);
      };
      let lastW = 0, lastH = 0;
      const frameSubject = () => {
        const { width: w, height: h } = stage.renderer.domElement;
        if (w === lastW && h === lastH) return;
        lastW = w; lastH = h;
        if (window.innerWidth >= 768) stage.camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
        else stage.camera.setViewOffset(w, h, 0, h * 0.12, w, h);
      };
      shotAt(progressRef.current);
      stage.camera.position.copy(pos);
      lookNow.copy(look);

      stage.onFrame((time, delta) => {
        frameSubject();
        const p = progressRef.current;
        shotAt(p);
        // Podium shot drifts slowly so the scene never looks frozen.
        if (p > 0.8 && !effectiveReducedMotion) pos.x += Math.sin(time * 0.3) * 60;
        const k = effectiveReducedMotion ? 1 : 1 - Math.exp(-delta * 4);
        stage.camera.position.lerp(pos, k);
        lookNow.lerp(look, k);
        stage.camera.lookAt(lookNow);
        // Keep the key light (and its shadows) on whatever zone we are looking at.
        stage.key.target.position.copy(lookNow).setY(0);
        stage.key.position.copy(stage.key.target.position).add(keyOffset);
        const t = effectiveReducedMotion ? 0 : time;
        arena.update(t, p >= 1 / STEPS.length);
        team.update(t, ease(clamp((p - 0.6) / 0.06)), ease(clamp((p - 0.62) / 0.14)));
        podium.update(t);
      });
      setReady(true);
      cleanup = () => stage.dispose();
    })();
    return () => { disposed = true; cleanup(); };
  }, [effectiveReducedMotion]);

  return (
    <section id="journey" ref={sectionRef} aria-label="From your first match to the podium" className="relative border-b border-[var(--color-border)]" style={{ height: `${STEPS.length * 100}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-60" />
        <div ref={mountRef} className="absolute inset-0" role="img" aria-label="3D tour: a student codes against a rival, joins a team round, climbs the leaderboard and lifts the trophy on the podium.">
          {!ready && <span className="absolute inset-0 grid place-items-center text-sm text-[var(--color-text-muted)]">Loading 3D scene…</span>}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[var(--color-canvas)] via-[var(--color-canvas)]/80 to-transparent md:hidden" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden w-[56%] bg-gradient-to-r from-[var(--color-canvas)] via-[var(--color-canvas)]/85 to-transparent md:block" />

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
                    "col-start-1 row-start-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/85 p-5 backdrop-blur transition-all duration-500 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
                    i === step ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
                  )}
                >
                  <p className="font-code flex items-center gap-2 text-xs font-medium text-[var(--color-primary-text)]">
                    <DotIcon name={s.icon} size={14} aria-hidden="true" />{s.kicker}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">{s.title}</h2>
                  <p className="mt-3 text-base leading-relaxed text-[var(--color-text-muted)] md:text-lg">{s.body}</p>
                  {i === STEPS.length - 1 && (
                    <Link href={profile ? "/app/challenges" : "/setup"} className={buttonVariants({ size: "lg", className: "mt-6" })}>
                      Start practicing<DotIcon name="arrowRight" size={16} aria-hidden="true" />
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
