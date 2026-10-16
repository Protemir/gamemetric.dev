// All sounds are synthesized, no files: the river murmurs louder when more water runs,
// the ketmen crunches, a soft marimba note rises each time water reaches another orchard.
import { store } from './util.js';

export const sound = { on: store.get('aryq.sound', true), ctx: null, out: null, noise: null, river: null };

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

// call from inside a tap or a click: browsers start sound only there
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
    out.gain.value = sound.on ? 0.6 : 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    out.connect(comp).connect(c.destination);
    const noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noise.getChannelData(0);
    // brown-ish noise: softer than white, closer to running water
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
      d[i] = last * 3.2;
    }
    const kick = c.createBufferSource();
    kick.buffer = c.createBuffer(1, 1, 22050);
    kick.connect(c.destination);
    kick.start(0);
    Object.assign(sound, { ctx: c, out, noise });
    startRiver();
    if (sound.held) c.suspend().catch(() => {});
  } catch {
    sound.ctx = null;
  }
}

export function setSound(on) {
  sound.on = on;
  store.set('aryq.sound', on);
  if (on) audioInit();
  if (sound.ctx) sound.out.gain.setTargetAtTime(on ? 0.6 : 0, sound.ctx.currentTime, 0.05);
}

// a portal's own mute wins over the in-game button
export function holdAudio(on) {
  sound.held = on;
  if (!sound.ctx) return;
  if (on) sound.ctx.suspend().catch(() => {});
  else audioInit();
}

const ready = () => sound.on && sound.ctx && sound.ctx.state === 'running';

// the river: a looped noise through a wobbling band-pass; louder with more water
function startRiver() {
  const c = sound.ctx;
  const src = c.createBufferSource();
  src.buffer = sound.noise;
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 520;
  bp.Q.value = 0.7;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 160;
  const g = c.createGain();
  g.gain.value = 0;
  const lfo = c.createOscillator();
  const lg = c.createGain();
  lfo.frequency.value = 0.23;
  lg.gain.value = 140;
  lfo.connect(lg).connect(bp.frequency);
  src.connect(hp).connect(bp).connect(g).connect(sound.out);
  src.start();
  lfo.start();
  sound.river = { g, bp };
}

// called every frame with how much water runs (0..1) and whether it is winter
export function ambient(level, winter) {
  if (!sound.ctx || !sound.river) return;
  const t = sound.ctx.currentTime;
  const v = sound.on ? (winter ? 0.04 : 0.05 + 0.12 * level) : 0;
  sound.river.g.gain.setTargetAtTime(v, t, 0.4);
  sound.river.bp.Q.setTargetAtTime(winter ? 0.4 : 0.7, t, 0.5);
}

function tone(type, f0, f1, dur, vol, at = 0) {
  const c = sound.ctx;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sound.out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(dur, vol, f0, f1, at = 0, q = 1, type = 'bandpass') {
  const c = sound.ctx;
  const t = c.currentTime + at;
  const s = c.createBufferSource();
  s.buffer = sound.noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(sound.out);
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur + 0.02);
}

// wooden marimba-ish note
function mallet(freq, at = 0, vol = 0.22) {
  tone('sine', freq, freq * 0.995, 0.7, vol, at);
  tone('sine', freq * 4, freq * 3.9, 0.12, vol * 0.25, at);
  tone('triangle', freq * 2, freq * 2, 0.25, vol * 0.18, at);
}

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const note = (k, base = 392) => base * Math.pow(2, SCALE[Math.min(k, SCALE.length - 1)] / 12);

let lastDig = 0;
export function dig() {
  if (!ready()) return;
  const t = sound.ctx.currentTime;
  if (t - lastDig < 0.045) return;
  lastDig = t;
  hiss(0.09, 0.32, 900 + Math.random() * 500, 300, 0, 1.4);
  tone('triangle', 140 + Math.random() * 40, 70, 0.07, 0.12);
}

export function block() {
  if (!ready()) return;
  tone('sine', 150, 90, 0.18, 0.25);
  hiss(0.05, 0.12, 2400, 1400, 0, 2);
}

let streak = 0, streakAt = 0;
// water reached one more orchard or yurt: the notes climb while it keeps happening
export function watered() {
  if (!ready()) return;
  const t = sound.ctx.currentTime;
  streak = t - streakAt < 6 ? streak + 1 : 0;
  streakAt = t;
  hiss(0.25, 0.12, 700, 1800, 0, 3);
  mallet(note(streak));
  mallet(note(streak + 2), 0.09, 0.14);
}

export function gate(closed) {
  if (!ready()) return;
  hiss(0.04, 0.35, closed ? 1500 : 2100, 900, 0, 4);
  hiss(0.05, 0.22, closed ? 1100 : 1700, 700, 0.06, 4);
  tone('sine', closed ? 180 : 240, closed ? 140 : 200, 0.1, 0.15);
}

export function warn() {
  if (!ready()) return;
  tone('triangle', 330, 330, 0.18, 0.16);
  tone('triangle', 262, 262, 0.28, 0.16, 0.2);
}

export function splash() {
  if (!ready()) return;
  hiss(0.6, 0.35, 1600, 250, 0, 0.8);
  tone('sine', 220, 70, 0.4, 0.12);
}

export function yearDone() {
  if (!ready()) return;
  [0, 2, 4, 5, 7].forEach((k, i) => mallet(note(k, 330), i * 0.11, 0.2));
}

export function lost() {
  if (!ready()) return;
  [7, 4, 2, 0].forEach((k, i) => mallet(note(k, 262), i * 0.18, 0.2));
  tone('sine', 110, 60, 1.2, 0.12, 0.6);
}

export function click() {
  if (!ready()) return;
  tone('sine', 660, 520, 0.06, 0.1);
}
