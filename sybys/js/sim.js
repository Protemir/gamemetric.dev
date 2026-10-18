// «Сыбыс» — the whole game without drawing, so tools/check.mjs can play it in Node.
//
// Every pasture has the khan's trust t (0..1, the colour on the map) and two kinds of talk:
// m — the khan's word, n — a lie. Talk flows along the roads like water in «Арык»,
// people retell it where they are willing to hear it and it dies where they are not.
// The word lifts trust, a lie eats it. Somebody hidden sends riders with forged khan's orders;
// the player sends riders with the word, Aria to look into things, Karasai to take by force.
// Two seasons: spring–summer ends with a small council, autumn–winter with the great kurultai,
// where each tribe's bi raises his whip, or does not. In autumn three more people join:
// Zaltyr the scout (marks strange riders, not always rightly), Sarman the merchant (caravans bring
// horses), Orazbai the elder (the kurultai listens to him).
import { makeMap, route, GW } from './map.js';
import { rng, clamp } from './util.js';

export const SEASON = 330; // seconds of map time at ×1 (plus the scenes, about 7 minutes)
export const HORSE_MAX = 5;
export const HORSE_EVERY = 6;
export const COST = { word: 1, aria: 1, karasai: 2, zaltyr: 1 };
export const ZALTYR_STAY = 30;
export const KARASAI_CD = 25;
export const ARIA_STAY = 12;
export const VOTE_AT = 0.55;
export const SEASONS = {
  1: [['horse', 20], ['well', 85], ['caravan', 165], ['letter', 245]],
  2: [['army', 30], ['drought', 100], ['plot', 180], ['truth', 250]],
};
export const EVENTS = SEASONS[1];
// what each clue really is: true ones point at the plot, false ones at innocent people
// the knobs tools/check.mjs is tuned with
export const TUNE = {
  flow: 0.42, // share of talk that rides on to the neighbours per second
  wordGrow: 0.5, wordAt: 0.45, wordFade: 0.3, // retelling of the word: grows above wordAt, fades below
  lieGrow: 0.6, lieAt: 0.5, lieFade: 0.3,
  wordGain: 0.38, lieBite: 0.42,
  pride: 0.42, prideRate: 0.028, follow: 0.015, settle: 0.02, // a tribe left alone drifts back to its own pride, not to the khan
  word: 1.15, lie: 1.35,
};
export const CLUES = { forged: true, stones: true, lair: true, scouts: true, letter: true, zaltyr: true, informant: false, arrest: false, zaltyrFalse: false };

// who is really behind the forged orders: a different one each campaign; true clues hint at him
export const SUSPECTS = ['karasai', 'sarman', 'zaltyr', 'orazbai'];
// the steppe of the day comes with one condition
export const MODS = ['drought', 'wind', 'bold', 'calm'];

export function newGame(seed = 1, opts = {}) {
  const map = makeMap(seed);
  const rand = rng(seed * 7 + 3);
  const R = map.regions.length;
  const tribes = [0, 1, 2].map(() => ({ mood: 0.38 + rand() * 0.07, fear: 0, grievance: 0, talks: false, nextMsg: 5 + rand() * 8 }));
  const t = new Float32Array(R), m = new Float32Array(R), n = new Float32Array(R);
  for (const r of map.regions) t[r.id] = r.tribe < 0 ? 1 : clamp(tribes[r.tribe].mood + (rand() - 0.5) * 0.14, 0, 1);
  // the plotters hide in a pasture far from the Orda
  const far = map.regions.filter((r) => r.tribe >= 0).sort((a, b) => route(map, 0, b.id).time - route(map, 0, a.id).time);
  const lair = far[Math.floor(rand() * 6)].id;
  const culprit = SUSPECTS[Math.floor(rand() * SUSPECTS.length)];
  const mod = opts.mod || null;
  const g = {
    seed, rand, map, R, tribes, t, m, n,
    time: 0, // everything that moves
    clock: 0, // the season: stands still while the advisors teach (g.hold)
    hold: false,
    horses: 3, horseT: 0,
    karasai: 0, karasaiCD: 0,
    aria: { trust: 0.6, at: -1, busy: 0, riding: false, distrust: 0 },
    riders: [], uid: 1,
    clues: [], log: [], fx: [], toasts: [],
    pending: [],
    evIdx: 0, event: null,
    phase: 'map',
    season: 1,
    plotT: 26, plotEvery: 23,
    lair, lairKnown: false, lairShown: lair,
    zaltyr: { at: -1, busy: 0, trust: true },
    orazbai: 0.5,
    karasaiAngry: false,
    caravan: null,
    drought: null,
    council: null,
    marks: new Set(), found: new Set(),
    flags: {},
    acted: 0, caught: 0, wrongCatch: 0,
    result: null,
    culprit, mod, daily: !!opts.daily,
    forceRides: 0,
  };
  // the day's condition
  if (mod === 'drought') {
    const k = Math.floor(rand() * 3);
    g.drought = { tribe: k, until: 150 };
  }
  if (mod === 'bold') { g.plotEvery *= 0.8; g.plotT = 16; }
  if (mod === 'calm') g.horses = HORSE_MAX;
  return g;
}

