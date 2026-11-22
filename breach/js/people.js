// Skinned characters: a rigged soldier for the assault team, a man in a black suit for the guards
// and a civilian for the hostages,
// with idle / walk / run clips. Crouching, aiming the upper body and holding the gun are done
// on top of the clips: the legs bend, the spine follows the view and two-bone IK puts the hands on the gun.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { clone as cloneSkinned, retargetClip } from '../vendor/utils/SkeletonUtils.js';
import { Body, thirdPersonGun } from './actors.js';

const A = { ready: false };

export async function loadPeople() {
  const loader = new GLTFLoader();
  const [s, m, gd] = await Promise.all(['Soldier', 'Michelle', 'Guard'].map((n) => loader.loadAsync(`assets/models/${n}.glb`)));
  A.soldier = prep(s.scene);
  A.civil = prep(m.scene);
  A.clips = {};
  for (const c of s.animations) A.clips[c.name] = c;
  A.guard = prepGuard(gd.scene);
  // the civilian has other proportions: borrow only the rotations of the soldier's clips
  A.civilClips = {};
  for (const n of ['Idle', 'Walk', 'Run']) {
    const c = A.clips[n].clone();
    c.tracks = c.tracks.filter((t) => t.name.endsWith('.quaternion'));
    A.civilClips[n] = c;
  }
  A.shadow = blobTexture();
  A.ready = true;
}

export const peopleReady = () => A.ready;

export function makeBody(look) {
  return A.ready ? new SkinnedBody(look) : new Body(look);
}

function prep(scene) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene, true);
  const h = box.max.y - box.min.y;
  scene.userData.scale = 1.8 / h;
  scene.userData.minY = box.min.y;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const old = o.material;
    if (old.map) old.map.colorSpace = THREE.SRGBColorSpace;
    o.material = new THREE.MeshLambertMaterial({ map: old.map || null, color: old.map ? 0xffffff : old.color });
    o.frustumCulled = false;
  });
  return scene;
}

// The guards: a man in a suit (a Ready Player Me avatar). The suit is repainted black with a white shirt,
// he gets sunglasses, and the soldier's clips are retargeted onto his skeleton (the bone names match Mixamo).
function prepGuard(scene) {
  scene.traverse((o) => {
    if (o.isMesh && /Outfit/.test(o.name) && o.material.map) o.material.map = blackSuit(o.material.map, /Top/.test(o.name));
  });
  prep(scene);
  const bones = {};
  let skin = null;
  scene.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isSkinnedMesh && !skin) skin = o;
  });
  // sunglasses, put on in the rest pose and carried by the head
  const le = bones.LeftEye.getWorldPosition(new THREE.Vector3()), re = bones.RightEye.getWorldPosition(new THREE.Vector3());
  const mid = le.clone().add(re).multiplyScalar(0.5);
  const half = Math.abs(le.x - re.x) / 2;
  const lens = new THREE.BoxGeometry(half * 1.55, 0.03, 0.006);
  const parts = [];
  for (const sx of [-1, 1]) parts.push(lens.clone().translate(sx * half, 0, 0));
  parts.push(new THREE.BoxGeometry(half * 0.5, 0.006, 0.006).translate(0, 0.009, 0));
  for (const sx of [-1, 1]) parts.push(new THREE.BoxGeometry(0.004, 0.006, 0.09).translate(sx * half * 1.78, 0.008, -0.045));
  const glasses = new THREE.Mesh(mergeBoxes(parts), new THREE.MeshLambertMaterial({ color: 0x0c0d10 }));
  glasses.position.set(mid.x, mid.y + 0.004, mid.z + 0.03);
  glasses.frustumCulled = false;
  scene.add(glasses);
  bones.Head.attach(glasses);
  // retarget idle / walk / run from a copy of the soldier standing in his rest pose
  const src = cloneSkinned(A.soldier);
  src.updateMatrixWorld(true);
  let sskin = null;
  src.traverse((o) => {
    if (o.isSkinnedMesh && !sskin) sskin = o;
  });
  A.guardClips = {};
  for (const n of ['Idle', 'Walk', 'Run']) {
    A.guardClips[n] = retargetClip(skin, sskin, A.clips[n], { hip: 'mixamorigHips', getBoneName: (b) => 'mixamorig' + b.name, scale: 1 });
  }
  skin.skeleton.pose();
  return scene;
}

