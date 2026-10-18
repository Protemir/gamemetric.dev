// The grey prototype's look: the steppe painted cell by cell into a small offscreen image
// (tribe colour turning to the khan's gold with trust), smoothed up to the screen,
// with auls, riders, talk and marks drawn on top. The real art comes after the rules are fun.
import { GW, GH } from './map.js';
import { riderPos } from './sim.js';
import { clamp } from './util.js';

export const TRIBE_RGB = [[92, 128, 170], [104, 152, 92], [190, 112, 78]];
export const GOLD = [232, 184, 74];
const LIE = [58, 34, 70];
const RIVER = [70, 120, 152];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

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
    this.hover = -1;
    this.top = 64;
    this.bottom = 92;
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

  riderAt(g, px, py) {
    let best = null, bd = Math.max(26, this.s * 4) ** 2;
    for (const r of g.riders) {
      const p = riderPos(g, r);
      const [sx, sy] = this.toScreen(p.x, p.y);
      const d = (sx - px) ** 2 + (sy - py) ** 2;
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }

  paintMap(g) {
    const { cell, elev, river, border, regions } = g.map;
    const d = this.img.data;
    const shade = this.shade || (this.shade = Float32Array.from(elev, (e, i) => 0.86 + e * 0.22 + (((i * 2654435761) >>> 0) % 100) / 2500));
    for (let i = 0; i < GW * GH; i++) {
      const id = cell[i], r = regions[id];
      let c;
      if (river[i]) c = RIVER;
      else {
        const base = r.tribe < 0 ? GOLD : TRIBE_RGB[r.tribe];
        const k = r.tribe < 0 ? 1 : Math.pow(g.t[id], 1.3);
        c = [base[0] + (GOLD[0] - base[0]) * k, base[1] + (GOLD[1] - base[1]) * k, base[2] + (GOLD[2] - base[2]) * k];
        const lie = clamp(g.n[id] * 0.32, 0, 0.55);
        if (lie > 0) c = [c[0] + (LIE[0] - c[0]) * lie, c[1] + (LIE[1] - c[1]) * lie, c[2] + (LIE[2] - c[2]) * lie];
        const word = clamp(g.m[id] * 0.16, 0, 0.3);
        if (word > 0) c = [c[0] + (255 - c[0]) * word, c[1] + (240 - c[1]) * word, c[2] + (200 - c[2]) * word];
        let f = shade[i];
        if (id === this.hover) f *= 1.12;
        if (border[i] === 2) f *= 0.5;
        else if (border[i]) f *= 0.8;
        c = [c[0] * f, c[1] * f, c[2] * f];
      }
      d[i * 4] = c[0];
      d[i * 4 + 1] = c[1];
      d[i * 4 + 2] = c[2];
      d[i * 4 + 3] = 255;
    }
    this.octx.putImageData(this.img, 0, 0);
  }

  draw(g, now, ui) {
    const { ctx, s } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#1b1712';
    ctx.fillRect(0, 0, this.w, this.h);
    if (!g) return;
    this.paintMap(g);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (this.rot) {
      ctx.save();
      ctx.translate(this.ox + GH * s, this.oy);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(this.off, 0, 0, GW * s, GH * s);
      ctx.restore();
    } else ctx.drawImage(this.off, this.ox, this.oy, GW * s, GH * s);

    const { regions } = g.map;
    const R = (k) => Math.max(3, k * s);

    // auls: the Orda is a big gold yurt, the great aul of each tribe has its sign
    for (const r of regions) {
      const [x, y] = this.toScreen(r.x, r.y);
      const big = r.id === 0;
      const cap = g.map.capitals.includes(r.id);
      const rad = big ? R(3.4) : cap ? R(2.4) : R(1.7);
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = big ? '#fff3cf' : '#f4ead6';
      ctx.fill();
      ctx.lineWidth = big ? 3 : 2;
      ctx.strokeStyle = big ? css(GOLD) : r.tribe >= 0 ? css(TRIBE_RGB[r.tribe]) : '#000';
      ctx.stroke();
      if (big || cap) {
        ctx.fillStyle = big ? '#7a5512' : css(TRIBE_RGB[r.tribe]);
        ctx.font = `700 ${Math.round(rad * 1.1)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(big ? '♛' : ['Ψ', 'Λ', 'Ш'][r.tribe], x, y + 1);
      }
      // the trust number while the prototype is grey: easier to judge the rules
      if (ui.numbers && r.tribe >= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.font = `600 ${Math.round(R(1.9))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(g.t[r.id] * 100), x, y + rad + R(1.6));
      }
    }

    // where a lie landed: an ✕ until Aria looks; the hideout once it is known
    for (const i of g.marks) {
      const r = regions[i];
      const [x, y] = this.toScreen(r.x + 3, r.y - 3);
      ctx.font = `700 ${Math.round(R(2.6))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = g.found.has(i) ? '#e9ffd8' : '#2a1630';
      ctx.fillText(g.found.has(i) ? '✓' : '✕', x, y);
    }
    if (g.lairKnown) {
      const r = regions[g.lair];
      const [x, y] = this.toScreen(r.x, r.y);
      const p = 1 + Math.sin(now / 300) * 0.12;
      ctx.beginPath();
      ctx.arc(x, y, R(4.2) * p, 0, Math.PI * 2);
      ctx.strokeStyle = '#c0304a';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Aria at work: a violet ring that empties as she looks
    if (g.aria.at >= 0 && g.aria.busy > 0) {
      const r = regions[g.aria.at];
      const [x, y] = this.toScreen(r.x, r.y);
      ctx.beginPath();
      ctx.arc(x, y, R(3.6), -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.aria.busy) / 12);
      ctx.strokeStyle = '#b48cff';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // riders: yours draw a dotted line to where they go, the forged ones do not
    for (const rider of g.riders) {
      const p = riderPos(g, rider);
      const [x, y] = this.toScreen(p.x, p.y);
      const mine = rider.kind === 'word' || rider.kind === 'aria' || rider.kind === 'karasai';
      if (mine) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = rider.seg + 1; k < rider.path.length; k++) {
          const rr = regions[rider.path[k]];
          ctx.lineTo(...this.toScreen(rr.x, rr.y));
        }
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,248,225,0.85)';
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const col = rider.kind === 'tribe' ? css(TRIBE_RGB[rider.tribe]) : rider.kind === 'aria' ? '#a678ff' : rider.kind === 'karasai' ? '#c43a2c' : css(GOLD);
      const ang = this.rot ? Math.atan2(p.dx, -p.dy) : Math.atan2(p.dy, p.dx);
      const sz = Math.max(7, s * 2.2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(sz * 1.1, 0);
      ctx.lineTo(-sz * 0.8, sz * 0.7);
      ctx.lineTo(-sz * 0.5, 0);
      ctx.lineTo(-sz * 0.8, -sz * 0.7);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = rider.kind === 'tribe' ? '#f4ead6' : '#3a2a10';
      ctx.stroke();
      ctx.restore();
      if (ui.pulse === rider.id) {
        ctx.beginPath();
        ctx.arc(x, y, sz * (1.8 + Math.sin(now / 150) * 0.3), 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // the finger of the first lesson
    if (ui.hand != null && ui.hand >= 0) {
      const r = regions[ui.hand];
      const [x, y] = this.toScreen(r.x, r.y);
      const k = (now % 1200) / 1200;
      ctx.beginPath();
      ctx.arc(x, y, R(3) + k * R(5), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // little words that float up where something happened
    for (let k = this.fx.length - 1; k >= 0; k--) {
      const f = this.fx[k];
      const age = (now - f.t0) / 1300;
      if (age >= 1) { this.fx.splice(k, 1); continue; }
      const r = regions[f.region] || regions[0];
      const [x, y] = this.toScreen(r.x, r.y);
      ctx.globalAlpha = 1 - age;
      ctx.font = `800 ${Math.round(Math.max(16, s * 4))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = f.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, x, y - 10 - age * 30);
      ctx.fillText(f.text, x, y - 10 - age * 30);
      ctx.globalAlpha = 1;
    }
  }

  pushFx(f, now) {
    const look = { word: ['+', '#ffe7a0'], lie: ['−', '#d6a6ff'], force: ['⚔', '#ff8f7a'], clue: ['🔍', '#fff'], caught: ['✋', '#fff'], aria: ['👁', '#d9c4ff'] }[f.type];
    if (look) this.fx.push({ region: f.region, text: look[0], color: look[1], t0: now });
  }
}
