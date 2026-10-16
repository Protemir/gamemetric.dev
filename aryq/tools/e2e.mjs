// «Арык» checked in headless Chrome with real mouse input:
//   node aryq/tools/e2e.mjs        (from the repo root)
// screens in both languages, digging along the hint, layouts, resize, the year gift, saving,
// losing and starting again, drawing speed, and a few hundred random swipes and taps.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(repo, 'dist', 'aryq-e2e');
fs.mkdirSync(out, { recursive: true });
const S = await serve(repo);
const B = await chrome();
const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const A = 'window.__aryq';
const page = (q = '') => `${S.url}/aryq/?debug&save${q}`;
const wait = (ms) => B.js(`new Promise((r) => setTimeout(r, ${ms}))`);
const mouse = (type, x, y) => B.cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
async function drag(points) {
  await mouse('mousePressed', ...points[0]);
  for (const p of points.slice(1)) await mouse('mouseMoved', ...p);
  await mouse('mouseReleased', ...points[points.length - 1]);
}
const centers = (cells) => B.js(`JSON.stringify(${JSON.stringify(cells)}.map((i) => ${A}.view.center(i)))`).then(JSON.parse);
const clickText = (text) => B.js(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);

try {
  // 1. start screens in both languages
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(page('&lang=ru'), 390, 844);
  let r = await B.js(`document.getElementById('ui').innerText`);
  check('start screen in Russian', r.includes('Арык') && r.includes('Играть') && r.includes('Долина дня'), r.slice(0, 40).replace(/\n/g, ' '));
  await B.open(page('&lang=en'), 390, 844);
  r = await B.js(`document.getElementById('ui').innerText`);
  check('start screen in English', r.includes('Aryk') && r.includes('Play') && !/[А-Яа-я]/.test(r), r.slice(0, 40).replace(/\n/g, ' '));
  await B.shot(path.join(out, 'start-en.png'));

  // 2. a new player: one orchard, a dashed path, digging it with the mouse waters the orchard
  await B.open(page('&lang=ru&seed=1004'), 390, 844);
  await clickText('Играть');
  await wait(200);
  r = await B.js(`JSON.stringify({ objects: ${A}.g.objects.length, ghost: ${A}.state.ghost && { from: ${A}.state.ghost.from, cells: ${A}.state.ghost.cells } })`).then(JSON.parse);
  check('first orchard and the dashed path', r.objects === 1 && r.ghost && r.ghost.cells.length >= 2, JSON.stringify(r.ghost));
  const pts = await centers([r.ghost.from, ...r.ghost.cells]);
  // a shaky hand: every point a third of a cell off the line
  const cs = await B.js(`${A}.view.cs`);
  await drag(pts.map(([x, y], k) => [x + (k % 2 ? 0.3 : -0.3) * cs, y + (k % 2 ? -0.3 : 0.3) * cs]));
  await B.js(`${A}.step(0.3)`);
  r = await B.js(`JSON.stringify({ got: ${A}.g.objects[0].got, s: ${A}.g.objects[0].s, strokes: ${A}.g.strokes.length })`).then(JSON.parse);
  check('a shaky drag along the path waters the orchard', r.s >= 0.99 && r.strokes === 1, JSON.stringify(r));

  // 3. uphill is refused with a message, and the reachable cells light up while digging
  r = await B.js(`(() => {
    const { g, S } = ${A};
    const W = g.W;
    for (const i of g.river) {
      for (const d of [1, -1]) {
        let a = i, n = 0;
        S.startStroke(g, a);
        let why = null;
        for (let k = 1; k < 10; k++) { const res = S.extend(g, i + d * k); if (!res.ok) { why = res.why; break; } n++; }
        S.endStroke(g);
        if (n) S.undo(g);
        if (why === 'high') return { why, after: n + 1 };
      }
    }
    return null;
  })()`);
  check('digging up a slope is refused', r && r.why === 'high', JSON.stringify(r));
  const riverCell = await B.js(`${A}.g.river[8]`);
  const [rx, ry] = (await centers([riverCell]))[0];
  await mouse('mousePressed', rx, ry);
  r = await B.js(`${A}.state.reach ? [...${A}.state.reach].filter((v) => v > -Infinity).length : 0`);
  await mouse('mouseReleased', rx, ry);
  check('reachable cells light up on press', r > 10, `${r} cells`);

  // 4. layouts: the board fits, the bar does not cover it, cells are big enough for a finger
  for (const [w, h] of [[390, 844], [320, 568], [1280, 720], [844, 390], [768, 1024]]) {
    await B.size(w, h);
    await wait(150);
    r = await B.js(`(() => { const v = ${A}.view; return { cs: v.cs, x0: v.ox, y0: v.oy, x1: v.ox + v.bw, y1: v.oy + v.bh, rot: v.rot }; })()`);
    const ok = r.x0 >= 0 && r.y0 >= 56 && r.x1 <= w && r.y1 <= h - 30 && r.cs >= 16;
    check(`layout ${w}x${h}`, ok, JSON.stringify(r));
    await B.shot(path.join(out, `layout-${w}x${h}.png`));
  }
  r = await B.js(`JSON.stringify({ strokes: ${A}.g.strokes.length, s: ${A}.g.objects[0].s })`).then(JSON.parse);
  check('resizing keeps the game', r.strokes === 1 && r.s >= 0.99, JSON.stringify(r));
  await B.size(390, 844);

  // 5. drawing speed with a busy valley
  r = await B.js(`(() => {
    const { g, S, view, state } = ${A};
    for (let t = 0; t < 60; t += 0.5) {
      for (const o of g.objects) { if (o.s >= 0.99) continue; const p = S.planFor(g, o); if (!p || !p.cells.length || p.cells.length > g.dig) continue; S.startStroke(g, p.from); for (const c of p.cells) if (!S.extend(g, c).ok) break; S.endStroke(g); }
      S.advance(g, 0.5);
    }
    const t0 = performance.now();
    for (let k = 0; k < 60; k++) view.draw(g, t0 + k * 16, state);
    const draw = (performance.now() - t0) / 60;
    const t1 = performance.now();
    view.layout(g);
    return { draw: +draw.toFixed(2), layout: Math.round(performance.now() - t1), canals: g.strokes.length, objects: g.objects.length };
  })()`);
  check('a frame draws fast', r.draw < 8, JSON.stringify(r));
  check('the relief paints in under a second', r.layout < 1000, `${r.layout} ms`);
  await B.shot(path.join(out, 'busy.png'));

  // 6. the end of a year: a gift is picked and the game goes on
  r = await B.js(`(() => { const { g } = ${A}; g.objects.forEach((o) => (o.thirst = 0)); g.day = 119.9; ${A}.step(0.2); return g.year; })()`);
  await wait(150);
  const yearPanel = await B.js(`document.getElementById('ui').innerText`);
  check('year gift panel', r === 2 && /Год 1/.test(yearPanel), yearPanel.split('\n')[0]);
  const cap0 = await B.js(`${A}.g.cap`);
  await clickText('Шире арыки');
  await wait(300);
  r = await B.js(`JSON.stringify({ cap: ${A}.g.cap, panel: document.getElementById('ui').innerText })`).then(JSON.parse);
  check('the gift works and play goes on', r.cap > cap0 && r.panel === '', JSON.stringify(r));

  // 7. saving: a reload offers to continue the same game
  const before = await B.js(`JSON.stringify({ day: Math.round(${A}.g.day), year: ${A}.g.year, strokes: ${A}.g.strokes.length })`);
  await B.js(`document.dispatchEvent(new Event('visibilitychange'))`);
  await B.init('');
  await B.open(page('&lang=ru'), 390, 844);
  const cont = await clickText('Продолжить');
  await wait(200);
  const after = await B.js(`JSON.stringify({ day: Math.round(${A}.g.day), year: ${A}.g.year, strokes: ${A}.g.strokes.length })`);
  check('continue after a reload', cont && before === after, `${before} -> ${after}`);
  await clickText('Продолжить'); // the pause panel

  // 8. losing and starting again
  r = await B.js(`(() => { const { g } = ${A}; for (let k = 0; k < 40 && !g.over; k++) { for (let i = 0; i < g.W * g.H; i++) g.gate[i] = g.kind[i] === 2 ? 1 : 0; ${A}.step(5); } return !!g.over; })()`);
  await wait(200);
  const overPanel = await B.js(`document.getElementById('ui').innerText`);
  check('an orchard dries up: the game is over', r && overPanel.includes('Сад засох'), overPanel.split('\n')[0]);
  const saveGone = await B.js(`localStorage.getItem('aryq.save')`);
  check('the finished game is not offered to continue', saveGone === null || saveGone === 'null', String(saveGone).slice(0, 20));
  await clickText('Ещё раз');
  await wait(200);
  r = await B.js(`JSON.stringify({ over: !!${A}.g.over, day: ${A}.g.day, objects: ${A}.g.objects.length })`).then(JSON.parse);
  check('try again starts a fresh game', !r.over && r.day < 1 && r.objects === 1, JSON.stringify(r));

  // 9. random swipes and taps: no errors, water never runs uphill, the water adds up
  r = await B.js(`(() => {
    const { g, S, view } = ${A};
    let rnd = 12345; const R = () => ((rnd = (rnd * 1103515245 + 12345) >>> 0) / 4294967296);
    const cv = document.getElementById('game');
    const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true }));
    let bad = 0;
    for (let k = 0; k < 300 && !g.over; k++) {
      const x = view.ox + R() * view.bw, y = view.oy + R() * view.bh;
      ev('pointerdown', x, y);
      const n = Math.floor(R() * 6);
      let px = x, py = y;
      for (let j = 0; j < n; j++) { px += (R() - 0.5) * view.cs * 3; py += (R() - 0.5) * view.cs * 3; ev('pointermove', px, py); }
      ev('pointerup', px, py);
      if (R() < 0.1) document.getElementById('undoBtn').click();
      ${A}.step(0.3);
      for (let a = 0; a < g.W * g.H; a++) for (const b of g.out[a]) if (!(g.bed[b] < g.bed[a])) bad++;
    }
    S.flowStep(g);
    let used = 0, spilt = 0;
    for (const o of g.objects) used += o.got;
    for (let i = 0; i < g.W * g.H; i++) spilt += g.spill[i];
    const diff = S.sourceFlow(g.day, g.year, g.melt) - used - spilt - g.gone;
    return { bad, diff: +diff.toFixed(5), strokes: g.strokes.length, dig: g.dig };
  })()`);
  check('300 random swipes: water never runs uphill', r.bad === 0, JSON.stringify(r));
  check('300 random swipes: the water adds up', Math.abs(r.diff) < 1e-3, String(r.diff));
  check('digging budget never goes below zero', r.dig >= 0, String(r.dig));

  // 10. the valley of the day is the same valley every time today
  await B.open(page('&lang=ru'), 390, 844);
  await clickText('Долина дня');
  await wait(150);
  const s1 = await B.js(`${A}.g.seed`);
  await B.open(page('&lang=ru'), 390, 844);
  await clickText('Долина дня');
  await wait(150);
  const s2 = await B.js(`${A}.g.seed`);
  check('valley of the day is stable', s1 === s2, `${s1} / ${s2}`);

  check('no errors in the page', B.errors.length === 0, B.errors.slice(0, 3).join(' | '));
} catch (e) {
  check('test ran to the end', false, e.message);
} finally {
  B.close();
  S.close();
}
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed; screenshots in dist/aryq-e2e`);
process.exit(failed ? 1 : 0);
