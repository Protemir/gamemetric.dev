// node asyk/tools/test.mjs — physics checks plus a bot that plays kons to see if the targets are fair.
import { step, moving, saka, launch, predict, KON, FIELD } from '../js/physics.js';
import { newKon, startThrow, knock, settle, finish, layout, target, throwFromHand, agaPlan, nextThrower, AWAY } from '../js/game.js';
import { rng } from '../js/util.js';

let fails = 0;
const ok = (cond, msg) => {
  if (!cond) {
    fails++;
    console.log('FAIL', msg);
  }
};

function run(g, onOut) {
  let t = 0;
  do {
    step(g.w, 1 / 60);
    for (const e of g.w.events) if (e.type === 'out') onOut(e.body);
    g.w.events.length = 0;
    t += 1 / 60;
  } while (moving(g.w) && t < 20);
  return t;
}

// 1. layouts: no bone overlaps another, all start inside the circle
for (let k = 1; k <= 12; k++) {
  const bs = layout(k, 42);
  for (const b of bs) ok(Math.hypot(b.x - KON.x, b.y - KON.y) < KON.r, `kon ${k}: bone outside circle`);
  for (let i = 0; i < bs.length; i++)
    for (let j = i + 1; j < bs.length; j++) ok(Math.hypot(bs[i].x - bs[j].x, bs[i].y - bs[j].y) >= bs[i].r + bs[j].r, `kon ${k}: bones ${i},${j} overlap`);
}

// 2. a straight full throw at the row hits, knocks something and everything comes to rest
{
  const g = newKon(1, 7);
  startThrow(g);
  const s = saka(g.w);
  launch(g.w, KON.x - s.x, KON.y - s.y, 1);
  const p = predict(g.w, KON.x - s.x, KON.y - s.y, 1);
  ok(p.hit, 'guide finds the row');
  let outs = 0;
  const t = run(g, (b) => {
    knock(g, b);
    outs++;
  });
  ok(t < 12, `everything stops (${t.toFixed(1)}s)`);
  ok(outs > 0, 'full throw at the row knocks bones out');
  for (const b of g.w.bodies) ok(b.x >= FIELD.minX && b.x <= FIELD.maxX && b.y >= FIELD.minY && b.y <= FIELD.maxY, 'bone stays in the yard');
  const turn = settle(g);
  ok(turn.score === turn.chips * turn.mult, 'score = chips × mult');
  finish(g);
  const want = 4 + (turn.refund ? 1 : 0) + (turn.side.throws || 0);
  ok(turn.refund === turn.knocked >= 2 && g.throws === want, `two bones in one throw give it back (${g.throws})`);
}

// 3. a weak throw that dies before the circle scores nothing and costs a throw
{
  const g = newKon(1, 9);
  startThrow(g);
  launch(g.w, 0, -1, 0.3);
  run(g, (b) => knock(g, b));
  const turn = settle(g, () => 0.5); // Бүк
  ok(turn.score === 0, 'miss scores 0');
  finish(g);
  ok(g.throws === 4 && g.chain === 0, 'miss costs a throw and breaks the chain');
}

// 4. the bot: tries aims on a copy of the world and takes the best one, like a careful player
function botThrow(g, rand, tries) {
  const s = saka(g.w);
  if (!tries) {
    // an ordinary player: picks a bone and throws at it hard, without thinking ahead
    const live = g.w.bodies.filter((b) => b.kind === 'asyk' && !b.out);
    const aim = live[Math.floor(rand() * live.length)];
    return { dx: aim.x - s.x + (rand() - 0.5) * 10, dy: aim.y - s.y, pw: 0.45 + rand() * 0.4 };
  }
  let best = null;
  for (let i = 0; i < tries; i++) {
    const live = g.w.bodies.filter((b) => b.kind === 'asyk' && !b.out);
    const aim = live[Math.floor(rand() * live.length)];
    const dx = aim.x - s.x + (rand() - 0.5) * 6;
    const dy = aim.y - s.y + (rand() - 0.5) * 6;
    const pw = 0.35 + rand() * 0.6;
    const copy = newKon(g.k, g.seed);
    copy.w.bodies = g.w.bodies.map((b) => ({ ...b }));
    copy.w.rand = rng((rand() * 1e9) | 0);
    copy.chain = g.chain;
    startThrow(copy);
    const l = Math.hypot(dx, dy);
    throwFromHand(copy, dx / l, dy / l, pw);
    run(copy, (b) => knock(copy, b));
    const v = copy.turn.chips + (copy.turn.knocked ? 1000 : 0);
    if (!best || v > best.v) best = { v, dx, dy, pw };
  }
  // a hand is not a machine: the real throw wobbles a bit
  return { dx: best.dx + (rand() - 0.5) * 1.5, dy: best.dy, pw: best.pw * (0.96 + rand() * 0.08) };
}

function playKon(k, seed, tries) {
  const rand = rng(seed * 31 + 5);
  const g = newKon(k, seed);
  while (!g.result) {
    const a = botThrow(g, rand, tries);
    startThrow(g);
    const l = Math.hypot(a.dx, a.dy);
    throwFromHand(g, a.dx / l, a.dy / l, a.pw);
    run(g, (b) => knock(g, b));
    settle(g);
    finish(g);
  }
  return g;
}

for (const [label, tries] of [['ordinary', 0], ['careful', 12]]) {
  const line = [];
  for (let k = 1; k <= 6; k++) {
    let wins = 0;
    let sum = 0;
    const N = 30;
    for (let i = 0; i < N; i++) {
      const g = playKon(k, 1000 + i, tries);
      if (g.result === 'win') wins++;
      sum += g.score;
    }
    line.push(`кон ${k} (цель ${target(k)}): побед ${Math.round((wins / N) * 100)}%, ср. ${Math.round(sum / N)}`);
  }
  console.log(label + ':\n  ' + line.join('\n  '));
}

// 5. a duel with the aga: turns alternate, both use their throws, someone wins
{
  let wins = 0;
  const N = 12;
  for (let i = 0; i < N; i++) {
    const g = newKon(1, 500 + i, { duel: { aga: 'erlan', throws: 5 }, wind: i % 2 ? 8 : 0 });
    const rand = rng(77 + i);
    let who = 'me';
    let guard = 0;
    while (!g.result && guard++ < 60) {
      startThrow(g, who);
      if (who === 'aga') {
        const p = agaPlan(g, rand, 0.7);
        throwFromHand(g, p.ux, p.uy, p.power, AWAY);
      } else {
        const a = botThrow(g, rand, 8);
        const l = Math.hypot(a.dx, a.dy);
        throwFromHand(g, a.dx / l, a.dy / l, a.pw);
      }
      run(g, (b) => knock(g, b));
      settle(g);
      finish(g);
      who = nextThrower(g, who);
    }
    ok(g.result === 'win' || g.result === 'lose', 'duel ends with a result');
    if (g.result === 'win') wins++;
  }
  console.log(`duel vs aga (skill 0.7): careful player wins ${wins} of ${N}`);
}

console.log(fails ? `${fails} failed` : 'all checks passed');
process.exit(fails ? 1 : 0);
