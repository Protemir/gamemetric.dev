// Portal builds start here instead of main.js (tools/build-portal.mjs swaps the script tag).
// The portal SDK has to be ready before the game reads its saved progress, because on
// CrazyGames the progress lives in the SDK's Data module (tied to the player's account) and on
// Playgama in Bridge storage, instead of plain localStorage. util.js store reads window.ASEM_DATA.
const wait = (ms) => new Promise((r) => setTimeout(() => r('slow'), ms));

// Playgama: Bridge first, then all the saves of the game under one key, read in one call before the
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
    const got = await Promise.race([b.storage.get(['asem']), wait(4000)]);
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
      Promise.resolve(b.storage.set(['asem'], [JSON.stringify(data)])).catch(() => {});
    } catch {
      /* the next change tries again */
    }
  };
  const later = () => {
    if (!timer) timer = setTimeout(flush, 3000);
  };
  window.ASEM_DATA = {
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
  if (ready && ready.data) window.ASEM_DATA = ready.data;
  // js/portal.js reports loadingStop once the first screen is drawn
  try {
    if (ready) ready.game.loadingStart();
  } catch {
    /* the portal is not ready */
  }
  return ready;
}

window.ASEM_SDK = window.ASEM_PORTAL === 'playgama' ? playgama() : crazygames();
await window.ASEM_SDK;
await import('./main.js');
