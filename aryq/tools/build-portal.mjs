// Builds Арык for a portal: a folder and a zip with only what the game needs, the portal SDK on the
// page and window.ARYQ_PORTAL set (js/portal.js reads it), started through js/boot.js.
//
//   node aryq/tools/build-portal.mjs [crazygames]
//   node aryq/tools/build-portal.mjs --target playgama
//   node aryq/tools/build-portal.mjs --target yandex
//
// Output: dist/aryq-<portal>/ and dist/aryq-<portal>.zip in the repo root (dist/ is not in git),
// index.html at the root of the zip.
// On a portal saves go to the portal's storage (CrazyGames Data module, Playgama Bridge storage),
// there is no update check and the page title is the full English name. Playgama allows no requests
// besides Bridge itself: there js/pulse.js counts nothing, and playgama-bridge-config.json sets the
// full-screen ads apart. Yandex Games hosts the SDK itself at /sdk.js; there too js/pulse.js counts
// nothing, the page blocks the browser's long-press menu and pull-to-refresh, and the scripts lose
// their comment lines. Run node aryq/tools/stamp.mjs first so the versions in index.html are fresh.
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
  yandex: '/sdk.js',
};
const own = portal === 'playgama' || portal === 'yandex'; // no requests of the game's own there
if (!SDK[portal]) throw new Error('unknown portal ' + portal);

const out = path.join(repo, 'dist', 'aryq-' + portal);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'js'), { recursive: true });
fs.copyFileSync(path.join(game, 'style.css'), path.join(out, 'style.css'));
for (const f of fs.readdirSync(path.join(game, 'js'))) if (f.endsWith('.js')) fs.copyFileSync(path.join(game, 'js', f), path.join(out, 'js', f));

if (own) {
  fs.writeFileSync(
    path.join(out, 'js', 'pulse.js'),
    `// This build counts nothing of its own: the platform allows no requests besides its SDK
// (tools/build-portal.mjs puts this file in place of js/pulse.js).
export function minute() {
  return 'm0';
}
export function pulse() {}
`,
  );
}
if (portal === 'yandex') {
  // whole comment lines only: the code itself is left exactly as tested
  for (const file of fs.readdirSync(path.join(out, 'js'))) {
    const p = path.join(out, 'js', file);
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n'));
  }
}
if (portal === 'playgama') {
  const config = {
    advertisement: {
      minimumDelayBetweenInterstitial: 120,
      initialInterstitialDelay: 120,
      interstitial: { placementFallback: 'year_end', placements: [{ id: 'year_end' }, { id: 'game_over' }] },
      rewarded: { placementFallback: 'one_more_year', placements: [{ id: 'one_more_year' }] },
    },
  };
  fs.writeFileSync(path.join(out, 'playgama-bridge-config.json'), JSON.stringify(config, null, 4) + '\n');
}

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
// the stub above is not the file the stamp hashed: drop its version so no cache keeps the real one
if (own) html = html.replace(/(\.\/js\/pulse\.js)\?v=[0-9a-f]+/g, '$1?v=' + portal);
// Yandex: a long press opens no browser menu or picture callout, the page does not pull to refresh
// (style.css says most of it too; written here as well, where checkers of the page look first)
if (portal === 'yandex')
  html = html.replace(
    '<script src="/sdk.js"></script>',
    `<style>html, body { overflow: hidden; overscroll-behavior: none; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; } #game { touch-action: none; }</style>
<script>document.addEventListener('contextmenu', (e) => e.preventDefault());</script>
<script src="/sdk.js"></script>`,
  );
fs.writeFileSync(path.join(out, 'index.html'), html);

const zip = path.join(repo, 'dist', `aryq-${portal}.zip`);
fs.rmSync(zip, { force: true });
// tar writes the paths with forward slashes (24.10: PowerShell 5 Compress-Archive wrote "js\main.js",
// which a Linux server unpacks as a file of that name, and the game would not load there)
// (Windows' own bsdtar: the GNU tar of Git Bash takes "E:" for a host name)
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-a', '-c', '-f', zip, ...fs.readdirSync(out)], { cwd: out, stdio: 'inherit' });
const files = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile());
const size = files.reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0);
console.log(`${out}: ${files.length} files, ${(size / 1024).toFixed(0)} KB`);
console.log(`${zip}: ${(fs.statSync(zip).size / 1024).toFixed(0)} KB`);
