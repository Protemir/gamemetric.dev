import * as S from './sim.js';
import { View, TRIBE_RGB } from './render.js';
import { View3D, webglOK, modelsReady } from './render3d.js';
import { el, store } from './util.js';
import { T, lang, setLang } from './text.js';
import { sfx, audioInit, sound, setSound, holdAudio, musicLevel, musicMood } from './sfx.js';
import { avatar, elder, LONE_HORSE, ICONS } from './avatars.js';
import * as M from './meta.js';
import { PORTAL, portalLang, gameplay, loadingDone, happytime, onPortalMute } from './portal.js';

const q = new URLSearchParams(location.search);
// on a portal its language wins unless the URL says otherwise
if (PORTAL && !q.has('lang')) { const pl = portalLang(); if (pl) setLang(pl); }
const DEBUG = q.has('debug');
const SPEEDS = DEBUG ? [1, 2, 8] : [1, 2];

const cv = document.getElementById('game');
// the 3D steppe where the browser can, the painted 2D map where it cannot (or with ?2d)
// 3D is the game; an old device (no WebGL, or one remembered as too slow) gets the painted 2D map
let view = webglOK() && !q.has('2d') && !(store.get('sybys.lite', false) && !q.has('3d')) ? new View3D(cv) : new View(cv);

// if the 3D steppe runs under ~20 frames a second on this device, switch to 2D at once and remember it
const perf = { n: 0, t: 0 };
function watchSpeed(dt) {
  if (!view.is3d || !g || g.phase !== 'map' || paused || perf.done) return;
  if (DEBUG && !q.has('forceLite')) return; // tests run in a software-rendered browser
  perf.n++;
  perf.t += dt;
  if (perf.n < 90) return; // the first frames load models and build the scene: skip them
  if (perf.n === 90) { perf.t = 0; perf.k = 0; return; }
  perf.k++;
  if (perf.t < 4) return;
  perf.done = true;
  const fps = perf.k / perf.t;
  if ((perf.lighter >= 2 && fps < 14) || q.has('forceLite')) downgrade(fps);
  else if (view.lighter && ((!perf.lighter && fps < 40) || (perf.lighter === 1 && fps < 26))) {
    // a step lighter, then one more look
    perf.lighter = (perf.lighter || 0) + 1;
    view.lighter();
    perf.done = false;
    perf.n = 0;
  }
}
function downgrade(fps) {
  store.set('sybys.lite', true);
  view.dispose();
  const hover = view.hover;
  view = new View(cv);
  view.hover = hover;
  fit();
  if (window.__sybys) window.__sybys.view = view;
  console.info('sybys: 3D too slow here (' + fps.toFixed(1) + ' fps), switched to 2D');
}
const $ = (id) => document.getElementById(id);
const hud = $('hud'), ui = $('ui'), hintEl = $('hint'), actionsEl = $('actions'), toastsEl = $('toasts'), coachEl = $('coach');

let g = null;
let speed = 1;
let paused = true;
let last = performance.now();
let action = 'word';
const look = { hand: -1, pulse: null, numbers: DEBUG || q.has('numbers'), names: null, mouse: null, actIcon: '' };
let hintUntil = 0;

const tribeName = (k) => T().tribes[k];
const fmt = (v, ...a) => (typeof v === 'function' ? v(...a) : v);
const face = (who) => (typeof who === 'number' ? elder(TRIBE_RGB[who]) : avatar(who));

function say(text, ms = 3200) {
  hintEl.textContent = text;
  hintEl.classList.add('on');
  hintUntil = performance.now() + ms;
}

// —— the advisors: a portrait and a line; the lesson waits for the player, later tips go by themselves ——

const coach = { step: null, until: 0, words: 0, plot: null, nextTip: 0, idle: 0, votes: null, soonTold: false, markTold: false, glow: null };

function advise(who, text, ms = 0) {
  const name = typeof who === 'number' ? tribeName(who) : T().who[who] || '';
  coachEl.replaceChildren();
  const ava = el('div', 'ava');
  ava.innerHTML = face(who);
  const said = el('div', 'said');
  said.append(el('b', null, name), el('p', null, text));
  coachEl.append(ava, said);
  coachEl.classList.add('on');
  coach.until = ms ? performance.now() + ms : 0;
}
function hush() {
  coachEl.classList.remove('on');
  coach.until = 0;
}
// the advisor never hides what he is talking about: if the pasture or rider he points at is under the bubble,
// the bubble moves to the other side of the screen; only when there is no room (or under the cursor) it thins out
function coachSeeThrough() {
  let thin = false, flip = coachEl.classList.contains('flip');
  if (coachEl.classList.contains('on') && g && g.phase === 'map') {
    const r0 = coachEl.getBoundingClientRect(), W = innerWidth;
    const mirror = (b) => ({ left: W - b.right, right: W - b.left, top: b.top, bottom: b.bottom });
    const home = flip ? mirror(r0) : r0, away = mirror(home);
    const hits = (b, pts, pad) => pts.some(([x, y]) => x > b.left - pad && x < b.right + pad && y > b.top - pad && y < b.bottom + pad);
    const lessonPts = [];
    const hand = look.hand >= 0 && g.map.regions[look.hand];
    if (hand) lessonPts.push(view.toScreen(hand.x, hand.y));
    const r = look.pulse != null && g.riders.find((x) => x.id === look.pulse);
    if (r) { const p = S.riderPos(g, r); lessonPts.push(view.toScreen(p.x, p.y)); }
    flip = hits(home, lessonPts, 26) && !hits(away, lessonPts, 26);
    const now = flip ? away : home;
    thin = hits(now, lessonPts, 26) || (look.mouse && hits(now, [look.mouse], 36));
  } else flip = false;
  coachEl.classList.toggle('flip', flip);
  coachEl.classList.toggle('thin', !!thin);
}
// what is missing shivers red for a moment: the horses chip when there are no horses, the button while it waits
function shake(node) {
  if (!node) return;
  node.classList.remove('short');
  void node.offsetWidth;
  node.classList.add('short');
}
function glowButton(key) {
  coach.glow = key;
  for (const b of actionsEl.children) b.classList.toggle('glow', b.dataset.key === key);
}

function lesson(step) {
  const t = T().c;
  coach.step = step;
  coach.stepStarted = performance.now();
  look.hand = -1;
  glowButton(null);
  if (step === 'send') { look.hand = bestFirstTarget(); advise('aria', t.send); }
  if (step === 'watch') advise('aria', t.watch);
  if (step === 'more') { look.hand = S.suggest(g); advise('aria', t.more(2)); }
  if (step === 'false') {
    const r = S.spawnPlot(g);
    coach.plot = r ? r.id : null;
    look.pulse = coach.plot;
    advise('aria', t.false);
  }
  if (step === 'aria') {
    const m = [...g.marks][0];
    look.hand = m ?? -1;
    advise('aria', t.aria);
  }
  if (step === 'karasai') { glowButton('karasai'); advise('karasai', t.karasai); coach.stepUntil = performance.now() + 6500; }
  if (step === 'goal') {
    advise('temir', t.goal, 6500);
    coach.step = null;
    g.hold = false;
    store.set('sybys.tutDone', true);
    coach.nextTip = g.time + 20;
  }
  updateHud();
}

