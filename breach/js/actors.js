// Low-poly people built from boxes. Colours and simple face shading live in vertex colours,
// so each body part is one draw call with an unlit material.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeos } from './map.js';

const SHADE = { px: 0.8, nx: 0.8, py: 1.0, ny: 0.55, pz: 0.74, nz: 0.92 };

function box(w, h, d, color, x = 0, y = 0, z = 0, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  if (rx) g.rotateX(rx);
  g.translate(x, y, z);
  const n = g.attributes.normal, cnt = n.count;
  const c = new THREE.Color(color);
  const col = new Float32Array(cnt * 3);
  for (let i = 0; i < cnt; i++) {
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    let s;
    if (Math.abs(ny) > 0.5) s = ny > 0 ? SHADE.py : SHADE.ny;
    else if (Math.abs(nx) > 0.5) s = SHADE.px;
    else s = nz > 0 ? SHADE.pz : SHADE.nz;
    col[i * 3] = c.r * s;
    col[i * 3 + 1] = c.g * s;
    col[i * 3 + 2] = c.b * s;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export const LOOKS = {
  A: { shirt: 0x2c3e57, vest: 0x5d5a3f, pants: 0x283546, boots: 0x16181c, skin: 0xc99a74, head: 'helmet', hat: 0x23272c, gear: 0x1b1f24, visor: 0x111418 },
  B: { shirt: 0x6a1f24, vest: 0x1d1d20, pants: 0x1f1f23, boots: 0x111111, skin: 0xb98761, head: 'cap', hat: 0x141416, gear: 0x2a2a2e, visor: 0x0b0b0c },
  H: { shirt: 0xe8e4da, vest: 0xe8e4da, pants: 0x4a5a78, boots: 0x3a2a1e, skin: 0xd8ad86, head: 'hair', hat: 0x2b1d12, gear: 0xe8e4da, visor: 0x2b1d12 },
};

const geoCache = {};

function partsFor(lookKey) {
  if (geoCache[lookKey]) return geoCache[lookKey];
  const L = LOOKS[lookKey];
  const upper = [
    box(0.42, 0.58, 0.24, L.shirt, 0, 0.3, 0),
    box(0.45, 0.38, 0.29, L.vest, 0, 0.36, 0),
    box(0.12, 0.06, 0.12, L.skin, 0, 0.62, 0),
    box(0.24, 0.26, 0.25, L.skin, 0, 0.77, 0),
    box(0.25, 0.05, 0.02, L.visor, 0, 0.8, -0.125),
  ];
  if (L.head === 'helmet') {
    upper.push(box(0.29, 0.14, 0.3, L.hat, 0, 0.92, 0.005), box(0.31, 0.03, 0.32, L.hat, 0, 0.86, 0.005));
    upper.push(box(0.27, 0.16, 0.05, L.hat, 0, 0.8, 0.135), box(0.05, 0.14, 0.24, L.hat, 0.135, 0.8, 0.02), box(0.05, 0.14, 0.24, L.hat, -0.135, 0.8, 0.02));
    upper.push(box(0.2, 0.12, 0.05, L.gear, 0, 0.42, -0.165)); // pouches
  } else if (L.head === 'cap') {
    upper.push(box(0.26, 0.1, 0.27, L.hat, 0, 0.92, 0), box(0.24, 0.025, 0.14, L.hat, 0, 0.875, -0.17));
    upper.push(box(0.255, 0.12, 0.04, 0x1a1410, 0, 0.82, 0.13));
    upper.push(box(0.46, 0.06, 0.3, 0xb0262c, 0, 0.17, 0)); // red belt band to tell the teams apart
  } else {
    upper.push(box(0.26, 0.09, 0.27, L.hat, 0, 0.92, 0.01), box(0.26, 0.16, 0.06, L.hat, 0, 0.84, 0.12));
  }
  const arm = [box(0.13, 0.36, 0.14, L.shirt, 0, -0.17, 0), box(0.12, 0.28, 0.12, L.shirt, 0, -0.48, 0), box(0.1, 0.1, 0.1, lookKey === 'H' ? L.skin : L.gear, 0, -0.66, 0)];
  const thigh = [box(0.17, 0.46, 0.19, L.pants, 0, -0.22, 0)];
  const shin = [box(0.15, 0.42, 0.17, L.pants, 0, -0.2, 0), box(0.16, 0.1, 0.25, L.boots, 0, -0.41, -0.035)];
  geoCache[lookKey] = { upper: mergeGeos(upper), arm: mergeGeos(arm), thigh: mergeGeos(thigh), shin: mergeGeos(shin) };
  return geoCache[lookKey];
}

const gunGeo = {};
export function thirdPersonGun(kind) {
  if (gunGeo[kind]) return gunGeo[kind];
  const dark = 0x23252a, wood = 0x6b4426, steel = 0x3a3d43;
  const g = {
    knife: [box(0.03, 0.03, 0.2, 0xc8ccd2, 0, 0, -0.1), box(0.035, 0.04, 0.1, dark, 0, 0, 0.04)],
    pistol: [box(0.05, 0.06, 0.2, dark, 0, 0, -0.05), box(0.045, 0.12, 0.05, dark, 0, -0.07, 0.03)],
    deagle: [box(0.06, 0.08, 0.26, steel, 0, 0, -0.08), box(0.05, 0.13, 0.06, dark, 0, -0.08, 0.03)],
    smg: [box(0.06, 0.1, 0.36, dark, 0, 0, -0.1), box(0.04, 0.16, 0.05, dark, 0, -0.12, -0.08), box(0.03, 0.03, 0.12, steel, 0, 0.01, -0.33)],
    shotgun: [box(0.06, 0.08, 0.7, steel, 0, 0, -0.2), box(0.07, 0.07, 0.24, wood, 0, -0.06, -0.3), box(0.06, 0.12, 0.22, wood, 0, -0.04, 0.2)],
    rifle: [box(0.06, 0.11, 0.62, dark, 0, 0, -0.16), box(0.05, 0.17, 0.07, dark, 0, -0.13, -0.12), box(0.06, 0.1, 0.22, wood, 0, -0.02, 0.22), box(0.03, 0.03, 0.18, steel, 0, 0.02, -0.55)],
    sniper: [box(0.06, 0.1, 0.9, 0x2f3b2a, 0, 0, -0.25), box(0.05, 0.05, 0.3, 0x111111, 0, 0.09, -0.15), box(0.06, 0.12, 0.25, 0x2f3b2a, 0, -0.03, 0.28)],
    he: [box(0.08, 0.1, 0.08, 0x3e5a2c, 0, 0, 0)],
    flash: [box(0.07, 0.11, 0.07, 0x9aa0a8, 0, 0, 0)],
  }[kind];
  gunGeo[kind] = mergeGeos(g);
  return gunGeo[kind];
}

export class Body {
  constructor(lookKey) {
    const P = partsFor(lookKey);
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const m = this.mat;
    this.root = new THREE.Group();
    this.hips = new THREE.Group();
    this.hips.position.y = 0.88;
    this.root.add(this.hips);
    this.upper = new THREE.Group();
    this.hips.add(this.upper);
    this.upper.add(new THREE.Mesh(P.upper, m));
    const mk = (geo, parent, x, y, z) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.add(new THREE.Mesh(geo, m));
      parent.add(g);
      return g;
    };
    this.armR = mk(P.arm, this.upper, 0.28, 0.54, 0);
    this.armL = mk(P.arm, this.upper, -0.28, 0.54, 0);
    this.thighR = mk(P.thigh, this.hips, 0.1, 0, 0);
    this.thighL = mk(P.thigh, this.hips, -0.1, 0, 0);
    this.shinR = mk(P.shin, this.thighR, 0, -0.44, 0);
    this.shinL = mk(P.shin, this.thighL, 0, -0.44, 0);
    this.gun = new THREE.Mesh(thirdPersonGun('pistol'), m);
    this.gun.position.set(0.12, 0.34, -0.36);
    this.upper.add(this.gun);
    this.gunKind = 'pistol';
    this.walkPhase = Math.random() * 6;
    this.dead = 0;
    this.lookKey = lookKey;
    this.root.traverse((o) => (o.matrixAutoUpdate = true));
  }

  setGun(kind) {
    if (kind === this.gunKind) return;
    this.gunKind = kind;
    if (!kind) {
      this.gun.visible = false;
      return;
    }
    this.gun.visible = true;
    this.gun.geometry = thirdPersonGun(kind);
  }

  // pose: { speed (m/s), crouch 0..1, pitch, kneel (hostage), dt, shoot kick }
  animate(p) {
    const dt = p.dt;
    if (this.dead > 0) {
      this.dead = Math.min(1, this.dead + dt * 2.6);
      const k = 1 - (1 - this.dead) ** 3;
      this.root.rotation.x = k * 1.5 * this.fallDir;
      this.root.position.y = p.y + k * 0.12;
      this.hips.position.y = 0.88 - k * 0.6;
      return;
    }
    this.root.rotation.x = 0;
    const sp = Math.min(1, p.speed / 5.5);
    this.walkPhase += dt * (4 + p.speed * 1.5) * (sp > 0.05 ? 1 : 0);
    const sw = Math.sin(this.walkPhase) * 0.65 * sp;
    let crouch = p.crouch;
    if (p.kneel) crouch = 1.15;
    // legs: thigh forward angle a, shin bend b
    const a = crouch * 1.0;
    const b = crouch * 1.9;
    // +x rotation swings a limb forward (bodies face -z)
    this.thighR.rotation.x = a + sw;
    this.thighL.rotation.x = a - sw;
    this.shinR.rotation.x = -b - Math.max(0, -Math.cos(this.walkPhase)) * 0.7 * sp;
    this.shinL.rotation.x = -b - Math.max(0, Math.cos(this.walkPhase)) * 0.7 * sp;
    const hipY = Math.cos(a) * 0.44 + Math.cos(a - b) * 0.44;
    this.hips.position.y = hipY + Math.abs(Math.cos(this.walkPhase)) * 0.03 * sp;
    this.upper.rotation.x = -crouch * 0.25;
    if (p.kneel) {
      this.armR.rotation.set(-0.5, 0, 0.25);
      this.armL.rotation.set(-0.5, 0, -0.25);
      this.upper.rotation.x = -0.1;
      return;
    }
    if (this.lookKey === 'H') {
      this.armR.rotation.set(-sw * 0.8, 0, -0.08);
      this.armL.rotation.set(sw * 0.8, 0, 0.08);
      return;
    }
    // aim: whole upper body follows pitch a little, arms hold the gun
    const pitch = Math.max(-0.9, Math.min(0.9, p.pitch || 0));
    this.upper.rotation.x += pitch * 0.45;
    const kick = p.kick || 0;
    const knife = this.gunKind === 'knife';
    const nade = this.gunKind === 'he' || this.gunKind === 'flash';
    this.armR.rotation.set(1.3 + pitch * 0.55 + kick * 0.3 - (knife || nade ? 0.35 : 0), 0, -0.12);
    this.armL.rotation.set(knife || nade ? -0.1 : 1.4 + pitch * 0.55 + kick * 0.3, 0, knife || nade ? -0.1 : 0.55);
    this.gun.position.z = -0.36 + kick * 0.05;
    this.gun.rotation.x = pitch * 0.55;
  }

  die(fromBehind) {
    this.dead = 0.001;
    this.fallDir = fromBehind ? -1 : 1;
  }

  revive() {
    this.dead = 0;
    this.root.rotation.set(0, 0, 0);
  }

  setLight(k) {
    this.mat.color.setScalar(k);
  }
}
