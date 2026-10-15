import { easeIn, easeInOut, wrap, rng, mix } from './util.js';
import { SPRITES, VEHICLES } from './sprites.js';

// The road is the classic pseudo-3D one: a list of flat segments projected onto
// the screen, with curves faked by shifting each segment sideways.
export const SEG = 200;
export const RUMBLE = 3;
export const ROAD_W = 2000;
export const CAM_H = 1000;
export const FOV = 100;
export const CAM_DEPTH = 1 / Math.tan(((FOV / 2) * Math.PI) / 180);
// how far ahead of the camera the car sits; further back shows it smaller with more road in front
export let PLAYER_Z = CAM_H * CAM_DEPTH;
export function setCameraBack(k) {
  PLAYER_Z = CAM_H * CAM_DEPTH * k;
}
export const BASE_MAX = SEG * 60;
export const CAR_W = 640;
export const PLAYER_W = CAR_W / ROAD_W;
export const KMH_AT_MAX = 240;
export const TUNNEL_H = 2300;
export const GATE_AT = 8;
export const M_PER_SEG = KMH_AT_MAX / 3.6 / 60;

export class Track {
  constructor(map) {
    this.map = map;
    this.segments = [];
    this.zoneStart = [];
    this.zoneIndex = -1;
    this.inTunnel = false;
    this.lanes = map.lanes;
    this.laneX = map.lanes === 3 ? [-2 / 3, 0, 2 / 3] : [-0.5, 0.5];
    this.cars = [];
    map.build(this);
    this.length = this.segments.length * SEG;
    this.zoneSeconds = this.zoneStart.map((start, z) => {
      const end = z + 1 < this.zoneStart.length ? this.zoneStart[z + 1] : this.segments.length;
      return Math.round((end - start) / 52);
    });
    const r = rng(map.seed || 1);
    for (const seg of this.segments) map.decorate(this, seg, r);
    for (const [i, type, offset, extra] of map.extras ? map.extras(this) : []) this.addSprite(i, type, offset, extra, true);
    if (map.fun) this.placeFun(map.fun, r);
    this.placeTraps(map, r);
    this.placeExtras(map, r);
    for (let z = 0; z < this.zoneStart.length; z++) {
      const seg = this.segments[this.zoneStart[z] + GATE_AT];
      seg.gate = z + 1;
      seg.sprites = seg.sprites.filter((s) => Math.abs(s.offset) > 1.7);
    }
    this.light();
    this.paint();
    this.dynamic = [];
    for (const seg of this.segments) {
      for (const s of seg.sprites) {
        if (s.def.walker || s.def.breakable || s.def.cop || s.def.sheep || s.def.pickup || s.def.tumble) {
          s.base = s.offset;
          s.home = s.offset;
          this.dynamic.push(s);
        }
      }
    }
    this.resetDynamic();
  }

  resetDynamic() {
    for (const s of this.dynamic) {
      Object.assign(s, { offset: s.home, base: s.home, t0: 0, fly: false, gone: false, dodge: false, say: null, sayUntil: 0, lift: 0, rot: 0, alpha: 1, checked: false, scatter: false, vx: s.vx0 ?? s.vx });
    }
  }

  // ---------- builder API used by maps ----------

  lastY() {
    return this.segments.length ? this.segments[this.segments.length - 1].p2.y : 0;
  }
  addSegment(curve, y) {
    const n = this.segments.length;
    this.segments.push({
      i: n,
      p1: { y: this.lastY(), z: n * SEG },
      p2: { y, z: (n + 1) * SEG },
      curve,
      zone: this.zoneIndex,
      sprites: [],
      cars: [],
      gate: 0,
      lit: 0,
      tunnel: this.inTunnel,
    });
  }
  road(enter, hold, leave, curve = 0, hill = 0) {
    const startY = this.lastY();
    const endY = startY + Math.round(hill) * SEG;
    const total = enter + hold + leave;
    for (let n = 0; n < enter; n++) this.addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
    for (let n = 0; n < hold; n++) this.addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
    for (let n = 0; n < leave; n++) this.addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    return this;
  }
  zone() {
    this.zoneIndex++;
    this.zoneStart[this.zoneIndex] = this.segments.length;
    return this;
  }
  tunnel(on) {
    this.inTunnel = on;
    return this;
  }
  // brings the road back to the starting height so the lap loops cleanly
  home(len = 100, curve = 2) {
    this.road(len, len, len, curve, -Math.round(this.lastY() / SEG));
    this.road(30, 40, 30, 0, 0);
    return this;
  }

