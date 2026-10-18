// Звук пробы — всё синтезом (Web Audio), без файлов: топот, фырканье, ветер, река, толчок.
// Включается с первого касания или клавиши (так требуют браузеры и CrazyGames), M — выкл/вкл.
let ctx = null, master = null, noise = null, windG = null, windHi = null, riverG = null, muted = false;
const listener = { x: 0, z: 0, yaw: 0 };
export const stats = { hooves: 0, get state() { return ctx ? ctx.state : 'нет'; } }; // для проверки

function makeNoise(c) {
  const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function loop(filters, gain) {
  const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
  let node = s;
  for (const f of filters) { node.connect(f); node = f; }
  node.connect(gain); gain.connect(master);
  s.start();
}
function filter(type, freq, q = 0.7) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; }

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
  noise = makeNoise(ctx);
  windG = ctx.createGain(); windG.gain.value = 0.05; loop([filter('lowpass', 420)], windG); // ровный степной ветер
  windHi = ctx.createGain(); windHi.gain.value = 0; loop([filter('bandpass', 900, 0.5)], windHi); // свист в ушах на скорости
  riverG = ctx.createGain(); riverG.gain.value = 0; loop([filter('bandpass', 1400, 0.4), filter('lowpass', 3200)], riverG); // журчание
}
export function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
  return muted;
}
document.addEventListener('visibilitychange', () => { if (ctx) document.hidden ? ctx.suspend() : ctx.resume(); });

// слушатель — камера: громкость по расстоянию, панорама по стороне
export function setListener(x, z, yaw) { listener.x = x; listener.z = z; listener.yaw = yaw; }
function place(x, z, near = 4) {
  const dx = x - listener.x, dz = z - listener.z, d = Math.hypot(dx, dz);
  const vol = 1 / (1 + Math.max(0, d - near) / 5);
  const side = (Math.cos(listener.yaw) * dx - Math.sin(listener.yaw) * dz) / (d + 1); // + справа
  return { vol, pan: Math.max(-1, Math.min(1, -side)) };
}
function out(vol, pan) {
  const g = ctx.createGain(); g.gain.value = vol;
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(master); } else g.connect(master);
  return g;
}

// удар копыта: низкий «тук» + короткий хруст земли
export function hoof(x, z, speed) {
  if (!ctx || muted) return;
  const { vol, pan } = place(x, z);
  if (vol < 0.06) return;
  stats.hooves++;
  const t = ctx.currentTime, loud = vol * Math.min(1, 0.35 + speed * 0.07);
  const o = ctx.createOscillator(), og = ctx.createGain();
  o.frequency.setValueAtTime(95 + Math.random() * 25, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  og.gain.setValueAtTime(loud * 0.9, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(og); og.connect(out(1, pan)); o.start(t); o.stop(t + 0.18);
  const s = ctx.createBufferSource(); s.buffer = noise; s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = filter('bandpass', 650 + Math.random() * 300, 0.9), sg = ctx.createGain();
  sg.gain.setValueAtTime(loud * 0.5, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  s.connect(f); f.connect(sg); sg.connect(out(1, pan)); s.start(t, Math.random()); s.stop(t + 0.08);
}

// фырканье на выдохе (у лошади на галопе дыхание идёт в такт шагу)
export function snort(x, z, strength = 1) {
  if (!ctx || muted) return;
  const { vol, pan } = place(x, z, 3);
  if (vol < 0.08) return;
  const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noise;
  const f1 = filter('bandpass', 420 + Math.random() * 120, 1.2), f2 = filter('lowpass', 1800), g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * 0.35 * strength, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  s.connect(f1); f1.connect(f2); f2.connect(g); g.connect(out(1, pan)); s.start(t, Math.random()); s.stop(t + 0.25);
}

// толчок конь о коня: глухой удар корпусом
export function bump(x, z, imp) {
  if (!ctx || muted) return;
  const { vol, pan } = place(x, z, 3);
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.2);
  g.gain.setValueAtTime(Math.min(1, vol * imp * 0.18), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o.connect(g); g.connect(out(1, pan)); o.start(t); o.stop(t + 0.27);
  snort(x, z, 1.4);
}

// каждый кадр: ветер от скорости, река от расстояния до воды
export function ambience(speed, riverDistance) {
  if (!ctx) return;
  const t = ctx.currentTime;
  windG.gain.setTargetAtTime(0.045 + Math.min(speed, 12) * 0.006, t, 0.3);
  windHi.gain.setTargetAtTime(Math.max(0, speed - 4) * 0.01, t, 0.3);
  riverG.gain.setTargetAtTime(0.16 * Math.max(0, 1 - Math.max(0, riverDistance - 6) / 70), t, 0.4);
}
