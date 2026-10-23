// Portal builds start here instead of main.js (tools/build-portal.mjs swaps the script tag).
// The SDK has to be ready before the game reads its saves: on CrazyGames they live in the SDK's
// Data module (tied to the player's account), on Playgama in Bridge storage; util.js store reads
// window.ARYQ_DATA (plain localStorage when there is none).
const wait = (ms) => new Promise((r) => setTimeout(() => r('slow'), ms));

// Playgama (24.10): Bridge first, then every save of the game under one key, read in one call before
// the game starts and written back in one call a few seconds after a change (and when the page goes)
async function playgama() {
  const b = window.bridge;
  if (!b) return;
  try {
    if ((await Promise.race([b.initialize().then(() => 'ok'), wait(6000)])) !== 'ok') return;
  } catch {
    return;
  }
  window.ARYQ_BRIDGE = b;
  let data = {};
  try {
    const got = await Promise.race([b.storage.get(['aryq']), wait(4000)]);
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
      Promise.resolve(b.storage.set(['aryq'], [JSON.stringify(data)])).catch(() => {});
    } catch {
      /* the next change tries again */
    }
  };
  const later = () => {
    if (!timer) timer = setTimeout(flush, 4000);
  };
  window.ARYQ_DATA = {
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
    const slow = (await Promise.race([init.then(() => false), wait(5000)])) === 'slow';
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
}

if (window.ARYQ_PORTAL === 'playgama') await playgama();
else await crazygames();
await import('./main.js');