function mergeBoxes(list) {
  const pos = [], nor = [], idx = [];
  for (const g of list) {
    const base = pos.length / 3;
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
    for (const i of g.index.array) idx.push(base + i);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}

// repaint a wedding suit into a guard's black one: light, grey pixels (the shirt) stay white, the rest goes charcoal
function blackSuit(map, shirt) {
  const im = map.image;
  const c = document.createElement('canvas');
  c.width = im.width;
  c.height = im.height;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i] / 255, gr = a[i + 1] / 255, b = a[i + 2] / 255;
    const mx = Math.max(r, gr, b), mn = Math.min(r, gr, b), l = (mx + mn) / 2;
    const s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
    if (shirt && l > 0.8 && s < 0.3) {
      a[i] = a[i + 1] = a[i + 2] = (0.78 + (l - 0.8) * 0.8) * 255;
      continue;
    }
    const v = 0.05 + l * 0.2;
    a[i] = a[i + 1] = v * 255;
    a[i + 2] = v * 1.12 * 255;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = map.flipY;
  t.wrapS = map.wrapS;
  t.wrapT = map.wrapT;
  return t;
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(0,0,0,0.5)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion();
const _S = new THREE.Vector3(), _E = new THREE.Vector3(), _H = new THREE.Vector3(), _E2 = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3();
const _right = new THREE.Vector3(), _back = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _rootQ = new THREE.Quaternion();
const _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3(), _pole = new THREE.Vector3();

// rotate a bone by a world-space rotation, keeping the change in its local quaternion
function turn(bone, delta) {
  bone.getWorldQuaternion(_wq);
  _wq.premultiply(delta);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_wq));
  bone.updateMatrixWorld(true);
}

function ik(up, fore, hand, T, pole) {
  up.getWorldPosition(_S);
  fore.getWorldPosition(_E);
  hand.getWorldPosition(_H);
  const a = _S.distanceTo(_E), b = _E.distanceTo(_H);
  _d.subVectors(T, _S);
  const dist = Math.min(a + b - 0.002, Math.max(Math.abs(a - b) + 0.01, _d.length()));
  _d.normalize();
  const cosA = Math.max(-1, Math.min(1, (a * a + dist * dist - b * b) / (2 * a * dist)));
  const sinA = Math.sqrt(1 - cosA * cosA);
  _p.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize();
  _E2.copy(_S).addScaledVector(_d, a * cosA).addScaledVector(_p, a * sinA);
  _u.subVectors(_E, _S).normalize();
  _v.subVectors(_E2, _S).normalize();
  turn(up, _q.setFromUnitVectors(_u, _v));
  fore.getWorldPosition(_E);
  hand.getWorldPosition(_H);
  _u.subVectors(_H, _E).normalize();
  _v.copy(_S).addScaledVector(_d, dist).sub(_E).normalize();
  turn(fore, _q.setFromUnitVectors(_u, _v));
}

const TINT = { A: new THREE.Color(0.8, 0.9, 1.08), B: new THREE.Color(1, 1, 1), H: new THREE.Color(1, 1, 1) };

