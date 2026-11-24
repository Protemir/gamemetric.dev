// Smoke grenades: a grey cloud of soft puffs that grows for a second and a half, hangs for
// about fifteen and thins away. Bots cannot see through it, and a camera inside it sees grey.
import * as THREE from '../vendor/three.module.min.js';

const LIFE = 16, GROW = 1.4, FADE = 3, R = 3.1, PUFFS = 14;

let tex = null;
function puffTexture() {
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  // a few overlapping blobs, so the edge is lumpy and not a perfect disc
  for (let i = 0; i < 7; i++) {
    const x = 64 + Math.cos(i * 2.4) * (i ? 18 : 0), y = 64 + Math.sin(i * 2.4) * (i ? 16 : 0), r = i ? 34 : 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.85)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  }
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Smokes {
  constructor(game) {
    this.g = game;
    this.list = [];
    this.veil = document.getElementById('smoke-veil');
  }

  add(x, y, z) {
    const g = this.g;
    const group = new THREE.Group();
    const puffs = [];
    // three shared materials per cloud (one fade for all; a few shades and turns so it is not uniform)
    const mats = [0, 1, 2].map((j) => {
      const shade = 0.36 + j * 0.05;
      const m = new THREE.SpriteMaterial({ map: puffTexture(), color: new THREE.Color(shade, shade, shade * 1.03), transparent: true, depthWrite: false, opacity: 0, fog: true });
      m.rotation = j * 2.1;
      return m;
    });
    for (let i = 0; i < PUFFS; i++) {
      // a squat dome: wide on the floor, lower on top
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R * 0.85;
      const s = new THREE.Sprite(mats[i % 3]);
      s.renderOrder = 3;
      let px = Math.cos(a) * r, pz = Math.sin(a) * r;
      // a puff behind a wall is pulled back towards the can
      for (let k = 0; k < 4 && !g.map.los(x, y + 0.6, z, x + px, y + 0.6, z + pz); k++) {
        px *= 0.5;
        pz *= 0.5;
      }
      const py = 0.5 + Math.random() * (2.2 - (r / R) * 1.2);
      s.position.set(px, py, pz);
      puffs.push({ s, size: 3.6 + Math.random() * 2, spin: 0, rise: 0.02 + Math.random() * 0.05 });
      group.add(s);
    }
    // the cloud sits on the floor under the can, never inside the wall it bounced off
    const floor = Math.max(g.map.groundAt(x, z, 0.1, Math.max(0, y)), g.map.inWater(x, z) ? 0.12 : -9);
    group.position.set(x, floor, z);
    g.scene.add(group);
    this.list.push({ x, y: floor, z, t0: g.time, group, puffs, mats });
  }

  // how big the cloud is now (0 before it pops or after it has gone)
  radius(c) {
    const age = this.g.time - c.t0;
    if (age < 0 || age > LIFE) return 0;
    const grow = Math.min(1, age / GROW);
    const fade = age > LIFE - FADE ? (LIFE - age) / FADE : 1;
    return R * (1 - (1 - grow) ** 2) * (0.55 + 0.45 * fade);
  }

  // does the line between two points pass through a cloud
  blocks(ax, ay, az, bx, by, bz) {
    for (const c of this.list) {
      const r = this.radius(c) * 0.85;
      if (r < 0.6) continue;
      const cx = c.x, cy = c.y + 1.1, cz = c.z;
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const L = dx * dx + dy * dy + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy + (cz - az) * dz) / L));
      const px = ax + dx * t - cx, py = (ay + dy * t - cy) * 1.4, pz = az + dz * t - cz;
      // the closest point must be in the same space as the cloud, not behind a wall from it
      if (px * px + py * py + pz * pz < r * r && this.g.map.los(cx, cy, cz, cx + px, cy + py / 1.4, cz + pz)) return true;
    }
    return false;
  }

  update(dt) {
    const g = this.g, v = g.view;
    let inside = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      const age = g.time - c.t0;
      if (age > LIFE) {
        this.remove(c);
        this.list.splice(i, 1);
        continue;
      }
      const grow = Math.min(1, age / GROW);
      const k = 1 - (1 - grow) ** 2;
      const fade = age > LIFE - FADE ? (LIFE - age) / FADE : 1;
      for (const p of c.puffs) {
        p.s.scale.setScalar(p.size * (0.25 + 0.75 * k) * (1 + (1 - fade) * 0.3));
        p.s.position.y += p.rise * dt;
      }
      for (const [j, m] of c.mats.entries()) {
        m.opacity = 0.97 * Math.min(1, age * 3) * fade;
        m.rotation += (j - 1) * 0.05 * dt;
      }
      // how deep the camera is in this cloud
      const r = this.radius(c);
      if (r > 0.5) {
        const d = Math.hypot(v.x - c.x, (v.y - c.y - 1.1) * 1.4, v.z - c.z);
        const deep = Math.min(1, (1 - d / r) * 2.2) * fade;
        inside = Math.max(inside, deep);
        // from deep inside the grey veil covers the screen: the puffs need not be drawn (they cost a lot)
        c.group.visible = deep < 0.9;
      }
    }
    if (this.veil) {
      const o = Math.min(0.95, Math.max(0, inside) * 1.05);
      if (Math.abs((this.veilO || 0) - o) > 0.01) {
        this.veilO = o;
        this.veil.style.opacity = o.toFixed(2);
      }
    }
  }

  remove(c) {
    this.g.scene.remove(c.group);
    for (const m of c.mats) m.dispose();
  }

  clear() {
    for (const c of this.list) this.remove(c);
    this.list.length = 0;
    if (this.veil) this.veil.style.opacity = '0';
    this.veilO = 0;
  }
}
