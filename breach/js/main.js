// Boot, menus, settings, input and the main loop.
import * as THREE from '../vendor/three.module.min.js';
import { Game } from './game.js';
import { Hud, BUY_ITEMS, styleXhair } from './hud.js';
import { initAudio, setVolume, sfx, rainSound, setHiddenAudio } from './audio.js';
import { t, lang, setLang } from './i18n.js';
import { loadPeople } from './people.js';
import { loadProps } from './props.js';
import { Net, newCode } from './net.js';
import { NetGame } from './netgame.js';
import { BOT_NAMES } from './i18n.js';
import { WEAPONS } from './weapons.js';
import { setupTouch } from './touch.js';
import { levelOf, rankName, loadXp } from './rank.js';
import { PORTAL, portalReady, portalGameplay, portalInterstitial, onPortalMute, onPortalHold, portalHold, track } from './portal.js';

const $ = (id) => document.getElementById(id);
const canvas = $('view');
const q = new URLSearchParams(location.search);

// ---------- settings ----------
const DEF = { xh: 'cross', xhc: 'green', xhl: 9, xht: 2, xhg: 4, sens: 1.2, tsens: 1, ui: 1, fov: 74, vol: 0.8, bright: 1.2, fun: {}, skin: 'none', quality: 'auto', showFps: false, team: 'A', mode: 'hostage', diff: 'normal' };
let settings = { ...DEF };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem('breach.settings') || '{}'));
} catch {
  /* ignore */
}
{
  const num = (k, lo, hi) => {
    const v = +settings[k];
    settings[k] = Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : DEF[k];
  };
  num('sens', 0.2, 4);
  num('tsens', 0.3, 3);
  num('ui', 0.6, 1.3);
  num('fov', 60, 90);
  num('vol', 0, 1);
  num('bright', 0.8, 1.8);
  num('xhl', 3, 16);
  num('xht', 1, 4);
  num('xhg', 0, 12);
  const one = (k, list) => {
    if (!list.includes(settings[k])) settings[k] = DEF[k];
  };
  one('quality', ['auto', '1', '0.75', '0.5']);
  one('team', ['A', 'B']);
  one('mode', ['hostage', 'dm', 'gun', 'knife', 'zombie']);
  one('diff', ['easy', 'normal', 'hard']);
  one('skin', ['none', 'gold', 'red', 'arctic', 'neon']);
  one('xh', ['cross', 'dot', 'circle', 'tee']);
  one('xhc', ['green', 'yellow', 'cyan', 'white', 'pink', 'red']);
  if (!settings.fun || typeof settings.fun !== 'object') settings.fun = {};
}
const save = () => {
  try {
    localStorage.setItem('breach.settings', JSON.stringify(settings));
  } catch {
    /* blocked */
  }
};
let portalMuted = false;
setVolume(settings.vol);
onPortalMute((m) => {
  portalMuted = m;
  setVolume(m ? 0 : settings.vol);
});

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
// overall brightness: a plain exposure over the whole picture (the sky keeps its own)
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = settings.bright ?? DEF.bright;
let scale = settings.quality === 'auto' ? 1 : +settings.quality;
function applySize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1) * scale);
  renderer.setSize(w, h, false);
  game?.resize(w, h);
  preview?.resize(w, h);
}
window.addEventListener('resize', applySize);

// ---------- texts ----------
// the player's rank in the menu's corner
function paintRank() {
  const r = levelOf(loadXp());
  $('rc-name').textContent = rankName(r.level);
  $('rc-bar').style.width = ((100 * r.into) / r.span).toFixed(1) + '%';
  $('rank-chip').title = `${r.into} / ${r.span} ${t('xp')}`;
}
function applyTexts() {
  document.documentElement.lang = lang;
  paintRank();
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of document.querySelectorAll('[data-t-aria]')) el.setAttribute('aria-label', t(el.dataset.tAria));
  if (touchOnly) document.querySelectorAll('.buy-hint').forEach((el) => (el.textContent = t('buyHintTouch')));
  for (const b of document.querySelectorAll('.langs button')) b.classList.toggle('on', b.dataset.lang === lang);
  document.title = PORTAL ? (lang === 'ru' ? 'Штурм особняка' : 'Mansion Breach') : lang === 'ru' ? 'Штурм особняка — тактический шутер 5 на 5 в браузере | GameMetric' : 'Mansion Breach — 5v5 tactical shooter in your browser | GameMetric';
  $('ctrl-list').innerHTML = t(touchOnly ? 'ctrlTouch' : 'ctrl').map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}
for (const b of document.querySelectorAll('.langs button'))
  b.addEventListener('click', () => {
    setLang(b.dataset.lang);
    const u = new URL(location.href);
    u.searchParams.set('lang', b.dataset.lang);
    location.replace(u.href);
  });

// ---------- menu ----------
const hud = new Hud();
let game = null;
let preview = null; // the mansion behind the main menu
let state = 'menu'; // menu | play | pause

function seg(id, key) {
  const el = $(id);
  const set = () => {
    for (const b of el.querySelectorAll('button')) b.classList.toggle('on', String(settings[key]) === b.dataset.v);
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    settings[key] = key === 'quality' && b.dataset.v !== 'auto' ? b.dataset.v : b.dataset.v;
    save();
    set();
    sfx('click');
    if (key === 'quality') {
      scale = settings.quality === 'auto' ? 1 : +settings.quality;
      applySize();
    }
    if (key.startsWith('xh')) applyXhair();
  });
  set();
}
// the crosshair in the game and its preview in the settings look the same
function applyXhair() {
  styleXhair($('crosshair'), settings);
  styleXhair($('xh-prev'), settings);
  $('xh-prev').style.setProperty('--gap', `${settings.xhg}px`);
}
seg('seg-mode', 'mode');
seg('seg-diff', 'diff');
// the madness toggles: any number of them at once
settings.fun = settings.fun && typeof settings.fun === 'object' ? settings.fun : {};
for (const b of document.querySelectorAll('#seg-fun button')) {
  b.classList.toggle('on', !!settings.fun[b.dataset.f]);
  b.addEventListener('click', () => {
    settings.fun = { ...settings.fun, [b.dataset.f]: !settings.fun[b.dataset.f] };
    b.classList.toggle('on', !!settings.fun[b.dataset.f]);
    save();
    initAudio();
    sfx('click');
  });
}
seg('seg-q', 'quality');
seg('seg-skin', 'skin');
seg('seg-xh', 'xh');
seg('seg-xhc', 'xhc');
function sides() {
  for (const b of document.querySelectorAll('.side')) b.classList.toggle('on', b.dataset.side === settings.team);
}
for (const b of document.querySelectorAll('.side'))
  b.addEventListener('click', () => {
    settings.team = b.dataset.side;
    save();
    sides();
    initAudio();
    sfx('click');
  });
