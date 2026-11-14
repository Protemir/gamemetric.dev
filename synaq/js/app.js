import { readFile, ReadError } from './extract.js';
import { maskPii, demoIin } from './pii.js';
import { ENGINES, generateBatch, health, makePlan, normalize, EngineError } from './engine.js';
import { indexMaterial, checkAll } from './check.js';
import { buildJson, download, sendToTaqta, taqtaCandidates } from './export.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const TYPES = {
  single: { ru: 'Один верный', short: 'Один ответ', cls: 't-single' },
  multiple: { ru: 'Несколько верных', short: 'Несколько', cls: 't-multi' },
  open: { ru: 'Открытый', short: 'Открытый', cls: 't-open' },
  true_false: { ru: 'Правда или ложь', short: 'Правда/ложь', cls: 't-tf' },
  fill_gap: { ru: 'Заполни пропуск', short: 'Пропуск', cls: 't-gap' },
  matching: { ru: 'Соответствие', short: 'Соответствие', cls: 't-match' },
};
const LEVELS = { 1: 'Лёгкий', 2: 'Средний', 3: 'Сложный' };
const SAMPLES = [
  { file: 'ru-history.txt', label: 'История Казахстана · RU', subject: 'История Казахстана', grade: '7', lang: 'ru', name: 'Образование Казахского ханства' },
  { file: 'kk-history.txt', label: 'Қазақстан тарихы · KK', subject: 'Қазақстан тарихы', grade: '7', lang: 'kk', name: 'Қазақ хандығының құрылуы' },
  { file: 'ru-biology.txt', label: 'Биология · RU', subject: 'Биология', grade: '7', lang: 'ru', name: 'Фотосинтез' },
  { file: 'kk-biology.txt', label: 'Биология · KK', subject: 'Биология', grade: '7', lang: 'kk', name: 'Фотосинтез' },
];

const KEY = 'synaq.state.v1';
const state = {
  text: '',
  fileName: '',
  pages: 0,
  title: '',
  subject: '',
  grade: '7',
  lang: 'ru',
  count: 10,
  types: ['single', 'multiple', 'open'],
  levels: [1, 2, 3],
  model: 'gpt-oss-120b',
  questions: [],
  usage: { inTok: 0, outTok: 0, kzt: 0, usd: 0 },
  genMs: 0,
  reviewMs: 0,
  filter: 'all',
  pii: { total: 0, found: {} },
};
let idx = null;
let editing = null;
let busy = false;

function save() {
  try {
    const { filter, ...rest } = state;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* хранилище недоступно — работаем без сохранения */
  }
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') Object.assign(state, s);
  } catch {
    /* ignore */
  }
}

// ---------- Материал ----------

function detectLang(text) {
  const kk = (text.match(/[әғқңөұүһі]/gi) || []).length;
  const letters = (text.match(/\p{L}/gu) || []).length || 1;
  return kk / letters > 0.01 ? 'kk' : 'ru';
}

function setMaterial(text, meta) {
  const masked = maskPii(text);
  state.text = masked.text;
  state.pii = { total: masked.total, found: masked.found };
  state.fileName = meta.name || 'Текст';
  state.pages = meta.pages || Math.max(1, Math.ceil(text.length / 2500));
  state.title = meta.title || guessTitle(masked.text) || state.fileName;
  if (meta.subject !== undefined) state.subject = meta.subject;
  if (meta.grade) state.grade = meta.grade;
  state.lang = meta.lang || detectLang(text);
  idx = indexMaterial(state.text);
  $('#fileError').hidden = true;
  syncForm();
  renderDoc();
  save();
}

function guessTitle(text) {
  const first = text.split('\n').map((s) => s.trim()).find(Boolean) || '';
  return first.length <= 90 ? first.replace(/^§\s*\d+\.?\s*/, '') : '';
}

