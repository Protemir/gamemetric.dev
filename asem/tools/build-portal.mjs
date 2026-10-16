// Builds the game for a portal: a folder and a zip with only what the game needs,
// the portal SDK on the page and window.ASEM_PORTAL set (js/portal.js reads it).
//
//   node tools/build-portal.mjs [crazygames]
//
// Output: dist/<portal>/ and dist/asem-<portal>.zip (dist/ is not in git).
// On a portal the game hides the leaderboard, sharing, links out and its own
// full screen button, does not send the play counter, and drops a new player
// straight into chapter 1.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portal = process.argv[2] || 'crazygames';
const SDK = { crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js' };
if (!SDK[portal]) throw new Error('unknown portal ' + portal);

const out = path.join(root, 'dist', portal);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'js'), { recursive: true });

for (const f of ['style.css', 'favicon.svg']) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const f of fs.readdirSync(path.join(root, 'js'))) {
  if (f.endsWith('.js')) fs.copyFileSync(path.join(root, 'js', f), path.join(out, 'js', f));
}

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// the site's own head: address, install-as-app and link previews mean nothing inside a portal frame
html = html
  .split(/\r?\n/)
  .filter((l) => !/rel="(canonical|manifest|apple-touch-icon|alternate)"|name="(apple-mobile|mobile-web-app|theme-color|twitter:)|property="og:/.test(l))
  .join('\n')
  // portals review and list the game in English; the game itself still picks the player's language
  .replace(/<html lang="ru">/, '<html lang="en">')
  .replace(/<title>[^<]*<\/title>/, '<title>Asem Road: Almaty Racing</title>')
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Race across Kazakhstan: Almaty by night, Medeu, Shymbulak, Kapchagay, Charyn, Kolsai and Astana on New Year\'s Eve.">')
  .replace(/<canvas id="game" aria-label="[^"]*">/, '<canvas id="game" aria-label="Asem Road">')
  .replace('<b>Әсем Жол</b>', '<b>Asem Road<span class="subname">Almaty Racing</span></b>')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/, '')
  .replace(/<script>\s*\/\/ players coming from the old address[\s\S]*?<\/script>\n?/, '');
const head = `<script src="${SDK[portal]}"></script>\n<script>window.ASEM_PORTAL = '${portal}';</script>\n`;
if (!html.includes('<script type="module" src="js/main.js"></script>')) throw new Error('index.html changed: main.js tag not found');
// boot.js waits for the SDK (saves go to its Data module), then loads main.js
html = html.replace('<script type="module" src="js/main.js"></script>', head + '<script type="module" src="js/boot.js"></script>');
fs.writeFileSync(path.join(out, 'index.html'), html);

// every file must be referenced by a relative path
const abs = [];
for (const f of fs.readdirSync(path.join(out, 'js'))) {
  const src = fs.readFileSync(path.join(out, 'js', f), 'utf8');
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\/[^'"]*)['"]/g)) abs.push(`${f}: ${m[1]}`);
}
if (abs.length) throw new Error('absolute imports: ' + abs.join(', '));

const zip = path.join(root, 'dist', `asem-${portal}.zip`);
fs.rmSync(zip, { force: true });
execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${out}\\*' -DestinationPath '${zip}'`], { stdio: 'inherit' });

const size = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((s, d) => s + (d.isDirectory() ? size(path.join(dir, d.name)) : fs.statSync(path.join(dir, d.name)).size), 0);
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((s, d) => s + (d.isDirectory() ? files(path.join(dir, d.name)) : 1), 0);
console.log(`${out}: ${files(out)} files, ${(size(out) / 1024).toFixed(0)} KB`);
console.log(`${zip}: ${(fs.statSync(zip).size / 1024).toFixed(0)} KB`);
