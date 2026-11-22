// People: rounded low-poly bodies (capsule limbs, a lathed torso, a head with a face), elbows and knees,
// and hands that reach for the gun with two-bone IK. Colours and soft shading live in vertex colours,
// so each part is one draw call with an unlit material.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeos } from './map.js';
import { gunGeometry, GUN_INFO } from './guns.js';

const LIGHT = new THREE.Vector3(0.35, 1, -0.45).normalize();

// paint a geometry: colour may be a number or fn(x,y,z) -> number
function paint(g, color, amb = 0.58) {
  g = g.index ? g.toNonIndexed() : g;
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.normal, p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.set(typeof color === 'function' ? color(p.getX(i), p.getY(i), p.getZ(i)) : color);
    const d = n.getX(i) * LIGHT.x + n.getY(i) * LIGHT.y + n.getZ(i) * LIGHT.z;
    const k = amb + (1 - amb) * Math.max(0, d);
    col[i * 3] = c.r * k;
    col[i * 3 + 1] = c.g * k;
    col[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

// a limb hanging from its joint: rounded capsule from y=0 down to y=-len, radius r0 at the top, r1 at the bottom
function limb(r0, r1, len, color, seg = 8) {
  const pts = [];
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 0.5;
    pts.push(new THREE.Vector2(Math.sin(a) * r1, -len + r1 - Math.cos(a) * r1));
  }
  for (let i = steps; i >= 0; i--) {
    const a = (i / steps) * Math.PI * 0.5;
    pts.push(new THREE.Vector2(Math.max(0.0001, Math.sin(a) * r0), -r0 + Math.cos(a) * r0));
  }
  return paint(new THREE.LatheGeometry(pts, seg), color);
}

function lathe(profile, color, sx = 1, sz = 1, seg = 12) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg);
  g.scale(sx, 1, sz);
  return paint(g, color);
}

function ball(r, color, x, y, z, sx = 1, sy = 1, sz = 1, ws = 12, hs = 9, thStart = 0, thLen = Math.PI) {
  const g = new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, thStart, thLen);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return paint(g, color);
}

function box(w, h, d, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateX(rx);
  g.rotateY(ry);
  g.rotateZ(rz);
  g.translate(x, y, z);
  return paint(g, color, 0.62);
}

function cyl(r0, r1, h, color, x, y, z, seg = 10, rx = 0) {
  const g = new THREE.CylinderGeometry(r0, r1, h, seg);
  if (rx) g.rotateX(rx);
  g.translate(x, y, z);
  return paint(g, color);
}

export const LOOKS = {
  A: { shirt: 0x2f4361, vest: 0x5f5c40, pants: 0x2b3a4f, boots: 0x16181c, skin: 0xd2a17a, hair: 0x2a1d14, head: 'helmet', hat: 0x2a3036, gear: 0x1d2126, glove: 0x1d2126, belt: 0x1b1b1b, eyes: 'plain' },
  B: { shirt: 0x6e2228, vest: 0x1e1e22, pants: 0x222226, boots: 0x111111, skin: 0xbf8b63, hair: 0x1a1410, head: 'cap', hat: 0x161618, gear: 0x2a2a2e, glove: 0x151515, belt: 0xa82a30, eyes: 'shades' },
  H: { shirt: 0xe9e5dc, vest: 0xe9e5dc, pants: 0x4b5c7c, boots: 0x3d2b1f, skin: 0xdcb08a, hair: 0x3a2716, head: 'hair', hat: 0x3a2716, gear: 0xe9e5dc, glove: 0xdcb08a, belt: 0x3d2b1f, eyes: 'plain' },
};

// body measurements (metres)
const HIP = 0.95, THIGH = 0.47, SHIN = 0.46, UARM = 0.29, FARM = 0.28;
const SHOULDER = new THREE.Vector3(0.2, 0.52, 0.0);

