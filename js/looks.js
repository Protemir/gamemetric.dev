import { TAU, shade, seg, dot, along, dirOf, boot, ramHorns, baursakAt, face, roundRect } from './paint.js';

// What every fighter looks like. Each look draws limbs, body and head in fighter space
// (facing right, hip at the origin, y down). `tint` darkens the far side.

const fist = (f) => ['attack', 'throwing', 'special', 'taunt'].includes(f.state);

function sleeves(c, J, side, color, w1 = 13, w2 = 11.5) {
  seg(c, J.shoulder, J['elbow' + side], w1, color);
  seg(c, J['elbow' + side], J['hand' + side], w2, color);
}

function plainLeg(c, J, side, pants, boots, tint, w = 16, big = 1.2) {
  const knee = J['knee' + side];
  const foot = J['foot' + side];
  seg(c, J.hip, knee, w, tint(pants));
  seg(c, knee, along(knee, foot, 0.35), w - 2, tint(pants));
  seg(c, along(knee, foot, 0.3), foot, w - 1.5, tint(boots));
  boot(c, foot, J.angles['sh' + side], tint(boots), big);
}

// a robe from the shoulders down to the knees, trim along the front and the hem
function robe(c, J, pal, b, opt = {}) {
  const { hip, shoulder } = J;
  const t = J.angles.torso;
  const perp = [-Math.cos(t), Math.sin(t)];
  const w = b.w / 2;
  const len = opt.len ?? 0.62;
  const hemN = along(hip, J.kneeN, len);
  const hemF = along(hip, J.kneeF, len);
  c.fillStyle = opt.color || pal.robe;
  c.beginPath();
  c.moveTo(shoulder[0] - perp[0] * w * 0.9, shoulder[1] - perp[1] * w * 0.9);
  c.lineTo(shoulder[0] + perp[0] * w, shoulder[1] + perp[1] * w);
  c.lineTo(hip[0] + perp[0] * (w + 3), hip[1] + perp[1] * (w + 3));
  c.lineTo(hemN[0] + perp[0] * 10, hemN[1] + 6);
  c.lineTo(hemF[0] - perp[0] * 12, hemF[1] + 6);
  c.lineTo(hip[0] - perp[0] * (w + 2), hip[1] - perp[1] * (w + 2));
  c.closePath();
  c.fill();
  if (opt.trim !== false) {
    c.strokeStyle = opt.trimColor || pal.trim;
    c.lineWidth = 3.5;
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(shoulder[0] + perp[0] * (w - 4), shoulder[1] + perp[1] * (w - 4));
    c.lineTo(hip[0] + perp[0] * (w - 1), hip[1] + perp[1] * (w - 1));
    c.lineTo(hemN[0] + perp[0] * 8, hemN[1] + 4);
    c.lineTo(hemF[0] - perp[0] * 10, hemF[1] + 4);
    c.stroke();
  }
  return { perp, w };
}

function belt(c, J, perp, w, color, buckle, at = 0.16, width = 7) {
  const p = along(J.hip, J.shoulder, at);
  seg(c, [p[0] - perp[0] * (w + 2), p[1] - perp[1] * (w + 2)], [p[0] + perp[0] * (w + 2), p[1] + perp[1] * (w + 2)], width, color);
  if (buckle) dot(c, [p[0] + perp[0] * (w - 3), p[1] + perp[1] * (w - 3)], 4, buckle);
  return p;
}

// a long dress that flares to mid-shin, with a vest on top (Apa, Akyn)
function dress(c, J, pal, b, f, slim) {
  const { hip, shoulder } = J;
  const t = J.angles.torso;
  const perp = [-Math.cos(t), Math.sin(t)];
  const w = b.w / 2;
  const hemN = along(J.kneeN, J.footN, 0.45);
  const hemF = along(J.kneeF, J.footF, 0.45);
  const flare = (f.state === 'dance' ? 6 : 0) + (slim ? 4 : 0);
  c.fillStyle = pal.robe;
  c.beginPath();
  c.moveTo(shoulder[0] - perp[0] * w * 0.85, shoulder[1] - perp[1] * w * 0.85);
  c.lineTo(shoulder[0] + perp[0] * w * 0.9, shoulder[1] + perp[1] * w * 0.9);
  c.quadraticCurveTo(hip[0] + perp[0] * (w + 8), hip[1] + perp[1] * (w + 8) - 10, hip[0] + perp[0] * (w + 4), hip[1] + perp[1] * (w + 4));
  c.lineTo(Math.max(hemN[0], hemF[0]) + 14 + flare, Math.max(hemN[1], hemF[1]) + 4);
  c.lineTo(Math.min(hemN[0], hemF[0]) - 14 - flare, Math.max(hemN[1], hemF[1]) + 4);
  c.lineTo(hip[0] - perp[0] * (w + 4), hip[1] - perp[1] * (w + 4));
  c.closePath();
  c.fill();
  seg(c, [Math.min(hemN[0], hemF[0]) - 12 - flare, Math.max(hemN[1], hemF[1])], [Math.max(hemN[0], hemF[0]) + 12 + flare, Math.max(hemN[1], hemF[1])], 3, pal.trim);
  const v0 = along(shoulder, hip, 0.05);
  const v1 = along(shoulder, hip, slim ? 0.85 : 1.05);
  c.fillStyle = pal.vest;
  c.beginPath();
  c.moveTo(v0[0] - perp[0] * w * 0.85, v0[1] - perp[1] * w * 0.85);
  c.lineTo(v0[0] + perp[0] * w * 0.55, v0[1] + perp[1] * w * 0.55);
  c.lineTo(v1[0] + perp[0] * w * 0.75, v1[1] + perp[1] * w * 0.75);
  c.lineTo(v1[0] - perp[0] * (w + 4), v1[1] - perp[1] * (w + 4));
  c.closePath();
  c.fill();
  c.strokeStyle = pal.trim;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(v0[0] + perp[0] * w * 0.55, v0[1] + perp[1] * w * 0.55);
  c.lineTo(v1[0] + perp[0] * w * 0.75, v1[1] + perp[1] * w * 0.75);
  c.stroke();
  for (let k = 1; k < 4; k++) dot(c, along([v0[0] + perp[0] * w * 0.5, v0[1] + perp[1] * w * 0.5], [v1[0] + perp[0] * w * 0.68, v1[1] + perp[1] * w * 0.68], k / 4), 2, pal.trim);
}

