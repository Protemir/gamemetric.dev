import { rng } from './util.js';
import { ramHorns, TAU } from './paint.js';

// Five arenas around Almaty, all drawn with shapes. Far layers move slower than the fighters.

export const ARENAS = [
  { id: 'aul', name: { ru: 'Ауыл на закате', en: 'Aul at sunset' }, note: { ru: 'Иногда пробегает баран', en: 'A sheep runs by now and then' } },
  { id: 'medeu', name: { ru: 'Медеу', en: 'Medeu ice rink' }, note: { ru: 'Скользко', en: 'Slippery' } },
  { id: 'koktobe', name: { ru: 'Көктөбе ночью', en: 'Kok-Tobe at night' }, note: { ru: 'Огни города внизу', en: 'City lights below' } },
  { id: 'charyn', name: { ru: 'Чарын', en: 'Charyn canyon' }, note: { ru: 'Катится перекати-поле', en: 'Tumbleweeds roll by' } },
  { id: 'bazaar', name: { ru: 'Базар', en: 'The bazaar' }, note: { ru: 'Катятся арбузы', en: 'Watermelons roll by' } },
  { id: 'astana', name: { ru: 'Астана, бульвар', en: 'Astana boulevard' }, note: { ru: 'Дует степной ветер', en: 'The steppe wind blows' } },
];

const LOOKS = {
  aul: ['kalpak', 'scarf', 'borik', 'kid', 'cap', 'scarf', 'kalpak', 'kid', 'borik', 'takiya'],
  medeu: ['beanie', 'beanie', 'kid', 'beanie', 'earflap', 'beanie', 'kid', 'earflap'],
  koktobe: ['cap', 'scarf', 'kid', 'phone', 'cap', 'takiya', 'phone', 'kid'],
  charyn: ['cap', 'panama', 'kid', 'panama', 'cap', 'scarf', 'panama', 'kid'],
  bazaar: ['scarf', 'takiya', 'apron', 'kid', 'scarf', 'apron', 'cap', 'kalpak'],
  astana: ['beanie', 'cap', 'scarf', 'phone', 'earflap', 'kid', 'beanie', 'takiya'],
};

export class Arena {
  constructor(id = 'aul') {
    this.id = ARENAS.some((a) => a.id === id) ? id : 'aul';
    const r = rng(11 + this.id.length * 7);
    this.crowd = [];
    const looks = LOOKS[this.id];
    const coats = this.id === 'medeu'
      ? ['#c0392b', '#2e86de', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400', '#2c3e50']
      : ['#3e5c8a', '#8a3e3e', '#4f7a4a', '#7a5a2e', '#5a3e7a', '#2e6a6a', '#9a6a2e', '#6a2e4a'];
    for (let x = -760, k = 0; x <= 760; x += 58 + r() * 26, k++) {
      this.crowd.push({ x, look: looks[k % looks.length], coat: coats[Math.floor(r() * coats.length)], h: 0.85 + r() * 0.25, ph: r() * TAU, row: k % 2 });
    }
    this.clouds = Array.from({ length: 5 }, (_, k) => ({ x: -900 + k * 420 + r() * 120, y: 300 + r() * 120, w: 160 + r() * 140 }));
    this.stars = Array.from({ length: 90 }, () => ({ x: r(), y: r() * r(), r: 1 + r() * 1.6, p: r() * 6 }));
    this.flakes = Array.from({ length: 70 }, () => ({ x: r(), y: r(), s: 0.5 + r(), p: r() * 6 }));
    this.city = Array.from({ length: 420 }, () => ({ x: (r() - 0.5) * 3400, y: r(), c: r() }));
    this.skaters = Array.from({ length: 4 }, (_, k) => ({ x: (r() - 0.5) * 1400, v: (r() < 0.5 ? -1 : 1) * (40 + r() * 50), c: coats[(k * 2) % coats.length], p: r() * 6 }));
    this.fireworks = [];
    // Astana: towers with lit windows and bits the wind carries around
    this.towers = Array.from({ length: 16 }, (_, k) => ({ x: -1500 + k * 190 + r() * 60, w: 50 + r() * 50, h: 120 + r() * 220, top: Math.floor(r() * 3), lit: r() }));
    this.bits = Array.from({ length: 40 }, () => ({ x: r(), y: r(), s: 0.6 + r(), p: r() * 6, leaf: r() < 0.6 }));
    this.wind = null;
  }

  burst(t) {
    const r = Math.random;
    for (let k = 0; k < 3; k++) this.fireworks.push({ x: (r() - 0.5) * 900, y: 380 + r() * 160, t0: t + k * 14, c: ['#ffd25a', '#ff6b9a', '#7fd4ff', '#9dff8a'][k % 4] });
  }

  // view: { W, H, s (px per unit), camX, ground (screen y of the ground line), t }
  draw(c, v, m) {
    const { W, H, s, camX, ground, t } = v;
    const th = THEMES[this.id];
    this.wind = m ? m.wind : null;
    const layer = (p, q, fn) => {
      c.save();
      c.translate(W / 2 - camX * s * p, ground - 34 * s);
      c.scale(s * q, s * q);
      fn();
      c.restore();
    };
    th.sky(c, v, this);
    th.back(c, v, this, layer);

    const fy = ground - 34 * s;
    const floor = c.createLinearGradient(0, fy, 0, H);
    floor.addColorStop(0, th.floor[0]);
    floor.addColorStop(1, th.floor[1]);
    c.fillStyle = floor;
    c.fillRect(0, fy, W, H - fy);
    c.save();
    c.translate(W / 2 - camX * s, ground);
    c.scale(s, s);
    th.ground(c, s, H - ground, t, this);
    for (const p of this.crowd) spectator(c, p, t, m ? m.crowd : 0);
    if (th.front) th.front(c, t, this);
    c.restore();
    if (th.weather) th.weather(c, v, this);
  }
}

// ---------- shared pieces ----------

function gradientSky(c, v, stops) {
  const g = c.createLinearGradient(0, 0, 0, v.ground);
  stops.forEach((col, k) => g.addColorStop(k / (stops.length - 1), col));
  c.fillStyle = g;
  c.fillRect(0, 0, v.W, v.ground + 2);
}

function nightStars(c, v, a) {
  const { W, s, camX, ground, t } = v;
  for (const st of a.stars) {
    const x = ((st.x * W * 1.4 - camX * s * 0.02) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2;
    const y = st.y * ground * 0.6;
    c.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin(t * 0.02 + st.p))) * (1 - st.y);
    c.fillStyle = '#fff6e0';
    c.fillRect(x, y, st.r * s, st.r * s);
  }
  c.globalAlpha = 1;
}

function moon(c, x, y, r, glow) {
  const g = c.createRadialGradient(x, y, r * 0.5, x, y, r * 4);
  g.addColorStop(0, glow);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  c.fillStyle = '#f4f0dc';
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
  c.fillStyle = 'rgba(180, 175, 150, 0.35)';
  c.beginPath();
  c.arc(x - r * 0.3, y - r * 0.2, r * 0.22, 0, TAU);
  c.arc(x + r * 0.25, y + r * 0.3, r * 0.15, 0, TAU);
  c.fill();
}

