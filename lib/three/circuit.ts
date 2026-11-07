/**
 * Realistic, procedurally modeled parts for the Hardware Lab, in millimetres:
 * Arduino Uno R3, 400-point half breadboard, 5 mm red LED, 220 Ω resistor and jumper wires.
 * Load this module with `await import()` so three.js stays out of the first page load.
 *
 * Coordinates: X to the right, Y up, Z toward the viewer. A board's "far" edge is -Z.
 * GrabCAD or other CAD models can replace a part: see public/models/README.md.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const PITCH = 2.54;
const UNO_W = 68.58;
const UNO_D = 53.34;
const PCB = 1.6;
const HEADER_H = 8.5;
const BB = { w: 82, h: 8.5, d: 55 };

type Mat = THREE.MeshStandardMaterial;

function materials() {
  const std = (color: string, roughness = 0.6, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  return {
    pcb: std("#00818a", 0.5, 0.05),
    pcbEdge: std("#d9c27a", 0.6),
    plastic: std("#141414", 0.55),
    plasticMatte: std("#1d1d1d", 0.8),
    metal: std("#d4d7dc", 0.28, 1),
    tin: std("#b9bcc2", 0.35, 1),
    gold: std("#d9b04f", 0.3, 1),
    chip: std("#1a1a1a", 0.45),
    board: std("#f2f1ec", 0.75),
    boardGroove: std("#dddbd3", 0.8),
    hole: std("#2b2b2b", 0.9),
    railRed: std("#d93a3a", 0.6),
    railBlue: std("#2f6fd6", 0.6),
    resistor: std("#d8c39a", 0.55),
    capacitor: std("#2a2f3a", 0.4, 0.2),
    capTop: std("#c9ccd1", 0.3, 0.9),
    button: std("#2b2b2b", 0.5),
    crystal: std("#cfd2d6", 0.25, 1),
    ledOff: std("#ff3b30", 0.15, 0, { transparent: true, opacity: 0.78, emissive: "#ff2a1a", emissiveIntensity: 0 }),
    smdLed: std("#ffd27a", 0.3, 0, { emissive: "#ffb000", emissiveIntensity: 0 }),
    smdPower: std("#a6ff9e", 0.3, 0, { emissive: "#38e05a", emissiveIntensity: 1.6 }),
  };
}
type Materials = ReturnType<typeof materials>;

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Box instances (holes, pins) in one draw call. */
function instanced(size: [number, number, number], material: Mat, points: Array<[number, number, number]>) {
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), material, points.length);
  const m = new THREE.Matrix4();
  points.forEach(([x, y, z], i) => inst.setMatrixAt(i, m.makeTranslation(x, y, z)));
  inst.receiveShadow = true;
  return inst;
}

// ---------------------------------------------------------------------------
// Arduino Uno R3. Board coordinates follow the official drawing (origin at the
// lower-left corner, Y toward the digital header) and are converted to world.
// ---------------------------------------------------------------------------
const ux = (x: number) => x - UNO_W / 2;
const uz = (y: number) => -(y - UNO_D / 2);

/** Board-space x positions of the header pins we wire to. */
export const UNO_PINS = { d13: 28.956, gnd: 26.416, digitalY: 50.8 } as const;

