import { step, moving, saka, predict, kidFeet } from './physics.js';
import { newKon, startThrow, knock, settle, finish, THROWS, landing, groundSpeed, throwFromHand, nextThrower, agaPlan, HOME, AWAY } from './game.js';
import { PEOPLE, AGAS, CHAPTERS, BARKS } from './story.js';
import * as S from './scene.js';
import * as A from './audio.js';
import { store, el, clamp, rng } from './util.js';
import { voiceFile } from './voice.js';
import { PORTAL, portalInit, portalLang, gameplay, happytime, onPortalMute, loading } from './portal.js';

const cv = document.getElementById('game');
const c = cv.getContext('2d');
const $ = (id) => document.getElementById(id);
const ui = $('ui');

// ---------- language: Russian for the region, English for everyone else ----------
const q = new URLSearchParams(location.search);
// a browser set to English in Almaty is still a Russian speaker: the time zone tells the region
const REGION_TZ = /^(Asia\/(Almaty|Qostanay|Qyzylorda|Aqtobe|Aqtau|Atyrau|Oral|Bishkek|Tashkent|Samarkand|Dushanbe|Ashgabat|Yekaterinburg|Omsk|Novosibirsk|Barnaul|Tomsk|Novokuznetsk|Krasnoyarsk|Irkutsk|Chita|Yakutsk|Vladivostok|Magadan|Sakhalin|Kamchatka|Anadyr|Baku|Tbilisi|Yerevan)|Europe\/(Moscow|Kaliningrad|Samara|Volgograd|Saratov|Ulyanovsk|Astrakhan|Kirov|Minsk|Kiev|Kyiv|Chisinau|Simferopol))$/;
const regionTz = (() => {
  try {
    return REGION_TZ.test(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  } catch {
    return false;
  }
})();
let lang = q.get('lang') === 'en' ? 1 : q.get('lang') === 'ru' ? 0 : store.get('asyk.lang', /^(ru|kk|ky|be|uz|tg|uk)\b/i.test(navigator.language || '') || regionTz ? 0 : 1);
const T = (ru, en) => (lang ? en : ru);
// ?shot: a clean frame for covers and film start frames — no hand, no shouts, no hints
const SHOT = q.has('shot');
const pick = (pair) => (Array.isArray(pair) ? pair[lang] || pair[0] : pair);

let g = null;
let mode = null; // { story: true, ch, ki } or { free: true }
let state = 'load'; // load | menu | talk | aim | flight | roll | reveal | tally | agaAim | overWait | over
let phase = 0; // seconds in the current state
let clock = 0;
let drag = null;
let aim = null;
let flight = null;
let still = 0;
let freeze = 0; // hit-stop on a hard first touch
let slow = 0; // slow motion when bones fly out one after another
let shake = 0;
let firstTouch = false;
let shown = 0; // score shown in the bar, catches up with the real one
let thrower = 'me';
let aga = null; // the rival in a duel: { id, x, y, pose, talking }
let agaShot = null;
const dust = [];
const pops = [];
const bubbles = [];
const kids = S.makeKids();
const life = S.makeLife();
const rand = rng((Math.random() * 1e9) | 0);
// the throwing hand: offsets in px, cocked rotation, and how far it has sunk out of view
const hand = { dx: 0, dy: 0, rot: 0, scale: 1, open: false, hidden: 1 };
let best = store.get('asyk.best', 0);
let taught = store.get('asyk.taught', 0);
let story = store.get('asyk.story', { done: {} });

const FACES = ['alshy', 'buk', 'taike'];
// the kids' ids in story.js by their place in the yard
const KID_IDS = ['timur', 'bekzhan', 'asem', 'erke', 'askar'];
const LANG_CODE = () => (lang ? 'en' : 'ru');

function layout() {
  const wasTall = S.view.w ? S.tall() : null;
  S.resize(cv);
  // turning the phone moves the kids (and their feet) to where they can be seen
  if (g && wasTall !== null && wasTall !== S.tall()) placeKids(!!g.duel, false);
}
window.addEventListener('resize', () => {
  if (state !== 'load') layout();
});

// ---------- hud ----------
const ICON_ON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function soundIcon() {
  $('soundBtn').innerHTML = A.sound.on ? ICON_ON : ICON_OFF;
}
$('soundBtn').addEventListener('click', () => {
  A.setSound(!A.sound.on);
  soundIcon();
});
soundIcon();

let paused = null;
$('menuBtn').addEventListener('click', () => {
  A.audioInit();
  if (paused || state === 'over' || state === 'load') return;
  paused = state;
  state = 'paused';
  drag = aim = null;
  panel([
    el('h2', null, T('Пауза', 'Paused')),
    button(T('Продолжить', 'Continue'), resume),
    button(mode && mode.story ? T('Главы', 'Chapters') : T('В меню', 'Menu'), () => {
      paused = null;
      $('talk').hidden = true;
      A.stopVoice();
      if (mode && mode.story) {
        menu();
        storyMenu();
      } else menu();
    }, 'btn second'),
    button(lang ? 'Русский' : 'English', () => {
      lang = 1 - lang;
      store.set('asyk.lang', lang);
      resume();
    }, 'btn ghost'),
  ]);
});
function resume() {
  ui.innerHTML = '';
  state = paused || 'aim';
  paused = null;
}

function hudThrows() {
  const box = $('hudThrows');
  const n = Math.max(THROWS, g.throws);
  box.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const t = el('i');
    if (i >= g.throws) t.className = 'spent';
    else if (i >= THROWS) t.className = 'bonus';
    box.append(t);
  }
}

