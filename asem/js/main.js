import { clamp, wrap, overlap, store, el } from './util.js';
import { t, L, km, clock, getLang, setLang } from './i18n.js';
import { MAPS, CHAPTERS, CARS, PAINTS, FRIENDS, mapById } from './maps.js';
import { Track, SEG, PLAYER_Z, setCameraBack, PLAYER_W, BASE_MAX, KMH_AT_MAX, ROAD_W, GATE_AT, M_PER_SEG, CAR_W } from './track.js';
import { Renderer } from './render.js';
import { drawVehicle, VEHICLES } from './sprites.js';
import { sound, media, audioInit, setSound, holdAudio, engine, crashSound, beep, noise, fanfare, scream, bonk, horn, whistle, bleat, weddingHorn, cucaracha, splash, squeak, pops, crunch, neigh } from './audio.js';
import { music, playMusic, setMusic, pauseMusic } from './music.js';
import { online, getBoard, submit, flushPending, newGroupCode, boardId } from './scores.js';
import { pulse } from './pulse.js';
import { PORTAL, portalInit, portalLang, gameplay, happytime, onPortalMute } from './portal.js';

const STEP = 1 / 60;
const $ = (id) => document.getElementById(id);
const isTouch = window.matchMedia('(pointer: coarse)').matches;

// ---------- progress ----------

const progress = Object.assign({ stars: {}, times: {}, best: {}, paint: {}, ach: {}, stats: {}, styleBest: {}, car: 'hatch', map: 'city' }, store.get('asem.progress', {}));
for (const k of ['ach', 'stats', 'styleBest']) if (!progress[k]) progress[k] = {};
if (!progress.paint) progress.paint = {};
{
  // a friend's invite link: gamemetric.dev/asem/?group=code
  const invited = new URLSearchParams(location.search).get('group');
  if (invited && /^[a-z0-9]{4,12}$/i.test(invited)) {
    progress.group = invited.toLowerCase();
    store.set('asem.progress', progress);
  }
}
const oldBest = store.get('asem.best', 0);
if (oldBest && !progress.best.city) progress.best.city = oldBest;
const saveProgress = () => store.set('asem.progress', progress);

const totalStars = () => CHAPTERS.reduce((a, ch, i) => a + (progress.stars[i] || 0), 0);
const chapterOpen = (i) => i === 0 || (progress.stars[i - 1] || 0) > 0;
// free ride lets you pick any map; only the story goes in order
const mapOpen = () => true;
const carOpen = (car) => totalStars() >= car.stars;
const carColor = (car) => progress.paint[car.id] || car.color;
const currentCar = () => {
  let car = CARS.find((c) => c.id === progress.car) || CARS[0];
  if (!carOpen(car)) car = CARS[0];
  return { ...car, color: carColor(car) };
};

const tracks = {};
const getTrack = (id) => (tracks[id] ||= new Track(mapById(id)));

// ---------- game state ----------

const g = {
  mode: 'menu',
  kind: 'free',
  chapter: 0,
  map: null,
  track: null,
  position: 0,
  speed: BASE_MAX * 0.5,
  playerX: 0,
  steer: 0,
  braking: false,
  boosting: false,
  nitro: 0,
  distance: 0,
  timeLeft: 0,
  elapsed: 0,
  lap: 1,
  nextZone: 1,
  countdown: 0,
  parallax: 0,
  shake: 0,
  flash: 0,
  crashCool: 0,
  scrapeCool: 0,
  time: 0,
  endTimer: 0,
  autoLane: null,
  result: null,
  roll: 0,
  jolt: 0,
  splat: 0,
  style: 0,
  combo: 1,
  comboT: 0,
  clean: true,
  run: { near: 0, cops: 0 },
  gain: 0,
  gainUntil: 0,
  penUntil: 0,
  mud: null,
  lastPuddle: -1,
  rainWipe: 0,
  plowCool: 0,
  iceSound: 0,
  onIce: false,
  convoy: null,
  weaver: null,
};

const canvas = $('game');
const renderer = new Renderer(canvas);

function setMap(id) {
  if (g.map && g.map.id === id) return;
  g.map = mapById(id);
  g.track = getTrack(id);
  renderer.setMap(g.map);
  populate(99);
  applyOptions();
  if (audioUnlocked) playMusic(id, racingNow() ? 1 : 0);
  g.position = 0;
  g.playerX = g.track.lanes === 2 ? 0.5 : 0;
  g.autoLane = null;
}

// ---------- road options: three levels, or every switch by hand ----------
const OPTS = ['herds', 'police', 'bumps', 'ice', 'puddles', 'melons', 'tumble', 'wedding', 'weaver', 'walkers', 'props', 'talk'];
const LEVELS = {
  calm: [],
  fun: ['tumble', 'wedding', 'weaver', 'walkers', 'props', 'talk'],
  full: OPTS,
};
// everyone starts calm and switches the chaos on in the settings
const opts = Object.assign(Object.fromEntries(OPTS.map((k) => [k, false])), { shake: true, far: true }, store.get('asem.opts', {}));
const savedLevel = store.get('asem.level', null);
if (savedLevel && LEVELS[savedLevel]) for (const k of OPTS) opts[k] = LEVELS[savedLevel].includes(k);
function levelOf() {
  for (const [id, on] of Object.entries(LEVELS)) if (OPTS.every((k) => !!opts[k] === on.includes(k))) return id;
  return 'custom';
}
function setOpt(key, on) {
  opts[key] = on;
  store.set('asem.opts', opts);
  if (OPTS.includes(key)) store.set('asem.level', 'custom');
  applyOptions();
}
function setLevel(id) {
  for (const k of OPTS) opts[k] = LEVELS[id].includes(k);
  store.set('asem.opts', opts);
  store.set('asem.level', id);
  applyOptions();
}
// switched-off things vanish at once, even in the middle of a race
function applyOptions() {
  renderer.opts = opts;
  // the camera: keep the car where it is on the road, only the view moves
  const oldZ = PLAYER_Z;
  setCameraBack(opts.far ? 1.3 : 1);
  const T = g.track;
  if (T && PLAYER_Z !== oldZ) g.position = wrap(g.position - (PLAYER_Z - oldZ), T.length);
  if (!T) return;
  for (const seg of T.segments) {
    for (const s of seg.sprites) {
      const cat = s.herd ? 'herds' : s.radar ? 'police' : s.def.tumble ? 'tumble' : s.def.walker ? 'walkers' : s.def.breakable ? 'props' : null;
      s.off = !!cat && !opts[cat];
    }
  }
  const ahead = Math.floor((g.position + PLAYER_Z) / SEG) + 120;
  if (!opts.wedding && g.convoy) {
    for (const c of g.convoy.cars) removeCar(c, T);
    g.convoy = null;
  } else if (opts.wedding && !g.convoy && T.map.wedding) g.convoy = addWedding(0, ahead);
  if (!opts.weaver && g.weaver) {
    removeCar(g.weaver, T);
    g.weaver = null;
  } else if (opts.weaver && !g.weaver && T.map.weaver) g.weaver = addWeaver();
  if (!opts.melons) {
    for (const c of T.cars.slice()) if (c.melon) removeCar(c, T);
    g.splat = 0;
  }
  if (!opts.puddles) g.mud = null;
}

function populate(seed) {
  g.track.spawnCars(seed);
  g.track.addFriends(FRIENDS, seed + 1);
  const trucks = g.track.cars.filter((c) => c.kind === 'truck' && c.dir > 0).slice(0, g.track.map.melonTrucks || 0);
  for (const c of trucks) {
    c.melonTruck = true;
    c.color = '#3f6d2e';
    c.dropT = 2 + Math.random() * 3;
  }
  g.convoy = g.track.map.wedding && opts.wedding ? addWedding(seed) : null;
  g.weaver = g.track.map.weaver && opts.weaver ? addWeaver() : null;
  g.travel = 0;
}

function moveCar(T, c, z) {
  const from = T.segAt(c.z);
  const i = from.cars.indexOf(c);
  if (i >= 0) from.cars.splice(i, 1);
  c.z = wrap(z, T.length);
  c.percent = (c.z % SEG) / SEG;
  T.segAt(c.z).cars.push(c);
}
function addCar(T, car) {
  car.percent = (car.z % SEG) / SEG;
  T.segAt(car.z).cars.push(car);
  T.cars.push(car);
  return car;
}

// a wedding convoy: white cars with ribbons and balloons, honking all the way
function addWedding(seed, at) {
  const T = g.track;
  const N = T.segments.length;
  const lane = T.lanes === 3 ? T.laneX[2] : T.laneX[1];
  const start = at != null ? at % N : 260 + ((seed * 7919) % Math.max(1, N - 600));
  // nobody else in that lane around it
  for (const c of T.cars.slice()) {
    if (c.friend || c.dir < 0 || Math.abs(c.offset - lane) > 0.3) continue;
    const i = Math.floor(c.z / SEG);
    if (i > start - 20 && i < start + 35) removeCar(c, T);
  }
  const convoy = { cars: [], done: false };
  const palettes = [['#ff4d6d', '#ffffff', '#ffd166'], ['#ffffff', '#ff8fbf', '#ffd166']];
  ['sedan', 'sedan', 'suv', 'sedan'].forEach((kind, k) => {
    convoy.cars.push(addCar(T, {
      offset: lane,
      z: ((start + (3 - k) * 4) % N) * SEG,
      speed: BASE_MAX * 0.4,
      dir: 1,
      kind,
      w: CAR_W * (VEHICLES[kind] ? VEHICLES[kind].scale : 1),
      color: k === 0 ? '#f6f6f3' : '#ebebe8',
      rel: null,
      wedding: convoy,
      lead: k === 0,
      balloons: palettes[k % 2],
    }));
  });
  return convoy;
}
function passWedding(c) {
  c.passed = true;
  const convoy = c.wedding;
  if (convoy.done || !convoy.cars.every((x) => x.passed)) return;
  convoy.done = true;
  renderer.burstConfetti();
  fanfare();
  award(600);
  unlock('wedding');
}
function popBalloons(c) {
  if (c.balloonT) return;
  c.balloonT = g.time;
  pops(5);
}

// the lane weaver: a black Lada with neon underneath and a musical horn
function addWeaver() {
  const T = g.track;
  return addCar(T, {
    offset: T.laneX[1],
    z: wrap(g.position + PLAYER_Z - SEG * 45, T.length),
    speed: BASE_MAX,
    dir: 1,
    kind: 'lada',
    w: CAR_W * (VEHICLES.lada ? VEHICLES.lada.scale : 1),
    color: '#121316',
    rel: null,
    weaver: true,
    hop: 1,
    seen: null,
  });
}
let tuneCool = 0;
function weaverAI(T, dt) {
  const c = g.weaver;
  tuneCool -= dt;
  if (!c) return;
  if (g.mode === 'countdown') {
    c.speed = 0;
    return;
  }
  const pz = g.position + PLAYER_Z;
  const rel = gap(c.z, pz, T.length);
  // it never goes away for long: from far ahead or far behind it comes back from behind
  if (rel > SEG * 260 || rel < -SEG * 160) {
    moveCar(T, c, pz - SEG * 30);
    c.seen = null;
    return;
  }
  // catches up fast, then dawdles in front of you
  c.speed = BASE_MAX * (rel < 0 ? 1.2 : rel < SEG * 60 ? 0.95 : 0.8);
  if (g.mode === 'play' && c.seen != null && c.seen < 0 && rel >= 0 && rel < SEG * 6 && tuneCool <= 0) {
    cucaracha();
    tuneCool = 8;
  }
  c.seen = rel;
  c.hop -= dt;
  const N = T.segments.length;
  const si = Math.floor(c.z / SEG);
  let blocked = rel < 0 && rel > -SEG * 10 && Math.abs(g.playerX - c.offset) < 0.45;
  for (let n = 1; n <= 6 && !blocked; n++) {
    for (const o of T.segments[(si + n) % N].cars) if (o !== c && o.dir > 0 && Math.abs(o.offset - c.offset) < 0.35) blocked = true;
  }
  if (c.hop <= 0 || (blocked && c.yieldTo == null)) {
    const lanes = T.laneX.filter((l) => Math.abs(l - c.offset) > 0.2 && (T.lanes === 3 || l > 0));
    if (lanes.length) c.yieldTo = lanes[Math.floor(Math.random() * lanes.length)];
    c.hop = 0.8 + Math.random() * 1.2;
  }
}

