// Builds for game portals (tools/build-portal.mjs) set window.ARYQ_PORTAL before the game loads.
// On gamemetric.dev it is unset and everything here does nothing.
// CrazyGames: js/boot.js starts their SDK v3 first; here the game tells it when the player is
// really playing (gameplayStart/Stop), when loading is over, takes the player's language and obeys
// the portal's mute.
export const PORTAL = window.ARYQ_PORTAL || null;
const sdk = () => window.ARYQ_SDK_READY || null;

let playing = false;

// 'ru' for players from the region, 'en' for everyone else, null if the portal does not say
export function portalLang() {
  try {
    const s = sdk();
    const loc = s && s.user && s.user.systemInfo && s.user.systemInfo.locale;
    if (!loc) return null;
    return /^(ru|kk|ky|be|uz|tg|uk)\b/i.test(loc) ? 'ru' : 'en';
  } catch {
    return null;
  }
}

// called every frame with "is the player in a running game right now"; the SDK hears only changes
export function gameplay(on) {
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
  const s = sdk();
  if (!s || loaded) return;
  loaded = true;
  try {
    s.game.loadingStop();
  } catch {
    /* not important */
  }
}

export function happytime() {
  try {
    const s = sdk();
    if (s) s.game.happytime();
  } catch {
    /* not important */
  }
}

// fn(muted) now and whenever the portal's mute changes
export function onPortalMute(fn) {
  const s = sdk();
  if (!s) return;
  try {
    fn(!!s.game.settings.muteAudio);
    s.game.addSettingsChangeListener((st) => fn(!!st.muteAudio));
  } catch {
    /* no settings */
  }
}
