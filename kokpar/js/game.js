// Көкпар — игра: 3×3, мешок-серке, два казана, тартыс (перетягивание мешка на скаку), боты.
// ?debug — window.__kokpar; ?sim=N — N матчей ботов без картинки (проверка баланса); ?bots — игрок тоже бот.
import { THREE, P, renderer, scene, camera, rnd, canvasTex, loadModel, Horse, stepWorld, onResize, collide, pushOut, BOUNDS, riverDist, getProto } from './world.js';
import { Rider } from './rider.js';
import { initAudio, toggleMute, setListener, ambience, cheer, whip, grabSound } from './audio.js';

const SIM = Number(P.get('sim') || 0);
const MATCH_LEN = Number(P.get('len') || 180); // с
const GOAL_X = 52, KAZAN_R = 3.0, SCORE_R = KAZAN_R + 1.5; // к казану надо подъехать вплотную
const TUG_RANGE = 2.7, TUG_BREAK = 3.5, PICK_R = 1.8;
const TEAMS = [
  { name: 'Қызыл', color: '#b8262c', css: '#d23a3f', blanket: 0, attack: 1 },
  { name: 'Көк', color: '#2456a8', css: '#3b74d1', blanket: 1, attack: -1 },
];
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), Qt = new THREE.Quaternion();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = THREE.MathUtils.clamp;

// ---------- поле: казаны, флажки, разметка ----------
const SWAP = P.has('swap') ? -1 : 1; // ?swap — команды меняются сторонами (проверка перекоса)
const kazans = [-GOAL_X * SWAP, GOAL_X * SWAP].map((x, t) => {
  const g = new THREE.Group();
  g.position.set(x, 0, 0);
  const earth = new THREE.MeshLambertMaterial({
    map: canvasTex(256, 64, (c, w, h) => {
      c.fillStyle = '#8a6d45'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '60,45,28' : '170,140,95'},${Math.random() * 0.35})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 2); }
    }),
  });
  const mound = new THREE.Mesh(new THREE.CylinderGeometry(KAZAN_R * 0.82, KAZAN_R, 1.0, 40), earth);
  mound.position.y = 0.5; mound.castShadow = mound.receiveShadow = true;
  g.add(mound);
  const top = new THREE.Mesh(new THREE.CircleGeometry(KAZAN_R * 0.78, 40), new THREE.MeshLambertMaterial({ color: '#6b5132' }));
  top.rotation.x = -Math.PI / 2; top.position.y = 1.01; g.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(KAZAN_R * 0.82, 0.09, 8, 48), new THREE.MeshLambertMaterial({ color: TEAMS[t].color }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 1.02; g.add(rim);
  // флаг команды
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 5.5, 8), new THREE.MeshLambertMaterial({ color: '#d8cdb5' }));
  pole.position.set(0, 3.7, -KAZAN_R - 0.4); g.add(pole);
  const flagGeo = new THREE.PlaneGeometry(1.6, 1.0, 12, 4);
  flagGeo.translate(0.8, 0, 0);
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ color: TEAMS[t].color, side: THREE.DoubleSide }));
  flag.position.set(0, 5.9, -KAZAN_R - 0.4); g.add(flag);
  flag.userData.base = flagGeo.attributes.position.array.slice();
  scene.add(g);
  return { x, team: t, g, flag };
});
// флажки по краю поля
{
  const poleMat = new THREE.MeshLambertMaterial({ color: '#e9e2d0' });
  const flagMats = [new THREE.MeshLambertMaterial({ color: '#e8c33a', side: THREE.DoubleSide }), new THREE.MeshLambertMaterial({ color: '#f2efe6', side: THREE.DoubleSide })];
  const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), flagGeo = new THREE.PlaneGeometry(0.5, 0.32).translate(0.25, 0, 0);
  let k = 0;
  for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 16) for (const z of [-BOUNDS.z - 1.5, BOUNDS.z + 1.5]) {
    const p = new THREE.Mesh(poleGeo, poleMat); p.position.set(x, 0.8, z); scene.add(p);
    const f = new THREE.Mesh(flagGeo, flagMats[k++ % 2]); f.position.set(x, 1.45, z); scene.add(f);
  }
  for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 15.2) for (const x of [-BOUNDS.x - 1.5, BOUNDS.x + 1.5]) {
    const p = new THREE.Mesh(poleGeo, poleMat); p.position.set(x, 0.8, z); scene.add(p);
    const f = new THREE.Mesh(flagGeo, flagMats[k++ % 2]); f.position.set(x, 1.45, z); scene.add(f);
  }
}

