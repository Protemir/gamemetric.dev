import { store } from './util.js';
import { sound, audioInit } from './audio.js';

// Background music, made on the fly with WebAudio: a small step sequencer with
// drums, bass, an arpeggio, a pad and, for the steppe, a dombra-like pluck.
// Every map has its own key, tempo and groove.

const M = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CHORD = { m: [0, 3, 7], M: [0, 4, 7], p: [0, 7, 12], s: [0, 5, 7] };
const on16 = (...xs) => Array.from({ length: 16 }, (_, k) => (xs.includes(k) ? 1 : 0));

const SONGS = {
  city: {
    bpm: 112, key: 57, chords: [[0, 'm'], [-4, 'M'], [3, 'M'], [-2, 'M']],
    kick: on16(0, 4, 8, 12), snare: on16(4, 12), hat: on16(2, 6, 10, 14),
    bass: on16(0, 2, 4, 6, 8, 10, 12, 14), bassOct: true, arp: 'up16', lead: 'square', pad: true,
  },
  medeu: {
    bpm: 96, key: 62, chords: [[0, 'm'], [-4, 'M'], [3, 'M'], [-2, 'M']],
    kick: on16(0, 8, 11), snare: on16(4, 12), hat: on16(0, 2, 4, 6, 8, 10, 12, 14),
    bass: on16(0, 3, 8, 11), arp: 'up8', lead: 'triangle', pad: true, bell: true,
  },
  shymbulak: {
    bpm: 104, key: 60, chords: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']],
    kick: on16(0, 8), snare: on16(4, 12), hat: on16(1, 3, 5, 7, 9, 11, 13, 15),
    bass: on16(0, 6, 8, 14), arp: 'updown16', lead: 'triangle', pad: true,
  },
  kapchagay: {
    bpm: 120, key: 64, chords: [[0, 'm'], [-2, 'M'], [-4, 'M'], [-2, 'M']],
    kick: on16(0, 6, 8, 14), snare: on16(4, 12), hat: on16(2, 10),
    bass: on16(0, 4, 8, 12), dombra: true, pad: false,
  },
  charyn: {
    bpm: 132, key: 52, chords: [[0, 'p'], [3, 'p'], [5, 'p'], [-2, 'p']],
    kick: on16(0, 3, 8, 10), snare: on16(4, 12), hat: on16(0, 2, 4, 6, 8, 10, 12, 14),
    bass: on16(0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14), arp: 'up8', lead: 'sawtooth', pad: false,
  },
};

export const music = { on: store.get('asem.music', true), song: null, id: null, intensity: 0 };
let out = null;
let delay = null;
let noiseBuf = null;
let timer = 0;
let step = 0;
let nextTime = 0;

function setup() {
  audioInit();
  const c = sound.ctx;
  if (!c || out) return !!c;
  out = c.createGain();
  out.gain.value = 0;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  out.connect(comp).connect(c.destination);
  delay = c.createDelay(1);
  const fb = c.createGain();
  fb.gain.value = 0.28;
  const wet = c.createGain();
  wet.gain.value = 0.35;
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(out);
  noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let n = 0; n < d.length; n++) d[n] = Math.random() * 2 - 1;
  return true;
}

function env(g, t, peak, attack, release) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

function tone(t, freq, type, peak, attack, release, opts = {}) {
  const c = sound.ctx;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (opts.detune) o.detune.value = opts.detune;
  const g = c.createGain();
  env(g, t, peak, attack, release);
  let node = o;
  if (opts.cutoff) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(opts.cutoff, t);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + attack + release);
    o.connect(f);
    node = f;
  }
  node.connect(g).connect(out);
  if (opts.echo) g.connect(delay);
  o.start(t);
  o.stop(t + attack + release + 0.05);
}

function noise(t, type, freq, peak, release) {
  const c = sound.ctx;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = c.createGain();
  env(g, t, peak, 0.002, release);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 0.5);
  s.stop(t + release + 0.05);
}

function kick(t) {
  const c = sound.ctx;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  const g = c.createGain();
  env(g, t, 0.55, 0.003, 0.2);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.25);
}

