// «Табун» — запуск, цикл, меню, ввод, итоги.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { level, Run, DT, autoTarget, HALF, reward, herdShape, opText } from './logic.js';
import { World } from './world.js';
import { loadHorse, loadWolf, HERD_SETS, COATS } from './horses.js';
import { initAudio, sfx, hooves, setSound } from './audio.js';
import { t, detectLang, setLang, getLang } from './i18n.js';
import * as S from './save.js';

const $ = (id) => document.getElementById(id);
const P = new URLSearchParams(location.search);
const AUTO = P.has('auto');
const PORTAL = window.top !== window.self || P.has('portal');
if (P.has('shot')) document.documentElement.classList.add('shot');
detectLang();

let save = S.load();
if (P.has('level')) save.lvl = Math.max(1, Number(P.get('level')) || 1);
let world = null, run = null, L = null;
let state = 'loading';  // loading | menu | play | result | pause
let targetX = 0;
let drag = null;
const keys = {};
let timeScale = 1, slowT = 0;
let acc = 0;
let peak = 0;
let lastT = 0;
let dragHintOn = false;
let resultIn = 0;       // через сколько секунд игры показать итоги (0 — не ждём)
let shownHints = {};
try { shownHints = JSON.parse(localStorage.getItem('tabun.hints') || '{}'); } catch { /* нет доступа */ }

// —— загрузка ——
function setLoad(p) { $('loadBar').firstElementChild.style.width = Math.round(p * 100) + '%'; }

async function boot() {
  $('loadT').textContent = t('title').toUpperCase();
  $('loadS').textContent = t('loading');
  document.title = getLang() === 'ru' ? 'Табун — веди табун через степь | GameMetric' : 'Tabun: Steppe Stampede — lead the herd | GameMetric';
  const gl2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();
  if (!gl2) { $('loadS').textContent = t('nogl'); return; }
  setLoad(0.05);
  const loader = new GLTFLoader();
  let done = 0;
  const tick = () => setLoad(0.1 + (++done / 5) * 0.85);
  const [horse, rock, bush, wolf] = await Promise.all([
    loadHorse('models/horse.glb').then((h) => { tick(); return h; }),
    loader.loadAsync('models/rock.glb').then((g) => { tick(); return g; }),
    loader.loadAsync('models/bush.glb').then((g) => { tick(); return g; }),
    loadWolf('models/wolf.glb').then((w) => { tick(); return w; }),
    document.fonts.load("400 40px 'Russo One'").then(tick, tick),
  ]);
  const norm = (scene, base) => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    scene.position.set(-c.x, base ? -box.min.y : -c.y, -c.z);
    const g = new THREE.Group();
    g.add(scene);
    g.updateMatrixWorld(true);
    return { g, size };
  };
  const r = norm(rock.scene, false), b = norm(bush.scene, true);
  const assets = { horse, rock: r.g, rockScale: 1 / Math.max(r.size.x, r.size.y, r.size.z), bush: b.g, bushScale: 1.1 / b.size.y, wolf };
  world = new World($('gl'), assets);
  // телефон может отобрать WebGL при сворачивании — не даём экрану остаться чёрным
  $('gl').addEventListener('webglcontextlost', (e) => { e.preventDefault(); pause(); });
  $('gl').addEventListener('webglcontextrestored', () => location.reload());
  world.setHerdSet(save.set);
  setSound(save.sound);
  onResize();
  window.addEventListener('resize', onResize);
  bindInput();
  bindUI();
  $('loading').classList.add('out');
  setTimeout(() => $('loading').remove(), 500);
  // первый запуск — сразу в скачку, без меню
  if (save.played === 0 && !P.has('menu')) startLevel(); else showMenu();
  requestAnimationFrame(frame);
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  world?.resize(w, h);
}

// —— уровни ——
function prepare() {
  L = level(save.lvl);
  run = new Run(L, { start: S.startHerd(save), leader: S.leaderBonus(save) });
  for (const b of run.bodies) { b.x = run.cx + b.sx; b.d = run.d + b.sd; b.spawn = 1; }
  world.setLevel(L, run);
  world.setAul?.(S.yurts(save));
  targetX = 0;
  peak = run.count;
}

