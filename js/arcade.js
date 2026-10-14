import { PLAYABLE } from './fighters.js';
import { ARENAS } from './arena.js';

// The arcade ladder: six opponents in a random order, then the giant Dau.

const RAMP = {
  easy: ['easy', 'easy', 'easy', 'easy', 'normal', 'normal', 'normal'],
  normal: ['easy', 'easy', 'normal', 'normal', 'normal', 'hard', 'hard'],
  hard: ['normal', 'normal', 'hard', 'hard', 'hard', 'hard', 'hard'],
};

export function makeLadder(player, diff) {
  const others = PLAYABLE.filter((f) => f.id !== player).map((f) => f.id);
  for (let k = others.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [others[k], others[j]] = [others[j], others[k]];
  }
  const ids = [...others.slice(0, 6), 'dau'];
  const arenas = ARENAS.map((a) => a.id);
  for (let k = arenas.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [arenas[k], arenas[j]] = [arenas[j], arenas[k]];
  }
  const ramp = RAMP[diff] || RAMP.normal;
  return ids.map((id, k) => ({
    id,
    arena: id === 'dau' ? 'charyn' : arenas[k % arenas.length],
    // the boss plays at your chosen level, the ladder before him ramps up
    diff: id === 'dau' ? diff : ramp[k],
    boss: id === 'dau',
  }));
}

const MULT = { easy: 1, normal: 1.5, hard: 2 };

// points for a won fight
export function scoreFor(m, idx, diff) {
  const me = m.f[idx];
  const log = m.result.log;
  const parts = {
    win: Math.round(1000 * (MULT[diff] || 1)),
    flawless: log.flawless[idx] * 1500,
    finisher: log.finishers[idx] * 2000,
    combo: me.stats.maxCombo * 150,
    time: log.timeLeft[idx] * 20,
  };
  parts.total = Object.values(parts).reduce((a, b) => a + b, 0);
  return parts;
}

// stars for things done, and what they open
export const UNLOCKS = [
  { id: 'bighead', stars: 3, name: { ru: 'Режим «Бас-бас»: большие головы', en: '"Bas-bas" mode: big heads' } },
  { id: 'gold', stars: 8, name: { ru: 'Золотые костюмы', en: 'Golden costumes' } },
  { id: 'turbo', stars: 12, name: { ru: 'Турбо: игра быстрее на четверть', en: 'Turbo: a quarter faster' } },
  { id: 'dau', stars: null, name: { ru: 'Дәу как боец', en: 'Dau as a fighter' }, how: { ru: 'пройди аркаду', en: 'clear the arcade' } },
];
