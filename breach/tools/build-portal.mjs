// Builds Mansion Breach for a game portal: a folder and a zip with only what the game needs,
// the portal's SDK started before the game, no links out, no playing with friends (the invite link
// would lead off the portal), dust instead of blood (game.js reads window.BREACH_PORTAL).
//
//   node breach/tools/build-portal.mjs playgama
//   node breach/tools/build-portal.mjs crazygames   (also writes files.json: the list for the dashboard upload)
//
// Output: dist/breach-<portal>/ and dist/breach-<portal>.zip in the repo root (dist/ is not in git).
// Run tools/stamp.mjs first so the module versions in index.html are current.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(game, '..');
const portal = process.argv[2] || 'playgama';
const SDK = {
  playgama: 'https://bridge.playgama.com/v2/stable/playgama-bridge.js',
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
};
if (!SDK[portal]) throw new Error('unknown portal ' + portal);
const NAME = 'Mansion Breach';

const out = path.join(repo, 'dist', 'breach-' + portal);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['style.css', 'favicon.svg']) fs.copyFileSync(path.join(game, f), path.join(out, f));
for (const d of ['js', 'vendor', 'assets']) fs.cpSync(path.join(game, d), path.join(out, d), { recursive: true });

if (portal === 'playgama') {
  const config = {
    advertisement: {
      minimumDelayBetweenInterstitial: 180,
      initialInterstitialDelay: 120,
      interstitial: { placementFallback: 'match_end', placements: [{ id: 'match_end' }] },
    },
  };
  fs.writeFileSync(path.join(out, 'playgama-bridge-config.json'), JSON.stringify(config, null, 4) + '\n');
}

let html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
const must = (from, to) => {
  if (!html.includes(from)) throw new Error('index.html changed, not found: ' + from.slice(0, 80));
  html = html.split(from).join(to);
};
// our own site's links, previews and search data
html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/, '');
html = html
  .split(/\r?\n/)
  .filter((l) => !/rel="canonical"|rel="alternate"|rel="apple-touch-icon"|property="og:|name="twitter:|name="description"/.test(l))
  .join('\n');
html = html.replace(/<title>[^<]*<\/title>/, `<title>${NAME}</title>`);
must('<a class="back" href="/" data-t="allGames"></a>', '<a class="back" hidden></a>');
html = html.replace(/<footer class="menu-foot">[\s\S]*?<\/footer>/, '<footer class="menu-foot" hidden></footer>');
// the SDK first; its language before the texts; then the game
const main = html.match(/<script type="module" src="(\.\/js\/main\.js\?v=[a-f0-9]+)"><\/script>/);
if (!main) throw new Error('main.js script tag not found');
html = html.replace(
  main[0],
  `<script src="${SDK[portal]}"></script>
<script type="module">
window.BREACH_PORTAL = '${portal}';
const wait = (ms) => new Promise((r) => setTimeout(() => r('slow'), ms));
const region = (l) => (/^(ru|kk|ky|be|uz|tg|uk)\\b/i.test(l) ? 'ru' : 'en');
try {
  if (window.BREACH_PORTAL === 'playgama') {
    const b = window.bridge;
    if (b && (await Promise.race([b.initialize().then(() => 'ok'), wait(6000)])) === 'ok') {
      window.BREACH_SDK = b;
      const l = String(b.platform.language || '');
      if (l) window.BREACH_LANG = region(l);
    }
  } else {
    const s = window.CrazyGames && window.CrazyGames.SDK;
    const ok = s && (await Promise.race([s.init().then(() => s.environment !== 'disabled'), wait(8000).then(() => false)]));
    if (ok) {
      window.BREACH_SDK = s;
      // CrazyGames times the load from here to the first gameplayStart
      s.game.loadingStart();
      const l = s.user && s.user.systemInfo && s.user.systemInfo.locale;
      if (l) window.BREACH_LANG = region(String(l));
    }
  }
} catch (e) {
  /* the game runs without the SDK */
}
await import('${main[1]}');
</script>`,
);
// in a portal's frame: no browser menu on a long press, no pull to refresh
must('</head>', `<style>html, body { overscroll-behavior: none; -webkit-touch-callout: none; }</style>\n<script>document.addEventListener('contextmenu', (e) => e.preventDefault());</script>\n</head>`);
const left = html.match(/https?:\/\/(?!bridge\.playgama\.com|sdk\.crazygames\.com|www\.w3\.org)[^\s"'<>]+/g);
if (left) throw new Error('links out left in index.html: ' + left.join(', '));
fs.writeFileSync(path.join(out, 'index.html'), html);
// the dashboard upload takes a folder: the list of files (all but index.html are the site's own, same version)
const list = [];
const walk = (d, rel) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const r2 = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) walk(path.join(d, e.name), r2);
    else list.push(r2);
  }
};
walk(out, '');
fs.writeFileSync(path.join(repo, 'dist', `breach-${portal}-files.json`), JSON.stringify(list) + '\n');

// nothing in the scripts may call home either (the room server is only used by the online mode, which is hidden)
const zip = path.join(repo, 'dist', `breach-${portal}.zip`);
fs.rmSync(zip, { force: true });
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-a', '-c', '-f', zip, ...fs.readdirSync(out)], { cwd: out, stdio: 'inherit' });
const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log(`${out}: ${count(out)} files`);
console.log(`${zip}: ${(fs.statSync(zip).size / 1048576).toFixed(1)} MB`);
