// The bazaar between kons: tenge for wins, a saka to throw with and up to three tumars that bend
// the rules. Everything bought stays: it is a collection, not a run. Names [Russian, English].

export const SAKAS = {
  red: { name: ['Қызыл сақа', 'Red saka'], desc: ['Твоя, крашеная. Ничего лишнего.', 'Your own, dyed red. Nothing fancy.'], price: 0, m: 1.7, mu: 52, look: 'red' },
  light: { name: ['Жеңіл сақа', 'Light saka'], desc: ['Сухая и лёгкая: катится далеко, отскакивает рикошетом.', 'Dry and light: rolls far and ricochets.'], price: 8, m: 1.2, mu: 40, look: 'white' },
  lead: { name: ['Қорғасын сақа', 'Lead saka'], desc: ['Свинец внутри: тяжёлая, катится недалеко, сносит всё на пути.', 'Lead inside: heavy, short roll, smashes through.'], price: 12, m: 2.6, mu: 62, look: 'lead' },
  gold: { name: ['Алтын сақа', 'Golden saka'], desc: ['Счастливая: гораздо чаще ложится алшы.', 'Lucky: lands on alshy far more often.'], price: 25, m: 1.7, mu: 52, look: 'gold', sides: { alshy: 34 } },
};

export const TUMARS = {
  baursak: { name: ['Апаның бауырсағы', 'Apa’s baursak'], desc: ['Первый выбитый асык в коне: +20.', 'First bone out in a kon: +20.'], price: 8 },
  triangle: { name: ['Үшбұрыш тұмар', 'Triangle tumar'], desc: ['Тәйке даёт ×3 вместо ×2.', 'Taike gives ×3 instead of ×2.'], price: 10 },
  horseshoe: { name: ['Жылқы тағасы', 'Horseshoe'], desc: ['Шік даёт два броска вместо одного.', 'Shik gives two throws instead of one.'], price: 10 },
  tooth: { name: ['Қасқыр тісі', 'Wolf tooth'], desc: ['Каждый следующий асык за бросок дороже ещё на +5.', 'Each next bone in one throw is worth +5 more.'], price: 12 },
  feather: { name: ['Бүркіт қауырсыны', 'Eagle feather'], desc: ['+1 бросок в каждом коне.', '+1 throw in every kon.'], price: 14 },
  dombra: { name: ['Кішкене домбыра', 'Little dombra'], desc: ['Цепочка растёт на +2 за бросок.', 'The chain grows by +2 per throw.'], price: 16 },
};

export const SLOTS = 3;

const KEY = 'asyk.bag';
export function loadBag(store) {
  const b = store.get(KEY, null) || {};
  return { coins: b.coins ?? 5, saka: b.saka || 'red', owned: b.owned || ['red'], tumars: b.tumars || [], on: b.on || [] };
}
export const saveBag = (store, bag) => store.set(KEY, bag);

// what the bag changes in the rules (game.js reads this as g.mods)
export function mods(bag) {
  const on = new Set(bag.on);
  return {
    saka: SAKAS[bag.saka] || SAKAS.red,
    firstBonus: on.has('baursak') ? 20 : 0,
    taikeMult: on.has('triangle') ? 3 : 0,
    shikThrows: on.has('horseshoe') ? 2 : 0,
    domino: on.has('tooth') ? 5 : 0,
    extraThrows: on.has('feather') ? 1 : 0,
    chainStep: on.has('dombra') ? 2 : 1,
  };
}

// tenge for a kon: a win pays a base, each throw left and the score over the target; a loss a little
export function reward(g) {
  if (g.result !== 'win') return 1;
  if (g.duel) return 6 + Math.min(4, g.throws);
  return 3 + Math.min(4, g.throws) + Math.min(5, Math.floor(Math.max(0, g.score - g.target) / 60));
}
