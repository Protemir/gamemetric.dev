// Долгая сессия: N уровней подряд через меню, с поворотами экрана; следим, что ничего не копится.
// node tools/long.mjs [уровней]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch, sleep } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const N = Number(process.argv[2] || 30);
const srv = await serve(root);
const b = await launch({ width: 390, height: 844, extra: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
const errors = [];
b.on((m) => {
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
});
await b.send('Runtime.enable'); await b.send('Page.enable');
await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await b.send('Page.navigate', { url: `${srv.url}/tabun/?lang=ru&menu` });
for (let k = 0; k < 100; k++) { await sleep(200); try { if (await b.evaluate('__tabun?.state === "menu"')) break; } catch { /* */ } }
const ev = (x) => b.evaluate(x);
await ev('(__tabun.setSave({ coins: 0, played: 5, daily: { last: "x", streak: 0 } }), 1)');
const snap = () => ev(`(() => { const W = __tabun.world, i = W.renderer.info; let objs = 0; W.scene.traverse(() => objs++); return { lvl: __tabun.save.lvl, g: i.memory.geometries, t: i.memory.textures, prog: i.programs.length, objs, kids: W.scene.children.length, heap: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6), labels: document.getElementById('labels').children.length, ghosts: __tabun.run.ghosts.length }; })()`);
const rows = [];
for (let i = 0; i < N; i++) {
  await ev('(__tabun.menu(), document.getElementById("modal").classList.add("hidden"), __tabun.start(), 1)');
  await sleep(250);
  if (i % 4 === 1) await b.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  if (i % 4 === 3) await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await ev(`(() => { const r = __tabun.run; let g = 0; while ((r.state === 'run' || r.state === 'clash' || r.state === 'ladder') && g++ < 60*150) r.step(1/60, __tabun.auto(r)); return r.state; })()`);
  for (let k = 0; k < 40; k++) { await sleep(150); if (await ev('__tabun.state === "result"')) break; }
  await sleep(1500); // монеты долетают, фейерверк догорает
  rows.push(await snap());
}
console.log(rows.map((r) => `ур${r.lvl} g${r.g} t${r.t} p${r.prog} obj${r.objs} sc${r.kids} heap${r.heap} lab${r.labels}`).join('\n'));
const a = rows[3], z = rows[rows.length - 1];
const grow = { g: z.g - a.g, t: z.t - a.t, prog: z.prog - a.prog, objs: z.objs - a.objs, kids: z.kids - a.kids, heap: z.heap - a.heap, labels: z.labels };
console.log('рост с 4-го уровня до конца:', JSON.stringify(grow));
const bad = grow.g > 30 || grow.t > 8 || grow.prog > 6 || grow.kids > 5 || grow.objs > 200 || grow.heap > 40 || grow.labels > 20;
if (errors.length) console.log('ERRORS', [...new Set(errors)].slice(0, 5).join(' | '));
console.log(bad || errors.length ? 'есть проблема' : 'всё чисто');
b.close(); srv.close();
process.exit(bad || errors.length ? 1 : 0);
