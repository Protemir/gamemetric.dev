// Gun models drawn from side silhouettes: each part is a 2D profile extruded with a small bevel,
// barrels and scopes are turned cylinders. Same geometry for first person and for the bodies.
// Gun space: origin at the right hand on the pistol grip, barrel along -z, y up, sizes in metres.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeos } from './map.js';

const LIGHT = new THREE.Vector3(0.45, 1, 0.35).normalize();

function paint(g, color, amb = 0.5, spec = 0.25) {
  g = g.index ? g.toNonIndexed() : g;
  g.computeVertexNormals();
  const n = g.attributes.normal, p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < p.count; i++) {
    const d = n.getX(i) * LIGHT.x + n.getY(i) * LIGHT.y + n.getZ(i) * LIGHT.z;
    // soft diffuse plus a sheen on the surfaces that face the light, so bevels catch it
    const k = amb + (1 - amb) * Math.max(0, d) + spec * Math.max(0, d) ** 8;
    col[i * 3] = c.r * k;
    col[i * 3 + 1] = c.g * k;
    col[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

// profile in (forward, up) -> extruded across x, centred; pts: [f, y] or {q:[cf,cy,f,y]} for curves
function ext(pts, width, color, x = 0, opt = {}) {
  const s = new THREE.Shape();
  let first = true;
  for (const p of pts) {
    if (p.q) s.quadraticCurveTo(p.q[0], p.q[1], p.q[2], p.q[3]);
    else if (first) {
      s.moveTo(p[0], p[1]);
      first = false;
    } else s.lineTo(p[0], p[1]);
  }
  if (opt.hole) {
    const h = new THREE.Path();
    opt.hole.forEach((p, i) => (i ? h.lineTo(p[0], p[1]) : h.moveTo(p[0], p[1])));
    s.holes.push(h);
  }
  const bev = opt.bevel ?? Math.min(0.004, width * 0.18);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, width - bev * 2), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -(width - bev * 2) / 2);
  g.rotateY(Math.PI / 2); // shape x (forward) -> -z, extrusion -> x
  g.translate(x, 0, 0);
  return paint(g, color, opt.amb, opt.spec);
}

// turned part along the barrel axis from f0 to f1 at height y (r may differ at the ends)
function tube(r0, f0, f1, y, color, r1 = r0, seg = 12, x = 0, spec = 0.35) {
  const g = new THREE.CylinderGeometry(r1, r0, Math.abs(f1 - f0), seg);
  g.rotateX(-Math.PI / 2);
  g.translate(x, y, -(f0 + f1) / 2);
  return paint(g, color, 0.48, spec);
}

function blk(f0, f1, y0, y1, w, color, x = 0, rx = 0) {
  const g = new THREE.BoxGeometry(w, y1 - y0, f1 - f0);
  if (rx) g.rotateX(rx);
  g.translate(x, (y0 + y1) / 2, -(f0 + f1) / 2);
  return paint(g, color, 0.5, 0.2);
}

function ball(r, color, f, y, x = 0, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.SphereGeometry(r, 10, 8);
  g.scale(sx, sy, sz);
  g.translate(x, y, -f);
  return paint(g, color, 0.5, 0.3);
}

function ring(r, tubeR, f, y, color, x = 0, axis = 'x') {
  const g = new THREE.TorusGeometry(r, tubeR, 6, 14);
  if (axis === 'x') g.rotateY(Math.PI / 2);
  g.translate(x, y, -f);
  return paint(g, color, 0.5, 0.4);
}

const C = {
  steel: 0x2c2e33, black: 0x17181b, dark: 0x222429, blued: 0x30343c, wood: 0x7c4a22, woodD: 0x5a3416, olive: 0x4a5236, tan: 0x8f7d5a,
  chrome: 0x8e949c, polymer: 0x1d1e21, brass: 0xb08a3e, glass: 0x2a4a5a,
};

