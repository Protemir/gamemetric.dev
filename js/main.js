import { clamp, store, el, rng, roundRect } from './util.js';
import { t, L, getLang, setLang, hits } from './i18n.js';
import { FIGHTERS, fighterById, CROWD } from './fighters.js';
import { Match, DT, STAGE } from './fight.js';
import { posesFor, copyPose } from './pose.js';
import { AI } from './ai.js';
import { Arena } from './arena.js';
import { drawFighter, drawLasso, drawProjectile, drawEagle, drawFx, drawBubble } from './draw.js';
import { sound, audioInit, setSound, sfx } from './audio.js';
import { music, playMusic, setMusic, pauseMusic, setTempo } from './music.js';
import { pads, bindKeyboard, bindTouch, setInputMode } from './input.js';

const $ = (id) => document.getElementById(id);
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const params = new URLSearchParams(location.search);
const DIFFS = ['easy', 'normal', 'hard'];

const progress = Object.assign({ wins: { easy: 0, normal: 0, hard: 0 }, diff: 'normal', p1: 'batyr', p2: 'random', p2b: 'apa' }, store.get('jekpe.progress', {}));
const saveProgress = () => store.set('jekpe.progress', progress);

const app = {
  mode: 'menu',
  kind: '1p',
  match: null,
  ai: null,
  demoAI: null,
  cam: { x: 0, s: 0 },
  time: 0,
  overTimer: 0,
  hold: [new Set(), new Set()],
  boxes: params.has('boxes'),
  shout: null,
  lag: [100, 100],
};

const arena = new Arena();
const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false });
let W = 1;
let H = 1;
let DPR = 1;

// ---------- matches ----------

function newDemo() {
  const seed = Math.floor(Math.random() * 1e9);
  app.match = new Match({ p1: 'batyr', p2: 'apa', seed });
  const r = rng(seed + 3);
  app.demoAI = [new AI('normal', r), new AI('normal', r)];
  app.overTimer = 0;
}

function resolve(id) {
  return id === 'random' ? FIGHTERS[Math.floor(Math.random() * FIGHTERS.length)].id : id;
}

function startFight() {
  const seed = Math.floor(Math.random() * 1e9);
  const p1 = progress.p1;
  const p2 = resolve(app.kind === '1p' ? progress.p2 : progress.p2b);
  app.mode = 'fight';
  app.match = new Match({ p1, p2, seed, onEvent });
  app.ai = app.kind === '1p' ? new AI(progress.diff, rng(seed + 1)) : null;
  app.overTimer = 0;
  app.lag = [100, 100];
  app.shout = null;
  app.cam.s = 0;
  setInputMode(app.kind);
  pads.forEach((p) => p.clear());
  ui.replaceChildren();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  showHud(true);
  hudNames();
  if (audioUnlocked) playMusic('fight');
}

function playerName(i) {
  const f = app.match.f[i];
  if (app.kind === '2p') return t(i ? 'player2' : 'player1');
  return L(f.def.name);
}

function inputFor(i) {
  const m = app.match;
  if (app.mode === 'menu' || app.mode === 'og') return app.demoAI ? app.demoAI[i].input(m.f[i], m.f[1 - i], m) : {};
  if (app.kind === '1p' && i === 1) return app.ai.input(m.f[1], m.f[0], m);
  const inp = pads[i].poll();
  for (const b of app.hold[i]) inp[b] = true;
  return inp;
}

function stepOnce() {
  const m = app.match;
  m.step([inputFor(0), inputFor(1)]);
  app.time++;
  if (m.phase === 'finisher' && m.fin && m.fin.kind === 'dance') setTempo(0.8 + m.fin.v.dance * 0.2);
  if (m.phase === 'over') {
    app.overTimer++;
    if (app.mode === 'fight' && app.overTimer === 70) showResult();
    if (app.mode === 'menu' && app.overTimer === 60) newDemo();
  }
  if (app.shout && --app.shout.t <= 0) app.shout = null;
}

// ---------- events from the fight: sound, banners, combos ----------

