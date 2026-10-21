// Көкпар — игра: 3×3, мешок-серке, два казана, тартыс (перетягивание мешка на скаку), боты.
// ?debug — window.__kokpar; ?sim=N — N матчей ботов без картинки (проверка баланса); ?bots — игрок тоже бот.
import { setCoat } from './world.js';
import { THREE, P, renderer, scene, camera, rnd, canvasTex, loadModel, loadTerrain, renderAll, puff, feltMat, setArena, followSun, tuneRes, Q, view, PORTAL, Horse, stepWorld, onResize, collide, pushOut, BOUNDS, riverDist, getProto } from './world.js';
import { Rider, loadRider } from './rider.js';
import { makeSerke } from './serke.js';
import { makeKazan } from './kazan.js';
import * as career from './career.js';
import { makeCrowd } from './crowd.js';
import { IC } from './icons.js';
import * as portal from './portal.js';
import { Net, cleanCode, netSupported } from './net.js';
import { flagCanvas } from './flags.js';
import { setPortalMute, crowdTension, crowdShout, getVolume, setVolume, isMuted, initAudio, toggleMute, setListener, ambience, cheer, whip, grabSound, neigh, tumble, bump } from './audio.js';

const SIM = Number(P.get('sim') || 0);
if ((P.get('no') || '').includes('ui')) document.documentElement.classList.add('noui'); // ?no=ui — замер без интерфейса
const OFF_RIDERS = (P.get('no') || '').includes('riders'), NO_SHADOW_RIDERS = (P.get('no') || '').includes('rshadow');
const MATCH_LEN = Number(P.get('len') || 180); // с
const ROOKIE_LEN = 120; // первый матч в жизни игрока
let rookie = false;
const KAZAN_TOP = 1.58; // верх насыпи казана — туда ложится туша
const GOAL_X = 52, KAZAN_R = 3.0, SCORE_R = KAZAN_R + 1.5; // к казану надо подъехать вплотную
const TUG_RANGE = 2.7, TUG_BREAK = 3.5, PICK_R = 1.8;
const TEAMS = [
  { key: 'red', color: '#b8262c', css: '#ff6a6e', grad: ['#ffb1b3', '#e0393e'], blanket: 0, attack: 1 },
  { key: 'blue', color: '#2456a8', css: '#7fb0ff', grad: ['#b9d4ff', '#3a7be0'], blanket: 1, attack: -1 },
];
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), Qt = new THREE.Quaternion();

// ---------- тексты: русский и английский ----------
const TEXT = {
  ru: {
    red: 'Красные', blue: 'Синие', loading: 'Загрузка степи…', ready: 'Готовьтесь!', go: 'Вперёд!', goal: 'ГОЛ!', goalBy: (t) => t,
    tug: 'Тартыс!', tugSub: 'Схватка за серке', stoleMe: 'Вырвал!', stoleThem: 'Серке вырвали', heldMe: 'Удержал!', heldThem: 'Не отдал',
    fumble: 'Выронил серке!', win: 'Победа', lose: 'Поражение', draw: 'Ничья', again: 'Ещё раз', stamina: 'Сила коня',
    btnTug: 'ВЫРВАТЬ', btnWhip: 'КАМЧА', btnRear: 'СВЕЧКА', mashKey: 'Жми E быстрее!', mashTap: 'Жми ВЫРВАТЬ быстрее!', canTug: '<kbd>E</kbd> — вырвать серке',
    help: '<kbd>W</kbd> вперёд · <kbd>S</kbd> стоп · <kbd>A</kbd><kbd>D</kbd> поворот · <kbd>Shift</kbd> камча · <kbd>E</kbd> вырвать серке · <kbd>R</kbd> свечка',
    canPass: '<kbd>E</kbd> — взять серке у своего', passMe: 'Пас!', ram: 'Таран!',
    helpTouch: 'Палец слева — куда скакать · ВЫРВАТЬ — отнять серке · КАМЧА — рывок',
    home: 'Аксай', btnThrow: 'БРОСОК', canThrow: 'Зажми <kbd>E</kbd> — сила, отпусти — бросок в казан', aimTouch: 'Держи БРОСОК — сила, отпусти — бросок', thrown: 'Бросок!', missed: 'Мимо казана!', unhorsed: 'Сбит с коня!', getUpKey: 'Жми <kbd>E</kbd> — встанешь быстрее', getUpTap: 'Жми ВЫРВАТЬ — встанешь быстрее',
    league: 'Лига аулов Жетысу', vs: 'Соперник', play: 'В седло!', next: 'Дальше', retry: 'Ещё раз', champion: 'Чемпион Жетысу!',
    stageOf: (a, b) => 'Аул ' + a + ' из ' + b, unlocked: 'Следующий соперник', menuSub: 'Командная скачка за тушу в предгорьях Алатау · 3 на 3',
  },
  en: {
    red: 'Red', blue: 'Blue', loading: 'Loading the steppe…', ready: 'Get ready!', go: 'Go!', goal: 'GOAL!', goalBy: (t) => t,
    tug: 'Tug of war!', tugSub: 'Fight for the serke', stoleMe: 'Stolen!', stoleThem: 'They stole it', heldMe: 'Held on!', heldThem: 'They held on',
    fumble: 'Fumble!', win: 'Victory', lose: 'Defeat', draw: 'Draw', again: 'Play again', stamina: 'Horse stamina',
    btnTug: 'GRAB', btnWhip: 'WHIP', btnRear: 'REAR UP', mashKey: 'Mash E!', mashTap: 'Tap GRAB fast!', canTug: '<kbd>E</kbd> — grab the serke',
    help: '<kbd>W</kbd> go · <kbd>S</kbd> stop · <kbd>A</kbd><kbd>D</kbd> steer · <kbd>Shift</kbd> whip · <kbd>E</kbd> grab the serke · <kbd>R</kbd> rear up',
    canPass: '<kbd>E</kbd> — take the serke from a teammate', passMe: 'Pass!', ram: 'Ram!',
    helpTouch: 'Left thumb — where to ride · GRAB — take the serke · WHIP — burst',
    home: 'Aksay', btnThrow: 'THROW', canThrow: 'Hold <kbd>E</kbd> for power, release to throw', aimTouch: 'Hold THROW for power, release to throw', thrown: 'Throw!', missed: 'Missed the kazan!', unhorsed: 'Unhorsed!', getUpKey: 'Mash <kbd>E</kbd> to get up faster', getUpTap: 'Tap GRAB to get up faster',
    league: 'Zhetysu village league', vs: 'Opponent', play: 'Ride!', next: 'Next', retry: 'Try again', champion: 'Zhetysu champion!',
    stageOf: (a, b) => 'Village ' + a + ' of ' + b, unlocked: 'Next opponent', menuSub: 'Team horseback fight for the carcass in the Alatau foothills · 3 vs 3',
  },
};
let lang = (() => { try { return localStorage.getItem('kokpar.lang'); } catch { return null; } })() || P.get('lang') || portal.portalLang() || (/^ru|^kk|^ky|^uk|^be/i.test(navigator.language) ? 'ru' : 'en');
const tr = (k) => TEXT[lang][k];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = THREE.MathUtils.clamp;

const crowd = SIM || (P.get('no') || '').includes('crowd') ? null : makeCrowd(scene, { camera }); // зрители и аул вокруг поля
// ---------- матч карьеры: соперник, его форма и сила (career.js) ----------
let fx = null; // текущий матч: { name, kit, diff, ko, final, arena }
const DEFAULT_FX = { id: 'kainar', name: 'Kainar', ko: false, final: false, arena: 'day', kit: career.makeKit('#2456a8', 'mountain'), diff: { pull: 0.06, react: 0.45, speed: 1 } };
let HB = { speed: 1, drain: 1, pull: 0, turn: 1, coat: [1.7, 1.7, 1.7] }; // прокачка коней клуба
const teamName = (t) => (t === 0 ? career.clubName('me') : fx && fx.id !== 'friend' && fx.id !== 'kainar-def' && career.CLUBS.some((k) => k.id === fx.id) ? career.clubName(fx.id, true) : (fx || DEFAULT_FX).name); // имя соперника — на текущем языке

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
if (!(P.get('no') || '').includes('marker')) scene.add(sackMarker); // ?no=marker — для обложек и ролика

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
  if (!(P.get('no') || '').includes('rings')) scene.add(ring);
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
    e.r.remount(); e.down = 0; if (e.stars) e.stars.visible = false;
  });
  // в первом розыгрыше первого матча туша ближе к игроку: первый подбор — его
  dropSack(new THREE.Vector3(first && rookie ? -9 * SWAP : 0, GROUND_Y, 0), new THREE.Vector3());
  state.tug = null;
  state.phase = 'countdown';
  state.intro = first && !SIM && !AI_PLAYER && !!fx && career.played() > 0;
  state.t = state.intro ? 5.6 : first ? 3.2 : 2.2;
  if (state.intro) banner(fx.label, ['#fff3c0', '#f0a01c'], 2.3, teamName(0) + '  —  ' + teamName(1));
  else banner(first ? '3' : tr('ready'));
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
  state.tug = null; // гол — тартыс окончен (иначе полоса «жми быстрее» висела поверх гола)
  state.t = 2.8;
  const k = kazans[team === 0 ? 1 : 0];
  // мешок летит на казан
  sack.carrier = null;
  if (landed) { sack.flight = null; sack.pos.set(k.x, KAZAN_TOP, 0); sack.vel.set(0, 0, 0); } // брошена — уже лежит на казане
  else sack.flight = { from: sack.pos.clone(), to: new THREE.Vector3(k.x, KAZAN_TOP, 0), t: 0 };
  banner(tr('goal'), TEAMS[team].grad, 2.4, teamName(team));
  state.events.push({ t: 'goal', team, landed: !!landed, me: !!scorer?.me });
  if (!SIM) cheer(team === me?.team);
  crowd?.cheer(3.5);
  state.cine = { t: 0, x: k.x, a0: Math.atan2(sack.pos.z, sack.pos.x - k.x) || 0 }; // гол крупным планом
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
  if (hit) to = new THREE.Vector3(k.x + (rnd() - 0.5) * 1.2, KAZAN_TOP - 0.05, (rnd() - 0.5) * 1.2);
  else { const a = rnd() * 6.283, r = KAZAN_R + 1.4 + rnd() * 2.2; to = new THREE.Vector3(k.x + Math.cos(a) * r, GROUND_Y, Math.sin(a) * r); }
  e.throw = { t: 0, to, d, hit };
}
// ---------- прицел игрока: сила качается 0→1→0, точка падения видна на земле ----------
const AIM_MAX = 13; // тушу в 30 кг дальше ~12 м не бросить — к казану надо прорваться
const aim = { p: 0, dir: 1, L: new THREE.Vector3(), hit: false };
const aimDots = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(26 * 3), 3)),
  new THREE.PointsMaterial({ color: '#ffe58a', size: 0.38, transparent: true, opacity: 0.9, depthWrite: false }));
const aimRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.05, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }));
aimDots.visible = aimRing.visible = false; aimDots.frustumCulled = false; aimRing.renderOrder = aimDots.renderOrder = 5; aimDots.material.depthTest = false;
scene.add(aimDots, aimRing);
const canAim = (e) => sack.carrier === e && !e.throw && !state.tug && throwInfo(e).d < AIM_MAX;
function startAim(e) { e.throw = { t: 0, aiming: true }; aim.p = 0; aim.dir = 1; }
function aimPoint(e) { // куда упадёт: вперёд по ходу коня, у казана чуть доворачивает на него
  const { k } = throwInfo(e), p = e.h.obj.position;
  let yaw = e.h.yaw;
  const want = Math.atan2(k.x - p.x, -p.z), dA = wrap(want - yaw);
  if (Math.abs(dA) < 0.22) yaw += dA * 0.85;
  const dist = 3 + aim.p * 9;
  aim.L.set(p.x + Math.sin(yaw) * dist, 0, p.z + Math.cos(yaw) * dist);
  aim.hit = Math.hypot(aim.L.x - k.x, aim.L.z) < KAZAN_R + 0.2;
  return dist;
}
function stepAim(dt) {
  const e = me, on = e && e.throw?.aiming;
  aimDots.visible = aimRing.visible = !!on;
  if (!on) return;
  aim.p += aim.dir * dt * 1.45;
  if (aim.p >= 1) { aim.p = 1; aim.dir = -1; } else if (aim.p <= 0) { aim.p = 0; aim.dir = 1; }
  const dist = aimPoint(e), top = aim.hit ? KAZAN_TOP : 0.05;
  aimRing.position.set(aim.L.x, top, aim.L.z);
  aimRing.material.color.set(aim.hit ? '#5dff7a' : '#ffffff');
  // дуга полёта точками: от рук над головой до точки падения
  const a = aimDots.geometry.attributes.position, s = sack.pos, arc = 1.2 + dist * 0.2;
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    a.setXYZ(i, s.x + (aim.L.x - s.x) * t, s.y + (top - s.y) * t + Math.sin(t * Math.PI) * arc, s.z + (aim.L.z - s.z) * t);
  }
  a.needsUpdate = true;
  aimDots.material.color.set(aim.hit ? '#5dff7a' : '#ffe58a');
}
function releaseAim(e) {
  if (!e.throw?.aiming) return;
  const dist = aimPoint(e), { k } = throwInfo(e);
  // на скаку рука дрожит: разброс растёт со скоростью
  const n = 0.35 + e.h.v * 0.05, nx = (rnd() - 0.5) * 2 * n, nz = (rnd() - 0.5) * 2 * n;
  const lx = aim.L.x + nx, lz = aim.L.z + nz, hit = Math.hypot(lx - k.x, lz) < KAZAN_R + 0.2;
  const to = hit ? new THREE.Vector3(k.x + (lx - k.x) * 0.3, KAZAN_TOP - 0.05, lz * 0.3) : new THREE.Vector3(lx, GROUND_Y, lz);
  Object.assign(e.throw, { aiming: false, to, d: dist, hit, t: Math.max(e.throw.t, WIND * 0.7) });
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
  if (sack.carrier === e) { dropSack(sack.pos.clone(), new THREE.Vector3(nx * 2.5, 2, nz * 2.5)); state.events.push({ t: 'fumble', me: !!e.me }); }
  if (state.tug && (state.tug.att === e || state.tug.car === e)) state.tug = null;
  const hv = e.h.v, fx = Math.sin(e.h.yaw), fz = Math.cos(e.h.yaw);
  const side = Math.sign(fz * nx - fx * nz) || 1;
  const flips = hv > 7.5 || rnd() < 0.3 ? 1 : 0; // на скаку — летит колесом
  e.r.fall(scene, fx * hv * 0.7 + nx * 2.5, 2.4 + flips * 1.4, fz * hv * 0.7 + nz * 2.5, side, flips);
  e.mash = 0;
  if (!SIM) tumble(e.h.obj.position.x, e.h.obj.position.z, flips ? 0.9 : 0.6);
  e.down = 3; e.wait = 0; e.stun = 3.3; e.pickCD = 3.5; e.tugCD = 3.5;
  state.events.push({ t: 'fall', team: e.team, me: !!e.me, x: e.h.obj.position.x, z: e.h.obj.position.z });
  if (!SIM) crowdShout('ooh');
  if (!SIM) neigh(e.h.obj.position.x, e.h.obj.position.z);
  if (!SIM && (e.me || e.team === me?.team)) banner(tr('unhorsed'), e.me ? null : TEAMS[e.team].grad, 1.1);
}
function stepFallen(e, dt) {
  if (!e.r.fallen) return;
  // конь без всадника сбавляет ход, разворачивается и подходит к хозяину
  const hp = e.h.obj.position, rp = e.r.root.position, d = Math.hypot(rp.x - hp.x, rp.z - hp.z);
  if (e.r.fallen.landed && d > 1.8 && e.down > 0) steerTo(e, rp.x, rp.z, d > 9 ? 3 : 1);
  else { e.h.gait = 0; e.h.steer = 0; }
  if (e.r.stepFall(dt, e.down < 0.95) && !SIM) { dustBurst(rp.x, rp.z, 6, 9); bump(rp.x, rp.z, 5); } // плюхнулся в пыль
  if (!SIM) dizzy(e, dt);
  // встаёт, только когда конь рядом (или если ждать слишком долго)
  e.wait = (e.wait || 0) + dt;
  if (e.down > 0.95 || d < 2.6 || e.wait > 7) e.down -= dt;
  if (e.down <= 0) { e.r.startMount(); e.stun = Math.min(e.stun, 0.8); e.pickCD = Math.min(e.pickCD, 1); e.tugCD = Math.min(e.tugCD, 1); } // запрыгивает в седло
}
// быстрый подъём: лёжа жмёшь «вырвать» — каждое нажатие сокращает лежание (конь далеко — встанешь и ждёшь его)
function mashUp(e) {
  const f = e.r.fallen;
  if (!f || !f.landed || f.mount != null || e.down <= 0) return;
  const hp = e.h.obj.position, rp = e.r.root.position, near = Math.hypot(rp.x - hp.x, rp.z - hp.z) < 2.6;
  e.down = Math.max(near ? 0.05 : 0.9, e.down - 0.28);
  e.mash = (e.mash || 0) + 1;
  e.r.jolt = Math.max(e.r.jolt, 0.5);
  if (!SIM) dustBurst(rp.x, rp.z, 2, 3);
}
// звёздочки над головой, пока лежит: три кружатся вокруг макушки
const STAR = (() => {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.06 : 0.15; sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  return { g: new THREE.ShapeGeometry(sh), m: new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide, fog: false }) };
})();
function dizzy(e, dt) {
  const f = e.r.fallen, on = f && f.landed && f.mount == null && e.r.stand < 0.6;
  if (!e.stars) {
    if (!on) return;
    e.stars = new THREE.Group();
    for (let i = 0; i < 3; i++) e.stars.add(new THREE.Mesh(STAR.g, STAR.m));
    scene.add(e.stars); e.starT = 0;
  }
  e.stars.visible = on;
  if (!on) return;
  e.starT += dt;
  const hb = e.r.bone('Head');
  if (hb) hb.getWorldPosition(e.stars.position); else e.stars.position.copy(e.r.root.position);
  e.stars.position.y += 0.32;
  e.stars.children.forEach((s, i) => {
    const a = e.starT * 4 + (i / 3) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.36, Math.sin(e.starT * 6 + i) * 0.06, Math.sin(a) * 0.36);
    s.quaternion.copy(camera.quaternion); s.rotateZ(e.starT * 3);
  });
}

// пас: свой несущий рядом отдаёт серке из рук в руки
function canPass(e) {
  const c = sack.carrier;
  return c && c !== e && c.team === e.team && !state.tug && e.pickCD <= 0 && !e.r.fallen && e.h.obj.position.distanceTo(c.h.obj.position) < TUG_RANGE + 0.6;
}
// ---------- тартыс ----------
function canTug(att, car, range = TUG_RANGE) {
  if (!car || att.team === car.team || att.tugCD > 0 || att.stun > 0 || state.tug) return false;
  return att.h.obj.position.distanceTo(car.h.obj.position) < range;
}
function startTug(att) {
  const human = (e) => (e.me && !AI_PLAYER) || e.remote, car = sack.carrier; // друг по сети — тоже живой
  // удача на весь тартыс; живому игроку удачи нет — тянет только тем, как часто жмёт (раньше полоса сама ползла в его пользу)
  const luck = (e, o) => (human(e) ? 0 : human(o) ? Math.abs(rnd() - 0.5) * 0.4 : (rnd() - 0.5) * 0.5);
  state.tug = { att, car, bar: 0, t: 0, ra: luck(att, car), rc: luck(car, att) }; // удача на весь тартыс (раньше бралась каждый кадр и усреднялась в ноль — нападающий-бот не вырывал никогда)
  state.events.push({ t: 'tug' });
  if (!SIM && (att.me || sack.carrier.me)) banner(tr('tug'), null, 1.1, tr('tugSub'));
}
function tugPress(e) { // игрок жмёт «тарт»: дёргает мешок на себя
  const T = state.tug;
  if (!T) return;
  if (T.att === e) { T.bar += 0.13; T.presses = (T.presses || 0) + 1; }
  if (!SIM) tugJolt(T, e === T.att ? 1 : -1, e.me);
  else if (T.car === e) T.bar -= 0.13;
}
function stepTug(dt) {
  const T = state.tug;
  if (!T) return;
  if (sack.carrier !== T.car) { state.tug = null; return; } // туша ушла из рук (бросок, удар) — тартыс окончен
  T.t += dt;
  const d = T.att.h.obj.position.distanceTo(T.car.h.obj.position);
  const pull = (e) => ((e.me && !AI_PLAYER ? 0.42 : 0.42 + (e.team === 1 && !SIM ? DIFF.pull : 0) + (e === T.att ? T.ra : T.rc)) + (e.team === 0 ? HB.pull : 0)) * (0.65 + 0.35 * e.stamina / 100);
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
  if (!SIM && (T.jt = (T.jt || 0) - dt) < 0) { T.jt = 0.28 + rnd() * 0.25; tugJolt(T, rnd() < 0.5 ? 1 : -1, false); } // кони дёргают друг друга
  let winner = null;
  if (((T.att.me && !AI_PLAYER) || T.att.remote) && (T.presses || 0) < 3) T.bar = Math.min(T.bar, 0); // игрок-нападающий не жмёт — сама не вырвется
  if (T.bar >= 1) winner = 'att';
  else if (T.bar <= -1) winner = 'car';
  else if (T.t > 3.6) winner = T.bar > 0.05 ? 'att' : 'car';
  if (!winner) return;
  state.tug = null;
  if (winner === 'att') {
    T.car.tugCD = T.att.me ? 1.0 : 1.6; T.car.pickCD = 1.0; T.car.stun = 0.3; // у игрока вырвали — бот сразу снова лезет
    T.att.stats.tugsWon++;
    giveSack(T.att);
    if (!SIM) crowdShout('ah');
    if (!SIM && (T.att.me || T.car.me)) banner(T.att.me ? tr('stoleMe') : tr('stoleThem'), TEAMS[T.att.team].grad, 1.1);
  } else {
    T.att.tugCD = 2.0; T.att.stun = 0.5;
    T.car.stats.tugsWon++;
    if (!SIM && (T.att.me || T.car.me)) banner(T.car.me ? tr('heldMe') : tr('heldThem'), TEAMS[T.car.team].grad, 1.1);
  }
  if (!SIM) tugEndFx(T, winner);
  state.events.push({ t: 'tugEnd', winner, team: (winner === 'att' ? T.att : T.car).team, me: !!(T.att.me || T.car.me) });
}

