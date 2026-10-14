// Our small server: shared arcade records and short room codes for playing online.
// It is a Cloudflare Worker (worker/worker.js in this repo). If it can't be reached,
// records stay on this device and online play falls back to the long link and answer code.
const PROD = 'https://jekpe-api.protemir.workers.dev';
// for local testing: ?api=http://localhost:8787 (only localhost is accepted)
const override = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('api') : null;
export const API = override && /^http:\/\/localhost:\d+$/.test(override) ? override : PROD;

export const hasServer = () => !!API;

async function call(path, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(API + path, { ...opts, signal: ctrl.signal });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || String(r.status)), { status: r.status });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

const post = (path, body) => call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export const getBoard = (diff) => call(`/board?d=${encodeURIComponent(diff)}`);
export const sendScore = (entry) => post('/submit', entry);

// rooms: the host leaves the offer under a six-letter code, the friend answers to the same code
export const makeRoom = (offer) => post('/room', { offer }).then((r) => r.code);
export const getRoom = (code) => call(`/room/${encodeURIComponent(code)}`);
export const answerRoom = (code, answer) => post(`/room/${encodeURIComponent(code)}`, { answer });

export const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
