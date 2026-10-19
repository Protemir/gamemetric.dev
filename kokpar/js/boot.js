// Вход для сборки на портал (tools/build-cg.mjs ставит его вместо game.js).
// SDK CrazyGames поднимается до игры: сохранения карьеры идут в его Data-модуль (привязан к аккаунту игрока).
const sdk = window.CrazyGames && window.CrazyGames.SDK;
let ready = null;
if (sdk) {
  try {
    await sdk.init();
    if (sdk.environment !== 'disabled') ready = sdk;
  } catch { ready = null; }
}
if (ready) {
  try { ready.game.loadingStart(); } catch { /* не важно */ }
  if (ready.data) window.KOKPAR_DATA = ready.data;
}
window.KOKPAR_SDK = ready;
await import('./game.js');
