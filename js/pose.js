// Skeleton and poses. A pose is a set of joint angles for a fighter facing right.
// Angles of limbs are measured from "straight down", positive = rotating forward.
// lean: torso tilt forward, head: extra head tilt, aN/aF: near and far arm [shoulder, elbow],
// lN/lF: near and far leg [hip, knee], rot: whole body pitch forward, pin: hip height in the air.

const BASE = { lean: 0.12, head: -0.1, aN: [0.45, 2.15], aF: [0.85, 1.95], lN: [0.38, -0.42], lF: [-0.28, -0.08], rot: 0, pin: null };

const P = (o) => ({ ...BASE, ...o });

export const POSES = {
  stance: P({}),
  crouch: P({ lean: 0.62, head: -0.42, aN: [0.75, 1.95], aF: [1.05, 1.8], lN: [1.45, -2.25], lF: [0.6, -2.05] }),
  prejump: P({ lean: 0.4, head: -0.3, lN: [1.0, -1.6], lF: [0.3, -1.4] }),
  tuck: P({ lean: 0.15, aN: [0.9, 1.6], aF: [1.3, 1.4], lN: [1.35, -2.1], lF: [0.75, -1.8] }),
  land: P({ lean: 0.35, head: -0.25, lN: [0.9, -1.4], lF: [0.25, -1.2] }),

  jabWind: P({ lean: 0.18, aF: [1.1, 1.7] }),
  jab: P({ lean: 0.28, head: -0.15, aF: [1.85, 0.05], aN: [0.5, 2.2] }),
  kickWind: P({ lean: -0.05, aN: [0.6, 2.2], aF: [0.4, 2.0], lN: [1.5, -2.1], lF: [-0.15, -0.05] }),
  kick: P({ lean: -0.3, head: 0.1, aN: [0.9, 1.8], aF: [0.2, 1.4], lN: [1.75, -0.1], lF: [-0.2, 0] }),
  upperWind: P({ lean: 0.55, head: -0.35, aF: [0.2, 0.6], aN: [0.8, 2.0], lN: [1.3, -2.0], lF: [0.5, -1.9] }),
  upper: P({ lean: -0.12, head: -0.3, aF: [2.55, 0.15], aN: [0.4, 2.2], lN: [0.3, -0.2], lF: [-0.2, -0.1] }),
  sweepWind: P({ lean: 0.62, head: -0.42, aN: [0.9, 0.6], aF: [0.6, 1.4], lN: [1.2, -1.9], lF: [0.62, -2.1] }),
  sweep: P({ lean: 0.55, head: -0.35, aN: [1.0, 0.2], aF: [0.4, 1.6], lN: [1.42, -0.02], lF: [0.65, -2.15] }),
  airP: P({ lean: 0.25, aF: [1.3, 0.0], aN: [0.9, 1.6], lN: [1.3, -2.0], lF: [0.7, -1.7] }),
  airK: P({ lean: -0.25, head: 0.05, lN: [1.25, -0.05], lF: [0.5, -1.9], aN: [1.0, 1.6], aF: [1.6, 1.2] }),

  block: P({ lean: -0.02, head: -0.15, aN: [1.5, 1.3], aF: [0.8, 2.1] }),
  crouchBlock: P({ lean: 0.5, head: -0.35, aN: [1.35, 1.45], aF: [1.0, 1.8], lN: [1.45, -2.25], lF: [0.6, -2.05] }),
  hit: P({ lean: -0.35, head: -0.45, aN: [-0.3, 0.7], aF: [0.1, 0.8], lN: [0.3, -0.3], lF: [-0.35, -0.2] }),
  crouchHit: P({ lean: 0.25, head: -0.7, aN: [0.2, 1.0], aF: [0.4, 1.0], lN: [1.45, -2.25], lF: [0.6, -2.05] }),
  fall: P({ lean: -0.2, head: -0.3, aN: [2.6, 0.4], aF: [2.2, 0.6], lN: [0.9, -0.6], lF: [0.4, -1.0], pin: 70 }),
  down: P({ lean: 0, head: 0.35, aN: [2.3, 0.3], aF: [2.8, 0.3], lN: [0.6, -0.9], lF: [0.25, -0.3], rot: -1.5 }),
  dizzy: P({ lean: 0.05, head: 0.2, aN: [0.2, 0.3], aF: [0.1, 0.4], lN: [0.2, -0.1], lF: [-0.2, -0.1] }),
  win: P({ lean: -0.05, head: -0.25, aF: [2.9, 0.2], aN: [0.6, 2.1] }),
  lose: P({ lean: 0.55, head: 0.45, aN: [0.3, 0.2], aF: [0.2, 0.2], lN: [0.5, -0.5], lF: [-0.1, -0.4] }),

  grab: P({ lean: 0.2, aN: [1.4, 0.5], aF: [1.5, 0.4] }),
  lift: P({ lean: -0.1, head: -0.3, aN: [2.9, 0.2], aF: [3.0, 0.2] }),
  toss: P({ lean: 0.35, aN: [2.0, 0.0], aF: [1.8, 0.0] }),
  thrown: P({ lean: 0, head: -0.4, aN: [2.4, 0.5], aF: [2.1, 0.7], lN: [0.7, -0.5], lF: [0.3, -0.9], pin: 70 }),
  earPulled: P({ lean: 0.55, head: 0.35, aN: [1.6, 0.4], aF: [1.3, 0.6], lN: [0.5, -0.3], lF: [-0.1, -0.2] }),

  lassoWind: P({ lean: -0.05, aF: [2.9, 0.6] }),
  lassoThrow: P({ lean: 0.22, aF: [1.75, 0.05] }),
  lassoHold: P({ lean: 0.12, aF: [1.6, 0.0] }),
  lassoPull: P({ lean: -0.25, head: -0.1, aF: [0.9, 1.6], lN: [0.6, -0.3], lF: [-0.4, -0.1] }),
  throwWind: P({ lean: -0.12, aF: [-0.7, 1.3] }),
  throwOut: P({ lean: 0.25, aF: [2.0, 0.1] }),

  whistle: P({ lean: -0.05, head: -0.25, aF: [1.0, 2.5] }),
  clap: P({ lean: 0.05, aN: [1.4, 1.0], aF: [1.4, 1.0] }),
  carried: P({ lean: 0, head: -0.35, aN: [3.0, 0.1], aF: [2.9, 0.2], lN: [0.15, 0], lF: [-0.1, 0], pin: 150 }),

  blind: P({ lean: 0.08, head: -0.1, aN: [1.55, 0.15], aF: [1.45, 0.25] }),
  yawn: P({ lean: -0.15, head: -0.5, aN: [2.9, 0.4], aF: [2.8, 0.5] }),
  sleep: P({ lean: 0.3, head: 0.5, aN: [1.6, 1.8], aF: [1.4, 2.0], lN: [1.2, -1.6], lF: [0.9, -1.4], rot: -1.5 }),
  taunt: P({ lean: -0.1, head: -0.2, aF: [1.6, 1.2], aN: [0.6, 2.1] }),
  blush: P({ lean: 0.2, head: 0.35, aN: [1.2, 2.4], aF: [1.1, 2.5], lN: [0.25, -0.15], lF: [-0.2, -0.1] }),
  sneezeIn: P({ lean: -0.3, head: -0.55, aN: [0.3, 0.5], aF: [0.2, 0.6] }),
  sneezeOut: P({ lean: 0.45, head: 0.25, aN: [1.2, 0.4], aF: [1.0, 0.5] }),
  stompWind: P({ lean: -0.1, head: -0.2, aN: [1.2, 1.2], aF: [1.4, 1.0], lN: [1.7, -1.6], lF: [-0.1, -0.05] }),
  stomp: P({ lean: 0.25, head: -0.3, aN: [0.9, 0.8], aF: [1.0, 0.7], lN: [0.45, -0.1], lF: [-0.25, -0.1] }),
  dash: P({ lean: 0.55, head: -0.2, aN: [1.35, 0.3], aF: [1.45, 0.3], lN: [0.9, -0.9], lF: [-0.5, -0.4] }),
  eagleLaunch: P({ lean: -0.05, head: -0.25, aN: [2.5, 0.1] }),
  wave: P({ lean: -0.05, head: -0.15, aF: [2.7, 0.4] }),
  keys: P({ lean: -0.05, head: -0.2, aF: [1.9, 1.6] }),
  charge: P({ lean: 0.45, head: -0.1, aN: [1.65, 1.1], aF: [0.9, 1.9], lN: [0.75, -0.5], lF: [-0.55, -0.2] }),
  ram: P({ lean: 1.05, head: 0.35, aN: [-0.3, 0.4], aF: [-0.2, 0.5], lN: [0.8, -0.8], lF: [-0.55, -0.3] }),
  play: P({ lean: 0.04, head: 0.15, aN: [0.5, 1.3], aF: [1.2, 0.5] }),
};

