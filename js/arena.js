import { rng } from './util.js';
import { star, ramHorns } from './draw.js';

// The arena: an aul in the steppe at sunset. Far layers move slower than the fighters (parallax).
// Everything is drawn with shapes, no images.

const TAU = Math.PI * 2;

export class Arena {
  constructor() {
    const r = rng(11);
    this.crowd = [];
    const looks = ['kalpak', 'scarf', 'borik', 'kid', 'cap', 'scarf', 'kalpak', 'kid', 'borik', 'takiya'];
    const coats = ['#3e5c8a', '#8a3e3e', '#4f7a4a', '#7a5a2e', '#5a3e7a', '#2e6a6a', '#9a6a2e', '#6a2e4a'];
    for (let x = -760, k = 0; x <= 760; x += 58 + r() * 26, k++) {
      this.crowd.push({ x, look: looks[k % looks.length], coat: coats[Math.floor(r() * coats.length)], h: 0.85 + r() * 0.25, ph: r() * TAU, row: k % 2 });
    }
    this.clouds = Array.from({ length: 5 }, (_, k) => ({ x: -900 + k * 420 + r() * 120, y: 300 + r() * 120, w: 160 + r() * 140 }));
    this.stars = Array.from({ length: 70 }, () => ({ x: r(), y: r() * r(), r: 1 + r() * 1.6, p: r() * 6 }));
    this.shout = null;
  }

  // view: { W, H, s (px per unit), camX, ground (screen y of the ground line), t }
  draw(c, v, m) {
    const { W, H, s, camX, ground } = v;
    const t = v.t;
    // sky
    const sky = c.createLinearGradient(0, 0, 0, ground);
    sky.addColorStop(0, '#2a1b48');
    sky.addColorStop(0.45, '#7d3a6e');
    sky.addColorStop(0.78, '#e2775a');
    sky.addColorStop(1, '#ffc27a');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, ground + 2);
    // first stars of the evening
    for (const st of this.stars) {
      const x = ((st.x * W * 1.4 - camX * s * 0.02) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2;
      const y = st.y * ground * 0.55;
      c.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin(t * 0.02 + st.p))) * (1 - st.y);
      c.fillStyle = '#fff6e0';
      c.fillRect(x, y, st.r * s, st.r * s);
    }
    c.globalAlpha = 1;

    const layer = (p, q, fn) => {
      c.save();
      c.translate(W / 2 - camX * s * p, ground - 34 * s);
      c.scale(s * q, s * q);
      fn();
      c.restore();
    };

    // sun with a glow, low over the mountains
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
      for (const cl of this.clouds) {
        const x = cl.x + ((t * 4) % 2600) - 600;
        c.fillStyle = 'rgba(255, 170, 160, 0.45)';
        c.beginPath();
        c.ellipse(x, -cl.y, cl.w, 13, 0, 0, TAU);
        c.ellipse(x + cl.w * 0.3, -cl.y - 10, cl.w * 0.5, 12, 0, 0, TAU);
        c.fill();
      }
    });

    // far mountains with snow, pink in the evening light
    layer(0.08, 0.85, () => {
      mountains(c, 1, -150, 230, '#6c4878', '#f2c6c8', 0.35);
    });
    layer(0.16, 0.9, () => {
      mountains(c, 2, -60, 150, '#523a68', null, 0);
    });
    // the steppe and far yurts, horses
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
    // near: a big yurt, a kazan on the fire, a hitching post
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

    // floor: trampled ground and the felt carpet the fight happens on
    const fy = ground - 34 * s;
    const floor = c.createLinearGradient(0, fy, 0, H);
    floor.addColorStop(0, '#9b7e52');
    floor.addColorStop(1, '#5e4a2e');
    c.fillStyle = floor;
    c.fillRect(0, fy, W, H - fy);

    c.save();
    c.translate(W / 2 - camX * s, ground);
    c.scale(s, s);
    carpet(c, s, H - ground);
    // spectators at the back edge of the carpet
    for (const p of this.crowd) spectator(c, p, t, m ? m.crowd : 0);
    c.restore();
  }
}

