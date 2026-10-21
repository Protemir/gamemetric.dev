// Third round of covers (21.10.2026, CTR 1,3% on the board-with-finger cover): bigger, closer, brighter.
//   node aryq/tools/cover4.mjs [art dir]  ->  dist/aryq-covers4/  (v1..v3 in three formats + tiles.png at ~300 px)
// Variants: v1 water bursts into a dry garden (gemini-3), v2 the digger (gemini-1), v3 the board zoomed in (gemini-2).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const art = process.argv[2] || 'E:/PS/aryq-art';
const out = path.join(repo, 'dist', 'aryq-covers4');
fs.mkdirSync(out, { recursive: true });
const data = (file) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(art, file)).toString('base64');

// per variant and format: picture, its zoom (background-size as % of the frame width) and focus, title place
const V = {
  v1: {
    img: 'gemini-3.jpg',
    landscape: { size: '128%', pos: '30% 70%', title: 'right: 3.5%; top: 6%; text-align: right;', fs: 290 },
    square: { size: 'auto 118%', pos: '44% 60%', title: 'right: 4%; top: 4%; text-align: right;', fs: 160 },
    portrait: { size: 'auto 112%', pos: '42% 80%', title: 'left: 0; right: 0; top: 13%; text-align: center;', fs: 200 },
  },
  v2: {
    img: 'gemini-1.jpg',
    landscape: { size: '122%', pos: '40% 75%', title: 'right: 3.5%; top: 6%; text-align: right;', fs: 290 },
    square: { size: 'auto 112%', pos: '42% 70%', title: 'right: 4%; top: 4%; text-align: right;', fs: 160 },
    portrait: { size: 'auto 108%', pos: '36% 85%', title: 'left: 0; right: 0; top: 13%; text-align: center;', fs: 200 },
  },
  v3: {
    img: 'gemini-2.jpg',
    landscape: { size: '135%', pos: '62% 55%', title: 'right: 3.5%; top: 5%; text-align: right;', fs: 300 },
    square: { size: 'auto 112%', pos: '60% 60%', title: 'right: 4%; top: 4%; text-align: right;', fs: 160 },
    portrait: { size: 'auto 108%', pos: '52% 70%', title: 'left: 0; right: 0; top: 13%; text-align: center;', fs: 200 },
  },
  // 21.10 new Gemini art: v4 close-up of the canals splashing into dry ground (own portrait painting), v5 the board again, closer
  v4: {
    img: 'gemini-5.jpg',
    landscape: { size: '108%', pos: '30% 100%', title: 'right: 3.5%; top: 5%; text-align: right;', fs: 300 },
    square: { size: 'auto 100%', pos: '56% 100%', title: 'right: 4%; top: 3%; text-align: right;', fs: 165 },
    portrait: { img: 'gemini-5-portrait.jpg', size: 'auto 106%', pos: '0% 100%', title: 'left: 0; right: 0; top: 11%; text-align: center;', fs: 210, css: '.t small { position: relative; top: -1.8em; }' },
  },
  v5: {
    img: 'gemini-4.jpg',
    landscape: { size: '118%', pos: '35% 85%', title: 'right: 3.5%; top: 5%; text-align: right;', fs: 290 },
    square: { size: 'auto 112%', pos: '62% 70%', title: 'right: 4%; top: 3%; text-align: right;', fs: 160 },
    portrait: { size: 'auto 108%', pos: '62% 85%', title: 'left: 0; right: 0; top: 13%; text-align: center;', fs: 200 },
  },
};
const SIZES = { landscape: [1920, 1080], square: [800, 800], portrait: [800, 1200] };

const page = (img, o, w, h) => `<!doctype html><html><head><meta charset="utf-8"><style>
html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: #000; }
.bg { position: absolute; inset: 0; background: url(${img}) ${o.pos} / ${o.size} no-repeat; filter: saturate(1.18) contrast(1.06) brightness(1.03); }
.t { position: absolute; margin: 0; font-family: "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif; font-weight: 900; line-height: 0.84; letter-spacing: -0.01em;
  color: #ffe45c; -webkit-text-stroke: 0.07em #24160a; paint-order: stroke fill; text-shadow: 0 0.06em 0 #24160a, 0 0.12em 0.25em rgba(0,0,0,0.5);
  font-size: ${o.fs}px; ${o.title} }
.t small { display: inline-block; margin-top: 0.16em; padding: 0.12em 0.45em 0.17em; border-radius: 0.5em; background: #1f86c9; color: #fff; -webkit-text-stroke: 0; font-size: 0.25em; letter-spacing: 0.02em; text-shadow: none; box-shadow: 0 0.09em 0 #155c8a; }
${o.css || ''}
</style></head><body><div class="bg"></div><p class="t">ARYK<br><small>Water the Valley</small></p></body></html>`;

const B = await chrome();
const shot = async (htmlText, file, w, h) => {
  const html = path.join(out, 'tmp.html');
  fs.writeFileSync(html, htmlText);
  await B.open('file:///' + html.split(path.sep).join('/'), w, h);
  await new Promise((r) => setTimeout(r, 500));
  const r = await B.cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  fs.writeFileSync(path.join(out, file), Buffer.from(r.data, 'base64'));
  fs.rmSync(html);
};
try {
  const only = process.argv.slice(3);
  for (const [name, v] of Object.entries(V)) {
    if (only.length && !only.includes(name)) continue;
    for (const [kind, [w, h]] of Object.entries(SIZES)) await shot(page(data(v[kind].img || v.img), v[kind], w, h), `${name}-${kind}.png`, w, h);
  }
  // tiles as CrazyGames shows them: ~300 px wide, rounded, with the label box over the top-left corner (40% x 12%)
  const tile = (f, w, h) => `<div class="tile" style="width:${w}px;height:${h}px;background-image:url(${'data:image/png;base64,' + fs.readFileSync(f).toString('base64')})"><i></i></div>`;
  const cur = path.join(repo, 'dist', 'aryq-covers3');
  const rows = [['now', path.join(cur, 'final-landscape.png'), path.join(cur, 'final-portrait.png'), path.join(cur, 'final-square.png')]];
  for (const n of Object.keys(V)) if (fs.existsSync(path.join(out, `${n}-landscape.png`))) rows.push([n, ...['landscape', 'portrait', 'square'].map((k) => path.join(out, `${n}-${k}.png`))]);
  const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0; padding: 16px; background: #0c0d14; color: #ccc; font: 16px system-ui; }
.row { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
.row b { width: 40px; }
.tile { position: relative; border-radius: 10px; background-size: cover; background-position: center; overflow: hidden; }
.tile i { position: absolute; left: 6px; top: 6px; width: 22px; height: 22px; border-radius: 6px; background: #6b4dff; opacity: 0.9; }
</style></head><body>${rows.map(([n, l, p, s]) => `<div class="row"><b>${n}</b>${tile(l, 300, 169)}${tile(p, 150, 225)}${tile(s, 150, 150)}</div>`).join('')}</body></html>`;
  await shot(sheet, 'tiles.png', 720, 16 * 2 + rows.length * 241);
  console.log('covers in', out);
} finally {
  B.close();
}
