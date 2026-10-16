// Builds for game portals (tools/build-portal.mjs) set window.ASYK_PORTAL before the game loads.
// On gamemetric.dev it is unset and everything here does nothing.
// CrazyGames: js/boot.js starts their SDK v3 first; here the game reports when the player is
// actually solving (gameplayStart/Stop), takes the player's language and obeys the portal's mute.
export const PORTAL = window.ASYK_PORTAL || null;

let sdk = null;
let playing = false;

export async function portalInit() {
  if (PORTAL !== 'crazygames') return;
  sdk = (await window.ASYK_SDK) || null;
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

// called every frame with "is the player solving right now"; the SDK hears only the changes
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

// the portal shows its own loader while the yard photos and the kids come in
export function loading(on) {
  try {
    if (sdk) on ? sdk.game.loadingStart() : sdk.game.loadingStop();
  } catch {
    /* not important */
  }
}