// what the lesson waits for, checked every frame
function lessonTick(now) {
  const st = coach.step;
  if (!st || g.phase !== 'map') return;
  if (st === 'watch' && coach.stepUntil && now > coach.stepUntil) lesson('more');
  if (st === 'false') {
    const alive = g.riders.some((r) => r.id === coach.plot);
    if (!alive) {
      look.pulse = null;
      const caught = g.caught > 0;
      advise('aria', caught ? T().c.caught : T().c.missed);
      coach.step = 'afterFalse';
      coach.stepUntil = now + 4200;
    }
  }
  // a lesson the player does not follow moves on by itself, so the season never stays frozen
  if ((st === 'more' || st === 'aria') && now - coach.stepStarted > 20000) lesson(st === 'more' ? 'false' : 'karasai');
  if (st === 'afterFalse' && now > coach.stepUntil) lesson(g.marks.size ? 'aria' : 'karasai');
  if (st === 'karasai' && now > coach.stepUntil) lesson('goal');
}

// tips once the player is on their own
function tips(now) {
  if (coach.step || g.phase !== 'map' || paused) return;
  const t = T().c;
  // a clan crossing the line either way is news
  const v = S.kurultai(g).votes.map((x) => x.yes);
  if (coach.votes) {
    v.forEach((yes, k) => {
      if (yes !== coach.votes[k]) {
        showToast({ who: k, text: yes ? t.yes(tribeName(k)) : t.no(tribeName(k)) });
        yes ? sfx.clue() : sfx.bad();
      }
    });
  }
  coach.votes = v;
  // a lie left a mark: Aria offers to look
  if (coach.until && now < coach.until) return; // someone is speaking: let them finish
  if (!coach.markTold && g.marks.size && S.canAct(g, 'aria') && [...g.marks].some((i) => !g.found.has(i))) {
    coach.markTold = true;
    look.hand = [...g.marks].find((i) => !g.found.has(i));
    advise('aria', t.aria, 9000);
    coach.handUntil = now + 9000;
    return;
  }
  // the first false rider after the lesson gets a ring too
  const f = g.riders.find((r) => r.kind === 'false' && r.seg + r.p > 0.3);
  if (f && g.caught < 3 && look.pulse == null) look.pulse = f.id;
  if (look.pulse != null && !g.riders.some((r) => r.id === look.pulse)) look.pulse = null;
  // idle horses
  coach.idle = g.horses >= S.HORSE_MAX ? coach.idle + 1 / 60 : 0;
  if (coach.idle > 5 && g.time > coach.nextTip) {
    const target = S.suggest(g);
    if (target >= 0) {
      look.hand = target;
      advise('aria', t.idle(tribeName(g.map.regions[target].tribe)), 5000);
      coach.handUntil = now + 5000;
      coach.nextTip = g.time + 25;
    }
  }
  if (!coach.soonTold && g.clock > S.SEASON - 60) {
    coach.soonTold = true;
    advise('temir', t.soon(S.kurultai(g).yes), 5000);
  }
  if (coach.handUntil && now > coach.handUntil) { look.hand = -1; coach.handUntil = 0; glowButton(null); }
}

// —— start ——

// behind the title and the opening cards the steppe itself is shown, filmed from close and low
function backdrop() {
  if (!view.setCinema) return false;
  if (!g || g.phase === 'end' || !g.demo) {
    g = S.newGame(q.has('seed') ? +q.get('seed') : (Math.random() * 1e9) | 0);
    g.demo = true;
    g.hold = true; // no plot, no scenes: only the clans' riders on the roads
    for (let k = 0; k < 40; k++) S.step(g, 0.1); // riders already on the roads
  }
  view.setCinema(true);
  return true;
}

// a tap answers at once: the button presses in and a veil says the steppe is being laid out;
// the heavy work (a new map, its 3D) starts only after that has been painted, so a phone never seems frozen
function busyThen(btn, fn) {
  btn?.classList.add('busy');
  let veil = document.getElementById('preparing');
  if (!veil) {
    veil = el('div', null);
    veil.id = 'preparing';
    veil.append(el('i', 'spin'), el('span', null, T().preparing));
    document.body.append(veil);
  }
  veil.classList.add('on');
  requestAnimationFrame(() => setTimeout(() => {
    try { fn(); } finally { requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.remove('on'))); }
  }, 0));
}

function startScreen() {
  hud.hidden = true;
  actionsEl.hidden = true;
  hush();
  paused = true;
  const live = backdrop();
  const box = el('div', live ? 'title' : 'screen start');
  if (!live) {
    const pic = el('div', 'pic');
    pic.innerHTML = LONE_HORSE;
    box.append(pic);
  }
  const orn = el('div', 'orn');
  orn.innerHTML = ORNAMENT;
  box.append(el('h1', T().title.length > 12 ? 'long' : null, T().title), orn, el('p', 'sub', T().sub));
  const t = T(), meta = M.load();
  const play = el('button', 'big play', t.play);
  play.onclick = () => { audioInit(); mode = 'free'; busyThen(play, start); };
  box.append(play);
  // the steppe of the day: the same for everyone, one condition, a streak
  const d = M.daily();
  const day = el('button', 'daily' + (M.dailyDone(meta) ? ' done' : ''));
  const [modName, modLine] = t.mods[d.mod];
  day.append(el('b', null, M.dailyDone(meta) ? t.dailyDoneBtn : t.dailyBtn), el('small', null, `${modName}: ${modLine}`));
  const st = M.liveStreak(meta);
  if (st) day.append(el('em', null, t.streak(st)));
  day.onclick = () => { audioInit(); mode = 'daily'; busyThen(day, start); };
  box.append(day);
  const row = el('div', 'titlerow');
  const how = el('button', 'link', t.howBtn);
  how.onclick = () => { audioInit(); busyThen(how, tour); };
  row.append(how);
  const chron = el('button', 'link', t.chronicleBtn + ' · ' + t.glory(meta.glory));
  chron.onclick = () => chronicle(startScreen);
  const lng = el('button', 'link', t.langBtn);
  lng.onclick = () => { setLang(lang === 'ru' ? 'en' : 'ru'); document.documentElement.lang = lang; startScreen(); };
  const gfx = el('button', 'link', view.is3d ? t.gfx2d : t.gfx3d);
  gfx.onclick = () => {
    store.set('sybys.lite', view.is3d);
    // keep the address's other settings (a portal's, the tests'), swap only the graphics
    const p = new URLSearchParams(location.search);
    p.delete('2d');
    p.delete('3d');
    p.set(view.is3d ? '2d' : '3d', '');
    location.search = p.toString();
  };
  row.append(chron, gfx, lng);
  box.append(row);
  // the look of the steppe: opened by glory
  const chips = el('div', 'styles');
  for (const s of M.STYLES) {
    const open = M.unlocked(meta, s.key);
    const c = el('button', 'chip-style' + (meta.style === s.key ? ' on' : '') + (open ? '' : ' locked'), open ? t.styles[s.key] : `${t.styles[s.key]} · ${s.glory} ✦`);
    c.disabled = !open;
    c.onclick = () => { M.setStyle(s.key); view.setStyle?.(s.key); startScreen(); };
    chips.append(c);
  }
  box.append(chips);
  const rot = el('p', 'rotate');
  rot.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></svg>';
  rot.append(t.rotate);
  box.append(rot);
  ui.classList.toggle('cine', live);
  ui.replaceChildren(box);
}

