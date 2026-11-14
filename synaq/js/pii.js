// Защита персональных данных до отправки текста в модель.
// Маскируем ИИН (12 цифр с верной контрольной суммой), телефоны РК и e-mail.
// Тот же ИИН-фильтр стоит на сервере: если маска не сработала, сервер откажет.

const W1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const W2 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2];

function control(d) {
  let c = W1.reduce((a, w, i) => a + w * d[i], 0) % 11;
  if (c === 10) {
    c = W2.reduce((a, w, i) => a + w * d[i], 0) % 11;
    if (c === 10) return -1;
  }
  return c;
}

export function isIin(s) {
  if (!/^\d{12}$/.test(s)) return false;
  const d = s.split('').map(Number);
  const mm = d[2] * 10 + d[3];
  const dd = d[4] * 10 + d[5];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  return control(d) === d[11];
}

/** Придуманный ИИН с верной контрольной суммой — для кнопки «проверить защиту». */
export function demoIin() {
  for (let n = 1; n < 1000; n++) {
    const base = `0905155${String(n).padStart(4, '0')}`;
    const c = control(base.split('').map(Number));
    if (c >= 0) return base + c;
  }
  return '090515500013';
}

const PHONE = /(?:\+7|(?<!\d)8)[\s(-]*7\d{2}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}(?!\d)/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

export function maskPii(text) {
  const found = { iin: 0, phone: 0, email: 0 };
  let out = text.replace(/(?<!\d)\d{12}(?!\d)/g, (m) => {
    if (!isIin(m)) return m;
    found.iin++;
    return '[ИИН скрыт]';
  });
  out = out.replace(PHONE, () => {
    found.phone++;
    return '[телефон скрыт]';
  });
  out = out.replace(EMAIL, () => {
    found.email++;
    return '[e-mail скрыт]';
  });
  return { text: out, found, total: found.iin + found.phone + found.email };
}
