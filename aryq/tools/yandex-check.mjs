// The Yandex Games build, unpacked from its zip, with a recording stand-in for their /sdk.js: init,
// LoadingAPI.ready, GameplayAPI start/stop, the language, saves only through player data in one key,
// continue after a reload, game_api_pause/resume, full-screen ads only at a break and at most once in
// two minutes, no requests besides the game's own files. With [checker=path to debugcheck.js] the
// unofficial Yandex Games Debug Checker (github.com/Nioris/yandex-games-debug-checker) runs on the
// page too and its FAIL/WARN lines are printed.
// Build first: node aryq/tools/build-portal.mjs --target yandex       (takes ~2.5 min: it waits out the ad gap)
//   node aryq/tools/yandex-check.mjs [WxH=924x520] [checker]
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [w, h] = (process.argv[2] || '924x520').split('x').map(Number);
const checker = process.argv[3] || null;
const zip = path.join(repo, 'dist', 'aryq-yandex.zip');
const dir = path.join(repo, 'dist', 'aryq-yandex-unzipped');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-x', '-f', zip], { cwd: dir });
// the stand-in SDK where Yandex serves theirs; ?ylang= sets the player's language
fs.writeFileSync(
  path.join(dir, 'sdk.js'),
  `(() => {
  const ya = (window.__ya = { calls: [], ads: 0, sets: 0, store: JSON.parse(sessionStorage.getItem('yastore') || '{}') });
  const ls = {};
  window.__yaFire = (ev) => (ls[ev] || []).forEach((f) => f());
  const player = {
    getData: async (keys) => { const o = {}; for (const k of keys || Object.keys(ya.store)) if (k in ya.store) o[k] = ya.store[k]; return o; },
    setData: async (d) => { Object.assign(ya.store, d); ya.sets++; sessionStorage.setItem('yastore', JSON.stringify(ya.store)); },
  };
  const lang = new URLSearchParams(location.search).get('ylang') || 'ru';
  const ysdk = {
    environment: { i18n: { lang } },
    features: { LoadingAPI: { ready: () => ya.calls.push('ready') }, GameplayAPI: { start: () => ya.calls.push('start'), stop: () => ya.calls.push('stop') } },
    adv: { showFullscreenAdv: ({ callbacks = {} } = {}) => { ya.ads++; ya.calls.push('adv'); callbacks.onOpen && callbacks.onOpen(); setTimeout(() => callbacks.onClose && callbacks.onClose(true), 400); } },
    getPlayer: async () => player,
    on: (ev, f) => (ls[ev] = ls[ev] || []).push(f),
  };
  window.YaGames = { init: async () => { ya.calls.push('init'); return ysdk; } };
})();`,
);
if (checker) {
  fs.copyFileSync(checker, path.join(dir, 'debugcheck.js'));
  const html = path.join(dir, 'index.html');
  fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace('<script src="/sdk.js"></script>', '<script src="/sdk.js"></script>\n<script src="debugcheck.js"></script>'));
}

