// The mansion: a 1 m grid that drives everything — rendering, collisions, bullets, bot paths.
// Lighting is baked once into vertex colours (sun, shadows, corner darkening, ceiling lamps),
// so the static level renders with unlit materials: cheap enough for integrated graphics.
import * as THREE from '../vendor/three.module.min.js';
import { TEX_SIZE } from './textures.js';

export const W = 72, H = 64, CEIL = 4, STEP = 0.45;
// the outside walls rise to a second storey (only seen from outside; the rooms keep their 4 m ceiling)
export const FACADE = 7.4;
export const HOUSE = { x0: 10, z0: 8, x1: 62, z1: 46 };
const LM_RES = 6, LM_SCALE = 1.8;
let LM_CACHE = null;

export const FL = { GRASS: 1, PAVE: 2, TERRACE: 3, WOOD: 4, MARBLE: 5, CARPET: 6, TILE: 7, CONCRETE: 8, PARQUET: 9, DARKWOOD: 10, GRAVEL: 11 };
const FLOOR_TEX = { 1: 'grass', 2: 'pave', 3: 'terrace', 4: 'wood', 5: 'marble', 6: 'carpet', 7: 'tile', 8: 'concrete', 9: 'parquet', 10: 'darkwood', 11: 'gravel' };
const WALL_TEX = { 5: 'w_hall', 6: 'w_lib', 8: 'w_garage', 7: 'w_kitchen', 4: 'w_dining', 10: 'w_lounge', 9: 'w_corr' };

export const K = {
  WALL: 1, STONE: 2, CRATE: 3, SHELF: 4, COUNTER: 5, TABLE: 6, SOFA: 7, HEDGE: 8, CAR: 9, PILLAR: 10, FIRE: 11,
  PIANO: 12, VAN: 13, FOUNTAIN: 14, WATER: 15, METALSHELF: 16, FRIDGE: 17, PLANT: 18, LOUNGER: 19, SHED: 20,
  CABINET: 21, WINDOW: 22, STATUE: 23,
};
const KIND_TEX = {
  2: 'stone', 3: 'crate', 4: 'shelf', 5: 'counter', 6: 'table', 7: 'sofa', 8: 'hedge', 9: 'car', 10: 'pillar', 11: 'fire',
  12: 'piano', 13: 'van', 14: 'fountain', 15: 'water', 16: 'metalshelf', 17: 'fridge', 18: 'plant', 19: 'lounger',
  20: 'shed', 21: 'cabinet', 23: 'fountain',
};
// drawn as real models (props.js) when those have loaded; the grid boxes stay for collisions
export const MODELLED = new Set([7, 6, 21, 9, 16]); // SOFA, TABLE, CABINET, CAR, METALSHELF
// surface sound / impact colour
export const SURF = { soft: [7, 8, 18, 19], wood: [3, 4, 6, 12, 20, 21], metal: [9, 13, 16, 17] };

// sun comes from the south-west, high in the sky
const SUN = new THREE.Vector3(-0.5, 0.78, 0.38).normalize();

// the pool: water surface (the top of the water cells) and the tiled bottom
export const WATER_Y = 0.12, POOL_BOTTOM = -1.5;

export const ROOMS = {
  1: { name: 'library', x0: 11, z0: 31, x1: 26, z1: 45 },
  2: { name: 'hall', x0: 28, z0: 31, x1: 44, z1: 45 },
  3: { name: 'garage', x0: 46, z0: 31, x1: 61, z1: 45 },
  4: { name: 'corridor', x0: 11, z0: 26, x1: 61, z1: 29 },
  5: { name: 'kitchen', x0: 11, z0: 9, x1: 23, z1: 24 },
  6: { name: 'dining', x0: 25, z0: 9, x1: 40, z1: 24 },
  7: { name: 'lounge', x0: 42, z0: 9, x1: 61, z1: 24 },
};

export class GameMap {
  constructor() {
    const n = W * H;
    this.h = new Float32Array(n);
    this.kind = new Uint8Array(n);
    this.floor = new Uint8Array(n);
    this.indoor = new Uint8Array(n);
    this.lint = new Float32Array(n);
    this.noWalk = new Uint8Array(n);
    this.zone = new Uint8Array(n); // 1 attackers spawn + rescue, 2 defenders spawn
    this.room = new Uint8Array(n);
    this.lamps = [];
    this.build();
    this.walk = new Uint8Array(n);
    this.cost = new Float32Array(n);
    for (let i = 0; i < n; i++) this.walk[i] = this.h[i] === 0 && !this.noWalk[i] ? 1 : 0;
    // cells a soldier can jump onto and over: window sills and waist-high crates
    this.hop = new Uint8Array(n);
    for (let i = 0; i < n; i++) if ((this.kind[i] === K.WINDOW && this.h[i] <= 1.05) || (this.kind[i] === K.CRATE && this.h[i] <= 1.0)) this.hop[i] = this.kind[i] === K.WINDOW ? 1 : 2;
    for (let z = 0; z < H; z++)
      for (let x = 0; x < W; x++) {
        let c = 1;
        for (let dz = -1; dz <= 1; dz++)
          for (let dx = -1; dx <= 1; dx++) if (!this.walkable(x + dx, z + dz)) c = 1.8;
        this.cost[z * W + x] = c;
      }
  }

  idx(x, z) {
    return z * W + x;
  }
  inb(x, z) {
    return x >= 0 && z >= 0 && x < W && z < H;
  }
  walkable(x, z) {
    return this.inb(x, z) && this.walk[z * W + x] === 1;
  }
  cellAt(x, z) {
    const cx = Math.floor(x), cz = Math.floor(z);
    return this.inb(cx, cz) ? cz * W + cx : -1;
  }
  isIndoor(x, z) {
    const c = this.cellAt(x, z);
    return c >= 0 && this.indoor[c] === 1;
  }
  roomAt(x, z) {
    const c = this.cellAt(x, z);
    return c >= 0 ? this.room[c] : 0;
  }

