// Вход для сборки на Яндекс Игры (tools/build-cg.mjs --ya ставит его вместо game.js).
// SDK (/sdk.js с хостинга Яндекса) поднимается до игры; прогресс — в данных игрока (player.getData/setData),
// не вышло — localStorage. Нет SDK (не загрузился, игра открыта не на Яндексе) — игра всё равно работает.
const wait = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
let ysdk = null;
if (window.YaGames) {
  try { ysdk = await wait(window.YaGames.init(), 6000); } catch { ysdk = null; }
}
window.KOKPAR_YA = ysdk;
window.KOKPAR_BUILD = 'yandex'; // сборка для Яндекса: серке — кожаный мешок, без сети и счётчика

const KEYS = ['kokpar.career'];
const local = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* закрыто */ } } };
const cache = {};
let player = null;
if (ysdk) {
  try {
    player = await wait(ysdk.getPlayer({ scopes: false }), 4000); // без окна авторизации
    const data = (await wait(player.getData(KEYS), 4000)) || {};
    for (const k of KEYS) { const v = data[k]; if (v != null) cache[k] = typeof v === 'string' ? v : JSON.stringify(v); }
  } catch { player = null; }
}
// setData заменяет все данные игрока разом — шлём весь кэш, не чаще раза в полсекунды
let flushT = null;
const flush = () => { flushT = null; player.setData({ ...cache }).catch(() => { for (const k of Object.keys(cache)) local.set(k, cache[k]); }); };
window.KOKPAR_DATA = {
  getItem: (k) => (k in cache ? cache[k] : player ? null : local.get(k)),
  setItem: (k, v) => {
    cache[k] = String(v);
    if (player) { if (!flushT) flushT = setTimeout(flush, 500); }
    else local.set(k, String(v));
  },
  removeItem: (k) => { delete cache[k]; if (player && !flushT) flushT = setTimeout(flush, 500); },
};
// вкладку закрывают — не потерять последний сейв
addEventListener('pagehide', () => { if (flushT) { clearTimeout(flushT); flush(); } });
await import('./game.js');
