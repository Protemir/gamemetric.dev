// Сценарии на баги + прогон многих уровней подряд (утечки геометрий/текстур, ошибки).
// node tools/soak.mjs [уровней]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch, sleep } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const N = Number(process.argv[2] || 15);
const srv = await serve(root);
const b = await launch({ width: 800, height: 450, extra: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
b.on((m) => {
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errors.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
});
await b.send('Runtime.enable'); await b.send('Page.enable');
await b.send('Page.navigate', { url: `${srv.url}/tabun/?lang=ru&menu` });
for (let k = 0; k < 100; k++) { await sleep(200); try { if (await b.evaluate('__tabun?.state === "menu"')) break; } catch { /* */ } }
let fails = 0;
const ok = (cond, msg) => { console.log(cond ? 'ok  ' : 'FAIL', msg); if (!cond) fails++; };
const ev = (x) => b.evaluate(x);
const fast = `(() => { const r = __tabun.run; let g = 0; while ((r.state === 'run' || r.state === 'clash' || r.state === 'ladder') && g++ < 60*120) r.step(1/60, __tabun.auto(r)); return r.state; })()`;

// 1) покупка коня в меню — новый конь виден сразу
await ev('(__tabun.setSave({ coins: 5000, played: 1, daily: { last: "x", streak: 0 } }), __tabun.menu(), document.getElementById("modal").classList.add("hidden"), 1)');
const before = await ev('__tabun.run.bodies.length');
await ev('(document.querySelector("#ups .up .buy").click(), 1)');
await sleep(200);
ok(await ev(`__tabun.run.bodies.length === ${before + 1} && __tabun.run.bodies.every((h) => h.spawn === 1)`), 'купленный конь появился и виден');

// 2) пробел + клик по кнопке не стартуют дважды
await ev('(document.getElementById("playBtn").focus(), 1)');
await b.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Space', key: ' ', windowsVirtualKeyCode: 32 });
await b.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Space', key: ' ', windowsVirtualKeyCode: 32 });
await sleep(300);
const runId1 = await ev('(__tabun.run.__id = __tabun.run.__id || Math.random())');
await ev('(document.getElementById("playBtn").click(), 1)');
await sleep(200);
ok(await ev(`__tabun.state === "play" && __tabun.run.__id === ${runId1}`), 'двойной старт не сбрасывает уровень');

// 3) забег решён — пауза не включается (иначе «В меню» терял бы награду), итоги показываются
await ev(fast);
await sleep(300);
await ev('(document.getElementById("pauseBtn").click(), 1)');
ok(await ev('__tabun.state !== "pause"'), 'после финиша пауза не включается');
for (let k = 0; k < 30; k++) { await sleep(200); if (await ev('__tabun.state === "result"')) break; }
ok(await ev('__tabun.state === "result"'), 'итоги показались');

// 4) смена размера посреди забега
await ev('(__tabun.menu(), document.getElementById("modal").classList.add("hidden"), __tabun.start(), 1)');
await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await sleep(600);
await b.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 450, deviceScaleFactor: 1, mobile: false });
await sleep(400);
ok(await ev('__tabun.world.w === innerWidth && __tabun.world.h === innerHeight'), 'размер холста следует за окном');

// 4б) победа: звёзды сохранены, монеты долетели и счётчик сошёлся
await ev('(__tabun.menu(), document.getElementById("modal").classList.add("hidden"), __tabun.start(), 1)');
await sleep(200);
await ev(fast);
for (let k = 0; k < 40; k++) { await sleep(150); if (await ev('__tabun.state === "result"')) break; }
const w = await ev('({ win: __tabun.run.result?.win, n: __tabun.run.L.n, st: __tabun.save.stars[__tabun.run.L.n], icons: document.querySelectorAll("#resStars i").length, combo: __tabun.run.bestCombo })');
ok(w.win && w.st >= 1 && w.st <= 3 && w.icons === 3, 'звёзды за победу: ' + JSON.stringify(w));
await sleep(2500);
const cc = await ev('({ shown: document.querySelector("#hudCoins b").textContent.replace(/[^0-9]/g, ""), real: String(__tabun.save.coins), vis: document.getElementById("hudCoins").offsetParent !== null })');
ok(cc.vis && cc.shown === cc.real, 'счётчик монет на итогах совпал с сохранением: ' + JSON.stringify(cc));
await ev('(document.getElementById("resNext").click(), 1)');
await sleep(300);
ok(await ev('document.getElementById("starTotal").textContent.includes(String(Object.values(__tabun.save.stars).reduce((a,b)=>a+b,0)))'), 'звёзды в меню посчитаны');

// 4в) музыка: переключатель в настройках сохраняется
await ev('(__tabun.menu(), document.getElementById("modal").classList.add("hidden"), document.getElementById("setBtn").click(), 1)');
await sleep(300);
await ev('(document.getElementById("mMusic").click(), 1)');
await sleep(200);
ok(await ev('__tabun.save.music === false && JSON.parse(localStorage.getItem("tabun.save.v1")).music === false && document.getElementById("mMusic").textContent.length > 0'), 'музыка выключается и это сохраняется');
await ev('(document.getElementById("mMusic").click(), document.getElementById("modal").classList.add("hidden"), 1)');