// ---------- серке (мешок) ----------
const sackGeo = (() => {
  const g = new THREE.SphereGeometry(0.5, 18, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { // комковатый, вытянутый
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.08 * Math.sin(x * 9 + z * 5) + 0.06 * Math.sin(y * 11 + x * 3);
    p.setXYZ(i, x * 0.95 * n, y * 0.44 * n, z * 0.46 * n);
  }
  g.computeVertexNormals();
  return g;
})();
const sackMat = new THREE.MeshStandardMaterial({
  roughness: 1,
  map: canvasTex(128, 128, (c, w, h) => { // мешковина
    c.fillStyle = '#9a8460'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { c.fillStyle = 'rgba(70,55,35,0.35)'; c.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 3) { c.fillStyle = 'rgba(200,180,140,0.25)'; c.fillRect(x, 0, 1, h); }
  }, 2),
});
const sack = { mesh: new THREE.Group(), pos: new THREE.Vector3(0, 0.25, 0), vel: new THREE.Vector3(), carrier: null, flight: null };
{
  const body = new THREE.Mesh(sackGeo, sackMat);
  body.castShadow = true;
  sack.mesh.add(body);
  const rope = new THREE.MeshLambertMaterial({ color: '#4b3a26' });
  for (const x of [-0.25, 0.25]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 6, 16), rope); r.rotation.y = Math.PI / 2; r.position.x = x; r.scale.set(1, 1.05, 1); sack.mesh.add(r); }
  scene.add(sack.mesh);
}
// маркер над лежащим мешком: виден издалека
const sackMarker = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 4), new THREE.MeshBasicMaterial({ color: '#ffd23a' }));
sackMarker.rotation.x = Math.PI;
scene.add(sackMarker);

// кольца команд под конями
const ringGeo = new THREE.RingGeometry(1.15, 1.4, 40).rotateX(-Math.PI / 2);

// ---------- участники ----------
const ents = []; // { h, r, team, me, stamina, sprint, tugCD, pickCD, bot }
let me = null;
const AI_PLAYER = P.has('bots') || SIM > 0;

function makeEnt(team, idx, isMe) {
  const h = new Horse(team * 3 + idx, false);
  h.ai = false;
  // масть: у игрока гнедой; тоқым — цвет команды
  const r = new Rider(h, TEAMS[team].color);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: isMe ? '#ffffff' : TEAMS[team].css, transparent: true, opacity: isMe ? 0.75 : 0.45, depthWrite: false }));
  ring.position.y = 0.04;
  scene.add(ring);
  const e = { h, r, ring, team, me: isMe, stamina: 100, sprint: 0, tugCD: 0, pickCD: 0, stun: 0, reach: 0, reachSide: -1, bot: { role: 'fetch', tx: 0, tz: 0, react: 0 }, stats: { tugsWon: 0, goals: 0 } };
  if (h.blanket) h.blanket.material = blanketFor(team);
  return e;
}
const blanketCache = [];
function blanketFor(team) {
  // тоқым красный/синий: берём материал коня-образца нужного индекса из world (0 — красный, 1 — синий)
  if (!blanketCache[team]) {
    const probe = new Horse(TEAMS[team].blanket, false);
    blanketCache[team] = probe.blanket.material;
    probe.obj.parent.remove(probe.obj);
  }
  return blanketCache[team];
}

// ---------- матч ----------
const state = { phase: 'loading', t: 0, clock: MATCH_LEN, score: [0, 0], tug: null, lastGoal: -1, msgT: 0, events: [] };
function kickoff(first) {
  const slots = [[-22, -9], [-26, 0], [-22, 9]];
  ents.forEach((e) => {
    const [x, z] = slots[ents.filter((o) => o.team === e.team).indexOf(e)];
    const s = (e.team === 0 ? 1 : -1) * SWAP;
    e.h.obj.position.set(x * s, 0, z);
    e.h.yaw = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    e.h.v = 0; e.h.gait = 0; e.h.push.set(0, 0, 0);
    e.stamina = 100; e.tugCD = 0; e.pickCD = 0; e.stun = 0;
  });
  dropSack(new THREE.Vector3(0, 0.25, 0), new THREE.Vector3());
  state.tug = null;
  state.phase = 'countdown';
  state.t = first ? 3.2 : 2.2;
  banner(first ? '3' : 'Дайын!');
}
function dropSack(pos, vel) {
  sack.carrier = null; sack.flight = null; roleT = 0;
  sack.pos.copy(pos); sack.vel.copy(vel);
}
function giveSack(e) {
  sack.carrier = e; sack.flight = null; roleT = 0;
  e.pickCD = 0;
  state.events.push({ t: 'pick', team: e.team });
  if (!SIM) grabSound(e.h.obj.position.x, e.h.obj.position.z);
}
function goal(team, scorer) {
  state.score[team]++;
  scorer.stats.goals++;
  state.lastGoal = team;
  state.phase = 'goal';
  state.t = 2.8;
  const k = kazans[team === 0 ? 1 : 0];
  // мешок летит на казан
  sack.carrier = null;
  sack.flight = { from: sack.pos.clone(), to: new THREE.Vector3(k.x, 1.25, 0), t: 0 };
  banner(`ГОЛ! ${TEAMS[team].name}`, TEAMS[team].css);
  state.events.push({ t: 'goal', team });
  if (!SIM) cheer(team === me?.team);
}

