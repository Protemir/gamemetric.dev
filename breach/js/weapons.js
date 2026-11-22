// Weapons: stats, prices and first-person models.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeos } from './map.js';

// dmg per bullet, rate = seconds between shots, spread in radians, recoil = view kick per shot,
// speed = run speed m/s with it in hand, pen = how much damage gets through armour
export const WEAPONS = {
  knife: { slot: 3, name: { ru: 'Нож', en: 'Knife' }, dmg: 34, rate: 0.42, range: 1.7, speed: 6.0, melee: true, reward: 1500 },
  pistol: { slot: 2, name: { ru: 'Пистолет «Оса»', en: '"Wasp" pistol' }, price: 200, dmg: 30, pen: 0.5, rate: 0.15, auto: false, mag: 12, reserve: 48, reload: 2.1, spread: 0.007, moveSpread: 0.035, recoil: 0.018, speed: 5.8, falloff: 0.86, reward: 300 },
  deagle: { slot: 2, name: { ru: 'Револьвер «Бизон»', en: '"Bison" revolver' }, price: 700, dmg: 58, pen: 0.85, rate: 0.32, auto: false, mag: 6, reserve: 30, reload: 2.4, spread: 0.005, moveSpread: 0.07, recoil: 0.06, speed: 5.6, falloff: 0.9, reward: 300 },
  smg: { slot: 1, name: { ru: 'ПП «Шмель»', en: '"Hornet" SMG' }, price: 1250, dmg: 25, pen: 0.6, rate: 0.075, auto: true, mag: 30, reserve: 120, reload: 2.3, spread: 0.012, moveSpread: 0.02, recoil: 0.0075, speed: 5.6, falloff: 0.78, reward: 600 },
  shotgun: { slot: 1, name: { ru: 'Дробовик «Молот»', en: '"Hammer" shotgun' }, price: 1700, dmg: 20, pellets: 9, pen: 0.5, rate: 0.9, auto: false, mag: 7, reserve: 28, reload: 2.9, spread: 0.065, moveSpread: 0.01, recoil: 0.07, speed: 5.4, falloff: 0.55, reward: 900 },
  rifle: { slot: 1, name: { ru: 'Автомат «Гроза»', en: '"Storm" rifle' }, price: 2700, dmg: 35, pen: 0.78, rate: 0.1, auto: true, mag: 30, reserve: 90, reload: 2.5, spread: 0.0045, moveSpread: 0.075, recoil: 0.0125, speed: 5.15, falloff: 0.97, reward: 300 },
  sniper: { slot: 1, name: { ru: 'Снайперка «Ястреб»', en: '"Hawk" sniper' }, price: 4750, dmg: 115, pen: 0.97, rate: 1.45, auto: false, mag: 5, reserve: 20, reload: 3.4, spread: 0.06, scopedSpread: 0.0007, moveSpread: 0.12, recoil: 0.09, speed: 4.5, falloff: 0.99, reward: 100, scope: true },
  he: { slot: 4, name: { ru: 'Граната', en: 'HE grenade' }, price: 300, nade: true, speed: 5.8, reward: 300 },
  flash: { slot: 5, name: { ru: 'Светошумовая', en: 'Flashbang' }, price: 200, nade: true, speed: 5.8 },
};

export const GEAR = {
  armor: { name: { ru: 'Бронежилет', en: 'Kevlar vest' }, price: 650 },
  helmet: { name: { ru: 'Броня + шлем', en: 'Kevlar + helmet' }, price: 1000 },
};

export const BUY_LIST = [
  ['pistol', 'deagle'],
  ['smg', 'shotgun', 'rifle', 'sniper'],
  ['armor', 'helmet', 'he', 'flash'],
];

// recoil climbs for the first shots, then wanders sideways like a real spray
export function recoilKick(w, shot) {
  const up = w.recoil * (shot < 8 ? 1 + shot * 0.12 : 1.4 - Math.min(0.9, (shot - 8) * 0.05));
  const side = shot < 4 ? (Math.random() - 0.5) * w.recoil * 0.3 : Math.sin(shot * 0.7) * w.recoil * 0.9 + (Math.random() - 0.5) * w.recoil * 0.6;
  return [up, side];
}

