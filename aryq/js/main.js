import * as S from './sim.js';
import { View } from './render.js';
import { el, store, clamp } from './util.js';
import * as sfx from './audio.js';
import { PORTAL, portalLang, gameplay, loadingDone, happytime, onPortalMute } from './portal.js';
import { pulse, minute } from './pulse.js';

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
let portalMuted = false; // the portal's own mute button wins over ours

function seedNow() {
  return q.has('seed') ? +q.get('seed') : (Math.random() * 1e9) | 0;
}

// today's valley: the same seed for everyone, from the date
const today = new Date().toISOString().slice(0, 10);
const dailySeed = [...today].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
const bestKey = (mode) => (mode === 'daily' ? 'aryq.best.daily.' + today : 'aryq.best.' + mode);
let mode = store.get('aryq.mode', 'mountain');

// days in a row the valley of the day was played; each one gives more ketmen at its start
const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const STREAK_DIG = 5, STREAK_MAX = 20;
const streakBonus = (n) => Math.min(STREAK_MAX, STREAK_DIG * Math.max(0, n - 1));
function streakNow() {
  const s = store.get('aryq.streak', null);
  if (!s || typeof s !== 'object' || !(s.n >= 1)) return { d: '', n: 0 };
  return s.d === today || s.d === yesterday ? s : { d: s.d, n: 0 };
}
// a new daily game: the streak goes on (or starts again) and gives its bonus
function playDaily() {
  const s = streakNow();
  const n = s.d === today ? s.n : s.n + 1;
  store.set('aryq.streak', { d: today, n });
  pulse('daily', 'n' + Math.min(n, 30));
  return n;
}

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
  told.clear();
  ui.replaceChildren();
  hud.hidden = false;
  if (!restored) S.advance(g, 0.01); // the first garden appears
  pulse('start', restored ? m + ':resume' : m);
  if (m === 'daily' && !restored) {
    const n = playDaily();
    const b = streakBonus(n);
    if (b) {
      g.dig += b;
      setTimeout(() => say(t('streakBonus', { n, b }), 4500), 600);
    }
  }
  saveNow();
  pickGhost(performance.now(), true);
  if (!store.get('aryq.labelsSeen', false) && !restored) {
    store.set('aryq.labelsSeen', true);
    const first = g.objects.find((o) => o.type === 'garden');
    state.labels = {
      until: performance.now() + 9000,
      list: [
        // the glacier is the whole top row: point at the side away from the first dashed path
        { i: state.ghost && state.ghost.from % g.W < g.W / 2 ? g.W - 3 : 2, text: t('lblGlacier') },
        { i: g.river[Math.floor(g.river.length * 0.55)], text: t('lblRiver') },
        ...(first ? [{ i: first.y * g.W + first.x, text: t('lblOrchard') }] : []),
      ],
    };
  }
  updateHud();
  if (DEBUG) window.__aryq = { g, S, view, state, step: (d) => S.advance(g, d) };
  // a game closed on the gift panel gets its gift back
  if (restored && g.giftDue) showYear({ year: g.giftDue });
}

