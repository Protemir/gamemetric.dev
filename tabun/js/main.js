// «Табун» — запуск, цикл, меню, ввод, итоги.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { level, dailyLevel, cacheLevel, Run, DT, autoTarget, HALF, reward, herdShape, opText } from './logic.js';
import { World } from './world.js';
import { loadHorse, loadWolf, HERD_SETS, COATS } from './horses.js';
import { loadRealHorse, loadRealWolf } from './realhorse.js';
import { loadRiderProto } from './riderreal.js';
import { initAudio, sfx, hooves, setSound, setMusic, music, setPortalMute } from './audio.js';
import { PORTAL as PORTAL_KIND, portalReady, portalGameplay, portalHappy, portalInterstitial, portalRewarded, portalRewardedOk, portalLevel, onPortalHold, onPortalMute, track } from './portal.js';
import { t, detectLang, setLang, getLang, plural } from './i18n.js';
import * as S from './save.js';
import { ACH, achById } from './ach.js';

const $ = (id) => document.getElementById(id);
const P = new URLSearchParams(location.search);
const AUTO = P.has('auto');
const TOY = P.has('toy'); // ?toy — прежние мультяшные кони
const PORTAL = !!PORTAL_KIND || window.top !== window.self || P.has('portal');
if (P.has('shot')) document.documentElement.classList.add('shot');
detectLang();

let save = S.load();
// ?level=N — только на этот запуск (для проверок и ссылок); в сохранение не попадает и снимается после первых итогов
let levelOverride = P.has('level') ? Math.min(1e4, Math.max(1, Math.floor(Number(P.get('level'))) || 1)) : null;
const curLvl = () => levelOverride ?? save.lvl;
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
let resultIn = 0;
let daily = false;      // идёт «Байга дня»
let dailyKey = null;    // день, к которому относится текущая байга
const dayIndex = () => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5; };
// подсмотреть сложность дня, ничего не фиксируя (для фоновой подготовки трассы)
const peekDailyDiff = () => (save.dailyDiff && save.dailyDiff.day === dayIndex() ? save.dailyDiff.diff : Math.max(4, Math.min(30, save.lvl + 2)));
const dailyDiff = () => {
  // одна трасса на весь день: сложность запоминается при первом открытии дня
  const day = dayIndex();
  if (!save.dailyDiff || save.dailyDiff.day !== day) { save.dailyDiff = { day, diff: Math.max(4, Math.min(30, save.lvl + 2)) }; S.store(save); }
  return save.dailyDiff.diff;
};       // через сколько секунд игры показать итоги (0 — не ждём)
let shownHints = {};
try { shownHints = JSON.parse(localStorage.getItem('tabun.hints') || '{}'); } catch { /* нет доступа */ }

// —— загрузка ——
function setLoad(p) { $('loadBar').firstElementChild.style.width = Math.round(p * 100) + '%'; }

// волки грузятся, когда игрок впервые в меню или на итогах (там подвисание запекания незаметно);
// стаи бывают с 4-го уровня, так что к ним модель уже готова
let wolfLoading = false;
function loadWolfLate() {
  if (wolfLoading || !world) return;
  wolfLoading = true;
  try { world.setRear(world.assets.horse.bakeRear?.()); } catch (e) { console.warn('tabun: rear', e?.message || e); }
  const p = TOY ? loadWolf('models/wolf.glb') : loadRealWolf('models/direwolf.glb').catch(() => loadWolf('models/wolf.glb'));
  p.then((w) => w && world.setWolf(w)).catch((e) => console.warn('tabun: optional asset', e?.message || e));
}

