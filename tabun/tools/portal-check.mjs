// Проверка портальной сборки: грузится, SDK подхватился, первый забег идёт, ошибок нет.
//   node tabun/tools/portal-check.mjs playgama [WxH]
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve, launch, sleep } from './cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const portal = process.argv[2] || 'playgama';
const [W, H] = (process.argv[3] || '390x844').split('x').map(Number);
const srv = await serve(path.join(repo, 'dist'));
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
await b.send('Page.navigate', { url: `${srv.url}/tabun-${portal}/` });
let ok = false;
for (let k = 0; k < 150; k++) {
  await sleep(200);
  try { if (await b.evaluate('!!window.__tabun && !!__tabun.run')) { ok = true; break; } } catch { /* грузится */ }
}
await sleep(3000);
const info = await b.evaluate(`({ portal: window.TABUN_PORTAL, sdk: !!window.TABUN_SDK, rewarded: String(window.TABUN_SDK?.advertisement?.isRewardedSupported), adBtn: !!document.getElementById('resAd'), lang: document.documentElement.lang, state: __tabun.state, d: Math.round(__tabun.run.d), allGames: document.getElementById('allGames').classList.contains('hidden'), share: document.getElementById('resShare').classList.contains('hidden') })`);
console.log(JSON.stringify({ ok, ...info }));
const shot = process.env.SHOT;
if (shot) { const r = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); fs.writeFileSync(shot, Buffer.from(r.data, 'base64')); }
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
b.close();
srv.close();
process.exit(ok && !errors.length ? 0 : 1);
