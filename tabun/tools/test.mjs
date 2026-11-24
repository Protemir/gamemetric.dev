// Проверка «Табуна»: раскладка (пересечения кнопок) на 5 размерах во всех экранах, путь до итогов, ошибки.
// node tools/test.mjs [--shots]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch, sleep } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = process.argv.includes('--shots');
const outDir = process.env.TABUN_SHOTS || path.join(root, 'tabun', 'tools', 'shots');
if (SHOTS) fs.mkdirSync(outDir, { recursive: true });
const SIZES = [[360, 640], [390, 844], [568, 320], [844, 390], [1280, 720]];
const srv = await serve(root);
let fails = 0;

// первый запуск: чистый профиль, без ?menu — сразу скачка, без пустого экрана
{
  const b = await launch({ width: 390, height: 844, extra: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  await b.send('Page.enable');
  await b.send('Page.navigate', { url: `${srv.url}/tabun/?lang=ru` });
  let st = '';
  for (let k = 0; k < 60; k++) { await sleep(250); try { st = await b.evaluate('window.__tabun?.state || ""'); if (st === 'play') break; } catch { /* */ } }
  await sleep(1500);
  const moved = await b.evaluate('__tabun.run ? __tabun.run.d : 0');
  if (st !== 'play' || !(moved > 5)) { fails++; console.log('FAIL первый запуск: state=' + st + ', d=' + moved); } else console.log('ok   первый запуск сразу в скачку');
  b.close();
}

for (const [W, H] of SIZES) {
  for (const lang of ['ru', 'en']) {
    const b = await launch({ width: W, height: H, extra: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
    const errors = [];
    b.on((m) => {
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    });
    await b.send('Runtime.enable');
    await b.send('Page.enable');
    await b.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 || H < 600 });
    await b.send('Page.navigate', { url: `${srv.url}/tabun/?lang=${lang}&menu` });
    for (let k = 0; k < 100; k++) { await sleep(200); try { if (await b.evaluate('!!window.__tabun?.run && __tabun.state==="menu"')) break; } catch { /* */ } }
    // монеты, чтобы кнопки были «богатые» и «бедные»
    await b.evaluate('(__tabun.setSave({coins: 12345, played: 3}), __tabun.menu(), 1)');
    await sleep(600);
    const check = async (label) => {
      const r = await b.evaluate('__tabun.layout()');
      const tag = `${W}x${H} ${lang} ${label}`;
      if (r.bad.length) { fails++; console.log('FAIL', tag, r.bad.join('; ')); } else console.log('ok  ', tag, `(${r.rects.length} элементов)`);
      if (SHOTS) {
        const s = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
        fs.writeFileSync(path.join(outDir, `${W}x${H}-${lang}-${label}.jpg`), Buffer.from(s.data, 'base64'));
      }
    };
    await check('menu');
    // окна меню: масти, настройки, награда дня
    for (const [btn, name] of [['coatsBtn', 'coats'], ['setBtn', 'settings']]) {
      await b.evaluate(`document.getElementById('${btn}').click(), 1`);
      await sleep(450);
      const over = await b.evaluate(`(() => { const c = document.getElementById('modalCard').getBoundingClientRect(); return c.top < -1 || c.bottom > innerHeight + 1 ? 'card ' + Math.round(c.top) + '..' + Math.round(c.bottom) : ''; })()`);
      if (over) { fails++; console.log('FAIL', `${W}x${H} ${lang} ${name}: не влезает ${over}`); } else console.log('ok  ', `${W}x${H} ${lang} ${name}`);
      if (SHOTS) { const s = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); fs.writeFileSync(path.join(outDir, `${W}x${H}-${lang}-${name}.jpg`), Buffer.from(s.data, 'base64')); }
      await b.evaluate(`(document.getElementById('modal').classList.add('hidden'), 1)`);
    }
    // игра: автопилот до итогов (ускоряем — подменяем шаг)
    await b.evaluate('(__tabun.start(), 1)');
    await sleep(800);
    await check('hud');
    // проматываем забег: много шагов логики за раз
    await b.evaluate(`(() => { const r = __tabun.run; let g = 0; while (r.state === 'run' && g++ < 60*90) { r.step(1/60, 0); } return r.state; })()`);
    for (let k = 0; k < 60; k++) { await sleep(250); if (await b.evaluate('__tabun.state === "result"')) break; }
    const st = await b.evaluate('__tabun.state');
    if (st !== 'result') { fails++; console.log('FAIL', `${W}x${H} ${lang}: нет итогов, state=${st}`); }
    else { await sleep(500); await check('result'); }
    if (errors.length) { fails++; console.log('ERRORS', `${W}x${H} ${lang}`, errors.slice(0, 5).join(' | ')); }
    b.close();
  }
}
srv.close();
console.log(fails ? `\n${fails} проблем` : '\nвсё чисто');
process.exit(fails ? 1 : 0);
