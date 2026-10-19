// «Арык» — the whole game without drawing, so tools/check.mjs can play it in Node.
// Water is a graph, not a fluid: every river or canal cell has a bed height, and water only moves
// along an edge to a cell whose bed is lower. A canal bed drops a little with every dug cell,
// so a canal always flows, but the ketmen can only cut so deep into a rise (MAX_CUT):
// to reach a garden up on the valley side you have to take the water higher up the river.
import { makeValley, VALLEYS, GEN } from './terrain.js';
import { rng, clamp } from './util.js';

export const DAY_SEC = 3.2; // real seconds per day at ×1: a year is about six minutes
export const YEAR_DAYS = 120;
export const WINTER = 110; // from this day gardens sleep and nothing new appears (a short winter)
export const EPS = 0.04; // canal bed drop per cell
export const MAX_CUT = 1.6; // deepest cut into a rise
export const CANAL_CAP = 2; // water per day one canal cell carries
const SEEP = 0.1; // what a dead-end canal nobody drinks from spills over its end
export const SOAK = 0.006; // what one cell of earth canal soaks up per day (not in frozen winter)
export const GARDEN_NEED = 0.3;
export const HOUSE_NEED = 0.12;
const DRY = 1 / 16; // thirst per day with no water at all
const WET = 1 / 6; // recovery per day when fully watered
const ENOUGH = 0.6; // share of the need that keeps thirst still
const FLOOD = 0.35; // flood per day per unit of spilled water next to a house
const DIG_START = 30;
const DIG_PER_GARDEN = 8;
const DIG_PER_YEAR = 10;
export const DIG_REGEN = 1; // days for one more cell of digging
export const DIG_CAP = 40; // the regrowth stops here (gifts can go above)

export const LAND = 0, RIVER = 1, CANAL = 2, ICE = 3;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

export const SEASONS = [
  { from: 0, key: 'spring' },
  { from: 30, key: 'summer' },
  { from: 75, key: 'autumn' },
  { from: WINTER, key: 'winter' },
];
export const seasonOf = (day) => SEASONS.reduce((s, x) => (day >= x.from ? x : s), SEASONS[0]);

// how much the glacier gives: snowmelt peaks in late spring, the river is thin by autumn,
// and every year the glacier is a little smaller
const MELT = [[0, 4], [30, 8], [75, 5.4], [105, 4.2], [120, 4]];
export function sourceFlow(day, year, melt = 1) {
  let q = MELT[MELT.length - 1][1];
  for (let k = 1; k < MELT.length; k++) {
    const [d0, q0] = MELT[k - 1], [d1, q1] = MELT[k];
    if (day <= d1) {
      q = q0 + ((q1 - q0) * (day - d0)) / (d1 - d0);
      break;
    }
  }
  return q * melt * Math.max(0.5, 1 - 0.13 * (year - 1));
}