const tribeAvg = (g, k) => {
  let s = 0, c = 0;
  for (const r of g.map.regions) if (r.tribe === k) { s += g.t[r.id]; c++; }
  return c ? s / c : 0;
};
export const tribeTrust = tribeAvg;
export function unity(g) {
  let s = 0, c = 0;
  for (const r of g.map.regions) if (r.tribe >= 0) { s += g.t[r.id]; c++; }
  return s / c;
}

// how willing a pasture is to retell the khan's word (the rest of the time it retells lies)
export function receptivity(g, i) {
  const r = g.map.regions[i];
  if (r.tribe < 0) return 1;
  const tr = g.tribes[r.tribe];
  const dry = g.drought && g.drought.tribe === r.tribe && g.clock < g.drought.until ? 0.15 : 0;
  return clamp(0.2 + 0.75 * tr.mood - 0.45 * tr.fear + (g.t[i] - 0.5) * 0.45 - dry, 0.05, 1);
}

function addClue(g, kind, region = -1) {
  // a second forged order says little new: two count at most
  if (kind === 'forged' && g.clues.filter((c) => c.kind === 'forged').length >= 2) return false;
  if (kind !== 'forged' && g.clues.some((c) => c.kind === kind)) return false;
  g.clues.push({ kind, region, at: g.time, hint: CLUES[kind] ? g.clues.filter((c) => CLUES[c.kind]).length : -1 });
  g.fx.push({ type: 'clue', region, kind });
  return true;
}
export const trueClues = (g) => g.clues.filter((c) => CLUES[c.kind]).length;
export const falseClues = (g) => g.clues.filter((c) => !CLUES[c.kind]).length;

function toast(g, who, key, region = -1, args = {}) {
  g.toasts.push({ who, key, region, args, at: g.time });
  g.log.push({ key, at: g.time, args });
}

function later(g, delay, kind, args = {}) {
  g.pending.push({ at: g.time + delay, kind, args });
}

function spawnRider(g, kind, from, to, extra = {}) {
  const rt = route(g.map, from, to);
  if (!rt) return null;
  const speed = kind === 'karasai' ? 1.5 : kind === 'aria' ? 0.85 : kind === 'false' ? 1.05 : kind === 'zaltyr' ? 1.3 : kind === 'caravan' ? 0.55 : 1;
  const rider = { id: g.uid++, kind, from, to, path: rt.path, seg: 0, p: 0, speed, ...extra };
  if (rt.path.length === 1) rider.seg = 0;
  g.riders.push(rider);
  return rider;
}

// where the khan's word starts from: the loyal pasture nearest to the target (or the Orda)
export function sourceFor(g, target) {
  let best = 0, bt = route(g.map, 0, target)?.time ?? Infinity;
  for (const r of g.map.regions) {
    if (r.tribe < 0 || g.t[r.id] < 0.62 || r.id === target) continue;
    const rt = route(g.map, r.id, target);
    if (rt && rt.time < bt) { bt = rt.time; best = r.id; }
  }
  return best;
}

export function canAct(g, kind) {
  if (g.phase !== 'map') return false;
  if (g.horses < COST[kind]) return false;
  if (kind === 'karasai' && g.karasaiCD > 0) return false;
  if (kind === 'aria' && (g.aria.busy > 0 || g.aria.riding || g.aria.trust < 0.3)) return false;
  if (kind === 'zaltyr' && (g.season < 2 || g.flags.noScout || g.zaltyr.busy > 0 || g.zaltyr.riding)) return false;
  return true;
}

export function act(g, kind, target) {
  if (!canAct(g, kind)) return null;
  const r = g.map.regions[target];
  if (!r || r.tribe < 0) return null;
  let rider;
  if (kind === 'word') rider = spawnRider(g, 'word', sourceFor(g, target), target);
  else if (kind === 'karasai') { rider = spawnRider(g, 'karasai', 0, target); g.karasaiCD = KARASAI_CD; g.forceRides++; }
  else if (kind === 'aria') { rider = spawnRider(g, 'aria', g.aria.at >= 0 ? g.aria.at : 0, target); g.aria.riding = true; g.aria.at = -1; }
  else if (kind === 'zaltyr') { rider = spawnRider(g, 'zaltyr', 0, target); g.zaltyr.riding = true; }
  if (!rider) return null;
  g.horses -= COST[kind];
  g.acted++;
  return rider;
}