// 4г) «Байга дня»: ночь, двойная награда только за первую победу дня
const dailyRun = async () => {
  await ev('(__tabun.menu(), document.getElementById("modal").classList.add("hidden"), 1)');
  await sleep(200);
  const c0 = await ev('__tabun.save.coins');
  const lvl0 = await ev('__tabun.save.lvl');
  await ev('(document.getElementById("dailyBtn").click(), 1)');
  await sleep(300);
  const info = await ev('({ st: __tabun.state, daily: !!__tabun.run.L.daily, theme: __tabun.run.L.theme })');
  await ev(fast);
  for (let k = 0; k < 40; k++) { await sleep(150); if (await ev('__tabun.state === "result"')) break; }
  const r = await ev('({ win: __tabun.run.result?.win, mult: __tabun.run.result?.mult, coins: __tabun.run.result?.coins, n: __tabun.run.L.n, base: __tabun.run.L.base })');
  const c1 = await ev('__tabun.save.coins');
  const lvl1 = await ev('__tabun.save.lvl');
  return { info, r, gain: c1 - c0, lvlSame: lvl0 === lvl1 };
};
// все достижения уже открыты — чтобы награда за них не путала счёт
await ev('(__tabun.setSave({ ach: Object.fromEntries("herd100 herd300 herd999 combo5 golden lucky stars3 noloss boss daily lvl10 lvl25".split(" ").map((k) => [k, 1])) }), 1)');
const d1 = await dailyRun();
const inc = await ev('__tabun.save.up.income');
const expect1 = d1.r.win ? (Math.round(d1.r.base * d1.r.mult * (1 + inc * 0.1)) + d1.r.coins) * 2 : -1;
ok(d1.info.st === 'play' && d1.info.daily && d1.info.theme === 'night', 'байга дня запускается ночью');
ok(d1.r.win && d1.gain === expect1 && d1.lvlSame, 'первая победа дня — ×2 и уровень не сдвинулся: ' + JSON.stringify({ gain: d1.gain, expect1 }));
await ev('(document.getElementById("resNext").click(), 1)');
await sleep(300);
ok(await ev('document.getElementById("dailyBtn").textContent.includes("✓")'), 'кнопка байги дня отмечена');
const d2 = await dailyRun();
ok(d2.r.win && d2.gain === expect1 / 2, 'повторная победа — без удвоения: ' + d2.gain);
await ev('(document.getElementById("resNext").click(), 1)');
await sleep(300);

// 4д) достижения: сотня в забеге → тост и +100 ₸; витрина; «Поделиться» без ошибок
await ev('(__tabun.setSave({ ach: {} }), __tabun.menu(), document.getElementById("modal").classList.add("hidden"), __tabun.start(), 1)');
await sleep(400);
const cA = await ev('__tabun.save.coins');
await ev('(() => { const r = __tabun.run; r.count = 120; r.sync(); return 1; })()');
await sleep(500);
const ac = await ev('({ got: !!__tabun.save.ach.herd100, toast: !document.getElementById("toast").classList.contains("hidden"), coins: __tabun.save.coins })');
ok(ac.got && ac.toast && ac.coins === cA + 100, 'сотня: достижение, тост и +100 ₸ ' + JSON.stringify(ac));
await ev(fast);
for (let k = 0; k < 40; k++) { await sleep(150); if (await ev('__tabun.state === "result"')) break; }
ok(await ev('!document.getElementById("resShare").classList.contains("hidden") === !!__tabun.run.result.win'), 'кнопка «Поделиться» только при победе');
await ev('(document.getElementById("resShare").click(), 1)');
await sleep(800);
await ev('(document.getElementById("resNext").click(), 1)');
await sleep(300);
await ev('(document.getElementById("achBtn").click(), 1)');
await sleep(300);
ok(await ev('document.querySelectorAll(".achs .ach").length === 12 && document.querySelectorAll(".achs .ach.got").length === Object.keys(__tabun.save.ach).length'), 'витрина: 12 строк, открытые отмечены');
await ev('(document.getElementById("modal").classList.add("hidden"), 1)');

// 5) много уровней подряд: память GPU не растёт
const mem = [];
for (let i = 0; i < N; i++) {
  await ev('(__tabun.state === "play" || (__tabun.menu(), document.getElementById("modal").classList.add("hidden"), __tabun.start()), 1)');
  await sleep(150);
  await ev(fast);
  for (let k = 0; k < 40; k++) { await sleep(150); if (await ev('__tabun.state === "result"')) break; }
  const st = await ev('({ lvl: __tabun.save.lvl, win: __tabun.run.result?.win, g: __tabun.world.renderer.info.memory.geometries, t: __tabun.world.renderer.info.memory.textures })');
  mem.push(st);
  await ev('(document.getElementById("resNext").click(), 1)');
  await sleep(250);
}
console.log(mem.map((m) => `ур${m.lvl}${m.win ? '+' : '-'} g${m.g} t${m.t}`).join(' | '));
const g0 = mem[2].g, gN = mem[mem.length - 1].g, t0 = mem[2].t, tN = mem[mem.length - 1].t;
ok(gN - g0 < 40 && tN - t0 < 10, `нет утечки: геометрий ${g0}→${gN}, текстур ${t0}→${tN}`);
ok(errors.length === 0, 'ошибок в консоли нет' + (errors.length ? ': ' + [...new Set(errors)].slice(0, 6).join(' | ') : ''));
b.close(); srv.close();
console.log(fails ? `\n${fails} проблем` : '\nвсё чисто');
process.exit(fails ? 1 : 0);