const agaName = () => (aga ? pick(PEOPLE[aga.id].name) : '');
function hudScore() {
  if (g.duel) {
    $('hudKon').textContent = `${T('Ты', 'You')} ${Math.round(shown)} : ${g.duel.score} ${agaName()}`;
    $('hudScore').textContent = `· ${T('у него бросков', 'his throws')}: ${g.duel.throws}`;
    $('hudBar').style.width = `${clamp(shown / Math.max(1, shown + g.duel.score), 0, 1) * 100}%`;
  } else {
    $('hudKon').textContent = mode && mode.story ? pick(CHAPTERS[mode.ch].title) : `${T('Кон', 'Kon')} ${g.k}`;
    $('hudScore').textContent = `${Math.round(shown)} / ${g.target}`;
    $('hudBar').style.width = `${clamp(shown / g.target, 0, 1) * 100}%`;
  }
}

function turnPanel(note) {
  const t = g.turn;
  $('turnChips').textContent = t ? t.chips : 0;
  $('turnMult').textContent = t ? t.mult : 1 + g.chain;
  if (note !== undefined) $('turnNote').textContent = note;
}
function bump(id) {
  const b = $(id);
  b.classList.remove('bump');
  void b.offsetWidth;
  b.classList.add('bump');
  setTimeout(() => b.classList.remove('bump'), 130);
}

let hintTimer = 0;
function hint(text, ms = 3200) {
  const h = $('hint');
  h.textContent = text;
  h.classList.add('show');
  clearTimeout(hintTimer);
  if (ms) hintTimer = setTimeout(() => h.classList.remove('show'), ms);
}
const hideHint = () => $('hint').classList.remove('show');

// ---------- screens ----------
function panel(children, cls = '') {
  ui.innerHTML = '';
  const p = el('div', 'panel ' + cls);
  p.append(...children);
  ui.append(p);
  return p;
}
function button(text, fn, cls = 'btn') {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', () => {
    A.audioInit();
    A.ensureAmbience();
    fn();
  });
  return b;
}

function setKids(duel) {
  S.kidSpots(duel).forEach(([x, y], i) => Object.assign(kids[i], { x, y, pose: 'watch', next: null, talking: false }));
}

// move the kids and the feet bones bounce off
function placeKids(duel, reset = true) {
  S.kidSpots(duel).forEach(([x, y], i) => {
    Object.assign(kids[i], { x, y });
    if (reset) Object.assign(kids[i], { pose: 'watch', next: null, talking: false });
    const feet = g.w.bodies.find((b) => b.kind === 'kid' && b.ki === kids[i].i);
    if (feet) Object.assign(feet, { x, y });
  });
}

// cfg: { k, target, wind, duel, yard }
function freshKon(cfg) {
  S.setYard(cfg.yard || 'yard', cv);
  setKids(!!cfg.duel);
  g = newKon(cfg.k || 1, cfg.seed, { target: cfg.target, wind: cfg.wind, duel: cfg.duel });
  for (const kid of kids) {
    const feet = kidFeet(kid.x, kid.y);
    feet.ki = kid.i;
    g.w.bodies.push(feet);
  }
  aga = null;
  if (cfg.duel) {
    aga = { id: cfg.duel.aga, x: AWAY.x + 2, y: AWAY.y - 9, pose: 'watch', talking: false };
    const feet = kidFeet(aga.x, aga.y);
    feet.ki = 'aga';
    g.w.bodies.push(feet);
  }
  faces();
  thrower = 'me';
}
// bones laid out in the kon stand on their usual sides
function faces() {
  for (const b of g.w.bodies) if (b.kind === 'asyk' && !b.face) b.face = FACES[b.id % 3];
}

function begin() {
  ui.innerHTML = '';
  shown = 0;
  pops.length = 0;
  dust.length = 0;
  bubbles.length = 0;
  $('hud').hidden = false;
  $('turn').hidden = false;
  hudThrows();
  hudScore();
  turnPanel('');
}

function aimNow() {
  state = 'aim';
  phase = 0;
  if (!taught) hint(T('Потяни вниз и отпусти', 'Pull down and let go'), 0);
  else if (g.w.wind) hint(g.w.wind > 0 ? T('Ветер тянет вправо →', 'The wind pulls right →') : T('← Ветер тянет влево', '← The wind pulls left'));
}