function onEvent(type, d) {
  switch (type) {
    case 'round':
      sfx.gong();
      banner(d.final ? 'СОҢҒЫ РАУНД' : `${d.n}-РАУНД`, d.final ? t('finalRound') : t('round', { n: d.n }), 1.3);
      if (audioUnlocked && music.id !== 'fight') playMusic('fight');
      break;
    case 'fight':
      sfx.fight();
      banner('КЕТТІК!', t('fightSub'), 0.9);
      break;
    case 'whoosh': sfx.whoosh(d.heavy); break;
    case 'hit':
      sfx.hit(d.d.sfx);
      if (d.combo >= 2) showCombo(d.att.idx, d.combo);
      if (d.heavy || d.combo >= 4) {
        sfx.crowd(false);
        if (d.combo >= 4 || Math.random() < 0.3) shout();
      }
      break;
    case 'block': sfx.block(d.f.def.id === 'batyr'); break;
    case 'jump': sfx.jump(); break;
    case 'land': sfx.land(); break;
    case 'thud': sfx.thud(d.big); break;
    case 'lasso': sfx.lasso(); break;
    case 'catch': sfx.snap(); break;
    case 'toss': sfx.toss(); break;
    case 'splat': sfx.splat(); break;
    case 'grab': sfx.grab(); break;
    case 'throw': sfx.whoosh(true); break;
    case 'shake': sfx.shake(); break;
    case 'nope': sfx.nope(); break;
    case 'ko':
      sfx.ko();
      sfx.crowd(true);
      shout();
      if (!d.stand) banner('НОКАУТ!', t('koSub'), 1.6, true);
      break;
    case 'finishHim':
      banner('АЯҚТА!', t('finishSub'), 2.6, true);
      break;
    case 'whistle': sfx.whistle(); break;
    case 'screech': sfx.screech(); break;
    case 'zhorga':
      if (audioUnlocked) playMusic('zhorga');
      break;
    case 'ujat':
      sfx.ujat();
      shout();
      banner('ҰЯТ!', t('ujatSub', { name: L(d.name) }), 2.2, true);
      break;
    case 'roundWin': {
      sfx.win();
      const flawless = d.f.hp >= 100;
      banner(flawless ? 'ТАЗА ЖЕҢІС!' : `${d.f.def.kk.toUpperCase()} ЖЕҢДІ!`, flawless ? t('flawlessSub') : t('roundWin', { name: playerName(d.f.idx) }), 1.9);
      if (music.id === 'zhorga') setTempo(1);
      break;
    }
    case 'timeup': banner('УАҚЫТ!', t('timeSub'), 1.4); break;
    case 'draw': banner('ТЕҢ!', t('drawSub'), 1.6); break;
    default: break;
  }
}

function shout() {
  const p = arena.crowd[Math.floor(Math.random() * arena.crowd.length)];
  const cam = app.cam;
  const halfW = W / (2 * cam.s || 1);
  // pick someone who is on screen
  const seen = arena.crowd.filter((c) => Math.abs(c.x - cam.x) < halfW - 60);
  const who = seen.length ? seen[Math.floor(Math.random() * seen.length)] : p;
  app.shout = { x: who.x, text: CROWD[Math.floor(Math.random() * CROWD.length)], t: 80 };
}

// ---------- HUD ----------

const hudEl = $('hud');
const sides = [0, 1].map((i) => {
  const root = $('side' + i);
  return { root, nm: root.querySelector('.nm'), wins: root.querySelectorAll('.wins i'), bar: root.querySelector('.bar'), hp: root.querySelector('.hp'), lag: root.querySelector('.lag'), sp: root.querySelector('.sp'), spi: root.querySelector('.sp i') };
});
const timerEl = $('timer');
const touchEl = $('touch');
const specialBtn = touchEl.querySelector('.special');
const comboEls = [$('combo0'), $('combo1')];
const comboTimers = [0, 0];
const hudCache = {};