function schedule(s, t) {
  const song = music.song;
  const beat = 60 / song.bpm;
  const sixteenth = beat / 4;
  const bar = Math.floor(s / 16) % song.chords.length;
  const k = s % 16;
  const [off, kind] = song.chords[bar];
  const chord = CHORD[kind].map((x) => song.key + off + x);
  const full = music.intensity > 0.5;

  if (full) {
    if (song.kick[k]) kick(t);
    if (song.snare[k]) noise(t, 'bandpass', 1900, 0.28, 0.14);
    if (song.hat[k]) noise(t, 'highpass', 7500, 0.08, 0.035);
    if (song.bass[k]) {
      const low = chord[0] - 24 + (song.bassOct && k % 4 === 2 ? 12 : 0);
      tone(t, M(low), 'sawtooth', 0.16, 0.005, sixteenth * 1.6, { cutoff: 900, sweep: 220 });
    }
  }
  if (song.pad && k === 0) {
    for (const n of chord) {
      tone(t, M(n), 'sawtooth', full ? 0.035 : 0.045, beat * 0.8, beat * 3.4, { cutoff: 1300, detune: 7 });
      tone(t, M(n), 'sawtooth', full ? 0.03 : 0.04, beat * 0.8, beat * 3.4, { cutoff: 1300, detune: -7 });
    }
  }
  if (song.arp) {
    const every = song.arp.endsWith('8') ? 2 : 1;
    if (k % every === 0) {
      const i = Math.floor(k / every);
      let idx = i % 3;
      if (song.arp.startsWith('updown')) idx = [0, 1, 2, 1][i % 4];
      const n = chord[idx] + 12 + (Math.floor(i / 3) % 2 ? 12 : 0);
      tone(t, M(n), song.lead, full ? 0.05 : 0.04, 0.004, sixteenth * 1.4, { cutoff: 3200, echo: true });
    }
  }
  if (song.bell && k === 8 && bar % 2 === 0) tone(t, M(chord[2] + 24), 'sine', 0.06, 0.005, beat * 2.5, { echo: true });
  if (song.dombra) {
    // the two strings of a dombra: a fast "da-da-dam" strum on the root and the fifth
    const pattern = [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0];
    if (pattern[k]) {
      const n = (k % 4 === 0 ? chord[0] : chord[1]) + 12;
      tone(t, M(n), 'sawtooth', 0.07, 0.002, 0.14, { cutoff: 2400, sweep: 500 });
      tone(t, M(n + 7), 'triangle', 0.035, 0.002, 0.12);
    }
    if (k === 0 && bar % 2 === 1) tone(t, M(chord[2] + 24), 'triangle', 0.05, 0.01, beat * 1.5, { echo: true });
  }
}

function tick() {
  if (!music.song || !sound.ctx) return;
  const c = sound.ctx;
  const sixteenth = 60 / music.song.bpm / 4;
  if (nextTime < c.currentTime) nextTime = c.currentTime + 0.05;
  while (nextTime < c.currentTime + 0.15) {
    schedule(step, nextTime);
    nextTime += sixteenth;
    step++;
  }
}

function level() {
  if (!out) return;
  const now = sound.ctx.currentTime;
  out.gain.setTargetAtTime(music.on && music.song ? 0.6 : 0, now, 0.4);
}

// mapId picks the song; intensity 0 = menu (pad and arpeggio), 1 = race (full band)
export function playMusic(mapId, intensity) {
  music.intensity = intensity;
  if (!music.on) return;
  if (!setup()) return;
  const song = SONGS[mapId] || SONGS.city;
  if (music.song !== song) {
    music.song = song;
    music.id = mapId;
    step = 0;
    nextTime = sound.ctx.currentTime + 0.1;
  }
  if (!timer) {
    nextTime = Math.max(nextTime, sound.ctx.currentTime + 0.1);
    timer = setInterval(tick, 25);
  }
  level();
}

export function setMusic(on) {
  music.on = on;
  store.set('asem.music', on);
  if (!on) {
    level();
    clearInterval(timer);
    timer = 0;
    music.song = null;
  }
}

export function pauseMusic(paused) {
  if (paused) {
    clearInterval(timer);
    timer = 0;
    if (out) out.gain.setTargetAtTime(0, sound.ctx.currentTime, 0.05);
  } else if (music.on && music.song && !timer) {
    nextTime = sound.ctx.currentTime + 0.1;
    timer = setInterval(tick, 25);
    level();
  }
}
