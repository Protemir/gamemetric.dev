// The match: soldiers, hostages, shooting, grenades, rounds, money, camera and view model.
import * as THREE from '../vendor/three.module.min.js';
import { GameMap, W, H, K, SURF, SUN, CEIL, mergeGeos, WATER_Y, POOL_BOTTOM, DECK_T } from './map.js';
import { buildDecor } from './decor.js';
import { buildProps, propsReady } from './props.js';
import { Chickens } from './chickens.js';
import { Rain } from './weather.js';
import { Smokes } from './smoke.js';
import { Fireplace } from './fireplace.js';
import { PoolToys } from './pool.js';
import { makeTextures } from './textures.js';
import { makeBody, setBlocker } from './people.js';
import { thirdPersonGun } from './actors.js';
import { WEAPONS, GEAR, recoilKick, viewModel } from './weapons.js';
import { sfx, setListener, setUnderwater, setQuack, getVolume } from './audio.js';
import { Brain } from './bots.js';
import { FX } from './fx.js';
import { t, lang, BOT_NAMES } from './i18n.js';

const GRAV = 16, JUMP = 5.45, FREEZE = 5, ROUND = 115, BUYTIME = 22, WIN_ROUNDS = 8, DM_KILLS = 60, DM_TIME = 600;
// the extra modes all run on the deathmatch machinery (respawns, no rounds) with their own rules
export const GUN_LADDER = ['smg', 'm4', 'rifle', 'shotgun', 'scout', 'mg', 'sniper', 'deagle', 'pistol', 'knife'];
const VARIANT = {
  gun: { time: 600, kills: Infinity },
  knife: { time: 300, kills: 30 },
  zombie: { time: 180, kills: Infinity },
};
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
    this.body = makeBody(team, id);
    if (game.variant === 'zombie' && team === 'B') this.body.zombify?.();
    if (game.fun?.heads) this.body.bigHead?.();
    if (game.fun?.hats) this.body.chickenHat?.();
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
    this.smoke = 0;
    this.armor = 0;
    this.helmet = false;
    this.cur = 2;
    this.prev = 3;
  }

  get kind() {
    if (this.remote && this.netKind) return this.netKind;
    if (this.cur === 4) return 'he';
    if (this.cur === 5) return 'flash';
    if (this.cur === 6) return 'smoke';
    return this.slots[this.cur] || 'knife';
  }

  ammoOf(kind) {
    return this.ammo[kind] || { mag: 0, res: 0 };
  }

  eyeH() {
    return 1.62 - 0.5 * this.crouchK;
  }

  bestSlot() {
    return this.slots[1] ? 1 : this.slots[2] ? 2 : 3;
  }

  hasSlot(n) {
    if (n === 4) return this.he > 0;
    if (n === 5) return this.flash > 0;
    if (n === 6) return this.smoke > 0;
    return !!this.slots[n];
  }

  switchSlot(n, instant = false) {
    // the same slot still has to be redrawn when a bought gun replaced the one that was in it
    if (!this.hasSlot(n) || (n === this.cur && !instant && this.shown === this.kind)) return;
    if (n !== this.cur) this.prev = this.cur;
    this.cur = n;
    this.shown = this.kind;
    this.reloadUntil = 0;
    this.scoped = 0;
    this.rescopeAt = 0;
    this.shots = 0;
    this.pinAt = this.throwAt = 0;
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
    this.swimming = false;
    this.underT = 0;
    this.drownAcc = 0;
    this.onBoard = false;
    this.deadBySnap = false;
    this.airCap = 0;
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
  m4: [0.1, -0.115, -0.22, 0.04],
  scout: [0.1, -0.12, -0.2, 0.04],
  mg: [0.105, -0.13, -0.2, 0.04],
  he: [0.12, -0.11, -0.25],
  flash: [0.12, -0.11, -0.25],
  smoke: [0.12, -0.11, -0.25],
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
  setKind(kind, team, skin = this.skin || 'none') {
    this.skin = skin;
    const key = kind + team + skin;
    if (!this.cache[key]) this.cache[key] = viewModel(kind, team, skin);
    const v = this.cache[key];
    this.mesh.geometry = v.geo;
    this.muzzle = v.muzzle;
    this.flash.position.set(v.muzzle[0], v.muzzle[1], v.muzzle[2] - 0.03);
    this.draw = 1;
    this.kind = kind;
    this.team = team;
  }
}

const LINES = {
  ru: {
    die: ['Ой!', 'Мама!', 'Это лаг!', 'Нечестно!', 'Я просто стоял!', 'Ну ёлки!', 'Ай-ай-ай!', 'За что?!', 'Я в домике!', 'Позовите админа!', 'У меня мышка сломалась!', 'Я ещё вернусь!', 'Это читер!', 'Мне солнце в глаза!', 'Я не готов был!'],
    win: ['Изи!', 'Лови!', 'Бум!', 'Учись, салага!', 'Это было красиво!', 'Ха-ха!', 'Следующий!', 'Ещё хочешь?', 'Я легенда!', 'Минус один!'],
  },
  en: {
    die: ['Ouch!', 'Mommy!', 'That was lag!', 'Not fair!', 'I was just standing here!', 'Oh come on!', 'Why me?!', 'Call the admin!', 'My mouse broke!', 'I will be back!', 'Hacker!', 'The sun was in my eyes!'],
    win: ['Easy!', 'Boom!', 'Get good!', 'That was beautiful!', 'Ha ha!', 'Next!', 'Want some more?', 'I am a legend!'],
  },
};

