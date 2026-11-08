"use client";

import { useEffect, useRef, useState } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { cn } from "@/lib/utils";

/** Hero scene: two players code head to head under a holographic VS scoreboard. */
export function VersusScene({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { effectiveReducedMotion } = useAppearance();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      try {
        const [THREE, { createStage, mergeStatic }, { buildArena }] = await Promise.all([import("three"), import("@/lib/three/stage"), import("@/lib/three/arena")]);
        if (disposed) return;
        const stage = createStage(mount, { fov: 30, shadowExtent: 260, maxPixelRatio: 1.25 });
        stage.scene.environmentIntensity = 0.35;
        const arena = buildArena();
        stage.scene.add(arena.group);
        mergeStatic(arena.group);
        const target = new THREE.Vector3(0, 98, 0);
        const home = new THREE.Vector3(0, 190, 760);
        const pointer = { x: 0, y: 0 };
        const onPointer = (event: PointerEvent) => {
          pointer.x = event.clientX / window.innerWidth - 0.5;
          pointer.y = event.clientY / window.innerHeight - 0.5;
        };
        if (!effectiveReducedMotion) window.addEventListener("pointermove", onPointer, { passive: true });
        const want = new THREE.Vector3();
        // Desktop: the headline sits on the left, so frame the arena in the right part of the canvas.
        let lastW = 0, lastH = 0;
        const frameSubject = () => {
          const { width: w, height: h } = stage.renderer.domElement;
          if (w === lastW && h === lastH) return;
          lastW = w; lastH = h;
          if (window.innerWidth >= 768) stage.camera.setViewOffset(w, h, -w * 0.17, -h * 0.03, w, h);
          else stage.camera.clearViewOffset();
        };
        stage.onFrame((time, delta) => {
          frameSubject();
          // Narrow screens back the camera off so both players stay in frame.
          const back = stage.camera.aspect < 1.1 ? 1 + (1.1 - stage.camera.aspect) * 1.25 : 1;
          const sway = effectiveReducedMotion ? 0 : Math.sin(time * 0.15) * 40;
          want.set(home.x + sway + pointer.x * 120, home.y - pointer.y * 50, home.z).sub(target).multiplyScalar(back).add(target);
          stage.camera.position.lerp(want, effectiveReducedMotion ? 1 : 1 - Math.exp(-delta * 2.5));
          stage.camera.lookAt(target);
          arena.update(effectiveReducedMotion ? 0 : time);
        });
        setReady(true);
        cleanup = () => { window.removeEventListener("pointermove", onPointer); stage.dispose(); };
      } catch {
        if (!disposed) setFailed(true);
      }
    })();
    return () => { disposed = true; cleanup(); };
  }, [effectiveReducedMotion]);

  return (
    <div ref={mountRef} role="img" aria-label="Two students face each other at laptops, coding the same problem. A holographic VS scoreboard between them shows 'You' and 'Rival' tests passed and a countdown timer." className={cn("relative w-full", className)}>
      {!ready && <span className="absolute inset-0 grid place-items-center text-sm text-[var(--color-text-muted)]">{failed ? "3D scene needs WebGL." : "Loading arena…"}</span>}
    </div>
  );
}