// Apa holds the ladle in the near hand, so her ladle moves use that arm.
const APA = {
  stance: P({ lean: 0.1, aN: [0.75, 1.6], aF: [0.6, 2.1] }),
  jabWind: P({ lean: -0.05, head: -0.2, aN: [2.9, 0.5] }),
  jab: P({ lean: 0.3, head: -0.1, aN: [1.7, 0.1], aF: [0.5, 2.1] }),
  upperWind: P({ lean: 0.5, head: -0.3, aN: [0.1, 0.3], aF: [0.2, 0.4], lN: [1.2, -1.9], lF: [0.45, -1.8] }),
  upper: P({ lean: -0.15, head: -0.35, aN: [2.6, 0.1], aF: [2.5, 0.2], lN: [0.3, -0.2], lF: [-0.2, -0.1] }),
  sweepWind: P({ lean: 0.5, head: -0.3, aN: [2.0, 0.3], lN: [1.3, -2.1], lF: [0.6, -2.0] }),
  sweep: P({ lean: 0.75, head: -0.5, aN: [1.35, 0.05], aF: [0.6, 1.4], lN: [1.4, -2.2], lF: [0.6, -2.0] }),
  airP: P({ lean: 0.2, aN: [1.2, 0.1], aF: [1.0, 1.6], lN: [1.3, -2.0], lF: [0.7, -1.7] }),
  block: P({ lean: -0.05, head: -0.2, aN: [1.55, 1.45], aF: [1.25, 1.7] }),
  crouchBlock: P({ lean: 0.5, head: -0.35, aN: [1.4, 1.5], aF: [1.2, 1.7], lN: [1.45, -2.25], lF: [0.6, -2.05] }),
  win: P({ lean: 0.02, head: -0.1, aF: [1.9, 1.15], aN: [0.75, 1.6] }),
  grab: P({ lean: 0.2, aN: [1.75, 0.6], aF: [0.6, 2.0] }),
  lift: P({ lean: 0.3, aN: [1.3, 0.9], aF: [0.6, 2.0] }),
  toss: P({ lean: 0.3, aN: [2.3, 0.1], aF: [0.6, 2.0] }),
};

