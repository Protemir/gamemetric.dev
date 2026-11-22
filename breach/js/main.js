// Boot, menus, settings, input and the main loop.
import * as THREE from '../vendor/three.module.min.js';
import { Game } from './game.js';
import { Hud, BUY_ITEMS } from './hud.js';
import { initAudio, setVolume, sfx } from './audio.js';
import { t, lang, setLang } from './i18n.js';

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
$('mo-menu').onclick = () => toMenu();
$('mo-again').onclick = () => startGame();
$('play').onclick = () => startGame();
$('click-to-play').onclick = () => resume();

function startGame() {
  initAudio();
  $('menu').hidden = true;
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
    game = new Game(renderer, { team: settings.team, mode: settings.mode, diff: settings.diff }, hud);
    hud.attach(game);
    applySize();
    $('loading').hidden = true;
    $('hud').hidden = false;
    state = 'play';
    lockPointer();
  }, 30);
}

function toMenu() {
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
function resume() {
  $('pause').hidden = true;
  $('click-to-play').hidden = true;
  state = 'play';
  lockPointer();
}
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (locked) {
    $('click-to-play').hidden = true;
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
function doBuy(item) {
  if (!game) return;
  const r = game.buy(game.player, item);
  if (r === 'ok') sfx('buy');
  else {
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
  if (['Space', 'ArrowUp', 'ArrowDown', 'ControlLeft', 'KeyS', 'KeyW'].includes(e.code)) e.preventDefault();
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
    game.render(0, { dx: 0, dy: 0 }, settings);
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
const t0 = performance.now();
makePreview();
console.log(`mansion built in ${Math.round(performance.now() - t0)} ms`);
// ?shot — a staged frame for the cover pictures (no HUD, no menu)
if (q.has('shot')) {
  $('menu').hidden = true;
  setTimeout(() => {
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
  }, 50);
}

if (q.has('debug')) window.__breach = { get game() { return game; }, get preview() { return preview; }, startGame, settings };
requestAnimationFrame(frame);
