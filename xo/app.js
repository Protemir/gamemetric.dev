// Tic-tac-toe: the menu, the board, the score and the sounds. The rules and the bots are in logic.js.
import { result, botMove, other } from './logic.js';
import { boardArt, MARK } from './art.js';
import { PORTAL, portalLang, loadingDone, gameplay, happytime, onPortalMute, onPortalPause, adBreak } from './portal.js';

// the name on portals, where the game is listed in English
const PORTAL_NAME = 'Tic-Tac-Toe: Neon Duel';

const $ = (sel) => document.querySelector(sel);
// on a portal the saves go to its storage (boot.js puts it in window.XO_DATA)
const store = () => window.XO_DATA || localStorage;
const local = {
  get(key) {
    try {
      return store().getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      store().setItem(key, value);
    } catch {
      /* private mode */
    }
  },
};

// ---------- words ----------
const TEXT = {
  ru: {
    title: 'Крестики-нолики на двоих и с ботом — играть бесплатно | GameMetric',
    all: 'Все игры',
    menu: 'Меню',
    sound: 'Звук',
    h1: 'Крестики-нолики',
    lead: 'Три в ряд — и победа. Играй с другом на одном экране или один против бота.',
    'duo.name': 'Вдвоём',
    'duo.desc': 'На одном экране, по очереди',
    'bot.name': 'С ботом',
    'bot.desc': 'Играй один — выбери уровень',
    'lv.easy': 'Лёгкий',
    'lv.mid': 'Средний',
    'lv.hard': 'Непобедимый',
    'mode.duo': 'Вдвоём',
    'mode.bot-easy': 'Бот: лёгкий',
    'mode.bot-mid': 'Бот: средний',
    'mode.bot-hard': 'Бот: непобедимый',
    p1: 'Игрок 1',
    p2: 'Игрок 2',
    you: 'Ты',
    bot: 'Бот',
    draws: 'Ничьи',
    board: 'Игровое поле',
    cell: 'Ряд {r}, столбец {c}',
    'cell.x': 'крестик',
    'cell.o': 'нолик',
    'cell.': 'пусто',
    'turn.x': 'Ход крестиков',
    'turn.o': 'Ход ноликов',
    'turn.you': 'Твой ход',
    'turn.bot': 'Бот думает',
    'win.x': 'Крестики победили!',
    'win.o': 'Нолики победили!',
    'win.you': 'Победа!',
    'win.bot': 'Бот выиграл',
    draw: 'Ничья',
    again: 'Ещё раунд',
    restart: 'Заново',
    reset: 'Сбросить счёт',
    made: 'Сделано в',
  },
  en: {
    title: 'Tic-Tac-Toe for two players or vs a bot — free in your browser | GameMetric',
    all: 'All games',
    menu: 'Menu',
    sound: 'Sound',
    h1: 'Tic-Tac-Toe',
    lead: 'Three in a row wins. Play a friend on one screen or take on the bot.',
    'duo.name': 'Two players',
    'duo.desc': 'One screen, take turns',
    'bot.name': 'Vs bot',
    'bot.desc': 'Play solo — pick a level',
    'lv.easy': 'Easy',
    'lv.mid': 'Medium',
    'lv.hard': 'Unbeatable',
    'mode.duo': 'Two players',
    'mode.bot-easy': 'Bot: easy',
    'mode.bot-mid': 'Bot: medium',
    'mode.bot-hard': 'Bot: unbeatable',
    p1: 'Player 1',
    p2: 'Player 2',
    you: 'You',
    bot: 'Bot',
    draws: 'Draws',
    board: 'Game board',
    cell: 'Row {r}, column {c}',
    'cell.x': 'X',
    'cell.o': 'O',
    'cell.': 'empty',
    'turn.x': 'X to move',
    'turn.o': 'O to move',
    'turn.you': 'Your turn',
    'turn.bot': 'Bot is thinking',
    'win.x': 'X wins!',
    'win.o': 'O wins!',
    'win.you': 'You win!',
    'win.bot': 'Bot wins',
    draw: 'Draw',
    again: 'Play again',
    restart: 'Restart',
    reset: 'Reset score',
    made: 'Made by',
  },
};