// ---------- тартыс ----------
function canTug(att, car) {
  if (!car || att.team === car.team || att.tugCD > 0 || att.stun > 0 || state.tug) return false;
  return att.h.obj.position.distanceTo(car.h.obj.position) < TUG_RANGE;
}
function startTug(att) {
  state.tug = { att, car: sack.carrier, bar: 0, t: 0 };
  state.events.push({ t: 'tug' });
  if (!SIM && (att.me || sack.carrier.me)) banner('ТАРТЫС!', '#ffd23a', 0.9);
}
function tugPress(e) { // игрок жмёт «тарт»: дёргает мешок на себя
  const T = state.tug;
  if (!T) return;
  if (T.att === e) T.bar += 0.13;
  else if (T.car === e) T.bar -= 0.13;
}
function stepTug(dt) {
  const T = state.tug;
  if (!T) return;
  T.t += dt;
  const d = T.att.h.obj.position.distanceTo(T.car.h.obj.position);
  const pull = (e) => (e.me && !AI_PLAYER ? 0.42 : 0.42 + (e.team === 1 && !SIM ? DIFF.pull : 0) + (rnd() - 0.5) * 0.5) * (0.65 + 0.35 * e.stamina / 100);
  // всадники держат один мешок — кони сцеплены: не разбегаются, несущий притормаживает
  if (d > 2.3) {
    V.subVectors(T.car.h.obj.position, T.att.h.obj.position).setY(0).multiplyScalar((d - 2.3) / d * 0.5);
    T.att.h.obj.position.add(V); T.car.h.obj.position.sub(V);
  }
  T.att.h.v = Math.min(T.att.h.v, T.car.h.v + 0.5);
  T.bar += (pull(T.att) - pull(T.car) - GRIP) * dt; // несущий держит мешок под ногой — ему легче
  // обе лошади тянутся друг к другу — всадники наклоняются
  for (const [a, b] of [[T.att, T.car], [T.car, T.att]]) {
    V.subVectors(b.h.obj.position, a.h.obj.position);
    a.reach = 1;
    a.reachSide = Math.sign(Math.cos(a.h.yaw) * V.x - Math.sin(a.h.yaw) * V.z) || 1;
  }
  let winner = null;
  if (T.bar >= 1) winner = 'att';
  else if (T.bar <= -1) winner = 'car';
  else if (T.t > 3.6) winner = T.bar > 0.05 ? 'att' : 'car';
  if (!winner) return;
  state.tug = null;
  if (winner === 'att') {
    T.car.tugCD = 1.6; T.car.pickCD = 1.0; T.car.stun = 0.3;
    T.att.stats.tugsWon++;
    giveSack(T.att);
    if (!SIM && (T.att.me || T.car.me)) banner(T.att.me ? 'Тартып алдың!' : 'Тартып алды!', TEAMS[T.att.team].css, 1);
  } else {
    T.att.tugCD = 2.0; T.att.stun = 0.5;
    T.car.stats.tugsWon++;
    if (!SIM && (T.att.me || T.car.me)) banner(T.car.me ? 'Ұстап қалдың!' : 'Ұстап қалды', TEAMS[T.car.team].css, 1);
  }
  state.events.push({ t: 'tugEnd', winner });
}

