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
const OUT = 0.55; // the master level; a compressor keeps the peaks in hand
export function audioInit() {
  unlockMedia();
  if (sound.ctx) {
    if (sound.ctx.state !== 'running' && !document.hidden && !sound.held) sound.ctx.resume().catch(() => {});
    return;
  }
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const out = c.createGain();
    out.gain.value = sound.on && !sound.held ? OUT : 0;
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
  if (sound.ctx) sound.out.gain.setTargetAtTime(on && !sound.held ? OUT : 0, sound.ctx.currentTime, 0.05);
}

// a portal's own mute wins over the in-game button
export function holdAudio(on) {
  sound.held = on;
  if (sound.ctx) sound.out.gain.setTargetAtTime(sound.on && !on ? OUT : 0, sound.ctx.currentTime, 0.05);
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
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.025);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1150 + Math.random() * 350;
  lp.Q.value = 0.4;
  src.connect(lp).connect(g).connect(sound.music.bus);
  src.start(when);
}

// The dombra plays our own küis, written for the game in the old manner: a drone on the lower string,
// the tune on the upper, a strum that gallops or ambles, phrases that fall and return. One fits each moment:
// «Дала» (the wide steppe) on the title and at the councils, «Жорға» (the ambler) and «Кербез» (the proud one)
// take turns during play, «Шабуыл» (the raid) when the horde comes, «Түн» (the night) when the knife is near.
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const MODES = { dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], mixo: [0, 2, 4, 5, 7, 9, 10], hijaz: [0, 1, 4, 5, 7, 8, 10] };
// a motif is one bar: [scale degree, length in eighths]
const PIECES = {
  // in the spirit of Kurmangazy's «Адай»: a running gallop of repeated notes, a run that climbs and falls back
  // (our own notes, not a transcription)
  adai: { bpm: 112, root: 62, mode: 'aeolian', drone: [38, 45], strum: 'X.x.X.x.', form: 'ABACABDA', vol: 0.2, rest: 0.05,
    m: { A: [[4, 1], [4, 1], [5, 1], [4, 1], [3, 1], [4, 1], [2, 2]], B: [[0, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 2]], C: [[7, 1], [7, 1], [8, 1], [7, 1], [6, 1], [5, 1], [4, 2]], D: [[4, 1], [3, 1], [2, 1], [1, 1], [0, 2], [0, 2]] } },
  dala: { bpm: 70, root: 62, mode: 'dorian', drone: [38, 45], strum: 'X.......', form: 'AABACADA', vol: 0.2, rest: 0.18,
    m: { A: [[7, 2], [6, 1], [7, 1], [5, 2], [4, 2]], B: [[4, 1], [5, 1], [4, 1], [3, 1], [2, 2], [0, 2]], C: [[9, 2], [8, 1], [7, 1], [8, 2], [7, 2]], D: [[2, 1], [3, 1], [4, 2], [3, 1], [2, 1], [0, 2]] } },
  jorga: { bpm: 92, root: 62, mode: 'aeolian', drone: [38, 45], strum: 'X...x...', form: 'AABACCDA', vol: 0.18, rest: 0.22,
    m: { A: [[4, 1], [4, 1], [5, 1], [4, 1], [3, 1], [2, 1], [3, 2]], B: [[2, 1], [2, 1], [3, 1], [2, 1], [1, 1], [0, 1], [1, 2]], C: [[7, 1], [6, 1], [5, 1], [4, 1], [5, 1], [4, 1], [3, 2]], D: [[4, 1], [3, 1], [2, 1], [1, 1], [0, 4]] } },
  kerbez: { bpm: 84, root: 62, mode: 'dorian', drone: [38, 43], strum: 'X...x...', form: 'AABACDAB', vol: 0.18, rest: 0.22,
    m: { A: [[0, 1], [2, 1], [4, 2], [5, 1], [4, 1], [2, 2]], B: [[7, 2], [5, 1], [4, 1], [5, 2], [4, 2]], C: [[4, 1], [5, 1], [7, 1], [5, 1], [4, 2], [2, 2]], D: [[2, 1], [1, 1], [0, 2], [0, 4]] } },
  shabuyl: { bpm: 132, root: 50, mode: 'phrygian', drone: [38, 45], strum: 'X.x.X.x.', form: 'AABACACD', vol: 0.24, rest: 0.08,
    m: { A: [[0, 1], [0, 1], [1, 1], [0, 1], [3, 1], [1, 1], [0, 2]], B: [[4, 1], [4, 1], [5, 1], [4, 1], [3, 1], [1, 1], [0, 2]], C: [[7, 1], [5, 1], [4, 1], [3, 1], [4, 1], [3, 1], [1, 2]], D: [[0, 1], [1, 1], [3, 1], [4, 1], [5, 2], [4, 2]] } },
  tun: { bpm: 50, root: 69, mode: 'hijaz', drone: [38], strum: '........', form: 'ABACABDA', vol: 0.16, rest: 0.3,
    m: { A: [[4, 4], [2, 4]], B: [[3, 2], [2, 2], [0, 4]], C: [[5, 4], [4, 4]], D: [[2, 2], [1, 2], [0, 4]] } },
};
const MUSIC_GAIN = 2.3;
// a hall made of noise that dies away: enough to soften the strings, not to drown them
function impulse(c, sec) {
  const len = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  return buf;
}
const degree = (p, d) => { const md = MODES[p.mode]; return p.root + md[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7); };

