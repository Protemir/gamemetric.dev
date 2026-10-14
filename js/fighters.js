// Fighter data. Frame numbers are at 60 fps. Boxes are [x0, y0, x1, y1] in world units:
// x forward from the fighter's centre, y up from the ground (from the fighter's height for air moves).
// Levels: high whiffs over a crouch, low needs a crouching block, mid and air are blocked either way.

export const FIGHTERS = [
  {
    id: 'batyr',
    name: { ru: 'Батыр', en: 'Batyr' },
    kk: 'Батыр',
    bio: {
      ru: 'Степной герой со щитом и копьём. Копьё за спиной для красоты, в деле аркан.',
      en: 'A steppe hero with a shield and a spear. The spear is for looks, the lasso does the work.',
    },
    special: { ru: 'Арқан: ловит арканом и тянет к себе', en: 'Arqan: lassoes the rival and pulls them close' },
    finisherName: { ru: 'Бүркіт', en: 'Burkit (the eagle)' },
    finisherText: { ru: 'прилетает беркут и уносит соперника', en: 'a golden eagle carries the rival away' },
    body: { torso: 58, neck: 7, head: 17, ua: 31, fa: 29, th: 41, sh: 42, w: 34 },
    hurt: { stand: 176, crouch: 118, w: 26 },
    walk: 200,
    back: 165,
    jump: 900,
    jumpX: 250,
    throwArm: 'aF',
    palettes: [
      { skin: '#e2a878', robe: '#2f6db0', robe2: '#24548a', trim: '#ffc94a', pants: '#3a2a20', boots: '#1e1511', belt: '#6b3d1e', metal: '#cfd6df', metal2: '#8d97a3', plume: '#e0392f', shield: '#8a4b22', hair: '#1b1210' },
      { skin: '#d99b6c', robe: '#b3302a', robe2: '#8a2420', trim: '#ffd666', pants: '#2c2a33', boots: '#17131a', belt: '#4a2b16', metal: '#d8c79a', metal2: '#9c8b5c', plume: '#2d8be0', shield: '#5b3a1e', hair: '#1b1210' },
    ],
    moves: {
      jab: { anim: 'jab', s: 5, a: 3, r: 9, dmg: 5, lvl: 'high', box: [18, 132, 84, 166], hs: 15, bs: 9, push: 90, cancel: ['jab', 'kick', 'upper', 'sweep', 'special'], sfx: 'light' },
      kick: { anim: 'kick', s: 9, a: 4, r: 15, dmg: 8, lvl: 'mid', box: [22, 76, 104, 112], hs: 18, bs: 12, push: 260, cancel: ['special'], sfx: 'mid' },
      upper: { anim: 'upper', s: 8, a: 5, r: 24, dmg: 13, lvl: 'mid', box: [6, 70, 78, 196], launch: [170, 980], bs: 14, push: 140, sfx: 'heavy', word: 'ТАРС!' },
      sweep: { anim: 'sweep', s: 9, a: 5, r: 20, dmg: 7, lvl: 'low', box: [20, 0, 104, 30], trip: true, bs: 12, push: 120, sfx: 'mid' },
      airP: { anim: 'airP', s: 4, a: 14, r: 0, dmg: 7, lvl: 'air', box: [16, 50, 84, 104], hs: 16, bs: 10, push: 170, air: true, sfx: 'light' },
      airK: { anim: 'airK', s: 5, a: 16, r: 0, dmg: 9, lvl: 'air', box: [16, -6, 96, 44], hs: 18, bs: 12, push: 220, air: true, sfx: 'mid' },
    },
    throw: { range: 92, dmg: 12, kind: 'lift', word: 'ГҮРС!' },
    spec: { kind: 'lasso', s: 16, cd: 270, speed: 1000, range: 440, dmg: 5, stun: 24 },
    say: {
      intro: ['Кел, кел!', 'Дайынмын!', 'Кім бар?'],
      taunt: ['Мә саған!', 'Әлі ерте!', 'Тағы ма?', 'Кел, кел!'],
      hurt: ['Ойбай!', 'Әттең!', 'Ой!'],
      special: ['Бері кел!'],
      throw: ['Ал кеттік!'],
      win: ['Жеңіс біздікі!', 'Тағы кел!'],
      dizzy: ['Басым айналды...'],
      finisher: ['Бүркітім, кел!'],
      carried: ['Түсір мені!'],
      tired: ['Шаршадым...'],
    },
  },
  {
    id: 'apa',
    name: { ru: 'Апа', en: 'Apa' },
    kk: 'Апа',
    bio: {
      ru: 'Строгая апа с шөмішем. Всех накормит, а кто не ест, тому бауырсак прилетит сам.',
      en: 'A strict granny with a ladle. Everyone gets fed, and if you will not eat, the baursak comes to you.',
    },
    special: { ru: 'Бауырсақ: кидает горячий бауырсак', en: 'Baursak: throws a hot fried dough ball' },
    finisherName: { ru: 'Қара жорға', en: 'Kara zhorga (the dance)' },
    finisherText: { ru: 'соперник танцует қара жорға, пока не свалится', en: 'the rival dances kara zhorga until they drop' },
    body: { torso: 52, neck: 6, head: 18, ua: 28, fa: 26, th: 37, sh: 37, w: 42 },
    hurt: { stand: 166, crouch: 112, w: 28 },
    walk: 185,
    back: 160,
    jump: 860,
    jumpX: 240,
    throwArm: 'aN',
    palettes: [
      { skin: '#ebb68e', robe: '#7a3d9c', robe2: '#5e2d79', vest: '#283062', trim: '#ffc94a', scarf: '#f6f1e7', scarf2: '#ddd4c4', shoes: '#1d1d22', socks: '#6b5560', metal: '#d4d9e0', metal2: '#8f98a4', glasses: '#3a2a20' },
      { skin: '#e3a780', robe: '#2f8a5b', robe2: '#236a45', vest: '#6b1e2e', trim: '#ffd666', scarf: '#fff3d6', scarf2: '#e6d3a8', shoes: '#2a1a14', socks: '#5c4a44', metal: '#d4d9e0', metal2: '#8f98a4', glasses: '#3a2a20' },
    ],
    moves: {
      jab: { anim: 'ladle', s: 6, a: 3, r: 10, dmg: 6, lvl: 'high', box: [20, 124, 98, 162], hs: 15, bs: 9, push: 90, cancel: ['jab', 'kick', 'upper', 'sweep', 'special'], sfx: 'ladle' },
      kick: { anim: 'kick', s: 8, a: 4, r: 14, dmg: 7, lvl: 'mid', box: [22, 66, 96, 104], hs: 17, bs: 12, push: 240, cancel: ['special'], sfx: 'mid' },
      upper: { anim: 'kazan', s: 9, a: 5, r: 23, dmg: 14, lvl: 'mid', box: [4, 66, 82, 190], launch: [180, 1000], bs: 14, push: 140, sfx: 'pot', word: 'ДҮҢК!' },
      sweep: { anim: 'ladleLow', s: 9, a: 5, r: 19, dmg: 7, lvl: 'low', box: [20, 0, 108, 28], trip: true, bs: 12, push: 120, sfx: 'ladle' },
      airP: { anim: 'airLadle', s: 5, a: 14, r: 0, dmg: 7, lvl: 'air', box: [16, 30, 92, 96], hs: 16, bs: 10, push: 170, air: true, sfx: 'ladle' },
      airK: { anim: 'airK', s: 5, a: 16, r: 0, dmg: 9, lvl: 'air', box: [14, -6, 88, 40], hs: 18, bs: 12, push: 220, air: true, sfx: 'mid' },
    },
    throw: { range: 92, dmg: 11, kind: 'ear', word: 'ТАРС!' },
    spec: { kind: 'baursak', s: 12, r: 15, cd: 150, vx: 660, vy: 220, g: 560, dmg: 10 },
    say: {
      intro: ['Әй, бала!', 'Тәртіп!', 'Кел, балам!'],
      taunt: ['Ұят қой!', 'Шөмішті көрдің бе?', 'Әжеңді тыңда!', 'Тәртіп!'],
      hurt: ['Ойбай-ау!', 'Әттеген-ай!', 'Ай-ай-ай!'],
      special: ['Же, же!', 'Ыстық бауырсақ!'],
      throw: ['Әй, бала!'],
      win: ['Тамақ суып қалды!', 'Үйге қайт!'],
      dizzy: ['Басым айналды...'],
      finisher: ['Биле, биле!'],
      carried: ['Түсір мені!'],
      tired: ['Шаршадым...'],
    },
  },
];

export const fighterById = (id) => FIGHTERS.find((f) => f.id === id) || FIGHTERS[0];

// what the crowd shouts on big moments
export const CROWD = ['Жарайсың!', 'Бәрекелді!', 'Алға!', 'Ура!', 'Ойбай!'];
