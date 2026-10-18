// Көкпар — мир: рендер, степь, горы, река, пыль, следы, конь (модель, аллюры, свечка), столкновения.
// Правила, боты и управление — в game.js. ?q=low|medium|high  ?no=terrain,river,grass  ?debug
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { FBXLoader } from '../vendor/loaders/FBXLoader.js';
import * as SkeletonUtils from '../vendor/utils/SkeletonUtils.js';
import { hoof, snort, bump, neigh } from './audio.js';
import { makeTrees } from './trees.js';

const P = new URLSearchParams(location.search);
const Q = P.get('q') || (() => { try { return localStorage.getItem('kokpar.q'); } catch { return null; } })() || (matchMedia('(pointer: coarse)').matches ? 'medium' : 'high');
const PR_MAX = Math.min(devicePixelRatio, Q === 'high' ? 2 : Q === 'medium' ? 1.5 : 1);
// авто-разрешение: если кадров мало — рисуем в меньшем разрешении, стало легче — возвращаем
const autoRes = { pr: PR_MAX, slow: 0, fast: 0 };
function tuneRes(dt) {
  if (P.has('fixres')) return;
  const fps = 1 / Math.max(dt, 1e-3);
  autoRes.slow = fps < 32 ? autoRes.slow + dt : 0;
  autoRes.fast = fps > 56 ? autoRes.fast + dt : 0;
  let pr = autoRes.pr;
  if (autoRes.slow > 2.5) { pr = Math.max(0.6, pr - 0.15); autoRes.slow = 0; }
  if (autoRes.fast > 6) { pr = Math.min(PR_MAX, pr + 0.1); autoRes.fast = 0; }
  if (pr !== autoRes.pr) { autoRes.pr = pr; renderer.setPixelRatio(pr); renderer.setSize(view.w, view.h); }
}
const OFF = new Set((P.get('no') || '').split(',')); // ?no=terrain,river,grass,sky — для поиска тормозов
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
    file: P.has('armor') ? 'models/warhorse-2048.glb' : 'models/warhorse-kz.glb', height: 1.75, maxScale: 1.9, gallop: 8.5,
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
const FIELD = 110; // где растёт ковыль, полуширина, м
export const BOUNDS = { x: 64, z: 38 }; // поле игры: за край конь не уходит
const REAR_ANGLE = Number(P.get('rear') || 0.58); // свечка: наклон корпуса, рад (~33°)
const REAR_LEN = 3.0, REAR_UP = 0.85, REAR_DOWN = 0.9; // длительность, подъём, опускание, с

// ---------- экран ----------
// телефон в портрете: страницу поворачиваем на 90°, игра всегда горизонтальная
export const view = { w: innerWidth, h: innerHeight, rot: false };
const touchDev = matchMedia('(pointer: coarse)').matches;
export const PORTAL = P.has('cg') || window.top !== window.self;
function measure() {
  view.rot = touchDev && innerHeight > innerWidth && !PORTAL; // на портале не крутим — просим повернуть телефон
  document.documentElement.classList.toggle('portrait', PORTAL && touchDev && innerHeight > innerWidth);
  view.w = view.rot ? innerHeight : innerWidth; view.h = view.rot ? innerWidth : innerHeight;
  document.documentElement.classList.toggle('rot', view.rot);
  document.documentElement.classList.toggle('short', view.h < 520);
  document.documentElement.style.setProperty('--vh', view.h + 'px'); document.documentElement.style.setProperty('--vw', view.w + 'px'); // высота экрана игры (в повёрнутом виде — ширина телефона)
  Object.assign(document.body.style, view.rot ? { width: view.w + 'px', height: view.h + 'px', transform: `translateX(${innerWidth}px) rotate(90deg)` } : { width: '', height: '', transform: '' });
}
measure();
// ---------- рендер ----------
const renderer = new THREE.WebGLRenderer({ antialias: Q !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: P.has('debug') }); // в отладке кадр можно снять скриншотом
renderer.setPixelRatio(PR_MAX);
renderer.setSize(view.w, view.h);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = Q !== 'low';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const HORIZON = new THREE.Color('#dcd8cc');
scene.fog = new THREE.FogExp2(HORIZON, 0.0015); // дымка: даль и горы светлеют постепенно
const camera = new THREE.PerspectiveCamera(55, view.w / view.h, 0.1, 4000);

const ENV = { snow: { value: 0 }, stars: { value: 0 } };
const HAZE = new THREE.Color('#b9c7d8');
const hemi = new THREE.HemisphereLight('#bcd6f5', '#7a5c32', 1.05);
scene.add(hemi);
// Солнце ближе к вечеру: тёплое и ниже — длинные тени, рельефнее конь.
const SUN_DIR = new THREE.Vector3(-0.62, 0.5, 0.6).normalize();
const sun = new THREE.DirectionalLight('#ffe0ad', 3.1);
sun.castShadow = renderer.shadowMap.enabled;
sun.shadow.mapSize.set(Q === 'high' ? 2048 : 1024, Q === 'high' ? 2048 : 1024);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 200 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// Небо: градиент, свечение у солнца и медленные облака.
// Облака — бесшовная текстура шума, посчитанная один раз (шум в шейдере на каждый пиксель стоил половину FPS).
const cloudTex = (() => {
  const S = 256, data = new Uint8Array(S * S * 4);
  const octs = [8, 16, 32, 64].map((g, i) => { const o = { g, a: 0.5 / 2 ** i, v: [] }; for (let k = 0; k < g * g; k++) o.v.push(Math.random()); return o; });
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0;
    for (const o of octs) {
      const fx = (x / S) * o.g, fy = (y / S) * o.g, ix = Math.floor(fx), iy = Math.floor(fy);
      let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const at = (cx, cy) => o.v[(((cy % o.g) + o.g) % o.g) * o.g + (((cx % o.g) + o.g) % o.g)];
      v += o.a * (at(ix, iy) * (1 - tx) * (1 - ty) + at(ix + 1, iy) * tx * (1 - ty) + at(ix, iy + 1) * (1 - tx) * ty + at(ix + 1, iy + 1) * tx * ty);
    }
    const i = (y * S + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = Math.min(255, v * 270); data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, S, S);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
})();
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#4a82c8') }, bot: { value: HORIZON }, sunDir: { value: SUN_DIR }, time: { value: 0 }, clouds: { value: cloudTex }, stars: ENV.stars, glow: { value: 1 } },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform float time; uniform sampler2D clouds; uniform float stars; uniform float glow; varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir);
      float h = max(d.y, 0.);
      vec3 col = mix(bot, top, smoothstep(0., .5, h));
      float s = max(dot(d, sunDir), 0.);
      col += vec3(1., .78, .5) * (pow(s, 6.) * .22 + pow(s, 300.) * 1.4) * glow;
      // ночью — звёзды: мелкие яркие точки из той же текстуры шума
      vec2 su = d.xz / (d.y + .05) * 3.1;
      float st = smoothstep(.86, .93, texture2D(clouds, su).r * texture2D(clouds, su * 1.7 + .5).r * 1.6);
      col += vec3(.9, .95, 1.) * st * stars * smoothstep(.05, .3, d.y);
      vec2 uv = d.xz / (d.y + .12) * .2 + vec2(time * .0005, time * .0002);
      float n = texture2D(clouds, uv).r * .7 + texture2D(clouds, uv * 2.7 + .37).r * .3;
      float c = smoothstep(.5, .74, n) * smoothstep(.02, .22, d.y);
      vec3 cloud = mix(vec3(.93, .9, .86), vec3(1., .93, .8), pow(s, 3.)) * mix(1., .12, stars);
      col = mix(col, cloud, c * .85);
      gl_FragColor = vec4(col, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), skyMat);
