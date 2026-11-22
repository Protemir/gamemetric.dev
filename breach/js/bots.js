// Bot brains: see, react, aim with human-like error, follow team plans, hear shots and steps.
import { WEAPONS } from './weapons.js';

export const SKILL = {
  easy: { react: 0.7, err: 0.14, turn: 4.5, head: 0.12, control: 0.35, fov: 1.15, track: 1.2, burst: 3 },
  normal: { react: 0.42, err: 0.085, turn: 7.5, head: 0.28, control: 0.65, fov: 1.3, track: 2.2, burst: 5 },
  hard: { react: 0.24, err: 0.045, turn: 11, head: 0.5, control: 0.88, fov: 1.45, track: 3.5, burst: 8 },
};

const angDiff = (a, b) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const yawTo = (dx, dz) => Math.atan2(-dx, -dz);

export class Brain {
  constructor(s, game, skill) {
    this.s = s;
    this.g = game;
    this.k = SKILL[skill] || SKILL.normal;
    this.reset();
  }

  reset() {
    this.goal = null;
    this.path = null;
    this.pi = 0;
    this.repathAt = 0;
    this.target = null;
    this.reactAt = 0;
    this.errY = 0;
    this.errP = 0;
    this.lastKnown = null;
    this.thinkAt = 0;
    this.strafe = 1;
    this.strafeAt = 0;
    this.burstLeft = 0;
    this.pauseUntil = 0;
    this.stuckAt = 0;
    this.lastPos = [this.s.x, this.s.z];
    this.lookYaw = this.s.yaw;
    this.lookPitch = 0;
    this.hurtBy = null;
    this.hurtAt = -9;
    this.glanceAt = 0;
    this.nadeAt = this.g.time + 8 + Math.random() * 20;
    this.waitUntil = 0;
  }

  // ---------- money ----------
  buy() {
    const s = this.s, g = this.g;
    if (g.mode === 'dm') {
      const pool = ['rifle', 'rifle', 'smg', 'shotgun', 'sniper', 'rifle', 'deagle'];
      const k = pool[Math.floor(Math.random() * pool.length)];
      g.giveWeapon(s, k);
      s.armor = 100;
      s.helmet = true;
      s.switchSlot(WEAPONS[k].slot, true);
      return;
    }
    const spend = (kind, price) => {
      if (s.money < price) return false;
      s.money -= price;
      if (kind === 'armor') s.armor = 100;
      else if (kind === 'helmet') {
        s.armor = 100;
        s.helmet = true;
      } else if (kind === 'he') s.he = 1;
      else if (kind === 'flash') s.flash = Math.min(2, s.flash + 1);
      else g.giveWeapon(s, kind);
      return true;
    };
    const m = s.money;
    const sniperOk = !g.soldiers.some((o) => o !== s && o.team === s.team && o.slots[1] === 'sniper');
    if (!s.slots[1]) {
      if (m >= 6000 && sniperOk && Math.random() < 0.35) spend('sniper', 4750);
      else if (m >= 3700) spend('rifle', 2700);
      else if (m >= 2300) {
        const k = Math.random() < 0.3 ? 'shotgun' : 'smg';
        spend(k, WEAPONS[k].price);
      }
      else if (m >= 1500 && Math.random() < 0.5) spend('smg', 1250);
      else if (m >= 900 && s.slots[2] === 'pistol' && Math.random() < 0.4) spend('deagle', 700);
    }
    if (s.armor < 50) {
      if (s.money >= 1000 + 300 && Math.random() < 0.8) spend('helmet', 1000);
      else if (s.money >= 650) spend('armor', 650);
    }
    if (s.money >= 500 && Math.random() < 0.6) spend('he', 300);
    if (s.money >= 400 && Math.random() < 0.4) spend('flash', 200);
    s.switchSlot(s.slots[1] ? 1 : 2, true);
  }

  // ---------- plans ----------
  planRound() {
    const g = this.g, s = this.s, map = g.map;
    this.reset();
    if (g.mode === 'dm') {
      this.goal = { type: 'hunt' };
      return;
    }
    if (s.team === 'A') {
      const route = map.routes[Math.floor(Math.random() * map.routes.length)];
      this.goal = { type: 'route', pts: route.slice(), i: 0 };
      // some wait a moment so they do not all arrive in a line
      this.waitUntil = g.time + Math.random() * 2.5;
    } else {
      const spot = g.claimHold(s);
      this.goal = { type: 'hold', spot };
    }
  }