function mountains(c, seed, base, amp, color, snow, snowK, step = 60) {
  const r = rng(seed * 31);
  const pts = [];
  for (let x = -2600; x <= 2600; x += step) {
    const y = base - amp * (0.45 + 0.35 * Math.sin(x * 0.0021 + seed) + 0.2 * Math.sin(x * 0.0067 + seed * 2)) - r() * 12;
    pts.push([x, y]);
  }
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-2600, 60);
  for (const [x, y] of pts) c.lineTo(x, y);
  c.lineTo(2600, 60);
  c.closePath();
  c.fill();
  if (!snow) return pts;
  c.fillStyle = snow;
  for (let k = 1; k < pts.length - 1; k++) {
    const [x, y] = pts[k];
    if (y < base - amp * (0.72 - snowK * 0.3) && pts[k - 1][1] > y && pts[k + 1][1] >= y) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - 50, y + 32 * (1 + snowK));
      c.lineTo(x - 20, y + 24);
      c.lineTo(x, y + 34);
      c.lineTo(x + 22, y + 22);
      c.lineTo(x + 52, y + 32 * (1 + snowK));
      c.closePath();
      c.fill();
    }
  }
  return pts;
}

function spruce(c, x, y, h, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y - h);
  for (let k = 1; k <= 4; k++) {
    const yy = y - h + (h * k) / 4.2;
    const w = (h * 0.32 * k) / 4;
    c.lineTo(x + w, yy);
    c.lineTo(x + w * 0.45, yy - h * 0.04);
  }
  c.lineTo(x + h * 0.06, y);
  c.lineTo(x - h * 0.06, y);
  for (let k = 4; k >= 1; k--) {
    const yy = y - h + (h * k) / 4.2;
    const w = (h * 0.32 * k) / 4;
    c.lineTo(x - w * 0.45, yy - h * 0.04);
    c.lineTo(x - w, yy);
  }
  c.closePath();
  c.fill();
}

// ---------- aul ----------

function yurt(c, x, y, k, t) {
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.fillStyle = '#efe6d6';
  c.beginPath();
  c.moveTo(-70, 0);
  c.lineTo(-70, -50);
  c.quadraticCurveTo(-60, -100, 0, -108);
  c.quadraticCurveTo(60, -100, 70, -50);
  c.lineTo(70, 0);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(120, 80, 60, 0.18)';
  c.fillRect(-70, -50, 40, 50);
  c.fillStyle = '#b3302a';
  c.fillRect(-70, -56, 140, 9);
  c.strokeStyle = '#ffc94a';
  c.lineWidth = 2;
  for (let n = -60; n <= 60; n += 15) {
    c.beginPath();
    c.moveTo(n - 5, -51);
    c.quadraticCurveTo(n, -58, n + 5, -51);
    c.stroke();
  }
  c.fillStyle = '#c0472b';
  c.fillRect(-15, -42, 30, 42);
  c.strokeStyle = '#ffc94a';
  c.strokeRect(-12, -39, 24, 36);
  c.fillStyle = '#7a5530';
  c.fillRect(-12, -112, 24, 6);
  c.fillStyle = 'rgba(230, 220, 230, 0.35)';
  for (let n = 0; n < 3; n++) {
    const ph = ((t * 0.01 + n / 3) % 1);
    c.beginPath();
    c.arc(Math.sin(ph * 6 + n) * 6, -120 - ph * 70, 6 + ph * 10, 0, TAU);
    c.fill();
  }
  c.restore();
}

function horse(c, x, y, k, dir) {
  c.save();
  c.translate(x, y);
  c.scale(k * dir, k);
  c.fillStyle = '#3b2a22';
  c.beginPath();
  c.ellipse(0, -52, 36, 15, 0, 0, TAU);
  c.fill();
  c.beginPath();
  c.moveTo(26, -60);
  c.lineTo(46, -92);
  c.lineTo(60, -86);
  c.lineTo(36, -50);
  c.closePath();
  c.fill();
  c.fillRect(-28, -48, 6, 48);
  c.fillRect(-14, -48, 6, 48);
  c.fillRect(14, -48, 6, 48);
  c.fillRect(24, -48, 6, 48);
  c.beginPath();
  c.moveTo(-34, -56);
  c.quadraticCurveTo(-50, -40, -44, -22);
  c.lineWidth = 6;
  c.strokeStyle = '#2a1d17';
  c.stroke();
  c.restore();
}

function saxaul(c, x, y, k) {
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.strokeStyle = '#4a3a2c';
  c.lineWidth = 7;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(-6, -60);
  c.moveTo(-4, -40);
  c.lineTo(-40, -80);
  c.moveTo(-6, -58);
  c.lineTo(26, -96);
  c.stroke();
  c.fillStyle = '#5f6b3a';
  for (const [a, b, r] of [[-40, -90, 26], [24, -104, 30], [-8, -84, 24]]) {
    c.beginPath();
    c.arc(a, b, r, 0, TAU);
    c.fill();
  }
  c.restore();
}

function fire(c, x, y, t) {
  c.save();
  c.translate(x, y);
  c.strokeStyle = '#3a2a1e';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-50, 0);
  c.lineTo(0, -110);
  c.lineTo(50, 0);
  c.moveTo(0, -110);
  c.lineTo(0, -78);
  c.stroke();
  for (let n = 0; n < 4; n++) {
    const f = Math.sin(t * 0.3 + n * 1.7) * 6;
    c.fillStyle = n % 2 ? '#ff9a2e' : '#ffd24a';
    c.beginPath();
    c.moveTo(-26 + n * 16, 0);
    c.quadraticCurveTo(-30 + n * 16, -30 - f, -18 + n * 16 + f * 0.3, -46 - f);
    c.quadraticCurveTo(-8 + n * 16, -24, -10 + n * 16, 0);
    c.fill();
  }
  c.fillStyle = '#26262b';
  c.beginPath();
  c.ellipse(0, -60, 34, 24, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#3a3a42';
  c.beginPath();
  c.ellipse(0, -78, 32, 8, 0, 0, TAU);
  c.fill();
  c.fillStyle = 'rgba(240, 235, 240, 0.4)';
  for (let n = 0; n < 3; n++) {
    const ph = ((t * 0.012 + n / 3) % 1);
    c.beginPath();
    c.arc(Math.sin(ph * 5 + n * 2) * 10, -88 - ph * 90, 7 + ph * 12, 0, TAU);
    c.fill();
  }
  c.restore();
}

