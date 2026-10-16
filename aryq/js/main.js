import * as S from './sim.js';
import { View } from './render.js';
import { el, store } from './util.js';

const q = new URLSearchParams(location.search);
const DEBUG = q.has('debug');
const W = 16, H = 26;
const SPEEDS = DEBUG ? [1, 3, 20] : [1, 3];

const cv = document.getElementById('game');
const view = new View(cv);
const $ = (id) => document.getElementById(id);
const hud = $('hud'), ui = $('ui'), hintEl = $('hint');

let g = null;
let speed = 1;
let paused = true;
let last = performance.now();
const state = { ghost: null, blocked: null };
let hintUntil = 0;

function seedNow() {
  return q.has('seed') ? +q.get('seed') : (Math.random() * 1e9) | 0;
}

function start() {
  g = S.newGame(W, H, seedNow());
  view.layout(g);
  speed = 1;
  paused = false;
  state.ghost = null;
  ui.replaceChildren();
  hud.hidden = false;
  S.advance(g, 0.01); // the first garden appears
  const first = g.objects.find((o) => o.type === 'garden');
  if (first && !store.get('aryq.dug', false)) state.ghost = { obj: first, ...S.planFor(g, first) };
  updateHud();
  if (DEBUG) window.__aryq = { g, S, view, step: (d) => S.advance(g, d) };
}

function say(text, ms = 2200) {
  hintEl.textContent = text;
  hintUntil = performance.now() + ms;
}

const WHY = {
  high: 'Слишком высоко: вода вверх не пойдёт. Бери воду выше по реке.',
  up: 'Туда вода не стечёт: там выше.',
  ice: 'По леднику не копают.',
  object: 'Тут занято.',
  tired: 'Кетмень устал: новые силы с новым садом и новым годом.',
};

// ---------- input ----------

let press = null; // { cell, moved, x, y }

function toCell(e) {
  const r = cv.getBoundingClientRect();
  return view.cellAt(e.clientX - r.left, e.clientY - r.top);
}

cv.addEventListener('pointerdown', (e) => {
  if (!g || g.over || paused) return;
  const c = toCell(e);
  if (c < 0) return;
  cv.setPointerCapture(e.pointerId);
  press = { cell: c, moved: false };
  if (!S.isWater(g, c)) say('Начинай от реки или от арыка и тяни.', 1800);
});

cv.addEventListener('pointermove', (e) => {
  if (!press || !g) return;
  const c = toCell(e);
  if (c < 0 || c === press.cell && !press.moved) return;
  if (!press.moved) {
    if (!S.startStroke(g, press.cell)) return;
    press.moved = true;
  }
  walkTo(c);
});

function walkTo(target) {
  // step by step through 4-neighbours, so a fast swipe still digs every cell
  for (let guard = 0; guard < 60 && g.cur; guard++) {
    const a = g.cur.cells.length ? g.cur.cells[g.cur.cells.length - 1] : g.cur.from;
    if (a === target || g.cur.join) return;
    const ax = a % W, ay = (a / W) | 0, tx = target % W, ty = (target / W) | 0;
    const dx = tx - ax, dy = ty - ay;
    const b = Math.abs(dx) > Math.abs(dy) ? a + Math.sign(dx) : a + Math.sign(dy) * W;
    const r = S.extend(g, b);
    if (!r.ok) {
      if (r.why !== 'done' && (!state.blocked || state.blocked.cell !== b)) {
        state.blocked = { cell: b, at: performance.now() };
        say(WHY[r.why] || '');
      }
      return;
    }
    if (!r.back) state.blocked = null;
  }
}

function release() {
  if (!press || !g) return;
  if (!press.moved) {
    if (S.toggleGate(g, press.cell)) say(g.gate[press.cell] ? 'Шлюз закрыт' : 'Шлюз открыт', 1200);
  } else {
    const dug = g.cur && g.cur.cells.length;
    S.endStroke(g);
    if (dug && state.ghost) {
      state.ghost = null;
      store.set('aryq.dug', true);
    }
  }
  press = null;
  updateHud();
}
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);

window.addEventListener('keydown', (e) => {
  if (!g) return;
  if (e.key === 'z' || e.key === 'Backspace') doUndo();
  if (e.key === ' ') togglePause();
});

// ---------- HUD ----------

$('undoBtn').addEventListener('click', doUndo);
$('speedBtn').addEventListener('click', () => {
  speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  updateHud();
});
$('pauseBtn').addEventListener('click', togglePause);

function doUndo() {
  if (g && !g.over && S.undo(g)) updateHud();
}
function togglePause() {
  if (!g || g.over) return;
  paused = !paused;
  updateHud();
}

function updateHud() {
  if (!g) return;
  const s = S.seasonOf(g.day);
  $('season').textContent = `${s.name} · год ${g.year}`;
  $('dayBar').style.width = `${(g.day / S.YEAR_DAYS) * 100}%`;
  $('dig').textContent = g.dig;
  $('harvest').textContent = Math.floor(g.harvest);
  $('speedBtn').textContent = `×${speed}`;
  $('pauseBtn').textContent = paused ? '▶' : '❚❚';
}

function showOver() {
  hud.hidden = true;
  const box = el('div', 'panel');
  box.append(
    el('h2', null, 'Сад засох'),
    el('p', null, `Год ${g.year}, ${S.seasonOf(g.day).name.toLowerCase()}`),
    el('p', 'big', `Урожай ${Math.floor(g.harvest)} · садов ${S.gardens(g)}`),
  );
  const best = Math.max(store.get('aryq.best', 0), Math.floor(g.harvest));
  store.set('aryq.best', best);
  box.append(el('p', 'muted', `Лучший урожай ${best}`));
  const again = el('button', 'btn', 'Ещё раз');
  again.addEventListener('click', start);
  box.append(again);
  ui.replaceChildren(box);
}

function showStart() {
  hud.hidden = true;
  const box = el('div', 'panel');
  box.append(el('h1', null, 'Арық'), el('p', null, 'Веди воду от ледника к садам. Вода течёт только вниз.'));
  const go = el('button', 'btn', 'Играть');
  go.addEventListener('click', start);
  box.append(go);
  ui.replaceChildren(box);
}

// ---------- loop ----------

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (g) {
    if (!paused && !g.over && !press?.moved) {
      S.advance(g, (dt * speed) / S.DAY_SEC);
    }
    if (g.over && !ui.firstChild) showOver();
    for (const ev of g.events.splice(0)) {
      if (ev.type === 'flooded') say('Дом затопило: не обрывай арык рядом с домом.', 3000);
      if (ev.type === 'left') say('Из дома ушли: ему нужна вода.', 3000);
      if (ev.type === 'year') say(`Год ${ev.year}. Ледник стал меньше.`, 3000);
    }
    if (state.ghost && g.objects.indexOf(state.ghost.obj) < 0) state.ghost = null;
    updateHud();
    view.draw(g, now, state);
  }
  if (now > hintUntil && hintEl.textContent) hintEl.textContent = '';
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => g && view.layout(g));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && g && !g.over) {
    paused = true;
    updateHud();
  }
});

showStart();
requestAnimationFrame(frame);
if (q.has('autostart')) start();