const S = await serve(dir);
const B = await chrome();
const A = 'window.__aryq';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
const check = (name, ok, info = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const ya = () => B.js('JSON.stringify(window.__ya)').then(JSON.parse);
const page = (q = '') => `${S.url}/index.html?debug&save${q}`;
try {
  await B.init(`try { if (!sessionStorage.getItem('yastore')) localStorage.clear(); } catch {}`);
  await B.open(page(), w, h);
  await sleep(1500);
  let y = await ya();
  check('YaGames.init, then LoadingAPI.ready, then GameplayAPI.start', JSON.stringify(y.calls.slice(0, 3)) === JSON.stringify(['init', 'ready', 'start']), y.calls.join(' '));
  check('a new player is straight in the wide valley, in the player\'s language', await B.js(`${A}.g.valley === 'wide' && !document.getElementById('hud').hidden && document.documentElement.lang === 'ru'`));
  // the first canal (two taps dig it for a new player), then the regular save and its write
  const [sx, sy] = await B.js(`JSON.stringify(${A}.view.center(${A}.state.ghost.from))`).then(JSON.parse);
  for (let k = 0; k < 2; k++) {
    await B.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: sx, y: sy, button: 'left', buttons: 1, clickCount: 1 });
    await B.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: sx, y: sy, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(200);
  }
  await sleep(9500);
  y = await ya();
  const kept = y.store.aryq ? Object.keys(JSON.parse(y.store.aryq)) : [];
  check('saves go to the player\'s data under one key, nothing to localStorage, not too often', kept.includes('aryq.save') && Object.keys(y.store).length === 1 && y.sets <= 3 && (await B.js('localStorage.length')) === 0, `${y.sets} writes in ~10 s, keys ${kept.join(',')}`);
  await B.js(`window.__yaFire('game_api_pause')`);
  await sleep(300);
  y = await ya();
  check('game_api_pause pauses the game and stops gameplay', /Пауза/.test(await B.js(`document.getElementById('ui').innerText`)) && y.calls[y.calls.length - 1] === 'stop');
  await B.js(`window.__yaFire('game_api_resume'); document.getElementById('pauseBtn').click()`);
  await sleep(300);
  y = await ya();
  check('the game goes on after the pause', (await B.js(`!${A}.g.over && document.getElementById('ui').innerText === ''`)) && y.calls[y.calls.length - 1] === 'start');
  const year = await B.js(`${A}.g.year`);
  const strokes = await B.js(`${A}.g.strokes.length`);
  await B.js(`document.dispatchEvent(new Event('visibilitychange'))`);
  await B.js('location.reload()');
  await sleep(1500);
  check('a reload continues the game from the player\'s data', strokes > 0 && (await B.js(`${A}.g.year`)) === year && (await B.js(`${A}.g.strokes.length`)) === strokes, `year ${year}, canals ${strokes}`);
  await B.js(`${A}.g.objects.forEach((o) => (o.thirst = 0)); ${A}.g.day = 119.97`);
  await sleep(900);
  check('no full-screen ad at the end of a year in the first two minutes', (await ya()).ads === 0);
  await B.js(`document.querySelector('#ui .choice') && document.querySelector('#ui .choice').click()`);
  console.log('     (waiting out the two minutes, the game paused)');
  await sleep(300);
  await B.js(`document.getElementById('pauseBtn').click()`);
  await sleep(122000);
  await B.js(`document.getElementById('pauseBtn').click()`);
  await sleep(200);
  await B.js(`${A}.g.objects.forEach((o) => (o.thirst = 0)); ${A}.g.day = 119.97`);
  await sleep(900);
  y = await ya();
  check('after two minutes the end of a year shows one full-screen ad, the year saved first', y.ads === 1 && JSON.parse(y.store.aryq || '{}')['aryq.save'] != null, `${y.ads} ads`);
  await B.js(`document.querySelector('#ui .choice') && document.querySelector('#ui .choice').click()`);
  await sleep(600);
  await B.js(`${A}.g.shield = 0; ${A}.g.objects.forEach((o) => (o.thirst = 1.5)); ${A}.step(0.2)`);
  await sleep(800);
  check('a loss right after it shows no second ad', (await ya()).ads === 1 && /Сад засох/.test(await B.js(`document.getElementById('ui').innerText`)));
  const urls = await B.js(`JSON.stringify(performance.getEntriesByType('resource').map((e) => e.name))`).then(JSON.parse);
  const outside = urls.filter((u) => !u.startsWith(S.url));
  check('no requests besides the game\'s own files', outside.length === 0, outside.slice(0, 3).join(' '));
  check('a long press opens no browser menu', await B.js(`(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e.defaultPrevented; })()`));
  check('no page errors', B.errors.length === 0, B.errors.slice(0, 2).join(' | '));
  // an English-speaking player
  await B.init(`try { localStorage.clear(); sessionStorage.clear(); } catch {}`);
  await B.open(page('&ylang=tr'), w, h);
  await sleep(1500);
  check('a player from elsewhere gets the English game', await B.js(`document.documentElement.lang === 'en' && !document.getElementById('hud').hidden`));
  if (checker) {
    await B.open(page(), w, h);
    await sleep(3000);
    await B.js(`window.YGDebugChecker.open()`);
    await sleep(4000);
    const text = await B.js(`(() => { const p = [...document.querySelectorAll('div')].find((d) => /PASS/.test(d.innerText) && /FAIL/.test(d.innerText) && d.children.length > 3); return p ? p.innerText : ''; })()`);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    console.log('     checker:', lines.slice(0, 12).join(' | '));
    for (let i = 0; i < lines.length; i++) if (/^(FAIL|WARN|✗|⚠)/.test(lines[i]) || /\b(FAIL|WARN)\b/.test(lines[i]) && lines[i].length < 140) console.log('     ', lines[i], lines[i + 1] && lines[i + 1].length < 160 ? '— ' + lines[i + 1] : '');
  }
} finally {
  B.close();
  S.close();
}
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
