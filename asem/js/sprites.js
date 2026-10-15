import { roundRect, mix } from './util.js';
import { L } from './i18n.js';

const SANS = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

function fitText(c, text, size, max, weight = 800) {
  c.font = `${weight} ${size}px ${SANS}`;
  const width = c.measureText(text).width;
  if (width > max) {
    size *= max / width;
    c.font = `${weight} ${size}px ${SANS}`;
  }
  return size;
}

function tri(c, x1, y1, x2, y2, x3, y3) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.lineTo(x3, y3);
  c.closePath();
  c.fill();
}

// a soft light, drawn once per colour into a small canvas and then stretched
const glows = new Map();
function glow(c, x, y, r, color) {
  if (r < 1.5) return;
  let img = glows.get(color);
  if (!img) {
    img = document.createElement('canvas');
    img.width = img.height = 64;
    const gc = img.getContext('2d');
    const g = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    gc.fillStyle = g;
    gc.fillRect(0, 0, 64, 64);
    if (glows.size > 200) glows.clear();
    glows.set(color, img);
  }
  c.drawImage(img, x - r, y - r, r * 2, r * 2);
}

function speech(c, text, cx, bottom, w) {
  const size = Math.max(9, Math.min(26, w * 0.55));
  c.font = `800 ${size}px ${SANS}`;
  const tw = c.measureText(text).width;
  const bw = tw + size * 0.9;
  const bh = size * 1.5;
  const bx = cx - bw / 2;
  const by = bottom - bh;
  c.fillStyle = '#ffffff';
  roundRect(c, bx, by, bw, bh, bh / 2.4);
  c.fill();
  tri(c, cx - size * 0.3, by + bh - 1, cx + size * 0.2, by + bh - 1, cx - size * 0.1, by + bh + size * 0.5);
  c.fillStyle = '#16181d';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, cx, by + bh / 2 + 0.5);
}

// ---------- vehicles ----------

export const VEHICLES = {
  sedan: { ratio: 0.62, scale: 1, roof: 0.04, inset: 0.25, body: 0.36 },
  hatch: { ratio: 0.7, scale: 1, roof: 0.02, inset: 0.2, body: 0.4 },
  suv: { ratio: 0.8, scale: 1.05, roof: 0.0, inset: 0.14, body: 0.44 },
  niva: { ratio: 0.8, scale: 0.98, roof: 0.0, inset: 0.1, body: 0.46 },
  sport: { ratio: 0.5, scale: 1.04, roof: 0.16, inset: 0.3, body: 0.46 },
  lada: { ratio: 0.64, scale: 0.96, roof: 0.06, inset: 0.17, body: 0.44, light: 'square', chrome: true },
  gelik: { ratio: 0.92, scale: 1.08, roof: 0.0, inset: 0.05, body: 0.5, spare: true },
  electric: { ratio: 0.56, scale: 1.02, roof: 0.12, inset: 0.27, body: 0.46, light: 'bar' },
  // the friends' cars: a Kia sedan, a Kia Sorento, a Volkswagen hatch, a Skoda liftback, a Changan crossover
  kia: { ratio: 0.6, scale: 1, roof: 0.07, inset: 0.26, body: 0.42, light: 'bar' },
  sorento: { ratio: 0.84, scale: 1.08, roof: 0.0, inset: 0.12, body: 0.46, light: 'vertical', rails: true },
  golf: { ratio: 0.7, scale: 0.98, roof: 0.03, inset: 0.19, body: 0.42, light: 'wide' },
  octavia: { ratio: 0.62, scale: 1.02, roof: 0.06, inset: 0.25, body: 0.42, light: 'wide' },
  changan: { ratio: 0.76, scale: 1.03, roof: 0.02, inset: 0.15, body: 0.45, light: 'bar', spoiler: true },
  truck: { ratio: 1.15, scale: 1.25 },
  plow: { ratio: 1.15, scale: 1.25 },
  bus: { ratio: 1.05, scale: 1.25 },
};

// lighter (amount > 0) or darker (amount < 0) version of a color
const tint = (color, amount) => (amount >= 0 ? mix(color, '#ffffff', amount) : mix(color, '#000000', -amount));