function eaglePerch(c, x, y) {
  c.save();
  c.translate(x, y);
  c.fillStyle = '#5a3d24';
  c.fillRect(-4, -96, 8, 96);
  c.fillRect(-26, -100, 52, 7);
  c.fillStyle = '#6b4526';
  c.beginPath();
  c.ellipse(0, -124, 17, 26, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#c99a4a';
  c.beginPath();
  c.arc(4, -152, 11, 0, TAU);
  c.fill();
  c.fillStyle = '#7a2a1e';
  c.beginPath();
  c.arc(4, -155, 9, Math.PI, TAU);
  c.fill();
  c.fillStyle = '#ffd25a';
  c.beginPath();
  c.moveTo(13, -152);
  c.lineTo(20, -148);
  c.lineTo(12, -145);
  c.fill();
  c.restore();
}

function post(c, x, y) {
  c.fillStyle = '#5a3d24';
  c.fillRect(x - 5, y - 70, 10, 70);
  c.fillRect(x - 60, y - 60, 120, 7);
}

function floorShape(c, s, below, color, half = 760) {
  const back = -30;
  const front = below / s + 10;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-half, back);
  c.lineTo(half, back);
  c.lineTo(half + 140, front);
  c.lineTo(-half - 140, front);
  c.closePath();
  c.fill();
  return { back, front, half };
}

function medallion(c, color, r = 120, horns = true) {
  c.save();
  c.translate(0, 40);
  c.scale(1, 0.32);
  c.strokeStyle = color;
  c.lineWidth = 6;
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.stroke();
  if (horns) {
    ramHorns(c, 6);
    c.scale(1, -1);
    ramHorns(c, 6);
  }
  c.restore();
}

function carpet(c, s, below) {
  const { back, front, half } = floorShape(c, s, below, '#8f2a24', 700);
  c.fillStyle = '#5c1714';
  c.fillRect(-half, back, half * 2, 8);
  c.strokeStyle = '#f0c35a';
  c.lineWidth = 3;
  c.lineCap = 'round';
  for (let x = -half + 30; x < half; x += 60) {
    c.beginPath();
    c.moveTo(x - 14, back + 20);
    c.quadraticCurveTo(x - 14, back + 10, x - 6, back + 12);
    c.quadraticCurveTo(x, back + 15, x, back + 22);
    c.quadraticCurveTo(x, back + 15, x + 6, back + 12);
    c.quadraticCurveTo(x + 14, back + 10, x + 14, back + 20);
    c.stroke();
  }
  medallion(c, 'rgba(240, 195, 90, 0.55)');
  c.fillStyle = 'rgba(0,0,0,0.12)';
  c.fillRect(-half - 200, front - 30, half * 2 + 400, 40);
}

// ---------- medeu ----------

function stands(c, x0, x1) {
  // the stadium stands climbing the slope, rows of blue seats
  c.fillStyle = '#4a5a78';
  c.beginPath();
  c.moveTo(x0, 0);
  c.lineTo(x0 + 120, -170);
  c.lineTo(x1 - 120, -170);
  c.lineTo(x1, 0);
  c.closePath();
  c.fill();
  for (let k = 0; k < 9; k++) {
    const y = -12 - k * 17;
    const inset = (k * 120) / 10;
    c.fillStyle = k % 2 ? '#2e6fb5' : '#2a62a0';
    c.fillRect(x0 + inset + 8, y - 8, x1 - x0 - inset * 2 - 16, 9);
  }
}

function floodlight(c, x) {
  c.fillStyle = '#2a3346';
  c.fillRect(x - 5, -330, 10, 330);
  c.fillStyle = '#3a4560';
  c.fillRect(x - 34, -360, 68, 34);
  const g = c.createRadialGradient(x, -343, 4, x, -343, 140);
  g.addColorStop(0, 'rgba(255, 252, 230, 0.9)');
  g.addColorStop(1, 'rgba(255, 252, 230, 0)');
  c.fillStyle = g;
  c.fillRect(x - 140, -483, 280, 280);
  c.fillStyle = 'rgba(255, 250, 220, 0.06)';
  c.beginPath();
  c.moveTo(x - 30, -330);
  c.lineTo(x + 30, -330);
  c.lineTo(x + 260, 40);
  c.lineTo(x - 260, 40);
  c.closePath();
  c.fill();
  c.fillStyle = '#fffbe6';
  for (let k = 0; k < 6; k++) c.fillRect(x - 30 + k * 10, -352, 7, 18);
}

function skater(c, x, color, t, dir) {
  c.save();
  c.translate(x, 0);
  c.scale(dir * 0.55, 0.55);
  const k = Math.sin(t * 0.08) * 0.4;
  c.strokeStyle = '#1f2a3a';
  c.lineWidth = 9;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -60);
  c.lineTo(-24 + k * 20, -4);
  c.moveTo(0, -60);
  c.lineTo(24 - k * 20, -4);
  c.stroke();
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(4, -88, 16, 32, 0.35, 0, TAU);
  c.fill();
  c.fillStyle = '#e8b48c';
  c.beginPath();
  c.arc(14, -124, 12, 0, TAU);
  c.fill();
  c.fillStyle = color;
  c.beginPath();
  c.arc(14, -128, 12, Math.PI, TAU);
  c.fill();
  c.restore();
}

function ice(c, s, below) {
  const back = -30;
  const front = below / s + 10;
  const half = 760;
  const g = c.createLinearGradient(0, back, 0, front);
  g.addColorStop(0, '#d8ecf8');
  g.addColorStop(1, '#a9cfe6');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-half, back);
  c.lineTo(half, back);
  c.lineTo(half + 140, front);
  c.lineTo(-half - 140, front);
  c.closePath();
  c.fill();
  // reflections of the floodlights
  c.fillStyle = 'rgba(255,255,255,0.35)';
  for (const x of [-520, -40, 470]) {
    c.beginPath();
    c.ellipse(x, 30, 90, 10, 0, 0, TAU);
    c.fill();
  }
  c.strokeStyle = 'rgba(200, 40, 40, 0.55)';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(0, back + 4);
  c.lineTo(0, front);
  c.stroke();
  c.strokeStyle = 'rgba(30, 90, 200, 0.45)';
  for (const x of [-420, 420]) {
    c.beginPath();
    c.moveTo(x, back + 4);
    c.lineTo(x * 1.18, front);
    c.stroke();
  }
  medallion(c, 'rgba(30, 90, 200, 0.45)', 110, false);
  // skate scratches
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = 1.5;
  const r = rng(4);
  for (let k = 0; k < 26; k++) {
    const x = (r() - 0.5) * 1400;
    const y = r() * 70;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 40, y - 6, x + 90, y + 2);
    c.stroke();
  }
  // the boards behind the crowd
  c.fillStyle = '#f2f6fa';
  c.fillRect(-half - 200, back - 40, half * 2 + 400, 30);
  c.fillStyle = '#2e6fb5';
  c.fillRect(-half - 200, back - 44, half * 2 + 400, 6);
}

// ---------- kok-tobe ----------

