// Звук пробы — всё синтезом (Web Audio), без файлов: топот, фырканье, ветер, река, толчок.
// Включается с первого касания или клавиши (так требуют браузеры и CrazyGames), M — выкл/вкл.
let crowdBus = null, bedG = null, roarG = null, roarOsc = [];
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

let unlockEl = null;
function unlockIOS() { // тихая дорожка через <audio> переводит iPhone в «медиа», Web Audio перестаёт молчать
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    if (!unlockEl) {
      unlockEl = new Audio('data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='); // 0,1 с тишины, без зацикливания
      unlockEl.volume = 0.01; unlockEl.setAttribute('playsinline', '');
    }
    if (unlockEl.paused) unlockEl.play().catch(() => {});
  } catch { /* не iPhone */ }
}
export function initAudio() {
  unlockIOS();
  if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = muted || portalMuted ? 0 : vol.master; master.connect(ctx.destination);
  noise = makeNoise(ctx);
  initCrowd();
  windG = ctx.createGain(); windG.gain.value = 0.05; loop([filter('lowpass', 420)], windG); // ровный степной ветер
  windHi = ctx.createGain(); windHi.gain.value = 0; loop([filter('bandpass', 900, 0.5)], windHi); // свист в ушах на скорости
  riverG = ctx.createGain(); riverG.gain.value = 0; loop([filter('bandpass', 1400, 0.4), filter('lowpass', 3200)], riverG); // журчание
  // запись настоящего ржания (BigSoundBank, CC0)
  fetch('sounds/horse-neigh.mp3').then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((buf) => { neighBuf = buf; }).catch(() => {});
}
let neighBuf = null;
export const isMuted = () => muted;
const vol = { master: 0.9, crowd: 0.8 };
try { Object.assign(vol, JSON.parse(localStorage.getItem('kokpar.vol') || '{}')); } catch { /* приватный режим */ }
export const getVolume = (k) => vol[k];
export function setVolume(k, v) {
  vol[k] = Math.max(0, Math.min(1, v));
  try { localStorage.setItem('kokpar.vol', JSON.stringify(vol)); } catch { /* приватный режим */ }
  if (ctx) { master.gain.setTargetAtTime(muted || portalMuted ? 0 : vol.master, ctx.currentTime, 0.05); crowdBus.gain.setTargetAtTime(vol.crowd, ctx.currentTime, 0.05); }
}
try { muted = localStorage.getItem('kokpar.mute') === '1'; } catch { /* приватный режим */ }
let portalMuted = false;
export function setPortalMute(m) { // кнопка звука портала: глушит поверх наших настроек
  portalMuted = m;
  if (master) master.gain.setTargetAtTime(muted || portalMuted ? 0 : vol.master, ctx.currentTime, 0.05);
}
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('kokpar.mute', muted ? '1' : '0'); } catch { /* приватный режим */ }
  if (master) master.gain.setTargetAtTime(muted || portalMuted ? 0 : vol.master, ctx.currentTime, 0.05);
  return muted;
}
document.addEventListener('visibilitychange', () => { if (ctx) document.hidden ? ctx.suspend() : ctx.resume().catch(() => {}); });
// звук оживает от любого касания или клика (iPhone требует жест; после блокировки экрана — снова)
for (const ev of ['touchend', 'click', 'keydown']) addEventListener(ev, () => { if (!ctx || ctx.state !== 'running') initAudio(); }, { capture: true, passive: true });

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

// полёт с коня: свисток вниз «фью-у-у» с дрожью, как в мультике; потом шлепок о землю — bump
export function tumble(x, z, long = 0.7) {
  if (!ctx || muted) return;
  const { vol, pan } = place(x, z, 6);
  if (vol < 0.1) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(1150, t); o.frequency.exponentialRampToValueAtTime(240, t + long);
  lfo.frequency.value = 9; lg.gain.value = 28; lfo.connect(lg); lg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * 0.13, t + 0.05); g.gain.setValueAtTime(vol * 0.13, t + long * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + long);
  o.connect(g); g.connect(out(1, pan)); o.start(t); lfo.start(t); o.stop(t + long + 0.02); lfo.stop(t + long + 0.02);
}

