// First person: you stand behind the line in an aul yard at sunset and throw from your own hand.
// The yard is a photo (img/yard.jpg); bones, kids, dust and the guide are drawn over it in the
// same perspective. A pinhole camera stands behind the line at height CAM.h looking at the kon;
// the photo's horizon is at 41% of its height and the camera is fitted to it.
import { KON, LINE_Y } from './physics.js';
import { rng } from './util.js';

const AR = 1920 / 1072; // the yard photos
export const CAM = { x: 50, y: 230, h: 30, horizon: 0.41, focal: 2.0 };
// each yard photo has its horizon at its own height
const YARDS = { yard: { horizon: 0.41 }, school: { horizon: 0.55 }, winter: { horizon: 0.5 } };
// winter: the kids in coats and fur hats, snow falling, the hens stay in the barn
export let season = 'summer';
let yardName = 'yard';
export const hasYard = (name) => !!img[name];
export function setYard(name, canvas) {
  yardName = img[name] ? name : 'yard';
  CAM.horizon = YARDS[yardName].horizon;
  season = yardName === 'winter' && img['kidw0-watch'] ? 'winter' : 'summer';
  if (canvas) resize(canvas);
}
// world units per sprite pixel for the kids (all cut from frames of the same size)
const KID_UNITS = 36 / 518;
// where the knucklebone sits in the hand photo, as a share of its 16:9 frame
const HAND_BONE = { x: 0.465, y: 0.45 };

export const view = { w: 0, h: 0, dpr: 1, f: 1, cx: 0, hy: 0, imgX: 0, imgY: 0, imgW: 0, imgH: 0 };
const img = {};
let meta = {};
let backdrop = null;
let overlay = null;
let grain = null;

// ---------- assets ----------
const KID_POSES = ['watch', 'cheer', 'sad'];
const SIDES = ['alshy', 'taike', 'buk', 'shik'];

export const AGA_POSES = ['watch', 'throw', 'cheer', 'sad'];
const ANIMALS = ['hen-walk', 'hen-peck', 'rooster', 'dog-trot', 'dog-sit'];

function loadImage(n) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      img[n] = im;
      res();
    };
    im.onerror = rej;
    im.src = `img/${n}.webp`;
  });
}

// the second yard and the agas are needed only later: they load while the first kon is played
export let extrasReady = Promise.resolve();

export async function loadArt(onProgress) {
  meta = await fetch('img/sprites.json').then((r) => r.json());
  const names = ['yard', 'hand-hold', 'hand-open', ...ANIMALS];
  for (let i = 0; i < 5; i++) for (const p of KID_POSES) names.push(`kid${i}-${p}`);
  for (const c of ['white', 'red']) for (const s of SIDES) names.push(`asyk-${c}-${s}`);
  let done = 0;
  // animals may be missing on an older build: the game goes on without them
  await Promise.all(names.map((n) => loadImage(n).then(() => onProgress && onProgress(++done / names.length), (e) => (ANIMALS.includes(n) ? null : Promise.reject(e)))));
  const extra = ['school', 'winter'];
  for (const a of ['erlan', 'dauren', 'saken']) for (const p of AGA_POSES) extra.push(`aga-${a}-${p}`);
  for (let i = 0; i < 5; i++) for (const p of KID_POSES) extra.push(`kidw${i}-${p}`);
  extrasReady = Promise.all(extra.map((n) => loadImage(n).catch(() => null)));
  // the photos caught some green from the backdrop: no channel may beat red on a bone
  for (const c of ['white', 'red']) for (const s of SIDES) img[`asyk-${c}-${s}`] = degreen(img[`asyk-${c}-${s}`]);
  // dyed bones (worth more) are the red ones turned pink, so they never look like the saka
  for (const s of SIDES) img[`asyk-pink-${s}`] = tint(img[`asyk-red-${s}`]);
  // the aga's saka has lead poured into it: dull grey
  for (const s of SIDES) img[`asyk-lead-${s}`] = lead(img[`asyk-red-${s}`]);
  for (const s of SIDES) img[`asyk-gold-${s}`] = gold(img[`asyk-white-${s}`]);
}

// the lucky saka: a bone rubbed with gold paint
function gold(im) {
  const c = canvas2(im.width, im.height);
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3;
    d.data[i] = Math.min(255, v * 1.15 + 30);
    d.data[i + 1] = Math.min(255, v * 0.88 + 10);
    d.data[i + 2] = v * 0.3;
  }
  x.putImageData(d, 0, 0);
  return c;
}

