// The player's rank: experience earned in matches is kept in the browser between visits.
// After a match: what the player did (accuracy, headshots, damage, best streak), up to three medals,
// the experience it brought and the rank it leads to.
import { t } from './i18n.js';

const KEY = 'breach.xp';
// experience for each next rank grows a little: 600, 800, 1000 ...
export const need = (level) => 400 + 200 * level;
const RANKS = 11; // rank0 .. rank10 in i18n; beyond that "Legend 2, 3 ..."

export function loadXp() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}
function saveXp(v) {
  try {
    localStorage.setItem(KEY, String(Math.floor(v)));
  } catch {
    /* private window: the rank lives for this visit only */
  }
}

// total experience -> { level, into (xp into this level), span (xp this level needs) }
export function levelOf(xp) {
  let level = 0, left = Math.max(0, xp);
  while (left >= need(level + 1) && level < 999) {
    left -= need(level + 1);
    level++;
  }
  return { level, into: left, span: need(level + 1) };
}

export function rankName(level) {
  if (level < RANKS) return t('rank' + level);
  return `${t('rank' + (RANKS - 1))} ${level - RANKS + 2}`;
}

// medals for one match; the funniest and rarest first, three at most
export function medalsOf(st, p, won) {
  const m = [];
  const acc = st.shots >= 10 ? st.hits / st.shots : 0;
  if (p.kills >= 3 && p.deaths === 0) m.push('immortal');
  if (st.best >= 4) m.push('grinder');
  else if (st.best >= 3) m.push('triple');
  if (st.hs >= 3) m.push('sniper');
  if (st.knife >= 1) m.push('ninja');
  if (st.nade >= 1) m.push('boomer');
  if (st.chickens >= 3) m.push('chickens');
  if (acc >= 0.5) m.push('eagle');
  if (p.kills >= 12) m.push('unstoppable');
  if (st.swim >= 1) m.push('swimmer');
  if (p.kills === 0 && p.deaths >= 3) m.push('pacifist');
  else if (p.deaths >= 8 && p.kills < p.deaths / 2) m.push('fodder');
  if (won && !m.length) m.push('teamplayer');
  return m.slice(0, 3);
}

// experience for a match: kills and headshots, damage, a win, a full match
export function xpOf(st, p, won, finished) {
  const parts = [
    ['xpKills', p.kills * 100],
    ['xpHeads', st.hs * 50],
    ['xpDamage', Math.round(st.dmg / 4)],
    ['xpWin', won ? 300 : 0],
    ['xpPlayed', finished ? 100 : 0],
  ].filter(([, v]) => v > 0);
  return { parts, total: parts.reduce((a, [, v]) => a + v, 0) };
}

// add a match to the saved experience; returns before/after for the bar
export function award(total) {
  const before = loadXp();
  const after = before + Math.max(0, Math.round(total));
  saveXp(after);
  return { before, after };
}
