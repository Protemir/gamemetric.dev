// Pictures are drawn with canvas paths in a 1 x 1 square and then sampled into a grid,
// so the same drawing works as an 8 x 8 tutorial or a 22 x 22 late level.
// Ornaments are mirror-symmetric only (like қошқар мүйіз), never pinwheels.
import { rng } from './util.js';

export const COLORS = {
  red: '#e0393e',
  wine: '#9c2238',
  gold: '#f4b93a',
  orange: '#f07c2e',
  teal: '#1fb3a5',
  blue: '#2f6ccf',
  sky: '#5cc5f2',
  green: '#43a84f',
  leaf: '#7cc444',
  white: '#f6efe2',
  cream: '#e9d3a8',
  brown: '#8a5534',
  dark: '#2d2440',
  purple: '#7b49b8',
  pink: '#ef6f9f',
  grey: '#9aa3b5',
};

const P = (c, ...rest) => {
  c.beginPath();
  rest.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
};
const circle = (c, x, y, r) => {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
};
const fill = (c, color) => {
  c.fillStyle = COLORS[color];
  c.fill();
};

// a ram's horn curl: a thick spiral, the base element of Kazakh ornaments
function horn(c, x, y, r, dir, color, w = 0.06) {
  c.save();
  c.translate(x, y);
  c.scale(dir, 1);
  c.lineCap = 'round';
  c.lineWidth = w;
  c.strokeStyle = COLORS[color];
  c.beginPath();
  c.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.9);
  c.arc(r * 0.45, -r * 0.05, r * 0.5, Math.PI * 1.9, Math.PI * 1.0, true);
  c.stroke();
  c.restore();
}

