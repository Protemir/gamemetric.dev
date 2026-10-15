// Seven routes: six around Almaty and Astana on New Year's Eve. Each map sets its sky, mountain layers, ground and
// road colors, traffic, the road itself (build) and what stands along it (decorate).

const CITY_COLORS = ['#4b6fa5', '#7d8590', '#2f6f5e', '#c9b458', '#8c4a3a', '#d9dde3', '#30343c', '#5b4a8a', '#a0522d', '#e8e8e8'];

// a guard rail on the outer side of sharp bends; it is drawn as one band along the road and holds the car on it
function outerRails(T, seg) {
  if (seg.curve > 2.5) seg.rail = -1;
  else if (seg.curve < -2.5) seg.rail = 1;
}
function building(T, seg, r, side) {
  const cols = 3 + Math.floor(r() * 4);
  const rows = 5 + Math.floor(r() * 9);
  const lit = Array.from({ length: cols * rows }, () => (r() < 0.38 ? (r() < 0.82 ? 1 : 2) : 0));
  T.addSprite(seg.i, 'building', side * (2.05 + r() * 1.4), {
    w: 1800 + r() * 1400,
    h: 2400 + rows * 260,
    cols,
    rows,
    lit,
    color: ['#141a28', '#171d2c', '#11161f'][Math.floor(r() * 3)],
    dayColor: ['#7b8494', '#8b8f98', '#6f7a8a'][Math.floor(r() * 3)],
  });
}

