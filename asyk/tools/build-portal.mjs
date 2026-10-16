// Builds Асық for a portal: a folder and a zip with only what the game needs, the portal SDK on
// the page and window.ASYK_PORTAL set (js/portal.js reads it), started through js/boot.js.
//
//   node asyk/tools/build-portal.mjs [crazygames]
//
// Output: dist/asyk-<portal>/ and dist/asyk-<portal>.zip in the repo root (dist/ is not in git).
// On a portal saves go to the portal's Data module and its language and mute win.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(game, '..');
const portal = process.argv[2] || 'crazygames';
const SDK = { crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js' };
if (!SDK[portal]) throw new Error('unknown portal ' + portal);

const out = path.join(repo, 'dist', 'asyk-' + portal);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['style.css', 'favicon.svg']) fs.copyFileSync(path.join(game, f), path.join(out, f));
// code, art, voices and yard sounds; the tools and the art sources stay home
for (const dir of ['js', 'img', 'voice', 'sfx']) fs.cpSync(path.join(game, dir), path.join(out, dir), { recursive: true });

let html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
const tag = '<script type="module" src="js/main.js"></script>';
if (!html.includes(tag)) throw new Error('index.html changed: main.js tag not found');
html = html
  .split(/\r?\n/)
  .filter((l) => !/name="theme-color"|property="og:image"/.test(l))
  .join('\n')
  .replace(/<title>[^<]*<\/title>/, '<title>Asyk: Knucklebones</title>')
  .replace(tag, `<script src="${SDK[portal]}"></script>\n<script>window.ASYK_PORTAL = '${portal}';</script>\n<script type="module" src="js/boot.js"></script>`);
fs.writeFileSync(path.join(out, 'index.html'), html);

// the list of the game's files next to it on the site: a portal page can fetch the build from there
const list = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile()).map((f) => f.split(path.sep).join('/')).filter((f) => f !== 'index.html').sort();
fs.writeFileSync(path.join(game, 'files.json'), JSON.stringify(list) + '\n');

const zip = path.join(repo, 'dist', `asyk-${portal}.zip`);
fs.rmSync(zip, { force: true });
execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${out}\\*' -DestinationPath '${zip}'`], { stdio: 'inherit' });
const files = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile());
const size = files.reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0);
console.log(`${out}: ${files.length} files, ${(size / 1024 / 1024).toFixed(1)} MB`);
console.log(`${zip}: ${(fs.statSync(zip).size / 1024 / 1024).toFixed(1)} MB`);
