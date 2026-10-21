// Every detail of the 21.10 release for coming back and playing longer: the play counter events,
// "one more year" after a loss, the streak of the valley of the day, the game-over panel on all
// screens in both languages, the menu from pause, the portal start.
//   node aryq/tools/retention.mjs        (screenshots in dist/aryq-retention)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(repo, 'dist', 'aryq-retention');
fs.mkdirSync(out, { recursive: true });
const S = await serve(repo);
const B = await chrome();
const A = 'window.__aryq';
const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const page = (q = '') => `${S.url}/aryq/?debug&save&pulsetest${q}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const js = (code) => B.js(code);
const json = (code) => B.js(`JSON.stringify(${code})`).then(JSON.parse);
const clickText = (text) => js(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
const buttons = () => js(`[...document.querySelectorAll('#ui button')].map((b) => b.innerText.split(String.fromCharCode(10))[0]).join('|')`);
const panel = () => js(`document.getElementById('ui').innerText`);
// close every gate and let time run until an orchard dries up
const lose = async () => {
  const r = await js(`(() => { const { g } = ${A}; for (let k = 0; k < 80 && !g.over; k++) { for (let i = 0; i < g.W * g.H; i++) g.gate[i] = g.kind[i] === 2 ? 1 : 0; ${A}.step(3); } return !!g.over; })()`);
  await wait(300);
  return r;
};
const pulses = () => json(`window.__pulses`);
const day = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const streakInit = (d, n) => `try { localStorage.clear(); localStorage.setItem('aryq.streak', JSON.stringify({ d: '${d}', n: ${n} })); } catch {}`;
const EVENTS = ['open', 'start', 'year', 'over', 'more', 'leave', 'daily']; // as in stats/worker.js

try {
  // ---------- the play counter ----------
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(page('&lang=ru&seed=2001'), 924, 520);
  await wait(300);
  let p = await pulses();
  check('counter: a first visit says "open new"', p.length === 1 && p[0][0] === 'open' && p[0][1] === 'new', JSON.stringify(p));
  await clickText('Играть');
  await wait(300);
  p = await pulses();
  check('counter: Play says "start mountain"', p.some(([e, a]) => e === 'start' && a === 'mountain'), JSON.stringify(p.slice(1)));
  await js(`${A}.g.day = 119.97`);
  await wait(800);
  p = await pulses();
  check('counter: the end of a year says "year mountain:y1"', p.some(([e, a]) => e === 'year' && a === 'mountain:y1'), JSON.stringify(p.slice(-1)));
  await js(`document.querySelector('#ui .choice').click()`);
  await wait(200);
  await lose();
  p = await pulses();
  const over = p.find(([e]) => e === 'over');
  check('counter: a loss says "over mountain:y2:m<minute>"', over && /^mountain:y2:m\d+$/.test(over[1]), JSON.stringify(over));
  await clickText('Ещё год');
  await wait(300);
  p = await pulses();
  check('counter: one more year says "more y2"', p.some(([e, a]) => e === 'more' && a === 'y2'), JSON.stringify(p.slice(-1)));
  await js(`Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide'))`);
  await wait(100);
  p = await pulses();
  const leaves = p.filter(([e]) => e === 'leave');
  // ... with how far into the valley: canals, watered, thirsty, a dashed path, when the first water came
  check('counter: going away says "leave play:y2:m<minute>:c..w..t.." once', leaves.length === 1 && /^play:y2:m\d+:c\dw\dt\dg?(:f\d)?$/.test(leaves[0][1]), JSON.stringify(leaves));
  check('counter: every event is one the server takes, every argument fits it', p.every(([e, a]) => EVENTS.includes(e) && /^[\w.:-]{0,24}$/.test(a)), JSON.stringify(p));
  // the real sender is off under ?debug and in automated browsers: nothing goes out from tests
  await B.init(`try { localStorage.clear(); } catch {} window.__beacons = 0; navigator.sendBeacon = () => (window.__beacons++, true);`);
  await B.open(`${S.url}/aryq/?debug&lang=ru`, 924, 520);
  await wait(300);
  check('counter: tests and ?debug send nothing', (await js('window.__beacons')) === 0);
  // on the leave screen the place is named right: the menu, the gift panel, the loss
  for (const [name, setup, want] of [
    ['menu', '', /^menu:y0:m\d+$/],
    ['gift', `[...document.querySelectorAll('button')].find((x) => x.innerText.includes('Играть')).click(); ${A}.g.day = 119.97;`, /^gift:y2:m\d+:c\dw\dt\dg?:f\d$/],
    ['over', `[...document.querySelectorAll('button')].find((x) => x.innerText.includes('Играть')).click();`, /^over:y1:m\d+:c\dw\dt\dg?:f\d$/],
    ['pause', `[...document.querySelectorAll('button')].find((x) => x.innerText.includes('Играть')).click(); setTimeout(() => document.getElementById('pauseBtn').click(), 300);`, /^pause:y1:m\d+:c\dw\dt\dg?:f\d$/],
    ['play', `[...document.querySelectorAll('button')].find((x) => x.innerText.includes('Играть')).click();`, /^play:y1:m\d+:c\dw\dt\dg?:f\d$/],
  ]) {
    await B.init('try { localStorage.clear(); } catch {}');
    await B.open(page('&lang=ru&seed=2002'), 924, 520);
    await wait(300);
    if (setup) await js(setup);
    await wait(800);
    if (name === 'over') await lose();
    await js(`Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))`);
    p = await pulses();
    const l = p.find(([e]) => e === 'leave');
    check(`counter: leaving on the ${name} screen is told as such`, l && want.test(l[1]), JSON.stringify(l));
  }

  // the first orchard watered soon after the start is told in the leave as f1/f2 (21.10)
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(page('&lang=ru&seed=2002'), 924, 520);
  await wait(300);
  await js(`[...document.querySelectorAll('button')].find((x) => x.innerText.includes('Играть')).click()`);
  await wait(400);
  await js(`(() => { const { g, S, state } = ${A}; const gh = state.ghost; S.startStroke(g, gh.from); for (const c of gh.cells) S.extend(g, c); S.endStroke(g); ${A}.step(0.3); })()`);
  await wait(900);
  await js(`Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))`);
  p = await pulses();
  {
    const l = p.find(([e]) => e === 'leave');
    check('counter: the leave tells the first water came within seconds (f1/f2)', l && /:c1w1t\dg?:f[12]$/.test(l[1]), JSON.stringify(l));
  }

  // ---------- one more year ----------
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(page('&lang=ru&seed=2003'), 924, 520);
  await clickText('Играть');
  await wait(300);
  await lose();
  let b = await buttons();
  check('one more year: the loss panel offers it first', b.startsWith('Ещё год'), b);
  await clickText('Ещё год');
  await wait(300);
  let r = await json(`{ over: !!${A}.g.over, paused: document.getElementById('pauseBtn').textContent, revived: ${A}.g.revived, playing: !document.getElementById('hud').hidden }`);
  check('one more year: the game runs on at once', !r.over && r.playing && r.paused === '❚❚' && r.revived === 1, JSON.stringify(r));
  const day0 = await js(`${A}.g.day`);
  await wait(700);
  check('one more year: time goes on', (await js(`${A}.g.day`)) > day0);
  r = await js(`document.querySelector('.hint-line').textContent`);
  check('one more year: the hint says what happened', /живёт дальше/.test(r), r);
  // it is kept in the save: a reload does not give a second one
  await js(`document.dispatchEvent(new Event('visibilitychange'))`);
  r = await json(`JSON.parse(localStorage.getItem('aryq.save')).revived`);
  check('one more year: the save remembers it was used', r === 1, String(r));
  await B.init('');
  await js('location.reload()').catch(() => {});
  await wait(900);
  await clickText('Продолжить');
  await wait(300);
  check('one more year: a continued game still knows it was used', (await js(`${A}.g.revived`)) === 1);
  await lose();
  b = await buttons();
  check('one more year: never a second time in the same game', !b.includes('Ещё год') && b.startsWith('Ещё раз'), b);
  await clickText('Ещё раз');
  await wait(300);
  await lose();
  b = await buttons();
  check('one more year: a new game has it again', b.startsWith('Ещё год'), b);
  r = await js(`(() => { const { g, S } = ${A}; const k = S.load(S.save(g)); return [k.revived, S.canRevive(k)].join(); })()`);
  check('one more year: save and load keep the count', r === '0,false' || r === '0,true', r);

  // ---------- the streak of the valley of the day ----------
  const dailyStart = async (init, lang = 'ru') => {
    await B.init(init);
    await B.open(page(`&lang=${lang}&seed=2004`), 924, 520);
    await wait(200);
    const menu = await panel();
    await js(`[...document.querySelectorAll('#ui .choice')][3].click()`);
    await wait(900);
    return { menu, ...(await json(`{ s: JSON.parse(localStorage.getItem('aryq.streak')), hint: document.querySelector('.hint-line').textContent, dig: ${A}.g.dig, mode: ${A}.g.mode }`)) };
  };
  // the ketmen a new valley of the day starts with, without a streak
  r = await dailyStart('try { localStorage.clear(); } catch {}');
  const baseDig = r.dig;
  check('streak: none yet — the menu shows the date, the first day gives nothing extra', /одна на всех/.test(r.menu) && !/Серия/.test(r.menu) && r.s.n === 1 && r.s.d === day(0) && !/Серия/.test(r.hint), JSON.stringify({ s: r.s, hint: r.hint }));
  await lose();
  let t = await panel();
  check('streak: after a daily game the loss promises tomorrow: 2 days, +5', /Завтра будет новая долина дня.*серия 2 дн\., \+5/s.test(t) && !(await buttons()).includes('Долина дня'), t.split('\n').slice(-3).join(' / '));
  r = await dailyStart(streakInit(day(-1), 2));
  check('streak: yesterday 2 → today 3, +10 ketmen', /Серия: 2 дн\./.test(r.menu) && r.s.n === 3 && r.dig === baseDig + 10 && /Серия 3 дн\. подряд: \+10/.test(r.hint), JSON.stringify({ s: r.s, dig: r.dig, base: baseDig, hint: r.hint }));
  p = await pulses();
  check('streak: the counter hears "daily n3"', p.some(([e, a]) => e === 'daily' && a === 'n3'), JSON.stringify(p));
  r = await dailyStart(streakInit(day(0), 3));
  check('streak: a second daily game the same day keeps 3 and its +10', r.s.n === 3 && r.dig === baseDig + 10, JSON.stringify({ s: r.s, dig: r.dig }));
  r = await dailyStart(streakInit(day(-3), 5));
  check('streak: a missed day starts again from 1 (menu shows the date, no bonus)', !/Серия/.test(r.menu) && r.s.n === 1 && r.dig === baseDig, JSON.stringify({ s: r.s, dig: r.dig }));
  r = await dailyStart(streakInit(day(-1), 9));
  check('streak: the bonus stops at +20', r.s.n === 10 && r.dig === baseDig + 20, JSON.stringify({ s: r.s, dig: r.dig }));
  r = await dailyStart(`try { localStorage.clear(); localStorage.setItem('aryq.streak', '"broken"'); } catch {}`);
  check('streak: a broken stored value is taken as no streak', r.s.n === 1 && r.dig === baseDig, JSON.stringify(r.s));
  // a game in another valley: the loss panel points at the valley of the day, and the button starts it
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(page('&lang=ru&seed=2005'), 924, 520);
  await clickText('Играть');
  await wait(300);
  await lose();
  t = await panel();
  check('streak: a loss elsewhere invites to the valley of the day', /Сыграй долину дня/.test(t) && (await buttons()).includes('Долина дня'), t.split('\n').slice(-3).join(' / '));
  await clickText('Долина дня');
  await wait(400);
  r = await json(`{ mode: ${A}.g.mode, s: JSON.parse(localStorage.getItem('aryq.streak')), over: !!${A}.g.over }`);
  check('streak: the button starts the valley of the day and the streak', r.mode === 'daily' && r.s.n === 1 && !r.over, JSON.stringify(r));
  // the same in English
  r = await dailyStart(streakInit(day(-1), 1), 'en');
  check('streak in English', /Valley of the day/.test(r.menu) && /2 days in a row: \+5/.test(r.hint), r.hint);
  await lose();
  t = await panel();
  check('the loss panel in English', /One more year/.test(t) && /Try again/.test(t) && /Come back for a 3-day streak and \+10/.test(t) && !/[А-Яа-я]/.test(t), t.replace(/\n/g, ' / '));

  // ---------- the loss panel fits every screen ----------
  for (const lang of ['ru', 'en']) {
    for (const [w, h] of [[924, 520], [1280, 720], [320, 568], [360, 640], [390, 844], [844, 390], [568, 320]]) {
      await B.init('try { localStorage.clear(); } catch {}');
      await B.open(page(`&lang=${lang}&seed=2006`), w, h);
      await js(`[...document.querySelectorAll('#ui .btn')][0].click()`);
      await wait(300);
      await lose();
      r = await json(`(() => { const ui = document.getElementById('ui'); const bs = [...ui.querySelectorAll('button')].map((b) => b.getBoundingClientRect()); const p = ui.querySelector('.panel').getBoundingClientRect();
        return { n: bs.length, top: Math.round(p.top), bottom: Math.round(p.bottom), left: Math.round(p.left), right: Math.round(p.right), vw: innerWidth, vh: innerHeight, scroll: ui.scrollHeight > ui.clientHeight + 1, narrow: Math.min(...bs.map((b) => b.width)) }; })()`);
      await B.shot(path.join(out, `over-${lang}-${w}x${h}.png`));
      const fits = r.top >= 0 && r.bottom <= r.vh && r.left >= 0 && r.right <= r.vw;
      // where it does not fit, the panel must scroll so that every button can be reached
      let reach = fits;
      if (!fits && r.scroll) {
        reach = await js(`(() => { const ui = document.getElementById('ui'); ui.scrollTop = ui.scrollHeight; const b = [...ui.querySelectorAll('button')].pop().getBoundingClientRect(); return b.bottom <= innerHeight && b.top >= 0; })()`);
      }
      check(`the loss panel ${lang} ${w}x${h}: all ${r.n} buttons can be reached`, r.n === 4 && reach && r.narrow > 100, JSON.stringify(r));
    }
  }

  // ---------- the menu from pause (on the site too) ----------
  await B.init('try { localStorage.clear(); } catch {}');
  await B.open(page('&lang=ru&seed=2007'), 924, 520);
  await clickText('Играть');
  await wait(300);
  await js(`${A}.g.day = 40`);
  await js(`document.getElementById('pauseBtn').click()`);
  b = await buttons();
  check('pause: resume, how to play, menu', b === 'Продолжить|Как играть|Меню', b);
  await clickText('Меню');
  await wait(500);
  r = await json(`{ day: ${A}.g.day, menu: document.getElementById('ui').innerText.includes('Продолжить'), year: document.getElementById('ui').innerText.includes('год 1') }`);
  await wait(500);
  check('pause → menu: the valley waits, the menu offers to continue it', r.menu && (await js(`${A}.g.day`)) === r.day, JSON.stringify(r));
  await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))`);
  await wait(200);
  check('pause → menu: the space bar does not start the hidden valley', (await js(`document.getElementById('hud').hidden`)) && (await js(`${A}.g.day`)) === r.day);
  await clickText('Продолжить');
  await wait(400);
  r = await json(`{ day: ${A}.g.day, hud: !document.getElementById('hud').hidden, pause: document.getElementById('pauseBtn').textContent }`);
  check('pause → menu → continue: the same valley at the same day, running', r.hud && Math.abs(r.day - 40) < 1 && r.pause === '❚❚', JSON.stringify(r));

  // a valley lost while the pause panel is up (only a debug time jump can do that) still shows the loss
  await js(`document.getElementById('pauseBtn').click()`);
  await lose();
  b = await buttons();
  check('a lost valley is never hidden behind the pause panel', b.startsWith('Ещё год'), b);

  // ---------- the portal start, with the counter ----------
  await B.init(`try { localStorage.clear(); } catch {} window.ARYQ_PORTAL = 'crazygames';`);
  await B.open(page('&lang=ru&seed=2008'), 924, 520);
  await wait(600);
  p = await pulses();
  check('portal: a new player is counted "open new", "start wide"', p[0] && p[0].join() === 'open,new' && p.some((x) => x.join() === 'start,wide'), JSON.stringify(p));
  await js(`document.dispatchEvent(new Event('visibilitychange'))`);
  await B.init(`window.ARYQ_PORTAL = 'crazygames';`);
  await js('location.reload()').catch(() => {});
  await wait(900);
  p = await pulses();
  check('portal: back again is "open back", "start wide:resume"', p[0] && p[0].join() === 'open,back' && p.some((x) => x.join() === 'start,wide:resume'), JSON.stringify(p));
  await lose();
  b = await buttons();
  check('portal: the loss panel there has one more year too', b.startsWith('Ещё год'), b);
  await B.init('');

  check('no errors in the page', B.errors.length === 0, B.errors.slice(0, 3).join(' | '));
} catch (e) {
  check('test ran to the end', false, e.stack || e.message);
} finally {
  B.close();
  S.close();
}
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed; screenshots in dist/aryq-retention`);
process.exit(failed ? 1 : 0);