function unoSilkscreen() {
  const s = 14; // px per mm
  return canvasTexture(Math.round(UNO_W * s), Math.round(UNO_D * s), (ctx) => {
    const X = (x: number) => x * s;
    const Y = (y: number) => (UNO_D - y) * s;
    ctx.fillStyle = "#f4f7f7";
    ctx.strokeStyle = "#f4f7f7";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "600 22px sans-serif";
    ctx.fillText("DIGITAL (PWM~)", X(44), Y(44.6));
    const digital = ["SCL", "SDA", "AREF", "GND", "13", "12", "~11", "~10", "~9", "8"];
    digital.forEach((label, i) => {
      ctx.save();
      ctx.translate(X(18.796 + i * PITCH), Y(47.2));
      ctx.rotate(-Math.PI / 2);
      ctx.font = "600 13px sans-serif";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });
    ["7", "~6", "~5", "4", "~3", "2", "TX1", "RX0"].forEach((label, i) => {
      ctx.save();
      ctx.translate(X(45.72 + i * PITCH), Y(47.2));
      ctx.rotate(-Math.PI / 2);
      ctx.font = "600 13px sans-serif";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });
    ["IOREF", "RESET", "3V3", "5V", "GND", "GND", "VIN"].forEach((label, i) => {
      ctx.save();
      ctx.translate(X(30.48 + i * PITCH), Y(6.4));
      ctx.rotate(-Math.PI / 2);
      ctx.font = "600 12px sans-serif";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });
    ["A0", "A1", "A2", "A3", "A4", "A5"].forEach((label, i) => {
      ctx.font = "600 13px sans-serif";
      ctx.fillText(label, X(50.8 + i * PITCH), Y(5.6));
    });
    ctx.font = "600 20px sans-serif";
    ctx.fillText("POWER", X(36.8), Y(10.2));
    ctx.fillText("ANALOG IN", X(57.2), Y(10.2));
    ctx.font = "italic 800 92px sans-serif";
    ctx.fillText("UNO", X(30), Y(28));
    ctx.font = "600 16px sans-serif";
    ctx.fillText("R3", X(41.5), Y(24.4));
    ctx.textAlign = "left";
    ctx.font = "600 14px sans-serif";
    ctx.fillText("L", X(26.6), Y(43.2));
    ctx.fillText("TX", X(26.6), Y(40.2));
    ctx.fillText("RX", X(26.6), Y(37.8));
    ctx.fillText("ON", X(60.2), Y(41.6));
    ctx.fillText("ICSP", X(60.6), Y(31.2));
    ctx.lineWidth = 2;
    ctx.strokeRect(X(27.4), Y(20.8), X(36.4), (20.8 - 9.6) * s);
  });
}

