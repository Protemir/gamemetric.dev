// «Табун» — вся игровая логика без three.js: табун, трасса, финал, генератор уровней, автопилот.
// Работает и в браузере, и в node (tools/sim.mjs гоняет по ней баланс).

export const HALF = 5.5;          // полуширина трассы, м
export const CAP = 150;           // столько коней живут телами; остальное — только число
export const MAX_COUNT = 999;
export const DT = 1 / 60;
export const GOLDEN = 10;      // столько коней даёт Алтын тұлпар
export const LADDER = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5];
const LAT_SPEED = 11;             // как быстро центр табуна идёт за пальцем, м/с
const HORSE_R = 0.45;             // «радиус» коня для столкновений

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const SWAP_T = 1.3;   // ворота-«качели» меняются местами раз в столько секунд
// какие ворота где стоят в момент t
export function gateOpsAt(it, t) {
  if (!it.swap) return { left: it.left, right: it.right };
  return Math.floor((t + it.i * 0.37) / SWAP_T) % 2 ? { left: it.right, right: it.left } : { left: it.left, right: it.right };
}

// —— ворота ——
export function applyOp(count, g) {
  switch (g.op) {
    case '+': return Math.min(MAX_COUNT, count + g.v);
    case '-': return Math.max(0, count - g.v);
    case 'x': return Math.min(MAX_COUNT, count * g.v);
    case '/': return Math.floor(count / g.v);
    case '?': return applyOp(count, g.real);   // загадка: внутри настоящие ворота
    default: return count; // '$' — сундук, коней не меняет
  }
}
export const isGood = (g) => g.op === '+' || g.op === 'x' || g.op === '$' || g.op === '?';
export const opText = (g) => (g.op === '?' ? '?' : g.op === 'x' ? '×' + g.v : g.op === '/' ? '÷' + g.v : g.op === '$' ? '+' + g.v + ' ₸' : g.op + g.v);

// —— форма табуна: эллипс, растёт вширь до предела, потом в длину ——
export function herdShape(n) {
  const a = Math.min(3.7, 0.5 * Math.sqrt(Math.max(1, n)) + 0.45);
  const b = Math.max(a * 0.9, (n * 1.35) / (Math.PI * a));
  return { a, b };
}
const GOLD = Math.PI * (3 - Math.sqrt(5));
export function slotOf(i, n, shape) {
  const r = Math.sqrt((i + 0.5) / Math.max(1, n));
  const th = i * GOLD;
  return { sx: shape.a * r * Math.cos(th), sd: shape.b * r * Math.sin(th) };
}

// —— уровень ——
// Ворота: { type:'gate', d, left, right } или { type:'gate', d, full }.
// Дикие: { type:'wild', d, x, n }. Валун: { type:'rock', d, dir, speed }. Овраг: { type:'pit', d0, d1, x0, x1 }.
// Изгородь: { type:'fence', d, g0, g1 }. Река: { type:'river', d0, d1 }.
const LEVEL_CACHE = new Map();

export function level(n) {
  if (LEVEL_CACHE.has(n)) return LEVEL_CACHE.get(n);
  const L = genLevel(n);
  LEVEL_CACHE.set(n, L);
  return L;
}

// «Байга дня»: одна трасса на всех в этот день, сложность — по уровню игрока
export function dailyLevel(day, diff) {
  const key = 'd' + day + '_' + diff;
  if (LEVEL_CACHE.has(key)) return LEVEL_CACHE.get(key);
  const L = genLevel(diff, 50000 + day, true);
  LEVEL_CACHE.set(key, L);
  return L;
}

export const THEMES = ['day', 'gold', 'winter', 'dusk', 'day', 'night', 'morning', 'winter'];

function genLevel(n, seedN = n, daily = false) {
  // уровень, который автопилот проходит плохо, перегенерируется с другим сидом
  let best = null;
  for (let v = 0; v < 12; v++) {
    const L = genLevelOnce(n, v, seedN, daily);
    if (L.autoGot >= 12 + n) return L;
    if (!best || L.autoGot > best.autoGot) best = L;
  }
  return best;
}