const SHADE = (ny, nx, nz) => (Math.abs(ny) > 0.5 ? (ny > 0 ? 1 : 0.5) : Math.abs(nx) > 0.5 ? 0.78 : nz > 0 ? 0.68 : 0.9);
function vbox(w, h, d, color, x, y, z, rx = 0, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  const n = g.attributes.normal, c = new THREE.Color(color), col = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const s = SHADE(n.getY(i), n.getX(i), n.getZ(i));
    col[i * 3] = c.r * s;
    col[i * 3 + 1] = c.g * s;
    col[i * 3 + 2] = c.b * s;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// first-person model in camera space: barrel along -z, muzzle position returned
export function viewModel(kind, team) {
  const sleeve = team === 'A' ? 0x2c3e57 : 0x6a1f24;
  const glove = team === 'A' ? 0x1b1f24 : 0x2a2a2e;
  const dark = 0x2a2c31, steel = 0x464a52, wood = 0x7a4c2a, black = 0x151618;
  const parts = [];
  let muzzle = [0, 0, -0.5];
  const handR = (x, y, z) => {
    parts.push(vbox(0.085, 0.09, 0.11, glove, x, y, z));
    parts.push(vbox(0.1, 0.1, 0.34, sleeve, x + 0.02, y - 0.03, z + 0.2, 0.15));
  };
  const handL = (x, y, z) => {
    parts.push(vbox(0.085, 0.085, 0.11, glove, x, y, z));
    parts.push(vbox(0.1, 0.1, 0.36, sleeve, x - 0.05, y - 0.05, z + 0.2, 0.2, -0.35));
  };
  switch (kind) {
    case 'knife':
      parts.push(vbox(0.008, 0.04, 0.19, 0x9aa2ac, 0.0, 0.02, -0.14), vbox(0.006, 0.012, 0.18, 0xe6eaee, 0.0, 0.042, -0.14), vbox(0.05, 0.012, 0.02, steel, 0, 0.012, -0.045), vbox(0.03, 0.04, 0.11, black, 0, 0, 0.0));
      handR(0, -0.01, 0.02);
      muzzle = [0, 0.02, -0.25];
      break;
    case 'pistol':
    case 'deagle': {
      const big = kind === 'deagle';
      parts.push(vbox(0.045, 0.055, big ? 0.24 : 0.19, big ? steel : dark, 0, 0.03, -0.07), vbox(0.04, 0.1, 0.05, black, 0, -0.03, 0.01, 0.25));
      if (big) parts.push(vbox(0.05, 0.05, 0.06, black, 0, 0.03, -0.03));
      handR(0.005, -0.04, 0.03);
      handL(-0.03, -0.05, 0.0);
      muzzle = [0, 0.035, big ? -0.2 : -0.17];
      break;
    }
    case 'smg':
      parts.push(vbox(0.055, 0.08, 0.32, dark, 0, 0.02, -0.12), vbox(0.035, 0.15, 0.045, black, 0, -0.08, -0.1), vbox(0.03, 0.03, 0.12, steel, 0, 0.03, -0.33), vbox(0.04, 0.09, 0.04, black, 0, -0.04, 0.0, 0.3), vbox(0.02, 0.02, 0.16, steel, 0, 0.02, 0.1));
      handR(0.005, -0.05, 0.02);
      handL(-0.01, -0.03, -0.22);
      muzzle = [0, 0.03, -0.4];
      break;
    case 'shotgun':
      parts.push(vbox(0.05, 0.06, 0.62, steel, 0, 0.03, -0.24), vbox(0.06, 0.06, 0.2, wood, 0, -0.02, -0.34), vbox(0.055, 0.1, 0.2, wood, 0, -0.01, 0.12, 0.12), vbox(0.05, 0.03, 0.55, black, 0, -0.005, -0.22));
      handR(0.005, -0.06, 0.04);
      handL(-0.01, -0.06, -0.33);
      muzzle = [0, 0.03, -0.56];
      break;
    case 'rifle':
      parts.push(
        vbox(0.055, 0.1, 0.5, dark, 0, 0.02, -0.16),
        vbox(0.045, 0.17, 0.06, black, 0, -0.1, -0.12, -0.25),
        vbox(0.03, 0.03, 0.2, steel, 0, 0.04, -0.5),
        vbox(0.06, 0.07, 0.2, wood, 0, 0.0, -0.32),
        vbox(0.05, 0.11, 0.2, wood, 0, -0.01, 0.17, 0.1),
        vbox(0.02, 0.04, 0.02, black, 0, 0.09, -0.36),
        vbox(0.04, 0.035, 0.08, black, 0, 0.085, -0.04),
      );
      handR(0.005, -0.06, 0.02);
      handL(-0.01, -0.04, -0.3);
      muzzle = [0, 0.04, -0.6];
      break;
    case 'sniper':
      parts.push(
        vbox(0.055, 0.085, 0.7, 0x34402e, 0, 0.02, -0.22),
        vbox(0.025, 0.025, 0.25, black, 0, 0.035, -0.66),
        vbox(0.05, 0.05, 0.26, black, 0, 0.1, -0.12),
        vbox(0.065, 0.065, 0.04, black, 0, 0.1, -0.25),
        vbox(0.065, 0.065, 0.04, black, 0, 0.1, 0.0),
        vbox(0.055, 0.12, 0.24, 0x34402e, 0, -0.02, 0.2, 0.1),
        vbox(0.04, 0.09, 0.05, black, 0, -0.07, -0.02, 0.2),
      );
      handR(0.005, -0.06, 0.0);
      handL(-0.01, -0.03, -0.3);
      muzzle = [0, 0.035, -0.8];
      break;
    case 'he':
    case 'flash':
      parts.push(vbox(0.07, 0.1, 0.07, kind === 'he' ? 0x3e5a2c : 0x9aa0a8, 0, 0.04, -0.04), vbox(0.03, 0.03, 0.03, steel, 0, 0.1, -0.04), vbox(0.012, 0.06, 0.03, steel, 0.035, 0.08, -0.04));
      handR(0.0, -0.01, 0.0);
      muzzle = [0, 0.04, -0.06];
      break;
  }
  const geo = mergeGeos(parts);
  return { geo, muzzle };
}
