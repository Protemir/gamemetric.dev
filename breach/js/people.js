// Skinned characters: a rigged soldier for the assault team, a man in a black suit for the guards
// and a civilian for the hostages,
// with idle / walk / run clips. Crouching, aiming the upper body and holding the gun are done
// on top of the clips: the legs bend, the spine follows the view and two-bone IK puts the hands on the gun.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { clone as cloneSkinned, retargetClip } from '../vendor/utils/SkeletonUtils.js';
import { Body, thirdPersonGun } from './actors.js';
import { chickenGeo } from './chickens.js';

const A = { ready: false };

export async function loadPeople() {
  const loader = new GLTFLoader();
  const [s, m, gd] = await Promise.all(['Soldier', 'Michelle', 'Guard'].map((n) => loader.loadAsync(`assets/models/${n}.glb`)));
  // the assault team's kit in olive-grey instead of the model's sand colour
  s.scene.traverse((o) => {
    if (o.isMesh && /VanguardBody/i.test(o.material.name) && o.material.map) o.material.map = recolor(o.material.map, (v) => [v * 0.6, v * 0.62, v * 0.53]);
  });
  A.soldier = prep(s.scene);
  addGear(A.soldier, -1, false);
  A.civil = prep(m.scene);
  A.clips = {};
  for (const c of s.animations) {
    c.tracks = c.tracks.filter((t) => !t.name.endsWith('.scale'));
    A.clips[c.name] = c;
  }
  A.guard = prepGuard(gd.scene);
  addGear(A.guard, 1, true);
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
// the level tells the bodies where they cannot slide: (x, z, feet) -> true when blocked
let blocker = null;
// the "chicken hats" madness: a hen sitting on the head, hidden until the option is on
function addChickenHat(scene, front, guard) {
  let head = null;
  scene.traverse((o) => {
    if (o.isBone && /Head$/.test(o.name) && !head) head = o;
  });
  if (!head) return;
  const m = new THREE.Mesh(chickenGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  m.name = 'gear-chicken';
  m.scale.setScalar(1.15);
  m.position.set(0, guard ? 1.8 : 1.81, front < 0 ? 0.02 : -0.02);
  // the hen looks where the man looks
  m.rotation.y = front < 0 ? 0 : Math.PI;
  m.frustumCulled = false;
  m.visible = false;
  m.material.userData.env = 0.3;
  scene.add(m);
  m.updateMatrixWorld(true);
  head.attach(m);
}

export function setBlocker(fn) {
  blocker = fn;
}

export function makeBody(look, variant = 0) {
  return A.ready ? new SkinnedBody(look, variant) : new Body(look);
}

// Kit on top of the models, built in their rest pose and carried by the bones:
// the assault team gets a helmet with a night-vision mount, a plate carrier with magazine pouches and knee pads;
// the guards' version is a black vest worn over the suit (only some of them put it on).
function addGear(scene, front, guard) {
  scene.updateMatrixWorld(true);
  addChickenHat(scene, front, guard);
  const bones = {};
  scene.traverse((o) => {
    if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
  });
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const mesh = (name, geo, color, rough, bone) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 }));
    m.name = name;
    m.frustumCulled = false;
    m.material.userData.env = 0.35;
    scene.add(m);
    bones[bone].attach(m);
    return m;
  };
  const boxes = (list) => {
    const out = list.map(([w, h, d, c]) => new THREE.BoxGeometry(w, h, d).translate(c.x, c.y, c.z));
    return merge(out);
  };
  const cz = (z) => z * front;
  if (!guard) {
    // a high-cut helmet: rounded shell, side rails, a night-vision mount over the brow
    const hc = P(0, 1.69, 0.03 + cz(0.035));
    const shell = new THREE.SphereGeometry(0.142, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.58).scale(1.02, 1.0, 1.1).translate(hc.x, hc.y, hc.z);
    const fittings = boxes([
      [0.06, 0.045, 0.03, P(0, hc.y + 0.085, hc.z + cz(0.15))],
      [0.014, 0.026, 0.13, P(0.142, hc.y + 0.02, hc.z)],
      [0.014, 0.026, 0.13, P(-0.142, hc.y + 0.02, hc.z)],
    ]);
    mesh('gear-helmet', merge([shell, fittings]), 0x3b3f34, 0.65, 'Head');
    const tz = 0.03;
    mesh('gear-vest', boxes([
      // the suit already has plates: only magazine pouches and a radio go on it
      [0.075, 0.12, 0.05, P(-0.09, 1.25, tz + cz(0.2))],
      [0.075, 0.12, 0.05, P(0, 1.25, tz + cz(0.2))],
      [0.075, 0.12, 0.05, P(0.09, 1.25, tz + cz(0.2))],
      [0.1, 0.07, 0.04, P(0.08, 1.45, tz + cz(0.195))],
    ]), 0x4a4a3b, 0.85, 'Spine2');
    for (const [side, bone] of [[-1, 'LeftLeg'], [1, 'RightLeg']]) {
      const k = bones[bone].getWorldPosition(new THREE.Vector3());
      mesh('gear-knee', boxes([[0.11, 0.13, 0.05, P(k.x, k.y + 0.01, k.z + cz(0.075))]]), 0x2e302a, 0.8, bone);
      void side;
    }
  } else {
    mesh('gear-vest', boxes([
      [0.32, 0.3, 0.05, P(0, 1.33, 0.125)],
      [0.31, 0.3, 0.05, P(0, 1.34, -0.125)],
      [0.04, 0.18, 0.25, P(0.165, 1.25, 0)],
      [0.04, 0.18, 0.25, P(-0.165, 1.25, 0)],
      [0.06, 0.03, 0.27, P(0.095, 1.49, 0)],
      [0.06, 0.03, 0.27, P(-0.095, 1.49, 0)],
      [0.07, 0.11, 0.045, P(-0.08, 1.24, 0.165)],
      [0.07, 0.11, 0.045, P(0.08, 1.24, 0.165)],
    ]), 0x1c1d20, 0.8, 'Spine2');
    // a knitted cap for some of them
    mesh('gear-cap', new THREE.SphereGeometry(0.113, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52).scale(1, 1.05, 1.06).translate(0, 1.755, -0.004), 0x232427, 0.95, 'Head');
  }
}

