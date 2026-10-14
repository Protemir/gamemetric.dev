import { solve } from './pose.js';
import { roundRect } from './util.js';

// Fighters, props and effects, drawn in world space: x right, y down, ground at y = 0.

const TAU = Math.PI * 2;

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
}

function seg(c, a, b, w, color) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.stroke();
}

function dot(c, p, r, color) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(p[0], p[1], r, 0, TAU);
  c.fill();
}

const along = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const dirOf = (ang) => [Math.sin(ang), Math.cos(ang)];

// ---------- fighter ----------

export function drawFighter(c, f, opts = {}) {
  const b = f.def.body;
  const p = f.pose;
  const J = solve(p, b);
  const pal = f.pal;
  const id = f.def.id;
  c.save();
  c.translate(f.x, -f.y);
  if (!opts.noShadow) {
    // shadow stays on the ground
    const h = Math.min(1, f.y / 300);
    c.fillStyle = `rgba(0,0,0,${0.32 * (1 - h)})`;
    c.beginPath();
    c.ellipse(0, f.y, 40 * (1 - h * 0.5), 9 * (1 - h * 0.5), 0, 0, TAU);
    c.fill();
  }
  c.translate(0, -J.lift);
  c.scale(f.face, 1);
  const lean = J.angles;

  const dark = (col) => shade(col, 0.72);
  const limbs = id === 'apa' ? apaLimbs : batyrLimbs;

  // far side first, darker
  limbs.arm(c, J, 'F', pal, dark, f);
  limbs.leg(c, J, 'F', pal, dark, f);
  if (id === 'batyr') spear(c, J, pal);
  limbs.leg(c, J, 'N', pal, (x) => x, f);
  limbs.body(c, J, pal, b, f);
  drawHead(c, J, f);
  limbs.arm(c, J, 'N', pal, (x) => x, f);

  if (f.flash > 0) {
    // a quick white outline on a hit
    c.globalAlpha = f.flash / 8;
    c.strokeStyle = '#fff';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(J.headC[0], J.headC[1], b.head + 3, 0, TAU);
    c.stroke();
    c.globalAlpha = 1;
  }
  c.restore();
  void lean;

  // stars over a dizzy head, in world space
  if (['stun', 'dizzy', 'out'].includes(f.state) || (f.state === 'hit' && f.hp <= 0)) {
    const hx = f.x + J.headC[0] * f.face;
    const hy = -f.y - J.lift + J.headC[1] - b.head - 14;
    stars(c, hx, hy, opts.time || 0, f.state === 'out' ? 0.8 : 1);
  }
  if (f.state === 'dance' && f.dance > 2.2) {
    // sweat drops
    const hx = f.x + J.headC[0] * f.face;
    const hy = -f.y - J.lift + J.headC[1];
    const tt = (opts.time || 0) * 0.08;
    for (let k = 0; k < 2; k++) {
      const ph = (tt + k * 0.5) % 1;
      drop(c, hx + (k ? 22 : -20) * f.face, hy - 10 + ph * 26, 1 - ph);
    }
  }
}

