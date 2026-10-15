// Drawing. Heavy parts (background, block and token sprites, the board) are drawn once into
// offscreen canvases; each frame only composes them and the moving bits, so it stays smooth on phones.
import { clamp, lerp, easeOut, easeBack, shade, roundRect, rng, hexToRgb } from './util.js';

// dark colors get a light edge, or they sink into the dark background
const isDark = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 70;
};

const TAU = Math.PI * 2;
const SIDE_ANGLE = [-Math.PI / 2, Math.PI, Math.PI / 2, 0];

function offscreen(w, h) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.c = canvas.getContext('2d');
    this.dpr = 1;
    this.w = 1;
    this.h = 1;
    this.game = null;
    this.tokens = new Map();
    this.projectiles = [];
    this.particles = [];
    this.time = 0;
    this.hint = null;
    this.win = null;
    this.dockFlash = 0;
    this.pipShake = 0;
    this.onArrive = null;
  }

  resize(w, h) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.cv.width = Math.round(w * this.dpr);
    this.cv.height = Math.round(h * this.dpr);
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';
    this.bg = this.makeBackground();
    if (this.game) this.prepare();
  }

  setGame(game) {
    this.game = game;
    this.tokens.clear();
    this.projectiles.length = 0;
    this.particles.length = 0;
    this.win = null;
    this.dockFlash = 0;
    this.vis = new Uint8Array(game.grid.length);
    for (let i = 0; i < game.grid.length; i++) this.vis[i] = game.grid[i] >= 0 ? 1 : 0;
    this.prepare();
  }

  // ---------- layout ----------

  prepare() {
    const g = this.game;
    const { w, h } = this;
    const hud = 60;
    const portrait = h > w * 1.02;
    let area;
    if (portrait) {
      const bottom = clamp(h * 0.3, 180, 290);
      area = { x: 8, y: hud, w: w - 16, h: h - hud - bottom };
      this.panel = { x: 0, y: h - bottom, w, h: bottom, portrait: true };
    } else {
      const pw = clamp(w * 0.34, 230, 400);
      area = { x: 12, y: hud - 6, w: w - pw - 24, h: h - hud };
      this.panel = { x: w - pw - 8, y: hud, w: pw, h: h - hud - 12, portrait: false };
    }
    let cell = 10;
    let tokenR = 14;
    let mv = 1.6;
    for (let k = 0; k < 3; k++) {
      cell = Math.min(area.w / (g.W + 2 * mv + 1.1), area.h / (g.H + 2 * mv + 1.1));
      tokenR = clamp(cell * 0.95, 13, 21);
      mv = Math.max(1.25, (tokenR * 1.3) / cell);
    }
    cell = Math.floor(cell * 4) / 4;
    this.cell = cell;
    this.tokenR = tokenR;
    this.mv = mv;
    this.bx = Math.round(area.x + (area.w - g.W * cell) / 2);
    this.by = Math.round(area.y + (area.h - g.H * cell) / 2);
    const off = mv * cell;
    this.track = { x0: this.bx - off, y0: this.by - off, x1: this.bx + g.W * cell + off, y1: this.by + g.H * cell + off, r: off * 0.9 };

    // dock and queues
    const p = this.panel;
    const slots = g.dock.length;
    const qr = clamp(Math.min(p.w / (g.queues.length * 2.6), p.h / 7), 20, 34);
    this.qr = qr;
    const dr = clamp(Math.min(p.w / (slots * 2.5), 28), 16, 26);
    this.dr = dr;
    const dockY = p.y + dr + 26;
    this.dockPos = [];
    const dGap = dr * 2.45;
    for (let j = 0; j < slots; j++) this.dockPos.push({ x: p.x + p.w / 2 + (j - (slots - 1) / 2) * dGap, y: dockY });
    const qTop = dockY + dr + 22 + qr;
    const colW = Math.min(p.w / g.queues.length, qr * 3.2);
    this.queuePos = g.queues.map((_, i) => ({ x: p.x + p.w / 2 + (i - (g.queues.length - 1) / 2) * colW, y: qTop }));
    // tokens behind the front one: as many as fit below it
    const room = p.y + p.h - qTop - qr * 0.9;
    this.behind = clamp(Math.floor(room / (qr * 0.95)), 0, 3);
    this.queueStep = qr * 0.95;
    // deeper in the queue the colors are hidden (later levels): only the front ones are known
    const idx = g.level.index;
    this.hideFrom = idx >= 15 ? 1 : idx >= 6 ? 2 : 99;

    this.blockSprites = g.level.palette.map((col) => this.makeBlock(col));
    this.tokenSprites = g.level.palette.map((col) => this.makeToken(col, tokenR));
    this.queueSprites = g.level.palette.map((col) => this.makeToken(col, qr));
    this.dockSprites = g.level.palette.map((col) => this.makeToken(col, dr));
    this.hiddenSprite = this.makeToken('#6b6280', qr);
    this.boardBg = this.makeBoardBg();
    this.blocks = offscreen(g.W * cell * this.dpr, g.H * cell * this.dpr);
    this.redrawBlocks();
  }

  // ---------- sprites ----------

  makeBackground() {
    const { dpr } = this;
    const cv = offscreen(this.w * dpr, this.h * dpr);
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, '#2a1640');
    g.addColorStop(0.55, '#1a1233');
    g.addColorStop(1, '#0e1a2c');
    c.fillStyle = g;
    c.fillRect(0, 0, this.w, this.h);
    // faint mirrored ornament tiles
    c.globalAlpha = 0.06;
    c.strokeStyle = '#f4b93a';
    c.lineWidth = 2;
    const t = 64;
    for (let y = -t; y < this.h + t; y += t) {
      for (let x = (y / t) % 2 ? t / 2 : 0; x < this.w + t; x += t) {
        c.beginPath();
        c.moveTo(x, y - 14);
        c.lineTo(x + 14, y);
        c.lineTo(x, y + 14);
        c.lineTo(x - 14, y);
        c.closePath();
        c.stroke();
        for (const s of [-1, 1]) {
          c.beginPath();
          c.arc(x + s * 20, y - 6, 6, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 2.4 : -Math.PI * 1.4, s < 0);
          c.stroke();
        }
      }
    }
    c.globalAlpha = 1;
    const v = c.createRadialGradient(this.w / 2, this.h * 0.42, Math.min(this.w, this.h) * 0.2, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = v;
    c.fillRect(0, 0, this.w, this.h);
    return cv;
  }

  makeBlock(col) {
    const s = this.cell * this.dpr;
    const cv = offscreen(s, s);
    const c = cv.getContext('2d');
    const gap = Math.max(1, s * 0.07);
    const r = s * 0.2;
    const x = gap / 2;
    const w = s - gap;
    const g = c.createLinearGradient(0, x, 0, x + w);
    g.addColorStop(0, shade(col, 0.28));
    g.addColorStop(0.55, col);
    g.addColorStop(1, shade(col, -0.22));
    roundRect(c, x, x, w, w, r);
    c.fillStyle = g;
    c.fill();
    // bevel: a light top edge and a dark bottom edge
    c.save();
    roundRect(c, x, x, w, w, r);
    c.clip();
    c.fillStyle = 'rgba(255,255,255,0.28)';
    c.fillRect(x, x, w, Math.max(1, w * 0.12));
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(x, x + w * 0.88, w, w * 0.12);
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    c.ellipse(x + w * 0.3, x + w * 0.28, w * 0.14, w * 0.08, -0.5, 0, TAU);
    c.fill();
    if (isDark(col)) {
      roundRect(c, x + 0.5, x + 0.5, w - 1, w - 1, r);
      c.lineWidth = Math.max(1, s * 0.05);
      c.strokeStyle = 'rgba(200,190,240,0.45)';
      c.stroke();
    }
    return cv;
  }

  makeToken(col, r) {
    const { dpr } = this;
    const pad = r * 0.35;
    const size = (r * 2 + pad * 2) * dpr;
    const cv = offscreen(size, size);
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    const cx = r + pad;
    const cy = r + pad;
    // soft shadow
    const sh = c.createRadialGradient(cx, cy + r * 0.35, r * 0.4, cx, cy + r * 0.35, r * 1.25);
    sh.addColorStop(0, 'rgba(0,0,0,0.45)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh;
    c.fillRect(0, 0, size, size);
    const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, shade(col, 0.45));
    g.addColorStop(0.6, col);
    g.addColorStop(1, shade(col, -0.3));
    c.beginPath();
    c.arc(cx, cy, r, 0, TAU);
    c.fillStyle = g;
    c.fill();
    c.lineWidth = Math.max(1.5, r * 0.1);
    c.strokeStyle = isDark(col) ? 'rgba(220,210,255,0.55)' : shade(col, -0.45);
    c.stroke();
    c.beginPath();
    c.arc(cx, cy, r * 0.78, 0, TAU);
    c.lineWidth = Math.max(1, r * 0.06);
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath();
    c.ellipse(cx - r * 0.32, cy - r * 0.42, r * 0.36, r * 0.18, -0.5, 0, TAU);
    c.fill();
    return { cv, r, pad };
  }

  makeBoardBg() {
    const g = this.game;
    const { cell, dpr } = this;
    const pad = cell * 0.45;
    const cv = offscreen((g.W * cell + pad * 2) * dpr, (g.H * cell + pad * 2) * dpr);
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    roundRect(c, 0, 0, g.W * cell + pad * 2, g.H * cell + pad * 2, cell * 0.6);
    c.fillStyle = 'rgba(8,6,18,0.55)';
    c.fill();
    c.lineWidth = 1.5;
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.045)';
    for (let y = 0; y < g.H; y++) {
      for (let x = 0; x < g.W; x++) {
        roundRect(c, pad + x * cell + cell * 0.2, pad + y * cell + cell * 0.2, cell * 0.6, cell * 0.6, cell * 0.15);
        c.fill();
      }
    }
    return { cv, pad };
  }

  redrawBlocks() {
    const g = this.game;
    const c = this.blocks.getContext('2d');
    c.clearRect(0, 0, this.blocks.width, this.blocks.height);
    const s = this.cell * this.dpr;
    for (let i = 0; i < this.vis.length; i++) {
      if (!this.vis[i]) continue;
      const col = g.level.grid[i];
      c.drawImage(this.blockSprites[col], (i % g.W) * s, Math.floor(i / g.W) * s);
    }
  }

  clearBlock(i) {
    const g = this.game;
    const s = this.cell * this.dpr;
    this.vis[i] = 0;
    this.blocks.getContext('2d').clearRect((i % g.W) * s, Math.floor(i / g.W) * s, s, s);
  }

  // ---------- geometry ----------

  cellCenter(i) {
    const g = this.game;
    return { x: this.bx + ((i % g.W) + 0.5) * this.cell, y: this.by + (Math.floor(i / g.W) + 0.5) * this.cell };
  }

  // belt position: the game's distance along the belt -> screen point, rounded at the corners
  trackPoint(s) {
    const g = this.game;
    const { x0, y0, x1, y1, r } = this.track;
    const { cell, mv } = this;
    const m = g.m;
    const map = (u, n) => {
      if (u < m) return (u / m) * mv * cell;
      if (u < m + n) return mv * cell + (u - m) * cell;
      return mv * cell + n * cell + Math.min(1, (u - m - n) / m) * mv * cell;
    };
    const [cb, cr, ct, cl] = g.corners;
    let side;
    let p;
    s = clamp(s, 0, g.length);
    if (s < cr) {
      side = 0;
      p = { x: x0 + map(s - cb, g.W), y: y1 };
    } else if (s < ct) {
      side = 1;
      p = { x: x1, y: y1 - map(s - cr, g.H) };
    } else if (s < cl) {
      side = 2;
      p = { x: x1 - map(s - ct, g.W), y: y0 };
    } else {
      side = 3;
      p = { x: x0, y: y0 + map(s - cl, g.H) };
    }
    // corners follow the rounded rail
    const cxs = [x0 + r, x1 - r];
    const cys = [y0 + r, y1 - r];
    for (const cx of cxs) {
      for (const cy of cys) {
        const inX = cx < (x0 + x1) / 2 ? p.x < cx : p.x > cx;
        const inY = cy < (y0 + y1) / 2 ? p.y < cy : p.y > cy;
        if (inX && inY) {
          const a = Math.atan2(p.y - cy, p.x - cx);
          p = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
        }
      }
    }
    return { x: p.x, y: p.y, side };
  }

  tokenTarget(sh) {
    const g = this.game;
    if (sh.where === 'queue') {
      for (let q = 0; q < g.queues.length; q++) {
        const k = g.queues[q].indexOf(sh);
        if (k >= 0) {
          const base = this.queuePos[q];
          const shown = k <= this.behind;
          const y = k ? base.y + this.qr * 1.2 + (k - 1) * this.queueStep : base.y;
          return { x: base.x, y: shown ? y : base.y + this.qr * 1.2 + this.behind * this.queueStep, sc: k ? 0.66 : 1, a: shown ? (k ? 0.85 - k * 0.12 : 1) : 0, kind: 'queue', front: k === 0, hidden: k >= this.hideFrom };
        }
      }
    }
    if (sh.where === 'dock') {
      const d = g.dock.indexOf(sh);
      const p = this.dockPos[d];
      return { x: p.x, y: p.y, sc: 1, a: 1, kind: 'dock' };
    }
    if (sh.where === 'pending') {
      const p = this.trackPoint(0);
      const k = g.pending.indexOf(sh);
      return { x: p.x - this.tokenR * 0.6, y: p.y + this.tokenR * (1.1 + k * 0.9), sc: 0.9, a: 1, kind: 'belt' };
    }
    if (sh.where === 'belt') {
      const p = this.trackPoint(sh.s);
      return { x: p.x, y: p.y, sc: 1, a: 1, kind: 'belt', side: p.side, exact: true };
    }
    return null;
  }

  // ---------- events from the game ----------

  handle(e) {
    const g = this.game;
    if (e.type === 'shot') {
      const t = this.tokens.get(e.shooter.id);
      const from = t ? { x: t.x, y: t.y } : this.trackPoint(e.shooter.s);
      const to = this.cellCenter(e.cell);
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      this.projectiles.push({ x0: from.x, y0: from.y, x1: to.x, y1: to.y, t: 0, dur: clamp(dist / 1400, 0.05, 0.16), color: g.level.palette[e.color], cell: e.cell });
      if (t) t.kick = 1;
    } else if (e.type === 'spent') {
      const t = this.tokens.get(e.shooter.id);
      if (t) {
        t.dying = 0.001;
        this.burst(t.x, t.y, g.level.palette[e.shooter.color], 14, this.tokenR * 0.5, 1.4);
        this.ring(t.x, t.y, '#ffffff', this.tokenR * 1.2);
      }
    } else if (e.type === 'overflow') {
      this.dockFlash = 1;
    } else if (e.type === 'beltFull') {
      this.pipShake = 1;
    }
  }

  // ---------- effects ----------

  burst(x, y, color, n, size, power = 1) {
    for (let k = 0; k < n && this.particles.length < 900; k++) {
      const a = Math.random() * TAU;
      const v = (60 + Math.random() * 220) * power;
      this.particles.push({ kind: 'chip', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80 * power, life: 0, max: 0.45 + Math.random() * 0.35, size: size * (0.35 + Math.random() * 0.5), color, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 14 });
    }
  }

  ring(x, y, color, size) {
    this.particles.push({ kind: 'ring', x, y, life: 0, max: 0.28, size, color });
  }

  confetti(colors) {
    for (let k = 0; k < 140; k++) {
      this.particles.push({ kind: 'chip', x: Math.random() * this.w, y: -20 - Math.random() * this.h * 0.4, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120, life: 0, max: 2.6 + Math.random(), size: 5 + Math.random() * 5, color: colors[k % colors.length], rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, flutter: true });
    }
  }

  startWin(onDone) {
    const g = this.game;
    const cells = [];
    const cx = g.W / 2;
    const cy = g.H / 2;
    const r = rng(g.level.index + 99);
    for (let i = 0; i < g.level.grid.length; i++) {
      if (g.level.grid[i] < 0) continue;
      const x = i % g.W;
      const y = Math.floor(i / g.W);
      const a = r() * TAU;
      const d = (g.W + g.H) * this.cell * (0.6 + r() * 0.5);
      cells.push({ i, sx: this.bx + cx * this.cell + Math.cos(a) * d, sy: this.by + cy * this.cell + Math.sin(a) * d, delay: Math.hypot(x - cx, y - cy) * 0.035 + r() * 0.12 });
    }
    const end = Math.max(...cells.map((c) => c.delay)) + 0.55;
    this.win = { t: 0, cells, end, onDone, done: false };
    this.confetti(g.level.palette);
  }

  // ---------- frame ----------

  update(dt) {
    const g = this.game;
    this.time += dt;
    const k = 1 - Math.exp(-dt * 16);
    // tokens follow their places
    const alive = new Set();
    const all = [...g.queues.flat(), ...g.dock.filter(Boolean), ...g.pending, ...g.belt];
    for (const sh of all) {
      alive.add(sh.id);
      const tgt = this.tokenTarget(sh);
      if (!tgt) continue;
      let t = this.tokens.get(sh.id);
      if (!t) {
        t = { x: tgt.x, y: tgt.y + 30, sc: 0.2, a: 0, kick: 0, color: sh.color, id: sh.id };
        this.tokens.set(sh.id, t);
      }
      t.sh = sh;
      t.kind = tgt.kind;
      t.front = tgt.front;
      t.side = tgt.side;
      t.hidden = !!tgt.hidden;
      if (tgt.exact && t.onBelt > 0.18) {
        t.x = tgt.x;
        t.y = tgt.y;
      } else {
        t.x = lerp(t.x, tgt.x, k);
        t.y = lerp(t.y, tgt.y, k);
      }
      t.onBelt = tgt.kind === 'belt' && sh.where === 'belt' ? (t.onBelt || 0) + dt : 0;
      t.sc = lerp(t.sc, tgt.sc, k);
      t.a = lerp(t.a, tgt.a, k);
      t.kick = Math.max(0, t.kick - dt * 6);
    }
    for (const [id, t] of this.tokens) {
      if (alive.has(id)) continue;
      if (t.dying) {
        t.dying += dt;
        if (t.dying > 0.25) this.tokens.delete(id);
      } else if (t.sh && t.sh.where === 'overflow') {
        t.y += dt * 40;
        t.a = Math.max(0, t.a - dt * 2);
        if (t.a <= 0) this.tokens.delete(id);
      } else this.tokens.delete(id);
    }
    // shots fly to their blocks
    for (const p of this.projectiles) {
      p.t += dt;
      if (p.t >= p.dur && !p.hit) {
        p.hit = true;
        this.clearBlock(p.cell);
        const c = this.cellCenter(p.cell);
        this.burst(c.x, c.y, p.color, 7, this.cell * 0.55, 0.9);
        this.ring(c.x, c.y, p.color, this.cell * 0.7);
        if (this.onArrive) this.onArrive(p);
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.hit);
    for (const q of this.particles) {
      q.life += dt;
      if (q.kind === 'chip') {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vy += (q.flutter ? 30 : 520) * dt;
        q.vx *= q.flutter ? 1 : 1 - dt * 1.5;
        if (q.flutter) q.vx += Math.sin(this.time * 3 + q.rot) * 20 * dt;
        q.rot += q.vr * dt;
      }
    }
    this.particles = this.particles.filter((q) => q.life < q.max);
    this.dockFlash = Math.max(0, this.dockFlash - dt * 1.5);
    this.pipShake = Math.max(0, this.pipShake - dt * 3);
    if (this.win) {
      this.win.t += dt;
      if (!this.win.done && this.win.t > this.win.end + 0.35) {
        this.win.done = true;
        if (this.win.onDone) this.win.onDone();
      }
    }
  }

  get busy() {
    return this.projectiles.length > 0;
  }

  draw() {
    const { c, dpr, game: g } = this;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(this.bg, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!g) return;
    const { cell } = this;
    // board
    const bb = this.boardBg;
    c.drawImage(bb.cv, this.bx - bb.pad, this.by - bb.pad, bb.cv.width / dpr, bb.cv.height / dpr);
    if (!this.win) c.drawImage(this.blocks, this.bx, this.by, g.W * cell, g.H * cell);
    this.drawTrack();
    this.drawPanel();
    // tokens: the ones on the belt above everything on the board
    const list = [...this.tokens.values()].sort((a, b) => (a.kind === 'belt') - (b.kind === 'belt'));
    for (const t of list) this.drawToken(t);
    // shots
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const p of this.projectiles) {
      const u = easeOut(clamp(p.t / p.dur, 0, 1));
      const x = lerp(p.x0, p.x1, u);
      const y = lerp(p.y0, p.y1, u);
      const tx = lerp(p.x0, p.x1, Math.max(0, u - 0.35));
      const ty = lerp(p.y0, p.y1, Math.max(0, u - 0.35));
      c.strokeStyle = p.color;
      c.lineCap = 'round';
      c.lineWidth = cell * 0.5;
      c.globalAlpha = 0.35;
      c.beginPath();
      c.moveTo(tx, ty);
      c.lineTo(x, y);
      c.stroke();
      c.globalAlpha = 1;
      c.lineWidth = Math.max(2, cell * 0.18);
      c.strokeStyle = shade(p.color, 0.6);
      c.stroke();
    }
    c.restore();
    if (this.win) this.drawWin();
    this.drawParticles();
    if (this.hint) this.drawHint();
  }

  drawTrack() {
    const { c, track: t, tokenR } = this;
    const g = this.game;
    c.save();
    roundRect(c, t.x0, t.y0, t.x1 - t.x0, t.y1 - t.y0, t.r);
    c.lineWidth = tokenR * 1.7;
    c.strokeStyle = 'rgba(5,3,12,0.55)';
    c.stroke();
    c.lineWidth = tokenR * 1.7 - 4;
    c.strokeStyle = 'rgba(60,44,92,0.55)';
    c.stroke();
    // moving dashes show which way the belt runs
    c.setLineDash([tokenR * 0.5, tokenR * 0.9]);
    c.lineDashOffset = -this.time * (g.speed * this.cell * 0.55);
    c.lineWidth = 2.5;
    c.strokeStyle = 'rgba(255,214,140,0.28)';
    c.stroke();
    c.setLineDash([]);
    c.restore();
    // how many shooters are on the belt: a row of lights above the dock
    const pipR = 4.5;
    const shake = Math.sin(this.time * 60) * this.pipShake * 4;
    const py = this.dockPos[0].y - this.dr - 12;
    const px = this.panel.x + this.panel.w / 2 - ((g.cap - 1) * pipR * 3) / 2;
    for (let k = 0; k < g.cap; k++) {
      c.beginPath();
      c.arc(px + k * pipR * 3 + shake, py, pipR, 0, TAU);
      c.fillStyle = k < g.onBelt ? '#ffd27a' : 'rgba(255,255,255,0.14)';
      c.fill();
    }
  }

  drawPanel() {
    const { c, panel: p, dr } = this;
    const g = this.game;
    // dock sockets
    for (let j = 0; j < this.dockPos.length; j++) {
      const d = this.dockPos[j];
      c.beginPath();
      c.arc(d.x, d.y, dr * 1.08, 0, TAU);
      const flash = this.dockFlash;
      c.fillStyle = flash > 0 ? `rgba(${Math.round(120 + 135 * flash)},30,50,0.6)` : 'rgba(0,0,0,0.35)';
      c.fill();
      c.lineWidth = 1.5;
      c.strokeStyle = g.dock[j] ? 'rgba(255,255,255,0.0)' : 'rgba(255,255,255,0.12)';
      c.stroke();
    }
    // queue lanes
    for (let q = 0; q < this.queuePos.length; q++) {
      const qp = this.queuePos[q];
      const h = this.qr * 1.2 + this.behind * this.queueStep;
      roundRect(c, qp.x - this.qr * 1.25, qp.y - this.qr * 1.25, this.qr * 2.5, h + this.qr * 1.25, this.qr * 0.6);
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.fill();
    }
  }

  drawToken(t) {
    const { c } = this;
    const g = this.game;
    const sh = t.sh;
    if (!sh || t.a < 0.02) return;
    const sprites = t.kind === 'queue' ? this.queueSprites : t.kind === 'dock' ? this.dockSprites : this.tokenSprites;
    const sp = t.hidden && t.kind === 'queue' ? this.hiddenSprite : sprites[t.color];
    let sc = t.sc * (1 + t.kick * 0.18);
    if (t.dying) sc *= Math.max(0, 1 - t.dying / 0.25) * (1 + t.dying * 2);
    const size = sp.cv.width / this.dpr;
    c.globalAlpha = t.a;
    // the nozzle points into the picture
    if (t.kind === 'belt' && t.side != null) {
      const a = SIDE_ANGLE[t.side];
      c.save();
      c.translate(t.x, t.y);
      c.rotate(a);
      c.beginPath();
      c.moveTo(sp.r * sc * 1.25, 0);
      c.lineTo(sp.r * sc * 0.55, -sp.r * sc * 0.42);
      c.lineTo(sp.r * sc * 0.55, sp.r * sc * 0.42);
      c.closePath();
      c.fillStyle = shade(g.level.palette[t.color], -0.35);
      c.fill();
      c.restore();
    }
    c.drawImage(sp.cv, t.x - (size / 2) * sc, t.y - (size / 2) * sc, size * sc, size * sc);
    // the number of shots left
    const ammo = t.hidden && t.kind === 'queue' ? '?' : sh.ammo;
    const fs = Math.round(sp.r * sc * (ammo >= 10 ? 0.9 : 1.05));
    if (fs >= 7) {
      c.font = `800 ${fs}px "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = Math.max(2, fs * 0.2);
      c.strokeStyle = 'rgba(0,0,0,0.45)';
      c.strokeText(String(ammo), t.x, t.y + fs * 0.05);
      c.fillStyle = '#fff';
      c.fillText(String(ammo), t.x, t.y + fs * 0.05);
    }
    c.globalAlpha = 1;
  }

  drawParticles() {
    const { c } = this;
    for (const q of this.particles) {
      const u = q.life / q.max;
      if (q.kind === 'chip') {
        c.globalAlpha = Math.min(1, (1 - u) * 1.6);
        c.save();
        c.translate(q.x, q.y);
        c.rotate(q.rot);
        c.fillStyle = q.color;
        const s = q.size * (q.flutter ? 1 : 1 - u * 0.5);
        c.fillRect(-s / 2, -s / 2, s, q.flutter ? s * 0.55 : s);
        c.restore();
      } else if (q.kind === 'ring') {
        c.globalAlpha = (1 - u) * 0.8;
        c.lineWidth = 2.5 * (1 - u) + 0.5;
        c.strokeStyle = q.color;
        const s = q.size * (0.6 + easeOut(u) * 0.9);
        roundRect(c, q.x - s / 2, q.y - s / 2, s, s, s * 0.25);
        c.stroke();
      }
    }
    c.globalAlpha = 1;
  }

  drawWin() {
    const { c, cell } = this;
    const g = this.game;
    const W = this.win;
    const s = cell;
    for (const it of W.cells) {
      const u = clamp((W.t - it.delay) / 0.55, 0, 1);
      if (u <= 0) continue;
      const e = easeBack(u);
      const tx = this.bx + (it.i % g.W) * s;
      const ty = this.by + Math.floor(it.i / g.W) * s;
      const x = lerp(it.sx, tx, e);
      const y = lerp(it.sy, ty, e);
      const sc = lerp(0.3, 1, easeOut(u));
      c.globalAlpha = Math.min(1, u * 2);
      c.drawImage(this.blockSprites[g.level.grid[it.i]], x + (s * (1 - sc)) / 2, y + (s * (1 - sc)) / 2, s * sc, s * sc);
    }
    c.globalAlpha = 1;
    // a light sweep over the finished picture
    const sweep = W.t - W.end;
    if (sweep > 0 && sweep < 0.9) {
      c.save();
      c.beginPath();
      c.rect(this.bx, this.by, g.W * s, g.H * s);
      c.clip();
      c.globalCompositeOperation = 'lighter';
      const x = this.bx + (sweep / 0.9) * (g.W * s + 200) - 100;
      const gr = c.createLinearGradient(x - 60, 0, x + 60, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.5, 'rgba(255,240,200,0.45)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.fillRect(this.bx, this.by, g.W * s, g.H * s);
      c.restore();
    }
  }

  drawHint() {
    const { c } = this;
    const h = this.hint;
    const k = (this.time * 1.4) % 1;
    c.save();
    c.globalAlpha = 1 - k;
    c.lineWidth = 3;
    c.strokeStyle = '#ffe2a0';
    c.beginPath();
    c.arc(h.x, h.y, h.r * (1 + k * 0.9), 0, TAU);
    c.stroke();
    c.globalAlpha = 1;
    // a small pointing finger drawn with shapes
    const bob = Math.sin(this.time * 6) * 4;
    const x = h.x + h.r * 0.55;
    const y = h.y + h.r * 0.6 + bob;
    c.fillStyle = '#fff';
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 2;
    roundRect(c, x - 6, y - 16, 12, 30, 6);
    c.fill();
    c.stroke();
    roundRect(c, x - 9, y + 2, 26, 22, 9);
    c.fill();
    c.stroke();
    c.restore();
  }

  hit(x, y) {
    const g = this.game;
    if (!g) return null;
    for (let q = 0; q < g.queues.length; q++) {
      const p = this.queuePos[q];
      if (g.queues[q].length && Math.hypot(x - p.x, y - p.y) < this.qr * 1.35) return { type: 'queue', q };
    }
    for (let d = 0; d < this.dockPos.length; d++) {
      const p = this.dockPos[d];
      if (g.dock[d] && Math.hypot(x - p.x, y - p.y) < this.dr * 1.45) return { type: 'dock', d };
    }
    return null;
  }
}
