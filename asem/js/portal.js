// Builds for game portals (tools/build-portal.mjs) set window.ASEM_PORTAL before the game loads.
// On gamemetric.dev/asem/ it is unset and everything here does nothing.
//
// CrazyGames: their SDK v3 is loaded by the page; it reports when the player is actually
// racing (gameplayStart/Stop), gives the player's language and can mute the game.
// Playgama: js/boot.js starts Bridge; here the game says it is ready once the first screen is up,
// reports races started, paused and resumed, takes the language, obeys the platform's sound and
// pause, and shows a full-screen ad on the results screen now and then.
export const PORTAL = window.ASEM_PORTAL || null;

let sdk = null;
let bridge = null;
let playing = false;

export async function portalInit() {
  // js/boot.js has already started the SDK
  if (PORTAL === 'crazygames') sdk = (await window.ASEM_SDK) || null;
  if (PORTAL === 'playgama') bridge = (await window.ASEM_SDK) || null;
}

const say = (msg) => {
  try {
    const r = bridge.platform.sendMessage(msg);
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* not important */
  }
};

// the first screen is up: the portal measures the load time up to here, not up to the first race
export function portalLoaded() {
  if (bridge) return say('game_ready');
  try {
    if (sdk) sdk.game.loadingStop();
  } catch {
    /* the portal is not ready */
  }
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

// called every frame with "is the player racing right now" and which race; the SDK hears only the
// changes
let lastRace = null;
export function gameplay(on, race) {
  if (bridge) {
    if (on === playing) return;
    playing = on;
    // Playgama has no gameplay start/stop: the level messages say the same
    if (on) say(race !== lastRace ? 'level_started' : 'level_resumed');
    else say('level_paused');
    if (on) lastRace = race;
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
  if (!sdk) return;
  try {
    fn(!!sdk.game.settings.muteAudio);
    sdk.game.addSettingsChangeListener((s) => fn(!!s.muteAudio));
  } catch {
    /* no settings */
  }
}

// fn() when the platform pauses the game (Playgama: its menu, another tab)
export function onPortalPause(fn) {
  const b = bridge;
  if (!b) return;
  try {
    b.platform.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, (paused) => paused && fn());
  } catch {
    /* no pause events */
  }
}

// A full-screen ad on the results screen after a race, on Playgama only, at most once in two
// minutes and never in the first two minutes of a visit (playgama-bridge-config.json says the same)
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
