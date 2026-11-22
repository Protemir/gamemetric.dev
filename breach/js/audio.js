// All sounds are synthesised with WebAudio: noise bursts and oscillators, panned by direction.
let ctx = null, master = null, noiseBuf = null, compNode = null;
let volume = 0.8;
const listener = { x: 0, y: 0, z: 0, yaw: 0, indoor: false };

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = volume;
  const comp = (compNode = ctx.createDynamicsCompressor());
  comp.threshold.value = -14;
  comp.ratio.value = 6;
  master.connect(comp).connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

// the steady sound of rain; on = false stops it; level 0..1 (softer indoors)
let rain = null;
export function rainSound(on, level = 1) {
  if (!ctx) return;
  if (!on) {
    if (rain) {
      try {
        rain.src.stop();
      } catch {}
      rain = null;
    }
    return;
  }
  if (!rain) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(master);
    src.start();
    rain = { src, g, f };
  }
  rain.g.gain.setTargetAtTime(0.11 * level, ctx.currentTime, 0.4);
  rain.f.frequency.setTargetAtTime(level < 1 ? 900 : 2400, ctx.currentTime, 0.4);
}

// under the water the whole mix goes dull
let underF = null;
export function setUnderwater(on) {
  if (!ctx || !master) return;
  if (!underF) {
    underF = ctx.createBiquadFilter();
    underF.type = 'lowpass';
    underF.frequency.value = 20000;
    master.disconnect();
    master.connect(underF).connect(compNode);
  }
  underF.frequency.setTargetAtTime(on ? 450 : 20000, ctx.currentTime, 0.08);
  if (on) sfx('bubbles');
}

export function setVolume(v) {
  volume = v;
  if (master) master.gain.value = v;
}

export function setListener(x, y, z, yaw, indoor) {
  listener.x = x;
  listener.y = y;
  listener.z = z;
  listener.yaw = yaw;
  listener.indoor = indoor;
}

// gain and pan for a sound at a world position; null = too far to hear
function place(pos, range) {
  if (!pos) return { gain: 1, pan: 0, dist: 0 };
  const dx = pos[0] - listener.x, dz = pos[2] - listener.z;
  const dist = Math.hypot(dx, dz, (pos[1] || 0) - listener.y);
  if (dist > range) return null;
  // right vector of the listener
  const rx = Math.cos(listener.yaw), rz = -Math.sin(listener.yaw);
  const pan = dist > 0.5 ? Math.max(-1, Math.min(1, ((dx * rx + dz * rz) / dist) * 0.85)) : 0;
  const gain = 1 / (1 + (dist / (range * 0.18)) ** 2);
  return { gain, pan, dist };
}

function out(p) {
  const g = ctx.createGain();
  g.gain.value = p.gain;
  if (ctx.createStereoPanner) {
    const s = ctx.createStereoPanner();
    s.pan.value = p.pan;
    g.connect(s).connect(master);
  } else g.connect(master);
  return g;
}

function noise(dest, t, dur, type, freq, q, vol, attack = 0.002, decayPow = 1) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur * decayPow);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
  return f;
}

function tone(dest, t, dur, type, f0, f1, vol, attack = 0.002) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const GUN = {
  pistol: { f: 1800, body: 140, dur: 0.18, vol: 0.55 },
  deagle: { f: 1100, body: 90, dur: 0.35, vol: 0.85 },
  smg: { f: 2200, body: 160, dur: 0.12, vol: 0.45 },
  shotgun: { f: 900, body: 70, dur: 0.45, vol: 0.95 },
  rifle: { f: 1400, body: 110, dur: 0.22, vol: 0.7 },
  sniper: { f: 800, body: 60, dur: 0.7, vol: 1.0 },
  m4: { f: 1700, body: 120, dur: 0.17, vol: 0.62 },
  scout: { f: 1000, body: 75, dur: 0.5, vol: 0.85 },
  mg: { f: 1250, body: 95, dur: 0.24, vol: 0.78 },
};

// "duck guns": every shot is a quack, big guns quack deeper
let quack = false;
export function setQuack(on) {
  quack = !!on;
}

