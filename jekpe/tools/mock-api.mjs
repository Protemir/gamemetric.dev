// The worker on this computer with an in-memory KV, to try scores and rooms without Cloudflare.
//
//   node tools/mock-api.mjs            (listens on http://localhost:8787)
//
// then open the game with ?api=http://localhost:8787
import http from 'node:http';
import worker from '../worker/worker.js';

const PORT = Number(process.argv[2] || 8787);
const mem = new Map();
const env = {
  DATA: {
    async get(key, type) {
      const e = mem.get(key);
      if (!e || (e.exp && e.exp < Date.now())) return null;
      return type === 'json' ? JSON.parse(e.v) : e.v;
    },
    async put(key, v, opts = {}) {
      mem.set(key, { v, exp: opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0 });
    },
  },
};

http.createServer(async (req, res) => {
  let body;
  if (req.method === 'POST') {
    body = await new Promise((done) => {
      let d = '';
      req.on('data', (c) => (d += c));
      req.on('end', () => done(d));
    });
  }
  const headers = {};
  for (const k of ['origin', 'content-type']) if (req.headers[k]) headers[k] = req.headers[k];
  const r = await worker.fetch(new Request(`http://localhost:${PORT}${req.url}`, { method: req.method, headers, body }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(await r.text());
}).listen(PORT, () => console.log(`mock api on http://localhost:${PORT}`));
