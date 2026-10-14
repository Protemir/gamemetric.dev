// The server side of Жекпе-жек: a Cloudflare Worker with one KV namespace bound as DATA.
//
// GET  /board?d=normal              top 20 arcade scores for a difficulty
// POST /submit {d, name, score, f}  an arcade score (each board keeps a top 50, one entry per name)
// POST /room {offer}                keeps a WebRTC offer for 10 minutes under a short code
// GET  /room/CODE                   the offer, and the answer once the friend has sent it
// POST /room/CODE {answer}          the friend's answer
//
// Rooms only pass the two connection codes around, the fight itself goes browser to browser.
// KV is eventually consistent, so now and then the other side sees a code a few seconds late.
// The free plan allows 1000 KV writes a day: a room costs two, a score one or two.

const ORIGINS = ['https://gamemetric.dev', 'https://www.gamemetric.dev', 'http://localhost:8765'];
const TOP = 50;
const DIFFS = ['easy', 'normal', 'hard'];
const FIGHTERS = ['batyr', 'apa', 'burkit', 'dombra', 'taxi', 'baluan', 'akyn', 'dau'];
// seven fights, each worth at most about 14 000 points on hard
const MAX_SCORE = 150000;
const ROOM_TTL = 600;
const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function cors(req) {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    Vary: 'Origin',
  };
}

const json = (data, status, headers) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

const cleanName = (n) => String(n || '').replace(/[\u0000-\u001f\u007f<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const same = (a, b) => a.toLowerCase() === b.toLowerCase();
// connection codes are base64url, a few hundred characters
const cleanSdp = (s) => (typeof s === 'string' && /^[A-Za-z0-9_-]{20,4000}$/.test(s) ? s : null);

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ABC[b % CODE_ABC.length]).join('');
}

async function readJson(req) {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

// one write per few seconds from the same address
async function tooFast(env, req, kind, ms) {
  const ip = req.headers.get('CF-Connecting-IP') || '';
  if (!ip) return false;
  const key = `rl:${kind}:${ip}`;
  const last = Number(await env.DATA.get(key));
  if (last && Date.now() - last < ms) return true;
  await env.DATA.put(key, String(Date.now()), { expirationTtl: 60 });
  return false;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    if (url.pathname === '/board' && req.method === 'GET') {
      const d = url.searchParams.get('d');
      if (!DIFFS.includes(d)) return json({ error: 'diff' }, 400, h);
      const list = (await env.DATA.get(`b:${d}`, 'json')) || [];
      return json({ diff: d, entries: list.slice(0, 20) }, 200, h);
    }

    if (url.pathname === '/submit' && req.method === 'POST') {
      const body = await readJson(req);
      if (!body) return json({ error: 'json' }, 400, h);
      if (!DIFFS.includes(body.d)) return json({ error: 'diff' }, 400, h);
      const name = cleanName(body.name);
      if (name.length < 2) return json({ error: 'name' }, 400, h);
      const score = Math.round(Number(body.score));
      if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE) return json({ error: 'score' }, 400, h);
      const f = FIGHTERS.includes(body.f) ? body.f : 'batyr';
      if (await tooFast(env, req, 'score', 8000)) return json({ error: 'slow' }, 429, h);

      const key = `b:${body.d}`;
      const list = (await env.DATA.get(key, 'json')) || [];
      const i = list.findIndex((e) => same(e.name, name));
      const entry = { name, score, f, at: Date.now() };
      let changed = false;
      if (i < 0) {
        list.push(entry);
        changed = true;
      } else if (score > list[i].score) {
        list[i] = entry;
        changed = true;
      }
      list.sort((a, b) => b.score - a.score);
      const top = list.slice(0, TOP);
      if (changed) await env.DATA.put(key, JSON.stringify(top));
      return json({ ok: true, rank: top.findIndex((e) => same(e.name, name)) + 1, entries: top.slice(0, 20) }, 200, h);
    }

    if (url.pathname === '/room' && req.method === 'POST') {
      const body = await readJson(req);
      const offer = body && cleanSdp(body.offer);
      if (!offer) return json({ error: 'offer' }, 400, h);
      if (await tooFast(env, req, 'room', 3000)) return json({ error: 'slow' }, 429, h);
      let code = newCode();
      for (let k = 0; k < 3 && (await env.DATA.get(`r:${code}`)); k++) code = newCode();
      await env.DATA.put(`r:${code}`, JSON.stringify({ offer, answer: null, at: Date.now() }), { expirationTtl: ROOM_TTL });
      return json({ code }, 200, h);
    }

    const room = url.pathname.match(/^\/room\/([A-Za-z0-9]{6})$/);
    if (room) {
      const code = room[1].toUpperCase();
      const key = `r:${code}`;
      const data = await env.DATA.get(key, 'json');
      if (!data) return json({ error: 'room' }, 404, h);
      if (req.method === 'GET') return json({ code, offer: data.offer, answer: data.answer }, 200, h);
      if (req.method === 'POST') {
        const body = await readJson(req);
        const answer = body && cleanSdp(body.answer);
        if (!answer) return json({ error: 'answer' }, 400, h);
        if (data.answer) return json({ error: 'taken' }, 409, h);
        const left = Math.max(60, ROOM_TTL - Math.floor((Date.now() - data.at) / 1000));
        await env.DATA.put(key, JSON.stringify({ ...data, answer }), { expirationTtl: left });
        return json({ ok: true }, 200, h);
      }
    }

    return json({ name: 'jekpe-api', ok: true }, 200, h);
  },
};
