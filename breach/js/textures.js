// Procedural textures: everything is drawn on canvases at start-up, nothing is downloaded.
import * as THREE from '../vendor/three.module.min.js';

let seed = 1234567;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const rr = (a, b) => a + (b - a) * rnd();
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * k)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * k)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * k)));
  return `rgb(${r},${g},${b})`;
}

function speckle(g, w, h, colors, count, s0, s1, alpha = 1) {
  g.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    g.fillStyle = pick(colors);
    const s = rr(s0, s1);
    g.fillRect(rnd() * w, rnd() * h, s, s);
  }
  g.globalAlpha = 1;
}

function grain(g, w, h, amount = 18, count = 4000) {
  for (let i = 0; i < count; i++) {
    const v = Math.round(rr(-amount, amount));
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${-v / 255})`;
    g.fillRect(rnd() * w, rnd() * h, rr(1, 3), rr(1, 3));
  }
}

const DRAW = {
  grass(g, w, h) {
    g.fillStyle = '#4f6e30';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, ['#5d7d36', '#456328', '#6a8a3e', '#3d5a22', '#738f45'], 2600, 1, 4);
    g.strokeStyle = 'rgba(120,150,70,.35)';
    for (let i = 0; i < 500; i++) {
      const x = rnd() * w, y = rnd() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + rr(-2, 2), y - rr(3, 7));
      g.stroke();
    }
  },
  pave(g, w, h) {
    g.fillStyle = '#6d6a63';
    g.fillRect(0, 0, w, h);
    const rows = 4, bh = h / rows;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? w / 4 : 0;
      for (let c = -1; c < 2; c++) {
        const x = c * (w / 2) + off;
        g.fillStyle = shade(pick(['#a39e93', '#9a958a', '#aca79b', '#948f85']), rr(0.93, 1.05));
        g.fillRect(x + 3, r * bh + 3, w / 2 - 6, bh - 6);
      }
    }
    grain(g, w, h, 16, 3000);
  },
  terrace(g, w, h) {
    g.fillStyle = '#8f7d63';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        g.fillStyle = shade(pick(['#d2bf9c', '#c9b590', '#d8c6a4']), rr(0.95, 1.04));
        g.fillRect(x * w / 2 + 2, y * h / 2 + 2, w / 2 - 4, h / 2 - 4);
      }
    grain(g, w, h, 14, 2500);
  },
  gravel(g, w, h) {
    g.fillStyle = '#8a8274';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, ['#a09886', '#6f685b', '#b5ad9b', '#7d7566', '#5d574c'], 5000, 1, 4);
  },
  wood(g, w, h) {
    // floor planks
    const n = 8, ph = h / n;
    for (let i = 0; i < n; i++) {
      let x = -rnd() * w;
      while (x < w) {
        const len = rr(w * 0.4, w * 0.9);
        g.fillStyle = shade(pick(['#9a6a3e', '#8d5f36', '#a5744a', '#93653b']), rr(0.9, 1.08));
        g.fillRect(x, i * ph, len, ph);
        g.fillStyle = 'rgba(40,20,5,.5)';
        g.fillRect(x, i * ph, 2, ph);
        x += len;
      }
      g.fillStyle = 'rgba(40,20,5,.45)';
      g.fillRect(0, i * ph, w, 2);
    }
    g.strokeStyle = 'rgba(60,30,10,.18)';
    for (let i = 0; i < 160; i++) {
      const y = rnd() * h;
      g.beginPath();
      g.moveTo(rnd() * w, y);
      g.lineTo(rnd() * w, y + rr(-1, 1));
      g.stroke();
    }
  },
  parquet(g, w, h) {
    const s = w / 8;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const hor = (x + y) % 2 === 0;
        for (let k = 0; k < 3; k++) {
          g.fillStyle = shade(pick(['#b07a44', '#a26e3b', '#bb8550']), rr(0.9, 1.06));
          if (hor) g.fillRect(x * s, y * s + (k * s) / 3, s, s / 3 - 1);
          else g.fillRect(x * s + (k * s) / 3, y * s, s / 3 - 1, s);
        }
      }
    grain(g, w, h, 10, 2000);
  },
  darkwood(g, w, h) {
    DRAW.wood(g, w, h);
    g.fillStyle = 'rgba(30,12,4,.45)';
    g.fillRect(0, 0, w, h);
  },
  marble(g, w, h) {
    g.fillStyle = '#e7e2d8';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const dark = (x + y) % 2 === 1;
        g.fillStyle = dark ? '#3a3632' : '#ebe6dc';
        g.fillRect(x * w / 2, y * h / 2, w / 2, h / 2);
      }
    g.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(${rnd() < 0.5 ? '120,110,100' : '200,190,180'},${rr(0.15, 0.4)})`;
      g.beginPath();
      let x = rnd() * w, y = rnd() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += rr(-30, 30);
        y += rr(-30, 30);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(0, h / 2 - 1, w, 2);
    g.fillRect(w / 2 - 1, 0, 2, h);
    g.fillRect(0, 0, w, 1);
    g.fillRect(0, 0, 1, h);
  },
  carpet(g, w, h) {
    g.fillStyle = '#6e1d1f';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(214,170,90,.55)';
    g.lineWidth = 3;
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const cx = w / 4 + (i * w) / 2, cy = h / 4 + (j * h) / 2, r = w / 5;
        g.beginPath();
        g.moveTo(cx, cy - r);
        g.lineTo(cx + r, cy);
        g.lineTo(cx, cy + r);
        g.lineTo(cx - r, cy);
        g.closePath();
        g.stroke();
        g.fillStyle = 'rgba(30,40,80,.55)';
        g.fillRect(cx - 5, cy - 5, 10, 10);
      }
    grain(g, w, h, 22, 6000);
  },
  tile(g, w, h) {
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = (x + y) % 2 ? '#2a2a2c' : '#e8e6e0';
        g.fillRect(x * s, y * s, s, s);
      }
    g.fillStyle = 'rgba(0,0,0,.25)';
    for (let i = 0; i <= n; i++) {
      g.fillRect(i * s - 1, 0, 2, h);
      g.fillRect(0, i * s - 1, w, 2);
    }
    grain(g, w, h, 8, 1500);
  },
  concrete(g, w, h) {
    g.fillStyle = '#8b8984';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, ['#7f7d78', '#97958f', '#74726d'], 3000, 1, 3);
    for (let i = 0; i < 6; i++) {
      const gr = g.createRadialGradient(rnd() * w, rnd() * h, 2, rnd() * w, rnd() * h, rr(20, 60));
      gr.addColorStop(0, 'rgba(40,35,30,.25)');
      gr.addColorStop(1, 'rgba(40,35,30,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.fillRect(0, 0, w, 2);
    g.fillRect(0, 0, 2, h);
  },
  water(g, w, h) {
    g.fillStyle = '#2b8fb3';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(190,240,255,.45)';
    g.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      g.beginPath();
      const x = rnd() * w, y = rnd() * h;
      g.moveTo(x, y);
      g.bezierCurveTo(x + 10, y - 8, x + 20, y + 8, x + rr(25, 45), y + rr(-4, 4));
      g.stroke();
    }
  },
  stone(g, w, h) {
    g.fillStyle = '#4d4842';
    g.fillRect(0, 0, w, h);
    let y = 0;
    while (y < h) {
      const bh = rr(22, 38);
      let x = -rr(0, 40);
      while (x < w) {
        const bw = rr(36, 70);
        g.fillStyle = shade(pick(['#8c8478', '#7d766b', '#958c7f', '#6f695f']), rr(0.9, 1.08));
        g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        x += bw;
      }
      y += bh;
    }
    grain(g, w, h, 20, 4000);
  },
  plaster(g, w, h) {
    g.fillStyle = '#ddd0b4';
    g.fillRect(0, 0, w, h);
    grain(g, w, h, 10, 5000);
    // stone base band and cornice; the tile is 2.5 m wide and exactly one 4 m wall tall
    g.fillStyle = '#a69a85';
    g.fillRect(0, h * 0.86, w, h * 0.14);
    g.fillStyle = 'rgba(0,0,0,.2)';
    g.fillRect(0, h * 0.86, w, 3);
    g.fillStyle = '#efe7d6';
    g.fillRect(0, 0, w, h * 0.05);
    g.fillStyle = 'rgba(0,0,0,.18)';
    g.fillRect(0, h * 0.05, w, 3);
  },
  // interior walls: tile 2 m wide x 4 m tall, wainscot in the bottom quarter
  w_hall(g, w, h) {
    g.fillStyle = '#e4dccb';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,130,100,.5)';
    g.lineWidth = 3;
    g.strokeRect(w * 0.12, h * 0.2, w * 0.76, h * 0.45);
    wainscot(g, w, h, '#8a6a48');
  },
  w_lib(g, w, h) {
    g.fillStyle = '#5a3a20';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) {
      g.fillStyle = '#6b4627';
      g.fillRect(i * w / 2 + 10, h * 0.08, w / 2 - 20, h * 0.6);
      g.strokeStyle = 'rgba(0,0,0,.35)';
      g.lineWidth = 3;
      g.strokeRect(i * w / 2 + 10, h * 0.08, w / 2 - 20, h * 0.6);
    }
    wainscot(g, w, h, '#3e2814');
    grain(g, w, h, 12, 3000);
  },
  w_garage(g, w, h) {
    g.fillStyle = '#5e5650';
    g.fillRect(0, 0, w, h);
    const bh = h / 24, bw = w / 4;
    for (let r = 0; r < 24; r++)
      for (let c = -1; c < 5; c++) {
        g.fillStyle = shade(pick(['#9a6450', '#8a5848', '#a46b55', '#7f5243']), rr(0.9, 1.05));
        g.fillRect(c * bw + (r % 2 ? bw / 2 : 0) + 2, r * bh + 2, bw - 4, bh - 4);
      }
    g.fillStyle = 'rgba(70,70,70,.85)';
    g.fillRect(0, h * 0.75, w, h * 0.25);
    grain(g, w, h, 16, 3000);
  },
  w_kitchen(g, w, h) {
    // 1 x 2 m tile; small white tiles with a coloured band
    g.fillStyle = '#d9d6cf';
    g.fillRect(0, 0, w, h);
    const s = w / 8;
    for (let y = 0; y < h / s; y++)
      for (let x = 0; x < 8; x++) {
        g.fillStyle = y === 6 ? '#3b6f8f' : shade('#f2f0ea', rr(0.95, 1.02));
        g.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
      }
  },
  w_dining(g, w, h) {
    wallpaper(g, w, h, '#6b2430', 'rgba(220,170,110,.35)');
    wainscot(g, w, h, '#4a2a18');
  },
  w_lounge(g, w, h) {
    wallpaper(g, w, h, '#24364f', 'rgba(200,190,150,.3)');
    wainscot(g, w, h, '#2e2418');
  },
  w_corr(g, w, h) {
    g.fillStyle = '#41573c';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = 'rgba(255,255,220,.08)';
      g.fillRect(x, 0, 8, h);
    }
    wainscot(g, w, h, '#6b4a2c');
  },
  ceiling(g, w, h) {
    g.fillStyle = '#e9e3d6';
    g.fillRect(0, 0, w, h);
    // smooth plaster, no tile seams
    grain(g, w, h, 5, 2500);
  },
  crate(g, w, h) {
    g.fillStyle = '#a07a45';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = shade('#a8814b', rr(0.88, 1.08));
      g.fillRect(0, (i * h) / 6 + 1, w, h / 6 - 2);
    }
    g.fillStyle = '#6e4f28';
    const b = w * 0.11;
    g.fillRect(0, 0, w, b);
    g.fillRect(0, h - b, w, b);
    g.fillRect(0, 0, b, h);
    g.fillRect(w - b, 0, b, h);
    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(Math.PI / 4);
    g.fillRect(-w * 0.7, -b / 2, w * 1.4, b);
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,.4)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
    grain(g, w, h, 14, 2000);
  },
  shelf(g, w, h) {
    g.fillStyle = '#3a2412';
    g.fillRect(0, 0, w, h);
    const rows = 4, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = 4;
      while (x < w - 4) {
        const bw = rr(6, 14);
        const bh = rh * rr(0.62, 0.86);
        g.fillStyle = pick(['#7a1f1f', '#1f3f6a', '#2f5a2a', '#8a6a2a', '#5a2a5a', '#b8a080', '#202020', '#9a3a1a']);
        g.fillRect(x, r * rh + rh - bh - 6, bw - 1, bh);
        g.fillStyle = 'rgba(255,220,150,.35)';
        g.fillRect(x + 1, r * rh + rh - bh, bw - 3, 2);
        x += bw;
      }
      g.fillStyle = '#5a3a1e';
      g.fillRect(0, r * rh + rh - 6, w, 6);
    }
    g.fillStyle = '#5a3a1e';
    g.fillRect(0, 0, 4, h);
    g.fillRect(w - 4, 0, 4, h);
  },
  counter(g, w, h) {
    g.fillStyle = '#f0ece4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9c2b4';
    g.fillRect(w * 0.08, h * 0.25, w * 0.84, h * 0.65);
    g.fillStyle = '#5a5a5a';
    g.fillRect(w * 0.4, h * 0.32, w * 0.2, 5);
    g.fillStyle = '#3a3836';
    g.fillRect(0, 0, w, h * 0.12);
  },
  table(g, w, h) {
    DRAW.wood(g, w, h);
    g.fillStyle = 'rgba(50,20,5,.5)';
    g.fillRect(0, 0, w, h);
  },
  sofa(g, w, h) {
    g.fillStyle = '#6d4f3a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.3)';
    g.lineWidth = 3;
    g.strokeRect(6, 6, w - 12, h - 12);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = 'rgba(30,15,5,.4)';
      g.beginPath();
      g.arc(w * (0.2 + 0.3 * (i % 3)), h * (0.2 + 0.3 * Math.floor(i / 3)), 3, 0, 7);
      g.fill();
    }
    grain(g, w, h, 12, 3000);
  },
  hedge(g, w, h) {
    g.fillStyle = '#2c4a1e';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = pick(['#3d6328', '#2f5220', '#4a7330', '#24401a', '#56803a']);
      g.beginPath();
      g.ellipse(rnd() * w, rnd() * h, rr(2, 5), rr(1.5, 3.5), rnd() * 3, 0, 7);
      g.fill();
    }
  },
  car(g, w, h) {
    g.fillStyle = '#1d2a3c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(160,200,230,.55)';
    g.fillRect(w * 0.1, h * 0.12, w * 0.8, h * 0.3);
    g.fillStyle = '#0d1219';
    g.fillRect(0, h * 0.85, w, h * 0.15);
    g.fillStyle = 'rgba(255,255,255,.15)';
    g.fillRect(0, h * 0.5, w, 3);
  },
  van(g, w, h) {
    g.fillStyle = '#e8e8e4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#20324f';
    g.fillRect(0, h * 0.42, w, h * 0.1);
    g.fillStyle = 'rgba(40,50,60,.8)';
    g.fillRect(w * 0.6, h * 0.12, w * 0.32, h * 0.22);
    g.fillStyle = '#222';
    g.fillRect(0, h * 0.88, w, h * 0.12);
  },
  pillar(g, w, h) {
    g.fillStyle = '#ece6da';
    g.fillRect(0, 0, w, h);
    g.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = `rgba(140,130,120,${rr(0.1, 0.3)})`;
      g.beginPath();
      let x = rnd() * w, y = rnd() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += rr(-25, 25);
        y += rr(-25, 25);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let x = 0; x < w; x += w / 6) {
      g.fillStyle = 'rgba(0,0,0,.12)';
      g.fillRect(x, 0, 4, h);
    }
  },
  fire(g, w, h) {
    g.fillStyle = '#3a2e28';
    g.fillRect(0, 0, w, h);
    const bh = h / 8, bw = w / 3;
    for (let r = 0; r < 8; r++)
      for (let c = -1; c < 4; c++) {
        g.fillStyle = shade(pick(['#6a4a3a', '#5a3c2e', '#704e3c']), rr(0.9, 1.1));
        g.fillRect(c * bw + (r % 2 ? bw / 2 : 0) + 2, r * bh + 2, bw - 4, bh - 4);
      }
  },
  piano(g, w, h) {
    g.fillStyle = '#0e0e10';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.12)';
    g.fillRect(0, 0, w, h * 0.1);
    g.fillStyle = '#eee';
    g.fillRect(w * 0.05, h * 0.3, w * 0.9, h * 0.12);
    g.fillStyle = '#111';
    for (let i = 0; i < 14; i++) g.fillRect(w * 0.05 + (i * w * 0.9) / 14, h * 0.3, 2, h * 0.12);
  },
  fountain(g, w, h) {
    DRAW.terrace(g, w, h);
    g.fillStyle = 'rgba(255,255,255,.25)';
    g.fillRect(0, 0, w, h);
  },
  metalshelf(g, w, h) {
    g.fillStyle = '#3b4046';
    g.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) {
      g.fillStyle = '#6f767e';
      g.fillRect(0, (r * h) / 4, w, 6);
      for (let k = 0; k < 3; k++) {
        g.fillStyle = pick(['#b8742a', '#4a6a8a', '#7a7a3a', '#9a2a2a', '#c8b07a']);
        g.fillRect(8 + k * (w / 3), (r * h) / 4 + 10, w / 3 - 14, h / 4 - 14);
      }
    }
  },
  fridge(g, w, h) {
    g.fillStyle = '#c8ccd0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.fillRect(0, h * 0.35, w, 3);
    g.fillRect(w * 0.82, h * 0.1, 5, h * 0.18);
    g.fillRect(w * 0.82, h * 0.45, 5, h * 0.25);
    grain(g, w, h, 6, 1500);
  },
  plant(g, w, h) {
    g.fillStyle = '#6b3d26';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#7d4a2e';
    g.fillRect(0, h * 0.1, w, h * 0.12);
    DRAW_hedgeTop(g, w, h * 0.35);
  },
  lounger(g, w, h) {
    g.fillStyle = '#f2efe6';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 24) {
      g.fillStyle = '#2d7fa6';
      g.fillRect(x, 0, 12, h);
    }
  },
  shed(g, w, h) {
    for (let x = 0; x < w; x += w / 8) {
      g.fillStyle = shade('#7a5a3a', rr(0.85, 1.1));
      g.fillRect(x, 0, w / 8 - 2, h);
    }
    grain(g, w, h, 12, 2000);
  },
  cabinet(g, w, h) {
    g.fillStyle = '#4a2c18';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,210,150,.25)';
    g.lineWidth = 3;
    g.strokeRect(8, 8, w / 2 - 12, h - 16);
    g.strokeRect(w / 2 + 4, 8, w / 2 - 12, h - 16);
    g.fillStyle = '#c9a050';
    g.fillRect(w / 2 - 8, h / 2, 4, 10);
    g.fillRect(w / 2 + 4, h / 2, 4, 10);
  },
  sill(g, w, h) {
    g.fillStyle = '#e8e2d4';
    g.fillRect(0, 0, w, h);
    grain(g, w, h, 8, 1200);
  },
  roof(g, w, h) {
    g.fillStyle = '#5a2a1c';
    g.fillRect(0, 0, w, h);
    const rows = 10, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = -1; c < 9; c++) {
        const x = c * (w / 8) + (r % 2 ? w / 16 : 0);
        g.fillStyle = shade(pick(['#9a4a30', '#8a4028', '#a5543a', '#7d3a24']), rr(0.9, 1.08));
        g.beginPath();
        g.ellipse(x + w / 16, r * rh + rh * 0.55, w / 17, rh * 0.62, 0, 0, Math.PI);
        g.fill();
      }
    }
  },
  trim(g, w, h) {
    g.fillStyle = '#f1ece2';
    g.fillRect(0, 0, w, h);
    grain(g, w, h, 6, 800);
  },
  metal(g, w, h) {
    g.fillStyle = '#4a4f55';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.06)';
    for (let i = 0; i < 200; i++) {
      const y = rnd() * h;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
  },
  // a worn Persian rug: madder field, navy border with rosettes, a central medallion and corner pieces
  rug(g, w, h) {
    const field = '#7c2723', navy = '#1f2540', gold = '#b98e4c', ivory = '#d9c9a6', teal = '#2f5654', rose = '#a3443a';
    g.fillStyle = navy;
    g.fillRect(0, 0, w, h);
    const B = h * 0.15;
    g.fillStyle = field;
    g.fillRect(B, B, w - 2 * B, h - 2 * B);
    // guard stripes
    g.strokeStyle = gold;
    g.lineWidth = 3;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.strokeRect(B - 6, B - 6, w - 2 * B + 12, h - 2 * B + 12);
    g.strokeStyle = ivory;
    g.lineWidth = 2;
    g.strokeRect(B - 12, B - 12, w - 2 * B + 24, h - 2 * B + 24);
    // rosettes along the border
    const rosette = (x, y, r) => {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        g.fillStyle = k % 2 ? rose : ivory;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.42, r * 0.2, a, 0, 7);
        g.fill();
      }
      g.fillStyle = gold;
      g.beginPath();
      g.arc(x, y, r * 0.28, 0, 7);
      g.fill();
    };
    const step = B * 1.1;
    for (let x = B * 0.5 + step / 2; x < w - B * 0.5; x += step) {
      rosette(x, B * 0.46, B * 0.3);
      rosette(x, h - B * 0.46, B * 0.3);
    }
    for (let y = B * 1.5; y < h - B * 1.2; y += step) {
      rosette(B * 0.46, y, B * 0.3);
      rosette(w - B * 0.46, y, B * 0.3);
    }
    // small repeating flowers over the field
    for (let y = B + 14; y < h - B - 8; y += 22)
      for (let x = B + 14 + ((y / 22) % 2) * 11; x < w - B - 8; x += 22) {
        g.fillStyle = 'rgba(217,201,166,0.35)';
        g.beginPath();
        g.moveTo(x, y - 5);
        g.lineTo(x + 4, y);
        g.lineTo(x, y + 5);
        g.lineTo(x - 4, y);
        g.fill();
        g.fillStyle = 'rgba(31,37,64,0.5)';
        g.fillRect(x - 1, y - 1, 2, 2);
      }
    // corner pieces
    for (const [cx, cy, sx, sy] of [[B, B, 1, 1], [w - B, B, -1, 1], [B, h - B, 1, -1], [w - B, h - B, -1, -1]]) {
      g.fillStyle = navy;
      g.beginPath();
      g.moveTo(cx, cy);
      g.quadraticCurveTo(cx + sx * h * 0.32, cy, cx + sx * h * 0.38, cy + sy * h * 0.05);
      g.quadraticCurveTo(cx + sx * h * 0.12, cy + sy * h * 0.1, cx, cy + sy * h * 0.26);
      g.fill();
      g.strokeStyle = gold;
      g.lineWidth = 2;
      g.stroke();
    }
    // the medallion
    const mx = w / 2, my = h / 2;
    const lozenge = (rx, ry, col) => {
      g.fillStyle = col;
      g.beginPath();
      for (let k = 0; k <= 32; k++) {
        const a = (k / 32) * Math.PI * 2;
        const wob = 1 + 0.08 * Math.cos(a * 8);
        const px = mx + Math.cos(a) * rx * wob * (0.55 + 0.45 * Math.abs(Math.cos(a)));
        const py = my + Math.sin(a) * ry * wob;
        k ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.fill();
    };
    lozenge(h * 0.62, h * 0.34, gold);
    lozenge(h * 0.57, h * 0.3, navy);
    lozenge(h * 0.44, h * 0.22, teal);
    lozenge(h * 0.3, h * 0.15, ivory);
    rosette(mx, my, h * 0.11);
    // pendants on the long axis
    for (const s2 of [-1, 1]) {
      g.fillStyle = navy;
      g.beginPath();
      g.arc(mx + s2 * h * 0.72, my, h * 0.07, 0, 7);
      g.fill();
      rosette(mx + s2 * h * 0.72, my, h * 0.05);
    }
    // wear: lighter patches where people walk, then wool grain
    for (let i = 0; i < 18; i++) {
      const x = rnd() * w, y = rnd() * h, r = rr(20, 70);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(230,210,180,0.10)');
      gr.addColorStop(1, 'rgba(230,210,180,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // age the dyes
    g.fillStyle = 'rgba(70,52,40,0.22)';
    g.fillRect(0, 0, w, h);
    grain(g, w, h, 22, 14000);
  },
  rescue(g, w, h) {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(80,220,120,.07)';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,240,140,.28)';
    g.lineWidth = 5;
    for (let i = -h; i < w; i += 128) {
      g.beginPath();
      g.moveTo(i, h);
      g.lineTo(i + h, 0);
      g.stroke();
    }
  },
};

function DRAW_hedgeTop(g, w, h) {
  for (let i = 0; i < 300; i++) {
    g.fillStyle = pick(['#3d6328', '#2f5220', '#4a7330', '#56803a']);
    g.beginPath();
    g.ellipse(rnd() * w, h * 0.3 + rnd() * h * 0.7 + h, rr(2, 5), rr(1.5, 3), rnd() * 3, 0, 7);
    g.fill();
  }
}

function wainscot(g, w, h, color) {
  const top = h * 0.75;
  g.fillStyle = color;
  g.fillRect(0, top, w, h - top);
  g.fillStyle = 'rgba(255,230,190,.18)';
  g.fillRect(0, top, w, 5);
  g.strokeStyle = 'rgba(0,0,0,.3)';
  g.lineWidth = 3;
  for (let i = 0; i < 2; i++) g.strokeRect(i * w / 2 + 10, top + 16, w / 2 - 20, h - top - 30);
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.fillRect(0, 0, w, h * 0.02);
}

function wallpaper(g, w, h, base, motif) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  g.fillStyle = motif;
  for (let y = 0; y < h * 0.75; y += 40)
    for (let x = (y / 40) % 2 ? 20 : 0; x < w; x += 40) {
      g.beginPath();
      g.moveTo(x + 20, y + 6);
      g.quadraticCurveTo(x + 32, y + 20, x + 20, y + 34);
      g.quadraticCurveTo(x + 8, y + 20, x + 20, y + 6);
      g.fill();
    }
  grain(g, w, h, 8, 2500);
}

