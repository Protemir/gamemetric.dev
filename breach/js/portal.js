// Portal builds (tools/build-portal.mjs) set window.BREACH_PORTAL and start the portal's SDK before the game
// loads (window.BREACH_SDK). On gamemetric.dev both are unset and everything here does nothing.
// Playgama (Bridge): game_ready once the menu is up, gameplay started/stopped, the platform's sound and pause,
// a full-screen ad between matches (the Bridge keeps its own minimum gap).
// CrazyGames (SDK v3): loadingStop once the menu is up, gameplayStart/Stop, a midgame ad between matches,
// happytime on a won match, the portal's mute setting.
export const PORTAL = window.BREACH_PORTAL || null;
const sdk = window.BREACH_SDK || null;
const bridge = PORTAL === 'playgama' ? sdk : null;
const cg = PORTAL === 'crazygames' ? sdk : null;

const say = (msg) => {
  try {
    const r = bridge.platform.sendMessage(msg);
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* not important */
  }
};
const safe = (fn) => {
  try {
    const r = fn();
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* not important */
  }
};

let readySent = false;
export function portalReady() {
  if (readySent || !(bridge || cg)) return;
  readySent = true;
  if (bridge) say('game_ready');
  else safe(() => cg.game.loadingStop());
}

// called every frame with "is a match being played right now"; the portal hears only changes
let playing = false, started = false;
export function portalGameplay(on) {
  if (!(bridge || cg) || on === playing) return;
  playing = on;
  if (cg) {
    safe(() => (on ? cg.game.gameplayStart() : cg.game.gameplayStop()));
    return;
  }
  if (on) say(started ? 'level_resumed' : 'level_started');
  else say('level_paused');
  if (on) started = true;
}

// a match won: CrazyGames' little celebration
export function portalHappy() {
  if (cg) safe(() => cg.game.happytime());
}

// between matches: a full-screen ad if the platform has one (it decides the timing); mute(true/false) around it
let muteForAd = () => {};
export function portalInterstitial() {
  if (bridge) {
    safe(() => bridge.advertisement.showInterstitial('match_end'));
    return;
  }
  if (cg) {
    safe(() =>
      cg.ad.requestAd('midgame', {
        adStarted: () => muteForAd(true),
        adFinished: () => muteForAd(false),
        adError: () => muteForAd(false),
      }),
    );
  }
}

// fn(muted) whenever the platform's sound, its pause, an ad or a hidden tab should silence the game
export function onPortalMute(fn) {
  if (cg) {
    const st = { setting: false, ad: false };
    const tell = () => fn(st.setting || st.ad);
    muteForAd = (on) => {
      st.ad = on;
      tell();
    };
    try {
      st.setting = !!cg.game.settings.muteAudio;
      cg.game.addSettingsChangeListener((s) => {
        st.setting = !!s.muteAudio;
        tell();
      });
    } catch {
      /* no settings */
    }
    tell();
    return;
  }
  if (!bridge) return;
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
    b.platform.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, (p) => {
      st.paused = !!p;
      tell();
    });
    b.advertisement.on(b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, (s) => {
      st.ad = s === 'opened';
      tell();
    });
  } catch {
    /* no events: the volume setting still works */
  }
  tell();
}

// fn() when the platform pauses the game (its own menu)
export function onPortalPause(fn) {
  if (!bridge) return;
  try {
    bridge.platform.on(bridge.EVENT_NAME.PAUSE_STATE_CHANGED, (p) => p && fn());
  } catch {
    /* none */
  }
}
