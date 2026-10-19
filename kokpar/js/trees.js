// Деревья вокруг поля: пирамидальные тополя лесополосами (как под Алматы), карагачи рощами,
// тянь-шанские ели ближе к горам (на юге, −z), кусты у подножия. Скрещённые плоскости с нарисованной кроной — дёшево и издалека как настоящие.
// Чтобы не было «одинаковых ёлочек»: по два рисунка кроны на породу, свой оттенок, рост, ширина и наклон у каждого дерева,
// нормали «шаром» (крона светлее со стороны солнца), под деревьями — мягкая тень на земле.
import * as THREE from 'three';

// Прозрачные пиксели холста — чёрные, и при уменьшении (мипмапы) край кроны темнеет «обводкой».
// Поэтому перекладываем картинку в DataTexture, а прозрачным пикселям даём средний цвет листвы.
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  draw(g, w, h);
  const src = g.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h * 4);
  let r = 0, gg = 0, b = 0, n = 0;
  for (let i = 0; i < src.length; i += 4) if (src[i + 3] > 128) { r += src[i]; gg += src[i + 1]; b += src[i + 2]; n++; }
  if (n) { r /= n; gg /= n; b /= n; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { // строки снизу вверх — как у CanvasTexture с flipY
    const i = (y * w + x) * 4, o = ((h - 1 - y) * w + x) * 4, a = src[i + 3];
    out[o] = a > 128 ? src[i] : r; out[o + 1] = a > 128 ? src[i + 1] : gg; out[o + 2] = a > 128 ? src[i + 2] : b; out[o + 3] = a;
  }
  const t = new THREE.DataTexture(out, w, h);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
const rnd = (() => { let s = 99; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
// крона из пятен листвы: несколько «облаков» листвы, светлее сверху-слева, темнее внизу и внутри, с просветами
function crown(g, blobs, n, cols, size) {
  for (let i = 0; i < n; i++) {
    const b = blobs[Math.floor(rnd() * blobs.length)];
    const a = rnd() * 6.283, r = Math.sqrt(rnd());
    const x = b.x + Math.cos(a) * b.rx * r, y = b.y + Math.sin(a) * b.ry * r;
    const lit = (1 - r) * 0.25 + (b.y - b.ry - y) / (-2 * b.ry) * 0.55 + (x < b.x ? 0.15 : 0);
    g.fillStyle = cols[Math.max(0, Math.min(cols.length - 1, Math.floor((1 - lit) * cols.length * 0.9 + rnd() * 1.4)))];
    g.beginPath(); g.ellipse(x, y, size * (0.5 + rnd()), size * (0.4 + rnd() * 0.7), rnd() * 3, 0, 6.3); g.fill();
  }
}
function holes(g, w, h, n, y0, y1) { // просветы неба в кроне
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) { g.beginPath(); g.ellipse(w * (0.25 + rnd() * 0.5), h * (y0 + rnd() * (y1 - y0)), 2 + rnd() * 5, 2 + rnd() * 4, rnd() * 3, 0, 6.3); g.fill(); }
  g.globalCompositeOperation = 'source-over';
}
function trunk(g, x, y0, y1, w0, w1, col) {
  g.fillStyle = col; g.beginPath(); g.moveTo(x - w0 / 2, y0); g.lineTo(x - w1 / 2, y1); g.lineTo(x + w1 / 2, y1); g.lineTo(x + w0 / 2, y0); g.closePath(); g.fill();
}
const GREEN = ['#a8b878', '#8ea064', '#768c52', '#5f7642', '#4b6035', '#3a4c2a', '#2b3a21']; // приглушённая, чуть оливковая листва — сухой юг
const ELMG = ['#acbc7a', '#91a466', '#788f54', '#617a44', '#4c6337', '#3a4e2b', '#2c3c21'];
// листва мелкими мазками по силуэту: shape(t) — полуширина кроны на высоте t (0 — низ, 1 — верх)
function foliage(g, w, h, y0, y1, shape, n, cols, dab) {
  for (let i = 0; i < n; i++) {
    const t = rnd(), half = shape(t) * w / 2;
    if (half < 1) continue;
    const u = (rnd() * 2 - 1) * Math.sqrt(rnd()), x = w / 2 + u * half, y = y0 + (y1 - y0) * (1 - t) + (rnd() - 0.5) * 6;
    const lit = 0.3 + t * 0.26 - u * 0.2 + (rnd() - 0.5) * 0.3; // свет сверху-слева
    g.fillStyle = cols[Math.max(0, Math.min(cols.length - 1, Math.floor((1 - lit) * cols.length)))];
    g.beginPath(); g.ellipse(x, y, dab * (0.5 + rnd() * 0.7), dab * (0.7 + rnd() * 0.8), (rnd() - 0.5) * 1.2, 0, 6.3); g.fill();
  }
}
const KINDS = {
  poplar: { w: 0.3, variants: 2, draw: (v) => tex(128, 512, (g, w, h) => {
    trunk(g, w / 2, h, h * 0.6, 9, 4, '#6a5a46');
    // пирамидальный тополь: веретено, самое широкое на трети высоты, острая макушка
    const sh = (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.06)), 0.75) * (1 - t * 0.35) * (v ? 0.9 : 0.78) * (0.92 + 0.08 * Math.sin(t * 23));
    foliage(g, w, h, h * 0.9, h * 0.02, sh, 6000, GREEN, 3.8); holes(g, w, h, 14, 0.2, 0.8);
  }) },
  elm: { w: 0.95, variants: 2, draw: (v) => tex(256, 256, (g, w, h) => {
    trunk(g, w / 2 + (v ? 6 : -4), h, h * 0.5, 14, 7, '#4e3c2a');
    g.strokeStyle = '#4e3c2a'; g.lineCap = 'round';
    for (const d of v ? [-1, 1, 0.4] : [-1, 1]) { g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, h * 0.68); g.quadraticCurveTo(w / 2 + d * 20, h * 0.55, w / 2 + d * 52, h * 0.4); g.stroke(); }
    const blobs = [{ x: w / 2, y: h * 0.33, rx: w * 0.3, ry: h * 0.2 }, { x: w * 0.27, y: h * 0.47, rx: w * 0.2, ry: h * 0.15 }, { x: w * 0.73, y: h * 0.44, rx: w * 0.21, ry: h * 0.16 }];
    if (v) blobs.push({ x: w * 0.55, y: h * 0.2, rx: w * 0.2, ry: h * 0.13 });
    crown(g, blobs, 5200, ELMG, 4.6); holes(g, w, h, 30, 0.15, 0.6);
  }) },
  spruce: { w: 0.42, variants: 2, draw: (v) => tex(128, 384, (g, w, h) => {
    trunk(g, w / 2, h, h * 0.85, 7, 5, '#4a3a2a');
    const tiers = 22 + v * 5;
    for (let i = 0; i < tiers; i++) { // ярусы лап: свисающие ветви, к низу шире; на каждой — тёмная и светлая сторона
      const t = i / tiers, y = h * 0.03 + t * h * 0.84, half = w * 0.47 * (0.1 + t * 0.9) * (0.85 + rnd() * 0.3);
      for (const [side, col] of [[-1, '#2c4a2a'], [1, '#1c3220']]) {
        g.fillStyle = col; g.beginPath(); g.moveTo(w / 2, y - 4);
        g.quadraticCurveTo(w / 2 + side * half * 0.6, y + 4, w / 2 + side * half, y + 16 + rnd() * 6);
        g.lineTo(w / 2 + side * half * 0.4, y + 12); g.lineTo(w / 2, y + 10); g.closePath(); g.fill();
      }
    }
    for (let i = 0; i < 700; i++) { const y = h * 0.04 + rnd() * h * 0.82, half = w * 0.45 * (0.1 + (y / h)); g.fillStyle = rnd() < 0.45 ? 'rgba(96,130,82,.55)' : 'rgba(12,24,12,.5)'; g.fillRect(w / 2 + (rnd() - 0.5) * 2 * half, y, 2 + rnd() * 2, 2); }
  }) },
  bush: { w: 1.6, variants: 2, draw: (v) => tex(256, 128, (g, w, h) => {
    const blobs = [{ x: w * 0.5, y: h * 0.62, rx: w * 0.3, ry: h * 0.32 }, { x: w * 0.25, y: h * 0.75, rx: w * 0.2, ry: h * 0.22 }, { x: w * 0.76, y: h * 0.72, rx: w * 0.2, ry: h * 0.25 }];
    crown(g, blobs, 2600, v ? ['#b0a868', '#949452', '#787c42', '#5e6634', '#454e28'] : ELMG, 4.5);
  }) },
};