  // ---------- level layout ----------
  build() {
    const { h, kind, floor, indoor, lint, noWalk, zone, room } = this;
    const each = (x0, z0, x1, z1, f) => {
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (this.inb(x, z)) f(z * W + x, x, z);
    };
    const fill = (x0, z0, x1, z1, fl, ind = 0) =>
      each(x0, z0, x1, z1, (c) => {
        floor[c] = fl;
        indoor[c] = ind;
        h[c] = 0;
        kind[c] = 0;
        lint[c] = 0;
      });
    const solid = (x0, z0, x1, z1, height, k) =>
      each(x0, z0, x1, z1, (c) => {
        h[c] = height;
        kind[c] = k;
        lint[c] = 0;
      });
    const rectWall = (x0, z0, x1, z1, height, k) => {
      solid(x0, z0, x1, z0, height, k);
      solid(x0, z1, x1, z1, height, k);
      solid(x0, z0, x0, z1, height, k);
      solid(x1, z0, x1, z1, height, k);
    };
    const door = (x0, z0, x1, z1, lintel = 2.6, fl = 0) =>
      each(x0, z0, x1, z1, (c) => {
        h[c] = 0;
        kind[c] = 0;
        lint[c] = lintel;
        if (fl) floor[c] = fl;
      });
    const win = (x0, z0, x1, z1) =>
      each(x0, z0, x1, z1, (c) => {
        h[c] = 1.0;
        kind[c] = K.WINDOW;
        lint[c] = 2.9;
      });
    const lamps = (r, x0, z0, x1, z1, step = 6) => {
      const nx = Math.max(1, Math.round((x1 - x0 + 1) / step)), nz = Math.max(1, Math.round((z1 - z0 + 1) / step));
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < nz; j++)
          this.lamps.push({ x: x0 + ((i + 0.5) * (x1 - x0 + 1)) / nx, z: z0 + ((j + 0.5) * (z1 - z0 + 1)) / nz, room: r });
    };

    // grounds
    fill(0, 0, W - 1, H - 1, FL.GRASS);
    fill(11, 47, 60, 62, FL.PAVE);
    fill(63, 28, 70, 62, FL.PAVE);
    fill(1, 1, 70, 7, FL.TERRACE);
    fill(3, 9, 6, 58, FL.GRAVEL);
    fill(34, 47, 37, 49, FL.PAVE);

    // mansion floors
    fill(10, 8, 62, 46, FL.PARQUET, 1);
    for (const [r, R] of Object.entries(ROOMS)) {
      const fl = { library: FL.CARPET, hall: FL.MARBLE, garage: FL.CONCRETE, corridor: FL.PARQUET, kitchen: FL.TILE, dining: FL.WOOD, lounge: FL.DARKWOOD }[R.name];
      fill(R.x0, R.z0, R.x1, R.z1, fl, 1);
      each(R.x0, R.z0, R.x1, R.z1, (c) => (room[c] = +r));
      lamps(+r, R.x0, R.z0, R.x1, R.z1, R.name === 'corridor' ? 7 : 6);
    }

    // walls
    rectWall(0, 0, W - 1, H - 1, 3.2, K.STONE);
    rectWall(10, 8, 62, 46, CEIL, K.WALL);
    solid(10, 30, 62, 30, CEIL, K.WALL);
    solid(10, 25, 62, 25, CEIL, K.WALL);
    solid(27, 30, 27, 46, CEIL, K.WALL);
    solid(45, 30, 45, 46, CEIL, K.WALL);
    solid(24, 8, 24, 25, CEIL, K.WALL);
    solid(41, 8, 41, 25, CEIL, K.WALL);

    // outside doors
    door(34, 46, 37, 46, 3.0, FL.MARBLE);
    door(10, 27, 10, 28, 2.6, FL.PARQUET);
    door(62, 27, 62, 28, 2.6, FL.PARQUET);
    door(62, 35, 62, 41, 3.0, FL.CONCRETE);
    door(10, 12, 10, 13, 2.6, FL.TILE);
    door(15, 8, 16, 8, 2.6, FL.TILE);
    door(31, 8, 34, 8, 2.8, FL.WOOD);
    door(51, 8, 53, 8, 2.8, FL.DARKWOOD);
    // inside doors
    door(32, 30, 39, 30, 3.2, FL.MARBLE);
    door(18, 30, 19, 30, 2.6, FL.CARPET);
    door(50, 30, 51, 30, 2.6, FL.CONCRETE);
    door(27, 40, 27, 41, 2.6, FL.CARPET);
    door(45, 37, 45, 38, 2.6, FL.MARBLE);
    door(19, 25, 20, 25, 2.6, FL.TILE);
    door(30, 25, 32, 25, 2.8, FL.WOOD);
    door(47, 25, 48, 25, 2.6, FL.DARKWOOD);
    door(56, 25, 57, 25, 2.6, FL.DARKWOOD);
    door(24, 15, 24, 16, 2.6, FL.TILE);
    door(41, 13, 41, 14, 2.6, FL.WOOD);
    // windows: waist-high sills you can vault over and shoot through
    win(14, 46, 16, 46);
    win(21, 46, 23, 46);
    win(29, 46, 31, 46);
    win(40, 46, 42, 46);
    win(48, 46, 50, 46);
    win(56, 46, 58, 46);
    win(10, 33, 10, 35);
    win(10, 18, 10, 20);
    win(19, 8, 21, 8);
    win(37, 8, 39, 8);
    win(44, 8, 46, 8);
    win(57, 8, 59, 8);
    win(62, 13, 62, 15);
    win(62, 19, 62, 21);

    // library
    solid(13, 33, 19, 33, 2.6, K.SHELF);
    solid(13, 37, 19, 37, 2.6, K.SHELF);
    solid(21, 34, 25, 34, 2.6, K.SHELF);
    solid(21, 41, 23, 42, 0.8, K.TABLE);
    solid(11, 44, 11, 45, 1.0, K.CABINET);
    // hall
    solid(30, 33, 30, 33, CEIL, K.PILLAR);
    solid(41, 33, 41, 33, CEIL, K.PILLAR);
    solid(30, 42, 30, 42, CEIL, K.PILLAR);
    solid(41, 42, 41, 42, CEIL, K.PILLAR);
    solid(35, 37, 36, 38, 2.3, K.STATUE);
    solid(28, 44, 28, 45, 1.2, K.PLANT);
    solid(43, 31, 43, 31, 2.2, K.CABINET);
    solid(44, 44, 44, 45, 1.2, K.PLANT);
    // garage
    solid(52, 37, 53, 40, 1.4, K.CAR);
    solid(47, 43, 48, 44, 1.0, K.CRATE);
    solid(47, 44, 47, 44, 2.0, K.CRATE);
    solid(54, 31, 60, 31, 2.2, K.METALSHELF);
    solid(57, 44, 60, 45, 1.0, K.COUNTER);
    solid(58, 35, 59, 35, 1.0, K.CRATE);
    // corridor
    solid(22, 26, 22, 26, 1.2, K.PLANT);
    solid(40, 26, 41, 26, 1.0, K.CABINET);
    solid(44, 29, 44, 29, 1.0, K.CRATE);
    solid(55, 26, 55, 26, 1.2, K.PLANT);
    solid(28, 29, 28, 29, 1.0, K.CRATE);
    // kitchen
    solid(11, 16, 11, 22, 1.0, K.COUNTER);
    solid(18, 9, 22, 9, 1.0, K.COUNTER);
    solid(15, 15, 19, 17, 1.0, K.COUNTER);
    solid(23, 9, 23, 10, 2.2, K.FRIDGE);
    solid(21, 21, 22, 22, 1.0, K.CRATE);
    // dining
    solid(29, 15, 36, 17, 0.8, K.TABLE);
    solid(35, 24, 39, 24, 1.0, K.CABINET);
    solid(25, 10, 25, 11, 2.2, K.SHELF);
    solid(40, 20, 40, 22, 1.0, K.CABINET);
    // lounge
    solid(46, 16, 49, 16, 0.8, K.SOFA);
    solid(44, 12, 44, 15, 0.8, K.SOFA);
    solid(47, 13, 48, 14, 0.5, K.TABLE);
    solid(54, 9, 56, 9, 1.8, K.FIRE);
    solid(58, 19, 60, 21, 1.1, K.PIANO);
    solid(43, 22, 46, 22, 1.1, K.COUNTER);
    solid(54, 16, 55, 17, 1.0, K.SOFA);

