// Связь с порталом. Сборки для порталов (tools/build-cg.mjs) запускают игру через свой вход:
//  CrazyGames — js/boot.js поднимает SDK v3 и кладёт его в window.KOKPAR_SDK;
//  Playgama — js/boot-pg.js поднимает Bridge и кладёт его в window.KOKPAR_PG.
// На gamemetric.dev ни того ни другого нет — здесь всё молчит.
const sdk = () => window.KOKPAR_SDK || null;
const pg = () => window.KOKPAR_PG || null;
let playing = false, loaded = false;

// язык игрока по данным портала: ru для региона, иначе en; null — портал не знает
export function portalLang() {
  try {
    const loc = sdk()?.user?.systemInfo?.locale || pg()?.platform?.language;
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
// первый кадр, в который можно играть
export function loadingDone() {
  if (loaded) return;
  loaded = true;
  try { sdk()?.game.loadingStop(); } catch { /* не важно */ }
}
// Playgama: экран загрузки снят, кадр нарисован — можно играть
let readySent = false;
export function gameReady() {
  if (readySent) return;
  readySent = true;
  try { pg()?.platform.sendMessage('game_ready'); } catch { /* не важно */ }
}
export function happytime() { try { sdk()?.game.happytime(); } catch { /* не важно */ } }

// ---------- звук: тишина, когда портал просит, вкладка скрыта или идёт реклама ----------
let muteFn = null, platformSilent = false, hidden = false, adOpen = false;
const pushMute = () => { const m = platformSilent || hidden || adOpen; window.__portalMuted = m; muteFn?.(m); };
// fn(muted) сразу и при каждой перемене
export function onPortalMute(fn) {
  const s = sdk(), b = pg();
  if (s) {
    try { fn(!!s.game.settings.muteAudio); s.game.addSettingsChangeListener((st) => fn(!!st.muteAudio)); } catch { /* нет настроек */ }
    return;
  }
  if (!b) return;
  muteFn = fn;
  try {
    platformSilent = b.platform.isAudioEnabled === false;
    b.platform.on(b.EVENT_NAME.AUDIO_STATE_CHANGED, (on) => { platformSilent = !on; pushMute(); });
  } catch { /* нет событий звука */ }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; pushMute(); });
  pushMute();
}
// портал ставит игру на паузу (и снимает)
export function onPortalPause(fn) {
  const b = pg();
  if (!b) return;
  try { b.platform.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, (p) => fn(!!p)); } catch { /* нет события */ }
}

// ---------- реклама (только Playgama): межэкранная в паузах игры, не чаще раза в 2 минуты; за награду — по кнопке ----------
const AD_GAP = Number(new URLSearchParams(location.search).get('adgap') ?? 120000); // ?adgap — для автотеста
let lastAd = performance.now(); // первая — не раньше чем через 2 минуты игры
let adWatch = false;
function watchAds(b) {
  if (adWatch) return;
  adWatch = true;
  const set = (open) => { adOpen = open; window.__adOpen = open; pushMute(); };
  try {
    b.advertisement.on(b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, (st) => set(st === 'opened'));
    b.advertisement.on(b.EVENT_NAME.REWARDED_STATE_CHANGED, (st) => set(st === 'opened' || st === 'rewarded'));
  } catch { /* нет событий рекламы */ }
}
export function interstitial() {
  const b = pg();
  if (!b) return;
  try {
    if (!b.advertisement.isInterstitialSupported || performance.now() - lastAd < AD_GAP) return;
    watchAds(b);
    lastAd = performance.now();
    b.advertisement.showInterstitial('match_end');
  } catch { /* реклама не обязательна для игры */ }
}
export function canReward() { try { return !!pg()?.advertisement.isRewardedSupported; } catch { return false; } }
// показать рекламу за награду; true — досмотрел, награду можно давать
export function rewarded() {
  const b = pg();
  if (!b) return Promise.resolve(false);
  return new Promise((done) => {
    let got = false, over = false;
    const finish = (v) => { if (!over) { over = true; done(v); } };
    try {
      watchAds(b);
      b.advertisement.on(b.EVENT_NAME.REWARDED_STATE_CHANGED, (st) => {
        if (st === 'rewarded') got = true;
        if (st === 'closed') finish(got);
        if (st === 'failed') finish(false);
      });
      b.advertisement.showRewarded('double_prize');
      setTimeout(() => finish(got), 120000); // реклама так и не закрылась — не держим игру
    } catch { finish(false); }
  });
}
window.KOKPAR_ADS = { canReward, rewarded };
