import { store } from './util.js';

// held: a game portal asked for silence (its own mute), it wins over the in-game sound buttons
export const sound = { on: store.get('asem.sound', true), held: false, ctx: null, gain: null, o1: null, o2: null, filter: null };

// iPhone: Safari mutes web audio when the ring/silent switch is on; the "playback" session
// (Safari 17+) lets the game be heard like a video. Set right before the first sound.
function playbackSession() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
  } catch {
    /* older browsers */
  }
}

// iPhone and iPad (any browser there is Safari inside): with the silent switch on, web audio
// stays mute unless a plain <audio> element is playing. A looping silent track, started by the
// first tap, switches the page to "playback" like a video does (the unmute.js trick).
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const media = { el: null, error: '' };

function silentWav() {
  const n = 4410; // 0.1 s of 8-bit mono silence
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

function mediaUnlock() {
  if (!IOS || document.hidden) return;
  try {
    if (!media.el) {
      const el = document.createElement('audio');
      el.setAttribute('x-webkit-airplay', 'deny');
      el.disableRemotePlayback = true;
      el.controls = false;
      el.loop = true;
      el.preload = 'auto';
      el.src = silentWav();
      media.el = el;
    }
    if (media.el.paused) {
      const p = media.el.play();
      if (p) p.then(() => (media.error = ''), (e) => (media.error = e.name || String(e)));
    }
  } catch (e) {
    media.error = e.name || String(e);
  }
}
// no "now playing" on the lock screen while the game is in the background
document.addEventListener('visibilitychange', () => {
  if (document.hidden && media.el) media.el.pause();
});

// iOS only really starts a context that has played something inside a tap
function kick(c) {
  try {
    const s = c.createBufferSource();
    s.buffer = c.createBuffer(1, 1, 22050);
    s.connect(c.destination);
    s.start(0);
  } catch {
    /* nothing to kick */
  }
}

export function audioInit() {
  if (sound.ctx) {
    // iOS leaves it 'interrupted' after a call or Siri
    mediaUnlock();
    if (sound.ctx.state !== 'running' && !document.hidden && !sound.held) {
      playbackSession();
      sound.ctx.resume().catch(() => {});
      kick(sound.ctx);
    }
    return;
  }
  playbackSession();
  mediaUnlock();
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const c = new AC();
    // the engine: firing pulses rich in harmonics, a sub an octave down, exhaust noise that
    // throbs at the firing rate, a little saturation; wind and road noise grow with speed
    const o1 = c.createOscillator();
    const wave = pulseWave(c);
    o1.setPeriodicWave(wave);
    const o2 = c.createOscillator();
    o2.type = 'sine';
    const sub = c.createGain();
    sub.gain.value = 0.7;
    const noiseSrc = c.createBufferSource();
    noiseSrc.buffer = noiseBuffer(c, 2);
    noiseSrc.loop = true;
    const exhaust = c.createBiquadFilter();
    exhaust.type = 'bandpass';
    exhaust.frequency.value = 260;
    exhaust.Q.value = 1.2;
    const throb = c.createGain();
    throb.gain.value = 0.5;
    const throbLfo = c.createGain();
    throbLfo.gain.value = 0.5;
    const shaper = c.createWaveShaper();
    shaper.curve = softClip();
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 2;
    const gain = c.createGain();
    gain.gain.value = 0;
    o1.connect(shaper);
    o2.connect(sub).connect(shaper);
    noiseSrc.connect(exhaust).connect(throb).connect(shaper);
    o2.connect(throbLfo).connect(throb.gain);
    shaper.connect(filter).connect(gain).connect(c.destination);
    const windF = c.createBiquadFilter();
    windF.type = 'bandpass';
    windF.frequency.value = 900;
    windF.Q.value = 0.5;
    const wind = c.createGain();
    wind.gain.value = 0;
    noiseSrc.connect(windF).connect(wind).connect(c.destination);
    o1.start();
    o2.start();
    noiseSrc.start();
    Object.assign(sound, { ctx: c, gain, o1, o2, filter, exhaust, wind, windF, wave, elec: false, rpm: 0 });
    kick(c);
    if (sound.held) c.suspend().catch(() => {});
  } catch {
    sound.ctx = null;
  }
}

export function holdAudio(on) {
  sound.held = on;
  if (!sound.ctx) return;
  if (on) sound.ctx.suspend().catch(() => {});
  else audioInit();
}

export function setSound(on) {
  sound.on = on;
  store.set('asem.sound', on);
  if (on) audioInit();
}

// one cycle of a four-cylinder: strong low harmonics, the even ones a bit louder, random phases
function pulseWave(c) {
  const n = 40;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 1; k < n; k++) {
    const amp = (k % 2 ? 0.8 : 1) / Math.pow(k, 0.9);
    const ph = rnd() * Math.PI * 2;
    real[k] = amp * Math.cos(ph);
    imag[k] = amp * Math.sin(ph);
  }
  return c.createPeriodicWave(real, imag);
}