function genLevelOnce(n, variant, seedN = n, daily = false) {
  const R = rng(seedN * 7919 + 13 + variant * 104729);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const boss = !daily && n % 5 === 0;
  const length = Math.round(360 + Math.min(n, 30) * 8 + (boss ? 60 : 0));
  const L = {
    n, boss, length,
    speed0: 12.5, speed1: 15 + Math.min(n, 25) * 0.1,
    theme: daily ? 'night' : boss ? 'dusk' : THEMES[(n - 1) % THEMES.length],
    daily,
    items: [], rival: 0, base: 40 + n * 10,
  };
  // что уже можно ставить на этом уровне
  const can = {
    mult: n >= 2, pit: n >= 3, rock: n >= 5, wolf: n >= 4, fence: n >= 6, river: n >= 8, div: n >= 3, chest: n >= 2,
  };
  // ожидаемое число коней по «умному» пути — чтобы выбор в воротах был задачей, а не очевидностью
  let E = 5 + Math.floor(n / 3);
  let d = 45;
  const end = length - 35;
  let lastType = '';
  while (d < end) {
    const w = [
      ['gate', 55], ['wild', n === 1 ? 25 : 14],
      ['rock', can.rock ? 10 : 0], ['pit', can.pit ? 11 : 0], ['wolf', can.wolf ? 13 : 0],
      ['fence', can.fence ? 9 : 0], ['river', can.river ? 4 : 0],
    ].filter(([t, wt]) => wt > 0 && !(t === lastType && t !== 'gate'));
    let tot = w.reduce((s, x) => s + x[1], 0), r = R() * tot, type = 'gate';
    for (const [t, wt] of w) { if ((r -= wt) < 0) { type = t; break; } }
    if (type === 'gate') {
      const g = makeGatePair(E, R, can, n);
      // качели: ворота меняются местами — лови момент
      if (!g.full && n >= 7 && R() < 0.22) g.swap = true;
      // засада: стая сторожит выгодную сторону ворот
      if (can.wolf && !g.full && R() < 0.28) {
        const vl = applyOp(E, g.left), vr = applyOp(E, g.right);
        const k = ri(2, 3 + Math.min(4, Math.floor(n / 4)));
        L.items.push({ type: 'wolf', d: d - 13, x: vl >= vr ? -2.75 : 2.75, n: k, seed: ri(1, 1e6) });
        E -= Math.round(k * 0.5);
      }
      L.items.push({ type: 'gate', d, ...g });
      const sides = g.full ? [g.full] : [g.left, g.right];
      E = Math.max(...sides.map((s) => applyOp(E, s)));
      E = Math.max(E, 3);
      d += ri(30, 38);
    } else if (type === 'wild') {
      if (n >= 2 && R() < 0.18) {
        // Алтын тұлпар: один золотой конь, стоит за десятерых
        L.items.push({ type: 'wild', d: d + 4, x: pick([-3.5, 3.5]), n: 1, golden: true, seed: ri(1, 1e6) });
        E += 8;
      } else {
        const k = ri(3, 4 + Math.min(10, n));
        L.items.push({ type: 'wild', d: d + 4, x: pick([-3, -1.5, 0, 1.5, 3]), n: k, seed: ri(1, 1e6) });
        E += Math.round(k * 0.8);
      }
      d += ri(24, 30);
    } else if (type === 'wolf') {
      const k = ri(3, 4 + Math.min(6, Math.floor(n / 3)));
      L.items.push({ type: 'wolf', d, x: pick([-3, -1.5, 0, 1.5, 3]), n: k, seed: ri(1, 1e6) });
      E -= Math.round(k * 0.4);
      d += ri(26, 32);
    } else if (type === 'rock') {
      const many = n >= 9 && R() < 0.4 ? 2 : 1;
      if (lastType === 'fence' || lastType === 'pit') d += 12;
      for (let i = 0; i < many; i++) L.items.push({ type: 'rock', d: d + i * 11, dir: R() < 0.5 ? -1 : 1, speed: 6 + R() * 1.5 + Math.min(n, 20) * 0.06 });
      d += 30 + many * 8;
    } else if (type === 'pit') {
      const len = ri(12, 20);
      const wdt = ri(3, 5);
      const side = pick(['l', 'r', 'm']);
      const x0 = side === 'l' ? -HALF : side === 'r' ? HALF - wdt : -wdt / 2;
      L.items.push({ type: 'pit', d0: d, d1: d + len, x0, x1: x0 + wdt });
      E = Math.round(E * 0.9);
      d += len + ri(16, 22);
    } else if (type === 'fence') {
      const gw = ri(3, 5);
      const c = (R() * 2 - 1) * (HALF - gw / 2 - 0.3);
      if (lastType === 'rock' || lastType === 'pit') d += 12;
      L.items.push({ type: 'fence', d, g0: c - gw / 2, g1: c + gw / 2 });
      E = Math.round(E * 0.85);
      d += ri(26, 32);
    } else if (type === 'river') {
      L.items.push({ type: 'river', d0: d, d1: d + 9 });
      d += 22;
    }
    lastType = type;
  }
  // обучение: первые уровни проще и понятнее
  if (n === 1) L.items = L.items.filter((it) => it.type === 'gate' || it.type === 'wild');
  // соперник: столько, сколько набирает автопилот, умноженное на долю
  const start = 5 + Math.floor((n - 1) / 3);
  // два прогона с разной «случайностью» — уровень не должен держаться на одной удачной партии
  const got = Math.min(simulate(L, { start, leader: 0, seed: 0 }), simulate(L, { start, leader: 0, seed: 1 }));
  const ratio = boss ? 0.84 : Math.min(0.8, 0.45 + n * 0.025);
  L.rival = Math.max(3, Math.round(got * ratio));
  L.autoGot = got;
  L.variant = variant;
  return L;
}

