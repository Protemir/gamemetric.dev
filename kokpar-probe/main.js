// Көкпар — проба одного реалистичного коня: аллюры, поворот, торможение, пыль, FPS.
// ?model=stand-in|pack  ?n=6 (коней на поле)  ?q=low|medium|high  ?auto (автопилот)  ?debug (window.__kp)  ?clean (без HUD)
import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { FBXLoader } from './vendor/loaders/FBXLoader.js';
import * as SkeletonUtils from './vendor/utils/SkeletonUtils.js';

const P = new URLSearchParams(location.search);
const Q = P.get('q') || (matchMedia('(pointer: coarse)').matches ? 'medium' : 'high');
const N = Math.max(1, Math.min(12, Number(P.get('n') || 6)));
const AUTO = P.has('auto');
if (P.has('clean')) document.body.classList.add('clean');

// Модели. Для купленного пака поменять file и имена клипов (null = такого клипа нет).
const MODELS = {
  'stand-in': {
    file: 'models/stand-in-horse.glb', height: 1.75, maxScale: 2.3, gallop: 9,
    clips: { idle: 'Idle', walk: 'Walk', trot: null, canter: null, gallop: 'Gallop', left: null, right: null, halt: null },
    neck: ['Neck1', 'Neck2', 'Neck3'], head: 'Head', hooves: ['FrontLowerLeg.L_end', 'FrontLowerLeg.R_end', 'BackLowerLeg.L_end', 'BackLowerLeg.R_end'],
  },
  // Warhorse Lite (Literock Studios, бесплатная лицензия, можно в коммерческой игре; сам файл отдельно не выкладывать)
  warhorse: {
    file: 'models/warhorse-2048.glb', height: 1.75, maxScale: 1.9, gallop: 8.5,
    clips: { idle: 'idle_loop', walk: 'walk_loop', trot: null, canter: 'canter_loop', gallop: null, left: null, right: null, halt: null, rear: 'rear' },
    neck: ['neck_01', 'neck_02', 'neck_03'], head: 'head', hooves: ['finger_L', 'finger_R', 'toe_L', 'toe_R'],
  },
  pack: {
    file: 'models/horse.glb', height: 1.75, maxScale: 1.4,
    clips: { idle: 'idle_main', walk: 'walk', trot: 'trot', canter: 'canter', gallop: 'gallop', left: 'gallop_left', right: 'gallop_right', halt: 'halt' },
    neck: ['neck_01', 'neck_02'], head: 'head', hooves: [],
  },
};
const M = MODELS[P.get('model') || 'warhorse'];

// Скорости аллюров настоящего коня, м/с: шаг ~6 км/ч, рысь ~14, кентер ~22, галоп ~45.
const GAITS = [
  { name: 'стоит', v: 0 },
  { name: 'шаг', v: 1.7 },
  { name: 'рысь', v: 3.9 },
  { name: 'кентер', v: 6.2 },
  { name: 'галоп', v: 12.5 },
];
if (M.gallop) GAITS[4].v = M.gallop;
const FIELD = 110; // полуширина поля, м

// ---------- рендер ----------
const renderer = new THREE.WebGLRenderer({ antialias: Q !== 'low', powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q === 'high' ? 2 : Q === 'medium' ? 1.5 : 1));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = Q !== 'low';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const HORIZON = new THREE.Color('#e9dcc0');
scene.fog = new THREE.Fog(HORIZON, 60, 420);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1500);

scene.add(new THREE.HemisphereLight('#cfe3ff', '#8a6a3a', 1.1));
const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
sun.position.set(-40, 60, 25);
sun.castShadow = renderer.shadowMap.enabled;
sun.shadow.mapSize.set(Q === 'high' ? 2048 : 1024, Q === 'high' ? 2048 : 1024);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 160 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// Небо: градиент от горизонта к зениту.
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(1200, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#5d8fcf') }, bot: { value: HORIZON } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 top; uniform vec3 bot; varying float h;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(0., .45, h)), 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }),
));