function mountains(c, seed, base, amp, color, snow, snowK) {
  const r = rng(seed * 31);
  const pts = [];
  for (let x = -2400; x <= 2400; x += 60) {
    const y = base - amp * (0.45 + 0.35 * Math.sin(x * 0.0021 + seed) + 0.2 * Math.sin(x * 0.0067 + seed * 2)) - r() * 12;
    pts.push([x, y]);
  }
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-2400, 40);
  for (const [x, y] of pts) c.lineTo(x, y);
  c.lineTo(2400, 40);
  c.closePath();
  c.fill();
  if (!snow) return;
  c.fillStyle = snow;
  for (let k = 1; k < pts.length - 1; k++) {
    const [x, y] = pts[k];
    if (y < base - amp * 0.72 && pts[k - 1][1] > y && pts[k + 1][1] >= y) {
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
}

function yurt(c, x, y, k, t) {
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  // walls and dome of white felt
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
  // ornament band
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
  // door
  c.fillStyle = '#c0472b';
  c.fillRect(-15, -42, 30, 42);
  c.strokeStyle = '#ffc94a';
  c.strokeRect(-12, -39, 24, 36);
  // shanyrak and a little smoke
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
  // tripod and the kazan
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
  // a hooded golden eagle on the perch
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

function carpet(c, s, below) {
  // felt carpet (syrmak): red field, dark border, ram-horn curls
  const back = -30;
  const front = below / s + 10;
  const half = 700;
  c.fillStyle = '#8f2a24';
  c.beginPath();
  c.moveTo(-half, back);
  c.lineTo(half, back);
  c.lineTo(half + 120, front);
  c.lineTo(-half - 120, front);
  c.closePath();
  c.fill();
  c.fillStyle = '#5c1714';
  c.fillRect(-half, back, half * 2, 8);
  c.strokeStyle = '#f0c35a';
  c.lineWidth = 3;
  c.lineCap = 'round';
  // a row of curls along the back edge
  for (let x = -half + 30; x < half; x += 60) {
    c.beginPath();
    c.moveTo(x - 14, back + 20);
    c.quadraticCurveTo(x - 14, back + 10, x - 6, back + 12);
    c.quadraticCurveTo(x, back + 15, x, back + 22);
    c.quadraticCurveTo(x, back + 15, x + 6, back + 12);
    c.quadraticCurveTo(x + 14, back + 10, x + 14, back + 20);
    c.stroke();
  }
  // a big curl medallion in the middle, flattened by perspective
  c.save();
  c.translate(0, 40);
  c.scale(1, 0.32);
  c.strokeStyle = 'rgba(240, 195, 90, 0.55)';
  c.lineWidth = 6;
  c.beginPath();
  c.arc(0, 0, 120, 0, TAU);
  c.stroke();
  ramHorns(c, 6);
  c.scale(1, -1);
  ramHorns(c, 6);
  c.restore();
  c.fillStyle = 'rgba(0,0,0,0.12)';
  c.fillRect(-half - 200, front - 30, half * 2 + 400, 40);
}

function spectator(c, p, t, excite) {
  const bounce = Math.max(0, Math.sin(t * (0.12 + excite * 0.2) + p.ph)) * (2 + excite * 14);
  const k = p.look === 'kid' ? 0.7 : p.h;
  c.save();
  c.translate(p.x, -32 - p.row * 6 - bounce);
  c.scale(0.62 * k, 0.62 * k);
  const dark = p.row ? 0.82 : 1;
  c.globalAlpha = 1;
  c.fillStyle = shadeHex(p.coat, dark * 0.9);
  // body and raised arms when excited
  c.beginPath();
  c.moveTo(-22, 0);
  c.lineTo(-18, -70);
  c.quadraticCurveTo(0, -80, 18, -70);
  c.lineTo(22, 0);
  c.closePath();
  c.fill();
  if (excite > 0.3) {
    c.strokeStyle = shadeHex(p.coat, dark * 0.9);
    c.lineWidth = 9;
    c.lineCap = 'round';
    const wave = Math.sin(t * 0.4 + p.ph) * 0.4;
    c.beginPath();
    c.moveTo(-16, -64);
    c.lineTo(-30 + wave * 10, -104);
    c.moveTo(16, -64);
    c.lineTo(30 - wave * 10, -104);
    c.stroke();
  }
  c.fillStyle = shadeHex('#e0a878', dark);
  c.beginPath();
  c.arc(0, -90, 15, 0, TAU);
  c.fill();
  hat(c, p.look, dark);
  c.restore();
}

function hat(c, look, dark) {
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
  } else if (look === 'takiya') {
    c.fillStyle = shadeHex('#2a3a6a', dark);
    c.beginPath();
    c.arc(0, -98, 13, Math.PI, TAU);
    c.fill();
  } else if (look === 'cap') {
    c.fillStyle = shadeHex('#d84a3a', dark);
    c.beginPath();
    c.arc(0, -98, 14, Math.PI, TAU);
    c.fill();
    c.fillRect(0, -100, 20, 4);
  } else {
    c.fillStyle = shadeHex('#2a1a12', dark);
    c.beginPath();
    c.arc(0, -96, 14, Math.PI * 1.05, Math.PI * 1.95);
    c.fill();
  }
}

function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`;
}

export { star };
