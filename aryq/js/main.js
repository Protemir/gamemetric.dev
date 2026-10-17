import * as S from './sim.js';
import { View } from './render.js';
import { el, store, clamp } from './util.js';
import * as sfx from './audio.js';

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

// today's valley: the same seed for everyone, from the date
const today = new Date().toISOString().slice(0, 10);
const dailySeed = [...today].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
const bestKey = (mode) => (mode === 'daily' ? 'aryq.best.daily.' + today : 'aryq.best.' + mode);
let mode = store.get('aryq.mode', 'mountain');

function start(m = mode, restored = null) {
  mode = m;
  if (m !== 'daily') store.set('aryq.mode', m);
  g = restored || S.newGame(W, H, m === 'daily' ? dailySeed : seedNow(), m === 'daily' ? 'mountain' : m);
  g.mode = m;
  view.layout(g);
  speed = 1;
  paused = false;
  state.ghost = null;
  state.calmShown = false;
  state.harvestAtYear = 0;
  ui.replaceChildren();
  hud.hidden = false;
  if (!restored) S.advance(g, 0.01); // the first garden appears
  saveNow();
  pickGhost(performance.now(), true);
  updateHud();
  if (DEBUG) window.__aryq = { g, S, view, state, step: (d) => S.advance(g, d) };
}

function say(text, ms = 2200) {
  hintEl.textContent = text;
  hintUntil = performance.now() + ms;
}

// ---------- texts ----------

