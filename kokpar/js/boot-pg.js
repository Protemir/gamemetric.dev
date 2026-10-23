// Вход для сборки на Playgama (tools/build-cg.mjs --pg ставит его вместо game.js).
// Bridge поднимается до игры; прогресс — через bridge.storage одним запросом (не вышло — localStorage).
// Нет Bridge (не загрузился, игра открыта не на портале) — игра всё равно работает.
const wait = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
const b = window.bridge;
let ready = null;
if (b) {
  try { await wait(b.initialize(), 6000); ready = b; } catch { ready = null; }
}
window.KOKPAR_PG = ready;
window.KOKPAR_BUILD = 'playgama'; // сборка для Playgama: серке — кожаный мешок, без сети и счётчика
window.KOKPAR_MAXASPECT = 2; // на ПК поле не шире 2:1, дальше — поля по бокам

const KEYS = ['kokpar.career'];
const local = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* закрыто */ } } };
const cache = {};
let useBridge = !!ready;
if (ready) {
  try {
    const vals = await wait(ready.storage.get(KEYS), 4000);
    KEYS.forEach((k, i) => { const v = vals?.[i]; if (v != null) cache[k] = typeof v === 'string' ? v : JSON.stringify(v); });
  } catch { useBridge = false; }
}
window.KOKPAR_DATA = {
  getItem: (k) => (k in cache ? cache[k] : useBridge ? null : local.get(k)),
  setItem: (k, v) => {
    cache[k] = String(v);
    if (useBridge) ready.storage.set([k], [String(v)]).catch(() => local.set(k, String(v)));
    else local.set(k, String(v));
  },
  removeItem: (k) => { delete cache[k]; if (useBridge) ready.storage.delete([k]).catch(() => {}); },
};
await import('./game.js');
