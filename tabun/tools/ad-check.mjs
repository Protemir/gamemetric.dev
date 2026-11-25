// Реклама в портале на подменённом Playgama SDK: когда показывается обязательная, работает ли «×2 за рекламу».
//   node tabun/tools/ad-check.mjs [WxH] [shots-dir]
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve, launch, sleep } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [W, H] = (process.argv[2] || '390x844').split('x').map(Number);
const shots = process.argv[3];
const srv = await serve(root);
const b = await launch({ width: W, height: H, extra: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const errors = [];
b.on((m) => {
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
});
await b.send('Runtime.enable');
await b.send('Page.enable');
const mobile = Math.min(W, H) < 600;
await b.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: mobile ? 3 : 1, mobile });
if (mobile) await b.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
// подменный Bridge: записывает вызовы, ролик за наградой «досматривается» за 300 мс
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.TABUN_PORTAL = 'playgama';
  window.__ads = [];
  const hs = {};
  const emit = (ev, s) => (hs[ev] || []).forEach((f) => f(s));
  window.TABUN_SDK = {
    EVENT_NAME: { INTERSTITIAL_STATE_CHANGED: 'i', REWARDED_STATE_CHANGED: 'r', PAUSE_STATE_CHANGED: 'p', AUDIO_STATE_CHANGED: 'a' },
    platform: { sendMessage() {}, on() {}, isAudioEnabled: true },
    analytics: { send() {} },
    advertisement: {
      on(ev, f) { (hs[ev] = hs[ev] || []).push(f); },
      showInterstitial(p) { __ads.push('inter:' + p); emit('i', 'opened'); setTimeout(() => emit('i', 'closed'), 200); },
      showRewarded(p) { __ads.push('reward:' + p); emit('r', 'opened'); setTimeout(() => { emit('r', 'rewarded'); emit('r', 'closed'); }, 300); },
    },
  };` });
await b.send('Page.navigate', { url: `${srv.url}/tabun/?lang=ru` });
for (let k = 0; k < 150; k++) {
  await sleep(200);
  try { if (await b.evaluate('!!window.__tabun && !!__tabun.run')) break; } catch { /* грузится */ }
}
const ev = (s) => b.evaluate(s);
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
const click = (id) => ev(`document.getElementById('${id}').click()`);
async function toResult() {
  for (let k = 0; k < 50 && (await ev('__tabun.state')) !== 'play'; k++) await sleep(200);
  await sleep(800);
  await ev('__tabun.run.lose()');
  for (let k = 0; k < 50 && (await ev('__tabun.state')) !== 'result'; k++) await sleep(200);
  await sleep(1500);
}
const ads = () => ev('__ads.slice()');
const visible = () => ev(`!document.getElementById('resAd').classList.contains('hidden')`);

// забег 1 (новичок): ×2 есть, обязательной рекламы нет
await ev('__tabun.state') === 'menu' || true;
await toResult();
check(await visible(), 'итоги 1-го забега: кнопка «×2» видна');
if (shots) { const r = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); fs.writeFileSync(path.join(shots, `ad-${W}x${H}.jpg`), Buffer.from(r.data, 'base64')); }
const lay = await ev('__tabun.layout()');
check(!lay.bad.length, 'раскладка итогов без наложений ' + lay.bad.join(', '));
await click('resNext');
check((await ads()).length === 0, 'после 1-го забега обязательной рекламы нет');

// забег 2: смотрим «×2» — монеты удвоены, обязательной следом нет
await toResult();
const c0 = await ev('__tabun.save.coins');
const shown = await ev(`document.querySelector('#resCoins b').dataset.v`);
await click('resAd');
await sleep(800);
const c1 = await ev('__tabun.save.coins');
check(c1 > c0, `«×2» добавило монеты: ${c0} → ${c1} (за забег было +${shown})`);
check(await ev(`document.getElementById('resAd').classList.contains('done')`), 'кнопка стала «Удвоено!»');
await click('resAd'); await sleep(500);
check((await ev('__tabun.save.coins')) === c1, 'второй раз удвоить нельзя');
await click('resNext');
check((await ads()).filter((a) => a.startsWith('inter')).length === 0, 'после «×2» обязательной рекламы нет');

// забег 3: меньше 1,5 мин после «×2» — тишина
await toResult();
await click('resNext');
check((await ads()).filter((a) => a.startsWith('inter')).length === 0, 'через минуту после «×2» обязательной рекламы нет');

// забег 4: прошло 3 минуты — обязательная между забегами
await ev(`(() => { const o = performance.now.bind(performance); performance.now = () => o() + 180000; })()`);
await toResult();
await click('resMenu');
check((await ads()).filter((a) => a.startsWith('inter')).length === 1, 'через 3 мин — одна обязательная при выходе из итогов');
check(errors.length === 0, 'ошибок в консоли нет ' + errors.join(' | '));
b.close();
srv.close();
console.log(fails.length ? '\nПРОВАЛОВ: ' + fails.length : '\nвсё чисто');
process.exit(fails.length ? 1 : 0);
