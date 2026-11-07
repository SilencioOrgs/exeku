/**
 * Finished project: an Arduino desk clock in a printed case. Units are millimetres.
 * Closed, it is the product you would put on a desk. Lift the lid and the parts are
 * laid out the way Exeku organizes them: Nano on a carrier board, RTC, display, buzzer.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { CLOCK_CASE, digitSegments } from "./clock-spec";
export { CLOCK_CASE, CLOCK_PARTS } from "./clock-spec";

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function roundedRect(w: number, d: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Extrude a footprint upward (Y) by `height`, bottom at y = 0. */
function slab(shape: THREE.Shape, height: number, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: height - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
}

function labelTexture() {
  const el = document.createElement("canvas");
  el.width = 1024;
  el.height = 576;
  const ctx = el.getContext("2d") as CanvasRenderingContext2D;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(90,40,0,0.55)";
  ctx.font = "700 64px sans-serif";
  ctx.fillText("EXEKU · DESK CLOCK", 512, 420);
  ctx.font = "500 34px sans-serif";
  ctx.fillText("SET          MODE", 760, 150);
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function perfboardTexture() {
  const el = document.createElement("canvas");
  el.width = 512;
  el.height = 384;
  const ctx = el.getContext("2d") as CanvasRenderingContext2D;
  ctx.fillStyle = "#c9a36a";
  ctx.fillRect(0, 0, 512, 384);
  for (let y = 8; y < 384; y += 13.4) for (let x = 8; x < 512; x += 13.4) {
    ctx.fillStyle = "#b07a3a";
    ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3a2a18";
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface Clock {
  group: THREE.Group;
  /** Show a time on the 4-digit display. */
  setTime(hours: number, minutes: number, colon: boolean): void;
  /** 0 = closed product, 1 = lid lifted to show the organized parts. */
  setOpen(t: number): void;
  /** 0 = only the parts, 1 = case fully printed around them. */
  setBuild(t: number): void;
}

export function buildClock(): Clock {
  const { w, h, d, wall, radius } = CLOCK_CASE;
  const std = (color: string, roughness = 0.6, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const pla = std("#f07a0a", 0.58);
  const plaDark = std("#c75f00", 0.6);
  const black = std("#121212", 0.5);
  const rubber = std("#1b1b1b", 0.9);
  const metal = std("#c9ccd1", 0.3, 1);
  const gold = std("#d9b04f", 0.3, 1);
  const pcbBlue = std("#1f4fa3", 0.5);
  const group = new THREE.Group();

  // --- Case: base plate, walls (one seamless rounded ring), lid. ---------------------------------
  const shell = new THREE.Group();
  const outline = roundedRect(w, d, radius);
  const ring = roundedRect(w, d, radius);
  ring.holes.push(roundedRect(w - wall * 2, d - wall * 2, Math.max(1, radius - wall)));
  const wallHeight = h - wall;
  shell.add(mesh(slab(outline, wall, 0.8), pla));
  const walls = mesh(slab(ring, wallHeight - wall), pla, 0, wall, 0);
  shell.add(walls);
  // Layer lines, like a real FDM print: thin darker grooves around the walls.
  const groove = roundedRect(w + 0.1, d + 0.1, radius);
  groove.holes.push(roundedRect(w - 0.4, d - 0.4, radius - 0.2));
  for (let y = 6; y < wallHeight - 2; y += 6) {
    const line = mesh(slab(groove, 0.18), plaDark, 0, y - wall, 0);
    line.castShadow = false;
    walls.add(line);
  }
  for (const [x, z] of [[-w / 2 + 12, -d / 2 + 10], [w / 2 - 12, -d / 2 + 10], [-w / 2 + 12, d / 2 - 10], [w / 2 - 12, d / 2 - 10]]) {
    group.add(mesh(new THREE.CylinderGeometry(4, 4, 1.6, 20), rubber, x, -0.8, z));
  }
  group.add(shell);

  // Front window: smoked acrylic over the display.
  const front = d / 2;
  const win = { w: 70, h: 26, y: 23 };
  const bezel = mesh(new RoundedBoxGeometry(win.w + 4, win.h + 4, 0.8, 2, 0.4), plaDark, 0, win.y, front + 0.1);
  const backing = mesh(new THREE.PlaneGeometry(win.w, win.h), std("#050505", 0.4), 0, win.y, front + 0.52);
  const acrylic = new THREE.Mesh(new THREE.PlaneGeometry(win.w, win.h), new THREE.MeshPhysicalMaterial({ color: "#0b0b0b", roughness: 0.05, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false }));
  acrylic.position.set(0, win.y, front + 0.9);
  group.add(bezel, backing, acrylic);

  // 4-digit, 7-segment display (glowing red-orange) behind the window.
  const segOn = new THREE.MeshBasicMaterial({ color: "#ff6a2a", toneMapped: false });
  const segOff = new THREE.MeshBasicMaterial({ color: "#2a0e06" });
  const DW = 8.2, DH = 14.5, T = 1.7;
  const segGeo = { h: new THREE.BoxGeometry(DW - T, T, 0.3), v: new THREE.BoxGeometry(T, DH / 2 - T, 0.3) };
  const digitMeshes: Array<Record<string, THREE.Mesh>> = [];
  [-22, -10.5, 10.5, 22].forEach((cx) => {
    const segs: Record<string, THREE.Mesh> = {};
    const place = (key: string, geo: THREE.BufferGeometry, x: number, y: number) => {
      const s = new THREE.Mesh(geo, segOff);
      s.position.set(cx + x + 0.9 * (y - win.y) / DH, y, front + 0.62); // slight italic slant
      group.add(s);
      segs[key] = s;
    };
    place("a", segGeo.h, 0, win.y + DH / 2 - T / 2);
    place("g", segGeo.h, 0, win.y);
    place("d", segGeo.h, 0, win.y - DH / 2 + T / 2);
    place("f", segGeo.v, -DW / 2 + T / 2, win.y + DH / 4);
    place("b", segGeo.v, DW / 2 - T / 2, win.y + DH / 4);
    place("e", segGeo.v, -DW / 2 + T / 2, win.y - DH / 4);
    place("c", segGeo.v, DW / 2 - T / 2, win.y - DH / 4);
    digitMeshes.push(segs);
  });
  const colon = [win.y + 3, win.y - 3].map((y) => { const dot = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16), segOff); dot.position.set(0, y, front + 0.62); group.add(dot); return dot; });
  const displayGlow = new THREE.PointLight("#ff5a1f", 80, 60, 2);
  displayGlow.position.set(0, win.y, front + 12);
  group.add(displayGlow);

  // Back: USB port opening lines up with the Nano's USB. Right side: buzzer grille.
  group.add(mesh(new RoundedBoxGeometry(10, 5, 0.6, 2, 0.8), black, -26, 13, -front - 0.1));
  const grille: Array<[number, number]> = [];
  for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) if (r * r + c * c <= 5) grille.push([c * 3.2, r * 3.2]);
  const holes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.9, 0.9, 0.6, 12), black, grille.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  grille.forEach(([z, y], i) => holes.setMatrixAt(i, m4.compose(new THREE.Vector3(w / 2 + 0.05, 22 + y, 8 + z), q, new THREE.Vector3(1, 1, 1))));
  group.add(holes);

  // Lid with engraved label and two button caps.
  const lid = new THREE.Group();
  lid.position.y = wallHeight;
  lid.add(mesh(slab(outline, wall, 0.9), pla));
  const label = new THREE.Mesh(new THREE.PlaneGeometry(w - 16, (w - 16) * 0.5625), new THREE.MeshStandardMaterial({ map: labelTexture(), transparent: true, roughness: 0.7 }));
  label.rotation.x = -Math.PI / 2;
  label.position.set(0, wall + 0.02, 0);
  lid.add(label);
  for (const x of [22, 40]) {
    lid.add(mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.8, 32), plaDark, x, wall + 0.1, -12));
    lid.add(mesh(new THREE.CylinderGeometry(3.2, 3.4, 3, 32), black, x, wall + 1.6, -12));
  }
  const ledMat = new THREE.MeshBasicMaterial({ color: "#7dff9b", toneMapped: false });
  lid.add(mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 16), ledMat, 6, wall + 0.3, -12));
  group.add(lid);

  // --- Organized internals. --------------------------------------------------------------------
  const inside = new THREE.Group();
  const floor = wall;
  for (const [x, z] of [[-34, -18], [34, -18], [-34, 14], [34, 14]]) inside.add(mesh(new THREE.CylinderGeometry(2.2, 2.6, 5, 16), pla, x, floor + 2.5, z));
  const carrierY = floor + 5;
  inside.add(mesh(new THREE.BoxGeometry(80, 1.6, 44), new THREE.MeshStandardMaterial({ map: perfboardTexture(), roughness: 0.7 }), 0, carrierY + 0.8, -2));
  const top = carrierY + 1.6;
  // Arduino Nano on headers, USB facing the back port.
  const nano = new THREE.Group();
  nano.position.set(-22, top + 8.5, -12);
  nano.add(mesh(new THREE.BoxGeometry(18, 1.6, 45), pcbBlue));
  nano.add(mesh(new THREE.BoxGeometry(7, 1.2, 7), black, 0, 1.4, 4));
  nano.add(mesh(new THREE.BoxGeometry(7.6, 3.8, 9), metal, 0, 2.7, -19));
  nano.add(mesh(new THREE.BoxGeometry(3, 1.2, 6), metal, 4, 1.4, 12));
  for (const side of [-1, 1]) {
    inside.add(mesh(new THREE.BoxGeometry(2.5, 8.5, 38), black, -22 + side * 7.6, top + 4.25, -12));
    const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.64, 3, 0.64), gold, 15);
    for (let i = 0; i < 15; i++) pins.setMatrixAt(i, m4.makeTranslation(side * 7.6, 2, -17.8 + i * 2.54));
    nano.add(pins);
  }
  inside.add(nano);
  // DS3231 RTC with coin cell.
  inside.add(mesh(new THREE.BoxGeometry(38, 1.6, 22), pcbBlue, 20, top + 6, -12));
  inside.add(mesh(new THREE.CylinderGeometry(10, 10, 3.2, 40), metal, 24, top + 8.4, -12));
  inside.add(mesh(new THREE.BoxGeometry(7, 2, 10), black, 8, top + 7.8, -12));
  for (const [x, z] of [[4, -20], [36, -20], [4, -4], [36, -4]]) inside.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 5, 10), metal, x, top + 2.5, z));
  // Display module standing behind the front window.
  inside.add(mesh(new THREE.BoxGeometry(50, 26, 1.6), pcbBlue, 0, win.y, front - wall - 8));
  inside.add(mesh(new THREE.BoxGeometry(50, 19, 7), black, 0, win.y, front - wall - 3.5));
  // Buzzer next to the grille, buttons under the caps.
  inside.add(mesh(new THREE.CylinderGeometry(6, 6, 9.5, 32), black, 42, top + 4.75, 8));
  for (const x of [22, 40]) inside.add(mesh(new THREE.BoxGeometry(6, 3.5, 6), black, x, top + 1.75, -12));
  // Tidy wiring: a four-wire ribbon from the Nano to the display, two wires to the buzzer.
  const wire = (from: THREE.Vector3, to: THREE.Vector3, color: string, lift: number) => {
    const curve = new THREE.CatmullRomCurve3([from, from.clone().setY(from.y + lift), to.clone().setY(Math.max(to.y, from.y) + lift * 0.6), to]);
    inside.add(mesh(new THREE.TubeGeometry(curve, 40, 0.55, 8), std(color, 0.5)));
  };
  ["#ff8c1a", "#1d1d1d", "#e8e8e8", "#7a7a7a"].forEach((color, i) => wire(new THREE.Vector3(-15, top + 10, 2 + i * 1.3), new THREE.Vector3(-6 + i * 1.3, win.y - 13, front - wall - 9), color, 6));
  ["#ff8c1a", "#1d1d1d"].forEach((color, i) => wire(new THREE.Vector3(-15, top + 10, -4 - i * 1.3), new THREE.Vector3(38 + i * 2, top + 9.5, 8), color, 10));
  group.add(inside);

  const lidY = wallHeight;
  return {
    group,
    setTime(hours, minutes, on) {
      const text = String(hours).padStart(2, "0") + String(minutes).padStart(2, "0");
      digitMeshes.forEach((segs, i) => {
        const lit = digitSegments(Number(text[i]));
        for (const [key, s] of Object.entries(segs)) s.material = lit.includes(key) ? segOn : segOff;
      });
      colon.forEach((dot) => { dot.material = on ? segOn : segOff; });
    },
    setOpen(t) {
      const k = Math.min(1, Math.max(0, t));
      // Swing the lid up and back like a hinge, out of the way of the parts.
      lid.position.y = lidY + k * 30;
      lid.position.z = -k * 52;
      lid.rotation.x = -k * 0.95;
    },
    setBuild(t) {
      const k = Math.min(1, Math.max(0, t));
      const visible = k > 0.001;
      for (const object of [shell, lid, bezel, backing, acrylic, holes]) object.visible = visible;
      walls.scale.y = Math.max(0.001, k);
      lid.visible = k > 0.98;
    },
  };
}
