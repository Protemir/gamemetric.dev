// The steppe as a living picture, all drawn in code (no image files yet):
// relief-shaded grass tinted by who trusts the khan, a river that glitters, dusty roads between auls,
// yurts with smoke, herds that graze, cloud shadows drifting over, riders on galloping horses
// with banners and dust, golden sparks where the khan's word travels, violet smoke where a lie eats trust.
import { GW, GH, K } from './map.js';
import { riderPos } from './sim.js';
import { clamp, rng, valueNoise } from './util.js';

export const TRIBE_RGB = [[56, 104, 210], [84, 150, 70], [200, 96, 56]];
export const GOLD = [242, 178, 44];
const LIE = [70, 36, 86];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// the tamgas: the Orda's shanyrak, Kokzhal's wolf fangs, Kyran's eagle wings, Arkar's ram horns
// k = -1 for the Orda, 0..2 for the clans; drawn in strokes centred at (x, y), s = half the size
export function tamga(ctx, k, x, y, s, color = '#fff4d8') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.22);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (k < 0) {
    ctx.arc(x, y, s * 0.8, 0, Math.PI * 2);
    ctx.moveTo(x - s * 0.8, y); ctx.quadraticCurveTo(x, y - s * 0.45, x + s * 0.8, y);
    ctx.moveTo(x - s * 0.8, y); ctx.quadraticCurveTo(x, y + s * 0.45, x + s * 0.8, y);
    ctx.moveTo(x, y - s * 0.8); ctx.quadraticCurveTo(x - s * 0.45, y, x, y + s * 0.8);
    ctx.moveTo(x, y - s * 0.8); ctx.quadraticCurveTo(x + s * 0.45, y, x, y + s * 0.8);
  } else if (k === 0) {
    ctx.moveTo(x - s * 0.9, y - s * 0.55); ctx.lineTo(x - s * 0.45, y + s * 0.7); ctx.lineTo(x, y - s * 0.3); ctx.lineTo(x + s * 0.45, y + s * 0.7); ctx.lineTo(x + s * 0.9, y - s * 0.55);
  } else if (k === 1) {
    ctx.moveTo(x - s * 0.95, y - s * 0.35); ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.05, x, y + s * 0.35); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.05, x + s * 0.95, y - s * 0.35);
    ctx.moveTo(x, y + s * 0.35); ctx.lineTo(x, y - s * 0.65);
    ctx.moveTo(x + s * 0.12, y - s * 0.8); ctx.arc(x, y - s * 0.8, s * 0.12, 0, Math.PI * 2);
  } else {
    ctx.moveTo(x, y + s * 0.8); ctx.lineTo(x, y - s * 0.1);
    ctx.moveTo(x, y - s * 0.1); ctx.bezierCurveTo(x - s * 0.2, y - s * 0.9, x - s * 1.0, y - s * 0.6, x - s * 0.75, y - s * 0.05); ctx.quadraticCurveTo(x - s * 0.55, y + s * 0.25, x - s * 0.35, y);
    ctx.moveTo(x, y - s * 0.1); ctx.bezierCurveTo(x + s * 0.2, y - s * 0.9, x + s * 1.0, y - s * 0.6, x + s * 0.75, y - s * 0.05); ctx.quadraticCurveTo(x + s * 0.55, y + s * 0.25, x + s * 0.35, y);
  }
  ctx.stroke();
  ctx.restore();
}

export const PALETTES = {
  summer: { base: [196, 178, 112], slope: [20, 34, 30], wet: [118, 150, 82], hill: [150, 128, 104] },
  autumn: { base: [214, 168, 88], slope: [16, 30, 24], wet: [168, 150, 70], hill: [156, 118, 82] },
  winter: { base: [232, 236, 242], slope: [10, 8, 4], wet: [196, 210, 222], hill: [206, 210, 218] },
};