  addSprite(i, type, offset, extra, force) {
    const seg = this.segments[wrap(i, this.segments.length)];
    if (!force && seg.tunnel && offset > 0) return;
    const def = SPRITES[type];
    if (!def) return;
    if (force) {
      seg.sprites = seg.sprites.filter((s) => Math.sign(s.offset) !== Math.sign(offset) || Math.abs(Math.abs(s.offset) - Math.abs(offset)) > 0.9);
    }
    seg.sprites.push({ def, type, offset, ...extra });
  }

  // people on the pavements and things to knock over
  placeFun(fun, r) {
    const coats = ['#3a4a6a', '#7a3a3a', '#2f5a4a', '#8a6a3a', '#4a4a4a', '#6a4a8a', '#b03a3a', '#2f6fbf'];
    const pants = ['#2a2d35', '#3a3428', '#1f2a3a', '#4a3a2a'];
    const hats = ['#c0392b', '#2f5fbf', '#f2b705', '#e8e8e8', '#18a39a'];
    for (const seg of this.segments) {
      if (seg.tunnel || !fun.zones.includes(seg.zone)) continue;
      if (r() < fun.walkers) {
        const side = r() < 0.5 ? -1 : 1;
        seg.sprites.push({
          def: SPRITES.walker,
          type: 'walker',
          offset: side * (1.3 + r() * 0.35),
          coat: coats[Math.floor(r() * coats.length)],
          pants: pants[Math.floor(r() * pants.length)],
          hat: fun.hats ? hats[Math.floor(r() * hats.length)] : (r() < 0.15 ? '#3a3a3a' : null),
          phase: r() * 6,
        });
      }
      for (const [type, chance, extra] of fun.props || []) {
        if (r() < chance) {
          const side = r() < 0.5 ? -1 : 1;
          // clear the shoulder around it, so driving at it ends in a laugh and not in a lamp post
          for (let d = -3; d <= 2; d++) {
            const near = this.segments[wrap(seg.i + d, this.segments.length)];
            near.sprites = near.sprites.filter((s) => s.def.walker || s.def.breakable || Math.sign(s.offset) !== side || Math.abs(s.offset) > 1.9);
          }
          seg.sprites.push({ def: SPRITES[type], type, offset: side * (1.22 + r() * 0.25), phase: r() * 6, ...(extra || {}) });
        }
      }
    }
    for (const [start, count, offset] of fun.cones || []) {
      for (let k = 0; k < count; k++) {
        const seg = this.segments[wrap(this.zoneStart[start[0]] + start[1] + k * 3, this.segments.length)];
        seg.sprites.push({ def: SPRITES.cone, type: 'cone', offset });
      }
    }
  }

  // baursaks to pick up, potholes, speed bumps with zebra crossings
  placeExtras(map, r) {
    const N = this.segments.length;
    const start = GATE_AT + 40;
    for (let i = start; i < N - 30; i += 150 + Math.floor(r() * 80)) {
      const lane = this.laneX[Math.floor(r() * this.laneX.length)];
      for (let k = 0; k < 4; k++) {
        this.segments[i + k * 3].sprites.push({ def: SPRITES.baursak, type: 'baursak', offset: lane, phase: r() * 6 });
      }
    }
    const holes = map.holes || 0;
    for (const seg of this.segments) {
      if (seg.i > start && !seg.tunnel && r() < holes) {
        seg.hole = { offset: -0.75 + r() * 1.5, size: 0.1 + r() * 0.08 };
      }
    }
    // puddles after the rain, slush in the mountains, mud on the steppe
    const pd = map.puddles;
    if (pd) {
      for (const seg of this.segments) {
        if (seg.i > start && seg.i < N - 20 && !seg.tunnel && !seg.hole && r() < pd.rate) {
          seg.puddle = { offset: -0.7 + r() * 1.4, size: 0.14 + r() * 0.08, kind: pd.kind };
        }
      }
    }
    // black ice: a stretch of glossy road, one lane or the whole width
    for (let k = 0; k < (map.ice || 0); k++) {
      const i = start + Math.floor(r() * (N - start - 60));
      const len = 8 + Math.floor(r() * 10);
      const wide = r() < 0.35;
      const center = wide ? 0 : this.laneX[Math.floor(r() * this.laneX.length)];
      const half = wide ? 0.95 : 0.3;
      for (let d = 0; d < len; d++) this.segments[i + d].ice = { center, half };
    }
    // tumbleweeds wait on the shoulders and roll across when the car comes
    for (let k = 0; k < (map.tumbleweeds || 0); k++) {
      const i = start + Math.floor(r() * (N - start - 40));
      const side = r() < 0.5 ? -1 : 1;
      const vx = -side * (0.45 + r() * 0.35);
      this.segments[i].sprites.push({ def: SPRITES.tumble, type: 'tumble', offset: side * (1.5 + r() * 0.4), vx, vx0: vx, phase: r() * 6 });
    }
    for (const [z, off] of map.bumps || []) {
      const i = wrap(this.zoneStart[z] + off, N);
      this.segments[i].bump = true;
      this.segments[wrap(i + 2, N)].zebra = true;
      this.segments[wrap(i + 3, N)].zebra = true;
    }
  }

