// All sounds are synthesized, no files: bone clicks are filtered noise with a short woody tone,
// knocked bones climb a pentatonic scale, the dombra plucks the side of the saka.
import { store } from './util.js';

export const sound = { on: store.get('asyk.sound', true), ctx: null, out: null, noise: null };

const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let media = null;

// iPhone: with the silent switch on, web audio stays mute unless a plain <audio> element plays
function silentWav() {
  const n = 4410;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 44100, true);
  v.setUint32(28, 44100, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  w(36, 'data');
  v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function unlockMedia() {
  if (!IOS || document.hidden) return;
  try {
    if (!media) {
      media = document.createElement('audio');
      media.setAttribute('x-webkit-airplay', 'deny');
      media.loop = true;
      media.src = silentWav();
    }
    if (media.paused) media.play().catch(() => {});
  } catch {
    /* no media */
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && media) media.pause();
});

export function audioInit() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
  } catch {
    /* older browsers */
  }
  unlockMedia();
  if (sound.ctx) {
    if (sound.ctx.state !== 'running' && !document.hidden && !sound.held) sound.ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const c = new AC();
    const out = c.createGain();
    out.gain.value = 0.55;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    out.connect(comp).connect(c.destination);
    const noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // iOS starts a context only after it played something inside a tap
    const kick = c.createBufferSource();
    kick.buffer = c.createBuffer(1, 1, 22050);
    kick.connect(c.destination);
    kick.start(0);
    Object.assign(sound, { ctx: c, out, noise });
    if (sound.held) c.suspend().catch(() => {});
  } catch {
    sound.ctx = null;
  }
}

export function setSound(on) {
  sound.on = on;
  store.set('asyk.sound', on);
  if (on) audioInit();
}

// a portal's own mute wins over the in-game button
export function holdAudio(on) {
  sound.held = on;
  if (!sound.ctx) return;
  if (on) sound.ctx.suspend().catch(() => {});
  else audioInit();
}

const ready = () => sound.on && sound.ctx && sound.ctx.state === 'running';

function tone(type, f0, f1, dur, vol, at = 0) {
  const c = sound.ctx;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sound.out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(dur, vol, f0, f1, at = 0, q = 1) {
  const c = sound.ctx;
  const t = c.currentTime + at;
  const s = c.createBufferSource();
  s.buffer = sound.noise;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(sound.out);
  s.start(t);
  s.stop(t + dur + 0.02);
}

// dombra-like pluck: decaying harmonics through a closing filter, plus a tiny noise "pick".
// (Not a delay-line string: browsers keep a delay inside a feedback loop at 128 samples or more,
// so high notes all collapse into one ringing tone that sounds like a whistle.)
function pluck(freq, at = 0, vol = 0.35, dur = 0.9) {
  const c = sound.ctx;
  const t = c.currentTime + at;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(Math.min(9000, freq * 9), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.5), t + dur * 0.6);
  lp.connect(sound.out);
  [[1, 'triangle', 1], [2, 'sine', 0.45], [3, 'sine', 0.22], [4, 'sine', 0.1]].forEach(([h, type, k]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * h * 1.01, t);
    o.frequency.exponentialRampToValueAtTime(freq * h, t + 0.04);
    const len = dur / (1 + (h - 1) * 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * k, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(lp);
    o.start(t);
    o.stop(t + len + 0.02);
  });
  hiss(0.02, vol * 0.25, freq * 6, freq * 3, at, 2);
}


const PENTA = [0, 2, 4, 7, 9];
const note = (base, step) => base * Math.pow(2, (PENTA[step % 5] + 12 * Math.floor(step / 5)) / 12);
let clicksThisFrame = 0;
let frameStamp = 0;

// bone on bone: a dry knock, louder and lower for harder hits
export function clack(power) {
  if (!ready()) return;
  const now = sound.ctx.currentTime;
  if (now !== frameStamp) {
    frameStamp = now;
    clicksThisFrame = 0;
  }
  if (clicksThisFrame++ > 2) return;
  const k = Math.min(1, power / 120);
  if (k < 0.03) return;
  const f = 2400 + Math.random() * 900 - k * 600;
  hiss(0.035 + k * 0.03, 0.08 + k * 0.32, f, f * 0.6, 0, 7);
  tone('triangle', 1500 - k * 400, 900, 0.03, 0.04 + k * 0.12);
  tone('sine', 520 + Math.random() * 80, 300, 0.05, k * 0.1);
}

// bone against the adobe wall: dull
export function thud(speed) {
  if (!ready()) return;
  const k = Math.min(1, speed / 90);
  hiss(0.08, 0.04 + k * 0.14, 500, 180, 0, 1.2);
  tone('sine', 140, 70, 0.1, k * 0.16);
}