sides();

// phones and tablets play with on-screen controls (?touch forces them on a computer, ?mouse turns them off).
// Some phones (with a stylus, for one) say they have a fine pointer like a mouse, so the phone itself counts too;
// and whatever we guessed, the first real touch on the screen switches the game to touch controls.
const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
let touchOnly = !q.has('mouse') && (q.has('touch') || (navigator.maxTouchPoints > 0 && mobileUA) || (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches));

// a phone held sideways is short: less interface, more view, unless the player chose otherwise
function phoneDefaults() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('breach.settings') || '{}');
  } catch {}
  if (saved.ui == null) settings.ui = 0.78;
  if (saved.fov == null) settings.fov = 82;
  applyUi();
  for (const k of ['ui', 'fov']) {
    const el = $('s-' + k);
    if (el) {
      el.value = settings[k];
      el.dispatchEvent(new Event('sync'));
    }
  }
}
function applyUi() {
  document.documentElement.style.setProperty('--ui', settings.ui ?? 1);
  // the gun in hand shrinks with the interface on a small screen
  settings.vmScale = touchOnly ? 0.84 : 1;
  // and on a phone the crosshair is helped onto targets a little
  settings.assist = touchOnly;
}

function slider(id, key, fmt) {
  const el = $('s-' + id), out = $('o-' + id);
  el.value = settings[key];
  out.textContent = fmt(settings[key]);
  el.addEventListener('sync', () => (out.textContent = fmt(settings[key])));
  el.addEventListener('input', () => {
    settings[key] = +el.value;
    out.textContent = fmt(settings[key]);
    if (key === 'ui') applyUi();
    if (key === 'vol' && !portalMuted) setVolume(settings.vol);
    if (key === 'bright') renderer.toneMappingExposure = settings.bright;
    if (key.startsWith('xh')) applyXhair();
    save();
  });
}
slider('sens', 'sens', (v) => (+v).toFixed(2));
slider('fov', 'fov', (v) => `${v}°`);
slider('vol', 'vol', (v) => `${Math.round(v * 100)}%`);
slider('bright', 'bright', (v) => `${Math.round(v * 100)}%`);
slider('ui', 'ui', (v) => `${Math.round(v * 100)}%`);
slider('tsens', 'tsens', (v) => (+v).toFixed(2));
slider('xhl', 'xhl', (v) => `${v}px`);
slider('xht', 'xht', (v) => `${v}px`);
slider('xhg', 'xhg', (v) => `${v}px`);
applyXhair();
applyUi();
$('s-fps').checked = settings.showFps;
$('s-fps').addEventListener('change', () => {
  settings.showFps = $('s-fps').checked;
  save();
});

let settingsFrom = 'menu';
$('m-settings').onclick = () => {
  settingsFrom = 'menu';
  $('settings').hidden = false;
};
$('m-controls').onclick = () => ($('controls').hidden = false);
$('c-back').onclick = () => ($('controls').hidden = true);
$('s-back').onclick = () => {
  $('settings').hidden = true;
  if (settingsFrom === 'pause') $('pause').hidden = false;
};
$('p-settings').onclick = () => {
  settingsFrom = 'pause';
  $('pause').hidden = true;
  $('settings').hidden = false;
};
$('p-resume').onclick = () => resume();
$('p-quit').onclick = () => {
  if (net?.isHost && game && !game.over && net.peers.length > 1 && !confirm(t('hostQuitAsk'))) return;
  if (game && !game.over) game.tele('quit');
  toMenu();
};
$('mo-menu').onclick = () => {
  if (game) game.tele('after_match', { next: 'menu' });
  portalInterstitial();
  net ? backToLobby(true) : toMenu();
};
$('mo-again').onclick = () => {
  if (game) game.tele('after_match', { next: 'again' });
  portalInterstitial();
  startGame();
};
$('play').onclick = () => {
  if (touchOnly) goFullscreen();
  startGame();
};
$('online').onclick = () => openLobby(newCode());
$('click-to-play').onclick = () => resume();

let startGen = 0;
function startGame(online) {
  const gen = ++startGen;
  closeSettings();
  clearTimeout(hud.xpTimer);
  initAudio();
  closeBuy(false);
  input.menuOpen = false;
  input.fire = false;
  $('menu').hidden = true;
  $('lobby').hidden = true;
  $('match-over').hidden = true;
  $('pause').hidden = true;
  $('loading').hidden = false;
  // let the loading text paint before the heavy build
  setTimeout(() => {
    if (gen !== startGen || (online && !net)) {
      $('loading').hidden = true;
      return;
    }
    if (game) game.dispose();
    if (preview) {
      preview.dispose();
      preview = null;
    }
    if (online) {
      game = new Game(renderer, online, hud);
      new NetGame(game, net);
      // the host's first round goes out now; a client plays back what arrived while it was loading
      if (online.role === 'host') game.nh.onRound(true);
      else for (const m of pending.splice(0)) game.nh.onClientMessage(m);
    } else {
      game = new Game(renderer, { team: settings.team, mode: settings.mode, diff: settings.diff, fun: settings.fun }, hud);
      const fun = Object.keys(settings.fun || {}).filter((k) => settings.fun[k]);
      track('match_start', { mode: settings.mode, diff: settings.diff, side: settings.team, fun: fun.join(',') || 'none', touch: touchOnly ? 1 : 0 });
    }
    hud.attach(game);
    $('mo-menu').textContent = t(online ? 'backToLobby' : 'menu');
    applySize();
    $('loading').hidden = true;
    $('hud').hidden = false;
    state = 'play';
    if (game.role === 'solo' && portalHold()) {
      state = 'pause';
      $('pause').hidden = false;
      return;
    }
    lockPointer();
    if (touchOnly) goFullscreen();
  }, 30);
}

