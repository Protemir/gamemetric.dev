// Анонимный счётчик игры: где и когда игроки уходят, как далеко доходят. Общий сервер для игр
// gamemetric.dev: stats/worker.js (gm-pulse), отчёт: node stats/report.mjs <файл ключа>.
// Без cookies и имён. На gamemetric.dev случайный id на этом устройстве отличает новичка от вернувшегося;
// на портале ничего не хранится — id живёт, пока открыта страница.
// ?nopulse — больше не считать это устройство (?pulse — снова считать).
import { PORTAL } from './world.js';

const URL_ = 'https://gm-pulse.protemir.workers.dev/e';
const SITE = 'kokpar';
const opened = performance.now();

function local(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* хранилище закрыто */ }
  return null;
}

const q = new URLSearchParams(location.search);
if (!PORTAL && q.has('nopulse')) local('pulse.off', '1');
if (!PORTAL && q.has('pulse')) local('pulse.off', null);
const off = q.has('debug') || q.has('bots') || q.has('sim') || navigator.webdriver || location.protocol === 'file:' || (!PORTAL && local('pulse.off') === '1');
const newId = () => Math.random().toString(36).slice(2, 12).padEnd(8, '0');
let id = PORTAL ? newId() : local('pulse.id');
if (!id) { id = newId(); local('pulse.id', id); }

// минуты с открытия страницы — корзинами, чтобы отчёт читался
export function minute() {
  const m = Math.floor((performance.now() - opened) / 60000);
  return m <= 10 ? 'm' + m : m < 30 ? 'm' + Math.floor(m / 5) * 5 : 'm30+';
}

// ?pulsetest (автотесты): события копятся в window.__pulses и никуда не уходят
const testing = q.has('pulsetest');
if (testing) window.__pulses = [];

export function pulse(e, a = '') {
  if (testing) return void window.__pulses.push([e, String(a).slice(0, 24)]);
  if (off) return;
  const body = { s: SITE, e, a: String(a).slice(0, 24), p: id };
  if (e === 'open') {
    try { const r = document.referrer && new URL(document.referrer).hostname; if (r && r !== location.hostname) body.r = r; } catch { /* нет referrer */ }
  }
  try {
    const text = JSON.stringify(body);
    if (!(navigator.sendBeacon && navigator.sendBeacon(URL_, text))) fetch(URL_, { method: 'POST', body: text, keepalive: true }).catch(() => {});
  } catch { /* счётчик никогда не ломает игру */ }
}
