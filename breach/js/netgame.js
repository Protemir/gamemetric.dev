// The match over the network. The host runs the real game (bots, rounds, damage, hostages, grenades)
// and sends snapshots 20 times a second; every player moves and aims on their own machine, sends
// their position 30 times a second and reports their own hits (friends' game, the shooter is trusted).
import { WEAPONS } from './weapons.js';
import { sfx } from './audio.js';
import { t } from './i18n.js';

export const KINDS = ['knife', 'pistol', 'deagle', 'smg', 'shotgun', 'rifle', 'sniper', 'he', 'flash', 'm4', 'scout', 'mg'];
const PARTS = ['head', 'body', 'legs'];
const HSTATE = ['idle', 'follow', 'rescued', 'dead'];
const PH = ['freeze', 'live', 'end', 'wait'];
const r2 = (v) => Math.round(v * 100);
const r3 = (v) => Math.round(v * 1000);
const now = () => performance.now() / 1000;

function lerpAngle(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

// samples: {t, x, z, f, y, p, c, vx, vz}; shows the state `delay` seconds ago
export function interp(s, delay) {
  const B = s.nb;
  if (!B || !B.length) return;
  const rt = now() - delay;
  let a = B[0], b = B[B.length - 1];
  for (let i = B.length - 1; i > 0; i--) {
    if (B[i - 1].t <= rt) {
      a = B[i - 1];
      b = B[i];
      break;
    }
  }
  let k = b.t > a.t ? (rt - a.t) / (b.t - a.t) : 1;
  k = Math.max(0, Math.min(1.25, k));
  s.x = a.x + (b.x - a.x) * k;
  s.z = a.z + (b.z - a.z) * k;
  s.feet = a.f + (b.f - a.f) * k;
  s.yaw = lerpAngle(a.y, b.y, Math.min(1, k));
  s.pitch = a.p + (b.p - a.p) * Math.min(1, k);
  s.crouchK = a.c + (b.c - a.c) * Math.min(1, k);
  s.vx = b.vx;
  s.vz = b.vz;
  while (B.length > 2 && B[1].t < rt - 0.2) B.shift();
}

function pushSample(s, sample) {
  (s.nb ||= []).push(sample);
  if (s.nb.length > 30) s.nb.shift();
}

export function loadoutOf(s) {
  return { s: [s.slots[1], s.slots[2]], a: Math.round(s.armor), hm: s.helmet ? 1 : 0, he: s.he, fl: s.flash, m: s.money, gl: s.gunLevel || 0 };
}

export class NetGame {
  constructor(game, net) {
    this.g = game;
    this.net = net;
    this.sendAt = 0;
    this.nadeSeq = 0;
    game.nh = this;
  }

  get host() {
    return this.g.role === 'host';
  }

  soldierOf(peer) {
    return this.g.soldiers.find((s) => s.peer === peer);
  }

  // ---------- every frame ----------
  tick() {
    const g = this.g;
    const T = now();
    if (this.host) {
      for (const s of g.soldiers) if (s.remote) interp(s, 0.08);
      if (T >= this.sendAt) {
        this.sendAt = T + 0.05;
        this.net.broadcast(this.snapshot(), false);
      }
    } else {
      // over the relay snapshots come in bursts: look a little further back
      const delay = this.net.linkState(this.net.hostId) === 'p2p' ? 0.11 : 0.2;
      for (const s of g.soldiers) if (s.remote) interp(s, delay);
      for (const h of g.hostages) {
        if (h.tx === undefined) continue;
        h.x += (h.tx - h.x) * 0.25;
        h.z += (h.tz - h.z) * 0.25;
        h.yaw = lerpAngle(h.yaw, h.ty, 0.25);
      }
      if (T >= this.sendAt) {
        this.sendAt = T + 0.033;
        const p = g.player;
        if (p.alive) this.net.toHost({ k: 'p', x: r2(p.x), z: r2(p.z), f: r2(p.feet), y: r3(p.yaw), p: r3(p.pitch), c: r2(p.crouchK), vx: r2(p.vx), vz: r2(p.vz), w: KINDS.indexOf(p.kind) }, false);
      }
    }
  }

  snapshot() {
    const g = this.g;
    const tl = Math.max(0, g.phaseEnd - g.time);
    const spotted = [[], []];
    for (const [o, v] of g.spotted) if (g.time - v.t < 1.5) spotted[v.by === 'A' ? 0 : 1].push(o.id);
    return {
      k: 's',
      ph: PH.indexOf(g.phase),
      tl: Math.round(tl * 10),
      bt: Math.round(Math.max(0, g.buyTimeLeft()) * 10),
      sc: [g.score.A, g.score.B],
      dk: g.dmKills ? [g.dmKills.A, g.dmKills.B] : null,
      r: g.round,
      S: g.soldiers.map((s) => [r2(s.x), r2(s.z), r2(s.feet), r3(s.yaw), r3(s.pitch), r2(s.crouchK), r2(s.vx), r2(s.vz), s.alive ? 1 : 0, Math.max(0, Math.round(s.hp)), Math.round(s.armor), KINDS.indexOf(s.kind), s.helmet ? 1 : 0, s.money, s.kills, s.deaths]),
      H: g.hostages.map((h) => [r2(h.x), r2(h.z), r2(h.yaw), HSTATE.indexOf(h.state)]),
      sp: spotted,
      rs: g.rescued || 0,
    };
  }

  // ---------- host: messages from players ----------
  onHostMessage(from, m) {
    const g = this.g;
    const s = this.soldierOf(from);
    if (!s) return;
    switch (m.k) {
      case 'p':
        if (!s.alive) return;
        pushSample(s, { t: now(), x: m.x / 100, z: m.z / 100, f: m.f / 100, y: m.y / 1000, p: m.p / 1000, c: m.c / 100, vx: m.vx / 100, vz: m.vz / 100 });
        if (KINDS[m.w] && s.netKind !== KINDS[m.w]) {
          s.netKind = KINDS[m.w];
          s.body.setGun(s.netKind);
        }
        break;
      case 'f': {
        if (!s.alive) return;
        const kind = KINDS[m.w] || 'pistol';
        this.showShot(s, kind, m.m, m.e);
        for (const [tid, dmg, part, dx, dz, pen] of m.h || []) {
          const target = tid >= 100 ? g.hostages[tid - 100] : g.soldiers[tid];
          if (!target) continue;
          if (target.alive === false || target.state === 'dead') continue;
          g.damage(target, Math.min(500, dmg), PARTS[part] || 'body', s, kind, dx, dz, pen);
        }
        for (const o of g.soldiers) if (o.brain && o.alive) o.brain.hearShot(s.x, s.z, s);
        this.net.broadcast({ k: 'f', id: s.id, w: m.w, m: m.m, e: m.e }, true, from);
        break;
      }
      case 'n':
        if (!s.alive) return;
        // the host keeps count: a thrown grenade is gone, and nobody throws one they do not have
        if ((m.kind === 'he' ? s.he : s.flash) <= 0) return;
        if (m.kind === 'he') s.he--;
        else s.flash--;
        g.spawnNade(s, m.kind, m.x, m.y, m.z, m.vx, m.vy, m.vz, m.nid);
        this.net.broadcast({ ...m, id: s.id }, true, from);
        break;
      case 'u': {
        let best = null, bd = 2.4;
        for (const h of g.hostages) {
          if (h.state === 'dead' || h.state === 'rescued') continue;
          const d = Math.hypot(h.x - s.x, h.z - s.z);
          if (d < bd) (bd = d), (best = h);
        }
        if (best) g.useHostage(s, best);
        break;
      }
      case 'pick': {
        const d = g.drops.find((x) => x.id === m.id);
        if (d && s.alive && Math.hypot(d.x - s.x, d.z - s.z) < 2.5) g.pickDrop(s, d, true);
        break;
      }
      case 'buy': {
        if (!WEAPONS[m.item] && !['armor', 'helmet', 'he', 'flash'].includes(m.item)) return;
        const r = g.buy(s, m.item);
        this.net.send(from, { k: 'L', r, item: m.item, L: loadoutOf(s) });
        break;
      }
      case 'snd':
        this.net.broadcast({ k: 'snd', id: s.id, n: m.n }, true, from);
        if (m.n === 'reload') sfx('reload', [s.x, 1.2, s.z], { dur: 2 });
        break;
    }
  }

  // ---------- host -> everyone ----------
  onFire(s, kind, muzzle, ends, hits) {
    if (this.host) this.net.broadcast({ k: 'f', id: s.id, w: KINDS.indexOf(kind), m: muzzle.map(r2), e: ends.map((e) => e.map(r2)) });
    else if (s === this.g.player) this.net.toHost({ k: 'f', w: KINDS.indexOf(kind), m: muzzle.map(r2), e: ends.map((e) => e.map(r2)), h: hits });
  }
  onDrop(d) {
    if (this.host) this.net.broadcast({ k: 'D', id: d.id, w: KINDS.indexOf(d.kind), x: r2(d.x), z: r2(d.z), f: r2(d.y), y: r3(d.mesh.rotation.y), o: d.owner ?? -1 });
  }

  // a friend joining mid-match gets the guns already lying about
  sendDropsTo(peer) {
    if (!this.host) return;
    for (const d of this.g.drops) this.net.send(peer, { k: 'D', id: d.id, w: KINDS.indexOf(d.kind), x: r2(d.x), z: r2(d.z), f: r2(d.y), y: r3(d.mesh.rotation.y), o: -1 });
  }

  onUndrop(id) {
    if (this.host) this.net.broadcast({ k: 'Dx', id });
  }

  // a remote player walked over a gun or swapped for one: the host tells them what they hold now
  onPicked(s, d) {
    if (this.host && s.peer) this.net.send(s.peer, { k: 'L', r: 'ok', item: d.kind, pick: 1, am: [d.mag, d.res], L: loadoutOf(s) });
  }

  onKill(o, by, weapon, head, dx, dz) {
    if (this.host) this.net.broadcast({ k: 'K', v: o.id, by: by ? by.id : -1, w: KINDS.indexOf(weapon), hd: head ? 1 : 0, dx: r2(dx), dz: r2(dz) });
  }
  onHostageDown(h) {
    if (this.host) this.net.broadcast({ k: 'HK', i: this.g.hostages.indexOf(h) });
  }
  onHurt(o, by, d) {
    if (this.host && o.peer) this.net.send(o.peer, { k: 'h', by: by ? by.id : -1, d });
  }
  onRound(first) {
    if (!this.host) return;
    const g = this.g;
    const L = {};
    for (const s of g.soldiers) if (s.peer) L[s.id] = { ...loadoutOf(s), keep: s.kept ? 1 : 0 };
    this.net.broadcast({ k: 'R', r: g.round, first: first ? 1 : 0, sp: g.soldiers.map((s) => [s.id, r2(s.x), r2(s.z), r3(s.yaw)]), L });
  }
  onSpawn(s) {
    if (this.host) this.net.broadcast({ k: 'P', id: s.id, x: r2(s.x), z: r2(s.z), y: r3(s.yaw), L: loadoutOf(s) });
  }
  onEnd(winner, why) {
    if (this.host) this.net.broadcast({ k: 'E', w: winner, why });
  }
  onOver(winner) {
    if (this.host) this.net.broadcast({ k: 'O', w: winner });
  }
  onNade(n) {
    if (this.host) this.net.broadcast({ k: 'n', id: n.owner.id, kind: n.kind, x: n.x, y: n.y, z: n.z, vx: n.vx, vy: n.vy, vz: n.vz, nid: n.nid }, true, n.owner.peer);
    else this.net.toHost({ k: 'n', kind: n.kind, x: n.x, y: n.y, z: n.z, vx: n.vx, vy: n.vy, vz: n.vz, nid: n.nid });
  }
  onBoom(n) {
    if (this.host) this.net.broadcast({ k: 'b', nid: n.nid, kind: n.kind, x: n.x, y: n.y, z: n.z });
  }
  onMsg(key, team) {
    if (this.host) this.net.broadcast({ k: 'M', key, team: team || '' });
  }
  onSound(name) {
    if (!this.host) this.net.toHost({ k: 'snd', n: name });
  }
  newNadeId() {
    return this.net.id + ':' + ++this.nadeSeq;
  }

  // effects of somebody else's shot: sound, flash, tracer, impacts
  showShot(s, kind, m, ends) {
    const g = this.g;
    if (!m) return;
    const mz = m.map((v) => v / 100);
    s.kick = 1;
    if (kind === 'knife') {
      sfx('knife', [s.x, 1, s.z]);
      return;
    }
    sfx(kind, [s.x, s.feet + 1.5, s.z], { indoor: g.map.isIndoor(s.x, s.z) });
    g.fx.flash(mz[0], mz[1], mz[2], 0.45, 0.05);
    const eye = s.feet + s.eyeH();
    for (const e0 of ends || []) {
      const e = e0.map((v) => v / 100);
      g.fx.tracer(mz[0], mz[1], mz[2], e[0], e[1], e[2], 1);
      const dx = e[0] - s.x, dy = e[1] - eye, dz = e[2] - s.z, d = Math.hypot(dx, dy, dz);
      if (d < 0.1) continue;
      const hit = g.map.raycast(s.x, eye, s.z, dx / d, dy / d, dz / d, d + 0.2);
      if (hit && Math.abs(hit.t - d) < 0.3) {
        g.fx.decal(e[0], e[1], e[2], hit.nx, hit.ny, hit.nz);
        g.fx.spark(e[0], e[1], e[2], hit.nx, hit.ny, hit.nz, [0.6, 0.55, 0.45], 3, 2);
      } else g.fx.puff(e[0], e[1], e[2], [0.55, 0.06, 0.06], 0.35, 0.35, 0.2, 0.75);
    }
  }

  // ---------- client: messages from the host ----------
  onClientMessage(m) {
    const g = this.g;
    const me = g.player;
    switch (m.k) {
      case 's': {
        const prevPhase = g.phase;
        g.phase = PH[m.ph] || 'live';
        g.phaseEnd = g.time + m.tl / 10;
        g.buyEnd = g.time + m.bt / 10;
        g.score.A = m.sc[0];
        g.score.B = m.sc[1];
        if (m.dk) g.dmKills = { A: m.dk[0], B: m.dk[1] };
        g.rescued = m.rs;
        if (prevPhase === 'freeze' && g.phase === 'live') g.hud.center(t(me.team === 'A' ? 'goA' : 'goB'), 2);
        const T = now();
        m.S.forEach((a, i) => {
          const s = g.soldiers[i];
          if (!s) return;
          if (s.remote) {
            pushSample(s, { t: T, x: a[0] / 100, z: a[1] / 100, f: a[2] / 100, y: a[3] / 1000, p: a[4] / 1000, c: a[5] / 100, vx: a[6] / 100, vz: a[7] / 100 });
            const k = KINDS[a[11]];
            if (k && a[8] && (s.netKind !== k || !s.body.gunKind)) {
              s.netKind = k;
              s.body.setGun(k);
            }
            if (!a[8] && s.alive && !s.deadAt) s.alive = false;
            if (a[8] && !s.alive && (!s.deadAt || g.time - s.deadAt > 1.5)) {
              s.alive = true;
              s.deadAt = 0;
              s.body.revive();
              s.body.root.visible = true;
            }
          }
          s.hp = a[9];
          s.armor = a[10];
          s.helmet = !!a[12];
          s.money = a[13];
          s.kills = a[14];
          s.deaths = a[15];
        });
        m.H.forEach((a, i) => {
          const h = g.hostages[i];
          if (!h) return;
          h.tx = a[0] / 100;
          h.tz = a[1] / 100;
          h.ty = a[2] / 100;
          const st = HSTATE[a[3]];
          if (st !== h.state) {
            if (st === 'rescued') h.body.root.visible = false;
            if (st === 'dead' && h.state !== 'dead') h.body.die(false);
            if (st === 'idle' && (h.state === 'rescued' || h.state === 'dead')) h.reset();
            h.state = st;
          }
        });
        g.spotted.clear();
        const mine = me.team === 'A' ? m.sp[0] : m.sp[1];
        for (const id of mine) {
          const o = g.soldiers[id];
          if (o) g.spotted.set(o, { x: o.x, z: o.z, t: g.time, by: me.team });
        }
        break;
      }
      case 'f': {
        const s = g.soldiers[m.id];
        if (s && s !== me) this.showShot(s, KINDS[m.w] || 'pistol', m.m, m.e);
        break;
      }
      case 'K': {
        const v = g.soldiers[m.v];
        if (!v || (!v.alive && v.deadAt && g.time - v.deadAt < 3)) break;
        v.alive = true;
        g.kill(v, m.by >= 0 ? g.soldiers[m.by] : null, KINDS[m.w] || 'pistol', !!m.hd, m.dx / 100, m.dz / 100);
        break;
      }
      case 'HK': {
        const h = g.hostages[m.i];
        if (h && h.state !== 'dead') {
          h.state = 'dead';
          h.body.die(false);
        }
        break;
      }
      case 'h': {
        const by = g.soldiers[m.by];
        if (by) g.hud.hurt(Math.atan2(-(by.x - me.x), -(by.z - me.z)) - me.yaw, m.d);
        sfx('hurt');
        g.view.shake = Math.min(0.6, g.view.shake + m.d * 0.006);
        me.punchP += Math.min(0.05, m.d * 0.0012);
        break;
      }
      case 'R':
        g.applyRound(m);
        break;
      case 'P': {
        const s = g.soldiers[m.id];
        if (!s) break;
        s.nb = [];
        s.spawn(m.x / 100, m.z / 100, m.y / 1000);
        s.spawnedAt = g.time;
        if (s === me) {
          me.resetLoadout();
          this.applyLoadout(m.L, true);
          g.spec = null;
          g.vm.mesh.visible = true;
        }
        break;
      }
      case 'E': {
        const mine = m.w === me.team;
        g.result = { winner: m.w, why: m.why };
        g.hud.banner(t(m.w === 'A' ? 'roundWinA' : 'roundWinB'), t(m.why), mine);
        sfx(mine ? 'win' : 'lose');
        break;
      }
      case 'O':
        g.finishMatch(m.w);
        break;
      case 'n': {
        const s = g.soldiers[m.id];
        if (s) g.spawnNade(s, m.kind, m.x, m.y, m.z, m.vx, m.vy, m.vz, m.nid);
        break;
      }
      case 'b':
        g.boom(m.nid, m.kind, m.x, m.y, m.z);
        break;
      case 'M':
        if (!m.team || m.team === me.team) g.hud.center(t(m.key), 2);
        break;
      case 'L': {
        if (m.r === 'ok' && m.pick) {
          sfx('click');
          this.applyLoadout(m.L, false, m.item);
          if (me.slots[WEAPONS[m.item].slot] === m.item) me.ammo[m.item] = { mag: m.am[0], res: m.am[1] };
        } else if (m.r === 'ok') {
          sfx('buy');
          this.applyLoadout(m.L, false, m.item);
        } else {
          sfx('deny');
          if (m.r === 'money') g.hud.center(t('noMoney'), 1.2);
          else if (m.r === 'time') g.hud.center(t('buyClosed'), 1.2);
          else if (m.r === 'zone') g.hud.center(t('buyZone'), 1.2);
        }
        break;
      }
      case 'D': {
        if (g.drops.some((d) => d.id === m.id) || !KINDS[m.w]) break;
        g.makeDrop(KINDS[m.w], m.x / 100, m.z / 100, 0, 0, m.id, m.y / 1000, m.f / 100);
        const o = g.soldiers[m.o];
        // the drop comes just before the kill message: the body lets go of its gun either way
        if (o) o.body.setGun(null);
        break;
      }
      case 'Dx': {
        const d = g.drops.find((x) => x.id === m.id);
        if (d) g.removeDrop(d);
        break;
      }
      case 'snd': {
        const s = g.soldiers[m.id];
        if (s && m.n === 'reload') sfx('reload', [s.x, 1.2, s.z], { dur: 2 });
        break;
      }
    }
  }

  // the host owns guns, armour and money; ammo is kept here
  applyLoadout(L, fresh, bought) {
    const g = this.g, p = g.player;
    if (!L) return;
    for (const [i, slot] of [[0, 1], [1, 2]]) {
      const k = L.s[i];
      if (k !== p.slots[slot] || (bought && bought === k) || fresh) {
        p.slots[slot] = k;
        if (k) p.ammo[k] = { mag: WEAPONS[k].mag, res: WEAPONS[k].reserve };
      }
    }
    p.armor = L.a;
    p.helmet = !!L.hm;
    p.he = L.he;
    p.flash = L.fl;
    p.money = L.m;
    p.gunLevel = L.gl || 0;
    if (bought && WEAPONS[bought] && (WEAPONS[bought].slot === 1 || WEAPONS[bought].slot === 2)) p.switchSlot(WEAPONS[bought].slot);
    else if (!p.hasSlot(p.cur)) p.switchSlot(p.bestSlot(), true);
    else if (fresh) p.switchSlot(p.bestSlot(), true);
  }
}
