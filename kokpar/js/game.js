// Көкпар — игра: 3×3, мешок-серке, два казана, тартыс (перетягивание мешка на скаку), боты.
// ?debug — window.__kokpar; ?sim=N — N матчей ботов без картинки (проверка баланса); ?bots — игрок тоже бот.
import { THREE, P, renderer, scene, camera, rnd, canvasTex, loadModel, loadTerrain, renderAll, puff, feltMat, view, Horse, stepWorld, onResize, collide, pushOut, BOUNDS, riverDist, getProto } from './world.js';
import { Rider, loadRider } from './rider.js';
import { makeSerke } from './serke.js';
import { makeKazan } from './kazan.js';
import * as career from './career.js';
import { flagCanvas } from './flags.js';
import { initAudio, toggleMute, setListener, ambience, cheer, whip, grabSound, neigh } from './audio.js';

const SIM = Number(P.get('sim') || 0);
if ((P.get('no') || '').includes('ui')) document.documentElement.classList.add('noui'); // ?no=ui — замер без интерфейса
const OFF_RIDERS = (P.get('no') || '').includes('riders'), NO_SHADOW_RIDERS = (P.get('no') || '').includes('rshadow');
const MATCH_LEN = Number(P.get('len') || 180); // с
const GOAL_X = 52, KAZAN_R = 3.0, SCORE_R = KAZAN_R + 1.5; // к казану надо подъехать вплотную
const TUG_RANGE = 2.7, TUG_BREAK = 3.5, PICK_R = 1.8;
const TEAMS = [
  { key: 'red', color: '#b8262c', css: '#ff6a6e', grad: ['#ffb1b3', '#e0393e'], blanket: 0, attack: 1 },
  { key: 'blue', color: '#2456a8', css: '#7fb0ff', grad: ['#b9d4ff', '#3a7be0'], blanket: 1, attack: -1 },
];
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), Qt = new THREE.Quaternion();

// ---------- тексты: русский и английский ----------
const TEXT = {
  ru: {
    red: 'Красные', blue: 'Синие', loading: 'Загрузка степи…', ready: 'Готовьтесь!', go: 'Вперёд!', goal: 'ГОЛ!', goalBy: (t) => t,
    tug: 'Тартыс!', tugSub: 'Схватка за серке', stoleMe: 'Вырвал!', stoleThem: 'Серке вырвали', heldMe: 'Удержал!', heldThem: 'Не отдал',
    fumble: 'Выронил серке!', win: 'Победа', lose: 'Поражение', draw: 'Ничья', again: 'Ещё раз', stamina: 'Сила коня',
    btnTug: 'ВЫРВАТЬ', btnWhip: 'КАМЧА', btnRear: 'СВЕЧКА', mashKey: 'Жми E быстрее!', mashTap: 'Жми ВЫРВАТЬ быстрее!', canTug: '<kbd>E</kbd> — вырвать серке',
    help: '<kbd>W</kbd> вперёд · <kbd>S</kbd> стоп · <kbd>A</kbd><kbd>D</kbd> поворот · <kbd>Shift</kbd> камча · <kbd>E</kbd> вырвать серке · <kbd>R</kbd> свечка',
    canPass: '<kbd>E</kbd> — взять серке у своего', passMe: 'Пас!',
    helpTouch: 'Палец слева — куда скакать · ВЫРВАТЬ — отнять серке · КАМЧА — рывок',
    home: 'Аксай', btnThrow: 'БРОСОК', canThrow: '<kbd>E</kbd> — бросить в казан', thrown: 'Бросок!', missed: 'Мимо казана!', unhorsed: 'Сбит с коня!',
    league: 'Лига аулов Жетысу', vs: 'Соперник', play: 'В седло!', next: 'Дальше', retry: 'Ещё раз', champion: 'Чемпион Жетысу!',
    stageOf: (a, b) => 'Аул ' + a + ' из ' + b, unlocked: 'Следующий соперник', menuSub: 'Командная скачка за тушу в предгорьях Алатау · 3 на 3',
  },
  en: {
    red: 'Red', blue: 'Blue', loading: 'Loading the steppe…', ready: 'Get ready!', go: 'Go!', goal: 'GOAL!', goalBy: (t) => t,
    tug: 'Tug of war!', tugSub: 'Fight for the serke', stoleMe: 'Stolen!', stoleThem: 'They stole it', heldMe: 'Held on!', heldThem: 'They held on',
    fumble: 'Fumble!', win: 'Victory', lose: 'Defeat', draw: 'Draw', again: 'Play again', stamina: 'Horse stamina',
    btnTug: 'GRAB', btnWhip: 'WHIP', btnRear: 'REAR UP', mashKey: 'Mash E!', mashTap: 'Tap GRAB fast!', canTug: '<kbd>E</kbd> — grab the serke',
    help: '<kbd>W</kbd> go · <kbd>S</kbd> stop · <kbd>A</kbd><kbd>D</kbd> steer · <kbd>Shift</kbd> whip · <kbd>E</kbd> grab the serke · <kbd>R</kbd> rear up',
    canPass: '<kbd>E</kbd> — take the serke from a teammate', passMe: 'Pass!',
    helpTouch: 'Left thumb — where to ride · GRAB — take the serke · WHIP — burst',
    home: 'Aksay', btnThrow: 'THROW', canThrow: '<kbd>E</kbd> — throw into the kazan', thrown: 'Throw!', missed: 'Missed the kazan!', unhorsed: 'Unhorsed!',
    league: 'Zhetysu village league', vs: 'Opponent', play: 'Ride!', next: 'Next', retry: 'Try again', champion: 'Zhetysu champion!',
    stageOf: (a, b) => 'Village ' + a + ' of ' + b, unlocked: 'Next opponent', menuSub: 'Team horseback fight for the carcass in the Alatau foothills · 3 vs 3',
  },
};
let lang = (() => { try { return localStorage.getItem('kokpar.lang'); } catch { return null; } })() || P.get('lang') || (/^ru|^kk|^ky|^uk|^be/i.test(navigator.language) ? 'ru' : 'en');
const tr = (k) => TEXT[lang][k];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = THREE.MathUtils.clamp;

