// Builds for game portals (tools/build-portal.mjs) set window.SYBYS_PORTAL before the game loads.
// On gamemetric.dev it is unset and everything here does nothing.
// CrazyGames: js/boot.js starts their SDK v3 first; here the game tells it when the player is
// really playing (gameplayStart/Stop), when loading is over, takes the player's language and obeys
// the portal's mute.
// Playgama: js/boot.js starts Bridge; here the game says it is ready, reports play started, paused
// and resumed, takes the language, obeys the platform's sound and pause, and shows a full-screen ad
// at a natural break now and then.
export const PORTAL = window.SYBYS_PORTAL || null;
const sdk = () => window.SYBYS_SDK_READY || null;
const pg = () => (PORTAL === 'playgama' && window.SYBYS_BRIDGE) || null;

let playing = false;

const regional = (loc) => (/^(ru|kk|ky|be|uz|tg|uk)\b/i.test(loc) ? 'ru' : 'en');

// 'ru' for players from the region, 'en' for everyone else, null if the portal does not say
export function portalLang() {
  try {
    const b = pg();
    if (b) return b.platform.language ? regional(String(b.platform.language)) : null;
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

// called every frame with "is the player in a running game right now" and that game; the portal
// hears only changes
let lastGame = null;
export function gameplay(on, game) {
  if (pg()) {
    if (on === playing) return;
    // play can begin before the models are in: loading is over for the platform by then
    if (on) loadingDone();
    playing = on;
    // Playgama has no gameplay start/stop: the level messages say the same
    if (on) say(game !== lastGame ? 'level_started' : 'level_resumed');
    else say('level_paused');
    if (on) lastGame = game;
    return;
  }
  const s = sdk();
  if (!s || on === playing) return;
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

// fn(muted) now and whenever the portal's mute changes (on Playgama also while paused or an ad is open)
export function onPortalMute(fn) {
  const b = pg();
  if (b) {
    const st = { audio: true, ad: false, paused: false };
    const tell = () => fn(!st.audio || st.ad || st.paused);
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

// fn() when the platform asks the game to pause (Playgama: its menu, another tab)
export function onPortalPause(fn) {
  const b = pg();
  if (!b) return;
  try {
    b.platform.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, (paused) => paused && fn());
  } catch {
    /* no pause events */
  }
}

// A full-screen ad at a natural break (a scene card comes up, a new game after the last one), on
// Playgama only, at most once in two minutes and never in the first two minutes of a visit
// (playgama-bridge-config.json says the same). The world stands still behind both breaks.
export const AD_GAP = 120000;
let lastAd = performance.now();
let adOn = false;
let watching = false;
// true while a full-screen ad is open: the game holds its world
export const adShowing = () => adOn;
export function adBreak(placement) {
  const b = pg();
  if (!b || performance.now() - lastAd < AD_GAP) return false;
  try {
    if (!b.advertisement.isInterstitialSupported) return false;
    if (!watching) {
      watching = true;
      b.advertisement.on(b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, (state) => (adOn = state === 'opened'));
    }
    lastAd = performance.now();
    const r = b.advertisement.showInterstitial(placement);
    if (r && r.catch) r.catch(() => {});
    return true;
  } catch {
    return false;
  }
}
