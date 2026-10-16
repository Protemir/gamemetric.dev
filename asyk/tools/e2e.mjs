// Plays Асық in headless Chrome: a story duel and a free-play kon, on a computer screen and a phone,
// and fails on any page error.   node asyk/tools/e2e.mjs [--dir dist/asyk-crazygames]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dirArg = process.argv.indexOf('--dir');
const dir = dirArg > 0 ? process.argv[dirArg + 1] : 'asyk';
const S = await serve(repo);
const B = await chrome();
await B.init('try { localStorage.clear(); } catch {}');
let fails = 0;
const ok = (c, m) => {
  console.log((c ? 'ok   ' : 'FAIL ') + m);
  if (!c) fails++;
};

// pull down and let go, a little to the side at random
const PLAY = `(async (maxMs) => {
  const A = window.__asyk;
  const cv = document.getElementById('game');
  const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, pointerId: 2, bubbles: true, isPrimary: true }));
  const t0 = performance.now();
  let throws = 0;
  while (performance.now() - t0 < maxMs) {
    if (A.state === 'aim') {
      const w = innerWidth, h = innerHeight, dx = (Math.random() - 0.5) * w * 0.15;
      ev('pointerdown', w / 2, h * 0.35);
      for (let k = 1; k <= 5; k++) ev('pointermove', w / 2 + (dx * k) / 5, h * 0.35 + k * h * 0.045);
      ev('pointerup', w / 2 + dx, h * 0.58);
      throws++;
    }
    if (A.state === 'talk') A.talkNext();
    if (A.state === 'over') break;
    await new Promise((r) => setTimeout(r, 120));
  }
  return { state: A.state, throws, me: A.g.score, aga: A.g.duel ? A.g.duel.score : null, result: A.g.result };
})`;

for (const [label, w, h] of [
  ['computer 1280x720', 1280, 720],
  ['phone 390x844', 390, 844],
]) {
  await B.open(`${S.url}/${dir}/?lang=en&nopulse`, w, h);
  await B.js(`new Promise((r) => { const t = setInterval(() => { if (window.__asyk && window.__asyk.state !== 'load') { clearInterval(t); r(); } }, 100); })`);
  ok(await B.js('window.__asyk.state === "talk"'), `${label}: a first visit starts in the yard with a dialogue`);
  // the duel with Erlan
  await B.js('window.__asyk.playStory(0, 2), true');
  await B.js('new Promise((r) => setTimeout(r, 800))');
  const duel = await B.js(`${PLAY}(90000)`);
  ok(duel.state === 'over' && (duel.result === 'win' || duel.result === 'lose'), `${label}: duel played out (${duel.throws} throws, ${duel.me} : ${duel.aga}, ${duel.result})`);
  // a free-play kon in winter conditions is the same code; play the ice chapter's first kon
  await B.js('window.__asyk.playStory(2, 0), true');
  await B.js('new Promise((r) => setTimeout(r, 800))');
  const ice = await B.js(`${PLAY}(90000)`);
  ok(ice.state === 'over', `${label}: ice kon played out (${ice.throws} throws, ${ice.me} points, ${ice.result})`);
  ok(B.errors.length === 0, `${label}: no page errors ${B.errors.slice(0, 3).join(' | ')}`);
  B.errors.length = 0;
}
B.close();
S.close();
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
