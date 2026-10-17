// Builds Арык for a portal: a folder and a zip with only what the game needs, the portal SDK on the
// page and window.ARYQ_PORTAL set (js/portal.js reads it), started through js/boot.js.
//
//   node aryq/tools/build-portal.mjs [crazygames]
//
// Output: dist/aryq-<portal>/ and dist/aryq-<portal>.zip in the repo root (dist/ is not in git).
// On a portal saves go to the portal's Data module, there is no update check and the page title is
// the full English name. Run node aryq/tools/stamp.mjs first so the versions in index.html are fresh.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(game, '..');
const portal = process.argv[2] || 'crazygames';
const SDK = { crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js' };
if (!SDK[portal]) throw new Error('unknown portal ' + portal);

const out = path.join(repo, 'dist', 'aryq-' + portal);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'js'), { recursive: true });
fs.copyFileSync(path.join(game, 'style.css'), path.join(out, 'style.css'));
for (const f of fs.readdirSync(path.join(game, 'js'))) if (f.endsWith('.js')) fs.copyFileSync(path.join(game, 'js', f), path.join(out, 'js', f));

let html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
const main = html.match(/<script type="module" src="\.\/js\/main\.js\?v=[0-9a-f]+"><\/script>/);
const boot = html.match(/"\.\/js\/boot\.js":"(\.\/js\/boot\.js\?v=[0-9a-f]+)"/);
if (!main || !boot) throw new Error('index.html changed or not stamped: run node aryq/tools/stamp.mjs');
html = html
  .split(/\r?\n/)
  .filter((l) => !/name="theme-color"|name="robots"|rel="canonical"|property="og:/.test(l))
  .join('\n')
  .replace(/<title>[^<]*<\/title>/, '<title>Aryk: Water the Valley</title>')
  .replace(main[0], `<script src="${SDK[portal]}"></script>\n<script>window.ARYQ_PORTAL = '${portal}';</script>\n<script type="module" src="${boot[1]}"></script>`);
fs.writeFileSync(path.join(out, 'index.html'), html);

const zip = path.join(repo, 'dist', `aryq-${portal}.zip`);
fs.rmSync(zip, { force: true });
execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${out}\\*' -DestinationPath '${zip}'`], { stdio: 'inherit' });
const files = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile());
const size = files.reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0);
console.log(`${out}: ${files.length} files, ${(size / 1024).toFixed(0)} KB`);
console.log(`${zip}: ${(fs.statSync(zip).size / 1024).toFixed(0)} KB`);