// ---------- боты ----------
const GRIP = Number(P.get('grip') || 0.04);
const DIFF = { pull: Number(P.get('pull') || 0.06), react: 0.45 }; // соперники чуть сильнее в тартысе
let roleT = 0;
function assignRoles() {
  const carrier = sack.carrier;
  for (const team of [0, 1]) {
    const mine = ents.filter((e) => e.team === team);
    const own = kazans[team], foe = kazans[1 - team];
    const sp = carrier ? carrier.h.obj.position : sack.pos;
    const byDist = [...mine].sort((a, b) => a.h.obj.position.distanceTo(sp) - b.h.obj.position.distanceTo(sp));
    if (!carrier) byDist.forEach((e, i) => { e.bot.role = i < 2 ? 'fetch' : 'support'; });
    else if (carrier.team === team) byDist.forEach((e) => { e.bot.role = e === carrier ? 'carry' : 'escort'; });
    else byDist.forEach((e, i) => { e.bot.role = i < 2 ? 'chase' : 'guard'; });
    mine.forEach((e, i) => { e.bot.own = own; e.bot.foe = foe; e.bot.slot = i; });
  }
}
function think(e, dt) {
  const b = e.bot, p = e.h.obj.position;
  const carrier = sack.carrier;
  // роль могла устареть: мешок сменил хозяина между пересчётами
  if (!carrier && b.role !== 'fetch' && b.role !== 'support') b.role = 'fetch';
  else if (carrier && b.role === 'carry' && carrier !== e) b.role = carrier.team === e.team ? 'escort' : 'chase';
  else if (carrier && (b.role === 'escort' || b.role === 'chase' || b.role === 'guard') && (carrier.team === e.team) !== (b.role === 'escort')) b.role = carrier.team === e.team ? 'escort' : 'chase';
  else if (carrier === e) b.role = 'carry';
  let tx = 0, tz = 0, gait = 4, sprint = false;
  const fx = Math.sin(e.h.yaw), fz = Math.cos(e.h.yaw);
  if (b.role === 'fetch') {
    tx = sack.pos.x + sack.vel.x * 0.4; tz = sack.pos.z + sack.vel.z * 0.4;
    const d = Math.hypot(tx - p.x, tz - p.z);
    gait = d > 10 ? 4 : d > 4 ? 3 : 2;
  } else if (b.role === 'support') {
    const s = Math.sign(b.foe.x);
    tx = sack.pos.x + s * 12; tz = sack.pos.z + (b.slot - 1) * 8;
    gait = Math.hypot(tx - p.x, tz - p.z) > 6 ? 3 : 1;
  } else if (b.role === 'carry') {
    tx = b.foe.x; tz = 0;
    // объезд соперников впереди
    for (const o of ents) {
      if (o.team === e.team) continue;
      V.subVectors(o.h.obj.position, p);
      const d = V.length();
      if (d > 14) continue;
      const ahead = (V.x * fx + V.z * fz) / (d + 1e-3);
      if (ahead < -0.3) { if (d < 7) sprint = true; continue; }
      const side = Math.sign(fz * V.x - fx * V.z) || 1; // соперник слева(+)/справа(−)
      tx -= -fz * side * (14 - d) * 0.9; tz -= fx * side * (14 - d) * 0.9;
      if (d < 6) sprint = true;
    }
  } else if (b.role === 'escort') {
    const cp = carrier.h.obj.position, cy = carrier.h.yaw, s = b.slot % 2 ? 1 : -1;
    // идёт рядом с несущим со стороны ближайшего соперника — закрывает его
    tx = cp.x + Math.sin(cy) * 3 + Math.cos(cy) * 3 * s; tz = cp.z + Math.cos(cy) * 3 - Math.sin(cy) * 3 * s;
    gait = Math.hypot(tx - p.x, tz - p.z) > 4 ? 4 : 3;
  } else if (b.role === 'chase') {
    const cp = carrier.h.obj.position, cy = carrier.h.yaw;
    const side = Math.sign(Math.cos(cy) * (p.x - cp.x) - Math.sin(cy) * (p.z - cp.z)) || 1;
    // целимся в бок несущего, чуть впереди — чтобы встать стремя в стремя
    tx = cp.x + Math.sin(cy) * (carrier.h.v * 0.35 + 0.5) + Math.cos(cy) * 1.9 * side;
    tz = cp.z + Math.cos(cy) * (carrier.h.v * 0.35 + 0.5) - Math.sin(cy) * 1.9 * side;
    const d = Math.hypot(cp.x - p.x, cp.z - p.z);
    gait = 4; sprint = d > 4 && d < 16;
    if (canTug(e, carrier)) { b.react += dt; if (b.react > DIFF.react + rnd() * 0.4) { startTug(e); b.react = 0; } } else b.react = 0;
  } else if (b.role === 'guard') {
    const cp = carrier.h.obj.position;
    tx = b.own.x + (cp.x - b.own.x) * 0.3; tz = cp.z * 0.5;
    gait = Math.hypot(tx - p.x, tz - p.z) > 5 ? 4 : 2;
  }
  // не толпиться со своими
  for (const o of ents) {
    if (o === e || o.team !== e.team) continue;
    V.subVectors(p, o.h.obj.position);
    const d = V.length();
    if (d < 4 && d > 1e-3) { tx += (V.x / d) * (4 - d) * 2; tz += (V.z / d) * (4 - d) * 2; }
  }
  // не упираться в свой/чужой казан: обходим, если цель за ним
  for (const k of kazans) {
    if (b.role === 'carry' && k === b.foe) continue;
    V.set(k.x - p.x, 0, -p.z);
    const d = V.length();
    if (d < KAZAN_R + 6 && (V.x * fx + V.z * fz) > 0) { const s = Math.sign(fz * V.x - fx * V.z) || 1; tx += fz * s * 8; tz -= fx * s * 8; }
  }
  steerTo(e, tx, tz, gait);
  e.wantSprint = sprint;
}
function steerTo(e, tx, tz, gait) {
  const p = e.h.obj.position;
  const want = Math.atan2(tx - p.x, tz - p.z), d = wrap(want - e.h.yaw);
  e.h.steer = clamp(d * 2.4, -1, 1);
  // цель сзади — сбросить скорость, чтобы развернуться круче
  e.h.gait = Math.abs(d) > 1.6 && e.h.v > 6 ? 3 : gait;
}