function showHud(on) {
  hudEl.hidden = !on;
  touchEl.hidden = !(on && isTouch);
  for (const k of Object.keys(hudCache)) delete hudCache[k];
  if (!on) comboEls.forEach((e) => e.classList.remove('show'));
}

function hudNames() {
  app.match.f.forEach((f, i) => {
    sides[i].nm.textContent = app.kind === '2p' ? `${L(f.def.name)} · ${i + 1}` : L(f.def.name);
  });
}

function setCached(key, fn, value) {
  if (hudCache[key] === value) return;
  hudCache[key] = value;
  fn(value);
}

function updateHud(dt) {
  if (hudEl.hidden) return;
  const m = app.match;
  m.f.forEach((f, i) => {
    const s = sides[i];
    app.lag[i] = f.hp >= app.lag[i] ? f.hp : Math.max(f.hp, app.lag[i] - dt * 40);
    setCached('hp' + i, (v) => { s.hp.style.transform = `scaleX(${v / 100})`; }, f.hp);
    setCached('lag' + i, (v) => { s.lag.style.transform = `scaleX(${v / 100})`; }, Math.round(app.lag[i] * 2) / 2);
    setCached('low' + i, (v) => s.bar.classList.toggle('low', v), f.hp < 30);
    setCached('wins' + i, (v) => s.wins.forEach((w, k) => w.classList.toggle('on', k < v)), m.wins[i]);
    const ready = 1 - f.cool / f.def.spec.cd;
    setCached('sp' + i, (v) => { s.spi.style.transform = `scaleX(${v})`; }, Math.round(ready * 50) / 50);
    setCached('spr' + i, (v) => s.sp.classList.toggle('ready', v), f.cool <= 0);
  });
  const sec = Math.ceil(m.time / 60);
  setCached('time', (v) => { timerEl.textContent = String(v); }, sec);
  setCached('tlow', (v) => timerEl.classList.toggle('low', v), sec <= 10);
  if (isTouch) setCached('spBtn', (v) => specialBtn.classList.toggle('cool', v), m.f[0].cool > 0);
}

function showCombo(i, n) {
  const e = comboEls[i];
  e.textContent = hits(n);
  e.classList.add('show');
  clearTimeout(comboTimers[i]);
  comboTimers[i] = setTimeout(() => e.classList.remove('show'), 1100);
}

const bannerEl = $('banner');
function banner(big, small, dur = 1.6, red = false) {
  bannerEl.replaceChildren(el('b', '', big));
  if (small) bannerEl.append(el('span', '', small));
  bannerEl.style.setProperty('--dur', dur + 's');
  bannerEl.classList.toggle('red', red);
  bannerEl.classList.remove('show');
  void bannerEl.offsetWidth;
  bannerEl.classList.add('show');
}

// ---------- screens ----------

const ui = $('ui');