const TEXT = {
  ru: {
    title: 'Арык',
    tag: 'Сады и юрты хотят пить. Пальцем копай арык от реки к ним. Вода течёт вниз, а вверх арык поднимается не выше одной линии высоты.',
    play: 'Играть',
    again: 'Ещё раз',
    over: 'Сад засох',
    when: 'Год {y}, {s}',
    result: 'Урожай {h} · садов {n}',
    best: 'Лучший урожай {b}',
    hud: 'год {y}',
    spring: 'весна',
    summer: 'лето',
    autumn: 'осень',
    winter: 'зима',
    high: 'Там слишком высоко: арык поднимается не выше одной линии высоты. Светлым подсвечено, куда можно.',
    up: 'Туда вода не стечёт: там выше.',
    ice: 'По леднику не копают.',
    object: 'Тут занято.',
    tired: 'Кетмень кончился: он сам прибавляется по одному каждые 3 секунды, и ещё с каждым новым садом.',
    lit: 'Светлые клетки — сюда вода дойдёт от этой точки. Веди палец по ним.',
    tagHigh: '▲ выше',
    tagTired: '⛏ нет сил',
    tagTiredIn: '⛏ через {s} с',
    tagObject: 'занято',
    tagIce: 'лёд',
    startHere: 'начни тут',
    update: 'Вышла новая версия — нажми, чтобы обновить (игра сохранится)',
    plenty: 'вдоволь',
    ghostStart: 'Пунктир начинается выше, у кольца «начни тут». От этого арыка вода туда не поднимется — начни от кольца.',
    start: 'Начинай от реки или от арыка и тяни.',
    gateShut: 'Шлюз закрыт: вода сюда не идёт. Нажми ещё раз — откроется.',
    gateOpen: 'Шлюз открыт',
    gateRiver: 'Шлюз ставят на арык: нажми на сам арык.',
    elsewhere: 'Отсюда туда не стечь: там выше. Начни там, где пунктир, — выше по склону.',
    higher: 'выше',
    floodSoon: 'Юрту подтапливает: рядом кончается арык и вода льётся. Доведи арык до юрты или обратно в реку, или закрой шлюз.',
    lowWater: 'Этому саду мало воды: арык, который его поит, уже полон. Проведи к нему отдельный арык от реки.',
    riverLow: 'Воды на всех не хватает: к осени ледник тает меньше (💧 в шапке). Закрой шлюз у тех, кто подождёт, или возьми «Щедрый ледник» в конце года.',
    water: 'Сколько воды даёт ледник против того, сколько нужно садам и юртам',
    calm: 'Все пьют — время идёт быстрее. Новые сады и юрты появятся сами, не дай засохнуть ни одному.',
    flooded: 'Юрту затопило: не обрывай арык рядом с юртой.',
    left: 'Из юрты ушли: ей нужна вода.',
    year: 'Год {y} пережит! Урожай {h}. Ледник стал меньше — воды будет меньше.',
    dig: 'Сколько клеток можно выкопать',
    harvest: 'Урожай',
    undo: 'Отменить арык',
    speed: 'Скорость',
    pause: 'Пауза',
    sound: 'Звук',
    yearTitle: 'Год {y} пережит!',
    yearStats: 'Урожай за год {h} · садов {n} · юрт {u}',
    yearPick: 'Выбери подарок аула на новый год. Ледник стал меньше — воды будет меньше.',
    rewardDig: '+15 кетменя',
    rewardDigSub: 'больше клеток можно выкопать',
    rewardCap: 'Шире арыки',
    rewardCapSub: 'каждый арык поит на 2 сада больше',
    rewardMelt: 'Щедрый ледник',
    rewardMeltSub: 'в реке на 12% больше воды',
    paused: 'Пауза',
    resume: 'Продолжить',
    pauseTip: 'Пока пауза, можно спокойно смотреть, куда вести воду.',
    resumeGame: 'Продолжить',
    resumeSub: '{v}, год {y}',
    menu: 'Меню',
    mountain: 'Горная долина',
    wide: 'Широкая долина',
    gorge: 'Ущелье',
    mountainSub: 'обычная',
    wideSub: 'полегче',
    gorgeSub: 'потруднее',
    daily: 'Долина дня',
    dailySub: 'одна на всех сегодня, {d}',
    bestShort: 'рекорд {b}',
  },
  en: {
    title: 'Aryk',
    tag: 'Orchards and yurts are thirsty. Drag from the river to dig a canal to them. Water runs downhill, and a canal can climb at most one contour line.',
    play: 'Play',
    again: 'Try again',
    over: 'An orchard dried up',
    when: 'Year {y}, {s}',
    result: 'Harvest {h} · orchards {n}',
    best: 'Best harvest {b}',
    hud: 'year {y}',
    spring: 'spring',
    summer: 'summer',
    autumn: 'autumn',
    winter: 'winter',
    high: 'Too high: a canal climbs at most one contour line. The light cells show where you can dig.',
    up: 'Water will not run there: it is higher.',
    ice: 'You cannot dig into the glacier.',
    object: 'Something is already here.',
    tired: 'Out of digging: you get one more every 3 seconds, and more with every new orchard.',
    lit: 'The light cells are where water can reach from this point. Drag along them.',
    tagHigh: '▲ higher',
    tagTired: '⛏ no strength',
    tagTiredIn: '⛏ in {s} s',
    tagObject: 'taken',
    tagIce: 'ice',
    startHere: 'start here',
    update: 'A new version is out: tap to update (your game is saved)',
    plenty: 'plenty',
    ghostStart: 'The dashed line starts higher up, at the “start here” ring. From this canal water cannot climb there: start from the ring.',
    start: 'Start from the river or a canal and drag.',
    gateShut: 'Gate closed: no water goes this way. Tap again to open it.',
    gateOpen: 'Gate open',
    gateRiver: 'Gates go on canals: tap the canal itself.',
    elsewhere: 'Water cannot run there from here: it is higher. Start where the dashed line starts, further up the slope.',
    higher: 'higher',
    floodSoon: 'A yurt is flooding: a canal ends next to it and spills. Run the canal to the yurt or back into the river, or close a gate.',
    lowWater: 'This orchard is short of water: the canal that feeds it is already full. Dig it its own canal from the river.',
    riverLow: 'There is not enough water for everyone: by autumn the glacier melts less (💧 at the top). Close a gate for those who can wait, or take the Generous glacier at the end of the year.',
    water: 'How much water the glacier gives against how much orchards and yurts need',
    calm: 'Everyone has water, so time runs faster. New orchards and yurts appear by themselves: do not let any dry up.',
    flooded: 'A yurt was flooded: do not end a canal next to a yurt.',
    left: 'People left a yurt: it needs water.',
    year: 'Year {y} survived! Harvest {h}. The glacier shrank: there will be less water.',
    dig: 'How many cells you can dig',
    harvest: 'Harvest',
    undo: 'Undo canal',
    speed: 'Speed',
    pause: 'Pause',
    sound: 'Sound',
    yearTitle: 'Year {y} survived!',
    yearStats: 'Harvest this year {h} · orchards {n} · yurts {u}',
    yearPick: 'Pick a gift from the village for the new year. The glacier shrank: there will be less water.',
    rewardDig: '+15 digging',
    rewardDigSub: 'dig more cells',
    rewardCap: 'Wider canals',
    rewardCapSub: 'every canal feeds 2 more orchards',
    rewardMelt: 'Generous glacier',
    rewardMeltSub: '12% more water in the river',
    paused: 'Paused',
    resume: 'Resume',
    pauseTip: 'While paused you can calmly look where to lead the water.',
    resumeGame: 'Continue',
    resumeSub: '{v}, year {y}',
    menu: 'Menu',
    mountain: 'Mountain valley',
    wide: 'Wide valley',
    gorge: 'Gorge',
    mountainSub: 'normal',
    wideSub: 'easier',
    gorgeSub: 'harder',
    daily: 'Valley of the day',
    dailySub: 'the same for everyone today, {d}',
    bestShort: 'best {b}',
  },
};
const lang = (() => {
  const want = q.get('lang') || store.get('aryq.lang', null);
  if (want && TEXT[want]) return want;
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return /^(ru|kk|ky|be|uz|tg|uk)\b/i.test(nav) ? 'ru' : 'en';
})();
const t = (k, v) => (TEXT[lang][k] || TEXT.en[k] || k).replace(/\{(\w+)\}/g, (_, n) => (v && v[n] != null ? v[n] : ''));
const WHY = { high: t('high'), up: t('up'), ice: t('ice'), object: t('object'), tired: t('tired') };
document.documentElement.lang = lang;
document.title = t('title');
$('dig').parentElement.title = t('dig');
$('harvest').parentElement.title = t('harvest');
$('undoBtn').setAttribute('aria-label', t('undo'));
$('speedBtn').setAttribute('aria-label', t('speed'));
$('pauseBtn').setAttribute('aria-label', t('pause'));
$('soundBtn').setAttribute('aria-label', t('sound'));
cv.setAttribute('aria-label', t('title'));

