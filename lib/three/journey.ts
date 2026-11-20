/**
 * Scroll-tour zones that follow one player ("you") after the 1v1 arena:
 * a 3v3 team round with a scoreboard that turns into a leaderboard, then the podium.
 * Units are centimetres; figures are stylized and faceless.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { buildPlayer, buildProjector, canvas, glowSprite, holoPanel, limb, mesh, ORANGE, roundRect, STYLES, type PlayerStyle } from "./arena";

type Panel = ReturnType<typeof holoPanel>;

// ---------------------------------------------------------------------------
// Team round: three players a side, one projector, scoreboard <-> leaderboard.
// ---------------------------------------------------------------------------
export const LEADERBOARD = ["Null Pointers", "Off by One", "Segfault City", "Big O Squad", "Stack Smashers", "Recursion Club"] as const;

/** Leaderboard order for a given climb (0 = your team 7th, 1 = your team 1st). */
export function leaderboardRows(climb: number) {
  const rank = Math.max(1, Math.min(7, Math.round(7 - climb * 6)));
  const rows: Array<{ name: string; you: boolean }> = LEADERBOARD.map((name) => ({ name, you: false }));
  rows.splice(rank - 1, 0, { name: "Your team", you: true });
  return { rank, rows };
}

function drawTeamCard(panel: Panel, name: string, solved: number, accent: string) {
  const { ctx, width: w, height: h } = panel;
  ctx.clearRect(0, 0, w, h);
  roundRect(ctx, 8, 8, w - 16, h - 16, 26);
  ctx.fillStyle = "rgba(255,161,22,0.10)";
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffe7c2";
  ctx.font = "700 40px sans-serif";
  ctx.fillText(name, 36, 72);
  ctx.font = "800 96px monospace";
  ctx.fillStyle = accent;
  ctx.fillText(`${solved}/6`, 36, 196);
  ctx.font = "500 26px sans-serif";
  ctx.fillStyle = "rgba(255,220,170,0.75)";
  ctx.fillText("problems solved", 36, 240);
  panel.texture.needsUpdate = true;
}

function drawLeaderboard(panel: Panel, climb: number) {
  const { ctx, width: w, height: h } = panel;
  const { rows } = leaderboardRows(climb);
  ctx.clearRect(0, 0, w, h);
  roundRect(ctx, 8, 8, w - 16, h - 16, 30);
  ctx.fillStyle = "rgba(255,161,22,0.08)";
  ctx.fill();
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffe7c2";
  ctx.font = "700 42px sans-serif";
  ctx.fillText("Leaderboard", 40, 72);
  ctx.font = "500 24px sans-serif";
  ctx.fillStyle = "rgba(255,220,170,0.7)";
  ctx.fillText("Regional round · 6 problems", 40, 108);
  rows.forEach((row, i) => {
    const y = 150 + i * 52;
    if (row.you) {
      roundRect(ctx, 24, y - 6, w - 48, 46, 12);
      ctx.fillStyle = "rgba(255,161,22,0.28)";
      ctx.fill();
    }
    ctx.font = "700 30px monospace";
    ctx.fillStyle = row.you ? "#ffd08a" : "rgba(255,230,200,0.6)";
    ctx.fillText(String(i + 1).padStart(2, "0"), 40, y + 28);
    ctx.font = `${row.you ? 700 : 500} 30px sans-serif`;
    ctx.fillStyle = row.you ? "#fff1dc" : "rgba(255,230,200,0.75)";
    ctx.fillText(row.name, 110, y + 28);
    ctx.font = "600 28px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.max(1, 6 - i)}/6`, w - 44, y + 28);
    ctx.textAlign = "left";
  });
  panel.texture.needsUpdate = true;
}

