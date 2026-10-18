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
    file: 'models/warhorse-2048.glb', height: 1.75, maxScale: 1.9, gallop: 8.5, bright: 1.7,
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
const REAR_ANGLE = Number(P.get('rear') || 0.58); // свечка: наклон корпуса, рад (~33°)
const REAR_LEN = 3.0, REAR_UP = 0.85, REAR_DOWN = 0.9; // длительность, подъём, опускание, с

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

scene.add(new THREE.HemisphereLight('#bcd6f5', '#7a5c32', 1.05));
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
  uniforms: { top: { value: new THREE.Color('#4a82c8') }, bot: { value: HORIZON }, sunDir: { value: SUN_DIR }, time: { value: 0 }, clouds: { value: cloudTex } },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform float time; uniform sampler2D clouds; varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir);
      float h = max(d.y, 0.);
      vec3 col = mix(bot, top, smoothstep(0., .5, h));
      float s = max(dot(d, sunDir), 0.);
      col += vec3(1., .78, .5) * (pow(s, 6.) * .22 + pow(s, 300.) * 1.4);
      vec2 uv = d.xz / (d.y + .12) * .2 + vec2(time * .0005, time * .0002);
      float n = texture2D(clouds, uv).r * .7 + texture2D(clouds, uv * 2.7 + .37).r * .3;
      float c = smoothstep(.5, .74, n) * smoothstep(.02, .22, d.y);
      vec3 cloud = mix(vec3(.93, .9, .86), vec3(1., .93, .8), pow(s, 3.));
      col = mix(col, cloud, c * .85);
      gl_FragColor = vec4(col, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), skyMat));

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
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vW;')
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.)).xz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D macro; varying vec2 vW;')
    .replace('#include <map_fragment>', '#include <map_fragment>\nfloat mc = texture2D(macro, vW / 140.).r * .6 + texture2D(macro, vW / 37. + .3).r * .4;\ndiffuseColor.rgb *= mix(.78, 1.2, mc);');
};
const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Пучки ковыля: один InstancedMesh, три скрещённые плоскости.
const GRASS = { low: 0, medium: 7000, high: 18000 }[Q] ?? 7000;
const wind = { value: 0 }; // время для ветра в траве
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