// a small picture of a bone for the bazaar cards
export function boneIcon(look, size = 64) {
  const im = img[`asyk-${look}-alshy`] || img['asyk-red-alshy'];
  const c = canvas2(size * 2, size * 2);
  const x = c.getContext('2d');
  const k = Math.min((size * 2) / im.width, (size * 2) / im.height) * 0.9;
  x.drawImage(im, (size * 2 - im.width * k) / 2, (size * 2 - im.height * k) / 2, im.width * k, im.height * k);
  return c;
}

function lead(im) {
  const c = canvas2(im.width, im.height);
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = (d.data[i] * 0.5 + d.data[i + 1] * 0.3 + d.data[i + 2] * 0.2) * 0.75;
    d.data[i] = v * 0.95;
    d.data[i + 1] = v;
    d.data[i + 2] = v * 1.08;
  }
  x.putImageData(d, 0, 0);
  return c;
}

function canvas2(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function degreen(im) {
  const c = canvas2(im.width, im.height);
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    // warm the bone back up: green and blue may not beat a share of red
    const r = d.data[i];
    const g = Math.min(d.data[i + 1], r * 0.93);
    d.data[i + 1] = g;
    d.data[i + 2] = Math.min(d.data[i + 2], g * 0.88);
  }
  x.putImageData(d, 0, 0);
  return c;
}

function tint(im) {
  const c = canvas2(im.width, im.height);
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const r = d.data[i];
    d.data[i] = Math.min(255, r * 1.08 + 20);
    d.data[i + 1] = Math.min(255, d.data[i + 1] * 1.1 + 25);
    d.data[i + 2] = Math.min(255, d.data[i + 2] + r * 0.62);
  }
  x.putImageData(d, 0, 0);
  return c;
}

// ---------- camera ----------
export function project(x, y, z = 0) {
  const D = CAM.y - y;
  if (D < 1) return null;
  return { x: view.cx + (view.f * (x - CAM.x)) / D, y: view.hy + (view.f * (CAM.h - z)) / D, D, k: view.f / D };
}
// a screen point at a given depth back to the world (for the hand)
export function unproject(sx, sy, D) {
  return { x: CAM.x + ((sx - view.cx) * D) / view.f, y: CAM.y - D, z: CAM.h - ((sy - view.hy) * D) / view.f };
}

export function resize(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  let imgH;
  let imgY;
  if (w / h >= 1.2) {
    // wide: the photo covers the screen, a little closer than the whole frame so the kon reads
    imgH = Math.max(h * 1.2, w / AR);
    imgY = Math.min(0, Math.max(h - imgH, h * 0.36 - imgH * CAM.horizon));
  } else {
    // tall: the kon must fit across, the rest above and below is the photo mirrored
    imgH = Math.min(h, w * 1.75);
    imgY = Math.min(h - imgH, h * 0.38 - imgH * CAM.horizon);
  }
  const imgW = imgH * AR;
  Object.assign(view, { w, h, dpr, imgH, imgW, imgY, imgX: (w - imgW) / 2, f: CAM.focal * imgH, cx: w / 2, hy: imgY + imgH * CAM.horizon });
  bakeBackdrop();
  bakeOverlay();
}

// ---------- the yard ----------
function scratch(c, pts, r, width, color) {
  c.strokeStyle = color;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let pass = 0; pass < 3; pass++) {
    c.lineWidth = width * (pass ? 0.5 : 1);
    c.globalAlpha = pass ? 0.45 : 0.75;
    c.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = x + (r() - 0.5) * width * 0.8;
      const jy = y + (r() - 0.5) * width * 0.5;
      if (i) c.lineTo(jx, jy);
      else c.moveTo(jx, jy);
    });
    c.stroke();
  }
  c.globalAlpha = 1;
}

