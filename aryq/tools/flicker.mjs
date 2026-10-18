// Looks for water that blinks: flow in a canal going up and down from tick to tick (18.10:
// "the game started blinking at the end of the season").
//   node aryq/tools/flicker.mjs [games=30]
import * as S from '../js/sim.js';

const games = +(process.argv[2] || 30);
const W = 18, H = 28;

let seedR = 7;
const rnd = () => ((seedR = (Math.imul(seedR, 1103515245) + 12345) >>> 0) / 4294967296);
// a player who digs a lot: extra canals to random places, as in the screenshot of 18.10
function spam(g) {
  if (g.dig < 6 || rnd() > 0.3) return;
  const water = []; for (let i = 0; i < g.W * g.H; i++) if (S.isWater(g, i)) water.push(i);
  const from = water[Math.floor(rnd() * water.length)];
  const goal = Math.floor(rnd() * g.W * g.H);
  if (g.kind[goal] !== S.LAND || g.objAt[goal]) return;
  const way = S.route(g, [from], (c) => c === goal);
  if (!way || way.cells.length > g.dig) return;
  S.startStroke(g, from);
  for (const c of way.cells) if (!S.extend(g, c).ok) break;
  S.endStroke(g);
}
function botTurn(g) {
  spam(g);
  for (const o of g.objects) {
    if (o.s >= 0.99) continue;
    const plan = S.planFor(g, o);
    if (!plan || !plan.cells.length || plan.cells.length > g.dig) continue;
    S.startStroke(g, plan.from);
    for (const c of plan.cells) if (!S.extend(g, c).ok) break;
    S.endStroke(g);
  }
}

let worst = [];
for (let k = 0; k < games; k++) {
  for (const valley of ['wide', 'mountain', 'gorge']) {
    const g = S.newGame(W, H, 2000 + k, valley);
    let t = 0;
    const hist = [];
    while (!g.over && t < 3 * S.YEAR_DAYS) {
      if (Math.round(t * 10) % 5 === 0) botTurn(g);
      for (const ev of g.events.splice(0)) if (ev.type === 'year') S.reward(g, S.REWARDS[ev.year % 3]);
      S.advance(g, 0.1);
      t += 0.1;
      const f = Float64Array.from(g.flow);
      hist.push({ f, day: g.day, year: g.year, s: g.objects.map((o) => o.s) });
      if (hist.length > 3) hist.shift();
      if (hist.length === 3) {
        const [a, b, c] = hist;
        let n = 0;
        for (let i = 0; i < W * H; i++) {
          if (g.kind[i] !== S.CANAL) continue;
          const d1 = b.f[i] - a.f[i], d2 = c.f[i] - b.f[i];
          const big = Math.max(a.f[i], b.f[i], c.f[i], 0.05);
          if (d1 * d2 < 0 && Math.min(Math.abs(d1), Math.abs(d2)) > 0.3 * big) n++;
        }
        if (n) worst.push({ seed: 2000 + k, valley, year: g.year, day: +g.day.toFixed(1), cells: n });
      }
    }
  }
}
const byDay = {};
for (const w of worst) {
  const bucket = w.day >= S.WINTER ? 'winter' : w.day >= 90 ? 'autumn' : 'other';
  byDay[bucket] = (byDay[bucket] || 0) + 1;
}
console.log('ticks with blinking canals:', worst.length, byDay);
console.table(worst.slice(0, 15));
