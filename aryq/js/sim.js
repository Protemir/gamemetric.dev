// «Арык» — the whole game without drawing, so tools/check.mjs can play it in Node.
// Water is a graph, not a fluid: every river or canal cell has a bed height, and water only moves
// along an edge to a cell whose bed is lower. A canal bed drops a little with every dug cell,
// so a canal always flows, but the ketmen can only cut so deep into a rise (MAX_CUT):
// to reach a garden up on the valley side you have to take the water higher up the river.
import { makeValley } from './terrain.js';
import { rng, clamp } from './util.js';

export const DAY_SEC = 3.2; // real seconds per day at ×1: a year is about six minutes
export const YEAR_DAYS = 120;
export const WINTER = 105; // from this day gardens sleep and nothing new appears
export const EPS = 0.04; // canal bed drop per cell
export const MAX_CUT = 1.6; // deepest cut into a rise
export const CANAL_CAP = 2; // water per day one canal cell carries
const SEEP = 0.1; // what a dead-end canal nobody drinks from spills over its end
export const GARDEN_NEED = 0.3;
export const HOUSE_NEED = 0.12;
const DRY = 1 / 16; // thirst per day with no water at all
const WET = 1 / 6; // recovery per day when fully watered
const ENOUGH = 0.6; // share of the need that keeps thirst still
const FLOOD = 0.35; // flood per day per unit of spilled water next to a house
const DIG_START = 30;
const DIG_PER_GARDEN = 5;
const DIG_PER_YEAR = 10;

export const LAND = 0, RIVER = 1, CANAL = 2, ICE = 3;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const SEASONS = [
  { from: 0, key: 'spring' },
  { from: 30, key: 'summer' },
  { from: 75, key: 'autumn' },
  { from: WINTER, key: 'winter' },
];
export const seasonOf = (day) => SEASONS.reduce((s, x) => (day >= x.from ? x : s), SEASONS[0]);

// how much the glacier gives: snowmelt peaks in late spring, the river is thin by autumn,
// and every year the glacier is a little smaller
const MELT = [[0, 4], [30, 8], [75, 4.6], [105, 3.4], [120, 4]];
export function sourceFlow(day, year) {
  let q = MELT[MELT.length - 1][1];
  for (let k = 1; k < MELT.length; k++) {
    const [d0, q0] = MELT[k - 1], [d1, q1] = MELT[k];
    if (day <= d1) {
      q = q0 + ((q1 - q0) * (day - d0)) / (d1 - d0);
      break;
    }
  }
  return q * Math.max(0.65, 1 - 0.06 * (year - 1));
}

export function newGame(W, H, seed = 1) {
  const v = makeValley(W, H, seed);
  const n = W * H;
  const g = {
    W, H, seed,
    rand: rng(seed ^ 0x5bd1e995),
    h: v.h,
    bed: new Float32Array(n).fill(NaN),
    kind: new Uint8Array(n),
    out: Array.from({ length: n }, () => []),
    from: new Int32Array(n).fill(-1), // the cell a canal cell was dug from
    gate: new Uint8Array(n), // 1 = closed, nothing flows into this cell
    flow: new Float32Array(n),
    spill: new Float32Array(n),
    objAt: new Array(n).fill(null),
    near: [],
    objects: [],
    strokes: [],
    cur: null,
    source: v.river[0],
    exit: v.river[v.river.length - 1],
    river: v.river,
    dig: DIG_START,
    day: 0,
    year: 1,
    harvest: 0,
    lost: 0,
    gardensEver: 0,
    over: null,
    nextGarden: 0,
    nextHouse: 3,
    order: null,
    events: [],
  };
  for (let y = 0; y < 2; y++) for (let x = 0; x < W; x++) g.kind[y * W + x] = ICE;
  // carve the river so its bed always falls
  let prev = -1;
  for (const c of v.river) {
    g.kind[c] = RIVER;
    g.bed[c] = prev < 0 ? g.h[c] : Math.min(g.h[c], g.bed[prev] - EPS);
    g.h[c] = g.bed[c];
    if (prev >= 0) g.out[prev].push(c);
    prev = c;
  }
  rebuildNear(g);
  return g;
}