function tvTower(c, x, t) {
  c.strokeStyle = '#8a8fa6';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x - 40, 0);
  c.lineTo(x - 6, -420);
  c.moveTo(x + 40, 0);
  c.lineTo(x + 6, -420);
  for (let k = 0; k < 14; k++) {
    const y0 = -k * 30;
    const w0 = 40 - (k * 34) / 14;
    const w1 = 40 - ((k + 1) * 34) / 14;
    c.moveTo(x - w0, y0);
    c.lineTo(x + w1, y0 - 30);
    c.moveTo(x + w0, y0);
    c.lineTo(x - w1, y0 - 30);
  }
  c.moveTo(x, -420);
  c.lineTo(x, -560);
  c.stroke();
  c.fillStyle = '#aab0c4';
  c.fillRect(x - 18, -300, 36, 14);
  c.fillRect(x - 14, -430, 28, 12);
  const on = Math.floor(t / 30) % 2 === 0;
  for (const y of [-560, -430, -300]) {
    c.fillStyle = on ? '#ff3b3b' : '#7a1c1c';
    c.beginPath();
    c.arc(x, y, 5, 0, TAU);
    c.fill();
  }
}

function ferris(c, x, y, R, t) {
  c.strokeStyle = '#c9c9d6';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x - 50, 0);
  c.lineTo(x, y);
  c.lineTo(x + 50, 0);
  c.stroke();
  c.beginPath();
  c.arc(x, y, R, 0, TAU);
  c.stroke();
  const rot = t * 0.004;
  for (let k = 0; k < 12; k++) {
    const a = rot + (k / 12) * TAU;
    const px = x + Math.cos(a) * R;
    const py = y + Math.sin(a) * R;
    c.strokeStyle = 'rgba(200,200,214,0.6)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(px, py);
    c.stroke();
    c.fillStyle = ['#ff6b9a', '#ffd25a', '#7fd4ff', '#9dff8a'][k % 4];
    c.fillRect(px - 6, py, 12, 12);
  }
}

function deck(c, s, below) {
  const { back, front, half } = floorShape(c, s, below, '#6b4a30');
  c.strokeStyle = 'rgba(0,0,0,0.22)';
  c.lineWidth = 2;
  for (let y = back + 12; y < front; y += 18) {
    c.beginPath();
    c.moveTo(-half - 200, y);
    c.lineTo(half + 200, y);
    c.stroke();
  }
  c.fillStyle = 'rgba(255, 200, 120, 0.12)';
  c.beginPath();
  c.ellipse(0, 30, 520, 40, 0, 0, TAU);
  c.fill();
  // railing behind the crowd
  c.strokeStyle = '#3a2a1e';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-half - 200, back - 46);
  c.lineTo(half + 200, back - 46);
  c.stroke();
  for (let x = -half - 180; x < half + 200; x += 60) {
    c.beginPath();
    c.moveTo(x, back - 46);
    c.lineTo(x, back);
    c.stroke();
  }
}

function garland(c, t) {
  // string lights over the arena
  c.strokeStyle = 'rgba(30, 20, 30, 0.8)';
  c.lineWidth = 2;
  const pts = [];
  c.beginPath();
  for (let x = -900; x <= 900; x += 20) {
    const y = -420 + Math.pow((((x + 900) % 300) - 150) / 150, 2) * 50;
    pts.push([x, y]);
    c.lineTo(x, y);
  }
  c.stroke();
  pts.forEach(([x, y], k) => {
    if (k % 2) return;
    c.fillStyle = ['#ffd25a', '#ff6b9a', '#7fd4ff', '#9dff8a'][(k / 2) % 4];
    c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.05 + k);
    c.beginPath();
    c.arc(x, y + 6, 5, 0, TAU);
    c.fill();
  });
  c.globalAlpha = 1;
}

// ---------- charyn ----------

function mesa(c, x, w, h, cols) {
  // a table mountain with coloured bands
  c.save();
  c.beginPath();
  c.moveTo(x - w / 2 - 40, 0);
  c.lineTo(x - w / 2, -h);
  c.lineTo(x + w / 2, -h);
  c.lineTo(x + w / 2 + 40, 0);
  c.closePath();
  c.clip();
  for (let k = 0; k < cols.length; k++) {
    c.fillStyle = cols[k];
    c.fillRect(x - w / 2 - 60, -h + (k * h) / cols.length, w + 120, h / cols.length + 1);
  }
  c.restore();
}

function hoodoo(c, x, h, col) {
  // a rock pillar from the Valley of Castles
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x - 34, 0);
  c.quadraticCurveTo(x - 30, -h * 0.5, x - 18, -h * 0.8);
  c.quadraticCurveTo(x - 22, -h, x, -h);
  c.quadraticCurveTo(x + 22, -h, x + 18, -h * 0.8);
  c.quadraticCurveTo(x + 30, -h * 0.5, x + 34, 0);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.fillRect(x - 30, -h * 0.55, 60, 6);
  c.fillRect(x - 32, -h * 0.3, 64, 5);
}

function sand(c, s, below) {
  const { back } = floorShape(c, s, below, '#c4703f');
  const r = rng(9);
  c.strokeStyle = 'rgba(80, 30, 10, 0.25)';
  c.lineWidth = 2;
  for (let k = 0; k < 18; k++) {
    const x = (r() - 0.5) * 1400;
    const y = 4 + r() * 70;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 20, y + 6);
    c.lineTo(x + 34, y + 2);
    c.lineTo(x + 52, y + 9);
    c.stroke();
  }
  c.fillStyle = '#8a4a2a';
  for (let k = 0; k < 14; k++) {
    const x = (r() - 0.5) * 1500;
    c.beginPath();
    c.ellipse(x, back + 4 + r() * 6, 10 + r() * 14, 6, 0, 0, TAU);
    c.fill();
  }
}

// ---------- bazaar ----------

function stall(c, x, cols, goods) {
  c.fillStyle = '#6b4a30';
  c.fillRect(x - 90, -120, 8, 120);
  c.fillRect(x + 82, -120, 8, 120);
  // striped awning
  for (let k = 0; k < 6; k++) {
    c.fillStyle = cols[k % 2];
    c.beginPath();
    c.moveTo(x - 100 + k * 34, -150);
    c.lineTo(x - 66 + k * 34, -150);
    c.lineTo(x - 62 + k * 34, -116);
    c.lineTo(x - 96 + k * 34, -116);
    c.closePath();
    c.fill();
  }
  c.fillStyle = cols[0];
  for (let k = 0; k < 6; k++) {
    c.beginPath();
    c.arc(x - 81 + k * 34, -116, 17, 0, Math.PI);
    c.fill();
  }
  c.fillStyle = '#8a6040';
  c.fillRect(x - 96, -50, 192, 50);
  if (goods === 'melon') {
    for (let k = 0; k < 7; k++) {
      const gx = x - 70 + (k % 4) * 46 + (k > 3 ? 22 : 0);
      const gy = k > 3 ? -86 : -62;
      c.fillStyle = '#2f7a32';
      c.beginPath();
      c.arc(gx, gy, 20, 0, TAU);
      c.fill();
      c.strokeStyle = '#1e5222';
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(gx, gy, 8, 20, 0, 0, TAU);
      c.stroke();
    }
  } else if (goods === 'fruit') {
    const fc = ['#ff9a2e', '#e0392f', '#ffd25a', '#7a2a5a'];
    for (let k = 0; k < 18; k++) {
      c.fillStyle = fc[k % 4];
      c.beginPath();
      c.arc(x - 80 + (k % 9) * 20, -58 - Math.floor(k / 9) * 16, 9, 0, TAU);
      c.fill();
    }
  } else {
    // carpets hanging, mirror-symmetric pattern
    for (let k = 0; k < 2; k++) {
      c.fillStyle = k ? '#2b3d7a' : '#9a2a2a';
      c.fillRect(x - 80 + k * 84, -112, 76, 62);
      c.strokeStyle = '#f0c35a';
      c.lineWidth = 2;
      c.save();
      c.translate(x - 42 + k * 84, -78);
      ramHorns(c, 1.4);
      c.scale(1, -1);
      ramHorns(c, 1.4);
      c.restore();
    }
  }
}

