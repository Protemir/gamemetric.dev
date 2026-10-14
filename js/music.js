import { store } from './util.js';
import { sound, audioInit } from './audio.js';

// Background music made on the fly: a step sequencer with a dombra strum, a dauylpaz drum,
// bass and a sybyzgy-like flute. Three songs: menu, fight and the kara zhorga dance.

const M = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CHORD = { m: [0, 3, 7], M: [0, 4, 7] };
const on16 = (...xs) => Array.from({ length: 16 }, (_, k) => (xs.includes(k) ? 1 : 0));
const _ = null;

const SONGS = {
  menu: {
    bpm: 100, key: 52, chords: [[0, 'm'], [0, 'm'], [-2, 'M'], [3, 'M']],
    kick: on16(), snare: on16(), hat: on16(),
    bass: on16(0, 8), pad: true, dombra: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0], vol: 0.8,
    melody: [
      [0, _, _, _, 3, _, 5, _, 7, _, _, _, 5, _, 3, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      [5, _, _, _, 3, _, 2, _, 0, _, _, _, -2, _, _, _],
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
  fight: {
    bpm: 138, key: 52, chords: [[0, 'm'], [0, 'm'], [-2, 'M'], [3, 'M']],
    kick: on16(0, 3, 6, 8, 11, 14), snare: on16(4, 12), hat: on16(2, 6, 10, 14),
    bass: on16(0, 3, 6, 8, 11, 14), pad: false, dombra: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0], vol: 1,
    melody: [
      [0, _, _, 3, 5, _, 7, _, 5, _, 3, _, 0, _, _, _],
      [7, _, _, 10, 12, _, 10, _, 7, _, 5, _, 7, _, _, _],
      [5, _, 3, _, 2, _, 0, _, -2, _, 0, _, 2, _, _, _],
      [3, _, 5, _, 7, _, 10, _, 7, _, 5, _, 3, _, 0, _],
    ],
  },
  zhorga: {
    bpm: 132, key: 62, chords: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']],
    kick: on16(0, 3, 8, 11), snare: on16(4, 12), hat: on16(2, 6, 10, 14), clap: true,
    bass: on16(0, 3, 8, 11), pad: false, dombra: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1], vol: 1,
    melody: [
      [0, _, 4, _, 7, _, 4, _, 9, _, 7, _, 4, _, 2, _],
      [0, _, 4, _, 7, _, 12, _, 11, _, 9, _, 7, _, _, _],
      [5, _, 9, _, 12, _, 9, _, 7, _, 5, _, 4, _, 2, _],
      [2, _, 4, _, 7, _, 4, _, 2, _, 0, _, 0, _, _, _],
    ],
  },
};

export const music = { on: store.get('jekpe.music', true), song: null, id: null, speed: 1 };
let out = null;
let delay = null;
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
  delay.delayTime.value = 0.32;
  const fb = c.createGain();
  fb.gain.value = 0.25;
  const wet = c.createGain();
  wet.gain.value = 0.3;
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(out);
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
  let lfo = null;
  if (opts.vibrato) {
    lfo = c.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = c.createGain();
    depth.gain.value = freq * 0.012;
    lfo.connect(depth).connect(o.frequency);
    lfo.start(t + 0.08);
    lfo.stop(t + attack + release + 0.05);
  }
  node.connect(g).connect(out);
  if (opts.echo) g.connect(delay);
  o.start(t);
  o.stop(t + attack + release + 0.05);
}

function hiss(t, type, freq, peak, release) {
  const c = sound.ctx;
  const s = c.createBufferSource();
  s.buffer = sound.noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = c.createGain();
  env(g, t, peak, 0.002, release);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 0.5);
  s.stop(t + release + 0.05);
}

function drum(t, f0, f1, peak, len) {
  const c = sound.ctx;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.6);
  const g = c.createGain();
  env(g, t, peak, 0.003, len);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + len + 0.05);
}