function dressLeg(c, J, side, pal, tint) {
  const knee = J['knee' + side];
  const foot = J['foot' + side];
  seg(c, J.hip, knee, 15, tint(pal.robe2));
  seg(c, knee, foot, 11, tint(pal.socks));
  boot(c, foot, J.angles['sh' + side], tint(pal.shoes), 1);
}

// ---------- batyr ----------

const batyr = {
  arm(c, J, side, pal, tint, f) {
    sleeves(c, J, side, tint(pal.robe));
    const el = J['elbow' + side];
    const hand = J['hand' + side];
    seg(c, along(el, hand, 0.78), along(el, hand, 0.86), 12.5, tint(pal.trim));
    dot(c, hand, fist(f) ? 7.5 : 6.5, tint(pal.skin));
    if (side === 'N') shield(c, el, hand, pal, f);
  },
  leg(c, J, side, pal, tint) {
    plainLeg(c, J, side, pal.pants, pal.boots, tint);
  },
  back(c, J, pal) {
    // the spear on the back, diagonally
    const t = J.angles.torso;
    const back = [Math.cos(t), -Math.sin(t)];
    const s0 = along(J.hip, J.shoulder, -0.1);
    const base = [s0[0] + back[0] * 12, s0[1] + back[1] * 12];
    const d = dirOf(t + 0.35);
    const tip = [base[0] + d[0] * 120, base[1] + d[1] * 120];
    seg(c, base, tip, 4, '#6b4424');
    const n = [d[1], -d[0]];
    c.fillStyle = pal.metal;
    c.beginPath();
    c.moveTo(tip[0] + d[0] * 22, tip[1] + d[1] * 22);
    c.lineTo(tip[0] + n[0] * 5, tip[1] + n[1] * 5);
    c.lineTo(tip[0] - n[0] * 5, tip[1] - n[1] * 5);
    c.closePath();
    c.fill();
    dot(c, tip, 4.5, pal.plume);
  },
  body(c, J, pal, b) {
    const { perp, w } = robe(c, J, pal, b);
    belt(c, J, perp, w, pal.belt, pal.trim);
    seg(c, along(J.shoulder, J.hip, 0.02), along(J.shoulder, J.hip, 0.12), 6, pal.robe2);
  },
  head(c, r, f, md, talking) {
    const pal = f.pal;
    dot(c, [0, 0], r, pal.skin);
    dot(c, [-r * 0.15, r * 0.08], r * 0.22, shade(pal.skin, 0.88));
    face(c, r, md, talking, f, { brow: 2.6 });
    moustache(c, r, pal.hair);
    // pointed helmet with a plume and a mail curtain at the back
    c.fillStyle = pal.metal2;
    c.beginPath();
    c.moveTo(-r * 1.05, -r * 0.05);
    c.quadraticCurveTo(-r * 1.15, r * 0.75, -r * 0.55, r * 0.95);
    c.lineTo(-r * 0.25, r * 0.55);
    c.lineTo(-r * 0.4, -r * 0.05);
    c.closePath();
    c.fill();
    c.fillStyle = pal.metal;
    c.beginPath();
    c.moveTo(-r * 1.08, -r * 0.08);
    c.quadraticCurveTo(-r * 1.0, -r * 1.05, -r * 0.05, -r * 1.95);
    c.quadraticCurveTo(r * 0.75, -r * 1.05, r * 1.08, -r * 0.18);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.moveTo(-r * 0.55, -r * 0.3);
    c.quadraticCurveTo(-r * 0.45, -r * 1.05, -r * 0.08, -r * 1.65);
    c.quadraticCurveTo(-r * 0.25, -r * 0.9, -r * 0.3, -r * 0.3);
    c.fill();
    seg(c, [-r * 1.08, -r * 0.1], [r * 1.08, -r * 0.2], 4.5, pal.trim);
    seg(c, [r * 0.62, -r * 0.2], [r * 0.66, r * 0.28], 3, pal.metal2);
    c.fillStyle = pal.plume;
    c.beginPath();
    c.moveTo(-r * 0.05, -r * 1.95);
    c.quadraticCurveTo(-r * 0.9, -r * 2.5, -r * 1.5, -r * 1.7);
    c.quadraticCurveTo(-r * 0.8, -r * 2.0, -r * 0.05, -r * 1.85);
    c.fill();
  },
};

