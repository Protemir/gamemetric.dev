// Bones on dirt: discs with constant ground friction, springy bone-on-bone hits and a low
// adobe wall around the yard. World units: the yard is 100 wide and 150 long.
// Pure module (no DOM), so tools/test.mjs can run whole throws in node.
import { rng } from './util.js';

// w/h: the old top-down yard; min/max: where bones can roll in the first-person yard
export const FIELD = { w: 100, h: 150, minX: -40, maxX: 140, minY: -80, maxY: 150 };
export const KON = { x: 50, y: 54, r: 24 };
export const LINE_Y = 132;
export const MAX_SPEED = 165;

const BONE_E = 0.88; // bounce between bones
const WALL_E = 0.45; // bounce off the adobe wall
const STOP = 1.2; // slower than this and a bone lies still

let nextId = 1;

export function body(kind, x, y, extra = {}) {
  const saka = kind === 'saka';
  return {
    id: nextId++,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    r: saka ? 3.3 : 2.7,
    m: saka ? 1.7 : 1,
    mu: saka ? 52 : 66, // ground friction, units/s²
    fixed: false, // kids' feet: things bounce off them, they never move
    ang: extra.ang ?? -Math.PI / 2,
    spin: 0,
    out: false,
    value: 10,
    painted: false,
    ...extra,
  };
}

export function world(seed = 1) {
  // wind: a push along x on everything that moves (the school yard), units/s²
  // friction: 1 on dirt, less on ice (the winter yard)
  return { bodies: [], rand: rng(seed), events: [], time: 0, wind: 0, friction: 1 };
}

export const saka = (w) => w.bodies.find((b) => b.kind === 'saka');
export const moving = (w) => w.bodies.some((b) => b.vx !== 0 || b.vy !== 0);
export const insideKon = (b) => Math.hypot(b.x - KON.x, b.y - KON.y) < KON.r + b.r * 0.5;

// a kid's feet: bones bounce off them
export const kidFeet = (x, y) => body('kid', x, y, { r: 4.5, m: 1e6, fixed: true });

export function launch(w, dx, dy, power) {
  const s = saka(w);
  const len = Math.hypot(dx, dy) || 1;
  const v = MAX_SPEED * Math.max(0, Math.min(1, power));
  s.vx = (dx / len) * v;
  s.vy = (dy / len) * v;
  s.spin = (w.rand() - 0.5) * 14;
}

// how far a bone slides from speed v
export const slide = (v, mu) => (v * v) / (2 * mu);

export function step(w, dt) {
  let fastest = 0;
  for (const b of w.bodies) fastest = Math.max(fastest, Math.abs(b.vx) + Math.abs(b.vy));
  const n = Math.max(1, Math.min(24, Math.ceil((fastest * dt) / 0.4)));
  const h = dt / n;
  for (let i = 0; i < n; i++) sub(w, h);
  w.time += dt;
}

function sub(w, h) {
  const B = w.bodies;
  for (const b of B) {
    if (b.fixed) continue;
    if (b.vx === 0 && b.vy === 0) {
      b.spin *= 0.9;
      continue;
    }
    b.vx += w.wind * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    const s = Math.hypot(b.vx, b.vy);
    const ns = s - b.mu * w.friction * h;
    if (ns <= STOP && s < STOP * 4) {
      b.vx = b.vy = 0;
    } else {
      const k = Math.max(0, ns) / s;
      b.vx *= k;
      b.vy *= k;
    }
    // a sliding bone turns a little and tumbles; spin fades with the ground
    b.ang += b.spin * h;
    b.spin *= Math.pow(0.25, h);
    walls(w, b);
  }
  for (let i = 0; i < B.length; i++) {
    for (let j = i + 1; j < B.length; j++) collide(w, B[i], B[j]);
  }
  for (const b of B) {
    if (b.kind !== 'asyk' || b.out) continue;
    if (!insideKon(b)) {
      b.out = true;
      w.events.push({ type: 'out', body: b });
    }
  }
}

function walls(w, b) {
  let hit = 0;
  const { minX, maxX, minY, maxY } = FIELD;
  if (b.x < minX + b.r) (b.x = minX + b.r), (hit = Math.abs(b.vx)), (b.vx = -b.vx * WALL_E);
  if (b.x > maxX - b.r) (b.x = maxX - b.r), (hit = Math.abs(b.vx)), (b.vx = -b.vx * WALL_E);
  if (b.y < minY + b.r) (b.y = minY + b.r), (hit = Math.abs(b.vy)), (b.vy = -b.vy * WALL_E);
  if (b.y > maxY - b.r) (b.y = maxY - b.r), (hit = Math.abs(b.vy)), (b.vy = -b.vy * WALL_E);
  if (hit > 6) w.events.push({ type: 'wall', body: b, speed: hit });
}

