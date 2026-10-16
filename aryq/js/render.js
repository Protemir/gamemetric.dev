// A mountain valley seen from above, drawn like a shaded relief map: sun from the north-west,
// meadow by the river, dry steppe up the slopes, bare rock where it is steep, a glacier on top,
// and thin contour lines one "layer" apart (a canal can climb at most one of them).
// Channels are dug into the ground, water flows with moving glints, orchards and yurts cast shadows.
// On a landscape screen the valley is turned on its side (glacier on the left), the rules do not change.
import * as S from './sim.js';
import { clamp, lerp, rng, valueNoise } from './util.js';

const TOP = 58;
const BOTTOM = 46;
export const LAYER = S.MAX_CUT; // height between two contour lines
const R = 8; // height samples per cell for smooth light

const C = {
  table: '#1f2420',
  soil: '#6b4a2e',
  soilRim: 'rgba(196,168,120,0.85)',
  bank: '#c9b48a',
  deep: '#1f6fa8',
  water: '#2f8ac4',
  shine: 'rgba(210,240,255,0.9)',
  shadow: 'rgba(20,24,16,0.35)',
  ui: '#fff8ea',
  thirst: '#e2493b',
  flood: '#2f8ac4',
  plank: '#8a5530',
  plankLight: '#b97a46',
};
const rgb = ([r, g, b]) => `rgb(${r | 0},${g | 0},${b | 0})`;
const mix = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

const MEADOW = [96, 132, 58];
const MEADOW_DARK = [72, 108, 44];
const STEPPE = [186, 164, 98];
const STEPPE_HIGH = [168, 150, 104];
const ROCK = [128, 118, 106];
const SNOW = [236, 242, 247];

export class View {
  constructor(canvas) {
    this.cv = canvas;
    this.cx = canvas.getContext('2d');
    this.terrain = null;
    this.bits = [];
  }

  // little effects: earth thrown out of a canal, rings on the water when an orchard drinks
  burst(i, kind) {
    const [x, y] = this.center(i);
    const now = performance.now();
    if (kind === 'splash') {
      for (let k = 0; k < 3; k++) this.bits.push({ kind, x, y, at: now + k * 140, life: 900 });
      return;
    }
    for (let k = 0; k < 7; k++) {
      const an = Math.random() * Math.PI * 2, sp = (0.4 + Math.random()) * this.cs * 1.6;
      this.bits.push({ kind, x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, at: now, life: 420 + Math.random() * 200, r: 1 + Math.random() * 2 });
    }
  }

  drawBits(now) {
    const cx = this.cx;
    this.bits = this.bits.filter((b) => now - b.at < b.life);
    for (const b of this.bits) {
      const f = (now - b.at) / b.life;
      if (f < 0) continue;
      if (b.kind === 'splash') {
        cx.strokeStyle = `rgba(190,232,255,${0.8 * (1 - f)})`;
        cx.lineWidth = 2;
        cx.beginPath();
        cx.arc(b.x, b.y, this.cs * (0.4 + 1.1 * f), 0, Math.PI * 2);
        cx.stroke();
      } else {
        const e = 1 - (1 - f) * (1 - f);
        cx.fillStyle = `rgba(92,62,36,${1 - f})`;
        cx.beginPath();
        cx.arc(b.x + b.vx * e * 0.3, b.y + b.vy * e * 0.3 - Math.sin(f * Math.PI) * this.cs * 0.3, b.r, 0, Math.PI * 2);
        cx.fill();
      }
    }
  }

