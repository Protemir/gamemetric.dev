// The first minutes of a new player, timed: what the screen says and when, and how long the
// player waits with nothing to do. A "player" follows each dashed path a second after it shows.
//   node aryq/tools/ftue.mjs [seconds=120] [WxH=924x520] [lang=en]
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const secs = +(process.argv[2] || 120);
const [w, h] = (process.argv[3] || '924x520').split('x').map(Number);
const lang = process.argv[4] || 'en';
const valley = process.argv[5] || ''; // wide, mountain, gorge: start that valley instead of Play
const out = path.join(repo, 'dist', 'aryq-ftue');
fs.mkdirSync(out, { recursive: true });
const S = await serve(repo);
const B = await chrome();
const A = 'window.__aryq';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mouse = (type, x, y) => B.cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
try {
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(`${S.url}/aryq/?debug&lang=${lang}`, w, h);
  const t0 = Date.now();
  if (valley) await B.js(`[...document.querySelectorAll('#ui .choice')][${['wide', 'mountain', 'gorge'].indexOf(valley)}].click()`);
  else await B.js(`[...document.querySelectorAll('button')].find((x) => x.className === 'btn').click()`);
  let last = '', seenGhost = 0, idleFrom = Date.now(), idle = [], shots = 0;
  while (Date.now() - t0 < secs * 1000) {
    const s = await B.js(`JSON.stringify((() => { const { g, state, view } = ${A}; return {
      day: +g.day.toFixed(1), year: g.year, objs: g.objects.length, thirsty: g.objects.filter((o) => o.s < 0.6).length, dig: g.dig, over: !!g.over,
      hint: document.querySelector('.hint-line').textContent, panel: document.getElementById('ui').innerText.split(String.fromCharCode(10))[0],
      ghost: state.ghost && { pts: [state.ghost.from, ...state.ghost.cells].map((i) => view.center(i)) },
      labels: state.labels ? state.labels.list.map((l) => l.text).join(' | ') : '' }; })())`).then(JSON.parse);
    const t = ((Date.now() - t0) / 1000).toFixed(1);
    const line = `day ${s.day} y${s.year} objs ${s.objs} thirsty ${s.thirsty} dig ${s.dig}${s.ghost ? ' GHOST' : ''}${s.over ? ' OVER' : ''} | ${s.hint}${s.panel ? ' | PANEL ' + s.panel : ''}${s.labels ? ' | LABELS ' + s.labels : ''}`;
    if (line !== last) console.log(t.padStart(6), line);
    last = line;
    if (s.panel) {
      // a year gift: take the first one
      await B.js(`(() => { const b = document.querySelector('#ui .choice') || document.querySelector('#ui .btn'); if (b) b.click(); })()`);
    }
    if (s.ghost && !s.panel) {
      if (!seenGhost) seenGhost = Date.now();
      if (Date.now() - seenGhost > 1000) {
        if (Date.now() - idleFrom > 2500) idle.push([+((idleFrom - t0) / 1000).toFixed(1), +((Date.now() - idleFrom) / 1000).toFixed(1)]);
        if (shots < 3) await B.shot(path.join(out, `ghost-${shots++}.png`));
        const p = s.ghost.pts;
        await mouse('mousePressed', ...p[0]);
        for (const q of p.slice(1)) await mouse('mouseMoved', ...q);
        await mouse('mouseReleased', ...p[p.length - 1]);
        seenGhost = 0;
        idleFrom = Date.now();
      }
    } else if (!s.ghost) seenGhost = 0;
    if (s.over) break;
    await sleep(250);
  }
  console.log('waits over 2.5 s with nothing to do (start s, length s):', JSON.stringify(idle));
  console.log('errors', B.errors.slice(0, 3));
} finally { B.close(); S.close(); }
