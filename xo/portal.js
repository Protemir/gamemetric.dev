// Builds for game portals (tools/build-portal.mjs) set window.XO_PORTAL and start the portal's SDK
// in boot.js before the game loads. On gamemetric.dev XO_PORTAL is unset and everything here does nothing.
// CrazyGames: gameplayStart/Stop while a round is being played, happytime on a win, the portal's mute.
// Playgama: game_ready, level messages, the platform's sound and pause, a full-screen ad between
// rounds now and then.
export const PORTAL = window.XO_PORTAL || null;
const ready = window.XO_SDK || null;
const sdk = PORTAL === 'crazygames' ? ready : null;
const bridge = PORTAL === 'playgama' ? ready : null;

const regional = (loc) => (/^(ru|kk|ky|be|uz|tg|uk)\b/i.test(loc) ? 'ru' : 'en');

// 'ru' for players from the region, 'en' for everyone else, null if the portal does not say
export function portalLang() {
  try {
    if (bridge) return bridge.platform.language ? regional(String(bridge.platform.language)) : null;
    const loc = sdk && sdk.user && sdk.user.systemInfo && sdk.user.systemInfo.locale;
    return loc ? regional(loc) : null;
  } catch {
    return null;
  }
}

const say = (msg) => {
  try {
    const r = bridge.platform.sendMessage(msg);
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* not important */
  }
};

let loaded = false;
export function loadingDone() {
  if (loaded || !bridge) return;
  loaded = true;
  say('game_ready');
}

// called after every change with "is a round being played right now"; the portal hears only changes
let playing = false;
let started = false;
export function gameplay(on, fresh) {
  if (on === playing || !(sdk || bridge)) return;
  playing = on;
  if (bridge) {
    if (on) say(fresh || !started ? 'level_started' : 'level_resumed');
    else say('level_paused');
    if (on) started = true;
    return;
  }
  try {
    if (on) sdk.game.gameplayStart();
    else sdk.game.gameplayStop();
  } catch {
    /* the portal is not ready */
  }
}

export function happytime() {
  try {
    if (bridge) say('player_got_achievement');
    else if (sdk) sdk.game.happytime();
  } catch {
    /* not important */
  }
}

// fn(muted) now and whenever the portal's sound changes (on Playgama also while paused, an ad is open or the tab is hidden)
export function onPortalMute(fn) {
  if (bridge) {
    const b = bridge;
    const st = { audio: true, ad: false, paused: false, hidden: document.hidden };
    const tell = () => fn(!st.audio || st.ad || st.paused || st.hidden);
    document.addEventListener('visibilitychange', () => {
      st.hidden = document.hidden;
      tell();
    });
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
      /* no events: the game's own sound button still works */
    }
    tell();
    return;
  }
  if (!sdk) return;
  try {
    fn(!!sdk.game.settings.muteAudio);
    sdk.game.addSettingsChangeListener((s) => fn(!!s.muteAudio));
  } catch {
    /* no settings */
  }
}

// fn(paused) when Playgama pauses or resumes the game (its menu, an ad)
export function onPortalPause(fn) {
  if (!bridge) return;
  const b = bridge;
  const st = { paused: false, ad: false };
  const tell = () => fn(st.paused || st.ad);
  try {
    b.platform.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, (paused) => {
      st.paused = !!paused;
      tell();
    });
    b.advertisement.on(b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, (state) => {
      st.ad = state === 'opened';
      tell();
    });
  } catch {
    /* no pause events */
  }
}

// A full-screen ad before the next round, on Playgama only: never in the first 2.5 minutes of a
// visit and at most once in 2.5 minutes (playgama-bridge-config.json says the same)
export const AD_GAP = 150000;
let lastAd = performance.now();
export function adBreak(placement) {
  if (!bridge || performance.now() - lastAd < AD_GAP) return false;
  try {
    if (!bridge.advertisement.isInterstitialSupported) return false;
    lastAd = performance.now();
    const r = bridge.advertisement.showInterstitial(placement);
    if (r && r.catch) r.catch(() => {});
    return true;
  } catch {
    return false;
  }
}