function makeGatePair(E, R, can, n) {
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const nice = (v) => (v > 40 ? Math.round(v / 5) * 5 : Math.round(v));
  const plus = () => ({ op: '+', v: Math.max(2, nice(ri(3, 9) + E * (0.08 + R() * 0.22))) });
  const minus = () => ({ op: '-', v: Math.max(2, nice(ri(3, 8) + E * (0.12 + R() * 0.3))) });
  const mult = () => ({ op: 'x', v: E < 25 && R() < 0.3 ? 3 : 2 });
  const div = () => ({ op: '/', v: 2 });
  const chest = () => ({ op: '$', v: 20 + n * 5 + ri(0, 4) * 5 });
  const r = R();
  let a, b;
  if (r < 0.32) { a = plus(); b = minus(); }
  else if (r < 0.46 && can.mult && E < 160) {          // задачка: что больше, ×2 или +N?
    a = mult();
    b = { op: '+', v: Math.max(3, nice(E * (a.v - 1) * (0.7 + R() * 0.6))) };
  } else if (r < 0.66) { a = plus(); b = plus(); }
  else if (r < 0.78 && can.div) { a = can.mult && R() < 0.5 ? mult() : plus(); b = div(); }
  else if (r < 0.88 && can.chest) { a = chest(); b = plus(); }
  else if (r < 0.94) return { full: n < 3 || R() < 0.5 ? plus() : (can.mult ? mult() : plus()) };
  else { a = minus(); b = can.div ? div() : minus(); }
  // загадка: одна из сторон прячет настоящие ворота под «?»
  if (n >= 3 && R() < 0.15) {
    const pool = [mult(), plus(), minus(), can.div ? div() : minus()];
    const real = pool[Math.floor(R() * pool.length)];
    if (R() < 0.5) a = { op: '?', real }; else b = { op: '?', real };
  }
  return R() < 0.5 ? { left: a, right: b } : { left: b, right: a };
}

// —— забег ——
export class Run {
  constructor(L, { start = 5, leader = 0, cap = CAP, seed = 0 } = {}) {
    this.L = L;
    this.cap = cap;
    this.count = start;
    this.leader = leader;
    this.d = 0;              // где центр табуна вдоль трассы
    this.cx = 0;             // и поперёк
    this.t = 0;
    this.speed = L.speed0;
    this.state = 'run';      // run → clash → ladder → win | lose
    this.bodies = [];
    this.ghosts = [];        // упавшие, сбитые, ушедшие — только для картинки
    this.wild = [];          // дикие кони на трассе
    this.rocks = [];
    this.wolves = [];        // волки: стоят, потом бегут наперерез; один волк — один конь
    this.events = [];
    this.coins = 0;
    this.lossAcc = 0;
    this.nextId = 1;
    this.items = L.items.map((it, i) => ({ ...it, i, done: false, active: false }));
    this.rival = { count: L.rival, d: L.length + 22, bodies: [], start: L.rival };
    this.ladderStep = 0;
    this.combo = 0;          // подряд выбранные лучшие ворота
    this.bestCombo = 0;
    this.mult = 0;
    this.stepCost = Math.max(1, Math.ceil(L.rival * 0.05));
    this.finishD = L.length;
    this.ladderD0 = this.rival.d + 12;
    this.R = rng(L.n * 31 + 7 + seed * 7777);
    const RR = rng(L.n * 97 + 3); // у соперника свой поток: его размер не должен менять забег
    this.sync(true);
    for (let i = 0; i < Math.min(L.rival, cap); i++) {
      const s = slotOf(i, Math.min(L.rival, cap), herdShape(Math.min(L.rival, cap)));
      this.rival.bodies.push({ id: this.nextId++, x: s.sx, d: this.rival.d - s.sd, phase: RR(), k: 3 + RR() * 3, sx: s.sx, sd: -s.sd });
    }
  }