export const isWater = (g, i) => g.kind[i] === RIVER || g.kind[i] === CANAL;
const inside = (g, x, y) => x >= 0 && y >= 0 && x < g.W && y < g.H;

// ---------- digging ----------

// can water go from water cell a into neighbouring cell b?
export function probe(g, a, b) {
  const k = g.kind[b];
  if (k === ICE) return { ok: false, why: 'ice' };
  if (g.objAt[b]) return { ok: false, why: 'object' };
  if (k === RIVER || k === CANAL) {
    if (g.bed[b] < g.bed[a] && !g.out[a].includes(b)) return { ok: true, join: true };
    return { ok: false, why: 'up' };
  }
  const bed = Math.min(g.h[b], g.bed[a] - EPS);
  const cut = g.h[b] - bed;
  if (cut > MAX_CUT) return { ok: false, why: 'high', cut };
  if (g.dig < 1) return { ok: false, why: 'tired' };
  return { ok: true, bed, cut };
}

export function startStroke(g, i) {
  if (!isWater(g, i) || g.over) return false;
  g.cur = { from: i, cells: [], join: null };
  return true;
}

const lastOf = (g) => (g.cur.cells.length ? g.cur.cells[g.cur.cells.length - 1] : g.cur.from);

// one step of the stroke into a 4-neighbour of its last cell; returns the probe result
export function extend(g, b) {
  const s = g.cur;
  if (!s || s.join) return { ok: false, why: 'done' };
  const a = lastOf(g);
  const back = s.cells.length >= 2 ? s.cells[s.cells.length - 2] : s.cells.length === 1 ? s.from : -1;
  if (b === back) {
    removeCell(g, s.cells.pop());
    return { ok: true, back: true };
  }
  const r = probe(g, a, b);
  if (!r.ok) return r;
  if (r.join) {
    g.out[a].push(b);
    s.join = [a, b];
  } else {
    g.kind[b] = CANAL;
    g.bed[b] = r.bed;
    g.from[b] = a;
    g.out[a].push(b);
    g.dig -= 1;
    s.cells.push(b);
  }
  g.order = null;
  return r;
}

function removeCell(g, c) {
  const a = g.from[c];
  g.out[a] = g.out[a].filter((x) => x !== c);
  g.kind[c] = LAND;
  g.bed[c] = NaN;
  g.from[c] = -1;
  g.gate[c] = 0;
  g.out[c] = [];
  g.dig += 1;
  g.order = null;
}

export function endStroke(g) {
  const s = g.cur;
  g.cur = null;
  if (s && (s.cells.length || s.join)) g.strokes.push(s);
}

// takes back the last canal; later canals may hang off earlier ones, so only the last one goes
export function undo(g) {
  if (g.cur) endStroke(g);
  const s = g.strokes.pop();
  if (!s) return false;
  if (s.join) {
    const [a, b] = s.join;
    g.out[a] = g.out[a].filter((x) => x !== b);
  }
  for (let k = s.cells.length - 1; k >= 0; k--) removeCell(g, s.cells[k]);
  g.order = null;
  return true;
}

export function toggleGate(g, i) {
  if (g.kind[i] !== CANAL) return false;
  g.gate[i] ^= 1;
  return true;
}

// ---------- water ----------

function rebuildNear(g) {
  g.near = Array.from({ length: g.W * g.H }, () => []);
  for (const o of g.objects) {
    for (const [dx, dy] of N4) {
      const x = o.x + dx, y = o.y + dy;
      if (inside(g, x, y)) g.near[y * g.W + x].push(o);
    }
  }
}