// friends change lanes around slower traffic, on two-lane roads only when the oncoming lane is clear
function friendsAI(T, dt) {
  const N = T.segments.length;
  for (const f of T.cars) {
    if (!f.friend) continue;
    if (g.mode === 'countdown') {
      f.speed = 0;
      continue;
    }
    const si = Math.floor(f.z / SEG);
    const find = (laneX, from, to, test) => {
      for (let n = from; n <= to; n++) {
        for (const c of T.segments[(si + n + N) % N].cars) {
          if (c !== f && Math.abs(c.offset - laneX) < 0.4 && test(c)) return c;
        }
      }
      return null;
    };
    const slow = (c) => c.dir > 0 && !c.friend && c.speed < f.base * 0.95;
    if (find(f.target, 0, 7, slow)) {
      for (const lane of T.laneX) {
        if (Math.abs(lane - f.target) < 0.1) continue;
        const clear = T.lanes === 2 && lane < 0
          ? !find(lane, 0, 60, (c) => c.dir < 0) && !find(lane, -2, 8, () => true)
          : !find(lane, -2, 10, () => true);
        if (clear) {
          f.target = lane;
          break;
        }
      }
    } else if (T.lanes === 2 && f.target < 0 && !find(T.laneX[1], -3, 8, () => true)) {
      f.target = T.laneX[1];
    }
    // rubber band: a friend far ahead eases off, one far behind catches up, so the race stays close
    const lead = (f.travel - g.travel) / SEG;
    const easy = g.kind === 'story' && g.chapter < 2 && lead > 30 ? 0.85 : 1;
    const want = f.base * easy * (g.mode !== 'play' ? 1 : lead > 90 ? 0.7 : lead > 30 ? 0.85 : lead < -60 ? 1.12 : 1);
    const front = find(f.offset, 0, 3, slow);
    if (front) f.speed = Math.max(front.speed, f.speed - BASE_MAX * 0.6 * dt);
    else if (f.speed > want) f.speed = Math.max(want, f.speed - BASE_MAX * 0.2 * dt);
    else f.speed = Math.min(want, f.speed + BASE_MAX * 0.2 * dt);
    const d = f.target - f.offset;
    f.offset += Math.sign(d) * Math.min(Math.abs(d), dt * 1.4);
    f.travel += f.speed * dt;
  }
}

const friendsAhead = () => g.track.cars.filter((c) => c.friend && c.travel > g.travel + PLAYER_Z).length;

// ---------- update ----------

const input = { left: false, right: false, brake: false, nitro: false };

function autopilot(T, pSeg) {
  const N = T.segments.length;
  const ahead = (laneX, range) => {
    for (let n = 1; n <= range; n++) {
      for (const c of T.segments[(pSeg.i + n) % N].cars) if (Math.abs(c.offset - laneX) < 0.4) return c;
    }
    return null;
  };
  const lanes = T.laneX;
  let target = g.autoLane ?? lanes[lanes.length - 1];
  if (ahead(target, 16)) {
    const alt = lanes.find((l) => l !== target && !ahead(l, 40));
    if (alt != null) target = alt;
  }
  if (T.lanes === 2 && target < 0 && !ahead(lanes[1], 24)) target = lanes[1];
  g.autoLane = target;
  g.steer = clamp((target - g.playerX) * 4, -1, 1);
  return ahead(g.playerX, 8);
}

// signed distance from b to a along the looped track
function gap(a, b, len) {
  let d = a - b;
  if (d > len / 2) d -= len;
  if (d < -len / 2) d += len;
  return d;
}

function update(dt) {
  const T = g.track;
  const N = T.segments.length;
  g.time += dt;
  const pSeg = T.segAt(g.position + PLAYER_Z);
  const st = currentCar().stats;
  const maxSpeed = BASE_MAX * st.speed * (g.boosting ? 1.22 : 1);
  const speedPct = g.speed / BASE_MAX;
  const dx = dt * 2 * speedPct * (0.85 + 0.15 * st.grip);
  const startPos = g.position;
  const pz0 = g.position + PLAYER_Z;

  friendsAI(T, dt);
  weaverAI(T, dt);
  if (hornCool > 0) hornCool -= dt;
  for (const c of T.cars) {
    c.z0 = c.z;
    if (c.yieldTo != null) {
      const d = c.yieldTo - c.offset;
      c.offset += Math.sign(d) * Math.min(Math.abs(d), dt * 1.2);
      if (Math.abs(d) < 0.01) c.yieldTo = null;
    }
    const before = T.segAt(c.z);
    c.z = wrap(c.z + dt * c.speed, T.length);
    c.percent = (c.z % SEG) / SEG;
    const after = T.segAt(c.z);
    if (before !== after) {
      before.cars.splice(before.cars.indexOf(c), 1);
      after.cars.push(c);
    }
  }

  g.position = wrap(g.position + dt * g.speed, T.length);

  const driving = g.mode === 'play';
  let blocker = null;
  // ?debug can let the menu autopilot drive a real race (tools/covers.mjs films the preview video that way)
  if (driving && g.autoDrive) {
    blocker = autopilot(T, pSeg);
    input.brake = !!(blocker && g.speed > blocker.speed);
  } else if (driving) g.steer = input.left && !input.right ? -1 : input.right && !input.left ? 1 : 0;
  else if (g.mode === 'menu') blocker = autopilot(T, pSeg);
  else g.steer = 0;
  // black ice: the wheel barely answers and the bends push the car out
  const ice = opts.ice && pSeg.ice && (g.mode === 'play' || g.mode === 'ending') && Math.abs(g.playerX - pSeg.ice.center) < pSeg.ice.half + 0.1;
  g.playerX += dx * g.steer * (ice ? 0.3 : 1);
  // the first two chapters teach the bends: they pull the car out half as hard
  const easy = g.kind === 'story' && g.chapter < 2 ? 0.5 : 1;
  g.playerX -= dx * speedPct * pSeg.curve * (0.3 / st.grip) * (ice ? 1.8 : easy);
  if (ice) {
    g.playerX += Math.sin(g.time * 6) * dt * 0.25 * speedPct;
    if (g.time > g.iceSound) {
      noise(0.25, 0.06, 3200);
      g.iceSound = g.time + 0.4;
    }
    if (!g.onIce && (progress.stats.ice = (progress.stats.ice || 0) + 1) >= 10) unlock('ice');
  }
  g.onIce = !!ice;

  g.braking = driving && input.brake;
  g.boosting = driving && input.nitro && g.nitro > 0;
  if (g.boosting) g.nitro = Math.max(0, g.nitro - dt * 0.33);
  const accel = (BASE_MAX / 5) * st.accel * (g.boosting ? 1.8 : 1);
  if (g.mode === 'countdown') g.speed -= BASE_MAX * 0.4 * dt;
  else if (['ending', 'finish', 'done', 'over', 'fail'].includes(g.mode)) g.speed -= BASE_MAX * 0.35 * dt;
  else if (g.braking) g.speed -= BASE_MAX * dt;
  else if (g.mode === 'menu' && (g.speed > BASE_MAX * 0.55 || (blocker && g.speed > blocker.speed))) g.speed -= (BASE_MAX / 4) * dt;
  else if (g.speed > maxSpeed) g.speed -= (BASE_MAX / 3) * dt;
  else g.speed += accel * dt;

  if (g.mode === 'play' || g.mode === 'ending') {
    // guard rails hold the car on the road and scrape off some speed
    if (pSeg.rail && pSeg.rail * g.playerX > 1) {
      g.playerX = pSeg.rail;
      if (g.speed > BASE_MAX * 0.35) g.speed -= BASE_MAX * 0.8 * dt;
      g.shake = Math.max(g.shake, 0.25);
      if (g.scrapeCool <= 0) {
        noise(0.15, 0.1, 2600);
        g.scrapeCool = 0.25;
      }
    }
    // the kerb past the shoulder: the car never ends up inside the houses
    if (Math.abs(g.playerX) > 1.7) {
      g.playerX = Math.sign(g.playerX) * 1.7;
      g.shake = Math.max(g.shake, 0.25);
      if (g.scrapeCool <= 0) {
        noise(0.15, 0.1, 2600);
        g.scrapeCool = 0.25;
      }
    }
    if (g.playerX < -1 || g.playerX > 1) {
      const limit = (BASE_MAX / 3) * st.offroad;
      if (g.speed > limit) g.speed -= (BASE_MAX / 2 / st.offroad) * dt;
      for (const s of pSeg.sprites) {
        if (s.off || s.def.walker || s.def.breakable || s.def.cop || s.def.sheep) continue;
        const sw = (s.w || s.def.w) / ROAD_W;
        const center = s.offset + (s.offset > 0 ? sw / 2 : -sw / 2);
        if (overlap(g.playerX, PLAYER_W, center, sw * s.def.hit)) {
          crash();
          g.speed = BASE_MAX / 5;
          g.position = wrap(pSeg.p1.z - PLAYER_Z, T.length);
          break;
        }
      }
    }
    // at top speed the car covers more than a segment per frame, so check
    // every car whose gap to the player closed through zero during the frame
    const pz1 = g.position + PLAYER_Z;
    const reach = Math.ceil(wrap(g.position - startPos, T.length) / SEG) + 2;
    hit: for (let n = -2; n <= reach; n++) {
      for (const c of T.segments[wrap(pSeg.i + n, N)].cars) {
        const before = gap(c.z0 ?? c.z, pz0, T.length);
        const after = gap(c.z, pz1, T.length);
        if (Math.min(before, after) > SEG * 0.5 || Math.max(before, after) < -SEG * 0.5) continue;
        if (!overlap(g.playerX, PLAYER_W * 0.9, c.offset, (c.w / ROAD_W) * 0.9)) continue;
        if (c.melon) {
          hitMelon(c, T);
          break hit;
        }
        if (c.dir > 0 && g.speed > c.speed) {
          crash();
          if (c.wedding) popBalloons(c);
          g.speed = c.speed * (c.speed / g.speed);
          g.position = wrap(c.z - SEG * 0.4 - PLAYER_Z, T.length);
          // glance off to the freer side, so a player who does not steer is not stuck behind it
          const side = g.playerX === c.offset ? (c.offset > 0 ? -1 : 1) : Math.sign(g.playerX - c.offset);
          g.playerX = clamp(g.playerX + side * 0.3, -1, 1);
          c.rel = null;
          break hit;
        }
        if (c.dir < 0 && g.crashCool <= 0) {
          crash();
          g.speed = Math.min(g.speed, BASE_MAX * 0.12);
          g.playerX += g.playerX > c.offset ? 0.35 : -0.35;
          c.rel = null;
          break hit;
        }
      }
    }
  }

  funStuff(T, pSeg, dt);

  // close calls charge the nitro
  if (g.mode === 'play') {
    const pz = g.position + PLAYER_Z;
    for (const c of T.cars) {
      let rel = c.z - pz;
      if (rel > T.length / 2) rel -= T.length;
      if (rel < -T.length / 2) rel += T.length;
      if (c.melon) {
        c.rel = rel;
        continue;
      }
      if (c.rel != null && c.rel > 0 && rel <= 0 && rel > -SEG * 30) {
        if (c.wedding) passWedding(c);
        const lat = Math.abs(c.offset - g.playerX);
        if (c.friend) {
          g.nitro = Math.min(1, g.nitro + 0.1);
          say(c, 'tauntBehind');
          beep(990, 0.1, 'triangle', 0.08);
          award(300);
        } else if (lat < 0.72 && g.crashCool <= 0) {
          g.nitro = Math.min(1, g.nitro + (c.dir < 0 ? 0.3 : 0.22));
          beep(1250, 0.08, 'sine', 0.06);
          award(c.dir < 0 ? 250 : 150);
          g.run.near++;
          if (g.run.near >= 10) unlock('near10');
        } else if (lat < 1.5) {
          g.nitro = Math.min(1, g.nitro + 0.05);
          const pts = Math.round(40 * Math.floor(g.combo));
          g.style += pts;
          showGain(pts);
        }
      } else if (c.friend && c.rel != null && c.rel < 0 && rel >= 0 && rel < SEG * 30) {
        if (Math.random() < 0.5) say(c, 'tauntAhead');
      }
      c.rel = rel;
    }
  }

  g.playerX = clamp(g.playerX, -2.6, 2.6);
  g.speed = clamp(g.speed, 0, BASE_MAX * 1.4);

  // the camera leans into the bends
  const lean = -pSeg.curve * Math.min(1.3, g.speed / BASE_MAX) * 0.0085 + g.steer * 0.006 * Math.min(1, g.speed / BASE_MAX);
  g.roll += (lean - g.roll) * Math.min(1, dt * 3);
  if (g.jolt > 0) g.jolt = Math.max(0, g.jolt - dt * 4);
  if (g.splat > 0) g.splat = Math.max(0, g.splat - dt * 0.8);
  if (g.mode === 'play') {
    if (g.comboT > 0) {
      g.comboT -= dt;
      if (g.comboT <= 0) g.combo = 1;
    }
    const kmh = (g.speed / BASE_MAX) * KMH_AT_MAX;
    if (g.boosting && kmh > 200) g.style += 30 * dt * Math.floor(g.combo);
    if (kmh >= 280) unlock('speed');
    if (g.track.cars.length && friendsAhead() === 0 && g.elapsed > 3) unlock('all_friends');
  }
  g.parallax += pSeg.curve * (wrap(g.position - startPos, T.length) / SEG);

  if (g.mode === 'countdown') {
    const before = Math.ceil(g.countdown);
    g.countdown -= dt;
    if (Math.ceil(g.countdown) !== before && g.countdown > 0) {
      banner(String(Math.ceil(g.countdown)));
      beep(440, 0.12);
    }
    if (g.countdown <= 0) {
      g.mode = 'play';
      banner(t('goText'));
      beep(880, 0.25);
    }
  }

  if (g.mode === 'play' || g.mode === 'ending') {
    g.distance += ((g.speed / BASE_MAX) * KMH_AT_MAX) / 3.6 / 1000 * dt;
    // signed, so being pushed back after a crash counts too
    let moved = g.position - startPos;
    if (moved > T.length / 2) moved -= T.length;
    if (moved < -T.length / 2) moved += T.length;
    g.travel += moved;
  }
  if (g.mode === 'play') {
    // a story chapter never ends on the clock, the time only decides the stars
    if (g.kind !== 'story') g.timeLeft -= dt;
    g.elapsed += dt;
    const seg = T.segAt(g.position + PLAYER_Z);
    if (seg.zone === g.nextZone && (g.nextZone !== 0 || seg.i >= GATE_AT)) enterZone(seg.zone);
    if (g.mode === 'play' && g.kind !== 'story' && g.timeLeft <= 0) {
      g.timeLeft = 0;
      g.mode = 'ending';
      pulse(g.kind === 'story' ? 'fail' : 'timeout', g.pulseArg);
    }
  }
  if (g.mode === 'ending' && g.speed <= 0) {
    if (g.kind === 'story') showFail();
    else showOver();
  }
  if (g.mode === 'finish') {
    g.endTimer -= dt;
    if (g.endTimer <= 0) {
      g.mode = 'done';
      showFinish();
    }
  }

  if (g.crashCool > 0) g.crashCool -= dt;
  if (g.scrapeCool > 0) g.scrapeCool -= dt;
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 2.5);
  if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 3);
}

