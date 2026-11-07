"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DotIcon } from "@/components/retro/dot-icon";
import { useAppearance } from "@/hooks/use-appearance";

// Real part sizes in millimetres, so the preview matches what a printer would make.
const UNO = { w: 68.6, d: 53.4, h: 1.6 };
const HALF_BREADBOARD = { w: 82, d: 55, h: 8.5 };
const WALL = 2.4;
const GAP = 6;

/**
 * Three.js preview of an auto-sized enclosure for the breadboard project.
 * shortcut: dimensions are fixed for Uno + half breadboard; upgrade by deriving them from the Lab layout.
 */
export function ChassisPreview() {
  const mountRef = useRef<HTMLDivElement>(null);
  const lidRef = useRef<{ visible: boolean } | null>(null);
  const [showLid, setShowLid] = useState(false);
  const showLidRef = useRef(showLid);
  const [ready, setReady] = useState(false);
  const { effectiveColorMode, effectiveReducedMotion } = useAppearance();

  const inner = { w: UNO.w + HALF_BREADBOARD.w + GAP * 3, d: Math.max(UNO.d, HALF_BREADBOARD.d) + GAP * 2, h: 30 };
  const outer = { w: inner.w + WALL * 2, d: inner.d + WALL * 2, h: inner.h + WALL };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
      if (disposed) return;

      const dark = effectiveColorMode === "dark";
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(dark ? "#1f1f1f" : "#f6efe4");
      const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 1, 2000);
      camera.position.set(125, 112, 160);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.domElement.setAttribute("aria-hidden", "true");
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight("#fff8ef", dark ? "#2a2a2a" : "#e8dccb", 1.6));
      const sun = new THREE.DirectionalLight("#ffffff", 2.2);
      sun.position.set(120, 200, 90);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150 });
      scene.add(sun);

      const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShadowMaterial({ opacity: dark ? 0.35 : 0.18 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      const mat = (color: string, extra: Record<string, unknown> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.02, ...extra });
      const add = (mesh: InstanceType<typeof THREE.Mesh>, x: number, y: number, z: number) => {
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        return mesh;
      };

      // Enclosure: base plate + four walls, pastel peach PLA.
      const shell = mat("#ffc9a8");
      add(new THREE.Mesh(new RoundedBoxGeometry(outer.w, WALL, outer.d, 3, 1.2), shell), 0, WALL / 2, 0);
      add(new THREE.Mesh(new RoundedBoxGeometry(outer.w, outer.h, WALL, 3, 1), shell), 0, outer.h / 2, outer.d / 2 - WALL / 2);
      add(new THREE.Mesh(new RoundedBoxGeometry(outer.w, outer.h, WALL, 3, 1), shell), 0, outer.h / 2, -outer.d / 2 + WALL / 2);
      add(new THREE.Mesh(new RoundedBoxGeometry(WALL, outer.h, outer.d, 3, 1), shell), outer.w / 2 - WALL / 2, outer.h / 2, 0);
      // Left wall with a USB opening: two pieces around the gap.
      const usbZ = -inner.d / 2 + GAP + 12;
      add(new THREE.Mesh(new THREE.BoxGeometry(WALL, outer.h - 16, outer.d), shell), -outer.w / 2 + WALL / 2, 16 + (outer.h - 16) / 2, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(WALL, 16, outer.d / 2 + usbZ - 7), shell), -outer.w / 2 + WALL / 2, 8, (usbZ - 7 - outer.d / 2) / 2);
      add(new THREE.Mesh(new THREE.BoxGeometry(WALL, 16, outer.d / 2 - usbZ - 7), shell), -outer.w / 2 + WALL / 2, 8, (usbZ + 7 + outer.d / 2) / 2);

      // Arduino Uno on four standoffs.
      const unoX = -inner.w / 2 + GAP + UNO.w / 2;
      for (const [dx, dz] of [[-28, -20], [28, -20], [-28, 20], [28, 20]]) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 6, 16), mat("#f2b08e")), unoX + dx, WALL + 3, dz);
      }
      add(new THREE.Mesh(new RoundedBoxGeometry(UNO.w, UNO.h, UNO.d, 2, 0.6), mat("#2f9ea3")), unoX, WALL + 6 + UNO.h / 2, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(16, 11, 12), mat("#c9ced3", { metalness: 0.6, roughness: 0.3 })), -inner.w / 2 + 6, WALL + 6 + UNO.h + 5.5, usbZ);
      add(new THREE.Mesh(new THREE.BoxGeometry(52, 8, 2.5), mat("#222222")), unoX + 6, WALL + 6 + UNO.h + 4, -UNO.d / 2 + 3);

      // Half breadboard with an LED on top.
      const bbX = inner.w / 2 - GAP - HALF_BREADBOARD.w / 2;
      add(new THREE.Mesh(new RoundedBoxGeometry(HALF_BREADBOARD.w, HALF_BREADBOARD.h, HALF_BREADBOARD.d, 2, 1), mat("#fbf3e4")), bbX, WALL + HALF_BREADBOARD.h / 2, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(HALF_BREADBOARD.w - 4, 0.6, 3), mat("#e6d7bd")), bbX, WALL + HALF_BREADBOARD.h + 0.1, 0);
      add(new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 16), mat("#ff5a4f", { emissive: "#ff3b30", emissiveIntensity: 0.6 })), bbX + 6, WALL + HALF_BREADBOARD.h + 6, -10);

      // Lid, hidden by default so the parts are visible; keeps its state across theme rebuilds.
      const lid = add(new THREE.Mesh(new RoundedBoxGeometry(outer.w, WALL, outer.d, 3, 1.2), mat("#ffd9c2", { transparent: true, opacity: 0.85 })), 0, outer.h + WALL / 2 + 0.5, 0);
      lid.visible = showLidRef.current;
      lidRef.current = lid;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(0, 12, 0);
      controls.maxPolarAngle = Math.PI / 2.05;
      controls.minDistance = 110;
      controls.maxDistance = 420;
      controls.autoRotate = !effectiveReducedMotion;
      controls.autoRotateSpeed = 0.8;

      let frame = 0;
      const loop = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(loop); };
      loop();
      const resize = new ResizeObserver(() => {
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      });
      resize.observe(mount);
      setReady(true);

      cleanup = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        controls.dispose();
        scene.traverse((object) => {
          const mesh = object as InstanceType<typeof THREE.Mesh>;
          mesh.geometry?.dispose();
          (Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []).forEach((m) => m.dispose());
        });
        renderer.dispose();
        renderer.domElement.remove();
        lidRef.current = null;
      };
    })();

    return () => { disposed = true; cleanup(); };
  // Rebuild when the theme changes; sizes are constants.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveColorMode, effectiveReducedMotion]);

  useEffect(() => {
    showLidRef.current = showLid;
    if (lidRef.current) lidRef.current.visible = showLid;
  }, [showLid, ready]);

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
      <div ref={mountRef} className="relative h-80 w-full touch-none" role="img" aria-label={`3D preview of a ${outer.w.toFixed(0)} by ${outer.d.toFixed(0)} by ${outer.h.toFixed(0)} millimetre enclosure holding an Arduino Uno and a half breadboard. Drag to rotate.`}>
        {!ready && <span className="absolute inset-0 grid place-items-center text-sm text-[var(--color-text-muted)]">Loading 3D preview…</span>}
      </div>
      <dl className="font-code grid grid-cols-3 gap-2 border-t border-[var(--color-border)] px-3 py-2 text-center text-xs">
        <div><dt className="text-[var(--color-text-muted)]">Size</dt><dd>{outer.w.toFixed(0)}×{outer.d.toFixed(0)}×{outer.h.toFixed(0)} mm</dd></div>
        <div><dt className="text-[var(--color-text-muted)]">Wall</dt><dd>{WALL} mm</dd></div>
        <div><dt className="text-[var(--color-text-muted)]">Fits</dt><dd>Uno + half board</dd></div>
      </dl>
    </div>
  );
}
