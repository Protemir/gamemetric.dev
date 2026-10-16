// Portal builds start here instead of main.js (tools/build-portal.mjs swaps the script tag).
// The SDK has to be ready before the game reads its saved progress: on CrazyGames the progress
// lives in the SDK's Data module (tied to the player's account), util.js store reads window.ASYK_DATA.
const sdk = window.CrazyGames && window.CrazyGames.SDK;
window.ASYK_SDK = sdk
  ? sdk.init().then(
      () => (sdk.environment === 'disabled' ? null : sdk),
      () => null,
    )
  : Promise.resolve(null);
const ready = await window.ASYK_SDK;
if (ready && ready.data) window.ASYK_DATA = ready.data;
await import('./main.js');
