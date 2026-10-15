// Portal builds start here instead of main.js (tools/build-portal.mjs swaps the script tag).
// The SDK has to be ready before the game reads its saved progress: on CrazyGames the progress
// lives in the SDK's Data module (tied to the player's account), util.js store reads window.OYU_DATA.
const sdk = window.CrazyGames && window.CrazyGames.SDK;
window.OYU_SDK = sdk
  ? sdk.init().then(
      () => (sdk.environment === 'disabled' ? null : sdk),
      () => null,
    )
  : Promise.resolve(null);
const ready = await window.OYU_SDK;
if (ready && ready.data) window.OYU_DATA = ready.data;
await import('./main.js');
