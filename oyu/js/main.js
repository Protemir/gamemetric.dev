import { Game } from './game.js';
import { buildLevel, LEVEL_COUNT } from './levels.js';
import { sample } from './pictures.js';
import { Renderer } from './render.js';
import * as sfx from './audio.js';
import { store, el, clamp } from './util.js';
import { pulse } from './pulse.js';

// ---------- texts ----------

const TEXT = {
  ru: {
    title: 'Ою — пазл: выбей пиксели и собери ковёр узоров',
    tag: 'Отправляй цветные кружки на ленту — они выбивают пиксели своего цвета. Каждая картинка становится лоскутом ковра.',
    play: 'Играть',
    level: 'Уровень {n}',
    carpet: 'Кілем',
    carpetSub: '{n} из {m} узоров',
    next: 'Дальше',
    retry: 'Ещё раз',
    menu: 'В меню',
    done: 'Готово!',
    lost: 'Стоянка переполнена',
    lostTip: 'Отправляй кружок, когда его цвет виден снаружи картинки. Можно пускать несколько сразу.',
    sound: 'Звук',
    made: 'Сделано в TEMIRLAB',
    hint1: 'Нажми на кружок: он поедет по ленте и выбьет пиксели своего цвета',
    hint2: 'Кружок не справился? Он ждёт на стоянке — мест всего 5',
    hint3: 'Пускай несколько кружков сразу: на ленте помещается 5',
    back: 'Назад',
    locked: 'Пройди предыдущие уровни',
  },
  en: {
    title: 'Oyu — pixel puzzle: clear the pictures, weave a carpet',
    tag: 'Send colored shooters onto the belt — they knock out pixels of their own color. Every picture becomes a patch of your carpet.',
    play: 'Play',
    level: 'Level {n}',
    carpet: 'Carpet',
    carpetSub: '{n} of {m} patterns',
    next: 'Next',
    retry: 'Try again',
    menu: 'Menu',
    done: 'Done!',
    lost: 'The dock is full',
    lostTip: 'Send a shooter when its color shows on the outside of the picture. You can send several at once.',
    sound: 'Sound',
    made: 'Made by TEMIRLAB',
    hint1: 'Tap a shooter: it rides the belt and knocks out pixels of its color',
    hint2: 'A shooter ran out of targets? It waits in the dock — only 5 places',
    hint3: 'Send several at once: the belt holds 5',
    back: 'Back',
    locked: 'Finish the earlier levels first',
  },
};
let lang = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if (q && TEXT[q]) return q;
  const saved = store.get('oyu.lang', null);
  if (saved && TEXT[saved]) return saved;
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return /^(ru|kk|ky|be|uz|tg|uk)\b/i.test(nav) ? 'ru' : 'en';
})();
const t = (k, v) => (TEXT[lang][k] || TEXT.en[k] || k).replace(/\{(\w+)\}/g, (_, n) => (v && v[n] != null ? v[n] : ''));
const L = (o) => (o && (o[lang] || o.en)) || '';

// ---------- state ----------

const progress = Object.assign({ done: [], level: 0 }, store.get('oyu.progress', {}));
const save = () => store.set('oyu.progress', progress);
const unlocked = () => Math.min(LEVEL_COUNT - 1, Math.max(progress.done.length ? Math.max(...progress.done) + 1 : 0, progress.level));

const canvas = document.getElementById('game');
const R = new Renderer(canvas);
const ui = document.getElementById('ui');
const hud = document.getElementById('hud');
const hint = document.getElementById('hint');
const $ = (id) => document.getElementById(id);

let game = null;
let level = null;
let mode = 'menu';
let endTimer = 0;
let hintStage = 0;
let hintTimer = 0;
const params = new URLSearchParams(location.search);

// a menu backdrop: an ornament level nobody plays
function demo() {
  level = buildLevel(3);
  game = new Game(level);
  R.setGame(game);
}

function startLevel(i) {
  i = clamp(i, 0, LEVEL_COUNT - 1);
  sfx.audioInit();
  level = buildLevel(i);
  game = new Game(level);
  R.setGame(game);
  progress.level = i;
  save();
  pulse('start', i + 1);
  mode = 'play';
  endTimer = 0;
  ui.replaceChildren();
  hud.hidden = false;
  $('hudLevel').textContent = `${t('level', { n: i + 1 })} · ${L(level.name)}`;
  updateBar();
  hintStage = 0;
  showHint(i === 0 ? 'hint1' : i === 1 ? 'hint2' : i === 2 ? 'hint3' : null);
  R.hint = null;
}

function showHint(key) {
  if (!key) {
    hint.classList.remove('show');
    return;
  }
  hint.textContent = t(key);
  hint.classList.add('show');
  hintTimer = key === 'hint1' ? 999 : 6;
}

function updateBar() {
  if (!game) return;
  $('hudBar').style.width = `${Math.round(((game.total - game.left) / Math.max(1, game.total)) * 100)}%`;
}

