import { store } from './util.js';

// All sound effects are made on the fly with WebAudio, no files.

export const sound = { on: store.get('jekpe.sound', true), ctx: null, out: null, noiseBuf: null };

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
    // 'suspended' before the first tap, 'interrupted' on iOS after a call or Siri
    mediaUnlock();
    if (sound.ctx.state !== 'running' && !document.hidden) {
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
    const out = c.createGain();
    out.gain.value = 0.9;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    out.connect(comp).connect(c.destination);
    const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let n = 0; n < d.length; n++) d[n] = Math.random() * 2 - 1;
    Object.assign(sound, { ctx: c, out, noiseBuf: buf });
    kick(c);
  } catch {
    sound.ctx = null;
  }
}

export function setSound(on) {
  sound.on = on;
  store.set('jekpe.sound', on);
  if (on) audioInit();
}

const ready = () => sound.on && sound.ctx;

function env(g, t, peak, attack, release) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

function glide(type, f0, f1, dur, vol, delay = 0, curve = 'exp') {
  const c = sound.ctx;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  else o.frequency.linearRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  env(g, t, vol, 0.005, dur);
  o.connect(g).connect(sound.out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, vol, type = 'lowpass', freq = 1200, delay = 0, q = 0.8, sweep = 0) {
  const c = sound.ctx;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = sound.noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  env(g, t, vol, 0.004, dur);
  s.connect(f).connect(g).connect(sound.out);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

export const sfx = {
  whoosh(heavy) {
    if (!ready()) return;
    noise(heavy ? 0.22 : 0.13, heavy ? 0.22 : 0.14, 'bandpass', heavy ? 600 : 1100, 0, 1.2, heavy ? 2400 : 3200);
  },
  hit(kind) {
    if (!ready()) return;
    if (kind === 'heavy' || kind === 'pot') {
      glide('sine', 160, 45, 0.28, 0.5);
      noise(0.2, 0.45, 'lowpass', 2400, 0, 0.7, 300);
      if (kind === 'pot') {
        // a cast-iron "bong"
        glide('triangle', 210, 200, 0.6, 0.18);
        glide('sine', 520, 515, 0.5, 0.08);
      } else {
        glide('square', 900, 200, 0.06, 0.08);
      }
    } else if (kind === 'ladle') {
      glide('sine', 1250, 1180, 0.25, 0.12);
      glide('triangle', 2400, 2300, 0.14, 0.06);
      noise(0.06, 0.25, 'highpass', 1800);
    } else if (kind === 'mid') {
      glide('sine', 130, 55, 0.18, 0.4);
      noise(0.12, 0.35, 'lowpass', 1800, 0, 0.7, 400);
    } else {
      glide('sine', 180, 80, 0.1, 0.3);
      noise(0.07, 0.3, 'bandpass', 1600, 0, 0.9);
    }
  },
  block(metal) {
    if (!ready()) return;
    if (metal) {
      for (const f of [880, 1320, 2110]) glide('triangle', f, f * 0.98, 0.3, 0.06);
    } else {
      glide('sine', 300, 200, 0.08, 0.2);
    }
    noise(0.05, 0.2, 'highpass', 2500);
  },
  jump() {
    if (!ready()) return;
    glide('sine', 300, 520, 0.12, 0.06);
  },
  land() {
    if (!ready()) return;
    noise(0.08, 0.12, 'lowpass', 500);
  },
  thud(big) {
    if (!ready()) return;
    glide('sine', 110, 40, big ? 0.35 : 0.2, big ? 0.45 : 0.3);
    noise(big ? 0.3 : 0.15, big ? 0.35 : 0.2, 'lowpass', 700);
  },
  lasso() {
    if (!ready()) return;
    for (let k = 0; k < 3; k++) noise(0.09, 0.12, 'bandpass', 900 + k * 300, k * 0.08, 2);
    glide('sine', 500, 900, 0.2, 0.05, 0.22);
  },
  snap() {
    if (!ready()) return;
    noise(0.04, 0.4, 'highpass', 3000);
    glide('square', 1400, 400, 0.05, 0.08);
  },
  toss() {
    if (!ready()) return;
    glide('sine', 400, 900, 0.1, 0.12);
    noise(0.1, 0.12, 'bandpass', 1500, 0, 1.5);
  },
  splat() {
    if (!ready()) return;
    // a soft squishy "boing"
    glide('sine', 260, 700, 0.18, 0.18);
    noise(0.12, 0.25, 'lowpass', 900);
  },
  grab() {
    if (!ready()) return;
    noise(0.07, 0.25, 'lowpass', 1200);
    glide('sine', 220, 160, 0.08, 0.15);
  },
  nope() {
    if (!ready()) return;
    glide('square', 200, 150, 0.12, 0.05);
  },
  shake() {
    if (!ready()) return;
    glide('triangle', 500 + Math.random() * 200, 300, 0.07, 0.06);
  },
  ko() {
    if (!ready()) return;
    // slide whistle down, then a crash
    glide('sine', 1400, 180, 0.9, 0.16, 0, 'lin');
    noise(0.5, 0.4, 'lowpass', 3000, 0.05, 0.6, 200);
    glide('sine', 90, 35, 0.6, 0.5, 0.05);
  },
  twinkle() {
    if (!ready()) return;
    [1568, 2093, 2637, 3136].forEach((f, k) => glide('sine', f, f, 0.18, 0.06, k * 0.06));
  },
  gong() {
    if (!ready()) return;
    // a drum roll on the dauylpaz and a gong-like hit
    for (let k = 0; k < 6; k++) glide('sine', 150, 70, 0.12, 0.25, k * 0.07);
    glide('sine', 98, 96, 1.6, 0.25, 0.45);
    glide('triangle', 196, 192, 1.2, 0.08, 0.45);
    noise(0.8, 0.12, 'bandpass', 600, 0.45, 0.5);
  },
  fight() {
    if (!ready()) return;
    glide('sine', 140, 50, 0.4, 0.55);
    noise(0.3, 0.3, 'lowpass', 2000, 0, 0.6, 300);
    // a dombra chord strum
    [196, 294, 392].forEach((f, k) => glide('sawtooth', f, f, 0.5, 0.05, 0.02 + k * 0.025));
  },
  crowd(big) {
    if (!ready()) return;
    // many voices: filtered noise that swells and fades
    const c = sound.ctx;
    const t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = sound.noiseBuf;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(700, t);
    f.frequency.linearRampToValueAtTime(1100, t + 0.4);
    f.Q.value = 0.9;
    const g = c.createGain();
    const v = big ? 0.22 : 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 1.6 : 0.8));
    s.connect(f).connect(g).connect(sound.out);
    s.start(t);
    s.stop(t + 1.7);
  },
  whistle() {
    if (!ready()) return;
    // two fingers in the mouth: a sharp rising whistle
    glide('sine', 1800, 3000, 0.25, 0.12);
    glide('sine', 3000, 2600, 0.4, 0.12, 0.28);
  },
  screech() {
    if (!ready()) return;
    const c = sound.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(2200, t);
    o.frequency.exponentialRampToValueAtTime(1300, t + 0.7);
    const lfo = c.createOscillator();
    lfo.frequency.value = 30;
    const depth = c.createGain();
    depth.gain.value = 180;
    lfo.connect(depth).connect(o.frequency);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 3;
    const g = c.createGain();
    env(g, t, 0.12, 0.03, 0.7);
    o.connect(f).connect(g).connect(sound.out);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.8);
    lfo.stop(t + 0.8);
  },
  ujat() {
    if (!ready()) return;
    // a sad trombone, the comic version of a fatality sting
    [392, 370, 349, 330].forEach((f, k) => {
      const last = k === 3;
      glide('sawtooth', f, last ? f * 0.94 : f, last ? 0.9 : 0.3, 0.07, k * 0.32, 'lin');
    });
    this.crowd(true);
  },
  win() {
    if (!ready()) return;
    [523, 659, 784, 1047].forEach((f, k) => glide('triangle', f, f, 0.25, 0.12, k * 0.12));
  },
  tick() {
    if (!ready()) return;
    glide('square', 1000, 1000, 0.04, 0.04);
  },
  strum() {
    if (!ready()) return;
    // a quick dombra strum down the two strings
    [196, 294, 392, 294].forEach((f, k) => glide('sawtooth', f, f * 0.995, 0.35, 0.06, k * 0.03));
    noise(0.05, 0.08, 'highpass', 3000);
  },
  flick() {
    if (!ready()) return;
    noise(0.06, 0.2, 'bandpass', 2600, 0, 2);
    glide('sine', 900, 1600, 0.06, 0.05);
  },
  coin() {
    if (!ready()) return;
    glide('square', 1320, 1320, 0.05, 0.05);
    glide('square', 1760, 1760, 0.12, 0.05, 0.05);
  },
  horn() {
    if (!ready()) return;
    // a car horn, two beeps
    for (const d of [0, 0.22]) for (const f of [392, 494]) glide('square', f, f, 0.16, 0.06, d);
  },
  door() {
    if (!ready()) return;
    noise(0.08, 0.3, 'lowpass', 900);
    glide('sine', 160, 90, 0.1, 0.25);
  },
  yawn() {
    if (!ready()) return;
    glide('sawtooth', 300, 520, 0.4, 0.04, 0, 'lin');
    glide('sawtooth', 520, 220, 0.8, 0.05, 0.4, 'lin');
  },
  whirl() {
    if (!ready()) return;
    noise(0.25, 0.14, 'bandpass', 700, 0, 3, 1600);
  },
  sneeze() {
    if (!ready()) return;
    glide('sawtooth', 700, 1200, 0.15, 0.08);
    noise(0.6, 0.5, 'highpass', 900, 0.12, 0.6, 3000);
  },
  stomp() {
    if (!ready()) return;
    glide('sine', 80, 30, 0.6, 0.6);
    noise(0.5, 0.4, 'lowpass', 400);
  },
  bleat() {
    if (!ready()) return;
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
    env(g, t, 0.12, 0.05, 0.45);
    o.connect(f).connect(g).connect(sound.out);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.52);
    lfo.stop(t + 0.52);
  },
  bonk() {
    if (!ready()) return;
    glide('sine', 220, 120, 0.15, 0.3);
    noise(0.08, 0.2, 'lowpass', 600);
  },
  fallback() {
    if (!ready()) return;
    // the slide whistle of someone coming back down from the sky
    glide('sine', 2200, 300, 1.1, 0.12, 0, 'lin');
  },
  pop() {
    if (!ready()) return;
    glide('sine', 600, 1200, 0.07, 0.12);
  },
  taunt() {
    if (!ready()) return;
    // a cheeky "na-na" on a squeaky horn
    [660, 520, 660, 520].forEach((f, k) => glide('square', f, f, 0.1, 0.035, k * 0.11));
  },
  // short gibberish when someone talks: pitch depends on the fighter
  babble(pitch = 1, n = 4) {
    if (!ready()) return;
    for (let k = 0; k < n; k++) {
      const f = (180 + Math.random() * 140) * pitch;
      glide('triangle', f, f * (0.8 + Math.random() * 0.5), 0.07, 0.05, k * 0.075);
    }
  },
};
