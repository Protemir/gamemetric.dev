// A monkey on the real page: random taps, drags, two-finger pinches, the wheel, window sizes,
// every button and panel, for a while on each screen size. Stops on any page error or broken state.
//   node aryq/tools/uichaos.mjs [actions=600] [seed=1]
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const N = +(process.argv[2] || 600);
let r = (+(process.argv[3] || 1) * 2654435761) >>> 0;
const rnd = () => ((r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const out = path.join(repo, 'dist', 'aryq-uichaos');
fs.mkdirSync(out, { recursive: true });
const S = await serve(repo);
const B = await chrome();
const A = 'window.__aryq';
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const mouse = (type, x, y, extra = {}) => B.cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const touch = (type, pts) => B.cdp('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
const sizes = [[924, 520], [390, 844], [844, 390], [1280, 720], [360, 640], [768, 1024]];
let [w, h] = sizes[0];
const problems = [];
const state = () => B.js(`JSON.stringify((() => { const a = ${A}; if (!a) return { none: true }; const v = a.view, g = a.g;
  return { zoom: v.zoom, ox: v.ox, oy: v.oy, cs: v.cs, bw: v.bw, bh: v.bh, cur: !!g.cur, over: !!g.over, hud: !document.getElementById('hud').hidden,
    panel: document.getElementById('ui').innerText.split(String.fromCharCode(10))[0].slice(0, 30), loupe: !!a.state.loupe, day: g.day, year: g.year,
    nan: [v.ox, v.oy, v.cs, g.day, g.dig].some((x) => !Number.isFinite(x)) }; })())`).then(JSON.parse);
try {
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(`${S.url}/aryq/?debug&save&lang=${pick(['ru', 'en'])}`, w, h);
  const log = [];
  for (let k = 0; k < N; k++) {
    const a = rnd();
    let did;
    try {
      if (a < 0.08) {
        // any button on the screen
        did = await B.js(`(() => { const bs = [...document.querySelectorAll('button')].filter((b) => b.offsetParent); if (!bs.length) return 'no buttons'; const b = bs[Math.floor(${rnd()} * bs.length)]; b.click(); return 'button ' + (b.id || b.innerText.slice(0, 20).replace(/\s+/g, ' ')); })()`);
      } else if (a < 0.3) {
        const x = rnd() * w, y = rnd() * h;
        await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); did = `tap ${x | 0},${y | 0}`;
      } else if (a < 0.5) {
        const pts = [[rnd() * w, rnd() * h]];
        for (let s = 0; s < 6; s++) pts.push([pts[s][0] + (rnd() - 0.5) * 80, pts[s][1] + (rnd() - 0.5) * 80]);
        await mouse('mousePressed', ...pts[0]);
        for (const p of pts.slice(1)) await mouse('mouseMoved', ...p);
        await mouse('mouseReleased', ...pts[6]); did = 'drag';
      } else if (a < 0.62) {
        // a finger drag, sometimes with a second finger joining in the middle
        const p = [rnd() * w, rnd() * h];
        await touch('touchStart', [p]);
        await touch('touchMove', [[p[0] + 20, p[1] + 10]]);
        if (rnd() < 0.4) { await touch('touchMove', [[p[0] + 30, p[1] + 20], [p[0] + 120, p[1] + 90]]); await touch('touchMove', [[p[0] + 10, p[1] + 5], [p[0] + 170, p[1] + 140]]); did = 'finger + second finger'; }
        else did = 'finger drag';
        if (rnd() < 0.5) await touch('touchEnd', []); else { await touch('touchCancel', []); did += ' (cancel)'; }
      } else if (a < 0.7) {
        const x = rnd() * w, y = rnd() * h;
        await B.cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: (rnd() - 0.5) * 1500 }); did = 'wheel';
      } else if (a < 0.74) {
        [w, h] = pick(sizes); await B.size(w, h); did = `size ${w}x${h}`;
      } else if (a < 0.8) {
        await B.js(`${A} && ${A}.step(${(rnd() * 30).toFixed(1)})`); did = 'time jump';
      } else if (a < 0.82) {
        await B.js(`document.dispatchEvent(new Event('visibilitychange'))`); did = 'tab hidden/shown';
      } else {
        await sleep(100); did = 'wait';
      }
    } catch (e) { did = 'action failed: ' + e.message; }
    // keep the orchards alive, so most of the time goes into the game and not the game-over screen
    await B.js(`${A} && ${A}.g.objects.forEach((o) => (o.thirst *= 0.5))`).catch(() => {});
    await sleep(30);
    const s = await state().catch((e) => ({ err: e.message }));
    log.push(`${k} ${did}`);
    const bad = [];
    if (B.errors.length) bad.push('page error: ' + B.errors.splice(0).join(' | '));
    if (s.err) bad.push('state failed: ' + s.err);
    if (!s.none && !s.err) {
      if (s.nan) bad.push('NaN in view or game');
      if (s.zoom < 1 - 1e-6 || s.zoom > 2.5 + 1e-6) bad.push('zoom ' + s.zoom);
      if (s.zoom === 1 && (s.ox < -1 || s.ox + s.bw > w + 1)) bad.push(`board off screen at zoom 1: ox ${s.ox} bw ${s.bw} w ${w}`);
      if (s.zoom > 1 && s.bw > w - 20 && (s.ox > 11 || s.ox + s.bw < w - 11)) bad.push(`zoomed board leaves a gap: ox ${s.ox} bw ${s.bw}`);
      if (s.loupe && s.cur === false) bad.push('loupe left on with no stroke');
    }
    if (bad.length) {
      problems.push({ k, did, bad, s, last: log.slice(-6) });
      await B.shot(path.join(out, `problem-${problems.length}.png`));
      if (problems.length >= 8) break;
    }
  }
  const s = await state();
  console.log(`${N} actions, ${problems.length} problems; last state ${JSON.stringify(s)}`);
  for (const p of problems) console.log(JSON.stringify(p));
} finally { B.close(); S.close(); }
