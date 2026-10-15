// Portal builds start here instead of main.js (tools/build-portal.mjs swaps the script tag).
// The portal SDK has to be ready before the game reads its saved progress, because on
// CrazyGames the progress lives in the SDK's Data module (tied to the player's account)
// instead of plain localStorage. util.js store reads window.ASEM_DATA.
const sdk = window.CrazyGames && window.CrazyGames.SDK;
window.ASEM_SDK = sdk
  ? sdk.init().then(
      () => (sdk.environment === 'disabled' ? null : sdk),
      () => null,
    )
  : Promise.resolve(null);
const ready = await window.ASEM_SDK;
if (ready && ready.data) window.ASEM_DATA = ready.data;
await import('./main.js');