skyMesh.renderOrder = -10; // небо рисуется первым: горы дальше его радиуса не пропадают
skyMesh.frustumCulled = false;
scene.add(skyMesh);

// Отражения для PBR-материалов коня: окружение из того же неба.
{
  const env = new THREE.Scene();
  env.add(scene.children[scene.children.length - 1].clone());
  const g = new THREE.Mesh(new THREE.CircleGeometry(900, 24), new THREE.MeshBasicMaterial({ color: '#9c8656' }));
  g.rotation.x = -Math.PI / 2; g.position.y = -2;
  env.add(g);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.02).texture;
  scene.environmentIntensity = 1.15;
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

// Земля: выгоревшая степь. Мелкая текстура (комья, камешки, сухие травинки) + крупные пятна по всей степи.
const groundTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#b49b62'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 7000; i++) {
    const x = rnd() * w, y = rnd() * h, r = 1 + rnd() * 3, k = rnd();
    g.fillStyle = k < 0.4 ? `rgba(118,112,58,${0.22 + rnd() * 0.3})` : k < 0.75 ? `rgba(205,182,124,${0.2 + rnd() * 0.3})` : `rgba(92,72,42,${0.18 + rnd() * 0.22})`;
    g.beginPath(); g.ellipse(x, y, r, r * (0.4 + rnd() * 0.6), rnd() * 3, 0, 6.283); g.fill();
  }
  g.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w, y = rnd() * h, l = 3 + rnd() * 7, a = rnd() * 6.28;
    g.strokeStyle = `rgba(${rnd() < 0.5 ? '226,206,150' : '140,126,70'},${0.35 + rnd() * 0.35})`; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
}, 90);
const macroTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * w, y = rnd() * h, r = 8 + rnd() * 40, v = Math.round(90 + rnd() * 90);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${v},${v},${v},0.55)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
});
macroTex.colorSpace = THREE.NoColorSpace;
macroTex.wrapS = macroTex.wrapT = THREE.RepeatWrapping;
const groundMat = new THREE.MeshLambertMaterial({ map: groundTex });
groundMat.onBeforeCompile = (sh) => {
  sh.uniforms.macro = { value: macroTex };
  sh.uniforms.snow = ENV.snow;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vW;')
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.)).xz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D macro; uniform float snow; varying vec2 vW;')
    .replace('#include <map_fragment>', '#include <map_fragment>\nfloat mc = texture2D(macro, vW / 140.).r * .6 + texture2D(macro, vW / 37. + .3).r * .4;\ndiffuseColor.rgb *= mix(.78, 1.2, mc);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(.84, .87, .93) * mix(.86, 1.06, mc) * (.9 + diffuseColor.g * .25), snow);');
};
const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Река — Большая Алматинка по настоящему рельефу (models/alatau-river.json, загружается в loadTerrain).
let riverPts = [];
function riverDist(x, z) {
  let m = 1e12;
  for (const p of riverPts) { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < m) m = d; }
  return Math.sqrt(m);
}

