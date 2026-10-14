import { clamp, store, el, rng, roundRect } from './util.js';
import { t, L, getLang, setLang, hits } from './i18n.js';
import { FIGHTERS, PLAYABLE, fighterById, CROWD } from './fighters.js';
import { Match, DT, STAGE, NO_INPUT } from './fight.js';
import { posesFor, copyPose } from './pose.js';
import { AI } from './ai.js';
import { Arena, ARENAS } from './arena.js';
import { drawFighter, drawLasso, drawProjectile, drawEagle, drawCar, drawFx, drawBubble, star } from './draw.js';
import { sound, audioInit, setSound, sfx } from './audio.js';
import { music, playMusic, setMusic, pauseMusic, setTempo } from './music.js';
import { pads, bindKeyboard, bindTouch, setInputMode, pollGamepads } from './input.js';
import { voice, say, setVoice, hasVoice } from './voice.js';
import { makeLadder, scoreFor, UNLOCKS } from './arcade.js';
import { Net, netSupported, encode, decode, fingerprint } from './online.js';
import { goldPalette } from './fighters.js';

const $ = (id) => document.getElementById(id);
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const params = new URLSearchParams(location.search);
const DIFFS = ['easy', 'normal', 'hard'];
const DUMMIES = ['stand', 'block', 'crouch', 'jump', 'cpu'];
const KK_NUM = ['', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты'];

const progress = Object.assign(
  { wins: { easy: 0, normal: 0, hard: 0 }, diff: 'normal', p1: 'batyr', p2: 'random', p2b: 'apa', p2t: 'apa', arena: 'random', stars: 0, seen: {}, clears: {}, records: [], unlockSeen: [], bighead: false, gold: false, turbo: false, dummy: 'stand', name: '' },
  store.get('jekpe.progress', {}),
);
const saveProgress = () => store.set('jekpe.progress', progress);

const app = {
  mode: 'menu',
  kind: '1p',
  match: null,
  ai: null,
  demoAI: null,
  arena: new Arena('aul'),
  cam: { x: 0, s: 0 },
  time: 0,
  overTimer: 0,
  hold: [new Set(), new Set()],
  boxes: params.has('boxes'),
  shout: null,
  lag: [100, 100],
  slot: 'p1',
  rec: null,
  replay: null,
  arcade: null,
  net: null,
  netMenu: false,
  pads: 0,
};

const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false });
let W = 1;
let H = 1;
let DPR = 1;

// ---------- unlocks and stars ----------

function isOpen(id) {
  if (id === 'dau') return Object.keys(progress.clears).length > 0;
  const u = UNLOCKS.find((x) => x.id === id);
  return !!u && progress.stars >= u.stars;
}

function addStars(n) {
  if (n <= 0) return;
  progress.stars += n;
  toast(t('starsGot', { n }));
  checkUnlocks();
  saveProgress();
}

function checkUnlocks() {
  for (const u of UNLOCKS) {
    if (isOpen(u.id) && !progress.unlockSeen.includes(u.id)) {
      progress.unlockSeen.push(u.id);
      toast(t('unlocked', { name: L(u.name) }), true);
    }
  }
  saveProgress();
}

const roster = () => FIGHTERS.filter((f) => !f.boss || isOpen('dau'));

// ---------- matches ----------

function newDemo() {
  const seed = Math.floor(Math.random() * 1e9);
  const r = rng(seed + 3);
  const ids = PLAYABLE.map((f) => f.id);
  const p1 = ids[Math.floor(r() * ids.length)];
  let p2 = ids[Math.floor(r() * ids.length)];
  if (p2 === p1) p2 = ids[(ids.indexOf(p1) + 1) % ids.length];
  const arena = ARENAS[Math.floor(r() * ARENAS.length)].id;
  setArena(arena);
  app.match = new Match({ p1, p2, seed, arena });
  app.demoAI = [new AI('normal', r), new AI('normal', r)];
  app.isDemo = true;
  app.overTimer = 0;
}

function setArena(id) {
  if (app.arena.id !== id) app.arena = new Arena(id);
}

function resolve(id, avoid) {
  if (id !== 'random') return id;
  const list = PLAYABLE.filter((f) => f.id !== avoid);
  return list[Math.floor(Math.random() * list.length)].id;
}

function pickArena() {
  return progress.arena === 'random' ? ARENAS[Math.floor(Math.random() * ARENAS.length)].id : progress.arena;
}

// one place that starts every kind of fight
function startMatch(o) {
  const seed = o.seed ?? Math.floor(Math.random() * 1e9);
  const opts = { p1: o.p1, p2: o.p2, seed, arena: o.arena, gold: o.gold || [false, false], bossFight: !!o.bossFight, training: !!o.training, noHazards: !!o.noHazards };
  setArena(opts.arena);
  app.mode = 'fight';
  app.match = new Match({ ...opts, onEvent });
  app.isDemo = false;
  app.rec = { opts, inputs: [], rounds: [] };
  app.overTimer = 0;
  app.lag = [app.match.f[0].hpMax, app.match.f[1].hpMax];
  app.shout = null;
  app.cam.s = 0;
  app.replay = null;
  app.netMenu = false;
  app.bighead = o.bighead ?? (isOpen('bighead') && progress.bighead);
  app.turbo = o.turbo ?? (isOpen('turbo') && progress.turbo);
  if (app.kind === 'train') app.boxes = true;
  setInputMode(app.kind === '2p' ? '2p' : '1p');
  pads.forEach((p) => p.clear());
  ui.replaceChildren();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  showHud(true);
  hudNames();
  badge('');
  if (audioUnlocked) playMusic(songFor());
}

function songFor() {
  const m = app.match;
  if (m && m.opts.bossFight) return 'boss';
  return (m && m.arena) || 'fight';
}

function startFight() {
  const gold = isOpen('gold') && progress.gold;
  if (app.kind === '1p') {
    const p2 = resolve(progress.p2, progress.p1);
    app.ai = new AI(progress.diff, rng(Math.floor(Math.random() * 1e9)));
    startMatch({ p1: progress.p1, p2, arena: pickArena(), gold: [gold, false] });
  } else if (app.kind === '2p') {
    app.ai = null;
    startMatch({ p1: progress.p1, p2: progress.p2b, arena: pickArena(), gold: [gold, gold] });
  } else if (app.kind === 'train') {
    app.ai = progress.dummy === 'cpu' ? new AI('normal', rng(5)) : null;
    startMatch({ p1: progress.p1, p2: progress.p2t, arena: pickArena(), training: true, gold: [gold, false] });
  } else if (app.kind === 'arcade') {
    const A = app.arcade;
    const step = A.ladder[A.step];
    app.ai = new AI(step.diff, rng(Math.floor(Math.random() * 1e9)));
    startMatch({ p1: A.player, p2: step.id, arena: step.arena, bossFight: step.boss, gold: [gold, false] });
  }
}

