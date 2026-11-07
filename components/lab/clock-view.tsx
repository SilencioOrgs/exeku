"use client";

import { useEffect, useRef, useState } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { cn } from "@/lib/utils";

export interface ClockViewProps {
  /** Lift the lid to show the organized parts. */
  open?: boolean;
  interactive?: boolean;
  view?: [number, number, number];
  className?: string;
  label: string;
}

/** The finished Arduino desk clock in its printed case, showing the real time. */
export function ClockView({ open = false, interactive = true, view = [120, 95, 150], className, label }: ClockViewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { effectiveReducedMotion } = useAppearance();
  const [vx, vy, vz] = view;

  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      try {
        const [THREE, { createStage }, { buildClock, CLOCK_CASE }] = await Promise.all([import("three"), import("@/lib/three/stage"), import("@/lib/three/clock")]);
        if (disposed) return;
        const stage = createStage(mount, { orbit: interactive, autoRotate: interactive && !effectiveReducedMotion, shadowExtent: 120 });
        const clock = buildClock();
        stage.scene.add(clock.group);
        const target = new THREE.Vector3(0, CLOCK_CASE.h / 2, 0);
        stage.camera.position.set(vx, vy, vz);
        stage.camera.lookAt(target);
        if (stage.controls) {
          stage.controls.target.copy(target);
          stage.controls.minDistance = 120;
          stage.controls.maxDistance = 360;
        }
        let openNow = openRef.current ? 1 : 0;
        let wasOpen = openRef.current;
        // Opening moves the camera above the case so you can see down inside; closing returns it.
        const closedView = new THREE.Vector3(vx, vy, vz);
        const openView = new THREE.Vector3(vx * 0.4, 205, vz * 0.75);
        let tween = 0;
        const from = new THREE.Vector3();
        stage.onFrame((time, delta) => {
          if (stage.controls && openRef.current !== wasOpen) {
            wasOpen = openRef.current;
            from.copy(stage.camera.position);
            tween = effectiveReducedMotion ? 1 : 0.0001;
          }
          if (stage.controls && tween > 0) {
            tween = Math.min(1, tween + delta * 1.4);
            const k = tween * tween * (3 - 2 * tween);
            stage.camera.position.lerpVectors(from, wasOpen ? openView : closedView, k);
            if (tween >= 1) tween = 0;
          }
          const now = new Date();
          clock.setTime(now.getHours(), now.getMinutes(), effectiveReducedMotion || now.getSeconds() % 2 === 0);
          const want = openRef.current ? 1 : 0;
          openNow += (want - openNow) * (effectiveReducedMotion ? 1 : 1 - Math.exp(-delta * 6));
          clock.setOpen(openNow);
          if (!stage.controls && !effectiveReducedMotion) {
            const a = Math.atan2(vz, vx) + Math.sin(time * 0.3) * 0.3, r = Math.hypot(vx, vz);
            stage.camera.position.set(Math.cos(a) * r, vy, Math.sin(a) * r);
            stage.camera.lookAt(target);
          }
        });
        setReady(true);
        cleanup = () => stage.dispose();
      } catch {
        if (!disposed) setFailed(true);
      }
    })();
    return () => { disposed = true; cleanup(); };
  }, [interactive, effectiveReducedMotion, vx, vy, vz]);

  return (
    <div ref={mountRef} role="img" aria-label={label} className={cn("relative w-full overflow-hidden", interactive && "touch-none cursor-grab active:cursor-grabbing", className)}>
      {!ready && <span className="absolute inset-0 grid place-items-center text-sm text-[var(--color-text-muted)]">{failed ? "3D preview needs WebGL, which this browser has turned off." : "Loading 3D model…"}</span>}
    </div>
  );
}