// Отражения для PBR-материалов коня: окружение из того же неба.
{
  const env = new THREE.Scene();
  env.add(scene.children[scene.children.length - 1].clone());
  const g = new THREE.Mesh(new THREE.CircleGeometry(900, 24), new THREE.MeshBasicMaterial({ color: '#9c8656' }));
  g.rotation.x = -Math.PI / 2; g.position.y = -2;
  env.add(g);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.02).texture;
  scene.environmentIntensity = 0.95;
  pm.dispose();
}

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  t.anisotropy = 4;
  return t;
}
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Земля: выгоревшая степь, пятна травы и пыли.
const groundTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#b39a5f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * w, y = rnd() * h, r = 1 + rnd() * 3;
    const k = rnd();
    g.fillStyle = k < 0.45 ? `rgba(120,118,60,${0.25 + rnd() * 0.3})` : k < 0.8 ? `rgba(200,175,115,${0.2 + rnd() * 0.3})` : `rgba(90,70,40,${0.2 + rnd() * 0.2})`;
    g.fillRect(x, y, r, r * (0.5 + rnd()));
  }
}, 90);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshLambertMaterial({ map: groundTex }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Пучки ковыля: один InstancedMesh, три скрещённые плоскости.
const GRASS = { low: 0, medium: 7000, high: 18000 }[Q] ?? 7000;
if (GRASS) {
  const bladeTex = canvasTex(64, 64, (g, w, h) => {
    for (let i = 0; i < 14; i++) {
      const x = 6 + rnd() * 52, top = 4 + rnd() * 26, lean = (rnd() - 0.5) * 18;
      const grad = g.createLinearGradient(0, h, 0, top);
      grad.addColorStop(0, '#a08f52'); grad.addColorStop(1, rnd() < 0.5 ? '#f0e2ad' : '#dccf92');
      g.strokeStyle = grad; g.lineWidth = 1.6 + rnd() * 1.4;
      g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + lean * 0.3, (h + top) / 2, x + lean, top); g.stroke();
    }
  });
  const quads = [];
  for (let k = 0; k < 3; k++) {
    const q = new THREE.PlaneGeometry(0.9, 0.55);
    q.translate(0, 0.27, 0);
    q.rotateY((k * Math.PI) / 3);
    quads.push(q);
  }
  const geo = mergeQuads(quads);
  const mat = new THREE.MeshLambertMaterial({ map: bladeTex, alphaTest: 0.45 });
  const grass = new THREE.InstancedMesh(geo, mat, GRASS);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3();
  for (let i = 0; i < GRASS; i++) {
    p4.set((rnd() * 2 - 1) * (FIELD + 40), 0, (rnd() * 2 - 1) * (FIELD + 40));
    q4.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rnd() * 6.28);
    const s = 0.6 + rnd() * 0.9;
    s4.set(s, s * (0.7 + rnd() * 0.6), s);
    grass.setMatrixAt(i, m4.compose(p4, q4, s4));
  }
  grass.receiveShadow = true;
  scene.add(grass);
}
function mergeQuads(list) {
  const pos = [], uv = [], nor = [], idx = [];
  let base = 0;
  for (const g of list) {
    pos.push(...g.attributes.position.array); uv.push(...g.attributes.uv.array);
    for (let i = 0; i < g.attributes.position.count; i++) nor.push(0, 1, 0); // нормаль вверх — пучок светится как земля
    const ix = g.index.array;
    for (const i of ix) idx.push(base + i);
    for (let t = 0; t < ix.length; t += 3) idx.push(base + ix[t], base + ix[t + 2], base + ix[t + 1]); // обратная сторона с той же нормалью вверх
    base += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}

// Горы на горизонте (Алатау): низкополигональные конусы в дымке.
{
  const mat = new THREE.MeshBasicMaterial({ color: '#9fb1c7', fog: false });
  const snow = new THREE.MeshBasicMaterial({ color: '#eef1f5', fog: false });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.283 + (rnd() - 0.5) * 0.3, d = 560 + rnd() * 200, hgt = 50 + rnd() * 110;
    const m = new THREE.Mesh(new THREE.ConeGeometry(hgt * 1.3, hgt, 7), mat);
    m.position.set(Math.sin(a) * d, hgt / 2 - 4, -Math.cos(a) * d);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(hgt * 0.36, hgt * 0.28, 7), snow);
    cap.position.y = hgt * 0.36;
    m.add(cap);
    scene.add(m);
  }
}

