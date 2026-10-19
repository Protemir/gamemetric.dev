// Связь с порталом (CrazyGames SDK v3). Сборка для портала (tools/build-cg.mjs) запускает игру через js/boot.js:
// он поднимает SDK и кладёт его в window.KOKPAR_SDK. На gamemetric.dev SDK нет — здесь всё молчит.
const sdk = () => window.KOKPAR_SDK || null;
let playing = false, loaded = false;

// язык игрока по данным портала: ru для региона, иначе en; null — портал не знает
export function portalLang() {
  try {
    const loc = sdk()?.user?.systemInfo?.locale;
    if (!loc) return null;
    return /^(ru|kk|ky|be|uz|tg|uk)\b/i.test(loc) ? 'ru' : 'en';
  } catch { return null; }
}
// каждый кадр: идёт ли сейчас сам матч; SDK слышит только перемены
export function gameplay(on) {
  const s = sdk();
  if (!s || on === playing) return;
  playing = on;
  try { on ? s.game.gameplayStart() : s.game.gameplayStop(); } catch { /* портал не готов */ }
}
export function loadingDone() {
  const s = sdk();
  if (!s || loaded) return;
  loaded = true;
  try { s.game.loadingStop(); } catch { /* не важно */ }
}
export function happytime() { try { sdk()?.game.happytime(); } catch { /* не важно */ } }
// fn(muted) сразу и при каждом переключении звука на портале
export function onPortalMute(fn) {
  const s = sdk();
  if (!s) return;
  try { fn(!!s.game.settings.muteAudio); s.game.addSettingsChangeListener((st) => fn(!!st.muteAudio)); } catch { /* нет настроек */ }
}
