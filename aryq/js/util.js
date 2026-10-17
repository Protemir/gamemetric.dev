export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

// small deterministic random, so a valley with the same seed is the same valley
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// smooth value noise in -1..1 over a W×H grid, one random knot every `step` cells
export function valueNoise(rand, W, H, step) {
  const kw = Math.ceil(W / step) + 2;
  const kh = Math.ceil(H / step) + 2;
  const knots = Array.from({ length: kw * kh }, () => rand() * 2 - 1);
  const s = (t) => t * t * (3 - 2 * t);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fx = x / step, fy = y / step;
      const ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = s(fx - ix), ty = s(fy - iy);
      const k = (i, j) => knots[(iy + j) * kw + ix + i];
      out[y * W + x] = lerp(lerp(k(0, 0), k(1, 0), tx), lerp(k(0, 1), k(1, 1), tx), ty);
    }
  }
  return out;
}

// on a portal (js/boot.js) saves go to its Data module, which has the same getItem/setItem
const box = () => window.ARYQ_DATA || localStorage;

export const store = {
  get(key, fallback) {
    try {
      const raw = box().getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      box().setItem(key, JSON.stringify(value));
    } catch {
      /* private mode */
    }
  },
};

export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}