// ---------- пыль из-под копыт ----------
const DUST = 600;
const dust = {
  pos: new Float32Array(DUST * 3), vel: new Float32Array(DUST * 3), life: new Float32Array(DUST), size: new Float32Array(DUST), next: 0,
};
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dust.pos, 3));
dustGeo.setAttribute('life', new THREE.BufferAttribute(dust.life, 1));
dustGeo.setAttribute('size', new THREE.BufferAttribute(dust.size, 1));
const dustPts = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { scale: { value: innerHeight / 2 } },
  vertexShader: `attribute float life; attribute float size; varying float vL; uniform float scale;
    void main(){ vL = life; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * (1.4 - life * .4) * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying float vL; void main(){ if (vL <= 0.) discard; float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d) * vL * .42; gl_FragColor = vec4(.80,.70,.52, a); }`,
}));
dustPts.frustumCulled = false;
scene.add(dustPts);
function puff(p, speed) {
  const n = speed > 9 ? 4 : 2;
  for (let k = 0; k < n; k++) {
    const i = dust.next; dust.next = (dust.next + 1) % DUST;
    dust.pos.set([p.x + (Math.random() - 0.5) * 0.2, 0.05, p.z + (Math.random() - 0.5) * 0.2], i * 3);
    dust.vel.set([(Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.7, (Math.random() - 0.5) * 0.8], i * 3);
    dust.life[i] = 1;
    dust.size[i] = 0.5 + Math.random() * 0.5 + speed * 0.04;
  }
}
function stepDust(dt) {
  for (let i = 0; i < DUST; i++) {
    if (dust.life[i] <= 0) continue;
    dust.life[i] -= dt * 0.75;
    for (let a = 0; a < 3; a++) dust.pos[i * 3 + a] += dust.vel[i * 3 + a] * dt;
    dust.vel[i * 3 + 1] *= 1 - dt * 1.5;
  }
  dustGeo.attributes.position.needsUpdate = dustGeo.attributes.life.needsUpdate = dustGeo.attributes.size.needsUpdate = true;
}

// ---------- конь ----------
const V = new THREE.Vector3(), V2 = new THREE.Vector3();
const Qy = new THREE.Quaternion(), Qx = new THREE.Quaternion();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
let proto = null; // { scene, clips, native: {walk: м/с...}, fix }

async function loadModel() {
  const isFbx = M.file.toLowerCase().endsWith('.fbx');
  const res = await (isFbx ? new FBXLoader() : new GLTFLoader()).loadAsync(M.file);
  const root = isFbx ? res : res.scene;
  const clips = {};
  for (const [k, name] of Object.entries(M.clips)) {
    if (!name) continue;
    const c = res.animations.find((a) => a.name === name || a.name.endsWith('|' + name));
    if (c) clips[k] = inPlace(c.clone(), root);
  }
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = Q === 'high';
      o.frustumCulled = false; // у skinned mesh рамка от позы покоя — без этого конь пропадает у края кадра
    }
  });
  // Масштаб по росту и поворот мордой к +Z (считаем по костям головы и хвоста).
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const k = M.height / (box.max.y - box.min.y);
  root.scale.multiplyScalar(k);
  root.updateMatrixWorld(true);
  const head = root.getObjectByName(M.head), tail = findTail(root);
  let yaw = 0;
  if (head && tail) {
    const h = head.getWorldPosition(new THREE.Vector3()), t = tail.getWorldPosition(new THREE.Vector3());
    yaw = Math.atan2(h.x - t.x, h.z - t.z);
  }
  const holder = new THREE.Group();
  root.rotation.y -= yaw;
  holder.add(root);
  holder.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(holder);
  root.position.y -= b2.min.y;
  proto = { scene: holder, clips, native: {} };
  for (const g of ['walk', 'trot', 'canter', 'gallop']) if (clips[g]) proto.native[g] = calibrate(clips[g]);
}
function findTail(root) {
  let t = null;
  root.traverse((o) => { if (!t && /tail/i.test(o.name)) t = o; });
  return t;
}
// Убираем горизонтальный сдвиг корневой кости: конь движется кодом, а не клипом.
function inPlace(clip) {
  clip.tracks = clip.tracks.filter((tr) => !(tr.name.endsWith('.position') && /root|armature|body|hips|pelvis/i.test(tr.name) && dropXZ(tr)));
  return clip;
}
function dropXZ(tr) {
  const v = tr.values, x0 = v[0], z0 = v[2];
  for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  return false; // трек оставляем, вертикальная качка нужна
}
// Сколько метров в секунду «проходит» клип: скорость копыта назад, пока оно стоит на земле.
function calibrate(clip) {
  const h = SkeletonUtils.clone(proto.scene);
  const mixer = new THREE.AnimationMixer(h);
  mixer.clipAction(clip).play();
  const hooves = hoofBones(h);
  if (!hooves.length) return null;
  const S = 120, dt = clip.duration / S, track = hooves.map(() => []);
  for (let i = 0; i <= S; i++) {
    mixer.setTime(i * dt);
    h.updateMatrixWorld(true);
    hooves.forEach((b, j) => track[j].push(h.worldToLocal(b.getWorldPosition(new THREE.Vector3()))));
  }
  const speeds = [];
  for (const tr of track) {
    const minY = Math.min(...tr.map((p) => p.y));
    for (let i = 1; i < tr.length; i++) {
      if (tr[i].y < minY + 0.05 && tr[i - 1].y < minY + 0.05) speeds.push(-(tr[i].z - tr[i - 1].z) / dt);
    }
  }
  speeds.sort((a, b) => a - b);
  const v = speeds[Math.floor(speeds.length / 2)];
  return v > 0.3 ? v : null;
}
function hoofBones(o) {
  const out = [];
  for (const n of M.hooves) { const b = o.getObjectByName(n) || o.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n)); if (b) out.push(b); }
  if (!out.length) o.traverse((b) => { if (b.isBone && /(hoof|toe|foot).*(end)?$/i.test(b.name) && !b.children.some((c) => c.isBone)) out.push(b); });
  return out;
}