  setGoalPoint(x, z) {
    const p = this.g.map.path(this.s.x, this.s.z, x, z);
    this.path = p;
    this.pi = 0;
    this.repathAt = this.g.time + 3 + Math.random();
  }

  // ---------- perception ----------
  canSee(o, eyeY) {
    const s = this.s, g = this.g;
    const dx = o.x - s.x, dz = o.z - s.z, d = Math.hypot(dx, dz);
    if (d > 75) return false;
    const fov = this.k.fov;
    const facing = Math.abs(angDiff(s.yaw, yawTo(dx, dz)));
    const alerted = this.hurtBy === o && g.time - this.hurtAt < 2.5;
    if (d > 4 && facing > fov && !alerted) return false;
    // dark interiors and smoke are not modelled; walls are
    const head = o.feet + o.eyeH();
    if (g.map.los(s.x, eyeY, s.z, o.x, head, o.z)) return true;
    if (g.map.los(s.x, eyeY, s.z, o.x, o.feet + 1.0, o.z)) return true;
    return false;
  }

  think() {
    const s = this.s, g = this.g;
    const eyeY = s.feet + s.eyeH();
    let best = null, bd = 1e9;
    for (const o of g.soldiers) {
      if (!o.alive || o.team === s.team || o.spawnProtect > g.time) continue;
      const d = Math.hypot(o.x - s.x, o.z - s.z);
      // keep the current target if still visible, else the closest one
      const score = d - (o === this.target ? 8 : 0);
      if (score < bd && this.canSee(o, eyeY)) {
        bd = score;
        best = o;
      }
    }
    if (best) {
      if (best !== this.target) {
        const first = !this.target || g.time - this.targetLost > 1.2;
        this.target = best;
        this.reactAt = g.time + this.k.react * (0.7 + Math.random() * 0.6) * (first ? 1 : 0.5);
        const e = this.k.err * (1 + Math.min(1.5, bd / 30));
        this.errY = (Math.random() - 0.5) * 2 * e;
        this.errP = (Math.random() - 0.5) * 1.2 * e;
        this.aimHead = Math.random() < this.k.head;
        this.burstLeft = this.k.burst + Math.floor(Math.random() * 3);
      }
      this.lastKnown = { x: best.x, z: best.z, t: g.time };
      this.targetLost = g.time;
      g.reportSpotted(s, best);
    } else if (this.target) {
      this.target = null;
      this.targetLost = g.time;
    }
    // hearing: running footsteps nearby give away a position
    if (!best) {
      for (const o of g.soldiers) {
        if (!o.alive || o.team === s.team) continue;
        const d = Math.hypot(o.x - s.x, o.z - s.z);
        const loud = o.stepLoud && g.time - o.stepLoud < 0.5;
        if (loud && d < 13) {
          this.lastKnown = { x: o.x + (Math.random() - 0.5) * 2, z: o.z + (Math.random() - 0.5) * 2, t: g.time, heard: true };
        }
      }
    }
  }

  hearShot(x, z, shooter) {
    if (this.target || shooter.team === this.s.team) return;
    const d = Math.hypot(x - this.s.x, z - this.s.z);
    if (d > 40) return;
    const noise = d * 0.12;
    this.lastKnown = { x: x + (Math.random() - 0.5) * noise, z: z + (Math.random() - 0.5) * noise, t: this.g.time, heard: true };
  }

  hurt(by) {
    this.hurtBy = by;
    this.hurtAt = this.g.time;
    if (!this.target && by) this.lastKnown = { x: by.x, z: by.z, t: this.g.time };
  }

