(() => {
  'use strict';

  const TESTS = ['reaction', 'aim', 'cps', 'memory'];

  // Rough points curve per test: [result, points]. Lower is better for reaction and aim.
  const CURVES = {
    reaction: [[500, 0], [380, 20], [320, 40], [280, 55], [250, 70], [225, 82], [200, 92], [180, 100]],
    aim: [[1000, 0], [800, 20], [650, 40], [560, 55], [490, 70], [430, 82], [380, 92], [340, 100]],
    cps: [[3, 0], [5, 20], [6.5, 40], [7.5, 55], [8.5, 70], [10, 82], [12, 92], [14, 100]],
    memory: [[2, 0], [4, 20], [6, 40], [8, 55], [10, 70], [12, 82], [14, 92], [17, 100]],
  };
  const LOWER_IS_BETTER = { reaction: true, aim: true, cps: false, memory: false };
  const TIER_MIN = [0, 15, 30, 45, 60, 72, 84, 93];

  const REACTION_TRIES = 5;
  const MIN_REACTION_MS = 100;
  const AIM_TARGETS = 20;
  const AIM_MISS_MS = 100;
  const CPS_MS = 5000;

  const I18N = {
    en: {
      title: 'GameMetric: how fast is your gamer brain?',
      description: 'Four quick browser tests: reaction time, aim, clicks per second and memory. Get a game-style rank and challenge friends with a link.',
      h1: 'How fast is your gamer brain?',
      sub: 'Four quick tests: reaction, aim, clicking, memory. Two minutes, then a rank and a card to send friends.',
      start: 'Play all four',
      'reaction.name': 'Reaction',
      'reaction.desc': 'Click the moment the screen turns green.',
      'aim.name': 'Aim',
      'aim.desc': 'Hit 20 targets as fast as you can.',
      'cps.name': 'Clicks',
      'cps.desc': 'How many clicks per second you get in 5 seconds.',
      'memory.name': 'Memory',
      'memory.desc': 'Repeat the pattern. It grows by one square every round.',
      best: 'Best: {v}',
      noBest: 'Not played yet',
      'ranks.title': 'Ranks',
      'ranks.text': 'Thresholds are rough, based on typical results from public browser tests. Screens and mice add their own delay, so the fairest fight is on the same device.',
      lastRun: 'Your last run: {tier}, {score}/1000',
      'footer.privacy': 'Nothing is sent anywhere. Results live in your browser and in the link you share.',
      'footer.source': 'Source code',
      friend: 'A friend',
      challenge: '{name} got {tier} with {score}/1000. Your turn.',
      step: '{i} of {n}',
      quit: 'Quit',
      soundOn: 'Sound on',
      soundOff: 'Sound off',
      ms: 'ms',
      'reaction.ready': 'Click to start',
      'reaction.readyHint': 'Wait for green, then click as fast as you can. Space works too.',
      'reaction.wait': 'Wait for green',
      'reaction.go': 'Click!',
      'reaction.early': 'Too soon',
      'reaction.again': 'Click to try that one again.',
      'reaction.next': 'Click to keep going.',
      'reaction.attempt': 'Attempt {n} of {total}',
      'reaction.so': 'Attempt {n} of {total}. So far: {list}',
      'aim.start': 'Hit the target to start',
      'aim.hint': '{n} targets. Each miss adds 0.1 s.',
      'aim.left': 'Targets left: {n}. Misses: {m}.',
      'cps.start': 'Click here',
      'cps.hint': 'The 5 second timer starts with your first click.',
      'cps.left': '{s} s left',
      'memory.intro': 'Squares light up one by one. Repeat them in the same order.',
      'memory.start': 'Start',
      'memory.watch': 'Level {n}: watch',
      'memory.turn': 'Level {n}: your turn',
      'memory.good': 'Level {n}: correct',
      'memory.wrong': 'Wrong square',
      'reaction.label': 'Average reaction',
      'aim.label': 'Time per target',
      'cps.label': 'Clicks per second',
      'memory.label': 'Levels cleared',
      misses: 'Misses: {m}',
      newBest: 'New personal best',
      next: 'Next: {name}',
      retry: 'Retry',
      seeRank: 'See my rank',
      allTests: 'All tests',
      'final.label': 'Your rank',
      'final.nick': 'Name on the card (optional)',
      versus: '{name} vs you: {them}:{you}',
      youWin: 'You win',
      theyWin: 'Winner: {name}',
      draw: 'Draw',
      share: 'Share',
      copy: 'Copy link',
      copied: 'Link copied',
      copyFailed: 'Could not copy. The link is in the address bar now.',
      save: 'Save image',
      saved: 'Image saved',
      again: 'Play again',
      shareText: 'My GameMetric rank: {tier}, {score}/1000. Can you beat it?',
      cardCta: 'Beat it at gamemetric.dev',
      tiers: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'],
    },
    ru: {
      title: 'GameMetric: какой из тебя геймер?',
      description: 'Четыре коротких теста в браузере: реакция, прицел, клики в секунду и память. Получи ранг как в игре и брось вызов друзьям ссылкой.',
      h1: 'Какой из тебя геймер?',
      sub: 'Четыре коротких теста: реакция, прицел, клики, память. Две минуты, потом ранг и карточка для друзей.',
      start: 'Пройти все 4',
      'reaction.name': 'Реакция',
      'reaction.desc': 'Жми, как только экран станет зелёным.',
      'aim.name': 'Прицел',
      'aim.desc': 'Сбей 20 целей как можно быстрее.',
      'cps.name': 'Клики',
      'cps.desc': 'Сколько кликов в секунду ты выдашь за 5 секунд.',
      'memory.name': 'Память',
      'memory.desc': 'Повтори последовательность. Каждый раунд она длиннее на один квадрат.',
      best: 'Рекорд: {v}',
      noBest: 'Ещё не пройден',
      'ranks.title': 'Ранги',
      'ranks.text': 'Пороги примерные, по типичным результатам открытых браузерных тестов. Монитор и мышь добавляют свою задержку, так что честнее всего мериться на одном устройстве.',
      lastRun: 'Последний забег: {tier}, {score}/1000',
      'footer.privacy': 'Ничего никуда не отправляется. Результаты живут в твоём браузере и в ссылке, которой ты поделишься.',
      'footer.source': 'Исходный код',
      friend: 'Друг',
      challenge: '{name}: {tier}, {score}/1000. Твоя очередь.',
      step: '{i} из {n}',
      quit: 'Выйти',
      soundOn: 'Звук вкл',
      soundOff: 'Звук выкл',
      ms: 'мс',
      'reaction.ready': 'Нажми, чтобы начать',
      'reaction.readyHint': 'Дождись зелёного и жми как можно быстрее. Пробел тоже работает.',
      'reaction.wait': 'Жди зелёного',
      'reaction.go': 'Жми!',
      'reaction.early': 'Рано',
      'reaction.again': 'Нажми, чтобы повторить попытку.',
      'reaction.next': 'Нажми, чтобы продолжить.',
      'reaction.attempt': 'Попытка {n} из {total}',
      'reaction.so': 'Попытка {n} из {total}. Пока: {list}',
      'aim.start': 'Попади в цель, чтобы начать',
      'aim.hint': 'Целей: {n}. Каждый промах добавляет 0,1 с.',
      'aim.left': 'Осталось целей: {n}. Промахов: {m}.',
      'cps.start': 'Кликай сюда',
      'cps.hint': 'Таймер на 5 секунд пойдёт с первого клика.',
      'cps.left': 'Осталось {s} с',
      'memory.intro': 'Квадраты загораются по очереди. Повтори их в том же порядке.',
      'memory.start': 'Старт',
      'memory.watch': 'Уровень {n}: смотри',
      'memory.turn': 'Уровень {n}: твой ход',
      'memory.good': 'Уровень {n}: верно',
      'memory.wrong': 'Не тот квадрат',
      'reaction.label': 'Средняя реакция',
      'aim.label': 'Время на цель',
      'cps.label': 'Кликов в секунду',
      'memory.label': 'Пройдено уровней',
      misses: 'Промахов: {m}',
      newBest: 'Новый личный рекорд',
      next: 'Дальше: {name}',
      retry: 'Ещё раз',
      seeRank: 'Мой ранг',
      allTests: 'Все тесты',
      'final.label': 'Твой ранг',
      'final.nick': 'Имя на карточке (необязательно)',
      versus: '{name} vs ты: {them}:{you}',
      youWin: 'Победа за тобой',
      theyWin: 'Победитель: {name}',
      draw: 'Ничья',
      share: 'Поделиться',
      copy: 'Скопировать ссылку',
      copied: 'Ссылка скопирована',
      copyFailed: 'Не получилось скопировать. Ссылка теперь в адресной строке.',
      save: 'Сохранить картинку',
      saved: 'Картинка сохранена',
      again: 'Сыграть ещё',
      shareText: 'Мой ранг в GameMetric: {tier}, {score}/1000. Сможешь лучше?',
      cardCta: 'Побей на gamemetric.dev',
      tiers: ['Железо', 'Бронза', 'Серебро', 'Золото', 'Платина', 'Алмаз', 'Мастер', 'Грандмастер'],
    },
  };

  // ---------- small helpers ----------

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
    },
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let lang = 'en';
  function t(key, vars) {
    let s = (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }
  const tierName = (i) => I18N[lang].tiers[i];
  const testName = (test) => t(test + '.name');

  function points(test, value) {
    const curve = CURVES[test];
    const lower = LOWER_IS_BETTER[test];
    const atLeast = (a, b) => (lower ? a <= b : a >= b);
    if (!atLeast(value, curve[0][0])) return 0;
    for (let i = 0; i < curve.length - 1; i++) {
      const [x0, p0] = curve[i];
      const [x1, p1] = curve[i + 1];
      if (atLeast(value, x0) && !atLeast(value, x1)) return p0 + ((p1 - p0) * (value - x0)) / (x1 - x0);
    }
    return 100;
  }
  function tierOf(p) {
    let tier = 0;
    TIER_MIN.forEach((min, i) => { if (p >= min) tier = i; });
    return tier;
  }
  function summary(results) {
    const pts = TESTS.map((test) => points(test, results[test]));
    const avg = pts.reduce((a, b) => a + b, 0) / pts.length;
    return { score: Math.round(avg * 10), tier: tierOf(avg) };
  }
  function formatValue(test, value) {
    if (test === 'cps') return value.toFixed(1);
    if (test === 'memory') return String(value);
    return value + ' ' + t('ms');
  }
  function isBetter(test, a, b) {
    if (b == null) return true;
    return LOWER_IS_BETTER[test] ? a < b : a > b;
  }
  function pips(tier) {
    const box = el('span', 'pips');
    box.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 8; i++) box.append(el('i', i <= tier ? 'on' : ''));
    return box;
  }

  // ---------- share links: #c=1.<reaction>.<aim>.<cps*10>.<memory>.<name> ----------

  function encodeResults(results, name) {
    const parts = ['1', results.reaction, results.aim, Math.round(results.cps * 10), results.memory];
    return 'c=' + parts.join('.') + (name ? '.' + encodeURIComponent(name) : '');
  }
  function cleanName(raw) {
    return String(raw || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 16);
  }
  function decodeResults(hash) {
    const m = /^#?c=1\.(\d{3,4})\.(\d{2,4})\.(\d{1,3})\.(\d{1,2})(?:\.(.*))?$/.exec(hash);
    if (!m) return null;
    const results = { reaction: +m[1], aim: +m[2], cps: +m[3] / 10, memory: +m[4] };
    if (results.reaction < MIN_REACTION_MS || results.reaction > 3000) return null;
    if (results.aim < 50 || results.aim > 5000) return null;
    if (results.cps > 60 || results.memory > 60) return null;
    let name = '';
    if (m[5]) {
      try { name = cleanName(decodeURIComponent(m[5])); } catch { name = ''; }
    }
    return { results, name };
  }
  function shareUrl(results, name) {
    const base = location.protocol === 'file:' ? 'https://gamemetric.dev/' : location.origin + location.pathname;
    return base + '#' + encodeResults(results, name);
  }

  // ---------- sound (memory test only) ----------

  let audio = null;
  let soundOn = store.get('gm.sound', true);
  const NOTES = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0];
  function ensureAudio() {
    if (!soundOn) return null;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch {
      audio = null;
    }
    return audio;
  }
  function tone(freq, ms, type = 'sine') {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + ms / 1000 + 0.02);
  }

  // ---------- app state and views ----------

  const views = { home: $('#home'), play: $('#play'), final: $('#final') };
  const arena = $('#arena');
  const statusLine = $('#status');
  const state = {
    queue: [],
    index: 0,
    single: false,
    results: {},
    lastResult: null,
    challenge: decodeResults(location.hash),
    cleanup: null,
    view: 'home',
  };

  function show(view) {
    state.view = view;
    for (const [name, node] of Object.entries(views)) node.hidden = name !== view;
    document.body.classList.toggle('playing', view === 'play');
    window.scrollTo(0, 0);
  }
  function setStatus(text) { statusLine.textContent = text || ''; }
  function stopTest() {
    if (state.cleanup) state.cleanup();
    state.cleanup = null;
  }

  function goHome() {
    stopTest();
    renderHome();
    show('home');
  }
  function startRun() {
    state.queue = TESTS.slice();
    state.index = 0;
    state.single = false;
    state.results = {};
    playCurrent();
  }
  function startSingle(test) {
    state.queue = [test];
    state.index = 0;
    state.single = true;
    playCurrent();
  }

  function playCurrent() {
    stopTest();
    const test = state.queue[state.index];
    show('play');
    renderPlaybar();
    setStatus('');
    arena.replaceChildren();
    arena.removeAttribute('data-phase');
    state.cleanup = RUNNERS[test]((value, extra) => finishTest(test, value, extra));
    arena.focus({ preventScroll: true });
  }

  function renderPlaybar() {
    const test = state.queue[state.index];
    if (!test) return;
    $('#playTitle').textContent = testName(test);
    $('#playStep').textContent = state.single ? '' : t('step', { i: state.index + 1, n: state.queue.length });
    $('#quit').setAttribute('aria-label', t('quit'));
    const sound = $('#soundToggle');
    sound.hidden = test !== 'memory';
    sound.textContent = soundOn ? t('soundOn') : t('soundOff');
    sound.setAttribute('aria-pressed', String(soundOn));
  }

  function finishTest(test, value, extra) {
    stopTest();
    state.results[test] = value;
    const best = store.get('gm.best', {});
    const newBest = isBetter(test, value, best[test]);
    if (newBest) {
      best[test] = value;
      store.set('gm.best', best);
    }
    state.lastResult = { test, value, extra, newBest };
    renderResult();
  }

  function renderResult() {
    const { test, value, extra, newBest } = state.lastResult;
    const tier = tierOf(points(test, value));
    arena.className = 'arena';
    arena.removeAttribute('data-phase');
    setStatus('');

    const box = el('div', 'result');
    box.append(el('p', 'result-label', t(test + '.label')));
    const big = el('p', 'result-value', test === 'cps' ? value.toFixed(1) : String(value));
    if (test === 'reaction' || test === 'aim') big.append(el('span', '', t('ms')));
    box.append(big, el('p', 'result-tier', tierName(tier)), pips(tier));
    if (extra && extra.misses != null) box.append(el('p', 'result-extra', t('misses', { m: extra.misses })));
    if (newBest) box.append(el('p', 'result-best', t('newBest')));

    const row = el('div', 'btn-row');
    const primary = el('button', 'btn primary');
    const secondary = el('button', 'btn');
    primary.type = secondary.type = 'button';
    if (state.single) {
      primary.textContent = t('retry');
      primary.onclick = playCurrent;
      secondary.textContent = t('allTests');
      secondary.onclick = goHome;
    } else {
      const last = state.index === state.queue.length - 1;
      primary.textContent = last ? t('seeRank') : t('next', { name: testName(state.queue[state.index + 1]) });
      primary.onclick = () => {
        if (last) showFinal();
        else { state.index++; playCurrent(); }
      };
      secondary.textContent = t('retry');
      secondary.onclick = playCurrent;
    }
    // A fast click at the very end of a test should not land on the next button.
    primary.disabled = secondary.disabled = true;
    setTimeout(() => { primary.disabled = secondary.disabled = false; primary.focus({ preventScroll: true }); }, 550);
    row.append(primary, secondary);
    box.append(row);
    arena.replaceChildren(box);
  }

  // ---------- the four tests ----------
  // Each runner draws into the arena, calls done(value) once, and returns a cleanup function.

  function listen(signal) {
    return (target, type, fn, opts) => target.addEventListener(type, fn, { ...opts, signal });
  }
  function eventTime(e) {
    const now = performance.now();
    return e && e.timeStamp && Math.abs(now - e.timeStamp) < 1000 ? e.timeStamp : now;
  }

  function runReaction(done) {
    const ac = new AbortController();
    const on = listen(ac.signal);
    const times = [];
    let phase = 'idle';
    let timer = 0;
    let t0 = 0;

    arena.className = 'arena arena-reaction';
    const msg = el('div', 'arena-msg');
    const big = el('p', 'arena-big');
    const small = el('p', 'arena-small');
    msg.append(big, small);
    arena.replaceChildren(msg);

    function set(next, bigText, smallText) {
      phase = next;
      arena.dataset.phase = next;
      big.textContent = bigText;
      small.textContent = smallText || '';
    }
    function progress() {
      const n = Math.min(times.length + 1, REACTION_TRIES);
      setStatus(times.length
        ? t('reaction.so', { n, total: REACTION_TRIES, list: times.join(', ') })
        : t('reaction.attempt', { n, total: REACTION_TRIES }));
    }
    function wait() {
      set('wait', t('reaction.wait'));
      timer = setTimeout(() => {
        if (phase !== 'wait') return;
        set('go', t('reaction.go'));
        t0 = performance.now();
        // The green actually shows on the next frame, so start the clock there when we can.
        requestAnimationFrame(() => {
          if (phase === 'go') t0 = Math.max(t0, performance.now());
        });
      }, 1300 + Math.random() * 2700);
    }
    function press(e) {
      if (phase === 'wait') {
        clearTimeout(timer);
        set('early', t('reaction.early'), t('reaction.again'));
        return;
      }
      if (phase === 'go') {
        const ms = Math.round(eventTime(e) - t0);
        // Nobody reacts to a visual signal this fast: it was a guess that got lucky.
        if (ms < MIN_REACTION_MS) {
          set('early', t('reaction.early'), t('reaction.again'));
          return;
        }
        times.push(ms);
        if (times.length === REACTION_TRIES) {
          done(Math.round(times.reduce((a, b) => a + b, 0) / times.length));
          return;
        }
        set('shown', ms + ' ' + t('ms'), t('reaction.next'));
        progress();
        return;
      }
      wait();
    }

    on(arena, 'pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      press(e);
    });
    on(document, 'keydown', (e) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (e.target.closest && e.target.closest('button, input, a')) return;
      e.preventDefault();
      if (!e.repeat) press(e);
    });
    on(document, 'visibilitychange', () => {
      if (document.hidden && (phase === 'wait' || phase === 'go')) {
        clearTimeout(timer);
        set('early', t('reaction.ready'), t('reaction.readyHint'));
      }
    });

    set('idle', t('reaction.ready'), t('reaction.readyHint'));
    progress();
    return () => { clearTimeout(timer); ac.abort(); };
  }

  function runAim(done) {
    const ac = new AbortController();
    const on = listen(ac.signal);
    const SIZE = 56;
    let started = false;
    let hits = 0;
    let misses = 0;
    let tStart = 0;
    let last = null;

    arena.className = 'arena arena-aim';
    const hint = el('div', 'arena-msg');
    hint.append(el('p', 'arena-big', t('aim.start')), el('p', 'arena-small', t('aim.hint', { n: AIM_TARGETS })));
    hint.style.alignSelf = 'start';
    const target = el('button', 'target');
    target.type = 'button';
    target.setAttribute('aria-label', 'target');
    arena.replaceChildren(hint, target);

    function moveTo(x, y) {
      target.style.transform = '';
      target.style.left = x + 'px';
      target.style.top = y + 'px';
      last = { x, y };
      if (!reducedMotion) {
        target.classList.remove('pop');
        void target.offsetWidth;
        target.classList.add('pop');
      }
    }
    function center() {
      moveTo((arena.clientWidth - SIZE) / 2, (arena.clientHeight - SIZE) / 2 + 30);
    }
    function place() {
      const pad = 8;
      const w = arena.clientWidth - SIZE - pad * 2;
      const h = arena.clientHeight - SIZE - pad * 2;
      let x = 0;
      let y = 0;
      for (let tries = 0; tries < 12; tries++) {
        x = pad + Math.random() * w;
        y = pad + Math.random() * h;
        if (!last || Math.hypot(x - last.x, y - last.y) > SIZE * 2) break;
      }
      moveTo(x, y);
    }
    function progress() {
      setStatus(t('aim.left', { n: AIM_TARGETS - hits, m: misses }));
    }

    on(target, 'pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      if (!started) {
        started = true;
        tStart = eventTime(e);
        hint.remove();
        place();
        progress();
        return;
      }
      hits++;
      if (hits === AIM_TARGETS) {
        const total = eventTime(e) - tStart + misses * AIM_MISS_MS;
        done(Math.round(total / AIM_TARGETS), { misses });
        return;
      }
      place();
      progress();
    });
    on(arena, 'pointerdown', (e) => {
      if (!started || e.button !== 0) return;
      e.preventDefault();
      misses++;
      const rect = arena.getBoundingClientRect();
      const mark = el('span', 'miss');
      mark.style.left = e.clientX - rect.left + 'px';
      mark.style.top = e.clientY - rect.top + 'px';
      mark.addEventListener('animationend', () => mark.remove());
      arena.append(mark);
      progress();
    });

    center();
    setStatus(t('aim.hint', { n: AIM_TARGETS }));
    return () => ac.abort();
  }

  function runCps(done) {
    const ac = new AbortController();
    const on = listen(ac.signal);
    let count = 0;
    let tStart = 0;
    let ticker = 0;
    let endTimer = 0;
    let over = false;

    arena.className = 'arena arena-cps';
    const msg = el('div', 'arena-msg');
    const big = el('p', 'cps-count', '0');
    const small = el('p', 'arena-small', t('cps.hint'));
    msg.append(el('p', 'arena-big', t('cps.start')), big, small);
    arena.replaceChildren(msg);

    function tick() {
      const left = Math.max(0, CPS_MS - (performance.now() - tStart));
      setStatus(t('cps.left', { s: (left / 1000).toFixed(1) }));
    }
    function finish() {
      over = true;
      clearInterval(ticker);
      done(Math.round((count / (CPS_MS / 1000)) * 10) / 10);
    }

    on(arena, 'pointerdown', (e) => {
      if (over || e.button !== 0) return;
      e.preventDefault();
      const now = performance.now();
      if (!tStart) {
        tStart = now;
        msg.firstChild.remove();
        small.remove();
        ticker = setInterval(tick, 100);
        endTimer = setTimeout(finish, CPS_MS);
      } else if (now - tStart > CPS_MS) {
        return;
      }
      count++;
      big.textContent = String(count);
      if (!reducedMotion) {
        const rect = arena.getBoundingClientRect();
        const ring = el('span', 'ripple');
        ring.style.left = e.clientX - rect.left + 'px';
        ring.style.top = e.clientY - rect.top + 'px';
        ring.addEventListener('animationend', () => ring.remove());
        arena.append(ring);
      }
    });

    setStatus(t('cps.left', { s: (CPS_MS / 1000).toFixed(1) }));
    return () => { clearInterval(ticker); clearTimeout(endTimer); ac.abort(); };
  }

  function runMemory(done) {
    const ac = new AbortController();
    const on = listen(ac.signal);
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const seq = [];
    let level = 0;
    let pos = 0;
    let accepting = false;

    arena.className = 'arena arena-memory';
    const wrap = el('div', 'mem-wrap');
    const grid = el('div', 'mem-grid watching');
    const tiles = [];
    for (let i = 0; i < 9; i++) {
      const b = el('button');
      b.type = 'button';
      b.setAttribute('aria-label', String(i + 1));
      tiles.push(b);
      grid.append(b);
    }
    const intro = el('p', 'arena-small', t('memory.intro'));
    const startBtn = el('button', 'btn primary', t('memory.start'));
    startBtn.type = 'button';
    wrap.append(grid, intro, startBtn);
    arena.replaceChildren(wrap);

    function light(i, ms) {
      const b = tiles[i];
      b.classList.add('lit');
      tone(NOTES[i], Math.min(ms, 320));
      later(() => b.classList.remove('lit'), ms);
    }
    function nextLevel() {
      level++;
      seq.push(Math.floor(Math.random() * 9));
      pos = 0;
      accepting = false;
      grid.classList.add('watching');
      setStatus(t('memory.watch', { n: level }));
      const litMs = Math.max(260, 420 - level * 10);
      const gap = Math.max(120, 180 - level * 4);
      let at = 650;
      for (const i of seq) {
        later(() => light(i, litMs), at);
        at += litMs + gap;
      }
      later(() => {
        accepting = true;
        grid.classList.remove('watching');
        setStatus(t('memory.turn', { n: level }));
      }, at);
    }

    on(startBtn, 'click', () => {
      ensureAudio();
      intro.remove();
      startBtn.remove();
      nextLevel();
    });
    tiles.forEach((b, i) => {
      on(b, 'click', () => {
        if (!accepting) return;
        if (i !== seq[pos]) {
          accepting = false;
          grid.classList.add('wrong');
          tone(110, 380, 'square');
          setStatus(t('memory.wrong'));
          later(() => done(level - 1), 950);
          return;
        }
        light(i, 180);
        pos++;
        if (pos === seq.length) {
          accepting = false;
          setStatus(t('memory.good', { n: level }));
          later(nextLevel, 700);
        }
      });
    });

    setStatus('');
    later(() => startBtn.focus({ preventScroll: true }), 50);
    return () => { timers.forEach(clearTimeout); ac.abort(); };
  }

  const RUNNERS = { reaction: runReaction, aim: runAim, cps: runCps, memory: runMemory };

  // ---------- final card ----------

  function showFinal() {
    stopTest();
    const sum = summary(state.results);
    store.set('gm.last', { results: state.results, ...sum });
    show('final');
    $('#nick').value = store.get('gm.nick', '');
    $('#shareNote').textContent = '';
    renderCard();
  }

  function currentName() { return cleanName($('#nick').value); }

  function renderCard() {
    const results = state.results;
    const { score, tier } = summary(results);
    const card = $('#card');
    const name = currentName();
    const rival = state.challenge;

    const top = el('div', 'card-top');
    const brand = el('span', 'brand');
    brand.append(el('span', 'mark'), document.createTextNode('GameMetric'));
    top.append(brand, el('span', 'card-name', name));

    const scoreLine = el('p', 'card-score');
    scoreLine.append(el('b', '', String(score)), document.createTextNode(' / 1000'));

    const stats = el('dl', 'card-stats');
    let wins = 0;
    let losses = 0;
    for (const test of TESTS) {
      const value = results[test];
      const row = el('div');
      const dd = el('dd');
      dd.append(el('span', 'v', formatValue(test, value)), el('span', 't', tierName(tierOf(points(test, value)))));
      if (rival) {
        const theirs = rival.results[test];
        if (isBetter(test, value, theirs) && value !== theirs) { wins++; row.className = 'win'; }
        else if (value !== theirs) losses++;
        dd.append(el('span', 'vs', 'vs ' + formatValue(test, theirs)));
      }
      row.append(el('dt', '', testName(test)), dd);
      stats.append(row);
    }

    card.replaceChildren(top, el('p', 'card-label', t('final.label')), el('p', 'card-tier', tierName(tier)), scoreLine, pips(tier), stats);
    if (rival) {
      const rivalName = rival.name || t('friend');
      const verdict = wins > losses ? t('youWin') : losses > wins ? t('theyWin', { name: rivalName }) : t('draw');
      card.append(el('p', 'card-vs', t('versus', { name: rivalName, them: losses, you: wins }) + '. ' + verdict));
    }
  }

  function drawCard() {
    const results = state.results;
    const { score, tier } = summary(results);
    const name = currentName();
    const W = 1200;
    const H = 630;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const c = canvas.getContext('2d');
    const SANS = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
    const MONO = '"Cascadia Mono", "SF Mono", Consolas, ui-monospace, monospace';
    const ACCENT = '#c2ec5a';

    c.fillStyle = '#0f1011';
    c.fillRect(0, 0, W, H);
    c.fillStyle = ACCENT;
    c.fillRect(0, 0, 14, H);

    c.textBaseline = 'alphabetic';
    c.fillStyle = ACCENT;
    roundRect(c, 72, 66, 26, 26, 6);
    c.fill();
    c.fillStyle = '#ecedee';
    c.font = '800 36px ' + SANS;
    c.fillText('GameMetric', 112, 92);

    if (name) {
      c.textAlign = 'right';
      c.fillStyle = '#9ba0a6';
      c.font = '700 34px ' + SANS;
      c.fillText(name, W - 72, 92);
      c.textAlign = 'left';
    }

    c.fillStyle = '#9ba0a6';
    c.font = '600 28px ' + SANS;
    c.fillText(t('final.label'), 72, 196);

    c.fillStyle = ACCENT;
    let size = 108;
    c.font = `800 ${size}px ${SANS}`;
    while (c.measureText(tierName(tier)).width > 540 && size > 50) {
      size -= 4;
      c.font = `800 ${size}px ${SANS}`;
    }
    c.fillText(tierName(tier), 68, 300);

    c.fillStyle = '#ecedee';
    c.font = '700 44px ' + MONO;
    c.fillText(String(score), 72, 372);
    const sw = c.measureText(String(score)).width;
    c.fillStyle = '#9ba0a6';
    c.font = '500 30px ' + MONO;
    c.fillText(' / 1000', 72 + sw, 372);

    for (let i = 0; i < 8; i++) {
      c.fillStyle = i <= tier ? ACCENT : '#2c2f33';
      roundRect(c, 72 + i * 44, 408, 34, 34, 7);
      c.fill();
    }

    c.fillStyle = '#9ba0a6';
    c.font = '600 28px ' + SANS;
    c.fillText(t('cardCta'), 72, 560);

    const colX = 690;
    TESTS.forEach((test, i) => {
      const y = 182 + i * 106;
      const value = results[test];
      c.fillStyle = '#2c2f33';
      c.fillRect(colX, y - 54, W - 72 - colX, 1);
      c.fillStyle = '#9ba0a6';
      c.font = '600 26px ' + SANS;
      c.fillText(testName(test), colX, y - 10);
      c.fillStyle = ACCENT;
      c.font = '600 24px ' + SANS;
      c.fillText(tierName(tierOf(points(test, value))), colX, y + 26);
      c.textAlign = 'right';
      c.fillStyle = '#ecedee';
      c.font = '700 46px ' + MONO;
      c.fillText(formatValue(test, value), W - 72, y + 18);
      c.textAlign = 'left';
    });
    return canvas;
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function cardBlob() {
    return new Promise((resolve) => drawCard().toBlob(resolve, 'image/png'));
  }

  function note(text) { $('#shareNote').textContent = text; }

  async function copyLink() {
    const url = shareUrl(state.results, currentName());
    try {
      await navigator.clipboard.writeText(url);
      note(t('copied'));
    } catch {
      const area = el('textarea');
      area.value = url;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      area.remove();
      if (ok) note(t('copied'));
      else {
        history.replaceState(null, '', url);
        note(t('copyFailed'));
      }
    }
  }

  async function shareCard() {
    const { score, tier } = summary(state.results);
    const url = shareUrl(state.results, currentName());
    const text = t('shareText', { tier: tierName(tier), score });
    if (navigator.share) {
      try {
        const blob = await cardBlob();
        const file = blob && new File([blob], 'gamemetric.png', { type: 'image/png' });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'GameMetric', text: text + ' ' + url });
        } else {
          await navigator.share({ title: 'GameMetric', text, url });
        }
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    copyLink();
  }

  async function saveImage() {
    const blob = await cardBlob();
    if (!blob) return;
    const a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gamemetric-' + summary(state.results).score + '.png';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    note(t('saved'));
  }

  // ---------- home ----------

  function renderHome() {
    const best = store.get('gm.best', {});
    document.querySelectorAll('[data-best]').forEach((node) => {
      const test = node.dataset.best;
      node.textContent = best[test] != null ? t('best', { v: formatValue(test, best[test]) }) : t('noBest');
    });

    const last = store.get('gm.last', null);
    const lastTier = last && Number.isInteger(last.tier) ? last.tier : -1;
    const list = $('#tierList');
    list.replaceChildren(...I18N[lang].tiers.map((name, i) => {
      const li = el('li');
      li.append(pips(i), document.createTextNode(name));
      if (i === lastTier) li.setAttribute('aria-current', 'true');
      return li;
    }));
    const lastRun = $('#lastRun');
    lastRun.hidden = lastTier < 0;
    if (lastTier >= 0) lastRun.textContent = t('lastRun', { tier: tierName(lastTier), score: last.score });

    const box = $('#challenge');
    const rival = state.challenge;
    box.hidden = !rival;
    if (rival) {
      const { score, tier } = summary(rival.results);
      $('#challengeText').textContent = t('challenge', { name: rival.name || t('friend'), tier: tierName(tier), score });
      $('#challengeStats').replaceChildren(...TESTS.map((test) => {
        const row = el('div');
        row.append(el('dt', '', testName(test)), el('dd', '', formatValue(test, rival.results[test])));
        return row;
      }));
    }
  }

  // ---------- language ----------

  function pickLang() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl && I18N[fromUrl]) return fromUrl;
    const saved = store.get('gm.lang', null);
    if (saved && I18N[saved]) return saved;
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return /^(ru|kk|ky|be|uz|tg)\b/i.test(nav) ? 'ru' : 'en';
  }

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = lang;
    document.title = t('title');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('description'));
    document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    renderHome();
    if (state.view === 'play') {
      renderPlaybar();
      if (!state.cleanup && state.lastResult) renderResult();
    }
    if (state.view === 'final') renderCard();
  }

  // ---------- wiring ----------

  $('#startRun').addEventListener('click', startRun);
  document.querySelectorAll('[data-test]').forEach((tile) => {
    tile.addEventListener('click', () => startSingle(tile.dataset.test));
  });
  $('#quit').addEventListener('click', goHome);
  $('#homeLink').addEventListener('click', (e) => {
    if (state.view === 'home') return;
    e.preventDefault();
    goHome();
  });
  $('#soundToggle').addEventListener('click', () => {
    soundOn = !soundOn;
    store.set('gm.sound', soundOn);
    renderPlaybar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.view === 'play') goHome();
  });
  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.addEventListener('click', () => {
      store.set('gm.lang', b.dataset.lang);
      applyLang(b.dataset.lang);
    });
  });
  $('#nick').addEventListener('input', () => {
    store.set('gm.nick', currentName());
    note('');
    renderCard();
  });
  $('#shareBtn').addEventListener('click', shareCard);
  $('#copyBtn').addEventListener('click', copyLink);
  $('#saveBtn').addEventListener('click', saveImage);
  $('#againBtn').addEventListener('click', goHome);
  window.addEventListener('hashchange', () => {
    const next = decodeResults(location.hash);
    if (next) {
      state.challenge = next;
      if (state.view === 'home') renderHome();
    }
  });

  applyLang(pickLang());
  show('home');
})();
