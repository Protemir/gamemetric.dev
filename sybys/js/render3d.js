// The steppe in 3D (three.js): the map's height field with real sun and shadows, the tribes' colours
// painted onto the ground, a river of water, yurts built in code, birches and bushes, sheep and grazing
// herds, riders on galloping horses (Quaternius models, CC0). What the player must read — routes,
// the hand, marks, little words — is drawn on the 2D canvas on top, by the 2D view's own code.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/loaders/GLTFLoader.js';
import * as SkeletonUtils from '../vendor/three/utils/SkeletonUtils.js';
import { mergeGeometries } from '../vendor/three/utils/BufferGeometryUtils.js';
import { EffectComposer } from '../vendor/three/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/postprocessing/RenderPass.js';
import { OutputPass } from '../vendor/three/postprocessing/OutputPass.js';
import { GW, GH, K } from './map.js';
// how far a point lies past the edge of the khan's land (negative inside), with a ragged line
const FAR_GLSL = (xz, muv, ph2) => `
    vec2 qq = abs(${xz}) - vec2(19.2, 10.8);
    float sd = length(max(qq, 0.0)) + min(max(qq.x, qq.y), 0.0);
    float rag = (dot(texture2D(grass, ${muv} * vec2(0.9, 0.5) + 0.61).rgb, vec3(0.3, 0.59, 0.11)) - 0.2) * 14.0 + (dot(${ph2}, vec3(0.3, 0.59, 0.11)) - 0.2) * 6.0;
    float far = smoothstep(-0.3, 8.0, sd + rag * 1.2);`;
const BEYOND_GLSL = (v) => `
    float lb = dot(${v}, vec3(0.3, 0.59, 0.11));
    ${v} = mix(${v}, mix(vec3(lb), ${v}, 0.5) * vec3(0.6, 0.64, 0.7), far * 0.9);`;
const TERR_HEAD = 'uniform sampler2D idTex;\nuniform sampler2D edgeTex;\nuniform sampler2D pal;\nuniform float uHR;\nuniform float uWash;\nuniform float uPhoto;\n';
const TERR_BODY = `  {
    float rid = floor(texture2D(idTex, vMapUv).r * 255.0 + 0.5);
    vec4 ed = texture2D(edgeTex, vMapUv);
    float dT = ed.r * 32.0 / uHR, dR = ed.g * 32.0 / uHR;
    float pu = (rid + 0.5) / 32.0;
    vec4 p0 = texture2D(pal, vec2(pu, 0.5 / 3.0));
    vec4 p1 = texture2D(pal, vec2(pu, 1.5 / 3.0));
    vec4 p2 = texture2D(pal, vec2(pu, 2.5 / 3.0));
    vec3 ph = texture2D(grass, vMapUv * vec2(RX, 14.0)).rgb;
    vec3 ph2 = texture2D(grass, vMapUv * vec2(2.3, 1.3) + 0.37).rgb;
    vec3 photo = ph * 0.6 + ph2 * 0.4;
    float pl = max(dot(photo, vec3(0.3, 0.59, 0.11)), 0.02);
    vec3 ground = diffuseColor.rgb;
    float gl0 = dot(ground, vec3(0.3, 0.59, 0.11));
    float rim = min(min(vMapUv.x, 1.0 - vMapUv.x) * 1.78, min(vMapUv.y, 1.0 - vMapUv.y));
    float wsh = uWash * smoothstep(0.004, 0.045, rim + (dot(ph2, vec3(0.3, 0.59, 0.11)) - 0.18) * 0.12);
    ground = mix(ground, photo * 2.0 * clamp(gl0 / 0.3, 0.75, 1.2), uPhoto);
    ground = mix(ground, ground * vec3(0.8, 1.0, 0.86), step(0.7, uPhoto) * (0.6 + 0.4 * smoothstep(0.1, 0.3, dot(ph2, vec3(0.3, 0.59, 0.11)))));
    float gl = dot(ground, vec3(0.3, 0.59, 0.11));
    vec3 tint = pow(p0.rgb, vec3(2.2));
    vec3 col = mix(ground, tint * (0.25 + gl * 2.1), p0.a * wsh);
    vec3 edgeC = pow(p1.rgb, vec3(2.2));
    float band = 1.0 - smoothstep(0.0, 9.0, dT);
    col = mix(col, edgeC * (0.3 + gl * 2.0), band * band * 0.72 * wsh);
    float line = 1.0 - smoothstep(0.35, 1.1, dT);
    col = mix(col, edgeC * 1.25 + 0.04, line * 0.95 * wsh);
    float seam = 1.0 - smoothstep(0.1, 0.6, dR);
    col *= 1.0 - seam * 0.32 * wsh;
    col = mix(col, vec3(1.0, 0.8, 0.45), p1.a);
    col = mix(col, col * 1.2 + vec3(0.03, 0.025, 0.012), p2.r);
    col = mix(col, vec3(1.0, 0.78, 0.36), p2.r * (1.0 - smoothstep(0.25, 1.2, dR)) * 0.95);
    col = mix(col, vec3(0.03, 0.022, 0.016), p2.g);
    float cl0 = dot(col, vec3(0.3, 0.59, 0.11));
    col = max(mix(vec3(cl0), col, 1.1), 0.0);
    vec2 wxz = vec2((vMapUv.x - 0.5) * 38.4, (0.5 - vMapUv.y) * 21.6);` + FAR_GLSL('wxz', 'vMapUv', 'ph2') + BEYOND_GLSL('col') + `
    diffuseColor.rgb = col;
  }
`;
import { riderPos } from './sim.js';
import { View, TRIBE_RGB, GOLD, tamga } from './render.js';
import { clamp, rng, valueNoise } from './util.js';

const W = 38.4, D = 21.6; // world size of the map

