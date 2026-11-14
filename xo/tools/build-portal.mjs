// Builds the game for a portal: a folder and a zip with only what the game needs, the portal's SDK
// on the page and window.XO_PORTAL set, started through boot.js.
//
//   node xo/tools/build-portal.mjs crazygames
//   node xo/tools/build-portal.mjs playgama
//
// Output: dist/xo-<portal>/ and dist/xo-<portal>.zip in the repo root (dist/ is not in git).
// On a portal there are no links out (no "All games", no footer), no address of our own site in
// the page, the saves go to the portal's storage and the title is the English portal name.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(game, '..');
const portal = process.argv[2] || 'crazygames';
const SDK = {
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
  playgama: 'https://bridge.playgama.com/v2/stable/playgama-bridge.js',
};
if (!SDK[portal]) throw new Error('unknown portal ' + portal);
const NAME = 'Tic-Tac-Toe: Neon Duel';

const out = path.join(repo, 'dist', 'xo-' + portal);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['style.css', 'favicon.svg', 'app.js', 'logic.js', 'art.js', 'portal.js', 'boot.js']) fs.copyFileSync(path.join(game, f), path.join(out, f));

if (portal === 'playgama') {
  const config = {
    advertisement: {
      minimumDelayBetweenInterstitial: 150,
      initialInterstitialDelay: 150,
      interstitial: { placementFallback: 'next_round', placements: [{ id: 'next_round' }] },
    },
  };
  fs.writeFileSync(path.join(out, 'playgama-bridge-config.json'), JSON.stringify(config, null, 4) + '\n');
}

let html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
const must = (from, to) => {
  if (!html.includes(from)) throw new Error('index.html changed, not found: ' + from);
  html = html.replace(from, to);
};
// links and pictures of our own site
html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/, '');
html = html
  .split(/\r?\n/)
  .filter((l) => !/rel="canonical"|rel="alternate"|rel="apple-touch-icon"|property="og:|name="twitter:|name="description"/.test(l))
  .join('\n');
html = html.replace(/<title>[^<]*<\/title>/, `<title>${NAME}</title>`);
must('<a class="home" id="home" href="../">', '<a class="home" id="home" hidden>');
html = html.replace(/<footer class="foot" id="foot">[\s\S]*?<\/footer>/, '<footer class="foot" id="foot" hidden></footer>');
must('<script type="module" src="app.js"></script>', `<script src="${SDK[portal]}"></script>\n<script>window.XO_PORTAL = '${portal}';</script>\n<script type="module" src="boot.js"></script>`);
// in a portal's frame: no browser menu on a long press, no scrolling or pull to refresh
must('</head>', `<style>html, body { overscroll-behavior: none; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }</style>\n<script>document.addEventListener('contextmenu', (e) => e.preventDefault());</script>\n</head>`);
if (/https?:\/\/(?!sdk\.crazygames\.com|bridge\.playgama\.com|www\.w3\.org)/.test(html)) throw new Error('a link out is left in index.html');
fs.writeFileSync(path.join(out, 'index.html'), html);

const zip = path.join(repo, 'dist', `xo-${portal}.zip`);
fs.rmSync(zip, { force: true });
// Windows' own bsdtar writes forward slashes in the zip (GNU tar of Git Bash takes "E:" for a host)
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-a', '-c', '-f', zip, ...fs.readdirSync(out)], { cwd: out, stdio: 'inherit' });
const files = fs.readdirSync(out);
const size = files.reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0);
console.log(`${out}: ${files.length} files, ${(size / 1024).toFixed(0)} KB`);
console.log(`${zip}: ${(fs.statSync(zip).size / 1024).toFixed(0)} KB`);
