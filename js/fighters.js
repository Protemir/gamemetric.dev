// Fighter data. Frame numbers are at 60 fps. Boxes are [x0, y0, x1, y1] in world units:
// x forward from the fighter's centre, y up from the ground (from the fighter's height for air moves).
// Levels: high whiffs over a crouch, low needs a crouching block, mid and air are blocked either way.

const CANCEL = ['jab', 'kick', 'upper', 'sweep', 'special'];

// the usual six moves, each fighter changes what it needs
function moves(o = {}) {
  const base = {
    jab: { anim: 'jab', s: 5, a: 3, r: 9, dmg: 5, lvl: 'high', box: [18, 132, 84, 166], hs: 15, bs: 9, push: 90, cancel: CANCEL, sfx: 'light' },
    kick: { anim: 'kick', s: 9, a: 4, r: 15, dmg: 8, lvl: 'mid', box: [22, 76, 104, 112], hs: 18, bs: 12, push: 260, cancel: ['special'], sfx: 'mid' },
    upper: { anim: 'upper', s: 8, a: 5, r: 24, dmg: 13, lvl: 'mid', box: [6, 70, 78, 196], launch: [170, 980], bs: 14, push: 140, sfx: 'heavy', word: 'ТАРС!' },
    sweep: { anim: 'sweep', s: 9, a: 5, r: 20, dmg: 7, lvl: 'low', box: [20, 0, 104, 30], trip: true, bs: 12, push: 120, sfx: 'mid' },
    airP: { anim: 'airP', s: 4, a: 14, r: 0, dmg: 7, lvl: 'air', box: [16, 50, 84, 104], hs: 16, bs: 10, push: 170, air: true, sfx: 'light' },
    airK: { anim: 'airK', s: 5, a: 16, r: 0, dmg: 9, lvl: 'air', box: [16, -6, 96, 44], hs: 18, bs: 12, push: 220, air: true, sfx: 'mid' },
  };
  for (const k of Object.keys(o)) base[k] = { ...base[k], ...o[k] };
  return base;
}

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
    finisher: 'eagle',
    finisherName: { ru: 'Бүркіт', en: 'Burkit (the eagle)' },
    finisherText: { ru: 'прилетает беркут и уносит соперника', en: 'a golden eagle carries the rival away' },
    story: {
      intro: { ru: 'Старейшины объявили Ұлы той, главный приз Алтын асық. Батыр идёт защищать честь аула, хотя аул просил просто привезти кумыс.', en: 'The elders announced the Great Toi, the prize is the Golden Asyk. Batyr goes to defend the honour of the aul, although the aul only asked him to bring back some kumys.' },
      ending: { ru: 'Батыр вернул Алтын асық в аул. Кумыс, кстати, тоже вёз, но выпил по дороге.', en: 'Batyr brought the Golden Asyk home. He was bringing kumys too, but drank it on the way.' },
    },
    body: { torso: 58, neck: 7, head: 17, ua: 31, fa: 29, th: 41, sh: 42, w: 34 },
    hurt: { stand: 176, crouch: 118, w: 26 },
    walk: 200,
    back: 165,
    jump: 900,
    jumpX: 250,
    palettes: [
      { skin: '#e2a878', robe: '#2f6db0', robe2: '#24548a', trim: '#ffc94a', pants: '#3a2a20', boots: '#1e1511', belt: '#6b3d1e', metal: '#cfd6df', metal2: '#8d97a3', plume: '#e0392f', shield: '#8a4b22', hair: '#1b1210' },
      { skin: '#d99b6c', robe: '#b3302a', robe2: '#8a2420', trim: '#ffd666', pants: '#2c2a33', boots: '#17131a', belt: '#4a2b16', metal: '#d8c79a', metal2: '#9c8b5c', plume: '#2d8be0', shield: '#5b3a1e', hair: '#1b1210' },
    ],
    moves: moves(),
    throw: { range: 92, dmg: 12, kind: 'lift', word: 'ГҮРС!' },
    spec: { kind: 'lasso', s: 16, cd: 300, speed: 1000, range: 400, dmg: 5, stun: 24 },
    say: {
      intro: ['Кел, кел!', 'Дайынмын!', 'Кім бар?'],
      taunt: ['Мә саған!', 'Әлі ерте!', 'Тағы ма?', 'Кел, кел!'],
      hurt: ['Ойбай!', 'Әттең!', 'Ой!'],
      special: ['Бері кел!'],
      throw: ['Ал кеттік!'],
      win: ['Жеңіс біздікі!', 'Тағы кел!'],
      finisher: ['Бүркітім, кел!'],
    },
    voice: 0.8,
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
    finisher: 'dance',
    finisherName: { ru: 'Қара жорға', en: 'Kara zhorga (the dance)' },
    finisherText: { ru: 'соперник танцует қара жорға, пока не свалится', en: 'the rival dances kara zhorga until they drop' },
    story: {
      intro: { ru: 'Кто-то съел все бауырсаки, приготовленные для тоя. Апа знает, что виновник где-то на турнире, и взяла шөміш.', en: 'Someone ate all the baursaks made for the toi. Apa knows the culprit is somewhere at the tournament, so she took her ladle.' },
      ending: { ru: 'Виновником оказался Дәу. Теперь он каждое утро печёт бауырсаки для всего аула, Апа следит за тестом.', en: 'The culprit was Dau. Now he bakes baursaks for the whole aul every morning, and Apa watches the dough.' },
    },
    body: { torso: 52, neck: 6, head: 18, ua: 28, fa: 26, th: 37, sh: 37, w: 42 },
    hurt: { stand: 166, crouch: 112, w: 28 },
    walk: 185,
    back: 160,
    jump: 860,
    jumpX: 240,
    palettes: [
      { skin: '#ebb68e', robe: '#7a3d9c', robe2: '#5e2d79', vest: '#283062', trim: '#ffc94a', scarf: '#f6f1e7', scarf2: '#ddd4c4', shoes: '#1d1d22', socks: '#6b5560', metal: '#d4d9e0', metal2: '#8f98a4', glasses: '#3a2a20' },
      { skin: '#e3a780', robe: '#2f8a5b', robe2: '#236a45', vest: '#6b1e2e', trim: '#ffd666', scarf: '#fff3d6', scarf2: '#e6d3a8', shoes: '#2a1a14', socks: '#5c4a44', metal: '#d4d9e0', metal2: '#8f98a4', glasses: '#3a2a20' },
    ],
    moves: moves({
      jab: { anim: 'ladle', s: 6, r: 10, dmg: 6, box: [20, 124, 98, 162], sfx: 'ladle' },
      kick: { s: 8, r: 14, dmg: 7, box: [22, 66, 96, 104], hs: 17, push: 240 },
      upper: { anim: 'kazan', s: 9, r: 23, dmg: 14, box: [4, 66, 82, 190], launch: [180, 1000], sfx: 'pot', word: 'ДҮҢК!' },
      sweep: { anim: 'ladleLow', r: 19, box: [20, 0, 108, 28], sfx: 'ladle' },
      airP: { anim: 'airLadle', s: 5, box: [16, 30, 92, 96], sfx: 'ladle' },
      airK: { box: [14, -6, 88, 40] },
    }),
    throw: { range: 92, dmg: 11, kind: 'ear', word: 'ТАРС!' },
    spec: { kind: 'baursak', s: 12, r: 15, cd: 150, vx: 660, vy: 220, g: 560, dmg: 10 },
    say: {
      intro: ['Әй, бала!', 'Тәртіп!', 'Кел, балам!'],
      taunt: ['Ұят қой!', 'Шөмішті көрдің бе?', 'Әжеңді тыңда!', 'Тәртіп!'],
      hurt: ['Ойбай-ау!', 'Әттеген-ай!', 'Ай-ай-ай!'],
      special: ['Же, же!', 'Ыстық бауырсақ!'],
      throw: ['Әй, бала!'],
      win: ['Тамақ суып қалды!', 'Үйге қайт!'],
      finisher: ['Биле, биле!'],
    },
    voice: 1.5,
  },
  {
    id: 'burkit',
    name: { ru: 'Бүркітші', en: 'Burkitshi' },
    kk: 'Бүркітші',
    bio: {
      ru: 'Охотник с беркутом из гор. Беркут сидит на перчатке и вылетает по команде. Говорит, что беркут умнее него, и это правда.',
      en: 'An eagle hunter from the mountains. The eagle sits on his glove and flies on command. He says the eagle is smarter than him, and that is true.',
    },
    special: { ru: 'Бүркіт: беркут пикирует сверху, а ты в это время свободен', en: 'Burkit: the eagle dives from above while you keep fighting' },
    finisher: 'hood',
    finisherName: { ru: 'Томаға', en: 'Tomaga (the hood)' },
    finisherText: { ru: 'беркут надевает на соперника колпачок, и тот уходит не туда', en: 'the eagle puts a hunting hood on the rival, who wanders off the wrong way' },
    story: {
      intro: { ru: 'Беркут увидел на турнире блестящий Алтын асық и решил, что это добыча. Бүркітші идёт следом и извиняется перед всеми.', en: 'The eagle spotted the shiny Golden Asyk at the tournament and decided it was prey. Burkitshi follows and apologises to everyone.' },
      ending: { ru: 'Алтын асық теперь живёт в гнезде беркута. Бүркітші навещает его по выходным.', en: 'The Golden Asyk now lives in the eagle\'s nest. Burkitshi visits it at weekends.' },
    },
    body: { torso: 58, neck: 7, head: 17, ua: 31, fa: 29, th: 41, sh: 42, w: 38 },
    hurt: { stand: 178, crouch: 118, w: 27 },
    walk: 190,
    back: 160,
    jump: 880,
    jumpX: 245,
    palettes: [
      { skin: '#d9a070', robe: '#6a4630', robe2: '#4e3322', trim: '#e8c37a', fur: '#c98a4a', fur2: '#f2dfbd', pants: '#2a2420', boots: '#1a1410', belt: '#3a2a1e', glove: '#8a5226', hair: '#1b1210', beard: '#2a1d16' },
      { skin: '#cf9466', robe: '#2d4a3a', robe2: '#213628', trim: '#d9d2b0', fur: '#8c8c8c', fur2: '#e6e6e6', pants: '#26221f', boots: '#171310', belt: '#4a2b16', glove: '#6b3c1c', hair: '#1b1210', beard: '#3a2a20' },
    ],
    moves: moves({
      jab: { box: [18, 130, 84, 164], dmg: 6 },
      kick: { dmg: 9 },
      upper: { box: [6, 70, 76, 194], launch: [170, 960] },
    }),
    throw: { range: 92, dmg: 12, kind: 'lift', word: 'ГҮРС!' },
    spec: { kind: 'eagle', s: 10, r: 10, cd: 210, dmg: 10, speed: 860 },
    say: {
      intro: ['Бүркітім дайын!', 'Аңға шықтық!'],
      taunt: ['Ұшып кетесің!', 'Тұмсығы өткір!', 'Көз жазба!'],
      hurt: ['Ойбай!', 'Әттең!', 'Ой!'],
      special: ['Ал, бүркітім!'],
      throw: ['Ұста!'],
      win: ['Бүгін олжа мол!', 'Бүркітім, жарайсың!'],
      finisher: ['Томағаны ки!'],
    },
    voice: 0.75,
  },
  {
    id: 'dombra',
    name: { ru: 'Домбырашы', en: 'Dombyrashy' },
    kk: 'Домбырашы',
    bio: {
      ru: 'Играет күй так, что заслушиваются даже соперники. Домброй тоже умеет стукнуть, но жалеет инструмент.',
      en: 'Plays a kui so well that even rivals stop to listen. Can hit with the dombra too, but feels sorry for it.',
    },
    special: { ru: 'Күй: звуковая волна, соперник двигается как в замедленной съёмке', en: 'Kui: a sound wave, the rival moves in slow motion' },
    finisher: 'sleep',
    finisherName: { ru: 'Бесік жыры', en: 'Besik zhyry (the lullaby)' },
    finisherText: { ru: 'колыбельная, и соперник засыпает прямо на ковре', en: 'a lullaby, and the rival falls asleep right on the carpet' },
    story: {
      intro: { ru: 'Победителю тоя разрешат сыграть на главной сцене. Домбырашы готовил күй три года и не собирается ждать ещё год.', en: 'The winner of the toi gets to play on the main stage. Dombyrashy spent three years on one kui and is not waiting another year.' },
      ending: { ru: 'Домбырашы сыграл на главной сцене. Дәу растрогался и заплакал так, что в степи прошёл дождь.', en: 'Dombyrashy played on the main stage. Dau was so moved he cried, and it rained over the steppe.' },
    },
    body: { torso: 56, neck: 7, head: 16, ua: 30, fa: 28, th: 43, sh: 43, w: 30 },
    hurt: { stand: 176, crouch: 116, w: 25 },
    walk: 210,
    back: 172,
    jump: 920,
    jumpX: 255,
    palettes: [
      { skin: '#e6b089', shirt: '#f2ede4', robe: '#7a1f2b', robe2: '#5c1620', trim: '#ffc94a', pants: '#2b2633', boots: '#1c1820', hat: '#f4efe6', hatTrim: '#2b6cb0', hair: '#1a1210', wood: '#b06a2c', wood2: '#6b3c18' },
      { skin: '#dda27b', shirt: '#eef2f4', robe: '#1f4f7a', robe2: '#163a5a', trim: '#ffd666', pants: '#2a2a30', boots: '#18181c', hat: '#fff6e0', hatTrim: '#c0392b', hair: '#1a1210', wood: '#9a5a24', wood2: '#5a3214' },
    ],
    moves: moves({
      jab: { anim: 'dombra', s: 6, r: 10, dmg: 6, box: [20, 124, 102, 162], sfx: 'dombra' },
      kick: { s: 8, r: 13, dmg: 7, box: [22, 70, 100, 108] },
      upper: { anim: 'dombraUp', s: 9, dmg: 13, box: [4, 66, 82, 194], launch: [170, 980], sfx: 'dombra', word: 'ДЫҢ!' },
      sweep: { anim: 'dombraLow', r: 19, box: [20, 0, 110, 28], sfx: 'dombra' },
      airP: { anim: 'airDombra', s: 5, box: [16, 30, 96, 96], sfx: 'dombra' },
    }),
    throw: { range: 92, dmg: 11, kind: 'spin', word: 'ШАРТ!' },
    spec: { kind: 'wave', s: 14, r: 16, cd: 260, vx: 560, dmg: 6, slow: 120 },
    say: {
      intro: ['Бір күй тартайын!', 'Тыңдаңыз!'],
      taunt: ['Құлағың бар ма?', 'Ырғақты ұста!', 'Нота білесің бе?'],
      hurt: ['Ой!', 'Ай-ай!', 'Әттең!'],
      special: ['Тыңда!', 'Күй!'],
      throw: ['Билейміз бе?'],
      win: ['Тағы бір күй!', 'Қол шапалақ!'],
      finisher: ['Әлди-әлди...'],
    },
    voice: 1.15,
  },
  {
    id: 'taxi',
    name: { ru: 'Таксист', en: 'Taxi driver' },
    kk: 'Таксист',
    bio: {
      ru: 'Таксист на белой «Камри 3.5». Знает все дороги, все анекдоты и всех родственников клиента.',
      en: 'A taxi driver with a white Camry 3.5. Knows every road, every joke and every relative of every client.',
    },
    special: { ru: 'Есептегіш: кидает визитку и включает счётчик, соперник платит здоровьем', en: 'The meter: throws a business card and starts the meter, the rival pays in health' },
    finisher: 'taxi',
    finisherName: { ru: 'Камри 3.5', en: 'Camry 3.5' },
    finisherText: { ru: 'подъезжает такси, соперника увозят с включённым счётчиком', en: 'the taxi rolls up and drives the rival away with the meter running' },
    story: {
      intro: { ru: 'Приз турнира как раз равен стоимости новой Камри. Таксист приехал на старой, мотор не глушил.', en: 'The prize is exactly the price of a new Camry. The taxi driver came in the old one and left the engine running.' },
      ending: { ru: 'Таксист купил новую Камри. Старую подарил Дәу, тот в неё не помещается, но очень доволен.', en: 'He bought a new Camry and gave the old one to Dau. Dau does not fit inside, but he is very happy.' },
    },
    body: { torso: 56, neck: 6, head: 18, ua: 30, fa: 28, th: 39, sh: 40, w: 42 },
    hurt: { stand: 170, crouch: 114, w: 28 },
    walk: 190,
    back: 158,
    jump: 850,
    jumpX: 230,
    palettes: [
      { skin: '#d9a27a', robe: '#3a2a24', robe2: '#2a1e1a', shirt: '#d9d4c8', trim: '#8a6a4a', pants: '#3c4d6b', boots: '#2a2a2a', cap: '#4a4a52', hair: '#1a1210' },
      { skin: '#cf9670', robe: '#1d2a3a', robe2: '#141e2a', shirt: '#e8e2d0', trim: '#5a6a8a', pants: '#2a2a30', boots: '#1e1e1e', cap: '#6b3a2a', hair: '#1a1210' },
    ],
    moves: moves({
      jab: { s: 5, r: 10, dmg: 6, box: [18, 126, 82, 160] },
      kick: { s: 10, r: 16, dmg: 9, box: [22, 70, 100, 108], push: 280 },
      upper: { s: 9, r: 25, dmg: 14, box: [6, 66, 76, 188], launch: [180, 980], word: 'ГҮРС!' },
      sweep: { s: 10, r: 21, dmg: 8 },
    }),
    throw: { range: 96, dmg: 13, kind: 'ear', word: 'ТАРС!' },
    spec: { kind: 'card', s: 10, r: 14, cd: 240, vx: 860, dmg: 3, meter: 300 },
    say: {
      intro: ['Қайда барамыз?', 'Отыр, жеткізем!'],
      taunt: ['Ұсақ ақша жоқ!', 'Тағы бір рейс!', 'Жол бос!'],
      hurt: ['Ой, бампер!', 'Ойбай!', 'Әттең!'],
      special: ['Есептегіш қосулы!'],
      throw: ['Отыр!'],
      win: ['Келесі клиент!', 'Жол болсын!'],
      finisher: ['Отыр, жеткізем!'],
    },
    voice: 0.9,
  },
  {
    id: 'baluan',
    name: { ru: 'Балуан', en: 'Baluan' },
    kk: 'Балуан',
    bio: {
      ru: 'Борец қазақ күресі. Хватает за пояс и бросает так, что соперник успевает выучить стихотворение в полёте.',
      en: 'A kazakh kures wrestler. Grabs the belt and throws so far the rival has time to learn a poem mid-flight.',
    },
    special: { ru: 'Белбеу: рывок вперёд и захват за пояс, блок не спасает, прыжок спасает', en: 'Belbeu: a dash and a belt grab, blocking does not help, jumping does' },
    finisher: 'heli',
    finisherName: { ru: 'Тікұшақ', en: 'Tikushaq (the helicopter)' },
    finisherText: { ru: 'раскручивает соперника над головой и отправляет в небо', en: 'spins the rival overhead and sends them into the sky' },
    story: {
      intro: { ru: 'Балуан выиграл все тои в округе и заскучал. Говорят, на Ұлы той придёт сам Дәу. Наконец-то соперник по размеру.', en: 'Baluan won every toi around and got bored. They say Dau himself will come to the Great Toi. Finally someone his size.' },
      ending: { ru: 'Балуан положил Дәу на лопатки. Теперь они друзья и вместе пашут поле, без трактора.', en: 'Baluan pinned Dau. Now they are friends and plough the field together, no tractor needed.' },
    },
    body: { torso: 60, neck: 6, head: 18, ua: 33, fa: 30, th: 40, sh: 40, w: 50 },
    hurt: { stand: 176, crouch: 120, w: 31 },
    walk: 176,
    back: 148,
    jump: 800,
    jumpX: 220,
    palettes: [
      { skin: '#d39668', robe: '#2f6db0', robe2: '#24548a', trim: '#f2ede4', belt: '#e0392f', pants: '#f2ede4', boots: '#3a2a20', hair: '#1b1210' },
      { skin: '#c98a5e', robe: '#c0392b', robe2: '#8a2420', trim: '#f2ede4', belt: '#2d8be0', pants: '#efe8da', boots: '#2a1d14', hair: '#1b1210' },
    ],
    moves: moves({
      jab: { s: 6, r: 10, dmg: 6, box: [18, 130, 80, 164] },
      kick: { s: 10, r: 16, dmg: 9, box: [22, 70, 98, 108] },
      upper: { s: 10, dmg: 14, box: [6, 66, 76, 190], launch: [160, 960] },
      sweep: { s: 10, r: 21, dmg: 8 },
    }),
    throw: { range: 110, dmg: 15, kind: 'lift', word: 'ГҮРС!' },
    spec: { kind: 'grab', s: 7, r: 22, cd: 220, dash: 600, dmg: 13 },
    say: {
      intro: ['Белбеуден ұста!', 'Күш бар!'],
      taunt: ['Жығамын!', 'Тағы кел, балам!', 'Аяғың әлсіз!'],
      hurt: ['Ух!', 'Ойбай!', 'Әттең!'],
      special: ['Белбеу!'],
      throw: ['Жығамын!'],
      win: ['Мен балуанмын!', 'Күш бізде!'],
      finisher: ['Тікұшақ!'],
    },
    voice: 0.6,
  },
  {
    id: 'akyn',
    name: { ru: 'Ақын', en: 'Akyn' },
    kk: 'Ақын',
    bio: {
      ru: 'Мастер айтыса. Отвечает в рифму быстрее, чем ты успеешь обидеться. Слова у неё летают, в прямом смысле.',
      en: 'An aitys master. Answers in rhyme faster than you can get offended. Her words fly, literally.',
    },
    special: { ru: 'Айтыс: острое слово летит в соперника, тот краснеет и замирает', en: 'Aitys: a sharp word flies at the rival, who blushes and freezes' },
    finisher: 'flag',
    finisherName: { ru: 'Ақ орамал', en: 'Aq oramal (the white scarf)' },
    finisherText: { ru: 'засыпает соперника словами, и тот машет белым платком', en: 'buries the rival in words until they wave a white scarf' },
    story: {
      intro: { ru: 'На Ұлы той собираются лучшие ақыны. Драться словами быстрее, если слова летают. Ақын пришла выиграть главный айтыс.', en: 'The best akyns gather at the Great Toi. Fighting with words is faster when the words can fly. Akyn came to win the main aitys.' },
      ending: { ru: 'Ақын сочинила песню про турнир. Дәу выучил её наизусть и поёт громче всех. К сожалению.', en: 'Akyn wrote a song about the tournament. Dau learned it by heart and sings it louder than anyone. Unfortunately.' },
    },
    body: { torso: 52, neck: 7, head: 17, ua: 28, fa: 26, th: 40, sh: 40, w: 34 },
    hurt: { stand: 172, crouch: 114, w: 25 },
    walk: 205,
    back: 175,
    jump: 930,
    jumpX: 260,
    palettes: [
      { skin: '#ecb894', robe: '#c0392b', robe2: '#922b21', vest: '#1f3a6b', trim: '#ffd25a', hat: '#8e1c2e', fur: '#f2ede4', feather: '#f7f3ea', shoes: '#3a2016', socks: '#7a2a2a', hair: '#1a1210' },
      { skin: '#e4ac88', robe: '#1e7a6a', robe2: '#155c50', vest: '#5a2a6a', trim: '#ffe08a', hat: '#2a5a8a', fur: '#f2ede4', feather: '#f7f3ea', shoes: '#2a1a14', socks: '#2a4a5a', hair: '#1a1210' },
    ],
    moves: moves({
      jab: { anim: 'palm', box: [18, 128, 82, 162], dmg: 6, sfx: 'slap' },
      kick: { s: 8, r: 13, dmg: 7, box: [22, 70, 98, 108] },
      upper: { s: 7, dmg: 13, launch: [170, 960] },
      sweep: { r: 19 },
    }),
    throw: { range: 92, dmg: 11, kind: 'spin', word: 'ШАРТ!' },
    spec: { kind: 'words', s: 11, r: 13, cd: 165, vx: 580, dmg: 7, stun: 42 },
    words: ['Жауап бер!', 'Сөзден қашпа!', 'Тілің қайда?', 'Ойлан!', 'Ұялмайсың ба?', 'Сөз менікі!'],
    say: {
      intro: ['Айтысқа кел!', 'Сөз бастайын!'],
      taunt: ['Жауап бер!', 'Тілің қайда?', 'Ұялмайсың ба?'],
      hurt: ['Ой!', 'Әттең!', 'Ай!'],
      special: ['Айтыс!'],
      throw: ['Билейік!'],
      win: ['Сөз менікі!', 'Айтыс бітті!'],
      finisher: ['Ақ орамалыңды бұлға!'],
    },
    voice: 1.35,
  },
  {
    id: 'dau',
    boss: true,
    name: { ru: 'Дәу', en: 'Dau' },
    kk: 'Дәу',
    bio: {
      ru: 'Великан из сказок. Унёс с тоя Алтын асық и съел бешбармак на сто человек. Медленный, но бьёт как падающая юрта.',
      en: 'A giant from the fairy tales. Took the Golden Asyk and ate beshbarmak for a hundred guests. Slow, but hits like a falling yurt.',
    },
    special: { ru: 'Жер сілкінісі: топает, по земле бежит волна, её надо перепрыгнуть', en: 'Earthquake: a stomp sends a wave along the ground, jump over it' },
    finisher: 'sneeze',
    finisherName: { ru: 'Апчхи', en: 'Apchkhi (the sneeze)' },
    finisherText: { ru: 'чихает, и соперника уносит за горизонт', en: 'sneezes so hard the rival is blown over the horizon' },
    story: {
      intro: { ru: 'Дәу проснулся от шума тоя. Шум он не любит, а бешбармак любит.', en: 'Dau woke up from the noise of the toi. He does not like noise, but he does like beshbarmak.' },
      ending: { ru: 'Дәу оставил Алтын асық себе и наконец уснул. Той продолжается шёпотом.', en: 'Dau kept the Golden Asyk and finally fell asleep. The toi goes on in a whisper.' },
    },
    body: { torso: 80, neck: 8, head: 24, ua: 42, fa: 40, th: 56, sh: 56, w: 66 },
    hurt: { stand: 245, crouch: 160, w: 40 },
    hp: 135,
    walk: 135,
    back: 115,
    jump: 720,
    jumpX: 190,
    palettes: [
      { skin: '#c98a5a', robe: '#5a6b3a', robe2: '#46542c', trim: '#c9a24a', pants: '#3a2a20', boots: '#2a1d14', belt: '#7a4a20', hair: '#2a1d16', club: '#6b4424' },
      { skin: '#b97c50', robe: '#6b3a5a', robe2: '#522c45', trim: '#d9b45a', pants: '#2c2420', boots: '#1e1610', belt: '#5a3416', hair: '#1e1610', club: '#5a381c' },
    ],
    moves: moves({
      jab: { anim: 'club', s: 8, a: 4, r: 14, dmg: 9, box: [20, 116, 128, 176], push: 170, sfx: 'mid' },
      kick: { s: 12, a: 5, r: 18, dmg: 11, box: [24, 56, 132, 112], push: 300, sfx: 'heavy' },
      upper: { anim: 'clubUp', s: 12, a: 6, r: 26, dmg: 16, box: [10, 60, 104, 236], launch: [200, 1000], word: 'ГҮРС!' },
      sweep: { anim: 'clubLow', s: 12, a: 6, r: 22, dmg: 10, box: [24, 0, 142, 34] },
      airP: { s: 6, dmg: 10, box: [16, 40, 120, 130] },
      airK: { s: 6, dmg: 12, box: [16, -10, 130, 60] },
    }),
    throw: { range: 125, dmg: 16, kind: 'lift', word: 'ГҮРС!' },
    spec: { kind: 'stomp', s: 18, r: 22, cd: 220, vx: 620, dmg: 10 },
    say: {
      intro: ['Кім мені оятты?', 'Ха-ха-ха!'],
      taunt: ['Кішкентайсың!', 'Ха-ха!', 'Тағы бешбармақ!'],
      hurt: ['Ой, шыбын!', 'Ух!'],
      special: ['Гүрс!'],
      throw: ['Ұшасың!'],
      win: ['Асық менікі!', 'Ха-ха-ха!'],
      finisher: ['Ап... апчхи!'],
    },
    voice: 0.45,
  },
];