class Horse {
  constructor(i, ai) {
    this.ai = ai;
    this.obj = SkeletonUtils.clone(proto.scene);
    this.tilt = new THREE.Group(); // наклон в поворот и «приседание» при торможении
    const body = this.obj.children[0];
    this.obj.remove(body); this.tilt.add(body); this.obj.add(this.tilt);
    scene.add(this.obj);
    this.obj.position.set(i === 0 ? 0 : (rnd() - 0.5) * 60, 0, i === 0 ? 0 : (rnd() - 0.5) * 60);
    this.yaw = rnd() * 6.28 * (i === 0 ? 0 : 1);
    this.v = 0; this.gait = 0; this.steer = 0; this.turn = 0; this.halt = 0; this.pitch = 0; this.roll = 0; this.acc = 0;
    this.mixer = new THREE.AnimationMixer(this.obj);
    this.act = {};
    for (const [k, c] of Object.entries(proto.clips)) {
      const a = this.mixer.clipAction(c);
      if (k === 'halt' || k === 'rear') { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = false; }
      else { a.play(); a.time = rnd() * c.duration; }
      a.weight = 0;
      this.act[k] = a;
    }
    this.neck = M.neck.map((n) => this.obj.getObjectByName(n)).filter(Boolean);
    this.head = this.obj.getObjectByName(M.head);
    // поза покоя шеи и головы: каждый кадр начинаем с неё, иначе процедурный поворот копится
    this.rest = [...this.neck, this.head].filter(Boolean).map((b) => [b, b.quaternion.clone()]);
    this.hooves = hoofBones(this.obj).map((b) => ({ b, low: true }));
    this.brain = { t: 0, target: new THREE.Vector3() };
  }
  think(dt) {
    const b = this.brain;
    b.t -= dt;
    const p = this.obj.position;
    if (b.t <= 0 || V.subVectors(b.target, p).setY(0).length() < 6) {
      b.target.set((rnd() * 2 - 1) * FIELD * 0.8, 0, (rnd() * 2 - 1) * FIELD * 0.8);
      b.t = 4 + rnd() * 8;
      this.gait = rnd() < 0.12 ? 0 : rnd() < 0.55 ? 4 : 1 + Math.floor(rnd() * 3);
      if (this.gait === 0 && this.v > 8) this.halt = 1;
    }
    V.subVectors(b.target, p);
    let d = Math.atan2(V.x, V.z) - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.steer = THREE.MathUtils.clamp(d * 2, -1, 1);
  }
  update(dt) {
    if (this.ai) this.think(dt);
    // Скорость: разгон плавный, торможение сильнее; резкий стоп — ещё сильнее.
    const target = GAITS[this.gait].v;
    const prev = this.v;
    const rate = this.halt > 0 ? 11 : target > this.v ? 2.6 + this.v * 0.12 : 5.5;
    this.v += THREE.MathUtils.clamp(target - this.v, -rate * dt, rate * dt);
    if (this.halt > 0 && this.v < 0.3) this.halt = 0;
    this.acc = THREE.MathUtils.lerp(this.acc, (this.v - prev) / Math.max(dt, 1e-4), 1 - Math.exp(-dt * 6));
    // Поворот: на галопе радиус шире, на месте — разворот шагом.
    const maxTurn = this.v < 0.5 ? 1.3 : 2.4 / (1 + this.v * 0.22);
    this.turn = THREE.MathUtils.lerp(this.turn, this.steer * maxTurn, 1 - Math.exp(-dt * 5));
    this.yaw += this.turn * dt;
    const p = this.obj.position;
    p.x += Math.sin(this.yaw) * this.v * dt;
    p.z += Math.cos(this.yaw) * this.v * dt;
    // мягкая граница поля
    const out = Math.max(Math.abs(p.x), Math.abs(p.z)) - FIELD;
    if (out > 0) { V.set(-p.x, 0, -p.z); let d = Math.atan2(V.x, V.z) - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += Math.sign(d) * Math.min(Math.abs(d), dt * 1.2); }
    this.obj.rotation.y = this.yaw;
    this.animate(dt);
  }
  animate(dt) {
    const v = this.v, A = this.act;
    // Веса клипов по скорости: между соседними аллюрами узкая зона перехода.
    const have = [['idle', 0], ...['walk', 'trot', 'canter', 'gallop'].filter((k) => A[k]).map((k) => [k, GAITS.find((g) => g.name === { walk: 'шаг', trot: 'рысь', canter: 'кентер', gallop: 'галоп' }[k]).v])];
    const w = {};
    for (const [k] of have) w[k] = 0;
    if (v <= have[0][1]) w[have[0][0]] = 1;
    else if (v >= have[have.length - 1][1]) w[have[have.length - 1][0]] = 1;
    else for (let i = 0; i < have.length - 1; i++) {
      const [ka, va] = have[i], [kb, vb] = have[i + 1];
      if (v >= va && v <= vb) {
        const mid = (va + vb) / 2, band = (vb - va) * 0.22;
        const t = THREE.MathUtils.smoothstep(v, mid - band, mid + band);
        w[ka] = 1 - t; w[kb] = t;
      }
    }
    // Поворотные клипы галопа (если есть в паке) подмешиваются по силе поворота.
    const turnAmt = THREE.MathUtils.clamp(this.turn / 0.8, -1, 1);
    for (const [k, val] of Object.entries(w)) {
      const a = A[k];
      let wk = val;
      if (k === 'gallop' && (A.left || A.right)) {
        const side = turnAmt < 0 ? A.right : A.left; // в three.js +yaw — влево
        const other = turnAmt < 0 ? A.left : A.right;
        if (side) { side.weight = wk * Math.abs(turnAmt); side.timeScale = this.scaleFor('gallop'); }
        if (other) other.weight = 0;
        wk *= 1 - Math.abs(turnAmt) * (side ? 1 : 0);
      }
      a.weight = wk;
      if (k !== 'idle') a.timeScale = this.scaleFor(k);
    }
    // Свечка: одноразовый клип поверх всего, конь стоит.
    if (A.rear) {
      const on = A.rear.isRunning();
      A.rear.weight = on ? 1 : 0;
      if (on) for (const k of Object.keys(w)) if (A[k]) A[k].weight = 0;
    }
    // Резкий стоп: одноразовый клип, если он есть.
    if (A.halt) {
      if (this.halt > 0 && !A.halt.isRunning()) { A.halt.reset().play(); }
      A.halt.weight = this.halt > 0 ? 1 : 0;
    }
    for (const [b, q] of this.rest) b.quaternion.copy(q);
    this.mixer.update(dt);
    // Процедурный слой поверх клипов: наклон в поворот, «приседание» при торможении, шея смотрит в поворот.
    const rollT = THREE.MathUtils.clamp(-this.turn * v * 0.045, -0.2, 0.2);
    const pitchT = THREE.MathUtils.clamp(-this.acc * 0.012, -0.09, 0.05);
    this.roll = THREE.MathUtils.lerp(this.roll, rollT, 1 - Math.exp(-dt * 6));
    this.pitch = THREE.MathUtils.lerp(this.pitch, pitchT, 1 - Math.exp(-dt * 5));
    this.tilt.rotation.set(this.pitch, 0, this.roll);
    this.tilt.position.y = Math.max(0, -this.pitch) * 0.0; // точка вращения — у копыт
    const look = THREE.MathUtils.clamp(this.turn * 0.22, -0.35, 0.35);
    for (const n of this.neck) { Qy.setFromAxisAngle(AY, look / this.neck.length); n.quaternion.premultiply(Qy); }
    if (this.halt > 0 && this.head) { Qx.setFromAxisAngle(AX, -0.25 * this.halt); this.head.quaternion.multiply(Qx); }
    // Касание копыт → пыль.
    if (v > 2.5) {
      this.obj.updateMatrixWorld(true);
      for (const h of this.hooves) {
        h.b.getWorldPosition(V2);
        const low = V2.y < 0.09;
        if (low && !h.low) puff(V2, v);
        h.low = low;
      }
    }
  }
  rear() {
    const a = this.act.rear;
    if (!a || a.isRunning() || this.v > 1.5) return;
    this.gait = 0;
    a.reset().play();
  }
  scaleFor(k) {
    const nat = proto.native[k];
    if (!nat) return 1;
    return THREE.MathUtils.clamp(Math.max(this.v, 0.4) / nat, 0.55, M.maxScale || 1.5);
  }
}