const geoCache = {};
function partsFor(key) {
  if (geoCache[key]) return geoCache[key];
  const L = LOOKS[key];
  // torso from the belt up, elliptic: belt line, chest, shoulders, neck
  const torsoCol = (x, y) => (y < 0.07 ? L.pants : y < 0.11 ? L.belt : L.shirt);
  const torso = lathe([[0.0, -0.05], [0.16, -0.05], [0.17, 0.05], [0.165, 0.16], [0.18, 0.3], [0.2, 0.42], [0.195, 0.5], [0.15, 0.56], [0.07, 0.6], [0.0, 0.61]], torsoCol, 1, 0.64);
  const upper = [torso];
  if (key !== 'H') {
    // vest or jacket over the chest
    upper.push(lathe([[0.0, 0.15], [0.178, 0.15], [0.19, 0.3], [0.21, 0.42], [0.198, 0.5], [0.0, 0.5]], L.vest, 1, 0.72));
    if (key === 'A') {
      upper.push(box(0.07, 0.08, 0.05, L.gear, -0.08, 0.24, -0.135), box(0.07, 0.08, 0.05, L.gear, 0.0, 0.24, -0.14), box(0.07, 0.08, 0.05, L.gear, 0.08, 0.24, -0.135));
      upper.push(box(0.05, 0.1, 0.04, L.gear, 0.13, 0.42, -0.1));
      upper.push(box(0.26, 0.24, 0.07, 0x4e4c36, 0, 0.33, 0.14));
    } else {
      // open collar and a red tie
      upper.push(box(0.06, 0.16, 0.02, 0xd9d4ca, 0, 0.43, -0.144), box(0.03, 0.14, 0.012, 0x9a1f26, 0, 0.41, -0.153));
    }
  } else {
    upper.push(box(0.012, 0.3, 0.01, 0xcfcac0, 0, 0.35, -0.118));
  }
  upper.push(cyl(0.05, 0.055, 0.1, L.skin, 0, 0.62, 0, 8));
  const head = [];
  head.push(ball(0.112, L.skin, 0, 0.1, 0, 0.9, 1.08, 0.98, 14, 10));
  head.push(ball(0.06, L.skin, 0, 0.035, -0.035, 1.1, 0.8, 1.0, 10, 6)); // jaw
  head.push(box(0.025, 0.045, 0.035, L.skin, 0, 0.08, -0.112, -0.2)); // nose
  head.push(ball(0.022, L.skin, 0.1, 0.09, 0.005, 0.5, 1, 0.8, 6, 4), ball(0.022, L.skin, -0.1, 0.09, 0.005, 0.5, 1, 0.8, 6, 4)); // ears
  head.push(box(0.03, 0.007, 0.01, 0x2a1a10, 0.038, 0.135, -0.102), box(0.03, 0.007, 0.01, 0x2a1a10, -0.038, 0.135, -0.102)); // brows
  head.push(box(0.035, 0.006, 0.006, 0x8a5a48, 0, 0.042, -0.103)); // mouth
  if (L.eyes === 'shades') head.push(box(0.17, 0.035, 0.02, 0x0c0c0e, 0, 0.112, -0.1));
  else head.push(box(0.016, 0.014, 0.01, 0x1e140d, 0.038, 0.112, -0.104), box(0.016, 0.014, 0.01, 0x1e140d, -0.038, 0.112, -0.104));
  if (L.head === 'helmet') {
    head.push(ball(0.133, L.hat, 0, 0.12, 0.005, 1.0, 0.95, 1.06, 14, 7, 0, Math.PI * 0.53));
    head.push(cyl(0.137, 0.141, 0.022, L.hat, 0, 0.115, 0.005, 14));
    head.push(box(0.02, 0.05, 0.02, L.gear, 0.12, 0.07, 0.0), box(0.02, 0.05, 0.02, L.gear, -0.12, 0.07, 0.0)); // chin straps
  } else if (L.head === 'cap') {
    head.push(ball(0.118, L.hat, 0, 0.14, 0.0, 0.95, 0.75, 1.0, 14, 6, 0, Math.PI * 0.5));
    head.push(box(0.15, 0.012, 0.09, L.hat, 0, 0.145, -0.12, 0.12));
    head.push(ball(0.112, L.hair, 0, 0.1, 0.02, 0.92, 0.85, 0.98, 12, 6, Math.PI * 0.45, Math.PI * 0.25));
  } else {
    head.push(ball(0.118, L.hair, 0, 0.12, 0.01, 0.95, 0.95, 1.02, 14, 7, 0, Math.PI * 0.55));
  }
  const uarm = [limb(0.056, 0.048, UARM, L.shirt)];
  if (key === 'A') uarm.push(paint(new THREE.CylinderGeometry(0.062, 0.06, 0.08, 8).translate(0, -0.05, 0), L.vest));
  const farm = [limb(0.048, 0.04, FARM - 0.035, L.shirt), ball(0.046, L.glove, 0, -FARM + 0.01, -0.01, 0.85, 1.1, 1.0, 8, 6)];
  const thigh = [limb(0.088, 0.07, THIGH, L.pants)];
  if (key === 'A') thigh.push(box(0.05, 0.12, 0.08, L.gear, 0.09, -0.18, 0));
  const shin = [limb(0.068, 0.055, SHIN - 0.05, L.pants), box(0.11, 0.08, 0.24, L.boots, 0, -SHIN + 0.04, -0.045), ball(0.058, L.boots, 0, -SHIN + 0.06, -0.14, 0.95, 0.7, 0.8, 8, 5)];
  if (key === 'A') shin.push(box(0.1, 0.12, 0.05, 0x2a2e33, 0, -0.03, -0.06));
  geoCache[key] = { upper: mergeGeos(upper), head: mergeGeos(head), uarm: mergeGeos(uarm), farm: mergeGeos(farm), thigh: mergeGeos(thigh), shin: mergeGeos(shin) };
  return geoCache[key];
}

