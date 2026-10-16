// Rules of one kon, no drawing here. A throw that knocks a bone out of the circle is given back,
// as in real asyq atu, and the next one goes from where the saka stopped with a bigger multiplier.
// Score of a throw = chips (knocked bones, each next one in the same throw worth more) × mult
// (the side the saka fell on + the chain).
import { body, world, saka, KON, FIELD, LINE_Y, MAX_SPEED, rollSide } from './physics.js';
import { rng } from './util.js';

export const THROWS = 5;
export const CLEAR_BONUS = 50;
export const DOMINO = 5; // each next bone in the same throw gives this much more
// knock out this many bones in one throw and the throw is given back
export const RULES = { refundAt: 2 };

// First person: the saka leaves the hand above the line, flies over the first stretch
// and lands, then slides on into the kon. Nothing is hit while it is in the air.
export const AIR = { min: 26, k: 40, keep: 0.62 };
export const landing = (power, ux, uy) => {
  const a = AIR.min + AIR.k * power;
  return { x: KON.x + ux * a, y: LINE_Y + uy * a };
};
export const groundSpeed = (power) => MAX_SPEED * AIR.keep * power;

export function throwFromHand(g, ux, uy, power) {
  const s = saka(g.w);
  const p = landing(power, ux, uy);
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

export function newKon(k, seed = (Math.random() * 1e9) | 0) {
  const w = world(seed);
  const g = {
    k,
    seed,
    w,
    target: target(k),
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

export function startThrow(g) {
  g.throws--;
  g.turn = { chips: 0, knocked: 0, mult: 1 + g.chain, side: null, score: 0, outs: [] };
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
  const side = rollSide(rand);
  t.side = side;
  t.mult = side.mult + g.chain;
  t.score = t.knocked ? t.chips * t.mult : 0;
  if (side.throws) g.throws += side.throws;
  t.refund = t.knocked >= RULES.refundAt;
  if (t.refund) g.throws++;
  if (t.knocked) {
    g.chain++;
  } else {
    g.chain = 0;
  }
  return t;
}

// after the score is shown: bones that left the circle are picked up, the kon may be cleared
export function finish(g) {
  const t = g.turn;
  g.score += t.score;
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
  if (g.score >= g.target) g.result = 'win';
  else if (g.throws <= 0) g.result = 'lose';
  return { cleared };
}