const BUILD = {
  rifle() {
    return [
      // receiver with a sloped rear and the dust cover
      ext([[-0.12, 0.035], [0.3, 0.035], [0.3, 0.094], [0.27, 0.101], [-0.07, 0.101], [-0.12, 0.084]], 0.042, C.steel),
      blk(-0.06, 0.27, 0.098, 0.106, 0.034, C.blued),
      // wooden stock with a drop at the butt
      ext([[-0.12, 0.042], [-0.12, 0.09], [-0.25, 0.075], [-0.42, 0.058], [-0.425, 0.04], [-0.425, -0.06], [-0.4, -0.066], [-0.25, -0.02], [-0.12, 0.042]], 0.04, C.wood, 0, { spec: 0.15 }),
      blk(-0.432, -0.42, -0.064, 0.058, 0.042, C.black),
      // pistol grip, slanted back
      ext([[-0.02, 0.04], [0.03, 0.04], [0.012, -0.06], [-0.004, -0.078], [-0.04, -0.08], [-0.042, -0.068]], 0.031, C.woodD, 0, { spec: 0.1 }),
      // trigger guard and trigger
      ext([[0.03, 0.036], [0.1, 0.036], [0.1, 0.03], [0.085, -0.004], [0.03, -0.006], [0.03, 0.0], [0.08, 0.002], [0.092, 0.03], [0.03, 0.03]], 0.012, C.steel, 0, { bevel: 0.001 }),
      blk(0.05, 0.057, 0.0, 0.034, 0.008, C.black, 0, 0.25),
      // curved magazine
      ext([[0.1, 0.038], [0.155, 0.038], { q: [0.17, -0.06, 0.255, -0.165] }, [0.205, -0.19], { q: [0.12, -0.08, 0.1, 0.038] }], 0.028, C.steel, 0, { spec: 0.3 }),
      blk(0.19, 0.25, -0.19, -0.18, 0.03, C.black, 0, -0.5),
      // lower handguard and the gas-tube cover
      ext([[0.3, 0.032], [0.49, 0.036], [0.51, 0.058], [0.49, 0.088], [0.3, 0.092]], 0.05, C.wood, 0, { spec: 0.15 }),
      tube(0.017, 0.3, 0.5, 0.108, C.wood, 0.016, 10, 0, 0.15),
      tube(0.008, 0.5, 0.58, 0.104, C.steel),
      // barrel, front sight, muzzle brake
      tube(0.0105, 0.3, 0.8, 0.068, C.steel),
      tube(0.016, 0.71, 0.75, 0.074, C.steel),
      blk(0.725, 0.74, 0.08, 0.122, 0.01, C.steel),
      blk(0.715, 0.75, 0.115, 0.124, 0.03, C.steel),
      tube(0.015, 0.79, 0.85, 0.068, C.dark),
      // rear sight block, charging handle, selector
      blk(0.27, 0.33, 0.1, 0.116, 0.026, C.steel),
      blk(0.22, 0.25, 0.07, 0.085, 0.03, C.chrome, 0.032),
      blk(0.0, 0.16, 0.07, 0.078, 0.004, C.steel, 0.023),
    ];
  },
  smg() {
    return [
      ext([[-0.07, 0.035], [0.24, 0.035], [0.25, 0.06], [0.24, 0.096], [-0.07, 0.096], [-0.075, 0.07]], 0.042, C.polymer),
      tube(0.012, 0.1, 0.31, 0.098, C.black),
      blk(0.27, 0.3, 0.1, 0.12, 0.014, C.black, 0.0),
      // ribbed handguard
      ext([[0.24, 0.026], [0.38, 0.03], [0.392, 0.058], [0.38, 0.086], [0.24, 0.09]], 0.05, C.polymer, 0, { spec: 0.1 }),
      ...[0.27, 0.3, 0.33, 0.36].map((f) => blk(f, f + 0.008, 0.028, 0.088, 0.054, C.black)),
      tube(0.009, 0.38, 0.47, 0.06, C.steel),
      ring(0.018, 0.004, 0.43, 0.115, C.black),
      blk(0.427, 0.433, 0.097, 0.112, 0.006, C.black),
      // rear sight drum
      tube(0.012, -0.06, -0.035, 0.112, C.black, 0.012, 8),
      // curved magazine
      ext([[0.115, 0.036], [0.152, 0.036], { q: [0.16, -0.06, 0.24, -0.17] }, [0.205, -0.18], { q: [0.12, -0.07, 0.115, 0.036] }], 0.024, C.steel),
      ext([[-0.02, 0.038], [0.03, 0.038], [0.014, -0.06], [-0.002, -0.076], [-0.038, -0.078], [-0.04, -0.066]], 0.03, C.polymer),
      ext([[0.03, 0.036], [0.095, 0.036], [0.095, 0.03], [0.08, -0.004], [0.03, -0.006], [0.03, 0.0], [0.076, 0.002], [0.088, 0.03], [0.03, 0.03]], 0.012, C.black, 0, { bevel: 0.001 }),
      // collapsible stock: two struts and a pad
      blk(-0.33, -0.07, 0.072, 0.082, 0.008, C.steel, 0.022),
      blk(-0.33, -0.07, 0.072, 0.082, 0.008, C.steel, -0.022),
      blk(-0.33, -0.07, 0.042, 0.05, 0.008, C.steel, 0.022),
      blk(-0.33, -0.07, 0.042, 0.05, 0.008, C.steel, -0.022),
      ext([[-0.355, -0.035], [-0.325, -0.035], [-0.325, 0.095], [-0.355, 0.095]], 0.05, C.black),
      blk(0.15, 0.2, 0.07, 0.084, 0.03, C.steel, 0.025),
    ];
  },
  shotgun() {
    return [
      ext([[-0.06, 0.032], [0.2, 0.032], [0.2, 0.1], [-0.03, 0.104], [-0.06, 0.092]], 0.045, C.black, 0, { spec: 0.35 }),
      tube(0.012, 0.2, 0.74, 0.086, C.blued),
      blk(0.2, 0.73, 0.098, 0.103, 0.01, C.steel),
      ball(0.004, C.brass, 0.725, 0.106),
      tube(0.014, 0.2, 0.66, 0.056, C.blued),
      tube(0.016, 0.655, 0.67, 0.056, C.steel),
      // pump with grooves
      tube(0.027, 0.3, 0.5, 0.058, C.wood, 0.027, 12, 0, 0.15),
      ...[0.33, 0.36, 0.39, 0.42, 0.45].map((f) => tube(0.0275, f, f + 0.008, 0.058, C.woodD, 0.0275, 12)),
      // stock and grip in one piece of walnut
      ext([[-0.06, 0.035], [-0.06, 0.094], [-0.2, 0.08], [-0.43, 0.07], [-0.43, -0.075], [-0.33, -0.05], [-0.12, -0.015], [-0.045, -0.07], [-0.005, -0.08], [0.025, 0.032]], 0.042, C.wood, 0, { spec: 0.15 }),
      blk(-0.44, -0.43, -0.075, 0.07, 0.044, C.black),
      ext([[0.03, 0.034], [0.1, 0.034], [0.1, 0.028], [0.085, -0.004], [0.03, -0.006], [0.03, 0.0], [0.08, 0.002], [0.092, 0.028], [0.03, 0.028]], 0.012, C.black, 0, { bevel: 0.001 }),
      blk(0.05, 0.057, 0.0, 0.032, 0.008, C.chrome, 0, 0.25),
      blk(0.08, 0.13, 0.06, 0.075, 0.004, C.chrome, 0.024),
    ];
  },
  sniper() {
    return [
      // one-piece synthetic stock with grip and forend
      ext([[-0.5, -0.07], [-0.5, 0.075], [-0.16, 0.07], [-0.1, 0.045], [0.42, 0.045], [0.445, 0.025], [0.43, -0.004], [0.075, -0.004], [0.045, -0.012], [0.022, -0.08], [-0.02, -0.092], [-0.045, -0.085], [-0.03, -0.02], [-0.12, -0.035], [-0.48, -0.075]], 0.046, C.olive, 0, { spec: 0.12 }),
      blk(-0.51, -0.5, -0.075, 0.075, 0.048, C.black),
      // action, bolt handle
      tube(0.022, -0.06, 0.2, 0.065, C.steel),
      blk(0.01, 0.025, 0.06, 0.07, 0.07, C.steel, 0.035),
      ball(0.011, C.steel, 0.018, 0.05, 0.07),
      // fluted barrel and brake
      tube(0.015, 0.2, 0.9, 0.065, C.steel, 0.01),
      tube(0.016, 0.89, 0.95, 0.065, C.dark),
      // scope with bells, rings and turrets
      tube(0.016, -0.04, 0.27, 0.135, C.black),
      tube(0.022, -0.09, -0.03, 0.135, C.black, 0.016),
      tube(0.028, 0.24, 0.33, 0.135, C.black, 0.019),
      tube(0.026, 0.326, 0.33, 0.135, C.glass, 0.026, 12, 0, 0.9),
      tube(0.008, 0.11, 0.13, 0.16, C.black, 0.008, 8),
      blk(0.11, 0.13, 0.13, 0.142, 0.06, C.black),
      blk(0.0, 0.03, 0.085, 0.125, 0.03, C.steel),
      blk(0.16, 0.19, 0.085, 0.125, 0.03, C.steel),
      // magazine and the folded bipod
      blk(0.07, 0.13, -0.035, 0.0, 0.034, C.black),
      tube(0.005, 0.25, 0.42, -0.012, C.black, 0.005, 6, 0.012),
      tube(0.005, 0.25, 0.42, -0.012, C.black, 0.005, 6, -0.012),
    ];
  },
  pistol() {
    return [
      // slide with rear serrations
      ext([[-0.038, 0.036], [0.15, 0.036], [0.156, 0.054], [0.15, 0.071], [-0.032, 0.071], [-0.038, 0.06]], 0.028, C.dark, 0, { spec: 0.4 }),
      ...[-0.03, -0.022, -0.014, -0.006].map((f) => blk(f, f + 0.003, 0.044, 0.07, 0.03, C.black)),
      blk(0.135, 0.142, 0.07, 0.078, 0.006, C.black),
      blk(-0.03, -0.022, 0.07, 0.078, 0.02, C.black),
      tube(0.007, 0.15, 0.158, 0.054, C.black, 0.007, 8),
      // frame, trigger guard, trigger
      ext([[-0.034, 0.022], [0.145, 0.022], [0.145, 0.037], [-0.034, 0.037]], 0.026, C.polymer),
      ext([[0.018, 0.024], [0.075, 0.024], [0.075, 0.018], [0.062, -0.012], [0.02, -0.014], [0.02, -0.008], [0.058, -0.006], [0.067, 0.018], [0.018, 0.018]], 0.014, C.polymer, 0, { bevel: 0.001 }),
      blk(0.035, 0.041, -0.004, 0.022, 0.007, C.black, 0, 0.2),
      // grip
      ext([[-0.034, 0.024], [0.022, 0.024], [0.01, -0.08], [-0.004, -0.088], [-0.04, -0.09], [-0.046, -0.08], [-0.038, -0.02]], 0.03, C.polymer, 0, { spec: 0.08 }),
      blk(-0.044, 0.008, -0.096, -0.086, 0.032, C.black, 0, -0.12),
    ];
  },
  deagle() {
    // a big six-shot revolver
    return [
      ext([[0.055, 0.045], [0.24, 0.045], [0.24, 0.088], [0.055, 0.088]], 0.026, C.chrome, 0, { spec: 0.6 }),
      blk(0.06, 0.24, 0.088, 0.096, 0.012, C.chrome),
      blk(0.226, 0.236, 0.096, 0.108, 0.006, C.steel),
      ext([[0.06, 0.03], [0.21, 0.03], [0.22, 0.045], [0.06, 0.045]], 0.022, C.chrome),
      tube(0.032, -0.012, 0.058, 0.062, C.steel, 0.032, 6, 0, 0.5),
      ...[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + 0.52;
        return tube(0.006, -0.013, 0.059, 0.062 + Math.sin(a) * 0.032, C.black, 0.006, 6, Math.cos(a) * 0.032);
      }),
      ext([[-0.045, 0.03], [0.065, 0.03], [0.065, 0.096], [-0.02, 0.1], [-0.045, 0.078]], 0.03, C.chrome, 0, { spec: 0.6 }),
      blk(-0.055, -0.035, 0.09, 0.108, 0.012, C.steel, 0, 0.4),
      ext([[0.012, 0.032], [0.07, 0.032], [0.07, 0.026], [0.058, -0.008], [0.016, -0.012], [0.014, -0.006], [0.052, -0.003], [0.062, 0.026], [0.012, 0.026]], 0.012, C.chrome, 0, { bevel: 0.001 }),
      blk(0.032, 0.038, -0.002, 0.03, 0.007, C.steel, 0, 0.2),
      ext([[-0.045, 0.034], [0.012, 0.03], [0.016, -0.04], { q: [0.012, -0.095, -0.03, -0.098] }, [-0.058, -0.085], { q: [-0.05, -0.02, -0.045, 0.034] }], 0.034, C.woodD, 0, { spec: 0.2 }),
    ];
  },
  knife() {
    return [
      ext([[0.045, -0.008], [0.2, -0.006], { q: [0.235, 0.004, 0.24, 0.018] }, [0.2, 0.012], [0.16, 0.022], [0.045, 0.022]], 0.005, C.chrome, 0, { bevel: 0.0015, spec: 0.8 }),
      blk(0.06, 0.2, 0.012, 0.019, 0.0055, 0x5d636b),
      blk(0.035, 0.045, -0.02, 0.034, 0.03, C.steel),
      ext([[-0.075, -0.008], [0.035, -0.012], [0.035, 0.026], [-0.075, 0.022], [-0.083, 0.008]], 0.026, C.black, 0, { spec: 0.1 }),
      ...[-0.05, -0.025, 0.0].map((f) => blk(f, f + 0.006, -0.014, 0.028, 0.028, 0x2a2b2e)),
    ];
  },
  he() {
    return [ball(0.034, 0x3e5236, 0, 0, 0, 1, 1.15, 1), tube(0.012, -0.01, 0.01, 0.045, C.steel, 0.012, 8), blk(-0.005, 0.005, 0.015, 0.06, 0.012, C.steel, 0.026, 0.15), ring(0.011, 0.0018, 0.0, 0.06, C.chrome, 0.012)];
  },
  flash() {
    return [tube(0.026, -0.05, 0.05, 0.0, 0x9aa0a8, 0.026, 12).rotateX(Math.PI / 2), tube(0.027, -0.03, -0.02, 0.0, 0x3a3d42, 0.027, 12).rotateX(Math.PI / 2), tube(0.012, -0.01, 0.01, 0.06, C.steel, 0.012, 8), blk(-0.005, 0.005, 0.02, 0.065, 0.012, C.steel, 0.026, 0.15), ring(0.011, 0.0018, 0.0, 0.068, C.chrome, 0.012)];
  },
};