export const MAPS = [
  {
    id: 'city',
    name: { ru: 'Ночной Алматы', en: 'Almaty by night' },
    lanes: 3,
    seed: 20261014,
    fog: 5,
    fogColor: '#1b2442',
    sky: {
      night: 1,
      stops: [[0, '#050816'], [0.6, '#0f1630'], [1, '#1b2442']],
      stars: 1,
      body: { type: 'moon', x: 0.8, y: 0.28, r: 0.035, color: '#e9edf6', glow: 'rgba(220,230,255,0.18)' },
      vignette: 0.55,
    },
    ranges: [
      { kind: 'peaks', color: '#26314f', snow: '#8f9cbc', snowLine: 0.45, height: 0.75, amp: 0.85, seed: 11, detail: 13, speed: 0.0012 },
      { kind: 'hills', color: '#121a2e', height: 0.4, amp: 0.7, seed: 23, detail: 9, speed: 0.0024, lights: true },
    ],
    skyline: { color: '#0d1322', windows: true },
    ground: [['#1f232c', '#1b1f27'], ['#16291e', '#13241a'], ['#182a1f', '#15251b'], ['#1f232c', '#1b1f27']],
    road: ['#3b404c', '#363b46'],
    rumble: ['#8f949c', '#878c94'],
    lane: '#d7dbe1',
    weather: null,
    zones: [
      { name: { ru: 'Проспект Абая', en: 'Abay Avenue' }, gate: { ru: 'ПРОСПЕКТ АБАЯ', en: 'ABAY AVENUE' } },
      { name: { ru: 'Аль-Фараби', en: 'Al-Farabi Avenue' }, gate: { ru: 'АЛЬ-ФАРАБИ', en: 'AL-FARABI' } },
      { name: { ru: 'Дорога на Кок-Тобе', en: 'Up to Kok-Tobe' }, gate: { ru: 'КОК-ТОБЕ', en: 'KOK-TOBE' } },
      { name: { ru: 'Проспект Достык', en: 'Dostyk Avenue' }, gate: { ru: 'ДОСТЫК', en: 'DOSTYK' } },
    ],
    traffic: { count: 70, oncoming: 0, min: 0.2, max: 0.46, kinds: [['sedan', 6], ['hatch', 3], ['suv', 2], ['bus', 1]], colors: CITY_COLORS },
    fun: {
      zones: [0, 1, 3],
      walkers: 0.06,
      props: [['tubeman', 0.006, { color: '#e8402f' }], ['tubeman', 0.004, { color: '#2f6fbf' }]],
      cones: [[[1, 250], 7, 0.9], [[3, 100], 6, -0.9]],
    },
    police: [[0, 380], [3, 180]],
    holes: 0.006,
    puddles: { kind: 'water', rate: 0.005 },
    wedding: true,
    weaver: true,
    bumps: [[0, 300], [1, 200], [3, 300]],
    fireworks: true,
    build(T) {
      T.zone().road(30, 60, 30, 0, 0).road(50, 50, 50, 2, 0).road(25, 40, 25, 0, 0).road(50, 50, 50, -2, 4).road(30, 60, 30, 0, -4).road(40, 40, 40, 3, 0);
      T.zone().road(50, 60, 50, -3, 10).road(30, 30, 30, 0, -6).road(40, 40, 40, 4, 8).road(30, 30, 30, -4, -6).road(40, 60, 40, 2, 10).road(30, 30, 30, -2, 0);
      T.zone().road(40, 40, 40, 5, 20).road(30, 30, 30, -5, 15).road(30, 40, 30, 4, 10).road(25, 25, 25, -6, 0);
      T.zone().road(40, 60, 40, -2, -10).road(30, 30, 30, 3, 0).home(80, -2);
    },
    decorate(T, seg, r) {
      const z = seg.zone;
      const i = seg.i;
      const side = r() < 0.5 ? -1 : 1;
      const every = z === 2 ? 24 : 16;
      if (i % every === 0) {
        T.addSprite(i, 'lamp', -1.08);
        T.addSprite(i + every / 2, 'lamp', 1.08);
      }
      if (z === 0 || z === 3) {
        if (i % 6 === 0) building(T, seg, r, side);
        if (i % 9 === 4) T.addSprite(i, 'poplar', side * (1.3 + r() * 0.3));
      } else if (z === 1) {
        if (i % 5 === 2) T.addSprite(i, 'poplar', (i % 10 === 2 ? -1 : 1) * 1.35);
        if (i % 11 === 6) T.addSprite(i, 'apple', side * (1.7 + r() * 1.6));
        if (i % 13 === 3 && r() < 0.6) T.addSprite(i, 'apple', -side * (2.6 + r() * 1.5));
      } else {
        if (r() < 0.22) T.addSprite(i, 'apple', side * (1.4 + r() * 2.5));
        if (r() < 0.14) T.addSprite(i, 'pine', -side * (1.5 + r() * 2.5), { snow: false });
        if (r() < 0.08) T.addSprite(i, 'poplar', side * (1.3 + r() * 0.4));
      }
    },
    extras(T) {
      const s = T.zoneStart;
      return [
        [s[0] + 220, 'billboard', 1.3, { label: 'GAMEMETRIC.DEV' }],
        [s[0] + 520, 'billboard', -1.3, { label: { ru: 'АЛМАТЫ', en: 'ALMATY' } }],
        [s[1] + 90, 'billboard', 1.35, { label: { ru: 'АПОРТ', en: 'APORT' } }],
        [s[1] + 400, 'billboard', -1.35, { label: 'ASEMFACE.COM' }],
        [s[2] + 40, 'sign', 1.25, { label: { ru: 'Кок-Тобе 2 км', en: 'Kok-Tobe 2 km' } }],
        [s[3] + 60, 'sign', -1.25, { label: { ru: 'Медеу 15 км', en: 'Medeu 15 km' } }],
      ];
    },
  },

  {
    id: 'medeu',
    name: { ru: 'Дорога на Медеу', en: 'Road to Medeu' },
    lanes: 2,
    seed: 2026101502,
    fog: 6,
    fogColor: '#222b44',
    sky: {
      night: 1,
      stops: [[0, '#070a18'], [0.55, '#151c36'], [1, '#2a3350']],
      stars: 0.5,
      body: { type: 'moon', x: 0.22, y: 0.22, r: 0.03, color: '#dde3ee', glow: 'rgba(210,220,250,0.16)' },
      clouds: { color: '#3a4462', alpha: 0.55, count: 8, top: 0.08, bottom: 0.45 },
      vignette: 0.55,
    },
    ranges: [
      { kind: 'peaks', color: '#2e3a5a', snow: '#a9b6d0', snowLine: 0.55, height: 1, amp: 0.92, seed: 31, detail: 15, speed: 0.0012 },
      { kind: 'peaks', color: '#1a2238', snow: '#5d6a86', snowLine: 0.3, height: 0.55, amp: 0.75, seed: 37, detail: 11, speed: 0.0022 },
    ],
    ground: [['#6c7789', '#647083'], ['#677284', '#5f6a7c'], ['#78839a', '#707b92'], ['#6c7789', '#647083']],
    road: ['#34383f', '#30343b'],
    rumble: ['#7d8594', '#768090'],
    lane: '#d6dae0',
    weather: { snow: 170 },
    zones: [
      { name: { ru: 'Горельник', en: 'Gorelnik' }, gate: { ru: 'ГОРЕЛЬНИК', en: 'GORELNIK' } },
      { name: { ru: 'Лавинные галереи', en: 'Avalanche galleries' }, gate: { ru: 'ГАЛЕРЕИ', en: 'GALLERIES' } },
      { name: { ru: 'Медеу', en: 'Medeu' }, gate: { ru: 'МЕДЕУ', en: 'MEDEU' } },
      { name: { ru: 'Плотина', en: 'The dam' }, gate: { ru: 'ПЛОТИНА', en: 'THE DAM' } },
    ],
    traffic: { count: 34, oncoming: 0.45, min: 0.18, max: 0.38, kinds: [['sedan', 5], ['suv', 3], ['hatch', 2], ['bus', 1]], colors: CITY_COLORS },
    fun: {
      zones: [0, 2, 3],
      walkers: 0.02,
      hats: true,
      props: [['snowman', 0.014]],
    },
    police: [[2, 150]],
    herds: [[0, 300, 7]],
    holes: 0.004,
    puddles: { kind: 'slush', rate: 0.004 },
    eagle: true,
    build(T) {
      T.zone().road(40, 40, 40, 0, 10).road(40, 40, 40, 4, 20).road(30, 30, 30, -5, 15).road(30, 40, 30, 5, 15).road(30, 30, 30, -3, 10);
      T.zone().road(20, 20, 20, 0, 5).tunnel(true).road(20, 60, 20, 3, 10).tunnel(false).road(20, 30, 20, -4, 5).tunnel(true).road(30, 60, 30, -2, 10).tunnel(false).road(30, 30, 30, 5, 10);
      T.zone().road(40, 60, 40, -2, 10).road(40, 60, 40, 0, 0).road(30, 30, 30, 4, 5);
      T.zone().road(30, 30, 30, -6, 25).road(30, 30, 30, 6, 20).road(25, 25, 25, -5, 10).home(110, 3);
    },
    decorate(T, seg, r) {
      const z = seg.zone;
      const i = seg.i;
      const side = r() < 0.5 ? -1 : 1;
      if (seg.tunnel) return;
      outerRails(T, seg);
      if (z === 2) {
        if (i % 20 === 0) {
          T.addSprite(i, 'lamp', -1.08);
          T.addSprite(i + 10, 'lamp', 1.08);
        }
        if (r() < 0.12) T.addSprite(i, 'pine', side * (2 + r() * 3));
        if (r() < 0.05) T.addSprite(i, 'snowbank', side * (1.3 + r() * 0.5));
        return;
      }
      if (r() < 0.38) T.addSprite(i, 'pine', side * (1.3 + r() * 3.4));
      if (r() < 0.16) T.addSprite(i, 'pine', -side * (1.6 + r() * 3));
      if (r() < 0.04) T.addSprite(i, 'rock', side * (1.3 + r() * 0.8));
      if (r() < 0.05) T.addSprite(i, 'snowbank', -side * (1.25 + r() * 0.4));
    },
    extras(T) {
      const s = T.zoneStart;
      return [
        [s[0] + 60, 'sign', 1.25, { label: { ru: 'Медеу 9 км', en: 'Medeu 9 km' } }],
        [s[2] + 30, 'billboard', -1.35, { label: { ru: 'МЕДЕУ', en: 'MEDEU' } }],
        [s[2] + 200, 'sign', 1.25, { label: { ru: 'Шымбулак 6 км', en: 'Shymbulak 6 km' }, color: '#24508a' }],
        [s[3] + 30, 'sign', -1.25, { label: { ru: 'Плотина', en: 'Dam' }, color: '#24508a' }],
      ];
    },
  },

  {
    id: 'shymbulak',
    name: { ru: 'Шымбулак на рассвете', en: 'Shymbulak at dawn' },
    lanes: 2,
    seed: 2026101503,
    fog: 5,
    fogColor: '#e9a48e',
    sky: {
      night: 0.45,
      stops: [[0, '#1c2150'], [0.45, '#5a4c8c'], [0.8, '#e48f7c'], [1, '#ffcf9e']],
      stars: 0.35,
      body: { type: 'sun', x: 0.3, y: 0.95, r: 0.055, color: '#ffe3b0', glow: 'rgba(255,190,140,0.5)' },
      clouds: { color: '#f6b3a6', alpha: 0.4, count: 7, top: 0.2, bottom: 0.6 },
      vignette: 0.35,
    },
    ranges: [
      { kind: 'peaks', color: '#5b4f7d', snow: '#f4bfc8', snowLine: 0.6, height: 1.05, amp: 0.95, seed: 41, detail: 17, speed: 0.0011 },
      { kind: 'peaks', color: '#3d3763', snow: '#c99db2', snowLine: 0.25, height: 0.6, amp: 0.8, seed: 43, detail: 12, speed: 0.002 },
    ],
    ground: [['#d9d3e6', '#cfc9de'], ['#ddd6e8', '#d2cce0'], ['#e6dfec', '#ddd6e5']],
    road: ['#4a4a5a', '#45455a'],
    rumble: ['#b9b6c8', '#b1aec1'],
    lane: '#f2f0f6',
    weather: { snow: 55 },
    zones: [
      { name: { ru: 'Серпантин', en: 'Switchbacks' }, gate: { ru: 'СЕРПАНТИН', en: 'SWITCHBACKS' } },
      { name: { ru: 'Канатная дорога', en: 'Cable car' }, gate: { ru: 'КАНАТКА', en: 'CABLE CAR' } },
      { name: { ru: 'Талгарский перевал', en: 'Talgar pass' }, gate: { ru: 'ПЕРЕВАЛ', en: 'THE PASS' } },
    ],
    traffic: { count: 22, oncoming: 0.4, min: 0.18, max: 0.32, kinds: [['bus', 2], ['suv', 3], ['sedan', 2]], colors: ['#e8e8e8', '#2f6f9e', '#c0392b', '#30343c', '#7d8590'] },
    fun: {
      zones: [0, 1, 2],
      walkers: 0.025,
      hats: true,
      props: [['snowman', 0.02]],
    },
    herds: [[1, 260, 6]],
    holes: 0.003,
    puddles: { kind: 'slush', rate: 0.003 },
    eagle: true,
    build(T) {
      T.zone().road(40, 40, 40, 6, 20).road(30, 30, 30, -6, 20).road(30, 30, 30, 6, 20).road(30, 30, 30, -6, 15).road(30, 40, 30, 4, 10);
      T.zone().road(50, 80, 50, -2, 25).road(40, 60, 40, 3, 15).road(30, 30, 30, -4, 10);
      T.zone().road(40, 40, 40, 5, 30).road(30, 30, 30, -6, 20).road(30, 60, 30, 0, 10).home(120, -2);
    },
    decorate(T, seg, r) {
      const z = seg.zone;
      const i = seg.i;
      const side = r() < 0.5 ? -1 : 1;
      outerRails(T, seg);
      if (z === 0) {
        if (r() < 0.3) T.addSprite(i, 'pine', side * (1.3 + r() * 3.2));
        if (r() < 0.04) T.addSprite(i, 'rock', side * (1.4 + r() * 1.2));
      } else if (z === 1) {
        if (i % 45 === 0) T.addSprite(i, 'pylon', 2.4, { chair: i % 90 === 0 });
        if (r() < 0.06) T.addSprite(i, 'snowbank', side * (1.3 + r() * 0.6));
        if (r() < 0.12) T.addSprite(i, 'pine', -1 * (1.5 + r() * 3));
      } else {
        if (r() < 0.06) T.addSprite(i, 'rock', side * (1.3 + r() * 2));
        if (r() < 0.07) T.addSprite(i, 'snowbank', side * (1.25 + r() * 0.6));
        if (r() < 0.05) T.addSprite(i, 'pine', side * (2 + r() * 3));
      }
    },
    extras(T) {
      const s = T.zoneStart;
      return [
        [s[0] + 40, 'sign', 1.25, { label: { ru: 'Шымбулак 4 км', en: 'Shymbulak 4 km' }, color: '#24508a' }],
        [s[1] + 30, 'billboard', -1.35, { label: { ru: 'ШЫМБУЛАК', en: 'SHYMBULAK' } }],
        [s[2] + 40, 'sign', 1.25, { label: { ru: 'Перевал 3163 м', en: 'Pass 3163 m' }, color: '#24508a' }],
      ];
    },
  },

  {
    id: 'kapchagay',
    name: { ru: 'Капчагай на закате', en: 'Kapchagay at sunset' },
    lanes: 2,
    seed: 2026101504,
    fog: 4,
    fogColor: '#e8875a',
    sky: {
      night: 0.3,
      stops: [[0, '#2b1d4f'], [0.5, '#8a3b63'], [0.8, '#ef7a4c'], [1, '#ffc46e']],
      stars: 0.15,
      body: { type: 'sun', x: 0.62, y: 0.86, r: 0.065, color: '#ffe08f', glow: 'rgba(255,170,90,0.55)' },
      clouds: { color: '#ff9a6b', alpha: 0.5, count: 9, top: 0.12, bottom: 0.55 },
      vignette: 0.35,
    },
    ranges: [
      { kind: 'peaks', color: '#7a4f7f', snow: '#e6aac0', snowLine: 0.3, height: 0.42, amp: 0.65, seed: 51, detail: 9, speed: 0.001 },
      { kind: 'hills', color: '#5c3a55', height: 0.2, amp: 0.6, seed: 53, detail: 5, speed: 0.002 },
    ],
    water: { top: '#9a5a74', bottom: '#f2a26a', glint: '#ffe0a0' },
    ground: [['#8c6f45', '#836840'], ['#957548', '#8b6c42'], ['#a3845a', '#9a7c53']],
    road: ['#4a4248', '#453e44'],
    rumble: ['#7d6e57', '#76684f'],
    lane: '#e9e6dc',
    weather: null,
    zones: [
      { name: { ru: 'Трасса на Капчагай', en: 'Kapchagay highway' }, gate: { ru: 'ТРАССА', en: 'HIGHWAY' } },
      { name: { ru: 'Степь', en: 'The steppe' }, gate: { ru: 'СТЕПЬ', en: 'STEPPE' } },
      { name: { ru: 'Берег', en: 'The shore' }, gate: { ru: 'БЕРЕГ', en: 'THE SHORE' } },
    ],
    traffic: { count: 40, oncoming: 0.5, min: 0.22, max: 0.42, kinds: [['truck', 4], ['sedan', 4], ['suv', 2], ['bus', 1]], colors: ['#e8e8e8', '#c0392b', '#2f6f9e', '#d9a33a', '#3a6b4a', '#7d8590', '#30343c'] },
    fun: {
      zones: [0, 1, 2],
      walkers: 0.015,
      props: [['melons', 0.009], ['tubeman', 0.002, { color: '#f2b705' }]],
      cones: [[[2, 150], 6, 0.9]],
    },
    police: [[0, 250], [1, 380]],
    holes: 0.006,
    puddles: { kind: 'mud', rate: 0.007 },
    tumbleweeds: 14,
    wedding: true,
    melonTrucks: 2,
    herds: [[1, 120, 9], [1, 470, 8], [2, 230, 7]],
    build(T) {
      T.zone().road(50, 100, 50, 0, 0).road(40, 40, 40, 2, 15).road(40, 40, 40, 0, -15).road(50, 50, 50, -2, 0);
      T.zone().road(40, 80, 40, 1, 20).road(40, 40, 40, 0, -25).road(40, 40, 40, 0, 15).road(40, 60, 40, -1, -10).road(30, 30, 30, 3, 0);
      T.zone().road(50, 50, 50, -3, 0).road(40, 60, 40, 2, -5).home(80, 0);
    },
    decorate(T, seg, r) {
      const z = seg.zone;
      const i = seg.i;
      const side = r() < 0.5 ? -1 : 1;
      if (i % 14 === 0) T.addSprite(i, 'pole', 1.6);
      if (r() < 0.12) T.addSprite(i, 'saxaul', side * (1.4 + r() * 3.5));
      if (z === 0) {
        if (r() < 0.03) T.addSprite(i, 'shrub', side * (1.3 + r() * 2), { color: '#9a8a52' });
      } else if (z === 1) {
        if (i % 70 === 10) T.addSprite(i, 'yurt', -(2.4 + r() * 1.5));
        if (i % 90 === 40) T.addSprite(i, 'camel', side * (1.8 + r() * 1.4));
        if (i % 55 === 0) T.addSprite(i, 'turbine', 3.6 + r() * 2, { phase: r() * 6 });
      } else {
        if (r() < 0.14) T.addSprite(i, 'reeds', -(1.3 + r() * 2.2));
        if (i % 60 === 20) T.addSprite(i, 'yurt', 2.6 + r() * 1.2);
      }
    },
    extras(T) {
      const s = T.zoneStart;
      return [
        [s[0] + 80, 'sign', 1.25, { label: { ru: 'Конаев 64 км', en: 'Konayev 64 km' } }],
        [s[0] + 380, 'billboard', -1.35, { label: { ru: 'ШАШЛЫК 24/7', en: 'BARBECUE 24/7' } }],
        [s[1] + 200, 'billboard', -1.35, { label: 'ASEMFACE.COM' }],
        [s[2] + 40, 'sign', 1.25, { label: { ru: 'Капшагай', en: 'Kapshagay' }, color: '#24508a' }],
      ];
    },
  },

  {
    id: 'charyn',
    name: { ru: 'Чарынский каньон', en: 'Charyn Canyon' },
    lanes: 2,
    seed: 2026101505,
    fog: 3.5,
    fogColor: '#d3e2ee',
    sky: {
      night: 0,
      stops: [[0, '#2f6fc4'], [0.6, '#6fa8e0'], [1, '#d6e6f2']],
      stars: 0,
      body: { type: 'sun', x: 0.2, y: 0.2, r: 0.04, color: '#fffbe8', glow: 'rgba(255,250,220,0.6)' },
      clouds: { color: '#ffffff', alpha: 0.75, count: 7, top: 0.1, bottom: 0.5 },
      vignette: 0.22,
    },
    ranges: [
      { kind: 'mesa', color: '#c9907a', height: 0.45, amp: 0.55, seed: 61, detail: 7, speed: 0.001 },
      { kind: 'mesa', color: '#a04e36', height: 0.32, amp: 0.65, seed: 67, detail: 9, speed: 0.002, strata: true },
    ],
    ground: [['#c98c5c', '#bf8253'], ['#c4845a', '#ba7a50'], ['#7c8a4a', '#738244']],
    road: ['#5a4b46', '#544641'],
    rumble: ['#a8774f', '#9f7049'],
    lane: '#f4f1ea',
    weather: null,
    zones: [
      { name: { ru: 'Плато', en: 'The plateau' }, gate: { ru: 'ПЛАТО', en: 'PLATEAU' } },
      { name: { ru: 'Долина замков', en: 'Valley of Castles' }, gate: { ru: 'ДОЛИНА ЗАМКОВ', en: 'VALLEY OF CASTLES' } },
      { name: { ru: 'Ясеневая роща', en: 'Ash grove' }, gate: { ru: 'ЯСЕНЕВАЯ РОЩА', en: 'ASH GROVE' } },
    ],
    traffic: { count: 18, oncoming: 0.5, min: 0.2, max: 0.4, kinds: [['suv', 3], ['sedan', 2], ['bus', 1]], colors: ['#e8e8e8', '#30343c', '#c9b458', '#2f6f9e', '#8c4a3a'] },
    fun: {
      zones: [0, 2],
      walkers: 0.018,
      hats: true,
      props: [],
      cones: [[[0, 200], 6, 0.9], [[1, 300], 5, -0.9]],
    },
    police: [[1, 120]],
    holes: 0.004,
    tumbleweeds: 12,
    eagle: true,
    herds: [[0, 330, 7]],
    build(T) {
      T.zone().road(50, 60, 50, 0, 0).road(40, 40, 40, 3, -20).road(40, 40, 40, -3, 20).road(40, 40, 40, 0, 0);
      T.zone().road(30, 30, 30, -5, -30).road(30, 40, 30, 5, 10).road(30, 30, 30, -6, 15).road(30, 30, 30, 4, -10).road(40, 40, 40, -2, 15);
      T.zone().road(40, 60, 40, 3, -15).road(40, 60, 40, -2, 0).home(80, 2);
    },
    decorate(T, seg, r) {
      const z = seg.zone;
      const i = seg.i;
      const side = r() < 0.5 ? -1 : 1;
      if (z === 0) {
        if (r() < 0.12) T.addSprite(i, 'shrub', side * (1.3 + r() * 3));
        if (r() < 0.025) T.addSprite(i, 'hoodoo', side * (2.6 + r() * 3));
        if (i % 80 === 30) T.addSprite(i, 'cliff', side * (4 + r() * 3));
      } else if (z === 1) {
        if (r() < 0.12) T.addSprite(i, 'hoodoo', side * (1.5 + r() * 3), { color: r() < 0.5 ? '#b9573c' : '#c56a45' });
        if (i % 40 === 0) T.addSprite(i, 'cliff', -side * (3.2 + r() * 2.5));
        if (r() < 0.06) T.addSprite(i, 'shrub', -side * (1.3 + r() * 1.5));
        outerRails(T, seg);
      } else {
        if (r() < 0.3) T.addSprite(i, 'ash', side * (1.4 + r() * 3.5));
        if (r() < 0.14) T.addSprite(i, 'ash', -side * (1.6 + r() * 3));
        if (r() < 0.06) T.addSprite(i, 'shrub', side * (1.25 + r() * 0.8), { color: '#6f8a3e' });
      }
    },
    extras(T) {
      const s = T.zoneStart;
      return [
        [s[0] + 60, 'sign', 1.25, { label: { ru: 'Чарын 12 км', en: 'Charyn 12 km' } }],
        [s[1] + 30, 'billboard', -1.35, { label: { ru: 'ДОЛИНА ЗАМКОВ', en: 'VALLEY OF CASTLES' } }],
        [s[2] + 30, 'sign', 1.25, { label: { ru: 'Ясеневая роща', en: 'Ash grove' }, color: '#24508a' }],
      ];
    },
  },
  {
    id: 'kolsai',
    name: { ru: 'Кольсай под дождём', en: 'Kolsai in the rain' },
    lanes: 2,
    seed: 2026101506,
    fog: 5,
    fogColor: '#9aa6b1',
    sky: {
      night: 0.25,
      stops: [[0, '#4f5c6b'], [0.55, '#7c8896'], [1, '#b3bcc5']],
      stars: 0,
      body: null,
      clouds: { color: '#8a95a1', alpha: 0.85, count: 12, top: 0.02, bottom: 0.5 },
      vignette: 0.4,
    },
    ranges: [
      { kind: 'peaks', color: '#56677a', snow: '#c8d2dc', snowLine: 0.45, height: 0.9, amp: 0.85, seed: 71, detail: 13, speed: 0.0012 },
      { kind: 'peaks', color: '#24382f', height: 0.5, amp: 0.7, seed: 73, detail: 17, speed: 0.0022 },
    ],
    water: { top: '#5f8f94', bottom: '#2fa3a0', glint: '#bfe9e6' },
    ground: [['#55703c', '#4f6a37'], ['#3f5a36', '#3a5432'], ['#2f9c98', '#2b9490'], ['#4a6338', '#445d33']],
    road: ['#3b4047', '#373c43'],
    rumble: ['#6d747c', '#676e76'],
    lane: '#e4e7ea',
    weather: { rain: 220 },
    zones: [
      { name: { ru: 'Саты', en: 'Saty' }, gate: { ru: 'САТЫ', en: 'SATY' } },
      { name: { ru: 'Ущелье', en: 'The gorge' }, gate: { ru: 'УЩЕЛЬЕ', en: 'GORGE' } },
      { name: { ru: 'Озеро Каинды', en: 'Lake Kaindy' }, gate: { ru: 'КАИНДЫ', en: 'KAINDY' } },
      { name: { ru: 'Кольсай', en: 'Kolsai' }, gate: { ru: 'КОЛЬСАЙ', en: 'KOLSAI' } },
    ],
    traffic: { count: 26, oncoming: 0.45, min: 0.18, max: 0.36, kinds: [['suv', 4], ['niva', 2], ['bus', 2], ['lada', 1], ['sedan', 1]], colors: ['#e8e8e8', '#30343c', '#7d8590', '#2f6f9e', '#3a6b4a', '#8c4a3a', '#c9b458'] },
    fun: {
      zones: [0, 3],
      walkers: 0.016,
      hats: true,
      props: [],
      cones: [[[1, 220], 6, -0.9]],
    },
    police: [[0, 220]],
    herds: [[0, 380, 6, 'horse'], [1, 300, 5, 'horse'], [3, 160, 6, 'horse'], [1, 520, 7]],
    holes: 0.006,
    puddles: { kind: 'water', rate: 0.009 },
    eagle: true,
    build(T) {
      T.zone().road(50, 60, 50, 0, 0).road(40, 50, 40, 2, 10).road(40, 40, 40, -3, -10).road(40, 50, 40, 0, 5);
      T.zone().road(30, 30, 30, -5, 20).road(30, 30, 30, 5, 15).road(25, 30, 25, -6, 10).road(30, 30, 30, 4, -15).road(30, 40, 30, -3, 10);
      T.zone().road(40, 60, 40, 2, 0).road(40, 60, 40, -2, 0).road(40, 40, 40, 1, 0);
      T.zone().road(30, 30, 30, 5, 15).road(30, 30, 30, -5, -10).road(30, 40, 30, 3, 5).home(100, 2);
    },
    decorate(T, seg, r) {
      const z = seg.zone;
      const i = seg.i;
      const side = r() < 0.5 ? -1 : 1;
      if (z === 0) {
        // Saty: wooden houses with blue windows between golden birches
        if (i % 26 === 0) T.addSprite(i, 'house', side * (2.1 + r() * 1.2), { roof: r() < 0.5 ? '#a3402f' : '#6f7b86', wall: r() < 0.5 ? '#8a5a34' : '#9b6b3e' });
        if (r() < 0.12) T.addSprite(i, 'birch', side * (1.4 + r() * 3), { tone: Math.floor(r() * 3) });
        if (r() < 0.05) T.addSprite(i, 'pine', -side * (2 + r() * 3), { snow: false });
        if (i % 40 === 20) T.addSprite(i, 'pole', -1.3);
      } else if (z === 1) {
        // the gorge: spruce slopes, rocks, a golden birch now and then
        outerRails(T, seg);
        if (r() < 0.4) T.addSprite(i, 'pine', side * (1.3 + r() * 3.4), { snow: false });
        if (r() < 0.18) T.addSprite(i, 'pine', -side * (1.6 + r() * 3), { snow: false });
        if (r() < 0.06) T.addSprite(i, 'birch', side * (1.4 + r() * 2.5), { tone: Math.floor(r() * 3) });
        if (r() < 0.05) T.addSprite(i, 'rock', side * (1.3 + r() * 0.8));
      } else if (z === 2) {
        // Kaindy: the road runs through the lake, drowned spruces stand in turquoise water
        if (r() < 0.22) T.addSprite(i, 'snag', side * (1.5 + r() * 4.5), { tall: 0.6 + r() * 0.4 });
        if (r() < 0.1) T.addSprite(i, 'snag', -side * (1.6 + r() * 4), { tall: 0.6 + r() * 0.4 });
        if (i % 50 === 0) T.addSprite(i, 'pine', side * (6 + r() * 3), { snow: false });
      } else {
        // Kolsai: spruce forest down to the lake with golden birches between
        if (r() < 0.32) T.addSprite(i, 'pine', side * (1.4 + r() * 3.4), { snow: false });
        if (r() < 0.14) T.addSprite(i, 'birch', -side * (1.4 + r() * 3), { tone: Math.floor(r() * 3) });
        if (r() < 0.04) T.addSprite(i, 'rock', side * (1.3 + r() * 0.8));
      }
    },
    extras(T) {
      const s = T.zoneStart;
      return [
        [s[0] + 60, 'sign', 1.25, { label: { ru: 'Саты 3 км', en: 'Saty 3 km' } }],
        [s[1] + 40, 'sign', 1.25, { label: { ru: 'Камнепад', en: 'Falling rocks' }, color: '#8a6d12' }],
        [s[2] + 30, 'billboard', -1.35, { label: { ru: 'КАИНДЫ', en: 'KAINDY' } }],
        [s[3] + 30, 'sign', 1.25, { label: { ru: 'Кольсай 1 км', en: 'Kolsai 1 km' }, color: '#24508a' }],
      ];
    },
  },
  {
    id: 'astana',
    name: { ru: 'Новогодняя Астана', en: 'Astana on New Year\'s Eve' },
    lanes: 3,
    seed: 2026101507,
    fog: 5,
    fogColor: '#262c4a',
    sky: {
      night: 1,
      stops: [[0, '#05081a'], [0.55, '#121838'], [1, '#2f2c58']],
      stars: 0.25,
      body: null,
      clouds: { color: '#2a3156', alpha: 0.6, count: 9, top: 0.05, bottom: 0.4 },
      vignette: 0.5,
    },
    ranges: [
      { kind: 'hills', color: '#1c2240', height: 0.1, amp: 0.4, seed: 81, detail: 5, speed: 0.001 },
    ],
    skyline: { color: '#141a33', windows: true, landmarks: 'astana' },
    ground: [['#8b94aa', '#848da3'], ['#7d869c', '#778096'], ['#7d869c', '#778096'], ['#8b94aa', '#848da3']],
    road: ['#30343d', '#2d3139'],
    rumble: ['#a3abba', '#9aa2b2'],
    lane: '#dfe3ea',
    weather: { snow: 300, wind: 0.35 },
    zones: [
      { name: { ru: 'Трасса из аэропорта', en: 'Airport road' }, gate: { ru: 'АЭРОПОРТ', en: 'AIRPORT' } },
      { name: { ru: 'Проспект Мангилик Ел', en: 'Mangilik El Avenue' }, gate: { ru: 'МАНГИЛИК ЕЛ', en: 'MANGILIK EL' } },
      { name: { ru: 'Хан Шатыр', en: 'Khan Shatyr' }, gate: { ru: 'ХАН ШАТЫР', en: 'KHAN SHATYR' } },
      { name: { ru: 'Байтерек', en: 'Baiterek' }, gate: { ru: 'БАЙТЕРЕК', en: 'BAITEREK' } },
    ],
    traffic: { count: 55, oncoming: 0, min: 0.2, max: 0.42, kinds: [['sedan', 6], ['suv', 3], ['hatch', 2], ['bus', 1], ['plow', 2]], colors: CITY_COLORS },
    fun: {
      zones: [1, 2, 3],
      walkers: 0.018,
      hats: true,
      props: [['snowman', 0.016]],
    },
    police: [[1, 250]],
    holes: 0.002,
    puddles: { kind: 'slush', rate: 0.004 },
    ice: 7,
    weaver: true,
    fireworks: true,
    build(T) {
      T.zone().road(50, 80, 50, 0, 0).road(40, 60, 40, 2, 0).road(40, 60, 40, -1, 5).road(50, 60, 50, 0, -5);
      T.zone().road(30, 50, 30, 3, 0).road(30, 60, 30, -3, 0).road(40, 40, 40, 2, 5);
      T.zone().road(30, 40, 30, -4, 0).road(30, 40, 30, 4, -5).road(40, 50, 40, 0, 0);
      T.zone().road(30, 40, 30, 3, 5).road(40, 60, 40, -2, 0).home(100, 2);
    },
    decorate(T, seg, r) {
      const z = seg.zone;
      const i = seg.i;
      const side = r() < 0.5 ? -1 : 1;
      if (z === 0) {
        // the airport road: snowy steppe in a blizzard
        if (i % 30 === 0) T.addSprite(i, 'pole', -1.3);
        if (r() < 0.06) T.addSprite(i, 'snowbank', side * (1.25 + r() * 0.5));
        if (r() < 0.04) T.addSprite(i, 'fir', side * (2 + r() * 4), { plain: true });
        return;
      }
      // the city: lamps, lit towers, firs with garlands
      if (i % 20 === 0) {
        T.addSprite(i, 'lamp', -1.08);
        T.addSprite(i + 10, 'lamp', 1.08);
      }
      if (i % 8 === 0) building(T, seg, r, side);
      if (i % 12 === 6) building(T, seg, r, -side);
      if (r() < 0.07) T.addSprite(i, 'fir', side * (1.4 + r() * 0.5));
      if (r() < 0.04) T.addSprite(i, 'snowbank', -side * (1.25 + r() * 0.3));
    },
    extras(T) {
      const s = T.zoneStart;
      const N = T.segments.length;
      return [
        [s[0] + 60, 'sign', 1.25, { label: { ru: 'Астана 18 км', en: 'Astana 18 km' } }],
        [s[1] + 30, 'billboard', -1.35, { label: { ru: 'С НОВЫМ ГОДОМ!', en: 'HAPPY NEW YEAR!' } }],
        [s[2] + 40, 'ayaz', 2.0, { phase: 1 }],
        [s[3] + 30, 'billboard', 1.35, { label: { ru: 'ЖАҢА ЖЫЛ', en: 'ЖАҢА ЖЫЛ' } }],
        [N - 45, 'fir', -2.8, { w: 2600, h: 5600 }],
        [N - 25, 'ayaz', 1.45, { phase: 2 }],
      ];
    },
  },
];