export class View {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.off = document.createElement('canvas');
    this.off.width = GW;
    this.off.height = GH;
    this.octx = this.off.getContext('2d');
    this.img = this.octx.createImageData(GW, GH);
    this.fx = [];
    this.parts = [];
    this.hover = -1;
    this.top = 64;
    this.bottom = 92;
    this.map = null;
    this.lastNow = 0;
    this.frameNo = 0;
    this.tintMix = 0.62;
    this.style = 'summer';
    this.flash = new Map(); // pasture -> when the word landed there: it lights up and fades
  }

  // a new look of the land: the next frame paints it again
  setStyle(key) {
    if (!PALETTES[key] || key === this.style) return;
    this.style = key;
    this.map = null;
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    // the map fills what the bars leave, keeping its shape; on a phone held upright it lies turned
    // a quarter round (north to the right), so it still fills the screen
    const availW = w - 16, availH = h - this.top - this.bottom;
    this.rot = availH > availW * 1.15;
    const mw = this.rot ? GH : GW, mh = this.rot ? GW : GH;
    const s = Math.min(availW / mw, availH / mh);
    this.s = s;
    this.u = s * K * 1.6; // the unit all sprites are sized in
    this.ox = (w - mw * s) / 2;
    this.oy = this.top + (availH - mh * s) / 2;
  }

  toScreen(x, y) {
    if (this.rot) return [this.ox + (GH - y) * this.s, this.oy + x * this.s];
    return [this.ox + x * this.s, this.oy + y * this.s];
  }

  regionAt(g, px, py) {
    let x = (px - this.ox) / this.s, y = (py - this.oy) / this.s;
    if (this.rot) [x, y] = [y, GH - x];
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= GW || y >= GH) return -1;
    return g.map.cell[y * GW + x];
  }

  riderAt(g, px, py, kinds = null, radius = null) {
    let best = null, bd = (radius ?? Math.max(28, this.u * 4)) ** 2;
    for (const r of g.riders) {
      if (kinds && !kinds.includes(r.kind)) continue;
      const p = riderPos(g, r);
      const [sx, sy] = this.toScreen(p.x, p.y);
      const d = (sx - px) ** 2 + (sy - py - this.u) ** 2;
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }

  // —— things that never change on one map: the ground, where yurts and herds stand, the roads ——
  prepare(g) {
    const map = g.map;
    this.map = map;
    this.parts = [];
    const { elev, river, cell, regions } = map;
    const n = GW * GH;
    const rand = rng(g.seed * 31 + 7);
    const grain = valueNoise(rand, GW, GH, 3 * K), patch = valueNoise(rand, GW, GH, 12 * K);
    // distance to the river, for the green banks
    const near = new Float32Array(n).fill(99);
    for (let i = 0; i < n; i++) if (river[i]) near[i] = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        if (x > 0) near[i] = Math.min(near[i], near[i - 1] + 1);
        if (y > 0) near[i] = Math.min(near[i], near[i - GW] + 1);
      }
      for (let y = GH - 1; y >= 0; y--) for (let x = GW - 1; x >= 0; x--) {
        const i = y * GW + x;
        if (x < GW - 1) near[i] = Math.min(near[i], near[i + 1] + 1);
        if (y < GH - 1) near[i] = Math.min(near[i], near[i + GW] + 1);
      }
    }
    const ter = new Float32Array(n * 3);
    const lum = new Float32Array(n);
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        const e = elev[i];
        // light from the north-west
        const dx = elev[y * GW + Math.min(GW - 1, x + 1)] - elev[y * GW + Math.max(0, x - 1)];
        const dy = elev[Math.min(GH - 1, y + 1) * GW + x] - elev[Math.max(0, y - 1) * GW + x];
        const shade = clamp(1 - (dx + dy) * 7 * K, 0.88, 1.12);
        // dry ochre steppe, greener in hollows, brown hills in the north, green banks by the river
        // the season of the land: Zhetysu in summer, golden Saryarka in autumn, snow in winter
        const P = PALETTES[this.style] || PALETTES.summer;
        let c = [P.base[0] - e * P.slope[0] + patch[i] * 14, P.base[1] - e * P.slope[1] + patch[i] * 10, P.base[2] - e * P.slope[2]];
        const wet = clamp(1 - near[i] / (5 * K), 0, 1);
        c = c.map((v, j) => v + (P.wet[j] - v) * wet * 0.7);
        const hill = clamp((e - 0.62) * 2.5, 0, 1);
        c = c.map((v, j) => v + (P.hill[j] - v) * hill);
        const gr = 1 + grain[i] * 0.07 + ((((i * 2654435761) >>> 0) % 100) - 50) / 2200;
        for (let k = 0; k < 3; k++) ter[i * 3 + k] = c[k] * shade * gr;
        lum[i] = ((c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15) / 170) * shade * gr;
      }
    }
    this.ter = ter;
    this.lum = lum;

    // yurts round each aul, away from the water; herds a little further out
    this.deco = [];
    for (const r of regions) {
      const count = r.id === 0 ? 5 : map.capitals.includes(r.id) ? 4 : 2 + Math.floor(rand() * 2);
      const yurts = [];
      for (let k = 0, tries = 0; k < count && tries < 60; tries++) {
        const a = rand() * Math.PI * 2, d = (k === 0 ? 0 : 3.4 + rand() * 3) * K;
        const x = r.x + Math.cos(a) * d * 1.3, y = r.y + Math.sin(a) * d;
        const xi = Math.round(x), yi = Math.round(y);
        if (xi < 0 || yi < 0 || xi >= GW || yi >= GH || near[yi * GW + xi] < 1.5 * K || cell[yi * GW + xi] !== r.id) continue;
        if (yurts.some((u) => Math.hypot(u.x - x, u.y - y) < 3.6 * K)) continue;
        yurts.push({ x, y, big: k === 0 && r.id === 0, cap: k === 0 && map.capitals.includes(r.id), smoke: rand() * 10 });
        k++;
      }
      yurts.sort((a, b) => a.y - b.y);
      const herd = [];
      const ha = rand() * Math.PI * 2;
      const hx = r.x + Math.cos(ha) * 9 * K, hy = r.y + Math.sin(ha) * 6 * K;
      const hi = Math.round(hy) * GW + Math.round(hx);
      if (hx > 2 && hy > 2 && hx < GW - 2 && hy < GH - 2 && cell[hi] === r.id && !river[hi]) {
        const sheep = rand() < 0.6;
        for (let k = 0; k < (sheep ? 7 : 4); k++) herd.push({ x: hx + (rand() - 0.5) * 6 * K, y: hy + (rand() - 0.5) * 3.5 * K, ph: rand() * 6.28, sheep });
      }
      this.deco[r.id] = { yurts, herd };
    }
    // trees along the banks
    this.trees = [];
    for (let k = 0; k < 900 && this.trees.length < 90; k++) {
      const i = Math.floor(rand() * n);
      if (near[i] > 1.2 * K && near[i] < 3.5 * K) this.trees.push({ x: i % GW, y: (i / GW) | 0, r: 0.8 + rand() * 0.6 });
    }
    this.trees.sort((a, b) => a.y - b.y);
    // roads bend a little, each its own way
    this.roads = [];
    for (const r of regions) {
      for (const e of r.nb) {
        if (e.to < r.id) continue;
        const b = regions[e.to];
        const mx = (r.x + b.x) / 2, my = (r.y + b.y) / 2;
        const len = Math.hypot(b.x - r.x, b.y - r.y);
        const off = (rand() - 0.5) * len * 0.25;
        this.roads.push({ a: r.id, b: e.to, cx: mx - ((b.y - r.y) / len) * off, cy: my + ((b.x - r.x) / len) * off, ford: e.ford });
      }
    }
    this.clouds = Array.from({ length: 4 }, () => ({ x: rand() * GW, y: rand() * GH, r: (18 + rand() * 16) * K, v: (0.6 + rand() * 0.6) * K }));
  }

  // —— the ground tinted every other frame by trust, talk and lies ——
  paintMap(g) {
    const { cell, river, border, regions } = g.map;
    const d = this.img.data, ter = this.ter, lum = this.lum;
    const tint = regions.map((r) => {
      if (r.tribe < 0) return GOLD;
      const base = TRIBE_RGB[r.tribe];
      // gold creeps in with trust and takes over once the aul is the khan's
      const t = g.t[r.id];
      const k = t < 0.55 ? Math.pow(t / 0.55, 3) * 0.3 : 0.72 + (t - 0.55) * 0.62;
      let c = [base[0] + (GOLD[0] - base[0]) * k, base[1] + (GOLD[1] - base[1]) * k, base[2] + (GOLD[2] - base[2]) * k];
      // a clan in drought: its land goes brown
      if (g.drought && g.drought.tribe === r.tribe && g.clock < g.drought.until) c = c.map((v, j) => v + ([150, 112, 62][j] - v) * 0.45);
      const lie = clamp(g.n[r.id] * 0.3, 0, 0.5);
      if (lie) c = c.map((v, j) => v + (LIE[j] - v) * lie);
      return c;
    });
    const now = this.lastNow || 0;
    const glow = regions.map((r) => {
      const f = this.flash.get(r.id);
      const flash = f ? Math.max(0, 1 - (now - f) / 1100) * 0.6 : 0;
      return Math.max(flash, clamp(g.m[r.id] * 0.1, 0, 0.18));
    });
    for (let i = 0; i < GW * GH; i++) {
      const o = i * 4, t3 = i * 3;
      if (river[i]) {
        d[o] = 64; d[o + 1] = 118; d[o + 2] = 150; d[o + 3] = 255;
        continue;
      }
      const id = cell[i], c = tint[id];
      const L = lum[i] * 1.12;
      const a = this.tintMix;
      let R = ter[t3] + (c[0] * L - ter[t3]) * a;
      let G = ter[t3 + 1] + (c[1] * L - ter[t3 + 1]) * a;
      let B = ter[t3 + 2] + (c[2] * L - ter[t3 + 2]) * a;
      const burnt = g.burn && g.burn[id] != null ? Math.max(0, 1 - (g.time - g.burn[id]) / 40) * 0.28 : 0;
      if (burnt) { R += (40 - R) * burnt; G += (30 - G) * burnt; B += (22 - B) * burnt; }
      const gl = glow[id];
      if (gl) { R += (255 - R) * gl; G += (236 - G) * gl; B += (180 - B) * gl; }
      const b = border[i];
      if (id === this.hover && id > 0) {
        R += (255 - R) * 0.16; G += (245 - G) * 0.16; B += (215 - B) * 0.16;
        if (b) { R = 255; G = 236; B = 170; d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = 255; continue; }
      }
      if (b === 2) {
        const tc = regions[id].tribe >= 0 ? TRIBE_RGB[regions[id].tribe] : GOLD;
        R = tc[0] * 0.55; G = tc[1] * 0.55; B = tc[2] * 0.55;
      } else if (b) { R *= 0.86; G *= 0.86; B *= 0.86; }
      d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = 255;
    }
    this.octx.putImageData(this.img, 0, 0);
  }

  draw(g, now, look) {
    const { ctx } = this;
    const dt = Math.min(0.05, (now - (this.lastNow || now)) / 1000);
    this.lastNow = now;
    this.frameNo++;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#17120d';
    ctx.fillRect(0, 0, this.w, this.h);
    if (!g) return;
    if (this.map !== g.map) { this.prepare(g); this.painted = false; }
    if (this.frameNo % 2 === 0 || !this.painted) { this.paintMap(g); this.painted = true; }
    const s = this.s;
    ctx.save();
    const [x0, y0] = this.toScreen(0, 0), [x1, y1] = this.toScreen(GW, GH);
    ctx.beginPath();
    ctx.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (this.rot) {
      ctx.save();
      ctx.translate(this.ox + GH * s, this.oy);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(this.off, 0, 0, GW * s, GH * s);
      ctx.restore();
    } else ctx.drawImage(this.off, this.ox, this.oy, GW * s, GH * s);

    this.drawRiver(g, now);
    this.drawRoads(g);
    this.drawTrees();
    this.drawParts(g, dt, 'under');
    this.drawAuls(g, now, look);
    this.drawMarks(g, now);
    this.drawRiders(g, now, dt, look);
    this.drawParts(g, dt, 'over');
    this.drawSeen(g, now);
    this.drawClouds(dt);
    this.drawDrama(g, now, dt);
    this.drawHoverTag(g, look);
    this.drawHand(g, now, look);
    this.drawFx(g, now);
    // a soft dark edge, like an old painted map
    const [cx, cy] = this.toScreen(GW / 2, GH / 2);
    const rad = Math.hypot(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2;
    const vg = ctx.createRadialGradient(cx, cy, rad * 0.55, cx, cy, rad * 1.05);
    vg.addColorStop(0, 'rgba(20,12,4,0)');
    vg.addColorStop(1, 'rgba(20,12,4,0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.restore();
  }

  path(points) {
    const { ctx } = this;
    ctx.beginPath();
    points.forEach(([x, y], k) => (k ? ctx.lineTo(...this.toScreen(x, y)) : ctx.moveTo(...this.toScreen(x, y))));
  }

  drawRiver(g, now) {
    const { ctx, u } = this;
    const line = g.map.riverLine;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.path(line);
    ctx.strokeStyle = 'rgba(40,72,60,0.55)';
    ctx.lineWidth = u * 2.2;
    ctx.stroke();
    this.path(line);
    ctx.strokeStyle = '#3f7fa8';
    ctx.lineWidth = u * 1.6;
    ctx.stroke();
    this.path(line);
    ctx.strokeStyle = 'rgba(190,230,245,0.55)';
    ctx.lineWidth = Math.max(1, u * 0.45);
    ctx.setLineDash([u * 1.2, u * 3.5]);
    ctx.lineDashOffset = -now / 60;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawRoads(g) {
    const { ctx, u } = this;
    const R = g.map.regions;
    for (const rd of this.roads) {
      if (rd.a !== this.hover && rd.b !== this.hover && !rd.ford) continue;
      const a = R[rd.a], b = R[rd.b];
      const [ax, ay] = this.toScreen(a.x, a.y), [bx, by] = this.toScreen(b.x, b.y), [cx, cy] = this.toScreen(rd.cx, rd.cy);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(cx, cy, bx, by);
      ctx.strokeStyle = 'rgba(92,70,40,0.22)';
      ctx.lineWidth = Math.max(2, u * 0.5);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(236,220,180,0.4)';
      ctx.lineWidth = Math.max(1, u * 0.18);
      ctx.setLineDash([u * 0.6, u * 0.5]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (rd.ford) {
        // stepping stones where the road fords the river
        const fx = 0.25 * ax + 0.5 * cx + 0.25 * bx, fy = 0.25 * ay + 0.5 * cy + 0.25 * by;
        ctx.fillStyle = 'rgba(220,210,190,0.85)';
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(fx + k * u * 0.6, fy + k * u * 0.4, u * 0.3, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  }

  drawTrees() {
    const { ctx, u } = this;
    for (const t of this.trees) {
      const [x, y] = this.toScreen(t.x, t.y);
      const r = u * 0.75 * t.r;
      ctx.fillStyle = 'rgba(30,40,20,0.3)';
      ctx.beginPath(); ctx.ellipse(x + r * 0.4, y + r * 0.5, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4c6a32';
      ctx.beginPath(); ctx.arc(x, y - r * 0.3, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(160,190,90,0.45)';
      ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.6, r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
  }

  yurt(x, y, r, dome, now, smoke) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(40,25,10,0.3)';
    ctx.beginPath(); ctx.ellipse(x + r * 0.35, y + r * 0.15, r * 1.15, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    // the felt wall and the dome
    ctx.fillStyle = '#f3e9d4';
    ctx.strokeStyle = '#6b5236';
    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x - r, y - r * 0.7);
    ctx.quadraticCurveTo(x, y - r * 1.9, x + r, y - r * 0.7);
    ctx.lineTo(x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.7);
    ctx.quadraticCurveTo(x, y - r * 1.9, x + r, y - r * 0.7);
    ctx.quadraticCurveTo(x, y - r * 1.05, x - r, y - r * 0.7);
    ctx.fill();
    ctx.fillStyle = '#7a3b22';
    ctx.fillRect(x - r * 0.22, y - r * 0.55, r * 0.44, r * 0.55);
    // smoke from the shanyrak
    const sm = ((now / 1000 + smoke) % 3) / 3;
    ctx.fillStyle = `rgba(235,230,220,${0.35 * (1 - sm)})`;
    ctx.beginPath(); ctx.arc(x + sm * r * 0.8, y - r * 1.45 - sm * r * 2.2, r * (0.25 + sm * 0.45), 0, Math.PI * 2); ctx.fill();
  }

  drawAuls(g, now, look) {
    const { ctx, u } = this;
    const R = g.map.regions;
    // herds first (they stand behind the yurts)
    for (const r of R) {
      for (const h of this.deco[r.id].herd) {
        const wob = Math.sin(now / 1800 + h.ph);
        const [x, y] = this.toScreen(h.x + wob * 0.5 * K, h.y + Math.cos(now / 2300 + h.ph) * 0.3 * K);
        ctx.fillStyle = h.sheep ? '#f4efe4' : '#6a4426';
        ctx.beginPath(); ctx.ellipse(x, y, u * (h.sheep ? 0.35 : 0.45), u * (h.sheep ? 0.25 : 0.22), 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = h.sheep ? '#3a2a1a' : '#4a2c16';
        ctx.beginPath(); ctx.arc(x + u * (wob > 0 ? 0.35 : -0.35), y - u * 0.08, u * 0.12, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const r of R) {
      const dome = r.tribe < 0 ? '#e2b04a' : `rgb(${TRIBE_RGB[r.tribe].map((v) => (v * 0.8 + 30) | 0).join(',')})`;
      const [x, y] = this.toScreen(r.x, r.y);
      // the khan's word has won this aul: a golden ring on the ground
      if (r.tribe >= 0 && g.t[r.id] >= 0.55) {
        ctx.strokeStyle = 'rgba(255,220,120,0.9)';
        ctx.lineWidth = Math.max(2, u * 0.35);
        ctx.beginPath(); ctx.ellipse(x, y + u * 0.2, u * 2.6, u * 1.2, 0, 0, Math.PI * 2); ctx.stroke();
      }
      for (const yt of this.deco[r.id].yurts) {
        const [sx, sy] = this.toScreen(yt.x, yt.y);
        this.yurt(sx, sy, u * (yt.big ? 1.8 : yt.cap ? 1.35 : 0.95), yt.big ? '#d9a53a' : dome, now, yt.smoke);
      }
      const cap = g.map.capitals.includes(r.id);
      if (r.id === 0 || cap) this.banner(x + u * (r.id === 0 ? 2.4 : 1.6), y, r.id === 0 ? GOLD : TRIBE_RGB[r.tribe], r.id === 0 ? -1 : r.tribe, now, r.id === 0 ? 1.3 : 1);
      if (cap && look.names) this.label(look.names[r.tribe], x, y + u * 1.4, Math.max(12, u * 1.7));
      if (look.numbers && r.tribe >= 0) this.label(String(Math.round(g.t[r.id] * 100)), x, y + u * 3.4, Math.max(10, u * 1.3));
    }
  }

  label(text, x, y, size) {
    const { ctx } = this;
    ctx.font = `800 ${Math.round(size)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(30,20,10,0.75)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = '#fff6df';
    ctx.fillText(text, x, y);
  }

  banner(x, y, color, sign, now, k = 1) {
    const { ctx, u } = this;
    const h = u * 4 * k, w = u * 2.4 * k;
    ctx.strokeStyle = '#4a3420';
    ctx.lineWidth = Math.max(1.5, u * 0.3);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
    ctx.fillStyle = css(color);
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      ctx.lineTo(x + t * w, y - h + Math.sin(now / 260 - t * 4) * u * 0.35 * t);
    }
    for (let i = 8; i >= 0; i--) {
      const t = i / 8;
      ctx.lineTo(x + t * w, y - h + w * 0.7 + Math.sin(now / 260 - t * 4) * u * 0.35 * t);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,25,10,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff4d8';
    ctx.font = `800 ${Math.round(w * 0.5)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    tamga(ctx, sign, x + w * 0.45, y - h + w * 0.36, w * 0.26);
  }

  // where an aul's lie badge sits
  markAt(r) {
    const [x, y] = this.toScreen(r.x, r.y);
    return [x - this.u * 2.4, y - this.u * 2.2, clamp(this.u * 0.85, 7, 13)];
  }

  drawMarks(g, now) {
    const { ctx, u } = this;
    const R = g.map.regions;
    // a lie's trail is a small drawn badge: a cross while it is open, a tick once Aria has read it
    for (const i of g.marks) {
      const [px, py, s] = this.markAt(R[i]);
      const ok = g.found.has(i);
      ctx.beginPath();
      ctx.arc(px, py, s, 0, Math.PI * 2);
      ctx.fillStyle = ok ? '#3d6b2a' : '#5b2475';
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, s * 0.18);
      ctx.strokeStyle = ok ? '#cfffb0' : '#f1dcff';
      ctx.stroke();
      ctx.beginPath();
      const k = s * 0.42;
      if (ok) { ctx.moveTo(px - k, py); ctx.lineTo(px - k * 0.2, py + k * 0.8); ctx.lineTo(px + k, py - k * 0.7); } else { ctx.moveTo(px - k, py - k); ctx.lineTo(px + k, py + k); ctx.moveTo(px + k, py - k); ctx.lineTo(px - k, py + k); }
      ctx.lineWidth = Math.max(2, s * 0.26);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    if (g.lairKnown) {
      const r = R[g.lairShown ?? g.lair];
      const [x, y] = this.toScreen(r.x, r.y);
      const p = 1 + Math.sin(now / 300) * 0.1;
      ctx.strokeStyle = '#d0304a';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.arc(x, y, u * 4.4 * p, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `${Math.round(u * 2)}px system-ui, sans-serif`;
      ctx.fillStyle = '#ff6a5a';
      ctx.fillText('◉', x + u * 3.6, y - u * 3.4);
    }
    // Zaltyr on watch: an amber ring round his pasture, closing as his time runs out
    if (g.zaltyr && g.zaltyr.busy > 0) {
      const r = R[g.zaltyr.at];
      const [x, y] = this.toScreen(r.x, r.y);
      ctx.strokeStyle = 'rgba(255,170,60,0.95)';
      ctx.lineWidth = 3;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.arc(x, y, u * 7, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, u * 3.6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.zaltyr.busy) / 30); ctx.stroke();
    }
    if (g.aria.at >= 0 && g.aria.busy > 0) {
      const r = R[g.aria.at];
      const [x, y] = this.toScreen(r.x, r.y);
      // Aria's lantern: a violet light, its ring closes as she finishes
      const gr = ctx.createRadialGradient(x, y, 0, x, y, u * 5);
      gr.addColorStop(0, 'rgba(190,150,255,0.45)');
      gr.addColorStop(1, 'rgba(190,150,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, y, u * 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b48cff';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, u * 3.6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.aria.busy) / 12); ctx.stroke();
    }
  }

  // a horse at full gallop seen from the side, a rider, a banner on a pole
  horse(x, y, face, now, coat, cloth, flag, big) {
    const { ctx } = this;
    const u = this.u * (big ? 1.25 : 1);
    const ph = now / 90;
    const bob = Math.sin(ph * 2) * u * 0.18;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(face, 1);
    ctx.fillStyle = 'rgba(30,20,10,0.3)';
    ctx.beginPath(); ctx.ellipse(0, u * 1.25 - bob, u * 1.5, u * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = coat;
    ctx.lineCap = 'round';
    ctx.lineWidth = u * 0.32;
    // legs swing in pairs
    const l1 = Math.sin(ph) * 0.6, l2 = Math.sin(ph + Math.PI) * 0.6;
    for (const [lx, a] of [[0.8, l1], [0.55, l2], [-0.7, l2], [-0.95, l1]]) {
      ctx.beginPath(); ctx.moveTo(u * lx, u * 0.15); ctx.lineTo(u * (lx + a * 0.6), u * 1.1); ctx.stroke();
    }
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.ellipse(0, 0, u * 1.25, u * 0.55, -0.05, 0, Math.PI * 2); ctx.fill();
    // neck and head
    ctx.beginPath();
    ctx.moveTo(u * 0.8, -u * 0.2);
    ctx.lineTo(u * 1.45, -u * 1.05);
    ctx.lineTo(u * 2.05, -u * 0.75);
    ctx.lineTo(u * 1.95, -u * 0.5);
    ctx.lineTo(u * 1.25, -u * 0.05);
    ctx.closePath();
    ctx.fill();
    // the tail streams back
    ctx.lineWidth = u * 0.25;
    ctx.beginPath(); ctx.moveTo(-u * 1.15, -u * 0.25); ctx.quadraticCurveTo(-u * 1.8, -u * 0.4 + Math.sin(ph) * u * 0.2, -u * 2.1, u * 0.1); ctx.stroke();
    // the rider
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.moveTo(-u * 0.35, -u * 0.35);
    ctx.lineTo(u * 0.4, -u * 0.35);
    ctx.lineTo(u * 0.25, -u * 1.45);
    ctx.lineTo(-u * 0.15, -u * 1.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e7c09a';
    ctx.beginPath(); ctx.arc(u * 0.1, -u * 1.75, u * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2416';
    ctx.beginPath(); ctx.ellipse(u * 0.08, -u * 1.95, u * 0.38, u * 0.18, 0, Math.PI, 0); ctx.fill();
    if (flag) {
      ctx.strokeStyle = '#3a2614';
      ctx.lineWidth = Math.max(1, u * 0.12);
      ctx.beginPath(); ctx.moveTo(-u * 0.3, -u * 0.6); ctx.lineTo(-u * 0.55, -u * 3.1); ctx.stroke();
      ctx.fillStyle = flag;
      ctx.beginPath();
      ctx.moveTo(-u * 0.55, -u * 3.1);
      ctx.quadraticCurveTo(-u * 1.3, -u * 3.0 + Math.sin(ph * 1.3) * u * 0.25, -u * 2.0, -u * 2.75);
      ctx.lineTo(-u * 0.5, -u * 2.35);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawRiders(g, now, dt, look) {
    const { ctx, u } = this;
    const R = g.map.regions;
    const list = g.riders.map((r) => {
      const p = riderPos(g, r);
      const [x, y] = this.toScreen(p.x, p.y);
      const [x2] = this.toScreen(p.x + p.dx * 0.01, p.y + p.dy * 0.01);
      return { r, x, y, face: x2 >= x ? 1 : -1 };
    }).sort((a, b) => a.y - b.y);
    for (const { r, x, y } of list) {
      const mine = r.kind === 'word' || r.kind === 'aria' || r.kind === 'karasai';
      if (!mine) continue;
      // your riders show where they go
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = r.seg + 1; k < r.path.length; k++) ctx.lineTo(...this.toScreen(R[r.path[k]].x, R[r.path[k]].y));
      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = r.kind === 'aria' ? 'rgba(200,170,255,0.95)' : r.kind === 'karasai' ? 'rgba(255,150,130,0.95)' : 'rgba(255,246,214,0.95)';
      ctx.lineDashOffset = -now / 40;
      ctx.stroke();
      ctx.setLineDash([]);
      const end = this.toScreen(R[r.to].x, R[r.to].y);
      ctx.beginPath(); ctx.arc(end[0], end[1], u * 1.2, 0, Math.PI * 2); ctx.stroke();
    }
    for (const { r, x, y, face } of list) {
      // dust behind the hooves
      if (Math.random() < dt * 14) this.parts.push({ kind: 'dust', x: x - face * u * 1.4, y: y + u * 1.1, vx: -face * 6, vy: -4, life: 0.8, age: 0, layer: 'under' });
      const flag = r.kind === 'tribe' || r.kind === 'envoy' ? css(TRIBE_RGB[r.tribe]) : r.kind === 'raider' ? '#9a1410' : r.kind === 'karasai' ? '#c43a2c' : r.kind === 'aria' || r.kind === 'caravan' || r.kind === 'zaltyr' ? null : css(GOLD);
      const coat = r.kind === 'raider' ? '#17100c' : r.kind === 'aria' ? '#efe8dc' : r.kind === 'karasai' ? '#2b1d14' : r.kind === 'false' ? '#5a3a22' : r.kind === 'caravan' ? '#b08a5a' : '#8a5a32';
      const cloth = r.kind === 'raider' ? '#3a0e0a' : r.kind === 'aria' ? '#8a5cd6' : r.kind === 'karasai' ? '#7a1f18' : r.kind === 'tribe' || r.kind === 'envoy' ? css(TRIBE_RGB[r.tribe].map((v) => v * 0.7)) : r.kind === 'caravan' ? '#6a4a2a' : r.kind === 'zaltyr' ? '#2c3622' : '#2f5a7a';
      this.horse(x, y, face, now + r.id * 137, coat, cloth, flag, r.kind === 'karasai');
      if (look.pulse === r.id) {
        const k = (now % 900) / 900;
        ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y - u, u * (2 + k * 3), 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  // sparks of the word riding the roads, smoke of lies, dust
  drawParts(g, dt, layer) {
    const { ctx, u } = this;
    if (layer === 'under' && g.phase === 'map') {
      const R = g.map.regions;
      for (const r of R) {
        if (g.m[r.id] > 0.12 && Math.random() < g.m[r.id] * dt * 6) {
          const e = r.nb[Math.floor(Math.random() * r.nb.length)];
          const b = R[e.to];
          const [ax, ay] = this.toScreen(r.x, r.y), [bx, by] = this.toScreen(b.x, b.y);
          this.parts.push({ kind: 'spark', ax, ay, bx, by, life: 1.4, age: 0, layer: 'over' });
        }
        if (g.n[r.id] > 0.12 && Math.random() < g.n[r.id] * dt * 5) {
          const [x, y] = this.toScreen(r.x + (Math.random() - 0.5) * 8 * K, r.y + (Math.random() - 0.5) * 6 * K);
          this.parts.push({ kind: 'smoke', x, y, vx: (Math.random() - 0.5) * 6, vy: -10, life: 2.2, age: 0, layer: 'over' });
        }
      }
    }
    for (let k = this.parts.length - 1; k >= 0; k--) {
      const p = this.parts[k];
      if (p.layer !== layer) continue;
      p.age += dt;
      if (p.age >= p.life) { this.parts.splice(k, 1); continue; }
      const t = p.age / p.life;
      if (p.kind === 'spark') {
        const x = p.ax + (p.bx - p.ax) * t, y = p.ay + (p.by - p.ay) * t - Math.sin(t * Math.PI) * u;
        ctx.fillStyle = `rgba(255,228,140,${Math.sin(t * Math.PI)})`;
        ctx.beginPath(); ctx.arc(x, y, u * 0.38, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,255,230,${Math.sin(t * Math.PI) * 0.9})`;
        ctx.beginPath(); ctx.arc(x, y, u * 0.16, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'smoke') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.fillStyle = `rgba(80,40,100,${0.35 * Math.sin(t * Math.PI)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, u * (0.8 + t * 1.6), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'flame') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        // a tongue of flame: hot white at the root, orange, gone to nothing; added light, so fires glow
        const fr = u * (0.95 - t * 0.55);
        const fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y - fr * 0.6, fr * 1.4);
        fg.addColorStop(0, `rgba(255,240,180,${0.9 * (1 - t)})`);
        fg.addColorStop(0.4, `rgba(255,140,40,${0.7 * (1 - t)})`);
        fg.addColorStop(1, 'rgba(160,30,0,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.ellipse(p.x, p.y - fr * 0.6, fr * 0.6, fr * 1.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.kind === 'soot') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.fillStyle = `rgba(70,62,58,${0.22 * Math.sin(t * Math.PI)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, u * (0.45 + t * 1.1), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'dust') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.fillStyle = `rgba(200,175,130,${0.5 * (1 - t)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, u * (0.3 + t * 0.7), 0, Math.PI * 2); ctx.fill();
      }
    }
    if (this.parts.length > 600) this.parts.splice(0, this.parts.length - 600);
  }

  drawClouds(dt) {
    const { ctx } = this;
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x - c.r * 1.4 > GW) c.x = -c.r * 1.4;
      const [x, y] = this.toScreen(c.x, c.y);
      const r = c.r * this.s;
      const gr = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      gr.addColorStop(0, 'rgba(30,25,40,0.16)');
      gr.addColorStop(1, 'rgba(30,25,40,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawHand(g, now, look) {
    if (look.hand == null || look.hand < 0) return;
    const { ctx, u } = this;
    const r = g.map.regions[look.hand];
    const [x, y] = this.toScreen(r.x, r.y);
    const k = (now % 1200) / 1200;
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, u * (2 + k * 4), 0, Math.PI * 2); ctx.stroke();
    const ay = y - u * 4.6 - Math.abs(Math.sin(now / 260)) * u * 1.4, s = Math.max(12, u * 1.4);
    ctx.fillStyle = '#f3cf7a';
    ctx.strokeStyle = '#3a240c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, ay + s);
    ctx.lineTo(x - s * 0.8, ay);
    ctx.lineTo(x - s * 0.3, ay);
    ctx.lineTo(x - s * 0.3, ay - s);
    ctx.lineTo(x + s * 0.3, ay - s);
    ctx.lineTo(x + s * 0.3, ay);
    ctx.lineTo(x + s * 0.8, ay);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawFx(g, now) {
    const { ctx, u } = this;
    for (let k = this.fx.length - 1; k >= 0; k--) {
      const f = this.fx[k];
      const age = (now - f.t0) / 1400;
      if (age >= 1) { this.fx.splice(k, 1); continue; }
      const r = g.map.regions[f.region] || g.map.regions[0];
      const [x, y] = this.toScreen(r.x, r.y);
      ctx.globalAlpha = 1 - age;
      if (f.ring) {
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 6 * (1 - age) + 1;
        ctx.beginPath(); ctx.ellipse(x, y, u * (1.5 + age * 11), u * (1 + age * 6), 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.font = `800 ${Math.round(Math.max(18, u * (f.big ? 3.6 : 2.6)))}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = f.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, x, y - u * 3 - age * u * 4);
      ctx.fillText(f.text, x, y - u * 3 - age * u * 4);
      ctx.globalAlpha = 1;
    }
  }

  // the dramatic layer: fire over burned auls, a red alarm while the horde rides, the night with its lanterns
  drawDrama(g, now, dt) {
    const { ctx, u } = this;
    const R = g.map.regions;
    for (const k in g.burn || {}) {
      const age = g.time - g.burn[k];
      if (age > 30) continue;
      const r = R[k];
      const [x, y] = this.toScreen(r.x, r.y);
      if (Math.random() < dt * 40 * (1 - age / 30)) this.parts.push({ kind: 'flame', x: x + (Math.random() - 0.5) * u * 2.4, y: y - u * 0.4, vx: (Math.random() - 0.5) * 6, vy: -30 - Math.random() * 24, life: 0.8, age: 0, layer: 'over' });
      // thin grey smoke above the fire, never a black blot bigger than the flames
      if (Math.random() < dt * 4 * (1 - age / 30)) this.parts.push({ kind: 'soot', x: x + (Math.random() - 0.5) * u * 1.4, y: y - u * 2.6, vx: 5 + Math.random() * 5, vy: -16, life: 2.4, age: 0, layer: 'over' });
    }
    if (g.raidWarn) {
      // a wall of dust on the side the horde will come from
      const k = Math.min(1, (g.time - g.raidWarn.at) / 3);
      const W = this.w, H = this.h, side = g.raidWarn.side;
      const gr = side === 0 ? ctx.createLinearGradient(0, 0, W * 0.3, 0) : side === 1 ? ctx.createLinearGradient(W, 0, W * 0.7, 0) : side === 2 ? ctx.createLinearGradient(0, 0, 0, H * 0.3) : ctx.createLinearGradient(0, H, 0, H * 0.7);
      gr.addColorStop(0, `rgba(190,150,100,${0.55 * k})`);
      gr.addColorStop(1, 'rgba(190,150,100,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.flashAt && now - this.flashAt < 220) {
      ctx.fillStyle = `rgba(255,250,230,${0.35 * (1 - (now - this.flashAt) / 220)})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    if (g.raid) {
      const a = 0.16 + Math.sin(now / 260) * 0.06;
      const vg = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
      vg.addColorStop(0, 'rgba(160,20,10,0)');
      vg.addColorStop(1, `rgba(160,20,10,${a})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    if (g.night) {
      const k = Math.min(1, (g.time - g.night.at) / 1.5) * (g.night.until ? Math.max(0, (g.night.until - g.time) / 2.5) : 1);
      ctx.fillStyle = `rgba(6,10,28,${0.62 * k})`;
      ctx.fillRect(0, 0, this.w, this.h);
      // lanterns of the honest riders, and the Orda's fire
      ctx.globalCompositeOperation = 'lighter';
      const glowAt = (x, y, rad, c) => {
        const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, c);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      };
      const o = this.toScreen(R[0].x, R[0].y);
      glowAt(o[0], o[1], u * 7, `rgba(255,170,70,${0.55 * k})`);
      for (const rd of g.riders) {
        if (rd.kind !== 'envoy') continue;
        // the moon shows every rider faintly; only the honest ones carry a warm light
        { const p = riderPos(g, rd); const [mx, my] = this.toScreen(p.x, p.y); glowAt(mx, my - u * 0.8, u * 2.6, `rgba(150,170,220,${0.28 * k})`); }
        if (rd.killer) continue;
        const p = riderPos(g, rd);
        const [x, y] = this.toScreen(p.x, p.y);
        glowAt(x, y - u * 1.5, u * 3.2 * (1 + Math.sin(now / 90 + rd.id) * 0.08), `rgba(255,200,110,${0.8 * k})`);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // a small plate by the cursor: whose pasture, how much it trusts the khan, what a click will do
  drawHoverTag(g, look) {
    const id = this.hover;
    if (id == null || id < 0 || !look.mouse || g.phase !== 'map') return;
    const r = g.map.regions[id];
    const { ctx } = this;
    const name = r.tribe < 0 ? look.ordaName : look.names?.[r.tribe];
    if (!name) return;
    const text = r.tribe < 0 ? name : look.trustTag ? look.trustTag(name, Math.round(g.t[id] * 100)) : `${name} · ${Math.round(g.t[id] * 100)}%`;
    ctx.font = '700 13px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 18;
    let x = look.mouse[0] + 16, y = look.mouse[1] + 18;
    if (x + w > this.w - 6) x = look.mouse[0] - w - 10;
    ctx.fillStyle = 'rgba(28,18,10,0.82)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, 26, 8) : ctx.rect(x, y, w, 26);
    ctx.fill();
    if (r.tribe >= 0) {
      ctx.fillStyle = css(TRIBE_RGB[r.tribe]);
      ctx.fillRect(x, y + 4, 4, 18);
    }
    ctx.fillStyle = '#fff2d6';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 10, y + 13);
  }

  // the riders Zaltyr has marked: a red "!" over them
  drawSeen(g, now) {
    const { ctx, u } = this;
    for (const r of g.riders) {
      if (!r.seen) continue;
      const p = riderPos(g, r);
      const [x, y] = this.toScreen(p.x, p.y);
      const by = y - u * 4.2 + Math.sin(now / 160) * u * 0.3;
      ctx.beginPath();
      ctx.arc(x, by, Math.max(9, u * 1.1), 0, Math.PI * 2);
      ctx.fillStyle = '#d0302a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff3e0';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${Math.round(Math.max(12, u * 1.5))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', x, by + 1);
    }
  }

  pushFx(f, now) {
    if (f.type === 'word' || f.type === 'force') this.flash.set(f.region, now);
    if (f.type === 'word' && f.chain >= 2) { this.fx.push({ region: f.region, text: '×' + f.chain, color: '#ffd76a', ring: true, t0: now, big: true }); return; }
    const look = { clash: ['⚔', '#ffb08a', true], fire: ['', '#ff7a3a', true], raid: ['', '#ff4a3a', true], trade: ['+1', '#ffe7a0', false], word: ['+', '#ffe7a0', true], lie: ['−', '#e0b0ff', true], force: ['⚔', '#ff8f7a', true], clue: ['✦', '#ffe7a0', false], caught: ['✓', '#fff', true], aria: ['◉', '#d9c4ff', false] }[f.type];
    if (look) this.fx.push({ region: f.region, text: look[0], color: look[1], ring: look[2], t0: now });
  }
}
