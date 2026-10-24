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

// 0b. a valley dug full keeps giving something to do: orchards squeeze in, then old ones grow
{
  const Sim = await import('../js/sim.js');
  const g = Sim.newGame(18, 28, 3003, 'mountain');
  g.melt = 3;
  g.cap = 4;
  let t = 0, grows = 0, quiet = 0, last = 0;
  while (!g.over && t < 2.5 * Sim.YEAR_DAYS) {
    for (const o of g.objects) {
      if (o.s >= 0.99) continue;
      const p = Sim.planFor(g, o);
      if (!p || !p.cells.length) continue;
      g.dig = Math.max(g.dig, p.cells.length);
      Sim.startStroke(g, p.from);
      for (const c of p.cells) if (!Sim.extend(g, c).ok) break;
      Sim.endStroke(g);
    }
    for (const ev of g.events.splice(0)) if (ev.type === 'grow' || ev.type === 'spawn') { if (ev.type === 'grow') grows++; last = t; }
    if (g.day < Sim.WINTER) quiet = Math.max(quiet, t - last);
    Sim.advance(g, 0.5);
    t += 0.5;
  }
  check('a full valley: orchards keep coming or growing', grows > 0 && quiet <= 12, `${grows} grew, longest quiet ${quiet} days`);
}

// 0c. the valleys differ (18.10: "they all look the same"), and a game saved before keeps its ground
{
  const Sim = await import('../js/sim.js');
  const old = Sim.newGame(18, 28, 77, 'wide', 1);
  Sim.advance(old, 0.01);
  const d = Sim.save(old);
  delete d.gen; // saves from before 18.10 have no gen
  const back = Sim.load(d);
  const same = old.h.every((v, i) => v === back.h[i]);
  const w = Sim.newGame(18, 28, 77, 'wide'), m = Sim.newGame(18, 28, 77, 'mountain'), gz = Sim.newGame(18, 28, 77, 'gorge');
  check('an old saved game keeps its valley', same && back.gen === 1);
  check('the wide valley has more water than the gorge', w.melt > m.melt && m.melt > gz.melt, `${w.melt} / ${m.melt} / ${gz.melt}`);
}

// 0d. short water is shared: at 70% of what all ask for, no watered orchard is left with nothing
// (until 21.10 the upper ones drank first and a lower one beside a canal dried: most year-2 losses)
{
  const Sim = await import('../js/sim.js');
  let worst = 0, cases = 0;
  for (let seed = 500; seed < 520; seed++) {
    const g = Sim.newGame(16, 26, seed, 'wide');
    g.dig = 1e9;
    for (let t = 0; t < 70; t += 0.5) {
      for (const o of g.objects) {
        if (o.s >= 0.99) continue;
        const p = Sim.planFor(g, o);
        if (p && p.cells.length) { Sim.startStroke(g, p.from); for (const c of p.cells) if (!Sim.extend(g, c).ok) break; Sim.endStroke(g); }
        o.thirst = 0;
      }
      Sim.advance(g, 0.5);
    }
    const share = Sim.waterShare(g);
    if (share == null) continue;
    g.melt *= 0.7 / share;
    for (let k = 0; k < 8; k++) Sim.flowStep(g);
    const fed = g.objects.filter((o) => o.tap != null);
    if (fed.length < 4) continue;
    cases++;
    worst = Math.max(worst, fed.filter((o) => o.got / o.need < 0.2).length / fed.length);
  }
  check('short water is shared, nobody watered gets nothing', cases >= 10 && worst === 0, `${cases} valleys, worst ${Math.round(worst * 100)}% starved`);
}