function buildUno(m: Materials) {
  const group = new THREE.Group();
  group.name = "arduino-uno";

  // PCB outline with the Uno's chamfered right edge and four mounting holes.
  const shape = new THREE.Shape();
  const outline: Array<[number, number]> = [[0, 0], [66.04, 0], [66.04, 1.27], [68.58, 3.81], [68.58, 38.1], [66.04, 40.64], [66.04, 51.82], [64.52, 53.34], [0, 53.34]];
  outline.forEach(([x, y], i) => (i ? shape.lineTo(ux(x), y - UNO_D / 2) : shape.moveTo(ux(x), y - UNO_D / 2)));
  for (const [hx, hy] of [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]]) {
    const hole = new THREE.Path();
    hole.absarc(ux(hx), hy - UNO_D / 2, 1.6, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const pcbGeo = new THREE.ExtrudeGeometry(shape, { depth: PCB, bevelEnabled: false, curveSegments: 24 });
  pcbGeo.rotateX(-Math.PI / 2);
  group.add(mesh(pcbGeo, m.pcb));
  for (const [hx, hy] of [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]]) {
    const ring = mesh(new THREE.RingGeometry(1.6, 2.6, 24), m.tin, ux(hx), PCB + 0.02, uz(hy));
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
  }

  const silk = new THREE.Mesh(new THREE.PlaneGeometry(UNO_W, UNO_D), new THREE.MeshStandardMaterial({ map: unoSilkscreen(), transparent: true, roughness: 0.7 }));
  silk.rotation.x = -Math.PI / 2;
  silk.position.y = PCB + 0.01;
  group.add(silk);

  const top = PCB;
  // USB-B and barrel jack overhang the left edge like the real board.
  group.add(mesh(new RoundedBoxGeometry(16, 10.9, 12, 2, 0.6), m.metal, ux(16 / 2 - 6.35), top + 10.9 / 2, uz(38.1)));
  group.add(mesh(new THREE.BoxGeometry(0.4, 6.4, 8), m.plastic, ux(-6.4), top + 5.4, uz(38.1)));
  const jack = mesh(new RoundedBoxGeometry(14, 11, 9, 2, 0.8), m.plasticMatte, ux(14 / 2 - 1.8), top + 5.5, uz(7.6));
  group.add(jack);
  const jackHole = mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.6, 24), m.hole, ux(-1.9), top + 5.6, uz(7.6));
  jackHole.rotation.z = Math.PI / 2;
  group.add(jackHole);

  // ATmega328P DIP-28 with legs and a pin-1 notch.
  const chipX = ux(46.2), chipZ = uz(15.2);
  group.add(mesh(new RoundedBoxGeometry(35.6, 3.6, 7.4, 2, 0.4), m.chip, chipX, top + 3.4 + 1.8 - 1.2, chipZ));
  const notch = mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 16, 1, false, 0, Math.PI), m.plastic, chipX - 17.8, top + 4.05, chipZ);
  notch.rotation.y = Math.PI / 2;
  group.add(notch);
  const legs: Array<[number, number, number]> = [];
  for (let i = 0; i < 14; i++) for (const side of [-1, 1]) legs.push([chipX - 16.5 + i * PITCH, top + 1.6, chipZ + side * 4.0]);
  group.add(instanced([0.5, 3.2, 1.2], m.tin, legs));
  group.add(mesh(new THREE.BoxGeometry(37, 1.4, 9.4), m.plastic, chipX, top + 0.7, chipZ)); // socket

  // Small parts: 16U2, crystal, regulator, capacitors, reset button, ICSP headers.
  group.add(mesh(new RoundedBoxGeometry(5, 1, 5, 1, 0.2), m.chip, ux(18.5), top + 0.5, uz(36.5)));
  group.add(mesh(new RoundedBoxGeometry(11, 3.6, 4.6, 2, 1.6), m.crystal, ux(31.5), top + 1.8, uz(26.2)));
  group.add(mesh(new THREE.BoxGeometry(6.5, 2.3, 7), m.chip, ux(8.8), top + 1.15, uz(17.6)));
  group.add(mesh(new THREE.BoxGeometry(6.5, 0.6, 3), m.tin, ux(8.8), top + 0.3, uz(21.6)));
  for (const cx of [13.4, 19.2]) {
    group.add(mesh(new THREE.CylinderGeometry(3, 3, 5.6, 28), m.capacitor, ux(cx), top + 2.8, uz(11.2)));
    group.add(mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.2, 28), m.capTop, ux(cx), top + 5.7, uz(11.2)));
  }
  group.add(mesh(new THREE.BoxGeometry(6, 3.4, 6), m.tin, ux(6.6), top + 1.7, uz(49.2)));
  group.add(mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.4, 20), m.button, ux(6.6), top + 4.1, uz(49.2)));
  const icspPins: Array<[number, number, number]> = [];
  for (const [bx, by] of [[63.6, 27.9], [26.5, 46.3]]) {
    for (let c = 0; c < 2; c++) for (let r = 0; r < 3; r++) icspPins.push([ux(bx + c * PITCH), top + 4.2, uz(by - r * PITCH)]);
    group.add(mesh(new THREE.BoxGeometry(5.08, 2.5, 7.62), m.plastic, ux(bx + PITCH / 2), top + 1.25, uz(by - PITCH)));
  }
  group.add(instanced([0.64, 6, 0.64], m.gold, icspPins));

  // Female headers with dark openings.
  const holes: Array<[number, number, number]> = [];
  const header = (fromX: number, y: number, count: number) => {
    const length = count * PITCH;
    group.add(mesh(new THREE.BoxGeometry(length, HEADER_H, PITCH), m.plastic, ux(fromX - PITCH / 2 + length / 2), top + HEADER_H / 2, uz(y)));
    for (let i = 0; i < count; i++) holes.push([ux(fromX + i * PITCH), top + HEADER_H + 0.01, uz(y)]);
  };
  header(18.796, 50.8, 10);
  header(45.72, 50.8, 8);
  header(27.94, 2.54, 8);
  header(50.8, 2.54, 6);
  group.add(instanced([1.0, 0.04, 1.0], m.hole, holes));

  // SMD status LEDs. "L" follows pin 13, like the real board.
  const smd = (x: number, y: number, material: Mat) => group.add(mesh(new THREE.BoxGeometry(1.6, 0.6, 0.8), material, ux(x), top + 0.3, uz(y)));
  const ledL = m.smdLed;
  smd(25.2, 43.2, ledL);
  smd(25.2, 40.2, m.smdLed.clone());
  smd(25.2, 37.8, m.smdLed.clone());
  smd(58.6, 41.6, m.smdPower);

  // Rubber feet keep the solder side off the table.
  for (const [hx, hy] of [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]]) {
    group.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 3, 16), m.plasticMatte, ux(hx), -1.5, uz(hy)));
  }
  return { group, ledL };
}

