// Cover pictures for Штурм особняка, rendered by headless Chrome from the game's ?shot scene.
//   node breach/tools/covers.mjs
// Writes img/breach.jpg (960x540, the card on the home page) and breach/og.jpg (1200x630, link preview).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const S = await serve(repo);
const B = await chrome();
for (const [w, h, file] of [
  [960, 540, 'img/breach.jpg'],
  [1200, 630, 'breach/og.jpg'],
]) {
  await B.open(`${S.url}/breach/?shot=out&nopulse&lang=ru`, w, h);
  await B.js(`new Promise((r) => { const t = setInterval(() => { if (document.body.dataset.ready) { clearInterval(t); setTimeout(r, 3500); } }, 50); })`);
  await B.shot(path.join(repo, file), 'jpeg');
  console.log('wrote', file);
}
if (B.errors.length) console.log('page errors:', B.errors.slice(0, 5));
B.close();
S.close();
