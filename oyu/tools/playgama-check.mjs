// The Playgama build, unpacked from its zip as the platform would, against a recording stand-in for
// Bridge (pinned so the real script cannot replace it): ready message, language, saves only through
// Bridge storage in one key, progress kept after a reload, the platform's pause and sound,
// full-screen ads only between levels and at most once in two minutes, no requests besides Bridge,
// no links out. Then once with the real Bridge from the CDN (a mock platform outside Playgama).
// Build first: node oyu/tools/build-portal.mjs --target playgama      (takes ~2.5 min: it waits out the ad gap)
//   node oyu/tools/playgama-check.mjs [WxH=390x844]
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from './cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [w, h] = (process.argv[2] || '390x844').split('x').map(Number);
const zip = path.join(repo, 'dist', 'oyu-playgama.zip');
const dir = path.join(repo, 'dist', 'oyu-playgama-unzipped');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-x', '-f', zip], { cwd: dir });

const S = await serve(dir);
const B = await chrome();
const O = 'window.__oyu';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
const check = (name, ok, info = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const fake = (lang) => `
  const pg = (window.__pg = { msgs: [], ads: [], sets: 0, store: JSON.parse(sessionStorage.getItem('pgstore') || '{}') });
  const ls = {};
  const on = (ev, f) => (ls[ev] = ls[ev] || []).push(f);
  window.__pgFire = (ev, v) => (ls[ev] || []).forEach((f) => f(v));
  const bridge = {
    EVENT_NAME: { AUDIO_STATE_CHANGED: 'audio_state_changed', PAUSE_STATE_CHANGED: 'pause_state_changed', INTERSTITIAL_STATE_CHANGED: 'interstitial_state_changed' },
    initialize: async () => { pg.msgs.push('init'); },
    platform: { language: '${lang}', isAudioEnabled: true, on, sendMessage: async (m) => { pg.msgs.push(m); } },
    storage: {
      get: async (keys) => keys.map((k) => (k in pg.store ? pg.store[k] : null)),
      set: async (keys, vals) => { keys.forEach((k, i) => (pg.store[k] = vals[i])); pg.sets++; sessionStorage.setItem('pgstore', JSON.stringify(pg.store)); },
    },
    advertisement: {
      isInterstitialSupported: true, interstitialState: 'closed', on,
      showInterstitial: (p) => { pg.ads.push(p); window.__pgFire('interstitial_state_changed', 'opened'); setTimeout(() => window.__pgFire('interstitial_state_changed', 'closed'), 600); },
    },
  };
  Object.defineProperty(window, 'bridge', { configurable: false, writable: false, value: bridge });`;
const pg = () => B.js('JSON.stringify(window.__pg)').then(JSON.parse);
const ui = () => B.js(`document.getElementById('ui').innerText`);
const tapShooter = async () => {
  const [x, y] = await B.js(`JSON.stringify([${O}.R.queuePos[0].x, ${O}.R.queuePos[0].y])`).then(JSON.parse);
  await B.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await B.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
};
// clears the picture: the game wins on its next step and shows its result screen
const win = async () => {
  await B.js(`${O}.game.left = 0`);
  for (let k = 0; k < 40 && !/Дальше|Next/.test(await ui()); k++) await sleep(250);
};
try {
  await B.init(`try { if (!sessionStorage.getItem('pgstore')) localStorage.clear(); } catch {} ${fake('ru')}`);
  await B.open(`${S.url}/index.html?debug`, w, h);
  await sleep(1200);
  let p = await pg();
  check('Bridge first, then the game is ready and level 1 starts by itself', JSON.stringify(p.msgs.slice(0, 3)) === JSON.stringify(['init', 'game_ready', 'level_started']), p.msgs.join(' '));
  check('a new player is in level 1, in the platform language, under the portal title', await B.js(`${O}.mode === 'play' && ${O}.game.level.index === 0 && document.documentElement.lang === 'ru' && document.title === 'Oyu: Pixel Carpet'`));
  await tapShooter();
  await sleep(4000);
  p = await pg();
  const kept = p.store.oyu ? Object.keys(JSON.parse(p.store.oyu)) : [];
  check('saves go to Bridge storage under one key, nothing to localStorage', kept.includes('oyu.progress') && Object.keys(p.store).length === 1 && (await B.js('localStorage.length')) === 0, `${p.sets} sets, keys ${kept.join(',')}`);

  // the platform pauses (its menu): nothing moves, taps do nothing, then it goes on
  await B.js(`window.__pgFire('pause_state_changed', true)`);
  await sleep(200);
  const t0 = await B.js(`${O}.game.time`);
  await sleep(700);
  const t1 = await B.js(`${O}.game.time`);
  check('a pause from the platform stops the level and tells it', t0 === t1 && (await pg()).msgs.includes('level_paused'), `time ${t0} → ${t1}`);
  await B.js(`window.__pgFire('pause_state_changed', false)`);
  await sleep(500);
  check('the level goes on after the pause', (await B.js(`${O}.game.time`)) > t1 && (await pg()).msgs.includes('level_resumed'));
  // the platform's sound off holds the game's audio
  await B.js(`window.__pgFire('audio_state_changed', false)`);
  await sleep(100);
  await B.js(`window.__pgFire('audio_state_changed', true)`);

  // level 1 done: no ad in the first two minutes, level 2 starts
  await win();
  await B.js(`document.querySelector('#ui .btn.primary').click()`);
  await sleep(600);
  p = await pg();
  check('no ad between levels in the first two minutes', p.ads.length === 0 && (await B.js(`${O}.game.level.index`)) === 1);
  check('a new level is reported as started', p.msgs.filter((m) => m === 'level_started').length === 2, p.msgs.join(' '));

  // a reload goes on from Bridge: level 1 done, the menu offers level 2
  await sleep(3500);
  await B.js('location.reload()');
  await sleep(1500);
  check('a reload keeps the progress from Bridge storage', (await B.js(`${O}.progress.done.includes(0) && ${O}.mode === 'menu'`)) && /Уровень 2/.test(await ui()), (await ui()).split('\n')[0]);
  check('no links out of the game', (await B.js(`document.querySelectorAll('a[href]').length`)) === 0);

  // two minutes later the next level comes after one full-screen ad, and the game holds while it is open
  await B.js(`document.querySelector('#ui .btn.primary').click()`);
  console.log('     (waiting out the two minutes)');
  await sleep(121000);
  await win();
  await B.js(`document.querySelector('#ui .btn.primary').click()`);
  await sleep(150);
  const a0 = await B.js(`${O}.game.time`);
  await sleep(300);
  const a1 = await B.js(`${O}.game.time`);
  p = await pg();
  check('after two minutes the next level comes after one full-screen ad', JSON.stringify(p.ads) === '["next_level"]' && (await B.js(`${O}.game.level.index`)) === 2, JSON.stringify(p.ads));
  check('the level waits while the ad is open', a0 === a1, `time ${a0} → ${a1}`);
  await sleep(700);
  // a loss right after it: "try again" shows no second ad
  await B.js(`${O}.game.state = 'lost'`);
  for (let k = 0; k < 20 && !/Ещё раз/.test(await ui()); k++) await sleep(200);
  await B.js(`document.querySelector('#ui .btn.primary').click()`);
  await sleep(400);
  p = await pg();
  check('another try right after it shows no second ad', p.ads.length === 1 && (await B.js(`${O}.mode`)) === 'play', JSON.stringify(p.ads));

  const urls = await B.js(`JSON.stringify(performance.getEntriesByType('resource').map((e) => e.name))`).then(JSON.parse);
  const outside = urls.filter((u) => !u.startsWith(S.url) && !/^https:\/\/bridge\.playgama\.com\//.test(u));
  check('no requests besides the game files and Bridge', outside.length === 0, outside.slice(0, 3).join(' '));
  const errs = B.errors.filter((e) => !/read only property 'bridge'|Cannot redefine property: bridge/.test(e));
  check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  // the real Bridge from the CDN (a mock platform outside Playgama): the game starts and runs
  await B.init('try { localStorage.clear(); sessionStorage.clear(); } catch {}');
  B.errors.length = 0;
  await B.open(`${S.url}/index.html?debug`, w, h);
  await sleep(6000);
  const real = JSON.parse(await B.js(`JSON.stringify({ bridge: !!window.bridge, mode: window.__oyu && window.__oyu.mode, level: window.__oyu && window.__oyu.game.level.index, time: window.__oyu && window.__oyu.game.time })`));
  check('with the real Bridge the game starts', real.bridge && real.mode === 'play' && real.level === 0 && real.time > 1, JSON.stringify(real));
  if (B.errors.length) console.log('     page errors with the real Bridge:', B.errors.slice(0, 3).join(' | '));
} finally {
  B.close();
  S.close();
}
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
