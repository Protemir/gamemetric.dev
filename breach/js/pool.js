// The pool's toys: a springboard at the west end and rubber ducks bobbing on the water.
// The ducks drift, get shoved by swimmers and squeak (and fly up) when shot.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeos, WATER_Y } from './map.js';
import { sfx } from './audio.js';

// the board: from the deck out over the water, top at step height so anyone can walk onto it
export const BOARD = { x0: 22.4, x1: 26.2, z0: 3.15, z1: 3.85, y: 0.45 };
// pool water area (map.js: cells 24..45 x 2..5)
const PX0 = 24.3, PX1 = 45.7, PZ0 = 2.3, PZ1 = 5.7;

function painted(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  g.computeVertexNormals();
  const nr = g.attributes.normal;
  for (let i = 0; i < n; i++) {
    const k = 0.62 + 0.38 * Math.max(0, nr.getY(i) * 0.8 + nr.getX(i) * 0.2);
    col[i * 3] = c.r * k;
    col[i * 3 + 1] = c.g * k;
    col[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

let duckGeo = null;
function duckGeometry() {
  if (duckGeo) return duckGeo;
  const body = new THREE.SphereGeometry(0.16, 12, 8);
  body.scale(1.25, 0.8, 1);
  body.translate(0, 0.08, 0);
  const tail = new THREE.ConeGeometry(0.06, 0.12, 8).rotateZ(Math.PI / 2 + 0.5).translate(-0.2, 0.15, 0);
  const head = new THREE.SphereGeometry(0.095, 12, 8).translate(0.11, 0.25, 0);
  const beak = new THREE.ConeGeometry(0.04, 0.09, 8).rotateZ(-Math.PI / 2).translate(0.23, 0.23, 0);
  const eyeL = new THREE.SphereGeometry(0.018, 6, 4).translate(0.17, 0.28, 0.05);
  const eyeR = new THREE.SphereGeometry(0.018, 6, 4).translate(0.17, 0.28, -0.05);
  duckGeo = mergeGeos([painted(body, 0xffd21a), painted(tail, 0xffd21a), painted(head, 0xffd21a), painted(beak, 0xff7a10), painted(eyeL, 0x111111), painted(eyeR, 0x111111)]);
  return duckGeo;
}

export class PoolToys {
  constructor(game) {
    this.g = game;
    this.group = new THREE.Group();
    // springboard: a white plank with a blue stripe on a steel stand
    const plank = painted(new THREE.BoxGeometry(BOARD.x1 - BOARD.x0, 0.07, BOARD.z1 - BOARD.z0), 0xf2f4f6);
    const stripe = painted(new THREE.BoxGeometry(BOARD.x1 - BOARD.x0 - 0.2, 0.072, 0.12), 0x2f7fd6);
    this.board = new THREE.Mesh(mergeGeos([plank, stripe]), new THREE.MeshBasicMaterial({ vertexColors: true }));
    // pivot at the deck end so the plank can flex
    this.board.geometry.translate((BOARD.x1 - BOARD.x0) / 2, 0, 0);
    this.board.position.set(BOARD.x0, BOARD.y - 0.035, (BOARD.z0 + BOARD.z1) / 2);
    this.group.add(this.board);
    const stand = new THREE.Mesh(painted(new THREE.BoxGeometry(0.7, BOARD.y - 0.07, 0.8).translate(0, (BOARD.y - 0.07) / 2, 0), 0x9aa3ad), new THREE.MeshBasicMaterial({ vertexColors: true }));
    stand.position.set(BOARD.x0 + 0.45, 0, (BOARD.z0 + BOARD.z1) / 2);
    this.group.add(stand);
    this.flex = 0;
    this.flexV = 0;
    // ducks
    this.ducks = [];
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(duckGeometry(), mat);
      const d = { m, x: PX0 + 2 + Math.random() * (PX1 - PX0 - 4), z: PZ0 + 0.4 + Math.random() * (PZ1 - PZ0 - 0.8), vx: 0, vz: 0, y: 0, vy: 0, yaw: Math.random() * 6.28, spin: 0, ph: Math.random() * 6 };
      this.ducks.push(d);
      this.group.add(m);
    }
    game.scene.add(this.group);
  }

  // where the board is under this point (its top), or null
  boardTop(x, z) {
    if (x < BOARD.x0 || x > BOARD.x1 || z < BOARD.z0 - 0.2 || z > BOARD.z1 + 0.2) return null;
    // the free end dips while it flexes
    return BOARD.y - Math.max(0, this.flex) * ((x - BOARD.x0) / (BOARD.x1 - BOARD.x0)) * 0.25;
  }

  bounce(strength = 1) {
    this.flexV -= 2.5 * strength;
    sfx('boing', [BOARD.x1, BOARD.y, (BOARD.z0 + BOARD.z1) / 2]);
  }

  // a bullet through the duck: it squeaks and pops up
  hit(ox, oy, oz, dx, dy, dz, maxT) {
    let best = null;
    for (const d of this.ducks) {
      const hx = d.x - ox, hy = WATER_Y + 0.15 + d.y - oy, hz = d.z - oz;
      const t = hx * dx + hy * dy + hz * dz;
      if (t <= 0 || t > maxT) continue;
      const d2 = hx * hx + hy * hy + hz * hz - t * t;
      if (d2 < 0.2 * 0.2 && (!best || t < best.t)) best = { d, t };
    }
    return best;
  }

  shoot(d, dx, dz) {
    d.vy = 4 + Math.random() * 2;
    d.vx += dx * 2.5;
    d.vz += dz * 2.5;
    d.spin = (Math.random() - 0.5) * 20;
    sfx('squeak', [d.x, WATER_Y + 0.2, d.z]);
    this.g.fx.puff(d.x, WATER_Y + 0.1, d.z, [0.86, 0.94, 1], 0.5, 0.5, 1, 0.7);
  }

  update(dt) {
    const g = this.g, t = g.time;
    // the board springs back
    this.flexV += (-this.flex * 60 - this.flexV * 5) * dt;
    this.flex += this.flexV * dt;
    this.board.rotation.z = -this.flex * 0.07;
    for (const d of this.ducks) {
      // swimmers and people on the edge push them about
      for (const s of g.soldiers) {
        if (!s.alive) continue;
        const ox = d.x - s.x, oz = d.z - s.z, od = Math.hypot(ox, oz);
        if (od < 0.6 && od > 1e-3 && s.feet < 0.3) {
          d.vx += (ox / od) * (0.6 - od) * 8 * dt + s.vx * dt * 0.8;
          d.vz += (oz / od) * (0.6 - od) * 8 * dt + s.vz * dt * 0.8;
        }
      }
      // a lazy drift, water drag, the pool sides
      d.vx += Math.sin(t * 0.3 + d.ph) * 0.02 * dt;
      d.vz += Math.cos(t * 0.27 + d.ph * 1.3) * 0.02 * dt;
      const drag = Math.exp(-dt * 0.9);
      d.vx *= drag;
      d.vz *= drag;
      d.x += d.vx * dt;
      d.z += d.vz * dt;
      if (d.x < PX0 || d.x > PX1) {
        d.x = Math.max(PX0, Math.min(PX1, d.x));
        d.vx = -d.vx * 0.5;
      }
      if (d.z < PZ0 || d.z > PZ1) {
        d.z = Math.max(PZ0, Math.min(PZ1, d.z));
        d.vz = -d.vz * 0.5;
      }
      // in the air after a shot, then a plop back on the water
      if (d.y > 0 || d.vy > 0) {
        d.vy -= 14 * dt;
        d.y += d.vy * dt;
        d.yaw += d.spin * dt;
        if (d.y <= 0) {
          d.y = 0;
          d.vy = 0;
          d.spin = 0;
          g.fx.puff(d.x, WATER_Y + 0.08, d.z, [0.86, 0.94, 1], 0.4, 0.4, 0.8, 0.6);
        }
      }
      const bob = d.y > 0 ? 0 : Math.sin(t * 2 + d.ph) * 0.015;
      d.m.position.set(d.x, WATER_Y - 0.04 + d.y + bob, d.z);
      d.m.rotation.set(Math.sin(t * 1.7 + d.ph) * 0.08, d.yaw, Math.cos(t * 1.3 + d.ph) * 0.06);
    }
  }

  dispose() {
    this.g.scene.remove(this.group);
    this.board.geometry.dispose();
    this.group.children[1].geometry.dispose();
    this.board.material.dispose();
    this.group.children[1].material.dispose();
    this.ducks[0]?.m.material.dispose();
  }
}