  get shape() { return herdShape(Math.min(this.count, this.cap) || 1); }
  get front() { return this.d + this.shape.b; }
  get progress() { return clamp(this.d / this.finishD, 0, 1); }

  emit(type, o = {}) { this.events.push({ type, ...o }); }

  newBody(x, d, spawn = 1) {
    return { id: this.nextId++, x, d, phase: this.R(), k: 3.2 + this.R() * 3, spawn, sx: 0, sd: 0, coat: Math.floor(this.R() * 1e6) };
  }

  // число тел = min(число коней, CAP)
  sync(initial = false, from = null) {
    const want = Math.min(this.count, this.cap);
    while (this.bodies.length > want) {
      const i = Math.floor(this.R() * this.bodies.length);
      const b = this.bodies[i];
      this.bodies.splice(i, 1);
      this.ghost(b, 'poof');
    }
    while (this.bodies.length < want) {
      const sp = from || { x: this.cx + (this.R() - 0.5) * 2, d: this.d + (this.R() - 0.5) * 2 };
      this.bodies.push(this.newBody(sp.x + (this.R() - 0.5) * 1.5, sp.d + (this.R() - 0.5) * 1.5, initial ? 1 : 0));
    }
    const n = this.bodies.length, sh = herdShape(n || 1);
    for (let i = 0; i < n; i++) {
      const s = slotOf(i, n, sh);
      this.bodies[i].sx = s.sx;
      this.bodies[i].sd = s.sd;
    }
  }

  ghost(b, kind, extra = {}) {
    this.ghosts.push({ x: b.x, d: b.d, y: 0, vx: 0, vy: 0, vd: 0, rot: 0, t: 0, kind, phase: b.phase, coat: b.coat, ...extra });
  }

  // конь погиб: число уменьшается на «вес» тела (при большом табуне одно тело — несколько коней)
  kill(i, kind, extra, fixed = 0) {
    const b = this.bodies[i];
    const w = fixed || this.count / Math.max(1, this.bodies.length);
    this.lossAcc += w;
    const k = Math.floor(this.lossAcc + 1e-6);
    this.lossAcc -= k;
    this.count = Math.max(0, this.count - k);
    this.bodies.splice(i, 1);
    this.ghost(b, kind, extra);
    this.emit('loss', { kind, x: b.x, d: b.d, n: k });
    // при большом табуне тело возвращается в хвост: число уменьшилось, а тел всё ещё CAP
    if (this.count >= this.cap && this.bodies.length < this.cap) {
      const sh = this.shape;
      this.bodies.push(this.newBody(this.cx + (this.R() - 0.5) * sh.a, this.d - sh.b * 0.9, 0.2));
    }
    this.resync = true;
  }

  step(dt, targetX) {
    this.t += dt;
    for (const g of this.ghosts) this.ghostStep(g, dt);
    this.ghosts = this.ghosts.filter((g) => g.t < (g.kind === 'stay' ? 60 : 1.6));
    if (this.state === 'run') this.stepRun(dt, targetX);
    else if (this.state === 'clash') this.stepClash(dt);
    else if (this.state === 'ladder') this.stepLadder(dt, targetX);
    else this.stepIdle(dt);
    if (this.resync) { this.resync = false; this.sync(); }
  }

  ghostStep(g, dt) {
    g.t += dt;
    if (g.kind === 'fall') { g.vy -= 22 * dt; g.y += g.vy * dt; g.d += g.vd * dt; g.rot += dt * 2.5; }
    else if (g.kind === 'hit' || g.kind === 'bump' || g.kind === 'clash' || g.kind === 'wolf') {
      g.vy -= 20 * dt; g.y = Math.max(0, g.y + g.vy * dt); g.x += g.vx * dt; g.d += g.vd * dt; g.rot += dt * 7;
      if (g.y === 0) { g.vx *= 0.9; g.vd *= 0.9; }
    }
  }

  moveBodies(dt, speed) {
    const sh = this.shape;
    for (const b of this.bodies) {
      const tx = this.cx + b.sx, td = this.d + b.sd;
      const f = 1 - Math.exp(-b.k * dt);
      b.x += (tx - b.x) * f;
      b.d += speed * dt + (td - b.d) * f;
      b.x = clamp(b.x, -HALF + 0.35, HALF - 0.35);
      if (b.spawn < 1) b.spawn = Math.min(1, b.spawn + dt * 3.5);
    }
    return sh;
  }