// some tips are worth saying only the first few times in a game
const told = new Map();
function tip(key, ms, times = 2) {
  const n = told.get(key) || 0;
  if (n >= times) return;
  told.set(key, n + 1);
  say(t(key), ms);
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
    oneMore: 'Ещё год',
    oneMoreSub: 'засохший сад уйдёт, остальным передышка и +{d} ⛏ · раз за игру',
    revived: 'Долина живёт дальше: +{d} ⛏. Напои тех, кому мало воды.',
    streak: 'Серия: {n} дн. подряд',
    streakBonus: 'Серия {n} дн. подряд: +{b} ⛏ на старте',
    tomorrow: 'Завтра будет новая долина дня. Зайди — серия {n} дн., +{b} ⛏ на старте.',
    playDaily: 'Сыграй долину дня: каждый день подряд даёт ещё кетменя на старте.',
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
    help: 'Как играть',
    gotIt: 'Понятно',
    lblGlacier: 'Ледник — отсюда течёт вся вода',
    lblRiver: 'Река',
    lblOrchard: 'Сад — напои его',
    lgGlacier: 'Ледник — отсюда течёт вся вода. Весной тает сильнее, к осени меньше.',
    lgRiver: 'Река течёт вниз по долине, от ледника.',
    lgCanal: 'Арык копаешь сам: тяни палец от реки или другого арыка.',
    lgLines: 'Линии высоты. Вода течёт вниз, а вверх арык поднимается не выше одной линии.',
    lgOrchard: 'Сад пьёт воду. Засох хоть один — игра окончена.',
    lgYurt: 'Юрта пьёт меньше. Арык, оборванный рядом с ней, её подтапливает.',
    lgThirst: 'Капля — воды мало. Красное кольцо — жажда растёт. Тапни по саду — покажу путь воды.',
    lgFlood: 'Синее кольцо — юрту подтапливает.',
    lgGate: 'Шлюз: тап по арыку перекрывает воду, ещё тап — открывает.',
    lgFoam: 'Белая пена — арык полон и больше не пропустит. Проведи ещё один от реки.',
    lgWater: '💧 в шапке — хватает ли воды на всех. Каждый арык сам немного впитывает.',
    lgDig: '⛏ — сколько клеток можно выкопать. Сам прибавляется со временем.',
    pathShown: 'Вот как сюда довести воду: начни у кольца и веди палец по пунктиру.',
    fullCanal: 'Арык, что поит этот сад, полон до краёв (белая пена по краям) — больше не пропустит. Вот путь от реки: веди по пунктиру.',
    alreadyWet: 'Здесь вода уже есть.',
    noPath: 'Сюда воду пока не довести ни от одного арыка. Попробуй провести арык выше по склону.',
    winterCame: 'Зима: сады спят и не пьют до весны. Самое время спокойно провести новые арыки.',
    update: 'Вышла новая версия — нажми, чтобы обновить (игра сохранится)',
    plenty: 'вдоволь',
    ghostStart: 'Пунктир начинается выше, у кольца «начни тут». От этого арыка вода туда не поднимется — начни от кольца.',
    start: 'Начинай от реки или от арыка и тяни.',
    grew: 'В долине тесно, и сады разрастаются: этот пьёт больше. Подведи к нему ещё воды.',
    pinch: 'Мелко? Раздвинь двумя пальцами — поле приблизится.',
    gateShut: 'Шлюз закрыт: вода сюда не идёт. Нажми ещё раз — откроется.',
    gateOpen: 'Шлюз открыт',
    gateRiver: 'Шлюз ставят на арык: нажми на сам арык.',
    elsewhere: 'Отсюда туда не стечь: там выше. Начни там, где пунктир, — выше по склону.',
    higher: 'выше',
    floodSoon: 'Юрту подтапливает: рядом кончается арык и вода льётся. Доведи арык до юрты или обратно в реку, или закрой шлюз.',
    lowWater: 'Этому саду мало воды: арык, который его поит, уже полон. Тапни по саду — покажу путь от реки.',
    riverLow: 'Воды на всех не хватает (💧 в шапке): к осени ледник тает меньше, а каждый арык сам впитывает немного воды. Отмени лишние арыки (↶), закрой шлюз у тех, кто подождёт, или возьми «Щедрый ледник».',
    water: 'Сколько воды даёт ледник против того, сколько выпивают сады, юрты и сами арыки',
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
    mountainSub: 'обычная · холмы, арыки в обход',
    wideSub: 'полегче · пологая, воды больше',
    gorgeSub: 'потруднее · крутая, воды меньше',
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
    oneMore: 'One more year',
    oneMoreSub: 'the dry orchard goes, the rest get a breather and +{d} ⛏ · once a game',
    revived: 'The valley goes on: +{d} ⛏. Water the ones that are short.',
    streak: 'Streak: {n} days in a row',
    streakBonus: '{n} days in a row: +{b} ⛏ to start with',
    tomorrow: 'A new valley of the day comes tomorrow. Come back for a {n}-day streak and +{b} ⛏ to start.',
    playDaily: 'Play the valley of the day: every day in a row gives more ketmen to start with.',
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
    help: 'How to play',
    gotIt: 'Got it',
    lblGlacier: 'Glacier — all the water comes from here',
    lblRiver: 'River',
    lblOrchard: 'Orchard — give it water',
    lgGlacier: 'The glacier is where all the water comes from. It melts more in spring and less by autumn.',
    lgRiver: 'The river runs down the valley from the glacier.',
    lgCanal: 'You dig canals yourself: drag from the river or from another canal.',
    lgLines: 'Contour lines. Water runs downhill, and a canal can climb at most one line.',
    lgOrchard: 'Orchards drink water. If one dries up, the game is over.',
    lgYurt: 'Yurts drink less. A canal that ends right next to one floods it.',
    lgThirst: 'A drop means little water. A red ring is growing thirst. Tap an orchard to see a way for water.',
    lgFlood: 'A blue ring means the yurt is flooding.',
    lgGate: 'Gate: tap a canal to close it, tap again to open.',
    lgFoam: 'White foam: the canal is full and will not carry more. Dig another from the river.',
    lgWater: '💧 at the top: is there water for everyone. Every canal soaks up a little.',
    lgDig: '⛏ how many cells you can dig. It grows back over time.',
    pathShown: 'This is how to bring water here: start at the ring and drag along the dashed line.',
    fullCanal: 'The canal that feeds this orchard is full to the brim (white foam at its edges) and will not carry more. Here is a way from the river: drag along the dashed line.',
    alreadyWet: 'There is water here already.',
    noPath: 'No canal can bring water here yet. Try a canal higher up the slope.',
    winterCame: 'Winter: the orchards sleep and drink nothing until spring. A good time to dig new canals calmly.',
    update: 'A new version is out: tap to update (your game is saved)',
    plenty: 'plenty',
    ghostStart: 'The dashed line starts higher up, at the “start here” ring. From this canal water cannot climb there: start from the ring.',
    start: 'Start from the river or a canal and drag.',
    grew: 'The valley is full, so orchards grow: this one drinks more now. Bring it more water.',
    pinch: 'Too small? Spread two fingers to zoom in.',
    gateShut: 'Gate closed: no water goes this way. Tap again to open it.',
    gateOpen: 'Gate open',
    gateRiver: 'Gates go on canals: tap the canal itself.',
    elsewhere: 'Water cannot run there from here: it is higher. Start where the dashed line starts, further up the slope.',
    higher: 'higher',
    floodSoon: 'A yurt is flooding: a canal ends next to it and spills. Run the canal to the yurt or back into the river, or close a gate.',
    lowWater: 'This orchard is short of water: the canal that feeds it is already full. Tap the orchard to see a way from the river.',
    riverLow: 'There is not enough water for everyone (💧 at the top): by autumn the glacier melts less, and every canal soaks up a little water. Undo canals you do not need (↶), close a gate for those who can wait, or take the Generous glacier.',
    water: 'How much water the glacier gives against what orchards, yurts and the canals themselves drink',
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
    mountainSub: 'normal · hills to dig around',
    wideSub: 'easier · gentle, more water',
    gorgeSub: 'harder · steep, less water',
    daily: 'Valley of the day',
    dailySub: 'the same for everyone today, {d}',
    bestShort: 'best {b}',
  },
};
let lang = (() => {
  const want = q.get('lang') || store.get('aryq.lang', null) || (PORTAL ? portalLang() : null);
  if (want && TEXT[want]) return want;
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return /^(ru|kk|ky|be|uz|tg|uk)\b/i.test(nav) ? 'ru' : 'en';
})();
const t = (k, v) => (TEXT[lang][k] || TEXT.en[k] || k).replace(/\{(\w+)\}/g, (_, n) => (v && v[n] != null ? v[n] : ''));
let WHY = {};
// everything written once rather than every frame; called again when the player switches language
function applyLang() {
  WHY = { high: t('high'), up: t('up'), ice: t('ice'), object: t('object'), tired: t('tired') };
  document.documentElement.lang = lang;
  // on portals the game is listed under its full English name
  document.title = PORTAL ? 'Aryk: Water the Valley' : t('title');
  $('dig').parentElement.title = t('dig');
  $('harvest').parentElement.title = t('harvest');
  $('undoBtn').setAttribute('aria-label', t('undo'));
  $('speedBtn').setAttribute('aria-label', t('speed'));
  $('pauseBtn').setAttribute('aria-label', t('pause'));
  $('soundBtn').setAttribute('aria-label', t('sound'));
  cv.setAttribute('aria-label', t('title'));
}
applyLang();

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

