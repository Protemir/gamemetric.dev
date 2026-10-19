// A careless player against the rules: random strokes (also into bad cells), undo, gates, save and
// load in the middle of a game, gifts, all valleys and both ground generations. After every step
// the invariants are checked; any break prints the seed and the step.
//   node aryq/tools/chaos.mjs [games=24] [years=3]
import * as S from '../js/sim.js';

const games = +(process.argv[2] || 24);
const years = +(process.argv[3] || 3);
const W = +(process.env.ARYQ_W || 16), H = +(process.env.ARYQ_H || 26); // the game is 16×26 (main.js)
const KEEP = process.argv.includes('--keep');
let bugs = 0;
const slow = [];
const bug = (ctx, msg) => {
  bugs++;
  if (bugs <= 25) console.log('BUG', ctx, msg);
};
const timed = (name, ctx, f) => {
  const t = performance.now();
  const r = f();
  const ms = performance.now() - t;
  if (ms > 150) slow.push(`${name} ${ms.toFixed(0)} ms ${ctx}`);
  return r;
};

function invariants(g, ctx) {
  const n = W * H;
  for (let a = 0; a < n; a++) {
    for (const b of g.out[a]) if (!(g.bed[b] < g.bed[a])) return bug(ctx, `uphill ${a}->${b}`);
    if (S.isWater(g, a) && !Number.isFinite(g.bed[a])) return bug(ctx, `water without bed ${a}`);
    if (!Number.isFinite(g.flow[a]) || g.flow[a] < -1e-9) return bug(ctx, `bad flow ${a} ${g.flow[a]}`);
    if (g.kind[a] === S.CANAL && !(g.from[a] >= 0 && S.isWater(g, g.from[a]))) return bug(ctx, `canal ${a} hangs from ${g.from[a]}`);
    if (g.objAt[a] && S.isWater(g, a)) return bug(ctx, `object on water ${a}`);
  }
  for (const o of g.objects) if (g.objAt[o.y * W + o.x] !== o) return bug(ctx, `objAt out of step ${o.x},${o.y}`);
  if (g.dig < 0) return bug(ctx, `dig ${g.dig}`);
  if (g.cur) return bug(ctx, 'a stroke left open');
  S.flowStep(g);
  const into = S.sourceFlow(g.day, g.year, g.melt);
  let used = 0, spilt = 0;
  for (const o of g.objects) used += o.got;
  for (let i = 0; i < n; i++) spilt += g.spill[i];
  const diff = into - used - spilt - g.gone - g.soak;
  if (Math.abs(diff) > 1e-3) return bug(ctx, `water does not add up ${diff.toFixed(4)}`);
  for (let i = 0; i < n; i++) if (g.spill[i] > 0.02 && g.out[i].some((t) => !g.gate[t])) return bug(ctx, `spill at ${i} with a way on`);
}

// flows are saved rounded to 0.001, so what an orchard drank may differ in the last digits
// and 'got' is recounted from those rounded flows on load, so it is left out, as is the tap of an
// orchard that is short: it picks its cell again on the first step (a loaded twin plays on the same,
// checked 19.10 with new orchards held back)
const round = (k, v) => (k === 'got' || k === 'tap' ? undefined : typeof v === 'number' ? Math.round(v * 1000) / 1000 : v);
const same = (a, b) => JSON.stringify({ ...a, flow: null }, round) === JSON.stringify({ ...b, flow: null }, round);