  stepRun(dt, targetX) {
    const L = this.L;
    const inRiver = this.items.some((it) => it.type === 'river' && this.d > it.d0 - 2 && this.d < it.d1 + 2);
    const base = L.speed0 + (L.speed1 - L.speed0) * this.progress;
    this.speed += ((inRiver ? base * 0.62 : base) - this.speed) * (1 - Math.exp(-dt * 4));
    const sh = this.shape;
    const lim = HALF - 0.4;
    const tx = clamp(targetX, -lim, lim);
    const dx = tx - this.cx;
    this.cx += clamp(dx, -LAT_SPEED * dt, LAT_SPEED * dt);
    this.d += this.speed * dt;
    this.moveBodies(dt, this.speed);
    const front = this.d + sh.b;

    for (const it of this.items) {
      if (it.done) continue;
      if (it.type === 'gate') {
        if (front >= it.d) {
          it.done = true;
          const side = it.full ? 'full' : this.cx < 0 ? 'left' : 'right';
          const ops = gateOpsAt(it, this.t);
          const g = it.full || ops[side];
          it.hit = side;
          it.hitOp = g;
          const before = this.count;
          if (g.op === '$') { this.coins += g.v; this.emit('chest', { v: g.v, x: this.cx, d: it.d }); }
          else {
            this.count = applyOp(this.count, g);
            this.sync(false, g.op === '+' || g.op === 'x' ? { x: side === 'left' ? -2.75 : side === 'right' ? 2.75 : this.cx, d: this.d } : null);
          }
          const shown = g.op === '?' ? g.real : g;
          this.emit('gate', { item: it, side, good: this.count >= before && shown.op !== '/', delta: this.count - before, op: shown, mystery: g.op === '?', x: side === 'left' ? -2.75 : side === 'right' ? 2.75 : 0, d: it.d });
          if (!it.full) {
            const val = (q) => (q.op === '$' ? before + 0.5 : applyOp(before, q));
            const mine = val(g), other = val(side === 'left' ? ops.right : ops.left);
            if (mine >= other) {
              this.combo++;
              this.bestCombo = Math.max(this.bestCombo, this.combo);
              if (this.combo >= 2) {
                const bonus = this.combo * 3;
                this.coins += bonus;
                this.emit('combo', { n: this.combo, bonus, x: this.cx, d: it.d });
              }
            } else {
              if (this.combo >= 2) this.emit('combo-break', { n: this.combo });
              this.combo = 0;
            }
          }
          if (this.count <= 0) return this.lose();
        }
      } else if (it.type === 'wild') {
        if (!it.active && front > it.d - 70) {
          it.active = true;
          const R = rng(it.seed);
          for (let k = 0; k < it.n; k++) {
            const a = R() * Math.PI * 2, r = Math.sqrt(R()) * (0.8 + it.n * 0.12);
            this.wild.push({ id: this.nextId++, x: clamp(it.x + Math.cos(a) * r, -HALF + 0.5, HALF - 0.5), d: it.d + Math.sin(a) * r * 1.3, phase: R(), yaw: (R() - 0.5) * 1.2, item: it.i, coat: Math.floor(R() * 1e6), golden: !!it.golden });
          }
        }
        if (it.active && this.d > it.d + 40) it.done = true;
      } else if (it.type === 'wolf') {
        if (!it.active && front > it.d - 65) {
          it.active = true;
          const R = rng(it.seed);
          for (let k = 0; k < it.n; k++) {
            const a = R() * Math.PI * 2, r = Math.sqrt(R()) * (0.7 + it.n * 0.13);
            this.wolves.push({ id: this.nextId++, x: clamp(it.x + Math.cos(a) * r, -HALF + 0.4, HALF - 0.4), d: it.d + Math.sin(a) * r * 1.2, phase: R(), run: false, vx: 0, vd: 0, item: it.i, sp: 3 + R() * 1.2 });
          }
          this.emit('wolves', { x: it.x, d: it.d, n: it.n });
        }
        if (it.active && this.d - sh.b > it.d + 30) it.done = true;
      } else if (it.type === 'rock') {
        // валун катится поперёк так, чтобы быть на середине трассы, когда табун подойдёт
        const lead = ((HALF + 4) / it.speed) * this.speed;
        if (!it.active && front > it.d - lead) {
          it.active = true;
          this.rocks.push({ item: it.i, x: -it.dir * (HALF + 4), d: it.d, dir: it.dir, speed: it.speed, r: 0.95, rot: 0 });
          this.emit('rock', { x: -it.dir * (HALF + 4), d: it.d });
        }
        if (it.active && this.d - sh.b > it.d + 6) it.done = true;
      } else if (it.type === 'pit') {
        if (this.d - sh.b * 1.2 > it.d1 + 2) it.done = true;
      } else if (it.type === 'fence') {
        if (this.d - sh.b * 1.2 > it.d + 2) it.done = true;
      } else if (it.type === 'river') {
        if (!it.active && front > it.d0) { it.active = true; this.emit('river', { d: it.d0 }); }
        if (this.d - sh.b > it.d1) it.done = true;
      }
    }

    // дикие кони: кого задели — тот с нами
    if (this.wild.length) {
      for (let w = this.wild.length - 1; w >= 0; w--) {
        const h = this.wild[w];
        if (h.d < this.d - sh.b - 25) { this.wild.splice(w, 1); continue; }
        if (Math.abs(h.d - this.d) > sh.b + 2.5) continue;
        for (const b of this.bodies) {
          const ddx = b.x - h.x, ddd = b.d - h.d;
          if (ddx * ddx + ddd * ddd < 1.9) {
            this.wild.splice(w, 1);
            this.count = Math.min(MAX_COUNT, this.count + (h.golden ? GOLDEN : 1));
            if (h.golden) { this.coins += 30; this.emit('golden', { x: h.x, d: h.d, n: GOLDEN }); this.sync(false, { x: h.x, d: h.d }); }
            if (this.bodies.length < this.cap) {
              const nb = this.newBody(h.x, h.d, 1);
              nb.joined = 1;
              nb.coat = h.coat;
              this.bodies.push(nb);
              this.resync = true;
            }
            if (!h.golden) this.emit('recruit', { x: h.x, d: h.d });
            break;
          }
        }
      }
    }

    // волки: близко — бросаются к ближайшему коню
    for (let w = this.wolves.length - 1; w >= 0; w--) {
      const wf = this.wolves[w];
      if (wf.d < this.d - sh.b - 12) { this.wolves.splice(w, 1); continue; }
      const near = wf.d - front;
      if (!wf.run && near < 24) { wf.run = true; if (!this.howled || this.t - this.howled > 3) { this.howled = this.t; this.emit('howl', { x: wf.x, d: wf.d }); } }
      if (!wf.run || !this.bodies.length) continue;
      let best = null, bd = 1e9;
      for (const b of this.bodies) { const q = (b.x - wf.x) ** 2 + (b.d - wf.d) ** 2 * 0.3; if (q < bd) { bd = q; best = b; } }
      const dx = best.x - wf.x;
      wf.vx = clamp(dx * 3, -wf.sp, wf.sp);
      wf.vd = -4.5;
      wf.x = clamp(wf.x + wf.vx * dt, -HALF + 0.3, HALF - 0.3);
      wf.d += wf.vd * dt;
      if (Math.abs(wf.d - this.d) > sh.b + 2) continue;
      for (let i = this.bodies.length - 1; i >= 0; i--) {
        const b = this.bodies[i];
        if ((b.x - wf.x) ** 2 + (b.d - wf.d) ** 2 < 1.1) {
          this.kill(i, 'wolf', { vx: wf.vx * 0.6, vy: 3.5, vd: -2 }, 1);
          this.wolves.splice(w, 1);
          this.emit('bite', { x: wf.x, d: wf.d });
          break;
        }
      }
    }

    // валуны
    for (let r = this.rocks.length - 1; r >= 0; r--) {
      const rk = this.rocks[r];
      rk.x += rk.dir * rk.speed * dt;
      rk.rot += (rk.speed / rk.r) * dt;
      if (Math.abs(rk.x) > HALF + 8) { this.rocks.splice(r, 1); continue; }
      if (Math.abs(rk.d - this.d) > sh.b + 3) continue;
      for (let i = this.bodies.length - 1; i >= 0; i--) {
        const b = this.bodies[i];
        const ddx = b.x - rk.x, ddd = b.d - rk.d, rr = rk.r + HORSE_R;
        if (ddx * ddx + ddd * ddd < rr * rr) this.kill(i, 'hit', { vx: rk.dir * (5 + this.R() * 4), vy: 6 + this.R() * 3, vd: this.speed * 0.4 });
      }
    }

    // овраги и изгороди — по каждому коню
    for (const it of this.items) {
      if (it.done) continue;
      if (it.type === 'pit') {
        if (this.d + sh.b < it.d0 || this.d - sh.b > it.d1) continue;
        for (let i = this.bodies.length - 1; i >= 0; i--) {
          const b = this.bodies[i];
          if (b.d > it.d0 + 0.4 && b.d < it.d1 - 0.2 && b.x > it.x0 + 0.15 && b.x < it.x1 - 0.15) this.kill(i, 'fall', { vy: 1.5, vd: this.speed * 0.6 });
        }
      } else if (it.type === 'fence') {
        if (Math.abs(this.d - it.d) > sh.b + 2) continue;
        for (let i = this.bodies.length - 1; i >= 0; i--) {
          const b = this.bodies[i];
          if (b.d >= it.d - 0.3 && b.d < it.d + 0.6 && (b.x < it.g0 + 0.2 || b.x > it.g1 - 0.2)) this.kill(i, 'bump', { vx: (this.R() - 0.5) * 3, vy: 4, vd: -3 });
        }
      }
    }
    if (this.count <= 0) return this.lose();

    if (front >= this.finishD) {
      this.state = 'clash';
      this.clashT = 0;
      if (this.leader > 0) {
        this.count = Math.min(MAX_COUNT, this.count + this.leader);
        this.emit('leader', { v: this.leader });
        this.sync(false, { x: this.cx, d: this.d + sh.b });
      }
      this.emit('clash-start', {});
    }
  }

