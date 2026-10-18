// All sound is made in the browser, no files: the steppe wind, a dombra that plays quietly
// (plucked strings by the Karplus–Strong method), hooves when a rider sets off, a bell when the
// khan's word arrives, the crack of a whip at the kurultai.
import { store } from './util.js';

export const sound = { on: store.get('sybys.sound', true), held: false, ctx: null, out: null, music: null };

const IOS = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
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
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!sound.ctx) return;
    if (document.hidden) { sound.ctx.suspend().catch(() => {}); media?.pause(); }
    else if (!sound.held) audioInit();
  });
}

// call from inside a tap or a click: browsers start sound only there
export function audioInit() {
  unlockMedia();
  if (sound.ctx) {
    if (sound.ctx.state !== 'running' && !document.hidden && !sound.held) sound.ctx.resume().catch(() => {});
    return;
  }
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const out = c.createGain();
    out.gain.value = sound.on && !sound.held ? 0.7 : 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    out.connect(comp).connect(c.destination);
    const noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    Object.assign(sound, { ctx: c, out, noise, strings: new Map() });
    startWind();
    startMusic();
  } catch {
    sound.ctx = null;
  }
}

export function setSound(on) {
  sound.on = on;
  store.set('sybys.sound', on);
  if (on) audioInit();
  if (sound.ctx) sound.out.gain.setTargetAtTime(on && !sound.held ? 0.7 : 0, sound.ctx.currentTime, 0.05);
}

// a portal's own mute wins over the in-game button
export function holdAudio(on) {
  sound.held = on;
  if (sound.ctx) sound.out.gain.setTargetAtTime(sound.on && !on ? 0.7 : 0, sound.ctx.currentTime, 0.05);
}

const ready = () => sound.on && !sound.held && sound.ctx && sound.ctx.state === 'running';

// the wind over the steppe: band-passed noise that swells and falls
function startWind() {
  const c = sound.ctx;
  const src = c.createBufferSource();
  src.buffer = sound.noise;
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 420;
  bp.Q.value = 0.9;
  const g = c.createGain();
  g.gain.value = 0.025;
  const lfo = c.createOscillator(), lg = c.createGain();
  lfo.frequency.value = 0.07;
  lg.gain.value = 0.02;
  lfo.connect(lg).connect(g.gain);
  const lfo2 = c.createOscillator(), lg2 = c.createGain();
  lfo2.frequency.value = 0.11;
  lg2.gain.value = 180;
  lfo2.connect(lg2).connect(bp.frequency);
  src.connect(bp).connect(g).connect(sound.out);
  src.start();
  lfo.start();
  lfo2.start();
}

// a plucked string: a burst of noise fed back through a delay as long as one period
function stringBuffer(freq) {
  const c = sound.ctx;
  const key = Math.round(freq);
  if (sound.strings.has(key)) return sound.strings.get(key);
  const sr = c.sampleRate, len = Math.floor(sr * 1.6), N = Math.round(sr / freq);
  const buf = c.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
  let p = 0;
  for (let i = 0; i < len; i++) {
    const next = (p + 1) % N;
    const v = ring[p];
    ring[p] = 0.4985 * (ring[p] + ring[next]);
    d[i] = v * Math.min(1, i / 40);
    p = next;
  }
  sound.strings.set(key, buf);
  return buf;
}
function pluck(freq, when, vol) {
  const c = sound.ctx;
  const src = c.createBufferSource();
  src.buffer = stringBuffer(freq);
  const g = c.createGain();
  g.gain.value = vol;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  src.connect(lp).connect(g).connect(sound.music.bus);
  src.start(when);
}