function noiseBuffer(c, sec) {
  const len = Math.floor(c.sampleRate * sec);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function softClip() {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2);
  }
  return curve;
}

// pct: 0..1 of top speed, boost: nitro on
const GEARS = [0, 0.16, 0.34, 0.54, 0.76, 1.01];
export function engine(pct, audible, boost, electric) {
  if (!sound.ctx) return;
  const now = sound.ctx.currentTime;
  const on = sound.on && audible;
  if (sound.elec !== !!electric) {
    sound.elec = !!electric;
    if (electric) sound.o1.type = 'sine';
    else sound.o1.setPeriodicWave(sound.wave);
  }
  sound.wind.gain.setTargetAtTime(on ? pct * pct * 0.05 : 0, now, 0.2);
  sound.windF.frequency.setTargetAtTime(500 + pct * 1400, now, 0.2);
  if (electric) {
    // an electric motor whines instead of roaring
    const f = 160 + pct * 620 + (boost ? 120 : 0);
    sound.o1.frequency.setTargetAtTime(f, now, 0.05);
    sound.o2.frequency.setTargetAtTime(f * 1.5, now, 0.05);
    sound.exhaust.frequency.setTargetAtTime(f * 3, now, 0.1);
    sound.filter.frequency.setTargetAtTime(1800, now, 0.1);
    sound.gain.gain.setTargetAtTime(on ? 0.006 + pct * 0.01 : 0, now, 0.1);
    return;
  }
  // rpm climbs through each gear and drops on the shift, like a real gearbox
  let gear = 1;
  while (gear < GEARS.length - 1 && pct > GEARS[gear]) gear++;
  const inGear = Math.min(1, (pct - GEARS[gear - 1]) / (GEARS[gear] - GEARS[gear - 1]));
  const rpm = (gear === 1 ? 0.25 + inGear * 0.7 : 0.45 + inGear * 0.5) + (boost ? 0.08 : 0);
  const f = 34 + rpm * 120;
  const k = rpm < sound.rpm - 0.1 ? 0.09 : 0.04;
  sound.rpm = rpm;
  sound.o1.frequency.setTargetAtTime(f, now, k);
  sound.o2.frequency.setTargetAtTime(f / 2, now, k);
  sound.exhaust.frequency.setTargetAtTime(160 + rpm * 520, now, 0.08);
  sound.filter.frequency.setTargetAtTime(380 + rpm * 900 + (boost ? 600 : 0), now, 0.08);
  sound.gain.gain.setTargetAtTime(on ? 0.035 + rpm * 0.04 : 0, now, 0.1);
}

// a crash: a low thump, a crunch and a short metal clank
export function crashSound() {
  if (!sound.on || !sound.ctx) return;
  const c = sound.ctx;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.32);
  noise(0.3, 0.3, 1400);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.18);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2800;
  bp.Q.value = 6;
  const mg = c.createGain();
  mg.gain.setValueAtTime(0.35, t + 0.02);
  mg.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  src.connect(bp).connect(mg).connect(c.destination);
  src.start(t + 0.02);
}

export function beep(freq, dur, type = 'triangle', vol = 0.12) {
  if (!sound.on || !sound.ctx) return;
  const c = sound.ctx;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

export function noise(dur, vol = 0.25, cutoff = 900) {
  if (!sound.on || !sound.ctx) return;
  const c = sound.ctx;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let n = 0; n < len; n++) data[n] = (Math.random() * 2 - 1) * (1 - n / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(c.destination);
  src.start();
}

export function fanfare() {
  [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => beep(f, 0.22), k * 120));
}

// a cartoon "a-a-a!": a wobbling voice that slides down
export function scream() {
  if (!sound.on || !sound.ctx) return;
  const c = sound.ctx;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  const base = 520 + Math.random() * 380;
  o.frequency.setValueAtTime(base, t);
  o.frequency.exponentialRampToValueAtTime(base * 0.55, t + 0.6);
  const lfo = c.createOscillator();
  lfo.frequency.value = 9;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 30;
  lfo.connect(lfoGain).connect(o.frequency);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1100;
  f.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
  o.connect(f).connect(g).connect(c.destination);
  o.start(t);
  lfo.start(t);
  o.stop(t + 0.7);
  lfo.stop(t + 0.7);
}

export function bonk(kind) {
  if (!sound.on || !sound.ctx) return;
  const c = sound.ctx;
  const t = c.currentTime;
  const glide = (type, f0, f1, dur, vol) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  };
  if (kind === 'boing') {
    glide('sine', 220, 880, 0.35, 0.16);
    glide('square', 1300, 1700, 0.12, 0.03);
  } else if (kind === 'splat') {
    noise(0.25, 0.3, 700);
    glide('sine', 140, 60, 0.2, 0.25);
  } else if (kind === 'thud') {
    noise(0.18, 0.2, 500);
    glide('sine', 120, 50, 0.18, 0.2);
  } else {
    glide('square', 700, 350, 0.08, 0.06);
    noise(0.06, 0.12, 3000);
  }
}