// on a phone the game wants the whole screen, sideways
function goFullscreen() {
  // on a portal the page sits in its frame, which has its own full screen button
  if (PORTAL) return;
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen)
    el.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock?.('landscape').catch(() => {}))
      .catch(() => {});
}
document.addEventListener('touchend', () => {
  if (touchOnly && (state === 'play' || !$('lobby').hidden) && !document.fullscreenElement) goFullscreen();
});
// a phone turned upright in a solo game: pause, the bots would carry on behind the "turn your phone" screen
matchMedia('(orientation: portrait)').addEventListener?.('change', (e) => {
  if (e.matches && touchOnly && game && game.role === 'solo' && state === 'play') touchPause();
});
function touchPause() {
  if (state !== 'play' || !game || game.over) return;
  if (buyOpen) closeBuy(false);
  state = 'pause';
  $('pause').hidden = false;
  input.fire = false;
}

function closeSettings() {
  $('settings').hidden = true;
  $('controls').hidden = true;
  settingsFrom = 'menu';
}
function toMenu() {
  wantResume = false;
  clearTimeout(hud.xpTimer);
  startGen++;
  closeSettings();
  if (net) {
    net.close();
    net = null;
    lobby = null;
    history.replaceState(null, '', location.pathname + location.search);
  }
  $('lobby').hidden = true;
  if (game) {
    game.dispose();
    game = null;
  }
  state = 'menu';
  paintRank();
  $('hud').hidden = true;
  $('pause').hidden = true;
  $('match-over').hidden = true;
  $('click-to-play').hidden = true;
  closeBuy(false);
  $('menu').hidden = false;
  document.exitPointerLock?.();
  makePreview();
}

function makePreview() {
  if (preview) return;
  preview = new Game(renderer, { team: 'A', mode: 'hostage', diff: 'normal', preview: true }, { center() {}, banner() {}, feed() {}, onRound() {} });
  applySize();
}

// ---------- pointer lock ----------
function lockPointer() {
  if (touchOnly) {
    // no mouse to capture: the game simply goes on
    if (game && state !== 'menu') {
      state = 'play';
      $('pause').hidden = true;
      $('settings').hidden = true;
      $('click-to-play').hidden = true;
    }
    return;
  }
  try {
    const p = canvas.requestPointerLock({ unadjustedMovement: true });
    if (p && p.catch)
      p.catch(() => {
        const p2 = canvas.requestPointerLock();
        if (p2 && p2.catch) p2.catch(() => {});
      });
  } catch {
    try {
      const p2 = canvas.requestPointerLock();
      if (p2 && p2.catch) p2.catch(() => {});
    } catch {
      /* no pointer lock here: the click-to-play panel stays */
    }
  }
}
// the game only goes on once the browser has really given us the mouse
let wantResume = false;
function resume() {
  // after the final whistle there is nothing to go back to
  if (!game) return;
  if (game.over) {
    $('pause').hidden = true;
    $('click-to-play').hidden = true;
    return;
  }
  if (touchOnly) {
    lockPointer();
    goFullscreen();
    return;
  }
  wantResume = true;
  lockPointer();
  setTimeout(() => {
    if (wantResume && state !== 'menu' && game && !game.over && document.pointerLockElement !== canvas) $('click-to-play').hidden = false;
  }, 400);
}
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (locked) {
    $('click-to-play').hidden = true;
    if (wantResume || state === 'pause') {
      $('pause').hidden = true;
      $('settings').hidden = true;
    }
    wantResume = false;
    if (game) state = 'play';
    return;
  }
  if (state === 'play' && game && !game.over && !buyOpen) {
    state = 'pause';
    $('pause').hidden = false;
    input.keys.clear();
    input.fire = false;
  }
});
document.addEventListener('pointerlockerror', () => {
  if (state === 'play') $('click-to-play').hidden = false;
});

// ---------- input ----------
const input = { keys: new Set(), fire: false, menuOpen: false };
const look = { dx: 0, dy: 0 };
let buyOpen = false;
let touchCtl = null;
function enableTouch() {
  if (touchCtl) return;
  touchOnly = true;
  phoneDefaults();
  touchCtl = setupTouch({
    input,
    look,
    getSens: () => settings.tsens ?? 1,
    getGame: () => (state === 'play' ? game : null),
    actions: {
      tap(a) {
        if (!game || state !== 'play') return;
        if (a === 'pause') touchPause();
        else if (a === 'buy') buyOpen ? closeBuy(false) : openBuy();
        else if (a === 'next') {
          const p = game.player;
          const order = [1, 2, 3].filter((n) => p.hasSlot(n));
          const i = order.indexOf(p.cur);
          game.playerAction('slot' + order[(i + 1) % order.length]);
        } else if (a === 'nade') {
          const p = game.player;
          // he grenade first, then the flashes, then the smoke; another tap moves along
          const have = [4, 5, 6].filter((n) => p.hasSlot(n));
          if (have.length) game.playerAction('slot' + have[(have.indexOf(p.cur) + 1) % have.length]);
        } else game.playerAction(a);
      },
      board(on) {
        if (!game) return;
        $('board').hidden = !on;
        if (on) hud.drawBoard(game);
      },
    },
  });
  touchCtl.show(false);
  touchCtl.visible = false;
  touchCtl.label();
  applyTexts();
  // (on a phone this runs while the page is still loading, before net exists)
  try {
    if (net) $('mo-menu').textContent = t('backToLobby');
  } catch {}
  // a game already running carries on with the new controls
  if (game && state === 'pause' && !$('pause').hidden) {
    /* a menu was up: leave it to the player */
  } else if (game && state !== 'menu') lockPointer();
}
if (touchOnly) enableTouch();
else if (!q.has('mouse') && (mobileUA || !matchMedia('(any-pointer: fine)').matches))
  window.addEventListener(
    'touchstart',
    () => {
      if (!touchCtl) enableTouch();
    },
    { once: true, capture: true },
  );
// the page closed in the middle of a match: where it happened
addEventListener('pagehide', () => {
  if ((state === 'play' || state === 'pause') && game && !game.over) game.tele('leave');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    rainSound(false);
    window.speechSynthesis?.cancel();
  }
  setHiddenAudio(document.hidden);
  if (!document.hidden || !touchCtl) return;
  touchCtl.show(false);
  touchCtl.visible = false;
  if (game && game.role === 'solo') touchPause();
});