// tapping a rider on the road: a forger is caught with his false order, a tribe's messenger is insulted
export function intercept(g, id) {
  const k = g.riders.findIndex((x) => x.id === id);
  if (k < 0) return null;
  const rider = g.riders[k];
  if (rider.kind === 'false') {
    g.riders.splice(k, 1);
    g.caught++;
    addClue(g, 'forged', riderRegion(g, rider));
    g.fx.push({ type: 'caught', region: riderRegion(g, rider) });
    return 'caught';
  }
  if (rider.kind === 'tribe') {
    g.riders.splice(k, 1);
    g.wrongCatch++;
    if (rider.seen) g.zaltyr.trust = false; // you believed Zaltyr's mark and it was wrong
    const tr = g.tribes[rider.tribe];
    tr.mood = clamp(tr.mood - 0.08, 0, 1);
    toast(g, rider.tribe, 'tInsulted', riderRegion(g, rider), { tribe: rider.tribe });
    return 'insult';
  }
  return null;
}

export function riderRegion(g, rider) {
  return rider.path[Math.min(rider.path.length - 1, rider.seg + (rider.p > 0.5 ? 1 : 0))];
}

// position of a rider in map cells
export function riderPos(g, rider) {
  const P = rider.path, a = g.map.regions[P[rider.seg]], b = g.map.regions[P[Math.min(P.length - 1, rider.seg + 1)]];
  return { x: a.x + (b.x - a.x) * rider.p, y: a.y + (b.y - a.y) * rider.p, dx: b.x - a.x, dy: b.y - a.y };
}

function arrive(g, rider) {
  const i = rider.to, r = g.map.regions[i];
  if (rider.kind === 'word') {
    g.m[i] = Math.min(2, g.m[i] + TUNE.word);
    g.fx.push({ type: 'word', region: i });
  } else if (rider.kind === 'karasai') {
    const tr = g.tribes[r.tribe];
    g.t[i] = Math.max(g.t[i], 0.88);
    for (const e of r.nb) if (g.map.regions[e.to].tribe === r.tribe) g.t[e.to] = Math.min(1, g.t[e.to] + 0.12);
    tr.fear = clamp(tr.fear + 0.3, 0, 1);
    g.karasai++;
    g.fx.push({ type: 'force', region: i });
    if (tr.fear > 0.55 && !tr.talks) {
      tr.talks = true;
      tr.mood = clamp(tr.mood - 0.12, 0, 1);
      g.plotEvery *= 0.88;
      toast(g, r.tribe, 'tFear', i, { tribe: r.tribe });
    }
    if (g.karasai === 3) toast(g, 'karasai', 'tKarasaiProud', 0);
  } else if (rider.kind === 'aria') {
    g.aria.riding = false;
    g.aria.at = i;
    g.aria.busy = ARIA_STAY;
    g.fx.push({ type: 'aria', region: i });
  } else if (rider.kind === 'tribe') {
    if (rider.load > 0) g.m[i] = Math.min(2, g.m[i] + rider.load);
    else if (rider.load < 0) g.n[i] = Math.min(2, g.n[i] - rider.load);
  } else if (rider.kind === 'zaltyr') {
    g.zaltyr.riding = false;
    g.zaltyr.at = i;
    g.zaltyr.busy = ZALTYR_STAY;
    g.fx.push({ type: 'aria', region: i });
  } else if (rider.kind === 'caravan') {
    // Sarman's caravan pays in horses, unless he has taken his privileges
    if (!(g.flags.sarmanUntil > g.time)) {
      g.horses = Math.min(HORSE_MAX + 2, g.horses + 1);
      g.fx.push({ type: 'trade', region: i });
    }
    if (g.caravan) g.caravan.next = g.time + 4;
  } else if (rider.kind === 'false') {
    g.n[i] = Math.min(2, g.n[i] + TUNE.lie);
    if (r.tribe >= 0) g.tribes[r.tribe].mood = clamp(g.tribes[r.tribe].mood - 0.035, 0, 1);
    g.marks.add(i);
    (g.markAt || (g.markAt = {}))[i] = g.time;
    g.fx.push({ type: 'lie', region: i });
  }
}

function ariaDone(g) {
  const i = g.aria.at;
  let got = false;
  if (g.marks.has(i)) { got = addClue(g, 'stones', i) || got; g.found.add(i); }
  if (i === g.lair) { got = addClue(g, 'lair', i) || got; g.lairKnown = true; g.lairShown = g.lair; }
  toast(g, 'aria', got ? 'tAriaFound' : 'tAriaNothing', i);
}

