// Grey prototype drawing: terrain in shades of grey with contour lines, water in blue,
// gardens and houses as simple shapes. On a landscape screen the valley is turned on its side
// (glacier on the left), the rules do not change.
import * as S from './sim.js';
import { clamp, lerp } from './util.js';

const TOP = 58;
const BOTTOM = 46;

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
    const cs = Math.floor(Math.min((w - 16) / cols, (h - TOP - BOTTOM) / rows));
    this.cs = Math.max(8, cs);
    this.ox = Math.round((w - cols * this.cs) / 2);
    this.oy = Math.round(TOP + (h - TOP - BOTTOM - rows * this.cs) / 2);
    this.g = g;
    this.terrain = this.paintTerrain(g);
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

  paintTerrain(g) {
    const { cs, dpr } = this;
    const c = document.createElement('canvas');
    const cols = this.rot ? g.H : g.W, rows = this.rot ? g.W : g.H;
    c.width = Math.ceil(cols * cs * dpr);
    c.height = Math.ceil(rows * cs * dpr);
    const x2 = c.getContext('2d');
    x2.scale(dpr, dpr);
    let lo = Infinity, hi = -Infinity;
    for (const v of g.h) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const at = (x, y) => g.h[clamp(y, 0, g.H - 1) * g.W + clamp(x, 0, g.W - 1)];
    for (let y = 0; y < g.H; y++) {
      for (let x = 0; x < g.W; x++) {
        const t = (at(x, y) - lo) / (hi - lo);
        // light from the upper left: slopes facing it are lighter
        const shade = clamp((at(x - 1, y) - at(x + 1, y) + at(x, y - 1) - at(x, y + 1)) * 0.05, -0.12, 0.12);
        const v = Math.round(clamp(lerp(88, 218, t) + shade * 255, 40, 240));
        x2.fillStyle = g.kind[y * g.W + x] === S.ICE ? '#eef3f6' : `rgb(${v},${v},${v - 4})`;
        const [px, py] = this.pos(x, y);
        x2.fillRect(px - this.ox, py - this.oy, cs + 0.5, cs + 0.5);
      }
    }
    // contour lines through the cell centres (marching squares), a bold one every 5th
    const step = 1.5;
    for (let L = Math.ceil(lo / step) * step; L < hi; L += step) {
      const bold = Math.round(L / step) % 5 === 0;
      x2.strokeStyle = bold ? 'rgba(20,24,30,0.32)' : 'rgba(20,24,30,0.16)';
      x2.lineWidth = bold ? 1.4 : 1;
      x2.beginPath();
      for (let y = 0; y < g.H - 1; y++) {
        for (let x = 0; x < g.W - 1; x++) {
          const v = [at(x, y), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1)];
          const P = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
          const pts = [];
          for (let e = 0; e < 4; e++) {
            const a = v[e], b = v[(e + 1) % 4];
            if ((a < L) !== (b < L)) {
              const t = (L - a) / (b - a);
              const ex = lerp(P[e][0], P[(e + 1) % 4][0], t), ey = lerp(P[e][1], P[(e + 1) % 4][1], t);
              pts.push(this.local(ex, ey));
            }
          }
          for (let k = 0; k + 1 < pts.length; k += 2) {
            x2.moveTo(pts[k][0], pts[k][1]);
            x2.lineTo(pts[k + 1][0], pts[k + 1][1]);
          }
        }
      }
      x2.stroke();
    }
    return c;
  }
  // fractional cell centre coordinates -> point inside the terrain bitmap
  local(x, y) {
    const sx = this.rot ? y : x;
    const sy = this.rot ? this.g.W - 1 - x : y;
    return [(sx + 0.5) * this.cs, (sy + 0.5) * this.cs];
  }

  draw(g, now, ui) {
    const { cx, cs, dpr } = this;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = '#2b2e33';
    cx.fillRect(0, 0, this.cv.width, this.cv.height);
    cx.drawImage(this.terrain, this.ox, this.oy, this.terrain.width / dpr, this.terrain.height / dpr);
    if (g.day >= S.WINTER) {
      cx.fillStyle = 'rgba(240,246,250,0.35)';
      cx.fillRect(this.ox, this.oy, this.terrain.width / dpr, this.terrain.height / dpr);
    }
    cx.lineCap = 'round';

    // beds: river dark, dug canals brown; joints get a dot so turns look round
    const edges = [];
    for (let a = 0; a < g.W * g.H; a++) for (const b of g.out[a]) edges.push([a, b]);
    for (const [a, b] of edges) {
      const river = g.kind[b] === S.RIVER && g.kind[a] === S.RIVER;
      cx.strokeStyle = river ? '#39434d' : '#6f5c48';
      cx.lineWidth = cs * (river ? 0.78 : 0.56);
      this.seg(a, b);
    }
    // water on top, wider when more flows
    for (const [a, b] of edges) {
      const q = g.flow[b] || 0;
      const river = g.kind[b] === S.RIVER;
      const k = river ? clamp(q / 8, 0, 1) : clamp(q / S.CANAL_CAP, 0, 1);
      if (q < 0.01 || g.gate[b]) continue;
      cx.strokeStyle = '#4aa3e8';
      cx.lineWidth = cs * (river ? 0.28 + 0.4 * k : 0.14 + 0.32 * k);
      this.seg(a, b);
    }
    // moving specks show which way it runs
    const t = now / 1000;
    cx.fillStyle = 'rgba(235,248,255,0.9)';
    for (const [a, b] of edges) {
      const q = g.flow[b] || 0;
      if (q < 0.01 || g.gate[b]) continue;
      const [x1, y1] = this.center(a), [x2, y2] = this.center(b);
      const f = (t * (0.9 + Math.min(q, 4) * 0.25) + ((a * 0.37) % 1)) % 1;
      cx.beginPath();
      cx.arc(lerp(x1, x2, f), lerp(y1, y2, f), Math.max(1.2, cs * 0.07), 0, Math.PI * 2);
      cx.fill();
    }
    // closed gates: a red bar across the canal, inside the gated cell so a tap on it hits that cell
    for (let i = 0; i < g.W * g.H; i++) {
      if (!g.gate[i]) continue;
      const [x1, y1] = this.center(g.from[i]), [x2, y2] = this.center(i);
      const mx = lerp(x1, x2, 0.7), my = lerp(y1, y2, 0.7), nx = -(y2 - y1) / cs, ny = (x2 - x1) / cs;
      cx.strokeStyle = '#e0493e';
      cx.lineWidth = cs * 0.18;
      cx.beginPath();
      cx.moveTo(mx - nx * cs * 0.38, my - ny * cs * 0.38);
      cx.lineTo(mx + nx * cs * 0.38, my + ny * cs * 0.38);
      cx.stroke();
    }
    // spilt water: a puddle
    for (let i = 0; i < g.W * g.H; i++) {
      const s = g.spill[i];
      if (s < 0.02) continue;
      const [px, py] = this.center(i);
      cx.fillStyle = 'rgba(74,163,232,0.35)';
      cx.beginPath();
      cx.arc(px, py, cs * (0.45 + 0.5 * clamp(s, 0, 1)), 0, Math.PI * 2);
      cx.fill();
    }

    this.drawObjects(g, now);
    this.drawStroke(g, ui);
    if (ui.ghost) this.drawGhost(ui.ghost, now);
    if (ui.blocked && now - ui.blocked.at < 700) {
      const [px, py] = this.center(ui.blocked.cell);
      const r = cs * 0.32;
      cx.strokeStyle = '#ff5a4e';
      cx.lineWidth = Math.max(2, cs * 0.12);
      cx.beginPath();
      cx.moveTo(px - r, py - r); cx.lineTo(px + r, py + r);
      cx.moveTo(px + r, py - r); cx.lineTo(px - r, py + r);
      cx.stroke();
    }
    if (g.over) {
      const i = g.over.y * g.W + g.over.x;
      const [px, py] = this.center(i);
      cx.strokeStyle = '#ff5a4e';
      cx.lineWidth = 3;
      cx.beginPath();
      cx.arc(px, py, cs * (0.8 + 0.15 * Math.sin(now / 150)), 0, Math.PI * 2);
      cx.stroke();
    }
  }

  seg(a, b) {
    const [x1, y1] = this.center(a), [x2, y2] = this.center(b);
    this.cx.beginPath();
    this.cx.moveTo(x1, y1);
    this.cx.lineTo(x2, y2);
    this.cx.stroke();
  }

  drawObjects(g, now) {
    const { cx, cs } = this;
    for (const o of g.objects) {
      const [px, py] = this.center(o.y * g.W + o.x);
      const age = (g.day + (g.year - 1) * S.YEAR_DAYS - o.born) * S.DAY_SEC;
      const pop = age < 0.4 ? 0.4 + 1.5 * age : 1;
      const r = cs * 0.42 * pop;
      if (o.thirst > 0.7 && g.day < S.WINTER) {
        cx.fillStyle = `rgba(255,90,78,${0.25 + 0.2 * Math.sin(now / 120)})`;
        cx.beginPath();
        cx.arc(px, py, r * 1.7, 0, Math.PI * 2);
        cx.fill();
      }
      if (o.type === 'garden') {
        const k = clamp(o.thirst, 0, 1);
        const col = (a, b) => Math.round(lerp(a, b, k));
        cx.fillStyle = `rgb(${col(86, 150)},${col(170, 112)},${col(70, 58)})`;
        cx.beginPath();
        cx.arc(px, py, r, 0, Math.PI * 2);
        cx.fill();
        cx.fillStyle = 'rgba(0,0,0,0.18)';
        for (let n = 0; n < 3; n++) {
          const an = n * 2.1 + 0.5;
          cx.beginPath();
          cx.arc(px + Math.cos(an) * r * 0.42, py + Math.sin(an) * r * 0.42, r * 0.28, 0, Math.PI * 2);
          cx.fill();
        }
      } else {
        const s = r * 1.5;
        cx.fillStyle = '#f1ede4';
        cx.strokeStyle = '#3a3a3a';
        cx.lineWidth = 1.2;
        cx.beginPath();
        cx.rect(px - s / 2, py - s * 0.25, s, s * 0.7);
        cx.moveTo(px - s * 0.62, py - s * 0.22);
        cx.lineTo(px, py - s * 0.68);
        cx.lineTo(px + s * 0.62, py - s * 0.22);
        cx.closePath();
        cx.fill();
        cx.stroke();
      }
      // not enough water: a drop bobs above it
      if (o.s < 0.6 && g.day < S.WINTER) this.drop(px, py - r * 1.9 + Math.sin(now / 220) * cs * 0.08, cs * 0.36);
      // thirst ring red, flood ring blue
      this.ring(px, py, r + 3, o.thirst, '#e0493e');
      if (o.type === 'house') this.ring(px, py, r + 7, o.flood, '#3d8fe0');
    }
  }

  drop(px, py, s) {
    const cx = this.cx;
    cx.fillStyle = '#4aa3e8';
    cx.strokeStyle = 'rgba(255,255,255,0.9)';
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(px, py - s * 1.5);
    cx.quadraticCurveTo(px + s * 1.05, py - s * 0.2, px + s * 0.75, py + s * 0.35);
    cx.arc(px, py + s * 0.25, s * 0.78, 0.15, Math.PI - 0.15);
    cx.quadraticCurveTo(px - s * 1.05, py - s * 0.2, px, py - s * 1.5);
    cx.fill();
    cx.stroke();
  }

  ring(px, py, r, k, color) {
    if (k < 0.03) return;
    const cx = this.cx;
    cx.strokeStyle = color;
    cx.lineWidth = Math.max(2, this.cs * 0.1);
    cx.beginPath();
    cx.arc(px, py, r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    cx.stroke();
  }

  drawStroke(g, ui) {
    if (!g.cur) return;
    const { cx, cs } = this;
    cx.strokeStyle = 'rgba(255,255,255,0.85)';
    cx.lineWidth = 2;
    for (const c of g.cur.cells) {
      const [px, py] = this.center(c);
      cx.strokeRect(px - cs * 0.45, py - cs * 0.45, cs * 0.9, cs * 0.9);
    }
  }

  // the first time: a dashed path and a finger that shows where to dig
  drawGhost(ghost, now) {
    const { cx, cs } = this;
    const pts = [ghost.from, ...ghost.cells].map((i) => this.center(i));
    cx.save();
    cx.setLineDash([cs * 0.25, cs * 0.25]);
    cx.lineDashOffset = -now / 40;
    cx.strokeStyle = 'rgba(255,255,255,0.9)';
    cx.lineWidth = Math.max(2, cs * 0.12);
    cx.beginPath();
    pts.forEach(([x, y], k) => (k ? cx.lineTo(x, y) : cx.moveTo(x, y)));
    cx.stroke();
    cx.restore();
    const T = 1600 + pts.length * 260;
    const f = clamp(((now % T) - 500) / (T - 1100), 0, 1);
    const seg = f * (pts.length - 1);
    const k = Math.min(Math.floor(seg), pts.length - 2);
    const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
    const fx = lerp(x1, x2, seg - k), fy = lerp(y1, y2, seg - k);
    cx.fillStyle = 'rgba(255,255,255,0.95)';
    cx.strokeStyle = 'rgba(0,0,0,0.35)';
    cx.lineWidth = 2;
    cx.beginPath();
    cx.arc(fx, fy, cs * 0.38, 0, Math.PI * 2);
    cx.fill();
    cx.stroke();
  }
}

export const HUD_TOP = TOP;