// the same choice as on the list of games: the address, then what was picked before, then the browser
const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
// (on a portal the portal knows the player's language best)
let lang = new URLSearchParams(location.search).get('lang') || (PORTAL && portalLang()) || local.get('gm.lang') || (/^(ru|kk|ky|be|uz|tg|uk)\b/i.test(nav) ? 'ru' : 'en');
if (lang !== 'ru' && lang !== 'en') lang = 'en';
const t = (key) => TEXT[lang][key] ?? key;

// ---------- state ----------
const MODES = ['duo', 'bot-easy', 'bot-mid', 'bot-hard'];
const S = {
  view: 'menu',
  mode: 'duo',
  board: Array(9).fill(null),
  turn: 'x',
  starter: 'x', // who moved first in this round; it alternates
  res: null, // { winner, line } once the round is over
  endedAt: 0,
};
// in a game with the bot the player is always x and the bot is o
const isBot = () => S.mode !== 'duo';
const botsTurn = () => isBot() && !S.res && S.turn === 'o';

// the score is kept apart for the two-player game and for each bot
let scores = {};
try {
  scores = JSON.parse(local.get('xo.score')) || {};
} catch {
  scores = {};
}
if (typeof scores !== 'object' || Array.isArray(scores)) scores = {};
function score() {
  const s = scores[S.mode];
  if (!s || ![s.x, s.o, s.d].every((n) => Number.isInteger(n) && n >= 0)) scores[S.mode] = { x: 0, o: 0, d: 0 };
  return scores[S.mode];
}
const saveScores = () => local.set('xo.score', JSON.stringify(scores));

// ---------- sound: a few notes made on the spot, no files ----------
let soundOn = local.get('xo.sound') !== '0';
let portalMuted = false; // the portal's own sound switch, its pause or an ad
let ac = null;
function note(freq, at, dur, type, vol) {
  if (!soundOn || portalMuted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') {
      const waking = ac.resume();
      if (waking && waking.catch) waking.catch(() => {});
    }
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const t0 = ac.currentTime + at;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  } catch {
    /* no sound on this device */
  }
}
const SFX = {
  x: () => note(620, 0, 0.12, 'triangle', 0.16),
  o: () => note(415, 0, 0.15, 'sine', 0.2),
  tap: () => note(880, 0, 0.05, 'sine', 0.07),
  win: () => [523, 659, 784, 1047].forEach((f, k) => note(f, 0.16 + k * 0.09, 0.24, 'triangle', 0.15)),
  lose: () => [392, 330, 262].forEach((f, k) => note(f, 0.16 + k * 0.13, 0.28, 'sine', 0.16)),
  draw: () => [440, 392].forEach((f, k) => note(f, 0.16 + k * 0.14, 0.22, 'sine', 0.14)),
};
function buzz(pattern) {
  if (!soundOn || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* not allowed here */
  }
}

// ---------- the board ----------
const board = $('#board');
const cells = [];
for (let i = 0; i < 9; i++) {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'cell';
  cell.dataset.i = i;
  cell.dataset.m = '';
  board.append(cell);
  cells.push(cell);
}
const strike = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
strike.setAttribute('class', 'strike');
strike.setAttribute('viewBox', '0 0 100 100');
strike.setAttribute('aria-hidden', 'true');
board.append(strike);

const markSvg = (m, cls = '') => `<svg class="m ${m}${cls}" viewBox="0 0 100 100" aria-hidden="true">${MARK[m]}</svg>`;

