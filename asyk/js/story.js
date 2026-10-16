// The story: summer 1987, a city kid sent to his grandmother's aul under the mountains.
// Each chapter is a yard with three kons; the last one is a duel with the street's aga.
// Lines are [who, Russian, English]. Kazakh words stay in both: they are the flavour.

export const PEOPLE = {
  apa: { name: ['Апа', 'Apa (Grandma)'] },
  timur: { name: ['Тимур', 'Timur'], kid: 0 },
  bekzhan: { name: ['Бекжан', 'Bekzhan'], kid: 1 },
  asem: { name: ['Әсем', 'Asem'], kid: 2 },
  erke: { name: ['Ерке', 'Erke'], kid: 3 },
  askar: { name: ['Асқар', 'Askar'], kid: 4 },
  erlan: { name: ['Ерлан-аға', 'Erlan-aga'], aga: 'erlan' },
  dauren: { name: ['Даурен-аға', 'Dauren-aga'], aga: 'dauren' },
  saken: { name: ['Сәкен-аға', 'Saken-aga'], aga: 'saken' },
};

// how good each aga is (0 sloppy .. 1 sharp)
export const AGAS = {
  erlan: { skill: 0.62 },
  dauren: { skill: 0.78 },
  saken: { skill: 0.86 },
};

export const CHAPTERS = [
  {
    id: 'summer',
    title: ['Жаз. Апашкин двор', 'Summer. Grandma’s yard'],
    sub: ['Июль 1987-го. Первый вечер в ауле.', 'July 1987. First evening in the aul.'],
    yard: 'yard',
    kons: [
      {
        target: 150,
        intro: [
          ['bekzhan', 'О, қалалық приехал! В асық-то умеешь? Или в Алматы только в «Ну, погоди!» на «Электронике» режетесь?', 'Look, the kalalyk is here — the city boy! Can you even play asyk? Or do you only play handheld games in Almaty?'],
          ['asem', 'Бекжан, отстань от него. Смотри: тянешь руку назад и бросаешь. Выбил асык за круг — он твой.', 'Bekzhan, leave him alone. Look: pull your hand back and throw. Knock a bone out of the circle — it’s yours.'],
        ],
        win: [
          ['askar', 'Нормально бросает.', 'He throws all right.'],
          ['bekzhan', 'Да повезло просто…', 'Just lucky…'],
          ['apa', 'Балам, далеко не уходи! Как стемнеет — домой, ужинать.', 'Balam, don’t wander off! When it gets dark — home for dinner.'],
        ],
      },
      {
        target: 260,
        intro: [['erke', 'Я свой крашеный асык поставил! Он втрое дороже. Только не выбивай его, а?', 'I put in my painted bone! It’s worth three times more. Just don’t knock it out, okay?']],
        win: [
          ['timur', 'Тихо! Слышите? Ерлан-аға идёт.', 'Quiet! Hear that? Erlan-aga is coming.'],
          ['bekzhan', 'Ну всё, қалалық. Сейчас тебя разденут до последнего асыка.', 'That’s it, city boy. He’ll take every bone you’ve got.'],
        ],
      },
      {
        duel: { aga: 'erlan', throws: 5 },
        intro: [
          ['erlan', 'Это кто тут из города? Давай один на один. Сақа у меня со свинцом — тяжёлая.', 'So who’s the city boy? One on one. My saka has lead poured in — it’s heavy.'],
          ['erlan', 'По пять бросков. Я с той стороны. Кто больше наберёт — тот и прав.', 'Five throws each. I throw from the other side. Most points wins.'],
        ],
        win: [
          ['erlan', '…Ладно. Рука у тебя есть.', '…Fine. You’ve got an arm.'],
          ['asem', 'Ерлана на нашей улице ещё никто не обыгрывал!', 'Nobody on our street has ever beaten Erlan!'],
          ['erlan', 'Завтра у школы играем с Дауреном с соседней улицы. Там с гор ветер дует — посмотрим на тебя.', 'Tomorrow we play Dauren from the next street, at the school. The wind blows from the mountains there — we’ll see about you.'],
          ['apa', 'Балам! Ужинать! Бешбармак стынет!', 'Balam! Dinner! The beshbarmak is getting cold!'],
        ],
        lose: [
          ['erlan', 'Иди, қалалық, молока попей. Приходи, когда научишься.', 'Go drink your milk, city boy. Come back when you learn.'],
          ['asem', 'Не слушай его. Давай ещё раз.', 'Don’t listen to him. Go again.'],
        ],
      },
    ],
  },
  {
    id: 'school',
    title: ['Мектеп ауласы', 'The school yard'],
    sub: ['Вечер у школы. С гор дует ветер.', 'Evening at the school. Wind from the mountains.'],
    yard: 'school',
    kons: [
      {
        target: 300,
        wind: 6,
        intro: [
          ['asem', 'Это наша школа. Вечером сюда с гор дует — асыки сносит.', 'This is our school. In the evening the wind comes down from the mountains — it blows the bones away.'],
          ['timur', 'Видишь, пыль летит? Ветер тянет вбок. Целься с запасом.', 'See the dust? The wind pulls sideways. Aim off a little.'],
        ],
        win: [['erke', 'Ветер ему не мешает!', 'The wind doesn’t bother him!']],
      },
      {
        target: 400,
        wind: -8,
        intro: [['erke', 'Даурен уже идёт! У него кепка как у артиста!', 'Dauren is coming! He has a cap like a movie star!']],
        win: [
          ['askar', 'Вон он. В клетчатой кепке.', 'There he is. In the checkered cap.'],
          ['bekzhan', 'Даурен даже Ерлана обыгрывал. Два раза.', 'Dauren beat even Erlan. Twice.'],
        ],
      },
      {
        duel: { aga: 'dauren', throws: 5 },
        wind: 12,
        intro: [
          ['dauren', 'Ерлан говорит, ты его сделал. Стареет Ерлан.', 'Erlan says you beat him. Erlan is getting old.'],
          ['dauren', 'Тут ветер — мой друг. Бросай первым, қалалық.', 'Here the wind is my friend. You throw first, city boy.'],
        ],
        win: [
          ['dauren', 'Ветер сегодня был не на моей стороне… Уважаю.', 'The wind wasn’t on my side today… Respect.'],
          ['bekzhan', 'Қалалық теперь наш! С нашей улицы!', 'The city boy is one of us now! From our street!'],
          ['askar', 'Зимой на льду турнир. Готовься.', 'In winter there’s a tournament on the ice. Get ready.'],
        ],
        lose: [
          ['dauren', 'Ветер не обманешь. Ещё разок?', 'You can’t fool the wind. Once more?'],
          ['timur', 'Он всегда с ветром целится. Возьми чуть против.', 'He always aims with the wind. Aim a bit against it.'],
        ],
      },
    ],
  },
  {
    id: 'winter',
    title: ['Қыс. Турнир на льду', 'Winter. Tournament on the ice'],
    sub: ['Январь 1988-го. Каникулы, во дворе залили каток.', 'January 1988. Winter break, the yard is an ice rink.'],
    yard: 'winter',
    ice: true,
    kons: [
      {
        target: 350,
        intro: [
          ['askar', 'Видишь лёд? Асыки тут катятся вдвое дальше. Бросай мягче.', 'See the ice? Bones slide twice as far here. Throw softer.'],
          ['erke', 'У меня валенки мокрые, но я не уйду!', 'My felt boots are soaked, but I’m not leaving!'],
        ],
        win: [['bekzhan', 'Қалалық на льду как дома!', 'The city boy plays on ice like he was born on it!']],
      },
      {
        target: 450,
        intro: [['timur', 'Говорят, Сәкен-аға вернулся из армии. Он чемпион всего аула.', 'They say Saken-aga is back from the army. He’s the champion of the whole aul.']],
        win: [['asem', 'Вон он идёт. В шинели!', 'Here he comes. In his army coat!']],
      },
      {
        duel: { aga: 'saken', throws: 5 },
        intro: [
          ['saken', 'Ерлан с Дауреном мне все уши про тебя прожужжали. Ну, покажи, қалалық.', 'Erlan and Dauren talked my ears off about you. Go on, city boy, show me.'],
          ['saken', 'На льду главное не сила, а рука. Начинай.', 'On ice it’s not strength, it’s the hand. You start.'],
        ],
        win: [
          ['saken', '…Сильно. Я так даже в армии не бросал.', '…Strong. I didn’t throw like that even in the army.'],
          ['asem', 'Приезжай летом снова, ладно?', 'Come back next summer, okay?'],
          ['apa', 'Балам! Домой, замёрзнешь! Чай с бауырсақами стынет!', 'Balam! Come home, you’ll freeze! The tea and baursaks are getting cold!'],
        ],
        lose: [
          ['saken', 'Лёд не прощает. Ещё раз?', 'The ice doesn’t forgive. Again?'],
          ['askar', 'Бросай мягче, она скользит.', 'Throw softer, it slides.'],
        ],
      },
    ],
  },
];

