// The year panel of the Playgama build with "all three gifts for an ad" (04.11): on every screen the
// three gifts and the ad button must be on screen without scrolling. Built folder, stand-in Bridge.
// Build first: node aryq/tools/build-portal.mjs --target playgama
//   node aryq/tools/gifts-layout.mjs [WxH ...]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['924x520', '844x390', '568x320', '390x844', '320x568', '1280x720'];
const fake = (lang) => `
  const ls = {};
  const on = (ev, f) => (ls[ev] = ls[ev] || []).push(f);
  Object.defineProperty(window, 'bridge', { configurable: false, writable: false, value: {
    EVENT_NAME: { AUDIO_STATE_CHANGED: 'a', PAUSE_STATE_CHANGED: 'p', INTERSTITIAL_STATE_CHANGED: 'i', REWARDED_STATE_CHANGED: 'r' },
    initialize: async () => {},
    platform: { language: '${lang}', isAudioEnabled: true, on, sendMessage: async () => {} },
    analytics: { send: () => {} },
    storage: { get: async (keys) => keys.map(() => null), set: async () => {} },
    advertisement: { isInterstitialSupported: true, on, showInterstitial: () => {}, isRewardedSupported: true, showRewarded: () => {} },
  } });`;
const S = await serve(path.join(repo, 'dist', 'aryq-playgama'));
const B = await chrome();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
try {
  for (const lang of ['ru', 'en']) {
    await B.init(`try { localStorage.clear(); } catch {} ${fake(lang)}`);
    for (const size of sizes) {
      const [w, h] = size.split('x').map(Number);
      await B.open(`${S.url}/index.html?debug`, w, h);
      await sleep(1500);
      await B.js(`window.__aryq.g.objects.forEach((o) => (o.thirst = 0)); window.__aryq.g.day = 119.97`);
      await sleep(900);
      const r = JSON.parse(
        await B.js(`JSON.stringify((() => {
          const all = [...document.querySelectorAll('#ui .choice, #ui .gifts-ad')];
          const p = document.querySelector('#ui .panel').getBoundingClientRect();
          const cut = all.filter((b) => { const r = b.getBoundingClientRect(); return r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth; }).length;
          const ad = document.querySelector('#ui .gifts-ad');
          const lines = ad ? Math.round(ad.querySelector('small').getBoundingClientRect().height / 14) : 0;
          return { n: all.length, cut, top: Math.round(p.top), bottom: Math.round(p.bottom), h: innerHeight, lines };
        })())`),
      );
      // SHOTS=<folder>: a picture of each panel to look at
      if (process.env.SHOTS) await B.shot(path.join(process.env.SHOTS, `gifts-${lang}-${size}.png`));
      const ok = r.n === 4 && r.cut === 0;
      if (!ok) bad++;
      console.log(`${ok ? 'OK  ' : 'FAIL'} ${lang} ${size}: panel ${r.top}..${r.bottom} of ${r.h}, buttons ${r.n}, cut ${r.cut}, ad sub ~${r.lines} lines`);
    }
  }
} finally {
  B.close();
  S.close();
}
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
