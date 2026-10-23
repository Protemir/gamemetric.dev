// Gives every script and the stylesheet a version from its content, so a new upload is picked up at once
// and a browser never mixes a fresh file with a stale one (GitHub Pages lets them sit for 10 minutes):
//   node aryq/tools/stamp.mjs        (before each commit; tools/e2e.mjs checks that it was run)
// index.html gets an import map: "./js/sim.js" -> "./js/sim.js?v=<hash>", which every import follows.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (f) => crypto.createHash('sha1').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 8);
const js = fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js')).sort();
const map = Object.fromEntries(js.map((f) => [`./js/${f}`, `./js/${f}?v=${hash('js/' + f)}`]));
// every module the game needs is asked for at once, right after the map (a preload before the map
// would freeze it): no waterfall main -> sim -> util over a slow phone network (23.10)
const preload = js.filter((f) => f !== 'boot.js').map((f) => `<link rel="modulepreload" href="${map['./js/' + f]}">`).join('\n');
const block = `<script type="importmap">${JSON.stringify({ imports: map })}</script>\n${preload}`;

const file = path.join(root, 'index.html');
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/<script type="importmap">.*?<\/script>\n?/s, '').replace(/<link rel="modulepreload"[^>]*>\n?/g, '');
html = html.replace(/<link rel="stylesheet" href="style\.css[^"]*">/, `<link rel="stylesheet" href="style.css?v=${hash('style.css')}">`);
html = html.replace(/<script type="module" src="(\.\/)?js\/main\.js[^"]*"><\/script>/,`${block}\n<script type="module" src="${map['./js/main.js']}"></script>`);
fs.writeFileSync(file, html);
export const stamped = map;
console.log(`stamped ${js.length} scripts`);