// ---------- управление ----------
const keys = {};
let player;
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (!player || AUTO) return;
  if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'KeyZ') player.gait = Math.min(4, player.gait + 1);
  if (e.code === 'KeyS' || e.code === 'ArrowDown') player.gait = Math.max(0, player.gait - 1);
  if (e.code === 'Space') { player.gait = 0; if (player.v > 4) player.halt = 1; }
  if (e.code === 'KeyR') player.rear();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
const stickEl = document.getElementById('stick');
let stick = null;
if (matchMedia('(pointer: coarse)').matches) {
  document.body.classList.add('touch');
  document.getElementById('hint').textContent = 'Палец вверх — быстрее, вниз — медленнее, вбок — поворот';
}
addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || e.target.id === 'stop') return;
  stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, g0: player ? player.gait : 0 };
  Object.assign(stickEl.style, { display: 'block', left: e.clientX + 'px', top: e.clientY + 'px' });
});
addEventListener('pointermove', (e) => {
  if (!stick || e.pointerId !== stick.id) return;
  stick.dx = THREE.MathUtils.clamp((e.clientX - stick.x) / 60, -1, 1);
  stick.dy = THREE.MathUtils.clamp((e.clientY - stick.y) / 60, -1, 1);
  stickEl.firstChild.style.transform = `translate(${stick.dx * 36}px, ${stick.dy * 36}px)`;
  // вертикаль стика — аллюр относительно того, что был при касании
  player.gait = THREE.MathUtils.clamp(stick.g0 + Math.round(-stick.dy * 2.4), 0, 4);
});
const endStick = (e) => { if (stick && e.pointerId === stick.id) { stick = null; stickEl.style.display = 'none'; } };
addEventListener('pointerup', endStick);
addEventListener('pointercancel', endStick);
document.getElementById('stop').addEventListener('pointerdown', (e) => { e.stopPropagation(); player.gait = 0; if (player.v > 4) player.halt = 1; });

