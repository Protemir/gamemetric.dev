// The external check of 27.10 (E:/PS/qa-kokpar-aryq-2026-10-27.md), Aryk part, on the sim: AR-02 a loaded game
// grows the same orchards, AR-03 no second finds on undone ground, AR-04 the year's harvest after a reload;
// old saves still load.   node aryq/tools/saves-check.mjs
import * as S from '../js/sim.js';
let bad = 0;
const check = (name, ok, info) => { if (!ok) bad++; console.log(ok ? 'OK  ' : 'FAIL', name, info !== undefined ? JSON.stringify(info) : ''); };
const json = (x) => JSON.parse(JSON.stringify(x));
const objs = (g) => g.objects.map((o) => `${o.type[0]}${o.x},${o.y}`).join(' ');

// AR-02: a loaded game grows the same orchards and yurts as the one it was saved from
for (const [seed, valley, W, H] of [[1000, 'wide', 16, 26], [7, 'mountain', 16, 26], [21, 'gorge', 26, 16], [1004, 'wide', 30, 50]]) {
  const a = S.newGame(W, H, seed, valley);
  S.advance(a, 0.01);
  const b = S.load(json(S.save(a)));
  for (const g of [a, b]) for (let k = 0; k < 62; k++) S.advance(g, 0.05);
  check(`AR-02 seed ${seed} ${valley}: after a reload the same orchards and yurts come`, objs(a) === objs(b) && a.objects.length > 1, { a: objs(a), b: objs(b) });
  // and a reload in the middle of the year too, then into the next year
  const c = S.load(json(S.save(a)));
  for (const g of [a, c]) for (let k = 0; k < 400; k++) { for (const o of g.objects) o.thirst = 0; S.advance(g, 0.5); }
  check(`AR-02 seed ${seed}: a reload mid-game, two years on, still the same`, objs(a) === objs(c) && a.year === c.year, { year: [a.year, c.year], a: objs(a).slice(0, 80), c: objs(c).slice(0, 80) });
}

// AR-03: dig a canal, undo it, save/load, dig it again: no second count, no finds
{
  let g = S.newGame(16, 26, 4, 'wide');
  S.advance(g, 0.01);
  for (let k = 0; k < 62; k++) S.advance(g, 0.05);
  const dig = () => {
    S.startStroke(g, 37);
    for (const c of [36, 35, 51, 67, 66]) S.extend(g, c);
    S.endStroke(g);
  };
  dig();
  const first = { count: g.dugCount, finds: g.finds || 0, harvest: g.harvest };
  let undos = 0;
  for (let k = 0; k < 12; k++) {
    if (S.undo) undos += S.undo(g) ? 1 : 0;
    else { g.strokes.pop(); }
    g = S.load(json(S.save(g)));
    dig();
  }
  check('AR-03: re-digging undone ground after reloads counts nothing and finds nothing', g.dugCount === first.count && (g.finds || 0) === first.finds, { first, now: { count: g.dugCount, finds: g.finds || 0 }, undos });
}

// AR-04: the year's harvest survives a reload on its gift panel
{
  const g = S.newGame(16, 26, 11, 'wide');
  S.advance(g, 0.01);
  g.harvest = 300;
  g.yearStart = 0;
  g.day = 119.99;
  S.advance(g, 0.05); // year 1 -> 2: goal set, yearStart 300
  g.harvest = 1000;
  g.goalDone = 1;
  g.day = 119.99;
  S.advance(g, 0.05); // year 2 -> 3: its harvest 700
  const l = S.load(json(S.save(g)));
  check('AR-04: the harvest of the year just over is 700 before and after a reload', g.yearGot === 700 && l.yearGot === 700 && l.giftDue === l.year, { got: g.yearGot, loaded: l.yearGot, gift: l.giftDue, year: l.year });
}

// old saves (before 27.10: no rs, no dug, no yearGot) still load and play on
{
  const g = S.newGame(16, 26, 4, 'wide');
  S.advance(g, 0.01);
  for (let k = 0; k < 62; k++) S.advance(g, 0.05);
  S.startStroke(g, 37); for (const c of [36, 35, 51]) S.extend(g, c); S.endStroke(g);
  const old = json(S.save(g));
  delete old.rs; delete old.dug; delete old.yearGot;
  let ok = S.usable(old, 16, 26), l, err = null;
  try {
    l = S.load(old);
    for (let k = 0; k < 400; k++) { for (const o of l.objects) o.thirst = 0; S.advance(l, 0.5); }
  } catch (e) { err = String(e); }
  check('an old save loads and plays on for years', ok && !err && l && l.year >= 2 && old.strokes.length === 1 && old.strokes.every((s) => s.cells.every((c) => l.dugEver[c])) && Number.isFinite(l.yearGot), { ok, err, year: l && l.year, got: l && l.yearGot, dug36: l && l.dugEver[36] });
  const back = l && S.load(json(S.save(l)));
  check('and saves again in the new format', back && Number.isFinite(json(S.save(l)).rs) && Array.isArray(json(S.save(l)).dug));
}
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