// lines anyone can say when something happens to them
export const VICTIM = {
  dizzy: ['Басым айналды...'],
  carried: ['Түсір мені!'],
  tired: ['Шаршадым...'],
  blind: ['Қайдамын?!', 'Ештеңе көрмеймін!'],
  sleepy: ['Ұйқым келді...'],
  snore: ['Хррр...'],
  taxi: ['Мен қайда барам?!'],
  flag: ['Жеңілдім...'],
  fly: ['А-а-а-а!'],
  sneeze: ['Ойбай, жел!'],
  blush: ['Ұят болды...'],
  slow: ['Не... болып... жатыр...'],
  meter: ['Ақшам кетіп жатыр!'],
};

// Second specials: back, forward + punch (like in the arcade classics) or down + special.
// kind 'move' is a special attack done with the body, everything else flies.
const SECOND = {
  batyr: {
    spec2: { kind: 'move', cd: 250, move: { anim: 'charge', s: 9, a: 14, r: 20, dmg: 9, lvl: 'mid', box: [10, 40, 82, 170], launch: [300, 520], bs: 16, push: 300, sfx: 'heavy', word: 'ГҮРС!', dash: 560 } },
    special2: { ru: 'Шабуыл: рывок со щитом, сбивает с ног', en: 'Shabuyl: a shield charge that knocks the rival down' },
    say2: ['Шабуыл!'],
  },
  apa: {
    spec2: { kind: 'blanket', s: 12, r: 16, cd: 240, vx: 520, vy: 170, g: 420, dmg: 4, stun: 55 },
    special2: { ru: 'Көрпе: накрывает одеялом, соперник барахтается', en: 'Korpe: throws a quilt over the rival, who flounders underneath' },
    say2: ['Көрпе!', 'Тоңып қаласың!'],
  },
  burkit: {
    spec2: { kind: 'gust', s: 10, r: 14, cd: 180, vx: 680, range: 360, dmg: 7, push: 520 },
    special2: { ru: 'Қанат: беркут машет крыльями, ветер сдувает соперника', en: 'Qanat: the eagle flaps and the wind blows the rival away' },
    say2: ['Қанат!'],
  },
  dombra: {
    spec2: { kind: 'move', cd: 190, move: { anim: 'flurry', s: 6, a: 24, r: 14, dmg: 3, lvl: 'mid', box: [16, 60, 112, 172], hs: 14, bs: 8, push: 50, sfx: 'dombra', multi: 6 } },
    special2: { ru: 'Шертпе: шесть быстрых ударов по струнам', en: 'Shertpe: six quick strums in a row' },
    say2: ['Шертпе!'],
  },
  taxi: {
    spec2: { kind: 'horn', s: 10, r: 14, cd: 200, vx: 600, range: 320, dmg: 6, stun: 50 },
    special2: { ru: 'Сигнал: гудок, соперник оглох на секунду', en: 'The horn: a honk so loud the rival is stunned' },
    say2: ['Бип-бип!', 'Жол бер!'],
  },
  baluan: {
    spec2: { kind: 'move', cd: 220, move: { anim: 'ram', s: 9, a: 14, r: 20, dmg: 11, lvl: 'mid', box: [10, 90, 78, 165], launch: [280, 560], bs: 16, push: 300, sfx: 'heavy', word: 'ДҮҢК!', dash: 600 } },
    special2: { ru: 'Қошқар: таранит головой, как баран', en: 'Qoshqar: a headbutt charge like a ram' },
    say2: ['Қошқар!'],
  },
  akyn: {
    spec2: { kind: 'candy', s: 10, r: 14, cd: 200, vx: 500, dmg: 3 },
    special2: { ru: 'Шашу: горсть конфет веером', en: 'Shashu: a handful of sweets thrown in a fan' },
    say2: ['Шашу!', 'Тәтті болсын!'],
  },
  dau: {
    spec2: { kind: 'boulder', s: 18, r: 22, cd: 300, vx: 600, vy: 300, g: 900, dmg: 10 },
    special2: { ru: 'Тас: швыряет огромный камень', en: 'Tas: hurls a huge boulder' },
    say2: ['Тас!', 'Ал, мә!'],
  },
};
for (const f of FIGHTERS) {
  const s2 = SECOND[f.id];
  if (!s2) continue;
  f.spec2 = s2.spec2;
  f.special2 = s2.special2;
  f.say.special2 = s2.say2;
}

export const fighterById = (id) => FIGHTERS.find((f) => f.id === id) || FIGHTERS[0];
export const PLAYABLE = FIGHTERS.filter((f) => !f.boss);

// a gold costume unlocked with stars
export function goldPalette(pal) {
  const g = { ...pal, robe: '#d9a520', robe2: '#a87810', trim: '#fff1a8' };
  if (pal.vest) g.vest = '#7a4e08';
  if (pal.belt) g.belt = '#fff1a8';
  return g;
}

// what the crowd shouts on big moments
export const CROWD = ['Жарайсың!', 'Бәрекелді!', 'Алға!', 'Ура!', 'Ойбай!', 'Тағы!', 'Керемет!', 'Мықты!'];
