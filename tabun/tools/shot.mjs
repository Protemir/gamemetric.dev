// Скриншоты и проверки «Табуна» в headless Chrome.
// node tools/shot.mjs <WxH> <out.png> "<query>" [шаги...]
//   шаг: "wait:1500" | "js:выражение" | "shot:файл.png" | "drag:x0,x1,y,ms"
// Пример: node tools/shot.mjs 800x450 menu.png "menu&lang=ru" wait:1500
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch, sleep } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [size, out, query = '', ...steps] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const srv = await serve(root);
const b = await launch({ width: W, height: H, extra: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const errors = [];
b.on((m) => {
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
});
await b.send('Runtime.enable');
await b.send('Page.enable');
// режим телефона: короткая сторона меньше 600 — мобильный user-agent, тач, плотность экрана как у телефона (DPR=3 по умолчанию)
const mobile = Math.min(W, H) < 600;
const DPR = Number(process.env.DPR || (mobile ? 3 : 1));
await b.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile, screenOrientation: W > H ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } });
if (mobile) {
  await b.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await b.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', platform: 'Android' });
}
await b.send('Page.navigate', { url: `${srv.url}/tabun/?${query}` });
for (let k = 0; k < 100; k++) {
  await sleep(200);
  try { if (await b.evaluate("!!window.__tabun && !!__tabun.run")) break; } catch { /* грузится */ }
}
const shoot = async (file) => {
  const r = await b.send('Page.captureScreenshot', { format: file.endsWith('.jpg') ? 'jpeg' : 'png', quality: 85 });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log('saved', file);
};
for (const s of steps) {
  const [cmd, ...rest] = s.split(':');
  const arg = rest.join(':');
  if (cmd === 'wait') await sleep(Number(arg));
  else if (cmd === 'js') console.log('js>', JSON.stringify(await b.evaluate(arg)));
  else if (cmd === 'shot') await shoot(arg);
  else if (cmd === 'cpu') await b.send('Emulation.setCPUThrottlingRate', { rate: Number(arg) }); // слабый телефон
  else if (cmd === 'tdrag') { // свайп пальцем
    const [x0, x1, y, ms] = arg.split(',').map(Number);
    await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
    const n = Math.max(2, Math.round(ms / 16));
    for (let i = 1; i <= n; i++) { await b.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / n, y }] }); await sleep(16); }
    await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  else if (cmd === 'tap') { const [x, y] = arg.split(',').map(Number); await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await sleep(60); await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  else if (cmd === 'drag') {
    const [x0, x1, y, ms] = arg.split(',').map(Number);
    await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x0, y, button: 'left', clickCount: 1 });
    const n = Math.max(2, Math.round(ms / 16));
    for (let i = 1; i <= n; i++) { await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0 + ((x1 - x0) * i) / n, y, button: 'left', buttons: 1 }); await sleep(16); }
    await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x1, y, button: 'left', clickCount: 1 });
  }
}
if (out && out !== '-') await shoot(out);
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
b.close();
srv.close();
process.exit(0);
