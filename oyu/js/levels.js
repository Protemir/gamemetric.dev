// Levels are generated from a known solution, so every level can be won:
// the picture is peeled lap by lap by an ideal player, each lap becomes a shooter
// with exactly the shots it needs, and the shooters are dealt into queues in that order.
// Any deal that keeps the order inside each queue still contains the solution;
// the player just has to find it, and the dock forgives a few wrong picks.
import { PICTURES, ornament, sample } from './pictures.js';
import { buildLanes, lap } from './game.js';
import { rng } from './util.js';

const AUTHORED = PICTURES.map((p) => p.id);

function specFor(i) {
  // every third level is a generated ornament; the rest walk through the drawn pictures
  const isOrnament = i >= 3 && i % 3 === 0;
  let picture;
  if (isOrnament) picture = ornament(101 + i * 37);
  else {
    // minus the ornament levels before this one
    const k = i - (i >= 3 ? Math.floor(i / 3) : 0);
    picture = PICTURES[k % PICTURES.length];
  }
  const sizes = [8, 10, 10, 10, 12, 12, 12, 14, 14, 14, 16, 16, 16, 16, 18, 18, 18, 18, 20, 20];
  const N = i < sizes.length ? sizes[i] : 20 + (i % 3);
  const queues = i === 0 ? 1 : i < 4 ? 2 : i < 12 ? 3 : i % 4 === 0 ? 4 : 3;
  const cap = Math.min(48, 16 + i * 2);
  // mistakes get more expensive: fewer places in the dock and on the belt
  const slots = i < 5 ? 5 : i < 15 ? 4 : 3;
  const beltCap = i < 5 ? 5 : i < 15 ? 4 : 3;
  return { picture, N, queues, cap, slots, beltCap };
}

export function buildLevel(i) {
  const spec = specFor(i);
  const { grid, palette, W, H } = sample(spec.picture, spec.N);
  const r = rng(7919 * (i + 1));
  const work = Int8Array.from(grid);
  const { lanes } = buildLanes(W, H, 1.5);
  let left = work.reduce((n, c) => n + (c >= 0 ? 1 : 0), 0);
  const solution = [];
  while (left > 0) {
    const options = [];
    for (let c = 0; c < palette.length; c++) {
      const n = lap(Int8Array.from(work), W, H, lanes, c, spec.cap).length;
      if (n) options.push({ c, w: n * n * (0.4 + r()) });
    }
    let pick = r() * options.reduce((s, o) => s + o.w, 0);
    let chosen = options[0];
    for (const o of options) {
      pick -= o.w;
      if (pick <= 0) {
        chosen = o;
        break;
      }
    }
    const taken = lap(work, W, H, lanes, chosen.c, spec.cap);
    left -= taken.length;
    // a tiny follow-up of the same color joins the previous shooter
    const prev = solution[solution.length - 1];
    if (prev && prev.color === chosen.c && prev.ammo + taken.length <= spec.cap) prev.ammo += taken.length;
    else solution.push({ color: chosen.c, ammo: taken.length });
  }
  const queues = Array.from({ length: spec.queues }, () => []);
  solution.forEach((s, k) => {
    // the first shooters are spread over all queues, so the start is never a dead end
    const q = k < spec.queues ? k : Math.floor(r() * spec.queues);
    queues[q].push(s);
  });
  return {
    index: i,
    picture: spec.picture,
    name: spec.picture.name,
    W,
    H,
    grid,
    palette,
    queues,
    slots: spec.slots,
    beltCap: spec.beltCap,
    shooters: solution.length,
  };
}

export const LEVEL_COUNT = 60;
export { AUTHORED };
