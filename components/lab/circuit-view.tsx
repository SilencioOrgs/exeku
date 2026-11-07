"use client";

import { useEffect, useRef, useState } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { cn } from "@/lib/utils";

type Loaded = {
  setLed(on: boolean): void;
  setLid(visible: boolean): void;
};

export interface CircuitViewProps {
  ledOn: boolean;
  /** Wrap the circuit in its auto-sized printable enclosure. */
  chassis?: boolean;
  lidOn?: boolean;
  /** Drag to orbit. Off for decorative previews. */
  interactive?: boolean;
  /** Camera position relative to the circuit. */
  view?: [number, number, number];
  className?: string;
  label: string;
  onSize?: (outer: { w: number; d: number; h: number }) => void;
}

/** Realistic 3D Arduino + breadboard blink circuit. three.js loads only when this mounts. */
export function CircuitView({ ledOn, chassis = false, lidOn = false, interactive = true, view = [120, 120, 175], className, label, onSize }: CircuitViewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef<Loaded | null>(null);
  const stateRef = useRef({ ledOn, lidOn });
  const onSizeRef = useRef(onSize);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { effectiveReducedMotion } = useAppearance();
  const [vx, vy, vz] = view;

  useEffect(() => { onSizeRef.current = onSize; }, [onSize]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      try {
        const [{ createStage }, { buildCircuit, buildEnclosure }, { applyModelOverrides }] = await Promise.all([
          import("@/lib/three/stage"), import("@/lib/three/circuit"), import("@/lib/three/overrides"),
        ]);
        if (disposed) return;
        const stage = createStage(mount, { orbit: interactive, autoRotate: !effectiveReducedMotion });
        const circuit = buildCircuit();
        stage.scene.add(circuit.group);
        const center = circuit.bounds.getCenter(circuit.bounds.min.clone());
        let enclosure: ReturnType<typeof buildEnclosure> | null = null;
        if (chassis) {
          enclosure = buildEnclosure(circuit.bounds);
          stage.scene.add(enclosure.group);
          onSizeRef.current?.(enclosure.outer);
        }
        stage.camera.position.set(center.x + vx, vy, center.z + vz);
        const target = center.clone().setY(chassis ? 14 : 8);
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
        void applyModelOverrides(circuit.group, () => disposed);

        loadedRef.current = {
          setLed: (on) => circuit.setLed(on),
          setLid: (visible) => enclosure?.setLidVisible(visible),
        };
        circuit.setLed(stateRef.current.ledOn);
        enclosure?.setLidVisible(stateRef.current.lidOn);
        setReady(true);
        cleanup = () => { loadedRef.current = null; stage.dispose(); };
      } catch {
        if (!disposed) setFailed(true);
      }
    })();
    return () => { disposed = true; cleanup(); };
  }, [chassis, interactive, effectiveReducedMotion, vx, vy, vz]);

  useEffect(() => {
    stateRef.current = { ledOn, lidOn };
    loadedRef.current?.setLed(ledOn);
    loadedRef.current?.setLid(lidOn);
  }, [ledOn, lidOn, ready]);

  return (
    <div ref={mountRef} role="img" aria-label={label} className={cn("relative w-full overflow-hidden", interactive && "touch-none cursor-grab active:cursor-grabbing", className)}>
      {!ready && (
        <span className="absolute inset-0 grid place-items-center text-sm text-[var(--color-text-muted)]">
          {failed ? "3D preview needs WebGL, which this browser has turned off." : "Loading 3D parts…"}
        </span>
      )}
    </div>
  );
}
