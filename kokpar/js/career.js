// Карьера: свой клуб, Кубок Жетісу (группа → полуфинал → финал), призовые и конюшня.
// Всё хранится в localStorage; экраны рисуются в #menu вместо старой лестницы аулов.
import { flagCanvas, SIGN_LIST } from './flags.js';
import { IC } from './icons.js';

const KEY = 'kokpar.career';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* приватный режим */ } };

// ---------- клубы ----------
export const CLUBS = [
  { id: 'kainar', ru: ['Кайнар', 'Қырандар'], en: ['Kainar', 'Eagles'], c: '#2f7a3a', a: '#d9c27a', sign: 'spring', r: 0 },
  { id: 'tausamaly', ru: ['Таусамалы', 'Барыстар'], en: ['Tausamaly', 'Snow Leopards'], c: '#2456a8', a: '#c9d6e8', sign: 'mountain', r: 1 },
  { id: 'kaskelen', ru: ['Каскелен', 'Арыстандар'], en: ['Kaskelen', 'Lions'], c: '#c0601c', a: '#2d2a26', sign: 'sun', r: 2 },
  { id: 'ushterek', ru: ['Уштерек', 'Теректер'], en: ['Ushterek', 'Poplars'], c: '#1f8a86', a: '#e0d6c0', sign: 'poplars', r: 3 },
  { id: 'talgar', ru: ['Талгар', 'Жұлдыздар'], en: ['Talgar', 'Stars'], c: '#6a3a9a', a: '#e8c34a', sign: 'star', r: 4 },
  { id: 'yesik', ru: ['Есик', 'Толқындар'], en: ['Yesik', 'Waves'], c: '#2a86c8', a: '#f0ece0', sign: 'wave', r: 5 },
  { id: 'zharkent', ru: ['Жаркент', 'Сұңқарлар'], en: ['Zharkent', 'Falcons'], c: '#4a6b1f', a: '#c7a06a', sign: 'arrows', r: 6 },
  { id: 'shelek', ru: ['Шелек', 'Тұлпарлар'], en: ['Shelek', 'Tulpars'], c: '#b8901e', a: '#3a2a5a', sign: 'tamga', r: 7 },
  { id: 'tekeli', ru: ['Текели', 'Аюлар'], en: ['Tekeli', 'Bears'], c: '#6b4423', a: '#d8d0c0', sign: 'moon', r: 8 },
  { id: 'shonzhy', ru: ['Шонжы', 'Самұрықтар'], en: ['Shonzhy', 'Samruks'], c: '#8a1f3d', a: '#e6d8a8', sign: 'wing', r: 9 },
  { id: 'kegen', ru: ['Кеген', 'Бөрілер'], en: ['Kegen', 'Wolves'], c: '#2e2e2e', a: '#d0d0d0', sign: 'horns', r: 10 },
  { id: 'narynkol', ru: ['Нарынкол', 'Хан Тәңірі'], en: ['Narynkol', 'Khan Tengri'], c: '#1e3366', a: '#e8e0c8', sign: 'khan', r: 11 },
];
const byId = (id) => CLUBS.find((c) => c.id === id);
export const PALETTE = ['#b8262c', '#d0661a', '#c9a227', '#2f7a3a', '#1f8a86', '#2a86c8', '#2456a8', '#6a3a9a', '#8a1f3d', '#2e2e2e'];

