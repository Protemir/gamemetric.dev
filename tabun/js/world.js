// «Табун» — сцена: небо, степь, трасса, ворота, препятствия, финал, пыль, камера.
import * as THREE from 'three';
import { HALF, LADDER, herdShape, opText, isGood, gateOpsAt } from './logic.js';
import { makeSeatedRider } from './riderreal.js';
import { LodPool, HorsePool, horseMaterial, COATS, HERD_SETS, WILD_COATS, RIVAL_COATS, HORSE_H } from './horses.js';
const HORSE_TINT = 1; // масть × яркость текстуры: подбор под текстуру Warhorse

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (n) => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

export const THEME = {
  day: { top: '#3f86d8', hor: '#d6e8f2', sun: '#fff2d6', sunI: 2.2, hemi: ['#d8ecff', '#7d6a3a', 1.15], fog: '#d6e4e6', grass: '#9fbf55', dirt: '#c9a874', mount: '#8aa3b8', sunDir: [0.35, 0.8, 0.45] },
  gold: { top: '#4f7fc4', hor: '#f3d29a', sun: '#ffd79a', sunI: 2.3, hemi: ['#ffe7c4', '#6b5330', 1.05], fog: '#ead2a6', grass: '#c9b550', dirt: '#d0a36a', mount: '#a49aa6', sunDir: [-0.6, 0.45, 0.35] },
  dusk: { top: '#3a5aa0', hor: '#f6c08e', sun: '#ffd2a6', sunI: 1.8, hemi: ['#ffe8d6', '#8a7a5c', 1.45], fog: '#ecc29c', grass: '#bdb25c', dirt: '#c99c6a', mount: '#8c84a4', sunDir: [0.55, 0.32, 0.6] },
  storm: { top: '#3b4352', hor: '#a3abb5', sun: '#e2e8f0', sunI: 1.15, hemi: ['#ccd6e2', '#4d4c44', 1.4], fog: '#8f98a3', grass: '#93ac6a', dirt: '#a68f6e', mount: '#5d6878', sunDir: [0.3, 0.7, 0.3], storm: true },
  night: { top: '#081028', hor: '#2b3c6e', sun: '#c9d8ff', sunI: 1.5, hemi: ['#7e93d0', '#2a2a3a', 1.35], fog: '#1f2c55', grass: '#7f9a78', dirt: '#a8967e', mount: '#2c3862', sunDir: [-0.5, 0.2, -0.8], night: true },
  winter: { top: '#6f97c4', hor: '#e8eef4', sun: '#fff6ea', sunI: 2.0, hemi: ['#eef4ff', '#9aa6b0', 1.35], fog: '#e6edf2', grass: '#f4f6f8', dirt: '#cfc6b8', mount: '#a9bcd2', sunDir: [0.4, 0.5, 0.5], snow: true },
  morning: { top: '#5d93d6', hor: '#f4e2cf', sun: '#fff0dc', sunI: 2.1, hemi: ['#e4efff', '#6d6440', 1.1], fog: '#e6e2d8', grass: '#a3c062', dirt: '#c7a679', mount: '#93a7c2', sunDir: [-0.4, 0.55, -0.5] },
};

function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// —— частицы: мягкие точки с размером и прозрачностью ——
class Particles {
  constructor(scene, cap, { additive = false, tex } = {}) {
    this.cap = cap;
    this.n = 0;
    this.p = new Float32Array(cap * 3);
    this.v = new Float32Array(cap * 3);
    this.c = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);
    this.max = new Float32Array(cap);
    this.size0 = new Float32Array(cap);
    this.size1 = new Float32Array(cap);
    this.grav = new Float32Array(cap);
    this.a0 = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    this.posA = new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.colA = new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.sizeA = new THREE.BufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage);
    this.alphaA = new THREE.BufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posA);
    g.setAttribute('color', this.colA);
    g.setAttribute('size', this.sizeA);
    g.setAttribute('alpha', this.alphaA);
    g.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 400 } },
      vertexShader: `attribute float size; attribute float alpha; varying vec3 vC; varying float vA;
        uniform float scale;
        void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb, t.a * vA); if (gl_FragColor.a < 0.01) discard;
        #include <colorspace_fragment>
        }`,
      vertexColors: true, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mat = mat;
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }
  emit(x, y, z, vx, vy, vz, col, life, s0, s1, grav = 0, a0 = 1) {
    let i = this.n < this.cap ? this.n++ : Math.floor(Math.random() * this.cap);
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
    this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.c[i * 3] = col.r; this.c[i * 3 + 1] = col.g; this.c[i * 3 + 2] = col.b;
    this.life[i] = 0; this.max[i] = life; this.size0[i] = s0; this.size1[i] = s1; this.grav[i] = grav; this.a0[i] = a0;
  }
  update(dt) {
    let w = 0;
    const P = this.posA.array, C = this.colA.array, S = this.sizeA.array, A = this.alphaA.array;
    for (let i = 0; i < this.n; i++) {
      this.life[i] += dt;
      if (this.life[i] >= this.max[i]) continue;
      // уплотняем живые к началу
      if (w !== i) {
        for (let k = 0; k < 3; k++) { this.p[w * 3 + k] = this.p[i * 3 + k]; this.v[w * 3 + k] = this.v[i * 3 + k]; this.c[w * 3 + k] = this.c[i * 3 + k]; }
        this.life[w] = this.life[i]; this.max[w] = this.max[i]; this.size0[w] = this.size0[i]; this.size1[w] = this.size1[i]; this.grav[w] = this.grav[i]; this.a0[w] = this.a0[i];
      }
      const t = this.life[w] / this.max[w];
      this.v[w * 3 + 1] -= this.grav[w] * dt;
      const drag = Math.exp(-dt * 1.6);
      this.v[w * 3] *= drag; this.v[w * 3 + 2] *= drag;
      this.p[w * 3] += this.v[w * 3] * dt; this.p[w * 3 + 1] += this.v[w * 3 + 1] * dt; this.p[w * 3 + 2] += this.v[w * 3 + 2] * dt;
      if (this.p[w * 3 + 1] < 0.02 && this.grav[w] > 0) { this.p[w * 3 + 1] = 0.02; this.v[w * 3 + 1] *= -0.3; }
      P[w * 3] = this.p[w * 3]; P[w * 3 + 1] = this.p[w * 3 + 1]; P[w * 3 + 2] = this.p[w * 3 + 2];
      C[w * 3] = this.c[w * 3]; C[w * 3 + 1] = this.c[w * 3 + 1]; C[w * 3 + 2] = this.c[w * 3 + 2];
      S[w] = this.size0[w] + (this.size1[w] - this.size0[w]) * t;
      A[w] = this.a0[w] * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85);
      w++;
    }
    this.n = w;
    this.points.geometry.setDrawRange(0, w);
    this.posA.needsUpdate = this.colA.needsUpdate = this.sizeA.needsUpdate = this.alphaA.needsUpdate = true;
  }
  clear() { this.n = 0; this.points.geometry.setDrawRange(0, 0); }
}

export class World {
  constructor(canvas, assets) {
    this.assets = assets;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.5, 1400);
    this.camPos = new THREE.Vector3(0, 12, 18);
    this.camLook = new THREE.Vector3(0, 0, -10);
    this.shake = 0;
    this.time = 0;
    this.levelGroup = new THREE.Group();
    this.scene.add(this.levelGroup);