// people next to the road dive out of the way; cones, snowmen, inflatable men and melon stalls fly
const animating = new Set();
let screamCool = 0;
function funStuff(T, pSeg, dt) {
  const N = T.segments.length;
  screamCool -= dt;
  const racing = g.mode === 'play' || g.mode === 'ending';
  if (racing && g.speed > BASE_MAX * 0.2) {
    for (let n = 0; n <= 26; n++) {
      const seg = T.segments[(pSeg.i + n) % N];
      for (const s of seg.sprites) {
        if (!s.def.walker || s.dodge || s.off) continue;
        if (Math.abs(s.offset - g.playerX) > 0.62) continue;
        s.dodge = true;
        s.t0 = g.time;
        s.dir = s.offset > g.playerX ? 1 : -1;
        shout(s, s.shepherd ? t('shepherd') : pick(t('screams')), 1.4);
        animating.add(s);
        if (screamCool <= 0) {
          scream();
          screamCool = 0.35;
        }
      }
    }
    for (let n = 0; n <= 1; n++) {
      const seg = T.segments[(pSeg.i + n) % N];
      for (const s of seg.sprites) {
        if (!s.def.breakable || s.fly || s.off) continue;
        const sw = (s.w || s.def.w) / ROAD_W;
        const center = s.offset + (s.offset > 0 ? sw / 2 : -sw / 2);
        if (!overlap(g.playerX, PLAYER_W, center, sw * s.def.hit)) continue;
        s.fly = true;
        s.t0 = g.time;
        s.dir = center >= g.playerX ? 1 : -1;
        s.spin = (Math.random() * 6 + 4) * s.dir;
        animating.add(s);
        bonk(s.def.breakable);
        g.nitro = Math.min(1, g.nitro + 0.04);
        award({ tubeman: 120, snowman: 100, cone: 40, melons: 200 }[s.type] || 50);
        if (s.type === 'melons' && (progress.stats.melons = (progress.stats.melons || 0) + 1) >= 5) unlock('melons');
        if (s.type === 'tubeman' && (progress.stats.tubemen = (progress.stats.tubemen || 0) + 1) >= 10) unlock('tubeman');
        g.shake = Math.max(g.shake, 0.3);
        if (g.speed > BASE_MAX * 0.4) g.speed -= BASE_MAX * 0.04;
      }
    }
  }
  copsAndSheep(T, pSeg, dt);
  roadStuff(T, pSeg, dt);
  for (const s of animating) {
    const k = g.time - s.t0;
    if (s.fly) {
      s.offset = s.base + s.dir * k * 2.4;
      s.lift = Math.max(0, 3400 * k - 2400 * k * k);
      s.rot = s.spin * k;
      s.alpha = Math.max(0, Math.min(1, 1.8 - k));
      if (k > 1.8) {
        s.gone = true;
        animating.delete(s);
      }
    } else {
      // jump sideways, land on the back, get up and stand there shaking
      const p = Math.min(1, k / 0.45);
      s.offset = s.base + s.dir * 1.1 * (1 - (1 - p) * (1 - p));
      s.lift = Math.sin(p * Math.PI) * 420;
      s.rot = k < 1.4 ? s.dir * Math.min(1.45, p * 1.6) : s.dir * Math.max(0, 1.45 - (k - 1.4) * 2.4);
      if (k > 2.2) {
        s.rot = 0;
        s.lift = 0;
        if (s.def.sheep) {
          s.dodge = false;
          s.scatter = true;
          s.vx = 0;
          s.base = s.offset;
        }
        animating.delete(s);
      }
    }
  }
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// friends talk one at a time and not too often, or the screen fills up with bubbles
let talkUntil = 0;
function say(car, key, force = false) {
  if (!opts.talk || (!force && g.time < talkUntil)) return;
  car.say = pick(t(key));
  car.sayUntil = g.time + 1.8;
  talkUntil = g.time + 5;
}

// people and sheep: one bubble on screen at a time, the rest just scream or bleat
let crowdUntil = 0;
function shout(s, text, dur) {
  if (!opts.talk || g.time < crowdUntil) return;
  s.say = text;
  s.sayUntil = g.time + dur;
  crowdUntil = g.time + dur;
}

// the horn: people jump away early, slow cars ahead move over, friends answer back
let hornCool = 0;
function honk() {
  if (g.mode !== 'play' || hornCool > 0) return;
  hornCool = 0.6;
  horn();
  if ((progress.stats.honks = (progress.stats.honks || 0) + 1) >= 100) unlock('honk100');
  let scattered = 0;
  const T = g.track;
  const N = T.segments.length;
  const pSeg = T.segAt(g.position + PLAYER_Z);
  let answered = false;
  for (let n = 1; n <= 45; n++) {
    const seg = T.segments[(pSeg.i + n) % N];
    for (const s of seg.sprites) {
      if (n <= 30 && s.def.walker && !s.dodge && !s.off && Math.abs(s.offset - g.playerX) < 1.6) {
        s.dodge = true;
        s.t0 = g.time;
        s.dir = s.offset > g.playerX ? 1 : -1;
        shout(s, pick(t('screams')), 1.4);
        animating.add(s);
      }
    }
    for (const s of seg.sprites) {
      if (!s.def.sheep || s.scatter || s.dodge || s.off) continue;
      s.scatter = true;
      scattered++;
      s.vx = (s.offset >= 0 ? 1 : -1) * (2.2 + Math.random());
      shout(s, cry(s), 1);
    }
    if (n > 14) continue;
    for (const c of seg.cars) {
      if (c.melon) continue;
      if (c.dir < 0 || Math.abs(c.offset - g.playerX) > 0.5) continue;
      if (c.friend) {
        if (!answered) say(c, 'tauntHorn', true);
        answered = true;
        continue;
      }
      // move over to a free lane, or squeeze to the shoulder on a two-lane road
      const free = T.laneX.filter((l) => Math.abs(l - c.offset) > 0.3 && (T.lanes === 3 || l > 0));
      c.yieldTo = free.length ? free[0] : clamp(c.offset + 0.35, -0.9, 0.9);
    }
  }
  if (scattered >= 3) {
    award(150);
    if ((progress.stats.herds = (progress.stats.herds || 0) + 1) >= 3) unlock('shepherd');
  }
}

const KMH_LIMIT = 200;
const cry = (s) => t(s.def.horse ? 'neigh' : 'baa');
const call = (s) => (s.def.horse ? neigh() : bleat());
let bleatCool = 0;
function copsAndSheep(T, pSeg, dt) {
  const N = T.segments.length;
  bleatCool -= dt;
  const racing = g.mode === 'play' || g.mode === 'ending';
  g.radar = false;
  for (let n = -1; n <= 125; n++) {
    const seg = T.segments[(pSeg.i + n + N) % N];
    for (const s of seg.sprites) {
      if (s.off) continue;
      if (s.def.cop && !s.checked && n > 1) g.radar = true;
      if (s.def.cop && racing && !s.checked && n <= 1) {
        // the radar: faster than the limit costs time, at the limit earns a little nitro
        s.checked = true;
        const kmh = (g.speed / BASE_MAX) * KMH_AT_MAX;
        if (kmh > KMH_LIMIT) {
          if (opts.talk) {
            s.say = t('copStop');
            s.sayUntil = g.time + 2;
          }
          if (g.mode === 'play' && g.kind === 'story') g.elapsed += 3;
          else if (g.mode === 'play') g.timeLeft = Math.max(0, g.timeLeft - 3);
          // the timer itself shows the fine for a moment
          g.penUntil = g.time + 1.3;
          whistle();
          breakCombo();
          const lost = Math.min(g.style, 300);
          g.style -= lost;
          if (lost) showGain(-lost);
        } else {
          if (opts.talk) {
            s.say = t('copOk');
            s.sayUntil = g.time + 2;
          }
          g.nitro = Math.min(1, g.nitro + 0.12);
          award(200);
          if (++g.run.cops >= 2) unlock('legal');
        }
      }
      if (!s.def.sheep) continue;
      // sheep wander across the road until scared off
      if (s.dodge) continue;
      if (s.scatter) {
        if (Math.abs(s.offset) < 1.6) s.offset += s.vx * dt;
        else s.vx = 0;
      } else if (s.vx) {
        s.offset += s.vx * dt;
        if (Math.abs(s.offset) > 1.3) s.vx = -Math.sign(s.offset) * Math.abs(s.vx);
      }
      s.base = s.offset;
      if (racing && n <= 1 && g.crashCool <= 0 && overlap(g.playerX, PLAYER_W, s.offset, s.def.horse ? 0.26 : 0.16)) {
        // a sheep or a horse in the way: it jumps aside, the car nearly stops
        g.speed = Math.min(g.speed, BASE_MAX * 0.22);
        g.crashCool = 0.5;
        g.shake = Math.max(g.shake, 0.6);
        s.dodge = true;
        s.t0 = g.time;
        s.dir = s.offset >= g.playerX ? 1 : -1;
        shout(s, cry(s), 1.4);
        animating.add(s);
        call(s);
        breakCombo();
      } else if (racing && n > 1 && n < 30 && bleatCool <= 0 && Math.abs(s.offset - g.playerX) < 0.5 && Math.random() < 0.02) {
        shout(s, cry(s), 1);
        call(s);
        bleatCool = 1.2;
      }
    }
  }
}

// ---------- style points and combos ----------

function award(points, chain = true) {
  if (g.mode !== 'play') return;
  const pts = Math.round(points * Math.floor(g.combo));
  g.style += pts;
  // the multiplier grows by half a step per trick, so x8 takes a real streak
  if (chain) g.combo = Math.min(8, g.combo + 0.5);
  g.comboT = 3.5;
  showGain(pts);
  if (g.combo >= 8) unlock('combo8');
  if (g.style >= 50000) unlock('style10k');
}
// the points of the last second or so show as one small number under the style total
function showGain(pts) {
  g.gain = (g.time < g.gainUntil ? g.gain : 0) + pts;
  g.gainUntil = g.time + 1.3;
}
function breakCombo() {
  g.combo = 1;
  g.comboT = 0;
}

// ---------- achievements ----------

const ACH = ['first_finish', 'story_done', 'three_stars', 'all_friends', 'legal', 'shepherd', 'melons', 'tubeman', 'near10', 'combo8', 'speed', 'baursak', 'paint', 'honk100', 'style10k', 'splat', 'bump', 'wedding', 'tumble', 'wipers', 'ice'];
const achQueue = [];
let achShowing = false;
function unlock(id) {
  if (progress.ach[id]) return;
  progress.ach[id] = Date.now();
  saveProgress();
  if (id === 'story_done') happytime();
  achQueue.push(id);
  if (!achShowing) nextAch();
}
function nextAch() {
  const id = achQueue.shift();
  const box = $('achToast');
  if (!id) {
    achShowing = false;
    box.classList.remove('show');
    return;
  }
  achShowing = true;
  box.replaceChildren(el('small', '', t('achUnlocked')), el('b', '', t('ach_' + id)));
  box.classList.remove('show');
  void box.offsetWidth;
  box.classList.add('show');
  beep(784, 0.12);
  setTimeout(() => beep(1175, 0.18), 120);
  setTimeout(nextAch, 2600);
}

// ---------- baursaks, potholes, speed bumps, the melon truck ----------

let weddingCool = 0;
function roadStuff(T, pSeg, dt) {
  const racing = g.mode === 'play' || g.mode === 'ending';
  // the wipers squeak twice, then the glass is clean
  if (g.mud) {
    const k = g.time - g.mud.t0;
    if (!g.mud.up && k > 0.5) {
      g.mud.up = true;
      squeak();
    }
    if (!g.mud.down && k > 1) {
      g.mud.down = true;
      squeak();
    }
    if (k > 2.6) g.mud = null;
  }
  if (g.mode === 'play' && opts.puddles && !g.mud && g.map.weather && g.map.weather.rain && g.time > g.rainWipe) {
    rainScreen();
    g.rainWipe = g.time + 6 + Math.random() * 3;
  }
  // tailing a snowplow: its snow lands on the windscreen
  if (g.mode === 'play' && opts.puddles && !g.mud && g.time > g.plowCool) {
    const pz = g.position + PLAYER_Z;
    for (const c of T.cars) {
      if (c.kind !== 'plow') continue;
      const rel = gap(c.z, pz, T.length);
      if (rel > 0 && rel < SEG * 7 && Math.abs(c.offset - g.playerX) < 0.4) {
        splashScreen('slush');
        g.plowCool = g.time + 4;
        break;
      }
    }
  }
  weddingCool -= dt;
  if (g.mode === 'play' && g.convoy && weddingCool <= 0) {
    const rel = gap(g.convoy.cars[0].z, g.position + PLAYER_Z, T.length);
    if (rel > -SEG * 20 && rel < SEG * 70) {
      weddingHorn();
      weddingCool = 4.5;
    }
  }
  if (racing) {
    for (let n = 0; n <= 1; n++) {
      const seg = T.segments[(pSeg.i + n) % T.segments.length];
      for (const s of seg.sprites) {
        if (!s.def.pickup || s.gone || Math.abs(s.offset - g.playerX) > 0.3) continue;
        s.gone = true;
        g.nitro = Math.min(1, g.nitro + 0.15);
        award(100);
        beep(880, 0.06, 'sine', 0.08);
        setTimeout(() => beep(1320, 0.08, 'sine', 0.08), 60);
        if ((progress.stats.baursaks = (progress.stats.baursaks || 0) + 1) >= 20) unlock('baursak');
      }
    }
    // at top speed the car can skip a segment, so look at the one just passed too
    const prev = T.segments[(pSeg.i - 1 + T.segments.length) % T.segments.length];
    for (const seg of opts.puddles ? [prev, pSeg] : []) {
      const p = seg.puddle;
      if (!p || seg.i === g.lastPuddle || Math.abs(p.offset - g.playerX) > p.size + 0.15) continue;
      g.lastPuddle = seg.i;
      if ((g.speed / BASE_MAX) * KMH_AT_MAX > 50) splashScreen(p.kind);
    }
    tumbleweeds(T, pSeg, dt);
    if (opts.bumps && pSeg.hole && pSeg.i !== g.lastHole && Math.abs(pSeg.hole.offset - g.playerX) < 0.25) {
      g.lastHole = pSeg.i;
      g.shake = Math.max(g.shake, 0.7);
      g.jolt = 1;
      g.speed *= 0.93;
      noise(0.12, 0.25, 400);
    }
    if (opts.bumps && pSeg.bump && pSeg.i !== g.lastBump) {
      g.lastBump = pSeg.i;
      if ((g.speed / BASE_MAX) * KMH_AT_MAX > 120) {
        g.jolt = 1.8;
        g.shake = 1;
        g.speed *= 0.85;
        noise(0.2, 0.3, 500);
        unlock('bump');
      } else {
        g.jolt = 0.5;
      }
    }
    // the melon truck loses a watermelon now and then
    if (g.mode === 'play' && opts.melons) {
      const pz = g.position + PLAYER_Z;
      let melons = 0;
      for (const c of T.cars) if (c.melon) melons++;
      for (const c of T.cars) {
        if (!c.melonTruck) continue;
        let rel = c.z - pz;
        if (rel > T.length / 2) rel -= T.length;
        if (rel < -T.length / 2) rel += T.length;
        if (rel < SEG * 12 || rel > SEG * 90) continue;
        c.dropT -= dt;
        if (c.dropT > 0 || melons >= 8) continue;
        c.dropT = 1.6 + Math.random() * 2.4;
        const melon = { melon: true, kind: 'melon', dir: 1, offset: clamp(c.offset + (Math.random() - 0.5) * 0.3, -0.9, 0.9), z: wrap(c.z - SEG * 1.5, T.length), speed: c.speed * 0.35, w: 230, percent: 0, life: 9, roll: 0, drift: (Math.random() - 0.5) * 0.3, rel: null };
        T.cars.push(melon);
        T.segAt(melon.z).cars.push(melon);
        melons++;
      }
    }
  }
  for (const c of T.cars.slice()) {
    if (!c.melon) continue;
    c.life -= dt;
    c.offset = clamp(c.offset + c.drift * dt, -1.2, 1.2);
    c.roll += dt * 9;
    c.speed *= 1 - dt * 0.25;
    if (c.life <= 0) removeCar(c, T);
  }
}
// a puddle hits the windscreen: blobs all over, then the wipers
function splashScreen(kind) {
  const blobs = [];
  const n = kind === 'water' ? 16 : 11;
  for (let k = 0; k < n; k++) {
    const dots = [];
    for (let d = 0; d < 3; d++) dots.push([(Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 2.6, 0.18 + Math.random() * 0.25]);
    blobs.push({
      p: k % 2,
      a: 0.15 + Math.random() * (Math.PI - 0.3),
      r: 0.3 + Math.random() * 0.62,
      s: (kind === 'water' ? 0.025 : 0.04) + Math.random() * 0.05,
      dots,
      drip: Math.random() < 0.5 ? 1 + Math.random() * 2 : 0,
    });
  }
  g.mud = { t0: g.time, kind, blobs };
  splash();
  g.shake = Math.max(g.shake, 0.3);
  g.speed *= 0.97;
  if ((progress.stats.splashes = (progress.stats.splashes || 0) + 1) >= 5) unlock('wipers');
}

function rainScreen() {
  const blobs = [];
  for (let k = 0; k < 22; k++) {
    const dots = [[(Math.random() - 0.5) * 2, 1.2 + Math.random(), 0.3]];
    blobs.push({ p: k % 2, a: 0.12 + Math.random() * (Math.PI - 0.24), r: 0.25 + Math.random() * 0.7, s: 0.01 + Math.random() * 0.022, dots, drip: Math.random() < 0.3 ? 1.5 + Math.random() * 2 : 0, at: Math.random() * 0.45 });
  }
  g.mud = { t0: g.time, kind: 'water', blobs, rain: true };
}

// tumbleweeds sit on the shoulders until the car comes, then roll across bouncing
function tumbleweeds(T, pSeg, dt) {
  const N = T.segments.length;
  const racing = g.mode === 'play' || g.mode === 'ending';
  for (let n = 0; n <= 140; n++) {
    const seg = T.segments[(pSeg.i + n) % N];
    for (const s of seg.sprites) {
      if (!s.def.tumble || s.fly || s.gone || s.off) continue;
      s.offset += s.vx * dt;
      if (Math.abs(s.offset) > 2.1) s.vx = -Math.sign(s.offset) * Math.abs(s.vx);
      s.rot = (s.rot || 0) + s.vx * dt * 5;
      s.lift = Math.abs(Math.sin(g.time * 4 + s.phase)) * 220;
      if (!racing || n > 1 || !overlap(g.playerX, PLAYER_W, s.offset, 0.16)) continue;
      s.fly = true;
      s.t0 = g.time;
      s.base = s.offset;
      s.dir = s.offset >= g.playerX ? 1 : -1;
      s.spin = (Math.random() * 6 + 4) * s.dir;
      animating.add(s);
      crunch();
      award(60);
      g.speed *= 0.98;
      if ((progress.stats.tumbles = (progress.stats.tumbles || 0) + 1) >= 10) unlock('tumble');
    }
  }
}

function removeCar(c, T) {
  const i = T.cars.indexOf(c);
  if (i >= 0) T.cars.splice(i, 1);
  const seg = T.segAt(c.z);
  const k = seg.cars.indexOf(c);
  if (k >= 0) seg.cars.splice(k, 1);
}
function hitMelon(c, T) {
  removeCar(c, T);
  g.splat = 1.3;
  g.speed *= 0.9;
  g.shake = Math.max(g.shake, 0.5);
  bonk('splat');
  unlock('splat');
  award(80);
}

function enterZone(z) {
  const T = g.track;
  if (g.kind === 'story' && z === 0) {
    finish();
    return;
  }
  if (z === 0) g.lap++;
  const factor = g.kind === 'free' ? Math.pow(0.9, g.lap - 1) : 1;
  const bonus = Math.max(7, Math.round((T.zoneSeconds[z] + 3) * factor));
  if (g.kind !== 'story') g.timeLeft += bonus;
  if (g.clean) award(500);
  g.clean = true;
  banner(L(g.map.zones[z].name), g.kind === 'story' ? '' : (z === 0 ? t('lap', { n: g.lap }) + '  ' : '') + t('checkpoint', { s: bonus }));
  beep(660, 0.1);
  setTimeout(() => beep(990, 0.14), 110);
  g.nextZone = (z + 1) % T.zoneStart.length;
}

function crash() {
  if (g.crashCool > 0) return;
  breakCombo();
  g.clean = false;
  g.crashCool = 0.6;
  g.shake = 1;
  g.flash = 0.6;
  crashSound();
  if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) {
    try { navigator.vibrate(60); } catch { /* not allowed */ }
  }
}

function starsFor(time) {
  const ideal = g.track.segments.length / 58;
  return time <= ideal * 1.15 ? 3 : time <= ideal * 1.35 ? 2 : 1;
}

function finish() {
  g.mode = 'finish';
  pulse('finish', g.pulseArg);
  g.endTimer = 1.5;
  const stars = starsFor(g.elapsed);
  const prevTime = progress.times[g.chapter];
  g.result = { place: friendsAhead() + 1, stars, time: g.elapsed, best: prevTime == null || g.elapsed < prevTime, prevStars: progress.stars[g.chapter] || 0 };
  progress.stars[g.chapter] = Math.max(progress.stars[g.chapter] || 0, stars);
  if (g.result.best) progress.times[g.chapter] = g.elapsed;
  saveProgress();
  if (g.chapter === 0) unlock('first_finish');
  if (CHAPTERS.every((ch, i) => progress.stars[i])) unlock('story_done');
  if (stars === 3) unlock('three_stars');
  banner(t('finishTitle'));
  fanfare();
  if (stars >= 2 || g.result.place === 1) renderer.burstConfetti();
}

// ---------- start, pause, menus ----------

function startRace(opts) {
  audioInit();
  g.kind = opts.kind;
  g.chapter = opts.chapter ?? 0;
  const mapId = g.kind === 'story' ? CHAPTERS[g.chapter].map : opts.mapId;
  g.pulseArg = (g.kind === 'story' ? 'ch' + (g.chapter + 1) + ':' : '') + mapId;
  pulse('start', g.pulseArg);
  progress.map = mapId;
  saveProgress();
  setMap(mapId);
  const T = g.track;
  populate((Date.now() & 0xffff) + 1);
  T.resetDynamic();
  animating.clear();
  unlockAudio();
  playMusic(mapId, 1);
  for (const c of T.cars) c.rel = null;
  Object.assign(g, {
    position: 0,
    speed: 0,
    playerX: T.lanes === 2 ? 0.5 : 0,
    steer: 0,
    nitro: 0.25,
    distance: 0,
    elapsed: 0,
    lap: 1,
    nextZone: 1,
    timeLeft: T.zoneSeconds[0] + (g.kind === 'story' ? 10 : 12),
    countdown: 3,
    mode: 'countdown',
    crashCool: 0,
    result: null,
    style: 0,
    combo: 1,
    comboT: 0,
    clean: true,
    run: { near: 0, cops: 0 },
    gain: 0,
    gainUntil: 0,
    penUntil: 0,
    jolt: 0,
    splat: 0,
    lastHole: -1,
    lastBump: -1,
    lastPuddle: -1,
    mud: null,
    rainWipe: g.time + 5,
    plowCool: 0,
    onIce: false,
  });
  // the weaver starts behind the line, the race has just put the car back to zero
  if (g.weaver) {
    moveCar(T, g.weaver, PLAYER_Z - SEG * 30);
    g.weaver.seen = null;
  }
  g.last = opts;
  clearInputs();
  ui.replaceChildren();
  showHud(true);
  if (!g.autoDrive) showCoach();
  banner('3');
  beep(440, 0.12);
}

let pausedFrom = 'play';
function pause() {
  if (g.mode !== 'play' && g.mode !== 'countdown') return;
  pausedFrom = g.mode;
  g.mode = 'paused';
  pauseMusic(true);
  clearInputs();
  // a frozen frame should not keep shaking, flashing or streaking
  Object.assign(g, { shake: 0, flash: 0, boosting: false, braking: false });
  screenPause();
}
function resume() {
  if (g.mode !== 'paused') return;
  g.mode = pausedFrom;
  if (audioUnlocked) playMusic(g.map.id, racingNow() ? 1 : 0);
  ui.replaceChildren();
  showHud(true);
}

function toMenu(screen = screenMain) {
  if (!['menu'].includes(g.mode)) {
    g.mode = 'menu';
    if (g.track) {
      populate(99);
      g.track.resetDynamic();
      animating.clear();
    }
    g.speed = Math.max(g.speed, BASE_MAX * 0.3);
  }
  showHud(false);
  if (audioUnlocked) playMusic(g.map.id, 0);
  screen();
}

// browsers only allow sound after the first tap or key press
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audioInit();
  playMusic(g.map.id, racingNow() ? 1 : 0);
}
const racingNow = () => ['countdown', 'play', 'ending', 'finish'].includes(g.mode);
// iOS counts only touchend and click as a tap that may start sound, not pointerdown
for (const type of ['pointerdown', 'touchend', 'click']) {
  window.addEventListener(type, unlockAudio, { once: true });
  // wake the sound up again after the phone suspended it
  window.addEventListener(type, () => audioUnlocked && audioInit());
}
window.addEventListener('keydown', unlockAudio, { once: true });

