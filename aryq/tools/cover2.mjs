// Cover variants that read at thumbnail size (19.10/20.10: CTR 1.4%, bottom 20%: next to bright
// illustrated covers our whole-valley map looked like a dull brown map with a small title).
//   node aryq/tools/cover2.mjs [--seed 1004]
// Output dist/aryq-covers2/: v1-closeup, v2-finger, v3-valley (1920x1080), each also as 800x450.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i < 0 ? def : process.argv[i + 1];
};
const SEED = +arg('seed', 1004);
const out = path.join(repo, 'dist', 'aryq-covers2');
fs.mkdirSync(out, { recursive: true });
const S = await serve(repo);
const B = await chrome();
await B.init("window.requestAnimationFrame = () => 0; try { localStorage.clear(); localStorage.setItem('aryq.taught', '9'); localStorage.setItem('aryq.labelsSeen', 'true'); localStorage.setItem('aryq.litSeen', 'true'); } catch {}");

const W = 1920, H = 1080;
const CSS = `
#hud, #hint, #ui, .update { display: none !important; }
canvas#game { filter: saturate(1.45) contrast(1.08) brightness(1.04); }
.t { position: fixed; z-index: 50; margin: 0; font-family: "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif; font-weight: 900; line-height: 0.86; letter-spacing: -0.01em; color: #ffe066; -webkit-text-stroke: 0.06em #2a1a0c; paint-order: stroke fill; text-shadow: 0 0.06em 0 #2a1a0c, 0 0.14em 0.25em rgba(0,0,0,0.55); }
.t small { display: inline-block; margin-top: 0.18em; padding: 0.12em 0.45em 0.16em; border-radius: 0.5em; background: #2f8ac4; color: #fff; -webkit-text-stroke: 0; font-size: 0.26em; letter-spacing: 0.02em; text-shadow: none; box-shadow: 0 0.08em 0 #1d5b84; }
.vig { position: fixed; inset: 0; z-index: 40; pointer-events: none; background: radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%); }
.hand { position: fixed; z-index: 45; font-size: 210px; filter: drop-shadow(0 10px 12px rgba(0,0,0,0.45)); transform: rotate(-18deg); }
`;

// a valley some way into the game, then a few orchards left thirsty so the picture shows the job
async function valley(days) {
  await B.cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await B.open(`${S.url}/aryq/?debug&lang=en&seed=${SEED}&autostart`, W, H);
  await B.js(`(() => {
    const st = document.createElement('style'); st.textContent = ${JSON.stringify(CSS)}; document.head.append(st);
    const { g, S } = window.__aryq;
    g.dig = 1e6;
    const dig = (o) => { const p = S.planFor(g, o); if (!p || !p.cells.length) return; S.startStroke(g, p.from); for (const c of p.cells) if (!S.extend(g, c).ok) break; S.endStroke(g); };
    for (let t = 0; t < ${days}; t += 0.5) { for (const o of g.objects) if (o.s < 0.99) dig(o); S.advance(g, 0.5); for (const o of g.objects) o.thirst = Math.min(o.thirst, 0.1); }
    for (let k = 0; k < 6; k++) S.flowStep(g);
    return g.objects.length;
  })()`);
}

const frame = (extra = '') => B.js(`(() => { const { g, view, state } = window.__aryq; state.ghost = null; state.labels = null; state.hintPath = null; state.reach = null; ${extra}; let t = 1000; for (let k = 0; k < 40; k++) { t += 33; view.draw(g, t, state); } return true; })()`);
const shot = async (name) => {
  const r = await B.cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(r.data, 'base64'));
};
const html = (s) => B.js(`(() => { document.body.insertAdjacentHTML('beforeend', ${JSON.stringify(s)}); return true; })()`);

try {
  // a spot to look at closely: a canal end next to an orchard, with other orchards around
  const pickSpot = `(() => { const { g, S } = window.__aryq; let best = null;
    for (const o of g.objects) { if (o.type !== 'garden') continue; const n = g.objects.filter((p) => Math.hypot(p.x - o.x, p.y - o.y) < 4).length; if (!best || n > best.n) best = { o, n }; }
    return best ? best.o.y * g.W + best.o.x : Math.floor(g.W * g.H / 2); })()`;

  // v1: close up, one orchard dry next to green ones, water running
  await valley(60);
  let spot = await B.js(pickSpot);
  await frame(`const [x, y] = view.center(${spot}); view.zoomAt(2.5, x, y); view.pan(${W * 0.42} - x, ${H * 0.55} - y);
    const near = g.objects.filter((o) => o.type === 'garden' && Math.hypot(o.x - (${spot} % g.W), o.y - ((${spot} / g.W) | 0)) < 5);
    if (near[1]) { near[1].thirst = 0.95; near[1].s = 0.1; }`);
  await html(`<div class="vig"></div><p class="t" style="right:5%;top:9%;font-size:300px;text-align:right">ARYK<br><small>Water the Valley</small></p>`);
  await shot('v1-closeup');

  // v2: the same idea with the hand that digs: a dashed canal from the water to a dry orchard
  await valley(30);
  spot = await B.js(pickSpot);
  const hand = await B.js(`(() => { const { g, S, view, state } = window.__aryq;
    const [x, y] = view.center(${spot}); view.zoomAt(2.4, x, y); view.pan(${W * 0.4} - x, ${H * 0.55} - y);
    const o = g.objects.slice().sort((a, b) => Math.hypot(a.x - (${spot} % g.W), a.y - ((${spot} / g.W) | 0)) - Math.hypot(b.x - (${spot} % g.W), b.y - ((${spot} / g.W) | 0))).find((p) => p.type === 'garden' && (() => { const q = S.planFor(g, p, null, true); return q && q.cells.length >= 2; })());
    let end = null;
    if (o) { const p = S.planFor(g, o, null, true); if (p && p.cells.length) { o.thirst = 0.95; o.s = 0.1; state.ghost = { obj: o, ...p }; end = view.center(p.cells[Math.max(0, p.cells.length - 2)]); } }
    let t = 1000; for (let k = 0; k < 40; k++) { t += 33; view.draw(g, t, state); }
    return end; })()`);
  await html(`<div class="vig"></div><p class="t" style="right:5%;top:9%;font-size:290px;text-align:right">ARYK<br><small>Water the Valley</small></p>` + (hand ? `<div class="hand" style="left:${hand[0] - 40}px;top:${hand[1] - 20}px">👆</div>` : ''));
  await shot('v2-finger');

  // v3: the whole valley, brighter, with a big title in the middle
  await valley(80);
  await frame(`const s = Math.max(innerWidth / view.bw, innerHeight / view.bh) * 1.05; view.zoomAt(Math.min(2.5, s), innerWidth / 2, innerHeight / 2);`);
  await html(`<div class="vig" style="background:radial-gradient(ellipse at 50% 50%, rgba(10,20,10,0.35) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.35) 100%)"></div><p class="t" style="left:0;right:0;top:50%;transform:translateY(-55%);text-align:center;font-size:330px">ARYK<br><small>Water the Valley</small></p>`);
  await shot('v3-valley');
  console.log('covers in', out, B.errors.length ? B.errors.slice(0, 3) : '');
} finally {
  B.close();
  S.close();
}