function stepRumor(g, dt) {
  const { regions } = g.map;
  const { t, m, n, R } = g;
  const dm = new Float32Array(R), dn = new Float32Array(R);
  for (const r of regions) {
    const i = r.id;
    const rec = receptivity(g, i);
    const flow = TUNE.flow * (g.mod === 'wind' ? 1.35 : 1);
    const outM = m[i] * flow * dt, outN = n[i] * flow * dt;
    dm[i] -= outM;
    dn[i] -= outN;
    for (const e of r.nb) {
      dm[e.to] += outM * e.w;
      dn[e.to] += outN * e.w;
    }
    // retold where people want to hear it, forgotten where they do not
    dm[i] += m[i] * (TUNE.wordGrow * (rec - TUNE.wordAt) - TUNE.wordFade) * dt;
    dn[i] += n[i] * (TUNE.lieGrow * (TUNE.lieAt - rec) - TUNE.lieFade) * dt;
    if (r.tribe >= 0) t[i] += (TUNE.wordGain * m[i] * (0.4 + rec) * (1 - t[i]) - TUNE.lieBite * n[i] * (1.2 - rec * 0.6) * t[i]) * dt;
  }
  // Aria where she stands stops every lie, and next to her lies weaken
  const a = g.aria.at;
  for (let i = 0; i < R; i++) {
    m[i] = clamp(m[i] + dm[i], 0, 2);
    n[i] = clamp(n[i] + dn[i], 0, 2);
    if (m[i] < 0.01) m[i] = 0;
    if (n[i] < 0.01) n[i] = 0;
  }
  if (a >= 0 && g.aria.busy > 0) {
    n[a] = 0;
    for (const e of regions[a].nb) n[e.to] *= 1 - Math.min(1, 1.5 * dt);
  }
  t[0] = 1;
}

function stepTribes(g, dt) {
  const { regions } = g.map;
  for (let k = 0; k < 3; k++) {
    const tr = g.tribes[k];
    const avg = tribeAvg(g, k);
    tr.mood = clamp(tr.mood + ((avg - tr.mood) * TUNE.follow + (TUNE.pride - tr.mood) * TUNE.prideRate) * dt, 0, 1);
    tr.fear = Math.max(0, tr.fear - 0.004 * dt);
    // messengers of the tribe: an unhappy tribe gossips against the khan, a happy one for him
    tr.nextMsg -= dt;
    if (tr.nextMsg <= 0) {
      tr.nextMsg = 10 + g.rand() * 9;
      const own = regions.filter((r) => r.tribe === k);
      const from = own[Math.floor(g.rand() * own.length)];
      const near = [...new Set(own.flatMap((r) => r.nb.map((e) => e.to)))].filter((id) => regions[id].tribe >= 0 && id !== from.id);
      const to = near[Math.floor(g.rand() * near.length)];
      let load = tr.mood < 0.45 ? -(0.45 - tr.mood) * 2.4 : tr.mood > 0.6 ? (tr.mood - 0.6) * 2.2 : 0;
      if (tr.talks) load -= 0.3;
      if (to != null) spawnRider(g, 'tribe', from.id, to, { tribe: k, load });
    }
  }
  const dry = g.drought && g.clock < g.drought.until ? g.drought.tribe : -1;
  for (const r of regions) {
    if (r.tribe < 0) continue;
    if (r.tribe === dry) g.t[r.id] -= 0.006 * dt;
    g.t[r.id] += (g.tribes[r.tribe].mood - g.t[r.id]) * TUNE.settle * dt;
    g.t[r.id] = clamp(g.t[r.id], 0, 1);
  }
}

function stepPlot(g, dt) {
  if (g.hold) return;
  g.plotT -= dt;
  if (g.plotT > 0) return;
  g.plotT = g.plotEvery * (0.8 + g.rand() * 0.4);
  spawnPlot(g);
}

// one forged order on its way (the lesson calls it on purpose)
export function spawnPlot(g) {
  const { regions } = g.map;
  // forged orders start at the hideout or next to it and go where the khan is trusted most
  const starts = [g.lair, ...regions[g.lair].nb.map((e) => e.to)].filter((id) => regions[id].tribe >= 0);
  if (!starts.length) return null;
  const from = starts[Math.floor(g.rand() * starts.length)];
  const fromTribe = regions[from].tribe;
  const targets = regions.filter((r) => r.tribe >= 0 && r.tribe !== fromTribe).sort((a, b) => g.t[b.id] - g.t[a.id]).slice(0, 6);
  const to = targets[Math.floor(g.rand() * targets.length)];
  return to ? spawnRider(g, 'false', from, to.id) : null;
}

function stepPending(g) {
  for (let k = g.pending.length - 1; k >= 0; k--) {
    const p = g.pending[k];
    if (g.time < p.at) continue;
    g.pending.splice(k, 1);
    LATER[p.kind]?.(g, p.args);
  }
}

// consequences that come back later
const LATER = {
  karasaiKeeps(g) {
    g.karasai++;
    toast(g, 'karasai', 'tKarasaiKeeps', 0);
  },
  informantKnown(g, { tribe }) {
    const tr = g.tribes[tribe];
    tr.mood = clamp(tr.mood - 0.1, 0, 1);
    tr.grievance++;
    toast(g, tribe, 'tSuspected', -1, { tribe });
  },
  weakJoins(g, { tribe }) {
    const tr = g.tribes[tribe];
    if (tribeAvg(g, tribe) > 0.6) {
      toast(g, tribe, 'tForgave', -1, { tribe });
      tr.grievance = Math.max(0, tr.grievance - 1);
      return;
    }
    tr.talks = true;
    tr.mood = clamp(tr.mood - 0.08, 0, 1);
    g.plotEvery *= 0.85;
    toast(g, tribe, 'tJoins', -1, { tribe });
  },
  scouts(g) {
    addClue(g, 'scouts', g.lair);
    g.lairKnown = true;
    toast(g, 'scouts', 'tScouts', g.lair);
  },
  merchants(g) {
    toast(g, 'merchants', 'tMerchants', 0);
  },
  karasaiExtend(g) {
    g.karasai++;
    g.karasaiAngry = g.karasai >= 4;
    toast(g, 'karasai', 'tKarasaiExtend', 0);
  },
  sarmanDemands(g) {
    g.flags.sarmanUntil = g.time + 60;
    toast(g, 'sarman', 'tSarmanDemands', 0);
  },
  truthSurfaces(g) {
    for (const tr of g.tribes) tr.mood = clamp(tr.mood - 0.04, 0, 1);
    toast(g, 'orazbai', 'tTruthSurfaces', 0);
  },
};