// ---------- HUD ----------

const hud = { gain: $('hudGain'), style: $('hudStyle'), place: $('hudPlace'), root: $('hud'), speed: $('hudSpeed'), kmh: $('hudKmh'), dist: $('hudDist'), time: $('hudTime'), pace: $('hudPace'), zone: $('hudZone'), nitro: $('hudNitro') };
const cache = {};
function setText(key, node, value) {
  if (cache[key] === value) return;
  cache[key] = value;
  node.textContent = value;
}
// the first races show how to drive right on the road: keys on a computer, the two halves on a phone
const coachEl = $('coach');
let coachSteered = false;
function showCoach() {
  if ((progress.stats.coach || 0) >= 3) return;
  progress.stats.coach = (progress.stats.coach || 0) + 1;
  saveProgress();
  coachSteered = false;
  const key = (cap, label) => {
    const k = el('div', 'coach-key');
    k.append(el('b', '', cap), el('span', '', label));
    return k;
  };
  const half = (side) => {
    const h = el('div', 'coach-half ' + side);
    h.append(el('b', '', side === 'left' ? '◀︎' : '▶︎'), el('span', '', t('coachHold')));
    return h;
  };
  coachEl.className = 'coach ' + (isTouch ? 'touch' : 'keys');
  coachEl.replaceChildren(...(isTouch ? [half('left'), half('right')] : [key('← →', t('coachSteer')), key('↑', t('coachNitro')), key('↓', t('coachBrake'))]), el('p', 'coach-gas', t('coachGas')));
  coachEl.hidden = false;
}
function updateCoach() {
  if (coachEl.hidden) return;
  if (input.left || input.right) coachSteered = true;
  if (g.mode === 'play' && (g.elapsed > 7 || (coachSteered && g.elapsed > 3))) coachEl.classList.add('out');
  if (g.mode === 'play' && g.elapsed > 8) coachEl.hidden = true;
}