// ---------- screens ----------

function panel(cls, ...kids) {
  const p = el('section', 'panel ' + (cls || ''));
  p.append(...kids.filter(Boolean));
  ui.replaceChildren(p);
  const first = p.querySelector('.btn.primary');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 40);
  return p;
}

function button(label, cls, fn) {
  const b = el('button', 'btn ' + (cls || ''), label);
  b.type = 'button';
  b.addEventListener('click', () => {
    sfx.audioInit();
    sfx.tap();
    fn();
  });
  return b;
}

function ornamentLine() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 160 18');
  svg.classList.add('ornament-line');
  svg.innerHTML =
    '<path d="M4 9h52M104 9h52" stroke="#f4b93a" stroke-width="2" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M80 2l7 7-7 7-7-7z" fill="#e0393e"/>' +
    '<path d="M70 9c-6-7-14-2-10 3 3 3 7 0 5-2M90 9c6-7 14-2 10 3-3 3-7 0-5-2" stroke="#f4b93a" stroke-width="2" fill="none" stroke-linecap="round"/>';
  return svg;
}

function langChips(after) {
  const box = el('div', 'chips');
  for (const code of ['ru', 'en']) {
    const b = el('button', 'chip', code.toUpperCase());
    b.type = 'button';
    b.setAttribute('aria-pressed', String(lang === code));
    b.addEventListener('click', () => {
      lang = code;
      store.set('oyu.lang', code);
      applyLang();
      after();
    });
    box.append(b);
  }
  const s = el('button', 'chip', '♪ ' + t('sound'));
  s.type = 'button';
  s.setAttribute('aria-pressed', String(sfx.sound.on));
  s.addEventListener('click', () => {
    toggleSound();
    after();
  });
  box.append(s);
  return box;
}

function screenMenu() {
  mode = 'menu';
  hud.hidden = true;
  showHint(null);
  if (!game || game.state !== 'demo') {
    demo();
    game.state = 'demo';
  }
  const n = unlocked();
  const made = el('p', 'foot', t('made'));
  panel(
    '',
    el('h1', 'logo', 'Ою'),
    ornamentLine(),
    el('p', 'tag', t('tag')),
    button(`${t('play')} · ${t('level', { n: n + 1 })}`, 'primary', () => startLevel(n)),
    button(`${t('carpet')} · ${t('carpetSub', { n: progress.done.length, m: LEVEL_COUNT })}`, '', screenCarpet),
    langChips(screenMenu),
    made,
  );
}

const thumbCache = new Map();
function thumb(i, size = 64) {
  if (thumbCache.has(i)) return thumbCache.get(i);
  const lv = buildLevel(i);
  const cv = document.createElement('canvas');
  cv.width = lv.W;
  cv.height = lv.H;
  const c = cv.getContext('2d');
  for (let k = 0; k < lv.grid.length; k++) {
    if (lv.grid[k] < 0) continue;
    c.fillStyle = lv.palette[lv.grid[k]];
    c.fillRect(k % lv.W, Math.floor(k / lv.W), 1, 1);
  }
  void size;
  thumbCache.set(i, cv);
  return cv;
}

function screenCarpet() {
  mode = 'menu';
  hud.hidden = true;
  const grid = el('div', 'carpet');
  const next = unlocked();
  for (let i = 0; i < LEVEL_COUNT; i++) {
    const done = progress.done.includes(i);
    const b = el('button', 'tile' + (done ? '' : i === next ? ' next' : ' locked'));
    b.type = 'button';
    if (done) {
      const src = thumb(i);
      const cv = document.createElement('canvas');
      cv.width = src.width;
      cv.height = src.height;
      cv.getContext('2d').drawImage(src, 0, 0);
      b.append(cv);
    } else b.textContent = i === next ? '▶' : '?';
    const num = el('span', 'num', String(i + 1));
    b.append(num);
    if (done || i === next) b.addEventListener('click', () => startLevel(i));
    else b.title = t('locked');
    grid.append(b);
  }
  panel('wide', el('h2', '', t('carpet')), el('p', 'sub', t('carpetSub', { n: progress.done.length, m: LEVEL_COUNT })), grid, button(t('back'), '', screenMenu));
}

function screenWin() {
  mode = 'won';
  const i = level.index;
  pulse('win', i + 1);
  if (!progress.done.includes(i)) progress.done.push(i);
  progress.level = Math.min(LEVEL_COUNT - 1, i + 1);
  save();
  const src = thumb(i);
  const prev = document.createElement('canvas');
  const scale = Math.max(1, Math.floor(150 / src.width));
  prev.width = src.width * scale;
  prev.height = src.height * scale;
  const pc = prev.getContext('2d');
  pc.imageSmoothingEnabled = false;
  pc.drawImage(src, 0, 0, prev.width, prev.height);
  prev.className = 'preview';
  const bar = el('div', 'carpet-progress');
  const barP = el('p', '', `${t('carpet')}: ${t('carpetSub', { n: progress.done.length, m: LEVEL_COUNT })}`);
  const track = el('div', 'bar');
  const fill = el('i');
  fill.style.width = `${Math.round((progress.done.length / LEVEL_COUNT) * 100)}%`;
  track.append(fill);
  bar.append(barP, track);
  const last = i + 1 >= LEVEL_COUNT;
  panel('', el('h2', '', t('done')), el('p', 'sub', L(level.name)), prev, bar, last ? null : button(t('next'), 'primary', () => startLevel(i + 1)), button(t('menu'), '', screenMenu));
}