function playerName(i) {
  const f = app.match.f[i];
  if (app.kind === '2p') return t(i ? 'player2' : 'player1');
  if (app.kind === 'net') return i === app.net.local ? t('you') : t('friend');
  return L(f.def.name);
}

const localIdx = () => (app.kind === 'net' && app.net ? app.net.local : 0);

function dummyInput(m) {
  const me = m.f[1];
  const d = progress.dummy;
  if (d === 'cpu') return app.ai.input(me, m.f[0], m);
  if (d === 'block') return { ...NO_INPUT, block: true };
  if (d === 'crouch') return { ...NO_INPUT, down: true };
  if (d === 'jump') return { ...NO_INPUT, up: m.frame % 70 < 5 };
  return NO_INPUT;
}

function inputFor(i) {
  const m = app.match;
  if (app.mode === 'menu' || app.mode === 'og' || app.mode === 'story') return app.demoAI ? app.demoAI[i].input(m.f[i], m.f[1 - i], m) : NO_INPUT;
  if (app.kind === 'train' && i === 1) return dummyInput(m);
  if ((app.kind === '1p' || app.kind === 'arcade') && i === 1) return app.ai.input(m.f[1], m.f[0], m);
  const inp = pads[i].poll();
  for (const b of app.hold[i]) inp[b] = true;
  return inp;
}

function stepOnce() {
  const m = app.match;
  if (app.replay) return stepReplay();
  if (app.kind === 'net' && app.mode === 'fight') {
    if (!netStep()) return false;
  } else {
    const ins = [inputFor(0), inputFor(1)];
    if (app.rec && app.mode === 'fight') app.rec.inputs.push([encode(ins[0]), encode(ins[1])]);
    m.step(ins);
  }
  app.time++;
  if (m.phase === 'finisher' && m.fin && m.fin.kind === 'dance') setTempo(0.8 + m.fin.v.dance * 0.2);
  if (m.phase === 'over') {
    app.overTimer++;
    if (app.mode === 'fight' && app.overTimer === 70) matchOver();
    if ((app.mode === 'menu' || app.mode === 'story') && app.overTimer === 60) newDemo();
  }
  if (app.shout && --app.shout.t <= 0) app.shout = null;
  return true;
}

// ---------- events from the fight: sound, banners, combos, the announcer ----------

let lastBabble = 0;
function onEvent(type, d) {
  if (app.replay && !app.replay.live) return;
  const m = app.match;
  switch (type) {
    case 'round':
      if (app.rec && !app.replay) app.rec.rounds.push(m ? m.frame : 0);
      sfx.gong();
      banner(d.final ? 'СОҢҒЫ РАУНД' : `${d.n}-РАУНД`, d.final ? t('finalRound') : t('round', { n: d.n }), 1.3);
      say(d.final ? 'Соңғы раунд' : `Раунд ${KK_NUM[d.n] || d.n}`);
      if (audioUnlocked && music.id !== songFor()) playMusic(songFor());
      break;
    case 'fight':
      sfx.fight();
      banner('КЕТТІК!', t('fightSub'), 0.9);
      say('Кеттік!', { rate: 1.05 });
      break;
    case 'say':
      if (app.time - lastBabble > 20) {
        lastBabble = app.time;
        sfx.babble(d.f.def.voice || 1, Math.min(6, 2 + Math.floor(d.text.length / 4)));
      }
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
    case 'eagle': sfx.whoosh(true); break;
    case 'strum': sfx.strum(); break;
    case 'flick': sfx.flick(); break;
    case 'words': sfx.pop(); break;
    case 'stomp': sfx.stomp(); break;
    case 'coin': case 'meter': sfx.coin(); break;
    case 'horn': sfx.horn(); break;
    case 'door': sfx.door(); break;
    case 'yawn': sfx.yawn(); break;
    case 'whirl': sfx.whirl(); break;
    case 'sneeze': sfx.sneeze(); break;
    case 'taunt': sfx.taunt(); break;
    case 'twinkle': sfx.twinkle(); break;
    case 'fallback': sfx.fallback(); break;
    case 'hazard':
      if (d.kind === 'sheep') sfx.bleat();
      shout(t('hazard'));
      break;
    case 'tripped':
      sfx.bonk();
      sfx.crowd(false);
      if (d.kind === 'sheep') sfx.bleat();
      break;
    case 'ko':
      sfx.ko();
      sfx.crowd(true);
      shout();
      if (app.arena.id === 'koktobe') app.arena.burst(app.time);
      if (!d.stand) {
        banner('НОКАУТ!', t('koSub'), 1.6, true);
        say('Нокаут!');
      }
      break;
    case 'finishHim':
      banner('АЯҚТА!', t('finishSub'), 2.6, true);
      say('Аяқта!', { pitch: 0.4, rate: 0.85 });
      break;
    case 'finisher':
      if (!app.replay && d.f.idx === localIdx() && app.kind !== '2p' && !progress.seen[d.kind]) {
        progress.seen[d.kind] = true;
        addStars(1);
      }
      break;
    case 'whistle': sfx.whistle(); break;
    case 'screech': sfx.screech(); break;
    case 'zhorga':
      if (audioUnlocked) playMusic('zhorga');
      break;
    case 'lullaby':
      if (audioUnlocked) playMusic('lullaby');
      break;
    case 'ujat':
      sfx.ujat();
      shout();
      banner('ҰЯТ!', t('ujatSub', { name: L(d.name) }), 2.2, true);
      say('Ұят!', { pitch: 0.4, rate: 0.8 });
      if (app.arena.id === 'koktobe') app.arena.burst(app.time);
      break;
    case 'roundWin': {
      sfx.win();
      const flawless = d.f.hp >= d.f.hpMax;
      banner(flawless ? 'ТАЗА ЖЕҢІС!' : `${d.f.def.kk.toUpperCase()} ЖЕҢДІ!`, flawless ? t('flawlessSub') : t('roundWin', { name: playerName(d.f.idx) }), 1.9);
      say(flawless ? 'Таза жеңіс!' : `${d.f.def.kk} жеңді!`);
      if (music.id === 'zhorga' || music.id === 'lullaby') playMusic(songFor());
      setTempo(1);
      break;
    }
    case 'timeup':
      banner('УАҚЫТ!', t('timeSub'), 1.4);
      say('Уақыт!');
      break;
    case 'draw': banner('ТЕҢ!', t('drawSub'), 1.6); break;
    default: break;
  }
}

