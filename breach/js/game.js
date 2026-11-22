// The match: soldiers, hostages, shooting, grenades, rounds, money, camera and view model.
import * as THREE from '../vendor/three.module.min.js';
import { GameMap, W, H, K, SURF, SUN, CEIL, mergeGeos } from './map.js';
import { makeTextures } from './textures.js';
import { makeBody } from './people.js';
import { WEAPONS, GEAR, recoilKick, viewModel } from './weapons.js';
import { sfx, setListener } from './audio.js';
import { Brain } from './bots.js';
import { FX } from './fx.js';
import { t, lang, BOT_NAMES } from './i18n.js';

const GRAV = 16, JUMP = 5.6, FREEZE = 5, ROUND = 115, BUYTIME = 22, WIN_ROUNDS = 8, DM_KILLS = 60, DM_TIME = 600;
const angDiff = (a, b) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

class Soldier {
  constructor(game, id, team, name, isPlayer) {
    this.g = game;
    this.id = id;
    this.team = team;
    this.name = name;
    this.isPlayer = isPlayer;
    this.body = makeBody(team);
    game.scene.add(this.body.root);
    this.radius = 0.3;
    this.height = 1.8;
    this.kills = 0;
    this.deaths = 0;
    this.money = 800;
    this.alive = false;
    this.x = 0;
    this.z = 0;
    this.feet = 0;
    this.vx = this.vz = this.vy = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.crouchK = 0;
    this.in = { f: 0, s: 0, jump: false, crouch: false, walk: false, fire: false };
    this.resetLoadout();
  }

  resetLoadout() {
    this.slots = { 1: null, 2: 'pistol', 3: 'knife' };
    this.ammo = { pistol: { mag: 12, res: 48 } };
    this.he = 0;
    this.flash = 0;
    this.armor = 0;
    this.helmet = false;
    this.cur = 2;
    this.prev = 3;
  }

  get kind() {
    if (this.remote && this.netKind) return this.netKind;
    if (this.cur === 4) return 'he';
    if (this.cur === 5) return 'flash';
    return this.slots[this.cur] || 'knife';
  }

  ammoOf(kind) {
    return this.ammo[kind] || { mag: 0, res: 0 };
  }

  eyeH() {
    return 1.62 - 0.5 * this.crouchK;
  }

  hasSlot(n) {
    if (n === 4) return this.he > 0;
    if (n === 5) return this.flash > 0;
    return !!this.slots[n];
  }

  switchSlot(n, instant = false) {
    if (!this.hasSlot(n) || (n === this.cur && !instant)) return;
    if (n !== this.cur) this.prev = this.cur;
    this.cur = n;
    this.reloadUntil = 0;
    this.scoped = 0;
    this.shots = 0;
    this.switchUntil = instant ? 0 : this.g.time + (n === 3 ? 0.35 : 0.6);
    this.body.setGun(this.kind);
    if (this.isPlayer) {
      this.g.vm.setKind(this.kind, this.team);
      if (!instant) sfx('draw');
    }
  }

  spawn(x, z, yaw) {
    this.x = x;
    this.z = z;
    this.feet = 0;
    this.vx = this.vz = this.vy = 0;
    this.yaw = yaw;
    this.pitch = 0;
    this.crouchK = 0;
    this.hp = 100;
    this.alive = true;
    this.onGround = true;
    this.punchP = this.punchY = 0;
    this.shots = 0;
    this.nextFire = 0;
    this.reloadUntil = 0;
    this.switchUntil = 0;
    this.scoped = 0;
    this.blind = 0;
    this.stepDist = 0;
    this.stepLoud = -9;
    this.lastShot = -9;
    this.spawnProtect = 0;
    this.killer = null;
    this.deadAt = 0;
    this.nb = null;
    this.rescopeAt = 0;
    this.body.revive();
    this.body.root.visible = !this.isPlayer;
    this.body.setGun(this.kind);
  }
}

class Hostage {
  constructor(game, x, z) {
    this.g = game;
    this.body = makeBody('H');
    this.body.setGun(null);
    game.scene.add(this.body.root);
    this.spot = [x, z];
    this.home = [x, z];
    this.radius = 0.3;
    this.height = 1.8;
    this.reset();
  }
  reset() {
    this.spot = this.home.slice();
    [this.x, this.z] = this.spot;
    this.tx = undefined;
    this.feet = 0;
    this.vx = this.vz = this.vy = 0;
    this.yaw = Math.random() * 6;
    this.hp = 100;
    this.state = 'idle';
    this.leader = null;
    this.path = null;
    this.repath = 0;
    this.crouchK = 0;
    this.body.revive();
    this.body.root.visible = true;
  }
  eyeH() {
    return this.state === 'idle' ? 0.95 : 1.62;
  }
}

// where each first-person model sits in front of the camera
const VM_OFFSET = {
  knife: [0.12, -0.12, -0.25],
  pistol: [0.085, -0.095, -0.3, 0.05],
  deagle: [0.085, -0.095, -0.3, 0.05],
  smg: [0.1, -0.11, -0.24, 0.04],
  shotgun: [0.1, -0.115, -0.22, 0.04],
  rifle: [0.1, -0.115, -0.22, 0.04],
  sniper: [0.1, -0.12, -0.2, 0.04],
  he: [0.12, -0.11, -0.25],
  flash: [0.12, -0.11, -0.25],
};
const VM_SCALE = 0.62;

class ViewModel {
  constructor() {
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(54, 1, 0.01, 10);
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
    this.holder = new THREE.Group();
    this.holder.add(this.mesh);
    this.holder.scale.setScalar(VM_SCALE);
    this.scene.add(this.holder);
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    this.flash.visible = false;
    this.holder.add(this.flash);
    this.cache = {};
    this.kick = 0;
    this.bob = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.draw = 0;
    this.flashT = 0;
  }
  setKind(kind, team) {
    const key = kind + team;
    if (!this.cache[key]) this.cache[key] = viewModel(kind, team);
    const v = this.cache[key];
    this.mesh.geometry = v.geo;
    this.muzzle = v.muzzle;
    this.flash.position.set(v.muzzle[0], v.muzzle[1], v.muzzle[2] - 0.03);
    this.draw = 1;
    this.kind = kind;
  }
}

export class Game {
  constructor(renderer, opts, hud) {
    this.renderer = renderer;
    this.opts = opts;
    this.mode = opts.mode;
    this.hud = hud;
    this.time = 0;
    this.scene = new THREE.Scene();
    const horizon = new THREE.Color(0xc9dbe6);
    this.scene.background = horizon;
    this.scene.fog = new THREE.Fog(horizon, 45, 170);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 420);
    this.camera.rotation.order = 'YXZ';

    this.scene.add(new THREE.HemisphereLight(0xe4eeff, 0x5c4e3c, 1.25));
    const sun = new THREE.DirectionalLight(0xfff0dc, 1.55);
    sun.position.copy(SUN).multiplyScalar(50);
    this.scene.add(sun);
    this.tex = makeTextures(renderer);
    this.map = new GameMap();
    for (const m of this.map.buildMeshes(this.tex)) this.scene.add(m);
    this.buildSurroundings();
    this.fx = new FX(this.scene);
    this.vm = new ViewModel();
    this.vm.flash.material.map = this.fx.flashes[0].s.material.map;
    this.lightCache = new Float32Array(W * H).fill(-1);

