// The lounge fireplace: a dark firebox in the brick, a few flickering flames, embers and a soft crackle.
import * as THREE from '../vendor/three.module.min.js';
import { sfx } from './audio.js';

// front of the brick box (map.js: cells 54..56 at z = 9, so its face is at z = 10)
const X = 55.5, Z = 10.005;

function flameTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  // a teardrop: wide and hot at the bottom, a thin orange tip
  const gr = g.createRadialGradient(32, 96, 2, 32, 84, 60);
  gr.addColorStop(0, 'rgba(255,250,210,1)');
  gr.addColorStop(0.25, 'rgba(255,190,70,0.95)');
  gr.addColorStop(0.6, 'rgba(240,90,20,0.55)');
  gr.addColorStop(1, 'rgba(160,30,0,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(32, 4);
  g.bezierCurveTo(46, 40, 60, 70, 56, 100);
  g.bezierCurveTo(52, 124, 12, 124, 8, 100);
  g.bezierCurveTo(4, 70, 18, 40, 32, 4);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Fireplace {
  constructor(game) {
    this.g = game;
    this.group = new THREE.Group();
    // the opening: soot-black inside, a stone lintel over it
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.95), new THREE.MeshBasicMaterial({ color: 0x0b0806 }));
    hole.position.set(X, 0.12 + 0.475, Z);
    this.group.add(hole);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.08), new THREE.MeshBasicMaterial({ color: 0x8a8075 }));
    lintel.position.set(X, 1.15, Z + 0.035);
    this.group.add(lintel);
    const mantel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.3), new THREE.MeshBasicMaterial({ color: 0x5b3a22 }));
    mantel.position.set(X, 1.85, Z - 0.1);
    this.group.add(mantel);
    // logs
    const logMat = new THREE.MeshBasicMaterial({ color: 0x2a1a10 });
    for (const [dx, rot] of [[-0.18, 0.25], [0.18, -0.3]]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.75, 8), logMat);
      log.rotation.set(0, rot, Math.PI / 2);
      log.position.set(X + dx * 0.4, 0.2, Z + 0.09);
      this.group.add(log);
    }
    // embers glowing under the logs
    const ember = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.35).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    ember.position.set(X, 0.14, Z + 0.12);
    this.group.add(ember);
    this.ember = ember;
    // flames
    const tex = flameTexture();
    this.flames = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const s = new THREE.Sprite(m);
      const dx = (i - 2) * 0.17;
      s.position.set(X + dx, 0.45, Z + 0.07);
      this.flames.push({ s, dx, ph: Math.random() * 10, sp: 7 + Math.random() * 5, h: 0.55 + Math.random() * 0.3 - Math.abs(i - 2) * 0.08 });
      this.group.add(s);
    }
    this.tex = tex;
    game.scene.add(this.group);
    this.crackleAt = 0;
  }

  update(dt) {
    const g = this.g, t = g.time;
    for (const f of this.flames) {
      const k = 0.75 + 0.25 * Math.sin(t * f.sp + f.ph) + 0.12 * Math.sin(t * f.sp * 2.3 + f.ph * 2);
      const h = f.h * k;
      f.s.scale.set(0.32 + 0.06 * Math.sin(t * 5 + f.ph), h, 1);
      f.s.position.set(X + f.dx + 0.03 * Math.sin(t * 9 + f.ph), 0.18 + h / 2, Z + 0.07);
      f.s.material.opacity = 0.85 + 0.15 * Math.sin(t * 13 + f.ph);
    }
    this.ember.material.opacity = 0.6 + 0.25 * Math.sin(t * 3.1) * Math.sin(t * 1.7);
    // a crackle now and then when someone is close enough to hear it
    if (t > this.crackleAt) {
      this.crackleAt = t + 0.25 + Math.random() * 0.9;
      const v = g.view;
      if (Math.hypot(v.x - X, v.z - Z) < 9) sfx("crackle", [X, 0.5, Z + 0.1]);
    }
  }

  dispose() {
    this.g.scene.remove(this.group);
    this.group.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    this.tex.dispose();
  }
}