// Автопилот для ролика и замеров: разгон в галоп, дуга влево, дуга вправо, резкий стоп, снова вперёд.
const SCRIPT = [[0, 4, 0], [2.2, 4, 0.9], [3.6, 4, -0.85], [5.0, 4, 0], [5.5, 0, 0, 'halt'], [7.5, 2, 0.3], [9, 4, -0.2], [12, 4, 0]];
let autoT = 0;
function autopilot(dt) {
  autoT += dt;
  const loop = 12.5, t = autoT % loop;
  let cur = SCRIPT[0];
  for (const s of SCRIPT) if (t >= s[0]) cur = s;
  if (player.gait !== cur[1] && cur[3] === 'halt' && player.v > 4) player.halt = 1;
  player.gait = cur[1];
  player.steer = cur[2];
}

// ---------- камера ----------
const cam = { pos: new THREE.Vector3(0, 3, -8), look: new THREE.Vector3(), shake: 0, yaw: 0 };
function updateCamera(dt, snap) {
  const h = player, p = h.obj.position;
  const dist = (AUTO ? 3.4 : 6.2) + h.v * (AUTO ? 0.08 : 0.16), side = AUTO ? 2.6 : 0.6;
  let dy = h.yaw - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  cam.yaw = snap ? h.yaw : cam.yaw + dy * (1 - Math.exp(-dt * 3.2));
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
  V.set(p.x - fx * dist + fz * side, (AUTO ? 1.5 : 2.5) + h.v * 0.02, p.z - fz * dist - fx * side);
  const k = snap ? 1 : 1 - Math.exp(-dt * 14);
  cam.pos.lerp(V, k);
  V2.set(p.x + fx * (AUTO ? 1.2 : 3), AUTO ? 1.15 : 1.3, p.z + fz * (AUTO ? 1.2 : 3));
  cam.look.lerp(V2, snap ? 1 : 1 - Math.exp(-dt * 7));
  camera.position.copy(cam.pos);
  cam.shake += dt * (h.v * 1.15);
  camera.position.y += Math.sin(cam.shake) * Math.min(h.v, 12) * 0.004;
  camera.lookAt(cam.look);
  const fov = 55 + Math.min(h.v, 13) * 0.75;
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = THREE.MathUtils.lerp(camera.fov, fov, 1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix(); }
  sun.position.set(p.x - 40, 60, p.z + 25);
  sun.target.position.set(p.x, 0, p.z);
}

