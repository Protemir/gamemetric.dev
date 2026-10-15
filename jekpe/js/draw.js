import { solve } from './pose.js';
import { TAU, shade, seg, dot, baursakAt, star, roundRect } from './paint.js';
import { LOOKS, businessCard, perchedEagle, kazan, whiteScarf, kese } from './looks.js';

// Fighters, props and effects, drawn in world space: x right, y down, ground at y = 0.

export { star, kazan };

// ---------- fighter ----------

export function drawFighter(c, f, opts = {}) {
  if (f.hidden) return;
  const b = f.def.body;
  const J = solve(f.pose, b);
  const pal = f.pal;
  const look = LOOKS[f.def.id] || LOOKS.batyr;
  c.save();
  c.translate(f.x, -f.y);
  if (!opts.noShadow) {
    const h = Math.min(1, f.y / 300);
    c.fillStyle = `rgba(0,0,0,${0.32 * (1 - h)})`;
    c.beginPath();
    c.ellipse(0, f.y, (b.w + 46) * (1 - h * 0.5), 9 * (1 - h * 0.5), 0, 0, TAU);
    c.fill();
  }
  c.translate(0, -J.lift);
  c.scale(f.face, 1);
  const dark = (col) => shade(col, 0.72);
  const same = (col) => col;

  look.arm(c, J, 'F', pal, dark, f);
  look.leg(c, J, 'F', pal, dark, f);
  if (look.back) look.back(c, J, pal, f);
  look.leg(c, J, 'N', pal, same, f);
  look.body(c, J, pal, b, f);
  drawHead(c, J, f, look, opts);
  look.arm(c, J, 'N', pal, same, f);
  // giving up: anyone can wave a white scarf
  if (f.state === 'flag') whiteScarf(c, J.handF, f.t);
  if (f.cup) kese(c, J.handF, f.t);

  if (f.flash > 0) {
    c.globalAlpha = f.flash / 8;
    c.strokeStyle = '#fff';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(J.headC[0], J.headC[1], b.head + 3, 0, TAU);
    c.stroke();
    c.globalAlpha = 1;
  }
  c.restore();

  const big = opts.bigHead ? 1.7 : 1;
  const hx = f.x + J.headC[0] * f.face;
  const hy = -f.y - J.lift + J.headC[1] - (big - 1) * b.head;
  if (['stun', 'dizzy', 'out'].includes(f.state) || (f.state === 'hit' && f.hp <= 0)) {
    stars(c, hx, hy - b.head * big - 14, opts.time || 0, f.state === 'out' ? 0.8 : 1);
  }
  if (f.state === 'dance' && f.dance > 2.2) {
    const tt = (opts.time || 0) * 0.08;
    for (let k = 0; k < 2; k++) {
      const ph = (tt + k * 0.5) % 1;
      drop(c, hx + (k ? 22 : -20) * f.face, hy - 10 + ph * 26, 1 - ph);
    }
  }
  if (f.meterT > 0) meter(c, hx, hy - b.head * big - 40, f);
  if (f.state === 'wrapped') {
    // under the quilt: only the feet stick out and the lump wriggles
    const w = Math.sin((opts.time || 0) * 0.5);
    c.save();
    c.translate(f.x, -f.y - 74);
    c.rotate(w * 0.08);
    quilt(c, 0, 0, 0, 1.85, true);
    c.restore();
  }
}

function drawHead(c, J, f, look, opts) {
  const r = f.def.body.head;
  const [x, y] = J.headC;
  const a = J.angles.head - Math.PI;
  c.save();
  c.translate(x, y);
  c.rotate(-a);
  if (opts.bigHead) {
    // "Бас-бас": a big head that still sits on the neck
    c.translate(0, -r * 0.7);
    c.scale(1.7, 1.7);
  }
  const md = mood(f);
  const talking = (!!f.bubble && f.bubble.t > 30 && Math.floor(f.bubble.t / 5) % 2 === 0) || f.state === 'yawn';
  look.head(c, r, f, md, talking);
  if (f.hood) hood(c, r);
  c.restore();
}

