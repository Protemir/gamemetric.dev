import * as S from './sim.js';
import { View, TRIBE_RGB } from './render.js';
import { View3D, webglOK } from './render3d.js';
import { el, store } from './util.js';
import { T, lang, setLang } from './text.js';
import { sfx, audioInit, sound, setSound } from './sfx.js';
import { avatar, elder, LONE_HORSE } from './avatars.js';

const q = new URLSearchParams(location.search);
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
  if (fps < 20 || q.has('forceLite')) downgrade(fps);
}
function downgrade(fps) {
  store.set('sybys.lite', true);
  view.dispose();
  const hover = view.hover;
  view = new View(cv);
  view.hover = hover;
  fit();
  if (DEBUG && window.__sybys) window.__sybys.view = view;
  console.info('sybys: 3D too slow here (' + fps.toFixed(1) + ' fps), switched to 2D');
}
const $ = (id) => document.getElementById(id);
const hud = $('hud'), ui = $('ui'), hintEl = $('hint'), actionsEl = $('actions'), toastsEl = $('toasts'), coachEl = $('coach');

let g = null;
let speed = 1;
let paused = true;
let last = performance.now();
let action = 'word';
const look = { hand: -1, pulse: null, numbers: DEBUG || q.has('numbers'), names: null };
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
function glowButton(key) {
  coach.glow = key;
  for (const b of actionsEl.children) b.classList.toggle('glow', b.dataset.key === key);
}

function lesson(step) {
  const t = T().c;
  coach.step = step;
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
  box.append(el('h1', null, T().title), orn, el('p', 'sub', T().sub));
  const play = el('button', 'big play', T().play);
  play.onclick = () => { audioInit(); intro(store.get('sybys.tutDone', false) ? 3 : 1); };
  const lng = el('button', 'link', T().langBtn);
  lng.onclick = () => { setLang(lang === 'ru' ? 'en' : 'ru'); document.documentElement.lang = lang; startScreen(); };
  box.append(play, lng);
  const best = store.get('sybys.best', null);
  const seen = store.get('sybys.ends', []);
  if (best != null) box.append(el('p', 'small', T().best(best) + ' · ' + T().endsSeen(seen.length)));
  ui.classList.toggle('cine', live);
  ui.replaceChildren(box);
}

// a ram's-horn ornament (qoshqar müiz) under the title
const ORNAMENT = '<svg viewBox="0 0 240 28" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M120 22c-8 0-12-6-12-10s4-8 8-6-2 6-4 4"/><path d="M120 22c8 0 12-6 12-10s-4-8-8-6 2 6 4 4"/><path d="M104 14H20M136 14h84"/><path d="M20 14c-6 0-8-6-4-8s6 2 4 4M220 14c6 0 8-6 4-8s-6 2-4 4"/><circle cx="120" cy="5" r="2.2" fill="currentColor"/></g></svg>';

// three short cards: what happened, who is with you, what to do
function intro(page) {
  const t = T();
  backdrop();
  const box = el('div', 'screen intro');
  const go = el('button', 'big', page < 3 ? t.next : t.begin);
  go.onclick = () => (page < 3 ? intro(page + 1) : start());
  if (page === 1) {
    if (!view.setCinema) {
      const pic = el('div', 'pic');
      pic.innerHTML = LONE_HORSE;
      box.append(pic);
    }
    box.append(el('p', 'line', t.intro1));
  }
  if (page === 2) {
    for (const [who, line] of [['aria', t.intro2], ['karasai', t.intro3]]) {
      const row = el('div', 'speaker');
      const ava = el('div', 'ava');
      ava.innerHTML = face(who);
      const said = el('div', 'said');
      said.append(el('b', null, t.who[who]), el('p', null, line));
      row.append(ava, said);
      box.append(row);
    }
  }
  if (page === 3) {
    box.append(el('h2', null, t.goalTitle), el('p', 'line', t.goalText));
    const bars = el('div', 'goalbars');
    [0.62, 0.4, 0.58].forEach((v, k) => {
      const b = el('div', 'gb' + (v >= S.VOTE_AT ? ' ok' : ''));
      b.style.setProperty('--c', `rgb(${TRIBE_RGB[k].join(',')})`);
      const ava = el('div', 'ava');
      ava.innerHTML = face(k);
      b.append(ava, el('span', null, tribeName(k)), Object.assign(el('div', 'bar'), { innerHTML: `<i style="width:${v * 100}%"></i>` }), el('em', null, v >= S.VOTE_AT ? '✓' : '…'));
      bars.append(b);
    });
    box.append(bars, el('p', 'small', t.goalHow));
  }
  box.append(go);
  if (page < 3) {
    const sk = el('button', 'link', t.skip);
    sk.onclick = () => intro(3);
    box.append(sk);
  }
  ui.replaceChildren(box);
}

function start() {
  g = S.newGame(q.has('seed') ? +q.get('seed') : (Math.random() * 1e9) | 0);
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
  if (DEBUG) window.__sybys = { g, S, view, coach, look, act: doAction, intercept: tapRider, choose: pickEvent, finish: pickEnd, step: (d) => S.step(g, d), lesson };
}