function moustache(c, r, color, big = 1) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(r * 0.5, r * 0.36);
  c.quadraticCurveTo(r * 0.75, r * (0.36 - 0.14 * big), r * 1.02, r * 0.36);
  c.quadraticCurveTo(r * (1.02 + 0.04 * big), r * (0.36 + 0.26 * big), r * 0.88, r * (0.4 + 0.26 * big));
  c.quadraticCurveTo(r * 0.78, r * 0.45, r * 0.5, r * 0.5);
  c.closePath();
  c.fill();
}

function shield(c, el, hand, pal, f) {
  // raised to block, and held out in front during the shield charge
  const up = f.state === 'block' || f.state === 'blockstun' || (f.state === 'attack' && f.move && f.move.id === 'special2');
  const pos = along(el, hand, up ? 0.75 : 0.55);
  const r = up ? 27 : 24;
  c.save();
  c.translate(pos[0], pos[1]);
  c.scale(up ? 0.9 : 0.62, 1);
  dot(c, [0, 0], r, pal.shield);
  c.strokeStyle = pal.metal;
  c.lineWidth = 4;
  c.beginPath();
  c.arc(0, 0, r - 2, 0, TAU);
  c.stroke();
  c.strokeStyle = pal.trim;
  c.lineWidth = 2.4;
  c.lineCap = 'round';
  ramHorns(c, 0.95);
  c.save();
  c.scale(1, -1);
  ramHorns(c, 0.95);
  c.restore();
  dot(c, [0, 0], 6, pal.metal);
  dot(c, [-1.5, -1.5], 2.2, '#fff');
  c.restore();
}

// ---------- apa ----------

const apa = {
  arm(c, J, side, pal, tint, f) {
    sleeves(c, J, side, tint(pal.robe));
    const hand = J['hand' + side];
    dot(c, hand, 6.5, tint(pal.skin));
    if (side === 'N') {
      if (f.state === 'attack' && f.move && f.move.id === 'upper') kazan(c, hand, J.angles.faN);
      else ladle(c, hand, J.angles.faN, pal, f);
    }
    if (side === 'F' && f.state === 'special' && f.t < f.def.spec.s) baursakAt(c, hand[0], hand[1], 0);
  },
  leg: (c, J, side, pal, tint) => dressLeg(c, J, side, pal, tint),
  body(c, J, pal, b, f) {
    dress(c, J, pal, b, f, false);
  },
  head(c, r, f, md, talking) {
    const pal = f.pal;
    dot(c, [-r * 0.16, -r * 0.06], r * 1.2, pal.scarf);
    c.fillStyle = pal.scarf2;
    c.beginPath();
    c.moveTo(-r * 0.9, r * 0.6);
    c.lineTo(-r * 1.55, r * 1.35);
    c.lineTo(-r * 0.6, r * 1.1);
    c.closePath();
    c.fill();
    c.fillStyle = pal.skin;
    c.beginPath();
    c.ellipse(r * 0.2, r * 0.14, r * 0.8, r * 0.86, 0, 0, TAU);
    c.fill();
    c.fillStyle = pal.scarf;
    c.beginPath();
    c.ellipse(r * 0.05, -r * 0.62, r * 1.02, r * 0.46, 0.12, Math.PI, TAU);
    c.fill();
    seg(c, [-r * 0.7, -r * 0.55], [r * 0.95, -r * 0.42], 2, pal.scarf2);
    face(c, r, md, talking, f, { brow: 1.8 });
    c.strokeStyle = pal.glasses;
    c.lineWidth = 1.6;
    for (const ex of [0.22, 0.7]) {
      c.beginPath();
      c.arc(r * ex, -r * 0.02, r * 0.21, 0, TAU);
      c.stroke();
    }
    seg(c, [r * 0.43, -r * 0.04], [r * 0.49, -r * 0.04], 1.6, pal.glasses);
    seg(c, [r * 0.01, -r * 0.04], [-r * 0.45, -r * 0.12], 1.6, pal.glasses);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath();
    c.arc(r * 0.64, -r * 0.1, r * 0.06, 0, TAU);
    c.fill();
  },
};

function ladle(c, hand, ang, pal, f) {
  const swing = f.state === 'attack' && f.move && (f.move.id === 'jab' || f.move.id === 'sweep' || f.move.id === 'airP');
  const a = ang + (swing ? 0 : 0.5);
  const d = dirOf(a);
  const end = [hand[0] + d[0] * 46, hand[1] + d[1] * 46];
  seg(c, [hand[0] - d[0] * 8, hand[1] - d[1] * 8], end, 4, pal.metal2);
  c.save();
  c.translate(end[0], end[1]);
  c.rotate(Math.atan2(d[1], d[0]));
  c.fillStyle = pal.metal;
  c.beginPath();
  c.ellipse(4, 0, 13, 12, 0, 0, Math.PI);
  c.closePath();
  c.fill();
  seg(c, [-10, 0], [18, 0], 3, pal.metal2);
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.beginPath();
  c.ellipse(0, 5, 3, 4.5, 0.3, 0, TAU);
  c.fill();
  c.restore();
}