function startLevel() {
  if (state === 'play' || state === 'loading') return;
  initAudio();
  resultIn = 0;
  if (state !== 'menu' || !run) prepare();
  state = 'play';
  slowT = 0; timeScale = 1; acc = 0;
  mileIdx = 0;
  while (mileIdx < MILES.length && run.count >= MILES[mileIdx]) mileIdx++;
  hideAll();
  $('hud').classList.remove('hidden');
  $('progLvl').textContent = t('level') + ' ' + L.n;
  updateCoins();
  makeTags();
  if (save.lvl <= 2 && !AUTO) { dragHintOn = true; $('dragHint').classList.remove('hidden'); $('dragHint').querySelector('span').textContent = t('drag'); }
  if (save.lvl === 1) showHint('gate', 1.2);
  sfx('click');
}

function showMenu() {
  state = 'menu';
  prepare();
  hideAll();
  $('menu').classList.remove('hidden');
  $('logoT').textContent = t('title').toUpperCase();
  $('logoS').textContent = t('subtitle');
  $('allGames').textContent = '← ' + t('allGames');
  $('allGames').classList.toggle('hidden', PORTAL);
  $('lvlName').textContent = t('level') + ' ' + save.lvl;
  $('bossTag').textContent = t('boss');
  $('bossTag').classList.toggle('hidden', !L.boss);
  $('playBtn').textContent = t('play');
  $('coatsBtn').textContent = '🐎 ' + t('coats');
  $('aulInfo').textContent = t('aul', { n: S.yurts(save) });
  renderUps();
  updateCoins();
  clearLabels();
  const daily = S.dailyState(save);
  if (daily && save.played > 0) showDaily(daily);
}

function hideAll() {
  for (const id of ['menu', 'hud', 'result', 'modal']) $(id).classList.add('hidden');
  $('dragHint').classList.add('hidden');
  $('hint').classList.add('hidden');
}

// —— улучшения ——
const UP_ICONS = {
  herd: '<svg viewBox="0 0 40 40" class="ic"><circle cx="20" cy="20" r="19" fill="#ffd772"/><path d="M9 27c1-6 5-9 10-9l5-5 3 1-1 4c3 1 5 4 5 9h-3l-1-4-6 1-2 4h-3l1-5-4 1-1 3z" fill="#7a4a22"/></svg>',
  income: '<svg viewBox="0 0 40 40" class="ic"><circle cx="20" cy="20" r="19" fill="#bfe8a6"/><circle cx="20" cy="21" r="10" fill="#ffcf3a" stroke="#d98a10" stroke-width="2"/><text x="20" y="26" font-size="13" text-anchor="middle" fill="#8a4a00" font-family="Russo One">₸</text><path d="M28 9l4 4-4 4" stroke="#2fa847" stroke-width="3" fill="none"/></svg>',
  leader: '<svg viewBox="0 0 40 40" class="ic"><circle cx="20" cy="20" r="19" fill="#ffb3a8"/><path d="M11 15l4 4 5-7 5 7 4-4-2 12H13z" fill="#e0393e" stroke="#8f1418" stroke-width="1.5"/></svg>',
};
function renderUps() {
  const box = $('ups');
  box.innerHTML = '';
  for (const key of ['herd', 'income', 'leader']) {
    const lvl = save.up[key];
    const max = lvl >= S.UPS[key].max;
    const cost = S.upCost(key, lvl);
    const el = document.createElement('div');
    el.className = 'up' + (!max && save.coins < cost ? ' poor' : '');
    const name = key === 'herd' ? t('upHerd') : key === 'income' ? t('upIncome') : t('upLeader');
    const desc = key === 'herd' ? t('upHerdD') : key === 'income' ? t('upIncomeD') : t('upLeaderD', { n: 3 });
    el.innerHTML = `${UP_ICONS[key]}<div class="nm">${name}</div><div class="lv" title="${desc}">${t('lvl', { n: lvl + 1 })}</div><button class="buy">${max ? t('max') : `<span class="coin"></span>${cost}`}</button>`;
    el.querySelector('.buy').addEventListener('click', () => {
      if (max || save.coins < cost) { sfx('bad'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); return; }
      save.coins -= cost;
      save.up[key]++;
      S.store(save);
      sfx('coin');
      const keepRun = run;
      // табун на экране меню растёт сразу
      if (key === 'herd') {
        keepRun.count = S.startHerd(save);
        keepRun.sync();
        for (const h of keepRun.bodies) { if (h.spawn < 1) { h.x = keepRun.cx + h.sx; h.d = keepRun.d + h.sd; h.spawn = 1; } }
      }
      keepRun.leader = S.leaderBonus(save);
      world.setAul?.(S.yurts(save));
      $('aulInfo').textContent = t('aul', { n: S.yurts(save) });
      renderUps();
      updateCoins();
      const b = $('ups').children[['herd', 'income', 'leader'].indexOf(key)];
      b.classList.add('flash');
    });
    box.appendChild(el);
  }
}

