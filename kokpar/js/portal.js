// Связь с порталом. Сборки для порталов (tools/build-cg.mjs) запускают игру через свой вход:
//  CrazyGames — js/boot.js поднимает SDK v3 и кладёт его в window.KOKPAR_SDK;
//  Playgama — js/boot-pg.js поднимает Bridge и кладёт его в window.KOKPAR_PG;
//  Яндекс Игры — js/boot-ya.js поднимает YaGames и кладёт ysdk в window.KOKPAR_YA.
// На gamemetric.dev ничего этого нет — здесь всё молчит.
const sdk = () => window.KOKPAR_SDK || null;
const pg = () => window.KOKPAR_PG || null;
const ya = () => window.KOKPAR_YA || null;
let playing = false, loaded = false;

// язык игрока по данным портала: ru для региона, иначе en; null — портал не знает
export function portalLang() {
  try {
    const loc = sdk()?.user?.systemInfo?.locale || pg()?.platform?.language || ya()?.environment?.i18n?.lang;
    if (!loc) return null;
    return /^(ru|kk|ky|be|uz|tg|uk)\b/i.test(loc) ? 'ru' : 'en';
  } catch { return null; }
}
// каждый кадр: идёт ли сейчас сам матч; SDK слышит только перемены
export function gameplay(on) {
  const s = sdk(), y = ya();
  if ((!s && !y) || on === playing) return;
  playing = on;
  try { if (s) on ? s.game.gameplayStart() : s.game.gameplayStop(); } catch { /* портал не готов */ }
  try { if (y) on ? y.features.GameplayAPI?.start() : y.features.GameplayAPI?.stop(); } catch { /* портал не готов */ }
}
// первый кадр, в который можно играть
export function loadingDone() {
  if (loaded) return;
  loaded = true;
  try { sdk()?.game.loadingStop(); } catch { /* не важно */ }
}
// Playgama и Яндекс: экран загрузки снят, кадр нарисован — можно играть
let readySent = false;
export function gameReady() {
  if (readySent) return;
  readySent = true;
  try { pg()?.platform.sendMessage('game_ready'); } catch { /* не важно */ }
  try { ya()?.features.LoadingAPI?.ready(); } catch { /* не важно */ }
}
export function happytime() { try { sdk()?.game.happytime(); } catch { /* не важно */ } }

// ---------- звук: тишина, когда портал просит, вкладка скрыта или идёт реклама ----------
let muteFn = null, platformSilent = false, hidden = false, adOpen = false;
const pushMute = () => { const m = platformSilent || hidden || adOpen; window.__portalMuted = m; muteFn?.(m); };
// fn(muted) сразу и при каждой перемене
export function onPortalMute(fn) {
  const s = sdk(), b = pg(), y = ya();
  if (s) {
    try { fn(!!s.game.settings.muteAudio); s.game.addSettingsChangeListener((st) => fn(!!st.muteAudio)); } catch { /* нет настроек */ }
    return;
  }
  if (!b && !y) return;
  muteFn = fn;
  if (b) {
    try {
      platformSilent = b.platform.isAudioEnabled === false;
      b.platform.on(b.EVENT_NAME.AUDIO_STATE_CHANGED, (on) => { platformSilent = !on; pushMute(); });
    } catch { /* нет событий звука */ }
  }
  if (y) { // Яндекс просит паузу (реклама, свернули, свой оверлей) — тишина до «продолжить»
    try { y.on('game_api_pause', () => { platformSilent = true; pushMute(); }); y.on('game_api_resume', () => { platformSilent = false; pushMute(); }); } catch { /* старый SDK */ }
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; pushMute(); });
  pushMute();
}
// портал ставит игру на паузу (и снимает)
export function onPortalPause(fn) {
  const b = pg(), y = ya();
  if (b) { try { b.platform.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, (p) => fn(!!p)); } catch { /* нет события */ } }
  if (y) { try { y.on('game_api_pause', () => fn(true)); y.on('game_api_resume', () => fn(false)); } catch { /* старый SDK */ } }
}

// ---------- реклама (Playgama и Яндекс): межэкранная в итогах, не чаще раза в 2 минуты; за награду — по кнопке ----------
const AD_GAP = Number(new URLSearchParams(location.search).get('adgap') ?? 120000); // ?adgap — для автотеста
// первая — не раньше 4-й минуты: итоги первого матча новичка (~2:10) без рекламы, он как раз решает, играть ли дальше
let lastAd = performance.now() + Math.min(AD_GAP, 120000);
let adWatch = false;
const setAd = (open) => { adOpen = open; window.__adOpen = open; pushMute(); };
function watchAds(b) {
  if (adWatch) return;
  adWatch = true;
  try {
    b.advertisement.on(b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, (st) => setAd(st === 'opened'));
    b.advertisement.on(b.EVENT_NAME.REWARDED_STATE_CHANGED, (st) => setAd(st === 'opened' || st === 'rewarded'));
  } catch { /* нет событий рекламы */ }
}
export function interstitial() {
  const b = pg(), y = ya();
  if ((!b && !y) || performance.now() - lastAd < AD_GAP) return;
  try {
    if (y) {
      lastAd = performance.now();
      y.adv.showFullscreenAdv({ callbacks: { onOpen: () => setAd(true), onClose: () => setAd(false), onError: () => setAd(false), onOffline: () => setAd(false) } });
      return;
    }
    if (!b.advertisement.isInterstitialSupported) return;
    watchAds(b);
    lastAd = performance.now();
    b.advertisement.showInterstitial('match_end');
  } catch { setAd(false); /* реклама не обязательна для игры */ }
}
export function canReward() { try { return !!ya() || !!pg()?.advertisement.isRewardedSupported; } catch { return false; } }
// показать рекламу за награду; true — досмотрел, награду можно давать
export function rewarded() {
  const b = pg(), y = ya();
  if (!b && !y) return Promise.resolve(false);
  return new Promise((done) => {
    let got = false, over = false;
    const finish = (v) => { if (!over) { over = true; setAd(false); lastAd = performance.now(); done(v); } }; // после рекламы за награду межэкранная — не сразу
    try {
      if (y) {
        y.adv.showRewardedVideo({ callbacks: { onOpen: () => setAd(true), onRewarded: () => { got = true; }, onClose: () => finish(got), onError: () => finish(false) } });
      } else {
        watchAds(b);
        b.advertisement.on(b.EVENT_NAME.REWARDED_STATE_CHANGED, (st) => {
          if (st === 'rewarded') got = true;
          if (st === 'closed') finish(got);
          if (st === 'failed') finish(false);
        });
        b.advertisement.showRewarded('double_prize');
      }
      setTimeout(() => finish(got), 120000); // реклама так и не закрылась — не держим игру
    } catch { finish(false); }
  });
}
window.KOKPAR_ADS = { canReward, rewarded };