// ---------- матч карьеры: соперник, его форма и сила (career.js) ----------
let fx = null; // текущий матч: { name, kit, diff, ko, final, arena }
const DEFAULT_FX = { id: 'kainar', name: 'Kainar', ko: false, final: false, arena: 'day', kit: career.makeKit('#2456a8', 'mountain'), diff: { pull: 0.06, react: 0.45, speed: 1 } };
let HB = { speed: 1, drain: 1, pull: 0, turn: 1, coat: [1.7, 1.7, 1.7] }; // прокачка коней клуба
const teamName = (t) => (t === 0 ? career.clubName('me') : (fx || DEFAULT_FX).name);

// ---------- поле: казаны, флажки, разметка ----------
const SWAP = P.has('swap') ? -1 : 1; // ?swap — команды меняются сторонами (проверка перекоса)
const kazans = [-GOAL_X * SWAP, GOAL_X * SWAP].map((x, t) => {
  const g = new THREE.Group();
  g.position.set(x, 0, 0);
  const body = makeKazan(TEAMS[t].color, KAZAN_R); // покрышки, насыпь, вытоптанная земля
  g.add(body);
  // флаг команды
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 5.5, 8), new THREE.MeshLambertMaterial({ color: '#d8cdb5' }));
  pole.position.set(0, 3.7, -KAZAN_R - 0.4); g.add(pole);
  const flagGeo = new THREE.PlaneGeometry(1.6, 1.0, 12, 4);
  flagGeo.translate(0.8, 0, 0);
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }));
  flag.position.set(0, 5.9, -KAZAN_R - 0.4); g.add(flag);
  flag.userData.base = flagGeo.attributes.position.array.slice();
  scene.add(g);
  return { x, team: t, g, flag, body };
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

// ---------- серке: муляж туши козла (как на турнирах) ----------
const GROUND_Y = 0.17; // лежит на боку — центр туши над землёй
const sack = { mesh: makeSerke(), pos: new THREE.Vector3(0, GROUND_Y, 0), vel: new THREE.Vector3(), carrier: null, flight: null, lie: Math.PI / 2 };
sack.mesh.rotation.order = 'YXZ';
scene.add(sack.mesh);
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
  if (OFF_RIDERS) r.root.visible = false; // ?no=riders — замер без всадников
if (NO_SHADOW_RIDERS) r.root.traverse((o) => { o.castShadow = false; });
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
    e.r.remount(); e.down = 0;
  });
  dropSack(new THREE.Vector3(0, GROUND_Y, 0), new THREE.Vector3());
  state.tug = null;
  state.phase = 'countdown';
  state.t = first ? 3.2 : 2.2;
  banner(first ? '3' : tr('ready'));
}
const Qc = new THREE.Quaternion();
function dropSack(pos, vel) {
  for (const e of ents) e.throw = null;
  sack.lie = (rnd() < 0.5 ? 1 : -1) * Math.PI / 2; // упадёт на левый или правый бок
  sack.carrier = null; sack.flight = null; roleT = 0;
  sack.pos.copy(pos); sack.vel.copy(vel);
}
function giveSack(e) {
  for (const o of ents) o.throw = null;
  sack.carrier = e; sack.flight = null; roleT = 0;
  e.pickCD = 0;
  state.events.push({ t: 'pick', team: e.team });
  if (!SIM) grabSound(e.h.obj.position.x, e.h.obj.position.z);
}
function goal(team, scorer, landed) {
  state.score[team]++;
  scorer.stats.goals++;
  scorer.celebrate = true;
  state.lastGoal = team;
  state.phase = 'goal';
  state.t = 2.8;
  const k = kazans[team === 0 ? 1 : 0];
  // мешок летит на казан
  sack.carrier = null;
  if (landed) { sack.flight = null; sack.pos.set(k.x, 1.25, 0); sack.vel.set(0, 0, 0); } // брошена — уже лежит на казане
  else sack.flight = { from: sack.pos.clone(), to: new THREE.Vector3(k.x, 1.25, 0), t: 0 };
  banner(tr('goal'), TEAMS[team].grad, 2.4, teamName(team));
  state.events.push({ t: 'goal', team });
  if (!SIM) cheer(team === me?.team);
}