// 0e. finds while digging (21.10): the first comes on the fifth new cell, none from digging the same
// ground again, none when a saved game is loaded, and a loaded game finds the same as it would have
{
  const Sim = await import('../js/sim.js');
  const g = Sim.newGame(16, 26, 3, 'wide');
  g.dig = 1e9;
  Sim.advance(g, 0.01);
  g.events.length = 0;
  const w = g.river.find((c) => { const x = c % g.W; return x > 4 && x < g.W - 5; });
  const dir = (w % g.W) < g.W / 2 ? 1 : -1;
  // a straight run of new ground away from the river (sideways keeps the bed falling slowly)
  Sim.startStroke(g, w);
  let c = w, dug = 0;
  for (let k = 0; k < 4; k++) { const r = Sim.extend(g, c + dir); if (!r.ok) break; c += dir; dug++; }
  Sim.endStroke(g);
  const at4 = g.events.filter((e) => e.type === 'find').length;
  Sim.undo(g);
  for (let k = 0; k < 20; k++) { Sim.startStroke(g, w); Sim.extend(g, w + dir); Sim.endStroke(g); Sim.undo(g); }
  const again = g.events.filter((e) => e.type === 'find').length;
  check('finds: none in the first four cells, none from digging the same ground again', dug >= 3 && dug <= 4 && at4 === 0 && again === 0, `dug ${dug}, finds ${at4}/${again}`);
  const h = Sim.newGame(16, 26, 3, 'wide');
  h.dig = 1e9;
  Sim.advance(h, 0.01);
  h.events.length = 0;
  let found = null, n = 0;
  for (const r of h.river) {
    for (const d of [1, -1]) {
      if (found) break;
      if (!Sim.startStroke(h, r)) continue;
      let x = r;
      for (let k = 0; k < 6; k++) { if (!Sim.extend(h, x + d).ok) break; x += d; }
      Sim.endStroke(h);
      n = h.dugCount;
      found = h.events.find((e) => e.type === 'find');
    }
    if (found) break;
  }
  const saved = JSON.parse(JSON.stringify(Sim.save(h)));
  const back = Sim.load(saved);
  check('finds: the first one comes on the fifth new cell, loading finds nothing new', found && back.finds === h.finds && back.events.every((e) => e.type !== 'find') && back.dugCount === h.dugCount, `${found && found.kind} after ${n} cells, finds ${h.finds}/${back.finds}`);
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

  // 1b. the how-to-play panel from the menu explains every thing on the field
  await B.open(page('&lang=ru'), 390, 844);
  await clickText('Как играть');
  r = await B.js(`({ rows: document.querySelectorAll('.legend-row').length, text: document.getElementById('ui').innerText })`);
  check('how to play lists the things on the field', r.rows >= 10 && r.text.includes('Ледник') && r.text.includes('Шлюз'), r.rows + ' rows');
  await clickText('Понятно');

  // 2. a new player: one orchard, a dashed path, digging it with the mouse waters the orchard
  await B.open(page('&lang=ru&seed=1004'), 390, 844);
  await clickText('Играть');
  await wait(200);
  r = await B.js(`JSON.stringify({ objects: ${A}.g.objects.length, ghost: ${A}.state.ghost && { from: ${A}.state.ghost.from, cells: ${A}.state.ghost.cells } })`).then(JSON.parse);
  check('first orchard and the dashed path', r.objects === 1 && r.ghost && r.ghost.cells.length >= 2, JSON.stringify(r.ghost));
  const labels = await B.js(`${A}.state.labels ? ${A}.state.labels.list.map((l) => l.text).join(' | ') : ''`);
  check('the first game names the glacier, the river and the orchard', labels.includes('Ледник') && labels.includes('Река') && labels.includes('Сад'), labels);
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

  // 3i. "how do I get water there?": a tap on a dry orchard shows the way, and dragging along it waters it
  {
    const kept3 = await B.js(`JSON.stringify(${A}.S.save(${A}.g))`);
    r = await B.js(`(() => {
      const { g, S } = ${A};
      // a fresh dry orchard a few cells from any water
      for (let i = 4 * g.W; i < g.W * (g.H - 1); i++) {
        if (g.kind[i] !== 0 || g.objAt[i]) continue;
        const x = i % g.W, y = (i / g.W) | 0;
        let wet = false;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= g.W || yy >= g.H) continue; const j = yy * g.W + xx; if ((Math.max(Math.abs(dx), Math.abs(dy)) <= 1 && S.isWater(g, j)) || g.objAt[j]) wet = true; }
        if (wet) continue;
        const p = S.planFor(g, { x, y });
        if (!p || p.cells.length < 2 || p.cells.length > 6) continue;
        const d = S.save(g); d.objects = [...d.objects, { type: 'garden', x, y, need: 0.3, thirst: 0.5, flood: 0, born: 0 }];
        const h = S.load(d); for (const k of Object.keys(g)) delete g[k]; Object.assign(g, h); ${A}.view.layout(g);
        g.dig = 30;
        return { x, y, xy: ${A}.view.center(i) };
      }
      return null;
    })()`);
    if (r) {
      // at the edge of the orchard, where a finger often lands (it is a different cell there)
      const csz = await B.js(`${A}.view.cs`);
      const side = await B.js(`${A}.view.ox + ${A}.view.bw / 2 > ${r.xy[0]} ? 1 : -1`);
      const edge = [r.xy[0] + side * csz * 0.55, r.xy[1] - csz * 0.2];
      await mouse('mousePressed', ...edge);
      await mouse('mouseReleased', ...edge);
      const hp = await B.js(`JSON.stringify(${A}.state.hintPath && { from: ${A}.state.hintPath.from, cells: ${A}.state.hintPath.cells })`).then(JSON.parse);
      const dbg = hp ? '' : await B.js(`JSON.stringify({ edge: ${JSON.stringify(edge)}, cell: ${A}.view.cellAt(${edge[0]}, ${edge[1]}), r: ${JSON.stringify(r)}, paused: document.getElementById('pauseBtn').textContent, over: !!${A}.g.over, ui: document.getElementById('ui').innerText.slice(0, 40), hint: document.getElementById('hint').textContent })`);
      check('a tap on a dry orchard shows the way', hp && hp.cells.length >= 2, JSON.stringify(hp) + ' ' + dbg);
      if (hp) {
        await drag(await centers([hp.from, ...hp.cells]));
        await B.js(`${A}.step(0.3)`);
        const got = await B.js(`${A}.g.objects.find((o) => o.x === ${r.x} && o.y === ${r.y}).got`);
        check('dragging along the shown way waters it', got > 0.29, String(got));
      }
    } else check('a tap on a dry orchard shows the way', false, 'no spot');
    await B.js(`(() => { const a = ${A}; const h = a.S.load(${kept3}); for (const k of Object.keys(a.g)) delete a.g[k]; Object.assign(a.g, h); a.view.layout(a.g); a.state.hintPath = null; return true; })()`);
  }

  // 4. layouts: the board fits, the bar does not cover it, cells are big enough for a finger
  for (const [w, h] of [[390, 844], [320, 568], [1280, 720], [844, 390], [768, 1024]]) {
    await B.size(w, h);
    await wait(150);
    r = await B.js(`(() => { const v = ${A}.view; return { cs: v.cs, x0: v.ox, y0: v.oy, x1: v.ox + v.bw, y1: v.oy + v.bh, rot: v.rot }; })()`);
    // a phone on its side lets the board run under the tip line (19.10), elsewhere the line has room
    const ok = r.x0 >= 0 && r.y0 >= 56 && r.x1 <= w && r.y1 <= h - (h < 500 && w > h ? 8 : 30) && r.cs >= 16;
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
  await wait(300);
  r = await B.js(`JSON.stringify({ bar: !document.getElementById('goalWrap').hidden, title: document.getElementById('goalWrap').title, hint: document.getElementById('hint').textContent, need: ${A}.g.goalNeed })`).then(JSON.parse);
  check('the second year shows its goal: a gold bar and a tip with the spring flood', r.bar && r.need >= 300 && /Цель года/.test(r.title) && /Весна/.test(r.hint) && r.hint.includes(String(r.need)), JSON.stringify(r));

  // 7. saving: a reload offers to continue the same game
  const before = await B.js(`JSON.stringify({ day: Math.round(${A}.g.day), year: ${A}.g.year, strokes: ${A}.g.strokes.length })`);
  await B.js(`document.dispatchEvent(new Event('visibilitychange'))`);
  await B.init('');
  await B.open(page('&lang=ru'), 390, 844);
  const cont = await clickText('Продолжить');
  await wait(200);
  const after = await B.js(`JSON.stringify({ day: Math.round(${A}.g.day), year: ${A}.g.year, strokes: ${A}.g.strokes.length })`);
  // (the game runs on between the look and the save: the day may move on a little)
  const [b0, a0] = [JSON.parse(before), JSON.parse(after)];
  check('continue after a reload', cont && b0.year === a0.year && b0.strokes === a0.strokes && Math.abs(b0.day - a0.day) <= 1, `${before} -> ${after}`);
  await clickText('Продолжить'); // the pause panel

  // 8. losing and starting again
  r = await B.js(`(() => { const { g } = ${A}; for (let k = 0; k < 40 && !g.over; k++) { for (let i = 0; i < g.W * g.H; i++) g.gate[i] = g.kind[i] === 2 ? 1 : 0; ${A}.step(5); } return !!g.over; })()`);
  await wait(200);
  const overPanel = await B.js(`document.getElementById('ui').innerText`);
  check('an orchard dries up: the game is over', r && overPanel.includes('Сад засох'), overPanel.split('\n')[0]);
  const saveGone = await B.js(`localStorage.getItem('aryq.save')`);
  check('the finished game is not offered to continue', saveGone === null || saveGone === 'null', String(saveGone).slice(0, 20));
  // 8a. "one more year" (21.10): once a game the dry orchard goes and the valley carries on
  r = await B.js(`JSON.stringify({ dead: ${A}.g.over, objects: ${A}.g.objects.length, dig: ${A}.g.dig, more: [...document.querySelectorAll('#ui button')].some((b) => b.innerText.includes('Ещё год')), tomorrow: document.getElementById('ui').innerText.includes('долин') })`).then(JSON.parse);
  check('the loss offers one more year and the valley of the day', r.more && r.tomorrow, JSON.stringify(r));
  const atLoss = r;
  await clickText('Ещё год');
  await wait(300);
  r = await B.js(`JSON.stringify({ over: !!${A}.g.over, deadHere: ${A}.g.objects.some((o) => o.x === ${atLoss.dead.x} && o.y === ${atLoss.dead.y} && o.thirst > 0.5), objects: ${A}.g.objects.length, dig: ${A}.g.dig, hud: !document.getElementById('hud').hidden, panel: document.getElementById('ui').innerText.length, thirst: Math.max(...${A}.g.objects.map((o) => o.thirst)), revived: ${A}.g.revived })`).then(JSON.parse);
  // (a new orchard may come up at once: its turn was due while the loss stopped time)
  check('one more year: the dry orchard is gone, the rest get a breather and ketmen', !r.over && r.hud && r.panel === 0 && !r.deadHere && r.objects <= atLoss.objects && r.dig >= atLoss.dig + 15 && r.thirst < 0.9 && r.revived === 1, JSON.stringify(r));
  r = await B.js(`(() => { const { g } = ${A}; for (let k = 0; k < 40 && !g.over; k++) { for (let i = 0; i < g.W * g.H; i++) g.gate[i] = g.kind[i] === 2 ? 1 : 0; ${A}.step(5); } return !!g.over; })()`);
  await wait(200);
  r = await B.js(`[...document.querySelectorAll('#ui button')].map((b) => b.innerText.split(String.fromCharCode(10))[0]).join('|')`);
  check('one more year is given only once a game', !r.includes('Ещё год') && r.includes('Ещё раз'), r);
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
    const diff = S.sourceFlow(g.day, g.year, g.melt) - used - spilt - g.gone - g.soak;
    // nobody thirsty right next to a cell with water to spare (the mesh of canals of 17.10)
    for (let k = 0; k < 4; k++) S.flowStep(g);
    let dryBeside = 0;
    for (const o of g.objects) {
      if (o.got >= o.need * 0.6 || g.day >= S.WINTER) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = o.x + dx, y = o.y + dy; if (x >= 0 && y >= 0 && x < g.W && y < g.H && S.isWater(g, y * g.W + x) && g.flow[y * g.W + x] >= o.need * 2) dryBeside++; }
    }
    let spillOn = 0;
    for (let i = 0; i < g.W * g.H; i++) if (g.spill[i] > 0.02 && g.out[i].some((t) => !g.gate[t])) spillOn++;
    return { bad, diff: +diff.toFixed(5), strokes: g.strokes.length, dig: g.dig, spillOn, dryBeside };
  })()`);
  check('300 random swipes: water never runs uphill', r.bad === 0, JSON.stringify(r));
  check('300 random swipes: the water adds up', Math.abs(r.diff) < 1e-3, String(r.diff));
  check('digging budget never goes below zero', r.dig >= 0, String(r.dig));
  check('no puddles where water could run on', r.spillOn === 0, String(r.spillOn));
  check('nobody dries up next to plenty of water', r.dryBeside === 0, String(r.dryBeside));

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

  // 10b. a phone: cells are small under a finger, so two fingers zoom in and a loupe shows the cell
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(page('&lang=ru&seed=1004'), 375, 812);
  await wait(300);
  await clickText('Играть');
  await wait(200);
  const touch = (type, pts) => B.cdp('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  let gh = await B.js(`JSON.stringify(${A}.state.ghost)`).then(JSON.parse);
  let [px, py] = (await centers([gh.from]))[0];
  await B.cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: px, y: py, deltaX: 0, deltaY: -500 });
  await wait(50);
  r = await B.js(`(() => { const v = ${A}.view, [x, y] = v.center(${gh.from}); return JSON.stringify({ z: v.zoom, same: v.cellAt(x, y) === ${gh.from}, cs: v.cs }); })()`).then(JSON.parse);
  check('the mouse wheel zooms in and cells stay where they are', r.z > 1.5 && r.z <= 2.5 && r.same, JSON.stringify(r));
  await B.cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: px, y: py, deltaX: 0, deltaY: 3000 });
  await wait(50);
  const strokes0 = await B.js(`${A}.g.strokes.length`);
  await touch('touchStart', [[150, 400], [200, 420]]);
  for (let k = 1; k <= 6; k++) await touch('touchMove', [[150 - k * 15, 400 - k * 12], [200 + k * 15, 420 + k * 12]]);
  await touch('touchEnd', []);
  await wait(50);
  r = await B.js(`JSON.stringify({ z: ${A}.view.zoom, strokes: ${A}.g.strokes.length, ox: ${A}.view.ox, bw: ${A}.view.bw })`).then(JSON.parse);
  check('two fingers zoom in and dig nothing', r.z > 1.6 && r.strokes === strokes0, JSON.stringify(r));
  check('a zoomed valley still covers the screen edge to edge', r.ox <= 10 && r.ox + r.bw >= 365, JSON.stringify(r));
  // dig the hint with one finger in the zoomed valley; the loupe is up while the finger moves
  gh = await B.js(`JSON.stringify(${A}.state.ghost)`).then(JSON.parse);
  const tp = await centers([gh.from, ...gh.cells]);
  const onScreen = tp.every(([x, y]) => x > 0 && x < 375 && y > 58 && y < 766);
  if (!onScreen) { // bring the path into view first
    const [mx, my] = tp[Math.floor(tp.length / 2)];
    await B.js(`${A}.view.pan(${187 - mx}, ${412 - my})`);
  }
  const tp2 = await centers([gh.from, ...gh.cells]);
  await touch('touchStart', [tp2[0]]);
  for (const p of tp2.slice(1)) await touch('touchMove', [p]);
  const loupe = await B.js(`JSON.stringify(${A}.state.loupe)`);
  await wait(60);
  await B.shot(path.join(out, 'phone-loupe.png'));
  await touch('touchEnd', []);
  await B.js(`${A}.step(0.3)`);
  r = await B.js(`JSON.stringify({ s: ${A}.g.objects[0].s, strokes: ${A}.g.strokes.length, loupe: ${A}.state.loupe })`).then(JSON.parse);
  check('a finger in the zoomed valley digs the path', r.s >= 0.99 && r.strokes === strokes0 + 1 && r.loupe === null, loupe + ' ' + JSON.stringify(r));

  // at the normal size the finger hides a cell: the loupe shows it while digging
  await B.cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 187, y: 400, deltaX: 0, deltaY: 3000 });
  await wait(50);
  r = await B.js(`(() => { const { g, S, view } = ${A}; const W = g.W;
    for (const c of g.river) { const x = c % W;
      for (const d of [-1, 1]) { const n = c + d, n2 = c + 2 * d;
        if (x + 2 * d >= 0 && x + 2 * d < W && !S.isWater(g, n) && !S.isWater(g, n2) && !g.objAt[n] && !g.objAt[n2] && g.h[n2] <= g.h[c]) return JSON.stringify([c, n, n2].map((i) => view.center(i))); } }
    return 'null'; })()`).then(JSON.parse);
  if (r) {
    await touch('touchStart', [r[0]]);
    await touch('touchMove', [r[1]]);
    await touch('touchMove', [r[2]]);
    await wait(60);
    const lp = await B.js(`JSON.stringify({ loupe: ${A}.state.loupe, cs: ${A}.view.cs })`).then(JSON.parse);
    await B.shot(path.join(out, 'phone-loupe.png'));
    await touch('touchEnd', []);
    check('the loupe shows the cell under the finger on a phone', lp.loupe && lp.cs < 36, JSON.stringify(lp));
  } else check('the loupe shows the cell under the finger on a phone', false, 'no place to dig');

  // 10c. the CrazyGames frame on a laptop is 924x520: the whole menu fits in it (19.10: it was cut off)
  await B.init('try { localStorage.clear(); } catch {}');
  for (const [w, h] of [[924, 520], [390, 844]]) {
    await B.open(page('&lang=en'), w, h);
    r = await B.js(`(() => { const p = document.querySelector('#ui .panel').getBoundingClientRect(); return JSON.stringify({ top: Math.round(p.top), bottom: Math.round(p.bottom), vh: innerHeight }); })()`).then(JSON.parse);
    check(`the menu fits a ${w}x${h} screen`, r.top >= 0 && r.bottom <= r.vh, JSON.stringify(r));
  }

  // the help on a phone on its side: the button to close it is in sight without scrolling
  await B.open(page('&lang=ru'), 844, 390);
  await clickText('Как играть');
  r = await B.js(`(() => { const b = [...document.querySelectorAll('#ui .panel.help button')].pop().getBoundingClientRect(); return JSON.stringify({ top: Math.round(b.top), bottom: Math.round(b.bottom), vh: innerHeight }); })()`).then(JSON.parse);
  check('the help button is in sight on a phone on its side', r.top >= 0 && r.bottom <= r.vh, JSON.stringify(r));
  // the tallest game-over panel (a village level up, one more year) fits the CrazyGames frame and a
  // phone on its side with every button in sight (21.10: the last two were below the screen)
  for (const [w, h] of [[924, 520], [844, 390], [640, 360]]) {
    await B.init(`try { localStorage.clear(); localStorage.setItem('aryq.village', '900'); } catch {}`);
    await B.open(page('&lang=ru&seed=1004'), w, h);
    await clickText('Играть');
    await wait(300);
    await B.js(`${A}.g.harvest = 300; ${A}.g.objects.forEach((o) => (o.thirst = 1.5)); ${A}.g.shield = 0; ${A}.step(0.2)`);
    await wait(500);
    r = await B.js(`(() => { const p = document.querySelector('#ui .panel.over').getBoundingClientRect(); const out = [...document.querySelectorAll('#ui .panel.over button')].filter((b) => { const q = b.getBoundingClientRect(); return q.top < 0 || q.bottom > innerHeight; }).length; return JSON.stringify({ top: Math.round(p.top), bottom: Math.round(p.bottom), vh: innerHeight, out, up: !!document.querySelector('#ui .village-up') }); })()`).then(JSON.parse);
    check(`the game-over panel fits a ${w}x${h} screen`, r.up && r.top >= 0 && r.bottom <= r.vh && r.out === 0, JSON.stringify(r));
  }
  await B.init('');
  // 10g. the first minute of a brand-new player (23.10: on CrazyGames many left without digging once,
  // and a dozen lost the easy valley in the first two minutes)
  {
    const Sim = await import('../js/sim.js');
    // the very first game: nothing can dry up before day 45 of year 1, thirst grows slower; later games
    // keep only the slower thirst, and from the fourth on there is no head start
    const dryRun = (first, days) => {
      const g = Sim.newGame(16, 26, 11, 'wide');
      if (first != null) Sim.giveHeadStart(g, first);
      Sim.advance(g, 0.01);
      g.events.length = 0;
      let lostAt = null;
      for (let d = 0; d < days && !g.over; d += 0.25) {
        Sim.advance(g, 0.25);
        if (g.over && lostAt == null) lostAt = g.day;
      }
      return { lostAt, thirst: Math.max(...g.objects.map((o) => o.thirst)) };
    };
    const plain = dryRun(null, 60), first = dryRun(true, 44), firstLater = dryRun(true, 80), second = dryRun(false, 60);
    check('a dry orchard is lost in the plain game, never before day 45 in the first one, later in the second',
      plain.lostAt != null && first.lostAt == null && first.thirst <= 0.95 && firstLater.lostAt != null && firstLater.lostAt >= 45 && second.lostAt > plain.lostAt,
      JSON.stringify({ plain: plain.lostAt, first: first.lostAt, firstLater: firstLater.lostAt, second: second.lostAt }));
    const g = Sim.newGame(16, 26, 11, 'wide');
    Sim.giveHeadStart(g, true);
    const back = Sim.load(JSON.parse(JSON.stringify(Sim.save(g))));
    check('the head start survives a save', back.mercy === 0.6 && back.shield === 45, `${back.mercy} ${back.shield}`);
    // the second year (24.10): spring comes as a flood, and the year has a goal with a reward
    check('from the second year spring gives more water, summer as before',
      Sim.sourceFlow(0, 2) > Sim.sourceFlow(0, 1) * 1.5 && Sim.sourceFlow(0, 1) === Sim.sourceFlow(0, 1, 1) && Math.abs(Sim.sourceFlow(60, 2) - Sim.sourceFlow(60, 1) * 0.87) < 1e-9,
      `${Sim.sourceFlow(0, 1).toFixed(2)} -> ${Sim.sourceFlow(0, 2).toFixed(2)}`);
    const y = Sim.newGame(16, 26, 11, 'wide');
    Sim.advance(y, 0.01);
    y.harvest = 700;
    y.day = 119.99;
    Sim.advance(y, 0.05);
    const goal0 = { need: y.goalNeed, left: Sim.goalLeft(y) };
    const dig0 = y.dig;
    y.events.length = 0;
    y.harvest += y.goalNeed;
    Sim.advance(y, 0.05);
    const reached = y.events.some((e) => e.type === 'goal');
    const y2 = Sim.load(JSON.parse(JSON.stringify(Sim.save(y))));
    check('the second year sets a goal of ~90% of the first harvest; reaching it gives ketmen and apples once, a save keeps it',
      Sim.goalLeft(Sim.newGame(16, 26, 11, 'wide')) === null && goal0.need === 630 && goal0.left === 630 && reached && y.dig >= dig0 + Sim.GOAL.dig && y.goalDone === 1 && y2.goalDone === 1 && y2.goalNeed === 630 && y2.yearStart === 700,
      JSON.stringify({ goal0, reached, dig: [dig0, y.dig], back: [y2.goalNeed, y2.goalDone, y2.yearStart] }));
  }
  for (const [w, h, seed] of [[390, 844, 1004], [924, 520, 1004], [390, 844, 7], [844, 390, 21]]) {
    await B.init('try { localStorage.clear(); } catch {}');
    await B.open(page(`&lang=ru&seed=${seed}`), w, h);
    await clickText('Играть');
    await wait(900);
    r = await B.js(`(() => { const a = ${A}, v = a.view, gh = a.state.ghost; if (!gh) return JSON.stringify({ ghost: false });
      const pts = [gh.from, ...gh.cells].map((c) => v.center(c));
      const under = (v.labelRects || []).reduce((n, [x, y, bw, bh]) => n + pts.filter(([px, py]) => px > x && px < x + bw && py > y && py < y + bh).length, 0);
      return JSON.stringify({ ghost: true, hand: a.state.hand, labels: (v.labelRects || []).length, under, mercy: a.g.mercy, shield: a.g.shield }); })()`).then(JSON.parse);
    check(`a new player on ${w}x${h}: the hand shows the path, no label covers it, the first game has a head start`, r.ghost && r.hand && r.labels >= 2 && r.under === 0 && r.mercy === 0.6 && r.shield === 45, JSON.stringify(r));
    if (w === 924) {
      // one who touches nothing (24.10): after ~3 s of the valley on screen the first canal digs itself
      // under the hand and the first orchard drinks within the first ten seconds
      await wait(4600);
      r = await B.js(`JSON.stringify({ strokes: ${A}.g.strokes.length, wet: ${A}.g.objects.filter((o) => o.s >= 0.6).length, f: ${A}.state.firstWet, demo: !!${A}.state.demo, hint: document.getElementById('hint').textContent })`).then(JSON.parse);
      check('a new player who touches nothing sees the first canal dig itself and the orchard drink in under 10 s', r.strokes === 1 && r.wet >= 1 && r.f === 1 && !r.demo && /Вот так/.test(r.hint), JSON.stringify(r));
    }
    if (w !== 390 || seed !== 1004) continue;
    // two taps instead of a pull: the first says to pull, the second digs the first canal along the path
    const [sx, sy] = await B.js(`JSON.stringify(${A}.view.center(${A}.state.ghost.from))`).then(JSON.parse);
    await mouse('mousePressed', sx, sy);
    await mouse('mouseReleased', sx, sy);
    await wait(150);
    const tip1 = await B.js(`JSON.stringify({ hint: document.getElementById('hint').textContent, strokes: ${A}.g.strokes.length })`).then(JSON.parse);
    await mouse('mousePressed', sx, sy);
    await mouse('mouseReleased', sx, sy);
    await wait(2500);
    r = await B.js(`JSON.stringify({ strokes: ${A}.g.strokes.length, s: ${A}.g.objects[0].s, hint: document.getElementById('hint').textContent })`).then(JSON.parse);
    check('a tapping new player is told to pull, then the first canal digs itself and waters the orchard', /тяни/.test(tip1.hint) && tip1.strokes === 0 && r.strokes === 1 && r.s >= 0.6 && /Вот так/.test(r.hint), JSON.stringify([tip1, r]));
    // ripe apples (23.10): while every orchard drinks one now and then hangs over a happy orchard; a tap
    // picks it for +5 and digs nothing; none in winter
    await B.js(`${A}.state.ripeT = 10`);
    let apple = null;
    for (let k = 0; k < 12 && !apple; k++) {
      await wait(150);
      apple = await B.js(`${A}.state.ripe.length ? JSON.stringify(${A}.view.applePos(${A}.state.ripe[0].o, ${A}.state.ripe[0].age)) : null`);
    }
    if (apple) {
      const [ax, ay] = JSON.parse(apple);
      const h0 = await B.js(`${A}.g.harvest`);
      const tipA = await B.js(`document.getElementById('hint').textContent`);
      await mouse('mousePressed', ax, ay);
      await mouse('mouseReleased', ax, ay);
      await wait(200);
      r = await B.js(`JSON.stringify({ gain: Math.round(${A}.g.harvest - ${h0}), ripe: ${A}.state.ripe.length, strokes: ${A}.g.strokes.length, cur: !!${A}.g.cur })`).then(JSON.parse);
      check('a ripe apple comes while all drink, a tap picks it for +5 and digs nothing', /яблоко/.test(tipA) && r.gain >= 5 && r.gain <= 6 && r.ripe === 0 && r.strokes === 1 && !r.cur, JSON.stringify({ tipA, ...r }));
    } else check('a ripe apple comes while all drink, a tap picks it for +5 and digs nothing', false, 'no apple');
    await B.js(`${A}.state.ripeT = 10; ${A}.g.day = ${A}.S.WINTER + 1`);
    await wait(600);
    check('no ripe apples in winter', (await B.js(`${A}.state.ripe.length`)) === 0);
    // once the player has watered orchards the taps do nothing of the sort
    await B.init(`try { localStorage.clear(); localStorage.setItem('aryq.taught', '5'); localStorage.setItem('aryq.played', '4'); } catch {}`);
    await B.open(page(`&lang=ru&seed=${seed}`), w, h);
    await clickText('Играть');
    await wait(900);
    r = await B.js(`JSON.stringify({ hand: ${A}.state.hand, mercy: ${A}.g.mercy || 0, shield: ${A}.g.shield || 0, from: ${A}.state.ghost ? ${A}.view.center(${A}.state.ghost.from) : null })`).then(JSON.parse);
    if (r.from) {
      for (let k = 0; k < 2; k++) {
        await mouse('mousePressed', ...r.from);
        await mouse('mouseReleased', ...r.from);
        await wait(150);
      }
    }
    const later = await B.js(`${A}.g.strokes.length`);
    check('a player who knows the game: no hand, no head start, taps dig nothing', !r.hand && r.mercy === 0 && r.shield === 0 && later === 0, JSON.stringify({ ...r, strokes: later }));
  }
  await B.init('');
  // a game started in a hidden frame (a CrazyGames relaunch, a game behind an ad) shows its valley
  // once the frame is shown (23.10: the grass layer was 0×0, drawing it threw and the loop stopped)
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(`${S.url}/aryq/tools/hidden-frame.html`, 960, 560);
  await wait(700);
  await B.js(`document.getElementById('f').contentWindow.document.querySelector('#ui .btn').click()`);
  await wait(2200);
  r = await B.js(`(() => { const w = document.getElementById('f').contentWindow, c = w.document.getElementById('game'), v = w.__aryq.view;
    const [x, y] = v.center(w.__aryq.g.river[Math.floor(w.__aryq.g.river.length / 2)]);
    const p = c.getContext('2d').getImageData(Math.round(x * v.dpr), Math.round(y * v.dpr), 1, 1).data;
    return JSON.stringify({ canvas: [c.width, c.height], river: [p[0], p[1], p[2]] }); })()`).then(JSON.parse);
  const blue = r.river[2] > r.river[0] + 40;
  check('a game started in a hidden frame shows its valley when the frame is shown', r.canvas[0] > 900 && blue && !B.errors.some((e) => /drawImage/.test(e)), JSON.stringify(r));
  await B.init('');
  // a careless player for five years against the rules: water downhill and adding up, saves that
  // load back the same, and taps that stay put in winter (the water blinked, 18.10)
  {
    const { execFileSync } = await import('node:child_process');
    let res = '';
    try { res = execFileSync(process.execPath, [path.join(repo, 'aryq/tools/chaos.mjs'), '3', '5', '--keep'], { encoding: 'utf8' }); } catch (e) { res = (e.stdout || '') + (e.message || ''); }
    const last = res.trim().split(/\r?\n/).pop();
    check('a careless player breaks no rule in five years', / 0 bugs/.test(last), last);
  }


  // a 320 px phone: the season card keeps its words next to the buttons (19.10: it showed "Ле")
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(page('&lang=ru&seed=1004'), 320, 568);
  await B.init('');
  await clickText('Играть');
  await wait(250);
  r = await B.js(`(() => { const s = document.querySelector('.hud-season').getBoundingClientRect(), n = document.getElementById('seasonName').getBoundingClientRect(); return JSON.stringify({ card: Math.round(s.width), nameRight: Math.round(n.right), cardRight: Math.round(s.right) }); })()`).then(JSON.parse);
  check('the season card is readable on a 320 px phone', r.card >= 60 && r.nameRight <= r.cardRight, JSON.stringify(r));

  // a phone with 2x pixels: Play starts the game quickly (19.10: 2.3 s while the terrain painted)
  await B.open(page('&lang=en&seed=1004'), 390, 844);
  await B.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await B.js(`location.reload()`);
  await wait(1200);
  r = await B.js(`(() => { const t = performance.now(); [...document.querySelectorAll('button')].find((x) => x.className === 'btn').click(); return Math.round(performance.now() - t); })()`);
  // (23.10: the first look is painted coarse so the game starts at once, the sharp one comes within seconds)
  let sharp = 0;
  for (let k = 0; k < 24 && sharp < 1000; k++) {
    await wait(250);
    sharp = await B.js(`${A}.view.terrain ? ${A}.view.terrain.width : 0`);
  }
  check('Play starts in under a second on a 2x phone, the sharp ground follows', r < 1000 && sharp >= 1000, `${r} ms, ground ${sharp} px wide`);
  await B.cdp('Emulation.clearDeviceMetricsOverride');

  // 10d. input and saves the 19.10 bug hunt found
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(page('&lang=ru&seed=1004'), 924, 520);
  // the language buttons switch in place (on CrazyGames a reload came back in the old language)
  await B.js(`[...document.querySelectorAll('.langs button')].find((b) => b.innerText === 'EN').click()`);
  await wait(200);
  r = await B.js(`JSON.stringify({ btn: document.querySelector('#ui .btn').innerText.split(String.fromCharCode(10))[0], html: document.documentElement.lang, loads: performance.getEntriesByType('navigation').length })`).then(JSON.parse);
  check('the language switches at once', r.btn === 'Play' && r.html === 'en', JSON.stringify(r));
  await clickText('Play');
  await wait(250);
  {
    const gh = await B.js(`JSON.stringify(${A}.state.ghost)`).then(JSON.parse);
    const pp = await centers([gh.from, ...gh.cells]);
    const rm = (type, x, y) => B.cdp('Input.dispatchMouseEvent', { type, x, y, button: 'right', buttons: type === 'mouseReleased' ? 0 : 2, clickCount: 1 });
    await B.js(`window.__menu = 0; window.addEventListener('contextmenu', (e) => { if (!e.defaultPrevented) window.__menu++; })`);
    await rm('mousePressed', ...pp[0]);
    for (const p of pp.slice(1)) await rm('mouseMoved', ...p);
    await rm('mouseReleased', ...pp[pp.length - 1]);
    r = await B.js(`JSON.stringify({ strokes: ${A}.g.strokes.length, menu: window.__menu })`).then(JSON.parse);
    check('the right mouse button does not dig or open a menu', r.strokes === 0 && r.menu === 0, JSON.stringify(r));
    // a drag whose button is let go outside the window still ends the canal
    await mouse('mousePressed', ...pp[0]);
    await mouse('mouseMoved', ...pp[1]);
    await B.js(`document.getElementById('game').dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1, pointerType: 'mouse' }))`);
    await wait(50);
    r = await B.js(`JSON.stringify({ open: !!${A}.g.cur, strokes: ${A}.g.strokes.length })`).then(JSON.parse);
    await mouse('mouseReleased', ...pp[1]);
    check('a drag that loses the mouse still ends its canal', !r.open && r.strokes === 1, JSON.stringify(r));
  }
  // a broken save is not offered, and an orchard off the map in a save is dropped
  await B.init(`try { localStorage.clear(); localStorage.setItem('aryq.save', JSON.stringify({ v: 1, W: 5, H: 5, seed: 1, strokes: [], gates: [], objects: [], day: 1, year: 1 })); } catch {}`);
  await B.open(page('&lang=en'), 924, 520);
  r = await B.js(`document.querySelector('#ui .btn').innerText.split(String.fromCharCode(10))[0]`);
  check('a save of the wrong size is not offered', r === 'Play', r);
  {
    const Sim = await import('../js/sim.js');
    const g0 = Sim.newGame(16, 26, 5, 'wide');
    const d = { ...Sim.save(g0), valley: 'moon', objects: [{ type: 'garden', x: 99, y: 99, need: 0.3 }, { type: 'garden', x: 3, y: 20, need: 0.3 }], gates: [99999] };
    const g1 = Sim.load(d);
    check('a save is cleaned on load', g1.valley === 'mountain' && g1.objects.length <= 1 && g1.objects.every((o) => o.x < 16 && o.y < 26), `${g1.valley}, ${g1.objects.length} objects`);
  }
  await B.init('');

  // 10e. the full bug pass of 19.10
  // the first game: "start here" does not sit on a first-game label
  for (const [w, h] of [[844, 390], [924, 520], [390, 844]]) {
    await B.init('try { localStorage.clear(); } catch {}');
    await B.open(page('&lang=ru&seed=1004'), w, h);
    await clickText('Играть');
    await wait(300);
    r = await B.js(`JSON.stringify({ labels: ${A}.view.labelRects || [], ghost: !!${A}.state.ghost })`).then(JSON.parse);
    // where the tag went: drawGhost picks the side; read it back from a frame drawn with a hook
    const tag = await B.js(`new Promise((ok) => { const v = ${A}.view; const cx = v.cx; const orig = cx.fillText.bind(cx); let box = null;
      cx.fillText = (txt, x, y, ...rest) => { if (txt === 'начни тут') box = [x - 5, y - 10, cx.measureText(txt).width + 10, 20]; return orig(txt, x, y, ...rest); };
      requestAnimationFrame(() => requestAnimationFrame(() => { cx.fillText = orig; ok(JSON.stringify(box)); })); })`).then(JSON.parse);
    const hit = tag && r.labels.some(([x, y, bw, bh]) => x < tag[0] + tag[2] && x + bw > tag[0] && y < tag[1] + tag[3] && y + bh > tag[1]);
    check(`"start here" clears the first-game labels at ${w}x${h}`, r.ghost && tag && !hit, JSON.stringify({ tag, labels: r.labels.length }));
    if (w === 844) {
      const cs = await B.js(`${A}.view.cs0`);
      check('a phone on its side gets a bigger board (cell ≥ 19 px)', cs >= 19, `${cs} px`);
    }
  }
  // a game closed on the year gift panel gets its gift back
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(page('&lang=ru&seed=1004'), 924, 520);
  await clickText('Играть');
  await wait(200);
  await B.js(`${A}.g.day = 119.97`);
  await wait(700);
  await B.js(`document.dispatchEvent(new Event('visibilitychange'))`); // saved as the tab goes
  await B.init('');
  await B.js(`location.reload()`).catch(() => {});
  await wait(900);
  await clickText('Продолжить');
  await wait(400);
  r = await B.js(`JSON.stringify({ panel: document.getElementById('ui').innerText.split(String.fromCharCode(10))[0], gifts: document.querySelectorAll('#ui .choice').length })`).then(JSON.parse);
  check('a game closed on the gift panel gets its gift back', /пережит/.test(r.panel) && r.gifts === 3, JSON.stringify(r));
  // the CrazyGames build shows up even when their SDK never answers
  await B.init(`try { localStorage.clear(); } catch {}
    Object.defineProperty(window, 'CrazyGames', { configurable: false, writable: false, value: { SDK: { environment: 'crazygames', init: () => new Promise(() => {}), game: {}, data: null } } });`);
  await B.open(`${S.url}/dist/aryq-crazygames/index.html`, 924, 520);
  await wait(6500);
  // it opens straight in a valley (21.10), so the header shows instead of a menu
  r = await B.js(`document.getElementById('ui').innerText.slice(0, 4) || (document.getElementById('hud').hidden ? '' : 'hud')`);
  B.errors.splice(0); // the real SDK script cannot replace the pinned stand-in
  check('the portal build starts even if its SDK hangs', r.length > 0, JSON.stringify(r));
  await B.init('');

  // 10f. on a portal the first screen is the valley (21.10: CG counts a visit only once play starts)
  await B.init(`try { localStorage.clear(); } catch {} window.ARYQ_PORTAL = 'crazygames';`);
  await B.open(page('&lang=ru&seed=1005'), 924, 520);
  await wait(700);
  r = await B.js(`JSON.stringify({ hud: !document.getElementById('hud').hidden, ui: document.getElementById('ui').innerText.slice(0, 20), mode: ${A}.g.mode })`).then(JSON.parse);
  check('a new portal player lands straight in the wide valley', r.hud && r.ui === '' && r.mode === 'wide', JSON.stringify(r));
  await B.js(`${A}.g.day = 30; document.dispatchEvent(new Event('visibilitychange'))`);
  await B.init(`window.ARYQ_PORTAL = 'crazygames';`);
  await B.js('location.reload()').catch(() => {});
  await wait(900);
  r = await B.js(`JSON.stringify({ hud: !document.getElementById('hud').hidden, day: ${A}.g.day, mode: ${A}.g.mode })`).then(JSON.parse);
  check('a returning portal player goes on with the saved valley', r.hud && r.day >= 30 && r.mode === 'wide', JSON.stringify(r));
  await B.js(`document.getElementById('pauseBtn').click()`);
  await clickText('Меню');
  await wait(300);
  const day0 = await B.js(`${A}.g.day`);
  await wait(600);
  r = await B.js(`JSON.stringify({ menu: document.getElementById('ui').innerText.includes('Продолжить'), hud: !document.getElementById('hud').hidden, still: ${A}.g.day === ${day0} })`).then(JSON.parse);
  check('pause has a way to the menu, the valley waits behind it', r.menu && !r.hud && r.still, JSON.stringify(r));
  await B.init('');

  // 10g. the valley of the day keeps a streak of days in a row, each day gives ketmen at the start
  await B.init(`try { localStorage.clear(); localStorage.setItem('aryq.streak', JSON.stringify({ d: new Date(Date.now() - 864e5).toISOString().slice(0, 10), n: 2 })); } catch {}`);
  await B.open(page('&lang=ru'), 924, 520);
  r = await B.js(`document.getElementById('ui').innerText.includes('Серия: 2 дн.')`);
  check('the menu shows the streak of the valley of the day', r, String(r));
  await B.js(`[...document.querySelectorAll('#ui .choice')].find((b) => b.innerText.includes('Долина дня')).click()`);
  await wait(1000);
  r = await B.js(`JSON.stringify({ streak: JSON.parse(localStorage.getItem('aryq.streak')), hint: document.querySelector('.hint-line').textContent, mode: ${A}.g.mode })`).then(JSON.parse);
  check('a day in a row adds to the streak and gives +10 ketmen', r.mode === 'daily' && r.streak.n === 3 && /Серия 3.*[+]10/.test(r.hint), JSON.stringify(r));
  await B.init('');

  // 10f. the village (21.10): harvest carries over from game to game and its levels help new games
  {
    const Sim = await import('../js/sim.js');
    check('village levels: none below 1000, one at 1000, all at the top', Sim.villageLevel(999) === 0 && Sim.villageLevel(1000) === 1 && Sim.villageLevel(1e9) === Sim.VILLAGE.length);
    const g0 = Sim.newGame(16, 26, 5, 'wide'), g1 = Sim.newGame(16, 26, 5, 'wide');
    Sim.applyVillage(g1, 3); // +5 ⛏, wider canals, more generous glacier
    check('village perks change a new game', g1.dig === g0.dig + 5 && Math.abs(g1.cap - g0.cap - 0.2) < 1e-9 && g1.melt > g0.melt, `${g1.dig}/${g0.dig} ${g1.cap}/${g0.cap} ${g1.melt}`);
    g0.harvest = 700;
    const a = Sim.unbanked(g0);
    g0.harvest = 900;
    const b = Sim.unbanked(g0);
    const d = Sim.load(JSON.parse(JSON.stringify(Sim.save(g0))));
    d.harvest = 950;
    check('a game banks its harvest only once (one more year, a saved game)', a === 700 && b === 200 && Sim.unbanked(d) === 50, `${a} ${b}`);
  }
  await B.init(`try { localStorage.clear(); localStorage.setItem('aryq.village', '2400'); } catch {}`);
  await B.open(page('&lang=ru&seed=1004'), 924, 520);
  await clickText('Играть');
  await wait(300);
  r = await B.js(`JSON.stringify({ dig: ${A}.g.dig })`).then(JSON.parse);
  await wait(1200);
  const villageHint = await B.js(`document.getElementById('hint').textContent`);
  check('a new game starts with the village bonus and says so', r.dig === 35 && /Аул даёт/.test(villageHint), `${r.dig} ⛏, "${villageHint}"`);
  await B.js(`${A}.g.harvest = 300; ${A}.g.objects.forEach((o) => (o.thirst = 1.5)); ${A}.g.shield = 0; ${A}.step(0.2)`);
  await wait(700);
  r = await B.js(`JSON.stringify({ village: +localStorage.getItem('aryq.village'), text: (document.querySelector('#ui .village') || {}).innerText || '' })`).then(JSON.parse);
  check('the loss puts the harvest into the village and shows the level up', r.village === 2700 && /уровень 2/.test(r.text) && /Аул вырос/.test(r.text), JSON.stringify(r));
  await B.init(`try { localStorage.clear(); localStorage.setItem('aryq.village', '5000'); } catch {}`);
  await B.open(page('&lang=ru'), 924, 520);
  await clickText('Долина дня');
  await wait(300);
  r = await B.js(`JSON.stringify({ dig: ${A}.g.dig, cap: ${A}.g.cap })`).then(JSON.parse);
  check('the valley of the day stays the same for all (no village bonus)', r.dig === 30 && r.cap === 2, JSON.stringify(r));
  await B.init('');

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
