// Checks the rules and the bots:  node xo/tools/test.mjs
// With --browser it also plays the real page in headless Chrome (menu, both modes, score, layout);
// --shots <folder> saves pictures of the main screens.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINES, result, finishers, perfect, botMove, other, free } from '../logic.js';

let failed = 0;
function check(name, ok, extra = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? '  ' + extra : ''}`);
}
const board = (s) => [...s].map((c) => (c === '.' ? null : c));

// ---------- rules ----------
check('eight lines', LINES.length === 8);
check('empty board goes on', result(board('.........')) === null);
check('row wins', result(board('xxx.oo...')).winner === 'x');
check('column wins', result(board('ox.o.xo..')).winner === 'o');
check('diagonal wins with its line', result(board('x.o.xo..x')).line.join('') === '048');
check('other diagonal wins', result(board('x.o.o.o.x')).winner === 'o');
check('full board without a line is a draw', result(board('xoxxoooxx')).winner === 'draw');
check('last cell can still win', result(board('xoxoxooxx')).winner === 'x');
check('finishers finds both ends of a fork', finishers(board('x.x...x..'), 'x').join('') === '134');
check('no finishers on an empty board', finishers(board('.........'), 'x').length === 0);

// ---------- the perfect bot ----------
// The human tries every move; the bot may answer with any of the moves it considers perfect.
// It must never lose, whoever starts.
function walk(b, turn, bot, seen) {
  const key = b.map((m) => m || '.').join('') + turn;
  if (seen.has(key)) return seen.get(key);
  const r = result(b);
  let out;
  if (r) out = { ends: 1, lost: r.winner === other(bot) ? 1 : 0, won: r.winner === bot ? 1 : 0 };
  else {
    out = { ends: 0, lost: 0, won: 0 };
    const moves = turn === bot ? perfect(b, bot).map((p) => p.i) : free(b);
    for (const i of moves) {
      b[i] = turn;
      const o = walk(b, other(turn), bot, seen);
      b[i] = null;
      out.ends += o.ends;
      out.lost += o.lost;
      out.won += o.won;
    }
  }
  seen.set(key, out);
  return out;
}
for (const first of ['x', 'o']) {
  const w = walk(board('.........'), first, 'o', new Map());
  check(`unbeatable bot never loses when ${first === 'o' ? 'it' : 'the player'} starts`, w.lost === 0 && w.ends > 0, `${w.ends} endings, ${w.won} bot wins`);
}
check('unbeatable bot takes a win at once', botMove(board('oo.xx....'), 'o', 'hard') === 2);
check('unbeatable bot blocks', botMove(board('xx..o....'), 'o', 'hard') === 2);
check('unbeatable bot answers a corner with the center', botMove(board('x........'), 'o', 'hard') === 4);
check('a full board gives no move', botMove(board('xoxxoooxx'), 'o', 'hard') === -1);
{
  const b = board('x...o....');
  const copy = b.join(',');
  botMove(b, 'o', 'hard');
  botMove(b, 'o', 'mid');
  botMove(b, 'o', 'easy');
  check('bots leave the board as it was', b.join(',') === copy);
}

// ---------- the weaker bots ----------
function randomPosition() {
  for (;;) {
    const b = board('.........');
    let turn = Math.random() < 0.5 ? 'x' : 'o';
    const n = Math.floor(Math.random() * 7);
    for (let k = 0; k < n && !result(b); k++) {
      const cells = free(b);
      b[cells[Math.floor(Math.random() * cells.length)]] = turn;
      turn = other(turn);
    }
    if (!result(b)) return b;
  }
}
{
  let legal = true;
  let midWins = true;
  let blocked = 0;
  let toBlock = 0;
  for (let k = 0; k < 20000; k++) {
    const b = randomPosition();
    for (const level of ['easy', 'mid', 'hard']) {
      const i = botMove(b, 'o', level);
      if (!(i >= 0 && i <= 8 && !b[i])) legal = false;
    }
    const win = finishers(b, 'o');
    const save = finishers(b, 'x');
    const i = botMove(b, 'o', 'mid');
    if (win.length && !win.includes(i)) midWins = false;
    if (!win.length && save.length) {
      toBlock++;
      if (save.includes(i)) blocked++;
    }
  }
  check('every bot always plays an empty cell', legal);
  check('medium bot never misses its own line', midWins);
  check('medium bot blocks a line about four times out of five', blocked / toBlock > 0.78 && blocked / toBlock < 0.9, `${Math.round((100 * blocked) / toBlock)}%`);
}

// ---------- how hard each level really is ----------
// Three stand-ins for people play as x; the bot moves first in every second round, as in the game.
const PLAYERS = {
  // taps anywhere
  random: (b) => free(b),
  // finishes a line, blocks a line, otherwise anywhere
  casual: (b) => {
    const win = finishers(b, 'x');
    const save = finishers(b, 'o');
    return win.length ? win : save.length ? save : free(b);
  },
  // never makes a mistake
  perfect: (b) => perfect(b, 'x').map((p) => p.i),
};
function series(player, level, rounds = 6000) {
  const t = { win: 0, draw: 0, lose: 0 };
  for (let k = 0; k < rounds; k++) {
    const b = board('.........');
    let turn = k % 2 ? 'o' : 'x';
    let r;
    while (!(r = result(b))) {
      if (turn === 'x') {
        const cells = PLAYERS[player](b);
        b[cells[Math.floor(Math.random() * cells.length)]] = 'x';
      } else b[botMove(b, 'o', level)] = 'o';
      turn = other(turn);
    }
    t[r.winner === 'x' ? 'win' : r.winner === 'draw' ? 'draw' : 'lose']++;
  }
  return { win: t.win / rounds, draw: t.draw / rounds, lose: t.lose / rounds };
}
const pct = (v) => String(Math.round(v * 100)).padStart(3) + '%';
const table = {};
for (const player of Object.keys(PLAYERS)) {
  for (const level of ['easy', 'mid', 'hard']) {
    const s = (table[player + ' ' + level] = series(player, level));
    console.log(`     ${player.padEnd(7)} player vs ${level.padEnd(4)}: wins ${pct(s.win)}, draws ${pct(s.draw)}, loses ${pct(s.lose)}`);
  }
}
check('easy: a random player wins about as often as loses', table['random easy'].win > 0.38 && table['random easy'].lose < 0.48);
check('easy: a casual player wins most rounds', table['casual easy'].win > 0.7 && table['casual easy'].lose < 0.1);
check('medium: a casual player wins a bit more often than loses', table['casual mid'].win > 0.27 && table['casual mid'].win < 0.42 && table['casual mid'].lose < table['casual mid'].win);
check('medium: a random player mostly loses', table['random mid'].lose > 0.7);
check('medium: a perfect player never loses', table['perfect mid'].lose === 0 && table['perfect mid'].win > 0.2);
check('unbeatable: nobody wins', table['random hard'].win === 0 && table['casual hard'].win === 0 && table['perfect hard'].win === 0);
check('unbeatable: two perfect players always draw', table['perfect hard'].draw === 1);
check('levels get stronger from easy to unbeatable', table['casual easy'].win > table['casual mid'].win && table['casual mid'].win > table['casual hard'].win);

// ---------- the page itself ----------
if (process.argv.includes('--browser')) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const shots = process.argv.indexOf('--shots');
  const { browserTests } = await import('./browser-test.mjs');
  await browserTests(path.resolve(here, '../..'), check, shots < 0 ? null : path.resolve(process.argv[shots + 1]));
}

console.log(failed ? `\n${failed} FAILED` : '\nall good');
process.exit(failed ? 1 : 0);
