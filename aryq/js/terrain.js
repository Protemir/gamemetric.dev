import { rng, valueNoise, clamp } from './util.js';

// A mountain valley seen from above: the glacier is on the top rows, the ground falls about
// one unit per row, and both sides of the valley rise away from the river that winds down the middle.
export function makeValley(W, H, seed) {
  const rand = rng(seed);
  const big = valueNoise(rand, W, H, 6);
  const small = valueNoise(rand, W, H, 3);
  const ph1 = rand() * Math.PI * 2;
  const ph2 = rand() * Math.PI * 2;
  const mid = (y) => W / 2 + Math.sin(y * 0.2 + ph1) * W * 0.16 + Math.sin(y * 0.55 + ph2) * W * 0.05;

  const h = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x - mid(y));
      h[y * W + x] = (H - y) + 0.42 * Math.pow(d, 1.3) + big[y * W + x] * 1.5 + small[y * W + x] * 0.5;
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