// ---------- боты ----------
const GRIP = Number(P.get('grip') || 0.07); // ~45% тартысов выигрывает нападающий
const DIFF = { pull: Number(P.get('pull') || 0.06), react: 0.45, speed: 1 }; // сила соперника — из лиги (applyStage)
// перекрасить команду: всадники, тоқымы, кольца, казан, флаг, табло
const painted = ['', ''];
// геометрия, материалы и текстуры объекта — в видеопамяти, сами не уходят
function disposeTree(o) {
  o.traverse((x) => {
    x.geometry?.dispose();
    for (const m of [x.material].flat()) { if (!m) continue; for (const v of Object.values(m)) if (v?.isTexture) v.dispose(); m.dispose(); }
  });
}
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
    k.g.remove(k.body); disposeTree(k.body); k.body = makeKazan(def.color, KAZAN_R); k.g.add(k.body); // старый казан освобождаем — иначе видеопамять росла с каждым соперником
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
  setArena(P.get('arena') || fx.arena);
  crowd?.paint(TEAMS[0].color, TEAMS[1].color);
  if (!SIM) { el.nmR.textContent = teamName(0); el.nmB.textContent = teamName(1); }
  if (!SIM && !P.has('pull')) Object.assign(DIFF, fx.diff);
  // самый первый матч: соперники заметно слабее — первый гол реально забить за полминуты
  rookie = !SIM && !online.role && career.played() === 0 && !P.has('len');
  if (rookie) Object.assign(DIFF, { pull: -0.1, react: 1.1, speed: 0.9 });
  for (const e of ents) if (e.team === 0) e.h.turnMul = HB.turn;
  paintCoat();
}
function paintCoat() { if (me) setCoat(me.h.obj, HB.coat); }
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
    sprint = d > 6 && d < 30 && e.stamina > 30; // к ничьей туше — на камче, кто первый
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
    if (!state.tug && ti.d < 11 && ti.d > SCORE_R + 0.5 && ti.chance > 0.6) { // в тартысе не бросает
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
    // целимся в бок несущего, чуть впереди — чтобы встать стремя в стремя; вблизи — без упреждения, иначе на повороте проскакивает мимо
    const d = Math.hypot(cp.x - p.x, cp.z - p.z), lead = d < 8 ? 0.4 : carrier.h.v * 0.35 + 0.5;
    tx = cp.x + Math.sin(cy) * lead + Math.cos(cy) * 1.9 * side;
    tz = cp.z + Math.cos(cy) * lead - Math.sin(cy) * 1.9 * side;
    gait = d < 6 && e.h.v > carrier.h.v + 1.5 ? 3 : 4; sprint = d < 12 && d > 4 && e.stamina > 12; // рывок на камче — уже вблизи, иначе выдыхается и отстаёт
    // за игроком с тушей скачут во весь опор: чем дальше отстали, тем злее (раньше догоняли по 12–25 с)
    e.boost = carrier.me ? 1.14 + Math.min(0.12, d * 0.005) : 1;
    if (canTug(e, carrier, carrier.me ? TUG_RANGE + 0.6 : TUG_RANGE)) { b.react += dt; if (b.react > (carrier.me ? Math.min(DIFF.react, 0.5) : DIFF.react) + rnd() * 0.3) { startTug(e); b.react = 0; } } else b.react = 0;
  } else if (b.role === 'guard') {
    const cp = carrier.h.obj.position;
    // третий встаёт на пути несущего к своему казану; против игрока — выходит навстречу
    const k = carrier.me ? 0.6 : 0.3;
    tx = b.own.x + (cp.x - b.own.x) * k; tz = cp.z * (carrier.me ? 0.85 : 0.5);
    gait = Math.hypot(tx - p.x, tz - p.z) > 5 ? 4 : 2;
    if (carrier.me && canTug(e, carrier, TUG_RANGE + 0.6)) { b.react += dt; if (b.react > 0.6 + rnd() * 0.3) { startTug(e); b.react = 0; } }
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
  if (e.code === 'KeyP' && !SIM) togglePause();
  if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); if (me && !online.role && canAim(me) && !AI_PLAYER) startAim(me); else tugTap = true; }
  if (e.code === 'KeyR' && online.role === 'guest') online.myRear++;
  else if (e.code === 'KeyR' && canRear()) me.h.rear(); // свечка — только стоя
});
addEventListener('keyup', (e) => { keys[e.code] = false; if ((e.code === 'KeyE' || e.code === 'Space') && me) releaseAim(me); });
function readInput() { // что сейчас жмёт этот игрок
  const h = me.h, o = { s: 0, g: 0, w: !!(keys.ShiftLeft || keys.ShiftRight || whipHeld) };
  if (stick) {
    const want = cam.yaw + Math.atan2(-stick.dx, -stick.dy), mag = Math.min(1, Math.hypot(stick.dx, stick.dy));
    if (mag > 0.2) { o.s = clamp(wrap(want - h.yaw) * 2.2, -1, 1); o.g = mag > 0.75 ? 4 : mag > 0.45 ? 3 : 2; }
  } else {
    o.s = (keys.KeyA || keys.ArrowLeft || keys.KeyQ ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
    o.g = keys.KeyW || keys.ArrowUp || keys.KeyZ ? 4 : keys.KeyS || keys.ArrowDown ? 0 : o.s ? 1 : 0;
  }
  return o;
}
function applyInput(e, o, tap) { // нажатия друга по сети: то же, что у своего игрока
  if (e.r.fallen) return;
  e.h.steer = o.s; e.h.gait = e.h.rearClock != null ? 0 : o.g; e.wantSprint = o.w;
  if (!tap) return;
  if (state.tug && (state.tug.att === e || state.tug.car === e)) tugPress(e);
  else if (sack.carrier === e && throwInfo(e).d < THROW_MAX) throwSack(e);
  else if (sack.carrier && canTug(e, sack.carrier)) startTug(e);
  else if (canPass(e)) giveSack(e);
}
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
  e.h.speedMul = (e.sprint > 0 ? 1.22 : 1) * (sack.carrier === e ? 0.9 : 1) * (e.stun > 0 ? 0.6 : 1) * (tugging ? 0.75 : 1) * (e.tired ? 0.82 : 1) * (e.team === 1 ? DIFF.speed : HB.speed) * (e.bot?.role === "chase" && !e.me ? e.boost || 1 : 1);
}
function stepSack(dt) {
  if (sack.flight) { // летит: после гола на казан или брошена
    const f = sack.flight; f.t = Math.min(1, f.t + dt / (f.T || 0.62));
    sack.pos.lerpVectors(f.from, f.to, f.t); sack.pos.y += Math.sin(f.t * Math.PI) * (f.arc || 3);
    sack.mesh.position.copy(sack.pos);
    sack.mesh.rotation.z = Math.sin(f.t * Math.PI) * 0.7; // в воздухе чуть переворачивается
    sack.mesh.rotation.x += (sack.lie - sack.mesh.rotation.x) * Math.min(1, dt * 4);
    if (f.t >= 1 && f.kind === 'throw') {
      sack.flight = null;
      if (f.hit && state.phase === 'play') goal(f.team, f.scorer, true);
      else {
        dropSack(f.to.clone().setY(GROUND_Y + 0.3), new THREE.Vector3((rnd() - 0.5) * 3, 1.2, (rnd() - 0.5) * 3));
        state.events.push({ t: 'miss' });
        if (!SIM) crowdShout('ooh');
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
    const out = KAZAN_R + 1.05; // за внешний край покрышек, чтобы туша не пряталась под ними
    if (d < out) {
      const ux = d > 0.01 ? dx / d : Math.cos(rnd() * 6.28), uz = d > 0.01 ? sack.pos.z / d : Math.sin(rnd() * 6.28);
      sack.pos.x = k.x + ux * out; sack.pos.z = uz * out;
      sack.vel.x = ux * 1.5; sack.vel.z = uz * 1.5; // скатывается наружу
    }
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
    if (d < 5 && sack.pos.y < 1 && !e.r.fallen) {
      e.dip = Math.max(e.dip || 0, Math.min(1, 1.25 - d / 4));
      V.set(sack.pos.x - e.h.obj.position.x, 0, sack.pos.z - e.h.obj.position.z);
      e.dipSide = Math.sign(Math.cos(e.h.yaw) * V.x - Math.sin(e.h.yaw) * V.z) || 1;
    }
    if (d < bd && sack.pos.y < 1) { bd = d; best = e; }
  }
  if (best) giveSack(best);
}
function onHit(a, b, imp, nx, nz) {
  if (!SIM) impactFx(a, b, imp, nx, nz);
  {
    const ea = ents.find((x) => x.h === a), eb = ents.find((x) => x.h === b);
    if (ea && eb && ea.team !== eb.team && imp > 6.2) {
      const va = a.v * (Math.sin(a.yaw) * nx + Math.cos(a.yaw) * nz), vb = b.v * (Math.sin(b.yaw) * nx + Math.cos(b.yaw) * nz);
      const victim = va > -vb ? eb : ea, s = victim === eb ? 1 : -1;
      const ram = (victim === eb ? ea : eb).sprint > 0; // таран на камче
      if (rnd() < (sack.carrier === victim ? 0.35 : 0.14) * (ram ? 1.6 : 1)) fallRider(victim, nx * s, nz * s);
    }
  }
  // сильный толчок в несущего — может выронить мешок
  for (const [hit, by] of [[a, b], [b, a]]) {
    const e = ents.find((x) => x.h === hit), o = ents.find((x) => x.h === by);
    if (!e || !o || sack.carrier !== e || o.team === e.team || imp < 5) continue;
    const ram = o.sprint > 0;
    if (rnd() < (ram ? 0.6 : 0.35)) {
      if (ram && !SIM && o.me) banner(tr('ram'), null, 0.9);
      const s = hit === a ? -1 : 1;
      dropSack(sack.pos.clone(), new THREE.Vector3(nx * s * 3 + Math.sin(e.h.yaw) * e.h.v * 0.4, 2.5, nz * s * 3 + Math.cos(e.h.yaw) * e.h.v * 0.4));
      e.pickCD = 1.2;
      state.tug = null;
      state.events.push({ t: 'fumble', me: !!(e.me || o.me) });
      if (!SIM && (e.me || o.me)) banner(tr('fumble'), null, 1);
    }
  }
}
let tension = 0;
function step(dt) {
  state.t -= dt;
  crowd?.update(dt);
  if (!SIM) { // толпа заводится, когда серке везут к казану
    let want = 0;
    const c = sack.carrier;
    if (state.phase === 'play' && c) { const k = kazans[c.team === 0 ? 1 : 0]; want = clamp(1 - (Math.hypot(c.h.obj.position.x - k.x, c.h.obj.position.z) - 7) / 28, 0, 1); }
    if (state.tug) want = Math.max(want, 0.4);
    if (state.phase === 'goal') want = 0.3;
    tension += (want - tension) * (1 - Math.exp(-dt * 2));
    crowdTension(tension, ['play', 'goal', 'countdown'].includes(state.phase) && !paused);
  }
  if (state.phase === 'countdown') {
    for (const e of ents) { e.h.gait = 0; e.h.steer = 0; }
    if (!SIM) { const n = Math.ceil(state.t - 0.2); if (n > 0 && n <= 3 && el.bigText.textContent !== String(n) && state.t < 3.2) banner(String(n)); }
    if (state.t <= 0) { state.phase = 'play'; banner(tr('go'), null, 0.9); }
  } else if (state.phase === 'play') {
    state.clock -= dt;
    roleT -= dt;
    if (roleT <= 0) { assignRoles(); roleT = 0.3; }
    for (const e of ents) if ((!e.me || AI_PLAYER) && !e.remote) think(e, dt);
    if (me && !AI_PLAYER && !me.r.fallen) playerInput(dt);
    else if (me && !AI_PLAYER && tugTap) { tugTap = false; if (!online.role) mashUp(me); }
    if (online.remote) { const r = online.remote; applyInput(r, online.inp, online.taps > online.tapsDone); online.tapsDone = Math.min(online.taps, online.tapsDone + 1); if (online.rear > online.rearDone) { online.rearDone = online.rear; if (r.h.v < 1.5 && !r.r.fallen && sack.carrier !== r) r.h.rear(); } }
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
    e.reach *= Math.exp(-dt * 4); e.dip = (e.dip || 0) * Math.exp(-dt * 3.5); stepFallen(e, dt); stepEnt(e, dt);
    if (e.throw) e.throw.t = e.throw.aiming ? Math.min(WIND * 0.95, e.throw.t + dt) : e.throw.t + dt;
    e.throwT = e.throw ? e.throw.t : e.throwT >= 0 && e.throwT < 0.8 ? e.throwT + dt : -1; // для позы: замах и доводка рук
  }
  stepTug(dt);
  for (const e of ents) e.h.update(dt);
  collide(ents.map((e) => e.h), onHit);
  for (const e of ents) for (const k of kazans) pushOut(e.h, k.x, 0, KAZAN_R);
  stepSack(dt);
  if (!SIM) { stepAim(dt); stepTut(dt); }
  // гол: несущий у чужого казана
  if (state.phase === 'play' && sack.carrier) {
    const c = sack.carrier, k = kazans[c.team === 0 ? 1 : 0];
    // у самого казана всадник закидывает тушу руками — гол только когда она легла в казан
    if (Math.hypot(c.h.obj.position.x - k.x, c.h.obj.position.z) < SCORE_R && (!c.throw || c.throw.aiming)) {
      c.throw = { t: Math.max(c.throw?.t || 0, WIND * 0.5), to: new THREE.Vector3(k.x + (rnd() - 0.5) * 0.8, KAZAN_TOP - 0.05, (rnd() - 0.5) * 0.8), d: KAZAN_R, hit: true };
    }
  }
  for (const e of ents) {
    e.r.throwT = e.throwT ?? -1; e.r.carrying = sack.carrier === e;
    e.r.dip = e.dip || 0; e.r.dipSide = e.dipSide || -1;
    e.r.update(dt, e.h.v, e.reach, e.reachSide);
    e.ring.position.x = e.h.obj.position.x; e.ring.position.z = e.h.obj.position.z;
  }
  if (!SIM) {
    const bobM = Math.sin(performance.now() / 250) * 0.15, cr = sack.carrier;
    sackMarker.visible = !sack.flight && state.phase !== 'goal';
    if (cr) { const p = cr.h.obj.position; sackMarker.position.set(p.x, 3.35 + bobM, p.z); sackMarker.material.color.set(TEAMS[cr.team].css); sackMarker.scale.setScalar(1.25); }
    else { sackMarker.position.set(sack.pos.x, 2.4 + bobM, sack.pos.z); sackMarker.material.color.set('#ffd23a'); sackMarker.scale.setScalar(1); }
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
  if (online.role) { onlineEnd(); return; }
  const ev = state.events;
  const sum = career.report(state.score[0], state.score[1], {
    myGoals: ev.filter((x) => x.t === 'goal' && x.me).length, throwGoals: ev.filter((x) => x.t === 'goal' && x.team === 0 && x.landed).length,
    tugs: ev.filter((x) => x.t === 'tugEnd' && x.team === 0).length, falls: ev.filter((x) => x.t === 'fall' && x.team === 1).length,
  });
  el.banner.classList.remove('on'); bannerT = 0; delete el.hint.dataset.keep; el.hint.textContent = ''; el.tug.hidden = true;
  career.showResult(sum);
  el.menu.hidden = false;
  if (sum.res === 'win') { cheer(true); portal.happytime(); }
}

// ---------- камера ----------
const cam = { pos: new THREE.Vector3(-40, 8, 0), look: new THREE.Vector3(), yaw: Math.PI / 2 };
function updateCamera(dt, snap) {
  const h = me.h, p = h.obj.position;
  if (state.phase === 'goal' && state.cine && !snap) { // облёт казана, куда легла туша
    const c = state.cine; c.t += dt;
    const a = c.a0 + 0.6 + c.t * 0.32, r = 10.5 - Math.min(2.5, c.t * 1.2);
    V.set(c.x + Math.cos(a) * r, 3.1 + Math.sin(c.t * 0.8) * 0.4, Math.sin(a) * r);
    cam.pos.lerp(V, c.t < 0.05 ? 1 : 1 - Math.exp(-dt * 6));
    cam.look.lerp(V2.set(c.x, 1.3, 0), c.t < 0.05 ? 1 : 1 - Math.exp(-dt * 6));
    camera.position.copy(cam.pos); camera.lookAt(cam.look);
    followSun(c.x, 0);
    return;
  }
  if (state.cine && state.phase !== 'goal') { state.cine = null; cam.yaw = h.yaw; }
  if (state.intro && state.phase === 'countdown' && state.t > 3.0 && !snap) { // облёт поля перед стартом
    const k = (5.6 - state.t) / 2.6, a = -0.9 + k * 1.3;
    V.set(Math.sin(a) * 34, 12 - k * 4, Math.cos(a) * 34);
    cam.pos.copy(V); cam.look.set(0, 1, 0);
    camera.position.copy(cam.pos); camera.lookAt(cam.look);
    followSun(0, 0);
    return;
  }
  let dy = wrap(h.yaw - cam.yaw);
  cam.yaw = snap ? h.yaw : cam.yaw + dy * (1 - Math.exp(-dt * 2.8));
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
  const dist = 7.2 + h.v * 0.12, high = 3.3 + h.v * 0.04;
  V.set(p.x - fx * dist, high, p.z - fz * dist);
  V2.set(p.x + fx * 5, 1.2, p.z + fz * 5);
  // «камера тартыса»: игрок тянет тушу — камера подходит ближе и сбоку, оба всадника и туша крупно (иначе тартыс мелкий и не читается)
  const T = state.tug, myTug = T && (T.att === me || T.car === me);
  cam.tugK = (cam.tugK || 0) + ((myTug ? 1 : 0) - (cam.tugK || 0)) * (1 - Math.exp(-dt * (myTug ? 5 : 2.5)));
  if (cam.tugK > 0.01 && T) {
    const o = T.att === me ? T.car : T.att, op = o.h.obj.position;
    const mx = (p.x + op.x) / 2, mz = (p.z + op.z) / 2;
    let sx = op.z - p.z, sz = -(op.x - p.x); const l = Math.hypot(sx, sz) || 1; sx /= l; sz /= l; // поперёк линии «я — соперник»
    if (sx * fx + sz * fz > 0) { sx = -sx; sz = -sz; } // со стороны, откуда смотрели (сзади), чтобы не перескакивать
    const k = cam.tugK;
    V.lerp(V3.set(mx + sx * 4.6 - fx * 2.4, 2.1, mz + sz * 4.6 - fz * 2.4), k);
    V2.lerp(V3.set(mx, 1.45, mz), k);
  }
  cam.pos.lerp(V, snap ? 1 : 1 - Math.exp(-dt * 10));
  cam.look.lerp(V2, snap ? 1 : 1 - Math.exp(-dt * 8));
  camera.position.copy(cam.pos);
  camera.lookAt(cam.look);
  const fov = 58 + Math.min(h.v, 12) * 0.6 + (me.sprint > 0 ? 4 : 0) - (cam.tugK || 0) * 8; // в тартысе — чуть «телевик», плотнее
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix(); }
  followSun(cam.look.x, cam.look.z);
  setListener(camera.position.x, camera.position.z, cam.yaw);
  ambience(h.v, riverDist(camera.position.x, camera.position.z));
}

// ---------- «сочность»: тряска камеры, замирание кадра на ударе, салют на гол, +₸ ----------
// по событиям матча: всё, что касается игрока, ощущается сильнее
const juice = { trauma: 0, stop: 0, slow: 0, seen: 0, t: 0 };
const CONF = 180;
const confetti = (() => {
  const g = new THREE.PlaneGeometry(0.24, 0.13);
  const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
  const im = new THREE.InstancedMesh(g, m, CONF);
  im.count = 0; im.frustumCulled = false;
  const p = [], c = new THREE.Color();
  for (let i = 0; i < CONF; i++) { p.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), life: 0 }); im.setColorAt(i, c.set('#fff')); }
  scene.add(im);
  return { im, p };
})();
function burst(x, z, color) { // салют над казаном: цвет команды, золото, белый
  const c = new THREE.Color(), cols = [color, color, '#ffcf3a', '#ffffff'];
  confetti.p.forEach((q, i) => {
    const a = rnd() * 6.283, s = 3 + rnd() * 5;
    q.pos.set(x + (rnd() - 0.5), 2.2, z + (rnd() - 0.5));
    q.vel.set(Math.cos(a) * s * 0.5, 6 + rnd() * 6, Math.sin(a) * s * 0.5);
    q.rot.set(rnd() * 6, rnd() * 6, rnd() * 6); q.spin.set(rnd() * 12 - 6, rnd() * 12 - 6, rnd() * 12 - 6);
    q.life = 2.2 + rnd() * 1.4;
    confetti.im.setColorAt(i, c.set(cols[i % cols.length]));
  });
  confetti.im.instanceColor.needsUpdate = true;
  confetti.im.count = CONF;
}
const Mc = new THREE.Matrix4(), Qc2 = new THREE.Quaternion(), Sc = new THREE.Vector3(1, 1, 1);
function stepConfetti(dt) {
  if (!confetti.im.count) return;
  let alive = 0;
  confetti.p.forEach((q, i) => {
    if (q.life > 0) {
      q.life -= dt; alive++;
      q.vel.y -= 9.8 * dt * 0.55; q.vel.multiplyScalar(Math.exp(-dt * 1.4)); // бумажки тормозят воздухом
      q.pos.addScaledVector(q.vel, dt);
      if (q.pos.y < 0.05) { q.pos.y = 0.05; q.vel.set(0, 0, 0); q.spin.multiplyScalar(0.9); }
      q.rot.x += q.spin.x * dt; q.rot.y += q.spin.y * dt; q.rot.z += q.spin.z * dt;
    }
    const s = q.life > 0 ? Math.min(1, q.life * 2) : 0;
    Sc.setScalar(s);
    confetti.im.setMatrixAt(i, Mc.compose(q.pos, Qc2.setFromEuler(q.rot), Sc));
  });
  confetti.im.instanceMatrix.needsUpdate = true;
  if (!alive) confetti.im.count = 0;
}
function popMoney(text) { // «+150 ₸» всплывает над полем
  const d = document.createElement('div');
  d.className = 'pop-money disp'; d.textContent = text;
  (document.getElementById('stage') || document.body).appendChild(d);
  setTimeout(() => d.remove(), 1500);
}
function juiceEvents() {
  const ev = state.events;
  if (juice.seen > ev.length) juice.seen = 0; // новый матч
  for (; juice.seen < ev.length; juice.seen++) {
    const e = ev[juice.seen];
    if (e.t === 'goal') {
      const k = kazans[e.team === 0 ? 1 : 0];
      burst(k.x, 0, TEAMS[e.team].color);
      juice.trauma = Math.max(juice.trauma, e.team === me.team ? 0.55 : 0.3);
      if (e.team === me.team && !online.role) popMoney('+' + (150).toLocaleString('ru-RU') + ' ₸');
    } else if (e.me && (e.t === 'fall' || e.t === 'fumble')) { juice.trauma = Math.max(juice.trauma, 0.7); juice.stop = 0.09; }
    else if (e.me && e.t === 'tugEnd') { juice.trauma = Math.max(juice.trauma, 0.4); juice.stop = 0.06; }
    else if (e.t === 'fall') juice.trauma = Math.max(juice.trauma, 0.15);
    if (e.t === 'fall' && (e.me || Math.hypot(camera.position.x - e.x, camera.position.z - e.z) < 22)) juice.slow = Math.max(juice.slow, e.me ? 0.55 : 0.35); // падение рядом — зрелище: на миг замедленно
  }
}
// облако пыли и комья в точке (удар, рывок, падение)
function dustBurst(x, z, n, power) {
  const p = new THREE.Vector3(x, 0, z);
  for (let i = 0; i < n; i++) { const a = rnd() * 6.283; puff(p, power, Math.cos(a), Math.sin(a)); }
}
// столкновение коней: пыль и комья в точке контакта, всадников качает от толчка, игроку — тряска и миг замирания
function impactFx(a, b, imp, nx, nz) {
  if (imp < 4) return;
  const ea = ents.find((x) => x.h === a), eb = ents.find((x) => x.h === b);
  if (!ea || !eb) return;
  const pa = a.obj.position, pb = b.obj.position, k = Math.min(1, (imp - 4) / 6);
  dustBurst((pa.x + pb.x) / 2, (pa.z + pb.z) / 2, 2 + Math.round(k * 4), 6 + k * 6);
  for (const [e, s] of [[ea, -1], [eb, 1]]) { // качнуло вбок от удара: по оси «бок коня» (нормаль удара в осях коня)
    const side = Math.sign(Math.cos(e.h.yaw) * nx * s - Math.sin(e.h.yaw) * nz * s) || 1;
    e.r.kick(side * (1.2 + k * 2.6), -k * 1.2);
  }
  if (ea.me || eb.me) { juice.trauma = Math.max(juice.trauma, 0.25 + k * 0.35); if (k > 0.5) juice.stop = Math.max(juice.stop, 0.05); }
}
// рывок в тартысе: оба всадника дёргаются в сторону тянущего, между конями пыль
function tugJolt(T, dir, mine) {
  const s = dir > 0 ? 1 : -1;
  T.att.r.kick(0.9 * s * (T.att.reachSide || 1), -0.5);
  T.car.r.kick(-0.9 * s * (T.car.reachSide || 1), -0.5);
  const pa = T.att.h.obj.position, pc = T.car.h.obj.position;
  if (rnd() < 0.7) dustBurst((pa.x + pc.x) / 2, (pa.z + pc.z) / 2, 1, 7);
  if (mine) juice.trauma = Math.min(0.35, juice.trauma + 0.1);
}
// конец тартыса: проигравшего сильно качает назад, облако пыли, на миг замедление (если рядом с игроком)
function tugEndFx(T, winner) {
  const lose = winner === 'att' ? T.car : T.att, win = winner === 'att' ? T.att : T.car;
  lose.r.kick((lose.reachSide || 1) * 3.2, 2.2);
  win.r.kick(-(win.reachSide || 1) * 1.2, -1.4);
  const p = lose.h.obj.position;
  dustBurst(p.x, p.z, 4, 9);
  if (camera.position.distanceTo(p) < 22) juice.slow = Math.max(juice.slow, 0.28);
}
function shakeCamera(dt) {
  juice.t += dt;
  if (juice.trauma <= 0.001) return;
  const s = juice.trauma * juice.trauma, t = juice.t * 32;
  camera.position.x += Math.sin(t * 1.1) * s * 0.28; camera.position.y += Math.sin(t * 1.7 + 1) * s * 0.18; camera.position.z += Math.sin(t * 1.3 + 2) * s * 0.28;
  camera.rotateZ(Math.sin(t * 0.9 + 3) * s * 0.035);
  juice.trauma = Math.max(0, juice.trauma - dt * 1.6);
}