// ---------- бросок туши в казан ----------
const THROW_MAX = 13;
function throwInfo(e) { // расстояние до чужого казана, промах по направлению, вероятность попасть
  const k = kazans[e.team === 0 ? 1 : 0], p = e.h.obj.position;
  const d = Math.hypot(k.x - p.x, p.z), ang = Math.abs(wrap(Math.atan2(k.x - p.x, -p.z) - e.h.yaw));
  const chance = clamp(1.25 - (d - 4) / 7, 0, 1) * clamp(1.3 - ang / 0.5, 0, 1) * (e.h.v > 9 ? 0.85 : 1);
  return { k, d, ang, chance };
}
const WIND = 0.32; // замах, с
function throwSack(e) {
  if (e.throw) return;
  const { k, d, chance } = throwInfo(e);
  const hit = rnd() < chance;
  let to;
  if (hit) to = new THREE.Vector3(k.x + (rnd() - 0.5) * 1.2, 1.2, (rnd() - 0.5) * 1.2);
  else { const a = rnd() * 6.283, r = KAZAN_R + 1.4 + rnd() * 2.2; to = new THREE.Vector3(k.x + Math.cos(a) * r, GROUND_Y, Math.sin(a) * r); }
  e.throw = { t: 0, to, d, hit };
}
function releaseSack(e) { // руки выпрямились — туша летит
  const { to, d, hit } = e.throw;
  e.throw = null;
  sack.carrier = null; roleT = 0;
  sack.flight = { kind: 'throw', from: sack.pos.clone(), to, t: 0, T: 0.5 + d * 0.04, arc: 1.2 + d * 0.2, hit, team: e.team, scorer: e };
  e.pickCD = 1;
  state.events.push({ t: 'throw', hit });
  if (!SIM && e.me) banner(tr('thrown'), null, 0.7);
  if (!SIM) whip();
}

// ---------- падение всадника ----------
function fallRider(e, nx, nz) {
  if (e.r.fallen || state.phase !== 'play') return;
  if (sack.carrier === e) { dropSack(sack.pos.clone(), new THREE.Vector3(nx * 2.5, 2, nz * 2.5)); state.events.push({ t: 'fumble' }); }
  if (state.tug && (state.tug.att === e || state.tug.car === e)) state.tug = null;
  const hv = e.h.v, fx = Math.sin(e.h.yaw), fz = Math.cos(e.h.yaw);
  const side = Math.sign(fz * nx - fx * nz) || 1;
  e.r.fall(scene, fx * hv * 0.7 + nx * 2.5, 2.4, fz * hv * 0.7 + nz * 2.5, side);
  e.down = 3; e.wait = 0; e.stun = 3.3; e.pickCD = 3.5; e.tugCD = 3.5;
  state.events.push({ t: 'fall', team: e.team });
  if (!SIM) neigh(e.h.obj.position.x, e.h.obj.position.z);
  if (!SIM && (e.me || e.team === me?.team)) banner(tr('unhorsed'), e.me ? null : TEAMS[e.team].grad, 1.1);
}
function stepFallen(e, dt) {
  if (!e.r.fallen) return;
  // конь без всадника сбавляет ход, разворачивается и подходит к хозяину
  const hp = e.h.obj.position, rp = e.r.root.position, d = Math.hypot(rp.x - hp.x, rp.z - hp.z);
  if (e.r.fallen.landed && d > 1.8 && e.down > 0) steerTo(e, rp.x, rp.z, d > 9 ? 3 : 1);
  else { e.h.gait = 0; e.h.steer = 0; }
  if (e.r.stepFall(dt, e.down < 0.95) && !SIM) puff(rp, 6, 0, 0);
  // встаёт, только когда конь рядом (или если ждать слишком долго)
  e.wait = (e.wait || 0) + dt;
  if (e.down > 0.95 || d < 2.6 || e.wait > 7) e.down -= dt;
  if (e.down <= 0) { e.r.startMount(); e.stun = Math.min(e.stun, 0.8); } // запрыгивает в седло
}