// world metres per texture repeat: [u, v]
export const TEX_SIZE = {
  grass: [3, 3], pave: [2, 2], terrace: [2, 2], gravel: [2, 2], wood: [2, 2], parquet: [2, 2], darkwood: [2, 2],
  marble: [2, 2], carpet: [2, 2], tile: [1, 1], concrete: [3, 3], water: [3, 3], stone: [2.5, 2.5],
  plaster: [2.5, 4], w_hall: [2, 4], w_lib: [2, 4], w_garage: [2, 4], w_kitchen: [1, 4], w_dining: [2, 4],
  w_lounge: [2, 4], w_corr: [2, 4], ceiling: [2, 2], crate: [1, 1], shelf: [1, 1.3], counter: [1, 1], table: [1.5, 1.5],
  sofa: [1, 1], hedge: [1.5, 1.5], car: [2, 1.4], van: [3, 2.4], pillar: [1, 2], fire: [1, 1], piano: [1, 1.1],
  fountain: [1, 1], metalshelf: [1, 2.2], fridge: [1, 2.2], plant: [1, 1.2], lounger: [1, 1], shed: [2, 2],
  cabinet: [1, 1.1], sill: [1, 1], roof: [2, 2], trim: [1, 1], metal: [1, 1], rug: [1, 1], rescue: [4, 4],
};