export const PICTURES = [
  {
    id: 'heart',
    name: { ru: 'Сердце', en: 'Heart' },
    draw(c) {
      c.beginPath();
      c.moveTo(0.5, 0.88);
      c.bezierCurveTo(0.05, 0.6, 0.02, 0.22, 0.28, 0.16);
      c.bezierCurveTo(0.42, 0.13, 0.5, 0.26, 0.5, 0.3);
      c.bezierCurveTo(0.5, 0.26, 0.58, 0.13, 0.72, 0.16);
      c.bezierCurveTo(0.98, 0.22, 0.95, 0.6, 0.5, 0.88);
      fill(c, 'red');
      circle(c, 0.3, 0.32, 0.08);
      fill(c, 'white');
    },
  },
  {
    id: 'tulip',
    name: { ru: 'Тюльпан', en: 'Tulip' },
    draw(c) {
      c.fillStyle = COLORS.green;
      c.fillRect(0.47, 0.45, 0.06, 0.5);
      P(c, [0.5, 0.95], [0.18, 0.62], [0.28, 0.6], [0.5, 0.82]);
      fill(c, 'leaf');
      P(c, [0.5, 0.95], [0.84, 0.66], [0.72, 0.62], [0.5, 0.84]);
      fill(c, 'leaf');
      c.beginPath();
      c.moveTo(0.26, 0.2);
      c.lineTo(0.38, 0.32);
      c.lineTo(0.5, 0.12);
      c.lineTo(0.62, 0.32);
      c.lineTo(0.74, 0.2);
      c.quadraticCurveTo(0.78, 0.5, 0.5, 0.52);
      c.quadraticCurveTo(0.22, 0.5, 0.26, 0.2);
      fill(c, 'red');
      P(c, [0.42, 0.3], [0.5, 0.16], [0.58, 0.3], [0.5, 0.46]);
      fill(c, 'wine');
    },
  },
  {
    id: 'apple',
    name: { ru: 'Апорт', en: 'Aport apple' },
    draw(c) {
      c.beginPath();
      c.moveTo(0.5, 0.3);
      c.bezierCurveTo(0.2, 0.12, 0.04, 0.4, 0.14, 0.62);
      c.bezierCurveTo(0.24, 0.9, 0.42, 0.92, 0.5, 0.86);
      c.bezierCurveTo(0.58, 0.92, 0.76, 0.9, 0.86, 0.62);
      c.bezierCurveTo(0.96, 0.4, 0.8, 0.12, 0.5, 0.3);
      fill(c, 'red');
      c.beginPath();
      c.ellipse(0.3, 0.45, 0.07, 0.12, -0.4, 0, Math.PI * 2);
      fill(c, 'pink');
      c.fillStyle = COLORS.brown;
      c.fillRect(0.47, 0.1, 0.06, 0.2);
      c.beginPath();
      c.ellipse(0.65, 0.15, 0.14, 0.07, -0.4, 0, Math.PI * 2);
      fill(c, 'leaf');
    },
  },
  {
    id: 'kese',
    name: { ru: 'Кесе с чаем', en: 'Tea bowl' },
    draw(c) {
      c.beginPath();
      c.ellipse(0.5, 0.36, 0.4, 0.09, 0, 0, Math.PI * 2);
      fill(c, 'brown');
      c.beginPath();
      c.moveTo(0.1, 0.36);
      c.quadraticCurveTo(0.14, 0.8, 0.5, 0.82);
      c.quadraticCurveTo(0.86, 0.8, 0.9, 0.36);
      c.quadraticCurveTo(0.5, 0.48, 0.1, 0.36);
      fill(c, 'white');
      c.fillStyle = COLORS.blue;
      c.fillRect(0.12, 0.5, 0.76, 0.08);
      for (let k = 0; k < 4; k++) {
        circle(c, 0.23 + k * 0.18, 0.66, 0.035);
        fill(c, 'blue');
      }
      c.fillStyle = COLORS.blue;
      c.fillRect(0.38, 0.82, 0.24, 0.06);
      c.lineWidth = 0.035;
      c.strokeStyle = COLORS.grey;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0.4, 0.22);
      c.quadraticCurveTo(0.34, 0.12, 0.42, 0.04);
      c.moveTo(0.58, 0.22);
      c.quadraticCurveTo(0.52, 0.12, 0.6, 0.04);
      c.stroke();
    },
  },
  {
    id: 'yurt',
    name: { ru: 'Киіз үй', en: 'Yurt' },
    draw(c) {
      c.beginPath();
      c.moveTo(0.06, 0.52);
      c.quadraticCurveTo(0.5, 0.06, 0.94, 0.52);
      fill(c, 'white');
      c.fillStyle = COLORS.cream;
      c.fillRect(0.08, 0.52, 0.84, 0.36);
      c.fillStyle = COLORS.red;
      c.fillRect(0.06, 0.5, 0.88, 0.07);
      for (let k = 0; k < 6; k++) {
        P(c, [0.12 + k * 0.14, 0.57], [0.19 + k * 0.14, 0.64], [0.26 + k * 0.14, 0.57]);
        fill(c, 'red');
      }
      c.fillStyle = COLORS.wine;
      c.fillRect(0.4, 0.62, 0.2, 0.26);
      c.fillStyle = COLORS.gold;
      c.fillRect(0.4, 0.62, 0.2, 0.04);
      c.fillRect(0.48, 0.62, 0.04, 0.26);
      c.beginPath();
      c.ellipse(0.5, 0.2, 0.1, 0.04, 0, 0, Math.PI * 2);
      fill(c, 'brown');
      c.fillStyle = COLORS.green;
      c.fillRect(0, 0.88, 1, 0.08);
    },
  },
  {
    id: 'dombra',
    name: { ru: 'Домбра', en: 'Dombra' },
    draw(c) {
      c.save();
      c.translate(0.5, 0.5);
      c.rotate(-0.6);
      c.translate(-0.5, -0.5);
      c.beginPath();
      c.ellipse(0.5, 0.74, 0.17, 0.22, 0, 0, Math.PI * 2);
      fill(c, 'orange');
      circle(c, 0.5, 0.7, 0.05);
      fill(c, 'dark');
      c.fillStyle = COLORS.brown;
      c.fillRect(0.46, 0.0, 0.08, 0.56);
      c.fillStyle = COLORS.dark;
      c.fillRect(0.44, 0.0, 0.12, 0.08);
      c.fillStyle = COLORS.cream;
      c.fillRect(0.485, 0.06, 0.012, 0.8);
      c.fillRect(0.51, 0.06, 0.012, 0.8);
      c.fillStyle = COLORS.dark;
      c.fillRect(0.43, 0.86, 0.14, 0.03);
      c.restore();
    },
  },
  {
    id: 'mountains',
    name: { ru: 'Горы Алатау', en: 'Alatau mountains' },
    draw(c) {
      c.fillStyle = COLORS.sky;
      c.fillRect(0, 0, 1, 1);
      circle(c, 0.76, 0.22, 0.12);
      fill(c, 'gold');
      P(c, [0, 0.9], [0.32, 0.3], [0.62, 0.9]);
      fill(c, 'blue');
      P(c, [0.32, 0.3], [0.23, 0.46], [0.3, 0.42], [0.35, 0.47], [0.4, 0.44]);
      fill(c, 'white');
      P(c, [0.4, 0.9], [0.7, 0.42], [1, 0.9]);
      fill(c, 'purple');
      P(c, [0.7, 0.42], [0.63, 0.53], [0.69, 0.5], [0.74, 0.54], [0.77, 0.52]);
      fill(c, 'white');
      c.fillStyle = COLORS.green;
      c.fillRect(0, 0.86, 1, 0.14);
    },
  },
  {
    id: 'baiterek',
    name: { ru: 'Бәйтерек', en: 'Baiterek' },
    draw(c) {
      c.fillStyle = COLORS.sky;
      c.fillRect(0, 0, 1, 1);
      c.fillStyle = COLORS.white;
      c.fillRect(0.44, 0.38, 0.12, 0.54);
      c.lineWidth = 0.05;
      c.strokeStyle = COLORS.white;
      c.beginPath();
      c.moveTo(0.36, 0.92);
      c.lineTo(0.44, 0.4);
      c.moveTo(0.64, 0.92);
      c.lineTo(0.56, 0.4);
      c.moveTo(0.44, 0.4);
      c.quadraticCurveTo(0.3, 0.3, 0.34, 0.18);
      c.moveTo(0.56, 0.4);
      c.quadraticCurveTo(0.7, 0.3, 0.66, 0.18);
      c.stroke();
      circle(c, 0.5, 0.24, 0.13);
      fill(c, 'gold');
      circle(c, 0.46, 0.2, 0.04);
      fill(c, 'white');
      c.fillStyle = COLORS.grey;
      c.fillRect(0, 0.92, 1, 0.08);
    },
  },
  {
    id: 'eagle',
    name: { ru: 'Бүркіт', en: 'Golden eagle' },
    draw(c) {
      c.fillStyle = COLORS.sky;
      c.fillRect(0, 0, 1, 1);
      c.beginPath();
      c.moveTo(0.5, 0.42);
      c.quadraticCurveTo(0.3, 0.2, 0.02, 0.26);
      c.lineTo(0.14, 0.34);
      c.lineTo(0.06, 0.38);
      c.lineTo(0.2, 0.44);
      c.lineTo(0.12, 0.5);
      c.quadraticCurveTo(0.34, 0.58, 0.44, 0.56);
      c.lineTo(0.42, 0.8);
      c.lineTo(0.5, 0.74);
      c.lineTo(0.58, 0.8);
      c.lineTo(0.56, 0.56);
      c.quadraticCurveTo(0.66, 0.58, 0.88, 0.5);
      c.lineTo(0.8, 0.44);
      c.lineTo(0.94, 0.38);
      c.lineTo(0.86, 0.34);
      c.lineTo(0.98, 0.26);
      c.quadraticCurveTo(0.7, 0.2, 0.5, 0.42);
      fill(c, 'brown');
      circle(c, 0.5, 0.36, 0.07);
      fill(c, 'gold');
      P(c, [0.53, 0.38], [0.6, 0.41], [0.53, 0.42]);
      fill(c, 'orange');
    },
  },
  {
    id: 'horse',
    name: { ru: 'Тұлпар', en: 'Tulpar horse' },
    draw(c) {
      c.beginPath();
      c.moveTo(0.3, 0.95);
      c.lineTo(0.34, 0.6);
      c.quadraticCurveTo(0.36, 0.3, 0.52, 0.16);
      c.lineTo(0.56, 0.06);
      c.lineTo(0.62, 0.14);
      c.quadraticCurveTo(0.82, 0.24, 0.9, 0.48);
      c.lineTo(0.84, 0.56);
      c.lineTo(0.66, 0.46);
      c.quadraticCurveTo(0.6, 0.62, 0.7, 0.95);
      fill(c, 'brown');
      c.beginPath();
      c.moveTo(0.52, 0.16);
      c.quadraticCurveTo(0.3, 0.3, 0.3, 0.7);
      c.lineTo(0.36, 0.62);
      c.quadraticCurveTo(0.38, 0.34, 0.56, 0.2);
      fill(c, 'dark');
      circle(c, 0.66, 0.26, 0.03);
      fill(c, 'white');
    },
  },
  {
    id: 'moon',
    name: { ru: 'Ай мен жұлдыз', en: 'Moon and star' },
    draw(c) {
      c.fillStyle = COLORS.dark;
      c.fillRect(0, 0, 1, 1);
      circle(c, 0.42, 0.5, 0.3);
      fill(c, 'gold');
      circle(c, 0.54, 0.44, 0.27);
      fill(c, 'dark');
      const star = (x, y, r) => {
        c.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          const rr = k % 2 ? r * 0.45 : r;
          c[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        c.closePath();
        fill(c, 'white');
      };
      star(0.74, 0.3, 0.12);
      star(0.82, 0.72, 0.06);
      star(0.2, 0.16, 0.05);
    },
  },
  {
    id: 'baursak',
    name: { ru: 'Бауырсақ', en: 'Baursaks' },
    draw(c) {
      c.beginPath();
      c.ellipse(0.5, 0.76, 0.46, 0.14, 0, 0, Math.PI * 2);
      fill(c, 'white');
      c.beginPath();
      c.ellipse(0.5, 0.74, 0.38, 0.09, 0, 0, Math.PI * 2);
      fill(c, 'blue');
      const b = (x, y, r) => {
        c.beginPath();
        c.roundRect ? c.roundRect(x - r, y - r, r * 2, r * 2, r * 0.45) : c.rect(x - r, y - r, r * 2, r * 2);
        fill(c, 'gold');
        circle(c, x - r * 0.35, y - r * 0.35, r * 0.3);
        fill(c, 'cream');
      };
      b(0.3, 0.62, 0.11);
      b(0.52, 0.64, 0.11);
      b(0.72, 0.6, 0.1);
      b(0.4, 0.44, 0.11);
      b(0.62, 0.44, 0.1);
      b(0.52, 0.26, 0.1);
    },
  },
  {
    id: 'sun',
    name: { ru: 'Күн', en: 'Sun' },
    draw(c) {
      c.fillStyle = COLORS.sky;
      c.fillRect(0, 0, 1, 1);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        P(
          c,
          [0.5 + Math.cos(a - 0.12) * 0.3, 0.5 + Math.sin(a - 0.12) * 0.3],
          [0.5 + Math.cos(a) * 0.47, 0.5 + Math.sin(a) * 0.47],
          [0.5 + Math.cos(a + 0.12) * 0.3, 0.5 + Math.sin(a + 0.12) * 0.3],
        );
        fill(c, k % 2 ? 'orange' : 'gold');
      }
      circle(c, 0.5, 0.5, 0.28);
      fill(c, 'gold');
      circle(c, 0.44, 0.44, 0.08);
      fill(c, 'white');
    },
  },
  {
    id: 'camel',
    name: { ru: 'Түйе', en: 'Camel' },
    draw(c) {
      c.fillStyle = COLORS.gold;
      c.fillRect(0, 0.84, 1, 0.16);
      circle(c, 0.82, 0.18, 0.08);
      fill(c, 'orange');
      c.beginPath();
      c.moveTo(0.12, 0.6);
      c.quadraticCurveTo(0.2, 0.3, 0.36, 0.46);
      c.quadraticCurveTo(0.44, 0.26, 0.56, 0.46);
      c.quadraticCurveTo(0.64, 0.5, 0.7, 0.38);
      c.lineTo(0.74, 0.22);
      c.lineTo(0.86, 0.24);
      c.lineTo(0.86, 0.3);
      c.lineTo(0.78, 0.32);
      c.quadraticCurveTo(0.76, 0.62, 0.62, 0.64);
      c.lineTo(0.62, 0.86);
      c.lineTo(0.56, 0.86);
      c.lineTo(0.54, 0.66);
      c.lineTo(0.26, 0.66);
      c.lineTo(0.24, 0.86);
      c.lineTo(0.18, 0.86);
      c.lineTo(0.16, 0.64);
      c.closePath();
      fill(c, 'brown');
      c.fillStyle = COLORS.red;
      c.fillRect(0.28, 0.44, 0.22, 0.06);
    },
  },
  {
    id: 'shanyrak',
    name: { ru: 'Шаңырақ', en: 'Shanyrak' },
    draw(c) {
      circle(c, 0.5, 0.5, 0.44);
      fill(c, 'brown');
      circle(c, 0.5, 0.5, 0.36);
      fill(c, 'sky');
      c.lineCap = 'round';
      c.strokeStyle = COLORS.brown;
      c.lineWidth = 0.07;
      c.beginPath();
      c.moveTo(0.18, 0.5);
      c.lineTo(0.82, 0.5);
      c.moveTo(0.5, 0.18);
      c.lineTo(0.5, 0.82);
      c.stroke();
      c.lineWidth = 0.05;
      c.beginPath();
      c.moveTo(0.27, 0.27);
      c.lineTo(0.73, 0.73);
      c.moveTo(0.73, 0.27);
      c.lineTo(0.27, 0.73);
      c.stroke();
      circle(c, 0.5, 0.5, 0.08);
      fill(c, 'gold');
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        circle(c, 0.5 + Math.cos(a) * 0.44, 0.5 + Math.sin(a) * 0.44, 0.035);
        fill(c, 'red');
      }
    },
  },
  {
    id: 'asyk',
    name: { ru: 'Асық', en: 'Asyk' },
    draw(c) {
      c.fillStyle = COLORS.green;
      c.fillRect(0, 0.7, 1, 0.3);
      c.beginPath();
      c.moveTo(0.18, 0.42);
      c.quadraticCurveTo(0.2, 0.18, 0.42, 0.24);
      c.quadraticCurveTo(0.5, 0.3, 0.58, 0.24);
      c.quadraticCurveTo(0.8, 0.18, 0.82, 0.42);
      c.quadraticCurveTo(0.86, 0.66, 0.66, 0.68);
      c.quadraticCurveTo(0.5, 0.6, 0.34, 0.68);
      c.quadraticCurveTo(0.14, 0.66, 0.18, 0.42);
      fill(c, 'cream');
      c.beginPath();
      c.ellipse(0.5, 0.44, 0.1, 0.13, 0, 0, Math.PI * 2);
      fill(c, 'brown');
      c.beginPath();
      c.ellipse(0.3, 0.42, 0.05, 0.08, 0.3, 0, Math.PI * 2);
      fill(c, 'white');
      circle(c, 0.82, 0.82, 0.07);
      fill(c, 'red');
    },
  },
  {
    id: 'kazan',
    name: { ru: 'Қазан', en: 'Kazan' },
    draw(c) {
      c.beginPath();
      c.moveTo(0.1, 0.4);
      c.quadraticCurveTo(0.12, 0.86, 0.5, 0.86);
      c.quadraticCurveTo(0.88, 0.86, 0.9, 0.4);
      fill(c, 'dark');
      c.fillStyle = COLORS.grey;
      c.fillRect(0.06, 0.36, 0.88, 0.06);
      c.beginPath();
      c.ellipse(0.5, 0.38, 0.36, 0.05, 0, 0, Math.PI * 2);
      fill(c, 'gold');
      for (const x of [0.32, 0.5, 0.68]) {
        c.lineWidth = 0.035;
        c.strokeStyle = COLORS.white;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, 0.3);
        c.quadraticCurveTo(x - 0.06, 0.18, x, 0.06);
        c.stroke();
      }
      P(c, [0.2, 0.9], [0.5, 0.78], [0.8, 0.9], [0.86, 0.98], [0.14, 0.98]);
      fill(c, 'orange');
    },
  },
  {
    id: 'rocket',
    name: { ru: 'Байқоңыр', en: 'Baikonur' },
    draw(c) {
      c.fillStyle = COLORS.dark;
      c.fillRect(0, 0, 1, 1);
      for (const [x, y] of [[0.15, 0.2], [0.8, 0.12], [0.86, 0.5], [0.12, 0.6], [0.3, 0.08]]) {
        circle(c, x, y, 0.02);
        fill(c, 'white');
      }
      c.beginPath();
      c.moveTo(0.5, 0.06);
      c.quadraticCurveTo(0.64, 0.2, 0.62, 0.66);
      c.lineTo(0.38, 0.66);
      c.quadraticCurveTo(0.36, 0.2, 0.5, 0.06);
      fill(c, 'white');
      circle(c, 0.5, 0.32, 0.06);
      fill(c, 'sky');
      P(c, [0.38, 0.5], [0.26, 0.72], [0.38, 0.66]);
      fill(c, 'red');
      P(c, [0.62, 0.5], [0.74, 0.72], [0.62, 0.66]);
      fill(c, 'red');
      P(c, [0.42, 0.66], [0.5, 0.94], [0.58, 0.66]);
      fill(c, 'orange');
      P(c, [0.46, 0.66], [0.5, 0.82], [0.54, 0.66]);
      fill(c, 'gold');
    },
  },
  {
    id: 'saukele',
    name: { ru: 'Сәукеле', en: 'Saukele' },
    draw(c) {
      P(c, [0.5, 0.04], [0.74, 0.7], [0.26, 0.7]);
      fill(c, 'red');
      c.fillStyle = COLORS.gold;
      for (let k = 0; k < 4; k++) c.fillRect(0.34 - k * 0.02 + 0.1, 0.24 + k * 0.12, 0.12 + k * 0.04, 0.03);
      circle(c, 0.5, 0.1, 0.05);
      fill(c, 'white');
      c.fillStyle = COLORS.white;
      c.fillRect(0.2, 0.7, 0.6, 0.07);
      c.fillStyle = COLORS.gold;
      for (let k = 0; k < 6; k++) c.fillRect(0.22 + k * 0.1, 0.77, 0.04, 0.14);
      circle(c, 0.5, 0.48, 0.05);
      fill(c, 'teal');
    },
  },
  {
    id: 'teapot',
    name: { ru: 'Шәйнек', en: 'Teapot' },
    draw(c) {
      c.beginPath();
      c.ellipse(0.48, 0.6, 0.3, 0.26, 0, 0, Math.PI * 2);
      fill(c, 'teal');
      c.fillStyle = COLORS.white;
      c.fillRect(0.2, 0.56, 0.56, 0.06);
      for (let k = 0; k < 3; k++) {
        circle(c, 0.34 + k * 0.14, 0.7, 0.035);
        fill(c, 'white');
      }
      P(c, [0.76, 0.56], [0.94, 0.36], [0.96, 0.4], [0.8, 0.66]);
      fill(c, 'teal');
      c.lineWidth = 0.05;
      c.strokeStyle = COLORS.dark;
      c.beginPath();
      c.arc(0.16, 0.6, 0.1, Math.PI * 0.5, Math.PI * 1.5);
      c.stroke();
      c.beginPath();
      c.ellipse(0.48, 0.34, 0.14, 0.05, 0, 0, Math.PI * 2);
      fill(c, 'dark');
      circle(c, 0.48, 0.27, 0.04);
      fill(c, 'gold');
    },
  },
  {
    id: 'appletree',
    name: { ru: 'Алма ағашы', en: 'Apple tree' },
    draw(c) {
      c.fillStyle = COLORS.sky;
      c.fillRect(0, 0, 1, 1);
      c.fillStyle = COLORS.brown;
      c.fillRect(0.44, 0.5, 0.12, 0.4);
      for (const [x, y, r] of [[0.5, 0.32, 0.24], [0.3, 0.42, 0.18], [0.7, 0.42, 0.18], [0.5, 0.5, 0.18]]) {
        circle(c, x, y, r);
        fill(c, 'green');
      }
      for (const [x, y] of [[0.36, 0.3], [0.6, 0.24], [0.66, 0.46], [0.42, 0.5], [0.26, 0.46], [0.52, 0.38]]) {
        circle(c, x, y, 0.045);
        fill(c, 'red');
      }
      c.fillStyle = COLORS.leaf;
      c.fillRect(0, 0.88, 1, 0.12);
    },
  },
  {
    id: 'snowman',
    name: { ru: 'Аққала', en: 'Snowman' },
    draw(c) {
      c.fillStyle = COLORS.blue;
      c.fillRect(0, 0, 1, 1);
      for (const [x, y] of [[0.12, 0.16], [0.86, 0.22], [0.2, 0.56], [0.84, 0.62], [0.5, 0.06]]) {
        circle(c, x, y, 0.025);
        fill(c, 'white');
      }
      circle(c, 0.5, 0.72, 0.22);
      fill(c, 'white');
      circle(c, 0.5, 0.4, 0.15);
      fill(c, 'white');
      P(c, [0.5, 0.4], [0.68, 0.43], [0.5, 0.45]);
      fill(c, 'orange');
      circle(c, 0.45, 0.36, 0.02);
      fill(c, 'dark');
      circle(c, 0.56, 0.36, 0.02);
      fill(c, 'dark');
      c.fillStyle = COLORS.red;
      c.fillRect(0.36, 0.52, 0.28, 0.05);
      P(c, [0.38, 0.27], [0.5, 0.1], [0.62, 0.27]);
      fill(c, 'red');
      c.fillStyle = COLORS.white;
      c.fillRect(0.0, 0.92, 1, 0.08);
    },
  },
  {
    id: 'watermelon',
    name: { ru: 'Қарбыз', en: 'Watermelon' },
    draw(c) {
      c.beginPath();
      c.arc(0.5, 0.36, 0.44, 0, Math.PI);
      fill(c, 'green');
      c.beginPath();
      c.arc(0.5, 0.36, 0.38, 0, Math.PI);
      fill(c, 'white');
      c.beginPath();
      c.arc(0.5, 0.36, 0.34, 0, Math.PI);
      fill(c, 'red');
      for (const [x, y] of [[0.34, 0.46], [0.5, 0.52], [0.66, 0.46], [0.42, 0.6], [0.58, 0.6], [0.5, 0.42]]) {
        c.beginPath();
        c.ellipse(x, y, 0.02, 0.035, 0, 0, Math.PI * 2);
        fill(c, 'dark');
      }
    },
  },
  {
    id: 'melon',
    name: { ru: 'Қауын', en: 'Melon' },
    draw(c) {
      c.beginPath();
      c.ellipse(0.5, 0.56, 0.42, 0.3, 0, 0, Math.PI * 2);
      fill(c, 'gold');
      c.strokeStyle = COLORS.orange;
      c.lineWidth = 0.035;
      for (const dx of [-0.24, -0.08, 0.08, 0.24]) {
        c.beginPath();
        c.ellipse(0.5 + dx, 0.56, 0.06, 0.28, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = COLORS.green;
      c.fillRect(0.48, 0.18, 0.05, 0.1);
      c.beginPath();
      c.ellipse(0.62, 0.2, 0.1, 0.05, -0.3, 0, Math.PI * 2);
      fill(c, 'leaf');
    },
  },
  {
    id: 'grapes',
    name: { ru: 'Жүзім', en: 'Grapes' },
    draw(c) {
      c.fillStyle = COLORS.brown;
      c.fillRect(0.48, 0.06, 0.05, 0.14);
      c.beginPath();
      c.ellipse(0.66, 0.14, 0.14, 0.07, 0.3, 0, Math.PI * 2);
      fill(c, 'green');
      const rows = [[0.28, 0.4, 0.52, 0.64, 0.76], [0.34, 0.46, 0.58, 0.7], [0.4, 0.52, 0.64], [0.46, 0.58], [0.52]];
      rows.forEach((xs, k) =>
        xs.forEach((x) => {
          circle(c, x - 0.02, 0.28 + k * 0.13, 0.075);
          fill(c, 'purple');
          circle(c, x - 0.045, 0.255 + k * 0.13, 0.022);
          fill(c, 'pink');
        }),
      );
    },
  },
  {
    id: 'chamomile',
    name: { ru: 'Түймедақ', en: 'Chamomile' },
    draw(c) {
      c.fillStyle = COLORS.green;
      c.fillRect(0.48, 0.5, 0.05, 0.46);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        c.beginPath();
        c.ellipse(0.5 + Math.cos(a) * 0.2, 0.4 + Math.sin(a) * 0.2, 0.15, 0.06, a, 0, Math.PI * 2);
        fill(c, 'white');
      }
      circle(c, 0.5, 0.4, 0.12);
      fill(c, 'gold');
      circle(c, 0.47, 0.37, 0.04);
      fill(c, 'orange');
      c.beginPath();
      c.ellipse(0.38, 0.8, 0.12, 0.05, -0.5, 0, Math.PI * 2);
      fill(c, 'leaf');
    },
  },
  {
    id: 'butterfly',
    name: { ru: 'Көбелек', en: 'Butterfly' },
    draw(c) {
      for (const s of [-1, 1]) {
        c.beginPath();
        c.ellipse(0.5 + s * 0.2, 0.34, 0.2, 0.18, s * -0.5, 0, Math.PI * 2);
        fill(c, 'sky');
        c.beginPath();
        c.ellipse(0.5 + s * 0.16, 0.64, 0.14, 0.13, s * 0.5, 0, Math.PI * 2);
        fill(c, 'blue');
        circle(c, 0.5 + s * 0.22, 0.32, 0.06);
        fill(c, 'gold');
        circle(c, 0.5 + s * 0.16, 0.66, 0.04);
        fill(c, 'white');
      }
      c.beginPath();
      c.ellipse(0.5, 0.5, 0.04, 0.26, 0, 0, Math.PI * 2);
      fill(c, 'dark');
      c.strokeStyle = COLORS.dark;
      c.lineWidth = 0.025;
      c.beginPath();
      c.moveTo(0.49, 0.26);
      c.lineTo(0.42, 0.1);
      c.moveTo(0.51, 0.26);
      c.lineTo(0.58, 0.1);
      c.stroke();
    },
  },
  {
    id: 'snowflake',
    name: { ru: 'Қар ұшқыны', en: 'Snowflake' },
    draw(c) {
      c.fillStyle = COLORS.blue;
      c.fillRect(0, 0, 1, 1);
      c.strokeStyle = COLORS.white;
      c.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        c.save();
        c.translate(0.5, 0.5);
        c.rotate((k * Math.PI) / 3);
        c.lineWidth = 0.06;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, -0.4);
        c.stroke();
        c.lineWidth = 0.045;
        c.beginPath();
        c.moveTo(0, -0.24);
        c.lineTo(-0.1, -0.33);
        c.moveTo(0, -0.24);
        c.lineTo(0.1, -0.33);
        c.stroke();
        c.restore();
      }
      circle(c, 0.5, 0.5, 0.07);
      fill(c, 'sky');
    },
  },
  {
    id: 'spruce',
    name: { ru: 'Шырша', en: 'Tian Shan spruce' },
    draw(c) {
      c.fillStyle = COLORS.sky;
      c.fillRect(0, 0, 1, 1);
      c.fillStyle = COLORS.brown;
      c.fillRect(0.45, 0.78, 0.1, 0.14);
      for (let k = 0; k < 4; k++) {
        const y = 0.12 + k * 0.17;
        const w = 0.14 + k * 0.08;
        P(c, [0.5, y], [0.5 + w, y + 0.26], [0.5 - w, y + 0.26]);
        fill(c, 'green');
        P(c, [0.5 - w * 0.5, y + 0.2], [0.5 - w * 0.2, y + 0.26], [0.5 - w * 0.8, y + 0.26]);
        fill(c, 'white');
      }
      c.fillStyle = COLORS.white;
      c.fillRect(0, 0.9, 1, 0.1);
    },
  },
  {
    id: 'fish',
    name: { ru: 'Балық', en: 'Fish' },
    draw(c) {
      c.fillStyle = COLORS.teal;
      c.fillRect(0, 0, 1, 1);
      c.beginPath();
      c.ellipse(0.44, 0.5, 0.3, 0.18, 0, 0, Math.PI * 2);
      fill(c, 'orange');
      P(c, [0.7, 0.5], [0.92, 0.32], [0.92, 0.68]);
      fill(c, 'orange');
      P(c, [0.36, 0.34], [0.5, 0.2], [0.56, 0.34]);
      fill(c, 'gold');
      circle(c, 0.26, 0.46, 0.04);
      fill(c, 'white');
      circle(c, 0.25, 0.46, 0.02);
      fill(c, 'dark');
      c.strokeStyle = COLORS.gold;
      c.lineWidth = 0.025;
      for (const x of [0.4, 0.5, 0.6]) {
        c.beginPath();
        c.arc(x, 0.5, 0.08, -1, 1);
        c.stroke();
      }
      for (const [x, y] of [[0.16, 0.2], [0.24, 0.12], [0.8, 0.82]]) {
        circle(c, x, y, 0.03);
        fill(c, 'white');
      }
    },
  },
  {
    id: 'koktobe',
    name: { ru: 'Көктөбе', en: 'Kok-Tobe tower' },
    draw(c) {
      c.fillStyle = COLORS.dark;
      c.fillRect(0, 0, 1, 1);
      P(c, [0, 1], [0, 0.78], [0.3, 0.62], [0.6, 0.74], [1, 0.66], [1, 1]);
      fill(c, 'green');
      c.fillStyle = COLORS.white;
      c.fillRect(0.47, 0.1, 0.06, 0.6);
      P(c, [0.4, 0.7], [0.5, 0.36], [0.6, 0.7]);
      fill(c, 'white');
      c.fillStyle = COLORS.red;
      for (let k = 0; k < 4; k++) c.fillRect(0.46, 0.14 + k * 0.12, 0.08, 0.04);
      circle(c, 0.5, 0.08, 0.03);
      fill(c, 'red');
      for (const [x, y] of [[0.15, 0.2], [0.8, 0.15], [0.86, 0.4], [0.2, 0.45], [0.66, 0.3]]) {
        circle(c, x, y, 0.02);
        fill(c, 'gold');
      }
    },
  },
  {
    id: 'khanshatyr',
    name: { ru: 'Хан Шатыр', en: 'Khan Shatyr' },
    draw(c) {
      c.fillStyle = COLORS.sky;
      c.fillRect(0, 0, 1, 1);
      c.beginPath();
      c.moveTo(0.08, 0.86);
      c.quadraticCurveTo(0.3, 0.6, 0.54, 0.08);
      c.quadraticCurveTo(0.7, 0.6, 0.92, 0.86);
      fill(c, 'gold');
      c.strokeStyle = COLORS.orange;
      c.lineWidth = 0.025;
      for (let k = 1; k < 5; k++) {
        c.beginPath();
        c.moveTo(0.54, 0.08);
        c.quadraticCurveTo(0.3 + k * 0.08, 0.6, 0.08 + k * 0.17, 0.86);
        c.stroke();
      }
      c.fillStyle = COLORS.grey;
      c.fillRect(0, 0.86, 1, 0.14);
    },
  },
  {
    id: 'car',
    name: { ru: 'Көлік', en: 'Sedan' },
    draw(c) {
      c.beginPath();
      c.moveTo(0.06, 0.66);
      c.lineTo(0.08, 0.5);
      c.lineTo(0.3, 0.46);
      c.lineTo(0.4, 0.3);
      c.lineTo(0.68, 0.3);
      c.lineTo(0.8, 0.46);
      c.lineTo(0.94, 0.5);
      c.lineTo(0.94, 0.66);
      fill(c, 'white');
      P(c, [0.42, 0.34], [0.53, 0.34], [0.53, 0.46], [0.34, 0.46]);
      fill(c, 'sky');
      P(c, [0.56, 0.34], [0.66, 0.34], [0.75, 0.46], [0.56, 0.46]);
      fill(c, 'sky');
      c.fillStyle = COLORS.red;
      c.fillRect(0.88, 0.52, 0.06, 0.05);
      c.fillStyle = COLORS.gold;
      c.fillRect(0.06, 0.52, 0.05, 0.05);
      for (const x of [0.26, 0.74]) {
        circle(c, x, 0.68, 0.1);
        fill(c, 'dark');
        circle(c, x, 0.68, 0.045);
        fill(c, 'grey');
      }
      c.fillStyle = COLORS.grey;
      c.fillRect(0, 0.78, 1, 0.06);
    },
  },
  {
    id: 'house',
    name: { ru: 'Үй', en: 'House' },
    draw(c) {
      c.fillStyle = COLORS.dark;
      c.fillRect(0, 0, 1, 1);
      circle(c, 0.82, 0.18, 0.08);
      fill(c, 'cream');
      P(c, [0.1, 0.48], [0.5, 0.14], [0.9, 0.48]);
      fill(c, 'red');
      c.fillStyle = COLORS.cream;
      c.fillRect(0.16, 0.48, 0.68, 0.42);
      c.fillStyle = COLORS.gold;
      c.fillRect(0.24, 0.56, 0.16, 0.14);
      c.fillRect(0.6, 0.56, 0.16, 0.14);
      c.fillStyle = COLORS.brown;
      c.fillRect(0.44, 0.64, 0.14, 0.26);
      c.fillStyle = COLORS.green;
      c.fillRect(0, 0.9, 1, 0.1);
    },
  },
  {
    id: 'cat',
    name: { ru: 'Мысық', en: 'Cat' },
    draw(c) {
      P(c, [0.16, 0.12], [0.36, 0.3], [0.16, 0.4]);
      fill(c, 'orange');
      P(c, [0.84, 0.12], [0.64, 0.3], [0.84, 0.4]);
      fill(c, 'orange');
      c.beginPath();
      c.ellipse(0.5, 0.5, 0.36, 0.3, 0, 0, Math.PI * 2);
      fill(c, 'orange');
      c.beginPath();
      c.ellipse(0.5, 0.62, 0.18, 0.13, 0, 0, Math.PI * 2);
      fill(c, 'white');
      for (const x of [0.36, 0.64]) {
        c.beginPath();
        c.ellipse(x, 0.44, 0.06, 0.07, 0, 0, Math.PI * 2);
        fill(c, 'leaf');
        c.beginPath();
        c.ellipse(x, 0.44, 0.02, 0.06, 0, 0, Math.PI * 2);
        fill(c, 'dark');
      }
      P(c, [0.46, 0.55], [0.54, 0.55], [0.5, 0.6]);
      fill(c, 'pink');
    },
  },
  {
    id: 'owl',
    name: { ru: 'Үкі', en: 'Owl' },
    draw(c) {
      c.fillStyle = COLORS.brown;
      c.fillRect(0, 0.84, 1, 0.08);
      c.beginPath();
      c.ellipse(0.5, 0.52, 0.3, 0.36, 0, 0, Math.PI * 2);
      fill(c, 'brown');
      c.beginPath();
      c.ellipse(0.5, 0.62, 0.18, 0.22, 0, 0, Math.PI * 2);
      fill(c, 'cream');
      P(c, [0.22, 0.16], [0.32, 0.3], [0.2, 0.3]);
      fill(c, 'brown');
      P(c, [0.78, 0.16], [0.68, 0.3], [0.8, 0.3]);
      fill(c, 'brown');
      for (const x of [0.38, 0.62]) {
        circle(c, x, 0.36, 0.1);
        fill(c, 'white');
        circle(c, x, 0.36, 0.05);
        fill(c, 'gold');
        circle(c, x, 0.36, 0.025);
        fill(c, 'dark');
      }
      P(c, [0.46, 0.44], [0.54, 0.44], [0.5, 0.52]);
      fill(c, 'orange');
    },
  },
  {
    id: 'mushroom',
    name: { ru: 'Саңырауқұлақ', en: 'Mushroom' },
    draw(c) {
      c.fillStyle = COLORS.green;
      c.fillRect(0, 0.84, 1, 0.16);
      c.beginPath();
      c.moveTo(0.38, 0.86);
      c.lineTo(0.42, 0.48);
      c.lineTo(0.58, 0.48);
      c.lineTo(0.62, 0.86);
      fill(c, 'cream');
      c.beginPath();
      c.arc(0.5, 0.52, 0.36, Math.PI, 0);
      fill(c, 'red');
      for (const [x, y, r] of [[0.36, 0.36, 0.06], [0.58, 0.28, 0.07], [0.7, 0.44, 0.05], [0.26, 0.48, 0.04]]) {
        circle(c, x, y, r);
        fill(c, 'white');
      }
    },
  },
  {
    id: 'balloon',
    name: { ru: 'Әуе шары', en: 'Hot-air balloon' },
    draw(c) {
      c.fillStyle = COLORS.sky;
      c.fillRect(0, 0, 1, 1);
      c.beginPath();
      c.ellipse(0.18, 0.78, 0.16, 0.06, 0, 0, Math.PI * 2);
      fill(c, 'white');
      c.beginPath();
      c.moveTo(0.5, 0.66);
      c.bezierCurveTo(0.16, 0.5, 0.18, 0.08, 0.5, 0.08);
      c.bezierCurveTo(0.82, 0.08, 0.84, 0.5, 0.5, 0.66);
      fill(c, 'red');
      c.save();
      c.clip();
      c.fillStyle = COLORS.gold;
      c.fillRect(0.4, 0, 0.2, 1);
      c.fillStyle = COLORS.white;
      c.fillRect(0, 0.3, 1, 0.06);
      c.restore();
      c.strokeStyle = COLORS.brown;
      c.lineWidth = 0.02;
      c.beginPath();
      c.moveTo(0.42, 0.62);
      c.lineTo(0.44, 0.76);
      c.moveTo(0.58, 0.62);
      c.lineTo(0.56, 0.76);
      c.stroke();
      c.fillStyle = COLORS.brown;
      c.fillRect(0.42, 0.76, 0.16, 0.1);
    },
  },
  {
    id: 'kite',
    name: { ru: 'Батпырауық', en: 'Kite' },
    draw(c) {
      c.fillStyle = COLORS.sky;
      c.fillRect(0, 0, 1, 1);
      P(c, [0.56, 0.06], [0.84, 0.32], [0.56, 0.66], [0.28, 0.32]);
      fill(c, 'purple');
      P(c, [0.56, 0.06], [0.84, 0.32], [0.56, 0.32]);
      fill(c, 'pink');
      P(c, [0.56, 0.32], [0.28, 0.32], [0.56, 0.66]);
      fill(c, 'gold');
      c.strokeStyle = COLORS.dark;
      c.lineWidth = 0.02;
      c.beginPath();
      c.moveTo(0.56, 0.66);
      c.bezierCurveTo(0.5, 0.78, 0.36, 0.72, 0.3, 0.9);
      c.stroke();
      for (const [x, y] of [[0.52, 0.76], [0.4, 0.78], [0.32, 0.88]]) {
        P(c, [x - 0.04, y - 0.03], [x + 0.04, y - 0.03], [x, y + 0.04]);
        fill(c, 'red');
      }
    },
  },
  {
    id: 'cherries',
    name: { ru: 'Шие', en: 'Cherries' },
    draw(c) {
      c.strokeStyle = COLORS.green;
      c.lineWidth = 0.035;
      c.beginPath();
      c.moveTo(0.3, 0.66);
      c.quadraticCurveTo(0.4, 0.3, 0.6, 0.12);
      c.moveTo(0.7, 0.62);
      c.quadraticCurveTo(0.66, 0.3, 0.6, 0.12);
      c.stroke();
      c.beginPath();
      c.ellipse(0.72, 0.16, 0.14, 0.06, 0.4, 0, Math.PI * 2);
      fill(c, 'leaf');
      for (const [x, y] of [[0.3, 0.72], [0.7, 0.68]]) {
        circle(c, x, y, 0.17);
        fill(c, 'wine');
        circle(c, x, y, 0.13);
        fill(c, 'red');
        circle(c, x - 0.06, y - 0.06, 0.04);
        fill(c, 'white');
      }
    },
  },
  {
    id: 'ladybird',
    name: { ru: 'Қызыл қоңыз', en: 'Ladybird' },
    draw(c) {
      c.fillStyle = COLORS.leaf;
      c.fillRect(0, 0, 1, 1);
      circle(c, 0.5, 0.26, 0.14);
      fill(c, 'dark');
      c.beginPath();
      c.ellipse(0.5, 0.56, 0.32, 0.34, 0, 0, Math.PI * 2);
      fill(c, 'red');
      c.fillStyle = COLORS.dark;
      c.fillRect(0.485, 0.24, 0.03, 0.66);
      for (const [x, y, r] of [[0.34, 0.46, 0.06], [0.66, 0.46, 0.06], [0.36, 0.68, 0.05], [0.64, 0.68, 0.05], [0.5, 0.82, 0.04]]) {
        circle(c, x, y, r);
        fill(c, 'dark');
      }
      for (const x of [0.44, 0.56]) {
        circle(c, x, 0.22, 0.025);
        fill(c, 'white');
      }
    },
  },
  {
    id: 'saiga',
    name: { ru: 'Ақбөкен', en: 'Saiga' },
    draw(c) {
      c.fillStyle = COLORS.gold;
      c.fillRect(0, 0.8, 1, 0.2);
      c.beginPath();
      c.ellipse(0.46, 0.56, 0.26, 0.14, 0, 0, Math.PI * 2);
      fill(c, 'cream');
      c.fillStyle = COLORS.cream;
      for (const x of [0.28, 0.38, 0.54, 0.64]) c.fillRect(x, 0.62, 0.05, 0.2);
      c.beginPath();
      c.ellipse(0.74, 0.4, 0.1, 0.12, 0.3, 0, Math.PI * 2);
      fill(c, 'cream');
      c.beginPath();
      c.ellipse(0.8, 0.48, 0.07, 0.06, 0, 0, Math.PI * 2);
      fill(c, 'brown');
      c.strokeStyle = COLORS.white;
      c.lineWidth = 0.035;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0.72, 0.3);
      c.lineTo(0.7, 0.1);
      c.moveTo(0.77, 0.3);
      c.lineTo(0.8, 0.1);
      c.stroke();
      circle(c, 0.75, 0.38, 0.02);
      fill(c, 'dark');
    },
  },
];

