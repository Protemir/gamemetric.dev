// Сохранение «Табуна» в localStorage. Если хранилища нет — играем без сохранения.
const KEY = 'tabun.save.v1';
const DEF = { lvl: 1, coins: 0, up: { herd: 0, income: 0, leader: 0 }, sets: ['steppe'], set: 'steppe', sound: true, daily: { last: '', streak: 0 }, best: 0, played: 0, stars: {} };

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') return { ...DEF, ...s, up: { ...DEF.up, ...(s.up || {}) }, daily: { ...DEF.daily, ...(s.daily || {}) }, stars: s.stars && typeof s.stars === 'object' ? s.stars : {}, sets: Array.isArray(s.sets) && s.sets.length ? s.sets : ['steppe'] };
  } catch { /* испорчено или нет доступа */ }
  return structuredClone(DEF);
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
  return { streak, amount: 50 * day + (day === 7 ? 300 : 0) };
}