export function drawVehicle(c, x, y, w, h, kind, color, o = {}) {
  const v = VEHICLES[kind] || VEHICLES.sedan;
  const lights = o.lights ?? 1;
  if (kind === 'truck' || kind === 'bus' || kind === 'plow') return drawBig(c, x, y, w, h, kind, color, o);
  const detail = w > 24;
  const bodyTop = y + h * v.body;
  const bodyBottom = y + h * 0.86;

  // a soft shadow on the asphalt
  if (w > 6) {
    const sg = c.createRadialGradient(x + w / 2, y + h * 0.95, w * 0.08, x + w / 2, y + h * 0.95, w * 0.62);
    sg.addColorStop(0, 'rgba(0,0,0,0.5)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sg;
    c.fillRect(x - w * 0.15, y + h * 0.8, w * 1.3, h * 0.32);
  }

  // tyres
  c.fillStyle = '#0c0d10';
  roundRect(c, x + w * 0.05, y + h * 0.68, w * 0.19, h * 0.32, w * 0.035);
  c.fill();
  roundRect(c, x + w * 0.76, y + h * 0.68, w * 0.19, h * 0.32, w * 0.035);
  c.fill();
  if (detail) {
    c.fillStyle = '#26292f';
    c.fillRect(x + w * 0.08, y + h * 0.9, w * 0.13, h * 0.025);
    c.fillRect(x + w * 0.79, y + h * 0.9, w * 0.13, h * 0.025);
  }

  // body: lit from above, darker towards the road
  if (detail) {
    const bg = c.createLinearGradient(0, bodyTop, 0, bodyBottom);
    bg.addColorStop(0, tint(color, 0.22));
    bg.addColorStop(0.35, color);
    bg.addColorStop(1, tint(color, -0.4));
    c.fillStyle = bg;
  } else {
    c.fillStyle = color;
  }
  roundRect(c, x, bodyTop, w, bodyBottom - bodyTop, h * 0.09);
  c.fill();
  // the flanks catch less light
  if (detail) {
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fillRect(x, bodyTop + h * 0.04, w * 0.06, bodyBottom - bodyTop - h * 0.08);
    c.fillRect(x + w * 0.94, bodyTop + h * 0.04, w * 0.06, bodyBottom - bodyTop - h * 0.08);
  }

  // cabin
  const roofY = y + h * v.roof;
  c.beginPath();
  c.moveTo(x + w * 0.1, bodyTop + h * 0.04);
  c.lineTo(x + w * v.inset, roofY + h * 0.02);
  c.quadraticCurveTo(x + w * 0.5, roofY - h * 0.02, x + w * (1 - v.inset), roofY + h * 0.02);
  c.lineTo(x + w * 0.9, bodyTop + h * 0.04);
  c.closePath();
  if (detail) {
    const cg = c.createLinearGradient(0, roofY, 0, bodyTop);
    cg.addColorStop(0, tint(color, 0.08));
    cg.addColorStop(1, tint(color, -0.28));
    c.fillStyle = cg;
  } else {
    c.fillStyle = tint(color, -0.18);
  }
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fillRect(x + w * (v.inset + 0.03), roofY + h * 0.005, w * (1 - 2 * v.inset - 0.06), Math.max(1, h * 0.02));

  // glass with a reflection of the sky
  const gTop = roofY + h * 0.06;
  const gBottom = bodyTop + h * 0.01;
  const gi = v.inset + 0.04;
  c.beginPath();
  c.moveTo(x + w * 0.16, gBottom);
  c.lineTo(x + w * gi, gTop);
  c.lineTo(x + w * (1 - gi), gTop);
  c.lineTo(x + w * 0.84, gBottom);
  c.closePath();
  if (detail) {
    const glass = c.createLinearGradient(0, gTop, 0, gBottom);
    glass.addColorStop(0, o.front ? '#4d6380' : mix('#3b4d66', '#121a28', lights));
    glass.addColorStop(1, o.front ? '#1c2636' : '#0d131d');
    c.fillStyle = glass;
  } else {
    c.fillStyle = o.front ? '#2a3a52' : '#141d2c';
  }
  c.fill();
  if (detail) {
    c.fillStyle = 'rgba(255,255,255,0.11)';
    c.beginPath();
    c.moveTo(x + w * (gi + 0.06), gTop);
    c.lineTo(x + w * (gi + 0.2), gTop);
    c.lineTo(x + w * 0.36, gBottom);
    c.lineTo(x + w * 0.24, gBottom);
    c.closePath();
    c.fill();
  }

  // bumper
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.fillRect(x, y + h * 0.73, w, h * 0.06);
  if (detail) {
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(x + w * 0.02, y + h * 0.73, w * 0.96, Math.max(1, h * 0.012));
  }

  if (o.front) {
    // oncoming: grille, headlights and their glare
    c.fillStyle = '#121418';
    roundRect(c, x + w * 0.3, bodyTop + h * 0.09, w * 0.4, h * 0.13, h * 0.03);
    c.fill();
    const lit = lights > 0.3;
    c.fillStyle = lit ? '#fff7e2' : '#dfe3e8';
    roundRect(c, x + w * 0.05, bodyTop + h * 0.09, w * 0.21, h * 0.09, h * 0.03);
    c.fill();
    roundRect(c, x + w * 0.74, bodyTop + h * 0.09, w * 0.21, h * 0.09, h * 0.03);
    c.fill();
    if (lit && w > 6) {
      glow(c, x + w * 0.15, bodyTop + h * 0.13, w * 0.6, `rgba(255,240,205,${0.6 * lights})`);
      glow(c, x + w * 0.85, bodyTop + h * 0.13, w * 0.6, `rgba(255,240,205,${0.6 * lights})`);
    }
    return;
  }

  // taillights: a dim lens with a bright core, glowing at night or when braking
  const on = o.braking ? 1 : 0;
  const lamp = (lx, ly, lw, lh) => {
    c.fillStyle = on ? '#ff3b30' : '#a3161c';
    c.fillRect(lx, ly, lw, lh);
    if (detail) {
      c.fillStyle = on ? '#ffd2c8' : 'rgba(255,120,110,0.55)';
      c.fillRect(lx + lw * 0.2, ly + lh * 0.3, lw * 0.6, Math.max(1, lh * 0.35));
    }
    if ((lights > 0.3 || on) && w > 12) glow(c, lx + lw / 2, ly + lh / 2, Math.max(lw, lh) * (on ? 1.6 : 1.1), on ? 'rgba(255,50,40,0.45)' : `rgba(255,40,40,${0.25 * lights})`);
  };
  const ly = bodyTop + h * 0.09;
  if (v.light === 'bar') lamp(x + w * 0.04, bodyTop + h * 0.1, w * 0.92, h * 0.06);
  else if (v.light === 'vertical') {
    lamp(x + w * 0.02, bodyTop - h * 0.02, w * 0.09, h * 0.24);
    lamp(x + w * 0.89, bodyTop - h * 0.02, w * 0.09, h * 0.24);
  } else if (v.light === 'wide') {
    lamp(x + w * 0.03, ly, w * 0.26, h * 0.08);
    lamp(x + w * 0.71, ly, w * 0.26, h * 0.08);
  } else if (v.light === 'square') {
    lamp(x + w * 0.03, bodyTop + h * 0.08, w * 0.22, h * 0.14);
    lamp(x + w * 0.75, bodyTop + h * 0.08, w * 0.22, h * 0.14);
    c.fillStyle = '#e8a33d';
    c.fillRect(x + w * 0.03, bodyTop + h * 0.08, w * 0.07, h * 0.14);
    c.fillRect(x + w * 0.9, bodyTop + h * 0.08, w * 0.07, h * 0.14);
  } else {
    lamp(x + w * 0.03, ly, w * 0.2, h * 0.09);
    lamp(x + w * 0.77, ly, w * 0.2, h * 0.09);
  }

  if (v.rails && w > 14) {
    c.fillStyle = '#2a2d33';
    c.fillRect(x + w * (v.inset + 0.02), roofY - Math.max(1, h * 0.03), w * 0.08, Math.max(1, h * 0.03));
    c.fillRect(x + w * (0.9 - v.inset), roofY - Math.max(1, h * 0.03), w * 0.08, Math.max(1, h * 0.03));
  }
  if (v.spoiler && w > 14) {
    c.fillStyle = tint(color, -0.1);
    c.fillRect(x + w * (v.inset - 0.02), roofY, w * (1 - 2 * v.inset + 0.04), Math.max(1, h * 0.05));
  }
  if (v.chrome && w > 14) {
    c.fillStyle = '#c9ced6';
    c.fillRect(x - w * 0.01, y + h * 0.74, w * 1.02, h * 0.05);
  }
  if (v.spare && w > 14) {
    c.fillStyle = '#121418';
    c.beginPath();
    c.arc(x + w / 2, bodyTop + h * 0.13, w * 0.15, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath();
    c.arc(x + w / 2, bodyTop + h * 0.13, w * 0.07, 0, Math.PI * 2);
    c.fill();
  }

  if (detail) {
    // a Kazakhstan number plate: white with the blue strip on the left
    const pw = w * 0.22;
    const ph = h * 0.075;
    const px = x + w / 2 - pw / 2;
    const py = y + h * (v.spare ? 0.8 : 0.61);
    c.fillStyle = '#eef0f3';
    c.fillRect(px, py, pw, ph);
    c.fillStyle = '#1f6fd1';
    c.fillRect(px, py, pw * 0.16, ph);
    if (w > 60) {
      c.fillStyle = '#2a2d33';
      for (let k = 0; k < 5; k++) c.fillRect(px + pw * (0.24 + k * 0.14), py + ph * 0.25, pw * 0.08, ph * 0.5);
    }
    // exhaust
    c.fillStyle = '#1a1b1f';
    c.beginPath();
    c.ellipse(x + w * 0.76, y + h * 0.83, w * 0.035, h * 0.022, 0, 0, Math.PI * 2);
    c.fill();
  }

  if (o.nitro && w > 10) {
    const fl = 0.6 + Math.random() * 0.6;
    c.fillStyle = 'rgba(255,170,60,0.85)';
    roundRect(c, x + w * 0.72, y + h * 0.82, w * 0.09, h * 0.1 * fl + h * 0.04, h * 0.04);
    c.fill();
    c.fillStyle = 'rgba(120,190,255,0.9)';
    roundRect(c, x + w * 0.735, y + h * 0.84, w * 0.06, h * 0.05 * fl + h * 0.02, h * 0.02);
    c.fill();
  }
}

function drawBig(c, x, y, w, h, kind, color, o) {
  const lights = o.lights ?? 1;
  c.fillStyle = 'rgba(0,0,0,0.32)';
  c.fillRect(x, y + h * 0.92, w, h * 0.08);
  c.fillStyle = '#0b0d10';
  c.fillRect(x + w * 0.06, y + h * 0.8, w * 0.16, h * 0.2);
  c.fillRect(x + w * 0.78, y + h * 0.8, w * 0.16, h * 0.2);
  if (kind === 'plow') {
    // an orange snowplow: striped back, a spreader throwing snow, a beacon on the roof
    const t = o.time || 0;
    if (w > 8 && !o.front) {
      c.fillStyle = 'rgba(235,240,248,0.55)';
      for (let k = 0; k < 5; k++) {
        const p = (t * 1.6 + k / 5) % 1;
        c.beginPath();
        c.ellipse(x + w * (0.5 + (k % 2 ? 1 : -1) * (0.3 + p * 0.5)), y + h * (0.9 - p * 0.25), w * (0.08 + p * 0.12), h * (0.04 + p * 0.06), 0, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.fillStyle = '#e8772e';
    roundRect(c, x, y + h * 0.1, w, h * 0.74, w * 0.04);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(x, y + h * 0.48, w, h * 0.05);
    if (o.front) {
      c.fillStyle = '#c9ced6';
      c.fillRect(x - w * 0.08, y + h * 0.72, w * 1.16, h * 0.16);
    } else if (w > 10) {
      const n = 8;
      for (let k = 0; k < n; k++) {
        c.fillStyle = k % 2 ? '#1d1f24' : '#f2c230';
        c.beginPath();
        c.moveTo(x + (w * k) / n, y + h * 0.84);
        c.lineTo(x + (w * (k + 1)) / n, y + h * 0.84);
        c.lineTo(x + (w * (k + 0.6)) / n, y + h * 0.76);
        c.lineTo(x + (w * (k - 0.4)) / n, y + h * 0.76);
        c.closePath();
        c.fill();
      }
    }
    const on = Math.sin(t * 9) > 0;
    c.fillStyle = on ? '#ffb020' : '#8a5a10';
    c.fillRect(x + w * 0.42, y + h * 0.02, w * 0.16, h * 0.08);
    if (on && w > 6) glow(c, x + w * 0.5, y + h * 0.06, w * 0.7, 'rgba(255,170,40,0.45)');
  } else if (kind === 'truck' && !o.front) {
    // cargo box seen from behind
    c.fillStyle = color;
    c.fillRect(x, y, w, h * 0.84);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(x + w * 0.495, y + h * 0.04, Math.max(1, w * 0.01), h * 0.76);
    c.fillRect(x, y + h * 0.78, w, h * 0.06);
  } else {
    c.fillStyle = color;
    roundRect(c, x, y, w, h * 0.86, w * 0.05);
    c.fill();
    c.fillStyle = o.front ? '#2a3a52' : '#141d2c';
    if (kind === 'bus' || o.front) c.fillRect(x + w * 0.06, y + h * 0.08, w * 0.88, h * (o.front ? 0.34 : 0.3));
    if (kind === 'truck') {
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(x, y + h * 0.5, w, h * 0.06);
    }
  }
  if (o.front) {
    c.fillStyle = '#121418';
    c.fillRect(x + w * 0.3, y + h * 0.56, w * 0.4, h * 0.16);
    c.fillStyle = lights > 0.3 ? '#fff6dc' : '#d9dde3';
    c.fillRect(x + w * 0.06, y + h * 0.62, w * 0.16, h * 0.08);
    c.fillRect(x + w * 0.78, y + h * 0.62, w * 0.16, h * 0.08);
    if (lights > 0.3 && w > 6) {
      glow(c, x + w * 0.14, y + h * 0.66, w * 0.45, `rgba(255,240,200,${0.55 * lights})`);
      glow(c, x + w * 0.86, y + h * 0.66, w * 0.45, `rgba(255,240,200,${0.55 * lights})`);
    }
  } else {
    if (w > 18 && lights > 0.3) {
      c.fillStyle = `rgba(255,40,40,${0.2 * lights})`;
      c.fillRect(x - w * 0.02, y + h * 0.66, w * 0.2, h * 0.14);
      c.fillRect(x + w * 0.82, y + h * 0.66, w * 0.2, h * 0.14);
    }
    c.fillStyle = '#b81f24';
    c.fillRect(x + w * 0.03, y + h * 0.7, w * 0.12, h * 0.06);
    c.fillRect(x + w * 0.85, y + h * 0.7, w * 0.12, h * 0.06);
    c.fillStyle = '#e8a33d';
    c.fillRect(x + w * 0.03, y + h * 0.77, w * 0.12, h * 0.03);
    c.fillRect(x + w * 0.85, y + h * 0.77, w * 0.12, h * 0.03);
  }
}

// ---------- roadside ----------
// Every sprite has a world size (w, h), a hit width as a share of w, and a draw(c, x, y, w, h, s, env).
// env: { time, night (0 day .. 1 night) }

export const SPRITES = {
  lamp: {
    w: 600, h: 2700, hit: 0.15,
    draw(c, x, y, w, h, s, env) {
      const poleW = Math.max(1, w * 0.06);
      const px = s.offset > 0 ? x + w * 0.88 : x + w * 0.06;
      c.fillStyle = '#272c37';
      c.fillRect(px, y + h * 0.03, poleW, h * 0.97);
      const headW = w * 0.24;
      const headX = s.offset > 0 ? x : x + w - headW;
      const armY = y + h * 0.03;
      const armH = Math.max(1, h * 0.012);
      c.fillRect(Math.min(px, headX), armY, Math.abs(px - headX) + poleW, armH);
      c.fillStyle = env.night > 0.3 ? '#ffd48c' : '#9aa3b3';
      c.fillRect(headX, armY + armH, headW, Math.max(1, h * 0.014));
      if (env.night > 0.3 && w > 4) {
        glow(c, headX + headW / 2, armY + armH * 2, w * 0.9, `rgba(255,196,120,${0.5 * env.night})`);
        // the cone of light falling to the ground
        const lx = headX + headW / 2;
        const cone = c.createLinearGradient(0, armY, 0, y + h);
        cone.addColorStop(0, `rgba(255,205,140,${0.18 * env.night})`);
        cone.addColorStop(1, 'rgba(255,205,140,0)');
        c.fillStyle = cone;
        c.beginPath();
        c.moveTo(lx - headW * 0.4, armY + armH * 2);
        c.lineTo(lx + headW * 0.4, armY + armH * 2);
        c.lineTo(lx + w * 0.75, y + h);
        c.lineTo(lx - w * 0.75, y + h);
        c.closePath();
        c.fill();
      }
    },
  },
  poplar: {
    w: 420, h: 2500, hit: 0.3,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = '#2a2119';
      c.fillRect(x + w * 0.45, y + h * 0.82, w * 0.1, h * 0.18);
      c.fillStyle = mix('#3d6b46', '#1a2f22', env.night);
      c.beginPath();
      c.ellipse(x + w / 2, y + h * 0.45, w * 0.46, h * 0.43, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = mix('#2c5236', '#13241a', env.night);
      c.beginPath();
      c.ellipse(x + w * 0.62, y + h * 0.48, w * 0.28, h * 0.38, 0, 0, Math.PI * 2);
      c.fill();
    },
  },
  apple: {
    w: 950, h: 1150, hit: 0.4,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = '#2e241a';
      c.fillRect(x + w * 0.45, y + h * 0.6, w * 0.1, h * 0.4);
      c.fillStyle = mix('#3f7348', '#1c3324', env.night);
      c.beginPath();
      c.ellipse(x + w / 2, y + h * 0.38, w * 0.48, h * 0.36, 0, 0, Math.PI * 2);
      c.fill();
      if (w > 16) {
        c.fillStyle = '#c23a30';
        const r = Math.max(1, w * 0.035);
        for (const [ax, ay] of [[0.3, 0.3], [0.55, 0.22], [0.7, 0.42], [0.42, 0.5], [0.22, 0.47], [0.6, 0.58]]) {
          c.beginPath();
          c.arc(x + w * ax, y + h * ay, r, 0, Math.PI * 2);
          c.fill();
        }
      }
    },
  },
  pine: {
    w: 820, h: 1800, hit: 0.35,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = '#2a2119';
      c.fillRect(x + w * 0.45, y + h * 0.85, w * 0.1, h * 0.15);
      const tiers = [[0.0, 0.42, 0.32], [0.24, 0.66, 0.42], [0.48, 0.88, 0.5]];
      const green = mix('#2a5a3c', '#15291e', env.night);
      const snow = mix('#f4f7fb', '#c3cede', env.night);
      const shadowSide = mix('#1d4a30', '#0f2016', env.night);
      for (const [top, bottom, half] of tiers) {
        c.fillStyle = green;
        tri(c, x + w / 2, y + h * top, x + w * (0.5 + half), y + h * bottom, x + w * (0.5 - half), y + h * bottom);
        c.fillStyle = shadowSide;
        tri(c, x + w / 2, y + h * top, x + w * (0.5 + half), y + h * bottom, x + w * 0.5, y + h * bottom);
        if (s.snow !== false) {
          c.fillStyle = snow;
          const k = top + (bottom - top) * 0.35;
          tri(c, x + w / 2, y + h * top, x + w * (0.5 + half * 0.35), y + h * k, x + w * (0.5 - half * 0.35), y + h * k);
        }
      }
    },
  },
  building: {
    w: 2400, h: 4000, hit: 0.95,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = mix(s.dayColor || '#6d7787', s.color || '#141a28', env.night);
      c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(255,255,255,0.06)';
      c.fillRect(x, y, w, Math.max(1, h * 0.012));
      if (w < 14) return;
      const cols = s.cols;
      const rows = s.rows;
      const cw = w / (cols + 1);
      const rh = h / (rows + 1);
      const ww = cw * 0.5;
      const wh = rh * 0.45;
      for (let r = 0; r < rows; r++) {
        for (let q = 0; q < cols; q++) {
          const lit = s.lit[r * cols + q];
          if (env.night > 0.4) {
            if (!lit) continue;
            c.fillStyle = lit === 1 ? '#f2c46c' : '#9fc0e8';
          } else {
            c.fillStyle = lit ? '#a9c3dc' : '#4f5d70';
          }
          c.fillRect(x + cw * (q + 0.75), y + rh * (r + 0.8), ww, wh);
        }
      }
    },
  },
  billboard: {
    w: 1500, h: 1350, hit: 0.9,
    draw(c, x, y, w, h, s) {
      c.fillStyle = '#272c37';
      c.fillRect(x + w * 0.2, y + h * 0.5, w * 0.05, h * 0.5);
      c.fillRect(x + w * 0.75, y + h * 0.5, w * 0.05, h * 0.5);
      c.fillStyle = '#0d1220';
      c.fillRect(x, y, w, h * 0.55);
      c.fillStyle = '#ffb547';
      c.fillRect(x, y, w, Math.max(1, h * 0.03));
      c.fillRect(x, y + h * 0.52, w, Math.max(1, h * 0.03));
      if (h < 14) return;
      fitText(c, L(s.label), h * 0.2, w * 0.86);
      c.fillStyle = '#f1f3f7';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(L(s.label), x + w / 2, y + h * 0.28);
    },
  },
  sign: {
    w: 900, h: 1250, hit: 0.3,
    draw(c, x, y, w, h, s) {
      c.fillStyle = '#5b6270';
      c.fillRect(x + w * 0.47, y + h * 0.4, w * 0.06, h * 0.6);
      c.fillStyle = s.color || '#1f6f4a';
      roundRect(c, x, y, w, h * 0.42, w * 0.05);
      c.fill();
      c.strokeStyle = '#eef1f6';
      c.lineWidth = Math.max(1, w * 0.02);
      roundRect(c, x + w * 0.04, y + h * 0.03, w * 0.92, h * 0.36, w * 0.04);
      c.stroke();
      if (h < 16) return;
      fitText(c, L(s.label), h * 0.13, w * 0.82, 700);
      c.fillStyle = '#eef1f6';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(L(s.label), x + w / 2, y + h * 0.21);
    },
  },
  rock: {
    w: 900, h: 480, hit: 0.8,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = s.color || mix('#6b7280', '#3d4555', env.night);
      c.beginPath();
      c.moveTo(x, y + h);
      c.lineTo(x + w * 0.12, y + h * 0.35);
      c.lineTo(x + w * 0.42, y);
      c.lineTo(x + w * 0.78, y + h * 0.2);
      c.lineTo(x + w, y + h);
      c.closePath();
      c.fill();
      if (s.snow !== false) {
        c.fillStyle = mix('#f4f7fb', '#b9c4d4', env.night);
        tri(c, x + w * 0.3, y + h * 0.13, x + w * 0.42, y, x + w * 0.62, y + h * 0.1);
      }
    },
  },
  snowbank: {
    w: 1400, h: 360, hit: 0.7,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = mix('#eef2f8', '#a9b5c7', env.night);
      c.beginPath();
      c.ellipse(x + w / 2, y + h, w / 2, h, 0, Math.PI, 0);
      c.fill();
    },
  },
  rail: {
    w: 700, h: 300, hit: 0.95,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = mix('#8a909b', '#4a505b', env.night);
      c.fillRect(x + w * 0.1, y + h * 0.3, w * 0.07, h * 0.7);
      c.fillRect(x + w * 0.83, y + h * 0.3, w * 0.07, h * 0.7);
      c.fillStyle = mix('#c9cdd4', '#7c838f', env.night);
      c.fillRect(x - w * 0.02, y + h * 0.2, w * 1.04, h * 0.3);
      if (env.night > 0.3 && w > 8) {
        c.fillStyle = '#ffcf5a';
        c.fillRect(x + w * 0.46, y + h * 0.27, w * 0.08, h * 0.15);
      }
    },
  },
  pylon: {
    w: 900, h: 3800, hit: 0.2,
    draw(c, x, y, w, h, s, env) {
      const steel = mix('#6b7280', '#30353f', env.night);
      c.strokeStyle = steel;
      c.lineWidth = Math.max(1, w * 0.04);
      const cx = x + w / 2;
      c.beginPath();
      c.moveTo(cx - w * 0.12, y + h);
      c.lineTo(cx - w * 0.04, y + h * 0.1);
      c.moveTo(cx + w * 0.12, y + h);
      c.lineTo(cx + w * 0.04, y + h * 0.1);
      for (let k = 0.25; k < 0.95; k += 0.15) {
        c.moveTo(cx - w * (0.04 + 0.08 * k), y + h * k);
        c.lineTo(cx + w * (0.04 + 0.08 * (k + 0.15)), y + h * (k + 0.15));
      }
      c.stroke();
      c.fillStyle = steel;
      c.fillRect(x, y + h * 0.08, w, Math.max(1, h * 0.025));
      c.fillStyle = mix('#3b4250', '#1c2029', env.night);
      c.fillRect(x + w * 0.02, y + h * 0.1, w * 0.06, h * 0.06);
      c.fillRect(x + w * 0.92, y + h * 0.1, w * 0.06, h * 0.06);
      if (s.chair && w > 10) {
        c.fillStyle = '#d24a3a';
        c.fillRect(x + w * 0.88, y + h * 0.17, w * 0.14, h * 0.05);
      }
    },
  },
  yurt: {
    w: 1400, h: 950, hit: 0.85,
    draw(c, x, y, w, h, s, env) {
      const felt = mix('#efe6d4', '#8e8a85', env.night * 0.8);
      c.fillStyle = felt;
      c.fillRect(x + w * 0.05, y + h * 0.42, w * 0.9, h * 0.58);
      c.beginPath();
      c.moveTo(x + w * 0.02, y + h * 0.45);
      c.quadraticCurveTo(x + w / 2, y - h * 0.15, x + w * 0.98, y + h * 0.45);
      c.closePath();
      c.fill();
      c.fillStyle = '#a8392f';
      c.fillRect(x + w * 0.05, y + h * 0.5, w * 0.9, Math.max(1, h * 0.06));
      c.fillStyle = '#c88a2d';
      c.fillRect(x + w * 0.05, y + h * 0.58, w * 0.9, Math.max(1, h * 0.025));
      c.fillStyle = '#6b3f22';
      c.fillRect(x + w * 0.42, y + h * 0.66, w * 0.16, h * 0.34);
      if (env.night > 0.3 && w > 8) {
        c.fillStyle = 'rgba(255,190,110,0.8)';
        c.fillRect(x + w * 0.45, y + h * 0.7, w * 0.1, h * 0.3);
      }
    },
  },
  camel: {
    w: 1100, h: 950, hit: 0.6,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = mix('#b08a58', '#4a3a2a', env.night);
      const flip = s.offset < 0 ? -1 : 1;
      const X = (k) => x + w * (flip > 0 ? k : 1 - k);
      c.beginPath();
      c.ellipse(X(0.45), y + h * 0.5, w * 0.3, h * 0.17, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(X(0.36), y + h * 0.36, w * 0.1, h * 0.12, 0, 0, Math.PI * 2);
      c.ellipse(X(0.55), y + h * 0.36, w * 0.1, h * 0.12, 0, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = Math.max(1, w * 0.05);
      c.strokeStyle = c.fillStyle;
      c.beginPath();
      c.moveTo(X(0.72), y + h * 0.48);
      c.quadraticCurveTo(X(0.86), y + h * 0.3, X(0.86), y + h * 0.14);
      c.stroke();
      c.beginPath();
      c.ellipse(X(0.9), y + h * 0.14, w * 0.07, h * 0.05, 0, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = Math.max(1, w * 0.035);
      c.beginPath();
      for (const k of [0.24, 0.32, 0.58, 0.66]) {
        c.moveTo(X(k), y + h * 0.6);
        c.lineTo(X(k), y + h);
      }
      c.stroke();
    },
  },
  saxaul: {
    w: 900, h: 650, hit: 0.5,
    draw(c, x, y, w, h, s, env) {
      c.strokeStyle = mix('#7a5c3c', '#3a2c20', env.night);
      c.lineWidth = Math.max(1, w * 0.04);
      c.beginPath();
      c.moveTo(x + w * 0.5, y + h);
      c.lineTo(x + w * 0.45, y + h * 0.55);
      c.lineTo(x + w * 0.25, y + h * 0.3);
      c.moveTo(x + w * 0.46, y + h * 0.6);
      c.lineTo(x + w * 0.7, y + h * 0.28);
      c.stroke();
      c.fillStyle = mix('#8a9a58', '#3c4428', env.night);
      for (const [ax, ay, r] of [[0.25, 0.28, 0.17], [0.7, 0.26, 0.19], [0.5, 0.2, 0.15]]) {
        c.beginPath();
        c.ellipse(x + w * ax, y + h * ay, w * r, h * r * 0.9, 0, 0, Math.PI * 2);
        c.fill();
      }
    },
  },
  turbine: {
    w: 1400, h: 4600, hit: 0.1,
    draw(c, x, y, w, h, s, env) {
      const cx = x + w / 2;
      const hub = y + h * 0.3;
      c.fillStyle = mix('#e6e9ef', '#7e8594', env.night);
      c.beginPath();
      c.moveTo(cx - w * 0.03, y + h);
      c.lineTo(cx - w * 0.015, hub);
      c.lineTo(cx + w * 0.015, hub);
      c.lineTo(cx + w * 0.03, y + h);
      c.closePath();
      c.fill();
      const a0 = (env.time * 1.4 + (s.phase || 0)) % (Math.PI * 2);
      const len = w * 0.48;
      for (let k = 0; k < 3; k++) {
        const a = a0 + (k * Math.PI * 2) / 3;
        c.save();
        c.translate(cx, hub);
        c.rotate(a);
        c.beginPath();
        c.moveTo(0, -w * 0.012);
        c.lineTo(len, -w * 0.02);
        c.lineTo(len, 0);
        c.lineTo(0, w * 0.012);
        c.closePath();
        c.fill();
        c.restore();
      }
      c.beginPath();
      c.arc(cx, hub, Math.max(1, w * 0.025), 0, Math.PI * 2);
      c.fill();
      if (env.night > 0.3 && w > 4) {
        c.fillStyle = '#ff3b30';
        c.fillRect(cx - w * 0.01, hub - h * 0.008, w * 0.02, h * 0.008);
      }
    },
  },
  pole: {
    w: 500, h: 2300, hit: 0.15,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = mix('#6e5a44', '#2e261d', env.night);
      c.fillRect(x + w * 0.46, y, w * 0.08, h);
      c.fillRect(x, y + h * 0.06, w, Math.max(1, h * 0.02));
      c.fillStyle = mix('#cfd4dc', '#5a606b', env.night);
      for (const k of [0.05, 0.3, 0.7, 0.95]) c.fillRect(x + w * k - w * 0.02, y + h * 0.04, w * 0.04, h * 0.02);
    },
  },
  reeds: {
    w: 800, h: 520, hit: 0.3,
    draw(c, x, y, w, h, s, env) {
      c.strokeStyle = mix('#a39255', '#454028', env.night);
      c.lineWidth = Math.max(1, w * 0.018);
      c.beginPath();
      for (let k = 0; k < 9; k++) {
        const bx = x + w * (0.1 + k * 0.1);
        c.moveTo(bx, y + h);
        c.quadraticCurveTo(bx + w * 0.03, y + h * 0.5, bx + w * ((k % 3) - 1) * 0.05, y + h * (0.05 + (k % 4) * 0.08));
      }
      c.stroke();
    },
  },
  hoodoo: {
    w: 1100, h: 2700, hit: 0.7,
    draw(c, x, y, w, h, s, env) {
      const base = mix(s.color || '#b9573c', '#4a2a22', env.night);
      c.fillStyle = base;
      c.beginPath();
      c.moveTo(x + w * 0.1, y + h);
      c.lineTo(x + w * 0.2, y + h * 0.45);
      c.lineTo(x + w * 0.12, y + h * 0.3);
      c.lineTo(x + w * 0.3, y + h * 0.12);
      c.lineTo(x + w * 0.62, y + h * 0.05);
      c.lineTo(x + w * 0.85, y + h * 0.2);
      c.lineTo(x + w * 0.78, y + h * 0.5);
      c.lineTo(x + w * 0.92, y + h);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.16)';
      c.beginPath();
      c.moveTo(x + w * 0.55, y + h * 0.06);
      c.lineTo(x + w * 0.85, y + h * 0.2);
      c.lineTo(x + w * 0.78, y + h * 0.5);
      c.lineTo(x + w * 0.92, y + h);
      c.lineTo(x + w * 0.6, y + h);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,230,200,0.12)';
      for (let k = 0.2; k < 0.95; k += 0.17) c.fillRect(x + w * 0.15, y + h * k, w * 0.7, Math.max(1, h * 0.012));
    },
  },
  cliff: {
    w: 4200, h: 2400, hit: 1,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = mix(s.color || '#a84c35', '#3d2420', env.night);
      c.beginPath();
      c.moveTo(x, y + h);
      c.lineTo(x + w * 0.04, y + h * 0.2);
      c.lineTo(x + w * 0.2, y + h * 0.06);
      c.lineTo(x + w * 0.55, y);
      c.lineTo(x + w * 0.8, y + h * 0.1);
      c.lineTo(x + w * 0.97, y + h * 0.3);
      c.lineTo(x + w, y + h);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,225,190,0.13)';
      for (let k = 0.18; k < 1; k += 0.14) c.fillRect(x + w * 0.03, y + h * k, w * 0.94, Math.max(1, h * 0.015));
      c.fillStyle = 'rgba(0,0,0,0.14)';
      c.fillRect(x + w * 0.62, y + h * 0.08, w * 0.38, h * 0.92);
    },
  },
  shrub: {
    w: 700, h: 380, hit: 0.4,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = mix(s.color || '#8a8a52', '#38382a', env.night);
      c.beginPath();
      c.ellipse(x + w * 0.35, y + h * 0.65, w * 0.3, h * 0.38, 0, 0, Math.PI * 2);
      c.ellipse(x + w * 0.65, y + h * 0.6, w * 0.32, h * 0.42, 0, 0, Math.PI * 2);
      c.fill();
    },
  },
  ash: {
    w: 1300, h: 1900, hit: 0.35,
    draw(c, x, y, w, h, s, env) {
      c.fillStyle = '#4a3a2a';
      c.fillRect(x + w * 0.46, y + h * 0.55, w * 0.08, h * 0.45);
      const g1 = mix('#5f8f3e', '#22331c', env.night);
      const g2 = mix('#4a7a32', '#1a2a16', env.night);
      c.fillStyle = g1;
      for (const [ax, ay, rx, ry] of [[0.5, 0.32, 0.42, 0.3], [0.3, 0.45, 0.25, 0.2], [0.7, 0.42, 0.27, 0.22]]) {
        c.beginPath();
        c.ellipse(x + w * ax, y + h * ay, w * rx, h * ry, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = g2;
      c.beginPath();
      c.ellipse(x + w * 0.62, y + h * 0.36, w * 0.22, h * 0.2, 0, 0, Math.PI * 2);
      c.fill();
    },
  },

  // ---------- the funny stuff: people who dive out of the way, things that fly ----------

  walker: {
    w: 240, h: 640, hit: 0, walker: true,
    draw(c, x, y, w, h, s, env) {
      const cx = x + w / 2;
      const dark = env.night * 0.55;
      const skin = mix('#e0b08c', '#6b5446', dark);
      const coat = mix(s.coat, '#1a1d24', dark);
      const pants = mix(s.pants, '#14161b', dark);
      const scared = s.say && env.time < s.sayUntil;
      // legs, a step apart while walking
      const stride = scared ? 0.18 : Math.sin(env.time * 7 + (s.phase || 0)) * 0.08;
      c.fillStyle = pants;
      c.fillRect(cx - w * (0.17 + stride), y + h * 0.62, w * 0.14, h * 0.38);
      c.fillRect(cx + w * (0.03 + stride), y + h * 0.62, w * 0.14, h * 0.38);
      // body and arms (arms up when scared)
      c.fillStyle = coat;
      c.fillRect(cx - w * 0.24, y + h * 0.28, w * 0.48, h * 0.38);
      if (scared) {
        c.fillRect(cx - w * 0.42, y + h * 0.05, w * 0.12, h * 0.28);
        c.fillRect(cx + w * 0.3, y + h * 0.05, w * 0.12, h * 0.28);
      } else {
        c.fillRect(cx - w * 0.36, y + h * 0.3, w * 0.12, h * 0.3);
        c.fillRect(cx + w * 0.24, y + h * 0.3, w * 0.12, h * 0.3);
      }
      c.fillStyle = skin;
      c.beginPath();
      c.arc(cx, y + h * 0.18, w * 0.2, 0, Math.PI * 2);
      c.fill();
      if (s.hat) {
        c.fillStyle = mix(s.hat, '#1a1d24', dark);
        c.fillRect(cx - w * 0.22, y + h * 0.05, w * 0.44, h * 0.08);
      }
      if (scared && w > 6) {
        c.fillStyle = '#20232b';
        c.beginPath();
        c.ellipse(cx, y + h * 0.22, w * 0.06, h * 0.035, 0, 0, Math.PI * 2);
        c.fill();
      }
      if (scared && w > 9) {
        // speech bubble
        const size = Math.max(9, Math.min(26, w * 0.55));
        c.font = `800 ${size}px ${SANS}`;
        const tw = c.measureText(s.say).width;
        const bw = tw + size * 0.9;
        const bh = size * 1.5;
        const bx = cx - bw / 2;
        const by = y - bh - h * 0.06;
        c.fillStyle = '#ffffff';
        roundRect(c, bx, by, bw, bh, bh / 2.4);
        c.fill();
        tri(c, cx - size * 0.3, by + bh - 1, cx + size * 0.2, by + bh - 1, cx - size * 0.1, by + bh + size * 0.5);
        c.fillStyle = '#16181d';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(s.say, cx, by + bh / 2 + 0.5);
      }
    },
  },
  tubeman: {
    w: 560, h: 1800, hit: 0.5, breakable: 'boing',
    draw(c, x, y, w, h, s, env) {
      const cx = x + w / 2;
      const color = mix(s.color || '#e8402f', '#3a1a1a', env.night * 0.5);
      c.fillStyle = '#2b2f38';
      c.fillRect(cx - w * 0.22, y + h * 0.92, w * 0.44, h * 0.08);
      // a wavy tube that dances
      const t = env.time * 5 + (s.phase || 0);
      c.strokeStyle = color;
      c.lineCap = 'round';
      c.lineWidth = Math.max(2, w * 0.24);
      c.beginPath();
      c.moveTo(cx, y + h * 0.92);
      for (let k = 1; k <= 8; k++) {
        const p = k / 8;
        c.lineTo(cx + Math.sin(t + p * 3) * w * 0.22 * p, y + h * (0.92 - p * 0.8));
      }
      c.stroke();
      const hx = cx + Math.sin(t + 3) * w * 0.22;
      const hy = y + h * 0.12;
      c.lineWidth = Math.max(1, w * 0.1);
      c.beginPath();
      c.moveTo(hx, y + h * 0.3);
      c.lineTo(hx - w * 0.45, y + h * (0.22 + Math.sin(t * 1.3) * 0.12));
      c.moveTo(hx, y + h * 0.3);
      c.lineTo(hx + w * 0.45, y + h * (0.22 + Math.cos(t * 1.1) * 0.12));
      c.stroke();
      if (w > 10) {
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(hx - w * 0.05, hy, w * 0.04, 0, Math.PI * 2);
        c.arc(hx + w * 0.05, hy, w * 0.04, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#16181d';
        c.fillRect(hx - w * 0.06, hy + h * 0.035, w * 0.12, Math.max(1, h * 0.012));
      }
    },
  },
  snowman: {
    w: 600, h: 800, hit: 0.6, breakable: 'thud',
    draw(c, x, y, w, h, s, env) {
      const snow = mix('#f4f7fb', '#aab5c7', env.night);
      const cx = x + w / 2;
      c.fillStyle = snow;
      for (const [cy, r] of [[0.78, 0.4], [0.47, 0.3], [0.2, 0.21]]) {
        c.beginPath();
        c.arc(cx, y + h * cy, w * r, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#e8762b';
      tri(c, cx, y + h * 0.19, cx, y + h * 0.23, cx + w * 0.22, y + h * 0.21);
      c.fillStyle = '#20232b';
      c.fillRect(cx - w * 0.2, y + h * 0.02, w * 0.4, h * 0.04);
      c.fillRect(cx - w * 0.13, y - h * 0.08, w * 0.26, h * 0.11);
      if (w > 10) {
        c.beginPath();
        c.arc(cx - w * 0.07, y + h * 0.17, w * 0.025, 0, Math.PI * 2);
        c.arc(cx + w * 0.07, y + h * 0.17, w * 0.025, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#c0392b';
        c.fillRect(cx - w * 0.22, y + h * 0.31, w * 0.44, h * 0.05);
      }
    },
  },
  cone: {
    w: 240, h: 320, hit: 0.9, breakable: 'tock',
    draw(c, x, y, w, h) {
      c.fillStyle = '#ff6a1a';
      tri(c, x + w / 2, y, x + w * 0.85, y + h * 0.9, x + w * 0.15, y + h * 0.9);
      c.fillStyle = '#f4f4f4';
      c.beginPath();
      c.moveTo(x + w * 0.36, y + h * 0.36);
      c.lineTo(x + w * 0.64, y + h * 0.36);
      c.lineTo(x + w * 0.7, y + h * 0.52);
      c.lineTo(x + w * 0.3, y + h * 0.52);
      c.closePath();
      c.fill();
      c.fillStyle = '#d0551a';
      c.fillRect(x, y + h * 0.88, w, h * 0.12);
    },
  },
  melons: {
    w: 1300, h: 700, hit: 0.8, breakable: 'splat',
    draw(c, x, y, w, h, s, env) {
      const dark = env.night * 0.5;
      c.fillStyle = mix('#6b4a2a', '#2a1d12', dark);
      c.fillRect(x + w * 0.05, y + h * 0.55, w * 0.9, h * 0.12);
      c.fillRect(x + w * 0.08, y + h * 0.67, w * 0.05, h * 0.33);
      c.fillRect(x + w * 0.87, y + h * 0.67, w * 0.05, h * 0.33);
      // awning
      c.fillStyle = mix('#d84a3a', '#5a1f1a', dark);
      c.fillRect(x, y, w, h * 0.12);
      c.fillStyle = mix('#f2efe6', '#6a6862', dark);
      for (let k = 0; k < 6; k += 2) c.fillRect(x + (w * k) / 6, y, w / 6, h * 0.12);
      c.fillStyle = '#5b6270';
      c.fillRect(x + w * 0.04, y + h * 0.1, w * 0.03, h * 0.45);
      c.fillRect(x + w * 0.93, y + h * 0.1, w * 0.03, h * 0.45);
      // a pile of watermelons and a few melons
      const green = mix('#2f7d3a', '#163a1c', dark);
      const yellow = mix('#e8c45a', '#6a5a2a', dark);
      for (const [ax, ay, r, col] of [[0.25, 0.47, 0.11, 0], [0.45, 0.47, 0.11, 0], [0.65, 0.47, 0.11, 1], [0.35, 0.33, 0.1, 0], [0.55, 0.33, 0.1, 0], [0.8, 0.48, 0.09, 1], [0.45, 0.2, 0.09, 0]]) {
        c.fillStyle = col ? yellow : green;
        c.beginPath();
        c.ellipse(x + w * ax, y + h * ay, w * r, w * r * 0.8, 0, 0, Math.PI * 2);
        c.fill();
        if (!col && w > 30) {
          c.strokeStyle = 'rgba(0,0,0,0.25)';
          c.lineWidth = Math.max(1, w * 0.008);
          c.beginPath();
          c.ellipse(x + w * ax, y + h * ay, w * r * 0.45, w * r * 0.78, 0, 0, Math.PI * 2);
          c.stroke();
        }
      }
    },
  },

  // ---------- the traffic cop, his car and his sign ----------

  cop: {
    w: 260, h: 660, hit: 0, cop: true,
    draw(c, x, y, w, h, s, env) {
      const cx = x + w / 2;
      const dark = env.night * 0.5;
      c.fillStyle = mix('#2c3442', '#14181f', dark);
      c.fillRect(cx - w * 0.17, y + h * 0.62, w * 0.14, h * 0.38);
      c.fillRect(cx + w * 0.03, y + h * 0.62, w * 0.14, h * 0.38);
      c.fillStyle = mix('#3a4658', '#1a2029', dark);
      c.fillRect(cx - w * 0.24, y + h * 0.28, w * 0.48, h * 0.38);
      // reflective vest
      c.fillStyle = mix('#c6e33a', '#6a7a22', dark);
      c.fillRect(cx - w * 0.22, y + h * 0.3, w * 0.44, h * 0.3);
      c.fillStyle = '#e8eef2';
      c.fillRect(cx - w * 0.22, y + h * 0.42, w * 0.44, h * 0.03);
      c.fillRect(cx - w * 0.22, y + h * 0.5, w * 0.44, h * 0.03);
      c.fillStyle = mix('#e0b08c', '#6b5446', dark);
      c.beginPath();
      c.arc(cx, y + h * 0.18, w * 0.18, 0, Math.PI * 2);
      c.fill();
      // cap
      c.fillStyle = mix('#3a4658', '#1a2029', dark);
      c.fillRect(cx - w * 0.22, y + h * 0.04, w * 0.44, h * 0.07);
      c.fillRect(cx - w * 0.28, y + h * 0.1, w * 0.56, h * 0.025);
      const angry = s.say && env.time < s.sayUntil;
      const towards = s.offset > 0 ? -1 : 1;
      if (angry) {
        // the striped baton up in the air
        c.fillStyle = '#f2f4f7';
        c.fillRect(cx + towards * w * 0.3 - w * 0.04, y - h * 0.08, w * 0.08, h * 0.36);
        c.fillStyle = '#1a1d22';
        for (let k = 0; k < 4; k++) c.fillRect(cx + towards * w * 0.3 - w * 0.04, y - h * 0.08 + k * h * 0.09, w * 0.08, h * 0.045);
      } else {
        // radar gun aimed at the road
        c.fillStyle = mix('#3a4658', '#1a2029', dark);
        c.fillRect(cx + (towards > 0 ? w * 0.2 : -w * 0.5), y + h * 0.32, w * 0.3, h * 0.06);
        c.fillStyle = '#1a1d22';
        c.fillRect(cx + (towards > 0 ? w * 0.42 : -w * 0.62), y + h * 0.3, w * 0.2, h * 0.09);
        if (w > 8) {
          c.fillStyle = '#ff4136';
          c.fillRect(cx + (towards > 0 ? w * 0.58 : -w * 0.62), y + h * 0.32, w * 0.04, h * 0.03);
        }
      }
      if (angry && w > 9) speech(c, s.say, cx, y - h * 0.12, w);
    },
  },
  policecar: {
    w: 760, h: 520, hit: 0.9,
    draw(c, x, y, w, h, s, env) {
      drawVehicle(c, x, y, w, h * 0.96, 'sedan', '#eef1f5', { lights: env.night });
      c.fillStyle = '#1f5fbf';
      c.fillRect(x, y + h * 0.5, w, h * 0.06);
      // the light bar flashes red and blue
      const on = Math.floor(env.time * 6) % 2;
      c.fillStyle = on ? '#ff2b2b' : '#5a1414';
      c.fillRect(x + w * 0.3, y - h * 0.02, w * 0.2, h * 0.06);
      c.fillStyle = on ? '#1a2a5a' : '#3a7bff';
      c.fillRect(x + w * 0.5, y - h * 0.02, w * 0.2, h * 0.06);
      if (w > 10) {
        glow(c, on ? x + w * 0.4 : x + w * 0.6, y, w * (0.5 + env.night * 0.5), on ? 'rgba(255,40,40,0.45)' : 'rgba(60,120,255,0.45)');
      }
    },
  },
  limit: {
    w: 560, h: 1350, hit: 0.3,
    draw(c, x, y, w, h, s) {
      const cx = x + w / 2;
      const r = w * 0.48;
      c.fillStyle = '#6b7280';
      c.fillRect(cx - w * 0.04, y + r * 1.8, w * 0.08, h - r * 1.8);
      c.fillStyle = '#d42a2a';
      c.beginPath();
      c.arc(cx, y + r, r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#f4f5f7';
      c.beginPath();
      c.arc(cx, y + r, r * 0.76, 0, Math.PI * 2);
      c.fill();
      if (w > 12) {
        c.fillStyle = '#16181d';
        c.font = `800 ${r * 0.62}px ${SANS}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(s.limit || 200), cx, y + r * 1.04);
      }
    },
  },

  // ---------- sheep ----------

  sheep: {
    w: 330, h: 250, hit: 0, sheep: true, centered: true,
    draw(c, x, y, w, h, s, env) {
      const dark = env.night * 0.6;
      const face = (s.vx || 0) >= 0 ? 1 : -1;
      const cx = x + w / 2;
      const trot = s.vx ? Math.sin(env.time * 14 + (s.phase || 0)) * h * 0.05 : 0;
      c.fillStyle = '#1a1b1f';
      for (const [k, sign] of [[-0.28, 1], [-0.12, -1], [0.12, 1], [0.28, -1]]) {
        c.fillRect(cx + w * k - w * 0.025, y + h * 0.62 + trot * sign, w * 0.05, h * 0.38 - trot * sign);
      }
      c.fillStyle = mix(s.wool || '#f1ede4', '#7a7770', dark);
      for (const [ax, ay, r] of [[-0.22, 0.42, 0.2], [0, 0.36, 0.23], [0.2, 0.42, 0.2], [-0.1, 0.55, 0.2], [0.12, 0.55, 0.2]]) {
        c.beginPath();
        c.arc(cx + w * ax, y + h * ay, w * r, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#26272b';
      c.beginPath();
      c.ellipse(cx + face * w * 0.38, y + h * 0.36, w * 0.11, h * 0.13, face * 0.4, 0, Math.PI * 2);
      c.fill();
      if (s.say && env.time < s.sayUntil && w > 9) speech(c, s.say, cx, y - h * 0.1, w * 1.2);
    },
  },

  // a hot baursak hovering over the road: pick it up for nitro
  baursak: {
    w: 300, h: 300, hit: 0, pickup: true, centered: true,
    draw(c, x, y, w, h, s, env) {
      const bob = Math.sin(env.time * 4 + (s.phase || 0)) * h * 0.08;
      const cx = x + w / 2;
      const cy = y + h * 0.45 + bob;
      if (w > 5) glow(c, cx, cy, w * 0.9, 'rgba(255,200,90,0.45)');
      c.fillStyle = '#c9822f';
      roundRect(c, cx - w * 0.3, cy - h * 0.24, w * 0.6, h * 0.48, w * 0.2);
      c.fill();
      c.fillStyle = '#e5a64c';
      roundRect(c, cx - w * 0.24, cy - h * 0.2, w * 0.42, h * 0.3, w * 0.14);
      c.fill();
      if (w > 10) {
        c.fillStyle = 'rgba(255,255,255,0.55)';
        c.beginPath();
        c.ellipse(cx - w * 0.1, cy - h * 0.1, w * 0.07, h * 0.04, -0.4, 0, Math.PI * 2);
        c.fill();
      }
    },
  },

  // a tumbleweed rolling across the steppe road: a loose ball of dry twigs
  tumble: {
    w: 470, h: 470, hit: 0, tumble: true, centered: true,
    draw(c, x, y, w, h, s, env) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = w * 0.46;
      c.lineCap = 'round';
      c.strokeStyle = mix('#b08a58', '#4a3a2a', env.night);
      c.lineWidth = Math.max(1, w * 0.035);
      for (let k = 0; k < 7; k++) {
        c.beginPath();
        c.ellipse(cx, cy, r * (0.55 + (k % 3) * 0.2), r * (0.35 + ((k * 2) % 3) * 0.25), (k * Math.PI) / 7, 0, Math.PI * 2);
        c.stroke();
      }
      if (w > 14) {
        c.strokeStyle = mix('#d6b27a', '#5e4a33', env.night);
        c.lineWidth = Math.max(1, w * 0.02);
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2;
          c.beginPath();
          c.moveTo(cx + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.2);
          c.lineTo(cx + Math.cos(a + 0.6) * r * 0.95, cy + Math.sin(a + 0.6) * r * 0.95);
          c.stroke();
        }
      }
    },
  },

  // a birch in autumn: white trunk with black marks under a golden crown
  birch: {
    w: 760, h: 1750, hit: 0.25,
    draw(c, x, y, w, h, s, env) {
      const tones = [['#e2b23c', '#c48a24'], ['#e08a2c', '#b8641f'], ['#efcf62', '#cfa63a']];
      const [light, dark] = tones[s.tone || 0];
      const n = env.night * 0.7;
      const cx = x + w / 2;
      c.fillStyle = mix('#ece8e0', '#55524c', n);
      c.fillRect(cx - w * 0.04, y + h * 0.35, w * 0.08, h * 0.65);
      if (w > 12) {
        c.fillStyle = '#2a2a2a';
        for (let k = 0; k < 5; k++) c.fillRect(cx - w * 0.04 + (k % 2) * w * 0.03, y + h * (0.45 + k * 0.1), w * 0.05, Math.max(1, h * 0.012));
      }
      const blob = (bx, by, r) => {
        c.beginPath();
        c.ellipse(cx + w * bx, y + h * by, w * r, h * r * 0.55, 0, 0, Math.PI * 2);
        c.fill();
      };
      c.fillStyle = mix(dark, '#2a2418', n);
      blob(-0.18, 0.3, 0.24);
      blob(0.2, 0.34, 0.22);
      blob(0, 0.46, 0.25);
      c.fillStyle = mix(light, '#3a3222', n);
      blob(-0.1, 0.18, 0.22);
      blob(0.12, 0.21, 0.2);
      blob(0, 0.08, 0.16);
      blob(-0.22, 0.4, 0.14);
      blob(0.22, 0.44, 0.14);
    },
  },

  // a house in Saty: wooden walls, blue window frames, a tin roof and smoke from the chimney
  house: {
    w: 2000, h: 1700, hit: 0.9,
    draw(c, x, y, w, h, s, env) {
      const n = env.night * 0.7;
      const wallTop = y + h * 0.45;
      if (w > 20) {
        for (let k = 0; k < 3; k++) {
          const t = (env.time * 0.35 + k / 3) % 1;
          c.fillStyle = `rgba(214,220,226,${0.4 * (1 - t)})`;
          c.beginPath();
          c.ellipse(x + w * (0.715 + t * 0.08), y + h * (0.13 - t * 0.2), w * (0.03 + t * 0.05), w * (0.025 + t * 0.04), 0, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.fillStyle = mix('#8a8f96', '#2a2c30', n);
      c.fillRect(x + w * 0.68, y + h * 0.15, w * 0.07, h * 0.22);
      c.fillStyle = mix(s.roof || '#6f7b86', '#22262b', n);
      tri(c, x - w * 0.04, wallTop, x + w * 0.5, y + h * 0.12, x + w * 1.04, wallTop);
      c.fillStyle = mix(s.wall || '#8a5a34', '#2b1d12', n);
      c.fillRect(x + w * 0.04, wallTop, w * 0.92, h * 0.55);
      if (w > 30) {
        c.fillStyle = 'rgba(0,0,0,0.13)';
        for (let k = 1; k < 6; k++) c.fillRect(x + w * 0.04, wallTop + (h * 0.55 * k) / 6, w * 0.92, Math.max(1, h * 0.006));
      }
      for (const wx of [0.16, 0.62]) {
        const fx = x + w * wx;
        const fy = wallTop + h * 0.13;
        c.fillStyle = mix('#2f6fb0', '#16304d', n);
        c.fillRect(fx, fy, w * 0.22, h * 0.26);
        c.fillStyle = mix('#9fc4dd', '#ffd27a', Math.min(1, env.night * 2.5));
        c.fillRect(fx + w * 0.02, fy + h * 0.025, w * 0.18, h * 0.21);
        if (w > 24) {
          c.fillStyle = mix('#2f6fb0', '#16304d', n);
          c.fillRect(fx + w * 0.105, fy, w * 0.012, h * 0.26);
          c.fillRect(fx, fy + h * 0.12, w * 0.22, h * 0.012);
        }
      }
    },
  },

  // a drowned spruce in Lake Kaindy: a bare grey trunk standing in the water
  snag: {
    w: 300, h: 1500, hit: 0.3,
    draw(c, x, y, w, h, s, env) {
      const n = env.night * 0.6;
      const cx = x + w / 2;
      const top = y + h * (1 - (s.tall || 1));
      const color = mix('#a3a7a6', '#3c3f40', n);
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(cx - w * 0.16, y + h);
      c.lineTo(cx - w * 0.05, top);
      c.lineTo(cx + w * 0.05, top);
      c.lineTo(cx + w * 0.16, y + h);
      c.closePath();
      c.fill();
      if (w > 6) {
        c.strokeStyle = color;
        c.lineWidth = Math.max(1, w * 0.05);
        for (let k = 0; k < 5; k++) {
          const by = top + (y + h - top) * (0.1 + k * 0.15);
          const dir = k % 2 ? 1 : -1;
          c.beginPath();
          c.moveTo(cx, by);
          c.lineTo(cx + dir * w * (0.5 - k * 0.06), by - h * 0.03);
          c.stroke();
        }
      }
      c.fillStyle = 'rgba(200,240,236,0.35)';
      c.beginPath();
      c.ellipse(cx, y + h, w * 0.55, Math.max(1, w * 0.08), 0, 0, Math.PI * 2);
      c.fill();
    },
  },

  // a horse from a herd wandering across the road
  horse: {
    w: 600, h: 520, hit: 0, sheep: true, horse: true, centered: true,
    draw(c, x, y, w, h, s, env) {
      const n = env.night * 0.6;
      const face = (s.vx || 0) >= 0 ? 1 : -1;
      const cx = x + w / 2;
      const trot = s.vx ? Math.sin(env.time * 12 + (s.phase || 0)) * h * 0.05 : 0;
      const coat = mix(s.coat || '#6b3f22', '#1d140d', n);
      const mane = mix(s.mane || '#241a14', '#0d0a08', n);
      c.fillStyle = mix(coat, '#000000', 0.25);
      for (const [k, sign] of [[-0.3, 1], [-0.18, -1], [0.18, 1], [0.3, -1]]) {
        c.fillRect(cx + w * k - w * 0.025, y + h * 0.55 + trot * sign, w * 0.05, h * 0.45 - trot * sign);
      }
      c.fillStyle = coat;
      c.beginPath();
      c.ellipse(cx, y + h * 0.5, w * 0.36, h * 0.17, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(cx + face * w * 0.2, y + h * 0.44);
      c.lineTo(cx + face * w * 0.33, y + h * 0.12);
      c.lineTo(cx + face * w * 0.42, y + h * 0.14);
      c.lineTo(cx + face * w * 0.36, y + h * 0.5);
      c.closePath();
      c.fill();
      c.beginPath();
      c.ellipse(cx + face * w * 0.43, y + h * 0.18, w * 0.09, h * 0.065, face * 0.5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = mane;
      c.beginPath();
      c.moveTo(cx + face * w * 0.2, y + h * 0.38);
      c.lineTo(cx + face * w * 0.32, y + h * 0.09);
      c.lineTo(cx + face * w * 0.29, y + h * 0.12);
      c.lineTo(cx + face * w * 0.16, y + h * 0.42);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(cx - face * w * 0.33, y + h * 0.42);
      c.lineTo(cx - face * w * 0.46, y + h * 0.7);
      c.lineTo(cx - face * w * 0.4, y + h * 0.72);
      c.lineTo(cx - face * w * 0.31, y + h * 0.5);
      c.closePath();
      c.fill();
      if (s.say && env.time < s.sayUntil && w > 9) speech(c, s.say, cx, y - h * 0.05, w);
    },
  },

  // a fir dressed for New Year: blinking garlands and a star; plain ones stand out in the steppe
  fir: {
    w: 900, h: 2000, hit: 0.35,
    draw(c, x, y, w, h, s, env) {
      const n = env.night * 0.5;
      c.fillStyle = '#2a2119';
      c.fillRect(x + w * 0.45, y + h * 0.86, w * 0.1, h * 0.14);
      const tiers = [[0.05, 0.4, 0.28], [0.25, 0.64, 0.4], [0.45, 0.88, 0.5]];
      for (const [top, bottom, half] of tiers) {
        c.fillStyle = mix('#2b6a4a', '#123022', n);
        tri(c, x + w / 2, y + h * top, x + w * (0.5 + half), y + h * bottom, x + w * (0.5 - half), y + h * bottom);
        c.fillStyle = mix('#eef3fa', '#b8c4d6', n);
        tri(c, x + w / 2, y + h * top, x + w * (0.5 + half * 0.3), y + h * (top + (bottom - top) * 0.3), x + w * (0.5 - half * 0.3), y + h * (top + (bottom - top) * 0.3));
      }
      if (s.plain || w < 6) return;
      const colors = ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#ffffff'];
      const dot = Math.max(1.2, w * 0.022);
      for (let k = 0; k < 24; k++) {
        const row = k % 6;
        const v = 0.2 + row * 0.12;
        const spread = 0.12 + row * 0.07;
        const u = ((k * 0.37) % 1) * 2 - 1;
        const on = Math.sin(env.time * 4 + k * 1.7) > -0.2;
        if (!on) continue;
        c.fillStyle = colors[k % colors.length];
        c.fillRect(x + w * (0.5 + u * spread) - dot / 2, y + h * v, dot, dot);
      }
      if (w > 12) glow(c, x + w / 2, y + h * 0.05, w * 0.18, 'rgba(255,214,102,0.7)');
      c.fillStyle = '#ffd166';
      tri(c, x + w / 2, y - h * 0.01, x + w * 0.55, y + h * 0.08, x + w * 0.45, y + h * 0.08);
    },
  },

  // Ayaz Ata: blue robe with white fur, a tall hat, a white beard, a staff, waving
  ayaz: {
    w: 560, h: 1900, hit: 0.3,
    draw(c, x, y, w, h, s, env) {
      const n = env.night * 0.35;
      const cx = x + w / 2;
      const robe = mix('#2f5fbf', '#16295a', n);
      const fur = mix('#f4f6fa', '#b9c2d2', n);
      c.fillStyle = '#c0392b';
      c.beginPath();
      c.ellipse(x + w * 0.85, y + h * 0.92, w * 0.16, h * 0.08, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = robe;
      c.beginPath();
      c.moveTo(cx - w * 0.16, y + h * 0.3);
      c.lineTo(cx + w * 0.16, y + h * 0.3);
      c.lineTo(cx + w * 0.3, y + h);
      c.lineTo(cx - w * 0.3, y + h);
      c.closePath();
      c.fill();
      c.fillStyle = fur;
      c.fillRect(cx - w * 0.3, y + h * 0.95, w * 0.6, h * 0.05);
      c.fillRect(cx - w * 0.03, y + h * 0.32, w * 0.06, h * 0.63);
      c.fillStyle = '#e2b13c';
      c.fillRect(cx - w * 0.2, y + h * 0.52, w * 0.4, h * 0.025);
      // the staff with a star
      c.fillStyle = mix('#8a5a34', '#3a2616', n);
      c.fillRect(x + w * 0.1, y + h * 0.12, w * 0.04, h * 0.88);
      c.fillStyle = '#ffd166';
      tri(c, x + w * 0.12, y + h * 0.06, x + w * 0.18, y + h * 0.14, x + w * 0.06, y + h * 0.14);
      // the waving arm
      const wave = Math.sin(env.time * 5 + (s.phase || 0)) * 0.35;
      c.save();
      c.translate(cx + w * 0.14, y + h * 0.34);
      c.rotate(-1.9 + wave);
      c.fillStyle = robe;
      c.fillRect(0, -w * 0.05, w * 0.32, w * 0.1);
      c.fillStyle = fur;
      c.fillRect(w * 0.28, -w * 0.06, w * 0.06, w * 0.12);
      c.restore();
      // face, beard, hat
      c.fillStyle = mix('#e8b896', '#7a5f4e', n);
      c.beginPath();
      c.arc(cx, y + h * 0.22, w * 0.12, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = fur;
      c.beginPath();
      c.moveTo(cx - w * 0.13, y + h * 0.23);
      c.lineTo(cx + w * 0.13, y + h * 0.23);
      c.lineTo(cx, y + h * 0.42);
      c.closePath();
      c.fill();
      c.fillStyle = robe;
      tri(c, cx, y, cx + w * 0.15, y + h * 0.17, cx - w * 0.15, y + h * 0.17);
      c.fillStyle = fur;
      c.fillRect(cx - w * 0.16, y + h * 0.15, w * 0.32, h * 0.035);
    },
  },
};
