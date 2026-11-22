// The look of the house from outside: a second storey with windows, window frames and shutters,
// a stone plinth, a band between the floors, a cornice under the roof, corner stones and a pillared entrance.
// Pure decoration: none of it collides or stops bullets; lighting is baked into vertex colours like the level.
import * as THREE from '../vendor/three.module.min.js';
import { K, FACADE, HOUSE, W } from './map.js';
import { TEX_SIZE } from './textures.js';

const UP_Y0 = 4.75, UP_Y1 = 6.75;

export function buildDecor(map, tex) {
  const groups = {};
  const grp = (k) => (groups[k] ||= { p: [], u: [], c: [] });
  const sz = (k) => TEX_SIZE[k] || [1, 1];
  const lightAt = (x, y, z, nx, ny, nz) => map.light(x + nx * 0.03, Math.max(0.05, Math.min(y, 3.95)), z + nz * 0.03, nx, ny, nz, map.isIndoor(x + nx * 0.3, z + nz * 0.3) && y < 4, 1);

  // one axis-aligned quad, lit per corner
  const quad = (key, v, n, uv) => {
    const G = grp(key);
    const a = new THREE.Vector3().subVectors(new THREE.Vector3(...v[1]), new THREE.Vector3(...v[0]));
    const b = new THREE.Vector3().subVectors(new THREE.Vector3(...v[2]), new THREE.Vector3(...v[0]));
    const cr = a.cross(b);
    const order = cr.x * n[0] + cr.y * n[1] + cr.z * n[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    const col = v.map((p) => lightAt(p[0], p[1], p[2], n[0], n[1], n[2]));
    for (const i of order) {
      G.p.push(...v[i]);
      G.u.push(...uv[i]);
      G.c.push(...col[i]);
    }
  };
  // a box with world-space texture coordinates; skip: faces to leave out ('-x','+x','-y','+y','-z','+z')
  const box = (key, x0, y0, z0, x1, y1, z1, skip = '') => {
    const [su, sv] = sz(key);
    const F = [
      ['-x', [-1, 0, 0], [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], (p) => [p[2] / su, p[1] / sv]],
      ['+x', [1, 0, 0], [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], (p) => [p[2] / su, p[1] / sv]],
      ['-z', [0, 0, -1], [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], (p) => [p[0] / su, p[1] / sv]],
      ['+z', [0, 0, 1], [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]], (p) => [p[0] / su, p[1] / sv]],
      ['+y', [0, 1, 0], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], (p) => [p[0] / su, p[2] / sv]],
      ['-y', [0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], (p) => [p[0] / su, p[2] / sv]],
    ];
    for (const [name, n, v, uvf] of F) if (!skip.includes(name)) quad(key, v, n, v.map(uvf));
  };
  // a picture on the wall: uv 0..1 over the whole quad
  const plate = (key, v, n) => quad(key, v, n, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  const shaped = (key, geo) => {
    // any three.js geometry, lit per vertex, texture repeated by its own uv
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.computeVertexNormals();
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    const G = grp(key);
    for (let i = 0; i < p.count; i++) {
      G.p.push(p.getX(i), p.getY(i), p.getZ(i));
      G.u.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      G.c.push(...lightAt(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)));
    }
  };

  // the four outer faces: walk along each; a facade frame maps (u along, y, d outward) to the world
  const sides = [
    { name: 'S', len: HOUSE.x1 - HOUSE.x0 + 1, cell: (i) => [HOUSE.x0 + i, HOUSE.z1], at: (u, d) => [HOUSE.x0 + u, HOUSE.z1 + 1 + d], n: [0, 0, 1] },
    { name: 'N', len: HOUSE.x1 - HOUSE.x0 + 1, cell: (i) => [HOUSE.x0 + i, HOUSE.z0], at: (u, d) => [HOUSE.x0 + u, HOUSE.z0 - d], n: [0, 0, -1] },
    { name: 'W', len: HOUSE.z1 - HOUSE.z0 + 1, cell: (i) => [HOUSE.x0, HOUSE.z0 + i], at: (u, d) => [HOUSE.x0 - d, HOUSE.z0 + u], n: [-1, 0, 0] },
    { name: 'E', len: HOUSE.z1 - HOUSE.z0 + 1, cell: (i) => [HOUSE.x1, HOUSE.z0 + i], at: (u, d) => [HOUSE.x1 + 1 + d, HOUSE.z0 + u], n: [1, 0, 0] },
  ];
  // a box given in facade coordinates
  const fbox = (S, key, u0, u1, y0, y1, d0, d1, skip = '') => {
    const a = S.at(u0, d0), b = S.at(u1, d1);
    box(key, Math.min(a[0], b[0]), y0, Math.min(a[1], b[1]), Math.max(a[0], b[0]), y1, Math.max(a[1], b[1]), skip);
  };
  const fplate = (S, key, u0, u1, y0, y1, d) => {
    // left-to-right as seen from outside
    const flip = S.name === 'N' || S.name === 'E';
    const [ua, ub] = flip ? [u1, u0] : [u0, u1];
    const a = S.at(ua, d), b = S.at(ub, d);
    const v = [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]];
    plate(key, v, S.n);
  };

  for (const S of sides) {
    // what each metre of this face is
    const kinds = [];
    for (let i = 0; i < S.len; i++) {
      const [x, z] = S.cell(i);
      const ci = map.cellAt(x + 0.5, z + 0.5);
      const isDoor = map.h[ci] === 0 && map.lint[ci] > 0;
      const isWin = map.kind[ci] === K.WINDOW;
      kinds.push(isDoor ? 'door' : isWin ? 'win' : 'wall');
    }
    const runs = [];
    for (let i = 0; i < S.len; ) {
      let j = i;
      while (j + 1 < S.len && kinds[j + 1] === kinds[i]) j++;
      runs.push({ kind: kinds[i], a: i, b: j + 1, l: map.lint[map.cellAt(...S.cell(i).map((v) => v + 0.5))] });
      i = j + 1;
    }
    const wallAt = (u) => u >= 0 && u < S.len && kinds[Math.floor(u)] === 'wall';
    // stone plinth under walls and windows, round the corners
    for (const r of runs) {
      if (r.kind === 'door') continue;
      fbox(S, 'stone', r.a === 0 ? -0.08 : r.a, r.b === S.len ? S.len + 0.08 : r.b, 0, 0.55, 0, 0.07);
    }
    // band between the floors and the cornice under the roof
    fbox(S, 'trim', -0.1, S.len + 0.1, 3.98, 4.22, 0, 0.1);
    fbox(S, 'trim', -0.12, S.len + 0.12, FACADE - 0.42, FACADE - 0.26, 0, 0.12);
    fbox(S, 'trim', -0.2, S.len + 0.2, FACADE - 0.26, FACADE, 0, 0.24);
    // corner stones
    for (let y = 0.55, k = 0; y < FACADE - 0.5; y += 0.42, k++) {
      const w = k % 2 ? 0.32 : 0.55;
      fbox(S, 'fountain', -0.08, w, y + 0.02, y + 0.4, 0, 0.06);
      fbox(S, 'fountain', S.len - w, S.len + 0.08, y + 0.02, y + 0.4, 0, 0.06);
    }
    let upWins = [];
    const taken = [];
    const shutters = (u0, u1, y0, y1) => {
      const w = Math.min(0.62, (y1 - y0) * 0.36);
      const up = y0 > 4;
      const free = (a, b) => {
        if (taken.some((t) => t.up === up && a < t.b + 0.05 && b > t.a - 0.05)) return false;
        if (up) return a > 0.1 && b < S.len - 0.1 && !upWins.some((u) => a < u + 0.96 && b > u - 0.96);
        return wallAt(a - 0.05) && wallAt(b + 0.05);
      };
      for (const [a, b] of [[u0 - 0.2 - w, u0 - 0.2], [u1 + 0.2, u1 + 0.2 + w]]) {
        if (!free(a, b)) continue;
        taken.push({ a, b, up });
        fplate(S, 'shutter', a, b, y0, y1, 0.025);
      }
    };
    const upper = [], noUp = [];
    for (const r of runs) {
      if (r.kind === 'wall') continue;
      const l = r.l || 2.9;
      const y0 = r.kind === 'win' ? 0.95 : 0;
      // frame round the opening
      fbox(S, 'trim', r.a - 0.18, r.a, y0, l + 0.22, 0, 0.09);
      fbox(S, 'trim', r.b, r.b + 0.18, y0, l + 0.22, 0, 0.09);
      fbox(S, 'trim', r.a - 0.24, r.b + 0.24, l, l + 0.26, 0, 0.1);
      // a thin frame set into the opening, halfway through the wall
      fbox(S, 'wframe', r.a, r.a + 0.07, y0 + (r.kind === 'win' ? 0.05 : 0), l, -0.55, -0.45);
      fbox(S, 'wframe', r.b - 0.07, r.b, y0 + (r.kind === 'win' ? 0.05 : 0), l, -0.55, -0.45);
      fbox(S, 'wframe', r.a, r.b, l - 0.07, l, -0.55, -0.45);
      if (r.kind === 'win') {
        fbox(S, 'fountain', r.a - 0.12, r.b + 0.12, 0.9, 1.02, -0.02, 0.13);
        shutters(r.a, r.b, 1.02, l);
      }
      const portico = r.kind === 'door' && r.b - r.a >= 4 && S.name === 'S';
      if (portico) noUp.push([r.a - 1.4, r.b + 1.4]);
      else upper.push((r.a + r.b) / 2);
      // the entrance: half columns (set into the wall, so nobody walks through them), a beam and a pediment
      if (portico) {
        for (const cu of [r.a - 0.55, r.b + 0.55]) {
          const [cx, cz] = S.at(cu, 0.02);
          shaped('pillar', new THREE.CylinderGeometry(0.26, 0.3, 3.1, 14, 1, true).translate(cx, 0.35 + 1.55, cz));
          fbox(S, 'fountain', cu - 0.42, cu + 0.42, 0, 0.35, -0.02, 0.36);
          fbox(S, 'trim', cu - 0.38, cu + 0.38, 3.45, 3.62, -0.02, 0.34);
        }
        fbox(S, 'trim', r.a - 1.05, r.b + 1.05, 3.62, 4.0, 0, 0.62);
        fbox(S, 'trim', r.a - 1.15, r.b + 1.15, 4.0, 4.14, 0, 0.7);
        // pediment: a low triangle standing on the beam
        const u0 = r.a - 1.1, u1 = r.b + 1.1, um = (u0 + u1) / 2, top = 5.05;
        const pts = [[u0, 4.14], [u1, 4.14], [um, top]];
        const tri = new THREE.Shape(pts.map(([u, y]) => new THREE.Vector2(u - um, y)));
        const g = new THREE.ExtrudeGeometry(tri, { depth: 0.6, bevelEnabled: false });
        // shape plane is x/y; extrude along +z, then turn to this face
        const m = new THREE.Matrix4();
        const [ox, oz] = S.at(um, 0);
        const ang = { S: 0, N: Math.PI, W: -Math.PI / 2, E: Math.PI / 2 }[S.name];
        m.makeRotationY(ang).setPosition(ox, 0, oz);
        g.applyMatrix4(m);
        const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.5, uv.getY(i) / 1.5);
        shaped('trim', g);
      } else if (r.kind === 'door') {
        fbox(S, 'trim', r.a - 0.3, r.b + 0.3, l + 0.26, l + 0.4, 0, 0.16);
      }
    }
    // second storey windows: over every opening below, and more in long blank stretches
    const ups = upper.slice().sort((a, b) => a - b);
    const all = [];
    let prev = 0;
    for (const u of [...ups, S.len]) {
      const gap = u - prev;
      const n = Math.floor(gap / 5.2);
      for (let k = 1; k <= n; k++) all.push(prev + (gap * k) / (n + 1));
      if (u < S.len) all.push(u);
      prev = u;
    }
    const ok = all.filter((u) => u >= 1.4 && u <= S.len - 1.4 && !noUp.some(([a, b]) => u + 1.1 > a && u - 1.1 < b));
    upWins = ok;
    for (const u of ok) {
      const hw = 0.82;
      fplate(S, 'upwin', u - hw, u + hw, UP_Y0, UP_Y1, 0.015);
      fbox(S, 'trim', u - hw - 0.14, u - hw, UP_Y0 - 0.04, UP_Y1 + 0.1, 0, 0.07);
      fbox(S, 'trim', u + hw, u + hw + 0.14, UP_Y0 - 0.04, UP_Y1 + 0.1, 0, 0.07);
      fbox(S, 'trim', u - hw - 0.22, u + hw + 0.22, UP_Y1 + 0.06, UP_Y1 + 0.2, 0, 0.11);
      fbox(S, 'fountain', u - hw - 0.14, u + hw + 0.14, UP_Y0 - 0.14, UP_Y0 - 0.03, 0, 0.14);
      shutters(u - hw, u + hw, UP_Y0, UP_Y1);
    }
  }

  // hall pillars: a plinth at the foot and a capital under the ceiling
  for (let z = HOUSE.z0; z <= HOUSE.z1; z++)
    for (let x = HOUSE.x0; x <= HOUSE.x1; x++) {
      if (map.kind[z * W + x] !== K.PILLAR) continue;
      box('pillar', x - 0.12, 0, z - 0.12, x + 1.12, 0.22, z + 1.12, '-y');
      box('pillar', x - 0.06, 0.22, z - 0.06, x + 1.06, 0.36, z + 1.06, '-y');
      box('pillar', x - 0.06, 3.5, z - 0.06, x + 1.06, 3.66, z + 1.06, '+y');
      box('pillar', x - 0.14, 3.66, z - 0.14, x + 1.14, 3.86, z + 1.14, '+y');
    }

  // inside: a moulding where the walls meet the ceiling, lit by the room lamps
  {
    const G = grp('trim');
    const [su, sv] = sz('trim');
    const lit = (x, y, z, nx, ny, nz) => map.light(x + nx * 0.05, y, z + nz * 0.05, nx, ny, nz, true, 0.95);
    const iquad = (v, n) => {
      const col = v.map((p) => lit(p[0], p[1], p[2], n[0], n[1], n[2]));
      const uv = v.map((p) => [(n[0] ? p[2] : p[0]) / su, p[1] / sv]);
      const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2];
      const bx = v[2][0] - v[0][0], by = v[2][1] - v[0][1], bz = v[2][2] - v[0][2];
      const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
      const order = cx * n[0] + cy * n[1] + cz * n[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      for (const i of order) {
        G.p.push(...v[i]);
        G.u.push(...uv[i]);
        G.c.push(...col[i]);
      }
    };
    const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let z = HOUSE.z0; z <= HOUSE.z1; z++)
      for (let x = HOUSE.x0; x <= HOUSE.x1; x++) {
        const c = z * W + x;
        if (!map.indoor[c] || map.h[c] >= 4 || map.lint[c] > 0) continue;
        for (let d = 0; d < 4; d++) {
          const [dx, dz] = DIRS[d];
          const nb = (z + dz) * W + (x + dx);
          if (map.h[nb] < 4) continue;
          // the wall face lies on the shared edge; the moulding steps out from it into this cell
          const n = [-dx, 0, -dz];
          const fx = dx === 1 ? x + 1 : dx === -1 ? x : null, fz = dz === 1 ? z + 1 : dz === -1 ? z : null;
          const seg = (y0, y1, depth) => {
            // a strip [0..1] along the edge at height y0..y1, standing `depth` off the wall
            if (fx !== null) {
              const px = fx + n[0] * depth;
              iquad([[px, y0, z], [px, y0, z + 1], [px, y1, z + 1], [px, y1, z]], n);
              iquad([[fx, y0, z], [fx, y0, z + 1], [px, y0, z + 1], [px, y0, z]], [0, -1, 0]);
            } else {
              const pz = fz + n[2] * depth;
              iquad([[x, y0, pz], [x + 1, y0, pz], [x + 1, y1, pz], [x, y1, pz]], n);
              iquad([[x, y0, fz], [x + 1, y0, fz], [x + 1, y0, pz], [x, y0, pz]], [0, -1, 0]);
            }
          };
          seg(3.86, 4.0, 0.12);
          seg(3.76, 3.86, 0.06);
        }
      }
  }

  const meshes = [];
  for (const [key, G] of Object.entries(groups)) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(G.p, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(G.u, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(G.c, 3));
    geo.computeBoundingSphere();
    const t = key === 'shutter' ? SHUTTER() : key === 'upwin' ? UPWIN() : key === 'wframe' ? null : tex[key];
    const mat = new THREE.MeshBasicMaterial({ map: t, vertexColors: true, color: key === 'wframe' ? 0xf2efe8 : 0xffffff });
    const m = new THREE.Mesh(geo, mat);
    m.matrixAutoUpdate = false;
    m.name = 'decor-' + key;
    meshes.push(m);
  }
  return meshes;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// dark green louvred shutters