// ---------- цикл ----------
const horses = [];
const hud = document.getElementById('hud');
let frames = 0, fpsT = 0, fps = 0, frozen = false, last = performance.now();
function step(dt) {
  if (!player.ai) {
    if (AUTO) autopilot(dt);
    else {
      const s = (keys.KeyA || keys.ArrowLeft || keys.KeyQ ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
      player.steer = stick ? -stick.dx : s;
    }
  }
  for (const h of horses) h.update(dt);
  stepDust(dt);
  updateCamera(dt);
}
function frame(now) {
  if (frozen) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt);
  renderer.render(scene, camera);
  frames++; fpsT += dt;
  if (fpsT >= 0.5) {
    fps = frames / fpsT; frames = 0; fpsT = 0;
    const r = renderer.info.render;
    hud.textContent = `${fps.toFixed(0)} FPS · ${Q} · коней ${N}\n${GAITS[player.gait].name} · ${(player.v * 3.6).toFixed(0)} км/ч\nтреуг. ${(r.triangles / 1000).toFixed(0)}k · вызовов ${r.calls}`;
  }
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  dustPts.material.uniforms.scale.value = innerHeight / 2;
});

try {
  await loadModel();
} catch (e) {
  document.getElementById('load').textContent = 'Не загрузился конь: ' + e.message;
  throw e;
}
for (let i = 0; i < N; i++) horses.push(new Horse(i, i > 0));
player = horses[0];
if (AUTO) player.gait = 4;
updateCamera(0, true);
document.getElementById('load').remove();
requestAnimationFrame(frame);

if (P.has('debug')) {
  window.__kp = {
    horses, player, renderer, proto, GAITS,
    freeze(f) { frozen = f; if (!f) { last = performance.now(); requestAnimationFrame(frame); } },
    step(n, dt) { for (let i = 0; i < n; i++) step(dt); renderer.render(scene, camera); },
    warm(sec) { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60); updateCamera(0, true); },
    stats: () => ({ fps, tris: renderer.info.render.triangles, calls: renderer.info.render.calls, v: player.v, native: proto.native, clips: Object.keys(proto.clips) }),
  };
}