// ---------- игрок ----------
const keys = {};
let stick = null, tugTap = false;
const touch = matchMedia('(pointer: coarse)').matches;
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys[e.code] = true;
  initAudio();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyE' || e.code === 'Space') { tugTap = true; e.preventDefault(); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
function playerInput(dt) {
  const h = me.h;
  if (stick) { // телефон: куда тянешь палец относительно камеры — туда и скачет; дальше — быстрее
    const camYaw = cam.yaw;
    const want = camYaw + Math.atan2(-stick.dx, -stick.dy);
    const mag = Math.min(1, Math.hypot(stick.dx, stick.dy));
    if (mag > 0.2) { h.steer = clamp(wrap(want - h.yaw) * 2.2, -1, 1); h.gait = mag > 0.75 ? 4 : mag > 0.45 ? 3 : 2; } else { h.steer = 0; h.gait = 1; }
  } else {
    h.steer = (keys.KeyA || keys.ArrowLeft || keys.KeyQ ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
    h.gait = keys.KeyW || keys.ArrowUp || keys.KeyZ ? 4 : keys.KeyS || keys.ArrowDown ? 1 : 3;
  }
  me.wantSprint = keys.ShiftLeft || keys.ShiftRight || whipHeld;
  if (tugTap) {
    tugTap = false;
    if (state.tug && (state.tug.att === me || state.tug.car === me)) tugPress(me);
    else if (sack.carrier && canTug(me, sack.carrier)) startTug(me);
  }
}

// ---------- шаг игры ----------
function stepEnt(e, dt) {
  // қамшы: рывок, тратит силы; силы восполняются
  if (e.wantSprint && e.stamina > 8 && e.h.gait >= 3) { e.sprint = 0.2; e.stamina -= 26 * dt; if (!SIM && e.me && !e.whipT) { whip(); e.whipT = 0.6; } }
  else e.stamina = Math.min(100, e.stamina + 11 * dt);
  e.whipT = Math.max(0, (e.whipT || 0) - dt);
  e.sprint = Math.max(0, e.sprint - dt);
  e.tugCD = Math.max(0, e.tugCD - dt); e.pickCD = Math.max(0, e.pickCD - dt); e.stun = Math.max(0, e.stun - dt);
  const tugging = state.tug && (state.tug.car === e || state.tug.att === e);
  e.h.speedMul = (e.sprint > 0 ? 1.22 : 1) * (sack.carrier === e ? 0.9 : 1) * (e.stun > 0 ? 0.6 : 1) * (tugging ? 0.75 : 1);
}
function stepSack(dt) {
  if (sack.flight) { // летит на казан после гола
    const f = sack.flight; f.t = Math.min(1, f.t + dt * 1.6);
    sack.pos.lerpVectors(f.from, f.to, f.t); sack.pos.y += Math.sin(f.t * Math.PI) * 3;
    sack.mesh.position.copy(sack.pos);
    sack.mesh.rotation.z += dt * 6;
    return;
  }
  const c = sack.carrier;
  if (c) {
    // висит у правого бедра всадника; в тартысе тянется к сопернику
    c.h.obj.updateMatrixWorld(true); // без рендера (прогон ботов) матрицы сами не обновляются
    V.set(-0.46, -0.42, 0.08);
    c.r.root.localToWorld(V);
    if (state.tug && state.tug.car === c) {
      state.tug.att.h.obj.updateMatrixWorld(true);
      V2.set(0.46, -0.3, 0.1);
      state.tug.att.r.root.localToWorld(V2);
      V.lerp(V2, 0.25 + 0.3 * clamp((state.tug.bar + 1) / 2, 0, 1));
    }
    sack.pos.copy(V);
    sack.mesh.position.copy(V);
    c.r.root.getWorldQuaternion(Qt);
    sack.mesh.quaternion.copy(Qt).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
    c.reach = Math.max(c.reach, 0.35); c.reachSide = -1;
    return;
  }
  // лежит или катится
  sack.vel.y -= 9.8 * dt;
  sack.pos.addScaledVector(sack.vel, dt);
  if (sack.pos.y < 0.24) { sack.pos.y = 0.24; sack.vel.y *= -0.25; sack.vel.x *= Math.exp(-dt * 4); sack.vel.z *= Math.exp(-dt * 4); }
  sack.pos.x = clamp(sack.pos.x, -BOUNDS.x, BOUNDS.x); sack.pos.z = clamp(sack.pos.z, -BOUNDS.z, BOUNDS.z);
  for (const k of kazans) { // с казана скатывается
    const dx = sack.pos.x - k.x, d = Math.hypot(dx, sack.pos.z);
    if (d < KAZAN_R + 0.3) { sack.pos.x = k.x + (dx / (d || 1)) * (KAZAN_R + 0.3); sack.pos.z = (sack.pos.z / (d || 1)) * (KAZAN_R + 0.3); }
  }
  sack.mesh.position.copy(sack.pos);
  sack.mesh.rotation.set(0, sack.mesh.rotation.y, 0);
  if (state.phase !== 'play') return;
  // подбор: кто ближе всех и в досягаемости — наклоняется и хватает
  let best = null, bd = PICK_R;
  for (const e of ents) {
    if (e.pickCD > 0 || e.stun > 0) continue;
    const d = Math.hypot(e.h.obj.position.x - sack.pos.x, e.h.obj.position.z - sack.pos.z);
    if (d < 4) { e.reach = Math.max(e.reach, 1 - d / 4); }
    if (d < bd && sack.pos.y < 1) { bd = d; best = e; }
  }
  if (best) giveSack(best);
}
function onHit(a, b, imp, nx, nz) {
  // сильный толчок в несущего — может выронить мешок
  for (const [hit, by] of [[a, b], [b, a]]) {
    const e = ents.find((x) => x.h === hit), o = ents.find((x) => x.h === by);
    if (!e || !o || sack.carrier !== e || o.team === e.team || imp < 5) continue;
    if (rnd() < 0.35) {
      const s = hit === a ? -1 : 1;
      dropSack(sack.pos.clone(), new THREE.Vector3(nx * s * 3 + Math.sin(e.h.yaw) * e.h.v * 0.4, 2.5, nz * s * 3 + Math.cos(e.h.yaw) * e.h.v * 0.4));
      e.pickCD = 1.2;
      state.tug = null;
      state.events.push({ t: 'fumble' });
      if (!SIM && (e.me || o.me)) banner('Түсіріп алды!', '#ffd23a', 0.9);
    }
  }
}
function step(dt) {
  state.t -= dt;
  if (state.phase === 'countdown') {
    for (const e of ents) { e.h.gait = 0; e.h.steer = 0; }
    if (!SIM) { const n = Math.ceil(state.t - 0.2); if (n > 0 && n <= 3 && el.banner.textContent !== String(n) && state.t < 3.2) banner(String(n)); }
    if (state.t <= 0) { state.phase = 'play'; banner('Бастау!', '#ffd23a', 0.8); }
  } else if (state.phase === 'play') {
    state.clock -= dt;
    roleT -= dt;
    if (roleT <= 0) { assignRoles(); roleT = 0.3; }
    for (const e of ents) if (!e.me || AI_PLAYER) think(e, dt);
    if (me && !AI_PLAYER) playerInput(dt);
    if (state.clock <= 0) { state.clock = 0; endMatch(); }
  } else if (state.phase === 'goal') {
    for (const e of ents) { e.h.gait = 1; e.h.steer = 0; }
    if (state.t <= 0) kickoff(false);
  } else if (state.phase === 'end') {
    for (const e of ents) { e.h.gait = 0; e.h.steer = 0; }
  }
  for (const e of ents) { e.reach *= Math.exp(-dt * 4); stepEnt(e, dt); }
  stepTug(dt);
  for (const e of ents) e.h.update(dt);
  collide(ents.map((e) => e.h), onHit);
  for (const e of ents) for (const k of kazans) pushOut(e.h, k.x, 0, KAZAN_R);
  stepSack(dt);
  // гол: несущий у чужого казана
  if (state.phase === 'play' && sack.carrier) {
    const c = sack.carrier, k = kazans[c.team === 0 ? 1 : 0];
    if (Math.hypot(c.h.obj.position.x - k.x, c.h.obj.position.z) < SCORE_R) goal(c.team, c);
  }
  for (const e of ents) {
    e.r.update(dt, e.h.v, e.reach, e.reachSide);
    e.ring.position.x = e.h.obj.position.x; e.ring.position.z = e.h.obj.position.z;
  }
  if (!SIM) {
    sackMarker.visible = !sack.carrier && !sack.flight;
    sackMarker.position.set(sack.pos.x, 2.4 + Math.sin(performance.now() / 250) * 0.15, sack.pos.z);
    for (const k of kazans) { // флаги колышутся
      const a = k.flag.geometry.attributes.position, base = k.flag.userData.base, t = performance.now() / 1000;
      for (let i = 0; i < a.count; i++) { const x = base[i * 3]; a.setZ(i, Math.sin(x * 3 - t * 5) * 0.12 * x); }
      a.needsUpdate = true;
    }
    stepWorld(dt);
  }
}
function endMatch() {
  state.phase = 'end';
  const [a, b] = state.score;
  if (SIM) return;
  const mine = me.team, won = state.score[mine] > state.score[1 - mine], draw = a === b;
  el.endTitle.textContent = draw ? 'Тең ойын' : won ? 'Жеңіс!' : 'Жеңіліс';
  el.endScore.innerHTML = `<b style="color:${TEAMS[0].css}">${a}</b> : <b style="color:${TEAMS[1].css}">${b}</b>`;
  el.end.hidden = false;
}

// ---------- камера ----------
const cam = { pos: new THREE.Vector3(-40, 8, 0), look: new THREE.Vector3(), yaw: Math.PI / 2 };
function updateCamera(dt, snap) {
  const h = me.h, p = h.obj.position;
  let dy = wrap(h.yaw - cam.yaw);
  cam.yaw = snap ? h.yaw : cam.yaw + dy * (1 - Math.exp(-dt * 2.8));
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
  const dist = 7.2 + h.v * 0.12, high = 3.3 + h.v * 0.04;
  V.set(p.x - fx * dist, high, p.z - fz * dist);
  cam.pos.lerp(V, snap ? 1 : 1 - Math.exp(-dt * 10));
  V2.set(p.x + fx * 5, 1.2, p.z + fz * 5);
  cam.look.lerp(V2, snap ? 1 : 1 - Math.exp(-dt * 8));
  camera.position.copy(cam.pos);
  camera.lookAt(cam.look);
  const fov = 58 + Math.min(h.v, 12) * 0.6 + (me.sprint > 0 ? 4 : 0);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix(); }
  setListener(camera.position.x, camera.position.z, cam.yaw);
  ambience(h.v, riverDist(camera.position.x, camera.position.z));
}