export function step(g, dt) {
  if (g.phase !== 'map') return;
  g.time += dt;
  const every = HORSE_EVERY * (g.flags.slowUntil > g.time ? 1.6 : 1);
  if (g.horses >= HORSE_MAX) g.horseT = 0;
  else if ((g.horseT += dt) >= every) { g.horseT -= every; g.horses++; }
  g.karasaiCD = Math.max(0, g.karasaiCD - dt);

  for (let k = g.riders.length - 1; k >= 0; k--) {
    const rider = g.riders[k];
    const P = rider.path;
    if (P.length < 2) { g.riders.splice(k, 1); arrive(g, rider); continue; }
    const e = g.map.regions[P[rider.seg]].nb.find((x) => x.to === P[rider.seg + 1]);
    rider.p += (dt * rider.speed) / e.time;
    if (rider.p >= 1) {
      rider.seg++;
      rider.p = 0;
      if (rider.seg >= P.length - 1) { g.riders.splice(k, 1); arrive(g, rider); }
    }
  }
  if (g.aria.busy > 0 && (g.aria.busy -= dt) <= 0) { g.aria.busy = 0; ariaDone(g); }
  stepWatch(g, dt);
  stepCaravan(g);
  // the trace of a lie fades after a while if nobody looks into it
  if (g.markAt) for (const i of g.marks) if (!g.found.has(i) && g.markAt[i] != null && g.time - g.markAt[i] > 75) g.marks.delete(i);

  stepRumor(g, dt);
  stepTribes(g, dt);
  stepPlot(g, dt);
  stepPending(g);

  if (!g.hold) g.clock += dt;
  const evs = SEASONS[g.season];
  if (g.evIdx < evs.length && g.clock >= evs[g.evIdx][1]) openEvent(g, evs[g.evIdx++][0]);
  else if (g.clock >= SEASON) {
    g.riders = [];
    g.vote = kurultai(g);
    g.phase = g.season === 1 ? 'council' : 'kurultai';
  }
}

// Zaltyr watches the roads round his pasture: forged riders there get his mark and slow down;
// now and then he marks an honest messenger too
function stepWatch(g, dt) {
  const z = g.zaltyr;
  if (z.busy <= 0) return;
  z.busy -= dt;
  if (z.busy <= 0) { z.busy = 0; z.at = -1; return; }
  const near = new Set([z.at, ...g.map.regions[z.at].nb.map((e) => e.to)]);
  for (const r of g.riders) {
    if (r.judged || !near.has(riderRegion(g, r))) continue;
    r.judged = true;
    if (r.kind === 'false') { r.seen = true; r.speed *= 0.55; }
    else if (r.kind === 'tribe' && g.rand() < 0.22) r.seen = true;
  }
}

function stepCaravan(g) {
  const c = g.caravan;
  if (!c || g.hold || g.time < c.next || g.riders.some((r) => r.kind === 'caravan')) return;
  c.next = Infinity;
  const [from, to] = c.out ? [c.b, c.a] : [c.a, c.b];
  c.out = !c.out;
  spawnRider(g, 'caravan', from, to);
}

// —— between the seasons ——

// the small council at the end of summer: who stood with the khan feels it, who did not feels strong
export function nextSeason(g) {
  if (g.phase !== 'council') return false;
  const v = g.vote;
  g.council = v.votes.map((x) => x.yes);
  v.votes.forEach((x) => {
    const tr = g.tribes[x.tribe];
    tr.mood = clamp(tr.mood + (x.yes ? 0.05 : -0.04), 0, 1);
  });
  g.season = 2;
  g.clock = 0;
  g.evIdx = 0;
  g.event = null;
  g.horses = HORSE_MAX;
  g.plotEvery *= 0.9;
  g.plotT = 18;
  g.aria.busy = 0;
  g.aria.riding = false;
  g.aria.at = -1;
  // Sarman's caravan runs between the Orda and the great aul of the happiest clan
  const best = [0, 1, 2].sort((a, b) => tribeAvg(g, b) - tribeAvg(g, a))[0];
  g.caravan = { a: 0, b: g.map.capitals[best], out: false, next: g.time + 6 };
  toast(g, 'orazbai', 'tOrazbaiJoins', 0);
  g.phase = 'map';
  return true;
}

