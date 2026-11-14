// Нұсқау — демо: инструктаж → автосверка с НПА → утверждение → тест и сценарий видео.
(() => {
  const API = 'https://nusqau-api.protemir.workers.dev';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const KINDS = { intro: 'Вводный', primary: 'Первичный', repeat: 'Повторный', unplanned: 'Внеплановый', target: 'Целевой' };
  const TYPES = { single: 'один ответ', multiple: 'несколько ответов', true_false: 'верно / неверно', matching: 'соответствие', case: 'ситуационный кейс' };
  const ICON = { helmet: '⛑️', fire: '🔥', exit: '🚪', electric: '⚡', needle: '🪡', alert: '⚠️', check: '✅', phone: '📞', firstaid: '🩹', book: '📘', shield: '🛡️', person: '👷', gear: '⚙️', stop: '⛔', hand: '✋', eye: '👁️' };
  const VERD = {
    ok: ['ok', 'сверено: совпадает с источником'], partial: ['mid', 'частично: есть детали, которых нет в источнике'],
    no: ['bad', 'не подтверждается источником'], doubt: ['mid', 'сомнительно'], problem: ['bad', 'проблема'], weak: ['mid', 'слабый вопрос'],
  };
  let KB = null;
  let NOTES = {};
  let S = null; // состояние текущего материала

  const kbItem = (id) => KB?.items.find((i) => i.id === id);
  const cleanHead = (h) => String(h).replace(/^\s*\d+[.)]\s*/, '');

  // Русские слова в казахском тексте (грубая эвристика: окончания и частые слова)
  const RU_END = /^[а-яё]+(ый|ение|ание|ость|ться|ский|ская|ское|ного|ному|ная|ное|ную|ыми)$/i;
  const RU_WORDS = new Set(['осмотр', 'показ', 'опрос', 'навыка', 'проверка', 'внеплановый', 'плановый', 'подозрительные']);
  function ruWords(text) {
    const out = new Set();
    for (const w of String(text).toLowerCase().match(/[а-яёәғқңөұүһі-]+/g) || []) {
      if (/[әғқңөұүһі]/.test(w)) continue;
      const base = w.replace(/-.*/, '');
      if (RU_END.test(base) || RU_WORDS.has(base) || /^подозр/.test(base)) out.add(base);
    }
    return [...out];
  }

  function status(msg, err) {
    const el = $('#status');
    el.textContent = msg;
    el.classList.toggle('err', !!err);
    el.classList.toggle('hidden', !msg);
  }

  async function api(body) {
    const r = await fetch(API + '/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({ error: 'net', message: 'Сервер не ответил.' }));
    if (!r.ok) throw Object.assign(new Error(d.message || d.error || 'Ошибка'), { data: d });
    return d;
  }

  async function health() {
    try {
      const h = await (await fetch(API + '/health')).json();
      $('#budget').textContent = h.budgetLeft > 600 ? `Лимит демо на сегодня: хватит примерно на ${Math.floor(h.budgetLeft / 650)} полных прогона.` : 'Суточный лимит демо почти исчерпан — откройте готовые примеры или зайдите завтра (сброс в 00:00 UTC).';
      if (h.budgetLeft < 600) $('#go').disabled = true;
    } catch { $('#budget').textContent = ''; }
  }

  // ---------- Отрисовка ----------
  function setStage(stage) {
    S.stage = stage;
    const order = ['draft', 'checked', 'approved', 'published'];
    const k = order.indexOf(stage);
    document.querySelectorAll('#steps li').forEach((li) => {
      const i = order.indexOf(li.dataset.s);
      li.className = i < k ? 'done' : i === k ? 'now' : '';
      if (stage === 'published' && i === k) li.className = 'done';
    });
    let h = $('#flow .hist');
    if (!h) { h = document.createElement('ul'); h.className = 'hist'; $('#flow').append(h); }
    h.innerHTML = S.history.map((x) => `<li>${esc(x.at)} — ${esc(x.what)}</li>`).join('');
    $('#flow').classList.remove('hidden');
  }
  function log(what) {
    S.history.push({ at: new Date().toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }), what });
  }

  function renderNotes() {
    const n = S.sampleId && NOTES[S.sampleId];
    const el = $('#notes');
    if (!n) { el.classList.add('hidden'); return; }
    el.className = 'card notes';
    el.innerHTML = `<h2>Замечания ревьюера</h2><p class="small muted">${esc(n.by)}. ${esc(n.summary)}</p><ul>${n.notes.map((x) => `<li><b>${esc(x.where)}.</b> ${esc(x.text)}</li>`).join('')}</ul>`;
  }

  function itemHtml(it, si, ii, editable) {
    const tag = it.status === 'cited' ? '<span class="tag cited">норма</span>' : it.status === 'unverified' ? '<span class="tag unverified">непроверено</span>' : '<span class="tag practice">практика</span>';
    const refs = it.src?.length ? `<div class="refs">${it.src.map((id) => {
      const k = kbItem(id); if (!k) return esc(id);
      const act = KB.acts[k.act];
      return `<details><summary>${esc(act.short || act.ru)}, ${esc(k.point)}</summary><span class="src">${esc(k.text)}<br><a href="${esc(act.url)}" target="_blank" rel="noopener">adilet.zan.kz</a> · ${esc(act.edition)}</span></details>`;
    }).join(' · ')}</div>` : '';
    const v = it.check && VERD[it.check.verdict];
    const chk = v && it.check.verdict !== 'ok' ? `<div class="chk ${v[0]}">Автосверка: ${esc(v[1])}${it.check.note ? ' — ' + esc(it.check.note) : ''}</div>` : v ? `<div class="chk muted">Автосверка: ${it.status === 'practice' ? 'выглядит разумно' : 'совпадает с источником'}</div>` : '';
    const iss = (it.issues || []).map((x) => `<div class="issue">${esc(x)}</div>`).join('');
    const ru = S.params.lang === 'kk' ? ruWords(it.text) : [];
    const ruh = ru.length ? `<div class="chk"><span class="tag lang">русские слова?</span> ${esc(ru.join(', '))}</div>` : '';
    return `<div class="item ${it.status}${it.removed ? ' removed' : ''}" data-s="${si}" data-i="${ii}">
      <div class="bar"></div>
      <div><div class="txt" ${editable ? 'contenteditable="true"' : ''} spellcheck="false">${esc(it.text)}</div>${refs}${chk}${iss}${ruh}</div>
      <div class="side">${tag}${editable ? `<button class="del" title="${it.removed ? 'Вернуть' : 'Удалить из утверждённой версии'}">${it.removed ? '↺' : '×'}</button>` : ''}</div>
    </div>`;
  }

  function renderInstr() {
    const ins = S.instr;
    const editable = S.stage === 'checked';
    const c = ins.checks || {};
    const all = ins.sections.flatMap((s) => s.items);
    const flagged = all.filter((x) => x.check && x.check.verdict !== 'ok').length;
    const ruAll = S.params.lang === 'kk' ? ruWords([ins.title, ins.summary, ...ins.program.map((p) => p.topic + ' ' + p.control), ...all.map((x) => x.text)].join(' ')) : [];
    $('#instrBody').innerHTML = `
      <h3 style="margin-top:0">${esc(ins.title)}</h3>
      ${ruWords(ins.title).length && S.params.lang === 'kk' ? `<div class="chk"><span class="tag lang">русские слова?</span> ${esc(ruWords(ins.title).join(', '))}</div>` : ''}
      <p class="muted">${esc(ins.summary)}</p>
      <div class="meta">
        <span class="stat">Нормативных тезисов <b>${c.norms ?? 0}</b>, со ссылкой <b>${c.cited ?? 0}</b> (${c.norms ? Math.round((c.cited / c.norms) * 100) : 0}%)</span>
        <span class="stat">Непроверено <b>${c.unverified ?? 0}</b></span>
        <span class="stat">Практика <b>${c.practice ?? 0}</b></span>
        <span class="stat">Автосверка отметила <b>${flagged}</b></span>
        ${S.params.lang === 'kk' ? `<span class="stat">Русских слов <b>${ruAll.length}</b></span>` : ''}
      </div>
      <h3>Программа</h3>
      <table class="prog"><tr><th>Тема</th><th>Часы</th><th>Контроль</th></tr>${ins.program.map((p) => `<tr><td>${esc(p.topic)}</td><td class="h">${p.hours}</td><td>${esc(p.control)}</td></tr>`).join('')}</table>
      ${ins.sections.map((s, si) => `<div class="sec"><h3>${si + 1}. ${esc(cleanHead(s.heading))}</h3>${s.items.map((it, ii) => itemHtml(it, si, ii, editable)).join('')}</div>`).join('')}`;
    $('#instr').classList.remove('hidden');
    $('#approveBox').classList.toggle('hidden', !editable);
  }

  function renderTest() {
    const t = S.test;
    if (!t) { $('#test').classList.add('hidden'); return; }
    const bad = t.questions.filter((q) => q.check && q.check.verdict !== 'ok').length;
    $('#testBody').innerHTML = `<div class="meta"><span class="stat">Вопросов <b>${t.questions.length}</b></span><span class="stat">Автопроверка структуры: замечаний <b>${t.checks?.withIssues ?? 0}</b></span><span class="stat">Проверяющий отметил <b>${bad}</b></span></div>` +
      t.questions.map((q, i) => {
        const v = q.check && (q.check.verdict === 'ok' ? ['ok', 'проверяющий: ok'] : VERD[q.check.verdict]);
        let body = '';
        if (q.options?.length) body = `<ol>${q.options.map((o) => `<li class="${o.correct ? 'ok' : ''}">${esc(o.text)}</li>`).join('')}</ol>`;
        if (q.type === 'true_false') body = `<div class="ans">Ответ: <b>${q.answer ? 'верно' : 'неверно'}</b></div>`;
        if (q.type === 'matching') body = `<div class="pairs">${q.pairs.map((p) => `<div>${esc(p.left)}</div><div class="r">${esc(p.right)}</div>`).join('')}</div>`;
        const sec = S.approvedSections?.[q.section - 1];
        return `<div class="q ${q.check?.verdict === 'problem' ? 'problem' : ''}">
          <div class="qh"><b>${i + 1}.</b><span class="tag practice">${esc(TYPES[q.type] || q.type)}</span><span>уровень ${q.level}</span><span>· раздел ${q.section}${sec ? ' «' + esc(cleanHead(sec.heading)) + '»' : ''}</span>${v ? `<span class="tag ${v[0]}">${esc(v[1])}</span>` : ''}</div>
          <div class="qt">${esc(q.question)}</div>${body}
          ${q.explanation ? `<div class="exp">${esc(q.explanation)}</div>` : ''}
          ${q.check?.note ? `<div class="chk ${v?.[0] || ''}">Проверяющий: ${esc(q.check.note)}</div>` : ''}
          ${(q.issues || []).map((x) => `<div class="issue">${esc(x)}</div>`).join('')}
        </div>`;
      }).join('');
    $('#test').classList.remove('hidden');
  }

  // --- Видео: готовый MP4 для примера или проигрыватель «слайды + голос браузера» ---
  let play = null;
  function sentencesOf(text) { return String(text).split(/(?<=[.!?…])\s+/).filter(Boolean); }
  function renderVideo() {
    const v = S.video;
    if (!v) {
      $('#videoBody').innerHTML = '<p class="muted">Сценарий видео для этого примера не сгенерирован (см. замечания ревьюера).</p>';
      $('#video').classList.remove('hidden');
      return;
    }
    const p = S.params;
    const mp4 = S.videoFile;
    const scenesHtml = `<div class="scenes"><h3>Сценарий: ${esc(v.title)}</h3>${v.scenes.map((s, i) => `<div class="scene"><div class="k">${i + 1}</div><div><b>${esc(s.title)}</b> · ${s.bullets.map(esc).join(' · ')}<p>${esc(s.narration)}</p></div></div>`).join('')}</div>`;
    if (mp4) {
      $('#videoBody').innerHTML = `<div class="player"><video controls preload="metadata" poster="${mp4.replace('.mp4', '-poster.png')}"><source src="${mp4}" type="video/mp4"><track kind="subtitles" srclang="ru" label="Русский" src="${mp4.replace('.mp4', '.vtt')}"></video></div>
        <p class="small muted">Видео собрано автоматически из сценария ниже: ${S.videoMeta ? `${Math.floor(S.videoMeta.durationSec / 60)} мин ${S.videoMeta.durationSec % 60} с, сборка ${S.videoMeta.buildSec} с на обычном ноутбуке` : ''}. Голос — синтез речи Windows (ru-RU), слайды из HTML, ffmpeg → MP4 1080p H.264 + SRT. Субтитры привязаны к реальной длине каждой фразы. В продукте — голоса RU/KZ на серверах в РК и опционально AI-диктор.</p>` + scenesHtml;
    } else {
      $('#videoBody').innerHTML = `<div class="player"><div class="slide" id="slide"></div><div class="ctrl"><button id="pl">▶ Воспроизвести</button><span id="plInfo">Озвучка — голосом вашего браузера (${p.lang === 'kk' ? 'kk-KZ, если есть; в Edge есть' : 'ru-RU'}).</span></div></div>
        <p class="small muted">Это предпросмотр в браузере. Готовый MP4 1080p + SRT собирается на сервере тем же сценарием — пример видео есть у «Швеи-мотористки».</p>` + scenesHtml;
      drawSlide(0, '');
      $('#pl').onclick = togglePlay;
    }
    $('#video').classList.remove('hidden');
  }
  function drawSlide(i, sub) {
    const v = S.video, s = v.scenes[i];
    $('#slide').innerHTML = `<div class="sb"><b>ВИДЕО-ИНСТРУКТАЖ</b><span>${esc(KINDS[S.params.kind] || '')} · ${esc(S.params.position)}</span><span class="bd">ДЕМО · черновик ИИ</span></div>
      <div class="sm"><div class="si">${ICON[s.icon] || '🛡️'}</div><div><h4>${esc(s.title)}</h4><ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div></div>
      <div class="ss">${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
  }
  function togglePlay() {
    if (play) { speechSynthesis.cancel(); play = null; $('#pl').textContent = '▶ Воспроизвести'; return; }
    if (!('speechSynthesis' in window)) { $('#plInfo').textContent = 'Браузер не умеет синтез речи.'; return; }
    const lang = S.params.lang === 'kk' ? 'kk' : 'ru';
    const voice = speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith(lang));
    if (!voice) $('#plInfo').textContent = lang === 'kk' ? 'Казахского голоса в браузере нет — субтитры без звука. В Edge голос есть.' : 'Русского голоса нет — субтитры без звука.';
    const queue = [];
    S.video.scenes.forEach((s, i) => sentencesOf(s.narration).forEach((t) => queue.push({ i, t })));
    play = { k: 0 };
    $('#pl').textContent = '■ Стоп';
    const next = () => {
      if (!play) return;
      if (play.k >= queue.length) { play = null; $('#pl').textContent = '▶ Воспроизвести'; drawSlide(S.video.scenes.length - 1, ''); return; }
      const q = queue[play.k++];
      drawSlide(q.i, q.t);
      if (voice) {
        const u = new SpeechSynthesisUtterance(q.t);
        u.voice = voice; u.lang = voice.lang; u.rate = 1;
        u.onend = next; u.onerror = next;
        speechSynthesis.speak(u);
      } else setTimeout(next, Math.max(1500, q.t.length * 70));
    };
    next();
  }
  function srtFromScript() {
    let t = 0.5, n = 0;
    const ts = (x) => { const ms = Math.round(x * 1000); const p = (v, l = 2) => String(v).padStart(l, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
    const out = [];
    for (const s of S.video.scenes) { for (const x of sentencesOf(s.narration)) { const d = Math.max(1.2, x.length / 14); out.push(`${++n}\n${ts(t)} --> ${ts(t + d)}\n${x}\n`); t += d + 0.3; } t += 0.8; }
    return out.join('\n');
  }

  function renderAudit() {
    const rows = S.audit.filter(Boolean);
    if (!rows.length) { $('#audit').classList.add('hidden'); return; }
    const STEP = { instr: 'инструктаж', test: 'тест', video: 'сценарий видео', verify: 'автосверка' };
    $('#auditBody').innerHTML = `<div class="auditWrap"><table class="audit"><tr><th>Время (UTC)</th><th>Шаг</th><th>Модель / промпт</th><th>База НПА</th><th>Токены</th><th>Время</th><th>Стоимость</th></tr>${rows.map((a) => `<tr><td>${esc((a.at || '').replace('T', ' ').slice(0, 19))}</td><td>${esc(STEP[a.step] || a.step)}${a.target ? ' · ' + esc(STEP[a.target]) : ''}</td><td>${esc(a.model || '')}<br><span class="muted">${esc(a.prompt || '')}</span></td><td>${esc(a.kb || '')}${a.kbItems?.length ? `<br><span class="muted">${a.kbItems.length} пунктов в выдержке</span>` : ''}</td><td>${a.inTok ?? ''} / ${a.outTok ?? ''}</td><td>${a.ms ? (a.ms / 1000).toFixed(1) + ' с' : ''}</td><td>${a.kzt != null ? a.kzt.toFixed(2) + ' ₸' : ''}</td></tr>`).join('')}</table></div>
      <p class="small muted">Итого: ${(rows.reduce((x, a) => x + (a.ms || 0), 0) / 1000).toFixed(0)} с работы модели, ${rows.reduce((x, a) => x + (a.kzt || 0), 0).toFixed(1)} ₸ по тарифу Workers AI.</p>`;
    $('#audit').classList.remove('hidden');
  }

  function renderAll() {
    renderNotes(); renderInstr(); renderTest(); renderVideo(); renderAudit(); setStage(S.stage);
    if (!S.test) { $('#test').classList.add('hidden'); }
    if (!S.video && S.stage !== 'published' && !S.sampleId) $('#video').classList.add('hidden');
  }

  // ---------- Готовые примеры ----------
  async function loadSample(id) {
    status('Загружаю пример…');
    const d = await (await fetch(`samples/${id}.json`)).json();
    let meta = null;
    if (id === 'shveya-ru') { try { meta = await (await fetch('video/shveya-ru.json')).json(); } catch {} }
    S = {
      sampleId: id, params: d.params, instr: d.instr, test: d.test || null, video: d.video || null, audit: d.audit || [],
      history: [{ at: '14.11', what: 'черновик сгенерирован' }, { at: '14.11', what: 'автосверка с НПА' }],
      videoFile: meta ? 'video/shveya-ru.mp4' : null, videoMeta: meta,
    };
    // в примере утверждённая версия = без пунктов с вердиктом no/doubt
    S.instr.sections.forEach((s) => s.items.forEach((it) => { it.removed = ['no', 'doubt'].includes(it.check?.verdict); }));
    S.approvedSections = S.instr.sections.map((s) => ({ ...s, items: s.items.filter((x) => !x.removed) })).filter((s) => s.items.length);
    if (d.test) S.history.push({ at: '14.11', what: `утверждено (в примере автоматически исключены пункты, которые не прошли сверку: ${d.removed?.length || 0})` }, { at: '14.11', what: 'тест и сценарий видео из утверждённой версии' });
    S.stage = d.test ? 'published' : 'checked';
    fillForm(d.params);
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.sample === id));
    renderAll();
    if (!d.test) { $('#approveBox').classList.add('hidden'); }
    status('');
    try { history.replaceState(null, '', '?demo=' + id); } catch {}
  }
  function fillForm(p) {
    const f = $('#form');
    for (const k of ['kind', 'area', 'lang', 'industry', 'position', 'works', 'conditions', 'reason']) if (f[k]) f[k].value = p[k] || '';
    toggleReason();
  }
  function toggleReason() { $('.reason').classList.toggle('hidden', $('#form').kind.value !== 'unplanned'); }

  // ---------- Живая генерация ----------
  function mergeVerdicts(items, verdicts) {
    items.forEach((it, i) => { const v = verdicts.find((x) => x.n === i + 1); it.check = v ? { verdict: v.verdict, note: v.note } : null; });
  }
  async function generate(e) {
    e.preventDefault();
    const f = $('#form');
    const params = Object.fromEntries(['kind', 'area', 'lang', 'industry', 'position', 'works', 'conditions', 'reason'].map((k) => [k, f[k].value.trim()]));
    if (params.kind !== 'unplanned') params.reason = '';
    $('#go').disabled = true;
    document.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
    try { history.replaceState(null, '', location.pathname); } catch {}
    S = { sampleId: null, params, instr: null, test: null, video: null, audit: [], history: [], videoFile: null };
    ['#notes', '#instr', '#test', '#video', '#audit'].forEach((s) => $(s).classList.add('hidden'));
    try {
      const t0 = Date.now();
      status('1/2 Пишу черновик инструктажа по базе НПА… обычно 15–30 с');
      const a = await api({ step: 'instr', ...params });
      S.instr = a.result; S.audit.push(a.audit); log('черновик сгенерирован'); S.stage = 'draft';
      renderInstr(); setStage('draft');
      status('2/2 Сверяю каждый тезис с текстом пункта…');
      try {
        const v = await api({ step: 'verify', target: 'instr', ...params, instr: S.instr });
        mergeVerdicts(S.instr.sections.flatMap((s) => s.items), v.result.verdicts); S.audit.push(v.audit); log('автосверка с НПА');
      } catch (err) { log('автосверка не удалась: ' + err.message); }
      S.stage = 'checked';
      renderAll();
      status(`Готово за ${Math.round((Date.now() - t0) / 1000)} с. Проверьте отмеченные пункты, поправьте текст и утвердите.`);
      $('#instr').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      status(err.message, true);
    } finally { $('#go').disabled = false; health(); }
  }

  function collectApproved() {
    document.querySelectorAll('#instrBody .item').forEach((el) => {
      const it = S.instr.sections[el.dataset.s].items[el.dataset.i];
      const txt = el.querySelector('.txt').textContent.trim();
      if (txt !== it.text) { it.text = txt; it.edited = true; }
    });
    return { title: S.instr.title, sections: S.instr.sections.map((s) => ({ heading: s.heading, items: s.items.filter((x) => !x.removed && x.text) })).filter((s) => s.items.length) };
  }

  async function approve() {
    const ap = collectApproved();
    const edited = S.instr.sections.flatMap((s) => s.items).filter((x) => x.edited).length;
    const removed = S.instr.sections.flatMap((s) => s.items).filter((x) => x.removed).length;
    log(`утверждено методистом (правок: ${edited}, удалено пунктов: ${removed})`);
    S.approvedSections = ap.sections;
    S.stage = 'approved'; renderInstr(); setStage('approved');
    $('#approve').disabled = true;
    try {
      status('1/3 Составляю тест из утверждённого текста…');
      const b = await api({ step: 'test', ...S.params, count: 8, instr: ap });
      S.test = b.result; S.audit.push(b.audit);
      status('2/3 Проверяю вопросы…');
      try {
        const v = await api({ step: 'verify', target: 'test', ...S.params, instr: ap, test: S.test });
        S.test.questions.forEach((q, i) => { const x = v.result.verdicts.find((y) => y.n === i + 1); q.check = x ? { verdict: x.verdict, note: x.note } : null; });
        S.audit.push(v.audit);
      } catch {}
      renderTest();
      status('3/3 Пишу сценарий видео-инструктажа…');
      const c = await api({ step: 'video', ...S.params, instr: ap });
      S.video = c.result; S.audit.push(c.audit);
      log('тест и сценарий видео из утверждённой версии');
      S.stage = 'published';
      renderAll();
      status('');
    } catch (err) { status(err.message, true); }
    finally { $('#approve').disabled = false; renderAudit(); health(); }
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- События ----------
  $('#form').addEventListener('submit', generate);
  $('#form').kind.addEventListener('change', toggleReason);
  document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => loadSample(c.dataset.sample)));
  $('#approve').addEventListener('click', approve);
  $('#instrBody').addEventListener('click', (e) => {
    const b = e.target.closest('.del'); if (!b) return;
    const el = b.closest('.item');
    const it = S.instr.sections[el.dataset.s].items[el.dataset.i];
    it.text = el.querySelector('.txt').textContent.trim();
    it.removed = !it.removed; renderInstr();
  });
  $('#showAns').addEventListener('change', (e) => $('#testBody').classList.toggle('hideAns', !e.target.checked));
  $('#dlTest').addEventListener('click', () => download('test.json', JSON.stringify({ title: S.instr.title, lang: S.params.lang, questions: S.test.questions }, null, 2), 'application/json'));
  $('#dlScript').addEventListener('click', () => download('video-script.json', JSON.stringify(S.video, null, 2), 'application/json'));
  $('#dlSrt').addEventListener('click', async () => {
    if (S.videoFile) { const t = await (await fetch(S.videoFile.replace('.mp4', '.srt'))).text(); download('instruktazh.srt', t, 'text/plain'); }
    else download('instruktazh.srt', srtFromScript(), 'text/plain');
  });
  $('#kbLink').addEventListener('click', (e) => {
    e.preventDefault();
    const el = $('#kbBody');
    if (!el.innerHTML) {
      el.className = 'kb';
      el.innerHTML = `<p class="muted">Пункты сверены с adilet.zan.kz ${esc(KB.checked)}. Тексты сокращены, близко к оригиналу.</p>` + Object.entries(KB.acts).map(([k, a]) => `<div class="act"><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.ru)}</a> <span class="muted">— ${esc(a.edition)}</span></div>` + KB.items.filter((i) => i.act === k).map((i) => `<div class="it"><code>${esc(i.id)}</code> ${esc(i.point)}: ${esc(i.text)}</div>`).join('')).join('');
    } else el.classList.toggle('hidden');
  });

  (async () => {
    KB = await (await fetch('kb.json')).json();
    try { NOTES = await (await fetch('samples/notes.json')).json(); } catch {}
    toggleReason();
    health();
    const q = new URLSearchParams(location.search).get('demo');
    if (q && /^[\w-]+$/.test(q)) loadSample(q).catch(() => status('Пример не найден.', true));
  })();
})();
