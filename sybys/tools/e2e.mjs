// «Сыбыс» checked in headless Chrome with real mouse input:
//   node sybys/tools/e2e.mjs        (from the repo root)
// start screens in both languages, a word sent by a click, a forged rider caught by a click,
// the four situations, the kurultai and an ending, layouts from a phone to a wide screen.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(repo, 'dist', 'sybys-e2e');
fs.mkdirSync(out, { recursive: true });
const S = await serve(repo);
const B = await chrome();
const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const A = 'window.__sybys';
const page = (q = '') => `${S.url}/sybys/?debug${q}`;
const wait = (ms) => B.js(`new Promise((r) => setTimeout(r, ${ms}))`);
const click = async (x, y) => {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await B.cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
};
const clickText = (text) => B.js(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.includes(${JSON.stringify(text)}) && !x.disabled); if (b) b.click(); return !!b; })()`);
const uiText = () => B.js(`document.getElementById('ui').innerText`);

// 0. every file carries the version of its current content (node sybys/tools/stamp.mjs was run)
{
  const crypto = await import('node:crypto');
  const html = fs.readFileSync(path.join(repo, 'sybys/index.html'), 'utf8');
  const stale = fs.readdirSync(path.join(repo, 'sybys/js')).filter((f) => f.endsWith('.js')).filter((f) => {
    const v = crypto.createHash('sha1').update(fs.readFileSync(path.join(repo, 'sybys/js', f))).digest('hex').slice(0, 8);
    return !html.includes('./js/' + f + '?v=' + v);
  });
  check('versions in index.html are fresh', stale.length === 0, stale.join(', ') || 'all');
}

try {
  await B.init('try { localStorage.clear(); } catch {}');
  // 1. start screens
  await B.open(page('&lang=ru'), 1280, 720);
  let t = await uiText();
  check('start screen in Russian', t.includes('Сыбыс') && t.includes('Играть'), t.slice(0, 30).replace(/\n/g, ' '));
  await B.open(page('&lang=en'), 1280, 720);
  t = await uiText();
  check('start screen in English', t.includes('Sybys') && t.includes('Play'), t.slice(0, 30).replace(/\n/g, ' '));
  await B.shot(path.join(out, 'start-en.png'));

  // 2. play: a click on the hinted pasture sends the word
  await clickText('Play');
  await wait(300);
  const target = await B.js(`(() => { const s = ${A}; const nb = s.g.map.regions[0].nb.map((e) => e.to).filter((i) => s.g.map.regions[i].tribe >= 0); const r = s.g.map.regions[nb[0]]; return { id: r.id, xy: s.view.toScreen(r.x, r.y) }; })()`);
  await click(target.xy[0], target.xy[1]);
  await wait(100);
  let st = await B.js(`JSON.stringify({ riders: ${A}.g.riders.filter((r) => r.kind === 'word').map((r) => r.to), horses: ${A}.g.horses })`).then(JSON.parse);
  check('a click sends a word rider', st.riders.includes(target.id) && st.horses === 2, JSON.stringify(st));
  await B.js(`(() => { for (let k = 0; k < 80; k++) ${A}.step(0.1); })()`);
  const tr = await B.js(`${A}.g.t[${target.id}]`);
  check('the word raised trust there', tr > 0.5, tr.toFixed(2));
  await wait(200);
  await B.shot(path.join(out, 'word.png'));

  // 3. the first situation appears and a choice closes it
  await B.js(`(() => { while (${A}.g.phase === 'map') ${A}.step(0.1); })()`);
  await wait(300);
  t = await uiText();
  check('the horse without its rider', t.includes('without its rider') && t.includes('Call the clans'), t.slice(0, 40).replace(/\n/g, ' '));
  await B.shot(path.join(out, 'event.png'));
  await clickText('Call the clans');
  await wait(100);
  check('the choice closes the scene', (await B.js(`${A}.g.phase`)) === 'map' && (await uiText()) === '');

  // 4. a forged rider is caught by a click on it
  const fr = await B.js(`(() => { const s = ${A}; let n = 0; while (!s.g.riders.some((r) => r.kind === 'false' && r.seg + r.p > 0.4) && n++ < 3000 && s.g.phase === 'map') s.step(0.1); const r = s.g.riders.find((r) => r.kind === 'false'); if (!r) return null; const p = s.S.riderPos(s.g, r); return { id: r.id, xy: s.view.toScreen(p.x, p.y) }; })()`);
  if (fr) {
    await wait(50);
    await click(fr.xy[0], fr.xy[1]);
    await wait(100);
    const cl = await B.js(`JSON.stringify({ gone: !${A}.g.riders.some((r) => r.id === ${fr.id}), clues: ${A}.g.clues.map((c) => c.kind) })`).then(JSON.parse);
    check('a click catches a forged order', cl.gone && cl.clues.includes('forged'), JSON.stringify(cl));
  } else check('a click catches a forged order', false, 'no forged rider came');

  // 5. Aria and Karasai by their buttons and a click on the map
  const far = await B.js(`(() => { const s = ${A}; if (s.g.phase !== 'map') return null; const r = s.g.map.regions.filter((r) => r.tribe >= 0).sort((a, b) => s.g.t[a.id] - s.g.t[b.id])[0]; s.g.horses = 5; return { id: r.id, xy: s.view.toScreen(r.x, r.y) }; })()`);
  if (far) {
    await clickText('Karasai');
    await click(far.xy[0], far.xy[1]);
    await wait(100);
    const k = await B.js(`JSON.stringify({ k: ${A}.g.riders.some((r) => r.kind === 'karasai'), cd: ${A}.g.karasaiCD > 0 })`).then(JSON.parse);
    check('Karasai rides when chosen', k.k && k.cd, JSON.stringify(k));
  }

  // 6. the rest of the season, the kurultai, an ending
  await B.js(`(() => { const s = ${A}; let n = 0; while (s.g.phase !== 'kurultai' && n++ < 20000) { if (s.g.phase === 'event') { const c = s.S.eventChoices(s.g).find((c) => c.ok); s.choose(c.key); } else s.step(0.1); } })()`);
  await wait(1200);
  t = await uiText();
  check('the kurultai shows three elders and the choices', t.includes('Kurultai') && t.includes('Kokzhal') && t.includes('Arkar') && t.includes('Sit on the white felt'), t.slice(0, 60).replace(/\n/g, ' '));
  await B.shot(path.join(out, 'kurultai.png'));
  await clickText('Sit on the white felt');
  await wait(200);
  t = await uiText();
  const end = await B.js(`${A}.g.result && ${A}.g.result.end`);
  check('an ending with its chronicle', !!end && t.includes('Chronicle') && t.includes('Another season'), end);
  await B.shot(path.join(out, 'end.png'));
  check('the ending is remembered', (await B.js(`localStorage.getItem('sybys.ends')`))?.includes(end));

  // 7. layouts: nothing of the HUD falls off, the map is on screen
  for (const [w, h] of [[390, 844], [844, 390], [800, 450], [907, 510], [1280, 720], [1920, 1080]]) {
    await B.open(page('&lang=ru&play'), w, h);
    await wait(200);
    const L = await B.js(`(() => { const out = []; for (const e of document.querySelectorAll('.hud > *, .actions > *')) { const r = e.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1)) out.push(e.className || e.id); } const v = ${A}.view; return { out, map: v.s > 0 && v.ox >= 0 && v.oy >= 0 }; })()`);
    check(`layout ${w}×${h}`, !L.out.length && L.map, L.out.join(', '));
    await B.shot(path.join(out, `layout-${w}x${h}.png`));
  }

  check('no errors in the console', B.errors.length === 0, B.errors.slice(0, 3).join(' | '));
} catch (e) {
  check('ran to the end', false, e.message);
} finally {
  B.close();
  S.close();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} passed; screenshots in dist/sybys-e2e`);
process.exit(bad ? 1 : 0);