export class SkinnedBody {
  constructor(look) {
    const src = look === 'H' ? A.civil : look === 'B' ? A.guard : A.soldier;
    this.look = look;
    this.lookKey = look;
    this.root = new THREE.Group();
    this.model = cloneSkinned(src);
    const sc = src.userData.scale;
    this.baseY = -src.userData.minY * sc;
    this.model.scale.setScalar(sc);
    this.model.position.y = this.baseY;
    // the soldier rig faces -z like our bodies; the civilian one faces +z
    if (look === 'H') this.model.rotation.y = Math.PI;
    this.root.add(this.model);
    this.mats = [];
    this.model.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.userData.base = o.material.color.clone();
        this.mats.push(o.material);
      }
    });
    this.tint = TINT[look];
    this.b = {};
    this.model.traverse((o) => {
      if (o.isBone) this.b[o.name.replace(/^mixamorig:?/, '')] = o;
    });
    // the soldier plays its clips; the civilian has a different rest pose, so she is posed by hand
    this.model.traverse((o) => {
      if (o.isSkinnedMesh && !this.skel) this.skel = o.skeleton;
    });
    this.mixer = null;
    this.rest = [];
    this.model.traverse((o) => {
      if (o.isBone) this.rest.push([o, o.quaternion.clone(), o.position.clone()]);
    });
    if (look !== 'H') {
      // the guard's retargeted clips address bones through a skinned mesh (".bones[Hips]...")
      this.mixer = new THREE.AnimationMixer(look === 'B' ? this.firstSkin() : this.model);
      const clips = look === 'B' ? A.guardClips : A.clips;
      this.act = {};
      for (const [k, n] of [['idle', 'Idle'], ['walk', 'Walk'], ['run', 'Run']]) {
        const a = this.mixer.clipAction(clips[n]);
        a.play();
        a.setEffectiveWeight(k === 'idle' ? 1 : 0);
        this.act[k] = a;
      }
      this.mixer.update(Math.random() * 2);
    }
    // gun in an aim frame at chest height
    this.gunMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.aim = new THREE.Group();
    this.aim.position.set(0, 1.45, 0);
    this.root.add(this.aim);
    this.gun = new THREE.Mesh(thirdPersonGun('pistol').geo, this.gunMat);
    this.aim.add(this.gun);
    this.gunKind = null;
    this.setGun(look === 'H' ? null : 'pistol');
    // soft contact shadow
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: A.shadow, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.shadow.position.y = 0.015;
    this.root.add(this.shadow);
    this.dead = 0;
    this.fallDir = 1;
    this.walkPhase = 0;
    this.lightK = 1;
  }

  firstSkin() {
    let skin = null;
    this.model.traverse((o) => {
      if (o.isSkinnedMesh && !skin) skin = o;
    });
    return skin;
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
  }

  animate(p) {
    const dt = p.dt;
    const b = this.b;
    if (this.dead > 0) {
      this.dead = Math.min(1, this.dead + dt * 2.2);
      const k = 1 - (1 - this.dead) ** 3;
      this.root.rotation.x = Math.min(1, Math.max(0, (this.dead - 0.15) / 0.85)) ** 2 * 1.5 * this.fallDir;
      this.root.position.y = p.y;
      this.model.position.y = this.baseY - k * 0.25;
      this.shadow.visible = false;
      return;
    }
    this.root.rotation.x = 0;
    this.shadow.visible = true;
    // locomotion blend
    const sp = p.speed;
    if (this.mixer) {
      const wIdle = Math.max(0, 1 - sp / 1.4);
      const wRun = Math.min(1, Math.max(0, (sp - 2.8) / 1.6));
      const wWalk = Math.max(0, 1 - wIdle - wRun);
      this.act.idle.setEffectiveWeight(wIdle);
      this.act.walk.setEffectiveWeight(wWalk);
      this.act.run.setEffectiveWeight(wRun);
      const dir = p.back ? -1 : 1;
      this.act.walk.timeScale = dir * Math.max(0.6, sp / 1.7);
      this.act.run.timeScale = dir * Math.max(0.7, sp / 5.2);
      this.mixer.update(dt);
    } else {
      for (const [bone, q, pos] of this.rest) {
        bone.quaternion.copy(q);
        bone.position.copy(pos);
      }
      if (sp > 0.1) this.walkPhase += dt * (3.5 + sp * 1.6);
    }

    let crouch = p.crouch || 0;
    if (p.kneel) crouch = 1.35;
    const legA = crouch * 1.0, legB = crouch * 1.9;
    const drop = 0.44 * (1 - Math.cos(legA)) + 0.44 * (1 - Math.cos(legA - legB));
    this.model.position.y = this.baseY - drop;
    this.aim.position.y = 1.45 - drop * 0.95;
    this.root.updateMatrixWorld(true);
    this.root.getWorldQuaternion(_rootQ);
    _right.set(1, 0, 0).applyQuaternion(_rootQ);
    _back.set(0, 0, 1).applyQuaternion(_rootQ);

    if (crouch > 0.01) {
      for (const side of ['Left', 'Right']) {
        turn(b[side + 'UpLeg'], _q.setFromAxisAngle(_right, legA));
        turn(b[side + 'Leg'], _q.setFromAxisAngle(_right, -legB));
        turn(b[side + 'Foot'], _q.setFromAxisAngle(_right, legB - legA));
      }
      turn(b.Spine, _q.setFromAxisAngle(_right, crouch * 0.25));
    }
    const pitch = Math.max(-1, Math.min(1, p.pitch || 0));
    if (!this.mixer && !p.kneel) {
      const k = Math.min(1, sp / 4);
      const sw = Math.sin(this.walkPhase) * 0.55 * k;
      turn(b.LeftUpLeg, _q.setFromAxisAngle(_right, sw));
      turn(b.RightUpLeg, _q.setFromAxisAngle(_right, -sw));
      turn(b.LeftLeg, _q.setFromAxisAngle(_right, -Math.max(0, Math.cos(this.walkPhase)) * 0.8 * k));
      turn(b.RightLeg, _q.setFromAxisAngle(_right, -Math.max(0, -Math.cos(this.walkPhase)) * 0.8 * k));
      // hands at the sides, swinging against the legs
      for (const [side, s] of [['Left', -1], ['Right', 1]]) {
        b[side + 'Arm'].getWorldPosition(_t1);
        _t1.addScaledVector(_up, -0.52).addScaledVector(_right, s * 0.07).addScaledVector(_back, s * sw * 0.35);
        ik(b[side + 'Arm'], b[side + 'ForeArm'], b[side + 'Hand'], _t1, _pole.copy(_back).addScaledVector(_right, s * 0.3));
      }
    }
    if (p.kneel) {
      turn(b.Neck, _q.setFromAxisAngle(_right, 0.4));
      // hands tied behind the back
      b.Spine2.getWorldPosition(_t1);
      _t1.addScaledVector(_back, 0.22).addScaledVector(_up, -0.18);
      _t2.copy(_t1).addScaledVector(_right, -0.05);
      _t1.addScaledVector(_right, 0.05);
      ik(b.RightArm, b.RightForeArm, b.RightHand, _t1, _pole.copy(_right).multiplyScalar(0.6).add(_back));
      ik(b.LeftArm, b.LeftForeArm, b.LeftHand, _t2, _pole.copy(_right).multiplyScalar(-0.6).add(_back));
      this.applyLight();
      return;
    }
    if (!this.hold) {
      this.applyLight();
      return;
    }
    // aiming: the spine leans with the view, the gun frame takes the rest
    turn(b.Spine1, _q.setFromAxisAngle(_right, -pitch * 0.2));
    turn(b.Spine2, _q.setFromAxisAngle(_right, -pitch * 0.2));
    turn(b.Neck, _q.setFromAxisAngle(_right, -pitch * 0.3));
    const kick = p.kick || 0;
    this.aim.rotation.set(pitch + kick * 0.1, 0, 0);
    const at = this.hold.at;
    this.gun.position.set(at[0], at[1], at[2] + kick * 0.04);
    this.aim.updateMatrixWorld(true);
    _t1.set(this.hold.r[0], this.hold.r[1], this.hold.r[2]).applyMatrix4(this.gun.matrixWorld);
    ik(b.RightArm, b.RightForeArm, b.RightHand, _t1, _pole.copy(_right).multiplyScalar(0.7).addScaledVector(_up, -1).addScaledVector(_back, 0.5));
    if (this.hold.l) {
      _t2.set(this.hold.l[0], this.hold.l[1], this.hold.l[2]).applyMatrix4(this.gun.matrixWorld);
      ik(b.LeftArm, b.LeftForeArm, b.LeftHand, _t2, _pole.copy(_right).multiplyScalar(-0.9).addScaledVector(_up, -1).addScaledVector(_back, 0.2));
    }
    this.applyLight();
  }

  applyLight() {
    for (const m of this.mats) m.color.copy(m.userData.base).multiply(this.tint).multiplyScalar(this.lightK);
    this.gunMat.color.setScalar(this.lightK);
  }

  die(fromBehind) {
    this.dead = 0.001;
    this.fallDir = fromBehind ? -1 : 1;
  }

  revive() {
    this.dead = 0;
    this.root.rotation.set(0, 0, 0);
    this.model.position.y = this.baseY;
  }

  setLight(k) {
    this.lightK = k;
  }
}
