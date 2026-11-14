// Tic-tac-toe rules and the three bots. No DOM here: tools/test.mjs runs this file in Node.

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const CORNERS = [0, 2, 6, 8];

export const other = (m) => (m === 'x' ? 'o' : 'x');
export const free = (b) => [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !b[i]);

// null while the round goes on, else { winner: 'x' | 'o' | 'draw', line }
export function result(b) {
  for (const line of LINES) {
    const m = b[line[0]];
    if (m && m === b[line[1]] && m === b[line[2]]) return { winner: m, line };
  }
  return b.every(Boolean) ? { winner: 'draw', line: null } : null;
}

// the cells where `m` completes a line right now
export function finishers(b, m) {
  return free(b).filter((i) => LINES.some((l) => l.includes(i) && l.every((j) => j === i || b[j] === m)));
}

const memo = new Map();

// How good the position is for the side to move: above zero it wins, zero is a draw, below zero
// it loses. A win with more empty cells left scores higher, so a won game is not dragged out.
function value(b, turn) {
  const key = b.map((m) => m || '.').join('') + turn;
  let v = memo.get(key);
  if (v !== undefined) return v;
  const r = result(b);
  if (r) v = r.winner === 'draw' ? 0 : -(1 + free(b).length);
  else {
    v = -Infinity;
    for (const i of free(b)) {
      b[i] = turn;
      v = Math.max(v, -value(b, other(turn)));
      b[i] = null;
    }
  }
  memo.set(key, v);
  return v;
}

// Every move a perfect player could make for `me`, with the number of traps it sets:
// the replies after which `me` wins whatever happens next.
export function perfect(b, me) {
  const rated = free(b).map((i) => {
    b[i] = me;
    const v = -value(b, other(me));
    let traps = 0;
    if (!result(b)) {
      for (const j of free(b)) {
        b[j] = other(me);
        if (value(b, me) > 0) traps++;
        b[j] = null;
      }
    }
    b[i] = null;
    return { i, v, traps };
  });
  const top = Math.max(...rated.map((r) => r.v));
  return rated.filter((r) => r.v === top);
}

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

function weighted(list, rnd) {
  let r = rnd() * list.reduce((sum, o) => sum + o.w, 0);
  for (const o of list) {
    r -= o.w;
    if (r < 0) return o.i;
  }
  return list[list.length - 1].i;
}

// The bot's move for `me` on board `b`, -1 when the board is full.
//   easy: plays almost at random and usually overlooks a line, its own or yours.
//         Someone tapping at random wins about as often as loses.
//   mid:  always finishes its own line, blocks yours four times out of five, likes the center
//         and the corners, walks into forks. Against a player who only watches the lines it wins
//         a little less often than it loses.
//   hard: never loses; among equally good moves it prefers the ones that set more traps.
// The numbers were picked by playing each bot against a random, a casual and a perfect player.
export function botMove(b, me, level, rnd = Math.random) {
  const cells = free(b);
  if (!cells.length) return -1;
  if (level === 'hard') return weighted(perfect(b, me).map((r) => ({ i: r.i, w: 1 + 2 * r.traps })), rnd);

  const win = finishers(b, me);
  const save = finishers(b, other(me));
  if (level === 'mid') {
    if (win.length) return pick(win, rnd);
    if (save.length && rnd() < 0.8) return pick(save, rnd);
    return weighted(cells.map((i) => ({ i, w: i === 4 ? 3 : CORNERS.includes(i) ? 2 : 1 })), rnd);
  }
  if (win.length && rnd() < 0.25) return pick(win, rnd);
  if (save.length && rnd() < 0.1) return pick(save, rnd);
  // when it overlooks its own line it really plays somewhere else
  const rest = cells.filter((i) => !win.includes(i));
  return pick(rest.length ? rest : cells, rnd);
}