// small drawn icons, so they look the same on every phone
const ICON = {
  wide: '<path d="M2 19c4-6 7-8 10-8s6 2 10 8z" fill="#9bb36a"/><path d="M2 19h20" stroke="#5f7a3a" stroke-width="2"/>',
  mountain: '<path d="M1 20 9 6l4 6 3-4 7 12z" fill="#8a7f72"/><path d="M9 6l2.6 4.4L9 9.5l-2 1.6z" fill="#fff"/>',
  gorge: '<path d="M2 4h6l3 16H2zM22 4h-6l-3 16h9z" fill="#8a7f72"/><path d="M11 20h2" stroke="#2f8ac4" stroke-width="3"/>',
  daily: '<rect x="3" y="5" width="18" height="16" rx="3" fill="#fff" stroke="#d0623a" stroke-width="2"/><path d="M3 10h18" stroke="#d0623a" stroke-width="2"/><path d="M8 3v4M16 3v4" stroke="#3b2718" stroke-width="2" stroke-linecap="round"/>',
  dig: '<path d="M5 19 15 9" stroke="#8a5530" stroke-width="2.6" stroke-linecap="round"/><path d="M12 4c4 0 7 3 8 7l-5-2-2-5z" fill="#6c7078"/>',
  cap: '<path d="M2 9c3-3 5 3 8 0s5 3 8 0 3 0 4 0M2 15c3-3 5 3 8 0s5 3 8 0 3 0 4 0" stroke="#2f8ac4" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  melt: '<path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" stroke="#5aa8d8" stroke-width="2.2" stroke-linecap="round"/>',
};
const icon = (k) => {
  const s = el('span', 'choice-icon');
  s.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">' + ICON[k] + '</svg>';
  return s;
};

// ---------- input ----------

let press = null; // { cell, moved, x, y }

function toCell(e) {
  const r = cv.getBoundingClientRect();
  return view.cellAt(e.clientX - r.left, e.clientY - r.top);
}

