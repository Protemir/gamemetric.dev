// Сборка «Табуна» для портала: папка и zip только с тем, что нужно игре; SDK портала стартует до игры,
// без ссылок наружу, без «Поделиться», волк без укуса (window.TABUN_PORTAL читают main.js и world.js).
//
//   node tabun/tools/build-portal.mjs playgama
//   node tabun/tools/build-portal.mjs crazygames
//
// Результат: dist/tabun-<portal>/ и dist/tabun-<portal>.zip в корне репо (dist/ не в git).
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
const NAME = 'Tabun: Steppe Stampede';

const out = path.join(repo, 'dist', 'tabun-' + portal);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['style.css', 'favicon.svg']) fs.copyFileSync(path.join(game, f), path.join(out, f));
for (const d of ['js', 'vendor', 'models', 'fonts', 'sounds']) fs.cpSync(path.join(game, d), path.join(out, d), { recursive: true, filter: (p) => !/CREDITS|\.blend|\.py$/i.test(path.basename(p)) || p.endsWith('CREDITS.txt') });

if (portal === 'playgama') {
  const config = {
    advertisement: {
      minimumDelayBetweenInterstitial: 120,
      initialInterstitialDelay: 120,
      interstitial: { placementFallback: 'level_end', placements: [{ id: 'level_end' }] },
    },
  };
  fs.writeFileSync(path.join(out, 'playgama-bridge-config.json'), JSON.stringify(config, null, 4) + '\n');
}

let html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
const must = (from, to) => {
  if (!html.includes(from)) throw new Error('index.html изменился, не найдено: ' + from.slice(0, 80));
  html = html.split(from).join(to);
};
html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/, '');
html = html
  .split(/\r?\n/)
  .filter((l) => !/rel="canonical"|rel="alternate"|property="og:|name="twitter:|name="description"/.test(l))
  .join('\n');
html = html.replace(/<title>[^<]*<\/title>/, `<title>${NAME}</title>`);
must('<a id="allGames" href="/" class="pill"></a>', '<a id="allGames" class="pill hidden"></a>');
must(
  '<script type="module" src="js/main.js"></script>',
  `<script src="${SDK[portal]}"></script>
<script type="module">
window.TABUN_PORTAL = '${portal}';
const wait = (ms) => new Promise((r) => setTimeout(() => r('slow'), ms));
const region = (l) => (/^(ru|kk|ky|be|uz|tg|uk)\\b/i.test(l) ? 'ru' : 'en');
try {
  if (window.TABUN_PORTAL === 'playgama') {
    const b = window.bridge;
    const init = b && b.initialize();
    if (b && (await Promise.race([init.then(() => 'ok'), wait(6000)])) === 'ok') {
      window.TABUN_SDK = b;
      const l = String(b.platform.language || '');
      if (l) window.TABUN_LANG = region(l);
    } else if (init)
      init.then(() => { window.TABUN_SDK = b; dispatchEvent(new Event('tabun-sdk')); }, () => {});
  } else {
    const s = window.CrazyGames && window.CrazyGames.SDK;
    const init = s && s.init().then(() => s.environment !== 'disabled');
    const ok = s && (await Promise.race([init, wait(8000).then(() => 'slow')]));
    if (ok === 'slow')
      init.then((on) => { if (on) { window.TABUN_SDK = s; dispatchEvent(new Event('tabun-sdk')); } }, () => {});
    else if (ok) {
      window.TABUN_SDK = s;
      s.game.loadingStart();
      const l = s.user && s.user.systemInfo && s.user.systemInfo.locale;
      if (l) window.TABUN_LANG = region(String(l));
    }
  }
} catch (e) {
  /* игра идёт и без SDK */
}
await import('./js/main.js');
</script>`,
);
must('</head>', `<style>html, body { overscroll-behavior: none; -webkit-touch-callout: none; }</style>\n</head>`);
const left = html.match(/https?:\/\/(?!bridge\.playgama\.com|sdk\.crazygames\.com|www\.w3\.org)[^\s"'<>]+/g);
if (left) throw new Error('в index.html остались ссылки наружу: ' + left.join(', '));
fs.writeFileSync(path.join(out, 'index.html'), html);
// в скриптах — только ссылка «Поделиться» (в портале кнопка скрыта)
for (const f of fs.readdirSync(path.join(out, 'js'))) {
  const src = fs.readFileSync(path.join(out, 'js', f), 'utf8');
  const urls = (src.match(/https?:\/\/[^\s"'`<>)]+/g) || []).filter((u) => !/gamemetric\.dev\/tabun\/?$|w3\.org/.test(u));
  if (urls.length) throw new Error(`js/${f}: ссылки наружу ${urls.join(', ')}`);
}

const zip = path.join(repo, 'dist', `tabun-${portal}.zip`);
fs.rmSync(zip, { force: true });
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-a', '-c', '-f', zip, ...fs.readdirSync(out)], { cwd: out, stdio: 'inherit' });
const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log(`${out}: ${count(out)} files`);
console.log(`${zip}: ${(fs.statSync(zip).size / 1048576).toFixed(1)} MB`);
