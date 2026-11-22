// Effects: bullet holes, sparks, puffs, tracers, muzzle flashes, explosions.
import * as THREE from '../vendor/three.module.min.js';
import { spriteTexture } from './textures.js';

const MAX_DECALS = 160, MAX_SPARKS = 400, MAX_TRACERS = 48, MAX_PUFFS = 40;

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
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.v = new THREE.Vector3();
    this.zAxis = new THREE.Vector3(0, 0, 1);
  }

  clear() {
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
