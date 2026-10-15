// Builds Ою for a portal: a folder and a zip with only what the game needs, the portal SDK on
// the page and window.OYU_PORTAL set (js/portal.js reads it), started through js/boot.js.
//
//   node oyu/tools/build-portal.mjs [crazygames]
//
// Output: dist/oyu-<portal>/ and dist/oyu-<portal>.zip in the repo root (dist/ is not in git).
// On a portal the play counter is off, saves go to the portal's Data module and the logo is Latin.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(game, '..');
const portal = process.argv[2] || 'crazygames';
const SDK = { crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js' };
if (!SDK[portal]) throw new Error('unknown portal ' + portal);

const out = path.join(repo, 'dist', 'oyu-' + portal);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'js'), { recursive: true });
for (const f of ['style.css', 'favicon.svg']) fs.copyFileSync(path.join(game, f), path.join(out, f));
for (const f of fs.readdirSync(path.join(game, 'js'))) if (f.endsWith('.js')) fs.copyFileSync(path.join(game, 'js', f), path.join(out, 'js', f));

let html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
const tag = '<script type="module" src="js/main.js"></script>';
if (!html.includes(tag)) throw new Error('index.html changed: main.js tag not found');
html = html
  .split(/\r?\n/)
  .filter((l) => !/name="theme-color"/.test(l))
  .join('\n')
  .replace(tag, `<script src="${SDK[portal]}"></script>\n<script>window.OYU_PORTAL = '${portal}';</script>\n<script type="module" src="js/boot.js"></script>`);
fs.writeFileSync(path.join(out, 'index.html'), html);

const zip = path.join(repo, 'dist', `oyu-${portal}.zip`);
fs.rmSync(zip, { force: true });
execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${out}\\*' -DestinationPath '${zip}'`], { stdio: 'inherit' });
const files = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile());
const size = files.reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0);
console.log(`${out}: ${files.length} files, ${(size / 1024).toFixed(0)} KB`);
console.log(`${zip}: ${(fs.statSync(zip).size / 1024).toFixed(0)} KB`);