// Пучки ковыля: один InstancedMesh, три скрещённые плоскости.
const GRASS = { low: 0, medium: 7000, high: 18000 }[Q] ?? 7000;
const wind = { value: 0 }; // время для ветра в траве
if (!OFF.has('trees')) makeTrees(scene, { snow: ENV.snow, time: wind }); // тополя, карагачи, ели вокруг поля
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
  mat.onBeforeCompile = (sh) => { // ветер: верх пучка качается, волны идут по степи
    sh.uniforms.time = wind;
    sh.uniforms.snow = ENV.snow;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float snow;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .88, .9) * (.55 + diffuseColor.r * .6), snow * .75);');
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float time;').replace('#include <begin_vertex>', `#include <begin_vertex>
      vec2 ip = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
      float k = position.y * position.y * 3.;
      float w = sin(time * 1.6 + ip.x * .18 + ip.y * .11) * .6 + sin(time * 3.1 + ip.x * .7) * .25;
      transformed.x += w * .09 * k; transformed.z += w * .05 * k;`);
  };
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
  if (!OFF.has('grass')) scene.add(grass);
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

// ---------- настоящие горы: Заилийский Алатау ----------
// Рельеф — AWS Terrain Tiles (SRTM), снимок — Sentinel-2 cloudless 2016 (EOX, CC BY 4.0); сшиты tools/blender/alatau.py.
// Горы до 50 км: рисуем их отдельным «дальним» проходом со своей камерой (near 30 м, far 200 км),
// потом очищаем глубину и рисуем поле с конями обычной камерой — так нет мерцания вблизи.
const farScene = new THREE.Scene();
const farCam = new THREE.PerspectiveCamera(55, view.w / view.h, 30, 200000);
const farHemi = new THREE.HemisphereLight('#bcd6f5', '#7a5c32', 1.0);
farScene.add(farHemi);
const farSun = new THREE.DirectionalLight('#ffe0ad', 2.6);
farSun.position.copy(SUN_DIR).multiplyScalar(1000);
farScene.add(farSun);
scene.remove(skyMesh); farScene.add(skyMesh); skyMesh.scale.setScalar(140); // небо — за горами
renderer.autoClear = false;
function renderAll() {
  farCam.position.copy(camera.position); farCam.quaternion.copy(camera.quaternion);
  if (farCam.fov !== camera.fov || farCam.aspect !== camera.aspect) { farCam.fov = camera.fov; farCam.aspect = camera.aspect; farCam.updateProjectionMatrix(); }
  renderer.clear();
  renderer.render(farScene, farCam);
  renderer.clearDepth();
  renderer.render(scene, camera);
}

const EXAG = Number(P.get('exag') || 1.35);
let dem = null; // { m, H } — сетка высот, м над уровнем моря
// высота относительно поля; у поля (до ~2 км) рельеф уходит под землю — там своя степь с травой
function demH(x, z) {
  if (!dem) return -5;
  const { m, H } = dem;
  const fx = ((x - m.x0) / (m.x1 - m.x0)) * (m.w - 1), fz = ((m.z1 - z) / (m.z1 - m.z0)) * (m.h - 1);
  const i = Math.max(0, Math.min(m.w - 2, Math.floor(fx))), j = Math.max(0, Math.min(m.h - 2, Math.floor(fz)));
  const tx = Math.min(1, Math.max(0, fx - i)), tz = Math.min(1, Math.max(0, fz - j));
  const a = H[j * m.w + i], b = H[j * m.w + i + 1], c = H[(j + 1) * m.w + i], d = H[(j + 1) * m.w + i + 1];
  const e = a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
  const k = THREE.MathUtils.smoothstep(Math.hypot(x, z), 1900, 4800);
  const up = e - m.elev0;
  return (up > 0 ? up * EXAG : up) * k - 6 * (1 - k); // горы чуть выше настоящих — глазу так ближе к ощущению вживую
}
function terrainH(x, z) { return demH(x, z); }

// Река: вода с бегущей рябью, отражением неба, бликами и пеной на порогах.
const riverMat = new THREE.ShaderMaterial({
  transparent: true, fog: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, ripple: { value: null }, sky: { value: new THREE.Color('#8fb6dc') }, deep: { value: new THREE.Color('#2a6470') }, sunDir: { value: SUN_DIR } }]),
  vertexShader: `varying vec2 vUv; varying vec3 vW; attribute float steep; varying float vSteep;
    #include <fog_pars_vertex>
    void main(){ vUv = uv; vSteep = steep; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader: `uniform float time; uniform sampler2D ripple; uniform vec3 sky; uniform vec3 deep; uniform vec3 sunDir; varying vec2 vUv; varying vec3 vW; varying float vSteep;
    #include <fog_pars_fragment>
    float rip(vec2 uv, float flow){
      return texture2D(ripple, vec2(uv.x * .9, uv.y * 7. - flow * .5)).r * .6 + texture2D(ripple, vec2(uv.x * 2.1 + .4, uv.y * 17. - flow * 1.1)).r * .4;
    }
    void main(){
      float flow = time * (.6 + vSteep * 4.);
      float e = .004, h0 = rip(vUv, flow);
      float hx = rip(vUv + vec2(e, 0.), flow) - h0, hy = rip(vUv + vec2(0., e * .2), flow) - h0;
      vec3 n = normalize(vec3(-hx * 14., 1., -hy * 40.));
      vec3 V = normalize(cameraPosition - vW);
      vec3 R = reflect(-V, n);
      float fres = .04 + .96 * pow(1. - max(dot(n, V), 0.), 5.);
      vec3 refl = mix(sky * .85, sky * 1.15, clamp(R.y * 2., 0., 1.));
      vec3 col = mix(deep * (.85 + h0 * .3), refl, clamp(fres + .25, 0., 1.));
      col += vec3(1., .92, .75) * pow(max(dot(R, sunDir), 0.), 180.) * 2.5;
      float edge = smoothstep(0., .14, vUv.x) * smoothstep(1., .86, vUv.x);
      col = mix(vec3(.82, .85, .84), col, smoothstep(.0, .6, edge + (h0 - .5) * .4));
      col = mix(col, vec3(.92, .94, .95), smoothstep(.02, .09, vSteep) * smoothstep(.3, .7, h0)); // пороги
      gl_FragColor = vec4(col, .95 * smoothstep(0., .05, vUv.x) * smoothstep(1., .95, vUv.x));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`,
});
riverMat.uniforms.ripple.value = cloudTex;
// лента вдоль русла; heightAt — высота воды, sel(x,z) — какие точки брать
function ribbon(pts, width, heightAt, lift) {
  const pos = [], uv = [], idx = [], steep = [];
  let len = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    const dx = q[0] - o[0], dz = q[1] - o[1], l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l, nz = dx / l;
    const y = heightAt(p[0], p[1]);
    const w = width(y) * (1 + 0.22 * Math.sin(i * 0.37) + 0.12 * Math.sin(i * 1.3));
    if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    pos.push(p[0] - nx * w / 2, y + lift, p[1] - nz * w / 2, p[0] + nx * w / 2, y + lift, p[1] + nz * w / 2);
    uv.push(0, len / 40, 1, len / 40);
    const s = Math.abs(heightAt(q[0], q[1]) - heightAt(o[0], o[1])) / l;
    steep.push(s, s);
    if (i < pts.length - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('steep', new THREE.Float32BufferAttribute(steep, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

async function loadTerrain() {
  const [m0, buf, river, sat] = await Promise.all([
    fetch('models/alatau.json').then((r) => r.json()),
    fetch('models/alatau-h2.bin').then((r) => r.arrayBuffer()),
    fetch('models/alatau-river.json').then((r) => r.json()),
    new THREE.TextureLoader().loadAsync(Q === 'high' ? 'models/alatau-sat.jpg' : 'models/alatau-sat-1k.jpg'),
  ]);
  const m = { ...m0, w: (m0.w >> 1), h: (m0.h >> 1) }; // каждая вторая точка исходной сетки
  dem = { m, H: new Uint16Array(buf) };
  riverPts = river;
  sat.colorSpace = THREE.SRGBColorSpace;
  sat.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // сетка: на high каждая вторая точка (~200 м), ниже — реже
  const st = Q === 'high' ? 1 : Q === 'medium' ? 1.5 : 2;
  const W = Math.floor((m.w - 1) / st) + 1, Hh = Math.floor((m.h - 1) / st) + 1;
  const pos = new Float32Array(W * Hh * 3), uvs = new Float32Array(W * Hh * 2), idx = [];
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
    const x = m.x0 + ((i * st) / (m.w - 1)) * (m.x1 - m.x0), z = m.z1 - ((j * st) / (m.h - 1)) * (m.z1 - m.z0);
    const k = j * W + i;
    pos[k * 3] = x; pos[k * 3 + 1] = demH(x, z); pos[k * 3 + 2] = z;
    uvs[k * 2] = (x - m.x0) / (m.x1 - m.x0); uvs[k * 2 + 1] = (z - m.z0) / (m.z1 - m.z0);
  }
  for (let j = 0; j < Hh - 1; j++) for (let i = 0; i < W - 1; i++) {
    const a = j * W + i, b = a + W;
    idx.push(a, a + 1, b, a + 1, b + 1, b); // лицом вверх (строки идут с севера на юг)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ map: sat, fog: false });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.elev0 = { value: m.elev0 };
    sh.uniforms.exag = { value: EXAG };
    sh.uniforms.haze = { value: HAZE };
    sh.uniforms.snow = ENV.snow;
    sh.uniforms.horizon = { value: HORIZON };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; uniform float elev0; uniform float exag; uniform vec3 haze; uniform vec3 horizon; uniform float snow;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float elev = vW.y / exag + elev0; // настоящая высота (рельеф вытянут в EXAG раз)
        float lum = dot(diffuseColor.rgb, vec3(.3, .59, .11));
        // на равнине вместо города и пашен — выгоревшая степь (тон берём из снимка)
        float plain = 1. - smoothstep(1250., 1650., elev);
        vec3 steppe = mix(vec3(.38, .37, .19), vec3(.58, .54, .31), clamp(lum * 4., 0., 1.)); // предгорья — оливковые, весенняя степь
        diffuseColor.rgb = mix(diffuseColor.rgb, steppe, plain * .9);
        // зелень гор: пояс ельников 1500–2800 м (гуще на северных склонах), выше — альпийские луга
        vec3 nrm = normalize(cross(dFdx(vW), dFdy(vW)));
        float slope = 1. - abs(nrm.y), north = smoothstep(-.25, .45, nrm.z);
        float belt = smoothstep(1450., 1750., elev) * (1. - smoothstep(2650., 2950., elev));
        float forest = belt * (.35 + .65 * north) * smoothstep(.05, .25, slope) * smoothstep(.55, .2, lum + .1);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.09, .17, .08) * (.75 + lum * 1.2), clamp(forest * 1.3, 0., .85));
        float meadow = smoothstep(1650., 2000., elev) * (1. - smoothstep(3050., 3350., elev)) * (1. - forest);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.33, .43, .19) * (.8 + lum * .6), meadow * .45);
        // снег и лёд на вершинах ярче и белее
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.93, .95, .98), smoothstep(3300., 3900., elev) * smoothstep(.18, .45, lum));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .89, .95) * (.72 + lum * .5), snow * smoothstep(.04, .3, lum + .08) * .92);`)
      .replace('#include <fog_fragment>', `
        float d = length(vW - cameraPosition);
        float hz = (1. - exp(-d / 24000.)) * mix(1., .55, smoothstep(1500., 4500., vW.y / exag + elev0)); // дымка гуще внизу
        gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(horizon, haze, smoothstep(3000., 20000., d)), hz * .9);`);
  };
  const terrain = new THREE.Mesh(g, mat);
  if (!OFF.has('terrain')) farScene.add(terrain);
  // река: вдали — по склонам (дальний проход), у поля — по земле (ближний проход)
  const nearPts = [], farPts = [];
  for (const p of river) { const r = Math.hypot(p[0], p[1]); if (r < 2700) nearPts.push(p); if (r > 2300) farPts.push(p); }
  const width = (y) => 26 + 20 * (1 - Math.min(1, Math.max(0, y) / 600)); // широкая у равнины, в горах уже
  if (!OFF.has('river')) {
    if (farPts.length > 1) farScene.add(new THREE.Mesh(ribbon(farPts, width, demH, 2.5), riverMat));
    if (nearPts.length > 1) {
      const flat = () => 0;
      const bankTex = canvasTex(256, 64, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, 'rgba(96,78,48,0)'); gr.addColorStop(0.25, 'rgba(96,78,48,0.8)'); gr.addColorStop(0.5, 'rgba(70,58,38,0.95)');
        gr.addColorStop(0.75, 'rgba(96,78,48,0.8)'); gr.addColorStop(1, 'rgba(96,78,48,0)');
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
      });
      const bank = new THREE.Mesh(ribbon(nearPts, () => 40, flat, 0.03), new THREE.MeshLambertMaterial({ map: bankTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
      scene.add(bank);
      const water = new THREE.Mesh(ribbon(nearPts, () => 22, flat, 0.08), riverMat);
      water.renderOrder = 1;
      scene.add(water);
    }
  }
  return m;
}

// ---------- пыль из-под копыт ----------
// Облачка (большие, мягкие, тают и расползаются) и комья земли (мелкие, тёмные, летят назад и падают).
function makeParticles(N, frag) {
  const P = { N, pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), life: new Float32Array(N), size: new Float32Array(N), decay: new Float32Array(N), next: 0 };
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P.pos, 3));
  g.setAttribute('life', new THREE.BufferAttribute(P.life, 1));
  g.setAttribute('size', new THREE.BufferAttribute(P.size, 1));
  P.geo = g;
  P.pts = new THREE.Points(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { scale: { value: view.h / 2 } },
    vertexShader: `attribute float life; attribute float size; varying float vL; uniform float scale;
      void main(){ vL = life; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: frag,
  }));
  P.pts.frustumCulled = false;
  scene.add(P.pts);
  return P;
}
const dust = makeParticles(900, `varying float vL;
  void main(){ if (vL <= 0.) discard; vec2 c = gl_PointCoord - .5; float d = length(c);
    float a = smoothstep(.5, .1, d) * min(vL * 1.6, 1.) * vL * .38;
    gl_FragColor = vec4(mix(vec3(.74,.64,.47), vec3(.86,.78,.62), .5 - c.y), a);
    #include <colorspace_fragment>
  }`);