function renderDoc() {
  const card = $('#docCard');
  if (!state.text) {
    card.hidden = true;
    renderPii();
    return;
  }
  card.hidden = false;
  card.innerHTML = `<div><b>${esc(state.title)}</b><span>${esc(state.fileName)} · ${state.pages} стр. · ${state.text.length.toLocaleString('ru')} симв.</span></div>
    <button class="btn small ghost" type="button" id="viewDoc">Текст</button>`;
  $('#viewDoc').onclick = () => showSource(-1);
  renderPii();
  renderCountHint();
}

function renderPii() {
  const box = $('#piiBox');
  if (!state.text) {
    box.innerHTML = '';
    return;
  }
  const f = state.pii.found || {};
  const parts = [];
  if (f.iin) parts.push(`ИИН: ${f.iin}`);
  if (f.phone) parts.push(`телефонов: ${f.phone}`);
  if (f.email) parts.push(`e-mail: ${f.email}`);
  box.innerHTML = state.pii.total
    ? `<div class="pii-on">🔒 Скрыто до отправки в модель — ${parts.join(', ')}. В модель уходит текст с пометками «[ИИН скрыт]».</div>`
    : `<div class="pii-off">🔒 Персональных данных в тексте не найдено (ищем ИИН, телефоны, e-mail). <button type="button" class="linkbtn" id="piiTest">Проверить защиту</button></div>`;
  const t = $('#piiTest');
  if (t)
    t.onclick = () => {
      const fake = `\n\nОтветственный: ученик 7 «А» класса, ИИН ${demoIin()}, тел. +7 701 555 12 34, почта uchenik@example.kz.`;
      setMaterial(state.text + fake, { name: state.fileName, pages: state.pages, title: state.title, lang: state.lang, subject: state.subject, grade: state.grade });
    };
}

async function onFile(file) {
  if (!file) return;
  const err = $('#fileError');
  err.hidden = true;
  $('#drop').classList.add('loading');
  try {
    const res = await readFile(file);
    setMaterial(res.text, { name: res.name, pages: res.pages });
  } catch (e) {
    err.textContent = e instanceof ReadError ? e.message : 'Не удалось прочитать файл: ' + (e.message || e);
    err.hidden = false;
  } finally {
    $('#drop').classList.remove('loading');
  }
}

async function loadSample(s) {
  const r = await fetch('samples/' + s.file);
  const text = await r.text();
  setMaterial(text.trim(), { name: s.file, title: s.name, subject: s.subject, grade: s.grade, lang: s.lang });
}

// ---------- Настройки ----------

function syncForm() {
  $('#subject').value = state.subject;
  $('#grade').value = state.grade;
  for (const b of $('#langSeg').children) b.setAttribute('aria-checked', String(b.dataset.v === state.lang));
  $('#count').value = state.count;
  $('#countOut').textContent = state.count;
  for (const el of document.querySelectorAll('input[name=type]')) el.checked = state.types.includes(el.value);
  for (const el of document.querySelectorAll('input[name=level]')) el.checked = state.levels.includes(Number(el.value));
  $('#model').value = state.model;
  renderCountHint();
}

function renderCountHint() {
  const h = $('#countHint');
  if (!state.text) {
    h.textContent = '';
    return;
  }
  const rec = Math.max(5, Math.floor(state.text.length / 220));
  h.textContent = state.count > rec ? `Материала хватит примерно на ${rec} разных вопросов — дальше начнутся повторы.` : '';
}

