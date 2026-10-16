// Everything is drawn in code: a summer yard at evening, the sun low on the left, long shadows,
// warm light like an old photo. The ground is baked once per resize; bones are pre-drawn sprites.
import { FIELD, KON, LINE_Y } from './physics.js';
import { rng, shade } from './util.js';

const SUN = { x: 0.62, y: 0.5 }; // shadow direction (sun at the top left)
const COL = {
  dirt: '#c9a273',
  dirtDark: '#a98157',
  grass: '#8a8a52',
  wall: '#c08d5c',
  wallTop: '#d9ab78',
  line: 'rgba(84, 52, 28, 0.55)',
  bone: '#f1e5c9',
  dyed: '#d8436e',
  saka: '#8f2f2a',
};

export const view = { s: 4, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 };
let ground = null;
let overlay = null;
let grain = null;
const sprites = new Map();

// On a wide screen the yard lies on its side: the throw line on the left, the kon to the right.
// World "up" (−y) is screen right then; the turn is a proper rotation, so sprites only add 90°.
export const W = (x, y) => (view.rot ? [view.ox + (FIELD.h - y) * view.s, view.oy + x * view.s] : [view.ox + x * view.s, view.oy + y * view.s]);
export const toWorld = (px, py) =>
  view.rot ? { x: (py - view.oy) / view.s, y: FIELD.h - (px - view.ox) / view.s } : { x: (px - view.ox) / view.s, y: (py - view.oy) / view.s };
// a finger movement on screen as a world vector
export const toWorldVec = (dx, dy) => (view.rot ? { x: dy / view.s, y: -dx / view.s } : { x: dx / view.s, y: dy / view.s });
const angle = (a) => (view.rot ? a + Math.PI / 2 : a);

// fit the yard between the top bar and the throw panel
export function resize(canvas, top, bottom) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const pad = 6; // a wall around the yard
  const availH = h - top - bottom;
  const rot = w > h * 1.1;
  const fu = rot ? FIELD.h : FIELD.w;
  const fv = rot ? FIELD.w : FIELD.h;
  // across the screen the wall alone is enough room; on a phone every pixel of width counts
  const s = Math.min((w - 12) / (fu + (rot ? pad * 2 : 7)), availH / (fv + pad * 2));
  const fx = (w - fu * s) / 2;
  const fy = top + (availH - fv * s) / 2;
  // ox/oy: where world (0,0) lands; fx..: the yard on screen
  Object.assign(view, { s, w, h, dpr, rot, fx, fy, fw: fu * s, fh: fv * s, ox: fx, oy: fy });
  bakeGround();
  bakeOverlay();
  sprites.clear();
}

function canvas2(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// jittered line, as if scratched with a stick
function scratch(c, pts, r, width, color) {
  c.strokeStyle = color;
  c.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    c.lineWidth = width * (pass ? 0.45 : 1);
    c.globalAlpha = pass ? 0.5 : 0.85;
    c.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = x + (r() - 0.5) * width * 0.9;
      const jy = y + (r() - 0.5) * width * 0.9;
      if (i) c.lineTo(jx, jy);
      else c.moveTo(jx, jy);
    });
    c.stroke();
  }
  c.globalAlpha = 1;
}

