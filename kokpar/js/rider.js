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
  const g = await new GLTFLoader().loadAsync('models/rider.glb', (e) => window.__loadProg?.('rider', e.loaded));
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
  // не больше 1024 px: всадник на экране мелкий, а попиксельная перекраска 2048² стоила полсекунды на старте
  const k = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, c.width, c.height);
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
const Vs = new THREE.Vector3(), Vt = new THREE.Vector3();
const Mm = new THREE.Matrix4(), Vm = new THREE.Vector3(), Qm = new THREE.Quaternion(), Sm = new THREE.Vector3();
const Qa = new THREE.Quaternion(), Qb = new THREE.Quaternion(), Qr = new THREE.Quaternion(), V0 = new THREE.Vector3();
const STAND_Y = 0.85; // высота таза стоящего на земле всадника (0.98 было выше — ноги не доставали до земли, «летал»)
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
    this.orig = [];
    this.model.traverse((o) => { if (o.isMesh) this.orig.push([o, o.material]); });
    this.setColor(color);
    this.bone = (n) => this.model.getObjectByName('mixamorig' + n);
    this.model.updateMatrixWorld(true);
    for (const [b, ax, a] of BASE) rot(this.model, this.bone(b), ax, a);
    // для покадровых наклонов: исходный поворот кости и её мировой поворот в осях всадника —
    // чтобы поворачивать «вокруг оси всадника» без пересчёта матриц скелета каждый кадр
    this.base = new Map();
    const Mi = this.model.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const n of ['Spine1', 'Spine2', 'Neck', 'RightArm', 'RightForeArm', 'LeftArm', 'LeftForeArm', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg']) {
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
    this.sock = sock;
    this.home = { pos: this.root.position.clone(), quat: this.root.quaternion.clone(), scale: this.root.scale.clone() };
    this.lean = 0; this.reach = 0; this.side = -1;
    this.horse = horse;
    // тело в седле на пружине: седло дёргается — корпус и голова догоняют с запаздыванием
    this.sw = { p: 0, pv: 0, r: 0, rv: 0, pos: null, vel: new THREE.Vector3(), acc: new THREE.Vector3() };
    this.fallen = null;
  }
  // падение с коня: слетает с той скоростью, что была, в полёте машет руками и поджимается,
  // бьётся плечом о землю, чуть подпрыгивает, перекатывается на спину, а потом встаёт
  // flips — лишние полные кувырки в воздухе: от сильного удара всадник летит колесом
  fall(scene, vx, vy, vz, sideSign, flips = 0) {
    if (this.fallen) return;
    this.root.updateMatrixWorld(true);
    scene.attach(this.root);
    // крутится так, чтобы успеть докрутить до земли
    const lim = 1.4 + flips * Math.PI * 2, h = Math.max(0.3, this.root.position.y - 0.24), T = (vy + Math.sqrt(vy * vy + 19.6 * h)) / 9.8;
    const up = new THREE.Euler().setFromQuaternion(this.root.quaternion, 'YXZ');
    this.fallen = {
      t: 0, vel: new THREE.Vector3(vx, vy, vz), side: sideSign,
      spin: new THREE.Vector3(0, 0, 1).applyQuaternion(this.root.quaternion).normalize(),
      w: Math.max(4.5, lim / (T * 0.85)) * sideSign, lim, turned: 0, landed: false, bounced: 0, rolled: 0, tLand: 0,
      qUp: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, up.y, 0, 'YXZ')), qLie: null, yLie: 0, rise: 0,
    };
    this.limp = 0; this.fly = 0; this.jolt = 0; this.stand = 0;
  }
  // вернуться в седло: берётся за луку, подпрыгивает и перекидывает ногу (mount — 0..1)
  startMount() {
    const f = this.fallen;
    if (!f || f.mount != null) return;
    f.mount = 0; f.mFrom = this.root.position.clone(); f.mQ = this.root.quaternion.clone(); f.mS = this.root.scale.clone();
  }
  // посадка как в жизни: подходит к боку коня, встаёт лицом по ходу, толчок — и прямо в седло
  stepMount(dt) {
    const f = this.fallen;
    f.mount = Math.min(1, f.mount + dt / 1.1);
    this.sock.updateWorldMatrix(true, false);
    Mm.compose(this.home.pos, this.home.quat, this.home.scale).premultiply(this.sock.matrixWorld).decompose(Vm, Qm, Sm);
    // точка у левого бока коня, на земле: туда он подходит
    const hq = this.horse.obj.getWorldQuaternion(Qb);
    V0.set(0.85, 0, 0).applyQuaternion(hq);
    const sx = Vm.x + V0.x, sz = Vm.z + V0.z, standY = STAND_Y;
    const k = f.mount, sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    if (k < 0.45) { // подходит и разворачивается по ходу коня, ровно стоя
      const e = sm(k / 0.45);
      this.root.position.set(f.mFrom.x + (sx - f.mFrom.x) * e, standY + Math.abs(Math.sin(e * Math.PI * 3)) * 0.04, f.mFrom.z + (sz - f.mFrom.z) * e);
      this.root.quaternion.slerpQuaternions(f.mQ, Qm, e);
      this.stand = 1;
    } else { // толчок вверх и вбок в седло, ноги из прямых — в посадку
      const e = sm((k - 0.45) / 0.55);
      this.root.position.set(sx + (Vm.x - sx) * e, standY + (Vm.y - standY) * e + Math.sin(e * Math.PI) * 0.22, sz + (Vm.z - sz) * e);
      this.root.quaternion.copy(Qm);
      this.stand = 1 - e;
    }
    this.root.scale.lerpVectors(f.mS, Sm, sm(k));
    if (k >= 1) this.remount();
  }
  remount() {
    if (!this.fallen) return;
    this.sock.add(this.root);
    this.root.position.copy(this.home.pos);
    this.root.quaternion.copy(this.home.quat);
    this.root.scale.copy(this.home.scale); // в мире всадник прежнего роста
    this.fallen = null; this.limp = 0; this.fly = 0; this.jolt = 0; this.stand = 0;
  }
  // физика падения. Возвращает true в момент удара о землю; getUp — пора вставать
  stepFall(dt, getUp) {
    const f = this.fallen;
    if (!f) return false;
    if (f.mount != null) { f.t += dt; this.stepMount(dt); return false; }
    f.t += dt;
    let landedNow = false;
    const r = this.root;
    if (!f.landed) {
      f.vel.y -= 9.8 * dt;
      r.position.addScaledVector(f.vel, dt);
      const step = f.w * dt;
      if (Math.abs(f.turned) < f.lim) { f.turned += step; r.quaternion.premultiply(Qa.setFromAxisAngle(f.spin, step)); }
      this.fly = Math.min(1, this.fly + dt * 6);
      if (r.position.y < 0.24) {
        r.position.y = 0.24;
        if (!f.bounced || (f.bounced < 2 && f.vel.y < -2.6)) { // удар: отскок (с высоты — дважды), руки и голова дёргаются по инерции
          f.bounced++; landedNow = true; this.jolt = 1;
          f.vel.set(f.vel.x * 0.5, Math.min(f.bounced > 1 ? 1.2 : 2.6, -f.vel.y * 0.35), f.vel.z * 0.5);
        } else { f.landed = true; f.tLand = f.t; f.vel.y = 0; }
      }
    } else if (!getUp) {
      r.position.addScaledVector(f.vel, dt);
      f.vel.multiplyScalar(Math.exp(-dt * 4)); // скользит по траве и останавливается
      if (Math.abs(f.turned) < f.lim + 0.15) { const s = Math.sign(f.w) * dt * 2; f.turned += s; r.quaternion.premultiply(Qa.setFromAxisAngle(f.spin, s)); }
      // с бока перекатывается на спину — вокруг своего позвоночника, с затуханием
      if (f.rolled < 1.25) {
        const sp = Math.max(0.4, 3.2 * (1 - f.rolled / 1.25)) * dt;
        f.rolled += sp;
        r.quaternion.premultiply(Qa.setFromAxisAngle(V0.set(0, 1, 0).applyQuaternion(r.quaternion), sp * -f.side));
        r.position.y = 0.24 - 0.1 * Math.min(1, f.rolled / 1.25); // на спине таз ниже, чем на боку
      }
      this.fly = Math.max(0, this.fly - dt * 3);
    } else { // встаёт: садится, упирается, выпрямляется
      if (!f.qLie) { f.qLie = r.quaternion.clone(); f.yLie = r.position.y; }
      f.rise = Math.min(1, f.rise + dt / 0.85);
      const e = f.rise * f.rise * (3 - 2 * f.rise);
      r.quaternion.slerpQuaternions(f.qLie, f.qUp, e);
      r.position.y = f.yLie + (STAND_Y - f.yLie) * Math.sin(e * Math.PI / 2);
      this.stand = e;
    }
    this.limp = f.landed ? Math.min(1, this.limp + dt * 2.5) * (1 - this.stand) : this.limp;
    this.jolt = Math.max(0, this.jolt - dt * 3.5);
    return landedNow;
  }
  update(dt, speed, reach, side) {
    if (this.fallen) speed = reach = 0;
    const k = 1 - Math.exp(-dt * 6);
    this.lean += (Math.min(speed / 9, 1) * 0.32 - this.lean) * k; // на галопе ложится вперёд
    this.reach += (reach - this.reach) * k;
    this.side = side || this.side;
    for (const v of this.base.values()) v.b.quaternion.copy(v.q);
    this.turn('Spine1', AX, this.lean * 0.6);
    this.turn('Spine2', AX, this.lean * 0.4);
    this.turn('Neck', AX, -this.lean * 0.7); // голова смотрит вперёд, а не в землю
    this.turn('Spine1', AZ, this.reach * 0.35 * -this.side); // корпус клонится к боку
    if (!this.fallen && dt > 0) this.sway(dt);
    const dip = this.fallen ? 0 : this.dip || 0;
    if (!this.fallen) { // крен всего всадника в седле (вокруг продольной оси)
      this.root.quaternion.copy(this.home.quat).multiply(Qr.setFromAxisAngle(AZ, dip * 0.3 * (this.dipSide || -1))); // таз почти на месте — наклоняется корпус
    }
    if (dip > 0.01) {
      const sd = this.dipSide || -1, arm = sd < 0 ? 'Right' : 'Left', sa = sd < 0 ? -1 : 1;
      this.turn('Spine1', AZ, dip * 1.0 * sd); this.turn('Spine2', AZ, dip * 0.65 * sd);
      this.turn('Spine1', AX, dip * 0.35);
      this.turn('Neck', AX, dip * 0.35);
      this.turn(arm + 'Arm', AZ, -dip * sa); // рука свисает к земле
    }
    // рука тянется вниз и вбок: правая (side −1) или левая (+1)
    const arm = this.side < 0 ? 'Right' : 'Left', s = this.side < 0 ? 1 : -1;
    this.turn(arm + 'Arm', AZ, this.reach * 0.5 * s);
    this.turn(arm + 'ForeArm', AY, this.reach * 0.9 * s);
    if (this.throwT >= 0 && !this.fallen) { // бросок: обе руки поднимают тушу над головой, корпус откидывается — и резко вперёд
      const t = this.throwT, sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
      const fwd = sm((t - 0.3) / 0.16) * (1 - sm((t - 0.55) / 0.25));
      const up = t < 0.32 ? sm(t / 0.3) : 1 - sm((t - 0.36) / 0.44);
      this.turn('LeftArm', AZ, 1.75 * up); this.turn('RightArm', AZ, -1.75 * up);
      this.turn('LeftForeArm', AY, 0.7 * up * (1 - fwd)); this.turn('RightForeArm', AY, -0.7 * up * (1 - fwd));
      this.turn('Spine1', AX, -0.3 * up * (1 - fwd) + 0.6 * fwd);
      this.turn('Spine2', AX, -0.15 * up * (1 - fwd) + 0.3 * fwd);
      this.turn('Neck', AX, 0.25 * up - 0.4 * fwd);
    }
    if (this.fallen) {
      const f = this.fallen, t = f.t, fl = this.fly, l = this.limp, j = this.jolt, st = this.stand;
      // в полёте: руки машут вразнобой, корпус поджимается, ноги выпрямляются из стремян
      const wl = Math.sin(t * 13), wr = Math.sin(t * 11 + 1.7);
      this.turn('LeftArm', AZ, fl * (0.7 + 0.6 * wl) + l * 0.9 - st * 0.3);
      this.turn('RightArm', AZ, -fl * (0.7 + 0.6 * wr) - l * 0.9 + st * 0.3);
      this.turn('LeftArm', AX, fl * 0.5 * wr);
      this.turn('RightArm', AX, -fl * 0.5 * wl);
      this.turn('LeftForeArm', AY, fl * (0.6 + 0.4 * wr) + l * 0.8);
      this.turn('RightForeArm', AY, -fl * (0.6 + 0.4 * wl) - l * 0.8);
      this.turn('Spine1', AX, fl * 0.45 - l * 0.35 + j * 0.3);
      this.turn('Spine2', AX, fl * 0.2 - l * 0.15);
      this.turn('Neck', AX, fl * 0.3 - l * 0.3 - j * 0.6);
      this.turn('Spine1', AZ, j * 0.35 * f.side);
      // ноги: в полёте разъезжаются и дрыгаются, лёжа — раскинуты, при вставании — прямые
      const kick = Math.sin(t * 9);
      // стоя: бедро вниз, колено выпрямлено, ноги сведены (из седла они согнуты и разведены)
      const LG = [0.9, -1.4], AD = -0.3;
      this.turn('LeftUpLeg', AX, fl * (0.5 + 0.35 * kick) + l * 0.85 + st * LG[0]);
      this.turn('RightUpLeg', AX, fl * (0.3 - 0.35 * kick) + l * 0.6 + st * LG[0]);
      this.turn('LeftLeg', AX, -fl * 0.5 - l * 1.1 + st * LG[1]);
      this.turn('RightLeg', AX, -fl * 0.8 - l * 0.7 + st * LG[1]);
      this.turn('LeftUpLeg', AZ, fl * 0.25 + l * 0.15 + st * AD);
      this.turn('RightUpLeg', AZ, -fl * 0.25 - l * 0.15 - st * AD);
    }
  }
  // болтанка: ускорение седла (в осях коня) раскачивает пружину «корпус» по тангажу и крену
  sway(dt) {
    const w = this.sw, h = this.horse;
    this.sock.getWorldPosition(Vs);
    if (w.pos && dt < 0.1) {
      Vt.subVectors(Vs, w.pos).divideScalar(dt);
      w.acc.lerp(Vt.clone().sub(w.vel).divideScalar(dt), 0.5); // сглаживаем шум кадров
      w.vel.copy(Vt);
    } else w.pos = new THREE.Vector3();
    w.pos.copy(Vs);
    const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw);
    const af = THREE.MathUtils.clamp(w.acc.x * fx + w.acc.z * fz, -40, 40); // вперёд
    const al = THREE.MathUtils.clamp(w.acc.x * fz - w.acc.z * fx, -40, 40); // вбок
    const au = THREE.MathUtils.clamp(w.acc.y, -60, 60); // вверх
    // разгон — корпус отстаёт назад, удар копыт снизу — сгибается вперёд; в повороте — наклон внутрь
    const K = 70, C = 10;
    w.pv += (-K * w.p - C * w.pv - af * 2 - au * 1.4) * dt; w.p += w.pv * dt;
    w.rv += (-K * w.r - C * w.rv + al * 1.6) * dt; w.r += w.rv * dt;
    w.p = THREE.MathUtils.clamp(w.p, -0.3, 0.3); w.r = THREE.MathUtils.clamp(w.r, -0.25, 0.25);
    const into = -(h.turn || 0) * 0.18; // крен в поворот
    this.turn('Spine1', AX, w.p * 0.55); this.turn('Spine2', AX, w.p * 0.35);
    this.turn('Neck', AX, -w.p * 0.6); // голова держит горизонт — кивает навстречу
    this.turn('Spine1', AZ, w.r * 0.6 + into); this.turn('Neck', AZ, -w.r * 0.4 - into * 0.5);
    this.turn('LeftForeArm', AY, w.p * 0.25); this.turn('RightForeArm', AY, -w.p * 0.25); // руки с поводом пружинят
  }
  // толчок в седле: удар соседа, рывок в тартысе — корпус качает вбок (roll) и назад/вперёд (pitch), пружина сама вернёт
  kick(roll, pitch = 0) { if (this.fallen) return; this.sw.rv += roll; this.sw.pv += pitch; }
  // перекрасить под команду (смена соперника в лиге)
  setColor(color) {
    const mats = materialsFor(color);
    for (const [o, m0] of this.orig) o.material = Array.isArray(m0) ? m0.map((m) => mats.get(m) || m) : mats.get(m0) || m0;
  }
  // поворот кости вокруг оси всадника: local · R(осьВосяхКости, угол)
  turn(n, axis, ang) {
    const v = this.base.get(n);
    if (!v || !ang) return;
    Qb.setFromAxisAngle(V0.copy(axis).applyQuaternion(v.wInv), ang);
    v.b.quaternion.multiply(Qb);
  }
}
