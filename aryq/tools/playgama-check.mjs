// The Playgama build, unpacked from its zip as the platform would, against a recording stand-in for
// Bridge (pinned so the real script cannot replace it): ready message, language, saves only through
// Bridge storage in one key, continue after a reload, the platform's pause and sound, full-screen ads
// only at a break and at most once in two minutes, no requests besides Bridge. Then once with the
// real Bridge from the CDN (it runs a mock platform outside Playgama): the game must start.
// Build first: node aryq/tools/build-portal.mjs --target playgama      (takes ~2.5 min: it waits out the ad gap)
//   node aryq/tools/playgama-check.mjs [WxH=924x520]
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [w, h] = (process.argv[2] || '924x520').split('x').map(Number);
const zip = path.join(repo, 'dist', 'aryq-playgama.zip');
const dir = path.join(repo, 'dist', 'aryq-playgama-unzipped');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-x', '-f', zip], { cwd: dir });

const S = await serve(dir);
const B = await chrome();
const A = 'window.__aryq';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
const check = (name, ok, info = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const fake = (lang) => `
  const pg = (window.__pg = { msgs: [], ads: [], rewards: [], sets: 0, store: JSON.parse(sessionStorage.getItem('pgstore') || '{}') });
  const ls = {};
  const on = (ev, f) => (ls[ev] = ls[ev] || []).push(f);
  window.__pgFire = (ev, v) => (ls[ev] || []).forEach((f) => f(v));
  const bridge = {
    EVENT_NAME: { AUDIO_STATE_CHANGED: 'audio_state_changed', PAUSE_STATE_CHANGED: 'pause_state_changed', INTERSTITIAL_STATE_CHANGED: 'interstitial_state_changed', REWARDED_STATE_CHANGED: 'rewarded_state_changed' },
    initialize: async () => { pg.msgs.push('init'); },
    platform: { language: '${lang}', isAudioEnabled: true, on, sendMessage: async (m) => { pg.msgs.push(m); } },
    storage: {
      get: async (keys) => keys.map((k) => (k in pg.store ? pg.store[k] : null)),
      set: async (keys, vals) => { keys.forEach((k, i) => (pg.store[k] = vals[i])); pg.sets++; sessionStorage.setItem('pgstore', JSON.stringify(pg.store)); },
    },
    advertisement: {
      isInterstitialSupported: true, interstitialState: 'closed', on,
      showInterstitial: (p) => { pg.ads.push(p); window.__pgFire('interstitial_state_changed', 'opened'); setTimeout(() => window.__pgFire('interstitial_state_changed', 'closed'), 400); },
      isRewardedSupported: true, rewardedState: 'closed',
      showRewarded: (p) => {
        const how = window.__pgReward || 'ok';
        pg.rewards.push(p + ':' + how);
        const fire = (st, ms) => setTimeout(() => { pg.rewardStates = (pg.rewardStates || []).concat(st); window.__pgFire('rewarded_state_changed', st); }, ms);
        fire('loading', 0);
        if (how === 'fail') return fire('failed', 200);
        if (how === 'never') return;
        fire('opened', 100);
        if (how === 'ok') return fire('rewarded', 1300), fire('closed', 1500);
        fire('closed', 400);
      },
    },
  };
  Object.defineProperty(window, 'bridge', { configurable: false, writable: false, value: bridge });`;
const pg = () => B.js('JSON.stringify(window.__pg)').then(JSON.parse);
try {
  await B.init(`try { if (!sessionStorage.getItem('pgstore')) localStorage.clear(); } catch {} ${fake('ru')}`);
  await B.open(`${S.url}/index.html?debug&save`, w, h);
  await sleep(1500);
  let p = await pg();
  check('Bridge first, then the game is ready and the level starts by itself', JSON.stringify(p.msgs.slice(0, 3)) === JSON.stringify(['init', 'game_ready', 'level_started']), p.msgs.join(' '));
  check('a new player is straight in the wide valley, in the platform language', await B.js(`${A}.g.valley === 'wide' && !document.getElementById('hud').hidden && document.documentElement.lang === 'ru'`));
  // the first canal (two taps dig it for a new player), then the regular save and its write to Bridge
  const [sx, sy] = await B.js(`JSON.stringify(${A}.view.center(${A}.state.ghost.from))`).then(JSON.parse);
  for (let k = 0; k < 2; k++) {
    await B.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: sx, y: sy, button: 'left', buttons: 1, clickCount: 1 });
    await B.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: sx, y: sy, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(200);
  }
  await sleep(8500);
  p = await pg();
  const kept = p.store.aryq ? Object.keys(JSON.parse(p.store.aryq)) : [];
  check('saves go to Bridge storage under one key, nothing to localStorage', kept.includes('aryq.save') && Object.keys(p.store).length === 1 && (await B.js('localStorage.length')) === 0, `${p.sets} sets, keys ${kept.join(',')}`);
  // the platform pauses (its menu, an ad): the game stops behind its pause panel and the sound holds
  await B.js(`window.__pgFire('pause_state_changed', true)`);
  await sleep(300);
  check('a pause from the platform pauses the game', /Пауза/.test(await B.js(`document.getElementById('ui').innerText`)) && (await pg()).msgs.includes('level_paused'));
  await B.js(`window.__pgFire('pause_state_changed', false); document.getElementById('pauseBtn').click()`);
  await sleep(300);
  check('the game goes on after the pause', (await B.js(`!${A}.g.over && document.getElementById('ui').innerText === ''`)) && (await pg()).msgs.includes('level_resumed'));
  // the platform's sound off and back
  await B.js(`window.__pgFire('audio_state_changed', false)`);
  await sleep(100);
  await B.js(`window.__pgFire('audio_state_changed', true)`);
  // a reload goes on with the same game, read back from Bridge
  const year = await B.js(`${A}.g.year`);
  const strokes = await B.js(`${A}.g.strokes.length`);
  await B.js(`document.dispatchEvent(new Event('visibilitychange'))`);
  await B.js('location.reload()');
  await sleep(1500);
  check('a reload continues the game from Bridge storage', strokes > 0 && (await B.js(`${A}.g.year`)) === year && (await B.js(`${A}.g.strokes.length`)) === strokes && !(await B.js(`document.getElementById('hud').hidden`)), `year ${year}, canals ${strokes}`);
  // no full-screen ad in the first two minutes, then one at the end of a year, and not again soon
  await B.js(`${A}.g.objects.forEach((o) => (o.thirst = 0)); ${A}.g.day = 119.97`);
  await sleep(900);
  check('no ad at the end of a year in the first two minutes', (await pg()).ads.length === 0);
  await B.js(`document.querySelector('#ui .choice') && document.querySelector('#ui .choice').click()`);
  console.log('     (waiting out the two minutes, the game paused)');
  await sleep(300);
  await B.js(`document.getElementById('pauseBtn').click()`);
  await sleep(122000);
  await B.js(`document.getElementById('pauseBtn').click()`);
  await sleep(200);
  await B.js(`${A}.g.objects.forEach((o) => (o.thirst = 0)); ${A}.g.day = 119.97`);
  await sleep(900);
  p = await pg();
  check('after two minutes the end of a year shows one full-screen ad', JSON.stringify(p.ads) === '["year_end"]', JSON.stringify(p.ads));
  await B.js(`document.querySelector('#ui .choice') && document.querySelector('#ui .choice').click()`);
  await sleep(600);
  await B.js(`${A}.g.shield = 0; ${A}.g.objects.forEach((o) => (o.thirst = 1.5)); ${A}.step(0.2)`);
  await sleep(800);
  p = await pg();
  check('a loss right after it shows no second ad', p.ads.length === 1 && /Сад засох/.test(await B.js(`document.getElementById('ui').innerText`)), JSON.stringify(p.ads));
  // an ad for a reward (27.10): the first loss offers the free "one more year" and no ad; after it
  // every loss offers one more year for an ad, given only when the ad says it was watched
  const buttons = () => B.js(`JSON.stringify([...document.querySelectorAll('#ui .over-acts button')].map((b) => ({ t: b.innerText.split(String.fromCharCode(10)).join(' / '), primary: b.className === 'btn', off: b.disabled })))`).then(JSON.parse);
  const lose = async () => {
    await B.js(`for (let k = 0; k < 600 && !${A}.g.objects.some((o) => o.type === 'garden'); k++) ${A}.step(0.05); ${A}.g.shield = 0; ${A}.g.objects.forEach((o) => (o.thirst = 1.5)); ${A}.step(0.2)`);
    await sleep(700);
  };
  const press = (re) => B.js(`[...document.querySelectorAll('#ui .over-acts button')].find((b) => ${re}.test(b.innerText)).click()`);
  let bs = await buttons();
  check('the first loss offers the free one more year and no ad', /Ещё год/.test(bs[0].t) && !bs.some((b) => /рекламу/.test(b.t)), JSON.stringify(bs));
  await press('/^Ещё год/');
  await sleep(400);
  await lose();
  bs = await buttons();
  check('the next loss offers one more year for an ad as the main button', bs[0].primary && /за рекламу/.test(bs[0].t) && !bs[1].primary, JSON.stringify(bs));
  const tries = [];
  for (const how of ['fail', 'early', 'never']) {
    await B.js(`window.__pgReward = '${how}'`);
    await press('/за рекламу/');
    await sleep(how === 'never' ? 16000 : 900);
    tries.push({ how, over: await B.js(`!!${A}.g.over`), b: (await buttons())[0] });
  }
  check('an ad that fails, is closed early or never opens gives nothing; the button says so and works again', tries.every((x) => x.over && /рекламы сейчас нет/.test(x.b.t) && !x.b.off), JSON.stringify(tries));
  await B.js(`window.__pgReward = 'ok'`);
  const before = await B.js(`JSON.stringify({ dig: ${A}.g.dig, revived: ${A}.g.revived })`).then(JSON.parse);
  await press('/за рекламу/');
  await sleep(500);
  const during = await B.js(`JSON.stringify({ over: !!${A}.g.over, wait: /загружается/.test(document.getElementById('ui').innerText), held: ${A}.sound.held })`).then(JSON.parse);
  await sleep(1500);
  const after = await B.js(`JSON.stringify({ held: ${A}.sound.held, over: !!${A}.g.over, dig: ${A}.g.dig, revived: ${A}.g.revived, panel: document.getElementById('ui').innerText, hint: document.getElementById('hint').textContent })`).then(JSON.parse);
  p = await pg();
  check('a watched ad gives one more year: the sound holds while it is open, then the valley goes on with +15 ketmen', during.over && during.wait && during.held && !after.held && !after.over && after.panel === '' && after.dig >= before.dig + 15 && after.revived === before.revived + 1 && p.rewards.at(-1) === 'one_more_year:ok', JSON.stringify({ before, during, after: { ...after, panel: after.panel.slice(0, 40) }, rewards: p.rewards }));
  await lose();
  bs = await buttons();
  p = await pg();
  check('and again on the next loss; no full-screen ad right after an ad for a reward', /за рекламу/.test(bs[0].t) && p.ads.length === 1, JSON.stringify({ bs, ads: p.ads }));
  await B.js(`window.bridge.advertisement.isRewardedSupported = false`);
  await press('/Ещё раз/');
  await sleep(400);
  await lose();
  await press('/^Ещё год/');
  await sleep(400);
  await lose();
  bs = await buttons();
  check('without ads for a reward: after the free year the loss panel has no ad button, Try again is the main one', bs.length > 0 && !bs.some((b) => /рекламу/.test(b.t)) && /Ещё раз/.test(bs[0].t) && bs[0].primary, JSON.stringify({ bs, over: await B.js(`JSON.stringify(${A}.g.over)`), day: await B.js(`${A}.g.day`), objs: await B.js(`${A}.g.objects.length`), ui: (await B.js(`document.getElementById('ui').innerText`)).slice(0, 80) }));
  const urls = await B.js(`JSON.stringify(performance.getEntriesByType('resource').map((e) => e.name))`).then(JSON.parse);
  const outside = urls.filter((u) => !u.startsWith(S.url) && !/^https:\/\/bridge\.playgama\.com\//.test(u));
  check('no requests besides the game files and Bridge', outside.length === 0, outside.slice(0, 3).join(' '));
  const errs = B.errors.filter((e) => !/read only property 'bridge'|Cannot redefine property: bridge/.test(e));
  check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  // the real Bridge from the CDN (a mock platform outside Playgama): the game starts and runs
  await B.init('try { localStorage.clear(); sessionStorage.clear(); } catch {}');
  B.errors.length = 0;
  await B.open(`${S.url}/index.html?debug&save`, w, h);
  await sleep(6000);
  const real = JSON.parse(await B.js(`JSON.stringify({ bridge: !!window.bridge, ready: !!window.ARYQ_BRIDGE, hud: !document.getElementById('hud').hidden, year: window.__aryq && window.__aryq.g.year })`));
  check('with the real Bridge the game starts', real.bridge && real.hud && real.year === 1, JSON.stringify(real));
  if (B.errors.length) console.log('     page errors with the real Bridge:', B.errors.slice(0, 3).join(' | '));
} finally {
  B.close();
  S.close();
}
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
