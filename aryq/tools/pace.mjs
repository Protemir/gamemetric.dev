// A human-paced player in real seconds (the game's ×2.5 calm time and ×4 winter counted in):
// reacts to a thirsty orchard after a few seconds, sometimes misses the right way.
//   node aryq/tools/pace.mjs <variant> [games]
// Reports the session length in real minutes, the idle time in the first two minutes and why a game
// was lost. Variants test a rule before it is made, on a patched copy of sim.js in dist/aryq-pace:
// base | tut7 (7 quick first orchards) | shrink9 (glacier -9%/year) | y2soft | calm4 (calm time x4)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const variant = process.argv[2] || 'base';
const games = +(process.argv[3] || 60);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = path.join(repo, 'aryq', 'js') + path.sep;
const dir = path.join(repo, 'dist', 'aryq-pace', 'v-' + variant.replace(/[^a-z0-9]/gi, '_'));
fs.mkdirSync(dir, { recursive: true });
for (const f of ['terrain.js', 'util.js']) fs.copyFileSync(src + f, path.join(dir, f));
let sim = fs.readFileSync(src + 'sim.js', 'utf8');
const want = variant.split('+');
if (want.includes('tut7')) sim = sim.replace('g.gardensEver < 4 ? 2.5', 'g.gardensEver < 7 ? 2.5');
if (want.includes('shrink9')) sim = sim.replace('1 - 0.13 * (year - 1)', '1 - 0.09 * (year - 1)');
if (want.includes('spring')) sim = sim.replace('  return q * melt * Math.max(0.5, 1 - 0.13 * (year - 1));', '  if (year > 1 && day < 30) q = Math.max(q, 8 - (day * 2) / 30); return q * melt * Math.max(0.5, 1 - 0.13 * (year - 1));');
if (want.includes('g100')) sim = sim.replace('more: 1.15', 'more: 1.0');
if (want.includes('g90')) sim = sim.replace('more: 1.15', 'more: 0.9');
if (want.includes('y2soft')) sim = sim.replace('Math.max(5, 11 - g.year)', '(g.year === 2 ? 12 : Math.max(5, 11 - g.year))');
if (want.includes('ration')) {
  const m = want.includes('m85') ? 0.85 : 0.92;
  sim = sim.replace('  const sleeping = g.day >= WINTER;\n  for (const o of g.objects) {\n    o.gotBefore = o.got;', `  const sleeping = g.day >= WINTER;\n  const short = sleeping ? null : waterShare(g);\n  const ration = short == null ? 1 : Math.min(1, Math.max(0.15, short * ${m}));\n  for (const o of g.objects) {\n    o.gotBefore = o.got;`);
  sim = sim.split('if (tap.get(o) === i) w += o.need;').join('if (tap.get(o) === i) w += o.need * ration;');
  sim = sim.replace('const take = Math.min(q, o.need - o.got);', 'const take = Math.min(q, o.need * ration - o.got);');
  if (!sim.includes('* ration;') || !sim.includes('o.need * ration - o.got')) throw new Error('ration patch failed');
}
// pull: in the first year, while everybody drinks, the next orchard comes within 1.5 days (pullall: every year)
if (want.includes('pull') || want.includes('pullall')) {
  const d = (want.find((w) => /^d\d+$/.test(w)) || '').slice(1);
  const e = (want.find((w) => /^e\d+$/.test(w)) || '').slice(1);
  const cond = (want.includes('pullall') ? 'true' : 'g.year === 1') + (d ? ` && g.day < ${d}` : '') + (e ? ` && g.gardensEver < ${e}` : '');
  const at = '  if (g.day < WINTER) {\n    if (g.day >= g.nextGarden) {';
  if (!sim.includes(at)) throw new Error('pull patch failed');
  sim = sim.replace(at, `  if (g.day < WINTER && ${cond} && g.objects.length && g.objects.every((o) => o.s >= 0.6)) g.nextGarden = Math.min(g.nextGarden, g.day + 1.5);\n` + at);
}
if (want.includes('y1six')) sim = sim.replace('g.gardensEver < 4 ? 2.5 : Math.max(5, 11 - g.year)', 'g.gardensEver < 4 ? 2.5 : g.year === 1 ? 6 : Math.max(5, 11 - g.year)');
fs.writeFileSync(path.join(dir, 'sim.js'), sim);
const S = await import(pathToFileURL(path.join(dir, 'sim.js')).href);
const CALM = want.includes('calm4') ? 4 : 2.5;