// a two-tone car horn
export function horn() {
  if (!sound.on || !sound.ctx) return;
  const c = sound.ctx;
  const t = c.currentTime;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1600;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
  g.gain.setValueAtTime(0.1, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  f.connect(g).connect(c.destination);
  for (const hz of [415, 523]) {
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = hz;
    o.connect(f);
    o.start(t);
    o.stop(t + 0.42);
  }
}

// the traffic cop's whistle: a fast trill
export function whistle() {
  if (!sound.on || !sound.ctx) return;
  const c = sound.ctx;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.value = 2600;
  const lfo = c.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 28;
  const depth = c.createGain();
  depth.gain.value = 260;
  lfo.connect(depth).connect(o.frequency);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
  g.gain.setValueAtTime(0.08, t + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g).connect(c.destination);
  o.start(t);
  lfo.start(t);
  o.stop(t + 0.62);
  lfo.stop(t + 0.62);
}

// "baa": a wobbly nasal note sliding down
export function bleat() {
  if (!sound.on || !sound.ctx) return;
  const c = sound.ctx;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  const base = 330 + Math.random() * 120;
  o.frequency.setValueAtTime(base, t);
  o.frequency.linearRampToValueAtTime(base * 0.85, t + 0.45);
  const lfo = c.createOscillator();
  lfo.frequency.value = 13;
  const depth = c.createGain();
  depth.gain.value = base * 0.07;
  lfo.connect(depth).connect(o.frequency);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1300;
  f.Q.value = 2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(f).connect(g).connect(c.destination);
  o.start(t);
  lfo.start(t);
  o.stop(t + 0.52);
  lfo.stop(t + 0.52);
}

// one short horn note, for the tunes below
function toot(at, hz, dur, vol = 0.07) {
  const c = sound.ctx;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1800;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
  g.gain.setValueAtTime(vol, at + dur * 0.75);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  f.connect(g).connect(c.destination);
  for (const k of [1, 1.26]) {
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = hz * k;
    o.connect(f);
    o.start(at);
    o.stop(at + dur + 0.02);
  }
}

// a wedding convoy: every car honks the same quick rhythm
export function weddingHorn() {
  if (!sound.on || !sound.ctx) return;
  const t = sound.ctx.currentTime;
  [0, 0.16, 0.32, 0.48, 0.72, 0.88, 1.04].forEach((d, k) => toot(t + d, k < 4 ? 440 : 494, 0.12, 0.05));
}

// the lane-weaving guy has a musical horn, of course
export function cucaracha() {
  if (!sound.on || !sound.ctx) return;
  const t = sound.ctx.currentTime;
  const notes = [[392, 0], [392, 0.12], [392, 0.24], [523, 0.36], [659, 0.66], [392, 0.96], [392, 1.08], [392, 1.2], [523, 1.32], [659, 1.62]];
  for (const [hz, d] of notes) toot(t + d, hz, 0.11, 0.045);
}

// a puddle under the wheels
export function splash() {
  if (!sound.on || !sound.ctx) return;
  noise(0.4, 0.35, 2400);
  setTimeout(() => noise(0.25, 0.15, 900), 60);
}

// a wiper blade on glass
export function squeak() {
  if (!sound.on || !sound.ctx) return;
  const c = sound.ctx;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(1500, t);
  o.frequency.linearRampToValueAtTime(1900, t + 0.18);
  o.frequency.linearRampToValueAtTime(1400, t + 0.32);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.025, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.36);
}

// balloons popping one after another
export function pops(n = 3) {
  if (!sound.on || !sound.ctx) return;
  for (let k = 0; k < n; k++) setTimeout(() => noise(0.05, 0.4, 5000), k * 90 + Math.random() * 40);
}

// dry twigs breaking
export function crunch() {
  if (!sound.on || !sound.ctx) return;
  for (let k = 0; k < 4; k++) setTimeout(() => noise(0.04, 0.22, 3500 + Math.random() * 2000), k * 35);
}

// a horse: a high whinny that shakes and slides down
export function neigh() {
  if (!sound.on || !sound.ctx) return;
  const c = sound.ctx;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  const base = 820 + Math.random() * 160;
  o.frequency.setValueAtTime(base * 0.8, t);
  o.frequency.linearRampToValueAtTime(base, t + 0.12);
  o.frequency.exponentialRampToValueAtTime(base * 0.45, t + 0.75);
  const lfo = c.createOscillator();
  lfo.frequency.value = 17;
  const depth = c.createGain();
  depth.gain.value = base * 0.09;
  lfo.connect(depth).connect(o.frequency);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1500;
  f.Q.value = 1.5;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(f).connect(g).connect(c.destination);
  o.start(t);
  lfo.start(t);
  o.stop(t + 0.82);
  lfo.stop(t + 0.82);
}
