import * as S from './sim.js';
import { View, TRIBE_RGB } from './render.js';
import { el, store } from './util.js';
import { T, lang, setLang } from './text.js';
import { sfx, audioInit, sound, setSound } from './sfx.js';

const q = new URLSearchParams(location.search);
const DEBUG = q.has('debug');
const SPEEDS = DEBUG ? [1, 2, 8] : [1, 2];

const cv = document.getElementById('game');
const view = new View(cv);
const $ = (id) => document.getElementById(id);
const hud = $('hud'), ui = $('ui'), hintEl = $('hint'), actionsEl = $('actions'), toastsEl = $('toasts');

let g = null;
let speed = 1;
let paused = true;
let last = performance.now();
let action = 'word';
const tut = { first: true, spread: false, falseTold: false, ariaTold: false };
const look = { hand: -1, pulse: null, numbers: DEBUG || q.has('numbers') };
let hintUntil = 0;

const tribeName = (k) => T().tribes[k];
const fmt = (v, ...a) => (typeof v === 'function' ? v(...a) : v);

function say(text, ms = 3200) {
  hintEl.textContent = text;
  hintEl.classList.add('on');
  hintUntil = performance.now() + ms;
}

// —— start ——

function startScreen() {
  hud.hidden = true;
  actionsEl.hidden = true;
  paused = true;
  const box = el('div', 'screen start');
  box.append(el('h1', null, T().title), el('p', 'sub', T().sub), el('p', 'intro', T().intro));
  const play = el('button', 'big', T().play);
  play.onclick = () => { audioInit(); start(); };
  const lng = el('button', 'link', T().langBtn);
  lng.onclick = () => { setLang(lang === 'ru' ? 'en' : 'ru'); document.documentElement.lang = lang; startScreen(); };
  box.append(play, lng);
  const best = store.get('sybys.best', null);
  const seen = store.get('sybys.ends', []);
  if (best != null) box.append(el('p', 'small', T().best(best) + ' · ' + T().endsSeen(seen.length)));
  ui.replaceChildren(box);
}