function shout(text) {
  const cam = app.cam;
  const halfW = W / (2 * cam.s || 1);
  const crowd = app.arena.crowd;
  const seen = crowd.filter((c) => Math.abs(c.x - cam.x) < halfW - 60);
  const who = seen.length ? seen[Math.floor(Math.random() * seen.length)] : crowd[0];
  app.shout = { x: who.x, text: text || CROWD[Math.floor(Math.random() * CROWD.length)], t: 80 };
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
    let name = L(f.def.name);
    if (app.kind === '2p') name += ` · ${i + 1}`;
    if (app.kind === 'net') name += ` · ${i === app.net.local ? t('you') : t('friend')}`;
    if (app.kind === 'arcade' && i === 1) name += ` · ${app.arcade.step + 1}/${app.arcade.ladder.length}`;
    sides[i].nm.textContent = name;
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
    setCached('hp' + i, (v) => { s.hp.style.transform = `scaleX(${v})`; }, f.hp / f.hpMax);
    setCached('lag' + i, (v) => { s.lag.style.transform = `scaleX(${v})`; }, Math.round((app.lag[i] / f.hpMax) * 200) / 200);
    setCached('low' + i, (v) => s.bar.classList.toggle('low', v), f.hp < f.hpMax * 0.3);
    setCached('wins' + i, (v) => s.wins.forEach((w, k) => w.classList.toggle('on', k < v)), m.wins[i]);
    const ready = 1 - f.cool / f.def.spec.cd;
    setCached('sp' + i, (v) => { s.spi.style.transform = `scaleX(${v})`; }, Math.round(ready * 50) / 50);
    setCached('spr' + i, (v) => s.sp.classList.toggle('ready', v), f.cool <= 0);
  });
  const sec = m.training ? '∞' : String(Math.ceil(m.time / 60));
  setCached('time', (v) => { timerEl.textContent = v; }, sec);
  setCached('tlow', (v) => timerEl.classList.toggle('low', v), !m.training && m.time <= 600);
  if (isTouch) setCached('spBtn', (v) => specialBtn.classList.toggle('cool', v), m.f[localIdx()].cool > 0);
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

const toastsEl = $('toasts');
function toast(text, gold) {
  const n = el('div', 'toast' + (gold ? ' gold' : ''), text);
  toastsEl.append(n);
  setTimeout(() => n.classList.add('show'), 20);
  setTimeout(() => n.classList.remove('show'), 2600);
  setTimeout(() => n.remove(), 3000);
}

const badgeEl = $('badge');
function badge(text) {
  badgeEl.hidden = !text;
  badgeEl.textContent = text || '';
}

// ---------- screens ----------

const ui = $('ui');

