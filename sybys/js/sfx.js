// Grey-prototype sounds: a few synthesized blips so actions are felt. Real sound comes with the art.
import { store } from './util.js';

export const sound = { on: store.get('sybys.sound', true), ctx: null };

export function audioInit() {
  try {
    if (!sound.ctx) sound.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (sound.ctx.state !== 'running') sound.ctx.resume().catch(() => {});
  } catch {
    /* no audio */
  }
}

export function setSound(on) {
  sound.on = on;
  store.set('sybys.sound', on);
}

function tone(freq, dur, type = 'triangle', vol = 0.12, when = 0, slide = 0) {
  const c = sound.ctx;
  if (!sound.on || !c || c.state !== 'running') return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), gn = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  send() { tone(520, 0.08, 'square', 0.05); tone(780, 0.1, 'triangle', 0.07, 0.05); },
  word() { tone(660, 0.18, 'sine', 0.08); tone(990, 0.22, 'sine', 0.06, 0.06); },
  lie() { tone(180, 0.3, 'sawtooth', 0.04, 0, 0.7); },
  force() { tone(110, 0.25, 'square', 0.08, 0, 0.6); tone(90, 0.3, 'sawtooth', 0.05, 0.05); },
  caught() { tone(880, 0.08, 'square', 0.06); tone(1320, 0.16, 'triangle', 0.08, 0.07); },
  bad() { tone(240, 0.22, 'triangle', 0.08, 0, 0.8); },
  clue() { tone(740, 0.12, 'sine', 0.08); tone(988, 0.12, 'sine', 0.08, 0.1); tone(1480, 0.25, 'sine', 0.06, 0.2); },
  whip(yes) { tone(yes ? 600 : 200, 0.12, 'square', 0.06, 0, yes ? 1.5 : 0.6); },
  no() { tone(150, 0.12, 'square', 0.05); },
};