const PIX = { plaster: [256, 512], w_hall: [256, 512], w_lib: [256, 512], w_garage: [256, 512], w_kitchen: [128, 512], w_dining: [256, 512], w_lounge: [256, 512], w_corr: [256, 512], rug: [1024, 400] };

// CC0 photo textures from Poly Haven (assets/tex), 512 px; the rest stays hand-drawn
const PHOTO = {
  grass: 'leafy_grass', pave: 'cobblestone_floor_08', terrace: 'patio_tiles', gravel: 'gravel_floor_02', wood: 'wood_floor',
  parquet: 'herringbone_parquet', darkwood: 'dark_wooden_planks', tile: 'floor_tiles_06',
  concrete: 'concrete_floor_worn_001', stone: 'stone_wall', plaster: 'beige_wall_001', w_garage: 'brick_wall_001',
  w_kitchen: 'rounded_square_tiled_wall', roof: 'clay_roof_tiles_02', fire: 'medieval_red_brick',
  w_lib: 'dark_paneled_wood', table: 'wood_table_worn', shed: 'weathered_planks', fountain: 'white_sandstone_bricks',
  counter: 'marble_01', cabinet: 'wood_cabinet_worn_long',
};
const PHOTO_SIZE = {
  grass: [3, 3], pave: [2.5, 2.5], terrace: [2, 2], gravel: [2.5, 2.5], wood: [2, 2], parquet: [1.6, 1.6], darkwood: [2.2, 2.2],
  marble: [2, 2], tile: [1.5, 1.5], concrete: [3, 3], stone: [3, 3], plaster: [3, 3], w_garage: [2.5, 2.5], w_kitchen: [1.5, 1.5],
  ceiling: [3, 3], roof: [1.8, 1.8], fire: [1.6, 1.6], w_lib: [2, 2], table: [1.5, 1.5], shed: [2, 2], fountain: [1.6, 1.6],
  pillar: [1.2, 2.4], trim: [1.5, 1.5], sill: [1, 1], counter: [1, 1], cabinet: [1.2, 1.2],
};
export const PHOTO_ON = !new URLSearchParams(location.search).has('nophoto');
if (PHOTO_ON) Object.assign(TEX_SIZE, PHOTO_SIZE);