function panel(cls, ...children) {
  const p = el('section', 'panel ' + (cls || ''));
  p.append(...children.filter(Boolean));
  ui.replaceChildren(p);
  const first = p.querySelector('.btn.primary, .menu-item:not([disabled])');
  if (first && !isTouch) setTimeout(() => first.focus({ preventScroll: true }), /\bresult\b/.test(cls || '') ? 900 : 30);
  p.scrollTop = 0;
  return p;
}
function btn(label, cls, onClick) {
  const b = el('button', 'btn ' + (cls || ''), label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
function head(title, onBack, extra) {
  const h = el('div', 'panel-head');
  const back = el('button', 'back', '←');
  back.type = 'button';
  back.setAttribute('aria-label', t('back'));
  back.addEventListener('click', onBack);
  h.append(back, el('h2', '', title));
  if (extra) h.append(extra);
  return h;
}
function chip(label, on, onClick, cls = 'chip') {
  const c = el('button', cls + (on ? ' on' : ''), label);
  c.type = 'button';
  c.setAttribute('aria-pressed', String(!!on));
  c.addEventListener('click', onClick);
  return c;
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
function row(...kids) {
  const r = el('div', 'row');
  r.append(...kids.filter(Boolean));
  return r;
}

function toMenu() {
  if (app.net && app.kind === 'net') leaveNet();
  app.mode = 'menu';
  app.replay = null;
  badge('');
  showHud(false);
  newDemo();
  if (audioUnlocked) playMusic('menu');
  screenMain();
}

// menus run a demo fight in the background
function backdrop() {
  if (app.mode === 'fight' || app.mode === 'paused') return;
  // a finished fight is replaced by a fresh demo so the menu never sits on a frozen frame
  if (!app.isDemo) newDemo();
  app.mode = 'menu';
  showHud(false);
}

function screenMain() {
  backdrop();
  const top = el('div', 'panel-top');
  const right = el('div', 'top-right');
  const mus = chip('♪ ' + (music.on ? t('musicOn') : t('musicOff')), music.on, () => {
    unlockAudio();
    toggleMusic();
    screenMain();
  }, 'chip-btn');
  const vo = hasVoice() ? chip(voice.on ? t('voiceOn') : t('voiceOff'), voice.on, () => {
    setVoice(!voice.on);
    if (voice.on) say('Жекпе-жек!');
    screenMain();
  }, 'chip-btn') : null;
  right.append(mus, vo || '', langs(screenMain));
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
  const two = isTouch && !app.pads;
  menu.append(
    item(t('arcade'), t('arcadeSub'), true, () => { app.kind = 'arcade'; app.slot = 'p1'; screenSelect(); }),
    item(t('vsAI'), t('vsAISub', { d: t(progress.diff) }), false, () => { app.kind = '1p'; app.slot = 'p1'; screenSelect(); }),
    item(t('twoP'), two ? t('twoPTouch') : t('twoPSub'), false, () => { app.kind = '2p'; app.slot = 'p1'; screenSelect(); }, two),
    item(t('online'), netSupported() ? t('onlineSub') : t('noNet'), false, () => screenOnline(), !netSupported()),
    item(t('training'), t('trainingSub'), false, () => { app.kind = 'train'; app.slot = 'p1'; screenSelect(); }),
    item(t('records'), t('recordsSub', { n: progress.stars }), false, () => screenRecords()),
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

function portrait(id, pal, face, w = 220, h = 230, gold = false) {
  const cv = el('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(w / 2, h * 0.65, 10, w / 2, h * 0.65, w * 0.7);
  g.addColorStop(0, '#5b3550');
  g.addColorStop(1, '#22152e');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const def = fighterById(id);
  const base = def.palettes[pal % def.palettes.length];
  const fake = { def, pal: gold ? goldPalette(base) : base, pose: copyPose(posesFor(id).stance), state: 'idle', face, x: 0, y: 0, t: 0, flash: 0, hp: 100, bubble: null, dance: 0, move: null };
  const k = (h / 230) * (def.boss ? 0.72 : 1.05);
  c.save();
  c.translate(w / 2 - face * 6, h - 16);
  c.scale(k, k);
  drawFighter(c, fake, {});
  c.restore();
  return cv;
}

function arenaThumb(id) {
  const cv = el('canvas');
  cv.width = 240;
  cv.height = 135;
  const c = cv.getContext('2d');
  const a = new Arena(id);
  a.draw(c, { W: 240, H: 135, s: 0.24, camX: 0, ground: 112, t: 200 }, null);
  return cv;
}
const thumbs = {};
const thumbFor = (id) => (thumbs[id] ||= arenaThumb(id).toDataURL());

function screenSelect() {
  backdrop();
  const kind = app.kind;
  const net = kind === 'net';
  const slots = kind === 'arcade' ? ['p1'] : ['p1', kind === '1p' ? 'p2' : kind === 'train' ? 'p2t' : kind === 'net' ? 'net' : 'p2b'];
  if (!slots.includes(app.slot) || app.slot === 'net') app.slot = 'p1';
  const gold = isOpen('gold') && progress.gold;

  // the two picked fighters on top
  const top = el('div', 'slots');
  slots.forEach((key, i) => {
    const label = kind === '2p' ? t(i ? 'player2' : 'player1') : kind === 'train' && i ? t('dummy') : net ? (i ? t('friend') : t('you')) : i ? t('rival') : t('you');
    const id = key === 'net' ? app.net.friendPick : progress[key];
    const card = el('button', 'slot' + (app.slot === key ? ' on' : ''));
    card.type = 'button';
    if (key === 'net') card.disabled = true;
    const face = i ? -1 : 1;
    const known = id && id !== 'random';
    if (known) card.append(portrait(id, i && id === progress.p1 ? 1 : 0, face, 220, 230, gold && !i));
    else card.append(el('span', 'qmark', '?'));
    card.append(el('small', '', label), el('b', '', known ? L(fighterById(id).name) : key === 'net' ? t('waitPick') : t('random')));
    card.addEventListener('click', () => {
      app.slot = key;
      screenSelect();
    });
    top.append(card);
    if (i === 0 && slots.length > 1) top.append(el('span', 'vs', 'VS'));
  });

  const grid = el('div', 'fcards');
  const current = progress[app.slot];
  for (const f of roster()) {
    const on = current === f.id;
    const card = el('button', 'fcard' + (on ? ' on' : ''));
    card.type = 'button';
    card.setAttribute('aria-pressed', String(on));
    card.append(portrait(f.id, 0, 1, 140, 146), el('span', '', L(f.name)));
    card.addEventListener('click', () => {
      progress[app.slot] = f.id;
      saveProgress();
      if (net) app.net.conn.send({ t: 'pick', id: f.id });
      // after the first pick move on to the rival
      if (app.slot === 'p1' && slots.length > 1 && slots[1] !== 'net') app.slot = slots[1];
      screenSelect();
    });
    grid.append(card);
  }
  if (app.slot === 'p2') {
    const card = el('button', 'fcard rand' + (current === 'random' ? ' on' : ''));
    card.type = 'button';
    card.append(el('span', '', '?'), el('small', '', t('random')));
    card.addEventListener('click', () => {
      progress.p2 = 'random';
      saveProgress();
      screenSelect();
    });
    grid.append(card);
  }

  const parts = [];
  if (kind !== 'arcade' && (!net || app.net.role === 'host')) {
    const box = el('div', 'pick-col');
    box.append(el('b', '', t('arena')));
    const list = el('div', 'arenas');
    for (const a of [{ id: 'random', name: { ru: t('randomArena'), en: t('randomArena') } }, ...ARENAS]) {
      const b = el('button', 'acard' + (progress.arena === a.id ? ' on' : ''));
      b.type = 'button';
      if (a.id !== 'random') {
        const img = el('img');
        img.alt = '';
        img.src = thumbFor(a.id);
        b.append(img);
      } else {
        b.append(el('span', 'qmark small', '?'));
      }
      b.append(el('span', '', L(a.name)));
      b.addEventListener('click', () => {
        progress.arena = a.id;
        saveProgress();
        screenSelect();
      });
      list.append(b);
    }
    box.append(list);
    parts.push(box);
  }
  if (kind === '1p' || kind === 'arcade') {
    const box = el('div', 'pick-col');
    box.append(el('b', '', t('difficulty')));
    const chips = el('div', 'chips');
    for (const d of DIFFS) chips.append(chip(t(d), progress.diff === d, () => { progress.diff = d; saveProgress(); screenSelect(); }));
    box.append(chips);
    parts.push(box);
  }
  if (kind === 'train') {
    const box = el('div', 'pick-col');
    box.append(el('b', '', t('dummyMode')));
    const chips = el('div', 'chips');
    for (const d of DUMMIES) chips.append(chip(t('dm_' + d), progress.dummy === d, () => { progress.dummy = d; saveProgress(); screenSelect(); }));
    box.append(chips, el('p', 'hint', t('trainHint')));
    parts.push(box);
  }
  const extras = ['bighead', 'gold', 'turbo'].filter((x) => isOpen(x) && !(net && x === 'turbo' && app.net.role !== 'host'));
  if (extras.length) {
    const box = el('div', 'pick-col');
    box.append(el('b', '', t('extras')));
    const chips = el('div', 'chips');
    for (const x of extras) chips.append(chip(t(x), progress[x], () => { progress[x] = !progress[x]; saveProgress(); screenSelect(); }));
    box.append(chips);
    parts.push(box);
  }

  const f = fighterById(progress[app.slot] === 'random' ? progress.p1 : progress[app.slot] || progress.p1);
  const bio = el('div', 'bio');
  const nameLine = el('p');
  nameLine.append(el('b', '', L(f.name) + '. '), document.createTextNode(L(f.bio)));
  const sp = el('p');
  sp.append(el('b', '', t('special') + ': '), document.createTextNode(L(f.special)));
  const fin = el('p');
  fin.append(el('b', '', t('finisher') + ': '), document.createTextNode(`${L(f.finisherName)}, ${L(f.finisherText)}`));
  bio.append(nameLine, sp, fin);
  const keys = el('p', 'keys', isTouch ? t('keysTouch') : kind === '2p' ? `${t('keysP1')} ${t('keysP2')}` : t('keys1'));
  let go;
  if (net && app.net.role !== 'host') go = el('p', 'note', t('hostStarts'));
  else if (net) go = btn(t('toFight'), 'primary', () => netStart());
  else if (kind === 'arcade') go = btn(t('storyStart'), 'primary', () => arcadeBegin());
  else go = btn(t('toFight'), 'primary', startFight);
  const back = net ? () => { leaveNet(); screenMain(); } : () => screenMain();
  panel('wide select', head(t('pick'), back), top, slots.length > 1 && !net ? el('p', 'hint', t('pickHint')) : null, grid, ...parts, bio, keys, go);
}

// ---------- arcade ----------

function arcadeBegin() {
  app.arcade = { player: progress.p1, diff: progress.diff, ladder: makeLadder(progress.p1, progress.diff), step: 0, score: 0, continues: 0, earned: 0 };
  screenStory();
}

function screenStory() {
  backdrop();
  const A = app.arcade;
  const f = fighterById(A.player);
  const pic = portrait(A.player, 0, 1, 300, 300, isOpen('gold') && progress.gold);
  pic.className = 'story-pic';
  panel('story', head(L(f.name), () => screenSelect()), pic, el('p', 'tag story-text', L(f.story.intro)), btn(t('ladder'), 'primary', screenLadder));
}

function screenLadder() {
  backdrop();
  app.mode = app.mode === 'result' ? 'story' : app.mode;
  const A = app.arcade;
  const tower = el('ol', 'tower');
  // the boss on top, the first rival at the bottom
  [...A.ladder].reverse().forEach((s, ri) => {
    const k = A.ladder.length - 1 - ri;
    const li = el('li', 'rung' + (k < A.step ? ' done' : k === A.step ? ' now' : ''));
    li.append(portrait(s.id, A.player === s.id ? 1 : 0, -1, 84, 88));
    const txt = el('span', '');
    txt.append(el('b', '', L(fighterById(s.id).name)), el('small', '', s.boss ? t('boss') : `${t(s.diff)} · ${L(ARENAS.find((a) => a.id === s.arena).name)}`));
    li.append(txt);
    if (k < A.step) li.append(el('i', 'check', '✓'));
    tower.append(li);
  });
  const step = A.ladder[A.step];
  const next = step.boss ? el('p', 'goal', t('bossIntro')) : null;
  panel('ladder', head(t('ladder'), () => screenMain(), el('span', 'head-note', t('score', { s: A.score }))), tower, next, btn(`${t('nextFight')}: ${L(fighterById(step.id).name)}`, 'primary', startFight));
}

function arcadeAfter(m) {
  const A = app.arcade;
  const won = m.result.winner && m.result.winner.idx === 0;
  if (!won) {
    app.mode = 'result';
    showHud(false);
    panel('result', el('h2', 'result-title', t('lostQ')), el('p', 'tag', t('score', { s: A.score })), row(btn(t('retry'), 'primary', () => { A.continues++; startFight(); }), btn(t('giveUp'), '', toMenu)));
    return;
  }
  const step = A.ladder[A.step];
  const sc = scoreFor(m, 0, step.diff);
  A.score += sc.total;
  addStars(1);
  A.step++;
  if (A.step >= A.ladder.length) return arcadeEnding();
  app.mode = 'result';
  showHud(false);
  panel('result', el('h2', 'result-title', `${fighterById(A.player).kk.toUpperCase()} ЖЕҢДІ!`), el('p', 'keys', t('scoreLine', sc)), el('p', 'tag', t('score', { s: A.score })), row(btn(t('ladder'), 'primary', screenLadder), btn(t('replay'), '', startReplay)));
}

function arcadeEnding() {
  const A = app.arcade;
  const f = fighterById(A.player);
  const bonus = { easy: 3, normal: 5, hard: 8 }[A.diff] || 3;
  const firstClear = !progress.clears[A.player];
  progress.clears[A.player] = A.diff;
  saveProgress();
  addStars(bonus);
  checkUnlocks();
  app.mode = 'result';
  showHud(false);
  if (audioUnlocked) playMusic('ending');
  const pic = endingPicture(A.player);
  pic.className = 'story-pic wide';
  const name = el('input');
  name.type = 'text';
  name.maxLength = 16;
  name.value = progress.name || '';
  name.placeholder = t('yourName');
  const note = el('p', 'note', '');
  const saveBtn = btn(t('save'), 'primary', () => {
    const nick = name.value.trim().slice(0, 16) || '???';
    progress.name = nick;
    progress.records.push({ name: nick, score: A.score, f: A.player, d: A.diff, at: Date.now() });
    progress.records.sort((a, b) => b.score - a.score);
    progress.records = progress.records.slice(0, 10);
    saveProgress();
    note.textContent = t('saved');
    saveBtn.disabled = true;
  });
  const box = el('div', 'name-box');
  box.append(el('label', '', t('yourName')), row(name, saveBtn), note);
  panel('wide story', el('h2', 'result-title', t('arcadeDone')), pic, el('p', 'tag story-text', L(f.story.ending)), el('p', 'goal', t('score', { s: A.score })), box, row(btn(t('menu'), '', toMenu), btn(t('records'), '', screenRecords)));
  void firstClear;
}

function endingPicture(id) {
  const cv = el('canvas');
  cv.width = 720;
  cv.height = 405;
  const c = cv.getContext('2d');
  const def = fighterById(id);
  const arena = new Arena(['aul', 'koktobe', 'bazaar', 'medeu', 'charyn'][PLAYABLE.findIndex((f) => f.id === id) % 5]);
  arena.draw(c, { W: 720, H: 405, s: 0.85, camX: 0, ground: 360, t: 300 }, { crowd: 1 });
  const fake = { def, pal: def.palettes[0], pose: copyPose(posesFor(id).win), state: 'win', face: 1, x: 0, y: 0, t: 0, flash: 0, hp: 100, bubble: null, dance: 0, move: null };
  c.save();
  c.translate(360, 360);
  c.scale(0.95, 0.95);
  drawFighter(c, fake, {});
  // the Golden Asyk held high, with a glow
  const g = c.createRadialGradient(70, -300, 4, 70, -300, 90);
  g.addColorStop(0, 'rgba(255, 230, 140, 0.9)');
  g.addColorStop(1, 'rgba(255, 230, 140, 0)');
  c.fillStyle = g;
  c.fillRect(-20, -390, 180, 180);
  asyk(c, 70, -300, 1.6);
  c.restore();
  for (let k = 0; k < 40; k++) {
    c.fillStyle = ['#ffd25a', '#ff6b5b', '#5fb4ff', '#7dff8a', '#d6b8ff'][k % 5];
    c.fillRect((k * 97) % 720, (k * 53) % 260, 8, 4);
  }
  for (let k = 0; k < 6; k++) star(c, 40 + k * 128, 40 + (k % 2) * 30, 8, '#fff6c2');
  return cv;
}

// a knucklebone in gold
function asyk(c, x, y, k) {
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  const g = c.createLinearGradient(-20, -14, 20, 14);
  g.addColorStop(0, '#fff1a8');
  g.addColorStop(0.5, '#e0a820');
  g.addColorStop(1, '#a87810');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-22, -10);
  c.quadraticCurveTo(0, -4, 22, -10);
  c.quadraticCurveTo(30, 0, 22, 10);
  c.quadraticCurveTo(0, 4, -22, 10);
  c.quadraticCurveTo(-30, 0, -22, -10);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.beginPath();
  c.ellipse(-8, -5, 7, 2.5, -0.2, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// ---------- records and unlocks ----------

function screenRecords() {
  backdrop();
  const starsLine = el('p', 'big-stars', `★ ${progress.stars}`);
  const list = el('ul', 'unlocks');
  for (const u of UNLOCKS) {
    const open = isOpen(u.id);
    const li = el('li', open ? 'open' : '');
    li.append(el('b', '', L(u.name)), el('span', '', open ? t('open') : u.stars ? t('needStars', { n: u.stars }) : L(u.how)));
    list.append(li);
  }
  const table = el('ol', 'board');
  if (!progress.records.length) table.append(el('li', 'empty', t('noRecords')));
  progress.records.forEach((r, k) => {
    const li = el('li', 'row-entry');
    li.append(el('span', 'pos', String(k + 1)), el('span', 'who', `${r.name} · ${L(fighterById(r.f).name)} · ${t(r.d)}`), el('span', 'val', String(r.score)));
    table.append(li);
  });
  panel('wide', head(t('records'), () => screenMain()), starsLine, el('p', 'hint', t('starsHow')), el('h3', '', t('unlocksTitle')), list, el('h3', '', t('recordsTitle')), table);
}

function screenHowTo() {
  backdrop();
  const moves = el('dl', 'moves');
  for (const [k, v] of t('moves')) moves.append(el('dt', '', k), el('dd', '', v));
  const fighters = el('dl', 'moves');
  for (const f of roster()) {
    fighters.append(el('dt', '', L(f.name)), el('dd', '', `${L(f.special)}. ${t('finisher')}: ${L(f.finisherName)}, ${L(f.finisherText)}.`));
  }
  const arenas = el('dl', 'moves');
  for (const a of ARENAS) arenas.append(el('dt', '', L(a.name)), el('dd', '', L(a.note)));
  const keys = el('p', 'keys', isTouch ? t('keysTouch') : `${t('keys1')} ${t('keysP1')} ${t('keysP2')} ${t('keysPad')}`);
  panel('wide', head(t('howTo'), () => screenMain()), keys, el('h3', '', t('movesTitle')), moves, el('h3', '', t('finishTitle')), el('p', 'tag', t('finishText')), fighters, el('h3', '', t('hazardTitle')), arenas, el('p', 'keys', t('kkNote')));
}

// ---------- pause, results, replay ----------

function pause() {
  if (app.mode !== 'fight') return;
  if (app.kind === 'net') {
    netMenu();
    return;
  }
  app.mode = 'paused';
  pads.forEach((p) => p.clear());
  pauseMusic(true);
  touchEl.hidden = true;
  const keys = el('p', 'keys', isTouch ? t('keysTouch') : app.kind === '2p' ? `${t('keysP1')} ${t('keysP2')}` : t('keys1'));
  const extra = app.kind === 'train' ? row(chip(t('boxes'), app.boxes, () => { app.boxes = !app.boxes; app.mode = 'fight'; pause(); }), ...DUMMIES.map((d) => chip(t('dm_' + d), progress.dummy === d, () => {
    progress.dummy = d;
    if (d === 'cpu' && !app.ai) app.ai = new AI('normal', rng(5));
    saveProgress();
    app.mode = 'fight';
    pause();
  }))) : null;
  panel('', el('h2', '', t('pause')), keys, extra, row(btn(t('resume'), 'primary', resume), app.kind === 'arcade' ? null : btn(t('restart'), '', startFight), btn(t('menu'), '', toMenu)));
}

function resume() {
  if (app.mode !== 'paused') return;
  app.mode = 'fight';
  ui.replaceChildren();
  touchEl.hidden = !isTouch;
  pauseMusic(false);
  last = performance.now();
}

function matchOver() {
  const m = app.match;
  if (app.kind === 'arcade') return arcadeAfter(m);
  showResult();
}

function showResult() {
  const m = app.match;
  const r = m.result;
  const w = r.winner;
  const me = localIdx();
  app.mode = 'result';
  showHud(false);
  if (audioUnlocked) playMusic('menu');
  let sub;
  if (app.kind === '1p' || app.kind === 'net') {
    sub = !w ? t('draw') : w.idx === me ? t('youWin') : t('youLose');
    if (app.kind === '1p' && w && w.idx === 0) {
      progress.wins[progress.diff] = (progress.wins[progress.diff] || 0) + 1;
      saveProgress();
      addStars({ easy: 0, normal: 1, hard: 2 }[progress.diff] || 0);
    }
  } else {
    sub = w ? t('wins', { name: playerName(w.idx) }) : t('draw');
  }
  const title = el('h2', 'result-title', w ? `${w.def.kk.toUpperCase()} ЖЕҢДІ!` : 'ТЕҢ!');
  const stats = el('div', 'stats');
  stats.append(el('span'), el('b', 'head', playerName(0)), el('b', 'head', playerName(1)));
  const line = (label, a, b) => stats.append(el('span', '', label), el('b', '', String(a)), el('b', '', String(b)));
  line(t('statRounds'), r.wins[0], r.wins[1]);
  line(t('statHits'), m.f[0].stats.hits, m.f[1].stats.hits);
  line(t('statCombo'), m.f[0].stats.maxCombo, m.f[1].stats.maxCombo);
  const note = el('p', 'note', r.flawless ? t('flawless') : '');
  const record = app.kind === '1p' ? el('p', 'keys', t('record', { e: progress.wins.easy || 0, n: progress.wins.normal || 0, h: progress.wins.hard || 0 })) : null;
  const shareNote = el('p', 'note', '');
  const shareBtn = w && (app.kind === '2p' || w.idx === me) ? btn(t('share'), '', () => share(w, shareNote)) : null;
  let buttons;
  if (app.kind === 'net') {
    buttons = row(app.net.role === 'host' ? btn(t('rematch'), 'primary', () => netStart()) : btn(t('rematch'), 'primary', () => { app.net.conn.send({ t: 'again' }); shareNote.textContent = t('hostStarts'); }), btn(t('otherFighter'), '', () => { app.mode = 'menu'; screenSelect(); app.net.conn.send({ t: 'select' }); }), btn(t('leave'), '', toMenu));
  } else {
    buttons = row(btn(t('rematch'), 'primary', startFight), btn(t('otherFighter'), '', () => { app.mode = 'menu'; screenSelect(); }), btn(t('menu'), '', toMenu));
  }
  const replayBtn = app.rec && app.rec.rounds.length ? btn(t('replay'), '', startReplay) : null;
  panel('result', title, el('p', 'tag', sub), stats, note, record, buttons, row(replayBtn, shareBtn), shareNote);
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

// replays re-run the same fight from the recorded buttons; only the last round is shown
function startReplay() {
  const rec = app.rec;
  if (!rec || !rec.rounds.length) return;
  const back = { mode: app.mode, match: app.match, ui: [...ui.childNodes] };
  const from = rec.rounds[rec.rounds.length - 1] - 1;
  const m = new Match({ ...rec.opts, onEvent });
  app.replay = { live: false, back, at: 0, from };
  app.match = m;
  for (; app.replay.at < from && app.replay.at < rec.inputs.length; app.replay.at++) {
    const [a, b] = rec.inputs[app.replay.at];
    m.step([decode(a), decode(b)]);
  }
  app.replay.live = true;
  app.mode = 'fight';
  app.cam.s = 0;
  ui.replaceChildren();
  showHud(true);
  touchEl.hidden = true;
  hudNames();
  badge('▶ ' + t('replayBadge'));
}

function stepReplay() {
  const R = app.replay;
  const rec = app.rec;
  if (R.at >= rec.inputs.length + 60) {
    endReplay();
    return true;
  }
  const pair = rec.inputs[R.at] || [0, 0];
  app.match.step([decode(pair[0]), decode(pair[1])]);
  R.at++;
  app.time++;
  if (app.shout && --app.shout.t <= 0) app.shout = null;
  return true;
}

function endReplay() {
  const R = app.replay;
  app.replay = null;
  badge('');
  app.match = R.back.match;
  app.mode = 'result';
  showHud(false);
  ui.replaceChildren(...R.back.ui);
}

// ---------- online ----------

function screenOnline(joinCode) {
  backdrop();
  if (app.net) leaveNet();
  const status = el('p', 'note', '');
  const box = el('div', 'net-box');
  const n = new Net({
    open: () => {
      status.textContent = t('connected');
      sfx.win();
      app.net.friendPick = null;
      app.net.conn.send({ t: 'pick', id: progress.p1 });
      app.kind = 'net';
      app.slot = 'p1';
      setTimeout(() => { if (app.kind === 'net' && app.mode !== 'fight') screenSelect(); }, 400);
    },
    close: () => {
      toast(t('lostConn'), true);
      if (app.kind === 'net') {
        app.net = null;
        toMenu();
      }
    },
    message: onNet,
  });
  app.net = { conn: n, role: null, local: 0, friendPick: null, delay: 4 };
  const copyBtn = (getText, label) => btn(label, '', async () => {
    try {
      await navigator.clipboard.writeText(getText());
      status.textContent = t('copied');
    } catch {
      status.textContent = getText();
    }
  });
  if (joinCode) {
    app.net.role = 'guest';
    app.net.local = 1;
    status.textContent = t('joining');
    n.join(joinCode).then((answer) => {
      const area = el('textarea', 'code');
      area.readOnly = true;
      area.value = answer;
      box.replaceChildren(el('p', 'tag', t('answerReady')), area, row(copyBtn(() => answer, t('copyCode'))));
      status.textContent = t('waitingFriend');
    }).catch(() => { status.textContent = t('badCode'); });
    panel('wide', head(t('onlineTitle'), () => { leaveNet(); toMenu(); }), box, status);
    return;
  }
  const hostBtn = btn(t('host'), 'primary', async () => {
    hostBtn.disabled = true;
    app.net.role = 'host';
    app.net.local = 0;
    status.textContent = t('making');
    try {
      const offer = await n.host();
      const url = `${location.origin}${location.pathname}#join=${offer}`;
      const area = el('textarea', 'code');
      area.readOnly = true;
      area.value = url;
      const ans = el('textarea', 'code');
      ans.placeholder = '...';
      const go = btn(t('connect'), 'primary', async () => {
        try {
          await n.accept(ans.value);
          status.textContent = t('waitingFriend');
        } catch {
          status.textContent = t('badCode');
        }
      });
      const shareLink = navigator.share ? btn(t('share'), '', () => navigator.share({ title: 'Жекпе-жек', url }).catch(() => {})) : null;
      box.replaceChildren(el('p', 'tag', t('linkReady')), area, row(copyBtn(() => url, t('copyLink')), shareLink), el('p', 'tag', t('pasteAnswer')), ans, go);
      status.textContent = '';
    } catch {
      status.textContent = t('netFail');
    }
  });
  box.append(hostBtn);
  panel('wide', head(t('onlineTitle'), () => { leaveNet(); toMenu(); }), el('p', 'tag', t('onlineIntro')), box, status);
}

function onNet(msg) {
  const N = app.net;
  if (!N) return;
  if (msg.t === 'pick') {
    N.friendPick = msg.id;
    if (app.mode !== 'fight' && app.kind === 'net' && ui.querySelector('.select')) screenSelect();
  } else if (msg.t === 'start') {
    netBegin(msg);
  } else if (msg.t === 'i') {
    N.inp[1 - N.local].set(msg.f, msg.i);
  } else if (msg.t === 'h') {
    N.hashes[msg.f] = N.hashes[msg.f] ?? null;
    if (N.mine[msg.f] != null && N.mine[msg.f] !== msg.h) N.desync = true;
    N.theirs[msg.f] = msg.h;
  } else if (msg.t === 'again') {
    if (N.role === 'host') toast(t('rematchAsk'));
  } else if (msg.t === 'select') {
    if (app.mode !== 'fight') {
      app.mode = 'menu';
      screenSelect();
    }
  } else if (msg.t === 'bye') {
    toast(t('lostConn'), true);
    app.net = null;
    toMenu();
  }
}

function netStart() {
  const N = app.net;
  if (!N || N.role !== 'host' || !N.friendPick) {
    toast(t('waitPick'));
    return;
  }
  const msg = { t: 'start', seed: Math.floor(Math.random() * 1e9), p1: progress.p1, p2: N.friendPick, arena: pickArena(), turbo: isOpen('turbo') && progress.turbo };
  N.conn.send(msg);
  netBegin(msg);
}

function netBegin(msg) {
  const N = app.net;
  N.inp = [new Map(), new Map()];
  N.mine = {};
  N.theirs = {};
  N.hashes = {};
  N.desync = false;
  N.stall = 0;
  for (let f = 0; f < N.delay; f++) {
    N.inp[0].set(f, 0);
    N.inp[1].set(f, 0);
  }
  app.kind = 'net';
  startMatch({ p1: msg.p1, p2: msg.p2, arena: msg.arena, seed: msg.seed, turbo: msg.turbo, bighead: false });
}

function netStep() {
  const N = app.net;
  const m = app.match;
  if (!N) return false;
  const idx = m.frame;
  const want = idx + N.delay;
  if (!N.inp[N.local].has(want)) {
    const inp = pads[0].poll();
    for (const b of app.hold[0]) inp[b] = true;
    const v = app.netMenu ? 0 : encode(inp);
    N.inp[N.local].set(want, v);
    N.conn.send({ t: 'i', f: want, i: v });
  }
  const a = N.inp[0].get(idx);
  const b = N.inp[1].get(idx);
  if (a === undefined || b === undefined) {
    N.stall++;
    if (N.stall === 45) badge(t('waitingInput'));
    return false;
  }
  if (N.stall >= 45) badge('');
  N.stall = 0;
  N.inp[0].delete(idx);
  N.inp[1].delete(idx);
  app.rec.inputs.push([a, b]);
  m.step([decode(a), decode(b)]);
  if (m.frame % 120 === 0) {
    const h = fingerprint(m);
    N.mine[m.frame] = h;
    N.conn.send({ t: 'h', f: m.frame, h });
    if (N.theirs[m.frame] != null && N.theirs[m.frame] !== h) N.desync = true;
  }
  if (N.desync && !N.warned) {
    N.warned = true;
    toast(t('desync'), true);
  }
  return true;
}

function netMenu() {
  app.netMenu = !app.netMenu;
  if (!app.netMenu) {
    ui.replaceChildren();
    return;
  }
  panel('', el('h2', '', t('online')), row(btn(t('resume'), 'primary', () => { app.netMenu = false; ui.replaceChildren(); }), btn(t('leave'), '', toMenu)));
}

function leaveNet() {
  if (!app.net) return;
  app.net.conn.send({ t: 'bye' });
  app.net.conn.close();
  app.net = null;
  if (location.hash.startsWith('#join=')) history.replaceState(null, '', location.pathname + location.search);
}

// ---------- audio, keys, language ----------

let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audioInit();
  playMusic(app.mode === 'fight' ? songFor() : 'menu');
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
  if (music.on) playMusic(app.mode === 'fight' ? songFor() : 'menu');
  $('musicBtn').setAttribute('aria-pressed', String(music.on));
}
$('musicBtn').addEventListener('click', toggleMusic);
$('muteBtn').addEventListener('click', toggleSound);
$('pauseBtn').addEventListener('click', () => (app.mode === 'paused' ? resume() : pause()));

bindKeyboard(() => app.mode === 'fight' && !app.replay);
bindTouch(touchEl);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || (e.code === 'KeyP' && !e.repeat)) {
    if (app.replay) endReplay();
    else if (app.mode === 'fight') pause();
    else if (app.mode === 'paused') resume();
  } else if (e.code === 'KeyM' && app.mode !== 'menu') {
    toggleSound();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (app.kind !== 'net') pause();
    pauseMusic(true);
  } else if (app.mode !== 'paused') {
    pauseMusic(false);
  }
});
window.addEventListener('blur', () => { if (app.kind !== 'net') pause(); });
window.addEventListener('gamepadconnected', () => {
  toast(t('pad'));
  app.pads = 1;
  if (app.mode === 'menu' && !ui.querySelector('.select')) screenMain();
});
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
  for (const k of Object.keys(thumbs)) delete thumbs[k];
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
  const touchFight = isTouch && (app.mode === 'fight' || app.mode === 'paused') && !app.replay;
  // on a phone held sideways the buttons sit in the corners, so the floor can go lower
  const ground = touchFight ? H * (portraitMode ? 0.6 : 0.8) : H * (portraitMode ? 0.72 : 0.86);
  const top = (app.mode === 'menu' ? 40 : touchFight && !portraitMode ? 60 : 84) * DPR;
  const big = !!app.bighead && (app.mode !== 'menu');

  // camera: keep both fighters in view, zoom in when they are close
  const live = [a, b].filter((f) => !f.hidden && f.state !== 'carried' && f.state !== 'blast' && f.state !== 'blind');
  const cx = live.length ? live.reduce((s, f) => s + f.x, 0) / live.length : app.cam.x;
  const spread = live.length === 2 ? Math.abs(a.x - b.x) : 0;
  const tall = Math.max(a.def.hurt.stand, b.def.hurt.stand) > 200 ? 1.25 : 1;
  const viewW = Math.max(portraitMode ? 400 : 640, spread + (portraitMode ? 210 : 380)) * (tall > 1 ? 1.1 : 1);
  const s = Math.max(0.05, Math.min(W / viewW, (ground - top) / (380 * tall + (big ? 60 : 0))));
  const cam = app.cam;
  if (app.mode === 'og') {
    cam.s = H / +(params.get('zoom') || 400);
    cam.x = +(params.get('cx') || -60);
  } else if (!cam.s) {
    cam.s = s;
    cam.x = cx;
  } else {
    cam.s += (s - cam.s) * Math.min(1, dt * 3);
    cam.x += (cx - cam.x) * Math.min(1, dt * 5);
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
  app.arena.draw(ctx, { W, H, s: cam.s, camX: cam.x, ground, t: app.time }, m);

  ctx.translate(W / 2 - cam.x * cam.s, ground);
  ctx.scale(cam.s, cam.s);
  const busy = (f) => ['attack', 'throwing', 'special'].includes(f.state);
  const order = busy(a) && !busy(b) ? [b, a] : [a, b];
  const opts = { time: app.time, bigHead: big };
  for (const f of order) drawFighter(ctx, f, opts);
  for (const f of order) drawLasso(ctx, f);
  drawCar(ctx, m.car);
  for (const p of m.proj) drawProjectile(ctx, p);
  drawEagle(ctx, m.eagle);
  for (const e of m.fx) drawFx(ctx, e);
  const scale = cam.s / DPR;
  const bounds = [cam.x - W / (2 * cam.s) + 8 / scale, cam.x + W / (2 * cam.s) - 8 / scale];
  // two bubbles close together: the second one goes a line higher
  const stack = a.bubble && b.bubble && Math.abs(a.x - b.x) * scale < 220;
  drawBubble(ctx, a, scale, bounds, 0, big);
  drawBubble(ctx, b, scale, bounds, stack ? 40 : 0, big);
  if (app.shout) drawShout(ctx, app.shout, scale);
  if (app.boxes && app.mode !== 'menu') drawBoxes(ctx, m);
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
  app.pads = pollGamepads(() => {
    if (app.replay) endReplay();
    else if (app.mode === 'fight') pause();
    else if (app.mode === 'paused') resume();
  });
  if (['fight', 'menu', 'result', 'story'].includes(app.mode) && !app.frozen) {
    acc += dt * app.match.timeScale * (app.turbo && app.mode === 'fight' ? 1.25 : 1);
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
checkUnlocks();
toMenu();
requestAnimationFrame(frame);
if (location.hash.startsWith('#join=')) screenOnline(location.hash.slice(6));

// ?og renders a still frame for the link preview (og.png)
if (params.has('og')) {
  document.body.classList.add('og');
  app.mode = 'og';
  ui.replaceChildren();
  setArena(params.get('arena') || 'aul');
  const m = new Match({ p1: params.get('p1') || 'batyr', p2: params.get('p2') || 'apa', seed: 5, arena: app.arena.id, noHazards: true });
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
  for (const e of m.fx) {
    if (e.k !== 'word') continue;
    e.x = b.x;
    e.y = 300;
    e.t = 12;
  }
  app.cam.s = 0;
  const title = el('div', 'og-title');
  title.append(el('b', '', 'Жекпе-жек'), el('span', '', params.get('sub') || (getLang() === 'en' ? 'Seven Kazakh heroes and a giant' : 'Семь казахских героев и великан')));
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
      if (opts.p2) progress[{ '1p': 'p2', '2p': 'p2b', train: 'p2t' }[app.kind] || 'p2'] = opts.p2;
      if (opts.diff) progress.diff = opts.diff;
      if (opts.arena) progress.arena = opts.arena;
      if (app.kind === 'arcade') {
        arcadeBegin();
        if (opts.step != null) app.arcade.step = opts.step;
      }
      startFight();
      return this.state();
    },
    state() {
      const m = app.match;
      return {
        mode: app.mode, kind: app.kind, phase: m.phase, round: m.round, wins: m.wins, time: Math.ceil(m.time / 60), arena: m.arena,
        f: m.f.map((f) => ({ id: f.def.id, st: f.state, x: Math.round(f.x), y: Math.round(f.y), hp: f.hp, cool: f.cool })),
      };
    },
    menu: toMenu,
    pause,
    resume,
    render: () => render(DT),
    screens: { screenMain, screenSelect, screenHowTo, showResult, screenRecords, screenLadder, screenStory, screenOnline, arcadeEnding },
    boxes(on = true) { app.boxes = on; },
    freeze(on = true) { app.frozen = on; },
    addStars,
    startReplay,
    sfx,
  };
}
