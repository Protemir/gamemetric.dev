import { step, moving, saka, predict, kidFeet } from './physics.js';
import { newKon, startThrow, knock, settle, finish, THROWS, landing, groundSpeed, throwFromHand } from './game.js';
import * as S from './scene.js';
import * as A from './audio.js';
import { store, el, clamp } from './util.js';

const cv = document.getElementById('game');
const c = cv.getContext('2d');
const $ = (id) => document.getElementById(id);
const ui = $('ui');

let g = null;
let state = 'load'; // load | menu | aim | flight | roll | reveal | tally | overWait | over
let phase = 0; // seconds in the current state
let clock = 0;
let drag = null;
let aim = null;
let flight = null;
let still = 0;
let freeze = 0; // hit-stop on a hard first touch
let slow = 0; // slow motion when bones fly out one after another
let shake = 0;
let firstTouch = false;
let shown = 0; // score shown in the bar, catches up with the real one
const dust = [];
const pops = [];
const kids = S.makeKids();
// the throwing hand: offsets in px, cocked rotation, and how far it has sunk out of view
const hand = { dx: 0, dy: 0, rot: 0, scale: 1, open: false, hidden: 1 };
let best = store.get('asyk.best', 0);
let taught = store.get('asyk.taught', 0);

const FACES = ['alshy', 'buk', 'taike'];

function layout() {
  S.resize(cv);
}
window.addEventListener('resize', () => {
  if (state !== 'load') layout();
});

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

function freshKon(k, seed) {
  g = newKon(k, seed);
  for (const kid of kids) {
    const feet = kidFeet(kid.x, kid.y);
    feet.ki = kid.i;
    g.w.bodies.push(feet);
  }
  faces();
}
// bones laid out in the kon stand on their usual sides
function faces() {
  for (const b of g.w.bodies) if (b.kind === 'asyk' && !b.face) b.face = FACES[b.id % 3];
}

function menu() {
  state = 'menu';
  $('hud').hidden = true;
  $('turn').hidden = true;
  freshKon(1, 1986);
  hand.hidden = 0;
  const rules = el('ul', 'rules');
  [
    'Потяни вниз и отпусти — сақа полетит из руки в кон.',
    'Вбок — целишься левее или правее.',
    'Асыки, выбитые за круг, дают очки.',
    'Сақа ложится на сторону: алшы ×3, тәйке ×2, шік даёт бросок.',
    'Выбил два за бросок — бросок вернётся.',
  ].forEach((t) => rules.append(el('li', null, t)));
  const kidsLine = el('p', 'sub', 'Лето 1987-го. Аул под горами, вечер, соседские ребята уже выложили кон.');
  const kids2 = [el('h1', 'logo', 'Асық'), kidsLine, rules, button('Ойнау', () => start(1))];
  if (best > 1) kids2.push(el('p', 'sub', `Лучший результат: кон ${best}`));
  panel(kids2);
}

function start(k) {
  ui.innerHTML = '';
  freshKon(k);
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
  if (!taught) hint('Потяни вниз и отпусти', 0);
  else if (k === 1) hint(`Набери ${g.target} очков`);
}

function over() {
  state = 'over';
  $('turn').hidden = true;
  if (g.result === 'win') {
    best = Math.max(best, g.k + 1);
    store.set('asyk.best', best);
    A.win();
    kids.forEach((k, i) => S.setPose(k, 'cheer', clock, 4, i * 0.08));
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
    kids.forEach((k, i) => S.setPose(k, 'sad', clock, 4, i * 0.06));
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

// ---------- input: pull down to throw, sideways to aim ----------
function aimFrom(dx, dy) {
  const { w, h } = S.view;
  const pull = Math.max(0, dy);
  const power = clamp((pull - 8) / (h * 0.3), 0, 1);
  // slingshot: pulling to the left sends the saka to the right
  const ang = clamp((-dx / (w * 0.45)) * 0.42, -0.42, 0.42);
  return { power, ang, ux: Math.sin(ang), uy: -Math.cos(ang), dx, dy: pull };
}

cv.addEventListener('pointerdown', (e) => {
  A.audioInit();
  if (state !== 'aim' || drag || hand.hidden > 0.3) return;
  drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
  try {
    cv.setPointerCapture(e.pointerId);
  } catch {
    /* fine */
  }
});
cv.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  aim = aimFrom(e.clientX - drag.x0, e.clientY - drag.y0);
});
cv.addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (aim && aim.power > 0.05 && state === 'aim') throwSaka();
  drag = null;
  aim = null;
});
cv.addEventListener('pointercancel', (e) => {
  if (drag && e.pointerId === drag.id) drag = aim = null;
});