export function kazan(c, hand, ang, k = 1) {
  const d = dirOf(ang);
  const p = [hand[0] + d[0] * 18 * k, hand[1] + d[1] * 18 * k];
  c.save();
  c.translate(p[0], p[1]);
  c.scale(k, k);
  c.fillStyle = '#26262b';
  c.beginPath();
  c.ellipse(0, 0, 26, 20, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#3a3a42';
  c.beginPath();
  c.ellipse(0, -14, 24, 7, 0, 0, TAU);
  c.fill();
  c.strokeStyle = '#1a1a1e';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(-26, -6, 5, 0, TAU);
  c.arc(26, -6, 5, 0, TAU);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.beginPath();
  c.ellipse(-9, 4, 5, 9, 0.4, 0, TAU);
  c.fill();
  c.restore();
}

// ---------- burkitshi ----------

const burkit = {
  arm(c, J, side, pal, tint, f) {
    sleeves(c, J, side, tint(pal.robe), 13.5, 12);
    const el = J['elbow' + side];
    const hand = J['hand' + side];
    if (side === 'N') {
      // thick leather glove up to the elbow, the eagle sits on it
      seg(c, along(el, hand, 0.35), hand, 15, pal.glove);
      dot(c, hand, 8.5, pal.glove);
      seg(c, along(el, hand, 0.33), along(el, hand, 0.4), 16, shade(pal.glove, 0.8));
      if (!f.birdOut) perchedEagle(c, hand, f);
    } else {
      seg(c, along(el, hand, 0.8), along(el, hand, 0.9), 14, tint(pal.fur));
      dot(c, hand, fist(f) ? 7.5 : 6.5, tint(pal.skin));
    }
  },
  leg(c, J, side, pal, tint) {
    plainLeg(c, J, side, pal.pants, pal.boots, tint, 16, 1.25);
  },
  body(c, J, pal, b) {
    const { perp, w } = robe(c, J, pal, b, { len: 0.75 });
    belt(c, J, perp, w, pal.belt, pal.trim, 0.16, 9);
    // a fur collar over the shoulders
    const s = J.shoulder;
    c.fillStyle = pal.fur;
    c.beginPath();
    c.ellipse(s[0], s[1] + 4, w * 0.95, 9, -perp[1], 0, TAU);
    c.fill();
    c.fillStyle = pal.fur2;
    c.beginPath();
    c.ellipse(s[0] + perp[0] * 6, s[1] + 2, w * 0.5, 4, -perp[1], 0, TAU);
    c.fill();
  },
  head(c, r, f, md, talking) {
    const pal = f.pal;
    dot(c, [0, 0], r, pal.skin);
    face(c, r, md, talking, f, { brow: 2.6 });
    // short beard and a moustache
    c.fillStyle = pal.beard;
    c.beginPath();
    c.moveTo(r * 0.2, r * 0.45);
    c.quadraticCurveTo(r * 0.55, r * 1.25, r * 1.0, r * 0.62);
    c.quadraticCurveTo(r * 0.75, r * 0.85, r * 0.45, r * 0.62);
    c.closePath();
    c.fill();
    moustache(c, r, pal.beard);
    // тымақ: a fox fur hat with ear flaps
    c.fillStyle = pal.fur;
    c.beginPath();
    c.moveTo(-r * 0.6, -r * 0.3);
    c.quadraticCurveTo(-r * 1.35, r * 0.2, -r * 1.05, r * 1.15);
    c.quadraticCurveTo(-r * 0.7, r * 0.9, -r * 0.35, r * 0.2);
    c.closePath();
    c.fill();
    c.fillStyle = pal.robe2;
    c.beginPath();
    c.moveTo(-r * 0.95, -r * 0.45);
    c.quadraticCurveTo(-r * 0.7, -r * 1.75, r * 0.3, -r * 1.55);
    c.quadraticCurveTo(r * 0.95, -r * 1.3, r * 0.85, -r * 0.5);
    c.closePath();
    c.fill();
    c.fillStyle = pal.fur;
    c.beginPath();
    c.ellipse(-r * 0.05, -r * 0.5, r * 1.15, r * 0.42, -0.06, 0, TAU);
    c.fill();
    c.strokeStyle = pal.fur2;
    c.lineWidth = 1.6;
    for (let k = -3; k <= 3; k++) {
      c.beginPath();
      c.moveTo(k * r * 0.28, -r * 0.72);
      c.lineTo(k * r * 0.28 + 3, -r * 0.3);
      c.stroke();
    }
  },
};

export function perchedEagle(c, at, f, k = 1) {
  // a golden eagle with folded wings, sitting on the glove
  const bob = Math.sin((f.t || 0) * 0.1) * 1.2;
  c.save();
  c.translate(at[0], at[1] - 4 + bob);
  c.scale(k, k);
  c.fillStyle = '#5d3b22';
  c.beginPath();
  c.ellipse(-2, -22, 13, 21, -0.25, 0, TAU);
  c.fill();
  c.fillStyle = '#4a2f1c';
  c.beginPath();
  c.moveTo(-12, -12);
  c.lineTo(-22, 8);
  c.lineTo(-8, 2);
  c.closePath();
  c.fill();
  c.fillStyle = '#c99a4a';
  c.beginPath();
  c.arc(5, -42, 9, 0, TAU);
  c.fill();
  c.fillStyle = '#ffd25a';
  c.beginPath();
  c.moveTo(12, -45);
  c.quadraticCurveTo(20, -42, 15, -36);
  c.lineTo(11, -39);
  c.closePath();
  c.fill();
  dot(c, [8, -45], 1.8, '#111');
  seg(c, [-4, -2], [-4, 4], 2.5, '#ffcf4d');
  seg(c, [3, -2], [4, 4], 2.5, '#ffcf4d');
  c.restore();
}

// ---------- dombyrashy ----------

const dombraMoves = new Set(['jab', 'upper', 'sweep', 'airP']);

const dombra = {
  arm(c, J, side, pal, tint, f) {
    sleeves(c, J, side, tint(pal.shirt), 12, 10.5);
    const hand = J['hand' + side];
    if (side === 'N') dombraProp(c, J, pal, f);
    dot(c, hand, fist(f) ? 7 : 6.3, tint(pal.skin));
  },
  leg(c, J, side, pal, tint) {
    plainLeg(c, J, side, pal.pants, pal.boots, tint, 15, 1.15);
  },
  body(c, J, pal, b) {
    // white shirt under a short velvet vest
    const { perp, w } = robe(c, J, pal, b, { color: pal.shirt, len: 0.35, trim: false });
    const v0 = along(J.shoulder, J.hip, 0.03);
    const v1 = along(J.shoulder, J.hip, 1.08);
    c.fillStyle = pal.robe;
    c.beginPath();
    c.moveTo(v0[0] - perp[0] * w * 0.95, v0[1] - perp[1] * w * 0.95);
    c.lineTo(v0[0] + perp[0] * w * 0.45, v0[1] + perp[1] * w * 0.45);
    c.lineTo(v1[0] + perp[0] * w * 0.85, v1[1] + perp[1] * w * 0.85);
    c.lineTo(v1[0] - perp[0] * (w + 3), v1[1] - perp[1] * (w + 3));
    c.closePath();
    c.fill();
    c.strokeStyle = pal.trim;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(v0[0] + perp[0] * w * 0.45, v0[1] + perp[1] * w * 0.45);
    c.lineTo(v1[0] + perp[0] * w * 0.85, v1[1] + perp[1] * w * 0.85);
    c.lineTo(v1[0] - perp[0] * (w + 3), v1[1] - perp[1] * (w + 3));
    c.stroke();
    belt(c, J, perp, w, pal.robe2, pal.trim, 0.1, 6);
  },
  head(c, r, f, md, talking) {
    const pal = f.pal;
    // hair showing under the cap
    c.fillStyle = pal.hair;
    c.beginPath();
    c.ellipse(-r * 0.3, -r * 0.15, r * 0.85, r * 0.8, 0, 0, TAU);
    c.fill();
    dot(c, [0.05 * r, 0.05 * r], r * 0.95, pal.skin);
    dot(c, [-r * 0.15, r * 0.1], r * 0.22, shade(pal.skin, 0.88));
    face(c, r, md, talking, f, { brow: 2.2 });
    // тақия: an embroidered skullcap
    c.fillStyle = pal.hat;
    c.beginPath();
    c.moveTo(-r * 1.0, -r * 0.3);
    c.quadraticCurveTo(-r * 0.75, -r * 1.35, r * 0.1, -r * 1.3);
    c.quadraticCurveTo(r * 0.8, -r * 1.2, r * 0.9, -r * 0.4);
    c.closePath();
    c.fill();
    c.strokeStyle = pal.hatTrim;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-r * 0.98, -r * 0.38);
    c.lineTo(r * 0.88, -r * 0.48);
    c.stroke();
    c.lineWidth = 1.6;
    c.save();
    c.translate(-r * 0.05, -r * 0.9);
    ramHorns(c, r * 0.032);
    c.restore();
  },
};

