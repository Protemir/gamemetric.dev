// Portal builds (tools/build-portal.mjs) set window.BREACH_PORTAL and start the portal's SDK before the game
// loads (window.BREACH_SDK). On gamemetric.dev both are unset and everything here does nothing.
// Playgama: game_ready once the menu is up, gameplay started/stopped, the platform's sound and pause,
// a full-screen ad between matches (the Bridge keeps its own minimum gap).
export const PORTAL = window.BREACH_PORTAL || null;
const bridge = PORTAL === 'playgama' ? window.BREACH_SDK || null : null;

const say = (msg) => {
  try {
    const r = bridge.platform.sendMessage(msg);
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* not important */
  }
};

let readySent = false;
export function portalReady() {
  if (!bridge || readySent) return;
  readySent = true;
  say('game_ready');
}

// called every frame with "is a match being played right now"; the portal hears only changes
let playing = false, started = false;
export function portalGameplay(on) {
  if (!bridge || on === playing) return;
  playing = on;
  if (on) say(started ? 'level_resumed' : 'level_started');
  else say('level_paused');
  if (on) started = true;
}

// between matches: a full-screen ad if the platform has one ready (it decides the timing)
export function portalInterstitial() {
  if (!bridge) return;
  try {
    const r = bridge.advertisement.showInterstitial('match_end');
    if (r && r.catch) r.catch(() => {});
  } catch {
    /* no ad */
  }
}

// fn(muted) whenever the platform's sound, its pause, an ad or a hidden tab should silence the game
export function onPortalMute(fn) {
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