let shutterTex = null;
function SHUTTER() {
  return (shutterTex ||= canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#2f4a3a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#26402f';
    g.fillRect(0, 0, w, 10);
    g.fillRect(0, h - 10, w, 10);
    g.fillRect(0, h / 2 - 5, w, 10);
    g.fillRect(0, 0, 6, h);
    g.fillRect(w - 6, 0, 6, h);
    for (let y = 12; y < h - 12; y += 7) {
      if (Math.abs(y - h / 2) < 8) continue;
      const gr = g.createLinearGradient(0, y, 0, y + 7);
      gr.addColorStop(0, '#41634e');
      gr.addColorStop(0.6, '#2d4738');
      gr.addColorStop(1, '#1c2e24');
      g.fillStyle = gr;
      g.fillRect(7, y, w - 14, 6);
    }
  }));
}

// an upstairs window: white frame, six panes reflecting the sky, curtains half drawn
let upwinTex = null;
function UPWIN() {
  return (upwinTex ||= canvasTex(256, 320, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#8fb0cc');
    sky.addColorStop(0.45, '#4d6a84');
    sky.addColorStop(1, '#1d2a36');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // curtains
    for (const [x0, x1] of [[10, 70], [w - 70, w - 10]]) {
      const cg = g.createLinearGradient(x0, 0, x1, 0);
      for (let i = 0; i <= 6; i++) cg.addColorStop(i / 6, i % 2 ? '#c9b58f' : '#a8926c');
      g.fillStyle = cg;
      g.globalAlpha = 0.85;
      g.fillRect(x0, 10, x1 - x0, h - 20);
      g.globalAlpha = 1;
    }
    // a soft reflection streak
    g.globalAlpha = 0.18;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(40, h);
    g.lineTo(120, 0);
    g.lineTo(170, 0);
    g.lineTo(90, h);
    g.fill();
    g.globalAlpha = 1;
    // frame and glazing bars
    g.fillStyle = '#f1eee6';
    g.fillRect(0, 0, w, 12);
    g.fillRect(0, h - 12, w, 12);
    g.fillRect(0, 0, 12, h);
    g.fillRect(w - 12, 0, 12, h);
    g.fillRect(w / 2 - 6, 0, 12, h);
    g.fillRect(0, h * 0.36 - 4, w, 8);
    g.fillRect(0, h * 0.68 - 4, w, 8);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 2;
    g.strokeRect(12, 12, w - 24, h - 24);
  }));
}
