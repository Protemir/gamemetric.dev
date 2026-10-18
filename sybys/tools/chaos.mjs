// A restless player in headless Chrome: whole campaigns with random taps, drags, zooms, buttons and choices,
// on a wide screen and on phones held both ways. It looks for what a person would hit and not report:
//   node sybys/tools/chaos.mjs [campaigns per screen = 2]
// Checks after every burst: no errors in the console, no NaN in the game, the game moves on (no stuck phase),
// no scene left hanging on top of play, the bars on screen. Screenshots of odd moments go to dist/sybys-chaos/.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(repo, 'dist', 'sybys-chaos');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const RUNS = +(process.argv[2] || 2);
const S = await serve(repo);
const B = await chrome();
const problems = [];
const note = (what, shot) => {
  problems.push(what);
  console.log('PROBLEM', what);
  if (shot) return B.shot(path.join(out, `p${problems.length}.png`));
};
const wait = (ms) => B.js(`new Promise((r) => setTimeout(r, ${ms}))`);
const mouse = (type, x, y, extra = {}) => B.cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, ...extra });
const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); };
const A = 'window.__sybys';
let seed = 1;

// what the page looks like right now, and anything wrong with it
const probe = () => B.js(`(() => {
  const s = window.__sybys, g = s && s.g;
  const ui = document.getElementById('ui');
  const vis = (el) => el && !el.hidden && getComputedStyle(el).display !== 'none';
  const bad = [];
  if (g) {
    for (let i = 0; i < g.R; i++) if (!Number.isFinite(g.t[i]) || !Number.isFinite(g.m[i]) || !Number.isFinite(g.n[i])) { bad.push('NaN at pasture ' + i); break; }
    if (!Number.isFinite(g.horses) || g.horses < 0) bad.push('horses ' + g.horses);
    if (g.riders.length > 60) bad.push('riders ' + g.riders.length);
    if (g.phase === 'map' && ui.children.length && !ui.querySelector('.pause') && !ui.querySelector('.journal')) bad.push('a screen stays over the map: ' + ui.innerText.slice(0, 40));
    if (g.phase === 'map' && !vis(document.getElementById('hud'))) bad.push('no top bar during play');
    if (g.phase !== 'map' && g.phase !== 'end' && !ui.children.length) bad.push('phase ' + g.phase + ' without its screen');
    for (const b of document.querySelectorAll('.hud > *, .act')) {
      if (!vis(b)) continue;
      const r = b.getBoundingClientRect();
      if (r.width && (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1 || r.top < -1)) { bad.push('off screen: ' + (b.className || b.id)); break; }
    }
  }
  return JSON.stringify({ phase: g ? g.phase : 'none', season: g ? g.season : 0, clock: g ? +g.clock.toFixed(1) : 0, demo: !!(g && g.demo), lesson: s && s.coach.step, until: s && Math.round(s.coach.stepUntil - performance.now()), started: s && Math.round(performance.now() - s.coach.stepStarted), paused: document.getElementById('pauseBtn').textContent, hold: !!(g && g.hold), hand: s && s.look.hand, horses: g && g.horses, bad, buttons: [...document.querySelectorAll('#ui button:not([disabled])')].map((b) => b.innerText.split('\\n')[0]) });
})()`).then(JSON.parse);

async function burst(w, h) {
  // in the lesson a person taps where the hand points
  const hand = await B.js(`(() => { const s = window.__sybys; if (!s.coach.step || s.look.hand < 0) return null; const r = s.g.map.regions[s.look.hand]; return s.view.toScreen(r.x, r.y); })()`);
  if (hand && Math.random() < 0.6) await click(hand[0], hand[1]);
  // a handful of random things a player does
  for (let k = 0; k < 6; k++) {
    const r = Math.random();
    const x = 20 + Math.random() * (w - 40), y = 80 + Math.random() * (h - 180);
    if (r < 0.45) await click(x, y);
    else if (r < 0.6) {
      const keys = await B.js(`[...document.querySelectorAll('.act')].filter((b) => !b.hidden).map((b) => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })`);
      if (keys.length) { const [bx, by] = keys[Math.floor(Math.random() * keys.length)]; await click(bx, by); }
    } else if (r < 0.7) {
      await mouse('mousePressed', x, y);
      for (let j = 1; j <= 5; j++) await mouse('mouseMoved', x + j * 20, y - j * 9, { buttons: 1 });
      await mouse('mouseReleased', x + 100, y - 45);
    } else if (r < 0.78) await B.cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: Math.random() < 0.5 ? -400 : 400 });
    else if (r < 0.83) await B.js(`document.getElementById(['fitBtn', 'speedBtn', 'journalBtn', 'pauseBtn'][Math.floor(Math.random() * 4)]).click()`);
    else {
      // catch a rider if one is on the road
      const rd = await B.js(`(() => { const s = window.__sybys; const r = s.g.riders[Math.floor(Math.random() * s.g.riders.length)]; if (!r) return null; const p = s.S.riderPos(s.g, r); return s.view.toScreen(p.x, p.y); })()`);
      if (rd) await click(rd[0], rd[1] - 4);
    }
  }
}

