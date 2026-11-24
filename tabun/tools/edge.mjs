// Крайние условия: хранилище запрещено, испорченное сохранение, огромный уровень, нет WebGL2,
// пауза сразу после победы, ссылка ?level не трогает прогресс, байга дня одна на весь день.
// node tools/edge.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch, sleep } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const srv = await serve(root);
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const fast = `(() => { const r = __tabun.run; let g = 0; while ((r.state === 'run' || r.state === 'clash' || r.state === 'ladder') && g++ < 60*150) r.step(1/60, __tabun.auto(r)); return r.state; })()`;

async function page(query, { pre = '', w = 390, h = 844, until = '!!window.__tabun?.run' } = {}) {
  const b = await launch({ width: w, height: h, extra: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const errors = [];
  b.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  await b.send('Runtime.enable'); await b.send('Page.enable');
  await b.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true });
  if (pre) await b.send('Page.addScriptToEvaluateOnNewDocument', { source: pre });
  await b.send('Page.navigate', { url: `${srv.url}/tabun/?${query}` });
  for (let k = 0; k < 120; k++) { await sleep(200); try { if (await b.evaluate(until)) break; } catch { /* */ } }
  return { b, errors, ev: (x) => b.evaluate(x) };
}

// а) хранилище бросает исключения (приватный режим, запрет сайта)
{
  const p = await page('lang=ru', { pre: `(() => { const bad = () => { throw new Error('denied'); }; Storage.prototype.getItem = bad; Storage.prototype.setItem = bad; })();` });
  await sleep(800);
  const st1 = await p.ev('__tabun.state');
  await p.ev(fast);
  for (let k = 0; k < 30; k++) { await sleep(200); if (await p.ev('__tabun.state === "result"')) break; }
  ok(st1 === 'play' && (await p.ev('__tabun.state')) === 'result' && !p.errors.length, 'без хранилища: играется до итогов без ошибок ' + p.errors.slice(0, 2).join(' | '));
  p.b.close();
}
// б) испорченное сохранение: битые типы
{
  const p = await page('lang=ru&menu', { pre: `try { localStorage.setItem('tabun.save.v1', JSON.stringify({ lvl: 'x', coins: 'abc', up: null, sets: 'steppe', set: 42, stars: [1], daily: 5, quality: {} })); } catch {}` });
  await sleep(1500);
  const s = await p.ev(`({ lvl: __tabun.save.lvl, coins: __tabun.save.coins, shown: document.querySelector('#menuCoins b').textContent, play: document.getElementById('playBtn').textContent, ups: document.getElementById('ups').textContent })`);
  ok(Number.isInteger(s.lvl) && s.lvl >= 1 && Number.isInteger(s.coins) && !/NaN|undefined/.test(s.shown + s.play + s.ups) && !p.errors.length, 'испорченное сохранение чинится: ' + JSON.stringify(s) + ' ' + p.errors.slice(0, 2).join(' | '));
  p.b.close();
}
// в) огромный уровень по ссылке
{
  const t0 = Date.now();
  const p = await page('lang=ru&level=500');
  const ms = Date.now() - t0;
  await sleep(800);
  ok((await p.ev('__tabun.run.L.n')) === 500 && ms < 20000 && !p.errors.length, `уровень 500 грузится (${ms} мс)`);
  p.b.close();
}
// г) браузер без WebGL2 — понятное сообщение, без исключений
{
  const p = await page('lang=ru', { pre: `(() => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return t === 'webgl2' ? null : o.call(this, t, ...a); }; })();`, until: 'document.getElementById("loadS")?.textContent.length > 30' });
  await sleep(500);
  const txt = await p.ev('document.getElementById("loadS").textContent');
  ok(/WebGL2/.test(txt) && !p.errors.length, 'без WebGL2 — сообщение: ' + txt.slice(0, 50));
  p.b.close();
}
// д) пауза сразу после победы не съедает награду и уровень
{
  const p = await page('lang=ru&menu');
  await p.ev('(__tabun.setSave({ lvl: 3, coins: 0 }), __tabun.menu(), document.getElementById("modal").classList.add("hidden"), __tabun.start(), 1)');
  await sleep(300);
  await p.ev(fast);
  await sleep(100);
  await p.b.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
  await p.b.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
  for (let k = 0; k < 30; k++) { await sleep(200); if (await p.ev('__tabun.state === "result"')) break; }
  const r = await p.ev('({ st: __tabun.state, lvl: __tabun.save.lvl, coins: __tabun.save.coins, win: __tabun.run.result?.win })');
  ok(r.st === 'result' && (!r.win || r.lvl === 4) && r.coins > 0, 'пауза после финиша: итоги и награда на месте ' + JSON.stringify(r));
  p.b.close();
}
// е) ссылка ?level=1 не трогает сохранённый прогресс
{
  const p = await page('lang=ru&menu', { pre: `try { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', 1); localStorage.setItem('tabun.save.v1', JSON.stringify({ lvl: 20, coins: 5, played: 4 })); } } catch {}` });
  await p.ev('(location.href = location.pathname + "?lang=ru&level=1", 1)');
  await sleep(500);
  for (let k = 0; k < 100; k++) { await sleep(200); try { if (await p.ev('!!window.__tabun?.run && __tabun.state === "menu"')) break; } catch { /* */ } }
  await p.ev('(document.getElementById("modal").classList.add("hidden"), __tabun.start(), 1)');
  await sleep(300);
  const ln = await p.ev('__tabun.run.L.n');
  await p.ev(fast);
  for (let k = 0; k < 30; k++) { await sleep(200); if (await p.ev('__tabun.state === "result"')) break; }
  const stored = await p.ev('JSON.parse(localStorage.getItem("tabun.save.v1")).lvl');
  ok(ln === 1 && stored === 20, `уровень из ссылки (${ln}) не меняет прогресс: в сохранении ${stored}`);
  p.b.close();
}
// ж) байга дня — одна трасса на весь день, даже после прохождения обычного уровня
{
  const p = await page('lang=ru&menu');
  await p.ev('(__tabun.setSave({ lvl: 6, dailyDiff: null }), __tabun.menu(), document.getElementById("modal").classList.add("hidden"), 1)');
  await p.ev('(document.getElementById("dailyBtn").click(), 1)');
  await sleep(300);
  const a = await p.ev('({ n: __tabun.run.L.n, rival: __tabun.run.L.rival, len: __tabun.run.L.length })');
  await p.ev('(__tabun.setSave({ lvl: 15 }), __tabun.menu(), document.getElementById("modal").classList.add("hidden"), document.getElementById("dailyBtn").click(), 1)');
  await sleep(300);
  const c = await p.ev('({ n: __tabun.run.L.n, rival: __tabun.run.L.rival, len: __tabun.run.L.length })');
  ok(JSON.stringify(a) === JSON.stringify(c), 'байга дня та же после роста уровня ' + JSON.stringify(a) + ' / ' + JSON.stringify(c));
  // язык на паузе в байге дня
  await p.ev('(document.getElementById("pauseBtn").click(), 1)');
  await sleep(200);
  await p.ev('(document.getElementById("mLang").click(), 1)');
  ok((await p.ev('document.getElementById("progLvl").textContent')) === 'Daily Race', 'язык на паузе в байге дня — «Daily Race»');
  ok(!p.errors.length, 'ошибок нет ' + p.errors.slice(0, 2).join(' | '));
  p.b.close();
}
// з) два пальца: ведёт первый, второй не перехватывает
{
  const p = await page('lang=ru&level=2');
  await p.b.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await sleep(500);
  const T = (type, pts) => p.b.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await T('touchStart', [{ x: 195, y: 600, id: 1 }]);
  await T('touchStart', [{ x: 195, y: 600, id: 1 }, { x: 100, y: 500, id: 2 }]);
  await T('touchMove', [{ x: 195, y: 600, id: 1 }, { x: 380, y: 500, id: 2 }]);
  await sleep(300);
  const afterB = await p.ev('__tabun.run.cx');
  await T('touchMove', [{ x: 330, y: 600, id: 1 }, { x: 380, y: 500, id: 2 }]);
  await sleep(500);
  const afterA = await p.ev('__tabun.run.cx');
  await T('touchEnd', []);
  ok(Math.abs(afterB) < 0.6 && afterA > 2, 'два пальца: второй не уводит табун (' + afterB.toFixed(2) + '), первый ведёт (' + afterA.toFixed(2) + ')');
  p.b.close();
}
srv.close();
console.log(fails ? `\n${fails} проблем` : '\nвсё чисто');
process.exit(fails ? 1 : 0);
