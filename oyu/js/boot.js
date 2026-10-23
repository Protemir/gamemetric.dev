// Portal builds start here instead of main.js (tools/build-portal.mjs swaps the script tag).
// The SDK has to be ready before the game reads its saved progress: on CrazyGames the progress
// lives in the SDK's Data module (tied to the player's account), on Playgama in Bridge storage;
// util.js store reads window.OYU_DATA.
const wait = (ms) => new Promise((r) => setTimeout(() => r('slow'), ms));

// Playgama: Bridge first, then all of the game's saves under one key, read in one call before the
// game starts and written back in one call a few seconds after a change (and when the page goes)
async function playgama() {
  const b = window.bridge;
  if (!b) return null;
  try {
    if ((await Promise.race([b.initialize().then(() => 'ok'), wait(6000)])) !== 'ok') return null;
  } catch {
    return null;
  }
  let data = {};
  try {
    const got = await Promise.race([b.storage.get(['oyu']), wait(4000)]);
    const raw = Array.isArray(got) ? got[0] : null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') data = parsed;
  } catch {
    /* a new player */
  }
  let timer = null;
  const flush = () => {
    clearTimeout(timer);
    timer = null;
    try {
      Promise.resolve(b.storage.set(['oyu'], [JSON.stringify(data)])).catch(() => {});
    } catch {
      /* the next change tries again */
    }
  };
  const later = () => {
    if (!timer) timer = setTimeout(flush, 3000);
  };
  window.OYU_DATA = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
    setItem: (k, v) => {
      const s = String(v);
      if (data[k] === s) return;
      data[k] = s;
      later();
    },
    removeItem: (k) => {
      if (!(k in data)) return;
      delete data[k];
      later();
    },
  };
  document.addEventListener('visibilitychange', () => document.hidden && timer && flush());
  window.addEventListener('pagehide', () => timer && flush());
  return b;
}

async function crazygames() {
  const sdk = window.CrazyGames && window.CrazyGames.SDK;
  if (!sdk) return null;
  const ready = await sdk.init().then(
    () => (sdk.environment === 'disabled' ? null : sdk),
    () => null,
  );
  if (ready && ready.data) window.OYU_DATA = ready.data;
  return ready;
}

window.OYU_SDK = window.OYU_PORTAL === 'playgama' ? playgama() : crazygames();
await window.OYU_SDK;
await import('./main.js');