function buildForm() {
  $('#samples').innerHTML = SAMPLES.map((s, i) => `<button type="button" class="chip" data-i="${i}">${esc(s.label)}</button>`).join('');
  $('#samples').onclick = (e) => {
    const b = e.target.closest('[data-i]');
    if (b) loadSample(SAMPLES[b.dataset.i]);
  };
  $('#grade').innerHTML = Array.from({ length: 11 }, (_, i) => `<option value="${i + 1}">${i + 1} класс</option>`).join('');
  const box = (name, v, label, cls = '') => `<label class="ck ${cls}"><input type="checkbox" name="${name}" value="${v}"><span>${esc(label)}</span></label>`;
  $('#types').innerHTML = ['single', 'multiple', 'open'].map((t) => box('type', t, TYPES[t].ru)).join('');
  $('#gameTypes').innerHTML = ['true_false', 'fill_gap', 'matching'].map((t) => box('type', t, TYPES[t].ru)).join('');
  $('#levels').innerHTML = [1, 2, 3].map((l) => box('level', l, `${l} · ${LEVELS[l]}`)).join('');
  $('#model').innerHTML = Object.entries(ENGINES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('');

  const drop = $('#drop');
  drop.onclick = () => $('#file').click();
  drop.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      $('#file').click();
    }
  };
  $('#file').onchange = (e) => {
    onFile(e.target.files[0]);
    e.target.value = '';
  };
  drop.ondragover = (e) => {
    e.preventDefault();
    drop.classList.add('over');
  };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    onFile(e.dataTransfer.files[0]);
  };
  $('#pasteBtn').onclick = () => {
    const t = $('#pasteText').value.trim();
    const err = $('#fileError');
    if ((t.match(/\p{L}/gu) || []).length < 200) {
      err.textContent = 'Слишком мало текста: нужно хотя бы 200 букв.';
      err.hidden = false;
      return;
    }
    setMaterial(t, { name: 'Вставленный текст' });
  };
  $('#subject').oninput = (e) => {
    state.subject = e.target.value;
    save();
  };
  $('#grade').onchange = (e) => {
    state.grade = e.target.value;
    save();
  };
  $('#langSeg').onclick = (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    state.lang = b.dataset.v;
    syncForm();
    save();
  };
  $('#count').oninput = (e) => {
    state.count = Number(e.target.value);
    $('#countOut').textContent = state.count;
    renderCountHint();
    save();
  };
  document.addEventListener('change', (e) => {
    if (e.target.name === 'type') {
      state.types = [...document.querySelectorAll('input[name=type]:checked')].map((x) => x.value);
      save();
    }
    if (e.target.name === 'level') {
      state.levels = [...document.querySelectorAll('input[name=level]:checked')].map((x) => Number(x.value));
      save();
    }
  });
  $('#model').onchange = (e) => {
    state.model = e.target.value;
    save();
  };
  $('#genBtn').onclick = generate;
  $('#filterSeg').onclick = (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    state.filter = b.dataset.v;
    renderList();
  };
  $('#approveOk').onclick = () => {
    for (const q of state.questions) if (q.check?.status === 'ok') q.approved = true;
    renderList();
    save();
  };
  $('#jsonBtn').onclick = exportJson;
  $('#taqtaBtn').onclick = exportTaqta;
  $('#srcDlg').addEventListener('click', (e) => {
    if (e.target.matches('[data-close]') || e.target === $('#srcDlg')) $('#srcDlg').close();
  });
}

// ---------- Генерация ----------

function showGenError(msg) {
  const el = $('#genError');
  el.textContent = msg;
  el.hidden = !msg;
}

function progress(html) {
  const p = $('#progress');
  p.hidden = !html;
  p.innerHTML = html || '';
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k], k);
    }
  });
  await Promise.all(workers);
  return out;
}

