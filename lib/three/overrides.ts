/**
 * Optional CAD overrides. If public/models/manifest.json names a .glb for a part
 * (for example one exported from GrabCAD), it replaces the procedural model,
 * scaled and placed to the same footprint. Missing files keep the built-in part.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { disposeTree } from "./circuit";

const PARTS = ["arduino-uno", "breadboard"] as const;
type Manifest = Partial<Record<(typeof PARTS)[number], string | null>>;

let manifest: Promise<Manifest> | null = null;
function loadManifest() {
  manifest ??= fetch("/models/manifest.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return manifest;
}

/** Fit `model` into the footprint of `part` (same width along X, bottoms aligned, centered). */
export function fitToFootprint(model: THREE.Object3D, part: THREE.Object3D) {
  const target = new THREE.Box3().setFromObject(part);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const want = target.getSize(new THREE.Vector3());
  // CAD exports are often Z-up or in metres; rotate so the longest flat side lies along X.
  if (size.y > size.z && size.y > want.y * 2) { model.rotation.x = -Math.PI / 2; box.setFromObject(model); box.getSize(size); }
  const scale = want.x / Math.max(size.x, 1e-6);
  model.scale.multiplyScalar(scale);
  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const targetCenter = target.getCenter(new THREE.Vector3());
  model.position.add(new THREE.Vector3(targetCenter.x - center.x, target.min.y - box.min.y, targetCenter.z - center.z));
}

export async function applyModelOverrides(root: THREE.Object3D, isDisposed: () => boolean, onSwap?: () => void) {
  const files = await loadManifest();
  const loader = new GLTFLoader();
  for (const name of PARTS) {
    const file = files[name];
    const part = root.getObjectByName(name);
    if (!file || !part) continue;
    try {
      const gltf = await loader.loadAsync(`/models/${file}`);
      if (isDisposed()) {
        disposeTree(gltf.scene);
        return;
      }
      const model = gltf.scene;
      model.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      part.updateWorldMatrix(true, true);
      const holder = new THREE.Group();
      holder.add(model);
      part.parent?.add(holder);
      fitToFootprint(model, part);
      part.visible = false;
      onSwap?.();
    } catch {
      // A broken or missing file keeps the procedural part.
    }
  }
}
