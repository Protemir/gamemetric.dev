// Builds Сыбыс for a portal: a folder and a zip with only what the game needs, the portal SDK on the
// page and window.SYBYS_PORTAL set (js/portal.js reads it), started through js/boot.js.
//
//   node sybys/tools/build-portal.mjs [crazygames]
//   node sybys/tools/build-portal.mjs --target playgama
//
// Output: dist/sybys-<portal>/ and dist/sybys-<portal>.zip in the repo root (dist/ is not in git).
// On a portal saves go to the portal's storage (CrazyGames Data module, Playgama Bridge storage),
// there is no update check and the page title is the full English name. On Playgama
// playgama-bridge-config.json sets the full-screen ads apart. Run node sybys/tools/stamp.mjs first so
// the versions in index.html are fresh.
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

const out = path.join(repo, 'dist', 'sybys-' + portal);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'js'), { recursive: true });
fs.copyFileSync(path.join(game, 'style.css'), path.join(out, 'style.css'));
for (const f of fs.readdirSync(path.join(game, 'js'))) if (f.endsWith('.js')) fs.copyFileSync(path.join(game, 'js', f), path.join(out, 'js', f));
// three.js, the models and the grass go along; credits stay with the models
for (const dir of ['vendor', 'models', 'textures']) fs.cpSync(path.join(game, dir), path.join(out, dir), { recursive: true });
if (portal === 'playgama') {
  // three.js comments point to the glTF spec on GitHub: those comment lines go, so no address of
  // another site is left in the scripts (the code itself stays exactly as tested)
  for (const f of fs.readdirSync(out, { recursive: true })) {
    if (!f.endsWith('.js')) continue;
    const p = path.join(out, f);
    const src = fs.readFileSync(p, 'utf8');
    const kept = src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*).*https?:\/\//.test(l));
    fs.writeFileSync(p, kept.join('\n'));
  }
  const config = {
    advertisement: {
      minimumDelayBetweenInterstitial: 120,
      initialInterstitialDelay: 120,
      interstitial: { placementFallback: 'scene', placements: [{ id: 'scene' }, { id: 'new_game' }] },
    },
  };
  fs.writeFileSync(path.join(out, 'playgama-bridge-config.json'), JSON.stringify(config, null, 4) + '\n');
}

let html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
const main = html.match(/<script type="module" src="\.\/js\/main\.js\?v=[0-9a-f]+"><\/script>/);
const boot = html.match(/"\.\/js\/boot\.js":"(\.\/js\/boot\.js\?v=[0-9a-f]+)"/);
if (!main || !boot) throw new Error('index.html changed or not stamped: run node sybys/tools/stamp.mjs');
html = html
  .split(/\r?\n/)
  .filter((l) => !/name="theme-color"|name="robots"|rel="canonical"|property="og:/.test(l))
  .join('\n')
  .replace(/<title>[^<]*<\/title>/, '<title>Whispers of the Steppe</title>')
  .replace(main[0], `<script src="${SDK[portal]}"></script>\n<script>window.SYBYS_PORTAL = '${portal}';</script>\n<script type="module" src="${boot[1]}"></script>`);
// Playgama: a long press opens no browser menu, the page does not scroll or pull to refresh
if (portal === 'playgama')
  html = html.replace(
    '</head>',
    `<style>html, body { overflow: hidden; overscroll-behavior: none; -webkit-touch-callout: none; }</style>\n<script>document.addEventListener('contextmenu', (e) => e.preventDefault());</script>\n</head>`,
  );
fs.writeFileSync(path.join(out, 'index.html'), html);

const zip = path.join(repo, 'dist', `sybys-${portal}.zip`);
fs.rmSync(zip, { force: true });
// tar writes the paths with forward slashes (PowerShell 5 Compress-Archive writes "js\main.js", which
// a Linux server unpacks as a file of that name); Windows' own bsdtar, since the GNU tar of Git Bash
// takes "E:" for a host name
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-a', '-c', '-f', zip, ...fs.readdirSync(out)], { cwd: out, stdio: 'inherit' });
const files = fs.readdirSync(out, { recursive: true }).filter((f) => fs.statSync(path.join(out, f)).isFile());
const size = files.reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0);
console.log(`${out}: ${files.length} files, ${(size / 1024).toFixed(0)} KB`);
console.log(`${zip}: ${(fs.statSync(zip).size / 1024).toFixed(0)} KB`);