function dombraProp(c, J, pal, f) {
  const swing = f.state === 'attack' && f.move && dombraMoves.has(f.move.id);
  const hand = J.handN;
  let base;
  let d;
  if (swing) {
    // held by the neck like a club, the body at the far end
    d = dirOf(J.angles.faN);
    base = [hand[0] + d[0] * 88, hand[1] + d[1] * 88];
    d = [-d[0], -d[1]];
  } else {
    base = [hand[0] - 4, hand[1] + 6];
    const tx = J.handF[0] - base[0];
    const ty = J.handF[1] - base[1];
    const len = Math.hypot(tx, ty);
    d = len > 20 ? [tx / len, ty / len] : [0.8, -0.6];
  }
  const head = [base[0] + d[0] * 104, base[1] + d[1] * 104];
  const ang = Math.atan2(d[1], d[0]);
  seg(c, base, head, 6, pal.wood2);
  for (let k = 1; k < 6; k++) dot(c, along(base, head, 0.3 + k * 0.1), 1.8, '#e8d9b0');
  c.save();
  c.translate(head[0], head[1]);
  c.rotate(ang);
  c.fillStyle = pal.wood2;
  roundRect(c, -2, -5, 18, 10, 3);
  c.fill();
  dot(c, [6, -7], 2.4, '#e8d9b0');
  dot(c, [12, 7], 2.4, '#e8d9b0');
  c.restore();
  c.save();
  c.translate(base[0], base[1]);
  c.rotate(ang);
  c.fillStyle = pal.wood;
  c.beginPath();
  c.ellipse(-4, 0, 26, 16, 0, 0, TAU);
  c.fill();
  c.fillStyle = shade(pal.wood, 1.2);
  c.beginPath();
  c.ellipse(-2, -2, 18, 10, 0, 0, TAU);
  c.fill();
  dot(c, [6, 0], 3, pal.wood2);
  c.restore();
  c.strokeStyle = 'rgba(255,250,235,0.85)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(base[0] - d[0] * 18, base[1] - d[1] * 18);
  c.lineTo(head[0], head[1]);
  c.stroke();
}

