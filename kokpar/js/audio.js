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

// ржание «иһаһаһа»: тон с формантами, резко вверх, потом вниз с дрожью и прерывистым «ха-ха-ха» в конце
export function neigh(x, z) {
  if (!ctx || muted) return;
  const { vol, pan } = place(x, z, 4);
  if (vol < 0.05) return;
  const t = ctx.currentTime, L = 1.5;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  const f = o.frequency;
  f.setValueAtTime(260, t); f.exponentialRampToValueAtTime(560, t + 0.14); f.exponentialRampToValueAtTime(430, t + 0.5); f.exponentialRampToValueAtTime(170, t + L); // ниже — без писка
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); // дрожь голоса
  lfo.frequency.setValueAtTime(14, t); lfo.frequency.linearRampToValueAtTime(19, t + L);
  lfoG.gain.setValueAtTime(8, t); lfoG.gain.linearRampToValueAtTime(45, t + L);
  lfo.connect(lfoG); lfoG.connect(f);
  const amp = ctx.createGain(); // огибающая + прерывистость к концу
  amp.gain.setValueAtTime(0.0001, t); amp.gain.exponentialRampToValueAtTime(vol * 0.32, t + 0.06);
  amp.gain.setValueAtTime(vol * 0.32, t + 0.5); amp.gain.exponentialRampToValueAtTime(0.001, t + L);
  const chop = ctx.createGain(), chopL = ctx.createOscillator(), chopG = ctx.createGain();
  chopL.frequency.value = 9; chopG.gain.setValueAtTime(0, t); chopG.gain.linearRampToValueAtTime(0, t + 0.55); chopG.gain.linearRampToValueAtTime(0.5, t + 0.9);
  chop.gain.value = 0.5; chopL.connect(chopG); chopG.connect(chop.gain);
  const mix = ctx.createGain(); mix.gain.value = 1;
  for (const [fr, q, g] of [[520, 3, 1], [1150, 4, 0.55], [2100, 5, 0.2]]) { // форманты конской глотки
    const bp = filter('bandpass', fr, q), bg = ctx.createGain(); bg.gain.value = g;
    o.connect(bp); bp.connect(bg); bg.connect(mix);
  }
  const s = ctx.createBufferSource(); s.buffer = noise; const nf = filter('bandpass', 900, 0.7), ng = ctx.createGain(); ng.gain.value = 0.6; // хрип дыхания
  s.connect(nf); nf.connect(ng); ng.connect(mix);
  mix.connect(chop); chop.connect(amp); amp.connect(out(1, pan));
  for (const n of [o, lfo, chopL, s]) { n.start(t); n.stop(t + L + 0.05); }
}
// щелчок қамшы
export function whip() {
  if (!ctx || muted) return;
  const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noise;
  const f = filter('highpass', 2200, 0.7), g = ctx.createGain();
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  s.connect(f); f.connect(g); g.connect(out(1, 0.2)); s.start(t, Math.random()); s.stop(t + 0.06);
}
// подхватил мешок — шорох мешковины
export function grabSound(x, z) {
  if (!ctx || muted) return;
  const { vol, pan } = place(x, z, 4);
  const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noise;
  const f = filter('bandpass', 1300, 0.9), g = ctx.createGain();
  g.gain.setValueAtTime(vol * 0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  s.connect(f); f.connect(g); g.connect(out(1, pan)); s.start(t, Math.random()); s.stop(t + 0.22);
}
// гол: гул толпы и дробь домбыры-барабана; свои — громче
export function cheer(ours) {
  if (!ctx || muted) return;
  const t = ctx.currentTime, L = 2.6;
  const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
  const f1 = filter('bandpass', 700, 0.6), f2 = filter('bandpass', 1500, 0.8), g = ctx.createGain();
  const top = ours ? 0.32 : 0.16;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(top, t + 0.35); g.gain.setValueAtTime(top, t + 1.2); g.gain.exponentialRampToValueAtTime(0.001, t + L);
  const trem = ctx.createOscillator(), tg = ctx.createGain(); trem.frequency.value = 6; tg.gain.value = top * 0.4; trem.connect(tg); tg.connect(g.gain);
  s.connect(f1); f1.connect(f2); f2.connect(g); g.connect(out(1, 0));
  s.start(t); s.stop(t + L); trem.start(t); trem.stop(t + L);
  for (let i = 0; i < 6; i++) { // барабан
    const o = ctx.createOscillator(), og = ctx.createGain(), tt = t + 0.1 + i * 0.16;
    o.frequency.setValueAtTime(140, tt); o.frequency.exponentialRampToValueAtTime(60, tt + 0.12);
    og.gain.setValueAtTime(0.4, tt); og.gain.exponentialRampToValueAtTime(0.001, tt + 0.15);
    o.connect(og); og.connect(out(1, 0)); o.start(tt); o.stop(tt + 0.17);
  }
}