const clods = makeParticles(400, `varying float vL;
  void main(){ if (vL <= 0. || length(gl_PointCoord - .5) > .5) discard; gl_FragColor = vec4(.36,.28,.17, 1.);
    #include <colorspace_fragment>
  }`);
const particleSets = [dust, clods]; // масштаб точек обновляется при resize
function emit(P, x, y, z, vx, vy, vz, size, decay) {
  const i = P.next; P.next = (P.next + 1) % P.N;
  P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z;
  P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz;
  P.life[i] = 1; P.size[i] = size; P.decay[i] = decay;
}
// p — копыто в мире, speed — м/с, fx/fz — направление бега
function puff(p, speed, fx, fz) {
  const n = speed > 7 ? 3 : speed > 3 ? 2 : 1;
  for (let k = 0; k < n; k++) {
    const back = 0.4 + Math.random() * 0.8;
    emit(dust, p.x + (Math.random() - 0.5) * 0.25, 0.08, p.z + (Math.random() - 0.5) * 0.25,
      -fx * back + (Math.random() - 0.5) * 0.7, 0.25 + Math.random() * 0.5, -fz * back + (Math.random() - 0.5) * 0.7,
      0.45 + Math.random() * 0.4 + speed * 0.05, 0.45 + Math.random() * 0.25);
  }
  if (speed > 5) for (let k = 0; k < 2; k++) {
    const back = 1.5 + Math.random() * 2.5;
    emit(clods, p.x, 0.06, p.z, -fx * back + (Math.random() - 0.5), 1.4 + Math.random() * 2, -fz * back + (Math.random() - 0.5), 0.035 + Math.random() * 0.03, 1.2);
  }
}
function stepParticles(P, dt, gravity, grow) {
  for (let i = 0; i < P.N; i++) {
    if (P.life[i] <= 0) continue;
    P.life[i] -= dt * P.decay[i];
    const j = i * 3;
    P.pos[j] += P.vel[j] * dt; P.pos[j + 1] += P.vel[j + 1] * dt; P.pos[j + 2] += P.vel[j + 2] * dt;
    if (gravity) { P.vel[j + 1] -= 9.8 * dt; if (P.pos[j + 1] < 0.01) P.life[i] = 0; }
    else { const k = 1 - dt * 1.4; P.vel[j] *= k; P.vel[j + 1] *= 1 - dt * 2.2; P.vel[j + 2] *= k; P.vel[j] += 0.25 * dt; } // ветер слегка сносит
    if (grow) P.size[i] += grow * dt;
  }
  P.geo.attributes.position.needsUpdate = P.geo.attributes.life.needsUpdate = P.geo.attributes.size.needsUpdate = true;
}
function stepDust(dt) { stepParticles(dust, dt, false, 0.5); stepParticles(clods, dt, true, 0); stepPrints(dt); }

// ---------- следы копыт ----------
// Отпечаток — полупрозрачная тёмная подкова, за 40 с растворяется.
const PRINTS = 900;
const printTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 34, 3, 32, 34, 27);
  gr.addColorStop(0, 'rgba(70,52,30,0.55)'); gr.addColorStop(0.6, 'rgba(60,44,24,0.75)'); gr.addColorStop(0.82, 'rgba(90,70,42,0.3)'); gr.addColorStop(1, 'rgba(90,70,42,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(32, 34, 22, 26, 0, 0, 6.283); g.fill();
  g.globalCompositeOperation = 'destination-out'; // стрелка копыта светлее
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.ellipse(32, 45, 8, 9, 0, 0, 6.283); g.fill();
});
const prints = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.19).rotateX(-Math.PI / 2),
  new THREE.MeshLambertMaterial({ map: printTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), PRINTS);