function start() {
  g = S.newGame(q.has('seed') ? +q.get('seed') : (Math.random() * 1e9) | 0);
  ui.replaceChildren();
  hud.hidden = false;
  actionsEl.hidden = false;
  paused = false;
  speed = 1;
  action = 'word';
  Object.assign(tut, { first: true, spread: false, falseTold: false, ariaTold: false });
  look.hand = bestFirstTarget();
  buildHud();
  fit();
  say(T().hintStart, 6000);
  if (DEBUG) window.__sybys = { g, S, view, act: doAction, intercept: tapRider, choose: pickEvent, finish: pickEnd, step: (d) => S.step(g, d) };
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
    c.append(el('span', 'tn', tribeName(k)), Object.assign(el('div', 'bar'), { innerHTML: '<i></i>' }), el('span', 'fear'));
    tr.append(c);
  }
  $('seasonLbl').textContent = T().season;
  actionsEl.replaceChildren();
  for (const [key, icon] of [['word', '🗣'], ['aria', '👁'], ['karasai', '⚔']]) {
    const b = el('button', 'act');
    b.dataset.key = key;
    b.title = T()[key + 'Tip'];
    b.append(el('span', 'ai', icon), el('span', 'an', T()[key]), el('span', 'ac', '🐎'.repeat(S.COST[key])));
    b.onclick = () => { action = key; sfx.send(); updateHud(); };
    actionsEl.append(b);
  }
  $('journalBtn').onclick = () => { if (g.phase === 'map') journal(); };
  $('speedBtn').onclick = () => { speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; updateHud(); };
  $('pauseBtn').onclick = () => { if (g.phase === 'map') togglePause(); };
  $('soundBtn').onclick = () => { setSound(!sound.on); audioInit(); updateHud(); };
  updateHud();
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
  if (!g) return;
  $('horses').textContent = `${g.horses}/${S.HORSE_MAX}`;
  $('regen').style.width = g.horses >= S.HORSE_MAX ? '100%' : `${(g.horseT / S.HORSE_EVERY) * 100}%`;
  $('seasonBar').style.width = `${Math.min(100, (g.time / S.SEASON) * 100)}%`;
  $('unity').textContent = Math.round(S.unity(g) * 100) + '%';
  const chips = $('tribes').children;
  for (let k = 0; k < 3; k++) {
    const v = S.tribeTrust(g, k);
    chips[k].querySelector('i').style.width = `${v * 100}%`;
    chips[k].classList.toggle('ok', v >= S.VOTE_AT);
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

// —— taps on the map ——

function pointer(e) {
  if (!g || g.phase !== 'map' || paused) return;
  audioInit();
  const px = e.clientX, py = e.clientY;
  const rider = view.riderAt(g, px, py);
  if (rider && (rider.kind === 'false' || rider.kind === 'tribe')) { tapRider(rider.id); return; }
  const id = view.regionAt(g, px, py);
  if (id < 0) return;
  if (id === 0) { say(T().hintOrda, 1500); return; }
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
  if (tut.first) { tut.first = false; look.hand = -1; hintEl.classList.remove('on'); }
  if (kind !== 'word') action = 'word';
  updateHud();
  return true;
}

function tapRider(id) {
  const res = S.intercept(g, id);
  if (res === 'caught') { sfx.caught(); say(T().caught, 1800); look.pulse = null; }
  if (res === 'insult') { sfx.bad(); say(T().insulted, 2200); }
  return res;
}

// —— situations ——

function showEvent() {
  const e = g.event;
  const t = T();
  const ev = t.ev[e.id];
  const box = el('div', 'screen event');
  const names = e.id === 'well' ? [tribeName(e.strong), tribeName(e.weak)] : e.id === 'caravan' ? [tribeName(e.accused)] : [];
  box.append(el('h2', null, ev.t), el('p', 'line', fmt(ev.l, ...names)));
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
    s.append(el('span', 'whip', '·'), el('b', null, tribeName(x.tribe)), el('small', null, Math.round(x.trust * 100) + '%'));
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
  b.onclick = () => start();
  box.append(b);
  hud.hidden = true;
  actionsEl.hidden = true;
  ui.replaceChildren(box);
  sfx[r.end === 'uniter' || r.end === 'mediator' ? 'clue' : 'bad']();
}

// —— the loop ——

let shownPhase = null;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (g && !paused && g.phase === 'map') {
    const steps = speed;
    for (let k = 0; k < steps; k++) S.step(g, dt);
  }
  if (g) {
    for (const f of g.fx.splice(0)) {
      view.pushFx(f, now);
      if (f.type === 'word') { sfx.word(); if (!tut.spread) { tut.spread = true; say(T().hintSpread, 4500); } }
      if (f.type === 'lie') sfx.lie();
      if (f.type === 'force') sfx.force();
      if (f.type === 'clue') sfx.clue();
    }
    for (const tt of g.toasts.splice(0)) showToast(tt);
    teach(now);
    if (g.phase !== shownPhase) {
      shownPhase = g.phase;
      if (g.phase === 'event') showEvent();
      if (g.phase === 'kurultai') {
        hud.hidden = true;
        actionsEl.hidden = true;
        hintEl.classList.remove('on');
        toastsEl.replaceChildren();
        showKurultai();
      }
    }
    updateHud();
  }
  if (hintUntil && now > hintUntil) { hintEl.classList.remove('on'); hintUntil = 0; }
  view.draw(g && g.phase !== 'end' ? g : null, now, look);
  requestAnimationFrame(frame);
}

// lessons as the game goes: the first forged rider gets a ring and a word
function teach() {
  if (g.phase !== 'map') return;
  const f = g.riders.find((r) => r.kind === 'false');
  if (f && !tut.falseTold && f.seg + f.p > 0.3) {
    tut.falseTold = true;
    look.pulse = f.id;
    say(T().hintFalse, 5000);
  }
  if (look.pulse && !g.riders.some((r) => r.id === look.pulse)) look.pulse = null;
  if (!tut.ariaTold && g.marks.size && S.canAct(g, 'aria') && g.time > 40) {
    tut.ariaTold = true;
    say(T().hintAria, 5000);
  }
}

function showToast(tt) {
  const t = T();
  const who = typeof tt.who === 'number' ? tribeName(tt.who) : t.who[tt.who] || '';
  const text = fmt(t.toast[tt.key], tribeName(tt.args.tribe ?? 0));
  const n = el('div', 'toast');
  if (typeof tt.who === 'number') n.style.setProperty('--c', `rgb(${TRIBE_RGB[tt.who].join(',')})`);
  n.append(el('b', null, who), el('span', null, text));
  toastsEl.append(n);
  setTimeout(() => n.classList.add('out'), 4200);
  setTimeout(() => n.remove(), 4800);
}

cv.addEventListener('pointerdown', pointer);
cv.addEventListener('pointermove', (e) => { if (g && e.pointerType === 'mouse') view.hover = view.regionAt(g, e.clientX, e.clientY); });
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
if (q.has('play')) { start(); }
requestAnimationFrame(frame);