// ---------- taxi driver ----------

const taxi = {
  arm(c, J, side, pal, tint, f) {
    sleeves(c, J, side, tint(pal.robe), 14, 12.5);
    const el = J['elbow' + side];
    const hand = J['hand' + side];
    seg(c, along(el, hand, 0.84), along(el, hand, 0.9), 13, tint(pal.robe2));
    dot(c, hand, fist(f) ? 7.8 : 6.8, tint(pal.skin));
    if (side === 'F' && f.state === 'keys') {
      seg(c, hand, [hand[0] + 6, hand[1] - 14], 2, '#d8d8d8');
      dot(c, [hand[0] + 7, hand[1] - 16], 4, '#d8d8d8');
    }
    if (side === 'F' && f.state === 'special' && f.t < f.def.spec.s) businessCard(c, hand[0], hand[1] - 6, 0.3);
  },
  leg(c, J, side, pal, tint) {
    const knee = J['knee' + side];
    const foot = J['foot' + side];
    seg(c, J.hip, knee, 17, tint(pal.pants));
    seg(c, knee, foot, 15, tint(pal.pants));
    boot(c, foot, J.angles['sh' + side], tint(pal.boots), 1.15);
  },
  body(c, J, pal, b) {
    const { hip, shoulder } = J;
    const t = J.angles.torso;
    const perp = [-Math.cos(t), Math.sin(t)];
    const w = b.w / 2;
    const h0 = along(shoulder, hip, 1.12);
    // leather jacket, open over a shirt, a little belly
    c.fillStyle = pal.robe;
    c.beginPath();
    c.moveTo(shoulder[0] - perp[0] * w * 0.9, shoulder[1] - perp[1] * w * 0.9);
    c.lineTo(shoulder[0] + perp[0] * w * 0.85, shoulder[1] + perp[1] * w * 0.85);
    c.quadraticCurveTo(hip[0] + perp[0] * (w + 10), hip[1] + perp[1] * (w + 10) - 18, h0[0] + perp[0] * (w + 2), h0[1] + perp[1] * (w + 2));
    c.lineTo(h0[0] - perp[0] * (w + 2), h0[1] - perp[1] * (w + 2));
    c.closePath();
    c.fill();
    c.fillStyle = pal.shirt;
    c.beginPath();
    c.moveTo(shoulder[0] + perp[0] * w * 0.35, shoulder[1] + perp[1] * w * 0.35);
    c.lineTo(shoulder[0] + perp[0] * w * 0.8, shoulder[1] + perp[1] * w * 0.8);
    c.quadraticCurveTo(hip[0] + perp[0] * (w + 8), hip[1] + perp[1] * (w + 8) - 16, h0[0] + perp[0] * (w - 2), h0[1] + perp[1] * (w - 2));
    c.lineTo(h0[0] + perp[0] * (w * 0.5), h0[1] + perp[1] * (w * 0.5));
    c.closePath();
    c.fill();
    seg(c, along(shoulder, hip, 0.02), along(shoulder, hip, 0.1), 7, pal.robe2);
    // the meter-shaped keychain on the belt
    const k = along(hip, shoulder, 0.05);
    dot(c, [k[0] + perp[0] * (w - 2), k[1] + perp[1] * (w - 2)], 3, '#d8d8d8');
  },
  head(c, r, f, md, talking) {
    const pal = f.pal;
    dot(c, [0, 0], r, pal.skin);
    dot(c, [-r * 0.15, r * 0.08], r * 0.22, shade(pal.skin, 0.88));
    // stubble
    c.fillStyle = 'rgba(40, 25, 20, 0.18)';
    c.beginPath();
    c.ellipse(r * 0.5, r * 0.55, r * 0.55, r * 0.38, 0.2, 0, TAU);
    c.fill();
    face(c, r, md, talking, f, { brow: 2.8, goldTooth: true });
    moustache(c, r, pal.hair, 1.3);
    // кепка: a flat cap with a short peak
    c.fillStyle = pal.cap;
    c.beginPath();
    c.moveTo(-r * 1.05, -r * 0.2);
    c.quadraticCurveTo(-r * 1.0, -r * 1.2, r * 0.2, -r * 1.12);
    c.quadraticCurveTo(r * 1.05, -r * 1.0, r * 1.05, -r * 0.45);
    c.lineTo(r * 1.55, -r * 0.32);
    c.quadraticCurveTo(r * 1.3, -r * 0.18, r * 0.9, -r * 0.25);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.beginPath();
    c.ellipse(-r * 0.1, -r * 0.85, r * 0.6, r * 0.15, -0.1, 0, TAU);
    c.fill();
    dot(c, [-r * 0.05, -r * 1.08], 2.4, shade(pal.cap, 0.7));
  },
};