cv.addEventListener('pointerdown', (e) => {
  sfx.audioInit();
  if (!g || g.over || paused) return;
  const c = toCell(e);
  if (c < 0) return;
  cv.setPointerCapture(e.pointerId);
  const r = cv.getBoundingClientRect();
  press = { cell: c, tapped: c, moved: false, x: e.clientX - r.left, y: e.clientY - r.top };
  // a finger often lands just beside the end of a canal (the puddle is wider than the cell):
  // start from the nearest water cell if there is one right there
  if (!S.isWater(g, c)) {
    let best = view.cs * 1.05;
    for (const d of [1, -1, W, -W, W + 1, W - 1, -W + 1, -W - 1]) {
      const n = c + d;
      if (n < 0 || n >= W * H || Math.abs((n % W) - (c % W)) > 1 || !S.isWater(g, n)) continue;
      const [nx, ny] = view.center(n);
      const dist = Math.hypot(nx - press.x, ny - press.y);
      if (dist < best) {
        best = dist;
        press.cell = n;
      }
    }
  }
  // pressing near the start of the dashed path starts right there
  if (state.ghost) {
    const [gx, gy] = view.center(state.ghost.from);
    const d = Math.hypot(gx - press.x, gy - press.y);
    if (d < view.cs * 0.9 || (!S.isWater(g, press.cell) && d < view.cs * 1.3)) press.cell = state.ghost.from;
  }
  if (S.isWater(g, press.cell)) {
    state.reach = lit(press.cell);
    if (!store.get('aryq.litSeen', false)) {
      store.set('aryq.litSeen', true);
      say(t('lit'), 4000);
    }
    if (g.dig < 1) say(t('tired'), 3000);
  }
  else say(t('start'), 1800);
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

// one step of the canal, with its sound
function ext(b) {
  const r = S.extend(g, b);
  if (r.ok && !r.back) {
    sfx.dig();
    view.burst(b, 'dirt');
  }
  return r;
}

// cells to light while digging: reachable from `from` and close enough for the digging left
function lit(from) {
  const r = S.reach(g, from);
  const used = g.cur ? 0 : 0;
  for (let i = 0; i < r.best.length; i++) if (r.best[i] > -Infinity && g.kind[i] === S.LAND && r.len[i] > g.dig - used) r.best[i] = -Infinity;
  return r.best;
}

const lastCell = () => (g.cur.cells.length ? g.cur.cells[g.cur.cells.length - 1] : g.cur.from);

// The canal finds its own way to where the finger is: the shortest way down the slope from the
// end of the stroke. A finger over an orchard or a yurt means "to it". Back over the stroke takes
// cells back. Returns false when there is no way from here, then the step-by-step digging below
// shows what is in the way.
function routeTo(target) {
  if (!g.cur || g.cur.join) return true;
  const cur = g.cur;
  if (target === cur.from || cur.cells.includes(target)) {
    const keep = target === cur.from ? 0 : cur.cells.indexOf(target) + 1;
    while (cur.cells.length > keep) ext(cur.cells.length >= 2 ? cur.cells[cur.cells.length - 2] : cur.from);
    state.reach = lit(lastCell());
    return true;
  }
  const last = lastCell();
  const o = g.objAt[target];
  if (o) {
    const tx = target % W, ty = (target / W) | 0;
    if (Math.max(Math.abs((last % W) - tx), Math.abs(((last / W) | 0) - ty)) === 1) return true; // already there
  } else if (g.kind[target] !== S.LAND) return false;
  const goal = o
    ? (c) => Math.max(Math.abs((c % W) - o.x), Math.abs(((c / W) | 0) - o.y)) === 1
    : (c) => c === target;
  const way = S.route(g, [last], goal);
  if (!way) return false;
  for (const c of way.cells) {
    const r = ext(c);
    if (!r.ok) {
      if (!state.blocked || state.blocked.cell !== c) sfx.block();
      state.blocked = { cell: c, at: performance.now(), why: r.why };
      say(WHY[r.why] || '');
      break;
    }
  }
  state.reach = lit(lastCell());
  return true;
}

// when the finger asks for a place this stroke cannot reach, show where it could start instead
function showBetterStart(target) {
  const o = g.objAt[target];
  const plan = o ? S.planFor(g, o) : S.route(g, [...Array(W * H).keys()].filter((i) => S.isWater(g, i)), (c) => c === target);
  if (!plan || !plan.cells.length || plan.from === (g.cur && g.cur.from)) return;
  state.hintPath = { from: plan.from, cells: plan.cells, until: performance.now() + 3500 };
  say(t('elsewhere'), 3500);
}

function walkTo(target) {
  // along the dashed path the canal sticks to it, so a shaky finger does not wander off into a rise
  const gh = state.ghost;
  if (gh && g.cur && g.cur.from === gh.from && g.cur.cells.every((c, k) => gh.cells[k] === c)) {
    const tx = target % W, ty = (target / W) | 0;
    let near = -1, dist = 1.6;
    gh.cells.forEach((c, k) => {
      const d = Math.hypot((c % W) - tx, ((c / W) | 0) - ty);
      if (d < dist) {
        dist = d;
        near = k;
      }
    });
    if (near >= 0) {
      for (let k = g.cur.cells.length; k <= near; k++) {
        const r = ext(gh.cells[k]);
        if (!r.ok) {
          if (!state.blocked || state.blocked.cell !== gh.cells[k]) sfx.block();
          state.blocked = { cell: gh.cells[k], at: performance.now(), why: r.why };
          say(WHY[r.why] || '');
          return;
        }
      }
      while (g.cur.cells.length > near + 1) ext( g.cur.cells.length >= 2 ? g.cur.cells[g.cur.cells.length - 2] : g.cur.from);
      state.reach = lit(lastCell());
      return;
    }
  }
  if (routeTo(target)) return;
  // step by step through 4-neighbours, so a fast swipe still digs every cell
  for (let guard = 0; guard < 60 && g.cur; guard++) {
    const a = g.cur.cells.length ? g.cur.cells[g.cur.cells.length - 1] : g.cur.from;
    if (a === target || g.cur.join) return;
    const ax = a % W, ay = (a / W) | 0, tx = target % W, ty = (target / W) | 0;
    const dx = tx - ax, dy = ty - ay;
    // the longer way first; if that one is blocked and the finger goes slantwise, try the other
    const along = Math.abs(dx) > Math.abs(dy);
    let b = along ? a + Math.sign(dx) : a + Math.sign(dy) * W;
    let r = ext(b);
    if (!r.ok && dx && dy) {
      const b2 = along ? a + Math.sign(dy) * W : a + Math.sign(dx);
      const r2 = ext(b2);
      if (r2.ok) {
        b = b2;
        r = r2;
      }
    }
    if (r.ok) state.reach = lit(lastCell());
    if (!r.ok) {
      if (r.why !== 'done' && (!state.blocked || state.blocked.cell !== b)) {
        state.blocked = { cell: b, at: performance.now(), why: r.why };
        sfx.block();
        const gh = state.ghost || state.hintPath;
        if (gh && g.cur && g.cur.from !== gh.from && (gh.cells.includes(b) || gh.cells.includes(target))) say(t('ghostStart'), 5000);
        else say(WHY[r.why] || '');
        if (r.why === 'high' || r.why === 'up') showBetterStart(target);
      }
      return;
    }
    if (!r.back) state.blocked = null;
  }
}

function release() {
  if (!press || !g) return;
  state.reach = null;
  if (!press.moved) {
    // a tap near a closed gate opens that gate: a finger easily lands on the cell next to the bar,
    // and that must not put up a second gate
    let c = press.tapped;
    let best = view.cs * 0.9;
    for (let n = 0; n < W * H; n++) {
      if (!g.gate[n]) continue;
      const [x1, y1] = view.center(g.from[n]), [x2, y2] = view.center(n);
      const d = Math.hypot(x1 + (x2 - x1) * 0.7 - press.x, y1 + (y2 - y1) * 0.7 - press.y);
      if (d < best) {
        best = d;
        c = n;
      }
    }
    // two gates side by side are no use: a tap right before or after a closed one opens it
    if (c === press.tapped && g.kind[c] === S.CANAL && !g.gate[c]) {
      const next = [g.from[c], ...g.out[c]].find((n) => n >= 0 && g.gate[n]);
      if (next != null) c = next;
    }
    if (S.toggleGate(g, c)) {
      sfx.gate(!!g.gate[c]);
      say(g.gate[c] ? t('gateShut') : t('gateOpen'), 2200);
    }
    else if (g.kind[c] === S.RIVER) say(t('gateRiver'), 1800);
  } else {
    S.endStroke(g);
    state.ghostAt = 0; // look again right away
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
$('soundBtn').addEventListener('click', () => {
  sfx.setSound(!sfx.sound.on);
  sfx.click();
  updateHud();
});

function doUndo() {
  if (g && !g.over && S.undo(g)) updateHud();
}
function togglePause() {
  if (!g || g.over || ui.querySelector('.rewards')) return;
  paused = !paused;
  if (paused) showPause();
  else ui.replaceChildren();
  updateHud();
}

function showPause() {
  const box = el('div', 'panel');
  box.append(el('h2', null, t('paused')), el('p', 'muted', t('pauseTip')));
  const go = el('button', 'btn', t('resume'));
  go.addEventListener('click', togglePause);
  box.append(go);
  ui.replaceChildren(box);
}

// the end of a year: the game stops and the player picks one gift
function showYear(ev) {
  paused = true;
  const box = el('div', 'panel rewards');
  const yurts = g.objects.filter((o) => o.type === 'house').length;
  box.append(
    el('h2', null, t('yearTitle', { y: ev.year - 1 })),
    el('p', 'big', t('yearStats', { h: Math.floor(g.harvest - (state.harvestAtYear || 0)), n: S.gardens(g), u: yurts })),
    el('p', 'muted', t('yearPick')),
  );
  state.harvestAtYear = g.harvest;
  const list = el('div', 'choices');
  const names = { dig: ['rewardDig', 'rewardDigSub'], cap: ['rewardCap', 'rewardCapSub'], melt: ['rewardMelt', 'rewardMeltSub'] };
  for (const kind of S.REWARDS) {
    const [a, b] = names[kind];
    const btn = el('button', 'choice');
    btn.append(icon(kind), el('b', null, t(a)), el('small', null, t(b)));
    btn.addEventListener('click', () => {
      S.reward(g, kind);
      sfx.click();
      saveNow();
      ui.replaceChildren();
      paused = false;
      updateHud();
    });
    list.append(btn);
  }
  box.append(list);
  ui.replaceChildren(box);
}

function updateHud() {
  if (!g) return;
  const s = S.seasonOf(g.day);
  const sn = t(s.key);
  $('seasonName').textContent = sn[0].toUpperCase() + sn.slice(1) + (state.calm && !paused ? ' ⏩' : '');
  const share = S.waterShare(g);
  $('yearNo').textContent = share == null ? t('hud', { y: g.year }) : '💧' + (share >= 2 ? t('plenty') : Math.round(share * 100) + '%');
  $('yearNo').classList.toggle('low', share != null && share < 1);
  $('yearNo').title = t('water');
  $('dayBar').style.width = `${(g.day / S.YEAR_DAYS) * 100}%`;
  $('dig').textContent = g.dig;
  $('dig').parentElement.classList.toggle('empty', g.dig < 1);
  $('harvest').textContent = Math.floor(g.harvest);
  $('speedBtn').textContent = `×${speed}`;
  $('pauseBtn').textContent = paused ? '▶' : '❚❚';
  $('soundBtn').textContent = sfx.sound.on ? '🔊' : '🔇';
}

function showOver() {
  hud.hidden = true;
  sfx.lost();
  const box = el('div', 'panel');
  box.append(
    el('h2', null, t('over')),
    el('p', null, t('when', { y: g.year, s: t(S.seasonOf(g.day).key) })),
    el('p', 'big', t('result', { h: Math.floor(g.harvest), n: S.gardens(g) })),
  );
  const best = Math.max(store.get(bestKey(g.mode), 0), Math.floor(g.harvest));
  store.set(bestKey(g.mode), best);
  store.set('aryq.save', null);
  box.append(el('p', 'muted', t('best', { b: best })));
  const again = el('button', 'btn', t('again'));
  again.addEventListener('click', () => {
    sfx.audioInit();
    start(g.mode);
  });
  const menu = el('button', 'btn ghost', t('menu'));
  menu.addEventListener('click', showStart);
  box.append(again, menu);
  ui.replaceChildren(box);
}

function showStart() {
  hud.hidden = true;
  const box = el('div', 'panel');
  box.append(el('h1', null, t('title')), el('p', null, t('tag')));
  const saved = store.get('aryq.save', null);
  if (saved && saved.v === 1) {
    const cont = el('button', 'btn');
    cont.append(el('span', null, t('resumeGame')), el('small', null, t('resumeSub', { v: t(saved.mode || 'mountain'), y: saved.year })));
    cont.addEventListener('click', () => {
      sfx.audioInit();
      try {
        const old = S.load(saved);
        start(saved.mode || 'mountain', old);
      } catch {
        store.set('aryq.save', null);
        start();
      }
    });
    box.append(cont);
  } else {
    const go = el('button', 'btn', t('play'));
    go.addEventListener('click', () => {
      sfx.audioInit();
      start(mode);
    });
    box.append(go);
  }
  const list = el('div', 'choices');
  for (const m of ['wide', 'mountain', 'gorge', 'daily']) {
    const btn = el('button', 'choice' + (m === mode && !saved ? ' picked' : ''));
    const best = store.get(bestKey(m), 0);
    const sub = m === 'daily' ? t('dailySub', { d: today.slice(8, 10) + '.' + today.slice(5, 7) }) : t(m + 'Sub');
    btn.append(icon(m), el('b', null, t(m)), el('small', null, sub + (best ? ' · ' + t('bestShort', { b: best }) : '')));
    btn.addEventListener('click', () => {
      sfx.audioInit();
      store.set('aryq.save', null);
      start(m);
    });
    list.append(btn);
  }
  box.append(list);
  const langs = el('p', 'langs');
  for (const code of ['ru', 'en']) {
    const a = el('button', code === lang ? 'on' : '', code.toUpperCase());
    a.addEventListener('click', () => {
      store.set('aryq.lang', code);
      const u = new URL(location.href);
      u.searchParams.delete('lang');
      location.href = u.toString();
    });
    langs.append(a);
  }
  box.append(langs);
  ui.replaceChildren(box);
}

// ---------- the dashed path ----------

// While the player is still learning (fewer than three gardens or houses ever watered), the way to
// the thirstiest dry one is always drawn. After that only for one that is getting really thirsty.
function pickGhost(now, force) {
  if (!force && now - (state.ghostAt || 0) < 500) return;
  state.ghostAt = now;
  if (g.over || g.cur) return;
  for (const o of g.objects) {
    if (!o.taught && o.s >= 0.6) {
      o.taught = true;
      store.set('aryq.taught', store.get('aryq.taught', 0) + 1);
    }
  }
  const learning = store.get('aryq.taught', 0) < 3;
  let target = null;
  if (g.day < S.WINTER) {
    for (const o of g.objects) {
      if (o.got > 0.01 || (!learning && o.thirst < 0.45)) continue;
      const k = o.thirst + (o.type === 'garden' ? 0.01 : 0);
      if (!target || k > target.k) target = { o, k };
    }
  }
  const plan = target && S.planFor(g, target.o);
  state.ghost = plan && plan.cells.length ? { obj: target.o, ...plan } : null;
}

// one-line tips for the moments a new player gets stuck
function coach(now) {
  if (g.over || g.cur || now < hintUntil) return;
  for (const o of g.objects) {
    if (o.type === 'house' && o.flood > 0.15 && !o.warned) {
      o.warned = true;
      say(t('floodSoon'), 5000);
      return;
    }
  }
  for (const o of g.objects) {
    if (o.type === 'garden' && o.got > 0.01 && o.s < 0.6 && o.thirst > 0.3 && !o.lowWarned && g.day < S.WINTER) {
      o.lowWarned = true;
      const share = S.waterShare(g);
      say(share != null && share < 1.05 ? t('riverLow') : t('lowWater'), 6000);
      return;
    }
  }
  const allDrink =g.objects.length > 1 && g.objects.every((o) => o.got > 0.01);
  if (allDrink && !state.calmShown && g.day < S.WINTER) {
    state.calmShown = true;
    say(t('calm'), 5000);
  }
}

// the game is saved every few seconds and when the tab goes away, so a closed tab can be continued
let savedAt = 0;
function saveNow() {
  if (!g || g.over || DEBUG && !q.has('save')) return;
  const d = S.save(g);
  d.mode = g.mode;
  store.set('aryq.save', d);
  savedAt = performance.now();
}

// sounds that follow what happens in the valley
function listen(g) {
  let canals = 0;
  for (let i = 0; i < W * H; i++) if (g.kind[i] === S.CANAL) canals += g.flow[i];
  const level = clamp(S.sourceFlow(g.day, g.year, g.melt) / 8, 0, 1) * 0.6 + clamp(canals / 12, 0, 1) * 0.4;
  sfx.ambient(g.over || paused ? 0.2 : level, g.day >= S.WINTER);
  if (g.over) return;
  for (const o of g.objects) {
    if (o.s >= 0.6 && !o.happy) {
      o.happy = true;
      sfx.watered();
      view.burst(o.y * W + o.x, 'splash');
    } else if (o.s < 0.3) o.happy = false;
    if (o.thirst > 0.7 && !o.alarm && g.day < S.WINTER) {
      o.alarm = true;
      sfx.warn();
    } else if (o.thirst < 0.4) o.alarm = false;
  }
}

// ---------- loop ----------

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (g) {
    if (!paused && !g.over && !press?.moved) {
      // while everybody drinks there is nothing to do, so the days run faster on their own
      state.calm = g.objects.length > 0 && g.objects.every((o) => o.s >= 0.6);
      S.advance(g, (dt * speed * (state.calm ? 2.5 : 1)) / S.DAY_SEC);
    }
    if (g.over && !ui.firstChild) showOver();
    for (const ev of g.events.splice(0)) {
      if (ev.type === 'flooded') {
        sfx.splash();
        say(t('flooded'), 3000);
      }
      if (ev.type === 'left') say(t('left'), 3000);
      if (ev.type === 'year') {
        sfx.yearDone();
        showYear(ev);
      }
    }
    pickGhost(now);
    coach(now);
    listen(g);
    if (!paused && performance.now() - savedAt > 3000) saveNow();
    updateHud();
    if (state.hintPath && now > state.hintPath.until) state.hintPath = null;
    state.startLabel = t('startHere');
    const wait = Math.max(1, Math.ceil(((S.DIG_REGEN - (g.digTimer || 0)) * S.DAY_SEC) / speed));
    state.tags = { high: t('tagHigh'), up: t('tagHigh'), tired: g.dig < 1 && g.cur ? t('tagTiredIn', { s: wait }) : t('tagTired'), object: t('tagObject'), ice: t('tagIce') };
    view.draw(g, now, state);
  }
  if (now > hintUntil && hintEl.textContent) hintEl.textContent = '';
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => g && view.layout(g));
document.addEventListener('visibilitychange', () => {
  sfx.holdAudio(document.hidden);
  if (document.hidden) saveNow();
  if (document.hidden && g && !g.over && !paused) {
    paused = true;
    showPause();
    updateHud();
  }
});

// a tab left open keeps running old code; now and then look whether a new version was uploaded.
// On the menu it simply reloads, during a game it asks (the game is saved first).
const running = new URL(import.meta.url).searchParams.get('v');
let updateShown = false;
async function checkUpdate() {
  if (!running || updateShown || document.hidden) return;
  try {
    const html = await (await fetch(location.pathname, { cache: 'no-store' })).text();
    const fresh = (html.match(/main\.js\?v=([0-9a-f]+)/) || [])[1];
    if (!fresh || fresh === running) return;
    // a plain reload can take the page from the same stale cache and find the same old code again,
    // round and round: go to an address the cache has never seen, and try that only once per version
    let tried = null;
    try {
      tried = sessionStorage.getItem('aryq.updateTo');
    } catch {
      /* storage blocked */
    }
    if (tried === fresh) return;
    const go = () => {
      try {
        sessionStorage.setItem('aryq.updateTo', fresh);
      } catch {
        /* storage blocked */
      }
      saveNow();
      const u = new URL(location.href);
      u.searchParams.set('u', fresh);
      location.replace(u.toString());
    };
    if (!g || g.over) return go();
    updateShown = true;
    const b = el('button', 'update', t('update'));
    b.addEventListener('click', go);
    document.body.append(b);
  } catch {
    /* offline */
  }
}
setInterval(checkUpdate, 60000);
document.addEventListener('visibilitychange', () => setTimeout(checkUpdate, 500));

showStart();
requestAnimationFrame(frame);
if (q.has('autostart')) start();