// the line a clan's trust must cross at the kurultai: lower when the elder Orazbai trusts the khan
export const voteAt = (g) => clamp(VOTE_AT + (0.5 - g.orazbai) * 0.12, 0.48, 0.62);

// —— the four situations of the first season (from «Хан: когда молчит степь») ——

function openEvent(g, id) {
  const { regions } = g.map;
  let ctx = {};
  if (id === 'horse') ctx = { region: 0 };
  if (id === 'well') {
    // a pasture on the border of two tribes; the "strong" one is the bigger and happier
    const cands = regions.filter((r) => r.tribe >= 0 && r.nb.some((e) => regions[e.to].tribe >= 0 && regions[e.to].tribe !== r.tribe));
    const r = cands[Math.floor(g.rand() * cands.length)];
    const other = regions[r.nb.find((e) => regions[e.to].tribe >= 0 && regions[e.to].tribe !== r.tribe).to].tribe;
    const pw = (k) => regions.filter((x) => x.tribe === k).length + tribeAvg(g, k) * 4;
    const [strong, weak] = pw(r.tribe) >= pw(other) ? [r.tribe, other] : [other, r.tribe];
    ctx = { region: r.id, strong, weak };
  }
  if (id === 'caravan') {
    const fords = regions.filter((r) => r.tribe >= 0 && r.nb.some((e) => e.ford));
    const r = fords[Math.floor(g.rand() * fords.length)] || regions[1];
    ctx = { region: r.id, accused: r.tribe };
  }
  if (id === 'letter') ctx = { region: 0 };
  if (id === 'army') ctx = { region: 0 };
  if (id === 'drought') {
    const k = [0, 1, 2].sort((a, b) => tribeAvg(g, a) - tribeAvg(g, b))[0];
    ctx = { region: g.map.capitals[k], accused: k };
    g.drought = { tribe: k, until: g.clock + 120 };
  }
  if (id === 'plot') {
    // the clans that whisper about another khan; if none, the coldest one
    let k = [0, 1, 2].filter((x) => g.tribes[x].talks);
    if (!k.length) k = [[0, 1, 2].sort((a, b) => tribeAvg(g, a) - tribeAvg(g, b))[0]];
    ctx = { region: g.map.capitals[k[0]], accused: k[0], talks: k };
  }
  if (id === 'truth') ctx = { region: 0, proven: trueClues(g) >= 3 };
  g.event = { id, ...ctx };
  g.phase = 'event';
}

export function eventChoices(g) {
  const e = g.event;
  if (!e) return [];
  const list = {
    horse: [['karasai', 0], ['council', 1], ['pay', 1]],
    well: [['strong', 0], ['share', 2], ['aria', 0]],
    caravan: [['arrest', 0], ['scouts', 1], ['pay', 2]],
    letter: [['demand', 0], ['spy', 0], ['trust', 0]],
    army: [['agree', 0], ['tribes', 0], ['mixed', 1], ['season', 0]],
    drought: [['neighbor', 0], ['share', 0], ['sarman', 0], ['war', 2]],
    plot: [['amnesty', 0], ['proof', 0], ['trap', 0], ['council', 1]],
    truth: [['publish', 0], ['aria', 0], ['blackmail', 0], ['bury', 0]],
  }[e.id];
  return list.map(([key, cost]) => ({ key, cost, ok: g.horses >= cost && !(e.id === 'well' && key === 'aria' && g.aria.trust < 0.3) }));
}

