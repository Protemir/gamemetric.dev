// Тексты RU/EN. Язык: ?lang=ru|en, потом сохранённый, потом язык браузера.
const T = {
  ru: {
    title: 'Табун', subtitle: 'Степная скачка',
    play: 'Скакать', level: 'Уровень', boss: 'Большая байга',
    drag: 'Тяни влево-вправо, веди табун',
    upHerd: 'Табун', upHerdD: '+1 конь на старте',
    upIncome: 'Доход', upIncomeD: '+10% тенге',
    upLeader: 'Вожак', upLeaderD: '+{n} в схватке',
    lvl: 'ур. {n}', max: 'макс',
    coats: 'Масти', owned: 'Выбрано', buy: 'Купить', choose: 'Выбрать',
    win: 'Победа!', lose: 'Табун разбит', rivalWon: 'У соперника осталось {n}', lostWay: 'Табун не дошёл до байги',
    reward: 'Награда', next: 'Дальше', retry: 'Ещё раз', upgrade: 'Улучшить', menu: 'В меню',
    leader: 'Вожак +{n}', clash: 'Байга!',
    daily: 'Награда дня', dailyD: 'День {n} подряд', take: 'Забрать',
    sound: 'Звук', on: 'вкл', off: 'выкл', lang: 'Language: English',
    pause: 'Пауза', resume: 'Продолжить',
    allGames: 'Все игры', loading: 'Седлаем коней…',
    aul: 'Юрт в ауле: {n}', tipWolves: 'Валун! Обходи сзади',
    best: 'Рекорд табуна: {n}',
    set_steppe: 'Степные', set_black: 'Вороные', set_gold: 'Золотые', set_grey: 'Серые', set_fire: 'Огненные', set_pinto: 'Пегие',
    nogl: 'Браузер не поддерживает WebGL2. Включите аппаратное ускорение в настройках браузера или обновите его.',
    hint_gate: 'Синие ворота — прибавка, красные — потери',
    hint_wild: 'Задень диких коней — они уйдут с тобой',
    hint_pit: 'Овраг! Кто туда попадёт — пропал',
    hint_rock: 'Валун катится — обходи сзади',
    hint_fence: 'Изгородь — веди табун в проход',
    hint_river: 'Река замедляет',
    hint_wolf: 'Волки! Каждый волк унесёт коня — обходи стаю',
    milestone: '{n} голов!', milestone100: 'Сотня!',
    hint_clash: 'В конце — табун баая. Кого больше, тот и победил',
  },
  en: {
    title: 'Tabun', subtitle: 'Steppe Stampede',
    play: 'Ride', level: 'Level', boss: 'Grand Race',
    drag: 'Drag left and right to lead the herd',
    upHerd: 'Herd', upHerdD: '+1 horse at start',
    upIncome: 'Income', upIncomeD: '+10% coins',
    upLeader: 'Stallion', upLeaderD: '+{n} in the clash',
    lvl: 'lv {n}', max: 'max',
    coats: 'Coats', owned: 'Selected', buy: 'Buy', choose: 'Select',
    win: 'Victory!', lose: 'Herd broken', rivalWon: 'Rival kept {n}', lostWay: 'The herd never reached the clash',
    reward: 'Reward', next: 'Next', retry: 'Try again', upgrade: 'Upgrade', menu: 'Menu',
    leader: 'Stallion +{n}', clash: 'Clash!',
    daily: 'Daily reward', dailyD: 'Day {n} in a row', take: 'Collect',
    sound: 'Sound', on: 'on', off: 'off', lang: 'Язык: русский',
    pause: 'Paused', resume: 'Resume',
    allGames: 'All games', loading: 'Saddling the horses…',
    aul: 'Yurts in camp: {n}', tipWolves: 'Boulder! Pass behind it',
    best: 'Biggest herd: {n}',
    set_steppe: 'Steppe', set_black: 'Black', set_gold: 'Golden', set_grey: 'Grey', set_fire: 'Fiery', set_pinto: 'Pinto',
    nogl: 'Your browser does not support WebGL2. Turn on hardware acceleration in the browser settings or update the browser.',
    hint_gate: 'Blue gates add horses, red gates take them',
    hint_wild: 'Touch wild horses and they join you',
    hint_pit: 'A ravine! Horses that run in are lost',
    hint_rock: 'A boulder is rolling: pass behind it',
    hint_fence: 'A fence: lead the herd through the gap',
    hint_river: 'The river slows you down',
    hint_wolf: 'Wolves! Each wolf takes a horse: steer around the pack',
    milestone: '{n} horses!', milestone100: 'A hundred!',
    hint_clash: 'At the end waits the rival herd. The bigger herd wins',
  },
};

let lang = 'en';
export function detectLang() {
  const q = new URLSearchParams(location.search).get('lang');
  let saved = null;
  try { saved = localStorage.getItem('tabun.lang'); } catch { /* нет доступа */ }
  const nav = (navigator.language || 'en').toLowerCase();
  lang = q === 'ru' || q === 'en' ? q : saved === 'ru' || saved === 'en' ? saved : /^(ru|kk|uk|be|ky|uz|tg|az|hy)/.test(nav) ? 'ru' : 'en';
  document.documentElement.lang = lang;
  return lang;
}
export function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem('tabun.lang', l); } catch { /* нет доступа */ }
}
export const getLang = () => lang;
export function t(key, vars) {
  let s = (T[lang] && T[lang][key]) ?? T.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