// ---------- интерфейс ----------
const el = Object.fromEntries(['menu', 'tut', 'pause', 'pauseBtn', 'pow', 'powbar', 'scR', 'scB', 'nmR', 'nmB', 'clock', 'banner', 'stam', 'stamlbl', 'tug', 'tugbar', 'tugtip', 'hint', 'load', 'loadtxt', 'stick', 'btnTug', 'btnWhip', 'arrow', 'lang'].map((id) => [id, document.getElementById(id)]));
el.bigText = el.banner.querySelector('.big'); el.subText = el.banner.querySelector('.small');
const CREDITS = 'Рельеф / Terrain: SRTM (USGS), AWS Terrain Tiles · Снимок / Imagery: EOxCloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0 · Конь / Horse: Warhorse Lite by Literock Studios · Всадник / Rider: Heraklios by A. Dizon (Mixamo)';
for (const c of document.querySelectorAll('[data-credits]')) c.textContent = CREDITS;
function applyLang() {
  document.documentElement.lang = lang; globalThis.__kokparLang = lang;
  document.querySelector('[data-turn]').textContent = lang === 'ru' ? 'Поверни телефон горизонтально' : 'Turn your phone sideways';
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
// табло пишет в страницу только то, что поменялось: каждая запись текста/стиля — пересчёт страницы, на телефоне это заметно
const txt = (n, v) => { v = String(v); if (n.textContent !== v) n.textContent = v; };
const html = (n, v) => { if (n._h !== v || n.innerHTML !== n._hr) { n.innerHTML = v; n._h = v; n._hr = n.innerHTML; } };
const sty = (n, p, v) => { const k = '_s' + p; if (n[k] !== v) { n[k] = v; n.style[p] = v; } }; // браузер переписывает значение по-своему — сравниваем с тем, что ставили сами
const hid = (n, v) => { v = !!v; if (n.hidden !== v) n.hidden = v; };
function hud(dt) {
  bannerT -= dt;
  if (bannerT <= 0) el.banner.classList.remove('on');
  txt(el.scR, state.score[0]); txt(el.scB, state.score[1]);
  const c = Math.ceil(state.clock);
  txt(el.clock, `${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`);
  if (state.golden) txt(el.clock, '⚡');
  sty(el.stam, 'width', me.stamina + '%');
  sty(el.stam, 'background', me.stamina < 25 ? 'linear-gradient(90deg,#8f1418,#e0393e)' : '');
  const T = state.tug, mine = T && (T.att === me || T.car === me);
  hid(el.tug, !mine);
  if (mine) {
    const v = clamp(T.att === me ? T.bar : -T.bar, -1, 1); // + — в мою пользу
    sty(el.tugbar, 'left', `${50 + v * 50}%`);
    txt(el.tugtip, touch ? tr('mashTap') : tr('mashKey'));
  }
  // подсказка «можно тянуть»
  const nearKazan = sack.carrier === me && throwInfo(me).d < AIM_MAX;
  const aiming = !!me.throw?.aiming;
  hid(el.pow, !aiming);
  if (aiming) { sty(el.powbar, 'height', (aim.p * 100).toFixed(1) + '%'); el.pow.classList.toggle('hit', aim.hit); }
  txt(el.btnTug, nearKazan ? tr('btnThrow') : tr('btnTug'));
  const pass = !T && canPass(me);
  if (touch) { const lbl = canRear() ? tr('btnRear') : tr('btnWhip'); txt(el.btnWhip, lbl); }
  const can = !T && sack.carrier && (canTug(me, sack.carrier) || nearKazan || pass);
  el.btnTug.classList.toggle('ready', !!(can || mine || me.r.fallen?.landed));
  // лежит на земле — главное сейчас: как встать быстрее (даже поверх обучения и стартовой справки)
  if (me.r.fallen?.landed && me.r.fallen.mount == null && me.down > 0.95 && !online.role) { delete el.hint.dataset.keep; html(el.hint, touch ? tr('getUpTap') : tr('getUpKey')); }
  else if (tut.on && !el.tut.hidden) { if (!el.hint.dataset.keep) txt(el.hint, ''); }
  else if (can && nearKazan) html(el.hint, touch ? tr('aimTouch') : tr('canThrow'));
  else if (can && !touch) html(el.hint, pass ? tr('canPass') : tr('canTug'));
  else if (!el.hint.dataset.keep) txt(el.hint, '');
  if (state.phase === 'menu') txt(el.hint, ''); // под меню подсказок нет
  // стрелка к цели по краю экрана: к мешку или к чужому казану
  const target = sack.carrier === me ? new THREE.Vector3(kazans[1 - me.team].x, 1, 0) : sack.carrier && sack.carrier.team === me.team ? null : sack.pos;
  if (target) {
    V.copy(target).project(camera);
    const off = V.z > 1 || Math.abs(V.x) > 0.95 || Math.abs(V.y) > 0.95;
    hid(el.arrow, !off);
    if (off) {
      let x = V.x, y = V.y; if (V.z > 1) { x = -x; y = -y; }
      const a = Math.atan2(y, x), r = 0.82;
      sty(el.arrow, 'left', `${50 + Math.cos(a) * r * 50}%`); sty(el.arrow, 'top', `${50 - Math.sin(a) * r * 50}%`);
      sty(el.arrow, 'transform', `translate(-50%,-50%) rotate(${-a}rad)`);
      sty(el.arrow, 'color', sack.carrier === me ? '#ffd23a' : '#fff');
    }
  } else hid(el.arrow, true);
}
// телефон: стик слева, кнопки справа
let whipHeld = false;
const pt = (e) => (view.rot ? { x: e.clientY, y: innerWidth - e.clientX } : { x: e.clientX, y: e.clientY }); // палец → координаты игры
const canRear = () => me && me.h.v < 1.5 && !me.r.fallen && !state.tug && state.phase !== 'menu'; // свечка — и с тушей в руке, только не в тартысе
// на Android: во весь экран и закрепить горизонталь (на iPhone — поворот страницы выше)
function goLandscape() {
  if (!touch || PORTAL || matchMedia('(display-mode: fullscreen)').matches) return;
  const d = document.documentElement;
  (d.requestFullscreen?.({ navigationUI: 'hide' }) || Promise.reject()).then(() => screen.orientation?.lock?.('landscape')).catch(() => {}).finally(() => setTimeout(onResize, 300));
}
if (touch) document.body.classList.add('touch');
if (touch) addEventListener('pointerdown', () => goLandscape(), { once: true, capture: true });
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
el.btnTug.addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); if (me && !online.role && canAim(me)) startAim(me); else tugTap = true; });
for (const ev of ['pointerup', 'pointercancel']) el.btnTug.addEventListener(ev, () => { if (me) releaseAim(me); });
el.btnWhip.addEventListener('pointerdown', (e) => { e.preventDefault(); if (canRear()) me.h.rear(); else whipHeld = true; });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.btnWhip.addEventListener(ev, () => { whipHeld = false; });
function startMatch() {
  applyStage(); applyLang();
  el.menu.hidden = true;
  state.score = [0, 0]; state.clock = rookie ? ROOKIE_LEN : MATCH_LEN; state.golden = false; state.events = []; kickoff(true); // первый матч короче — новичок точно доходит до итогов и призовых
}
el.pause.addEventListener('click', (e) => {
  const b = e.target.closest('[data-p]');
  if (!b) return;
  const [act, arg] = b.dataset.p.split(':');
  if (act === 'resume') togglePause(false);
  else if (act === 'close') { el.pause.hidden = true; career.showHub(); }
  else if (act === 'mute') { toggleMute(); renderPause(); }
  else if (act === 'full') { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}).finally(() => setTimeout(renderPause, 200)); }
  else if (act === 'lang') { lang = arg; try { localStorage.setItem('kokpar.lang', lang); } catch { /* приватный режим */ } applyLang(); renderPause(); }
  else if (act === 'q') {
    if (arg === Q) return;
    if (setMode === 'pause' && !confirm(PT[lang].reload)) return;
    try { localStorage.setItem('kokpar.q', arg); } catch { /* приватный режим */ }
    location.reload();
  } else if (act === 'quit') { togglePause(false); state.tug = null; showMenu(); }
});
el.pause.addEventListener('input', (e) => { // ползунки громкости
  const k = e.target.dataset?.v;
  if (!k) return;
  setVolume(k, e.target.value / 100);
  e.target.nextElementSibling.textContent = e.target.value;
  e.target.style.setProperty('--p', e.target.value + '%');
});
el.pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePause(); });
el.pauseBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
addEventListener('blur', () => { if (!SIM && state.phase === 'play' && !P.has('debug') && !online.role) togglePause(true); }); // ушёл со вкладки — пауза
career.initCareer(document.getElementById('hub'), () => { initAudio(); goLandscape(); startMatch(); }, openSettings, () => { initAudio(); onlineOpen(); });
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
let paused = false;
function togglePause(force) {
  const on = force ?? !paused;
  if (on && !['play', 'countdown', 'goal'].includes(state.phase)) return;
  paused = on; setMode = 'pause';
  el.pause.hidden = !paused;
  if (paused) renderPause();
}
const PT = {
  ru: { title: 'Пауза', settings: 'Настройки', resume: 'Продолжить', close: 'Готово', sound: 'Звук', master: 'Громкость', crowdVol: 'Толпа', mute: 'Без звука', gfx: 'Графика', low: 'Низкая', medium: 'Средняя', high: 'Высокая', full: 'Во весь экран', lang: 'Язык', controls: 'Управление', quit: 'Выйти в меню', note: 'Матч не засчитается', reload: 'Графика сменится после перезапуска — перезапустить?',
    keys: [['W', 'вперёд'], ['S', 'стоп'], ['A D', 'поворот'], ['Shift', 'камча · таран'], ['E', 'вырвать · бросок (держать)'], ['R', 'свечка'], ['P', 'пауза'], ['M', 'звук']],
    touchKeys: [['◐', 'палец слева — куда скакать'], ['ВЫРВАТЬ', 'отнять серке · держать — бросок'], ['КАМЧА', 'рывок · стоя — свечка']] },
  en: { title: 'Paused', settings: 'Settings', resume: 'Resume', close: 'Done', sound: 'Sound', master: 'Volume', crowdVol: 'Crowd', mute: 'Mute', gfx: 'Graphics', low: 'Low', medium: 'Medium', high: 'High', full: 'Fullscreen', lang: 'Language', controls: 'Controls', quit: 'Quit to menu', note: 'The match will not count', reload: 'Graphics change after a restart — restart now?',
    keys: [['W', 'go'], ['S', 'stop'], ['A D', 'steer'], ['Shift', 'whip · ram'], ['E', 'grab · throw (hold)'], ['R', 'rear up'], ['P', 'pause'], ['M', 'sound']],
    touchKeys: [['◐', 'left thumb — where to ride'], ['GRAB', 'take the serke · hold — throw'], ['WHIP', 'burst · standing — rear up']] },
};
let setMode = 'pause'; // 'pause' — во время матча, 'menu' — из главного меню
const canFull = !PORTAL && !!document.documentElement.requestFullscreen; // на портале своя кнопка полного экрана запрещена
function renderPause() {
  const t = PT[lang], inMatch = setMode === 'pause';
  const slider = (k, label, icon) => `<div class="s-row"><span class="s-l">${icon}${label}</span><input type="range" min="0" max="100" value="${Math.round(getVolume(k) * 100)}" style="--p:${Math.round(getVolume(k) * 100)}%" data-v="${k}" aria-label="${label}"><b class="s-n">${Math.round(getVolume(k) * 100)}</b></div>`;
  const tog = (act, on, label, icon) => `<div class="s-row"><span class="s-l">${icon}${label}</span><button class="s-sw${on ? ' on' : ''}" data-p="${act}" role="switch" aria-checked="${on}"><i></i></button></div>`;
  const keys = (touch ? t.touchKeys : t.keys).map(([k, d]) => `<div class="s-key"><kbd>${k}</kbd><span>${d}</span></div>`).join('');
  el.pause.innerHTML = `<div class="hub pausebox">
    <div class="s-head"><div class="h-cup disp">${inMatch ? t.title : t.settings}</div>${inMatch ? '' : `<button class="s-x" data-p="close" aria-label="${t.close}">${IC.close}</button>`}</div>
    ${inMatch ? `<button class="big-btn" data-p="resume">${IC.play}${t.resume}</button>` : ''}
    <div class="s-cols"><div class="s-col"><div class="s-sec"><div class="s-t">${t.sound}</div>
      ${slider('master', t.master, IC.sound)}${slider('crowd', t.crowdVol, IC.crowd)}${tog('mute', isMuted(), t.mute, '')}</div>
    <div class="s-sec"><div class="s-t">${t.gfx}</div>
      <div class="s-row"><span class="s-l">${IC.screen}${t.gfx}</span><div class="p-seg">${['low', 'medium', 'high'].map((q) => `<button data-p="q:${q}" class="${q === Q ? 'on' : ''}">${t[q]}</button>`).join('')}</div></div>
      ${canFull ? tog('full', !!document.fullscreenElement, t.full, IC.full) : ''}
      <div class="s-row"><span class="s-l">${IC.globe}${t.lang}</span><div class="p-seg"><button data-p="lang:ru" class="${lang === 'ru' ? 'on' : ''}">Русский</button><button data-p="lang:en" class="${lang === 'en' ? 'on' : ''}">English</button></div></div></div>
    </div><div class="s-col"><div class="s-sec"><div class="s-t">${t.controls}</div><div class="s-keys">${keys}</div></div>
    <details class="s-sec s-cred"><summary class="s-t">${lang === 'ru' ? 'Авторы' : 'Credits'}</summary><p>${CREDITS}</p></details></div></div>
    ${inMatch ? `<button class="p-quit" data-p="quit">${IC.exit}<span>${t.quit}<small>${t.note}</small></span></button>` : `<button class="big-btn" data-p="close">${t.close}</button>`}
  </div>`;
}
// ---------- обучение в первом матче: 4 шага, переходят сами, можно пропустить ----------
const TUT = {
  ru: [['Скачи к туше', 'золотая стрелка над ней'], ['Вези тушу в казан соперника', 'стрелка у края экрана'], ['Зажми и отпусти — бросок', 'зелёный круг — попадёшь'], ['Отбери тушу у соперника', 'догони и жми — тартыс']],
  en: [['Ride to the carcass', 'gold arrow above it'], ['Carry it to the enemy kazan', 'arrow at the screen edge'], ['Hold and release to throw', 'green ring — it will land in'], ['Steal it from a rival', 'catch up and press — tug of war']],
};
const tut = { on: false, step: 0, shown: -1, doneT: 0 };
try { tut.on = !P.has('bots') && localStorage.getItem('kokpar.tut') !== '1'; } catch { tut.on = false; }
function tutEnd() { tut.on = false; el.tut.hidden = true; try { localStorage.setItem('kokpar.tut', '1'); } catch { /* приватный режим */ } }
el.tut.addEventListener('click', (e) => { if (e.target.closest('.t-skip')) tutEnd(); });
el.tut.addEventListener('pointerdown', (e) => e.stopPropagation());
function tutPic(step) {
  const k = (t) => `<kbd>${t}</kbd>`;
  if (touch) return [`${IC.play}`, `${IC.play}`, `<kbd>✊</kbd><span class="hold">${lang === 'ru' ? 'держи' : 'hold'}</span>`, `<kbd>✋</kbd>`][step];
  return [k('W'), k('W') + k('A') + k('D'), k('E') + `<span class="hold">${lang === 'ru' ? 'держи' : 'hold'}</span>`, k('E')][step];
}
function stepTut(dt) {
  if (!tut.on || SIM || AI_PLAYER || !me) return;
  const playing = state.phase === 'play' || state.phase === 'countdown';
  el.tut.hidden = !playing || paused;
  if (!playing) return;
  // переходы: подобрал → везу → у казана → бросил; если туша у соперника рядом — учим тартысу
  const c = sack.carrier;
  let want = tut.step;
  if (tut.step === 0 && c === me) want = 1;
  if (tut.step <= 1 && c === me && throwInfo(me).d < AIM_MAX) want = 2;
  if (tut.step === 2 && (me.throw?.aiming === false || state.phase === 'goal')) want = 4;
  if (tut.step < 3 && c && c.team !== me.team && me.h.obj.position.distanceTo(c.h.obj.position) < 9) want = Math.max(want, 3);
  if (tut.step === 3 && (state.tug || c?.team === me.team)) want = c === me ? 1 : 0;
  if (want !== tut.step) { tut.step = want; tut.doneT = 0; }
  if (tut.step >= 4) { tut.doneT += dt; if (tut.doneT > 0.1) tutEnd(); return; }
  if (tut.shown === tut.step + (lang === 'ru' ? 0 : 10)) return;
  tut.shown = tut.step + (lang === 'ru' ? 0 : 10);
  const [b, s] = TUT[lang][tut.step];
  el.tut.innerHTML = `<div class="t-card"><div class="t-pic">${tutPic(tut.step)}</div><div class="t-txt"><span class="t-step">${tut.step + 1}/4</span><b>${b}</b><small>${s}</small></div><button class="t-skip">${lang === 'ru' ? 'Пропустить' : 'Skip'}</button></div>`;
}
// ---------- игра с другом по сети ----------
const online = { role: null, net: null, remote: null, inp: { s: 0, g: 0, w: false }, taps: 0, tapsDone: 0, rear: 0, rearDone: 0, sendT: 0, evSent: 0, snap: null, myTaps: 0, myRear: 0, friend: null };
const OT = {
  ru: { title: 'С другом по сети', host: 'Создать комнату', join: 'Войти', code: 'Код комнаты', wait: 'Ждём друга… Отправь ему код или ссылку', copy: 'Скопировать ссылку', copied: 'Скопировано!', joining: 'Подключаемся…', start: 'Друг подключился!', lost: 'Связь с другом потеряна', err: 'Не получилось подключиться. Проверь код или попробуйте другую сеть.', nort: 'Этот браузер не умеет играть по сети', close: 'Закрыть', again: 'Ещё матч', menu: 'В меню', win: 'Победа', loss: 'Поражение', draw: 'Ничья', vsFriend: 'Матч с другом', note: 'Ты играешь за свой клуб, друг — за свой. Остальные всадники — боты.' },
  en: { title: 'Play a friend online', host: 'Create a room', join: 'Join', code: 'Room code', wait: 'Waiting for your friend… Send the code or the link', copy: 'Copy link', copied: 'Copied!', joining: 'Connecting…', start: 'Your friend is here!', lost: 'Lost connection to your friend', err: 'Could not connect. Check the code or try another network.', nort: 'This browser cannot play online', close: 'Close', again: 'Rematch', menu: 'Menu', win: 'Victory', loss: 'Defeat', draw: 'Draw', vsFriend: 'Match vs friend', note: 'You ride for your club, your friend for theirs. The other riders are bots.' },
};
function onlineUI(stateKey, extra = '') {
  const t = OT[lang];
  el.pause.hidden = false;
  let body = '';
  if (stateKey === 'start') body = netSupported() ? `<button class="big-btn" data-o="host">${t.host}</button>
    <div class="o-join"><input id="oCode" maxlength="6" placeholder="${t.code}" autocomplete="off"><button class="o-jb" data-o="join">${t.join}</button></div>
    <div class="h-season">${t.note}</div>` : `<div class="h-stage big">${t.nort}</div>`;
  else if (stateKey === 'hosting') body = `<div class="o-code disp">${extra}</div><div class="h-season">${t.wait}</div><button class="o-jb" data-o="copy">${t.copy}</button>`;
  else if (stateKey === 'busy') body = `<div class="h-stage big">${extra || t.joining}</div>`;
  else if (stateKey === 'error') body = `<div class="h-stage big">${extra}</div>`;
  el.pause.innerHTML = `<div class="hub pausebox onl"><div class="s-head"><div class="h-cup disp">${t.title}</div><button class="s-x" data-o="close" aria-label="${t.close}">${IC.close}</button></div>${body}</div>`;
}
function onlineOpen() { onlineUI('start'); }
function onlineReset() {
  online.net?.close();
  Object.assign(online, { role: null, net: null, snap: null, taps: 0, tapsDone: 0, rear: 0, rearDone: 0, evSent: 0, myTaps: 0, myRear: 0 });
  if (online.remote) { online.remote.remote = false; online.remote = null; }
}
const netHandlers = {
  open() {
    onlineUI('busy', OT[lang].start);
    if (online.role === 'guest') online.net.send({ k: 'hello', kit: career.myKit(), name: career.clubName('me') }, true);
  },
  close() { if (!online.role) return; const was = online.role; onlineReset(); el.pause.hidden = true; if (was === 'guest') { location.hash = ''; location.reload(); } else { showMenu(); banner(OT[lang].lost, null, 2.5); } },
  message(m) {
    if (m.k === 'hello' && online.role === 'host') { online.friend = m; onlineStartHost(); }
    else if (m.k === 'start' && online.role === 'guest') onlineStartGuest(m);
    else if (m.k === 'i' && online.role === 'host') { online.inp = { s: +m.s || 0, g: +m.g || 0, w: !!m.w }; online.taps = Math.max(online.taps, +m.t || 0); online.rear = Math.max(online.rear, +m.r || 0); }
    else if (m.k === 's' && online.role === 'guest') online.snap = m;
    else if (m.k === 'end') onlineEnd(m);
  },
};
el.pause.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-o]');
  if (!b) return;
  const act = b.dataset.o, t = OT[lang];
  if (act === 'close') { onlineReset(); el.pause.hidden = true; }
  else if (act === 'host') {
    onlineReset(); online.role = 'host'; online.net = new Net(netHandlers);
    onlineUI('busy', '…');
    online.net.host((code) => { online.code = code; onlineUI('hosting', code); }).catch(() => { if (online.role) onlineUI('error', t.err); });
  } else if (act === 'join') {
    const code = cleanCode(document.getElementById('oCode')?.value);
    if (code.length === 6) onlineJoin(code);
  } else if (act === 'copy') {
    const url = location.origin + location.pathname + '#room=' + online.code;
    try { await navigator.clipboard.writeText(url); b.textContent = t.copied; } catch { b.textContent = url; }
  }
});
function onlineJoin(code) {
  onlineReset(); online.role = 'guest'; online.net = new Net(netHandlers);
  onlineUI('busy');
  online.net.join(code).catch(() => { if (online.role) onlineUI('error', OT[lang].err); });
}
// хост: друг играет за 2-го всадника команды соперника, в своих цветах
function onlineStartHost() {
  const f = online.friend;
  online.remote = ents.find((e) => e.team === 1 && ents.filter((o) => o.team === 1).indexOf(e) === 1);
  online.remote.remote = true;
  fx = { id: 'friend', name: String(f.name || 'Friend').slice(0, 22), ko: false, final: false, arena: 'day', kit: f.kit, diff: { pull: 0.02, react: 0.5, speed: 1 } };
  paintTeam(0, career.myKit()); paintTeam(1, f.kit); setArena('day'); crowd?.paint(TEAMS[0].color, TEAMS[1].color);
  el.nmR.textContent = career.clubName('me'); el.nmB.textContent = fx.name;
  online.net.send({ k: 'start', kit: career.myKit(), name: career.clubName('me'), arena: 'day' }, true);
  el.pause.hidden = true; el.menu.hidden = true;
  initAudio();
  state.score = [0, 0]; state.clock = MATCH_LEN; state.golden = false; state.events = []; online.evSent = 0; kickoff(true);
}
// друг: смотрит с хоста, управляет своим всадником
function onlineStartGuest(m) {
  const mine = ents.find((e) => e.team === 1 && ents.filter((o) => o.team === 1).indexOf(e) === 1);
  for (const e of ents) e.me = false;
  mine.me = true; me = mine;
  for (const e of ents) e.ring.material.color.set(e.me ? '#ffffff' : TEAMS[e.team].css);
  paintTeam(0, m.kit); paintTeam(1, career.myKit()); setArena(m.arena || 'day'); crowd?.paint(TEAMS[0].color, TEAMS[1].color);
  el.nmR.textContent = String(m.name || '').slice(0, 22); el.nmB.textContent = career.clubName('me');
  for (const e of ents) e.ring.material.color.set(e.me ? '#ffffff' : TEAMS[e.team].css);
  el.pause.hidden = true; el.menu.hidden = true;
  initAudio();
  state.phase = 'countdown'; state.score = [0, 0]; state.events = [];
  updateCamera(0, true);
}
// хост → друг: 20 раз в секунду всё, что видно
function hostSend(dt) {
  online.sendT -= dt;
  if (online.sendT > 0 || !online.net?.open) return;
  online.sendT = 0.05;
  const r2 = (v) => Math.round(v * 100) / 100;
  const idx = (e) => (e ? ents.indexOf(e) : -1);
  const s = sack.mesh;
  online.net.send({
    k: 's', ph: state.phase, t: r2(state.t), cl: r2(state.clock), sc: state.score, gd: !!state.golden,
    e: ents.map((e) => [r2(e.h.obj.position.x), r2(e.h.obj.position.z), r2(e.h.yaw), r2(e.h.v), e.h.gait, r2(e.h.steer), e.r.fallen ? 1 : 0, r2(e.reach), e.reachSide, r2(e.dip || 0), e.dipSide || -1, r2(e.throwT ?? -1), Math.round(e.stamina), e.h.rearClock != null ? 1 : 0]),
    sk: [r2(s.position.x), r2(s.position.y), r2(s.position.z), r2(s.quaternion.x), r2(s.quaternion.y), r2(s.quaternion.z), r2(s.quaternion.w)], c: idx(sack.carrier), fl: sack.flight ? 1 : 0,
    tg: state.tug ? [idx(state.tug.att), idx(state.tug.car), r2(state.tug.bar)] : null,
    ev: state.events.slice(online.evSent),
  });
  online.evSent = state.events.length;
}
// друг: свой ввод хосту, картинка — с хоста (кони шагают сами, позиция подтягивается к присланной)
let guestSendT = 0;
function guestStep(dt) {
  guestSendT -= dt;
  if (tugTap) { tugTap = false; online.myTaps++; }
  if (guestSendT <= 0 && online.net?.open) {
    guestSendT = 1 / 30;
    const o = me.r.fallen ? { s: 0, g: 0, w: false } : readInput();
    online.net.send({ k: 'i', s: Math.round(o.s * 100) / 100, g: o.g, w: o.w ? 1 : 0, t: online.myTaps, r: online.myRear });
  }
  const S = online.snap;
  crowd?.update(dt);
  if (S) {
    const prevPhase = state.phase;
    state.phase = S.ph; state.t = S.t; state.clock = S.cl; state.score = S.sc; state.golden = S.gd;
    if (S.ph === 'countdown') { const n = Math.ceil(S.t - 0.2); if (n > 0 && n <= 3 && el.bigText.textContent !== String(n) && S.t < 3.2) banner(String(n)); }
    if (prevPhase === 'countdown' && S.ph === 'play') banner(tr('go'), null, 0.9);
    for (const ev of S.ev || []) guestEvent(ev);
    S.ev = [];
    S.e.forEach((a, i) => {
      const e = ents[i], h = e.h;
      h.gait = a[4]; h.steer = a[5];
      if (a[13] && h.rearClock == null) h.rear();
      if (a[6] && !e.r.fallen) e.r.fall(scene, 0, 2, 0, 1);
      if (!a[6] && e.r.fallen) e.r.remount();
      if (e.r.fallen) e.r.stepFall(dt, false);
      h.update(dt);
      const p = h.obj.position, k = 1 - Math.exp(-dt * 9);
      if (Math.hypot(p.x - a[0], p.z - a[1]) > 5) p.set(a[0], 0, a[1]); else { p.x += (a[0] - p.x) * k; p.z += (a[1] - p.z) * k; }
      h.yaw += wrap(a[2] - h.yaw) * k; h.v += (a[3] - h.v) * k;
      e.reach = a[7]; e.reachSide = a[8]; e.dip = a[9]; e.dipSide = a[10]; e.throwT = a[11]; e.stamina = a[12];
      e.r.throwT = e.throwT; e.r.dip = e.dip; e.r.dipSide = e.dipSide; e.r.carrying = S.c === i;
      e.r.update(dt, h.v, e.reach, e.reachSide);
      e.ring.position.x = p.x; e.ring.position.z = p.z;
    });
    sack.carrier = S.c >= 0 ? ents[S.c] : null; sack.flight = S.fl ? {} : null;
    const k2 = 1 - Math.exp(-dt * 14);
    sack.mesh.position.lerp(V.set(S.sk[0], S.sk[1], S.sk[2]), k2); sack.pos.copy(sack.mesh.position);
    sack.mesh.quaternion.slerp(Qt.set(S.sk[3], S.sk[4], S.sk[5], S.sk[6]).normalize(), k2);
    state.tug = S.tg ? { att: ents[S.tg[0]], car: ents[S.tg[1]], bar: S.tg[2] } : null;
    if (prevPhase !== 'end' && S.ph === 'end') onlineEnd({ sc: S.sc });
  }
  tension += ((sack.carrier ? 0.3 : 0) - tension) * (1 - Math.exp(-dt * 2));
  crowdTension(tension, ['play', 'goal', 'countdown'].includes(state.phase));
  const bobM = Math.sin(performance.now() / 250) * 0.15, cr = sack.carrier;
  sackMarker.visible = !sack.flight && state.phase !== 'goal';
  if (cr) { const p = cr.h.obj.position; sackMarker.position.set(p.x, 3.35 + bobM, p.z); sackMarker.material.color.set(TEAMS[cr.team].css); }
  else sackMarker.position.set(sack.pos.x, 2.4 + bobM, sack.pos.z);
  stepWorld(dt);
}
function guestEvent(ev) { // гол, падение, тартыс — баннеры и звук как у хоста
  if (ev.t === 'goal') { banner(tr('goal'), TEAMS[ev.team].grad, 2.4, ev.team === 0 ? el.nmR.textContent : el.nmB.textContent); cheer(ev.team === me.team); crowd?.cheer(3.5); }
  else if (ev.t === 'fall') crowdShout('ooh');
  else if (ev.t === 'tug') banner(tr('tug'), null, 1.1, tr('tugSub'));
}
// итог матча с другом
function onlineEnd(m) {
  if (online.role === 'host') online.net?.send({ k: 'end', sc: state.score }, true);
  const sc = m?.sc || state.score, t = OT[lang], mine = me.team, my = sc[mine], their = sc[1 - mine];
  const res = my > their ? 'win' : my < their ? 'loss' : 'draw';
  state.phase = 'end'; el.tug.hidden = true;
  el.pause.hidden = false;
  el.pause.innerHTML = `<div class="hub pausebox onl result ${res}"><div class="h-season">${t.vsFriend}</div><div class="h-cup disp r-title">${t[res]}</div>
    <div class="r-score"><span class="disp">${sc[0]} : ${sc[1]}</span></div>
    ${online.role === 'host' ? `<button class="big-btn" data-o2="again">${t.again}</button>` : ''}<button class="p-quit" data-o2="menu"><span>${t.menu}</span></button></div>`;
  if (res === 'win') cheer(true);
}
el.pause.addEventListener('click', (e) => {
  const b = e.target.closest('[data-o2]');
  if (!b) return;
  if (b.dataset.o2 === 'again' && online.role === 'host' && online.net?.open) { online.net.send({ k: 'start', kit: career.myKit(), name: career.clubName('me'), arena: 'day' }, true); onlineStartHost(); }
  else if (b.dataset.o2 === 'menu') { const was = online.role; onlineReset(); el.pause.hidden = true; if (was === 'guest') { location.hash = ''; location.reload(); } else showMenu(); }
});
function openSettings() { setMode = 'menu'; el.pause.hidden = false; renderPause(); }
function frame(now) {
  if (frozen) return;
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) tuneRes(dt);
  portal.gameplay(!paused && el.menu.hidden && el.pause.hidden && ['countdown', 'play', 'goal'].includes(state.phase)); // для портала: идёт ли сам матч
  if (paused) { renderAll(); requestAnimationFrame(frame); return; }
  const realDt = dt;
  if (state.phase === 'goal' && state.t > 2.1) dt *= 0.4; // гол — на мгновение замедленно
  if (juice.stop > 0) { juice.stop -= realDt; dt *= 0.12; } // удар — кадр на миг замирает
  else if (juice.slow > 0) { juice.slow -= realDt; dt *= 0.4; } // падение, вырванная туша — на миг замедленно
  if (online.role === 'guest') guestStep(dt);
  else { step(dt); if (online.role === 'host') hostSend(dt); }
  updateCamera(dt);
  juiceEvents(); stepConfetti(realDt); shakeCamera(realDt);
  hud(dt);
  renderAll();
  requestAnimationFrame(frame);
}

