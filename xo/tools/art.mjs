// Saves the pictures drawn by tools/art.html:  node xo/tools/art.mjs [--out folder]
//   img/xo.jpg        960×540   the card in the list of games
//   xo/og.jpg         1200×630  link preview
//   xo/icon-180.png   180×180   home screen icon
// With --out the files go to that folder instead, to look at them before replacing the real ones.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outArg = process.argv.indexOf('--out');
const out = outArg < 0 ? null : path.resolve(process.argv[outArg + 1]);
if (out) fs.mkdirSync(out, { recursive: true });
const place = (file) => (out ? path.join(out, path.basename(file)) : path.join(repo, file));

const PICTURES = [
  ['cover', 960, 540, 'img/xo.jpg', 'jpeg'],
  ['og', 1200, 630, 'xo/og.jpg', 'jpeg'],
  ['icon', 180, 180, 'xo/icon-180.png', 'png'],
];

const S = await serve(repo);
const B = await chrome();
try {
  for (const [kind, w, h, file, format] of PICTURES) {
    await B.open(`${S.url}/xo/tools/art.html?k=${kind}`, w, h);
    await B.js(`(async () => { await document.fonts.ready; for (let k = 0; k < 100 && !document.body.dataset.ready; k++) await new Promise((r) => setTimeout(r, 30)); })()`);
    await B.shot(place(file), format);
    console.log(`${place(file)}  ${w}x${h}  ${(fs.statSync(place(file)).size / 1024).toFixed(0)} KB`);
  }
  if (B.errors.length) console.log('page errors:', B.errors.join(' | '));
} finally {
  B.close();
  S.close();
}