prints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
prints.frustumCulled = false;
const printAge = new Float32Array(PRINTS).fill(1e9);
const printFadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(PRINTS).fill(1), 1);
printFadeAttr.setUsage(THREE.DynamicDrawUsage);
prints.geometry.setAttribute('fade', printFadeAttr);
prints.material.onBeforeCompile = (sh) => { // fade 0 — свежий след, 1 — растворился в земле
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float fade; varying float vFade;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = fade;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFade;')
    .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a *= 1. - vFade;');
};
{
  const m = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < PRINTS; i++) prints.setMatrixAt(i, m);
}
scene.add(prints);
let printNext = 0, printFade = 0;
const PM = new THREE.Matrix4(), PQ = new THREE.Quaternion(), PS = new THREE.Vector3(1, 1, 1), PP = new THREE.Vector3();
function stamp(p, yaw, deep) {
  const i = printNext; printNext = (printNext + 1) % PRINTS;
  PQ.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
  PS.setScalar(deep ? 1.1 : 0.95);
  prints.setMatrixAt(i, PM.compose(PP.set(p.x, 0.012, p.z), PQ, PS));
  printFadeAttr.array[i] = 0;
  printAge[i] = 0;
  prints.instanceMatrix.needsUpdate = printFadeAttr.needsUpdate = true;
}
function stepPrints(dt) {
  printFade += dt;
  if (printFade < 0.25) return; // выцветание раз в четверть секунды — дёшево
  for (let i = 0; i < PRINTS; i++) {
    if (printAge[i] > 40) continue;
    printAge[i] += printFade;
    printFadeAttr.array[i] = THREE.MathUtils.smoothstep(printAge[i], 6, 40); // 6 с свежий, к 40 с исчез
  }
  printFade = 0;
  printFadeAttr.needsUpdate = true;
}

// ---------- конь ----------
const V = new THREE.Vector3(), V2 = new THREE.Vector3();
const Qy = new THREE.Quaternion(), Qx = new THREE.Quaternion();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
let proto = null; // { scene, clips, native: {walk: м/с...}, fix }

async function loadModel() {
  const isFbx = M.file.toLowerCase().endsWith('.fbx');
  const res = await (isFbx ? new FBXLoader() : new GLTFLoader()).loadAsync(M.file, (e) => window.__loadProg?.('horse', e.loaded));
  const root = isFbx ? res : res.scene;
  const clips = {};
  for (const [k, name] of Object.entries(M.clips)) {
    if (!name) continue;
    const c = res.animations.find((a) => a.name === name || a.name.endsWith('|' + name));
    if (c) clips[k] = inPlace(c.clone(), root);
    if (c && k === 'rear') clips[k].tracks = clips[k].tracks.filter((t) => !/^(root|pelvis|spine_d+|thigh_|calf_|foot_|toe_)/.test(t.name));
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
  if (holder.getObjectByName('saddle_socket')) proto.blanket = buildBlanket(holder);
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

// Масти (множитель к текстуре гнедого коня): гнедой, рыжий, вороной, саврасый, тёмно-гнедой, светло-рыжий.
const COATS = [[1.7, 1.7, 1.7], [2.9, 1.6, 0.95], [0.75, 0.72, 0.72], [3.1, 2.6, 1.7], [1.2, 1.1, 1.05], [3.3, 2.2, 1.3]];

// Тоқым: красный, синий, зелёный войлок с золотым бордюром и «бараньими рогами» (қошқар мүйіз).
const feltCache = new Map();
function feltMat(felt) { // тоқым любого цвета команды (кэш по цвету)
  if (!feltCache.has(felt)) feltCache.set(felt, makeFelt(felt));
  return feltCache.get(felt);
}
const makeFelt = (felt) => new THREE.MeshStandardMaterial({
  map: canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = felt; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } // ворс войлока
    const gold = '#e2a83a';
    g.strokeStyle = gold; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24); // бордюр
    g.lineWidth = 3; g.strokeRect(30, 30, w - 60, h - 60);
    const horn = (x, y, s, flip) => { // қошқар мүйіз: ножка и два рога, закрученные наружу спиралью
      g.beginPath();
      g.moveTo(x, y + flip * s * 0.55); g.lineTo(x, y);
      for (const d of [1, -1]) {
        const cx = x + d * s * 0.42;
        g.moveTo(x, y);
        for (let t = 0; t <= 1.001; t += 0.04) {
          const ang = t * Math.PI * 2.3, r = s * 0.42 * (1 - 0.65 * t);
          g.lineTo(cx - d * r * Math.cos(ang), y - flip * r * Math.sin(ang));
        }
      }
      g.stroke();
    };
    g.lineWidth = 4;
    for (let x = 48; x < w - 30; x += 52) { horn(x, 24, 12, 1); horn(x, h - 24, 12, -1); }
    g.lineWidth = 6; // большая розетка по центру каждого бока
    for (const cx of [w * 0.27, w * 0.73]) { horn(cx, h / 2 - 6, 44, 1); horn(cx, h / 2 + 6, 44, -1); g.beginPath(); g.arc(cx, h / 2, 7, 0, 6.283); g.fillStyle = gold; g.fill(); }
  }),
  roughness: 0.95, side: THREE.DoubleSide,
});
const blanketMats = ['#a3242c', '#1f4f8f', '#2f6b3a', '#7a2a6e'].map(feltMat);