export const mapById = (id) => MAPS.find((m) => m.id === id) || MAPS[0];

export const CHAPTERS = [
  {
    map: 'city',
    title: { ru: 'Последний заказ', en: 'The last order' },
    intro: {
      ru: '23:40. Әсем закрывает смену, и тут приходит заказ: горячие баурсаки на Шымбулак, доставить к рассвету. Сначала через весь ночной город.',
      en: '23:40. Asem is closing her shift when an order comes in: hot baursaks to Shymbulak, delivered by sunrise. First, across the whole night city.',
    },
    goal: { ru: 'Проедь город до поворота на Медеу.', en: 'Cross the city to the Medeu turn.' },
    outro: { ru: 'Город позади. Впереди горы, а баурсаки ещё горячие.', en: 'The city is behind. The mountains are ahead and the baursaks are still hot.' },
  },
  {
    map: 'medeu',
    title: { ru: 'Дорога на Медеу', en: 'The road to Medeu' },
    intro: {
      ru: 'Пошёл снег. Серпантин, лавинные галереи и встречные машины на узкой дороге.',
      en: 'Snow starts to fall. Switchbacks, avalanche galleries and oncoming cars on a narrow road.',
    },
    goal: { ru: 'Доберись до Медеу и проскочи плотину.', en: 'Reach Medeu and get past the dam.' },
    outro: { ru: 'Медеу спит под снегом. Выше только Шымбулак.', en: 'Medeu sleeps under the snow. Only Shymbulak is higher.' },
  },
  {
    map: 'shymbulak',
    title: { ru: 'Шымбулак до рассвета', en: 'Shymbulak before sunrise' },
    intro: {
      ru: 'Небо светлеет. До вершины пара километров, а солнце уже поднимается из-за перевала.',
      en: 'The sky is getting lighter. A couple of kilometres to the top, and the sun is already rising behind the pass.',
    },
    goal: { ru: 'Успей к первому лучу.', en: 'Make it before the first ray of sun.' },
    outro: {
      ru: 'Дверь открывается, а там Даур, Ора, Сакен, Ера и Тима с тортом. Заказ был для Әсем: сегодня её день рождения.',
      en: 'The door opens and there are Daur, Ora, Saken, Era and Tima with a cake. The order was for Asem: it is her birthday today.',
    },
  },
  {
    map: 'kapchagay',
    title: { ru: 'Капчагай на закате', en: 'Kapchagay at sunset' },
    intro: {
      ru: 'Через неделю Даур зовёт всех на Капчагай: кто последний до берега, тот жарит шашлык. Степь, ветер, фуры навстречу и закат над водой.',
      en: 'A week later Daur calls everyone to Kapchagay: the last one to the shore cooks the barbecue. Steppe, wind, oncoming trucks and a sunset over the water.',
    },
    goal: { ru: 'Доедь до берега, пока солнце не село.', en: 'Reach the shore before the sun goes down.' },
    outro: { ru: 'Солнце садится в воду. Сакен уже разжигает мангал и делает вид, что так и было задумано.', en: 'The sun sets into the water. Saken is already lighting the grill and pretends it was the plan all along.' },
  },
  {
    map: 'charyn',
    title: { ru: 'Чарын', en: 'Charyn' },
    intro: {
      ru: 'Последняя поездка лета: Тима знает дорогу через каньон. Красные скалы, жара, и Ера опять спорит, что будет на месте раньше всех.',
      en: 'The last trip of the summer: Tima knows a road through the canyon. Red rocks, heat, and Era swears once again to get there first.',
    },
    goal: { ru: 'Проедь Долину замков до ясеневой рощи.', en: 'Drive through the Valley of Castles to the ash grove.' },
    outro: { ru: 'Тень ясеней, холодная река и тишина. Лето удалось.', en: 'The shade of the ash trees, a cold river and silence. A good summer.' },
  },
  {
    map: 'kolsai',
    title: { ru: 'Кольсай под дождём', en: 'Kolsai in the rain' },
    intro: {
      ru: 'Осень. Ора уверяет, что дождя не будет, и все едут на Кольсай прямо под ливень: Саты, ущелье, озеро Каинды с затопленным лесом, а на дороге табуны.',
      en: 'Autumn. Ora promises it will not rain, and everyone drives to Kolsai straight into a downpour: Saty, the gorge, Lake Kaindy with its sunken forest, and herds of horses on the road.',
    },
    goal: { ru: 'Доберись до озера Кольсай, пока не стемнело.', en: 'Reach Lake Kolsai before dark.' },
    outro: {
      ru: 'Дождь кончился прямо над озером. Термос с чаем, отсыревшие баурсаки и все шестеро на одном мостике. Хороший год.',
      en: 'The rain stopped right over the lake. A thermos of tea, damp baursaks and all six of them on one little pier. A good year.',
    },
  },
  {
    map: 'astana',
    title: { ru: 'Новый год в Астане', en: 'New Year in Astana' },
    intro: {
      ru: '31 декабря. Тима зовёт всех встречать Новый год у Байтерека. Минус тридцать, буран, снегоуборщики и гололёд, а до полуночи совсем немного.',
      en: 'December 31st. Tima invites everyone to see the New Year in at Baiterek. Minus thirty, a blizzard, snowplows and black ice, and midnight is close.',
    },
    goal: { ru: 'Успей к Байтереку до полуночи.', en: 'Reach Baiterek before midnight.' },
    outro: {
      ru: 'Куранты, салют над Байтереком и шесть кружек горячего чая. Аяз ата раздаёт баурсаки, и все сходятся на одном: следующий год будет ещё лучше.',
      en: 'The chimes, fireworks over Baiterek and six mugs of hot tea. Ayaz Ata hands out baursaks, and everyone agrees on one thing: next year will be even better.',
    },
  },
];