function menu() {
  state = 'menu';
  mode = null;
  A.ambience(true);
  $('hud').hidden = true;
  $('turn').hidden = true;
  freshKon({ k: 1, seed: 1986 });
  hand.hidden = 0;
  const kids2 = [
    el('h1', 'logo', 'Асық'),
    el('p', 'sub', T('Лето 1987-го. Аул под горами, вечер, соседские ребята уже выложили кон.', 'Summer 1987. A village under the mountains, evening; the kids next door have set up the kon.')),
    button(T('Сюжет', 'Story'), storyMenu),
    button(T('Свободная игра', 'Free play'), () => startFree(1), 'btn second'),
  ];
  if (best > 1) kids2.push(el('p', 'sub', T(`Лучший результат: кон ${best}`, `Best: kon ${best}`)));
  const langBtn = button(lang ? 'Русский' : 'English', () => {
    lang = 1 - lang;
    store.set('asyk.lang', lang);
    menu();
  }, 'btn ghost');
  kids2.push(langBtn);
  panel(kids2);
}

// ---------- story ----------
const doneList = (ch) => story.done[CHAPTERS[ch].id] || [];
const chapterDone = (ch) => CHAPTERS[ch].kons.length > 0 && CHAPTERS[ch].kons.every((_, i) => doneList(ch)[i]);
const unlocked = (ch) => ch === 0 || chapterDone(ch - 1);

function storyMenu() {
  const list = el('div', 'chapters');
  CHAPTERS.forEach((ch, i) => {
    const open = unlocked(i) && !ch.soon;
    const card = el('button', 'chapter' + (open ? '' : ' locked'));
    card.type = 'button';
    card.append(el('b', null, `${i + 1}. ${pick(ch.title)}`), el('span', null, pick(ch.sub)));
    if (ch.kons.length) {
      const dots = el('i', 'dots');
      ch.kons.forEach((k, j) => dots.append(el('em', doneList(i)[j] ? 'on' : '', k.duel ? '★' : '●')));
      card.append(dots);
    }
    if (open)
      card.addEventListener('click', () => {
        A.audioInit();
        const next = ch.kons.findIndex((_, j) => !doneList(i)[j]);
        playStory(i, next < 0 ? 0 : next);
      });
    list.append(card);
  });
  panel([el('h2', null, T('Лето 1987-го', 'Summer of 1987')), list, button(T('Назад', 'Back'), menu, 'btn ghost')], 'wide');
}

async function playStory(ci, ki) {
  const ch = CHAPTERS[ci];
  const kon = ch.kons[ki];
  mode = { story: true, ch: ci, ki };
  ui.innerHTML = '';
  // the school yard and the agas may still be on their way
  await S.extrasReady;
  if (ki === 0 && ch.video && !story.seen?.[ch.id]) {
    await playVideo(ch.video);
    story.seen = { ...(story.seen || {}), [ch.id]: true };
    store.set('asyk.story', story);
  }
  freshKon({ k: ki + 1, target: kon.target, wind: kon.wind, duel: kon.duel, yard: ch.yard });
  begin();
  state = 'talk';
  if (ki === 0 || kon.duel) $('hint').classList.remove('show');
  await talk(kon.intro || []);
  aimNow();
}

function startFree(k) {
  mode = { free: true };
  freshKon({ k });
  begin();
  aimNow();
  if (taught && k === 1) hint(T(`Набери ${g.target} очков`, `Score ${g.target} points`));
}

// ---------- dialogue ----------
let talkDone = null;
function talk(lines) {
  return new Promise((resolve) => {
    if (!lines.length) return resolve();
    const box = $('talk');
    const pic = $('talkPic');
    let i = -1;
    let typing = 0;
    let full = '';
    let shownChars = 0;
    const who = (id) => (PEOPLE[id].kid != null ? kids[PEOPLE[id].kid] : PEOPLE[id].aga && aga && aga.id === PEOPLE[id].aga ? aga : null);
    const next = () => {
      if (typing) {
        // a tap while typing shows the whole line
        shownChars = full.length;
        $('talkText').textContent = full;
        clearInterval(typing);
        typing = 0;
        return;
      }
      if (i >= 0) {
        const w = who(lines[i][0]);
        if (w) w.talking = false;
      }
      A.stopVoice();
      i++;
      if (i >= lines.length) {
        A.stopVoice();
        box.hidden = true;
        talkDone = null;
        resolve();
        return;
      }
      const [id, ru, en] = lines[i];
      const p = PEOPLE[id];
      const w = who(id);
      if (w) w.talking = true;
      pic.innerHTML = '';
      pic.append(S.portrait({ ...p, name: pick(p.name) }, 40));
      $('talkName').textContent = pick(p.name);
      full = lang ? en : ru;
      shownChars = 0;
      $('talkText').textContent = '';
      box.hidden = false;
      const lineNo = i;
      let voiced = false;
      const type = (ms) => {
        clearInterval(typing);
        typing = setInterval(() => {
          shownChars++;
          $('talkText').textContent = full.slice(0, shownChars);
          // no recording: a soft blip per syllable instead of a voice
          if (!voiced && shownChars % 2 === 0 && full[shownChars] !== ' ') A.blip(p.aga ? 0.8 : p.kid === 2 ? 1.35 : 1.1);
          if (shownChars >= full.length) {
            clearInterval(typing);
            typing = 0;
          }
        }, ms);
      };
      type(24);
      A.voice(voiceFile(LANG_CODE(), id, full)).then((v) => {
        if (!v || i !== lineNo) return;
        voiced = true;
        // type along with the voice
        if (typing) type(Math.max(18, ((v.duration * 1000) / Math.max(1, full.length - shownChars)) * 0.85));
      });
    };
    talkDone = next;
    next();
  });
}
$('talk').addEventListener('click', () => talkDone && talkDone());