export function choose(g, key) {
  const e = g.event;
  const c = eventChoices(g).find((x) => x.key === key);
  if (!e || !c || !c.ok) return false;
  g.horses -= c.cost;
  const T = g.tribes;
  const pick = `${e.id}.${key}`;
  g.log.push({ key: 'd.' + pick, at: g.time, args: { tribe: e.strong ?? e.accused, weak: e.weak } });
  const all = (d) => { for (const tr of T) tr.mood = clamp(tr.mood + d, 0, 1); };
  const talks = (e.talks || []).map((k) => T[k]);
  switch (pick) {
    // Karasai wants a standing army that answers only to the khan
    case 'army.agree':
      g.karasai += 2;
      g.flags.army = true;
      for (const tr of T) tr.fear = clamp(tr.fear + 0.15, 0, 1);
      g.orazbai = clamp(g.orazbai - 0.15, 0, 1);
      break;
    case 'army.tribes':
      all(0.05);
      g.orazbai = clamp(g.orazbai + 0.1, 0, 1);
      g.karasaiAngry = true;
      toast(g, 'karasai', 'tKarasaiAngry', 0);
      break;
    case 'army.mixed':
      g.karasai++;
      break;
    case 'army.season':
      g.karasai++;
      later(g, 140, 'karasaiExtend');
      break;
    // the great drought: the driest clan wants its neighbours' grass
    case 'drought.neighbor':
      g.horses = Math.min(HORSE_MAX + 2, g.horses + 3);
      g.drought.until = g.clock + 40;
      g.flags.concession = true;
      g.orazbai = clamp(g.orazbai - 0.1, 0, 1);
      break;
    case 'drought.share':
      T[e.accused].mood = clamp(T[e.accused].mood + 0.12, 0, 1);
      for (let k = 0; k < 3; k++) if (k !== e.accused) T[k].mood = clamp(T[k].mood - 0.06, 0, 1);
      g.drought.until = g.clock + 50;
      break;
    case 'drought.sarman':
      g.horses = Math.min(HORSE_MAX + 2, g.horses + 2);
      g.drought.until = g.clock + 30;
      later(g, 70, 'sarmanDemands');
      break;
    case 'drought.war':
      if (g.rand() < 0.5) {
        T[e.accused].mood = clamp(T[e.accused].mood + 0.15, 0, 1);
        g.karasai++;
        g.drought.until = g.clock;
        toast(g, 'karasai', 'tWarWon', 0);
      } else {
        all(-0.08);
        toast(g, 'karasai', 'tWarLost', 0);
      }
      break;
    // Zaltyr: some clans quietly talk about another khan
    case 'plot.amnesty':
      for (const tr of talks) { tr.talks = false; tr.mood = clamp(tr.mood + 0.08, 0, 1); }
      g.plotEvery *= 0.9;
      break;
    case 'plot.proof':
      if (g.rand() < 0.6) {
        addClue(g, 'zaltyr', g.lair);
        g.lairKnown = true;
        g.lairShown = g.lair;
      } else {
        // Zaltyr was fed a lie: he points at the wrong pasture
        const wrong = g.map.regions.filter((r) => r.tribe >= 0 && r.id !== g.lair);
        g.lairShown = wrong[Math.floor(g.rand() * wrong.length)].id;
        g.lairKnown = true;
        addClue(g, 'zaltyrFalse', g.lairShown);
      }
      break;
    case 'plot.trap':
      for (const tr of talks) { tr.grievance++; tr.mood = clamp(tr.mood - 0.1, 0, 1); }
      g.flags.noScout = true; // everyone hides now, Zaltyr hears nothing
      g.zaltyr.busy = 0;
      g.zaltyr.at = -1;
      break;
    case 'plot.council':
      g.orazbai = clamp(g.orazbai + 0.15, 0, 1);
      for (const tr of talks) tr.talks = false;
      // the plotters are warned and move
      {
        const far = g.map.regions.filter((r) => r.tribe >= 0 && r.id !== g.lair && !g.map.capitals.includes(r.id));
        g.lair = far[Math.floor(g.rand() * far.length)].id;
        g.lairKnown = false;
        g.lairShown = g.lair;
      }
      break;
    // the truth: the old khan was preparing a reform — a council of the whole steppe
    case 'truth.publish':
      if (e.proven) { all(0.1); g.flags.reform = true; g.orazbai = clamp(g.orazbai + 0.1, 0, 1); }
      else all(-0.05);
      break;
    case 'truth.aria':
      g.aria.trust = clamp(g.aria.trust + 0.2, 0, 1);
      g.flags.ariaKnows = true;
      break;
    case 'truth.blackmail':
      for (let k = 0; k < 3; k++) if (T[k].talks || tribeAvg(g, k) < voteAt(g)) { T[k].fear = clamp(T[k].fear + 0.3, 0, 1); T[k].forced = true; }
      g.orazbai = clamp(g.orazbai - 0.15, 0, 1);
      break;
    case 'truth.bury':
      g.flags.buried = true;
      later(g, 50, 'truthSurfaces');
      break;
    case 'horse.karasai':
      g.karasai++;
      g.horses = Math.min(HORSE_MAX + 2, g.horses + 2);
      later(g, 150, 'karasaiKeeps');
      break;
    case 'horse.council':
      for (const tr of T) tr.mood = clamp(tr.mood + 0.07, 0, 1);
      g.flags.council = true;
      break;
    case 'horse.pay':
      addClue(g, 'informant', -1);
      g.flags.blamed = 2;
      later(g, 80, 'informantKnown', { tribe: 2 });
      break;
    case 'well.strong':
      T[e.strong].mood = clamp(T[e.strong].mood + 0.08, 0, 1);
      T[e.weak].mood = clamp(T[e.weak].mood - 0.15, 0, 1);
      T[e.weak].grievance++;
      later(g, 100, 'weakJoins', { tribe: e.weak });
      break;
    case 'well.share':
      T[e.strong].mood = clamp(T[e.strong].mood + 0.06, 0, 1);
      T[e.weak].mood = clamp(T[e.weak].mood + 0.06, 0, 1);
      break;
    case 'well.aria':
      // the border stones at the well were moved: somebody wanted these two to fight
      g.marks.add(e.region);
      g.aria.riding = false;
      g.aria.at = e.region;
      g.aria.busy = ARIA_STAY;
      g.aria.trust = clamp(g.aria.trust + 0.05, 0, 1);
      T[e.strong].mood = clamp(T[e.strong].mood + 0.04, 0, 1);
      T[e.weak].mood = clamp(T[e.weak].mood + 0.04, 0, 1);
      break;
    case 'caravan.arrest':
      T[e.accused].mood = clamp(T[e.accused].mood - 0.18, 0, 1);
      T[e.accused].grievance++;
      addClue(g, 'arrest', e.region);
      break;
    case 'caravan.scouts':
      later(g, 40, 'scouts');
      break;
    case 'caravan.pay':
      for (const tr of T) tr.mood = clamp(tr.mood + 0.03, 0, 1);
      g.flags.slowUntil = g.time + 60;
      later(g, 20, 'merchants');
      break;
    case 'letter.demand':
      if (g.aria.trust >= 0.6) addClue(g, 'letter');
      g.aria.trust = clamp(g.aria.trust - 0.2, 0, 1);
      g.aria.distrust++;
      g.flags.letter = g.aria.trust >= 0.6 ? 'told' : 'cold';
      break;
    case 'letter.spy':
      if (g.rand() < 0.5) {
        g.aria.trust = clamp(g.aria.trust - 0.4, 0, 1);
        g.aria.distrust++;
        g.flags.letter = 'caught';
      } else {
        addClue(g, 'letter');
        g.flags.letter = 'read';
      }
      break;
    case 'letter.trust':
      if (g.aria.trust >= 0.5 && g.aria.distrust === 0) {
        addClue(g, 'letter');
        g.aria.trust = clamp(g.aria.trust + 0.2, 0, 1);
        g.flags.letter = 'told';
      } else {
        g.aria.trust = clamp(g.aria.trust + 0.05, 0, 1);
        g.flags.letter = 'silent';
      }
      break;
  }
  g.event = null;
  g.phase = 'map';
  return true;
}