function bakeBackdrop() {
  const { w, h, dpr, imgX, imgY, imgW, imgH } = view;
  const b = canvas2(w * dpr, h * dpr);
  const c = b.getContext('2d');
  c.scale(dpr, dpr);
  const yard = img[yardName];
  c.drawImage(yard, imgX, imgY, imgW, imgH);
  // tall screens: mirror the sky upwards and the dirt downwards, so there is no empty band
  if (imgY > 0) {
    c.save();
    c.translate(0, imgY);
    c.scale(1, -1);
    c.drawImage(yard, imgX, 0, imgW, imgH);
    c.restore();
  }
  if (imgY + imgH < h) {
    c.save();
    c.translate(0, imgY + imgH);
    c.scale(1, -1);
    c.drawImage(yard, imgX, -imgH, imgW, imgH);
    c.restore();
  }
  const r = rng(1987);
  // the kon, scratched with a stick into the dirt
  const ring = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const p = project(KON.x + Math.cos(a) * KON.r, KON.y + Math.sin(a) * KON.r);
    ring.push([p.x, p.y]);
  }
  const lw = Math.max(1.5, view.f * 0.006);
  scratch(c, ring, r, lw, 'rgba(70, 42, 24, 0.7)');
  // light rim along the groove: the low sun catches its far edge
  c.save();
  c.globalAlpha = 0.25;
  c.strokeStyle = '#ffe2b0';
  c.lineWidth = lw * 0.6;
  c.beginPath();
  ring.forEach(([x, y], i) => (i ? c.lineTo(x, y - lw * 0.7) : c.moveTo(x, y - lw * 0.7)));
  c.stroke();
  c.restore();
  const line = [];
  for (let i = 0; i <= 30; i++) {
    const p = project(10 + i * 2.7, LINE_Y - 6);
    line.push([p.x, p.y]);
  }
  scratch(c, line, r, lw * 1.3, 'rgba(70, 42, 24, 0.6)');
  backdrop = b;
}

function bakeOverlay() {
  const { w, h, dpr } = view;
  const o = canvas2(w * dpr, h * dpr);
  const c = o.getContext('2d');
  c.scale(dpr, dpr);
  const v = c.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.hypot(w, h) * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(40, 18, 10, 0.42)');
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
  overlay = o;
  const gt = canvas2(160, 160);
  const gc = gt.getContext('2d');
  const id = gc.createImageData(160, 160);
  const r = rng(7);
  for (let i = 0; i < id.data.length; i += 4) {
    const k = r() * 255;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = k;
    id.data[i + 3] = 18;
  }
  gc.putImageData(id, 0, 0);
  grain = gt;
}

export function drawBackdrop(c) {
  c.drawImage(backdrop, 0, 0, view.w, view.h);
}

export function drawOverlay(c, t) {
  c.drawImage(overlay, 0, 0, view.w, view.h);
  const pat = c.createPattern(grain, 'repeat');
  c.save();
  c.translate(((t * 997) % 160) | 0, ((t * 613) % 160) | 0);
  c.fillStyle = pat;
  c.fillRect(-160, -160, view.w + 320, view.h + 320);
  c.restore();
}

// ---------- things on the ground ----------
// which photo of a bone: its colour and the side it shows
function boneImage(b) {
  const col = b.kind === 'saka' ? (b.owner === 'aga' ? 'lead' : b.look || 'red') : b.painted ? 'pink' : 'white';
  let side = b.face || 'buk';
  // a tumbling bone flips through its sides
  if (b.tumble) side = SIDES[Math.floor(Math.abs(b.ang) / 1.2) % 4];
  return img[`asyk-${col}-${side}`];
}

