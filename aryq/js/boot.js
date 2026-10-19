// Portal builds start here instead of main.js (tools/build-portal.mjs swaps the script tag).
// The SDK has to be ready before the game reads its saves: on CrazyGames they live in the SDK's
// Data module (tied to the player's account), util.js store reads window.ARYQ_DATA.
const sdk = window.CrazyGames && window.CrazyGames.SDK;
let ready = null;
if (sdk) {
  try {
    // an SDK that never answers must not keep the game from showing (19.10: a black screen)
    await Promise.race([sdk.init(), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 5000))]);
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
  if (ready.data) window.ARYQ_DATA = ready.data;
}
window.ARYQ_SDK_READY = ready;
await import('./main.js');