// Asem's friends: they race along in every run, with their names over the cars;
// car models are written in Latin letters in both languages
export const FRIENDS = [
  { name: { ru: 'Даур', en: 'Daur' }, model: 'Skoda', kind: 'octavia', color: '#18a39a' },
  { name: { ru: 'Ора', en: 'Ora' }, model: 'Sorento', kind: 'sorento', color: '#f08a24' },
  { name: { ru: 'Сакен', en: 'Saken' }, model: 'Kia', kind: 'kia', color: '#3f6fd8' },
  { name: { ru: 'Ера', en: 'Era' }, model: 'Volkswagen', kind: 'golf', color: '#eeeeee' },
  { name: { ru: 'Тима', en: 'Tima' }, model: 'Changan', kind: 'changan', color: '#6b8e23' },
];

export const CARS = [
  { id: 'hatch', kind: 'hatch', color: '#d7263d', stars: 0, stats: { speed: 1, accel: 1, grip: 1, offroad: 1 } },
  { id: 'camry', kind: 'sedan', color: '#e9e9ea', stars: 0, stats: { speed: 1.03, accel: 0.95, grip: 1.05, offroad: 0.9 } },
  { id: 'lada', kind: 'lada', color: '#c9b458', stars: 0, stats: { speed: 0.88, accel: 0.86, grip: 0.95, offroad: 1.5 } },
  { id: 'niva', kind: 'niva', color: '#3f6b4a', stars: 0, stats: { speed: 0.92, accel: 0.95, grip: 1.1, offroad: 2.2 } },
  { id: 'gelik', kind: 'gelik', color: '#1d1f24', stars: 5, stats: { speed: 0.98, accel: 1.08, grip: 0.95, offroad: 2 } },
  { id: 'sport', kind: 'sport', color: '#f2b705', stars: 9, stats: { speed: 1.12, accel: 1.2, grip: 0.82, offroad: 0.8 } },
  { id: 'electric', kind: 'electric', color: '#2f5fbf', stars: 12, electric: true, stats: { speed: 1.08, accel: 1.45, grip: 1, offroad: 0.85 } },
];

export const PAINTS = ['#d7263d', '#e9e9ea', '#1d1f24', '#9aa3ad', '#2f5fbf', '#18a39a', '#2f7d4f', '#c9b458', '#f2b705', '#f08a24', '#7d3c98', '#e86a9a'];