function updateCoins() {
  for (const id of ['menuCoins', 'hudCoins']) $(id).querySelector('b').textContent = fmt(save.coins + (state === 'play' && run ? run.coins : 0));
}
const fmt = (n) => Math.round(n).toLocaleString(getLang() === 'ru' ? 'ru-RU' : 'en-US');

// —— окна ——
function modal(html, wide = false) {
  $('modalCard').innerHTML = html;
  $('modalCard').classList.toggle('wide', wide);
  $('modal').classList.remove('hidden');
}
function closeModal() { $('modal').classList.add('hidden'); }

function showDaily(d) {
  modal(`<h3 class="mtitle">${t('daily')}</h3><p>${t('dailyD', { n: d.streak })}</p><div class="daily"><span class="coin"></span>+${d.amount}</div><button class="big disp" id="dailyTake">${t('take')}</button>`);
  $('dailyTake').onclick = () => {
    save.coins += d.amount;
    save.daily = { last: S.dayKey(), streak: d.streak };
    S.store(save);
    sfx('chest');
    closeModal();
    updateCoins();
    renderUps();
    const c = $('menuCoins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  };
}

function showCoats() {
  const rows = Object.entries(S.SETS).map(([k, price]) => {
    const own = save.sets.includes(k), sel = save.set === k;
    const dots = HERD_SETS[k].slice(0, 5).map((c) => `<i style="background:${COATS[c]}"></i>`).join('');
    const btn = sel ? `<button class="on" disabled>${t('owned')}</button>` : own ? `<button data-k="${k}">${t('choose')}</button>` : `<button class="gold" data-k="${k}" ${save.coins < price ? 'disabled' : ''}><span class="coin" style="width:18px;height:18px"></span>${price}</button>`;
    return `<div class="mrow"><div><div>${t('set_' + k)}</div><div class="dots">${dots}</div></div>${btn}</div>`;
  }).join('');
  modal(`<h3 class="mtitle">${t('coats')}</h3><div class="rows">${rows}</div><div class="mbtns"><button class="pill" id="mClose">OK</button></div>`, true);
  $('modalCard').querySelectorAll('button[data-k]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k;
    if (!save.sets.includes(k)) {
      if (save.coins < S.SETS[k]) return;
      save.coins -= S.SETS[k];
      save.sets.push(k);
      sfx('chest');
    } else sfx('click');
    save.set = k;
    world.setHerdSet(k);
    S.store(save);
    updateCoins();
    renderUps();
    showCoats();
  }));
  $('mClose').onclick = () => { sfx('click'); closeModal(); };
}

function showSettings(inGame) {
  const row = (label, val, id) => `<div class="mrow"><span>${label}</span><button id="${id}" class="${val ? 'on' : ''}">${val === null ? '' : val ? t('on') : t('off')}</button></div>`;
  modal(`<h3 class="mtitle">${inGame ? t('pause') : '⚙'}</h3>${row(t('sound'), save.sound, 'mSound')}<div class="mrow"><span>🌐</span><button id="mLang">${t('lang')}</button></div>
    <div class="mbtns">${inGame ? `<button class="big disp" id="mResume">${t('resume')}</button><button class="pill" id="mMenu">${t('menu')}</button>` : `<button class="pill" id="mClose">OK</button>`}</div>`);
  $('mSound').onclick = () => { save.sound = !save.sound; setSound(save.sound); S.store(save); showSettings(inGame); };
  $('mLang').onclick = () => { setLang(getLang() === 'ru' ? 'en' : 'ru'); if (inGame) { $('progLvl').textContent = t('level') + ' ' + L.n; showSettings(true); } else { closeModal(); showMenu(); } };
  if (inGame) {
    $('mResume').onclick = () => { closeModal(); state = 'play'; lastT = performance.now(); };
    $('mMenu').onclick = () => { closeModal(); showMenu(); };
  } else $('mClose').onclick = () => { sfx('click'); closeModal(); };
}

function pause() {
  if (state !== 'play') return;
  state = 'pause';
  showSettings(true);
}

