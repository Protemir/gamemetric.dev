// Chickens. They wander the grounds and the kitchen, peck, cluck, run from people and gunfire,
// and burst into feathers when shot. With the "exploding chickens" option they go off like a grenade.
// Each player's chickens are their own (not sent over the network): harmless fun, except the explosions,
// which only the host turns into damage.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeos } from './map.js';
import { sfx } from './audio.js';

let GEO = null;
export function chickenGeo() {
  if (GEO) return GEO;
  const part = (g, color) => {
    g = g.toNonIndexed();
    g.computeVertexNormals();
    const n = g.attributes.normal, c = new THREE.Color(color), col = new Float32Array(n.count * 3);
    for (let i = 0; i < n.count; i++) {
      const k = 0.62 + 0.38 * Math.max(0, n.getY(i) * 0.8 + n.getX(i) * 0.2);
      col.set([c.r * k, c.g * k, c.b * k], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('uv');
    return g;
  };
  // facing -z like everything else; about 40 cm tall
  const body = part(new THREE.SphereGeometry(0.13, 10, 8).scale(0.85, 0.82, 1.15).translate(0, 0.22, 0.02), 0xf2efe6);
  const tail = part(new THREE.ConeGeometry(0.07, 0.14, 6).rotateX(-0.9).translate(0, 0.3, 0.16), 0xe9e4d6);
  const wingL = part(new THREE.SphereGeometry(0.07, 8, 6).scale(0.35, 0.75, 1.2).translate(0.105, 0.23, 0.03), 0xe3ded0);
  const wingR = part(new THREE.SphereGeometry(0.07, 8, 6).scale(0.35, 0.75, 1.2).translate(-0.105, 0.23, 0.03), 0xe3ded0);
  const head = part(new THREE.SphereGeometry(0.06, 8, 6).translate(0, 0.37, -0.1), 0xf6f3ec);
  const comb = part(new THREE.BoxGeometry(0.018, 0.045, 0.06).translate(0, 0.43, -0.1), 0xc62a1e);
  const wattle = part(new THREE.SphereGeometry(0.018, 6, 4).scale(1, 1.5, 1).translate(0, 0.32, -0.15), 0xc62a1e);
  const beak = part(new THREE.ConeGeometry(0.018, 0.05, 5).rotateX(-Math.PI / 2).translate(0, 0.36, -0.17), 0xe2a42a);
  const eyeL = part(new THREE.SphereGeometry(0.009, 5, 4).translate(0.04, 0.385, -0.13), 0x101010);
  const eyeR = part(new THREE.SphereGeometry(0.009, 5, 4).translate(-0.04, 0.385, -0.13), 0x101010);
  const legL = part(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 4).translate(0.04, 0.065, 0.01), 0xd99a2b);
  const legR = part(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 4).translate(-0.04, 0.065, 0.01), 0xd99a2b);
  GEO = mergeGeos([body, tail, wingL, wingR, head, comb, wattle, beak, eyeL, eyeR, legL, legR]);
  return GEO;
}

export class Chickens {
  constructor(game) {
    this.g = game;
    this.list = [];
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.killed = 0;
  }

  // a fresh flock every round: outside on the grass and the paths, three in the kitchen
  spawn() {
    this.clear();
    const m = this.g.map;
    const spots = [];
    let guard = 0;
    while (spots.length < 9 && guard++ < 800) {
      const x = 2 + Math.random() * 68, z = 2 + Math.random() * 60;
      const c = m.cellAt(x, z);
      if (c < 0 || !m.walk[c] || m.indoor[c] || m.zone[c]) continue;
      spots.push([x, z]);
    }
    for (const [x, z] of [[14.5, 12.5], [20.5, 19.5], [16.5, 11.5]]) spots.push([x, z]);
    for (const [x, z] of spots) {
      const mesh = new THREE.Mesh(chickenGeo(), this.mat);
      mesh.matrixAutoUpdate = true;
      this.g.scene.add(mesh);
      this.list.push({ x, z, yaw: Math.random() * 6.28, tx: x, tz: z, wait: Math.random() * 3, run: 0, mesh, phase: Math.random() * 6, cluckAt: this.g.time + 2 + Math.random() * 10 });
    }
  }

  clear() {
    for (const c of this.list) this.g.scene.remove(c.mesh);
    this.list.length = 0;
  }

  // something loud happened here: everyone nearby runs
  scare(x, z, r = 9) {
    for (const c of this.list) {
      const d = Math.hypot(c.x - x, c.z - z);
      if (d > r) continue;
      const a = Math.atan2(c.x - x, c.z - z) + (Math.random() - 0.5);
      c.tx = c.x + Math.sin(a) * 5;
      c.tz = c.z + Math.cos(a) * 5;
      c.run = 1.6;
      c.wait = 0;
    }
  }