function openBuy() {
  if (!game || !game.player.alive || game.over) return;
  if (!game.canBuy(game.player)) {
    hud.center(game.mode === 'dm' || game.buyTimeLeft() <= 0 ? t('buyClosed') : t('buyZone'), 1.5);
    sfx('deny');
    return;
  }
  buyOpen = true;
  hud.buyOpen = true;
  input.menuOpen = true;
  input.fire = false;
  hud.refreshBuy();
  $('buy').hidden = false;
  document.exitPointerLock?.();
}
function closeBuy(relock = true) {
  if (!buyOpen) return;
  buyOpen = false;
  hud.buyOpen = false;
  input.menuOpen = false;
  $('buy').hidden = true;
  if (relock && state === 'play') lockPointer();
}
hud.onBuyClosed = () => {
  closeBuy(false);
  if (!touchOnly && state === 'play' && !game?.over && document.pointerLockElement !== canvas) $('click-to-play').hidden = false;
};
function doBuy(item) {
  if (!game) return;
  // a gun is the whole purchase: the menu goes away once it is in hand (armour and grenades keep it open)
  const gun = WEAPONS[item];
  if (gun && game.role === 'client' && game.mode !== 'dm' && game.player.money < gun.price) {
    sfx('deny');
    hud.center(t('noMoney'), 1.2);
    return;
  }
  const r = game.buy(game.player, item);
  if (r === 'sent') {
    // the host answers
    if (gun) closeBuy();
    return;
  }
  if (r === 'ok') {
    sfx('buy');
    if (gun) {
      closeBuy();
      return;
    }
  } else {
    sfx('deny');
    if (r === 'money') hud.center(t('noMoney'), 1.2);
    if (r === 'have') hud.center(t('haveIt'), 1.2);
    if (r === 'time') {
      hud.center(t('buyClosed'), 1.2);
      closeBuy();
    }
  }
  hud.refreshBuy();
}
$('buy-grid').addEventListener('click', (e) => {
  const b = e.target.closest('.buy-item');
  if (b) doBuy(b.dataset.item);
});
$('buy').addEventListener('mousedown', (e) => e.stopPropagation());
$('buy-close').addEventListener('click', () => closeBuy(!touchOnly));

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (!$('controls').hidden) $('controls').hidden = true;
    else if (!$('settings').hidden) $('s-back').click();
    else if (state === 'pause' && game && !$('pause').hidden && !game.over) {
      if (touchOnly) resume();
      return;
    }
  }
  if (state !== 'play' || !game) return;
  if (e.code === 'Tab') {
    e.preventDefault();
    $('board').hidden = false;
    hud.drawBoard(game);
    return;
  }
  if (e.repeat) return;
  if (buyOpen) {
    const it = BUY_ITEMS.find((b) => 'Digit' + b.key === e.code || 'Numpad' + b.key === e.code || 'Key' + b.key === e.code);
    if (it) {
      doBuy(it.item);
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyB' || e.code === 'Escape') {
      closeBuy(e.code === 'KeyB');
      if (e.code === 'Escape' && !touchOnly && game && !game.over) {
        state = 'pause';
        $('pause').hidden = false;
        input.keys.clear();
        input.fire = false;
      }
      e.preventDefault();
      return;
    }
  }
  input.keys.add(e.code);
  if (e.code === 'Space') input.jumpTap = true;
  // keep Ctrl+R, Ctrl+1.. and friends from reloading or switching tabs while crouching
  if (e.ctrlKey || e.metaKey || ['Space', 'ArrowUp', 'ArrowDown', 'ControlLeft', 'ControlRight', 'KeyS', 'KeyW', 'KeyR', 'KeyD', 'KeyB', 'KeyE', 'KeyF'].includes(e.code)) e.preventDefault();
  const map = { Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3', Digit4: 'slot4', Digit5: 'slot5', Digit6: 'slot6', KeyQ: 'last', KeyR: 'reload', KeyE: 'use', KeyF: 'inspect', KeyT: 'spray' };
  if (map[e.code]) game.playerAction(map[e.code]);
  if (e.code === 'KeyB') openBuy();
});
for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, () => initAudio(), { capture: true, passive: true });
window.addEventListener('keyup', (e) => {
  input.keys.delete(e.code);
  // macOS sends no keyup for keys let go while Cmd was down (a screenshot): drop them all with it
  if (e.code === 'MetaLeft' || e.code === 'MetaRight') input.keys.clear();
  if (e.code === 'Tab') $('board').hidden = true;
});
window.addEventListener('blur', () => {
  $('board').hidden = true;
  input.keys.clear();
  input.fire = false;
});
canvas.addEventListener('mousedown', (e) => {
  if (state !== 'play' || !game) return;
  if (document.pointerLockElement !== canvas) {
    if (!buyOpen) lockPointer();
    return;
  }
  if (e.button === 0) {
    input.fire = true;
    if (!game.player.alive) game.playerAction('next');
  }
  if (e.button === 2) game.playerAction('alt');
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) input.fire = false;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  // ignore the occasional huge jump some browsers report
  if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
  look.dx += e.movementX;
  look.dy += e.movementY;
});
let wheelSum = 0, wheelAt = 0, wheelLast = 0;
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (state !== 'play' || !game || !game.player.alive || buyOpen) return;
  const now = performance.now();
  if (now - wheelLast > 400) wheelSum = 0;
  wheelLast = now;
  wheelSum += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
  if (Math.abs(wheelSum) < 50 || now - wheelAt < 140) return;
  wheelAt = now;
  const down = wheelSum > 0;
  wheelSum = 0;
  const p = game.player;
  const order = [1, 2, 3, 4, 5, 6].filter((n) => p.hasSlot(n));
  const i = order.indexOf(p.cur);
  const n = order[(i + (down ? 1 : -1) + order.length) % order.length];
  game.playerAction('slot' + n);
});

// ---------- the host in a background tab ----------
// requestAnimationFrame stops in a hidden tab, and plain timers are slowed to a crawl; a worker's timer is not.
let bgLast = performance.now();
try {
  const ticker = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 50)'], { type: 'text/javascript' })));
  ticker.onmessage = () => {
    const now = performance.now();
    if (!document.hidden || !game || game.role === 'solo' || state === 'menu') {
      bgLast = now;
      return;
    }
    const dt = Math.min(0.1, (now - bgLast) / 1000);
    bgLast = now;
    game.update(dt, { keys: new Set(), fire: false, menuOpen: true });
  };
} catch {
  /* no workers: the match pauses with the tab, as before */
}