async function generate() {
  if (busy) return;
  showGenError('');
  if (!state.text) return showGenError('Сначала выберите пример или загрузите файл.');
  if (!state.types.length) return showGenError('Выберите хотя бы один тип вопросов.');
  if (!state.levels.length) return showGenError('Выберите хотя бы один уровень сложности.');
  if (state.questions.length && !confirm('Текущий черновик будет заменён новым. Продолжить?')) return;

  busy = true;
  $('#genBtn').disabled = true;
  editing = null;
  state.questions = [];
  state.usage = { inTok: 0, outTok: 0, kzt: 0, usd: 0 };
  state.reviewMs = 0;
  $('#taqtaDone').hidden = true;
  renderList();
  if (innerWidth < 960) $('.results').scrollIntoView({ behavior: 'smooth', block: 'start' });

  const plan = makePlan(state.text, state.count, state.types, state.levels);
  const t0 = performance.now();
  let done = 0;
  state.genMs = 0;
  const tick = setInterval(() => {
    state.genMs = performance.now() - t0;
    const s = Math.round(state.genMs / 1000);
    progress(`<span class="spin"></span> Генерация: часть ${Math.min(done + 1, plan.batches.length)} из ${plan.batches.length} · ${s} с · готово вопросов: ${state.questions.length} из ${state.count}`);
  }, 250);

  const errors = [];
  const run = async (b) => {
    const avoid = plan.parallel ? [] : state.questions.map((q) => q.question);
    try {
      const res = await generateBatch(
        { text: b.text, lang: state.lang, subject: state.subject, grade: state.grade, count: b.count, types: b.types, levels: b.levels, avoid },
        state.model,
      );
      // Тип, которого не заказывали, не берём — модель иногда добавляет «от себя»
      const qs = (res.questions || []).map((r) => normalize(r, b.index)).filter((q) => q.question && state.types.includes(q.type));
      state.questions.push(...qs);
      addUsage(res.usage);
      checkAll(state.questions, idx, state.lang);
      renderList();
    } catch (e) {
      errors.push(e);
    }
    done++;
  };
  if (plan.parallel) await pool(plan.batches, 4, run);
  else for (const b of plan.batches) await run(b);

  clearInterval(tick);
  state.genMs = performance.now() - t0;
  state.batches = plan.batches.map((b) => ({ index: b.index, text: b.text }));
  progress('');
  busy = false;
  $('#genBtn').disabled = false;
  if (errors.length) {
    const e = errors[0];
    showGenError((e instanceof EngineError ? e.message : 'Ошибка генерации.') + (state.questions.length ? ` Получено ${state.questions.length} из ${state.count}.` : ''));
  }
  checkAll(state.questions, idx, state.lang);
  reviewStart = Date.now();
  renderList();
  save();
  refreshHealth();
}

function addUsage(u) {
  if (!u) return;
  state.usage.inTok += u.inTok || 0;
  state.usage.outTok += u.outTok || 0;
  state.usage.kzt += u.kzt || 0;
  state.usage.usd += u.usd || 0;
}

async function regenerate(q) {
  if (busy) return;
  busy = true;
  const card = document.querySelector(`[data-q="${q.id}"]`);
  card?.classList.add('busy');
  const b = (state.batches || []).find((x) => x.index === q.batch);
  try {
    const res = await generateBatch(
      {
        text: b?.text || state.text.slice(0, 12000),
        lang: state.lang,
        subject: state.subject,
        grade: state.grade,
        count: 1,
        types: [q.type],
        levels: [q.level],
        avoid: state.questions.map((x) => x.question),
      },
      state.model,
    );
    addUsage(res.usage);
    const nq = res.questions?.[0] && normalize(res.questions[0], q.batch);
    if (!nq || !nq.question) throw new EngineError('Модель не вернула вопрос, попробуйте ещё раз.');
    nq.type = q.type;
    const i = state.questions.indexOf(q);
    state.questions[i] = nq;
    nq.regenerated = true;
    checkAll(state.questions, idx, state.lang);
  } catch (e) {
    alert(e.message || 'Не получилось перегенерировать.');
  }
  busy = false;
  renderList();
  save();
}

// ---------- Список вопросов ----------

let reviewStart = null;
setInterval(() => {
  if (reviewStart && !document.hidden && state.questions.length) {
    state.reviewMs += 1000;
    const el = $('#reviewTime');
    if (el) el.textContent = `· проверка учителем ${fmtTime(state.reviewMs)}`;
  }
}, 1000);
const fmtTime = (ms) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function statusBadge(q) {
  const st = q.check?.status || 'ok';
  const label = { ok: 'Проверка пройдена', warn: 'Сомнительный', error: 'Нужна правка' }[st];
  return `<span class="st st-${st}">${label}</span>`;
}

function issuesHtml(q) {
  const list = q.check?.issues || [];
  if (!list.length) return '';
  return `<ul class="issues">${list.map((i) => `<li class="${i.level}">${esc(i.text)}</li>`).join('')}</ul>`;
}

