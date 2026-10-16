// Turns asyk/img/*.png|jpg (from cutout.ps1) into WebP through headless Chrome's encoder,
// then removes the originals: the game loads only .webp.
//   node asyk/tools/webp.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const img = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../img');
const files = fs.readdirSync(img).filter((f) => /\.(png|jpg)$/.test(f));
if (!files.length) {
  console.log('nothing to convert');
  process.exit(0);
}
const S = await serve(img);
const B = await chrome();
await B.open(S.url + '/sprites.json', 200, 200);
let before = 0;
let after = 0;
for (const f of files) {
  // photos of the yards a little harder, cut-out sprites keep their soft edges
  const q = f.endsWith('.jpg') ? 0.8 : 0.86;
  const b64 = await B.js(`new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      c.getContext('2d').drawImage(im, 0, 0);
      res(c.toDataURL('image/webp', ${q}).split(',')[1]);
    };
    im.onerror = () => rej(new Error('load ${f}'));
    im.src = ${JSON.stringify('/' + f)};
  })`);
  const out = path.join(img, f.replace(/\.(png|jpg)$/, '.webp'));
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  before += fs.statSync(path.join(img, f)).size;
  after += fs.statSync(out).size;
  fs.rmSync(path.join(img, f));
}
B.close();
S.close();
console.log(`${files.length} files: ${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024 / 1024).toFixed(1)} MB`);