function handStart() {
  const p = S.handBone(hand);
  return S.unproject(p.x, p.y, 40);
}

function throwSaka() {
  startThrow(g);
  const from = handStart();
  flight = { from, land: landing(aim.power, aim.ux, aim.uy), t: 0, T: 0.3 + 0.08 * (1 - aim.power), power: aim.power, ux: aim.ux, uy: aim.uy };
  const s = saka(g.w);
  s.tumble = true;
  s.face = null;
  s.x = from.x;
  s.y = from.y;
  hand.open = true;
  A.whoosh(aim.power);
  state = 'flight';
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
    dust.push({ x, y, z: Math.random() * 1.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0.8 + Math.random() * 1.2, grow: 3 + Math.random() * 3, life: 0.6 + Math.random() * 0.5, max: 1.1, a: 0.35, col: '#e6c99c' });
  }
}
function pop(x, y, text, col = '#fff4dc', size = 5, life = 1.1, screen = null) {
  pops.push({ x, y, text, col, size, life, max: life, screen });
}

const SIDE_COL = { alshy: '#ffd36b', taike: '#ffb070', buk: '#fff4dc', shik: '#bfeaa0' };
const kidOf = (body) => kids.find((k) => k.i === body.ki);

function react(t) {
  const now = clock;
  if (t.knocked >= 2 || (t.knocked && t.side.id === 'alshy')) {
    kids.forEach((k) => S.setPose(k, 'cheer', now, 1.8, Math.random() * 0.2));
  } else if (t.knocked === 1) {
    const order = [...kids].sort(() => Math.random() - 0.5);
    order.slice(0, 2).forEach((k) => S.setPose(k, 'cheer', now, 1.5, Math.random() * 0.15));
  } else {
    // a miss: groans, and the chubby one points and laughs
    kids.forEach((k) => {
      if (k.i === 1 || Math.random() < 0.6) S.setPose(k, 'sad', now, 1.6, Math.random() * 0.2);
    });
  }
}

// ---------- loop ----------
function update(dt) {
  clock += dt;
  phase += dt;
  for (let i = dust.length - 1; i >= 0; i--) {
    const p = dust[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z = (p.z || 0) + dt * 2;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.r += p.grow * dt;
    if ((p.life -= dt) <= 0) dust.splice(i, 1);
  }
  for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].life -= dt) <= 0) pops.splice(i, 1);
  shake *= Math.pow(0.0015, dt);
  S.updateKids(kids, clock);
  updateHand(dt);
  if (g && state !== 'menu' && state !== 'load') {
    shown += (g.score + (state === 'tally' && g.turn ? g.turn.score * Math.min(1, phase / 0.5) : 0) - shown) * Math.min(1, dt * 8);
    hudScore();
  }

  if (state === 'flight') fly(dt);
  else if (state === 'roll') roll(dt);
  else if (state === 'reveal') {
    const s = saka(g.w);
    if (phase < 0.45) s.ang += dt * 16;
    else if (s.tumble) {
      s.tumble = false;
      s.face = g.turn.side.id;
    }
    if (phase > (g.turn.knocked ? 1.0 : 0.75)) {
      state = 'tally';
      phase = 0;
      if (g.turn.score) {
        A.tally(g.turn.score >= 100);
        pop(0, 0, `+${g.turn.score}`, '#ffd36b', 9, 1.3, { x: S.view.w / 2, y: S.view.h * 0.3 });
      }
    }
  } else if (state === 'tally') {
    if (phase > (g.turn.score ? 0.8 : 0.2)) {
      const t = g.turn;
      const res = finish(g);
      faces();
      if (res.cleared) {
        A.cleared();
        pop(0, 0, 'Кон тазаланды! +50', '#ffd36b', 6, 1.6, { x: S.view.w / 2, y: S.view.h * 0.4 });
        kids.forEach((k) => S.setPose(k, 'cheer', clock, 1.6, Math.random() * 0.2));
      }
      if (t.refund) pop(0, 0, 'Два за бросок — бросок вернулся', '#bfeaa0', 4, 1.6, { x: S.view.w / 2, y: S.view.h * 0.5 });
      hudThrows();
      turnPanel(g.chain ? `Цепочка: +${g.chain} к множителю` : '');
      state = g.result ? 'overWait' : 'aim';
      phase = 0;
    }
  } else if (state === 'overWait' && phase > 0.7) over();
}

