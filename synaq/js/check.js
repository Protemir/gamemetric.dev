// Автоматическая проверка сгенерированных вопросов (п. 4 ТЗ):
// цитата и ответ есть в материале, правильных вариантов столько, сколько нужно,
// нет дублей, язык совпадает, ответ не подсказан формулировкой.
// Ничего не удаляем — только помечаем, решение за учителем.

const STOP = new Set(
  ('и в во не на с со по к ко у о об от до из за для при как что это его ее её их он она они а но или же ли бы то так все всё был была было были есть быть который которая которые ' +
    'және мен бен пен да де та те ол бұл осы сол оның олар үшін деп еді болды болып арқылы бірге кейін дейін туралы ретінде')
    .split(' '),
);
const KK = /[әғқңөұүһі]/i;
// Служебные слова, которых нет в другом языке, — по ним ловим ответ не на том языке
const RU_ONLY = new Set('и в на по с что это для как из к их его которые которых соотнесите выберите укажите верно неверно'.split(' '));
const KK_ONLY = new Set('және мен бен пен деп үшін бұл осы оның олар қандай нешінші сәйкестендіріңіз таңдаңыз'.split(' '));

export function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"“”„'’`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function stems(s) {
  return norm(s)
    .split(' ')
    .filter((w) => w && (w.length >= 3 || /\d/.test(w)) && !STOP.has(w))
    .map((w) => (/\d/.test(w) ? w : w.slice(0, 5)));
}

function bigrams(words) {
  const out = [];
  for (let i = 0; i + 1 < words.length; i++) out.push(words[i] + ' ' + words[i + 1]);
  return out;
}

/** Индекс материала: множества основ и биграмм, предложения для ссылок на фрагмент. */
export function indexMaterial(text) {
  const words = norm(text).split(' ').filter(Boolean);
  const sentences = [];
  const re = /[^.!?\n]+[.!?]*/g;
  let m;
  while ((m = re.exec(text))) {
    const s = m[0].trim();
    if (s.length > 15) sentences.push({ text: s, start: m.index + m[0].indexOf(s), stems: new Set(stems(s)) });
  }
  return {
    text,
    flat: ' ' + words.join(' ') + ' ',
    stemSet: new Set(stems(text)),
    bigramSet: new Set(bigrams(words)),
    sentences,
  };
}

function coverage(s, idx) {
  const st = stems(s);
  if (!st.length) return 1;
  return st.filter((w) => idx.stemSet.has(w)).length / st.length;
}

