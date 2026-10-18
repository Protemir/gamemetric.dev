// The steppe in 3D (three.js): the map's height field with real sun and shadows, the tribes' colours
// painted onto the ground, a river of water, yurts built in code, birches and bushes, sheep and grazing
// herds, riders on galloping horses (Quaternius models, CC0). What the player must read — routes,
// the hand, marks, little words — is drawn on the 2D canvas on top, by the 2D view's own code.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/loaders/GLTFLoader.js';
import * as SkeletonUtils from '../vendor/three/utils/SkeletonUtils.js';
import { GW, GH, K } from './map.js';
import { riderPos } from './sim.js';
import { View, TRIBE_RGB, GOLD } from './render.js';
import { clamp, rng, valueNoise } from './util.js';

const W = 38.4, D = 21.6; // world size of the map
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
    this.renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: !mobile, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 200);
    this.ray = new THREE.Raycaster();
    this.clock3 = 0;
    this.setupWorld();
    loading.then(() => { this.modelsLoaded = true; if (this.map) this.populate(this.lastG); });
  }

  setupWorld() {
    const { scene } = this;
    const haze = new THREE.Color('#d8b98a');
    scene.background = haze;
    scene.fog = new THREE.Fog(haze, 34, 80);
    const hemi = new THREE.HemisphereLight('#f2f0ea', '#6a5a40', 1.1);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff0d6', 2.5);
    sun.position.set(-14, 22, -9);
    sun.castShadow = true;
    const S = this.mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(S, S);
    Object.assign(sun.shadow.camera, { left: -23, right: 23, top: 15, bottom: -15, near: 1, far: 70 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
    this.sun = sun;
    // the steppe goes on past the edge of the map and fades into the haze
    const far = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#a08a5a', roughness: 1 }));
    far.rotation.x = -Math.PI / 2;
    far.position.y = 0.2;
    far.receiveShadow = true;
    scene.add(far);
  }

  // —— the camera looks at the map from the south, tilted; on an upright phone from the east ——
  resize() {
    super.resize();
    const w = this.w, h = this.h;
    this.renderer.setPixelRatio(Math.min(this.mobile ? 1.5 : 2, window.devicePixelRatio || 1));
    this.renderer.setSize(w, h, false);
    this.glCanvas.style.width = w + 'px';
    this.glCanvas.style.height = h + 'px';
    const cam = this.camera;
    cam.aspect = w / h;
    // aim at the middle of the free area between the bars
    cam.setViewOffset(w, h, 0, -(this.top - this.bottom) / 2, w, h);
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
        const sx = (p.x * 0.5 + 0.5) * w, sy = (-p.y * 0.5 + 0.5) * h - (this.top - this.bottom) / 2;
        return sx >= 4 && sx <= w - 4 && sy >= this.top - 2 && sy <= h - this.bottom + 2;
      });
    };
    let lo = 5, hi = 200;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; fits(m) ? (hi = m) : (lo = m); }
    // a little closer than the full fit: the corners may hide in the haze, the middle matters
    fits(hi * (this.rot ? 0.95 : 0.96));
    this.scene.fog.near = hi * 0.9;
    this.scene.fog.far = hi * 2.6;
    // sprite unit for the overlay: pixels per "old cell" at the middle of the map
    const a = this.project(0, 0.6, 0), b = this.project(toWorldX(GW / 2 + K) - toWorldX(GW / 2), 0.6, 0);
    this.u = Math.max(4, Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.6);
    this.s = this.u / (K * 1.6);
    this.ox = 0;
    this.oy = 0;
  }

  project(X, Y, Z) {
    const p = new THREE.Vector3(X, Y, Z).project(this.camera);
    return [(p.x * 0.5 + 0.5) * this.w, (-p.y * 0.5 + 0.5) * this.h - (this.top - this.bottom) / 2];
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

  toScreen(x, y) {
    return this.project(toWorldX(x), Math.max(WATER, this.height(x, y)), toWorldZ(y));
  }

  regionAt(g, px, py) {
    if (!this.terrain) return -1;
    const ndc = new THREE.Vector2((px / this.w) * 2 - 1, -((py + (this.top - this.bottom) / 2) / this.h) * 2 + 1);
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
    if (this.group) { this.scene.remove(this.group); this.group.traverse((o) => { o.geometry?.dispose(); }); }
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
      // the edge of the map dips a little, like the edge of a felt
      const edge = Math.min(x, y, GW - x, GH - y);
      pos.setY(k, this.height(x, y) - (edge < 2 ? (2 - edge) * 0.12 : 0));
    }
    geo.computeVertexNormals();
    this.tex = new THREE.CanvasTexture(this.off);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const grain = this.grainTexture();
    const mat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.95, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.grain = { value: grain };
      sh.fragmentShader = 'uniform sampler2D grain;\n' + sh.fragmentShader.replace(
        '#include <map_fragment>',
        '#include <map_fragment>\n  diffuseColor.rgb *= 0.86 + 0.28 * texture2D(grain, vMapUv * vec2(48.0, 27.0)).r;',
      );
    };
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.group.add(this.terrain);

    // water: a sheet at one level; the carved bed shows only where the river is
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#2a5f88', roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.93, normalMap: this.rippleTexture(), normalScale: new THREE.Vector2(0.6, 0.6) }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = WATER;
    water.material.normalMap.repeat.set(16, 9);
    this.water = water;
    this.group.add(water);

    this.buildYurts(g);
    this.buildRings(g);
    this.buildFlags(g);
    this.riderObjs = new Map();
    this.smoke = [];
    if (this.modelsLoaded) this.populate(g);
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
    for (const r of g.map.regions) for (const y of this.deco[r.id].yurts) list.push({ ...y, r });
    this.yurtList = list;
    const wallG = new THREE.CylinderGeometry(1, 1, 0.7, 18, 1, true).translate(0, 0.35, 0);
    const roofG = new THREE.LatheGeometry([new THREE.Vector2(1.06, 0.68), new THREE.Vector2(0.75, 1.02), new THREE.Vector2(0.3, 1.3), new THREE.Vector2(0.2, 1.34), new THREE.Vector2(0.0, 1.34)], 18);
    const doorG = new THREE.BoxGeometry(0.42, 0.56, 0.1).translate(0, 0.28, 0.98);
    const bandG = new THREE.CylinderGeometry(1.012, 1.012, 0.12, 18, 1, true).translate(0, 0.5, 0);
    const mk = (geo, mat) => {
      const m = new THREE.InstancedMesh(geo, mat, list.length);
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
      return m;
    };
    const walls = mk(wallG, new THREE.MeshStandardMaterial({ map: this.feltTexture(), roughness: 1, side: THREE.DoubleSide }));
    const roofs = mk(roofG, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }));
    const doors = mk(doorG, new THREE.MeshStandardMaterial({ color: '#8a3b22', roughness: 0.8 }));
    const bands = mk(bandG, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide }));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
    list.forEach((y, k) => {
      const size = y.big ? 0.62 : 0.3;
      p.set(toWorldX(y.x), this.height(y.x, y.y) - 0.02, toWorldZ(y.y));
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Math.sin(k * 12.9) * 0.6));
      s.set(size, size, size);
      m4.compose(p, q, s);
      walls.setMatrixAt(k, m4);
      roofs.setMatrixAt(k, m4);
      doors.setMatrixAt(k, m4);
      bands.setMatrixAt(k, m4);
      const rgb = y.r.tribe < 0 ? GOLD : TRIBE_RGB[y.r.tribe];
      col.setRGB(...(y.big ? [0.85, 0.62, 0.2] : [0.86, 0.8, 0.7]), THREE.SRGBColorSpace);
      roofs.setColorAt(k, col);
      col.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
      bands.setColorAt(k, col);
    });
    this.yurtRoofs = roofs;
  }

  // the felt wall: cream felt over a wooden lattice, a patterned band at the top
  feltTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#ece1c8';
    x.fillRect(0, 0, 256, 64);
    x.strokeStyle = 'rgba(120,80,40,0.35)';
    x.lineWidth = 2;
    for (let i = -64; i < 320; i += 16) {
      x.beginPath(); x.moveTo(i, 64); x.lineTo(i + 40, 0); x.stroke();
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 40, 64); x.stroke();
    }
    x.fillStyle = '#8a3b22';
    x.fillRect(0, 0, 256, 7);
    x.fillStyle = '#d8b04a';
    for (let i = 0; i < 256; i += 16) x.fillRect(i + 4, 2, 8, 3);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    return t;
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
      x.fillText(id === 0 ? '♛' : ['Ψ', 'Λ', 'Ш'][r.tribe], 60, 38);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const big = id === 0 ? 1.4 : 1;
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
    const inst = (name, spots, height, yaw = true) => {
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
        im.castShadow = true;
        im.receiveShadow = true;
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
        spots.forEach((sp, i) => {
          p.set(toWorldX(sp.x), this.height(sp.x, sp.y) - 0.02, toWorldZ(sp.y));
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
    for (let k = 0; k < 2600 && (bushes.length < 70 || rocks.length < 50); k++) {
      const x = rand() * GW, y = rand() * GH, i = Math.floor(y) * GW + Math.floor(x);
      if (map.river[i] || this.height(x, y) < WATER + 0.1) continue;
      const nearAul = map.regions.some((r) => Math.hypot(r.x - x, r.y - y) < 6 * K);
      if (nearAul) continue;
      if (map.elev[i] > 0.6 && rocks.length < 50) rocks.push({ x, y, s: 0.6 + rand() * 0.9 });
      else if (rand() < 0.35 && bushes.length < 70) bushes.push({ x, y, s: 0.7 + rand() * 0.6 });
    }
    inst('bush', bushes, 0.28);
    inst('rock', rocks, 0.22);
    // sheep stand where the 2D view put its herds (the woolly ones)
    this.mixers = [];
    if (MODELS.sheep) {
      const src = MODELS.sheep;
      const box = new THREE.Box3().setFromObject(src.scene);
      const k = 0.17 / (box.max.y - box.min.y);
      const idle = src.animations.find((a) => /Idle/.test(a.name));
      for (const r of map.regions) {
        for (const h of this.deco[r.id].herd) {
          if (!h.sheep) continue;
          const o = SkeletonUtils.clone(src.scene);
          o.scale.setScalar(k * (0.9 + rand() * 0.25));
          o.position.set(toWorldX(h.x), this.height(h.x, h.y), toWorldZ(h.y));
          o.rotation.y = rand() * 6.28;
          o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
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
        for (const h of this.deco[r.id].herd) {
          if (h.sheep) continue;
          const o = this.makeHorse(['#7a4a2a', '#3a2418', '#c9a06a', '#efe8dc'][Math.floor(rand() * 4)]);
          o.root.position.set(toWorldX(h.x), this.height(h.x, h.y), toWorldZ(h.y));
          o.root.rotation.y = rand() * 6.28;
          o.play(rand() < 0.6 ? 'Eating' : 'Idle', rand());
          this.group.add(o.root);
          this.mixers.push(o.mixer);
        }
      }
    }
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
        const flag = r.kind === 'tribe' ? `rgb(${TRIBE_RGB[r.tribe].join(',')})` : r.kind === 'karasai' ? '#c43a2c' : r.kind === 'aria' ? null : `rgb(${GOLD.join(',')})`;
        const coat = r.kind === 'aria' ? '#efe8dc' : r.kind === 'karasai' ? '#22160e' : r.kind === 'false' ? '#4a3020' : '#7a4a2a';
        const cloth = r.kind === 'aria' ? '#8a5cd6' : r.kind === 'karasai' ? '#7a1f18' : r.kind === 'tribe' ? `rgb(${TRIBE_RGB[r.tribe].map((v) => (v * 0.7) | 0).join(',')})` : '#2f5a7a';
        o = this.makeHorse(coat);
        o.play('Gallop', Math.random());
        o.rider = this.makeRider(cloth, flag);
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
      const size = d.y.big ? 0.62 : 0.3;
      sp.position.set(toWorldX(d.y.x) + d.t * 0.35, this.height(d.y.x, d.y.y) + size * 1.35 + d.t * 0.9, toWorldZ(d.y.y) - d.t * 0.1);
      sp.scale.setScalar(0.12 + d.t * 0.35);
      sp.material.opacity = 0.45 * Math.sin(d.t * Math.PI);
    }
  }

  draw(g, now, look) {
    const { ctx } = this;
    const dt = Math.min(0.05, (now - (this.lastNow || now)) / 1000);
    this.lastNow = now;
    this.frameNo++;
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
    if (this.frameNo % 2 === 0 || !this.painted) {
      this.paintMap(g);
      this.tex.needsUpdate = true;
      this.painted = true;
    }
    // the world moves
    for (const m of this.mixers || []) m.update(dt);
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
    for (const r of g.map.regions) this.rings[r.id].visible = r.tribe >= 0 && g.t[r.id] >= 0.55;
    this.syncRiders(g, now, dt);
    this.stepSmoke(g, dt);
    this.renderer.render(this.scene, this.camera);

    // what the player reads, on top
    this.drawRoutes(g, now);
    this.drawMarks(g, now);
    this.drawParts(g, dt, 'under');
    this.drawParts(g, dt, 'over');
    for (const r of g.map.regions) {
      const [x, y] = this.toScreen(r.x, r.y);
      if (g.map.capitals.includes(r.id) && look.names) this.label(look.names[r.tribe], x, y + this.u * 0.8, Math.max(13, this.u * 1.5));
      if (look.numbers && r.tribe >= 0) this.label(String(Math.round(g.t[r.id] * 100)), x, y + this.u * 2.6, Math.max(10, this.u * 1.2));
    }
    this.drawPulse(g, now, look);
    this.drawHand(g, now, look);
    this.drawFx(g, now);
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