    this.role = opts.role || 'solo';
    this.preview = !!opts.preview;
    // soldiers: player + 4 teammates vs 5 (or the roster of an online match)
    this.soldiers = [];
    const me = opts.team;
    if (opts.roster) {
      for (const r of opts.roster) {
        const isMe = !!r.peer && r.peer === opts.myPeer;
        const s = new Soldier(this, r.id, r.team, r.name, isMe);
        s.peer = r.peer || null;
        if (isMe) this.player = s;
        else if (this.role === 'client' || s.peer) s.remote = true;
        else s.brain = new Brain(s, this, opts.diff);
        this.soldiers.push(s);
      }
    } else {
    const names = (team) => (lang === 'ru' ? BOT_NAMES[team] : BOT_NAMES[team + 'en']).slice().sort(() => Math.random() - 0.5);
    const nA = names('A'), nB = names('B');
    let id = 0;
    this.player = new Soldier(this, id++, me, t('you'), true);
    this.soldiers.push(this.player);
    for (const team of ['A', 'B']) {
      const count = team === me ? 4 : 5;
      for (let i = 0; i < count; i++) {
        const s = new Soldier(this, id++, team, (team === 'A' ? nA : nB)[i], false);
        s.brain = new Brain(s, this, opts.diff);
        this.soldiers.push(s);
      }
    }
    }
    this.hostages = this.mode === 'hostage' ? this.map.hostageSpots.map(([x, z]) => new Hostage(this, x, z)) : [];
    if (this.mode !== 'hostage') this.map.rescueMesh.visible = false;
    this.nades = [];
    this.nadeMeshes = [];
    this.score = { A: 0, B: 0 };
    this.lossStreak = { A: 0, B: 0 };
    this.round = 0;
    this.spotted = new Map();
    this.view = { x: 0, y: 1.6, z: 0, yaw: 0, pitch: 0, shake: 0 };
    this.spec = null;
    this.over = false;
    this.flashWhite = 0;
    this.player.switchSlot(2, true);
    this.dmKills = { A: 0, B: 0 };
    if (this.role === 'client') {
      // wait for the host's first round
      this.phase = 'wait';
      this.phaseEnd = 0;
      for (const s of this.soldiers) {
        s.alive = false;
        s.body.root.visible = false;
      }
    } else this.startRound(true);
  }

  // an online client gets the round from the host
  applyRound(m) {
    this.round = m.r;
    this.fx.clear();
    for (const n of this.nades) this.dropNade(n);
    this.nades.length = 0;
    this.phase = this.mode === 'dm' ? 'live' : 'freeze';
    this.roundStart = this.time;
    this.result = null;
    this.flashWhite = 0;
    this.view.shake = 0;
    for (const [id, x, z, y] of m.sp) {
      const s = this.soldiers[id];
      if (!s) continue;
      s.spawn(x / 100, z / 100, y / 1000);
      s.spawnedAt = this.time;
    }
    const p = this.player, L = m.L[p.id];
    if (L) {
      if (!L.keep || m.first) p.resetLoadout();
      else for (const k of Object.keys(p.ammo)) p.ammo[k].res = WEAPONS[k].reserve;
      this.nh.applyLoadout(L, !L.keep || !!m.first);
    }
    p.switchSlot(p.slots[1] ? 1 : 2, true);
    this.vm.mesh.visible = true;
    for (const h of this.hostages) h.reset();
    this.spec = null;
    this.hud.center(this.mode === 'dm' ? t('teamKills') : t('round') + ' ' + this.round, 2);
    this.hud.onRound?.();
    sfx('start');
  }

  // trees and fields beyond the wall
  buildSurroundings() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ map: this.tex.grass.clone(), color: 0xb8c4a8 }));
    ground.material.map.repeat.set(200, 200);
    ground.material.map.needsUpdate = true;
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(W / 2, -0.03, H / 2);
    this.scene.add(ground);
    // sky dome
    const sky = new THREE.SphereGeometry(400, 24, 12);
    const col = [];
    const top = new THREE.Color(0x5e93c8), hor = new THREE.Color(0xc9dbe6);
    const p = sky.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = Math.max(0, p.getY(i) / 400) ** 0.6;
      const c = hor.clone().lerp(top, k);
      col.push(c.r, c.g, c.b);
    }
    sky.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const skyM = new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    skyM.position.set(W / 2, 0, H / 2);
    skyM.renderOrder = -1;
    this.scene.add(skyM);
    // trees: one instanced mesh
    const parts = [];
    const shade = (g, color) => {
      g = g.toNonIndexed();
      const n = g.attributes.normal, c = new THREE.Color(color), a = new Float32Array(n.count * 3);
      for (let i = 0; i < n.count; i++) {
        const d = Math.max(0, n.getX(i) * SUN.x + n.getY(i) * SUN.y + n.getZ(i) * SUN.z);
        const k = 0.55 + d * 0.55;
        a[i * 3] = c.r * k;
        a[i * 3 + 1] = c.g * k;
        a[i * 3 + 2] = c.b * k;
      }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      return g;
    };
    const trunk = new THREE.CylinderGeometry(0.18, 0.25, 2.2, 6);
    trunk.translate(0, 1.1, 0);
    parts.push(shade(trunk, 0x5a4030));
    for (const [r, y, h] of [[2.2, 3.2, 3.2], [1.7, 4.8, 2.8], [1.1, 6.2, 2.2]]) {
      const c = new THREE.ConeGeometry(r, h, 8);
      c.translate(0, y, 0);
      parts.push(shade(c, 0x3c5e2c));
    }
    const treeGeo = mergeGeos(parts);
    const N = 190;
    const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshBasicMaterial({ vertexColors: true }), N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Color();
    let n = 0;
    while (n < N) {
      const x = -40 + Math.random() * (W + 80), z = -40 + Math.random() * (H + 80);
      if (x > -3 && x < W + 3 && z > -3 && z < H + 3) continue;
      const sc = 0.9 + Math.random() * 1.1;
      m.compose(v.set(x, 0, z), q.setFromAxisAngle(s.set(0, 1, 0), Math.random() * 6), s.set(sc, sc * (0.9 + Math.random() * 0.5), sc));
      trees.setMatrixAt(n, m);
      trees.setColorAt(n, c.setHSL(0.27 + Math.random() * 0.06, 0.4, 0.4 + Math.random() * 0.2).multiplyScalar(2.2));
      n++;
    }
    this.scene.add(trees);
    // pool water shimmer
    this.tex.water.offset.set(0, 0);
  }

  // ---------- helpers for bots ----------
  roundTime() {
    return this.phase === 'live' ? this.time - this.liveAt : 0;
  }
  claimHold(s) {
    const holds = this.map.holds;
    this.holdsTaken ||= new Set();
    // two near each hostage, the rest spread out
    const mates = this.soldiers.filter((o) => o.team === s.team && !o.isPlayer);
    const idx = mates.indexOf(s);
    const want = idx % 5 < 2 ? 0 : idx % 5 < 4 ? 1 : -1;
    let options = holds.filter((h) => h.h === want && !this.holdsTaken.has(h));
    if (!options.length) options = holds.filter((h) => !this.holdsTaken.has(h));
    if (!options.length) options = holds;
    const h = options[Math.floor(Math.random() * options.length)];
    this.holdsTaken.add(h);
    return h;
  }
  freeHostageFor(s) {
    let best = null, bd = 1e9;
    for (const h of this.hostages) {
      if (h.state !== 'idle') continue;
      const taken = this.soldiers.some((o) => o !== s && o.alive && o.brain?.goal?.type === 'hostage' && o.brain.goal.h === h);
      const d = Math.hypot(h.x - s.x, h.z - s.z) + (taken ? 25 : 0);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    return best;
  }
  guessEnemy(s) {
    // the team roughly knows where enemies were last seen; late in the round, they "hear" them
    let best = null, bd = 1e9;
    for (const o of this.soldiers) {
      if (!o.alive || o.team === s.team) continue;
      const seen = this.spotted.get(o);
      const known = (seen && this.time - seen.t < 8) || this.mode === 'dm' || this.roundTime() > 70;
      if (!known) continue;
      const px = seen && this.time - seen.t < 8 ? seen.x : o.x, pz = seen && this.time - seen.t < 8 ? seen.z : o.z;
      const d = Math.hypot(px - s.x, pz - s.z);
      if (d < bd) {
        bd = d;
        best = [px + (Math.random() - 0.5) * 6, pz + (Math.random() - 0.5) * 6];
      }
    }
    return best;
  }
  reportSpotted(s, o) {
    this.spotted.set(o, { x: o.x, z: o.z, t: this.time, by: s.team });
  }
  clearShot(s, target) {
    const eye = s.feet + s.eyeH();
    const ty = target.feet + target.eyeH() - 0.3;
    const dx = target.x - s.x, dy = ty - eye, dz = target.z - s.z, d = Math.hypot(dx, dy, dz);
    const ux = dx / d, uy = dy / d, uz = dz / d;
    for (const o of this.soldiers) {
      if (o === s || o === target || !o.alive || o.team !== s.team) continue;
      const h = this.hitTest(o, s.x, eye, s.z, ux, uy, uz, d);
      if (h) return false;
    }
    for (const h of this.hostages) {
      if (h.state === 'dead' || h.state === 'rescued') continue;
      if (this.hitTest(h, s.x, eye, s.z, ux, uy, uz, d)) return false;
    }
    return true;
  }

  // ---------- loadouts ----------
  giveWeapon(s, kind) {
    const w = WEAPONS[kind];
    if (w.slot === 1 || w.slot === 2) {
      s.slots[w.slot] = kind;
      s.ammo[kind] = { mag: w.mag, res: w.reserve };
    }
    if (!s.brain && w.slot === 1) s.dmPick = kind;
  }

  canBuy(s) {
    if (this.mode === 'dm') return this.map.zone[this.map.cellAt(s.x, s.z)] === (s.team === 'A' ? 1 : 2) || this.time - s.spawnedAt < 10;
    if (!(this.phase === 'freeze' || (this.phase === 'live' && this.buyTimeLeft() > 0))) return false;
    const z = this.map.zone[this.map.cellAt(s.x, s.z)];
    return z === (s.team === 'A' ? 1 : 2);
  }

  buyTimeLeft() {
    if (this.mode === 'dm') return 99;
    if (this.role === 'client') return (this.buyEnd ?? 0) - this.time;
    return BUYTIME - (this.time - this.roundStart);
  }

  buy(s, item) {
    if (this.role === 'client' && s === this.player) {
      this.nh.net.toHost({ k: 'buy', item });
      return 'sent';
    }
    if (!s.alive) return 'dead';
    if (!this.canBuy(s)) return this.mode !== 'dm' && this.buyTimeLeft() <= 0 ? 'time' : 'zone';
    const free = this.mode === 'dm';
    let price = WEAPONS[item]?.price ?? GEAR[item]?.price ?? 0;
    if (item === 'helmet' && s.armor >= 100 && !s.helmet) price = 350;
    if (!free && s.money < price) return 'money';
    if (item === 'armor') {
      if (s.armor >= 100) return 'have';
      s.armor = 100;
    } else if (item === 'helmet') {
      if (s.armor >= 100 && s.helmet) return 'have';
      s.armor = 100;
      s.helmet = true;
    } else if (item === 'he') {
      if (s.he >= 1) return 'have';
      s.he = 1;
    } else if (item === 'flash') {
      if (s.flash >= 2) return 'have';
      s.flash++;
    } else {
      const w = WEAPONS[item];
      if (s.slots[w.slot] === item) {
        // buying the same gun again refills it
        s.ammo[item] = { mag: w.mag, res: w.reserve };
      } else this.giveWeapon(s, item);
      s.switchSlot(w.slot, false);
    }
    if (!free) s.money -= price;
    return 'ok';
  }

  // ---------- rounds ----------
  startRound(first = false) {
    this.round++;
    this.fx.clear();
    this.flashWhite = 0;
    this.view.shake = 0;
    for (const n of this.nades) this.dropNade(n);
    this.nades.length = 0;
    this.holdsTaken = new Set();
    this.spotted.clear();
    this.phase = this.mode === 'dm' ? 'live' : 'freeze';
    this.roundStart = this.time;
    this.phaseEnd = this.time + (this.mode === 'dm' ? DM_TIME : FREEZE + (first ? 2 : 0));
    this.liveAt = this.mode === 'dm' ? this.time : this.phaseEnd;
    this.result = null;
    this.rescued = 0;
    const order = { A: this.map.spawns.A.slice().sort(() => Math.random() - 0.5), B: this.map.spawns.B.slice().sort(() => Math.random() - 0.5) };
    const used = { A: 0, B: 0 };
    for (const s of this.soldiers) {
      if (first) s.money = this.mode === 'dm' ? 16000 : 800;
      s.kept = !first && s.alive;
      if (first || !s.alive) {
        s.resetLoadout();
        if (this.mode === 'dm') {
          s.armor = 100;
          s.helmet = true;
          s.he = 1;
          s.flash = 1;
        }
      } else {
        // survivors keep their guns; ammo is topped up
        for (const k of Object.keys(s.ammo)) s.ammo[k].res = WEAPONS[k].reserve;
      }
      const sp = order[s.team][used[s.team]++ % order[s.team].length];
      s.spawn(sp[0], sp[1], s.team === 'A' ? 0 : Math.PI);
      s.spawnedAt = this.time;
      s.switchSlot(s.slots[1] ? 1 : 2, true);
      if (s.brain) {
        s.brain.buy();
        s.brain.planRound();
      }
    }
    for (const h of this.hostages) h.reset();
    this.spec = null;
    this.player.deadAt = 0;
    if (this.mode === 'dm') {
      this.dmKills = { A: 0, B: 0 };
      this.hud.center(t('teamKills'), 3);
    } else {
      this.hud.center(`${t('round')} ${this.round}`, 2);
    }
    this.hud.onRound?.();
    if (!this.preview) sfx('start');
    this.nh?.onRound(first);
  }

  endRound(winner, why) {
    if (this.phase === 'end') return;
    this.phase = 'end';
    this.phaseEnd = this.time + 5;
    this.score[winner]++;
    const loser = winner === 'A' ? 'B' : 'A';
    this.lossStreak[winner] = 0;
    this.lossStreak[loser] = Math.min(4, this.lossStreak[loser] + 1);
    for (const s of this.soldiers) {
      if (s.team === winner) s.money += why === 'rescued' ? 3500 : 3250;
      else s.money += 1400 + 500 * (this.lossStreak[loser] - 1);
      s.money = Math.min(16000, s.money);
    }
    const mine = winner === this.player.team;
    this.result = { winner, why };
    this.hud.banner(t(winner === 'A' ? 'roundWinA' : 'roundWinB'), t(why), mine);
    sfx(mine ? 'win' : 'lose');
    this.nh?.onEnd(winner, why);
    if (this.score[winner] >= WIN_ROUNDS) {
      this.phaseEnd = this.time + 3.5;
      this.matchWinner = winner;
    }
  }

  checkRound() {
    if (this.mode === 'dm') {
      for (const s of this.soldiers)
        if (!s.alive && s.respawnAt && this.time >= s.respawnAt) {
          const list = this.map.spawns[s.team];
          let best = list[0], bd = -1;
          for (const sp of list) {
            let md = 1e9;
            for (const o of this.soldiers) if (o.alive && o.team !== s.team) md = Math.min(md, Math.hypot(o.x - sp[0], o.z - sp[1]));
            const score = md + Math.random() * 6;
            if (score > bd) {
              bd = score;
              best = sp;
            }
          }
          s.resetLoadout();
          s.spawn(best[0], best[1], s.team === 'A' ? 0 : Math.PI);
          s.spawnedAt = this.time;
          s.spawnProtect = this.time + 1.5;
          s.armor = 100;
          s.helmet = true;
          s.he = 1;
          s.flash = 1;
          if (!s.brain && s.dmPick) this.giveWeapon(s, s.dmPick);
          if (s.brain) {
            s.brain.buy();
            s.brain.planRound();
          } else s.switchSlot(s.slots[1] ? 1 : 2, true);
          s.respawnAt = 0;
          if (s.isPlayer) {
            this.spec = null;
            this.vm.mesh.visible = true;
          }
          this.nh?.onSpawn(s);
        }
      const done = this.dmKills.A >= DM_KILLS || this.dmKills.B >= DM_KILLS || this.time >= this.phaseEnd;
      if (done && !this.over) {
        const w = this.dmKills.A === this.dmKills.B ? 'draw' : this.dmKills.A > this.dmKills.B ? 'A' : 'B';
        this.finishMatch(w);
      }
      return;
    }
    if (this.phase === 'freeze' && this.time >= this.phaseEnd) {
      this.phase = 'live';
      this.liveAt = this.time;
      this.phaseEnd = this.time + ROUND;
      this.hud.center(t(this.player.team === 'A' ? 'goA' : 'goB'), 2);
      sfx('start');
    } else if (this.phase === 'live') {
      const aliveA = this.soldiers.some((s) => s.alive && s.team === 'A');
      const aliveB = this.soldiers.some((s) => s.alive && s.team === 'B');
      const left = this.hostages.filter((h) => h.state === 'idle' || h.state === 'follow').length;
      if (this.rescued > 0 && left === 0) this.endRound('A', 'rescued');
      else if (!aliveB) this.endRound('A', 'elim');
      else if (!aliveA) this.endRound('B', 'elim');
      else if (this.time >= this.phaseEnd) this.endRound('B', 'timeOut');
    } else if (this.phase === 'end' && this.time >= this.phaseEnd) {
      if (this.matchWinner) this.finishMatch(this.matchWinner);
      else this.startRound();
    }
  }

  finishMatch(winner) {
    if (this.over) return;
    this.over = true;
    this.nh?.onOver(winner);
    this.hud.matchOver(winner === 'draw' ? null : winner === this.player.team, this);
  }

  // ---------- combat ----------
  hitTest(o, ox, oy, oz, dx, dy, dz, maxT) {
    const eye = o.feet + o.eyeH();
    // head sphere
    let best = null;
    const hx = o.x - ox, hy = eye + 0.06 - oy, hz = o.z - oz;
    const tc = hx * dx + hy * dy + hz * dz;
    if (tc > 0) {
      const d2 = hx * hx + hy * hy + hz * hz - tc * tc;
      const r = 0.17;
      if (d2 < r * r) {
        const tt = tc - Math.sqrt(r * r - d2);
        if (tt < maxT) best = { t: tt, part: 'head' };
      }
    }
    // body box
    const top = eye - 0.13, bottom = o.feet;
    const hw = 0.26;
    const slab = (o0, d, lo, hi) => {
      if (Math.abs(d) < 1e-8) return o0 >= lo && o0 <= hi ? [-Infinity, Infinity] : null;
      let a = (lo - o0) / d, b = (hi - o0) / d;
      if (a > b) [a, b] = [b, a];
      return [a, b];
    };
    const sx = slab(ox, dx, o.x - hw, o.x + hw), sy = slab(oy, dy, bottom, top), sz = slab(oz, dz, o.z - hw, o.z + hw);
    if (sx && sy && sz) {
      const tn = Math.max(sx[0], sy[0], sz[0]), tf = Math.min(sx[1], sy[1], sz[1]);
      if (tn <= tf && tn > 0 && tn < maxT && (!best || tn < best.t)) {
        const y = oy + dy * tn;
        const legsTop = o.feet + (0.86 - 0.36 * (o.crouchK || 0));
        best = { t: tn, part: y < legsTop ? 'legs' : 'body' };
      }
    }
    return best;
  }

  fire(s) {
    const w = WEAPONS[s.kind];
    if (!w || !s.alive) return false;
    if (this.time < s.nextFire || this.time < s.switchUntil) return false;
    if (s.reloadUntil && s.kind !== 'shotgun') return false;
    if (w.nade) {
      if (s.isPlayer) {
        this.throwNade(s, s.kind, s.yaw, s.pitch + 0.08, 15);
      }
      return false;
    }
    if (w.melee) {
      s.nextFire = this.time + w.rate;
      this.knife(s, w);
      return true;
    }
    const a = s.ammoOf(s.kind);
    if (a.mag <= 0) {
      s.nextFire = this.time + 0.25;
      if (s.isPlayer) sfx('dry');
      this.reload(s);
      return false;
    }
    if (s.reloadUntil) s.reloadUntil = 0; // shotgun can interrupt its reload
    a.mag--;
    s.nextFire = this.time + w.rate;
    if (this.time - s.lastShot > w.rate * 2.2 + 0.12) s.shots = 0;
    s.lastShot = this.time;
    const eye = s.feet + s.eyeH();
    // spread
    const hs = Math.hypot(s.vx, s.vz);
    let sp = w.scope ? (s.scoped ? w.scopedSpread : w.spread) : w.spread;
    sp += w.moveSpread * Math.max(0, Math.min(1, (hs - 1.4) / Math.max(1, w.speed - 1.4)));
    if (!s.onGround) sp += 0.1;
    if (s.crouchK > 0.5) sp *= 0.72;
    if (w.auto) sp += Math.min(s.shots, 10) * w.spread * 0.12;
    const control = s.brain ? s.brain.k.control : 0;
    const baseY = s.yaw + s.punchY * (1 - control), baseP = s.pitch + s.punchP * (1 - control);
    const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw);
    let muzzle;
    if (s.isPlayer && this.vm.muzzle) {
      muzzle = [s.x + fx * 0.55 + Math.cos(s.yaw) * 0.13, eye - 0.13 + Math.sin(s.pitch) * 0.5, s.z + fz * 0.55 - Math.sin(s.yaw) * 0.13];
    } else {
      muzzle = [s.x + fx * 0.7 + Math.cos(s.yaw) * 0.12, eye - 0.28 + Math.sin(s.pitch) * 0.6, s.z + fz * 0.7 - Math.sin(s.yaw) * 0.12];
    }
    const pellets = w.pellets || 1;
    this._ends = [];
    this._hits = [];
    for (let i = 0; i < pellets; i++) {
      const ang = Math.random() * Math.PI * 2, r = sp * Math.sqrt(Math.random());
      const py = baseP + Math.sin(ang) * r;
      const yy = baseY + (Math.cos(ang) * r) / Math.max(0.3, Math.cos(baseP));
      const dx = -Math.sin(yy) * Math.cos(py), dy = Math.sin(py), dz = -Math.cos(yy) * Math.cos(py);
      this.bullet(s, s.x, eye, s.z, dx, dy, dz, w, muzzle, i === 0 || i % 3 === 0);
    }
    // recoil
    const [up, side] = recoilKick(w, s.shots);
    s.punchP += up;
    s.punchY += side;
    s.shots++;
    if (w.scope && s.scoped) s.scoped = 0;
    s.justFired = true;
    sfx(s.kind, s.isPlayer ? null : [s.x, eye, s.z], { indoor: this.map.isIndoor(s.x, s.z), mech: s.isPlayer });
    if (s.isPlayer) {
      this.vm.kick = Math.min(1.4, this.vm.kick + (w.pellets ? 1.2 : w.recoil * 30));
      this.vm.flashT = 0.05;
    } else {
      this.fx.flash(muzzle[0], muzzle[1], muzzle[2], 0.45, 0.05);
      s.kick = 1;
    }
    for (const o of this.soldiers) if (o.brain && o.alive) o.brain.hearShot(s.x, s.z, s);
    if (this.nh) this.nh.onFire(s, s.kind, muzzle, this._ends.slice(0, 4), this._hits);
    this._ends = null;
    return true;
  }

  bullet(s, ox, oy, oz, dx, dy, dz, w, muzzle, tracer) {
    const wall = this.map.raycast(ox, oy, oz, dx, dy, dz, 140);
    let maxT = wall ? wall.t : 140;
    let hit = null, who = null;
    for (const o of this.soldiers) {
      if (o === s || !o.alive) continue;
      const h = this.hitTest(o, ox, oy, oz, dx, dy, dz, maxT);
      if (h && (!hit || h.t < hit.t)) {
        hit = h;
        who = o;
      }
    }
    for (const o of this.hostages) {
      if (o.state === 'dead' || o.state === 'rescued') continue;
      const h = this.hitTest(o, ox, oy, oz, dx, dy, dz, maxT);
      if (h && (!hit || h.t < hit.t)) {
        hit = h;
        who = o;
      }
    }
    const end = hit ? hit.t : maxT;
    const ex = ox + dx * end, ey = oy + dy * end, ez = oz + dz * end;
    if (this._ends) this._ends.push([ex, ey, ez]);
    if (tracer && muzzle) {
      if (!s.isPlayer || Math.random() < 0.5) this.fx.tracer(muzzle[0], muzzle[1], muzzle[2], ex, ey, ez, s.isPlayer ? 0.5 : 1);
    }
    if (hit) {
      const isHostage = who instanceof Hostage;
      if (!isHostage && who.team === s.team) {
        // friendly fire is off: the bullet just stops
        return;
      }
      const dmg = w.dmg * Math.pow(w.falloff ?? 0.9, end / 10);
      this.damage(who, dmg, hit.part, s, s.kind, dx, dz, w.pen ?? 0.6);
      this.fx.puff(ex, ey, ez, [0.55, 0.06, 0.06], 0.35, 0.35, 0.2, 0.75);
      this.fx.spark(ex, ey, ez, -dx, -dy, -dz, [0.6, 0.05, 0.05], 4, 2);
    } else if (wall) {
      const c = wall.c;
      const k = c >= 0 ? this.map.kind[c] : 0;
      const metal = SURF.metal.includes(k);
      const soft = SURF.soft.includes(k) || (c >= 0 && this.map.h[c] === 0 && this.map.floor[c] === 1);
      if (k !== K.WATER && !soft) this.fx.decal(ex, ey, ez, wall.nx, wall.ny, wall.nz);
      if (k === K.WATER) this.fx.puff(ex, ey + 0.1, ez, [0.85, 0.95, 1], 0.5, 0.5, 0.8, 0.7);
      else if (metal) this.fx.spark(ex, ey, ez, wall.nx, wall.ny, wall.nz, [1, 0.8, 0.4], 6, 3);
      else {
        this.fx.spark(ex, ey, ez, wall.nx, wall.ny, wall.nz, soft ? [0.3, 0.4, 0.2] : [0.6, 0.55, 0.45], 4, 2);
        if (Math.random() < 0.5) this.fx.puff(ex + wall.nx * 0.05, ey + wall.ny * 0.05, ez + wall.nz * 0.05, soft ? [0.45, 0.5, 0.35] : [0.75, 0.72, 0.66], 0.3, 0.45, 0.25, 0.5);
      }
      if (Math.random() < 0.4) sfx('impact', [ex, ey, ez], { metal });
    }
  }

  knife(s, w) {
    this._hits = [];
    this.knifeHit(s, w);
    if (this.nh) this.nh.onFire(s, 'knife', [s.x, s.feet + 1.2, s.z], [], this._hits);
  }

  knifeHit(s, w) {
    sfx('knife', s.isPlayer ? null : [s.x, 1, s.z]);
    if (s.isPlayer) this.vm.kick = 1;
    const eye = s.feet + s.eyeH();
    const dx = -Math.sin(s.yaw) * Math.cos(s.pitch), dy = Math.sin(s.pitch), dz = -Math.cos(s.yaw) * Math.cos(s.pitch);
    let best = null, bt = w.range;
    for (const o of this.soldiers) {
      if (o === s || !o.alive || o.team === s.team) continue;
      for (const off of [0, 0.15, -0.15]) {
        const yy = s.yaw + off;
        const ddx = -Math.sin(yy) * Math.cos(s.pitch), ddz = -Math.cos(yy) * Math.cos(s.pitch);
        const h = this.hitTest(o, s.x, eye, s.z, ddx, dy, ddz, bt);
        if (h && h.t < bt) {
          bt = h.t;
          best = { o, part: h.part };
        }
      }
    }
    if (best) {
      const behind = Math.abs(angDiff(best.o.yaw, s.yaw)) < 0.8;
      this.damage(best.o, behind ? 120 : w.dmg, best.part === 'head' ? 'body' : best.part, s, 'knife', dx, dz, 0.85);
    } else {
      const wall = this.map.raycast(s.x, eye, s.z, dx, dy, dz, w.range);
      if (wall) {
        const ex = s.x + dx * wall.t, ey = eye + dy * wall.t, ez = s.z + dz * wall.t;
        this.fx.spark(ex, ey, ez, wall.nx, wall.ny, wall.nz, [0.8, 0.8, 0.7], 3, 2);
        sfx('impact', [ex, ey, ez], { metal: true });
      }
    }
  }

  damage(o, dmg, part, by, weapon, dx, dz, pen) {
    if (this.role === 'client') {
      // the host decides; we only report our own hits and show the marker
      if (by === this.player && this._hits) {
        const id = o instanceof Hostage ? 100 + this.hostages.indexOf(o) : o.id;
        this._hits.push([id, Math.round(dmg * 10) / 10, ['head', 'body', 'legs'].indexOf(part), Math.round(dx * 100) / 100, Math.round(dz * 100) / 100, pen]);
        if (!(o instanceof Hostage)) {
          this.hud.hit(part === 'head', false);
          sfx('hit', null, { head: part === 'head' });
        }
      }
      return;
    }
    if (o instanceof Hostage) {
      o.hp -= dmg * (part === 'head' ? 4 : 1);
      if (o.hp <= 0 && o.state !== 'dead') {
        o.state = 'dead';
        o.leader = null;
        o.body.die(false);
        this.nh?.onHostageDown(o);
        if (by) {
          by.money = Math.max(0, by.money - 1000);
          if (by.isPlayer) this.hud.center(t('hostageDied'), 2.5);
        }
      }
      return;
    }
    if (o.spawnProtect > this.time) return;
    let d = dmg * (part === 'head' ? 4 : part === 'legs' ? 0.75 : 1);
    const armored = o.armor > 0 && (part === 'body' || (part === 'head' && o.helmet));
    if (armored) {
      const taken = d * pen;
      o.armor = Math.max(0, o.armor - (d - taken) * 0.5);
      d = taken;
    }
    d = Math.round(d);
    o.hp -= d;
    if (o.brain) o.brain.hurt(by);
    // aim punch
    o.punchP += Math.min(0.05, d * 0.0012);
    if (o.remote) this.nh?.onHurt(o, by, d);
    if (o.isPlayer && by) {
      this.hud.hurt(Math.atan2(-(by.x - o.x), -(by.z - o.z)) - o.yaw, d);
      sfx('hurt');
      this.view.shake = Math.min(0.6, this.view.shake + d * 0.006);
    }
    if (by && by.isPlayer && o !== by) {
      this.hud.hit(part === 'head', o.hp <= 0);
      sfx('hit', null, { head: part === 'head' });
    }
    if (part === 'head' && o.helmet && armored && !(o.hp <= 0)) sfx('impact', [o.x, o.feet + 1.7, o.z], { metal: true });
    if (o.hp <= 0) this.kill(o, by, weapon, part === 'head', dx, dz);
  }

  kill(o, by, weapon, head, dx, dz) {
    o.hp = 0;
    o.alive = false;
    o.deaths++;
    o.killer = by;
    o.deadAt = this.time;
    o.scoped = 0;
    // fall away from the shot
    const fromBehind = Math.abs(angDiff(o.yaw, Math.atan2(-dx, -dz))) < Math.PI / 2;
    o.body.die(fromBehind);
    o.body.root.visible = !o.isPlayer;
    o.nb = null;
    this.nh?.onKill(o, by, weapon, head, dx, dz);
    for (const h of this.hostages) if (h.leader === o) {
      h.leader = null;
      h.state = 'idle';
    }
    if (by && by !== o) {
      if (by.team !== o.team) {
        by.kills++;
        by.money = Math.min(16000, by.money + (WEAPONS[weapon]?.reward ?? 300));
        if (this.mode === 'dm' && this.role !== 'client') this.dmKills[by.team]++;
      }
    }
    this.hud.feed(by, o, weapon, head);
    if (by && by.isPlayer) sfx('kill');
    if (this.mode === 'dm') o.respawnAt = this.time + 3;
    if (o.isPlayer) {
      this.hud.center(by && by !== o ? `${t('killedBy')} ${by.name}` : t('youDied'), 2.5);
      this.vm.mesh.visible = false;
    }
  }

  reload(s) {
    const w = WEAPONS[s.kind];
    if (!w || !w.mag || s.reloadUntil) return;
    const a = s.ammoOf(s.kind);
    if (a.mag >= w.mag || a.res <= 0) return;
    s.reloadUntil = this.time + w.reload;
    s.scoped = 0;
    s.shots = 0;
    sfx('reload', s.isPlayer ? null : [s.x, 1.2, s.z], { dur: w.reload });
    if (s.isPlayer) this.nh?.onSound('reload');
  }

  // ---------- grenades ----------
  throwNade(s, kind, yaw, pitch, speed) {
    if (kind === 'he' ? s.he <= 0 : s.flash <= 0) return;
    if (this.time < s.switchUntil || this.time < s.nextFire) return;
    if (kind === 'he') s.he--;
    else s.flash--;
    s.nextFire = this.time + 0.6;
    const eye = s.feet + s.eyeH();
    const dx = -Math.sin(yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = -Math.cos(yaw) * Math.cos(pitch);
    // start in front of the eye, but never inside a wall
    let reach = 0.45;
    const wall = this.map.raycast(s.x, eye, s.z, dx, dy, dz, 0.6);
    if (wall) reach = Math.max(0, wall.t - 0.12);
    const n = this.spawnNade(s, kind, s.x + dx * reach, eye - 0.08, s.z + dz * reach, dx * speed + s.vx * 0.6, dy * speed + 1.5, dz * speed + s.vz * 0.6, this.nh ? this.nh.newNadeId() : null);
    this.nh?.onNade(n);
    sfx('pin', s.isPlayer ? null : [s.x, 1, s.z]);
    if (s.isPlayer) this.vm.kick = 1;
    // back to a gun when this was the last one
    if ((s.cur === 4 || s.cur === 5) && !s.hasSlot(s.cur)) s.switchSlot(s.prev && s.prev < 4 && s.hasSlot(s.prev) ? s.prev : s.slots[1] ? 1 : 2);
    else if (s.isPlayer) this.vm.draw = 1;
  }

  spawnNade(s, kind, x, y, z, vx, vy, vz, nid) {
    const geo = kind === 'he' ? (this._heGeo ||= new THREE.SphereGeometry(0.06, 8, 6)) : (this._flGeo ||= new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8));
    this._nadeMat ||= {};
    const mat = this._nadeMat[kind] || (this._nadeMat[kind] = new THREE.MeshLambertMaterial({ color: kind === 'he' ? 0x3f5a2c : 0xb0b6be }));
    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);
    const n = { kind, owner: s, x, y, z, vx, vy, vz, fuse: this.time + (kind === 'he' ? 1.7 : 1.5), mesh, nid };
    this.nades.push(n);
    return n;
  }

  dropNade(n) {
    this.scene.remove(n.mesh);
  }

  // a client hears from the host that a grenade went off
  boom(nid, kind, x, y, z) {
    const i = this.nades.findIndex((n) => n.nid === nid);
    if (i >= 0) {
      this.dropNade(this.nades[i]);
      this.nades.splice(i, 1);
    }
    this.detonate({ kind, x, y, z, owner: null });
  }

  updateNades(dt) {
    for (let i = this.nades.length - 1; i >= 0; i--) {
      const n = this.nades[i];
      const steps = 3;
      for (let k = 0; k < steps; k++) {
        const h = dt / steps;
        n.vy -= 14 * h;
        const sp = Math.hypot(n.vx, n.vy, n.vz);
        if (sp > 0.01) {
          const ux = n.vx / sp, uy = n.vy / sp, uz = n.vz / sp;
          const hit = this.map.raycast(n.x, n.y, n.z, ux, uy, uz, sp * h + 0.07);
          if (hit) {
            const dot = n.vx * hit.nx + n.vy * hit.ny + n.vz * hit.nz;
            n.vx = (n.vx - 2 * dot * hit.nx) * 0.45;
            n.vy = (n.vy - 2 * dot * hit.ny) * 0.4;
            n.vz = (n.vz - 2 * dot * hit.nz) * 0.45;
            if (sp > 2) sfx('bounce', [n.x, n.y, n.z]);
            n.x += hit.nx * 0.02;
            n.y += hit.ny * 0.02;
            n.z += hit.nz * 0.02;
            continue;
          }
        }
        n.x += n.vx * h;
        n.y += n.vy * h;
        n.z += n.vz * h;
        if (n.y < 0.07) {
          n.y = 0.07;
          n.vy = Math.abs(n.vy) * 0.35;
          n.vx *= 0.7;
          n.vz *= 0.7;
        }
      }
      n.mesh.position.set(n.x, n.y, n.z);
      n.mesh.rotation.x += dt * 8;
      if (this.role === 'client') {
        // the host says when it goes off; drop it if that message never comes
        if (this.time >= n.fuse + 1) {
          this.dropNade(n);
          this.nades.splice(i, 1);
        }
      } else if (this.time >= n.fuse) {
        this.detonate(n);
        this.nh?.onBoom(n);
        this.dropNade(n);
        this.nades.splice(i, 1);
      }
    }
  }

  detonate(n) {
    if (n.kind === 'he') {
      sfx('explode', [n.x, n.y, n.z]);
      this.fx.flash(n.x, n.y + 0.3, n.z, 4, 0.18);
      for (let i = 0; i < 6; i++) this.fx.puff(n.x + (Math.random() - 0.5), n.y + 0.4 + Math.random() * 0.6, n.z + (Math.random() - 0.5), [0.35, 0.32, 0.3], 2.2, 1.6, 0.6, 0.8);
      this.fx.spark(n.x, n.y + 0.1, n.z, 0, 1, 0, [1, 0.7, 0.3], 30, 7);
      this.fx.decal(n.x, 0.01, n.z, 0, 1, 0);
      if (this.role !== 'client') for (const o of [...this.soldiers, ...this.hostages]) {
        if (o instanceof Soldier ? !o.alive : o.state === 'dead' || o.state === 'rescued') continue;
        const cy = o.feet + 1.0;
        const d = Math.hypot(o.x - n.x, cy - n.y, o.z - n.z);
        if (d > 7.5) continue;
        if (!this.map.los(n.x, n.y + 0.2, n.z, o.x, cy, o.z) && !this.map.los(n.x, n.y + 0.2, n.z, o.x, o.feet + 1.6, o.z)) continue;
        const dmg = 100 * (1 - d / 7.5) ** 1.3;
        if (o instanceof Soldier && n.owner && o.team === n.owner.team && o !== n.owner) continue;
        this.damage(o, dmg, 'body', n.owner, 'he', o.x - n.x, o.z - n.z, 0.6);
      }
      const pd = Math.hypot(this.view.x - n.x, this.view.z - n.z);
      if (pd < 20) this.view.shake = Math.min(1, this.view.shake + (1 - pd / 20) * 0.9);
    } else {
      sfx('flashbang', [n.x, n.y, n.z]);
      this.fx.flash(n.x, n.y + 0.2, n.z, 3, 0.25);
      this.fx.puff(n.x, n.y + 0.3, n.z, [0.9, 0.9, 0.9], 1.6, 1.4, 0.4, 0.6);
      for (const o of this.soldiers) {
        if (!o.alive) continue;
        if (this.role === 'client' && !o.isPlayer) continue;
        const eye = o.feet + o.eyeH();
        const d = Math.hypot(o.x - n.x, eye - n.y, o.z - n.z);
        if (d > 22 || !this.map.los(n.x, n.y + 0.15, n.z, o.x, eye, o.z)) continue;
        const toN = Math.atan2(-(n.x - o.x), -(n.z - o.z));
        const facing = Math.cos(angDiff(o.yaw, toN)) * 0.5 + 0.5; // 1 looking at it, 0 back turned
        const amount = (1 - d / 22) * (0.3 + 0.7 * facing ** 2);
        const dur = amount * 4.2;
        if (dur < 0.25) continue;
        o.blind = Math.max(o.blind, this.time + dur);
        if (o.isPlayer) {
          this.flashWhite = Math.max(this.flashWhite, dur);
          this.flashMax = this.flashWhite;
          sfx('ring', null, { dur: Math.min(3, dur) });
        }
      }
    }
  }

  // ---------- hostages ----------
  useHostage(s, h) {
    if (s.team !== 'A' || !s.alive) return false;
    if (h.state === 'idle') {
      h.state = 'follow';
      h.leader = s;
      h.path = null;
      sfx('use', [h.x, 1, h.z]);
      if (this.player.team === 'B') this.hud.center(t('hostageTaken'), 2);
      this.nh?.onMsg('hostageTaken', 'B');
      // the nearest two defenders go after it
      const defs = this.soldiers.filter((o) => o.brain && o.alive && o.team === 'B').sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z));
      for (const d of defs.slice(0, 2)) {
        d.brain.goal = { type: 'hunt' };
        d.brain.path = null;
        d.brain.lastKnown = { x: h.x, z: h.z, t: this.time };
      }
      return true;
    } else if (h.state === 'follow' && h.leader === s) {
      h.state = 'idle';
      h.leader = null;
      sfx('use', [h.x, 1, h.z]);
      return true;
    }
    return false;
  }

  updateHostages(dt) {
    const R = this.map.rescue;
    if (this.role === 'client') {
      for (const h of this.hostages) {
        if (h.state === 'rescued') continue;
        h.body.root.position.set(h.x, 0, h.z);
        h.body.root.rotation.y = h.yaw;
        const sp = Math.hypot((h.tx ?? h.x) - h.x, (h.tz ?? h.z) - h.z) * 15;
        h.body.animate({ dt, speed: h.state === 'follow' ? Math.min(5, sp) : 0, kneel: h.state === 'idle', crouch: 0, y: 0 });
        h.body.setLight(this.charLight(h.x, h.z));
      }
      return;
    }
    for (const h of this.hostages) {
      if (h.state === 'rescued') continue;
      if (h.state === 'dead') {
        h.body.animate({ dt, y: h.feet, speed: 0 });
        continue;
      }
      let speed = 0;
      if (h.state === 'follow' && h.leader && h.leader.alive) {
        const L = h.leader;
        const d = Math.hypot(L.x - h.x, L.z - h.z);
        if (d > 2.0) {
          if (!h.path || this.time > h.repath) {
            h.path = this.map.path(h.x, h.z, L.x, L.z);
            h.pi = 0;
            h.repath = this.time + 0.6;
          }
          if (h.path && h.pi < h.path.length) {
            const p = h.path[h.pi];
            const dx = p[0] - h.x, dz = p[1] - h.z, dd = Math.hypot(dx, dz);
            if (dd < 0.4) h.pi++;
            else {
              const v = Math.min(5.2, 2.5 + d * 0.8);
              h.vx = (dx / dd) * v;
              h.vz = (dz / dd) * v;
              h.yaw = Math.atan2(-dx, -dz);
              speed = v;
            }
          }
        }
        if (speed === 0) {
          h.vx *= 0.8;
          h.vz *= 0.8;
        }
        h.x += h.vx * dt;
        h.z += h.vz * dt;
        h.feet = 0;
        this.map.collide(h);
        const cx = Math.floor(h.x), cz = Math.floor(h.z);
        if (cx >= R.x0 && cx <= R.x1 && cz >= R.z0 && cz <= R.z1) {
          h.state = 'rescued';
          h.body.root.visible = false;
          this.rescued++;
          L.money = Math.min(16000, L.money + 1000);
          for (const o of this.soldiers) if (o.team === 'A') o.money = Math.min(16000, o.money + 150);
          this.hud.center(t('hostageRescued'), 2);
          this.nh?.onMsg('hostageRescued');
          sfx('rescue');
        }
      } else if (h.state === 'follow') {
        h.state = 'idle';
        h.leader = null;
      }
      h.body.root.position.set(h.x, h.feet, h.z);
      h.body.root.rotation.y = h.yaw;
      h.body.animate({ dt, speed: h.state === 'follow' ? speed : 0, kneel: h.state === 'idle', crouch: 0, y: h.feet });
      h.body.setLight(this.charLight(h.x, h.z));
    }
  }

  // ---------- movement ----------
  move(s, dt, frozen) {
    const w = WEAPONS[s.kind] || WEAPONS.knife;
    let max = w.speed || 5.6;
    if (s.in.walk) max *= 0.52;
    if (s.crouchK > 0.5) max *= 0.36;
    if (s.scoped) max *= 0.55;
    if (frozen) max = 0;
    const tgt = s.in.crouch ? 1 : 0;
    s.crouchK += Math.max(-dt * 7, Math.min(dt * 7, tgt - s.crouchK));
    s.height = 1.8 - 0.5 * s.crouchK;
    let wx = 0, wz = 0;
    const f = s.in.f, st = s.in.s;
    if (f || st) {
      const sy = Math.sin(s.yaw), cy = Math.cos(s.yaw);
      wx = -sy * f + cy * st;
      wz = -cy * f - sy * st;
      const l = Math.hypot(wx, wz);
      if (l > 1e-4) {
        wx /= l;
        wz /= l;
      }
    }
    if (s.onGround) {
      const sp = Math.hypot(s.vx, s.vz);
      if (sp > 0) {
        const drop = Math.max(sp, 1.6) * 7 * dt;
        const ns = Math.max(0, sp - drop) / sp;
        s.vx *= ns;
        s.vz *= ns;
      }
    }
    if (wx || wz) {
      const cur = s.vx * wx + s.vz * wz;
      const add = max - cur;
      if (add > 0) {
        const acc = Math.min(add, (s.onGround ? 11 : 1.8) * Math.max(max, 1) * dt);
        s.vx += acc * wx;
        s.vz += acc * wz;
      }
    }
    if (s.in.jump && s.onGround && !frozen) {
      s.vy = JUMP;
      s.onGround = false;
    }
    s.vy -= GRAV * dt;
    const px = s.x + s.vx * dt, pz = s.z + s.vz * dt;
    s.x = px;
    s.z = pz;
    s.step = s.onGround ? 0.45 : 0.22;
    this.map.collide(s);
    const cx = s.x - px, cz = s.z - pz, cl = Math.hypot(cx, cz);
    if (cl > 1e-5) {
      const nx = cx / cl, nz = cz / cl, vn = s.vx * nx + s.vz * nz;
      if (vn < 0) {
        s.vx -= vn * nx;
        s.vz -= vn * nz;
      }
    }
    // soldiers push each other apart a little
    for (const o of this.soldiers) {
      if (o === s || !o.alive) continue;
      const dx = s.x - o.x, dz = s.z - o.z, d = Math.hypot(dx, dz);
      if (d < 0.55 && d > 1e-4 && Math.abs(s.feet - o.feet) < 1.2) {
        const p = (0.55 - d) * 0.5;
        s.x += (dx / d) * p;
        s.z += (dz / d) * p;
      }
    }
    s.feet += s.vy * dt;
    // head against the ceiling or a window lintel
    const cell = this.map.cellAt(s.x, s.z);
    if (cell >= 0 && this.map.indoor[cell]) {
      const top = this.map.lint[cell] && this.map.h[cell] > 0 ? this.map.lint[cell] : CEIL;
      if (s.feet + s.height > top - 0.05) {
        s.feet = Math.max(this.map.h[cell], top - 0.05 - s.height);
        if (s.vy > 0) s.vy = 0;
      }
    }
    const ground = this.map.groundAt(s.x, s.z, s.radius * 0.9, Math.max(s.feet, 0), s.onGround ? 0.45 : 0.22);
    if (s.feet <= ground) {
      if (!s.onGround && s.vy < -5.5) {
        sfx('land', s.isPlayer ? null : [s.x, s.feet, s.z]);
        if (s.isPlayer) this.vm.kick = Math.max(this.vm.kick, 0.4);
      }
      if (s.isPlayer && ground - s.feet > 0.1) this.view.stepUp = (this.view.stepUp || 0) + (ground - s.feet);
      s.feet = ground;
      s.vy = 0;
      s.onGround = true;
    } else if (s.onGround && s.vy <= 0 && s.feet - ground < 0.5) {
      if (s.isPlayer) this.view.stepUp = (this.view.stepUp || 0) - (s.feet - ground);
      s.feet = ground;
      s.vy = 0;
    } else s.onGround = false;
    this.steps(s, dt, s.onGround, s.in.walk);
  }

  steps(s, dt, onGround, walking) {
    const hs = Math.hypot(s.vx, s.vz);
    if (onGround && hs > 1) {
      s.stepDist += hs * dt;
      const loud = hs > 3.4 && !walking && s.crouchK < 0.5;
      if (s.stepDist > 2.1) {
        s.stepDist = 0;
        if (loud) {
          s.stepLoud = this.time;
          const c = this.map.cellAt(s.x, s.z);
          const k = c >= 0 ? (this.map.h[c] > 0 ? this.map.kind[c] : 0) : 0;
          const fl = c >= 0 ? this.map.floor[c] : 0;
          const surf = SURF.metal.includes(k) ? 'metal' : SURF.wood.includes(k) || fl === 4 || fl === 9 || fl === 10 ? 'wood' : fl === 1 || fl === 6 ? 'soft' : 'hard';
          sfx('step', s.isPlayer ? null : [s.x, s.feet, s.z], { surf, loud: true, self: s.isPlayer });
        }
      }
    }
  }

  charLight(x, z) {
    const c = this.map.cellAt(x, z);
    if (c < 0) return 1;
    let v = this.lightCache[c];
    if (v < 0) {
      if (this.map.indoor[c]) {
        const l = this.map.light(x, 1.2, z, 0, 1, 0, true, 1);
        v = Math.min(1.1, 0.35 + l[0] * 0.75);
      } else v = this.map.sunShadow(x, 1.2, z) ? 1.05 : 0.7;
      this.lightCache[c] = v;
    }
    return v;
  }

  // ---------- frame ----------
  update(dt, input) {
    this.time += dt;
    const p = this.player;
    const frozen = this.phase === 'freeze' || this.over;
    // player intent
    if (p.alive) {
      const k = input.keys;
      p.in.f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      p.in.s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      p.in.jump = k.has('Space');
      p.in.crouch = k.has('ControlLeft') || k.has('ControlRight') || k.has('KeyC');
      p.in.walk = k.has('ShiftLeft') || k.has('ShiftRight');
      if (input.menuOpen) {
        p.in.f = p.in.s = 0;
        p.in.jump = false;
      }
    }
    this.nh?.tick();
    for (const s of this.soldiers) {
      if (!s.alive) continue;
      if (s.remote) {
        // position comes from the network
        this.steps(s, dt, Math.abs(s.feet - this.map.groundAt(s.x, s.z, 0.27, s.feet)) < 0.05, false);
        const b = s.body;
        b.root.position.set(s.x, s.feet, s.z);
        b.root.rotation.y = s.yaw;
        s.kick = Math.max(0, (s.kick || 0) - dt * 8);
        const back = s.vx * -Math.sin(s.yaw) + s.vz * -Math.cos(s.yaw) < -0.5;
        b.animate({ dt, speed: Math.hypot(s.vx, s.vz), crouch: s.crouchK, pitch: s.pitch, kick: s.kick, y: s.feet, back });
        b.setLight(this.charLight(s.x, s.z));
        continue;
      }
      if (s.brain && !this.over) {
        if (this.phase === 'freeze') {
          s.in.f = s.in.s = 0;
          s.in.fire = false;
          s.brain.applyLook(dt, s.team === 'A' ? 0 : Math.PI, 0);
        } else s.brain.update(dt);
      }
      this.move(s, dt, frozen);
      // reload / fire
      if (s.reloadUntil && this.time >= s.reloadUntil) {
        const w = WEAPONS[s.kind];
        const a = s.ammoOf(s.kind);
        if (w && w.mag) {
          const need = w.mag - a.mag, take = Math.min(need, a.res);
          a.mag += take;
          a.res -= take;
        }
        s.reloadUntil = 0;
      }
      const wantFire = s.isPlayer ? input.fire && !input.menuOpen : s.in.fire;
      s.justFired = false;
      if (wantFire && !frozen) {
        const w = WEAPONS[s.kind];
        const wasScoped = s.scoped;
        if (w.auto || w.melee || !s.triggerHeld || s.brain) {
          if (this.fire(s)) {
            // the brain reads this on its next update (bursts)
            s.justFired = true;
            if (w.scope && wasScoped && s.isPlayer) {
              s.rescopeAt = this.time + w.rate;
              s.rescopeTo = wasScoped;
            }
          }
        }
        s.triggerHeld = true;
      } else s.triggerHeld = false;
      // the sniper scope comes back after the bolt
      if (s.rescopeAt && this.time >= s.rescopeAt) {
        if (WEAPONS[s.kind].scope && !s.reloadUntil && input.fire !== true) s.scoped = s.rescopeTo;
        s.rescopeAt = 0;
      }
      // recoil recovery
      const w = WEAPONS[s.kind];
      if (this.time - s.lastShot > (w?.rate || 0.1) + 0.04) {
        const k = Math.exp(-dt * 7.5);
        s.punchP *= k;
        s.punchY *= k;
      }
      // body
      const b = s.body;
      b.root.position.set(s.x, s.feet, s.z);
      b.root.rotation.y = s.yaw;
      s.kick = Math.max(0, (s.kick || 0) - dt * 8);
      const back = s.vx * -Math.sin(s.yaw) + s.vz * -Math.cos(s.yaw) < -0.5;
      b.animate({ dt, speed: Math.hypot(s.vx, s.vz), crouch: s.crouchK, pitch: s.pitch, kick: s.kick, y: s.feet, back });
      b.setLight(this.charLight(s.x, s.z));
    }
    for (const s of this.soldiers) if (!s.alive) s.body.animate({ dt, y: s.feet, speed: 0 });
    this.updateHostages(dt);
    this.updateNades(dt);
    this.fx.update(dt);
    this.tex.water.offset.x = this.time * 0.02;
    this.tex.water.offset.y = Math.sin(this.time * 0.3) * 0.05;
    if (this.role !== 'client') this.checkRound();
  }

  playerAction(a) {
    const p = this.player;
    if (!p.alive) {
      if (a === 'fire' || a === 'next') this.nextSpectate();
      return;
    }
    if (this.over) return;
    if (a.startsWith('slot')) {
      const n = +a.slice(4);
      if (n === 4 && p.cur === 4) return;
      p.switchSlot(n);
    } else if (a === 'last') {
      if (p.hasSlot(p.prev)) p.switchSlot(p.prev);
    } else if (a === 'reload') this.reload(p);
    else if (a === 'alt') {
      const w = WEAPONS[p.kind];
      if (w.scope && this.time >= p.switchUntil && !p.reloadUntil) {
        p.scoped = (p.scoped + 1) % 3;
        sfx('click');
      }
    } else if (a === 'use') {
      if (p.team !== 'A') return;
      let best = null, bd = 2.3;
      for (const h of this.hostages) {
        if (h.state === 'dead' || h.state === 'rescued') continue;
        const d = Math.hypot(h.x - p.x, h.z - p.z);
        if (d < bd) {
          bd = d;
          best = h;
        }
      }
      if (!best) return;
      if (this.role === 'client') this.nh.net.toHost({ k: 'u' });
      else this.useHostage(p, best);
    }
  }

  nearHostage() {
    const p = this.player;
    if (!p.alive || p.team !== 'A') return null;
    for (const h of this.hostages) {
      if (h.state === 'dead' || h.state === 'rescued') continue;
      if (Math.hypot(h.x - p.x, h.z - p.z) < 2.3) return h;
    }
    return null;
  }

  nextSpectate() {
    const mates = this.soldiers.filter((s) => s.alive && s.team === this.player.team && !s.isPlayer);
    const pool = mates.length ? mates : this.soldiers.filter((s) => s.alive);
    if (!pool.length) return;
    const i = pool.indexOf(this.spec);
    this.spec = pool[(i + 1) % pool.length];
  }

  // camera + view model, then render
  render(dt, look, settings) {
    const p = this.player;
    const v = this.view;
    let src = p;
    if (!p.alive) {
      if (this.mode === 'hostage' && this.time - p.deadAt > 2) {
        if (!this.spec || !this.spec.alive) {
          this.spec = null;
          this.nextSpectate();
        }
        if (this.spec) src = this.spec;
      }
    }
    if (src === p) {
      if (p.alive) {
        // mouse look
        const sens = settings.sens * 0.0022 * (p.scoped === 1 ? 0.45 : p.scoped === 2 ? 0.2 : 1);
        p.yaw -= look.dx * sens;
        p.pitch -= look.dy * sens;
        p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch));
      }
      v.yaw = p.yaw;
      v.pitch = p.alive ? p.pitch + p.punchP * 0.5 : p.pitch;
      v.yawPunch = p.alive ? p.punchY * 0.5 : 0;
      v.x = p.x;
      v.z = p.z;
      let eyeY = p.feet + p.eyeH();
      if (!p.alive) {
        // death cam: sink to the floor
        const k = Math.min(1, (this.time - p.deadAt) * 1.5);
        eyeY = p.feet + 1.6 - k * 1.2;
        v.roll = k * 0.5;
      } else v.roll = 0;
      v.stepUp = (v.stepUp || 0) * Math.exp(-dt * 14);
      v.y = eyeY - v.stepUp;
    } else {
      // spectate a teammate through their eyes
      const s = src;
      v.x += (s.x - v.x) * Math.min(1, dt * 20);
      v.z += (s.z - v.z) * Math.min(1, dt * 20);
      v.y = s.feet + s.eyeH();
      v.yaw = v.yaw + angDiff(v.yaw, s.yaw) * Math.min(1, dt * 12);
      v.pitch += (s.pitch - v.pitch) * Math.min(1, dt * 12);
      v.yawPunch = 0;
      v.roll = 0;
    }
    v.shake = Math.max(0, v.shake - dt * 1.5);
    const sh = v.shake * v.shake * 0.04;
    const cam = this.camera;
    cam.position.set(v.x, v.y, v.z);
    cam.rotation.set(v.pitch + (Math.random() - 0.5) * sh, v.yaw + v.yawPunch + (Math.random() - 0.5) * sh, v.roll || 0);
    const fovBase = settings.fov;
    const zoom = src === p && p.alive ? (p.scoped === 1 ? 2.6 : p.scoped === 2 ? 7 : 1) : 1;
    const targetFov = (2 * Math.atan(Math.tan((fovBase * Math.PI) / 360) / zoom) * 180) / Math.PI;
    if (Math.abs(cam.fov - targetFov) > 0.01) {
      cam.fov = targetFov;
      cam.updateProjectionMatrix();
    }
    setListener(v.x, v.y, v.z, v.yaw, this.map.isIndoor(v.x, v.z));
    this.specTarget = src === p ? null : src;

    // view model
    const vm = this.vm;
    const showVm = src === p && p.alive && !p.scoped;
    vm.mesh.visible = showVm;
    if (showVm) {
      const hs = Math.hypot(p.vx, p.vz);
      vm.bob += dt * hs * 1.9 * (p.onGround ? 1 : 0);
      const bobAmt = Math.min(1, hs / 5.5) * (p.onGround ? 1 : 0.3);
      vm.swayX += (-look.dx * 0.0004 - vm.swayX) * Math.min(1, dt * 10);
      vm.swayY += (look.dy * 0.0004 - vm.swayY) * Math.min(1, dt * 10);
      vm.kick = Math.max(0, vm.kick - dt * 9);
      vm.draw = Math.max(0, vm.draw - dt * 3.2);
      let reloadK = 0;
      if (p.reloadUntil) {
        const w = WEAPONS[p.kind];
        const left = (p.reloadUntil - this.time) / w.reload;
        reloadK = Math.sin(Math.min(1, Math.max(0, 1 - left)) * Math.PI);
      }
      const knife = p.kind === 'knife';
      const h = vm.holder;
      const o = VM_OFFSET[p.kind] || VM_OFFSET.rifle;
      h.position.set(
        o[0] + Math.sin(vm.bob) * 0.012 * bobAmt + vm.swayX,
        o[1] + Math.abs(Math.cos(vm.bob)) * 0.012 * bobAmt + vm.swayY - vm.draw * 0.25 - reloadK * 0.12 - p.crouchK * 0.01,
        o[2] + vm.kick * (knife ? -0.12 : 0.045),
      );
      // turned a little towards the centre so the side of the gun shows
      h.rotation.set(vm.kick * (knife ? -0.6 : 0.09) + reloadK * 0.6 - vm.draw * 0.8 + (knife ? 0.25 : 0.03), (knife ? vm.kick * 0.5 + 0.35 : o[3] ?? 0.085), reloadK * 0.35 + (knife ? -0.5 : -0.04));
      vm.mat.color.setScalar(this.charLight(p.x, p.z) * 1.08);
      vm.flashT -= dt;
      vm.flash.visible = vm.flashT > 0;
      if (vm.flash.visible) {
        vm.flash.scale.setScalar(0.16 + Math.random() * 0.08);
        vm.flash.material.rotation = Math.random() * 6;
      }
    }
    this.flashWhite = Math.max(0, this.flashWhite - dt);
    const r = this.renderer;
    r.autoClear = false;
    r.clear();
    r.render(this.scene, cam);
    if (showVm) {
      r.clearDepth();
      r.render(vm.scene, vm.cam);
    }
  }

  roster() {
    return this.soldiers.map((s) => ({ id: s.id, team: s.team, name: s.name, peer: s.peer || null }));
  }

  // a friend joins mid-match: they take a bot's place from the next round (deathmatch: in a moment)
  addHuman(peer, name) {
    const humans = (team) => this.soldiers.filter((s) => s.team === team && (s.peer || s.isPlayer)).length;
    const order = humans('A') <= humans('B') ? ['A', 'B'] : ['B', 'A'];
    for (const team of order) {
      const bots = this.soldiers.filter((s) => s.team === team && s.brain);
      if (!bots.length) continue;
      const s = bots.find((b) => !b.alive) || bots[0];
      s.brain = null;
      s.peer = peer;
      s.remote = true;
      s.name = name;
      s.nb = null;
      if (s.alive) {
        s.alive = false;
        s.body.root.visible = false;
        s.deadAt = this.time;
      }
      if (this.mode === 'dm') s.respawnAt = this.time + 2;
      return s;
    }
    return null;
  }

  // a friend left: a bot carries on in their place
  botify(s, name) {
    s.peer = null;
    s.remote = false;
    s.netKind = null;
    s.nb = null;
    if (name) s.name = name;
    s.brain = new Brain(s, this, this.opts.diff);
    s.brain.planRound();
    s.switchSlot(s.slots[1] ? 1 : 2, true);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.vm.cam.aspect = w / h;
    this.vm.cam.updateProjectionMatrix();
  }

  dispose() {
    const all = [];
    this.scene.traverse((o) => all.push(o));
    this.vm.scene.traverse((o) => all.push(o));
    for (const o of all) if (o.isInstancedMesh) o.dispose();
    for (const o of all) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          if (m.map && !Object.values(this.tex).includes(m.map)) m.map.dispose();
          m.dispose();
        }
      }
    }
    for (const k of Object.values(this.tex)) k.dispose();
  }
}
