// Rain with thunder: drops falling round the camera (not indoors), a darker sky and fog,
// a steady hiss that softens inside the house, and now and then a lightning flash with a rumble.
import * as THREE from '../vendor/three.module.min.js';
import { rainSound, sfx } from './audio.js';

const N = 1400, BOX = 18, TOP = 14;

export class Rain {
  constructor(game) {
    this.g = game;
    const pos = new Float32Array(N * 6);
    this.drops = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) this.respawn(i, true);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.pos = pos;
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.38, depthWrite: false, fog: true }));
    this.lines.frustumCulled = false;
    game.scene.add(this.lines);
    // a flat grey overcast instead of the sunny photo
    if (game.skyMesh) {
      this.skyMap = game.skyMesh.material.map;
      game.skyMesh.material.map = null;
      game.skyMesh.material.needsUpdate = true;
      game.skyMesh.material.color.setRGB(0.3, 0.33, 0.37);
    }
    game.scene.fog.color.setRGB(0.42, 0.46, 0.5);
    game.scene.fog.near = 18;
    game.scene.fog.far = 95;
    game.scene.background = new THREE.Color(0.42, 0.46, 0.5);
    this.flash = 0;
    this.nextBolt = game.time + 8 + Math.random() * 12;
    rainSound(true);
  }

  respawn(i, anywhere) {
    const v = this.g.view || { x: 36, z: 50 };
    this.drops[i * 3] = v.x + (Math.random() - 0.5) * BOX * 2;
    this.drops[i * 3 + 1] = anywhere ? Math.random() * TOP : TOP + Math.random() * 3;
    this.drops[i * 3 + 2] = v.z + (Math.random() - 0.5) * BOX * 2;
  }

  update(dt) {
    const g = this.g, m = g.map, v = g.view;
    const fall = 16 * dt;
    let n = 0;
    for (let i = 0; i < N; i++) {
      let y = (this.drops[i * 3 + 1] -= fall);
      const x = this.drops[i * 3], z = this.drops[i * 3 + 2];
      // out of the box round the camera, on the ground, or under a roof: start again from the top
      if (y < 0 || Math.abs(x - v.x) > BOX || Math.abs(z - v.z) > BOX) {
        this.respawn(i, false);
        continue;
      }
      // the house: drops stop on the roof (it rises 17° from the eaves at 7.4 m)
      if (m.isIndoor(x, z) && y < 7.5 + Math.min(x - 9.5, 63.5 - x, z - 7.5, 47.5 - z) * 0.306) {
        this.respawn(i, false);
        continue;
      }
      const o = n * 6;
      this.pos[o] = x;
      this.pos[o + 1] = y;
      this.pos[o + 2] = z;
      this.pos[o + 3] = x + 0.03;
      this.pos[o + 4] = y + 0.45;
      this.pos[o + 5] = z + 0.02;
      n++;
    }
    this.lines.geometry.setDrawRange(0, n * 2);
    this.lines.geometry.attributes.position.needsUpdate = true;
    rainSound(true, m.isIndoor(v.x, v.z) ? 0.35 : 1);
    // lightning: the whole picture flashes white, the thunder follows a moment later
    if (g.time > this.nextBolt) {
      this.nextBolt = g.time + 14 + Math.random() * 20;
      this.flash = 1;
      clearTimeout(this.boltT);
      this.boltT = setTimeout(() => !g.disposed && !g.over && sfx('thunder'), 500 + Math.random() * 1500);
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 3);
      const k = 1 + (this.flash > 0.7 || (this.flash > 0.3 && this.flash < 0.45) ? this.flash * 1.4 : 0);
      g.scene.background.setRGB(0.42 * k, 0.46 * k, 0.5 * k);
      if (g.skyMesh) g.skyMesh.material.color.setRGB(0.3 * k, 0.33 * k, 0.37 * k);
    }
  }

  dispose() {
    clearTimeout(this.boltT);
    rainSound(false);
    this.skyMap?.dispose();
    this.g.scene.remove(this.lines);
    this.lines.geometry.dispose();
    this.lines.material.dispose();
  }
}