// Burkitshi holds the eagle on his gloved near hand
const BURKIT = {
  stance: P({ aN: [1.1, 1.5] }),
  crouch: P({ ...POSES.crouch, aN: [1.2, 1.4] }),
  tuck: P({ ...POSES.tuck, aN: [1.3, 1.3] }),
  win: P({ lean: -0.05, head: -0.25, aN: [2.6, 0.3], aF: [0.6, 2.0] }),
};

// the dombra: strumming hand near the hip, the other hand on the neck
const DOMBRA = {
  stance: P({ lean: 0.08, aN: [0.5, 1.3], aF: [1.2, 0.5] }),
  crouch: P({ ...POSES.crouch, aN: [0.8, 1.4], aF: [1.4, 0.5] }),
  jabWind: P({ lean: -0.05, head: -0.2, aN: [2.9, 0.5], aF: [2.6, 0.6] }),
  jab: P({ lean: 0.3, head: -0.1, aN: [1.7, 0.1], aF: [1.55, 0.3] }),
  upperWind: P({ lean: 0.5, head: -0.3, aN: [0.1, 0.3], aF: [0.2, 0.4], lN: [1.2, -1.9], lF: [0.45, -1.8] }),
  upper: P({ lean: -0.15, head: -0.35, aN: [2.7, 0.1], aF: [2.5, 0.2], lN: [0.3, -0.2], lF: [-0.2, -0.1] }),
  sweepWind: P({ lean: 0.5, head: -0.3, aN: [2.0, 0.3], lN: [1.3, -2.1], lF: [0.6, -2.0] }),
  sweep: P({ lean: 0.75, head: -0.5, aN: [1.35, 0.05], aF: [1.2, 0.2], lN: [1.4, -2.2], lF: [0.6, -2.0] }),
  airP: P({ lean: 0.2, aN: [1.2, 0.1], aF: [1.1, 0.3], lN: [1.3, -2.0], lF: [0.7, -1.7] }),
  block: P({ lean: -0.05, head: -0.2, aN: [1.3, 1.1], aF: [1.7, 0.6] }),
  crouchBlock: P({ ...POSES.crouchBlock, aN: [1.2, 1.2], aF: [1.6, 0.6] }),
  play: P({ lean: 0.04, head: 0.15, aN: [0.5, 1.3], aF: [1.2, 0.5] }),
  win: P({ lean: -0.1, head: -0.3, aN: [0.5, 1.3], aF: [1.5, 0.4] }),
};