export function buildTeamZone() {
  const group = new THREE.Group();
  const ours: PlayerStyle[] = [STYLES.mateA, STYLES.you, STYLES.mateB];
  const theirs: PlayerStyle[] = [STYLES.foeA, STYLES.rival, STYLES.foeB];
  [-112, 0, 112].forEach((z, i) => {
    const a = buildPlayer(ours[i]);
    a.position.set(-132, 0, z);
    const b = buildPlayer(theirs[i]);
    b.position.set(132, 0, z);
    b.rotation.y = Math.PI;
    group.add(a, b);
  });
  const projector = buildProjector();
  group.add(projector.group);

  const left = holoPanel(512, 280, 30);
  left.sprite.position.set(-60, 128, 0);
  const right = holoPanel(512, 280, 30);
  right.sprite.position.set(60, 128, 0);
  const board = holoPanel(640, 560, 74);
  board.sprite.position.set(0, 135, 0);
  group.add(left.sprite, right.sprite, board.sprite);
  drawTeamCard(left, "Your team", 4, ORANGE);
  drawTeamCard(right, "Rivals", 3, "#ffd27a");
  let lastClimb = -1;

  return {
    group,
    /** board: 0 = team scoreboard, 1 = leaderboard; climb: 0..1 moves your team from 7th to 1st. */
    update(time: number, board01: number, climb: number) {
      projector.update(time);
      const flicker = 0.88 + Math.sin(time * 23) * 0.04;
      (left.sprite.material as THREE.SpriteMaterial).opacity = flicker * (1 - board01);
      (right.sprite.material as THREE.SpriteMaterial).opacity = flicker * (1 - board01);
      (board.sprite.material as THREE.SpriteMaterial).opacity = flicker * board01;
      left.sprite.position.y = right.sprite.position.y = 128 + Math.sin(time * 1.2) * 1.4;
      const rounded = Math.round(climb * 6) / 6;
      if (rounded !== lastClimb) { lastClimb = rounded; drawLeaderboard(board, rounded); }
    },
  };
}

// ---------------------------------------------------------------------------
// Podium: you on first place with the trophy, rivals on second and third.
// ---------------------------------------------------------------------------
function buildTrophy() {
  const gold = new THREE.MeshStandardMaterial({ color: "#ffb02e", roughness: 0.22, metalness: 1, emissive: "#3a2000", emissiveIntensity: 0.4 });
  const group = new THREE.Group();
  const profile = [[0, 0], [5, 0], [5, 1.6], [1.6, 3.2], [1.2, 9], [3.2, 11], [9, 15], [10.2, 23], [9.4, 23.4], [8.6, 16], [0, 13]].map(([x, y]) => new THREE.Vector2(x, y));
  group.add(mesh(new THREE.LatheGeometry(profile, 40), gold));
  for (const side of [-1, 1]) {
    const handle = mesh(new THREE.TorusGeometry(3.4, 0.7, 10, 24, Math.PI), gold, side * 10, 18, 0);
    handle.rotation.z = side * -Math.PI / 2;
    group.add(handle);
  }
  group.add(mesh(new RoundedBoxGeometry(11, 4, 11, 2, 1), new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.4 }), 0, -2, 0));
  return group;
}

/** Standing player facing +Z. Origin at the feet. */
function buildStanding(style: PlayerStyle, armsUp: boolean) {
  const g = new THREE.Group();
  const std = (color: string, roughness = 0.75) => new THREE.MeshStandardMaterial({ color, roughness });
  const hoodie = std(style.hoodie, 0.85), pants = std(style.pants, 0.85), skin = std(style.skin, 0.6);
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  g.add(limb(v(-8.5, 86, 0), v(8.5, 86, 0), 8, pants));
  for (const s of [-1, 1]) {
    g.add(limb(v(s * 9, 86, 0), v(s * 9.5, 48, 1.5), 7.2, pants));
    g.add(limb(v(s * 9.5, 48, 1.5), v(s * 9.5, 9, 0), 5.8, pants));
    g.add(mesh(new RoundedBoxGeometry(9.5, 6.5, 17, 2, 2.5), std("#f2f2f2", 0.6), s * 9.5, 3.25, 3));
  }
  g.add(limb(v(0, 99, 0), v(0, 129, 0), 14.5, hoodie));
  g.add(limb(v(-12, 130, 0), v(12, 130, 0), 7.2, hoodie));
  g.add(mesh(new THREE.CylinderGeometry(6.4, 8.8, 3.6, 20), hoodie, 0, 141.2, 0));
  g.add(limb(v(0, 139, 0), v(0, 154, 0), 4.5, skin));
  const head = new THREE.Group();
  head.position.set(0, 158, 0);
  head.add(mesh(new THREE.SphereGeometry(10.5, 32, 24), skin));
  const hair = mesh(new THREE.SphereGeometry(11.1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), std(style.hair, 0.9), 0, 0.8, -1.2);
  hair.rotation.x = -0.45;
  head.add(hair);
  const phones = std(style.headphones, 0.4);
  head.add(mesh(new THREE.TorusGeometry(12.2, 1.4, 10, 32, Math.PI), phones));
  for (const s of [-1, 1]) {
    const cup = mesh(new THREE.CylinderGeometry(5, 5, 4, 24), phones, s * 12, -1, 0);
    cup.rotation.z = Math.PI / 2;
    head.add(cup);
  }
  g.add(head);
  for (const s of [-1, 1]) {
    const shoulder = v(s * 14.8, 130.5, 0);
    const elbow = armsUp ? v(s * 23, 155, 2) : v(s * 18.5, 107, 1.5);
    const wrist = armsUp ? v(s * 8.5, 178, 3.5) : v(s * 18.5, 85, 4);
    const hand = armsUp ? v(s * 6.5, 181, 4) : v(s * 18.5, 80.5, 4.8);
    g.add(limb(shoulder, elbow, 5.2, hoodie));
    g.add(limb(elbow, wrist, 4.4, hoodie));
    g.add(mesh(new THREE.SphereGeometry(3.7, 16, 12), skin, hand.x, hand.y, hand.z));
  }
  return g;
}

