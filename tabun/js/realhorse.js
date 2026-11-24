// Реалистичный конь: Warhorse Lite (Literock Studios, бесплатная лицензия: можно в играх, нельзя выкладывать файл отдельно).
// Клипы canter/idle запекаются в кадры: позиции и нормали считаются через кости (честный скиннинг),
// UV общие. Масть — шейдером: светотень и шерсть берём из текстуры, цвет — из масти инстанса.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { HORSE_H } from './horses.js';

export async function loadRealHorse(url, loUrl) {
  const [gltf, lo] = await Promise.all([new GLTFLoader().loadAsync(url), loUrl ? new GLTFLoader().loadAsync(loUrl) : null]);
  const clip = (name) => gltf.animations.find((a) => a.name === name);
  let mesh = null;
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
  const norm = {};
  const gallop = bakeTex(gltf, mesh, clip('canter_loop'), 16, norm);
  const idle = bakeTex(gltf, mesh, clip('idle_loop'), 20, norm);
  const material = texturedMaterial(mesh.material);
  // дальняя детализация: та же лошадь, упрощённая в Blender в 4 раза; UV и текстура те же
  let gallopLo = null, idleLo = null;
  if (lo) {
    const clipLo = (name) => lo.animations.find((a) => a.name === name);
    let ml = null;
    lo.scene.traverse((o) => { if (o.isSkinnedMesh && !ml) ml = o; });
    const normLo = {};
    gallopLo = bakeTex(lo, ml, clipLo('canter_loop'), 16, normLo);
    idleLo = bakeTex(lo, ml, clipLo('idle_loop'), 20, normLo);
  }
  return { gallop, idle, eat: idle, gallopLo, idleLo, material, textured: true };
}