    this.hemi = new THREE.HemisphereLight('#fff', '#888', 1);
    this.sun = new THREE.DirectionalLight('#fff', 2);
    this.scene.add(this.hemi, this.sun, this.sun.target);
    // тень — прямоугольник вокруг табуна, едет за камерой
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -20, right: 20, top: 34, bottom: -26, near: 1, far: 140 });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.fog = new THREE.Fog('#cfdde3', 110, 560);

    this.buildSky();
    // ночь: звёзды и луна живут на небесной сфере
    {
      const N = 900, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const u = Math.random(), th = Math.random() * TAU, y = 0.08 + u * 0.92, r = Math.sqrt(1 - y * y);
        pos[i * 3] = Math.cos(th) * r * 900; pos[i * 3 + 1] = y * 900; pos[i * 3 + 2] = Math.sin(th) * r * 900;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9, depthWrite: false }));
      this.stars.renderOrder = -9;
      this.sky.add(this.stars);
      const moonTex = canvasTex(128, 128, (c, w) => {
        const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(0.32, 'rgba(250,248,235,1)'); gr.addColorStop(0.36, 'rgba(200,215,255,0.35)'); gr.addColorStop(1, 'rgba(160,180,255,0)');
        c.fillStyle = gr; c.fillRect(0, 0, w, w);
      }, { srgb: false });
      this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false, transparent: true }));
      this.moon.scale.setScalar(150);
      this.moon.renderOrder = -8;
      this.sky.add(this.moon);
      this.torchLight = new THREE.PointLight('#ffb060', 0, 40, 1.6);
      this.scene.add(this.torchLight);
      // гроза: косой дождь отрезками и молния
      const RN = 700;
      this.rainPos = new Float32Array(RN * 6);
      this.rainSeed = new Float32Array(RN * 3);
      for (let i = 0; i < RN; i++) { this.rainSeed[i * 3] = Math.random(); this.rainSeed[i * 3 + 1] = Math.random(); this.rainSeed[i * 3 + 2] = Math.random(); }
      const rg = new THREE.BufferGeometry();
      rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3).setUsage(THREE.DynamicDrawUsage));
      this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#d4deec', transparent: true, opacity: 0.55, fog: false, depthWrite: false }));
      this.rain.frustumCulled = false;
      this.rain.visible = false;
      this.scene.add(this.rain);
      this.bolt = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#f4f8ff', fog: false, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      this.bolt.frustumCulled = false;
      this.bolt.visible = false;
      this.scene.add(this.bolt);
      this.boltT = 2.5;
      this.flashK = 0;
    }
    this.buildMountains();
    this.buildGround();
    this.buildTextures();

    // реалистичные кони — свой материал с текстурами; волки — прежний
    const real = !!assets.horse.textured;
    const hm = real ? assets.horse.material : horseMaterial();
    const toy = real ? horseMaterial() : hm;
    const TK = real ? HORSE_TINT : 1;
    this.horseMat = hm;
    this.gallop = new HorsePool(assets.horse.gallop, hm, 420, this.scene, TK);
    this.idle = new HorsePool(assets.horse.idle, hm, 260, this.scene, TK);
    this.eat = new HorsePool(assets.horse.eat, hm, 120, this.scene, TK);
    // дальние кони — упрощённая модель
    this.loPools = [];
    if (assets.horse.gallopLo) {
      const gl = new HorsePool(assets.horse.gallopLo, hm, 700, this.scene, TK);
      const il = new HorsePool(assets.horse.idleLo, hm, 500, this.scene, TK);
      this.loPools.push(gl, il);
      // дальним коням тень не нужна — её почти не видно, а стоит она как ещё один табун
      for (const p of [gl, il]) for (const m of p.meshes) m.castShadow = false;
      this.gallop = new LodPool(this.gallop, gl, this.camera);
      this.idle = new LodPool(this.idle, il, this.camera);
      this.eat = new LodPool(this.eat, il, this.camera);
    }
    this.toyMat = toy;
    this.setWolf(assets.wolf);
    // красные круги под волками — видно издалека
    const ringTex = canvasTex(64, 64, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,60,40,0)'); gr.addColorStop(0.55, 'rgba(255,60,40,0.85)'); gr.addColorStop(0.75, 'rgba(255,60,40,0.5)'); gr.addColorStop(1, 'rgba(255,60,40,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }, { srgb: false });
    this.rings = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.9, 1.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, fog: false }), 90);
    this.rings.frustumCulled = false;
    this.rings.renderOrder = 2;
    this.rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.rings);
    this.leaderCol = new THREE.Color('#f4efe6');
    this.rider = this.makeRider();
    this.scene.add(this.rider);
    this.horseMat = hm; this.horseTint = TK;
    this.rear = null;
    this.setRear(assets.horse.rear);
    this.rearT = -1;
    this.boost = 0;
    {
      // следы копыт: кольцевой буфер отпечатков на дороге
      const pt = canvasTex(64, 64, (g, w) => {
        // два отпечатка подковы: тёмная дуга и вдавленная середина
        for (const [x, y] of [[20, 20], [44, 44]]) {
          g.fillStyle = 'rgba(30,18,8,0.32)'; g.beginPath(); g.ellipse(x, y, 10, 12, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(25,14,6,0.85)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y + 1, 8, Math.PI * 1.15, Math.PI * 1.85 + Math.PI, false); g.stroke();
        }
      }, { srgb: false });
      this.prints = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.95, 0.95).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: pt, transparent: true, depthWrite: false, color: '#ffffff' }), 700);
      this.prints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.prints.frustumCulled = false;
      this.prints.renderOrder = 1;
      this.prints.count = 0;
      this.printN = 0;
      this.printAcc = 0;
      this.scene.add(this.prints);
    }
    {
      const N = 90;
      this.streakSeed = Float32Array.from({ length: N * 3 }, () => Math.random());
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3).setUsage(THREE.DynamicDrawUsage));
      this.streaks = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, fog: false, depthWrite: false }));
      this.streaks.frustumCulled = false;
      this.scene.add(this.streaks);
    }
    // табунщики: два всадника по бокам табуна
    this.herders = [
      { r: this.makeRider({ hue: 205, sat: 0.55, noFlag: true, tex: 512 }), side: -1, coat: 'bay', ph: 0.61 },
      { r: this.makeRider({ hue: 100, sat: 0.45, noFlag: true, tex: 512 }), side: 1, coat: 'black', ph: 0.13 },
    ];
    for (const h of this.herders) this.scene.add(h.r);
    // конокрады: тёмные кафтаны, без знамён
    this.raiderRiders = [0, 1, 2].map(() => { const r = this.makeRider({ hue: 15, sat: 0.12, noFlag: true, tex: 512 }); this.scene.add(r); return r; });
    this.raidCol = new THREE.Color('#2b1d14');
    this.rivalRider = this.makeRider({ chapan: '#2a2440', trim: '#9aa0b0', hat: '#3a3030', flag: '#1f1f2e', hue: 232, sat: 0.38 });
    this.scene.add(this.rivalRider);
    this.rivalLeaderCol = new THREE.Color('#1c1614');
    this.goldCol = new THREE.Color('#ffc21a');
    this.eagles = this.makeEagles();
    this.intro = 0;
    this.fireworks = [];

    // тени-пятна под конями
    const shTex = canvasTex(64, 128, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.setTransform(1, 0, 0, 2, 0, 0); g.fillStyle = gr; g.fillRect(0, 0, w, h / 2);
    }, { srgb: false });
    this.shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.05, 2.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, color: '#000', opacity: 0.55 }), 900);
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 1;
    this.shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.shadows);

    this.dust = new Particles(this.scene, 1400, { tex: this.puffTex });
    this.sparks = new Particles(this.scene, 900, { tex: this.sparkTex, additive: false });

    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.v3 = new THREE.Vector3();
    this.s3 = new THREE.Vector3();
    this.col = new THREE.Color();
    this.herdSet = HERD_SETS.steppe;
    this.coatCache = {};
    this.emitAcc = 0;
  }

  // вожак на дыбы: кадры запекаются после старта (loadLate в main.js)
  setRear(frames) {
    if (!frames || this.rear) return;
    this.rear = new HorsePool(frames, this.horseMat, 2, this.scene, this.horseTint);
  }

  // волки: модель грузится уже после старта (они бывают с 4-го уровня), до неё — тёмные кони
  setWolf(wolf) {
    for (const p of [this.wolfRun, this.wolfStalk, this.wolfBite]) if (p) for (const m of p.meshes) { this.scene.remove(m); m.dispose(); }
    const wm = wolf.textured ? wolf.material : this.toyMat;
    this.wolfRun = new HorsePool(wolf.run, wm, 90, this.scene);
    this.wolfStalk = new HorsePool(wolf.stalk, wm, 90, this.scene);
    this.wolfBite = wolf.bite && !window.TABUN_PORTAL ? new HorsePool(wolf.bite, wm, 40, this.scene) : null;
    // у реалистичного волка цвет из текстуры, инстанс лишь чуть меняет оттенок
    this.wolfCols = (wolf.textured ? ['#ffffff', '#e2e2e2', '#d8d0c4', '#c8c8c8'] : ['#3e4144', '#4d4f4f', '#36332f', '#57534c']).map((c) => new THREE.Color(c));
  }

  // всадник-батыр со знаменем: чапан, калпак, древко с полотнищем
  makeRider(o = {}) {
    const g = new THREE.Group();
    const L = (c) => new THREE.MeshLambertMaterial({ color: c });
    const chapan = L(o.chapan || '#b5302a'), trim = L(o.trim || '#e3b04b'), skin = L('#d9a882'), boot = L('#2a1a10'), hat = L(o.hat || '#f2ece0'), hatBrim = L('#1c1410'), pole = L('#5a3a20');
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
    const realRider = this.assets.riderProto;
    if (realRider) g.add(makeSeatedRider(realRider, 0.78 * HORSE_H * 1.3, o.hue ?? 2, o.sat ?? 0.78, o.tex || 1024));
    if (!realRider) {
    add(new THREE.CylinderGeometry(0.17, 0.24, 0.62, 10), chapan, 0, 0.31, 0);          // корпус
    add(new THREE.TorusGeometry(0.21, 0.035, 6, 16), trim, 0, 0.12, 0, Math.PI / 2);     // пояс
    add(new THREE.SphereGeometry(0.13, 12, 10), skin, 0, 0.75, -0.02);                   // голова
    add(new THREE.ConeGeometry(0.15, 0.26, 10), hat, 0, 0.93, -0.02);                    // калпак
    add(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 12), hatBrim, 0, 0.82, -0.02);
    for (const sx of [-1, 1]) {
      add(new THREE.BoxGeometry(0.11, 0.5, 0.13), chapan, sx * 0.22, -0.12, -0.05, 0.5, 0, sx * 0.25); // ноги
      add(new THREE.BoxGeometry(0.12, 0.12, 0.2), boot, sx * 0.3, -0.36, -0.2);
      add(new THREE.BoxGeometry(0.09, 0.42, 0.1), chapan, sx * 0.23, 0.36, -0.12, -0.9, 0, sx * 0.15); // руки вперёд
    }
    }
    // знамя
    const flagTex = (() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 80;
      const x = c.getContext('2d');
      x.fillStyle = o.flag || '#c4281f'; x.fillRect(0, 0, 128, 80);
      x.fillStyle = '#e3b04b';
      x.fillRect(0, 0, 10, 80);
      for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(10, i * 16); x.lineTo(20, i * 16 + 8); x.lineTo(10, i * 16 + 16); x.fill(); }
      x.beginPath(); x.arc(70, 40, 16, 0, Math.PI * 2); x.fill();
      x.fillStyle = o.flag || '#c4281f'; x.beginPath(); x.arc(70, 40, 10, 0, Math.PI * 2); x.fill();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const poleMesh = add(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 6), pole, 0.3, 1.05, 0.1);
    if (o.noFlag) poleMesh.visible = false;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6, 8, 1).translate(0.475, 0, 0), new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide }));
    flag.position.set(0.3, 1.88, 0.1);
    g.add(flag);
    if (o.noFlag) flag.visible = false;
    g.userData.flag = flag;
    g.userData.flagBase = flag.geometry.attributes.position.array.slice();
    g.visible = false;
    return g;
  }

  // беркуты кружат высоко над табуном
  makeEagles() {
    const list = [];
    const mat = new THREE.MeshLambertMaterial({ color: '#3a2a1c', side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.2, 6).rotateX(Math.PI / 2), mat);
      const wingGeo = new THREE.BufferGeometry();
      wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.35, 2.1, 0.05, 0.1, 0, 0, 0.35, 0, 0, 0.35, 2.1, 0.05, 0.1, 2.2, 0, 0.45], 3));
      wingGeo.computeVertexNormals();
      const lw = new THREE.Mesh(wingGeo, mat), rw = new THREE.Mesh(wingGeo, mat);
      rw.scale.x = -1;
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 4).rotateX(-Math.PI / 2), mat);
      tail.position.z = 0.75;
      g.add(body, lw, rw, tail);
      g.userData = { lw, rw, r: 18 + i * 7, h: 24 + i * 5, sp: 0.22 + i * 0.05, ph: i * 2.1 };
      g.scale.setScalar(1.3);
      this.scene.add(g);
      list.push(g);
    }
    return list;
  }

  startIntro() { this.intro = 1.6; }

  // тени: на слабом устройстве выключаются первыми
  setShadows(on) {
    this.sun.castShadow = on;
    this.shadowsOn = on;
    this.shadows.material.opacity = on ? 0.28 : 0.55;
  }

  // точка седла в том кадре, который сейчас рисует пул (у реалистичного коня она запечена)
  seat(pool, phase) {
    const s = pool.frames.sock;
    if (!s) return null;
    return s[Math.floor((((phase % 1) + 1) % 1) * pool.frames.length) % pool.frames.length];
  }

  coat(key) { return this.coatCache[key] || (this.coatCache[key] = new THREE.Color(COATS[key])); }

  setHerdSet(name) { this.herdSet = HERD_SETS[name] || HERD_SETS.steppe; }

  // —— небо и горы ——
  buildSky() {
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vW;
        void main(){ float h = clamp(vW.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(h, 0.55));
          float s = max(dot(normalize(vW), normalize(sunDir)), 0.0);
          c += sunCol * (pow(s, 600.0) * 2.5 + pow(s, 12.0) * 0.25);
          if (vW.y < 0.0) c = hor;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
  }

  buildMountains() {
    // кольцо хребтов вокруг камеры — всегда на горизонте
    const segs = 220, R = 620;
    const pos = [], col = [];
    const layer = (r, hMax, seed, shade) => {
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * TAU, a1 = ((i + 1) / segs) * TAU;
        const h = (a) => {
          let y = 0;
          for (let k = 1; k <= 5; k++) y += Math.sin(a * (k * 3 + seed) + seed * k * 1.7) / k;
          // за спиной (+Z) горы ниже, впереди — выше
          const front = 0.55 + 0.45 * Math.max(0, -Math.sin(a));
          return Math.max(8, (y * 0.5 + 0.9) * hMax * front);
        };
        const p = (a, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
        const A = p(a0, -30), B = p(a1, -30), C = p(a1, h(a1)), D = p(a0, h(a0));
        pos.push(...A, ...B, ...C, ...A, ...C, ...D);
        for (let k = 0; k < 6; k++) col.push(shade, shade, shade);
      }
    };
    layer(R, 64, 1, 0.82);
    layer(R - 140, 26, 4, 1.0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    this.mountMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide, transparent: true, opacity: 1 });
    this.mountains = new THREE.Mesh(g, this.mountMat);
    this.mountains.renderOrder = -9;
    this.scene.add(this.mountains);
  }

  buildGround() {
    // своя текстура степи: светлая, с мягкими пятнами — цвет даёт тема уровня
    const grass = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#dcdcdc'; g.fillRect(0, 0, w, h);
      const blob = (x, y, r, col) => {
        for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
          const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      };
      for (let i = 0; i < 70; i++) {
        const x = hash(i * 3 + 1) * w, y = hash(i * 3 + 2) * h, r = 30 + hash(i * 3 + 3) * 110;
        const k = hash(i * 7 + 5);
        blob(x, y, r, k < 0.3 ? 'rgba(255,236,150,0.22)' : k < 0.55 ? 'rgba(110,160,60,0.16)' : k < 0.8 ? 'rgba(255,255,255,0.16)' : 'rgba(60,50,20,0.10)');
      }
      for (let i = 0; i < 5000; i++) {
        const x = hash(i + 100) * w, y = hash(i + 7000) * h;
        g.fillStyle = hash(i + 300) < 0.5 ? 'rgba(70,60,20,0.10)' : 'rgba(255,255,230,0.12)';
        g.fillRect(x, y, 1 + hash(i + 900) * 2, 2 + hash(i + 50) * 3);
      }
    });
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
    grass.repeat.set(800 / 34, 3200 / 34);
    this.groundMat = new THREE.MeshLambertMaterial({ map: grass, color: '#c8c27a' });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 3200).rotateX(-Math.PI / 2), this.groundMat);
    this.ground.receiveShadow = true;
    this.ground.position.z = -1200;
    this.scene.add(this.ground);
  }

  buildTextures() {
    this.puffTex = canvasTex(64, 64, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }, { srgb: false });
    this.sparkTex = canvasTex(32, 32, (g, w) => { g.fillStyle = '#fff'; g.fillRect(6, 6, w - 12, w - 12); }, { srgb: false });
    // трасса: утоптанная земля с отпечатками копыт, края в траву
    this.trackTex = canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = '#c9a874'; g.fillRect(0, 0, w, h);
      const R = (s) => hash(s);
      for (let i = 0; i < 2600; i++) {
        const x = R(i) * w, y = R(i + 9999) * h, r = 1 + R(i + 77) * 3;
        const l = 0.75 + R(i + 5) * 0.4;
        g.fillStyle = `rgba(${(120 * l) | 0},${(90 * l) | 0},${(55 * l) | 0},${0.15 + R(i + 3) * 0.25})`;
        g.beginPath(); g.ellipse(x, y, r, r * 1.4, 0, 0, TAU); g.fill();
      }
      for (let i = 0; i < 300; i++) {
        const x = R(i + 31) * w, y = R(i + 61) * h;
        g.strokeStyle = 'rgba(90,64,38,0.35)'; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, 4, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
      }
      // края: зелень наползает
      for (let side = 0; side < 2; side++) {
        const gr = g.createLinearGradient(side ? w : 0, 0, side ? w - 34 : 34, 0);
        gr.addColorStop(0, 'rgba(176,162,118,0.9)'); gr.addColorStop(1, 'rgba(176,162,118,0)');
        g.fillStyle = gr; g.fillRect(side ? w - 34 : 0, 0, 34, h);
      }
    }, { repeat: true });
    this.trackTex.repeat.set(1, 40);
    this.tuftTex = canvasTex(128, 128, (g, w, h) => {
      for (let i = 0; i < 26; i++) {
        const x0 = w / 2 + (hash(i) - 0.5) * 30, lean = (hash(i + 50) - 0.5) * 70;
        g.strokeStyle = '#fff';
        g.lineWidth = 1.5 + hash(i + 9) * 1.5;
        g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo(x0 + lean * 0.2, h * 0.5, x0 + lean, h * (0.05 + hash(i + 11) * 0.35)); g.stroke();
      }
    }, { srgb: false });
  }

  // —— уровень ——
  setLevel(L, run) {
    this.clearLevel();
    this.L = L;
    this.run = run;
    const T = THEME[L.theme] || THEME.day;
    this.theme = T;
    this.skyMat.uniforms.top.value.set(T.top);
    this.skyMat.uniforms.hor.value.set(T.hor);
    this.skyMat.uniforms.sunCol.value.set(T.sun);
    const sd = new THREE.Vector3(...T.sunDir).normalize();
    this.skyMat.uniforms.sunDir.value.copy(sd);
    this.sun.color.set(T.sun); this.sun.intensity = T.sunI;
    this.sunDir = sd;
    this.hemi.color.set(T.hemi[0]); this.hemi.groundColor.set(T.hemi[1]); this.hemi.intensity = T.hemi[2];
    this.scene.fog.color.set(T.fog);
    this.groundMat.color.set(T.grass).multiplyScalar(T.snow ? 1.08 : 1.12);
    // дальний хребет — голубой, ближние холмы — степные, темнее
    const far = new THREE.Color(T.mount).lerp(new THREE.Color(T.fog), 0.12);
    const near = new THREE.Color(T.grass).multiplyScalar(0.62).lerp(new THREE.Color(T.mount), 0.3);
    const cols = this.mountains.geometry.attributes.color;
    const pos = this.mountains.geometry.attributes.position;
    for (let i = 0; i < cols.count; i++) {
      const c = (i < cols.count / 2 ? far : near).clone();
      const y = pos.getY(i);
      // снег на вершинах дальнего хребта
      if (y < 0) c.lerp(new THREE.Color(T.fog), 0.5);
      cols.setXYZ(i, c.r, c.g, c.b);
    }
    cols.needsUpdate = true;

    const G = this.levelGroup;
    const total = run.ladderD0 + LADDER.length * 8 + 80;
    this.totalLen = total;
    // трасса
    const track = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 1.6, total + 60).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: this.trackTex, color: new THREE.Color(T.dirt).lerp(new THREE.Color('#ffffff'), 0.55).multiplyScalar(1.15) }));
    this.trackTex.repeat.set(1, (total + 60) / 14);
    track.position.set(0, 0.01, -(total / 2) + 30);
    track.receiveShadow = true;
    G.add(track);
    this.buildDecor(L, total);
    this.items = [];
    for (const it of run.items) {
      const o = this.buildItem(it);
      if (o) { G.add(o.root); this.items.push(o); }
    }
    this.buildFinish(run);
    this.hemiBase = T.hemi[2];
    this.rain.visible = !!T.storm;
    this.boltT = 2 + Math.random() * 2;
    this.flashK = 0;
    // ночь: звёзды, луна, факелы вдоль дороги
    const night = !!T.night;
    this.stars.visible = night;
    this.moon.visible = night;
    if (night) this.moon.position.copy(sd).multiplyScalar(820);
    this.torchLight.intensity = night ? 60 : 0;
    this.torches = null;
    if (night) {
      const n = Math.floor(total / 18) * 2;
      const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 2.3, 6).translate(0, 1.15, 0), new THREE.MeshLambertMaterial({ color: '#4a3220' }), n);
      const fp = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const x = (i % 2 ? 1 : -1) * (HALF + 1.3), z = -(i >> 1) * 18 - 8;
        this.m4.makeTranslation(x, 0, z);
        pole.setMatrixAt(i, this.m4);
        fp[i * 3] = x; fp[i * 3 + 1] = 2.45; fp[i * 3 + 2] = z;
      }
      G.add(pole);
      const fg = new THREE.BufferGeometry();
      fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
      const flameTex = canvasTex(64, 64, (c, w) => {
        const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.25, 'rgba(255,190,80,0.9)'); gr.addColorStop(0.6, 'rgba(255,110,30,0.25)'); gr.addColorStop(1, 'rgba(255,80,0,0)');
        c.fillStyle = gr; c.fillRect(0, 0, w, w);
      }, { srgb: false });
      flameTex.userData.own = true;
      this.torches = new THREE.Points(fg, new THREE.PointsMaterial({ map: flameTex, size: 1.6, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      G.add(this.torches);
    }
    // валуны
    this.rockObjs = new Map();
    this.dust.clear(); this.sparks.clear();
    this.rearT = -1;
    this.boost = 0;
    this._dc = null; // пыль под цвет дороги этого уровня
    if (this.prints) { this.prints.count = 0; this.printN = 0; }
    this.fireworks = [];
    this.camPos.set(0, 9, 14);
    this.camLook.set(0, 0, -12);
    this.labels = [];
  }

  clearLevel() {
    const G = this.levelGroup;
    G.traverse((o) => {
      if (o.isInstancedMesh) o.dispose(); // буферы матриц и цветов экземпляров — иначе утечка видеопамяти
      if (o.geometry && !o.userData.shared) o.geometry.dispose();
      if (o.material && !o.userData.sharedMat) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) { if (m.map && m.map.userData?.own) m.map.dispose(); m.dispose(); }
      }
    });
    G.clear();
  }

  buildDecor(L, total) {
    const G = this.levelGroup;
    const R = (i) => hash(i * 977 + L.n * 131);
    // ковыль — пучки крест-накрест
    const tuftGeo = new THREE.PlaneGeometry(1.1, 0.9).translate(0, 0.45, 0);
    const tg2 = tuftGeo.clone().rotateY(Math.PI / 2);
    const merged = mergeTwo(tuftGeo, tg2);
    const tuftMat = new THREE.MeshBasicMaterial({ alphaMap: this.tuftTex, alphaTest: 0.35, side: THREE.DoubleSide, color: '#e6e0c8' });
    this.windU = this.windU || { value: 0 };
    const windU = this.windU;
    tuftMat.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = windU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
  { float hgt = max(position.y, 0.0);
    vec2 wp = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
    float w = sin(uWind * 1.6 + wp.x * 0.25 + wp.y * 0.18) * 0.6 + sin(uWind * 3.1 + wp.y * 0.5) * 0.25;
    transformed.x += w * 0.28 * hgt; transformed.z += w * 0.12 * hgt; }`);
    };
    const N = 1300;
    const gc = this.theme.snow ? new THREE.Color('#b9b090') : new THREE.Color(this.theme.grass);
    const tc = [gc.clone().multiplyScalar(1.2), gc.clone().lerp(new THREE.Color('#f0e2a0'), 0.45), gc.clone().lerp(new THREE.Color('#e8d890'), 0.25), gc.clone().multiplyScalar(0.85), gc.clone().lerp(new THREE.Color('#fff4cc'), 0.6)];
    const tufts = new THREE.InstancedMesh(merged, tuftMat, N);
    let k = 0;
    for (let i = 0; i < N; i++) {
      const side = R(i) < 0.5 ? -1 : 1;
      const edge = R(i + 1) < 0.35;
      const x = side * (edge ? HALF + 0.9 + R(i + 2) * 2.5 : HALF + 3 + Math.pow(R(i + 2), 1.6) * 70);
      const z = 20 - R(i + 3) * (total + 120);
      const s = 0.8 + R(i + 4) * 1.0;
      this.m4.compose(this.v3.set(x, 0, z), this.q.setFromEuler(this.e.set(0, R(i + 5) * TAU, 0)), this.s3.set(s, s * (0.8 + R(i + 6) * 0.6), s));
      tufts.setColorAt(k, tc[Math.floor(R(i + 8) * tc.length)]);
      tufts.setMatrixAt(k++, this.m4);
    }
    tufts.count = k;
    G.add(tufts);
    // кусты и камни
    const place = (src, n, scale, seed, minX, maxX) => {
      if (!src) return; // модель не загрузилась — без неё
      const meshes = [];
      src.traverse((o) => { if (o.isMesh) meshes.push(o); });
      for (const m of meshes) {
        const inst = new THREE.InstancedMesh(m.geometry, m.material, n);
        inst.userData.shared = true; inst.userData.sharedMat = true;
        for (let i = 0; i < n; i++) {
          const side = R(seed + i) < 0.5 ? -1 : 1;
          const x = side * (minX + R(seed + i + 7) * (maxX - minX));
          const z = 10 - R(seed + i + 13) * (total + 100);
          const s = scale * (0.6 + R(seed + i + 19) * 0.9);
          this.m4.compose(this.v3.set(x, 0, z), this.q.setFromEuler(this.e.set(0, R(seed + i + 23) * TAU, 0)), this.s3.set(s, s, s));
          inst.setMatrixAt(i, this.m4.multiply(m.matrixWorld));
        }
        G.add(inst);
      }
    };
    place(this.assets.bush, 70, this.assets.bushScale, 1000, HALF + 2.5, 45);
    place(this.assets.rock, 45, this.assets.rockScale * 0.9, 2000, HALF + 3, 60);
    // юрты аулов вдоль дороги
    for (let i = 0; i < Math.floor(total / 140) + 1; i++) {
      const z = -60 - i * 140 - R(i + 300) * 60;
      const side = R(i + 301) < 0.5 ? -1 : 1;
      const n = 2 + Math.floor(R(i + 302) * 3);
      for (let j = 0; j < n; j++) {
        const y = this.makeYurt(R(i * 10 + j + 303));
        y.position.set(side * (22 + R(i * 10 + j + 304) * 28), 0, z - j * 9 + R(i + j) * 5);
        y.rotation.y = R(i * 7 + j) * TAU;
        G.add(y);
      }
    }
  }

  makeYurt(r = 0.5) {
    const g = new THREE.Group();
    if (!this.yurtParts) {
      const felt = canvasTex(256, 64, (c, w, h) => {
        c.fillStyle = '#efe6d2'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#b5302a'; c.fillRect(0, 10, w, 10);
        c.fillStyle = '#e3b04b';
        for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x, 20); c.lineTo(x + 8, 28); c.lineTo(x + 16, 20); c.fill(); }
        c.fillStyle = 'rgba(120,100,70,0.25)'; c.fillRect(0, h - 8, w, 8);
      });
      felt.wrapS = THREE.RepeatWrapping; felt.repeat.set(3, 1);
      const wall = new THREE.MeshLambertMaterial({ map: felt });
      const roof = new THREE.MeshLambertMaterial({ color: '#e8dcc4' });
      const door = new THREE.MeshLambertMaterial({ color: '#a2452a' });
      this.yurtParts = {
        wallG: new THREE.CylinderGeometry(2.6, 2.6, 1.7, 20, 1, true).translate(0, 0.85, 0),
        roofG: new THREE.ConeGeometry(2.75, 1.5, 20).translate(0, 2.45, 0),
        topG: new THREE.CylinderGeometry(0.5, 0.5, 0.18, 12).translate(0, 3.15, 0),
        doorG: new THREE.BoxGeometry(0.9, 1.3, 0.12).translate(0, 0.65, 2.58),
        wall, roof, door,
      };
    }
    const P = this.yurtParts;
    for (const [geo, mat] of [[P.wallG, P.wall], [P.roofG, P.roof], [P.topG, P.door], [P.doorG, P.door]]) {
      const m = new THREE.Mesh(geo, mat);
      m.userData.shared = m.userData.sharedMat = true;
      g.add(m);
    }
    const s = 0.85 + r * 0.4;
    g.scale.setScalar(s);
    return g;
  }

  // свой аул у старта: юрта за каждые три улучшения
  setAul(n) {
    if (this.aul) { this.levelGroup.remove(this.aul); this.aul.traverse((o) => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); }
    const g = new THREE.Group();
    const spots = [[-11, 4], [-17, -2], [-13, -10], [-21, 7], [-23, -7], [-18, 15], [-28, 0], [-27, 12], [-31, -10], [-12, 16], [-35, 6], [-34, -18]];
    for (let i = 0; i < Math.min(n, spots.length); i++) {
      const y = this.makeYurt(0.3 + (i % 3) * 0.3);
      y.position.set(spots[i][0], 0, spots[i][1]);
      y.rotation.y = 0.6 + i * 0.9;
      g.add(y);
    }
    // коновязь
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.4, 6).translate(0, 0.7, 0), this.woodMat || (this.woodMat = new THREE.MeshLambertMaterial({ color: '#7a5030' })));
    post.position.set(-8, 0, 0);
    g.add(post);
    this.aul = g;
    this.levelGroup.add(g);
  }

  gateTex(g, w, h) {
    const good = isGood(g);
    return canvasTex(512, 256, (c, W, H) => {
      const col = g.op === '?' ? ['rgba(170,90,255,0.9)', 'rgba(110,40,210,0.9)'] : g.op === '$' ? ['rgba(255,206,60,0.92)', 'rgba(230,140,10,0.92)'] : good ? ['rgba(70,175,255,0.84)', 'rgba(16,96,226,0.84)'] : ['rgba(255,96,76,0.84)', 'rgba(200,28,28,0.84)'];
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
      roundRect(c, 6, 6, W - 12, H - 12, 26); c.fillStyle = gr; c.fill();
      c.lineWidth = 10; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.stroke();
      // орнамент-уголки
      c.fillStyle = 'rgba(255,255,255,0.55)';
      for (const [x, y, sx, sy] of [[28, 28, 1, 1], [W - 28, 28, -1, 1], [28, H - 28, 1, -1], [W - 28, H - 28, -1, -1]]) {
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + 34 * sx, y); c.quadraticCurveTo(x + 10 * sx, y + 10 * sy, x, y + 34 * sy); c.fill();
      }
      const txt = opText(g);
      c.font = `400 ${txt.length > 5 ? 104 : 150}px 'Russo One', 'Rubik', sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 14; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.strokeText(txt, W / 2, H / 2 + 8);
      c.fillStyle = '#fff'; c.fillText(txt, W / 2, H / 2 + 6);
    });
  }

  buildItem(it) {
    const root = new THREE.Group();
    const o = { it, root };
    if (it.type === 'gate') {
      root.position.z = -it.d;
      const postMat = this.postMat || (this.postMat = new THREE.MeshLambertMaterial({ color: '#6b4226' }));
      const capMat = this.capMat || (this.capMat = new THREE.MeshLambertMaterial({ color: '#e3b04b' }));
      const postG = this.postG || (this.postG = new THREE.CylinderGeometry(0.16, 0.2, 3.4, 8).translate(0, 1.7, 0));
      const capG = this.capG || (this.capG = new THREE.ConeGeometry(0.3, 0.5, 8).translate(0, 3.65, 0));
      const xs = it.full ? [-HALF - 0.1, HALF + 0.1] : [-HALF - 0.1, 0, HALF + 0.1];
      for (const x of xs) {
        const p = new THREE.Mesh(postG, postMat); p.position.x = x; p.userData.shared = p.userData.sharedMat = true;
        const c = new THREE.Mesh(capG, capMat); c.position.x = x; c.userData.shared = c.userData.sharedMat = true;
        root.add(p, c);
      }
      o.panels = {};
      const sides = it.full ? [['full', it.full, 0, HALF * 2]] : [['left', it.left, -HALF / 2, HALF], ['right', it.right, HALF / 2, HALF]];
      for (const [k, g, x, w] of sides) {
        const tex = this.gateTex(g);
        tex.userData.own = true;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.35, (w - 0.35) / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        m.position.set(x, 0.45 + (w - 0.35) / 4 + (it.full ? -0.6 : 0), 0);
        m.renderOrder = 3;
        root.add(m);
        o.panels[k] = { mesh: m, g, w, x };
      }
    } else if (it.type === 'whip') {
      // золотая камча: рукоять, плетёный хвост, кольцо и столб света
      const gold = new THREE.MeshStandardMaterial({ color: '#ffc21a', emissive: '#a86a00', emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.6 });
      const wood = new THREE.MeshStandardMaterial({ color: '#6b3a1a', roughness: 0.7 });
      const g = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.55, 10), wood);
      handle.position.y = -0.1;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.18, 0), new THREE.Vector3(0.25, 0.5, 0), new THREE.Vector3(0.05, 0.85, 0.1), new THREE.Vector3(-0.3, 1.05, 0), new THREE.Vector3(-0.15, 1.3, -0.1)]);
      const lash = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.035, 6), gold);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 16), gold);
      ring.position.y = 0.19; ring.rotation.x = Math.PI / 2;
      g.add(handle, lash, ring);
      g.scale.setScalar(1.6);
      g.position.set(it.x, 1.0, -it.d);
      root.add(g);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 7, 20, 1, true).translate(0, 3.5, 0), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      beam.position.set(it.x, 0, -it.d);
      root.add(beam);
      o.whip = g; o.beam = beam;
    } else if (it.type === 'pit') {
      const w = it.x1 - it.x0, l = it.d1 - it.d0;
      const seed = it.i * 31 + 7;
      const tex = canvasTex(128, 256, (c, W, H) => {
        // рваный контур оврага
        const pts = [];
        const N = 40;
        for (let k = 0; k < N; k++) {
          const a = (k / N) * TAU;
          const ex = Math.cos(a), ey = Math.sin(a);
          // прямоугольник со скруглением + шум
          const sq = 1 / Math.max(Math.abs(ex), Math.abs(ey) * 1.0001);
          const r = Math.min(sq, 1.25) * (0.86 + hash(seed + k) * 0.1);
          pts.push([W / 2 + ex * r * W * 0.46, H / 2 + ey * r * H * 0.47]);
        }
        const path = (sc) => { c.beginPath(); pts.forEach(([x, y], k) => { const px = W / 2 + (x - W / 2) * sc, py = H / 2 + (y - H / 2) * sc; k ? c.lineTo(px, py) : c.moveTo(px, py); }); c.closePath(); };
        path(1); c.fillStyle = '#8a6438'; c.fill();
        path(0.9); c.fillStyle = '#5a3c22'; c.fill();
        path(0.78); c.fillStyle = '#2e1d10'; c.fill();
        path(0.6); c.fillStyle = '#140b05'; c.fill();
        // тени и трещины на склонах
        c.strokeStyle = 'rgba(20,10,4,0.5)'; c.lineWidth = 2;
        for (let k = 0; k < 14; k++) { const [x, y] = pts[(k * 3) % N]; c.beginPath(); c.moveTo(x, y); c.lineTo(W / 2 + (x - W / 2) * 0.7, H / 2 + (y - H / 2) * 0.7); c.stroke(); }
      }, { srgb: true });
      tex.userData.own = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.8, l + 1.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      m.renderOrder = 1;
      m.position.set((it.x0 + it.x1) / 2, 0.03, -(it.d0 + it.d1) / 2);
      root.add(m);
      // камни по краю
      const rk = this.assets.rock;
      for (let i = 0; i < Math.round((w + l) * 0.6); i++) {
        const t = hash(i * 13 + it.i * 7);
        const onLong = hash(i * 17 + 3) < l / (w + l);
        const x = onLong ? (hash(i + 5) < 0.5 ? it.x0 : it.x1) : it.x0 + t * w;
        const z = onLong ? it.d0 + t * l : hash(i + 9) < 0.5 ? it.d0 : it.d1;
        const r = rk.clone();
        r.scale.setScalar(this.assets.rockScale * (0.22 + hash(i + 33) * 0.25));
        r.position.set(x, 0, -z);
        r.rotation.y = hash(i + 44) * TAU;
        r.traverse((q) => { q.userData.shared = q.userData.sharedMat = true; });
        root.add(r);
      }
    } else if (it.type === 'fence') {
      root.position.z = -it.d;
      const wood = this.woodMat || (this.woodMat = new THREE.MeshLambertMaterial({ color: '#7a5030' }));
      const post = this.fPostG || (this.fPostG = new THREE.BoxGeometry(0.18, 1.5, 0.18).translate(0, 0.75, 0));
      const seg = (a, b) => {
        if (b - a < 0.2) return;
        for (let x = a; x <= b + 0.01; x += Math.max(0.5, (b - a) / Math.ceil((b - a) / 1.6))) {
          const p = new THREE.Mesh(post, wood); p.position.x = x; p.userData.shared = p.userData.sharedMat = true; root.add(p);
        }
        for (const y of [0.55, 1.15]) {
          const r = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.14, 0.1), wood); r.userData.sharedMat = true;
          r.position.set((a + b) / 2, y, 0); root.add(r);
        }
      };
      seg(-HALF - 2, it.g0);
      seg(it.g1, HALF + 2);
      // флажки у прохода
      for (const x of [it.g0, it.g1]) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 4).translate(0, 1.85, 0), this.capMat || new THREE.MeshLambertMaterial({ color: '#e3b04b' }));
        f.position.x = x; root.add(f);
      }
    } else if (it.type === 'river') {
      const l = it.d1 - it.d0;
      const mat = new THREE.ShaderMaterial({
        uniforms: { t: { value: 0 }, c1: { value: new THREE.Color('#3f88b8') }, c2: { value: new THREE.Color('#9fd3ea') } },
        vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `uniform float t; uniform vec3 c1; uniform vec3 c2; varying vec2 vU;
          void main(){ float w = sin(vU.x*60.0 + t*2.0 + sin(vU.y*20.0+t)*2.0)*0.5+0.5; float e = smoothstep(0.0,0.08,vU.y)*smoothstep(1.0,0.92,vU.y);
          vec3 c = mix(c1, c2, pow(w, 6.0)*0.8); c = mix(vec3(0.35,0.25,0.12), c, e); gl_FragColor = vec4(c, 0.92);
          #include <colorspace_fragment>
          }`,
        transparent: true,
      });
      o.mat = mat;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(260, l).rotateX(-Math.PI / 2), mat);
      m.position.set(0, 0.04, -(it.d0 + it.d1) / 2);
      root.add(m);
    } else return null;
    return o;
  }

  buildFinish(run) {
    const G = this.levelGroup;
    // линия «байги»
    const lineTex = canvasTex(256, 32, (c, w, h) => {
      for (let x = 0; x < w; x += 16) for (let y = 0; y < h; y += 16) { c.fillStyle = ((x + y) / 16) % 2 ? '#fff' : '#b5302a'; c.fillRect(x, y, 16, 16); }
    });
    lineTex.userData.own = true;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 1.4).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: lineTex }));
    line.position.set(0, 0.04, -run.finishD);
    G.add(line);
    // ступени-арки ×1…×5
    this.arches = [];
    const hueA = new THREE.Color('#3fbf5a'), hueB = new THREE.Color('#ff3b30'), mid = new THREE.Color('#ffc21a');
    for (let i = 0; i < LADDER.length; i++) {
      const d = run.ladderD0 + i * 8;
      const t = i / (LADDER.length - 1);
      const c = t < 0.5 ? hueA.clone().lerp(mid, t * 2) : mid.clone().lerp(hueB, (t - 0.5) * 2);
      const css = '#' + c.getHexString();
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 7.6).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: 0.55 }));
      stripe.position.set(0, 0.03 + i * 0.002, -(d + 3.8));
      G.add(stripe);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(HALF + 0.2, 0.22, 8, 40, Math.PI), new THREE.MeshLambertMaterial({ color: c }));
      arch.scale.y = 0.62;
      arch.position.set(0, 0, -d);
      G.add(arch);
      const tex = canvasTex(256, 128, (cx, w, h) => {
        roundRect(cx, 6, 6, w - 12, h - 12, 22); cx.fillStyle = css; cx.fill();
        cx.lineWidth = 8; cx.strokeStyle = '#fff'; cx.stroke();
        cx.font = "400 78px 'Russo One', sans-serif"; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillStyle = '#fff'; cx.fillText('×' + LADDER[i], w / 2, h / 2 + 4);
      });
      tex.userData.own = true;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false }));
      sign.position.set(0, (HALF + 0.2) * 0.62 + 0.9, -d);
      G.add(sign);
      this.arches.push({ arch, sign, stripe, d });
    }
    // ставка соперника — большая юрта баая
    const y = this.makeYurt(1);
    y.scale.setScalar(1.6);
    y.position.set(HALF + 7, 0, -(run.rival.d + 6));
    G.add(y);
    const end = this.makeYurt(0.4);
    end.scale.setScalar(2.2);
    end.position.set(0, 0, -(run.ladderD0 + LADDER.length * 8 + 14));
    G.add(end);
  }

  // —— кадр ——
  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.dust.mat.uniforms.scale.value = h * this.renderer.getPixelRatio() * 0.9;
    this.sparks.mat.uniforms.scale.value = h * this.renderer.getPixelRatio() * 0.9;
    this.w = w; this.h = h;
  }

  setPixelRatio(r) {
    this.pixelRatio = r;
    this.renderer.setPixelRatio(r);
    if (this.w) this.resize(this.w, this.h);
  }

  horseColor(b, kind) {
    if (kind === 'wild') return this.coat(WILD_COATS[b.coat % WILD_COATS.length]);
    if (kind === 'rival') return this.coat(RIVAL_COATS[b.id % RIVAL_COATS.length]);
    return this.coat(this.herdSet[b.coat % this.herdSet.length]);
  }

  update(run, dt, menu = false) {
    this.time += dt;
    const t = this.time;
    const m4 = this.m4, q = this.q, e = this.e, v = this.v3, s = this.s3;
    this.gallop.begin(); this.idle.begin(); this.eat.begin(); this.wolfRun.begin(); this.wolfStalk.begin();
    this.rear?.begin(); this.wolfBite?.begin();
    for (const p of this.loPools) p.begin();
    let sh = 0;
    const shadow = (x, z, sc = 1) => {
      if (sh >= 900) return;
      m4.compose(v.set(x, 0.025, z), q.identity(), s.set(sc, 1, sc));
      this.shadows.setMatrixAt(sh++, m4);
    };
    const gallopRate = menu ? 0 : 1.45;
    const running = run.state === 'run' || run.state === 'clash' || run.state === 'ladder';
    // табун
    for (const b of run.bodies) {
      const sc = (0.92 + (b.coat % 17) / 100) * (b.spawn < 1 ? easeOutBack(b.spawn) : 1);
      const yaw = clamp(-(run.cx + b.sx - b.x) * 0.18, -0.55, 0.55);
      const bob = 0;
      m4.compose(v.set(b.x, bob, -b.d), q.setFromEuler(e.set(0, yaw, 0)), s.set(sc, sc, sc));
      const col = this.horseColor(b, 'herd');
      if (running && !menu) this.gallop.add(b.phase + t * gallopRate, m4, col);
      else this.idle.add(b.phase + t * 0.4, m4, col);
      shadow(b.x, -b.d, sc);
    }
    // вожак-ақбоз: впереди табуна, крупнее всех
    const win = run.state === 'win';
    if ((run.count > 0 || win) && (running || menu || win) && run.state !== 'lose') {
      const sh2 = herdShape(Math.max(1, Math.min(run.count, run.cap)));
      // в схватке вожаки расходятся по сторонам, а не стоят друг в друге
      this.clashOff = (this.clashOff || 0) + ((run.state === 'clash' ? 1 : 0) - (this.clashOff || 0)) * Math.min(1, dt * 3);
      const lx = run.cx * (1 - this.clashOff) - 2.4 * this.clashOff;
      const ld = run.d + sh2.b + 1.9;
      if (this.rear) {
        if (menu && this.rearT < 0 && Math.random() < dt * 0.1) this.rearT = 0;
        if (this.rearT >= 0) { this.rearT += dt; if (this.rearT >= this.rear.frames.duration * 0.98) this.rearT = -1; }
      }
      const rearing = !!this.rear && this.rearT >= 0;
      const gal = running && !menu && !rearing;
      const lp = rearing ? this.rear : gal ? this.gallop : this.idle;
      const lph = rearing ? this.rearT / this.rear.frames.duration : gal ? 0.37 + t * gallopRate : 0.2 + t * 0.4;
      m4.compose(v.set(lx, 0, -ld), q.setFromEuler(e.set(0, 0, 0)), s.set(1.3, 1.3, 1.3));
      lp.add(lph, m4, this.leaderCol);
      shadow(lx, -ld, 1.3);
      const R = this.rider;
      R.visible = true;
      const sk = this.seat(lp, lph);
      if (sk) {
        R.position.set(lx + sk.x * 1.3, sk.y * 1.3, -ld + sk.z * 1.3);
        // на дыбах седло поднимается — всадник откидывается назад вместе со спиной коня
        const base = this.idle.frames.sock?.[0]?.y ?? sk.y;
        R.rotation.set(rearing ? Math.min(0.95, Math.max(0, (sk.y - base) * 1.6)) : 0, 0, 0);
      }
      else {
        const bob = gal ? Math.abs(Math.sin((0.37 + t * gallopRate) * Math.PI * 2 / 1)) * 0.09 : 0;
        R.position.set(lx, 1.55 + bob, -ld + 0.12);
        R.rotation.set(gal ? -0.12 : 0, 0, 0);
      }
      // полотнище полощется
      const f = R.userData.flag, base = R.userData.flagBase, arr = f.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) { const x = base[i]; arr[i + 2] = base[i + 2] + Math.sin(t * (gal ? 11 : 4) - x * 5) * x * 0.22; }
      f.geometry.attributes.position.needsUpdate = true;
      f.rotation.y = gal ? Math.PI * 0.5 : 0.4;
    } else if (this.rider) this.rider.visible = false;
    // табунщики скачут по краям табуна, чуть позади вожака
    for (const h of this.herders) {
      const show = run.count > 0 && run.state !== 'lose';
      h.r.visible = show;
      if (!show) continue;
      const sh3 = herdShape(Math.max(1, Math.min(run.count, run.cap)));
      const wide = run.state === 'clash' || run.state === 'ladder' || run.state === 'win';
      // табунщики скачут по обочине: на дороге они проезжали бы сквозь изгороди и овраги
      const hx = menu ? h.side * 2.6 : h.side * (wide ? HALF + 2.6 : HALF + 0.9) + run.cx * 0.12;
      const hd = run.d + (menu ? -1.5 - (h.side > 0 ? 1.2 : 0) : sh3.b * 0.35 - (h.side > 0 ? 1.6 : 0));
      const gal = running && !menu && run.state !== 'win';
      const hp = gal ? this.gallop : this.idle;
      const hph = gal ? h.ph + t * gallopRate : h.ph + t * 0.4;
      m4.compose(v.set(hx, 0, -hd), q.setFromEuler(e.set(0, 0, 0)), s.set(1.08, 1.08, 1.08));
      hp.add(hph, m4, this.coat(h.coat));
      shadow(hx, -hd, 1.08);
      const sk = this.seat(hp, hph);
      if (sk) h.r.position.set(hx + sk.x * 1.08, sk.y * 1.08, -hd + sk.z * 1.08);
      else h.r.position.set(hx, 1.3, -hd);
      h.r.scale.setScalar(1.08 / 1.3);
    }
    // конокрады проносятся поперёк дороги
    this.raiderRiders.forEach((r) => { r.visible = false; });
    (run.raiders || []).forEach((rd, k) => {
      const yaw = -rd.dir * Math.PI / 2;
      m4.compose(v.set(rd.x, 0, -rd.d), q.setFromEuler(e.set(0, yaw, 0)), s.set(1.1, 1.1, 1.1));
      const ph = rd.phase + t * 1.6;
      this.gallop.add(ph, m4, this.raidCol);
      shadow(rd.x, -rd.d, 1.1);
      const R = this.raiderRiders[k % 3];
      if (!R) return;
      R.visible = true;
      const sk = this.seat(this.gallop, ph);
      const cs = Math.cos(yaw), sn = Math.sin(yaw);
      if (sk) R.position.set(rd.x + (sk.x * cs + sk.z * sn) * 1.1, sk.y * 1.1, -rd.d + (-sk.x * sn + sk.z * cs) * 1.1);
      else R.position.set(rd.x, 1.4, -rd.d);
      R.rotation.set(0, yaw, 0);
      R.scale.setScalar(1.1 / 1.3);
      if (Math.random() < dt * 25) this.dust.emit(rd.x - rd.dir * 0.8, 0.3, -rd.d, -rd.dir * 2, 1, 0, this.dustColor(), 1, 0.8, 2.6, 0, 0.7);
    });
    // волки
    let rc = 0;
    for (const w of run.wolves || []) {
      const pulse = 1 + Math.sin(t * 6 + w.id) * 0.08;
      m4.compose(v.set(w.x, 0.03, -w.d), q.identity(), s.set(pulse, 1, pulse));
      this.rings.setMatrixAt(rc++, m4);
      const yaw = w.run ? Math.atan2(-w.vx, w.vd) : Math.PI;
      m4.compose(v.set(w.x, 0, -w.d), q.setFromEuler(e.set(0, yaw, 0)), s.set(1, 1, 1));
      const col = this.wolfCols[w.id % this.wolfCols.length];
      if (w.run && this.wolfBite && w.near < 3.2) this.wolfBite.add(Math.min(0.95, 1 - w.near / 3.2), m4, col);
      else if (w.run) this.wolfRun.add(w.phase + t * 1.9, m4, col);
      else this.wolfStalk.add(w.phase + t * 0.5, m4, col);
      shadow(w.x, -w.d, 0.6);
    }
    this.rings.count = rc;
    this.rings.instanceMatrix.needsUpdate = true;
    // дикие
    for (const w of run.wild) {
      m4.compose(v.set(w.x, 0, -w.d), q.setFromEuler(e.set(0, w.yaw + Math.PI, 0)), s.set(1, 1, 1));
      if (w.golden) {
        m4.compose(v.set(w.x, 0, -w.d), q.setFromEuler(e.set(0, w.yaw + Math.PI, 0)), s.set(1.45, 1.45, 1.45));
        this.idle.add(w.phase + t * 0.5, m4, this.goldCol);
        shadow(w.x, -w.d, 2.2);
        if (Math.random() < dt * 40) this.sparks.emit(w.x + (Math.random() - 0.5) * 1.6, 0.6 + Math.random() * 2, -w.d + (Math.random() - 0.5) * 2, 0, 1.2, 0, this.goldCol, 0.9, 0.22, 0.05, -0.5, 1);
      } else (w.id % 3 === 0 ? this.idle : this.eat).add(w.phase + t * 0.35, m4, this.horseColor(w, 'wild'));
      shadow(w.x, -w.d);
    }
    // соперник
    const rv = run.rival;
    const rivalRun = run.state === 'clash';
    for (const b of rv.bodies) {
      m4.compose(v.set(b.x, 0, -b.d), q.setFromEuler(e.set(0, Math.PI, 0)), s.set(1, 1, 1));
      if (rivalRun) this.gallop.add(b.phase + t * gallopRate, m4, this.horseColor(b, 'rival'));
      else this.idle.add(b.phase + t * 0.4, m4, this.horseColor(b, 'rival'));
      shadow(b.x, -b.d);
    }
    // вожак баая: вороной, всадник в тёмном
    const RR = this.rivalRider;
    if (rv.count > 0 && rv.d - run.d < 140 && run.state !== 'win' && run.state !== 'ladder') {
      const rsh = herdShape(Math.max(1, Math.min(rv.count, run.cap)));
      const rd = rv.d - rsh.b - 2;
      const sc = this.L?.boss ? 1.45 : 1.3;
      m4.compose(v.set(2.4 * (this.clashOff || 0), 0, -rd), q.setFromEuler(e.set(0, Math.PI, 0)), s.set(sc, sc, sc));
      if (rivalRun) this.gallop.add(0.11 + t * gallopRate, m4, this.rivalLeaderCol);
      else this.idle.add(0.6 + t * 0.4, m4, this.rivalLeaderCol);
      const rx = 2.4 * (this.clashOff || 0);
      shadow(rx, -rd, sc);
      RR.visible = true;
      RR.scale.setScalar(sc / 1.3);
      const rsk = this.seat(rivalRun ? this.gallop : this.idle, rivalRun ? 0.11 + t * gallopRate : 0.6 + t * 0.4);
      if (rsk) { RR.position.set(rx - rsk.x * sc, rsk.y * sc, -rd - rsk.z * sc); RR.rotation.set(0, Math.PI, 0); }
      else {
        RR.position.set(rx, 1.55 * (sc / 1.3) + (rivalRun ? Math.abs(Math.sin((0.11 + t * gallopRate) * Math.PI * 2)) * 0.09 : 0), -rd - 0.12);
        RR.rotation.set(rivalRun ? 0.12 : 0, Math.PI, 0);
      }
      const f = RR.userData.flag, base = RR.userData.flagBase, arr = f.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) { const x = base[i]; arr[i + 2] = base[i + 2] + Math.sin(t * (rivalRun ? 11 : 3) - x * 5) * x * 0.2; }
      f.geometry.attributes.position.needsUpdate = true;
    } else RR.visible = false;
    // призраки
    for (const g of run.ghosts) {
      let col = g.rival ? this.coat('black') : this.coat(this.herdSet[g.coat % this.herdSet.length]);
      if (g.kind === 'stay') {
        m4.compose(v.set(g.x, 0, -g.d), q.setFromEuler(e.set(0, Math.PI + (g.phase - 0.5) * 0.8, 0)), s.set(1, 1, 1));
        this.idle.add(g.phase + t * 0.4, m4, col);
        shadow(g.x, -g.d);
        continue;
      }
      if (g.kind === 'stolen') {
        const fade = g.t > 1.1 ? Math.max(0, 1 - (g.t - 1.1) / 0.5) : 1;
        if (fade <= 0) continue;
        const k = Math.min(1, g.t * 4); // встаёт в связку плавно, без прыжка
        m4.compose(v.set(g.x - Math.sign(g.vx) * (1.6 + (g.off || 1) * 1.4) * k, 0, -g.d + ((g.off || 1) - 2) * 0.9 * k), q.setFromEuler(e.set(0, -Math.sign(g.vx) * Math.PI / 2, 0)), s.set(fade, fade, fade));
        this.gallop.add(g.phase + t * 1.6, m4, col);
        continue;
      }
      if (g.kind === 'poof') {
        const k = 1 - g.t / 0.35;
        if (k <= 0) continue;
        m4.compose(v.set(g.x, 0, -g.d), q.identity(), s.set(k, k, k));
        this.gallop.add(g.phase, m4, col);
        continue;
      }
      const fade = g.t > 1.1 ? Math.max(0, 1 - (g.t - 1.1) / 0.5) : 1;
      if (fade <= 0) continue;
      if (g.kind === 'fall') m4.compose(v.set(g.x, g.y, -g.d), q.setFromEuler(e.set(-g.rot * 0.6, 0, g.rot * 0.2)), s.set(fade, fade, fade));
      else m4.compose(v.set(g.x, g.y, -g.d), q.setFromEuler(e.set(g.rot * 0.7, 0, g.rot * (g.vx >= 0 ? -1 : 1))), s.set(fade, fade, fade));
      this.gallop.add(g.phase + g.t * 0.2, m4, col);
      if (g.y < 1) shadow(g.x, -g.d, fade);
    }
    this.gallop.end(); this.idle.end(); this.eat.end(); this.wolfRun.end(); this.wolfStalk.end();
    this.rear?.end(); this.wolfBite?.end();
    for (const p of this.loPools) p.end();
    this.shadows.count = sh;
    this.shadows.instanceMatrix.needsUpdate = true;

    // ворота и прочее
    for (const o of this.items) {
      const it = o.it;
      if (it.type === 'gate' && it.done && !o.broken) {
        o.broken = true;
        for (const [k, p] of Object.entries(o.panels)) {
          if (p.g === it.hitOp) { p.mesh.visible = false; this.burstPanel(p, it); }
          else p.fade = 1;
        }
      }
      if (o.panels) for (const p of Object.values(o.panels)) if (p.fade !== undefined && p.fade > 0) { p.fade -= dt * 2.5; p.mesh.material.opacity = Math.max(0, p.fade); }
      if (o.mat) o.mat.uniforms.t.value = t;
      if (o.whip) {
        o.root.visible = !it.done;
        o.whip.rotation.y = t * 2.2;
        o.whip.position.y = 1.0 + Math.sin(t * 3) * 0.18;
        o.beam.material.opacity = 0.16 + Math.sin(t * 5) * 0.06;
        if (!it.done && Math.random() < dt * 20) this.sparks.emit(it.x + (Math.random() - 0.5) * 1.2, 0.3 + Math.random() * 2.5, -it.d + (Math.random() - 0.5) * 1.2, 0, 1.5, 0, this.goldCol, 0.8, 0.2, 0.05, -0.5, 1);
      }
      if (it.type === 'gate' && it.swap && !it.done) {
        const ops = it.lock || gateOpsAt(it, run.t);
        for (const p of Object.values(o.panels)) {
          const tx = p.g === ops.left ? -HALF / 2 : HALF / 2;
          p.mesh.position.x += (tx - p.mesh.position.x) * Math.min(1, dt * 14);
          p.x = p.mesh.position.x;
        }
      }
    }
    // валуны
    const live = new Set();
    for (const rk of run.rocks) {
      live.add(rk);
      let obj = this.rockObjs.get(rk);
      if (!obj) {
        obj = this.assets.rock.clone();
        obj.scale.setScalar(this.assets.rockScale * 2.1);
        obj.traverse((q2) => { q2.userData.shared = q2.userData.sharedMat = true; });
        this.levelGroup.add(obj);
        this.rockObjs.set(rk, obj);
      }
      obj.position.set(rk.x, 0.88, -rk.d);
      obj.rotation.set(0, 0, -rk.rot * rk.dir);
      shadow(rk.x, -rk.d, 1.1);
      if (Math.random() < dt * 30) this.dust.emit(rk.x - rk.dir * 0.8, 0.2, -rk.d + (Math.random() - 0.5), -rk.dir * 1.5, 0.8, 0, this.dustColor(), 0.9, 1.0, 2.6);
    }
    for (const [rk, obj] of this.rockObjs) if (!live.has(rk)) { this.levelGroup.remove(obj); this.rockObjs.delete(rk); }
    this.shadows.count = sh;

    if (run.boostT > 0 && !menu) {
      this.boost = Math.max(this.boost, 0.55);
      if (run.bodies.length) for (let k = 0; k < Math.ceil(dt * 40); k++) {
        const b = run.bodies[Math.floor(Math.random() * run.bodies.length)];
        this.sparks.emit(b.x + (Math.random() - 0.5), 0.4 + Math.random() * 1.6, -b.d, (Math.random() - 0.5) * 2, 1 + Math.random() * 2, 3, this.goldCol, 0.6, 0.18, 0.05, 0, 1);
      }
    }
    // следы и брызги
    this.windU.value = t;
    if (running && !menu && run.bodies.length && this.prints) {
      const river = run.items.find((it) => it.type === 'river' && run.d > it.d0 - 3 && run.d < it.d1 + 3);
      this.printAcc += dt * Math.min(60, 10 + run.bodies.length * 0.4);
      while (this.printAcc > 1) {
        this.printAcc--;
        const b = run.bodies[Math.floor(Math.random() * run.bodies.length)];
        if (river && b.d > river.d0 && b.d < river.d1) {
          // брод: брызги вместо следов
          const wc = this._wc || (this._wc = new THREE.Color('#dff2ff'));
          for (let k = 0; k < 3; k++) this.dust.emit(b.x + (Math.random() - 0.5) * 0.6, 0.3, -b.d, (Math.random() - 0.5) * 2.4, 2.5 + Math.random() * 2.5, (Math.random() - 0.5) * 1.5, wc, 0.7, 0.35, 1.1, 9, 0.9);
          continue;
        }
        if (Math.abs(b.x) > HALF - 0.2) continue;
        m4.compose(v.set(b.x + (Math.random() - 0.5) * 0.3, 0.022, -b.d + 0.6), q.setFromEuler(e.set(0, (Math.random() - 0.5) * 0.4, 0)), s.set(1, 1, 1));
        this.prints.setMatrixAt(this.printN, m4);
        this.printN = (this.printN + 1) % 700;
        this.prints.count = Math.min(700, Math.max(this.prints.count, this.printN === 0 ? 700 : this.printN));
      }
      this.prints.instanceMatrix.needsUpdate = true;
    }
    // пыль из-под копыт
    if (running && !menu && run.bodies.length) {
      this.emitAcc += dt * Math.min(70, 12 + run.bodies.length * 0.6);
      const dc = this.dustColor();
      while (this.emitAcc > 1) {
        this.emitAcc--;
        const b = run.bodies[Math.floor(Math.random() * run.bodies.length)];
        this.dust.emit(b.x + (Math.random() - 0.5) * 0.5, 0.15, -b.d + 0.9, (Math.random() - 0.5) * 1.2, 0.6 + Math.random() * 0.8, 2 + Math.random() * 2, dc, 1.1 + Math.random() * 0.6, 0.6, 2.4, 0, 0.55);
      }
    }
    // беркуты кружат над точкой, куда смотрит камера
    for (const eg of this.eagles) {
      const u = eg.userData;
      const a = t * u.sp + u.ph;
      eg.position.set(this.camLook.x + Math.cos(a) * u.r, u.h + Math.sin(t * 0.3 + u.ph) * 2, this.camLook.z - 10 + Math.sin(a) * u.r * 0.7);
      eg.rotation.set(0, -a + Math.PI, Math.sin(a) * 0.25 + 0.3);
      const flap = Math.sin(t * 0.7 + u.ph) > 0.6 ? Math.sin(t * 9 + u.ph) * 0.5 : 0.05;
      u.lw.rotation.z = flap; u.rw.rotation.z = -flap;
    }
    if (this.torches) this.torches.material.size = 1.5 + Math.sin(t * 17) * 0.12 + Math.sin(t * 7.3) * 0.1;
    if (this.torchLight.intensity > 0) this.torchLight.position.set(run.cx, 7, -(run.d + 2));
    // гроза: дождь вокруг камеры, молнии с громом
    if (this.theme?.storm) {
      const P = this.rainPos, S = this.rainSeed, n = S.length / 3, cx = this.camera.position.x, cz = this.camera.position.z;
      for (let i = 0; i < n; i++) {
        const y = 24 - ((S[i * 3 + 1] * 24 + t * 26) % 24);
        const x = cx + (S[i * 3] - 0.5) * 46 + y * 0.18, z = cz - 4 - S[i * 3 + 2] * 46;
        P[i * 6] = x; P[i * 6 + 1] = y; P[i * 6 + 2] = z;
        P[i * 6 + 3] = x - 0.18; P[i * 6 + 4] = y - 1.0; P[i * 6 + 5] = z;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
      if (!menu) this.boltT -= dt;
      if (this.boltT <= 0) {
        this.boltT = 4 + Math.random() * 5;
        // ломаная от тучи к земле далеко впереди
        const pts = [];
        let x = this.camLook.x + (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 40), y = 42, z = this.camLook.z - 70 - Math.random() * 50;
        while (y > 0) {
          const nx = x + (Math.random() - 0.5) * 9, ny = y - 3 - Math.random() * 5, nz = z + (Math.random() - 0.5) * 4;
          pts.push(x, y, z, nx, Math.max(0, ny), nz);
          if (Math.random() < 0.25) pts.push(nx, ny, nz, nx + (Math.random() - 0.5) * 12, ny - 6, nz);
          x = nx; y = ny; z = nz;
        }
        this.bolt.geometry.dispose();
        this.bolt.geometry = new THREE.BufferGeometry();
        // отрезки → ленты шириной в метры (линии WebGL всегда в 1 пиксель и вдали пропадают)
        const tri = [];
        for (let i = 0; i < pts.length; i += 6) {
          const ax = pts[i], ay = pts[i + 1], az = pts[i + 2], bx = pts[i + 3], by = pts[i + 4], bz = pts[i + 5];
          const dx = bx - ax, dy = by - ay, L2 = Math.hypot(dx, dy) || 1, w = 0.35;
          const ox = (-dy / L2) * w, oy = (dx / L2) * w;
          tri.push(ax - ox, ay - oy, az, ax + ox, ay + oy, az, bx + ox, by + oy, bz, ax - ox, ay - oy, az, bx + ox, by + oy, bz, bx - ox, by - oy, bz);
        }
        this.bolt.geometry.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
        this.boltLife = 0.32;
        this.flashK = 1;
        this.onThunder?.();
      }
      if (this.boltLife > 0) { this.boltLife -= dt; this.bolt.visible = this.boltLife > 0 && (this.boltLife > 0.2 || this.boltLife < 0.1); } else this.bolt.visible = false;
      if (this.flashK > 0) this.flashK = Math.max(0, this.flashK - dt * 3.5);
      this.hemi.intensity = this.hemiBase * (1 + this.flashK * 2.2);
    } else { this.bolt.visible = false; if (this.hemiBase) this.hemi.intensity = this.hemiBase; }
    // снегопад на зимних уровнях
    if (this.theme?.snow) {
      this.snowAcc = (this.snowAcc || 0) + dt * 120;
      const wc = this.snowCol || (this.snowCol = new THREE.Color('#ffffff'));
      while (this.snowAcc > 1) {
        this.snowAcc--;
        this.dust.emit(this.camLook.x + (Math.random() - 0.5) * 50, 10 + Math.random() * 10, this.camLook.z + 25 - Math.random() * 60, (Math.random() - 0.5) * 0.8, -1.6, 0.6, wc, 6, 0.3, 0.3, 0, 0.95);
      }
    }
    // фейерверк по очереди
    for (const fw of this.fireworks) {
      fw.t -= dt;
      if (fw.t <= 0 && !fw.done) {
        fw.done = true;
        const c = new THREE.Color(fw.col), w = new THREE.Color('#fff8d0');
        for (let i = 0; i < 70; i++) {
          const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), sp = 6 + Math.random() * 3;
          this.sparks.emit(fw.x, fw.y, fw.z, Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp, Math.sin(ph) * Math.sin(th) * sp, i % 5 ? c : w, 1.3 + Math.random() * 0.5, 0.35, 0.12, 3, 1);
        }
        this.onBoom?.();
      }
    }
    this.fireworks = this.fireworks.filter((f) => !f.done);
    this.dust.update(dt);
    this.sparks.update(dt);
    this.updateCamera(run, dt, menu);
  }

  dustColor() { return this._dc || (this._dc = new THREE.Color(this.theme?.dirt || '#c9a874').lerp(new THREE.Color('#ffffff'), 0.25)); }

  burstPanel(p, it) {
    const c = new THREE.Color(p.g.op === '?' ? '#b070ff' : p.g.op === '$' ? '#ffc93a' : isGood(p.g) ? '#3fa9ff' : '#ff5040');
    const white = new THREE.Color('#ffffff');
    for (let i = 0; i < 70; i++) {
      const x = p.x + (Math.random() - 0.5) * p.w, y = 0.6 + Math.random() * p.w * 0.45;
      this.sparks.emit(x, y, -it.d, (Math.random() - 0.5) * 6, 2 + Math.random() * 5, -(Math.random() * 6 + 4), i % 4 ? c : white, 0.9 + Math.random() * 0.5, 0.35, 0.15, 14, 1);
    }
  }

  // эффекты по событиям логики
  fx(ev, run) {
    if (ev.type === 'loss') {
      const c = ev.kind === 'fall' ? new THREE.Color('#3a2a1a') : this.dustColor();
      for (let i = 0; i < 5; i++) this.dust.emit(ev.x, 0.3, -ev.d, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, c, 0.9, 1, 3, 0, 0.8);
      if (ev.kind === 'hit' || ev.kind === 'bump') this.shake = Math.max(this.shake, 0.25);
    } else if (ev.type === 'whip') {
      for (let i = 0; i < 90; i++) this.sparks.emit(ev.x, 1.6, -ev.d, (Math.random() - 0.5) * 9, 2 + Math.random() * 7, (Math.random() - 0.5) * 9, i % 3 ? this.goldCol : this._white || (this._white = new THREE.Color('#fff6d0')), 1.2, 0.3, 0.1, 8, 1);
      this.shake = Math.max(this.shake, 0.25);
    } else if (ev.type === 'bite') {
      const c = new THREE.Color('#9a8a72'); // пыль, без крови
      for (let i = 0; i < 8; i++) this.dust.emit(ev.x, 0.5, -ev.d, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, i % 2 ? c : this.dustColor(), 0.8, 0.8, 2.4, 0, 0.9);
      this.shake = Math.max(this.shake, 0.18);
    } else if (ev.type === 'recruit') {
      const c = new THREE.Color('#fff3b0');
      for (let i = 0; i < 6; i++) this.sparks.emit(ev.x, 1.8, -ev.d, (Math.random() - 0.5) * 3, 3 + Math.random() * 2, (Math.random() - 0.5) * 2, c, 0.6, 0.25, 0.1, 9, 1);
    } else if (ev.type === 'clash-tick') {
      const c = this.dustColor();
      for (let i = 0; i < 3; i++) this.dust.emit((Math.random() - 0.5) * 8, 0.4, -ev.d, (Math.random() - 0.5) * 5, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, c, 1.0, 1.4, 3.5, 0, 0.8);
      this.shake = Math.max(this.shake, 0.12);
    } else if (ev.type === 'clash-hit') {
      this.shake = 0.6;
      const dc = this.dustColor();
      for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 6; this.dust.emit(Math.cos(a) * 2, 0.4, -ev.d, Math.cos(a) * sp, 1 + Math.random() * 2, Math.sin(a) * sp * 0.6, dc, 1.4 + Math.random() * 0.6, 1.4, 4.5, 0, 0.85); }
    } else if (ev.type === 'step') {
      const a = this.arches?.[ev.i];
      if (a) { a.pulse = 1; }
      const cols = ['#ffd23a', '#3fa9ff', '#ff5a7a', '#7be07b', '#ffffff'].map((c) => new THREE.Color(c));
      for (let i = 0; i < 40; i++) this.sparks.emit((Math.random() - 0.5) * 10, 4 + Math.random() * 2, -ev.d, (Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 4, cols[i % cols.length], 1.6, 0.3, 0.25, 6, 1);
    } else if (ev.type === 'win') {
      this.rearT = 0;
      this.confetti(run);
      const cols = ['#ffd23a', '#ff5a7a', '#3fa9ff', '#7be07b', '#ffffff', '#ff9a3a'];
      for (let i = 0; i < 7; i++) this.fireworks.push({ t: 0.15 + i * 0.32, x: (Math.random() - 0.5) * 22, y: 16 + Math.random() * 8, z: -(run.d + 30 + Math.random() * 20), col: cols[i % cols.length] });
    } else if (ev.type === 'river') {
      // всплески — в цикле по коням в воде
    } else if (ev.type === 'gate') {
      if (!ev.good) this.shake = Math.max(this.shake, 0.3);
      if (ev.good && ev.op?.op === 'x') this.boost = Math.max(this.boost, ev.op.v >= 3 ? 1 : 0.75);
    }
  }

  confetti(run) {
    const cols = ['#ffd23a', '#3fa9ff', '#ff5a7a', '#7be07b', '#ffffff', '#b07bff'].map((c) => new THREE.Color(c));
    // конфетти — перед камерой, чтобы были крупными
    const c = this.camera.position, f = new THREE.Vector3();
    this.camera.getWorldDirection(f);
    for (let i = 0; i < 220; i++) {
      const k = 5 + Math.random() * 9;
      this.sparks.emit(c.x + f.x * k + (Math.random() - 0.5) * k * 1.2, c.y + f.y * k + 2 + Math.random() * 3, c.z + f.z * k + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 8, 2 + Math.random() * 6, (Math.random() - 0.5) * 2, cols[i % cols.length], 2.6 + Math.random(), 0.12, 0.1, 3, 1);
    }
  }

  updateCamera(run, dt, menu) {
    const sh = herdShape(Math.max(1, Math.min(run.count, run.cap)) || 1);
    let cx = run.cx * 0.55, cd = run.d;
    let dist = 10 + sh.b * 0.75 + sh.a * 0.6, hgt = 7.2 + sh.b * 0.45 + sh.a * 0.5;
    if (run.state === 'clash') {
      cd = (run.d + run.rival.d) / 2 - 4;
      const rsh = herdShape(Math.max(1, Math.min(run.rival.count, run.cap)));
      dist = Math.max(dist, 14 + (sh.b + rsh.b) * 0.55);
      hgt = Math.max(hgt, 11 + (sh.b + rsh.b) * 0.35);
    } else if (run.state === 'ladder' || run.state === 'win') {
      dist = 15; hgt = 11; cd = run.d + 2;
    }
    const cine = run.state === 'clash' && !menu && !this.camOverride;
    if (menu) { dist = 13; hgt = 6.5; cx = 3.5; cd = run.d - 2; }
    if (this.camOverride) { dist = this.camOverride.dist; hgt = this.camOverride.hgt; }
    // поле зрения: ширина трассы должна влезать
    const aspect = this.camera.aspect || 1;
    const look = new THREE.Vector3(cx * 0.8, 0.6, -(cd + 10 + sh.b * 0.4));
    const pos = new THREE.Vector3(cx, hgt, -(cd - dist));
    if (cine) {
      const rsh = herdShape(Math.max(1, Math.min(run.rival.count, run.cap)));
      const off = 11 + (sh.b + rsh.b) * 0.45;
      const portrait = aspect < 0.8;
      look.set(0, 1.2, -(cd + 4));
      pos.set(off * (portrait ? 0.45 : 0.85), 5 + off * 0.25, -(cd - off * (portrait ? 0.95 : 0.6)));
    }
    if (menu) {
      // телефон стоя: вожак ближе к центру, правую колонку кнопок не задевает
      if (aspect < 0.8) { look.set(-0.4, 1.25, -(cd + 1.5)); pos.set(2.4, 2.7, -(cd + 11.5)); }
      else { look.set(-1.5, 1.0, -(cd - 1)); pos.set(6.5, 3.4, -(cd + 10)); }
    }
    if (this.intro > 0) this.intro -= dt;
    const k = 1 - Math.exp(-dt * (menu ? 2 : this.intro > 0 ? 1.4 : 4));
    this.camPos.lerp(pos, k);
    this.camLook.lerp(look, k);
    const needHalfW = HALF + 2.2;
    const distToHerd = Math.hypot(this.camPos.y, this.camPos.z + (cd + 2));
    const hfov = 2 * Math.atan(needHalfW / Math.max(6, distToHerd));
    let vfov = 2 * Math.atan(Math.tan(hfov / 2) / aspect) * (180 / Math.PI);
    vfov = clamp(vfov, menu ? 50 : 46, 82);
    // базовый обзор копим отдельно, рывок прибавляем только при выводе (иначе он нарастает каждый кадр)
    this.baseFov = (this.baseFov ?? this.camera.fov) + (vfov - (this.baseFov ?? this.camera.fov)) * k;
    this.camera.fov = this.baseFov;
    // рывок: обзор шире и полосы ветра мимо камеры
    if (this.boost > 0) this.boost = Math.max(0, this.boost - dt * 1.1);
    this.camera.fov = this.baseFov + this.boost * 9 * (menu ? 0 : 1);
    {
      const P = this.streaks.geometry.attributes.position.array, S = this.streakSeed, n = S.length / 3, c = this.camPos;
      for (let i = 0; i < n; i++) {
        const side = S[i * 3] < 0.5 ? -1 : 1;
        const x = c.x + side * (2.5 + S[i * 3] * 7), y = 0.4 + S[i * 3 + 1] * 6;
        const z = c.z - 30 + ((S[i * 3 + 2] * 30 + this.time * 70) % 30);
        P[i * 6] = x; P[i * 6 + 1] = y; P[i * 6 + 2] = z; P[i * 6 + 3] = x; P[i * 6 + 4] = y; P[i * 6 + 5] = z - 3.5;
      }
      this.streaks.geometry.attributes.position.needsUpdate = true;
      this.streaks.material.opacity = this.boost * 0.5;
      this.streaks.visible = this.boost > 0.01;
    }
    // в меню картинку сдвигаем вверх: снизу кнопки, табун должен быть над ними
    if (menu && this.w) this.camera.setViewOffset(this.w, this.h, 0, this.h * (this.w > this.h ? 0.1 : 0.12), this.w, this.h);
    else if (this.camera.view?.enabled) this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.shake *= Math.exp(-dt * 6);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    this.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
    this.camera.lookAt(this.camLook);
    this.sky.position.copy(this.camera.position);
    this.mountains.position.set(this.camera.position.x, 0, this.camera.position.z);
    const sd = this.sunDir || new THREE.Vector3(0.3, 0.8, 0.4);
    this.sun.position.set(this.camLook.x + sd.x * 50, sd.y * 50, this.camLook.z + sd.z * 50);
    this.sun.target.position.copy(this.camLook);
    // ступени пульсируют
    if (this.arches) for (const a of this.arches) if (a.pulse > 0) { a.pulse -= dt * 2; const s2 = 1 + Math.max(0, a.pulse) * 0.25; a.sign.scale.setScalar(s2); }
  }

  project(x, y, d) {
    const v = this.v3.set(x, y, -d).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h, vis: v.z < 1 };
  }

  render() { this.renderer.render(this.scene, this.camera); }
}

function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

function mergeTwo(a, b) {
  const g = new THREE.BufferGeometry();
  const pa = a.attributes.position.array, pb = b.attributes.position.array;
  const ua = a.attributes.uv.array, ub = b.attributes.uv.array;
  const na = a.attributes.normal.array, nb = b.attributes.normal.array;
  g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from([...pa, ...pb]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from([...ua, ...ub]), 2));
  g.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from([...na, ...nb]).map((v, i) => (i % 3 === 1 ? 1 : 0)), 3));
  const ia = Array.from(a.index.array), off = pa.length / 3;
  g.setIndex([...ia, ...Array.from(b.index.array).map((i) => i + off)]);
  return g;
}