function mood(f) {
  const st = f.state;
  if (st === 'out' || st === 'ko' || st === 'blast' || (st === 'fall' && f.hp <= 0)) return 'x';
  if (st === 'stun' || st === 'dizzy' || (st === 'hit' && f.hp <= 0)) return 'spin';
  if (st === 'blush') return 'blush';
  if (st === 'sleep') return 'sleep';
  if (st === 'yawn') return 'sleep';
  if (['hit', 'fall', 'thrown', 'pulled', 'down', 'carried', 'blind', 'flag', 'wrapped'].includes(st)) return 'hurt';
  if (['win', 'clap', 'play', 'taunt', 'wave', 'keys', 'offer', 'thank', 'drink'].includes(st)) return 'happy';
  if (st === 'lose') return 'sad';
  if (st === 'dance') return f.dance > 2.6 ? 'hurt' : 'happy';
  if (st === 'attack' || st === 'special' || st === 'throwing') return 'angry';
  return 'calm';
}

// томаға: the little leather hood hunters put on an eagle
function hood(c, r) {
  c.fillStyle = '#7a4a26';
  c.beginPath();
  c.moveTo(-r * 1.0, r * 0.25);
  c.quadraticCurveTo(-r * 1.1, -r * 1.2, r * 0.1, -r * 1.15);
  c.quadraticCurveTo(r * 1.15, -r * 1.0, r * 1.1, r * 0.25);
  c.closePath();
  c.fill();
  c.strokeStyle = '#ffc94a';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-r * 1.0, r * 0.2);
  c.lineTo(r * 1.1, r * 0.2);
  c.stroke();
  c.fillStyle = '#e0392f';
  c.beginPath();
  c.ellipse(r * 0.05, -r * 1.35, r * 0.18, r * 0.35, 0.2, 0, TAU);
  c.fill();
}

function stars(c, x, y, t, s) {
  for (let k = 0; k < 3; k++) {
    const a = t * 0.12 + (k * TAU) / 3;
    star(c, x + Math.cos(a) * 26 * s, y + Math.sin(a) * 7 * s, 6.5 * s, Math.sin(a) > 0 ? '#ffe680' : '#ffc94a');
  }
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

// the taxi meter running over a rival's head
function meter(c, x, y, f) {
  const paid = Math.floor((300 - f.meterT) / 30) * 150 + 450;
  c.save();
  c.translate(x, y);
  c.fillStyle = '#1d1d22';
  roundRect(c, -34, -16, 68, 26, 6);
  c.fill();
  c.fillStyle = '#ffcc33';
  c.fillRect(-34, -16, 68, 6);
  c.fillStyle = '#7dff8a';
  c.font = '800 13px "Cascadia Mono", Consolas, monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(`${paid} ₸`, 0, 1);
  c.restore();
}

// ---------- lasso, projectiles, eagle, car ----------

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
  c.quadraticCurveTo((hx + lx) / 2, (hy + sy) / 2 + (L.out ? 18 : 6), lx, sy);
  c.stroke();
  c.lineWidth = 3.4;
  c.beginPath();
  c.ellipse(lx + f.face * 12, sy, 14, 22, 0, 0, TAU);
  c.stroke();
}

export function drawProjectile(c, p) {
  if (p.k === 'baursak') baursakAt(c, p.x, -p.y, p.spin);
  else if (p.k === 'card') businessCard(c, p.x, -p.y, p.spin);
  else if (p.k === 'wave') wave(c, p);
  else if (p.k === 'words') wordBubble(c, p);
  else if (p.k === 'stomp') quake(c, p);
  else if (p.k === 'eagle') drawEagle(c, { x: p.x, y: p.y, flap: p.t * 0.45, dive: p.phase === 'dive', dir: p.dir, scale: 0.62 });
  else if (p.k === 'melon') melon(c, p);
  else if (p.k === 'sheep') sheep(c, p);
  else if (p.k === 'weed') tumbleweed(c, p);
  else if (p.k === 'blanket') quilt(c, p.x, -p.y, p.spin, 1);
  else if (p.k === 'gust') gustProj(c, p);
  else if (p.k === 'horn') hornProj(c, p);
  else if (p.k === 'candy') candy(c, p);
  else if (p.k === 'boulder') boulder(c, p);
}

