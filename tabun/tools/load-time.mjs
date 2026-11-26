// Сколько грузится «Табун» на телефоне с мобильным интернетом: время до меню/первого забега и что качалось.
//   node tabun/tools/load-time.mjs [dir=tabun|dist/tabun-playgama] [Mbit=8] [cpu=4] [runs=2]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch, sleep } from './cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = process.argv[2] || 'tabun';
const mbit = Number(process.argv[3] || 8);
const cpu = Number(process.argv[4] || 4);
const runs = Number(process.argv[5] || 2);
const srv = await serve(repo);
const times = [];
for (let i = 0; i < runs; i++) {
  const b = await launch({ width: 390, height: 844, extra: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const reqs = new Map();
  let bytes = 0;
  b.on((m) => {
    if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, { url: m.params.request.url, t0: m.params.timestamp });
    if (m.method === 'Network.loadingFinished') {
      const r = reqs.get(m.params.requestId);
      if (r) { r.t1 = m.params.timestamp; r.size = m.params.encodedDataLength; bytes += r.size; }
    }
  });
  await b.send('Network.enable');
  await b.send('Network.setCacheDisabled', { cacheDisabled: true });
  await b.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: (mbit * 1e6) / 8, uploadThroughput: 1e6 / 8 });
  await b.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await b.send('Runtime.enable');
  await b.send('Page.enable');
  await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await b.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const t0 = Date.now();
  await b.send('Page.navigate', { url: `${srv.url}/${dir}/` });
  let ready = 0;
  for (let k = 0; k < 600; k++) {
    await sleep(100);
    try {
      if (await b.evaluate("!!window.__tabun && (() => { const l = document.getElementById('loading'); return !l || l.classList.contains('out'); })()")) { ready = Date.now() - t0; break; }
    } catch { /* грузится */ }
  }
  const tStart = Math.min(...[...reqs.values()].map((r) => r.t0));
  const list = [...reqs.values()].filter((r) => r.t1).sort((a, b2) => a.t0 - b2.t0);
  console.log(`\nзапуск ${i + 1}: до игры ${(ready / 1000).toFixed(1)} с, скачано ${(bytes / 1e6).toFixed(2)} МБ`);
  if (i === 0) for (const r of list) console.log(`  ${((r.t0 - tStart) * 1000).toFixed(0).padStart(6)} → ${((r.t1 - tStart) * 1000).toFixed(0).padStart(6)} мс  ${(r.size / 1024).toFixed(0).padStart(5)} КБ  ${r.url.replace(srv.url, '')}`);
  times.push(ready);
  b.close();
}
srv.close();
console.log(`\nсреднее до игры: ${(times.reduce((a, b) => a + b, 0) / times.length / 1000).toFixed(1)} с (сеть ${mbit} Мбит/с, CPU ×${cpu})`);
process.exit(0);