export function sfx(name, pos = null, opt = {}) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + 0.005;
  if (GUN[name]) {
    const P = place(pos, 90);
    if (!P) return;
    const G = GUN[name];
    const d = out(P);
    if (quack) {
      const f = 300 + G.f * 0.22 + Math.random() * 60;
      const q = ctx.createBiquadFilter();
      q.type = 'bandpass';
      q.frequency.value = f * 2.2;
      q.Q.value = 2.5;
      q.connect(d);
      tone(q, t, 0.16, 'sawtooth', f * 1.25, f * 0.8, Math.min(1, G.vol * 1.6), 0.008);
      tone(q, t + 0.02, 0.12, 'square', f * 2.5, f * 1.6, G.vol * 0.4, 0.01);
      return;
    }
    const far = P.dist > 25;
    noise(d, t, G.dur * (far ? 1.6 : 1), 'lowpass', far ? G.f * 0.35 : G.f, 0.7, G.vol);
    noise(d, t, 0.05, 'highpass', 3000, 0.5, far ? 0.05 : G.vol * 0.6);
    tone(d, t, G.dur * 0.7, 'sine', G.body * 1.8, G.body * 0.6, G.vol * 0.9);
    if (listener.indoor || opt.indoor) noise(d, t + 0.06, G.dur * 2.2, 'bandpass', 700, 0.6, G.vol * 0.12, 0.02);
    if (opt.mech) noise(d, t + 0.02, 0.04, 'bandpass', 4000, 3, 0.12);
    return;
  }
  switch (name) {
    case 'knife': {
      const d = out(place(pos, 15) || { gain: 0, pan: 0 });
      noise(d, t, 0.18, 'bandpass', 3200, 1.5, 0.25, 0.05);
      break;
    }
    case 'step': {
      const P = place(pos, opt.loud ? 26 : 14);
      if (!P) return;
      const d = out(P);
      const surf = opt.surf || 'hard';
      const f = surf === 'soft' ? 500 : surf === 'metal' ? 2600 : surf === 'wood' ? 900 : 1500;
      noise(d, t, 0.09, 'bandpass', f, 1.4, (opt.self ? 0.09 : 0.32) * (opt.loud ? 1 : 0.5));
      tone(d, t, 0.06, 'sine', 120, 60, (opt.self ? 0.05 : 0.15) * (opt.loud ? 1 : 0.5));
      break;
    }
    case 'land': {
      const d = out(place(pos, 18) || { gain: 0, pan: 0 });
      noise(d, t, 0.14, 'lowpass', 600, 1, 0.3);
      break;
    }
    case 'reload': {
      const d = out(place(pos, 12) || { gain: 0, pan: 0 });
      noise(d, t, 0.05, 'bandpass', 2500, 4, 0.2);
      noise(d, t + 0.45, 0.06, 'bandpass', 1800, 4, 0.25);
      noise(d, t + (opt.dur || 2) - 0.35, 0.05, 'bandpass', 3000, 5, 0.3);
      break;
    }
    case 'dry': {
      const d = out({ gain: 1, pan: 0 });
      noise(d, t, 0.03, 'bandpass', 3500, 6, 0.2);
      break;
    }
    case 'draw': {
      const d = out({ gain: 1, pan: 0 });
      noise(d, t, 0.08, 'bandpass', 2600, 3, 0.12);
      break;
    }
    case 'hit': {
      // you hit someone
      const d = out({ gain: 1, pan: 0 });
      if (opt.head) {
        tone(d, t, 0.25, 'triangle', 2400, 2300, 0.22);
        tone(d, t, 0.2, 'sine', 3600, 3500, 0.08);
      } else noise(d, t, 0.07, 'bandpass', 900, 2, 0.35);
      break;
    }
    case 'hurt': {
      const d = out({ gain: 1, pan: 0 });
      noise(d, t, 0.12, 'lowpass', 500, 1, 0.5);
      tone(d, t, 0.12, 'sine', 160, 90, 0.3);
      break;
    }
    case 'impact': {
      const P = place(pos, 30);
      if (!P) return;
      const d = out(P);
      noise(d, t, 0.06, 'bandpass', opt.metal ? 3800 : 1600, opt.metal ? 6 : 1.5, 0.12);
      break;
    }
    case 'bounce': {
      const P = place(pos, 25);
      if (!P) return;
      noise(out(P), t, 0.05, 'bandpass', 2400, 5, 0.25);
      break;
    }
    case 'explode': {
      const P = place(pos, 120);
      if (!P) return;
      const d = out(P);
      noise(d, t, 1.4, 'lowpass', 700, 0.8, 1.0, 0.004);
      noise(d, t, 0.3, 'highpass', 1500, 0.5, 0.4);
      tone(d, t, 0.9, 'sine', 90, 30, 1.0);
      break;
    }
    case 'flashbang': {
      const P = place(pos, 100);
      if (!P) return;
      const d = out(P);
      noise(d, t, 0.35, 'highpass', 2000, 0.5, 0.9);
      tone(d, t, 0.3, 'square', 1200, 600, 0.15);
      break;
    }
    case 'ring': {
      const d = out({ gain: 1, pan: 0 });
      tone(d, t, opt.dur || 2, 'sine', 3800, 3700, 0.06, 0.05);
      break;
    }
    case 'pin': {
      const d = out({ gain: 1, pan: 0 });
      noise(d, t, 0.05, 'bandpass', 4500, 6, 0.2);
      noise(d, t + 0.15, 0.05, 'bandpass', 3000, 6, 0.15);
      break;
    }
    case 'buy': {
      const d = out({ gain: 1, pan: 0 });
      tone(d, t, 0.08, 'square', 880, 880, 0.06);
      tone(d, t + 0.07, 0.1, 'square', 1320, 1320, 0.06);
      break;
    }
    case 'deny': {
      const d = out({ gain: 1, pan: 0 });
      tone(d, t, 0.15, 'square', 220, 180, 0.07);
      break;
    }
    case 'click': {
      const d = out({ gain: 1, pan: 0 });
      tone(d, t, 0.04, 'square', 1500, 1500, 0.04);
      break;
    }
    case 'use': {
      const P = pos ? place(pos, 15) : { gain: 1, pan: 0 };
      if (!P) return;
      const d = out(P);
      tone(d, t, 0.12, 'triangle', 660, 660, 0.15);
      tone(d, t + 0.1, 0.16, 'triangle', 990, 990, 0.15);
      break;
    }
    case 'start': {
      const d = out({ gain: 1, pan: 0 });
      [0, 0.18, 0.36].forEach((k, i) => tone(d, t + k, 0.14, 'square', i === 2 ? 1046 : 784, i === 2 ? 1046 : 784, 0.07));
      break;
    }
    case 'win':
    case 'lose': {
      const d = out({ gain: 1, pan: 0 });
      const notes = name === 'win' ? [523, 659, 784, 1046] : [392, 349, 311, 262];
      notes.forEach((f, i) => tone(d, t + i * 0.16, 0.5, 'triangle', f, f, 0.12));
      break;
    }
    case 'rescue': {
      const d = out({ gain: 1, pan: 0 });
      [659, 880, 1175].forEach((f, i) => tone(d, t + i * 0.1, 0.3, 'sine', f, f, 0.15));
      break;
    }
    case 'kill': {
      const d = out({ gain: 1, pan: 0 });
      tone(d, t, 0.12, 'triangle', 1500, 1700, 0.12);
      break;
    }
    case 'shell': {
      const P = place(pos, 10);
      if (!P) return;
      const d = out(P);
      const f = 3200 + Math.random() * 1600;
      tone(d, t, 0.05, 'sine', f, f * 0.97, 0.05);
      tone(d, t + 0.07, 0.035, 'sine', f * 1.1, f, 0.03);
      break;
    }
    case 'groan': {
      const P = place(pos, 22);
      if (!P) return;
      const d = out(P);
      const f = 70 + Math.random() * 40;
      tone(d, t, 0.9, 'sawtooth', f * 1.6, f, 0.09);
      tone(d, t + 0.05, 0.8, 'square', f * 1.2, f * 0.8, 0.04);
      noise(d, t, 0.7, 'bandpass', 400, 2, 0.06);
      break;
    }
    case 'smoke': {
      // the long hiss of the can emptying
      const P = place(pos, 30);
      if (!P) return;
      const d = out(P);
      noise(d, t, 3.2, 'highpass', 1600, 0.5, 0.32, 0.08, 1.4);
      noise(d, t, 0.25, 'bandpass', 900, 1.2, 0.3, 0.005);
      break;
    }
    case 'thunder': {
      const d = out({ gain: 1, pan: (Math.random() - 0.5) * 0.6 });
      noise(d, t, 2.6, 'lowpass', 220, 0.7, 0.55, 0.05, 1.6);
      noise(d, t + 0.1, 1.2, 'lowpass', 600, 0.8, 0.25, 0.01, 2);
      tone(d, t, 1.8, 'sine', 55, 30, 0.25, 0.05);
      break;
    }
    case 'splash': {
      const d = out(place(pos, 30) || { gain: 0, pan: 0 });
      const big = opt?.big;
      noise(d, t, big ? 0.9 : 0.5, 'lowpass', big ? 1400 : 2200, 0.7, big ? 0.55 : 0.32, 0.005, 1.5);
      noise(d, t + 0.05, big ? 0.6 : 0.35, 'highpass', 2500, 0.6, 0.18, 0.01, 1.2);
      tone(d, t, 0.18, 'sine', big ? 180 : 260, 60, 0.18, 0.005);
      break;
    }
    case 'drip': {
      const d = out(place(pos, 18) || { gain: 0, pan: 0 });
      noise(d, t, 0.35, 'bandpass', 1800, 1.2, 0.14, 0.01, 1.3);
      break;
    }
    case 'stroke': {
      const d = out(place(pos, 18) || { gain: 0, pan: 0 });
      noise(d, t, 0.32, 'bandpass', 1100, 0.9, 0.12, 0.04, 1.2);
      break;
    }
    case 'bubbles': {
      const d = out({ gain: 1, pan: 0 });
      for (let i = 0; i < 6; i++) tone(d, t + i * 0.06 + Math.random() * 0.04, 0.05, 'sine', 500 + Math.random() * 700, 1200, 0.08, 0.005);
      break;
    }
    case 'party': {
      // a party horn and a couple of pops
      const d = out(place(pos, 30) || { gain: 0, pan: 0 });
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(380, t);
      o.frequency.linearRampToValueAtTime(520, t + 0.35);
      lfo.frequency.value = 18;
      lg.gain.value = 25;
      lfo.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.03);
      g.gain.setValueAtTime(0.16, t + 0.38);
      g.gain.linearRampToValueAtTime(0, t + 0.5);
      o.connect(g).connect(d);
      o.start(t);
      lfo.start(t);
      o.stop(t + 0.52);
      lfo.stop(t + 0.52);
      noise(d, t, 0.05, 'highpass', 2000, 0.7, 0.3, 0.002);
      noise(d, t + 0.09, 0.04, 'highpass', 2600, 0.7, 0.2, 0.002);
      break;
    }
    case 'whee': {
      // off into the sky: a rising whistle
      const d = out(place(pos, 40) || { gain: 0, pan: 0 });
      tone(d, t, 1.3, 'sine', 500, 2400, 0.22, 0.02);
      tone(d, t, 1.3, 'triangle', 1000, 4800, 0.06, 0.02);
      break;
    }
    case 'ding': {
      const d = out(place(pos, 60) || { gain: 0, pan: 0 });
      tone(d, t, 0.6, 'sine', 2637, 2637, 0.18, 0.003);
      tone(d, t, 0.6, 'sine', 3951, 3951, 0.08, 0.003);
      break;
    }
    case 'crackle': {
      // a dry snap from the fire: a short click of noise, sometimes two
      const P = place(pos, 10);
      if (!P) return;
      const d = out(P);
      noise(d, t, 0.03, 'bandpass', 2500 + Math.random() * 2500, 2, 0.12 + Math.random() * 0.1, 0.002);
      if (Math.random() < 0.4) noise(d, t + 0.05 + Math.random() * 0.08, 0.02, 'bandpass', 3500, 2, 0.08, 0.002);
      break;
    }
    case 'spray': {
      const P = place(pos, 12);
      if (!P) return;
      noise(out(P), t, 0.45, 'highpass', 5000, 0.6, 0.12, 0.02);
      break;
    }
    case 'cluck': {
      const P = place(pos, 18);
      if (!P) return;
      const d = out(P);
      tone(d, t, 0.07, 'square', 760, 520, 0.05);
      tone(d, t + 0.09, 0.06, 'square', 820, 560, 0.045);
      if (Math.random() < 0.5) tone(d, t + 0.17, 0.12, 'square', 900, 480, 0.05);
      break;
    }
    case 'squawk': {
      const P = place(pos, 30);
      if (!P) return;
      const d = out(P);
      tone(d, t, 0.25, 'sawtooth', 1200, 500, 0.12);
      tone(d, t + 0.05, 0.2, 'square', 900, 1400, 0.07);
      noise(d, t, 0.18, 'bandpass', 2500, 1.2, 0.18);
      break;
    }
    case 'streak': {
      const d = out({ gain: 1, pan: 0 });
      const n = Math.max(1, Math.min(5, opt.n || 1));
      const base = [520, 587, 659, 784, 880][n - 1];
      for (let i = 0; i < Math.min(4, n + 1); i++) tone(d, t + i * 0.07, 0.14, 'square', base * [1, 1.25, 1.5, 2][i], base * [1, 1.25, 1.5, 2][i], 0.05);
      tone(d, t, 0.35 + n * 0.06, 'sawtooth', base / 2, base / 2, 0.035);
      break;
    }
  }
}
