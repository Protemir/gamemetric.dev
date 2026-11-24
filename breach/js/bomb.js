// Bomb mode: the attackers carry one bomb to site A (east wing) or B (west wing) and plant it;
// the guards stop them or defuse it. The host runs the rules; players online see it through snapshots.
import * as THREE from '../vendor/three.module.min.js';
import { sfx } from './audio.js';
import { t } from './i18n.js';

export const SITES = [
  { name: 'A', x0: 55, z0: 10, x1: 61, z1: 15 },
  { name: 'B', x0: 12, z0: 19, x1: 17, z1: 24 },
];
for (const s of SITES) {
  s.cx = (s.x0 + s.x1 + 1) / 2;
  s.cz = (s.z0 + s.z1 + 1) / 2;
}
export const PLANT_T = 3.2, DEFUSE_T = 5, FUSE = 40, BLAST_R = 17;
const STATES = ['carried', 'dropped', 'planted', 'defused', 'exploded'];

export const siteAt = (x, z) => SITES.findIndex((s) => x >= s.x0 && x < s.x1 + 1 && z >= s.z0 && z < s.z1 + 1);

// a big letter and a dashed frame painted on the floor of a site
function siteTexture(letter) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255, 150, 40, 0.75)';
  g.lineWidth = 10;
  g.setLineDash([26, 16]);
  g.strokeRect(10, 10, 236, 236);
  g.setLineDash([]);
  g.font = '900 150px Arial Black, Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255, 150, 40, 0.55)';
  g.fillText(letter, 128, 138);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Bomb {
  constructor(g) {
    this.g = g;
    // the bomb: a dark block with a small green screen, a keypad and a blinking light
    const grp = new THREE.Group();
    const mk = (geo, color, x, y, z) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
      m.position.set(x, y, z);
      grp.add(m);
      return m;
    };
    mk(new THREE.BoxGeometry(0.36, 0.1, 0.24), 0x3a3f2c, 0, 0.05, 0);
    mk(new THREE.BoxGeometry(0.13, 0.012, 0.08), 0x2fd35a, -0.07, 0.106, -0.03);
    mk(new THREE.BoxGeometry(0.12, 0.012, 0.08), 0x1c1e18, -0.07, 0.106, 0.07);
    mk(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6).rotateZ(Math.PI / 2), 0xb03020, 0, 0.11, -0.1);
    mk(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6).rotateZ(Math.PI / 2), 0x2050b0, 0, 0.12, -0.075);
    this.led = mk(new THREE.SphereGeometry(0.02, 8, 6), 0xff2020, 0.12, 0.11, 0.07);
    grp.visible = false;
    g.scene.add(grp);
    this.mesh = grp;
    // site marks on the floor, and the free floor cells of each site (where bots plant)
    this.marks = SITES.map((s) => {
      const w = s.x1 + 1 - s.x0, d = s.z1 + 1 - s.z0;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.4, d - 0.4).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: siteTexture(s.name), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      );
      m.position.set(s.cx, g.map.groundAt(s.cx, s.cz, 0.05, 0.1) + 0.03, s.cz);
      m.renderOrder = -1;
      g.scene.add(m);
      return m;
    });
    this.cells = SITES.map((s) => {
      const list = [];
      for (let z = s.z0 + 1; z < s.z1; z++) for (let x = s.x0 + 1; x < s.x1; x++) if (g.map.walkable(x, z) && g.map.h[z * 72 + x] < 0.1) list.push([x + 0.5, z + 0.5]);
      return list.length ? list : [[s.cx, s.cz]];
    });
    this.reset();
  }

  reset() {
    this.state = 'carried';
    this.carrier = null;
    this.x = this.z = this.y = 0;
    this.at = 0;
    this.prog = 0;
    this.who = null;
    this.site = -1;
    this.beepAt = 0;
    this.keyAt = 0;
    this.mesh.visible = false;
    this.led.material.color.setHex(0xff2020);
    // where the attackers' bots go this round
    this.target = Math.random() < 0.5 ? 0 : 1;
  }

  get planted() {
    return this.state === 'planted';
  }
  timeLeft() {
    return this.planted ? Math.max(0, this.at + FUSE - this.g.time) : 0;
  }
  // a free floor spot in the target site for a bot to plant on
  plantSpot(i = this.target) {
    const c = this.cells[i];
    return c[Math.floor(Math.random() * c.length)];
  }

  // the round begins: one of the attackers has the bomb
  start() {
    const g = this.g;
    const team = g.soldiers.filter((s) => s.team === 'A' && s.alive);
    if (!team.length) return;
    this.giveTo(team[Math.floor(Math.random() * team.length)], true);
  }

  giveTo(s, quiet = false) {
    this.state = 'carried';
    this.carrier = s;
    this.mesh.visible = false;
    this.prog = 0;
    this.who = null;
    if (s === this.g.player) {
      this.g.hud.center(t('youHaveBomb'), 3);
      if (!quiet) sfx('click');
    }
  }

  dropAt(x, y, z) {
    const m = this.g.map;
    this.state = 'dropped';
    this.carrier = null;
    this.prog = 0;
    this.who = null;
    let gy = m.groundAt(x, z, 0.1, y + 0.1);
    const cx = Math.floor(x), cz = Math.floor(z);
    if (!m.walkable(cx, cz) || gy < -0.05) {
      const c = m.nearestWalk(cx, cz);
      if (c >= 0) {
        x = (c % 72) + 0.5;
        z = Math.floor(c / 72) + 0.5;
        gy = m.groundAt(x, z, 0.1, m.h[c] + 0.1);
      }
    }
    this.x = x;
    this.z = z;
    this.y = gy;
    this.place();
  }

  place() {
    this.mesh.visible = true;
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = (this.x * 7 + this.z * 3) % 6.28;
  }

  // can this player plant or defuse right here?
  canUse(p) {
    return !!p && p.alive && ((this.state === 'carried' && this.carrier === p && this.g.phase === 'live' && siteAt(p.x, p.z) >= 0) || (this.planted && p.team === 'B' && this.near(p)));
  }

  near(s, r = 1.4) {
    return Math.hypot(s.x - this.x, s.z - this.z) < r && Math.abs(s.feet - this.y) < 1.3;
  }

  update(dt) {
    const g = this.g;
    this.visual(dt);
    if (g.role === 'client' || g.over) return;
    if (this.state === 'carried') {
      const c = this.carrier;
      if (!c || !c.alive) {
        if (c) this.dropAt(c.x, c.feet, c.z);
        else this.start();
        return;
      }
      const site = siteAt(c.x, c.z);
      const grounded = c.remote ? c.feet - g.map.groundAt(c.x, c.z, 0.2, c.feet + 0.1) < 0.12 : c.onGround !== false;
      const still = Math.hypot(c.vx || 0, c.vz || 0) < 0.7 && grounded;
      if (c.useHeld && site >= 0 && still && g.phase === 'live') {
        this.who = c;
        this.prog += dt;
        if (this.prog >= PLANT_T) this.plant(c, site);
      } else {
        this.prog = 0;
        this.who = null;
      }
    } else if (this.state === 'dropped') {
      for (const s of g.soldiers)
        if (s.alive && s.team === 'A' && this.near(s, 1)) {
          this.giveTo(s);
          break;
        }
    } else if (this.planted) {
      // a guard defuses while holding E right by it, standing still
      const ok = (s) => s && s.alive && s.team === 'B' && s.useHeld && this.near(s) && Math.hypot(s.vx || 0, s.vz || 0) < 0.7;
      if (!ok(this.who)) {
        this.who = g.soldiers.find(ok) || null;
        this.prog = 0;
      }
      if (this.who) {
        this.prog += dt;
        if (this.prog >= DEFUSE_T) {
          this.defuse(this.who);
          return;
        }
      }
      if (g.time >= this.at + FUSE) this.explode();
    }
  }

  plant(c, site) {
    const g = this.g;
    this.state = 'planted';
    this.carrier = null;
    this.site = site;
    this.at = g.time;
    this.prog = 0;
    this.who = null;
    this.x = c.x;
    this.z = c.z;
    this.y = g.map.groundAt(c.x, c.z, 0.1, c.feet + 0.1);
    this.place();
    c.money = Math.min(16000, c.money + 300);
    this.onPlanted();
  }
  onPlanted() {
    const g = this.g;
    g.hud.announce?.(`💣 ${t('bombPlanted')}`, 3);
    sfx('planted');
    this.beepAt = g.time + 1;
  }

  defuse(d) {
    const g = this.g;
    this.state = 'defused';
    this.prog = 0;
    this.who = null;
    d.money = Math.min(16000, d.money + 300);
    this.onDefused();
    if (g.phase === 'live') g.endRound('B', 'defused');
  }
  onDefused() {
    sfx('defused', [this.x, this.y + 0.3, this.z]);
    this.led.material.color.setHex(0x30ff60);
  }

  explode() {
    const g = this.g;
    this.state = 'exploded';
    this.boom();
    // a huge blast: through walls, falling off with distance
    for (const s of g.soldiers) {
      if (!s.alive) continue;
      const dx = s.x - this.x, dz = s.z - this.z, d = Math.hypot(dx, dz, (s.feet - this.y) * 0.7);
      if (d >= BLAST_R) continue;
      const dmg = 240 * Math.pow(1 - d / BLAST_R, 1.4);
      if (dmg >= 1) g.damage(s, dmg, 'body', null, 'he', dx / (d || 1), dz / (d || 1), 1);
    }
    if (g.phase === 'live') g.endRound('A', 'bombed');
  }
  // what everyone sees and hears of the blast (the host's damage aside)
  boom() {
    const g = this.g, m = g.map, x = this.x, y = this.y, z = this.z;
    this.mesh.visible = false;
    const o = {
      ground: y,
      indoor: m.isIndoor(x, z),
      floor: (fx, fz, fy) => m.groundAt(fx, fz, 0.02, fy + 0.05),
      hit: (ox, oy, oz, dx, dy, dz, tt) => m.raycast(ox, oy, oz, dx, dy, dz, tt),
    };
    g.fx.explosion(x, y + 0.2, z, o);
    g.fx.explosion(x + 0.8, y + 0.9, z - 0.6, { ...o, ground: y });
    g.fx.flash(x, y + 1.5, z, 14, 0.25, 0.6, [1, 0.85, 0.6]);
    sfx('explode', [x, y + 1, z], { indoor: o.indoor });
    sfx('explode', [x, y + 1, z], { indoor: o.indoor, big: true });
    const v = g.view, d = Math.hypot(v.x - x, v.z - z);
    v.shake = Math.max(v.shake || 0, d < 30 ? 2.2 - d / 18 : 0.4);
    if (d < 12) g.flashWhite = Math.max(g.flashWhite || 0, 1.2 - d / 12);
    g.glass?.blast?.(x, y + 1, z, 8);
  }

  // the light blinks, the beeps speed up as the end nears; planting and defusing click away
  visual(dt) {
    const g = this.g;
    if (g.over) {
      this.led.visible = false;
      return;
    }
    if (this.planted) {
      const left = this.timeLeft();
      const gap = left < 2 ? 0.08 : 0.14 + 0.86 * (left / FUSE);
      const quiet = g.role === 'client' && g.nh && performance.now() / 1000 - (g.nh.lastSnapT || 0) > 1.5;
      if (g.time >= this.beepAt && !quiet) {
        this.beepAt = g.time + gap;
        this.ledUntil = g.time + Math.min(0.07, gap * 0.5);
        sfx('beep', [this.x, this.y + 0.2, this.z], { high: left < 10 });
      }
      this.led.visible = g.time < (this.ledUntil || 0);
    } else this.led.visible = this.state !== 'exploded';
    if (this.who && this.prog > 0 && g.time >= this.keyAt) {
      this.keyAt = g.time + (this.planted ? 0.55 : 0.32);
      const s = this.who;
      sfx(this.planted ? 'defusing' : 'plantKey', [s.x, s.feet + 0.6, s.z]);
    }
  }

  // ---------- online ----------
  net() {
    const r2 = (v) => Math.round(v * 100);
    return [STATES.indexOf(this.state), this.carrier ? this.carrier.id : -1, r2(this.x), r2(this.z), r2(this.y), Math.round(this.timeLeft() * 10), Math.round(this.prog * 100), this.who ? this.who.id : -1, this.site, this.target];
  }
  applyNet(a) {
    if (!Array.isArray(a) || a.length < 10) return;
    const g = this.g;
    const st = STATES[a[0]];
    if (!st) return;
    const was = this.state, carrierWas = this.carrier;
    this.carrier = a[1] >= 0 ? g.soldiers[a[1]] || null : null;
    this.prog = Number.isFinite(a[6]) ? a[6] / 100 : 0;
    this.who = a[7] >= 0 ? g.soldiers[a[7]] || null : null;
    this.site = a[8] | 0;
    this.target = a[9] | 0;
    if (st !== 'carried' && Number.isFinite(a[2])) {
      this.x = a[2] / 100;
      this.z = a[3] / 100;
      this.y = a[4] / 100;
    }
    if (st === 'planted') this.at = g.time - (FUSE - a[5] / 10);
    if (st !== was) {
      this.state = st;
      if (st === 'dropped' || st === 'planted') this.place();
      else this.mesh.visible = false;
      if (st === 'planted') this.onPlanted();
      if (st === 'defused') {
        this.mesh.visible = true;
        this.onDefused();
      }
      if (st === 'exploded' && was === 'planted') this.boom();
    }
    if (st === 'carried' && this.carrier === g.player && carrierWas !== g.player) g.hud.center(t('youHaveBomb'), 3);
  }

  dispose() {
    this.mesh.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    for (const m of this.marks) {
      m.material.map.dispose();
      m.material.dispose();
      m.geometry.dispose();
    }
  }
}