  stepClash(dt) {
    this.clashT += dt;
    const sh = this.shape;
    const rv = this.rival;
    const rsh = herdShape(Math.min(rv.count, this.cap) || 1);
    const rFront = rv.d - rsh.b;
    const touching = this.d + sh.b >= rFront - 0.6;
    const v = touching ? 1.2 : 9;
    this.cx += clamp(-this.cx, -4 * dt, 4 * dt);
    this.d += v * dt;
    this.moveBodies(dt, v);
    if (!touching) rv.d -= 6 * dt;
    // соперник держит строй
    for (let i = 0; i < rv.bodies.length; i++) {
      const b = rv.bodies[i];
      const s = slotOf(i, rv.bodies.length, rsh);
      const f = 1 - Math.exp(-b.k * dt);
      b.x += (s.sx - b.x) * f;
      b.d += (rv.d - s.sd - b.d) * f;
    }
    if (touching) {
      if (!this.touched) { this.touched = true; this.emit('clash-hit', { d: rFront }); }
      this.clashAcc = (this.clashAcc || 0) + dt;
      const tick = 1 / 30;
      while (this.clashAcc >= tick && this.count > 0 && rv.count > 0) {
        this.clashAcc -= tick;
        const n = Math.min(this.count, rv.count, Math.max(1, Math.ceil(Math.min(this.count, rv.count) / 40)));
        this.count -= n;
        rv.count -= n;
        // тела: ближние к сопернику
        this.trimFront(this.bodies, Math.min(this.count, this.cap), +1, 'clash');
        this.trimFront(rv.bodies, Math.min(rv.count, this.cap), -1, 'clash-r');
        this.emit('clash-tick', { n, d: rFront });
      }
      if (this.count <= 0) return this.lose();
      if (rv.count <= 0) {
        this.state = 'ladder';
        this.emit('clash-won', { left: this.count });
        this.sync();
      }
    }
  }

