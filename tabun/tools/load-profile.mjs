// Профиль процессора от открытия до игры: какие функции съедают время загрузки.
//   node tabun/tools/load-profile.mjs [dir=tabun] [cpu=4]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch, sleep } from './cdp.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = process.argv[2] || 'tabun';
const cpu = Number(process.argv[3] || 4);
const srv = await serve(repo);
const b = await launch({ width: 390, height: 844, extra: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
await b.send('Emulation.setCPUThrottlingRate', { rate: cpu });
await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await b.send('Runtime.enable'); await b.send('Page.enable');
await b.send('Profiler.enable');
await b.send('Profiler.setSamplingInterval', { interval: 500 });
await b.send('Profiler.start');
const t0 = Date.now();
await b.send('Page.navigate', { url: `${srv.url}/${dir}/` });
for (let k = 0; k < 600; k++) {
  await sleep(100);
  try { if (await b.evaluate("!!window.__tabun && (() => { const l = document.getElementById('loading'); return !l || l.classList.contains('out'); })()")) break; } catch {}
}
console.log('до игры', ((Date.now() - t0) / 1000).toFixed(1), 'с');
const { profile } = await b.send('Profiler.stop');
const dt = (profile.endTime - profile.startTime) / profile.samples.length / 1000;
const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const incl = new Map();
for (const s of profile.samples) {
  const n = byId.get(s);
  const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`;
  self.set(k, (self.get(k) || 0) + dt);
  const seen = new Set();
  for (let id = s; id; id = parent.get(id)) {
    const m = byId.get(id); const kk = `${m.callFrame.functionName || '(anon)'} ${m.callFrame.url.split('/').pop()}:${m.callFrame.lineNumber + 1}`;
    if (seen.has(kk)) continue; seen.add(kk);
    incl.set(kk, (incl.get(kk) || 0) + dt);
  }
}
const top = (m, n) => [...m].sort((a, b2) => b2[1] - a[1]).slice(0, n).map(([k, v]) => `${v.toFixed(0).padStart(6)} мс  ${k}`).join('\n');
console.log('\nсвоё время:\n' + top(self, 18));
console.log('\nс вложенными (наши файлы):\n' + top(new Map([...incl].filter(([k]) => /\.js:/.test(k) && !/three\./.test(k))), 25));
b.close(); srv.close(); process.exit(0);