function bakeTex(gltf, mesh, clip, frames, norm) {
  const scene = gltf.scene;
  const mixer = new THREE.AnimationMixer(scene);
  mixer.clipAction(clip).play();
  const g = mesh.geometry, n = g.attributes.position.count;
  // атрибуты квантованы и бывают упакованы с шагом (KHR_mesh_quantization) — читаем через getX/getY…, а не по массиву
  const PA = g.attributes.position, NA = g.attributes.normal, JA = g.attributes.skinIndex, WA = g.attributes.skinWeight;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), J = new Uint16Array(n * 4), W = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    P[i * 3] = PA.getX(i); P[i * 3 + 1] = PA.getY(i); P[i * 3 + 2] = PA.getZ(i);
    N[i * 3] = NA.getX(i); N[i * 3 + 1] = NA.getY(i); N[i * 3 + 2] = NA.getZ(i);
    J[i * 4] = JA.getX(i); J[i * 4 + 1] = JA.getY(i); J[i * 4 + 2] = JA.getZ(i); J[i * 4 + 3] = JA.getW(i);
    W[i * 4] = WA.getX(i); W[i * 4 + 1] = WA.getY(i); W[i * 4 + 2] = WA.getZ(i); W[i * 4 + 3] = WA.getW(i);
    const sw = W[i * 4] + W[i * 4 + 1] + W[i * 4 + 2] + W[i * 4 + 3] || 1;
    for (let k = 0; k < 4; k++) W[i * 4 + k] /= sw;
  }
  const sock = scene.getObjectByName('saddle_socket');
  const raw = [];
  const acc = new Float32Array(16), M = new THREE.Matrix4(), L = new THREE.Matrix4(), v = new THREE.Vector3(), nn = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (let f = 0; f < frames; f++) {
    mixer.setTime((f / frames) * clip.duration);
    scene.updateMatrixWorld(true);
    mesh.skeleton.update();
    const bm = mesh.skeleton.boneMatrices;
    L.copy(mesh.matrixWorld).multiply(mesh.bindMatrixInverse);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      acc.fill(0);
      for (let k = 0; k < 4; k++) {
        const w = W[i * 4 + k];
        if (!w) continue;
        const j = J[i * 4 + k] * 16;
        for (let e = 0; e < 16; e++) acc[e] += w * bm[j + e];
      }
      M.fromArray(acc).multiply(mesh.bindMatrix).premultiply(L);
      v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(M);
      nm.setFromMatrix4(M);
      nn.set(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]).applyMatrix3(nm).normalize();
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      nor[i * 3] = nn.x; nor[i * 3 + 1] = nn.y; nor[i * 3 + 2] = nn.z;
    }
    const s = sock ? sock.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    raw.push({ pos, nor, sock: s });
  }
  mixer.stopAllAction();
  // нормировка по первому кадру первого клипа (общая для всех клипов): копыта на земле, высота HORSE_H, морда в −Z
  if (!norm.s) {
    const p0 = raw[0].pos;
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = p0[i * 3], y = p0[i * 3 + 1], z = p0[i * 3 + 2];
      minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    norm.s = HORSE_H / (maxY - minY);
    norm.cx = (minX + maxX) / 2; norm.cz = (minZ + maxZ) / 2; norm.minY = minY;
    const alongX = maxX - minX > maxZ - minZ;
    let hs = 0, hn = 0;
    for (let i = 0; i < n; i++) if (p0[i * 3 + 1] > minY + (maxY - minY) * 0.8) { hs += alongX ? p0[i * 3] - norm.cx : p0[i * 3 + 2] - norm.cz; hn++; }
    const sg = Math.sign(hs / Math.max(1, hn)) || 1;
    norm.yaw = alongX ? (sg > 0 ? Math.PI / 2 : -Math.PI / 2) : (sg > 0 ? Math.PI : 0);
  }
  const cs = Math.cos(norm.yaw), sn = Math.sin(norm.yaw);
  const tr = (x, y, z, out, o) => {
    const X = (x - norm.cx) * norm.s, Y = (y - norm.minY) * norm.s, Z = (z - norm.cz) * norm.s;
    out[o] = X * cs + Z * sn; out[o + 1] = Y; out[o + 2] = -X * sn + Z * cs;
  };
  const idx = g.index;
  // UV тоже могут быть упакованы — копия в обычный массив
  const UA = g.attributes.uv, uvArr = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { uvArr[i * 2] = UA.getX(i); uvArr[i * 2 + 1] = UA.getY(i); }
  const uv = new THREE.BufferAttribute(uvArr, 2);
  const out = [];
  out.sock = [];
  for (const fr of raw) {
    const pos = fr.pos, nor = fr.nor;
    for (let i = 0; i < n; i++) {
      tr(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos, i * 3);
      const x = nor[i * 3], z = nor[i * 3 + 2];
      nor[i * 3] = x * cs + z * sn; nor[i * 3 + 2] = -x * sn + z * cs;
    }
    const geo = new THREE.BufferGeometry();
    geo.setIndex(idx);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', uv);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    out.push(geo);
    const sp = new Float32Array(3);
    tr(fr.sock.x, fr.sock.y, fr.sock.z, sp, 0);
    out.sock.push(new THREE.Vector3(sp[0], sp[1], sp[2]));
  }
  out.duration = clip.duration;
  out.yaw = norm.yaw;
  return out;
}

// масть по яркости текстуры: шерсть, мышцы и грива остаются, цвет — из instanceColor
function texturedMaterial(src) {
  const m = new THREE.MeshStandardMaterial({
    map: src.map, normalMap: src.normalMap,
    roughness: 0.78, metalness: 0, side: THREE.FrontSide,
  });
  m.normalScale.set(0.55, 0.55);
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `
#if defined( USE_INSTANCING_COLOR ) || defined( USE_COLOR )
  { float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    // средняя яркость текстуры гнедого ≈ 0.035: масть × (яркость точки / средняя) — шерсть и тени остаются
    float rel = clamp(l / 0.035, 0.0, 2.2);
    diffuseColor.rgb = vColor.rgb * mix(1.0, rel, 0.35); }
#endif`);
  };
  return m;
}
