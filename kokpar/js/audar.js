// Аударыспақ — схватка бок о бок: два всадника скачут рядом, держат друг друга за плечи и тянут.
// Своя маленькая физика (без движка): корпус каждого — перевёрнутый маятник на пружине в бёдрах,
// руки — «верёвка» между плечами. θ — наклон корпуса К СОПЕРНИКУ (рад), θ < 0 — откинулся назад.
// Рывок (одна кнопка) откидывает тебя назад — верёвка тянет соперника к тебе. Перетянул за край — он слетел;
// дёргал без меры и откинулся слишком далеко — слетаешь сам, назад. Чистые функции: те же числа в игре и в тестах.
export const AU = {
  D: 1.7, L: 0.8, R0: 1.65, // между сёдлами, длина корпуса, длина «верёвки» рук, м
  G: 8.5, K: 20, C: 2.5, // опрокидывание, пружина бёдер, вязкость
  KR: 160, CR: 6, // жёсткость и вязкость рук
  YANK: 44, YT: 0.17, CD: 0.24, // сила рывка, длительность, перезарядка, с
  TIRE: 0.2, REST: 0.3, // каждый рывок отнимает силу, отдых возвращает (в секунду)
  OFF: 1.0, BACK: -1.25, // слетел к сопернику / сам опрокинулся назад, рад
  SLIP: 0.35, REGRIP: 0.7, // руки срываются при таком растяжении; снова схватились через, с
  SWAY: 1.6, // толчки галопа
  FLOOR: 0.15, // выдохся — рывок почти пустой
  RAMP: 1.6, // с каждой секундой схватки кони расходятся и трясёт сильнее: ничья не тянется вечно
  DRAIN: 0.5, // натянутые руки отнимают силы (в секунду на метр растяжения)
};
export function newBout(rnd = Math.random) {
  const side = () => ({ th: (rnd() - 0.5) * 0.1, w: 0, yank: 0, cd: 0, pow: 1, taps: 0 });
  return { a: side(), b: side(), t: 0, grip: true, regrip: 0, ph: rnd() * 6.28, over: null, why: '' };
}
export function tap(S, who) { // нажатие: рывок, если перезарядился
  const s = who === 'a' ? S.a : S.b;
  if (S.over || s.cd > 0 || !S.grip) return false; // руки сорвались — дёргать не за что
  s.yank = AU.YT; s.cd = AU.CD; s.taps++;
  s.force = AU.YANK * (AU.FLOOR + (1 - AU.FLOOR) * s.pow); s.pow = Math.max(0, s.pow - AU.TIRE);
  return true;
}
// плечи в плоскости поперёк скачки: a слева (x<0), b справа; +x у a и −x у b — к сопернику
function shoulders(S) {
  const { D, L } = AU;
  return [-D / 2 + L * Math.sin(S.a.th), L * Math.cos(S.a.th), D / 2 - L * Math.sin(S.b.th), L * Math.cos(S.b.th)];
}
export function step(S, dt) {
  if (S.over) return;
  S.t += dt;
  const [ax, ay, bx, by] = shoulders(S);
  let fx = 0, fy = 0, stretch = 0;
  if (S.grip) {
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1e-6;
    stretch = d - AU.R0;
    if (stretch > AU.SLIP) { S.grip = false; S.regrip = AU.REGRIP; S.slips = (S.slips || 0) + 1; }
    else if (stretch > 0) {
      // скорость растяжения — через угловые скорости
      const vax = AU.L * Math.cos(S.a.th) * S.a.w, vay = -AU.L * Math.sin(S.a.th) * S.a.w;
      const vbx = -AU.L * Math.cos(S.b.th) * S.b.w, vby = -AU.L * Math.sin(S.b.th) * S.b.w;
      const rate = ((vbx - vax) * dx + (vby - vay) * dy) / d;
      const f = Math.max(0, AU.KR * stretch + AU.CR * rate);
      fx = (f * dx) / d; fy = (f * dy) / d; // сила на плечо a (к b); на b — обратная
    }
  } else if ((S.regrip -= dt) <= 0) S.grip = true;
  S.stretch = stretch;
  const sway = (k) => AU.SWAY * Math.sin(S.t * 11 + S.ph + k);
  for (const [s, gx, gy, k] of [[S.a, fx, fy, 0], [S.b, -fx, -fy, 2.1]]) {
    // обобщённая сила верёвки по θ: f · d(плечо)/dθ; у b ось x зеркальная
    const dxd = AU.L * Math.cos(s.th), dyd = -AU.L * Math.sin(s.th);
    const q = s === S.a ? gx * dxd + gy * dyd : -gx * dxd + gy * dyd;
    // уставший держится хуже: бёдра мягче; тянут — силы уходят
    s.pow = Math.max(0, s.pow - Math.max(0, S.stretch) * AU.DRAIN * dt);
    let acc = (AU.G + AU.RAMP * S.t) * Math.sin(s.th) - AU.K * (0.5 + 0.5 * s.pow) * s.th - AU.C * s.w + q + sway(k);
    if (s.yank > 0) { acc -= s.force; s.yank -= dt; }
    s.w += acc * dt; s.th += s.w * dt;
    s.cd = Math.max(0, s.cd - dt); s.pow = Math.min(1, s.pow + AU.REST * dt);
  }
  for (const [s, me, foe] of [[S.a, 'a', 'b'], [S.b, 'b', 'a']]) {
    if (s.th > AU.OFF) { S.over = { loser: me, winner: foe }; S.why = 'pulled'; }
    else if (s.th < (S.grip ? AU.BACK - 0.45 : AU.BACK)) { S.over = { loser: me, winner: foe }; S.why = 'back'; } // пока руки держат, назад не опрокинешься; сорвались — легко
    if (S.over) break;
  }
}
// бот: дёргает, когда соперник откидывается назад или его самого тянет; skill 0..1 — насколько вовремя, rate — как часто
export function botWants(S, who, skill = 0.7, rnd = Math.random) {
  const me = who === 'a' ? S.a : S.b, foe = who === 'a' ? S.b : S.a;
  if (me.cd > 0 || !S.grip) return false;
  const good = foe.w < -0.2 || me.th > 0.35 || (foe.th < 0 && me.th > -0.2);
  const tooFar = me.th < -0.55; // сам уже далеко откинулся — рывок опасен
  return rnd() < (good && !(tooFar && rnd() < skill) ? 0.08 + 0.25 * skill : 0.03 * (1 - skill));
}