// ---------- loop ----------
let last = performance.now();
let fps = 60, frames = 0, fpsAt = last, slowFor = 0, fastFor = 0;
function frame(now) {
  requestAnimationFrame(frame);
  portalGameplay(state === 'play' && !!game && !game.over, !game ? 'quit' : game.over ? (game.matchWin ? 'win' : 'lose') : null);
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  frames++;
  if (now - fpsAt > 500) {
    fps = Math.round((frames * 1000) / (now - fpsAt));
    frames = 0;
    fpsAt = now;
    // automatic resolution: drop when slow, climb back when there is headroom
    if (settings.quality === 'auto' && state === 'play') {
      // a steady 30 is a capped display or Chrome's energy saver, not a slow GPU
      const capped30 = Math.abs(fps - 30) <= 2;
      if (fps < 50 && !capped30) slowFor++;
      else slowFor = 0;
      if (fps > 58) fastFor++;
      else fastFor = 0;
      if (slowFor >= 4 && scale > 0.5) {
        scale = Math.max(0.5, scale - 0.15);
        slowFor = 0;
        applySize();
      } else if (fastFor >= 20 && scale < 1) {
        scale = Math.min(1, scale + 0.1);
        fastFor = 0;
        applySize();
      }
    }
  }
  if (touchCtl) {
    document.body.classList.toggle('playing', !!game && state !== 'menu');
    const on = state === 'play' && !!game && !buyOpen;
    if (on !== touchCtl.visible) touchCtl.show((touchCtl.visible = on), buyOpen && !!game && state === 'play');
    if (on) touchCtl.update(game);
  }
  if (state === 'play' && game && !(game.role === 'solo' && portalHold())) {
    // two smaller steps when the frame is long keeps collisions honest
    const steps = dt > 1 / 40 ? 2 : 1;
    for (let i = 0; i < steps; i++) game.update(dt / steps, input);
    input.jumpTap = false;
    game.visual(dt);
    game.render(dt, look, settings);
    hud.update(game, now, settings, fps);
  } else if (state === 'pause' && game) {
    if (game.role === 'solo' && game.rain) rainSound(false);
    // online the match goes on behind the menu
    if (game.role !== 'solo') {
      game.update(dt, { keys: new Set(), fire: false, menuOpen: true });
      game.visual(dt);
      hud.update(game, now, settings, fps);
    }
    // a paused solo game stands still: a few frames a second are enough (settings changes still show)
    if (game.role !== 'solo' || now - (frame.pausedAt || 0) > 200) {
      frame.pausedAt = now;
      game.render(game.role !== 'solo' ? dt : 0, { dx: 0, dy: 0 }, settings);
    }
  } else if (preview) {
    // the menu fly-around at half the frame rate: it is only a backdrop
    frame.odd = !frame.odd;
    if (frame.odd) renderPreview(preview, now / 1000);
  }
  look.dx = look.dy = 0;
}

// slow fly-around behind the menu
function renderPreview(g, time) {
  const cam = g.camera;
  const a = time * 0.04;
  const cx = 36, cz = 34;
  const r = 52;
  cam.position.set(cx + Math.sin(a) * r, 19 + Math.sin(a * 0.7) * 3, cz + Math.cos(a) * r * 0.85);
  cam.lookAt(cx, 2, cz);
  if (Math.abs(cam.fov - 55) > 0.01) {
    cam.fov = 55;
    cam.updateProjectionMatrix();
  }
  g.fx.update(0.016);
  for (const s of g.soldiers) {
    s.body.root.visible = true;
    s.body.root.position.set(s.x, s.feet, s.z);
    s.body.root.rotation.y = s.yaw;
    s.body.animate({ dt: 0.016, speed: 0, crouch: 0, pitch: 0, y: 0 });
  }
  renderer.autoClear = true;
  renderer.render(g.scene, cam);
}

// ---------- start ----------
applyTexts();
applySize();
// the rigged people load first (a few MB); the procedural bodies stand in if that fails
$('loading').hidden = false;
const assetsReady = Promise.all([
  loadPeople().catch((e) => console.warn('people models failed, using simple bodies', e)),
  loadProps().catch((e) => console.warn('furniture models failed, keeping the boxes', e)),
])
  .finally(() => {
    $('loading').hidden = true;
    if (!q.has('shot')) makePreview();
    portalReady();
    const m = location.hash.match(/room=([A-Z0-9]{4,8})/i);
    if (m && !PORTAL) openLobby(m[1].toUpperCase());
  });
addEventListener('hashchange', () => {
  const m = location.hash.match(/room=([A-Z0-9]{4,8})/i);
  if (!m || PORTAL || game) return;
  const code = m[1].toUpperCase();
  if (net && net.code === code) return;
  openLobby(code);
});
if (PORTAL) $('online').hidden = true;
// the platform's own menu or an ad pauses a solo match
onPortalHold(() => {
  if (!game || state !== 'play' || game.role !== 'solo' || game.over) return;
  if (touchOnly) touchPause();
  else document.exitPointerLock?.();
});