  // a speed-limit sign, then a traffic cop with a radar and his car; flocks of sheep with a shepherd
  placeTraps(map, r) {
    const N = this.segments.length;
    const at = (z, off) => wrap(this.zoneStart[z] + off, N);
    const clear = (i, side) => {
      for (let d = -3; d <= 3; d++) {
        const seg = this.segments[wrap(i + d, N)];
        seg.sprites = seg.sprites.filter((s) => Math.sign(s.offset) !== side || Math.abs(s.offset) > 2.4);
      }
    };
    for (const [z, off] of map.police || []) {
      const i = at(z, off);
      clear(i, 1);
      clear(i - 110, 1);
      this.segments[wrap(i - 110, N)].sprites.push({ def: SPRITES.limit, type: 'limit', offset: 1.25, limit: 200, radar: true });
      this.segments[i].sprites.push({ def: SPRITES.cop, type: 'cop', offset: 1.38, radar: true });
      this.segments[wrap(i + 3, N)].sprites.push({ def: SPRITES.policecar, type: 'policecar', offset: 1.5, radar: true });
    }
    // a herd of sheep, or of horses where the map says so
    const COATS = ['#6b3f22', '#3b2a1e', '#a0662f', '#d8d2c8', '#8a5a3a'];
    for (const [z, off, count, kind] of map.herds || []) {
      const i = at(z, off);
      clear(i - 45, 1);
      this.segments[wrap(i - 45, N)].sprites.push({ def: SPRITES.sign, type: 'sign', offset: 1.25, label: { ru: 'Скот на дороге', en: 'Livestock' }, color: '#8a6d12', herd: true });
      for (let k = 0; k < count; k++) {
        const vx = (0.12 + r() * 0.22) * (r() < 0.5 ? -1 : 1);
        const horse = kind === 'horse';
        this.segments[wrap(i + Math.floor(k * (horse ? 1.4 : 0.9)), N)].sprites.push({
          def: horse ? SPRITES.horse : SPRITES.sheep,
          type: horse ? 'horse' : 'sheep',
          offset: -1.1 + r() * 2.2,
          vx,
          vx0: vx,
          phase: r() * 6,
          wool: r() < 0.15 ? '#3a332c' : r() < 0.3 ? '#d9cbb0' : '#f1ede4',
          coat: COATS[Math.floor(r() * COATS.length)],
          herd: true,
        });
      }
      this.segments[wrap(i + 2, N)].sprites.push({ def: SPRITES.walker, type: 'walker', offset: -1.5, coat: '#6b4a2a', pants: '#2a2d35', hat: '#2b2b2b', shepherd: true, herd: true });
    }
  }

  segAt(z) {
    return this.segments[Math.floor(z / SEG) % this.segments.length];
  }

  // ---------- colors ----------

  light() {
    const N = this.segments.length;
    for (const seg of this.segments) {
      const lamp = seg.sprites.some((s) => s.type === 'lamp') || (seg.tunnel && seg.i % 6 === 0);
      if (!lamp) continue;
      for (let d = -4; d <= 4; d++) {
        const other = this.segments[wrap(seg.i + d, N)];
        other.lit = Math.max(other.lit, 1 - Math.abs(d) / 5);
      }
    }
  }