function merge(list) {
  const pos = [], nor = [], idx = [];
  for (let g of list) {
    if (!g.index) g = g.toNonIndexed();
    const base = pos.length / 3;
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
    if (g.index) for (const i of g.index.array) idx.push(base + i);
    else for (let i = 0; i < g.attributes.position.count; i++) idx.push(base + i);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}

// how each fighter differs from the next: kit colours for the assault team, suits and vests for the guards
const KIT = [[1, 1, 1], [0.36, 0.39, 0.46], [1.55, 1.32, 0.95], [0.72, 0.8, 0.72]];
const SUIT = [[1, 1, 1], [2.5, 2.5, 2.6], [1.3, 1.5, 2.7], [2.3, 1.85, 1.4], [1.6, 1.6, 1.6]];

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
    // full materials: relief from the normal maps, highlights, and the sky in the reflections (scene.environment)
    const m = new THREE.MeshStandardMaterial({
      map: old.map || null,
      color: old.map ? 0xffffff : old.color,
      normalMap: old.normalMap || null,
      roughnessMap: old.roughnessMap || null,
      metalnessMap: old.metalnessMap || null,
      roughness: old.roughness ?? 0.8,
      metalness: Math.min(0.3, old.metalness ?? 0),
    });
    if (old.normalMap) m.normalScale.copy(old.normalScale);
    // the soldier's kit: a glossy visor and armour with a soft sheen
    if (/Visor/i.test(old.name)) Object.assign(m, { roughness: 0.2, metalness: 0.6 });
    else if (/VanguardBody/i.test(old.name)) Object.assign(m, { roughness: 0.55, metalness: 0.12 });
    else if (/Skin|Body$/i.test(old.name)) m.roughness = Math.max(0.55, m.roughness);
    m.name = old.name;
    m.userData.env = 0.6;
    o.material = m;
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
  const glasses = new THREE.Mesh(mergeBoxes(parts), new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.15, metalness: 0.4 }));
  glasses.name = 'gear-glasses';
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