// ---------- the chapter film ----------
function playVideo(src) {
  return new Promise((resolve) => {
    const v = $('film');
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      v.pause();
      $('filmBox').hidden = true;
      resolve();
    };
    fetch(src, { method: 'HEAD' })
      .then((r) => {
        if (!r.ok) return end();
        v.src = src;
        $('filmBox').hidden = false;
        v.onended = end;
        v.onerror = end;
        $('filmSkip').onclick = end;
        v.play().catch(end);
      })
      .catch(end);
  });
}

// ---------- end of a kon ----------
function over() {
  state = 'over';
  $('turn').hidden = true;
  if (mode && mode.story) return storyOver();
  if (g.result === 'win') {
    happytime();
    best = Math.max(best, g.k + 1);
    store.set('asyk.best', best);
    A.win();
    kids.forEach((k, i) => S.setPose(k, 'cheer', clock, 4, i * 0.08));
    panel([
      el('h2', null, T('Кон алынды!', 'Kon won!')),
      stats([
        [T('Очки', 'Score'), `${g.score} / ${g.target}`],
        [T('Осталось бросков', 'Throws left'), g.throws],
      ]),
      button(`${T('Кон', 'Kon')} ${g.k + 1}`, () => startFree(g.k + 1)),
      button(T('В меню', 'Menu'), menu, 'btn ghost'),
    ]);
  } else {
    A.lose();
    best = Math.max(best, g.k);
    store.set('asyk.best', best);
    kids.forEach((k, i) => S.setPose(k, 'sad', clock, 4, i * 0.06));
    panel([
      el('h2', null, T('Броски кончились', 'Out of throws')),
      stats([
        [T('Очки', 'Score'), `${g.score} / ${g.target}`],
        [T('Не хватило', 'Short by'), g.target - g.score],
        [T('Дошёл до', 'Reached'), `${T('кона', 'kon')} ${g.k}`],
      ]),
      button(T('Заново с первого кона', 'Start over'), () => startFree(1)),
      button(T('В меню', 'Menu'), menu, 'btn ghost'),
    ]);
  }
}

async function storyOver() {
  const { ch, ki } = mode;
  const kon = CHAPTERS[ch].kons[ki];
  const won = g.result === 'win';
  if (won) {
    happytime();
    A.win();
    kids.forEach((k, i) => S.setPose(k, 'cheer', clock, 3, i * 0.08));
    if (aga) aga.pose = 'sad';
    const d = [...doneList(ch)];
    d[ki] = true;
    story.done = { ...story.done, [CHAPTERS[ch].id]: d };
    store.set('asyk.story', story);
  } else {
    A.lose();
    kids.forEach((k, i) => S.setPose(k, 'sad', clock, 3, i * 0.06));
    if (aga) aga.pose = 'cheer';
  }
  state = 'talk';
  await talk((won ? kon.win : kon.lose) || []);
  state = 'over';
  const score = g.duel ? `${g.score} : ${g.duel.score}` : `${g.score} / ${g.target}`;
  const nextKon = CHAPTERS[ch].kons[ki + 1];
  const nextCh = CHAPTERS[ch + 1];
  const kidsTitle = won ? (g.duel ? T(`${agaName()} побеждён!`, `${agaName()} is beaten!`) : T('Кон алынды!', 'Kon won!')) : T('Не вышло', 'Not this time');
  const btns = [];
  if (won && nextKon) btns.push(button(T('Дальше', 'Next'), () => playStory(ch, ki + 1)));
  else if (won && nextCh && !nextCh.soon) btns.push(button(T(`Глава ${ch + 2}: ${pick(nextCh.title)}`, `Chapter ${ch + 2}: ${pick(nextCh.title)}`), () => playStory(ch + 1, 0)));
  else if (won) btns.push(button(T('Продолжение — зимой', 'To be continued in winter'), storyMenu));
  else btns.push(button(T('Ещё раз', 'Try again'), () => playStory(ch, ki)));
  btns.push(button(T('Главы', 'Chapters'), storyMenu, 'btn ghost'));
  panel([el('h2', null, kidsTitle), stats([[T('Счёт', 'Score'), score]]), ...btns]);
}

function stats(rows) {
  const box = el('div', 'stats');
  for (const [k, v] of rows) {
    const p = el('p');
    p.style.margin = '0';
    p.append(`${k}: `, el('b', null, String(v)));
    box.append(p);
  }
  return box;
}

// ---------- input: pull down to throw, sideways to aim ----------
function aimFrom(dx, dy) {
  const { w, h } = S.view;
  const pull = Math.max(0, dy);
  const power = clamp((pull - 8) / (h * 0.3), 0, 1);
  // slingshot: pulling to the left sends the saka to the right
  const ang = clamp((-dx / (w * 0.45)) * 0.42, -0.42, 0.42);
  return { power, ang, ux: Math.sin(ang), uy: -Math.cos(ang), dx, dy: pull };
}

