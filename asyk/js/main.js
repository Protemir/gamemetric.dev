import { step, moving, saka, launch, predict, LINE_Y, KON } from './physics.js';
import { newKon, startThrow, knock, settle, finish, placeOnLine, THROWS } from './game.js';
import * as R from './render.js';
import * as A from './audio.js';
import { store, el, clamp } from './util.js';

const cv = document.getElementById('game');
const c = cv.getContext('2d');
const $ = (id) => document.getElementById(id);
const ui = $('ui');

let g = null;
let state = 'menu'; // menu | aim | roll | reveal | tally | over
let phase = 0; // seconds in the current state
let clock = 0;
let drag = null;
let aim = null;
let still = 0;
let freeze = 0; // hit-stop on a hard first touch
let slow = 0; // slow motion when bones fly out one after another
let shake = 0;
let firstTouch = false;
let shown = 0; // score shown in the bar, catches up with the real one
const dust = [];
const pops = [];
let best = store.get('asyk.best', 0);
let taught = store.get('asyk.taught', 0);

// ---------- layout ----------
const TOP = () => 70;
function layout() {
  R.resize(cv, TOP(), 86);
}
window.addEventListener('resize', layout);

// ---------- hud ----------
const ICON_ON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function soundIcon() {
  $('soundBtn').innerHTML = A.sound.on ? ICON_ON : ICON_OFF;
}
$('soundBtn').addEventListener('click', () => {
  A.setSound(!A.sound.on);
  soundIcon();
});
soundIcon();

function hudThrows() {
  const box = $('hudThrows');
  const n = Math.max(THROWS, g.throws);
  box.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const t = el('i');
    if (i >= g.throws) t.className = 'spent';
    else if (i >= THROWS) t.className = 'bonus';
    box.append(t);
  }
}

function hudScore() {
  $('hudKon').textContent = `Кон ${g.k}`;
  $('hudScore').textContent = `${Math.round(shown)} / ${g.target}`;
  $('hudBar').style.width = `${clamp(shown / g.target, 0, 1) * 100}%`;
}

function turnPanel(note) {
  const t = g.turn;
  $('turnChips').textContent = t ? t.chips : 0;
  $('turnMult').textContent = t ? t.mult : 1 + g.chain;
  if (note !== undefined) $('turnNote').textContent = note;
}
function bump(id) {
  const b = $(id);
  b.classList.remove('bump');
  void b.offsetWidth;
  b.classList.add('bump');
  setTimeout(() => b.classList.remove('bump'), 130);
}

let hintTimer = 0;
function hint(text, ms = 3200) {
  const h = $('hint');
  h.textContent = text;
  h.classList.add('show');
  clearTimeout(hintTimer);
  if (ms) hintTimer = setTimeout(() => h.classList.remove('show'), ms);
}
const hideHint = () => $('hint').classList.remove('show');

// ---------- screens ----------
function panel(children) {
  ui.innerHTML = '';
  const p = el('div', 'panel');
  p.append(...children);
  ui.append(p);
  return p;
}
function button(text, fn, cls = 'btn') {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', () => {
    A.audioInit();
    fn();
  });
  return b;
}

function menu() {
  state = 'menu';
  $('hud').hidden = true;
  $('turn').hidden = true;
  g = newKon(1, 1986);
  const rules = el('ul', 'rules');
  [
    'Потяни назад и отпусти — сақа полетит в кон.',
    'Асыки, выбитые за круг, дают очки.',
    'Сақа ложится на сторону: алшы ×3, тәйке ×2, шік даёт бросок.',
    'Выбил два за бросок — бросок вернётся.',
  ].forEach((t) => rules.append(el('li', null, t)));
  const kids = [el('h1', 'logo', 'Асық'), el('p', 'sub', 'Летний двор, вечер, кон из асыков. Набери очки за пять бросков.'), rules, button('Ойнау', () => start(1))];
  if (best > 1) kids.push(el('p', 'sub', `Лучший результат: кон ${best}`));
  panel(kids);
}

function start(k) {
  ui.innerHTML = '';
  g = newKon(k);
  shown = 0;
  pops.length = 0;
  dust.length = 0;
  state = 'aim';
  phase = 0;
  $('hud').hidden = false;
  $('turn').hidden = false;
  hudThrows();
  hudScore();
  turnPanel('');
  if (!taught) hint('Потяни назад и отпусти', 0);
  else if (k === 1) hint(`Набери ${g.target} очков`);
}