/** Ищем цитату в материале: сначала дословно, потом по биграммам. Возвращает долю совпадения и позицию. */
export function locateQuote(quote, idx) {
  const segs = String(quote || '')
    .split(/…|\.\.\./)
    .map((s) => s.trim())
    .filter((s) => norm(s).split(' ').length >= 3);
  if (!segs.length) return { score: 0, start: -1 };
  let total = 0;
  for (const seg of segs) {
    const n = norm(seg);
    if (idx.flat.includes(' ' + n + ' ')) {
      total += 1;
      continue;
    }
    const bg = bigrams(n.split(' '));
    total += bg.length ? bg.filter((b) => idx.bigramSet.has(b)).length / bg.length : 0;
  }
  const score = total / segs.length;
  // Самое похожее предложение — для подсветки «откуда взят вопрос»
  const qs = new Set(stems(segs[0]));
  let best = null;
  let bestOv = 0;
  for (const s of idx.sentences) {
    let ov = 0;
    for (const w of qs) if (s.stems.has(w)) ov++;
    if (ov > bestOv) {
      bestOv = ov;
      best = s;
    }
  }
  return { score, start: best ? best.start : -1, sentence: best ? best.text : '' };
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

function correctText(q) {
  if (q.type === 'single' || q.type === 'multiple') return q.options.filter((o) => o.correct).map((o) => o.text).join(' ');
  if (q.type === 'matching') return q.pairs.map((p) => p.left + ' ' + p.right).join(' ');
  if (q.type === 'true_false') return '';
  return String(q.answer || '');
}

const BAD_OPTION = /^(все|всё|ни один|нет верного|барлығы|бәрі|ешқайсысы|дұрыс жауап жоқ)\b/i;

/** Проверяет один вопрос. issues: [{level:'error'|'warn', text}] */
export function checkQuestion(q, idx, lang, others = []) {
  const issues = [];
  const err = (text) => issues.push({ level: 'error', text });
  const warn = (text) => issues.push({ level: 'warn', text });

  if (!String(q.question || '').trim()) err('Пустая формулировка');

  if (q.type === 'single' || q.type === 'multiple') {
    const opts = q.options || [];
    if (opts.length !== 4) err(`Вариантов ${opts.length}, нужно 4`);
    const nCorrect = opts.filter((o) => o.correct).length;
    if (q.type === 'single' && nCorrect !== 1) err(nCorrect === 0 ? 'Не отмечен правильный ответ' : `Правильных вариантов ${nCorrect}, должен быть один`);
    if (q.type === 'multiple' && (nCorrect < 2 || nCorrect > 3)) err(`Правильных вариантов ${nCorrect}, нужно 2–3`);
    const seen = new Set();
    for (const o of opts) {
      const k = norm(o.text);
      if (!k) err('Пустой вариант ответа');
      else if (seen.has(k)) err('Варианты ответа повторяются');
      seen.add(k);
      if (BAD_OPTION.test(o.text.trim())) warn('Вариант вида «все перечисленные» — лучше заменить');
    }
    const right = opts.filter((o) => o.correct);
    const wrong = opts.filter((o) => !o.correct);
    if (right.length === 1 && wrong.length) {
      const avg = wrong.reduce((a, o) => a + o.text.length, 0) / wrong.length;
      if (right[0].text.length > 20 && right[0].text.length > avg * 1.8) warn('Правильный ответ заметно длиннее остальных — подсказка');
    }
    for (const o of right) {
      const n = norm(o.text);
      if (n.length >= 5 && norm(q.question).includes(n)) warn('Ответ повторяется в формулировке вопроса');
    }
  } else if (q.type === 'open') {
    if (!String(q.answer || '').trim()) err('Нет эталонного ответа');
  } else if (q.type === 'true_false') {
    if (q.answer !== true && q.answer !== false) err('Не выбрано: правда или ложь');
  } else if (q.type === 'fill_gap') {
    const gaps = String(q.question).split('___').length - 1;
    if (gaps !== 1) err(gaps ? 'Пропусков больше одного' : 'Нет пропуска ___');
    if (!String(q.answer || '').trim()) err('Нет ответа для пропуска');
  } else if (q.type === 'matching') {
    const pairs = q.pairs || [];
    if (pairs.length < 2 || pairs.length > 6) err(`Пар ${pairs.length}, нужно 2–6`);
    const L = new Set();
    const R = new Set();
    for (const p of pairs) {
      if (!norm(p.left) || !norm(p.right)) err('Пустая часть пары');
      if (L.has(norm(p.left)) || R.has(norm(p.right))) err('Пары повторяются');
      L.add(norm(p.left));
      R.add(norm(p.right));
    }
  }

  // Опора на материал
  const loc = locateQuote(q.source, idx);
  q.sourceStart = loc.start;
  q.sourceSentence = loc.sentence;
  if (!String(q.source || '').trim()) warn('Нет ссылки на фрагмент материала');
  else if (loc.score < 0.6) warn('Цитата не найдена в материале дословно — проверьте факт');

  const ans = correctText(q);
  if (ans) {
    const cov = coverage(ans, idx);
    const nums = [...new Set(ans.match(/\d+/g) || [])].filter((n) => !idx.flat.includes(' ' + n + ' '));
    if (nums.length) warn(`Числа ${nums.join(', ')} нет в материале`);
    else if (cov < 0.5) warn('Ответ не подтверждается материалом');
  }
  if (q.type === 'true_false' && q.answer === true && coverage(q.question, idx) < 0.6) warn('Верное утверждение плохо совпадает с материалом');

  // Язык
  const all = [q.question, ...(q.options || []).map((o) => o.text), q.answer === true || q.answer === false ? '' : q.answer, q.explanation].join(' ');
  const letters = (all.match(/\p{L}/gu) || []).length;
  const words = (s) => norm(s).split(' ');
  const ruHits = (s) => words(s).filter((w) => RU_ONLY.has(w)).length;
  const kkHits = (s) => words(s).filter((w) => KK_ONLY.has(w)).length + (String(s).match(/[әғқңөұүһ]/gi) || []).length;
  if (lang === 'kk' && ((letters > 60 && !KK.test(all)) || ruHits(q.question) >= 2)) warn('Похоже, формулировка не на казахском');
  if (lang === 'ru' && kkHits(q.question + ' ' + (q.options || []).map((o) => o.text).join(' ')) > 3) warn('В русском задании казахские слова — проверьте язык');

  // Дубли
  const mine = stems(q.question + ' ' + ans);
  const mineQ = stems(q.question);
  for (const o of others) {
    if (o === q) break;
    if (jaccard(mine, stems(o.question + ' ' + correctText(o))) >= 0.55 || jaccard(mineQ, stems(o.question)) >= 0.75) {
      warn(`Похож на вопрос № ${o.n}`);
      break;
    }
  }

  const status = issues.some((i) => i.level === 'error') ? 'error' : issues.length ? 'warn' : 'ok';
  return { status, issues };
}

export function checkAll(questions, idx, lang) {
  questions.forEach((q, i) => {
    q.n = i + 1;
  });
  for (const q of questions) q.check = checkQuestion(q, idx, lang, questions);
}
