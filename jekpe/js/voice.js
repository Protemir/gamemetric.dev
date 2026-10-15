import { store } from './util.js';

// The announcer: the browser's own speech synthesis. Kazakh voices are rare, so the Kazakh words
// are read with a Russian voice after swapping the letters a Russian voice can't say.

export const voice = { on: store.get('jekpe.voice', true) };

const KK = { 'ә': 'а', 'ғ': 'г', 'қ': 'к', 'ң': 'н', 'ө': 'о', 'ұ': 'у', 'ү': 'ю', 'һ': 'х', 'і': 'и' };
let chosen = null;

function pick() {
  if (chosen || typeof speechSynthesis === 'undefined') return chosen;
  const list = speechSynthesis.getVoices();
  chosen = list.find((v) => /^kk/i.test(v.lang)) || list.find((v) => /^ru/i.test(v.lang)) || null;
  return chosen;
}
if (typeof speechSynthesis !== 'undefined') speechSynthesis.addEventListener?.('voiceschanged', () => { chosen = null; pick(); });

export function say(text, opts = {}) {
  if (!voice.on || typeof speechSynthesis === 'undefined') return;
  const v = pick();
  if (!v) return;
  const kk = /^kk/i.test(v.lang);
  const line = kk ? text : text.toLowerCase().replace(/[әғқңөұүһі]/g, (ch) => KK[ch]);
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(line);
    u.voice = v;
    u.lang = v.lang;
    u.rate = opts.rate || 0.92;
    u.pitch = opts.pitch ?? 0.55;
    u.volume = 0.9;
    speechSynthesis.speak(u);
  } catch {
    /* some browsers refuse speech before a tap */
  }
}

export function setVoice(on) {
  voice.on = on;
  store.set('jekpe.voice', on);
  if (!on && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

export const hasVoice = () => typeof speechSynthesis !== 'undefined';
