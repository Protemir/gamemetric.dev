// All sounds are synthesized, no files. Pops climb a pentatonic scale while hits keep coming,
// which is most of the "one more" feeling of this kind of puzzle.
import { store } from './util.js';

export const sound = { on: store.get('oyu.sound', true), ctx: null, out: null, noise: null };

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
  store.set('oyu.sound', on);
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
let combo = 0;
let lastPop = 0;
let popsThisFrame = 0;
let frameStamp = 0;

export function pop() {
  if (!ready()) return;
  const now = sound.ctx.currentTime;
  if (now !== frameStamp) {
    frameStamp = now;
    popsThisFrame = 0;
  }
  if (popsThisFrame++ > 2) return;
  combo = now - lastPop < 0.5 ? combo + 1 : 0;
  lastPop = now;
  const step = Math.min(combo, 19);
  const semi = PENTA[step % 5] + 12 * Math.floor(step / 5);
  const f = 392 * Math.pow(2, semi / 12);
  tone('triangle', f * 1.5, f, 0.09, 0.22);
  tone('sine', f * 2, f * 2, 0.05, 0.06);
  hiss(0.04, 0.05, 4000, 2500, 0, 2);
}

export function tap() {
  if (!ready()) return;
  tone('sine', 900, 600, 0.05, 0.12);
}

export function launch() {
  if (!ready()) return;
  hiss(0.22, 0.12, 600, 2400, 0, 0.8);
  tone('triangle', 300, 520, 0.12, 0.08);
}

export function dock() {
  if (!ready()) return;
  tone('sine', 220, 160, 0.12, 0.2);
  hiss(0.05, 0.06, 900, 500, 0, 3);
}

export function spent() {
  if (!ready()) return;
  tone('sine', 1320, 1320, 0.18, 0.08);
  tone('sine', 1760, 1760, 0.22, 0.06, 0.05);
}

export function full() {
  if (!ready()) return;
  tone('square', 160, 140, 0.12, 0.06);
}

export function fail() {
  if (!ready()) return;
  tone('triangle', 330, 220, 0.3, 0.2);
  tone('triangle', 247, 165, 0.45, 0.18, 0.18);
}

export function win() {
  if (!ready()) return;
  // a short dombra phrase on the pentatonic scale
  const base = 196;
  [0, 4, 7, 9, 12, 16, 19].forEach((s, k) => pluck(base * Math.pow(2, s / 12), k * 0.09, 0.32, 1.2));
  pluck(base * 2, 0.75, 0.3, 1.6);
  pluck(base * 3, 0.75, 0.22, 1.6);
}

// one bright chime per earned star, a step higher each time
export function star(k) {
  if (!ready()) return;
  const f = 784 * Math.pow(2, [0, 4, 7][Math.min(2, k)] / 12);
  tone('triangle', f, f, 0.22, 0.16);
  tone('sine', f * 2, f * 2, 0.3, 0.07, 0.02);
  hiss(0.05, 0.05, 7000, 4000, 0, 3);
}

export function stitch() {
  if (!ready()) return;
  hiss(0.03, 0.04, 6000, 4000, 0, 4);
}