function numberPlate(text: string, color: string) {
  const c = canvas(256, 256);
  c.ctx.textAlign = "center";
  c.ctx.textBaseline = "middle";
  c.ctx.font = "800 190px sans-serif";
  c.ctx.fillStyle = color;
  c.ctx.fillText(text, 128, 140);
  c.texture.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ map: c.texture, transparent: true, toneMapped: false });
}

export function buildPodiumZone() {
  const group = new THREE.Group();
  const block = new THREE.MeshStandardMaterial({ color: "#171717", roughness: 0.4, metalness: 0.3 });
  const edge = new THREE.MeshStandardMaterial({ color: ORANGE, emissive: ORANGE, emissiveIntensity: 1.2 });
  const places = [
    { x: 0, h: 64, label: "1", color: ORANGE, style: STYLES.you, up: true },
    { x: -76, h: 42, label: "2", color: "#e9e4dc", style: STYLES.rival, up: false },
    { x: 76, h: 26, label: "3", color: "#c99a6b", style: STYLES.foeA, up: false },
  ];
  for (const p of places) {
    group.add(mesh(new RoundedBoxGeometry(74, p.h, 64, 3, 2), block, p.x, p.h / 2, 0));
    group.add(mesh(new THREE.BoxGeometry(74, 1, 1.2), edge, p.x, p.h - 0.5, 32.2));
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), numberPlate(p.label, p.color));
    plate.position.set(p.x, Math.min(p.h / 2, p.h - 17), 32.3);
    group.add(plate);
    const person = buildStanding(p.style, p.up);
    person.position.set(p.x, p.h, -4);
    group.add(person);
  }
  const trophy = buildTrophy();
  trophy.userData.dynamic = true;
  trophy.position.set(0, 64 + 184, 0);
  group.add(trophy);

  // Spotlight on first place and slow falling confetti.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 80, 300, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  beam.position.y = 150;
  group.add(beam);
  const floor = glowSprite("rgba(255,161,22,0.45)", 300);
  floor.position.y = 1;
  group.add(floor);
  const light = new THREE.PointLight("#ffd08a", 16000, 500, 1.4);
  light.position.set(0, 300, 60);
  group.add(light);

  const count = 220;
  const seeds = Float32Array.from({ length: count * 3 }, () => Math.random());
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(ORANGE), new THREE.Color("#ffffff"), new THREE.Color("#ffcf8a")];
  for (let i = 0; i < count; i++) palette[i % 3].toArray(colors, i * 3);
  const confetti = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)).setAttribute("color", new THREE.BufferAttribute(colors, 3)),
    new THREE.PointsMaterial({ size: 2.4, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  group.add(confetti);

  return {
    group,
    update(time: number) {
      trophy.rotation.y = Math.sin(time * 0.8) * 0.4;
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (seeds[i * 3] - 0.5) * 300 + Math.sin(time + i) * 4;
        positions[i * 3 + 1] = 320 - ((seeds[i * 3 + 1] * 320 + time * 22) % 320);
        positions[i * 3 + 2] = (seeds[i * 3 + 2] - 0.5) * 160;
      }
      confetti.geometry.attributes.position.needsUpdate = true;
    },
  };
}
