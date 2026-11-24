// Достижения «Табуна»: id, название и условие на двух языках, награда в тенге.
export const ACH = [
  { id: 'herd100', r: 100, ru: ['Сотня', '100 коней в одном забеге'], en: ['A Hundred', '100 horses in one run'] },
  { id: 'herd300', r: 300, ru: ['Великий табун', '300 коней в одном забеге'], en: ['Great Herd', '300 horses in one run'] },
  { id: 'herd999', r: 1000, ru: ['Мың жылқы', '999 коней в одном забеге'], en: ['A Thousand Horses', '999 horses in one run'] },
  { id: 'combo5', r: 150, ru: ['Чутьё', 'Комбо ×5: пять лучших ворот подряд'], en: ['Instinct', 'Combo ×5: five best gates in a row'] },
  { id: 'golden', r: 100, ru: ['Алтын тұлпар', 'Поймать золотого коня'], en: ['Golden Tulpar', 'Catch the golden horse'] },
  { id: 'lucky', r: 100, ru: ['Удача', 'Открыть ворота «?» и получить ×2'], en: ['Lucky', 'Open a «?» gate and get ×2'] },
  { id: 'stars3', r: 100, ru: ['Три звезды', 'Пройти уровень на три звезды'], en: ['Three Stars', 'Get three stars on a level'] },
  { id: 'noloss', r: 200, ru: ['Ни одного не потерял', 'Победить, не потеряв ни коня'], en: ['Not One Lost', 'Win without losing a single horse'] },
  { id: 'boss', r: 200, ru: ['Гроза баев', 'Победить в большой байге'], en: ['Bane of Bais', 'Win a Grand Race'] },
  { id: 'daily', r: 150, ru: ['Ночная байга', 'Выиграть байгу дня'], en: ['Night Race', 'Win the Daily Race'] },
  { id: 'lvl10', r: 300, ru: ['Бывалый', 'Дойти до 10-го уровня'], en: ['Seasoned', 'Reach level 10'] },
  { id: 'lvl25', r: 800, ru: ['Батыр', 'Дойти до 25-го уровня'], en: ['Batyr', 'Reach level 25'] },
];
export const achById = (id) => ACH.find((a) => a.id === id);