function cobbles(c, s, below) {
  const { back, front, half } = floorShape(c, s, below, '#9a8f80');
  c.strokeStyle = 'rgba(60, 50, 40, 0.3)';
  c.lineWidth = 2;
  for (let y = back + 10, row = 0; y < front; y += 16, row++) {
    for (let x = -half - 200 + (row % 2) * 20; x < half + 200; x += 40) c.strokeRect(x, y, 38, 14);
  }
  medallion(c, 'rgba(255, 255, 255, 0.5)', 120, false);
}

function sign(c, x, y, text, bg) {
  c.fillStyle = bg;
  c.fillRect(x - 64, y - 22, 128, 34);
  c.fillStyle = '#fff';
  c.font = '900 22px "Segoe UI", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, x, y - 4);
}

// ---------- astana ----------

// a tall white tower like a tree holding a golden egg in its branches
function goldTower(c, x, t) {
  const top = -290;
  c.strokeStyle = '#e9edf3';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x - 30, 0);
  c.lineTo(x - 9, top);
  c.moveTo(x + 30, 0);
  c.lineTo(x + 9, top);
  for (let k = 0; k < 10; k++) {
    const y0 = -k * 29;
    const w0 = 30 - (k * 21) / 10;
    const w1 = 30 - ((k + 1) * 21) / 10;
    c.moveTo(x - w0, y0);
    c.lineTo(x + w1, y0 - 30);
    c.moveTo(x + w0, y0);
    c.lineTo(x - w1, y0 - 30);
  }
  c.stroke();
  // the crown: branches open up like fingers around the egg
  const egg = top - 70;
  c.lineWidth = 4;
  for (let n = -4; n <= 4; n++) {
    c.beginPath();
    c.moveTo(x + n * 2, top);
    c.quadraticCurveTo(x + n * 17, top - 30, x + n * 12, egg - 40 + Math.abs(n) * 9);
    c.stroke();
  }
  const glow = c.createRadialGradient(x, egg, 10, x, egg, 110);
  glow.addColorStop(0, 'rgba(255, 210, 110, 0.55)');
  glow.addColorStop(1, 'rgba(255, 200, 100, 0)');
  c.fillStyle = glow;
  c.fillRect(x - 110, egg - 110, 220, 220);
  const g = c.createRadialGradient(x - 10, egg - 12, 4, x, egg, 38);
  g.addColorStop(0, '#fff3b8');
  g.addColorStop(0.5, '#ffc93c');
  g.addColorStop(1, '#c78a12');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x, egg, 34, 38, 0, 0, TAU);
  c.fill();
  // the front branches over the egg
  c.strokeStyle = 'rgba(233, 237, 243, 0.85)';
  c.lineWidth = 3;
  for (const n of [-1.5, 0, 1.5]) {
    c.beginPath();
    c.moveTo(x + n * 2, top);
    c.quadraticCurveTo(x + n * 14, egg + 10, x + n * 10, egg - 30);
    c.stroke();
  }
  // a little red light on top for planes
  c.fillStyle = Math.floor(t / 40) % 2 ? '#ff3b3b' : '#7a1c1c';
  c.beginPath();
  c.arc(x, egg - 46, 4, 0, TAU);
  c.fill();
}

// a big leaning tent made of glass panels
function glassTent(c, x, t) {
  const h = 250;
  c.fillStyle = 'rgba(150, 190, 225, 0.55)';
  c.beginPath();
  c.moveTo(x - 130, 0);
  c.quadraticCurveTo(x - 40, -h * 0.55, x + 24, -h);
  c.quadraticCurveTo(x + 70, -h * 0.5, x + 140, 0);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(220, 240, 255, 0.45)';
  c.lineWidth = 1.5;
  for (let k = 1; k < 7; k++) {
    const y = -k * (h / 7);
    const half = 135 * (1 - k / 7.4);
    c.beginPath();
    c.moveTo(x + 24 * (k / 7) - half, y);
    c.lineTo(x + 24 * (k / 7) + half, y);
    c.stroke();
  }
  for (let k = -3; k <= 3; k++) {
    c.beginPath();
    c.moveTo(x + k * 40, 0);
    c.lineTo(x + 24, -h);
    c.stroke();
  }
  c.strokeStyle = '#d6dde6';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x + 24, -h);
  c.lineTo(x + 30, -h - 40);
  c.stroke();
  // lights inside come and go
  c.fillStyle = 'rgba(255, 220, 140, 0.35)';
  c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.02);
  c.beginPath();
  c.ellipse(x, -30, 70, 18, 0, 0, TAU);
  c.fill();
  c.globalAlpha = 1;
}

function tower(c, b, t) {
  const { x, w, h } = b;
  c.fillStyle = '#1b2547';
  c.beginPath();
  c.moveTo(x - w / 2, 0);
  c.lineTo(x - w / 2, -h);
  if (b.top === 1) c.lineTo(x, -h - 40);
  else if (b.top === 2) c.quadraticCurveTo(x, -h - 34, x + w / 2, -h);
  c.lineTo(x + w / 2, -h);
  c.lineTo(x + w / 2, 0);
  c.closePath();
  c.fill();
  for (let y = -h + 14; y < -12; y += 18) {
    for (let wx = x - w / 2 + 8; wx < x + w / 2 - 8; wx += 14) {
      const on = Math.sin(wx * 12.9 + y * 7.3 + b.lit * 50) > 0.1;
      if (!on) continue;
      c.fillStyle = (wx + y) % 3 > 1 ? '#ffd98a' : '#cfe3ff';
      c.fillRect(wx, y, 6, 8);
    }
  }
}

// a pennant on a pole that flaps with the wind
function pennant(c, x, t, w) {
  c.strokeStyle = '#c9ced8';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x, 0);
  c.lineTo(x, -150);
  c.stroke();
  const dir = w ? w.dir : 1;
  const k = w ? w.k : 0;
  const flap = Math.sin(t * (0.12 + k * 0.4) + x) * (6 + k * 6);
  const len = 46 + k * 24;
  c.fillStyle = Math.round(x / 300) % 2 ? '#2fa4d9' : '#ffc93c';
  c.beginPath();
  c.moveTo(x, -150);
  c.quadraticCurveTo(x + dir * len * 0.5, -150 + flap - 4 + (1 - k) * 10, x + dir * len, -136 + flap * 0.5 + (1 - k) * 22);
  c.lineTo(x, -112);
  c.closePath();
  c.fill();
}