function updateHand(dt) {
  const k = Math.min(1, dt * 14);
  let tx = 0;
  let ty = 0;
  let tr = 0;
  let ts = 1;
  let hide = 0;
  if (state === 'aim' || state === 'menu') {
    hand.open = false;
    if (aim && drag) {
      // the hand follows the finger a little and cocks back with the pull
      tx = aim.dx * 0.25;
      ty = aim.dy * 0.45;
      tr = -aim.power * 0.22 + (aim.dx / S.view.w) * 0.3;
    } else {
      ty = Math.sin(clock * 1.6) * 3;
    }
  } else if (state === 'flight') {
    // follow-through: forward and up, then down out of sight
    const p = Math.min(1, phase / 0.12);
    ty = -S.view.h * 0.06 * p;
    tr = 0.12 * p;
    ts = 1 - 0.08 * p;
    hide = phase > 0.15 ? 1 : 0;
  } else {
    hide = 1;
  }
  hand.dx += (tx - hand.dx) * k;
  hand.dy += (ty - hand.dy) * k;
  hand.rot += (tr - hand.rot) * k;
  hand.scale += (ts - hand.scale) * k;
  hand.hidden += (hide - hand.hidden) * Math.min(1, dt * (hide ? 5 : 7));
  if (hand.hidden < 0.01) hand.hidden = 0;
}

function fly(dt) {
  const f = flight;
  f.t += dt;
  const s = saka(g.w);
  const u = Math.min(1, f.t / f.T);
  s.x = f.from.x + (f.land.x - f.from.x) * u;
  s.y = f.from.y + (f.land.y - f.from.y) * u;
  s.z = f.from.z * (1 - u) + S.arcHeight(f.power) * 4 * u * (1 - u);
  s.ang += dt * 22;
  if (u >= 1) {
    s.z = 0;
    throwFromHand(g, f.ux, f.uy, f.power);
    A.thud(40 + f.power * 50);
    puff(s.x, s.y, 7, 0.7);
    state = 'roll';
    phase = 0;
  }
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
      const kidBody = e.a.kind === 'kid' ? e.a : e.b.kind === 'kid' ? e.b : null;
      if (kidBody) {
        // a bone hit a kid's foot
        const kid = kidOf(kidBody);
        if (kid && e.power > 8) {
          S.setPose(kid, 'sad', clock, 1.1);
          pop(kid.x, kid.y - 2, 'Ой!', '#fff4dc', 4, 0.9);
          A.thud(e.power);
        }
        continue;
      }
      A.clack(e.power);
      if (e.power > 25) puff(e.x, e.y, 3, 0.5);
      if (e.a === s || e.b === s) {
        shake = Math.max(shake, Math.min(6, e.power / 25));
        if (!firstTouch && e.power > 80) freeze = 0.05;
        firstTouch = true;
      }
    } else if (e.type === 'wall') {
      A.thud(e.speed * 0.5);
    } else if (e.type === 'out') {
      const pay = knock(g, e.body);
      A.knocked(g.turn.knocked - 1);
      pop(e.body.x, e.body.y, `+${pay}`, e.body.painted ? '#ff9fd0' : '#fff4dc', 4 + Math.min(3, g.turn.knocked * 0.4));
      turnPanel();
      bump('turnChips');
      if (g.turn.knocked >= 3) slow = 0.45;
    }
  }
  g.w.events.length = 0;
  for (const b of g.w.bodies) {
    if (b.fixed) continue;
    const sp = Math.hypot(b.vx, b.vy);
    // a bone tumbles while it is fast, then lies on some side
    if (sp > 30) b.tumble = true;
    else if (b.tumble && sp < 8 && b.kind === 'asyk') {
      b.tumble = false;
      b.face = ['alshy', 'buk', 'buk', 'taike', 'shik'][Math.floor(Math.random() * 5)];
    }
    if (sp > 45 && Math.random() < dt * 30) puff(b.x - (b.vx / sp) * b.r, b.y - (b.vy / sp) * b.r, 1, 0.3);
  }
  if (!moving(g.w)) still += dt;
  else still = 0;
  if (still > 0.2) {
    const t = settle(g);
    state = 'reveal';
    phase = 0;
    A.side(t.side.id);
    react(t);
    const label = t.side.throws ? `${t.side.name}: +1 бросок` : `${t.side.name} ×${t.side.mult}`;
    pop(s.x, s.y, label, SIDE_COL[t.side.id], 5, 1.3);
    const sideText = t.side.throws ? `${t.side.name}: +1 бросок` : `${t.side.name} ×${t.side.mult}`;
    turnPanel(t.knocked ? (g.chain > 1 ? `${sideText}, цепочка +${g.chain - 1}` : sideText) : `Мимо. ${t.side.throws ? sideText : ''}`.trim());
    bump('turnMult');
    hudThrows();
  }
}