export function whoosh(power) {
  if (!ready()) return;
  hiss(0.18 + power * 0.12, 0.05 + power * 0.12, 700, 2600, 0, 0.7);
}

// every bone leaving the circle in one throw sounds a step higher
export function knocked(n) {
  if (!ready()) return;
  const f = note(392, Math.min(n, 14));
  tone('triangle', f * 1.4, f, 0.1, 0.2);
  tone('sine', f * 2, f * 2, 0.08, 0.06);
  hiss(0.04, 0.04, 5000, 3000, 0, 2);
}

export function side(id) {
  if (!ready()) return;
  const b = 196;
  if (id === 'alshy') [0, 4, 7, 12].forEach((s, i) => pluck(b * Math.pow(2, s / 12), i * 0.07, 0.3, 1.2));
  else if (id === 'taike') [0, 7, 12].forEach((s, i) => pluck(b * Math.pow(2, s / 12), i * 0.08, 0.28, 1));
  else if (id === 'shik') [0, 5].forEach((s, i) => pluck(b * Math.pow(2, s / 12), i * 0.1, 0.26, 0.9));
  else pluck(b, 0, 0.26, 0.8);
}

export function tally(big) {
  if (!ready()) return;
  tone('triangle', 660, 990, 0.14, 0.14);
  if (big) tone('triangle', 990, 1320, 0.2, 0.12, 0.08);
  hiss(0.08, 0.05, 6000, 3500, 0, 3);
}

export function tick() {
  if (!ready()) return;
  hiss(0.02, 0.05, 3500, 2500, 0, 5);
}

export function cleared() {
  if (!ready()) return;
  [0, 2, 4, 7, 9, 12].forEach((s, k) => pluck(262 * Math.pow(2, s / 12), k * 0.06, 0.26, 1));
}

export function win() {
  if (!ready()) return;
  const base = 196;
  [0, 4, 7, 9, 12, 16, 19].forEach((s, k) => pluck(base * Math.pow(2, s / 12), k * 0.09, 0.32, 1.2));
  pluck(base * 2, 0.75, 0.3, 1.6);
  pluck(base * 3, 0.75, 0.22, 1.6);
}

export function lose() {
  if (!ready()) return;
  [7, 4, 2, 0].forEach((s, k) => pluck(165 * Math.pow(2, s / 12), k * 0.16, 0.26, 1.1));
}

// one soft blip per letter while a line of dialogue is typed out
export function blip(pitch = 1) {
  if (!ready()) return;
  tone('triangle', 520 * pitch + Math.random() * 60, 480 * pitch, 0.035, 0.035);
}

// swallows: two quick high chirps
export function chirp() {
  if (!ready()) return;
  const f = 3200 + Math.random() * 900;
  tone('sine', f, f * 1.3, 0.05, 0.025);
  tone('sine', f * 1.1, f * 1.4, 0.05, 0.02, 0.08);
}

// evening crickets: short bursts of a narrow high trill, now and then, quietly
let crickets = 0;
export function ambience(on) {
  clearInterval(crickets);
  crickets = 0;
  if (!on) return;
  crickets = setInterval(() => {
    if (!ready() || Math.random() < 0.35) return;
    const f = 4200 + Math.random() * 600;
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) tone('sine', f, f * 0.98, 0.025, 0.012 + Math.random() * 0.008, i * 0.045);
  }, 700);
}

// recorded lines (voice/<lang>/...mp3): decoded once, played through the same volume and mute;
// a missing file is remembered and stays quiet
const voices = new Map();
const missing = new Set();
let speaking = null;

export async function voice(url, { stopOthers = true, vol = 1 } = {}) {
  if (!sound.on || !sound.ctx || missing.has(url)) return null;
  let buf = voices.get(url);
  if (!buf) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      buf = await sound.ctx.decodeAudioData(await r.arrayBuffer());
      voices.set(url, buf);
    } catch {
      missing.add(url);
      return null;
    }
  }
  if (!ready()) return null;
  if (stopOthers) stopVoice();
  const src = sound.ctx.createBufferSource();
  src.buffer = buf;
  const g = sound.ctx.createGain();
  g.gain.value = vol;
  src.connect(g).connect(sound.out);
  src.start();
  if (stopOthers) speaking = src;
  return { duration: buf.duration, stop: () => src.stop() };
}

export function stopVoice() {
  if (speaking) {
    try {
      speaking.stop();
    } catch {
      /* already over */
    }
    speaking = null;
  }
}
