// Covers from painted key art (E:\PS\aryq-art\gemini-N.jpg, made in Gemini 20.10.2026) with the
// game's title on top: 1920x1080, plus 800x800 and 800x1200 crops.
//   node aryq/tools/cover-art.mjs [art dir]  ->  dist/aryq-covers3/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const art = process.argv[2] || 'E:/PS/aryq-art';
const out = path.join(repo, 'dist', 'aryq-covers3');
fs.mkdirSync(out, { recursive: true });
const B = await chrome();

// where the title sits on each picture (they were asked to keep the upper right calm)
const PLACE = {
  1: 'right: 4%; top: 6%; text-align: right;',
  2: 'right: 3.5%; top: 5%; text-align: right;',
  3: 'right: 4%; top: 6%; text-align: right;',
};
const SIZES = { landscape: [1920, 1080], square: [800, 800], portrait: [800, 1200] };

const page = (img, kind, n, w, h) => `<!doctype html><html><head><meta charset="utf-8"><style>
html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: #000; }
.bg { position: absolute; inset: 0; background: url(${img}) ${kind === 'landscape' ? 'center' : n === 2 ? '42% center' : '38% center'} / cover no-repeat; }
.t { position: absolute; margin: 0; font-family: "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif; font-weight: 900; line-height: 0.84; letter-spacing: -0.01em;
  color: #ffe45c; -webkit-text-stroke: 0.065em #24160a; paint-order: stroke fill; text-shadow: 0 0.06em 0 #24160a, 0 0.12em 0.22em rgba(0,0,0,0.45);
  font-size: ${kind === 'landscape' ? 300 : kind === 'square' ? 150 : 190}px; ${kind === 'landscape' ? PLACE[n] : kind === 'square' ? 'right: 3%; top: 5%; text-align: right;' : 'left: 0; right: 0; top: 12%; text-align: center;'} }
/* CrazyGames puts its labels in the top-left corner: the title on tall and square covers starts below it */
.t small { display: inline-block; margin-top: 0.16em; padding: 0.12em 0.45em 0.17em; border-radius: 0.5em; background: #1f86c9; color: #fff; -webkit-text-stroke: 0; font-size: 0.25em; letter-spacing: 0.02em; text-shadow: none; box-shadow: 0 0.09em 0 #155c8a; }
</style></head><body><div class="bg"></div><p class="t">ARYK<br><small>Water the Valley</small></p></body></html>`;

// the chosen cover (20.10): picture 2, with its own portrait painting; the square is cut from that
const FINAL = process.argv.includes('--final');
const shotPage = async (htmlText, name, w, h) => {
  const html = path.join(out, 'tmp.html');
  fs.writeFileSync(html, htmlText);
  await B.open('file:///' + html.split(path.sep).join('/'), w, h);
  await new Promise((r) => setTimeout(r, 400));
  const r = await B.cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  fs.writeFileSync(path.join(out, name), Buffer.from(r.data, 'base64'));
  fs.rmSync(html);
};
// the same page with the picture placed differently
const placed = (htmlText, img, pos) => htmlText.replace(/[.]bg [{][^}]*[}]/, `.bg { position: absolute; inset: 0; background: url(${img}) ${pos} / cover no-repeat; }`);
const data = (file) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(art, file)).toString('base64');
try {
  if (FINAL) {
    await shotPage(page(data('gemini-2.jpg'), 'landscape', 2, 1920, 1080), 'final-landscape.png', 1920, 1080);
    const tall = data('gemini-2-portrait.jpg');
    await shotPage(placed(page(tall, 'portrait', 2, 800, 1200), tall, 'center top'), 'final-portrait.png', 800, 1200);
    await shotPage(placed(page(tall, 'square', 2, 800, 800), tall, 'center 72%'), 'final-square.png', 800, 800);
    console.log('final covers in', out);
  }
  for (const n of FINAL ? [] : [1, 2, 3]) {
    const file = path.join(art, `gemini-${n}.jpg`);
    if (!fs.existsSync(file)) continue;
    const img = 'data:image/jpeg;base64,' + fs.readFileSync(file).toString('base64');
    for (const [kind, [w, h]] of Object.entries(SIZES)) {
      const html = path.join(out, `tmp-${n}-${kind}.html`);
      fs.writeFileSync(html, page(img, kind, n, w, h));
      await B.open('file:///' + html.replace(/\\/g, '/'), w, h);
      await new Promise((r) => setTimeout(r, 400));
      const r = await B.cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
      fs.writeFileSync(path.join(out, `art${n}-${kind}.png`), Buffer.from(r.data, 'base64'));
      fs.rmSync(html);
    }
  }
  console.log('covers in', out);
} finally {
  B.close();
}
