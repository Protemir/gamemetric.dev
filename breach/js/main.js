// Boot, menus, settings, input and the main loop.
import * as THREE from '../vendor/three.module.min.js';
import { Game } from './game.js';
import { Hud, BUY_ITEMS } from './hud.js';
import { initAudio, setVolume, sfx } from './audio.js';
import { t, lang, setLang } from './i18n.js';
import { loadPeople } from './people.js';
import { loadProps } from './props.js';
import { Net, newCode } from './net.js';
import { NetGame } from './netgame.js';
import { BOT_NAMES } from './i18n.js';
import { WEAPONS } from './weapons.js';

const $ = (id) => document.getElementById(id);
const canvas = $('view');
const q = new URLSearchParams(location.search);

// ---------- settings ----------
const DEF = { sens: 1.2, fov: 74, vol: 0.8, quality: 'auto', showFps: false, team: 'A', mode: 'hostage', diff: 'normal' };
let settings = { ...DEF };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem('breach.settings') || '{}'));
} catch {
  /* ignore */
}
const save = () => {
  try {
    localStorage.setItem('breach.settings', JSON.stringify(settings));
  } catch {
    /* blocked */
  }
};
setVolume(settings.vol);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
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
function applyTexts() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const b of document.querySelectorAll('.langs button')) b.classList.toggle('on', b.dataset.lang === lang);
  document.title = lang === 'ru' ? 'Штурм особняка — тактический шутер 5 на 5 в браузере | GameMetric' : 'Mansion Breach — 5v5 tactical shooter in your browser | GameMetric';
  $('ctrl-list').innerHTML = t('ctrl').map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}
for (const b of document.querySelectorAll('.langs button'))
  b.addEventListener('click', () => {
    setLang(b.dataset.lang);
    location.search = `?lang=${b.dataset.lang}`;
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
  });
  set();
}
seg('seg-mode', 'mode');
seg('seg-diff', 'diff');
seg('seg-q', 'quality');
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

const touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
if (touchOnly) $('pc-only').hidden = false;

function slider(id, key, fmt) {
  const el = $('s-' + id), out = $('o-' + id);
  el.value = settings[key];
  out.textContent = fmt(settings[key]);
  el.addEventListener('input', () => {
    settings[key] = +el.value;
    out.textContent = fmt(settings[key]);
    if (key === 'vol') setVolume(settings.vol);
    save();
  });
}
slider('sens', 'sens', (v) => (+v).toFixed(2));
slider('fov', 'fov', (v) => `${v}°`);
slider('vol', 'vol', (v) => `${Math.round(v * 100)}%`);
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
$('p-quit').onclick = () => toMenu();
$('mo-menu').onclick = () => (net ? backToLobby(true) : toMenu());
$('mo-again').onclick = () => startGame();
$('play').onclick = () => startGame();
$('online').onclick = () => openLobby(newCode());
$('click-to-play').onclick = () => resume();

function startGame(online) {
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
    } else game = new Game(renderer, { team: settings.team, mode: settings.mode, diff: settings.diff }, hud);
    hud.attach(game);
    $('mo-menu').textContent = t(online ? 'backToLobby' : 'menu');
    applySize();
    $('loading').hidden = true;
    $('hud').hidden = false;
    state = 'play';
    lockPointer();
  }, 30);
}