function showHud(on) {
  hud.root.hidden = !on;
  if (!on) coachEl.hidden = true;
  $('nitroBtn').hidden = !(on && isTouch);
  $('hornBtn').hidden = !(on && isTouch);
  for (const k of Object.keys(cache)) delete cache[k];
}
function updateHud() {
  if (hud.root.hidden) return;
  updateCoach();
  const T = g.track;
  setText('speed', hud.speed, String(Math.round((g.speed / BASE_MAX) * KMH_AT_MAX)));
  setText('kmh', hud.kmh, t('kmh'));
  if (g.kind === 'story') {
    const seg = T.segAt(g.position + PLAYER_Z);
    const left = g.nextZone === 0 && seg.zone === 0 && seg.i < GATE_AT ? GATE_AT - seg.i : T.segments.length - seg.i + GATE_AT;
    const leftKm = g.mode === 'finish' || g.mode === 'done' ? 0 : (left * M_PER_SEG) / 1000;
    setText('dist', hud.dist, t('toFinish', { d: km(leftKm) }));
  } else {
    setText('dist', hud.dist, `${km(g.distance)} ${t('km')}`);
  }
  const pen = g.time < g.penUntil && g.mode === 'play';
  const story = g.kind === 'story';
  if (story) setText('time', hud.time, pen ? t('pen') : clock(g.result ? g.result.time : g.elapsed).replace(/\.\d$/, ''));
  else setText('time', hud.time, pen ? t('pen') : g.timeLeft < 10 ? g.timeLeft.toFixed(1) : String(Math.ceil(g.timeLeft)));
  hud.time.classList.toggle('pen', pen);
  hud.time.classList.toggle('low', !story && g.timeLeft < 6 && g.mode === 'play');
  // story: the stars still in reach, a star goes dark once the clock passes its time
  const pace = story ? starsFor(g.result ? g.result.time : g.elapsed) : 0;
  if (cache.pace !== pace) {
    cache.pace = pace;
    hud.pace.replaceChildren(...(story ? [0, 1, 2].map((k) => el('i', k < pace ? 'on' : '', '★')) : []));
  }
  setText('zone', hud.zone, L(g.map.zones[Math.max(0, T.segAt(g.position + PLAYER_Z).zone)].name));
  // after the line the place is fixed, friends still coasting should not change it
  setText('place', hud.place, t('place', { n: g.result ? g.result.place : friendsAhead() + 1, m: FRIENDS.length + 1 }));
  setText('style', hud.style, `${t('styleLabel')} ${Math.round(g.style || 0).toLocaleString(getLang() === 'ru' ? 'ru-RU' : 'en-US')}${Math.floor(g.combo) > 1 ? ' ×' + Math.floor(g.combo) : ''}`);
  const gainOn = g.time < g.gainUntil && g.gain !== 0;
  setText('gain', hud.gain, gainOn ? (g.gain > 0 ? '+' : '−') + Math.abs(g.gain).toLocaleString(getLang() === 'ru' ? 'ru-RU' : 'en-US') : '');
  hud.gain.classList.toggle('minus', gainOn && g.gain < 0);
  const n = Math.round(g.nitro * 100);
  if (cache.nitro !== n) {
    cache.nitro = n;
    hud.nitro.style.transform = `scaleX(${g.nitro})`;
  }
  hud.root.classList.toggle('boost', g.boosting);
  hud.root.classList.toggle('radar', !!g.radar && (g.speed / BASE_MAX) * KMH_AT_MAX > KMH_LIMIT);
}

const bannerEl = $('banner');
function banner(big, small) {
  bannerEl.replaceChildren(el('b', '', big));
  if (small) bannerEl.append(el('span', '', small));
  bannerEl.classList.remove('show');
  void bannerEl.offsetWidth;
  bannerEl.classList.add('show');
}

// ---------- screens ----------

const ui = $('ui');

