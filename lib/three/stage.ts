/**
 * Shared three.js stage: renderer, studio lighting, soft shadows and a render loop that
 * pauses while the canvas is off screen. Load with `await import()` from client components.
 *
 * Performance: shadows are re-rendered only when the key light moves, resolution adapts to
 * the device's frame time, and weak devices fall back to 30 fps. `mergeStatic` collapses a
 * built scene into a few draw calls.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { disposeTree } from "./circuit";

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** Key light; move it and its target to keep shadows near the subject in big scenes. */
  key: THREE.DirectionalLight;
  /** Re-render shadows on the next frame (after showing/hiding casters). */
  invalidateShadows(): void;
  /** Called every frame with elapsed seconds, before rendering. */
  onFrame(callback: (time: number, delta: number) => void): void;
  dispose(): void;
}

interface StageOptions {
  fov?: number;
  shadowExtent?: number;
  /** Upper bound for devicePixelRatio; resolution can drop below it on slow devices. */
  maxPixelRatio?: number;
}

const MIN_PIXEL_RATIO = 0.75;

export function createStage(mount: HTMLElement, { fov = 32, shadowExtent = 160, maxPixelRatio = 1.5 }: StageOptions = {}): Stage {
  const maxRatio = Math.min(window.devicePixelRatio, maxPixelRatio);
  const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, alpha: true, powerPreference: "high-performance" });
  let pixelRatio = maxRatio;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.display = "block";
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.55;
  room.dispose();

  const camera = new THREE.PerspectiveCamera(fov, mount.clientWidth / Math.max(1, mount.clientHeight), 1, 3000);
  camera.position.set(140, 150, 200);

  // Warm key light, cool fill, orange rim: studio product look on black.
  const key = new THREE.DirectionalLight("#fff4e6", 2.6);
  key.position.set(-120, 220, 140);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(1024);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -shadowExtent, right: shadowExtent, top: shadowExtent, bottom: -shadowExtent, near: 10, far: 600 + shadowExtent * 2 });
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight("#9fb7ff", 0.5);
  fill.position.set(200, 80, -60);
  scene.add(fill);
  const rim = new THREE.DirectionalLight("#ff9a2e", 1.6);
  rim.position.set(60, 70, -220);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight("#ffffff", "#0a0a0a", 0.35));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.ShadowMaterial({ opacity: 0.55 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -4.2;
  ground.receiveShadow = true;
  scene.add(ground);

  const callbacks: Array<(time: number, delta: number) => void> = [];
  const timer = new THREE.Timer();
  const lastKey = new THREE.Vector3(Infinity, 0, 0);
  let frame = 0;
  let ioVisible = true;
  let disposed = false;
  const isOnScreen = () => {
    if (ioVisible) return true;
    const rect = mount.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
  };
  const shouldRun = () => !disposed && (typeof document === "undefined" || !document.hidden) && isOnScreen();
  const startLoop = () => {
    if (!frame && shouldRun()) frame = requestAnimationFrame(loop);
  };
  const stopLoop = () => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    lastRender = 0;
  };
  const syncLoop = () => {
    if (shouldRun()) startLoop();
    else stopLoop();
  };
  // Adaptive quality: average the time between rendered frames, then trade resolution for speed.
  let sampleTime = 0, samples = 0, halfRate = false, skipThis = false, lastRender = 0;
  const adapt = (now: number) => {
    if (lastRender) { sampleTime += now - lastRender; samples++; }
    lastRender = now;
    if (samples < 40) return;
    const avg = sampleTime / samples;
    sampleTime = samples = 0;
    const target = halfRate ? 2 : 1;
    if (avg > 24 * target && pixelRatio > MIN_PIXEL_RATIO) pixelRatio = Math.max(MIN_PIXEL_RATIO, pixelRatio - 0.25);
    else if (avg > 30 * target && pixelRatio <= MIN_PIXEL_RATIO) { halfRate = true; return; }
    else if (avg < 13 * target && pixelRatio < maxRatio) pixelRatio = Math.min(maxRatio, pixelRatio + 0.25);
    else return;
    renderer.setPixelRatio(pixelRatio);
  };
  const loop = (timestamp?: number) => {
    frame = 0;
    if (disposed || (typeof document !== "undefined" && document.hidden)) { lastRender = 0; return; }
    frame = requestAnimationFrame(loop);
    if (halfRate && (skipThis = !skipThis)) return;
    timer.update(timestamp);
    adapt(performance.now());
    // Cap large gaps (tab switches) but keep real time on slow devices so camera moves still finish on time.
    const delta = Math.min(Math.max(0, timer.getDelta()), 0.25);
    for (const callback of callbacks) callback(timer.getElapsed(), delta);
    if (key.position.distanceToSquared(lastKey) > 1) { lastKey.copy(key.position); renderer.shadowMap.needsUpdate = true; }
    renderer.render(scene, camera);
  };
  startLoop();

  const resize = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = mount;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    syncLoop();
  });
  resize.observe(mount);
  const io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (!entry) return;
    ioVisible = entry.isIntersecting;
    syncLoop();
  });
  io.observe(mount);
  window.addEventListener("scroll", syncLoop, { passive: true });
  document.addEventListener("visibilitychange", syncLoop);

  return {
    scene,
    camera,
    renderer,
    key,
    invalidateShadows() { renderer.shadowMap.needsUpdate = true; },
    onFrame(callback) { callbacks.push(callback); },
    dispose() {
      disposed = true;
      stopLoop();
      window.removeEventListener("scroll", syncLoop);
      document.removeEventListener("visibilitychange", syncLoop);
      timer.dispose();
      resize.disconnect();
      io.disconnect();
      disposeTree(scene);
      scene.environment = null;
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function materialKey(m: THREE.Material) {
  const s = m as THREE.MeshStandardMaterial;
  return [m.type, s.color?.getHex(), s.emissive?.getHex(), s.emissiveIntensity, s.roughness, s.metalness, s.map?.uuid, m.side, m.toneMapped].join("|");
}

/**
 * Bake the static meshes under `root` into one mesh per material, so a scene of hundreds of
 * small parts renders in a few draw calls. Only parts bigger than `shadowRadius` cast shadows.
 * Transparent meshes, instanced meshes and anything under an object with `userData.dynamic`
 * (it moves) are left alone.
 */
export function mergeStatic(root: THREE.Object3D, shadowRadius = 12) {
  root.updateMatrixWorld(true);
  const toLocal = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { material: THREE.Material; cast: boolean; geometries: THREE.BufferGeometry[] }>();
  const merged: THREE.Mesh[] = [];
  const visit = (object: THREE.Object3D) => {
    if (object.userData.dynamic) return;
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && !(mesh as THREE.InstancedMesh).isInstancedMesh && !Array.isArray(mesh.material) && !mesh.material.transparent) {
      let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.clearGroups();
      g = g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal, mesh.matrixWorld));
      g.computeBoundingSphere();
      const cast = mesh.castShadow && (g.boundingSphere?.radius ?? 0) >= shadowRadius;
      const key = materialKey(mesh.material) + (cast ? "|cast" : "");
      const bucket = buckets.get(key) ?? { material: mesh.material, cast, geometries: [] };
      bucket.geometries.push(g);
      buckets.set(key, bucket);
      merged.push(mesh);
    }
    for (const child of object.children) visit(child);
  };
  visit(root);
  for (const mesh of merged) mesh.removeFromParent();
  // Only dispose source geometries and deduplicated materials no longer referenced under root or in buckets.
  const keptGeometries = new Set<THREE.BufferGeometry>();
  const keptMaterials = new Set<THREE.Material>();
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.geometry) keptGeometries.add(m.geometry);
    if (Array.isArray(m.material)) m.material.forEach((mat) => keptMaterials.add(mat));
    else if (m.material) keptMaterials.add(m.material);
  });
  for (const { material } of buckets.values()) keptMaterials.add(material);

  const disposedGeometries = new Set<THREE.BufferGeometry>();
  const disposedMaterials = new Set<THREE.Material>();
  for (const mesh of merged) {
    if (!keptGeometries.has(mesh.geometry) && !disposedGeometries.has(mesh.geometry)) {
      disposedGeometries.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    const mat = mesh.material as THREE.Material;
    if (mat && !keptMaterials.has(mat) && !disposedMaterials.has(mat)) {
      disposedMaterials.add(mat);
      mat.dispose();
    }
  }
  for (const { material, cast, geometries } of buckets.values()) {
    const geometry = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
}

/** Move every light under `root` to the scene, so hiding `root` never changes the light count (no shader recompiles). */
export function hoistLights(root: THREE.Object3D, scene: THREE.Scene) {
  root.updateMatrixWorld(true);
  const lights: THREE.Light[] = [];
  root.traverse((o) => { if ((o as THREE.Light).isLight) lights.push(o as THREE.Light); });
  for (const light of lights) scene.attach(light);
}