function bakeGround() {
  const { w, h, dpr, s, fx, fy, fw, fh } = view;
  const g = canvas2(w * dpr, h * dpr);
  const c = g.getContext('2d');
  c.scale(dpr, dpr);
  const r = rng(1986);

  // around the yard: dusty grass of the aul
  c.fillStyle = COL.grass;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 90; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(60, 70, 30, 0.18)' : 'rgba(210, 200, 120, 0.14)';
    const x = r() * w;
    const y = r() * h;
    c.fillRect(x, y, 1.2, 2 + r() * 4);
  }

  const wallT = 3.2 * s;

  // the yard: trodden dirt
  const grd = c.createLinearGradient(fx, fy, fx + fw, fy + fh);
  grd.addColorStop(0, shade(COL.dirt, 0.08));
  grd.addColorStop(1, shade(COL.dirt, -0.06));
  c.fillStyle = grd;
  c.fillRect(fx, fy, fw, fh);
  c.save();
  c.beginPath();
  c.rect(fx, fy, fw, fh);
  c.clip();
  // blotches of darker and lighter dirt
  for (let i = 0; i < 60; i++) {
    const x = fx + r() * fw;
    const y = fy + r() * fh;
    const rad = (4 + r() * 14) * s;
    const b = c.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.55;
    b.addColorStop(0, dark ? 'rgba(120, 82, 48, 0.16)' : 'rgba(240, 210, 160, 0.16)');
    b.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = b;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // grit
  const n = (fw * fh) / 26;
  const [kx, ky] = W(KON.x, KON.y);
  for (let i = 0; i < n; i++) {
    const x = fx + r() * fw;
    const y = fy + r() * fh;
    const v = r();
    c.fillStyle = v < 0.5 ? `rgba(90, 60, 35, ${0.08 + r() * 0.15})` : `rgba(255, 240, 210, ${0.08 + r() * 0.15})`;
    const sz = 0.6 + r() * 1.3;
    c.fillRect(x, y, sz, sz);
  }
  // pebbles with their own small shadows
  for (let i = 0; i < 40; i++) {
    const x = fx + r() * fw;
    const y = fy + r() * fh;
    if (Math.hypot(x - kx, y - ky) / s < KON.r + 3) continue;
    const rad = (0.35 + r() * 0.7) * s;
    c.fillStyle = 'rgba(70, 45, 25, 0.35)';
    c.beginPath();
    c.ellipse(x + rad * 0.5, y + rad * 0.4, rad, rad * 0.75, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = shade('#b9a58a', (r() - 0.5) * 0.4);
    c.beginPath();
    c.ellipse(x, y, rad, rad * 0.75, r() * 3, 0, Math.PI * 2);
    c.fill();
  }
  // the circle of the kon and the throw line, scratched in the dirt
  const ring = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    ring.push(W(KON.x + Math.cos(a) * KON.r, KON.y + Math.sin(a) * KON.r));
  }
  scratch(c, ring, r, Math.max(1.5, s * 0.55), COL.line);
  const line = [];
  for (let i = 0; i <= 24; i++) line.push(W(6 + (i / 24) * (FIELD.w - 12), LINE_Y + 3.6));
  scratch(c, line, r, Math.max(1.5, s * 0.5), COL.line);
  // the shadow of the wall falls into the yard from the top and the left
  const sh = 7 * s;
  let lg = c.createLinearGradient(0, fy, 0, fy + sh);
  lg.addColorStop(0, 'rgba(60, 30, 20, 0.38)');
  lg.addColorStop(1, 'rgba(60, 30, 20, 0)');
  c.fillStyle = lg;
  c.fillRect(fx, fy, fw, sh);
  lg = c.createLinearGradient(fx, 0, fx + sh, 0);
  lg.addColorStop(0, 'rgba(60, 30, 20, 0.3)');
  lg.addColorStop(1, 'rgba(60, 30, 20, 0)');
  c.fillStyle = lg;
  c.fillRect(fx, fy, sh, fh);
  c.restore();

  // low adobe wall: saman bricks, lit from the top left
  const wall = (x, y, ww, hh) => {
    c.fillStyle = 'rgba(40, 20, 10, 0.3)';
    c.fillRect(x + 0.6 * s, y + 0.9 * s, ww, hh);
    c.fillStyle = COL.wall;
    c.fillRect(x, y, ww, hh);
    c.strokeStyle = 'rgba(90, 55, 30, 0.35)';
    c.lineWidth = Math.max(1, s * 0.18);
    const bw = 5.5 * s;
    const bh = wallT / 2;
    const horiz = ww > hh;
    for (let row = 0; row < 2; row++) {
      if (horiz) {
        c.beginPath();
        c.moveTo(x, y + bh * (row + 1));
        c.lineTo(x + ww, y + bh * (row + 1));
        c.stroke();
        for (let bx = x + (row ? bw / 2 : 0); bx < x + ww; bx += bw) {
          c.beginPath();
          c.moveTo(bx, y + bh * row);
          c.lineTo(bx, y + bh * (row + 1));
          c.stroke();
        }
      } else {
        c.beginPath();
        c.moveTo(x + bh * (row + 1), y);
        c.lineTo(x + bh * (row + 1), y + hh);
        c.stroke();
        for (let by = y + (row ? bw / 2 : 0); by < y + hh; by += bw) {
          c.beginPath();
          c.moveTo(x + bh * row, by);
          c.lineTo(x + bh * (row + 1), by);
          c.stroke();
        }
      }
    }
    // straw and crumbs in the clay
    for (let i = 0; i < (ww * hh) / (s * s * 2); i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(240, 210, 150, 0.35)' : 'rgba(110, 70, 40, 0.3)';
      c.fillRect(x + r() * ww, y + r() * hh, s * 0.5, s * 0.15);
    }
    c.fillStyle = 'rgba(255, 230, 180, 0.25)';
    if (horiz) c.fillRect(x, y, ww, s * 0.5);
    else c.fillRect(x, y, s * 0.5, hh);
  };
  wall(fx - wallT, fy - wallT, fw + wallT * 2, wallT);
  wall(fx - wallT, fy + fh, fw + wallT * 2, wallT);
  wall(fx - wallT, fy, wallT, fh);
  wall(fx + fw, fy, wallT, fh);
  ground = g;
}