function panel(cls, ...children) {
  const p = el('section', 'panel ' + (cls || ''));
  p.append(...children.filter(Boolean));
  ui.replaceChildren(p);
  const first = p.querySelector('.btn.primary, .menu-item:not([disabled])');
  if (first && !isTouch) setTimeout(() => first.focus({ preventScroll: true }), 30);
  p.scrollTop = 0;
  return p;
}
function btn(label, cls, onClick) {
  const b = el('button', 'btn ' + (cls || ''), label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
function head(title, onBack) {
  const h = el('div', 'panel-head');
  const back = el('button', 'back', '←');
  back.type = 'button';
  back.setAttribute('aria-label', t('back'));
  back.addEventListener('click', onBack);
  h.append(back, el('h2', '', title));
  return h;
}
function langs(after) {
  const box = el('div', 'langs');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Language');
  for (const code of ['ru', 'en']) {
    const b = el('button', '', code.toUpperCase());
    b.type = 'button';
    b.setAttribute('aria-pressed', String(getLang() === code));
    b.addEventListener('click', () => {
      setLang(code);
      applyLang();
      after();
    });
    box.append(b);
  }
  return box;
}
function link(text, href) {
  const a = el('a', 'more', text);
  a.href = href;
  return a;
}

function toMenu() {
  app.mode = 'menu';
  showHud(false);
  newDemo();
  if (audioUnlocked) playMusic('menu');
  screenMain();
}

function screenMain() {
  const top = el('div', 'panel-top');
  const mus = el('button', 'chip-btn', '♪ ' + (music.on ? t('musicOn') : t('musicOff')));
  mus.type = 'button';
  mus.setAttribute('aria-pressed', String(music.on));
  mus.addEventListener('click', () => {
    unlockAudio();
    toggleMusic();
    screenMain();
  });
  const right = el('div', 'top-right');
  right.append(mus, langs(screenMain));
  top.append(el('span', 'mark'), right);

  const menu = el('div', 'menu');
  const item = (title, sub, primary, onClick, disabled) => {
    const b = el('button', 'menu-item' + (primary ? ' primary' : ''));
    b.type = 'button';
    b.append(el('b', '', title), el('span', '', sub));
    if (disabled) b.disabled = true;
    else b.addEventListener('click', onClick);
    return b;
  };
  menu.append(
    item(t('vsAI'), t('vsAISub', { d: t(progress.diff) }), true, () => { app.kind = '1p'; screenSelect(); }),
    item(t('twoP'), isTouch ? t('twoPTouch') : t('twoPSub'), false, () => { app.kind = '2p'; screenSelect(); }, isTouch),
    item(t('howTo'), t('howToSub'), false, () => screenHowTo()),
  );
  const h1 = el('h1', '', 'Жекпе-жек');
  const about = el('div', 'about');
  const made = el('p', '', t('madeBy') + ' ');
  made.append(link('temirlab.com', 'https://temirlab.com/'));
  about.append(el('p', '', t('aboutFun')), made);
  const links = el('div', 'links');
  links.append(link(t('testLink'), 'test/'), link(t('raceLink'), 'https://asemface.com/'));
  panel('main', top, h1, el('p', 'tag', t('tag')), menu, el('p', 'keys', isTouch ? t('keysTouch') : t('keys1')), links, about);
}

function portrait(id, pal, face) {
  const cv = el('canvas');
  cv.width = 220;
  cv.height = 230;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(110, 150, 10, 110, 150, 150);
  g.addColorStop(0, '#5b3550');
  g.addColorStop(1, '#22152e');
  c.fillStyle = g;
  c.fillRect(0, 0, 220, 230);
  const def = fighterById(id);
  const fake = { def, pal: def.palettes[pal], pose: copyPose(posesFor(id).stance), state: 'idle', face, x: 0, y: 0, t: 0, flash: 0, hp: 100, bubble: null, dance: 0, move: null };
  c.save();
  c.translate(110 - face * 6, 214);
  c.scale(1.05, 1.05);
  drawFighter(c, fake, {});
  c.restore();
  return cv;
}

function screenSelect() {
  const two = app.kind === '2p';
  const col = (label, key, face, withRandom) => {
    const box = el('div', 'pick-col');
    box.append(el('b', '', label));
    const cards = el('div', 'fcards');
    for (const f of FIGHTERS) {
      const card = el('button', 'fcard' + (progress[key] === f.id ? ' on' : ''));
      card.type = 'button';
      card.setAttribute('aria-pressed', String(progress[key] === f.id));
      const pal = key !== 'p1' && progress.p1 === f.id ? 1 : 0;
      card.append(portrait(f.id, pal, face), el('span', '', L(f.name)));
      card.addEventListener('click', () => {
        progress[key] = f.id;
        saveProgress();
        screenSelect();
      });
      cards.append(card);
    }
    if (withRandom) {
      const card = el('button', 'fcard rand' + (progress[key] === 'random' ? ' on' : ''));
      card.type = 'button';
      card.append(el('span', '', '?'), el('small', '', t('random')));
      card.addEventListener('click', () => {
        progress[key] = 'random';
        saveProgress();
        screenSelect();
      });
      cards.append(card);
    }
    box.append(cards);
    return box;
  };
  const pick = el('div', 'pick');
  pick.append(col(two ? t('player1') : t('you'), 'p1', 1, false), col(two ? t('player2') : t('rival'), two ? 'p2b' : 'p2', -1, !two));

  let diff = null;
  if (!two) {
    diff = el('div', 'pick-col');
    diff.append(el('b', '', t('difficulty')));
    const chips = el('div', 'chips');
    for (const d of DIFFS) {
      const c = el('button', 'chip' + (progress.diff === d ? ' on' : ''), t(d));
      c.type = 'button';
      c.setAttribute('aria-pressed', String(progress.diff === d));
      c.addEventListener('click', () => {
        progress.diff = d;
        saveProgress();
        screenSelect();
      });
      chips.append(c);
    }
    diff.append(chips);
  }
  const f = fighterById(progress.p1);
  const bio = el('div', 'bio');
  const nameLine = el('p');
  nameLine.append(el('b', '', L(f.name) + '. '), document.createTextNode(L(f.bio)));
  const sp = el('p');
  sp.append(el('b', '', t('special') + ': '), document.createTextNode(L(f.special)));
  const fin = el('p');
  fin.append(el('b', '', t('finisher') + ': '), document.createTextNode(`${L(f.finisherName)}, ${L(f.finisherText)}`));
  bio.append(nameLine, sp, fin);
  const keys = el('p', 'keys', isTouch ? t('keysTouch') : two ? `${t('keysP1')} ${t('keysP2')}` : t('keys1'));
  panel('wide', head(t('pick'), () => screenMain()), pick, diff, bio, keys, btn(t('toFight'), 'primary', startFight));
}

function screenHowTo() {
  const moves = el('dl', 'moves');
  for (const [k, v] of t('moves')) moves.append(el('dt', '', k), el('dd', '', v));
  const fighters = el('dl', 'moves');
  for (const f of FIGHTERS) {
    fighters.append(el('dt', '', L(f.name)), el('dd', '', `${L(f.special)}. ${t('finisher')}: ${L(f.finisherName)}, ${L(f.finisherText)}.`));
  }
  const keys = el('p', 'keys', isTouch ? t('keysTouch') : `${t('keys1')} ${t('keysP1')} ${t('keysP2')}`);
  panel('wide', head(t('howTo'), () => screenMain()), keys, el('h3', '', t('movesTitle')), moves, el('h3', '', t('finishTitle')), el('p', 'tag', t('finishText')), fighters, el('p', 'keys', t('kkNote')));
}

function pause() {
  if (app.mode !== 'fight') return;
  app.mode = 'paused';
  pads.forEach((p) => p.clear());
  pauseMusic(true);
  touchEl.hidden = true;
  panel('', el('h2', '', t('pause')), el('p', 'keys', isTouch ? t('keysTouch') : app.kind === '2p' ? `${t('keysP1')} ${t('keysP2')}` : t('keys1')), (() => {
    const row = el('div', 'row');
    row.append(btn(t('resume'), 'primary', resume), btn(t('restart'), '', startFight), btn(t('menu'), '', toMenu));
    return row;
  })());
}

function resume() {
  if (app.mode !== 'paused') return;
  app.mode = 'fight';
  ui.replaceChildren();
  touchEl.hidden = !isTouch;
  pauseMusic(false);
  last = performance.now();
}

function showResult() {
  const m = app.match;
  const r = m.result;
  const w = r.winner;
  app.mode = 'result';
  showHud(false);
  if (audioUnlocked) playMusic('menu');
  let sub;
  if (app.kind === '1p') {
    sub = !w ? t('draw') : w.idx === 0 ? t('youWin') : t('youLose');
    if (w && w.idx === 0) {
      progress.wins[progress.diff] = (progress.wins[progress.diff] || 0) + 1;
      saveProgress();
    }
  } else {
    sub = w ? t('wins', { name: playerName(w.idx) }) : t('draw');
  }
  const title = el('h2', 'result-title', w ? `${w.def.kk.toUpperCase()} ЖЕҢДІ!` : 'ТЕҢ!');
  const stats = el('div', 'stats');
  stats.append(el('span'), el('b', 'head', playerName(0)), el('b', 'head', playerName(1)));
  const row = (label, a, b) => stats.append(el('span', '', label), el('b', '', String(a)), el('b', '', String(b)));
  row(t('statRounds'), r.wins[0], r.wins[1]);
  row(t('statHits'), m.f[0].stats.hits, m.f[1].stats.hits);
  row(t('statCombo'), m.f[0].stats.maxCombo, m.f[1].stats.maxCombo);
  const note = el('p', 'note', r.flawless ? t('flawless') : '');
  const record = app.kind === '1p' ? el('p', 'keys', t('record', { e: progress.wins.easy || 0, n: progress.wins.normal || 0, h: progress.wins.hard || 0 })) : null;
  const buttons = el('div', 'row');
  buttons.append(btn(t('rematch'), 'primary', startFight), btn(t('otherFighter'), '', screenSelect), btn(t('menu'), '', toMenu));
  const shareNote = el('p', 'note', '');
  const shareBtn = w && (app.kind === '2p' || w.idx === 0) ? btn(t('share'), '', () => share(w, shareNote)) : null;
  panel('', title, el('p', 'tag', sub), stats, note, record, buttons, shareBtn, shareNote);
}

async function share(w, note) {
  const url = 'https://gamemetric.dev/';
  const text = t('shareText', { name: L(w.def.name) });
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Жекпе-жек', text, url });
      return;
    }
    await navigator.clipboard.writeText(text + url);
    note.textContent = t('copied');
  } catch {
    /* the user closed the share sheet */
  }
}

