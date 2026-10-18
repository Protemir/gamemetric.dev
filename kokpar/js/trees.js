// Деревья вокруг поля: пирамидальные тополя лесополосами (как под Алматы), карагачи рощами,
// тянь-шанские ели ближе к горам (на юге, −z). Скрещённые плоскости с нарисованной кроной — дёшево и издалека как настоящие.
import * as THREE from 'three';

function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const rnd = (() => { let s = 99; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
function leaves(g, cx, cy, rx, ry, n, cols, size) { // крона из пятен листвы: светлее сверху-слева, темнее внизу
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.283, r = Math.sqrt(rnd());
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    const shade = (y - (cy - ry)) / (2 * ry) * 0.6 + (x - (cx - rx)) / (2 * rx) * 0.25;
    g.fillStyle = cols[Math.min(cols.length - 1, Math.floor(shade * cols.length + rnd() * 1.2))];
    g.beginPath(); g.ellipse(x, y, size * (0.6 + rnd()), size * (0.5 + rnd() * 0.7), rnd() * 3, 0, 6.3); g.fill();
  }
}
const KINDS = {
  poplar: { w: 0.32, h: 1, tex: () => tex(128, 512, (g, w, h) => {
    g.fillStyle = '#5a4632'; g.fillRect(w / 2 - 4, h * 0.82, 8, h * 0.18);
    leaves(g, w / 2, h * 0.47, w * 0.36, h * 0.42, 1400, ['#7fa05a', '#5f8a42', '#4a7234', '#36592a', '#26421f'], 7);
  }) },
  elm: { w: 0.95, h: 1, tex: () => tex(256, 256, (g, w, h) => {
    g.strokeStyle = '#4e3c2a'; g.lineWidth = 9; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2 + 4, h * 0.55); g.stroke();
    g.lineWidth = 4; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(w / 2, h * 0.65); g.lineTo(w / 2 + d * 40, h * 0.45); g.stroke(); }
    leaves(g, w / 2, h * 0.42, w * 0.44, h * 0.34, 1600, ['#88a860', '#6a9046', '#557a38', '#3f612b', '#2d4920'], 9);
  }) },
  spruce: { w: 0.42, h: 1, tex: () => tex(128, 384, (g, w, h) => {
    g.fillStyle = '#4a3a2a'; g.fillRect(w / 2 - 3, h * 0.88, 6, h * 0.12);
    for (let i = 0; i < 26; i++) { // ярусы лап: конус из треугольников
      const y = h * 0.04 + i * h * 0.033, half = (w * 0.47) * (0.12 + i / 26);
      g.fillStyle = i % 2 ? '#22391f' : '#2c4628';
      g.beginPath(); g.moveTo(w / 2, y - 6); g.lineTo(w / 2 - half, y + 26); g.lineTo(w / 2 + half, y + 26); g.closePath(); g.fill();
    }
    for (let i = 0; i < 500; i++) { const y = h * 0.05 + rnd() * h * 0.82, half = w * 0.45 * (0.12 + (y / h)); g.fillStyle = rnd() < 0.5 ? 'rgba(70,100,60,.5)' : 'rgba(15,28,14,.5)'; g.fillRect(w / 2 + (rnd() - 0.5) * 2 * half, y, 3, 2); }
  }) },
};

function crossed(wid) { // три скрещённые плоскости, нормаль вверх (крона освещена как земля)
  const parts = [];
  for (let k = 0; k < 3; k++) { const q = new THREE.PlaneGeometry(wid, 1); q.translate(0, 0.5, 0); q.rotateY((k * Math.PI) / 3); parts.push(q.toNonIndexed()); }
  let n = 0; for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), nor = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o * 3); uv.set(p.attributes.uv.array, o * 2); o += p.attributes.position.count; }
  for (let i = 0; i < n; i++) nor[i * 3 + 1] = 1;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return g;
}

export function makeTrees(scene, { snow, time }) {
  const spots = { poplar: [], elm: [], spruce: [] };
  const free = (x, z) => !(Math.abs(x) < 105 && Math.abs(z) < 80); // не на поле, не на зрителях и юртах
  // лесополосы тополей: прямые ряды
  for (const [x0, z0, x1, z1] of [[-420, 150, 380, 150], [-380, -175, 420, -175], [260, -520, 260, 400], [-300, -480, -300, 380], [-900, 330, 700, 330], [-650, -380, 650, -380]]) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 7);
    for (let i = 0; i <= n; i++) { if (rnd() < 0.06) continue; const t = i / n; const x = x0 + (x1 - x0) * t + (rnd() - 0.5) * 1.5, z = z0 + (z1 - z0) * t + (rnd() - 0.5) * 1.5; if (free(x, z)) spots.poplar.push([x, z, 15 + rnd() * 8]); }
  }
  // рощи карагача
  for (let c = 0; c < 26; c++) {
    const a = rnd() * 6.283, r = 130 + rnd() * 900, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    for (let i = 0; i < 6 + rnd() * 14; i++) { const x = cx + (rnd() - 0.5) * 60, z = cz + (rnd() - 0.5) * 45; if (free(x, z)) spots.elm.push([x, z, 7 + rnd() * 6]); }
  }
  // ели — к горам (юг), чем дальше, тем гуще
  for (let i = 0; i < 520; i++) { const x = (rnd() - 0.5) * 2000, z = -330 - rnd() * 800; if (rnd() < 0.35 + (-z - 330) / 900) spots.spruce.push([x, z, 14 + rnd() * 12]); }

  const out = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (const [kind, list] of Object.entries(spots)) {
    const K = KINDS[kind];
    const mat = new THREE.MeshLambertMaterial({ map: K.tex(), alphaTest: 0.5, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => { // ветер качает верх кроны; зимой — иней
      sh.uniforms.time = time; sh.uniforms.snow = snow;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float time;').replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = instanceMatrix[3].x * .05 + instanceMatrix[3].z * .07;
        transformed.x += sin(time * .9 + ph) * .025 * position.y * position.y;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float snow;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(.85, .88, .92) * (.5 + diffuseColor.g), snow * .55);');
    };
    const im = new THREE.InstancedMesh(crossed(K.w), mat, list.length);
    list.forEach(([x, z, hgt], i) => {
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rnd() * 6.28);
      s.set(hgt, hgt, hgt); p.set(x, -0.3, z);
      im.setMatrixAt(i, m.compose(p, q, s));
    });
    im.frustumCulled = false; im.receiveShadow = false; im.castShadow = false;
    scene.add(im); out.push(im);
  }
  return out;
}
