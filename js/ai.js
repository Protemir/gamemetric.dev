// The computer opponent. It looks at the fight every few frames and then "holds" and "presses"
// the same buttons a person would, so it follows exactly the same rules.

export const LEVELS = {
  easy: { every: 22, block: 0.12, anti: 0.06, punish: 0.1, throw: 0.04, special: 0.16, aggro: 0.5, combo: 0.08, jump: 0.06, idle: 0.3 },
  normal: { every: 12, block: 0.4, anti: 0.32, punish: 0.4, throw: 0.16, special: 0.28, aggro: 0.62, combo: 0.45, jump: 0.1, idle: 0.12 },
  hard: { every: 6, block: 0.7, anti: 0.66, punish: 0.75, throw: 0.3, special: 0.36, aggro: 0.72, combo: 0.85, jump: 0.1, idle: 0.04 },
};

export class AI {
  constructor(level, rand) {
    this.lv = LEVELS[level] || LEVELS.normal;
    this.rand = rand;
    this.wait = 30;
    this.hold = null;
    this.press = null;
    this.airKick = false;
  }

  input(me, op, m) {
    const out = { left: false, right: false, up: false, down: false, block: false, punch: false, kick: false, special: false };
    const toward = op.x >= me.x ? 1 : -1;
    if (this.hold) {
      const h = this.hold;
      if (h.dir) {
        const right = h.dir * toward > 0;
        out.right = right;
        out.left = !right;
      }
      out.down = !!h.down;
      out.block = !!h.block;
      out.up = !!h.up;
      if (--h.frames <= 0) this.hold = null;
    }
    if (this.press && --this.press.delay <= 0) {
      out[this.press.b] = true;
      if (this.press.down) out.down = true;
      if (this.press.fwd) {
        out.right = toward > 0;
        out.left = toward < 0;
      }
      this.press = null;
    }
    // jump-in kick when close enough
    if (this.airKick && me.state === 'air' && Math.abs(op.x - me.x) < 150 && me.vy < 200) {
      out.kick = true;
      this.airKick = false;
    }
    if (me.state !== 'air' && me.state !== 'prejump') this.airKick = false;

    // follow up a hit with more hits
    if (m.phase === 'fight' && me.state === 'attack' && me.move && me.move.hit && !this.press && this.rand() < this.lv.combo * 0.25) {
      const id = me.move.id;
      if (id === 'jab') this.press = { b: 'punch', down: this.rand() < 0.45, delay: 2 };
      else if (id === 'kick' && me.cool <= 0 && this.rand() < 0.5) this.press = { b: 'special', delay: 2 };
    }

    if (--this.wait <= 0) {
      this.wait = this.lv.every + Math.floor(this.rand() * this.lv.every * 0.6);
      this.decide(me, op, m);
    }
    return out;
  }

  decide(me, op, m) {
    const R = this.rand;
    const lv = this.lv;
    const dist = Math.abs(op.x - me.x);
    const go = (dir, frames, extra = {}) => { this.hold = { dir, frames, ...extra }; };
    const hit = (b, opts = {}) => { this.press = { b, delay: 1, ...opts }; };

    if (m.phase === 'finish' && m.winner === me) {
      if (dist > 200) go(1, 10);
      else if (R() < (lv === LEVELS.easy ? 0.4 : 0.9)) hit('special');
      return;
    }
    if (m.phase !== 'fight') {
      this.hold = null;
      return;
    }
    if (!me.actionable) return;

    const opMove = op.state === 'attack' && op.move ? op.move : null;
    const threat = opMove && opMove.t < opMove.d.s + opMove.d.a && dist < 170;
    const recovering = opMove && opMove.t >= opMove.d.s + opMove.d.a && !opMove.d.air;
    const proj = m.proj.find((p) => p.owner === op && Math.sign(me.x - p.x) === Math.sign(p.vx) && Math.abs(me.x - p.x) < 380);
    const lasso = op.lasso && op.lasso.out;

    if ((proj || lasso) && R() < lv.block + 0.15) {
      if (proj && dist > 260 && R() < 0.4) go(1, 4, { up: true });
      else go(0, 26, { block: true });
      return;
    }
    if (threat && R() < lv.block) {
      go(0, 20, { block: true, down: opMove.d.lvl === 'low' || (opMove.d.lvl === 'high' && R() < 0.5) });
      return;
    }
    if (op.y > 40 && dist < 190 && op.state !== 'fall' && R() < lv.anti) {
      hit('punch', { down: true });
      return;
    }
    if (recovering && dist < 125 && R() < lv.punish) {
      hit(R() < 0.6 ? 'punch' : 'kick', { down: R() < 0.6 });
      return;
    }
    if (op.state === 'stun' || op.state === 'dizzy') {
      if (dist > 90) go(1, 8);
      else hit('punch', { down: R() < 0.5 });
      return;
    }
    if (op.state === 'down' || op.state === 'rise' || op.state === 'fall') {
      if (R() < 0.5) go(1, 10);
      else this.hold = null;
      return;
    }
    if (R() < lv.idle) {
      this.hold = null;
      return;
    }
    if (dist > 230) {
      if (me.cool <= 0 && R() < lv.special) hit('special');
      else if (R() < lv.jump) {
        go(1, 4, { up: true });
        this.airKick = true;
      } else if (R() < lv.aggro) go(1, 14 + Math.floor(R() * 20));
      else go(R() < 0.5 ? -1 : 0, 10);
      return;
    }
    if (dist > 115) {
      const r = R();
      if (r < 0.45) go(1, 8 + Math.floor(R() * 10));
      else if (r < 0.6) {
        go(1, 4, { up: true });
        this.airKick = true;
      } else if (r < 0.72 && dist < 140) hit('kick', { down: true });
      else if (r < 0.82 && me.cool <= 0) hit('special');
      else go(0, 12, { block: R() < lv.block });
      return;
    }
    // close range
    const blocking = op.state === 'block' || op.state === 'blockstun';
    if (blocking && R() < lv.throw * 2.5) {
      hit('punch', { fwd: true });
      return;
    }
    const r = R();
    if (r < 0.3) hit('punch');
    else if (r < 0.5) hit('kick');
    else if (r < 0.62) hit('kick', { down: true });
    else if (r < 0.7) hit('punch', { down: true });
    else if (r < 0.7 + lv.throw) hit('punch', { fwd: true });
    else if (r < 0.9) go(0, 14, { block: true });
    else go(-1, 12);
  }
}
