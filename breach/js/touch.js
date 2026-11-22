// Phone and tablet controls: a floating stick on the left, look by dragging on the right,
// and buttons for everything the keyboard does. Fire can be held and dragged to aim at the same time.
import { t } from './i18n.js';

const LOOK_K = 2.0; // touch pixels count double against the mouse sensitivity

export function setupTouch({ input, look, getGame, actions }) {
  document.body.classList.add('touch');
  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div class="tz tz-move"></div>
    <div class="tz tz-look"></div>
    <div class="stick" hidden><div class="knob"></div></div>
    <button class="tb tb-pause" data-a="pause" aria-label="pause">II</button>
    <button class="tb tb-score" data-a="score">☰</button>
    <button class="tb tb-buy" data-a="buy">$</button>
    <button class="tb tb-fire" data-a="fire"></button>
    <button class="tb tb-alt" data-a="alt">◎</button>
    <button class="tb tb-jump" data-a="jump">⤒</button>
    <button class="tb tb-crouch" data-a="crouch">⤓</button>
    <button class="tb tb-reload" data-a="reload">R</button>
    <button class="tb tb-use" data-a="use">E</button>
    <button class="tb tb-next" data-a="next">⇄</button>
    <button class="tb tb-nade" data-a="nade">●</button>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const stick = $('.stick'), knob = $('.knob');
  input.stick = { x: 0, y: 0 };
  input.touch = { jump: false, crouch: false };

  const owners = new Map(); // touch id -> what it controls
  let stickId = null, sx = 0, sy = 0;
  const R = 56;
  const setStick = (x, y) => {
    let dx = x - sx, dy = y - sy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.stick.x = dx / R;
    input.stick.y = dy / R;
  };
  const lookStart = (id, x, y) => owners.set(id, { kind: 'look', x, y });

  const begin = (e) => {
    const g = getGame();
    for (const tch of e.changedTouches) {
      const el = tch.target.closest ? tch.target.closest('[data-a], .tz') : null;
      if (!el) continue;
      if (el.classList.contains('tz-move')) {
        if (stickId !== null) continue;
        stickId = tch.identifier;
        sx = tch.clientX;
        sy = tch.clientY;
        stick.hidden = false;
        stick.style.left = `${sx - 70}px`;
        stick.style.top = `${sy - 70}px`;
        setStick(sx, sy);
        owners.set(tch.identifier, { kind: 'stick' });
      } else if (el.classList.contains('tz-look')) {
        lookStart(tch.identifier, tch.clientX, tch.clientY);
        // a tap while dead looks at the next player
        if (g && !g.player.alive) g.playerAction('next');
      } else {
        const a = el.dataset.a;
        el.classList.add('on');
        owners.set(tch.identifier, { kind: 'btn', a, el, x: tch.clientX, y: tch.clientY });
        if (a === 'fire') {
          input.fire = true;
          if (g && !g.player.alive) g.playerAction('next');
        } else if (a === 'jump') input.touch.jump = true;
        else if (a === 'crouch') input.touch.crouch = !input.touch.crouch;
        else if (a === 'score') actions.board(true);
        else actions.tap(a);
      }
    }
    e.preventDefault();
  };
  const move = (e) => {
    for (const tch of e.changedTouches) {
      const o = owners.get(tch.identifier);
      if (!o) continue;
      if (o.kind === 'stick') setStick(tch.clientX, tch.clientY);
      else if (o.kind === 'look' || (o.kind === 'btn' && o.a === 'fire')) {
        // dragging on the right, or on the fire button, turns the view
        look.dx += (tch.clientX - o.x) * LOOK_K;
        look.dy += (tch.clientY - o.y) * LOOK_K;
        o.x = tch.clientX;
        o.y = tch.clientY;
      }
    }
    e.preventDefault();
  };
  const end = (e) => {
    for (const tch of e.changedTouches) {
      const o = owners.get(tch.identifier);
      if (!o) continue;
      owners.delete(tch.identifier);
      if (o.kind === 'stick') {
        stickId = null;
        stick.hidden = true;
        input.stick.x = input.stick.y = 0;
      } else if (o.kind === 'btn') {
        o.el.classList.remove('on');
        if (o.a === 'fire') input.fire = false;
        else if (o.a === 'jump') input.touch.jump = false;
        else if (o.a === 'score') actions.board(false);
      }
    }
    e.preventDefault();
  };
  root.addEventListener('touchstart', begin, { passive: false });
  root.addEventListener('touchmove', move, { passive: false });
  root.addEventListener('touchend', end, { passive: false });
  root.addEventListener('touchcancel', end, { passive: false });
  // the crouch button shows whether it is on
  const crouchBtn = $('.tb-crouch');
  return {
    show(on) {
      root.hidden = !on;
      if (!on) {
        input.fire = false;
        input.stick.x = input.stick.y = 0;
        input.touch.jump = false;
        input.touch.crouch = false;
        stick.hidden = true;
        stickId = null;
        owners.clear();
      }
    },
    update(g) {
      crouchBtn.classList.toggle('lit', !!input.touch.crouch);
      const p = g.player;
      $('.tb-buy').hidden = !(p.alive && g.canBuy(p) && g.mode !== 'dm' && g.phase !== 'end');
      $('.tb-nade').hidden = !(p.alive && (p.he > 0 || p.flash > 0));
      $('.tb-use').classList.toggle('lit', !!(g.nearHostage() || g.nearDrop(p)));
      $('.tb-alt').hidden = !(p.alive && (p.kind === 'knife' || p.kind === 'sniper'));
    },
    label() {
      $('.tb-fire').setAttribute('aria-label', t('fire'));
    },
  };
}
