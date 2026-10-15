// Builds for game portals (tools/build-portal.mjs) set window.ASEM_PORTAL before the game loads.
// On gamemetric.dev/asem/ it is unset and everything here does nothing.
//
// CrazyGames: their SDK v3 is loaded by the page; it reports when the player is actually
// racing (gameplayStart/Stop), gives the player's language and can mute the game.
export const PORTAL = window.ASEM_PORTAL || null;

let sdk = null;
let playing = false;

export async function portalInit() {
  if (PORTAL !== 'crazygames') return;
  // js/boot.js has already started the SDK
  sdk = (await window.ASEM_SDK) || null;
}

// 'ru' for players from the region, 'en' for everyone else, null if the portal does not say
export function portalLang() {
  try {
    const loc = sdk && sdk.user.systemInfo && sdk.user.systemInfo.locale;
    if (!loc) return null;
    return /^(ru|kk|ky|be|uz|tg|uk)\b/i.test(loc) ? 'ru' : 'en';
  } catch {
    return null;
  }
}

// called every frame with "is the player racing right now"; the SDK hears only the changes
export function gameplay(on) {
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
    if (sdk) sdk.game.happytime();
  } catch {
    /* not important */
  }
}

// fn(muted) now and whenever the portal's mute changes
export function onPortalMute(fn) {
  if (!sdk) return;
  try {
    fn(!!sdk.game.settings.muteAudio);
    sdk.game.addSettingsChangeListener((s) => fn(!!s.muteAudio));
  } catch {
    /* no settings */
  }
}
