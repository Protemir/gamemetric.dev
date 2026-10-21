// Frames of the living valley (21.10): water running down a new canal, the orchard's jump, grass and
// flowers coming up, yurt smoke. Real time, the game's own loop.
//   node aryq/tools/juice-shots.mjs [WxH=390x844]  ->  dist/aryq-juice/
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [w, h] = (process.argv[2] || '390x844').split('x').map(Number);
const out = path.join(repo, 'dist', 'aryq-juice');
fs.mkdirSync(out, { recursive: true });
const S = await serve(repo);
const B = await chrome();
const A = 'window.__aryq';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mouse = (type, x, y) => B.cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
try {
  await B.init("try { localStorage.clear(); localStorage.setItem('aryq.labelsSeen', 'true'); } catch {}");
  await B.open(`${S.url}/aryq/?debug&lang=ru&seed=1004`, w, h);
  await B.js(`document.querySelector('#ui .btn').click()`);
  await sleep(2600);
  const gh = JSON.parse(await B.js(`JSON.stringify(${A}.state.ghost)`));
  const pts = JSON.parse(await B.js(`JSON.stringify([${gh.from}, ...${JSON.stringify(gh.cells)}].map((i) => ${A}.view.center(i)))`));
  await B.js(`${A}.view.zoomAt(2, ${pts[0][0]}, ${pts[0][1]})`);
  const pts2 = JSON.parse(await B.js(`JSON.stringify([${gh.from}, ...${JSON.stringify(gh.cells)}].map((i) => ${A}.view.center(i)))`));
  await mouse('mousePressed', ...pts2[0]);
  for (const p of pts2.slice(1)) await mouse('mouseMoved', ...p);
  await mouse('mouseReleased', ...pts2[pts2.length - 1]);
  for (let k = 0; k < 6; k++) { await B.shot(path.join(out, `run-${k}.png`)); await sleep(60); }
  await sleep(4000);
  await B.shot(path.join(out, 'green-4s.png'));
  await B.js(`${A}.step(25)`);
  await sleep(6000);
  await B.shot(path.join(out, 'green-later.png'));
  console.log('frames in', out, B.errors.length ? B.errors.slice(0, 3) : 'no errors');
} finally { B.close(); S.close(); }
