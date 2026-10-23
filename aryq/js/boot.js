// Portal builds start here instead of main.js (tools/build-portal.mjs swaps the script tag).
// The SDK has to be ready before the game reads its saves: on CrazyGames they live in the SDK's
// Data module (tied to the player's account), util.js store reads window.ARYQ_DATA.
const sdk = window.CrazyGames && window.CrazyGames.SDK;
let ready = null;
let init = null;
if (sdk) {
  try {
    init = Promise.resolve(sdk.init()).then(() => (sdk.environment !== 'disabled' ? sdk : null), () => null);
  } catch {
    init = null;
  }
}
if (init) {
  // an SDK that never answers must not keep the game from showing (19.10: a black screen)
  const slow = await Promise.race([init.then(() => false), new Promise((r) => setTimeout(() => r(true), 5000))]);
  if (!slow) ready = await init;
  else {
    // ... but one that answers late still has to hear that the game started (23.10: on a slow phone
    // network such a visit never sent gameplayStart and counted as one that did not play). The saves
    // of this visit stay in the browser: the Data module is not switched to in the middle of a game.
    init.then((s) => {
      if (!s) return;
      try {
        s.game.loadingStart();
      } catch {
        /* not important */
      }
      window.ARYQ_SDK_READY = s; // portal.js asks for it every frame
    });
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