function toMenu() {
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
  if (touchOnly) return;
  try {
    const p = canvas.requestPointerLock({ unadjustedMovement: true });
    if (p && p.catch) p.catch(() => canvas.requestPointerLock());
  } catch {
    canvas.requestPointerLock();
  }
}
// the game only goes on once the browser has really given us the mouse
let wantResume = false;
function resume() {
  wantResume = true;
  lockPointer();
  setTimeout(() => {
    if (wantResume && document.pointerLockElement !== canvas) $('click-to-play').hidden = false;
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

function openBuy() {
  if (!game || !game.player.alive) return;
  if (!game.canBuy(game.player)) {
    hud.center(game.mode !== 'dm' && game.buyTimeLeft() <= 0 ? t('buyClosed') : t('buyZone'), 1.5);
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
hud.onBuyClosed = () => closeBuy();
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

window.addEventListener('keydown', (e) => {
  if (state !== 'play' || !game) return;
  if (e.code === 'Tab') {
    e.preventDefault();
    $('board').hidden = false;
    hud.drawBoard(game);
    return;
  }
  if (e.repeat) return;
  if (buyOpen) {
    const it = BUY_ITEMS.find((b) => 'Digit' + b.key === e.code || 'Numpad' + b.key === e.code);
    if (it) {
      doBuy(it.item);
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyB' || e.code === 'Escape') {
      closeBuy();
      e.preventDefault();
      return;
    }
  }
  input.keys.add(e.code);
  // keep Ctrl+R, Ctrl+1.. and friends from reloading or switching tabs while crouching
  if (e.ctrlKey || e.metaKey || ['Space', 'ArrowUp', 'ArrowDown', 'ControlLeft', 'ControlRight', 'KeyS', 'KeyW', 'KeyR', 'KeyD', 'KeyB', 'KeyE', 'KeyF'].includes(e.code)) e.preventDefault();
  const map = { Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3', Digit4: 'slot4', Digit5: 'slot5', KeyQ: 'last', KeyR: 'reload', KeyE: 'use', KeyF: 'use' };
  if (map[e.code]) game.playerAction(map[e.code]);
  if (e.code === 'KeyB') openBuy();
});
window.addEventListener('keyup', (e) => {
  input.keys.delete(e.code);
  if (e.code === 'Tab') $('board').hidden = true;
});
window.addEventListener('blur', () => {
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
canvas.addEventListener('wheel', (e) => {
  if (state !== 'play' || !game || !game.player.alive) return;
  const p = game.player;
  const order = [1, 2, 3, 4, 5].filter((n) => p.hasSlot(n));
  const i = order.indexOf(p.cur);
  const n = order[(i + (e.deltaY > 0 ? 1 : -1) + order.length) % order.length];
  game.playerAction('slot' + n);
});

// ---------- loop ----------
let last = performance.now();
let fps = 60, frames = 0, fpsAt = last, slowFor = 0, fastFor = 0;
function frame(now) {
  requestAnimationFrame(frame);
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
  if (state === 'play' && game) {
    // two smaller steps when the frame is long keeps collisions honest
    const steps = dt > 1 / 40 ? 2 : 1;
    for (let i = 0; i < steps; i++) game.update(dt / steps, input);
    game.render(dt, look, settings);
    hud.update(game, now, settings, fps);
  } else if (state === 'pause' && game) {
    // online the match goes on behind the menu
    if (game.role !== 'solo') {
      game.update(dt, { keys: new Set(), fire: false, menuOpen: true });
      hud.update(game, now, settings, fps);
    }
    game.render(game.role !== 'solo' ? dt : 0, { dx: 0, dy: 0 }, settings);
  } else if (preview) {
    renderPreview(preview, now / 1000);
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
    const m = location.hash.match(/room=([A-Z0-9]{4,8})/i);
    if (m) openLobby(m[1].toUpperCase());
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
  if (net) net.close();
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
      if (s === 'lost') $('lb-status').textContent = t('lostConn');
      renderLobby();
    },
    onPeers: () => {
      if (net.isHost) hostSync();
      renderLobby();
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
  net.broadcast({ k: 'lobby', ...lobby });
  // a friend arriving mid-match takes a bot's place
  if (game && game.role === 'host' && !game.over) {
    for (const p of net.peers) {
      if (p.peer === net.id || game.soldiers.some((s) => s.peer === p.peer)) continue;
      const s = game.addHuman(p.peer, lobby.names[p.peer] || p.name);
      if (!s) continue;
      lobby.teams[p.peer] = s.team;
      net.send(p.peer, { k: 'start', roster: game.roster(), mode: game.mode, diff: game.opts.diff });
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
      $('lb-status').textContent = t('teamFull');
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
  $('lb-status').textContent = t('copied');
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
  net.broadcast({ k: 'start', roster, mode: lobby.mode, diff: lobby.diff });
  startGame({ role: 'host', roster, myPeer: net.id, mode: lobby.mode, diff: lobby.diff, team: lobby.teams[net.id] });
  setTimeout(hostSync, 100);
};

function onNetMessage(from, m) {
  if (!net) return;
  if (net.isHost) {
    if (m.k === 'team') {
      const count = Object.entries(lobby.teams).filter(([p, x]) => x === m.team && p !== from).length;
      if (count < 5 && !(game && game.role === 'host' && !game.over)) lobby.teams[from] = m.team;
      hostSync();
    } else if (m.k === 'name') {
      lobby.names[from] = String(m.name).slice(0, 16);
      const s = game?.soldiers.find((o) => o.peer === from);
      if (s) {
        s.name = lobby.names[from];
        net.broadcast({ k: 'roster', roster: game.roster() });
      }
      hostSync();
    } else if (game && game.nh && game.role === 'host') game.nh.onHostMessage(from, m);
    return;
  }
  if (m.k === 'lobby') {
    lobby = m;
    renderLobby();
  } else if (m.k === 'start') {
    pending.length = 0;
    const me = m.roster.find((r) => r.peer === net.id);
    if (!me) return;
    startGame({ role: 'client', roster: m.roster, myPeer: net.id, mode: m.mode, diff: m.diff, team: me.team });
  } else if (m.k === 'roster') {
    if (game) for (const r of m.roster) if (game.soldiers[r.id]) game.soldiers[r.id].name = r.name;
  } else if (m.k === 'toLobby') {
    if (game && game.role === 'client') backToLobby(false);
  } else if (game && game.nh) game.nh.onClientMessage(m);
  else if (m.k !== 's') pending.push(m);
}
const pending = [];

function backToLobby(announce) {
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