// The line through the three winning cells. The gap between cells is 3.2% of the board (style.css),
// so the centers of the columns and rows sit at these percents.
const CENTER = [15.6, 50, 84.4];
function drawStrike(line) {
  const id = line ? line.join('') : '';
  if (strike.dataset.line === id) return;
  strike.dataset.line = id;
  if (!line) {
    strike.innerHTML = '';
    return;
  }
  const [a, , c] = line;
  const x1 = CENTER[a % 3];
  const y1 = CENTER[Math.floor(a / 3)];
  const x2 = CENTER[c % 3];
  const y2 = CENTER[Math.floor(c / 3)];
  // it sticks out a little past the outer marks
  const k = 8 / Math.hypot(x2 - x1, y2 - y1);
  const dx = (x2 - x1) * k;
  const dy = (y2 - y1) * k;
  strike.innerHTML = `<path pathLength="1" d="M${x1 - dx} ${y1 - dy}L${x2 + dx} ${y2 + dy}"/>`;
}

function setNumber(el, value, quiet) {
  const text = String(value);
  if (el.textContent === text) return;
  const grew = value > Number(el.textContent);
  el.textContent = text;
  el.classList.remove('bump');
  if (grew && !quiet) {
    void el.offsetWidth; // restart the animation
    el.classList.add('bump');
  }
}

let statusKey = '';
// Everything on the game screen follows the state. `quiet` skips the score animation
// (another mode's score has just been put up, nobody won anything).
function paint(quiet = false) {
  const bot = isBot();
  const over = S.res;

  $('#modeTag').textContent = t('mode.' + S.mode);
  $('#whoX').textContent = t(bot ? 'you' : 'p1');
  $('#whoO').textContent = t(bot ? 'bot' : 'p2');
  const sc = score();
  setNumber($('#numX'), sc.x, quiet);
  setNumber($('#numO'), sc.o, quiet);
  setNumber($('#numD'), sc.d, quiet);
  $('#sideX').classList.toggle('active', over ? over.winner === 'x' : S.turn === 'x');
  $('#sideO').classList.toggle('active', over ? over.winner === 'o' : S.turn === 'o');

  cells.forEach((cell, i) => {
    const m = S.board[i] || '';
    if (cell.dataset.m !== m) {
      cell.dataset.m = m;
      cell.innerHTML = m ? markSvg(m) : '';
    }
    cell.classList.toggle('win', !!(over && over.line && over.line.includes(i)));
    cell.setAttribute('aria-label', t('cell').replace('{r}', Math.floor(i / 3) + 1).replace('{c}', (i % 3) + 1) + ': ' + t('cell.' + m));
  });
  // whose mark a tap would place now: the pointer and the faint mark under the mouse depend on it
  if (!over && !botsTurn()) board.dataset.go = S.turn;
  else delete board.dataset.go;
  if (over) board.dataset.over = over.winner;
  else delete board.dataset.over;
  drawStrike(over && over.line);

  let text;
  let tone = S.turn;
  if (over) {
    tone = over.winner;
    if (tone === 'draw') text = t('draw');
    else text = t(bot ? (tone === 'x' ? 'win.you' : 'win.bot') : 'win.' + tone);
  } else text = t(bot ? (S.turn === 'x' ? 'turn.you' : 'turn.bot') : 'turn.' + S.turn);
  const key = [lang, S.mode, tone, text, !!over].join('|');
  if (key !== statusKey) {
    statusKey = key;
    const status = $('#status');
    status.dataset.tone = tone;
    status.classList.toggle('done', !!over);
    const span = document.createElement('span');
    span.textContent = text;
    status.innerHTML = tone === 'draw' ? '' : markSvg(tone, ' still');
    status.append(span);
    if (botsTurn()) status.insertAdjacentHTML('beforeend', '<span class="wait" aria-hidden="true"><i></i><i></i><i></i></span>');
  }

  const again = $('#again');
  again.textContent = t(over ? 'again' : 'restart');
  again.classList.toggle('primary', !!over);
  again.disabled = !over && S.board.every((m) => !m);
  $('#reset').disabled = !(sc.x || sc.o || sc.d);
  tellPortal();
}

// the portal hears when a round is being played; a round with no marks yet is a fresh one
function tellPortal() {
  loadingDone();
  gameplay(S.view === 'game' && !S.res && !paused, S.board.every((m) => !m));
}