  // "giant chickens" make them three times bigger (big heads: a quarter)
  size() {
    const f = this.g.fun || {};
    return (f.bigchick ? 3 : 1) * (f.heads ? 1.25 : 1);
  }

  // nearest chicken a ray passes through before maxT (a 22 cm ball round the body)
  hit(ox, oy, oz, dx, dy, dz, maxT) {
    let best = null;
    for (const c of this.list) {
      const k = this.size();
      const hx = c.x - ox, hy = 0.25 * k - oy, hz = c.z - oz;
      const t = hx * dx + hy * dy + hz * dz;
      if (t <= 0 || t > maxT) continue;
      const d2 = hx * hx + hy * hy + hz * hz - t * t;
      if (d2 < 0.22 * k * 0.22 * k && (!best || t < best.t)) best = { c, t };
    }
    return best;
  }

  kill(c, by) {
    const i = this.list.indexOf(c);
    if (i < 0) return;
    this.list.splice(i, 1);
    this.g.scene.remove(c.mesh);
    const fx = this.g.fx;
    for (let k = 0; k < 4; k++) fx.puff(c.x + (Math.random() - 0.5) * 0.3, 0.25 + Math.random() * 0.3, c.z + (Math.random() - 0.5) * 0.3, [0.96, 0.95, 0.9], 0.45, 1.4, 0.3, 0.9);
    fx.spark(c.x, 0.3, c.z, 0, 1, 0, [0.98, 0.97, 0.93], 18, 3);
    sfx('squawk', [c.x, 0.3, c.z]);
    if (by?.isPlayer) {
      this.killed++;
      this.g.hud.center(`🐔 ×${this.killed}`, 1.2);
    }
    // the exploding kind
    if (this.g.fun.boom) this.g.detonate({ kind: 'he', x: c.x, y: 0.2, z: c.z, owner: by || null, chicken: true });
    this.scare(c.x, c.z, 12);
  }

  update(dt) {
    const g = this.g, m = g.map;
    for (const c of this.list) {
      // people walking up make them hurry off
      for (const s of g.soldiers) {
        if (!s.alive || c.run > 0) continue;
        if (Math.hypot(s.x - c.x, s.z - c.z) < 2.2) {
          const a = Math.atan2(c.x - s.x, c.z - s.z);
          c.tx = c.x + Math.sin(a) * 3.5;
          c.tz = c.z + Math.cos(a) * 3.5;
          c.run = 0.9;
          c.wait = 0;
          if (Math.random() < 0.5) sfx('cluck', [c.x, 0.3, c.z]);
        }
      }
      const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz);
      let moving = false;
      if (c.wait > 0) c.wait -= dt;
      else if (d > 0.15) {
        const sp = c.run > 0 ? 3.6 : 0.7;
        const nx = c.x + (dx / d) * sp * dt, nz = c.z + (dz / d) * sp * dt;
        // the whole bird must fit: its middle in a free cell let half of it walk into walls
        const R = this.g.fun.bigchick ? 0.55 : 0.24;
        const free = (x, z) => {
          const cell = m.cellAt(x, z);
          return cell >= 0 && m.walk[cell] && m.h[cell] === 0;
        };
        if (free(nx - R, nz - R) && free(nx + R, nz - R) && free(nx - R, nz + R) && free(nx + R, nz + R)) {
          c.x = nx;
          c.z = nz;
          moving = true;
        } else {
          c.tx = c.x;
          c.tz = c.z;
        }
        const want = Math.atan2(-dx, -dz);
        let da = want - c.yaw;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        c.yaw += da * Math.min(1, dt * 8);
      } else {
        // pick somewhere nearby, then stand and peck for a while
        c.wait = 1 + Math.random() * 4;
        const a = Math.random() * 6.28, r = 1 + Math.random() * 3;
        c.tx = c.x + Math.sin(a) * r;
        c.tz = c.z + Math.cos(a) * r;
      }
      c.run = Math.max(0, c.run - dt);
      c.phase += dt * (moving ? (c.run > 0 ? 22 : 9) : 3);
      // waddle while walking, peck while standing
      const bob = moving ? Math.abs(Math.sin(c.phase)) * 0.03 : 0;
      c.mesh.position.set(c.x, bob, c.z);
      c.mesh.rotation.set(moving ? 0 : Math.max(0, Math.sin(c.phase)) * 0.35, c.yaw, moving ? Math.sin(c.phase) * 0.12 : 0);
      c.mesh.scale.setScalar(this.size());
      if (g.time > c.cluckAt) {
        c.cluckAt = g.time + 4 + Math.random() * 12;
        sfx('cluck', [c.x, 0.3, c.z]);
      }
    }
  }

  dispose() {
    this.clear();
    this.mat.dispose();
  }
}