const TAXI = {
  stance: P({ lean: 0.06, aN: [0.55, 2.0], aF: [0.75, 2.1] }),
  win: P({ lean: -0.05, head: -0.15, aF: [2.7, 0.4], aN: [0.5, 2.1] }),
};

// a wrestler leans in with both hands ready to grab the belt
const BALUAN = {
  stance: P({ lean: 0.35, head: -0.25, aN: [1.0, 1.0], aF: [1.2, 0.9], lN: [0.55, -0.6], lF: [-0.2, -0.3] }),
  win: P({ lean: 0, head: -0.2, aN: [1.6, 2.4], aF: [1.6, 2.4] }),
};

const AKYN = {
  stance: P({ lean: 0.05, aN: [0.5, 1.9], aF: [0.9, 1.6] }),
  jabWind: P({ lean: 0.1, aF: [1.2, 1.6] }),
  jab: P({ lean: 0.25, head: -0.1, aF: [1.75, 0.15], aN: [0.5, 2.0] }),
  win: P({ lean: 0.25, head: 0.2, aN: [2.2, 0.2], aF: [2.4, 0.2] }),
  taunt: P({ lean: -0.1, head: 0.2, aF: [1.0, 2.6], aN: [0.5, 1.9] }),
};

// Dau holds a big club in the near hand, so his club moves use that arm
const DAU = {
  stance: P({ lean: 0.15, head: 0.05, aN: [0.4, 1.4], aF: [0.6, 1.6] }),
  jabWind: P({ lean: -0.05, head: -0.2, aN: [2.8, 0.4] }),
  jab: P({ lean: 0.3, head: -0.1, aN: [1.6, 0.1], aF: [0.6, 1.8] }),
  upperWind: P({ lean: 0.5, head: -0.3, aN: [0.1, 0.3], aF: [0.3, 0.5], lN: [1.2, -1.9], lF: [0.45, -1.8] }),
  upper: P({ lean: -0.15, head: -0.35, aN: [2.7, 0.1], aF: [2.0, 0.6], lN: [0.3, -0.2], lF: [-0.2, -0.1] }),
  sweepWind: P({ lean: 0.4, head: -0.3, aN: [2.0, 0.3], lN: [1.2, -1.9], lF: [0.5, -1.8] }),
  sweep: P({ lean: 0.6, head: -0.4, aN: [1.3, 0.05], aF: [0.6, 1.4], lN: [1.3, -2.0], lF: [0.5, -1.9] }),
  airP: P({ lean: 0.2, aN: [1.3, 0.1], aF: [1.0, 1.6], lN: [1.3, -2.0], lF: [0.7, -1.7] }),
  win: P({ lean: -0.1, head: -0.35, aN: [2.9, 0.3], aF: [1.2, 2.2] }),
};