// ---------- audio, keys, language ----------

let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audioInit();
  playMusic(app.mode === 'fight' ? 'fight' : 'menu');
}
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

function toggleSound() {
  setSound(!sound.on);
  $('muteBtn').textContent = sound.on ? t('soundOn') : t('soundOff');
  $('muteBtn').setAttribute('aria-pressed', String(sound.on));
}
function toggleMusic() {
  setMusic(!music.on);
  if (music.on) playMusic(app.mode === 'fight' ? 'fight' : 'menu');
  $('musicBtn').setAttribute('aria-pressed', String(music.on));
}
$('musicBtn').addEventListener('click', toggleMusic);
$('muteBtn').addEventListener('click', toggleSound);
$('pauseBtn').addEventListener('click', () => (app.mode === 'paused' ? resume() : pause()));

bindKeyboard(() => app.mode === 'fight');
bindTouch(touchEl);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || (e.code === 'KeyP' && !e.repeat)) {
    if (app.mode === 'fight') pause();
    else if (app.mode === 'paused') resume();
  } else if (e.code === 'KeyM' && app.mode !== 'menu') {
    toggleSound();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    pauseMusic(true);
  } else if (app.mode !== 'paused') {
    pauseMusic(false);
  }
});
window.addEventListener('blur', pause);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function applyLang() {
  document.documentElement.lang = getLang();
  document.title = t('title');
  $('muteBtn').textContent = sound.on ? t('soundOn') : t('soundOff');
  $('muteBtn').setAttribute('aria-pressed', String(sound.on));
  $('musicBtn').setAttribute('aria-pressed', String(music.on));
  $('pauseBtn').setAttribute('aria-label', t('pause'));
  $('musicBtn').setAttribute('aria-label', t('musicOn'));
  for (const b of touchEl.querySelectorAll('[data-btn]')) b.textContent = t(b.dataset.btn === 'special' ? 'superBtn' : b.dataset.btn);
  if (app.match && !hudEl.hidden) hudNames();
}