// Форма тоқыма по бокам коня: берём профиль туловища под седлом из позы покоя и отступаем на 1,5 см наружу.
function buildBlanket(holder) {
  holder.updateMatrixWorld(true);
  const sock = holder.getObjectByName('saddle_socket');
  const sp = holder.worldToLocal(sock.getWorldPosition(new THREE.Vector3()));
  let sm = null;
  holder.traverse((o) => { if (o.isSkinnedMesh) sm = o; });
  const pts = [], t = new THREE.Vector3();
  for (let i = 0; i < sm.geometry.attributes.position.count; i++) {
    sm.getVertexPosition(i, t); sm.localToWorld(t); holder.worldToLocal(t);
    if (Math.abs(t.z - sp.z) < 0.5 && t.y > sp.y - 0.55) pts.push(t.x, t.y, t.z);
  }
  const width = (y, z) => { // половина ширины туловища на высоте y и в сечении z
    let m = 0;
    for (let i = 0; i < pts.length; i += 3) if (Math.abs(pts[i + 2] - z) < 0.045 && Math.abs(pts[i + 1] - y) < 0.035) m = Math.max(m, Math.abs(pts[i]));
    return m;
  };
  const yTop = sp.y - 0.07, yBot = sp.y - 0.43, ROWS = 10, SIDE = 9;
  const pos = [], uv = [], idx = [];
  const cols = [];
  for (let j = SIDE; j >= 0; j--) cols.push([-1, j]);
  cols.push([0, SIDE + 1]);
  for (let j = 0; j <= SIDE; j++) cols.push([1, j]);
  for (let r = 0; r <= ROWS; r++) {
    const v = r / ROWS, z = sp.z - 0.36 + v * 0.62;
    // нижний край закруглён: к переду и заду тоқым короче
    const drop = 1 - 0.28 * Math.pow(Math.abs(v - 0.5) * 2, 2.5);
    cols.forEach(([side, j], c) => {
      let x, y;
      if (side === 0) { x = 0; y = sp.y - 0.02; } else {
        y = yTop - (yTop - yBot) * drop * (j / SIDE);
        x = side * (width(y, z) + 0.015);
      }
      pos.push(x, y, z);
      uv.push(c / (cols.length - 1), v);
    });
  }
  const C = cols.length;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < C - 1; c++) {
    const a = r * C + c, b = a + C;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
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
    this.push = new THREE.Vector3(); this.jolt = 0; // боковой отлёт и крен после толчка
    this.speedMul = 1; this.stunned = 0;
    const leg = (s) => ({ thigh: this.obj.getObjectByName('thigh_' + s), calf: this.obj.getObjectByName('calf_' + s), foot: this.obj.getObjectByName('foot_' + s), toe: this.obj.getObjectByName('toe_' + s) });
    this.hindLegs = ['L', 'R'].map(leg).filter((l) => l.thigh && l.calf && l.foot && l.toe);
    if (this.hindLegs.length < 2) this.hindLegs = null;
    // поза покоя задних ног: в верхней точке свечки их не пишет ни один клип, без сброса сгиб копится
    this.legRest = (this.hindLegs || []).flatMap((l) => [l.thigh, l.calf, l.foot]).map((b) => [b, b.quaternion.clone()]);
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
    // Масть: у каждого коня своя (гнедой, рыжий, вороной, саврасый…), у игрока — гнедой.
    const coat = COATS[i % COATS.length];
    this.obj.traverse((o) => { if (o.isMesh && o !== this.blanket && o.material?.color) { o.material = o.material.clone(); o.material.color.setRGB(...coat); } });
    // Тоқым — войлочный потник с орнаментом под седлом; держится за кость седла и качается вместе с ним.
    const sock = this.obj.getObjectByName('saddle_socket');
    if (proto.blanket && sock) {
      this.obj.updateMatrixWorld(true);
      this.blanket = new THREE.Mesh(proto.blanket, blanketMats[i % blanketMats.length]);
      this.blanket.castShadow = true; this.blanket.receiveShadow = true;
      this.tilt.add(this.blanket);
      this.blanket.updateMatrixWorld(true);
      sock.attach(this.blanket);
    }
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
    if (this.ai === 'wander') this.think(dt);
    // Скорость: разгон плавный, торможение сильнее; резкий стоп — ещё сильнее.
    // В свечке конь стоит и не поворачивает; выбранный аллюр включится, когда опустится.
    const rearing = this.rearClock != null;
    const target = rearing || this.stunned > 0 ? 0 : GAITS[this.gait].v * this.speedMul;
    this.stunned = Math.max(0, this.stunned - dt);
    const prev = this.v;
    const rate = this.halt > 0 ? 11 : target > this.v ? 2.6 + this.v * 0.12 : 5.5;
    this.v += THREE.MathUtils.clamp(target - this.v, -rate * dt, rate * dt);
    if (this.halt > 0 && this.v < 0.3) this.halt = 0;
    this.acc = THREE.MathUtils.lerp(this.acc, (this.v - prev) / Math.max(dt, 1e-4), 1 - Math.exp(-dt * 6));
    // Поворот: на галопе радиус шире, на месте — разворот шагом.
    const maxTurn = (this.v < 0.5 ? 1.3 : 2.4 / (1 + this.v * 0.22)) * (this.turnMul || 1);
    this.turn = THREE.MathUtils.lerp(this.turn, rearing ? 0 : this.steer * maxTurn, 1 - Math.exp(-dt * 5));
    this.yaw += this.turn * dt;
    const p = this.obj.position;
    p.x += Math.sin(this.yaw) * this.v * dt;
    p.z += Math.cos(this.yaw) * this.v * dt;
    // после толчка конь ещё немного едет боком, пока не погасит удар
    p.x += this.push.x * dt; p.z += this.push.z * dt;
    this.push.multiplyScalar(Math.exp(-dt * 3.5));
    this.jolt *= Math.exp(-dt * 5);
    // край поля: дальше не пускаем, конь упирается и разворачивается внутрь
    const ox = Math.abs(p.x) - BOUNDS.x, oz = Math.abs(p.z) - BOUNDS.z;
    if (ox > 0 || oz > 0) {
      if (ox > 0) p.x = Math.sign(p.x) * BOUNDS.x;
      if (oz > 0) p.z = Math.sign(p.z) * BOUNDS.z;
      V.set(-p.x, 0, -p.z); let d = Math.atan2(V.x, V.z) - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += Math.sign(d) * Math.min(Math.abs(d), dt * 1.6);
      this.v = Math.max(0, this.v - dt * 6);
    }
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
        // Переход там, где оба клипа ещё идут с естественной скоростью: шаг не ускорен вдвое, кентер не замедлен.
        const na = proto.native[ka], nb = proto.native[kb];
        const mid = na && nb ? THREE.MathUtils.clamp((na * 1.5 + nb * 0.6) / 2, va + 0.3, vb - 0.3) : (va + vb) / 2;
        const band = Math.min(0.3, (vb - va) * 0.22); // короткий: смесь двух аллюров даёт «висящую» ногу
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
    // Свечка: корпус поднимаем сами вокруг задних копыт (~40°, как у живой лошади), плавно вверх и плавно вниз.
    // Клип пака даёт только передние ноги, шею и голову: целиком он ставит коня вертикально и роняет рывком.
    let rearE = 0;
    if (this.rearClock != null) {
      this.rearClock += dt;
      const t = this.rearClock;
      rearE = THREE.MathUtils.smoothstep(t, 0, REAR_UP) * (1 - THREE.MathUtils.smoothstep(t, REAR_LEN - REAR_DOWN, REAR_LEN));
      if (t >= REAR_LEN) { this.rearClock = null; A.rear.stop(); }
      else {
        A.rear.weight = rearE;
        for (const k of Object.keys(w)) if (A[k]) A[k].weight = 0;
        A.idle.weight = 1 - rearE;
      }
    }
    // Резкий стоп: одноразовый клип, если он есть.
    if (A.halt) {
      if (this.halt > 0 && !A.halt.isRunning()) { A.halt.reset().play(); }
      A.halt.weight = this.halt > 0 ? 1 : 0;
    }
    for (const [b, q] of this.rest) b.quaternion.copy(q);
    for (const [b, q] of this.legRest) b.quaternion.copy(q);
    this.mixer.update(dt);
    // Шея и голова тяжёлые: догоняют позу клипа с небольшой задержкой, без рывков.
    if (!this.smooth) this.smooth = this.rest.map(([b]) => b.quaternion.clone());
    const kHead = 1 - Math.exp(-dt * (rearE > 0 ? 8 : 22));
    this.rest.forEach(([b], i) => { this.smooth[i].slerp(b.quaternion, kHead); b.quaternion.copy(this.smooth[i]); });
    // Процедурный слой поверх клипов: наклон в поворот, «приседание» при торможении, шея смотрит в поворот.
    const rollT = THREE.MathUtils.clamp(-this.turn * v * 0.045 + this.jolt, -0.32, 0.32); // + крен от толчка
    const pitchT = THREE.MathUtils.clamp(-this.acc * 0.012, -0.09, 0.05);
    this.roll = THREE.MathUtils.lerp(this.roll, rollT, 1 - Math.exp(-dt * 6));
    this.pitch = THREE.MathUtils.lerp(this.pitch, pitchT, 1 - Math.exp(-dt * 5));
    // Ось свечки — задние копыта: поворачиваем вокруг них, чтобы они стояли на месте.
    if (this.hindZ == null && this.hooves.length > 2) {
      this.obj.updateMatrixWorld(true);
      this.hindZ = this.hooves.slice(2).reduce((z, h) => z + this.obj.worldToLocal(h.b.getWorldPosition(V2)).z, 0) / 2;
    }
    const th = this.pitch - REAR_ANGLE * rearE, zp = this.hindZ ?? 0;
    this.tilt.rotation.set(th, 0, this.roll);
    this.tilt.position.set(0, rearE > 0 ? zp * Math.sin(th) : 0, rearE > 0 ? zp - zp * Math.cos(th) : 0);
    // В свечке конь садится на круп: бедро вперёд, скакательный сустав сгибается, пясть под себя.
    // Потом весь корпус сдвигаем так, чтобы задние копыта остались там, где стояли.
    if (rearE > 0 && this.hindLegs) {
      if (!this.hindAnchor) { this.obj.updateMatrixWorld(true); this.hindAnchor = this.hindLegs.map((l) => l.toe.getWorldPosition(new THREE.Vector3())); }
      for (const l of this.hindLegs) {
        l.thigh.quaternion.multiply(Qx.setFromAxisAngle(AX, 0.34 * rearE));
        l.calf.quaternion.multiply(Qx.setFromAxisAngle(AX, -0.7 * rearE));
        l.foot.quaternion.multiply(Qx.setFromAxisAngle(AX, 0.5 * rearE));
      }
      this.obj.updateMatrixWorld(true);
      V.set(0, 0, 0);
      this.hindLegs.forEach((l, k) => V.add(this.hindAnchor[k].clone().sub(l.toe.getWorldPosition(V2))));
      V.multiplyScalar(0.5).applyQuaternion(Qy.copy(this.obj.quaternion).invert()); // из мира в систему коня
      this.tilt.position.add(V);
    } else this.hindAnchor = null;
    const look = THREE.MathUtils.clamp(this.turn * 0.22, -0.35, 0.35);
    for (const n of this.neck) { Qy.setFromAxisAngle(AY, look / this.neck.length); n.quaternion.premultiply(Qy); }
    if (this.halt > 0 && this.head) { Qx.setFromAxisAngle(AX, -0.25 * this.halt); this.head.quaternion.multiply(Qx); }
    // Касание копыт: след на любом ходу, пыль с рыси, на галопе ещё комья.
    // Высоту «на земле» берём из стойки: у разных моделей кость копыта на разной высоте.
    if (v > 0.3) {
      this.obj.updateMatrixWorld(true);
      const base = this.hoofRest ?? 0.09;
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      for (const h of this.hooves) {
        h.b.getWorldPosition(V2);
        const low = V2.y < base + 0.035;
        if (low && !h.low) {
          stamp(V2, this.yaw, v > 5);
          if (v > 2.2) puff(V2, v, fx, fz);
          hoof(V2.x, V2.z, v);
          if (h === this.hooves[0] && v > 5) snort(V2.x, V2.z, 0.6 + v * 0.05); // выдох раз за шаг галопа
        }
        h.low = low;
      }
    } else if (this.hooves.length && this.rearClock == null) {
      this.obj.updateMatrixWorld(true);
      this.hoofRest = Math.min(...this.hooves.map((h) => h.b.getWorldPosition(V2).y));
    }
  }
  rear() {
    const a = this.act.rear;
    if (!a || this.rearClock != null || this.v > 1.5) return;
    this.gait = 0;
    a.reset().play();
    a.timeScale = a.getClip().duration / REAR_LEN;
    this.rearClock = 0;
    neigh(this.obj.position.x, this.obj.position.z); // иһаһаһа
  }
  scaleFor(k) {
    const nat = proto.native[k];
    if (!nat) return 1;
    return THREE.MathUtils.clamp(Math.max(this.v, 0.4) / nat, 0.55, M.maxScale || 1.5);
  }
}