function panel(cls, ...children) {
  const p = el('section', 'panel ' + (cls || ''));
  p.append(...children.filter(Boolean));
  ui.replaceChildren(p);
  const first = p.querySelector('.btn.primary, .menu-item:not([disabled]), .card:not([disabled])');
  if (first && !isTouch) setTimeout(() => first.focus({ preventScroll: true }), 30);
  p.scrollTop = 0;
  return p;
}
function btn(label, cls, onClick) {
  const b = el('button', 'btn ' + (cls || ''), label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
function head(title, onBack, extra) {
  const h = el('div', 'panel-head');
  const back = el('button', 'back', '←');
  back.type = 'button';
  back.setAttribute('aria-label', t('back'));
  back.addEventListener('click', onBack);
  h.append(back, el('h2', '', title));
  if (extra) h.append(extra);
  return h;
}
function starsRow(n, of = 3) {
  const s = el('span', 'stars');
  s.setAttribute('aria-label', `${n} / ${of}`);
  for (let k = 0; k < of; k++) s.append(el('i', k < n ? 'on' : '', '★'));
  return s;
}
function langs() {
  const box = el('div', 'langs');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Language');
  for (const code of ['ru', 'en']) {
    const b = el('button', '', code.toUpperCase());
    b.type = 'button';
    b.setAttribute('aria-pressed', String(getLang() === code));
    b.addEventListener('click', () => {
      setLang(code);
      applyLang();
      screenMain();
    });
    box.append(b);
  }
  return box;
}

let currentScreen = null;
function screen(fn) {
  return (...args) => {
    currentScreen = () => fn(...args);
    fn(...args);
  };
}

const screenMain = screen(() => {
  const top = el('div', 'panel-top');
  const mus = el('button', 'chip-btn', music.on ? '♪ ' + t('musicOn') : '♪ ' + t('musicOff'));
  mus.type = 'button';
  mus.setAttribute('aria-pressed', String(music.on));
  mus.addEventListener('click', () => {
    unlockAudio();
    toggleMusic();
    screenMain();
  });
  const right = el('div', 'top-right');
  right.append(mus, langs());
  top.append(el('span', 'mark'), right);
  const doneAll = CHAPTERS.every((ch, i) => progress.stars[i]);
  const nextCh = CHAPTERS.findIndex((ch, i) => !progress.stars[i]);
  const menu = el('div', 'menu');
  const item = (title, sub, primary, onClick) => {
    const b = el('button', 'menu-item' + (primary ? ' primary' : ''));
    b.type = 'button';
    b.append(el('b', '', title), el('span', '', sub));
    b.addEventListener('click', onClick);
    return b;
  };
  const items = [
    item(t('story'), doneAll ? t('storyDoneSub', { s: totalStars(), m: CHAPTERS.length * 3 }) : t('storySub', { n: nextCh + 1, m: CHAPTERS.length }), true, () => screenChapters()),
    item(t('free'), t('freeSub'), false, () => screenMaps()),
    item(t('garage'), t('car_' + currentCar().id), false, () => screenGarage()),
    PORTAL ? null : item(t('records'), progress.group ? t('groupMine', { g: progress.group }) : t('recordsSub'), false, () => screenScores()),
    item(t('achievements'), t('achSub', { n: ACH.filter((id) => progress.ach[id]).length, m: ACH.length }), false, () => screenAchievements()),
    item(t('settings'), levelOf() === 'calm' ? t('settingsSubCalm') : t('settingsSub', { l: t('level_' + levelOf()) }), false, () => screenSettings()),
  ];
  menu.append(...items.filter(Boolean));
  // phones: the whole screen for the road; iPhone Safari cannot do it for pages, the home screen icon can
  if (!PORTAL && isTouch && !installed && canFull) menu.append(isFull() ? item(t('fullExit'), t('fullExitSub'), false, toggleFull) : item(t('full'), t('fullSub'), false, toggleFull));
  panel('main', top, el('h1', '', PORTAL ? 'Asem Road' : 'Әсем Жол'), el('p', 'tag', t('tag')), menu, !PORTAL && isTouch && !installed && !canFull ? el('p', 'keys', t('fullIosSub')) : null, el('p', 'keys', isTouch ? t('keysTouch') : t('keys')), PORTAL ? null : (() => {
    const a = el('a', 'more', t('more'));
    a.href = '../';
    return a;
  })(), (() => {
    // who made it and why
    const box = el('div', 'about');
    if (PORTAL) {
      box.append(el('p', '', t('aboutFun')));
      return box;
    }
    const link = el('a', '', 'temirlab.com');
    link.href = 'https://temirlab.com/';
    const made = el('p', '', t('madeBy') + ' ');
    made.append(link);
    box.append(el('p', '', t('aboutFun')), made);
    return box;
  })());
});

const screenChapters = screen(() => {
  const list = el('div', 'cards');
  CHAPTERS.forEach((ch, i) => {
    const open = chapterOpen(i);
    const card = el('button', 'card');
    card.type = 'button';
    if (!open) card.setAttribute('disabled', '');
    const img = el('img');
    img.alt = '';
    img.src = thumb(ch.map);
    const body = el('span', 'card-body');
    body.append(el('small', '', t('chapter', { n: i + 1 })), el('b', '', L(ch.title)));
    if (open) body.append(starsRow(progress.stars[i] || 0));
    else body.append(el('span', 'lock', t('lockedChapter', { n: i })));
    card.append(img, body);
    if (open) card.addEventListener('click', () => screenStory(i));
    list.append(card);
  });
  const total = el('span', 'head-note', t('starsTotal', { n: totalStars(), m: CHAPTERS.length * 3 }));
  panel('wide', head(t('story'), () => screenMain(), total), list, CHAPTERS.every((c, i) => progress.stars[i]) ? el('p', 'note', t('storyEnd')) : null);
});

const screenStory = screen((i) => {
  const ch = CHAPTERS[i];
  setMap(ch.map);
  const img = el('img', 'hero-img');
  img.alt = '';
  img.src = thumb(ch.map);
  const goal = el('p', 'goal');
  goal.append(el('b', '', t('goal') + ': '), document.createTextNode(L(ch.goal)));
  const best = progress.times[i] != null ? el('p', 'best', `${clock(progress.times[i])}  `) : null;
  if (best) best.append(starsRow(progress.stars[i] || 0));
  panel('', head(t('chapter', { n: i + 1 }), () => screenChapters()), img, el('h2', 'story-title', L(ch.title)), el('p', 'tag', L(ch.intro)), goal, best, btn(t('go'), 'primary', () => startRace({ kind: 'story', chapter: i })));
});

const screenMaps = screen(() => {
  const list = el('div', 'cards');
  MAPS.forEach((m) => {
    const open = mapOpen(m.id);
    const card = el('button', 'card');
    card.type = 'button';
    if (!open) card.setAttribute('disabled', '');
    const img = el('img');
    img.alt = '';
    img.src = thumb(m.id);
    const body = el('span', 'card-body');
    body.append(el('b', '', L(m.name)));
    if (open) body.append(el('span', 'best', progress.best[m.id] ? t('best', { d: km(progress.best[m.id]) }) : t('noBest')));
    else body.append(el('span', 'lock', t('lockedChapter', { n: CHAPTERS.findIndex((c) => c.map === m.id) })));
    card.append(img, body);
    if (open) card.addEventListener('click', () => startRace({ kind: 'free', mapId: m.id }));
    list.append(card);
  });
  panel('wide', head(t('free'), () => screenMain()), list);
});

let garageView = null;
const screenGarage = screen(() => {
  const chosen = currentCar();
  const view = CARS.find((c) => c.id === garageView) || CARS.find((c) => c.id === chosen.id);
  const open = carOpen(view);
  const color = carColor(view);

  const show = el('div', 'showcase');
  const big = el('canvas', 'car-big');
  big.width = 520;
  big.height = 260;
  paintCar(big, { ...view, color }, open);
  const info = el('div', 'car-body');
  info.append(el('b', '', t('car_' + view.id)), el('p', 'car-note', t('car_' + view.id + '_note')));
  const stats = el('dl', 'car-stats');
  for (const key of ['speed', 'accel', 'grip', 'offroad']) {
    const v = view.stats[key];
    const lvl = clamp(Math.round(key === 'offroad' ? 1 + v * 1.5 : key === 'accel' ? (v - 0.7) * 7 : (v - 0.7) * 10), 1, 5);
    const bar = el('dd', 'bar');
    for (let k = 0; k < 5; k++) bar.append(el('i', k < lvl ? 'on' : ''));
    stats.append(el('dt', '', t('stat_' + key)), bar);
  }
  info.append(stats);
  if (!open) {
    info.append(el('span', 'lock', t('lockedStars', { n: view.stars })));
  } else {
    const paints = el('div', 'paints');
    paints.setAttribute('role', 'group');
    paints.setAttribute('aria-label', t('paint'));
    PAINTS.forEach((p, k) => {
      const b = el('button', 'paint' + (p === color ? ' on' : ''));
      b.type = 'button';
      b.style.background = p;
      b.setAttribute('aria-label', t('paint') + ' ' + (k + 1));
      b.setAttribute('aria-pressed', String(p === color));
      b.addEventListener('click', () => {
        progress.paint[view.id] = p;
        if (p !== view.color) unlock('paint');
        progress.car = view.id;
        saveProgress();
        screenGarage();
      });
      paints.append(b);
    });
    info.append(el('span', 'paint-label', t('paint')), paints);
    if (chosen.id === view.id) info.append(el('span', 'picked', t('selected')));
    else info.append(btn(t('choose'), 'primary', () => {
      progress.car = view.id;
      saveProgress();
      screenGarage();
    }));
  }
  show.append(big, info);

  const grid = el('div', 'car-grid');
  for (const car of CARS) {
    const tile = el('button', 'car-tile' + (car.id === view.id ? ' viewing' : '') + (car.id === chosen.id ? ' chosen' : ''));
    tile.type = 'button';
    const cv = el('canvas');
    cv.width = 200;
    cv.height = 110;
    paintCar(cv, { ...car, color: carColor(car) }, carOpen(car));
    tile.append(cv, el('span', '', t('car_' + car.id)));
    if (!carOpen(car)) tile.append(el('small', 'lock', car.stars + ' ★'));
    tile.addEventListener('click', () => {
      garageView = car.id;
      if (carOpen(car)) {
        progress.car = car.id;
        saveProgress();
      }
      screenGarage();
    });
    grid.append(tile);
  }
  panel('wide', head(t('garage'), () => { garageView = null; screenMain(); }, el('span', 'head-note', t('starsTotal', { n: totalStars(), m: CHAPTERS.length * 3 }))), show, grid);
});

function paintCar(cv, car, open) {
  const c = cv.getContext('2d');
  const g2 = c.createLinearGradient(0, 0, 0, cv.height);
  g2.addColorStop(0, '#141a2e');
  g2.addColorStop(1, '#2a3047');
  c.fillStyle = g2;
  c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#3b404c';
  c.beginPath();
  c.moveTo(cv.width * 0.3, cv.height * 0.55);
  c.lineTo(cv.width * 0.7, cv.height * 0.55);
  c.lineTo(cv.width, cv.height);
  c.lineTo(0, cv.height);
  c.closePath();
  c.fill();
  const v = VEHICLES[car.kind];
  const w = cv.width * 0.56;
  const h = w * v.ratio;
  c.globalAlpha = open ? 1 : 0.35;
  drawVehicle(c, (cv.width - w) / 2, cv.height * 0.92 - h, w, h, car.kind, car.color, { lights: 1 });
  c.globalAlpha = 1;
}

// ---------- leaderboard ----------

let scoreBoard = 'ch0';
let scoreGroup = 'all';
let boardToken = 0;

function npcEntries(board) {
  if (!board.startsWith('ch')) return [];
  const ch = CHAPTERS[Number(board.slice(2))];
  const segs = getTrack(ch.map).segments.length;
  return FRIENDS.map((f, k) => ({ name: L(f.name), value: Math.round((segs / (60 * (0.695 + k * 0.025)) + 4) * 10) / 10, color: f.color, model: L(f.model), npc: true }));
}

function boardValue(board, v) {
  return board.startsWith('ch') ? clock(v) : `${km(v)} ${t('km')}`;
}

function fillBoard(table, board, entries) {
  const asc = board.startsWith('ch');
  const rows = [...entries, ...npcEntries(board)].sort((a, b) => (asc ? a.value - b.value : b.value - a.value)).slice(0, 20);
  table.replaceChildren();
  rows.forEach((e, k) => {
    const me = progress.nick && !e.npc && e.name.toLowerCase() === progress.nick.toLowerCase();
    const li = el('li', 'row-entry' + (me ? ' me' : '') + (e.npc ? ' npc' : ''));
    const dot = el('i', 'dot');
    dot.style.background = e.color || '#888';
    const name = el('span', 'who', e.name);
    if (e.npc) name.append(el('small', '', e.model + ', ' + t('bot')));
    if (me) name.append(el('small', '', t('you')));
    li.append(el('b', 'pos', String(k + 1)), dot, name, el('span', 'val', boardValue(board, e.value)));
    table.append(li);
  });
  if (!rows.length) table.append(el('li', 'empty', t('boardEmpty')));
}

const screenScores = screen(() => {
  const chip = (label, active, onClick) => {
    const b = el('button', 'chip' + (active ? ' on' : ''), label);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(active));
    b.addEventListener('click', onClick);
    return b;
  };
  if (scoreGroup !== 'all' && scoreGroup !== progress.group) scoreGroup = 'all';
  const groups = el('div', 'chips');
  groups.append(chip(t('groupAll'), scoreGroup === 'all', () => { scoreGroup = 'all'; screenScores(); }));
  if (progress.group) groups.append(chip(t('groupMine', { g: progress.group }), scoreGroup === progress.group, () => { scoreGroup = progress.group; screenScores(); }));
  else groups.append(chip(t('groupCreate'), false, () => {
    progress.group = newGroupCode();
    saveProgress();
    scoreGroup = progress.group;
    screenScores();
  }));
  const boards = el('div', 'chips boards');
  CHAPTERS.forEach((ch, i) => boards.append(chip(t('chapterShort', { n: i + 1 }), scoreBoard === 'ch' + i, () => { scoreBoard = 'ch' + i; screenScores(); })));
  MAPS.forEach((m) => boards.append(chip(L(m.name), scoreBoard === 'free-' + m.id, () => { scoreBoard = 'free-' + m.id; screenScores(); })));

  const table = el('ol', 'board');
  const status = el('p', 'board-note', '');
  fillBoard(table, scoreBoard, []);
  if (online()) {
    const token = ++boardToken;
    status.textContent = t('boardLoading');
    getBoard(scoreBoard, scoreGroup).then((res) => {
      if (token !== boardToken) return;
      status.textContent = '';
      fillBoard(table, scoreBoard, res.entries || []);
    }).catch(() => {
      if (token === boardToken) status.textContent = t('boardError');
    });
  } else {
    status.textContent = t('boardOffline');
  }

  const nameBox = el('div', 'name-box');
  const label = el('label', '', t('yourName'));
  label.htmlFor = 'nickInput';
  const input = el('input');
  input.id = 'nickInput';
  input.maxLength = 16;
  input.autocomplete = 'nickname';
  input.value = progress.nick || '';
  const saved = el('span', 'note', '');
  const saveBtn = btn(t('save'), '', () => {
    const v = input.value.replace(/\s+/g, ' ').trim().slice(0, 16);
    if (v.length < 2) { saved.textContent = t('nameHint'); return; }
    progress.nick = v;
    saveProgress();
    saved.textContent = t('saved');
  });
  const line = el('div', 'row');
  line.append(input, saveBtn);
  nameBox.append(label, line, el('small', 'hint', t('nameHint')), saved);

  let invite = null;
  if (progress.group) {
    invite = el('div', 'row');
    const note = el('p', 'note', '');
    invite.append(btn(t('groupInvite'), 'primary', async () => {
      const link = `https://gamemetric.dev/asem/?group=${progress.group}`;
      try {
        if (navigator.share) await navigator.share({ title: 'Әсем Жол', text: t('groupMine', { g: progress.group }), url: link });
        else {
          await navigator.clipboard.writeText(link);
          note.textContent = t('groupLink');
        }
      } catch {
        note.textContent = link;
      }
    }), btn(t('groupLeave'), 'ghost', () => {
      progress.group = null;
      saveProgress();
      scoreGroup = 'all';
      screenScores();
    }), note);
  }
  panel('wide', head(t('records'), () => screenMain()), groups, boards, table, status, nameBox, invite);
});

// sends a result after a race; asks for a name the first time
function scoreBox(board, value) {
  if (!online() || PORTAL) return null;
  const box = el('div', 'send-box');
  const status = el('p', 'note', '');
  const send = async (name) => {
    status.textContent = t('sending');
    try {
      const car = currentCar();
      const res = await submit({ b: board, g: progress.group || 'all', name, value, car: car.id, color: car.color });
      const all = res.results.all;
      let text = all && all.rank ? t('sent', { n: all.rank }) : t('sentOff');
      const grp = progress.group && res.results[progress.group];
      if (grp && grp.rank) text += ', ' + t('sentGroup', { n: grp.rank });
      status.textContent = text;
    } catch {
      status.textContent = t('sendFail');
    }
  };
  if (progress.nick) {
    box.append(status);
    send(progress.nick);
    return box;
  }
  const input = el('input');
  input.maxLength = 16;
  input.placeholder = t('yourName');
  input.setAttribute('aria-label', t('yourName'));
  const go = btn(t('send'), 'primary', () => {
    const v = input.value.replace(/\s+/g, ' ').trim().slice(0, 16);
    if (v.length < 2) { status.textContent = t('nameHint'); return; }
    progress.nick = v;
    saveProgress();
    line.remove();
    send(v);
  });
  const line = el('div', 'row');
  line.append(input, go);
  box.append(el('small', 'hint', t('yourName')), line, status);
  return box;
}

const screenAchievements = screen(() => {
  const list = el('div', 'ach-list');
  for (const id of ACH) {
    const done = !!progress.ach[id];
    const row = el('div', 'ach' + (done ? ' done' : ''));
    row.append(el('span', 'ach-mark', done ? '✓' : ''), (() => {
      const box = el('div');
      box.append(el('b', '', t('ach_' + id)), el('p', '', t('achd_' + id)));
      return box;
    })());
    list.append(row);
  }
  panel('wide', head(t('achievements'), () => screenMain(), el('span', 'head-note', t('achSub', { n: ACH.filter((id) => progress.ach[id]).length, m: ACH.length }))), list);
});

const screenPause = screen(() => {
  const chips = el('div', 'level-chips');
  for (const id of Object.keys(LEVELS)) {
    const b = el('button', 'chip-btn', t('level_' + id));
    b.type = 'button';
    b.setAttribute('aria-pressed', String(levelOf() === id));
    b.addEventListener('click', () => {
      setLevel(id);
      screenPause();
    });
    chips.append(b);
  }
  const row = el('div', 'row');
  row.append(btn(t('resume'), 'primary', resume), btn(t('restart'), '', () => startRace(g.last)), btn(t('settings'), '', () => screenSettings(screenPause)), btn(t('menu'), 'ghost', () => toMenu()));
  panel('', el('h2', '', t('paused')), chips, row);
});

// road settings: pick a level, or flip single things
const screenSettings = screen((back = screenMain) => {
  const levels = el('div', 'levels');
  for (const id of Object.keys(LEVELS)) {
    const b = el('button', 'menu-item');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(levelOf() === id));
    b.append(el('b', '', t('level_' + id)), el('span', '', t('level_' + id + 'Sub')));
    b.addEventListener('click', () => {
      setLevel(id);
      screenSettings(back);
    });
    levels.append(b);
  }
  const toggle = (key) => {
    const b = el('button', 'opt');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(!!opts[key]));
    b.append(el('span', '', t('opt_' + key)), el('i'));
    b.addEventListener('click', () => {
      setOpt(key, !opts[key]);
      screenSettings(back);
    });
    return b;
  };
  const road = el('div', 'opt-list');
  road.append(...OPTS.filter((k) => k !== 'talk').map(toggle));
  const screenOpts = el('div', 'opt-list');
  screenOpts.append(toggle('talk'), toggle('shake'), toggle('far'));
  const note = levelOf() === 'custom' ? el('p', 'head-note', t('level_custom')) : null;
  panel('wide', head(t('settings'), () => back(), note), levels, el('p', 'opt-head', t('optRoad')), road, el('p', 'opt-head', t('optScreen')), screenOpts, el('p', 'keys', t('settingsNote')));
});

