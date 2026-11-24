// Звук «Табуна»: всё синтезом WebAudio, кроме ржания (CC0, BigSoundBank).
let ctx = null, master = null, neighBuf = null, noiseBuf = null;
let enabled = true;
let musicOn = true, musicBus = null, musicNext = 0, musicStep = 0, musicMode = 'off';
const ksCache = new Map();
let hoofNext = 0;
let lastNeigh = 0;

export function setSound(on) {
  enabled = on;
  if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05);
}

export function setMusic(on) {
  musicOn = on;
  musicMode = ""; // пусть music() сама выставит громкость под экран
}

// щипок струны: Karplus–Strong, буферы кешируются по частоте
function pluckBuf(freq) {
  const key = Math.round(freq * 10);
  if (ksCache.has(key)) return ksCache.get(key);
  const sr = ctx.sampleRate, len = Math.floor(sr * 1.4), N = Math.max(2, Math.round(sr / freq));
  const b = ctx.createBuffer(1, len, sr), y = b.getChannelData(0);
  for (let i = 0; i < N; i++) y[i] = Math.random() * 2 - 1;
  for (let i = N; i < len; i++) y[i] = 0.4985 * (y[i - N] + y[i - N + 1 < i ? i - N + 1 : i - N]);
  // мягкое начало, чтобы не щёлкало
  for (let i = 0; i < 64; i++) y[i] *= i / 64;
  ksCache.set(key, b);
  return b;
}
function pluck(freq, t0, vol) {
  const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  s.buffer = pluckBuf(freq);
  f.type = 'lowpass'; f.frequency.value = 3200;
  g.gain.value = vol;
  s.connect(f).connect(g).connect(musicBus);
  s.start(t0);
}
function drum(t0, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(48, t0 + 0.18);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
  o.connect(g).connect(musicBus); o.start(t0); o.stop(t0 + 0.3);
}
// лад: ре-минорная пентатоника; кюй — «та-та-там» скачущим ритмом
const NOTE = (n) => 146.83 * Math.pow(2, n / 12); // от D3
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
const MELODY = [
  [7, 6, 5, 6, 7, 8, 7, 5, 6, 5, 4, 5, 6, 5, 4, 2],
  [4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 4, 5, 4, 3, 2, 0],
  [7, 7, 8, 9, 8, 7, 6, 7, 5, 6, 7, 6, 5, 4, 5, 2],
  [2, 4, 5, 4, 2, 4, 5, 7, 6, 5, 4, 2, 4, 2, 1, 0],
];
const RHYTHM = [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1]; // скачущий триольный пульс
// mode: 'menu' — спокойно, 'run' — скачка, 'off' — тишина
export function music(mode) {
  if (!ctx || !musicBus) return;
  if (mode !== musicMode) { musicMode = mode; musicBus.gain.setTargetAtTime(mode === 'off' || !musicOn ? 0 : mode === 'menu' ? 0.55 : 0.8, ctx.currentTime, 0.35); }
  if (mode === 'off' || !musicOn) return;
  const t = ctx.currentTime;
  const stepDur = mode === 'run' ? 0.125 : 0.19;
  if (musicNext < t) musicNext = t + 0.05;
  while (musicNext < t + 0.25) {
    const bar = Math.floor(musicStep / 16) % MELODY.length, st = musicStep % 16;
    if (RHYTHM[st]) {
      const deg = MELODY[bar][st];
      pluck(NOTE(SCALE[deg]), musicNext, st % 4 === 0 ? 0.32 : 0.22);
      // вторая струна — квинта в бурдоне на сильных долях
      if (st % 4 === 0) pluck(NOTE(SCALE[deg % 3 === 0 ? 0 : 3] - 12), musicNext, 0.2);
    }
    if (mode === 'run' && st % 4 === 0) drum(musicNext, st === 0 ? 0.5 : 0.32);
    musicNext += stepDur * (st % 2 ? 0.86 : 1.14); // лёгкий свинг
    musicStep++;
  }
}

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = enabled ? 0.8 : 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  fetch('sounds/horse-neigh.mp3').then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((b) => { neighBuf = b; }).catch(() => {});
}