function bodyView(q) {
  if (q.type === 'single' || q.type === 'multiple') {
    return `<ol class="opts" type="A">${q.options.map((o) => `<li class="${o.correct ? 'right' : ''}">${esc(o.text)}${o.correct ? ' <span class="tick">✓</span>' : ''}</li>`).join('')}</ol>`;
  }
  if (q.type === 'open') return `<div class="ans"><span>Эталонный ответ</span>${esc(q.answer)}</div>`;
  if (q.type === 'true_false') return `<div class="ans"><span>Ответ</span>${q.answer === true ? 'Правда' : q.answer === false ? 'Ложь' : '—'}</div>`;
  if (q.type === 'fill_gap') return `<div class="ans"><span>Пропущено</span>${esc(q.answer)}</div>`;
  if (q.type === 'matching') return `<table class="pairs">${q.pairs.map((p) => `<tr><td>${esc(p.left)}</td><td>→</td><td>${esc(p.right)}</td></tr>`).join('')}</table>`;
  return '';
}

function questionView(q) {
  if (q.type === 'fill_gap') return esc(q.question).replace('___', '<span class="gap">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>');
  return esc(q.question);
}

function cardView(q) {
  return `<article class="card ${q.approved ? 'approved' : ''}" data-q="${q.id}">
    <div class="card-top">
      <span class="num">${q.n}</span>
      <span class="type ${TYPES[q.type].cls}">${TYPES[q.type].short}</span>
      <span class="lvl lvl${q.level}">${LEVELS[q.level]}</span>
      ${q.edited ? '<span class="mini">исправлен</span>' : ''}${q.regenerated ? '<span class="mini">новый</span>' : ''}
      <span class="grow"></span>${statusBadge(q)}
    </div>
    <p class="q">${questionView(q)}</p>
    ${bodyView(q)}
    ${q.explanation ? `<p class="expl"><b>Почему:</b> ${esc(q.explanation)}</p>` : ''}
    ${q.source ? `<button type="button" class="src" data-act="src">📄 «${esc(q.source.length > 160 ? q.source.slice(0, 157) + '…' : q.source)}»</button>` : ''}
    ${issuesHtml(q)}
    <div class="acts">
      <button type="button" class="btn small" data-act="edit">Править</button>
      <button type="button" class="btn small" data-act="regen">Перегенерировать</button>
      <button type="button" class="btn small ghost danger" data-act="del">Удалить</button>
      <span class="grow"></span>
      <button type="button" class="btn small ${q.approved ? 'ok' : 'primary'}" data-act="approve">${q.approved ? '✓ Утверждён' : 'Утвердить'}</button>
    </div>
  </article>`;
}

function cardEdit(q) {
  let body = '';
  if (q.type === 'single' || q.type === 'multiple') {
    const kind = q.type === 'single' ? 'radio' : 'checkbox';
    body = `<div class="eopts">${q.options
      .map(
        (o, i) => `<label class="eopt"><input type="${kind}" name="c-${q.id}" data-i="${i}" ${o.correct ? 'checked' : ''} title="Правильный"><span>${'ABCD'[i] || i + 1}</span><input type="text" data-opt="${i}" value="${esc(o.text)}"></label>`,
      )
      .join('')}</div><p class="hint small">${q.type === 'single' ? 'Отметьте один правильный вариант.' : 'Отметьте 2–3 правильных варианта.'}</p>`;
  } else if (q.type === 'true_false') {
    body = `<div class="seg" data-tf><button type="button" data-v="true" aria-checked="${q.answer === true}">Правда</button><button type="button" data-v="false" aria-checked="${q.answer === false}">Ложь</button></div>`;
  } else if (q.type === 'matching') {
    body = `<div class="epairs">${q.pairs.map((p, i) => `<div class="epair"><input data-pl="${i}" value="${esc(p.left)}"><span>→</span><input data-pr="${i}" value="${esc(p.right)}"></div>`).join('')}</div>`;
  } else {
    body = `<label class="lbl">${q.type === 'open' ? 'Эталонный ответ' : 'Пропущенное слово'}<textarea data-f="answer" rows="${q.type === 'open' ? 3 : 1}">${esc(q.answer)}</textarea></label>`;
  }
  return `<article class="card editing" data-q="${q.id}">
    <div class="card-top">
      <span class="num">${q.n}</span><span class="type ${TYPES[q.type].cls}">${TYPES[q.type].short}</span>
      <select data-f="level">${[1, 2, 3].map((l) => `<option value="${l}" ${l === q.level ? 'selected' : ''}>${LEVELS[l]}</option>`).join('')}</select>
    </div>
    <label class="lbl">${q.type === 'true_false' ? 'Утверждение' : q.type === 'fill_gap' ? 'Фраза с пропуском ___' : 'Вопрос'}<textarea data-f="question" rows="2">${esc(q.question)}</textarea></label>
    ${body}
    <label class="lbl">Объяснение<textarea data-f="explanation" rows="2">${esc(q.explanation)}</textarea></label>
    <div class="acts"><button type="button" class="btn small ghost" data-act="cancel">Отмена</button><span class="grow"></span><button type="button" class="btn small primary" data-act="saveEdit">Сохранить</button></div>
  </article>`;
}