function streetLamp(c, x, t) {
  c.strokeStyle = '#3a4466';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(x, 0);
  c.lineTo(x, -120);
  c.quadraticCurveTo(x, -132, x + 16, -132);
  c.stroke();
  const g = c.createRadialGradient(x + 18, -126, 2, x + 18, -126, 46);
  g.addColorStop(0, 'rgba(255, 230, 160, 0.8)');
  g.addColorStop(1, 'rgba(255, 220, 150, 0)');
  c.fillStyle = g;
  c.fillRect(x - 30, -175, 96, 96);
}

function granite(c, s, below) {
  const { back, front, half } = floorShape(c, s, below, '#8a919c');
  c.strokeStyle = 'rgba(40, 46, 60, 0.28)';
  c.lineWidth = 2;
  for (let y = back + 14; y < front; y += 26) {
    c.beginPath();
    c.moveTo(-half - 200, y);
    c.lineTo(half + 200, y);
    c.stroke();
  }
  for (let x = -half - 200; x < half + 200; x += 60) {
    c.beginPath();
    c.moveTo(x, back);
    c.lineTo(x * 1.12, front);
    c.stroke();
  }
  medallion(c, 'rgba(255, 215, 120, 0.5)', 120, true);
}

// ---------- themes ----------

const THEMES = {
  astana: {
    floor: ['#6d7480', '#454b56'],
    sky(c, v, a) {
      gradientSky(c, v, ['#0d1838', '#1f3a74', '#4a74b0', '#f0a76c']);
      nightStars(c, { ...v, ground: v.ground * 0.5 }, a);
    },
    back(c, v, a, layer) {
      const t = v.t;
      // flat steppe on the horizon, the city stands right in it
      layer(0.06, 0.9, () => {
        c.fillStyle = '#2a3a5e';
        c.fillRect(-2600, -40, 5200, 400);
        glassTent(c, 620, t);
      });
      layer(0.1, 0.8, () => {
        for (const b of a.towers) tower(c, b, t);
      });
      layer(0.16, 0.9, () => {
        goldTower(c, -300, t);
      });
      layer(0.4, 1, () => {
        c.fillStyle = '#1a2240';
        c.fillRect(-2600, -14, 5200, 400);
        for (let x = -1500; x <= 1500; x += 300) streetLamp(c, x, t);
        for (let x = -1350; x <= 1500; x += 300) pennant(c, x, t, a.wind);
      });
    },
    ground: (c, s, below) => granite(c, s, below),
    weather(c, v, a) {
      const w = a.wind;
      if (!w) return;
      // before the gust a few leaves start to move, then everything flies
      const k = Math.max(w.k, w.t < 40 ? w.t / 120 : 0);
      if (k <= 0) return;
      const speed = 6 + k * 22;
      c.strokeStyle = `rgba(230, 240, 255, ${0.35 * k})`;
      c.lineWidth = 2;
      for (const b of a.bits) {
        const x = ((b.x * v.W + w.dir * v.t * speed * b.s) % v.W + v.W) % v.W;
        const y = (b.y * v.H * 0.8 + Math.sin(v.t * 0.05 + b.p) * 30) % v.H;
        if (b.leaf) {
          c.fillStyle = b.p > 3 ? '#d9a33a' : '#a7c25a';
          c.save();
          c.translate(x, y);
          c.rotate(v.t * 0.2 * b.s + b.p);
          c.globalAlpha = Math.min(1, k * 1.5);
          c.beginPath();
          c.ellipse(0, 0, 6 * v.s * 0.8 + 2, 3 * v.s * 0.8 + 1, 0, 0, TAU);
          c.fill();
          c.restore();
          c.globalAlpha = 1;
        } else {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x - w.dir * (30 + 60 * k) * b.s, y);
          c.stroke();
        }
      }
    },
  },
  aul: {
    floor: ['#9b7e52', '#5e4a2e'],
    sky(c, v, a) {
      gradientSky(c, v, ['#2a1b48', '#7d3a6e', '#e2775a', '#ffc27a']);
      nightStars(c, { ...v, ground: v.ground * 0.7 }, a);
    },
    back(c, v, a, layer) {
      const t = v.t;
      layer(0.04, 0.9, () => {
        const g = c.createRadialGradient(160, -250, 20, 160, -250, 340);
        g.addColorStop(0, 'rgba(255,224,150,0.85)');
        g.addColorStop(0.25, 'rgba(255,190,110,0.35)');
        g.addColorStop(1, 'rgba(255,150,90,0)');
        c.fillStyle = g;
        c.fillRect(-700, -700, 1700, 900);
        c.fillStyle = '#ffe2a0';
        c.beginPath();
        c.arc(160, -250, 70, 0, TAU);
        c.fill();
        for (const cl of a.clouds) {
          const x = cl.x + ((t * 4) % 2600) - 600;
          c.fillStyle = 'rgba(255, 170, 160, 0.45)';
          c.beginPath();
          c.ellipse(x, -cl.y, cl.w, 13, 0, 0, TAU);
          c.ellipse(x + cl.w * 0.3, -cl.y - 10, cl.w * 0.5, 12, 0, 0, TAU);
          c.fill();
        }
      });
      layer(0.08, 0.85, () => mountains(c, 1, -150, 230, '#6c4878', '#f2c6c8', 0.35));
      layer(0.16, 0.9, () => mountains(c, 2, -60, 150, '#523a68', null, 0));
      layer(0.32, 0.95, () => {
        c.fillStyle = '#7a6a4a';
        c.fillRect(-2600, -40, 5200, 400);
        c.fillStyle = '#8c7a52';
        c.fillRect(-2600, -40, 5200, 8);
        for (const x of [-980, -560, 620, 1040]) yurt(c, x, -36, 0.55, t);
        for (const x of [-260, -200, 300, 360, 410]) horse(c, x, -36, 0.45, x % 2 ? -1 : 1);
        saxaul(c, 140, -36, 0.7);
        saxaul(c, -760, -36, 0.6);
      });
      layer(0.6, 1, () => {
        c.fillStyle = '#8a7148';
        c.fillRect(-2600, -12, 5200, 400);
        yurt(c, -560, -10, 1.2, t);
        yurt(c, 640, -10, 1.0, t);
        fire(c, 300, -10, t);
        eaglePerch(c, -150, -10);
        post(c, 960, -10);
        post(c, -1040, -10);
      });
    },
    ground: (c, s, below) => carpet(c, s, below),
  },
  medeu: {
    floor: ['#b9d6ea', '#8fb6d2'],
    sky(c, v, a) {
      gradientSky(c, v, ['#070e24', '#13234a', '#2c4677', '#4f6e9f']);
      nightStars(c, v, a);
      moon(c, v.W * 0.78, v.ground * 0.2, 26 * v.s * 0.6 + 8, 'rgba(200, 220, 255, 0.35)');
    },
    back(c, v, a, layer) {
      const t = v.t;
      layer(0.06, 0.85, () => mountains(c, 5, -160, 260, '#2a3c63', '#e6eefb', 0.6, 50));
      layer(0.14, 0.9, () => {
        mountains(c, 6, -60, 170, '#1f2f4f', '#c9d8ef', 0.2, 60);
        for (let x = -1800; x < 1800; x += 46) spruce(c, x, -40 + Math.sin(x) * 12, 80 + Math.abs(Math.sin(x * 0.7)) * 40, '#14262c');
      });
      layer(0.4, 0.95, () => {
        stands(c, -1500, -300);
        stands(c, 380, 1500);
        floodlight(c, -880);
        floodlight(c, 860);
      });
      layer(0.62, 1, () => {
        c.fillStyle = '#c5dcec';
        c.fillRect(-2600, -14, 5200, 400);
        for (const sk of a.skaters) {
          const x = ((((sk.x + sk.v * t * 0.05) % 2400) + 3600) % 2400) - 1200;
          skater(c, x, sk.c, t + sk.p * 40, Math.sign(sk.v));
        }
      });
    },
    ground: (c, s, below) => ice(c, s, below),
    weather(c, v, a) {
      // gentle snowfall in screen space
      c.fillStyle = 'rgba(255,255,255,0.8)';
      for (const f of a.flakes) {
        const y = (f.y * v.H + v.t * (0.6 + f.s) * 1.2) % v.H;
        const x = ((f.x * v.W + Math.sin(v.t * 0.02 + f.p) * 20 - v.camX * v.s * 0.3) % v.W + v.W) % v.W;
        c.beginPath();
        c.arc(x, y, (1 + f.s * 1.6) * Math.max(1, v.s * 0.6), 0, TAU);
        c.fill();
      }
    },
  },
  koktobe: {
    floor: ['#5a3e28', '#3a2818'],
    sky(c, v, a) {
      gradientSky(c, v, ['#0a0820', '#1a1440', '#33275e', '#5a3f74']);
      nightStars(c, v, a);
      moon(c, v.W * 0.2, v.ground * 0.18, 22 * v.s * 0.6 + 8, 'rgba(255, 240, 200, 0.3)');
      // fireworks after a knockout
      const now = v.t;
      a.fireworks = a.fireworks.filter((fw) => now - fw.t0 < 90);
      for (const fw of a.fireworks) {
        const k = (now - fw.t0) / 90;
        if (k < 0) continue;
        const cx = v.W / 2 + (fw.x - v.camX * 0.1) * v.s * 0.4;
        const cy = v.ground * (0.55 - fw.y / 1600);
        c.globalAlpha = 1 - k;
        c.fillStyle = fw.c;
        for (let n = 0; n < 16; n++) {
          const ang = (n / 16) * TAU;
          const r = k * 90 * v.s * 0.5 + 4;
          c.beginPath();
          c.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r + k * k * 30, 3 + v.s, 0, TAU);
          c.fill();
        }
      }
      c.globalAlpha = 1;
    },
    back(c, v, a, layer) {
      const t = v.t;
      layer(0.05, 0.85, () => mountains(c, 8, -140, 200, '#1c1838', '#3d3a63', 0.2));
      layer(0.12, 0.9, () => {
        tvTower(c, -620, t);
        // the cable car line and a cabin going up and down
        c.strokeStyle = 'rgba(200,200,220,0.5)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(-1600, -60);
        c.lineTo(900, -360);
        c.stroke();
        const k = (t * 0.0015) % 1;
        const cx = -1600 + 2500 * k;
        const cy = -60 - 300 * k;
        c.fillStyle = '#e04a3a';
        c.fillRect(cx - 14, cy + 8, 28, 22);
        c.fillStyle = '#ffe9a8';
        c.fillRect(cx - 10, cy + 12, 20, 8);
      });
      layer(0.25, 0.95, () => {
        // the city far below: a sea of lights
        c.fillStyle = '#120f28';
        c.fillRect(-2600, -70, 5200, 400);
        for (const p of a.city) {
          c.fillStyle = p.c < 0.6 ? '#ffd27a' : p.c < 0.85 ? '#fff2d0' : '#ff9a6a';
          c.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.01 + p.c * 20));
          c.fillRect(p.x, -64 + p.y * 56, 3, 3);
        }
        c.globalAlpha = 1;
      });
      layer(0.48, 1, () => {
        ferris(c, 760, -200, 150, t);
        c.fillStyle = '#2a1e30';
        c.fillRect(-2600, -14, 5200, 400);
        // the big apple on the hill
        c.fillStyle = '#c0392b';
        c.beginPath();
        c.arc(-300, -70, 52, 0, TAU);
        c.fill();
        c.fillStyle = '#5a3a1a';
        c.fillRect(-304, -134, 8, 20);
        c.fillStyle = '#4f9a3a';
        c.beginPath();
        c.ellipse(-280, -126, 18, 8, -0.4, 0, TAU);
        c.fill();
      });
    },
    ground: (c, s, below) => deck(c, s, below),
    front: (c, t) => garland(c, t),
  },
  charyn: {
    floor: ['#c4703f', '#8a4426'],
    sky(c, v) {
      gradientSky(c, v, ['#5fb0e6', '#9fd2f0', '#ffe2b0', '#ffc78a']);
    },
    back(c, v, a, layer) {
      const t = v.t;
      layer(0.04, 0.9, () => {
        c.fillStyle = '#fff3c8';
        c.beginPath();
        c.arc(-420, -360, 48, 0, TAU);
        c.fill();
        for (const cl of a.clouds) {
          const x = cl.x + ((t * 3) % 2600) - 600;
          c.fillStyle = 'rgba(255, 255, 255, 0.7)';
          c.beginPath();
          c.ellipse(x, -cl.y - 60, cl.w * 0.8, 16, 0, 0, TAU);
          c.ellipse(x + cl.w * 0.3, -cl.y - 74, cl.w * 0.45, 16, 0, 0, TAU);
          c.fill();
        }
      });
      layer(0.1, 0.9, () => {
        for (const [x, w, h] of [[-1300, 520, 260], [-640, 420, 300], [60, 600, 240], [820, 460, 290], [1500, 520, 250]]) {
          mesa(c, x, w, h, ['#b5532c', '#c96a3a', '#a8462a', '#d9844e', '#b85a32', '#9a3f26']);
        }
      });
      layer(0.22, 0.95, () => {
        c.fillStyle = '#9a4a2a';
        c.fillRect(-2600, -60, 5200, 400);
        c.fillStyle = '#3fb4b0';
        c.fillRect(-2600, -64, 5200, 6);
        for (const [x, h, col] of [[-900, 180, '#a64a2a'], [-760, 240, '#b8582f'], [-520, 160, '#9a4226'], [380, 220, '#b0522c'], [560, 260, '#a24826'], [900, 190, '#b85a32']]) hoodoo(c, x, h, col);
      });
      layer(0.6, 1, () => {
        c.fillStyle = '#b5612f';
        c.fillRect(-2600, -14, 5200, 400);
        // ash trees along the river
        for (const x of [-1100, -820, 760, 1080]) {
          c.fillStyle = '#5a3d24';
          c.fillRect(x - 6, -90, 12, 80);
          c.fillStyle = '#5f8a3a';
          c.beginPath();
          c.arc(x, -110, 44, 0, TAU);
          c.arc(x - 30, -86, 30, 0, TAU);
          c.arc(x + 30, -88, 32, 0, TAU);
          c.fill();
        }
      });
    },
    ground: (c, s, below) => sand(c, s, below),
  },
  bazaar: {
    floor: ['#a39886', '#6e6658'],
    sky(c, v) {
      gradientSky(c, v, ['#7cc4f2', '#b9e0f7', '#fff0c8', '#ffe2a0']);
    },
    back(c, v, a, layer) {
      layer(0.06, 0.88, () => mountains(c, 3, -170, 220, '#8fa6c2', '#ffffff', 0.4));
      layer(0.2, 0.95, () => {
        // the big market hall with an arched roof
        c.fillStyle = '#d9c9a8';
        c.fillRect(-700, -260, 1400, 260);
        c.fillStyle = '#4f8a6a';
        c.beginPath();
        c.moveTo(-740, -260);
        c.quadraticCurveTo(0, -420, 740, -260);
        c.closePath();
        c.fill();
        c.fillStyle = '#9fc6d9';
        for (let x = -640; x < 640; x += 90) c.fillRect(x, -220, 60, 90);
        c.fillStyle = '#c0392b';
        c.fillRect(-160, -300, 320, 40);
        c.fillStyle = '#fff';
        c.font = '900 30px "Segoe UI", system-ui, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('БАЗАР', 0, -280);
      });
      layer(0.55, 1, () => {
        c.fillStyle = '#8c8070';
        c.fillRect(-2600, -14, 5200, 400);
        stall(c, -1150, ['#e0392f', '#fff3e0'], 'melon');
        stall(c, -620, ['#2e86de', '#fff3e0'], 'fruit');
        stall(c, 620, ['#27ae60', '#fff3e0'], 'carpet');
        stall(c, 1150, ['#f39c12', '#fff3e0'], 'melon');
        sign(c, -880, -190, 'АРЗАН!', '#c0392b');
        sign(c, 880, -190, 'ҚАУЫН', '#27ae60');
      });
    },
    ground: (c, s, below) => cobbles(c, s, below),
  },
};