  paint() {
    const m = this.map;
    const night = m.sky.night;
    const r = rng((m.seed || 1) + 77);
    for (const seg of this.segments) {
      const wear = r();
      seg.patch = r() < 0.045 ? { from: -0.9 + r() * 1.2, width: 0.25 + r() * 0.4 } : null;
      const light = Math.floor(seg.i / RUMBLE) % 2 === 0;
      const ground = m.ground[Math.max(0, seg.zone)] || m.ground[0];
      const k = seg.lit * night;
      let road = mix(m.road[light ? 0 : 1], '#e9b36d', k * 0.2);
      let grass = mix(ground[light ? 0 : 1], '#e9b36d', k * 0.12);
      let rumble = light ? mix(m.rumble[0], '#ffe2b0', k * 0.3) : mix(m.rumble[1], '#ffe2b0', k * 0.28);
      let lane = light ? mix(m.lane, '#fff0d0', k * 0.4) : null;
      if (m.lanes === 2 && m.solidCenter) lane = mix(m.lane, '#fff0d0', k * 0.3);
      if (seg.tunnel) {
        const dim = 0.45 - seg.lit * 0.25;
        road = mix(road, '#05070c', dim);
        grass = mix('#3a3e47', '#05070c', dim + 0.1);
        rumble = mix(rumble, '#05070c', dim);
        if (lane) lane = mix(lane, '#05070c', dim * 0.6);
      }
      // asphalt and ground are never perfectly even
      road = mix(road, '#000000', wear * 0.05);
      grass = mix(grass, wear > 0.5 ? '#ffffff' : '#000000', Math.abs(wear - 0.5) * 0.05);
      const edge = seg.tunnel ? mix(m.lane, '#05070c', 0.4) : mix(m.lane, '#fff0d0', k * 0.3);
      seg.color = { road, grass, rumble, lane, edge };
    }
  }

  // ---------- traffic ----------

  // the five friends start a little ahead and race the whole lap
  addFriends(list, seed) {
    const r = rng(seed);
    list.forEach((f, k) => {
      const segIndex = GATE_AT + 24 + k * 16 + Math.floor(r() * 8);
      const lane = this.lanes === 3 ? this.laneX[k % 3] : this.laneX[1];
      const base = BASE_MAX * (0.68 + k * 0.025 + r() * 0.03);
      const car = {
        offset: lane,
        target: lane,
        z: segIndex * SEG,
        speed: base,
        base,
        dir: 1,
        kind: f.kind,
        w: CAR_W * (VEHICLES[f.kind] ? VEHICLES[f.kind].scale : 1),
        color: f.color,
        percent: 0,
        rel: null,
        friend: true,
        name: f.name,
        model: f.model,
        travel: segIndex * SEG,
      };
      this.segments[segIndex].cars.push(car);
      this.cars.push(car);
    });
  }

  spawnCars(seed, scale = 1) {
    for (const seg of this.segments) seg.cars.length = 0;
    this.cars = [];
    const tr = this.map.traffic;
    const r = rng(seed);
    const count = Math.round(tr.count * scale);
    const pick = () => {
      const roll = r() * tr.kinds.reduce((a, k) => a + k[1], 0);
      let acc = 0;
      for (const [kind, weight] of tr.kinds) {
        acc += weight;
        if (roll <= acc) return kind;
      }
      return tr.kinds[0][0];
    };
    for (let n = 0; n < count; n++) {
      const oncoming = this.lanes === 2 && r() < (tr.oncoming || 0);
      const segIndex = 50 + Math.floor(r() * (this.segments.length - 70));
      const kind = pick();
      const big = kind === 'truck' || kind === 'bus' || kind === 'plow';
      let offset;
      if (this.lanes === 3) offset = this.laneX[Math.floor(r() * 3)];
      else offset = oncoming ? this.laneX[0] : this.laneX[1];
      const base = BASE_MAX * (tr.min + r() * (tr.max - tr.min)) * (big ? 0.82 : 1);
      const car = {
        offset: offset + (r() - 0.5) * 0.08,
        z: segIndex * SEG,
        speed: oncoming ? -base : base,
        dir: oncoming ? -1 : 1,
        kind,
        w: CAR_W * (VEHICLES[kind] ? VEHICLES[kind].scale : 1),
        color: tr.colors[Math.floor(r() * tr.colors.length)],
        percent: 0,
        rel: null,
      };
      this.segments[segIndex].cars.push(car);
      this.cars.push(car);
    }
  }
}
