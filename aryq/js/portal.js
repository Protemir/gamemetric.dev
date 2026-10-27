// Builds for game portals (tools/build-portal.mjs) set window.ARYQ_PORTAL before the game loads.
// On gamemetric.dev it is unset and everything here does nothing.
// CrazyGames: js/boot.js starts their SDK v3 first; here the game tells it when the player is
// really playing (gameplayStart/Stop), when loading is over, takes the player's language and obeys
// the portal's mute.
// Playgama: js/boot.js starts Bridge; here the game says it is ready, takes the language, obeys the
// platform's sound and pause, and shows a full-screen ad at a natural break now and then.
// Yandex Games: js/boot.js starts their SDK (YaGames.init); the same as Playgama through LoadingAPI,
// GameplayAPI, environment.i18n.lang, game_api_pause/resume and showFullscreenAdv.
export const PORTAL = window.ARYQ_PORTAL || null;
const sdk = () => window.ARYQ_SDK_READY || null;
const pg = () => (PORTAL === 'playgama' && window.ARYQ_BRIDGE) || null;
const ya = () => (PORTAL === 'yandex' && window.ARYQ_YSDK) || null;
const yaCall = (f) => {
  try {
    const r = f(ya());
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* an SDK without that part: the game goes on */
  }
};

let playing = false;

const regional = (loc) => (/^(ru|kk|ky|be|uz|tg|uk)\b/i.test(loc) ? 'ru' : 'en');

// 'ru' for players from the region, 'en' for everyone else, null if the portal does not say
export function portalLang() {
  try {
    const b = pg();
    if (b) return b.platform.language ? regional(String(b.platform.language)) : null;
    const y = ya();
    if (y) return window.ARYQ_YLANG ? regional(String(window.ARYQ_YLANG)) : null;
    const s = sdk();
    const loc = s && s.user && s.user.systemInfo && s.user.systemInfo.locale;
    if (!loc) return null;
    return regional(loc);
  } catch {
    return null;
  }
}

const say = (msg) => {
  try {
    const r = pg().platform.sendMessage(msg);
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* not important */
  }
};

// called every frame with "is the player in a running game right now"; the portal hears only changes
let started = false;
export function gameplay(on) {
  if (ya()) {
    if (on === playing) return;
    if (on) loadingDone();
    playing = on;
    yaCall((y) => (on ? y.features.GameplayAPI.start() : y.features.GameplayAPI.stop()));
    return;
  }
  if (pg()) {
    if (on === playing) return;
    if (on) loadingDone();
    playing = on;
    // Playgama has no gameplay start/stop: the level messages say the same
    if (on) say(started ? 'level_resumed' : 'level_started');
    else if (started) say('level_paused');
    if (on) started = true;
    return;
  }
  const s = sdk();
  if (!s || on === playing) return;
  // the game now opens straight in a valley: loading has to be over before play starts
  if (on) loadingDone();
  playing = on;
  try {
    if (on) s.game.gameplayStart();
    else s.game.gameplayStop();
  } catch {
    /* the portal is not ready */
  }
}

let loaded = false;
export function loadingDone() {
  if (loaded) return;
  if (ya()) {
    loaded = true;
    yaCall(() => window.ARYQ_YREADY());
    return;
  }
  if (pg()) {
    loaded = true;
    say('game_ready');
    return;
  }
  const s = sdk();
  if (!s) return;
  loaded = true;
  try {
    s.game.loadingStop();
  } catch {
    /* not important */
  }
}

export function happytime() {
  try {
    if (pg()) return say('player_got_achievement');
    const s = sdk();
    if (s) s.game.happytime();
  } catch {
    /* not important */
  }
}

// fn(muted) now and whenever the portal's mute changes (on Playgama also while an ad is open)
let yaTell = null; // Yandex: the sound holds while an ad is open (set by onPortalMute, used by adBreak)
const yaState = { ad: false, paused: false };
export function onPortalMute(fn) {
  if (ya()) {
    yaTell = () => fn(yaState.ad || yaState.paused);
    yaCall((y) => y.on('game_api_pause', () => ((yaState.paused = true), yaTell())));
    yaCall((y) => y.on('game_api_resume', () => ((yaState.paused = false), yaTell())));
    yaTell();
    return;
  }
  const b = pg();
  if (b) {
    const st = { audio: true, ad: false, reward: false, paused: false };
    const tell = () => fn(!st.audio || st.ad || st.reward || st.paused);
    try {
      st.audio = b.platform.isAudioEnabled !== false;
      b.platform.on(b.EVENT_NAME.AUDIO_STATE_CHANGED, (on) => {
        st.audio = on !== false;
        tell();
      });
      b.platform.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, (paused) => {
        st.paused = !!paused;
        tell();
      });
      b.advertisement.on(b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, (state) => {
        st.ad = state === 'opened';
        tell();
      });
      b.advertisement.on(b.EVENT_NAME.REWARDED_STATE_CHANGED, (state) => {
        st.reward = state === 'opened' || state === 'rewarded';
        tell();
      });
    } catch {
      /* no events: our own sound button still works */
    }
    tell();
    return;
  }
  const s = sdk();
  if (!s) return;
  try {
    fn(!!s.game.settings.muteAudio);
    s.game.addSettingsChangeListener((st) => fn(!!st.muteAudio));
  } catch {
    /* no settings */
  }
}