// пас: свой несущий рядом отдаёт серке из рук в руки
function canPass(e) {
  const c = sack.carrier;
  return c && c !== e && c.team === e.team && !state.tug && e.pickCD <= 0 && !e.r.fallen && e.h.obj.position.distanceTo(c.h.obj.position) < TUG_RANGE + 0.6;
}
// ---------- тартыс ----------
function canTug(att, car) {
  if (!car || att.team === car.team || att.tugCD > 0 || att.stun > 0 || state.tug) return false;
  return att.h.obj.position.distanceTo(car.h.obj.position) < TUG_RANGE;
}
function startTug(att) {
  state.tug = { att, car: sack.carrier, bar: 0, t: 0 };
  state.events.push({ t: 'tug' });
  if (!SIM && (att.me || sack.carrier.me)) banner(tr('tug'), null, 1.1, tr('tugSub'));
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
  const pull = (e) => ((e.me && !AI_PLAYER ? 0.42 : 0.42 + (e.team === 1 && !SIM ? DIFF.pull : 0) + (rnd() - 0.5) * 0.5) + (e.team === 0 ? HB.pull : 0)) * (0.65 + 0.35 * e.stamina / 100);
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
    if (!SIM && (T.att.me || T.car.me)) banner(T.att.me ? tr('stoleMe') : tr('stoleThem'), TEAMS[T.att.team].grad, 1.1);
  } else {
    T.att.tugCD = 2.0; T.att.stun = 0.5;
    T.car.stats.tugsWon++;
    if (!SIM && (T.att.me || T.car.me)) banner(T.car.me ? tr('heldMe') : tr('heldThem'), TEAMS[T.car.team].grad, 1.1);
  }
  state.events.push({ t: 'tugEnd', winner });
}