export function flowStep(g) {
  if (!g.order) {
    g.order = [];
    for (let i = 0; i < g.W * g.H; i++) if (isWater(g, i)) g.order.push(i);
    g.order.sort((a, b) => g.bed[b] - g.bed[a]);
  }
  const { flow, spill } = g;
  flow.fill(0);
  spill.fill(0);
  const sleeping = g.day >= WINTER;
  for (const o of g.objects) o.got = 0;
  // a canal only draws what is drunk below it: a dead end fills up and then takes just a trickle
  // that spills over its end (SEEP). The river takes everything.
  const want = g.want || (g.want = new Float32Array(g.W * g.H));
  for (let k = g.order.length - 1; k >= 0; k--) {
    const i = g.order[k];
    if (g.kind[i] === RIVER) {
      want[i] = Infinity;
      continue;
    }
    let w = 0;
    if (!sleeping) for (const o of g.near[i]) w += o.need;
    let open = 0;
    for (const t of g.out[i]) {
      if (g.gate[t]) continue;
      open += 1;
      w += Math.min(g.kind[t] === RIVER ? Infinity : CANAL_CAP, want[t]);
    }
    if (!open && !g.near[i].length) w += SEEP; // where someone drinks at the end, nothing spills
    want[i] = Math.min(w, CANAL_CAP);
  }
  flow[g.source] = sourceFlow(g.day, g.year);
  g.gone = 0;
  for (const i of g.order) {
    let q = flow[i];
    if (q <= 1e-6) continue;
    if (!sleeping) {
      for (const o of g.near[i]) {
        const take = Math.min(q, o.need - o.got);
        if (take > 0) {
          o.got += take;
          q -= take;
        }
      }
    }
    let open = g.out[i].filter((t) => !g.gate[t]);
    const room = (t) => (g.kind[t] === RIVER ? Infinity : want[t] - flow[t]);
    open = open.filter((t) => room(t) > 1e-6);
    while (q > 1e-6 && open.length) {
      const share = q / open.length;
      const next = [];
      for (const t of open) {
        const give = Math.min(share, room(t));
        flow[t] += give;
        q -= give;
        if (room(t) > 1e-6) next.push(t);
      }
      if (next.length === open.length) break; // nobody was full, all of q is given out
      open = next;
    }
    // what the last river cell does not give to canals leaves the valley
    if (i === g.exit) g.gone = q;
    else if (q > 1e-6) spill[i] = q;
  }
}

// ---------- time ----------

export function advance(g, days) {
  if (g.over) return;
  // big steps (debug ×20) are cut into small ones so a garden cannot die between two looks
  while (days > 1e-9 && !g.over) {
    const dt = Math.min(days, 0.1);
    days -= dt;
    tick(g, dt);
  }
}

function tick(g, dt) {
  flowStep(g);
  const sleeping = g.day >= WINTER;
  for (const o of g.objects) {
    const s = o.need > 0 ? clamp(o.got / o.need, 0, 1) : 1;
    o.s = s;
    if (!sleeping) {
      const d = s < ENOUGH ? (DRY * (ENOUGH - s)) / ENOUGH : (-WET * (s - ENOUGH)) / (1 - ENOUGH);
      o.thirst = clamp(o.thirst + d * dt * (o.type === 'house' ? 0.6 : 1), 0, 1);
      if (o.type === 'garden' && s >= ENOUGH) g.harvest += dt;
    }
    if (o.type === 'house') {
      let wet = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = o.x + dx, y = o.y + dy;
          if (inside(g, x, y)) wet += g.spill[y * g.W + x];
        }
      o.flood = clamp(o.flood + (wet > 0.05 ? wet * FLOOD : -0.15) * dt, 0, 1);
    }
  }
  for (const o of [...g.objects]) {
    if (o.type === 'garden' && o.thirst >= 1) {
      g.over = { why: 'garden', x: o.x, y: o.y };
      return;
    }
    if (o.type === 'house' && (o.thirst >= 1 || o.flood >= 1)) {
      removeObject(g, o);
      g.lost += 1;
      g.events.push({ type: o.flood >= 1 ? 'flooded' : 'left', x: o.x, y: o.y });
    }
  }
  g.day += dt;
  if (g.day < WINTER) {
    if (g.day >= g.nextGarden) {
      spawn(g, 'garden');
      // the first few come quickly so there is something to do right away, then the usual pace
      g.nextGarden = g.day + (g.year === 1 && g.gardensEver < 4 ? 2.5 : Math.max(5, 11 - g.year));
    }
    if (g.day >= g.nextHouse) {
      spawn(g, 'house');
      g.nextHouse = g.day + 22;
    }
  }
  if (g.day >= YEAR_DAYS) {
    g.day -= YEAR_DAYS;
    g.year += 1;
    g.dig += DIG_PER_YEAR;
    g.nextGarden = 0;
    g.nextHouse = 6;
    g.events.push({ type: 'year', year: g.year });
  }
}