// third-person guns: the detailed models; hand points (gun space) and where the grip sits (aim space)
const GUNS = {};
const AT = {
  knife: [0.16, -0.19, -0.27], pistol: [0.045, -0.05, -0.43], deagle: [0.045, -0.05, -0.43], smg: [0.11, -0.11, -0.15],
  shotgun: [0.11, -0.11, -0.13], rifle: [0.11, -0.11, -0.13], sniper: [0.11, -0.11, -0.12],
  m4: [0.11, -0.11, -0.13], scout: [0.11, -0.11, -0.12], mg: [0.11, -0.12, -0.12], he: [0.2, 0.0, -0.22], flash: [0.2, 0.0, -0.22],
};
export function thirdPersonGun(kind) {
  if (GUNS[kind]) return GUNS[kind];
  GUNS[kind] = { geo: gunGeometry(kind), hold: { r: [0, 0, 0.01], l: GUN_INFO[kind].l, at: AT[kind] } };
  return GUNS[kind];
}

// two-bone IK: orient upper arm and forearm so the hand reaches T (shoulder S, both in the parent's space)
const _d = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Vector3(), _f = new THREE.Vector3(), _end = new THREE.Vector3(), _q = new THREE.Quaternion(), DOWN = new THREE.Vector3(0, -1, 0);
function solveArm(upperGrp, foreGrp, S, T, pole) {
  _d.subVectors(T, S);
  const a = UARM, b = FARM;
  const dist = Math.min(a + b - 0.003, Math.max(Math.abs(a - b) + 0.02, _d.length()));
  _d.normalize();
  const cosA = (a * a + dist * dist - b * b) / (2 * a * dist);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  _p.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize();
  _e.copy(S).addScaledVector(_d, a * cosA).addScaledVector(_p, a * sinA);
  _f.subVectors(_e, S).normalize();
  upperGrp.quaternion.setFromUnitVectors(DOWN, _f);
  _end.copy(S).addScaledVector(_d, dist);
  _f.subVectors(_end, _e).normalize();
  _q.copy(upperGrp.quaternion).invert();
  _f.applyQuaternion(_q);
  foreGrp.quaternion.setFromUnitVectors(DOWN, _f);
}

const _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3();
const _sR = SHOULDER.clone(), _sL = new THREE.Vector3(-SHOULDER.x, SHOULDER.y, SHOULDER.z);
const POLE_R = new THREE.Vector3(0.8, -1, 0.4), POLE_L = new THREE.Vector3(-0.9, -1, 0.3);
const POLE_RW = new THREE.Vector3(0.3, -0.2, 1), POLE_LW = new THREE.Vector3(-0.3, -0.2, 1);
const _m = new THREE.Matrix4();