  layout(g) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';
    this.dpr = dpr;
    this.rot = w > h * 1.05;
    const cols = this.rot ? g.H : g.W;
    const rows = this.rot ? g.W : g.H;
    const cs = Math.floor(Math.min((w - 20) / cols, (h - TOP - BOTTOM) / rows));
    this.cs = Math.max(8, cs);
    this.bw = cols * this.cs;
    this.bh = rows * this.cs;
    this.ox = Math.round((w - this.bw) / 2);
    this.oy = Math.round(TOP + (h - TOP - BOTTOM - this.bh) / 2);
    this.g = g;
    this.terrain = this.paintTerrain(g);
    const r = rng(g.seed ^ 77);
    this.snow = Array.from({ length: 160 }, () => [r() * this.bw, r() * this.bh, 0.6 + r() * 1.4]);
  }

  // cell (x, y) of the valley -> top-left corner on screen
  pos(x, y) {
    const sx = this.rot ? y : x;
    const sy = this.rot ? this.g.W - 1 - x : y;
    return [this.ox + sx * this.cs, this.oy + sy * this.cs];
  }
  center(i) {
    const g = this.g;
    const [px, py] = this.pos(i % g.W, (i / g.W) | 0);
    return [px + this.cs / 2, py + this.cs / 2];
  }
  // screen point -> cell index or -1
  cellAt(px, py) {
    const g = this.g;
    const sx = Math.floor((px - this.ox) / this.cs);
    const sy = Math.floor((py - this.oy) / this.cs);
    const x = this.rot ? g.W - 1 - sy : sx;
    const y = this.rot ? sx : sy;
    if (x < 0 || y < 0 || x >= g.W || y >= g.H) return -1;
    return y * g.W + x;
  }

  // the relief, drawn once per layout
  paintTerrain(g) {
    const { cs, dpr } = this;
    const { W, H } = g;
    const c = document.createElement('canvas');
    const Wp = Math.ceil(this.bw * dpr), Hp = Math.ceil(this.bh * dpr);
    c.width = Wp;
    c.height = Hp;
    const x2 = c.getContext('2d');
    const img = x2.createImageData(Wp, Hp);
    const px = img.data;

    // 1) a smooth height field, R samples per cell, Catmull-Rom between cell centres
    const at = (x, y) => g.h[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)];
    const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    const GW = W * R + 1, GH = H * R + 1;
    const hf = new Float32Array(GW * GH);
    const bumps = valueNoise(rng(g.seed ^ 0x33), GW, GH, 3);
    for (let j = 0; j < GH; j++) {
      for (let i = 0; i < GW; i++) {
        const x = i / R - 0.5, y = j / R - 0.5;
        const ix = Math.floor(x), iy = Math.floor(y), tx = x - ix, ty = y - iy;
        const row = (yy) => cr(at(ix - 1, yy), at(ix, yy), at(ix + 1, yy), at(ix + 2, yy), tx);
        hf[j * GW + i] = cr(row(iy - 1), row(iy), row(iy + 1), row(iy + 2), ty) + bumps[j * GW + i] * 0.12;
      }
    }
    // how wet the ground is: near the river grass grows
    const wet = new Float32Array(W * H).fill(99);
    const queue = [];
    for (const i of g.river) { wet[i] = 0; queue.push(i); }
    while (queue.length) {
      const a = queue.shift();
      const ax = a % W, ay = (a / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = ax + dx, yy = ay + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const b = yy * W + xx;
        if (wet[b] > wet[a] + 1) { wet[b] = wet[a] + 1; queue.push(b); }
      }
    }
    const fine = valueNoise(rng(g.seed ^ 0x77), W * 6, H * 6, 1);
    const patch = valueNoise(rng(g.seed ^ 0x99), W * 2, H * 2, 2);
    const sample = (arr, aw, ah, fx, fy) => {
      const x = clamp(fx, 0, aw - 1.001), y = clamp(fy, 0, ah - 1.001);
      const ix = Math.floor(x), iy = Math.floor(y), tx = x - ix, ty = y - iy;
      const k = (i, j) => arr[Math.min(iy + j, ah - 1) * aw + Math.min(ix + i, aw - 1)];
      return lerp(lerp(k(0, 0), k(1, 0), tx), lerp(k(0, 1), k(1, 1), tx), ty);
    };
    let lo = Infinity, hi = -Infinity;
    for (const v of g.h) { lo = Math.min(lo, v); hi = Math.max(hi, v); }

    // sun from the north-west of the screen
    const L = [-0.55, -0.62, 0.56];
    const unit = cs * dpr;
    for (let y = 0; y < Hp; y++) {
      for (let x = 0; x < Wp; x++) {
        const sx = x / unit, sy = y / unit;
        const fx = this.rot ? W - sy : sx; // valley coordinates, in cells
        const fy = this.rot ? sx : sy;
        const gi = fx * R, gj = fy * R;
        const h = sample(hf, GW, GH, gi, gj);
        // slope in valley axes, then turned to screen axes for the light
        const vx = (sample(hf, GW, GH, gi + 1, gj) - sample(hf, GW, GH, gi - 1, gj)) * R * 0.5;
        const vy = (sample(hf, GW, GH, gi, gj + 1) - sample(hf, GW, GH, gi, gj - 1)) * R * 0.5;
        const hx = this.rot ? vy : vx, hy = this.rot ? -vx : vy;
        const slope = Math.hypot(hx, hy);
        const nx = -hx * 0.55, ny = -hy * 0.55;
        const nl = Math.hypot(nx, ny, 1);
        const light = clamp((nx * L[0] + ny * L[1] + L[2]) / nl, 0, 1);
        const t = clamp((h - lo) / (hi - lo), 0, 1);
        const d = sample(wet, W, H, fx - 0.5, fy - 0.5);
        const moist = Math.exp(-d / 2.2);
        const fz = sample(fine, W * 6, H * 6, fx * 6, fy * 6);
        const pz = sample(patch, W * 2, H * 2, fx * 2, fy * 2);
        let col = mix(STEPPE, STEPPE_HIGH, t);
        col = mix(col, mix(MEADOW, MEADOW_DARK, 0.5 + 0.5 * pz), clamp(moist * 1.1 + pz * 0.15, 0, 1));
        col = mix(col, ROCK, clamp((slope - 1.5) * 0.45 + (t - 0.75) * 1.5, 0, 0.85));
        const ice = fy < 2 + pz * 0.5;
        if (ice) col = SNOW;
        // light and shade, plus a little grain so it does not look like plastic
        let k = 0.74 + 0.58 * light + fz * 0.06;
        if (ice) k = 0.78 + 0.3 * light + fz * 0.03;
        col = col.map((v) => v * k);
        // contour lines, one layer apart, about one pixel wide whatever the slope
        if (!ice) {
          const v = h / LAYER;
          const f = Math.abs(v - Math.round(v));
          const wpx = (slope / LAYER / unit) * 1.3;
          if (f < wpx) {
            const a = 0.34 * (1 - f / wpx);
            col = col.map((u) => u * (1 - a));
          }
        }
        const p = (y * Wp + x) * 4;
        px[p] = col[0];
        px[p + 1] = col[1];
        px[p + 2] = col[2];
        px[p + 3] = 255;
      }
    }
    x2.putImageData(img, 0, 0);
    return c;
  }

  draw(g, now, ui) {
    const { cx, cs, dpr } = this;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = C.table;
    cx.fillRect(0, 0, this.cv.width, this.cv.height);
    cx.save();
    cx.shadowColor = 'rgba(0,0,0,0.5)';
    cx.shadowBlur = 20;
    cx.shadowOffsetY = 6;
    cx.drawImage(this.terrain, this.ox, this.oy, this.bw, this.bh);
    cx.restore();
    cx.lineCap = 'round';
    cx.lineJoin = 'round';

    const edges = [];
    for (let a = 0; a < g.W * g.H; a++) for (const b of g.out[a]) edges.push([a, b]);
    const isRiver = (a, b) => g.kind[b] === S.RIVER && g.kind[a] === S.RIVER;
    const bedW = (a, b) => cs * (isRiver(a, b) ? 0.82 : 0.56);

    // river banks: pebbles and sand
    cx.strokeStyle = C.bank;
    for (const [a, b] of edges) {
      if (!isRiver(a, b)) continue;
      cx.lineWidth = bedW(a, b) + cs * 0.22;
      this.seg(a, b);
    }
    // dug channels: a rim of thrown-out earth, then the dark bed
    cx.strokeStyle = C.soilRim;
    for (const [a, b] of edges) {
      if (isRiver(a, b)) continue;
      cx.lineWidth = bedW(a, b) + cs * 0.16;
      this.seg(a, b);
    }
    for (const [a, b] of edges) {
      cx.strokeStyle = isRiver(a, b) ? '#5a4a36' : C.soil;
      cx.lineWidth = bedW(a, b);
      this.seg(a, b);
    }
    // inner shade: the bed is lower than the ground around it
    cx.strokeStyle = 'rgba(0,0,0,0.22)';
    for (const [a, b] of edges) {
      cx.lineWidth = bedW(a, b) * 0.55;
      this.seg(a, b, cs * 0.06, cs * 0.06);
    }

    // water: deep in the middle, lighter at the edges, wider when more flows
    const wetEdges = [];
    for (const [a, b] of edges) {
      const q = g.flow[b] || 0;
      if (q < 0.01 || g.gate[b]) continue;
      const river = g.kind[b] === S.RIVER;
      const k = river ? clamp(q / 8, 0, 1) : clamp(q / g.cap, 0, 1);
      wetEdges.push([a, b, q, cs * (river ? 0.36 + 0.36 * k : 0.2 + 0.28 * k)]);
    }
    cx.strokeStyle = C.water;
    for (const [a, b, , w] of wetEdges) {
      cx.lineWidth = w;
      this.seg(a, b);
    }
    cx.strokeStyle = C.deep;
    for (const [a, b, , w] of wetEdges) {
      cx.lineWidth = w * 0.5;
      this.seg(a, b);
    }
    // moving glints: short light streaks that run downstream
    const t = now / 1000;
    cx.strokeStyle = C.shine;
    for (const [a, b, q, w] of wetEdges) {
      const speed = 0.6 + Math.min(q, 5) * 0.18;
      cx.lineWidth = Math.max(1, w * 0.16);
      cx.setLineDash([cs * 0.16, cs * 0.5]);
      cx.lineDashOffset = -((t * speed * cs + a * 7.3) % (cs * 0.66));
      cx.globalAlpha = 0.55 + 0.3 * Math.sin(t * 3 + a);
      this.seg(a, b, -w * 0.12, -w * 0.12);
    }
    cx.setLineDash([]);
    cx.globalAlpha = 1;

    // spilt water: a muddy puddle
    for (let i = 0; i < g.W * g.H; i++) {
      const s = g.spill[i];
      if (s < 0.02) continue;
      const [px, py] = this.center(i);
      const r = cs * (0.42 + 0.45 * clamp(s, 0, 1));
      this.blob(px + 1, py + 1, r * 1.08, 'rgba(70,52,30,0.35)', i);
      this.blob(px, py, r, 'rgba(47,138,196,0.6)', i);
      cx.fillStyle = 'rgba(220,245,255,0.35)';
      cx.beginPath();
      cx.ellipse(px - r * 0.3, py - r * 0.3, r * 0.3, r * 0.14, -0.6, 0, Math.PI * 2);
      cx.fill();
    }

    // closed gates: a wooden board across the canal, inside the gated cell so a tap on it hits that cell
    for (let i = 0; i < g.W * g.H; i++) {
      if (!g.gate[i]) continue;
      const [x1, y1] = this.center(g.from[i]), [x2, y2] = this.center(i);
      const mx = lerp(x1, x2, 0.7), my = lerp(y1, y2, 0.7), nx = -(y2 - y1) / cs, ny = (x2 - x1) / cs;
      const ax = mx - nx * cs * 0.44, ay = my - ny * cs * 0.44, bx = mx + nx * cs * 0.44, by = my + ny * cs * 0.44;
      cx.lineCap = 'butt';
      for (const [col, w, d] of [[C.shadow, 0.26, 2], [C.plank, 0.22, 0], [C.plankLight, 0.08, -1]]) {
        cx.strokeStyle = col;
        cx.lineWidth = cs * w;
        cx.beginPath();
        cx.moveTo(ax + d, ay + d);
        cx.lineTo(bx + d, by + d);
        cx.stroke();
      }
      cx.lineCap = 'round';
    }

    // while digging: every cell the canal can still reach from here is lit
    if (ui.reach) {
      cx.fillStyle = 'rgba(255,250,225,0.3)';
      const m = cs * 0.1;
      for (let i = 0; i < g.W * g.H; i++) {
        if (g.kind[i] !== S.LAND || g.objAt[i] || !(ui.reach[i] > -Infinity)) continue;
        const [px, py] = this.center(i);
        this.roundRect(px - cs / 2 + m, py - cs / 2 + m, cs - 2 * m, cs - 2 * m, cs * 0.18);
        cx.fill();
      }
    }

    this.drawObjects(g, now);
    this.drawBits(now);
    this.drawStroke(g);
    if (ui.ghost) this.drawGhost(ui.ghost, now);
    if (ui.blocked && now - ui.blocked.at < 700) {
      const [px, py] = this.center(ui.blocked.cell);
      const r = cs * 0.3;
      for (const [col, w] of [['rgba(0,0,0,0.4)', 0.24], [C.thirst, 0.13]]) {
        cx.strokeStyle = col;
        cx.lineWidth = Math.max(2, cs * w);
        cx.beginPath();
        cx.moveTo(px - r, py - r); cx.lineTo(px + r, py + r);
        cx.moveTo(px + r, py - r); cx.lineTo(px - r, py + r);
        cx.stroke();
      }
    }
    if (g.day >= S.WINTER) this.drawSnow();
    if (g.over) {
      const [px, py] = this.center(g.over.y * g.W + g.over.x);
      cx.strokeStyle = C.thirst;
      cx.lineWidth = 3;
      cx.beginPath();
      cx.arc(px, py, cs * (0.85 + 0.12 * Math.sin(now / 150)), 0, Math.PI * 2);
      cx.stroke();
    }
  }

  seg(a, b, dx = 0, dy = 0) {
    const [x1, y1] = this.center(a), [x2, y2] = this.center(b);
    this.cx.beginPath();
    this.cx.moveTo(x1 + dx, y1 + dy);
    this.cx.lineTo(x2 + dx, y2 + dy);
    this.cx.stroke();
  }

  roundRect(x, y, w, h, r) {
    const cx = this.cx;
    cx.beginPath();
    cx.moveTo(x + r, y);
    cx.arcTo(x + w, y, x + w, y + h, r);
    cx.arcTo(x + w, y + h, x, y + h, r);
    cx.arcTo(x, y + h, x, y, r);
    cx.arcTo(x, y, x + w, y, r);
    cx.closePath();
  }

  // an uneven puddle, the same shape every frame
  blob(px, py, r, fill, seed) {
    const cx = this.cx;
    cx.fillStyle = fill;
    cx.beginPath();
    for (let k = 0; k <= 12; k++) {
      const an = (k / 12) * Math.PI * 2;
      const rr = r * (0.84 + 0.16 * Math.sin(an * 3 + seed));
      const x = px + Math.cos(an) * rr, y = py + Math.sin(an) * rr;
      k ? cx.lineTo(x, y) : cx.moveTo(x, y);
    }
    cx.fill();
  }

  // a round thing lit from the upper left, with its shadow to the lower right
  ball(px, py, r, light, dark, shade = 0.35) {
    const cx = this.cx;
    if (shade) {
      cx.fillStyle = `rgba(20,24,16,${shade})`;
      cx.beginPath();
      cx.ellipse(px + r * 0.35, py + r * 0.4, r * 1.02, r * 0.95, 0, 0, Math.PI * 2);
      cx.fill();
    }
    const gr = cx.createRadialGradient(px - r * 0.38, py - r * 0.42, r * 0.1, px, py, r);
    gr.addColorStop(0, light);
    gr.addColorStop(1, dark);
    cx.fillStyle = gr;
    cx.beginPath();
    cx.arc(px, py, r, 0, Math.PI * 2);
    cx.fill();
  }

  drawObjects(g, now) {
    const { cx, cs } = this;
    for (const o of g.objects) {
      const [px, py] = this.center(o.y * g.W + o.x);
      const age = (g.day + (g.year - 1) * S.YEAR_DAYS - o.born) * S.DAY_SEC;
      const pop = age < 0.45 ? 0.3 + 1.6 * age : 1;
      const r = cs * 0.5 * pop;
      if (o.thirst > 0.7 && g.day < S.WINTER) {
        cx.fillStyle = `rgba(226,73,59,${0.2 + 0.16 * Math.sin(now / 120)})`;
        cx.beginPath();
        cx.arc(px, py, r * 1.8, 0, Math.PI * 2);
        cx.fill();
      }
      if (o.type === 'garden') this.orchard(px, py, r, o, g, now);
      else this.yurt(px, py, r * 0.95);
      // not enough water: a drop bobs above it
      if (o.s < 0.6 && g.day < S.WINTER) this.drop(px, py - r * 2 + Math.sin(now / 220) * cs * 0.08, cs * 0.28);
      this.ring(px, py, r + 5, o.thirst, C.thirst);
      if (o.type === 'house') this.ring(px, py, r + 9, o.flood, C.flood);
    }
  }

  // four apple trees from above; leaves yellow and thin out with thirst, apples when it is happy
  orchard(px, py, r, o, g, now) {
    const cx = this.cx;
    const k = clamp(o.thirst, 0, 1);
    const sway = Math.sin(now / 900 + o.x) * r * 0.02;
    const trees = [[-0.4, -0.36, 0.56], [0.42, -0.3, 0.52], [-0.32, 0.42, 0.53], [0.4, 0.42, 0.56]];
    // a patch of watered ground under the trees
    cx.fillStyle = `rgba(${lerp(70, 120, k) | 0},${lerp(96, 92, k) | 0},${lerp(40, 52, k) | 0},0.55)`;
    cx.beginPath();
    cx.ellipse(px, py, r * 1.15, r * 1.1, 0, 0, Math.PI * 2);
    cx.fill();
    for (const [dx, dy, s] of trees) {
      const rr = r * s * (1 - k * 0.18);
      const light = rgb(mix([142, 190, 86], [214, 182, 96], k));
      const dark = rgb(mix([40, 92, 34], [128, 96, 44], k));
      this.ball(px + dx * r + sway, py + dy * r, rr, light, dark, 0.32);
      cx.fillStyle = `rgba(255,255,255,${0.08 + 0.05 * (1 - k)})`;
      cx.beginPath();
      cx.arc(px + dx * r - rr * 0.3 + sway, py + dy * r - rr * 0.3, rr * 0.35, 0, Math.PI * 2);
      cx.fill();
    }
    if (o.s >= 0.6 && k < 0.3 && g.day < S.WINTER) {
      for (const [dx, dy] of [[-0.55, -0.2], [0.3, -0.45], [-0.2, 0.55], [0.55, 0.3], [0.12, 0.05]]) {
        this.ball(px + dx * r, py + dy * r, Math.max(1.3, r * 0.09), '#ff8a6a', '#b8281e', 0.2);
      }
    }
  }

  // a yurt from above: white felt dome, roof poles running to the round shanyrak, a red band
  yurt(px, py, r) {
    const cx = this.cx;
    this.ball(px, py, r, '#fffdf6', '#c9bba2', 0.38);
    cx.strokeStyle = 'rgba(120,96,64,0.5)';
    cx.lineWidth = Math.max(0.8, r * 0.04);
    cx.beginPath();
    for (let n = 0; n < 12; n++) {
      const an = (n / 12) * Math.PI * 2;
      cx.moveTo(px + Math.cos(an) * r * 0.26, py + Math.sin(an) * r * 0.26);
      cx.lineTo(px + Math.cos(an) * r * 0.92, py + Math.sin(an) * r * 0.92);
    }
    cx.stroke();
    cx.strokeStyle = 'rgba(176,64,46,0.7)';
    cx.lineWidth = Math.max(1, r * 0.08);
    cx.beginPath();
    cx.arc(px, py, r * 0.8, 0, Math.PI * 2);
    cx.stroke();
    this.ball(px, py, r * 0.25, '#9a6a3c', '#4a2e16', 0);
    cx.strokeStyle = 'rgba(255,240,210,0.6)';
    cx.lineWidth = Math.max(0.8, r * 0.05);
    cx.beginPath();
    cx.moveTo(px - r * 0.18, py); cx.lineTo(px + r * 0.18, py);
    cx.moveTo(px, py - r * 0.18); cx.lineTo(px, py + r * 0.18);
    cx.stroke();
  }

  drop(px, py, s) {
    const cx = this.cx;
    const path = (d) => {
      cx.beginPath();
      cx.moveTo(px + d, py - s * 1.5 + d);
      cx.quadraticCurveTo(px + s * 1.05 + d, py - s * 0.2 + d, px + s * 0.75 + d, py + s * 0.35 + d);
      cx.arc(px + d, py + s * 0.25 + d, s * 0.78, 0.15, Math.PI - 0.15);
      cx.quadraticCurveTo(px - s * 1.05 + d, py - s * 0.2 + d, px + d, py - s * 1.5 + d);
    };
    cx.fillStyle = 'rgba(0,0,0,0.3)';
    path(2);
    cx.fill();
    const gr = cx.createLinearGradient(px, py - s * 1.5, px, py + s);
    gr.addColorStop(0, '#7cc8f2');
    gr.addColorStop(1, '#1f6fa8');
    cx.fillStyle = gr;
    cx.strokeStyle = C.ui;
    cx.lineWidth = 2;
    path(0);
    cx.stroke();
    cx.fill();
    cx.fillStyle = 'rgba(255,255,255,0.75)';
    cx.beginPath();
    cx.ellipse(px - s * 0.3, py, s * 0.14, s * 0.24, -0.3, 0, Math.PI * 2);
    cx.fill();
  }

  ring(px, py, r, k, color) {
    if (k < 0.03) return;
    const cx = this.cx;
    const a0 = -Math.PI / 2, a1 = a0 + k * Math.PI * 2;
    for (const [col, w] of [['rgba(0,0,0,0.35)', 0.17], [color, 0.1]]) {
      cx.strokeStyle = col;
      cx.lineWidth = Math.max(2, this.cs * w);
      cx.beginPath();
      cx.arc(px, py, r, a0, a1);
      cx.stroke();
    }
  }

  drawSnow() {
    const cx = this.cx;
    cx.fillStyle = 'rgba(240,246,252,0.38)';
    cx.fillRect(this.ox, this.oy, this.bw, this.bh);
    cx.fillStyle = '#ffffff';
    for (const [x, y, r] of this.snow) {
      cx.beginPath();
      cx.arc(this.ox + x, this.oy + y, r, 0, Math.PI * 2);
      cx.fill();
    }
  }

  drawStroke(g) {
    if (!g.cur) return;
    const { cx, cs } = this;
    cx.strokeStyle = 'rgba(255,248,234,0.9)';
    cx.lineWidth = 2;
    cx.setLineDash([4, 3]);
    for (const c of g.cur.cells) {
      const [px, py] = this.center(c);
      this.roundRect(px - cs * 0.45, py - cs * 0.45, cs * 0.9, cs * 0.9, cs * 0.15);
      cx.stroke();
    }
    cx.setLineDash([]);
  }

  // the dashed path and a finger that shows where to dig
  drawGhost(ghost, now) {
    const { cx, cs } = this;
    const pts = [ghost.from, ...ghost.cells].map((i) => this.center(i));
    cx.save();
    cx.setLineDash([cs * 0.25, cs * 0.22]);
    cx.lineDashOffset = -now / 40;
    for (const [col, w] of [['rgba(0,0,0,0.35)', 0.2], [C.ui, 0.12]]) {
      cx.strokeStyle = col;
      cx.lineWidth = Math.max(2, cs * w);
      cx.beginPath();
      pts.forEach(([x, y], k) => (k ? cx.lineTo(x, y) : cx.moveTo(x, y)));
      cx.stroke();
    }
    cx.restore();
    const T = 1600 + pts.length * 260;
    const f = clamp(((now % T) - 500) / (T - 1100), 0, 1);
    const seg = f * (pts.length - 1);
    const k = Math.min(Math.floor(seg), pts.length - 2);
    const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
    this.ball(lerp(x1, x2, seg - k), lerp(y1, y2, seg - k), cs * 0.3, '#ffffff', '#d9d2c4', 0.3);
  }
}

export const HUD_TOP = TOP;