function over() {
  state = 'over';
  $('turn').hidden = true;
  if (g.result === 'win') {
    best = Math.max(best, g.k + 1);
    store.set('asyk.best', best);
    A.win();
    panel([
      el('h2', null, 'Кон алынды!'),
      stats([
        ['Очки', `${g.score} из ${g.target}`],
        ['Осталось бросков', g.throws],
      ]),
      button(`Кон ${g.k + 1}`, () => start(g.k + 1)),
      button('В меню', menu, 'btn ghost'),
    ]);
  } else {
    A.lose();
    best = Math.max(best, g.k);
    store.set('asyk.best', best);
    panel([
      el('h2', null, 'Броски кончились'),
      stats([
        ['Очки', `${g.score} из ${g.target}`],
        ['Не хватило', g.target - g.score],
        ['Дошёл до', `кона ${g.k}`],
      ]),
      button('Заново с первого кона', () => start(1)),
      button('В меню', menu, 'btn ghost'),
    ]);
  }
}
function stats(rows) {
  const box = el('div', 'stats');
  for (const [k, v] of rows) {
    const p = el('p');
    p.style.margin = '0';
    p.append(`${k}: `, el('b', null, String(v)));
    box.append(p);
  }
  return box;
}

// ---------- input ----------
cv.addEventListener('pointerdown', (e) => {
  A.audioInit();
  if (state !== 'aim' || drag) return;
  const s = saka(g.w);
  const p = R.toWorld(e.clientX, e.clientY);
  drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, mode: null, onSaka: Math.hypot(p.x - s.x, p.y - s.y) < s.r + 5, sx: s.x };
  try {
    cv.setPointerCapture(e.pointerId);
  } catch {
    /* fine */
  }
});
cv.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0;
  const dy = e.clientY - drag.y0;
  const len = Math.hypot(dx, dy);
  const v = R.toWorldVec(dx, dy);
  if (!drag.mode && len > 10) drag.mode = g.fromLine && drag.onSaka && Math.abs(v.x) > Math.abs(v.y) * 1.4 ? 'slide' : 'aim';
  if (drag.mode === 'slide') {
    placeOnLine(g, drag.sx + v.x);
  } else if (drag.mode === 'aim' && len > 0) {
    const pull = Math.min(R.view.w, R.view.h) * 0.32;
    const vl = Math.hypot(v.x, v.y);
    aim = { ux: -v.x / vl, uy: -v.y / vl, power: clamp((len - 10) / pull, 0, 1) };
  }
});
function release(e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (drag.mode === 'aim' && aim && aim.power > 0.06) throwSaka();
  else if (!drag.mode && g.fromLine && state === 'aim') {
    const p = R.toWorld(e.clientX, e.clientY);
    if (Math.abs(p.y - LINE_Y) < 9) {
      placeOnLine(g, p.x);
      A.tick();
    }
  }
  drag = null;
  aim = null;
}
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', (e) => {
  if (drag && e.pointerId === drag.id) drag = aim = null;
});

function throwSaka() {
  const s = saka(g.w);
  startThrow(g);
  launch(g.w, aim.ux, aim.uy, aim.power);
  A.whoosh(aim.power);
  puff(s.x, s.y, 6, 0.6);
  state = 'roll';
  phase = 0;
  still = 0;
  firstTouch = false;
  hudThrows();
  turnPanel(g.chain ? `Цепочка: +${g.chain} к множителю` : '');
  if (!taught) {
    taught = 1;
    store.set('asyk.taught', 1);
    hideHint();
  }
}

// ---------- effects ----------
function puff(x, y, n, k = 1) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (4 + Math.random() * 10) * k;
    dust.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0.6 + Math.random() * 1.1, grow: 2 + Math.random() * 2, life: 0.5 + Math.random() * 0.4, max: 0.9, a: 0.35, col: '#e9d2a6' });
  }
}
function pop(x, y, text, col = '#fff4dc', size = 5, life = 1.1) {
  pops.push({ x, y, text, col, size, life, max: life });
}

const SIDE_COL = { alshy: '#ffd36b', taike: '#ffb070', buk: '#fff4dc', shik: '#bfeaa0' };

// ---------- loop ----------
function update(dt) {
  clock += dt;
  phase += dt;
  for (let i = dust.length - 1; i >= 0; i--) {
    const p = dust[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.r += p.grow * dt;
    if ((p.life -= dt) <= 0) dust.splice(i, 1);
  }
  for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].life -= dt) <= 0) pops.splice(i, 1);
  shake *= Math.pow(0.0015, dt);
  if (g) shown += (g.score + (state === 'tally' && g.turn ? g.turn.score * Math.min(1, phase / 0.5) : 0) - shown) * Math.min(1, dt * 8);
  if (g && state !== 'menu') hudScore();

  if (state === 'roll') roll(dt);
  else if (state === 'reveal') {
    const s = saka(g.w);
    if (phase < 0.45) s.ang += dt * 16;
    if (phase > (g.turn.knocked ? 1.0 : 0.7)) {
      state = 'tally';
      phase = 0;
      if (g.turn.score) {
        A.tally(g.turn.score >= 100);
        pop(KON.x, KON.y, `+${g.turn.score}`, '#ffd36b', 8, 1.3);
      }
    }
  } else if (state === 'tally') {
    if (phase > (g.turn.score ? 0.8 : 0.2)) {
      const t = g.turn;
      const res = finish(g);
      if (res.cleared) {
        A.cleared();
        pop(50, 40, 'Кон тазаланды! +50', '#ffd36b', 5.5, 1.6);
      }
      if (t.refund) pop(50, 120, 'Два за бросок — бросок вернулся', '#bfeaa0', 3.8, 1.6);
      hudThrows();
      turnPanel(g.chain ? `Цепочка: +${g.chain} к множителю` : '');
      if (g.result) {
        state = 'overWait';
        phase = 0;
      } else {
        state = 'aim';
        phase = 0;
        if (g.fromLine && taught === 1 && t.knocked) {
          taught = 2;
          store.set('asyk.taught', 2);
        }
        if (!g.fromLine && taught < 3) {
          taught = 3;
          store.set('asyk.taught', 3);
          hint('Выбил — бросаешь с того места, где лежит сақа');
        }
      }
    }
  } else if (state === 'overWait' && phase > 0.7) over();
}

