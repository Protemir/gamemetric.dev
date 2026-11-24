// Баланс «Табуна»: node tools/sim.mjs [от] [до]
// Для каждого уровня: сколько набирает автопилот, сколько у соперника, выигрывает ли «умный» и «случайный» игрок.
import { level, Run, DT, autoTarget, rng, HALF, LADDER, reward } from '../js/logic.js';

const from = Number(process.argv[2] || 1), to = Number(process.argv[3] || 30);

function play(L, policy, opts) {
  const run = new Run(L, opts);
  let g = 0;
  while (run.state !== 'win' && run.state !== 'lose' && g++ < 60 * 200) { run.step(DT, policy(run)); run.events.length = 0; }
  return run;
}

// «случайный» игрок: держит случайную сторону и меняет её раз в 1–3 с
function randomPolicy(seed) {
  const R = rng(seed);
  let x = 0, next = 0;
  return (run) => {
    if (run.t >= next) { x = (R() * 2 - 1) * (HALF - 1); next = run.t + 1 + R() * 2; }
    return x;
  };
}
// «средний» игрок: автопилот, но с запаздыванием и ошибкой в каждом пятом выборе
function sloppyPolicy(seed) {
  const R = rng(seed);
  let last = 0, wrong = false, gateSeen = -1;
  return (run) => {
    let x = autoTarget(run);
    const g = run.items.find((it) => it.type === 'gate' && !it.done);
    if (g && g.i !== gateSeen) { gateSeen = g.i; wrong = R() < 0.2; }
    if (wrong && g && !g.full) x = -x;
    last += (x - last) * 0.08;
    return last;
  };
}

let rows = [];
for (let n = from; n <= to; n++) {
  const L = level(n);
  const start = 5 + Math.floor((n - 1) / 3);
  const smart = play(L, autoTarget, { start, leader: 0 });
  let sloppyWins = 0, randWins = 0;
  const T = 10;
  for (let k = 0; k < T; k++) {
    if (play(L, sloppyPolicy(n * 100 + k), { start, leader: 0 }).state === 'win') sloppyWins++;
    if (play(L, randomPolicy(n * 1000 + k), { start, leader: 0 }).state === 'win') randWins++;
  }
  const types = {};
  for (const it of L.items) types[it.type] = (types[it.type] || 0) + 1;
  rows.push({
    n, len: L.length, boss: L.boss ? 'B' : '', auto: L.autoGot, rival: L.rival,
    smart: smart.state === 'win' ? 'win ×' + smart.mult : 'LOSE', coins: reward(L, smart.result || { win: false, coins: 0 }),
    sloppy: sloppyWins + '/' + T, random: randWins + '/' + T,
    items: Object.entries(types).map(([k, v]) => k + v).join(' '),
  });
}
console.table(rows);