// лук: щелчок тетивы и свист стрелы
export function twang() {
  if (!ctx || muted) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.18);
  g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.connect(g); g.connect(out(1, 0)); o.start(t); o.stop(t + 0.22);
  const s = ctx.createBufferSource(); s.buffer = noise;
  const f = filter('bandpass', 2600, 1.5), sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.12, t + 0.05); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  s.connect(f); f.connect(sg); sg.connect(out(1, 0)); s.start(t, Math.random()); s.stop(t + 0.32);
}
// стрела попала в серебро: звон
export function clink(x, z) {
  if (!ctx || muted) return;
  const { vol, pan } = place(x, z, 10);
  const t = ctx.currentTime;
  for (const [f, k] of [[1870, 1], [2810, 0.6], [4100, 0.35]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = f; g.gain.setValueAtTime(Math.max(0.05, vol) * 0.16 * k, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g); g.connect(out(1, pan)); o.start(t); o.stop(t + 0.72);
  }
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
  if (neighBuf) { // живая лошадь; у каждого коня чуть свой голос
    const s = ctx.createBufferSource(); s.buffer = neighBuf; s.playbackRate.value = 0.9 + Math.random() * 0.18;
    const g = ctx.createGain(); g.gain.value = Math.min(1, vol * 0.9);
    s.connect(g); g.connect(out(1, pan)); s.start();
    return;
  }
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
export function cheer(ours) { // гол: толпа кричит «уа-а!», бьёт дауылпаз, своим — ещё и карнай
  if (!ctx || muted) return;
  const t = ctx.currentTime, L = 3.2, top = ours ? 0.3 : 0.15, o = out(1, 0);
  // шум толпы
  const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
  const f1 = filter('bandpass', 650, 0.6), f2 = filter('bandpass', 1400, 0.7), g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(top * 0.7, t + 0.3); g.gain.setValueAtTime(top * 0.7, t + 1.4); g.gain.exponentialRampToValueAtTime(0.001, t + L);
  s.connect(f1); f1.connect(f2); f2.connect(g); g.connect(o); s.start(t); s.stop(t + L);
  // голоса: «а-а-а!» — пила через форманты гласной «а», каждый со своей высотой и вступлением
  const fa = filter('bandpass', 800, 3), fb = filter('bandpass', 1250, 4), vg = ctx.createGain();
  vg.gain.value = top * 0.5; fa.connect(vg); fb.connect(vg); vg.connect(o);
  for (let i = 0; i < 12; i++) {
    const v = ctx.createOscillator(), ag = ctx.createGain(), st = t + Math.random() * 0.3, f0 = 170 + Math.random() * 170, len = 1.2 + Math.random() * 1.4;
    v.type = 'sawtooth';
    v.frequency.setValueAtTime(f0 * 0.9, st); v.frequency.linearRampToValueAtTime(f0 * 1.12, st + 0.25); v.frequency.linearRampToValueAtTime(f0 * 0.95, st + len);
    const vib = ctx.createOscillator(), vibG = ctx.createGain(); vib.frequency.value = 5 + Math.random() * 2; vibG.gain.value = f0 * 0.02; vib.connect(vibG); vibG.connect(v.frequency);
    ag.gain.setValueAtTime(0.0001, st); ag.gain.exponentialRampToValueAtTime(0.09, st + 0.12); ag.gain.exponentialRampToValueAtTime(0.0001, st + len);
    v.connect(ag); ag.connect(fa); ag.connect(fb);
    v.start(st); v.stop(st + len + 0.05); vib.start(st); vib.stop(st + len + 0.05);
  }
  // дауылпаз: дробь с ускорением и удар в конце
  for (let i = 0; i < 9; i++) {
    const d = ctx.createOscillator(), dg = ctx.createGain(), tt = t + 0.05 + i * 0.13 - i * i * 0.004, last = i === 8;
    d.frequency.setValueAtTime(last ? 120 : 150, tt); d.frequency.exponentialRampToValueAtTime(55, tt + (last ? 0.35 : 0.12));
    dg.gain.setValueAtTime(last ? 0.6 : 0.35, tt); dg.gain.exponentialRampToValueAtTime(0.001, tt + (last ? 0.4 : 0.14));
    d.connect(dg); dg.connect(o); d.start(tt); d.stop(tt + 0.45);
  }
  if (!ours) return;
  // карнай: короткий победный клич — ре, ля, ре
  const notes = [[293.7, 0.0, 0.16], [440, 0.18, 0.16], [587.3, 0.36, 0.7]];
  const lp = filter('lowpass', 2400, 1), hg = ctx.createGain(); hg.gain.value = 0.16; lp.connect(hg); hg.connect(o);
  for (const [fr, at, len] of notes) {
    const h = ctx.createOscillator(), h2 = ctx.createOscillator(), ng = ctx.createGain(), st = t + 0.15 + at;
    h.type = 'sawtooth'; h2.type = 'square'; h.frequency.value = fr; h2.frequency.value = fr * 1.003;
    ng.gain.setValueAtTime(0.0001, st); ng.gain.exponentialRampToValueAtTime(0.5, st + 0.03); ng.gain.setValueAtTime(0.45, st + len * 0.7); ng.gain.exponentialRampToValueAtTime(0.0001, st + len);
    h.connect(ng); h2.connect(ng); ng.connect(lp);
    h.start(st); h.stop(st + len + 0.05); h2.start(st); h2.stop(st + len + 0.05);
  }
}

// ---------- толпа ----------
// Тихий гул всё время; когда несущий подъезжает к казану — нарастает «у-у-у-а-а» (тембр и высота растут).
function initCrowd() {
  crowdBus = ctx.createGain(); crowdBus.gain.value = vol.crowd; crowdBus.connect(master);
  bedG = ctx.createGain(); bedG.gain.value = 0;
  loop([filter('bandpass', 620, 0.7), filter('lowpass', 1800)], bedG); // гомон: шум в полосе голоса
  bedG.disconnect(); bedG.connect(crowdBus);
  roarG = ctx.createGain(); roarG.gain.value = 0;
  const fa = filter('bandpass', 720, 3), fb = filter('bandpass', 1150, 4);
  fa.connect(roarG); fb.connect(roarG); roarG.connect(crowdBus);
  for (let i = 0; i < 10; i++) { // голоса: пила через форманты «у/а», каждый со своей высотой и дрожью
    const o = ctx.createOscillator(), og = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 150 + Math.random() * 160;
    vib.frequency.value = 4 + Math.random() * 3; vg.gain.value = o.frequency.value * 0.025;
    vib.connect(vg); vg.connect(o.frequency);
    og.gain.value = 0.05; o.connect(og); og.connect(fa); og.connect(fb);
    o.start(); vib.start();
    roarOsc.push({ o, f0: o.frequency.value });
  }
}
let lastTension = 0;
export function crowdTension(t, active) { // t 0..1: насколько близко к голу; active — идёт матч
  if (!ctx || !crowdBus) return;
  const now = ctx.currentTime;
  bedG.gain.setTargetAtTime(active ? 0.035 + t * 0.09 : 0, now, 0.8);
  roarG.gain.setTargetAtTime(active ? Math.pow(t, 1.6) * 0.5 : 0, now, t > lastTension ? 0.5 : 1.2);
  for (const v of roarOsc) v.o.frequency.setTargetAtTime(v.f0 * (1 + t * 0.18), now, 0.6); // ближе к казану — выше и громче
  lastTension = t;
}
// короткие возгласы: «у-ух!» (падение, промах) и «а-а!» (вырвал серке)
export function crowdShout(kind = 'ooh') {
  if (!ctx || muted || !crowdBus) return;
  const t = ctx.currentTime, L = kind === 'ooh' ? 1.1 : 0.9;
  const fa = filter('bandpass', kind === 'ooh' ? 480 : 820, 3), fb = filter('bandpass', kind === 'ooh' ? 900 : 1250, 4), gg = ctx.createGain();
  gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.5, t + 0.12); gg.gain.exponentialRampToValueAtTime(0.0001, t + L);
  fa.connect(gg); fb.connect(gg); gg.connect(crowdBus);
  for (let i = 0; i < 8; i++) {
    const o = ctx.createOscillator(), og = ctx.createGain(), st = t + Math.random() * 0.12, f0 = 170 + Math.random() * 150;
    o.type = 'sawtooth';
    // «у-ух» — вверх и вниз; «а-а» — вверх и держит
    o.frequency.setValueAtTime(f0, st); o.frequency.linearRampToValueAtTime(f0 * 1.25, st + 0.18);
    o.frequency.linearRampToValueAtTime(kind === 'ooh' ? f0 * 0.85 : f0 * 1.2, st + L);
    og.gain.value = 0.07; o.connect(og); og.connect(fa); og.connect(fb);
    o.start(st); o.stop(st + L + 0.05);
  }
}