function crossed(wid, planes = 3) { // скрещённые плоскости; нормали «шаром» от оси ствола — сторона к солнцу светлее, обратная в тени
  const parts = [];
  for (let k = 0; k < planes; k++) { const q = new THREE.PlaneGeometry(wid, 1); q.translate(0, 0.5, 0); q.rotateY((k * Math.PI) / planes); parts.push(q.toNonIndexed()); }
  let n = 0; for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), nor = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o * 3); uv.set(p.attributes.uv.array, o * 2); o += p.attributes.position.count; }
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) { v.set(pos[i * 3] / wid * 2.2, 0.55 + (pos[i * 3 + 1] - 0.5) * 0.6, pos[i * 3 + 2] / wid * 2.2).normalize(); nor.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return g;
}

export function makeTrees(scene, { snow, time }) {
  const spots = { poplar: [], elm: [], spruce: [], bush: [] };
  const free = (x, z) => !(Math.abs(x) < 105 && Math.abs(z) < 80); // не на поле, не на зрителях и юртах
  const shade = []; // пятна тени на земле: [x, z, радиус по x, по z, поворот]
  // лесополосы тополей: прямые ряды с пропусками, редкими карагачами и кустами вдоль арыка
  for (const [x0, z0, x1, z1] of [[-420, 150, 380, 150], [-380, -175, 420, -175], [260, -520, 260, 400], [-300, -480, -300, 380], [-900, 330, 700, 330], [-650, -380, 650, -380]]) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 7), ang = Math.atan2(z1 - z0, x1 - x0);
    let gap = 0;
    for (let i = 0; i <= n; i++) {
      if (gap > 0) { gap--; continue; }
      if (rnd() < 0.025) { gap = 2 + Math.floor(rnd() * 5); continue; } // выпавший кусок лесополосы
      const t = i / n; const x = x0 + (x1 - x0) * t + (rnd() - 0.5) * 2, z = z0 + (z1 - z0) * t + (rnd() - 0.5) * 2;
      if (!free(x, z)) continue;
      if (rnd() < 0.08) spots.elm.push([x, z, 8 + rnd() * 5]); else spots.poplar.push([x, z, (12 + rnd() * 11) * (rnd() < 0.12 ? 0.6 : 1)]); // молодые пониже
      if (rnd() < 0.55) { const o = (rnd() - 0.5) * 7; spots.bush.push([x + Math.sin(ang) * o, z - Math.cos(ang) * o, 1.4 + rnd() * 1.8]); }
      if (i % 4 === 0) shade.push([x, z, 16, 6, -ang]);
    }
  }
  // рощи карагача с подлеском
  for (let c = 0; c < 26; c++) {
    const a = rnd() * 6.283, r = 130 + rnd() * 900, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    const n = 6 + rnd() * 14;
    for (let i = 0; i < n; i++) {
      const x = cx + (rnd() - 0.5) * 60, z = cz + (rnd() - 0.5) * 45;
      if (!free(x, z)) continue;
      spots.elm.push([x, z, 6 + rnd() * 7]);
      if (rnd() < 0.7) spots.bush.push([x + (rnd() - 0.5) * 10, z + (rnd() - 0.5) * 10, 1.2 + rnd() * 2]);
    }
    if (free(cx, cz)) shade.push([cx, cz, 38, 30, rnd() * 3]);
  }
  // одиночные кусты по степи
  for (let i = 0; i < 160; i++) { const a = rnd() * 6.283, r = 120 + rnd() * 700, x = Math.cos(a) * r, z = Math.sin(a) * r; if (free(x, z)) spots.bush.push([x, z, 1 + rnd() * 1.6]); }
  // ели — к горам (юг), чем дальше, тем гуще; группами, а не ровным ковром
  for (let i = 0; i < 560; i++) {
    const x = (rnd() - 0.5) * 2000, z = -330 - rnd() * 800;
    const clump = 0.5 + 0.5 * Math.sin(x * 0.011) * Math.cos(z * 0.013 + 1.7);
    if (rnd() < (0.25 + (-z - 330) / 900) * (0.4 + clump)) spots.spruce.push([x, z, (12 + rnd() * 14) * (rnd() < 0.15 ? 0.55 : 1)]);
  }

  const out = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  for (const [kind, list] of Object.entries(spots)) {
    const K = KINDS[kind];
    for (let v = 0; v < K.variants; v++) {
      const part = list.filter((_, i) => i % K.variants === v);
      if (!part.length) continue;
      const mat = new THREE.MeshLambertMaterial({ map: K.draw(v), alphaTest: 0.5, side: THREE.DoubleSide });
      mat.onBeforeCompile = (sh) => { // ветер качает верх кроны; зимой — иней
        sh.uniforms.time = time; sh.uniforms.snow = snow;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float time;').replace('#include <begin_vertex>', `#include <begin_vertex>
          float ph = instanceMatrix[3].x * .05 + instanceMatrix[3].z * .07;
          float sway = sin(time * .9 + ph) + .35 * sin(time * 2.3 + ph * 3.);
          transformed.x += sway * .022 * position.y * position.y; transformed.z += sway * .01 * position.y * position.y;`);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float snow;').replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(.85, .88, .92) * (.45 + diffuseColor.g * 1.2), snow * .72);'); // иней — после оттенка дерева, иначе зимой желтеет
      };
      const im = new THREE.InstancedMesh(crossed(K.w, kind === 'bush' ? 2 : 3), mat, part.length);
      part.forEach(([x, z, hgt], i) => {
        e.set((rnd() - 0.5) * 0.07, rnd() * 6.28, (rnd() - 0.5) * 0.07); q.setFromEuler(e); // чуть набок, как растут
        const wd = hgt * (0.8 + rnd() * 0.45);
        s.set(wd, hgt, wd); p.set(x, -0.35, z);
        im.setMatrixAt(i, m.compose(p, q, s));
        // свой оттенок: светлее/темнее, у лиственных — изредка уже желтеющие (октябрь под Алматы)
        const k = 0.82 + rnd() * 0.32;
        if (kind !== 'spruce' && rnd() < 0.14) col.setRGB(k * 1.25, k * 1.05, k * 0.55); else col.setRGB(k * (0.95 + rnd() * 0.1), k, k * (0.9 + rnd() * 0.12));
        im.setColorAt(i, col);
      });
      im.frustumCulled = false; im.receiveShadow = false; im.castShadow = false;
      scene.add(im); out.push(im);
    }
  }
  // мягкая тень под лесополосами и рощами — деревья «стоят», а не висят над степью
  const shTex = tex(64, 64, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); // alphaMap берёт яркость
  const shMat = new THREE.MeshBasicMaterial({ color: '#2a2412', alphaMap: shTex, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  shMat.onBeforeCompile = (sh) => { // зимой тень бледнее
    sh.uniforms.snow = snow;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float snow;').replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= 1. - snow * .5;');
  };
  const shGeo = new THREE.PlaneGeometry(1, 1); shGeo.rotateX(-Math.PI / 2);
  const sim = new THREE.InstancedMesh(shGeo, shMat, shade.length);
  shade.forEach(([x, z, rx, rz, a], i) => { q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, a); s.set(rx * 2, 1, rz * 2); p.set(x, 0.04, z); sim.setMatrixAt(i, m.compose(p, q, s)); });
  sim.frustumCulled = false; sim.renderOrder = -1;
  scene.add(sim); out.push(sim);
  return out;
}

// Коршуны кружат над степью: крылья из двух треугольников, взмахи, парение и круги считает шейдер — на процессор ничего.
export function makeBirds(scene, time) {
  const g = new THREE.BufferGeometry();
  const p = [0, 0, 0.35, -0.95, 0, -0.12, 0, 0, -0.22, 0, 0, 0.35, 0, 0, -0.22, 0.95, 0, -0.12, 0, 0, -0.22, -0.13, 0, -0.62, 0.13, 0, -0.62];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const mat = new THREE.MeshBasicMaterial({ color: '#2b241d', side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.time = time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float time;').replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = instanceMatrix[3].x * .37 + instanceMatrix[3].z * .23;
      float a = time * (.1 + fract(ph * 3.1) * .08) + ph;
      float glide = smoothstep(.1, .7, sin(time * .3 + ph * 5.));
      transformed.y += (sin(time * 7. + ph * 9.) * .5 * (1. - glide) + .14) * abs(position.x);
      float c = cos(-a), s = sin(-a);
      transformed.xz = vec2(transformed.x * c + transformed.z * s, -transformed.x * s + transformed.z * c);
      transformed += vec3(cos(a) * 24., sin(time * .2 + ph) * 2., sin(a) * 24.);`);
  };
  const spots = [[160, 52, -120], [-220, 64, 90], [60, 44, 260], [-380, 70, -260], [420, 58, 180], [-90, 48, -340], [300, 66, -380], [-500, 75, 320], [520, 60, -60]];
  const im = new THREE.InstancedMesh(g, mat, spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1.5, 1.5, 1.5), v = new THREE.Vector3();
  spots.forEach(([x, y, z], i) => im.setMatrixAt(i, m.compose(v.set(x, y, z), q, s)));
  im.frustumCulled = false;
  scene.add(im);
  return im;
}