function wave(c, p) {
  c.save();
  c.translate(p.x, -p.y);
  c.scale(p.dir, 1);
  for (let k = 0; k < 3; k++) {
    const r = 16 + k * 13 + ((p.t * 2) % 13);
    c.strokeStyle = `rgba(159, 224, 255, ${0.85 - k * 0.22})`;
    c.lineWidth = 4 - k;
    c.beginPath();
    c.arc(-20, 0, r, -0.9, 0.9);
    c.stroke();
  }
  c.scale(p.dir, 1);
  c.fillStyle = '#ffe680';
  c.font = '900 22px "Segoe UI", system-ui, sans-serif';
  c.textAlign = 'center';
  c.fillText('♪', -p.dir * 8, -22 + Math.sin(p.t * 0.4) * 4);
  c.fillText('♫', p.dir * 10, 30 + Math.cos(p.t * 0.4) * 4);
  c.restore();
}

function wordBubble(c, p) {
  c.save();
  c.translate(p.x, -p.y);
  c.rotate(Math.sin(p.t * 0.3) * 0.08);
  c.font = '900 18px "Segoe UI", system-ui, sans-serif';
  const w = c.measureText(p.text).width + 22;
  c.fillStyle = '#fffaf0';
  c.strokeStyle = '#c0392b';
  c.lineWidth = 3;
  roundRect(c, -w / 2, -18, w, 34, 14);
  c.fill();
  c.stroke();
  c.fillStyle = '#c0392b';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(p.text, 0, 0);
  c.restore();
}

function quake(c, p) {
  // a ripple running along the ground with rocks hopping out of it
  c.save();
  c.translate(p.x, 0);
  c.fillStyle = '#8a6a44';
  c.beginPath();
  c.ellipse(0, 0, 46, 18 + Math.sin(p.t * 0.6) * 4, 0, Math.PI, TAU);
  c.fill();
  for (let k = 0; k < 4; k++) {
    const ph = (p.t * 0.12 + k * 0.25) % 1;
    c.fillStyle = k % 2 ? '#6b5236' : '#9b7e52';
    c.fillRect(-30 + k * 18, -10 - Math.sin(ph * Math.PI) * 40, 8, 8);
  }
  c.restore();
}

// көрпе: a quilted blanket with a red and gold pattern
function quilt(c, x, y, spin, k, draped) {
  c.save();
  c.translate(x, y);
  c.rotate(spin);
  c.scale(k, k);
  c.fillStyle = '#b3302a';
  c.beginPath();
  if (draped) {
    c.moveTo(-34, 28);
    c.quadraticCurveTo(-40, -30, -8, -40);
    c.quadraticCurveTo(30, -44, 36, -10);
    c.lineTo(38, 28);
    c.quadraticCurveTo(0, 36, -34, 28);
  } else {
    c.moveTo(-26, -16);
    c.lineTo(26, -16);
    c.quadraticCurveTo(30, 0, 26, 16);
    c.lineTo(-26, 16);
    c.quadraticCurveTo(-30, 0, -26, -16);
  }
  c.closePath();
  c.fill();
  c.strokeStyle = '#ffd25a';
  c.lineWidth = 2.5 / k;
  c.stroke();
  c.strokeStyle = 'rgba(255, 210, 90, 0.8)';
  c.lineWidth = 1.6 / k;
  for (let n = -2; n <= 2; n++) {
    c.beginPath();
    c.moveTo(n * 12 - 6, draped ? -30 : -12);
    c.lineTo(n * 12 + 6, draped ? 26 : 12);
    c.stroke();
  }
  c.restore();
}

