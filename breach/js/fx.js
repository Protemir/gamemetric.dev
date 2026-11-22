// Effects: bullet holes, sparks, puffs, tracers, muzzle flashes, explosions.
import * as THREE from '../vendor/three.module.min.js';
import { spriteTexture } from './textures.js';

const MAX_DECALS = 160, MAX_SPARKS = 400, MAX_TRACERS = 48, MAX_PUFFS = 40, MAX_SHELLS = 60, MAX_BLOOD = 70;

// a blood splat: a dark red blot with drops round it
function bloodTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const blot = (x, y, r, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(92,6,8,' + a + ')');
    gr.addColorStop(0.7, 'rgba(110,10,12,' + a * 0.9 + ')');
    gr.addColorStop(1, 'rgba(110,10,12,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  };
  blot(64, 64, 30, 0.95);
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * 6.28, d = 20 + Math.random() * 38;
    blot(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 3 + Math.random() * 8, 0.85);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    // decals
    const dg = new THREE.PlaneGeometry(0.11, 0.11);
    const dm = new THREE.MeshBasicMaterial({ map: spriteTexture('hole'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.decals = new THREE.InstancedMesh(dg, dm, MAX_DECALS);
    this.decals.count = 0;
    this.decals.frustumCulled = false;
    this.decalI = 0;
    scene.add(this.decals);
    // sparks (points)
    this.sp = [];
    const sg = new THREE.BufferGeometry();
    this.spPos = new Float32Array(MAX_SPARKS * 3);
    this.spCol = new Float32Array(MAX_SPARKS * 3);
    sg.setAttribute('position', new THREE.BufferAttribute(this.spPos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(this.spCol, 3));
    this.sparks = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.06, vertexColors: true, sizeAttenuation: true }));
    this.sparks.frustumCulled = false;
    scene.add(this.sparks);
    // tracers
    const tg = new THREE.BufferGeometry();
    this.trPos = new Float32Array(MAX_TRACERS * 6);
    this.trCol = new Float32Array(MAX_TRACERS * 6);
    tg.setAttribute('position', new THREE.BufferAttribute(this.trPos, 3));
    tg.setAttribute('color', new THREE.BufferAttribute(this.trCol, 3));
    this.tracers = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.tracers.frustumCulled = false;
    this.tr = [];
    scene.add(this.tracers);
    // puffs and flashes (sprites)
    const puffTex = spriteTexture('puff'), flashTex = spriteTexture('flash');
    this.puffs = [];
    for (let i = 0; i < MAX_PUFFS; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false }));
      s.visible = false;
      scene.add(s);
      this.puffs.push({ s, life: 0 });
    }
    this.flashes = [];
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.visible = false;
      scene.add(s);
      this.flashes.push({ s, life: 0 });
    }
    // spent brass: little cylinders that fly out, bounce and lie on the floor for a while
    const shg = new THREE.CylinderGeometry(0.006, 0.006, 0.026, 6).rotateZ(Math.PI / 2);
    this.shells = new THREE.InstancedMesh(shg, new THREE.MeshBasicMaterial({ color: 0xc9a14a }), MAX_SHELLS);
    this.shells.count = 0;
    this.shells.frustumCulled = false;
    this.sh = [];
    scene.add(this.shells);
    // blood on walls and floors
    const bm = new THREE.MeshBasicMaterial({ map: bloodTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.blood = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), bm, MAX_BLOOD);
    this.blood.count = 0;
    this.blood.frustumCulled = false;
    this.bloodI = 0;
    scene.add(this.blood);
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.v = new THREE.Vector3();
    this.zAxis = new THREE.Vector3(0, 0, 1);
  }

  clear() {
    this.shells.count = 0;
    this.sh.length = 0;
    this.blood.count = 0;
    this.bloodI = 0;
    this.decals.count = 0;
    this.decalI = 0;
    this.sp.length = 0;
    this.tr.length = 0;
    for (const p of this.puffs) (p.life = 0), (p.s.visible = false);
    for (const p of this.flashes) (p.life = 0), (p.s.visible = false);
  }

  decal(x, y, z, nx, ny, nz) {
    this.v.set(nx, ny, nz);
    this.q.setFromUnitVectors(this.zAxis, this.v);
    const s = 0.8 + Math.random() * 0.5;
    this.m.compose(new THREE.Vector3(x + nx * 0.004, y + ny * 0.004, z + nz * 0.004), this.q, new THREE.Vector3(s, s, s));
    this.decals.setMatrixAt(this.decalI, this.m);
    this.decalI = (this.decalI + 1) % MAX_DECALS;
    this.decals.count = Math.max(this.decals.count, this.decalI === 0 ? MAX_DECALS : this.decalI);
    this.decals.instanceMatrix.needsUpdate = true;
  }

  // a splash of blood on a surface (size in metres)
  bloodDecal(x, y, z, nx, ny, nz, size = 0.5) {
    this.v.set(nx, ny, nz);
    this.q.setFromUnitVectors(this.zAxis, this.v);
    const turn = new THREE.Quaternion().setFromAxisAngle(this.v, Math.random() * 6.28);
    this.q.premultiply(turn);
    const s = size * (0.7 + Math.random() * 0.6);
    this.m.compose(new THREE.Vector3(x + nx * 0.006, y + ny * 0.006, z + nz * 0.006), this.q, new THREE.Vector3(s, s, s));
    this.blood.setMatrixAt(this.bloodI, this.m);
    this.bloodI = (this.bloodI + 1) % MAX_BLOOD;
    this.blood.count = Math.max(this.blood.count, this.bloodI === 0 ? MAX_BLOOD : this.bloodI);
    this.blood.instanceMatrix.needsUpdate = true;
  }

  // a spent case thrown out to the right of a gun; floor(x, z) gives the height it lands on
  shell(x, y, z, vx, vy, vz, floor, onTink) {
    if (this.sh.length >= MAX_SHELLS) this.sh.shift();
    this.sh.push({ x, y, z, vx, vy, vz, rx: Math.random() * 6, ry: Math.random() * 6, sx: (Math.random() - 0.5) * 30, sy: (Math.random() - 0.5) * 30, life: 9, floor, onTink, bounces: 0 });
  }

  spark(x, y, z, nx, ny, nz, color, n = 6, speed = 3) {
    for (let i = 0; i < n; i++) {
      if (this.sp.length >= MAX_SPARKS) this.sp.shift();
      this.sp.push({
        x, y, z,
        vx: nx * speed * Math.random() + (Math.random() - 0.5) * speed,
        vy: ny * speed * Math.random() + Math.random() * speed * 0.8,
        vz: nz * speed * Math.random() + (Math.random() - 0.5) * speed,
        life: 0.25 + Math.random() * 0.35,
        r: color[0], g: color[1], b: color[2],
      });
    }
  }

  puff(x, y, z, color, size, life, vy = 0.4, opacity = 0.7) {
    let p = this.puffs.find((q) => q.life <= 0);
    if (!p) p = this.puffs[Math.floor(Math.random() * this.puffs.length)];
    p.s.visible = true;
    p.s.position.set(x, y, z);
    p.s.material.color.setRGB(color[0], color[1], color[2]);
    p.size = size;
    p.life = p.max = life;
    p.vy = vy;
    p.op = opacity;
    p.s.scale.setScalar(size * 0.5);
  }

  flash(x, y, z, size = 0.5, life = 0.05) {
    let p = this.flashes.find((q) => q.life <= 0) || this.flashes[0];
    p.s.visible = true;
    p.s.position.set(x, y, z);
    p.s.scale.setScalar(size);
    p.s.material.rotation = Math.random() * 6;
    p.life = p.max = life;
  }

  tracer(ax, ay, az, bx, by, bz, bright = 1) {
    if (this.tr.length >= MAX_TRACERS) this.tr.shift();
    this.tr.push({ ax, ay, az, bx, by, bz, life: 0.07, max: 0.07, k: bright });
  }

  update(dt) {
    // shells
    let ns = 0;
    for (let i = this.sh.length - 1; i >= 0; i--) {
      const p = this.sh[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.sh.splice(i, 1);
        continue;
      }
      if (p.bounces < 3) {
        p.vy -= 9.8 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.rx += p.sx * dt;
        p.ry += p.sy * dt;
        const fy = (p.floor ? p.floor(p.x, p.z) : 0) + 0.006;
        if (p.y < fy && p.vy < 0) {
          p.y = fy;
          p.vy = -p.vy * 0.35;
          p.vx *= 0.5;
          p.vz *= 0.5;
          p.sx *= 0.5;
          p.sy *= 0.5;
          p.bounces++;
          if (p.bounces === 1) p.onTink?.(p.x, p.y, p.z);
          if (p.bounces >= 3) p.rx = Math.PI / 2;
        }
      }
    }
    for (const p of this.sh) {
      this.q.setFromEuler(new THREE.Euler(p.rx, p.ry, 0));
      this.m.compose(this.v.set(p.x, p.y, p.z), this.q, new THREE.Vector3(1, 1, 1));
      this.shells.setMatrixAt(ns++, this.m);
    }
    this.shells.count = ns;
    if (ns) this.shells.instanceMatrix.needsUpdate = true;
    // sparks
    let n = 0;
    for (let i = this.sp.length - 1; i >= 0; i--) {
      const p = this.sp[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.sp.splice(i, 1);
        continue;
      }
      p.vy -= 9 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.01) {
        p.y = 0.01;
        p.vy *= -0.3;
      }
    }
    for (const p of this.sp) {
      this.spPos[n * 3] = p.x;
      this.spPos[n * 3 + 1] = p.y;
      this.spPos[n * 3 + 2] = p.z;
      const k = Math.min(1, p.life * 4);
      this.spCol[n * 3] = p.r * k;
      this.spCol[n * 3 + 1] = p.g * k;
      this.spCol[n * 3 + 2] = p.b * k;
      n++;
    }
    this.sparks.geometry.setDrawRange(0, n);
    this.sparks.geometry.attributes.position.needsUpdate = true;
    this.sparks.geometry.attributes.color.needsUpdate = true;
    this.sparks.visible = n > 0;
    // tracers
    let m = 0;
    for (let i = this.tr.length - 1; i >= 0; i--) if ((this.tr[i].life -= dt) <= 0) this.tr.splice(i, 1);
    for (const tr of this.tr) {
      const k = (tr.life / tr.max) * tr.k;
      this.trPos.set([tr.ax, tr.ay, tr.az, tr.bx, tr.by, tr.bz], m * 6);
      this.trCol.set([1 * k * 0.4, 0.85 * k * 0.4, 0.5 * k * 0.4, 1 * k, 0.9 * k, 0.6 * k], m * 6);
      m++;
    }
    this.tracers.geometry.setDrawRange(0, m * 2);
    this.tracers.geometry.attributes.position.needsUpdate = true;
    this.tracers.geometry.attributes.color.needsUpdate = true;
    this.tracers.visible = m > 0;
    // puffs
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.s.visible = false;
        continue;
      }
      const k = 1 - p.life / p.max;
      p.s.position.y += p.vy * dt;
      p.s.scale.setScalar(p.size * (0.5 + k * 0.9));
      p.s.material.opacity = p.op * (1 - k);
    }
    for (const p of this.flashes) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) p.s.visible = false;
      else p.s.material.opacity = p.life / p.max;
    }
  }
}
