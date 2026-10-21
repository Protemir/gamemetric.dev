// Prints the play counter for the last N days.
//
//   node stats/report.mjs <report key file> [days=14]
import fs from 'node:fs';

const [keyFile, days = 14] = process.argv.slice(2);
if (!keyFile) {
  console.error('usage: node stats/report.mjs <report key file> [days]');
  process.exit(1);
}
const key = fs.readFileSync(keyFile, 'utf8').trim();
const base = process.env.PULSE || 'https://gm-pulse.protemir.workers.dev';
const r = await (await fetch(`${base}/report?days=${days}&key=${encodeURIComponent(key)}`)).json();

const NAMES = { asem: 'Әсем Жол (asemface.com)', jekpe: 'Жекпе-жек (gamemetric.dev)', oyu: 'Ою (gamemetric.dev/oyu)', aryq: 'Арык (gamemetric.dev/aryq, CG)' };
const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '—');
const pad = (s, n) => String(s).padEnd(n);

console.log(`Период ${r.from} … ${r.today} (время Алматы)\n`);
for (const site of ['asem', 'jekpe', 'oyu', 'aryq']) {
  console.log('== ' + NAMES[site]);
  const ev = (day, e) => r.events.filter((x) => x.site === site && x.day === day && x.ev === e).reduce((s, x) => s + x.n, 0);
  // "played to the end": the race reached the finish or ran out of time; the fight was over
  const ends = site === 'asem' ? ['finish', 'timeout', 'fail'] : site === 'oyu' ? ['win'] : site === 'aryq' ? ['over'] : ['end'];
  console.log(pad('день', 12) + pad('игроков', 9) + pad('новых', 7) + pad('с тел.', 8) + pad('CG', 5) + pad('заходов', 9) + pad('стартов', 9) + pad('доиграли', 9));
  let tot = { players: 0, phone: 0, start: 0, end: 0 };
  for (const d of r.daily.filter((x) => x.site === site)) {
    const s = ev(d.day, 'start');
    const e = ends.reduce((n, x) => n + ev(d.day, x), 0);
    tot.players += d.players;
    tot.phone += d.phone;
    tot.start += s;
    tot.end += e;
    console.log(pad(d.day, 12) + pad(d.players, 9) + pad(d.new, 7) + pad(d.phone, 8) + pad(d.cg, 5) + pad(ev(d.day, 'open'), 9) + pad(s, 9) + pad(`${e} (${pct(e, s)})`, 9));
  }
  console.log(`итого игроко-дней ${tot.players}, с телефонов ${pct(tot.phone, tot.players)}, доиграли ${pct(tot.end, tot.start)} стартов`);
  const top = (rows, f, n = 8) => rows.filter((x) => x.site === site).slice(0, n).map(f).join(', ') || '—';
  console.log('страны:  ' + top(r.countries, (x) => `${x.cc} ${x.n}`));
  console.log('каналы:  ' + top(r.channels, (x) => `${x.ch} ${x.n}`));
  console.log('откуда:  ' + top(r.refs, (x) => `${x.host} ${x.n}`));
  console.log('старты:  ' + top(r.args.filter((x) => x.ev === 'start'), (x) => `${x.arg} ${x.n}`));
  if (site === 'aryq') {
    // where players go away: "<screen>:m<minute>" (on CG every visit is its own session)
    for (const e of ['leave', 'over', 'year', 'more', 'daily']) console.log(pad(e + ':', 9) + top(r.args.filter((x) => x.ev === e), (x) => `${x.arg} ${x.n}`, 30));
  }
  const back = r.back.filter((x) => x.site === site);
  const c = back.reduce((s, x) => s + x.cohort, 0);
  const d1 = back.filter((x) => x.day < r.today).reduce((s, x) => [s[0] + x.cohort, s[1] + x.d1], [0, 0]);
  const d7 = back.filter((x) => x.day <= new Date(Date.parse(r.today) - 7 * 864e5).toISOString().slice(0, 10)).reduce((s, x) => [s[0] + x.cohort, s[1] + x.d7], [0, 0]);
  console.log(`возврат: новых ${c}, вернулись на 2-й день ${pct(d1[1], d1[0])}, на 8-й день ${pct(d7[1], d7[0])}\n`);
}
