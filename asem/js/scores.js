import { store } from './util.js';

// The leaderboard lives in a Cloudflare Worker (worker/worker.js in this repo).
// If it can't be reached, the game keeps everything on this device.
const PROD = 'https://asem-scores.protemir.workers.dev';
// for local testing: ?api=http://localhost:8787 (only localhost is accepted)
const override = new URLSearchParams(location.search).get('api');
export const API = override && /^http:\/\/localhost:\d+$/.test(override) ? override : PROD;

export const online = () => !!API;

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

export const boardId = (kind, x) => (kind === 'story' ? 'ch' + x : 'free-' + x);

export function getBoard(board, group) {
  return call(`/board?b=${encodeURIComponent(board)}&g=${encodeURIComponent(group || 'all')}`);
}

// results that could not be sent wait here and go out with the next try
const PENDING = 'asem.pending';
export async function submit(entry) {
  try {
    const res = await call('/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) });
    // the server takes one result per few seconds, so the queue waits a bit
    setTimeout(flushPending, 9000);
    return res;
  } catch (err) {
    if (!err.status || err.status === 429 || err.status >= 500) {
      const list = store.get(PENDING, []).filter((e) => e.b !== entry.b);
      list.push(entry);
      store.set(PENDING, list.slice(-10));
    }
    throw err;
  }
}

let flushing = false;
export async function flushPending() {
  if (!online() || flushing) return;
  const list = store.get(PENDING, []);
  if (!list.length) return;
  flushing = true;
  store.set(PENDING, []);
  for (const entry of list) {
    try {
      await call('/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) });
      await new Promise((r) => setTimeout(r, 8500));
    } catch (err) {
      if (!err.status || err.status === 429 || err.status >= 500) store.set(PENDING, [...store.get(PENDING, []), entry]);
    }
  }
  flushing = false;
}

export function newGroupCode() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let k = 0; k < 6; k++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}