// цвет → форма: основной, светлый для текста, градиенты табло и баннеров
function hsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, s, l];
}
const css = (h, s, l) => `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;
export function makeKit(color, sign) {
  const [h, s, l] = hsl(color);
  const light = l > 0.62; // светлая (выездная) форма: текст и табло темнее
  return {
    color, sign,
    css: light ? css(h, s, 0.86) : css(h, Math.min(1, s * 1.05), Math.min(0.8, Math.max(0.64, l + 0.3))),
    grad: light ? [css(h, s, 0.95), css(h, s * 0.8, 0.62)] : [css(h, s, 0.88), css(h, s, 0.5)],
    hud: light ? [css(h, s * 0.7, 0.62), css(h, s * 0.6, 0.36)] : [css(h, s, 0.48), css(h, s, 0.24)],
  };
}
function clash(a, b) { // похожие цвета — сопернику выездная форма
  const [h1, s1, l1] = hsl(a), [h2, s2, l2] = hsl(b);
  if (l1 < 0.24 && l2 < 0.24) return true;
  if (s1 < 0.15 || s2 < 0.15) return Math.abs(l1 - l2) < 0.15;
  const dh = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2));
  return dh < 32 && Math.abs(l1 - l2) < 0.25;
}

// ---------- конюшня ----------
export const STATS = ['speed', 'stamina', 'strength', 'agility'];
const COSTS = [1500, 3000, 5000, 8000, 12000];
export const COATS = [ // множитель к текстуре гнедого коня
  { k: [1.7, 1.7, 1.7], ru: 'Гнедой', en: 'Bay', price: 0 },
  { k: [2.9, 1.6, 0.95], ru: 'Рыжий', en: 'Chestnut', price: 800 },
  { k: [0.75, 0.72, 0.72], ru: 'Вороной', en: 'Black', price: 1200 },
  { k: [3.1, 2.6, 1.7], ru: 'Саврасый', en: 'Dun', price: 1200 },
  { k: [3.3, 2.2, 1.3], ru: 'Светло-рыжий', en: 'Sorrel', price: 1500 },
  { k: [3.6, 3.5, 3.35], ru: 'Ақбоз', en: 'Grey', price: 2500 },
];
const PRIZE = { win: 3000, draw: 1200, loss: 400, goal: 150, semi: 3000, title: 10000 };
const ARENAS = {
  day: { ru: 'Алатау · день', en: 'Alatau · day' },
  evening: { ru: 'Алатау · закат', en: 'Alatau · sunset' },
  winter: { ru: 'Зимний Алатау', en: 'Winter Alatau' },
  night: { ru: 'Финал · прожекторы', en: 'Final · floodlights' },
};
const GROUP_ARENA = ['day', 'evening', 'winter'];

// ---------- тексты ----------
const T = {
  ru: {
    cup: 'Кубок Жетісу', season: (n) => 'Сезон ' + n, group: (g, r) => 'Группа ' + g + ' · тур ' + r + ' из 3', semi: 'Полуфинал', final: 'Финал',
    play: 'В седло!', table: 'Таблица', stable: 'Конюшня', club: 'Клуб', back: 'Назад', next: 'Дальше', newSeason: 'Новый сезон',
    create: 'Создай свой клуб', name: 'Название клуба', colour: 'Цвет', sign: 'Знак на флаге', done: 'Готово', defName: 'Аксай Батырлары',
    win: 'Победа', loss: 'Поражение', draw: 'Ничья', prize: 'Призовые', forWin: 'за победу', forDraw: 'за ничью', forLoss: 'за участие', forGoals: (n) => 'за голы (' + n + ')',
    forSemi: 'выход в финал', forTitle: 'кубок чемпиона', total: 'Итого',
    toSemi: 'Выход в плей-офф!', outGroup: 'Клуб не вышел из группы', toFinal: 'Вы в финале!', outSemi: 'Вылет в полуфинале', champion: 'ЧЕМПИОНЫ ЖЕТІСУ!', runnerUp: 'Серебро: проиграли финал',
    pts: 'О', gp: 'И', gd: '±', titles: (n) => 'Кубков: ' + n, money: 'Касса',
    stats: { speed: ['Скорость', 'Быстрее галоп'], stamina: ['Выносливость', 'Дольше скачет без усталости'], strength: ['Сила', 'Крепче держит и тянет в тартысе'], agility: ['Ловкость', 'Круче поворачивает'] },
    upgrade: 'Улучшить', max: 'Максимум', coat: 'Масть вашего коня', buy: 'Купить', chosen: 'Выбрана', choose: 'Выбрать',
    stableSub: 'Улучшения действуют на всех коней клуба', rating: 'Сила', bracket: 'Плей-офф', tbd: '—', you: 'вы',
    goldenGoal: 'Ничья в плей-офф — играем до золотого гола',
    quests: 'Задания', settings: 'Настройки', daily: 'Награда дня', dayN: (n) => 'День ' + n, claim: 'Забрать', streakNote: 'Заходи каждый день — награда растёт. Пропустишь день — начнёшь с первого.',
    questsTitle: 'Задания дня', questDone: 'Выполнено', questReward: 'Задание', newIn: (h) => 'Новые задания через ' + h, allDone: 'Все задания на сегодня выполнены!',
    q: { win: 'Выиграй матч', goals: (n) => 'Забей командой ' + n + ' голов', my: (n) => 'Забей сам ' + n + ' гола', throw: 'Забей броском в казан', tugs: (n) => 'Выиграй ' + n + ' тартыса', falls: (n) => 'Сбей с коня ' + n + ' соперников', matches: (n) => 'Сыграй ' + n + ' матча', clean: 'Выиграй, пропустив не больше 1 гола' },
  },
  en: {
    cup: 'Zhetysu Cup', season: (n) => 'Season ' + n, group: (g, r) => 'Group ' + g + ' · round ' + r + ' of 3', semi: 'Semi-final', final: 'Final',
    play: 'Ride!', table: 'Table', stable: 'Stable', club: 'Club', back: 'Back', next: 'Next', newSeason: 'New season',
    create: 'Create your club', name: 'Club name', colour: 'Colour', sign: 'Flag emblem', done: 'Done', defName: 'Aksay Batyrs',
    win: 'Victory', loss: 'Defeat', draw: 'Draw', prize: 'Prize money', forWin: 'win', forDraw: 'draw', forLoss: 'appearance', forGoals: (n) => 'goals (' + n + ')',
    forSemi: 'reached the final', forTitle: 'champions cup', total: 'Total',
    toSemi: 'Through to the play-offs!', outGroup: 'Out in the group stage', toFinal: 'You are in the final!', outSemi: 'Out in the semi-final', champion: 'ZHETYSU CHAMPIONS!', runnerUp: 'Silver: lost the final',
    pts: 'Pts', gp: 'P', gd: '±', titles: (n) => 'Cups: ' + n, money: 'Purse',
    stats: { speed: ['Speed', 'Faster gallop'], stamina: ['Stamina', 'Gallops longer before tiring'], strength: ['Strength', 'Holds and pulls harder in a tug'], agility: ['Agility', 'Turns tighter'] },
    upgrade: 'Upgrade', max: 'Max', coat: 'Your horse coat', buy: 'Buy', chosen: 'Selected', choose: 'Select',
    stableSub: 'Upgrades apply to every horse of the club', rating: 'Strength', bracket: 'Play-offs', tbd: '—', you: 'you',
    goldenGoal: 'Draw in a knockout — golden goal decides',
    quests: 'Quests', settings: 'Settings', daily: 'Daily reward', dayN: (n) => 'Day ' + n, claim: 'Claim', streakNote: 'Come back every day and the reward grows. Miss a day and you start over.',
    questsTitle: 'Daily quests', questDone: 'Done', questReward: 'Quest', newIn: (h) => 'New quests in ' + h, allDone: 'All quests done for today!',
    q: { win: 'Win a match', goals: (n) => 'Score ' + n + ' team goals', my: (n) => 'Score ' + n + ' goals yourself', throw: 'Score with a throw into the kazan', tugs: (n) => 'Win ' + n + ' tugs of war', falls: (n) => 'Unhorse ' + n + ' rivals', matches: (n) => 'Play ' + n + ' matches', clean: 'Win conceding at most 1 goal' },
  },
};

// ---------- состояние ----------
let S = load();
const rnd = Math.random;
function fresh() {
  return { v: 1, club: null, money: 2000, season: 1, titles: 0, upg: { speed: 0, stamina: 0, strength: 0, agility: 0 }, coats: [0], coat: 0, cup: null };
}
if (!S || S.v !== 1) S = fresh();

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function newCup() {
  // 7 соперников: в первом сезоне — из слабых и средних, дальше — любые
  const pool = shuffle(CLUBS.filter((c) => S.season > 1 || c.r <= 8).map((c) => c.id)).slice(0, 7);
  const A = ['me', ...pool.slice(0, 3)], B = pool.slice(3, 7);
  const table = {};
  for (const id of [...A, ...B]) table[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  return { A, B, table, round: 0, phase: 'group', semis: null, semiRes: null, final: null, finalRes: null, result: null };
}
// туры группы из 4: [0-1, 2-3], [0-2, 1-3], [0-3, 1-2]
const ROUNDS = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
const tier = () => Math.min(3, S.season - 1);
const rating = (id) => (id === 'me' ? 4 + STATS.reduce((a, k) => a + S.upg[k], 0) * 0.45 + tier() * 2 : byId(id).r + tier() * 2);
function poisson(l) { let k = 0, p = Math.exp(-l), s = p; const u = rnd(); while (u > s && k < 9) { k++; p *= l / k; s += p; } return k; }
function simScore(a, b, ko) {
  const d = (rating(a) - rating(b)) * 0.12;
  let x = poisson(Math.min(3.4, Math.max(0.4, 2.2 + d))), y = poisson(Math.min(3.4, Math.max(0.4, 2.2 - d)));
  if (ko && x === y) { if (rnd() < 0.5 + d * 0.5) x++; else y++; } // золотой гол
  return [x, y];
}
function record(a, b, x, y) {
  const t = S.cup.table;
  for (const [id, f, g] of [[a, x, y], [b, y, x]]) {
    const r = t[id]; r.p++; r.gf += f; r.ga += g;
    if (f > g) { r.w++; r.pts += 3; } else if (f === g) { r.d++; r.pts += 1; } else r.l++;
  }
}
export function standings(ids) {
  const t = S.cup.table;
  return [...ids].sort((a, b) => t[b].pts - t[a].pts || (t[b].gf - t[b].ga) - (t[a].gf - t[a].ga) || t[b].gf - t[a].gf || rating(b) - rating(a));
}

// ---------- каждый день: награда за вход подряд и три задания ----------
const DAILY = [500, 800, 1200, 1600, 2000, 2500, 4000];
const QUESTS = [
  { id: 'win', n: 1, r: 1000 }, { id: 'goals', n: 5, r: 800 }, { id: 'my', n: 2, r: 900 }, { id: 'throw', n: 1, r: 700 },
  { id: 'tugs', n: 4, r: 800 }, { id: 'falls', n: 2, r: 900 }, { id: 'matches', n: 2, r: 600 }, { id: 'clean', n: 1, r: 1200 },
];
const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function questsToday() {
  const today = dayKey();
  if (S.quests?.date !== today) {
    let seed = [...today].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const pool = [...QUESTS], pick = [];
    while (pick.length < 3) { seed = (seed * 1103515245 + 12345) >>> 0; pick.push(pool.splice(seed % pool.length, 1)[0]); }
    S.quests = { date: today, list: pick.map((q) => ({ id: q.id, n: q.n, r: q.r, p: 0, done: false })) };
    save(S);
  }
  return S.quests.list;
}
const questText = (q) => { const f = tr('q')[q.id]; return typeof f === 'function' ? f(q.n) : f; };
// после матча: продвинуть задания, выполненные — сразу в кассу
function trackQuests(st) {
  const add = { win: st.won ? 1 : 0, goals: st.goals, my: st.myGoals, throw: st.throwGoals, tugs: st.tugs, falls: st.falls, matches: 1, clean: st.won && st.against <= 1 ? 1 : 0 };
  const done = [];
  for (const q of questsToday()) {
    if (q.done) continue;
    q.p = Math.min(q.n, q.p + (add[q.id] || 0));
    if (q.p >= q.n) { q.done = true; done.push(q); }
  }
  return done;
}
function dailyState() {
  const today = dayKey(), y = new Date(); y.setDate(y.getDate() - 1);
  const d = S.daily || { last: null, streak: 0 };
  const next = d.last === dayKey(y) ? (d.streak % 7) + 1 : 1;
  return { ready: d.last !== today, day: d.last === today ? d.streak : next };
}
function untilMidnight() {
  const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0);
  const s = Math.max(0, (m - n) / 1000), h = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60);
  return h + (L() === 'ru' ? ' ч ' : 'h ') + mm + (L() === 'ru' ? ' мин' : 'm');
}

// ---------- для игры ----------
const L = () => (globalThis.__kokparLang === 'en' ? 'en' : 'ru');
const tr = (k) => T[L()][k];
export const clubName = (id, short) => (id === 'me' ? S.club?.name || tr('defName') : short ? byId(id)[L()][0] : byId(id)[L()].join(' ') );
const fullName = (id) => (id === 'me' ? clubName('me') : `${byId(id)[L()][0]} «${byId(id)[L()][1]}»`);
export function myKit() { return makeKit(S.club?.color || PALETTE[0], S.club?.sign || 'shanyrak'); }
function oppId() {
  const c = S.cup;
  if (c.phase === 'group') { const pair = ROUNDS[c.round][0]; return c.A[pair[1]]; }
  if (c.phase === 'semi') return c.semis.find((p) => p.includes('me')).find((x) => x !== 'me');
  if (c.phase === 'final') return c.final.find((x) => x !== 'me');
  return null;
}
export function fixture() {
  if (!S.cup) S.cup = newCup();
  const c = S.cup, id = oppId();
  if (!id) return null;
  const club = byId(id), me = myKit();
  const color = clash(me.color, club.c) ? club.a : club.c;
  const ko = c.phase !== 'group';
  const r = rating(id) + (ko ? 1 : 0) + (c.phase === 'final' ? 1 : 0);
  return {
    id, ko, final: c.phase === 'final',
    name: clubName(id, true), full: fullName(id),
    kit: makeKit(color, club.sign),
    label: c.phase === 'group' ? tr('group')('A', c.round + 1) : c.phase === 'semi' ? tr('semi') : tr('final'),
    arena: c.phase === 'group' ? GROUP_ARENA[c.round] : c.phase === 'semi' ? 'evening' : 'night',
    // сила ботов соперника: тянут в тартысе, реакция, скорость
    diff: { pull: -0.06 + r * 0.009, react: Math.max(0.25, 0.85 - r * 0.035), speed: 0.91 + r * 0.0085 },
    stars: Math.max(1, Math.min(5, Math.round((r + 2) / 3.6))),
  };
}
export function horse() { // прокачка коней клуба
  const u = S.upg;
  return { speed: 1 + 0.025 * u.speed, drain: 1 - 0.13 * u.stamina, pull: 0.012 * u.strength, turn: 1 + 0.06 * u.agility, coat: COATS[S.coat].k };
}
export const arenaName = (a) => ARENAS[a][L()];
export const hasClub = () => !!S.club;
export const played = () => S.played || 0;

// итог матча игрока: таблица, остальные матчи тура, призовые; возвращает сводку для экрана
export function report(my, their, st = {}) {
  const c = S.cup, id = oppId(), lines = [];
  const res = my > their ? 'win' : my < their ? 'loss' : 'draw';
  lines.push([tr(res === 'win' ? 'forWin' : res === 'draw' ? 'forDraw' : 'forLoss'), PRIZE[res]]);
  if (my) lines.push([tr('forGoals')(my), my * PRIZE.goal]);
  let note = '';
  if (c.phase === 'group') {
    record('me', id, my, their);
    for (const [g, ids] of [['A', c.A], ['B', c.B]]) for (const [i, j] of ROUNDS[c.round]) {
      if (g === 'A' && i === 0) continue; // это наш матч
      const [x, y] = simScore(ids[i], ids[j], false);
      record(ids[i], ids[j], x, y);
      (c.log ||= []).push([ids[i], ids[j], x, y]);
    }
    c.round++;
    if (c.round === 3) {
      const a = standings(c.A), b = standings(c.B);
      if (a.indexOf('me') < 2) { c.phase = 'semi'; c.semis = [[a[0], b[1]], [b[0], a[1]]]; note = tr('toSemi'); }
      else { c.phase = 'done'; c.result = 'group'; note = tr('outGroup'); }
    }
  } else if (c.phase === 'semi') {
    const other = c.semis.find((p) => !p.includes('me'));
    const [x, y] = simScore(other[0], other[1], true);
    c.semiRes = { me: [my, their], other: [x, y] };
    if (my > their) { c.phase = 'final'; c.final = ['me', x > y ? other[0] : other[1]]; lines.push([tr('forSemi'), PRIZE.semi]); note = tr('toFinal'); }
    else { c.phase = 'done'; c.result = 'semi'; note = tr('outSemi'); }
  } else if (c.phase === 'final') {
    c.finalRes = [my, their];
    c.phase = 'done';
    if (my > their) { c.result = 'champion'; S.titles++; lines.push([tr('forTitle'), PRIZE.title]); note = tr('champion'); }
    else { c.result = 'final'; note = tr('runnerUp'); }
  }
  const quests = trackQuests({ won: my > their, goals: my, against: their, ...st });
  for (const q of quests) lines.push([tr('questReward') + ': ' + questText(q), q.r]);
  const total = lines.reduce((a, l) => a + l[1], 0);
  S.money += total;
  S.played = (S.played || 0) + 1;
  save(S);
  return { res, my, their, opp: id, lines, total, note, quests: quests.length, champion: c.result === 'champion' && c.phase === 'done' };
}

// ---------- экраны ----------
let root = null, onPlay = null;
const flag = (kit, w = 96, h = 60) => flagCanvas(kit, w, h).toDataURL();
const kitOf = (id) => (id === 'me' ? myKit() : makeKit(byId(id).c, byId(id).sign));
const money = (n) => n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₸';
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

let onSettings = null, onOnline = null;
export function initCareer(el, play, settings, online) {
  root = el; onPlay = play; onSettings = settings; onOnline = online;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const [act, arg] = b.dataset.act.split(':');
    ACTS[act]?.(arg, b);
  });
}
let draft = null;
const ACTS = {
  play: () => onPlay?.(),
  table: () => showTable(),
  stable: () => showStable(),
  hub: () => showHub(),
  club: () => showCreate(),
  colour: (c) => { draft.color = c; showCreate(true); },
  sign: (s) => { draft.sign = s; showCreate(true); },
  save: () => {
    const name = (root.querySelector('#clubName').value || '').trim().slice(0, 22) || tr('defName');
    S.club = { name, color: draft.color, sign: draft.sign }; // auto снимается — клуб назван
    draft = null; save(S); showHub();
  },
  up: (k) => { const l = S.upg[k]; if (l < 5 && S.money >= COSTS[l]) { S.money -= COSTS[l]; S.upg[k]++; save(S); showStable(); } },
  coat: (i) => {
    i = +i;
    if (!S.coats.includes(i)) { if (S.money < COATS[i].price) return; S.money -= COATS[i].price; S.coats.push(i); }
    S.coat = i; save(S); showStable(); window.__kokparCoat?.();
  },
  season: () => { S.season++; S.cup = newCup(); save(S); showHub(); },
  quests: () => showQuests(),
  settings: () => onSettings?.(),
  online: () => onOnline?.(),
  claim: () => {
    const d = dailyState();
    if (!d.ready) return;
    S.money += DAILY[d.day - 1]; S.daily = { last: dayKey(), streak: d.day }; save(S);
    showHub(true);
  },
};

function head() {
  const k = myKit();
  return `<div class="h-top">
    <button class="h-club" data-act="club"><img src="${flag(k)}" alt=""><span>${esc(clubName('me'))}</span></button>
    <div class="h-right"><div class="h-money"><small>${tr('money')}</small>${money(S.money)}</div><button class="h-icon" data-act="settings" aria-label="${tr('settings')}">${IC.gear}</button></div>
  </div>`;
}
function tabs(active) { // нижние вкладки с иконками; у заданий — счётчик невыполненных
  const left = questsToday().filter((q) => !q.done).length;
  const t = (act, icon, label, badge) => `<button class="h-tab${act === active ? ' on' : ''}" data-act="${act}">${icon}<span>${label}</span>${badge ? `<i class="h-badge">${badge}</i>` : ''}</button>`;
  return `<nav class="h-tabs">${t('hub', IC.trophy, L() === 'ru' ? 'Кубок' : 'Cup')}${t('table', IC.cal.replace('M9 15l2 2 4-4', 'M7 14h10M7 17h6'), tr('table'))}${t('stable', IC.horse, tr('stable'))}${t('quests', IC.cal, tr('quests'), left)}</nav>`;
}
function dailyModal() {
  const d = dailyState();
  const tiles = DAILY.map((r, i) => `<div class="d-tile${i + 1 < d.day ? ' got' : i + 1 === d.day ? ' now' : ''}${i === 6 ? ' big' : ''}"><small>${tr('dayN')(i + 1)}</small>${i === 6 ? IC.gift : IC.coin}<b>${money(r)}</b></div>`).join('');
  return `<div class="d-modal"><div class="d-box"><div class="h-cup disp">${tr('daily')}</div><div class="d-tiles">${tiles}</div>
    <div class="h-season">${tr('streakNote')}</div><button class="big-btn" data-act="claim">${tr('claim')} +${money(DAILY[d.day - 1])}</button></div></div>`;
}
export function showQuests() {
  const list = questsToday();
  const rows = list.map((q) => `<div class="q-row${q.done ? ' done' : ''}"><div class="q-t"><b>${questText(q)}</b><div class="q-bar"><i style="width:${(q.p / q.n) * 100}%"></i></div></div><div class="q-r">${q.done ? '✓ ' + tr('questDone') : '+' + money(q.r)}<small>${q.p}/${q.n}</small></div></div>`).join('');
  root.innerHTML = `<div class="hub">${head()}<div class="h-cup disp">${tr('questsTitle')}</div>
    <div class="h-season">${list.every((q) => q.done) ? tr('allDone') + ' · ' : ''}${tr('newIn')(untilMidnight())}</div>
    <div class="q-list">${rows}</div>${tabs('quests')}</div>`;
}
export function showHub(skipDaily) {
  if (!S.club) { S.club = { name: tr('defName'), color: PALETTE[0], sign: 'shanyrak', auto: true }; save(S); } // в игру — сразу, клуб назовёт потом
  if (!S.cup) { S.cup = newCup(); save(S); }
  const c = S.cup, f = fixture();
  let body;
  if (f) {
    const k = myKit();
    body = `<div class="h-stage">${f.label}</div>
      <div class="h-match">
        <div class="h-side"><img src="${flag(k, 192, 120)}" alt=""><b>${esc(clubName('me'))}</b></div>
        <div class="h-vs disp">VS</div>
        <div class="h-side"><img src="${flag(f.kit, 192, 120)}" alt=""><b>${esc(f.full)}</b><span class="h-stars" title="${tr('rating')}">${'★'.repeat(f.stars)}<i>${'★'.repeat(5 - f.stars)}</i></span></div>
      </div>
      <div class="h-arena">${arenaName(f.arena)}</div>
      <button class="big-btn" data-act="play">${tr('play')}</button>
      <button class="h-friend" data-act="online">${IC.crowd}<span>${L() === 'ru' ? 'С другом по сети' : 'Play a friend online'}</span></button>`;
  } else {
    const r = c.result;
    const msg = r === 'champion' ? tr('champion') : r === 'final' ? tr('runnerUp') : r === 'semi' ? tr('outSemi') : tr('outGroup');
    body = `<div class="h-trophy">${r === 'champion' ? '🏆' : r === 'final' ? '🥈' : '🐎'}</div><div class="h-stage big">${msg}</div>
      <button class="big-btn" data-act="season">${tr('newSeason')}</button>`;
  }
  root.innerHTML = `<div class="hub">${head()}
    <div class="h-logo disp">KOKPAR</div>
    <div class="h-cup disp">${tr('cup')}</div><div class="h-season">${tr('season')(S.season)}${S.titles ? ' · ' + tr('titles')(S.titles) : ''}</div>
    ${body}
    ${tabs('hub')}
  </div>${!skipDaily && S.played && dailyState().ready ? dailyModal() : ''}`;
}
function tableHTML(ids, g) {
  const t = S.cup.table;
  const rows = standings(ids).map((id, i) => {
    const r = t[id];
    return `<tr class="${id === 'me' ? 'me' : ''}${i < 2 ? ' up' : ''}"><td>${i + 1}</td><td class="n"><img src="${flag(kitOf(id), 48, 30)}" alt="">${esc(clubName(id, true))}</td><td>${r.p}</td><td>${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`;
  }).join('');
  return `<div class="h-group"><div class="h-gt">${L() === 'ru' ? 'Группа' : 'Group'} ${g}</div><table><tr><th></th><th></th><th>${tr('gp')}</th><th>${tr('gd')}</th><th>${tr('pts')}</th></tr>${rows}</table></div>`;
}
function bracketHTML() {
  const c = S.cup;
  if (!c.semis) return '';
  const nm = (id) => (id ? `<img src="${flag(kitOf(id), 48, 30)}" alt="">${esc(clubName(id, true))}` : tr('tbd'));
  const semi = (p, sc) => `<div class="h-tie"><div>${nm(p[0])}<b>${sc ? sc[0] : ''}</b></div><div>${nm(p[1])}<b>${sc ? sc[1] : ''}</b></div></div>`;
  const mine = c.semis.findIndex((p) => p.includes('me'));
  const sc = (i) => {
    if (!c.semiRes) return null;
    const p = c.semis[i];
    if (i === mine) return p[0] === 'me' ? c.semiRes.me : [c.semiRes.me[1], c.semiRes.me[0]];
    return c.semiRes.other;
  };
  return `<div class="h-gt">${tr('bracket')}</div><div class="h-bracket">${semi(c.semis[0], sc(0))}${semi(c.semis[1], sc(1))}
    <div class="h-final"><span>${tr('final')}</span>${c.final ? semi(c.final, c.finalRes) : `<div class="h-tie"><div>${tr('tbd')}</div><div>${tr('tbd')}</div></div>`}</div></div>`;
}
export function showTable() {
  root.innerHTML = `<div class="hub">${head()}<div class="h-cup disp">${tr('cup')}</div>
    <div class="h-groups">${tableHTML(S.cup.A, 'A')}${tableHTML(S.cup.B, 'B')}</div>${bracketHTML()}
    ${tabs('table')}</div>`;
}
export function showStable() {
  const rows = STATS.map((k) => {
    const l = S.upg[k], [nm, desc] = tr('stats')[k], cost = COSTS[l];
    const pips = Array.from({ length: 5 }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('');
    const btn = l >= 5 ? `<button disabled>${tr('max')}</button>` : `<button data-act="up:${k}" ${S.money < cost ? 'disabled' : ''}>${tr('upgrade')} · ${money(cost)}</button>`;
    return `<div class="h-stat"><div><b>${nm}</b><small>${desc}</small></div><div class="h-pips">${pips}</div>${btn}</div>`;
  }).join('');
  const coats = COATS.map((c, i) => {
    const own = S.coats.includes(i), sel = S.coat === i;
    const col = `rgb(${c.k.map((v) => Math.min(255, v * 52) | 0).join(',')})`;
    const btn = sel ? tr('chosen') : own ? tr('choose') : money(c.price);
    return `<button class="h-coat${sel ? ' sel' : ''}" data-act="coat:${i}" ${!own && S.money < c.price ? 'disabled' : ''}><i style="background:${col}"></i><b>${c[L()]}</b><small>${btn}</small></button>`;
  }).join('');
  root.innerHTML = `<div class="hub">${head()}<div class="h-cup disp">${tr('stable')}</div><div class="h-season">${tr('stableSub')}</div>
    <div class="h-stats">${rows}</div><div class="h-gt">${tr('coat')}</div><div class="h-coats">${coats}</div>
    ${tabs('stable')}</div>`;
}
export function showCreate(keep) {
  if (!keep) draft = { color: S.club?.color || PALETTE[0], sign: S.club?.sign || 'shanyrak', name: S.club?.name || tr('defName') };
  else draft.name = root.querySelector('#clubName')?.value ?? draft.name;
  const k = makeKit(draft.color, draft.sign);
  const cols = PALETTE.map((c) => `<button class="h-sw${c === draft.color ? ' sel' : ''}" style="background:${c}" data-act="colour:${c}" aria-label="${c}"></button>`).join('');
  const signs = SIGN_LIST.map((s) => `<button class="h-sg${s === draft.sign ? ' sel' : ''}" data-act="sign:${s}"><img src="${flag(makeKit(draft.color, s), 96, 60)}" alt="${s}"></button>`).join('');
  root.innerHTML = `<div class="hub create"><div class="h-cup disp">${tr('create')}</div><div class="c-cols">
    <div class="c-l"><div class="h-preview"><img src="${flag(k, 240, 150)}" alt=""></div>
    <label class="h-lbl">${tr('name')}<input id="clubName" maxlength="22" value="${esc(draft.name)}" autocomplete="off"></label></div>
    <div class="c-r"><div class="h-lbl">${tr('colour')}</div><div class="h-sws">${cols}</div>
    <div class="h-lbl">${tr('sign')}</div><div class="h-sgs">${signs}</div></div></div>
    <button class="big-btn" data-act="save">${tr('done')}</button></div>`;
}
export function showResult(sum) {
  const k = myKit(), f = kitOf(sum.opp);
  const title = sum.res === 'win' ? tr('win') : sum.res === 'loss' ? tr('loss') : tr('draw');
  const lines = sum.lines.map(([a, b]) => `<div><span>${a}</span><b>+${money(b)}</b></div>`).join('');
  const c = S.cup;
  const mini = c.phase === 'group' || (c.phase !== 'group' && !c.semis) ? tableHTML(c.A, 'A') : bracketHTML();
  root.innerHTML = `<div class="hub result ${sum.res}">
    <div class="h-cup disp r-title">${sum.champion ? '🏆 ' : ''}${title}</div>
    <div class="r-score"><img src="${flag(k, 144, 90)}" alt=""><span class="disp">${sum.my} : ${sum.their}</span><img src="${flag(f, 144, 90)}" alt=""></div>
    ${sum.note ? `<div class="h-stage big">${sum.note}</div>` : ''}
    <div class="r-cols"><div class="r-prize"><div class="h-gt">${tr('prize')}</div>${lines}<div class="tot"><span>${tr('total')}</span><b>+${money(sum.total)}</b></div></div>
    <div class="r-mini">${mini}</div></div>
    ${S.club?.auto ? `<button class="r-name" data-act="club">${L() === 'ru' ? 'Придумай название и флаг своего клуба' : 'Name your club and pick its flag'}</button>` : ''}
    <button class="big-btn" data-act="hub">${tr('next')}</button></div>`;
}
export const goldenText = () => tr('goldenGoal');