  // ---------- main loop ----------
  update(dt) {
    const s = this.s, g = this.g, inp = s.in;
    inp.f = 0;
    inp.s = 0;
    inp.jump = false;
    inp.crouch = false;
    inp.walk = false;
    inp.fire = false;
    if (g.time >= this.thinkAt) {
      this.thinkAt = g.time + 0.09 + Math.random() * 0.05;
      this.think();
    }
    if (s.blind > g.time) {
      // flashed: stumble and spray at nothing
      s.yaw += Math.sin(g.time * 3 + s.id) * dt * 2;
      inp.f = -0.5;
      this.applyLook(dt, s.yaw, 0);
      return;
    }
    const w = WEAPONS[s.kind];
    // pick the right gun
    const left = (k) => (k ? s.ammoOf(k).mag + s.ammoOf(k).res : 0);
    if (g.time >= s.switchUntil) {
      if (s.cur !== 1 && left(s.slots[1]) > 0 && s.cur !== 4 && s.cur !== 5) s.switchSlot(1);
      else if (s.cur === 1 && left(s.slots[1]) === 0) s.switchSlot(left(s.slots[2]) > 0 ? 2 : 3);
      else if (s.cur === 2 && left(s.slots[2]) === 0 && left(s.slots[1]) === 0) s.switchSlot(3);
      else if (s.cur === 3 && this.target && left(s.slots[2]) > 0) s.switchSlot(2);
    }

    if (this.target && this.target.alive) {
      this.fight(dt, w);
      return;
    }
    this.target = null;
    // reload while nobody is around
    if (w && w.mag && s.ammoOf(s.kind).mag < w.mag * 0.5 && s.ammoOf(s.kind).res > 0) g.reload(s);

    // last known enemy position
    if (this.lastKnown && g.time - this.lastKnown.t < (this.lastKnown.heard ? 4 : 6) && this.goal?.type !== 'escort') {
      const L = this.lastKnown;
      const d = Math.hypot(L.x - s.x, L.z - s.z);
      if (L.stay === undefined) L.stay = Math.random() < 0.75;
      const holding = this.goal && this.goal.type === 'hold' && d > 9 && L.stay;
      if (holding) {
        // defenders on a spot just turn to the noise
        this.applyLook(dt, yawTo(L.x - s.x, L.z - s.z), 0);
        return;
      }
      if (this.maybeNade(L)) return;
      if (!this.huntPt || Math.hypot(this.huntPt[0] - L.x, this.huntPt[1] - L.z) > 3) {
        this.huntPt = [L.x, L.z];
        this.setGoalPoint(L.x, L.z);
      }
      if (d < 1.5) this.lastKnown = null;
      this.follow(dt, true, yawTo(L.x - s.x, L.z - s.z));
      return;
    }
    this.huntPt = null;
    this.objective(dt);
  }

  fight(dt, w) {
    const s = this.s, g = this.g, inp = s.in, T = this.target;
    const dx = T.x - s.x, dz = T.z - s.z, d = Math.hypot(dx, dz);
    const eyeY = s.feet + s.eyeH();
    // aim point with a little lead
    const lead = Math.min(0.25, d / 120);
    const tx = T.x + T.vx * lead, tz = T.z + T.vz * lead;
    const ty = this.aimHead ? T.feet + T.eyeH() + 0.02 : T.feet + T.eyeH() - 0.45;
    const wantY = yawTo(tx - s.x, tz - s.z);
    const wantP = Math.atan2(ty - eyeY, Math.hypot(tx - s.x, tz - s.z));
    // error shrinks while tracking
    const decay = Math.exp(-this.k.track * dt);
    this.errY *= decay;
    this.errP *= decay;
    const ay = wantY + this.errY + Math.sin(g.time * 2.3 + s.id) * this.k.err * 0.12;
    const ap = wantP + this.errP;
    this.applyLook(dt, ay, ap);
    const off = Math.abs(angDiff(s.yaw, ay)) + Math.abs(ap - s.pitch);

    // movement while fighting
    const rifleish = s.kind === 'rifle' || s.kind === 'sniper' || s.kind === 'deagle';
    if (s.kind === 'knife') {
      inp.f = 1;
    } else if (rifleish && d > 7) {
      // stand still for accuracy, peek-strafe between bursts
      if (g.time < this.pauseUntil) inp.s = this.strafe;
    } else {
      if (g.time > this.strafeAt) {
        this.strafe = -this.strafe;
        this.strafeAt = g.time + 0.35 + Math.random() * 0.6;
      }
      inp.s = this.strafe;
      if (d > 14 && s.kind === 'shotgun') inp.f = 1;
    }
    if (this.k.react < 0.3 && d < 12 && Math.random() < 0.004) inp.crouch = true;
    if (s.crouchK > 0.2 && d < 20 && this.k.react < 0.3) inp.crouch = Math.random() < 0.98;

    // shooting
    if (g.time < this.reactAt || g.time < this.pauseUntil) return;
    const tol = 0.05 + Math.atan2(0.35, d);
    if (off > tol * 1.6) return;
    if (s.kind === 'he' || s.kind === 'flash') {
      s.switchSlot(s.slots[1] ? 1 : 2);
      return;
    }
    const a = s.ammoOf(s.kind);
    if (w && w.mag && a.mag === 0) {
      if (a.res > 0) g.reload(s);
      return;
    }
    if (s.kind === 'knife' && d > 1.8) return;
    if (!g.clearShot(s, T)) return;
    if (w && w.scope && !s.scoped && d > 6) {
      s.scoped = 1;
      this.pauseUntil = g.time + 0.18 + this.k.react * 0.4;
      return;
    }
    inp.fire = true;
    if (w && w.auto && s.justFired) {
      this.burstLeft--;
      if (this.burstLeft <= 0) {
        const long = d > 14;
        this.pauseUntil = g.time + (long ? 0.28 + Math.random() * 0.25 : 0.08);
        this.burstLeft = long ? this.k.burst : this.k.burst * 3;
      }
    }
  }

