// The puzzle itself, without drawing. Everything is measured in board cells.
//
// The picture is a W x H grid of colored blocks. Around it runs a belt. A shooter sent onto the belt
// goes round it once, clockwise from the bottom-left corner; each time it passes a row or a column it
// shoots into it, and if the first block on that line is its own color, the block is gone and the
// shooter's number goes down. At zero the shooter is done. If it comes back with shots left it parks
// in the dock; when the dock is full and one more comes back, the level is lost.

export const DIRS = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };

// the lanes in the order a shooter meets them on one lap; s is the distance along the belt
export function buildLanes(W, H, m) {
  const lanes = [];
  const bottom = 0;
  const right = W + 2 * m;
  const top = right + H + 2 * m;
  const left = top + W + 2 * m;
  for (let x = 0; x < W; x++) lanes.push({ s: bottom + m + x + 0.5, dir: 'up', x, y: H - 1 });
  for (let k = 0; k < H; k++) lanes.push({ s: right + m + k + 0.5, dir: 'left', x: W - 1, y: H - 1 - k });
  for (let k = 0; k < W; k++) lanes.push({ s: top + m + k + 0.5, dir: 'down', x: W - 1 - k, y: 0 });
  for (let y = 0; y < H; y++) lanes.push({ s: left + m + y + 0.5, dir: 'right', x: 0, y });
  return { lanes, length: 2 * (W + 2 * m) + 2 * (H + 2 * m), corners: [bottom, right, top, left] };
}

// first block along a lane, or -1
export function firstInLane(grid, W, H, lane) {
  const [dx, dy] = DIRS[lane.dir];
  let x = lane.x;
  let y = lane.y;
  while (x >= 0 && y >= 0 && x < W && y < H) {
    const i = y * W + x;
    if (grid[i] >= 0) return i;
    x += dx;
    y += dy;
  }
  return -1;
}

// one lone lap of a shooter of this color: which blocks it takes (used by the level generator)
export function lap(grid, W, H, lanes, color, cap) {
  const taken = [];
  for (const lane of lanes) {
    if (taken.length >= cap) break;
    const i = firstInLane(grid, W, H, lane);
    if (i >= 0 && grid[i] === color) {
      grid[i] = -1;
      taken.push(i);
    }
  }
  return taken;
}

let nextId = 1;

export class Game {
  constructor(level, margin = 1.5) {
    this.level = level;
    this.W = level.W;
    this.H = level.H;
    this.grid = Int8Array.from(level.grid);
    this.left = this.grid.reduce((n, c) => n + (c >= 0 ? 1 : 0), 0);
    this.total = this.left;
    this.queues = level.queues.map((q) => q.map((s) => ({ id: nextId++, color: s.color, ammo: s.ammo, where: 'queue' })));
    this.dock = new Array(level.slots).fill(null);
    this.belt = [];
    this.pending = [];
    this.cap = level.beltCap;
    this.m = margin;
    const t = buildLanes(this.W, this.H, margin);
    this.lanes = t.lanes;
    this.length = t.length;
    this.corners = t.corners;
    // one lap takes about 5.5 s whatever the picture size
    this.speed = this.length / 5.5;
    this.gap = 1.9;
    this.events = [];
    this.state = 'play';
    this.time = 0;
    this.launched = 0;
    // how many times a shooter came back to the dock: zero means a clean solve
    this.docked = 0;
  }

  emit(e) {
    this.events.push(e);
  }

  get onBelt() {
    return this.belt.length + this.pending.length;
  }

  canLaunch() {
    return this.state === 'play' && this.onBelt < this.cap;
  }

  launchFromQueue(q) {
    const queue = this.queues[q];
    if (!queue || !queue.length || this.state !== 'play') return false;
    if (!this.canLaunch()) {
      this.emit({ type: 'beltFull' });
      return false;
    }
    const sh = queue.shift();
    sh.where = 'pending';
    this.pending.push(sh);
    this.launched++;
    this.emit({ type: 'launch', shooter: sh, from: 'queue', q });
    return true;
  }

  launchFromDock(d) {
    const sh = this.dock[d];
    if (!sh || this.state !== 'play') return false;
    if (!this.canLaunch()) {
      this.emit({ type: 'beltFull' });
      return false;
    }
    this.dock[d] = null;
    sh.where = 'pending';
    this.pending.push(sh);
    this.launched++;
    this.emit({ type: 'launch', shooter: sh, from: 'dock', d });
    return true;
  }

  update(dt) {
    if (this.state !== 'play') return;
    this.time += dt;
    // a waiting shooter gets on when the start of the belt is clear
    while (this.pending.length && !this.belt.some((b) => b.s < this.gap)) {
      const sh = this.pending.shift();
      sh.where = 'belt';
      sh.s = 0;
      this.belt.push(sh);
      this.emit({ type: 'enter', shooter: sh });
    }
    // the one furthest along moves first, so it gets the block when two aim at one line
    this.belt.sort((a, b) => b.s - a.s);
    for (const sh of this.belt) {
      const s0 = sh.s;
      const s1 = s0 + this.speed * dt;
      for (const lane of this.lanes) {
        if (lane.s <= s0 || lane.s > s1) continue;
        if (sh.ammo <= 0) break;
        const i = firstInLane(this.grid, this.W, this.H, lane);
        if (i >= 0 && this.grid[i] === sh.color) {
          this.grid[i] = -1;
          this.left--;
          sh.ammo--;
          this.emit({ type: 'shot', shooter: sh, cell: i, color: sh.color, lane });
        }
      }
      sh.s = s1;
      if (sh.ammo <= 0) {
        sh.where = 'spent';
        this.emit({ type: 'spent', shooter: sh });
      } else if (sh.s >= this.length) {
        const slot = this.dock.indexOf(null);
        if (slot < 0) {
          sh.where = 'overflow';
          this.state = 'lost';
          this.emit({ type: 'overflow', shooter: sh });
        } else {
          sh.where = 'dock';
          this.dock[slot] = sh;
          this.docked++;
          this.emit({ type: 'dock', shooter: sh, slot });
        }
      }
    }
    this.belt = this.belt.filter((sh) => sh.where === 'belt');
    // a cleared picture wins even if the dock overflowed in the same frame
    if (this.left === 0 && this.state !== 'won') {
      this.state = 'won';
      this.emit({ type: 'win' });
    }
  }
}