function gustProj(c, p) {
  c.save();
  c.translate(p.x, -p.y);
  c.scale(p.dir, 1);
  c.strokeStyle = 'rgba(230, 245, 255, 0.85)';
  c.lineCap = 'round';
  for (let n = 0; n < 5; n++) {
    const y = -60 + n * 30;
    const o = ((p.t * 6 + n * 13) % 40) - 20;
    c.lineWidth = 4 - (n % 2);
    c.beginPath();
    c.moveTo(-50 + o, y);
    c.quadraticCurveTo(-10 + o, y - 16, 30 + o, y);
    c.quadraticCurveTo(44 + o, y + 6, 36 + o, y + 12);
    c.stroke();
  }
  // a couple of leaves caught in it
  c.fillStyle = '#7fbf4a';
  for (let n = 0; n < 2; n++) {
    c.save();
    c.translate(-10 + n * 30, -30 + n * 50);
    c.rotate(p.t * 0.4 + n);
    c.beginPath();
    c.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  c.restore();
}

function hornProj(c, p) {
  c.save();
  c.translate(p.x, -p.y);
  c.scale(p.dir, 1);
  for (let k = 0; k < 3; k++) {
    c.strokeStyle = `rgba(255, 210, 90, ${0.9 - k * 0.25})`;
    c.lineWidth = 4;
    c.beginPath();
    c.arc(-30, 0, 18 + k * 12 + ((p.t * 2) % 12), -0.8, 0.8);
    c.stroke();
  }
  c.scale(p.dir, 1);
  c.rotate(-0.1);
  c.font = '900 26px "Segoe UI", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = 6;
  c.strokeStyle = '#2a0f06';
  c.strokeText('БИИП!', p.dir * 10, -4);
  c.fillStyle = '#ffd25a';
  c.fillText('БИИП!', p.dir * 10, -4);
  c.restore();
}

function candy(c, p) {
  const cols = ['#ff6b9a', '#7fd4ff', '#ffd25a'];
  c.save();
  c.translate(p.x, -p.y);
  c.rotate(p.spin);
  c.fillStyle = cols[p.color % 3];
  c.beginPath();
  c.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(-8, 0);
  c.lineTo(-16, -6);
  c.lineTo(-16, 6);
  c.closePath();
  c.moveTo(8, 0);
  c.lineTo(16, -6);
  c.lineTo(16, 6);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.fillRect(-4, -3, 4, 2);
  c.restore();
}

function boulder(c, p) {
  c.save();
  c.translate(p.x, -p.y);
  c.rotate(p.spin);
  c.fillStyle = '#7d7468';
  c.beginPath();
  const pts = [[-30, -8], [-18, -28], [8, -32], [28, -14], [32, 10], [14, 30], [-14, 28], [-32, 12]];
  pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
  c.fillStyle = '#9a9184';
  c.beginPath();
  c.ellipse(-6, -10, 14, 9, -0.4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#5a5248';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(4, 2);
  c.lineTo(16, 14);
  c.moveTo(-14, 8);
  c.lineTo(-4, 18);
  c.stroke();
  c.restore();
}

function melon(c, p) {
  c.save();
  c.translate(p.x, -p.y - 26);
  c.rotate(p.spin);
  dot(c, [0, 0], 26, '#2f7a32');
  c.strokeStyle = '#1e5222';
  c.lineWidth = 4;
  for (let k = -2; k <= 2; k++) {
    c.beginPath();
    c.ellipse(0, 0, Math.abs(k) * 9 + 3, 26, 0, 0, TAU);
    c.stroke();
  }
  c.restore();
}

function tumbleweed(c, p) {
  c.save();
  c.translate(p.x, -p.y - 24);
  c.rotate(p.spin);
  c.strokeStyle = '#a8864e';
  c.lineWidth = 2;
  for (let k = 0; k < 10; k++) {
    c.beginPath();
    c.ellipse(0, 0, 24, 10 + (k % 3) * 5, k * 0.35, 0, TAU);
    c.stroke();
  }
  c.restore();
}

function sheep(c, p) {
  // a fluffy sheep running across the arena
  const legs = Math.sin(p.t * 0.6) * 0.5;
  c.save();
  c.translate(p.x, -p.y);
  c.scale(p.dir, 1);
  c.strokeStyle = '#2a2420';
  c.lineWidth = 5;
  c.lineCap = 'round';
  for (const [x, s] of [[-18, 1], [-8, -1], [12, 1], [22, -1]]) {
    c.beginPath();
    c.moveTo(x, -20);
    c.lineTo(x + legs * 12 * s, 0);
    c.stroke();
  }
  c.fillStyle = '#f2ece0';
  for (const [x, y, r] of [[-20, -36, 15], [-4, -42, 17], [12, -38, 15], [0, -30, 18], [20, -32, 13]]) dot(c, [x, y], r, '#f2ece0');
  c.fillStyle = '#2a2420';
  c.beginPath();
  c.ellipse(34, -40, 10, 8, 0.3, 0, TAU);
  c.fill();
  dot(c, [37, -43], 1.8, '#fff');
  c.restore();
}

export function drawEagle(c, e) {
  if (!e) return;
  const flap = e.dive ? 0.2 : Math.sin(e.flap) * 0.9;
  let dir = e.dir;
  if (dir == null) {
    dir = e.carry ? (e.x > (e.px ?? e.x) ? 1 : -1) : 1;
    e.px = e.x;
  }
  const k = e.scale || 1;
  c.save();
  c.translate(e.x, -e.y);
  c.scale(dir * k, k);
  if (e.dive) c.rotate(0.9);
  for (const s of [-1, 1]) {
    c.save();
    c.rotate(s * (0.15 + flap * 0.5));
    c.fillStyle = s < 0 ? '#4a2f1c' : '#5d3b22';
    c.beginPath();
    c.moveTo(0, 0);
    const span = e.dive ? 60 : 110;
    c.quadraticCurveTo(s * span * 0.45, -40, s * span, -18);
    c.lineTo(s * span * 0.87, -8);
    c.lineTo(s * span * 0.95, 2);
    c.lineTo(s * span * 0.78, 6);
    c.lineTo(s * span * 0.82, 14);
    c.quadraticCurveTo(s * 40, 16, 0, 12);
    c.closePath();
    c.fill();
    c.restore();
  }
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
  c.fillStyle = '#3e2716';
  c.beginPath();
  c.moveTo(-18, 4);
  c.lineTo(-42, 0);
  c.lineTo(-40, 14);
  c.closePath();
  c.fill();
  seg(c, [4, 16], [6, 30], 3, '#ffcf4d');
  seg(c, [-6, 16], [-6, 30], 3, '#ffcf4d');
  if (e.hood) {
    // carrying the little hood in its talons
    c.fillStyle = '#7a4a26';
    c.beginPath();
    c.arc(0, 36, 9, Math.PI, TAU);
    c.fill();
    dot(c, [0, 26], 3, '#e0392f');
  }
  c.restore();
}

// the white taxi, side view. heads show in the windows
export function drawCar(c, car) {
  if (!car) return;
  c.save();
  c.translate(car.x, 0);
  c.scale(car.dir, 1);
  const bump = car.moving ? Math.sin(car.t * 0.8) * 1.5 : 0;
  c.translate(0, bump);
  // body
  c.fillStyle = '#f4f4f2';
  c.beginPath();
  c.moveTo(-205, -38);
  c.quadraticCurveTo(-210, -82, -170, -88);
  c.lineTo(-110, -92);
  c.quadraticCurveTo(-80, -148, -10, -150);
  c.lineTo(60, -148);
  c.quadraticCurveTo(100, -140, 130, -96);
  c.lineTo(190, -86);
  c.quadraticCurveTo(212, -78, 210, -40);
  c.closePath();
  c.fill();
  c.fillStyle = '#dcdcd8';
  c.fillRect(-205, -52, 415, 14);
  // windows with whoever is inside
  c.fillStyle = '#3d4f63';
  c.beginPath();
  c.moveTo(-92, -94);
  c.quadraticCurveTo(-70, -136, -18, -138);
  c.lineTo(-18, -94);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(-6, -94);
  c.lineTo(-6, -138);
  c.lineTo(52, -136);
  c.quadraticCurveTo(88, -128, 112, -94);
  c.closePath();
  c.fill();
  for (const [who, wx] of [[car.back, -52], [car.front, 40]]) {
    if (!who) continue;
    const look = LOOKS[who.def.id] || LOOKS.batyr;
    c.save();
    c.beginPath();
    c.rect(-100, -140, 215, 48);
    c.clip();
    c.translate(wx, -112);
    c.scale(0.9, 0.9);
    look.head(c, who.def.body.head, { ...who, state: 'idle', t: car.t }, who === car.back ? 'hurt' : 'happy', car.t % 30 < 15);
    c.restore();
  }
  // door lines, handles, lights
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-12, -92);
  c.lineTo(-12, -42);
  c.moveTo(-110, -90);
  c.lineTo(-114, -44);
  c.moveTo(118, -92);
  c.lineTo(122, -44);
  c.stroke();
  c.fillStyle = '#9aa0a8';
  c.fillRect(-40, -78, 16, 4);
  c.fillRect(80, -78, 16, 4);
  c.fillStyle = '#ffe680';
  c.fillRect(196, -76, 12, 12);
  c.fillStyle = '#e0392f';
  c.fillRect(-206, -76, 8, 14);
  // the roof sign
  c.fillStyle = '#ffcc33';
  roundRect(c, -40, -172, 70, 22, 5);
  c.fill();
  c.fillStyle = '#1d1d22';
  c.font = '900 14px "Segoe UI", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('TAXI', -5, -160);
  // wheels
  for (const wx of [-130, 130]) {
    dot(c, [wx, -28], 30, '#1d1d22');
    dot(c, [wx, -28], 15, '#b8bec6');
    c.save();
    c.translate(wx, -28);
    c.rotate(car.wheel || 0);
    c.strokeStyle = '#7a828c';
    c.lineWidth = 3;
    for (let k = 0; k < 5; k++) {
      c.rotate(TAU / 5);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, 13);
      c.stroke();
    }
    c.restore();
  }
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
    c.fillStyle = e.color || '#e9d3a8';
    c.beginPath();
    c.arc(e.x, -e.y - k * 14, (10 + k * 22) * e.s, 0, TAU);
    c.fill();
    c.globalAlpha = 1;
  } else if (e.k === 'crumb') {
    c.fillStyle = e.color || '#e09a3a';
    c.fillRect(e.x - 3, -e.y - 3, 6, 6);
  } else if (e.k === 'word') {
    const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15) * 0.5);
    c.save();
    c.translate(e.x, -e.y - k * 30);
    c.rotate(-0.12);
    c.scale(pop * (e.size || 1), pop * (e.size || 1));
    c.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
    c.font = '900 34px "Segoe UI", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = 8;
    c.strokeStyle = '#2a0f06';
    c.strokeText(e.text, 0, 0);
    c.fillStyle = e.color || '#ffd25a';
    c.fillText(e.text, 0, 0);
    c.restore();
    c.globalAlpha = 1;
  } else if (e.k === 'coin') {
    c.save();
    c.translate(e.x, -e.y);
    c.globalAlpha = 1 - k;
    dot(c, [0, 0], 10, '#ffcf3a');
    c.strokeStyle = '#b8860b';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, 10, 0, TAU);
    c.stroke();
    c.fillStyle = '#8a5a00';
    c.font = '900 13px "Segoe UI", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('₸', 0, 1);
    c.restore();
    c.globalAlpha = 1;
  } else if (e.k === 'note' || e.k === 'zzz') {
    c.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
    c.fillStyle = e.k === 'zzz' ? '#cfe6ff' : e.color || '#9fe0ff';
    c.font = `900 ${e.k === 'zzz' ? 18 + k * 18 : 22}px "Segoe UI", system-ui, sans-serif`;
    c.textAlign = 'center';
    c.fillText(e.k === 'zzz' ? 'Z' : e.text || '♪', e.x + Math.sin(e.t * 0.15) * 8, -e.y);
    c.globalAlpha = 1;
  } else if (e.k === 'letter') {
    c.save();
    c.translate(e.x, -e.y);
    c.rotate(e.rot);
    c.font = '900 30px "Segoe UI", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 5;
    c.strokeStyle = '#2a0f06';
    c.strokeText(e.text, 0, 0);
    c.fillStyle = e.color;
    c.fillText(e.text, 0, 0);
    c.restore();
  } else if (e.k === 'twinkle') {
    const s = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7;
    c.save();
    c.translate(e.x, -e.y);
    c.rotate(e.t * 0.1);
    star(c, 0, 0, 22 * s + 2, '#fff6c2');
    c.restore();
  } else if (e.k === 'gust') {
    c.globalAlpha = 1 - k;
    c.strokeStyle = '#e8f6ff';
    c.lineWidth = 4;
    c.lineCap = 'round';
    for (let n = 0; n < 5; n++) {
      const y = -e.y - 60 + n * 30;
      const x0 = e.x + e.dir * (k * 500 + n * 20);
      c.beginPath();
      c.moveTo(x0, y);
      c.quadraticCurveTo(x0 + e.dir * 60, y - 14, x0 + e.dir * 120, y);
      c.stroke();
    }
    c.globalAlpha = 1;
  } else if (e.k === 'bubble') {
    bubbleAt(c, e.x, -e.y, e.text, e.scale || 1, Math.min(1, (e.life - e.t) / 12));
  } else if (e.k === 'confetti') {
    c.save();
    c.translate(e.x, -e.y);
    c.rotate(e.t * 0.2 + e.rot);
    c.fillStyle = e.color;
    c.fillRect(-4, -2, 8, 4);
    c.restore();
  }
}