function shadow(c, x, y, rx, D, alpha) {
  const p = project(x + rx * 0.35, y - rx * 0.1);
  if (!p) return;
  const sx = rx * p.k;
  const sy = Math.max(1.2, sx * (CAM.h / D) * 1.4);
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = '#2a160c';
  c.beginPath();
  c.ellipse(p.x, p.y, sx * 1.15, sy, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export function drawBone(c, b, z = 0, alpha = 1, glow = 0) {
  const p = project(b.x, b.y, z);
  if (!p) return;
  const im = boneImage(b);
  const upright = (b.face === 'shik' && !b.tumble) || im === img['asyk-white-shik'];
  const width = b.r * (upright ? 1.9 : 2.5) * p.k;
  const iw = im.width;
  const ih = im.height;
  const height = (width * ih) / iw;
  // long evening shadow first; it shrinks and fades when the bone is in the air
  shadow(c, b.x, b.y, b.r * 1.35, p.D, (0.38 - Math.min(0.25, z * 0.02)) * alpha);
  c.save();
  c.globalAlpha = alpha;
  c.translate(p.x, p.y + height * 0.12);
  // turning on the ground shows as the photo narrowing and flipping
  const turn = Math.cos(b.ang);
  c.scale((turn < 0 ? -1 : 1) * (0.72 + 0.28 * Math.abs(turn)), 1);
  if (glow) {
    c.shadowColor = `rgba(255, 220, 140, ${glow})`;
    c.shadowBlur = 14;
  }
  c.drawImage(im, -width / 2, -height, width, height);
  c.restore();
}

// ---------- kids ----------
export const tall = () => view.w / view.h < 1.2;

export function kidSpots(duel) {
  // feet positions around the kon; in a duel the girl steps aside so the aga can throw.
  // A phone held upright shows a narrow slice of the yard: all five gather in a tight arc behind the kon.
  if (tall())
    return duel
      ? [
          [27, 28],
          [36, 8],
          [65, 6],
          [74, 27],
          [60, -14],
        ]
      : [
          [28, 26],
          [39, 10],
          [51, 2],
          [63, 8],
          [74, 24],
        ];
  return duel
    ? [
        [4, 64],
        [20, 22],
        [33, 2],
        [77, 16],
        [96, 60],
      ]
    : [
        [4, 64],
        [22, 20],
        [50, 6],
        [77, 16],
        [96, 60],
      ];
}

export function makeKids() {
  // feet positions around the kon; the tall boy stands on the right, the small one in the cap behind
  const spots = [
    [4, 64],
    [22, 20],
    [50, 6],
    [77, 16],
    [96, 60],
  ];
  return spots.map(([x, y], i) => ({ i, x, y, pose: 'watch', until: 0, delay: 0, next: null, bob: i * 1.7 }));
}

export function setPose(kid, pose, now, hold = 1.8, delay = 0) {
  kid.next = pose;
  kid.delay = now + delay;
  kid.until = now + delay + hold;
}

export function updateKids(kids, now) {
  for (const k of kids) {
    if (k.next && now >= k.delay) {
      k.pose = k.next;
      k.next = null;
      k.jump = k.pose === 'cheer' ? now : 0;
    }
    if (k.pose !== 'watch' && !k.next && now > k.until) k.pose = 'watch';
  }
}

export function drawKid(c, k, now) {
  const p = project(k.x, k.y);
  if (!p) return;
  const im = img[`${season === 'winter' ? 'kidw' : 'kid'}${k.i}-${k.pose}`];
  const scale = KID_UNITS * p.k;
  const width = im.width * scale;
  const height = im.height * scale;
  // breathing, a hop when cheering, a nod while talking, and now and then a shift of weight
  const breathe = 1 + Math.sin(now * 2.2 + k.bob) * 0.008;
  const hop = k.jump ? Math.max(0, Math.sin(Math.min(1, (now - k.jump) / 0.45) * Math.PI)) * height * 0.06 : 0;
  const talk = k.talking ? Math.abs(Math.sin(now * 9)) * height * 0.012 : 0;
  const shift = Math.sin(now * 0.37 + k.bob * 3) > 0.92 ? Math.sin(now * 3) * width * 0.03 : 0;
  shadow(c, k.x + 2.5, k.y, 7, p.D, 0.2);
  c.save();
  c.translate(p.x + shift, p.y + 2 * scale - hop - talk);
  c.scale(1, breathe);
  c.drawImage(im, -width / 2, -height, width, height);
  c.restore();
  k.head = { x: p.x + shift, y: p.y - height - hop, s: height };
}

// ---------- the aga: a teenager who throws from the far side of the kon ----------
export const agaArt = (id) => !!img[`aga-${id}-watch`];

export function drawAga(c, a, now) {
  const p = project(a.x, a.y);
  if (!p || !agaArt(a.id)) return;
  const im = img[`aga-${a.id}-${a.pose}`] || img[`aga-${a.id}-watch`];
  // all four poses are cut from one frame: the standing one is 1.65 m tall
  const scale = (41 / img[`aga-${a.id}-watch`].height) * p.k;
  const width = im.width * scale;
  const height = im.height * scale;
  const breathe = 1 + Math.sin(now * 2 + 1) * 0.007;
  const talk = a.talking ? Math.abs(Math.sin(now * 8)) * height * 0.01 : 0;
  shadow(c, a.x + 3, a.y, 9, p.D, 0.34);
  c.save();
  c.translate(p.x, p.y + 2 * scale - talk);
  c.scale(1, breathe);
  c.drawImage(im, -width / 2, -height, width, height);
  c.restore();
  a.head = { x: p.x, y: p.y - height, s: height };
}

// ---------- speech bubbles over heads ----------
export function drawBubbles(c, bubbles) {
  const u = Math.max(12, Math.min(view.w, view.h) * 0.026);
  c.save();
  c.font = `700 ${Math.round(u)}px "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const b of bubbles) {
    const h = b.who && b.who.head;
    if (!h) continue;
    const k = 1 - b.life / b.max;
    const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.4 : 1;
    c.globalAlpha = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
    const tw = c.measureText(b.text).width;
    const bw = tw + u * 1.3;
    const bh = u * 1.9;
    const x = Math.max(bw / 2 + 4, Math.min(view.w - bw / 2 - 4, h.x));
    const y = Math.max(bh + 4, h.y - u * 0.8);
    const tail = Math.max(-bw / 2 + bh / 2, Math.min(bw / 2 - bh / 2, h.x - x));
    c.save();
    c.translate(x, y - bh / 2);
    c.scale(pop, pop);
    c.fillStyle = 'rgba(255, 250, 238, 0.96)';
    c.strokeStyle = 'rgba(70, 35, 15, 0.55)';
    c.lineWidth = 1.5;
    const r = bh / 2;
    c.beginPath();
    c.moveTo(-bw / 2 + r, -bh / 2);
    c.arcTo(bw / 2, -bh / 2, bw / 2, bh / 2, r);
    c.arcTo(bw / 2, bh / 2, -bw / 2, bh / 2, r);
    c.lineTo(tail + u * 0.35, bh / 2);
    c.lineTo(tail, bh / 2 + u * 0.6);
    c.lineTo(tail - u * 0.2, bh / 2);
    c.arcTo(-bw / 2, bh / 2, -bw / 2, -bh / 2, r);
    c.arcTo(-bw / 2, -bh / 2, bw / 2, -bh / 2, r);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#3b2416';
    c.fillText(b.text, 0, 1);
    c.restore();
  }
  c.restore();
}

// ---------- life in the yard ----------
// hens peck about behind the kon and scatter from a flying bone; a dog trots by now and then
const ANIMAL_UNITS = { hen: 7.5, rooster: 10, dog: 12 };
export function makeLife(seed = 3) {
  const r = rng(seed);
  const hens = [];
  for (let i = 0; i < 3; i++) hens.push({ kind: i === 2 ? 'rooster' : 'hen', x: 10 + r() * 80, y: -45 - r() * 30, tx: 0, ty: 0, wait: r() * 3, peck: 0, dir: -1, run: 0 });
  return {
    hens,
    dog: { x: -60, y: -70, on: false, sit: 0, dir: 1, next: 8 + r() * 10, sitAt: null },
    birds: [],
    nextBird: 2,
    motes: Array.from({ length: 26 }, () => ({ x: r(), y: r(), s: 0.4 + r(), p: r() * 6 })),
    rand: r,
  };
}

// danger: bodies flying fast; returns how many swallows just appeared (for their chirp)
export function updateLife(L, dt, danger) {
  const r = L.rand;
  for (const h of L.hens) {
    const d = danger.find((b) => Math.hypot(b.x - h.x, b.y - h.y) < 16);
    if (d) {
      // run away from it, flapping
      const a = Math.atan2(h.y - d.y, h.x - d.x);
      h.tx = h.x + Math.cos(a) * 25;
      h.ty = Math.min(-30, h.y + Math.sin(a) * 25);
      h.run = 0.8;
      h.wait = 0;
    }
    h.run = Math.max(0, h.run - dt);
    if (h.wait > 0) {
      h.wait -= dt;
      h.peck = Math.max(0, h.peck - dt);
      if (h.peck <= 0 && r() < dt * 0.8) h.peck = 0.6;
      if (h.wait <= 0) {
        h.tx = Math.max(-20, Math.min(120, h.x + (r() - 0.5) * 40));
        h.ty = Math.max(-75, Math.min(-35, h.y + (r() - 0.5) * 20));
      }
      continue;
    }
    const dx = h.tx - h.x;
    const dy = h.ty - h.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) {
      h.wait = 1 + r() * 4;
      continue;
    }
    const sp = h.run > 0 ? 40 : 7;
    h.dir = dx < 0 ? -1 : 1;
    h.x += (dx / dist) * Math.min(dist, sp * dt);
    h.y += (dy / dist) * Math.min(dist, sp * dt);
  }
  const g = L.dog;
  if (!g.on) {
    g.next -= dt;
    if (g.next <= 0) {
      g.on = true;
      g.x = r() < 0.5 ? -50 : 150;
      g.y = -60 - r() * 20;
      g.dir = g.x < 0 ? 1 : -1;
      g.sit = 0;
      g.sitAt = 30 + r() * 40;
    }
  } else if (g.sit > 0) {
    g.sit -= dt;
  } else {
    g.x += g.dir * 22 * dt;
    if (g.sitAt != null && Math.abs(g.x - g.sitAt) < 1) {
      g.sit = 3 + r() * 4;
      g.sitAt = null;
    }
    if (g.x < -60 || g.x > 160) {
      g.on = false;
      g.next = 15 + r() * 20;
    }
  }
  for (const b of L.birds) {
    b.x += b.dir * b.sp * dt;
    b.ph += dt * 14;
    b.y += Math.sin(b.ph * 0.15 + b.wob) * dt * 0.02;
  }
  L.birds = L.birds.filter((b) => b.x > -0.2 && b.x < 1.2);
  // swallows cut across the sky in ones, twos and threes
  L.nextBird -= dt;
  if (L.nextBird > 0) return 0;
  const n = 1 + Math.floor(r() * 3);
  const dir = r() < 0.5 ? 1 : -1;
  const y = 0.05 + r() * 0.25;
  for (let i = 0; i < n; i++) L.birds.push({ x: dir > 0 ? -0.05 - i * 0.04 : 1.05 + i * 0.04, y: y + (r() - 0.5) * 0.06, dir, sp: 0.18 + r() * 0.12, ph: r() * 6, wob: r() * 6 });
  L.nextBird = 4 + r() * 8;
  return n;
}

export function lifeItems(L) {
  const out = [];
  for (const h of season === 'winter' ? [] : L.hens) {
    const name = h.kind === 'rooster' ? 'rooster' : h.peck > 0 && h.wait > 0 ? 'hen-peck' : 'hen-walk';
    out.push({ D: CAM.y - h.y, draw: (c) => drawAnimal(c, name, h.x, h.y, h.kind === 'rooster' ? 'rooster' : 'hen', h.dir, h.wait <= 0) });
  }
  const g = L.dog;
  if (g.on) out.push({ D: CAM.y - g.y, draw: (c) => drawAnimal(c, g.sit > 0 ? 'dog-sit' : 'dog-trot', g.x, g.y, 'dog', g.dir, g.sit <= 0) });
  return out;
}

function drawAnimal(c, name, x, y, kind, dir, moving) {
  const im = img[name];
  const base = img[kind === 'rooster' ? 'rooster' : kind === 'dog' ? 'dog-trot' : 'hen-walk'];
  const p = project(x, y);
  if (!im || !base || !p) return;
  const scale = (ANIMAL_UNITS[kind] / base.height) * p.k;
  const w = im.width * scale;
  const h = im.height * scale;
  const bob = moving ? Math.abs(Math.sin(performance.now() / 90)) * h * 0.04 : 0;
  shadow(c, x + 1.5, y, kind === 'dog' ? 8 : 4, p.D, 0.28);
  c.save();
  c.translate(p.x, p.y + 1 - bob);
  // which way each photo faces: hens and the rooster look right, the trotting dog left
  const facing = name.startsWith('dog') ? -1 : 1;
  if (dir !== facing && name !== 'dog-sit') c.scale(-1, 1);
  c.drawImage(im, -w / 2, -h, w, h);
  c.restore();
}

// swallows and specks of dust gold in the low sun: screen space, over the yard
export function drawAir(c, L, t) {
  c.save();
  c.strokeStyle = 'rgba(30, 22, 30, 0.85)';
  c.lineCap = 'round';
  const s = Math.max(5, view.h * 0.012);
  for (const b of L.birds) {
    const x = b.x * view.w;
    const y = view.imgY + b.y * view.imgH;
    const f = Math.sin(b.ph) * 0.7;
    c.lineWidth = Math.max(1.5, s * 0.28);
    c.beginPath();
    c.moveTo(x - s, y - s * f);
    c.quadraticCurveTo(x - s * 0.4, y - s * 0.2, x, y);
    c.quadraticCurveTo(x + s * 0.4, y - s * 0.2, x + s, y - s * f);
    c.stroke();
  }
  if (season === 'winter') {
    c.fillStyle = '#fffaf2';
    for (const m of L.motes) {
      for (let j = 0; j < 3; j++) {
        const x = ((m.x + j * 0.31 + Math.sin(t * 0.6 + m.p + j) * 0.01) % 1) * view.w;
        const y = ((m.y + j * 0.37 + t * (0.03 + m.s * 0.025)) % 1) * view.h;
        c.globalAlpha = 0.55 + 0.3 * m.s * 0.5;
        c.beginPath();
        c.arc(x, y, 1 + m.s * 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
    return;
  }
  c.fillStyle = '#ffe7b0';
  for (const m of L.motes) {
    const x = ((m.x + t * 0.004 * m.s) % 1) * view.w * 0.55;
    const y = view.h * (0.15 + ((m.y + Math.sin(t * 0.3 + m.p) * 0.02 + 1) % 1) * 0.6);
    c.globalAlpha = 0.25 + 0.25 * Math.sin(t * 1.3 + m.p);
    c.beginPath();
    c.arc(x, y, 0.8 + m.s * 0.9, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

// a round portrait cut from a person's sprite, for the dialogue box
export function portrait(who, size = 72) {
  const key = who.kid != null ? `kid${who.kid}-watch` : who.aga ? `aga-${who.aga}-watch` : null;
  const im = key && img[key];
  const cv = canvas2(size * 2, size * 2);
  const c = cv.getContext('2d');
  c.beginPath();
  c.arc(size, size, size, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = '#c9a273';
  c.fillRect(0, 0, size * 2, size * 2);
  if (im) {
    // the head is the top of the sprite
    const hw = im.width * 0.62;
    c.drawImage(im, im.width * 0.19, 0, hw, hw, 0, size * 0.08, size * 2, size * 2);
  } else {
    c.fillStyle = '#8f2f2a';
    c.font = `700 ${size}px Georgia, serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(who.name ? who.name[0] : '?', size, size * 1.05);
  }
  return cv;
}


// ---------- the hand ----------
// frame: the hand photo's 16:9 frame on screen, anchored to the bottom right
// the bone in the hand sits right of the kon and low, the arm runs off the bottom-right corner
function handFrame() {
  const { w, h } = view;
  const m = meta['hand-hold'];
  const wide = w / h >= 1.2;
  const fw = wide ? Math.min(w * 0.62, h * 1.1) : w * 0.95;
  const fh = (fw * m.fh) / m.fw;
  const bx = w * (wide ? 0.7 : 0.72);
  const by = h * (wide ? 0.8 : 0.85);
  return { x: bx - fw * HAND_BONE.x, y: by - fh * HAND_BONE.y, w: fw, h: fh };
}

// where the knucklebone in the hand is on screen right now (for the throw to start from)
export function handBone(hand) {
  const F = handFrame();
  return { x: F.x + F.w * HAND_BONE.x + hand.dx, y: F.y + F.h * HAND_BONE.y + hand.dy };
}

export function drawHand(c, hand) {
  if (hand.hidden >= 1) return;
  const F = handFrame();
  const name = hand.open ? 'hand-open' : 'hand-hold';
  const m = meta[name];
  const k = F.w / m.fw;
  c.save();
  c.translate(hand.dx, hand.dy + hand.hidden * F.h * 0.8);
  // the wrist is the pivot: the hand cocks back when pulled
  const px = F.x + F.w * 0.85;
  const py = F.y + F.h * 0.95;
  c.translate(px, py);
  c.rotate(hand.rot);
  c.scale(hand.scale, hand.scale);
  c.translate(-px, -py);
  c.drawImage(img[name], F.x + m.x * k, F.y + m.y * k, m.w * k, m.h * k);
  // another saka from the bazaar: its picture over the red one in the photo
  if (!hand.open && hand.look && hand.look !== 'red') {
    const bone = img[`asyk-${hand.look}-alshy`];
    if (bone) {
      const bw = F.w * 0.155;
      const bh = (bw * bone.height) / bone.width;
      c.save();
      c.translate(F.x + F.w * HAND_BONE.x, F.y + F.h * HAND_BONE.y);
      c.rotate(-0.25);
      c.drawImage(bone, -bw / 2, -bh / 2, bw, bh);
      c.restore();
    }
  }
  c.restore();
}

// ---------- guide ----------
// arc from the hand to where the saka lands, then a dotted path on the ground to the first touch
export function drawGuide(c, from, land, hit, t, power) {
  const col = power < 0.5 ? '#fff3cf' : power < 0.85 ? '#ffc35a' : '#ff7a45';
  c.save();
  // arc in the air
  c.fillStyle = col;
  const steps = 18;
  for (let i = 2; i <= steps; i++) {
    const s = i / steps;
    const x = from.x + (land.x - from.x) * s;
    const y = from.y + (land.y - from.y) * s;
    const z = from.z * (1 - s) + arcHeight(power) * 4 * s * (1 - s);
    const p = project(x, y, z);
    if (!p) continue;
    c.globalAlpha = 0.35 + s * 0.5;
    c.beginPath();
    c.arc(p.x, p.y, Math.min(4.5, Math.max(1.5, p.k * 0.45)), 0, Math.PI * 2);
    c.fill();
  }
  // landing mark
  const L = project(land.x, land.y);
  c.globalAlpha = 0.9;
  c.strokeStyle = col;
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(L.x, L.y, 3.2 * L.k, Math.max(2, 3.2 * L.k * (CAM.h / L.D)), 0, 0, Math.PI * 2);
  c.stroke();
  // on the ground
  const len = Math.hypot(hit.x - land.x, hit.y - land.y);
  const n = Math.floor(len / 2.6);
  for (let i = 1; i <= n; i++) {
    const s = (i + ((t * 2) % 1)) / (n + 1);
    const p = project(land.x + (hit.x - land.x) * s, land.y + (hit.y - land.y) * s);
    if (!p) continue;
    c.globalAlpha = 0.9 - s * 0.4;
    c.fillStyle = 'rgba(50, 20, 8, 0.5)';
    c.beginPath();
    c.ellipse(p.x + 1, p.y + 1, Math.max(1.6, p.k * 0.6), Math.max(1, p.k * 0.6 * (CAM.h / p.D) * 1.6), 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(p.x, p.y, Math.max(1.6, p.k * 0.6), Math.max(1, p.k * 0.6 * (CAM.h / p.D) * 1.6), 0, 0, Math.PI * 2);
    c.fill();
  }
  // ghost of the saka at the first touch and where the bone it hits will go
  const g = project(hit.x, hit.y);
  if (g) {
    c.globalAlpha = 0.9;
    c.strokeStyle = col;
    c.setLineDash([5, 4]);
    c.beginPath();
    c.ellipse(g.x, g.y, 3.4 * g.k, Math.max(2, 3.4 * g.k * (CAM.h / g.D) * 1.5), 0, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
  }
  if (hit.target) {
    const a = project(hit.target.x, hit.target.y);
    const b = project(hit.target.x + hit.nx * 12, hit.target.y + hit.ny * 12);
    if (a && b) {
      c.globalAlpha = 0.85;
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
  }
  c.restore();
}

export const arcHeight = (power) => 4 + power * 5;

// ---------- dust and numbers ----------
export function drawDust(c, parts) {
  for (const d of parts) {
    const p = project(d.x, d.y, d.z || 0);
    if (!p) continue;
    c.globalAlpha = Math.max(0, d.life / d.max) * d.a;
    c.fillStyle = d.col;
    c.beginPath();
    c.ellipse(p.x, p.y, d.r * p.k, d.r * p.k * 0.6, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}

export function drawPopups(c, pops) {
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const u = Math.max(12, Math.min(view.w, view.h) * 0.032);
  for (const p of pops) {
    const k = 1 - p.life / p.max;
    const at = p.screen || project(p.x, p.y, 8);
    if (!at) continue;
    const y = at.y - k * u * 2.4;
    const sc = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15) * 0.5);
    c.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    c.font = `900 ${Math.round(u * (p.size / 5) * sc)}px "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif`;
    c.lineWidth = Math.max(3, u * 0.22);
    c.strokeStyle = 'rgba(50, 20, 8, 0.85)';
    c.strokeText(p.text, at.x, y);
    c.fillStyle = p.col;
    c.fillText(p.text, at.x, y);
  }
  c.restore();
}

// first-time hint: a finger pulling down from the middle of the screen
export function drawPullHint(c, t) {
  const k = (t % 2.2) / 2.2;
  const pull = k < 0.6 ? k / 0.6 : 1;
  const fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
  const x = view.w * 0.5;
  const y0 = view.h * 0.62;
  const y = y0 + pull * view.h * 0.16;
  c.save();
  c.globalAlpha = 0.5 * fade * pull;
  c.strokeStyle = '#fff3cf';
  c.lineWidth = 3;
  c.setLineDash([6, 7]);
  c.beginPath();
  c.moveTo(x, y0);
  c.lineTo(x, y);
  c.stroke();
  c.setLineDash([]);
  c.globalAlpha = 0.95 * fade;
  c.font = `${Math.round(Math.min(view.w, view.h) * 0.08)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  c.textAlign = 'center';
  c.fillText('👆', x, y + view.h * 0.05);
  c.restore();
}
