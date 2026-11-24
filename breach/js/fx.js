// Effects: bullet holes, sparks, puffs, tracers, muzzle flashes, explosions.
import * as THREE from '../vendor/three.module.min.js';
import { spriteTexture } from './textures.js';

const MAX_DECALS = 160, MAX_SPARKS = 500, MAX_TRACERS = 48, MAX_PUFFS = 80, MAX_SHELLS = 60, MAX_BLOOD = 70, MAX_SCORCH = 10, MAX_DEBRIS = 90;

// a thick lumpy cloud for a blast: overlapping round blobs, solid in the middle
function denseSmokeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * 6.28, d = Math.random() * 26, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, r = 22 + Math.random() * 18;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const v = 200 + Math.floor(Math.random() * 55);
    gr.addColorStop(0, `rgba(${v},${v},${v},0.8)`);
    gr.addColorStop(0.6, `rgba(${v},${v},${v},0.45)`);
    gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// the black star a grenade leaves on the floor: soot in the middle, streaks thrown outwards
function scorchTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 60);
  gr.addColorStop(0, 'rgba(8,7,6,0.92)');
  gr.addColorStop(0.35, 'rgba(18,15,12,0.8)');
  gr.addColorStop(0.7, 'rgba(30,26,22,0.35)');
  gr.addColorStop(1, 'rgba(30,26,22,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(10,9,8,0.55)';
  g.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * 6.28, r0 = 10 + Math.random() * 12, r1 = 34 + Math.random() * 26;
    g.lineWidth = 1.5 + Math.random() * 4;
    g.beginPath();
    g.moveTo(64 + Math.cos(a) * r0, 64 + Math.sin(a) * r0);
    g.lineTo(64 + Math.cos(a) * r1, 64 + Math.sin(a) * r1);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

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
    this.sparks.renderOrder = 4;
    scene.add(this.sparks);
    // tracers
    const tg = new THREE.BufferGeometry();
    this.trPos = new Float32Array(MAX_TRACERS * 6);
    this.trCol = new Float32Array(MAX_TRACERS * 6);
    tg.setAttribute('position', new THREE.BufferAttribute(this.trPos, 3));
    tg.setAttribute('color', new THREE.BufferAttribute(this.trCol, 3));
    this.tracers = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.tracers.frustumCulled = false;
    this.tracers.renderOrder = 3;
    this.tr = [];
    scene.add(this.tracers);
    // puffs and flashes (sprites)
    const puffTex = spriteTexture('puff'), flashTex = spriteTexture('flash');
    this.puffTex = puffTex;
    this.denseTex = denseSmokeTexture();
    this.puffs = [];
    for (let i = 0; i < MAX_PUFFS; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false }));
      s.visible = false;
      scene.add(s);
      this.puffs.push({ s, life: 0 });
    }
    this.flashes = [];
    for (let i = 0; i < 20; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.visible = false;
      s.renderOrder = 3;
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
    // grenade scorch marks on the floor
    const scm = new THREE.MeshBasicMaterial({ map: scorchTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.scorch = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), scm, MAX_SCORCH);
    this.scorch.count = 0;
    this.scorch.frustumCulled = false;
    this.scorchI = 0;
    scene.add(this.scorch);
    // bits of floor, plaster and casing thrown by a blast: little dark chunks that bounce and lie
    this.debris = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x3b342d }), MAX_DEBRIS);
    this.debris.count = 0;
    this.debris.frustumCulled = false;
    this.db = [];
    scene.add(this.debris);
    // the shock wave: a pale ring of dust racing out over the floor
    this.waves = [];
    const rg = new THREE.RingGeometry(0.72, 1, 48).rotateX(-Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xe2d3b4, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      w.visible = false;
      w.renderOrder = 1;
      scene.add(w);
      this.waves.push({ w, life: 0 });
    }
    this.m = new THREE.Matrix4();
    this._e = new THREE.Euler();
    this._one = new THREE.Vector3(1, 1, 1);
    this._sc = new THREE.Vector3();
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
    this.scorch.count = 0;
    this.scorchI = 0;
    this.db.length = 0;
    this.debris.count = 0;
    for (const w of this.waves) (w.life = 0), (w.w.visible = false);
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

  // a spray tag on a wall
  sprayDecal(x, y, z, nx, ny, nz, kind) {
    if (!this.sprayTex) {
      this.sprayTex = [];
      const tags = ['💀', '🐔', '😎', '🔥', '👑', 'GG'];
      for (const t of tags) {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d');
        g.fillStyle = 'rgba(255,255,255,0)';
        g.fillRect(0, 0, 128, 128);
        g.font = t === 'GG' ? '900 70px Arial Black, Impact, sans-serif' : '86px serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.shadowColor = 'rgba(0,0,0,0.5)';
        g.shadowBlur = 6;
        g.fillStyle = t === 'GG' ? '#ff4fb0' : '#fff';
        g.fillText(t, 64, 70);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        this.sprayTex.push(tex);
      }
      this.sprays = [];
    }
    const mat = new THREE.MeshBasicMaterial({ map: this.sprayTex[kind % this.sprayTex.length], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, opacity: 0.92 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), mat);
    this.v.set(nx, ny, nz);
    m.quaternion.setFromUnitVectors(this.zAxis, this.v);
    m.position.set(x + nx * 0.01, y + ny * 0.01, z + nz * 0.01);
    this.scene.add(m);
    this.sprays.push(m);
    if (this.sprays.length > 12) {
      const old = this.sprays.shift();
      this.scene.remove(old);
      old.geometry.dispose();
      old.material.dispose();
    }
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
        life: (0.25 + Math.random() * 0.35) * (speed > 8 ? 1.8 : 1),
        r: color[0], g: color[1], b: color[2],
      });
    }
  }

  puff(x, y, z, color, size, life, vy = 0.4, opacity = 0.7, vx = 0, vz = 0, grow = 0.9, dense = false) {
    let p = this.puffs.find((q) => q.life <= 0);
    if (!p) p = this.puffs[Math.floor(Math.random() * this.puffs.length)];
    p.s.visible = true;
    p.s.material.map = dense ? this.denseTex : this.puffTex;
    p.s.material.rotation = dense ? Math.random() * 6.28 : 0;
    p.s.position.set(x, y, z);
    p.s.material.color.setRGB(color[0], color[1], color[2]);
    p.size = size;
    p.life = p.max = life;
    p.vy = vy;
    p.vx = vx;
    p.vz = vz;
    p.grow = grow;
    p.op = opacity;
    p.s.scale.setScalar(size * 0.5);
  }

  flash(x, y, z, size = 0.5, life = 0.05, grow = 0, color = null) {
    let p = this.flashes.find((q) => q.life <= 0) || this.flashes[0];
    p.s.visible = true;
    p.size = size;
    p.grow = grow;
    if (color) p.s.material.color.setRGB(color[0], color[1], color[2]);
    else p.s.material.color.setRGB(1, 1, 1);
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
        const fy = (p.floor ? p.floor(p.x, p.z, p.y) : 0) + 0.006;
        if (p.y < fy && p.vy < 0) {
          p.y = fy;
          p.vy = -p.vy * 0.35;
          p.vx *= 0.5;
          p.vz *= 0.5;
          p.sx *= 0.5;
          p.sy *= 0.5;
          p.bounces++;
          if (p.bounces === 1 && performance.now() - (this.tinkAt || 0) > 90) {
            this.tinkAt = performance.now();
            p.onTink?.(p.x, p.y, p.z);
          }
          if (p.bounces >= 3) p.rx = Math.PI / 2;
        }
      }
    }
    for (const p of this.sh) {
      this.q.setFromEuler(this._e.set(p.rx, p.ry, 0));
      this.m.compose(this.v.set(p.x, p.y, p.z), this.q, this._one);
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
      if (p.vx || p.vz) {
        // dust thrown out by a blast slows down fast
        const drag = Math.exp(-3.2 * dt);
        p.vx *= drag;
        p.vz *= drag;
        p.s.position.x += p.vx * dt;
        p.s.position.z += p.vz * dt;
      }
      p.s.scale.setScalar(p.size * ((p.s.material.map === this.denseTex ? 0.85 : 0.5) + k * (p.grow ?? 0.9)));
      // a blast cloud stays thick for most of its life, then thins
      p.s.material.opacity = p.op * (p.grow >= 1.4 ? 1 - k * k : 1 - k);
    }
    for (const p of this.flashes) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) p.s.visible = false;
      else {
        const k = p.life / p.max;
        p.s.material.opacity = p.grow ? Math.pow(k, 0.6) : k;
        if (p.grow) p.s.scale.setScalar(p.size * (1 + p.grow * (1 - k)));
      }
    }
    // shock waves
    for (const q of this.waves) {
      if (q.life <= 0) continue;
      q.life -= dt;
      if (q.life <= 0) {
        q.w.visible = false;
        continue;
      }
      const k = 1 - q.life / q.max;
      q.w.scale.setScalar(0.4 + (q.r - 0.4) * (1 - (1 - k) * (1 - k)));
      q.w.material.opacity = 0.5 * (1 - k);
    }
    // debris
    let nd = 0;
    for (let i = this.db.length - 1; i >= 0; i--) {
      const p = this.db[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.db.splice(i, 1);
        continue;
      }
      if (p.bounces < 2) {
        p.vy -= 14 * dt;
        const sp = Math.hypot(p.vx, p.vy, p.vz);
        const hit = p.hit && sp > 0.01 ? p.hit(p.x, p.y, p.z, p.vx / sp, p.vy / sp, p.vz / sp, sp * dt + 0.03) : null;
        if (hit) {
          const dot = p.vx * hit.nx + p.vy * hit.ny + p.vz * hit.nz;
          p.vx = (p.vx - 2 * dot * hit.nx) * 0.35;
          p.vy = (p.vy - 2 * dot * hit.ny) * 0.35;
          p.vz = (p.vz - 2 * dot * hit.nz) * 0.35;
          // a floor met by the ray counts as a landing, so the chunk comes to rest
          if (hit.ny > 0.5) p.bounces++;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.rx += p.sx * dt;
        p.ry += p.sy * dt;
        const fy = (p.floor ? p.floor(p.x, p.z, p.y) : 0) + p.s * 0.5;
        if (p.y < fy && p.vy < 0) {
          p.y = fy;
          p.vy = -p.vy * 0.3;
          p.vx *= 0.45;
          p.vz *= 0.45;
          p.sx *= 0.4;
          p.sy *= 0.4;
          p.bounces++;
        }
      }
    }
    for (const p of this.db) {
      const sc = p.s * Math.min(1, p.life * 2);
      this.q.setFromEuler(this._e.set(p.rx, p.ry, 0));
      this.m.compose(this.v.set(p.x, p.y, p.z), this.q, this._sc.set(sc, sc * 0.6, sc * 0.8));
      this.debris.setMatrixAt(nd++, this.m);
    }
    this.debris.count = nd;
    if (nd) this.debris.instanceMatrix.needsUpdate = true;
  }

  // A hand grenade going off: a white flash and a rolling fireball, a ring of dust racing over the floor,
  // a black cloud climbing, embers and bits of floor flying, and a scorch mark left behind.
  // o: { ground: floor height, water: in the pool, indoor: a ceiling above (the cloud spreads instead of climbing),
  //      floor(x, z, y): floor height for the debris }
  explosion(x, y, z, o = {}) {
    const gy = o.ground ?? 0, R = () => Math.random() - 0.5;
    if (o.water) y = Math.max(y, gy);
    // a blast in the air leaves no mark and sends no ring over the floor
    const low = y - gy < 0.7;
    this.flash(x, y + 0.5, z, 7.5, 0.08, 0, [1, 0.97, 0.86]);
    this.flash(x, y + 0.7, z, 3.4, 0.42, 1.6, [1, 0.7, 0.3]);
    this.flash(x + R() * 0.8, y + 1.1, z + R() * 0.8, 2.8, 0.5, 1.5, [1, 0.48, 0.15]);
    this.flash(x + R() * 0.8, y + 0.5, z + R() * 0.8, 2.4, 0.58, 1.3, [0.95, 0.34, 0.1]);
    this.flash(x + R() * 0.6, y + 1.6, z + R() * 0.6, 2, 0.62, 1.4, [0.9, 0.3, 0.08]);
    if (o.water) {
      // a column of water instead of fire on the floor
      for (let i = 0; i < 9; i++) this.puff(x + R() * 1.2, gy + 0.3 + Math.random() * 1.5, z + R() * 1.2, [0.88, 0.95, 1], 2.4 + Math.random(), 1.1 + Math.random() * 0.6, 2.6 + Math.random() * 2, 0.8, R() * 2, R() * 2, 1.1);
      this.spark(x, gy + 0.2, z, 0, 1, 0, [0.85, 0.94, 1], 60, 9);
    } else {
      // the black cloud: climbs and spreads (under a ceiling it rolls out more than up)
      const up = o.indoor ? 0.35 : 1;
      for (let i = 0; i < 8; i++) {
        const shade = 0.06 + Math.random() * 0.06;
        this.puff(x + R() * 0.9, y + 0.6 + Math.random() * 0.9 * up, z + R() * 0.9, [shade, shade * 0.95, shade * 0.9], 3.2 + Math.random() * 1.8, 3 + Math.random() * 1.6, (0.7 + Math.random() * 0.8) * up, 0.95, R() * 1.4, R() * 1.4, 1.5, true);
      }
      // the dust ring hugging the floor
      for (let i = 0; i < (low ? 12 : 0); i++) {
        const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4, sp = 5 + Math.random() * 3;
        this.puff(x + Math.cos(a) * 0.4, gy + 0.35, z + Math.sin(a) * 0.4, [0.6, 0.54, 0.45], 2.2 + Math.random() * 0.9, 1.4 + Math.random() * 0.7, 0.18, 0.7, Math.cos(a) * sp, Math.sin(a) * sp, 1.3, true);
      }
      // embers and hot bits
      this.spark(x, y + 0.25, z, 0, 1, 0, [1, 0.78, 0.4], 55, 12);
      this.spark(x, y + 0.25, z, 0, 0.6, 0, [1, 0.48, 0.14], 35, 7);
      // chunks of floor thrown out
      for (let i = 0; i < 24; i++) {
        if (this.db.length >= MAX_DEBRIS) this.db.shift();
        const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 7;
        this.db.push({
          x: x + Math.cos(a) * 0.2, y: Math.max(y, gy) + 0.15, z: z + Math.sin(a) * 0.2,
          vx: Math.cos(a) * sp, vy: 3 + Math.random() * 6 * (o.indoor ? 0.6 : 1), vz: Math.sin(a) * sp,
          s: 0.05 + Math.random() * 0.08, rx: Math.random() * 6, ry: Math.random() * 6, sx: R() * 24, sy: R() * 24,
          life: 4 + Math.random() * 3, bounces: 0, floor: o.floor, hit: o.hit,
        });
      }
      // the scorch on the floor
      if (low) this.scorchAt(x, gy, z);
    }
    if (!low) return;
    this.wave(x, gy, z);
  }

  scorchAt(x, gy, z) {
    {
      this.q.setFromEuler(this._e.set(0, Math.random() * 6.28, 0));
      const s = 2.6 + Math.random() * 0.9;
      this.m.compose(this.v.set(x, gy + 0.012, z), this.q, this._sc.set(s, 1, s));
      this.scorch.setMatrixAt(this.scorchI, this.m);
      this.scorchI = (this.scorchI + 1) % MAX_SCORCH;
      this.scorch.count = Math.min(MAX_SCORCH, this.scorch.count + 1);
      this.scorch.instanceMatrix.needsUpdate = true;
    }
  }

  // the shock wave
  wave(x, gy, z) {
    const q = this.waves.find((w) => w.life <= 0) || this.waves[0];
    q.w.visible = true;
    q.w.position.set(x, gy + 0.07, z);
    q.life = q.max = 0.38;
    q.r = 7;
    q.w.scale.setScalar(0.4);
    q.w.material.opacity = 0.5;
  }
}
