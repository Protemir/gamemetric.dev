// What stays between campaigns: the khan's glory, the chronicle (endings, unmasked plotters, deeds),
// the steppe of the day with its streak, and the steppes that glory opens.
import { store } from './util.js';
import { MODS } from './sim.js';

// today in the player's own calendar
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const hash = (s) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
// the same steppe for everyone on one day, with one condition
export const daily = (d = dayKey()) => ({ day: d, seed: hash('sybys' + d) % 1e9, mod: MODS[hash('mod' + d) % MODS.length] });

export const STYLES = [
  { key: 'summer', glory: 0 },
  { key: 'autumn', glory: 25 },
  { key: 'winter', glory: 60 },
];
export const DEEDS = ['first', 'uniter', 'friend', 'sleuth', 'liecatcher', 'noSabres', 'iron', 'streak3', 'allEnds', 'allPlotters'];

export function load() {
  return {
    glory: store.get('sybys.glory', 0),
    ends: store.get('sybys.ends', []),
    plotters: store.get('sybys.plotters', []),
    deeds: store.get('sybys.deeds', []),
    streak: store.get('sybys.streak', 0),
    lastDaily: store.get('sybys.lastDaily', null),
    style: store.get('sybys.style', 'summer'),
  };
}

export const unlocked = (m, key) => m.glory >= (STYLES.find((s) => s.key === key)?.glory ?? 0);
export const dailyDone = (m) => m.lastDaily === dayKey();
// the streak counts only while it is unbroken: yesterday or today
export function liveStreak(m) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return m.lastDaily === dayKey() || m.lastDaily === dayKey(y) ? m.streak : 0;
}

export function setStyle(key) {
  store.set('sybys.style', key);
}

// a finished campaign: glory, the chronicle and new deeds
export function record(g) {
  const m = load();
  const r = g.result;
  const before = m.glory;
  const endBonus = { uniter: 15, mediator: 10, ironHorde: 6, vanish: 4, noPeople: 3, truthBreaks: 3 }[r.end] || 3;
  const parts = [
    ['score', Math.round(r.score / 10)],
    ['end', endBonus],
    ['caught', Math.min(10, g.caught)],
    ['nailed', r.nailed ? 8 : 0],
    ['daily', g.daily && !dailyDone(m) ? 5 : 0],
  ].filter(([, v]) => v > 0);
  const gained = parts.reduce((s, [, v]) => s + v, 0);
  m.glory += gained;
  if (!m.ends.includes(r.end)) m.ends.push(r.end);
  if (r.nailed && !m.plotters.includes(r.culprit)) m.plotters.push(r.culprit);
  if (g.daily && !dailyDone(m)) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    m.streak = m.lastDaily === dayKey(y) ? m.streak + 1 : 1;
    m.lastDaily = dayKey();
  }
  const earned = {
    first: true,
    uniter: r.end === 'uniter',
    friend: r.yes >= 3,
    sleuth: r.nailed,
    liecatcher: g.caught >= 10,
    noSabres: g.forceRides === 0 && r.yes >= 2,
    iron: r.end === 'ironHorde',
    streak3: m.streak >= 3,
    allEnds: m.ends.length >= 6,
    allPlotters: m.plotters.length >= 4,
  };
  const newDeeds = DEEDS.filter((d) => earned[d] && !m.deeds.includes(d));
  m.deeds.push(...newDeeds);
  const opened = STYLES.filter((s) => s.glory > before && s.glory <= m.glory).map((s) => s.key);
  store.set('sybys.glory', m.glory);
  store.set('sybys.ends', m.ends);
  store.set('sybys.plotters', m.plotters);
  store.set('sybys.deeds', m.deeds);
  store.set('sybys.streak', m.streak);
  store.set('sybys.lastDaily', m.lastDaily);
  const best = store.get('sybys.best', null);
  if (best == null || r.score > best) store.set('sybys.best', r.score);
  return { gained, parts, total: m.glory, newDeeds, opened, meta: m };
}
