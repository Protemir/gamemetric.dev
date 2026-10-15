import { clamp, lerp, wrap, fogAt, rng, mix, rgba, easeInOut } from './util.js';
import { SEG, ROAD_W, CAM_H, CAM_DEPTH, PLAYER_Z, BASE_MAX, CAR_W, TUNNEL_H } from './track.js';
import { drawVehicle, VEHICLES } from './sprites.js';
import { L } from './i18n.js';

const DRAW = 240;
const SANS = '"Segoe UI", system-ui, sans-serif';

function offscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// puddles on the asphalt and what they leave on the glass
const PUDDLE = {
  water: { body: 'rgba(70,90,120,0.55)', shine: 'rgba(200,220,255,0.35)' },
  slush: { body: 'rgba(150,146,135,0.85)', shine: 'rgba(235,238,242,0.5)' },
  mud: { body: 'rgba(88,62,38,0.9)', shine: 'rgba(160,120,80,0.35)' },
};
const SPLASH = {
  water: { body: 'rgba(190,215,255,0.38)', shine: 'rgba(255,255,255,0.55)', smear: 'rgba(190,215,255,A)' },
  slush: { body: 'rgba(214,218,224,0.9)', shine: 'rgba(255,255,255,0.7)', smear: 'rgba(214,218,224,A)' },
  mud: { body: 'rgba(91,61,34,0.94)', shine: 'rgba(170,130,90,0.5)', smear: 'rgba(91,61,34,A)' },
};

