/**
 * Versus arena for the landing hero: two players at laptops facing each other, with a
 * holographic scoreboard between them. Units are centimetres. Figures are stylized and faceless.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const ORANGE = "#ffa116";

export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Capsule from a to b, like an arm or a leg. */
export function limb(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const dir = b.clone().sub(a);
  const length = Math.max(0.01, dir.length() - radius * 2);
  const m = mesh(new THREE.CapsuleGeometry(radius, length, 6, 14), material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

export function canvas(width: number, height: number) {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  const ctx = el.getContext("2d") as CanvasRenderingContext2D;
  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { ctx, texture, width, height };
}

const CODE: Record<"python" | "cpp", Array<Array<[string, string]>>> = {
  python: [
    [["def ", "#569cd6"], ["two_sum", "#dcdcaa"], ["(nums, target):", "#d4d4d4"]],
    [["    seen = ", "#d4d4d4"], ["{}", "#ffd700"]],
    [["    for ", "#c586c0"], ["i, n ", "#9cdcfe"], ["in ", "#c586c0"], ["enumerate", "#dcdcaa"], ["(nums):", "#d4d4d4"]],
    [["        if ", "#c586c0"], ["target - n ", "#9cdcfe"], ["in ", "#c586c0"], ["seen:", "#d4d4d4"]],
    [["            return ", "#c586c0"], ["[seen[target - n], i]", "#d4d4d4"]],
    [["        seen[n] = i", "#d4d4d4"]],
    [["", "#d4d4d4"]],
    [["# Accepted · 7/10", "#6a9955"]],
  ],
  cpp: [
    [["vector", "#4ec9b0"], ["<", "#d4d4d4"], ["int", "#569cd6"], ["> ", "#d4d4d4"], ["twoSum", "#dcdcaa"], ["(...) {", "#d4d4d4"]],
    [["  unordered_map", "#4ec9b0"], ["<int,int> seen;", "#d4d4d4"]],
    [["  for ", "#c586c0"], ["(", "#ffd700"], ["int ", "#569cd6"], ["i = 0; i < n; i++) {", "#d4d4d4"]],
    [["    auto ", "#569cd6"], ["it = seen.", "#d4d4d4"], ["find", "#dcdcaa"], ["(t - a[i]);", "#d4d4d4"]],
    [["    if ", "#c586c0"], ["(it != seen.end())", "#d4d4d4"]],
    [["      return ", "#c586c0"], ["{it->second, i};", "#d4d4d4"]],
    [["    seen[a[i]] = i;", "#d4d4d4"]],
    [["// Running · 5/10", "#6a9955"]],
  ],
};

function screenTexture(lang: "python" | "cpp") {
  const c = canvas(640, 400);
  const { ctx } = c;
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, 640, 400);
  ctx.fillStyle = "#2d2d2d";
  ctx.fillRect(0, 0, 640, 34);
  ctx.fillStyle = ORANGE;
  ctx.fillRect(16, 12, 64, 10);
  ctx.fillStyle = "#3c3c3c";
  ctx.fillRect(96, 12, 48, 10);
  ctx.font = "500 24px monospace";
  CODE[lang].forEach((line, i) => {
    let x = 54;
    ctx.fillStyle = "#6e7681";
    ctx.fillText(String(i + 1), 16, 74 + i * 38);
    for (const [text, color] of line) {
      ctx.fillStyle = color;
      ctx.fillText(text, x, 74 + i * 38);
      x += ctx.measureText(text).width;
    }
  });
  return c.texture;
}

function keyboardTexture() {
  const c = canvas(256, 160);
  c.ctx.fillStyle = "#1b1b1d";
  c.ctx.fillRect(0, 0, 256, 160);
  c.ctx.fillStyle = "#0d0d0e";
  for (let r = 0; r < 5; r++) for (let k = 0; k < 13; k++) c.ctx.fillRect(10 + k * 18.5, 10 + r * 19, 15, 15);
  c.ctx.fillStyle = "#151517";
  c.ctx.fillRect(80, 112, 96, 40);
  return c.texture;
}

export interface PlayerStyle { hoodie: string; pants: string; skin: string; hair: string; headphones: string; lang: "python" | "cpp" }

/** Seated player at a desk with a laptop, facing +X. Origin is under the chair. */
export function buildPlayer(style: PlayerStyle) {
  const group = new THREE.Group();
  const std = (color: string, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const hoodie = std(style.hoodie, 0.85), pants = std(style.pants, 0.85), skin = std(style.skin, 0.6);
  const dark = std("#141414", 0.6), metal = std("#3a3a3e", 0.35, 0.8);
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  // Gaming chair.
  group.add(mesh(new RoundedBoxGeometry(46, 7, 46, 3, 3), dark, 0, 46, 0));
  const back = mesh(new RoundedBoxGeometry(8, 58, 44, 3, 3), dark, -24, 82, 0);
  back.rotation.z = 0.12;
  group.add(back);
  const stripe = mesh(new THREE.BoxGeometry(1, 40, 3), std(ORANGE, 0.5), -19.4, 84, 0);
  stripe.rotation.z = 0.12;
  group.add(stripe);
  group.add(mesh(new THREE.CylinderGeometry(2.5, 2.5, 34, 12), metal, 0, 26, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = mesh(new THREE.BoxGeometry(30, 2.5, 3), metal, Math.cos(a) * 14, 7, Math.sin(a) * 14);
    leg.rotation.y = -a;
    group.add(leg);
    group.add(mesh(new THREE.SphereGeometry(2.6, 12, 8), dark, Math.cos(a) * 28, 2.6, Math.sin(a) * 28));
  }

  // Body, leaning in toward the screen.
  group.add(limb(v(2, 54, 0), v(12, 96, 0), 15, hoodie));
  group.add(mesh(new THREE.CylinderGeometry(4.2, 4.6, 8, 14), skin, 15, 104, 0));
  const head = new THREE.Group();
  head.position.set(18, 117, 0);
  head.rotation.z = -0.18;
  head.add(mesh(new THREE.SphereGeometry(10.5, 32, 24), skin));
  const hair = mesh(new THREE.SphereGeometry(11.1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), std(style.hair, 0.9), -1.2, 0.8, 0);
  hair.rotation.z = 0.45;
  head.add(hair);
  // Headphones: band over the head, cups over the ears.
  const band = mesh(new THREE.TorusGeometry(12.2, 1.4, 10, 32, Math.PI), std(style.headphones, 0.4, 0.3));
  band.rotation.y = Math.PI / 2;
  head.add(band);
  for (const side of [-1, 1]) {
    const cup = mesh(new THREE.CylinderGeometry(5, 5, 4, 24), std(style.headphones, 0.4, 0.3), 0, -1, side * 12);
    cup.rotation.x = Math.PI / 2;
    head.add(cup);
    const ring = mesh(new THREE.TorusGeometry(4.4, 0.5, 8, 24), new THREE.MeshStandardMaterial({ color: ORANGE, emissive: ORANGE, emissiveIntensity: 1.2 }), 0, -1, side * 14.1);
    head.add(ring);
  }
  group.add(head);

  for (const side of [-1, 1]) {
    const shoulder = v(10, 92, side * 17), elbow = v(25, 70, side * 20), hand = v(47, 78, side * 9);
    group.add(limb(shoulder, elbow, 5.6, hoodie));
    group.add(limb(elbow, hand.clone().add(v(-4, 0, 0)), 4.6, hoodie));
    group.add(mesh(new THREE.SphereGeometry(3.6, 16, 12), skin, hand.x, hand.y, hand.z));
    const hip = v(6, 52, side * 9), knee = v(42, 53, side * 11), ankle = v(44, 9, side * 11);
    group.add(limb(hip, knee, 7.5, pants));
    group.add(limb(knee, ankle, 6, pants));
    group.add(mesh(new RoundedBoxGeometry(16, 6, 9, 2, 2.5), std("#f2f2f2", 0.6), 48, 3, side * 11));
  }

  // Desk.
  const deskMat = std("#1c1c1e", 0.45, 0.1);
  group.add(mesh(new RoundedBoxGeometry(52, 3, 104, 2, 1.2), deskMat, 54, 72.5, 0));
  for (const side of [-1, 1]) group.add(mesh(new THREE.BoxGeometry(48, 71, 3), deskMat, 54, 35.5, side * 49));

  // Laptop with live code on screen.
  const aluminium = std("#2b2b2e", 0.35, 0.7);
  group.add(mesh(new RoundedBoxGeometry(23, 1.6, 32, 2, 0.6), aluminium, 52, 74.8, 0));
  const keys = mesh(new THREE.PlaneGeometry(20, 28), new THREE.MeshStandardMaterial({ map: keyboardTexture(), roughness: 0.8 }), 51, 75.62, 0);
  keys.rotation.x = -Math.PI / 2;
  keys.rotation.z = -Math.PI / 2;
  group.add(keys);
  const hinge = new THREE.Group();
  hinge.position.set(63.2, 75.6, 0);
  hinge.rotation.z = -0.22;
  hinge.add(mesh(new RoundedBoxGeometry(0.9, 21.5, 32, 2, 0.4), aluminium, 0.45, 10.75, 0));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(30, 19), new THREE.MeshBasicMaterial({ map: screenTexture(style.lang), toneMapped: false }));
  screen.position.set(-0.05, 11, 0);
  screen.rotation.y = -Math.PI / 2;
  hinge.add(screen);
  group.add(hinge);
  // No per-laptop light: the screen material glows on its own, and every extra light costs per pixel.
  return group;
}

export function glowSprite(color: string, size: number) {
  const c = canvas(128, 128);
  const g = c.ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.ctx.fillStyle = g;
  c.ctx.fillRect(0, 0, 128, 128);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: c.texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.scale.set(size, size, 1);
  return sprite;
}

export function holoPanel(width: number, height: number, scale: number) {
  const c = canvas(width, height);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: c.texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  sprite.scale.set((width / height) * scale, scale, 1);
  return { ...c, sprite };
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** The same people appear across the hero and the tour. "you" is the player we follow. */
export const STYLES = {
  you: { hoodie: "#262628", pants: "#1a1c22", skin: "#8d5a3b", hair: "#120d0a", headphones: "#111111", lang: "python" },
  rival: { hoodie: "#d8d4cc", pants: "#2b2f38", skin: "#e2b791", hair: "#3a2516", headphones: "#f2f2f2", lang: "cpp" },
  mateA: { hoodie: "#3a2a1a", pants: "#1c1c20", skin: "#c68b62", hair: "#0d0d0d", headphones: "#1a1a1a", lang: "cpp" },
  mateB: { hoodie: "#1f2a33", pants: "#202227", skin: "#f0c9a5", hair: "#5a3a22", headphones: "#141414", lang: "python" },
  foeA: { hoodie: "#bfbab0", pants: "#2e3138", skin: "#a8724c", hair: "#1a120c", headphones: "#e8e8e8", lang: "python" },
  foeB: { hoodie: "#e6e2da", pants: "#33363d", skin: "#7a4a2e", hair: "#0d0a08", headphones: "#f5f5f5", lang: "cpp" },
} satisfies Record<string, PlayerStyle>;

/** Floor projector with an orange beam and rising particles. */
export function buildProjector() {
  const group = new THREE.Group();
  const base = new THREE.MeshStandardMaterial({ color: "#161616", roughness: 0.35, metalness: 0.8 });
  group.add(mesh(new THREE.CylinderGeometry(24, 27, 8, 48), base, 0, 4, 0));
  const ringMat = new THREE.MeshStandardMaterial({ color: "#ff8a00", emissive: "#ff7a00", emissiveIntensity: 1.6 });
  const ring = mesh(new THREE.TorusGeometry(20, 0.9, 12, 64), ringMat, 0, 8.2, 0);
  ring.rotation.x = Math.PI / 2;
  ring.userData.dynamic = true;
  group.add(ring);
  group.add(mesh(new THREE.CylinderGeometry(8, 8, 1, 32), ringMat, 0, 8.5, 0));
  const floorGlow = glowSprite("rgba(255,161,22,0.55)", 170);
  floorGlow.position.set(0, 1, 0);
  group.add(floorGlow);
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(58, 9, 150, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  cone.position.y = 84;
  group.add(cone);
  const count = 160;
  const seeds = Float32Array.from({ length: count * 3 }, () => Math.random());
  const positions = new Float32Array(count * 3);
  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({ color: "#ffc061", size: 1.6, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  group.add(particles);
  const light = new THREE.PointLight(ORANGE, 9000, 400, 1.5);
  light.position.set(0, 120, 30);
  group.add(light);
  return {
    group,
    update(time: number) {
      ring.rotation.z = time * 0.6;
      for (let i = 0; i < count; i++) {
        const angle = seeds[i * 3] * Math.PI * 2 + time * 0.3;
        const height = ((seeds[i * 3 + 1] * 160 + time * 14) % 160) + 10;
        const radius = seeds[i * 3 + 2] * (9 + (height / 160) * 46);
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = height;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    },
  };
}

export interface Arena {
  group: THREE.Group;
  /** `win` pins "you" at 10/10 Accepted (used by the scroll tour). */
  update(time: number, win?: boolean): void;
}

export function buildArena(): Arena {
  const group = new THREE.Group();
  const playerA = buildPlayer(STYLES.you);
  playerA.position.set(-132, 0, 0);
  group.add(playerA);
  const playerB = buildPlayer(STYLES.rival);
  playerB.position.set(132, 0, 0);
  playerB.rotation.y = Math.PI;
  group.add(playerB);
  const projector = buildProjector();
  group.add(projector.group);
  // Scoreboard: VS, both players' tests, timer and problem.
  const vs = holoPanel(512, 256, 44);
  vs.sprite.position.set(0, 128, 0);
  {
    const { ctx } = vs;
    const g = ctx.createLinearGradient(0, 40, 0, 220);
    g.addColorStop(0, "#ffe2b0");
    g.addColorStop(0.5, ORANGE);
    g.addColorStop(1, "#ff6a00");
    ctx.font = "italic 900 200px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = ORANGE;
    ctx.shadowBlur = 40;
    ctx.fillStyle = g;
    ctx.fillText("VS", 256, 136);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,200,120,0.7)";
    ctx.lineWidth = 3;
    ctx.strokeText("VS", 256, 136);
    vs.texture.needsUpdate = true;
  }
  const left = holoPanel(512, 320, 30);
  left.sprite.position.set(-62, 118, 0);
  const right = holoPanel(512, 320, 30);
  right.sprite.position.set(62, 118, 0);
  const top = holoPanel(640, 150, 15);
  top.sprite.position.set(0, 172, 0);
  group.add(vs.sprite, left.sprite, right.sprite, top.sprite);

  const score = { you: 6, rival: 5, seconds: 12 * 60 + 47, last: -1 };
  const drawPlayer = (panel: ReturnType<typeof holoPanel>, name: string, lang: string, passed: number, accent: string) => {
    const { ctx, width: w, height: h } = panel;
    ctx.clearRect(0, 0, w, h);
    roundRect(ctx, 8, 8, w - 16, h - 16, 26);
    ctx.fillStyle = "rgba(255,161,22,0.10)";
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#ffe7c2";
    ctx.font = "700 40px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(name, 36, 70);
    ctx.font = "500 28px monospace";
    ctx.fillStyle = "rgba(255,220,170,0.75)";
    ctx.fillText(lang, 36, 110);
    ctx.font = "800 92px monospace";
    ctx.fillStyle = accent;
    ctx.fillText(`${passed}/10`, 36, 210);
    ctx.font = "500 26px sans-serif";
    ctx.fillStyle = "rgba(255,220,170,0.75)";
    ctx.fillText(passed >= 10 ? "Accepted" : "tests passed", 36, 250);
    roundRect(ctx, 36, 268, w - 72, 14, 7);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
    roundRect(ctx, 36, 268, ((w - 72) * passed) / 10, 14, 7);
    ctx.fillStyle = accent;
    ctx.fill();
    panel.texture.needsUpdate = true;
  };
  const drawTop = () => {
    const { ctx, width: w, height: h } = top;
    ctx.clearRect(0, 0, w, h);
    const mm = String(Math.floor(score.seconds / 60)).padStart(2, "0"), ss = String(score.seconds % 60).padStart(2, "0");
    ctx.textAlign = "center";
    ctx.font = "800 72px monospace";
    ctx.fillStyle = "#ffe7c2";
    ctx.fillText(`${mm}:${ss}`, w / 2, 76);
    ctx.font = "600 30px sans-serif";
    ctx.fillStyle = "rgba(255,200,130,0.85)";
    ctx.fillText("Two Sum · Medium · Round 3", w / 2, 128);
    top.texture.needsUpdate = true;
  };
  const redraw = () => {
    drawPlayer(left, "You", "Python 3", score.you, ORANGE);
    drawPlayer(right, "Rival", "C++", score.rival, "#ffd27a");
    drawTop();
  };
  redraw();

  let wasWin = false;
  return {
    group,
    update(time, win = false) {
      const second = Math.floor(time);
      if (win && score.you !== 10) { score.you = 10; redraw(); }
      else if (!win && wasWin && score.you === 10) { score.you = 7; redraw(); }
      wasWin = win;
      if (second !== score.last) {
        score.last = second;
        score.seconds = score.seconds > 0 ? score.seconds - 1 : 15 * 60;
        if (!win && second % 3 === 0) score.you = score.you >= 10 ? 3 : score.you + 1;
        if (second % 4 === 1) score.rival = score.rival >= 10 ? 2 : score.rival + 1;
        redraw();
      }
      const bob = Math.sin(time * 1.2) * 1.6;
      vs.sprite.position.y = 128 + bob;
      left.sprite.position.y = 118 + Math.sin(time * 1.2 + 1) * 1.4;
      right.sprite.position.y = 118 + Math.sin(time * 1.2 + 2) * 1.4;
      top.sprite.position.y = 172 + bob * 0.6;
      const flicker = 0.88 + Math.sin(time * 23) * 0.04 + Math.sin(time * 7) * 0.04;
      for (const panel of [vs, left, right, top]) (panel.sprite.material as THREE.SpriteMaterial).opacity = flicker;
      projector.update(time);
    },
  };
}