// ---------- rendering ----------

function resize() {
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  if (cssW * cssH * DPR * DPR > 2600000) DPR = Math.sqrt(2600000 / (cssW * cssH));
  W = Math.max(1, Math.round(cssW * DPR));
  H = Math.max(1, Math.round(cssH * DPR));
  canvas.width = W;
  canvas.height = H;
  app.cam.s = 0;
}
window.addEventListener('resize', resize);

function render(dt) {
  const m = app.match;
  const [a, b] = m.f;
  const portraitMode = H > W * 1.05;
  const touchFight = isTouch && (app.mode === 'fight' || app.mode === 'paused');
  // on a phone held sideways the buttons sit in the corners, so the floor can go lower
  const ground = touchFight ? H * (portraitMode ? 0.6 : 0.8) : H * (portraitMode ? 0.72 : 0.86);
  const top = (app.mode === 'menu' ? 40 : touchFight && !portraitMode ? 60 : 84) * DPR;

  // camera: keep both fighters in view, zoom in when they are close
  const live = [a, b].filter((f) => f.state !== 'carried');
  const cx = live.reduce((s, f) => s + f.x, 0) / live.length;
  const spread = live.length === 2 ? Math.abs(a.x - b.x) : 0;
  const viewW = Math.max(portraitMode ? 400 : 640, spread + (portraitMode ? 210 : 380));
  const s = Math.max(0.05, Math.min(W / viewW, (ground - top) / 380));
  const cam = app.cam;
  if (app.mode === 'og') {
    // a close-up with the fighters on the right, the title on the left
    cam.s = H / +(params.get('zoom') || 400);
    cam.x = +(params.get('cx') || -60);
  } else if (!cam.s) {
    cam.s = s;
    cam.x = cx;
  } else {
    const k = Math.min(1, dt * 5);
    cam.s += (s - cam.s) * Math.min(1, dt * 3);
    cam.x += (cx - cam.x) * k;
  }
  const halfW = W / (2 * cam.s);
  const lim = STAGE + 90 - halfW;
  cam.x = lim > 0 ? clamp(cam.x, -lim, lim) : 0;

  const shake = m.shake * cam.s * 0.9;
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;
  ctx.save();
  ctx.fillStyle = '#170f22';
  ctx.fillRect(0, 0, W, H);
  ctx.translate(sx, sy);
  arena.draw(ctx, { W, H, s: cam.s, camX: cam.x, ground, t: app.time }, m);

  ctx.translate(W / 2 - cam.x * cam.s, ground);
  ctx.scale(cam.s, cam.s);
  // the fighter who is attacking is drawn in front
  const order = ['attack', 'throwing', 'special'].includes(a.state) && !['attack', 'throwing', 'special'].includes(b.state) ? [b, a] : [a, b];
  for (const f of order) drawFighter(ctx, f, { time: app.time });
  for (const f of order) drawLasso(ctx, f);
  for (const p of m.proj) drawProjectile(ctx, p);
  drawEagle(ctx, m.eagle);
  for (const e of m.fx) drawFx(ctx, e);
  const scale = cam.s / DPR;
  const bounds = [cam.x - W / (2 * cam.s) + 8 / scale, cam.x + W / (2 * cam.s) - 8 / scale];
  // two bubbles close together: the second one goes a line higher
  const stack = a.bubble && b.bubble && Math.abs(a.x - b.x) * scale < 220;
  drawBubble(ctx, a, scale, bounds, 0);
  drawBubble(ctx, b, scale, bounds, stack ? 40 : 0);
  if (app.shout) drawShout(ctx, app.shout, scale);
  if (app.boxes) drawBoxes(ctx, m);
  ctx.restore();

  if (m.flash > 0.02) {
    ctx.fillStyle = `rgba(255,255,255,${m.flash * 0.45})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawShout(c, sh, scale) {
  const k = 1 / clamp(scale, 0.6, 1.4);
  c.save();
  c.translate(sh.x, -120 - (80 - sh.t) * 0.2);
  c.scale(k * 0.85, k * 0.85);
  c.globalAlpha = Math.min(1, sh.t / 12);
  c.font = '800 16px "Segoe UI", system-ui, sans-serif';
  const w = c.measureText(sh.text).width + 20;
  c.fillStyle = '#ffe7a8';
  c.strokeStyle = '#2a1a10';
  c.lineWidth = 2;
  roundRect(c, -w / 2, -28, w, 28, 12);
  c.fill();
  c.stroke();
  c.fillStyle = '#1a120c';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(sh.text, 0, -13);
  c.restore();
  c.globalAlpha = 1;
}

function drawBoxes(c, m) {
  c.lineWidth = 2;
  for (const f of m.f) {
    const h = f.hurtbox();
    if (h) {
      c.strokeStyle = 'rgba(80,200,255,0.9)';
      c.strokeRect(h[0], -h[3], h[2] - h[0], h[3] - h[1]);
    }
    const x = f.hitbox();
    if (x) {
      c.strokeStyle = 'rgba(255,60,60,0.95)';
      c.strokeRect(x[0], -x[3], x[2] - x[0], x[3] - x[1]);
    }
  }
}

// ---------- loop ----------

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (app.mode === 'fight' || app.mode === 'menu' || app.mode === 'result') {
    acc += dt * app.match.timeScale;
    let n = 0;
    while (acc >= DT && n < 8) {
      stepOnce();
      acc -= DT;
      n++;
    }
    if (n >= 8) acc = 0;
  }
  render(app.mode === 'paused' ? 0 : dt);
  updateHud(dt);
  requestAnimationFrame(frame);
}

resize();
applyLang();
toMenu();
requestAnimationFrame(frame);

// ?og renders a still frame for the link preview (og.png)
if (params.has('og')) {
  document.body.classList.add('og');
  app.mode = 'og';
  ui.replaceChildren();
  const m = new Match({ p1: 'batyr', p2: 'apa', seed: 5 });
  app.match = m;
  app.demoAI = null;
  for (let k = 0; k < 80; k++) m.step([{}, {}]);
  const [a, b] = m.f;
  a.x = 70;
  b.x = 150;
  for (let k = 0; k < 20; k++) m.step([{}, {}]);
  b.startMove('upper');
  for (let k = 0; k < +(params.get('f') || 14); k++) m.step([{}, {}]);
  a.bubble = { text: 'Ойбай!', t: 60 };
  b.bubble = { text: 'Ұят қой!', t: 60 };
  m.fx = m.fx.filter((e) => e.k !== 'spark');
  for (const e of m.fx) if (e.k === 'word') {
    e.x = b.x;
    e.y = 300;
    e.t = 12;
  }
  app.cam.s = 0;
  const title = el('div', 'og-title');
  title.append(el('b', '', 'Жекпе-жек'), el('span', '', getLang() === 'en' ? 'Batyr vs Apa' : 'Батыр против Апы'));
  document.body.append(title);
}

if (params.has('debug')) {
  window.__fight = {
    app,
    progress,
    get m() { return app.match; },
    step(n = 1) {
      for (let k = 0; k < n; k++) stepOnce();
      render(DT);
      updateHud(DT * n);
      return this.state();
    },
    press(i, b) {
      pads[i].down(b);
      pads[i].up(b);
    },
    hold(i, b, on = true) {
      if (on) app.hold[i].add(b);
      else app.hold[i].delete(b);
    },
    start(opts = {}) {
      app.kind = opts.kind || '1p';
      if (opts.p1) progress.p1 = opts.p1;
      if (opts.p2) progress[app.kind === '1p' ? 'p2' : 'p2b'] = opts.p2;
      if (opts.diff) progress.diff = opts.diff;
      startFight();
      return this.state();
    },
    state() {
      const m = app.match;
      return {
        mode: app.mode, phase: m.phase, round: m.round, wins: m.wins, time: Math.ceil(m.time / 60),
        f: m.f.map((f) => ({ id: f.def.id, st: f.state, x: Math.round(f.x), y: Math.round(f.y), hp: f.hp, cool: f.cool })),
      };
    },
    menu: toMenu,
    pause,
    resume,
    render: () => render(DT),
    screens: { screenMain, screenSelect, screenHowTo, showResult },
    boxes(on = true) { app.boxes = on; },
    sfx,
  };
}