const OWN = { apa: APA, burkit: BURKIT, dombra: DOMBRA, taxi: TAXI, baluan: BALUAN, akyn: AKYN, dau: DAU };
const merged = {};
export const posesFor = (id) => (merged[id] ||= { ...POSES, ...(OWN[id] || {}) });

const lerp = (a, b, k) => a + (b - a) * k;

export function mixPose(a, b, k) {
  return {
    lean: lerp(a.lean, b.lean, k),
    head: lerp(a.head, b.head, k),
    aN: [lerp(a.aN[0], b.aN[0], k), lerp(a.aN[1], b.aN[1], k)],
    aF: [lerp(a.aF[0], b.aF[0], k), lerp(a.aF[1], b.aF[1], k)],
    lN: [lerp(a.lN[0], b.lN[0], k), lerp(a.lN[1], b.lN[1], k)],
    lF: [lerp(a.lF[0], b.lF[0], k), lerp(a.lF[1], b.lF[1], k)],
    rot: lerp(a.rot || 0, b.rot || 0, k),
    pin: b.pin != null && a.pin != null ? lerp(a.pin, b.pin, k) : (k < 0.5 ? a.pin : b.pin),
  };
}

export const copyPose = (p) => mixPose(p, p, 0);

// Forward kinematics in canvas space (y down), hip at the origin.
// Returns joints plus `lift`, how high the hip sits above the lowest point of the body.
export function solve(p, b) {
  const R = p.rot || 0;
  const v = (a, len) => [Math.sin(a - R) * len, Math.cos(a - R) * len];
  const add = (o, d) => [o[0] + d[0], o[1] + d[1]];
  const hip = [0, 0];
  const tA = Math.PI - p.lean;
  const shoulder = add(hip, v(tA, b.torso));
  const hA = tA - p.head;
  const headC = add(shoulder, v(hA, b.neck + b.head));
  const elbowN = add(shoulder, v(p.aN[0], b.ua));
  const handN = add(elbowN, v(p.aN[0] + p.aN[1], b.fa));
  const elbowF = add(shoulder, v(p.aF[0], b.ua));
  const handF = add(elbowF, v(p.aF[0] + p.aF[1], b.fa));
  const kneeN = add(hip, v(p.lN[0], b.th));
  const footN = add(kneeN, v(p.lN[0] + p.lN[1], b.sh));
  const kneeF = add(hip, v(p.lF[0], b.th));
  const footF = add(kneeF, v(p.lF[0] + p.lF[1], b.sh));
  let low = Math.max(footN[1], footF[1], kneeN[1], kneeF[1], handN[1], handF[1], headC[1] + b.head, shoulder[1] + 10);
  const lift = p.pin != null ? p.pin : low;
  return {
    hip, shoulder, headC, elbowN, handN, elbowF, handF, kneeN, footN, kneeF, footF, lift,
    angles: {
      torso: tA - R,
      head: hA - R,
      uaN: p.aN[0] - R, faN: p.aN[0] + p.aN[1] - R,
      uaF: p.aF[0] - R, faF: p.aF[0] + p.aF[1] - R,
      thN: p.lN[0] - R, shN: p.lN[0] + p.lN[1] - R,
      thF: p.lF[0] - R, shF: p.lF[0] + p.lF[1] - R,
    },
  };
}
