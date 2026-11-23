// Covers for the portals, rendered by headless Chrome from the game's staged ?shot scene with the title on top.
//   node breach/tools/portal-art.mjs
// Writes dist/breach-art/cover-1920x1080.png, cover-1080x1920.png, cover-800x800.png (and 800x1200).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(repo, 'dist', 'breach-art');
fs.mkdirSync(dir, { recursive: true });
const S = await serve(repo);
const B = await chrome();
const title = (w, h) => `(() => {
  const s = Math.min(${w}, ${h} * 1.6) / 1920;
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:0;right:0;' + (${h} >= ${w} ? 'top:6%;' : 'bottom:7%;') + 'text-align:center;z-index:99;pointer-events:none;font-family:Bebas Neue, Oswald, Impact, Arial Black, sans-serif;';
  d.innerHTML = '<div style="font-size:' + Math.round(170 * s * (${h} >= ${w} ? 1.7 : 1)) + 'px;line-height:0.95;letter-spacing:0.04em;color:#ffd166;text-shadow:0 4px 0 #6b3d00,0 10px 30px rgba(0,0,0,0.8)">MANSION<br>BREACH</div>'
    + '<div style="margin-top:' + Math.round(14 * s) + 'px;font-size:' + Math.round(46 * s * (${h} >= ${w} ? 1.7 : 1)) + 'px;letter-spacing:0.12em;color:#fff;text-shadow:0 3px 12px rgba(0,0,0,0.9);font-family:Arial Black, sans-serif">5v5 TACTICAL SHOOTER</div>';
  const g = document.createElement('div');
  g.style.cssText = 'position:fixed;inset:0;z-index:98;pointer-events:none;background:linear-gradient(to ' + (${h} >= ${w} ? 'bottom' : 'top') + ', rgba(0,0,0,0.65), rgba(0,0,0,0) 45%)';
  document.body.append(g, d);
  for (const id of ['hud', 'touch']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
})()`;
for (const [w, h] of [[1920, 1080], [1080, 1920], [800, 800], [800, 1200]]) {
  await B.open(`${S.url}/breach/?shot=out&nopulse&lang=en`, w, h);
  await B.js(`new Promise((r) => { const t = setInterval(() => { if (document.body.dataset.ready) { clearInterval(t); setTimeout(r, 3500); } }, 50); })`);
  await B.js(title(w, h));
  await new Promise((r) => setTimeout(r, 400));
  const file = path.join(dir, `cover-${w}x${h}.png`);
  await B.shot(file, 'png');
  console.log('wrote', path.relative(repo, file));
}
if (B.errors.length) console.log('page errors:', B.errors.slice(0, 5));
B.close();
S.close();