/** World position (relative to the Uno group) of a digital header pin's opening. */
function unoPinTop(x: number) {
  return new THREE.Vector3(ux(x), PCB + HEADER_H, uz(UNO_PINS.digitalY));
}

// ---------------------------------------------------------------------------
// 400-point half breadboard: 30 columns, rows a–j, two power rails per side.
// ---------------------------------------------------------------------------
type Row = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j";
const ROWS: Row[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
/** Hole position on top of the breadboard. Rows a–e are near (+Z), f–j far (-Z). Column is 1-based. */
export function bbHole(col: number, row: Row) {
  const k = ROWS.indexOf(row);
  const z = k < 5 ? 3.81 + (4 - k) * PITCH : -(3.81 + (k - 5) * PITCH);
  return new THREE.Vector3((col - 15.5) * PITCH, BB.h, z);
}
/** Power rail hole. side: far (-Z) or near (+Z); rail: "-" inner, "+" outer. index 0..24. */
export function bbRail(side: "far" | "near", rail: "-" | "+", index: number) {
  const g = Math.floor(index / 5), h = index % 5;
  const sign = side === "far" ? -1 : 1;
  return new THREE.Vector3((g * 6 + h - 14) * PITCH, BB.h, sign * (rail === "-" ? 19.05 : 21.59));
}

function breadboardLabels() {
  const s = 12;
  return canvasTexture(BB.w * s, BB.d * s, (ctx) => {
    ctx.fillStyle = "#8a8880";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "500 16px sans-serif";
    const X = (x: number) => (x + BB.w / 2) * s;
    const Y = (z: number) => (z + BB.d / 2) * s;
    for (let c = 1; c <= 30; c++) {
      if (c === 1 || c % 5 === 0) {
        const p = bbHole(c, "a");
        ctx.fillText(String(c), X(p.x), Y(16.3));
        ctx.fillText(String(c), X(p.x), Y(-16.3));
      }
    }
    ROWS.forEach((row) => {
      const p = bbHole(1, row);
      ctx.fillText(row, X(-BB.w / 2 + 1.7), Y(p.z));
      ctx.fillText(row, X(BB.w / 2 - 1.7), Y(p.z));
    });
    ctx.font = "700 20px sans-serif";
    for (const [z, sign, color] of [[-24.2, "+", "#d93a3a"], [-16.6, "−", "#2f6fd6"], [16.6, "−", "#2f6fd6"], [24.2, "+", "#d93a3a"]] as const) {
      ctx.fillStyle = color;
      ctx.fillText(sign, X(-BB.w / 2 + 2.4), Y(z));
    }
  });
}

function buildBreadboard(m: Materials) {
  const group = new THREE.Group();
  group.name = "breadboard";
  group.add(mesh(new RoundedBoxGeometry(BB.w, BB.h, BB.d, 2, 0.9), m.board, 0, BB.h / 2, 0));
  group.add(mesh(new THREE.BoxGeometry(BB.w - 3, 0.3, 2.6), m.boardGroove, 0, BB.h + 0.02, 0));
  for (const [z, material] of [[-23.9, m.railRed], [-16.75, m.railBlue], [16.75, m.railBlue], [23.9, m.railRed]] as const) {
    group.add(mesh(new THREE.BoxGeometry(70, 0.05, 0.5), material, 0, BB.h + 0.03, z));
  }
  const holes: Array<[number, number, number]> = [];
  for (let c = 1; c <= 30; c++) for (const row of ROWS) { const p = bbHole(c, row); holes.push([p.x, p.y + 0.01, p.z]); }
  for (const side of ["far", "near"] as const) for (const rail of ["-", "+"] as const) for (let i = 0; i < 25; i++) { const p = bbRail(side, rail, i); holes.push([p.x, p.y + 0.01, p.z]); }
  group.add(instanced([1.05, 0.04, 1.05], m.hole, holes));
  const labels = new THREE.Mesh(new THREE.PlaneGeometry(BB.w, BB.d), new THREE.MeshStandardMaterial({ map: breadboardLabels(), transparent: true, roughness: 0.8 }));
  labels.rotation.x = -Math.PI / 2;
  labels.position.y = BB.h + 0.02;
  group.add(labels);
  return group;
}

// ---------------------------------------------------------------------------
// LED, resistor and jumper wires.
// ---------------------------------------------------------------------------
function glowTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,120,90,1)");
    g.addColorStop(0.25, "rgba(255,60,40,0.55)");
    g.addColorStop(1, "rgba(255,40,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

/** 5 mm LED standing in two holes; anode (long leg) first. */
function buildLed(m: Materials, anode: THREE.Vector3, cathode: THREE.Vector3) {
  const group = new THREE.Group();
  group.name = "led-5mm";
  const mid = anode.clone().add(cathode).multiplyScalar(0.5);
  const base = BB.h + 7;
  for (const [p, extra] of [[anode, 0], [cathode, 0]] as const) {
    group.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, base - BB.h + extra, 8), m.tin, p.x, BB.h + (base - BB.h) / 2, p.z));
  }
  const epoxy = m.ledOff;
  group.add(mesh(new THREE.CylinderGeometry(2.9, 2.9, 1, 32), epoxy, mid.x, base + 0.5, mid.z));
  group.add(mesh(new THREE.CylinderGeometry(2.5, 2.5, 5.2, 32), epoxy, mid.x, base + 3.6, mid.z));
  const dome = mesh(new THREE.SphereGeometry(2.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), epoxy, mid.x, base + 6.2, mid.z);
  group.add(dome);
  const light = new THREE.PointLight("#ff3b22", 0, 60, 1.6);
  light.position.set(mid.x, base + 5, mid.z);
  group.add(light);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(mid.x, base + 5, mid.z);
  glow.scale.set(26, 26, 1);
  group.add(glow);
  return { group, epoxy, light, glow };
}

