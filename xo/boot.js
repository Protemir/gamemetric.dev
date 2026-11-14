// Portal builds start here instead of app.js (tools/build-portal.mjs swaps the script tag).
// The SDK has to be ready before the game reads its saves: on CrazyGames they live in the SDK's
// Data module, on Playgama in Bridge storage. app.js reads them through window.XO_DATA.
const wait = (ms) => new Promise((r) => setTimeout(() => r('slow'), ms));

// Playgama: Bridge first, then all saves under one key, read once before the game starts and
// written back a few seconds after a change (and when the page goes away)
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
    const got = await Promise.race([b.storage.get(['xo']), wait(4000)]);
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
      Promise.resolve(b.storage.set(['xo'], [JSON.stringify(data)])).catch(() => {});
    } catch {
      /* the next change tries again */
    }
  };
  const later = () => {
    if (!timer) timer = setTimeout(flush, 3000);
  };
  window.XO_DATA = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
    setItem: (k, v) => {
      const s = String(v);
      if (data[k] === s) return;
      data[k] = s;
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
  const ready = await Promise.race([
    sdk.init().then(
      () => (sdk.environment === 'disabled' ? null : sdk),
      () => null,
    ),
    wait(8000).then(() => null),
  ]);
  if (ready && ready.data) window.XO_DATA = ready.data;
  return ready;
}

window.XO_SDK = await (window.XO_PORTAL === 'playgama' ? playgama() : crazygames());
await import('./app.js');