// the first lesson points at an undecided pasture right next to the Orda
function bestFirstTarget() {
  const nb = g.map.regions[0].nb.map((e) => e.to).filter((i) => g.map.regions[i].tribe >= 0);
  return nb.sort((a, b) => g.t[a] - g.t[b])[0] ?? -1;
}

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
    c.append(ava, box, el('span', 'fear'), el('span', 'tick', '✓'));
    tr.append(c);
  }
  actionsEl.replaceChildren();
  for (const [key, who] of [['word', 'temir'], ['aria', 'aria'], ['karasai', 'karasai']]) {
    const b = el('button', 'act');
    b.dataset.key = key;
    b.title = T()[key + 'Tip'];
    const ava = el('span', 'ai');
    ava.innerHTML = face(who);
    b.append(ava, el('span', 'an', T()[key]), el('span', 'as', T()[key + 'Sub']), el('span', 'ac', '🐎'.repeat(S.COST[key])));
    b.onclick = () => { action = key; sfx.send(); updateHud(); };
    // what the action does: on hover, or for a moment after a tap on a phone
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') showTip(b, key, who); });
    b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideTip(); });
    b.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') { showTip(b, key, who); clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 3500); } });
    actionsEl.append(b);
  }
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
  box.append(el('b', null, t[key]), el('p', null, t[key + 'Tip']), el('small', null, '🐎 ' + t.costs(S.COST[key])));
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
  $('horses').textContent = `${g.horses}/${S.HORSE_MAX}`;
  $('regen').style.width = g.horses >= S.HORSE_MAX ? '100%' : `${(g.horseT / S.HORSE_EVERY) * 100}%`;
  $('seasonBar').style.width = `${Math.min(100, (g.clock / S.SEASON) * 100)}%`;
  const left = Math.max(0, Math.ceil(S.SEASON - g.clock));
  const v = S.kurultai(g);
  $('seasonLbl').textContent = g.hold ? t.clockHold : t.clock(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, v.yes);
  $('seasonChip').classList.toggle('win', v.yes >= 2);
  const chips = $('tribes').children;
  for (let k = 0; k < 3; k++) {
    chips[k].querySelector('i').style.width = `${v.votes[k].trust * 100}%`;
    chips[k].classList.toggle('ok', v.votes[k].yes);
    const tr = g.tribes[k];
    chips[k].querySelector('.fear').textContent = (tr.grievance ? '😠' : '') + (tr.fear > 0.25 ? '😨' : '') + (tr.talks ? '🤫' : '');
  }
  for (const b of actionsEl.children) {
    b.classList.toggle('sel', b.dataset.key === action);
    b.classList.toggle('off', !S.canAct(g, b.dataset.key));
  }
  $('speedBtn').textContent = '×' + speed;
  $('pauseBtn').textContent = paused ? '▶' : '❚❚';
  $('soundBtn').textContent = sound.on ? '🔊' : '🔇';
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
  if (g && e.pointerType === 'mouse' && !touch.pts.size) view.hover = view.regionAt(g, e.clientX, e.clientY);
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
  if (!g || g.phase !== 'map' || paused) return;
  audioInit();
  const px = e.clientX, py = e.clientY;
  const rider = view.riderAt(g, px, py);
  if (rider && (rider.kind === 'false' || rider.kind === 'tribe')) { tapRider(rider.id); return; }
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
  if (res === 'caught') { sfx.caught(); if (!coach.step) say(T().caught, 1800); if (look.pulse === id) look.pulse = null; }
  if (res === 'insult') { sfx.bad(); say(T().insulted, 2200); }
  return res;
}

// —— situations ——