// ---------- a round ----------
let botTimer = 0;
let paused = false; // Playgama paused the game (its menu, an ad)

function clearRound() {
  clearTimeout(botTimer);
  document.querySelectorAll('.confetti').forEach((c) => c.remove());
  S.board.fill(null);
  S.res = null;
  S.turn = S.starter;
}

function think() {
  clearTimeout(botTimer);
  if (S.view !== 'game' || !botsTurn() || paused) return;
  // a short pause, so the bot does not answer before the player's own mark is drawn
  botTimer = setTimeout(() => place(botMove(S.board, 'o', S.mode.slice(4))), 480 + Math.random() * 380);
}

function place(i) {
  if (S.res || !(i >= 0) || S.board[i]) return;
  const m = S.turn;
  S.board[i] = m;
  SFX[m]();
  buzz(8);
  const r = result(S.board);
  if (r) finish(r);
  else S.turn = other(m);
  paint();
  think();
}

function finish(r) {
  S.res = r;
  S.endedAt = performance.now();
  const sc = score();
  if (r.winner === 'draw') sc.d++;
  else sc[r.winner]++;
  saveScores();
  if (r.winner === 'draw') SFX.draw();
  else if (isBot() && r.winner === 'o') {
    SFX.lose();
    buzz([30, 60, 30]);
  } else {
    SFX.win();
    buzz([15, 50, 15, 50, 30]);
    confetti(r.winner);
    if (isBot()) happytime();
  }
}

// after a finished round the other side moves first; a round restarted halfway keeps its first move
function nextRound() {
  // on Playgama a full-screen ad may come between finished rounds
  if (S.res) adBreak('next_round');
  if (S.res) S.starter = other(S.starter);
  clearRound();
  paint();
  think();
}