export function makeTextures(renderer) {
  const out = {};
  const loader = new THREE.TextureLoader();
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  for (const key of Object.keys(DRAW)) {
    const [w, h] = PIX[key] || [256, 256];
    const [c, g] = canvas(w, h);
    DRAW[key](g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    out[key] = t;
  }
  if (PHOTO_ON)
    for (const [key, name] of Object.entries(PHOTO)) {
      const t = loader.load(`assets/tex/${name}.jpg`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      out[key] = t;
    }
  return out;
}

// small sprite textures for effects
export function spriteTexture(kind) {
  const [c, g] = canvas(64, 64);
  if (kind === 'flash') {
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,250,220,1)');
    gr.addColorStop(0.3, 'rgba(255,200,90,.9)');
    gr.addColorStop(1, 'rgba(255,120,20,0)');
    g.fillStyle = gr;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = i % 2 ? 12 : 31;
      g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    g.fill();
  } else if (kind === 'hole') {
    const gr = g.createRadialGradient(32, 32, 1, 32, 32, 30);
    gr.addColorStop(0, 'rgba(10,8,6,1)');
    gr.addColorStop(0.35, 'rgba(25,20,15,.9)');
    gr.addColorStop(0.6, 'rgba(40,35,30,.35)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  } else if (kind === 'puff') {
    const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
