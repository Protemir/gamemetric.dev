import { roundRect } from './util.js';

// Small drawing helpers shared by the fighters, props and effects.

export const TAU = Math.PI * 2;
export { roundRect };

export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
}

export function seg(c, a, b, w, color) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.stroke();
}

export function dot(c, p, r, color) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(p[0], p[1], r, 0, TAU);
  c.fill();
}

export const along = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
export const dirOf = (ang) => [Math.sin(ang), Math.cos(ang)];

export function boot(c, foot, shinAng, color, big = 1) {
  // the foot points forward, at a right angle to the shin
  const a = shinAng - Math.PI / 2;
  const d = [Math.sin(a + Math.PI), Math.cos(a + Math.PI)];
  c.save();
  c.translate(foot[0], foot[1]);
  c.rotate(Math.atan2(d[1], d[0]));
  c.fillStyle = color;
  roundRect(c, -6 * big, -6, 22 * big, 11, 5);
  c.fill();
  c.restore();
}

// two horns curling outwards from a short stem, mirror-symmetric (қошқар мүйіз)
export function ramHorns(c, k) {
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(0, -4 * k);
    c.bezierCurveTo(0, -14 * k, s * 12 * k, -17 * k, s * 14 * k, -10 * k);
    c.bezierCurveTo(s * 15 * k, -5 * k, s * 9 * k, -4 * k, s * 9 * k, -8.5 * k);
    c.stroke();
  }
}

export function star(c, x, y, r, color) {
  c.fillStyle = color;
  c.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k * Math.PI) / 5 - Math.PI / 2;
    const rr = k % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

export function baursakAt(c, x, y, spin) {
  c.save();
  c.translate(x, y);
  c.rotate(spin);
  c.fillStyle = '#d98a2b';
  roundRect(c, -14, -12, 28, 24, 10);
  c.fill();
  c.fillStyle = '#f2b354';
  roundRect(c, -11, -10, 20, 16, 8);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath();
  c.ellipse(-4, -5, 4, 2.5, -0.5, 0, TAU);
  c.fill();
  c.restore();
}

// eyes, brows, nose, cheek and mouth, in head space (facing right, radius r)
export function face(c, r, md, talking, f, opt = {}) {
  const ink = '#1d1310';
  const ex0 = opt.eyes || [0.22, 0.7];
  const eyes = [[r * ex0[0], -r * 0.02], [r * ex0[1], -r * 0.02]];
  c.strokeStyle = ink;
  c.fillStyle = ink;
  c.lineCap = 'round';
  if (md === 'x') {
    c.lineWidth = 2;
    for (const [ex, ey] of eyes) {
      c.beginPath();
      c.moveTo(ex - 3.5, ey - 3.5);
      c.lineTo(ex + 3.5, ey + 3.5);
      c.moveTo(ex + 3.5, ey - 3.5);
      c.lineTo(ex - 3.5, ey + 3.5);
      c.stroke();
    }
  } else if (md === 'spin') {
    c.lineWidth = 1.5;
    const t = (f.t || 0) * 0.3;
    for (const [ex, ey] of eyes) {
      c.beginPath();
      for (let k = 0; k < 18; k++) {
        const a = t + k * 0.7;
        const rr = 0.4 + k * 0.22;
        c.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr);
      }
      c.stroke();
    }
  } else if (md === 'hurt' || md === 'blush') {
    c.lineWidth = 2;
    for (const [ex, ey] of eyes) {
      c.beginPath();
      c.moveTo(ex - 3.5, ey - 3);
      c.lineTo(ex + 1.5, ey);
      c.lineTo(ex - 3.5, ey + 3);
      c.stroke();
    }
  } else if (md === 'happy') {
    c.lineWidth = 2;
    for (const [ex, ey] of eyes) {
      c.beginPath();
      c.arc(ex, ey + 1.5, 3.2, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    }
  } else if (md === 'sleep') {
    c.lineWidth = 2;
    for (const [ex, ey] of eyes) {
      c.beginPath();
      c.arc(ex, ey - 1, 3.2, Math.PI * 0.15, Math.PI * 0.85);
      c.stroke();
    }
  } else {
    for (const [ex, ey] of eyes) dot(c, [ex, ey], md === 'sad' ? 2 : 2.4, ink);
    if (opt.lashes) {
      c.lineWidth = 1.4;
      for (const [ex, ey] of eyes) {
        c.beginPath();
        c.moveTo(ex + 1.5, ey - 2);
        c.lineTo(ex + 4, ey - 4.5);
        c.stroke();
      }
    }
  }
  // brows
  c.lineWidth = opt.brow || 2.2;
  const angry = md === 'angry' ? 1 : md === 'sad' || md === 'blush' ? -1 : 0;
  if (opt.unibrow) {
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(eyes[0][0] - 5, eyes[0][1] - 7 - angry * 2);
    c.quadraticCurveTo((eyes[0][0] + eyes[1][0]) / 2, eyes[0][1] - 4 + angry * 2, eyes[1][0] + 5, eyes[1][1] - 7 - angry * 2);
    c.stroke();
  } else {
    for (const [ex, ey] of eyes) {
      c.beginPath();
      c.moveTo(ex - 4, ey - 6.5 - angry * 1.5);
      c.lineTo(ex + 4, ey - 6.5 + angry * 1.5);
      c.stroke();
    }
  }
  // nose and cheek
  dot(c, [r * 0.98, r * 0.18], r * (opt.nose || 0.16), shade(f.pal.skin, 0.9));
  c.fillStyle = md === 'blush' ? 'rgba(230, 60, 60, 0.6)' : 'rgba(232, 96, 96, 0.28)';
  c.beginPath();
  c.arc(r * 0.45, r * 0.4, r * (md === 'blush' ? 0.28 : 0.18), 0, TAU);
  c.fill();
  // mouth
  const mx = r * 0.66;
  const my = r * 0.58;
  c.fillStyle = '#5a1c1c';
  if (talking || md === 'hurt' || md === 'angry' || md === 'x') {
    c.beginPath();
    c.ellipse(mx, my, md === 'angry' ? 4.5 : 3.6, talking || md === 'hurt' ? 4.2 : 2.6, 0, 0, TAU);
    c.fill();
    if (opt.goldTooth && talking) dot(c, [mx + 1.5, my - 2], 1.4, '#ffd25a');
  } else if (md === 'sleep') {
    dot(c, [mx, my], 2.2, '#5a1c1c');
  } else {
    c.strokeStyle = '#5a1c1c';
    c.lineWidth = 2;
    c.beginPath();
    if (md === 'sad' || md === 'blush') c.arc(mx, my + 4, 4, Math.PI * 1.15, Math.PI * 1.85);
    else c.arc(mx, my - 2, 4, Math.PI * 0.15, Math.PI * 0.85);
    c.stroke();
  }
}
