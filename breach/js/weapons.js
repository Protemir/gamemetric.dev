// Weapons: stats, prices and first-person models.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeos } from './map.js';
import { gunGeometry, firstPersonArms, GUN_INFO } from './guns.js';

// dmg per bullet, rate = seconds between shots, spread in radians, recoil = view kick per shot,
// speed = run speed m/s with it in hand, pen = how much damage gets through armour
export const WEAPONS = {
  knife: { slot: 3, name: { ru: 'Нож', en: 'Knife' }, dmg: 34, rate: 0.42, range: 1.7, speed: 6.0, melee: true, reward: 1500 },
  pistol: { slot: 2, name: { ru: 'Пистолет «Оса»', en: '"Wasp" pistol' }, price: 200, dmg: 30, pen: 0.5, rate: 0.15, auto: false, mag: 12, reserve: 48, reload: 2.1, spread: 0.007, moveSpread: 0.035, recoil: 0.018, speed: 5.8, falloff: 0.86, reward: 300 },
  deagle: { slot: 2, name: { ru: 'Револьвер «Бизон»', en: '"Bison" revolver' }, price: 700, dmg: 58, pen: 0.85, rate: 0.32, auto: false, mag: 6, reserve: 30, reload: 2.4, spread: 0.005, moveSpread: 0.07, recoil: 0.06, speed: 5.6, falloff: 0.9, reward: 300 },
  smg: { slot: 1, name: { ru: 'ПП «Шмель»', en: '"Hornet" SMG' }, price: 1250, dmg: 25, pen: 0.6, rate: 0.075, auto: true, mag: 30, reserve: 120, reload: 2.3, spread: 0.012, moveSpread: 0.02, recoil: 0.0075, speed: 5.6, falloff: 0.78, reward: 600 },
  shotgun: { slot: 1, name: { ru: 'Дробовик «Молот»', en: '"Hammer" shotgun' }, price: 1700, dmg: 20, pellets: 9, pen: 0.5, rate: 0.9, auto: false, mag: 7, reserve: 28, reload: 2.9, shells: true, spread: 0.065, moveSpread: 0.01, recoil: 0.07, speed: 5.4, falloff: 0.55, reward: 900 },
  rifle: { slot: 1, name: { ru: 'Автомат «Гроза»', en: '"Storm" rifle' }, price: 2700, dmg: 35, pen: 0.78, rate: 0.1, auto: true, mag: 30, reserve: 90, reload: 2.5, spread: 0.0045, moveSpread: 0.075, recoil: 0.0125, speed: 5.15, falloff: 0.97, reward: 300 },
  sniper: { slot: 1, name: { ru: 'Снайперка «Ястреб»', en: '"Hawk" sniper' }, price: 4750, dmg: 115, pen: 0.97, rate: 1.45, auto: false, mag: 5, reserve: 20, reload: 3.4, spread: 0.06, scopedSpread: 0.0007, moveSpread: 0.12, recoil: 0.09, speed: 4.5, falloff: 0.99, reward: 100, scope: true },
  // the carbine: a little weaker than the Storm, steadier and quieter
  m4: { slot: 1, name: { ru: 'Карабин «Сокол»', en: '"Falcon" carbine' }, price: 3100, dmg: 31, pen: 0.76, rate: 0.09, auto: true, mag: 30, reserve: 90, reload: 2.4, spread: 0.0034, moveSpread: 0.068, recoil: 0.0105, speed: 5.25, falloff: 0.97, reward: 300 },
  // the light sniper: cheap, a head shot kills, accurate even in a jump
  scout: { slot: 1, name: { ru: 'Снайперка «Стриж»', en: '"Swift" sniper' }, price: 1700, dmg: 74, pen: 0.85, rate: 1.15, auto: false, mag: 10, reserve: 30, reload: 2.8, spread: 0.028, scopedSpread: 0.0011, moveSpread: 0.035, recoil: 0.06, speed: 5.45, falloff: 0.96, reward: 300, scope: true, steady: true },
  // the machine gun: a hundred rounds, heavy in the hands
  mg: { slot: 1, name: { ru: 'Пулемёт «Тайфун»', en: '"Typhoon" machine gun' }, price: 5200, dmg: 32, pen: 0.78, rate: 0.07, auto: true, mag: 100, reserve: 200, reload: 5.2, spread: 0.0085, moveSpread: 0.09, recoil: 0.0092, speed: 4.4, falloff: 0.95, reward: 300 },
  he: { slot: 4, name: { ru: 'Граната', en: 'HE grenade' }, price: 300, nade: true, speed: 5.8, reward: 300 },
  flash: { slot: 5, name: { ru: 'Светошумовая', en: 'Flashbang' }, price: 200, nade: true, speed: 5.8 },
};

export const GEAR = {
  armor: { name: { ru: 'Бронежилет', en: 'Kevlar vest' }, price: 650 },
  helmet: { name: { ru: 'Броня + шлем', en: 'Kevlar + helmet' }, price: 1000 },
};

export const BUY_LIST = [
  ['pistol', 'deagle'],
  ['smg', 'shotgun', 'rifle', 'm4', 'scout', 'sniper', 'mg'],
  ['armor', 'helmet', 'he', 'flash'],
];

// recoil climbs for the first shots, then wanders sideways like a real spray
export function recoilKick(w, shot) {
  const up = w.recoil * (shot < 8 ? 1 + shot * 0.12 : 1.4 - Math.min(0.9, (shot - 8) * 0.05));
  const side = shot < 4 ? (Math.random() - 0.5) * w.recoil * 0.3 : Math.sin(shot * 0.7) * w.recoil * 0.9 + (Math.random() - 0.5) * w.recoil * 0.6;
  return [up, side];
}

// first-person model in camera space: barrel along -z, origin at the right hand; muzzle position returned
export function viewModel(kind, team) {
  const geo = mergeGeos([gunGeometry(kind), ...firstPersonArms(kind, team)]);
  return { geo, muzzle: GUN_INFO[kind].muzzle };
}
