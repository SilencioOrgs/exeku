"use client";

import { useEffect, useRef, useState } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { useNearViewport } from "@/hooks/use-near-viewport";
import { cn } from "@/lib/utils";
import { BrandLoader } from "@/components/brand-loader";

type Loaded = { setLed(on: boolean): void };

export interface CircuitViewProps {
  ledOn: boolean;
  /** Drag to orbit. Off for decorative previews. */
  interactive?: boolean;
  /** Camera position relative to the circuit. */
  view?: [number, number, number];
  className?: string;
  label: string;
}

/** Realistic 3D Arduino + breadboard blink circuit. three.js loads only when this mounts. */
export function CircuitView({ ledOn, interactive = true, view = [120, 120, 175], className, label }: CircuitViewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef<Loaded | null>(null);
  const ledRef = useRef(ledOn);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { effectiveReducedMotion } = useAppearance();
  const near = useNearViewport(mountRef);
  const [vx, vy, vz] = view;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !near) return;
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      try {
        const [{ createStage, mergeStatic }, { buildCircuit }, { applyModelOverrides }] = await Promise.all([
          import("@/lib/three/stage"), import("@/lib/three/circuit"), import("@/lib/three/overrides"),
        ]);
        if (disposed) return;
        const stage = createStage(mount, { orbit: interactive, autoRotate: !effectiveReducedMotion });
        const circuit = buildCircuit();
        // Merge inside named sub-parts so CAD overrides can still swap arduino-uno / breadboard cleanly.
        for (const name of ["arduino-uno", "breadboard"]) {
          const part = circuit.group.getObjectByName(name);
          if (part) mergeStatic(part, 8);
        }
        stage.scene.add(circuit.group);
        const center = circuit.bounds.getCenter(circuit.bounds.min.clone());
        stage.camera.position.set(center.x + vx, vy, center.z + vz);
        const target = center.clone().setY(8);
        if (stage.controls) stage.controls.target.copy(target);
        else if (!effectiveReducedMotion) {
          // Decorative previews drift slowly around the board.
          const radius = Math.hypot(vx, vz), start = Math.atan2(vz, vx);
          stage.onFrame((time) => {
            const angle = start + Math.sin(time * 0.25) * 0.35;
            stage.camera.position.set(center.x + Math.cos(angle) * radius, vy, center.z + Math.sin(angle) * radius);
            stage.camera.lookAt(target);
          });
        }
        stage.camera.lookAt(target);
        void applyModelOverrides(circuit.group, () => disposed, () => stage.invalidateShadows());

        loadedRef.current = { setLed: (on) => circuit.setLed(on) };
        circuit.setLed(ledRef.current);
        setReady(true);
        cleanup = () => { loadedRef.current = null; stage.dispose(); };
      } catch {
        if (!disposed) setFailed(true);
      }
    })();
    return () => { disposed = true; cleanup(); };
  }, [interactive, effectiveReducedMotion, vx, vy, vz, near]);

  useEffect(() => {
    ledRef.current = ledOn;
    loadedRef.current?.setLed(ledOn);
  }, [ledOn, ready]);

  return (
    <div ref={mountRef} role="img" aria-label={label} className={cn("relative w-full overflow-hidden", interactive && "touch-none cursor-grab active:cursor-grabbing", className)}>
      {!ready && (
        <span className="absolute inset-0 grid place-items-center text-sm text-[var(--color-text-muted)]">
          {failed ? "3D preview needs WebGL, which this browser has turned off." : <BrandLoader label="Loading 3D parts…" />}
        </span>
      )}
    </div>
  );
}