  maybeNade(L) {
    const s = this.s, g = this.g;
    if (g.time < this.nadeAt || g.mode === 'dm') return false;
    const d = Math.hypot(L.x - s.x, L.z - s.z);
    if (d < 7 || d > 22) return false;
    const kind = s.he > 0 ? 'he' : s.flash > 0 ? 'flash' : null;
    if (!kind) return false;
    this.nadeAt = g.time + 10 + Math.random() * 10;
    if (Math.random() < 0.5) return false;
    const yaw = yawTo(L.x - s.x, L.z - s.z);
    s.yaw = yaw;
    const pitch = 0.22 + Math.min(0.35, d / 60);
    g.throwNade(s, kind, yaw, pitch, Math.min(15, 7 + d * 0.45));
    return true;
  }

  objective(dt) {
    const s = this.s, g = this.g;
    const G = this.goal;
    if (!G) return;
    if (g.time < this.waitUntil) {
      this.applyLook(dt, s.yaw, 0);
      return;
    }
    if (G.type === 'hunt') {
      if (!this.path || g.time > this.repathAt || this.pi >= this.path.length) {
        const e = g.guessEnemy(s);
        if (e) this.setGoalPoint(e[0], e[1]);
        else {
          const p = g.map.randomWalkNear(36, 30, 25);
          this.setGoalPoint(p[0], p[1]);
        }
      }
      this.follow(dt, false);
      return;
    }
    if (G.type === 'route') {
      // late in the round everyone pushes
      const host = g.freeHostageFor(s);
      if (G.i >= G.pts.length || (host && Math.hypot(host.x - s.x, host.z - s.z) < 14)) {
        this.goal = host ? { type: 'hostage', h: host } : { type: 'hunt' };
        this.path = null;
        return;
      }
      const p = G.pts[G.i];
      if (!this.path) this.setGoalPoint(p[0], p[1]);
      if (Math.hypot(p[0] - s.x, p[1] - s.z) < 1.6 || (this.path && this.pi >= this.path.length)) {
        G.i++;
        this.path = null;
        return;
      }
      this.follow(dt, G.i > 0);
      return;
    }
    if (G.type === 'hostage') {
      const h = G.h;
      if (!h || h.state !== 'idle') {
        const other = g.freeHostageFor(s);
        this.goal = other ? { type: 'hostage', h: other } : g.roundTime() > 60 ? { type: 'hunt' } : { type: 'cover', until: g.time + 12 };
        this.path = null;
        return;
      }
      const d = Math.hypot(h.x - s.x, h.z - s.z);
      if (d < 1.7) {
        g.useHostage(s, h);
        // deep inside the rescue zone, so the hostage walking 2 m behind is inside too
        const R = g.map.rescue;
        const pt = [R.x0 + 2.5 + Math.random() * (R.x1 - R.x0 - 4), R.z1 - 0.5];
        this.goal = { type: 'escort', pt };
        this.setGoalPoint(pt[0], pt[1]);
        return;
      }
      if (!this.path || g.time > this.repathAt) this.setGoalPoint(h.x, h.z);
      this.follow(dt, true);
      return;
    }
    if (G.type === 'escort') {
      const mine = g.hostages.filter((h) => h.leader === s && h.state === 'follow');
      if (!mine.length) {
        this.goal = { type: 'hunt' };
        this.path = null;
        return;
      }
      const far = mine.some((h) => Math.hypot(h.x - s.x, h.z - s.z) > 4.5);
      if (far) {
        // wait for the hostage and watch behind
        const h = mine[0];
        this.applyLook(dt, yawTo(h.x - s.x, h.z - s.z) + Math.PI + Math.sin(g.time) * 0.6, 0);
        return;
      }
      if (!this.path || this.pi >= this.path.length) this.setGoalPoint(G.pt[0], G.pt[1]);
      this.follow(dt, false);
      return;
    }
    if (G.type === 'cover') {
      if (g.time > G.until) {
        this.goal = { type: 'hunt' };
        this.path = null;
        return;
      }
      // follow the closest escort to protect it
      const esc = g.soldiers.find((o) => o.alive && o.team === s.team && o.brain?.goal?.type === 'escort');
      const tgt = esc || (g.player.team === s.team && g.player.alive ? g.player : null);
      if (tgt && tgt.alive && tgt !== s && Math.hypot(tgt.x - s.x, tgt.z - s.z) > 4) {
        if (!this.path || g.time > this.repathAt - 2) this.setGoalPoint(tgt.x, tgt.z);
        this.follow(dt, false);
      } else this.applyLook(dt, s.yaw + dt * 0.8, 0);
      return;
    }
    if (G.type === 'hold') {
      const sp = G.spot;
      const late = g.roundTime() > 80 + (s.id % 3) * 8;
      if (late && g.mode !== 'dm') {
        this.goal = { type: 'hunt' };
        this.path = null;
        return;
      }
      const d = Math.hypot(sp.x - s.x, sp.z - s.z);
      if (d > 0.8) {
        if (!this.path || g.time > this.repathAt) this.setGoalPoint(sp.x, sp.z);
        this.follow(dt, false);
      } else {
        // on the spot: watch the entrance, glance around now and then
        if (g.time > this.glanceAt) {
          this.glanceAt = g.time + 2 + Math.random() * 3;
          this.glance = (Math.random() - 0.5) * 1.2;
        }
        const ly = yawTo(sp.lx - s.x, sp.lz - s.z) + (this.glance || 0) * 0.5;
        this.applyLook(dt, ly, 0);
        if (this.k.react < 0.3 && Math.random() < 0.002) s.in.crouch = true;
      }
      return;
    }
  }