const fingers = new Map(); // pointerId -> {x, y}
let pinch = null; // two fingers on the screen: { d, z, mx, my }
const spread = () => {
  const [a, b] = [...fingers.values()];
  return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
};
function startPinch() {
  // a stroke the first finger had begun is taken back: the second finger means "zoom", not "dig"
  if (press && press.moved && g && g.cur) {
    S.endStroke(g);
    S.undo(g);
  }
  press = null;
  state.reach = null;
  state.loupe = null;
  const s = spread();
  pinch = { d: Math.max(20, s.d), z: view.zoom, mx: s.mx, my: s.my };
  if (!store.get('aryq.pinchSeen', false)) store.set('aryq.pinchSeen', true);
}
cv.addEventListener('pointerdown', (e) => {
  // only the main mouse button digs (the right one dug too, under the browser's menu)
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const rr = cv.getBoundingClientRect();
  if (e.pointerType === 'touch') fingers.set(e.pointerId, { x: e.clientX - rr.left, y: e.clientY - rr.top });
  if (fingers.size >= 2) {
    startPinch();
    return;
  }
  sfx.audioInit();
  if (!g || g.over || paused) return;
  const c = toCell(e);
  if (c < 0) return;
  cv.setPointerCapture(e.pointerId);
  const r = cv.getBoundingClientRect();
  press = { cell: c, tapped: c, moved: false, x: e.clientX - r.left, y: e.clientY - r.top };
  // an orchard or a yurt is drawn as big as its cell: a press near its edge still means it
  press.obj = g.objAt[c] || null;
  if (!press.obj && !S.isWater(g, c)) {
    let best = view.cs * 0.85;
    for (const o of g.objects) {
      const [ox, oy] = view.center(o.y * W + o.x);
      const d = Math.hypot(ox - press.x, oy - press.y);
      if (d < best) {
        best = d;
        press.obj = o;
      }
    }
  }
  // a finger often lands just beside the end of a canal (the puddle is wider than the cell):
  // start from the nearest water cell if there is one right there
  if (!S.isWater(g, c) && !press.obj) {
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
  const shown = state.hintPath || state.ghost;
  if (shown) {
    const [gx, gy] = view.center(shown.from);
    const d = Math.hypot(gx - press.x, gy - press.y);
    if (d < view.cs * 0.9 || (!S.isWater(g, press.cell) && d < view.cs * 1.3)) press.cell = shown.from;
  }
  if (S.isWater(g, press.cell)) {
    state.reach = lit(press.cell);
    if (!store.get('aryq.litSeen', false)) {
      store.set('aryq.litSeen', true);
      say(t('lit'), 4000);
    }
    if (g.dig < 1) tip('tired', 3000);
  }
  else if (!press.obj) tip('start', 1800, 3);
});

cv.addEventListener('pointermove', (e) => {
  const rr = cv.getBoundingClientRect();
  if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX - rr.left, y: e.clientY - rr.top });
  if (pinch) {
    if (fingers.size < 2) return;
    const s = spread();
    view.zoomAt(pinch.z * (s.d / pinch.d), s.mx, s.my);
    view.pan(s.mx - pinch.mx, s.my - pinch.my);
    pinch.mx = s.mx;
    pinch.my = s.my;
    pinch.z = view.zoom;
    pinch.d = Math.max(20, s.d);
    return;
  }
  if (!press || !g) return;
  // the loupe follows a finger that digs
  if (press.moved && e.pointerType === 'touch') state.loupe = { x: e.clientX - rr.left, y: e.clientY - rr.top };
  const c = toCell(e);
  if (c < 0 || c === press.cell && !press.moved) return;
  if (!press.moved) {
    if (!S.startStroke(g, press.cell)) return;
    press.moved = true;
    if (e.pointerType === 'touch') state.loupe = { x: e.clientX - rr.left, y: e.clientY - rr.top };
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
  state.reachFrom = from;
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
      if (WHY[r.why]) tip(r.why, 2200);
      break;
    }
  }
  state.reach = lit(lastCell());
  return true;
}