function showEvent() {
  const e = g.event;
  const t = T();
  const ev = t.ev[e.id];
  hush();
  const box = el('div', 'screen event');
  const names = e.id === 'well' ? [tribeName(e.strong), tribeName(e.weak)] : e.id === 'caravan' ? [tribeName(e.accused)] : [];
  const who = e.id === 'well' ? [e.strong, e.weak] : e.id === 'caravan' ? ['merchants', e.accused] : e.id === 'letter' ? ['aria'] : ['aria', 'karasai'];
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
    if (c.cost) b.append(el('span', 'cost', t.cost(c.cost)));
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
  for (const c of g.clues) ul.append(el('li', null, '🔍 ' + t.clue[c.kind]));
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

function showKurultai() {
  const t = T();
  const v = g.vote;
  const box = el('div', 'screen kurultai');
  box.append(el('h2', null, t.kTitle), el('p', 'line', t.kLine));
  const ring = el('div', 'ring');
  const seats = v.votes.map((x) => {
    const s = el('div', 'seat');
    s.style.setProperty('--c', `rgb(${TRIBE_RGB[x.tribe].join(',')})`);
    const ava = el('div', 'ava');
    ava.innerHTML = face(x.tribe);
    s.append(el('span', 'whip', '·'), ava, el('b', null, tribeName(x.tribe)), el('small', null, Math.round(x.trust * 100) + '%'));
    ring.append(s);
    return s;
  });
  box.append(ring);
  const rest = el('div', 'rest');
  box.append(rest);
  ui.replaceChildren(box);
  let k = 0;
  const next = () => {
    if (g.phase !== 'kurultai') return;
    if (k < seats.length) {
      const yes = v.votes[k].yes;
      seats[k].classList.add(yes ? 'yes' : 'no');
      seats[k].querySelector('.whip').textContent = yes ? '⬆' : '⬇';
      seats[k].append(el('em', null, yes ? t.kYes : t.kNo));
      if (!yes) {
        const tr = g.tribes[v.votes[k].tribe];
        const why = v.votes[k].trust < S.VOTE_AT ? t.whyLow : tr.grievance ? t.whyGrudge : t.whyTalks;
        seats[k].append(el('small', 'why', why));
      }
      sfx.whip(yes);
      k++;
      setTimeout(next, DEBUG ? 50 : 900);
      return;
    }
    if (v.karasai) { rest.append(el('p', 'warn', t.kKarasai)); sfx.force(); }
    rest.append(el('p', 'line', t.kChoose + ' · ' + t.kClues(g.clues.length)));
    const row = el('div', 'choices');
    for (const c of S.choicesAtKurultai(g)) {
      const [label, note] = t.kch[c.key];
      const b = el('button', 'choice');
      b.disabled = !c.ok;
      b.append(el('b', null, label), el('small', null, note));
      b.onclick = () => pickEnd(c.key);
      row.append(b);
    }
    rest.append(row);
  };
  setTimeout(next, DEBUG ? 50 : 700);
}

function pickEnd(key) {
  const c = S.choicesAtKurultai(g).find((x) => x.key === key);
  if (!c || !c.ok || g.phase !== 'kurultai') return null;
  const res = S.finish(g, key);
  const best = store.get('sybys.best', null);
  if (best == null || res.score > best) store.set('sybys.best', res.score);
  const seen = new Set(store.get('sybys.ends', []));
  seen.add(res.end);
  store.set('sybys.ends', [...seen]);
  showEnd();
  return res;
}

function showEnd() {
  const t = T();
  const r = g.result;
  const [title, ...lines] = t.end[r.end];
  const box = el('div', 'screen end ' + r.end);
  box.append(el('p', 'small', t.endHead), el('h2', null, title));
  for (const l of lines) box.append(el('p', 'line', l));
  box.append(el('p', 'small', t.endStat(r.score, r.yes)), el('p', 'small', t.endsSeen(store.get('sybys.ends', []).length)));
  const b = el('button', 'big', t.again);
  b.onclick = () => intro(3);
  box.append(b);
  hud.hidden = true;
  actionsEl.hidden = true;
  hush();
  view.setCinema?.(true);
  ui.replaceChildren(box);
  sfx[r.end === 'uniter' || r.end === 'mediator' ? 'clue' : 'bad']();
}

// —— the loop ——

let shownPhase = null;
function frame(now) {
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  watchSpeed(Math.min(0.5, raw));
  last = now;
  if (g && g.demo) S.step(g, dt * 0.6);
  else if (g && !paused && g.phase === 'map') {
    // the false rider of the lesson comes slowly, so there is time to see him
    const slow = coach.step === 'false' ? 0.4 : 1;
    for (let k = 0; k < speed; k++) S.step(g, dt * slow);
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
    }
    for (const tt of g.toasts.splice(0)) showToast(tt);
    if (!g.demo) {
      lessonTick(now);
      tips(now);
      tribePulse(now);
    }
    if (coach.until && now > coach.until) hush();
    if (g.phase !== shownPhase) {
      shownPhase = g.phase;
      if (g.phase === 'event') showEvent();
      if (g.phase === 'kurultai') {
        hud.hidden = true;
        actionsEl.hidden = true;
        hintEl.classList.remove('on');
        toastsEl.replaceChildren();
        hush();
        showKurultai();
      }
    }
    updateHud();
  }
  if (hintUntil && now > hintUntil) { hintEl.classList.remove('on'); hintUntil = 0; }
  view.draw(g && (g.phase !== 'end' || view.setCinema) ? g : null, now, look);
  requestAnimationFrame(frame);
}

function showToast(tt) {
  const t = T();
  const who = typeof tt.who === 'number' ? tribeName(tt.who) : t.who[tt.who] || '';
  const text = tt.text || fmt(t.toast[tt.key], tribeName(tt.args?.tribe ?? 0));
  const n = el('div', 'toast');
  if (typeof tt.who === 'number') n.style.setProperty('--c', `rgb(${TRIBE_RGB[tt.who].join(',')})`);
  const ava = el('div', 'ava');
  ava.innerHTML = face(tt.who);
  const said = el('div');
  said.append(el('b', null, who), el('span', null, text));
  n.append(ava, said);
  toastsEl.append(n);
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
  if (e.key === '3') action = 'karasai';
  if (e.key === ' ') togglePause();
  updateHud();
});

document.documentElement.lang = lang;
view.resize();
startScreen();
if (q.has('play')) start();
requestAnimationFrame(frame);