function stars(c, x, y, t, s) {
  for (let k = 0; k < 3; k++) {
    const a = t * 0.12 + (k * TAU) / 3;
    const sx = x + Math.cos(a) * 26 * s;
    const sy = y + Math.sin(a) * 7 * s;
    star(c, sx, sy, 6.5 * s, Math.sin(a) > 0 ? '#ffe680' : '#ffc94a');
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

function drop(c, x, y, a) {
  c.globalAlpha = Math.max(0, a);
  c.fillStyle = '#9fd8ff';
  c.beginPath();
  c.moveTo(x, y - 6);
  c.quadraticCurveTo(x + 5, y + 2, x, y + 4);
  c.quadraticCurveTo(x - 5, y + 2, x, y - 6);
  c.fill();
  c.globalAlpha = 1;
}

// ---------- batyr ----------

const batyrLimbs = {
  arm(c, J, side, pal, tint, f) {
    const sh = J.shoulder;
    const el = J['elbow' + side];
    const hand = J['hand' + side];
    seg(c, sh, el, 13, tint(pal.robe));
    seg(c, el, hand, 11.5, tint(pal.robe));
    // gold cuff
    seg(c, along(el, hand, 0.78), along(el, hand, 0.86), 12.5, tint(pal.trim));
    const fist = f.state === 'attack' || f.state === 'throwing' || f.state === 'special';
    dot(c, hand, fist ? 7.5 : 6.5, tint(pal.skin));
    if (side === 'N') shield(c, el, hand, J.angles.faN, pal, f);
  },
  leg(c, J, side, pal, tint) {
    const hip = J.hip;
    const knee = J['knee' + side];
    const foot = J['foot' + side];
    seg(c, hip, knee, 16, tint(pal.pants));
    seg(c, knee, along(knee, foot, 0.35), 14, tint(pal.pants));
    seg(c, along(knee, foot, 0.3), foot, 14.5, tint(pal.boots));
    boot(c, foot, J.angles['sh' + side], tint(pal.boots), 1.2);
  },
  body(c, J, pal, b) {
    const { hip, shoulder } = J;
    const t = J.angles.torso;
    const perp = [-Math.cos(t), Math.sin(t)];
    const w = b.w / 2;
    // chapan: shoulders down to just above the knees
    const hemN = along(hip, J.kneeN, 0.62);
    const hemF = along(hip, J.kneeF, 0.62);
    c.fillStyle = pal.robe;
    c.beginPath();
    c.moveTo(shoulder[0] - perp[0] * w * 0.9, shoulder[1] - perp[1] * w * 0.9);
    c.lineTo(shoulder[0] + perp[0] * w, shoulder[1] + perp[1] * w);
    c.lineTo(hip[0] + perp[0] * (w + 3), hip[1] + perp[1] * (w + 3));
    c.lineTo(hemN[0] + perp[0] * 10, hemN[1] + 6);
    c.lineTo(hemF[0] - perp[0] * 12, hemF[1] + 6);
    c.lineTo(hip[0] - perp[0] * (w + 2), hip[1] - perp[1] * (w + 2));
    c.closePath();
    c.fill();
    // trim down the front and along the hem
    c.strokeStyle = pal.trim;
    c.lineWidth = 3.5;
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(shoulder[0] + perp[0] * (w - 4), shoulder[1] + perp[1] * (w - 4));
    c.lineTo(hip[0] + perp[0] * (w - 1), hip[1] + perp[1] * (w - 1));
    c.lineTo(hemN[0] + perp[0] * 8, hemN[1] + 4);
    c.lineTo(hemF[0] - perp[0] * 10, hemF[1] + 4);
    c.stroke();
    // belt with a buckle
    const belt = along(hip, shoulder, 0.16);
    seg(c, [belt[0] - perp[0] * (w + 2), belt[1] - perp[1] * (w + 2)], [belt[0] + perp[0] * (w + 2), belt[1] + perp[1] * (w + 2)], 7, pal.belt);
    dot(c, [belt[0] + perp[0] * (w - 3), belt[1] + perp[1] * (w - 3)], 4, pal.trim);
    // collar
    seg(c, along(shoulder, hip, 0.02), along(shoulder, hip, 0.12), 6, pal.robe2);
  },
};

function spear(c, J, pal) {
  // carried on the back, diagonally
  const t = J.angles.torso;
  const back = [Math.cos(t), -Math.sin(t)];
  const s0 = along(J.hip, J.shoulder, -0.1);
  const base = [s0[0] + back[0] * 12, s0[1] + back[1] * 12];
  const up = dirOf(t + 0.35);
  const tip = [base[0] + up[0] * 120, base[1] + up[1] * 120];
  seg(c, base, tip, 4, '#6b4424');
  c.fillStyle = pal.metal;
  const d = dirOf(t + 0.35);
  const n = [d[1], -d[0]];
  c.beginPath();
  c.moveTo(tip[0] + d[0] * 22, tip[1] + d[1] * 22);
  c.lineTo(tip[0] + n[0] * 5, tip[1] + n[1] * 5);
  c.lineTo(tip[0] - n[0] * 5, tip[1] - n[1] * 5);
  c.closePath();
  c.fill();
  dot(c, tip, 4.5, pal.plume);
}

function shield(c, el, hand, ang, pal, f) {
  const up = f.state === 'block' || f.state === 'blockstun';
  const pos = along(el, hand, up ? 0.75 : 0.55);
  const r = up ? 27 : 24;
  c.save();
  c.translate(pos[0], pos[1]);
  // seen a little from the side unless raised
  c.scale(up ? 0.9 : 0.62, 1);
  dot(c, [0, 0], r, pal.shield);
  c.strokeStyle = pal.metal;
  c.lineWidth = 4;
  c.beginPath();
  c.arc(0, 0, r - 2, 0, TAU);
  c.stroke();
  // қошқар мүйіз: a pair of ram horns above and the same pair mirrored below
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
  void ang;
}

function boot(c, foot, shinAng, color, big) {
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

// two horns curling outwards from a short stem, mirror-symmetric
export function ramHorns(c, k) {
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(0, -4 * k);
    c.bezierCurveTo(0, -14 * k, s * 12 * k, -17 * k, s * 14 * k, -10 * k);
    c.bezierCurveTo(s * 15 * k, -5 * k, s * 9 * k, -4 * k, s * 9 * k, -8.5 * k);
    c.stroke();
  }
}

// ---------- apa ----------

const apaLimbs = {
  arm(c, J, side, pal, tint, f) {
    const sh = J.shoulder;
    const el = J['elbow' + side];
    const hand = J['hand' + side];
    seg(c, sh, el, 13, tint(pal.robe));
    seg(c, el, hand, 11.5, tint(pal.robe));
    dot(c, hand, 6.5, tint(pal.skin));
    if (side === 'N') {
      const kazan = f.state === 'attack' && f.move && f.move.id === 'upper';
      if (kazan) drawKazan(c, hand, J.angles.faN);
      else ladle(c, hand, J.angles.faN, pal, f);
    }
    if (side === 'F' && f.state === 'special' && f.t < f.def.spec.s) baursakAt(c, hand[0], hand[1], 0);
  },
  leg(c, J, side, pal, tint) {
    const knee = J['knee' + side];
    const foot = J['foot' + side];
    seg(c, J.hip, knee, 15, tint(pal.robe2));
    seg(c, knee, foot, 11, tint(pal.socks));
    boot(c, foot, J.angles['sh' + side], tint(pal.shoes), 1);
  },
  body(c, J, pal, b, f) {
    const { hip, shoulder } = J;
    const t = J.angles.torso;
    const perp = [-Math.cos(t), Math.sin(t)];
    const w = b.w / 2;
    // long dress, flares down to mid-shin
    const hemN = along(J.kneeN, J.footN, 0.45);
    const hemF = along(J.kneeF, J.footF, 0.45);
    const flare = f.state === 'dance' ? 6 : 0;
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
    // hem ribbon
    seg(c, [Math.min(hemN[0], hemF[0]) - 12 - flare, Math.max(hemN[1], hemF[1])], [Math.max(hemN[0], hemF[0]) + 12 + flare, Math.max(hemN[1], hemF[1])], 3, pal.trim);
    // vest (kamzol) over the dress
    const v0 = along(shoulder, hip, 0.05);
    const v1 = along(shoulder, hip, 1.05);
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
    // buttons
    for (let k = 1; k < 4; k++) dot(c, along([v0[0] + perp[0] * w * 0.5, v0[1] + perp[1] * w * 0.5], [v1[0] + perp[0] * w * 0.68, v1[1] + perp[1] * w * 0.68], k / 4), 2, pal.trim);
  },
};

function ladle(c, hand, ang, pal, f) {
  // шөміш: a long handle and a deep bowl at the end
  const swing = f.state === 'attack' && f.move && (f.move.id === 'jab' || f.move.id === 'sweep' || f.move.id === 'airP');
  const a = ang + (swing ? 0 : 0.5);
  const d = dirOf(a);
  const end = [hand[0] + d[0] * 46, hand[1] + d[1] * 46];
  seg(c, [hand[0] - d[0] * 8, hand[1] - d[1] * 8], end, 4, pal.metal2);
  // the bowl hangs off the end of the handle, its rim along the handle
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
  c.ellipse(0, 5, 3, 4.5, 0.3, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawKazan(c, hand, ang) {
  const d = dirOf(ang);
  const p = [hand[0] + d[0] * 18, hand[1] + d[1] * 18];
  c.save();
  c.translate(p[0], p[1]);
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

// ---------- heads and faces ----------

function mood(f) {
  const st = f.state;
  if (st === 'out' || st === 'ko' || (st === 'fall' && f.hp <= 0)) return 'x';
  if (st === 'stun' || st === 'dizzy' || (st === 'hit' && f.hp <= 0)) return 'spin';
  if (st === 'hit' || st === 'fall' || st === 'thrown' || st === 'pulled' || st === 'down' || st === 'carried') return 'hurt';
  if (st === 'win' || st === 'clap') return 'happy';
  if (st === 'lose') return 'sad';
  if (st === 'dance') return f.dance > 2.6 ? 'hurt' : 'happy';
  if (st === 'attack' || st === 'special' || st === 'throwing') return 'angry';
  return 'calm';
}

function drawHead(c, J, f) {
  const r = f.def.body.head;
  const pal = f.pal;
  const [x, y] = J.headC;
  const a = J.angles.head - Math.PI;
  c.save();
  c.translate(x, y);
  c.rotate(-a);
  const md = mood(f);
  const talking = !!f.bubble && f.bubble.t > 30 && Math.floor(f.bubble.t / 5) % 2 === 0;
  if (f.def.id === 'apa') {
    // headscarf behind the head, tied under the chin
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
    // scarf edge over the forehead
    c.fillStyle = pal.scarf;
    c.beginPath();
    c.ellipse(r * 0.05, -r * 0.62, r * 1.02, r * 0.46, 0.12, Math.PI, TAU);
    c.fill();
    seg(c, [-r * 0.7, -r * 0.55], [r * 0.95, -r * 0.42], 2, pal.scarf2);
    face(c, r, md, talking, f);
    // round glasses
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
  } else {
    dot(c, [0, 0], r, pal.skin);
    // ear
    dot(c, [-r * 0.15, r * 0.08], r * 0.22, shade(pal.skin, 0.88));
    face(c, r, md, talking, f);
    // moustache
    c.fillStyle = pal.hair;
    c.beginPath();
    c.moveTo(r * 0.5, r * 0.36);
    c.quadraticCurveTo(r * 0.75, r * 0.22, r * 1.02, r * 0.36);
    c.quadraticCurveTo(r * 1.06, r * 0.62, r * 0.88, r * 0.66);
    c.quadraticCurveTo(r * 0.78, r * 0.45, r * 0.5, r * 0.5);
    c.closePath();
    c.fill();
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
    // nose guard
    seg(c, [r * 0.62, -r * 0.2], [r * 0.66, r * 0.28], 3, pal.metal2);
    c.fillStyle = pal.plume;
    c.beginPath();
    c.moveTo(-r * 0.05, -r * 1.95);
    c.quadraticCurveTo(-r * 0.9, -r * 2.5, -r * 1.5, -r * 1.7);
    c.quadraticCurveTo(-r * 0.8, -r * 2.0, -r * 0.05, -r * 1.85);
    c.fill();
  }
  c.restore();
}

function face(c, r, md, talking, f) {
  const ink = '#1d1310';
  const eyes = [[r * 0.22, -r * 0.02], [r * 0.7, -r * 0.02]];
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
  } else if (md === 'hurt') {
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
  } else {
    for (const [ex, ey] of eyes) dot(c, [ex, ey], md === 'sad' ? 2 : 2.4, ink);
  }
  // brows
  c.lineWidth = f.def.id === 'apa' ? 1.8 : 2.6;
  const angry = md === 'angry' ? 1 : md === 'sad' ? -1 : 0;
  for (const [ex, ey] of eyes) {
    c.beginPath();
    c.moveTo(ex - 4, ey - 6.5 - angry * 1.5);
    c.lineTo(ex + 4, ey - 6.5 + angry * 1.5);
    c.stroke();
  }
  // nose and cheek
  dot(c, [r * 0.98, r * 0.18], r * 0.16, shade(f.pal.skin, 0.9));
  c.fillStyle = 'rgba(232, 96, 96, 0.28)';
  c.beginPath();
  c.arc(r * 0.45, r * 0.4, r * 0.18, 0, TAU);
  c.fill();
  // mouth
  const mx = r * 0.66;
  const my = r * 0.58;
  c.fillStyle = '#5a1c1c';
  if (talking || md === 'hurt' || md === 'angry' || md === 'x') {
    c.beginPath();
    c.ellipse(mx, my, md === 'angry' ? 4.5 : 3.6, talking || md === 'hurt' ? 4.2 : 2.6, 0, 0, TAU);
    c.fill();
  } else {
    c.strokeStyle = '#5a1c1c';
    c.lineWidth = 2;
    c.beginPath();
    if (md === 'sad') c.arc(mx, my + 4, 4, Math.PI * 1.15, Math.PI * 1.85);
    else c.arc(mx, my - 2, 4, Math.PI * 0.15, Math.PI * 0.85);
    c.stroke();
  }
}

// ---------- lasso, projectiles, eagle ----------

export function drawLasso(c, f) {
  const L = f.lasso;
  if (!L) return;
  const J = solve(f.pose, f.def.body);
  const hx = f.x + J.handF[0] * f.face;
  const hy = -f.y - J.lift + J.handF[1];
  const [lx, ly] = f.lassoPoint();
  const sy = -ly;
  c.strokeStyle = '#c9a46a';
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(hx, hy);
  const sag = L.out ? 18 : 6;
  c.quadraticCurveTo((hx + lx) / 2, (hy + sy) / 2 + sag, lx, sy);
  c.stroke();
  c.lineWidth = 3.4;
  c.beginPath();
  c.ellipse(lx + f.face * 12, sy, 14, 22, 0, 0, TAU);
  c.stroke();
}

export function drawProjectile(c, p) {
  baursakAt(c, p.x, -p.y, p.spin);
}

export function drawEagle(c, e) {
  if (!e) return;
  const flap = Math.sin(e.flap) * 0.9;
  const dir = e.carry ? (e.x > (e.px ?? e.x) ? 1 : -1) : 1;
  e.px = e.x;
  c.save();
  c.translate(e.x, -e.y);
  c.scale(dir, 1);
  // wings
  for (const s of [-1, 1]) {
    c.save();
    c.rotate(s * (0.15 + flap * 0.5));
    c.fillStyle = s < 0 ? '#4a2f1c' : '#5d3b22';
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(s * 50, -40, s * 110, -18);
    c.lineTo(s * 96, -8);
    c.lineTo(s * 104, 2);
    c.lineTo(s * 86, 6);
    c.lineTo(s * 90, 14);
    c.quadraticCurveTo(s * 40, 16, 0, 12);
    c.closePath();
    c.fill();
    c.restore();
  }
  // body, golden head, hooked beak
  c.fillStyle = '#6b4526';
  c.beginPath();
  c.ellipse(0, 6, 22, 14, 0.15, 0, TAU);
  c.fill();
  c.fillStyle = '#c99a4a';
  c.beginPath();
  c.arc(20, -4, 11, 0, TAU);
  c.fill();
  c.fillStyle = '#ffd25a';
  c.beginPath();
  c.moveTo(29, -6);
  c.quadraticCurveTo(40, -4, 34, 6);
  c.lineTo(29, 1);
  c.closePath();
  c.fill();
  dot(c, [23, -7], 2, '#111');
  // tail and talons
  c.fillStyle = '#3e2716';
  c.beginPath();
  c.moveTo(-18, 4);
  c.lineTo(-42, 0);
  c.lineTo(-40, 14);
  c.closePath();
  c.fill();
  seg(c, [4, 16], [6, 30], 3, '#ffcf4d');
  seg(c, [-6, 16], [-6, 30], 3, '#ffcf4d');
  c.restore();
}

// ---------- effects ----------

export function drawFx(c, e) {
  const k = e.t / e.life;
  if (e.k === 'spark') {
    const r = (e.big ? 46 : 32) * (0.5 + k * 0.8);
    c.save();
    c.translate(e.x, -e.y);
    c.rotate(e.rot);
    c.globalAlpha = 1 - k;
    c.fillStyle = '#fff6c2';
    c.beginPath();
    for (let n = 0; n < 16; n++) {
      const a = (n * Math.PI) / 8;
      const rr = n % 2 ? r * 0.38 : r;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    c.fillStyle = '#ffb547';
    c.beginPath();
    c.arc(0, 0, r * 0.32, 0, TAU);
    c.fill();
    c.restore();
    c.globalAlpha = 1;
  } else if (e.k === 'block') {
    c.globalAlpha = 1 - k;
    c.strokeStyle = '#9fe0ff';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(e.x, -e.y, 12 + k * 30, 0, TAU);
    c.stroke();
    c.globalAlpha = 1;
  } else if (e.k === 'dust') {
    c.globalAlpha = (1 - k) * 0.5;
    c.fillStyle = '#e9d3a8';
    c.beginPath();
    c.arc(e.x, -e.y - k * 14, (10 + k * 22) * e.s, 0, TAU);
    c.fill();
    c.globalAlpha = 1;
  } else if (e.k === 'crumb') {
    c.fillStyle = '#e09a3a';
    c.fillRect(e.x - 3, -e.y - 3, 6, 6);
  } else if (e.k === 'word') {
    const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15) * 0.5);
    c.save();
    c.translate(e.x, -e.y - k * 30);
    c.rotate(-0.12);
    c.scale(pop, pop);
    c.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
    c.font = '900 34px "Segoe UI", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = 8;
    c.strokeStyle = '#2a0f06';
    c.strokeText(e.text, 0, 0);
    c.fillStyle = '#ffd25a';
    c.fillText(e.text, 0, 0);
    c.restore();
    c.globalAlpha = 1;
  }
}

export function drawBubble(c, f, scale, bounds, raise = 0) {
  const bub = f.bubble;
  if (!bub) return;
  const J = solve(f.pose, f.def.body);
  const hx = f.x + J.headC[0] * f.face;
  const top = -f.y - J.lift + J.headC[1] - f.def.body.head - 40;
  const s = 1 / Math.max(0.6, Math.min(1.4, scale));
  c.save();
  c.translate(hx, top);
  c.scale(s, s);
  c.translate(0, -raise);
  const appear = Math.min(1, (95 - bub.t) / 6);
  c.globalAlpha = Math.min(1, bub.t / 12);
  c.scale(0.7 + appear * 0.3, 0.7 + appear * 0.3);
  c.font = '800 17px "Segoe UI", system-ui, sans-serif';
  const w = c.measureText(bub.text).width + 24;
  const h = 32;
  let x = -w / 2 + f.face * 18;
  if (bounds) {
    // keep the bubble on screen, the tail still points at the head
    const k = s * (0.7 + appear * 0.3);
    const left = hx + x * k;
    const right = hx + (x + w) * k;
    if (left < bounds[0]) x += (bounds[0] - left) / k;
    if (right > bounds[1]) x -= (right - bounds[1]) / k;
  }
  c.fillStyle = '#fffaf0';
  c.strokeStyle = '#2a1a10';
  c.lineWidth = 2.5;
  roundRect(c, x, -h, w, h, 14);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-6, -2);
  c.lineTo(2, 12);
  c.lineTo(8, -2);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(-6, 0);
  c.lineTo(2, 12);
  c.lineTo(8, 0);
  c.stroke();
  c.fillStyle = '#1a120c';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(bub.text, x + w / 2, -h / 2 + 1);
  c.restore();
  c.globalAlpha = 1;
}
