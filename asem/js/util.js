export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeIn = (a, b, k) => a + (b - a) * k * k;
export const easeInOut = (a, b, k) => a + (b - a) * (-Math.cos(k * Math.PI) / 2 + 0.5);
export const wrap = (v, max) => ((v % max) + max) % max;
export const fogAt = (d, density) => 1 / Math.exp(d * d * density);
export const overlap = (x1, w1, x2, w2) => !(x1 + w1 / 2 < x2 - w2 / 2 || x1 - w1 / 2 > x2 + w2 / 2);

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// the same few colour pairs are mixed for every sprite on every frame, so remember them
const mixed = new Map();
export function mix(a, b, k) {
  const key = a + b + k;
  let out = mixed.get(key);
  if (out) return out;
  const x = hex(a);
  const y = hex(b);
  const to = (v) => Math.round(v).toString(16).padStart(2, '0');
  out = '#' + to(lerp(x[0], y[0], k)) + to(lerp(x[1], y[1], k)) + to(lerp(x[2], y[2], k));
  if (mixed.size > 4000) mixed.clear();
  mixed.set(key, out);
  return out;
}

export function rgba(c, a) {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}

// on a portal (js/boot.js) saves go to its Data module, which has the same getItem/setItem
const box = () => window.ASEM_DATA || localStorage;

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
    try { box().setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  },
};

export function roundRect(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}
