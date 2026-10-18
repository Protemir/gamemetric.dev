// Всадник-шабандоз: персонаж Mixamo (Heraklios by A. Dizon — длинный кафтан, сапоги), посаженный в седло кодом.
// Верховой анимации в Mixamo нет, поэтому позу задаём поворотами костей в осях всадника (X — влево, Y — вверх, Z — вперёд):
// ноги расставлены по бокам коня, колени согнуты, стопы в стременах, руки держат повод.
// Каждый кадр поверх позы: наклон корпуса на скаку (lean), правая рука тянется к туше или сопернику (reach).
// Кафтан перекрашивается в цвет команды, красная окантовка — в золото.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import * as SkeletonUtils from '../vendor/utils/SkeletonUtils.js';

let proto = null;
const HEIGHT = 1.72; // рост шабандоза, м
export async function loadRider() {
  const g = await new GLTFLoader().loadAsync('models/rider.glb');
  const root = g.scene;
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material.metalness = 0; } });
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  root.scale.setScalar(HEIGHT / (box.max.y - box.min.y));
  proto = root;
}

// ---------- перекраска одежды ----------
const teamMats = new Map();
function recolor(img, hue) { // коричневая ткань → цвет команды (яркость сохраняем), красная окантовка → золото
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  const [th, ts] = hue;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i] / 255, gg = p[i + 1] / 255, b = p[i + 2] / 255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, s = mx - mn;
    if (s < 0.06) continue; // серое и чёрное (штаны, сапоги, металл) не трогаем
    let h = mx === r ? ((gg - b) / s) % 6 : mx === gg ? (b - r) / s + 2 : (r - gg) / s + 4; h *= 60; if (h < 0) h += 360;
    let nh, ns, nl;
    if ((h < 14 || h > 340) && s > 0.25) { nh = 42; ns = 0.75; nl = Math.min(0.75, l * 1.35 + 0.08); } // окантовка → золото
    else if (h >= 14 && h <= 60 && mx > 0.18) { nh = th; ns = ts; nl = Math.min(0.62, l * 1.12); } // ткань кафтана → цвет команды
    else continue;
    const C = (1 - Math.abs(2 * nl - 1)) * ns, X = C * (1 - Math.abs(((nh / 60) % 2) - 1)), m = nl - C / 2;
    const [r1, g1, b1] = nh < 60 ? [C, X, 0] : nh < 120 ? [X, C, 0] : nh < 180 ? [0, C, X] : nh < 240 ? [0, X, C] : nh < 300 ? [X, 0, C] : [C, 0, X];
    p[i] = (r1 + m) * 255; p[i + 1] = (g1 + m) * 255; p[i + 2] = (b1 + m) * 255;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4;
  return t;
}
function materialsFor(color) {
  if (teamMats.has(color)) return teamMats.get(color);
  const col = new THREE.Color(color), hsl = {}; col.getHSL(hsl);
  const map = new Map();
  proto.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [o.material].flat()) {
      if (map.has(m)) continue;
      const nm = m.clone();
      if (m.map?.image) nm.map = recolor(m.map.image, [hsl.h * 360, Math.min(0.85, hsl.s)]);
      map.set(m, nm);
    }
  });
  teamMats.set(color, map);
  return map;
}

// ---------- поза ----------
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
const Qa = new THREE.Quaternion(), Qb = new THREE.Quaternion(), Qr = new THREE.Quaternion(), V0 = new THREE.Vector3();
// повернуть кость вокруг оси в осях всадника (model — корень персонажа)
function rot(model, bone, axis, ang) {
  if (!bone || !ang) return;
  model.getWorldQuaternion(Qr).invert();
  bone.parent.getWorldQuaternion(Qa); Qa.premultiply(Qr); // родитель в осях всадника
  Qb.setFromAxisAngle(axis, ang);
  bone.quaternion.premultiply(Qa.clone().invert().multiply(Qb).multiply(Qa));
  bone.updateMatrixWorld(true);
}
const BASE = [ // [кость, ось, угол]: посадка в седле
  ['LeftUpLeg', AZ, 0.42], ['RightUpLeg', AZ, -0.42], // ноги врозь — по бокам коня
  ['LeftUpLeg', AX, -1.15], ['RightUpLeg', AX, -1.15], // бёдра вперёд
  ['LeftLeg', AX, 1.55], ['RightLeg', AX, 1.55], // колени согнуты, голень назад-вниз
  ['LeftFoot', AX, -0.35], ['RightFoot', AX, -0.35], // стопа в стремени
  ['Spine', AX, 0.12],
  ['LeftArm', AZ, -1.2], ['RightArm', AZ, 1.2], // руки опущены
  ['LeftArm', AY, -0.55], ['RightArm', AY, 0.55], // и чуть вперёд
  ['LeftForeArm', AY, -1.1], ['RightForeArm', AY, 1.1], // локти согнуты — кисти у холки, держат повод
];

