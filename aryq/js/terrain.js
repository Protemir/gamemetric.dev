import { rng, valueNoise, clamp } from './util.js';

// A mountain valley seen from above: the glacier is on the top rows, the ground falls about
// one unit per row, and both sides of the valley rise away from the river that winds down the middle.
// valley shapes: how steep the sides are, how much the river winds, how hilly the slopes are
// (bumps), how far the river keeps to one side (lean), how much the glacier gives (melt) and
// how green or rocky it looks. Until 18.10 the three differed only a little in side and wind
// ("they all look the same"); games begun before that keep that ground (gen 1).
export const VALLEYS = {
  mountain: { side: 0.4, wind: 0.14, bumps: 2.1, lean: 0, melt: 1, green: 0.9, rock: 1.35 },
  wide: { side: 0.22, wind: 0.26, bumps: 0.9, lean: 0, melt: 1.15, green: 1.8, rock: 0.5 },
  gorge: { side: 0.72, wind: 0.05, bumps: 1.2, lean: 0.27, melt: 0.85, green: 0.7, rock: 1.6 },
};
const GEN1 = {
  mountain: { side: 0.42, wind: 0.16, bumps: 1, lean: 0 },
  wide: { side: 0.3, wind: 0.2, bumps: 1, lean: 0 },
  gorge: { side: 0.58, wind: 0.1, bumps: 1, lean: 0 },
};
export const GEN = 2;

export function makeValley(W, H, seed, kind = 'mountain', gen = GEN) {
  const shape = (gen === 1 ? GEN1 : VALLEYS)[kind] || VALLEYS.mountain;
  const rand = rng(seed);
  const big = valueNoise(rand, W, H, 6);
  const small = valueNoise(rand, W, H, 3);
  const ph1 = rand() * Math.PI * 2;
  const ph2 = rand() * Math.PI * 2;
  const side = ph1 < Math.PI ? -1 : 1; // which bank of the gorge the river keeps to
  const mid = (y) => W / 2 + side * shape.lean * W + Math.sin(y * 0.2 + ph1) * W * shape.wind + Math.sin(y * 0.55 + ph2) * W * 0.05;

  const h = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x - mid(y));
      h[y * W + x] = (H - y) + shape.side * Math.pow(d, 1.3) + big[y * W + x] * 1.5 * shape.bumps + small[y * W + x] * 0.5;
    }
  }

  // the river: from the glacier straight down the valley floor, 4-connected
  const river = [];
  let x = clamp(Math.round(mid(0)), 2, W - 3);
  for (let y = 0; y < H; y++) {
    const tx = clamp(Math.round(mid(y)), 2, W - 3);
    if (y > 0) river.push(y * W + x);
    while (x !== tx) {
      x += Math.sign(tx - x);
      river.push(y * W + x);
    }
    if (y === 0) river.push(y * W + x);
  }
  return { h, river };
}