async function boot() {
  $('loadT').textContent = t('title').toUpperCase();
  $('loadS').textContent = t('loading');
  document.title = getLang() === 'ru' ? 'Табун — веди табун через степь | GameMetric' : 'Tabun: Steppe Stampede — lead the herd | GameMetric';
  const gl2 = (() => { try { const g = document.createElement('canvas').getContext('webgl2'); g?.getExtension('WEBGL_lose_context')?.loseContext(); return !!g; } catch { return false; } })();
  if (!gl2) { $('loadS').textContent = t('nogl'); return; }
  setLoad(0.05);
  prewarm(curLvl());
  loadSlowT = setTimeout(() => loadTrouble(t('slow')), 30000);
  const opt = (p) => p.catch((e) => { console.warn('tabun: optional asset', e?.message || e); return null; });
  const loader = new GLTFLoader();
  let done = 0;
  const tick = () => setLoad(0.1 + (++done / 5) * 0.85);
  // волки (845 КБ) не нужны до 4-го уровня — грузятся после старта, см. loadWolfLate
  const [horse, rock, bush, riderProto] = await Promise.all([
    (TOY ? loadHorse('models/horse.glb') : loadRealHorse('models/warhorse.glb', 'models/warhorse-lo.glb')).then((h) => { tick(); return h; }),
    loader.loadAsync('models/rock.glb').then((g) => { tick(); return g; }),
    opt(loader.loadAsync('models/bush.glb')).then((g) => { tick(); return g; }),
    opt(TOY ? Promise.resolve(null) : loadRiderProto('models/rider.glb')).then((r) => { tick(); return r; }),
    (document.fonts?.load("400 40px 'Russo One'") || Promise.resolve()).then(tick, tick),
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
  clearTimeout(loadSlowT);
  const r = norm(rock.scene, false), b = bush ? norm(bush.scene, true) : null;
  // пока волк не загружен (или не загрузился совсем) — стая рисуется тёмными конями, игра не падает
  const wolfA = { run: horse.gallop, stalk: horse.idle, bite: null, material: horse.material, textured: false }; // простой тёмный материал, не как дикие кони
  const assets = { horse, rock: r.g, rockScale: 1 / Math.max(r.size.x, r.size.y, r.size.z), bush: b?.g || null, bushScale: b ? 1.1 / b.size.y : 1, wolf: wolfA, riderProto };
  world = new World($('gl'), assets);
  // телефон может отобрать WebGL при сворачивании — не даём экрану остаться чёрным
  $('gl').addEventListener('webglcontextlost', (e) => { e.preventDefault(); pause(); });
  $('gl').addEventListener('webglcontextrestored', () => location.reload());
  world.setHerdSet(save.set);
  world.setShadows(!P.has('noshadow'));
  applyQuality();
  world.onBoom = () => sfx('boom');
  world.onThunder = () => { flash('white'); setTimeout(() => sfx('thunder'), 350 + Math.random() * 700); buzz(30); };
  setSound(save.sound);
  setMusic(save.music !== false);
  onResize();
  window.addEventListener('resize', onResize);
  bindInput();
  bindUI();
  $('loading').classList.add('out');
  setTimeout(() => $('loading').remove(), 500);
  // первый запуск — сразу в скачку, без меню
  if (save.played === 0 && !P.has('menu')) startLevel(); else showMenu();
  // порталы: игра загружена, звук и пауза платформы, реклама
  portalReady();
  onPortalMute(setPortalMute);
  onPortalHold(() => pause());
  requestAnimationFrame(frame);
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  world?.resize(w, h);
}

// —— уровни ——
function prepare() {
  L = daily ? dailyLevel(dayIndex(), dailyDiff()) : level(curLvl());
  dailyKey = daily ? S.dayKey() : null; // заезд, начатый до полуночи, засчитывается своему дню
  run = new Run(L, { start: S.startHerd(save), leader: S.leaderBonus(save) });
  for (const b of run.bodies) { b.x = run.cx + b.sx; b.d = run.d + b.sd; b.spawn = 1; }
  world.setLevel(L, run);
  world.setAul?.(S.yurts(save));
  targetX = 0;
  peak = run.count;
}

function setAria() {
  $('pauseBtn').setAttribute('aria-label', t('aPause'));
  $('setBtn').setAttribute('aria-label', t('aSettings'));
  $('achBtn').setAttribute('aria-label', t('aAch'));
}

function startLevel() {
  if (state === 'play') return;
  initAudio();
  resultIn = 0;
  if (state !== 'menu' || !run) prepare();
  state = 'play';
  if (L.items.some((it) => it.type === 'wolf')) loadWolfLate(); // сразу уровень с волками (ссылка ?level) — грузим на облёте камеры
  portalLevel(daily ? 'daily' : 'steppe', daily ? dayIndex() : L.n);
  slowT = 0; timeScale = 1; acc = 0;
  mileIdx = 0;
  while (mileIdx < MILES.length && run.count >= MILES[mileIdx]) mileIdx++;
  hideAll();
  setAria();
  setTimeout(pumpToast, 1500); // отложенные тосты — в начале следующего забега
  $('hud').classList.remove('hidden');
  $('progLvl').textContent = daily ? t('daily_run') : t('level') + ' ' + L.n;
  updateCoins();
  makeTags();
  if (curLvl() <= 2 && !daily && !AUTO) { dragHintOn = true; $('dragHint').classList.remove('hidden'); $('dragHint').querySelector('span').textContent = t('drag'); }
  if (curLvl() === 1 && !daily) showHint('gate', 1.2);
  sfx('click');
  sfx('whoosh');
  world.startIntro();
  banner(daily ? '🌙 ' + t('daily_run') : L.boss ? t('boss') : t('level') + ' ' + L.n, 'intro');
}

function showMenu() {
  loadWolfLate();
  // уровень из ссылки снимается, когда из итогов вернулись в меню (на старте — остаётся)
  if (state === 'result' || state === 'pause') levelOverride = null;
  state = 'menu';
  daily = false;
  prepare();
  hideAll();
  $('menu').classList.remove('hidden');
  setAria();
  $('logoT').textContent = t('title').toUpperCase();
  $('logoS').textContent = t('subtitle');
  $('allGames').textContent = '← ' + t('allGames');
  $('allGames').classList.toggle('hidden', PORTAL);
  $('lvlName').textContent = t('level') + ' ' + curLvl();
  $('starTotal').textContent = '★ ' + S.totalStars(save);
  $('bossTag').textContent = t('boss');
  $('bossTag').classList.toggle('hidden', !L.boss);
  $('playBtn').querySelector('.pl').textContent = t('play');
  $('playBtn').querySelector('.sub').textContent = L.boss ? '⚡ ' + t('boss') + ' · ' + t('level') + ' ' + curLvl() : t('level') + ' ' + curLvl();
  $('upsTitle').textContent = t('upsTitle');
  renderPath();
  $('coatsBtn').querySelector('.lbl').textContent = t('coats');
  $('aulInfo').textContent = t('aul', { n: S.yurts(save) });
  renderAchBadge();
  setTimeout(pumpToast, 600);
  const doneToday = save.dailyWin === S.dayKey();
  $('dailyBtn').querySelector('.lbl').textContent = t('daily_short');
  $('dailyBtn').querySelector('.badge').textContent = doneToday ? '✓' : '×2';
  $('dailyBtn').classList.toggle('done', doneToday);
  renderUps();
  updateCoins();
  clearLabels();
  const dayGift = S.dailyState(save);
  if (dayGift && save.played > 0) showDaily(dayGift);
}

function hideAll() {
  for (const id of ['menu', 'hud', 'result', 'modal']) $(id).classList.add('hidden');
  $('hud').classList.remove('result-mode');
  $('dragHint').classList.add('hidden');
  $('hint').classList.add('hidden');
}

// —— дорожка уровней над кнопкой «Скакать» ——
function renderPath() {
  const box = $('path');
  const cur = save.lvl, from = Math.max(1, cur - 2);
  let h = '';
  for (let n = from; n < from + 5; n++) {
    const st = n < cur ? 'done' : n === cur ? 'cur' : 'next';
    const boss = n % 5 === 0;
    const stars = Number(save.stars[n]) || 0;
    h += (n > from ? '<s class="' + (n <= cur ? 'done' : '') + '"></s>' : '') +
      '<span class="node ' + st + (boss ? ' boss' : '') + '"><b>' + (boss ? '⚡' : n) + '</b>' + (st === 'done' && stars ? '<em>' + '★'.repeat(stars) + '</em>' : '') + '</span>';
  }
  box.innerHTML = h;
}

// —— улучшения ——
const UP_ICONS = {
  herd: '<svg viewBox="0 0 40 40" class="ic"><defs><linearGradient id="g-herd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd977"/><stop offset="1" stop-color="#e09a1c"/></linearGradient></defs><circle cx="20" cy="20" r="19" fill="url(#g-herd)"/><path d="M9 29c1-6 5-9 10-9l5-6 3 1-1 4c3 1 5 4 5 10h-3l-1-4-6 1-2 4h-3l1-5-4 1-1 3z" fill="#4a2a10"/></svg>',
  income: '<svg viewBox="0 0 40 40" class="ic"><defs><linearGradient id="g-inc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fe38a"/><stop offset="1" stop-color="#3fa84f"/></linearGradient></defs><circle cx="20" cy="20" r="19" fill="url(#g-inc)"/><circle cx="20" cy="21" r="10" fill="#ffcf3a" stroke="#d98a10" stroke-width="2"/><text x="20" y="26" font-size="13" text-anchor="middle" fill="#8a4a00" font-family="Russo One">₸</text><path d="M28 9l4 4-4 4" stroke="#2fa847" stroke-width="3" fill="none"/></svg>',
  leader: '<svg viewBox="0 0 40 40" class="ic"><defs><linearGradient id="g-lead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a8a"/><stop offset="1" stop-color="#d6342c"/></linearGradient></defs><circle cx="20" cy="20" r="19" fill="url(#g-lead)"/><path d="M11 15l4 4 5-7 5 7 4-4-2 12H13z" fill="#e0393e" stroke="#8f1418" stroke-width="1.5"/></svg>',
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
    const pips = Array.from({ length: 5 }, (_, i) => `<i class="${i < lvl % 5 || (lvl && lvl % 5 === 0 && lvl >= 5 && false) ? 'on' : ''}"></i>`).join('');
    el.innerHTML = `<div class="top">${UP_ICONS[key]}<div><div class="nm">${name}</div><div class="lv">${t('lvl', { n: lvl + 1 })}</div></div></div><div class="ds">${desc}</div><div class="pips">${pips}</div><button class="buy">${max ? t('max') : `<span class="coin"></span>${fmt(cost)}`}</button>`;
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
  const fid = document.activeElement && document.activeElement.id;
  $('modalCard').innerHTML = html;
  if (fid && $(fid) && $('modalCard').contains($(fid))) $(fid).focus();
  $('modalCard').classList.toggle('wide', wide);
  $('modal').classList.remove('hidden');
}
function closeModal() {
  $('modal').classList.add('hidden');
  // фокус не остаётся на кнопке, открывшей окно, — иначе пробел откроет его снова вместо скачки
  if (state === 'menu' && document.activeElement && document.activeElement !== document.body && !$('modal').contains(document.activeElement)) document.activeElement.blur?.();
}

function showDaily(d) {
  modal(`<h3 class="mtitle">${t('daily')}</h3><p>${t('dailyD', { n: d.streak })}</p><div class="daily"><span class="coin"></span>+${fmt(d.amount)}</div><button class="big disp" id="dailyTake">${t('take')}</button>`);
  $('dailyTake').onclick = () => {
    save.coins += d.amount;
    save.daily = { last: d.key || S.dayKey(), streak: d.streak };
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
    const btn = sel ? `<button class="on" disabled>${t('owned')}</button>` : own ? `<button data-k="${k}">${t('choose')}</button>` : `<button class="gold" data-k="${k}" ${save.coins < price ? 'disabled' : ''}><span class="coin" style="width:18px;height:18px"></span>${fmt(price)}</button>`;
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
  modal(`<h3 class="mtitle">${inGame ? t('pause') : t('settings')}</h3><div class="rows">${row(t('sound'), save.sound, 'mSound')}${row(t('music'), save.music !== false, 'mMusic')}<div class="mrow"><span>${t('quality')}</span><button id="mQual" class="on">${t('q_' + (save.quality || 'auto'))}</button></div><div class="mrow"><span>${t('language')}</span><button id="mLang">${t('lang')}</button></div></div>
    <div class="mbtns">${inGame ? `<button class="big disp" id="mResume">${t('resume')}</button><button class="pill" id="mMenu">${t('menu')}</button>` : `<button class="pill" id="mClose">OK</button>`}</div>`, true);
  $('mSound').onclick = () => { save.sound = !save.sound; setSound(save.sound); S.store(save); showSettings(inGame); };
  $('mMusic').onclick = () => { save.music = save.music === false; setMusic(save.music); S.store(save); showSettings(inGame); };
  $('mQual').onclick = () => { const L4 = ['auto', 'high', 'mid', 'low']; save.quality = L4[(L4.indexOf(save.quality || 'auto') + 1) % 4]; S.store(save); applyQuality(); showSettings(inGame); };
  $('mLang').onclick = () => { setLang(getLang() === 'ru' ? 'en' : 'ru'); if (inGame) { $('progLvl').textContent = daily ? t('daily_run') : t('level') + ' ' + L.n; showSettings(true); } else { closeModal(); showMenu(); } };
  if (inGame) {
    $('mResume').onclick = () => { closeModal(); state = 'play'; lastT = performance.now(); };
    $('mMenu').onclick = () => { closeModal(); showMenu(); };
  } else $('mClose').onclick = () => { sfx('click'); closeModal(); };
}

function pause() {
  if (state !== 'play') return;
  // забег уже решён (победа или поражение) — сначала итоги, иначе «В меню» потеряет награду
  if (run && (run.state === 'win' || run.state === 'lose')) return;
  state = 'pause';
  showSettings(true);
}

// —— подсказки ——
function showHint(key, delay = 0) {
  if (shownHints[key] || AUTO) return;
  if (showHint.pending?.[key]) return;
  (showHint.pending ||= {})[key] = 1;
  setTimeout(() => {
    showHint.pending[key] = 0;
    if (state !== 'play' || shownHints[key]) return;
    shownHints[key] = 1;
    try { localStorage.setItem('tabun.hints', JSON.stringify(shownHints)); } catch { /* нет доступа */ }
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
function banner(txt, cls = '', sub = '') {
  const el = document.createElement('div');
  el.className = 'banner ' + cls;
  el.textContent = txt;
  if (sub) { const s = document.createElement('small'); s.textContent = sub; el.appendChild(s); }
  $('labels').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
function placeTags() {
  if (!herdTag) return;
  const sh = herdShape(Math.max(1, Math.min(run.count, run.cap)));
  if (run.count > 0 && run.state !== 'win') {
    const clash = run.state === 'clash';
    const p = world.project(clash ? -3.2 : run.cx * 0.9, 3.4, run.d + sh.b * (clash ? 0.2 : 0.6));
    herdTag.style.display = '';
    // счётчик не уходит за край экрана (кинокамера на байге, узкий телефон)
    const hx = Math.max(56, Math.min(innerWidth - 56, p.x)), hy = Math.max(110, Math.min(innerHeight - 40, p.y));
    herdTag.style.transform = `translate(${hx}px, ${hy}px) translate(-50%, -100%)`;
    if (herdTag._n !== run.count) { herdTag._n = run.count; herdTag.textContent = run.count; herdTag.style.fontSize = Math.round(24 + Math.min(18, Math.log2(Math.max(1, run.count)) * 1.8)) + 'px'; }
  } else herdTag.style.display = 'none';
  const rv = run.rival;
  const rp = world.project(run.state === 'clash' ? 3.2 : 0, 2.8, rv.d - herdShape(Math.max(1, Math.min(rv.count, run.cap))).b * (run.state === 'clash' ? 0.1 : 0.5));
  const showR = rv.count > 0 && (run.state === 'clash' || rv.d - run.d < 90) && rp.vis;
  rivalTag.style.display = showR ? '' : 'none';
  if (showR) {
    const rx = Math.max(56, Math.min(innerWidth - 56, rp.x)), ry = Math.max(110, Math.min(innerHeight - 40, rp.y));
    rivalTag.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -100%)`;
    if (rivalTag._n !== rv.count) { rivalTag._n = rv.count; rivalTag.textContent = rv.count; }
  }
}

// вспышка по краям экрана: синяя — хорошо, красная — потери
function flash(kind) {
  const f = $('flash');
  f.className = '';
  void f.offsetWidth;
  f.className = kind;
}

// —— достижения ——
const toastQ = [];
let toastBusy = false;
function unlock(id) {
  if (!save.ach) save.ach = {};
  if (save.ach[id]) return;
  const a = achById(id);
  if (!a) return;
  save.ach[id] = 1;
  save.coins += a.r;
  S.store(save);
  toastQ.push(a);
  pumpToast();
  updateCoins();
  renderAchBadge();
}
function pumpToast() {
  // на итогах не мешаем — покажем в меню
  // во время схватки, лестницы и итогов не мешаем — покажем в меню или в обычной скачке
  if (toastBusy || !toastQ.length || state === 'result' || (state === 'play' && run && run.state !== 'run')) return;
  toastBusy = true;
  const a = toastQ.shift();
  const el = $('toast');
  const [name] = a[getLang()] || a.en;
  el.innerHTML = '<b>🏆</b><span><i>' + t('achGot') + '</i>' + name + '</span><em>+' + a.r + ' ₸</em>';
  el.classList.remove('hidden', 'go');
  void el.offsetWidth;
  el.classList.add('go');
  sfx('achieve');
  setTimeout(() => { el.classList.add('hidden'); toastBusy = false; pumpToast(); }, 2900);
}
function renderAchBadge() {
  const n = Object.keys(save.ach || {}).length;
  $('achBtn').dataset.n = n + '/' + ACH.length;
}
function showAch() {
  const rows = ACH.map((a) => {
    const got = save.ach?.[a.id];
    const [name, desc] = a[getLang()] || a.en;
    return '<div class="ach' + (got ? ' got' : '') + '"><b>' + (got ? '🏆' : '🔒') + '</b><div><div class="an">' + name + '</div><div class="ad">' + desc + '</div></div><span>+' + a.r + ' ₸</span></div>';
  }).join('');
  modal('<h3 class="mtitle">' + t('achTitle') + ' · ' + Object.keys(save.ach || {}).length + '/' + ACH.length + '</h3><div class="rows achs">' + rows + '</div><div class="mbtns"><button class="pill" id="mClose">OK</button></div>', true);
  $('mClose').onclick = () => { sfx('click'); closeModal(); };
}

// вибрация на телефоне (не везде есть — молча пропускаем)
function buzz(p) { try { if (save.sound && navigator.vibrate) navigator.vibrate(p); } catch { /* нет */ } }

// круглые числа табуна — праздник
const MILES = [25, 50, 100, 200, 300, 500, 750, 999];
let mileIdx = 0;
function checkMilestone() {
  if (run.state !== 'run' && run.state !== 'clash') return;
  while (mileIdx < MILES.length && run.count >= MILES[mileIdx]) {
    const n = MILES[mileIdx++];
    if (mileIdx < MILES.length && run.count >= MILES[mileIdx]) continue; // перепрыгнули — празднуем только последнее
    banner(n === 100 ? t('milestone100') : t('milestone', { n }));
    if (n >= 100) unlock('herd100');
    if (n >= 300) unlock('herd300');
    if (n >= 999) unlock('herd999');
    sfx('milestone');
  }
}

// —— события забега ——
let lastLossSfx = 0, lastClashSfx = 0, lastRecruitSfx = 0;
const recruitAcc = { n: 0, t: 0, x: 0, d: 0 };
const stolenAcc = { n: 0, t: 0, x: 0, d: 0 };
function flushRecruits(now) {
  if (recruitAcc.n && now - recruitAcc.t > 350) { floatText('+' + recruitAcc.n, recruitAcc.x, 2.4, recruitAcc.d, 'good huge'); recruitAcc.n = 0; }
  if (stolenAcc.n && now - stolenAcc.t > 400) { floatText('−' + stolenAcc.n, stolenAcc.x, 5.4, stolenAcc.d, 'bad huge'); stolenAcc.n = 0; }
}
function handleEvents() {
  const now = performance.now();
  for (const ev of run.events) {
    world.fx(ev, run);
    switch (ev.type) {
      case 'gate': {
        const g = ev.op;
        if (g.op === '$') break;
        let txt = ev.delta >= 0 ? (g.op === 'x' ? opText(g) : '+' + ev.delta) : String(ev.delta);
        if (ev.mystery) { txt = '? → ' + txt; sfx('chest'); if (g.op === 'x') unlock('lucky'); }
        floatText(txt, ev.x, 5.2, ev.d, ev.good ? 'good huge' : 'bad huge');
        sfx(ev.good ? 'good' : 'bad', g.op === 'x' ? 6 : 0);
        if (!ev.good) buzz(60);
        flash(ev.good ? 'good' : 'bad');
        popTag(herdTag);
        break;
      }
      case 'raid':
        sfx('raid');
        showHint('raid');
        break;
      case 'stolen':
        sfx('hit');
        buzz(40);
        break;
      case 'whip':
        banner(t('whip'), 'gold', t('whipSub'));
        sfx('whip');
        setTimeout(() => sfx('milestone'), 120);
        flash('gold');
        buzz([20, 30, 60]);
        break;
      case 'golden':
        unlock('golden');
        flash('gold');
        banner(t('golden'), 'gold', '+' + ev.n);
        sfx('chest');
        sfx('milestone');
        buzz([30, 40, 30]);
        updateCoins();
        break;
      case 'chest':
        flash('gold');
        floatText('+' + ev.v + ' ₸', ev.x, 2.2, ev.d, 'gold huge');
        sfx('chest');
        updateCoins();
        break;
      case 'recruit':
        if (now - lastRecruitSfx > 70) { sfx('recruit'); lastRecruitSfx = now; }
        if (!recruitAcc.n) recruitAcc.t = now;
        recruitAcc.n++; recruitAcc.x = ev.x; recruitAcc.d = ev.d;
        popTag(herdTag);
        break;
      case 'loss':
        if (ev.kind !== 'wolf' && ev.kind !== 'stolen' && now - lastLossSfx > 120) { sfx(ev.kind === 'fall' ? 'fall' : 'hit'); lastLossSfx = now; buzz(20); }
        if (ev.kind === 'stolen') { if (!stolenAcc.n) stolenAcc.t = now; stolenAcc.n += ev.n; stolenAcc.x = ev.x; stolenAcc.d = ev.d; }
        else if (ev.n > 0) floatText('−' + ev.n, ev.x, 1.8, ev.d, 'bad');
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
      case 'clash-hit': buzz([40, 30, 60]); flash('bad'); break;
      case 'combo':
        if (ev.n >= 5) unlock('combo5');
        floatText(t('combo', { n: ev.n }) + '  +' + ev.bonus + ' ₸', run.cx, 4.6, ev.d + 2, 'gold combo');
        sfx('combo', ev.n);
        updateCoins();
        break;
      case 'clash-start':
        banner(t('clash'), 'clash', run.count + ' : ' + run.rival.count);
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
        flash('gold');
        resultIn = 1.4;
        break;
      case 'lose':
        sfx('lose');
        resultIn = 1.3;
        break;
    }
  }
  run.events.length = 0;
  flushRecruits(now);
}

function checkUpcomingHints() {
  const front = run.front;
  for (const it of run.items) {
    if (it.done) continue;
    const d = it.d ?? it.d0;
    if (d - front > 45) break;
    if (d < front) continue;
    if (it.type === 'wild') showHint(it.golden ? 'golden' : 'wild');
    else if (it.type === 'whip') showHint('whip');
    else if (it.type === 'gate' && it.swap) showHint('swap');
    else if (it.type === 'gate' && (it.left?.op === '?' || it.right?.op === '?')) showHint('mystery');
    else if (it.type === 'wolf') showHint('wolf');
    else if (it.type === 'pit') showHint('pit');
    else if (it.type === 'fence') showHint('fence');
  }
  if (run.finishD - front < 60 && L.n <= 2) showHint('clash');
}

// реклама только между забегами: не после самого первого и не на итогах, где уже смотрели «×2»
let adWatched = false;
function adBreak() { if (save.played >= 2 && !adWatched && !adBusy) portalInterstitial(); }

// «×2 монеты за рекламу» — игрок сам решает; награда одна на итоги
let adBusy = false;
function offerDouble(got) {
  const btn = $('resAd');
  adWatched = false;
  const show = !!PORTAL_KIND && portalRewardedOk() && got > 0 && !AUTO;
  btn.classList.toggle('hidden', !show);
  btn.disabled = false;
  btn.classList.remove('done');
  btn.querySelector('span').textContent = t('adX2');
  if (!show) return;
  const mine = ++resultId;
  btn.onclick = () => {
    if (adBusy || btn.disabled || state !== 'result' || mine !== resultId) return;
    sfx('click');
    adBusy = true;
    btn.disabled = true;
    portalRewarded(
      () => {
        save.coins += got;
        S.store(save);
        adWatched = true;
        if (state !== 'result' || mine !== resultId) return;
        const b = $('resCoins').querySelector('b');
        b.textContent = '+' + fmt(Number(b.dataset.v || 0) + got);
        $('hudCoins').querySelector('b').textContent = fmt(save.coins);
        btn.classList.add('done');
        btn.querySelector('span').textContent = t('adX2Got');
        sfx('coin');
      },
      () => {
        adBusy = false;
        if (!adWatched && mine === resultId) btn.disabled = false;
      },
    );
  };
}
let resultId = 0;

function showResult() {
  if (state !== 'play') return;
  state = 'result';
  setTimeout(loadWolfLate, 1200); // после того как монеты долетят
  const res = run.result;
  portalGameplay(false, res.win ? 'win' : 'lose');
  if (res.win) portalHappy();
  track('level_end', { level: daily ? 0 : L.n, daily: daily ? 1 : 0, win: res.win ? 1 : 0, herd: peak, mult: res.mult || 0, played: save.played + 1 });
  const firstDaily = daily && res.win && save.dailyWin !== dailyKey;
  const rL = levelOverride !== null && !daily ? { ...L, base: Math.min(L.base, 40 + save.lvl * 10) } : L; // ?level не печатает деньги
  const got = reward(rL, res, save.up.income) * (firstDaily ? 2 : 1);
  const coinsBefore = save.coins;
  save.coins += got;
  save.played++;
  save.best = Math.max(save.best, peak);
  let stars = 0, oldStars = 0;
  if (res.win && daily) { if (save.dailyWin !== S.dayKey()) save.dailyWin = dailyKey; stars = S.starsFor(res.mult); }
  else if (res.win) {
    stars = S.starsFor(res.mult);
    oldStars = Number(save.stars[L.n]) || 0;
    if (levelOverride === null) save.stars[L.n] = Math.max(oldStars, stars);
    if (levelOverride === null) save.lvl++; // уровень из ссылки не двигает настоящий прогресс
  }
  S.store(save);
  if (res.win) {
    if (stars === 3 && !daily && levelOverride === null) unlock('stars3');
    if (!run.lostAny) unlock('noloss');
    if (L.boss) unlock('boss');
    if (daily) unlock('daily');
  }
  if (save.lvl >= 10) unlock('lvl10');
  if (save.lvl >= 25) unlock('lvl25');
  // за достижения на итогах тоже начислено — показываем общую сумму, иначе счётчик «прыгает»
  const gained = save.coins - coinsBefore;
  const achBonus = gained - got;
  if (levelOverride !== null && res.win && !daily) levelOverride = null;
  lastShare = { win: res.win, mult: res.mult, stars, peak, n: L.n, daily, boss: L.boss };
  $('resShare').classList.toggle('hidden', !res.win || PORTAL);
  $('hud').classList.add('result-mode');
  $('hudCoins').querySelector('b').textContent = fmt(coinsBefore);
  clearLabels();
  const r = $('result');
  r.classList.remove('hidden');
  r.classList.toggle('win', res.win);
  $('resT').textContent = res.win ? t('win') : t('lose');
  $('resSub').textContent = res.win ? t('best', { n: peak }) : run.rival.count < run.rival.start ? t('rivalWon', { n: run.rival.count }) : t('lostWay');
  $('resMult').textContent = (res.win ? '×' + res.mult + (L.boss || firstDaily ? ' · ×2' : '') : '') + (achBonus > 0 ? '  🏆 +' + achBonus : '');
  // проиграл, но хватает на улучшение — зовём в меню улучшаться
  const canUp = !res.win && ['herd', 'income', 'leader'].some((k) => save.up[k] < S.UPS[k].max && save.coins >= S.upCost(k, save.up[k]));
  r.dataset.up = canUp ? '1' : '';
  $('resNext').textContent = res.win ? t('next') : canUp ? t('upgrade') : t('retry');
  $('resMenu').textContent = t('menu');
  $('resShare').querySelector('span').textContent = t('share');
  // счётчик монет бежит
  const b = $('resCoins').querySelector('b');
  const t0 = performance.now();
  const tickC = () => {
    const k = Math.min(1, (performance.now() - t0) / 700);
    if (adWatched) return; // удвоили во время счёта — число уже итоговое
    b.textContent = '+' + fmt(gained * k);
    if (k < 1) requestAnimationFrame(tickC);
  };
  b.dataset.v = gained;
  offerDouble(got);
  tickC();
  // звёзды по одной
  const sr = $('resStars');
  sr.innerHTML = res.win ? [1, 2, 3].map((i) => `<i class="${i <= stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.22}s">★</i>`).join('') : '';
  if (res.win) for (let i = 1; i <= stars; i++) setTimeout(() => { if (state === 'result') sfx('step', i * 2); }, 250 + i * 220);
  // монеты летят в счётчик
  if (gained > 0) setTimeout(() => { if (state === 'result') flyCoins(Math.min(12, 4 + Math.round(gained / 60)), coinsBefore, gained); }, 400);
  prewarm(curLvl());
  prewarm(0, { day: dayIndex(), diff: peekDailyDiff() });
  if (AUTO) setTimeout(() => { if (state === 'result') { showMenu(); setTimeout(startLevel, 300); } }, 1200);
}

function flyCoins(n, base, got) {
  const from = $('resCoins').getBoundingClientRect();
  const to = $('hudCoins').getBoundingClientRect();
  let arrived = 0;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('span');
    c.className = 'coin fly';
    c.style.left = from.left + 20 + Math.random() * 40 + 'px';
    c.style.top = from.top + Math.random() * 20 + 'px';
    c.style.setProperty('--dx', to.left + 18 - parseFloat(c.style.left) + 'px');
    c.style.setProperty('--dy', to.top + 6 - parseFloat(c.style.top) + 'px');
    c.style.animationDelay = i * 0.06 + 's';
    document.getElementById('stage').appendChild(c);
    c.addEventListener('animationend', () => {
      c.remove();
      sfx('coin');
      arrived++;
      if (state !== 'result') return;
      const hc = $('hudCoins');
      hc.querySelector('b').textContent = fmt(arrived >= n ? save.coins : base + Math.round((got * arrived) / n));
      hc.classList.remove('bump'); void hc.offsetWidth; hc.classList.add('bump');
    });
  }
}

// —— «Поделиться»: карточка с кадром забега ——
let lastShare = null;
async function shareCard() {
  if (!lastShare) return;
  shareBlob = null; // не скачать карточку прошлого забега, если новая не нарисовалась
  sfx('click');
  try {
    world.render();
    const src = world.renderer.domElement;
    const W = 1200, H = 630, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const k = Math.max(W / src.width, H / src.height);
    g.drawImage(src, (W - src.width * k) / 2, (H - src.height * k) / 2, src.width * k, src.height * k);
    const gr = g.createLinearGradient(0, H * 0.35, 0, H);
    gr.addColorStop(0, 'rgba(10,6,2,0)'); gr.addColorStop(1, 'rgba(10,6,2,0.85)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.textAlign = 'left';
    g.font = "400 88px 'Russo One'"; g.fillStyle = '#fff';
    g.shadowColor = '#b5302a'; g.shadowOffsetY = 6; g.fillText(t('title').toUpperCase(), 56, 120); g.shadowColor = 'transparent';
    g.font = "800 30px Rubik"; g.fillStyle = '#ffe9b0';
    g.fillText(lastShare.daily ? t('daily_run') : (lastShare.boss ? t('boss') + ' · ' : '') + t('level') + ' ' + lastShare.n, 60, 168);
    g.font = "400 96px 'Russo One'"; g.fillStyle = '#ffc21a';
    g.fillText('★'.repeat(lastShare.stars || 0) + '☆'.repeat(3 - (lastShare.stars || 0)), 56, H - 170);
    g.font = "400 54px 'Russo One'"; g.fillStyle = '#fff';
    g.fillText(t('shareHerd', { n: lastShare.peak }) + '  ·  ×' + lastShare.mult, 60, H - 92);
    g.font = "700 28px Rubik"; g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillText('gamemetric.dev/tabun', 62, H - 44);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
    if (!blob) throw new Error('no image');
    shareBlob = blob;
    const url = 'https://gamemetric.dev/tabun/';
    const text = t('shareText', { n: lastShare.peak, horses: getLang() === 'ru' ? plural(lastShare.peak, 'конь', 'коня', 'коней') : '' });
    let file = null;
    try { file = new File([blob], 'tabun.jpg', { type: 'image/jpeg' }); } catch { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text, url });
    else if (navigator.share) await navigator.share({ text, url });
    else downloadShare(blob);
  } catch (e) {
    // отмена — ничего; любая другая ошибка — скачиваем картинку, чтобы кнопка не была «мёртвой»
    if (e?.name !== 'AbortError' && shareBlob) downloadShare(shareBlob);
  }
}
let shareBlob = null;
function downloadShare(blob) {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'tabun.jpg';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch { /* */ }
}

// —— ввод ——
function bindInput() {
  const st = $('stage');
  // касание пальцем (pointerdown) не считается жестом для звука на Android/iOS — разблокируем и по отпусканию
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click']) document.addEventListener(ev, () => initAudio(), { capture: true });
  st.addEventListener('contextmenu', (e) => e.preventDefault());
  st.addEventListener('pointerdown', (e) => {
    if (state !== 'play') return;
    if (e.target.closest('button')) return;
    initAudio();
    if (drag) return; // второй палец не перехватывает управление
    if (e.pointerType === 'mouse' && e.button !== 0) return; // правая/средняя кнопка — не руль
    drag = { x: e.clientX, cx: targetX, id: e.pointerId };
    try { st.setPointerCapture(e.pointerId); } catch { /* */ }
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || state !== 'play' || e.pointerId !== drag.id) return;
    const w = Math.min(window.innerWidth, 640);
    targetX = clampX(drag.cx + ((e.clientX - drag.x) / w) * 13);
    if (dragHintOn && Math.abs(e.clientX - drag.x) > 25) { dragHintOn = false; $('dragHint').classList.add('hidden'); }
  });
  const up = (e) => { if (!drag || e.pointerId === drag.id) drag = null; };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    const modalOpen = !$('modal').classList.contains('hidden');
    if (e.code === 'Escape' && modalOpen) {
      if (state === 'pause') $('mResume')?.click(); else if ($('mClose')) $('mClose').click(); else closeModal();
      return;
    }
    if (e.code === 'KeyP' && state === 'pause' && modalOpen) { $('mResume')?.click(); return; }
    if (e.code === 'KeyP' || (e.code === 'Escape' && !PORTAL)) { if (state === 'play') pause(); }
    initAudio();
    if (state === 'play' && /^(Arrow|Space)/.test(e.code)) e.preventDefault(); // в портале не прокручивать страницу
    const onControl = e.target && e.target.closest && e.target.closest('button, a, input');
    if ((e.code === 'Space' || e.code === 'Enter') && state === 'menu' && !modalOpen && !onControl) { e.preventDefault(); startLevel(); }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else if (state === 'menu') { const ok = save.dailyWin === S.dayKey(); $('dailyBtn').querySelector('.badge').textContent = ok ? '✓' : '×2'; }
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
}
const clampX = (x) => Math.max(-HALF + 0.4, Math.min(HALF - 0.4, x));

function bindUI() {
  $('playBtn').onclick = () => startLevel();
  $('pauseBtn').onclick = () => { sfx('click'); pause(); };
  $('setBtn').onclick = () => { sfx('click'); showSettings(false); };
  $('coatsBtn').onclick = () => { sfx('click'); showCoats(); };
  $('achBtn').onclick = () => { sfx('click'); showAch(); };
  $('resShare').onclick = () => shareCard();
  $('dailyBtn').onclick = () => { sfx('click'); daily = true; prepare(); startLevel(); };
  $('resNext').onclick = () => {
    sfx('click');
    adBreak();
    if (run?.result?.win) showMenu();
    else if ($('result').dataset.up) { showMenu(); for (const el of $('ups').children) if (!el.classList.contains('poor')) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash', 'glow'); } }
    else startLevel();
  };
  $('resMenu').onclick = () => { sfx('click'); adBreak(); showMenu(); };
}

// —— цикл ——
let fpsAcc = 0, fpsN = 0, fpsT = 0, lowSteps = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.1, (now - (lastT || now)) / 1000);
  lastT = now;
  if (!world || !run) return;
  portalGameplay(state === 'play' && !document.hidden); // портал слышит только смену
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
    music(run.state === 'run' || run.state === 'clash' || run.state === 'ladder' ? 'run' : 'off');
    if (resultIn > 0 && (resultIn -= rdt) <= 0) { resultIn = 0; showResult(); }
  } else if (state === 'result') {
    run.step(rdt, run.cx);
    run.events.length = 0;
    hooves(0, false, rdt);
    music('off');
  } else { hooves(0, false, rdt); music(state === 'menu' ? 'menu' : 'off'); }
  world.update(run, state === 'pause' ? 0 : rdt * (state === 'play' ? timeScale : 1), state === 'menu');
  if (state === 'play') placeTags();
  world.render();
  // качество: если кадры тяжёлые — меньше пикселей
  fpsAcc += rdt; fpsN++;
  if (fpsAcc > 2.5) {
    const fps = fpsN / fpsAcc;
    fpsT = fps;
    // тяжело: сначала гасим тени, потом сужаем круг детальных коней, потом уменьшаем чёткость
    if ((save.quality || 'auto') !== 'auto') { /* фиксированное качество — не трогаем */ }
    else if (fps < 42 && world.shadowsOn) world.setShadows(false);
    else if (fps < 42 && (world.lodNear ?? 22) > 10) { world.lodNear = (world.lodNear ?? 22) - 6; for (const p of [world.gallop, world.idle, world.eat]) p.setNear?.(world.lodNear); }
    else if (fps < 42 && world.pixelRatio > 1.05) { lowSteps++; world.setPixelRatio(Math.max(1, world.pixelRatio - 0.35)); } // ниже 1 картинка превращается в кашу, а на слабом процессоре пиксели почти не помогают
    fpsAcc = 0; fpsN = 0;
  }
}

// качество графики: «авто» подстраивается само, остальные — фиксированные
function applyQuality() {
  const q = save.quality || 'auto';
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const set = (shadows, near, pr) => {
    world.setShadows(shadows && !P.has('noshadow'));
    world.lodNear = near;
    for (const p of [world.gallop, world.idle, world.eat]) p.setNear?.(near);
    world.setPixelRatio(pr);
  };
  if (q === 'high') set(true, 26, dpr);
  else if (q === 'mid') set(false, 14, Math.min(dpr, 1.25));
  else if (q === 'low') set(false, 6, Math.min(dpr, 0.9));
  else set(true, 22, dpr);
}

// —— для тестов ——
window.__tabun = {
  get state() { return state; }, get run() { return run; }, get save() { return save; }, get world() { return world; },
  get fps() { return fpsT; },
  start: startLevel, menu: showMenu, auto: autoTarget,
  setSave(s) { save = { ...save, ...s }; S.store(save); },
  layout() {
    const sel = ['#pauseBtn', '#hudCoins', '#prog', '#setBtn', '#achBtn', '#allGames', '#resShare', '#menuCoins', '#logo', '#lvlRow', '#playBtn', '#ups', '#coatsBtn', '#dailyBtn', '#aulInfo', '#starTotal', '#upsTitle', '#resT', '#resCoins', '#resNext', '#resMenu', '#resAd', '#hint'];
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

function loadTrouble(msg) {
  const s = $('loadS');
  if (!s) return;
  s.textContent = msg + ' ';
  const btn = document.createElement('button');
  btn.className = 'pill'; btn.style.cssText = 'margin-top:10px;background:#3a2a14;color:#fff';
  btn.textContent = t('retry');
  btn.onclick = () => location.reload();
  s.appendChild(document.createElement('br'));
  s.appendChild(btn);
}

// уровни считаются в фоновом потоке заранее, чтобы меню и старт не подвисали
let genWorker = null;
try {
  genWorker = new Worker(new URL('./genworker.js', import.meta.url), { type: 'module' });
  genWorker.onmessage = ({ data }) => { if (data && data.L) cacheLevel(data.key, data.L); };
  genWorker.onerror = () => { genWorker = null; };
} catch { genWorker = null; }
function prewarm(n, dailyArgs) {
  if (!genWorker) return;
  try { genWorker.postMessage(dailyArgs ? { daily: true, ...dailyArgs } : { n }); } catch { /* */ }
}

let loadSlowT = 0;
boot().catch((e) => { console.error(e); clearTimeout(loadSlowT); loadTrouble(t('loadErr')); });