// leaving the page mid-match asks first
window.addEventListener('beforeunload', (e) => {
  if (game && (state === 'play' || state === 'pause') && !game.over) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ---------- online: room, lobby, match ----------
let net = null;
let lobby = null; // the host's truth: { mode, diff, teams: {peer: team}, names: {peer: name} }
const NAME_KEY = 'breach.name';
function myName() {
  let n = '';
  try {
    n = localStorage.getItem(NAME_KEY) || '';
  } catch {}
  return n || (lang === 'ru' ? 'Игрок' : 'Player') + Math.floor(10 + Math.random() * 89);
}

function openLobby(code) {
  initAudio();
  closeSettings();
  if (net) net.close();
  knownPeers = null;
  lobby = { mode: settings.mode, diff: settings.diff, teams: {}, names: {}, started: false };
  const name = myName();
  $('lb-name').value = name;
  $('lb-code').textContent = code;
  const link = `${location.origin}${location.pathname}#room=${code}`;
  $('lb-link').value = link;
  history.replaceState(null, '', `${location.pathname}${location.search}#room=${code}`);
  $('menu').hidden = true;
  $('lobby').hidden = false;
  $('lb-status').textContent = t('connecting');
  net = new Net(code, name, {
    onStatus: (s) => {
      if (s === 'full' || s === 'replaced') {
        toMenu();
        alertBox(t(s === 'full' ? 'roomFull' : 'tabReplaced'));
        return;
      }
      if (s === 'lost') {
        lobbyNote(t('lostConn'));
        if (game && !net.lostShown) {
          net.lostShown = true;
          hud.notice?.('📶 ' + t('lostConn'));
        }
      }
      renderLobby();
    },
    onReconnected: () => {
      if (!net) return;
      if (net.lostShown && game) hud.notice?.('✅ ' + t('backConn'));
      net.lostShown = false;
      askSync();
    },
    onPeers: () => {
      if (net.isHost) hostSync();
      renderLobby();
      announcePeers();
    },
    onLeave: (peer) => {
      if (!net.isHost) return;
      delete lobby.teams[peer];
      const s = game?.soldiers.find((o) => o.peer === peer);
      if (s && game.role === 'host') {
        const pool = lang === 'ru' ? BOT_NAMES[s.team] : BOT_NAMES[s.team + 'en'];
        game.botify(s, pool[s.id % pool.length]);
        net.broadcast({ k: 'roster', roster: game.roster() });
      }
      hostSync();
    },
    onHostLeft: () => {
      if (net && (!game || game.over)) {
        // still in the lobby (or the match is over): the next one in becomes the host and the room carries on
        if (game) backToLobby(false);
        if (net.isHost) hostSync();
        renderLobby();
        return;
      }
      // the match lives on the host's machine; without it everyone goes back to the menu
      if (net && !net.isHost) {
        toMenu();
        setTimeout(() => hud.center?.(t('hostLeft'), 3), 50);
        alertBox(t('hostLeft'));
      } else if (net && net.isHost && game && game.role === 'client') {
        toMenu();
        alertBox(t('hostLeft'));
      } else renderLobby();
    },
    onMessage: (from, m) => onNetMessage(from, m),
  });
}

// "Ann joined" / "Ann left", in the lobby status line and in the game's feed
let knownPeers = null;
function announcePeers() {
  if (!net) return;
  const now = new Map(net.peers.map((p) => [p.peer, (lobby && lobby.names[p.peer]) || p.name]));
  if (knownPeers) {
    const say = (text) => {
      if (game) hud.notice?.(text);
      lobbyNote(text);
      sfx('use');
    };
    for (const [id, name] of now) if (id !== net.id && !knownPeers.has(id)) say(`🟢 ${name} ${t('joined')}`);
    for (const [id, name] of knownPeers) if (id !== net.id && !now.has(id)) say(`⚪ ${name} ${t('left')}`);
  }
  knownPeers = now;
}

let lobbyNoteUntil = 0;
function lobbyNote(text) {
  $('lb-status').textContent = text;
  lobbyNoteUntil = performance.now() + 4000;
}

function alertBox(text) {
  $('lb-status').textContent = text;
  const note = $('menu-note');
  note.textContent = text;
  note.hidden = false;
  clearTimeout(alertBox.t);
  alertBox.t = setTimeout(() => (note.hidden = true), 8000);
  const el = $('center-msg');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

function hostSync() {
  if (!net || !net.isHost) return;
  // everyone in the room gets a team: the smaller one
  for (const p of net.peers) {
    if (!lobby.teams[p.peer]) {
      const a = Object.values(lobby.teams).filter((x) => x === 'A').length;
      const b = Object.values(lobby.teams).filter((x) => x === 'B').length;
      lobby.teams[p.peer] = a <= b ? 'A' : 'B';
    }
    if (!lobby.names[p.peer]) lobby.names[p.peer] = p.name;
  }
  for (const k of Object.keys(lobby.teams)) if (!net.peers.some((p) => p.peer === k)) delete lobby.teams[k];
  lobby.started = !!(game && game.role === 'host' && !game.over);
  lobby.fun = settings.fun;
  net.broadcast({ k: 'lobby', ...lobby });
  // a friend arriving mid-match takes a bot's place
  if (game && game.role === 'host' && !game.over) {
    for (const p of net.peers) {
      if (p.peer === net.id || game.soldiers.some((s) => s.peer === p.peer)) continue;
      const s = game.addHuman(p.peer, lobby.names[p.peer] || p.name);
      if (!s) continue;
      lobby.teams[p.peer] = s.team;
      s.sentStartAt = performance.now();
      net.send(p.peer, { k: 'start', roster: game.roster(), mode: game.opts.mode, diff: game.opts.diff, fun: game.fun });
      game.nh?.sendDropsTo(p.peer);
      net.broadcast({ k: 'roster', roster: game.roster() }, true, p.peer);
    }
  }
  renderLobby();
}

setInterval(() => !document.getElementById('lobby').hidden && renderLobby(), 1000);
function renderLobby() {
  if (!net || !lobby) return;
  const list = { A: [], B: [] };
  for (const p of net.peers) {
    const team = lobby.teams[p.peer];
    if (!team) continue;
    const me = p.peer === net.id;
    const tag = [p.peer === net.hostId ? t('host') : '', net.isHost && !me ? (net.linkState(p.peer) === 'p2p' ? t('linkDirect') : net.linkState(p.peer) === 'relay' ? t('linkRelay') : '…') : ''].filter(Boolean).join(', ');
    list[team].push(`<li class="${me ? 'me' : ''}">${esc(lobby.names[p.peer] || p.name)}${tag ? ` <small>${tag}</small>` : ''}</li>`);
  }
  for (const team of ['A', 'B']) {
    const bots = Math.max(0, 5 - list[team].length);
    if (bots) list[team].push(`<li class="bot">+ ${bots} ${botWord(bots)}</li>`);
    $('lb-' + team.toLowerCase()).innerHTML = list[team].join('');
  }
  for (const [id, key] of [['lb-mode', 'mode'], ['lb-diff', 'diff']]) for (const b of $(id).querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === lobby[key]);
  $('lb-opts').classList.toggle('locked', !net.isHost);
  $('lb-start').hidden = !net.isHost;
  const fun = Object.entries((net.isHost ? settings.fun : lobby.fun) || {}).filter(([, on]) => on).map(([k]) => [...document.querySelectorAll('#seg-fun [data-f]')].find((b) => b.dataset.f === k)?.dataset.t)
    .filter(Boolean)
    .map((k) => t(k));
  $('lb-fun').textContent = fun.length ? `${t('fun')}: ${fun.join(', ')}` : '';
  if (performance.now() < (lobbyNoteUntil || 0)) return;
  $('lb-status').textContent = net.isHost ? '' : lobby.started ? t('inMatch') : t('waitHost');
}

function botWord(n) {
  if (lang !== 'ru') return n === 1 ? 'bot' : 'bots';
  return n === 1 ? 'бот' : n < 5 ? 'бота' : 'ботов';
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

for (const [id, key] of [['lb-mode', 'mode'], ['lb-diff', 'diff']])
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !net?.isHost) return;
    lobby[key] = b.dataset.v;
    sfx('click');
    hostSync();
  });
for (const el of document.querySelectorAll('.lb-team'))
  el.addEventListener('click', () => {
    if (!net) return;
    const team = el.dataset.team;
    const count = Object.entries(lobby.teams).filter(([p, x]) => x === team && p !== net.id).length;
    if (count >= 5) {
      lobbyNote(t('teamFull'));
      return;
    }
    sfx('click');
    if (net.isHost) {
      lobby.teams[net.id] = team;
      hostSync();
    } else net.toHost({ k: 'team', team });
  });
$('lb-name').addEventListener('change', () => {
  const n = $('lb-name').value.trim().slice(0, 16);
  if (!n || !net) return;
  try {
    localStorage.setItem(NAME_KEY, n);
  } catch {}
  if (net.isHost) {
    lobby.names[net.id] = n;
    hostSync();
  } else net.toHost({ k: 'name', name: n });
});
$('lb-copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('lb-link').value);
  } catch {
    $('lb-link').select();
    document.execCommand('copy');
  }
  lobbyNote(t('copied'));
};
$('lb-leave').onclick = () => toMenu();
$('lb-start').onclick = () => {
  if (!net?.isHost) return;
  // humans first in their team, bots fill the rest; ids 0-4 assault, 5-9 guards
  const roster = [];
  for (const team of ['A', 'B']) {
    const humans = net.peers.filter((p) => lobby.teams[p.peer] === team).slice(0, 5);
    const pool = (lang === 'ru' ? BOT_NAMES[team] : BOT_NAMES[team + 'en']).slice();
    for (let i = 0; i < 5; i++) {
      const h = humans[i];
      roster.push({ id: roster.length, team, name: h ? lobby.names[h.peer] || h.name : pool[i], peer: h ? h.peer : null });
    }
  }
  lobby.started = true;
  net.broadcast({ k: 'start', roster, mode: lobby.mode, diff: lobby.diff, fun: settings.fun });
  startGame({ role: 'host', roster, myPeer: net.id, mode: lobby.mode, diff: lobby.diff, team: lobby.teams[net.id], fun: settings.fun });
  setTimeout(hostSync, 100);
};