// the chronicle: glory, endings, unmasked plotters, deeds — what is still missing shows as ???
function chronicle(back) {
  const t = T(), meta = M.load();
  const box = el('div', 'screen chronicle');
  box.append(el('h2', null, t.chronicleTitle), el('p', 'line', t.glory(meta.glory)));
  const nxt = M.STYLES.find((s) => s.glory > meta.glory);
  if (nxt) box.append(el('p', 'small', t.nextOpen(t.styles[nxt.key], nxt.glory - meta.glory)));
  box.append(el('h3', null, `${t.endsHead} · ${meta.ends.length}/6`));
  const ends = el('div', 'tiles');
  for (const e of S.ENDINGS) {
    const got = meta.ends.includes(e);
    const tile = el('div', 'tile' + (got ? ' got' : ''));
    const seal = el('i');
    seal.innerHTML = ICONS.seal;
    tile.append(seal, el('b', null, got ? t.end[e][0] : t.locked), el('small', null, t.endHints[e]));
    ends.append(tile);
  }
  box.append(ends, el('h3', null, `${t.plottersHead} · ${meta.plotters.length}/4`));
  const pl = el('div', 'faces');
  for (const w of S.SUSPECTS) {
    const a = el('div', 'ava' + (meta.plotters.includes(w) ? '' : ' unknown'));
    a.innerHTML = face(w);
    a.title = meta.plotters.includes(w) ? t.who[w] : '?';
    pl.append(a);
  }
  box.append(pl, el('h3', null, `${t.deedsTitle} · ${meta.deeds.length}/${M.DEEDS.length}`));
  const ul = el('ul', 'deeds');
  for (const d of M.DEEDS) {
    const li = el('li', meta.deeds.includes(d) ? 'got' : '');
    li.append(el('b', null, (meta.deeds.includes(d) ? '✦ ' : '· ') + t.deeds[d][0]), el('small', null, t.deeds[d][1]));
    ul.append(li);
  }
  box.append(ul);
  const b = el('button', 'big', t.back);
  b.onclick = back;
  box.append(b);
  ui.replaceChildren(box);
}

// a ram's-horn ornament (qoshqar müiz) under the title
const ORNAMENT = '<svg viewBox="0 0 240 28" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M120 22c-8 0-12-6-12-10s4-8 8-6-2 6-4 4"/><path d="M120 22c8 0 12-6 12-10s-4-8-8-6 2 6 4 4"/><path d="M104 14H20M136 14h84"/><path d="M20 14c-6 0-8-6-4-8s6 2 4 4M220 14c6 0 8-6 4-8s-6 2-4 4"/><circle cx="120" cy="5" r="2.2" fill="currentColor"/></g></svg>';


// —— how to play: the game plays itself for forty seconds, one line of words at a time ——
let tourState = null;
function tour() {
  g = S.newGame(9001);
  g.hold = true; // no scenes, no clock: only what the tour shows
  view.setCinema?.(false);
  view.resetCam?.();
  ui.classList.remove('cine');
  ui.replaceChildren();
  hud.hidden = false;
  actionsEl.hidden = false;
  paused = false;
  speed = 1;
  look.names = T().tribes;
  buildHud();
  fit();
  hush();
  const bar = el('div', 'tour');
  const line = el('p', 'tourline');
  const dots = el('div', 'tourdots');
  const skip = el('button', 'big', T().tourSkip);
  skip.onclick = () => busyThen(skip, endTour);
  bar.append(line, dots, skip);
  document.body.append(bar);
  tourState = { t0: performance.now(), step: -1, bar, line, dots, target: -1 };
  if (DEBUG || q.has('covers')) window.__sybys = { get g() { return g; }, S, view, coach, look, act: doAction, intercept: tapRider, choose: pickEvent, finish: pickEnd, step: (d) => S.step(g, d), lesson, autumn: goAutumn, tour: tourState };
}
// a tap on the map during the show: say it is a show, and make its Play button call
function nudgeTour() {
  const t = tourState;
  if (!t || t.nudged > performance.now() - 2500) return;
  t.nudged = performance.now();
  t.line.textContent = T().tourTap;
  t.line.classList.remove('in');
  void t.line.offsetWidth;
  t.line.classList.add('in');
  const b = t.bar.querySelector('.big');
  b.classList.remove('call');
  void b.offsetWidth;
  b.classList.add('call');
}
function endTour() {
  if (!tourState) return;
  tourState.bar.remove();
  tourState = null;
  hud.hidden = true;
  actionsEl.hidden = true;
  look.hand = -1;
  look.pulse = null;
  mode = 'free';
  store.set('sybys.tutDone', true);
  start();
}
// what the tour does at each second
const TOUR = [
  { at: 0, line: 0, run: () => { tourState.target = S.suggest(g); } },
  { at: 4, line: 1, run: () => { look.hand = tourState.target; } },
  { at: 6.5, run: () => { g.horses = 5; S.act(g, 'word', tourState.target); look.hand = -1; sfx.send(); } },
  { at: 8.5, line: 2, run: () => { g.horses = 5; const t = S.suggest(g); S.act(g, 'word', t); } },
  { at: 12, run: () => { const t = S.suggest(g); S.act(g, 'word', t); } },
  { at: 15, line: 3, run: () => { const f = S.spawnPlot(g); tourState.plot = f && f.id; look.pulse = tourState.plot; } },
  { at: 19, line: 4, run: () => { if (tourState.plot) tapRider(tourState.plot); look.pulse = null; } },
  { at: 23, line: 5, run: () => { g.horses = 5; S.startRaid(g); sfx.drums(); } },
  { at: 25.5, run: () => { const r = g.riders.filter((x) => x.kind === 'raider' && !(x.delay > 0)); for (const x of r.slice(0, 2)) tapRider(x.id); } },
  { at: 28, run: () => { g.horses = 5; const r = g.riders.filter((x) => x.kind === 'raider'); for (const x of r.slice(0, 2)) tapRider(x.id); } },
  { at: 31, line: 6, run: () => { view.zoomAt?.(view.w / 2, view.h / 2, 1.2); } },
  { at: 36, line: 7, run: () => { view.resetCam?.(); } },
  { at: 42, run: () => endTour() },
];
function tourTick(now) {
  if (!tourState) return;
  const sec = (now - tourState.t0) / 1000;
  while (tourState && tourState.step + 1 < TOUR.length && sec >= TOUR[tourState.step + 1].at) {
    const s = TOUR[++tourState.step];
    if (s.line != null) {
      tourState.line.textContent = T().tour[s.line];
      tourState.line.classList.remove('in');
      void tourState.line.offsetWidth;
      tourState.line.classList.add('in');
      tourState.dots.replaceChildren(...T().tour.map((_, k) => el('i', k <= s.line ? 'on' : '')));
    }
    s.run();
  }
}