// —— подсказки ——
function showHint(key, delay = 0) {
  if (shownHints[key] || AUTO) return;
  shownHints[key] = 1;
  try { localStorage.setItem('tabun.hints', JSON.stringify(shownHints)); } catch { /* нет доступа */ }
  setTimeout(() => {
    if (state !== 'play') return;
    const h = $('hint');
    h.textContent = t('hint_' + key);
    h.classList.remove('hidden');
    clearTimeout(showHint.timer);
    showHint.timer = setTimeout(() => h.classList.add('hidden'), 3400);
  }, delay * 1000);
}

// —— подписи ——
let herdTag = null, rivalTag = null;
function clearLabels() { $('labels').innerHTML = ''; herdTag = rivalTag = null; }
function makeTags() {
  clearLabels();
  herdTag = document.createElement('div'); herdTag.className = 'tag';
  rivalTag = document.createElement('div'); rivalTag.className = 'tag rival';
  $('labels').append(herdTag, rivalTag);
}
function popTag(el) { if (!el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
function floatText(txt, x, y, d, cls = '') {
  const p = world.project(x, y, d);
  if (!p.vis) return;
  const el = document.createElement('div');
  el.className = 'float ' + cls;
  el.textContent = txt;
  el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  $('labels').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
function banner(txt) {
  const el = document.createElement('div');
  el.className = 'banner';
  el.textContent = txt;
  $('labels').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
function placeTags() {
  if (!herdTag) return;
  const sh = herdShape(Math.max(1, Math.min(run.count, run.cap)));
  if (run.count > 0 && run.state !== 'win') {
    const p = world.project(run.cx * 0.9, 3.4, run.d + sh.b * 0.6);
    herdTag.style.display = '';
    herdTag.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    if (herdTag._n !== run.count) { herdTag._n = run.count; herdTag.textContent = run.count; herdTag.style.fontSize = Math.round(24 + Math.min(18, Math.log2(Math.max(1, run.count)) * 1.8)) + 'px'; }
  } else herdTag.style.display = 'none';
  const rv = run.rival;
  const rp = world.project(0, 2.8, rv.d - herdShape(Math.max(1, Math.min(rv.count, run.cap))).b * 0.5);
  const showR = rv.count > 0 && (run.state === 'clash' || rv.d - run.d < 90) && rp.vis;
  rivalTag.style.display = showR ? '' : 'none';
  if (showR) {
    rivalTag.style.transform = `translate(${rp.x}px, ${rp.y}px) translate(-50%, -100%)`;
    if (rivalTag._n !== rv.count) { rivalTag._n = rv.count; rivalTag.textContent = rv.count; }
  }
}

// вибрация на телефоне (не везде есть — молча пропускаем)
function buzz(p) { try { if (save.sound && navigator.vibrate) navigator.vibrate(p); } catch { /* нет */ } }

// круглые числа табуна — праздник
const MILES = [25, 50, 100, 200, 300, 500, 750, 999];
let mileIdx = 0;
function checkMilestone() {
  if (run.state !== 'run') return;
  while (mileIdx < MILES.length && run.count >= MILES[mileIdx]) {
    const n = MILES[mileIdx++];
    if (mileIdx < MILES.length && run.count >= MILES[mileIdx]) continue; // перепрыгнули — празднуем только последнее
    banner(n === 100 ? t('milestone100') : t('milestone', { n }));
    sfx('milestone');
  }
}

// —— события забега ——
let lastLossSfx = 0, lastClashSfx = 0, lastRecruitSfx = 0;
function handleEvents() {
  const now = performance.now();
  for (const ev of run.events) {
    world.fx(ev, run);
    switch (ev.type) {
      case 'gate': {
        const g = ev.op;
        if (g.op === '$') break;
        const txt = ev.delta >= 0 ? (g.op === 'x' ? opText(g) : '+' + ev.delta) : String(ev.delta);
        floatText(txt, ev.x, 2.2, ev.d, ev.good ? 'good huge' : 'bad huge');
        sfx(ev.good ? 'good' : 'bad', g.op === 'x' ? 6 : 0);
        if (!ev.good) buzz(60);
        popTag(herdTag);
        break;
      }
      case 'chest':
        floatText('+' + ev.v + ' ₸', ev.x, 2.2, ev.d, 'gold huge');
        sfx('chest');
        updateCoins();
        break;
      case 'recruit':
        if (now - lastRecruitSfx > 70) { sfx('recruit'); lastRecruitSfx = now; }
        floatText('+1', ev.x, 2.2, ev.d, 'good');
        popTag(herdTag);
        break;
      case 'loss':
        if (ev.kind !== 'wolf' && now - lastLossSfx > 120) { sfx(ev.kind === 'fall' ? 'fall' : 'hit'); lastLossSfx = now; buzz(20); }
        if (ev.n > 0) floatText('−' + ev.n, ev.x, 1.8, ev.d, 'bad');
        break;
      case 'rock': sfx('rock'); showHint('rock'); break;
      case 'wolves': showHint('wolf'); break;
      case 'howl': sfx('howl'); break;
      case 'bite':
        if (now - lastLossSfx > 90) { sfx('bite'); lastLossSfx = now; }
        buzz(25);
        break;
      case 'river': sfx('splash'); showHint('river'); break;
      case 'leader':
        floatText(t('leader', { n: ev.v }), run.cx, 3.4, run.d + 4, 'gold huge');
        break;
      case 'clash-hit': buzz([40, 30, 60]); break;
      case 'clash-start':
        banner(t('clash'));
        sfx('drum');
        slowT = 0.9;
        break;
      case 'clash-tick':
        if (now - lastClashSfx > 60) { sfx('clash'); lastClashSfx = now; }
        break;
      case 'step':
        sfx('step', ev.i);
        break;
      case 'win':
        sfx('win');
        resultIn = 1.4;
        break;
      case 'lose':
        sfx('lose');
        resultIn = 1.3;
        break;
    }
  }
  run.events.length = 0;
}

function checkUpcomingHints() {
  const front = run.front;
  for (const it of run.items) {
    if (it.done) continue;
    const d = it.d ?? it.d0;
    if (d - front > 45) break;
    if (d < front) continue;
    if (it.type === 'wild') showHint('wild');
    else if (it.type === 'wolf') showHint('wolf');
    else if (it.type === 'pit') showHint('pit');
    else if (it.type === 'fence') showHint('fence');
  }
  if (run.finishD - front < 60 && L.n <= 2) showHint('clash');
}

function showResult() {
  if (state !== 'play') return;
  state = 'result';
  const res = run.result;
  const got = reward(L, res, save.up.income);
  save.coins += got;
  save.played++;
  save.best = Math.max(save.best, peak);
  if (res.win) save.lvl++;
  S.store(save);
  $('hud').classList.add('hidden');
  clearLabels();
  const r = $('result');
  r.classList.remove('hidden');
  r.classList.toggle('win', res.win);
  $('resT').textContent = res.win ? t('win') : t('lose');
  $('resSub').textContent = res.win ? t('best', { n: peak }) : run.rival.count < run.rival.start ? t('rivalWon', { n: run.rival.count }) : t('lostWay');
  $('resMult').textContent = res.win ? '×' + res.mult + (L.boss ? ' · ×2' : '') : '';
  // проиграл, но хватает на улучшение — зовём в меню улучшаться
  const canUp = !res.win && ['herd', 'income', 'leader'].some((k) => save.up[k] < S.UPS[k].max && save.coins >= S.upCost(k, save.up[k]));
  r.dataset.up = canUp ? '1' : '';
  $('resNext').textContent = res.win ? t('next') : canUp ? t('upgrade') : t('retry');
  $('resMenu').textContent = t('menu');
  // счётчик монет бежит
  const b = $('resCoins').querySelector('b');
  const t0 = performance.now();
  const tickC = () => {
    const k = Math.min(1, (performance.now() - t0) / 700);
    b.textContent = '+' + fmt(got * k);
    if (k < 1) requestAnimationFrame(tickC);
  };
  tickC();
  if (AUTO) setTimeout(() => { if (state === 'result') { showMenu(); setTimeout(startLevel, 300); } }, 1200);
}

// —— ввод ——
function bindInput() {
  const st = $('stage');
  st.addEventListener('pointerdown', (e) => {
    if (state !== 'play') return;
    if (e.target.closest('button')) return;
    initAudio();
    drag = { x: e.clientX, cx: targetX, id: e.pointerId };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || state !== 'play') return;
    const w = Math.min(window.innerWidth, 640);
    targetX = clampX(drag.cx + ((e.clientX - drag.x) / w) * 13);
    if (dragHintOn && Math.abs(e.clientX - drag.x) > 25) { dragHintOn = false; $('dragHint').classList.add('hidden'); }
  });
  const up = () => { drag = null; };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyP' || (e.code === 'Escape' && !PORTAL)) { if (state === 'play') pause(); }
    initAudio();
    if ((e.code === 'Space' || e.code === 'Enter') && state === 'menu' && $('modal').classList.contains('hidden')) { e.preventDefault(); startLevel(); }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
}
const clampX = (x) => Math.max(-HALF + 0.4, Math.min(HALF - 0.4, x));

function bindUI() {
  $('playBtn').onclick = () => startLevel();
  $('pauseBtn').onclick = () => { sfx('click'); pause(); };
  $('setBtn').onclick = () => { sfx('click'); showSettings(false); };
  $('coatsBtn').onclick = () => { sfx('click'); showCoats(); };
  $('resNext').onclick = () => {
    sfx('click');
    if (run?.result?.win) showMenu();
    else if ($('result').dataset.up) { showMenu(); for (const el of $('ups').children) if (!el.classList.contains('poor')) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash', 'glow'); } }
    else startLevel();
  };
  $('resMenu').onclick = () => { sfx('click'); showMenu(); };
}

// —— цикл ——
let fpsAcc = 0, fpsN = 0, fpsT = 0, lowSteps = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.1, (now - (lastT || now)) / 1000);
  lastT = now;
  if (!world || !run) return;
  if (state === 'play') {
    // клавиатура
    const k = (keys.ArrowLeft || keys.KeyA ? -1 : 0) + (keys.ArrowRight || keys.KeyD ? 1 : 0);
    if (k) { targetX = clampX(targetX + k * 10 * rdt); if (dragHintOn) { dragHintOn = false; $('dragHint').classList.add('hidden'); } }
    if (slowT > 0) { slowT -= rdt; timeScale = 0.35; } else timeScale += (1 - timeScale) * Math.min(1, rdt * 4);
    acc += rdt * timeScale;
    let steps = 0;
    while (acc >= DT && steps < 8) {
      run.step(DT, AUTO ? autoTarget(run) : targetX);
      acc -= DT;
      steps++;
      if (AUTO) targetX = run.cx;
    }
    peak = Math.max(peak, run.count);
    handleEvents();
    checkMilestone();
    checkUpcomingHints();
    const pr = run.progress;
    $('progBar').firstElementChild.style.width = pr * 100 + '%';
    $('progBar').lastElementChild.style.left = pr * 100 + '%';
    hooves(run.count, run.state === 'run' || run.state === 'ladder' || run.state === 'clash', rdt);
    if (resultIn > 0 && (resultIn -= rdt) <= 0) { resultIn = 0; showResult(); }
  } else if (state === 'result') {
    run.step(rdt, run.cx);
    run.events.length = 0;
    hooves(0, false, rdt);
  } else hooves(0, false, rdt);
  world.update(run, state === 'pause' ? 0 : rdt * (state === 'play' ? timeScale : 1), state === 'menu');
  if (state === 'play') placeTags();
  world.render();
  // качество: если кадры тяжёлые — меньше пикселей
  fpsAcc += rdt; fpsN++;
  if (fpsAcc > 2.5) {
    const fps = fpsN / fpsAcc;
    fpsT = fps;
    if (fps < 42 && world.pixelRatio > 0.8) { lowSteps++; world.setPixelRatio(Math.max(0.75, world.pixelRatio - 0.35)); }
    fpsAcc = 0; fpsN = 0;
  }
}

// —— для тестов ——
window.__tabun = {
  get state() { return state; }, get run() { return run; }, get save() { return save; }, get world() { return world; },
  get fps() { return fpsT; },
  start: startLevel, menu: showMenu, auto: autoTarget,
  setSave(s) { save = { ...save, ...s }; S.store(save); },
  layout() {
    const sel = ['#pauseBtn', '#hudCoins', '#prog', '#setBtn', '#allGames', '#menuCoins', '#logo', '#lvlRow', '#playBtn', '#ups', '#coatsBtn', '#aulInfo', '#resT', '#resCoins', '#resNext', '#resMenu', '#hint'];
    const rects = [];
    for (const s of sel) {
      const el = document.querySelector(s);
      if (!el || el.offsetParent === null) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      rects.push({ s, l: r.left, t: r.top, r: r.right, b: r.bottom });
    }
    const W = innerWidth, H = innerHeight, bad = [];
    for (const a of rects) {
      if (a.l < -1 || a.t < -1 || a.r > W + 1 || a.b > H + 1) bad.push(a.s + ' out of screen');
      for (const b of rects) if (a !== b && a.s < b.s && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) bad.push(a.s + ' × ' + b.s);
    }
    return { W, H, bad, rects };
  },
};

boot().catch((e) => { console.error(e); $('loadS').textContent = 'Error: ' + e.message; });
