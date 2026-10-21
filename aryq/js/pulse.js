// Anonymous play counter: where and when players go away, how far they get. Shared server for all
// games on gamemetric.dev: stats/worker.js (gm-pulse), report: node stats/report.mjs <key file>.
// No cookies, no names. On gamemetric.dev a random id kept on this device tells new players from
// returning ones; on a portal nothing is kept, the id lives only as long as the page.
// Open the game once with ?nopulse to stop counting this device (?pulse turns it back on).
import { PORTAL } from './portal.js';

const URL_ = 'https://gm-pulse.protemir.workers.dev/e';
const SITE = 'aryq';
const opened = performance.now();

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
if (!PORTAL && q.has('nopulse')) local('pulse.off', '1');
if (!PORTAL && q.has('pulse')) local('pulse.off', null);
const off = q.has('debug') || navigator.webdriver || location.protocol === 'file:' || (!PORTAL && local('pulse.off') === '1');
const newId = () => Math.random().toString(36).slice(2, 12).padEnd(8, '0');
let id = PORTAL ? newId() : local('pulse.id');
if (!id) {
  id = newId();
  local('pulse.id', id);
}

// minutes since the page opened, in buckets that stay readable in the report
export function minute() {
  const m = Math.floor((performance.now() - opened) / 60000);
  return m <= 10 ? 'm' + m : m < 30 ? 'm' + Math.floor(m / 5) * 5 : 'm30+';
}

// ?pulsetest (tools/retention.mjs): events are kept in window.__pulses instead of being sent
const testing = q.has('pulsetest');
if (testing) window.__pulses = [];

export function pulse(e, a = '') {
  if (testing) return void window.__pulses.push([e, String(a).slice(0, 24)]);
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
