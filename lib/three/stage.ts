/**
 * Shared three.js stage: renderer, studio lighting, soft shadows and a render loop that
 * pauses while the canvas is off screen. Load with `await import()` from client components.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { disposeTree } from "./circuit";

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls | null;
  /** Key light; move it and its target to keep shadows near the subject in big scenes. */
  key: THREE.DirectionalLight;
  /** Called every frame with elapsed seconds, before rendering. */
  onFrame(callback: (time: number, delta: number) => void): void;
  dispose(): void;
}

export function createStage(mount: HTMLElement, { orbit = false, autoRotate = false, fov = 32, shadowExtent = 160 } = {}): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.display = "block";
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.55;
  room.dispose();

  const camera = new THREE.PerspectiveCamera(fov, mount.clientWidth / Math.max(1, mount.clientHeight), 1, 3000);
  camera.position.set(140, 150, 200);

  // Warm key light, cool fill, orange rim: studio product look on black.
  const key = new THREE.DirectionalLight("#fff4e6", 2.6);
  key.position.set(-120, 220, 140);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(window.innerWidth < 700 ? 1024 : 2048);
  key.shadow.radius = 6;
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
  let frame = 0;
  let visible = true;
  const loop = (timestamp?: number) => {
    frame = requestAnimationFrame(loop);
    timer.update(timestamp);
    if (!visible) return;
    const delta = Math.min(timer.getDelta(), 0.1);
    for (const callback of callbacks) callback(timer.getElapsed(), delta);
    controls?.update();
    renderer.render(scene, camera);
  };
  loop();

  const resize = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = mount;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resize.observe(mount);
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(mount);

  return {
    scene,
    camera,
    renderer,
    controls,
    key,
    onFrame(callback) { callbacks.push(callback); },
    dispose() {
      cancelAnimationFrame(frame);
      timer.dispose();
      resize.disconnect();
      io.disconnect();
      controls?.dispose();
      disposeTree(scene);
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