export function newGame(W, H, seed = 1, valley = 'mountain', gen = GEN) {
  const v = makeValley(W, H, seed, valley, gen);
  const n = W * H;
  const g = {
    W, H, seed, valley, gen,
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
    cap: CANAL_CAP, // grows with the "wider canals" reward
    melt: gen === 1 ? 1 : (VALLEYS[valley] || VALLEYS.mountain).melt, // grows with the "glacier" reward
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
  // only a side neighbour inside the valley
  if (!(b >= 0 && b < g.W * g.H) || Math.abs((b % g.W) - (a % g.W)) + Math.abs(((b / g.W) | 0) - ((a / g.W) | 0)) !== 1) return { ok: false, why: 'far' };
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
  if (!s || !(s.cells.length || s.join)) return;
  // a canal that ends right next to the river or another canal lower down flows into it by itself,
  // instead of spilling over its end next to the water
  if (!s.join && s.cells.length) {
    const last = s.cells[s.cells.length - 1];
    const lx = last % g.W, ly = (last / g.W) | 0;
    let best = -1;
    for (const [dx, dy] of N4) {
      const x = lx + dx, y = ly + dy;
      if (!inside(g, x, y)) continue;
      const n = y * g.W + x;
      if (!isWater(g, n) || n === g.from[last] || s.cells.includes(n) || !(g.bed[n] < g.bed[last])) continue;
      if (best < 0 || (g.kind[n] === RIVER && g.kind[best] !== RIVER)) best = n;
    }
    if (best >= 0) {
      g.out[last].push(best);
      s.join = [last, best];
      g.order = null;
    }
  }
  g.strokes.push(s);
}

// takes back the last canal; later canals may hang off earlier ones, so only the last one goes
export function undo(g) {
  if (g.cur) {
    // undo in the middle of a stroke takes back that stroke, never an older one
    const started = g.cur.cells.length || g.cur.join;
    endStroke(g);
    if (!started) return false;
  }
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
    for (const [dx, dy] of N8) {
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
  // last tick's water, to see which cell next to a thirsty orchard has some to spare
  const before = g.flowBefore && g.flowBefore.length === flow.length ? g.flowBefore : (g.flowBefore = new Float32Array(flow.length));
  before.set(flow);
  flow.fill(0);
  spill.fill(0);
  const sleeping = g.day >= WINTER;
  for (const o of g.objects) {
    o.gotBefore = o.got;
    o.got = 0;
  }
  // Two numbers per canal cell, from the bottom up:
  //   need  — what is drunk below it (orchards, yurts, and a trickle over a dead end nobody drinks at);
  //   carry — what it could pass on if water is plentiful (a canal back into the river carries a full one).
  // Water is then shared in two rounds: first everyone's need, then what is left goes on through
  // canals that lead back to the river. So such a canal is never dry, yet never starves a neighbour.
  const need = g.want || (g.want = new Float32Array(g.W * g.H));
  const carry = g.carry || (g.carry = new Float32Array(g.W * g.H));
  // every orchard or yurt orders its water from one cell only: the open water cell next to it that
  // is highest (it gets water first). Ordering from every cell it touches drew the water twice,
  // and the second half spilled as a puddle between two canals.
  // cells water can get to at all: from the glacier along open canals
  const linked = new Uint8Array(g.W * g.H);
  const stack = [g.source];
  linked[g.source] = 1;
  while (stack.length) {
    const a = stack.pop();
    for (const t of g.out[a]) if (!g.gate[t] && !linked[t]) { linked[t] = 1; stack.push(t); }
  }
  const tap = new Map();
  for (const o of g.objects) {
    let best = -1;
    for (const [dx, dy] of N8) {
      const x = o.x + dx, y = o.y + dy;
      if (!inside(g, x, y)) continue;
      const i = y * g.W + x;
      if (!linked[i]) continue;
      // a cell right beside it wins over a corner one, then the higher one: the canal that was dug
      // to it is the one it drinks from, so the water runs to the end of that canal
      const side = dx === 0 || dy === 0;
      const bestSide = best >= 0 && ((best % g.W) === o.x || ((best / g.W) | 0) === o.y);
      if (best < 0 || (side && !bestSide) || (side === bestSide && g.bed[i] > g.bed[best])) best = i;
    }
    // it keeps the cell it drinks from while that cell gives enough; when it does not, it moves to
    // the neighbour that had the most water last tick (in a mesh of canals one cell can run short)
    const kept = o.tap != null && linked[o.tap] && Math.max(Math.abs((o.tap % g.W) - o.x), Math.abs(((o.tap / g.W) | 0) - o.y)) === 1;
    // in winter nobody drinks, so nobody is short: the tap stays put (it hopped every tick between two
    // canals, the spill at their ends hopped with it and the water blinked: 18.10 "it blinks after the season")
    if (kept && (sleeping || o.gotBefore >= o.need * 0.99)) best = o.tap;
    else if (!sleeping && o.gotBefore != null && o.gotBefore < o.need * 0.99) {
      let most = kept ? before[o.tap] : -1;
      for (const [dx, dy] of N8) {
        const x = o.x + dx, y = o.y + dy;
        if (!inside(g, x, y)) continue;
        const i = y * g.W + x;
        if (linked[i] && before[i] > most + 1e-6) { most = before[i]; best = i; }
      }
      if (kept && most === before[o.tap]) best = o.tap;
    }
    o.tap = best >= 0 ? best : null;
    if (best >= 0) tap.set(o, best);
  }
  // a cell that water reaches from two canals splits its order between them; ordered in full from
  // both, the water came twice and the second share spilled where the canals meet
  // ... by how much water each of them brought last tick: in a loop of canals one side can be nearly
  // empty, and an equal split left the cell short by that side's half
  const weight = (a) => Math.min(before[a], g.cap) + 0.02;
  const parents = new Float32Array(g.W * g.H);
  for (let a = 0; a < g.W * g.H; a++) if (linked[a]) for (const t of g.out[a]) if (!g.gate[t]) parents[t] += weight(a);
  const part = (a, t) => (parents[t] > 0 ? weight(a) / parents[t] : 1);
  for (let k = g.order.length - 1; k >= 0; k--) {
    const i = g.order[k];
    // the river knows what everything below it will drink, so it keeps that much for itself
    // before a canal that leaves it and comes back lower down takes any
    if (g.kind[i] === RIVER) {
      let w = 0;
      if (!sleeping) for (const o of g.near[i]) if (tap.get(o) === i) w += o.need;
      for (const t of g.out[i]) if (!g.gate[t]) w += (g.kind[t] === RIVER ? need[t] : Math.min(g.cap, need[t])) * part(i, t);
      need[i] = w;
      carry[i] = Infinity;
      continue;
    }
    let w = 0, c = 0;
    if (!sleeping) for (const o of g.near[i]) if (tap.get(o) === i) w += o.need;
    if (!sleeping) w += SOAK; // the canal itself drinks a little: a valley dug all over dries the river
    c = w;
    let open = 0;
    for (const t of g.out[i]) {
      if (g.gate[t]) continue;
      open += 1;
      if (g.kind[t] === RIVER) {
        c += g.cap;
        w += need[t] * part(i, t); // water that the river below this joint will be asked for
      } else {
        w += Math.min(g.cap, need[t]) * part(i, t);
        c += Math.min(g.cap, carry[t]) * part(i, t);
      }
    }
    if (!open && !g.near[i].some((o) => tap.get(o) === i)) {
      w += SEEP; // where someone drinks at the end, nothing spills
      c += SEEP;
    }
    need[i] = Math.min(w, g.cap);
    carry[i] = Math.min(Math.max(c, w), g.cap);
  }
  flow[g.source] = sourceFlow(g.day, g.year, g.melt);
  g.gone = 0;
  g.soak = 0;
  // fill targets up to their room, sharing equally, until q runs out or everyone is full
  const share = (q, targets, room) => {
    let open = targets.filter((t) => room(t) > 1e-6);
    while (q > 1e-6 && open.length) {
      const part = q / open.length;
      const next = [];
      for (const t of open) {
        const give = Math.min(part, room(t));
        flow[t] += give;
        q -= give;
        if (room(t) > 1e-6) next.push(t);
      }
      if (next.length === open.length) break;
      open = next;
    }
    return q;
  };
  for (const i of g.order) {
    let q = flow[i];
    if (q <= 1e-6) continue;
    if (!sleeping && g.kind[i] === CANAL) {
      const s = Math.min(q, SOAK);
      g.soak += s;
      q -= s;
    }
    if (!sleeping) {
      for (const o of g.near[i]) {
        if (tap.get(o) !== i) continue; // each drinks from its own cell only
        const take = Math.min(q, o.need - o.got);
        if (take > 0) {
          o.got += take;
          q -= take;
        }
      }
    }
    const targets = g.out[i].filter((t) => !g.gate[t]);
    // a cell fed from several canals takes from each only that canal's share of its order
    const base = new Map(targets.map((t) => [t, flow[t]]));
    const mine = (t) => flow[t] - base.get(t);
    // round 1: what is drunk below
    q = share(q, targets, (t) => Math.min(need[t] - flow[t], need[t] * part(i, t) - mine(t)));
    // round 2: the rest. From the river a through canal gets at most a quarter, the river keeps the rest
    if (q > 1e-6) {
      const top = g.kind[i] === RIVER ? q * 0.25 : Infinity;
      const base2 = new Map(targets.map((t) => [t, flow[t]]));
      q = share(q, targets, (t) => (g.kind[t] === RIVER ? Infinity : Math.min(carry[t] - flow[t], carry[t] * part(i, t) - mine(t), top - (flow[t] - base2.get(t)))));
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
  g.digTimer = (g.digTimer || 0) + dt;
  if (g.digTimer >= DIG_REGEN) {
    g.digTimer -= DIG_REGEN;
    if (g.dig < DIG_CAP) g.dig += 1;
  }
  if (g.day < WINTER && g.day + dt >= WINTER) g.events.push({ type: 'winter' });
  g.day += dt;
  if (g.day < WINTER) {
    if (g.day >= g.nextGarden) {
      // a valley full of orchards (18.10: "nothing appears, only the seasons go by"): new ones
      // squeeze in closer, and when there is no room at all an old orchard grows and drinks more
      if (!spawn(g, 'garden') && !spawn(g, 'garden', 1)) grow(g);
      // the first few come quickly so there is something to do right away, then the usual pace
      g.nextGarden = g.day + (g.year === 1 && g.gardensEver < 4 ? 2.5 : Math.max(5, 11 - g.year));
    }
    if (g.day >= g.nextHouse) {
      if (!spawn(g, 'house')) spawn(g, 'house', 1);
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
    g.giftDue = g.year; // until a gift is picked (it is saved: a game closed on the gift panel gets it back)
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

// the shortest canal that works: from one of `sources` (water cells) to a dry cell where `goal`
// says yes. A cell keeps every way in that is not beaten by one both shorter and higher,
// because a higher bed can still climb what a lower one cannot.
export function route(g, sources, goal, maxSteps = 80) {
  const n = g.W * g.H;
  const labels = Array.from({ length: n }, () => []);
  const queue = [];
  // a start without a bed (ice) would make every path look new and the search would never end
  for (const s of sources) if (Number.isFinite(g.bed[s])) queue.push({ c: s, bed: g.bed[s], steps: 0, prev: null });
  for (let qi = 0; qi < queue.length; qi++) {
    const node = queue[qi];
    if (node.steps > 0 && goal(node.c)) {
      const cells = [];
      let p = node;
      while (p.prev) {
        cells.unshift(p.c);
        p = p.prev;
      }
      return { from: p.c, cells };
    }
    if (node.steps >= maxSteps) continue;
    const ax = node.c % g.W, ay = (node.c / g.W) | 0;
    for (const [dx, dy] of N4) {
      const x = ax + dx, y = ay + dy;
      if (!inside(g, x, y)) continue;
      const b = y * g.W + x;
      if (g.kind[b] !== LAND || g.objAt[b]) continue;
      const bed = Math.min(g.h[b], node.bed - EPS);
      if (g.h[b] - bed > MAX_CUT) continue;
      const steps = node.steps + 1;
      if (labels[b].some((l) => l.steps <= steps && l.bed >= bed - 1e-6)) continue;
      labels[b] = labels[b].filter((l) => !(l.steps >= steps && l.bed <= bed));
      labels[b].push({ steps, bed });
      queue.push({ c: b, bed, steps, prev: node });
    }
  }
  return null;
}

const nextTo = (g, o) => (c) => Math.max(Math.abs((c % g.W) - o.x), Math.abs(((c / g.W) | 0) - o.y)) === 1;

// the canal cells (from a water cell to a cell next to the object) a good digger would use;
// with `r` (spawning checks hundreds of spots) a quick estimate from reach() instead
// `spare`: the object is short of water although it touches a canal, so look for a way from water
// that has some to give: the river, or a canal that is not full
export function planFor(g, o, r = null, spare = false) {
  if (!r) {
    if (!spare) {
      for (const [dx, dy] of N8) {
        const x = o.x + dx, y = o.y + dy;
        if (inside(g, x, y) && isWater(g, y * g.W + x)) return { from: y * g.W + x, cells: [] };
      }
    }
    const sources = [];
    for (let i = 0; i < g.W * g.H; i++) {
      if (!isWater(g, i)) continue;
      if (spare && g.kind[i] === CANAL && g.flow[i] >= g.cap * 0.9) continue;
      sources.push(i);
    }
    return route(g, sources, nextTo(g, o)) || (spare ? planFor(g, o) : null);
  }
  let pick = -1;
  for (const [dx, dy] of N8) {
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

export const GROW_MAX = 3; // an orchard can grow three times, each time drinking half as much again
function grow(g) {
  const ok = g.objects.filter((o) => o.type === 'garden' && (o.grown || 0) < GROW_MAX && o.s >= 0.9);
  if (!ok.length) return null;
  const o = ok[Math.floor(g.rand() * ok.length)];
  o.grown = (o.grown || 0) + 1;
  o.need += GARDEN_NEED * 0.5;
  g.dig += DIG_PER_GARDEN;
  g.events.push({ type: 'grow', obj: o });
  return o;
}

// gap: how many free cells stay between objects (2, or 1 when the valley is full)
function spawn(g, type, gap = 2) {
  const r = reach(g);
  const { W, H } = g;
  const far = 3 + g.year * 2 + g.gardensEver * 0.3;
  const spots = [];
  const near = [];
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
          if (g.objAt[j] && Math.max(Math.abs(dx), Math.abs(dy)) <= gap) ok = false;
          if (isWater(g, j) && Math.max(Math.abs(dx), Math.abs(dy)) <= 1) ok = false;
        }
      if (!ok) continue;
      const o = { x, y };
      const plan = planFor(g, o, r);
      if (!plan || !plan.cells.length) continue;
      const L = plan.cells.length;
      if (type === 'house' && (y < H * 0.35)) continue;
      const lo = g.gardensEver === 0 ? 3 : 2;
      const hi = g.gardensEver === 0 ? 5 : far;
      if (L > hi) continue;
      if (L < lo) { near.push({ x, y, L }); continue; }
      spots.push({ x, y, L });
    }
  }
  // a valley already dug all over still gets new orchards: one cell away from a canal
  if (!spots.length && g.gardensEver > 0) spots.push(...near);
  if (!spots.length) return null;
  let p = spots[Math.floor(g.rand() * spots.length)];
  // the first orchard teaches digging: its real way (not the quick estimate) is a few cells long
  if (g.gardensEver === 0 && type === 'garden') {
    const order = spots.map((q) => [g.rand(), q]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const good = order.slice(0, 40).find((q) => {
      const w = planFor(g, q);
      return w && w.cells.length >= 3;
    });
    if (good) p = good;
  }
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

// ---------- saving ----------

// what is needed to rebuild a game later: the valley comes back from its seed, canals are dug again
export function save(g) {
  const gates = [];
  for (let i = 0; i < g.W * g.H; i++) if (g.gate[i]) gates.push(i);
  return {
    v: 1, W: g.W, H: g.H, seed: g.seed, valley: g.valley, gen: g.gen,
    strokes: g.strokes.map((s) => ({ from: s.from, cells: s.cells, join: s.join })),
    gates,
    objects: g.objects.map(({ type, x, y, need, thirst, flood, born, tap, got, grown }) => ({ type, x, y, need, thirst, flood, born, tap, got, grown })),
    flow: Array.from(g.flow, (v) => Math.round(v * 1000) / 1000),
    day: g.day, year: g.year, dig: g.dig, harvest: g.harvest, lost: g.lost, gardensEver: g.gardensEver,
    nextGarden: g.nextGarden, nextHouse: g.nextHouse, cap: g.cap, melt: g.melt, giftDue: g.giftDue || 0,
  };
}

// a save worth offering: written by this game for this size of valley (a cut-off write in a portal's
// cloud or an older format is not; 19.10 one opened as a 5×5 valley, another drew an orchard off the map)
export function usable(d, W, H) {
  return !!d && typeof d === 'object' && d.W === W && d.H === H && Number.isFinite(d.seed) && Array.isArray(d.strokes) && Array.isArray(d.objects) && Array.isArray(d.gates) && Number.isFinite(d.day) && Number.isFinite(d.year);
}

export function load(d) {
  const g = newGame(d.W, d.H, d.seed, VALLEYS[d.valley] ? d.valley : 'mountain', d.gen || 1);
  g.dig = 1e9;
  for (const s of d.strokes) {
    startStroke(g, s.from);
    for (const c of s.cells) extend(g, c);
    if (s.join) extend(g, s.join[1]);
    endStroke(g);
  }
  for (const i of d.gates) if (g.kind[i] === CANAL) g.gate[i] = 1;
  for (const o of d.objects) {
    // only what stands on dry land inside the valley, on a cell of its own
    if (!inside(g, o.x, o.y) || g.kind[o.y * g.W + o.x] !== LAND || g.objAt[o.y * g.W + o.x] || !(o.need > 0)) continue;
    const obj = { ...o, got: o.got || 0, s: 1 };
    g.objects.push(obj);
    g.objAt[o.y * g.W + o.x] = obj;
  }
  rebuildNear(g);
  for (const k of ['day', 'year', 'dig', 'harvest', 'lost', 'gardensEver', 'nextGarden', 'nextHouse', 'cap', 'melt']) g[k] = d[k];
  g.giftDue = d.giftDue === g.year ? g.year : 0;
  g.rand = rng((d.seed ^ (d.year * 7919) ^ (d.gardensEver * 104729)) >>> 0);
  g.order = null;
  g.events = [];
  if (d.flow && d.flow.length === g.W * g.H) g.flow.set(d.flow);
  flowStep(g);
  for (const o of g.objects) o.s = o.need > 0 ? clamp(o.got / o.need, 0, 1) : 1;
  return g;
}

// the reward picked at the end of a year
export const REWARDS = ['dig', 'cap', 'melt'];
export function reward(g, kind) {
  g.giftDue = 0;
  if (kind === 'dig') g.dig += 15;
  if (kind === 'cap') g.cap += 0.6;
  if (kind === 'melt') g.melt *= 1.12;
  g.order = null;
}

// how much water there is against how much is wanted right now (1 = just enough)
export function waterShare(g) {
  if (g.day >= WINTER) return null;
  let need = g.objects.reduce((s, o) => s + o.need, 0);
  for (let i = 0; i < g.W * g.H; i++) if (g.kind[i] === CANAL) need += SOAK;
  return need > 0 ? sourceFlow(g.day, g.year, g.melt) / need : null;
}

export const gardens = (g) => g.objects.filter((o) => o.type === 'garden').length;