// where the left hand holds (gun space) and where the muzzle is
export const GUN_INFO = {
  rifle: { l: [0, 0.03, -0.4], muzzle: [0, 0.068, -0.86] },
  smg: { l: [0, 0.025, -0.31], muzzle: [0, 0.06, -0.48] },
  shotgun: { l: [0, 0.03, -0.4], muzzle: [0, 0.086, -0.75] },
  sniper: { l: [0, 0.0, -0.32], muzzle: [0, 0.065, -0.96] },
  pistol: { l: [-0.012, -0.03, 0.012], muzzle: [0, 0.054, -0.17] },
  deagle: { l: [-0.012, -0.03, 0.012], muzzle: [0, 0.066, -0.25] },
  knife: { l: null, muzzle: [0, 0.01, -0.22] },
  he: { l: null, muzzle: [0, 0.03, 0] },
  flash: { l: null, muzzle: [0, 0.03, 0] },
};

const cache = {};
export function gunGeometry(kind) {
  if (!cache[kind]) cache[kind] = mergeGeos(BUILD[kind]());
  return cache[kind];
}

// first-person arms: gloves on the grip and the support hand, sleeves running back towards the camera
const _q = new THREE.Quaternion(), _down = new THREE.Vector3(0, -1, 0);
function armSeg(from, dir, len, r0, r1, color) {
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * Math.PI * 0.5;
    pts.push(new THREE.Vector2(Math.sin(a) * r1, -len + r1 - Math.cos(a) * r1));
  }
  for (let i = 4; i >= 0; i--) {
    const a = (i / 4) * Math.PI * 0.5;
    pts.push(new THREE.Vector2(Math.max(0.0001, Math.sin(a) * r0), -r0 + Math.cos(a) * r0));
  }
  const g = new THREE.LatheGeometry(pts, 10);
  const d = new THREE.Vector3(...dir).normalize();
  _q.setFromUnitVectors(_down, d);
  g.applyQuaternion(_q);
  g.translate(from[0], from[1], from[2]);
  return paint(g, color, 0.5, 0.1);
}