export function businessCard(c, x, y, spin) {
  c.save();
  c.translate(x, y);
  c.rotate(spin);
  c.fillStyle = '#fbfaf4';
  roundRect(c, -14, -9, 28, 18, 2);
  c.fill();
  c.fillStyle = '#ffcc33';
  c.fillRect(-14, -9, 28, 5);
  c.fillStyle = '#333';
  c.fillRect(-10, 0, 16, 2);
  c.fillRect(-10, 4, 10, 2);
  c.restore();
}

// ---------- baluan ----------

const baluan = {
  arm(c, J, side, pal, tint, f) {
    const sh = J.shoulder;
    const el = J['elbow' + side];
    const hand = J['hand' + side];
    // short jacket sleeves, strong bare forearms
    seg(c, sh, el, 17, tint(pal.robe));
    seg(c, el, hand, 14, tint(pal.skin));
    seg(c, along(sh, el, 0.85), el, 18, tint(pal.trim));
    dot(c, hand, fist(f) ? 9 : 8, tint(pal.skin));
  },
  leg(c, J, side, pal, tint) {
    const knee = J['knee' + side];
    const foot = J['foot' + side];
    seg(c, J.hip, knee, 19, tint(pal.pants));
    seg(c, knee, foot, 16, tint(pal.pants));
    boot(c, foot, J.angles['sh' + side], tint(pal.boots), 1.2);
  },
  body(c, J, pal, b) {
    const { perp, w } = robe(c, J, pal, b, { len: 0.2, trimColor: pal.trim });
    // the red belt everybody wants to grab, knot hanging at the front
    const p = belt(c, J, perp, w, pal.belt, null, 0.12, 11);
    const knot = [p[0] + perp[0] * (w - 6), p[1] + perp[1] * (w - 6)];
    seg(c, knot, [knot[0] + 3, knot[1] + 18], 5, pal.belt);
    seg(c, knot, [knot[0] + 9, knot[1] + 14], 5, shade(pal.belt, 0.85));
    dot(c, knot, 5, shade(pal.belt, 0.9));
  },
  head(c, r, f, md, talking) {
    const pal = f.pal;
    dot(c, [0, 0], r, pal.skin);
    // shaved head: just a shadow of hair
    c.fillStyle = 'rgba(30, 20, 15, 0.22)';
    c.beginPath();
    c.arc(-r * 0.1, -r * 0.1, r * 0.98, Math.PI * 0.95, Math.PI * 1.85);
    c.fill();
    dot(c, [-r * 0.15, r * 0.08], r * 0.25, shade(pal.skin, 0.86));
    face(c, r, md, talking, f, { brow: 3.4, nose: 0.2 });
    moustache(c, r, pal.hair, 1.1);
  },
};

// ---------- akyn ----------

const akyn = {
  arm(c, J, side, pal, tint, f) {
    sleeves(c, J, side, tint(pal.robe), 12, 10.5);
    const el = J['elbow' + side];
    const hand = J['hand' + side];
    seg(c, along(el, hand, 0.8), along(el, hand, 0.88), 12, tint(pal.trim));
    dot(c, hand, 6, tint(pal.skin));
  },
  leg: (c, J, side, pal, tint) => dressLeg(c, J, side, pal, tint),
  back(c, J, pal, f) {
    // two long braids swing behind
    const h = J.headC;
    const sway = Math.sin((f.t || 0) * 0.12) * 4;
    for (const off of [-6, 2]) {
      c.strokeStyle = pal.hair;
      c.lineWidth = 6;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(h[0] - 12 + off, h[1] + 6);
      c.quadraticCurveTo(h[0] - 22 + off + sway, h[1] + 40, h[0] - 18 + off + sway * 1.5, h[1] + 78);
      c.stroke();
      dot(c, [h[0] - 18 + off + sway * 1.5, h[1] + 80], 4, pal.trim);
    }
  },
  body(c, J, pal, b, f) {
    dress(c, J, pal, b, f, true);
  },
  head(c, r, f, md, talking) {
    const pal = f.pal;
    c.fillStyle = pal.hair;
    c.beginPath();
    c.ellipse(-r * 0.25, -r * 0.05, r * 0.95, r * 0.95, 0, 0, TAU);
    c.fill();
    dot(c, [0.08 * r, 0.06 * r], r * 0.92, pal.skin);
    face(c, r, md, talking, f, { brow: 1.8, lashes: true });
    dot(c, [-r * 0.12, r * 0.45], 2.6, pal.trim);
    // бөрік with a fur rim and a bunch of үкі feathers on top
    c.fillStyle = pal.hat;
    c.beginPath();
    c.moveTo(-r * 0.95, -r * 0.45);
    c.quadraticCurveTo(-r * 0.8, -r * 1.65, r * 0.1, -r * 1.6);
    c.quadraticCurveTo(r * 0.85, -r * 1.5, r * 0.9, -r * 0.5);
    c.closePath();
    c.fill();
    c.fillStyle = pal.fur;
    c.beginPath();
    c.ellipse(-r * 0.03, -r * 0.5, r * 1.08, r * 0.3, -0.05, 0, TAU);
    c.fill();
    c.strokeStyle = pal.trim;
    c.lineWidth = 1.5;
    c.save();
    c.translate(-r * 0.05, -r * 1.05);
    ramHorns(c, r * 0.03);
    c.restore();
    const sway = Math.sin((f.t || 0) * 0.15) * 0.15;
    c.fillStyle = pal.feather;
    for (let k = 0; k < 5; k++) {
      c.save();
      c.translate(-r * 0.05, -r * 1.55);
      c.rotate(-0.55 + k * 0.28 + sway);
      c.beginPath();
      c.ellipse(0, -r * 0.55, r * 0.16, r * 0.55, 0, 0, TAU);
      c.fill();
      c.restore();
    }
  },
};

