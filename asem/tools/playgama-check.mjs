// The Playgama build, unpacked from its zip as the platform would, against a recording stand-in for
// Bridge (pinned so the real script cannot replace it): ready message, language, saves only through
// Bridge storage in one key, stars kept after a reload, the platform's pause, a full-screen ad only
// on the results screen and at most once in two minutes, no requests besides Bridge (no counter,
// no leaderboard), no links out. Then once with the real Bridge from the CDN (a mock platform
// outside Playgama).
// Build first: node asem/tools/build-portal.mjs --target playgama      (takes ~3 min: it waits out the ad gap)
//   node asem/tools/playgama-check.mjs [WxH=1280x720]
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [w, h] = (process.argv[2] || '1280x720').split('x').map(Number);
const zip = path.join(root, 'dist', 'asem-playgama.zip');
const dir = path.join(root, 'dist', 'playgama-unzipped');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-x', '-f', zip], { cwd: dir });

const S = await serve(dir);
const B = await chrome();
const A = 'window.__asem';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
const check = (name, ok, info = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const fake = `
  const pg = (window.__pg = { msgs: [], ads: [], sets: 0, store: JSON.parse(sessionStorage.getItem('pgstore') || '{}') });
  const ls = {};
  const on = (ev, f) => (ls[ev] = ls[ev] || []).push(f);
  window.__pgFire = (ev, v) => (ls[ev] || []).forEach((f) => f(v));
  const bridge = {
    EVENT_NAME: { AUDIO_STATE_CHANGED: 'audio_state_changed', PAUSE_STATE_CHANGED: 'pause_state_changed', INTERSTITIAL_STATE_CHANGED: 'interstitial_state_changed' },
    initialize: async () => { pg.msgs.push('init'); },
    platform: { language: 'ru', isAudioEnabled: true, on, sendMessage: async (m) => { pg.msgs.push(m); } },
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
const poll = async (expr, ms = 15000) => {
  for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(100)) if (await B.js(`(() => { try { return !!(${expr}); } catch { return false; } })()`)) return true;
  return false;
};
// chapter 1 driven by the autopilot to the results screen
const race = async () => {
  await B.js(`(() => { const a = ${A}; a.g.autoDrive = true; a.start({ kind: 'story', chapter: 0 }); a.g.last = { kind: 'story', chapter: 0 }; })()`);
  await poll(`window.__pg.msgs.filter((m) => m === 'level_started').length > 0`, 3000);
  return B.js(`(() => { const a = ${A}; for (let k = 0; k < 400 && !['done', 'fail', 'over'].includes(a.g.mode); k++) a.step(30); return a.g.mode; })()`);
};
const key = async (code) => {
  for (const type of ['keyDown', 'keyUp']) await B.cdp('Input.dispatchKeyEvent', { type, code, key: code.replace('Key', '').toLowerCase() });
};

try {
  await B.init(`try { if (!sessionStorage.getItem('pgstore')) localStorage.clear(); } catch {} ${fake}`);
  await B.open(`${S.url}/index.html?debug`, w, h);
  check('the game loads', await poll(`${A} && document.getElementById('ui').innerText.length > 0`, 15000));
  let p = await pg();
  check('Bridge first, then the game says it is ready', JSON.stringify(p.msgs.slice(0, 2)) === JSON.stringify(['init', 'game_ready']), p.msgs.join(' '));
  const look = await B.js(`({ lang: document.documentElement.lang, title: document.title, links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')), full: !document.getElementById('fullBtn') || document.getElementById('fullBtn').hidden })`);
  check('the platform language, the portal title, no links out, no own full-screen button', look.lang === 'ru' && look.title === 'Asem Road: Almaty Racing' && look.links.length === 0 && look.full, JSON.stringify(look));

  // a race: started, paused by the platform, resumed
  await B.js(`(() => { const a = ${A}; a.g.autoDrive = true; a.start({ kind: 'story', chapter: 0 }); })()`);
  check('a race is reported as started', await poll(`window.__pg.msgs.includes('level_started')`, 5000), (await pg()).msgs.join(' '));
  await sleep(4000);
  await B.js(`window.__pgFire('pause_state_changed', true)`);
  await sleep(300);
  check('a pause from the platform pauses the race', (await B.js(`${A}.g.mode`)) === 'paused' && (await pg()).msgs.includes('level_paused'));
  await B.js(`window.__pgFire('pause_state_changed', false)`);
  await key('KeyP');
  await sleep(300);
  check('the race goes on after the pause', (await B.js(`${A}.g.mode`)) !== 'paused' && (await pg()).msgs.includes('level_resumed'), await B.js(`${A}.g.mode`));
  check('the autopilot gets to the results', (await B.js(`(() => { const a = ${A}; for (let k = 0; k < 400 && !['done', 'fail', 'over'].includes(a.g.mode); k++) a.step(30); return a.g.mode; })()`)) === 'done');
  await sleep(500);
  check('no ad on the results in the first two minutes', (await pg()).ads.length === 0);
  await sleep(3500);
  p = await pg();
  const kept = p.store.asem ? JSON.parse(p.store.asem) : {};
  check('saves go to Bridge storage under one key, nothing to localStorage', 'asem.progress' in kept && Object.keys(p.store).length === 1 && (await B.js('localStorage.length')) === 0, `${p.sets} sets, keys ${Object.keys(kept).join(',')}`);

  // a reload keeps the stars of chapter 1
  await B.open(`${S.url}/index.html?debug`, w, h);
  await poll(`${A} && document.getElementById('ui').innerText.length > 0`, 15000);
  check('a reload keeps the progress from Bridge storage', (await B.js(`${A}.progress.stars[0] || 0`)) > 0, 'stars ' + (await B.js(`${A}.progress.stars[0]`)));

  // two minutes later the results screen gets one full-screen ad, the next race right after it none
  console.log('     (waiting out the two minutes)');
  await sleep(121000);
  p = await pg();
  const n0 = p.msgs.filter((m) => m === 'level_started').length;
  check('the next race is reported as started again', (await race()) === 'done' && (await pg()).msgs.filter((m) => m === 'level_started').length === n0 + 1);
  await sleep(300);
  check('after two minutes the results come with one full-screen ad', JSON.stringify((await pg()).ads) === '["race_end"]', JSON.stringify((await pg()).ads));
  await sleep(800);
  await race();
  await sleep(300);
  check('the results of the race right after it show no second ad', (await pg()).ads.length === 1, JSON.stringify((await pg()).ads));

  const urls = await B.js(`JSON.stringify(performance.getEntriesByType('resource').map((e) => e.name))`).then(JSON.parse);
  const outside = urls.filter((u) => !u.startsWith(S.url) && !/^https:\/\/bridge\.playgama\.com\//.test(u));
  check('no requests besides the game files and Bridge', outside.length === 0, outside.slice(0, 3).join(' '));
  const errs = B.errors.filter((e) => !/read only property 'bridge'|Cannot redefine property: bridge/.test(e));
  check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  // the real Bridge from the CDN (a mock platform outside Playgama): the game starts
  await B.init('try { localStorage.clear(); sessionStorage.clear(); } catch {}');
  B.errors.length = 0;
  await B.open(`${S.url}/index.html?debug`, w, h);
  const up = await poll(`${A} && document.getElementById('ui').innerText.length > 0`, 20000);
  check('with the real Bridge the game starts', up && (await B.js('!!window.bridge')));
  if (B.errors.length) console.log('     page errors with the real Bridge:', B.errors.slice(0, 3).join(' | '));
} finally {
  B.close();
  S.close();
}
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
