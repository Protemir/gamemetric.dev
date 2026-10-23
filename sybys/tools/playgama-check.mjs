// The Playgama build, unpacked from its zip as the platform would, against a recording stand-in for
// Bridge (pinned so the real script cannot replace it): ready message once the steppe is loaded,
// language, saves only through Bridge storage in one key, glory kept after a reload, the platform's
// pause, full-screen ads only at a scene card or a new game, at most once in two minutes, the world
// standing still while one is open; no requests besides Bridge, no links out. Then once with the
// real Bridge from the CDN (a mock platform outside Playgama).
// Build first: node sybys/tools/build-portal.mjs --target playgama      (takes ~2.5 min: it waits out the ad gap)
//   node sybys/tools/playgama-check.mjs [WxH=1280x720]
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [w, h] = (process.argv[2] || '1280x720').split('x').map(Number);
const zip = path.join(repo, 'dist', 'sybys-playgama.zip');
const dir = path.join(repo, 'dist', 'sybys-playgama-unzipped');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-x', '-f', zip], { cwd: dir });

const S = await serve(dir);
const B = await chrome();
const A = 'window.__sybys';
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
      showInterstitial: (p) => { pg.ads.push(p); window.__pgFire('interstitial_state_changed', 'opened'); setTimeout(() => window.__pgFire('interstitial_state_changed', 'closed'), 4000); },
    },
  };
  Object.defineProperty(window, 'bridge', { configurable: false, writable: false, value: bridge });`;
const pg = () => B.js('JSON.stringify(window.__pg)').then(JSON.parse);
const ui = () => B.js(`document.getElementById('ui').innerText`);
const poll = async (expr, ms = 15000) => {
  for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(100)) if (await B.js(`(() => { try { return !!(${expr}); } catch { return false; } })()`)) return true;
  return false;
};
// the season runs on until the next scene card is up
const toScene = () => B.js(`(() => { let n = 0; while (${A}.g.phase === 'map' && n++ < 20000) ${A}.step(0.1); return ${A}.g.phase; })()`);
const closeScene = () => B.js(`(() => { const c = ${A}.S.eventChoices(${A}.g).find((c) => c.ok); ${A}.choose(c.key); return ${A}.g.phase; })()`);
// plays the game through to the kurultai and an ending, then the end screen
const playTo = (phases) =>
  B.js(`(() => { const s = ${A}; let n = 0;
    while (!${JSON.stringify(phases)}.includes(s.g.phase) && n++ < 40000) {
      if (s.g.phase === 'event') { const c = s.S.eventChoices(s.g).find((c) => c.ok); s.choose(c.key); }
      else s.step(0.1);
    }
    return s.g.phase; })()`);
const toEnd = async () => {
  if ((await playTo(['council', 'kurultai', 'end'])) === 'council') {
    // the small council at the end of summer: its screen comes up, "Autumn →" goes on
    await poll(`[...document.querySelectorAll('#ui button')].some((b) => /Осень|Autumn/.test(b.textContent))`, 5000);
    await B.js(`[...document.querySelectorAll('#ui button')].find((b) => /Осень|Autumn/.test(b.textContent)).click()`);
    await sleep(300);
    await playTo(['kurultai', 'end']);
  }
  return B.js(`(() => { const s = ${A}; if (s.g.phase === 'kurultai') { const c = s.S.choicesAtKurultai(s.g).find((c) => c.ok && c.key !== 'reveal'); s.finish(c.key); } return s.g.phase; })()`);
};

try {
  await B.init(`try { if (!sessionStorage.getItem('pgstore')) localStorage.clear(); } catch {} ${fake}`);
  await B.open(`${S.url}/index.html?debug&play`, w, h);
  check('the steppe loads', await poll(`${A} && ${A}.g && !document.getElementById('boot')`, 20000));
  let p = await pg();
  check('Bridge first, then the game says it is ready', JSON.stringify(p.msgs.slice(0, 2)) === JSON.stringify(['init', 'game_ready']), p.msgs.join(' '));
  check('the platform language and the English title', await B.js(`document.documentElement.lang === 'ru' && document.title === 'Whispers of the Steppe' && document.querySelectorAll('a[href]').length === 0`));
  // the lesson of a new player holds the clock: let it go
  await B.js(`${A}.coach.step = null; ${A}.g.hold = false; true`);
  check('play is reported as started', await poll(`window.__pg.msgs.includes('level_started')`, 5000), (await pg()).msgs.join(' '));

  // the platform pauses (its menu): the game shows its pause screen; resume goes on
  await B.js(`window.__pgFire('pause_state_changed', true)`);
  await sleep(300);
  check('a pause from the platform pauses the game', /Пауза|Pause/i.test(await ui()) && (await pg()).msgs.includes('level_paused'));
  await B.js(`window.__pgFire('pause_state_changed', false); document.querySelector('#ui button').click(); true`);
  await sleep(300);
  check('the game goes on after the pause', (await ui()) === '' && (await pg()).msgs.includes('level_resumed'));

  // a scene card in the first two minutes: no ad
  check('a scene card comes up', (await toScene()) === 'event');
  await sleep(300);
  check('no ad at a scene in the first two minutes', (await pg()).ads.length === 0 && (await ui()).length > 0);
  await closeScene();

  // an ending: glory goes to Bridge storage under one key, nothing to localStorage
  check('the game plays to an ending', (await toEnd()) === 'end');
  await sleep(3800);
  p = await pg();
  const kept = p.store.sybys ? JSON.parse(p.store.sybys) : {};
  check('saves go to Bridge storage under one key, nothing to localStorage', 'sybys.glory' in kept && 'sybys.lang' in kept && Object.keys(p.store).length === 1 && (await B.js('localStorage.length')) === 0, `${p.sets} sets, keys ${Object.keys(kept).join(',')}`);
  const glory = JSON.parse(kept['sybys.glory'] || '0');

  // a reload reads them back
  await B.open(`${S.url}/index.html?debug`, w, h);
  await poll(`!document.getElementById('boot')`, 20000);
  check('a reload reads the saves back from Bridge', glory > 0 && (await B.js(`JSON.parse(window.SYBYS_DATA.getItem('sybys.glory'))`)) === glory, `glory ${glory}`);

  // two minutes later a new game from the end screen comes after one ad, and the world waits for it
  await B.open(`${S.url}/index.html?debug&play`, w, h);
  await poll(`${A} && ${A}.g && !document.getElementById('boot')`, 20000);
  await B.js(`${A}.coach.step = null; ${A}.g.hold = false; true`);
  console.log('     (waiting out the two minutes)');
  await sleep(121000);
  await toEnd();
  await sleep(300);
  await B.js(`[...document.querySelectorAll('#ui button.big')][0].click()`);
  await poll(`${A}.g.phase === 'map' && !${A}.g.demo && ${A}.g.time < 1`, 5000);
  await B.js(`${A}.coach.step = null; ${A}.g.hold = false; true`);
  const t0 = await B.js(`${A}.g.time`);
  await sleep(500);
  const t1 = await B.js(`${A}.g.time`);
  p = await pg();
  check('after two minutes a new game comes after one full-screen ad', JSON.stringify(p.ads) === '["new_game"]', JSON.stringify(p.ads));
  check('the world stands still while the ad is open', t0 === t1, `time ${t0} → ${t1}`);
  await sleep(4000);
  check('then the game runs', (await B.js(`${A}.g.time`)) > t1);
  await toScene();
  await sleep(300);
  check('a scene right after it shows no second ad', (await pg()).ads.length === 1, JSON.stringify((await pg()).ads));

  const urls = await B.js(`JSON.stringify(performance.getEntriesByType('resource').map((e) => e.name))`).then(JSON.parse);
  const outside = urls.filter((u) => !u.startsWith(S.url) && !/^https:\/\/bridge\.playgama\.com\//.test(u));
  check('no requests besides the game files and Bridge', outside.length === 0, outside.slice(0, 3).join(' '));
  const errs = B.errors.filter((e) => !/read only property 'bridge'|Cannot redefine property: bridge/.test(e));
  check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  // the real Bridge from the CDN (a mock platform outside Playgama): the game starts and runs
  await B.init('try { localStorage.clear(); sessionStorage.clear(); } catch {}');
  B.errors.length = 0;
  await B.open(`${S.url}/index.html?debug&play`, w, h);
  const up = await poll(`${A} && ${A}.g && !document.getElementById('boot')`, 25000);
  check('with the real Bridge the game starts', up && (await B.js(`!!window.bridge && !!window.SYBYS_BRIDGE && ${A}.g.phase === 'map'`)));
  if (B.errors.length) console.log('     page errors with the real Bridge:', B.errors.slice(0, 3).join(' | '));
} finally {
  B.close();
  S.close();
}
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