cv.addEventListener('pointerdown', (e) => {
  A.audioInit();
  A.ensureAmbience();
  if (state === 'talk' && talkDone) return talkDone();
  if (state !== 'aim' || drag || hand.hidden > 0.3) return;
  drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
  try {
    cv.setPointerCapture(e.pointerId);
  } catch {
    /* fine */
  }
});
cv.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  aim = aimFrom(e.clientX - drag.x0, e.clientY - drag.y0);
});
cv.addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (aim && aim.power > 0.05 && state === 'aim') throwSaka();
  drag = null;
  aim = null;
});
cv.addEventListener('pointercancel', (e) => {
  if (drag && e.pointerId === drag.id) drag = aim = null;
});

function handStart() {
  const p = S.handBone(hand);
  return S.unproject(p.x, p.y, 40);
}

function launchFlight(from, origin, ux, uy, power, who) {
  const s = saka(g.w);
  flight = { from, origin, land: landing(power, ux, uy, origin), t: 0, T: 0.3 + 0.08 * (1 - power), power, ux, uy };
  s.tumble = true;
  s.face = null;
  s.owner = who;
  s.x = from.x;
  s.y = from.y;
  s.z = from.z;
  A.whoosh(power);
  state = 'flight';
  phase = 0;
  still = 0;
  firstTouch = false;
}

function throwSaka() {
  startThrow(g, 'me');
  hand.open = true;
  launchFlight(handStart(), HOME, aim.ux, aim.uy, aim.power, 'me');
  hudThrows();
  turnPanel(g.chain ? T(`Цепочка: +${g.chain} к множителю`, `Chain: +${g.chain} to mult`) : '');
  if (!taught) {
    taught = 1;
    store.set('asyk.taught', 1);
    hideHint();
  }
}

// the aga steps up, winds up and throws from beyond the kon
function agaTurn() {
  state = 'agaAim';
  phase = 0;
  agaShot = null;
  bark('agaThrows');
  turnPanel(T(`Бросает ${agaName()}`, `${agaName()} throws`));
  $('turnChips').textContent = 0;
  $('turnMult').textContent = 1 + g.duel.chain;
}

// ---------- effects ----------
function puff(x, y, n, k = 1) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (4 + Math.random() * 10) * k;
    dust.push({ x, y, z: Math.random() * 1.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0.8 + Math.random() * 1.2, grow: 3 + Math.random() * 3, life: 0.6 + Math.random() * 0.5, max: 1.1, a: 0.35, col: '#e6c99c' });
  }
}
function pop(x, y, text, col = '#fff4dc', size = 5, life2 = 1.1, screen = null) {
  pops.push({ x, y, text, col, size, life: life2, max: life2, screen });
}
// a kid shouts something; the same kid does not talk over himself
function bark(kind, who = null) {
  const list = BARKS[kind];
  if (!list) return;
  const free = kids.filter((k) => !bubbles.some((b) => b.who === k));
  const w = who || free[Math.floor(rand() * free.length)];
  if (!w || bubbles.length > 2) return;
  const line = list[Math.floor(rand() * list.length)];
  const text = pick(line);
  bubbles.push({ who: w, text, life: 1.7, max: 1.7 });
  // one shout at a time, never over a dialogue line
  if (w.i != null && state !== 'talk' && clock - lastShout > 1.2) {
    lastShout = clock;
    A.voice(voiceFile(LANG_CODE(), KID_IDS[w.i], text), { stopOthers: false, vol: 0.8 });
  }
}

const SIDE_COL = { alshy: '#ffd36b', taike: '#ffb070', buk: '#fff4dc', shik: '#bfeaa0' };
const kidOf = (body) => kids.find((k) => k.i === body.ki);

function react(t) {
  const now = clock;
  const mine = t.owner !== 'aga';
  if (!mine) {
    // the kids are on your side by now: they groan at his good throws and cheer his misses
    if (t.knocked) {
      aga.pose = 'cheer';
      bark('agaGood');
    } else {
      aga.pose = 'sad';
      kids.forEach((k) => rand() < 0.5 && S.setPose(k, 'cheer', now, 1.4, rand() * 0.2));
      bark('agaMiss');
    }
    return;
  }
  if (aga) aga.pose = t.knocked >= 2 ? 'sad' : 'watch';
  if (t.knocked >= 3) bark('many');
  else if (t.knocked && t.side.id === 'alshy') bark('alshy');
  else if (t.knocked && t.side.id === 'shik') bark('shik');
  else if (t.knocked && t.side.id === 'taike') bark('taike');
  else if (!t.knocked) bark('miss', rand() < 0.6 ? kids[1] : null);
  if (t.outs.some((b) => b.painted)) bark('dyed', kids[3]);
  if (!store.get('asyk.ruleSides', 0) && t.knocked) {
    store.set('asyk.ruleSides', 1);
    hint(T('Сақа легла на сторону: алшы ×3, тәйке ×2, шік — ещё бросок', 'The saka landed on a side: alshy ×3, taike ×2, shik — one more throw'), 5000);
  }
  if (t.knocked >= 2 || (t.knocked && t.side.id === 'alshy')) {
    kids.forEach((k) => S.setPose(k, 'cheer', now, 1.8, rand() * 0.2));
  } else if (t.knocked === 1) {
    const order = [...kids].sort(() => rand() - 0.5);
    order.slice(0, 2).forEach((k) => S.setPose(k, 'cheer', now, 1.5, rand() * 0.15));
  } else {
    // a miss: groans, and the chubby one points and laughs
    kids.forEach((k) => {
      if (k.i === 1 || rand() < 0.6) S.setPose(k, 'sad', now, 1.6, rand() * 0.2);
    });
  }
}