const now = () => ctx.currentTime;

function tone(freq, t0, dur, { type = 'sine', vol = 0.3, slide = 0, attack = 0.005 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(t0, dur, { vol = 0.3, freq = 800, q = 1, type = 'lowpass', slide = 0 } = {}) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf;
  f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
}

// топот: чем больше табун, тем гуще
export function hooves(count, running, dt) {
  if (!ctx || !enabled) return;
  if (!running || count <= 0) { hoofNext = 0; return; }
  const t = now();
  if (hoofNext < t) hoofNext = t;
  const rate = Math.min(26, 4 + Math.sqrt(count) * 2.2);
  const vol = Math.min(0.22, 0.06 + Math.sqrt(count) * 0.012);
  while (hoofNext < t + 0.12) {
    noise(hoofNext, 0.09, { vol: vol * (0.6 + Math.random() * 0.5), freq: 160 + Math.random() * 120, q: 0.8 });
    tone(55 + Math.random() * 20, hoofNext, 0.08, { vol: vol * 0.6, type: 'sine', slide: 0.6 });
    hoofNext += (1 / rate) * (0.6 + Math.random() * 0.8);
  }
}

export function sfx(name, arg = 0) {
  if (!ctx || !enabled) return;
  const t = now();
  switch (name) {
    case 'good': {
      const base = 520 + Math.min(arg, 8) * 30;
      [0, 4, 7, 12].forEach((s, i) => tone(base * Math.pow(2, s / 12), t + i * 0.055, 0.25, { type: 'triangle', vol: 0.16 }));
      tone(base * 2, t + 0.22, 0.4, { type: 'sine', vol: 0.08 });
      break;
    }
    case 'bad':
      tone(220, t, 0.35, { type: 'sawtooth', vol: 0.12, slide: 0.5 });
      noise(t, 0.25, { vol: 0.25, freq: 400, slide: 0.3 });
      break;
    case 'chest':
      [0, 7, 12, 16, 19].forEach((s, i) => tone(880 * Math.pow(2, s / 12), t + i * 0.05, 0.3, { type: 'square', vol: 0.05 }));
      break;
    case 'recruit':
      tone(900 + Math.random() * 300, t, 0.12, { type: 'triangle', vol: 0.07 });
      if (t - lastNeigh > 2.5 && Math.random() < 0.5) neigh(0.25, 1.1 + Math.random() * 0.2);
      break;
    case 'hit':
      noise(t, 0.35, { vol: 0.5, freq: 300, slide: 0.4 });
      tone(90, t, 0.3, { vol: 0.3, slide: 0.5 });
      if (t - lastNeigh > 1.5) neigh(0.3, 0.9 + Math.random() * 0.2);
      break;
    case 'fall':
      tone(500, t, 0.5, { type: 'sine', vol: 0.06, slide: 0.3 });
      break;
    case 'rock':
      noise(t, 1.2, { vol: 0.18, freq: 120, q: 1.5 });
      break;
    case 'splash':
      noise(t, 0.4, { vol: 0.15, freq: 2500, type: 'bandpass', q: 0.7, slide: 0.5 });
      break;
    case 'howl': {
      // вой: два голоса, глиссандо с вибрато
      for (const [f0, dl, v] of [[360, 0, 0.09], [300, 0.25, 0.06]]) {
        const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sine'; lfo.frequency.value = 6; lg.gain.value = 9;
        lfo.connect(lg).connect(o.frequency);
        const t0 = t + dl;
        o.frequency.setValueAtTime(f0, t0);
        o.frequency.exponentialRampToValueAtTime(f0 * 1.9, t0 + 0.7);
        o.frequency.exponentialRampToValueAtTime(f0 * 1.4, t0 + 1.8);
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.4); g.gain.exponentialRampToValueAtTime(0.001, t0 + 2);
        o.connect(g).connect(master); o.start(t0); lfo.start(t0); o.stop(t0 + 2.05); lfo.stop(t0 + 2.05);
      }
      break;
    }
    case 'bite':
      noise(t, 0.18, { vol: 0.35, freq: 900, type: 'bandpass', q: 2, slide: 0.4 });
      tone(160, t, 0.15, { type: 'sawtooth', vol: 0.08, slide: 0.6 });
      break;
    case 'milestone':
      [0, 4, 7, 12, 16].forEach((s2, i) => tone(523 * Math.pow(2, s2 / 12), t + i * 0.06, 0.35, { type: 'triangle', vol: 0.12 }));
      noise(t, 0.6, { vol: 0.08, freq: 6000, type: 'highpass' });
      break;
    case 'boom':
      noise(t, 0.5, { vol: 0.22, freq: 300, slide: 0.3 });
      noise(t + 0.05, 0.9, { vol: 0.06, freq: 5000, type: 'highpass' });
      break;
    case 'combo':
      tone(660 * Math.pow(2, Math.min(arg, 8) / 12), t, 0.18, { type: 'square', vol: 0.06 });
      tone(990 * Math.pow(2, Math.min(arg, 8) / 12), t + 0.07, 0.25, { type: 'triangle', vol: 0.08 });
      break;
    case 'whoosh':
      noise(t, 0.6, { vol: 0.14, freq: 600, type: 'bandpass', q: 0.8, slide: 3 });
      break;
    case 'thunder':
      noise(t, 0.25, { vol: 0.35, freq: 2200, type: 'bandpass', q: 0.6, slide: 0.3 });
      noise(t + 0.05, 2.8, { vol: 0.5, freq: 160, q: 0.7, slide: 0.5 });
      break;
    case 'achieve':
      [0, 7, 12, 16, 19, 24].forEach((s2, i) => tone(523 * Math.pow(2, s2 / 12), t + i * 0.07, 0.4, { type: 'triangle', vol: 0.1 }));
      break;
    case 'whip':
      // щелчок камчи: резкий хлопок и свист
      noise(t, 0.07, { vol: 0.6, freq: 3500, type: 'highpass', q: 0.7 });
      tone(2200, t, 0.12, { type: 'triangle', vol: 0.08, slide: 0.4 });
      noise(t + 0.03, 0.4, { vol: 0.12, freq: 1800, type: 'bandpass', q: 3, slide: 2.5 });
      break;
    case 'clash':
      noise(t, 0.12, { vol: 0.3, freq: 600 + Math.random() * 400, q: 1 });
      tone(70 + Math.random() * 30, t, 0.1, { vol: 0.2, slide: 0.7 });
      break;
    case 'drum':
      for (let i = 0; i < 4; i++) { tone(60, t + i * 0.12, 0.25, { vol: 0.4, slide: 0.5 }); noise(t + i * 0.12, 0.1, { vol: 0.2, freq: 200 }); }
      neigh(0.45, 1);
      break;
    case 'step':
      tone(440 * Math.pow(2, arg / 6), t, 0.3, { type: 'triangle', vol: 0.15 });
      tone(880 * Math.pow(2, arg / 6), t + 0.05, 0.3, { type: 'sine', vol: 0.06 });
      break;
    case 'win':
      [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(392 * Math.pow(2, s / 12), t + i * 0.11, 0.4, { type: 'triangle', vol: 0.14 }));
      break;
    case 'lose':
      [0, -3, -7, -12].forEach((s, i) => tone(330 * Math.pow(2, s / 12), t + i * 0.18, 0.5, { type: 'triangle', vol: 0.12 }));
      break;
    case 'coin':
      tone(1320, t, 0.08, { type: 'square', vol: 0.04 });
      tone(1760, t + 0.06, 0.12, { type: 'square', vol: 0.04 });
      break;
    case 'click':
      tone(700, t, 0.06, { type: 'triangle', vol: 0.08 });
      break;
  }
}

export function neigh(vol = 0.4, rate = 1) {
  if (!ctx || !enabled || !neighBuf) return;
  lastNeigh = now();
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = neighBuf;
  s.playbackRate.value = rate;
  g.gain.value = vol;
  s.connect(g).connect(master);
  s.start();
}
