// Builds Ою for a portal: a folder and a zip with only what the game needs, the portal SDK on
// the page and window.OYU_PORTAL set (js/portal.js reads it), started through js/boot.js.
//
//   node oyu/tools/build-portal.mjs [crazygames]
//   node oyu/tools/build-portal.mjs --target playgama
//
// Output: dist/oyu-<portal>/ and dist/oyu-<portal>.zip in the repo root (dist/ is not in git).
// On a portal the play counter is off, saves go to the portal's storage (CrazyGames Data module,
// Playgama Bridge storage) and the logo is Latin. Playgama allows no requests besides Bridge
// itself: there js/pulse.js is a stub without the counter's address, and
// playgama-bridge-config.json sets the full-screen ads apart.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(game, '..');
const args = process.argv.slice(2);
const t = args.indexOf('--target');
const portal = t >= 0 ? args[t + 1] : args.find((a) => !a.startsWith('--')) || 'crazygames';
const SDK = {
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
  playgama: 'https://bridge.playgama.com/v2/stable/playgama-bridge.js',
};
if (!SDK[portal]) throw new Error('unknown portal ' + portal);

const out = path.join(repo, 'dist', 'oyu-' + portal);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'js'), { recursive: true });
for (const f of ['style.css', 'favicon.svg']) fs.copyFileSync(path.join(game, f), path.join(out, f));
for (const f of fs.readdirSync(path.join(game, 'js'))) if (f.endsWith('.js')) fs.copyFileSync(path.join(game, 'js', f), path.join(out, 'js', f));

if (portal === 'playgama') {
  fs.writeFileSync(
    path.join(out, 'js', 'pulse.js'),
    `// This build counts nothing of its own: the platform allows no requests besides its SDK
// (tools/build-portal.mjs puts this file in place of js/pulse.js).
export function pulse() {}
`,
  );
  const config = {
    advertisement: {
      minimumDelayBetweenInterstitial: 120,
      initialInterstitialDelay: 120,
      interstitial: { placementFallback: 'next_level', placements: [{ id: 'next_level' }, { id: 'retry' }] },
    },
  };
  fs.writeFileSync(path.join(out, 'playgama-bridge-config.json'), JSON.stringify(config, null, 4) + '\n');
}

let html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
const tag = '<script type="module" src="js/main.js"></script>';
if (!html.includes(tag)) throw new Error('index.html changed: main.js tag not found');
html = html
  .split(/\r?\n/)
  .filter((l) => !/name="theme-color"/.test(l))
  .join('\n')
  .replace(tag, `<script src="${SDK[portal]}"></script>\n<script>window.OYU_PORTAL = '${portal}';</script>\n<script type="module" src="js/boot.js"></script>`);
if (portal === 'playgama')
  html = html
    .replace(/<title>[^<]*<\/title>/, '<title>Oyu: Pixel Carpet</title>')
    // a long press opens no browser menu, the page does not scroll or pull to refresh
    .replace('</head>', `<style>html, body { overflow: hidden; overscroll-behavior: none; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }</style>\n<script>document.addEventListener('contextmenu', (e) => e.preventDefault());</script>\n</head>`);
fs.writeFileSync(path.join(out, 'index.html'), html);

const zip = path.join(repo, 'dist', `oyu-${portal}.zip`);
fs.rmSync(zip, { force: true });
// tar writes the paths with forward slashes (PowerShell 5 Compress-Archive writes "js\main.js",
// which a Linux server unpacks as a file of that name); Windows' own bsdtar, since the GNU tar of
// Git Bash takes "E:" for a host name
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-a', '-c', '-f', zip, ...fs.readdirSync(out)], { cwd: out, stdio: 'inherit' });
const files = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile());
const size = files.reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0);
console.log(`${out}: ${files.length} files, ${(size / 1024).toFixed(0)} KB`);
console.log(`${zip}: ${(fs.statSync(zip).size / 1024).toFixed(0)} KB`);