function removeObject(g, o) {
  g.objects = g.objects.filter((x) => x !== o);
  g.objAt[o.y * g.W + o.x] = null;
  rebuildNear(g);
}

// ---------- where water can reach ----------

// highest bed a new canal could have in every dry cell, and the way there;
// from one water cell only when `from` is given (what a stroke started there can still reach)
export function reach(g, from = -1) {
  const n = g.W * g.H;
  const best = new Float32Array(n).fill(-Infinity);
  const prev = new Int32Array(n).fill(-1);
  const len = new Int32Array(n);
  const queue = [];
  if (from >= 0) { best[from] = g.bed[from]; queue.push(from); }
  else for (let i = 0; i < n; i++) if (isWater(g, i)) { best[i] = g.bed[i]; queue.push(i); }
  while (queue.length) {
    const a = queue.shift();
    const ax = a % g.W, ay = (a / g.W) | 0;
    for (const [dx, dy] of N4) {
      const x = ax + dx, y = ay + dy;
      if (!inside(g, x, y)) continue;
      const b = y * g.W + x;
      if (g.kind[b] !== LAND || g.objAt[b]) continue;
      const bed = Math.min(g.h[b], best[a] - EPS);
      if (g.h[b] - bed > MAX_CUT || bed <= best[b] + 1e-6) continue;
      best[b] = bed;
      prev[b] = a;
      len[b] = isWater(g, a) ? 1 : len[a] + 1;
      queue.push(b);
    }
  }
  return { best, prev, len };
}

// the canal cells (from a water cell to a cell next to the object) a good digger would use
export function planFor(g, o, r = reach(g)) {
  let pick = -1;
  for (const [dx, dy] of N4) {
    const x = o.x + dx, y = o.y + dy;
    if (!inside(g, x, y)) continue;
    const i = y * g.W + x;
    if (isWater(g, i)) return { from: i, cells: [] };
    if (r.best[i] > -Infinity && (pick < 0 || r.len[i] < r.len[pick])) pick = i;
  }
  if (pick < 0) return null;
  const cells = [];
  let c = pick;
  while (!isWater(g, c)) {
    cells.unshift(c);
    c = r.prev[c];
  }
  return { from: c, cells };
}

function spawn(g, type) {
  const r = reach(g);
  const { W, H } = g;
  const far = 3 + g.year * 2 + g.gardensEver * 0.3;
  const spots = [];
  for (let y = 3; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (g.kind[i] !== LAND) continue;
      // keep room around every object and do not touch water: it has to be brought
      let ok = true;
      for (let dy = -2; dy <= 2 && ok; dy++)
        for (let dx = -2; dx <= 2 && ok; dx++) {
          const xx = x + dx, yy = y + dy;
          if (!inside(g, xx, yy)) continue;
          const j = yy * W + xx;
          if (g.objAt[j] && Math.max(Math.abs(dx), Math.abs(dy)) <= 2) ok = false;
          if (isWater(g, j) && Math.abs(dx) + Math.abs(dy) <= 1) ok = false;
        }
      if (!ok) continue;
      const o = { x, y };
      const plan = planFor(g, o, r);
      if (!plan || !plan.cells.length) continue;
      const L = plan.cells.length;
      if (type === 'house' && (y < H * 0.35)) continue;
      const lo = g.gardensEver === 0 ? 3 : 2;
      const hi = g.gardensEver === 0 ? 5 : far;
      if (L < lo || L > hi) continue;
      spots.push({ x, y, L });
    }
  }
  if (!spots.length) return null;
  const p = spots[Math.floor(g.rand() * spots.length)];
  const o = {
    type, x: p.x, y: p.y,
    need: type === 'garden' ? GARDEN_NEED : HOUSE_NEED,
    thirst: 0, flood: 0, got: 0, s: 0, born: g.day + (g.year - 1) * YEAR_DAYS,
  };
  g.objects.push(o);
  g.objAt[p.y * W + p.x] = o;
  if (type === 'garden') {
    g.gardensEver += 1;
    if (g.gardensEver > 1) g.dig += DIG_PER_GARDEN;
  }
  rebuildNear(g);
  g.events.push({ type: 'spawn', obj: o });
  return o;
}

export const gardens = (g) => g.objects.filter((o) => o.type === 'garden').length;
