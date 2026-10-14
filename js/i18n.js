import { store } from './util.js';

const TEXT = {
  ru: {
    title: 'Жекпе-жек: файтинг с казахскими героями',
    tag: 'Файтинг один на один. Батыр с арканом против апы с шөмішем. Без крови, зато с бауырсаками.',
    vsAI: 'Против компьютера',
    vsAISub: 'Сложность: {d}',
    twoP: 'Вдвоём',
    twoPSub: 'На одной клавиатуре',
    twoPTouch: 'Нужна клавиатура',
    howTo: 'Как играть',
    howToSub: 'Кнопки, приёмы и добивания',
    easy: 'легко',
    normal: 'нормально',
    hard: 'сложно',
    difficulty: 'Сложность',
    you: 'Ты',
    rival: 'Соперник',
    player1: 'Игрок 1',
    player2: 'Игрок 2',
    random: 'Случайный',
    toFight: 'В бой!',
    back: 'Назад',
    pick: 'Выбор бойца',
    special: 'Супер',
    finisher: 'Добивание',
    keys1: 'Ходьба и прыжок: WASD или стрелки. Рука J или Z, нога K или X, блок L или C, супер Space или V. P пауза.',
    keysP1: 'Игрок 1: WASD, рука F, нога G, блок H, супер R.',
    keysP2: 'Игрок 2: стрелки, рука , (или Numpad 1), нога . (Numpad 2), блок / (Numpad 3), супер L (Numpad 0).',
    keysTouch: 'Слева джойстик: веди пальцем. Справа кнопки: рука, нога, блок, супер.',
    movesTitle: 'Приёмы у всех',
    moves: [
      ['Вниз + рука', 'апперкот, подбрасывает'],
      ['Вниз + нога', 'подсечка, держится только блоком в приседе'],
      ['Вперёд + рука вплотную', 'бросок, пробивает блок'],
      ['Рука или нога в прыжке', 'удар в воздухе'],
      ['Рука после попадания', 'связка: рука, рука, апперкот'],
      ['Супер', 'свой у каждого, потом перезарядка'],
    ],
    finishTitle: 'Добивание',
    finishText: 'В решающем раунде после «АЯҚТА!» подойди и нажми «Супер». Добивания у нас смешные: никто не пострадает.',
    pause: 'Пауза',
    resume: 'Продолжить',
    restart: 'Заново',
    menu: 'В меню',
    rematch: 'Реванш',
    otherFighter: 'Другой боец',
    youWin: 'Победа!',
    youLose: 'Поражение',
    draw: 'Ничья',
    wins: '{name} побеждает',
    statHits: 'Попаданий',
    statCombo: 'Лучшая серия',
    statRounds: 'Раунды',
    flawless: 'Без единого пропущенного удара',
    record: 'Побед над компьютером: {e} легко, {n} нормально, {h} сложно',
    round: 'Раунд {n}',
    finalRound: 'Решающий раунд',
    fightSub: 'Бой!',
    koSub: 'Нокаут',
    finishSub: 'Добивай! Подойди и жми «Супер»',
    ujatSub: 'Добивание «{name}»',
    timeSub: 'Время вышло',
    drawSub: 'Ничья',
    roundWin: '{name} берёт раунд',
    flawlessSub: 'Чистая победа',
    combo: '{n} {w}',
    hitWords: ['удар', 'удара', 'ударов'],
    soundOn: 'Звук',
    soundOff: 'Тихо',
    musicOn: 'Музыка',
    musicOff: 'Без музыки',
    punch: 'Рука',
    kick: 'Нога',
    block: 'Блок',
    superBtn: 'Супер',
    testLink: 'Тест реакции геймера',
    raceLink: 'Ещё игра: гонка «Әсем Жол»',
    aboutFun: 'Игра создана ради хорошего настроения. Все персонажи и события вымышлены, любые совпадения случайны.',
    madeBy: 'Сделано в TEMIRLAB:',
    shareText: 'Моя победа в «Жекпе-жек» за {name}. Попробуй и ты: ',
    share: 'Поделиться',
    copied: 'Ссылка скопирована',
    kkNote: 'Фразы бойцов на казахском.',
  },
  en: {
    title: 'Jekpe-jek: a fighting game with Kazakh heroes',
    tag: 'One on one. A batyr with a lasso against an apa with a ladle. No blood, plenty of baursaks.',
    vsAI: 'Versus computer',
    vsAISub: 'Difficulty: {d}',
    twoP: 'Two players',
    twoPSub: 'On one keyboard',
    twoPTouch: 'Needs a keyboard',
    howTo: 'How to play',
    howToSub: 'Keys, moves and finishers',
    easy: 'easy',
    normal: 'normal',
    hard: 'hard',
    difficulty: 'Difficulty',
    you: 'You',
    rival: 'Rival',
    player1: 'Player 1',
    player2: 'Player 2',
    random: 'Random',
    toFight: 'Fight!',
    back: 'Back',
    pick: 'Pick a fighter',
    special: 'Special',
    finisher: 'Finisher',
    keys1: 'Move and jump: WASD or arrows. Punch J or Z, kick K or X, block L or C, special Space or V. P to pause.',
    keysP1: 'Player 1: WASD, punch F, kick G, block H, special R.',
    keysP2: 'Player 2: arrows, punch , (or Numpad 1), kick . (Numpad 2), block / (Numpad 3), special L (Numpad 0).',
    keysTouch: 'Left: a joystick, drag your thumb. Right: punch, kick, block, special.',
    movesTitle: 'Moves everyone has',
    moves: [
      ['Down + punch', 'uppercut, launches'],
      ['Down + kick', 'sweep, only a crouching block stops it'],
      ['Forward + punch up close', 'throw, beats a block'],
      ['Punch or kick in the air', 'jump attack'],
      ['Punch after a hit', 'combo: punch, punch, uppercut'],
      ['Special', 'unique for each fighter, then a cooldown'],
    ],
    finishTitle: 'Finisher',
    finishText: 'In the deciding round, after "АЯҚТА!" walk up and press Special. Finishers here are silly: nobody gets hurt.',
    pause: 'Paused',
    resume: 'Resume',
    restart: 'Restart',
    menu: 'Menu',
    rematch: 'Rematch',
    otherFighter: 'Other fighter',
    youWin: 'You win!',
    youLose: 'You lose',
    draw: 'Draw',
    wins: '{name} wins',
    statHits: 'Hits',
    statCombo: 'Best combo',
    statRounds: 'Rounds',
    flawless: 'Not a single hit taken',
    record: 'Wins against the computer: {e} easy, {n} normal, {h} hard',
    round: 'Round {n}',
    finalRound: 'Final round',
    fightSub: 'Fight!',
    koSub: 'Knockout',
    finishSub: 'Finish them! Walk up and press Special',
    ujatSub: 'Finisher: {name}',
    timeSub: 'Time is up',
    drawSub: 'Draw',
    roundWin: '{name} takes the round',
    flawlessSub: 'Flawless victory',
    combo: '{n} {w}',
    hitWords: ['hit', 'hits', 'hits'],
    soundOn: 'Sound',
    soundOff: 'Muted',
    musicOn: 'Music',
    musicOff: 'No music',
    punch: 'Punch',
    kick: 'Kick',
    block: 'Block',
    superBtn: 'Super',
    testLink: 'Gamer reaction test',
    raceLink: 'Another game: the Әсем Жол race',
    aboutFun: 'Made for a good mood. All characters and events are fictional, any resemblance is a coincidence.',
    madeBy: 'Made at TEMIRLAB:',
    shareText: 'I won at Jekpe-jek playing {name}. Your turn: ',
    share: 'Share',
    copied: 'Link copied',
    kkNote: 'Fighters talk in Kazakh.',
  },
};

let lang = (() => {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl && TEXT[fromUrl]) return fromUrl;
  const saved = store.get('jekpe.lang', null);
  if (saved && TEXT[saved]) return saved;
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'ru';
  return /^(ru|kk|ky|be|uz|tg|uk)\b/i.test(nav) ? 'ru' : 'en';
})();

export const getLang = () => lang;
export function setLang(next) {
  if (!TEXT[next]) return;
  lang = next;
  store.set('jekpe.lang', lang);
}

export function t(key, vars) {
  let s = TEXT[lang][key] ?? TEXT.ru[key] ?? key;
  if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

export const L = (obj) => (obj == null ? '' : typeof obj === 'string' ? obj : obj[lang] ?? obj.ru);

// "3 удара", "5 ударов", "3 hits"
export function hits(n) {
  const w = TEXT[lang].hitWords;
  let form = 2;
  if (lang === 'ru') {
    const a = n % 10;
    const b = n % 100;
    if (a === 1 && b !== 11) form = 0;
    else if (a >= 2 && a <= 4 && (b < 12 || b > 14)) form = 1;
  } else {
    form = n === 1 ? 0 : 1;
  }
  return t('combo', { n, w: w[form] });
}