let mode = 'free'; // 'daily' for the steppe of the day
function start() {
  const d = M.daily();
  g = mode === 'daily' ? S.newGame(d.seed, { mod: d.mod, daily: true }) : S.newGame(q.has('seed') ? +q.get('seed') : (Math.random() * 1e9) | 0);
  view.setStyle?.(M.load().style);
  view.setCinema?.(false);
  view.resetCam?.();
  ui.classList.remove('cine');
  ui.replaceChildren();
  hud.hidden = false;
  actionsEl.hidden = false;
  paused = false;
  speed = 1;
  action = 'word';
  look.names = T().tribes;
  look.pulse = null;
  trend.last = null;
  Object.assign(coach, { step: null, words: 0, plot: null, nextTip: 0, idle: 0, votes: null, soonTold: false, markTold: false, handUntil: 0 });
  buildHud();
  fit();
  if (store.get('sybys.tutDone', false) && !q.has('tutorial')) {
    g.hold = false;
    look.hand = bestFirstTarget();
    coach.handUntil = performance.now() + 6000;
    advise('temir', T().c.goal, 6000);
  } else {
    g.hold = true;
    lesson('send');
  }
  if (DEBUG || q.has('covers')) window.__sybys = { get g() { return g; }, S, view, coach, look, act: doAction, intercept: tapRider, choose: pickEvent, finish: pickEnd, step: (d) => S.step(g, d), lesson, autumn: goAutumn };
}

// the first lesson points at an undecided pasture right next to the Orda
function bestFirstTarget() {
  const nb = g.map.regions[0].nb.map((e) => e.to).filter((i) => g.map.regions[i].tribe >= 0);
  return nb.sort((a, b) => g.t[a] - g.t[b])[0] ?? -1;
}

// small drawn marks on a clan's chip: a grudge (a torn flag), fear (a blade), whispers (two mouths)
const MARKS = {
  g: '<svg viewBox="0 0 12 12"><path d="M3 11V1.5h6l-1.5 2.2L9 6H3" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  f: '<svg viewBox="0 0 12 12"><path d="M2 10 9.5 2.5M8 1.5l2.5 2.5M3 8.5l1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  t: '<svg viewBox="0 0 12 12"><path d="M1.5 4.5a2.5 2 0 0 1 5 0 2.5 2 0 0 1-3 2l-1.5 1V6M6.5 7.5a2.5 2 0 0 0 4-1.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
};

// —— HUD ——

function buildHud() {
  const tr = $('tribes');
  tr.replaceChildren();
  for (let k = 0; k < 3; k++) {
    const c = el('div', 'tribe');
    c.title = T().tribeTip(tribeName(k));
    c.style.setProperty('--c', `rgb(${TRIBE_RGB[k].join(',')})`);
    const ava = el('div', 'ava');
    ava.innerHTML = face(k);
    const box = el('div', 'tb');
    box.append(el('span', 'tn', tribeName(k)), Object.assign(el('div', 'bar'), { innerHTML: '<i></i>' }));
    const tt = g.traits && T().traits[g.traits[k]];
    if (tt) {
      box.append(el('span', 'trait', tt[0]));
      c.title = `${tribeName(k)} — ${tt[0]}: ${tt[1]}`;
    }
    c.append(ava, box, el('span', 'fear'), el('span', 'tick', '✓'));
    tr.append(c);
  }
  actionsEl.replaceChildren();
  for (const [key, who] of [['word', 'temir'], ['aria', 'aria'], ['zaltyr', 'zaltyr'], ['karasai', 'karasai']]) {
    const b = el('button', 'act');
    b.dataset.key = key;
    const ava = el('span', 'ai');
    ava.innerHTML = face(who);
    const cost = el('span', 'ac');
    cost.innerHTML = ICONS.horse.repeat(S.COST[key]);
    b.append(ava, el('span', 'an', T()[key]), el('span', 'as', T()[key + 'Sub']), cost);
    b.onclick = () => { action = key; sfx.send(); updateHud(); if (b.classList.contains('off')) shake(g && g.horses < S.COST[key] ? $('horsesChip') : b); };
    // what the action does: on hover, or for a moment after a tap on a phone
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') showTip(b, key, who); });
    b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideTip(); });
    b.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') { showTip(b, key, who); clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 3500); } });
    actionsEl.append(b);
  }
  $('journalBtn').innerHTML = ICONS.scroll;
  $('fitBtn').innerHTML = ICONS.map;
  $('fitBtn').title = lang === 'ru' ? 'Вся карта' : 'Whole map';
  const fs = $('fsBtn');
  fs.hidden = !!PORTAL || !document.fullscreenEnabled;
  fs.title = lang === 'ru' ? 'На весь экран' : 'Fullscreen';
  fs.innerHTML = document.fullscreenElement ? ICONS.shrink : ICONS.expand;
  fs.onclick = () => {
    const done = () => { fs.innerHTML = document.fullscreenElement ? ICONS.shrink : ICONS.expand; setTimeout(fit, 150); };
    (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).then(done, done);
  };
  $('horseIcon').innerHTML = ICONS.horse;
  $('journalBtn').onclick = () => { if (g.phase === 'map') journal(); };
  $('fitBtn').hidden = !view.resetCam;
  $('fitBtn').onclick = () => view.resetCam?.();
  $('speedBtn').onclick = () => { speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; updateHud(); };
  $('pauseBtn').onclick = () => { if (g.phase === 'map') togglePause(); };
  $('soundBtn').onclick = () => { setSound(!sound.on); audioInit(); updateHud(); };
  updateHud();
}

const tipEl = el('div', 'tip');
document.body.append(tipEl);
let tipTimer = 0;
function showTip(btn, key, who) {
  const t = T();
  tipEl.replaceChildren();
  const ava = el('div', 'ava');
  ava.innerHTML = face(who);
  const box = el('div');
  box.append(el('b', null, t[key]), el('p', null, t[key + 'Tip']), el('small', null, t.costs(S.COST[key])));
  tipEl.append(ava, box);
  const r = btn.getBoundingClientRect();
  tipEl.classList.add('on');
  const w = tipEl.offsetWidth;
  tipEl.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
  tipEl.style.bottom = window.innerHeight - r.top + 10 + 'px';
}
function hideTip() {
  tipEl.classList.remove('on');
}

