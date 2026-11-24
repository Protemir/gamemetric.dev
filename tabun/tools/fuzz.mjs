// Фаззинг логики «Табуна»: случайные забеги с дёрганым управлением, после каждого шага — проверка инвариантов.
// node tools/fuzz.mjs [забегов]
import { level, dailyLevel, Run, DT, rng, HALF, MAX_COUNT } from '../js/logic.js';

const RUNS = Number(process.argv[2] || 600);
const bad = new Map();
const note = (k, info) => { if (!bad.has(k)) bad.set(k, { n: 0, info }); bad.get(k).n++; };
const fin = (v) => Number.isFinite(v);

for (let k = 0; k < RUNS; k++) {
  const R = rng(k * 7 + 1);
  const n = 1 + Math.floor(R() * 40);
  const L = k % 9 === 0 ? dailyLevel(20000 + k, 4 + (k % 27)) : level(n);
  const run = new Run(L, { start: 1 + Math.floor(R() * 40), leader: Math.floor(R() * 60) });
  if (R() < 0.2) { run.count = Math.floor(R() * 999); run.sync(); }
  let x = 0, next = 0, steps = 0;
  const seen = new Set();
  while (run.state !== 'win' && run.state !== 'lose' && steps++ < 60 * 200) {
    if (run.t >= next) { x = (R() * 2 - 1) * (HALF + 3); next = run.t + R() * 1.2; }
    // иногда — шабыт и чудовищно большой табун посреди забега
    if (R() < 0.0005) run.boostT = 5;
    if (R() < 0.0002) { run.count = MAX_COUNT; run.sync(); }
    run.step(DT, x);
    for (const e of run.events) {
      if (e.type === 'gate') { const key = e.item.i; if (seen.has(key)) note('ворота сработали дважды', { lvl: L.n, i: key }); seen.add(key); }
      if (e.type === 'loss' && !(e.n >= 0)) note('потеря с n<0 или NaN', { lvl: L.n, e });
    }
    run.events.length = 0;
    const where = { lvl: L.n, daily: !!L.daily, state: run.state, t: run.t.toFixed(2) };
    if (!Number.isInteger(run.count) || run.count < 0 || run.count > MAX_COUNT) note('число коней вне 0..999 или дробное', { ...where, count: run.count });
    if (run.bodies.length > Math.max(run.count, 0) + 0 && run.state === 'run') note('тел больше, чем коней', { ...where, b: run.bodies.length, c: run.count });
    if (run.bodies.length > run.cap) note('тел больше лимита', { ...where, b: run.bodies.length });
    if (!fin(run.d) || !fin(run.cx) || !fin(run.speed)) note('NaN в позиции табуна', where);
    for (const b of run.bodies) if (!fin(b.x) || !fin(b.d)) { note('NaN у коня', where); break; }
    for (const w of run.wolves) if (!fin(w.x) || !fin(w.d)) { note('NaN у волка', where); break; }
    for (const r of run.raiders) if (!fin(r.x)) { note('NaN у конокрада', where); break; }
    if (run.rival.count < 0) note('у соперника меньше нуля', where);
    if (run.coins < 0 || !fin(run.coins)) note('монеты сломались', where);
    if (run.ghosts.length > 3000) note('призраки копятся без конца', { ...where, g: run.ghosts.length });
  }
  if (steps >= 60 * 200) note('забег не закончился за 200 с', { lvl: L.n, state: run.state, d: run.d, fin: run.finishD });
  if (run.state === 'win' && !(run.mult >= 1)) note('победа без множителя', { lvl: L.n, mult: run.mult });
}
if (!bad.size) console.log(`всё чисто: ${RUNS} забегов`);
for (const [k, v] of bad) console.log(`FAIL ×${v.n}  ${k}  ${JSON.stringify(v.info)}`);
process.exit(bad.size ? 1 : 0);
