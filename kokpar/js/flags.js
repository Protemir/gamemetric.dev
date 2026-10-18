// Флаги аулов: поле цвета команды, у древка — полоса казахского орнамента, в центре знак аула.
// Рисуется на canvas: та же картинка идёт на флаг у казана и в табло счёта.
const GOLD = '#f2c14e';

function horn(g, x, y, s, flip) { // қошқар мүйіз: ножка и два рога, закрученные наружу
  g.beginPath();
  g.moveTo(x, y + flip * s * 0.55); g.lineTo(x, y);
  for (const d of [1, -1]) {
    const cx = x + d * s * 0.42;
    g.moveTo(x, y);
    for (let t = 0; t <= 1.001; t += 0.04) {
      const a = t * Math.PI * 2.3, r = s * 0.42 * (1 - 0.65 * t);
      g.lineTo(cx - d * r * Math.cos(a), y - flip * r * Math.sin(a));
    }
  }
  g.stroke();
}
function peak(g, x, y, w, h, snow) { // гора со снежной шапкой
  g.fillStyle = snow ? '#ffffff' : GOLD;
  g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x, y - h); g.lineTo(x + w / 2, y); g.closePath(); g.fill();
}

const SIGNS = {
  shanyrak(g, cx, cy, s) { // шаңырақ: круг и перекрестья
    g.lineWidth = s * 0.09; g.beginPath(); g.arc(cx, cy, s * 0.5, 0, 6.283); g.stroke();
    for (const k of [-1, 1]) for (const o of [-0.17, 0.17]) {
      g.beginPath();
      if (k > 0) { g.moveTo(cx - s * 0.5, cy + o * s); g.lineTo(cx + s * 0.5, cy + o * s); } else { g.moveTo(cx + o * s, cy - s * 0.5); g.lineTo(cx + o * s, cy + s * 0.5); }
      g.stroke();
    }
  },
  spring(g, cx, cy, s) { // Қайнар — родник: расходящиеся круги
    g.lineWidth = s * 0.08;
    for (const r of [0.14, 0.3, 0.46]) { g.beginPath(); g.arc(cx, cy, s * r, 0, 6.283); g.stroke(); }
  },
  mountain(g, cx, cy, s) { // Таусамалы — горы
    peak(g, cx - s * 0.22, cy + s * 0.4, s * 0.7, s * 0.6); peak(g, cx + s * 0.15, cy + s * 0.4, s * 0.9, s * 0.85);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx + s * 0.15, cy - s * 0.45); g.lineTo(cx - s * 0.02, cy - s * 0.2); g.lineTo(cx + s * 0.32, cy - s * 0.2); g.closePath(); g.fill();
  },
  sun(g, cx, cy, s) { // Каскелен — солнце с лучами
    g.beginPath(); g.arc(cx, cy, s * 0.24, 0, 6.283); g.fill();
    g.lineWidth = s * 0.07;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283, r0 = s * 0.33, r1 = s * (i % 2 ? 0.44 : 0.52); g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); }
  },
  poplars(g, cx, cy, s) { // Үштерек — три тополя
    for (const [dx, k] of [[-0.3, 0.8], [0, 1], [0.3, 0.8]]) {
      const x = cx + dx * s, top = cy - s * 0.5 * k, bot = cy + s * 0.42;
      g.beginPath(); g.ellipse(x, (top + bot - s * 0.12) / 2, s * 0.1, (bot - top - s * 0.12) / 2, 0, 0, 6.283); g.fill();
      g.fillRect(x - s * 0.02, bot - s * 0.14, s * 0.04, s * 0.14);
    }
  },
  star(g, cx, cy, s) { // Талгар — восьмиконечная звезда
    g.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283 - Math.PI / 2, r = s * (i % 2 ? 0.22 : 0.5); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    g.closePath(); g.fill();
  },
  wave(g, cx, cy, s) { // Есік — озеро: волны
    g.lineWidth = s * 0.08;
    for (const o of [-0.25, 0, 0.25]) {
      g.beginPath();
      for (let i = 0; i <= 20; i++) { const x = cx - s * 0.5 + (i / 20) * s; g.lineTo(x, cy + o * s + Math.sin(i / 20 * 6.283 * 1.5) * s * 0.07); }
      g.stroke();
    }
  },
  tamga(g, cx, cy, s) { // Шелек — тамга: полумесяц над чертой
    g.lineWidth = s * 0.1;
    g.beginPath(); g.arc(cx, cy - s * 0.08, s * 0.3, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    g.beginPath(); g.moveTo(cx, cy - s * 0.48); g.lineTo(cx, cy + s * 0.48); g.stroke();
    g.beginPath(); g.moveTo(cx - s * 0.25, cy + s * 0.48); g.lineTo(cx + s * 0.25, cy + s * 0.48); g.stroke();
  },
  horns(g, cx, cy, s) { // Кеген — бараньи рога
    g.lineWidth = s * 0.09; horn(g, cx, cy - s * 0.05, s * 0.85, 1); horn(g, cx, cy + s * 0.05, s * 0.85, -1);
  },
  arrows(g, cx, cy, s) { // Жаркент — скрещённые стрелы
    g.lineWidth = s * 0.07;
    for (const d of [1, -1]) {
      const x0 = cx - d * s * 0.42, y0 = cy + s * 0.42, x1 = cx + d * s * 0.42, y1 = cy - s * 0.42;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      const a = Math.atan2(y1 - y0, x1 - x0), L = s * 0.17;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - Math.cos(a - 0.45) * L, y1 - Math.sin(a - 0.45) * L); g.lineTo(x1 - Math.cos(a + 0.45) * L, y1 - Math.sin(a + 0.45) * L); g.closePath(); g.fill();
      for (const k of [0.1, 0.2]) { const fx = x0 + (x1 - x0) * k, fy = y0 + (y1 - y0) * k; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx - Math.cos(a - 0.7) * L * 0.7, fy - Math.sin(a - 0.7) * L * 0.7); g.moveTo(fx, fy); g.lineTo(fx - Math.cos(a + 0.7) * L * 0.7, fy - Math.sin(a + 0.7) * L * 0.7); g.stroke(); }
    }
  },
  moon(g, cx, cy, s, field) { // Текели — полумесяц и звезда
    g.beginPath(); g.arc(cx - s * 0.05, cy, s * 0.42, 0, 6.283); g.fill();
    g.fillStyle = field; g.beginPath(); g.arc(cx + s * 0.1, cy - s * 0.05, s * 0.36, 0, 6.283); g.fill();
    g.fillStyle = GOLD;
    SIGNS.star(g, cx + s * 0.22, cy - s * 0.02, s * 0.2);
  },
  wing(g, cx, cy, s) { // Шонжы — Самұрық: раскинутые крылья
    for (const d of [1, -1]) {
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.ellipse(cx + d * s * (0.14 + i * 0.09), cy - s * (0.04 + i * 0.06), s * 0.07, s * (0.34 - i * 0.05), d * (0.5 + i * 0.25), 0, 6.283);
        g.fill();
      }
    }
    g.beginPath(); g.ellipse(cx, cy + s * 0.08, s * 0.09, s * 0.22, 0, 0, 6.283); g.fill();
    g.beginPath(); g.arc(cx, cy - s * 0.2, s * 0.08, 0, 6.283); g.fill();
  },
  khan(g, cx, cy, s) { // Нарынкол — Хан-Тенгри и звезда над ним
    peak(g, cx, cy + s * 0.45, s * 0.95, s * 0.8);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx, cy - s * 0.35); g.lineTo(cx - s * 0.13, cy - s * 0.12); g.lineTo(cx + s * 0.13, cy - s * 0.12); g.closePath(); g.fill();
    g.fillStyle = GOLD; SIGNS.star(g, cx + s * 0.38, cy - s * 0.38, s * 0.24);
  },
};

const cache = new Map();
export const SIGN_LIST = Object.keys(SIGNS);
export function flagCanvas(team, w = 240, h = 150) {
  const key = team.color + team.sign + w;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = team.color; g.fillRect(0, 0, w, h);
  const sh = g.createLinearGradient(0, 0, 0, h); // объём ткани
  sh.addColorStop(0, 'rgba(255,255,255,0.14)'); sh.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = sh; g.fillRect(0, 0, w, h);
  // орнамент у древка
  const bw = w * 0.16;
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, bw, h);
  g.strokeStyle = GOLD; g.lineWidth = Math.max(2, w / 80);
  for (let y = bw * 0.55; y < h; y += bw * 1.05) horn(g, bw / 2, y, bw * 0.7, 1);
  // знак
  g.fillStyle = GOLD; g.strokeStyle = GOLD; g.lineCap = 'round'; g.lineJoin = 'round';
  (SIGNS[team.sign] || SIGNS.shanyrak)(g, bw + (w - bw) / 2, h / 2, h * 0.62, team.color);
  cache.set(key, c);
  return c;
}