// the dombra: a two-string drone strummed in a galloping rhythm, a tune wandering over a pentatonic scale
const SCALE = [146.83, 164.81, 174.61, 196.0, 220.0, 261.63, 293.66, 329.63, 349.23, 392.0]; // D minor-ish, as a küy might sit
function startMusic() {
  const c = sound.ctx;
  const bus = c.createGain();
  bus.gain.value = (sound.wantMusic ?? 1) * 0.22;
  bus.connect(sound.out);
  sound.music = { bus, next: c.currentTime + 0.2, step: 0, note: 4, level: 0.0 };
  const beat = 60 / 132 / 2;
  const tickMusic = () => {
    const m = sound.music;
    if (!sound.ctx) return;
    while (m.next < c.currentTime + 0.3) {
      const s = m.step % 16;
      // strum: low D and A on the strong beats, the "gallop" (long-short-short) between
      if (s % 4 === 0) { pluck(73.42, m.next, 0.5); pluck(110, m.next + 0.012, 0.35); }
      else if (s % 4 === 2 || s % 4 === 3) pluck(110, m.next, 0.18);
      // the tune: a step or two along the scale, resting now and then
      if (s % 2 === 0 && Math.random() < 0.72) {
        m.note = Math.max(0, Math.min(SCALE.length - 1, m.note + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
        pluck(SCALE[m.note], m.next + 0.005, 0.32);
      }
      m.next += beat;
      m.step++;
    }
  };
  setInterval(tickMusic, 100);
}

// how loud the dombra plays: louder on the title, quieter during play
export function musicLevel(v) {
  sound.wantMusic = v;
  if (!sound.ctx || !sound.music) return;
  sound.music.bus.gain.setTargetAtTime(v * 0.22, sound.ctx.currentTime, 0.6);
}

function tone(freq, dur, type = 'triangle', vol = 0.12, when = 0, slide = 0) {
  if (!ready()) return;
  const c = sound.ctx;
  const t = c.currentTime + when;
  const o = c.createOscillator(), gn = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(sound.out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseHit(when, dur, freq, q, vol, type = 'bandpass') {
  if (!ready()) return;
  const c = sound.ctx;
  const t = c.currentTime + when;
  const src = c.createBufferSource();
  src.buffer = sound.noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(sound.out);
  src.start(t, Math.random());
  src.stop(t + dur + 0.02);
}

// a bell: a few inharmonic partials that ring and fade
function bell(freq, when = 0, vol = 0.08) {
  for (const [k, v] of [[1, 1], [2.76, 0.5], [5.4, 0.25]]) tone(freq * k, 1.2 / k, 'sine', vol * v, when);
}

export const sfx = {
  // a rider sets off: hooves on dry ground
  send() { for (let k = 0; k < 6; k++) noiseHit(k * 0.11 + (k % 2) * 0.03, 0.06, 260, 2, 0.35, 'lowpass'); },
  word() { bell(880); bell(1320, 0.09, 0.05); },
  lie() { tone(150, 0.5, 'sawtooth', 0.035, 0, 0.7); noiseHit(0, 0.5, 300, 1, 0.08); },
  force() { noiseHit(0, 0.3, 120, 1, 0.5, 'lowpass'); tone(90, 0.35, 'square', 0.06, 0.02, 0.6); noiseHit(0.05, 0.2, 3000, 4, 0.12); },
  caught() { noiseHit(0, 0.05, 2500, 3, 0.4, 'highpass'); bell(1175, 0.04, 0.07); bell(1760, 0.12, 0.05); },
  bad() { tone(240, 0.3, 'triangle', 0.08, 0, 0.75); },
  clue() { bell(740); bell(988, 0.12); bell(1480, 0.24, 0.05); },
  // the kurultai: the crack of a raised whip, then a low or high note
  whip(yes) { noiseHit(0, 0.04, 3500, 2, 0.6, 'highpass'); noiseHit(0.02, 0.12, 1800, 1.5, 0.2); tone(yes ? 440 : 147, 0.4, 'triangle', 0.07, 0.05, yes ? 1.2 : 0.8); },
  no() { tone(150, 0.12, 'square', 0.05); },
  // the horde's drums: a heavy beat that quickens
  drums() { [0, 0.42, 0.78, 1.08, 1.32, 1.52, 1.7, 1.86].forEach((t, k) => { tone(70 - k * 2, 0.35, 'sine', 0.22, t, 0.5); noiseHit(t, 0.12, 180, 1, 0.25, 'lowpass'); }); },
  clash() { noiseHit(0, 0.18, 3200, 6, 0.4, 'bandpass'); tone(1900, 0.25, 'square', 0.03, 0, 1.3); tone(2600, 0.2, 'triangle', 0.04, 0.02, 0.8); },
  fire() { noiseHit(0, 0.9, 500, 0.6, 0.3, 'lowpass'); noiseHit(0.1, 0.6, 1400, 1, 0.08); },
  night() { tone(220, 1.6, 'sine', 0.05, 0, 0.75); tone(330, 1.6, 'sine', 0.035, 0.3, 0.75); },
};