// warm evening light, vignette: the old photograph look on top of everything
function bakeOverlay() {
  const { w, h, dpr } = view;
  const o = canvas2(w * dpr, h * dpr);
  const c = o.getContext('2d');
  c.scale(dpr, dpr);
  const sun = c.createRadialGradient(w * 0.05, h * 0.02, 0, w * 0.05, h * 0.02, Math.max(w, h) * 1.1);
  sun.addColorStop(0, 'rgba(255, 214, 140, 0.30)');
  sun.addColorStop(0.5, 'rgba(255, 170, 90, 0.08)');
  sun.addColorStop(1, 'rgba(90, 40, 60, 0.18)');
  c.fillStyle = sun;
  c.fillRect(0, 0, w, h);
  const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(40, 20, 15, 0.45)');
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
  overlay = o;
  // film grain tile
  const gt = canvas2(160, 160);
  const gc = gt.getContext('2d');
  const id = gc.createImageData(160, 160);
  const r = rng(7);
  for (let i = 0; i < id.data.length; i += 4) {
    const k = r() * 255;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = k;
    id.data[i + 3] = 22;
  }
  gc.putImageData(id, 0, 0);
  grain = gt;
}

// a knucklebone seen from above: a long knobby block, pinched in the middle
function boneSprite(kind, painted, r) {
  const key = kind + painted + Math.round(r * view.s * view.dpr);
  if (sprites.has(key)) return sprites.get(key);
  const px = view.s * view.dpr;
  const L = r * 1.3 * px; // half length
  const W = r * 0.92 * px; // half width
  const m = Math.ceil(Math.max(L, W) + 4);
  const cv = canvas2(m * 2, m * 2);
  const c = cv.getContext('2d');
  c.translate(m, m);
  const base = kind === 'saka' ? COL.saka : painted ? COL.dyed : COL.bone;
  const path = () => {
    c.beginPath();
    c.moveTo(-L, -W * 0.7);
    c.bezierCurveTo(-L * 0.9, -W * 1.05, -L * 0.45, -W * 1.05, -L * 0.2, -W * 0.82);
    c.bezierCurveTo(0, -W * 0.68, L * 0.15, -W * 0.7, L * 0.35, -W * 0.92);
    c.bezierCurveTo(L * 0.7, -W * 1.1, L * 1.02, -W * 0.85, L, -W * 0.3);
    c.bezierCurveTo(L * 1.06, W * 0.2, L * 0.95, W * 0.95, L * 0.55, W * 0.95);
    c.bezierCurveTo(L * 0.25, W * 0.95, L * 0.05, W * 0.72, -L * 0.2, W * 0.8);
    c.bezierCurveTo(-L * 0.55, W * 1.0, -L * 0.98, W * 1.0, -L * 1.02, W * 0.4);
    c.closePath();
  };
  path();
  const body = c.createRadialGradient(-L * 0.35, -W * 0.45, W * 0.1, 0, 0, L * 1.2);
  body.addColorStop(0, shade(base, 0.35));
  body.addColorStop(0.55, base);
  body.addColorStop(1, shade(base, -0.35));
  c.fillStyle = body;
  c.fill();
  c.lineWidth = Math.max(1, px * 0.18);
  c.strokeStyle = shade(base, -0.5);
  c.stroke();
  // the groove and the knobs of a real bone
  c.save();
  path();
  c.clip();
  c.strokeStyle = shade(base, -0.28);
  c.lineWidth = Math.max(1, px * 0.25);
  c.beginPath();
  c.moveTo(-L * 0.55, W * 0.05);
  c.bezierCurveTo(-L * 0.2, -W * 0.25, L * 0.2, W * 0.25, L * 0.6, -W * 0.05);
  c.stroke();
  c.fillStyle = shade(base, 0.45);
  c.globalAlpha = 0.55;
  c.beginPath();
  c.ellipse(-L * 0.5, -W * 0.45, L * 0.28, W * 0.18, -0.2, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(L * 0.55, -W * 0.5, L * 0.2, W * 0.14, 0.3, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
  if (kind === 'saka') {
    // lead poured into the saka: a dull spot
    c.fillStyle = '#6d6f73';
    c.beginPath();
    c.ellipse(L * 0.1, W * 0.35, L * 0.18, W * 0.2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.ellipse(L * 0.06, W * 0.3, L * 0.07, W * 0.07, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  const spr = { cv, m };
  sprites.set(key, spr);
  return spr;
}

export function drawBone(c, b, lift = 0, alpha = 1) {
  const { s } = view;
  const [x, y] = W(b.x, b.y);
  const a = angle(b.ang);
  const spr = boneSprite(b.kind, b.painted, b.r);
  // long evening shadow, further away when the bone is in the air
  const off = (0.9 + lift * 5) * s;
  c.save();
  c.globalAlpha = alpha * (0.42 - lift * 0.15);
  c.fillStyle = '#3a2214';
  c.beginPath();
  c.ellipse(x + off * SUN.x, y + off * SUN.y, b.r * 1.25 * s, b.r * 0.85 * s, a, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y - lift * 3 * s);
  c.rotate(a);
  const k = (1 + lift * 0.35) / view.dpr;
  c.scale(k, k);
  c.drawImage(spr.cv, -spr.m, -spr.m);
  c.restore();
}

export function drawGround(c) {
  c.drawImage(ground, 0, 0, view.w, view.h);
}

export function drawOverlay(c, t) {
  c.drawImage(overlay, 0, 0, view.w, view.h);
  const pat = c.createPattern(grain, 'repeat');
  c.save();
  c.translate(((t * 997) % 160) | 0, ((t * 613) % 160) | 0);
  c.fillStyle = pat;
  c.fillRect(-160, -160, view.w + 320, view.h + 320);
  c.restore();
}

// the aiming guide: rubber band behind the saka, dotted path, ghost at the first touch
export function drawAim(c, s, aim, guide, t) {
  const [sx, sy] = W(s.x, s.y);
  const p = aim.power;
  const col = p < 0.5 ? '#fff3cf' : p < 0.85 ? '#ffc35a' : '#ff7a45';
  // band from the finger side
  c.save();
  c.strokeStyle = 'rgba(70, 30, 15, 0.55)';
  c.lineWidth = Math.max(2, view.s * 0.5);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(sx, sy);
  c.lineTo(...W(s.x - aim.ux * p * 14, s.y - aim.uy * p * 14));
  c.stroke();
  // dotted path to the first touch
  const [gx, gy] = W(guide.x, guide.y);
  const len = Math.hypot(gx - sx, gy - sy);
  const step = view.s * 2.2;
  c.fillStyle = col;
  for (let d = view.s * 4 + ((t * 30) % step); d < len; d += step) {
    const k = d / len;
    const px = sx + (gx - sx) * k;
    const py = sy + (gy - sy) * k;
    const rad = Math.max(2.2, view.s * 0.5);
    c.globalAlpha = 0.95 - k * 0.45;
    c.fillStyle = 'rgba(60, 25, 10, 0.45)';
    c.beginPath();
    c.arc(px + 1, py + 1.2, rad, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = col;
    c.beginPath();
    c.arc(px, py, rad, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  // ghost saka where it first touches
  c.strokeStyle = col;
  c.lineWidth = 2.5;
  c.setLineDash([5, 4]);
  c.beginPath();
  c.arc(gx, gy, s.r * view.s, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);
  if (guide.hit) {
    const h = guide.hit;
    c.globalAlpha = 0.85;
    c.lineWidth = Math.max(2, view.s * 0.4);
    c.beginPath();
    c.moveTo(...W(h.x, h.y));
    c.lineTo(...W(h.x + guide.nx * 9, h.y + guide.ny * 9));
    c.stroke();
    c.globalAlpha = 1;
  }
  // power ring around the saka
  c.strokeStyle = 'rgba(40, 20, 10, 0.35)';
  c.lineWidth = 4;
  c.beginPath();
  c.arc(sx, sy, (s.r + 2.4) * view.s, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = col;
  c.beginPath();
  c.arc(sx, sy, (s.r + 2.4) * view.s, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  c.stroke();
  c.restore();
}

// arrows on the line: the saka can be moved along it before the throw
export function drawLineHint(c, s, t) {
  const [sx, sy] = W(s.x, s.y);
  const [lx, ly] = W(s.x + 1, s.y);
  const ex = (lx - sx) / view.s; // the line's direction on screen
  const ey = (ly - sy) / view.s;
  const a = 0.45 + Math.sin(t * 4) * 0.25;
  c.save();
  c.fillStyle = `rgba(255, 244, 214, ${a})`;
  for (const dir of [-1, 1]) {
    const [x, y] = W(s.x + dir * (s.r + 3.2 + Math.sin(t * 4) * 0.6), s.y);
    const u = view.s;
    c.beginPath();
    c.moveTo(x + dir * ex * 1.6 * u, y + dir * ey * 1.6 * u);
    c.lineTo(x - ey * 1.3 * u, y + ex * 1.3 * u);
    c.lineTo(x + ey * 1.3 * u, y - ex * 1.3 * u);
    c.closePath();
    c.fill();
  }
  c.restore();
}

// a hand that shows the pull-back gesture on the first kon
export function drawHand(c, s, t) {
  const [sx, sy] = W(s.x, s.y);
  const k = (t % 2.2) / 2.2;
  const pull = k < 0.6 ? k / 0.6 : 1;
  const fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
  const [x, y] = W(s.x + 2, s.y + 4 + pull * 12);
  c.save();
  c.globalAlpha = 0.9 * fade;
  c.font = `${Math.round(view.s * 7)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  c.textAlign = 'center';
  c.fillText('👆', x, y + view.s * 3);
  c.globalAlpha = 0.5 * fade * pull;
  c.strokeStyle = '#fff3cf';
  c.lineWidth = 3;
  c.setLineDash([5, 6]);
  c.beginPath();
  c.moveTo(sx, sy);
  c.lineTo(...W(s.x, s.y - pull * 30));
  c.stroke();
  c.restore();
}

export function drawDust(c, parts) {
  for (const p of parts) {
    const [x, y] = W(p.x, p.y);
    c.globalAlpha = Math.max(0, p.life / p.max) * p.a;
    c.fillStyle = p.col;
    c.beginPath();
    c.arc(x, y, p.r * view.s, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}

export function drawPopups(c, pops) {
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const p of pops) {
    const k = 1 - p.life / p.max;
    const [x, y0] = W(p.x, p.y);
    const u = Math.max(view.s, 3.4); // text stays readable on a small yard
    const y = y0 - k * 9 * u;
    const sc = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15) * 0.5);
    c.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    c.font = `900 ${Math.round(u * p.size * sc)}px "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif`;
    c.lineWidth = Math.max(3, u * 0.9);
    c.strokeStyle = 'rgba(60, 25, 10, 0.85)';
    c.strokeText(p.text, x, y);
    c.fillStyle = p.col;
    c.fillText(p.text, x, y);
  }
  c.restore();
}
