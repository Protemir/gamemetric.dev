// Слой генерации. Интерфейс один: generateBatch({text, lang, subject, grade, count, types, levels, avoid})
// → {questions, usage}. Сейчас подключён Workers AI (gpt-oss-120b, сервер в Cloudflare);
// в продукте сюда же встаёт адаптер к любой модели, в том числе развёрнутой внутри РК.

export const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? (new URLSearchParams(location.search).get('api') || 'https://synaq-api.protemir.workers.dev')
  : 'https://synaq-api.protemir.workers.dev';

export const ENGINES = {
  'gpt-oss-120b': { label: 'gpt-oss-120b · Workers AI', note: 'открытая модель OpenAI, работает на серверах Cloudflare' },
  'llama-3.3-70b': { label: 'Llama 3.3 70B · Workers AI', note: 'открытая модель Meta — для сравнения' },
};

export class EngineError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export async function health() {
  try {
    const r = await fetch(API + '/health');
    return await r.json();
  } catch {
    return null;
  }
}

export async function generateBatch(params, model, signal) {
  let r;
  try {
    r = await fetch(API + '/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...params, model }),
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new EngineError('Нет связи с сервером генерации.', 'network');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new EngineError(j.message || `Ошибка сервера (${r.status})`, j.error || 'http');
  return j;
}

let seq = 0;
const uid = () => 'q' + Date.now().toString(36) + (seq++).toString(36);

function bool(v) {
  if (v === true || v === false) return v;
  const s = String(v).trim().toLowerCase();
  if (['true', 'правда', 'верно', 'да', 'ақиқат', 'дұрыс', 'иә'].includes(s)) return true;
  if (['false', 'ложь', 'неверно', 'нет', 'жалған', 'бұрыс', 'жоқ'].includes(s)) return false;
  return null;
}

/** Приводим ответ модели к нашей модели вопроса, ничего не выдумывая за неё. */
export function normalize(raw, batch) {
  const type = ['single', 'multiple', 'open', 'true_false', 'fill_gap', 'matching'].includes(raw.type) ? raw.type : 'single';
  const q = {
    id: uid(),
    type,
    level: [1, 2, 3].includes(Number(raw.level)) ? Number(raw.level) : 2,
    question: String(raw.question || raw.statement || raw.text || '').trim(),
    options: [],
    answer: '',
    pairs: [],
    explanation: String(raw.explanation || '').trim(),
    source: String(raw.source || '').trim(),
    batch,
    approved: false,
    edited: false,
  };
  if (type === 'single' || type === 'multiple') {
    q.options = (Array.isArray(raw.options) ? raw.options : []).map((o, i) => ({
      id: q.id + 'o' + i,
      text: String(typeof o === 'string' ? o : o.text || '').trim(),
      correct: typeof o === 'object' && bool(o.correct) === true,
    }));
    // Модели любят ставить верный ответ первым — перемешиваем, чтобы он не был всегда «А»
    for (let i = q.options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
    }
  } else if (type === 'true_false') {
    q.answer = bool(raw.answer);
  } else if (type === 'matching') {
    q.pairs = (Array.isArray(raw.pairs) ? raw.pairs : []).map((p, i) => ({
      id: q.id + 'p' + i,
      left: String(p.left || '').trim(),
      right: String(p.right || '').trim(),
    }));
  } else {
    q.answer = String(raw.answer ?? '').trim();
    if (type === 'fill_gap') q.question = q.question.replace(/_{2,}/g, '___');
  }
  return q;
}

/** Делим материал на части по абзацам — каждая часть уходит отдельным запросом. */
export function splitParts(text, parts) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (parts <= 1 || paras.length < parts) return [text];
  const target = text.length / parts;
  const out = [];
  let cur = '';
  for (const p of paras) {
    if (cur && cur.length + p.length > target * 1.15 && out.length < parts - 1) {
      out.push(cur);
      cur = '';
    }
    cur += (cur ? '\n\n' : '') + p;
  }
  if (cur) out.push(cur);
  return out;
}

const PER_CALL = 6;
const MAX_PART = 12000;

/**
 * План генерации: сколько запросов, какой кусок материала и какие типы/уровни в каждом.
 * Длинный материал режем на части (каждая — свой запрос, параллельно).
 * Короткий — один текст на все запросы, они идут по очереди со списком «уже есть».
 */
export function makePlan(text, count, types, levels) {
  const calls = Math.ceil(count / PER_CALL);
  const slots = [];
  for (let i = 0; i < count; i++) slots.push({ type: types[i % types.length], level: levels[(i + Math.floor(i / types.length)) % levels.length] });
  const long = text.length >= calls * 1500;
  let parts = long ? splitParts(text, calls) : [text];
  // Очень длинный документ: в одну часть больше MAX_PART не кладём — берём равномерно разнесённые абзацы
  parts = parts.map((p) => (p.length > MAX_PART ? sample(p, MAX_PART) : p));
  const batches = [];
  for (let c = 0; c < calls; c++) {
    const mine = slots.slice(c * PER_CALL, (c + 1) * PER_CALL);
    batches.push({
      index: c,
      text: parts[Math.min(c, parts.length - 1)] || text,
      count: mine.length,
      types: [...new Set(mine.map((s) => s.type))],
      levels: [...new Set(mine.map((s) => s.level))],
    });
  }
  return { batches, parallel: parts.length > 1 };
}

function sample(text, max) {
  const paras = text.split(/\n{2,}/);
  const step = text.length / max;
  const out = [];
  let len = 0;
  for (let i = 0; i < paras.length && len < max; i += Math.max(1, Math.round(step))) {
    out.push(paras[i]);
    len += paras[i].length;
  }
  return out.join('\n\n').slice(0, max);
}
