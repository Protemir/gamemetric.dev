// The external check of 27.10, Aryk part, in the browser: AR-01 Space on a focused button, AR-04 the gift panel
// after a reload, AR-05 no tip left in the menu, AR-06 "1 day"; and a new player's first tasks (27.10).   node aryq/tools/keys-check.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';
const S = await serve(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const B = await chrome();
const A = 'window.__aryq';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
const check = (name, ok, info) => { if (!ok) bad++; console.log(ok ? 'OK  ' : 'FAIL', name, info !== undefined ? JSON.stringify(info) : ''); };
const key = async (k, code, kc) => {
  await B.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: kc, text: k === ' ' ? ' ' : undefined });
  await B.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: kc });
  await sleep(250);
};
const space = () => key(' ', 'Space', 32);
const paused = () => B.js(`!!document.querySelector('#ui .paused')`);
const play = async (lang) => {
  await B.open(`${S.url}/aryq/?debug&save&lang=${lang}`, 924, 520);
  await B.js(`[...document.querySelectorAll('button')].find((x) => x.className === 'btn').click()`);
  await sleep(600);
};
try {
  await B.init(`try { if (!sessionStorage.getItem('keep')) localStorage.clear(); localStorage.setItem('aryq.taught', '3'); } catch {}`);
  // AR-01 A: focus on the pause button, Space: the pause stays
  await play('ru');
  await B.js(`document.getElementById('pauseBtn').focus()`);
  await space();
  const a1 = await paused();
  // B: in the pause, focus on the sound button, Space: sound toggles, the pause stays
  const s0 = await B.js(`${A}.sound.on`);
  await B.js(`document.getElementById('soundBtn').focus()`);
  await space();
  const a2 = { paused: await paused(), sound: [s0, await B.js(`${A}.sound.on`)] };
  // Space with nothing focused still pauses and resumes
  await B.js(`document.activeElement && document.activeElement.blur()`);
  await space();
  const a3 = await paused();
  await space();
  const a4 = await paused();
  check('AR-01: Space on a focused button presses only that button; Space elsewhere toggles the pause', a1 && a2.paused && a2.sound[0] !== a2.sound[1] && !a3 && a4, { a1, a2, a3, a4 });
  // put the sound back
  await B.js(`document.getElementById('soundBtn').click()`);

  // AR-05: the game is paused here; a long tip as the game says it, then menu, then English
  await B.js(`${A}.say('Весна! Ледник тает… Цель года: 630', 9000)`);
  await sleep(300);
  const hintInPause = await B.js(`document.getElementById('hint').textContent`);
  await B.js(`[...document.querySelectorAll('#ui button')].find((b) => /Меню/.test(b.innerText)).click()`);
  await sleep(200);
  const inMenu = await B.js(`document.getElementById('hint').textContent`);
  await B.js(`[...document.querySelectorAll('#ui .langs button')].find((b) => b.innerText === 'EN').click()`);
  await sleep(300);
  const inEn = await B.js(`document.getElementById('hint').textContent`);
  check('AR-05: no game tip in the menu, none after switching language', /Цель года/.test(hintInPause) && inMenu === '' && inEn === '', { hintInPause, inMenu, inEn });

  // AR-06: a one-day streak in English says "1 day"
  const today = await B.js(`new Date().toISOString().slice(0, 10)`);
  await B.js(`localStorage.setItem('aryq.streak', JSON.stringify({ d: '${today}', n: 1 })); sessionStorage.setItem('keep', '1')`);
  await B.open(`${S.url}/aryq/?debug&lang=en`, 924, 520);
  await sleep(500);
  const menuEn = await B.js(`document.getElementById('ui').innerText`);
  const streakLine = (menuEn.match(/Streak[^\n]*/) || [''])[0];
  await B.js(`localStorage.setItem('aryq.streak', JSON.stringify({ d: '${today}', n: 3 }))`);
  await B.open(`${S.url}/aryq/?debug&lang=en`, 924, 520);
  await sleep(500);
  const three = ((await B.js(`document.getElementById('ui').innerText`)).match(/Streak[^\n]*/) || [''])[0];
  check('AR-06: "Streak: 1 day", and "3 days in a row" for three', streakLine === 'Streak: 1 day' && three === 'Streak: 3 days in a row', { streakLine, three });
  await B.js(`sessionStorage.removeItem('keep')`);

  // AR-04: the gift panel's year harvest is the same after a reload on it
  await play('ru');
  await B.js(`${A}.g.harvest = 300; ${A}.g.yearStart = 0; ${A}.g.objects.forEach((o) => (o.thirst = 0)); ${A}.g.day = 119.97`);
  await sleep(900);
  await B.js(`document.querySelector('#ui .choice').click()`);
  await sleep(300);
  await B.js(`${A}.g.harvest = 1000; ${A}.g.goalDone = 1; ${A}.g.objects.forEach((o) => (o.thirst = 0)); ${A}.g.day = 119.97`);
  await sleep(900);
  const before = ((await B.js(`document.getElementById('ui').innerText`)).match(/Урожай за год (\d+)/) || [])[1];
  await B.js(`sessionStorage.setItem('keep', '1')`);
  await B.js(`document.dispatchEvent(new Event('visibilitychange'))`);
  await sleep(300);
  await B.open(`${S.url}/aryq/?debug&save&lang=ru`, 924, 520);
  await sleep(500);
  await B.js(`document.querySelector('#ui .btn').click()`);
  await sleep(500);
  const after = ((await B.js(`document.getElementById('ui').innerText`)).match(/Урожай за год (\d+)/) || [])[1];
  check('AR-04: "harvest this year" on the gift panel is the same after a reload', before === after && +before > 600 && +before < 760, { before, after, ui: (await B.js(`document.getElementById('ui').innerText`)).slice(0, 160), save: await B.js(`(localStorage.getItem('aryq.save') || '').slice(0, 60)`) });
  await B.js(`sessionStorage.removeItem('keep')`);
  // a new player's first tasks: the first shows at once, is done when the first orchard drinks (the
  // canal digs itself after ~3 s) and gives +3 ketmen; one who knew the game sees none
  await B.init(`try { localStorage.clear(); } catch {}`);
  await B.open(`${S.url}/aryq/?debug&lang=en`, 924, 520);
  await B.js(`[...document.querySelectorAll('button')].find((x) => x.className === 'btn').click()`);
  await sleep(500);
  const q1 = await B.js(`document.getElementById('quest').hidden ? '' : document.getElementById('quest').textContent`);
  const dig0 = await B.js(`${A}.g.dig`);
  await sleep(5000);
  const q2 = await B.js(`JSON.stringify({ q: document.getElementById('quest').textContent, done: document.getElementById('quest').classList.contains('done'), dig: ${A}.g.dig, store: localStorage.getItem('aryq.quest') })`).then(JSON.parse);
  check('a new player sees task 1/5 at once; it is done when the first orchard drinks, +3 ketmen', /^1\/5 · Water an orchard/.test(q1) && q2.store === '1' && q2.done && q2.q.includes('Done! +3'), JSON.stringify({ q1, q2, dig0 }));
  await B.init(`try { localStorage.clear(); localStorage.setItem('aryq.taught', '3'); } catch {}`);
  await B.open(`${S.url}/aryq/?debug&lang=en`, 924, 520);
  await B.js(`[...document.querySelectorAll('button')].find((x) => x.className === 'btn').click()`);
  await sleep(800);
  check('a player who knew the game sees no tasks', await B.js(`document.getElementById('quest').hidden`));
  check('no page errors', B.errors.length === 0, B.errors.slice(0, 3));
} finally { B.close(); S.close(); }
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
