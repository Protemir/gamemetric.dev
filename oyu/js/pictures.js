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
  const grid = new Int8Array(N * N).fill(-1);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const px = Math.floor(((x + 0.5) / N) * S);
      const py = Math.floor(((y + 0.5) / N) * S);
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
      grid[y * N + x] = index.get(name);
    }
  }
  return { grid, palette: palette.map((n) => COLORS[n]), W: N, H: N };
}