if (!SIM) applyLang();
performance.mark('k:start');
await Promise.all([loadModel(), loadRider()]);
performance.mark('k:models');
if (!SIM) loadTerrain().catch((err) => console.warn('рельеф не загрузился', err)); // горы появятся чуть позже
for (const team of [0, 1]) for (let i = 0; i < 3; i++) ents.push(makeEnt(team, i, team === 0 && i === 1));
me = ents.find((e) => e.me);
// масти: игроку — гнедой, остальным разные
{
  const coats = [[1.7, 1.7, 1.7], [2.9, 1.6, 0.95], [0.3, 0.28, 0.28], [3.1, 2.6, 1.7], [1.7, 1.7, 1.7], [3.3, 2.2, 1.3]];
  ents.forEach((e, i) => setCoat(e.h.obj, coats[e.me ? 0 : (i + 1) % coats.length]));
  if (!SIM) globalThis.__kokparCoat();
}
kickoff(true);
performance.mark('k:ents');

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
  window.__loadDone?.(); setTimeout(() => el.load.remove(), 150);
  portal.loadingDone();
  portal.onPortalMute(setPortalMute);
  const roomCode = cleanCode((location.hash.match(/room=([A-Za-z0-9]{6})/) || [])[1]);
  // самый первый запуск — сразу в первый матч, без меню: порталы считают «загрузку» до начала игры, а новичку меню ничего не говорит
  const firstRun = career.played() === 0 && roomCode.length !== 6 && !P.has('menu') && !document.documentElement.classList.contains('portrait');
  if ((P.has('bots') || P.has('debug')) && !P.has('menu')) applyStage(); else { showMenu(); if (firstRun) startMatch(); }
  if (roomCode.length === 6) onlineJoin(roomCode); // открыл ссылку друга
  updateCamera(0, true);
  el.hint.dataset.keep = '1';
  el.hint.innerHTML = touch ? tr('helpTouch') : tr('help');
  setTimeout(() => { delete el.hint.dataset.keep; }, 9000);
  // меню видно сразу, а шейдеры видеокарта собирает в фоне — раньше первая отрисовка держала экран загрузки 2–3 с
  const go = () => { performance.mark('k:frame'); requestAnimationFrame(frame); };
  if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(go, go); else go();
}
if (P.has('debug')) window.__kokpar = { ents, me, sack, state, kazans, step, camera, renderer, thr() { const c = sack.carrier; if (c) throwSack(c); return c; }, setCoat, startTug, endNow(a, b) { state.score = [a, b]; endMatch(); }, fall(i) { const e = ents[i]; fallRider(e, Math.cos(e.h.yaw), -Math.sin(e.h.yaw)); return e; }, view(px, py, pz, lx, ly, lz) { camera.position.set(px, py, pz); camera.lookAt(lx, ly, lz); renderAll(); }, freeze(f) { frozen = f; if (!f) { last = performance.now(); requestAnimationFrame(frame); } }, run(n, dt = 1 / 60) { for (let i = 0; i < n; i++) step(dt); updateCamera(dt); hud(dt); renderAll(); }, play(n, dt = 1 / 60) { for (let i = 0; i < n; i++) { let d = dt; if (juice.stop > 0) { juice.stop -= dt; d *= 0.12; } else if (juice.slow > 0) { juice.slow -= dt; d *= 0.4; } step(d); updateCamera(d); juiceEvents(); stepConfetti(dt); shakeCamera(dt); } hud(dt); renderAll(); }, getProto };
