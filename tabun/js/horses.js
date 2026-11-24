// Кони: анимация Quaternius «Horse» (CC0) запекается в кадры при загрузке,
// а табун рисуется InstancedMesh'ами — по одному на кадр. 300 коней = ~30 вызовов отрисовки.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';

export const HORSE_H = 1.75;  // высота коня с головой, м
const COAT_PARTS = { Main: 1, Main_Light: 1.32, Main_Dark: 0.62, Muzzle: 0.42, Hair: 0.3 };

// Масти: [название-ключ, цвет]. Табун игрока — смесь из набора «табуна», дикие — светлые, у соперника — вороные.
export const COATS = {
  bay: '#8a4f25', chestnut: '#a5582a', darkbay: '#5a3218', black: '#2a2220', grey: '#b9b4ac', white: '#e8e2d6',
  dun: '#c9a063', palomino: '#e0b56a', roan: '#8b6f68', red: '#b5462a', silver: '#9aa3a8',
};
export const HERD_SETS = {
  steppe: ['bay', 'chestnut', 'darkbay', 'bay', 'dun', 'black'],
  black: ['black', 'black', 'darkbay', 'black'],
  gold: ['palomino', 'dun', 'palomino', 'chestnut'],
  grey: ['grey', 'white', 'silver', 'grey'],
  fire: ['red', 'chestnut', 'red', 'bay'],
  pinto: ['white', 'black', 'bay', 'white', 'roan'],
};
export const WILD_COATS = ['grey', 'white', 'silver', 'roan', 'dun'];
export const RIVAL_COATS = ['black', 'black', 'darkbay'];

export async function loadHorse(url, onProgress) {
  const gltf = await new GLTFLoader().loadAsync(url, onProgress);
  const clip = (name) => gltf.animations.find((a) => a.name === name);
  const gallop = bake(gltf, clip('Gallop'), 12);
  const idle = bake(gltf, clip('Idle'), 8);
  const eat = bake(gltf, clip('Eating'), 8);
  return { gallop, idle, eat };
}

// один клип → массив BufferGeometry, общие index/color/coat
function bake(gltf, clip, frames) {
  const scene = gltf.scene;
  const meshes = [];
  scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  const mixer = new THREE.AnimationMixer(scene);
  const action = mixer.clipAction(clip);
  action.play();
  // общие атрибуты: цвет и маска масти
  let total = 0;
  for (const m of meshes) total += m.geometry.attributes.position.count;
  const color = new Float32Array(total * 3), coat = new Float32Array(total);
  const index = [];
  let off = 0;
  for (const m of meshes) {
    const g = m.geometry, n = g.attributes.position.count;
    const name = m.material.name;
    const shade = COAT_PARTS[name];
    const c = m.material.color;
    for (let i = 0; i < n; i++) {
      if (shade !== undefined) { color[(off + i) * 3] = color[(off + i) * 3 + 1] = color[(off + i) * 3 + 2] = shade; coat[off + i] = 1; }
      else { color[(off + i) * 3] = c.r; color[(off + i) * 3 + 1] = c.g; color[(off + i) * 3 + 2] = c.b; }
    }
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i++) index.push(idx[i] + off);
    off += n;
  }
  const out = [];
  const v = new THREE.Vector3();
  const positions = [];
  for (let f = 0; f < frames; f++) {
    mixer.setTime((f / frames) * clip.duration);
    scene.updateMatrixWorld(true);
    const pos = new Float32Array(total * 3);
    let o = 0;
    for (const m of meshes) {
      const n = m.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) {
        m.getVertexPosition(i, v);
        v.applyMatrix4(m.matrixWorld);
        pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
        o++;
      }
    }
    positions.push(pos);
  }
  // нормировка: по первому кадру — копыта на земле, высота HORSE_H, голова смотрит в −Z
  const p0 = positions[0];
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < total; i++) {
    const x = p0[i * 3], y = p0[i * 3 + 1], z = p0[i * 3 + 2];
    minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const s = HORSE_H / (maxY - minY);
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const alongX = maxX - minX > maxZ - minZ;
  // где голова: средняя координата верхних вершин
  let headSum = 0, headN = 0;
  for (let i = 0; i < total; i++) if (p0[i * 3 + 1] > minY + (maxY - minY) * 0.8) { headSum += alongX ? p0[i * 3] - cx : p0[i * 3 + 2] - cz; headN++; }
  const headSign = Math.sign(headSum / Math.max(1, headN)) || 1;
  const yaw = alongX ? (headSign > 0 ? Math.PI / 2 : -Math.PI / 2) : (headSign > 0 ? Math.PI : 0);
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  const idxAttr = new THREE.BufferAttribute(total > 65535 ? new Uint32Array(index) : new Uint16Array(index), 1);
  const colAttr = new THREE.BufferAttribute(color, 3);
  const coatAttr = new THREE.BufferAttribute(coat, 1);
  for (const pos of positions) {
    for (let i = 0; i < total; i++) {
      const x = (pos[i * 3] - cx) * s, y = (pos[i * 3 + 1] - minY) * s, z = (pos[i * 3 + 2] - cz) * s;
      pos[i * 3] = x * cs + z * sn;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = -x * sn + z * cs;
    }
    const g = new THREE.BufferGeometry();
    g.setIndex(idxAttr);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', colAttr);
    g.setAttribute('coat', coatAttr);
    g.computeBoundingSphere();
    g.boundingSphere.radius = 1e5; // мешки кадров не отсекаем — у инстансов свой разброс
    out.push(g);
  }
  mixer.stopAllAction();
  out.duration = clip.duration;
  return out;
}

export function horseMaterial() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float coat;')
      .replace('#include <color_vertex>', `#include <color_vertex>
#ifdef USE_INSTANCING_COLOR
  vColor.xyz = mix(color.xyz, color.xyz * instanceColor.xyz, coat);
#endif`);
  };
  return m;
}

// Набор InstancedMesh'ей одного клипа; каждый кадр — свой меш.
export class HorsePool {
  constructor(frames, material, cap, scene) {
    this.frames = frames;
    this.meshes = frames.map((g) => {
      const m = new THREE.InstancedMesh(g, material, cap);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      m.instanceColor.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
      m.frustumCulled = false;
      m.castShadow = false;
      scene.add(m);
      return m;
    });
    this.cap = cap;
  }
  begin() { for (const m of this.meshes) m.count = 0; }
  // phase 0..1 по клипу
  add(phase, matrix, color) {
    const f = Math.floor((((phase % 1) + 1) % 1) * this.frames.length) % this.frames.length;
    const m = this.meshes[f];
    if (m.count >= this.cap) return;
    m.setMatrixAt(m.count, matrix);
    m.setColorAt(m.count, color);
    m.count++;
  }
  end() {
    for (const m of this.meshes) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}