function confetti(winner) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  document.body.append(canvas);
  const W = innerWidth;
  const H = innerHeight;
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const box = board.getBoundingClientRect();
  const colors = [winner === 'x' ? '#ff5d6c' : '#3fd3e6', '#f4b93a', '#ffffff', winner === 'x' ? '#ff9aa4' : '#9be9f4'];
  const parts = Array.from({ length: 90 }, () => {
    const a = Math.random() * Math.PI * 2;
    const v = 3 + Math.random() * 9;
    return {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 5,
      size: 5 + Math.random() * 6,
      turn: Math.random() * 6,
      spin: (Math.random() - 0.5) * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  });
  const LIFE = 1700;
  const t0 = performance.now();
  let last = t0;
  // the picture stops being drawn when the tab is hidden; the canvas must not stay over the page then
  const gone = setTimeout(() => canvas.remove(), LIFE + 1500);
  function frame(now) {
    const age = (now - t0) / LIFE;
    if (age >= 1 || !canvas.isConnected) {
      clearTimeout(gone);
      canvas.remove();
      return;
    }
    const k = Math.min(3, (now - last) / 16.7);
    last = now;
    g.clearRect(0, 0, W, H);
    g.globalAlpha = 1 - age * age;
    for (const p of parts) {
      p.vy += 0.32 * k;
      p.vx *= 1 - 0.015 * k;
      p.x += p.vx * k;
      p.y += p.vy * k;
      p.turn += p.spin * k;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.turn);
      g.fillStyle = p.color;
      g.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      g.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------- two screens: the menu and the game ----------
function show(view) {
  S.view = view;
  document.body.dataset.view = view;
  const menu = view === 'menu';
  $('#menu').hidden = !menu;
  $('#home').hidden = !menu;
  $('#langs').hidden = !menu;
  $('#foot').hidden = !menu;
  $('#game').hidden = menu;
  $('#back').hidden = menu;
  $('#modeTag').hidden = menu;
  // portals allow no links out
  if (PORTAL) {
    $('#home').hidden = true;
    $('#foot').hidden = true;
  }
  if (menu) clearTimeout(botTimer);
  tellPortal();
}

// True while a screen is being changed with the keyboard (a click made with a key has detail 0).
// Only then the focus is carried over to the new screen: a mouse or a finger does not need
// a focus ring appearing on the board.
let byKeyboard = false;

function start(mode) {
  S.mode = mode;
  S.starter = 'x';
  clearRound();
  show('game');
  paint(true);
  if (byKeyboard) cells[4].focus({ preventScroll: true });
  think();
}

// The game screen is a step in the browser's history (#duo, #bot-easy, #bot-mid, #bot-hard),
// so the phone's Back button returns to the menu instead of leaving the page.
const wanted = () => {
  const mode = location.hash.slice(1);
  return MODES.includes(mode) ? mode : null;
};
function route() {
  const mode = wanted();
  if (mode) {
    if (S.view !== 'game' || S.mode !== mode) start(mode);
  } else if (S.view !== 'menu') {
    show('menu');
    const from = document.querySelector(`[data-start="${S.mode}"]`);
    if (byKeyboard && from) from.focus({ preventScroll: true });
  }
  byKeyboard = false;
}
addEventListener('popstate', route);
addEventListener('hashchange', route);

document.querySelectorAll('[data-start]').forEach((b) =>
  b.addEventListener('click', (e) => {
    SFX.tap();
    byKeyboard = e.detail === 0;
    history.pushState({ xo: 1 }, '', '#' + b.dataset.start);
    route();
  }),
);

$('#back').addEventListener('click', (e) => {
  byKeyboard = e.detail === 0;
  // the menu is one step back when the game was opened from it, otherwise this address becomes the menu
  if (history.state && history.state.xo) history.back();
  else {
    history.replaceState(null, '', location.pathname + location.search);
    route();
  }
});

board.addEventListener('click', (e) => {
  const cell = e.target.closest('.cell');
  if (!cell) return;
  if (S.res) {
    // not at once: the tap may have been meant for the round that has just ended
    if (performance.now() - S.endedAt > 700) nextRound();
    return;
  }
  if (!botsTurn()) place(+cell.dataset.i);
});

// arrow keys walk over the cells
board.addEventListener('keydown', (e) => {
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[e.key];
  const i = cells.indexOf(document.activeElement);
  if (!step || i < 0) return;
  e.preventDefault();
  const j = i + step;
  const sameRow = Math.floor(j / 3) === Math.floor(i / 3);
  if (j >= 0 && j <= 8 && (Math.abs(step) === 3 || sameRow)) cells[j].focus();
});

$('#again').addEventListener('click', () => {
  SFX.tap();
  nextRound();
});

$('#reset').addEventListener('click', () => {
  SFX.tap();
  scores[S.mode] = { x: 0, o: 0, d: 0 };
  saveScores();
  paint(true);
});

function paintSound() {
  $('#sound').setAttribute('aria-pressed', String(soundOn));
}
$('#sound').addEventListener('click', () => {
  soundOn = !soundOn;
  local.set('xo.sound', soundOn ? '1' : '0');
  paintSound();
  SFX.tap();
});

function applyLang() {
  document.documentElement.lang = lang;
  document.title = PORTAL ? PORTAL_NAME : t('title');
  document.querySelectorAll('[data-t]').forEach((n) => (n.textContent = t(n.dataset.t)));
  document.querySelectorAll('[data-t-label]').forEach((n) => n.setAttribute('aria-label', t(n.dataset.tLabel)));
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  // the list of games opens in the same language
  if (!PORTAL) $('#home').href = '../?lang=' + lang;
  paint(true);
}
document.querySelectorAll('[data-lang]').forEach((b) =>
  b.addEventListener('click', () => {
    lang = b.dataset.lang;
    local.set('gm.lang', lang);
    applyLang();
  }),
);

onPortalMute((m) => {
  portalMuted = m;
});
onPortalPause((p) => {
  paused = p;
  if (p) clearTimeout(botTimer);
  else think();
  tellPortal();
});

$('#art').innerHTML = boardArt();
paintSound();
applyLang();
route();