function schedule(s, t) {
  const song = music.song;
  const beat = 60 / (song.bpm * music.speed);
  const sixteenth = beat / 4;
  const bar = Math.floor(s / 16) % song.chords.length;
  const k = s % 16;
  const [off, kind] = song.chords[bar];
  const chord = CHORD[kind].map((x) => song.key + off + x);
  const v = song.vol;

  if (song.kick[k]) drum(t, 120, 48, 0.5 * v, 0.22);
  if (song.snare[k]) {
    // the dauylpaz: a frame drum, deep and dry
    drum(t, 200, 110, 0.25 * v, 0.12);
    hiss(t, 'bandpass', 1500, 0.18 * v, 0.1);
  }
  if (song.clap && (k === 4 || k === 12)) {
    hiss(t, 'bandpass', 1300, 0.3, 0.06);
    hiss(t + 0.012, 'bandpass', 1300, 0.25, 0.08);
  }
  if (song.hat[k]) hiss(t, 'highpass', 7000, 0.06 * v, 0.03);
  if (song.bass[k]) tone(t, M(chord[0] - 24), 'sawtooth', 0.14 * v, 0.005, sixteenth * 1.8, { cutoff: 800, sweep: 200 });
  if (song.pad && k === 0) {
    for (const n of chord) tone(t, M(n - 12), 'triangle', 0.035, beat * 0.9, beat * 3.2, { detune: 6 });
  }
  if (song.dombra[k]) {
    // two strings: root and fifth, the first strum of each beat a little louder
    const n = (k % 4 === 0 ? chord[0] : chord[1]) + 12;
    const acc = k % 4 === 0 ? 1.25 : 1;
    tone(t, M(n), 'sawtooth', 0.06 * acc, 0.002, 0.13, { cutoff: 2600, sweep: 500 });
    tone(t, M(n + 7), 'triangle', 0.03 * acc, 0.002, 0.11);
  }
  const mel = song.melody[bar][k];
  if (mel != null) {
    const len = song.melody[bar].slice(k + 1).findIndex((x) => x != null);
    const dur = (len < 0 ? 16 - k : len + 1) * sixteenth;
    tone(t, M(song.key + 12 + mel), 'sine', 0.085, 0.03, dur * 0.95, { vibrato: true, echo: true });
    tone(t, M(song.key + 24 + mel), 'sine', 0.012, 0.03, dur * 0.8);
  }
}

function tick() {
  if (!music.song || !sound.ctx) return;
  const c = sound.ctx;
  const sixteenth = 60 / (music.song.bpm * music.speed) / 4;
  if (nextTime < c.currentTime) nextTime = c.currentTime + 0.05;
  while (nextTime < c.currentTime + 0.15) {
    schedule(step, nextTime);
    nextTime += sixteenth;
    step++;
  }
}

function level() {
  if (!out) return;
  out.gain.setTargetAtTime(music.on && music.song ? 0.55 : 0, sound.ctx.currentTime, 0.3);
}

export function playMusic(id) {
  if (!music.on) return;
  if (!setup()) return;
  const song = SONGS[id] || SONGS.menu;
  if (music.song !== song) {
    music.song = song;
    music.id = id;
    music.speed = 1;
    step = 0;
    nextTime = sound.ctx.currentTime + 0.1;
  }
  if (!timer) timer = setInterval(tick, 25);
  level();
}

export function setTempo(k) {
  music.speed = k;
}

export function setMusic(on) {
  music.on = on;
  store.set('jekpe.music', on);
  if (!on) {
    level();
    clearInterval(timer);
    timer = 0;
    music.song = null;
  }
}

export function pauseMusic(paused) {
  if (!timer && !paused) return;
  if (paused) {
    clearInterval(timer);
    timer = 0;
    if (out) out.gain.setTargetAtTime(0, sound.ctx.currentTime, 0.05);
  } else if (music.song) {
    nextTime = sound.ctx.currentTime + 0.1;
    timer = setInterval(tick, 25);
    level();
  }
}
