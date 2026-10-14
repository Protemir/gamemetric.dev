// Keyboard and touch controls. Every player gets a controller that reports held buttons
// (left, right, up, down, block) and presses (punch, kick, special) since the last poll.

const BUTTONS = ['left', 'right', 'up', 'down', 'block', 'punch', 'kick', 'special', 'taunt'];
const TAPS = new Set(['punch', 'kick', 'special', 'taunt']);

const SOLO = {
  KeyW: 'up', ArrowUp: 'up', KeyA: 'left', ArrowLeft: 'left', KeyS: 'down', ArrowDown: 'down', KeyD: 'right', ArrowRight: 'right',
  KeyJ: 'punch', KeyZ: 'punch', KeyF: 'punch',
  KeyK: 'kick', KeyX: 'kick', KeyG: 'kick',
  KeyL: 'block', KeyC: 'block', KeyH: 'block',
  Space: 'special', KeyV: 'special', KeyR: 'special',
  KeyT: 'taunt', KeyB: 'taunt',
};
const P1 = { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right', KeyF: 'punch', KeyG: 'kick', KeyH: 'block', KeyR: 'special', KeyT: 'taunt' };
const P2 = {
  ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right',
  Comma: 'punch', Numpad1: 'punch', Period: 'kick', Numpad2: 'kick', Slash: 'block', Numpad3: 'block', KeyL: 'special', Numpad0: 'special',
  Numpad8: 'up', Numpad4: 'left', Numpad5: 'down', Numpad6: 'right',
  Semicolon: 'taunt', Numpad7: 'taunt',
};

export class Pad {
  constructor() {
    this.held = new Set();
    this.taps = new Set();
    this.extra = new Set();
  }
  down(b) {
    if (TAPS.has(b)) this.taps.add(b);
    this.held.add(b);
  }
  up(b) {
    this.held.delete(b);
  }
  clear() {
    this.held.clear();
    this.taps.clear();
  }
  poll() {
    const out = {};
    for (const b of BUTTONS) out[b] = TAPS.has(b) ? this.taps.has(b) : this.held.has(b) || this.extra.has(b);
    this.taps.clear();
    return out;
  }
}

export const pads = [new Pad(), new Pad()];
let mode = '1p';
export const setInputMode = (m) => { mode = m; };

function route(code) {
  if (mode === '2p') {
    if (P1[code]) return [0, P1[code]];
    if (P2[code]) return [1, P2[code]];
    return null;
  }
  return SOLO[code] ? [0, SOLO[code]] : null;
}

export function bindKeyboard(isActive) {
  window.addEventListener('keydown', (e) => {
    if (!isActive() || e.metaKey || e.ctrlKey || e.altKey) return;
    const r = route(e.code);
    if (!r) return;
    e.preventDefault();
    if (e.repeat) return;
    pads[r[0]].down(r[1]);
  });
  window.addEventListener('keyup', (e) => {
    const r = route(e.code);
    if (r) pads[r[0]].up(r[1]);
  });
  window.addEventListener('blur', () => pads.forEach((p) => p.clear()));
}

// thumb stick on the left, four buttons on the right
export function bindTouch(root) {
  const stick = root.querySelector('.stick');
  const knob = stick.querySelector('.knob');
  const base = stick.querySelector('.base');
  const pad = pads[0];
  let id = null;
  let ox = 0;
  let oy = 0;
  const dirs = ['left', 'right', 'up', 'down'];
  const set = (dx, dy) => {
    // eight directions by angle, so a thumb drifting a little up while walking does not jump
    const on = { left: false, right: false, up: false, down: false };
    if (Math.hypot(dx, dy) > 18) {
      const sector = Math.round(Math.atan2(-dy, dx) / (Math.PI / 4));
      const dirsBy = { 0: ['right'], 1: ['right', 'up'], 2: ['up'], 3: ['left', 'up'], 4: ['left'], '-4': ['left'], '-3': ['left', 'down'], '-2': ['down'], '-1': ['right', 'down'] };
      for (const d of dirsBy[sector] || []) on[d] = true;
    }
    for (const d of dirs) {
      if (on[d]) pad.held.add(d);
      else pad.held.delete(d);
    }
    const len = Math.hypot(dx, dy);
    const k = len > 40 ? 40 / len : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  };
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    id = e.pointerId;
    try { stick.setPointerCapture(id); } catch { /* synthetic events */ }
    const r = stick.getBoundingClientRect();
    ox = e.clientX;
    oy = e.clientY;
    base.style.left = `${ox - r.left}px`;
    base.style.top = `${oy - r.top}px`;
    stick.classList.add('on');
    set(0, 0);
  });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    set(e.clientX - ox, e.clientY - oy);
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    stick.classList.remove('on');
    set(0, 0);
  };
  stick.addEventListener('pointerup', end);
  stick.addEventListener('pointercancel', end);

  for (const btn of root.querySelectorAll('[data-btn]')) {
    const b = btn.dataset.btn;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
      btn.classList.add('on');
      pad.down(b);
    });
    const up = () => {
      btn.classList.remove('on');
      pad.up(b);
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}

// ---------- gamepads ----------
// Standard mapping: X / Square punch, A / Cross kick, B / Circle or bumpers block,
// Y / Triangle or triggers special, Select taunt, Start pause. D-pad or left stick to move.

const padPrev = new Map();
const GP_TAP = { 2: 'punch', 0: 'kick', 3: 'special', 6: 'special', 7: 'special', 8: 'taunt' };
const GP_HOLD = { 1: 'block', 4: 'block', 5: 'block', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };

export function pollGamepads(onStart, onAny) {
  if (!navigator.getGamepads) return 0;
  const list = [...navigator.getGamepads()].filter(Boolean);
  pads.forEach((p) => p.extra.clear());
  list.forEach((gp, n) => {
    const player = mode === '2p' ? Math.min(n, 1) : 0;
    const pad = pads[player];
    const prev = padPrev.get(gp.index) || [];
    const now = gp.buttons.map((b) => b.pressed || b.value > 0.5);
    now.forEach((on, i) => {
      if (on && !prev[i]) {
        if (GP_TAP[i]) pad.taps.add(GP_TAP[i]);
        if (i === 9 && onStart) onStart();
        if (onAny) onAny(i);
      }
      if (on && GP_HOLD[i]) pad.extra.add(GP_HOLD[i]);
    });
    const ax = gp.axes[0] || 0;
    const ay = gp.axes[1] || 0;
    if (ax < -0.5) pad.extra.add('left');
    if (ax > 0.5) pad.extra.add('right');
    if (ay < -0.6) pad.extra.add('up');
    if (ay > 0.6) pad.extra.add('down');
    padPrev.set(gp.index, now);
  });
  return list.length;
}
