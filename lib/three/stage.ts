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
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { disposeTree } from "./circuit";

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls | null;
  /** Key light; move it and its target to keep shadows near the subject in big scenes. */
  key: THREE.DirectionalLight;
  /** Re-render shadows on the next frame (after showing/hiding casters). */
  invalidateShadows(): void;
  /** Called every frame with elapsed seconds, before rendering. */
  onFrame(callback: (time: number, delta: number) => void): void;
  dispose(): void;
}

interface StageOptions {
  orbit?: boolean;
  autoRotate?: boolean;
  fov?: number;
  shadowExtent?: number;
  /** Upper bound for devicePixelRatio; resolution can drop below it on slow devices. */
  maxPixelRatio?: number;
}

const MIN_PIXEL_RATIO = 0.75;

export function createStage(mount: HTMLElement, { orbit = false, autoRotate = false, fov = 32, shadowExtent = 160, maxPixelRatio = 1.5 }: StageOptions = {}): Stage {
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

  let controls: OrbitControls | null = null;
  if (orbit) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.minDistance = 90;
    controls.maxDistance = 520;
    controls.enablePan = false;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.6;
  }

  const callbacks: Array<(time: number, delta: number) => void> = [];
  const timer = new THREE.Timer();
  const lastKey = new THREE.Vector3(Infinity, 0, 0);
  let frame = 0;
  let visible = true;
  let running = false;
  let disposed = false;
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
  const schedule = () => {
    if (!running && visible && !disposed) {
      running = true;
      frame = requestAnimationFrame(loop);
    }
  };
  const loop = (timestamp?: number) => {
    running = false;
    if (disposed || !visible) { lastRender = 0; return; }
    timer.update(timestamp);
    if (!halfRate || !(skipThis = !skipThis)) {
      // Cap large gaps (tab switches) but keep real time on slow devices so camera moves still finish on time.
      const delta = Math.min(timer.getDelta(), 0.25);
      for (const callback of callbacks) callback(timer.getElapsed(), delta);
      controls?.update();
      if (key.position.distanceToSquared(lastKey) > 1) { lastKey.copy(key.position); renderer.shadowMap.needsUpdate = true; }
      renderer.render(scene, camera);
      adapt(performance.now());
    }
    schedule();
  };
  schedule();

  const resize = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = mount;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resize.observe(mount);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      lastRender = 0;
      schedule();
    } else {
      cancelAnimationFrame(frame);
      running = false;
    }
  });
  io.observe(mount);

  return {
    scene,
    camera,
    renderer,
    controls,
    key,
    invalidateShadows() { renderer.shadowMap.needsUpdate = true; },
    onFrame(callback) { callbacks.push(callback); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      running = false;
      timer.dispose();
      resize.disconnect();
      io.disconnect();
      controls?.dispose();
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
  // Only dispose source geometries that are no longer referenced by any remaining mesh under root.
  const keptGeometries = new Set<THREE.BufferGeometry>();
  root.traverse((obj) => { const g = (obj as THREE.Mesh).geometry; if (g) keptGeometries.add(g); });
  const disposedGeometries = new Set<THREE.BufferGeometry>();
  for (const mesh of merged) {
    if (!keptGeometries.has(mesh.geometry) && !disposedGeometries.has(mesh.geometry)) {
      disposedGeometries.add(mesh.geometry);
      mesh.geometry.dispose();
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