// ---------- the crowd ----------

function spectator(c, p, t, excite) {
  const bounce = Math.max(0, Math.sin(t * (0.12 + excite * 0.2) + p.ph)) * (2 + excite * 14);
  const k = p.look === 'kid' ? 0.7 : p.h;
  c.save();
  c.translate(p.x, -32 - p.row * 6 - bounce);
  c.scale(0.62 * k, 0.62 * k);
  const dark = p.row ? 0.82 : 1;
  const coat = shadeHex(p.coat, dark * 0.9);
  c.fillStyle = coat;
  c.beginPath();
  c.moveTo(-22, 0);
  c.lineTo(-18, -70);
  c.quadraticCurveTo(0, -80, 18, -70);
  c.lineTo(22, 0);
  c.closePath();
  c.fill();
  if (p.look === 'apron') {
    c.fillStyle = shadeHex('#f2ece0', dark);
    c.fillRect(-12, -50, 24, 46);
  }
  if (excite > 0.3 || p.look === 'phone') {
    c.strokeStyle = coat;
    c.lineWidth = 9;
    c.lineCap = 'round';
    const wave = Math.sin(t * 0.4 + p.ph) * 0.4;
    c.beginPath();
    c.moveTo(-16, -64);
    c.lineTo(-30 + wave * 10, -104);
    c.moveTo(16, -64);
    c.lineTo(30 - wave * 10, -104);
    c.stroke();
    if (p.look === 'phone') {
      // filming the fight, of course
      c.fillStyle = '#1d1d22';
      c.fillRect(24, -126, 14, 22);
      c.fillStyle = '#9fe0ff';
      c.fillRect(26, -123, 10, 15);
    }
  }
  c.fillStyle = shadeHex('#e0a878', dark);
  c.beginPath();
  c.arc(0, -90, 15, 0, TAU);
  c.fill();
  hat(c, p.look, dark, p.coat);
  c.restore();
}

