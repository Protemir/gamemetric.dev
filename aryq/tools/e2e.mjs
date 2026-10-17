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

// 0. every file carries the version of its current content (node aryq/tools/stamp.mjs was run)
{
  const crypto = await import('node:crypto');
  const html = fs.readFileSync(path.join(repo, 'aryq/index.html'), 'utf8');
  const stale = fs.readdirSync(path.join(repo, 'aryq/js')).filter((f) => f.endsWith('.js')).filter((f) => {
    const v = crypto.createHash('sha1').update(fs.readFileSync(path.join(repo, 'aryq/js', f))).digest('hex').slice(0, 8);
    return !html.includes('./js/' + f + '?v=' + v);
  });
  check('versions in index.html are fresh', stale.length === 0, stale.join(', ') || 'all');
}

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

  const kept = await B.js(`JSON.stringify(${A}.S.save(${A}.g))`);
  // 3b. the bug from 16.10: an orchard below the end of a canal, straight down is too high but a way
  //     around exists. One move of the finger from the canal end onto the orchard must dig that way.
  r = await B.js(`(() => {
    const { g, S } = ${A};
    const W = g.W;
    // find a water cell and an orchard spot where the straight line is blocked but a detour works
    for (let seed = 1; seed < 400; seed++) {
      const t = S.newGame(16, 26, seed, 'mountain');
      for (const w of t.river) {
        const wx = w % W, wy = (w / W) | 0;
        for (const [ox, oy] of [[wx + 2, wy + 3], [wx - 2, wy + 3], [wx + 1, wy + 4], [wx - 1, wy + 4]]) {
          if (ox < 1 || ox >= W - 1 || oy >= t.H - 1) continue;
          const oc = oy * W + ox;
          if (t.kind[oc] !== S.LAND) continue;
          // the old way: straight down first, then across, step by step
          let ok = true, a = w;
          const steps = [];
          for (let y = wy + 1; y <= oy - 1; y++) steps.push(y * W + wx);
          for (let x = wx; x !== ox; x += Math.sign(ox - wx)) steps.push((oy - 1) * W + x + Math.sign(ox - wx));
          S.startStroke(t, w);
          for (const c of steps) { const res = S.extend(t, c); if (!res.ok) { ok = false; break; } }
          S.endStroke(t); while (t.strokes.length) S.undo(t);
          if (ok) continue;
          const o = { x: ox, y: oy };
          const way = S.route(t, [w], (c) => Math.abs((c % W) - ox) + Math.abs(((c / W) | 0) - oy) === 1);
          if (way) return { seed, w, ox, oy, len: way.cells.length };
        }
      }
    }
    return null;
  })()`);
  check('found a valley like the one in the bug report', !!r, JSON.stringify(r));
  if (r) {
    const bug = r;
    await B.js(`(() => { const a = ${A}; const g = a.S.newGame(16, 26, ${bug.seed}, 'mountain'); const o = { type: 'garden', x: ${bug.ox}, y: ${bug.oy}, need: 0.3, thirst: 0.5, flood: 0, born: 0 }; const d = a.S.save(g); d.objects = [o]; const h = a.S.load(d); for (const k of Object.keys(a.g)) delete a.g[k]; Object.assign(a.g, h); a.view.layout(a.g); return true; })()`);
    const [[wx, wy], [ox, oy]] = await centers([bug.w, bug.oy * 16 + bug.ox]);
    await drag([[wx, wy], [ox, oy]]);
    await B.js(`${A}.step(0.3)`);
    const got = await B.js(`JSON.stringify({ got: ${A}.g.objects[0].got, strokes: ${A}.g.strokes.length, cells: ${A}.g.strokes[0] && ${A}.g.strokes[0].cells.length })`).then(JSON.parse);
    check('one move onto the orchard digs the way around', got.got > 0 && got.strokes === 1, JSON.stringify(got));
  }

  // 3c. asking for a place this start cannot reach: a "higher" tag and a dashed path from a better start
  r = await B.js(`(() => {
    const { g, S, view } = ${A};
    const W = g.W;
    const low = g.river[g.river.length - 2];
    // the highest dry cell on the upper side rows: certainly out of reach from the bottom of the river
    let high = -1;
    for (let i = 3 * W; i < 8 * W; i++) if (g.kind[i] === S.LAND && !g.objAt[i] && (high < 0 || g.h[i] > g.h[high])) high = i;
    return { low, high, lowXY: view.center(low), highXY: view.center(high) };
  })()`);
  await mouse('mousePressed', ...r.lowXY);
  await mouse('mouseMoved', r.lowXY[0] + 3, r.lowXY[1]);
  await mouse('mouseMoved', ...r.highXY);
  const why = await B.js(`JSON.stringify({ blocked: ${A}.state.blocked && ${A}.state.blocked.why, hint: document.getElementById('hint').textContent })`).then(JSON.parse);
  await mouse('mouseReleased', ...r.highXY);
  check('out of reach: the reason is shown', why.blocked === 'high' || why.blocked === 'up', JSON.stringify(why));
  // back to the game the next checks expect
  await B.js(`(() => { const a = ${A}; const h = a.S.load(${kept}); for (const k of Object.keys(a.g)) delete a.g[k]; Object.assign(a.g, h); a.view.layout(a.g); a.state.blocked = null; a.state.hintPath = null; return true; })()`);

  // 3d. the complaints of 17.10: the ketmen is empty. The finger gets a tag that says so, the counter
  //     blinks, the light cells do not promise what cannot be dug, and strength comes back by itself.
  {
    const kept2 = await B.js(`JSON.stringify(${A}.S.save(${A}.g))`);
    r = await B.js(`(() => { const { g, S } = ${A}; for (const w of g.river.slice(4)) for (const d of [1, -1, g.W]) { const b = w + d; if (g.kind[b] === 0 && !g.objAt[b] && S.probe(g, w, b).ok) { g.dig = 0; return { w, xy: ${A}.view.center(w), to: ${A}.view.center(b) }; } } return null; })()`);
    await mouse('mousePressed', ...r.xy);
    const litCount = await B.js(`${A}.state.reach ? [...${A}.state.reach].filter((v, i) => v > -Infinity && ${A}.g.kind[i] === 0).length : -1`);
    await mouse('mouseMoved', r.xy[0], r.xy[1] + 4);
    await mouse('mouseMoved', ...r.to);
    const st = await B.js(`JSON.stringify({ why: ${A}.state.blocked && ${A}.state.blocked.why, tag: ${A}.state.tags && ${A}.state.tags.tired, empty: document.getElementById('dig').parentElement.classList.contains('empty'), hint: document.getElementById('hint').textContent })`).then(JSON.parse);
    await mouse('mouseReleased', ...r.to);
    check('empty ketmen: no cells are lit', litCount === 0, String(litCount));
    check('empty ketmen: the reason is under the finger', st.why === 'tired' && !!st.tag && st.empty, JSON.stringify(st));
    r = await B.js(`(() => { const { g } = ${A}; g.objects.forEach((o) => (o.thirst = 0)); ${A}.step(8); return g.dig; })()`);
    check('the ketmen gets strength back by itself', r >= 4, String(r));
    await B.js(`(() => { const a = ${A}; const h = a.S.load(${kept2}); for (const k of Object.keys(a.g)) delete a.g[k]; Object.assign(a.g, h); a.view.layout(a.g); a.state.blocked = null; return true; })()`);
  }

  // 3e. straight down from the river, cell by cell, as far as the light cells go
  r = await B.js(`(() => {
    const { g, S } = ${A};
    const W = g.W;
    for (const w of g.river) {
      const col = [];
      let c = w + W;
      const reach = S.reach(g, w).best;
      while (c < g.W * g.H && g.kind[c] === 0 && !g.objAt[c] && reach[c] > -Infinity && col.length < 4) { col.push(c); c += W; }
      if (col.length >= 3) return { w, col, pts: [w, ...col].map((i) => ${A}.view.center(i)) };
    }
    return null;
  })()`);
  if (r) {
    await drag(r.pts);
    const dug = await B.js(`JSON.stringify(${A}.g.strokes.at(-1) && ${A}.g.strokes.at(-1).cells)`);
    check('straight down along the light cells digs straight down', dug === JSON.stringify(r.col), dug + ' vs ' + JSON.stringify(r.col));
    await B.js(`${A}.S.undo(${A}.g)`);
  } else check('straight down along the light cells digs straight down', false, 'no such column');

  // 3f. the drop of 17.10: a canal that ends next to the river lower down flows back into it, no puddle
  r = await B.js(`(() => {
    const { g, S } = ${A};
    const W = g.W;
    for (const w of g.river) {
      for (const d of [1, -1]) {
        const a = w + d, b = a + W;
        if (b >= W * g.H || g.kind[a] !== 0 || g.kind[b] !== 0 || g.objAt[a] || g.objAt[b]) continue;
        const touch = [b + 1, b - 1, b + W].some((n) => n !== a && g.kind[n] === 1);
        if (!touch) continue;
        S.startStroke(g, w);
        if (!S.extend(g, a).ok || !S.extend(g, b).ok) { S.endStroke(g); S.undo(g); continue; }
        S.endStroke(g);
        const st = g.strokes.at(-1);
        S.flowStep(g);
        const res = { join: st.join, spill: g.spill[b], flowIn: g.flow[b] };
        S.undo(g);
        if (st.join) return res;
      }
    }
    return { none: true };
  })()`);
  check('a canal ending by the river flows back into it', r.join && r.spill < 0.01, JSON.stringify(r));

  // 3g. the screenshot of 17.10: a canal ends right beside an orchard that also touches the cell before
  //     the end at a corner. The water must run to the very end, not stop one cell short.
  r = await B.js(`(() => {
    const { g, S } = ${A};
    const W = g.W;
    for (const w of g.river) {
      for (const d of [1, -1]) {
        const a = w + d, b = a + d;
        const ax = a % W, bx = b % W, y = (a / W) | 0;
        if (Math.abs(bx - (w % W)) !== 2 || y < 4) continue;
        const o = { type: 'garden', x: bx, y: y - 1, need: 0.3, thirst: 0, flood: 0, born: 0 };
        const oc = o.y * W + o.x;
        if ([a, b, oc].some((c) => g.kind[c] !== 0 || g.objAt[c])) continue;
        S.startStroke(g, w);
        if (!S.extend(g, a).ok || !S.extend(g, b).ok) { S.endStroke(g); if (g.strokes.length) S.undo(g); continue; }
        S.endStroke(g);
        const st = g.strokes.at(-1);
        if (st.join) { S.undo(g); continue; }
        const ob = { ...o, got: 0, s: 0 };
        g.objects.push(ob); g.objAt[oc] = ob;
        const d2 = S.save(g); const h = S.load(d2);
        S.flowStep(h);
        const res = { end: +h.flow[b].toFixed(3), got: +h.objects.at(-1).got.toFixed(3) };
        g.objects.pop(); g.objAt[oc] = null; S.undo(g);
        return res;
      }
    }
    return null;
  })()`);
  check('the water runs to the end of a canal by an orchard', r && r.end > 0.01 && r.got > 0.29, JSON.stringify(r));

  // 3h. a dead end that only touches an orchard at a corner (the orchard drinks elsewhere) is not dry
  r = await B.js(`(() => {
    const { g, S } = ${A};
    const W = g.W;
    for (const w of g.river) {
      for (const d of [1, -1]) {
        const a = w + d, y = (a / W) | 0, ax = a % W;
        if (Math.abs(ax - (w % W)) !== 1 || y < 4) continue;
        // orchard right beside the river (it drinks from the river), the stub touches it at a corner
        const ox = ax, oy = y - 1;
        const oc = oy * W + ox;
        if ([a, oc].some((c) => g.kind[c] !== 0 || g.objAt[c])) continue;
        if (g.kind[oy * W + (w % W)] !== 1) continue;
        S.startStroke(g, w);
        if (!S.extend(g, a).ok) { S.endStroke(g); continue; }
        S.endStroke(g);
        if (g.strokes.at(-1).join) { S.undo(g); continue; }
        const d2 = S.save(g);
        d2.objects = [...d2.objects, { type: 'garden', x: ox, y: oy, need: 0.3, thirst: 0, flood: 0, born: 0 }];
        S.undo(g);
        const h = S.load(d2);
        S.flowStep(h);
        return { stub: +h.flow[a].toFixed(3), got: +h.objects.at(-1).got.toFixed(3) };
      }
    }
    return null;
  })()`);
  check('a dead end by an orchard corner still gets its trickle', r && r.stub > 0.05 && r.got > 0.29, JSON.stringify(r));

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
    let spillOn = 0;
    for (let i = 0; i < g.W * g.H; i++) if (g.spill[i] > 0.02 && g.out[i].some((t) => !g.gate[t])) spillOn++;
    return { bad, diff: +diff.toFixed(5), strokes: g.strokes.length, dig: g.dig, spillOn };
  })()`);
  check('300 random swipes: water never runs uphill', r.bad === 0, JSON.stringify(r));
  check('300 random swipes: the water adds up', Math.abs(r.diff) < 1e-3, String(r.diff));
  check('digging budget never goes below zero', r.dig >= 0, String(r.dig));
  check('no puddles where water could run on', r.spillOn === 0, String(r.spillOn));

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

  // 11. a new version while the menu is open: one jump to a fresh address, then no more reloads
  //     even if the cache keeps giving the old code (the loop of 17.10)
  await B.init(`try { localStorage.clear(); sessionStorage.removeItem('x'); } catch {}
    window.__loads = (+sessionStorage.getItem('loads') || 0) + 1; sessionStorage.setItem('loads', window.__loads);
    const realFetch = window.fetch;
    window.fetch = (u, o) => (String(u).endsWith('/aryq/') ? Promise.resolve(new Response('<script src="js/main.js?v=deadbeef"></script>')) : realFetch(u, o));`);
  await B.open(page('&lang=ru'), 390, 844);
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  await B.js(`sessionStorage.setItem('loads', '1'); document.dispatchEvent(new Event('visibilitychange'))`);
  await sleep(3000);
  await B.js(`document.dispatchEvent(new Event('visibilitychange'))`).catch(() => {});
  await sleep(3000);
  r = await B.js(`JSON.stringify({ loads: +sessionStorage.getItem('loads'), url: location.search })`).then(JSON.parse);
  check('an update reloads once and does not loop', r.loads === 2 && r.url.includes('u=deadbeef'), JSON.stringify(r));
  await B.init('');

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
