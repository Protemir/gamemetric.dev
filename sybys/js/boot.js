// Portal builds start here instead of main.js (tools/build-portal.mjs swaps the script tag).
// The SDK has to be ready before the game reads its saves: on CrazyGames they live in the SDK's
// Data module (tied to the player's account), on Playgama in Bridge storage; util.js store and
// text.js read window.SYBYS_DATA.
const wait = (ms) => new Promise((r) => setTimeout(() => r('slow'), ms));

// Playgama: Bridge first, then all the saves of the game under one key, read in one call before the
// game starts and written back in one call a few seconds after a change (and when the page goes)
async function playgama() {
  const b = window.bridge;
  if (!b) return;
  try {
    if ((await Promise.race([b.initialize().then(() => 'ok'), wait(6000)])) !== 'ok') return;
  } catch {
    return;
  }
  window.SYBYS_BRIDGE = b;
  let data = {};
  try {
    const got = await Promise.race([b.storage.get(['sybys']), wait(4000)]);
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
      Promise.resolve(b.storage.set(['sybys'], [JSON.stringify(data)])).catch(() => {});
    } catch {
      /* the next change tries again */
    }
  };
  const later = () => {
    if (!timer) timer = setTimeout(flush, 3000);
  };
  window.SYBYS_DATA = {
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
}

async function crazygames() {
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
}

if (window.SYBYS_PORTAL === 'playgama') await playgama();
else await crazygames();
await import('./main.js');
