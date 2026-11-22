// Bakes billboard strips of heavy Poly Haven plants with headless Chrome:
//   node breach/tools/bake-trees.mjs <folder with the downloaded models> <name> <out.png> [views] [size] [exposure]
// The folder holds <name>/<name>.gltf with its .bin and textures (the 1k glTF download).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const [dir, name, out, n = '4', s = '512', exp = '1.0'] = process.argv.slice(2);
const here = path.dirname(fileURLToPath(import.meta.url));
const breach = path.resolve(here, '..');
// the page and three.js go next to the model so one static server covers all of it
fs.copyFileSync(path.join(here, 'bake-trees.html'), path.join(dir, 'bake.html'));
fs.mkdirSync(path.join(dir, 'vendor/loaders'), { recursive: true });
fs.mkdirSync(path.join(dir, 'vendor/utils'), { recursive: true });
fs.copyFileSync(path.join(breach, 'vendor/three.module.min.js'), path.join(dir, 'vendor/three.module.min.js'));
fs.copyFileSync(path.join(breach, 'vendor/loaders/GLTFLoader.js'), path.join(dir, 'vendor/loaders/GLTFLoader.js'));
fs.copyFileSync(path.join(breach, 'vendor/utils/BufferGeometryUtils.js'), path.join(dir, 'vendor/utils/BufferGeometryUtils.js'));
const S = await serve(dir);
const B = await chrome();
await B.open(`${S.url}/bake.html?m=${name}/${name}.gltf&n=${n}&s=${s}&exp=${exp}`, 600, 600);
const r = await B.js(`new Promise((ok, fail) => { const t0 = Date.now(); const t = setInterval(() => { if (window.result) { clearInterval(t); ok(window.result); } else if (Date.now() - t0 > 240000) { clearInterval(t); fail(new Error('timeout')); } }, 200); })`);
fs.writeFileSync(out, Buffer.from(r.png.split(',')[1], 'base64'));
console.log(JSON.stringify({ out, width: r.width, height: r.height, n: r.n }));
if (B.errors.length) console.log('page errors:', B.errors.slice(0, 5));
B.close();
S.close();