// ---------- интерфейс ----------
const el = Object.fromEntries(['score', 'clock', 'banner', 'stam', 'tug', 'tugbar', 'tugtip', 'hint', 'end', 'endTitle', 'endScore', 'again', 'load', 'stick', 'btnTug', 'btnWhip', 'arrow'].map((id) => [id, document.getElementById(id)]));
let bannerT = 0;
function banner(text, color = '#fff', time = 1.2) {
  if (SIM) return;
  el.banner.textContent = text; el.banner.style.color = color; el.banner.classList.add('on'); bannerT = time;
}
function hud(dt) {
  bannerT -= dt;
  if (bannerT <= 0) el.banner.classList.remove('on');
  el.score.innerHTML = `<span style="background:${TEAMS[0].css}">${TEAMS[0].name} ${state.score[0]}</span><span style="background:${TEAMS[1].css}">${state.score[1]} ${TEAMS[1].name}</span>`;
  const c = Math.ceil(state.clock);
  el.clock.textContent = `${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`;
  el.stam.style.width = me.stamina + '%';
  el.stam.style.background = me.stamina < 25 ? '#d9534f' : '#f0c040';
  const T = state.tug, mine = T && (T.att === me || T.car === me);
  el.tug.hidden = !mine;
  if (mine) {
    const v = clamp(T.att === me ? T.bar : -T.bar, -1, 1); // + — в мою пользу
    el.tugbar.style.left = `${50 + v * 50}%`;
    el.tugtip.textContent = touch ? 'ТАРТ! басып тұр — жылдам бас!' : 'ТАРТ! E E E — жылдам бас!';
  }
  // подсказка «можно тянуть»
  const can = !T && sack.carrier && canTug(me, sack.carrier);
  el.btnTug.classList.toggle('ready', !!(can || mine));
  if (can && !touch) el.hint.textContent = 'E — тартыс: вырви серке!';
  else if (!el.hint.dataset.keep) el.hint.textContent = '';
  // стрелка к цели по краю экрана: к мешку или к чужому казану
  const target = sack.carrier === me ? new THREE.Vector3(kazans[1 - me.team].x, 1, 0) : sack.carrier && sack.carrier.team === me.team ? null : sack.pos;
  if (target) {
    V.copy(target).project(camera);
    const off = V.z > 1 || Math.abs(V.x) > 0.95 || Math.abs(V.y) > 0.95;
    el.arrow.hidden = !off;
    if (off) {
      let x = V.x, y = V.y; if (V.z > 1) { x = -x; y = -y; }
      const a = Math.atan2(y, x), r = 0.82;
      el.arrow.style.left = `${50 + Math.cos(a) * r * 50}%`; el.arrow.style.top = `${50 - Math.sin(a) * r * 50}%`;
      el.arrow.style.transform = `translate(-50%,-50%) rotate(${-a}rad)`;
      el.arrow.style.color = sack.carrier === me ? '#ffd23a' : '#fff';
    }
  } else el.arrow.hidden = true;
}
// телефон: стик слева, кнопки справа
let whipHeld = false;
if (touch) document.body.classList.add('touch');
addEventListener('pointerdown', (e) => {
  initAudio();
  if (e.pointerType !== 'touch' || e.target.closest('button')) return;
  if (e.clientX > innerWidth * 0.55) return;
  stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
  Object.assign(el.stick.style, { display: 'block', left: e.clientX + 'px', top: e.clientY + 'px' });
});
addEventListener('pointermove', (e) => {
  if (!stick || e.pointerId !== stick.id) return;
  stick.dx = clamp((e.clientX - stick.x) / 60, -1.2, 1.2);
  stick.dy = clamp((e.clientY - stick.y) / 60, -1.2, 1.2);
  el.stick.firstElementChild.style.transform = `translate(${clamp(stick.dx, -1, 1) * 36}px, ${clamp(stick.dy, -1, 1) * 36}px)`;
});
const endStick = (e) => { if (stick && e.pointerId === stick.id) { stick = null; el.stick.style.display = 'none'; } };
addEventListener('pointerup', endStick);
addEventListener('pointercancel', endStick);
el.btnTug.addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); tugTap = true; });
el.btnWhip.addEventListener('pointerdown', (e) => { e.preventDefault(); whipHeld = true; });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.btnWhip.addEventListener(ev, () => { whipHeld = false; });
el.again.addEventListener('click', () => { el.end.hidden = true; state.score = [0, 0]; state.clock = MATCH_LEN; kickoff(true); });
addEventListener('resize', onResize);

