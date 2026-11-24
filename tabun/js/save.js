// Сохранение «Табуна» в localStorage. Если хранилища нет — играем без сохранения.
import { ACH } from './ach.js';
const KEY = 'tabun.save.v1';
const DEF = { lvl: 1, coins: 0, up: { herd: 0, income: 0, leader: 0 }, sets: ['steppe'], set: 'steppe', sound: true, daily: { last: '', streak: 0 }, best: 0, played: 0, stars: {}, music: true, ach: {}, quality: 'auto' };

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object' && !Array.isArray(s)) return sanitize(s);
  } catch { /* испорчено или нет доступа */ }
  return structuredClone(DEF);
}

// испорченное или старое сохранение: каждое поле — к своему типу и диапазону, иначе значение по умолчанию
const int = (v, lo, hi, d) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.min(hi, Math.max(lo, Math.floor(Number(v)))) : d);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
function sanitize(s) {
  const up = obj(s.up);
  const sets = (Array.isArray(s.sets) ? s.sets : []).filter((k) => typeof k === 'string' && k in SETS);
  if (!sets.includes('steppe')) sets.unshift('steppe');
  const stars = {};
  for (const [k, v] of Object.entries(obj(s.stars))) if (int(k, 1, 1e6, 0) && int(v, 0, 3, 0)) stars[int(k, 1, 1e6, 1)] = int(v, 0, 3, 0);
  const ach = {};
  for (const k of Object.keys(obj(s.ach))) if (ACH.some((a) => a.id === k)) ach[k] = 1;
  const daily = obj(s.daily);
  const dd = obj(s.dailyDiff);
  return {
    ...DEF,
    lvl: int(s.lvl, 1, 1e6, 1),
    coins: int(s.coins, 0, 1e9, 0),
    up: { herd: int(up.herd, 0, UPS.herd.max, 0), income: int(up.income, 0, UPS.income.max, 0), leader: int(up.leader, 0, UPS.leader.max, 0) },
    sets,
    set: sets.includes(s.set) ? s.set : 'steppe',
    sound: s.sound !== false,
    music: s.music !== false,
    daily: { last: typeof daily.last === 'string' ? daily.last : '', streak: int(daily.streak, 0, 1e6, 0) },
    best: int(s.best, 0, 999, 0),
    played: int(s.played, 0, 1e9, 0),
    stars,
    ach,
    quality: ['auto', 'high', 'mid', 'low'].includes(s.quality) ? s.quality : 'auto',
    dailyWin: typeof s.dailyWin === 'string' ? s.dailyWin : '',
    dailyDiff: Number.isFinite(dd.day) && Number.isFinite(dd.diff) ? { day: dd.day, diff: int(dd.diff, 4, 30, 4) } : null,
  };
}
export function store(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* нет доступа */ }
}

// —— экономика ——
export const UPS = {
  herd: { base: 40, k: 1.32, max: 40 },
  income: { base: 60, k: 1.4, max: 30 },
  leader: { base: 50, k: 1.36, max: 40 },
};
export const upCost = (key, lvl) => Math.round(UPS[key].base * Math.pow(UPS[key].k, lvl) / 5) * 5;
export const startHerd = (s) => 5 + s.up.herd;
export const leaderBonus = (s) => s.up.leader * 3;
export const starsFor = (mult) => (mult >= 4 ? 3 : mult >= 2 ? 2 : 1);
export const totalStars = (s) => Object.values(s.stars || {}).reduce((a, b) => a + (Number(b) || 0), 0);
export const SETS = { steppe: 0, gold: 400, black: 800, grey: 1500, fire: 2500, pinto: 4000 };
export const yurts = (s) => Math.min(12, 1 + Math.floor((s.up.herd + s.up.income + s.up.leader) / 3));

export function dayKey(d = new Date()) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
export function dailyState(s) {
  const today = dayKey();
  if (s.daily.last === today) return null;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const streak = s.daily.last === dayKey(y) ? s.daily.streak + 1 : 1;
  const day = ((streak - 1) % 7) + 1;
  return { streak, amount: 50 * day + (day === 7 ? 300 : 0), key: today };
}