function showFinish() {
  showHud(false);
  playMusic(g.map.id, 0);
  const i = g.chapter;
  const ch = CHAPTERS[i];
  const r = g.result;
  const row = el('div', 'row');
  if (i + 1 < CHAPTERS.length) row.append(btn(t('next'), 'primary', () => toMenu(() => screenStory(i + 1))));
  row.append(...[btn(t('again'), i + 1 < CHAPTERS.length ? '' : 'primary', () => startRace(g.last)), PORTAL ? null : btn(t('share'), '', () => share()), btn(t('menu'), 'ghost', () => toMenu())].filter(Boolean));
  const note = el('p', 'note', '');
  note.id = 'shareNote';
  currentScreen = null;
  const sendBox = r.best ? scoreBox(boardId('story', i), Math.round(r.time * 100) / 100) : null;
  const styleLine = styleResult(boardId('story', i));
  // the stars land one by one, each with a higher chime
  const stars = starsRow(r.stars);
  stars.classList.add('pop');
  for (let k = 0; k < r.stars; k++) setTimeout(() => beep(784 * Math.pow(1.26, k), 0.3, 'triangle', 0.1), 250 + k * 280);
  panel('', el('h2', '', L(ch.title)), stars, el('p', 'over-dist', clock(r.time)), el('p', r.place === 1 ? 'record' : 'best', r.place === 1 ? t('firstPlace') : t('finishPlace', { n: r.place, m: FRIENDS.length + 1 })), r.best && progress.times[i] === r.time && r.prevStars ? el('p', 'record', t('record')) : null, styleLine, el('p', 'tag', L(ch.outro)), i + 1 === CHAPTERS.length ? el('p', 'note', t('storyEnd')) : null, sendBox, row, note);
}

function styleResult(board) {
  const pts = Math.round(g.style || 0);
  const isRecord = pts > (progress.styleBest[board] || 0);
  if (isRecord) {
    progress.styleBest[board] = pts;
    saveProgress();
  }
  const p = el('p', isRecord && pts > 0 ? 'record' : 'best', t('styleTotal', { n: pts.toLocaleString(getLang() === 'ru' ? 'ru-RU' : 'en-US') }));
  if (isRecord && pts > 0) p.append(document.createTextNode('  ' + t('styleRecord')));
  return p;
}

function showFail() {
  g.mode = 'fail';
  saveProgress();
  showHud(false);
  playMusic(g.map.id, 0);
  const row = el('div', 'row');
  row.append(btn(t('again'), 'primary', () => startRace(g.last)), btn(t('menu'), 'ghost', () => toMenu()));
  currentScreen = null;
  panel('', el('h2', '', t('failTitle')), el('p', 'tag', t('failText')), row);
}

function showOver() {
  g.mode = 'over';
  saveProgress();
  showHud(false);
  playMusic(g.map.id, 0);
  const id = g.map.id;
  const isRecord = g.distance > (progress.best[id] || 0) + 0.0001;
  if (isRecord) {
    progress.best[id] = g.distance;
    saveProgress();
  }
  const row = el('div', 'row');
  row.append(...[btn(t('again'), 'primary', () => startRace(g.last)), PORTAL ? null : btn(t('share'), '', () => share()), btn(t('menu'), 'ghost', () => toMenu())].filter(Boolean));
  const note = el('p', 'note', '');
  note.id = 'shareNote';
  currentScreen = null;
  const sendBox = isRecord && g.distance >= 0.2 ? scoreBox(boardId('free', id), Math.round(g.distance * 100) / 100) : null;
  const styleLine = styleResult(boardId('free', id));
  panel('', el('h2', '', t('overTitle')), el('p', 'over-label', `${L(g.map.name)}. ${t('overSub')}`), el('p', 'over-dist', `${km(g.distance)} ${t('km')}`), isRecord ? el('p', 'record', t('record')) : null, el('p', 'best', t('best', { d: km(progress.best[id]) })), styleLine, sendBox, row, note);
}

