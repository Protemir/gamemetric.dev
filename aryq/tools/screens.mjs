// The same set of screens every time, for comparing before and after a change:
//   node aryq/tools/screens.mjs <out-dir>
// start menu, help, first game with the hint, a dug canal, year gift, pause, game over, winter,
// zoomed in, on a phone, a laptop frame (CrazyGames) and a phone on its side, both languages.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] || path.join(repo, 'dist', 'aryq-screens'));
fs.mkdirSync(out, { recursive: true });
const S = await serve(repo);
const B = await chrome();
const A = 'window.__aryq';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (sel, text) => B.js(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => !${JSON.stringify(text || '')} || x.innerText.includes(${JSON.stringify(text || '')})); if (b) b.click(); return !!b; })()`);
try {
  for (const [w, h, tag] of [[390, 844, 'phone'], [924, 520, 'laptop'], [844, 390, 'side']]) {
    for (const lang of ['ru', 'en']) {
      const name = (s) => path.join(out, `${tag}-${lang}-${s}.png`);
      await B.init('try { localStorage.clear(); } catch {}');
      await B.open(`${S.url}/aryq/?debug&lang=${lang}&seed=1004`, w, h);
      await sleep(300);
      await B.shot(name('01-menu'));
      await click('#ui button', lang === 'ru' ? 'Как играть' : 'How to play');
      await sleep(150);
      await B.shot(name('02-help'));
      await click('#ui .panel.help button:last-of-type');
      await click('#ui .btn');
      await sleep(2600); // the sharp ground arrives
      await B.shot(name('03-first-game'));
      await B.js(`(() => { const { g, S, state } = ${A}; const gh = state.ghost; S.startStroke(g, gh.from); for (const c of gh.cells) S.extend(g, c); S.endStroke(g); })()`);
      await B.js(`${A}.step(6)`);
      await sleep(600);
      await B.shot(name('04-dug'));
      await B.js(`${A}.g.day = 119.97`);
      await sleep(700);
      await B.shot(name('05-year-gift'));
      await click('#ui .choice');
      await sleep(150);
      await click('#ui .btn');
      await sleep(150);
      await click('#pauseBtn');
      await sleep(150);
      await B.shot(name('06-pause'));
      await click('#pauseBtn');
      await B.js(`${A}.g.day = 112; ${A}.view.zoomAt(2.2, ${w / 2}, ${h / 2})`);
      await sleep(400);
      await B.shot(name('07-winter-zoom'));
      await B.js(`${A}.view.zoomAt(1, 0, 0); ${A}.g.day = 50; ${A}.g.objects.forEach((o) => (o.thirst = 1.5)); ${A}.g.shield = 0; ${A}.step(0.2)`);
      await sleep(700);
      await B.shot(name('08-over'));
    }
  }
  console.log('screens in', out, 'errors', B.errors.length ? B.errors.slice(0, 3) : 'none');
} finally { B.close(); S.close(); }
