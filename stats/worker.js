// Anonymous play counter for gamemetric.dev and asemface.com.
// The games send small events ("open", "start", "end") with a random device id;
// one Durable Object keeps daily totals in SQLite. No cookies, no names, no IPs.
//
//   POST /e                    {s, e, a, p, r}   from the games (sendBeacon)
//   GET  /report?key=&days=14  totals for stats/report.mjs
//   POST /wipe?key=&confirm=all clears everything (used once, before the launch)
import { DurableObject } from 'cloudflare:workers';

const SITES = {
  asem: ['open', 'start', 'finish', 'timeout', 'fail'],
  jekpe: ['open', 'start', 'end', 'arcade'],
  oyu: ['open', 'start', 'win', 'fail'],
  // aryq: "leave" says where and when a player went away, "more" is one more year after a loss
  aryq: ['open', 'start', 'year', 'over', 'more', 'leave', 'daily'],
};
const HOME = { asem: ['asemface.com', 'gamemetric.dev'], jekpe: ['gamemetric.dev'], oyu: ['gamemetric.dev'], aryq: ['gamemetric.dev'] };
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly/i;

// Almaty time, so a "day" matches the owner's day
const today = (ms = Date.now()) => new Date(ms + 5 * 3600e3).toISOString().slice(0, 10);
const shift = (day, d) => new Date(Date.parse(day) + d * 864e5).toISOString().slice(0, 10);
const clean = (v, n) => String(v ?? '').replace(/[^\w.\-:]/g, '').slice(0, n);

function device(ua) {
  if (/iPad|Tablet/i.test(ua)) return 'tab';
  if (/Mobi|iPhone|iPod/i.test(ua)) return 'mob';
  if (/Android/i.test(ua)) return 'tab';
  return 'pc';
}

function channel(site, origin) {
  const host = (() => {
    try {
      return new URL(origin).hostname;
    } catch {
      return '';
    }
  })();
  if (!host) return 'none';
  if (HOME[site].some((h) => host === h || host === 'www.' + h)) return 'site';
  if (/(^|\.)crazygames\.|(^|\.)1001juegos\./.test(host)) return 'cg';
  if (/^(localhost|127\.)/.test(host)) return 'local';
  return clean(host, 40);
}