export class Body {
  constructor(lookKey) {
    const P = partsFor(lookKey);
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const m = this.mat;
    this.lookKey = lookKey;
    this.root = new THREE.Group();
    this.hips = new THREE.Group();
    this.hips.position.y = HIP;
    this.root.add(this.hips);
    this.upper = new THREE.Group();
    this.hips.add(this.upper);
    this.upper.add(new THREE.Mesh(P.upper, m));
    this.head = new THREE.Group();
    this.head.position.y = 0.66;
    this.head.add(new THREE.Mesh(P.head, m));
    this.upper.add(this.head);
    const joint = (geo, parent, x, y, z) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.add(new THREE.Mesh(geo, m));
      parent.add(g);
      return g;
    };
    this.uarmR = joint(P.uarm, this.upper, SHOULDER.x, SHOULDER.y, SHOULDER.z);
    this.farmR = joint(P.farm, this.uarmR, 0, -UARM, 0);
    this.uarmL = joint(P.uarm, this.upper, -SHOULDER.x, SHOULDER.y, SHOULDER.z);
    this.farmL = joint(P.farm, this.uarmL, 0, -UARM, 0);
    this.thighR = joint(P.thigh, this.hips, 0.095, 0, 0);
    this.thighL = joint(P.thigh, this.hips, -0.095, 0, 0);
    this.shinR = joint(P.shin, this.thighR, 0, -THIGH + 0.02, 0);
    this.shinL = joint(P.shin, this.thighL, 0, -THIGH + 0.02, 0);
    // the gun lives in an "aim" frame at chest height that tilts with the view
    this.aim = new THREE.Group();
    this.aim.position.set(0, 0.5, 0);
    this.upper.add(this.aim);
    this.gun = new THREE.Mesh(thirdPersonGun('pistol').geo, m);
    this.aim.add(this.gun);
    this.gunKind = null;
    this.setGun('pistol');
    this.walkPhase = Math.random() * 6;
    this.dead = 0;
    this.fallDir = 1;
  }

  setGun(kind) {
    if (kind === this.gunKind) return;
    this.gunKind = kind;
    if (!kind) {
      this.gun.visible = false;
      this.hold = null;
      return;
    }
    const G = thirdPersonGun(kind);
    this.gun.visible = true;
    this.gun.geometry = G.geo;
    this.hold = G.hold;
    this.gun.position.set(...G.hold.at);
  }

  // p: { dt, speed, crouch 0..1, pitch, kneel, kick, y }
  animate(p) {
    const dt = p.dt;
    if (this.dead > 0) {
      this.dead = Math.min(1, this.dead + dt * 2.4);
      const k = 1 - (1 - this.dead) ** 3;
      // knees give first, then the body tips over
      this.root.rotation.x = Math.min(1, Math.max(0, (this.dead - 0.2) / 0.8)) ** 2 * 1.45 * this.fallDir;
      this.root.position.y = p.y;
      this.hips.position.y = HIP - k * 0.5;
      this.thighR.rotation.x = k * 1.0;
      this.thighL.rotation.x = k * 0.7;
      this.shinR.rotation.x = -k * 1.5;
      this.shinL.rotation.x = -k * 1.1;
      this.upper.rotation.x = -k * 0.25 * this.fallDir;
      this.head.rotation.x = k * 0.4;
      return;
    }
    this.root.rotation.x = 0;
    const sp = Math.min(1, p.speed / 5.5);
    if (sp > 0.05) this.walkPhase += dt * (4.2 + p.speed * 1.45);
    const ph = this.walkPhase;
    const sw = Math.sin(ph) * 0.62 * sp;
    let crouch = p.crouch;
    if (p.kneel) crouch = 1.2;
    const a = crouch * 1.05, b = crouch * 2.0;
    this.thighR.rotation.set(a + sw, 0, -0.03);
    this.thighL.rotation.set(a - sw, 0, 0.03);
    this.shinR.rotation.x = -b - Math.max(0, -Math.cos(ph)) * 0.9 * sp;
    this.shinL.rotation.x = -b - Math.max(0, Math.cos(ph)) * 0.9 * sp;
    const hipY = Math.cos(a) * (THIGH - 0.02) + Math.cos(a - b) * SHIN + 0.04;
    this.hips.position.y = Math.min(HIP, hipY) + Math.abs(Math.cos(ph)) * 0.03 * sp;
    this.upper.rotation.set(-crouch * 0.28 - sp * 0.06, Math.sin(ph) * 0.07 * sp, 0);
    this.head.rotation.set(0, 0, 0);

    if (p.kneel) {
      // hands tied behind the back, head down
      this.upper.rotation.x = -0.1;
      this.head.rotation.x = 0.35;
      solveArm(this.uarmR, this.farmR, _sR, _t1.set(0.07, 0.2, 0.2), POLE_RW);
      solveArm(this.uarmL, this.farmL, _sL, _t2.set(-0.07, 0.2, 0.2), POLE_LW);
      return;
    }
    if (!this.hold) {
      // unarmed walk (a hostage being led)
      const s = Math.sin(ph) * 0.2 * sp;
      solveArm(this.uarmR, this.farmR, _sR, _t1.set(0.25, -0.02, -s), POLE_RW);
      solveArm(this.uarmL, this.farmL, _sL, _t2.set(-0.25, -0.02, s), POLE_LW);
      return;
    }
    // aiming: the upper body takes part of the pitch, the gun frame the rest
    const pitch = Math.max(-1.0, Math.min(1.0, p.pitch || 0));
    this.upper.rotation.x += pitch * 0.3;
    this.head.rotation.x = pitch * 0.4;
    const kick = p.kick || 0;
    this.aim.rotation.set(pitch * 0.7 + kick * 0.12, 0, 0);
    this.gun.position.set(this.hold.at[0], this.hold.at[1], this.hold.at[2] + kick * 0.04);
    this.aim.updateMatrix();
    this.gun.updateMatrix();
    _m.multiplyMatrices(this.aim.matrix, this.gun.matrix);
    _t1.set(this.hold.r[0], this.hold.r[1], this.hold.r[2]).applyMatrix4(_m);
    solveArm(this.uarmR, this.farmR, _sR, _t1, POLE_R);
    if (this.hold.l) {
      _t2.set(this.hold.l[0], this.hold.l[1], this.hold.l[2]).applyMatrix4(_m);
      solveArm(this.uarmL, this.farmL, _sL, _t2, POLE_L);
    } else solveArm(this.uarmL, this.farmL, _sL, _t2.set(-0.25, -0.05, -0.06), POLE_LW);
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
