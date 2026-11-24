// Звук «Табуна»: всё синтезом WebAudio, кроме ржания (CC0, BigSoundBank).
let ctx = null, master = null, neighBuf = null, noiseBuf = null;
let enabled = true;
let hoofNext = 0;
let lastNeigh = 0;

export function setSound(on) {
  enabled = on;
  if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05);
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