async function campaign(w, h, label) {
  await B.init(`try { localStorage.clear(); ${Math.random() < 0.5 ? "localStorage.setItem('sybys.tutDone', 'true');" : ''} } catch {}`);
  await B.open(`${S.url}/sybys/?debug&lang=${Math.random() < 0.5 ? 'en' : 'ru'}&seed=${seed++}`, w, h);
  await wait(600);
  let last = '', same = 0, steps = 0;
  while (steps++ < 400) {
    const st = await probe();
    if (st.bad.length) await note(`${label}: ${st.bad.join('; ')} (phase ${st.phase}, season ${st.season})`, true);
    const key = st.phase + st.season + Math.floor(st.clock / 5);
    same = key === last ? same + 1 : 0;
    last = key;
    if (same > 60) { await note(`${label}: stuck in ${st.phase} at ${st.clock}s, lesson ${st.lesson} (until ${st.until}, started ${st.started}, pause ${st.paused}), hold ${st.hold}, hand ${st.hand}, horses ${st.horses}, buttons: ${st.buttons.join(' | ')}`, true); break; }
    if (st.phase === 'none' || st.demo || st.phase === 'event' || st.phase === 'council' || st.phase === 'kurultai' || st.phase === 'end') {
      if (st.phase === 'end') return true;
      // pick one of the buttons on the screen (wait for the whips first)
      await wait(st.phase === 'kurultai' || st.phase === 'council' ? 400 : 60);
      const b = await B.js(`(() => { const bs = [...document.querySelectorAll('#ui button:not([disabled])')]; if (!bs.length) return null; const b = bs[Math.floor(Math.random() * bs.length)]; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, b.innerText.split('\\n')[0]]; })()`);
      if (b) await click(b[0], b[1]);
      await wait(80);
      continue;
    }
    // play: a burst of input, then let time run fast (the clock jumps 6–15 s)
    if (await B.js(`!!document.querySelector('#ui .pause, #ui .journal')`)) {
      await B.js(`[...document.querySelectorAll('#ui button')].pop().click()`);
      continue;
    }
    await burst(w, h);
    await B.js(`(() => { const s = window.__sybys; const n = 60 + Math.floor(Math.random() * 90); for (let k = 0; k < n && s.g.phase === 'map'; k++) s.step(0.1); })()`);
    await wait(60);
    if (steps % 25 === 0) await B.shot(path.join(out, `${label}-${steps}.jpg`), 'jpeg');
  }
  await note(`${label}: the campaign did not end in ${steps} steps`, true);
  return false;
}

try {
  for (const [w, h, name] of [[1280, 720, 'pc'], [390, 844, 'phone'], [844, 390, 'phone-land']]) {
    for (let k = 0; k < RUNS; k++) {
      const label = `${name}-${k + 1}`;
      const ok = await campaign(w, h, label);
      const errs = B.errors.splice(0);
      if (errs.length) await note(`${label}: console: ${[...new Set(errs)].slice(0, 3).join(' | ')}`);
      console.log(ok ? 'done' : 'FAILED', label);
    }
  }
} catch (e) {
  problems.push('crashed: ' + e.message);
  console.log('crashed', e);
} finally {
  B.close();
  S.close();
}
console.log(`\n${problems.length ? problems.length + ' problems' : 'no problems'}; screenshots in dist/sybys-chaos`);
process.exit(problems.length ? 1 : 0);
