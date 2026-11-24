// Glass in the ground-floor windows: a pane in every window cell, from the sill to the lintel.
// A bullet, a blast, a grenade or somebody climbing through breaks it with a crash and a spray of shards;
// every round puts the glass back. It is only for the eye and the ear: bullets, grenades and sight
// pass through windows as before, so the game plays the same, online too (each side breaks its own glass).
import * as THREE from 'three';
import { W, K } from './map.js';
import { sfx } from './audio.js';

// a faint sky reflection with two light streaks, so the glass reads as glass and not as nothing
function glassTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(225,240,250,0.42)');
  grad.addColorStop(1, 'rgba(150,185,205,0.22)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.moveTo(10, 128);
  g.lineTo(26, 128);
  g.lineTo(58, 40);
  g.lineTo(46, 40);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.2)';
  g.beginPath();
  g.moveTo(30, 128);
  g.lineTo(35, 128);
  g.lineTo(64, 52);
  g.lineTo(64, 66);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Glass {
  constructor(game) {
    this.game = game;
    const map = game.map;
    this.panes = [];
    this.byCell = new Map();
    const isWall = (c) => c >= 0 && (map.kind[c] === K.WALL || map.kind[c] === K.WINDOW);
    for (let c = 0; c < map.kind.length; c++) {
      if (map.kind[c] !== K.WINDOW) continue;
      const x = c % W, z = (c - x) / W;
      const y0 = map.h[c], y1 = map.lint[c] || y0 + 1.9;
      if (y1 - y0 < 0.5) continue;
      // the wall runs along x when its neighbours left and right are wall or window
      const alongX = (x > 0 && isWall(c - 1)) || (x < W - 1 && isWall(c + 1));
      const p = { c, x: x + 0.5, z: z + 0.5, alongX, y0, y1, ok: true, i: this.panes.length };
      this.panes.push(p);
      this.byCell.set(c, p);
    }
    this.mat = new THREE.MeshBasicMaterial({ map: glassTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.mat, Math.max(1, this.panes.length));
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = false;
    this.m4 = new THREE.Matrix4();
    this.reset();
    game.scene.add(this.mesh);
  }

  // every pane whole again (a new round)
  reset() {
    for (const p of this.panes) {
      p.ok = true;
      this.place(p);
    }
    this.mesh.count = this.panes.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  place(p) {
    const m = this.m4;
    if (!p.ok) m.makeScale(0, 0, 0);
    else {
      m.makeRotationY(p.alongX ? 0 : Math.PI / 2);
      m.scale(new THREE.Vector3(0.98, p.y1 - p.y0, 1));
      m.setPosition(p.x, (p.y0 + p.y1) / 2, p.z);
    }
    this.mesh.setMatrixAt(p.i, m);
  }

  // the crash: shards fly the way the hit went, a little dust of glass, a crash with tinkles
  shatter(p, dx = 0, dz = 0) {
    if (!p.ok) return;
    p.ok = false;
    this.place(p);
    this.mesh.instanceMatrix.needsUpdate = true;
    const fx = this.game.fx, cy = (p.y0 + p.y1) / 2;
    const n = Math.hypot(dx, dz) || 1;
    const ux = dx / n, uz = dz / n;
    for (let k = 0; k < 4; k++) {
      const ox = p.alongX ? (Math.random() - 0.5) * 0.8 : 0, oz = p.alongX ? 0 : (Math.random() - 0.5) * 0.8;
      fx.spark(p.x + ox, cy + (Math.random() - 0.5) * (p.y1 - p.y0) * 0.8, p.z + oz, ux, 0.3, uz, [0.82, 0.93, 1], 7, 3.2);
    }
    fx.puff(p.x, cy, p.z, [0.9, 0.96, 1], 0.6, 0.5, 0.3, 0.35);
    sfx('glass', [p.x, cy, p.z]);
  }

  // a bullet from o along d for t metres: the first whole pane it crosses breaks
  ray(ox, oy, oz, dx, dy, dz, maxT) {
    let best = null, bt = maxT;
    for (const p of this.panes) {
      if (!p.ok) continue;
      const den = p.alongX ? dz : dx;
      if (Math.abs(den) < 1e-6) continue;
      const t = ((p.alongX ? p.z : p.x) - (p.alongX ? oz : ox)) / den;
      if (t <= 0.05 || t >= bt) continue;
      const y = oy + dy * t;
      if (y < p.y0 || y > p.y1) continue;
      const along = p.alongX ? ox + dx * t - p.x : oz + dz * t - p.z;
      if (Math.abs(along) > 0.5) continue;
      best = p;
      bt = t;
    }
    if (best) this.shatter(best, dx, dz);
  }

  // somebody (from lo to hi) or a grenade (lo = hi) in a window cell goes through the glass
  touch(x, z, lo, hi, vx = 0, vz = 0) {
    const c = this.game.map.cellAt(x, z);
    const p = c >= 0 ? this.byCell.get(c) : null;
    if (p && p.ok && lo < p.y1 && hi > p.y0) this.shatter(p, vx, vz);
  }

  // an explosion breaks every pane within r metres that it can reach (not through a wall)
  blast(x, y, z, r) {
    const map = this.game.map;
    for (const p of this.panes) {
      if (!p.ok) continue;
      const dx = p.x - x, dz = p.z - z, dy = Math.max(0, Math.max(p.y0 - y, y - p.y1));
      if (dx * dx + dz * dz + dy * dy >= r * r) continue;
      const cy = (p.y0 + p.y1) / 2;
      if (map.los && !map.los(x, y + 0.2, z, p.x, cy, p.z)) continue;
      this.shatter(p, dx, dz);
    }
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    this.mesh.dispose();
    this.mesh.geometry.dispose();
    this.mat.map.dispose();
    this.mat.dispose();
  }
}
