// Anonymous play counter: how many people open the game, start and finish a race.
// No cookies and no names; a random id kept on this device tells new players from returning ones.
// The server is stats/worker.js in the gamemetric.dev repo. Open the game once with ?nopulse
// to stop counting this device (?pulse turns it back on).
const URL_ = 'https://gm-pulse.protemir.workers.dev/e';
const SITE = 'asem';

function local(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage blocked */
  }
  return null;
}

const q = new URLSearchParams(location.search);
if (q.has('nopulse')) local('pulse.off', '1');
if (q.has('pulse')) local('pulse.off', null);
// portal builds have their own numbers and their own privacy rules
const off = !!window.ASEM_PORTAL || local('pulse.off') === '1' || navigator.webdriver || location.protocol === 'file:';

let id = off ? 'x' : local('pulse.id');
if (!id) {
  id = Math.random().toString(36).slice(2, 12).padEnd(8, '0');
  local('pulse.id', id);
}

export function pulse(e, a = '') {
  if (off) return;
  const body = { s: SITE, e, a: String(a).slice(0, 24), p: id };
  if (e === 'open') {
    try {
      const r = document.referrer && new URL(document.referrer).hostname;
      if (r && r !== location.hostname) body.r = r;
    } catch {
      /* no referrer */
    }
  }
  try {
    const text = JSON.stringify(body);
    if (!(navigator.sendBeacon && navigator.sendBeacon(URL_, text))) fetch(URL_, { method: 'POST', body: text, keepalive: true }).catch(() => {});
  } catch {
    /* counting never breaks the game */
  }
}
