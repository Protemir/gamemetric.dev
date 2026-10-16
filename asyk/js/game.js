// Rules of one kon, no drawing here. A throw that knocks a bone out of the circle is given back,
// as in real asyq atu, and the next one goes from where the saka stopped with a bigger multiplier.
// Score of a throw = chips (knocked bones, each next one in the same throw worth more) × mult
// (the side the saka fell on + the chain).
import { body, world, saka, step, moving, KON, FIELD, LINE_Y, MAX_SPEED, rollSide } from './physics.js';
import { rng } from './util.js';

export const THROWS = 5;
export const CLEAR_BONUS = 50;
export const DOMINO = 5; // each next bone in the same throw gives this much more
// knock out this many bones in one throw and the throw is given back
export const RULES = { refundAt: 2 };

// First person: the saka leaves the hand above the line, flies over the first stretch
// and lands, then slides on into the kon. Nothing is hit while it is in the air.
export const AIR = { min: 26, k: 40, keep: 0.62 };
// the player throws from the line in front of the camera, the aga from the line beyond the kon
export const HOME = { x: KON.x, y: LINE_Y };
export const AWAY = { x: KON.x, y: KON.y - (LINE_Y - KON.y) };
export const landing = (power, ux, uy, from = HOME) => {
  const a = AIR.min + AIR.k * power;
  return { x: from.x + ux * a, y: from.y + uy * a };
};
export const groundSpeed = (power) => MAX_SPEED * AIR.keep * power;

export function throwFromHand(g, ux, uy, power, from = HOME) {
  const s = saka(g.w);
  const p = landing(power, ux, uy, from);
  s.x = p.x;
  s.y = p.y;
  const v = groundSpeed(power);
  s.vx = ux * v;
  s.vy = uy * v;
  s.spin = (g.w.rand() - 0.5) * 14;
  return p;
}

export const target = (k) => Math.round((220 * Math.pow(1.4, k - 1)) / 5) * 5;

// bones lie in a row, as children set them; later kons get trickier shapes
const SHAPES = ['row', 'double', 'cross', 'wedge', 'ring'];

export function layout(k, seed) {
  const r = rng(seed);
  const n = Math.min(7 + Math.floor((k - 1) / 2), 13);
  let shape = SHAPES[(k - 1) % SHAPES.length];
  // a single row fits seven bones inside the circle
  if (shape === 'row' && n > 7) shape = 'double';
  const pts = [];
  const gap = 5.9;
  if (shape === 'row') {
    for (let i = 0; i < n; i++) pts.push([KON.x + (i - (n - 1) / 2) * gap, KON.y]);
  } else if (shape === 'double') {
    const a = Math.ceil(n / 2);
    for (let i = 0; i < a; i++) pts.push([KON.x + (i - (a - 1) / 2) * gap, KON.y - 3.4]);
    for (let i = 0; i < n - a; i++) pts.push([KON.x + (i - (n - a - 1) / 2) * gap, KON.y + 3.4]);
  } else if (shape === 'cross') {
    const a = Math.ceil(n / 2);
    for (let i = 0; i < a; i++) pts.push([KON.x + (i - (a - 1) / 2) * gap, KON.y]);
    for (let i = 0; i < n - a; i++) pts.push([KON.x, KON.y + gap * Math.ceil((i + 1) / 2) * (i % 2 ? 1 : -1)]);
  } else if (shape === 'wedge') {
    let row = 0;
    let left = n;
    while (left > 0) {
      const m = Math.min(row + 1, left);
      for (let i = 0; i < m; i++) pts.push([KON.x + (i - (m - 1) / 2) * gap, KON.y - 8 + row * 5.2]);
      left -= m;
      row++;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([KON.x + Math.cos(a) * 13, KON.y + Math.sin(a) * 13]);
    }
  }
  // one dyed bone from the second kon on: it pays three times more
  const dyed = k >= 2 ? Math.floor(r() * pts.length) : -1;
  return pts.map(([x, y], i) =>
    body('asyk', x + (r() - 0.5) * 0.6, y + (r() - 0.5) * 0.6, {
      ang: Math.PI / 2 + (r() - 0.5) * 0.5,
      painted: i === dyed,
      value: i === dyed ? 30 : 10,
    }),
  );
}

// opts: target (story kons set their own), wind, duel { aga, throws }
export function newKon(k, seed = (Math.random() * 1e9) | 0, opts = {}) {
  const w = world(seed);
  w.wind = opts.wind || 0;
  const g = {
    k,
    seed,
    w,
    target: opts.target || target(k),
    duel: opts.duel ? { aga: opts.duel.aga, throws: opts.duel.throws, score: 0, chain: 0 } : null,
    throws: THROWS,
    score: 0,
    chain: 0,
    racks: 0,
    turn: null,
    fromLine: true,
    result: null,
  };
  rack(g);
  w.bodies.push(body('saka', FIELD.w / 2, LINE_Y));
  return g;
}

function rack(g) {
  g.w.bodies = g.w.bodies.filter((b) => b.kind !== 'asyk');
  g.w.bodies.unshift(...layout(g.k, g.seed + g.racks * 7919));
  g.racks++;
}

export const asyksLeft = (g) => g.w.bodies.filter((b) => b.kind === 'asyk' && !b.out).length;