function startMusic() {
  const c = sound.ctx;
  const bus = c.createGain();
  bus.gain.value = (sound.wantMusic ?? 1) * MUSIC_GAIN;
  const dry = c.createGain(), wet = c.createGain(), hall = c.createConvolver();
  dry.gain.value = 0.62;
  wet.gain.value = 0.5;
  hall.buffer = impulse(c, 2.8);
  bus.connect(dry).connect(sound.out);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 280;
  bus.connect(hp).connect(hall).connect(wet).connect(sound.out);
  // the drone: two soft voices a fifth apart, slowly breathing
  const pad = c.createGain(), padLp = c.createBiquadFilter();
  pad.gain.value = 0.018;
  padLp.type = 'lowpass';
  padLp.frequency.value = 420;
  const o1 = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain();
  o1.type = o2.type = 'triangle';
  o1.frequency.value = hz(50);
  o2.frequency.value = hz(57);
  o2.detune.value = 6;
  lfo.frequency.value = 0.08;
  lg.gain.value = 0.008;
  lfo.connect(lg).connect(pad.gain);
  o1.connect(padLp);
  o2.connect(padLp);
  padLp.connect(pad).connect(bus);
  o1.start(); o2.start(); lfo.start();
  sound.pad = { o1, o2 };
  sound.music = { bus, next: c.currentTime + 0.2, bar: 0, piece: 'adai', want: sound.wantMood || 'adai', playBars: 0 };
  const tick = () => {
    const m = sound.music;
    if (!sound.ctx) return;
    while (m.next < c.currentTime + 0.4) {
      // at the start of a bar: change the küi if the moment asks for another
      let want = m.want;
      if (want === 'play') want = ['adai', 'jorga', 'kerbez'][Math.floor(m.playBars / 16) % 3];
      if (want !== m.piece) {
        m.piece = want;
        m.bar = 0;
        const np = PIECES[want];
        sound.pad?.o1.frequency.setTargetAtTime(hz(np.drone[0] + 12), m.next, 0.8);
        sound.pad?.o2.frequency.setTargetAtTime(hz((np.drone[1] || np.drone[0] + 7) + 12), m.next, 0.8);
      }
      if (m.want === 'play') m.playBars++;
      const p = PIECES[m.piece];
      const eighth = 60 / p.bpm / 2;
      // the strum on the lower strings
      [...p.strum].forEach((ch, k) => {
        const t = m.next + k * eighth;
        if (ch === 'X') { pluck(hz(p.drone[0] + 12), t, p.vol * 0.42); if (p.drone[1]) pluck(hz(p.drone[1] + 12), t + 0.03, p.vol * 0.3); }
        else if (ch === 'x') pluck(hz((p.drone[1] || p.drone[0] + 7) + 12), t, p.vol * 0.25);
      });
      // the tune: this bar's motif, now and then an octave up on a repeat, a grace note before long notes
      const motif = p.m[p.form[m.bar % p.form.length]];
      const lift = m.bar % 16 >= 8 && p.form[m.bar % p.form.length] === 'A' ? 7 : 0;
      let at = m.next;
      for (const [d, len] of motif) {
        const note = degree(p, d + lift);
        if (Math.random() < (p.rest || 0)) { at += len * eighth; continue; } // a breath: the tune leaves room
        if (len >= 2 && Math.random() < 0.4) pluck(hz(degree(p, d + lift + 1)), Math.max(m.next, at - 0.07), p.vol * 0.35);
        pluck(hz(note), at + 0.004, p.vol);
        at += len * eighth;
      }
      m.next += 8 * eighth;
      m.bar++;
    }
  };
  setInterval(tick, 100);
}

// which küi the moment asks for: 'adai' (the title), 'dala', 'play' (adai, jorga and kerbez in turn), 'shabuyl', 'tun', 'kerbez'
export function musicMood(name) {
  sound.wantMood = name;
  if (sound.music) sound.music.want = name;
}

// how loud the dombra plays: louder on the title, quieter during play
export function musicLevel(v) {
  sound.wantMusic = v;
  if (!sound.ctx || !sound.music) return;
  sound.music.bus.gain.setTargetAtTime(v * MUSIC_GAIN, sound.ctx.currentTime, 0.6);
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
  distant() { [0, 0.5, 0.95, 1.35].forEach((t) => tone(60, 0.5, 'sine', 0.1, t, 0.6)); },
  clash() { noiseHit(0, 0.18, 3200, 6, 0.4, 'bandpass'); tone(1900, 0.25, 'square', 0.03, 0, 1.3); tone(2600, 0.2, 'triangle', 0.04, 0.02, 0.8); },
  fire() { noiseHit(0, 0.9, 500, 0.6, 0.3, 'lowpass'); noiseHit(0.1, 0.6, 1400, 1, 0.08); },
  night() { tone(220, 1.6, 'sine', 0.05, 0, 0.75); tone(330, 1.6, 'sine', 0.035, 0.3, 0.75); },
};
