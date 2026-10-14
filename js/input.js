// Keyboard and touch controls. Every player gets a controller that reports held buttons
// (left, right, up, down, block) and presses (punch, kick, special) since the last poll.

const BUTTONS = ['left', 'right', 'up', 'down', 'block', 'punch', 'kick', 'special'];
const TAPS = new Set(['punch', 'kick', 'special']);

const SOLO = {
  KeyW: 'up', ArrowUp: 'up', KeyA: 'left', ArrowLeft: 'left', KeyS: 'down', ArrowDown: 'down', KeyD: 'right', ArrowRight: 'right',
  KeyJ: 'punch', KeyZ: 'punch', KeyF: 'punch',
  KeyK: 'kick', KeyX: 'kick', KeyG: 'kick',
  KeyL: 'block', KeyC: 'block', KeyH: 'block',
  Space: 'special', KeyV: 'special', KeyR: 'special',
};
const P1 = { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right', KeyF: 'punch', KeyG: 'kick', KeyH: 'block', KeyR: 'special' };
const P2 = {
  ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right',
  Comma: 'punch', Numpad1: 'punch', Period: 'kick', Numpad2: 'kick', Slash: 'block', Numpad3: 'block', KeyL: 'special', Numpad0: 'special',
  Numpad8: 'up', Numpad4: 'left', Numpad5: 'down', Numpad6: 'right',
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
    const on = { left: dx < -16, right: dx > 16, up: dy < -24, down: dy > 20 };
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