let steps = 0;
for (let k = 0; k < games; k++) {
  for (const valley of ['wide', 'mountain', 'gorge']) {
    for (const gen of [2, 1]) {
      const seed = 7000 + k;
      let g = S.newGame(W, H, seed, valley, gen);
      let r = (seed * 2654435761) >>> 0;
      const rnd = () => ((r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296);
      const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
      let t = 0;
      while (!g.over && t < years * S.YEAR_DAYS) {
        const ctx = `seed ${seed} ${valley} gen${gen} y${g.year} d${g.day.toFixed(1)}`;
        const act = rnd();
        try {
          if (act < 0.25) {
            // a planned canal to a thirsty object, like a careful player
            const o = pick(g.objects.filter((x) => x.s < 0.9).concat([null]));
            if (o) {
              const p = timed('planFor', ctx, () => S.planFor(g, o));
              if (p && p.cells.length && p.cells.length <= g.dig) {
                S.startStroke(g, p.from);
                for (const c of p.cells) if (!S.extend(g, c).ok) break;
                S.endStroke(g);
              }
            }
          } else if (act < 0.45) {
            // a shaky finger: any neighbour, any cell, even outside the valley
            const water = [];
            for (let i = 0; i < W * H; i++) if (S.isWater(g, i)) water.push(i);
            if (S.startStroke(g, pick(water))) {
              let c = g.cur.from;
              for (let s = 0; s < 3 + rnd() * 12; s++) {
                const d = pick([1, -1, W, -W, W + 1, 2, -2 * W, 999999, -5]);
                const r2 = S.extend(g, c + d);
                if (r2.ok && !r2.back) c = c + d;
              }
              S.endStroke(g);
            }
          } else if (act < 0.55) {
            // a drag to a random place: the shortest way, like the finger magnet does
            const water = [];
            for (let i = 0; i < W * H; i++) if (S.isWater(g, i)) water.push(i);
            const goal = Math.floor(rnd() * W * H);
            const way = timed('route', ctx, () => S.route(g, [pick(water)], (c) => c === goal));
            if (way && way.cells.length <= g.dig) {
              S.startStroke(g, way.from);
              for (const c of way.cells) if (!S.extend(g, c).ok) break;
              S.endStroke(g);
            }
          } else if (act < 0.62) {
            S.undo(g);
          } else if (act < 0.68) {
            const canals = [];
            for (let i = 0; i < W * H; i++) if (g.kind[i] === S.CANAL) canals.push(i);
            if (canals.length) S.toggleGate(g, pick(canals));
          } else if (act < 0.72) {
            // save in the middle of the game and play on from the loaded copy
            const d = JSON.parse(JSON.stringify(S.save(g)));
            const g2 = S.load(d);
            const d2 = S.save(g2);
            if (!same(d, d2)) { const keys = Object.keys(d).filter((k) => k !== 'flow' && JSON.stringify(d[k], round) !== JSON.stringify(d2[k], round)); let detail = keys.join(','); if (keys.includes('strokes')) { const i = d.strokes.findIndex((x, j) => JSON.stringify(x) !== JSON.stringify(d2.strokes[j])); detail += ' stroke#' + i + ' ' + JSON.stringify(d.strokes[i]) + ' -> ' + JSON.stringify(d2.strokes[i]) + ' (' + d.strokes.length + '/' + d2.strokes.length + ')'; } if (keys.includes('objects')) { const i = d.objects.findIndex((x, j) => JSON.stringify(x) !== JSON.stringify(d2.objects[j])); detail += ' obj ' + JSON.stringify(d.objects[i]) + ' -> ' + JSON.stringify(d2.objects[i]); } bug(ctx, 'save -> load -> save differs: ' + detail); }
            for (let i = 0; i < W * H; i++) if (g.kind[i] !== g2.kind[i]) { bug(ctx, `kind differs after load at ${i}`); break; }
            g = g2;
          }
          // keep the careless player alive so the later years, winter and a full valley are reached too
          if (KEEP) for (const o of g.objects) o.thirst *= 0.6;
          for (const ev of g.events.splice(0)) if (ev.type === 'year') S.reward(g, pick(S.REWARDS));
          const tapsBefore = g.day >= S.WINTER ? g.objects.map((o) => o.x + ',' + o.y + ':' + o.tap).filter(Boolean) : null;
          const yearBefore = g.year;
          timed('advance', ctx, () => S.advance(g, 0.25));
          // in winter nobody drinks, so a tap that hops is the water blinking (18.10)
          if (tapsBefore !== null && g.day >= S.WINTER && g.year === yearBefore && act >= 0.72 && g.objects.some((o) => { const was = tapsBefore.find((x) => x.startsWith(o.x + ',' + o.y + ':')); return was && was !== o.x + ',' + o.y + ':' + o.tap; })) bug(ctx, 'a tap hopped in winter')
          t += 0.25;
          steps++;
          invariants(g, ctx);
        } catch (e) {
          bug(ctx, 'exception ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | '));
          break;
        }
      }
    }
  }
}
console.log(`${steps} steps, ${bugs} bugs, ${slow.length} slow calls`);
for (const s of slow.slice(0, 10)) console.log('SLOW', s);
process.exit(bugs ? 1 : 0);