function applyEdit(q, card) {
  q.question = card.querySelector('[data-f=question]').value.trim();
  q.explanation = card.querySelector('[data-f=explanation]').value.trim();
  q.level = Number(card.querySelector('[data-f=level]').value);
  if (q.type === 'single' || q.type === 'multiple') {
    q.options = q.options.map((o, i) => ({
      ...o,
      text: card.querySelector(`[data-opt="${i}"]`).value.trim(),
      correct: card.querySelector(`input[data-i="${i}"]`).checked,
    }));
  } else if (q.type === 'true_false') {
    const on = card.querySelector('[data-tf] [aria-checked=true]');
    q.answer = on ? on.dataset.v === 'true' : null;
  } else if (q.type === 'matching') {
    q.pairs = q.pairs.map((p, i) => ({ ...p, left: card.querySelector(`[data-pl="${i}"]`).value.trim(), right: card.querySelector(`[data-pr="${i}"]`).value.trim() }));
  } else {
    q.answer = card.querySelector('[data-f=answer]').value.trim();
  }
  q.edited = true;
}

function renderStats() {
  const qs = state.questions;
  const st = (s) => qs.filter((q) => q.check?.status === s).length;
  const u = state.usage;
  $('#stats').innerHTML = qs.length
    ? `<span class="s-ok">✓ ${st('ok')}</span><span class="s-warn">⚠ ${st('warn')}</span><span class="s-err">✕ ${st('error')}</span>
       <span class="s-meta" title="Время генерации">⏱ ${(state.genMs / 1000).toFixed(0)} с</span>
       <span class="s-meta" title="Видит администратор: токены и стоимость генерации">${(u.inTok + u.outTok).toLocaleString('ru')} ток. · ${u.kzt < 1 ? u.kzt.toFixed(2) : u.kzt.toFixed(1)} ₸</span>`
    : '';
  $('#testTitle').textContent = qs.length ? state.title : 'Черновик теста';
  const appr = qs.filter((q) => q.approved).length;
  $('#exportCount').textContent = appr;
  $('#exportbar').hidden = !qs.length;
  $('#toolbar').hidden = !qs.length;
  $('#jsonBtn').disabled = !appr;
  const c = taqtaCandidates(qs);
  const games = ['true_false', 'fill_gap', 'matching'].filter((f) => c[f].length);
  $('#taqtaBtn').disabled = !games.length;
  $('#taqtaBtn').title = games.length ? '' : 'Утвердите вопросы типов «Правда или ложь», «Пропуск» или «Соответствие»';
  for (const b of $('#filterSeg').children) b.setAttribute('aria-checked', String(b.dataset.v === state.filter));
}

function renderList() {
  const qs = state.questions;
  $('#empty').hidden = qs.length > 0 || busy;
  const shown = qs.filter((q) => state.filter === 'all' || (state.filter === 'flag' ? q.check?.status !== 'ok' : q.approved));
  $('#list').innerHTML = shown.map((q) => (editing === q.id ? cardEdit(q) : cardView(q))).join('') ||
    (qs.length ? '<p class="hint">В этом фильтре вопросов нет.</p>' : '');
  renderStats();
}