function screenLost() {
  mode = 'lost';
  pulse('fail', level.index + 1);
  panel('', el('h2', '', t('lost')), el('p', 'sub', t('lostTip')), button(t('retry'), 'primary', () => startLevel(level.index)), button(t('menu'), '', screenMenu));
}

// ---------- input ----------

canvas.addEventListener('pointerdown', (e) => {
  sfx.audioInit();
  if (mode !== 'play' || !game || game.state !== 'play') return;
  const hit = R.hit(e.clientX, e.clientY);
  if (!hit) return;
  const ok = hit.type === 'queue' ? game.launchFromQueue(hit.q) : game.launchFromDock(hit.d);
  if (ok && hintStage === 0 && level.index === 0) {
    hintStage = 1;
    showHint(null);
  }
});

window.addEventListener('keydown', (e) => {
  if (mode === 'play' && game && game.state === 'play') {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= game.queues.length) game.launchFromQueue(n - 1);
    if (e.code === 'KeyR') startLevel(level.index);
  }
});

$('menuBtn').addEventListener('click', () => {
  sfx.tap();
  screenMenu();
});
$('restartBtn').addEventListener('click', () => {
  sfx.tap();
  if (level) startLevel(level.index);
});
function toggleSound() {
  sfx.setSound(!sfx.sound.on);
  labelSound();
}
function labelSound() {
  $('soundBtn').textContent = sfx.sound.on ? '♪' : '×';
  $('soundBtn').setAttribute('aria-pressed', String(sfx.sound.on));
}
$('soundBtn').addEventListener('click', toggleSound);

function applyLang() {
  document.documentElement.lang = lang;
  document.title = t('title');
  if (level && mode === 'play') $('hudLevel').textContent = `${t('level', { n: level.index + 1 })} · ${L(level.name)}`;
}

// ---------- loop ----------

R.onArrive = () => {
  sfx.pop();
  updateBar();
};

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt);
  requestAnimationFrame(frame);
}

function tick(dt, draw = true) {
  if (game && game.state !== 'demo') {
    // small steps keep fast shooters from skipping lanes on slow frames
    let left = dt;
    while (left > 0) {
      const step = Math.min(left, 1 / 60);
      game.update(step);
      left -= step;
    }
    for (const e of game.events) {
      R.handle(e);
      if (e.type === 'launch') {
        sfx.launch();
        if (navigator.vibrate) navigator.vibrate(8);
      } else if (e.type === 'dock') sfx.dock();
      else if (e.type === 'spent') sfx.spent();
      else if (e.type === 'beltFull') sfx.full();
      else if (e.type === 'overflow') sfx.fail();
    }
    game.events.length = 0;
  }
  // tutorial ring on the first shooter
  if (mode === 'play' && level && level.index === 0 && hintStage === 0 && R.queuePos) R.hint = { x: R.queuePos[0].x, y: R.queuePos[0].y, r: R.qr };
  else R.hint = null;
  if (hintTimer < 900) {
    hintTimer -= dt;
    if (hintTimer <= 0) showHint(null);
  }
  if (mode === 'play' && game) {
    if (game.state === 'won' && !R.busy && !R.win) {
      endTimer += dt;
      if (endTimer > 0.25) {
        sfx.win();
        R.startWin(screenWin);
      }
    } else if (game.state === 'lost' && mode === 'play') {
      endTimer += dt;
      if (endTimer > 0.7) screenLost();
    }
  }
  R.update(dt);
  if (draw) R.draw();
}

function resize() {
  R.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  last = performance.now();
});

labelSound();
applyLang();
resize();
pulse('open');
// a new player lands straight in the first level; others see the menu
if (params.has('level')) startLevel(parseInt(params.get('level'), 10) - 1);
else if (!progress.done.length) startLevel(0);
else screenMenu();
requestAnimationFrame(frame);

if (params.has('debug')) {
  window.__oyu = {
    get game() {
      return game;
    },
    get mode() {
      return mode;
    },
    R,
    buildLevel,
    startLevel,
    sample,
    progress,
    // run the game by hand (tests, headless capture): n frames of 1/60 s
    step(n = 60, draw = true) {
      for (let k = 0; k < n; k++) tick(1 / 60, draw && k === n - 1);
    },
  };
}
