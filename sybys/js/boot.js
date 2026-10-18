// Portal builds start here instead of main.js (tools/build-portal.mjs swaps the script tag).
// The SDK has to be ready before the game reads its saves: on CrazyGames they live in the SDK's
// Data module (tied to the player's account), util.js store reads window.SYBYS_DATA.
const sdk = window.CrazyGames && window.CrazyGames.SDK;
let ready = null;
if (sdk) {
  try {
    await sdk.init();
    if (sdk.environment !== 'disabled') ready = sdk;
  } catch {
    ready = null;
  }
}
if (ready) {
  try {
    ready.game.loadingStart();
  } catch {
    /* not important */
  }
  if (ready.data) window.SYBYS_DATA = ready.data;
}
window.SYBYS_SDK_READY = ready;
await import('./main.js');
