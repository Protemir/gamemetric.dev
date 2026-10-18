// Plays whole seasons in Node with a few simple players and prints what comes out:
//   node sybys/tools/check.mjs [games]
// The point: doing nothing must lose, a careful player must be able to win, and force must cost something.
import * as S from '../js/sim.js';

const N = +(process.argv[2] || 40);
if (process.env.TUNE) Object.assign(S.TUNE, JSON.parse(process.env.TUNE));
const DT = 0.1;

function bestWordTarget(g) {
  let best = -1, bs = -Infinity;
  for (const r of g.map.regions) {
    if (r.tribe < 0) continue;
    // pastures still undecided and willing to listen, plus their neighbours who will hear it next
    const rec = S.receptivity(g, r.id);
    let s = (1 - g.t[r.id]) * (0.5 + rec) - g.m[r.id] * 0.8;
    for (const e of r.nb) if (g.map.regions[e.to].tribe >= 0) s += (1 - g.t[e.to]) * 0.15 * S.receptivity(g, e.to);
    const v = g.vote;
    if (s > bs) { bs = s; best = r.id; }
  }
  return best;
}

const PLAYERS = {
  idle: { act() {}, ev: { horse: 'karasai', well: 'strong', caravan: 'arrest', letter: 'demand', army: 'agree', drought: 'neighbor', plot: 'trap', truth: 'bury' }, end: 'council', catch: 0 },
  word: {
    act(g) { if (S.canAct(g, 'word')) S.act(g, 'word', bestWordTarget(g)); },
    ev: { horse: 'council', well: 'share', caravan: 'pay', letter: 'trust', army: 'mixed', drought: 'share', plot: 'amnesty', truth: 'aria' }, end: 'council', catch: 0.3,
  },
  careful: {
    act(g) {
      // Aria to a pasture where a forged order landed (or to the hideout once known)
      if (S.canAct(g, 'aria')) {
        const t = g.lairKnown && !g.clues.some((c) => c.kind === 'lair') ? g.lair : [...g.marks].find((i) => !g.found.has(i));
        if (t != null && g.map.regions[t].tribe >= 0) { S.act(g, 'aria', t); return; }
      }
      // Zaltyr watches the roads out of the hideout once it is known, else the coldest great aul
      if (S.canAct(g, 'zaltyr')) {
        const k = [0, 1, 2].sort((a, b) => S.tribeTrust(g, a) - S.tribeTrust(g, b))[0];
        S.act(g, 'zaltyr', g.lairKnown ? g.lairShown : g.map.capitals[k]);
        return;
      }
      if (g.horses >= 2 && S.canAct(g, 'word')) S.act(g, 'word', bestWordTarget(g));
    },
    ev: { horse: 'council', well: 'aria', caravan: 'scouts', letter: 'trust', army: 'tribes', drought: 'sarman', plot: 'proof', truth: 'publish' }, end: 'reveal', catch: 0.6,
  },
  force: {
    act(g) {
      if (S.canAct(g, 'karasai')) {
        const r = g.map.regions.filter((x) => x.tribe >= 0).sort((a, b) => g.t[a.id] - g.t[b.id])[0];
        S.act(g, 'karasai', r.id);
      } else if (g.horses >= 3 && S.canAct(g, 'word')) S.act(g, 'word', bestWordTarget(g));
    },
    ev: { horse: 'karasai', well: 'strong', caravan: 'arrest', letter: 'demand', army: 'agree', drought: 'war', plot: 'trap', truth: 'blackmail' }, end: 'force', catch: 0.3,
  },
};

for (const [name, P] of Object.entries(PLAYERS)) {
  const ends = {}, yes = [0, 0, 0, 0], council = [0, 0, 0, 0];
  let unity = 0, clues = 0, caught = 0, lies = 0, actions = 0;
  for (let s = 1; s <= N; s++) {
    const g = S.newGame(s * 101);
    const seen = new Set();
    let thinkT = 0;
    while (g.phase !== 'end') {
      if (g.phase === 'event') { S.choose(g, P.ev[g.event.id]) || S.choose(g, S.eventChoices(g).find((c) => c.ok).key); continue; }
      if (g.phase === 'council') { council[g.vote.yes]++; S.nextSeason(g); continue; }
      if (g.phase === 'kurultai') {
        const ok = S.choicesAtKurultai(g).find((c) => c.key === P.end && c.ok);
        S.finish(g, ok ? P.end : 'council');
        break;
      }
      S.step(g, DT);
      // a person notices a forged order on the road now and then
      // raiders and the night riders: a person reacts to these, more or less quickly
      for (const r of [...g.riders]) {
        if (r.kind === 'raider' && !seen.has(r.id) && r.seg + r.p > 0.3) { seen.add(r.id); if (g.rand() < P.catch * 1.2) S.intercept(g, r.id); }
        if (r.kind === 'envoy' && r.killer && !seen.has(r.id) && r.seg + r.p > 0.4) { seen.add(r.id); if (g.rand() < P.catch + 0.3) S.intercept(g, r.id); }
      }
      for (const r of [...g.riders]) {
        if (r.kind !== 'false' || seen.has(r.id) || r.seg + r.p < 0.6) continue;
        seen.add(r.id);
        lies++;
        // a rider Zaltyr has marked is easy to spot
        if (g.rand() < (r.seen ? Math.max(P.catch, 0.85) : P.catch)) S.intercept(g, r.id);
      }
      if ((thinkT -= DT) <= 0) { thinkT = 1.2; P.act(g); }
    }
    ends[g.result.end] = (ends[g.result.end] || 0) + 1;
    yes[g.result.yes]++;
    unity += g.result.score;
    clues += g.result.tc;
    caught += g.caught;
    actions += g.acted;
  }
  console.log(`${name.padEnd(8)} unity ${(unity / N).toFixed(0)}%  summer ${council.join('/')}  final 0/1/2/3: ${yes.join('/')}  true clues ${(clues / N).toFixed(1)}  forged ${(lies / N).toFixed(1)} (caught ${(caught / N).toFixed(1)})  actions ${(actions / N).toFixed(0)}  ends ${JSON.stringify(ends)}`);
}