let lastCluck = 0;
let lastShout = -9;
function cluck(vol) {
  if (clock - lastCluck < 1.5) return;
  lastCluck = clock;
  A.sfx('hen', vol);
}

// ---------- loop ----------
function update(dt) {
  clock += dt;
  phase += dt;
  for (let i = dust.length - 1; i >= 0; i--) {
    const p = dust[i];
    p.x += (p.vx + (g ? g.w.wind * 0.6 : 0)) * dt;
    p.y += p.vy * dt;
    p.z = (p.z || 0) + dt * 2;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.r += p.grow * dt;
    if ((p.life -= dt) <= 0) dust.splice(i, 1);
  }
  for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].life -= dt) <= 0) pops.splice(i, 1);
  for (let i = bubbles.length - 1; i >= 0; i--) if ((bubbles[i].life -= dt) <= 0) bubbles.splice(i, 1);
  shake *= Math.pow(0.0015, dt);
  S.updateKids(kids, clock);
  if (aga && aga.pose !== 'watch' && state !== 'over' && state !== 'agaAim' && phase > 2.2) aga.pose = 'watch';
  // anything flying makes the hens run (and complain)
  const danger = g ? g.w.bodies.filter((b) => !b.fixed && Math.hypot(b.vx, b.vy) > 20) : [];
  const dogWas = life.dog.on;
  if (S.updateLife(life, dt, danger)) A.chirp();
  if (life.hens.some((h) => h.run > 0.75)) cluck(0.7);
  else if (rand() < dt / 9) cluck(0.35);
  if (!dogWas && life.dog.on) A.sfx('dog', 0.35);
  if (rand() < dt / 45) A.sfx('rooster', 0.3);
  if (g && g.w.wind && rand() < dt / 7) A.sfx('wind', 0.4);
  // the wind lifts dust off the yard now and then
  if (g && g.w.wind && Math.random() < dt * 3) dust.push({ x: (g.w.wind > 0 ? -10 : 110) + Math.random() * 20, y: 10 + Math.random() * 120, z: 0.5, vx: g.w.wind * 3, vy: 0, r: 1.5, grow: 4, life: 1.6, max: 1.6, a: 0.18, col: '#e9d2a6' });
  updateHand(dt);
  if (g && state !== 'menu' && state !== 'load') {
    shown += (g.score + (state === 'tally' && g.turn && g.turn.owner !== 'aga' ? g.turn.score * Math.min(1, phase / 0.5) : 0) - shown) * Math.min(1, dt * 8);
    hudScore();
  }

  if (state === 'flight') fly(dt);
  else if (state === 'roll') roll(dt);
  else if (state === 'agaAim') {
    if (phase > 0.35 && aga) aga.pose = 'throw';
    if (phase > 0.6 && !agaShot) {
      agaShot = agaPlan(g, rand, AGAS[aga.id].skill);
      startThrow(g, 'aga');
      launchFlight({ x: aga.x + 3, y: aga.y + 4, z: 22 }, AWAY, agaShot.ux, agaShot.uy, agaShot.power, 'aga');
    }
  } else if (state === 'reveal') {
    const s = saka(g.w);
    if (phase < 0.45) s.ang += dt * 16;
    else if (s.tumble) {
      s.tumble = false;
      s.face = g.turn.side.id;
    }
    if (phase > (g.turn.knocked ? 1.0 : 0.75)) {
      state = 'tally';
      phase = 0;
      if (g.turn.score) {
        A.tally(g.turn.score >= 100);
        const mine = g.turn.owner !== 'aga';
        pop(0, 0, `${mine ? '' : agaName() + ' '}+${g.turn.score}`, mine ? '#ffd36b' : '#c9d4e0', mine ? 9 : 7, 1.3, { x: S.view.w / 2, y: S.view.h * 0.3 });
      }
    }
  } else if (state === 'tally') {
    if (phase > (g.turn.score ? 0.8 : 0.2)) {
      const t = g.turn;
      const res = finish(g);
      faces();
      if (res.cleared) {
        A.cleared();
        pop(0, 0, T('Кон тазаланды! +50', 'Kon cleared! +50'), '#ffd36b', 6, 1.6, { x: S.view.w / 2, y: S.view.h * 0.4 });
        kids.forEach((k) => S.setPose(k, 'cheer', clock, 1.6, rand() * 0.2));
        bark('cleared');
      }
      if (g.draw) {
        g.draw = false;
        pop(0, 0, T('Ничья — ещё по броску!', 'A draw — one more each!'), '#ffd36b', 5, 1.8, { x: S.view.w / 2, y: S.view.h * 0.45 });
      }
      if (t.refund) pop(0, 0, T('Два за бросок — бросок вернулся', 'Two in one throw — throw back'), '#bfeaa0', 4, 1.6, { x: S.view.w / 2, y: S.view.h * 0.5 });
      hudThrows();
      turnPanel(g.chain ? T(`Цепочка: +${g.chain} к множителю`, `Chain: +${g.chain} to mult`) : '');
      if (g.result) {
        state = 'overWait';
        phase = 0;
      } else {
        thrower = nextThrower(g, t.owner);
        if (thrower === 'aga') agaTurn();
        else aimNow();
      }
    }
  } else if (state === 'overWait' && phase > 0.7) over();
}