// short shouts during play, [Russian, English]; who says it is picked among the kids
export const BARKS = {
  alshy: [['Алшы!', 'Alshy!'], ['Во даёт!', 'Wow!'], ['Мықты!', 'Myqty!']],
  taike: [['Тәйке!', 'Taike!'], ['Неплохо!', 'Not bad!']],
  shik: [['Шік — ещё бросок!', 'Shik — throw again!'], ['Тағы бір!', 'Tagy bir!']],
  buk: [['Бүк…', 'Buk…'], ['Ну такое.', 'Meh.']],
  miss: [['Мимо!', 'Missed!'], ['Ойбай…', 'Oibai…'], ['Әй, қалалық!', 'Hey, city boy!'], ['Руки городские!', 'City hands!']],
  many: [['Ого-о-о!', 'Whoa!'], ['Три сразу!', 'Three at once!'], ['Вот это бросок!', 'What a throw!']],
  cleared: [['Кон чистый!', 'Clean kon!'], ['Всё снёс!', 'Took them all!']],
  ouch: [['Ой, нога!', 'Ow, my foot!'], ['Аккуратней!', 'Careful!']],
  dyed: [['Мой крашеный!', 'My painted one!']],
  agaThrows: [['Смотрите!', 'Look!'], ['Сейчас как даст…', 'Here it comes…']],
  agaGood: [['Вот это аға…', 'That’s the aga…'], ['Ну всё…', 'Oh no…']],
  agaMiss: [['Промазал!', 'He missed!'], ['Ха, аға мимо!', 'Ha, the aga missed!']],
  wind: [['Ветер!', 'Wind!'], ['Сносит!', 'It’s drifting!']],
};
