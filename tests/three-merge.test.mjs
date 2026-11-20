import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { mergeStatic } from "../lib/three/stage.ts";
import { limb } from "../lib/three/arena.ts";

test("mergeStatic bakes static meshes into one mesh per material and leaves moving or transparent parts alone", () => {
  const root = new THREE.Group();
  const solid = new THREE.MeshStandardMaterial({ color: "#ff8800" });
  const same = new THREE.MeshStandardMaterial({ color: "#ff8800" });
  const glass = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4 });
  const a = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), solid); a.castShadow = true;
  const b = new THREE.Mesh(new THREE.SphereGeometry(2), same); b.position.x = 50; b.castShadow = true;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glass);
  const spinner = new THREE.Group(); spinner.userData.dynamic = true;
  spinner.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), solid));
  root.add(a, b, beam, spinner);

  mergeStatic(root, 12);

  const meshes = root.children.filter((o) => o.isMesh && o !== beam);
  assert.equal(meshes.length, 2, "big box casts shadows, small sphere does not, so two buckets");
  assert.ok(meshes.some((m) => m.castShadow) && meshes.some((m) => !m.castShadow));
  assert.ok(root.children.includes(beam), "transparent mesh untouched");
  assert.equal(spinner.children.length, 1, "dynamic subtree untouched");
});

test("limb centers rounded caps on joints a and b so consecutive segments overlap at shared joints", () => {
  const mat = new THREE.MeshStandardMaterial({ color: "#262628" });
  const upper = limb(new THREE.Vector3(0, 100, 0), new THREE.Vector3(0, 50, 0), 6, mat);
  const lower = limb(new THREE.Vector3(0, 50, 0), new THREE.Vector3(0, 10, 0), 5, mat);
  upper.updateMatrixWorld(true);
  lower.updateMatrixWorld(true);

  const upperBox = new THREE.Box3().setFromObject(upper);
  const lowerBox = new THREE.Box3().setFromObject(lower);

  assert.ok(upperBox.min.y < 45, "upper segment extends past the shared joint y=50 by its cap radius");
  assert.ok(lowerBox.max.y > 54, "lower segment extends past the shared joint y=50 by its cap radius");
  assert.ok(upperBox.intersectsBox(lowerBox), "adjacent limbs overlap cleanly at the joint");
});
