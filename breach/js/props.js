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
  for (const z of [34.2, 41.6]) put('Chandelier_02', 36, z, 0, { s: 1.6, y: 7.2 - 0.848 * 1.6 });
  put('vintage_grandfather_clock_01', 31.5, 31.25, 0);
  // pictures: hanging_01 portrait, hanging_02 / fancy_01 landscape
  const pic = (m, x, z, yaw, y, s) => put(m, x, z, yaw, { y, s });
  // the hall's pictures hang upstairs, over the galleries
  pic('hanging_picture_frame_01', 28.02, 34.0, R / 2, 5.0, 2.1);
  pic('hanging_picture_frame_02', 44.98, 34.0, -R / 2, 5.0, 2.1);
  pic('hanging_picture_frame_02', 44.98, 41.0, -R / 2, 4.6, 2.1);
  pic('hanging_picture_frame_01', 28.02, 41.0, R / 2, 4.6, 2.1);
  // pictures only on solid wall: not over the lounge doors (41,13-14) and (51-53,8)
  pic('fancy_picture_frame_01', 55.5, 9.02, 0, 2.45, 2.3);
  pic('hanging_picture_frame_02', 42.02, 18.0, R / 2, 2.15, 2.2);
  pic('fancy_picture_frame_01', 27.6, 9.02, 0, 2.15, 2.3);
  pic('hanging_picture_frame_01', 25.02, 20.5, R / 2, 2.1, 1.9);
  pic('hanging_picture_frame_01', 26.98, 36.0, -R / 2, 2.1, 1.9);
  for (const x of [14.5, 24.5, 43.5, 56.5]) pic(Math.floor(x / 10) % 2 ? 'hanging_picture_frame_02' : 'fancy_picture_frame_01', x, 29.98, R, 2.1, 2.0);
  return out;
}

// bullets against the models themselves: the grid's cells under a model are whole boxes, the model is
// not, so a shot past a shelf's side or under a table met air. Returns (cell, ray, t0, t1) -> hit,
// null for "no model surface in this cell along the ray" (a modelled cell is not drawn as a box), undefined elsewhere.
export function propHitter(map, modelled) {
  if (!P.ready) return null;
  const W = 72;
  const cells = new Map();
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  for (const p of places()) {
    const M = P.models[p.m];
    if (!M || WALL.has(p.m)) continue;
    const k = p.s ?? (p.h ? p.h / M.size.y : 1);
    const mat = mx.compose(v.set(p.x, p.y || 0, p.z), q.setFromAxisAngle(up, p.yaw), s.set(k, p.sy ?? k, k)).clone();
    const box = new THREE.Box3();
    const meshes = M.parts.map((part) => {
      part.geo.boundingBox || part.geo.computeBoundingBox();
      box.union(part.geo.boundingBox);
      const m = new THREE.Mesh(part.geo, side);
      m.updateMatrixWorld(true);
      return m;
    });
    box.applyMatrix4(mat);
    const it = { mat, inv: mat.clone().invert(), nrm: new THREE.Matrix3().getNormalMatrix(mat), box, meshes };
    for (let cz = Math.floor(box.min.z); cz <= Math.floor(box.max.z); cz++)
      for (let cx = Math.floor(box.min.x); cx <= Math.floor(box.max.x); cx++) {
        const c = cz * W + cx;
        if (cx < 0 || cz < 0 || cx >= W || !modelled(map.kind[c])) continue;
        (cells.get(c) || cells.set(c, []).get(c)).push(it);
      }
  }
  const rc = new THREE.Raycaster(), wr = new THREE.Ray(), a = new THREE.Vector3(), b = new THREE.Vector3(), pw = new THREE.Vector3(), n = new THREE.Vector3(), out = [];
  return (c, ox, oy, oz, dx, dy, dz, t0, t1) => {
    const L = cells.get(c);
    if (!L) return modelled(map.kind[c]) ? null : undefined;
    let best = null;
    wr.origin.set(ox, oy, oz);
    wr.direction.set(dx, dy, dz);
    for (const it of L) {
      const enter = wr.intersectBox(it.box, pw);
      if (!enter || pw.sub(wr.origin).length() > t1 + 0.01) continue;
      a.set(ox, oy, oz).applyMatrix4(it.inv);
      b.set(ox + dx * t1, oy + dy * t1, oz + dz * t1).applyMatrix4(it.inv);
      const len = b.distanceTo(a);
      if (len < 1e-6) continue;
      rc.set(a, b.sub(a).divideScalar(len));
      rc.far = len;
      for (const m of it.meshes) {
        out.length = 0;
        m.raycast(rc, out);
        for (const h of out) {
          pw.copy(h.point).applyMatrix4(it.mat);
          const t = (pw.x - ox) * dx + (pw.y - oy) * dy + (pw.z - oz) * dz;
          if (t < t0 - 1e-4 || t > t1 + 1e-4 || (best && t >= best.t)) continue;
          n.copy(h.face.normal).applyMatrix3(it.nrm).normalize();
          if (n.x * dx + n.y * dy + n.z * dz > 0) n.negate();
          best = { t: Math.max(t0, t), nx: n.x, ny: n.y, nz: n.z, c };
        }
      }
    }
    return best;
  };
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