/** 220 Ω resistor lying across the board: bands red, red, brown, gold. */
function buildResistor(m: Materials, a: THREE.Vector3, b: THREE.Vector3) {
  const group = new THREE.Group();
  group.name = "resistor-220";
  const y = BB.h + 3.2;
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const body = new THREE.Group();
  body.add(mesh(new THREE.CapsuleGeometry(1.15, 3.6, 6, 18), m.resistor));
  const bandColors = ["#c62828", "#c62828", "#6d3b17", "#c9a227"];
  [-1.6, -0.7, 0.2, 1.6].forEach((offset, i) => body.add(mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.45, 18), new THREE.MeshStandardMaterial({ color: bandColors[i], roughness: 0.5, metalness: i === 3 ? 0.6 : 0 }), 0, offset, 0)));
  body.rotation.z = Math.PI / 2;
  body.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
  body.position.set(mid.x, y, mid.z);
  group.add(body);
  const lead = new THREE.CatmullRomCurve3([a.clone().setY(BB.h - 0.5), a.clone().setY(y - 0.4), a.clone().lerp(mid, 0.3).setY(y), b.clone().lerp(mid, 0.3).setY(y), b.clone().setY(y - 0.4), b.clone().setY(BB.h - 0.5)], false, "catmullrom", 0.05);
  group.add(mesh(new THREE.TubeGeometry(lead, 48, 0.28, 6), m.tin));
  return group;
}

