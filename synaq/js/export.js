// Экспорт: JSON утверждённого теста (п. 6 ТЗ) и игры для «Тақта» (gamemetric.dev/taqta/).
// «Тақта» лежит на том же домене, поэтому игры кладём прямо в её хранилище (localStorage)
// в том же формате, что принимает её API: POST /games {title, format, language, status, tasks}.

const TAQTA_DB = 'taqta.db.v1';
const TAQTA_OWNER = 'teacher-demo-1';
const LIM = { title: 120, statement: 300, gapText: 300, prompt: 120, pairItem: 80, tasks: 50 };

export function buildJson(state) {
  const approved = state.questions.filter((q) => q.approved);
  return {
    schema: 'temirlab.synaq.test/v1',
    title: state.title,
    subject: state.subject,
    grade: state.grade,
    language: state.lang,
    createdAt: new Date().toISOString(),
    source: { fileName: state.fileName, pages: state.pages, chars: state.text.length },
    generator: {
      engine: 'workers-ai',
      model: state.model,
      seconds: Math.round(state.genMs / 100) / 10,
      tokens: { input: state.usage.inTok, output: state.usage.outTok },
      costKzt: Math.round(state.usage.kzt * 100) / 100,
    },
    review: {
      seconds: Math.round(state.reviewMs / 1000),
      generated: state.questions.length,
      approved: approved.length,
      edited: approved.filter((q) => q.edited).length,
    },
    questions: approved.map((q, i) => {
      const base = {
        id: q.id,
        number: i + 1,
        type: q.type,
        level: q.level,
        question: q.question,
      };
      if (q.type === 'single' || q.type === 'multiple') base.options = q.options.map((o) => ({ text: o.text, correct: o.correct }));
      if (q.type === 'matching') base.pairs = q.pairs.map((p) => ({ left: p.left, right: p.right }));
      if (q.type !== 'single' && q.type !== 'multiple' && q.type !== 'matching') base.answer = q.answer;
      base.explanation = q.explanation;
      base.source = { quote: q.source, offset: q.sourceStart };
      base.check = { status: q.check?.status, issues: (q.check?.issues || []).map((x) => x.text) };
      base.edited = q.edited;
      return base;
    }),
  };
}

export function download(name, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const tid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));

/** Какие утверждённые вопросы можно превратить в игры «Тақта» и сколько их. */
export function taqtaCandidates(questions) {
  const ok = questions.filter((q) => q.approved);
  return {
    true_false: ok.filter((q) => q.type === 'true_false' && (q.answer === true || q.answer === false)),
    fill_gap: ok.filter((q) => q.type === 'fill_gap' && q.question.split('___').length === 2 && q.answer.trim()),
    matching: ok.filter((q) => q.type === 'matching' && q.pairs.length >= 2),
  };
}

function toTask(q) {
  if (q.type === 'true_false') return { id: tid(), type: 'true_false', statement: clip(q.question, LIM.statement), answer: q.answer };
  if (q.type === 'fill_gap') return { id: tid(), type: 'fill_gap', text: clip(q.question, LIM.gapText), answer: q.answer.trim() };
  const id = tid();
  return {
    id,
    type: 'matching',
    prompt: clip(q.question, LIM.prompt),
    pairs: q.pairs.slice(0, 6).map((p, i) => ({ id: `${id}-p${i + 1}`, left: clip(p.left, LIM.pairItem), right: clip(p.right, LIM.pairItem) })),
  };
}

const FORMAT_TITLE = {
  ru: { true_false: 'Правда или ложь', fill_gap: 'Заполни пропуск', matching: 'Найди соответствие' },
  kk: { true_false: 'Ақиқат па, жалған ба', fill_gap: 'Бос орынды толтыр', matching: 'Сәйкестендір' },
};

/** Кладёт игры в «Тақта». Возвращает [{format, id, count}]. */
export function sendToTaqta(state) {
  const c = taqtaCandidates(state.questions);
  let db;
  try {
    db = JSON.parse(localStorage.getItem(TAQTA_DB) || 'null') || { games: [] };
  } catch {
    db = { games: [] };
  }
  const now = new Date().toISOString();
  const made = [];
  for (const format of ['true_false', 'fill_gap', 'matching']) {
    const list = c[format];
    if (!list.length) continue;
    const game = {
      id: tid(),
      ownerId: TAQTA_OWNER,
      title: clip(`${state.title} · ${FORMAT_TITLE[state.lang][format]}`, LIM.title),
      format,
      language: state.lang,
      status: 'ready',
      tasks: list.slice(0, LIM.tasks).map(toTask),
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    db.games.push(game);
    made.push({ format, id: game.id, count: game.tasks.length, title: game.title });
  }
  localStorage.setItem(TAQTA_DB, JSON.stringify(db));
  return made;
}
