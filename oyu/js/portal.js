// Builds for game portals (tools/build-portal.mjs) set window.OYU_PORTAL before the game loads.
// On gamemetric.dev it is unset and everything here does nothing.
// CrazyGames: js/boot.js starts their SDK v3 first; here the game reports when the player is
// actually solving (gameplayStart/Stop), takes the player's language and obeys the portal's mute.
// Playgama: js/boot.js starts Bridge; here the game says it is ready once a level or the menu is
// on screen, reports levels started/paused/resumed, takes the language, obeys the platform's sound
// and pause, and shows a full-screen ad between levels now and then.
export const PORTAL = window.OYU_PORTAL || null;

let sdk = null;
let bridge = null;
let playing = false;

export async function portalInit() {
  if (PORTAL === 'crazygames') sdk = (await window.OYU_SDK) || null;
  if (PORTAL === 'playgama') bridge = (await window.OYU_SDK) || null;
}

const regional = (loc) => (/^(ru|kk|ky|be|uz|tg|uk)\b/i.test(loc) ? 'ru' : 'en');

// 'ru' for players from the region, 'en' for everyone else, null if the portal does not say
export function portalLang() {
  try {
    if (bridge) return bridge.platform.language ? regional(String(bridge.platform.language)) : null;
    const loc = sdk && sdk.user.systemInfo && sdk.user.systemInfo.locale;
    if (!loc) return null;
    return regional(loc);
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

// once, when the first screen that can be played is up
let loaded = false;
export function loadingDone() {
  if (loaded || !bridge) return;
  loaded = true;
  say('game_ready');
}

// called every frame with "is the player solving right now"; the SDK hears only the changes
let started = false;
export function gameplay(on, fresh) {
  if (bridge) {
    if (on === playing) return;
    playing = on;
    // Playgama has no gameplay start/stop: the level messages say the same
    if (on) say(fresh || !started ? 'level_started' : 'level_resumed');
    else say('level_paused');
    if (on) started = true;
    return;
  }
  if (!sdk || on === playing) return;
  playing = on;
  try {
    if (on) sdk.game.gameplayStart();
    else sdk.game.gameplayStop();
  } catch {
    /* the portal is not ready */
  }
}

export function happytime() {
  try {
    if (bridge) return say('player_got_achievement');
    if (sdk) sdk.game.happytime();
  } catch {
    /* not important */
  }
}

// fn(muted) now and whenever the portal's mute changes (on Playgama also while paused or an ad is open)
export function onPortalMute(fn) {
  if (bridge) {
    const b = bridge;
    // a hidden tab is quiet even if the platform does not say so
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
      /* no events: our own sound button still works */
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

// fn(paused) when the platform pauses or resumes the game (its menu, an ad)
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

// A full-screen ad between levels, on Playgama only, at most once in two minutes and never in the
// first two minutes of a visit (playgama-bridge-config.json says the same)
export const AD_GAP = 120000;
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