let r = 12345;
const rnd = () => ((r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296);
const rows = [];
for (let k = 0; k < games; k++) {
  const g = S.newGame(16, 26, 9000 + k, 'wide');
  if (want.includes('first')) { S.advance(g, 0.01); S.giveHeadStart(g, true); }
  let real = 0, idle = 0, idle2 = 0, year1End = null, goals = 0;
  const seen = new Map(); // object -> real time it became thirsty
  const react = new Map();
  while (!g.over && real < 25 * 60) {
    const dtReal = 0.25;
    const calm = g.day >= S.WINTER || (g.objects.length > 0 && g.objects.every((o) => o.s >= 0.6));
    const thirsty = g.objects.filter((o) => o.s < 0.6);
    if (!thirsty.length) { idle += dtReal; if (real < 120) idle2 += dtReal; }
    for (const o of thirsty) {
      if (!seen.has(o)) { seen.set(o, real); react.set(o, 2 + rnd() * 5); }
      if (real - seen.get(o) >= react.get(o)) {
        // a person finds the way most of the time, takes a few seconds to dig it
        const p = S.planFor(g, o);
        if (p && p.cells.length && p.cells.length <= g.dig && rnd() < 0.8) {
          S.startStroke(g, p.from);
          for (const c of p.cells) if (!S.extend(g, c).ok) break;
          S.endStroke(g);
          real += 1.5; // the time of the drag itself (time stops while digging)
        }
        react.set(o, react.get(o) + 3 + rnd() * 4); // tries again a bit later
      }
    }
    for (const o of g.objects) if (o.s >= 0.6) seen.delete(o);
    for (const ev of g.events.splice(0)) if (ev.type === 'goal') goals++; else if (ev.type === 'year') { if (year1End == null) year1End = real; S.reward(g, S.REWARDS[Math.floor(rnd() * 3)]); }
    S.advance(g, (dtReal * (g.day >= S.WINTER ? 4 : calm ? CALM : 1)) / S.DAY_SEC);
    real += dtReal;
  }
  let why = 'alive';
  if (g.over) { const o = g.objects.find((x) => x.x === g.over.x && x.y === g.over.y) || g.objects.reduce((a, b) => (b.thirst > a.thirst ? b : a)); const p = S.planFor(g, o); const share = S.waterShare(g); why = o.got > 0.01 ? (share != null && share < 1 ? 'river short' : 'canal full / share') : !p ? 'no way' : p.cells.length > g.dig ? 'no digging left (' + p.cells.length + '>' + g.dig + ')' : g.kind[p.from] === S.CANAL && g.flow[p.from] < o.need ? (g.flow[p.from] < 0.02 ? 'way from a dry canal' : 'way from a thin canal') : 'missed / late'; }
  rows.push({ goals, when: g.over ? 'y' + g.year + ':d' + Math.floor(g.day / 20) * 20 : 'alive', why, harvest: g.harvest, min: real / 60, idle2, idleShare: idle / real, year: g.year, y1: year1End });
}
const avg = (f) => rows.reduce((s, x) => s + f(x), 0) / rows.length;
const med = (f) => { const a = rows.map(f).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
console.log(`${variant.padEnd(16)} session min avg ${avg((x) => x.min).toFixed(1)} median ${med((x) => x.min).toFixed(1)} | idle in first 2 min ${avg((x) => x.idle2).toFixed(0)} s | idle share ${(100 * avg((x) => x.idleShare)).toFixed(0)}% | lost in year ${avg((x) => x.year).toFixed(1)} | year 1 lasts ${(avg((x) => x.y1 || 0) / 60).toFixed(1)} min`);

const whys = {};
for (const x of rows) { const k = x.why.split(' (')[0]; whys[k] = (whys[k] || 0) + 1; }
console.log('   why lost:', JSON.stringify(whys));
const whens = {};
for (const x of rows) whens[x.when] = (whens[x.when] || 0) + 1;
console.log('   goals of the year reached per game: ' + avg((x) => x.goals).toFixed(2) + ', years with a goal ' + avg((x) => Math.max(0, x.year - 1)).toFixed(2));
console.log('   lost when:', Object.entries(whens).sort().map(([k, v]) => k + ' ' + v).join(', '));
const hv = rows.map((x) => x.harvest).sort((a, b) => a - b);
console.log('   harvest per game: p25 ' + Math.round(hv[Math.floor(hv.length * 0.25)]) + ', median ' + Math.round(hv[Math.floor(hv.length / 2)]) + ', p75 ' + Math.round(hv[Math.floor(hv.length * 0.75)]));