function draw() {
  const { dpr } = S.view;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.save();
  if (shake > 0.05) c.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2);
  S.drawBackdrop(c);
  if (g) {
    const s = saka(g.w);
    const items = [];
    const showSaka = state === 'flight' || state === 'roll' || state === 'reveal' || state === 'tally';
    for (const b of g.w.bodies) {
      if (b.kind === 'kid') continue;
      if (b === s && !showSaka) continue;
      items.push({ D: S.CAM.y - b.y, b });
    }
    for (const k of kids) items.push({ D: S.CAM.y - k.y + 0.5, kid: k });
    items.sort((a, b) => b.D - a.D);
    for (const it of items) {
      if (it.kid) S.drawKid(c, it.kid, clock);
      else if (it.b === s) {
        let z = s.z || 0;
        if (state === 'reveal' && phase < 0.45) z = Math.sin((phase / 0.45) * Math.PI) * 4;
        S.drawBone(c, s, z);
      } else {
        const b = it.b;
        const fade = b.out && state === 'tally' ? 1 - Math.min(1, phase / 0.6) : 1;
        S.drawBone(c, b, 0, fade, b.out ? 0.9 : 0);
      }
    }
    S.drawDust(c, dust);
    if (state === 'aim' && aim && drag && aim.power > 0.05) {
      const from = handStart();
      const land = landing(aim.power, aim.ux, aim.uy);
      const p = predict(g.w, aim.ux, aim.uy, aim.power, land, groundSpeed(1));
      S.drawGuide(c, from, land, { x: p.x, y: p.y, target: p.hit, nx: p.nx, ny: p.ny }, clock, aim.power);
    }
    S.drawPopups(c, pops);
  }
  c.restore();
  S.drawOverlay(c, clock);
  // the hand is closest to the eye: over the light and grain of the yard
  S.drawHand(c, hand);
  if (state === 'aim' && !taught && !drag) S.drawPullHint(c, clock);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!document.hidden && state !== 'load') {
    update(dt);
    draw();
  }
  requestAnimationFrame(frame);
}

async function boot() {
  const bar = el('div', 'bar');
  bar.style.cssText = 'margin: 18px auto 0; width: 70%; background: rgba(90, 40, 20, 0.15)';
  const fill = el('i');
  bar.append(fill);
  panel([el('h1', 'logo', 'Асық'), el('p', 'sub', 'Аул просыпается…'), bar]);
  try {
    await S.loadArt((k) => (fill.style.width = `${Math.round(k * 100)}%`));
  } catch {
    panel([el('h2', null, 'Не загрузилось'), el('p', 'sub', 'Проверь интернет и обнови страницу.')]);
    return;
  }
  layout();
  menu();
}
boot();
requestAnimationFrame(frame);
// for the test page: window.__asyk shows the live state
window.__asyk = { get g() { return g; }, get state() { return state; }, kids };