function glove(at, color, wrap = 1) {
  const parts = [];
  // palm and fingers wrapped around a grip
  const palm = new THREE.SphereGeometry(0.034, 10, 8);
  palm.scale(0.95, 1.45 * wrap, 1.15);
  palm.translate(at[0] + 0.012, at[1], at[2] + 0.004);
  parts.push(paint(palm, color, 0.5, 0.15));
  for (let i = 0; i < 4; i++) {
    const g = new THREE.CapsuleGeometry(0.0105, 0.028, 3, 6);
    g.rotateZ(Math.PI / 2);
    g.translate(at[0] - 0.012, at[1] + 0.03 * wrap - i * 0.02 * wrap, at[2] - 0.026);
    parts.push(paint(g, color, 0.5, 0.15));
  }
  parts.push(armSeg([at[0] + 0.02, at[1] + 0.025, at[2] - 0.01], [-0.4, 0.3, -1], 0.04, 0.012, 0.01, color)); // thumb
  return parts;
}

export function firstPersonArms(kind, team) {
  const sleeve = team === 'A' ? 0x2f4361 : 0x6e2228;
  const cuff = team === 'A' ? 0x1d2126 : 0x1e1e22;
  const gloveC = team === 'A' ? 0x23262b : 0x1a1a1c;
  const info = GUN_INFO[kind];
  const parts = [...glove([0, 0, 0], gloveC)];
  // right forearm: from the wrist back, down and out to the right
  parts.push(armSeg([0.012, -0.03, 0.03], [0.32, -0.42, 1], 0.42, 0.04, 0.048, sleeve));
  parts.push(armSeg([0.01, -0.025, 0.02], [0.32, -0.42, 1], 0.07, 0.037, 0.04, cuff));
  if (info.l) {
    const L = info.l;
    const pistol = kind === 'pistol' || kind === 'deagle';
    parts.push(...glove([L[0] - (pistol ? 0.02 : 0), L[1] - (pistol ? 0 : 0.02), L[2]], gloveC, pistol ? 0.8 : 0.9));
    const dir = pistol ? [-0.55, -0.5, 1] : [-0.5, -0.38, 0.85];
    parts.push(armSeg([L[0] - 0.02, L[1] - 0.045, L[2] + 0.02], dir, 0.5, 0.04, 0.05, sleeve));
    parts.push(armSeg([L[0] - 0.02, L[1] - 0.045, L[2] + 0.015], dir, 0.07, 0.037, 0.04, cuff));
  }
  return parts;
}