/** Male-to-male jumper wire that arcs between two holes. */
function buildJumper(m: Materials, from: THREE.Vector3, to: THREE.Vector3, color: string, lift = 14) {
  const group = new THREE.Group();
  const insulation = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
  const housing = 7;
  const a = from.clone().setY(from.y + housing);
  const b = to.clone().setY(to.y + housing);
  const peak = Math.max(a.y, b.y) + lift;
  const curve = new THREE.CatmullRomCurve3([
    a,
    a.clone().setY(a.y + 4),
    a.clone().lerp(b, 0.3).setY(peak),
    a.clone().lerp(b, 0.7).setY(peak),
    b.clone().setY(b.y + 4),
    b,
  ], false, "centripetal");
  group.add(mesh(new THREE.TubeGeometry(curve, 96, 0.85, 10), insulation));
  for (const end of [from, to]) {
    group.add(mesh(new THREE.BoxGeometry(2.4, housing - 1, 2.4), m.plastic, end.x, end.y + housing / 2 + 0.5, end.z));
    group.add(mesh(new THREE.CylinderGeometry(0.32, 0.32, 3, 8), m.gold, end.x, end.y, end.z));
  }
  return group;
}

// ---------------------------------------------------------------------------
// The blink circuit: pin 13 -> 220 Ω -> LED -> GND rail -> GND.
// ---------------------------------------------------------------------------
export interface Circuit {
  group: THREE.Group;
  bounds: THREE.Box3;
  setLed(on: boolean): void;
  dispose(): void;
}

export function buildCircuit(): Circuit {
  const m = materials();
  const group = new THREE.Group();
  const uno = buildUno(m);
  uno.group.position.set(-46, 3, 0);
  group.add(uno.group);

  const board = buildBreadboard(m);
  board.position.set(46, 0, 0);
  group.add(board);
  const onBoard = (v: THREE.Vector3) => v.clone().add(board.position);
  const onUno = (v: THREE.Vector3) => v.clone().add(uno.group.position);

  const resistor = buildResistor(m, onBoard(bbHole(6, "g")), onBoard(bbHole(11, "g")));
  group.add(resistor);
  const led = buildLed(m, onBoard(bbHole(11, "i")), onBoard(bbHole(12, "i")));
  group.add(led.group);
  group.add(buildJumper(m, onUno(unoPinTop(UNO_PINS.d13)), onBoard(bbHole(6, "j")), "#ff8c1a", 7));
  group.add(buildJumper(m, onBoard(bbHole(12, "j")), onBoard(bbRail("far", "-", 10)), "#1f1f1f", 6));
  group.add(buildJumper(m, onUno(unoPinTop(UNO_PINS.gnd)), onBoard(bbRail("far", "-", 1)), "#1f1f1f", 9));

  const bounds = new THREE.Box3().setFromObject(group);
  return {
    group,
    bounds,
    setLed(on) {
      led.epoxy.emissiveIntensity = on ? 2.4 : 0;
      led.epoxy.opacity = on ? 0.95 : 0.78;
      led.light.intensity = on ? 900 : 0;
      (led.glow.material as THREE.SpriteMaterial).opacity = on ? 0.9 : 0;
      uno.ledL.emissiveIntensity = on ? 2 : 0;
    },
    dispose() { disposeTree(group); },
  };
}