function togglePause(force) {
  paused = force ?? !paused;
  if (paused) {
    const box = el('div', 'screen pause');
    box.append(el('h2', null, T().pause));
    const b = el('button', 'big', T().resume);
    b.onclick = () => togglePause(false);
    box.append(b);
    ui.replaceChildren(box);
  } else ui.replaceChildren();
  updateHud();
}

function updateHud() {
  if (!g || g.demo) return;
  const t = T();
  $('horses').textContent = g.horses > S.HORSE_MAX ? `${S.HORSE_MAX}+${g.horses - S.HORSE_MAX}` : `${g.horses}/${S.HORSE_MAX}`;
  if (g.horses > lastHorses && lastHorses >= 0) { const hc = $('horsesChip'); hc.classList.remove('gain'); void hc.offsetWidth; hc.classList.add('gain'); }
  lastHorses = g.horses;
  $('regen').style.width = g.horses >= S.HORSE_MAX ? '100%' : `${(g.horseT / S.HORSE_EVERY) * 100}%`;
  $('seasonBar').style.width = `${Math.min(100, (g.clock / S.SEASON) * 100)}%`;
  const left = Math.max(0, Math.ceil(S.SEASON - g.clock));
  const v = S.kurultai(g);
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  $('seasonLbl').textContent = g.hold ? t.clockHold : window.innerHeight < 500 ? t.clockTiny(mm, v.yes) : window.innerWidth < 900 ? t.clockShort(mm, v.yes) : (g.season > 1 ? t.season2 + ' · ' : '') + t.clock(mm, v.yes);
  $('seasonChip').classList.toggle('win', v.yes >= 2);
  const chips = $('tribes').children;
  for (let k = 0; k < 3; k++) {
    chips[k].querySelector('i').style.width = `${v.votes[k].trust * 100}%`;
    chips[k].classList.toggle('ok', v.votes[k].yes);
    const tr = g.tribes[k];
    const marks = (tr.grievance ? 'g' : '') + (tr.fear > 0.25 ? 'f' : '') + (tr.talks ? 't' : '');
    const fe = chips[k].querySelector('.fear');
    if (fe.dataset.m !== marks) { fe.dataset.m = marks; fe.innerHTML = [...marks].map((ch) => MARKS[ch]).join(''); }
  }
  for (const b of actionsEl.children) {
    b.classList.toggle('sel', b.dataset.key === action);
    b.classList.toggle('off', !S.canAct(g, b.dataset.key));
    const wait = b.dataset.key === 'karasai' ? g.karasaiCD : b.dataset.key === 'aria' ? g.aria.busy : b.dataset.key === 'zaltyr' ? g.zaltyr.busy : 0;
    let cd = b.querySelector('.cdn');
    if (wait > 0.5) { if (!cd) { cd = el('span', 'cdn'); b.append(cd); } cd.textContent = Math.ceil(wait) + (lang === 'ru' ? 'с' : 's'); } else if (cd) cd.remove();
    // Zaltyr rides with the khan from autumn on
    if (b.dataset.key === 'zaltyr') b.hidden = g.season < 2 || !!g.flags.noScout;
  }
  look.actIcon = '· ' + T()[action];
  look.ordaName = T().hintOrda;
  look.trustTag = T().trustTag;
  $('speedBtn').textContent = '×' + speed;
  const pi = paused ? 'play' : 'pause', si = sound.on ? 'soundOn' : 'soundOff';
  if ($('pauseBtn').dataset.i !== pi) { $('pauseBtn').dataset.i = pi; $('pauseBtn').innerHTML = ICONS[pi]; }
  if ($('soundBtn').dataset.i !== si) { $('soundBtn').dataset.i = si; $('soundBtn').innerHTML = ICONS[si]; }
}

// a clan's sign jumps when its trust in the khan rises, and shows by how much
const trend = { at: 0, last: null };
function tribePulse(now) {
  if (!g || g.phase !== 'map' || now - trend.at < 1200) return;
  trend.at = now;
  const v = [0, 1, 2].map((k) => S.tribeTrust(g, k));
  if (trend.last) {
    const chips = $('tribes').children;
    v.forEach((x, k) => {
      const d = Math.round((x - trend.last[k]) * 100);
      if (Math.abs(d) < 1) return;
      const c = chips[k];
      c.classList.remove('bump', 'sink');
      void c.offsetWidth;
      c.classList.add(d > 0 ? 'bump' : 'sink');
      const tag = el('span', 'delta' + (d > 0 ? '' : ' down'), (d > 0 ? '+' : '−') + Math.abs(d) + '%');
      c.append(tag);
      setTimeout(() => tag.remove(), 1300);
    });
  }
  trend.last = v;
}

// —— taps on the map ——

// a short tap acts; a drag moves the map; the wheel or two fingers zoom (the 3D map only)
const touch = { pts: new Map(), down: null, last: null, moved: false, pinch: 0 };
cv.addEventListener('pointerdown', (e) => {
  try { cv.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
  touch.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touch.pts.size === 1) {
    touch.down = { x: e.clientX, y: e.clientY };
    touch.last = { ...touch.down };
    touch.moved = false;
  } else if (touch.pts.size === 2) {
    const [a, b] = [...touch.pts.values()];
    touch.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    touch.moved = true;
  }
});
cv.addEventListener('pointermove', (e) => {
  if (g && e.pointerType === 'mouse' && !touch.pts.size) {
    const id = view.regionAt(g, e.clientX, e.clientY);
    if (id !== view.hover) view.painted = false; // light it up at once
    view.hover = id;
    look.mouse = id >= 0 ? [e.clientX, e.clientY] : null;
  }
  if (!touch.pts.has(e.pointerId)) return;
  touch.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!view.panBy || !g) return;
  if (touch.pts.size === 1) {
    if (!touch.moved && Math.hypot(e.clientX - touch.down.x, e.clientY - touch.down.y) > 9) touch.moved = true;
    if (touch.moved) view.panBy(touch.last.x, touch.last.y, e.clientX, e.clientY);
    touch.last = { x: e.clientX, y: e.clientY };
  } else if (touch.pts.size === 2) {
    const [a, b] = [...touch.pts.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (touch.pinch) view.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / touch.pinch);
    touch.pinch = d;
  }
});
const lift = (e) => {
  if (!touch.pts.has(e.pointerId)) return;
  touch.pts.delete(e.pointerId);
  if (touch.pts.size === 1) touch.last = { ...[...touch.pts.values()][0] };
  if (!touch.pts.size && !touch.moved) pointer(e);
};
cv.addEventListener('pointerup', lift);
cv.addEventListener('pointerleave', () => { view.hover = -1; look.mouse = null; view.painted = false; });
cv.addEventListener('pointercancel', (e) => { touch.pts.delete(e.pointerId); touch.moved = true; });
cv.addEventListener('wheel', (e) => {
  if (!view.zoomAt || !g) return;
  e.preventDefault();
  view.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
}, { passive: false });