  trimFront(arr, want, dir, kind) {
    while (arr.length > want) {
      let bi = 0;
      for (let i = 1; i < arr.length; i++) if (arr[i].d * dir > arr[bi].d * dir) bi = i;
      const b = arr.splice(bi, 1)[0];
      this.ghost(b, kind === 'clash' ? 'clash' : 'clash', { rival: kind === 'clash-r', vx: (this.R() - 0.5) * 6, vy: 4 + this.R() * 4, vd: -dir * (2 + this.R() * 3) });
    }
  }

  stepLadder(dt, targetX) {
    const v = 10;
    this.cx += clamp(-this.cx, -5 * dt, 5 * dt);
    this.d += v * dt;
    this.moveBodies(dt, v);
    const front = this.d + this.shape.b;
    const stepD = (i) => this.ladderD0 + i * 8;
    while (this.ladderStep < LADDER.length && front >= stepD(this.ladderStep)) {
      const i = this.ladderStep;
      this.mult = LADDER[i];
      this.ladderStep++;
      const cost = i === LADDER.length - 1 ? this.count : Math.min(this.count, this.stepCost);
      this.count -= cost;
      // кто остался на ступени — встаёт и смотрит вслед
      let dropped = 0;
      while (this.bodies.length > Math.min(this.count, this.cap) && dropped < 60) {
        let bi = 0;
        for (let k = 1; k < this.bodies.length; k++) if (this.bodies[k].d > this.bodies[bi].d) bi = k;
        const b = this.bodies.splice(bi, 1)[0];
        this.ghost(b, 'stay', { d: stepD(i) + 2 + this.R() * 3, x: (this.R() - 0.5) * 7 });
        dropped++;
      }
      this.bodies.length = Math.min(this.bodies.length, Math.max(this.count, 0));
      this.emit('step', { i, mult: this.mult, d: stepD(i) });
      if (this.count <= 0) return this.win();
    }
    if (this.ladderStep >= LADDER.length) this.win();
  }