// when the finger asks for a place this stroke cannot reach, show where it could start instead
function showBetterStart(target) {
  // the finger on an orchard or a yurt, or near a thirsty one (18.10: "a cross everywhere below"):
  // the finger rarely lands right on the orchard it means
  let o = g.objAt[target];
  if (!o) {
    const tx = target % W, ty = (target / W) | 0;
    let best = 3.2;
    for (const x of g.objects) {
      const d = Math.hypot(x.x - tx, x.y - ty);
      if (x.s < 0.99 && d < best) {
        best = d;
        o = x;
      }
    }
  }
  if (!o) return;
  const plan = S.planFor(g, o);
  if (!plan || !plan.cells.length || plan.from === (g.cur && g.cur.from)) return;
  state.hintPath = { from: plan.from, cells: plan.cells, until: performance.now() + 3500 };
  tip('elsewhere', 3500, 3);
}

function walkTo(target) {
  // along the dashed path the canal sticks to it, so a shaky finger does not wander off into a rise
  const gh = state.hintPath || state.ghost;
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
          if (WHY[r.why]) tip(r.why, 2200);
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
        const following = gh && g.cur && g.cur.from !== gh.from && g.cur.cells.length > 0 && g.cur.cells.every((c) => gh.cells.includes(c) || gh.cells.some((x) => Math.abs((x % W) - (c % W)) + Math.abs(((x / W) | 0) - ((c / W) | 0)) === 1));
        if (following && gh.cells.includes(b)) tip('ghostStart', 5000);
        else if (WHY[r.why]) tip(r.why, 2200);
        // a better start is shown only when the finger goes to an orchard or a yurt
        if (r.why === 'high' || r.why === 'up') showBetterStart(target);
      }
      return;
    }
    if (!r.back) state.blocked = null;
  }
}