// keep the shading of a colour map, give it a new colour: f(brightness) -> [r, g, b] in 0..1
function recolor(map, f) {
  const im = map.image;
  const c = document.createElement('canvas');
  c.width = im.width;
  c.height = im.height;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const l = (0.3 * a[i] + 0.55 * a[i + 1] + 0.15 * a[i + 2]) / 255;
    // strong reds (the stripes) stay a muted red; everything else takes the new colour
    if (a[i] > a[i + 1] * 1.6 && a[i] > 90) {
      a[i] = 120 * l + 40;
      a[i + 1] = a[i + 2] = 40 * l + 20;
      continue;
    }
    const [r, gg, b] = f(0.1 + l * 0.75);
    a[i] = Math.min(255, r * 255);
    a[i + 1] = Math.min(255, gg * 255);
    a[i + 2] = Math.min(255, b * 255);
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = map.flipY;
  t.wrapS = map.wrapS;
  t.wrapT = map.wrapT;
  return t;
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
const _right = new THREE.Vector3(), _back = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _rootQ = new THREE.Quaternion(), _legR = new THREE.Vector3();
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

const TINT = { A: new THREE.Color(1, 1, 1), B: new THREE.Color(1, 1, 1), H: new THREE.Color(1, 1, 1) };

export class SkinnedBody {
  constructor(look, variant = 0) {
    const src = look === 'H' ? A.civil : look === 'B' ? A.guard : A.soldier;
    this.look = look;
    this.lookKey = look;
    this.root = new THREE.Group();
    this.root.rotation.order = 'YXZ';
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
    // no two look quite the same
    const v = variant | 0;
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      if (look === 'A' && /VanguardBody|gear-vest|gear-helmet/.test(m.name || o.name)) m.userData.base.multiply(new THREE.Color(...KIT[v % KIT.length]));
      if (look === 'B' && /Outfit_Top|Outfit_Bottom/.test(m.name)) m.userData.base.multiply(new THREE.Color(...SUIT[v % SUIT.length]));
      if (look === 'B' && o.name === 'gear-vest') o.visible = v % 2 === 1;
      if (look === 'B' && o.name === 'gear-cap') o.visible = v % 3 === 2;
    });
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
    this.gunKind = undefined;
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
      this.dead = Math.min(1, this.dead + dt * 1.7);
      const k = this.dead;
      this.root.position.y = p.y;
      // slide away with the hit, slowing fast
      if (this.fly) {
        const f = Math.max(0, 1 - k * 1.5);
        const nx = this.root.position.x + this.fly.vx * f * dt * 2.4, nz = this.root.position.z + this.fly.vz * f * dt * 2.4;
        // walls, the fountain and furniture stop the slide (with room for the body)
        const ox = this.fly.vx > 0 ? 0.35 : -0.35, oz = this.fly.vz > 0 ? 0.35 : -0.35;
        if (!blocker || !blocker(nx + ox, nz + oz, p.y)) {
          this.root.position.x = nx;
          this.root.position.z = nz;
        } else this.fly = null;
      }
      if (this.mixer && this.deathPose) {
        // from the pose at the moment of death: the knees give, the body folds, the arms go limp, then it tips over
        for (const [bone, q] of this.deathPose) bone.quaternion.copy(q);
        const kn = Math.min(1, k / 0.45), knee = kn * kn * (3 - 2 * kn);
        this.root.updateMatrixWorld(true);
        this.root.getWorldQuaternion(_rootQ);
        _right.set(1, 0, 0).applyQuaternion(_rootQ);
        _back.set(0, 0, 1).applyQuaternion(_rootQ);
        for (const side of ['Left', 'Right']) {
          turn(this.b[side + 'UpLeg'], _q.setFromAxisAngle(_right, 0.9 * knee));
          turn(this.b[side + 'Leg'], _q.setFromAxisAngle(_right, -1.5 * knee));
        }
        turn(this.b.Spine, _q.setFromAxisAngle(_right, 0.3 * knee * this.fallDir));
        if (this.headSnap) turn(this.b.Neck, _q.setFromAxisAngle(_right, -0.7 * Math.min(1, k * 4)));
        for (const [side, sx] of [['Left', -1], ['Right', 1]]) {
          const arm = this.b[side + 'Arm'], fore = this.b[side + 'ForeArm'], hand = this.b[side + 'Hand'];
          hand.getWorldPosition(_t1);
          this.b.Spine.getWorldPosition(_t2);
          _t2.addScaledVector(_right, sx * 0.32).addScaledVector(_up, -0.25);
          _t1.lerp(_t2, knee * 0.85);
          ik(arm, fore, hand, _t1, _pole.copy(_back).addScaledVector(_right, sx * 0.4));
        }
        const drop = 0.44 * (1 - Math.cos(0.9 * knee)) + 0.44 * (1 - Math.cos(0.9 * knee - 1.5 * knee));
        this.model.position.y = this.baseY - drop * 0.8;
      } else this.model.position.y = Math.min(this.deadY ?? this.baseY, this.baseY - Math.min(1, k * 2) * 0.25);
      // the knocked-off helmet flies, bounces once and lies there
      if (this.hat && this.hat.v) {
        const h = this.hat, m = h.mesh;
        h.v.y -= 9.8 * dt;
        m.position.addScaledVector(h.v, dt);
        m.rotation.x += h.spin.x * dt;
        m.rotation.y += h.spin.y * dt;
        m.rotation.z += h.spin.z * dt;
        if (m.position.y < h.floor + 0.08 && h.v.y < 0) {
          m.position.y = h.floor + 0.08;
          if (h.v.y < -2) {
            h.v.multiplyScalar(0.35);
            h.v.y = -h.v.y;
            h.spin.multiplyScalar(0.4);
          } else h.v = null;
        }
      }
      const tip = Math.max(0, (k - 0.3) / 0.7);
      const e = tip * tip;
      this.root.rotation.x = e * 1.42 * this.fallDir;
      this.root.rotation.z = e * (this.roll || 0);
      this.shadow.visible = false;
      return;
    }
    this.root.rotation.x = 0;
    this.root.rotation.z = 0;
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
    // deep enough that the body sits as low as the hitbox does (0.5 m)
    const legA = crouch * 1.15, legB = crouch * 2.2;
    const drop = 0.44 * (1 - Math.cos(legA)) + 0.44 * (1 - Math.cos(legA - legB));
    this.model.position.y = this.baseY - drop;
    this.aim.position.y = 1.45 - drop * 0.95;
    this.root.updateMatrixWorld(true);
    this.root.getWorldQuaternion(_rootQ);
    _right.set(1, 0, 0).applyQuaternion(_rootQ);
    _back.set(0, 0, 1).applyQuaternion(_rootQ);

    // strafing: the hips and legs turn towards where we move, the chest keeps facing the aim
    const relT = Math.max(-1.05, Math.min(1.05, p.rel || 0));
    this.relS = (this.relS || 0) + (relT - (this.relS || 0)) * Math.min(1, dt * 9);
    const rs = this.mixer && !p.kneel ? this.relS : 0;
    _legR.copy(_right);
    if (Math.abs(rs) > 0.005) {
      turn(b.Hips, _q.setFromAxisAngle(_up, -rs));
      turn(b.Spine, _q.setFromAxisAngle(_up, rs * 0.5));
      turn(b.Spine1, _q.setFromAxisAngle(_up, rs * 0.3));
      turn(b.Spine2, _q.setFromAxisAngle(_up, rs * 0.2));
      _legR.applyAxisAngle(_up, -rs);
    }
    // in the air the knees come up instead of running on nothing
    this.airK = (this.airK || 0) + ((p.air ? 1 : 0) - (this.airK || 0)) * Math.min(1, dt * 10);
    // leaning into a run
    const runK = this.mixer ? Math.min(1, Math.max(0, (sp - 2.8) / 1.6)) : 0;
    if (runK > 0.01 && crouch < 0.5) turn(b.Spine, _q.setFromAxisAngle(_right, runK * 0.14));
    if (this.airK > 0.02 && this.mixer) {
      const k = this.airK;
      for (const [side, ph] of [['Left', 0.25], ['Right', -0.1]]) {
        turn(b[side + 'UpLeg'], _q.setFromAxisAngle(_legR, (0.55 + ph) * k));
        turn(b[side + 'Leg'], _q.setFromAxisAngle(_legR, -(1.0 + ph) * k));
      }
    }

    if (crouch > 0.01) {
      for (const side of ['Left', 'Right']) {
        turn(b[side + 'UpLeg'], _q.setFromAxisAngle(_legR, legA));
        turn(b[side + 'Leg'], _q.setFromAxisAngle(_legR, -legB));
        turn(b[side + 'Foot'], _q.setFromAxisAngle(_legR, legB - legA));
      }
      turn(b.Spine, _q.setFromAxisAngle(_right, crouch * 0.12));
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
    if (this.flinch > 0) {
      this.flinch = Math.max(0, this.flinch - dt * 6);
      const f = Math.sin(this.flinch * Math.PI) * 0.22;
      turn(b.Spine1, _q.setFromAxisAngle(_right, -f));
      if (this.flinchHead) turn(b.Neck, _q.setFromAxisAngle(_right, -f * 1.8));
    }
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
    for (const m of this.mats) {
      m.color.copy(m.userData.base).multiply(this.tint).multiplyScalar(this.lightK);
      // reflections fade in the dark rooms like the rest of the light
      m.envMapIntensity = (m.userData.env ?? 0.6) * this.lightK * this.lightK;
    }
    this.gunMat.color.setScalar(this.lightK);
  }

  // push: how hard the killing hit throws the body (m/s), along the shot dx, dz
  die(fromBehind, push = 0.7, dx = 0, dz = 0, head = false) {
    this.dead = 0.001;
    this.deadY = this.model.position.y;
    this.fallDir = fromBehind ? -1 : 1;
    const l = Math.hypot(dx, dz) || 1;
    this.fly = { vx: (dx / l) * push, vz: (dz / l) * push };
    this.roll = (Math.random() - 0.5) * 0.8;
    this.headSnap = head;
    // a head shot knocks the helmet, cap or glasses off
    if (head && this.root.parent) {
      let hat = null;
      this.model.traverse((o) => {
        if (o.visible && (o.name === 'gear-chicken' || (!hat && /gear-(helmet|cap|glasses)/.test(o.name)))) hat = o;
      });
      if (hat) {
        this.hat = { mesh: hat, bone: hat.parent, pos: hat.position.clone(), quat: hat.quaternion.clone(), scale: hat.scale.clone() };
        this.root.parent.attach(hat);
        this.hat.v = new THREE.Vector3((dx / l) * 2.2 + (Math.random() - 0.5), 3.2 + Math.random(), (dz / l) * 2.2 + (Math.random() - 0.5));
        this.hat.spin = new THREE.Vector3(Math.random() * 12 - 6, Math.random() * 12 - 6, Math.random() * 12 - 6);
        this.hat.floor = this.root.position.y;
      }
    }
    // the clips stop here; the fall is laid over this pose
    this.deathPose = [];
    this.model.traverse((o) => {
      if (o.isBone) this.deathPose.push([o, o.quaternion.clone()]);
    });
  }

  zombify() {
    this.tint = new THREE.Color(0.55, 0.85, 0.5);
    this.zombie = true;
  }

  chickenHat() {
    this.model.traverse((o) => {
      if (o.name === 'gear-chicken') o.visible = true;
    });
  }

  // the "big heads" option
  bigHead() {
    if (this.b.Head) this.b.Head.scale.setScalar(2.1);
  }

  // a shot that does not kill: a short jolt of the upper body
  hit(head) {
    this.flinch = 1;
    this.flinchHead = head;
  }

  revive() {
    if (this.hat) {
      const h = this.hat;
      h.bone.add(h.mesh);
      h.mesh.position.copy(h.pos);
      h.mesh.quaternion.copy(h.quat);
      h.mesh.scale.copy(h.scale);
      this.hat = null;
    }
    this.dead = 0;
    this.deathPose = null;
    this.fly = null;
    this.flinch = 0;
    this.root.rotation.set(0, 0, 0);
    this.model.position.y = this.baseY;
  }

  setLight(k) {
    this.lightK = k;
  }
}