  stepIdle(dt) {
    this.moveBodies(dt, 0);
  }

  win() {
    this.state = 'win';
    this.result = { win: true, mult: this.mult || 1, coins: this.coins };
    this.emit('win', this.result);
  }
  lose() {
    if (this.state === 'lose') return;
    this.count = 0;
    while (this.bodies.length) this.ghost(this.bodies.pop(), 'poof');
    this.state = 'lose';
    this.result = { win: false, mult: 0, coins: this.coins };
    this.emit('lose', this.result);
  }
}

// —— автопилот: для баланса, ?auto и демо в меню ——
export function autoTarget(run) {
  const sh = run.shape;
  const front = run.d + sh.b;
  const ahead = run.items.filter((it) => !it.done && (it.d ?? it.d0) > front - sh.b * 2 - 2 && (it.d ?? it.d0) < front + 60);
  // 1) изгородь рядом — в проход
  const fence = ahead.find((it) => it.type === 'fence' && it.d - front < 28 && it.d > run.d - sh.b);
  if (fence) return (fence.g0 + fence.g1) / 2;
  // 2) валун: держаться той стороны, откуда он прикатился
  const rock = run.rocks.find((r) => r.d > run.d - sh.b - 1 && r.d - front < 22);
  let avoid = null;
  if (rock) {
    const passed = rock.dir > 0 ? rock.x > run.cx : rock.x < run.cx;
    avoid = passed ? null : clamp(rock.x - rock.dir * (sh.a + 2.5), -HALF + 1, HALF - 1);
  }
  // 3) лучшие ворота
  const gate = ahead.find((it) => it.type === 'gate' && it.d >= front - 0.5);
  let want = run.cx;
  if (gate) {
    if (gate.full) want = run.cx;
    else {
      const pack = (side) => run.wolves.filter((w) => (side < 0 ? w.x < 0 : w.x >= 0) && w.d < gate.d && w.d > run.d - sh.b).length;
      const val = (g, side) => (g.op === '$' ? run.count + 0.5 : g.op === '?' ? run.count * 1.15 + 2 : applyOp(run.count, g)) - pack(side) * 1.5;
      const ops = gateOpsAt(gate, run.t + Math.max(0, gate.d - front) / Math.max(1, run.speed));
      want = val(ops.left, -1) >= val(ops.right, 1) ? -2.6 : 2.6;
    }
  }
  // дикие кони — если по пути
  const wild = run.wild.filter((w) => w.d > front - 2 && w.d - front < 25);
  if (wild.length && (!gate || gate.d - front > 22)) want = wild.reduce((s, w) => s + w.x, 0) / wild.length;
  // стая без ворот рядом — в сторону
  const pk = run.wolves.filter((w) => w.d > run.d - sh.b && w.d - front < 26);
  if (pk.length && (!gate || gate.d - front > 30)) {
    const mx = pk.reduce((q, w) => q + w.x, 0) / pk.length;
    want = mx > 0 ? -HALF + sh.a * 0.6 + 0.3 : HALF - sh.a * 0.6 - 0.3;
  }
  if (avoid !== null) want = avoid;
  // 4) овраг на пути — важнее всего: туда не идём, даже уходя от валуна
  const pit = ahead.find((it) => it.type === 'pit' && it.d0 - front < 18 && it.d1 > run.d - sh.b);
  if (pit) {
    const left = pit.x0 - (-HALF), right = HALF - pit.x1;
    const wantIn = want + sh.a > pit.x0 && want - sh.a < pit.x1;
    if (wantIn) want = left > right ? (-HALF + pit.x0) / 2 : (pit.x1 + HALF) / 2;
  }
  return want;
}

export function simulate(L, opts = {}, policy = autoTarget) {
  const run = new Run(L, opts);
  let guard = 0;
  while (run.state !== 'clash' && run.state !== 'lose' && guard++ < 60 * 120) {
    run.step(DT, policy(run));
    run.events.length = 0;
  }
  return run.state === 'lose' ? 0 : run.count - (opts.leader || 0);
}

// награда за уровень
export function reward(L, result, incomeLvl = 0) {
  const k = 1 + incomeLvl * 0.1;
  if (!result.win) return Math.round(L.base * 0.25 * k) + result.coins;
  return Math.round(L.base * result.mult * (L.boss ? 2 : 1) * k) + result.coins;
}