function onNetMessage(from, m) {
  if (!net) return;
  if (net.isHost) {
    if (m.k === 'team') {
      if (m.team !== 'A' && m.team !== 'B') return;
      const count = Object.entries(lobby.teams).filter(([p, x]) => x === m.team && p !== from).length;
      if (count < 5 && !(game && game.role === 'host' && !game.over)) lobby.teams[from] = m.team;
      hostSync();
    } else if (m.k === 'name') {
      const nm = String(m.name ?? '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 16);
      if (!nm) return;
      lobby.names[from] = nm;
      const s = game?.soldiers.find((o) => o.peer === from);
      if (s) {
        s.name = lobby.names[from];
        net.broadcast({ k: 'roster', roster: game.roster() });
      }
      hostSync();
    } else if (m.k === 'sync') {
      if (!game || game.role !== 'host' || game.over) return;
      const s = game.soldiers.find((o) => o.peer === from);
      // not in the match yet: hostSync gives them a bot's place and the start
      if (!s) return hostSync();
      // a new tab (page reloaded): it needs the whole match first
      if (!m.has) {
        // (a friend who has only just been given a place already has the start on its way)
        if (performance.now() - (s.sentStartAt || 0) < 4000) return;
        s.sentStartAt = performance.now();
        net.send(from, { k: 'start', roster: game.roster(), mode: game.opts.mode, diff: game.opts.diff, fun: game.fun });
        game.nh?.sendDropsTo(from);
      }
      game.nh?.sendState(from, s, m.has ? !!m.alive : true);
    } else if (game && game.nh && game.role === 'host') game.nh.onHostMessage(from, m);
    return;
  }
  if (m.k === 'lobby') {
    lobby = m;
    if (!m.started && game && game.role === 'client' && !game.over && game.time > 5) {
      const gNow = game;
      setTimeout(() => {
        if (game === gNow && !game.over && lobby && !lobby.started) backToLobby(false);
      }, 1500);
    }
    renderLobby();
    if (m.started && !game) askSync();
  } else if (m.k === 'start') {
    pending.length = 0;
    const me = m.roster.find((r) => r.peer === net.id);
    if (!me) return;
    startGame({ role: 'client', roster: m.roster, myPeer: net.id, mode: m.mode, diff: m.diff, team: me.team, fun: m.fun || {} });
  } else if (m.k === 'roster') {
    if (game) for (const r of m.roster) if (game.soldiers[r.id]) game.soldiers[r.id].name = r.name;
  } else if (m.k === 'toLobby') {
    if (game && game.role === 'client') backToLobby(false);
  } else if (game && game.nh) game.nh.onClientMessage(m);
  else if (m.k !== 's') pending.push(m);
}
const pending = [];
let syncAt = 0;
function askSync() {
  if (!net || net.isHost || performance.now() < syncAt) return;
  syncAt = performance.now() + 2500;
  const inMatch = !!(game && game.role === 'client');
  net.toHost({ k: 'sync', has: inMatch ? 1 : 0, alive: inMatch && game.player.alive ? 1 : 0 });
}

function backToLobby(announce) {
  wantResume = false;
  startGen++;
  closeSettings();
  if (game) {
    game.dispose();
    game = null;
  }
  state = 'menu';
  closeBuy(false);
  $('hud').hidden = true;
  $('pause').hidden = true;
  $('match-over').hidden = true;
  $('click-to-play').hidden = true;
  document.exitPointerLock?.();
  makePreview();
  $('lobby').hidden = false;
  if (announce && net?.isHost) net.broadcast({ k: 'toLobby' });
  if (net?.isHost) hostSync();
  renderLobby();
}
// ?shot — a staged frame for the cover pictures (no HUD, no menu)
if (q.has('shot')) {
  $('menu').hidden = true;
  assetsReady.then(() => {
    if (preview) preview.dispose();
    preview = null;
    game = new Game(renderer, { team: 'A', mode: 'hostage', diff: 'normal' }, { center() {}, banner() {}, feed() {}, onRound() {}, hit() {}, hurt() {} });
    scale = 2;
    applySize();
    const g = game, p = g.player;
    g.phase = 'live';
    g.phaseEnd = 1e9;
    p.x = 37.2;
    p.z = 43.2;
    p.yaw = 0.06;
    p.pitch = 0.02;
    g.giveWeapon(p, 'rifle');
    p.switchSlot(1, true);
    const B = g.soldiers.filter((s) => s.team === 'B');
    const A = g.soldiers.filter((s) => s.team === 'A' && !s.isPlayer);
    const put = (s, x, z, tx, tz, kind, crouch = 0) => {
      s.x = x;
      s.z = z;
      s.yaw = Math.atan2(-(tx - x), -(tz - z));
      s.pitch = 0.02;
      g.giveWeapon(s, kind);
      s.switchSlot(kind === 'deagle' ? 2 : 1, true);
      s.crouchK = crouch;
      s.brain = null;
    };
    put(B[0], 31.4, 33.1, 37, 43, 'rifle');
    put(B[1], 39.6, 30.4, 37, 43, 'smg');
    put(B[2], 41.6, 34.6, 36, 43, 'rifle', 1);
    put(A[0], 32.9, 41.6, 33, 32, 'rifle');
    for (const s of [...B.slice(3), ...A.slice(1)]) s.alive = false, (s.body.root.visible = false);
    g.hostages[0].x = 35.6;
    g.hostages[0].z = 27.4;
    g.hostages[0].yaw = Math.PI;
    g.hostages[1].body.root.visible = false;
    g.hostages[1].state = 'rescued';
    g.update(0.016, { keys: new Set(), fire: false });
    for (const s of g.soldiers) s.body.root.visible = s.alive && !s.isPlayer;
    // shots in flight
    B[1].kick = 1;
    g.fx.flash(39.9, 1.33, 31.0, 0.55, 99);
    g.fx.flash(31.75, 1.33, 33.7, 0.5, 99);
    g.fx.tracer(39.9, 1.33, 31.0, 37.6, 1.5, 41.5, 1);
    g.fx.tracer(31.75, 1.33, 33.7, 36.5, 1.45, 40.8, 1);
    g.fx.tr.forEach((t) => (t.life = t.max = 99));
    g.vm.draw = 0;
    g.vm.flashT = 99;
    g.vm.kick = 0.5;
    for (let i = 0; i < 6; i++) g.fx.decal(30.5 + 0.2 + Math.random() * 0.6, 1.2 + Math.random() * 0.8, 34, 0, 0, 1);
    state = 'shot';
    if (q.get('shot') !== 'in') {
      // outside: the assault team storms the front of the mansion
      for (const s of g.soldiers) s.alive = true;
      const all = [...B, ...A];
      const plan = [
        [B[0], 35.4, 45.6, 31, 52, 'rifle'],
        [B[1], 30.2, 45.3, 28, 52, 'smg'],
        [B[2], 41.2, 45.3, 33, 52, 'rifle'],
        [A[0], 31.75, 56.6, 35.4, 45.8, 'rifle', 0],
        [A[1], 29.6, 50.2, 33, 46.5, 'smg'],
        [A[2], 24.6, 52.6, 30, 46, 'rifle'],
        [A[3], 40.2, 52.9, 41.2, 45.6, 'shotgun'],
      ];
      for (const s of all) (s.alive = false), (s.body.root.visible = false);
      for (const [s, x, z, tx, tz, k, c] of plan) {
        s.alive = true;
        put(s, x, z, tx, tz, k, c || 0);
      }
      for (const h of g.hostages) h.body.root.visible = false;
      g.fx.clear();
      g.update(0.016, { keys: new Set(), fire: false });
      for (const [s, , , , , , c] of plan) {
        s.crouchK = c || 0;
        s.body.root.visible = true;
        s.body.animate({ dt: 0.001, speed: s === A[1] ? 5 : 0, crouch: s.crouchK, pitch: 0.05, y: 0 });
      }
      A[1].body.walkPhase = 1.2;
      A[1].body.animate({ dt: 0.0001, speed: 5.5, crouch: 0, pitch: 0.02, y: 0 });
      const muzzle = (s) => [s.x - Math.sin(s.yaw) * 0.72 + Math.cos(s.yaw) * 0.12, s.feet + s.eyeH() - 0.28, s.z - Math.cos(s.yaw) * 0.72 - Math.sin(s.yaw) * 0.12];
      const shoot = (s, tx, ty, tz) => {
        const m = muzzle(s);
        g.fx.flash(m[0], m[1], m[2], 0.95, 99);
        g.fx.tracer(m[0], m[1], m[2], tx, ty, tz, 1);
      };
      shoot(B[0], 31.9, 1.4, 56.2);
      shoot(A[0], 35.35, 1.55, 46.1);
      shoot(B[1], 29.9, 1.3, 50.6);
      shoot(A[3], 41.1, 1.5, 46.2);
      g.fx.tr.forEach((t) => (t.life = t.max = 99));
      for (let i = 0; i < 12; i++) g.fx.decal(33.1 + Math.random() * 0.8, 0.9 + Math.random() * 2.4, 46.0, 0, 0, 1);
      g.fx.puff(35.0, 1.4, 46.3, [0.8, 0.78, 0.72], 0.8, 99, 0, 0.35);
      const cam = g.camera;
      const cp = (q.get('cam') || '30.15,1.75,59.4,35.75,3.1,46.2,47').split(',').map(Number);
      cam.position.set(cp[0], cp[1], cp[2]);
      cam.lookAt(cp[3], cp[4], cp[5]);
      cam.fov = cp[6];
      cam.updateProjectionMatrix();
      const loop2 = () => {
        renderer.autoClear = true;
        renderer.render(g.scene, cam);
        document.body.dataset.ready = '1';
        requestAnimationFrame(loop2);
      };
      loop2();
      return;
    }
    const loop = () => {
      g.fx.update(0);
      g.render(0, { dx: 0, dy: 0 }, settings);
      document.body.dataset.ready = '1';
      requestAnimationFrame(loop);
    };
    loop();
  });
}

if (q.has('debug')) window.__breach = { get game() { return game; }, get preview() { return preview; }, get net() { return net; }, startGame, settings };
requestAnimationFrame(frame);
