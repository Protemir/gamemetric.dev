// The whole game checked in headless Chrome: levels, bots, screens, layouts, speed, the portal build.
//
//   node oyu/tools/test.mjs            (from the repo root; the portal check needs a fresh
//                                       node oyu/tools/build-portal.mjs first)
//
// The page's own animation loop is switched off; the test steps the game by hand through
// window.__oyu (?debug), so every run is the same.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { serve, chrome } from './cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const S = await serve(repo);
const B = await chrome();
const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok, info });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const FRESH = "window.requestAnimationFrame = () => 0; try { localStorage.clear(); } catch {}";
const KEEP = 'window.requestAnimationFrame = () => 0;';
const page = (q = '') => `${S.url}/oyu/?debug&nopulse${q}`;
const O = 'window.__oyu';

try {
  // 1. a new player lands in level 1 with the hint
  await B.init(FRESH);
  await B.open(page(), 390, 844);
  let r = await B.js(`({ mode: ${O}.mode, level: ${O}.game.level.index, hint: document.getElementById('hint').classList.contains('show'), ring: !!${O}.R.hint || (${O}.step(1), !!${O}.R.hint) })`);
  check('new player lands in level 1', r.mode === 'play' && r.level === 0 && r.hint && r.ring, JSON.stringify(r));

  // 2. every level is consistent
  r = await B.js(`(() => {
    const bad = []; const seen = new Map(); let maxPx = 0;
    for (let i = 0; i < 60; i++) {
      const lv = ${O}.buildLevel(i);
      const px = lv.grid.reduce((n, c) => n + (c >= 0 ? 1 : 0), 0);
      const ammo = lv.queues.flat().reduce((n, s) => n + s.ammo, 0);
      const perColor = lv.palette.map((_, c) => [lv.grid.filter((x) => x === c).length, lv.queues.flat().filter((s) => s.color === c).reduce((n, s) => n + s.ammo, 0)]);
      maxPx = Math.max(maxPx, px);
      if (lv.palette.length < 2) bad.push(i + 1 + ': one color');
      if (ammo !== px) bad.push(i + 1 + ': ammo ' + ammo + ' vs pixels ' + px);
      if (perColor.some(([a, b]) => a !== b)) bad.push(i + 1 + ': per-color ammo mismatch');
      if (lv.queues.some((q) => !q.length)) bad.push(i + 1 + ': empty queue');
      if (lv.queues.flat().some((s) => s.ammo <= 0)) bad.push(i + 1 + ': zero ammo shooter');
      if (!lv.picture.ornament) { if (seen.has(lv.picture.id)) bad.push(i + 1 + ': repeats ' + lv.picture.id + ' of level ' + seen.get(lv.picture.id)); else seen.set(lv.picture.id, i + 1); }
    }
    return { bad, maxPx };
  })()`);
  check('60 levels: ammo matches pixels, no empty queues, no repeated pictures', !r.bad.length, r.bad.slice(0, 6).join('; ') + ` (largest ${r.maxPx} px)`);

  // 3. the careful bot wins everything
  r = await B.js(`(async () => { const bot = await import('/oyu/tools/bot.js'); const res = await bot.run({ policy: 'smart', log: false }); return { lost: res.filter((x) => x.result !== 'won').map((x) => x.level), avg: Math.round(res.reduce((s, x) => s + x.time, 0) / res.length), max: Math.max(...res.map((x) => x.time)) }; })()`);
  check('smart bot wins all 60 levels', !r.lost.length, `lost: [${r.lost}], average ${r.avg} s, longest ${r.max} s`);

  // 4. random play: difficulty curve and no errors
  r = await B.js(`(async () => { const bot = await import('/oyu/tools/bot.js'); const per = new Array(60).fill(0); for (const seed of [11, 22]) { const res = await bot.run({ policy: 'random', seed, log: false }); res.forEach((x, i) => (per[i] += x.result === 'won' ? 1 : 0)); } return [0, 15, 30, 45].map((k) => per.slice(k, k + 15).reduce((a, b) => a + b, 0)); })()`);
  check('random taps: wins drop as levels go on', r[0] >= r[3], `wins of 30 per quarter: ${r.join(' / ')}`);

  // 5. lose, then try again
  r = await B.js(`(async () => { const bot = await import('/oyu/tools/bot.js'); for (let k = 0; k < 40; k++) { ${O}.startLevel(24); bot.play(${O}, 'random', Math.random); if (${O}.game.state === 'lost') break; } const lost = ${O}.game.state === 'lost'; ${O}.step(60); const mode = ${O}.mode; const pct = document.querySelector('#ui .almost')?.textContent || ''; const btn = document.querySelector('#ui .btn.primary'); btn && btn.click(); ${O}.step(2); return { lost, mode, pct, after: ${O}.mode, level: ${O}.game.level.index, state: ${O}.game.state }; })()`);
  check('lose screen shows how close it was, "try again" restarts the same level', r.lost && r.mode === 'lost' && /\d+%/.test(r.pct) && r.after === 'play' && r.level === 24 && r.state === 'play', JSON.stringify(r));

  // 6. win, then next
  r = await B.js(`(async () => { const bot = await import('/oyu/tools/bot.js'); ${O}.startLevel(2); bot.play(${O}); ${O}.step(240); const mode = ${O}.mode; const text = document.getElementById('ui').innerText; document.querySelector('#ui .btn.primary').click(); ${O}.step(2); return { mode, text: text.slice(0, 80), next: ${O}.game.level.index, done: ${O}.progress.done.includes(2) }; })()`);
  check('win screen, then "next" opens the next level', r.mode === 'won' && r.next === 3 && r.done, JSON.stringify(r));

  // 7. the last level has no "next"
  r = await B.js(`(async () => { const bot = await import('/oyu/tools/bot.js'); ${O}.startLevel(59); bot.play(${O}); ${O}.step(300); return { mode: ${O}.mode, buttons: [...document.querySelectorAll('#ui .btn')].map((b) => b.textContent) }; })()`);
  check('last level: win screen without "next"', r.mode === 'won' && r.buttons.length === 1, JSON.stringify(r));

  // 8. the carpet: 60 tiles, finished ones open their level
  r = await B.js(`(() => { document.getElementById('menuBtn').click(); ${O}.step(2); const btns = [...document.querySelectorAll('#ui .btn')]; btns[1].click(); ${O}.step(2); const tiles = document.querySelectorAll('.tile'); const done = document.querySelectorAll('.tile canvas').length; document.querySelectorAll('.tile')[2].click(); ${O}.step(2); return { tiles: tiles.length, done, opened: ${O}.game.level.index, mode: ${O}.mode }; })()`);
  check('carpet: 60 tiles, a finished one opens its level', r.tiles === 60 && r.done >= 2 && r.opened === 2 && r.mode === 'play', JSON.stringify(r));

  // 9. language switch
  r = await B.js(`(() => { document.getElementById('menuBtn').click(); ${O}.step(1); const chip = (t) => [...document.querySelectorAll('.chip')].find((c) => c.textContent === t); chip('RU').click(); const ru = document.querySelector('.tag').textContent; const title = document.title; chip('EN').click(); const en = document.querySelector('.tag').textContent; return { ru: ru.slice(0, 20), en: en.slice(0, 20), title }; })()`);
  check('language switch RU/EN', /[а-я]/i.test(r.ru) && /^[A-Za-z]/.test(r.en) && /Ою/.test(r.title), JSON.stringify(r));

  // 10. the belt never takes more than its places
  r = await B.js(`(() => { ${O}.startLevel(5); const g = ${O}.game; let refused = 0; for (let k = 0; k < 12; k++) { const ok = g.launchFromQueue(k % g.queues.length); if (!ok) refused++; } const over = g.onBelt > g.cap; ${O}.step(30); return { cap: g.cap, onBelt: g.onBelt, refused, over }; })()`);
  check('belt keeps to its places when tapped fast', !r.over && r.refused > 0, JSON.stringify(r));

  // 11. layouts: nothing outside the screen, board below the top bar
  const sizes = [[375, 667], [390, 844], [412, 915], [768, 1024], [800, 450], [1280, 720], [1920, 1080], [667, 375]];
  const bad = [];
  for (const [w, h] of sizes) {
    await B.size(w, h);
    for (const lv of [0, 29, 59]) {
      const q = await B.js(`(() => { ${O}.startLevel(${lv}); const g = ${O}.game; g.launchFromQueue(0); ${O}.step(40); const R = ${O}.R; const t = R.track; const inside = (x, y, m = 0) => x >= -m && y >= -m && x <= innerWidth + m && y <= innerHeight + m; const tok = [...R.tokens.values()].filter((v) => v.a > 0.5); return { track: inside(t.x0 - R.tokenR, t.y0 - R.tokenR) && inside(t.x1 + R.tokenR, t.y1 + R.tokenR), top: t.y0 - R.tokenR >= 50, tokens: tok.every((v) => inside(v.x, v.y, 2)), dock: R.dockPos.every((p) => inside(p.x, p.y)), queues: R.queuePos.every((p) => inside(p.x, p.y + R.qr)), cell: R.cell, qr: Math.round(R.qr) }; })()`);
      const fails = Object.entries(q).filter(([k, v]) => v === false).map(([k]) => k);
      if (fails.length || q.cell < 6) bad.push(`${w}x${h} level ${lv + 1}: ${fails.join(',') || 'cell ' + q.cell}`);
    }
    const m = await B.js(`(() => { document.getElementById('menuBtn').click(); ${O}.step(1); const p = document.querySelector('#ui .panel').getBoundingClientRect(); return p.top >= 0 && p.bottom <= innerHeight + 1; })()`);
    if (!m) bad.push(`${w}x${h}: menu does not fit`);
  }
  check('layouts on 8 screen sizes: board, belt, dock, queues and menu fit', !bad.length, bad.slice(0, 8).join('; '));

  // 12. resizing in the middle of a level
  r = await B.js(`(() => { ${O}.startLevel(30); const g = ${O}.game; g.launchFromQueue(0); g.launchFromQueue(1); ${O}.step(20); return g.state; })()`);
  for (const [w, h] of [[375, 740], [1280, 720], [800, 450], [390, 844]]) {
    await B.size(w, h);
    await B.js(`${O}.step(15)`);
  }
  r = await B.js(`(async () => { const bot = await import('/oyu/tools/bot.js'); bot.play(${O}); return ${O}.game.state; })()`);
  check('resizing mid-level keeps the game going', r === 'won', r);

  // 13. hidden colors deeper in the queue
  r = await B.js(`(() => { const out = []; for (const i of [5, 6, 15]) { ${O}.startLevel(i); ${O}.step(1); out.push(${O}.R.hideFrom); } return out; })()`);
  check('hidden "?" from level 7 (2nd behind) and level 16 (all behind)', r[0] === 99 && r[1] === 2 && r[2] === 1, JSON.stringify(r));

  // 14. speed: the biggest level with shots and chips flying
  await B.size(1280, 720);
  r = await B.js(`(() => { ${O}.startLevel(59); const g = ${O}.game; for (let k = 0; k < 3; k++) g.launchFromQueue(k % g.queues.length); ${O}.step(60, false); const t0 = performance.now(); for (let k = 0; k < 120; k++) ${O}.step(1, true); return { ms: +((performance.now() - t0) / 120).toFixed(2), particles: ${O}.R.particles.length }; })()`);
  check('speed: a frame of the largest level', r.ms < 12, `${r.ms} ms per frame in headless Chrome (software rendering), ${r.particles} particles`);

  // 15. progress survives a reload
  await B.init(FRESH);
  await B.open(page(), 390, 844);
  await B.js(`(async () => { const bot = await import('/oyu/tools/bot.js'); bot.play(${O}); ${O}.step(240); })()`);
  await B.init(KEEP);
  await B.open(page(), 390, 844);
  r = await B.js(`({ mode: ${O}.mode, done: ${O}.progress.done, play: document.querySelector('#ui .btn.primary')?.textContent })`);
  check('progress survives a reload (menu, level 2 next)', r.mode === 'menu' && r.done.includes(0) && /2/.test(r.play), JSON.stringify(r));

  // 16. random fuzzing: taps, restarts, menus, carpet, sizes, languages
  await B.init(FRESH);
  await B.open(page(), 390, 844);
  r = await B.js(`(async () => {
    let s = 7; const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    let actions = 0;
    for (let k = 0; k < 2500; k++) {
      const g = ${O}.game; const x = rnd();
      if (${O}.mode === 'play' && g.state === 'play') {
        if (x < 0.5) g.launchFromQueue(Math.floor(rnd() * g.queues.length));
        else if (x < 0.75) g.launchFromDock(Math.floor(rnd() * g.dock.length));
        else if (x < 0.77) ${O}.startLevel(Math.floor(rnd() * 60));
        else if (x < 0.78) document.getElementById('restartBtn').click();
        else if (x < 0.79) document.getElementById('menuBtn').click();
        else if (x < 0.8) document.getElementById('soundBtn').click();
      } else {
        const btns = [...document.querySelectorAll('#ui .btn, #ui .tile:not(.locked), #ui .chip')];
        if (btns.length) pick(btns).click(); else ${O}.startLevel(Math.floor(rnd() * 60));
      }
      ${O}.step(1 + Math.floor(rnd() * 20), rnd() < 0.2);
      actions++;
      const R = ${O}.R;
      if (g.left < 0 || g.dock.length > 5 || R.particles.length > 1000 || R.tokens.size > 200) return { broken: true, k, left: g.left, p: R.particles.length, t: R.tokens.size };
    }
    return { actions, mode: ${O}.mode };
  })()`);
  check('fuzz: 2 500 random actions without breaking anything', !r.broken, JSON.stringify(r));

  // 17. the portal build
  const dist = path.join(repo, 'dist', 'oyu-crazygames');
  if (fs.existsSync(dist)) {
    const P = await serve(dist);
    await B.init(FRESH);
    await B.open(`${P.url}/?debug&muteAudio=true`, 1280, 720);
    r = await B.js(`(async () => { await new Promise((r) => setTimeout(r, 800)); const a = await import('./js/audio.js'); const env = window.CrazyGames && window.CrazyGames.SDK.environment; const bot = await import('./js/game.js'); void bot; ${O}.step(5); const beacons = performance.getEntriesByType('resource').filter((e) => e.initiatorType === 'beacon').length; document.getElementById('menuBtn').click(); ${O}.step(1); return { env, data: !!window.OYU_DATA, held: a.sound.held, beacons, logo: document.querySelector('.logo')?.textContent, sub: document.querySelector('.logo-sub')?.textContent, title: document.title, links: document.querySelectorAll('#ui a').length }; })()`);
    check('portal build: SDK, Data saves, portal mute, no counter, Latin logo, no links', r.env === 'local' && r.data && r.held && r.beacons === 0 && r.logo === 'Oyu' && r.sub === 'Pixel Carpet' && r.title === 'Oyu: Pixel Carpet' && r.links === 0, JSON.stringify(r));
    P.close();
  } else check('portal build', false, 'dist/oyu-crazygames is missing: run node oyu/tools/build-portal.mjs');

  check('no JavaScript errors in the whole run', !B.errors.length, B.errors.slice(0, 5).join(' | '));
} catch (e) {
  check('test run finished', false, e.message);
} finally {
  B.close();
  S.close();
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed} of ${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}