// ---------- столкновения коней ----------
// Конь сверху — два круга (грудь и круп). Перекрытие растаскиваем, а по силе встречного удара
// оба теряют скорость, толкнутый отлетает вбок и кренится. onHit(a, b, imp, nx, nz) — для правил игры.
const BODY_R = 0.42, BODY_OFF = 0.55;
const CA = new THREE.Vector3(), CB = new THREE.Vector3(), N2 = new THREE.Vector3();
export function collide(horses, onHit) {
  for (let i = 0; i < horses.length; i++) for (let j = i + 1; j < horses.length; j++) {
    const a = horses[i], b = horses[j], pa = a.obj.position, pb = b.obj.position;
    if (Math.abs(pa.x - pb.x) > 3 || Math.abs(pa.z - pb.z) > 3) continue;
    let best = 0;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      CA.set(pa.x + Math.sin(a.yaw) * BODY_OFF * sa, 0, pa.z + Math.cos(a.yaw) * BODY_OFF * sa);
      CB.set(pb.x + Math.sin(b.yaw) * BODY_OFF * sb, 0, pb.z + Math.cos(b.yaw) * BODY_OFF * sb);
      const d = CA.distanceTo(CB), pen = BODY_R * 2 - d;
      if (pen > best) { best = pen; N2.subVectors(CB, CA).normalize(); if (d < 1e-4) N2.set(1, 0, 0); }
    }
    if (best <= 0) continue;
    pa.addScaledVector(N2, -best / 2); pb.addScaledVector(N2, best / 2);
    const va = a.v * (Math.sin(a.yaw) * N2.x + Math.cos(a.yaw) * N2.z);
    const vb = b.v * (Math.sin(b.yaw) * N2.x + Math.cos(b.yaw) * N2.z);
    const closing = va - vb;
    if (closing <= 0.3) continue;
    const imp = Math.min(closing, 9);
    // кто налетел (быстрее идёт навстречу), того отбрасывает меньше
    const aRams = va > -vb;
    a.push.addScaledVector(N2, -imp * (aRams ? 0.25 : 0.55));
    b.push.addScaledVector(N2, imp * (aRams ? 0.55 : 0.25));
    a.v = Math.max(0, a.v - imp * 0.35); b.v = Math.max(0, b.v - imp * 0.35);
    const side = (h, n) => Math.sign(Math.cos(h.yaw) * n.x - Math.sin(h.yaw) * n.z) || 1;
    a.jolt -= 0.05 * imp * side(a, N2); b.jolt += 0.05 * imp * side(b, N2);
    if (imp > 3) { a.pitch -= 0.04; b.pitch -= 0.04; }
    if (imp > 1) bump((pa.x + pb.x) / 2, (pa.z + pb.z) / 2, imp);
    if (onHit) onHit(a, b, imp, N2.x, N2.z);
  }
}
// круглое препятствие (казан): конь не заезжает внутрь, а упирается и съезжает по краю
export function pushOut(h, cx, cz, r) {
  const p = h.obj.position, dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz), min = r + 0.9;
  if (d >= min || d < 1e-4) return false;
  p.x = cx + (dx / d) * min; p.z = cz + (dz / d) * min;
  const into = -(Math.sin(h.yaw) * dx + Math.cos(h.yaw) * dz) / d; // доля скорости в стенку
  if (into > 0) { // не встаёт, а скользит вдоль насыпи: курс поворачивается по касательной
    const tx = -dz / d, tz = dx / d, s = Math.sin(h.yaw) * tx + Math.cos(h.yaw) * tz >= 0 ? 1 : -1;
    const want = Math.atan2(tx * s, tz * s);
    let dy = want - h.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    h.yaw += dy * 0.25;
    h.v *= 1 - into * 0.08;
  }
  return true;
}