function updateHand(dt) {
  const k = Math.min(1, dt * 14);
  let tx = 0;
  let ty = 0;
  let tr = 0;
  let ts = 1;
  let hide = 0;
  if (state === 'aim' || state === 'menu' || state === 'talk') {
    hand.open = false;
    if (aim && drag) {
      // the hand follows the finger a little and cocks back with the pull
      tx = aim.dx * 0.25;
      ty = aim.dy * 0.45;
      tr = -aim.power * 0.22 + (aim.dx / S.view.w) * 0.3;
    } else {
      ty = Math.sin(clock * 1.6) * 3;
    }
  } else if (state === 'flight' && g.turn && g.turn.owner === 'me') {
    // follow-through: forward and up, then down out of sight
    const p = Math.min(1, phase / 0.12);
    ty = -S.view.h * 0.06 * p;
    tr = 0.12 * p;
    ts = 1 - 0.08 * p;
    hide = phase > 0.15 ? 1 : 0;
  } else if (state === 'agaAim' || (g && g.turn && g.turn.owner === 'aga')) {
    // waiting for the aga: the hand rests low
    hand.open = false;
    hide = 0.45;
  } else {
    hide = 1;
  }
  hand.dx += (tx - hand.dx) * k;
  hand.dy += (ty - hand.dy) * k;
  hand.rot += (tr - hand.rot) * k;
  hand.scale += (ts - hand.scale) * k;
  hand.hidden += (hide - hand.hidden) * Math.min(1, dt * (hide ? 5 : 7));
  if (hand.hidden < 0.01) hand.hidden = 0;
}

function fly(dt) {
  const f = flight;
  f.t += dt;
  const s = saka(g.w);
  const u = Math.min(1, f.t / f.T);
  // the wind carries it a little in the air too
  const drift = g.w.wind * 0.5 * f.t * f.t;
  s.x = f.from.x + (f.land.x - f.from.x) * u + drift;
  s.y = f.from.y + (f.land.y - f.from.y) * u;
  s.z = f.from.z * (1 - u) + S.arcHeight(f.power) * 4 * u * (1 - u);
  s.ang += dt * 22;
  if (u >= 1) {
    s.z = 0;
    throwFromHand(g, f.ux, f.uy, f.power, f.origin);
    s.x += drift;
    A.thud(40 + f.power * 50);
    puff(s.x, s.y, 7, 0.7);
    state = 'roll';
    phase = 0;
  }
}

function roll(dt) {
  if (freeze > 0) {
    freeze -= dt;
    return;
  }
  const k = slow > 0 ? 0.35 : 1;
  slow -= dt;
  step(g.w, Math.min(dt, 1 / 30) * k);
  const s = saka(g.w);
  for (const e of g.w.events) {
    if (e.type === 'hit') {
      const feet = e.a.kind === 'kid' ? e.a : e.b.kind === 'kid' ? e.b : null;
      if (feet) {
        // a bone hit someone's foot
        const kid = feet.ki === 'aga' ? aga : kidOf(feet);
        if (kid && e.power > 8) {
          if (kid !== aga) S.setPose(kid, 'sad', clock, 1.1);
          else aga.pose = 'sad';
          bark('ouch', kid);
          A.thud(e.power);
        }
        continue;
      }
      A.clack(e.power);
      if (e.power > 25) puff(e.x, e.y, 3, 0.5);
      if (e.a === s || e.b === s) {
        shake = Math.max(shake, Math.min(6, e.power / 25));
        if (!firstTouch && e.power > 80) freeze = 0.05;
        firstTouch = true;
      }
    } else if (e.type === 'wall') {
      A.thud(e.speed * 0.5);
    } else if (e.type === 'out') {
      const pay = knock(g, e.body);
      A.knocked(g.turn.knocked - 1);
      pop(e.body.x, e.body.y, `+${pay}`, e.body.painted ? '#ff9fd0' : g.turn.owner === 'aga' ? '#c9d4e0' : '#fff4dc', 4 + Math.min(3, g.turn.knocked * 0.4));
      turnPanel();
      bump('turnChips');
      if (g.turn.knocked >= 3) slow = 0.45;
    }
  }
  g.w.events.length = 0;
  for (const b of g.w.bodies) {
    if (b.fixed) continue;
    const sp = Math.hypot(b.vx, b.vy);
    // a bone tumbles while it is fast, then lies on some side
    if (sp > 30) b.tumble = true;
    else if (b.tumble && sp < 8 && b.kind === 'asyk') {
      b.tumble = false;
      b.face = ['alshy', 'buk', 'buk', 'taike', 'shik'][Math.floor(rand() * 5)];
    }
    if (sp > 45 && rand() < dt * 30) puff(b.x - (b.vx / sp) * b.r, b.y - (b.vy / sp) * b.r, 1, 0.3);
  }
  if (!moving(g.w)) still += dt;
  else still = 0;
  if (still > 0.2) {
    const t = settle(g);
    state = 'reveal';
    phase = 0;
    A.side(t.side.id);
    react(t);
    const sideName = t.side.name;
    const sideText = t.side.throws ? `${sideName}: ${T('+1 бросок', '+1 throw')}` : `${sideName} ×${t.side.mult}`;
    pop(s.x, s.y, sideText, SIDE_COL[t.side.id], 5, 1.3);
    if (t.owner === 'aga') turnPanel(`${agaName()}: ${t.knocked ? sideText : T('мимо', 'missed')}`);
    else turnPanel(t.knocked ? (g.chain > 1 ? `${sideText}, ${T('цепочка', 'chain')} +${g.chain - 1}` : sideText) : `${T('Мимо', 'Missed')}. ${t.side.throws ? sideText : ''}`.trim());
    bump('turnMult');
    hudThrows();
  }
}

