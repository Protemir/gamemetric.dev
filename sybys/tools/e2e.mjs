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
const clickText = (text) => B.js(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(${JSON.stringify(text)}) && !x.disabled); if (b) b.click(); return !!b; })()`);
const uiText = () => B.js(`document.getElementById('ui').textContent`);

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
  check('start screen in English', t.includes('Whispers of the Steppe') && t.includes('Play'), t.slice(0, 30).replace(/\n/g, ' '));
  await B.shot(path.join(out, 'start-en.png'));

  // 2. Play goes straight onto the map (no cards in between); the loading screen has gone
  check('the loading screen leaves', await (async () => { for (let k = 0; k < 40; k++) { if (!(await B.js(`!!document.getElementById('boot')`))) return true; await wait(100); } return false; })());
  await clickText('Play');
  await wait(300);
  t = await uiText();
  check('Play opens the map at once', t === '' && (await B.js(`!document.getElementById('hud').hidden`)), t.slice(0, 40));

  // 3. the lesson: each step waits for the player; the season clock stands still meanwhile
  const poll = async (expr, ms = 12000) => {
    for (let k = 0; k < ms / 100; k++) {
      if (await B.js(expr)) return true;
      await wait(100);
    }
    return false;
  };
  const handXY = () => B.js(`(() => { const s = ${A}; const r = s.g.map.regions[s.look.hand]; return r ? s.view.toScreen(r.x, r.y) : null; })()`);
  let st = await B.js(`JSON.stringify({ step: ${A}.coach.step, hold: ${A}.g.hold, said: document.getElementById('coach').innerText })`).then(JSON.parse);
  check('lesson 1: Aria points at a pasture', st.step === 'send' && st.hold && st.said.includes('under the arrow'), st.step);
  // the bubble thins out over a pasture it would hide
  const thin = await B.js(`(async () => { const s = ${A}; const b = document.getElementById('coach').getBoundingClientRect(); const was = s.look.hand;
    const id = s.g.map.regions.findIndex((r) => { const [x, y] = s.view.toScreen(r.x, r.y); return x > b.left && x < b.right && y > b.top && y < b.bottom; });
    if (id < 0) return 'none';
    const c = document.getElementById('coach'), moved = () => c.classList.contains('thin') || c.classList.contains('flip'), until = async (want) => { for (let k = 0; k < 30 && moved() !== want; k++) await new Promise((f) => setTimeout(f, 100)); return moved() === want; };
    s.look.hand = id; let on = await until(true);
    if (on && !c.classList.contains('thin')) { await new Promise((f) => setTimeout(f, 300)); const n = c.getBoundingClientRect(), [px, py] = s.view.toScreen(s.g.map.regions[id].x, s.g.map.regions[id].y); on = !(px > n.left && px < n.right && py > n.top && py < n.bottom); }
    s.look.hand = was; const off = await until(false);
    return on && off ? 'ok' : JSON.stringify({ on, off, id, hand: s.look.hand, cls: document.getElementById('coach').className, phase: s.g.phase, b: [b.left, b.top, b.right, b.bottom].map(Math.round), p: s.view.toScreen(s.g.map.regions[id].x, s.g.map.regions[id].y).map(Math.round) }); })()`);
  check('the advisor moves aside or thins out over what he hides', thin === 'ok' || thin === 'none', thin);
  let xy = await handXY();
  await click(xy[0], xy[1]);
  await wait(100);
  st = await B.js(`JSON.stringify({ riders: ${A}.g.riders.filter((r) => r.kind === 'word').length, horses: ${A}.g.horses, step: ${A}.coach.step })`).then(JSON.parse);
  check('a click on the hand sends a word rider', st.riders === 1 && st.horses === 2 && st.step === 'watch', JSON.stringify(st));
  await wait(700);
  await B.shot(path.join(out, 'word.png'));
  check('lesson 2 → 3 after the word arrives', await poll(`${A}.coach.step === 'more'`));
  for (let k = 0; k < 2; k++) {
    await poll(`${A}.g.horses >= 1`);
    xy = await handXY();
    await click(xy[0], xy[1]);
    await wait(150);
  }
  check('lesson 4: a false rider comes', await poll(`${A}.coach.step === 'false'`, 3000));
  await wait(1500);
  const fr = await B.js(`(() => { const s = ${A}; const r = s.g.riders.find((r) => r.kind === 'false'); if (!r) return null; const p = s.S.riderPos(s.g, r); return { id: r.id, xy: s.view.toScreen(p.x, p.y) }; })()`);
  await B.shot(path.join(out, 'false-rider.png'));
  if (fr) {
    await click(fr.xy[0], fr.xy[1] - 4);
    await wait(150);
    const cl = await B.js(`JSON.stringify({ gone: !${A}.g.riders.some((r) => r.id === ${fr.id}), clues: ${A}.g.clues.map((c) => c.kind) })`).then(JSON.parse);
    check('a click catches the false order', cl.gone && cl.clues.includes('forged'), JSON.stringify(cl));
  } else check('a click catches the false order', false, 'no false rider');
  check('the lesson ends and the season starts', await poll(`!${A}.coach.step && !${A}.g.hold`, 20000));
  check('the clock stood still during the lesson', (await B.js(`${A}.g.clock`)) < 2);

  // 3. the first situation appears and a choice closes it
  await B.js(`(() => { while (${A}.g.phase === 'map') ${A}.step(0.1); })()`);
  await wait(300);
  t = await uiText();
  check('the first decision', t.includes('first decision') && t.includes('Call the clans'), t.slice(0, 40).replace(/\n/g, ' '));
  await B.shot(path.join(out, 'event.png'));
  // a choice that brings horses says so with the horse icon, not only in words
  const gain = await B.js(`(() => { const b = [...document.querySelectorAll('.event .choice')].find((b) => b.textContent.includes('Power to Karasai')); const s = b && b.querySelector('.cost.gain'); return s ? s.textContent.trim() + ':' + !!s.querySelector('svg') : 'none'; })()`);
  check('a choice shows the horses it brings', gain === '+2:true', gain);
  await clickText('Call the clans');
  await wait(100);
  check('the choice closes the scene', (await B.js(`${A}.g.phase`)) === 'map' && (await uiText()) === '');

  // 5. Aria and Karasai by their buttons and a click on the map
  const far = await B.js(`(() => { const s = ${A}; if (s.g.phase !== 'map') return null; const r = s.g.map.regions.filter((r) => r.tribe >= 0).sort((a, b) => s.g.t[a.id] - s.g.t[b.id])[0]; s.g.horses = 5; return { id: r.id, xy: s.view.toScreen(r.x, r.y) }; })()`);
  if (far) {
    await clickText('Karasai');
    await click(far.xy[0], far.xy[1]);
    await wait(100);
    const k = await B.js(`JSON.stringify({ k: ${A}.g.riders.some((r) => r.kind === 'karasai'), cd: ${A}.g.karasaiCD > 0 })`).then(JSON.parse);
    check('Karasai rides when chosen', k.k && k.cd, JSON.stringify(k));
  }

  // 5b. a tap on a ✕ sends Aria without her button
  const mk = await B.js(`(() => { const s = ${A}; const free = (r) => { const [x, y] = s.view.toScreen(r.x, r.y); return !s.view.riderAt(s.g, x - s.view.u * 2.6, y - s.view.u * 2.2) && y > 120 && y < 560; }; const r = s.g.map.regions.filter((r) => r.tribe >= 0 && !s.g.marks.has(r.id) && free(r))[0]; s.g.marks.add(r.id); s.g.horses = 5; s.g.aria.busy = 0; s.g.aria.riding = false; const [x, y] = s.view.toScreen(r.x, r.y); return { id: r.id, xy: [x - s.view.u * 2.6, y - s.view.u * 2.2] }; })()`);
  await click(mk.xy[0], mk.xy[1]);
  await wait(100);
  check('a tap on ✕ sends Aria', await B.js(`${A}.g.riders.some((r) => r.kind === 'aria' && r.to === ${mk.id})`), await B.js(`JSON.stringify({ aria: ${A}.g.aria, phase: ${A}.g.phase, riders: ${A}.g.riders.map((r) => r.kind) })`));

  // 5b2. a raid: a tap on a raider sends batyrs; the night: a tap on the rider without a lantern takes the killer
  const raid = await B.js(`(() => { const s = ${A}; s.g.horses = 5; s.S.startRaid(s.g); s.step(1.5); const r = s.g.riders.find((r) => r.kind === 'raider' && !(r.delay > 0)); if (!r) return 'no raider'; const p = s.S.riderPos(s.g, r); const xy = s.view.toScreen(p.x, p.y); return { id: r.id, xy }; })()`);
  if (raid.id) { await click(raid.xy[0], raid.xy[1] - 4); await wait(100); }
  check('a tap on a raider sends batyrs', raid.id && (await B.js(`!${A}.g.riders.some((r) => r.id === ${raid.id})`)) && (await B.js(`${A}.g.repelled`)) > 0, JSON.stringify(raid).slice(0, 60));
  await B.js(`(() => { const s = ${A}; s.g.riders = s.g.riders.filter((r) => r.kind !== 'raider'); s.g.raid = null; s.S.startNight(s.g); s.step(1); })()`);
  const nk = await B.js(`(() => { const s = ${A}; const r = s.g.riders.find((r) => r.kind === 'envoy' && r.killer); const p = s.S.riderPos(s.g, r); return s.view.toScreen(p.x, p.y); })()`);
  await click(nk[0], nk[1] - 4);
  await wait(100);
  check('a tap on the killer at night', (await B.js(`${A}.g.night && ${A}.g.night.result`)) === 'caught');
  await B.js(`(() => { const s = ${A}; for (let k = 0; k < 40; k++) s.step(0.1); })()`);

  // 5b'. no horses: the horses chip shivers red, nothing is sent
  const short = await B.js(`(() => { const s = ${A}; const h = s.g.horses; s.g.horses = 0; const id = s.g.map.regions.findIndex((r, i) => i > 0 && r.tribe >= 0); const sent = s.act('word', id); const on = document.getElementById('horsesChip').classList.contains('short'); s.g.horses = h; return JSON.stringify({ sent, on }); })()`).then(JSON.parse);
  check('no horses: the horses chip shivers', short.on && short.sent === false, JSON.stringify(short));
  // 5c. the camera: a drag moves the map and sends nobody, the wheel zooms, ⤢ shows the whole map again
  const before = await B.js(`JSON.stringify({ h: ${A}.g.horses, n: ${A}.g.riders.filter((r) => r.kind === 'word').length })`).then(JSON.parse);
  await B.cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 640, y: 360, deltaX: 0, deltaY: -600 });
  await B.cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 640, y: 360, deltaX: 0, deltaY: -600 });
  await wait(100);
  const z = await B.js(`${A}.view.zoom`);
  check('the wheel zooms in', z > 1.2, String(z));
  await B.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 640, y: 360, button: 'left', buttons: 1, clickCount: 1 });
  for (let k = 1; k <= 8; k++) await B.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 640 - k * 15, y: 360 - k * 6, button: 'left', buttons: 1 });
  await B.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 520, y: 312, button: 'left', buttons: 0, clickCount: 1 });
  await wait(100);
  const after = await B.js(`JSON.stringify({ h: ${A}.g.horses, n: ${A}.g.riders.filter((r) => r.kind === 'word').length, pan: ${A}.view.pan.length() })`).then(JSON.parse);
  check('a drag moves the map and sends nobody', after.pan > 0.3 && after.n === before.n, JSON.stringify(after));
  await B.shot(path.join(out, 'zoomed.png'));
  await B.js(`document.getElementById('fitBtn').click()`);
  await wait(100);
  check('⤢ shows the whole map again', (await B.js(`${A}.view.zoom === 1 && ${A}.view.pan.length() === 0`)));

  // 5d. what an action does: a card over its button
  const bx = await B.js(`(() => { const r = document.querySelector('.act[data-key="word"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
  await B.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: bx[0], y: bx[1] });
  await wait(250);
  const tip = await B.js(`document.querySelector('.tip.on')?.textContent || ''`);
  check('hovering an action explains it', tip.includes('rider') && tip.includes('1 horse'), tip.slice(0, 40).replace(/\n/g, ' '));
  await B.shot(path.join(out, 'tip.png'));
  await B.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 640, y: 300 });

  // 6. the rest of summer, the small council, autumn with Zaltyr and Sarman, the great kurultai, an ending
  const playTo = (phase) => B.js(`(() => { const s = ${A}; let n = 0; while (s.g.phase !== '${phase}' && n++ < 20000) { if (s.g.phase === 'event') { const c = s.S.eventChoices(s.g).find((c) => c.ok); s.choose(c.key); } else s.step(0.1); } return s.g.phase; })()`);
  await playTo('council');
  await wait(1200);
  t = await uiText();
  check('the small council at the end of summer', t.includes('small council') && t.includes('Autumn'), t.slice(0, 50).replace(/\n/g, ' '));
  await B.shot(path.join(out, 'council.png'));
  await clickText('Autumn');
  await wait(300);
  const au = await B.js(`JSON.stringify({ season: ${A}.g.season, phase: ${A}.g.phase, zaltyrBtn: !document.querySelector('.act[data-key="zaltyr"]').hidden, caravan: !!${A}.g.caravan })`).then(JSON.parse);
  check('autumn: Zaltyr joins, Sarman sends caravans', au.season === 2 && au.phase === 'map' && au.zaltyrBtn && au.caravan, JSON.stringify(au));
  // Zaltyr on watch marks a forged rider near him
  const zw = await B.js(`(() => { const s = ${A}; s.g.horses = 5; const f = s.S.spawnPlot(s.g); if (!f) return 'no rider'; const at = f.path[Math.min(2, f.path.length - 1)]; s.g.zaltyr.at = at; s.g.zaltyr.busy = 30; for (let k = 0; k < 120 && !f.seen && s.g.riders.includes(f); k++) s.step(0.1); return f.seen ? 'seen' : 'missed'; })()`);
  check('Zaltyr marks a forged rider', zw === 'seen', zw);
  await wait(200);
  await B.shot(path.join(out, 'autumn.png'));
  // a clan's marks (grudge, fear, whispers) stand beside its temper on the chip, never on top of it
  const chipMarks = await B.js(`(async () => { const s = ${A}; const keep = s.g.tribes.map((tr) => [tr.grievance, tr.fear, tr.talks]); for (const tr of s.g.tribes) { tr.grievance = 1; tr.fear = 0.6; tr.talks = true; } s.step(0.05); await new Promise((r) => setTimeout(r, 300)); const bad = [...document.querySelectorAll('#tribes .tribe')].filter((c) => { const a = c.querySelector('.trait')?.getBoundingClientRect(); const b = c.querySelector('.fear').getBoundingClientRect(); const n = c.querySelector('.tn').getBoundingClientRect(); const box = c.getBoundingClientRect(); return !a || !b.width || a.right > b.left + 0.5 || n.right > a.left + 0.5 || b.right > box.right; }).map((c) => { const f = (s) => { const r = c.querySelector(s).getBoundingClientRect(); return Math.round(r.left) + "-" + Math.round(r.right); }; return f(".tn") + "|" + f(".trait") + "|" + f(".fear") + "|" + f(".tb"); }).join(" ") || 0; s.g.tribes.forEach((tr, k) => { [tr.grievance, tr.fear, tr.talks] = keep[k]; }); s.step(0.05); return bad; })()`);
  check('clan marks do not cover the temper on the chip', chipMarks === 0, String(chipMarks));
  // the same clue twice is one line with ×2 in the journal
  const jr = await B.js(`(() => { const g = ${A}.g; if (g.phase !== 'map') return 'phase ' + g.phase; const k = g.clues.length; g.clues.push({ kind: 'forged', hint: -1 }, { kind: 'forged', hint: -1 }); document.getElementById('journalBtn').click(); const rows = [...document.querySelectorAll('.journal li')].filter((li) => li.textContent.includes(${JSON.stringify('A forged order')})); const r = rows.length + ':' + (rows[0] ? rows[0].textContent.includes('×') : false); g.clues.splice(k); [...document.querySelectorAll('.journal button')].pop().click(); return r; })()`);
  check('the journal folds a repeated clue into one line with ×N', jr === '1:true', jr);
  await playTo('kurultai');
  await wait(1500);
  t = await uiText();
  check('the kurultai shows three elders and the choices', t.includes('Kurultai') && t.includes('Kokzhal') && t.includes('Arkar') && t.includes('Sit on the white felt'), t.slice(0, 60).replace(/\n/g, ' '));
  await B.shot(path.join(out, 'kurultai.png'));
  // the answers sit in even rows: four go two by two, none is left alone on the last row
  const rows = await B.js(`(() => { const bs = [...document.querySelectorAll('.kurultai .choices > .choice')]; const by = {}; for (const b of bs) { const y = Math.round(b.getBoundingClientRect().top); by[y] = (by[y] || 0) + 1; } return bs.length + ':' + Object.values(by).join(','); })()`);
  check('the kurultai answers leave no lonely button', !/^4:/.test(rows) || rows === '4:2,2', rows);
  // each elder's seat shows trust against the line it had to cross
  const sb = await B.js(`(() => { const v = ${A}.g.vote; return [...document.querySelectorAll('.seat .bar')].map((b, k) => Math.abs(parseFloat(b.style.getPropertyValue('--at')) - v.votes[k].line * 100) < 0.5 && b.firstChild.style.width !== '').join(','); })()`);
  check('kurultai seats show trust against the line', sb === 'true,true,true', sb);
  await clickText('Sit on the white felt');
  await wait(200);
  t = await uiText();
  const end = await B.js(`${A}.g.result && ${A}.g.result.end`);
  check('an ending with its chronicle', !!end && t.includes('Chronicle') && t.includes('Another campaign') && t.includes('Glory'), end);
  const ev = await B.js(`(() => { const v = ${A}.g.vote.votes; const s = [...document.querySelectorAll('.endvotes .ev')]; return s.length >= 3 && v.every((x, k) => s[k].classList.contains(x.yes ? 'yes' : 'no')) && document.querySelectorAll('.endvotes .yes').length === ${A}.g.result.yes; })()`);
  check('the ending shows how each clan voted', ev === true, ev);
  await B.shot(path.join(out, 'end.png'));
  check('the ending is remembered', (await B.js(`localStorage.getItem('sybys.ends')`))?.includes(end));

  // 7. layouts: nothing of the HUD falls off, the map is on screen
  for (const [w, h] of [[390, 844], [844, 390], [800, 450], [907, 510], [1280, 720], [1920, 1080]]) {
    await B.open(page('&lang=ru&play&tutorial'), w, h);
    await wait(200);
    const L = await B.js(`(() => { const out = []; for (const e of document.querySelectorAll('.hud > *, .actions > *')) { const r = e.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1)) out.push(e.className || e.id); } const v = ${A}.view; return { out, map: v.s > 0 && v.ox >= 0 && v.oy >= 0 }; })()`);
    check(`layout ${w}×${h}`, !L.out.length && L.map, L.out.join(', '));
    if (w < 900) {
      // the seconds of a cooldown never sit on top of the adviser's name
      await B.js(`(() => { const s = ${A}; s.g.karasaiCD = 15; s.step(0.1); })()`);
      await wait(100);
      const cd = await B.js(`(() => { const b = document.querySelector('.act[data-key="karasai"]'), c = b && b.querySelector('.cdn'); if (!c) return 'no timer'; const a = c.getBoundingClientRect(), q = b.querySelector('.an').getBoundingClientRect(); return a.right <= q.left || a.left >= q.right || a.bottom <= q.top || a.top >= q.bottom ? 'clear' : 'over the name'; })()`);
      check(`cooldown clear of the name ${w}×${h}`, cd === 'clear', cd);
    }
    await B.shot(path.join(out, `layout-${w}x${h}.png`));
  }

  // 8. the 3D steppe is on and its models arrived; ?2d still gives the painted map
  await B.open(page('&lang=en&play'), 1280, 720);
  check('the 3D steppe with its models', await (async () => { for (let k = 0; k < 50; k++) { if (await B.js(`!!document.getElementById('world') && ${A}.view.is3d && ${A}.view.modelsLoaded && ${A}.view.populated === ${A}.g.map`)) return true; await wait(100); } return false; })());
  await B.open(page('&lang=en&play&2d'), 1280, 720);
  check('?2d gives the painted map', !(await B.js(`!!document.getElementById('world')`)) && !(await B.js(`${A}.view.is3d`)));
  // 9. a slow device: the game drops to 2D by itself and remembers it
  await B.open(page('&lang=en&play&forceLite'), 1280, 720);
  const lite = await (async () => { for (let k = 0; k < 120; k++) { if (await B.js(`!document.getElementById('world') && localStorage.getItem('sybys.lite') === 'true'`)) return true; await wait(100); } return false; })();
  check('a slow device switches to 2D on its own', lite);
  await B.init('/* keep what the page saved */');
  await B.open(page('&lang=en&play&nodebug'), 1280, 720);
  check('…and starts in 2D next time', !(await B.js(`!!document.getElementById('world')`)));
  await B.js(`localStorage.removeItem('sybys.lite')`);
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