export class Renderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.budget = opts.budget || 1500000;
    this.map = null;
    this.layers = {};
    this.confetti = [];
    this.flakes = [];
  }

  resize(cssW, cssH, dpr = window.devicePixelRatio || 1) {
    let scale = Math.min(dpr, 1.5);
    if (cssW * cssH * scale * scale > this.budget) scale = Math.sqrt(this.budget / (cssW * cssH));
    this.W = Math.max(1, Math.round(cssW * scale));
    this.H = Math.max(1, Math.round(cssH * scale));
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.FY = Math.min(this.H / 2, this.W * 0.9);
    // on wide screens the width alone would blow the car and the road up, so it is capped by the height
    this.FX = Math.min(this.W / 2, this.FY * 1.4);
    this.HORIZON = this.H - this.FY;
    if (this.map) this.buildLayers();
  }

  setMap(map) {
    this.map = map;
    this.flakes = [];
    const r = rng(5);
    const n = map.weather && map.weather.snow ? map.weather.snow : 0;
    for (let k = 0; k < n; k++) this.flakes.push({ x: r(), y: r(), z: 0.3 + r() * 0.7, s: r() });
    this.drops = [];
    const rain = map.weather && map.weather.rain ? map.weather.rain : 0;
    for (let k = 0; k < rain; k++) this.drops.push({ x: r(), y: r(), z: 0.4 + r() * 0.6 });
    if (this.W) this.buildLayers();
  }

  // ---------- background layers ----------

  ridge(w, base, amp, seed, detail, kind) {
    const r = rng(seed);
    const phases = [r() * 6, r() * 6, r() * 6];
    const pts = [];
    const steps = kind === 'mesa' ? 60 : 140;
    for (let n = 0; n <= steps; n++) {
      const k = n / steps;
      let a = Math.sin(k * Math.PI * 4 + phases[0]) * 0.5 + Math.sin(k * Math.PI * 10 + phases[1]) * 0.3 + Math.sin(k * Math.PI * 2 * detail + phases[2]) * 0.2;
      a = a * 0.5 + 0.5;
      if (kind === 'hills') a = Math.pow(a, 1.4);
      if (kind === 'mesa') a = Math.round(a * 4) / 4;
      pts.push([k * w, base - a * amp]);
    }
    if (kind === 'mesa') {
      // flat tops with steep walls: duplicate every point sideways
      const out = [];
      for (let n = 0; n < pts.length - 1; n++) {
        out.push(pts[n]);
        out.push([pts[n + 1][0] - (w / steps) * 0.18, pts[n][1]]);
      }
      out.push(pts[pts.length - 1]);
      return out;
    }
    return pts;
  }

  fillRidge(c, pts, w, h, dy) {
    c.beginPath();
    c.moveTo(0, h);
    for (const [x, y] of pts) c.lineTo(x, y + dy);
    c.lineTo(w, h);
    c.closePath();
    c.fill();
  }

  buildLayers() {
    const { W, H, FY, HORIZON } = this;
    const m = this.map;
    const sky = m.sky;
    const L = {};

    // sky with stars and the moon or the sun
    const s = offscreen(W, H);
    let c = s.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, HORIZON);
    for (const [k, col] of sky.stops) g.addColorStop(k, col);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    if (sky.stars) {
      const r = rng(7);
      const count = ((W * HORIZON) / 2600) * sky.stars;
      for (let n = 0; n < count; n++) {
        const y = r() * HORIZON * 0.85;
        c.fillStyle = `rgba(255,255,255,${(0.25 + r() * 0.6) * (1 - (y / HORIZON) * 0.6)})`;
        const size = r() < 0.92 ? 1 : 2;
        c.fillRect(r() * W, y, size, size);
      }
    }
    if (sky.body) {
      const b = sky.body;
      const bx = W * b.x;
      const by = HORIZON * b.y;
      const br = Math.max(8, Math.min(W, H) * b.r);
      const bg = c.createRadialGradient(bx, by, br * 0.8, bx, by, br * (b.type === 'sun' ? 9 : 5));
      bg.addColorStop(0, b.glow);
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = bg;
      c.fillRect(0, 0, W, H);
      c.fillStyle = b.color;
      c.beginPath();
      c.arc(bx, by, br, 0, Math.PI * 2);
      c.fill();
      this.body = { x: bx, y: by, r: br, type: b.type };
    } else {
      this.body = null;
    }
    L.sky = s;

    const lw = Math.max(W * 2, 1600);
    // clouds
    if (sky.clouds) {
      const cl = sky.clouds;
      const ch = HORIZON;
      const cv = offscreen(lw, ch);
      c = cv.getContext('2d');
      const r = rng(13);
      for (let n = 0; n < cl.count; n++) {
        const cx = r() * lw;
        const cy = ch * (cl.top + r() * (cl.bottom - cl.top));
        const cw = W * (0.12 + r() * 0.2);
        const chh = cw * (0.12 + r() * 0.08);
        c.fillStyle = rgba(cl.color, cl.alpha * (0.6 + r() * 0.4));
        for (let k = 0; k < 5; k++) {
          const bx = cx + (r() - 0.5) * cw;
          const by = cy + (r() - 0.5) * chh;
          const rx = cw * (0.3 + r() * 0.3);
          const ry = chh * (0.6 + r() * 0.5);
          // blobs that cross an edge are drawn again on the other side, so the layer tiles
          for (const ox of [0, bx + rx > lw ? -lw : null, bx - rx < 0 ? lw : null]) {
            if (ox == null) continue;
            c.beginPath();
            c.ellipse(bx + ox, by, rx, ry, 0, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
      L.clouds = cv;
    }

    // mountain ranges, far to near
    L.ranges = m.ranges.map((rg) => {
      const rh = Math.round(FY * rg.height);
      const cv = offscreen(lw, rh);
      c = cv.getContext('2d');
      const pts = this.ridge(lw, rh * 0.98, rh * rg.amp, rg.seed, rg.detail, rg.kind);
      c.fillStyle = rg.color;
      this.fillRidge(c, pts, lw, rh, 0);
      if (rg.snow) {
        c.save();
        c.beginPath();
        c.rect(0, 0, lw, rh * rg.snowLine);
        c.clip();
        c.fillStyle = rg.snow;
        this.fillRidge(c, pts, lw, rh, 0);
        c.fillStyle = rg.color;
        this.fillRidge(c, pts, lw, rh, rh * 0.07);
        c.restore();
      }
      if (rg.strata) {
        c.save();
        c.fillStyle = rg.color;
        this.fillRidge(c, pts, lw, rh, 0);
        c.clip();
        c.fillStyle = 'rgba(255,220,190,0.12)';
        for (let y = rh * 0.1; y < rh; y += rh * 0.09) c.fillRect(0, y, lw, Math.max(1, rh * 0.015));
        c.fillStyle = 'rgba(0,0,0,0.08)';
        for (let x = 0; x < lw; x += lw / 37) c.fillRect(x, 0, lw / 90, rh);
        c.restore();
      }
      if (rg.lights) {
        const lr = rng(31);
        for (let n = 0; n < lw / 3; n++) {
          const x = lr() * lw;
          const y = rh - lr() * rh * 0.22;
          c.fillStyle = lr() < 0.75 ? `rgba(255,190,110,${0.35 + lr() * 0.5})` : `rgba(200,220,255,${0.3 + lr() * 0.4})`;
          c.fillRect(x, y, lr() < 0.85 ? 1.5 : 2.5, 1.5);
        }
      }
      return { canvas: cv, speed: rg.speed, color: rg.color };
    });

    // Almaty skyline with the Kok-Tobe TV tower
    if (m.skyline) {
      const sh = Math.round(FY * 0.55);
      const cv = offscreen(lw, sh);
      c = cv.getContext('2d');
      const r = rng(71);
      c.fillStyle = m.skyline.color;
      let x = 0;
      while (x < lw) {
        const bw = lw * (0.008 + r() * 0.02);
        const bh = sh * (0.08 + Math.pow(r(), 2) * 0.32);
        c.fillStyle = m.skyline.color;
        c.fillRect(x, sh - bh, bw, bh);
        if (m.skyline.windows) {
          for (let wy = sh - bh + 4; wy < sh - 3; wy += 5) {
            for (let wx = x + 2; wx < x + bw - 2; wx += 4) {
              if (r() < 0.25) {
                c.fillStyle = r() < 0.8 ? 'rgba(255,200,120,0.75)' : 'rgba(170,200,240,0.7)';
                c.fillRect(wx, wy, 1.5, 2);
              }
            }
          }
        }
        x += bw + lw * r() * 0.01;
      }
      if (m.skyline.landmarks === 'astana') this.astana(c, lw, sh);
      for (const tx of m.skyline.landmarks ? [] : [lw * 0.3]) {
        const top = sh * 0.02;
        c.fillStyle = m.skyline.color;
        c.beginPath();
        c.moveTo(tx - sh * 0.05, sh);
        c.lineTo(tx - 1.5, top + sh * 0.2);
        c.lineTo(tx + 1.5, top + sh * 0.2);
        c.lineTo(tx + sh * 0.05, sh);
        c.closePath();
        c.fill();
        c.fillRect(tx - 1, top, 2, sh * 0.25);
        c.fillRect(tx - sh * 0.025, top + sh * 0.26, sh * 0.05, sh * 0.04);
        c.fillStyle = '#ff3b30';
        for (const ky of [0, 0.12, 0.27]) c.fillRect(tx - 1.5, top + sh * ky, 3, 3);
      }
      L.skyline = cv;
    }

    // darker corners, so the eye stays on the road
    const vig = offscreen(W, H);
    c = vig.getContext('2d');
    const vg = c.createRadialGradient(W / 2, H * 0.62, Math.min(W, H) * 0.25, W / 2, H * 0.62, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${sky.vignette})`);
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
    L.vignette = vig;

    this.layers = L;
  }

  // the left bank of Astana at night: Baiterek, Khan Shatyr, the Nur Alem sphere and the towers
  astana(c, lw, sh) {
    const lit = '#cfd8ea';
    // two towers with green edges
    for (const [tx, tw, th] of [[0.12, 0.035, 0.78], [0.135, 0.03, 0.66]]) {
      c.fillStyle = '#1b2442';
      c.beginPath();
      c.moveTo(lw * tx - sh * tw, sh);
      c.lineTo(lw * tx - sh * tw * 0.6, sh * (1 - th));
      c.lineTo(lw * tx, sh * (1 - th) - sh * 0.08);
      c.lineTo(lw * tx + sh * tw * 0.6, sh * (1 - th));
      c.lineTo(lw * tx + sh * tw, sh);
      c.closePath();
      c.fill();
      c.fillStyle = '#3ddc97';
      c.fillRect(lw * tx - 1, sh * (1 - th) - sh * 0.06, 2, sh * th);
    }
    // Baiterek: a white stem opening into a crown with a golden sphere
    const bx = lw * 0.3;
    const top = sh * 0.12;
    c.fillStyle = lit;
    c.beginPath();
    c.moveTo(bx - sh * 0.035, sh);
    c.lineTo(bx - sh * 0.008, top + sh * 0.12);
    c.lineTo(bx + sh * 0.008, top + sh * 0.12);
    c.lineTo(bx + sh * 0.035, sh);
    c.closePath();
    c.fill();
    c.strokeStyle = lit;
    c.lineWidth = Math.max(1, sh * 0.006);
    for (const k of [-1, -0.5, 0.5, 1]) {
      c.beginPath();
      c.moveTo(bx, top + sh * 0.14);
      c.quadraticCurveTo(bx + k * sh * 0.05, top + sh * 0.08, bx + k * sh * 0.045, top - sh * 0.01);
      c.stroke();
    }
    const glowG = c.createRadialGradient(bx, top + sh * 0.04, 0, bx, top + sh * 0.04, sh * 0.14);
    glowG.addColorStop(0, 'rgba(255,207,90,0.55)');
    glowG.addColorStop(1, 'rgba(255,207,90,0)');
    c.fillStyle = glowG;
    c.fillRect(bx - sh * 0.14, top - sh * 0.1, sh * 0.28, sh * 0.28);
    c.fillStyle = '#ffcf5a';
    c.beginPath();
    c.arc(bx, top + sh * 0.04, sh * 0.045, 0, Math.PI * 2);
    c.fill();
    // Ak Orda: a low palace with a blue dome
    const ax = lw * 0.42;
    c.fillStyle = '#1b2442';
    c.fillRect(ax - sh * 0.12, sh * 0.82, sh * 0.24, sh * 0.18);
    c.fillStyle = '#3f7fd8';
    c.beginPath();
    c.arc(ax, sh * 0.82, sh * 0.06, Math.PI, 0);
    c.fill();
    c.fillStyle = '#ffd166';
    c.fillRect(ax - 1, sh * 0.66, 2, sh * 0.1);
    // Khan Shatyr: the leaning tent with a lit seam
    const kx = lw * 0.55;
    c.fillStyle = '#2a3560';
    c.beginPath();
    c.moveTo(kx - sh * 0.24, sh);
    c.quadraticCurveTo(kx - sh * 0.1, sh * 0.6, kx + sh * 0.03, sh * 0.35);
    c.quadraticCurveTo(kx + sh * 0.12, sh * 0.62, kx + sh * 0.22, sh);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,190,120,0.75)';
    c.lineWidth = Math.max(1, sh * 0.005);
    c.beginPath();
    c.moveTo(kx - sh * 0.24, sh);
    c.quadraticCurveTo(kx - sh * 0.1, sh * 0.6, kx + sh * 0.03, sh * 0.35);
    c.stroke();
    c.fillStyle = '#ffd166';
    c.fillRect(kx + sh * 0.025, sh * 0.27, 2, sh * 0.08);
    // the tallest tower
    const tx = lw * 0.66;
    c.fillStyle = '#1b2442';
    c.fillRect(tx - sh * 0.04, sh * 0.16, sh * 0.08, sh * 0.84);
    c.beginPath();
    c.moveTo(tx - sh * 0.04, sh * 0.16);
    c.lineTo(tx, sh * 0.06);
    c.lineTo(tx + sh * 0.04, sh * 0.16);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(120,180,255,0.6)';
    for (let wy = sh * 0.2; wy < sh * 0.95; wy += sh * 0.035) c.fillRect(tx - sh * 0.03, wy, sh * 0.06, 1);
    // Nur Alem: the glass sphere
    const nx = lw * 0.8;
    const nr = sh * 0.11;
    const ny = sh - nr - sh * 0.06;
    c.fillStyle = '#1b2442';
    c.fillRect(nx - nr * 0.5, ny, nr, sh - ny);
    c.fillStyle = '#3a6fc4';
    c.beginPath();
    c.arc(nx, ny, nr, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(200,230,255,0.55)';
    c.lineWidth = 1;
    for (const k of [-0.6, -0.2, 0.2, 0.6]) {
      c.beginPath();
      c.ellipse(nx, ny + k * nr, nr * Math.sqrt(1 - k * k), nr * 0.08, 0, 0, Math.PI * 2);
      c.stroke();
    }
  }

  drawLayer(img, rotation, y) {
    const w = img.width;
    const x = -wrap(rotation, 1) * w;
    this.ctx.drawImage(img, x, y);
    this.ctx.drawImage(img, x + w, y);
  }

  // ---------- road ----------

  project(p, camX, camY, camZ) {
    const cy = p.y - camY;
    const cz = p.z - camZ;
    p.cz = cz;
    p.cy = cy;
    p.scale = CAM_DEPTH / cz;
    p.sx = Math.round(this.W / 2 + p.scale * -camX * this.FX);
    p.sy = Math.round(this.HORIZON - p.scale * cy * this.FY);
    p.sw = Math.round(p.scale * ROAD_W * this.FX);
  }

  poly(x1, y1, x2, y2, x3, y3, x4, y4, color, seal) {
    const c = this.ctx;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.lineTo(x3, y3);
    c.lineTo(x4, y4);
    c.closePath();
    c.fill();
    if (seal) {
      // neighbouring quads leave hairline gaps; a thin stroke in the same color closes them
      c.strokeStyle = color;
      c.lineWidth = 1;
      c.stroke();
    }
  }

  drawRail(seg, env) {
    const { p1, p2 } = seg;
    const side = seg.rail;
    const h1 = 300 * p1.scale * this.FX;
    const h2 = 300 * p2.scale * this.FX;
    const x1 = p1.sx + side * p1.sw * 1.08;
    const x2 = p2.sx + side * p2.sw * 1.08;
    const beam = mix('#c9cdd4', '#6f7682', env.night);
    const post = mix('#8a909b', '#454b56', env.night);
    const c = this.ctx;
    c.globalAlpha = seg.fog;
    this.withClip(seg.clip, () => {
      if (seg.i % 3 === 0) {
        const pw = Math.max(1, 60 * p1.scale * this.FX);
        c.fillStyle = post;
        c.fillRect(x1 - pw / 2, p1.sy - h1 * 0.8, pw, h1 * 0.8);
        if (env.night > 0.3) {
          c.fillStyle = '#ffcf5a';
          c.fillRect(x1 - pw / 2, p1.sy - h1 * 0.75, pw, Math.max(1, h1 * 0.08));
        }
      }
      this.poly(x1, p1.sy - h1 * 0.55, x1, p1.sy - h1 * 0.9, x2, p2.sy - h2 * 0.9, x2, p2.sy - h2 * 0.55, beam, true);
    });
    c.globalAlpha = 1;
  }

  drawSegment(seg, lanes, near) {
    const c = this.ctx;
    const { p1, p2, color } = seg;
    const x1 = p1.sx, y1 = p1.sy, w1 = p1.sw;
    const x2 = p2.sx, y2 = p2.sy, w2 = p2.sw;
    c.fillStyle = color.grass;
    c.fillRect(0, y2, this.W, y1 - y2);
    const r1 = w1 / 6;
    const r2 = w2 / 6;
    this.poly(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble);
    this.poly(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble);
    this.poly(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);
    if (near) {
      // worn wheel tracks in every lane, and the odd patch of newer asphalt
      const lw1 = (w1 * 2) / lanes;
      const lw2 = (w2 * 2) / lanes;
      c.beginPath();
      for (let lane = 0; lane < lanes; lane++) {
        const cx1 = x1 - w1 + lw1 * (lane + 0.5);
        const cx2 = x2 - w2 + lw2 * (lane + 0.5);
        for (const side of [-0.25, 0.25]) {
          const a1 = cx1 + lw1 * side;
          const a2 = cx2 + lw2 * side;
          c.moveTo(a1 - lw1 * 0.06, y1);
          c.lineTo(a1 + lw1 * 0.06, y1);
          c.lineTo(a2 + lw2 * 0.06, y2);
          c.lineTo(a2 - lw2 * 0.06, y2);
          c.closePath();
        }
      }
      c.fillStyle = 'rgba(0,0,0,0.08)';
      c.fill();
      if (seg.patch) {
        const f = seg.patch.from;
        const pw = seg.patch.width;
        this.poly(x1 + w1 * f, y1, x1 + w1 * (f + pw), y1, x2 + w2 * (f + pw), y2, x2 + w2 * f, y2, 'rgba(0,0,0,0.12)');
      }
    }
    // solid white lines along both edges of the asphalt
    const e1 = w1 / 50;
    const e2 = w2 / 50;
    const in1 = w1 * 0.04;
    const in2 = w2 * 0.04;
    this.poly(x1 - w1 + in1, y1, x1 - w1 + in1 + e1, y1, x2 - w2 + in2 + e2, y2, x2 - w2 + in2, y2, color.edge);
    this.poly(x1 + w1 - in1 - e1, y1, x1 + w1 - in1, y1, x2 + w2 - in2, y2, x2 + w2 - in2 - e2, y2, color.edge);
    if (color.lane) {
      const l1 = w1 / (lanes === 2 ? 40 : 32);
      const l2 = w2 / (lanes === 2 ? 40 : 32);
      const lw1 = (w1 * 2) / lanes;
      const lw2 = (w2 * 2) / lanes;
      let lx1 = x1 - w1 + lw1;
      let lx2 = x2 - w2 + lw2;
      for (let lane = 1; lane < lanes; lane++, lx1 += lw1, lx2 += lw2) {
        this.poly(lx1 - l1 / 2, y1, lx1 + l1 / 2, y1, lx2 + l2 / 2, y2, lx2 - l2 / 2, y2, color.lane);
      }
    }
    if (near && (seg.hole || seg.bump || seg.zebra || seg.puddle || seg.ice)) this.drawSurface(seg, x1, y1, w1, x2, y2, w2, this.opts || {});
    if (seg.fog < 1) {
      c.globalAlpha = 1 - seg.fog;
      c.fillStyle = this.map.fogColor;
      c.fillRect(0, y2, this.W, y1 - y2);
      c.globalAlpha = 1;
    }
  }

  drawSurface(seg, x1, y1, w1, x2, y2, w2, opts) {
    const c = this.ctx;
    const bumps = opts.bumps !== false;
    if (seg.zebra && bumps) {
      const n = 9;
      for (let k = 0; k < n; k++) {
        const a = -0.92 + (k * 1.84) / n;
        const b = a + 0.1;
        this.poly(x1 + w1 * a, y1, x1 + w1 * b, y1, x2 + w2 * b, y2, x2 + w2 * a, y2, 'rgba(238,241,246,0.85)');
      }
    }
    if (seg.bump && bumps) {
      const n = 10;
      for (let k = 0; k < n; k++) {
        const a = -1 + (k * 2) / n;
        const b = a + 2 / n;
        this.poly(x1 + w1 * a, y1, x1 + w1 * b, y1, x2 + w2 * b, y2, x2 + w2 * a, y2, k % 2 ? '#1e1f22' : '#e8b630');
      }
    }
    if (seg.ice && opts.ice !== false) {
      // black ice: a glossy band across the lane
      const a = seg.ice.center - seg.ice.half;
      const b = seg.ice.center + seg.ice.half;
      this.poly(x1 + w1 * a, y1, x1 + w1 * b, y1, x2 + w2 * b, y2, x2 + w2 * a, y2, 'rgba(190,220,255,0.3)');
      const m1 = seg.ice.center - seg.ice.half * 0.15;
      const m2 = seg.ice.center + seg.ice.half * 0.05;
      this.poly(x1 + w1 * m1, y1, x1 + w1 * m2, y1, x2 + w2 * m2, y2, x2 + w2 * m1, y2, 'rgba(255,255,255,0.22)');
    }
    if (seg.puddle && opts.puddles !== false) {
      const p = seg.puddle;
      const col = PUDDLE[p.kind] || PUDDLE.water;
      const wm = (w1 + w2) / 2;
      const cx = (x1 + x2) / 2 + p.offset * wm;
      const cy = (y1 + y2) / 2;
      const rx = wm * p.size;
      const ry = Math.max(1, (y1 - y2) * 1.1);
      c.fillStyle = col.body;
      c.beginPath();
      c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      c.ellipse(cx + rx * 0.45, cy + ry * 0.2, rx * 0.6, ry * 0.75, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = col.shine;
      c.beginPath();
      c.ellipse(cx - rx * 0.15, cy - ry * 0.25, rx * 0.55, ry * 0.22, 0, 0, Math.PI * 2);
      c.fill();
    }
    if (seg.hole && bumps) {
      const xm = (x1 + x2) / 2;
      const wm = (w1 + w2) / 2;
      const cx = xm + seg.hole.offset * wm;
      const rx = wm * seg.hole.size;
      const ry = Math.max(1, (y1 - y2) * 0.9);
      const cy = (y1 + y2) / 2;
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.beginPath();
      c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.beginPath();
      c.ellipse(cx, cy + ry * 0.35, rx * 0.8, ry * 0.4, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  // fireworks over the night city, behind the mountains
  drawFireworks(view) {
    if (!this.sparks) this.sparks = [];
    const c = this.ctx;
    const dt = Math.min(0.05, view.dt || 0);
    if (view.playing && Math.random() < dt * 0.4 && this.sparks.length < 400) {
      const x = this.W * (0.1 + Math.random() * 0.8);
      const y = this.HORIZON * (0.12 + Math.random() * 0.3);
      const colors = ['#ffd166', '#ef476f', '#06d6a0', '#8ecae6', '#ffffff', '#ff9f1c'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const speed = this.H * (0.12 + Math.random() * 0.1);
      for (let k = 0; k < 48; k++) {
        const a = (k / 48) * Math.PI * 2 + Math.random() * 0.1;
        const v = speed * (0.6 + Math.random() * 0.4);
        this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.4 + Math.random() * 0.5, color });
      }
    }
    if (!this.sparks.length) return;
    c.globalCompositeOperation = 'lighter';
    c.lineWidth = Math.max(1.5, this.H / 320);
    c.lineCap = 'round';
    this.sparks = this.sparks.filter((p) => {
      p.life -= dt;
      p.vy += this.H * 0.09 * dt;
      p.vx *= 1 - dt * 0.8;
      p.vy *= 1 - dt * 0.8;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) return false;
      // a short streak along the direction of flight
      c.globalAlpha = Math.min(1, p.life);
      c.strokeStyle = p.color;
      c.beginPath();
      c.moveTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06);
      c.lineTo(p.x, p.y);
      c.stroke();
      return true;
    });
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  // a puddle on the windscreen: blobs stay until the wipers sweep over them
  drawMud(mud, now) {
    const c = this.ctx;
    const { W, H } = this;
    const k = now - mud.t0;
    const arm = Math.min(Math.max(W * 0.45, H * 0.5), H * 0.98);
    const pivots = [[W * 0.3, H * 1.02], [W * 0.74, H * 1.02]];
    const col = SPLASH[mud.kind] || SPLASH.mud;
    // the blades go up from 0.5 s to 1 s and back down by 1.5 s
    const lo = 0.04;
    const hi = Math.PI - 0.04;
    let angle = lo;
    if (k > 0.5 && k < 1) angle = easeInOut(lo, hi, (k - 0.5) / 0.5);
    else if (k >= 1 && k < 1.5) angle = easeInOut(hi, lo, (k - 1) / 0.5);
    const swept = k >= 1 ? hi : k > 0.5 ? angle : 0;
    for (const b of mud.blobs) {
      if (b.a < swept) continue;
      // rain drops land one by one, a splash lands all at once
      const grow = Math.min(1, (k - (b.at || 0)) / 0.08);
      if (grow <= 0) continue;
      const [px, py] = pivots[b.p];
      const bx = px + Math.cos(b.a) * b.r * arm;
      const by = py - Math.sin(b.a) * b.r * arm;
      const size = b.s * arm * grow;
      c.fillStyle = col.body;
      c.beginPath();
      c.arc(bx, by, size, 0, Math.PI * 2);
      for (const [dx, dy, r] of b.dots) {
        c.moveTo(bx + dx * size + r * size, by + dy * size);
        c.arc(bx + dx * size, by + dy * size, r * size, 0, Math.PI * 2);
      }
      c.fill();
      if (b.drip) c.fillRect(bx - size * 0.12, by, size * 0.24, size * b.drip * Math.min(1, k * 1.5));
      c.fillStyle = col.shine;
      c.beginPath();
      c.arc(bx - size * 0.3, by - size * 0.3, size * 0.22, 0, Math.PI * 2);
      c.fill();
    }
    // a thin smear where the blades went, fading out
    if (k > 0.5) {
      const fade = Math.max(0, Math.min(1, 1 - (k - 1.5) / 0.9));
      c.fillStyle = col.smear.replace('A', String(0.22 * fade));
      for (const [px, py] of pivots) {
        c.beginPath();
        c.arc(px, py, arm * 0.97, -lo, -swept, true);
        c.arc(px, py, arm * 0.3, -swept, -lo, false);
        c.closePath();
        c.fill();
      }
    }
    if (k > 0.45 && k < 1.6) {
      c.lineCap = 'round';
      for (const [px, py] of pivots) {
        const ex = px + Math.cos(angle) * arm;
        const ey = py - Math.sin(angle) * arm;
        c.strokeStyle = '#1a1c22';
        c.lineWidth = Math.max(4, W * 0.012);
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(ex, ey);
        c.stroke();
        c.strokeStyle = '#0b0c10';
        c.lineWidth = Math.max(7, W * 0.024);
        c.beginPath();
        c.moveTo(px + Math.cos(angle) * arm * 0.3, py - Math.sin(angle) * arm * 0.3);
        c.lineTo(ex, ey);
        c.stroke();
      }
      c.lineCap = 'butt';
    }
  }

  // confetti over the whole screen
  burstConfetti() {
    const colors = ['#ffd166', '#ff8fbf', '#ffffff', '#06d6a0', '#8ecae6', '#ef476f'];
    for (let k = 0; k < 140; k++) {
      this.confetti.push({
        x: Math.random() * this.W,
        y: -Math.random() * this.H * 0.4,
        vx: (Math.random() - 0.5) * this.W * 0.15,
        vy: this.H * (0.2 + Math.random() * 0.25),
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 12,
        life: 2.6 + Math.random(),
        color: colors[k % colors.length],
      });
    }
  }

  drawConfetti(dt) {
    const c = this.ctx;
    const size = Math.max(4, Math.min(this.W, this.H) * 0.012);
    this.confetti = this.confetti.filter((p) => {
      p.life -= dt;
      p.x += (p.vx + Math.sin(p.rot) * this.W * 0.05) * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      if (p.life <= 0 || p.y > this.H + 20) return false;
      c.globalAlpha = Math.min(1, p.life);
      c.fillStyle = p.color;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillRect(-size / 2, -size * 0.3, size, size * 0.6 * Math.abs(Math.cos(p.rot * 1.3)) + 1);
      c.restore();
      return true;
    });
    c.globalAlpha = 1;
  }

  // a golden eagle crossing the sky now and then: long glides, a few slow flaps
  drawEagle(view) {
    const dt = view.still ? 0 : Math.min(0.05, view.dt || 0);
    const { W, H, HORIZON } = this;
    if (!this.eagle) this.eagle = { wait: 3 + Math.random() * 5 };
    const e = this.eagle;
    if (e.wait > 0) {
      e.wait -= dt;
      if (e.wait > 0) return;
      const dir = Math.random() < 0.5 ? 1 : -1;
      Object.assign(e, { x: dir > 0 ? -W * 0.1 : W * 1.1, y0: HORIZON * (0.2 + Math.random() * 0.35), dir, t: 0, s: Math.max(16, Math.min(W, H) * (0.05 + Math.random() * 0.03)) });
    }
    e.t += dt;
    e.x += e.dir * W * 0.08 * dt;
    if (e.x < -W * 0.15 || e.x > W * 1.15) {
      e.wait = 14 + Math.random() * 16;
      return;
    }
    const y = e.y0 + Math.sin(e.t * 0.7) * H * 0.02;
    const flap = e.t % 5 < 1.3 ? Math.sin(e.t * 8) : 0.2;
    const s = e.s;
    const lift = flap * s * 0.35;
    const c = this.ctx;
    c.save();
    c.translate(e.x, y);
    c.scale(e.dir, 1);
    c.fillStyle = this.map.sky.night > 0.5 ? '#0d0f14' : '#2b2118';
    c.beginPath();
    c.moveTo(-s * 1.1, -lift - s * 0.05);
    c.quadraticCurveTo(-s * 0.5, -s * 0.25 - lift * 0.5, 0, 0);
    c.quadraticCurveTo(s * 0.5, -s * 0.25 - lift * 0.5, s * 1.1, -lift - s * 0.05);
    c.quadraticCurveTo(s * 0.5, -s * 0.02 - lift * 0.3, 0, s * 0.14);
    c.quadraticCurveTo(-s * 0.5, -s * 0.02 - lift * 0.3, -s * 1.1, -lift - s * 0.05);
    c.fill();
    c.beginPath();
    c.ellipse(s * 0.2, s * 0.05, s * 0.32, s * 0.1, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#c99a4a';
    c.beginPath();
    c.arc(s * 0.48, s * 0.02, s * 0.08, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // a watermelon in the face: pink splashes that slide away
  drawSplat(k) {
    const c = this.ctx;
    const { W, H } = this;
    c.globalAlpha = Math.min(1, k);
    const blobs = [[0.3, 0.35, 0.12], [0.62, 0.3, 0.09], [0.45, 0.5, 0.15], [0.7, 0.55, 0.08], [0.22, 0.6, 0.07]];
    for (const [bx, by, r] of blobs) {
      c.fillStyle = '#ff5a7a';
      c.beginPath();
      c.ellipse(W * bx, H * by + (1 - k) * H * 0.15, W * r, W * r * 0.8, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#1a1a1a';
      for (let s = 0; s < 4; s++) {
        c.beginPath();
        c.ellipse(W * (bx + (s - 1.5) * r * 0.35), H * by + (1 - k) * H * 0.15 + (s % 2 ? 1 : -1) * W * r * 0.25, W * 0.006, W * 0.01, 0.4, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  withClip(clipY, fn) {
    if (clipY >= this.H) return fn();
    const c = this.ctx;
    c.save();
    c.beginPath();
    c.rect(0, 0, this.W, clipY);
    c.clip();
    fn();
    c.restore();
  }

  drawSprite(s, scale, x, y, offX, clipY, alpha, env) {
    if (s.gone || s.off) return;
    const def = s.def;
    const dw = (s.w || def.w) * scale * this.FX;
    const dh = (s.h || def.h) * scale * this.FX;
    const dx = x + dw * offX;
    const dy = y - dh;
    if (dw < 0.8 || dx > this.W || dx + dw < 0 || dy >= clipY) return;
    const c = this.ctx;
    if (!s.lift && dw > 6 && !def.walker && s.type !== 'lamp' && s.type !== 'pole' && s.type !== 'pylon' && s.type !== 'turbine') {
      c.globalAlpha = alpha * 0.28;
      c.fillStyle = '#000';
      c.beginPath();
      c.ellipse(dx + dw / 2, y, dw * 0.42, Math.max(1, dw * 0.07), 0, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = alpha * (s.alpha ?? 1);
    if (s.lift || s.rot) {
      // tumbling through the air: lift it up and spin it around its middle
      const lift = (s.lift || 0) * scale * this.FX;
      c.save();
      c.translate(dx + dw / 2, dy + dh / 2 - lift);
      c.rotate(s.rot || 0);
      def.draw(c, -dw / 2, -dh / 2, dw, dh, s, env);
      c.restore();
    } else if (dy + dh > clipY) this.withClip(clipY, () => def.draw(c, dx, dy, dw, dh, s, env));
    else def.draw(c, dx, dy, dw, dh, s, env);
    c.globalAlpha = 1;
  }

  drawCar(car, seg, env) {
    const scale = lerp(seg.p1.scale, seg.p2.scale, car.percent);
    const x = lerp(seg.p1.sx, seg.p2.sx, car.percent) + scale * car.offset * ROAD_W * this.FX;
    const y = lerp(seg.p1.sy, seg.p2.sy, car.percent);
    if (car.melon) {
      const r = car.w * scale * this.FX * 0.5;
      if (r < 0.6 || y - r * 2 >= seg.clip) return;
      const c = this.ctx;
      c.globalAlpha = seg.fog;
      c.save();
      c.translate(x, y - r);
      c.rotate(car.roll || 0);
      c.fillStyle = '#2f7d3a';
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#173f1c';
      c.lineWidth = Math.max(1, r * 0.18);
      for (const k of [-0.5, 0, 0.5]) {
        c.beginPath();
        c.ellipse(k * r, 0, r * 0.18, r * 0.95, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
      c.globalAlpha = 1;
      return;
    }
    const v = VEHICLES[car.kind] || VEHICLES.sedan;
    const dw = car.w * scale * this.FX;
    const dh = dw * v.ratio;
    if (dw < 1 || y - dh >= seg.clip) return;
    const c = this.ctx;
    c.globalAlpha = seg.fog;
    const draw = () => {
      if (car.weaver && dw > 6) {
        // neon under the car, pulsing
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = `rgba(0,220,255,${0.28 + Math.sin(env.time * 6) * 0.1})`;
        c.beginPath();
        c.ellipse(x, y - dh * 0.02, dw * 0.64, Math.max(1.5, dh * 0.13), 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      drawVehicle(c, x - dw / 2, y - dh, dw, dh, car.kind, car.color, { front: car.dir < 0, lights: env.lights, time: env.time });
      if (car.wedding && dw > 6) this.drawWedding(car, x, y, dw, dh, env);
      if (car.melonTruck && dw > 8) {
        // an open cargo box piled with watermelons
        c.fillStyle = '#2f7d3a';
        for (let k = 0; k < 6; k++) {
          c.beginPath();
          c.arc(x - dw * 0.38 + k * dw * 0.152, y - dh + dw * 0.02, dw * 0.09, Math.PI, 0);
          c.fill();
        }
        c.fillStyle = '#3d9a4a';
        for (let k = 0; k < 4; k++) {
          c.beginPath();
          c.arc(x - dw * 0.26 + k * dw * 0.17, y - dh - dw * 0.05, dw * 0.08, Math.PI, 0);
          c.fill();
        }
      }
      if (car.name && dw > 22) this.nameTag(L(car.name), car.model ? L(car.model) : '', x, y - dh - dw * 0.08, dw, car.color);
      if (car.say && env.time < car.sayUntil && dw > 14) this.bubble(car.say, x, y - dh - dw * 0.08 - clamp(dw * 0.16, 9, 22) * 1.8, dw);
    };
    if (y > seg.clip) this.withClip(seg.clip, draw);
    else draw();
    c.globalAlpha = 1;
  }

  // ribbons and a bow on the boot, balloons on the mirrors, rings on the lead car
  drawWedding(car, x, y, dw, dh, env) {
    const c = this.ctx;
    const top = y - dh;
    c.fillStyle = '#ff8fbf';
    c.fillRect(x - dw * 0.46, top + dh * 0.52, dw * 0.92, Math.max(1, dh * 0.06));
    if (dw > 14) {
      c.beginPath();
      c.moveTo(x, top + dh * 0.55);
      c.lineTo(x - dw * 0.09, top + dh * 0.45);
      c.lineTo(x - dw * 0.09, top + dh * 0.65);
      c.closePath();
      c.moveTo(x, top + dh * 0.55);
      c.lineTo(x + dw * 0.09, top + dh * 0.45);
      c.lineTo(x + dw * 0.09, top + dh * 0.65);
      c.closePath();
      c.fill();
    }
    const gone = car.balloonT ? env.time - car.balloonT : 0;
    if (gone < 2.5) {
      const alpha = c.globalAlpha;
      c.globalAlpha = alpha * (gone ? Math.max(0, 1 - gone / 2.5) : 1);
      const rise = gone * dw * 1.6;
      for (const side of [-1, 1]) {
        const ax = x + side * dw * 0.47;
        const ay = top + dh * 0.32;
        for (let k = 0; k < 3; k++) {
          const sway = Math.sin(env.time * 2.6 + k * 2 + side) * dw * 0.03 + side * gone * dw * 0.3;
          const bx = ax + side * (k - 1) * dw * 0.07 + sway;
          const r = dw * 0.075;
          const by = top - dw * (0.2 + k * 0.07) - rise;
          if (!gone && dw > 10) {
            c.strokeStyle = 'rgba(255,255,255,0.6)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(ax, ay);
            c.lineTo(bx, by + r * 1.1);
            c.stroke();
          }
          c.fillStyle = car.balloons[(k + (side > 0 ? 1 : 0)) % car.balloons.length];
          c.beginPath();
          c.ellipse(bx, by, r, r * 1.18, 0, 0, Math.PI * 2);
          c.fill();
          if (dw > 18) {
            c.fillStyle = 'rgba(255,255,255,0.45)';
            c.beginPath();
            c.ellipse(bx - r * 0.35, by - r * 0.4, r * 0.22, r * 0.32, -0.5, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
      c.globalAlpha = alpha;
    }
    if (car.lead && dw > 10) {
      c.strokeStyle = '#ffd166';
      c.lineWidth = Math.max(1.2, dw * 0.028);
      for (const k of [-1, 1]) {
        c.beginPath();
        c.arc(x + k * dw * 0.055, top - dw * 0.07, dw * 0.085, 0, Math.PI * 2);
        c.stroke();
      }
    }
  }

  bubble(text, x, bottom, dw) {
    const c = this.ctx;
    const size = clamp(dw * 0.18, 10, 26);
    c.font = `800 ${size}px ${SANS}`;
    const tw = c.measureText(text).width;
    const bw = tw + size * 1.1;
    const bh = size * 1.6;
    const top = bottom - bh - size * 0.4;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect ? c.roundRect(x - bw / 2, top, bw, bh, bh / 2.2) : c.rect(x - bw / 2, top, bw, bh);
    c.fill();
    c.beginPath();
    c.moveTo(x - size * 0.35, top + bh - 1);
    c.lineTo(x + size * 0.25, top + bh - 1);
    c.lineTo(x - size * 0.1, top + bh + size * 0.45);
    c.closePath();
    c.fill();
    c.fillStyle = '#16181d';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x, top + bh / 2 + 0.5);
  }

  // "Saken Kia" over a friend's car: the name in bold, the model smaller and dimmer
  nameTag(text, sub, x, bottom, dw, color) {
    const c = this.ctx;
    const size = clamp(dw * 0.16, 9, 22);
    const small = size * 0.78;
    c.font = `800 ${size}px ${SANS}`;
    const tw = c.measureText(text).width;
    c.font = `600 ${small}px ${SANS}`;
    const sw = sub ? c.measureText(sub).width + size * 0.4 : 0;
    const dotW = Math.max(2, size * 0.3);
    const pw = tw + sw + size * 1.4;
    const ph = size * 1.5;
    const top = bottom - ph;
    const left = x - pw / 2;
    c.fillStyle = 'rgba(9,13,28,0.78)';
    c.beginPath();
    c.roundRect ? c.roundRect(left, top, pw, ph, ph / 2) : c.rect(left, top, pw, ph);
    c.fill();
    c.fillStyle = color;
    c.fillRect(left + ph * 0.35, top + ph * 0.32, dotW, ph * 0.36);
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    const tx = left + ph * 0.35 + dotW + size * 0.35;
    c.font = `800 ${size}px ${SANS}`;
    c.fillStyle = '#f2f4f8';
    c.fillText(text, tx, top + ph / 2 + 0.5);
    if (sub) {
      c.font = `600 ${small}px ${SANS}`;
      c.fillStyle = 'rgba(242,244,248,0.65)';
      c.fillText(sub, tx + tw + size * 0.4, top + ph / 2 + 0.5);
    }
  }

  drawGate(seg, text) {
    const c = this.ctx;
    const p = seg.p1;
    const s = p.scale;
    const half = p.sw * 1.32;
    const postW = Math.max(2, 140 * s * this.FX);
    const gateH = 3300 * s * this.FX;
    const bannerH = 720 * s * this.FX;
    const top = p.sy - gateH;
    if (top >= seg.clip || half < 4) return;
    c.globalAlpha = seg.fog;
    this.withClip(seg.clip, () => {
      c.fillStyle = '#1e2436';
      c.fillRect(p.sx - half - postW, top, postW, gateH);
      c.fillRect(p.sx + half, top, postW, gateH);
      c.fillStyle = '#0d1220';
      c.fillRect(p.sx - half - postW, top, (half + postW) * 2, bannerH);
      c.fillStyle = '#ffb547';
      const stripe = Math.max(1, bannerH * 0.09);
      c.fillRect(p.sx - half - postW, top, (half + postW) * 2, stripe);
      c.fillRect(p.sx - half - postW, top + bannerH - stripe, (half + postW) * 2, stripe);
      if (bannerH > 10 && text) {
        let size = bannerH * 0.5;
        c.font = `800 ${size}px ${SANS}`;
        const max = half * 1.7;
        const width = c.measureText(text).width;
        if (width > max) {
          size *= max / width;
          c.font = `800 ${size}px ${SANS}`;
        }
        c.fillStyle = '#ffb547';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(text, p.sx, top + bannerH / 2);
      }
    });
    c.globalAlpha = 1;
  }

  // avalanche gallery: open columns on the left, rock wall on the right, a slab on top
  drawTunnel(seg, prev, env) {
    const c = this.ctx;
    const { p1, p2 } = seg;
    if (p1.cz <= CAM_DEPTH) return;
    const FX = this.FX;
    const h1 = TUNNEL_H * p1.scale * FX;
    const h2 = TUNNEL_H * p2.scale * FX;
    const xl1 = p1.sx - p1.sw * 1.3;
    const xl2 = p2.sx - p2.sw * 1.3;
    const xr1 = p1.sx + p1.sw * 1.25;
    const xr2 = p2.sx + p2.sw * 1.25;
    const dim = env.night;
    const rock = mix('#6b6f78', '#2a2d34', dim);
    const wall = mix('#9aa0a9', '#454a54', dim);
    const slab = mix('#7d838d', '#2e323a', dim);
    const under = mix('#5c616b', '#1c1f25', dim);
    c.globalAlpha = seg.fog;
    this.withClip(seg.clip, () => {
      // rock face rising above the right wall
      this.poly(xr1, p1.sy - h1 * 0.98, xr1 + p1.sw * 2, p1.sy - h1 * 2.2, xr2 + p2.sw * 2, p2.sy - h2 * 2.2, xr2, p2.sy - h2 * 0.98, rock, true);
      this.poly(xr1, p1.sy, xr1, p1.sy - h1, xr2, p2.sy - h2, xr2, p2.sy, wall, true);
      this.poly(xl1, p1.sy - h1, xr1, p1.sy - h1, xr2, p2.sy - h2, xl2, p2.sy - h2, under, true);
      if (seg.i % 6 === 0) {
        const lw = p1.sw * 0.3;
        c.fillStyle = '#ffe2a8';
        c.fillRect(p1.sx - lw / 2, p1.sy - h1, lw, Math.max(1, h1 * 0.03));
      }
      // parapet and columns on the open side
      this.poly(xl1, p1.sy, xl1, p1.sy - h1 * 0.16, xl2, p2.sy - h2 * 0.16, xl2, p2.sy, wall, true);
      if (seg.i % 3 === 0) {
        const cw = Math.max(1, 220 * p1.scale * FX);
        c.fillStyle = wall;
        c.fillRect(xl1 - cw, p1.sy - h1, cw, h1);
        c.fillStyle = 'rgba(0,0,0,0.2)';
        c.fillRect(xl1 - cw * 0.35, p1.sy - h1, cw * 0.35, h1);
      }
      // the front edge of the slab where the gallery starts
      if (!prev || !prev.tunnel) {
        const th = h1 * 0.32;
        c.fillStyle = slab;
        c.fillRect(xl1 - p1.sw * 0.2, p1.sy - h1 - th, xr1 - xl1 + p1.sw * 0.2, th);
        c.fillStyle = 'rgba(255,181,71,0.85)';
        c.fillRect(xl1 - p1.sw * 0.2, p1.sy - h1 - th * 0.15, xr1 - xl1 + p1.sw * 0.2, Math.max(1, th * 0.12));
      }
    });
    c.globalAlpha = 1;
  }

  drawPlayer(view, pSeg, pPct, env) {
    const c = this.ctx;
    const scale = CAM_DEPTH / PLAYER_Z;
    const v = VEHICLES[view.car.kind] || VEHICLES.hatch;
    const dw = CAR_W * scale * this.FX;
    const dh = dw * v.ratio;
    const camY = lerp(pSeg.p1.cy, pSeg.p2.cy, pPct);
    const baseY = this.HORIZON - scale * camY * this.FY;
    const speedPct = view.speed / BASE_MAX;
    const bounce = view.still ? 0 : (Math.random() - 0.5) * 2 * speedPct * (this.H / 480);
    const cx = this.W / 2;
    const cy = baseY + bounce;

    if (env.lights > 0.35) {
      const beamTop = lerp(cy - dh, this.HORIZON, 0.55);
      const grad = c.createLinearGradient(0, cy - dh * 0.6, 0, beamTop);
      grad.addColorStop(0, `rgba(255,236,196,${0.16 * env.lights})`);
      grad.addColorStop(1, 'rgba(255,236,196,0)');
      c.fillStyle = grad;
      c.beginPath();
      c.moveTo(cx - dw * 0.45, cy - dh * 0.6);
      c.lineTo(cx + dw * 0.45, cy - dh * 0.6);
      c.lineTo(cx + dw * 0.9 + view.steer * dw * 0.3, beamTop);
      c.lineTo(cx - dw * 0.9 + view.steer * dw * 0.3, beamTop);
      c.closePath();
      c.fill();
    }

    c.save();
    c.translate(cx, cy);
    c.rotate(view.steer * 0.04 * Math.min(1, speedPct * 2));
    drawVehicle(c, -dw / 2, -dh, dw, dh, view.car.kind, view.car.color, { braking: view.braking, lights: env.lights, nitro: view.boosting });
    c.restore();
  }

  // ---------- frame ----------

  render(view) {
    const c = this.ctx;
    const { W, H, FY, HORIZON } = this;
    const m = this.map;
    const T = view.track;
    const N = T.segments.length;
    const position = view.position;
    const base = T.segAt(position);
    const basePct = (position % SEG) / SEG;
    const pSeg = T.segAt(position + PLAYER_Z);
    const pPct = ((position + PLAYER_Z) % SEG) / SEG;
    const playerY = lerp(pSeg.p1.y, pSeg.p2.y, pPct);
    const env = { time: view.time, night: m.sky.night, lights: m.sky.night };
    const L = this.layers;

    c.save();
    if (view.shake > 0) c.translate((Math.random() - 0.5) * view.shake * W * 0.012, (Math.random() - 0.5) * view.shake * H * 0.012);
    if (view.roll || view.jolt) {
      // lean into the bends; zoom a touch so the corners stay covered
      const zoom = 1 + Math.abs(view.roll || 0) * 1.7;
      c.translate(W / 2, H * 0.72);
      c.rotate(view.roll || 0);
      c.scale(zoom, zoom);
      c.translate(-W / 2, -H * 0.72 - (view.jolt || 0) * H * 0.035);
    }

    c.drawImage(L.sky, 0, 0);
    if (m.fireworks) this.drawFireworks(view);
    const lift = clamp(playerY * FY * 0.000005, -FY * 0.1, FY * 0.35);
    if (L.clouds) this.drawLayer(L.clouds, view.parallax * 0.0005, lift * 0.2);
    let bottom = HORIZON;
    let bottomColor = m.fogColor;
    L.ranges.forEach((rg, k) => {
      const y = HORIZON - rg.canvas.height + lift * (0.5 + k * 0.5);
      this.drawLayer(rg.canvas, view.parallax * rg.speed, y);
      bottom = y + rg.canvas.height;
      bottomColor = rg.color;
    });
    if (L.skyline) {
      const y = HORIZON - L.skyline.height + lift;
      this.drawLayer(L.skyline, view.parallax * 0.0018, y);
    }
    if (m.water) {
      const wh = FY * 0.07;
      const wy = HORIZON + lift - wh;
      const wg = c.createLinearGradient(0, wy, 0, wy + wh);
      wg.addColorStop(0, m.water.top);
      wg.addColorStop(1, m.water.bottom);
      c.fillStyle = wg;
      c.fillRect(0, wy, W, wh + 2);
      if (this.body) {
        c.fillStyle = rgba(m.water.glint, 0.55);
        for (let k = 0; k < 6; k++) {
          const ww = this.body.r * (2.2 - k * 0.3);
          c.fillRect(this.body.x - ww / 2, wy + (wh * k) / 6 + 1, ww, Math.max(1, wh * 0.06));
        }
      }
      bottom = wy + wh;
      bottomColor = m.water.bottom;
    }
    if (m.eagle) this.drawEagle(view);
    c.fillStyle = bottomColor;
    c.fillRect(0, bottom - 1, W, H);

    // road, near to far
    let maxY = H;
    let x = 0;
    let dx = -(base.curve * basePct);
    for (let n = 0; n < DRAW; n++) {
      const seg = T.segments[(base.i + n) % N];
      seg.looped = seg.i < base.i;
      seg.fog = fogAt(n / DRAW, m.fog);
      seg.clip = maxY;
      const camZ = position - (seg.looped ? T.length : 0);
      this.project(seg.p1, view.playerX * ROAD_W - x, playerY + CAM_H, camZ);
      this.project(seg.p2, view.playerX * ROAD_W - x - dx, playerY + CAM_H, camZ);
      x += dx;
      dx += seg.curve;
      if (seg.p1.cz <= CAM_DEPTH || seg.p2.sy >= seg.p1.sy || seg.p2.sy >= maxY) continue;
      this.drawSegment(seg, T.lanes, n < 130);
      maxY = seg.p1.sy;
    }

    // everything standing on the road, far to near
    for (let n = DRAW - 1; n > 0; n--) {
      const seg = T.segments[(base.i + n) % N];
      if (seg.p1.cz <= CAM_DEPTH) continue;
      if (seg.tunnel) this.drawTunnel(seg, T.segments[(seg.i - 1 + N) % N], env);
      if (seg.rail) this.drawRail(seg, env);
      if (seg.gate) this.drawGate(seg, view.gateLabel(seg));
      for (const s of seg.sprites) {
        const scale = seg.p1.scale;
        const sx = seg.p1.sx + scale * s.offset * ROAD_W * this.FX;
        this.drawSprite(s, scale, sx, seg.p1.sy, s.def.centered ? -0.5 : s.offset < 0 ? -1 : 0, seg.clip, seg.fog, env);
      }
      for (const car of seg.cars) this.drawCar(car, seg, env);
      if (seg === pSeg && view.car) this.drawPlayer(view, pSeg, pPct, env);
    }

    // weather and speed
    if (this.flakes.length && !pSeg.tunnel) this.drawSnow(view);
    if (this.drops && this.drops.length && !pSeg.tunnel) this.drawRain(view);
    if (view.boosting) this.drawSpeedLines();
    if (view.splat > 0) this.drawSplat(view.splat);
    c.drawImage(L.vignette, 0, 0);
    if (view.mud) this.drawMud(view.mud, view.time);
    if (this.confetti.length) this.drawConfetti(view.still ? 0 : Math.min(0.05, view.dt || 0));
    if (this.body && this.body.type === 'sun') {
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(this.body.x, this.body.y, 0, this.body.x, this.body.y, Math.max(W, H) * 0.45);
      g.addColorStop(0, 'rgba(255,220,170,0.22)');
      g.addColorStop(1, 'rgba(255,220,170,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
    }
    if (pSeg.tunnel) {
      c.fillStyle = 'rgba(5,7,12,0.18)';
      c.fillRect(0, 0, W, H);
    }
    if (view.flash > 0) {
      c.fillStyle = `rgba(255,120,90,${view.flash * 0.35})`;
      c.fillRect(0, 0, W, H);
    }
    c.restore();
  }

  drawSnow(view) {
    const c = this.ctx;
    const { W, H } = this;
    const dt = Math.min(0.05, view.dt || 0);
    const speedPct = view.speed / BASE_MAX;
    const drift = -view.steer * speedPct * 0.25 + 0.03 + ((this.map.weather && this.map.weather.wind) || 0);
    const color = this.map.sky.night > 0.5 ? 'rgba(235,240,250,' : 'rgba(255,255,255,';
    const unit = H / 700;
    for (const f of this.flakes) {
      f.y += dt * (0.08 + 0.22 * f.z + speedPct * 0.35 * f.z);
      f.x += dt * (drift + Math.sin((view.time + f.s * 10) * 1.3) * 0.02) * f.z;
      // at speed the flakes stream away from the centre
      f.x += dt * (f.x - 0.5) * speedPct * 0.9 * f.z;
      if (f.y > 1 || f.x < -0.05 || f.x > 1.05) {
        f.y = Math.random() * 0.3 - 0.05;
        f.x = Math.random();
      }
      c.fillStyle = color + (0.5 + f.z * 0.4) + ')';
      const r = Math.max(0.8, f.z * 2.4 * unit);
      c.fillRect(f.x * W, f.y * H, r, r);
    }
  }

  // rain: thin slanted streaks, longer and denser at speed
  drawRain(view) {
    const c = this.ctx;
    const { W, H } = this;
    const dt = view.still ? 0 : Math.min(0.05, view.dt || 0);
    const speedPct = view.speed / BASE_MAX;
    const slant = 0.12 - view.steer * speedPct * 0.15;
    c.strokeStyle = this.map.sky.night > 0.5 ? 'rgba(170,185,205,0.32)' : 'rgba(220,228,236,0.36)';
    c.lineWidth = Math.max(1, H / 900);
    c.beginPath();
    for (const d of this.drops) {
      d.y += dt * (1.4 + d.z * 1.4 + speedPct * 0.6);
      d.x += dt * slant * d.z + dt * (d.x - 0.5) * speedPct * 0.6 * d.z;
      if (d.y > 1.05 || d.x < -0.05 || d.x > 1.05) {
        d.y = -Math.random() * 0.1;
        d.x = Math.random();
      }
      const len = (0.02 + d.z * 0.03 + speedPct * 0.02) * H;
      const x = d.x * W;
      const y = d.y * H;
      c.moveTo(x, y);
      c.lineTo(x - slant * len * 0.6, y - len);
    }
    c.stroke();
  }

  drawSpeedLines() {
    const c = this.ctx;
    const { W, H, HORIZON } = this;
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.lineWidth = Math.max(1, H / 500);
    c.beginPath();
    for (let k = 0; k < 18; k++) {
      const a = Math.random() * Math.PI * 2;
      const r0 = Math.max(W, H) * (0.35 + Math.random() * 0.15);
      const r1 = r0 + Math.max(W, H) * (0.12 + Math.random() * 0.2);
      c.moveTo(W / 2 + Math.cos(a) * r0, HORIZON + Math.sin(a) * r0 * 0.6);
      c.lineTo(W / 2 + Math.cos(a) * r1, HORIZON + Math.sin(a) * r1 * 0.6);
    }
    c.stroke();
  }
}
