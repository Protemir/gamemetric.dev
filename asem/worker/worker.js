// Leaderboard for Әсем Жол (gamemetric.dev/asem/, formerly asemface.com): a Cloudflare Worker with one KV namespace bound as SCORES.
//
// GET  /board?b=ch0&g=all       top 20 of a board ("all" or a friends' group code)
// POST /submit {b, g, name, value, car, color}
//
// Boards: ch0..ch4 are story chapters (best time in seconds, lower wins),
// free-<map> is free ride (distance in km, higher wins). Each board keeps a top 50,
// one entry per name. Times faster than the car can physically do are refused.

const ORIGINS = ['https://gamemetric.dev', 'https://www.gamemetric.dev', 'https://asemface.com', 'https://www.asemface.com', 'http://localhost:8138'];
const TOP = 50;

const BOARDS = {
  ch0: { min: 27, max: 900, asc: true },
  ch1: { min: 23, max: 900, asc: true },
  ch2: { min: 19, max: 900, asc: true },
  ch3: { min: 21, max: 900, asc: true },
  ch4: { min: 18, max: 900, asc: true },
  ch5: { min: 21, max: 900, asc: true },
  ch6: { min: 20, max: 900, asc: true },
  'free-city': { max: 300 },
  'free-medeu': { max: 300 },
  'free-shymbulak': { max: 300 },
  'free-kapchagay': { max: 300 },
  'free-charyn': { max: 300 },
  'free-kolsai': { max: 300 },
  'free-astana': { max: 300 },
};

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
const cleanGroup = (g) => {
  const s = String(g || '').toLowerCase();
  return /^[a-z0-9]{4,12}$/.test(s) ? s : 'all';
};
const same = (a, b) => a.toLowerCase() === b.toLowerCase();

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    if (url.pathname === '/board' && req.method === 'GET') {
      const b = url.searchParams.get('b');
      if (!Object.hasOwn(BOARDS, b)) return json({ error: 'board' }, 400, h);
      const g = cleanGroup(url.searchParams.get('g'));
      const list = (await env.SCORES.get(`b:${g}:${b}`, 'json')) || [];
      return json({ board: b, group: g, entries: list.slice(0, 20) }, 200, h);
    }

    if (url.pathname === '/submit' && req.method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: 'json' }, 400, h);
      }
      if (!body || typeof body !== 'object') return json({ error: 'json' }, 400, h);
      const rule = Object.hasOwn(BOARDS, body.b) ? BOARDS[body.b] : null;
      if (!rule) return json({ error: 'board' }, 400, h);
      const name = cleanName(body.name);
      if (name.length < 2) return json({ error: 'name' }, 400, h);
      const value = Math.round(Number(body.value) * 100) / 100;
      if (!Number.isFinite(value) || value <= 0 || value > rule.max || (rule.min && value < rule.min)) return json({ error: 'value' }, 400, h);
      const car = String(body.car || '').replace(/[^a-z]/g, '').slice(0, 12);
      const color = /^#[0-9a-f]{6}$/i.test(body.color || '') ? body.color : '#888888';

      // one submission per 8 seconds from the same address
      const ip = req.headers.get('CF-Connecting-IP') || '';
      if (ip) {
        const last = Number(await env.SCORES.get(`rl:${ip}`));
        if (last && Date.now() - last < 8000) return json({ error: 'slow' }, 429, h);
        await env.SCORES.put(`rl:${ip}`, String(Date.now()), { expirationTtl: 60 });
      }

      const groups = ['all'];
      const g = cleanGroup(body.g);
      if (g !== 'all') groups.push(g);
      const results = {};
      for (const grp of groups) {
        const key = `b:${grp}:${body.b}`;
        const list = (await env.SCORES.get(key, 'json')) || [];
        const i = list.findIndex((e) => same(e.name, name));
        const better = (a, c) => (rule.asc ? a < c : a > c);
        const entry = { name, value, car, color, at: Date.now() };
        let changed = false;
        if (i < 0) {
          list.push(entry);
          changed = true;
        } else if (better(value, list[i].value)) {
          list[i] = entry;
          changed = true;
        }
        list.sort((x, y) => (rule.asc ? x.value - y.value : y.value - x.value));
        const top = list.slice(0, TOP);
        if (changed) await env.SCORES.put(key, JSON.stringify(top));
        results[grp] = { rank: top.findIndex((e) => same(e.name, name)) + 1, entries: top.slice(0, 20) };
      }
      return json({ ok: true, results }, 200, h);
    }

    return json({ name: 'asem-scores', ok: true }, 200, h);
  },
};