// ---------------------------------------------------------------------------
// Auto-sized enclosure: base, four walls with USB and power cutouts, smoked lid.
// ---------------------------------------------------------------------------
export interface Enclosure {
  group: THREE.Group;
  outer: { w: number; d: number; h: number };
  wall: number;
  /** 0 = nothing printed yet, 1 = walls fully printed. */
  setBuild(t: number): void;
  /** 0 = lid lifted away, 1 = lid closed. */
  setLid(t: number): void;
  setLidVisible(visible: boolean): void;
}

export function buildEnclosure(bounds: THREE.Box3, { wall = 2.4, gap = 5 } = {}): Enclosure {
  const shell = new THREE.MeshStandardMaterial({ color: "#e86f00", roughness: 0.62, metalness: 0 });
  const lidMat = new THREE.MeshPhysicalMaterial({ color: "#1a1a1a", roughness: 0.08, metalness: 0, transparent: true, opacity: 0.42, clearcoat: 1 });
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  // Tall enough that the lid clears the jumper wires.
  const inner = { w: size.x + gap * 2, d: size.z + gap * 2, h: Math.max(30, size.y + 2) };
  const outer = { w: inner.w + wall * 2, d: inner.d + wall * 2, h: inner.h + wall };
  const group = new THREE.Group();
  group.position.set(center.x, -wall - 1.5, center.z);

  const walls = new THREE.Group();
  const base = mesh(new RoundedBoxGeometry(outer.w, wall, outer.d, 3, 1.1), shell, 0, wall / 2, 0);
  group.add(base);
  const add = (w: number, h: number, d: number, x: number, y: number, z: number) => w > 0.5 && d > 0.5 && h > 0.5 && walls.add(mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.9, w / 2 - 0.01, d / 2 - 0.01)), shell, x, y, z));
  add(outer.w, outer.h, wall, 0, outer.h / 2, outer.d / 2 - wall / 2);
  add(outer.w, outer.h, wall, 0, outer.h / 2, -outer.d / 2 + wall / 2);
  add(wall, outer.h, outer.d, outer.w / 2 - wall / 2, outer.h / 2, 0);
  // Left wall: openings for the USB-B port and the barrel jack (Uno at its fixed spot).
  const lx = -outer.w / 2 + wall / 2;
  const usbZ = uz(38.1) - center.z, jackZ = uz(7.6) - center.z;
  const openings = [[usbZ, 14, 16], [jackZ, 11, 16]].sort((p, q) => p[0] - q[0]);
  let cursor = -outer.d / 2;
  for (const [z, width, height] of openings) {
    const start = z - width / 2, end = z + width / 2;
    if (start > cursor) add(wall, outer.h, start - cursor, lx, outer.h / 2, (cursor + start) / 2);
    add(wall, outer.h - height, width, lx, height + (outer.h - height) / 2, z);
    cursor = end;
  }
  add(wall, outer.h, outer.d / 2 - cursor, lx, outer.h / 2, (cursor + outer.d / 2) / 2);
  group.add(walls);

  const lid = mesh(new RoundedBoxGeometry(outer.w, wall, outer.d, 3, 1.1), lidMat, 0, outer.h + wall / 2, 0);
  lid.castShadow = false;
  group.add(lid);
  const lidY = outer.h + wall / 2;

  return {
    group,
    outer,
    wall,
    setBuild(t) {
      const k = Math.min(1, Math.max(0, t));
      walls.visible = k > 0.001;
      walls.scale.y = Math.max(0.001, k);
      base.visible = k > 0.001;
    },
    setLid(t) {
      const k = Math.min(1, Math.max(0, t));
      lid.visible = k > 0.001;
      lid.position.y = lidY + (1 - k) * 60;
      lidMat.opacity = 0.42 * k;
    },
    setLidVisible(visible) { lid.visible = visible; lid.position.y = lidY; lidMat.opacity = 0.42; },
  };
}

export function disposeTree(root: THREE.Object3D) {
  root.traverse((object) => {
    const item = object as THREE.Mesh;
    item.geometry?.dispose();
    const list = Array.isArray(item.material) ? item.material : item.material ? [item.material] : [];
    for (const material of list) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });
}