function roll(dt) {
  if (freeze > 0) {
    freeze -= dt;
    return;
  }
  const k = slow > 0 ? 0.35 : 1;
  slow -= dt;
  step(g.w, Math.min(dt, 1 / 30) * k);
  const s = saka(g.w);
  for (const e of g.w.events) {
    if (e.type === 'hit') {
      A.clack(e.power);
      if (e.power > 25) puff(e.x, e.y, 3, 0.5);
      if (e.a === s || e.b === s) {
        shake = Math.max(shake, Math.min(6, e.power / 25));
        if (!firstTouch && e.power > 80) freeze = 0.05;
        firstTouch = true;
      }
    } else if (e.type === 'wall') {
      A.thud(e.speed);
      puff(e.body.x, e.body.y, 3, 0.4);
    } else if (e.type === 'out') {
      const pay = knock(g, e.body);
      A.knocked(g.turn.knocked - 1);
      pop(e.body.x, e.body.y - 4, `+${pay}`, e.body.painted ? '#ff9fbd' : '#fff4dc', 4 + Math.min(3, g.turn.knocked * 0.4));
      turnPanel();
      bump('turnChips');
      if (g.turn.knocked >= 3) slow = 0.45;
    }
  }
  g.w.events.length = 0;
  // a fast bone kicks up a trail of dust
  for (const b of g.w.bodies) {
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 45 && Math.random() < dt * 30) puff(b.x - (b.vx / sp) * b.r, b.y - (b.vy / sp) * b.r, 1, 0.3);
  }
  if (!moving(g.w)) still += dt;
  else still = 0;
  if (still > 0.2) {
    const t = settle(g);
    state = 'reveal';
    phase = 0;
    A.side(t.side.id);
    const label = t.side.throws ? `${t.side.name}: +1 бросок` : `${t.side.name} ×${t.side.mult}`;
    pop(s.x, s.y - 5, label, SIDE_COL[t.side.id], 5, 1.3);
    const sideText = t.side.throws ? `${t.side.name}: +1 бросок` : `${t.side.name} ×${t.side.mult}`;
    turnPanel(t.knocked ? (g.chain > 1 ? `${sideText}, цепочка +${g.chain - 1}` : sideText) : `Мимо, цепочка сгорела. ${t.side.throws ? sideText : ''}`.trim());
    bump('turnMult');
    hudThrows();
  }
}

function draw() {
  const { dpr } = R.view;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.save();
  if (shake > 0.05) c.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2);
  R.drawGround(c);
  if (g) {
    const s = saka(g.w);
    for (const b of g.w.bodies) {
      if (b === s) continue;
      R.drawBone(c, b, 0, b.out && state === 'tally' ? 1 - Math.min(1, phase / 0.6) : 1);
    }
    R.drawDust(c, dust);
    let lift = 0;
    if (state === 'reveal' && phase < 0.45) lift = Math.sin((phase / 0.45) * Math.PI) * 0.7;
    // fast saka is a bit in the air
    lift = Math.max(lift, Math.min(0.35, Math.hypot(s.vx, s.vy) / 400));
    R.drawBone(c, s, lift);
    if (state === 'aim') {
      if (aim && drag && drag.mode === 'aim') R.drawAim(c, s, aim, predict(g.w, aim.ux, aim.uy, aim.power), clock);
      else if (!taught) R.drawHand(c, s, clock);
      else if (g.fromLine && !drag) R.drawLineHint(c, s, clock);
    }
    R.drawPopups(c, pops);
  }
  c.restore();
  R.drawOverlay(c, clock);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!document.hidden) {
    update(dt);
    draw();
  }
  requestAnimationFrame(frame);
}

layout();
menu();
requestAnimationFrame(frame);
// for the test page: window.__asyk shows the live state
window.__asyk = { get g() { return g; }, get state() { return state; } };