// before a throw from the line the saka can be put anywhere along it
export function placeOnLine(g, x) {
  const s = saka(g.w);
  s.x = Math.max(s.r + 1, Math.min(FIELD.w - s.r - 1, x));
  s.y = LINE_Y;
}

export function startThrow(g, who = 'me') {
  const aga = who === 'aga';
  if (aga) g.duel.throws--;
  else g.throws--;
  g.turn = { owner: who, chips: 0, knocked: 0, mult: 1 + (aga ? g.duel.chain : g.chain), side: null, score: 0, outs: [] };
}

// called for every bone that leaves the circle while the throw runs; returns what it paid
export function knock(g, b) {
  const t = g.turn;
  if (!t) return 0;
  const pay = b.value + DOMINO * t.knocked;
  t.knocked++;
  t.chips += pay;
  t.outs.push(b);
  return pay;
}

// everything lies still: the saka's side is read and the throw is counted
export function settle(g, rand = g.w.rand) {
  const t = g.turn;
  // the aga plays by the same rules with his own throws and chain
  const who = t.owner === 'aga' ? g.duel : g;
  const side = rollSide(rand);
  t.side = side;
  t.mult = side.mult + who.chain;
  t.score = t.knocked ? t.chips * t.mult : 0;
  if (side.throws) who.throws += side.throws;
  t.refund = t.knocked >= RULES.refundAt;
  if (t.refund) who.throws++;
  if (t.knocked) {
    who.chain++;
  } else {
    who.chain = 0;
  }
  return t;
}

// after the score is shown: bones that left the circle are picked up, the kon may be cleared
export function finish(g) {
  const t = g.turn;
  if (t.owner === 'aga') g.duel.score += t.score;
  else g.score += t.score;
  g.w.bodies = g.w.bodies.filter((b) => !b.out);
  let cleared = false;
  if (!asyksLeft(g)) {
    cleared = true;
    g.score += CLEAR_BONUS;
    rack(g);
  }
  const s = saka(g.w);
  // every throw starts from the hand again
  g.fromLine = true;
  placeOnLine(g, FIELD.w / 2);
  // a saka left lying on a bone would start the next throw stuck in it
  for (const b of g.w.bodies) {
    if (b === s) continue;
    const d = Math.hypot(b.x - s.x, b.y - s.y);
    if (d < b.r + s.r) {
      const k = (b.r + s.r + 0.1) / (d || 1);
      s.x = b.x + (s.x - b.x || 0.1) * k;
      s.y = b.y + (s.y - b.y) * k;
    }
  }
  g.turn = null;
  if (g.duel) {
    // a duel ends when both are out of throws; a draw gives each one more
    if (g.throws <= 0 && g.duel.throws <= 0) {
      if (g.score > g.duel.score) g.result = 'win';
      else if (g.score < g.duel.score) g.result = 'lose';
      else {
        g.throws = 1;
        g.duel.throws = 1;
        g.draw = true;
      }
    }
  } else if (g.score >= g.target) g.result = 'win';
  else if (g.throws <= 0) g.result = 'lose';
  return { cleared };
}

// whose throw is next in a duel: the player first, then turns alternate while both have throws
export function nextThrower(g, last) {
  if (!g.duel) return 'me';
  if (last === 'me' && g.duel.throws > 0) return 'aga';
  if (last === 'aga' && g.throws > 0) return 'me';
  return g.throws > 0 ? 'me' : 'aga';
}

// The aga thinks: tries some throws on a copy of the yard and keeps the best,
// then his hand wobbles by skill (0 sloppy .. 1 sharp).
export function agaPlan(g, rand, skill = 0.7) {
  const tries = 4 + Math.round(skill * 8);
  const live = g.w.bodies.filter((b) => b.kind === 'asyk' && !b.out);
  let best = null;
  for (let i = 0; i < tries && live.length; i++) {
    const aim = live[Math.floor(rand() * live.length)];
    const dx = aim.x - AWAY.x + (rand() - 0.5) * 8;
    const dy = aim.y - AWAY.y;
    const l = Math.hypot(dx, dy);
    const ux = dx / l;
    const uy = dy / l;
    const power = 0.45 + rand() * 0.5;
    const copy = { ...g, w: { ...g.w, bodies: g.w.bodies.map((b) => ({ ...b })), events: [], rand: rng((rand() * 1e9) | 0) }, turn: null, duel: { ...g.duel } };
    startThrow(copy, 'aga');
    throwFromHand(copy, ux, uy, power, AWAY);
    let t = 0;
    let chips = 0;
    do {
      step(copy.w, 1 / 30);
      for (const e of copy.w.events) if (e.type === 'out') chips += e.body.value;
      copy.w.events.length = 0;
      t += 1 / 30;
    } while (moving(copy.w) && t < 10);
    if (!best || chips > best.chips) best = { chips, ux, uy, power };
  }
  if (!best) return { ux: 0, uy: 1, power: 0.7 };
  const wob = (1 - skill) * 0.12;
  const a = Math.atan2(best.uy, best.ux) + (rand() - 0.5) * wob;
  return { ux: Math.cos(a), uy: Math.sin(a), power: Math.min(1, best.power * (1 + (rand() - 0.5) * wob)) };
}