  // walk the path; look where we go (or at lookYaw)
  follow(dt, careful, lookYaw) {
    const s = this.s, g = this.g;
    if (!this.path || this.pi >= this.path.length) {
      this.applyLook(dt, lookYaw ?? s.yaw, 0);
      return;
    }
    let p = this.path[this.pi];
    let dx = p[0] - s.x, dz = p[1] - s.z;
    if (Math.hypot(dx, dz) < 0.45) {
      this.pi++;
      if (this.pi >= this.path.length) return;
      p = this.path[this.pi];
      dx = p[0] - s.x;
      dz = p[1] - s.z;
    }
    const moveYaw = yawTo(dx, dz);
    const look = lookYaw ?? moveYaw;
    this.applyLook(dt, look, 0);
    // move relative to facing
    const rel = angDiff(s.yaw, moveYaw);
    s.in.f = Math.cos(rel);
    s.in.s = -Math.sin(rel);
    // keep apart from teammates
    for (const o of g.soldiers) {
      if (o === s || !o.alive) continue;
      const ox = s.x - o.x, oz = s.z - o.z, od = Math.hypot(ox, oz);
      if (od < 0.9 && od > 0.01) {
        const ry = angDiff(s.yaw, yawTo(-ox, -oz));
        s.in.f += Math.cos(ry) * 0.6;
        s.in.s -= Math.sin(ry) * 0.6;
      }
    }
    // stuck detection
    if (g.time > this.stuckAt) {
      const moved = Math.hypot(s.x - this.lastPos[0], s.z - this.lastPos[1]);
      if (moved < 0.3) {
        this.path = null;
        s.in.jump = Math.random() < 0.5;
      }
      this.lastPos = [s.x, s.z];
      this.stuckAt = g.time + 1.0;
    }
  }

  applyLook(dt, yaw, pitch) {
    const s = this.s;
    const max = this.k.turn * dt;
    const dy = angDiff(s.yaw, yaw);
    s.yaw += Math.max(-max, Math.min(max, dy));
    const dp = pitch - s.pitch;
    s.pitch += Math.max(-max, Math.min(max, dp));
  }
}