function collide(w, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rr = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr) return;
  const d = Math.sqrt(d2) || 0.0001;
  const nx = dx / d;
  const ny = dy / d;
  // push apart by mass
  const pen = rr - d;
  if (a.fixed && b.fixed) return;
  const ia = a.fixed ? 0 : 1 / a.m;
  const ib = b.fixed ? 0 : 1 / b.m;
  const sum = ia + ib;
  a.x -= nx * pen * (ia / sum);
  a.y -= ny * pen * (ia / sum);
  b.x += nx * pen * (ib / sum);
  b.y += ny * pen * (ib / sum);
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return;
  // bones are not round: a hit glances off a few degrees either way
  const tw = (w.rand() - 0.5) * 0.09;
  const cx = nx * Math.cos(tw) - ny * Math.sin(tw);
  const cy = nx * Math.sin(tw) + ny * Math.cos(tw);
  const j = (-(1 + BONE_E) * vn) / sum;
  a.vx -= cx * j * ia;
  a.vy -= cy * j * ia;
  b.vx += cx * j * ib;
  b.vy += cy * j * ib;
  // the side that was rubbed makes the bone spin
  const tang = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
  a.spin += tang * 0.25 + (w.rand() - 0.5) * 6;
  b.spin -= tang * 0.25 + (w.rand() - 0.5) * 6;
  w.events.push({ type: 'hit', a, b, x: a.x + nx * a.r, y: a.y + ny * a.r, power: j });
}

// Aim guide: where the saka meets the first bone (or stops), and where that bone is sent.
export function predict(w, dx, dy, power, from = null, speed = MAX_SPEED) {
  const s0 = saka(w);
  const s = from ? { ...s0, x: from.x, y: from.y } : s0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const v = speed * Math.max(0, Math.min(1, power));
  let reach = slide(v, s.mu);
  let hit = null;
  for (const b of w.bodies) {
    if (b === s0) continue;
    // ray against a circle of both radii
    const ox = s.x - b.x;
    const oy = s.y - b.y;
    const rr = s.r + b.r;
    const bb = ox * ux + oy * uy;
    const c = ox * ox + oy * oy - rr * rr;
    const disc = bb * bb - c;
    if (disc < 0) continue;
    const t = -bb - Math.sqrt(disc);
    if (t > 0 && t < reach) {
      reach = t;
      hit = b;
    }
  }
  // the wall stops the guide too
  const tx = ux > 0 ? (FIELD.maxX - s.r - s.x) / ux : ux < 0 ? (FIELD.minX + s.r - s.x) / ux : Infinity;
  const ty = uy > 0 ? (FIELD.maxY - s.r - s.y) / uy : uy < 0 ? (FIELD.minY + s.r - s.y) / uy : Infinity;
  const tw = Math.min(tx, ty);
  if (tw < reach) {
    reach = tw;
    hit = null;
  }
  const ex = s.x + ux * reach;
  const ey = s.y + uy * reach;
  const out = { x: ex, y: ey, hit, wall: tw === reach };
  if (hit) {
    const nx = hit.x - ex;
    const ny = hit.y - ey;
    const nl = Math.hypot(nx, ny) || 1;
    out.nx = nx / nl;
    out.ny = ny / nl;
  }
  return out;
}

// The saka lies on one of four sides when it stops. Real bones fall on the wide sides more often.
export const SIDES = [
  { id: 'alshy', name: 'Алшы', mult: 3, w: 18 },
  { id: 'taike', name: 'Тәйке', mult: 2, w: 17 },
  { id: 'buk', name: 'Бүк', mult: 1, w: 35 },
  { id: 'shik', name: 'Шік', mult: 1, w: 30, throws: 1 },
];

// weights: a lucky saka may change how often each side comes up, e.g. { alshy: 34 }
export function rollSide(rand, weights = null) {
  const w = (s) => (weights && weights[s.id] != null ? weights[s.id] : s.w);
  const total = SIDES.reduce((s, x) => s + w(x), 0);
  let t = rand() * total;
  for (const s of SIDES) {
    if ((t -= w(s)) < 0) return s;
  }
  return SIDES[2];
}
