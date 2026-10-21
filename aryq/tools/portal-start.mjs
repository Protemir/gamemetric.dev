// The CrazyGames build with a stand-in SDK: how long from opening to gameplayStart, with no clicks
// (CG counts a visit as a play only from gameplayStart). Build first: node aryq/tools/build-portal.mjs
//   node aryq/tools/portal-start.mjs [WxH=924x520]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [w, h] = (process.argv[2] || '924x520').split('x').map(Number);
const S = await serve(repo);
const B = await chrome();
const fake = (keep) => `${keep ? '' : 'try { localStorage.clear(); } catch {}'}
  window.__ev = []; const t0 = performance.now(); const log = (n) => window.__ev.push([n, Math.round(performance.now() - t0)]);
  const store = JSON.parse(localStorage.getItem('fakeData') || '{}');
  Object.defineProperty(window, 'CrazyGames', { configurable: false, writable: false, value: { SDK: {
    environment: 'crazygames', init: async () => log('init'), user: { systemInfo: { locale: 'en-US' } },
    data: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); localStorage.setItem('fakeData', JSON.stringify(store)); }, removeItem: (k) => { delete store[k]; localStorage.setItem('fakeData', JSON.stringify(store)); } },
    game: { loadingStart: () => log('loadingStart'), loadingStop: () => log('loadingStop'), gameplayStart: () => log('gameplayStart'), gameplayStop: () => log('gameplayStop'), happytime: () => log('happytime'),
      settings: { muteAudio: false }, addSettingsChangeListener: () => {} } } } });`;
let bad = 0;
try {
  for (const [name, keep] of [['new player', false], ['returning player', true]]) {
    await B.init(fake(keep));
    await B.open(`${S.url}/dist/aryq-crazygames/index.html`, w, h);
    await new Promise((r) => setTimeout(r, 2500));
    const r = await B.js(`JSON.stringify({ ev: window.__ev, hud: !document.getElementById('hud').hidden, ui: document.getElementById('ui').innerText.slice(0, 30) })`).then(JSON.parse);
    const start = r.ev.find((e) => e[0] === 'gameplayStart');
    console.log(name.padEnd(17), start ? `gameplayStart at ${start[1]} ms` : 'NO gameplayStart', '|', r.ev.map((e) => e.join(' ')).join(', '), '| hud', r.hud, '| ui', JSON.stringify(r.ui));
    if (!start || !r.hud) bad++;
  }
  if (B.errors.length) console.log('page errors:', B.errors.slice(0, 3).join(' | '));
} finally {
  B.close();
  S.close();
}
process.exit(bad ? 1 : 0);
