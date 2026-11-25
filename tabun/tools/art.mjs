// Картинки «Табуна»: карточка на главной (img/tabun.jpg, 960×540) и превью ссылки (tabun/og.jpg, 1200×630).
// node tools/art.mjs [уровень] [секунда]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch, sleep } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// уровень, дистанция до ворот (где фронт табуна при съёмке), сколько коней
const lvl = Number(process.argv[2] || 17), gateD = Number(process.argv[3] || 154), herd = Number(process.argv[4] || 160), gap = Number(process.argv[5] || 20);
const srv = await serve(root);

async function grab(W, H, file, { logo = false, lang = 'ru' } = {}) {
  const b = await launch({ width: W, height: H, extra: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  await b.send('Page.enable');
  await b.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await b.send('Page.navigate', { url: `${srv.url}/tabun/?lang=${lang}&auto&shot&level=${lvl}` });
  for (let k = 0; k < 100; k++) { await sleep(200); try { if (await b.evaluate('__tabun?.state === "play"')) break; } catch { /* */ } }
  await b.evaluate(`(() => { const r = __tabun.run; r.count = ${herd}; r.sync(); for (const x of r.bodies) { x.x = r.cx + x.sx; x.d = r.d + x.sd; x.spawn = 1; } return 1; })()`);
  await b.evaluate('(__tabun.world.camOverride = { dist: 17, hgt: 8.5 }, 1)');
  for (let k = 0; k < 400; k++) { await sleep(50); if (await b.evaluate(`__tabun.run.front >= ${gateD - gap}`)) break; }
  if (logo) {
    await b.evaluate('(__tabun.world.eagles.forEach((e) => e.scale.setScalar(0)), 1)'); // беркут не ложится на надпись
    await b.evaluate(`(() => {
      const d = document.createElement('div');
      d.innerHTML = '<div style="font:400 ${Math.round(Math.min(W, H) * 0.17)}px/1 \\'Russo One\\';color:#fff;letter-spacing:.04em;text-shadow:0 7px 0 #b5302a,0 14px 34px rgba(0,0,0,.35)">${lang === 'ru' ? 'ТАБУН' : 'TABUN'}</div><div style="margin-top:12px;font:800 ${Math.round(Math.min(W, H) * 0.042)}px Rubik;letter-spacing:.24em;text-transform:uppercase;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5)">${lang === 'ru' ? 'Степная скачка' : 'Steppe Stampede'}</div>';
      d.style.cssText = 'position:absolute;left:0;right:0;top:34px;text-align:center;z-index:99;pointer-events:none';
      document.getElementById('stage').appendChild(d);
      return 1;
    })()`);
    await sleep(150);
  }
  const r = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log('saved', file);
  b.close();
}

if (process.env.PORTAL_ART) { // обложки порталов: node tabun/tools/art.mjs с PORTAL_ART=1 → dist/tabun-art
  const dir = path.join(root, 'dist', 'tabun-art'); fs.mkdirSync(dir, { recursive: true });
  for (const [w, h] of [[800, 800], [1080, 1920], [1920, 1080]]) await grab(w, h, path.join(dir, `cover-${w}x${h}.jpg`), { logo: true, lang: 'en' });
} else {
  await grab(960, 540, path.join(root, 'img', 'tabun.jpg'));
  await grab(1200, 630, path.join(root, 'tabun', 'og.jpg'), { logo: true });
}
srv.close();
process.exit(0);