// a ✕ (where a lie passed) or the hideout under the finger: Aria rides there, no button needed
function markAt(px, py) {
  const spots = [...g.marks].filter((i) => !g.found.has(i));
  if (g.lairKnown && !g.clues.some((c) => c.kind === 'lair')) spots.push(g.lair);
  let best = -1, bd = Math.max(30, view.u * 2.2) ** 2;
  for (const i of spots) {
    const r = g.map.regions[i];
    if (r.tribe < 0) continue;
    const [x, y] = view.toScreen(r.x, r.y);
    for (const [mx, my] of [[x - view.u * 2.6, y - view.u * 2.2], [x, y]]) {
      const d = (mx - px) ** 2 + (my - py) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
  }
  return best;
}

function pointer(e) {
  if (tourState) { nudgeTour(); return; }
  if (!g || g.phase !== 'map' || paused) return;
  audioInit();
  const px = e.clientX, py = e.clientY;
  // the riders worth tapping are found generously; an honest messenger only when the tap is right on him
  const rider = view.riderAt(g, px, py, ['false', 'raider', 'envoy']) || view.riderAt(g, px, py, ['tribe'], 16);
  if (rider) { tapRider(rider.id); return; }
  const mark = coach.step === 'false' ? -1 : markAt(px, py);
  if (mark >= 0 && (action === 'aria' || S.canAct(g, 'aria') || coach.step === 'aria')) { doAction('aria', mark); return; }
  const id = view.regionAt(g, px, py);
  if (id < 0) return;
  if (id === 0) { say(T().hintOrda, 1500); return; }
  // during the lesson only the step being taught counts
  if (coach.step === 'false') return;
  doAction(action, id);
}

function doAction(kind, id) {
  if (!S.canAct(g, kind)) {
    sfx.no();
    say(g.horses < S.COST[kind] ? T().hintNoHorse : kind === 'aria' ? T().hintAriaBusy : T().hintKarasaiCD, 1500);
    if (g.horses < S.COST[kind]) shake($('horsesChip'));
    else shake([...actionsEl.children].find((b) => b.dataset.key === kind));
    return false;
  }
  const r = S.act(g, kind, id);
  if (!r) return false;
  sfx.send();
  if (kind === 'word') coach.words++;
  if (coach.step === 'send') { lesson('watch'); coach.stepUntil = performance.now() + 1e9; coach.watchRider = r.id; }
  else if (coach.step === 'more' && coach.words >= 3) lesson('false');
  else if (coach.step === 'more') { look.hand = S.suggest(g); advise('aria', T().c.more(3 - coach.words)); }
  else if (coach.step === 'aria' && kind === 'aria') lesson('karasai');
  if (!coach.step && look.hand >= 0) { look.hand = -1; glowButton(null); }
  if (kind !== 'word') action = 'word';
  updateHud();
  return true;
}

function tapRider(id) {
  const res = S.intercept(g, id);
  if (res === 'caught' || res === 'killer' || res === 'repelled') { hitStop = performance.now() + 140; view.flashAt = view.lastNow || performance.now(); } // the flash runs on the drawing clock
  if (res === 'caught') { sfx.caught(); if (!coach.step) say(T().caught, 1800); if (look.pulse === id) look.pulse = null; }
  if (res === 'insult') { sfx.bad(); say(T().insulted, 2200); }
  if (res === 'repelled') sfx.clash();
  if (res === 'nohorse') { sfx.no(); say(T().hintNoHorse, 1500); shake($('horsesChip')); }
  if (res === 'killer') { sfx.caught(); sfx.clue(); }
  return res;
}

// —— situations ——

function showEvent() {
  const e = g.event;
  const t = T();
  const ev = t.ev[e.id];
  hush();
  const box = el('div', 'screen event');
  const names = e.id === 'well' ? [tribeName(e.strong), tribeName(e.weak)] : e.accused != null ? [tribeName(e.accused)] : [];
  const who = {
    well: [e.strong, e.weak],
    caravan: ['sarman', e.accused],
    letter: ['aria'],
    army: ['karasai', 'orazbai'],
    drought: [e.accused, 'sarman'],
    plot: ['zaltyr', e.accused],
    truth: ['orazbai', 'aria'],
  }[e.id] || ['aria', 'karasai'];
  const faces = el('div', 'faces');
  for (const w of who) {
    const a = el('div', 'ava');
    a.innerHTML = face(w);
    faces.append(a);
  }
  box.append(faces, el('h2', null, ev.t), el('p', 'line', fmt(ev.l, ...names)));
  const row = el('div', 'choices');
  for (const c of S.eventChoices(g)) {
    const [label, note] = t.ch[`${e.id}.${c.key}`];
    const b = el('button', 'choice');
    b.disabled = !c.ok;
    b.append(el('b', null, label), el('small', null, fmt(note, ...names)));
    if (c.cost) { const cs = el('span', 'cost'); cs.innerHTML = ICONS.horse + ' ' + c.cost; b.append(cs); }
    if (!c.ok) {
      const why = g.horses < c.cost ? t.whyOff.horses(c.cost) : t.whyOff.aria;
      b.title = why;
      b.append(el('small', 'why', why));
    }
    b.onclick = () => pickEvent(c.key);
    row.append(b);
  }
  box.append(row);
  ui.replaceChildren(box);
}

function pickEvent(key) {
  if (!S.choose(g, key)) return false;
  sfx.send();
  ui.replaceChildren();
  if (g.phase === 'event') showEvent(); // one choice can bring the next scene at once
  updateHud();
  return true;
}

function journal() {
  paused = true;
  const t = T();
  const box = el('div', 'screen journal');
  box.append(el('h2', null, t.journalTitle), el('h3', null, t.clueHead));
  const ul = el('ul');
  if (!g.clues.length) ul.append(el('li', 'muted', t.noClues));
  for (const c of g.clues) {
    const li = el('li', null, '✦ ' + t.clue[c.kind]);
    if (c.hint >= 0 && c.hint < 4) li.append(el('small', 'hint', t.hints[g.culprit][c.hint]));
    ul.append(li);
  }
  box.append(ul, el('h3', null, t.deedsHead));
  const dl = el('ul');
  for (const d of g.log.filter((x) => x.key.startsWith('d.'))) dl.append(el('li', null, '• ' + t.ch[d.key.slice(2)][0]));
  box.append(dl);
  const b = el('button', 'big', t.close);
  b.onclick = () => { paused = false; ui.replaceChildren(); updateHud(); };
  box.append(b);
  ui.replaceChildren(box);
}

// —— the kurultai: whips go up one by one ——

function showKurultai(council = false) {
  const t = T();
  const v = g.vote;
  const box = el('div', 'screen kurultai');
  box.append(el('h2', null, council ? t.councilTitle : t.kTitle), el('p', 'line', council ? t.councilLine : t.kLine));
  const ring = el('div', 'ring');
  const seats = v.votes.map((x) => {
    const s = el('div', 'seat');
    s.style.setProperty('--c', `rgb(${TRIBE_RGB[x.tribe].join(',')})`);
    const ava = el('div', 'ava');
    ava.innerHTML = face(x.tribe);
    s.append(el('span', 'whip', '·'), ava, el('b', null, tribeName(x.tribe)), el('small', null, Math.round(x.trust * 100) + '%'));
    if (g.traits) s.append(el('small', 'trait', T().traits[g.traits[x.tribe]][0]));
    ring.append(s);
    return s;
  });
  box.append(ring);
  const rest = el('div', 'rest');
  box.append(rest);
  ui.replaceChildren(box);
  let k = 0;
  const next = () => {
    if (g.phase !== (council ? 'council' : 'kurultai')) return;
    if (k < seats.length) {
      const yes = v.votes[k].yes;
      seats[k].classList.add(yes ? 'yes' : 'no');
      seats[k].querySelector('.whip').textContent = yes ? '▲\uFE0E' : '▼\uFE0E';
      seats[k].append(el('em', null, yes ? t.kYes : t.kNo));
      if (!yes) {
        const tr = g.tribes[v.votes[k].tribe];
        const why = v.votes[k].trust < v.votes[k].line ? t.whyLow : tr.grievance ? t.whyGrudge : t.whyTalks;
        seats[k].append(el('small', 'why', why));
      }
      sfx.whip(yes);
      k++;
      setTimeout(next, DEBUG ? 50 : 900);
      return;
    }
    if (council) {
      // who joins the khan for autumn
      const row = el('div', 'faces');
      for (const w of ['zaltyr', 'sarman', 'orazbai']) {
        const a = el('div', 'ava');
        a.innerHTML = face(w);
        row.append(a);
      }
      const go = el('button', 'big', t.councilGo);
      go.onclick = goAutumn;
      rest.append(row, el('p', 'small', t.councilNews), go);
      return;
    }
    const oz = el('div', 'speaker');
    const oa = el('div', 'ava');
    oa.innerHTML = face('orazbai');
    const os = el('div', 'said');
    os.append(el('b', null, t.who.orazbai), el('p', null, t.kOrazbai(v.orazbai)));
    oz.append(oa, os);
    rest.append(oz);
    if (v.karasai) { rest.append(el('p', 'warn', t.kKarasai)); sfx.force(); }
    rest.append(el('p', 'line', t.kChoose + ' · ' + t.kClues(g.clues.length)));
    const row = el('div', 'choices');
    for (const c of S.choicesAtKurultai(g)) {
      const [label, note] = t.kch[c.key];
      const b = el('button', 'choice');
      b.disabled = !c.ok;
      b.append(el('b', null, label), el('small', null, note));
      b.onclick = () => (c.key === 'reveal' ? suspects() : pickEnd(c.key));
      row.append(b);
    }
    rest.append(row);
  };
  setTimeout(next, DEBUG ? 50 : 700);
}

// who is behind it all: four faces, and what the clues say
function suspects() {
  const t = T();
  const box = el('div', 'screen suspects');
  box.append(el('h2', null, t.suspectTitle), el('p', 'line', t.suspectLine));
  const hints = el('ul', 'hintlist');
  for (const c of g.clues) if (c.hint >= 0 && c.hint < 4) hints.append(el('li', null, '✦ ' + t.hints[g.culprit][c.hint]));
  box.append(hints);
  const row = el('div', 'choices');
  for (const w of S.SUSPECTS) {
    const b = el('button', 'choice suspect');
    const a = el('div', 'ava');
    a.innerHTML = face(w);
    b.append(a, el('b', null, t.who[w]));
    b.onclick = () => pickEnd('reveal', w);
    row.append(b);
  }
  const back = el('button', 'link', t.back);
  back.onclick = () => { shownPhase = null; };
  box.append(row, back);
  ui.replaceChildren(box);
}

// autumn: the same steppe, three more people, the great kurultai at the end
function goAutumn() {
  if (!S.nextSeason(g)) return false;
  ui.replaceChildren();
  hud.hidden = false;
  actionsEl.hidden = false;
  shownPhase = 'map';
  buildHud();
  fit();
  const t = T().c;
  action = 'word';
  glowButton('zaltyr');
  advise('zaltyr', t.zaltyr, 7000);
  setTimeout(() => { if (g && g.phase === 'map' && !g.demo) advise('sarman', t.caravan, 6000); glowButton(null); }, 7500);
  return true;
}

function pickEnd(key, suspect = null) {
  const c = S.choicesAtKurultai(g).find((x) => x.key === key);
  if (!c || !c.ok || g.phase !== 'kurultai') return null;
  const res = S.finish(g, key, suspect);
  showEnd(M.record(g));
  return res;
}

function showEnd(rec) {
  const t = T();
  const r = g.result;
  const [title, ...lines] = t.end[r.variant === 'left' ? 'vanishLeft' : r.end];
  const box = el('div', 'screen end ' + r.end);
  box.append(el('p', 'small', t.endHead), el('h2', null, title));
  for (const l of lines) box.append(el('p', 'line', l));
  // the mystery solved, or not
  const who = el('div', 'speaker culprit');
  const a = el('div', 'ava');
  a.innerHTML = face(r.culprit);
  const said = el('div', 'said');
  said.append(el('b', null, t.culpritWas(t.who[r.culprit])), el('p', r.nailed ? 'ok' : 'warn', r.nailed ? '✓ ' + t.named.right : r.named ? t.named.wrong(t.who[r.named]) : t.named.none));
  who.append(a, said);
  box.append(who, el('p', 'small', t.endStat(r.score, r.yes)));
  if (rec) {
    box.append(el('p', 'glory', t.gloryGain(rec.gained, rec.total)));
    for (const d of rec.newDeeds) box.append(el('p', 'deed', `✦ ${t.newDeed}: ${t.deeds[d][0]}`));
    for (const s of rec.opened) box.append(el('p', 'deed', t.opened(t.styles[s])));
  }
  const b = el('button', 'big', t.playAgain);
  b.onclick = () => { mode = 'free'; busyThen(b, start); };
  box.append(b);
  const meta = M.load();
  const row = el('div', 'titlerow');
  if (!M.dailyDone(meta)) {
    const dly = el('button', 'link', t.dailyBtn);
    dly.onclick = () => { mode = 'daily'; busyThen(dly, start); };
    row.append(dly);
  }
  const chr = el('button', 'link', t.chronicleBtn);
  chr.onclick = () => chronicle(() => showEnd(rec));
  row.append(chr);
  box.append(row);
  if (rec && rec.newDeeds.length) setTimeout(() => sfx.clue(), 600);
  hud.hidden = true;
  actionsEl.hidden = true;
  hush();
  view.setCinema?.(true);
  ui.replaceChildren(box);
  sfx[r.end === 'uniter' || r.end === 'mediator' ? 'clue' : 'bad']();
  if (r.end === 'uniter' || r.end === 'mediator') happytime();
}

// —— the loop ——

let shownPhase = null;
let hitStop = 0;
let lastHorses = -1;
let lastMusic = -1;
let lastMood = '';
function frame(now) {
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  watchSpeed(Math.min(0.5, raw));
  last = now;
  if (g && g.demo) S.step(g, dt * 0.6);
  else if (g && !paused && g.phase === 'map') {
    // the false rider of the lesson comes slowly, so there is time to see him; the first seconds of a raid
    // and the whole night run slower too, so a person can react
    const slow = coach.step === 'false' ? 0.4 : g.night && !g.night.until ? 0.55 : g.raid && g.time - g.raid.at < 2.5 ? 0.5 : 1;
    if (g.night && !g.night.told) { g.night.told = true; sfx.night(); advise('aria', T().c.night, 6000); }
    // a catch freezes the world for a blink: you feel it
    if (performance.now() > hitStop) for (let k = 0; k < speed; k++) S.step(g, dt * slow);
  }
  if (g) {
    for (const f of g.fx.splice(0)) {
      view.pushFx(f, now);
      if (f.type === 'word') {
        sfx.word();
        if (coach.step === 'watch' && coach.stepUntil > now + 1e8) coach.stepUntil = now + 3500;
      }
      if (f.type === 'lie') sfx.lie();
      if (f.type === 'force') sfx.force();
      if (f.type === 'clue') sfx.clue();
      if (f.type === 'trade') sfx.word();
      if (f.type === 'clash') sfx.clash();
      if (f.type === 'dust' && !g.demo) sfx.distant();
      if (f.type === 'fire') sfx.fire();
      if (f.type === 'raid' && !g.demo) { sfx.drums(); if (!tourState) advise('karasai', T().c.raid, 7000); }
    }
    for (const tt of g.toasts.splice(0)) showToast(tt);
    tourTick(now);
    if (!g.demo && !tourState) {
      lessonTick(now);
      tips(now);
      tribePulse(now);
    }
    if (coach.until && now > coach.until) hush();
    coachSeeThrough();
    if (g.phase === 'event' && shownPhase === 'event' && !ui.children.length) showEvent(); // never a scene without its screen
    if (g.phase !== shownPhase) {
      shownPhase = g.phase;
      if (g.phase === 'event') showEvent();
      if (g.phase === 'kurultai' || g.phase === 'council') {
        hud.hidden = true;
        actionsEl.hidden = true;
        hintEl.classList.remove('on');
        toastsEl.replaceChildren();
        hush();
        look.hand = -1;
        look.pulse = null;
        showKurultai(g.phase === 'council');
      }
    }
    updateHud();
  }
  if (hintUntil && now > hintUntil) { hintEl.classList.remove('on'); hintUntil = 0; }
  // the dombra: full on the title and the cards, soft under play
  const lvl = !g || g.demo || g.phase === 'end' ? 1 : g.phase === 'map' ? 0.7 : 0.85;
  if (lvl !== lastMusic) { lastMusic = lvl; musicLevel(lvl); }
  // and which küi
  const mood = tourState ? 'kerbez' : !g || g.demo ? 'adai' : g.phase !== 'map' ? 'dala' : g.raid ? 'shabuyl' : g.night ? 'tun' : 'play';
  if (mood !== lastMood) { lastMood = mood; musicMood(mood); }
  // the portal counts only real play: not the title, the cards, the scenes or a pause
  gameplay(!!g && !g.demo && g.phase === 'map' && !paused && !document.hidden);
  view.draw(g && (g.phase !== 'end' || view.setCinema) ? g : null, now, look);
  requestAnimationFrame(frame);
}

function showToast(tt) {
  const t = T();
  // the same news again: count it on the card already shown
  const sig = tt.key + '|' + (tt.args?.tribe ?? '') + '|' + (tt.text || '');
  const same = [...toastsEl.children].find((n) => n.dataset.sig === sig && !n.classList.contains('out'));
  if (same) {
    same.dataset.n = +(same.dataset.n || 1) + 1;
    same.querySelector('b').textContent = same.dataset.who + ' ×' + same.dataset.n;
    return;
  }
  const who = typeof tt.who === 'number' ? tribeName(tt.who) : t.who[tt.who] || '';
  const text = tt.text || fmt(t.toast[tt.key], tribeName(tt.args?.tribe ?? 0));
  const n = el('div', 'toast');
  if (typeof tt.who === 'number') n.style.setProperty('--c', `rgb(${TRIBE_RGB[tt.who].join(',')})`);
  const ava = el('div', 'ava');
  ava.innerHTML = face(tt.who);
  const said = el('div');
  said.append(el('b', null, who), el('span', null, text));
  n.append(ava, said);
  n.dataset.sig = sig;
  n.dataset.who = who;
  toastsEl.append(n);
  // never a wall of news: the oldest goes when there are too many
  // on a phone the advisor and the news share the bottom of the map: while he speaks only the newest card stays
  const small = window.innerWidth < 700 || window.innerHeight < 500;
  const max = small ? (coachEl.classList.contains('on') ? 1 : 2) : 3;
  while (toastsEl.children.length > max) toastsEl.firstChild.remove();
  setTimeout(() => n.classList.add('out'), 4200);
  setTimeout(() => n.remove(), 4800);
}


function fit() {
  // the map takes what the bars leave
  view.top = hud.hidden ? 12 : hud.getBoundingClientRect().bottom + 8;
  view.bottom = actionsEl.hidden ? 12 : window.innerHeight - actionsEl.getBoundingClientRect().top + 8;
  view.resize();
}
window.addEventListener('resize', fit);
document.addEventListener('visibilitychange', () => { if (document.hidden && g && g.phase === 'map' && !paused) togglePause(true); });
window.addEventListener('keydown', (e) => {
  if (!g || g.phase !== 'map') return;
  if (e.key === '1') action = 'word';
  if (e.key === '2') action = 'aria';
  if (e.key === '3' && g.season > 1) action = 'zaltyr';
  if (e.key === (g.season > 1 ? '4' : '3')) action = 'karasai';
  if (e.key === ' ') { e.preventDefault(); document.activeElement?.blur?.(); togglePause(); }
  updateHud();
});

document.documentElement.lang = lang;
view.resize();
if (q.has('covers')) window.__view = () => ({ view, g, S });
startScreen();
// loading is over once the models are in (they are small; the 2D map needs none)
modelsReady.then(() => {
  loadingDone();
  const boot = document.getElementById('boot');
  if (boot) { boot.classList.add('gone'); setTimeout(() => boot.remove(), 700); }
});
onPortalMute((muted) => holdAudio(muted));
if (q.has('play')) start();
requestAnimationFrame(frame);