let lifts = 0;
function lift(e) {
  fingers.delete(e.pointerId);
  state.loupe = null;
  if (pinch) {
    if (fingers.size === 0) pinch = null;
    return; // the last finger of a pinch does not tap or dig
  }
  release();
  // small cells under a finger: say once that the valley can be brought closer
  if (e.pointerType === 'touch' && ++lifts === 3 && view.zoom === 1 && view.cs0 < 32 && !store.get('aryq.pinchSeen', false)) tip('pinch', 3200, 1);
}
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rr = cv.getBoundingClientRect();
  view.zoomAt(view.zoom * Math.exp(-e.deltaY * 0.0015), e.clientX - rr.left, e.clientY - rr.top);
}, { passive: false });

function release() {
  // the tip about light cells is for while digging; once the finger is up it is only in the way
  if (hintEl.textContent === t('lit')) {
    hintEl.textContent = '';
    hintUntil = 0;
  }
  if (!press || !g) return;
  state.reach = null;
  if (!press.moved && press.obj) {
    // a tap on an orchard or a yurt shows how to bring it water
    const o = press.obj;
    const short = o.got < o.need * 0.9 && g.day < S.WINTER;
    const touching = !!S.planFor(g, o) && S.planFor(g, o).cells.length === 0;
    const plan = S.planFor(g, o, null, short && touching);
    if (!plan) say(t('noPath'), 4000);
    else if (!plan.cells.length) say(t('alreadyWet'), 2000);
    else {
      state.hintPath = { from: plan.from, cells: plan.cells, until: performance.now() + 6000 };
      say(short && touching ? t('fullCanal') : t('pathShown'), 5000);
    }
    sfx.click();
  } else if (!press.moved) {
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
cv.addEventListener('pointerup', lift);
cv.addEventListener('pointercancel', lift);
cv.addEventListener('contextmenu', (e) => e.preventDefault());
// a button let go outside the window, or the window left mid-drag: no pointerup ever comes, and the
// open canal kept the days stopped and the next stroke started on top of it (19.10)
cv.addEventListener('lostpointercapture', (e) => {
  if (press) lift(e);
});
window.addEventListener('blur', () => {
  fingers.clear();
  pinch = null;
  state.loupe = null;
  if (press) release();
});

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
  if (!g || g.over || hud.hidden || ui.querySelector('.rewards')) return;
  paused = !paused;
  if (paused) showPause();
  else ui.replaceChildren();
  updateHud();
}

function showPause() {
  const box = el('div', 'panel paused');
  box.append(el('h2', null, t('paused')), el('p', 'muted', t('pauseTip')));
  const go = el('button', 'btn', t('resume'));
  go.addEventListener('click', togglePause);
  const how = el('button', 'btn ghost', t('help'));
  how.addEventListener('click', () => showHelp(showPause));
  // the game is saved, so the menu offers "continue" for it
  const menu = el('button', 'btn ghost', t('menu'));
  menu.addEventListener('click', () => {
    saveNow(); // the valley stays paused behind the menu
    showStart();
  });
  box.append(go, how, menu);
  ui.replaceChildren(box);
}

// what everything on the field is, with small drawings in the colours of the game
const LEGEND = [
  ['lgGlacier', '<rect x="2" y="3" width="10" height="20" rx="2" fill="#eef3f6" stroke="#b9c7d2"/><path d="M12 13h12" stroke="#2f8ac4" stroke-width="4" stroke-linecap="round"/>'],
  ['lgRiver', '<path d="M2 18c6-8 10 4 22-6" stroke="#c9b48a" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M2 18c6-8 10 4 22-6" stroke="#2f8ac4" stroke-width="5" fill="none" stroke-linecap="round"/>'],
  ['lgCanal', '<path d="M3 20h10V6h10" stroke="#6b4a2e" stroke-width="7" fill="none" stroke-linejoin="round"/><path d="M3 20h10V6h10" stroke="#2f8ac4" stroke-width="3" fill="none" stroke-linejoin="round"/>'],
  ['lgLines', '<rect x="1" y="1" width="24" height="24" rx="4" fill="#a99a62"/><path d="M1 8c8 3 16-4 24 0M1 15c8 3 16-4 24 0M1 22c8 3 16-4 24 0" stroke="rgba(0,0,0,0.45)" fill="none"/>'],
  ['lgOrchard', '<circle cx="9" cy="9" r="6" fill="#5f9a3a"/><circle cx="17" cy="10" r="6" fill="#5f9a3a"/><circle cx="12" cy="17" r="6" fill="#4f8a32"/><circle cx="10" cy="8" r="1.4" fill="#d9483b"/><circle cx="17" cy="12" r="1.4" fill="#d9483b"/>'],
  ['lgYurt', '<circle cx="13" cy="13" r="10" fill="#f6efe2" stroke="#c9bba2"/><circle cx="13" cy="13" r="7" fill="none" stroke="#b0402e"/><circle cx="13" cy="13" r="3" fill="#6b4523"/>'],
  ['lgThirst', '<path d="M13 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" fill="#2f8ac4" stroke="#fff"/><path d="M5 22a10 10 0 0 0 16 0" stroke="#e2493b" stroke-width="3" fill="none"/>'],
  ['lgFlood', '<circle cx="13" cy="13" r="7" fill="#f6efe2"/><path d="M13 3a10 10 0 1 1-9.5 13" stroke="#2f8ac4" stroke-width="3" fill="none"/>'],
  ['lgGate', '<path d="M2 13h22" stroke="#2f8ac4" stroke-width="5"/><path d="M15 4v18" stroke="#8a5530" stroke-width="5"/>'],
  ['lgFoam', '<path d="M2 13h22" stroke="#f5fcff" stroke-width="11"/><path d="M2 13h22" stroke="#2f8ac4" stroke-width="7"/>'],
  ['lgWater', '<text x="2" y="19" font-size="16">💧</text>'],
  ['lgDig', '<text x="2" y="19" font-size="16">⛏</text>'],
];
function showHelp(back) {
  const box = el('div', 'panel help');
  box.append(el('h2', null, t('help')));
  const list = el('div', 'legend');
  for (const [key, svg] of LEGEND) {
    const row = el('div', 'legend-row');
    const pic = el('span', 'legend-pic');
    pic.innerHTML = '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">' + svg + '</svg>';
    row.append(pic, el('span', null, t(key)));
    list.append(row);
  }
  box.append(list);
  const ok = el('button', 'btn', t('gotIt'));
  ok.addEventListener('click', back);
  box.append(ok);
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
  pulse('over', g.mode + ':y' + Math.min(g.year, 9) + ':' + minute());
  // once a game the valley can go on: players used to leave right here (21.10)
  if (S.canRevive(g)) {
    const more = el('button', 'btn');
    more.append(el('span', null, t('oneMore')), el('small', null, t('oneMoreSub', { d: S.REVIVE_DIG })));
    more.addEventListener('click', () => {
      sfx.audioInit();
      if (!S.revive(g)) return;
      pulse('more', 'y' + Math.min(g.year, 9));
      ui.replaceChildren();
      hud.hidden = false;
      paused = false;
      saveNow();
      updateHud();
      pickGhost(performance.now(), true);
      say(t('revived', { d: S.REVIVE_DIG }), 4500);
    });
    box.append(more);
  }
  const again = el('button', S.canRevive(g) ? 'btn ghost' : 'btn', t('again'));
  again.addEventListener('click', () => {
    sfx.audioInit();
    start(g.mode);
  });
  box.append(again);
  // the valley of the day and its streak: a reason to come back tomorrow
  const st = streakNow();
  if (g.mode !== 'daily') {
    const daily = el('button', 'btn ghost', t('daily'));
    daily.addEventListener('click', () => {
      sfx.audioInit();
      store.set('aryq.save', null);
      start('daily');
    });
    box.append(daily);
  }
  box.append(el('p', 'muted streak', st.d === today ? t('tomorrow', { n: st.n + 1, b: streakBonus(st.n + 1) }) : t('playDaily')));
  const menu = el('button', 'btn ghost', t('menu'));
  menu.addEventListener('click', showStart);
  box.append(menu);
  ui.replaceChildren(box);
}

function showStart() {
  hud.hidden = true;
  const box = el('div', 'panel menu');
  box.append(el('h1', null, t('title')));
  // on portals the game is listed as "Aryk: Water the Valley": the start screen says the same
  if (PORTAL) box.append(el('p', 'logo-sub', 'Water the Valley'));
  box.append(el('p', null, t('tag')));
  const raw = store.get('aryq.save', null);
  const saved = S.usable(raw, W, H) ? raw : null;
  const savedMode = saved && ['wide', 'mountain', 'gorge', 'daily'].includes(saved.mode) ? saved.mode : 'mountain';
  if (saved && saved.v === 1) {
    const cont = el('button', 'btn');
    cont.append(el('span', null, t('resumeGame')), el('small', null, t('resumeSub', { v: t(savedMode), y: saved.year })));
    cont.addEventListener('click', () => {
      sfx.audioInit();
      try {
        const old = S.load(saved);
        start(savedMode, old);
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
    const st = m === 'daily' ? streakNow() : null;
    const sub = m === 'daily' ? (st.n ? t('streak', { n: st.n }) : t('dailySub', { d: today.slice(8, 10) + '.' + today.slice(5, 7) })) : t(m + 'Sub');
    btn.append(icon(m), el('b', null, t(m)), el('small', null, sub + (best ? ' · ' + t('bestShort', { b: best }) : '')));
    btn.addEventListener('click', () => {
      sfx.audioInit();
      store.set('aryq.save', null);
      start(m);
    });
    list.append(btn);
  }
  box.append(list);
  const how = el('button', 'btn ghost', t('help'));
  how.addEventListener('click', () => showHelp(showStart));
  box.append(how);
  const langs = el('p', 'langs');
  for (const code of ['ru', 'en']) {
    const a = el('button', code === lang ? 'on' : '', code.toUpperCase());
    // switched in place: on CrazyGames a reload came back before their Data module had saved the
    // choice, so the language never changed (19.10)
    a.addEventListener('click', () => {
      if (code === lang) return;
      store.set('aryq.lang', code);
      lang = code;
      applyLang();
      showStart();
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
  const taught = store.get('aryq.taught', 0);
  const learning = taught < 3;
  // for the next few orchards the path still comes soon, not only when it is nearly dry
  // (19.10: a new player waited ~20 s at the 4th orchard with only a drop to go by)
  const soon = taught < 8 ? 0.12 : 0.45;
  let target = null;
  if (g.day < S.WINTER) {
    for (const o of g.objects) {
      if (o.got > 0.01 || (!learning && o.thirst < soon)) continue;
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
      const key = share != null && share < 1.05 ? 'riverLow' : 'lowWater';
      if (state.lowYear === g.year + key) continue;
      state.lowYear = g.year + key;
      say(t(key), 6000);
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
      state.calm = g.day >= S.WINTER || (g.objects.length > 0 && g.objects.every((o) => o.s >= 0.6));
      // winter has nothing to do in it: it goes by four times faster
      S.advance(g, (dt * speed * (g.day >= S.WINTER ? 4 : state.calm ? 2.5 : 1)) / S.DAY_SEC);
    }
    // (a pause panel never hides a lost valley: its Continue button would do nothing)
    if (g.over && (!ui.firstChild || ui.querySelector('.paused'))) showOver();
    gameplay(!g.over && !paused && !hud.hidden);
    for (const ev of g.events.splice(0)) {
      if (ev.type === 'winter') say(t('winterCame'), 5000);
      if (ev.type === 'flooded') {
        sfx.splash();
        say(t('flooded'), 3000);
      }
      if (ev.type === 'left') say(t('left'), 3000);
      if (ev.type === 'grow') {
        view.burst(ev.obj.y * W + ev.obj.x, 'leaf');
        tip('grew', 4500, 2);
      }
      if (ev.type === 'year') {
        pulse('year', g.mode + ':y' + (ev.year - 1));
        sfx.yearDone();
        happytime();
        showYear(ev);
      }
    }
    pickGhost(now);
    coach(now);
    listen(g);
    if (!paused && performance.now() - savedAt > 3000) saveNow();
    updateHud();
    if (state.hintPath && now > state.hintPath.until) state.hintPath = null;
    if (state.labels && now > state.labels.until) state.labels = null;
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
  sfx.holdAudio(document.hidden || portalMuted);
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
  // a portal hosts its own copy of the files: nothing to look for there
  if (PORTAL || !running || updateShown || document.hidden) return;
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

// On a portal the first screen is the valley itself. CrazyGames counts a visit only once the game
// starts, and the menu in front lost a third of them (21.10: 62% on computers, 33% on phones):
// a saved game goes on, a new player gets the easy wide valley.
function firstScreen() {
  if (!PORTAL || q.has('menu')) return showStart();
  const raw = store.get('aryq.save', null);
  if (S.usable(raw, W, H) && raw.v === 1) {
    try {
      return start(['wide', 'mountain', 'gorge', 'daily'].includes(raw.mode) ? raw.mode : 'mountain', S.load(raw));
    } catch {
      store.set('aryq.save', null);
    }
  }
  start(store.get('aryq.mode', null) ? mode : 'wide');
}

pulse('open', S.usable(store.get('aryq.save', null), W, H) || store.get('aryq.taught', 0) ? 'back' : 'new');
firstScreen();
requestAnimationFrame(frame);
// where a player was when the page went away (the first time only): the menu, playing, a panel
let leftOnce = false;
function left() {
  if (leftOnce) return;
  leftOnce = true;
  const panel = ui.querySelector('.rewards') ? 'gift' : ui.querySelector('.menu') ? 'menu' : g && g.over ? 'over' : ui.querySelector('.paused') ? 'pause' : ui.firstChild ? 'panel' : 'play';
  pulse('leave', panel + ':y' + (g ? Math.min(g.year, 9) : 0) + ':' + minute());
}
// caught on the way in, before the game's own handler pauses and puts up its panel
window.addEventListener('visibilitychange', () => document.hidden && left(), true);
window.addEventListener('pagehide', left);
requestAnimationFrame(() => loadingDone());
onPortalMute((muted) => {
  portalMuted = muted;
  sfx.holdAudio(muted || document.hidden);
});
if (q.has('autostart')) start();
