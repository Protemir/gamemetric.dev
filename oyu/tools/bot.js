// Plays levels by itself, for tuning: open /oyu/?debug and run
//   const bot = await import('./tools/bot.js'); bot.run({ from: 0, to: 59, policy: 'smart' })
// 'smart' sends a shooter whose color is exposed right now (what a careful player does),
// 'random' taps whatever is in front. A good level: smart wins, random loses now and then.
import { lap } from '../js/game.js';

function candidates(g) {
  const list = [];
  g.queues.forEach((q, i) => q.length && list.push({ type: 'queue', i, sh: q[0] }));
  g.dock.forEach((sh, i) => sh && list.push({ type: 'dock', i, sh }));
  return list;
}

// the picture as it will be after the shooters already on the belt finish their laps
function ahead(g) {
  const grid = Int8Array.from(g.grid);
  for (const sh of [...g.belt, ...g.pending]) lap(grid, g.W, g.H, g.lanes, sh.color, sh.ammo);
  return grid;
}

function score(g, c, grid) {
  // shots it would land on one lap, counting what the belt will take first
  const hits = lap(Int8Array.from(grid), g.W, g.H, g.lanes, c.sh.color, c.sh.ammo).length;
  return { hits, full: hits >= c.sh.ammo };
}

export function act(g, policy, rnd) {
  if (!g.canLaunch()) return;
  const list = candidates(g);
  if (!list.length) return;
  let pick;
  if (policy === 'random') pick = list[Math.floor(rnd() * list.length)];
  else {
    const grid = ahead(g);
    const scored = list.map((c) => ({ c, ...score(g, c, grid) }));
    const full = scored.filter((s) => s.full).sort((a, b) => b.hits - a.hits);
    const freeSlots = g.dock.filter((d) => !d).length;
    if (full.length) pick = full[0].c;
    else if (g.belt.length + g.pending.length === 0) {
      // nothing is moving: send the best partial one, or the dock fills up for nothing
      scored.sort((a, b) => b.hits - a.hits);
      // the best partial one; with nothing better a docked shooter goes round again (it gets its slot back)
      if (scored[0].hits > 0 || freeSlots > 1) pick = scored[0].c;
      else pick = (scored.find((x) => x.c.type === 'dock') || scored[0]).c;
    }
  }
  if (!pick) return;
  if (pick.type === 'queue') g.launchFromQueue(pick.i);
  else g.launchFromDock(pick.i);
}

// plays the level that is open now until it is won or lost; returns seconds of game time
export function play(O, policy = 'smart', rnd = Math.random, limit = 900) {
  const g = O.game;
  let time = 0;
  while (g.state === 'play' && time < limit) {
    act(g, policy, rnd);
    O.step(6, false);
    time += 0.1;
  }
  return time;
}

export async function run({ from = 0, to = 59, policy = 'smart', seed = 1, log = true } = {}) {
  const O = window.__oyu;
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out = [];
  for (let i = from; i <= to; i++) {
    O.startLevel(i);
    const g = O.game;
    let time = 0;
    let maxDock = 0;
    while (g.state === 'play' && time < 900) {
      act(g, policy, rnd);
      O.step(6, false);
      time += 0.1;
      maxDock = Math.max(maxDock, g.dock.filter(Boolean).length);
    }
    const row = { level: i + 1, name: g.level.name.en, size: g.W, colors: g.level.palette.length, queues: g.queues.length, shooters: g.level.shooters, pixels: g.total, result: g.state, time: Math.round(time), launched: g.launched, maxDock };
    out.push(row);
    if (log) console.log(JSON.stringify(row));
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}