// fn() when the portal asks the game to pause (Playgama: another tab, an ad). Not when the game's frame
// has simply not been clicked yet: Bridge says "paused" then too (27.10, found on Kokpar), and a new
// player saw the pause panel instead of the valley and its first canal digging itself. The sound
// stays off until that click (onPortalMute).
export function onPortalPause(fn) {
  if (ya()) return yaCall((y) => y.on('game_api_pause', () => fn()));
  const b = pg();
  if (!b) return;
  const ad = { inter: false, reward: false };
  try {
    b.advertisement.on(b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, (state) => (ad.inter = state === 'opened'));
    b.advertisement.on(b.EVENT_NAME.REWARDED_STATE_CHANGED, (state) => (ad.reward = state === 'opened' || state === 'rewarded'));
  } catch {
    /* no ad events */
  }
  try {
    b.platform.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, (paused) => paused && (document.hidden || ad.inter || ad.reward) && fn());
  } catch {
    /* no pause events */
  }
}

// A full-screen ad at a natural break (the end of a year, a dried orchard), on Playgama and Yandex only,
// at most once in two minutes and never in the first two minutes of a visit (Playgama's config file
// says the same; Yandex allows one a minute).
export const AD_GAP = 120000;
let lastAd = performance.now();
export function adBreak(placement) {
  if (ya()) {
    if (performance.now() - lastAd < AD_GAP) return false;
    lastAd = performance.now();
    const quiet = (on) => {
      yaState.ad = on;
      if (yaTell) yaTell();
    };
    yaCall((y) => y.adv.showFullscreenAdv({ callbacks: { onOpen: () => quiet(true), onClose: () => quiet(false), onError: () => quiet(false), onOffline: () => quiet(false) } }));
    return true;
  }
  const b = pg();
  if (!b || performance.now() - lastAd < AD_GAP) return false;
  try {
    if (!b.advertisement.isInterstitialSupported) return false;
    lastAd = performance.now();
    const r = b.advertisement.showInterstitial(placement);
    if (r && r.catch) r.catch(() => {});
    return true;
  } catch {
    return false;
  }
}

// An ad for a reward (Playgama, 27.10): "one more year" again after the free one is used. The reward
// is only for the 'rewarded' state; an ad that fails, never opens or is closed early gives nothing.
// While it is open the sound holds (onPortalMute), and the next full-screen ad waits two minutes more.
export function canReward() {
  const b = pg();
  try {
    return !!(b && b.advertisement.isRewardedSupported);
  } catch {
    return false;
  }
}
let onReward = null; // the state handler of the ad being shown, if any
let rewardWired = false;
export function rewarded(placement) {
  const b = pg();
  if (!canReward() || onReward) return Promise.resolve(false);
  return new Promise((done) => {
    let got = false;
    let opened = false;
    let slow = 0;
    let stuck = 0;
    const finish = (v) => {
      if (!onReward) return;
      onReward = null;
      clearTimeout(slow);
      clearTimeout(stuck);
      lastAd = performance.now();
      done(v);
    };
    onReward = (state) => {
      if (state === 'opened') opened = true;
      if (state === 'rewarded') got = true;
      if (state === 'closed') finish(got);
      if (state === 'failed') finish(false);
    };
    // an ad that does not open in 15 s is not coming; one that never closes does not hold the game
    slow = setTimeout(() => !opened && finish(false), 15000);
    stuck = setTimeout(() => finish(got), 180000);
    try {
      if (!rewardWired) {
        rewardWired = true;
        b.advertisement.on(b.EVENT_NAME.REWARDED_STATE_CHANGED, (state) => onReward && onReward(state));
      }
      const r = b.advertisement.showRewarded(placement);
      if (r && r.catch) r.catch(() => finish(false));
    } catch {
      finish(false);
    }
  });
}
