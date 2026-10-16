// Paper cut-out look, seen from above: the valley is a stack of warm paper sheets, one per height
// band, each casting a shadow on the one below; channels are cut into it, water is glossy blue
// paper with glints, gardens and yurts are cut-outs with a white edge and a shadow.
// On a landscape screen the valley is turned on its side (glacier on the left), the rules do not change.
import * as S from './sim.js';
import { clamp, lerp, rng, valueNoise } from './util.js';

const TOP = 58;
const BOTTOM = 46;
const STEP = 1.6; // height of one paper sheet

const C = {
  table: '#3a2a20',
  edge: '#fbf1dc', // the white rim of a cut-out
  shadow: 'rgba(58,32,14,0.28)',
  bed: '#8c5b3a',
  riverBed: '#6e4630',
  water: '#3d8fd6',
  shine: '#a8dcff',
  leaf: [106, 168, 79],
  leafDark: [79, 136, 58],
  dry: [201, 161, 90],
  dryDark: [160, 120, 62],
  apple: '#d9483b',
  felt: '#f8f1e4',
  feltRing: '#e4d3b6',
  pole: '#c4a983',
  crown: '#b5793f',
  ornament: '#c8553d',
  thirst: '#d9483b',
  flood: '#3d8fd6',
  plank: '#b8572f',
};
// low ground to high ground
const PAPER = [[0, [205, 146, 86]], [0.3, [221, 171, 106]], [0.55, [232, 194, 136]], [0.8, [240, 214, 168]], [1, [247, 233, 204]]];

function paper(t) {
  for (let k = 1; k < PAPER.length; k++) {
    if (t <= PAPER[k][0]) {
      const [t0, a] = PAPER[k - 1], [t1, b] = PAPER[k];
      const f = (t - t0) / (t1 - t0);
      return a.map((v, i) => lerp(v, b[i], f));
    }
  }
  return PAPER[PAPER.length - 1][1];
}
const rgb = ([r, g, b]) => `rgb(${r | 0},${g | 0},${b | 0})`;
const mix = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