// Горы на горизонте (Алатау): три слоя хребтов, снег выше линии, дальние тонут в дымке.
{
  const ridge = (a, L) => { // высота хребта по углу, бесшовно по кругу
    let h = 0;
    for (const [f, amp, ph] of [[3, 0.5, L], [7, 0.28, 1.3 + L], [13, 0.16, 2.1 * L], [29, 0.07, 0.7], [57, 0.035, 2.9]]) h += amp * (0.5 + 0.5 * Math.sin(a * f + ph));
    return Math.pow(h, 1.6);
  };
  const sky = new THREE.Color('#9fb6d2'), rock = new THREE.Color('#6f7f96'), snowC = new THREE.Color('#f4f6fa'), haze = HORIZON.clone();
  for (let L = 0; L < 3; L++) {
    const D = 520 + L * 190, HMAX = [95, 150, 210][L], SEG = 360, ROWS = 7;
    const pos = [], col = [], idx = [];
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const top = ridge(a, L) * HMAX + 6;
      const slope = ridge(a + 0.004, L) - ridge(a - 0.004, L); // склон к солнцу светлее
      const lit = THREE.MathUtils.clamp(0.5 + slope * 60 * Math.sign(Math.cos(a - 2.3)), 0.25, 1);
      for (let r = 0; r <= ROWS; r++) {
        const t = r / ROWS, y = -12 + (top + 12) * t;
        const jitter = Math.sin(a * 91 + r * 3.7) * 0.06;
        pos.push(Math.sin(a) * D, y, -Math.cos(a) * D);
        const c = rock.clone().lerp(sky, 0.25 + 0.2 * L).multiplyScalar(0.75 + 0.35 * lit);
        if (y > HMAX * (0.5 + jitter) && t > 0.55) c.copy(snowC).multiplyScalar(0.82 + 0.18 * lit).lerp(sky, 0.12 * L);
        c.lerp(haze, Math.min(1, Math.pow(1 - t, 3) * 0.9 + L * 0.12)); // у подножия дымка
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < SEG; i++) for (let r = 0; r < ROWS; r++) {
      const a = i * (ROWS + 1) + r, b = a + ROWS + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
    m.renderOrder = -1 - L;
    scene.add(m);
  }
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
    uniforms: { scale: { value: innerHeight / 2 } },
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
  const res = await (isFbx ? new FBXLoader() : new GLTFLoader()).loadAsync(M.file);
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
      if (M.bright && o.material?.color) o.material.color.multiplyScalar(M.bright); // светлее масть
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
    // В свечке конь стоит и не поворачивает; выбранный аллюр включится, когда опустится.
    const rearing = this.rearClock != null;
    const target = rearing ? 0 : GAITS[this.gait].v;
    const prev = this.v;
    const rate = this.halt > 0 ? 11 : target > this.v ? 2.6 + this.v * 0.12 : 5.5;
    this.v += THREE.MathUtils.clamp(target - this.v, -rate * dt, rate * dt);
    if (this.halt > 0 && this.v < 0.3) this.halt = 0;
    this.acc = THREE.MathUtils.lerp(this.acc, (this.v - prev) / Math.max(dt, 1e-4), 1 - Math.exp(-dt * 6));
    // Поворот: на галопе радиус шире, на месте — разворот шагом.
    const maxTurn = this.v < 0.5 ? 1.3 : 2.4 / (1 + this.v * 0.22);
    this.turn = THREE.MathUtils.lerp(this.turn, rearing ? 0 : this.steer * maxTurn, 1 - Math.exp(-dt * 5));
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
    this.mixer.update(dt);
    // Шея и голова тяжёлые: догоняют позу клипа с небольшой задержкой, без рывков.
    if (!this.smooth) this.smooth = this.rest.map(([b]) => b.quaternion.clone());
    const kHead = 1 - Math.exp(-dt * (rearE > 0 ? 8 : 22));
    this.rest.forEach(([b], i) => { this.smooth[i].slerp(b.quaternion, kHead); b.quaternion.copy(this.smooth[i]); });
    // Процедурный слой поверх клипов: наклон в поворот, «приседание» при торможении, шея смотрит в поворот.
    const rollT = THREE.MathUtils.clamp(-this.turn * v * 0.045, -0.2, 0.2);
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
        if (low && !h.low) { stamp(V2, this.yaw, v > 5); if (v > 2.2) puff(V2, v, fx, fz); }
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
  sun.position.set(p.x + SUN_DIR.x * 90, SUN_DIR.y * 90, p.z + SUN_DIR.z * 90);
  sun.target.position.set(p.x, 0, p.z);
}

// ---------- цикл ----------
const horses = [];
let camHold = false; // ?debug: камера стоит, где поставили (кадры сбоку)
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
  wind.value += dt; skyMat.uniforms.time.value += dt;
  if (!camHold) updateCamera(dt);
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
  for (const P of particleSets) P.pts.material.uniforms.scale.value = innerHeight / 2;
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
    horses, player, renderer, proto, GAITS, camera,
    side(dist = 5, h = 1.3, ang = Math.PI / 2) { camHold = true; const p = player.obj.position, a = player.yaw + ang; camera.position.set(p.x + Math.sin(a) * dist, h, p.z + Math.cos(a) * dist); camera.lookAt(p.x, 1.1, p.z); camera.fov = 50; camera.updateProjectionMatrix(); },
    freeze(f) { frozen = f; if (!f) { last = performance.now(); requestAnimationFrame(frame); } },
    step(n, dt) { for (let i = 0; i < n; i++) step(dt); renderer.render(scene, camera); },
    warm(sec) { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60); updateCamera(0, true); },
    stats: () => ({ fps, tris: renderer.info.render.triangles, calls: renderer.info.render.calls, v: player.v, native: proto.native, clips: Object.keys(proto.clips) }),
  };
}
