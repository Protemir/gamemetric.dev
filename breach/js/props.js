// Furniture and cars: real models (Poly Haven, CC0) in place of the boxes that stand for them in the grid.
// The grid still decides collisions; the models only take over the look. Each model is drawn as instanced
// meshes, lit by the scene's sky + sun lights and darkened by the baked brightness of the spot it stands on.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';

const P = { ready: false, models: {} };
const FILES = ['covered_car', 'Sofa_01', 'coffee_table_round_01', 'dining_table', 'painted_wooden_chair_02', 'GothicCommode_01', 'steel_frame_shelves_01', 'Chandelier_02', 'ArmChair_01', 'side_table_01', 'vintage_grandfather_clock_01', 'fancy_picture_frame_01', 'hanging_picture_frame_01', 'hanging_picture_frame_02', 'marble_bust_01'];
// pictures hang by their middle with the back on the wall; everything else stands on the floor, centred
const WALL = new Set(['fancy_picture_frame_01', 'hanging_picture_frame_01', 'hanging_picture_frame_02']);

export async function loadProps() {
  const loader = new GLTFLoader();
  await Promise.all(
    FILES.map(async (n) => {
      const g = await loader.loadAsync(`assets/props/${n}.glb`);
      g.scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g.scene);
      const c = box.getCenter(new THREE.Vector3());
      const shift = new THREE.Matrix4().makeTranslation(-c.x, WALL.has(n) ? -c.y : -box.min.y, WALL.has(n) ? -box.min.z : -c.z);
      const parts = [];
      g.scene.traverse((o) => {
        if (!o.isMesh) return;
        // glass over the pictures would come out as a black sheet without real transparency
        if (o.material.transparent || /glass/i.test(o.material.name)) return;
        const geo = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(shift, o.matrixWorld));
        const old = o.material;
        if (old.map) old.map.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.MeshLambertMaterial({ map: old.map || null, color: old.map ? 0xffffff : old.color, side: old.side });
        parts.push({ geo, mat });
      });
      P.models[n] = { parts, size: box.getSize(new THREE.Vector3()) };
    }),
  );
  P.ready = true;
}

export const propsReady = () => P.ready;

// where everything goes: x, z (metres), yaw (front faces +z at 0), s scale or h height to fit, y lift
const R = Math.PI;
export function places() {
  const out = [];
  const put = (m, x, z, yaw = 0, o = {}) => out.push({ m, x, z, yaw, ...o });
  // garage and courtyard: cars under covers
  put('covered_car', 53, 39, 0);
  put('covered_car', 51, 54, 0.04);
  // garage shelving along the back wall
  for (let i = 0; i < 6; i++) put('steel_frame_shelves_01', 54.6 + i * 1.15, 31.5, 0, { h: 2.2 });
  // dining room: three tables in a row with chairs down both sides
  for (const tx of [30.4, 33.0, 35.6]) {
    put('dining_table', tx, 16.5, 0, { s: 1.15, sy: 0.865 });
    for (const dx of [-0.62, 0.62]) {
      put('painted_wooden_chair_02', tx + dx, 15.4, 0);
      put('painted_wooden_chair_02', tx + dx, 17.6, R);
    }
  }
  for (const x of [35.8, 37.5, 39.2]) put('GothicCommode_01', x, 24.6, R);
  for (const z of [20.7, 22.2]) put('GothicCommode_01', 40.6, z, -R / 2);
  // library: a reading table and a chest of drawers in the corner
  put('dining_table', 22.5, 42, 0, { s: 1.25, sy: 0.864 });
  put('GothicCommode_01', 11.4, 45, R / 2);
  put('marble_bust_01', 11.4, 45, R / 2, { y: 1.21, s: 1.3 });
  // corridor
  put('GothicCommode_01', 41, 26.3, 0);
  put('marble_bust_01', 41, 26.35, 0, { y: 1.21, s: 1.3 });
  // lounge: sofas round a coffee table, armchairs by the fire
  for (const x of [47.2, 48.8]) put('Sofa_01', x, 16.62, R);
  for (const z of [13.2, 14.8]) put('Sofa_01', 44.38, z, R / 2);
  put('coffee_table_round_01', 48, 14, 0, { s: 1.25 });
  put('ArmChair_01', 54.45, 17.1, R);
  put('ArmChair_01', 55.6, 17.1, R);
  put('side_table_01', 55.05, 16.25, 0);
  // hall: two chandeliers and a clock in the corner
  for (const z of [34.2, 41.6]) put('Chandelier_02', 36, z, 0, { s: 1.6, y: 4 - 0.848 * 1.6 });
  put('vintage_grandfather_clock_01', 43.5, 31.25, 0);
  // pictures: hanging_01 portrait, hanging_02 / fancy_01 landscape
  const pic = (m, x, z, yaw, y, s) => put(m, x, z, yaw, { y, s });
  pic('hanging_picture_frame_01', 28.02, 35.0, R / 2, 2.1, 2.1);
  pic('hanging_picture_frame_02', 44.98, 34.0, -R / 2, 2.1, 2.1);
  pic('hanging_picture_frame_02', 44.98, 42.2, -R / 2, 2.1, 2.1);
  // pictures only on solid wall: not over the lounge doors (41,13-14) and (51-53,8)
  pic('fancy_picture_frame_01', 55.5, 9.02, 0, 2.45, 2.3);
  pic('hanging_picture_frame_02', 42.02, 18.0, R / 2, 2.15, 2.2);
  pic('fancy_picture_frame_01', 27.6, 9.02, 0, 2.15, 2.3);
  pic('hanging_picture_frame_01', 25.02, 20.5, R / 2, 2.1, 1.9);
  pic('hanging_picture_frame_01', 26.98, 36.0, -R / 2, 2.1, 1.9);
  for (const x of [14.5, 24.5, 43.5, 56.5]) pic(Math.floor(x / 10) % 2 ? 'hanging_picture_frame_02' : 'fancy_picture_frame_01', x, 29.98, R, 2.1, 2.0);
  return out;
}

export function buildProps(game) {
  if (!P.ready) return [];
  const list = places();
  const byModel = {};
  for (const p of list) (byModel[p.m] ||= []).push(p);
  const meshes = [];
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  for (const [name, items] of Object.entries(byModel)) {
    const M = P.models[name];
    if (!M) continue;
    for (const part of M.parts) {
      const im = new THREE.InstancedMesh(part.geo, part.mat, items.length);
      items.forEach((p, i) => {
        const k = p.s ?? (p.h ? p.h / M.size.y : 1);
        im.setMatrixAt(i, mx.compose(v.set(p.x, p.y || 0, p.z), q.setFromAxisAngle(up, p.yaw), s.set(k, p.sy ?? k, k)));
        im.setColorAt(i, col.setScalar(Math.min(1.05, game.charLight(p.x, p.z))));
      });
      im.computeBoundingSphere();
      im.name = 'prop-' + name;
      meshes.push(im);
    }
  }
  return meshes;
}
