// The steppe: a grid of cells split into pastures (a warped Voronoi), a river across it,
// hills in the north. The khan's Orda sits in the middle, three tribes share the rest like a pie.
// Pastures that touch are linked by a road; a rider needs longer across the river and in the hills.
import { rng, valueNoise, clamp } from './util.js';

export const GW = 192, GH = 108;
export const REGIONS = 23;
export const RIDER_SPEED = 15; // cells per second

export function makeMap(seed) {
  const rand = rng(seed);
  const n = GW * GH;

  // pasture centres: the Orda in the middle, the rest spread out (best of a few random tries)
  const pts = [[GW / 2 + (rand() - 0.5) * 10, GH / 2 + (rand() - 0.5) * 6]];
  while (pts.length < REGIONS) {
    let best = null, bd = -1;
    for (let k = 0; k < 14; k++) {
      const p = [7 + rand() * (GW - 14), 6 + rand() * (GH - 12)];
      let d = Infinity;
      for (const q of pts) d = Math.min(d, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2);
      if (d > bd) { bd = d; best = p; }
    }
    pts.push(best);
  }

  // borders wobble like real ones: the distance is measured from a warped point
  const wx = valueNoise(rand, GW, GH, 14), wy = valueNoise(rand, GW, GH, 14);
  const fine = valueNoise(rand, GW, GH, 5);
  const cell = new Int16Array(n);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x;
      const px = x + wx[i] * 7 + fine[i] * 1.6, py = y + wy[i] * 7 + fine[i] * 1.6;
      let best = 0, bd = Infinity;
      for (let r = 0; r < pts.length; r++) {
        const d = (px - pts[r][0]) ** 2 + (py - pts[r][1]) ** 2;
        if (d < bd) { bd = d; best = r; }
      }
      cell[i] = best;
    }
  }

  // ground height: hills in the north, gentle swells elsewhere
  const big = valueNoise(rand, GW, GH, 22), small = valueNoise(rand, GW, GH, 7);
  const elev = new Float32Array(n);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x;
      elev[i] = clamp(0.35 + big[i] * 0.3 + small[i] * 0.08 + Math.max(0, 0.32 - y / GH) * 1.6, 0, 1);
    }
  }

  // the river: from the west edge to the east, south of the Orda
  const river = new Uint8Array(n);
  const ph = rand() * 6.28, ph2 = rand() * 6.28, base = GH * (0.66 + rand() * 0.08);
  const riverLine = [];
  for (let x = -2; x <= GW + 2; x += 2) riverLine.push([x, base + Math.sin(x * 0.045 + ph) * 9 + Math.sin(x * 0.12 + ph2) * 3]);
  const riverY = (x) => base + Math.sin(x * 0.045 + ph) * 9 + Math.sin(x * 0.12 + ph2) * 3;
  for (let x = 0; x < GW; x++) {
    const ry = riverY(x);
    for (let y = Math.floor(ry - 2); y <= Math.ceil(ry + 2); y++) {
      if (y >= 0 && y < GH && Math.abs(y - ry) < 1.3) river[y * GW + x] = 1;
    }
  }

  // regions: area, a centre that lies inside, neighbours
  const regions = pts.map((p, id) => ({ id, sx: p[0], sy: p[1], area: 0, x: 0, y: 0, tribe: -1, nb: [], elev: 0 }));
  for (let i = 0; i < n; i++) {
    const r = regions[cell[i]];
    r.area++;
    r.x += i % GW;
    r.y += (i / GW) | 0;
    r.elev += elev[i];
  }
  for (const r of regions) {
    r.x /= r.area; r.y /= r.area; r.elev /= r.area;
    // the aul stands on the cell of the pasture nearest to its middle, away from the water
    let best = -1, bd = Infinity;
    for (let i = 0; i < n; i++) {
      if (cell[i] !== r.id || river[i]) continue;
      const d = ((i % GW) - r.x) ** 2 + (((i / GW) | 0) - r.y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) { r.x = (best % GW) + 0.5; r.y = ((best / GW) | 0) + 0.5; }
  }

  const touch = new Map();
  const border = new Uint8Array(n);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x, a = cell[i];
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        if (x + dx >= GW || y + dy >= GH) continue;
        const b = cell[i + dy * GW + dx];
        if (a === b) continue;
        border[i] = 1;
        border[i + dy * GW + dx] = 1;
        const key = a < b ? a * 100 + b : b * 100 + a;
        touch.set(key, (touch.get(key) || 0) + 1);
      }
    }
  }

  const crosses = (a, b) => {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(a.x + ((b.x - a.x) * s) / steps), y = Math.round(a.y + ((b.y - a.y) * s) / steps);
      if (x >= 0 && y >= 0 && x < GW && y < GH && river[y * GW + x]) return true;
    }
    return false;
  };
  for (const [key, count] of touch) {
    if (count < 3) continue;
    const a = regions[Math.floor(key / 100)], b = regions[key % 100];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ford = crosses(a, b);
    const slow = (ford ? 1.6 : 1) * (1 + Math.max(0, (a.elev + b.elev) / 2 - 0.45) * 1.2);
    const time = (len / RIDER_SPEED) * slow;
    a.nb.push({ to: b.id, time, len, ford });
    b.nb.push({ to: a.id, time, len, ford });
  }
  // word spreads more along short, easy roads
  for (const r of regions) {
    const sum = r.nb.reduce((s, e) => s + 1 / e.time, 0);
    for (const e of r.nb) e.w = 1 / e.time / sum;
  }

  // three tribes share the steppe around the Orda like slices of a pie
  const orda = regions[0];
  const turn = rand() * Math.PI * 2;
  for (const r of regions) {
    if (r.id === 0) continue;
    const a = (Math.atan2((r.y - orda.y) * 1.6, r.x - orda.x) - turn + Math.PI * 4) % (Math.PI * 2);
    r.tribe = Math.min(2, Math.floor(a / ((Math.PI * 2) / 3)));
  }
  // each tribe's great aul is its pasture farthest from the Orda
  const capitals = [0, 1, 2].map((t) => regions.filter((r) => r.tribe === t).sort((p, q) => Math.hypot(q.x - orda.x, q.y - orda.y) - Math.hypot(p.x - orda.x, p.y - orda.y))[0]?.id ?? -1);

  // the border between tribes is drawn bolder
  for (let i = 0; i < n; i++) {
    if (!border[i]) continue;
    const x = i % GW, y = (i / GW) | 0, t = regions[cell[i]].tribe;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
      if (regions[cell[yy * GW + xx]].tribe !== t) border[i] = 2;
    }
  }

  return { GW, GH, cell, elev, river, riverLine, border, regions, capitals, orda: 0 };
}

// shortest road from a to b: [a, ..., b] with the time of each step
export function route(map, a, b) {
  const R = map.regions.length;
  const dist = new Array(R).fill(Infinity), prev = new Array(R).fill(-1), done = new Array(R).fill(false);
  dist[a] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < R; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity || u === b) break;
    done[u] = true;
    for (const e of map.regions[u].nb) {
      if (dist[u] + e.time < dist[e.to]) { dist[e.to] = dist[u] + e.time; prev[e.to] = u; }
    }
  }
  if (dist[b] === Infinity) return null;
  const path = [b];
  while (path[0] !== a) path.unshift(prev[path[0]]);
  return { path, time: dist[b] };
}