// ---------- запуск ----------
let last = performance.now(), frozen = false;
function frame(now) {
  if (frozen) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt);
  updateCamera(dt);
  hud(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

await loadModel();
for (const team of [0, 1]) for (let i = 0; i < 3; i++) ents.push(makeEnt(team, i, team === 0 && i === 1));
me = ents.find((e) => e.me);
// масти: игроку — гнедой, остальным разные
{
  const coats = [[1.7, 1.7, 1.7], [2.9, 1.6, 0.95], [0.75, 0.72, 0.72], [3.1, 2.6, 1.7], [1.2, 1.1, 1.05], [3.3, 2.2, 1.3]];
  ents.forEach((e, i) => e.h.obj.traverse((o) => { if (o.isSkinnedMesh) o.material.color.setRGB(...coats[e.me ? 0 : (i + 1) % coats.length]); }));
}
kickoff(true);

if (SIM) {
  // матчи ботов без картинки: шаг 1/30 с, сводка в window.__sim
  const res = [];
  for (let m = 0; m < SIM; m++) {
    state.score = [0, 0]; state.clock = MATCH_LEN; state.events = []; kickoff(true);
    let looseT = 0, stuck = 0, sinceTouch = 0;
    for (let i = 0; i < (MATCH_LEN + 60) * 30 && state.phase !== 'end'; i++) {
      step(1 / 30);
      if (state.phase === 'play') { if (!sack.carrier) { looseT += 1 / 30; sinceTouch += 1 / 30; } else sinceTouch = 0; if (sinceTouch > 20) { stuck++; sinceTouch = 0; } }
    }
    const ev = state.events;
    res.push({ score: [...state.score], tugs: ev.filter((x) => x.t === 'tug').length, tugAtt: ev.filter((x) => x.t === 'tugEnd' && x.winner === 'att').length, fumbles: ev.filter((x) => x.t === 'fumble').length, picks: ev.filter((x) => x.t === 'pick').length, loose: +(looseT / MATCH_LEN).toFixed(2), stuck });
  }
  window.__sim = res;
  document.title = 'SIM DONE';
} else {
  el.load.remove();
  updateCamera(0, true);
  el.hint.dataset.keep = '1';
  el.hint.textContent = touch ? 'Палец слева — куда скакать. ТАРТ — вырвать серке, ҚАМШЫ — рывок' : 'W — галоп, S — тише, A/D — поворот, Shift — қамшы, E — тартыс';
  setTimeout(() => { delete el.hint.dataset.keep; }, 9000);
  requestAnimationFrame(frame);
}
if (P.has('debug')) window.__kokpar = { ents, me, sack, state, kazans, step, camera, renderer, view(px, py, pz, lx, ly, lz) { camera.position.set(px, py, pz); camera.lookAt(lx, ly, lz); renderer.render(scene, camera); }, freeze(f) { frozen = f; if (!f) { last = performance.now(); requestAnimationFrame(frame); } }, run(n, dt = 1 / 60) { for (let i = 0; i < n; i++) step(dt); updateCamera(dt); hud(dt); renderer.render(scene, camera); }, getProto };