// ---------- боты ----------
const GRIP = Number(P.get('grip') || 0.07); // ~45% тартысов выигрывает нападающий
const DIFF = { pull: Number(P.get('pull') || 0.06), react: 0.45, speed: 1 }; // сила соперника — из лиги (applyStage)
// перекрасить команду: всадники, тоқымы, кольца, казан, флаг, табло
const painted = ['', ''];
function paintTeam(t, def) {
  Object.assign(TEAMS[t], { color: def.color, css: def.css, grad: def.grad, sign: def.sign });
  if (painted[t] === def.color + def.sign) return;
  painted[t] = def.color + def.sign;
  for (const e of ents) if (e.team === t) {
    e.r.setColor(def.color);
    if (e.h.blanket) e.h.blanket.material = feltMat(def.color);
    if (!e.me) e.ring.material.color.set(def.css);
  }
  const k = kazans.find((q) => q.team === t);
  if (k) {
    k.g.remove(k.body); k.body = makeKazan(def.color, KAZAN_R); k.g.add(k.body);
    const tex = new THREE.CanvasTexture(flagCanvas(def)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    k.flag.material.map?.dispose(); k.flag.material.map = tex; k.flag.material.needsUpdate = true;
  }
  if (!SIM) {
    const side = t === 0 ? 'red' : 'blue', root = document.documentElement.style;
    root.setProperty('--' + side, def.hud[0]); root.setProperty('--' + side + '2', def.hud[1]);
    if (t === 1) root.setProperty('--foe', def.css);
    const img = document.getElementById(t === 0 ? 'flR' : 'flB');
    if (img) img.src = flagCanvas(def, 96, 60).toDataURL();
  }
}
function applyStage() {
  fx = SIM ? DEFAULT_FX : career.fixture() || DEFAULT_FX;
  if (!SIM) HB = career.horse();
  paintTeam(0, career.myKit()); paintTeam(1, fx.kit);
  if (!SIM) { el.nmR.textContent = teamName(0); el.nmB.textContent = teamName(1); }
  if (!SIM && !P.has('pull')) Object.assign(DIFF, fx.diff);
  for (const e of ents) if (e.team === 0) e.h.turnMul = HB.turn;
  paintCoat();
}
function paintCoat() { if (me) me.h.obj.traverse((o) => { if (o.isSkinnedMesh) o.material.color.setRGB(...HB.coat); }); }
globalThis.__kokparCoat = () => { HB = career.horse(); paintCoat(); };
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
  if (e.r.fallen) return; // всадник на земле
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
    const ti = throwInfo(e);
    if (ti.d < 11 && ti.d > SCORE_R + 0.5 && ti.chance > 0.6) {
      const pressed = ents.some((o) => o.team !== e.team && o.h.obj.position.distanceTo(p) < 6);
      if (pressed || rnd() < dt * 0.9) throwSack(e);
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
  // казан на пути к цели — едем через точку сбоку от него, а не в лоб
  for (const k of kazans) {
    if (b.role === 'carry' && k === b.foe && Math.hypot(tx - k.x, tz) < 1) continue; // несущий едет прямо к чужому казану
    const sx = tx - p.x, sz = tz - p.z, L = Math.hypot(sx, sz) || 1;
    const cx = k.x - p.x, cz = -p.z, along = (cx * sx + cz * sz) / L;
    if (along <= 0 || along >= L) continue;
    const off = (cx * sz - cz * sx) / L; // расстояние от центра казана до прямой
    if (Math.abs(off) > KAZAN_R + 2.2) continue;
    // точка обхода — по ту же сторону от прямой, где проходит конь, а не через насыпь
    const sg = off > 0 ? -1 : 1;
    tx = k.x + (sz / L) * sg * (KAZAN_R + 3.6); tz = (-sx / L) * sg * (KAZAN_R + 3.6);
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
  if (e.code === 'KeyR' && canRear()) me.h.rear(); // свечка — только стоя
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
function playerInput(dt) {
  const h = me.h;
  if (stick) { // телефон: куда тянешь палец относительно камеры — туда и скачет; дальше — быстрее
    const camYaw = cam.yaw;
    const want = camYaw + Math.atan2(-stick.dx, -stick.dy);
    const mag = Math.min(1, Math.hypot(stick.dx, stick.dy));
    if (mag > 0.2) { h.steer = clamp(wrap(want - h.yaw) * 2.2, -1, 1); h.gait = mag > 0.75 ? 4 : mag > 0.45 ? 3 : 2; } else { h.steer = 0; h.gait = 0; }
  } else {
    h.steer = (keys.KeyA || keys.ArrowLeft || keys.KeyQ ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
    // без клавиш конь останавливается; только поворот — идёт шагом
    h.gait = keys.KeyW || keys.ArrowUp || keys.KeyZ ? 4 : keys.KeyS || keys.ArrowDown ? 0 : h.steer ? 1 : 0;
    if (h.rearClock != null) h.gait = 0; // во время свечки стоит
  }
  me.wantSprint = keys.ShiftLeft || keys.ShiftRight || whipHeld;
  if (tugTap) {
    tugTap = false;
    if (state.tug && (state.tug.att === me || state.tug.car === me)) tugPress(me);
    else if (sack.carrier === me && throwInfo(me).d < THROW_MAX) throwSack(me);
    else if (sack.carrier && canTug(me, sack.carrier)) startTug(me);
    else if (canPass(me)) { giveSack(me); banner(tr('passMe'), null, 0.8); }
  }
}

// ---------- шаг игры ----------
function stepEnt(e, dt) {
  // қамшы: рывок, тратит силы; силы восполняются
  const drain = e.team === 0 ? HB.drain : 1;
  if (e.wantSprint && e.stamina > 8 && e.h.gait >= 3) { e.sprint = 0.2; e.stamina -= 26 * drain * dt; if (!SIM && e.me && !e.whipT) { whip(); e.whipT = 0.6; } }
  else if (e.h.gait >= 4 && e.h.v > 8) e.stamina = Math.max(0, e.stamina - 1.8 * drain * dt); // галоп утомляет
  else e.stamina = Math.min(100, e.stamina + 11 * dt);
  e.tired = e.stamina < 10 ? true : e.stamina > 35 ? false : e.tired;
  e.whipT = Math.max(0, (e.whipT || 0) - dt);
  e.sprint = Math.max(0, e.sprint - dt);
  e.tugCD = Math.max(0, e.tugCD - dt); e.pickCD = Math.max(0, e.pickCD - dt); e.stun = Math.max(0, e.stun - dt);
  const tugging = state.tug && (state.tug.car === e || state.tug.att === e);
  e.h.speedMul = (e.sprint > 0 ? 1.22 : 1) * (sack.carrier === e ? 0.9 : 1) * (e.stun > 0 ? 0.6 : 1) * (tugging ? 0.75 : 1) * (e.tired ? 0.82 : 1) * (e.team === 1 ? DIFF.speed : HB.speed);
}
function stepSack(dt) {
  if (sack.flight) { // летит: после гола на казан или брошена
    const f = sack.flight; f.t = Math.min(1, f.t + dt / (f.T || 0.62));
    sack.pos.lerpVectors(f.from, f.to, f.t); sack.pos.y += Math.sin(f.t * Math.PI) * (f.arc || 3);
    sack.mesh.position.copy(sack.pos);
    sack.mesh.rotation.z += dt * 6;
    if (f.t >= 1 && f.kind === 'throw') {
      sack.flight = null;
      if (f.hit && state.phase === 'play') goal(f.team, f.scorer, true);
      else {
        dropSack(f.to.clone().setY(GROUND_Y + 0.3), new THREE.Vector3((rnd() - 0.5) * 3, 1.2, (rnd() - 0.5) * 3));
        state.events.push({ t: 'miss' });
        if (!SIM) banner(tr('missed'), null, 0.9);
      }
    }
    return;
  }
  const c = sack.carrier;
  if (c) {
    // висит у правого бедра всадника; в тартысе тянется к сопернику
    c.h.obj.updateMatrixWorld(true); // без рендера (прогон ботов) матрицы сами не обновляются
    // туша лежит поперёк холки перед всадником, ноги свисают по бокам; при замахе — над головой
    const w = c.throw ? Math.min(1, c.throw.t / WIND) : 0, we = w * w * (3 - 2 * w);
    V.set(-0.08 + 0.08 * we, -0.12 + 1.15 * we, 0.4 - 0.25 * we);
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
    sack.mesh.quaternion.copy(Qt).multiply(Qc.setFromAxisAngle(V2.set(0, 0, 1), -0.25 * (1 - we))); // правый край ниже
    if (c.throw && c.throw.t >= WIND) releaseSack(c);
    return;
  }
  // лежит или катится
  sack.vel.y -= 9.8 * dt;
  sack.pos.addScaledVector(sack.vel, dt);
  if (sack.pos.y < GROUND_Y) { sack.pos.y = GROUND_Y; sack.vel.y *= -0.25; sack.vel.x *= Math.exp(-dt * 4); sack.vel.z *= Math.exp(-dt * 4); }
  sack.pos.x = clamp(sack.pos.x, -BOUNDS.x, BOUNDS.x); sack.pos.z = clamp(sack.pos.z, -BOUNDS.z, BOUNDS.z);
  for (const k of kazans) { // с казана скатывается
    const dx = sack.pos.x - k.x, d = Math.hypot(dx, sack.pos.z);
    if (d < KAZAN_R + 0.3) { sack.pos.x = k.x + (dx / (d || 1)) * (KAZAN_R + 0.3); sack.pos.z = (sack.pos.z / (d || 1)) * (KAZAN_R + 0.3); }
  }
  sack.mesh.position.copy(sack.pos);
  // в полёте кувыркается, на земле ложится на бок
  const air = sack.pos.y > GROUND_Y + 0.05;
  sack.mesh.rotation.x += air ? dt * 5 : (sack.lie - sack.mesh.rotation.x) * Math.min(1, dt * 10);
  sack.mesh.rotation.z += air ? 0 : -sack.mesh.rotation.z * Math.min(1, dt * 10);
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
  {
    const ea = ents.find((x) => x.h === a), eb = ents.find((x) => x.h === b);
    if (ea && eb && ea.team !== eb.team && imp > 6.2) {
      const va = a.v * (Math.sin(a.yaw) * nx + Math.cos(a.yaw) * nz), vb = b.v * (Math.sin(b.yaw) * nx + Math.cos(b.yaw) * nz);
      const victim = va > -vb ? eb : ea, s = victim === eb ? 1 : -1;
      if (rnd() < (sack.carrier === victim ? 0.35 : 0.14)) fallRider(victim, nx * s, nz * s);
    }
  }
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
      if (!SIM && (e.me || o.me)) banner(tr('fumble'), null, 1);
    }
  }
}
function step(dt) {
  state.t -= dt;
  if (state.phase === 'countdown') {
    for (const e of ents) { e.h.gait = 0; e.h.steer = 0; }
    if (!SIM) { const n = Math.ceil(state.t - 0.2); if (n > 0 && n <= 3 && el.bigText.textContent !== String(n) && state.t < 3.2) banner(String(n)); }
    if (state.t <= 0) { state.phase = 'play'; banner(tr('go'), null, 0.9); }
  } else if (state.phase === 'play') {
    state.clock -= dt;
    roleT -= dt;
    if (roleT <= 0) { assignRoles(); roleT = 0.3; }
    for (const e of ents) if (!e.me || AI_PLAYER) think(e, dt);
    if (me && !AI_PLAYER && !me.r.fallen) playerInput(dt);
    if (state.clock <= 0) {
      state.clock = 0;
      if (fx?.ko && !SIM && state.score[0] === state.score[1]) { if (!state.golden) { state.golden = true; banner(lang === 'ru' ? 'ЗОЛОТОЙ ГОЛ' : 'GOLDEN GOAL', ['#fff3c0', '#f0a01c'], 2.2, career.goldenText()); } }
      else endMatch();
    }
  } else if (state.phase === 'goal') {
    for (const e of ents) {
      e.h.gait = e.celebrate ? 0 : 1; e.h.steer = 0;
      if (e.celebrate && e.h.v < 1.4 && !SIM) { e.h.rear(); e.celebrate = false; } // свечка и ржание
    }
    if (state.t <= 0) { for (const e of ents) e.celebrate = false; if (state.golden) endMatch(); else kickoff(false); }
  } else if (state.phase === 'end' || state.phase === 'menu') {
    for (const e of ents) { e.h.gait = 0; e.h.steer = 0; }
  }
  for (const e of ents) {
    e.reach *= Math.exp(-dt * 4); stepFallen(e, dt); stepEnt(e, dt);
    if (e.throw) e.throw.t += dt;
    e.throwT = e.throw ? e.throw.t : e.throwT >= 0 && e.throwT < 0.8 ? e.throwT + dt : -1; // для позы: замах и доводка рук
  }
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
    e.r.throwT = e.throwT ?? -1; e.r.carrying = sack.carrier === e;
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
  if (SIM) return;
  const sum = career.report(state.score[0], state.score[1]);
  el.banner.classList.remove('on'); bannerT = 0; delete el.hint.dataset.keep; el.hint.textContent = ''; el.tug.hidden = true;
  career.showResult(sum);
  el.menu.hidden = false;
  if (sum.res === 'win') cheer(true);
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
const el = Object.fromEntries(['menu', 'scR', 'scB', 'nmR', 'nmB', 'clock', 'banner', 'stam', 'stamlbl', 'tug', 'tugbar', 'tugtip', 'hint', 'load', 'loadtxt', 'stick', 'btnTug', 'btnWhip', 'arrow', 'lang'].map((id) => [id, document.getElementById(id)]));
el.bigText = el.banner.querySelector('.big'); el.subText = el.banner.querySelector('.small');
const CREDITS = 'Рельеф / Terrain: SRTM (USGS), AWS Terrain Tiles · Снимок / Imagery: EOxCloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0 · Конь / Horse: Warhorse Lite by Literock Studios · Всадник / Rider: Heraklios by A. Dizon (Mixamo)';
for (const c of document.querySelectorAll('[data-credits]')) c.textContent = CREDITS;
function applyLang() {
  document.documentElement.lang = lang; globalThis.__kokparLang = lang;
  el.nmR.textContent = teamName(0); el.nmB.textContent = teamName(1);
  el.stamlbl.textContent = tr('stamina'); el.btnTug.textContent = tr('btnTug'); el.btnWhip.textContent = tr('btnWhip');
  if (state.phase === 'menu') career.showHub();
  el.lang.textContent = lang === 'ru' ? 'EN' : 'RU';
  if (el.hint.dataset.keep) el.hint.innerHTML = touch ? tr('helpTouch') : tr('help');
}
el.lang.addEventListener('click', (e) => { e.stopPropagation(); lang = lang === 'ru' ? 'en' : 'ru'; try { localStorage.setItem('kokpar.lang', lang); } catch { /* приватный режим */ } applyLang(); });
el.lang.addEventListener('pointerdown', (e) => e.stopPropagation());
let bannerT = 0;
function banner(text, grad = null, time = 1.2, sub = '') {
  if (SIM) return;
  const [c1, c2] = grad || ['#ffe58a', '#f0a01c'];
  el.bigText.textContent = text; el.subText.textContent = sub;
  el.banner.style.setProperty('--c1', c1); el.banner.style.setProperty('--c2', c2);
  el.banner.classList.remove('on'); void el.banner.offsetWidth; el.banner.classList.add('on'); bannerT = time;
}
function hud(dt) {
  bannerT -= dt;
  if (bannerT <= 0) el.banner.classList.remove('on');
  el.scR.textContent = state.score[0]; el.scB.textContent = state.score[1];
  const c = Math.ceil(state.clock);
  el.clock.textContent = `${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`;
  if (state.golden) el.clock.textContent = '⚡';
  el.stam.style.width = me.stamina + '%';
  el.stam.style.background = me.stamina < 25 ? 'linear-gradient(90deg,#8f1418,#e0393e)' : '';
  const T = state.tug, mine = T && (T.att === me || T.car === me);
  el.tug.hidden = !mine;
  if (mine) {
    const v = clamp(T.att === me ? T.bar : -T.bar, -1, 1); // + — в мою пользу
    el.tugbar.style.left = `${50 + v * 50}%`;
    el.tugtip.textContent = touch ? tr('mashTap') : tr('mashKey');
  }
  // подсказка «можно тянуть»
  const nearKazan = sack.carrier === me && throwInfo(me).d < THROW_MAX;
  el.btnTug.textContent = nearKazan ? tr('btnThrow') : tr('btnTug');
  const pass = !T && canPass(me);
  if (touch) { const lbl = canRear() ? tr('btnRear') : tr('btnWhip'); if (el.btnWhip.textContent !== lbl) el.btnWhip.textContent = lbl; }
  const can = !T && sack.carrier && (canTug(me, sack.carrier) || nearKazan || pass);
  el.btnTug.classList.toggle('ready', !!(can || mine));
  if (can && !touch) el.hint.innerHTML = nearKazan ? tr('canThrow') : pass ? tr('canPass') : tr('canTug');
  else if (!el.hint.dataset.keep) el.hint.textContent = '';
  if (state.phase === 'menu') el.hint.textContent = ''; // под меню подсказок нет
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
const pt = (e) => (view.rot ? { x: e.clientY, y: innerWidth - e.clientX } : { x: e.clientX, y: e.clientY }); // палец → координаты игры
const canRear = () => me && me.h.v < 1.5 && !me.r.fallen && sack.carrier !== me && state.phase !== 'menu';
// на Android: во весь экран и закрепить горизонталь (на iPhone — поворот страницы выше)
function goLandscape() {
  if (!touch || matchMedia('(display-mode: fullscreen)').matches) return;
  const d = document.documentElement;
  (d.requestFullscreen?.({ navigationUI: 'hide' }) || Promise.reject()).then(() => screen.orientation?.lock?.('landscape')).catch(() => {}).finally(() => setTimeout(onResize, 300));
}
if (touch) document.body.classList.add('touch');
addEventListener('pointerdown', (e) => {
  initAudio();
  if (e.pointerType !== 'touch' || e.target.closest('button')) return;
  const p = pt(e);
  if (p.x > view.w * 0.55) return;
  stick = { id: e.pointerId, x: p.x, y: p.y, dx: 0, dy: 0 };
  Object.assign(el.stick.style, { display: 'block', left: p.x + 'px', top: p.y + 'px' });
});
addEventListener('pointermove', (e) => {
  if (!stick || e.pointerId !== stick.id) return;
  const p = pt(e);
  stick.dx = clamp((p.x - stick.x) / 60, -1.2, 1.2);
  stick.dy = clamp((p.y - stick.y) / 60, -1.2, 1.2);
  el.stick.firstElementChild.style.transform = `translate(${clamp(stick.dx, -1, 1) * 36}px, ${clamp(stick.dy, -1, 1) * 36}px)`;
});
const endStick = (e) => { if (stick && e.pointerId === stick.id) { stick = null; el.stick.style.display = 'none'; } };
addEventListener('pointerup', endStick);
addEventListener('pointercancel', endStick);
el.btnTug.addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); tugTap = true; });
el.btnWhip.addEventListener('pointerdown', (e) => { e.preventDefault(); if (canRear()) me.h.rear(); else whipHeld = true; });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.btnWhip.addEventListener(ev, () => { whipHeld = false; });
function startMatch() {
  applyStage(); applyLang();
  el.menu.hidden = true;
  state.score = [0, 0]; state.clock = MATCH_LEN; state.golden = false; kickoff(true);
}
career.initCareer(document.getElementById('hub'), () => { initAudio(); goLandscape(); startMatch(); });
function showMenu() {
  state.phase = 'menu';
  applyStage(); // соперник в своих цветах уже в меню
  el.banner.classList.remove('on'); bannerT = 0;
  career.showHub();
  el.menu.hidden = false;
}
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
  renderAll();
  requestAnimationFrame(frame);
}