// felt: a soft mottle, never flat
function mottle(x, w, h, n, a) {
  for (let i = 0; i < n; i++) {
    x.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(90,70,50,${a})`;
    x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
}
// the wall: white felt over the lattice above, a patterned reed mat (shi) round the foot, dust at the ground
function drawWall(x, w, h) {
  x.fillStyle = '#ece4d2';
  x.fillRect(0, 0, w, h);
  mottle(x, w, h, 900, 0.08);
  x.strokeStyle = 'rgba(120,90,60,0.07)';
  x.lineWidth = 2;
  for (let i = -h; i < w + h; i += 18) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + h * 0.6, h * 0.62); x.stroke();
    x.beginPath(); x.moveTo(i, h * 0.62); x.lineTo(i + h * 0.6, 0); x.stroke();
  }
  const top = Math.round(h * 0.62);
  x.fillStyle = '#d6c193';
  x.fillRect(0, top, w, h - top);
  x.strokeStyle = 'rgba(110,80,40,0.28)';
  x.lineWidth = 1;
  for (let i = 0; i < w; i += 3) { x.beginPath(); x.moveTo(i + 0.5, top); x.lineTo(i + 0.5, h); x.stroke(); }
  // the shi pattern: stepped diamonds in madder red and indigo
  const mid = top + (h - top) * 0.45, r = (h - top) * 0.32;
  for (let i = 0; i < w; i += r * 2.4) {
    for (const [c, k] of [['#8e3a22', 1], ['#2f4a5e', 0.55]]) {
      x.fillStyle = c;
      x.beginPath(); x.moveTo(i, mid - r * k); x.lineTo(i + r * k, mid); x.lineTo(i, mid + r * k); x.lineTo(i - r * k, mid); x.closePath(); x.fill();
    }
  }
  x.fillStyle = '#8e3a22';
  x.fillRect(0, top, w, 3);
  const dust = x.createLinearGradient(0, h - 14, 0, h);
  dust.addColorStop(0, 'rgba(80,60,40,0)');
  dust.addColorStop(1, 'rgba(80,60,40,0.5)');
  x.fillStyle = dust;
  x.fillRect(0, h - 14, w, 14);
}
// the roof: felt panels, ropes tied over them crosswise, soot near the crown, a shadow under the eave
function drawRoof(x, w, h) {
  x.fillStyle = '#e6dcc6';
  x.fillRect(0, 0, w, h);
  mottle(x, w, h, 1400, 0.07);
  x.strokeStyle = 'rgba(140,120,90,0.3)';
  x.lineWidth = 2;
  for (let i = 0; i < w; i += w / 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
  x.strokeStyle = 'rgba(95,65,40,0.6)';
  x.lineWidth = 3;
  for (let i = -w; i < w * 2; i += w / 6) {
    x.beginPath(); x.moveTo(i, h); x.lineTo(i + w / 4, 0); x.stroke();
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + w / 4, h); x.stroke();
  }
  const soot = x.createLinearGradient(0, 0, 0, h * 0.3);
  soot.addColorStop(0, 'rgba(50,40,32,0.55)');
  soot.addColorStop(1, 'rgba(50,40,32,0)');
  x.fillStyle = soot;
  x.fillRect(0, 0, w, h * 0.3);
  const eave = x.createLinearGradient(0, h * 0.9, 0, h);
  eave.addColorStop(0, 'rgba(60,45,30,0)');
  eave.addColorStop(1, 'rgba(60,45,30,0.35)');
  x.fillStyle = eave;
  x.fillRect(0, h * 0.9, w, h * 0.1);
}
// the crown seen from above: the smoke hole, the crossed arches, the wooden ring
function drawCrown(x, w, h) {
  x.fillStyle = '#18110c';
  x.fillRect(0, 0, w, h);
  x.strokeStyle = '#9a7650';
  x.lineWidth = 7;
  for (const o of [-22, 0, 22]) {
    x.beginPath(); x.moveTo(w / 2 + o, 6); x.lineTo(w / 2 + o, h - 6); x.stroke();
    x.beginPath(); x.moveTo(6, h / 2 + o); x.lineTo(w - 6, h / 2 + o); x.stroke();
  }
  x.strokeStyle = '#5a3c22';
  x.lineWidth = 10;
  x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2); x.stroke();
}
// the door: a carved wooden leaf in red with a gold pattern, in a dark frame
function drawDoor(x, w, h) {
  x.fillStyle = '#3e2816';
  x.fillRect(0, 0, w, h);
  x.fillStyle = '#b4502a';
  x.fillRect(6, 6, w - 12, h - 12);
  x.strokeStyle = '#e2b452';
  x.lineWidth = 2;
  x.strokeRect(10, 10, w - 20, h / 2 - 14);
  x.strokeRect(10, h / 2 + 4, w - 20, h / 2 - 14);
  for (const cy of [h / 4 + 2, (h * 3) / 4 - 2]) {
    x.beginPath(); x.moveTo(w / 2, cy - 9); x.lineTo(w / 2 + 9, cy); x.lineTo(w / 2, cy + 9); x.lineTo(w / 2 - 9, cy); x.closePath(); x.stroke();
  }
}
// the band (baskur): ram's-horn curls in light on the clan's colour
function drawBand(x, w, h) {
  x.fillStyle = 'rgb(150,150,150)';
  x.fillRect(0, 0, w, h);
  x.strokeStyle = '#ffffff';
  x.lineWidth = 2.5;
  for (let i = 0; i < w; i += 32) {
    x.beginPath(); x.arc(i + 10, h / 2, 6, Math.PI * 0.2, Math.PI * 1.6); x.stroke();
    x.beginPath(); x.arc(i + 22, h / 2, 6, Math.PI * 1.2, Math.PI * 2.6); x.stroke();
  }
  x.fillStyle = 'rgba(255,255,255,0.9)';
  x.fillRect(0, 1, w, 2);
  x.fillRect(0, h - 3, w, 2);
}
// a person: a long coat (chapan), a face, a felt kalpak; standing or sitting on the ground
function personParts(sit) {
  const paint = (geo, hex) => {
    const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  };
  const lift = sit ? -0.035 : 0;
  const coat = sit ? new THREE.CylinderGeometry(0.02, 0.038, 0.05, 7).translate(0, 0.025, 0) : new THREE.CylinderGeometry(0.016, 0.032, 0.085, 7).translate(0, 0.0425, 0);
  const head = mergeGeometries([
    paint(new THREE.SphereGeometry(0.016, 7, 5).translate(0, 0.097 + lift, 0), '#c49572').toNonIndexed(),
    paint(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 8).translate(0, 0.108 + lift, 0), '#2a2018').toNonIndexed(),
    paint(new THREE.CylinderGeometry(0.006, 0.018, 0.03, 7).translate(0, 0.124 + lift, 0), '#ece6d6').toNonIndexed(),
  ]);
  return { coat, head };
}
const COATS = ['#7a2a2a', '#2f4a6a', '#5a4a2a', '#3a5a3a', '#6a4a6a', '#8a6a3a', '#4a3a30', '#6a2a1e'];
const WATER = 0.34;
const LIE = [70, 36, 86];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const toWorldX = (x) => (x / GW - 0.5) * W;
const toWorldZ = (y) => (y / GH - 0.5) * D;

export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// models load in the background; the map works without them and they appear when ready
const MODELS = {};
const loading = (() => {
  const loader = new GLTFLoader();
  const base = new URL('../models/', import.meta.url).href;
  const one = (name) => loader.loadAsync(base + name + '.glb').then((g) => (MODELS[name] = g)).catch(() => null);
  return Promise.all(['horse', 'sheep', 'birch', 'bush', 'rock'].map(one));
})();
export const modelsReady = loading;

export class View3D extends View {
  constructor(canvas) {
    super(canvas);
    this.is3d = true;
    this.tintMix = 0.74; // light and tone mapping wash colour out: paint it stronger
    const gl = document.createElement('canvas');
    gl.id = 'world';
    canvas.parentNode.insertBefore(gl, canvas);
    this.glCanvas = gl;
    const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 600;
    this.mobile = mobile;
    this.renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; // the shadows are redrawn every other frame: nobody sees the difference
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 200);
    this.ray = new THREE.Raycaster();
    this.clock3 = 0;
    this.setupWorld();
    // the frame goes through a render target (with its own smoothing of edges): drawn straight to the screen,
    // the animated horses and sheep vanished now and then on a laptop's own graphics. No bloom: it halved the
    // frame rate there. The edges darken by a CSS veil.
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new OutputPass());
    this.veil();
    loading.then(() => { if (this.disposed) return; this.modelsLoaded = true; if (this.map) this.populate(this.lastG); });
  }

  veil() {
    if (this.veilEl) return;
    this.veilEl = document.createElement('div');
    this.veilEl.className = 'veil';
    this.glCanvas.after(this.veilEl);
  }

  setupWorld() {
    const { scene } = this;
    // late afternoon: a warm low sun from the west, long shadows, a blue-grey haze far off
    const haze = new THREE.Color('#c9c3b4');
    this.haze = haze;
    this.sky = this.skyTexture();
    scene.background = haze;
    scene.fog = new THREE.Fog(haze, 40, 150);
    const hemi = new THREE.HemisphereLight('#e4ecf4', '#6a5a40', 0.95);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#ffd9a6', 3.0);
    sun.position.set(-22, 15, -7);
    sun.castShadow = true;
    const S = this.mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(S, S);
    Object.assign(sun.shadow.camera, { left: -23, right: 23, top: 15, bottom: -15, near: 1, far: 70 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
    this.sun = sun;
    // under everything, in case the eye finds a gap
    const far = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: '#8f8460', roughness: 1 }));
    far.rotation.x = -Math.PI / 2;
    far.position.y = -0.4;
    scene.add(far);
    this.grassTex = new THREE.TextureLoader().load(new URL('../textures/grass.jpg', import.meta.url).href);
    this.grassTex.wrapS = this.grassTex.wrapT = THREE.RepeatWrapping;
    this.grassTex.colorSpace = THREE.SRGBColorSpace;
    this.zoom = 1;
    this.pan = new THREE.Vector3();
  }

  skyTexture() {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#2a2347');
    gr.addColorStop(0.35, '#6d4a6a');
    gr.addColorStop(0.62, '#d9895a');
    gr.addColorStop(0.8, '#f2c27a');
    gr.addColorStop(1, '#f2c27a');
    x.fillStyle = gr;
    x.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // the title screen: golden hour, the camera low over the Orda, a riderless horse wandering
  setStyle(key) {
    if (key === this.style) return;
    super.setStyle(key);
    if (!this.cinema) { this.cinema = true; this.setCinema(false); }
  }

  setCinema(on) {
    if (this.cinema === on) return;
    this.cinema = on;
    if (this.terrWash) this.terrWash.value = on ? 0 : 1;
    const s = this.scene;
    if (on) {
      s.background = this.sky;
      s.fog.color.set('#e0a874');
      this.sun.position.set(-26, 6.5, -14);
      this.sun.color.set('#ffb070');
      this.sun.intensity = 3.4;
      this.cineT = 0;
    } else {
      this.haze.set({ summer: '#c9c3b4', autumn: '#d2bf9c', winter: '#cdd6e0' }[this.style] || '#c9c3b4');
      s.background = this.haze;
      s.fog.color.copy(this.haze);
      this.sun.position.set(-22, 15, -7);
      this.sun.color.set('#ffd9a6');
      this.sun.intensity = 3.0;
      if (this.loneHorse) this.loneHorse.root.visible = false;
      this.applyCam();
    }
  }

  cinemaCam(g, dt) {
    this.cineT += dt;
    const o = g.map.regions[0];
    const cx = toWorldX(o.x), cz = toWorldZ(o.y), cy = this.height(o.x, o.y);
    // the camera swings slowly south of the Orda and looks past it, north, to the mountains
    const a = -0.5 + Math.sin(this.cineT * 0.04) * 0.55;
    const R = this.rot ? 12 : 10;
    const cam = this.camera;
    cam.position.set(cx + Math.sin(a) * R, cy + 2.3 + Math.sin(this.cineT * 0.2) * 0.12, cz + Math.cos(a) * R);
    cam.up.set(0, 1, 0);
    cam.lookAt(cx - Math.sin(a) * 9, cy + 2.6, cz - Math.cos(a) * 9);
    cam.updateMatrixWorld();
    this.scene.fog.near = 14;
    this.scene.fog.far = 150;
    // the horse without its rider walks slowly round the Orda
    if (MODELS.horse) {
      if (!this.loneHorse) {
        this.loneHorse = this.makeHorse('#4a2c18');
        this.loneHorse.play('Walk');
        this.loneHorse.root.scale.multiplyScalar(1.4);
        this.group.add(this.loneHorse.root);
      }
      const h = this.loneHorse;
      h.root.visible = true;
      if (h.root.parent !== this.group) this.group.add(h.root);
      const b = this.cineT * 0.05 + 1.2, rr = 2.4;
      const x = cx + Math.sin(b) * rr, z = cz + Math.cos(b) * rr;
      const gx = (x / W + 0.5) * GW, gy = (z / D + 0.5) * GH;
      h.root.position.set(x, this.height(gx, gy), z);
      h.root.rotation.y = b + Math.PI / 2;
      h.mixer.update(dt * 0.9);
    }
  }

  // a slow device: sharpness down to 1, softer and cheaper shadows, no grass tufts, no walkers
  lighter() {
    this.lite = (this.lite || 0) + 1;
    this.veil();
    if (this.lite === 1) {
      if (this.grassMesh) this.grassMesh.visible = false;
      for (const m of this.folkMeshes || []) m.visible = false;
      for (const s of this.sheep || []) s.traverse((m) => { if (m.isMesh) m.castShadow = false; });
      this.sharp = Math.min(this.sharp || 2, 1.5);
    } else {
      this.sharp = 1;
    }
    // the shadow map is never rebuilt here: rebuilding it lost every animated horse and sheep
    this.renderer.setPixelRatio(Math.min(this.sharp, window.devicePixelRatio || 1));
    this.renderer.setSize(this.w, this.h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(this.w, this.h);
  }

  paint3d() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  // give the screen back to the 2D map
  dispose() {
    this.disposed = true;
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.glCanvas.remove();
  }

  // —— the camera looks at the map from the south, tilted; on an upright phone from the east ——
  resize() {
    super.resize();
    const w = this.w, h = this.h;
    this.renderer.setPixelRatio(Math.min(this.sharp || 2, window.devicePixelRatio || 1));
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
    this.glCanvas.style.width = w + 'px';
    this.glCanvas.style.height = h + 'px';
    const cam = this.camera;
    cam.aspect = w / h;
    // aim at the middle of the free area between the bars
    cam.setViewOffset(w, h, 0, -(this.top - this.bottom) / 2, w, h); // the image itself shifts; projections already include it
    cam.updateProjectionMatrix();
    const availW = w - 16, availH = h - this.top - this.bottom;
    this.rot = availH > availW * 1.15;
    const tilt = 0.95; // radians from the ground
    const dir = this.rot ? new THREE.Vector3(Math.cos(tilt), Math.sin(tilt), 0) : new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt));
    const target = new THREE.Vector3(0, 0.8, this.rot ? 0 : 0.6);
    const corners = [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]].map(([x, z]) => new THREE.Vector3(x, 0.6, z));
    const fits = (d) => {
      cam.position.copy(target).addScaledVector(dir, d);
      cam.up.set(this.rot ? -1 : 0, this.rot ? 0 : 1, this.rot ? 0 : -1).set(0, 1, 0);
      cam.lookAt(target);
      cam.updateMatrixWorld();
      return corners.every((c) => {
        const p = c.clone().project(cam);
        const sx = (p.x * 0.5 + 0.5) * w, sy = (-p.y * 0.5 + 0.5) * h;
        return sx >= 4 && sx <= w - 4 && sy >= this.top - 2 && sy <= h - this.bottom + 2;
      });
    };
    let lo = 5, hi = 200;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; fits(m) ? (hi = m) : (lo = m); }
    this.base = { dir, target, d: hi * (this.rot ? 0.95 : 0.96) };
    this.u1 = 0;
    this.applyCam();
  }

  // zoom 1 shows the whole map; closer, the camera may slide but never off the map
  applyCam() {
    const cam = this.camera, b = this.base;
    if (!b) return;
    this.zoom = clamp(this.zoom, 1, 4);
    const free = 1 - 1 / this.zoom;
    this.pan.x = clamp(this.pan.x, (-W / 2) * free, (W / 2) * free);
    this.pan.z = clamp(this.pan.z, (-D / 2) * free - 1, (D / 2) * free);
    const d = b.d / this.zoom;
    const target = b.target.clone().add(this.pan);
    cam.position.copy(target).addScaledVector(b.dir, d);
    cam.up.set(0, 1, 0);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    this.scene.fog.near = d * 1.4 + 10;
    this.scene.fog.far = d * 1.4 + 120;
    // sprite unit for the overlay: pixels per "old cell" at the middle of the view; it grows with zoom, but not too much
    const a = this.project(target.x, 0.6, target.z), c = this.project(target.x + toWorldX(GW / 2 + K) - toWorldX(GW / 2), 0.6, target.z);
    const u = Math.max(4, Math.hypot(c[0] - a[0], c[1] - a[1]) * 1.6);
    if (this.zoom === 1 || !this.u1) this.u1 = u;
    this.u = Math.min(u, this.u1 * 1.7);
    this.s = this.u / (K * 1.6);
    this.ox = 0;
    this.oy = 0;
  }

  // the point of the ground under a screen point (on the plane of the steppe)
  groundAt(px, py) {
    const ndc = new THREE.Vector2((px / this.w) * 2 - 1, -(py / this.h) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8), p) ? p : null;
  }

  // drag: the ground under the finger stays under the finger
  panBy(x0, y0, x1, y1) {
    const a = this.groundAt(x0, y0), b = this.groundAt(x1, y1);
    if (!a || !b) return;
    this.pan.x += a.x - b.x;
    this.pan.z += a.z - b.z;
    this.applyCam();
  }

  // zoom towards the point under the cursor or between the fingers
  zoomAt(px, py, k) {
    const before = this.groundAt(px, py);
    this.zoom *= k;
    this.applyCam();
    const after = this.groundAt(px, py);
    if (before && after) {
      this.pan.x += before.x - after.x;
      this.pan.z += before.z - after.z;
      this.applyCam();
    }
  }

  resetCam() {
    this.zoom = 1;
    this.pan.set(0, 0, 0);
    this.applyCam();
  }

  project(X, Y, Z) {
    const p = new THREE.Vector3(X, Y, Z).project(this.camera);
    return [(p.x * 0.5 + 0.5) * this.w, (-p.y * 0.5 + 0.5) * this.h];
  }

  height(x, y) {
    const h = this.hgt;
    if (!h) return 0.6;
    x = clamp(x, 0, GW - 1.001);
    y = clamp(y, 0, GH - 1.001);
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const i = iy * GW + ix;
    return (h[i] * (1 - fx) + h[i + 1] * fx) * (1 - fy) + (h[i + GW] * (1 - fx) + h[i + GW + 1] * fx) * fy;
  }

  landHeight(X, Z) {
    const L = this.landGrid;
    if (!L) return 0.6;
    const f = (v) => clamp((v / L.SIZE + 0.5) * L.N, 0, L.N - 1.001);
    const fx = f(X), fz = f(Z), i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const y = (a, b) => L.pos[((j + b) * (L.N + 1) + i + a) * 3 + 1];
    return (y(0, 0) * (1 - tx) + y(1, 0) * tx) * (1 - tz) + (y(0, 1) * (1 - tx) + y(1, 1) * tx) * tz;
  }

  toScreen(x, y) {
    return this.project(toWorldX(x), Math.max(WATER, this.height(x, y)), toWorldZ(y));
  }

  regionAt(g, px, py) {
    if (!this.terrain) return -1;
    const ndc = new THREE.Vector2((px / this.w) * 2 - 1, -(py / this.h) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const hit = this.ray.intersectObject(this.terrain, false)[0];
    if (!hit) return -1;
    const x = Math.floor((hit.point.x / W + 0.5) * GW), y = Math.floor((hit.point.z / D + 0.5) * GH);
    if (x < 0 || y < 0 || x >= GW || y >= GH) return -1;
    return g.map.cell[y * GW + x];
  }

  // —— one map: ground, water, yurts, plants, herds ——
  prepare(g) {
    super.prepare(g); // the 2D view's ground colours and decorations are reused
    const map = g.map;
    if (this.group) {
      this.scene.remove(this.group);
      const keep = new Set([this.grassTex, this.puffTex, this.cloudsTex].filter(Boolean));
      this.group.traverse((o) => {
        o.geometry?.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of mats) {
          for (const k of ['map', 'normalMap']) if (m[k] && !keep.has(m[k])) m[k].dispose();
          m.dispose();
        }
      });
      this.tex?.dispose();
      this.riderObjs?.clear();
      this.loneHorse = null;
    }
    this.group = new THREE.Group();
    this.scene.add(this.group);
    const { elev, river } = map;
    const n = GW * GH;
    // distance to the river again, for carving its bed
    const near = new Float32Array(n).fill(99);
    for (let i = 0; i < n; i++) if (river[i]) near[i] = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        if (x > 0) near[i] = Math.min(near[i], near[i - 1] + 1);
        if (y > 0) near[i] = Math.min(near[i], near[i - GW] + 1);
      }
      for (let y = GH - 1; y >= 0; y--) for (let x = GW - 1; x >= 0; x--) {
        const i = y * GW + x;
        if (x < GW - 1) near[i] = Math.min(near[i], near[i + 1] + 1);
        if (y < GH - 1) near[i] = Math.min(near[i], near[i + GW] + 1);
      }
    }
    const hgt = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let h = 0.55 + elev[i] * 1.7;
      const bank = smooth(0.4 * K, 4 * K, near[i]);
      h = (WATER - 0.22) * (1 - bank) + Math.max(h, WATER + 0.12) * bank;
      hgt[i] = h;
    }
    // soften the steps between cells
    for (let pass = 0; pass < 2; pass++) {
      const c = hgt.slice();
      for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
        const i = y * GW + x;
        hgt[i] = (c[i] * 4 + c[i - 1] + c[i + 1] + c[i - GW] + c[i + GW]) / 8;
      }
    }
    this.hgt = hgt;

    // the ground: one mesh, the painted map as its colour, a fine grain on top
    const segX = GW / 2, segZ = GH / 2;
    const geo = new THREE.PlaneGeometry(W, D, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const x = (pos.getX(k) / W + 0.5) * GW, y = (pos.getZ(k) / D + 0.5) * GH;
      pos.setY(k, this.height(x, y));
    }
    geo.computeVertexNormals();
    this.buildTerritory(g);
    const mat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.95, metalness: 0 });
    this.withGrass(mat, true);
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.group.add(this.terrain);

    // water: a sheet at one level; the carved bed shows only where the river is
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 120, D + 120, 1, 1),
      new THREE.MeshStandardMaterial({ color: this.style === 'winter' ? '#9cc0d4' : '#2a5f88', roughness: this.style === 'winter' ? 0.45 : 0.1, metalness: 0.3, transparent: true, opacity: 0.93, normalMap: this.rippleTexture(), normalScale: new THREE.Vector2(0.6, 0.6) }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = WATER;
    water.material.normalMap.repeat.set(66, 50);
    this.water = water;
    this.group.add(water);
    this.buildLand(g);

    this.buildYurts(g);
    this.buildGrass(g);
    this.buildFolk(g);
    this.buildFires(g);
    this.buildBirds();
    this.buildRings(g);
    this.buildFlags(g);
    this.riderObjs = new Map();
    this.smoke = [];
    if (this.modelsLoaded) this.populate(g);
  }

  // the photo of grass and stones (Poly Haven, CC0) gives the ground its grain; only its light and dark
  // are used on the map, so the clans' colours stay true
  buildTerritory(g) {
    const map = g.map, HR = this.mobile ? 3 : 4, w = GW * HR, h = GH * HR;
    const R = map.regions, cell = map.cell;
    // the natural ground, as the 2D view coloured it
    const gc = document.createElement('canvas');
    gc.width = GW; gc.height = GH;
    const gx = gc.getContext('2d'), gi = gx.createImageData(GW, GH);
    for (let i = 0; i < GW * GH; i++) {
      for (let k = 0; k < 3; k++) gi.data[i * 4 + k] = clamp(this.ter[i * 3 + k], 0, 255);
      gi.data[i * 4 + 3] = 255;
    }
    gx.putImageData(gi, 0, 0);
    this.tex = new THREE.CanvasTexture(gc);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    // whose pasture each fine point is: the same warped Voronoi as the map, read between the cells
    const { pts, wx, wy, fine } = map.warp;
    const at = (a, x, y) => {
      const x0 = clamp(Math.floor(x), 0, GW - 1), y0 = clamp(Math.floor(y), 0, GH - 1);
      const x1 = Math.min(GW - 1, x0 + 1), y1 = Math.min(GH - 1, y0 + 1);
      const tx = clamp(x - x0, 0, 1), ty = clamp(y - y0, 0, 1);
      return (a[y0 * GW + x0] * (1 - tx) + a[y0 * GW + x1] * tx) * (1 - ty) + (a[y1 * GW + x0] * (1 - tx) + a[y1 * GW + x1] * tx) * ty;
    };
    const id = new Uint8Array(w * h);
    const cand = [];
    for (let Y = 0; Y < h; Y++) {
      const y = (Y + 0.5) / HR - 0.5, cy = clamp(Math.round(y), 0, GH - 1);
      for (let X = 0; X < w; X++) {
        const x = (X + 0.5) / HR - 0.5, cx = clamp(Math.round(x), 0, GW - 1);
        const c0 = cell[cy * GW + cx];
        cand.length = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const c = cell[clamp(cy + dy, 0, GH - 1) * GW + clamp(cx + dx, 0, GW - 1)];
          if (c !== c0 && !cand.includes(c)) cand.push(c);
        }
        if (!cand.length) { id[Y * w + X] = c0; continue; }
        cand.push(c0);
        const f = at(fine, x, y);
        const px = x + (at(wx, x, y) * 7 + f * 1.6) * K, py = y + (at(wy, x, y) * 7 + f * 1.6) * K;
        let best = c0, bd = Infinity;
        for (const c of cand) {
          const dd = (px - pts[c][0]) ** 2 + (py - pts[c][1]) ** 2;
          if (dd < bd) { bd = dd; best = c; }
        }
        id[Y * w + X] = best;
      }
    }
    // how far each point is from a clan border and from any pasture border
    const far = 1e4, dT = new Float32Array(w * h).fill(far), dR = new Float32Array(w * h).fill(far);
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
      const i = Y * w + X, a = id[i];
      for (const j of [X + 1 < w ? i + 1 : -1, Y + 1 < h ? i + w : -1]) {
        if (j < 0 || id[j] === a) continue;
        dR[i] = dR[j] = 0.5;
        if (R[id[j]].tribe !== R[a].tribe) dT[i] = dT[j] = 0.5;
      }
    }
    for (const D of [dT, dR]) {
      for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
        const i = Y * w + X;
        let v = D[i];
        if (X > 0) v = Math.min(v, D[i - 1] + 1);
        if (Y > 0) { v = Math.min(v, D[i - w] + 1); if (X > 0) v = Math.min(v, D[i - w - 1] + 1.414); if (X < w - 1) v = Math.min(v, D[i - w + 1] + 1.414); }
        D[i] = v;
      }
      for (let Y = h - 1; Y >= 0; Y--) for (let X = w - 1; X >= 0; X--) {
        const i = Y * w + X;
        let v = D[i];
        if (X < w - 1) v = Math.min(v, D[i + 1] + 1);
        if (Y < h - 1) { v = Math.min(v, D[i + w] + 1); if (X < w - 1) v = Math.min(v, D[i + w + 1] + 1.414); if (X > 0) v = Math.min(v, D[i + w - 1] + 1.414); }
        D[i] = v;
      }
    }
    const mk = (fill, nearest) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d'), im = x.createImageData(w, h);
      for (let i = 0; i < w * h; i++) { fill(im.data, i * 4, i); im.data[i * 4 + 3] = 255; }
      x.putImageData(im, 0, 0);
      const t = new THREE.CanvasTexture(c);
      if (nearest) { t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; } else t.anisotropy = 4;
      return t;
    };
    // distances in fine points, eight steps to a level, up to 32 points
    this.idTex = mk((o, k, i) => { o[k] = id[i]; }, true);
    this.edgeTex = mk((o, k, i) => { o[k] = Math.min(255, dT[i] * 8); o[k + 1] = Math.min(255, dR[i] * 8); }, false);
    this.palTex = new THREE.DataTexture(new Uint8Array(32 * 3 * 4), 32, 3);
    this.palTex.magFilter = this.palTex.minFilter = THREE.NearestFilter;
    this.palTex.needsUpdate = true;
    this.terrWash = this.terrWash || { value: this.cinema ? 0 : 1 };
    this.terr = { idTex: { value: this.idTex }, edgeTex: { value: this.edgeTex }, pal: { value: this.palTex }, uHR: { value: HR }, uWash: this.terrWash, uPhoto: { value: { winter: 0.08, autumn: 0.4 }[this.style] ?? 0.78 } };
  }

  // each frame only the small table of pasture colours changes
  paintMap(g) {
    if (!this.palTex) return;
    const { tint, glow } = this.regionColors(g);
    const d = this.palTex.image.data;
    for (const r of g.map.regions) {
      const i = r.id, c = tint[i], won = g.t[i] >= 0.55;
      d.set([c[0], c[1], c[2], 255 * (r.tribe < 0 ? 0.4 : won ? 0.42 : 0.1 + 0.25 * Math.max(0, g.t[i] - 0.3))], i * 4);
      const e = r.tribe >= 0 ? TRIBE_RGB[r.tribe] : GOLD;
      d.set([Math.min(255, e[0] * 1.2 + 25), Math.min(255, e[1] * 1.2 + 25), Math.min(255, e[2] * 1.2 + 25), 255 * glow[i]], (32 + i) * 4);
      const burnt = g.burn && g.burn[i] != null ? Math.max(0, 1 - (g.time - g.burn[i]) / 40) * 0.35 : 0;
      d.set([i === this.hover && i > 0 ? 255 : 0, 255 * burnt, 0, 255], (64 + i) * 4);
    }
    this.palTex.needsUpdate = true;
  }

  withGrass(mat, terr = false) {
    const tex = this.grassTex;
    const rx = (14 * W / D).toFixed(1);
    const clouds = this.cloudsTex || (this.cloudsTex = this.cloudTexture());
    this.shaderTime = this.shaderTime || { value: 0 };
    const time = this.shaderTime;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.grass = { value: tex };
      sh.uniforms.clouds = { value: clouds };
      sh.uniforms.uTime = time;
      if (terr) Object.assign(sh.uniforms, this.terr);
      sh.fragmentShader = 'uniform sampler2D grass;\nuniform sampler2D clouds;\nuniform float uTime;\n' + (terr ? TERR_HEAD : '') + sh.fragmentShader.replace(
        '#include <map_fragment>',
        '#include <map_fragment>\n' + (terr ? TERR_BODY.replace('RX', rx) : '  diffuseColor.rgb *= 0.45 + 1.25 * dot(texture2D(grass, vMapUv * vec2(' + rx + ', 14.0)).rgb, vec3(0.3, 0.59, 0.11));') +
        '\n  float cl = texture2D(clouds, vMapUv * vec2(1.6, 0.9) + vec2(uTime * 0.006, uTime * 0.0025)).r;' +
        '\n  diffuseColor.rgb *= 1.0 - 0.28 * smoothstep(0.52, 0.72, cl);',
      );
    };
    mat.customProgramCacheKey = () => 'grass-map-clouds' + (terr ? '-terr' : '');
  }

  // the steppe beyond the map: low swells near it, mountains with snow far to the north and west,
  // the river running on past both edges
  buildLand(g) {
    const SIZE = 200, N = this.mobile ? 150 : 220;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, N, N);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const nz = valueNoise(rng(g.seed + 77), N + 1, N + 1, 9), nz2 = valueNoise(rng(g.seed + 78), N + 1, N + 1, 3);
    const ry = g.map.riverY;
    const c1 = new THREE.Color({ summer: '#a4955e', autumn: '#b8924a', winter: '#e4e9ef' }[this.style] || '#a4955e'), c2 = new THREE.Color(this.style === 'winter' ? '#a9b0b9' : '#7d7568'), c3 = new THREE.Color('#f4f6fa'), c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const X = pos.getX(k), Z = pos.getZ(k);
      const dx = Math.max(0, Math.abs(X) - W / 2), dz = Math.max(0, Math.abs(Z) - D / 2);
      const out = Math.hypot(dx, dz);
      const n1 = nz[k] * 0.5 + 0.5, n2 = nz2[k];
      // mountains rise behind the map (north, and west for the upright phone), hills elsewhere
      const back = Math.max(smooth(0, 30, -Z - D / 2), smooth(0, 30, -X - W / 2) * 0.8);
      const ridge = 1 - Math.abs(nz2[k]); // sharp crests
      let h = 0.62 + Math.pow(out, 1.1) * 0.06 * (0.6 + n1) + back * smooth(16, 52, out) * (3.5 + 8 * n1 + 4 * ridge) + n2 * 0.15 * smooth(0, 6, out);
      h += smooth(2, 14, out) * n1 * n1 * 1.4; // rolling hills round the khan's land
      // at the edge the land meets the map at the map's own height: no step, no frame
      const edgeH = this.height((clamp(X, -W / 2, W / 2) / W + 0.5) * GW, (clamp(Z, -D / 2, D / 2) / D + 0.5) * GH);
      const meet = smooth(0, 9 + 6 * n1, out);
      h = edgeH * (1 - meet) + h * meet;
      // the river: its line continues past the left and right edges
      const x = (X / W + 0.5) * GW;
      if (ry && (x < 0 || x > GW)) {
        const rz = (ry(clamp(x, -60 * K, GW + 60 * K)) / GH - 0.5) * D;
        const t = smooth(0.12, 0.7, Math.abs(Z - rz));
        h = h * t + (WATER - 0.25) * (1 - t);
      }
      if (out === 0) h = edgeH - 0.08; // under the map the land hides
      pos.setY(k, h);
      const rock = smooth(2.2, 5, h), snow = smooth(7, 9.5, h + n2 * 2);
      c.copy(c1).lerp(c2, rock).lerp(c3, snow);
      col[k * 3] = c.r;
      col[k * 3 + 1] = c.g;
      col[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    this.landGrid = { pos: pos.array, N, SIZE };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    const tex = this.grassTex, clouds = this.cloudsTex, time = this.shaderTime;
    const rx = (14 * W / D).toFixed(1);
    const photo = { winter: 0.08, autumn: 0.4 }[this.style] ?? 0.78;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { grass: { value: tex }, clouds: { value: clouds }, uTime: time });
      sh.vertexShader = 'varying vec2 vWorldXZ;\nvarying float vH;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWorldXZ = (modelMatrix * vec4(transformed, 1.0)).xz;\n  vH = transformed.y;');
      sh.fragmentShader = 'uniform sampler2D grass;\nuniform sampler2D clouds;\nuniform float uTime;\nvarying vec2 vWorldXZ;\nvarying float vH;\n' + sh.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  {
    // read the photo exactly as the map reads it, so the two meet without a seam
    vec2 muv = vec2(vWorldXZ.x / ${W.toFixed(1)} + 0.5, 0.5 - vWorldXZ.y / ${D.toFixed(1)});
    vec3 ph = texture2D(grass, muv * vec2(${rx}, 14.0)).rgb;
    vec3 ph2 = texture2D(grass, muv * vec2(2.3, 1.3) + 0.37).rgb;
    vec3 photo = ph * 0.6 + ph2 * 0.4;
    float L0 = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
    float grassy = (1.0 - smoothstep(1.8, 3.8, vH)) * ${photo.toFixed(2)};
    vec3 g = photo * 2.0 * clamp(L0 / 0.3, 0.75, 1.2);
    g = mix(g, g * vec3(0.8, 1.0, 0.86), step(0.7, ${photo.toFixed(2)}) * (0.6 + 0.4 * smoothstep(0.1, 0.3, dot(ph2, vec3(0.3, 0.59, 0.11)))));
    diffuseColor.rgb = mix(diffuseColor.rgb * (0.4 + 1.3 * dot(ph, vec3(0.3, 0.59, 0.11))), g, grassy);
    float cl = texture2D(clouds, muv * vec2(1.6, 0.9) + vec2(uTime * 0.006, uTime * 0.0025)).r;
    diffuseColor.rgb *= 1.0 - 0.28 * smoothstep(0.52, 0.72, cl);
    // beyond the khan's land the steppe is a shade duller and darker: it is not his to rule
    vec3 dc = diffuseColor.rgb;${FAR_GLSL('vWorldXZ', 'muv', 'ph2')}${BEYOND_GLSL('dc')}
    diffuseColor.rgb = dc;
  }`,
      );
    };
    mat.customProgramCacheKey = () => 'land-' + photo;
    const land = new THREE.Mesh(geo, mat);
    land.receiveShadow = true;
    this.group.add(land);
  }

  // soft blobs of cloud for the shadows
  cloudTexture() {
    const N = 128, c = document.createElement('canvas');
    c.width = c.height = N;
    const x = c.getContext('2d');
    const img = x.createImageData(N, N);
    const a = valueNoise(rng(31), N, N, 24), b = valueNoise(rng(32), N, N, 9);
    for (let i = 0; i < N * N; i++) {
      const v = clamp(0.5 + a[i] * 0.42 + b[i] * 0.18, 0, 1) * 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  // tufts of steppe grass that bend with the wind (a few thousand, one draw)
  buildGrass(g) {
    const n = this.mobile ? 1300 : 3700;
    const blade = new THREE.ConeGeometry(0.026, 0.22, 3, 1, true).translate(0, 0.11, 0);
    const parts = [0, 2.1, 4.2].map((a, k) => blade.clone().rotateZ((k - 1) * 0.35).rotateY(a).translate(Math.cos(a) * 0.02, 0, Math.sin(a) * 0.02));
    const geo = parts.reduce((acc, p) => {
      const pos = [...acc.attributes.position.array, ...p.attributes.position.array];
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      return out;
    });
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide });
    const time = this.shaderTime;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float sway = sin(uTime * 1.7 + wp.x * 0.9 + wp.z * 0.6) * 0.5 + sin(uTime * 3.1 + wp.x * 2.3) * 0.2;
  transformed.x += sway * 0.06 * max(0.0, position.y) * 6.0;
  transformed.z += sway * 0.03 * max(0.0, position.y) * 6.0;`,
      );
    };
    mat.customProgramCacheKey = () => 'grass-tufts';
    const im = new THREE.InstancedMesh(geo, mat, n);
    const rand = rng(g.seed * 5 + 9);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    const pal = { summer: ['#a2a85a', '#c2b86a'], autumn: ['#c99a48', '#dcb45a'], winter: ['#c9c2a8', '#a9a28a'] }[this.style] || ['#7a8a3a', '#9a9a48'];
    let k = 0;
    for (let tries = 0; tries < n * 4 && k < n; tries++) {
      // the grass runs on past the edge of the map and thins out raggedly
      const x = (rand() * 1.5 - 0.25) * GW, y = (rand() * 1.6 - 0.3) * GH;
      const inside = x >= 0 && x < GW && y >= 0 && y < GH;
      const X = toWorldX(x), Z = toWorldZ(y);
      let h;
      if (inside) {
        if (g.map.river[Math.floor(y) * GW + Math.floor(x)] || this.height(x, y) < WATER + 0.08) continue;
        h = this.height(x, y);
      } else {
        const o = Math.hypot(Math.max(0, Math.abs(X) - W / 2), Math.max(0, Math.abs(Z) - D / 2));
        if (rand() > 1 - o / 8 + Math.sin(X * 0.7) * Math.cos(Z * 0.9) * 0.3) continue;
        h = this.landHeight(X, Z);
        if (h < WATER + 0.08 || h > 2.2) continue;
      }
      p.set(X, h - 0.01, Z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28);
      const s = 0.7 + rand() * 0.9;
      sc.set(s, s * (0.8 + rand() * 0.6), s);
      m4.compose(p, q, sc);
      im.setMatrixAt(k, m4);
      col.set(pal[rand() < 0.5 ? 0 : 1]).multiplyScalar((0.85 + rand() * 0.3) * (inside ? 1 : 0.8));
      im.setColorAt(k, col);
      k++;
    }
    im.count = k;
    im.receiveShadow = true;
    im.visible = !this.lite;
    this.grassMesh = im;
    this.group.add(im);
  }

  // people about the auls: a coat, a head, walking slowly round their yurts
  buildFolk(g) {
    const rand = rng(g.seed * 11 + 3);
    this.folk = [];
    for (const r of g.map.regions) {
      const many = r.id === 0 ? 6 : g.map.capitals.includes(r.id) ? 4 : rand() < 0.6 ? 2 : 0;
      for (let k = 0; k < many; k++) this.folk.push({ cx: r.x, cy: r.y, rad: (2.6 + rand() * 3) * K, a: rand() * 6.28, v: (rand() < 0.5 ? -1 : 1) * (0.05 + rand() * 0.08), coat: COATS[Math.floor(rand() * COATS.length)] });
    }
    const { coat, head } = personParts(false);
    const coats = new THREE.InstancedMesh(coat, new THREE.MeshStandardMaterial({ roughness: 1 }), this.folk.length);
    const heads = new THREE.InstancedMesh(head, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), this.folk.length);
    const c = new THREE.Color();
    this.folk.forEach((f, k) => coats.setColorAt(k, c.set(f.coat)));
    for (const m of [coats, heads]) { m.castShadow = true; m.frustumCulled = false; this.group.add(m); }
    this.folkMeshes = [coats, heads];
    if (this.lite) for (const m of this.folkMeshes) m.visible = false;
  }
  // campfires at the Orda and the great auls: a flickering flame you can see from afar
  buildFires(g) {
    this.fires = [];
    this.fireGlows = [];
    const tex = this.puffTexture();
    const glowTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,170,80,0.85)');
      gr.addColorStop(0.4, 'rgba(255,120,40,0.3)');
      gr.addColorStop(1, 'rgba(255,100,30,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    this.hearths = [];
    const sites = [0, ...g.map.capitals].map((id) => {
      const at = this.freeSpot(g, g.map.regions[id], 2.6, 'fire');
      if (at) this.hearths.push(at);
      return at;
    }).filter(Boolean);
    const per = 4;
    const { coat, head } = personParts(true);
    const coats = new THREE.InstancedMesh(coat, new THREE.MeshStandardMaterial({ roughness: 1 }), sites.length * per);
    const heads = new THREE.InstancedMesh(head, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), sites.length * per);
    const stones = new THREE.InstancedMesh(new THREE.TorusGeometry(0.075, 0.02, 5, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#6c665c', roughness: 1 }), sites.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1.6, 1.6, 1.6), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    sites.forEach(([x, y], i) => {
      const X = toWorldX(x), Z = toWorldZ(y), H = this.height(x, y);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffae4a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.position.set(X, H + 0.08, Z);
      sp.scale.setScalar(0.3);
      const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 7), new THREE.MeshStandardMaterial({ color: '#2a1a10' }));
      logs.position.set(X, H + 0.01, Z);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
      glow.position.set(X, H + 0.015, Z);
      this.group.add(sp, logs, glow);
      this.fires.push(sp);
      this.fireGlows.push(glow);
      m4.compose(p.set(X, H + 0.005, Z), q.identity(), new THREE.Vector3(1, 1, 1));
      stones.setMatrixAt(i, m4);
      for (let k = 0; k < per; k++) {
        const a = (k / per) * Math.PI * 2 + i;
        p.set(X + Math.cos(a) * 0.2, H, Z + Math.sin(a) * 0.2);
        q.setFromAxisAngle(up, -a - Math.PI / 2);
        m4.compose(p, q, s);
        coats.setMatrixAt(i * per + k, m4);
        heads.setMatrixAt(i * per + k, m4);
        coats.setColorAt(i * per + k, c.set(COATS[(i * 3 + k) % COATS.length]));
      }
    });
    for (const m of [coats, heads, stones]) { m.castShadow = true; m.receiveShadow = true; this.group.add(m); }
  }

  // a free place near an aul's middle: not on a yurt, the river or a hearth already there
  freeSpot(g, r, dist, kind) {
    const yurts = this.deco[r.id].yurts;
    const taken = [...(this.hearths || [])];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2 + (kind === 'post' ? 1.3 : 0.4);
      for (const dd of [dist, dist + 1.2, dist + 2.4]) {
        const x = r.x + Math.cos(a) * dd * K * 1.2, y = r.y + Math.sin(a) * dd * K;
        if (x < 2 || y < 2 || x > GW - 2 || y > GH - 2) continue;
        const i = Math.round(y) * GW + Math.round(x);
        if (g.map.river[i] || g.map.cell[i] !== r.id || this.height(x, y) < WATER + 0.1) continue;
        if (yurts.some((u) => Math.hypot(u.x - x, u.y - y) < (u.big ? 4.2 : u.cap ? 3.4 : 2.6) * K)) continue;
        if (taken.some(([tx, ty]) => Math.hypot(tx - x, ty - y) < 2.2 * K)) continue;
        return [x, y];
      }
    }
    return null;
  }
  // a pair of eagles circling high over the steppe; their shadows slide over the ground
  buildBirds() {
    this.birds = [];
    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, -0.42, 0, -0.06, 0, 0, -0.08, 0, 0, 0.12, 0.42, 0, -0.06, 0, 0, -0.08], 3));
    wing.computeVertexNormals();
    for (let k = 0; k < 3; k++) {
      const b = new THREE.Mesh(wing, new THREE.MeshStandardMaterial({ color: '#6a4a2c', side: THREE.DoubleSide }));
      b.scale.setScalar(0.55);
      b.castShadow = true;
      this.group.add(b);
      this.birds.push({ b, r: 4 + k * 3, h: 6 + k * 1.2, a: k * 2.1, v: 0.12 + k * 0.03, cx: (k - 1) * 6, cz: (k - 1) * 2 });
    }
  }

  grainTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const img = x.createImageData(128, 128);
    const r = rng(5);
    for (let i = 0; i < 128 * 128; i++) {
      const v = 150 + r() * 105;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.globalAlpha = 0.5;
    x.filter = 'blur(1px)';
    x.drawImage(c, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  rippleTexture() {
    const N = 128, c = document.createElement('canvas');
    c.width = c.height = N;
    const x = c.getContext('2d');
    const img = x.createImageData(N, N);
    const nz = valueNoise(rng(9), N + 2, N + 2, 8);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = nz[j * (N + 2) + i], b = nz[j * (N + 2) + i + 1], d = nz[(j + 1) * (N + 2) + i];
      const k = (j * N + i) * 4;
      img.data[k] = 128 + (b - a) * 400;
      img.data[k + 1] = 128 + (d - a) * 400;
      img.data[k + 2] = 255;
      img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  // yurts: felt walls, a dome in the clan's colour, a red door — all instanced
  buildYurts(g) {
    const list = [];
    // two yurts to a pasture, more at the great auls: the map reads better with less
    for (const r of g.map.regions) this.deco[r.id].yurts.forEach((y, k) => { if (k < 2 || r.id === 0 || g.map.capitals.includes(r.id)) list.push({ ...y, r }); });
    this.yurtList = list;
    const seg = this.mobile ? 20 : 28;
    const wallG = new THREE.CylinderGeometry(1, 1, 0.62, seg, 1, true).translate(0, 0.31, 0);
    const roofG = new THREE.LatheGeometry([[1.05, 0.6], [0.98, 0.68], [0.84, 0.82], [0.66, 0.96], [0.46, 1.08], [0.27, 1.16], [0.25, 1.17]].map(([a, b]) => new THREE.Vector2(a, b)), seg);
    const crownG = new THREE.CircleGeometry(0.255, 20).rotateX(-Math.PI / 2).translate(0, 1.172, 0);
    const ringG = new THREE.TorusGeometry(0.255, 0.03, 5, 20).rotateX(Math.PI / 2).translate(0, 1.18, 0);
    const doorG = new THREE.BoxGeometry(0.36, 0.5, 0.06).translate(0, 0.25, 0.99);
    const bandG = new THREE.CylinderGeometry(1.012, 1.012, 0.09, seg, 1, true).translate(0, 0.54, 0);
    const mk = (geo, mat, shadow = true) => {
      const m = new THREE.InstancedMesh(geo, mat, list.length);
      m.castShadow = shadow;
      m.receiveShadow = true;
      this.group.add(m);
      return m;
    };
    const tex = (draw, w, h, rx = 1) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.RepeatWrapping;
      t.repeat.set(rx, 1);
      t.anisotropy = 4;
      return t;
    };
    const walls = mk(wallG, new THREE.MeshStandardMaterial({ map: tex(drawWall, 512, 128, 3), roughness: 1, side: THREE.DoubleSide }));
    const roofs = mk(roofG, new THREE.MeshStandardMaterial({ map: tex(drawRoof, 512, 256, 1), roughness: 0.95, side: THREE.DoubleSide }));
    const crowns = mk(crownG, new THREE.MeshStandardMaterial({ map: tex(drawCrown, 128, 128), roughness: 0.9 }), false);
    const rings = mk(ringG, new THREE.MeshStandardMaterial({ color: '#4a3220', roughness: 0.8 }));
    const doors = mk(doorG, new THREE.MeshStandardMaterial({ map: tex(drawDoor, 64, 96), roughness: 0.75 }));
    const bands = mk(bandG, new THREE.MeshStandardMaterial({ map: tex(drawBand, 256, 32, 4), roughness: 0.9, side: THREE.DoubleSide }), false);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
    list.forEach((y, k) => {
      const size = y.big ? 0.62 : y.cap ? 0.44 : 0.3;
      p.set(toWorldX(y.x), this.height(y.x, y.y) - 0.02, toWorldZ(y.y));
      // doors face south, more or less, as they do in the steppe
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(k * 12.9) * 0.6);
      s.set(size, size, size);
      m4.compose(p, q, s);
      for (const m of [walls, roofs, crowns, rings, doors, bands]) m.setMatrixAt(k, m4);
      // felt goes from new white to smoke-grey; the khan's own yurt is white
      const age = y.big ? 0 : (Math.sin(k * 7.31) * 0.5 + 0.5) * 0.16;
      const rgb = y.r.tribe < 0 ? GOLD : TRIBE_RGB[y.r.tribe];
      col.setRGB(...[0, 1, 2].map((j) => (1 - age) * (0.92 + (rgb[j] / 255) * 0.08)), THREE.SRGBColorSpace);
      roofs.setColorAt(k, col);
      walls.setColorAt(k, col);
      // the band under the roof carries the clan's colour (gold for the Orda)
      col.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
      bands.setColorAt(k, col);
    });
    this.yurtRoofs = roofs;
  }

  // a ring of gold on the ground round an aul that is the khan's
  buildRings(g) {
    this.rings = [];
    const geo = new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2);
    for (const r of g.map.regions) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.85, depthWrite: false }));
      m.position.set(toWorldX(r.x), this.height(r.x, r.y) + 0.03, toWorldZ(r.y));
      m.scale.setScalar(0.95);
      m.visible = false;
      m.renderOrder = 2;
      this.group.add(m);
      this.rings[r.id] = m;
    }
  }

  // banners of the Orda and the three great auls: a pole and a cloth that ripples
  buildFlags(g) {
    this.flags = [];
    const map = g.map;
    const ids = [0, ...map.capitals];
    for (const id of ids) {
      const r = map.regions[id];
      const rgb = id === 0 ? GOLD : TRIBE_RGB[r.tribe];
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 80;
      const x = c.getContext('2d');
      x.fillStyle = `rgb(${rgb.join(',')})`;
      x.fillRect(0, 0, 128, 80);
      x.fillStyle = 'rgba(255,240,210,0.9)';
      x.fillRect(0, 70, 128, 10);
      x.font = '800 52px system-ui, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      tamga(x, id === 0 ? -1 : r.tribe, 60, 37, 22, 'rgba(255,240,210,0.95)');
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const big = id === 0 ? 1.5 : 1.3;
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * big, 0.56 * big, 12, 4).translate(0.45 * big, 0, 0), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
      cloth.castShadow = true;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.7 * big, 6).translate(0, 0.85 * big, 0), new THREE.MeshStandardMaterial({ color: '#4a3420' }));
      pole.castShadow = true;
      const grp = new THREE.Group();
      const px = r.x + (id === 0 ? 4.5 : 3) * K, py = r.y - 1 * K;
      grp.position.set(toWorldX(px), this.height(px, py), toWorldZ(py));
      cloth.position.y = 1.7 * big - 0.3 * big;
      grp.add(pole, cloth);
      this.group.add(grp);
      this.flags.push({ cloth, base: cloth.geometry.attributes.position.array.slice(), big });
    }
  }

  // —— models: birches by the river, bushes, rocks in the hills, sheep, grazing horses ——
  populate(g) {
    if (!g || !this.group || this.populated === g.map) return;
    this.populated = g.map;
    const rand = rng(g.seed * 13 + 1);
    const inst = (name, spots, height, yaw = true, cast = true) => {
      const src = MODELS[name];
      if (!src || !spots.length) return;
      src.scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(src.scene);
      const k = height / (box.max.y - box.min.y);
      src.scene.traverse((o) => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
        geo.translate(0, -box.min.y, 0);
        const im = new THREE.InstancedMesh(geo, o.material, spots.length);
        im.castShadow = cast;
        im.receiveShadow = true;
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
        spots.forEach((sp, i) => {
          if (sp.wx != null) p.set(sp.wx, this.landHeight(sp.wx, sp.wz) - 0.03, sp.wz);
          else p.set(toWorldX(sp.x), this.height(sp.x, sp.y) - 0.02, toWorldZ(sp.y));
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw ? sp.a ?? rand() * 6.28 : 0);
          const sc = k * (sp.s || 1);
          s.set(sc, sc, sc);
          m4.compose(p, q, s);
          im.setMatrixAt(i, m4);
        });
        this.group.add(im);
      });
    };
    const map = g.map;
    inst('birch', this.trees.map((t) => ({ x: t.x, y: t.y, s: 0.8 + t.r * 0.4 })), 0.9);
    // bushes and rocks scattered over the steppe, more rocks up in the hills
    const bushes = [], rocks = [];
    // a few big stones up in the hills and some bushes: fewer, larger, so they read as things, not specks
    for (let k = 0; k < 2600 && (bushes.length < 36 || rocks.length < 12); k++) {
      const x = rand() * GW, y = rand() * GH, i = Math.floor(y) * GW + Math.floor(x);
      if (map.river[i] || this.height(x, y) < WATER + 0.1) continue;
      const nearAul = map.regions.some((r) => Math.hypot(r.x - x, r.y - y) < 7 * K);
      if (nearAul) continue;
      if (map.elev[i] > 0.62 && rocks.length < 12) rocks.push({ x, y, s: 1 + rand() * 1.2 });
      else if (rand() < 0.25 && bushes.length < 36) bushes.push({ x, y, s: 0.9 + rand() * 0.6 });
    }
    inst('bush', bushes, 0.36);
    inst('rock', rocks, 0.38);
    // the country beyond: birch groves in the hollows, bushes, stones on the hills
    const beyond = { birch: [], bush: [], rock: [] };
    const outAt = (X, Z) => Math.hypot(Math.max(0, Math.abs(X) - W / 2), Math.max(0, Math.abs(Z) - D / 2));
    const wet = (X, Z) => {
      if (!map.riverY) return false;
      const rz = (map.riverY(clamp((X / W + 0.5) * GW, -60 * K, GW + 60 * K)) / GH - 0.5) * D;
      return Math.abs(Z - rz) < 0.9;
    };
    const groves = this.mobile ? 5 : 9;
    for (let k = 0; k < groves * 8; k++) {
      const X = (rand() - 0.5) * (W + 50), Z = (rand() - 0.5) * (D + 36);
      const o = outAt(X, Z);
      if (o < 0.8 || o > 22 || wet(X, Z)) continue;
      const h = this.landHeight(X, Z);
      if (h > 4.5) continue;
      if (h > 2.4) { if (beyond.rock.length < 30) beyond.rock.push({ wx: X, wz: Z, s: 1.4 + rand() * 2.2 }); continue; }
      if (beyond.birch.length < groves * 6 && rand() < 0.5) {
        for (let t = 0, n = 3 + Math.floor(rand() * 5); t < n; t++) {
          const a = rand() * 6.28, r = rand() * 1.6, x = X + Math.cos(a) * r, z = Z + Math.sin(a) * r;
          if (outAt(x, z) > 0.6 && !wet(x, z)) beyond.birch.push({ wx: x, wz: z, s: 0.8 + rand() * 0.6 });
        }
      } else if (beyond.bush.length < 50) beyond.bush.push({ wx: X, wz: Z, s: 1 + rand() * 0.8 });
    }
    inst('birch', beyond.birch, 0.9, true, false);
    inst('bush', beyond.bush, 0.36, true, false);
    inst('rock', beyond.rock, 0.38, true, false);
    // herds at every other aul: sheep or horses, few and big enough to see
    const herdAt = (r) => this.deco[r.id].herd.length && (r.id % 2 === 0 || map.capitals.includes(r.id));
    // sheep stand where the 2D view put its herds (the woolly ones)
    this.mixers = [];
    this.sheep = [];
    if (MODELS.sheep) {
      const src = MODELS.sheep;
      const box = new THREE.Box3().setFromObject(src.scene);
      const k = 0.26 / (box.max.y - box.min.y);
      const idle = src.animations.find((a) => /Idle/.test(a.name));
      for (const r of map.regions) {
        if (!herdAt(r)) continue;
        for (const h of this.deco[r.id].herd.slice(0, this.mobile ? 2 : 4)) {
          if (!h.sheep) continue;
          const o = SkeletonUtils.clone(src.scene);
          o.scale.setScalar(k * (0.9 + rand() * 0.25));
          o.position.set(toWorldX(h.x), this.height(h.x, h.y), toWorldZ(h.y));
          o.rotation.y = rand() * 6.28;
          o.traverse((m) => { if (m.isMesh) { m.castShadow = !this.lite; m.frustumCulled = false; } });
          this.sheep.push(o);
          if (idle) {
            const mx = new THREE.AnimationMixer(o);
            const a = mx.clipAction(idle);
            a.play();
            a.time = rand() * idle.duration;
            this.mixers.push(mx);
          }
          this.group.add(o);
        }
      }
    }
    // herds of horses graze, a few to an aul
    if (MODELS.horse) {
      for (const r of map.regions) {
        if (!herdAt(r)) continue;
        for (const h of this.deco[r.id].herd.slice(0, 3)) {
          if (h.sheep) continue;
          const o = this.makeHorse(['#7a4a2a', '#3a2418', '#c9a06a', '#efe8dc'][Math.floor(rand() * 4)]);
          o.root.position.set(toWorldX(h.x), this.height(h.x, h.y), toWorldZ(h.y));
          o.root.rotation.y = rand() * 6.28;
          o.root.scale.multiplyScalar(1.3);
          o.play(rand() < 0.65 ? 'Eating' : 'Idle_Headlow', rand()); // not 'Idle': it rears up, and this model's hind legs go stiff as a stick
          this.group.add(o.root);
          this.mixers.push(o.mixer);
        }
      }
    }
    // a hitching post at the Orda and each great aul, two horses tied to it, heads low
    const postG = new THREE.CylinderGeometry(0.012, 0.014, 0.17, 6).translate(0, 0.085, 0);
    const railG = new THREE.CylinderGeometry(0.009, 0.009, 0.42, 6).rotateZ(Math.PI / 2).translate(0, 0.15, 0);
    const posts = [0, ...map.capitals].map((id) => this.freeSpot(g, map.regions[id], 3.4, 'post')).filter(Boolean);
    const wood = new THREE.MeshStandardMaterial({ color: '#5a3e26', roughness: 0.9 });
    const pm = new THREE.InstancedMesh(postG, wood, posts.length * 2), rm = new THREE.InstancedMesh(railG, wood, posts.length);
    const m4p = new THREE.Matrix4(), qp = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    posts.forEach(([x, y], i) => {
      const X = toWorldX(x), Z = toWorldZ(y), H = this.height(x, y), yaw = rand() * 6.28;
      qp.setFromAxisAngle(up, yaw);
      const ax = Math.cos(yaw), az = -Math.sin(yaw);
      for (const sgn of [-1, 1]) pm.setMatrixAt(i * 2 + (sgn > 0 ? 1 : 0), m4p.compose(new THREE.Vector3(X + ax * 0.2 * sgn, H, Z + az * 0.2 * sgn), qp, one));
      rm.setMatrixAt(i, m4p.compose(new THREE.Vector3(X, H, Z), qp, one));
      if (!MODELS.horse) return;
      for (let k = 0; k < (this.mobile ? 1 : 2); k++) {
        const o = this.makeHorse(['#7a4a2a', '#3a2418', '#c9a06a', '#efe8dc'][Math.floor(rand() * 4)]);
        const off = (k - 0.5) * 0.24;
        // standing square to the rail, nose to it
        o.root.position.set(X + ax * off + az * 0.2, H, Z + az * off - ax * 0.2);
        o.root.rotation.y = yaw + Math.PI;
        o.root.scale.multiplyScalar(1.3);
        o.play(rand() < 0.5 ? 'Eating' : 'Idle_Headlow', rand());
        this.group.add(o.root);
        this.mixers.push(o.mixer);
      }
    });
    for (const m of [pm, rm]) { m.castShadow = true; m.receiveShadow = true; this.group.add(m); }
  }

  makeHorse(coat) {
    const src = MODELS.horse;
    const root = SkeletonUtils.clone(src.scene);
    if (!this.horseScale) {
      const box = new THREE.Box3().setFromObject(src.scene);
      this.horseScale = 0.42 / (box.max.y - box.min.y);
    }
    root.scale.setScalar(this.horseScale);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.frustumCulled = false;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const fixed = mats.map((m) => {
        if (!/^Main/.test(m.name) || !coat) return m;
        const c = m.clone();
        c.color = new THREE.Color(coat);
        if (m.name === 'Main_Dark') c.color.multiplyScalar(0.6);
        if (m.name === 'Main_Light') c.color.lerp(new THREE.Color('#ffffff'), 0.35);
        return c;
      });
      o.material = Array.isArray(o.material) ? fixed : fixed[0];
    });
    const mixer = new THREE.AnimationMixer(root);
    const clip = (name) => src.animations.find((a) => a.name === name);
    let back = null;
    root.traverse((o) => { if (o.isBone && o.name === 'Torso') back = o; });
    return {
      root, mixer, back,
      play(name, t = 0) {
        const c = clip(name);
        if (!c) return;
        const a = mixer.clipAction(c);
        a.play();
        a.time = t * c.duration;
      },
    };
  }

  // a rider: a coat, a head, a hat, and for most a banner on a pole
  makeRider(cloth, flag) {
    const grp = new THREE.Group();
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.065, 0.16, 8).translate(0, 0.08, 0), new THREE.MeshStandardMaterial({ color: cloth, roughness: 0.9 }));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8).translate(0, 0.2, 0), new THREE.MeshStandardMaterial({ color: '#d9a882', roughness: 0.8 }));
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.07, 10).translate(0, 0.25, 0), new THREE.MeshStandardMaterial({ color: '#3a2416', roughness: 0.9 }));
    for (const m of [coat, head, hat]) { m.castShadow = true; grp.add(m); }
    if (flag) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.42, 5).translate(0, 0.2, 0), new THREE.MeshStandardMaterial({ color: '#3a2614' }));
      pole.position.set(-0.05, 0.05, -0.04);
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1).translate(-0.08, 0, 0), new THREE.MeshStandardMaterial({ color: flag, side: THREE.DoubleSide, roughness: 0.9 }));
      cl.position.set(-0.05, 0.4, -0.04);
      cl.castShadow = true;
      grp.add(pole, cl);
      grp.userData.cloth = cl;
    }
    return grp;
  }

  syncRiders(g, now, dt) {
    if (!MODELS.horse) return;
    const seen = new Set();
    for (const r of g.riders) {
      seen.add(r.id);
      let o = this.riderObjs.get(r.id);
      if (!o) {
        const flag = r.kind === 'tribe' || r.kind === 'envoy' ? `rgb(${TRIBE_RGB[r.tribe].join(',')})` : r.kind === 'raider' ? '#9a1410' : r.kind === 'karasai' ? '#c43a2c' : r.kind === 'aria' || r.kind === 'caravan' || r.kind === 'zaltyr' ? null : `rgb(${GOLD.join(',')})`;
        const coat = r.kind === 'raider' ? '#140d0a' : r.kind === 'aria' ? '#efe8dc' : r.kind === 'karasai' ? '#22160e' : r.kind === 'false' ? '#4a3020' : r.kind === 'caravan' ? '#b08a5a' : r.kind === 'zaltyr' ? '#3a3a30' : '#7a4a2a';
        const cloth = r.kind === 'raider' ? '#3a0e0a' : r.kind === 'aria' ? '#8a5cd6' : r.kind === 'karasai' ? '#7a1f18' : r.kind === 'tribe' || r.kind === 'envoy' ? `rgb(${TRIBE_RGB[r.tribe].map((v) => (v * 0.7) | 0).join(',')})` : r.kind === 'caravan' ? '#6a4a2a' : r.kind === 'zaltyr' ? '#2c3622' : '#2f5a7a';
        o = this.makeHorse(coat);
        o.play(r.kind === 'caravan' ? 'Walk' : 'Gallop', Math.random());
        o.rider = this.makeRider(cloth, flag);
        if (r.kind === 'envoy' && !r.killer) {
          // an honest rider carries a lantern
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
          lamp.position.set(0.08, 0.14, 0.04);
          o.rider.add(lamp);
        }
        if (r.kind === 'raider') o.root.scale.multiplyScalar(1.1);
        if (r.kind === 'caravan') {
          // a caravan horse carries packs, not a banner
          const pack = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.2), new THREE.MeshStandardMaterial({ color: '#8a5a2a', roughness: 1 }));
          pack.position.set(0, 0.02, -0.08);
          pack.castShadow = true;
          o.rider.add(pack);
        }
        // riders are the pieces you play with: larger than life, like on a war map
        const big = r.kind === 'karasai' ? 2.0 : 1.7;
        o.root.scale.multiplyScalar(big);
        o.rider.scale.setScalar(big);
        this.group.add(o.root, o.rider);
        this.riderObjs.set(r.id, o);
      }
      const p = riderPos(g, r);
      o.root.position.set(toWorldX(p.x), Math.max(WATER - 0.05, this.height(p.x, p.y)), toWorldZ(p.y));
      // turn smoothly towards where it rides
      const want = Math.atan2(p.dx / GW * W, p.dy / GH * D);
      let dy = want - o.root.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      o.root.rotation.y += dy * Math.min(1, dt * 10);
      o.mixer.update(dt * (r.kind === 'aria' ? 0.85 : 1.1));
      // the rider sits on the horse's back and rocks with it
      if (o.back) {
        o.root.updateMatrixWorld(true);
        o.back.getWorldPosition(o.rider.position);
        o.rider.position.y += 0.02 * o.rider.scale.y;
        o.rider.rotation.y = o.root.rotation.y;
      }
      if (o.rider.userData.cloth) o.rider.userData.cloth.rotation.y = Math.sin(now / 120 + r.id) * 0.4;
    }
    for (const [id, o] of this.riderObjs) {
      if (seen.has(id)) continue;
      this.group.remove(o.root, o.rider);
      this.riderObjs.delete(id);
    }
  }

  // smoke from the yurts' crowns: a few soft puffs that rise and fade
  puffTexture() {
    if (this.puffTex) return this.puffTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    this.puffTex = new THREE.CanvasTexture(c);
    return this.puffTex;
  }

  stepSmoke(g, dt) {
    if (!this.yurtList) return;
    if (!this.smoke.length) {
      const tex = this.puffTexture();
      const picks = this.yurtList.filter((_, k) => k % 3 === 0).slice(0, 26);
      for (const y of picks) {
        for (let k = 0; k < 3; k++) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#efe9e0', transparent: true, depthWrite: false, opacity: 0 }));
          sp.userData = { y, t: k / 3 + Math.random() * 0.2 };
          this.group.add(sp);
          this.smoke.push(sp);
        }
      }
    }
    for (const sp of this.smoke) {
      const d = sp.userData;
      d.t = (d.t + dt / 3.2) % 1;
      const size = d.y.big ? 0.62 : d.y.cap ? 0.44 : 0.3;
      sp.position.set(toWorldX(d.y.x) + d.t * 0.35, this.height(d.y.x, d.y.y) + size * 1.2 + d.t * 0.9, toWorldZ(d.y.y) - d.t * 0.1);
      sp.scale.setScalar(0.12 + d.t * 0.35);
      sp.material.opacity = 0.45 * Math.sin(d.t * Math.PI);
    }
  }

  draw(g, now, look) {
    const { ctx } = this;
    const dt = Math.min(0.05, (now - (this.lastNow || now)) / 1000);
    this.lastNow = now;
    this.frameNo++;
    this.renderer.shadowMap.needsUpdate = this.frameNo % (this.lite ? 3 : 2) === 0 || this.frameNo < 4;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (!g) {
      this.glCanvas.style.visibility = 'hidden';
      return;
    }
    this.glCanvas.style.visibility = 'visible';
    this.lastG = g;
    if (this.map !== g.map) { this.prepare(g); this.painted = false; }
    if (this.modelsLoaded && this.populated !== g.map) this.populate(g);
    if (this.frameNo % (this.lite ? 3 : 2) === 0 || !this.painted) {
      this.paintMap(g);
      this.painted = true;
    }
    // the world moves
    this.herdDt = (this.herdDt || 0) + dt;
    if (this.frameNo % (this.lite ? 3 : 2) === 0) {
      for (const m of this.mixers || []) m.update(this.herdDt);
      this.herdDt = 0;
    }
    this.water.material.normalMap.offset.x = (now / 40000) % 1;
    this.water.material.normalMap.offset.y = (now / 55000) % 1;
    for (const f of this.flags) {
      const pos = f.cloth.geometry.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const bx = f.base[k * 3];
        const t = bx / (0.9 * f.big);
        pos.setZ(k, Math.sin(now / 260 - t * 5) * 0.08 * t * f.big);
      }
      pos.needsUpdate = true;
    }
    for (const r of g.map.regions) this.rings[r.id].visible = !this.cinema && r.tribe >= 0 && g.t[r.id] >= 0.55;
    this.syncRiders(g, now, dt);
    this.stepSmoke(g, dt);
    this.shaderTime.value = now / 1000;
    if (this.folkMeshes && this.folkMeshes[0].visible) {
      const m4 = this.tmpM4 || (this.tmpM4 = new THREE.Matrix4()), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1.6, 1.6, 1.6), up = new THREE.Vector3(0, 1, 0);
      this.folk.forEach((f, k) => {
        f.a += f.v * dt;
        const x = f.cx + Math.cos(f.a) * f.rad, y = f.cy + Math.sin(f.a) * f.rad * 0.7;
        p.set(toWorldX(x), this.height(x, y) + Math.abs(Math.sin(now / 160 + f.a * 9)) * 0.01, toWorldZ(y));
        q.setFromAxisAngle(up, -f.a + (f.v > 0 ? 0 : Math.PI));
        m4.compose(p, q, s);
        for (const m of this.folkMeshes) m.setMatrixAt(k, m4);
      });
      for (const m of this.folkMeshes) m.instanceMatrix.needsUpdate = true;
    }
    for (const [k, f] of (this.fires || []).entries()) {
      const fl = 0.26 + Math.sin(now / 70 + k) * 0.03 + Math.sin(now / 37 + k * 3) * 0.025;
      f.scale.set(fl, fl * 1.35, fl);
      f.material.opacity = 0.8 + Math.sin(now / 53 + k) * 0.15;
      if (this.fireGlows?.[k]) this.fireGlows[k].material.opacity = 0.5 + Math.sin(now / 61 + k * 2) * 0.12 + Math.sin(now / 23 + k) * 0.06;
    }
    for (const b of this.birds || []) {
      b.a += b.v * dt;
      b.b.position.set(b.cx + Math.cos(b.a) * b.r, b.h, b.cz + Math.sin(b.a) * b.r * 0.6);
      b.b.rotation.set(0, -b.a, Math.sin(now / 300 + b.r) * 0.25);
      b.b.scale.set(0.55, 0.55, 0.55 * (1 + Math.sin(now / 120 + b.r) * 0.15));
    }
    // the sun crosses the sky over a season: a cool morning, a white noon, a golden evening
    if (!this.cinema && !g.night) {
      const day = clamp(g.clock / 330, 0, 1);
      const ang = -0.9 + day * 1.8;
      this.sun.position.set(Math.sin(ang) * 24, 10 + Math.cos(ang) * 10, -8);
      this.sun.color.setRGB(1, 0.86 + 0.1 * Math.cos(ang), 0.7 + 0.25 * Math.cos(ang));
    }
    // night falls on the world itself
    const dark = g.night ? Math.min(1, (g.time - g.night.at) / 1.5) * (g.night.until ? Math.max(0, (g.night.until - g.time) / 2.5) : 1) : 0;
    if (!this.cinema) {
      this.sun.intensity = 3.0 * (1 - dark * 0.85);
      this.scene.children.forEach((o) => { if (o.isHemisphereLight) o.intensity = 0.95 * (1 - dark * 0.7); });
    }
    if (this.cinema) {
      this.cinemaCam(g, dt);
      this.paint3d();
      return;
    }
    this.paint3d();

    // what the player reads, on top
    this.drawRoutes(g, now);
    this.drawParts(g, dt, 'under');
    this.drawParts(g, dt, 'over');
    this.drawTrust(g);
    this.drawMarks(g, now);
    for (const r of g.map.regions) {
      const [x, y] = this.toScreen(r.x, r.y);
      const cap = g.map.capitals.includes(r.id) && look.names, nameSize = Math.max(13, this.u * 1.5);
      if (cap) this.label(look.names[r.tribe], x, y + this.u * 0.8, nameSize);
      if (look.numbers && r.tribe >= 0) this.label(String(Math.round(g.t[r.id] * 100)), x, cap ? y + this.u * 0.8 + nameSize * 1.05 : y + this.u * 2.6, Math.max(this.small ? 9 : 10, this.u * 1.2));
    }
    this.drawPulse(g, now, look);
    this.drawSeen(g, now);
    this.drawDrama(g, now, dt);
    this.drawHoverTag(g, look);
    this.drawHand(g, now, look);
    this.drawFx(g, now);
  }

  get small() { return Math.min(this.w, this.h) < 500; }
  get medal() { return clamp(this.u * 1.05, this.small ? 7.5 : 10, 19); }

  markAt(r) {
    const [x, y] = this.toScreen(r.x, r.y);
    const rad = this.medal;
    return [x - rad * 1.1, y - this.u * 2.4 - rad * 0.85, rad * 0.66];
  }

  drawTrust(g) {
    const { ctx } = this;
    const rad = this.medal;
    for (const r of g.map.regions) {
      if (r.tribe < 0) continue;
      const [x0, y0] = this.toScreen(r.x, r.y);
      const x = x0, y = y0 - this.u * 2.4;
      const t = g.t[r.id], won = t >= 0.55;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = won ? 'rgba(255,214,90,0.95)' : 'rgba(30,22,14,0.62)';
      ctx.fill();
      ctx.lineWidth = Math.max(2, rad * 0.38);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(x, y, rad * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = won ? '#fff6d0' : `rgb(${TRIBE_RGB[r.tribe].map((v) => Math.min(255, v + 60)).join(',')})`;
      ctx.beginPath(); ctx.arc(x, y, rad * 0.72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t); ctx.stroke();
      if (won) {
        // the khan's shanyrak marks a pasture that is his
        tamga(ctx, -1, x, y, rad * 0.62, '#6a4a08');
      } else {
        // the line the kurultai needs
        const a = -Math.PI / 2 + Math.PI * 2 * 0.55;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rad * 0.45, y + Math.sin(a) * rad * 0.45); ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); ctx.stroke();
      }
    }
  }

  // your riders show a dotted line to where they go; the forged ones do not
  drawRoutes(g, now) {
    const { ctx, u } = this;
    const R = g.map.regions;
    for (const r of g.riders) {
      if (r.kind !== 'word' && r.kind !== 'aria' && r.kind !== 'karasai') continue;
      const p = riderPos(g, r);
      const [x, y] = this.toScreen(p.x, p.y);
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = r.seg + 1; k < r.path.length; k++) ctx.lineTo(...this.toScreen(R[r.path[k]].x, R[r.path[k]].y));
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = r.kind === 'aria' ? 'rgba(210,180,255,0.95)' : r.kind === 'karasai' ? 'rgba(255,150,130,0.95)' : 'rgba(255,246,214,0.95)';
      ctx.lineDashOffset = -now / 40;
      ctx.stroke();
      ctx.setLineDash([]);
      const end = this.toScreen(R[r.to].x, R[r.to].y);
      ctx.beginPath(); ctx.arc(end[0], end[1], u * 1.2, 0, Math.PI * 2); ctx.stroke();
    }
  }

  drawPulse(g, now, look) {
    if (look.pulse == null) return;
    const r = g.riders.find((x) => x.id === look.pulse);
    if (!r) return;
    const { ctx, u } = this;
    const p = riderPos(g, r);
    const [x, y] = this.toScreen(p.x, p.y);
    const k = (now % 900) / 900;
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - u * 0.8, u * (1.6 + k * 3), 0, Math.PI * 2); ctx.stroke();
  }
}
