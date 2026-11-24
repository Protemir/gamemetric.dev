// «Обезьяний» тест: случайные нажатия кнопок, клавиш и свайпы в режиме телефона, проверка ошибок и сохранения.
// node tools/monkey.mjs [действий] [seed]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch, sleep } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const N = Number(process.argv[2] || 400);
let seed = Number(process.argv[3] || 7);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const srv = await serve(root);
const b = await launch({ width: 390, height: 844, extra: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
b.on((m) => {
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errors.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
});
await b.send('Runtime.enable'); await b.send('Page.enable');
await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await b.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await b.send('Page.navigate', { url: `${srv.url}/tabun/?lang=ru` });
for (let k = 0; k < 100; k++) { await sleep(200); try { if (await b.evaluate('!!window.__tabun?.run')) break; } catch { /* */ } }
const ev = (x) => b.evaluate(x);
await ev('(__tabun.setSave({ coins: 20000 }), 1)');
const bad = [];
const states = {};
for (let i = 0; i < N; i++) {
  const r = rnd();
  try {
    if (r < 0.55) {
      // случайная видимая кнопка
      await ev(`(() => { const els = [...document.querySelectorAll('button, a.pill, .railbtn')].filter((e) => e.offsetParent !== null && !e.disabled && e.id !== 'allGames'); if (!els.length) return 0; els[Math.floor(${rnd()} * els.length)].click(); return els.length; })()`);
    } else if (r < 0.7) {
      const keys = ['Space', 'Enter', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'Enter', 'Escape', 'KeyP'];
      const k = keys[Math.floor(rnd() * keys.length)];
      await b.send('Input.dispatchKeyEvent', { type: 'keyDown', code: k, key: k === 'Space' ? ' ' : k });
      await b.send('Input.dispatchKeyEvent', { type: 'keyUp', code: k, key: k === 'Space' ? ' ' : k });
    } else if (r < 0.85) {
      const x0 = 40 + rnd() * 300, x1 = 40 + rnd() * 300, y = 300 + rnd() * 400;
      await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
      await b.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1, y }] });
      await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else if (r < 0.93) {
      // промотать забег вперёд, чтобы чаще попадать в финал, итоги и меню
      await ev(`(() => { const r = __tabun.run; if (__tabun.state !== 'play') return 0; let g = 0; while (r.state === 'run' && g++ < ${Math.floor(rnd() * 1500)}) r.step(1/60, (Math.random() * 2 - 1) * 5); return 1; })()`);
    } else {
      // смена размера экрана (поворот телефона)
      const land = rnd() < 0.5;
      await b.send('Emulation.setDeviceMetricsOverride', { width: land ? 844 : 390, height: land ? 390 : 844, deviceScaleFactor: 2, mobile: true });
    }
  } catch (e) { bad.push('action: ' + e.message); }
  await sleep(40 + rnd() * 160);
  if (i % 10 === 0) {
    const s = await ev(`({ st: __tabun.state, c: __tabun.save.coins, lvl: __tabun.save.lvl, shown: (document.querySelector('#menuCoins b')?.textContent || '') + '|' + (document.querySelector('#hudCoins b')?.textContent || ''), modal: !document.getElementById('modal').classList.contains('hidden'), res: !document.getElementById('result').classList.contains('hidden'), menu: !document.getElementById('menu').classList.contains('hidden'), hud: !document.getElementById('hud').classList.contains('hidden') })`);
    states[s.st] = (states[s.st] || 0) + 1;
    if (!Number.isInteger(s.c) || s.c < 0) bad.push('монеты: ' + JSON.stringify(s));
    if (!(s.lvl >= 1) || !Number.isInteger(s.lvl)) bad.push('уровень: ' + JSON.stringify(s));
    if (/NaN|undefined/.test(s.shown)) bad.push('счётчик: ' + s.shown);
    // экран соответствует состоянию
    if (s.st === 'menu' && !s.menu) bad.push('state=menu, а меню скрыто ' + JSON.stringify(s));
    if (s.st === 'play' && (s.menu || s.res)) bad.push('state=play, а видно меню/итоги ' + JSON.stringify(s));
    if (s.st === 'result' && !s.res) bad.push('state=result, а итогов нет ' + JSON.stringify(s));
    if (s.st === 'pause' && !s.modal) bad.push('state=pause, а окна паузы нет ' + JSON.stringify(s));
  }
}
console.log('состояния:', JSON.stringify(states));
const uniq = [...new Set([...bad, ...errors])];
uniq.slice(0, 15).forEach((x) => console.log('FAIL', x));
console.log(uniq.length ? `${uniq.length} проблем` : 'всё чисто');
b.close(); srv.close();
process.exit(uniq.length ? 1 : 0);