export class View {
  constructor(canvas) {
    this.cv = canvas;
    this.cx = canvas.getContext('2d');
    this.terrain = null;
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
    this.snow = Array.from({ length: 140 }, () => [r() * this.bw, r() * this.bh, 0.6 + r() * 1.4]);
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

  // the paper landscape, drawn once per layout, pixel by pixel
  paintTerrain(g) {
    const { cs, dpr } = this;
    const c = document.createElement('canvas');
    const Wp = Math.ceil(this.bw * dpr), Hp = Math.ceil(this.bh * dpr);
    c.width = Wp;
    c.height = Hp;
    const x2 = c.getContext('2d');
    const img = x2.createImageData(Wp, Hp);
    const px = img.data;
    const { W, H } = g;
    let lo = Infinity, hi = -Infinity;
    for (const v of g.h) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const at = (x, y) => g.h[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)];
    // a little wobble so the sheet edges look cut by hand, not by a machine
    const wob = valueNoise(rng(g.seed ^ 0x51), W * 3, H * 3, 2);
    const wobAt = (fx, fy) => {
      const x = clamp(fx * 3, 0, W * 3 - 1.001), y = clamp(fy * 3, 0, H * 3 - 1.001);
      const ix = Math.floor(x), iy = Math.floor(y), tx = x - ix, ty = y - iy;
      const k = (i, j) => wob[Math.min(iy + j, H * 3 - 1) * W * 3 + Math.min(ix + i, W * 3 - 1)];
      return lerp(lerp(k(0, 0), k(1, 0), tx), lerp(k(0, 1), k(1, 1), tx), ty);
    };
    const height = (fx, fy) => {
      const x = fx - 0.5, y = fy - 0.5;
      const ix = Math.floor(x), iy = Math.floor(y);
      const tx = x - ix, ty = y - iy;
      const v = lerp(lerp(at(ix, iy), at(ix + 1, iy), tx), lerp(at(ix, iy + 1), at(ix + 1, iy + 1), tx), ty);
      return v + wobAt(fx, fy) * 0.35;
    };
    const unit = cs * dpr;
    // screen pixel -> fractional valley coordinates
    const toValley = (X, Y) => (this.rot ? [W - Y / unit, X / unit] : [X / unit, Y / unit]);
    const bandAt = (X, Y) => {
      const [fx, fy] = toValley(X, Y);
      return Math.floor(height(fx, fy) / STEP);
    };
    const iceAt = (X, Y) => {
      const [fx, fy] = toValley(X, Y);
      return fy < 2 + wobAt(fx, fy) * 0.5;
    };
    const off = Math.max(2, Math.round(2 * dpr)); // shadow length: light comes from the upper left
    const tone = [];
    for (let y = 0; y < Hp; y++) {
      for (let x = 0; x < Wp; x++) {
        const k = (y * Wp + x) * 4;
        let col;
        const grain = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 7;
        if (iceAt(x, y)) {
          col = [238, 244, 248];
          if (!iceAt(x - off, y - off)) col = [214, 226, 236];
        } else {
          const b = bandAt(x, y);
          if (!tone[b + 50]) tone[b + 50] = paper(clamp((b * STEP - lo) / (hi - lo), 0, 1)).map((v) => v * (b % 2 ? 1 : 0.975));
          col = tone[b + 50];
          // a higher sheet towards the light throws a shadow here; the sheet's own edge is lit
          const up = bandAt(x - off, y - off);
          if (up > b) col = col.map((v) => v * 0.86);
          else if (bandAt(x + dpr, y + dpr) < b) col = col.map((v) => Math.min(255, v + 14));
          if (iceAt(x - off, y - off)) col = col.map((v) => v * 0.86);
        }
        px[k] = col[0] + grain;
        px[k + 1] = col[1] + grain;
        px[k + 2] = col[2] + grain;
        px[k + 3] = 255;
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
    // the sheet lies on the table and throws a soft shadow
    cx.save();
    cx.shadowColor = 'rgba(0,0,0,0.45)';
    cx.shadowBlur = 18;
    cx.shadowOffsetY = 6;
    cx.drawImage(this.terrain, this.ox, this.oy, this.bw, this.bh);
    cx.restore();
    cx.lineCap = 'round';
    cx.lineJoin = 'round';

    const edges = [];
    for (let a = 0; a < g.W * g.H; a++) for (const b of g.out[a]) edges.push([a, b]);
    const isRiver = (a, b) => g.kind[b] === S.RIVER && g.kind[a] === S.RIVER;
    const bedW = (a, b) => cs * (isRiver(a, b) ? 0.8 : 0.58);

    // cut channels: shadow, white rim, brown bed
    cx.strokeStyle = C.shadow;
    for (const [a, b] of edges) {
      cx.lineWidth = bedW(a, b) + 3;
      this.seg(a, b, 1.5, 2.2);
    }
    cx.strokeStyle = C.edge;
    for (const [a, b] of edges) {
      cx.lineWidth = bedW(a, b) + 3;
      this.seg(a, b);
    }
    for (const [a, b] of edges) {
      cx.strokeStyle = isRiver(a, b) ? C.riverBed : C.bed;
      cx.lineWidth = bedW(a, b);
      this.seg(a, b);
    }

    // water: blue paper, wider when more flows, with a shiny stripe on top
    const wet = [];
    for (const [a, b] of edges) {
      const q = g.flow[b] || 0;
      if (q < 0.01 || g.gate[b]) continue;
      const river = g.kind[b] === S.RIVER;
      const k = river ? clamp(q / 8, 0, 1) : clamp(q / S.CANAL_CAP, 0, 1);
      wet.push([a, b, q, cs * (river ? 0.3 + 0.38 * k : 0.16 + 0.3 * k)]);
    }
    cx.strokeStyle = C.water;
    for (const [a, b, , w] of wet) {
      cx.lineWidth = w;
      this.seg(a, b);
    }
    cx.strokeStyle = C.shine;
    cx.globalAlpha = 0.75;
    for (const [a, b, , w] of wet) {
      cx.lineWidth = Math.max(1, w * 0.28);
      this.seg(a, b, -w * 0.18, -w * 0.18);
    }
    cx.globalAlpha = 1;
    // glints run downstream and twinkle
    const t = now / 1000;
    cx.strokeStyle = '#ffffff';
    cx.lineWidth = Math.max(1, cs * 0.05);
    for (const [a, b, q] of wet) {
      const [x1, y1] = this.center(a), [x2, y2] = this.center(b);
      const f = (t * (0.7 + Math.min(q, 4) * 0.22) + ((a * 0.37) % 1)) % 1;
      const tw = 0.5 + 0.5 * Math.sin(t * 5 + a * 1.7);
      const s = cs * (0.06 + 0.1 * tw);
      const gx = lerp(x1, x2, f), gy = lerp(y1, y2, f);
      cx.globalAlpha = 0.45 + 0.55 * tw;
      cx.beginPath();
      cx.moveTo(gx - s, gy); cx.lineTo(gx + s, gy);
      cx.moveTo(gx, gy - s); cx.lineTo(gx, gy + s);
      cx.stroke();
    }
    cx.globalAlpha = 1;

    // spilt water: a blue paper puddle
    for (let i = 0; i < g.W * g.H; i++) {
      const s = g.spill[i];
      if (s < 0.02) continue;
      const [px, py] = this.center(i);
      const r = cs * (0.42 + 0.45 * clamp(s, 0, 1));
      this.blob(px, py, r, 'rgba(61,143,214,0.55)', i);
    }

    // closed gates: a wooden plank across the canal, inside the gated cell so a tap on it hits that cell
    for (let i = 0; i < g.W * g.H; i++) {
      if (!g.gate[i]) continue;
      const [x1, y1] = this.center(g.from[i]), [x2, y2] = this.center(i);
      const mx = lerp(x1, x2, 0.7), my = lerp(y1, y2, 0.7), nx = -(y2 - y1) / cs, ny = (x2 - x1) / cs;
      const ax = mx - nx * cs * 0.42, ay = my - ny * cs * 0.42, bx = mx + nx * cs * 0.42, by = my + ny * cs * 0.42;
      for (const [col, w, d] of [[C.shadow, 0.3, 2], [C.edge, 0.32, 0], [C.plank, 0.2, 0]]) {
        cx.strokeStyle = col;
        cx.lineWidth = cs * w;
        cx.beginPath();
        cx.moveTo(ax + d, ay + d);
        cx.lineTo(bx + d, by + d);
        cx.stroke();
      }
    }

    // while digging: every cell the canal can still reach from here is lit
    if (ui.reach) {
      cx.fillStyle = 'rgba(255,248,228,0.42)';
      const m = cs * 0.12;
      for (let i = 0; i < g.W * g.H; i++) {
        if (g.kind[i] !== S.LAND || g.objAt[i] || !(ui.reach[i] > -Infinity)) continue;
        const [px, py] = this.center(i);
        cx.fillRect(px - cs / 2 + m, py - cs / 2 + m, cs - 2 * m, cs - 2 * m);
      }
    }

    this.drawObjects(g, now);
    this.drawStroke(g);
    if (ui.ghost) this.drawGhost(ui.ghost, now);
    if (ui.blocked && now - ui.blocked.at < 700) {
      const [px, py] = this.center(ui.blocked.cell);
      const r = cs * 0.3;
      for (const [col, w] of [[C.edge, 0.26], [C.thirst, 0.14]]) {
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

  // a round cut-out: shadow, white rim, then the colour
  disc(px, py, r, fill, rim = 2.5) {
    const cx = this.cx;
    cx.fillStyle = C.shadow;
    cx.beginPath();
    cx.arc(px + 1.8, py + 2.4, r + rim, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = C.edge;
    cx.beginPath();
    cx.arc(px, py, r + rim, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = fill;
    cx.beginPath();
    cx.arc(px, py, r, 0, Math.PI * 2);
    cx.fill();
  }

  // an uneven puddle, the same shape every frame
  blob(px, py, r, fill, seed) {
    const cx = this.cx;
    cx.fillStyle = fill;
    cx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const an = (k / 10) * Math.PI * 2;
      const rr = r * (0.85 + 0.15 * Math.sin(an * 3 + seed));
      const x = px + Math.cos(an) * rr, y = py + Math.sin(an) * rr;
      k ? cx.lineTo(x, y) : cx.moveTo(x, y);
    }
    cx.fill();
  }

  drawObjects(g, now) {
    const { cx, cs } = this;
    for (const o of g.objects) {
      const [px, py] = this.center(o.y * g.W + o.x);
      const age = (g.day + (g.year - 1) * S.YEAR_DAYS - o.born) * S.DAY_SEC;
      const pop = age < 0.45 ? 0.3 + 1.6 * age : 1;
      const r = cs * 0.4 * pop;
      if (o.thirst > 0.7 && g.day < S.WINTER) {
        cx.fillStyle = `rgba(217,72,59,${0.22 + 0.18 * Math.sin(now / 120)})`;
        cx.beginPath();
        cx.arc(px, py, r * 1.8, 0, Math.PI * 2);
        cx.fill();
      }
      if (o.type === 'garden') this.garden(px, py, r, o, g);
      else this.yurt(px, py, r * 1.08);
      // not enough water: a drop bobs above it
      if (o.s < 0.6 && g.day < S.WINTER) this.drop(px, py - r * 2 + Math.sin(now / 220) * cs * 0.08, cs * 0.3);
      this.ring(px, py, r + 5, o.thirst, C.thirst);
      if (o.type === 'house') this.ring(px, py, r + 9, o.flood, C.flood);
    }
  }

  // three paper tree crowns; they yellow with thirst, apples show when the garden is happy
  garden(px, py, r, o, g) {
    const cx = this.cx;
    const k = clamp(o.thirst, 0, 1);
    const leaf = rgb(mix(C.leaf, C.dry, k)), dark = rgb(mix(C.leafDark, C.dryDark, k));
    const crowns = [[-0.38, 0.18], [0.38, 0.2], [0, -0.32]];
    cx.fillStyle = C.shadow;
    for (const [dx, dy] of crowns) {
      cx.beginPath();
      cx.arc(px + dx * r + 1.8, py + dy * r + 2.4, r * 0.62 + 2.5, 0, Math.PI * 2);
      cx.fill();
    }
    cx.fillStyle = C.edge;
    for (const [dx, dy] of crowns) {
      cx.beginPath();
      cx.arc(px + dx * r, py + dy * r, r * 0.62 + 2.5, 0, Math.PI * 2);
      cx.fill();
    }
    for (const [dx, dy] of crowns) {
      cx.fillStyle = dark;
      cx.beginPath();
      cx.arc(px + dx * r, py + dy * r, r * 0.62, 0, Math.PI * 2);
      cx.fill();
      cx.fillStyle = leaf;
      cx.beginPath();
      cx.arc(px + dx * r - r * 0.08, py + dy * r - r * 0.08, r * 0.5, 0, Math.PI * 2);
      cx.fill();
    }
    if (o.s >= 0.6 && k < 0.3 && g.day < S.WINTER) {
      cx.fillStyle = C.apple;
      for (const [dx, dy] of [[-0.45, 0.3], [0.3, 0.32], [0.08, -0.3], [0.5, 0.0]]) {
        cx.beginPath();
        cx.arc(px + dx * r, py + dy * r, Math.max(1.4, r * 0.11), 0, Math.PI * 2);
        cx.fill();
      }
    }
  }

  // a yurt from above: felt dome, roof poles running to the shanyrak, a red ornament band
  yurt(px, py, r) {
    const cx = this.cx;
    this.disc(px, py, r, C.feltRing);
    cx.fillStyle = C.felt;
    cx.beginPath();
    cx.arc(px, py, r * 0.86, 0, Math.PI * 2);
    cx.fill();
    cx.strokeStyle = C.ornament;
    cx.lineWidth = Math.max(1, r * 0.09);
    cx.beginPath();
    cx.arc(px, py, r * 0.7, 0, Math.PI * 2);
    cx.stroke();
    cx.strokeStyle = C.pole;
    cx.lineWidth = Math.max(0.8, r * 0.05);
    cx.beginPath();
    for (let n = 0; n < 10; n++) {
      const an = (n / 10) * Math.PI * 2;
      cx.moveTo(px + Math.cos(an) * r * 0.26, py + Math.sin(an) * r * 0.26);
      cx.lineTo(px + Math.cos(an) * r * 0.62, py + Math.sin(an) * r * 0.62);
    }
    cx.stroke();
    cx.fillStyle = C.crown;
    cx.beginPath();
    cx.arc(px, py, r * 0.24, 0, Math.PI * 2);
    cx.fill();
    cx.strokeStyle = C.felt;
    cx.lineWidth = Math.max(0.8, r * 0.06);
    cx.beginPath();
    cx.moveTo(px - r * 0.17, py); cx.lineTo(px + r * 0.17, py);
    cx.moveTo(px, py - r * 0.17); cx.lineTo(px, py + r * 0.17);
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
    cx.fillStyle = C.shadow;
    path(2);
    cx.fill();
    cx.fillStyle = C.water;
    cx.strokeStyle = C.edge;
    cx.lineWidth = 2.5;
    path(0);
    cx.stroke();
    cx.fill();
    cx.fillStyle = C.shine;
    cx.beginPath();
    cx.arc(px - s * 0.3, py + s * 0.05, s * 0.2, 0, Math.PI * 2);
    cx.fill();
  }

  ring(px, py, r, k, color) {
    if (k < 0.03) return;
    const cx = this.cx;
    const a0 = -Math.PI / 2, a1 = a0 + k * Math.PI * 2;
    for (const [col, w] of [[C.edge, 0.17], [color, 0.1]]) {
      cx.strokeStyle = col;
      cx.lineWidth = Math.max(2, this.cs * w);
      cx.beginPath();
      cx.arc(px, py, r, a0, a1);
      cx.stroke();
    }
  }

  drawSnow() {
    const cx = this.cx;
    cx.fillStyle = 'rgba(255,255,255,0.32)';
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
    cx.strokeStyle = 'rgba(251,241,220,0.9)';
    cx.lineWidth = 2;
    cx.setLineDash([4, 3]);
    for (const c of g.cur.cells) {
      const [px, py] = this.center(c);
      cx.strokeRect(px - cs * 0.45, py - cs * 0.45, cs * 0.9, cs * 0.9);
    }
    cx.setLineDash([]);
  }

  // the dashed path and a paper finger that shows where to dig
  drawGhost(ghost, now) {
    const { cx, cs } = this;
    const pts = [ghost.from, ...ghost.cells].map((i) => this.center(i));
    cx.save();
    cx.setLineDash([cs * 0.25, cs * 0.22]);
    cx.lineDashOffset = -now / 40;
    for (const [col, w] of [[C.shadow, 0.2], [C.edge, 0.13]]) {
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
    this.disc(lerp(x1, x2, seg - k), lerp(y1, y2, seg - k), cs * 0.3, '#f3c27a', 3);
  }
}

export const HUD_TOP = TOP;