export class Rider {
  constructor(horse, color) {
    const obj = horse.obj, sock = obj.getObjectByName('saddle_socket');
    this.model = SkeletonUtils.clone(proto);
    const mats = materialsFor(color);
    this.model.traverse((o) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map((m) => mats.get(m) || m) : mats.get(o.material) || o.material; });
    this.bone = (n) => this.model.getObjectByName('mixamorig' + n);
    this.model.updateMatrixWorld(true);
    for (const [b, ax, a] of BASE) rot(this.model, this.bone(b), ax, a);
    // для покадровых наклонов: исходный поворот кости и её мировой поворот в осях всадника —
    // чтобы поворачивать «вокруг оси всадника» без пересчёта матриц скелета каждый кадр
    this.base = new Map();
    const Mi = this.model.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const n of ['Spine1', 'Spine2', 'Neck', 'RightArm', 'RightForeArm', 'LeftArm', 'LeftForeArm']) {
      const b = this.bone(n);
      if (b) this.base.set(n, { b, q: b.quaternion.clone(), wInv: b.getWorldQuaternion(new THREE.Quaternion()).premultiply(Mi).invert() });
    }
    // корень всадника = таз: в седле таз чуть выше кости седла
    this.root = new THREE.Group();
    this.root.add(this.model);
    this.model.updateMatrixWorld(true);
    const hips = this.model.worldToLocal(this.bone('Hips').getWorldPosition(new THREE.Vector3())).multiply(this.model.scale);
    this.model.position.set(-hips.x, -hips.y, -hips.z);
    obj.updateMatrixWorld(true);
    const sp = obj.worldToLocal(sock.getWorldPosition(new THREE.Vector3()));
    this.root.position.set(sp.x, sp.y + 0.04, sp.z - 0.06);
    horse.tilt.add(this.root);
    this.root.updateMatrixWorld(true);
    sock.attach(this.root);
    this.lean = 0; this.reach = 0; this.side = -1;
  }
  update(dt, speed, reach, side) {
    const k = 1 - Math.exp(-dt * 6);
    this.lean += (Math.min(speed / 9, 1) * 0.32 - this.lean) * k; // на галопе ложится вперёд
    this.reach += (reach - this.reach) * k;
    this.side = side || this.side;
    for (const v of this.base.values()) v.b.quaternion.copy(v.q);
    this.turn('Spine1', AX, this.lean * 0.6);
    this.turn('Spine2', AX, this.lean * 0.4);
    this.turn('Neck', AX, -this.lean * 0.7); // голова смотрит вперёд, а не в землю
    this.turn('Spine1', AZ, this.reach * 0.35 * -this.side); // корпус клонится к боку
    // рука тянется вниз и вбок: правая (side −1) или левая (+1)
    const arm = this.side < 0 ? 'Right' : 'Left', s = this.side < 0 ? 1 : -1;
    this.turn(arm + 'Arm', AZ, this.reach * 0.5 * s);
    this.turn(arm + 'ForeArm', AY, this.reach * 0.9 * s);
  }
  // поворот кости вокруг оси всадника: local · R(осьВосяхКости, угол)
  turn(n, axis, ang) {
    const v = this.base.get(n);
    if (!v || !ang) return;
    Qb.setFromAxisAngle(V0.copy(axis).applyQuaternion(v.wInv), ang);
    v.b.quaternion.multiply(Qb);
  }
}
