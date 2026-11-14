// Checks both portal builds against recording stand-ins for their SDKs (pinned, so the real scripts
// cannot replace them): the game starts, the portal hears rounds start and stop, a win over the bot,
// the saves go only to the portal's storage and survive a reload, the portal's sound and pause work,
// ads come only between rounds and not too often, nothing is requested besides the SDK, no links out.
// Then each build once with its real SDK from the CDN (outside the portal it runs in a demo mode).
// Build first:  node xo/tools/build-portal.mjs crazygames && node xo/tools/build-portal.mjs playgama
//   node xo/tools/portal-check.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
const check = (name, ok, info = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`);
};

// the log and the storage live in sessionStorage, so they survive a reload of the page
const COMMON = `
  const log = (window.__log = JSON.parse(sessionStorage.getItem('log') || '[]'));
  const store = (window.__store = JSON.parse(sessionStorage.getItem('store') || '{}'));
  const keep = () => { sessionStorage.setItem('log', JSON.stringify(log)); sessionStorage.setItem('store', JSON.stringify(store)); };
  const note = (m) => { log.push(m); keep(); };
  const ls = {};
  window.__fire = (ev, v) => (ls[ev] || []).forEach((f) => f(v));
  // the bot answers at once
  { const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms > 2000 ? ms : Math.min(ms || 0, 4), ...a); }
  try { localStorage.clear(); } catch {}`;

// the page loads after about:blank too, where sessionStorage is not allowed: the stand-ins are only for the game
const only = (src) => `if (location.protocol.startsWith('http')) {${src}
}`;
const FAKE = {
  crazygames: (lang) => `${COMMON}
    const settings = { muteAudio: false };
    const sdk = {
      environment: 'crazygames',
      init: async () => note('init'),
      user: { systemInfo: { locale: '${lang}' } },
      data: {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); keep(); },
        removeItem: (k) => { delete store[k]; keep(); },
      },
      game: {
        settings,
        gameplayStart: () => note('start'),
        gameplayStop: () => note('stop'),
        happytime: () => note('happy'),
        addSettingsChangeListener: (f) => (ls.settings = ls.settings || []).push(f),
      },
    };
    Object.defineProperty(window, 'CrazyGames', { configurable: false, writable: false, value: { SDK: sdk } });`,
  playgama: (lang) => `${COMMON}
    const on = (ev, f) => (ls[ev] = ls[ev] || []).push(f);
    const bridge = {
      EVENT_NAME: { AUDIO_STATE_CHANGED: 'audio', PAUSE_STATE_CHANGED: 'pause', INTERSTITIAL_STATE_CHANGED: 'ad' },
      initialize: async () => note('init'),
      platform: { language: '${lang}', isAudioEnabled: true, on, sendMessage: async (m) => note(m) },
      storage: {
        get: async (keys) => keys.map((k) => (k in store ? store[k] : null)),
        set: async (keys, vals) => { keys.forEach((k, i) => (store[k] = vals[i])); note('save'); },
      },
      advertisement: {
        isInterstitialSupported: true, on,
        showInterstitial: (p) => { note('ad:' + p); window.__fire('ad', 'opened'); setTimeout(() => window.__fire('ad', 'closed'), 2500); },
      },
    };
    Object.defineProperty(window, 'bridge', { configurable: false, writable: false, value: bridge });`,
};

for (const portal of ['crazygames', 'playgama']) {
  console.log(`\n--- ${portal}`);
  const S = await serve(path.join(repo, 'dist', 'xo-' + portal));
  const B = await chrome();
  const requests = [];
  B.cdp('Network.enable');
  try {
    const js = (e) => B.js(e);
    const log = () => js('JSON.stringify(window.__log)').then(JSON.parse);
    const view = () => js('document.body.dataset.view');
    const marks = () => js(`[...document.querySelectorAll('.cell')].map((c) => c.dataset.m || '.').join('')`);
    const click = (sel) => js(`document.querySelector(${JSON.stringify(sel)}).click()`);
    const cell = (i) => js(`document.querySelectorAll('.cell')[${i}].click()`);
    const waitFor = async (expr, ms = 3000) => {
      for (let t = 0; t < ms; t += 30) {
        if (await js(expr)) return true;
        await sleep(30);
      }
      return false;
    };

    await B.init(only(FAKE[portal]('ru-RU')));
    await B.open(S.url + '/', 390, 760);
    await waitFor(`document.querySelectorAll('.cell').length === 9`, 10000);
    check('starts on the menu, in the portal language', (await view()) === 'menu' && (await js(`document.querySelector('h1').textContent`)) === 'Крестики-нолики');
    check('the title is the portal name', (await js('document.title')) === 'Tic-Tac-Toe: Neon Duel');
    check('no links out on the page', (await js(`[...document.querySelectorAll('a[href]')].filter((a) => a.getClientRects().length).length`)) === 0);
    check('no "All games" and no footer', !(await js(`document.querySelector('#home').getClientRects().length + document.querySelector('#foot').getClientRects().length`)));
    let l = await log();
    check('the SDK is started first', l[0] === 'init');
    if (portal === 'playgama') check('says game_ready once', l.filter((m) => m === 'game_ready').length === 1);
    check('nothing is played in the menu yet', !l.includes('start') && !l.includes('level_started'));

    // a round against the unbeatable bot
    await click('[data-start="bot-hard"]');
    await sleep(50);
    l = await log();
    const startMsg = portal === 'crazygames' ? 'start' : 'level_started';
    const stopMsg = portal === 'crazygames' ? 'stop' : 'level_paused';
    check('a round starting is reported', l.at(-1) === startMsg, l.slice(-3).join(','));
    // play until it ends
    for (let k = 0; k < 9; k++) {
      if (await js(`!!document.querySelector('#board').dataset.over`)) break;
      await waitFor(`!!document.querySelector('#board').dataset.go || !!document.querySelector('#board').dataset.over`);
      if (await js(`!!document.querySelector('#board').dataset.over`)) break;
      const i = await js(`[...document.querySelectorAll('.cell')].findIndex((c) => !c.dataset.m)`);
      await cell(i);
    }
    l = await log();
    check('the end of the round is reported', l.at(-1) === stopMsg || l.at(-1) === 'save', l.slice(-3).join(','));
    check('no win, no happytime against the unbeatable bot', !l.includes('happy') && !l.includes('player_got_achievement'));

    // a win over the easy bot: try a few rounds
    await click('#back');
    await sleep(80);
    check('back in the menu, nothing is played', (await log()).filter((m) => m === startMsg || m === stopMsg).at(-1) === stopMsg);
    await click('[data-start="bot-easy"]');
    let won = false;
    for (let round = 0; round < 40 && !won; round++) {
      for (let k = 0; k < 9; k++) {
        await waitFor(`!!document.querySelector('#board').dataset.go || !!document.querySelector('#board').dataset.over`);
        if (await js(`!!document.querySelector('#board').dataset.over`)) break;
        const i = await js(`(() => { const c = [...document.querySelectorAll('.cell')]; const free = c.map((x, i) => (!x.dataset.m ? i : -1)).filter((i) => i >= 0); return free[Math.floor(Math.random() * free.length)]; })()`);
        await cell(i);
      }
      won = (await js(`document.querySelector('#board').dataset.over`)) === 'x';
      if (!won) await click('#again');
    }
    l = await log();
    check('a win over the bot is celebrated', won && l.includes(portal === 'crazygames' ? 'happy' : 'player_got_achievement'));

    // saves
    await sleep(3300); // Playgama writes a few seconds after a change
    const store = await js('JSON.stringify(window.__store)').then(JSON.parse);
    const saved = portal === 'crazygames' ? store['xo.score'] : JSON.parse(store.xo || '{}')['xo.score'];
    check('the score is kept in the portal storage', !!saved && JSON.parse(saved)['bot-easy'].x >= 1, String(saved));
    check('nothing in localStorage', (await js('localStorage.length')) === 0);
    const before = await js(`document.querySelector('#numX').textContent`);
    await B.open(S.url + '/', 390, 760);
    await waitFor(`document.querySelectorAll('.cell').length === 9`, 10000);
    await click('[data-start="bot-easy"]');
    await sleep(50);
    check('the score survives a reload', (await js(`document.querySelector('#numX').textContent`)) === before, before);

    // sound
    if (portal === 'crazygames') {
      await js(`window.__fire('settings', { muteAudio: true })`);
    } else {
      await js(`window.__fire('audio', false)`);
    }
    // the game's sound function is private: watch for oscillators being made
    await js(`(() => { window.__osc = 0; const C = window.AudioContext.prototype; const f = C.createOscillator; C.createOscillator = function () { window.__osc++; return f.call(this); }; })()`);
    await click('#again');
    await waitFor(`!!document.querySelector('#board').dataset.go`);
    await cell(await js(`[...document.querySelectorAll('.cell')].findIndex((c) => !c.dataset.m)`));
    check('the portal mute silences the game', (await js('window.__osc')) === 0);
    if (portal === 'crazygames') await js(`window.__fire('settings', { muteAudio: false })`);
    else await js(`window.__fire('audio', true)`);
    await waitFor(`!!document.querySelector('#board').dataset.go || !!document.querySelector('#board').dataset.over`);
    if (!(await js(`!!document.querySelector('#board').dataset.over`))) await cell(await js(`[...document.querySelectorAll('.cell')].findIndex((c) => !c.dataset.m)`));
    check('and the sound comes back', (await js('window.__osc')) > 0);

    if (portal === 'playgama') {
      // pause: the bot waits
      await click('#again');
      await waitFor(`!!document.querySelector('#board').dataset.go`);
      await js(`window.__fire('pause', true)`);
      await cell(await js(`[...document.querySelectorAll('.cell')].findIndex((c) => !c.dataset.m)`));
      await sleep(200);
      const n1 = (await marks()).replace(/\./g, '').length;
      check('while paused the bot does not move', n1 === 1 && (await log()).at(-1) === 'level_paused');
      await js(`window.__fire('pause', false)`);
      await waitFor(`(document.querySelectorAll('.cell[data-m="o"]').length > 0)`);
      check('after the pause it plays on', (await marks()).replace(/\./g, '').length === 2 && (await log()).includes('level_resumed'));

      // ads: none in the first 2.5 minutes, then one before the next round, not more often
      check('no ad in the first minutes', !(await log()).some((m) => m.startsWith('ad:')));
      await js(`(() => { const p = performance.now.bind(performance); let shift = 0; window.__skip = (ms) => (shift += ms); performance.now = () => p() + shift; })()`);
      await js(`window.__skip(160000)`);
      for (let k = 0; k < 9 && !(await js(`!!document.querySelector('#board').dataset.over`)); k++) {
        await waitFor(`!!document.querySelector('#board').dataset.go || !!document.querySelector('#board').dataset.over`);
        if (await js(`!!document.querySelector('#board').dataset.over`)) break;
        await cell(await js(`[...document.querySelectorAll('.cell')].findIndex((c) => !c.dataset.m)`));
      }
      await click('#again');
      await sleep(80);
      check('an ad before the next round after 2.5 minutes', (await log()).filter((m) => m.startsWith('ad:')).length === 1);
      check('the game pauses for the ad', (await log()).at(-1) === 'level_paused' || (await log()).includes('ad:next_round'));
      await sleep(2700);
      for (let k = 0; k < 9 && !(await js(`!!document.querySelector('#board').dataset.over`)); k++) {
        await waitFor(`!!document.querySelector('#board').dataset.go || !!document.querySelector('#board').dataset.over`);
        if (await js(`!!document.querySelector('#board').dataset.over`)) break;
        await cell(await js(`[...document.querySelectorAll('.cell')].findIndex((c) => !c.dataset.m)`));
      }
      await click('#again');
      await sleep(80);
      check('no second ad right after', (await log()).filter((m) => m.startsWith('ad:')).length === 1);
    }

    // English
    await js(`sessionStorage.clear()`);
    await B.init(only(FAKE[portal]('en-US')));
    await B.open('about:blank', 390, 760);
    await B.open(S.url + '/', 390, 760);
    await waitFor(`document.querySelectorAll('.cell').length === 9`, 10000);
    const h1 = await js(`document.querySelector('h1').textContent + ' / ' + document.documentElement.lang + ' / ' + JSON.stringify(window.__store)`);
    check('English players get English', h1.startsWith('Tic-Tac-Toe /'), h1);
    // the real SDK script on the page cannot replace the pinned stand-in and says so
    const errs = B.errors.filter((e) => !/read only property '(CrazyGames|bridge)'/.test(e));
    check('no errors', errs.length === 0, errs.join(' | '));
    B.errors.length = 0;

    // the real SDK from the CDN, outside the portal
    await B.init('');
    await B.open('about:blank', 390, 760);
    await B.open(S.url + '/', 390, 760);
    const up = await waitFor(`document.querySelectorAll('.cell').length === 9`, 15000);
    await click('[data-start="duo"]');
    await cell(4);
    check('with the real SDK the game runs', up && (await marks()) === '....x....');
    const own = await js(`performance.getEntriesByType('resource').map((r) => r.name).filter((u) => !u.startsWith(location.origin))`);
    const allowed = portal === 'crazygames' ? /crazygames\.com/ : /playgama\.com/;
    const strange = own.filter((u) => !allowed.test(u));
    check('nothing is requested besides the portal', portal === 'crazygames' || strange.length === 0, strange.slice(0, 4).join(' '));
    check('no errors with the real SDK', B.errors.filter((e) => !/crazygames|playgama|bridge/i.test(e)).length === 0, B.errors.join(' | '));
  } finally {
    B.close();
    S.close();
  }
}
console.log(bad ? `\n${bad} FAILED` : '\nall good');
process.exit(bad ? 1 : 0);