if (!SIM) applyLang();
await Promise.all([loadModel(), loadRider()]);
if (!SIM) loadTerrain().catch((err) => console.warn('рельеф не загрузился', err)); // горы появятся чуть позже
for (const team of [0, 1]) for (let i = 0; i < 3; i++) ents.push(makeEnt(team, i, team === 0 && i === 1));
me = ents.find((e) => e.me);
// масти: игроку — гнедой, остальным разные
{
  const coats = [[1.7, 1.7, 1.7], [2.9, 1.6, 0.95], [0.75, 0.72, 0.72], [3.1, 2.6, 1.7], [1.2, 1.1, 1.05], [3.3, 2.2, 1.3]];
  ents.forEach((e, i) => e.h.obj.traverse((o) => { if (o.isSkinnedMesh) o.material.color.setRGB(...coats[e.me ? 0 : (i + 1) % coats.length]); }));
  if (!SIM) globalThis.__kokparCoat();
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
    res.push({ score: [...state.score], tugs: ev.filter((x) => x.t === 'tug').length, tugAtt: ev.filter((x) => x.t === 'tugEnd' && x.winner === 'att').length, fumbles: ev.filter((x) => x.t === 'fumble').length, picks: ev.filter((x) => x.t === 'pick').length, throws: ev.filter((x) => x.t === 'throw').length, throwHits: ev.filter((x) => x.t === 'throw' && x.hit).length, falls: ev.filter((x) => x.t === 'fall').length, loose: +(looseT / MATCH_LEN).toFixed(2), stuck });
  }
  window.__sim = res;
  document.title = 'SIM DONE';
} else {
  window.__loadDone?.(); setTimeout(() => el.load.remove(), 250);
  if ((P.has('bots') || P.has('debug')) && !P.has('menu')) applyStage(); else showMenu();
  updateCamera(0, true);
  el.hint.dataset.keep = '1';
  el.hint.innerHTML = touch ? tr('helpTouch') : tr('help');
  setTimeout(() => { delete el.hint.dataset.keep; }, 9000);
  requestAnimationFrame(frame);
}
if (P.has('debug')) window.__kokpar = { ents, me, sack, state, kazans, step, camera, renderer, thr() { const c = sack.carrier; if (c) throwSack(c); return c; }, endNow(a, b) { state.score = [a, b]; endMatch(); }, fall(i) { const e = ents[i]; fallRider(e, Math.cos(e.h.yaw), -Math.sin(e.h.yaw)); return e; }, view(px, py, pz, lx, ly, lz) { camera.position.set(px, py, pz); camera.lookAt(lx, ly, lz); renderAll(); }, freeze(f) { frozen = f; if (!f) { last = performance.now(); requestAnimationFrame(frame); } }, run(n, dt = 1 / 60) { for (let i = 0; i < n; i++) step(dt); updateCamera(dt); hud(dt); renderAll(); }, getProto };
