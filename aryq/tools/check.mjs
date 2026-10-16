// Plays «Арық» in Node to check the rules and the balance:
//   node aryq/tools/check.mjs [games=20] [W=18] [H=28]
// The bot digs the shortest canal to every thirsty garden or house it can reach and does nothing
// else (no gates, no rejoining the river), so it is a fair but not clever player.
// It also checks that water never goes up: every edge falls, and the water adds up.
import * as S from '../js/sim.js';

const games = +(process.argv[2] || 20);
const W = +(process.argv[3] || 18);
const H = +(process.argv[4] || 28);

function check(g) {
  for (let a = 0; a < W * H; a++) {
    for (const b of g.out[a]) {
      if (!(g.bed[b] < g.bed[a])) throw new Error(`water goes up: ${a} -> ${b}`);
    }
  }
  S.flowStep(g);
  const into = S.sourceFlow(g.day, g.year);
  let used = 0;
  for (const o of g.objects) used += o.got;
  let spilt = 0;
  for (let i = 0; i < W * H; i++) spilt += g.spill[i];
  const diff = into - used - spilt - g.gone;
  if (Math.abs(diff) > 1e-3) throw new Error(`water does not add up: ${diff.toFixed(4)}`);
}

function botTurn(g) {
  for (const o of g.objects) {
    if (o.s >= 0.99) continue;
    const plan = S.planFor(g, o);
    if (!plan || !plan.cells.length || plan.cells.length > g.dig) continue;
    S.startStroke(g, plan.from);
    for (const c of plan.cells) {
      const r = S.extend(g, c);
      if (!r.ok) break;
    }
    S.endStroke(g);
  }
}

const rows = [];
for (let k = 0; k < games; k++) {
  const g = S.newGame(W, H, 1000 + k);
  let t = 0;
  while (!g.over && t < 6 * S.YEAR_DAYS) {
    botTurn(g);
    S.advance(g, 0.5);
    t += 0.5;
    if (t % 10 === 0) check(g);
  }
  rows.push({ seed: 1000 + k, years: +(t / S.YEAR_DAYS).toFixed(2), min: +((t * S.DAY_SEC) / 60).toFixed(1), gardens: S.gardens(g), harvest: Math.round(g.harvest), lost: g.lost, dig: g.dig, why: g.over ? g.over.why : 'alive' });
}
console.table(rows);
const avg = (f) => (rows.reduce((s, r) => s + f(r), 0) / rows.length).toFixed(1);
console.log(`avg minutes ${avg((r) => r.min)}, avg gardens ${avg((r) => r.gardens)}, houses lost ${avg((r) => r.lost)}`);
