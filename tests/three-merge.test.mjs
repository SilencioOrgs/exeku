import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { mergeStatic } from "../lib/three/stage.ts";

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