async function share() {
  const text = g.kind === 'story'
    ? t('shareStory', { c: L(CHAPTERS[g.chapter].title), n: g.result ? g.result.stars : 0 })
    : t('shareFree', { m: L(g.map.name), d: km(g.distance) });
  const url = 'https://gamemetric.dev/asem/';
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Әсем Жол', text, url });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }
  const note = $('shareNote');
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    if (note) note.textContent = t('copied');
  } catch {
    if (note) note.textContent = url;
  }
}

// ---------- map previews ----------

const thumbs = {};
function thumb(mapId) {
  if (thumbs[mapId]) return thumbs[mapId];
  const cv = document.createElement('canvas');
  const r = new Renderer(cv, { budget: 480 * 270 });
  const T = getTrack(mapId);
  r.resize(480, 270, 1);
  r.setMap(mapById(mapId));
  if (!T.cars.length) T.spawnCars(7);
  const at = T.zoneStart[Math.min(1, T.zoneStart.length - 1)] + 70;
  r.render({ track: T, position: at * SEG, playerX: T.lanes === 2 ? 0.5 : 0.2, speed: 0, steer: 0, braking: false, boosting: false, shake: 0, flash: 0, time: 1, dt: 0, parallax: 0, still: true, car: currentCar(), gateLabel: (seg) => L(mapById(mapId).zones[seg.gate - 1].gate) });
  thumbs[mapId] = cv.toDataURL('image/jpeg', 0.82);
  return thumbs[mapId];
}

// ---------- input ----------

const keys = new Set();
const pointers = new Map();
let nitroTouch = false;
function clearInputs() {
  keys.clear();
  pointers.clear();
  nitroTouch = false;
  syncInput();
}
function syncInput() {
  let left = keys.has('left');
  let right = keys.has('right');
  let brake = keys.has('brake');
  let touchLeft = false;
  let touchRight = false;
  for (const side of pointers.values()) {
    if (side === 'left') touchLeft = true;
    else touchRight = true;
  }
  if (touchLeft && touchRight) brake = true;
  else if (touchLeft) left = true;
  else if (touchRight) right = true;
  input.left = left;
  input.right = right;
  input.brake = brake;
  input.nitro = keys.has('nitro') || nitroTouch;
  $('nitroBtn').classList.toggle('on', nitroTouch);
}
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'brake', KeyS: 'brake', Space: 'brake',
  ArrowUp: 'nitro', KeyW: 'nitro', ShiftLeft: 'nitro', ShiftRight: 'nitro',
};
const racing = () => g.mode === 'play' || g.mode === 'countdown';
window.addEventListener('keydown', (e) => {
  // typing a name must not steer, honk or mute
  if (e.target.closest && e.target.closest('input, textarea')) return;
  if (KEYMAP[e.code] && racing()) {
    e.preventDefault();
    keys.add(KEYMAP[e.code]);
    syncInput();
    return;
  }
  // space held through the finish must not press the button that just got focus
  if (e.repeat && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    return;
  }
  if (e.code === 'KeyH' && racing()) {
    honk();
    return;
  }
  // Escape also leaves the portal's full screen, so there it is left alone
  if (e.code === 'KeyP' || (e.code === 'Escape' && !PORTAL)) {
    if (g.mode === 'paused') resume();
    else if (racing()) pause();
  } else if (e.code === 'KeyM') {
    toggleSound();
  }
});
window.addEventListener('keyup', (e) => {
  if (!KEYMAP[e.code]) return;
  if (keys.has(KEYMAP[e.code]) && !racing()) e.preventDefault();
  keys.delete(KEYMAP[e.code]);
  syncInput();
});
canvas.addEventListener('pointerdown', (e) => {
  if (!racing()) return;
  e.preventDefault();
  // keep getting this finger's moves and release even if it slides over a button
  try { canvas.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  pointers.set(e.pointerId, e.clientX < window.innerWidth / 2 ? 'left' : 'right');
  syncInput();
});
canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, e.clientX < window.innerWidth / 2 ? 'left' : 'right');
  syncInput();
});
const release = (e) => {
  if (!pointers.delete(e.pointerId)) return;
  syncInput();
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
const nitroBtn = $('nitroBtn');
nitroBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  nitroTouch = true;
  syncInput();
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  nitroBtn.addEventListener(type, () => {
    nitroTouch = false;
    syncInput();
  });
}
$('hornBtn').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  honk();
});
window.addEventListener('blur', clearInputs);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    pauseMusic(true);
    // the frame loop stops in a hidden tab, so the engine would hum on
    if (sound.ctx) sound.ctx.suspend().catch(() => {});
    return;
  }
  if (!audioUnlocked) return;
  audioInit();
  if (g.mode !== 'paused') playMusic(g.map.id, racingNow() ? 1 : 0);
});

function toggleSound() {
  setSound(!sound.on);
  $('muteBtn').textContent = sound.on ? t('soundOn') : t('soundOff');
}
$('pauseBtn').addEventListener('click', () => (g.mode === 'paused' ? resume() : pause()));
function toggleMusic() {
  setMusic(!music.on);
  // under the pause menu it starts on resume
  if (music.on && g.mode !== 'paused') playMusic(g.map.id, racingNow() ? 1 : 0);
  $('musicBtn').setAttribute('aria-pressed', String(music.on));
}
$('musicBtn').addEventListener('click', toggleMusic);

// ---------- full screen ----------
// on a phone the address bar eats a good part of the road
const docEl = document.documentElement;
// iPhone Safari has neither, only video goes full screen there
const canFull = !!((docEl.requestFullscreen && document.fullscreenEnabled) || (docEl.webkitRequestFullscreen && document.webkitFullscreenEnabled));
// opened from a home screen icon: already full screen
const installed = window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const FULL_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>';
const EXIT_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>';
function toggleFull() {
  try {
    if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else if (docEl.requestFullscreen) docEl.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    else docEl.webkitRequestFullscreen();
  } catch { /* the browser said no */ }
}
const fullBtn = $('fullBtn');
fullBtn.hidden = !canFull || installed || !!PORTAL;
fullBtn.addEventListener('click', (e) => {
  e.currentTarget.blur();
  toggleFull();
});
function labelFull() {
  const on = isFull();
  fullBtn.innerHTML = on ? EXIT_ICON : FULL_ICON;
  fullBtn.setAttribute('aria-label', on ? t('fullExit') : t('full'));
}
function syncFull() {
  labelFull();
  if (g.mode === 'menu' && ui.querySelector('.panel.main')) screenMain();
}
document.addEventListener('fullscreenchange', syncFull);
document.addEventListener('webkitfullscreenchange', syncFull);
$('muteBtn').addEventListener('click', toggleSound);

function applyLang() {
  document.documentElement.lang = getLang();
  document.title = t('title');
  // search engines read the English page (?lang=en) after the script runs
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = t('metaDesc');
  $('muteBtn').textContent = sound.on ? t('soundOn') : t('soundOff');
  $('pauseBtn').setAttribute('aria-label', t('pause'));
  $('musicBtn').setAttribute('aria-label', t('musicOn'));
  $('musicBtn').setAttribute('aria-pressed', String(music.on));
  nitroBtn.setAttribute('aria-label', t('nitroBtn'));
  $('hornBtn').textContent = t('horn');
  labelFull();
  for (const k of Object.keys(thumbs)) delete thumbs[k];
}

// ---------- loop ----------

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
// rebuilding the backdrops is slow, wait until the window stops changing
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 120);
});

const view = {
  get track() { return g.track; },
  get position() { return g.position; },
  get playerX() { return g.playerX; },
  get speed() { return g.speed; },
  get steer() { return g.steer; },
  get braking() { return g.braking || g.mode === 'ending'; },
  get boosting() { return g.boosting; },
  get shake() { return opts.shake ? g.shake : 0; },
  get flash() { return g.flash; },
  get time() { return g.time; },
  get parallax() { return g.parallax; },
  get still() { return g.mode === 'paused'; },
  get roll() { return opts.shake ? g.roll || 0 : 0; },
  get jolt() { return opts.shake ? g.jolt || 0 : 0; },
  get splat() { return g.splat || 0; },
  get mud() { return g.mud; },
  get playing() { return g.mode === 'play'; },
  get car() { return currentCar(); },
  dt: 0,
  gateLabel(seg) {
    const z = seg.gate - 1;
    if (g.kind === 'story' && z === 0 && g.mode !== 'menu') return g.nextZone === 0 || g.mode === 'finish' || g.mode === 'done' ? t('gateFinish') : t('gateStart');
    return L(g.map.zones[z].gate);
  },
};

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (g.mode !== 'paused') {
    acc += dt;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
  }
  view.dt = g.mode === 'paused' ? 0 : dt;
  renderer.render(view);
  updateHud();
  engine(g.speed / BASE_MAX, ['play', 'countdown', 'ending', 'finish'].includes(g.mode), g.boosting, currentCar().electric);
  gameplay(racingNow());
  requestAnimationFrame(frame);
}

setMap(mapOpen(progress.map) ? progress.map : 'city');
flushPending();
resize();
if (PORTAL) {
  await portalInit();
  const lang = portalLang();
  if (lang && !store.get('asem.lang', null) && !new URLSearchParams(location.search).get('lang')) setLang(lang);
  onPortalMute((muted) => holdAudio(muted));
}
applyLang();
// a new player on a portal goes straight to the first chapter: one tap and the race starts
const fresh = !Object.values(progress.stars).some(Boolean) && !Object.values(progress.best).some(Boolean);
if (PORTAL && fresh) toMenu(() => screenStory(0));
else toMenu();
pulse('open');
requestAnimationFrame(frame);

// ?audiodebug: the audio state on screen, to check sound on a phone without devtools
if (new URLSearchParams(location.search).has('audiodebug')) {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:99999;margin:0;padding:6px 8px;font:11px/1.35 monospace;color:#0f0;background:rgba(0,0,0,.75);pointer-events:none;white-space:pre-wrap;max-width:96vw';
  document.body.append(box);
  setInterval(() => {
    const c = sound.ctx;
    box.textContent = [
      'ctx: ' + (c ? c.state + ' ' + c.sampleRate + ' Hz' : 'none (tap the screen)'),
      'sound.on: ' + sound.on + (sound.held !== undefined ? '  held: ' + sound.held : ''),
      'audioSession: ' + (navigator.audioSession ? navigator.audioSession.type : 'no API'),
      'silent track: ' + (media.el ? (media.el.paused ? 'paused' : 'playing') : 'none') + (media.error ? ' (' + media.error + ')' : ''),
      'taps seen: ' + (window.__taps || 0),
      navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 120),
    ].join('\n');
  }, 400);
  for (const t of ['pointerdown', 'touchend', 'click']) window.addEventListener(t, () => (window.__taps = (window.__taps || 0) + 1));
}

// ?og renders a clean frame for the link preview image (og.png)
const params = new URLSearchParams(location.search);
if (params.has('og')) {
  document.body.classList.add('og');
  setMap(params.get('map') || 'city');
  g.position = (g.track.zoneStart[1] + 170) * SEG;
  const title = el('div', 'og-title');
  title.append(el('b', '', 'Әсем Жол'), el('span', '', t('tag').split(':')[0]));
  document.body.append(title);
}

if (params.has('debug')) {
  window.__asem = {
    g,
    progress,
    renderer,
    step(n = 60) {
      for (let k = 0; k < n; k++) update(STEP);
      view.dt = STEP;
      renderer.render(view);
      updateHud();
    },
    start: startRace,
    menu: toMenu,
    press(name, on) {
      if (on) keys.add(name);
      else keys.delete(name);
      syncInput();
    },
    screens: { screenMain, screenChapters, screenMaps, screenGarage, screenStory },
  };
}