    // front courtyard
    solid(33, 50, 38, 53, 0.8, K.FOUNTAIN);
    solid(35, 51, 36, 52, 2.2, K.STATUE);
    solid(19, 51, 21, 56, 2.4, K.VAN);
    solid(50, 52, 51, 55, 1.4, K.CAR);
    solid(11, 48, 19, 48, 1.1, K.HEDGE);
    solid(22, 48, 31, 48, 1.1, K.HEDGE);
    solid(40, 48, 49, 48, 1.1, K.HEDGE);
    solid(52, 48, 60, 48, 1.1, K.HEDGE);
    solid(28, 55, 28, 55, 1.0, K.CRATE);
    solid(44, 55, 45, 55, 1.0, K.CRATE);
    solid(45, 55, 45, 55, 2.0, K.CRATE);
    solid(14, 58, 15, 59, 1.0, K.CRATE);
    solid(57, 58, 58, 58, 1.0, K.CRATE);
    // west garden
    solid(1, 14, 2, 19, 2.6, K.SHED);
    solid(1, 26, 2, 26, 2.2, K.HEDGE);
    solid(7, 30, 9, 30, 2.2, K.HEDGE); // clear of the library window (10,33-35)
    solid(1, 42, 2, 42, 2.2, K.HEDGE);
    solid(7, 50, 9, 50, 2.2, K.HEDGE);
    solid(7, 22, 8, 22, 1.0, K.CRATE);
    solid(1, 38, 1, 38, 1.0, K.CRATE);
    // east garden
    solid(66, 46, 68, 51, 2.4, K.VAN);
    solid(64, 31, 65, 32, 1.0, K.CRATE);
    solid(64, 31, 64, 31, 2.0, K.CRATE);
    solid(64, 17, 67, 17, 2.2, K.HEDGE); // between the lounge windows, not in front of them
    solid(68, 12, 70, 12, 2.2, K.HEDGE);
    solid(69, 38, 70, 39, 1.0, K.CRATE);
    solid(68, 57, 69, 58, 1.0, K.CRATE);
    // north terrace and pool
    solid(24, 2, 45, 5, 0.12, K.WATER);
    each(24, 2, 45, 5, (c) => (noWalk[c] = 1));
    solid(48, 2, 49, 2, 0.5, K.LOUNGER);
    solid(48, 4, 49, 4, 0.5, K.LOUNGER);
    solid(20, 2, 21, 2, 0.5, K.LOUNGER);
    solid(11, 3, 13, 3, 1.1, K.HEDGE);
    solid(58, 3, 60, 3, 1.1, K.HEDGE);
    solid(12, 6, 12, 6, 1.0, K.CRATE);
    solid(66, 4, 67, 5, 1.0, K.CRATE);

    // the outer walls of the house go up to the roof of the second storey
    each(HOUSE.x0, HOUSE.z0, HOUSE.x1, HOUSE.z1, (c, x, z) => {
      const edge = x === HOUSE.x0 || x === HOUSE.x1 || z === HOUSE.z0 || z === HOUSE.z1;
      if (edge && kind[c] === K.WALL) h[c] = FACADE;
    });

    // zones
    each(26, 57, 46, 62, (c) => (zone[c] = 1));
    each(12, 1, 22, 6, (c) => (zone[c] = 2));
    each(47, 1, 60, 6, (c) => (zone[c] = 2));