export class Game {
  constructor(renderer, opts, hud) {
    this.renderer = renderer;
    this.opts = opts;
    // gun game, knife fight and zombies are deathmatch underneath; this.variant says which
    this.variant = VARIANT[opts.mode] ? opts.mode : null;
    this.mode = this.variant ? 'dm' : opts.mode;
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
    setBlocker((x, z, feet) => {
      const c = this.map.cellAt(x, z);
      if (c < 0 || this.map.h[c] > feet + 0.45) return true;
      if (this.map.lint[c] > 0 && feet > this.map.lint[c] - 1.5) return true;
      // up high: no sliding off the edge of a gallery or the bridge
      return feet > 1 && this.map.groundAt(x, z, 0.05, feet + 0.1) < feet - 0.5;
    });
    for (const m of this.map.buildMeshes(this.tex, propsReady())) this.scene.add(m);
    for (const m of buildDecor(this.map, this.tex)) this.scene.add(m);
    this.buildSurroundings();
    if (opts.fun?.rain && !opts.preview) this.rainPending = true;
    this.fx = new FX(this.scene);
    // the silly options: big heads, low gravity, exploding chickens
    this.fun = opts.fun || {};
    if (!opts.preview) setQuack(this.fun.quack);
    this.grav = this.fun.lowgrav ? 6 : GRAV;
    this.chickens = new Chickens(this);
    this.smokes = new Smokes(this);
    this.fireplace = new Fireplace(this);
    this.toys = new PoolToys(this);
    if (this.rainPending) this.rain = new Rain(this);
    this.vm = new ViewModel();
    this.vm.flash.material.map = this.fx.flashes[0].s.material.map;
    this.lightCache = new Float32Array(W * H).fill(-1);
    for (const m of buildProps(this)) this.scene.add(m);

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
    this.drops = [];
    this.dropSeq = 0;
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
    this.smokes?.clear();
    this.clearDrops();
    this.firstBlood = false;
    this.chickens.spawn();
    for (const s of this.soldiers) s.roundKills = 0;
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
    p.switchSlot(p.bestSlot(), true);
    this.vm.mesh.visible = true;
    for (const h of this.hostages) h.reset();
    this.spec = null;
    this.hud.center(this.mode === 'dm' ? t(this.variant ? 'intro_' + this.variant : 'teamKills') : t('round') + ' ' + this.round, 2);
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
    // sky: a photographed cloudy sky (Poly Haven, CC0) on a dome, turned so its sun sits where our light comes from
    const loader = new THREE.TextureLoader();
    // once the sky is in, it also becomes the light the characters reflect: a small copy of the dome over grey-green ground
    const skyTex = loader.load('assets/tex/sky.jpg', (t) => {
      if (this.disposed) return;
      const env = new THREE.Scene();
      const dome = new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide }));
      dome.scale.setScalar(0.1);
      env.add(dome);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x55604a }));
      floor.position.y = -1.5;
      env.add(floor);
      const pm = new THREE.PMREMGenerator(this.renderer);
      this.envRT = pm.fromScene(env, 0.02, 0.1, 100);
      pm.dispose();
      this.scene.environment = this.envRT.texture;
    });
    skyTex.colorSpace = THREE.SRGBColorSpace;
    skyTex.wrapS = THREE.RepeatWrapping;
    const SR = 380;
    const sky = new THREE.SphereGeometry(SR, 64, 28, 0, Math.PI * 2, 0, Math.PI * 0.6);
    {
      const p = sky.attributes.position, uv = sky.attributes.uv;
      // three's sphere: x = -cos(phi) sin(theta), z = sin(phi) sin(theta), phi = u * 2pi
      const sunU = Math.atan2(SUN.z, -SUN.x) / (Math.PI * 2);
      const off = 0.59 - sunU; // the sun is 59% across the picture
      for (let i = 0; i < p.count; i++) {
        const elev = (Math.asin(Math.max(-1, Math.min(1, p.getY(i) / SR))) * 180) / Math.PI;
        // the picture spans from the zenith down to 9 degrees below the horizon
        const v = Math.min(1, (90 - elev) / 99);
        uv.setXY(i, uv.getX(i) + off, 1 - v);
      }
    }
    const skyM = new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    skyM.position.set(W / 2, -4, H / 2);
    skyM.renderOrder = -1;
    this.scene.add(skyM);
    this.skyMesh = skyM;
    // trees and bushes: pictures of real ones (baked from Poly Haven models) turned to face the camera
    const board = (file, views, list, w) => {
      const tex = loader.load(file);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
      const ig = new THREE.InstancedBufferGeometry().copy(geo);
      ig.instanceCount = list.length;
      const view = new Float32Array(list.length), tint = new Float32Array(list.length * 3);
      const m = new THREE.InstancedMesh(ig, null, list.length);
      const mx = new THREE.Matrix4(), q0 = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
      list.forEach((t, i) => {
        m.setMatrixAt(i, mx.compose(pv.set(t.x, t.y || 0, t.z), q0, sv.set(w * t.s, w * t.s, w * t.s)));
        view[i] = Math.floor(Math.random() * views);
        const k = t.k ?? 0.9 + Math.random() * 0.2;
        tint[i * 3] = k * (0.95 + Math.random() * 0.1);
        tint[i * 3 + 1] = k;
        tint[i * 3 + 2] = k * (0.9 + Math.random() * 0.1);
      });
      ig.setAttribute('aView', new THREE.InstancedBufferAttribute(view, 1));
      ig.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
      m.material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null }, views: { value: views } }]),
        vertexShader: `
          #include <common>
          #include <fog_pars_vertex>
          attribute float aView;
          attribute vec3 aTint;
          uniform float views;
          varying vec2 vUv;
          varying vec3 vTint;
          void main() {
            vec3 center = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            float sc = length(instanceMatrix[0].xyz);
            vec3 toCam = cameraPosition - center;
            toCam.y = 0.0;
            toCam = normalize(toCam + vec3(1e-4, 0.0, 0.0));
            vec3 right = vec3(toCam.z, 0.0, -toCam.x);
            vec3 wp = center + right * position.x * sc + vec3(0.0, position.y * sc, 0.0);
            vUv = vec2((uv.x + aView) / views, uv.y);
            vTint = aTint;
            vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: `
          #include <common>
          #include <fog_pars_fragment>
          uniform sampler2D map;
          varying vec2 vUv;
          varying vec3 vTint;
          void main() {
            vec4 c = texture2D(map, vUv);
            if (c.a < 0.45) discard;
            gl_FragColor = vec4(c.rgb * vTint, 1.0);
            #include <colorspace_fragment>
            #include <fog_fragment>
          }`,
        fog: true,
      });
      m.material.uniforms.map.value = tex;
      m.frustumCulled = false;
      this.scene.add(m);
      return m;
    };
    // a ring of big trees outside the walls, thicker further out
    const trees = [];
    let guard = 0;
    while (trees.length < 150 && guard++ < 5000) {
      const x = -45 + Math.random() * (W + 90), z = -45 + Math.random() * (H + 90);
      if (x > -4 && x < W + 4 && z > -4 && z < H + 4) continue;
      // keep the gate side a little more open
      const out = Math.max(-x, x - W, -z, z - H);
      if (out < 12 && Math.random() < 0.35) continue;
      trees.push({ x, z, s: 0.38 + Math.random() * 0.3 });
    }
    board('assets/tex/tree.png', 4, trees, 24.9);
    // bushes along the inside of the garden wall, where nobody fights
    const bushes = [];
    const tryBush = (x, z) => {
      const c = this.map.cellAt(x, z);
      if (c < 0 || this.map.h[c] > 0 || this.map.indoor[c] || this.map.zone[c] || this.map.floor[c] !== 1) return;
      bushes.push({ x, z, s: 0.26 + Math.random() * 0.12 });
    };
    for (let x = 1.5; x < W - 1; x += 1.6 + Math.random() * 1.6) {
      tryBush(x, 1.3);
      tryBush(x, H - 1.3);
    }
    for (let z = 1.5; z < H - 1; z += 1.6 + Math.random() * 1.6) {
      tryBush(1.3, z);
      tryBush(W - 1.3, z);
    }
    board('assets/tex/bush.png', 4, bushes, 4.87);
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
    // the free defender often takes a gallery over the hall
    if (want === -1 && Math.random() < 0.6) {
      const up = options.filter((h) => h.up);
      if (up.length) options = up;
    }
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
        // up on a gallery or the bridge the guess stays where they are (a few metres off would be the floor below)
        const py = seen && this.time - seen.t < 8 ? seen.y || 0 : o.feet;
        best = py > 1 ? [px, pz, py] : [px + (Math.random() - 0.5) * 6, pz + (Math.random() - 0.5) * 6, 0];
      }
    }
    return best;
  }
  reportSpotted(s, o) {
    this.spotted.set(o, { x: o.x, z: o.z, y: o.feet, t: this.time, by: s.team });
  }
  clearShot(s, target) {
    const eye = s.feet + s.eyeH();
    const ty = target.feet + target.eyeH() - 0.3;
    const dx = target.x - s.x, dy = ty - eye, dz = target.z - s.z, d = Math.hypot(dx, dy, dz);
    const ux = dx / d, uy = dy / d, uz = dz / d;
    if (!this.map.los(s.x, eye, s.z, target.x, ty, target.z) && !this.map.los(s.x, eye, s.z, target.x, target.feet + target.eyeH(), target.z)) return false;
    for (const o of this.soldiers) {
      if (o === s || o === target || !o.alive || o.team !== s.team) continue;
      const h = this.hitTest(o, s.x, eye, s.z, ux, uy, uz, d);
      if (h) return false;
    }
    for (const h of this.hostages) {
      if (h.state === 'dead' || h.state === 'rescued') continue;
      if (this.hitTest(h, s.x, eye, s.z, ux, uy, uz, d)) return false;
    }
    if (this.fun.boom && this.chickens.hit(s.x, eye, s.z, ux, uy, uz, Math.min(d, 6))) return false;
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
    if (this.variant || this.over) return false;
    if (this.mode === 'dm') return this.time - s.spawnedAt < 12;
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
    const price = this.priceOf(s, item);
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
    } else if (item === 'smoke') {
      if (s.smoke >= 1) return 'have';
      s.smoke = 1;
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
    this.smokes?.clear();
    this.flashWhite = 0;
    this.view.shake = 0;
    for (const n of this.nades) this.dropNade(n);
    this.nades.length = 0;
    this.clearDrops();
    this.holdsTaken = new Set();
    this.spotted.clear();
    this.phase = this.mode === 'dm' ? 'live' : 'freeze';
    this.roundStart = this.time;
    this.phaseEnd = this.time + (this.mode === 'dm' ? (this.variant ? VARIANT[this.variant].time : DM_TIME) : FREEZE + (first ? 2 : 0));
    this.liveAt = this.mode === 'dm' ? this.time : this.phaseEnd;
    this.result = null;
    this.rescued = 0;
    this.firstBlood = false;
    this.chickens.spawn();
    for (const s of this.soldiers) s.roundKills = 0;
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
          s.smoke = 1;
        }
      } else {
        // survivors keep their guns; ammo is topped up
        for (const k of Object.keys(s.ammo)) s.ammo[k].res = WEAPONS[k].reserve;
      }
      const sp = order[s.team][used[s.team]++ % order[s.team].length];
      s.spawn(sp[0], sp[1], s.team === 'A' ? 0 : Math.PI);
      s.spawnedAt = this.time;
      s.switchSlot(s.bestSlot(), true);
      if (first) s.gunLevel = 0;
      if (this.variant) {
        this.variantLoadout(s);
        s.brain?.planRound();
      } else if (s.brain) {
        s.brain.buy();
        s.brain.planRound();
      }
    }
    for (const h of this.hostages) h.reset();
    this.spec = null;
    this.player.deadAt = 0;
    if (this.mode === 'dm') {
      this.dmKills = { A: 0, B: 0 };
      this.hud.center(t(this.variant ? 'intro_' + this.variant : 'teamKills'), 3.5);
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
    if (why === 'elim') this.slowMo();
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
    this.hud.banner(t(winner === 'A' ? 'roundWinA' : 'roundWinB'), t(why) + this.mvpLine(), mine);
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
        if (!s.alive && s.respawnAt && this.time >= s.respawnAt && !this.over) {
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
          s.smoke = 1;
          if (this.variant) {
            s.switchSlot(s.bestSlot(), true);
            this.variantLoadout(s);
            s.brain?.planRound();
          } else {
            if (!s.brain && s.dmPick) this.giveWeapon(s, s.dmPick);
            if (s.brain) {
              s.brain.buy();
              s.brain.planRound();
            } else s.switchSlot(s.bestSlot(), true);
          }
          s.respawnAt = 0;
          if (s.isPlayer) {
            this.spec = null;
            this.vm.mesh.visible = true;
            this.flashWhite = 0;
          }
          this.nh?.onSpawn(s);
        }
      if (this.variant === 'zombie') {
        // the people win by lasting out the clock, the horde by leaving none of them standing
        if (this.role !== 'client' && !this.over) {
          if (!this.soldiers.some((s) => s.team === 'A' && s.alive) && this.time - this.roundStart > 3) this.finishMatch('B');
          else if (this.time >= this.phaseEnd) this.finishMatch('A');
        }
        return;
      }
      const goal = this.variant ? VARIANT[this.variant].kills : DM_KILLS;
      const done = this.dmKills.A >= goal || this.dmKills.B >= goal || this.time >= this.phaseEnd;
      if (done && !this.over && this.role !== 'client') {
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
      else if (!aliveA) this.endRound('B', 'elim');
      else if (!aliveB) this.endRound('A', 'elim');
      else if (this.time >= this.phaseEnd) this.endRound('B', 'timeOut');
    } else if (this.phase === 'end' && this.time >= this.phaseEnd) {
      if (this.matchWinner) this.finishMatch(this.matchWinner);
      else this.startRound();
    }
  }

  finishMatch(winner) {
    if (this.over) return;
    this.over = true;
    if (this.time - (this.lastAnyKill ?? -9) < 0.3 && this.phase !== 'end') this.slowMo();
    for (const n of this.nades) this.dropNade(n);
    this.nades.length = 0;
    this.nh?.onOver(winner);
    this.hud.matchOver(winner === 'draw' ? null : winner === this.player.team, this);
  }

  // ---------- combat ----------
  hitTest(o, ox, oy, oz, dx, dy, dz, maxT) {
    const eye = o.feet + o.eyeH();
    // head sphere
    let best = null;
    // big heads are big targets too
    const big = this.fun.heads && o instanceof Soldier;
    const hx = o.x - ox, hy = eye + (big ? 0.15 : 0.06) - oy, hz = o.z - oz;
    const tc = hx * dx + hy * dy + hz * dz;
    if (tc > 0) {
      const d2 = hx * hx + hy * hy + hz * hz - tc * tc;
      const r = big ? 0.25 : 0.145;
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
    // shooting ends the spawn protection
    if (s.spawnProtect > this.time && !w.nade) s.spawnProtect = 0;
    if (w.nade) {
      // like in CS: pressing pulls the pin, the grenade flies once the button is let go
      if (s.isPlayer && !s.pinAt) {
        s.pinAt = this.time;
        s.throwAt = 0;
        sfx('pin');
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
    // keep the rhythm while the trigger stays down, so 45 fps fires as fast as 144
    s.nextFire = (s.nextFire > this.time - 0.1 ? s.nextFire : this.time) + w.rate;
    s.recoverAt = this.time + w.rate + 0.04;
    if (this.time - s.lastShot > w.rate * 2.2 + 0.12) s.shots = 0;
    s.lastShot = this.time;
    const eye = s.feet + s.eyeH();
    // spread
    const hs = Math.hypot(s.vx, s.vz);
    let sp = w.scope ? (s.scoped ? w.spread + (w.scopedSpread - w.spread) * Math.min(1, (this.time - (s.scopedAt || 0)) / 0.22) : w.spread) : w.spread;
    sp += w.moveSpread * Math.max(0, Math.min(1, (hs - 1.4) / Math.max(1, w.speed - 1.4)));
    if (!s.onGround) sp += w.steady ? 0.004 : 0.1;
    if (s.crouchK > 0.5) sp *= 0.72;
    if (w.auto) sp += Math.min(s.shots, 10) * w.spread * 0.12;
    const control = s.brain ? s.brain.k.control : 0;
    const baseY = s.yaw + s.punchY * (1 - control), baseP = s.pitch + s.punchP * (1 - control);
    const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw);
    let muzzle;
    if (s.isPlayer && this.vm.muzzle) {
      const cp = Math.cos(s.pitch);
      muzzle = [s.x + fx * 0.55 * cp + Math.cos(s.yaw) * 0.13, eye - 0.13 + Math.sin(s.pitch) * 0.5, s.z + fz * 0.55 * cp - Math.sin(s.yaw) * 0.13];
    } else {
      const cp = Math.cos(s.pitch);
      muzzle = [s.x + fx * 0.7 * cp + Math.cos(s.yaw) * 0.12, eye - 0.28 + Math.sin(s.pitch) * 0.6, s.z + fz * 0.7 * cp - Math.sin(s.yaw) * 0.12];
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
    this.ejectShell(s, w, eye);
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
      this.chickens.scare(s.x, s.z, 14);
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
    // a chicken in the way takes the bullet
    const ch = this.chickens.hit(ox, oy, oz, dx, dy, dz, hit ? hit.t : maxT);
    if (ch) {
      if (tracer && muzzle && (!s.isPlayer || Math.random() < 0.5)) this.fx.tracer(muzzle[0], muzzle[1], muzzle[2], ox + dx * ch.t, oy + dy * ch.t, oz + dz * ch.t, s.isPlayer ? 0.5 : 1);
      this._ends?.push([ox + dx * ch.t, oy + dy * ch.t, oz + dz * ch.t]);
      this.chickens.kill(ch.c, s);
      return;
    }
    const duck = s.isPlayer ? this.toys.hit(ox, oy, oz, dx, dy, dz, hit ? hit.t : maxT) : null;
    if (duck) {
      if (tracer && muzzle && (!s.isPlayer || Math.random() < 0.5)) this.fx.tracer(muzzle[0], muzzle[1], muzzle[2], ox + dx * duck.t, oy + dy * duck.t, oz + dz * duck.t, s.isPlayer ? 0.5 : 1);
      this._ends?.push([ox + dx * duck.t, oy + dy * duck.t, oz + dz * duck.t]);
      this.toys.shoot(duck.d, dx, dz);
      return;
    }
    const end = hit ? hit.t : maxT;
    const ex = ox + dx * end, ey = oy + dy * end, ez = oz + dz * end;
    if (dy < 0 && oy > WATER_Y && ey < WATER_Y) {
      const ts = (WATER_Y - oy) / dy, sx = ox + dx * ts, sz = oz + dz * ts;
      if (this.map.inWater(sx, sz)) {
        this.fx.puff(sx, WATER_Y + 0.1, sz, [0.85, 0.95, 1], 0.5, 0.5, 1.6, 0.8);
        this.fx.spark(sx, WATER_Y + 0.02, sz, 0, 1, 0, [0.8, 0.92, 1], 6, 2.5);
        if (Math.random() < 0.5) sfx('drip', [sx, WATER_Y, sz]);
      }
    }
    if (this._ends) this._ends.push([ex, ey, ez]);
    if (tracer && muzzle) {
      if (!s.isPlayer || Math.random() < 0.5) this.fx.tracer(muzzle[0], muzzle[1], muzzle[2], ex, ey, ez, s.isPlayer ? 0.5 : 1);
    }
    if (hit) {
      const isHostage = who instanceof Hostage;
      if ((!isHostage && who.team === s.team) || (isHostage && s.team === 'B')) {
        // friendly fire is off: the bullet just stops
        return;
      }
      const dmg = w.dmg * Math.pow(w.falloff ?? 0.9, end / 10);
      this.damage(who, dmg, hit.part, s, s.kind, dx, dz, w.pen ?? 0.6);
      if (this.fun.confetti) this.confetti(ex, ey, ez, 6);
      else {
        this.fx.puff(ex, ey, ez, [0.55, 0.06, 0.06], 0.35, 0.35, 0.2, 0.75);
        this.fx.spark(ex, ey, ez, -dx, -dy, -dz, [0.6, 0.05, 0.05], 4, 2);
        this.splashBlood(ex, ey, ez, dx, dy, dz, hit.part === 'head');
      }
    } else if (wall) {
      const c = wall.c;
      const k = c >= 0 ? this.map.kind[c] : 0;
      const metal = SURF.metal.includes(k);
      const soft = SURF.soft.includes(k) || (c >= 0 && this.map.h[c] === 0 && this.map.floor[c] === 1);
      if (k !== K.WATER && !soft) this.fx.decal(ex, ey, ez, wall.nx, wall.ny, wall.nz);
      if (k === K.WATER) {
        /* the pool bottom: the splash was at the surface */
      } else if (metal) this.fx.spark(ex, ey, ez, wall.nx, wall.ny, wall.nz, [1, 0.8, 0.4], 6, 3);
      else {
        this.fx.spark(ex, ey, ez, wall.nx, wall.ny, wall.nz, soft ? [0.3, 0.4, 0.2] : [0.6, 0.55, 0.45], 4, 2);
        if (Math.random() < 0.5) this.fx.puff(ex + wall.nx * 0.05, ey + wall.ny * 0.05, ez + wall.nz * 0.05, soft ? [0.45, 0.5, 0.35] : [0.75, 0.72, 0.66], 0.3, 0.45, 0.25, 0.5);
      }
      if (k !== K.WATER && Math.random() < 0.4) sfx('impact', [ex, ey, ez], { metal });
    }
  }

  knife(s, w, heavy = false) {
    this._hits = [];
    this.knifeHit(s, w, heavy);
    if (this.nh) this.nh.onFire(s, 'knife', [s.x, s.feet + 1.2, s.z], [], this._hits);
  }

  // left button: a quick slash; right button (heavy): a slow stab that kills from behind, like in CS
  knifeHit(s, w, heavy = false) {
    sfx('knife', s.isPlayer ? null : [s.x, 1, s.z]);
    if (s.isPlayer) {
      this.vm.kick = heavy ? 1.6 : 1;
      this.vm.stab = heavy ? 1 : 0;
    }
    // somebody in the pool can be reached from the side
    const swimmerNear = this.soldiers.some((o) => o.alive && o.swimming && o.team !== s.team && Math.hypot(o.x - s.x, o.z - s.z) < 3);
    const range = (heavy ? w.range * 0.85 : w.range) * (swimmerNear ? 1.6 : 1);
    const eye = s.feet + s.eyeH();
    const dx = -Math.sin(s.yaw) * Math.cos(s.pitch), dy = Math.sin(s.pitch), dz = -Math.cos(s.yaw) * Math.cos(s.pitch);
    let best = null, bt = range;
    for (const o of this.soldiers) {
      if (o === s || !o.alive || o.team === s.team) continue;
      for (const off of [0, 0.15, -0.15]) {
        const yy = s.yaw + off;
        const ddx = -Math.sin(yy) * Math.cos(s.pitch), ddz = -Math.cos(yy) * Math.cos(s.pitch);
        // the blade stops at a wall like everything else
        const wall = this.map.raycast(s.x, eye, s.z, ddx, dy, ddz, range);
        const h = this.hitTest(o, s.x, eye, s.z, ddx, dy, ddz, wall ? Math.min(bt, wall.t) : bt);
        if (h && h.t < bt) {
          bt = h.t;
          best = { o, part: h.part };
        }
      }
    }
    if (best) {
      const behind = Math.abs(angDiff(best.o.yaw, s.yaw)) < 0.8;
      const dmg = heavy ? (behind ? 180 : 65) : behind ? 90 : w.dmg;
      this.damage(best.o, dmg, best.part === 'head' ? 'body' : best.part, s, 'knife', dx, dz, 0.85);
    } else {
      const wall = this.map.raycast(s.x, eye, s.z, dx, dy, dz, range);
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
    // the body flinches from the hit
    if (o.hp > 0) o.body.hit?.(part === 'head');
    // aim punch
    o.punchP += Math.min(0.05, d * 0.0012);
    if (o.remote) this.nh?.onHurt(o, by, d);
    if (o.isPlayer && !by) {
      sfx('hurt');
      this.view.shake = Math.min(0.4, this.view.shake + d * 0.004);
    }
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
    o.feet = this.map.groundAt(o.x, o.z, o.radius * 0.9, Math.max(0, o.feet));
    o.vy = 0;
    o.killer = by;
    o.deadAt = this.time;
    this.lastAnyKill = this.time;
    o.deathFeet = o.feet;
    o.scoped = 0;
    // fall away from the shot
    const fromBehind = Math.abs(angDiff(o.yaw, Math.atan2(-dx, -dz))) < Math.PI / 2;
    // heavy hits throw the body back
    const push = { shotgun: 2.6, he: 3.6, sniper: 1.8, deagle: 1.3, knife: 0.4 }[weapon] ?? 0.7;
    o.body.die(fromBehind, push, dx, dz, head);
    o.body.root.visible = !o.isPlayer;
    o.nb = null;
    if (this.role !== 'client') this.dropFrom(o);
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
    if (this.fun.talk && o instanceof Soldier) {
      this.say(o, 'die');
      if (by && by !== o && Math.random() < 0.45) setTimeout(() => !this.disposed && by.alive && this.say(by, 'win'), 900);
    }
    if (this.fun.confetti) {
      this.confetti(o.x, o.feet + 1.2, o.z, 40);
      sfx('party', [o.x, o.feet + 1.2, o.z]);
    } else this.fx.bloodDecal(o.x, this.map.groundAt(o.x, o.z, 0.05, o.feet + 0.1), o.z, 0, 1, 0, 1.3);
    // "to the moon": the body takes off spinning and vanishes with a twinkle
    if (this.fun.fly) {
      o.flyVy = 5 + Math.random() * 3;
      o.flyAt = this.time;
      o.flySpin = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 4);
      sfx('whee', [o.x, o.feet + 1, o.z]);
    }
    if (by && by !== o) by.roundKills = (by.roundKills || 0) + 1;
    this.announceKill(o, by, weapon, head);
    this.firstBlood = true;
    if (by && by.isPlayer) sfx('kill');
    if (this.mode === 'dm') o.respawnAt = this.variant === 'zombie' ? (o.team === 'A' ? 0 : this.time + 5) : this.time + 3;
    if (this.variant === 'gun' && by && by !== o && by.team !== o.team && this.role !== 'client') this.gunProgress(by, o, weapon);
    if (this.variant === 'zombie' && by && by.team === 'A' && o.team === 'B') {
      const k = by.slots[1] || by.slots[2];
      if (k && by.ammo[k]) by.ammo[k].res = Math.min(WEAPONS[k].reserve * 2, by.ammo[k].res + WEAPONS[k].mag);
    }
    if (o.isPlayer) {
      this.streak = 0;
      this.hud.center(by && by !== o ? `${t('killedBy')} ${by.name}${by.alive ? ` · ${Math.max(1, Math.ceil(by.hp))} HP` : ''}` : t('youDied'), 2.5);
      this.vm.mesh.visible = false;
    }
  }

  // a bot handed over to a friend leaves quietly: no corpse, no feed line, no score
  vanish(s) {
    if (this.specHidden === s) this.specHidden = null;
    s.hp = 0;
    s.alive = false;
    s.deadAt = this.time;
    s.killer = null;
    s.scoped = 0;
    s.body.root.visible = false;
    s.nb = null;
    if (this.role !== 'client') this.dropFrom(s);
    for (const h of this.hostages) if (h.leader === s) {
      h.leader = null;
      h.state = 'idle';
    }
    this.nh?.onVanish?.(s);
  }

  confetti(x, y, z, n) {
    const C = [[1, 0.25, 0.4], [1, 0.85, 0.2], [0.3, 0.9, 0.4], [0.3, 0.6, 1], [0.85, 0.4, 1], [1, 0.55, 0.15]];
    for (let i = 0; i < C.length; i++) this.fx.spark(x, y, z, (Math.random() - 0.5) * 0.6, 1, (Math.random() - 0.5) * 0.6, C[i], Math.ceil(n / C.length), n > 10 ? 6 : 3);
  }

  // a tag on the wall, like the old shooters: one every few seconds, within arm's reach
  spray(s) {
    if (this.time < (s.sprayAt || 0)) return;
    const eye = s.feet + s.eyeH();
    const dx = -Math.sin(s.yaw) * Math.cos(s.pitch), dy = Math.sin(s.pitch), dz = -Math.cos(s.yaw) * Math.cos(s.pitch);
    const hit = this.map.raycast(s.x, eye, s.z, dx, dy, dz, 3.5);
    if (!hit) return;
    s.sprayAt = this.time + 4;
    this.fx.sprayDecal(s.x + dx * hit.t, eye + dy * hit.t, s.z + dz * hit.t, hit.nx, hit.ny, hit.nz, s.sprayKind ?? (s.sprayKind = Math.floor(Math.random() * 6)));
    sfx('spray', [s.x, eye, s.z]);
  }

  // phones: a gentle pull towards an enemy who is almost under the crosshair, stronger while firing
  aimAssist(p, dt) {
    const eye = p.feet + p.eyeH();
    let best = null, bestA = 0.09;
    for (const o of this.soldiers) {
      if (!o.alive || o.team === p.team) continue;
      const tx = o.x - p.x, tz = o.z - p.z, ty = o.feet + o.eyeH() - 0.3 - eye, d = Math.hypot(tx, tz);
      if (d > 45 || d < 0.5) continue;
      const dyaw = angDiff(p.yaw, Math.atan2(-tx, -tz)), dp = Math.atan2(ty, d) - p.pitch;
      const a = Math.hypot(dyaw, dp);
      if (a < bestA && this.map.los(p.x, eye, p.z, o.x, o.feet + o.eyeH() - 0.3, o.z) && !this.smokeBlocks(p.x, eye, p.z, o.x, o.feet + o.eyeH() - 0.3, o.z)) (bestA = a), (best = { dyaw, dp });
    }
    if (!best) return;
    const k = Math.min(1, dt * (this.vm.kick > 0.05 || p.justFired ? 5 : 2)) * 0.5;
    p.yaw += best.dyaw * k;
    p.pitch += best.dp * k;
  }

  smokeBlocks(ax, ay, az, bx, by, bz) {
    return this.smokes.list.length > 0 && this.smokes.blocks(ax, ay, az, bx, by, bz);
  }

  // ---------- the extra modes ----------
  // the kit for this mode, on spawn and after every step up the gun game ladder
  variantLoadout(s) {
    s.slots = { 1: null, 2: null, 3: 'knife' };
    s.ammo = {};
    s.he = 0;
    s.flash = 0;
    s.smoke = 0;
    s.armor = 100;
    s.helmet = true;
    if (this.variant === 'gun') {
      const k = GUN_LADDER[Math.min(GUN_LADDER.length - 1, s.gunLevel || 0)];
      if (k !== 'knife') this.giveWeapon(s, k);
      s.switchSlot(k === 'knife' ? 3 : WEAPONS[k].slot, true);
    } else if (this.variant === 'knife') {
      s.armor = 0;
      s.helmet = false;
      s.switchSlot(3, true);
    } else if (this.variant === 'zombie') {
      if (s.team === 'B') {
        // the horde: claws only, tough and quick
        s.armor = 0;
        s.helmet = false;
        s.hp = 120;
        s.switchSlot(3, true);
      } else {
        this.giveWeapon(s, s.id % 2 ? 'mg' : 'm4');
        this.giveWeapon(s, 'deagle');
        s.he = 1;
        s.switchSlot(1, true);
      }
    }
    s.shown = null;
    if (s.remote) {
      const k = s.slots[s.cur] || 'knife';
      const a = s.ammo[k] || { mag: 0, res: 0 };
      this.nh?.onPicked(s, { kind: k, mag: a.mag, res: a.res });
    }
  }

  // gun game: a kill moves the killer one gun on; a knife kill at the end wins; knifed victims step back
  gunProgress(by, o, weapon) {
    const last = GUN_LADDER.length - 1;
    if (weapon === 'knife') {
      if ((by.gunLevel || 0) >= last) {
        this.finishMatch(by.team);
        return;
      }
      o.gunLevel = Math.max(0, (o.gunLevel || 0) - 1);
    }
    if ((by.gunLevel || 0) < last) {
      by.gunLevel = (by.gunLevel || 0) + 1;
      if (by.alive) this.variantLoadout(by);
      if (by.isPlayer) {
        const k = GUN_LADDER[by.gunLevel];
        this.hud.center(`${t('level')} ${by.gunLevel + 1}/${GUN_LADDER.length}: ${WEAPONS[k].name[lang]}`, 2);
        sfx('streak', null, { n: Math.min(5, 1 + Math.floor(by.gunLevel / 2)) });
      }
    }
  }

  // "MVP: name, 3 kills" for the round banner
  mvpLine() {
    let best = null;
    for (const s of this.soldiers) if ((s.roundKills || 0) > 0 && (!best || s.roundKills > best.roundKills)) best = s;
    return best ? ` · MVP: ${best.name} (${best.roundKills})` : '';
  }

  // spent brass flies out to the right of the gun (only near the camera, it is just for the eye)
  ejectShell(s, w, eye) {
    if (w.melee || w.nade) return;
    if (Math.hypot(s.x - this.view.x, s.z - this.view.z) > 22) return;
    const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw), rx = Math.cos(s.yaw), rz = -Math.sin(s.yaw);
    const near = s.isPlayer ? 0.32 : 0.45, side = s.isPlayer ? 0.16 : 0.12, y = eye - (s.isPlayer ? 0.12 : 0.3);
    const x = s.x + fx * near + rx * side, z = s.z + fz * near + rz * side;
    const sp = 1.4 + Math.random() * 0.8;
    this.fx.shell(x, y, z, rx * sp + s.vx * 0.8 + (Math.random() - 0.5) * 0.4, 1.6 + Math.random() * 0.8, rz * sp + s.vz * 0.8 + (Math.random() - 0.5) * 0.4, (px, pz, py) => this.map.groundAt(px, pz, 0.02, py), (px, py, pz) => sfx('shell', [px, py, pz]));
  }

  // blood behind someone who was hit: on the wall within reach, or on the floor
  splashBlood(ex, ey, ez, dx, dy, dz, big) {
    const wall = this.map.raycast(ex, ey, ez, dx, dy, dz, 2.2);
    if (wall) this.fx.bloodDecal(ex + dx * wall.t, ey + dy * wall.t, ez + dz * wall.t, wall.nx, wall.ny, wall.nz, big ? 0.7 : 0.45);
    else if (big || Math.random() < 0.5) {
      const fy = this.map.groundAt(ex + dx * 0.8, ez + dz * 0.8, 0.05, ey);
      this.fx.bloodDecal(ex + dx * 0.8, fy, ez + dz * 0.8, 0, 1, 0, big ? 0.9 : 0.5);
    }
  }

  // big words for good kills, like the old shooters did
  announceKill(o, by, weapon, head) {
    if (!by || !by.isPlayer || by === o || o.team === by.team || this.preview) return;
    this.streak = this.time - (this.lastKillAt ?? -99) < 4.5 ? (this.streak || 0) + 1 : 1;
    this.lastKillAt = this.time;
    const enemiesLeft = this.soldiers.filter((s) => s.team !== by.team && s.alive).length;
    let key = null, level = 1;
    if (enemiesLeft === 0 && this.mode !== 'dm' && (by.roundKills || 0) >= this.soldiers.filter((s) => s.team !== by.team).length) (key = 'annAce'), (level = 5);
    else if (this.streak >= 4) (key = 'annGrinder'), (level = 4);
    else if (this.streak === 3) (key = 'annTriple'), (level = 3);
    else if (this.streak === 2) (key = 'annDouble'), (level = 2);
    else if (weapon === 'knife') key = 'annKnife';
    else if (weapon === 'he') key = 'annBoom';
    else if (!this.firstBlood) key = 'annFirst';
    else if (head) key = 'annHead';
    if (key) {
      this.hud.announce?.(t(key), level);
      sfx('streak', null, { n: level });
    }
  }

  reload(s) {
    const w = WEAPONS[s.kind];
    if (!w || !w.mag || s.reloadUntil) return;
    const a = s.ammoOf(s.kind);
    if (a.mag >= w.mag || a.res <= 0) return;
    s.reloadUntil = this.time + (w.shells ? w.reload / w.mag : w.reload);
    s.scoped = 0;
    s.shots = 0;
    sfx('reload', s.isPlayer ? null : [s.x, 1.2, s.z], { dur: w.shells ? 0.35 : w.reload });
    if (s.isPlayer) this.nh?.onSound('reload');
  }

  // ---------- grenades ----------
  throwNade(s, kind, yaw, pitch, speed) {
    const cnt = kind === 'he' ? 'he' : kind === 'smoke' ? 'smoke' : 'flash';
    if (s[cnt] <= 0) return;
    if (this.time < s.switchUntil || this.time < s.nextFire) return;
    s[cnt]--;
    s.nextFire = this.time + 0.6;
    s.spawnProtect = 0;
    const eye = s.feet + s.eyeH();
    const dx = -Math.sin(yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = -Math.cos(yaw) * Math.cos(pitch);
    // start in front of the eye, but never inside a wall
    let reach = 0.45;
    const wall = this.map.raycast(s.x, eye, s.z, dx, dy, dz, 0.6);
    if (wall) reach = Math.max(0, wall.t - 0.12);
    const n = this.spawnNade(s, kind, s.x + dx * reach, eye - 0.08, s.z + dz * reach, dx * speed + s.vx * 0.6, dy * speed + 1.5, dz * speed + s.vz * 0.6, this.nh ? this.nh.newNadeId() : null);
    this.nh?.onNade(n);
    if (!s.isPlayer) sfx('pin', [s.x, 1, s.z]);
    if (s.isPlayer) this.vm.kick = 1;
    // back to a gun when this was the last one
    if (s.cur >= 4 && !s.hasSlot(s.cur)) s.switchSlot(s.prev && s.prev < 4 && s.hasSlot(s.prev) ? s.prev : s.bestSlot());
    else if (s.isPlayer) this.vm.draw = 1;
  }

  spawnNade(s, kind, x, y, z, vx, vy, vz, nid) {
    const geo = kind === 'he' ? (this._heGeo ||= new THREE.SphereGeometry(0.06, 8, 6)) : (this._flGeo ||= new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8));
    this._nadeMat ||= {};
    const mat = this._nadeMat[kind] || (this._nadeMat[kind] = new THREE.MeshLambertMaterial({ color: kind === 'he' ? 0x3f5a2c : kind === 'smoke' ? 0x5a6470 : 0xb0b6be }));
    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);
    const n = { kind, owner: s, x, y, z, vx, vy, vz, fuse: this.time + (kind === 'he' ? 1.7 : kind === 'smoke' ? 1.9 : 1.5), mesh, nid };
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
        if (n.y < 0.07 && !this.map.inWater(n.x, n.z)) {
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
    if (n.kind === 'smoke') {
      sfx('smoke', [n.x, n.y, n.z]);
      this.smokes.add(n.x, n.y, n.z);
      return;
    }
    if (n.kind === 'he') {
      sfx('explode', [n.x, n.y, n.z]);
      this.fx.flash(n.x, n.y + 0.3, n.z, 4, 0.18);
      for (let i = 0; i < 6; i++) this.fx.puff(n.x + (Math.random() - 0.5), n.y + 0.4 + Math.random() * 0.6, n.z + (Math.random() - 0.5), [0.35, 0.32, 0.3], 2.2, 1.6, 0.6, 0.8);
      this.fx.spark(n.x, n.y + 0.1, n.z, 0, 1, 0, [1, 0.7, 0.3], 30, 7);
      if (!this.map.inWater(n.x, n.z)) this.fx.decal(n.x, this.map.groundAt(n.x, n.z, 0.05, n.y + 0.1) + 0.01, n.z, 0, 1, 0);
      if (this.role !== 'client' && !(n.chicken && this.role !== 'solo')) for (const o of [...this.soldiers, ...(n.owner?.team === 'B' ? [] : this.hostages)]) {
        if (o instanceof Soldier ? !o.alive : o.state === 'dead' || o.state === 'rescued') continue;
        const cy = o.feet + 1.0;
        const d = Math.hypot(o.x - n.x, cy - n.y, o.z - n.z);
        if (d > 7.5) continue;
        if (!this.map.los(n.x, n.y + 0.2, n.z, o.x, cy, o.z) && !this.map.los(n.x, n.y + 0.2, n.z, o.x, o.feet + o.eyeH(), o.z)) continue;
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
            h.path = this.map.path(h.x, h.z, L.x, L.z, false, 0, 0, true);
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
        if (this.phase === 'live' && cx >= R.x0 && cx <= R.x1 && cz >= R.z0 && cz <= R.z1) {
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
    const swim = s.feet < -0.05 && this.map.inWater(s.x, s.z);
    if (swim !== !!s.swimming) this.splash(s, swim);
    s.swimming = swim;
    if (swim) max = Math.min(max, 3.3);
    // knife fights are quick; the horde is a touch quicker than the people (it got deadly once bots learned to go round things)
    if (this.variant === 'knife') max *= 1.18;
    else if (this.variant === 'zombie' && s.team === 'B') max *= 1.06;
    const runMax = max;
    if (s.in.walk) max *= 0.52;
    if (s.crouchK > 0.5) max *= 0.36;
    if (s.scoped) max *= 0.55;
    if (frozen) max = 0;
    // under a lintel or on top of the library shelves there is no room to stand up
    const hc = this.map.cellAt(s.x, s.z);
    let room = hc >= 0 && this.map.indoor[hc] ? (this.map.lint[hc] > 0 ? this.map.lint[hc] : this.map.ceilH[hc]) - Math.max(s.feet, this.map.h[hc]) : 99;
    if (hc >= 0 && this.map.deck[hc] && s.feet < this.map.deck[hc] - 0.01) room = Math.min(room, this.map.deck[hc] - DECK_T - s.feet);
    const tgt = s.in.crouch || room < 1.85 ? 1 : 0;
    const oldK = s.crouchK;
    s.crouchK += Math.max(-dt * 7, Math.min(dt * 7, tgt - s.crouchK));
    s.height = 1.8 - 0.5 * s.crouchK;
    // in the air, crouching tucks the legs up instead of dropping the head (like in CS): the view stays
    // steady and a crouch-jump reaches a little higher - crates and hedges, still not the cars
    if (!s.onGround && s.crouchK !== oldK) s.feet += (s.crouchK - oldK) * 0.22;
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
    if (s.onGround || swim) {
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
        const acc = Math.min(add, (s.onGround || swim ? (swim ? 6 : 11) : 1.8) * Math.max(max, 1) * dt);
        s.vx += acc * wx;
        s.vz += acc * wz;
      }
    }
    // in the air you can steer, not speed up (strafing used to add speed with every hop)
    if (!s.onGround && !swim) {
      const hs = Math.hypot(s.vx, s.vz), cap = Math.max(runMax, s.airCap || 0);
      if (hs > cap) {
        s.vx *= cap / hs;
        s.vz *= cap / hs;
      }
    }
    // (bots keep the button down while they stand at a sill: they may jump again)
    const jumpPress = s.in.jump && (!s.jumpHeld || !!s.brain);
    s.jumpHeld = !!s.in.jump;
    if (jumpPress && s.onGround && !frozen && !swim) {
      s.airCap = Math.hypot(s.vx, s.vz);
      s.vy = JUMP;
      if (s.onBoard) {
        // the board throws you far as well as high
        s.airCap *= 1.35;
        s.vx *= 1.35;
        s.vz *= 1.35;
        s.vy = JUMP * 1.85;
        this.toys.bounce(1);
      }
      s.onGround = false;
    }
    // average of the speeds before and after the step: the jump is just as high at 20 fps as at 144
    const vy0 = s.vy, feet0 = s.feet;
    if (swim) {
      // float with the head out of the water; crouch to dive to the bottom; jump kicks up (and over the side)
      const float = s.in.crouch ? POOL_BOTTOM + 0.02 : WATER_Y + 0.28 - s.eyeH();
      s.vy += ((float - s.feet) * 9 - s.vy * 4) * dt;
      const m = this.map;
      const edge = !m.inWater(s.x + 0.8, s.z) || !m.inWater(s.x - 0.8, s.z) || !m.inWater(s.x, s.z + 0.8) || !m.inWater(s.x, s.z - 0.8);
      if (s.in.jump && !frozen && edge && s.feet > float - 0.35 && s.vy < 2) s.vy = 4.2;
      s.onGround = false;
    } else s.vy -= this.grav * dt;
    const px = s.x + s.vx * dt, pz = s.z + s.vz * dt;
    s.x = px;
    s.z = pz;
    s.step = swim ? (s.in.jump ? 1.75 : 0.3) : s.onGround ? 0.45 : 0.22;
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
    s.feet += (vy0 + s.vy) * 0.5 * dt;
    // head against the ceiling or a window lintel
    const cell = this.map.cellAt(s.x, s.z);
    if (cell >= 0 && this.map.indoor[cell]) {
      let top = this.map.lint[cell] > 0 ? this.map.lint[cell] : this.map.ceilH[cell];
      const dk = this.map.deck[cell];
      if (dk && s.feet < dk - 0.01) top = Math.min(top, dk - DECK_T);
      if (s.feet + s.height > top - 0.05) {
        s.feet = Math.max(this.map.h[cell], top - 0.05 - s.height);
        if (s.vy > 0) s.vy = 0;
      }
    }
    let ground = swim ? this.map.groundAt(s.x, s.z, s.radius * 0.9, s.feet, s.step) : this.map.groundAt(s.x, s.z, s.radius * 0.9, Math.max(s.feet, feet0, 0), s.onGround ? 0.45 : 0.22);
    const bt = this.toys.boardTop(s.x, s.z);
    s.onBoard = bt != null && s.feet >= bt - (s.onGround ? 0.46 : 0.15);
    if (s.onBoard) {
      // a hard landing on the board throws you back up
      if (!s.onGround && s.vy < -5 && s.feet <= bt) {
        const hard = -s.vy;
        s.feet = bt + 0.01;
        s.vy = Math.min(13, hard * 0.8);
        this.toys.bounce(Math.min(2, hard / 8));
        ground = -99;
      } else ground = Math.max(ground, bt);
    }
    if (s.feet <= ground) {
      const impact = Math.sqrt(vy0 * vy0 + 2 * this.grav * Math.max(0, feet0 - ground));
      if (!s.onGround && vy0 < 0 && impact > 6) {
        sfx('land', s.isPlayer ? null : [s.x, s.feet, s.z]);
        if (s.isPlayer) this.vm.kick = Math.max(this.vm.kick, 0.4);
      }
      if (s.isPlayer && ground - s.feet > 0.1) this.view.stepUp = (this.view.stepUp || 0) + (ground - s.feet);
      s.feet = ground;
      s.vy = 0;
      s.onGround = true;
      s.airCap = 0;
    } else if (s.onGround && s.vy <= 0 && s.feet - ground < 0.5) {
      if (s.isPlayer) this.view.stepUp = (this.view.stepUp || 0) - (s.feet - ground);
      s.feet = ground;
      s.vy = 0;
    } else s.onGround = false;
    if (swim) this.strokes(s, dt);
    else this.steps(s, dt, s.onGround, s.in.walk);
  }

  drown(dt) {
    for (const s of this.soldiers) {
      if (!s.alive) continue;
      const under = s.feet + s.eyeH() < WATER_Y - 0.05 && this.map.inWater(s.x, s.z);
      s.underT = under ? (s.underT || 0) + dt : 0;
      if (!under) s.drownAcc = 0;
      if (s.underT > 8) {
        if (s.isPlayer && this.time > (s.gaspAt || 0)) {
          s.gaspAt = this.time + 1;
          sfx('bubbles');
        }
        s.drownAcc = (s.drownAcc || 0) + 14 * dt;
        if (s.drownAcc >= 10) {
          s.drownAcc -= 10;
          this.damage(s, 10, 'body', null, 'water', 0, 0, 1);
        }
      }
    }
  }

  // a squeaky voice from the browser's speech engine, quieter further away
  say(s, what) {
    const ss = window.speechSynthesis;
    if (!ss || typeof SpeechSynthesisUtterance === 'undefined' || document.hidden) return;
    const now = performance.now();
    if (now < (this.sayAt || 0) || ss.pending) return;
    const d = s.isPlayer ? 0 : Math.hypot(s.x - this.view.x, s.z - this.view.z);
    if (d > 30) return;
    this.sayAt = now + 700;
    const L = LINES[lang]?.[what] || LINES.en[what];
    const u = new SpeechSynthesisUtterance(L[Math.floor(Math.random() * L.length)]);
    u.lang = lang === 'ru' ? 'ru-RU' : 'en-US';
    const voice = ss.getVoices().find((v) => v.lang.startsWith(lang === 'ru' ? 'ru' : 'en'));
    if (voice) u.voice = voice;
    s.voicePitch ??= 1.5 + Math.random() * 0.5;
    u.pitch = s.voicePitch;
    u.rate = 1.2 + Math.random() * 0.25;
    u.volume = Math.max(0.15, 1 - d / 30) * (getVolume?.() ?? 0.8);
    try {
      ss.speak(u);
    } catch {}
  }

  // the last kill in slow motion (solo only: online everyone's clock must stay the same)
  slowMo() {
    if (this.role !== 'solo' || this.opts.preview) return;
    this.slow = 1.3;
    sfx('slowmo');
  }

  // where a grenade thrown now would go: the same physics as the real one, drawn as a dotted arc
  // where a grenade thrown now would go: exactly the steps of updateNades (h = 1/180, a bounce ends the step)
  nadeArc(s) {
    const kind = s.kind;
    const pitch = s.pitch + 0.08, yaw = s.yaw, speed = 15;
    const eye = s.feet + s.eyeH();
    const dx = -Math.sin(yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = -Math.cos(yaw) * Math.cos(pitch);
    let reach = 0.45;
    const wall = this.map.raycast(s.x, eye, s.z, dx, dy, dz, 0.6);
    if (wall) reach = Math.max(0, wall.t - 0.12);
    let x = s.x + dx * reach, y = eye - 0.08, z = s.z + dz * reach;
    let vx = dx * speed + s.vx * 0.6, vy = dy * speed + 1.5, vz = dz * speed + s.vz * 0.6;
    const fuse = kind === 'he' ? 1.7 : kind === 'smoke' ? 1.9 : 1.5;
    const pts = this._arcPts || (this._arcPts = []);
    pts.length = 0;
    const bounces = this._arcBounce || (this._arcBounce = []);
    bounces.length = 0;
    const h = 1 / 180;
    let next = 0;
    pts.push([x, y, z]);
    for (let t = 0; t < fuse; t += h) {
      vy -= 14 * h;
      const sp = Math.hypot(vx, vy, vz);
      let bounced = false;
      if (sp > 0.01) {
        const ux = vx / sp, uy = vy / sp, uz = vz / sp;
        const hit = this.map.raycast(x, y, z, ux, uy, uz, sp * h + 0.07);
        if (hit) {
          const dot = vx * hit.nx + vy * hit.ny + vz * hit.nz;
          vx = (vx - 2 * dot * hit.nx) * 0.45;
          vy = (vy - 2 * dot * hit.ny) * 0.4;
          vz = (vz - 2 * dot * hit.nz) * 0.45;
          x += hit.nx * 0.02;
          y += hit.ny * 0.02;
          z += hit.nz * 0.02;
          bounced = true;
          if (sp > 2 && bounces.length < 4) bounces.push([x, y, z]);
        }
      }
      if (!bounced) {
        x += vx * h;
        y += vy * h;
        z += vz * h;
        if (y < 0.07 && !this.map.inWater(x, z)) {
          y = 0.07;
          vy = Math.abs(vy) * 0.35;
          vx *= 0.7;
          vz *= 0.7;
        }
      }
      if (t >= next) {
        next = t + 0.025;
        pts.push([x, y, z]);
      }
    }
    pts.push([x, y, z]);
    return { pts, end: [x, y, z], bounces };
  }

  drawArc(p) {
    const show = p.alive && p.pinAt && WEAPONS[p.kind]?.nade && !this.over;
    const N = 96;
    if (!this.arc) {
      if (!show) return;
      // a glowing ribbon turned to the camera, fading in from the hand
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 2 * 4), 4));
      const idx = [];
      for (let i = 0; i < N - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      geo.setIndex(idx);
      this.arc = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      this.arc.frustumCulled = false;
      this.arc.renderOrder = 5;
      // the landing: a ring on the ground, a filled disc, and a short beam that shows over cover
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
      this.arcEnd = new THREE.Group();
      this.arcEnd.add(new THREE.Mesh(new THREE.RingGeometry(0.32, 0.42, 32).rotateX(-Math.PI / 2), ringMat));
      this.arcEnd.add(new THREE.Mesh(new THREE.CircleGeometry(0.32, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.25, depthWrite: false, depthTest: false })));
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8).translate(0, 0.75, 0), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.55, depthWrite: false, depthTest: false }));
      this.arcEnd.add(beam);
      this.arcEnd.renderOrder = 6;
      for (const m of this.arcEnd.children) m.renderOrder = 6;
      this.scene.add(this.arc, this.arcEnd);
    }
    this.arc.visible = this.arcEnd.visible = !!show;
    if (!show) return;
    const a = this.nadeArc(p);
    const color = new THREE.Color(p.kind === 'he' ? 0xff8a3d : p.kind === 'smoke' ? 0xcfd6de : 0xfff0a0);
    for (const m of this.arcEnd.children) m.material.color.copy(color);
    const pts = a.pts;
    // the line leaves the hand (low right of the view), not the eye, so it reads as a curve
    const cam = this.camera;
    const hand = this._hand || (this._hand = new THREE.Vector3());
    hand.set(0.16, -0.2, -0.45).applyQuaternion(cam.quaternion).add(cam.position);
    const n = Math.min(N, pts.length);
    const pos = this.arc.geometry.attributes.position, col = this.arc.geometry.attributes.color;
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    for (let i = 0; i < N; i++) {
      const j = Math.min(i, n - 1);
      let [x, y, z] = pts[j];
      // blend from the hand into the real path over the first metre and a half
      const dist = Math.hypot(pts[j][0] - pts[0][0], pts[j][2] - pts[0][2]);
      const k = Math.min(1, dist / 1.5), e = k * k * (3 - 2 * k);
      x = hand.x + (x - hand.x) * e;
      y = hand.y + (y - hand.y) * e;
      z = hand.z + (z - hand.z) * e;
      // direction along the path and across it, turned to face the camera
      const q = pts[Math.min(n - 1, j + 1)], o = pts[Math.max(0, j - 1)];
      let tx = q[0] - o[0], ty = q[1] - o[1], tz = q[2] - o[2];
      const vx = x - cx, vy = y - cy, vz = z - cz;
      let sx = ty * vz - tz * vy, sy = tz * vx - tx * vz, sz = tx * vy - ty * vx;
      const sl = Math.hypot(sx, sy, sz) || 1;
      const d = Math.hypot(vx, vy, vz);
      // a little wider far away so it stays visible, thin near the hand
      const w = (0.005 + Math.min(0.045, d * 0.0045)) / sl;
      sx *= w;
      sy *= w;
      sz *= w;
      pos.setXYZ(i * 2, x - sx, y - sy, z - sz);
      pos.setXYZ(i * 2 + 1, x + sx, y + sy, z + sz);
      const alpha = i >= n - 1 ? 0 : Math.min(1, 0.08 + e) * 0.9;
      col.setXYZW(i * 2, color.r, color.g, color.b, alpha);
      col.setXYZW(i * 2 + 1, color.r, color.g, color.b, alpha);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    const [ex, ey, ez] = a.end;
    const fy = this.map.inWater(ex, ez) ? WATER_Y : this.map.groundAt(ex, ez, 0.05, ey + 0.1);
    this.arcEnd.position.set(ex, fy + 0.03, ez);
    // the marker keeps a readable size far away
    const far = Math.max(1, Math.hypot(ex - this.camera.position.x, ez - this.camera.position.z) / 9);
    const pulse = 1 + Math.sin(performance.now() / 160) * 0.08;
    this.arcEnd.scale.set(far, Math.min(2, far), far);
    this.arcEnd.children[0].scale.setScalar(pulse);
  }

  // things that are only looked at: updated once a frame by the main loop
  visual(dt) {
    this.drawArc(this.player);
    this.rain?.update(dt);
    this.smokes.update(dt);
    this.fireplace.update(dt);
    this.toys.update(dt);
  }

  // what the shop charges (the menu shows the same)
  priceOf(s, item) {
    let price = WEAPONS[item]?.price ?? GEAR[item]?.price ?? 0;
    if (item === 'helmet' && s.armor >= 100 && !s.helmet) price = 350;
    else if (item === 'helmet' && s.helmet) price = GEAR.armor.price;
    return price;
  }

  // into or out of the water: a splash everyone near hears and sees
  splash(s, into) {
    const big = into && s.vy < -3;
    sfx(into ? 'splash' : 'drip', s.isPlayer ? null : [s.x, 0.2, s.z], { big });
    for (let i = 0; i < (into ? (big ? 9 : 5) : 3); i++) this.fx.puff(s.x + (Math.random() - 0.5) * 0.8, WATER_Y + 0.1 + Math.random() * 0.4, s.z + (Math.random() - 0.5) * 0.8, [0.86, 0.94, 1], big ? 1.1 : 0.7, 0.6, 1.4, 0.75);
    if (into && s.isPlayer && big) this.view.shake = Math.min(1, this.view.shake + 0.25);
  }

  // swimming strokes: a soft splash every couple of metres
  strokes(s, dt) {
    const hs = Math.hypot(s.vx, s.vz);
    if (hs < 0.6) return;
    s.stepDist += hs * dt;
    if (s.stepDist > 1.7) {
      s.stepDist = 0;
      sfx('stroke', s.isPlayer ? null : [s.x, 0.2, s.z]);
      if (s.feet > POOL_BOTTOM + 0.3) this.fx.puff(s.x, WATER_Y + 0.08, s.z, [0.86, 0.94, 1], 0.5, 0.45, 0.8, 0.6);
    }
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
    if (this.slow > 0) {
      this.slow -= dt;
      dt *= 0.3;
    }
    this.time += dt;
    const p = this.player;
    const frozen = this.phase === 'freeze' || this.over;
    // player intent
    if (p.alive) {
      const k = input.keys;
      p.in.f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      p.in.s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      p.in.jump = k.has('Space') || !!input.jumpTap;
      p.in.crouch = k.has('ControlLeft') || k.has('ControlRight') || k.has('KeyC');
      p.in.walk = k.has('ShiftLeft') || k.has('ShiftRight');
      // touch: the stick moves (a small push walks quietly), buttons jump and crouch
      const st = input.stick;
      if (st && (st.x || st.y)) {
        const m = Math.hypot(st.x, st.y);
        if (m > 0.2) {
          p.in.f = -st.y / m;
          p.in.s = st.x / m;
          if (m < 0.65) p.in.walk = true;
        }
      }
      if (input.touch) {
        p.in.jump ||= input.touch.jump;
        p.in.crouch ||= input.touch.crouch;
      }
      if (input.menuOpen) {
        p.in.f = p.in.s = 0;
        p.in.jump = false;
      }
    }
    this.nh?.tick();
    // "to the moon": the dead go up and up, spinning, until a twinkle
    for (const s of this.soldiers) {
      if (!s.flyVy) continue;
      const b = s.body;
      if (s.alive) {
        s.flyVy = 0;
        b.root.rotation.x = 0;
        continue;
      }
      s.flyVy += 6 * dt;
      s.feet = Math.min(60, s.feet + s.flyVy * dt);
      s.yaw += s.flySpin * dt;
      b.root.position.set(s.x, s.feet, s.z);
      b.root.rotation.set((this.time - s.flyAt) * 3, s.yaw, 0);
      if (s.feet > 28 && b.root.visible && !s.isPlayer) {
        b.root.visible = false;
        this.fx.flash(s.x, s.feet + 1, s.z, 3, 0.4);
        sfx('ding', [s.x, s.feet, s.z]);
      }
    }
    for (const s of this.soldiers) {
      if (!s.alive) continue;
      if (s.remote) {
        s.swimming = s.feet < -0.05 && this.map.inWater(s.x, s.z);
        // position comes from the network
        this.steps(s, dt, Math.abs(s.feet - this.map.groundAt(s.x, s.z, 0.27, s.feet)) < 0.05, false);
        const b = s.body;
        b.root.position.set(s.x, s.feet, s.z);
        b.root.rotation.y = s.yaw;
        s.kick = Math.max(0, (s.kick || 0) - dt * 8);
        const fwd = s.vx * -Math.sin(s.yaw) + s.vz * -Math.cos(s.yaw), side = s.vx * Math.cos(s.yaw) - s.vz * Math.sin(s.yaw);
        const back = fwd < -0.5;
        // where the legs go relative to where the gun points (for strafing), and whether we are off the ground
        const rel = Math.hypot(s.vx, s.vz) > 0.6 ? Math.atan2(side, Math.abs(fwd)) : 0;
        const air = s.onGround === false;
        if (!b.culled) b.animate({ dt, speed: Math.hypot(s.vx, s.vz), crouch: s.crouchK, pitch: s.pitch, kick: s.kick, y: s.feet, back, rel, air });
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
        s.reloadUntil = 0;
        if (w && w.mag && w.shells) {
          // the shotgun loads one shell at a time; a shot in between keeps what is in
          if (a.res > 0 && a.mag < w.mag) {
            a.mag++;
            a.res--;
          }
          if (a.res > 0 && a.mag < w.mag) {
            s.reloadUntil = this.time + w.reload / w.mag;
            sfx('reload', s.isPlayer ? null : [s.x, 1.2, s.z], { dur: 0.35 });
          }
        } else if (w && w.mag) {
          const need = w.mag - a.mag, take = Math.min(need, a.res);
          a.mag += take;
          a.res -= take;
        }
      }
      const wantFire = s.isPlayer ? input.fire && !input.menuOpen : s.in.fire;
      s.justFired = false;
      if (wantFire && !frozen) {
        const w = WEAPONS[s.kind];
        const wasScoped = s.scoped;
        if (w.auto || w.melee || !s.triggerHeld || s.brain || (w.nade && !s.pinAt)) {
          const fired = this.fire(s);
          // a long frame may owe an automatic weapon one more shot
          if (fired && w.auto) for (let k = 0; k < 2 && this.time >= s.nextFire; k++) this.fire(s);
          if (fired) {
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
      if (s.isPlayer && s.pinAt && (input.menuOpen || this.over)) s.pinAt = s.throwAt = 0;
      if (s.isPlayer && s.pinAt) {
        // the pin takes a moment, then a short swing before the hand lets go
        if (!wantFire && !s.throwAt) s.throwAt = Math.max(this.time, s.pinAt + 0.35) + 0.1;
        if (s.throwAt && this.time >= s.throwAt) {
          const kind = s.kind;
          s.pinAt = s.throwAt = 0;
          if (WEAPONS[kind]?.nade) this.throwNade(s, kind, s.yaw, s.pitch + 0.08, 15);
        }
      }
      // the sniper scope comes back after the bolt
      if (s.rescopeAt && this.time >= s.rescopeAt) {
        // wait for the button to come up instead of forgetting the scope
        if (s.isPlayer && input.fire === true) s.rescopeAt = this.time + 0.05;
        else {
          if (WEAPONS[s.kind].scope && !s.reloadUntil) {
            s.scoped = s.rescopeTo;
            s.scopedAt = this.time - 0.22;
            s.wasScoped = true;
          }
          s.rescopeAt = 0;
        }
      }
      if (s.scoped && !s.wasScoped) s.scopedAt = this.time;
      s.wasScoped = !!s.scoped;
      // recoil recovery
      const w = WEAPONS[s.kind];
      if (this.time > (s.recoverAt || 0)) {
        const k = Math.exp(-dt * 7.5);
        s.punchP *= k;
        s.punchY *= k;
      }
      // body
      const b = s.body;
      b.root.position.set(s.x, s.feet, s.z);
      b.root.rotation.y = s.yaw;
      s.kick = Math.max(0, (s.kick || 0) - dt * 8);
      const fwd = s.vx * -Math.sin(s.yaw) + s.vz * -Math.cos(s.yaw), side = s.vx * Math.cos(s.yaw) - s.vz * Math.sin(s.yaw);
        const back = fwd < -0.5;
        // where the legs go relative to where the gun points (for strafing), and whether we are off the ground
        const rel = Math.hypot(s.vx, s.vz) > 0.6 ? Math.atan2(side, Math.abs(fwd)) : 0;
        const air = s.onGround === false;
      if (!b.culled) b.animate({ dt, speed: Math.hypot(s.vx, s.vz), crouch: s.crouchK, pitch: s.pitch, kick: s.kick, y: s.feet, back, rel, air });
      b.setLight(this.charLight(s.x, s.z));
    }
    for (const s of this.soldiers) {
      if (s.alive) continue;
      if (s.flyVy) {
        if (!s.body.culled) s.body.animate({ dt, y: s.feet, speed: 0 });
        continue;
      }
      // a body slid off something drops to the floor under it
      const r = s.body.root.position;
      const gy = this.map.groundAt(r.x, r.z, 0.2, s.feet + 0.05);
      if (gy < s.feet) s.feet = Math.max(gy, s.feet - dt * 6);
      if (!s.body.culled || s.body.dead < 1 || s.body.hat?.v) s.body.animate({ dt, y: s.feet, speed: 0 });
    }
    if (this.role !== 'client') this.drown(dt);
    this.updateHostages(dt);
    this.updateDrops();
    if (!this.over) this.chickens.update(dt);
    if (this.mode === 'dm' && this.time > (this.flockAt || 0)) {
      this.flockAt = this.time + 45;
      if (this.chickens.list.length < 5) this.chickens.spawn();
    }

    if (this.variant === 'zombie' && !this.over) for (const s of this.soldiers) if (s.team === 'B' && s.alive && Math.random() < dt * 0.12) sfx('groan', [s.x, s.feet + 1.6, s.z]);
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
    else if (a === 'spray') this.spray(p);
    else if (a === 'inspect') {
      if (!p.reloadUntil && this.time >= p.switchUntil && !p.scoped) this.vm.inspect = 2.4;
    }
    else if (a === 'alt') {
      const w = WEAPONS[p.kind];
      if (w.melee) {
        if (this.phase === 'freeze' || this.time < p.nextFire || this.time < p.switchUntil) return;
        p.nextFire = this.time + 1.0;
        p.spawnProtect = 0;
        this.knife(p, w, true);
        return;
      }
      if (w.scope && this.time >= p.switchUntil && !p.reloadUntil) {
        if (!p.scoped) p.scopedAt = this.time;
        p.scoped = (p.scoped + 1) % 3;
        p.wasScoped = !!p.scoped;
        sfx('click');
      }
    } else if (a === 'use') {
      // a gun on the floor nearer than any hostage: swap for it
      const d = this.nearDrop(p);
      const h = this.nearHostage();
      if (d && (!h || Math.hypot(d.x - p.x, d.z - p.z) < Math.hypot(h.x - p.x, h.z - p.z))) {
        if (this.role === 'client') this.nh.net.toHost({ k: 'pick', id: d.id });
        else this.pickDrop(p, d, true);
        return;
      }
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

  // ---------- guns on the floor ----------
  makeDrop(kind, x, z, mag, res, id, yaw, feet = 0) {
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(thirdPersonGun(kind).geo, mat);
    const y = this.map.groundAt(x, z, 0.05, feet + 0.05);
    // lying on its side
    mesh.rotation.order = 'YXZ';
    mesh.rotation.set(0, yaw, Math.PI / 2);
    mesh.position.set(x, y + 0.035, z);
    mat.color.setScalar(Math.min(1, this.charLight(x, z)));
    this.scene.add(mesh);
    const d = { id: id ?? ++this.dropSeq, kind, x, z, y, mag, res, mesh, born: this.time };
    this.drops.push(d);
    return d;
  }

  removeDrop(d) {
    const i = this.drops.indexOf(d);
    if (i >= 0) this.drops.splice(i, 1);
    this.scene.remove(d.mesh);
    d.mesh.material.dispose();
  }

  clearDrops() {
    for (const d of [...this.drops]) this.removeDrop(d);
  }

  // the dead drop their main gun, or the pistol when there is none
  dropFrom(s) {
    if (this.variant) {
      s.body.setGun(null);
      s.shown = null;
      return;
    }
    const kind = s.slots[1] || s.slots[2];
    if (!kind) return;
    const w = WEAPONS[kind];
    const a = s.ammo[kind] || { mag: w.mag, res: w.reserve };
    s.slots[w.slot] = null;
    s.body.setGun(null);
    s.shown = null;
    if (a.mag + a.res <= 0) return;
    const d = this.makeDrop(kind, s.x, s.z, a.mag, a.res, null, s.yaw + (Math.random() - 0.5), s.feet);
    d.owner = s.id;
    this.nh?.onDrop(d);
    // never let the floor fill up
    while (this.drops.length > 24) {
      const old = this.drops[0];
      this.removeDrop(old);
      this.nh?.onUndrop(old.id);
    }
  }

  pickDrop(s, d, swap) {
    const w = WEAPONS[d.kind], slot = w.slot, old = s.slots[slot];
    if (old && !swap) return;
    this.removeDrop(d);
    this.nh?.onUndrop(d.id);
    if (old) {
      const a = s.ammo[old] || { mag: WEAPONS[old].mag, res: WEAPONS[old].reserve };
      let px = s.x - Math.sin(s.yaw) * 0.4, pz = s.z - Math.cos(s.yaw) * 0.4;
      const pc = this.map.cellAt(px, pz);
      if (pc < 0 || this.map.h[pc] > s.feet + 0.45) (px = s.x), (pz = s.z);
      if (a.mag + a.res > 0) {
        const nd = this.makeDrop(old, px, pz, a.mag, a.res, null, s.yaw + 1.3, s.feet);
        this.nh?.onDrop(nd);
      }
    }
    s.slots[slot] = d.kind;
    s.ammo[d.kind] = { mag: d.mag, res: d.res };
    if (s.remote) {
      this.nh?.onPicked(s, d);
      return;
    }
    if (swap || s.brain || (slot === 1 && s.cur !== 1)) s.switchSlot(slot, false);
    else if (s.cur === slot) s.switchSlot(slot, true);
    if (s.isPlayer) sfx('click');
  }

  // a gun at the player's feet worth pressing E for
  nearDrop(p) {
    if (!p.alive || !this.drops.length || this.variant) return null;
    let best = null, bd = 1.5;
    for (const d of this.drops) {
      if (p.slots[WEAPONS[d.kind].slot] === d.kind) continue;
      const dist = Math.hypot(d.x - p.x, d.z - p.z);
      if (dist < bd && Math.abs(d.y - p.feet) < 1.2) {
        bd = dist;
        best = d;
      }
    }
    return best;
  }

  // walking over a gun picks it up when that slot is empty; bots also swap up to a dearer gun
  updateDrops() {
    if (this.role === 'client' || !this.drops.length || this.variant) return;
    if (this.mode === 'dm') {
      for (const d of [...this.drops]) if (this.time - d.born > 30) {
        this.removeDrop(d);
        this.nh?.onUndrop(d.id);
      }
    }
    for (const s of this.soldiers) {
      if (!s.alive) continue;
      for (const d of this.drops) {
        if (Math.hypot(d.x - s.x, d.z - s.z) > 0.8 || Math.abs(d.y - s.feet) > 1.2) continue;
        const w = WEAPONS[d.kind], cur = s.slots[w.slot];
        if (!cur) {
          this.pickDrop(s, d, false);
          break;
        }
        if (s.brain && WEAPONS[cur].price < w.price && this.time - d.born > 0.5) {
          this.pickDrop(s, d, true);
          break;
        }
      }
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
      if ((this.mode === 'hostage' || !p.respawnAt) && this.time - p.deadAt > 2) {
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
        if (settings.assist && !p.scoped) this.aimAssist(p, dt);
        p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch));
      }
      v.yaw = p.yaw;
      v.pitch = p.alive ? p.pitch + p.punchP * 0.5 : p.pitch;
      v.yawPunch = p.alive ? p.punchY * 0.5 : 0;
      v.x = p.x;
      v.z = p.z;
      let eyeY = p.feet + p.eyeH();
      if (!p.alive) {
        // death cam: sink to the floor, then turn to the one who killed you
        const k = Math.min(1, (this.time - p.deadAt) * 1.5);
        eyeY = (p.flyVy ? p.deathFeet ?? p.feet : p.feet) + 1.6 - k * 1.2;
        v.roll = k * 0.3;
        const by = p.killer;
        if (by && by !== p && this.time - p.deadAt > 0.35 && this.time - p.deadAt < 4) {
          const dx = by.x - p.x, dz = by.z - p.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.5) {
            const e = Math.min(1, dt * 5);
            p.yaw += angDiff(p.yaw, Math.atan2(-dx, -dz)) * e;
            const want = Math.atan2(by.feet + 1.2 - eyeY, d);
            p.pitch += (Math.max(-0.8, Math.min(0.8, want)) - p.pitch) * e;
            v.yaw = p.yaw;
            v.pitch = p.pitch;
          }
        }
      } else v.roll = 0;
      v.stepUp = (v.stepUp || 0) * Math.exp(-dt * 14);
      v.y = eyeY - v.stepUp;
    } else {
      // spectate a teammate through their eyes: the camera sits exactly in their head
      // (a lagging camera ended up behind it and showed their own body twitching in front of the lens)
      const s = src;
      v.x = s.x;
      v.z = s.z;
      v.y = s.feet + s.eyeH();
      v.yaw = v.yaw + angDiff(v.yaw, s.yaw) * Math.min(1, dt * 12);
      v.pitch += (s.pitch - v.pitch) * Math.min(1, dt * 12);
      v.yawPunch = 0;
      v.roll = 0;
    }
    v.shake = Math.max(0, v.shake - dt * 1.5);
    // the camera under the water surface
    const under = v.y < WATER_Y - 0.02 && this.map.inWater(v.x, v.z);
    if (under !== this.underwater) {
      this.underwater = under;
      const el = document.getElementById('water-veil');
      if (el) el.style.opacity = under ? '1' : '0';
      setUnderwater(under);
    }
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
    // the body we look out of is not drawn, just like the player's own
    if (this.specHidden !== this.specTarget) {
      if (this.specHidden) this.specHidden.body.root.visible = true;
      this.specHidden = this.specTarget;
      if (this.specTarget) this.specTarget.body.root.visible = false;
    }

    // view model
    const vm = this.vm;
    const showVm = src.alive && !src.scoped;
    vm.mesh.visible = showVm;
    if (showVm && (vm.kind !== src.kind || vm.team !== src.team || vm.skin !== (settings.skin || 'none'))) {
      vm.skin = settings.skin || 'none';
      vm.setKind(src.kind, src.team, vm.skin);
      vm.draw = 0;
    }
    if (showVm) {
      const p = src;
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
        const left = (p.reloadUntil - this.time) / (w.shells ? w.reload / w.mag : w.reload);
        reloadK = Math.sin(Math.min(1, Math.max(0, 1 - left)) * Math.PI);
      }
      const knife = p.kind === 'knife';
      const pull = p.pinAt ? Math.min(1, (this.time - p.pinAt) / 0.3) : 0;
      // inspecting: tilt the gun up and turn it to show the side, then back
      if (vm.inspect > 0 && (vm.kick > 0.05 || p.reloadUntil || vm.draw > 0.05 || p !== this.player)) vm.inspect = 0;
      vm.inspect = Math.max(0, (vm.inspect || 0) - dt);
      const ins = vm.inspect > 0 ? Math.sin(Math.min(1, (2.4 - vm.inspect) / 2.4) * Math.PI) : 0;
      const h = vm.holder;
      // phones: a smaller gun, a little lower, so the middle of the screen stays clear
      const vs = settings.vmScale ?? 1;
      h.scale.setScalar(VM_SCALE * vs);
      const o0 = VM_OFFSET[p.kind] || VM_OFFSET.rifle;
      const o = vs < 1 ? [o0[0] + 0.012, o0[1] - 0.018, o0[2], o0[3]] : o0;
      h.position.set(
        o[0] + Math.sin(vm.bob) * 0.012 * bobAmt + vm.swayX,
        o[1] + Math.abs(Math.cos(vm.bob)) * 0.012 * bobAmt + vm.swayY - vm.draw * 0.25 - reloadK * 0.12 - p.crouchK * 0.01,
        o[2] + vm.kick * (knife ? (vm.stab ? -0.2 : -0.12) : 0.045) + pull * 0.09,
      );
      if (pull) h.position.y += pull * 0.05;
      if (ins) {
        h.position.x -= ins * 0.06;
        h.position.y += ins * 0.04;
        h.position.z += ins * 0.05;
      }
      // turned a little towards the centre so the side of the gun shows
      h.rotation.set(vm.kick * (knife ? -0.6 : 0.09) + reloadK * 0.6 - vm.draw * 0.8 + (knife ? 0.25 : 0.03) + pull * 0.45, (knife ? vm.kick * (vm.stab ? 0.1 : 0.5) + 0.35 : o[3] ?? 0.085), reloadK * 0.35 + (knife ? -0.5 : -0.04));
      if (ins) {
        h.rotation.y += ins * 1.1;
        h.rotation.z += ins * 0.5;
        h.rotation.x += ins * 0.25;
      }
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
    // people behind the camera are not drawn (skinned bodies have no bounds of their own, so three cannot tell)
    cam.updateMatrixWorld();
    this._pv ||= new THREE.Matrix4();
    this._fr ||= new THREE.Frustum();
    this._sph ||= new THREE.Sphere(new THREE.Vector3(), 1.4);
    this._pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this._fr.setFromProjectionMatrix(this._pv);
    const hidden = this._hidden || (this._hidden = []);
    hidden.length = 0;
    const cull = (o) => {
      const root = o.body?.root;
      if (!root) return;
      const dead = o.alive === false || o.state === 'dead';
      if (dead) this._sph.center.set(root.position.x, root.position.y + 0.5, root.position.z);
      else this._sph.center.set(o.x, (o.feet || 0) + 0.9, o.z);
      this._sph.radius = dead ? 2.3 : 1.4;
      const out = !this._fr.intersectsSphere(this._sph);
      o.body.culled = out;
      if (out && root.visible) {
        root.visible = false;
        hidden.push(root);
      }
    };
    for (const o of this.soldiers) cull(o);
    for (const o of this.hostages) cull(o);
    r.render(this.scene, cam);
    for (const root of hidden) root.visible = true;
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
    const order = this.variant === 'zombie' ? ['B', 'A'] : humans('A') <= humans('B') ? ['A', 'B'] : ['B', 'A'];
    for (const team of order) {
      const bots = this.soldiers.filter((s) => s.team === team && s.brain);
      if (!bots.length) continue;
      const s = bots.find((b) => !b.alive) || bots[0];
      s.brain = null;
      s.peer = peer;
      s.remote = true;
      s.name = name;
      s.netKind = null;
      s.nb = null;
      s.gunLevel = 0;
      s.kills = 0;
      s.deaths = 0;
      s.roundKills = 0;
      if (s.alive) this.vanish(s);
      if (this.mode === 'dm' && !(this.variant === 'zombie' && s.team === 'A')) s.respawnAt = this.time + 2;
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
    if (s.alive && (s.swimming || s.feet < -0.05)) {
      const c = this.map.nearestWalk(Math.floor(s.x), Math.floor(s.z));
      if (c >= 0) {
        s.x = (c % W) + 0.5;
        s.z = Math.floor(c / W) + 0.5;
        s.feet = this.map.h[c];
        s.swimming = false;
      }
    }
    s.brain = new Brain(s, this, this.opts.diff);
    s.brain.planRound();
    s.switchSlot(s.bestSlot(), true);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.vm.cam.aspect = w / h;
    this.vm.cam.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    if (this.fun.talk) window.speechSynthesis?.cancel();
    if (!this.opts.preview) setQuack(false);
    if (this.underwater) {
      setUnderwater(false);
      const el = document.getElementById('water-veil');
      if (el) el.style.opacity = '0';
    }
    this.smokes?.clear();
    this.fireplace?.dispose();
    this.toys?.dispose();
    if (this.arc) {
      this.arc.geometry.dispose();
      this.arc.material.dispose();
      for (const m of this.arcEnd.children) {
        m.geometry.dispose();
        m.material.dispose();
      }
    }
    this.rain?.dispose();
    this.chickens?.dispose();
    this.envRT?.dispose();
    const all = [];
    this.scene.traverse((o) => all.push(o));
    this.vm.scene.traverse((o) => all.push(o));
    for (const o of all) if (o.isInstancedMesh) o.dispose();
    for (const o of all) if (o.isSkinnedMesh) o.skeleton?.dispose();
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
    for (const o of all) {
      const u = o.material?.uniforms;
      if (u) for (const v of Object.values(u)) if (v?.value?.isTexture) v.value.dispose();
    }
    for (const v of Object.values(this.vm.cache || {})) v.geo?.dispose?.();
    this._heGeo?.dispose();
    this._flGeo?.dispose();
    for (const m of Object.values(this._nadeMat || {})) m.dispose();
    this.skyMesh?.material.map?.dispose();
  }
}