function hat(c, look, dark, coat) {
  if (look === 'kalpak' || look === 'borik') {
    c.fillStyle = look === 'kalpak' ? shadeHex('#f2ece0', dark) : shadeHex('#7a2a2a', dark);
    c.beginPath();
    c.moveTo(-16, -96);
    c.quadraticCurveTo(0, -128, 16, -96);
    c.closePath();
    c.fill();
    c.fillStyle = look === 'kalpak' ? '#222' : shadeHex('#d9c7a0', dark);
    c.fillRect(-17, -100, 34, 6);
  } else if (look === 'scarf') {
    c.fillStyle = shadeHex('#e8e0f0', dark);
    c.beginPath();
    c.arc(0, -92, 17, Math.PI * 0.9, Math.PI * 2.1);
    c.fill();
  } else if (look === 'takiya' || look === 'apron') {
    c.fillStyle = shadeHex('#2a3a6a', dark);
    c.beginPath();
    c.arc(0, -98, 13, Math.PI, TAU);
    c.fill();
  } else if (look === 'cap' || look === 'phone') {
    c.fillStyle = shadeHex('#d84a3a', dark);
    c.beginPath();
    c.arc(0, -98, 14, Math.PI, TAU);
    c.fill();
    c.fillRect(0, -100, 20, 4);
  } else if (look === 'beanie' || look === 'earflap') {
    // a knitted hat with a pompom
    c.fillStyle = shadeHex(coat, dark * 1.1);
    c.beginPath();
    c.arc(0, -96, 16, Math.PI, TAU);
    c.fill();
    c.fillStyle = shadeHex('#ffffff', dark);
    c.fillRect(-16, -98, 32, 5);
    c.beginPath();
    c.arc(0, -114, 6, 0, TAU);
    c.fill();
    if (look === 'earflap') {
      c.fillStyle = shadeHex(coat, dark);
      c.fillRect(-17, -96, 6, 16);
      c.fillRect(11, -96, 6, 16);
    }
  } else if (look === 'panama') {
    c.fillStyle = shadeHex('#efe3c0', dark);
    c.fillRect(-22, -102, 44, 5);
    c.beginPath();
    c.arc(0, -102, 12, Math.PI, TAU);
    c.fill();
  } else {
    c.fillStyle = shadeHex('#2a1a12', dark);
    c.beginPath();
    c.arc(0, -96, 14, Math.PI * 1.05, Math.PI * 1.95);
    c.fill();
  }
}

function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.min(255, Math.round(((n >> 16) & 255) * k))},${Math.min(255, Math.round(((n >> 8) & 255) * k))},${Math.min(255, Math.round((n & 255) * k))})`;
}