// —— the kurultai ——

export function kurultai(g) {
  const votes = g.tribes.map((tr, k) => {
    const avg = tribeAvg(g, k);
    const line = voteAt(g);
    const yes = tr.forced || (avg >= line && (tr.grievance === 0 || avg >= line + 0.13) && !(tr.talks && avg < line + 0.07));
    return { tribe: k, trust: avg, yes, line };
  });
  return { votes, yes: votes.filter((v) => v.yes).length, karasai: g.karasai >= 3, orazbai: g.orazbai };
}

export const ENDINGS = ['uniter', 'mediator', 'ironHorde', 'noPeople', 'truthBreaks', 'vanish'];

export function finish(g, choice, suspect = null) {
  const v = g.vote || kurultai(g);
  const yes = Math.min(3, v.yes + (choice === 'council' && (g.flags.council || g.orazbai >= 0.65) ? 1 : 0));
  const tc = trueClues(g), fc = falseClues(g);
  const proven = tc >= (g.flags.buried ? 4 : 3) && tc > fc;
  let end, variant = null;
  if (g.karasai >= 3 && (g.aria.trust < 0.35 || g.karasaiAngry) && choice !== 'leave') end = 'vanish';
  else if (choice === 'leave') { end = 'vanish'; variant = 'left'; }
  else if (choice === 'reveal' && suspect && suspect !== g.culprit) end = 'truthBreaks'; // an innocent man named
  else if (choice === 'reveal') end = proven ? (yes >= (g.flags.reform ? 1 : 2) ? 'uniter' : 'mediator') : 'truthBreaks';
  else if (choice === 'council') end = yes >= 2 ? 'mediator' : 'noPeople';
  else end = g.karasai >= 2 ? 'ironHorde' : 'noPeople';
  const score = Math.round(unity(g) * 100);
  g.result = { end, variant, choice, yes, tc, fc, score, culprit: g.culprit, named: suspect, nailed: choice === 'reveal' && suspect === g.culprit && proven };
  g.phase = 'end';
  return g.result;
}

// where a word helps most now: an undecided pasture willing to listen, near others who will hear it next
export function suggest(g) {
  let best = -1, bs = -Infinity;
  const coming = new Set(g.riders.filter((x) => x.kind === 'word').map((x) => x.to));
  for (const r of g.map.regions) {
    if (r.tribe < 0 || coming.has(r.id)) continue;
    const rec = receptivity(g, r.id);
    let s = (1 - g.t[r.id]) * (0.5 + rec) - g.m[r.id] * 0.8;
    for (const e of r.nb) if (g.map.regions[e.to].tribe >= 0) s += (1 - g.t[e.to]) * 0.15 * receptivity(g, e.to);
    // the tribe closest to turning is worth more
    const tt = tribeAvg(g, r.tribe);
    if (tt < VOTE_AT) s += 0.4 * (1 - (VOTE_AT - tt) * 4);
    if (s > bs) { bs = s; best = r.id; }
  }
  return best;
}
export const forMe = (g) => kurultai(g).yes;

export const choicesAtKurultai = (g) => [
  { key: 'council', ok: true },
  { key: 'force', ok: g.karasai >= 1 },
  { key: 'reveal', ok: g.clues.length > 0 },
  { key: 'leave', ok: true },
];

export { GW };