function draw() {
  const { dpr } = S.view;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.save();
  if (shake > 0.05) c.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2);
  S.drawBackdrop(c);
  if (g) {
    const s = saka(g.w);
    const items = S.lifeItems(life);
    const showSaka = state === 'flight' || state === 'roll' || state === 'reveal' || state === 'tally';
    for (const b of g.w.bodies) {
      if (b.kind === 'kid') continue;
      if (b === s && !showSaka) continue;
      items.push({ D: S.CAM.y - b.y, b });
    }
    for (const k of kids) items.push({ D: S.CAM.y - k.y + 0.5, kid: k });
    if (aga) items.push({ D: S.CAM.y - aga.y + 0.5, aga });
    items.sort((a, b) => b.D - a.D);
    for (const it of items) {
      if (it.draw) it.draw(c);
      else if (it.kid) S.drawKid(c, it.kid, clock);
      else if (it.aga) S.drawAga(c, it.aga, clock);
      else if (it.b === s) {
        let z = s.z || 0;
        if (state === 'reveal' && phase < 0.45) z = Math.sin((phase / 0.45) * Math.PI) * 4;
        S.drawBone(c, s, z);
      } else {
        const b = it.b;
        const fade = b.out && state === 'tally' ? 1 - Math.min(1, phase / 0.6) : 1;
        S.drawBone(c, b, 0, fade, b.out ? 0.9 : 0);
      }
    }
    S.drawDust(c, dust);
    if (state === 'aim' && aim && drag && aim.power > 0.05) {
      const from = handStart();
      const land = landing(aim.power, aim.ux, aim.uy);
      const p = predict(g.w, aim.ux, aim.uy, aim.power, land, groundSpeed(1));
      S.drawGuide(c, from, land, { x: p.x, y: p.y, target: p.hit, nx: p.nx, ny: p.ny }, clock, aim.power);
    }
    S.drawPopups(c, pops);
  }
  S.drawAir(c, life, clock);
  c.restore();
  S.drawOverlay(c, clock);
  if (SHOT) return;
  S.drawBubbles(c, bubbles);
  // the hand is closest to the eye: over the light and grain of the yard
  S.drawHand(c, hand);
  if (state === 'aim' && !taught && !drag) S.drawPullHint(c, clock);
}

const PLAYING = new Set(['aim', 'flight', 'roll', 'reveal', 'tally', 'agaAim']);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!document.hidden && state !== 'load') {
    update(dt);
    draw();
  }
  gameplay(!document.hidden && PLAYING.has(state));
  requestAnimationFrame(frame);
}

async function boot() {
  await portalInit();
  loading(true);
  // on a portal its language wins unless the player chose one here
  const pl = portalLang();
  if (pl && !q.get('lang') && store.get('asyk.lang', null) == null) lang = pl === 'ru' ? 0 : 1;
  onPortalMute((m) => A.holdAudio(m));
  const bar = el('div', 'bar');
  bar.style.cssText = 'margin: 18px auto 0; width: 70%; background: rgba(90, 40, 20, 0.15)';
  const fill = el('i');
  bar.append(fill);
  panel([el('h1', 'logo', 'Асық'), el('p', 'sub', T('Аул просыпается…', 'The village wakes up…')), bar]);
  try {
    await S.loadArt((k) => (fill.style.width = `${Math.round(k * 100)}%`));
  } catch {
    panel([el('h2', null, T('Не загрузилось', 'Failed to load')), el('p', 'sub', T('Проверь интернет и обнови страницу.', 'Check your connection and reload.'))]);
    return;
  }
  loading(false);
  layout();
  const fresh = !taught && !Object.keys(story.done || {}).length;
  if (fresh && !SHOT) {
    menu();
    playStory(0, 0);
  } else menu();
}
boot();
requestAnimationFrame(frame);
// for the test page: window.__asyk shows the live state
window.__asyk = { get g() { return g; }, get state() { return state; }, kids, hand, get aga() { return aga; }, playStory, talkNext: () => talkDone && talkDone() };