export function whiteScarf(c, hand, t) {
  const w = Math.sin(t * 0.4);
  c.fillStyle = '#ffffff';
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(hand[0], hand[1]);
  c.quadraticCurveTo(hand[0] - 20, hand[1] - 30 + w * 8, hand[0] - 34, hand[1] - 12 + w * 12);
  c.quadraticCurveTo(hand[0] - 18, hand[1] + 2 + w * 6, hand[0], hand[1] + 6);
  c.closePath();
  c.fill();
  c.stroke();
}

// ---------- dau ----------

const dau = {
  arm(c, J, side, pal, tint, f) {
    sleeves(c, J, side, tint(pal.robe), 20, 18);
    const hand = J['hand' + side];
    dot(c, hand, fist(f) ? 13 : 11, tint(pal.skin));
    if (side === 'N') club(c, hand, J.angles.faN, pal, f);
  },
  leg(c, J, side, pal, tint) {
    plainLeg(c, J, side, pal.pants, pal.boots, tint, 24, 1.8);
  },
  body(c, J, pal, b) {
    const { hip, shoulder } = J;
    const t = J.angles.torso;
    const perp = [-Math.cos(t), Math.sin(t)];
    const w = b.w / 2;
    const belly = along(hip, shoulder, 0.35);
    robe(c, J, pal, b, { len: 0.5 });
    // a big round belly
    c.fillStyle = pal.robe;
    c.beginPath();
    c.ellipse(belly[0] + perp[0] * w * 0.55, belly[1] + perp[1] * w * 0.55, w * 0.9, w * 0.8, 0, 0, TAU);
    c.fill();
    // patches on the old coat
    c.fillStyle = shade(pal.robe, 1.25);
    c.fillRect(belly[0] - 6, belly[1] - 30, 14, 12);
    c.fillStyle = shade(pal.robe, 0.75);
    c.fillRect(shoulder[0] - 14, shoulder[1] + 18, 12, 14);
    belt(c, J, perp, w + 8, pal.belt, pal.trim, 0.22, 12);
  },
  head(c, r, f, md, talking) {
    const pal = f.pal;
    // wild hair all around
    c.fillStyle = pal.hair;
    c.beginPath();
    for (let k = 0; k <= 12; k++) {
      const a = Math.PI * 0.75 + (k / 12) * Math.PI * 1.25;
      const rr = r * (k % 2 ? 1.12 : 1.38);
      c.lineTo(Math.cos(a) * rr - r * 0.1, Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    dot(c, [0, 0], r, pal.skin);
    dot(c, [-r * 0.15, r * 0.08], r * 0.24, shade(pal.skin, 0.86));
    face(c, r, md, talking, f, { unibrow: true, nose: 0.28, eyes: [0.28, 0.66] });
    // a big beard
    c.fillStyle = pal.hair;
    c.beginPath();
    c.moveTo(-r * 0.1, r * 0.35);
    c.quadraticCurveTo(r * 0.2, r * 1.6, r * 1.0, r * 0.75);
    c.quadraticCurveTo(r * 0.75, r * 0.95, r * 0.5, r * 0.72);
    c.quadraticCurveTo(r * 0.3, r * 0.75, r * 0.15, r * 0.4);
    c.closePath();
    c.fill();
  },
};

function club(c, hand, ang, pal, f) {
  const swing = f.state === 'attack' && f.move && ['jab', 'upper', 'sweep', 'airP'].includes(f.move.id);
  const a = ang + (swing ? 0 : 0.6);
  const d = dirOf(a);
  const n = [d[1], -d[0]];
  const p0 = [hand[0] - d[0] * 12, hand[1] - d[1] * 12];
  const p1 = [hand[0] + d[0] * 120, hand[1] + d[1] * 120];
  c.fillStyle = pal.club;
  c.beginPath();
  c.moveTo(p0[0] + n[0] * 6, p0[1] + n[1] * 6);
  c.lineTo(p1[0] + n[0] * 15, p1[1] + n[1] * 15);
  c.quadraticCurveTo(p1[0] + d[0] * 14, p1[1] + d[1] * 14, p1[0] - n[0] * 15, p1[1] - n[1] * 15);
  c.lineTo(p0[0] - n[0] * 6, p0[1] - n[1] * 6);
  c.closePath();
  c.fill();
  dot(c, along(p0, p1, 0.6), 4, shade(pal.club, 0.7));
  dot(c, along(p0, p1, 0.85), 3.5, shade(pal.club, 0.7));
}

export const LOOKS = { batyr, apa, burkit, dombra, taxi, baluan, akyn, dau };