// mirror-symmetric ornament: one quarter drawn and mirrored four ways
export function ornament(seed) {
  const r = rng(seed);
  const sets = [
    ['red', 'gold', 'dark'],
    ['teal', 'gold', 'wine'],
    ['blue', 'white', 'red'],
    ['purple', 'gold', 'teal'],
    ['wine', 'cream', 'blue'],
    ['green', 'gold', 'red'],
    ['orange', 'dark', 'sky'],
  ];
  const cols = sets[Math.floor(r() * sets.length)];
  const extra = r() < 0.5 ? ['pink', 'white', 'leaf', 'sky'][Math.floor(r() * 4)] : null;
  // fixed here, so every drawing of this ornament (level, thumbnail) is the same
  const quarterSeed = Math.floor(r() * 1e9);
  return {
    id: 'oyu-' + seed,
    name: { ru: 'Ою № ' + (seed % 1000), en: 'Oyu No. ' + (seed % 1000) },
    ornament: true,
    draw(c) {
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        c.save();
        c.translate(0.5, 0.5);
        c.scale(sx, sy);
        c.translate(-0.5, -0.5);
        c.beginPath();
        c.rect(0, 0, 0.5, 0.5);
        c.clip();
        drawQuarter(c, rng(quarterSeed), cols, extra);
        c.restore();
      }
    },
  };
}