// ---------- арены ----------
const ARENAS = {
  day: { sun: [-0.62, 0.5, 0.6], sunC: '#ffe0ad', sunI: 3.1, sky: '#bcd6f5', gnd: '#7a5c32', hemiI: 1.05, top: '#4a82c8', hor: '#dcd8cc', haze: '#b9c7d8', fog: 0.0015, exp: 1.05, snow: 0, stars: 0, glow: 1 },
  evening: { sun: [-0.86, 0.17, 0.48], sunC: '#ffb27a', sunI: 2.5, sky: '#d8c0b4', gnd: '#4a3a2c', hemiI: 0.9, top: '#4a5f98', hor: '#ecbc94', haze: '#cfa898', fog: 0.0017, exp: 1.02, snow: 0, stars: 0, glow: 1.6 },
  winter: { sun: [-0.5, 0.36, 0.72], sunC: '#fff2e0', sunI: 2.3, sky: '#dfe8f5', gnd: '#aab4c2', hemiI: 1.3, top: '#7fa3cf', hor: '#e4e9ef', haze: '#d8e0ea', fog: 0.0024, exp: 1.0, snow: 1, stars: 0, glow: 0.7, flakes: true },
  night: { sun: [0.25, 0.85, -0.35], sunC: '#f4f6ff', sunI: 0.9, sky: '#2c3a5c', gnd: '#141210', hemiI: 0.3, top: '#04081a', hor: '#1a2338', haze: '#141c2e', fog: 0.0026, exp: 1.1, snow: 0, stars: 1, glow: 0, flood: true },
};
const sunOff = new THREE.Vector3();
let flood = null, flakes = null;
function makeFlood() { // 4 мачты по углам поля: лампы светятся, свет — прожекторы на поле
  const g = new THREE.Group();
  const glowTex = canvasTex(64, 64, (c, w, h) => { const r = c.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,248,220,.7)'); r.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = r; c.fillRect(0, 0, w, h); });
  const poleMat = new THREE.MeshLambertMaterial({ color: '#7a7f88' }), headMat = new THREE.MeshBasicMaterial({ color: '#fffbe8' });
  for (const [x, z] of [[-74, -50], [74, -50], [-74, 50], [74, 50]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 26, 8), poleMat); pole.position.set(x, 13, z); g.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.5), headMat); head.position.set(x * 0.98, 26.5, z * 0.98); head.lookAt(0, 0, 0); g.add(head);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#fff6d8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    glow.scale.setScalar(22); glow.position.copy(head.position); g.add(glow);
    const sp = new THREE.SpotLight('#fff4e0', 9000, 180, 0.52, 0.65, 2); // свет мачты гаснет к краю поля
    sp.position.copy(head.position); sp.target.position.set(x * 0.2, 0, z * 0.2); g.add(sp, sp.target);
  }
  return g;
}
function makeFlakes() { // снег идёт: точки в коробке вокруг камеры
  const N = Q === 'low' ? 900 : 2400, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 70; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * 70; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.09, transparent: true, opacity: 0.85, depthWrite: false }));
  pts.frustumCulled = false;
  return pts;
}
let arena = 'day';
function setArena(id) {
  const A = ARENAS[id] || ARENAS.day;
  arena = ARENAS[id] ? id : 'day';
  SUN_DIR.set(...A.sun).normalize();
  sun.color.set(A.sunC); sun.intensity = A.sunI;
  farSun.color.set(A.sunC); farSun.intensity = A.sunI * 0.85; farSun.position.copy(SUN_DIR).multiplyScalar(1000);
  hemi.color.set(A.sky); hemi.groundColor.set(A.gnd); hemi.intensity = A.hemiI;
  farHemi.color.set(A.sky); farHemi.groundColor.set(A.gnd); farHemi.intensity = A.hemiI;
  skyMat.uniforms.top.value.set(A.top); HORIZON.set(A.hor); HAZE.set(A.haze);
  scene.fog.color.copy(HORIZON); scene.fog.density = A.fog;
  renderer.toneMappingExposure = A.exp;
  ENV.snow.value = A.snow; ENV.stars.value = A.stars; skyMat.uniforms.glow.value = A.glow;
  if (A.flood && !flood) { flood = makeFlood(); scene.add(flood); }
  if (flood) flood.visible = !!A.flood;
  if (A.flakes && !flakes) { flakes = makeFlakes(); scene.add(flakes); }
  if (flakes) flakes.visible = !!A.flakes;
}
// солнце (и тени) следует за местом действия
function followSun(x, z) {
  sunOff.copy(SUN_DIR).multiplyScalar(80);
  sun.position.set(x + sunOff.x, sunOff.y, z + sunOff.z);
  sun.target.position.set(x, 0, z);
}
function stepWorld(dt) {
  if (flakes?.visible) { // снежинки падают и кружатся, коробка ездит за камерой
    const a = flakes.geometry.attributes.position, t = skyMat.uniforms.time.value;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - dt * (1.1 + (i % 7) * 0.12);
      if (y < 0) y += 30;
      a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t * 0.9 + i) * dt * 0.35);
    }
    a.needsUpdate = true;
    flakes.position.set(camera.position.x, 0, camera.position.z);
  }
  stepDust(dt);
  wind.value += dt; skyMat.uniforms.time.value += dt; riverMat.uniforms.time.value += dt;
}
function onResize() {
  measure();
  renderer.setSize(view.w, view.h);
  camera.aspect = view.w / view.h;
  camera.updateProjectionMatrix();
  farCam.aspect = camera.aspect; farCam.updateProjectionMatrix();
  for (const P of particleSets) P.pts.material.uniforms.scale.value = view.h / 2;
}
const getProto = () => proto;
export { THREE, P, Q, renderer, scene, camera, sun, SUN_DIR, rnd, canvasTex, loadModel, loadTerrain, renderAll, getProto, feltMat, setArena, followSun, tuneRes, Horse, GAITS, riverDist, terrainH, stepWorld, onResize, puff };