export function bubbleAt(c, x, y, text, s, alpha, tailX = 0) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.globalAlpha = alpha;
  c.font = '800 17px "Segoe UI", system-ui, sans-serif';
  const w = c.measureText(text).width + 24;
  const h = 32;
  c.fillStyle = '#fffaf0';
  c.strokeStyle = '#2a1a10';
  c.lineWidth = 2.5;
  roundRect(c, -w / 2 + tailX, -h, w, h, 14);
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
  c.fillText(text, tailX, -h / 2 + 1);
  c.restore();
  c.globalAlpha = 1;
}

export function drawBubble(c, f, scale, bounds, raise = 0, bigHead = false) {
  const bub = f.bubble;
  if (!bub || f.hidden) return;
  const J = solve(f.pose, f.def.body);
  const hx = f.x + J.headC[0] * f.face;
  const big = bigHead ? 1.7 : 1;
  const top = -f.y - J.lift + J.headC[1] - f.def.body.head * (2 * big - 1) - 40;
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
  let x = f.face * 18;
  if (bounds) {
    // keep the bubble on screen, the tail still points at the head
    const k = s * (0.7 + appear * 0.3);
    const left = hx + (x - w / 2) * k;
    const right = hx + (x + w / 2) * k;
    if (left < bounds[0]) x += (bounds[0] - left) / k;
    if (right > bounds[1]) x -= (right - bounds[1]) / k;
  }
  c.restore();
  c.save();
  c.translate(hx, top);
  c.scale(s, s);
  c.translate(0, -raise);
  const sc = 0.7 + appear * 0.3;
  bubbleAt(c, 0, 0, bub.text, sc, Math.min(1, bub.t / 12), x);
  c.restore();
}

export { perchedEagle };