    this.spawns = {
      A: [[30.5, 59.5], [33.5, 60.5], [36.5, 59.5], [39.5, 60.5], [42.5, 59.5], [31.5, 61.5], [41.5, 61.5]],
      B: [[14.5, 4.5], [17.5, 5.5], [21.5, 4.5], [52.5, 3.5], [56.5, 5.5], [55.5, 1.5], [16.5, 1.5]],
    };
    this.hostageSpots = [[58.5, 12.5], [14.5, 22.5]];
    // where defenders wait, and what they watch
    this.holds = [
      { x: 55.5, z: 21.5, lx: 47.5, lz: 25.5, h: 0 },
      { x: 50.5, z: 11.5, lx: 52, lz: 7, h: 0 },
      { x: 60.5, z: 23.5, lx: 56.5, lz: 25.5, h: 0 },
      { x: 20.5, z: 19.5, lx: 19.5, lz: 25.5, h: 1 },
      { x: 13.5, z: 11.5, lx: 10, lz: 12.5, h: 1 },
      { x: 16.5, z: 23.5, lx: 11, lz: 19, h: 1 },
      { x: 36.5, z: 27.5, lx: 36, lz: 40, h: -1 },
      { x: 52.5, z: 28.5, lx: 61, lz: 28, h: -1 },
      { x: 25.5, z: 32.5, lx: 27, lz: 40.5, h: -1 },
      { x: 38.5, z: 12.5, lx: 32.5, lz: 8, h: -1 },
    ];
    // ways in for attackers
    this.routes = [
      [[36, 49.5], [36, 43], [36, 32]],
      [[6, 44], [5, 20], [9, 12.5]],
      [[6, 44], [5, 28], [14, 27.5]],
      [[66, 42], [60, 38.5], [50.5, 31.5]],
      [[66, 42], [66, 28], [58, 27.5]],
      [[24, 50], [22.5, 44], [18.5, 32]],
      [[30, 50], [30.5, 44], [33, 35]],
      [[41, 50], [41.5, 44], [38.5, 35]],
      [[49, 50], [49.5, 44], [50.5, 31.5]],
      [[15, 50], [15.5, 44], [18.5, 32]],
      [[6, 44], [6, 34.5], [13, 35.5], [18.5, 32]],
      [[66, 30], [66, 14.5], [58, 13]],
    ];
    this.rescue = { x0: 26, z0: 57, x1: 46, z1: 62 };
  }

  // ---------- physics ----------
  blocks(c, feet, top, step = STEP) {
    if (c < 0) return true;
    if (this.kind[c] === K.WATER && this.swimmer) return false;
    if (this.noWalk[c]) return true;
    if (this.h[c] > feet + step) return true;
    // the garden wall round the grounds cannot be climbed (low gravity could reach it from the shed)
    if (this.kind[c] === K.STONE) return true;
    // the wall above a window or a door blocks; a body mostly below the lintel slips in and the head is pushed down
    const l = this.lint[c];
    return l > 0 && l < top && feet + 0.5 > l;
  }

  // circle vs grid; returns true if something was hit
  collide(a) {
    const r = a.radius;
    this.swimmer = !!(a.isPlayer || a.remote);
    let hit = false;
    for (let pass = 0; pass < 2; pass++) {
      const x0 = Math.floor(a.x - r), x1 = Math.floor(a.x + r), z0 = Math.floor(a.z - r), z1 = Math.floor(a.z + r);
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) {
          const c = this.inb(x, z) ? z * W + x : -1;
          if (!this.blocks(c, a.feet, a.feet + a.height, a.step ?? STEP)) continue;
          const px = Math.max(x, Math.min(a.x, x + 1)), pz = Math.max(z, Math.min(a.z, z + 1));
          let dx = a.x - px, dz = a.z - pz;
          const d2 = dx * dx + dz * dz;
          if (d2 >= r * r) continue;
          let d = Math.sqrt(d2);
          if (d < 1e-5) {
            // centre inside the cell: push out along the shortest axis
            const ex = Math.min(a.x - x, x + 1 - a.x), ez = Math.min(a.z - z, z + 1 - a.z);
            if (ex < ez) {
              dx = a.x - x < 0.5 ? -1 : 1;
              dz = 0;
              d = 0;
              a.x = dx < 0 ? x - r : x + 1 + r;
            } else {
              dz = a.z - z < 0.5 ? -1 : 1;
              dx = 0;
              a.z = dz < 0 ? z - r : z + 1 + r;
            }
            hit = true;
            continue;
          }
          const push = r - d;
          a.x += (dx / d) * push;
          a.z += (dz / d) * push;
          hit = true;
        }
    }
    return hit;
  }

  // is this point over the pool
  inWater(x, z) {
    const c = this.cellAt(x, z);
    return c >= 0 && this.kind[c] === K.WATER;
  }

  groundAt(x, z, r, feet, step = STEP) {
    let g = this.inWater(x, z) ? POOL_BOTTOM : 0;
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r), z0 = Math.floor(z - r), z1 = Math.floor(z + r);
    for (let cz = z0; cz <= z1; cz++)
      for (let cx = x0; cx <= x1; cx++) {
        if (!this.inb(cx, cz)) continue;
        const c = cz * W + cx;
        if (this.kind[c] === K.WATER) continue;
        const hh = this.h[c];
        if (hh > g && hh <= feet + step + 0.01) {
          // only cells that the circle really overlaps
          const px = Math.max(cx, Math.min(x, cx + 1)), pz = Math.max(cz, Math.min(z, cz + 1));
          if ((x - px) ** 2 + (z - pz) ** 2 < r * r * 0.8) g = hh;
        }
      }
    return g;
  }

  // ---------- bullets and sight: DDA through the grid ----------
  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    let cx = Math.floor(ox), cz = Math.floor(oz);
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tmx = dx !== 0 ? (dx > 0 ? cx + 1 - ox : ox - cx) * tdx : Infinity;
    let tmz = dz !== 0 ? (dz > 0 ? cz + 1 - oz : oz - cz) * tdz : Infinity;
    let t0 = 0, axis = -1;
    for (let i = 0; i < 400; i++) {
      if (!this.inb(cx, cz)) return { t: t0, nx: axis === 0 ? -stepX : 0, ny: 0, nz: axis === 1 ? -stepZ : 0, c: -1 };
      const c = cz * W + cx;
      const t1 = Math.min(tmx, tmz, maxT);
      const ya = oy + dy * t0, yb = oy + dy * t1;
      const lo = Math.min(ya, yb), hi = Math.max(ya, yb);
      const hh = this.h[c];
      // solid block from the floor
      if (hh > 0 && lo < hh) {
        if (ya < hh && axis >= 0) return { t: t0, nx: axis === 0 ? -stepX : 0, ny: 0, nz: axis === 1 ? -stepZ : 0, c };
        if (ya < hh) return { t: t0, nx: 0, ny: 1, nz: 0, c };
        const t = (hh - oy) / dy;
        return { t, nx: 0, ny: 1, nz: 0, c };
      }
      // floor
      if (dy < 0 && lo <= 0) {
        const t = -oy / dy;
        if (t >= t0 && t <= t1) return { t, nx: 0, ny: 1, nz: 0, c };
      }
      // lintel / ceiling
      const ceil = this.indoor[c] ? CEIL : 60;
      const l = this.lint[c] || ceil;
      if (hi > l) {
        if (ya > l && axis >= 0) return { t: t0, nx: axis === 0 ? -stepX : 0, ny: 0, nz: axis === 1 ? -stepZ : 0, c };
        const t = (l - oy) / dy;
        if (t >= t0 - 1e-4) return { t: Math.max(t, t0), nx: 0, ny: -1, nz: 0, c };
      }
      if (t1 >= maxT) return null;
      t0 = t1;
      if (tmx < tmz) {
        tmx += tdx;
        cx += stepX;
        axis = 0;
      } else {
        tmz += tdz;
        cz += stepZ;
        axis = 1;
      }
    }
    return null;
  }

  los(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const d = Math.hypot(dx, dy, dz);
    if (d < 1e-3) return true;
    return !this.raycast(ax, ay, az, dx / d, dy / d, dz / d, d - 0.05);
  }

  // ---------- bots: A* on the grid ----------
  // hops: may the path go over window sills and low crates (soldiers jump them; hostages cannot)
  path(sx, sz, tx, tz, hops = false) {
    let s = this.nearestWalk(Math.floor(sx), Math.floor(sz));
    let t = this.nearestWalk(Math.floor(tx), Math.floor(tz));
    if (s < 0 || t < 0) return null;
    const n = W * H;
    if (!this._g) {
      this._g = new Float32Array(n);
      this._from = new Int32Array(n);
      this._seen = new Uint32Array(n);
      this._closed = new Uint32Array(n);
      this._stamp = 0;
    }
    const g = this._g, from = this._from, seen = this._seen, closed = this._closed;
    const stamp = ++this._stamp;
    const txc = t % W, tzc = (t / W) | 0;
    const heur = (c) => {
      const dx = Math.abs((c % W) - txc), dz = Math.abs(((c / W) | 0) - tzc);
      return dx + dz - 0.59 * Math.min(dx, dz);
    };
    const heap = [];
    const push = (c, f) => {
      heap.push([f, c]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top[1];
    };
    g[s] = 0;
    seen[s] = stamp;
    from[s] = -1;
    push(s, heur(s));
    let found = false, iter = 0;
    while (heap.length && iter++ < 6000) {
      const c = pop();
      if (closed[c] === stamp) continue;
      closed[c] = stamp;
      if (c === t) {
        found = true;
        break;
      }
      const cx = c % W, cz = (c / W) | 0;
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx, nz = cz + dz;
          const nc = nz * W + nx;
          const hop = hops && this.inb(nx, nz) ? this.hop[nc] : 0;
          if (!hop && !this.walkable(nx, nz)) continue;
          // over a sill or a crate only straight across, never along it or round its corner
          if (hop && (dx && dz || this.hop[c])) continue;
          if (dx && dz && (!this.walkable(cx + dx, cz) || !this.walkable(cx, cz + dz))) continue;
          if (closed[nc] === stamp) continue;
          const ng = g[c] + (hop ? (hop === 1 ? 2.6 : 3.6) : (dx && dz ? 1.414 : 1) * this.cost[nc]);
          if (seen[nc] !== stamp || ng < g[nc]) {
            seen[nc] = stamp;
            g[nc] = ng;
            from[nc] = c;
            push(nc, ng + heur(nc));
          }
        }
    }
    if (!found) return null;
    const cells = [];
    for (let c = t; c !== -1; c = from[c]) cells.push(c);
    cells.reverse();
    // a third value marks the cells to jump onto
    const pts = cells.map((c) => [(c % W) + 0.5, ((c / W) | 0) + 0.5, this.hop[c] && !this.walk[c] ? 1 : 0]);
    pts.push([tx, tz]);
    return this.smooth(sx, sz, pts);
  }

  nearestWalk(x, z) {
    if (this.walkable(x, z)) return z * W + x;
    for (let r = 1; r < 6; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) if (this.walkable(x + dx, z + dz)) return (z + dz) * W + x + dx;
    return -1;
  }

  // can a 0.3 m wide body walk straight from a to b
  clearWalk(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
    if (d < 0.01) return true;
    const px = (-dz / d) * 0.32, pz = (dx / d) * 0.32;
    const n = Math.ceil(d / 0.25);
    for (let i = 0; i <= n; i++) {
      const x = ax + (dx * i) / n, z = az + (dz * i) / n;
      if (!this.walkable(Math.floor(x + px), Math.floor(z + pz)) || !this.walkable(Math.floor(x - px), Math.floor(z - pz))) return false;
    }
    return true;
  }

  smooth(sx, sz, pts) {
    const out = [];
    let cx = sx, cz = sz, i = 0;
    while (i < pts.length) {
      let j = Math.min(pts.length - 1, i + 14);
      while (j > i && !this.clearWalk(cx, cz, pts[j][0], pts[j][1])) j--;
      out.push(pts[j]);
      cx = pts[j][0];
      cz = pts[j][1];
      i = j + 1;
    }
    return out;
  }

  randomWalkNear(x, z, r) {
    for (let k = 0; k < 30; k++) {
      const px = Math.floor(x + (Math.random() * 2 - 1) * r), pz = Math.floor(z + (Math.random() * 2 - 1) * r);
      if (this.walkable(px, pz)) return [px + 0.5, pz + 0.5];
    }
    return [x, z];
  }

  // ---------- baked lighting ----------
  shadowH(c) {
    if (this.indoor[c]) return 7;
    return this.h[c];
  }

  sunShadow(x, y, z) {
    const hz = Math.hypot(SUN.x, SUN.z), tan = SUN.y / hz;
    const ux = SUN.x / hz, uz = SUN.z / hz;
    for (let d = 0.15; d < 30; d += 0.25) {
      const px = x + ux * d, pz = z + uz * d;
      const c = this.cellAt(px, pz);
      if (c < 0) return 1;
      const ry = y + d * tan;
      if (ry > 12) return 1;
      if (this.shadowH(c) > ry) return 0;
    }
    return 1;
  }

  light(x, y, z, nx, ny, nz, indoor, ao, noShadow = false) {
    if (!indoor) {
      const amb = 0.45 + 0.15 * ny;
      const dot = nx * SUN.x + ny * SUN.y + nz * SUN.z;
      const sh = dot > 0 && noShadow ? 1 : dot > 0 ? this.sunShadow(x + nx * 0.06, y + 0.04 + ny * 0.06, z + nz * 0.06) : 0;
      const s = Math.max(0, dot) * sh * 0.82;
      return [(amb * 0.88 + s * 1.0) * ao, (amb * 0.92 + s * 0.93) * ao, (amb * 1.02 + s * 0.8) * ao];
    }
    const orient = ny > 0.5 ? 1 : ny < -0.5 ? 0.8 : Math.abs(nx) > 0.5 ? 0.92 : 0.84;
    const rm = this.roomAt(x + nx * 0.2, z + nz * 0.2);
    let lamp = 0;
    for (const L of this.lamps) {
      if (rm && L.room !== rm) continue;
      const dx = L.x - x, dy = 3.85 - y, dz = L.z - z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > 140) continue;
      const d = Math.sqrt(d2);
      const lam = Math.max(0.25, (dx * nx + dy * ny + dz * nz) / d);
      lamp += (lam * 1.0) / (1 + d2 * 0.07);
    }
    const k = (0.5 + Math.min(1.0, lamp) * 0.55) * orient * ao;
    return [k * 1.0, k * 0.9, k * 0.76];
  }

  // ---------- the ground light map: 6 texels a metre, sun shadows, contact shadows, sun through the windows ----------
  groundMap(modelled) {
    // the level never changes: bake once for every game in this page
    if (LM_CACHE) return LM_CACHE;
    const R = LM_RES, w = W * R, h = H * R;
    const data = new Uint8Array(w * h * 4);
    const solid = (cx, cz, lim) => !this.inb(cx, cz) || (this.h[cz * W + cx] >= lim && !(this.kind[cz * W + cx] === K.WATER));
    const tanE = SUN.y / Math.hypot(SUN.x, SUN.z), ux = SUN.x / Math.hypot(SUN.x, SUN.z), uz = SUN.z / Math.hypot(SUN.x, SUN.z);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const px = (i + 0.5) / R, pz = (j + 0.5) / R;
        const cx = Math.floor(px), cz = Math.floor(pz);
        const c = cz * W + cx;
        const ind = this.indoor[c] === 1;
        // contact shadow: how close the nearest wall or object is (furniture models stand on their cells)
        let d = 1;
        for (let dz = -1; dz <= 1; dz++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx, nz = cz + dz;
            if (!(dx || dz) && !(this.h[c] > 0)) continue;
            if (!solid(nx, nz, 0.45)) continue;
            const qx = Math.max(nx, Math.min(px, nx + 1)), qz = Math.max(nz, Math.min(pz, nz + 1));
            d = Math.min(d, Math.hypot(px - qx, pz - qz));
          }
        const ao = 0.58 + 0.42 * Math.min(1, d / 0.65) ** 0.7;
        let col = this.light(px, 0.03, pz, 0, 1, 0, ind, ao);
        if (ind) {
          // sunlight falling in through a window or an open door
          let lit = 0;
          for (let t = 0.1; t < 4; t += 0.1) {
            const y = t * tanE;
            if (y > CEIL - 0.05) break;
            const qx = px + ux * t, qz = pz + uz * t;
            const qc = this.cellAt(qx, qz);
            if (qc < 0) break;
            if (!this.indoor[qc]) {
              lit = this.sunShadow(qx, y, qz);
              break;
            }
            const hh = this.h[qc], l = this.lint[qc];
            if (hh > y) break;
            if (l > 0 && y > l) break;
            if (hh >= CEIL) break;
          }
          if (lit) col = col.map((v, k) => v + [0.62, 0.56, 0.44][k] * ao);
        }
        const o = (j * w + i) * 4;
        data[o] = Math.min(255, (col[0] / LM_SCALE) * 255);
        data[o + 1] = Math.min(255, (col[1] / LM_SCALE) * 255);
        data[o + 2] = Math.min(255, (col[2] / LM_SCALE) * 255);
        data[o + 3] = 255;
      }
    const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.flipY = false;
    // the floors' second uv set maps the whole level onto this picture
    t.channel = 1;
    t.needsUpdate = true;
    void modelled;
    return (LM_CACHE = t);
  }

  cornerAO(cx, cz) {
    let n = 0;
    for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const x = cx + dx, z = cz + dz;
      if (!this.inb(x, z) || this.h[z * W + x] >= 0.9) n++;
    }
    return [1, 0.8, 0.66, 0.56, 0.5][n];
  }

  buildMeshes(tex, modelled = false) {
    const groups = {};
    // with the furniture models in, their cells show only floor
    const isModel = (c) => modelled && MODELLED.has(this.kind[c]) && this.h[c] > 0;
    const drawH = (c) => (isModel(c) ? 0 : this.h[c]);
    const grp = (k) => (groups[k] ||= { p: [], n: [], u: [], c: [], u1: [], lm: false });
    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpN = new THREE.Vector3();
    const quad = (key, v, n, uv, col, uv1) => {
      const G = grp(key);
      if (uv1) G.lm = true;
      tmpA.set(v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]);
      tmpB.set(v[2][0] - v[0][0], v[2][1] - v[0][1], v[2][2] - v[0][2]);
      tmpN.crossVectors(tmpA, tmpB);
      const order = tmpN.x * n[0] + tmpN.y * n[1] + tmpN.z * n[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      for (const i of order) {
        G.p.push(v[i][0], v[i][1], v[i][2]);
        G.n.push(n[0], n[1], n[2]);
        G.u.push(uv[i][0], uv[i][1]);
        G.c.push(col[i][0], col[i][1], col[i][2]);
        G.u1.push(uv1 ? v[i][0] / W : 0, uv1 ? v[i][2] / H : 0);
      }
    };
    const sz = (k) => TEX_SIZE[k] || [1, 1];

    // vertical face on the side of cell (x,z): dir 0:-x 1:+x 2:-z 3:+z
    const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const vface = (key, x, z, dir, y0, y1, indoor, aoMode) => {
      for (const cut of [1.3, 3.6, CEIL]) {
        if (cut > y0 + 0.01 && cut < y1 - 0.01) {
          vface(key, x, z, dir, y0, cut, indoor, aoMode);
          vface(key, x, z, dir, cut, y1, indoor, aoMode);
          return;
        }
      }
      const [dx, dz] = DIRS[dir];
      const n = [dx, 0, dz];
      let a, b;
      if (dir === 0) (a = [x, z + 1]), (b = [x, z]);
      else if (dir === 1) (a = [x + 1, z]), (b = [x + 1, z + 1]);
      else if (dir === 2) (a = [x, z]), (b = [x + 1, z]);
      else (a = [x + 1, z + 1]), (b = [x, z + 1]);
      const [su, sv] = sz(key);
      const along = (p) => (dx !== 0 ? p[1] : p[0]) / su;
      const v = [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]];
      const uv = [[along(a), y0 / sv], [along(b), y0 / sv], [along(b), y1 / sv], [along(a), y1 / sv]];
      const col = v.map((p) => {
        let ao = 1;
        if (aoMode) ao = 0.62 + 0.38 * Math.min(1, Math.max(0, p[1] / 1.3)) ** 0.8;
        if (indoor && p[1] > 3.6) ao *= 0.88;
        return this.light(p[0] + dx * 0.02, Math.max(0.05, Math.min(p[1], 3.95)), p[2] + dz * 0.02, n[0], 0, n[2], indoor, ao);
      });
      quad(key, v, n, uv, col);
    };
    const hface = (key, x0, z0, x1, z1, y, up, indoor, aoFn, lm = false) => {
      const [su, sv] = sz(key);
      const v = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
      const uv = v.map((p) => [p[0] / su, p[2] / sv]);
      const ny = up ? 1 : -1;
      // floors take their light from the baked ground map (sharp shadows); everything else is lit per corner
      const col = lm ? v.map(() => [1, 1, 1]) : v.map((p) => this.light(p[0], y + ny * 0.02, p[2], 0, ny, 0, indoor, aoFn ? aoFn(p[0], p[2]) : 1));
      quad(key, v, [0, ny, 0], uv, col, lm);
    };

    const wallTex = (c, nb) => {
      const k = this.kind[c];
      if (k === K.WALL || k === K.WINDOW) {
        if (nb >= 0 && this.kind[nb] === K.WINDOW) return 'trim';
        if (nb >= 0 && this.indoor[nb]) return WALL_TEX[this.floor[nb]] || 'w_corr';
        return 'plaster';
      }
      return KIND_TEX[k] || 'crate';
    };

    for (let z = 0; z < H; z++)
      for (let x = 0; x < W; x++) {
        const c = z * W + x;
        const hh = this.h[c], ind = this.indoor[c] === 1;
        if (this.kind[c] === K.STATUE) {
          // the plinth / fountain is modelled below; the cell still needs a floor (or the basin)
          if (ind) hface(FLOOR_TEX[this.floor[c]] || 'grass', x, z, x + 1, z + 1, 0, true, ind, null, true);
          else hface(KIND_TEX[K.FOUNTAIN] || 'fountain', x, z, x + 1, z + 1, 0.55, true, false, null);
        } else if (hh === 0 || isModel(c)) {
          hface(FLOOR_TEX[this.floor[c]] || 'grass', x, z, x + 1, z + 1, 0, true, ind, null, true);
        } else {
          const k = this.kind[c];
          const topKey = k === K.WINDOW ? 'sill' : k === K.WALL ? 'trim' : KIND_TEX[k] || 'crate';
          if (hh < CEIL || !ind) hface(topKey, x, z, x + 1, z + 1, hh, true, ind && hh < CEIL, null);
          for (let d = 0; d < 4; d++) {
            const nx = x + DIRS[d][0], nz = z + DIRS[d][1];
            if (!this.inb(nx, nz)) continue;
            const nb = nz * W + nx;
            const nh = drawH(nb);
            if (nh >= hh) continue;
            const nIndoor = this.indoor[nb] === 1;
            vface(wallTex(c, nb), x, z, d, nh, hh, nIndoor, nh === 0);
          }
        }
        // lintel over doors and windows
        const l = this.lint[c];
        if (l > 0) {
          hface('trim', x, z, x + 1, z + 1, l, false, ind, null);
          for (let d = 0; d < 4; d++) {
            const nx = x + DIRS[d][0], nz = z + DIRS[d][1];
            if (!this.inb(nx, nz)) continue;
            const nb = nz * W + nx;
            if (this.h[nb] >= CEIL) continue;
            // the next cell along the facade carries on the same lintel
            if (this.lint[nb] > 0 && Math.abs(this.lint[nb] - l) < 0.01) continue;
            vfaceLintel(this, x, z, d, l, nb);
          }
        }
        if (ind && hh < CEIL && !(l > 0)) hface('ceiling', x, z, x + 1, z + 1, CEIL, false, true, null);
      }

    function vfaceLintel(map, x, z, d, l, nb) {
      const nIndoor = map.indoor[nb] === 1;
      const key = nIndoor ? WALL_TEX[map.floor[nb]] || 'w_corr' : 'plaster';
      vface(key, x, z, d, l, nIndoor ? CEIL : FACADE, nIndoor, false);
    }

    // roof over the mansion
    const X0 = 9.5, X1 = 63.5, Z0 = 7.5, Z1 = 47.5, E = FACADE + 0.02, half = (Z1 - Z0) / 2, R = E + half * Math.tan((17 * Math.PI) / 180), Zm = (Z0 + Z1) / 2;
    const roofQuad = (pts) => {
      const a = new THREE.Vector3(...pts[0]), b = new THREE.Vector3(...pts[1]), cc = new THREE.Vector3(...pts[2]);
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(cc, a)).normalize();
      if (n.y < 0) n.negate();
      const [su, sv] = sz('roof');
      const horiz = Math.abs(n.x) > Math.abs(n.z) ? 2 : 0;
      const sin = Math.sin((17 * Math.PI) / 180);
      const uv = pts.map((p) => [p[horiz] / su, (p[1] - E) / sin / sv]);
      const col = pts.map((p) => this.light(p[0], p[1] + 0.1, p[2], n.x, n.y, n.z, false, 1, true).map((v) => v * 0.95));
      if (pts.length === 4) quad('roof', pts, [n.x, n.y, n.z], uv, col);
      else quad('roof', [pts[0], pts[1], pts[2], pts[2]], [n.x, n.y, n.z], [...uv, uv[2]], [...col, col[2]]);
    };
    roofQuad([[X0, E, Z1], [X1, E, Z1], [X1 - half, R, Zm], [X0 + half, R, Zm]]);
    roofQuad([[X1, E, Z0], [X0, E, Z0], [X0 + half, R, Zm], [X1 - half, R, Zm]]);
    roofQuad([[X0, E, Z0], [X0, E, Z1], [X0 + half, R, Zm]]);
    roofQuad([[X1, E, Z1], [X1, E, Z0], [X1 - half, R, Zm]]);
    // soffits under the overhang
    const soff = (x0, z0, x1, z1) => hface('trim', x0, z0, x1, z1, FACADE, false, false, () => 0.75);
    soff(X0, Z0, X1, 8);
    soff(X0, 47, X1, Z1);
    soff(X0, 8, 10, 47);
    soff(63, 8, X1, 47);
    // chimneys
    const boxSolid = (key, x0, y0, z0, x1, y1, z1) => {
      for (let d = 0; d < 4; d++) {
        const pts = [
          [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]],
          [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]],
          [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]],
          [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]],
        ][d];
        const n = [[-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1]][d];
        const [su, sv] = sz(key);
        const uv = pts.map((p) => [(n[0] ? p[2] : p[0]) / su, p[1] / sv]);
        const col = pts.map((p) => this.light(p[0], 9, p[2], n[0], 0, n[2], false, 1, true));
        quad(key, pts, n, uv, col);
      }
      hface(key, x0, z0, x1, z1, y1, true, false, null);
    };
    const roofY = (x, z) => Math.min(R, E + Math.min(x - X0, X1 - x, z - Z0, Z1 - z) * Math.tan((17 * Math.PI) / 180));
    for (const [x, z] of [[21, 13], [53, 12], [47, 40]]) boxSolid('fire', x, roofY(x, z) - 1, z, x + 1.4, roofY(x + 0.7, z + 0.7) + 2.3, z + 1.4);

    const meshes = [];
    for (const [key, G] of Object.entries(groups)) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(G.p, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(G.u, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(G.c, 3));
      if (G.lm) geo.setAttribute('uv1', new THREE.Float32BufferAttribute(G.u1, 2));
      geo.computeBoundingSphere();
      const mat = new THREE.MeshBasicMaterial({ map: tex[key], vertexColors: true });
      if (G.lm) {
        mat.lightMap = this.groundMap(modelled);
        // basic materials divide the light map by pi; the map stores light / LM_SCALE
        mat.lightMapIntensity = Math.PI * LM_SCALE;
      }
      // the photo tiles are a very bright orange: weather them a little
      if (key === 'roof') mat.color.setRGB(0.84, 0.78, 0.76);
      if (key === 'water') {
        mat.transparent = true;
        mat.opacity = 0.88;
      }
      const m = new THREE.Mesh(geo, mat);
      m.matrixAutoUpdate = false;
      m.name = key;
      meshes.push(m);
    }

    // the pool from the inside: a tiled box open at the top, and the water seen from below
    {
      const box = new THREE.BoxGeometry(22, WATER_Y - POOL_BOTTOM, 4);
      box.translate(35, (WATER_Y + POOL_BOTTOM) / 2, 4);
      const inside = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ map: tex.tile || null, color: 0x8fd0e0, side: THREE.BackSide }));
      inside.name = 'pool';
      meshes.push(inside);
      const under = new THREE.Mesh(new THREE.PlaneGeometry(22, 4).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5fb4cc, transparent: true, opacity: 0.6 }));
      under.position.set(35, WATER_Y - 0.01, 4);
      meshes.push(under);
    }

    // decals: hall rug and the rescue zone
    const decal = (key, x0, z0, x1, z1, y, transparent) => {
      const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      geo.rotateX(-Math.PI / 2);
      const col = this.light((x0 + x1) / 2, 0.1, (z0 + z1) / 2, 0, 1, 0, this.isIndoor((x0 + x1) / 2, (z0 + z1) / 2), 1);
      const mat = new THREE.MeshBasicMaterial({ map: tex[key], transparent, depthWrite: !transparent, polygonOffset: true, polygonOffsetFactor: -2 });
      mat.color.setRGB(col[0], col[1], col[2]);
      const m = new THREE.Mesh(geo, mat);
      m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      meshes.push(m);
      return m;
    };
    decal('rug', 32, 33.5, 40, 36.6, 0.012, false);
    decal('rug', 32, 39.4, 40, 42.5, 0.012, false);
    const rescue = decal('rescue', this.rescue.x0, this.rescue.z0, this.rescue.x1 + 1, this.rescue.z1 + 1, 0.02, true);
    rescue.material.color.setRGB(1, 1, 1);
    tex.rescue.repeat.set(5, 1.5);
    this.rescueMesh = rescue;

    // fountain in the courtyard: water in the basin and a two-tier spout
    const stone = new THREE.MeshBasicMaterial({ map: tex.fountain, vertexColors: true });
    const lathe = (pts, x, z, key) => {
      const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 18).toNonIndexed();
      g.translate(x, 0, z);
      const n = g.attributes.normal || (g.computeVertexNormals(), g.attributes.normal);
      const p = g.attributes.position;
      const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const l = this.light(p.getX(i), Math.max(0.1, p.getY(i)), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i), this.isIndoor(x, z), 0.75 + 0.25 * Math.min(1, p.getY(i)), true);
        col.set(l, i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 2);
      return g;
    };
    const fx = 36, fz = 52;
    const fountain = new THREE.Mesh(
      mergeGeos([
        lathe([[0, 0], [0.55, 0], [0.42, 0.25], [0.32, 0.6], [0.3, 1.25], [0.0, 1.25]], fx, fz),
        lathe([[0, 1.2], [0.25, 1.2], [1.05, 1.34], [1.1, 1.46], [0.95, 1.46], [0.0, 1.44]], fx, fz),
        lathe([[0, 1.4], [0.16, 1.4], [0.12, 1.9], [0.38, 2.0], [0.4, 2.08], [0.0, 2.1]], fx, fz),
      ]),
      stone,
    );
    meshes.push(fountain);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 3.3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex.water, transparent: true, opacity: 0.85, color: 0xcfe8f0 }));
    water.position.set(36, 0.805, 52);
    meshes.push(water);
    const bowlWater = new THREE.Mesh(new THREE.CircleGeometry(0.98, 18).rotateX(-Math.PI / 2), water.material);
    bowlWater.position.set(fx, 1.45, fz);
    meshes.push(bowlWater);
    // hall: a plinth with a big vase
    const vase = new THREE.Mesh(
      mergeGeos([
        lathe([[0, 0], [0.95, 0], [0.95, 0.12], [0.8, 0.18], [0.8, 1.05], [0.95, 1.1], [0.95, 1.2], [0, 1.2]], 36, 38),
        lathe([[0, 1.2], [0.22, 1.2], [0.42, 1.45], [0.5, 1.75], [0.36, 2.05], [0.2, 2.15], [0.28, 2.3], [0, 2.3]], 36, 38),
      ]),
      new THREE.MeshBasicMaterial({ map: tex.pillar, vertexColors: true }),
    );
    meshes.push(vase);

    // ceiling lamps
    const lampGeo = [];
    for (const L of this.lamps) {
      if (ROOMS[L.room]?.name === 'hall') continue;
      const g = new THREE.CylinderGeometry(0.28, 0.36, 0.12, 10);
      g.translate(L.x, CEIL - 0.06, L.z);
      lampGeo.push(g);
    }
    const lampMesh = new THREE.Mesh(mergeGeos(lampGeo), new THREE.MeshBasicMaterial({ color: 0xfff1cf }));
    meshes.push(lampMesh);
    return meshes;
  }
}

export function mergeGeos(list) {
  let count = 0;
  for (const g of list) count += (g.index ? g.index.count : g.attributes.position.count);
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
  const hasColor = list.every((g) => g.attributes.color);
  const col = hasColor ? new Float32Array(count * 3) : null;
  const hasUv = list.every((g) => g.attributes.uv);
  const uvs = hasUv ? new Float32Array(count * 2) : null;
  let o = 0;
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (col) col.set(g.attributes.color.array, o * 3);
    if (uvs) uvs.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (uvs) out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  out.computeBoundingSphere();
  return out;
}

export { SUN };