function drawQuarter(c, r, cols, extra) {
  c.fillStyle = COLORS[cols[0]];
  c.fillRect(0, 0, 0.5, 0.5);
  const big = 0.26 + r() * 0.08;
  P(c, [0.5, 0.5 - big], [0.5 + big, 0.5], [0.5, 0.5 + big], [0.5 - big, 0.5]);
  c.fillStyle = COLORS[cols[1]];
  c.fill();
  horn(c, 0.21, 0.21, 0.095 + r() * 0.04, 1, cols[2], 0.06);
  if (r() < 0.6) horn(c, 0.4, 0.1, 0.055, -1, extra || cols[1], 0.045);
  if (r() < 0.7) {
    P(c, [0, 0], [0.13, 0], [0, 0.13]);
    c.fillStyle = COLORS[cols[2]];
    c.fill();
  }
  circle(c, 0.5, 0.5, 0.08 + r() * 0.05);
  c.fillStyle = COLORS[extra || cols[2]];
  c.fill();
}

// draw a picture into a grid: one palette color index per cell, -1 where it is empty
const clampPx = (v, S) => (v < 0 ? 0 : v >= S ? S - 1 : v);

export function sample(picture, N) {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.scale(S, S);
  picture.draw(c);
  const data = c.getImageData(0, 0, S, S).data;
  const palette = [];
  const index = new Map();
  const names = Object.keys(COLORS);
  const rgb = names.map((n) => {
    const v = parseInt(COLORS[n].slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  });
  // the picture fills the board: crop to what is drawn, keep its proportions,
  // the longer side gets N cells (no wide empty margins around a small drawing)
  let minX = S;
  let minY = S;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      if (data[(y * S + x) * 4 + 3] >= 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  if (maxX < 0) {
    minX = minY = 0;
    maxX = maxY = S - 1;
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const W = bw >= bh ? N : Math.max(4, Math.round((N * bw) / bh));
  const H = bh >= bw ? N : Math.max(4, Math.round((N * bh) / bw));
  const cs = Math.max(bw / W, bh / H);
  const ox = minX + (bw - W * cs) / 2;
  const oy = minY + (bh - H * cs) / 2;
  const grid = new Int8Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = clampPx(Math.floor(ox + (x + 0.5) * cs), S);
      const py = clampPx(Math.floor(oy + (y + 0.5) * cs), S);
      const o = (py * S + px) * 4;
      if (data[o + 3] < 128) continue;
      let best = 0;
      let bd = Infinity;
      for (let k = 0; k < rgb.length; k++) {
        const d = (rgb[k][0] - data[o]) ** 2 + (rgb[k][1] - data[o + 1]) ** 2 + (rgb[k][2] - data[o + 2]) ** 2;
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      const name = names[best];
      if (!index.has(name)) {
        index.set(name, palette.length);
        palette.push(name);
      }
      grid[y * W + x] = index.get(name);
    }
  }
  // thin tips that vanish at this size leave empty rows or columns: drop them
  let x0 = 0;
  let x1 = W - 1;
  let y0 = 0;
  let y1 = H - 1;
  const rowEmpty = (y) => { for (let x = x0; x <= x1; x++) if (grid[y * W + x] >= 0) return false; return true; };
  const colEmpty = (x) => { for (let y = y0; y <= y1; y++) if (grid[y * W + x] >= 0) return false; return true; };
  while (y0 < y1 && rowEmpty(y0)) y0++;
  while (y1 > y0 && rowEmpty(y1)) y1--;
  while (x0 < x1 && colEmpty(x0)) x0++;
  while (x1 > x0 && colEmpty(x1)) x1--;
  const W2 = x1 - x0 + 1;
  const H2 = y1 - y0 + 1;
  const out = new Int8Array(W2 * H2);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) out[y * W2 + x] = grid[(y + y0) * W + x + x0];
  return { grid: out, palette: palette.map((n) => COLORS[n]), W: W2, H: H2 };
}