$('#list').addEventListener('click', (e) => {
  const card = e.target.closest('[data-q]');
  if (!card) return;
  const q = state.questions.find((x) => x.id === card.dataset.q);
  if (!q) return;
  const tf = e.target.closest('[data-tf] [data-v]');
  if (tf) {
    for (const b of tf.parentNode.children) b.setAttribute('aria-checked', String(b === tf));
    return;
  }
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  if (act === 'approve') q.approved = !q.approved;
  else if (act === 'del') {
    if (!confirm(`Удалить вопрос № ${q.n}?`)) return;
    state.questions.splice(state.questions.indexOf(q), 1);
    checkAll(state.questions, idx, state.lang);
  } else if (act === 'edit') editing = q.id;
  else if (act === 'cancel') editing = null;
  else if (act === 'saveEdit') {
    applyEdit(q, card);
    editing = null;
    checkAll(state.questions, idx, state.lang);
  } else if (act === 'regen') return regenerate(q);
  else if (act === 'src') return showSource(q.sourceStart, q);
  renderList();
  save();
  if (act === 'edit') card.parentNode.querySelector(`[data-q="${q.id}"] textarea`)?.focus();
});

function showSource(start, q) {
  const dlg = $('#srcDlg');
  const t = state.text;
  $('#srcTitle').textContent = q ? `Вопрос № ${q.n}: откуда взят` : state.title;
  if (q && start >= 0 && q.sourceSentence) {
    const end = start + q.sourceSentence.length;
    $('#srcBody').innerHTML = `${esc(t.slice(0, start))}<mark id="hl">${esc(t.slice(start, end))}</mark>${esc(t.slice(end))}`;
  } else {
    $('#srcBody').textContent = t;
  }
  dlg.showModal();
  const hl = $('#hl');
  if (hl) hl.scrollIntoView({ block: 'center' });
}

// ---------- Экспорт ----------

function exportJson() {
  reviewStart = null;
  const data = buildJson(state);
  const name = (state.title || 'test').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 50) + '.json';
  download(name, JSON.stringify(data, null, 2));
}

function exportTaqta() {
  const made = sendToTaqta(state);
  const box = $('#taqtaDone');
  if (!made.length) return;
  box.hidden = false;
  box.innerHTML = `<b>Игры добавлены в «Тақта»:</b><ul>${made
    .map((g) => `<li>${esc(g.title)} — ${g.count} зад. · <a href="../taqta/#/show/${g.id}" target="_blank" rel="noopener">показать классу</a> · <a href="../taqta/#/games/${g.id}/edit" target="_blank" rel="noopener">редактор</a></li>`)
    .join('')}</ul>`;
}

// ---------- Старт ----------

async function refreshHealth() {
  const h = await health();
  const el = $('#engineInfo');
  if (!h) el.innerHTML = '<span class="dot off"></span>Сервер генерации недоступен';
  else {
    const left = Math.floor(h.budgetLeft / 120);
    el.innerHTML = `<span class="dot ${left > 0 ? 'on' : 'off'}"></span>${esc(ENGINES[h.model]?.label || h.model)} · лимит демо на сегодня: ~${left} запросов`;
  }
}

const demo = new URLSearchParams(location.search).get('demo');
if (demo && /^\w+$/.test(demo)) {
  // Готовый пример: записанный ответ модели — смотреть без ожидания и без расхода лимита
  try {
    const r = await fetch(`samples/demo-${demo}.json`);
    if (r.ok) {
      Object.assign(state, await r.json());
      save();
    }
  } catch {
    /* нет примера — обычный старт */
  }
  history.replaceState(null, '', location.pathname);
} else load();
buildForm();
if (state.text) idx = indexMaterial(state.text);
syncForm();
renderDoc();
if (state.questions.length) {
  checkAll(state.questions, idx, state.lang);
  reviewStart = Date.now();
}
renderList();
refreshHealth();