export class Stats extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS ev (day TEXT, site TEXT, ch TEXT, ev TEXT, arg TEXT, dev TEXT, cc TEXT, n INTEGER,
        PRIMARY KEY (day, site, ch, ev, arg, dev, cc));
      CREATE TABLE IF NOT EXISTS pl (day TEXT, site TEXT, pid TEXT, ch TEXT, dev TEXT, PRIMARY KEY (day, site, pid));
      CREATE TABLE IF NOT EXISTS first (site TEXT, pid TEXT, day TEXT, PRIMARY KEY (site, pid));
      CREATE TABLE IF NOT EXISTS ref (day TEXT, site TEXT, host TEXT, n INTEGER, PRIMARY KEY (day, site, host));`);
  }

  add(x) {
    const day = today();
    this.sql.exec(
      `INSERT INTO ev VALUES (?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT DO UPDATE SET n = n + 1`,
      day, x.site, x.ch, x.ev, x.arg, x.dev, x.cc);
    this.sql.exec(`INSERT OR IGNORE INTO pl VALUES (?, ?, ?, ?, ?)`, day, x.site, x.pid, x.ch, x.dev);
    this.sql.exec(`INSERT OR IGNORE INTO first VALUES (?, ?, ?)`, x.site, x.pid, day);
    if (x.ref) this.sql.exec(`INSERT INTO ref VALUES (?, ?, ?, 1) ON CONFLICT DO UPDATE SET n = n + 1`, day, x.site, x.ref);
  }

  wipe() {
    this.sql.exec(`DELETE FROM ev; DELETE FROM pl; DELETE FROM first; DELETE FROM ref;`);
  }

  report(days) {
    const from = shift(today(), -(days - 1));
    const all = (q, ...a) => [...this.sql.exec(q, ...a)];
    const daily = all(`
      SELECT pl.day, pl.site, COUNT(*) players,
        SUM(pl.dev != 'pc') phone,
        SUM(first.day = pl.day) new,
        SUM(pl.ch = 'cg') cg
      FROM pl JOIN first ON first.site = pl.site AND first.pid = pl.pid
      WHERE pl.day >= ? GROUP BY pl.day, pl.site ORDER BY pl.day, pl.site`, from);
    const events = all(`SELECT day, site, ev, SUM(n) n FROM ev WHERE day >= ? GROUP BY day, site, ev`, from);
    const args = all(`SELECT site, ev, arg, SUM(n) n FROM ev WHERE day >= ? AND arg != '' GROUP BY site, ev, arg ORDER BY n DESC`, from);
    const countries = all(`SELECT site, cc, SUM(n) n FROM ev WHERE day >= ? AND ev = 'open' GROUP BY site, cc ORDER BY n DESC`, from);
    const channels = all(`SELECT site, ch, SUM(n) n FROM ev WHERE day >= ? AND ev = 'open' GROUP BY site, ch ORDER BY n DESC`, from);
    const refs = all(`SELECT site, host, SUM(n) n FROM ref WHERE day >= ? GROUP BY site, host ORDER BY n DESC LIMIT 40`, from);
    // of the players first seen on a day, how many came back 1 and 7 days later
    const back = all(`
      SELECT f.site, f.day, COUNT(*) cohort,
        SUM(EXISTS (SELECT 1 FROM pl WHERE pl.site = f.site AND pl.pid = f.pid AND pl.day = date(f.day, '+1 day'))) d1,
        SUM(EXISTS (SELECT 1 FROM pl WHERE pl.site = f.site AND pl.pid = f.pid AND pl.day = date(f.day, '+7 day'))) d7
      FROM first f WHERE f.day >= ? GROUP BY f.site, f.day ORDER BY f.day`, from);
    return { today: today(), from, daily, events, args, countries, channels, refs, back };
  }
}

const cors = { 'access-control-allow-origin': '*' };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const stats = env.STATS.get(env.STATS.idFromName('all'));

    if (req.method === 'POST' && url.pathname === '/e') {
      const ua = req.headers.get('user-agent') || '';
      const text = await req.text();
      if (BOT.test(ua) || text.length > 600) return new Response(null, { status: 204, headers: cors });
      let b;
      try {
        b = JSON.parse(text);
      } catch {
        return new Response(null, { status: 400, headers: cors });
      }
      const site = clean(b.s, 8);
      if (!SITES[site]) return new Response(null, { status: 400, headers: cors });
      const ev = clean(b.e, 12);
      const pid = clean(b.p, 16);
      if (!SITES[site] || !SITES[site].includes(ev) || pid.length < 6) return new Response(null, { status: 400, headers: cors });
      const ch = channel(site, req.headers.get('origin') || req.headers.get('referer'));
      // local testing goes through the whole path but is not counted
      if (ch === 'local') return new Response(null, { status: 204, headers: { ...cors, 'x-pulse': 'local' } });
      const ref = ev === 'open' ? clean(b.r, 40) : '';
      await stats.add({ site, ev, pid, ch, ref, arg: clean(b.a, 24), dev: device(ua), cc: clean(req.cf?.country, 2) || '??' });
      return new Response(null, { status: 204, headers: cors });
    }

    if (req.method === 'GET' && url.pathname === '/report') {
      if (!env.KEY || url.searchParams.get('key') !== env.KEY) return new Response('no', { status: 403 });
      const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 14));
      return Response.json(await stats.report(days));
    }

    // before the launch only: clears the test rows
    if (req.method === 'POST' && url.pathname === '/wipe') {
      if (!env.KEY || url.searchParams.get('key') !== env.KEY || url.searchParams.get('confirm') !== 'all') return new Response('no', { status: 403 });
      await stats.wipe();
      return new Response('wiped');
    }

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type' } });
    return new Response('gamemetric pulse', { headers: cors });
  },
};
