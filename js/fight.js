import { fighterById } from './fighters.js';
import { posesFor, mixPose, copyPose } from './pose.js';
import { rng } from './util.js';

// The fight itself: two fighters, projectiles, effects, rounds. No DOM and no sound here,
// everything the outside world cares about goes out through emit(type, data).

export const DT = 1 / 60;
export const STAGE = 680;
export const ROUND_TIME = 60;
export const WINS = 2;
const GRAV = 2600;
const GAP = 58;
const MAX_SEP = 640;

export const NO_INPUT = Object.freeze({ left: false, right: false, up: false, down: false, block: false, punch: false, kick: false, special: false });

const ACTIONABLE = new Set(['idle', 'walk', 'crouch', 'block']);
const TURNABLE = new Set(['idle', 'walk', 'crouch', 'block', 'land', 'stun', 'dizzy', 'prejump']);
const THROWABLE = new Set(['idle', 'walk', 'crouch', 'block', 'land', 'prejump', 'attack']);
const NO_HURT = new Set(['down', 'rise', 'out', 'thrown', 'carried', 'dance', 'pulled', 'win', 'lose']);

export class Fighter {
  constructor(def, idx, palette, m) {
    this.def = def;
    this.idx = idx;
    this.pal = def.palettes[palette % def.palettes.length];
    this.m = m;
    this.poses = posesFor(def.id);
    this.stats = { hits: 0, maxCombo: 0, dmg: 0 };
    this.reset();
  }

  reset() {
    this.x = this.idx ? 170 : -170;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.push = 0;
    this.face = this.idx ? -1 : 1;
    this.hp = 100;
    this.state = 'idle';
    this.t = 0;
    this.dur = 0;
    this.move = null;
    this.cool = 0;
    this.combo = 0;
    this.juggle = 0;
    this.buffer = null;
    this.bubble = null;
    this.sayCool = 0;
    this.airUsed = false;
    this.flip = 0;
    this.lasso = null;
    this.grab = null;
    this.crouching = false;
    this.flash = 0;
    this.dance = 0;
    this.pose = copyPose(this.poses.stance);
  }

  set(state, dur = 0) {
    this.state = state;
    this.t = 0;
    this.dur = dur;
  }

  get grounded() { return this.y <= 0 && !['air', 'fall', 'ko', 'thrown', 'carried'].includes(this.state); }
  get actionable() { return ACTIONABLE.has(this.state) || (this.state === 'land' && this.t > 3); }

  say(key, force) {
    const list = this.def.say[key];
    if (!list || (!force && this.sayCool > 0)) return;
    const text = list[Math.floor(this.m.rand() * list.length)];
    this.bubble = { text, t: 95 };
    this.sayCool = 150;
    this.m.emit('say', { f: this, text });
  }

  hurtbox() {
    if (NO_HURT.has(this.state)) return null;
    if (this.state === 'fall' && this.juggle >= 4) return null;
    // the loser can't be touched until "АЯҚТА!" has been shown
    if (this.m.phase === 'finish' && this.m.loser === this && this.m.pt < 40) return null;
    const h = this.def.hurt;
    const w = h.w;
    if (this.y > 0 || this.state === 'fall' || this.state === 'ko') return [this.x - w, this.y + 8, this.x + w, this.y + 150];
    const top = this.crouching ? h.crouch : h.stand;
    return [this.x - w, 0, this.x + w, top];
  }

  hitbox() {
    const mv = this.move;
    if (this.state !== 'attack' || !mv || mv.hit) return null;
    const d = mv.d;
    if (mv.t < d.s || mv.t >= d.s + d.a) return null;
    const b = d.box;
    const y0 = d.air ? this.y : 0;
    return this.face > 0
      ? [this.x + b[0], y0 + b[1], this.x + b[2], y0 + b[3]]
      : [this.x - b[2], y0 + b[1], this.x - b[0], y0 + b[3]];
  }

  startMove(id) {
    const d = this.def.moves[id];
    this.move = { id, d, t: 0, hit: false };
    this.set('attack');
    this.crouching = id === 'sweep';
    if (d.air) this.airUsed = true;
    this.m.emit('whoosh', { f: this, heavy: id === 'upper' || id === 'sweep' });
  }

  update(inp, op) {
    const m = this.m;
    this.t++;
    if (this.cool > 0) this.cool--;
    if (this.sayCool > 0) this.sayCool--;
    if (this.flash > 0) this.flash--;
    if (this.bubble && --this.bubble.t <= 0) this.bubble = null;

    const fwd = this.face > 0 ? inp.right : inp.left;
    const back = this.face > 0 ? inp.left : inp.right;
    for (const b of ['punch', 'kick', 'special']) if (inp[b]) this.buffer = { b, t: 9, down: inp.down, fwd };
    const buf = this.buffer;
    if (buf && --buf.t <= 0) this.buffer = null;

    // the winner can start a finisher during "АЯҚТА!"
    if (m.phase === 'finish' && m.winner === this && buf && buf.b === 'special' && this.actionable && Math.abs(op.x - this.x) < 330) {
      this.buffer = null;
      m.startFinisher(this, op);
      return;
    }
    this.control(inp, op, fwd, back, buf);
    this.tick(op);
  }

  control(inp, op, fwd, back, buf) {
    // directions held when the button was pressed still count (presses made during a hit freeze)
    const down = inp.down || (buf && buf.down);
    const toward = fwd || (buf && buf.fwd);
    // ground control
    if (this.actionable || (this.state === 'land' && buf)) {
      if (buf) {
        this.buffer = null;
        if (buf.b === 'punch') {
          if (toward && this.canThrow(op)) return this.startThrow(op);
          return this.startMove(down ? 'upper' : 'jab');
        }
        if (buf.b === 'kick') return this.startMove(down ? 'sweep' : 'kick');
        if (buf.b === 'special') {
          if (this.cool <= 0) return this.startSpecial();
          this.m.emit('nope', { f: this });
        }
      }
      if (inp.block) {
        this.crouching = inp.down;
        if (this.state !== 'block') this.set('block');
      } else if (inp.up) {
        this.crouching = false;
        this.set('prejump');
        this.jdir = fwd ? 1 : back ? -1 : 0;
      } else if (inp.down) {
        this.crouching = true;
        if (this.state !== 'crouch') this.set('crouch');
      } else if (fwd || back) {
        this.crouching = false;
        if (this.state !== 'walk') this.set('walk');
        this.x += this.face * (fwd ? this.def.walk : -this.def.back) * DT;
      } else {
        this.crouching = false;
        if (this.state !== 'idle') this.set('idle');
      }
      return;
    }

    // combos: a move that hit can be cancelled into the next one
    if (this.state === 'attack' && this.move.hit && buf && this.move.d.cancel && !this.move.d.air) {
      const want = buf.b === 'punch' ? (down ? 'upper' : 'jab') : buf.b === 'kick' ? (down ? 'sweep' : 'kick') : 'special';
      if (this.move.d.cancel.includes(want)) {
        this.buffer = null;
        if (want !== 'special') return this.startMove(want);
        if (this.cool <= 0) return this.startSpecial();
      }
      return;
    }

    // air attacks
    if (this.state === 'air' && buf && !this.airUsed && buf.b !== 'special') {
      this.buffer = null;
      this.flip = 0;
      this.pose.rot = 0;
      this.startMove(buf.b === 'punch' ? 'airP' : 'airK');
    }
  }

  // timers and physics, also runs while the fighter has no control
  tick(op) {
    const m = this.m;
    const st = this.state;
    if (st === 'prejump' && this.t >= 4) {
      this.set('air');
      this.vy = this.def.jump;
      this.vx = this.jdir * this.def.jumpX * this.face;
      this.flip = this.jdir;
      this.airUsed = false;
      m.emit('jump', { f: this });
    }
    if (st === 'attack') {
      const mv = this.move;
      mv.t++;
      const d = mv.d;
      if (!d.air && mv.t >= d.s + d.a + d.r) {
        this.move = null;
        this.crouching = false;
        this.set('idle');
      } else if (d.air && mv.t >= d.s + d.a + 6) {
        this.move = null;
        this.set('air');
      }
    }
    if (st === 'special') this.tickSpecial(op);
    if (st === 'throwing') this.tickThrow(op);
    if ((st === 'hit' || st === 'blockstun') && this.t >= this.dur) {
      if (this.hp <= 0 && m.phase === 'finish') {
        this.set('dizzy');
        this.say('dizzy', true);
      } else if (st === 'blockstun' && m.inputs[this.idx].block) {
        // still holding block: no one-frame gap between two blocked hits
        this.set('block');
      } else {
        this.set(this.crouching ? 'crouch' : 'idle');
      }
      this.combo = 0;
    }
    if (st === 'recover' && this.t >= this.dur) this.set('idle');
    if (st === 'stun' && this.t >= this.dur) {
      this.set('idle');
      this.combo = 0;
    }
    if (st === 'land' && this.t >= 5) this.set('idle');
    if (st === 'down' && this.t >= this.dur) this.set('rise');
    if (st === 'rise' && this.t >= 16) {
      this.set('idle');
      this.combo = 0;
      this.juggle = 0;
    }
    if (st === 'block' && this.t > 1 && !this.m.inputs[this.idx].block) this.set('idle');

    // physics
    const airborne = this.y > 0 || st === 'air' || st === 'fall' || st === 'ko' || (st === 'attack' && this.move && this.move.d.air);
    if (airborne && st !== 'thrown' && st !== 'carried') {
      this.vy -= GRAV * DT;
      this.x += this.vx * DT;
      this.y += this.vy * DT;
      if (this.y <= 0 && this.vy < 0) this.landNow();
    } else if (st !== 'thrown' && st !== 'carried' && st !== 'pulled') {
      this.x += this.push * DT;
      this.push *= 0.84;
      if (Math.abs(this.push) < 4) this.push = 0;
    }
  }

  landNow() {
    const m = this.m;
    this.y = 0;
    const st = this.state;
    // a full somersault or a KO spin ends where it started, so drop the extra turns
    this.pose.rot = closestTurn(this.pose.rot, st === 'fall' || st === 'ko' ? -1.5 : 0);
    if (this.hp <= 0 && m.phase === 'finish' && st !== 'fall' && st !== 'ko') {
      this.vx = 0;
      this.vy = 0;
      this.set('dizzy');
      return;
    }
    if (st === 'fall' || st === 'ko') {
      if (Math.abs(this.vy) > 700 && !this.bounced) {
        this.bounced = true;
        this.vy = 300;
        this.vx *= 0.5;
        m.dust(this.x, 1.2);
        m.emit('thud', { f: this });
        return;
      }
      this.bounced = false;
      this.vy = 0;
      this.vx = 0;
      m.dust(this.x, 1.4);
      m.emit('thud', { f: this, big: true });
      if (this.throwWord) {
        m.word(this.x, 70, this.throwWord);
        this.throwWord = null;
      }
      if (st === 'ko' || this.hp <= 0) {
        this.set('out');
      } else {
        this.set('down', 34);
      }
      return;
    }
    this.vy = 0;
    this.vx = 0;
    this.flip = 0;
    if (st === 'attack') this.move = null;
    this.set('land');
    m.dust(this.x, 0.6);
    m.emit('land', { f: this });
  }

  canThrow(op) {
    return op.grounded && THROWABLE.has(op.state) && !(op.state === 'attack' && op.move && op.move.d.air) &&
      Math.abs(op.x - this.x) <= this.def.throw.range && this.m.phase === 'fight';
  }

  startThrow(op) {
    this.set('throwing');
    this.grab = { op, kind: this.def.throw.kind };
    this.crouching = false;
    op.set('thrown');
    op.move = null;
    op.lasso = null;
    op.face = -this.face;
    op.crouching = false;
    this.say('throw', true);
    this.m.emit('grab', { f: this, op });
  }

  tickThrow(op) {
    const f = this.face;
    const t = this.t;
    const g = this.grab;
    if (!g) return;
    if (g.kind === 'lift') {
      if (t <= 8) {
        op.x = this.x + f * 58;
        op.y = 0;
        op.throwRot = 0;
      } else if (t <= 24) {
        const k = (t - 8) / 16;
        op.x = this.x + f * 58 * (1 - k);
        op.y = Math.sin(k * Math.PI * 0.5) * 120;
        op.throwRot = -1.6 * k;
      } else if (t <= 30) {
        const k = (t - 24) / 6;
        op.x = this.x - f * 50 * k;
        op.y = 120 - 20 * k;
        op.throwRot = -1.6 - 0.8 * k;
      }
      if (t === 30) this.release(op, -f * 380, 260);
      if (t >= 44) this.endThrow();
    } else {
      if (t <= 10) {
        op.x = this.x + f * 60;
        op.y = 0;
      } else if (t <= 28) {
        op.x = this.x + f * (60 + Math.sin(t * 1.3) * 5);
        if (t === 12) op.bubble = { text: 'Ой-ой-ой!', t: 60 };
        if (t % 6 === 0) this.m.emit('shake', { f: this });
      }
      if (t === 30) this.release(op, f * 430, 430);
      if (t >= 42) this.endThrow();
    }
  }

  release(op, vx, vy) {
    const m = this.m;
    const dmg = this.def.throw.dmg;
    op.set('fall');
    op.vx = vx;
    op.vy = vy;
    op.throwRot = 0;
    op.throwWord = this.def.throw.word;
    m.damage(this, op, dmg);
    m.shake = Math.max(m.shake, 8);
    m.emit('throw', { f: this, op });
  }

  endThrow() {
    this.grab = null;
    this.set('idle');
  }

  startSpecial() {
    const sp = this.def.spec;
    this.set('special');
    this.cool = sp.cd;
    this.crouching = false;
    this.say('special', true);
    this.m.emit('special', { f: this });
  }

  tickSpecial(op) {
    const sp = this.def.spec;
    const m = this.m;
    if (sp.kind === 'lasso') {
      if (!this.lasso && this.t > sp.s) {
        this.set('idle');
        return;
      }
      if (this.t === sp.s) {
        this.lasso = { dist: 0, out: true, caught: null, done: false };
        m.emit('lasso', { f: this });
      }
      const L = this.lasso;
      if (L) {
        if (L.out) {
          L.dist += sp.speed * DT;
          if (L.dist >= sp.range) L.out = false;
        } else if (L.caught) {
          L.dist = Math.max(0, L.dist - sp.speed * 0.9 * DT);
          L.caught.x = this.x + this.face * (40 + L.dist);
          if (L.dist <= 32) {
            const v = L.caught;
            v.set('stun', sp.stun);
            v.x = this.x + this.face * 72;
            v.face = -this.face;
            this.lasso = null;
            this.set('recover', 10);
          }
        } else {
          L.dist -= sp.speed * 1.3 * DT;
          if (L.dist <= 0) {
            this.lasso = null;
            this.set('recover', 12);
          }
        }
      }
    } else if (sp.kind === 'baursak') {
      if (this.t === sp.s) {
        m.proj.push({ k: 'baursak', owner: this, x: this.x + this.face * 40, y: 128, vx: this.face * sp.vx, vy: sp.vy, g: sp.g, spin: 0, dead: false });
        m.emit('toss', { f: this });
      }
      if (this.t >= sp.s + sp.r) this.set('idle');
    }
  }

  lassoPoint() {
    return [this.x + this.face * (40 + this.lasso.dist), 128];
  }
}

export class Match {
  constructor(opts) {
    const { p1 = 'batyr', p2 = 'apa', seed = 7 } = opts;
    const pal2 = p1 === p2 ? 1 : 0;
    this.rand = rng(seed);
    this.emit = opts.onEvent || (() => {});
    this.f = [new Fighter(fighterById(p1), 0, 0, this), new Fighter(fighterById(p2), 1, pal2, this)];
    this.wins = [0, 0];
    this.round = 0;
    this.fx = [];
    this.proj = [];
    this.inputs = [NO_INPUT, NO_INPUT];
    this.hitstop = 0;
    this.shake = 0;
    this.flash = 0;
    this.slow = 0;
    this.frame = 0;
    this.crowd = 0;
    this.result = null;
    this.startRound();
  }

  startRound() {
    this.round++;
    this.time = ROUND_TIME * 60;
    this.phase = 'intro';
    this.pt = 0;
    for (const f of this.f) f.reset();
    this.proj = [];
    this.fx = [];
    this.winner = null;
    this.loser = null;
    this.fin = null;
    this.eagle = null;
    this.final = this.wins[0] === WINS - 1 && this.wins[1] === WINS - 1;
  }

  get timeScale() { return this.slow > 0 ? 0.3 : 1; }

  control(f) {
    return this.phase === 'fight' || (this.phase === 'finish' && f === this.winner);
  }

  step(inputs) {
    this.frame++;
    this.pt++;
    if (this.slow > 0) this.slow--;
    this.shake *= 0.86;
    if (this.shake < 0.2) this.shake = 0;
    this.flash *= 0.84;
    this.crowd = Math.max(0, this.crowd - 0.006);
    this.stepFx();
    this.phaseLogic();

    const ins = this.f.map((f, i) => (this.control(f) ? inputs[i] || NO_INPUT : NO_INPUT));
    this.inputs = ins;

    if (this.hitstop > 0) {
      this.hitstop--;
      // keep presses made during the freeze
      this.f.forEach((f, i) => {
        const fwd = f.face > 0 ? ins[i].right : ins[i].left;
        for (const b of ['punch', 'kick', 'special']) if (ins[i][b]) f.buffer = { b, t: 9, down: ins[i].down, fwd };
      });
      return;
    }

    const [a, b] = this.f;
    a.update(ins[0], b);
    b.update(ins[1], a);
    this.collide();
    this.stepProj();
    this.checkHits(a, b);
    this.checkHits(b, a);
    this.stepLasso(a, b);
    this.stepLasso(b, a);
    if (this.phase === 'fight') {
      this.time--;
      if (this.time <= 0) this.timeUp();
    }
    animate(a);
    animate(b);
  }

  phaseLogic() {
    const [a, b] = this.f;
    if (this.phase === 'intro') {
      if (this.pt === 1) this.emit('round', { n: this.round, final: this.final });
      if (this.round === 1 && this.pt === 14) a.say('intro', true);
      if (this.round === 1 && this.pt === 46) b.say('intro', true);
      if (this.pt === 76) {
        this.phase = 'fight';
        this.pt = 0;
        this.emit('fight', {});
      }
    } else if (this.phase === 'ko') {
      const v = this.loser;
      if (v.state === 'out' && v.t === 60) {
        this.winner.set('win');
        this.winner.say('win', true);
        this.phase = 'roundEnd';
        this.pt = 0;
        this.emit('roundWin', { f: this.winner });
      }
    } else if (this.phase === 'finish') {
      if (this.pt === 26) this.emit('finishHim', {});
      if (this.pt > 26 && this.pt === 26 + 270 && this.loser.state === 'dizzy') {
        // nobody finished: they fall over on their own
        this.loser.set('ko');
        this.loser.vy = 300;
        this.loser.vx = -this.loser.face * 60;
        this.phase = 'ko';
        this.pt = 0;
      }
    } else if (this.phase === 'finisher') {
      this.stepFinisher();
    } else if (this.phase === 'timeup') {
      if (this.pt === 80) {
        this.phase = 'roundEnd';
        this.pt = 0;
        if (this.winner) this.emit('roundWin', { f: this.winner });
        else this.emit('draw', {});
      }
    } else if (this.phase === 'roundEnd') {
      if (this.pt === 120) {
        const done = this.wins[0] >= WINS || this.wins[1] >= WINS || this.round >= 6;
        if (done) {
          this.phase = 'over';
          const w = this.wins[0] === this.wins[1] ? null : this.wins[0] > this.wins[1] ? a : b;
          this.result = { winner: w, wins: [...this.wins], flawless: !!w && w.hp >= 100 };
          this.emit('over', this.result);
        } else {
          this.startRound();
        }
      }
    }
  }

  timeUp() {
    const [a, b] = this.f;
    this.phase = 'timeup';
    this.pt = 0;
    this.proj = [];
    for (const f of this.f) {
      f.lasso = null;
      f.move = null;
      if (f.y <= 0 && !['down', 'rise', 'fall'].includes(f.state)) f.set('idle');
    }
    if (a.hp !== b.hp) {
      this.winner = a.hp > b.hp ? a : b;
      this.loser = this.winner === a ? b : a;
      this.wins[this.winner.idx]++;
      this.winner.set('win');
      this.loser.set('lose');
      this.winner.say('win', true);
    } else {
      a.set('lose');
      b.set('lose');
    }
    this.emit('timeup', {});
  }

  collide() {
    const [a, b] = this.f;
    const solid = (f) => !['thrown', 'carried', 'out', 'down', 'pulled'].includes(f.state);
    if (solid(a) && solid(b) && Math.abs(a.y - b.y) < 110) {
      const dx = b.x - a.x;
      const d = Math.abs(dx);
      if (d < GAP) {
        const s = dx === 0 ? (a.face > 0 ? 1 : -1) : Math.sign(dx);
        const need = (GAP - d) / 2;
        a.x -= s * need;
        b.x += s * need;
      }
    }
    for (const f of this.f) if (f.state !== 'carried') f.x = Math.max(-STAGE, Math.min(STAGE, f.x));
    // never further apart than one screen
    const dx = b.x - a.x;
    if (Math.abs(dx) > MAX_SEP && solid(a) && solid(b)) {
      const over = (Math.abs(dx) - MAX_SEP) / 2;
      const s = Math.sign(dx);
      a.x += s * over;
      b.x -= s * over;
    }
    for (const [f, o] of [[a, b], [b, a]]) {
      if (TURNABLE.has(f.state) && f.y <= 0 && Math.abs(o.x - f.x) > 6) f.face = o.x > f.x ? 1 : -1;
    }
  }

  checkHits(att, def) {
    const box = att.hitbox();
    if (!box) return;
    const hurt = def.hurtbox();
    if (!hurt || !overlap(box, hurt)) return;
    att.move.hit = true;
    const x = (Math.max(box[0], hurt[0]) + Math.min(box[2], hurt[2])) / 2;
    const y = (Math.max(box[1], hurt[1]) + Math.min(box[3], hurt[3])) / 2;
    this.applyHit(att, def, att.move.d, x, y);
  }

  canBlock(def, lvl, dir) {
    if (def.state !== 'block' && def.state !== 'blockstun') return false;
    if (def.face === dir) return false;
    if (lvl === 'low') return def.crouching;
    return true;
  }

  applyHit(att, def, d, x, y, opts = {}) {
    if (this.phase !== 'fight' && this.phase !== 'finish') return;
    const dir = def.x === att.x ? att.face : Math.sign(def.x - att.x);
    if (this.canBlock(def, d.lvl, dir)) {
      def.set('blockstun', d.bs || 10);
      def.push = dir * (d.push || 120) * 0.8;
      if (opts.chip) this.damage(att, def, opts.chip, true);
      this.hitstop = 5;
      this.fx.push({ k: 'block', x, y, t: 0, life: 14 });
      this.emit('block', { f: def, att });
      return;
    }
    const scale = Math.max(0.4, 1 - 0.12 * def.combo);
    const dmg = Math.max(1, Math.round(d.dmg * scale));
    def.combo++;
    def.flash = 6;
    if (def.lasso) {
      if (def.lasso.caught) def.lasso.caught.set('idle');
      def.lasso = null;
    }
    if (def.state === 'throwing' && def.grab) def.grab = null;
    att.stats.hits++;
    att.stats.maxCombo = Math.max(att.stats.maxCombo, def.combo);
    const heavy = d.sfx === 'heavy' || d.sfx === 'pot' || !!d.launch;
    const wasDizzy = def.state === 'dizzy';
    this.damage(att, def, dmg);
    const airborne = def.y > 0 || def.state === 'fall' || def.state === 'air';
    if (wasDizzy || (def.hp <= 0 && this.phase === 'finish' && this.loser === def)) {
      def.set('ko');
      def.vx = dir * 280;
      def.vy = 820;
      this.phase = 'ko';
      this.pt = 0;
      this.slow = 40;
      this.flash = 1;
      this.emit('ko', { f: def, att, final: true });
    } else if (def.hp <= 0) {
      this.ko(att, def, dir);
    } else if (d.launch || airborne) {
      def.juggle++;
      def.set('fall');
      def.move = null;
      def.vx = dir * (d.launch ? d.launch[0] : 160);
      def.vy = d.launch ? d.launch[1] : Math.max(380, def.vy * 0.3 + 380) - def.juggle * 30;
      if (def.y <= 0) def.y = 1;
    } else if (d.trip) {
      def.set('fall');
      def.move = null;
      def.vx = dir * 90;
      def.vy = 340;
      def.y = 1;
    } else {
      def.set('hit', d.hs || 16);
      def.move = null;
      def.push = dir * (d.push || 140);
    }
    // in the corner the attacker bounces back instead
    if (Math.abs(def.x) >= STAGE - 2 && def.state === 'hit') att.push = -dir * (d.push || 140) * 0.6;

    this.hitstop = heavy ? 11 : d.sfx === 'mid' ? 8 : 6;
    this.shake = Math.max(this.shake, heavy ? 11 : d.sfx === 'mid' ? 5 : 2.5);
    this.fx.push({ k: 'spark', x, y, t: 0, life: heavy ? 18 : 13, big: heavy, rot: this.rand() * 6 });
    if (d.word) this.word(x, y + 30, d.word);
    else if (def.combo === 3) this.word(x, y + 30, ['ТАРС!', 'ШАРТ!', 'ДҮҢК!'][Math.floor(this.rand() * 3)]);
    this.crowd = Math.min(1, this.crowd + (heavy ? 0.35 : 0.08) + (def.combo >= 3 ? 0.2 : 0));
    if (this.rand() < 0.22) def.say('hurt');
    if (def.combo === 3 || (heavy && this.rand() < 0.4)) att.say('taunt');
    this.emit('hit', { att, def, d, dmg, heavy, combo: def.combo, x, y });
  }

  damage(att, def, dmg, chip) {
    const before = def.hp;
    // a chip never finishes anyone
    def.hp = Math.max(chip ? Math.min(def.hp, 1) : 0, def.hp - dmg);
    att.stats.dmg += before - def.hp;
    if (def.hp <= 0 && this.phase === 'fight' && !chip && def.state === 'fall' && def.throwWord) this.ko(att, def, Math.sign(def.vx) || att.face, true);
  }

  ko(att, def, dir, thrown) {
    if (this.phase !== 'fight') return;
    this.winner = att;
    this.loser = def;
    this.wins[att.idx]++;
    this.proj = [];
    att.lasso = null;
    const final = this.wins[att.idx] >= WINS;
    this.flash = 1;
    if (final && !thrown) {
      // "АЯҚТА!": the loser stands there dizzy and the winner gets a few seconds
      def.set('hit', 26);
      def.push = dir * 220;
      def.hp = 0;
      this.phase = 'finish';
      this.pt = 0;
      this.slow = 26;
      this.emit('ko', { f: def, att, final: true, stand: true });
      return;
    }
    if (!thrown) {
      def.set('ko');
      def.vx = dir * 300;
      def.vy = 820;
      def.y = Math.max(def.y, 1);
    }
    this.phase = 'ko';
    this.pt = 0;
    this.slow = 42;
    this.crowd = 1;
    this.emit('ko', { f: def, att, final });
  }

  // ---------- projectiles ----------

  stepProj() {
    for (const p of this.proj) {
      p.vy -= p.g * DT;
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      p.spin += 0.3;
      if (p.y < 10 || Math.abs(p.x) > STAGE + 300) {
        p.dead = true;
        if (p.y < 10) this.crumbs(p.x, 12, 6);
        continue;
      }
      const op = this.f[1 - p.owner.idx];
      const hurt = op.hurtbox();
      const r = 16;
      if (hurt && overlap([p.x - r, p.y - r, p.x + r, p.y + r], hurt)) {
        p.dead = true;
        this.crumbs(p.x, p.y, 10);
        const sp = p.owner.def.spec;
        this.applyHit(p.owner, op, { dmg: sp.dmg, lvl: 'mid', hs: 22, bs: 14, push: 280, sfx: 'mid', word: 'ТАРС!' }, p.x, p.y, { chip: 1 });
        this.emit('splat', { f: op });
      }
    }
    // a lasso can catch a baursak
    for (const f of this.f) {
      if (!f.lasso || !f.lasso.out) continue;
      const [lx, ly] = f.lassoPoint();
      for (const p of this.proj) {
        if (!p.dead && p.owner !== f && Math.hypot(p.x - lx, p.y - ly) < 34) {
          p.dead = true;
          f.lasso.out = false;
          this.crumbs(p.x, p.y, 8);
          this.emit('splat', {});
        }
      }
    }
    this.proj = this.proj.filter((p) => !p.dead);
  }

  stepLasso(f, op) {
    const L = f.lasso;
    if (!L || !L.out || L.caught) return;
    const [lx, ly] = f.lassoPoint();
    const hurt = op.hurtbox();
    if (!hurt || !overlap([lx - 24, ly - 30, lx + 24, ly + 30], hurt)) return;
    L.out = false;
    const dir = Math.sign(op.x - f.x) || f.face;
    if (this.canBlock(op, 'mid', dir)) {
      this.fx.push({ k: 'block', x: lx, y: ly, t: 0, life: 14 });
      this.emit('block', { f: op, att: f });
      return;
    }
    L.caught = op;
    op.set('pulled');
    op.move = null;
    op.lasso = null;
    op.y = 0;
    op.vx = 0;
    op.vy = 0;
    op.combo = 0;
    this.hitstop = 6;
    this.damage(f, op, f.def.spec.dmg);
    f.stats.hits++;
    this.word(lx, ly + 30, 'ШАРТ!');
    this.emit('catch', { f, op });
    if (op.hp <= 0) {
      L.caught = null;
      op.set('idle');
      this.ko(f, op, dir);
    }
  }

  // ---------- finishers ----------

  startFinisher(w, v) {
    this.phase = 'finisher';
    this.pt = 0;
    this.fin = { kind: w.def.id === 'apa' ? 'dance' : 'eagle', w, v };
    w.move = null;
    w.lasso = null;
    v.bubble = null;
    if (this.fin.kind === 'eagle') {
      w.set('whistle');
      w.say('finisher', true);
      this.emit('whistle', { f: w });
    } else {
      w.set('clap');
      w.say('finisher', true);
      v.set('dance');
      v.dance = 0;
      this.emit('zhorga', { f: w });
    }
  }

  stepFinisher() {
    const { kind, w, v } = this.fin;
    const t = this.pt;
    if (kind === 'eagle') {
      const side = -w.face;
      if (t === 30) {
        this.eagle = { x: v.x + side * 700, y: 560, t: 0, carry: false, flap: 0 };
        this.emit('screech', {});
      }
      const e = this.eagle;
      if (e) {
        e.t++;
        e.flap += 0.35;
        if (t < 72) {
          const k = (t - 30) / 42;
          const sx = v.x + side * 700;
          e.x = sx + (v.x - sx) * k;
          e.y = 560 + (v.def.hurt.stand + 30 - 560) * (1 - (1 - k) * (1 - k));
        } else {
          if (!e.carry) {
            e.carry = true;
            v.set('carried');
            v.say('carried', true);
            this.emit('grab', {});
          }
          const k = (t - 72) / 130;
          e.x += -side * 2.6;
          e.y += 0.7 + k * k * 6;
          v.x = e.x;
          v.y = Math.max(0, e.y - v.def.hurt.stand - 30);
        }
      }
      if (t === 70) w.set('win');
      if (t === 175) this.emit('ujat', { name: w.def.finisherName });
      if (t === 260) this.endFinisher();
    } else {
      v.dance = Math.min(3.6, 1 + t / 70);
      // the dancer trots back to make room, the crowd claps along
      if (t < 200) v.x += (w.x + w.face * 170 - v.x) * 0.05;
      this.crowd = Math.max(this.crowd, 0.75);
      if (t === 200) {
        v.set('out');
        v.say('tired', true);
        this.dust(v.x, 1.2);
        this.emit('thud', { f: v, big: true });
        w.set('win');
      }
      if (t === 216) this.emit('ujat', { name: w.def.finisherName });
      if (t === 300) this.endFinisher();
    }
  }

  endFinisher() {
    this.phase = 'roundEnd';
    this.pt = 0;
    this.fin.w.say('win', true);
    this.emit('roundWin', { f: this.fin.w, finisher: true });
  }

  // ---------- effects ----------

  word(x, y, text) {
    this.fx.push({ k: 'word', x, y, text, t: 0, life: 46 });
  }

  dust(x, s) {
    for (let n = 0; n < 5; n++) {
      this.fx.push({ k: 'dust', x: x + (this.rand() - 0.5) * 60 * s, y: 4, vx: (this.rand() - 0.5) * 120, s: s * (0.7 + this.rand() * 0.6), t: 0, life: 28 });
    }
  }

  crumbs(x, y, n) {
    for (let k = 0; k < n; k++) {
      this.fx.push({ k: 'crumb', x, y, vx: (this.rand() - 0.5) * 420, vy: 120 + this.rand() * 360, t: 0, life: 40 });
    }
  }

  stepFx() {
    for (const e of this.fx) {
      e.t++;
      if (e.k === 'crumb') {
        e.vy -= 1400 * DT;
        e.x += e.vx * DT;
        e.y = Math.max(2, e.y + e.vy * DT);
      } else if (e.k === 'dust') {
        e.x += e.vx * DT;
      }
    }
    this.fx = this.fx.filter((e) => e.t < e.life);
  }
}

function overlap(a, b) {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

function closestTurn(rot, target) {
  const turn = Math.PI * 2;
  return target + ((((rot - target) % turn) + turn * 1.5) % turn) - turn / 2;
}

// ---------- animation: which pose to show for the current state ----------

const smooth = (p, target, k) => {
  const m = mixPose(p, target, k);
  m.pin = target.pin == null ? null : p.pin == null ? target.pin : p.pin + (target.pin - p.pin) * k;
  return m;
};

export function animate(f) {
  const P = f.poses;
  const st = f.state;
  let target = P.stance;
  let k = 0.35;
  const t = f.t;
  if (st === 'idle') {
    const b = Math.sin(t * 0.09) * 0.03;
    target = { ...P.stance, lean: P.stance.lean + b, aN: [P.stance.aN[0] + b, P.stance.aN[1]], lN: [P.stance.lN[0] - b * 0.6, P.stance.lN[1] + b * 1.6], lF: [P.stance.lF[0] + b * 0.4, P.stance.lF[1]] };
    k = 0.25;
  } else if (st === 'walk') {
    const ph = t * 0.22 * (f.def.walk / 200);
    const s = P.stance;
    target = {
      ...s,
      lN: [s.lN[0] * 0.5 + Math.sin(ph) * 0.42, -0.25 - Math.max(0, Math.sin(ph + 1.4)) * 0.7],
      lF: [s.lF[0] * 0.5 + Math.sin(ph + Math.PI) * 0.42, -0.25 - Math.max(0, Math.sin(ph + Math.PI + 1.4)) * 0.7],
      lean: s.lean + 0.04,
    };
    k = 0.4;
  } else if (st === 'crouch') {
    target = P.crouch;
    k = 0.45;
  } else if (st === 'prejump' || st === 'land') {
    target = st === 'land' ? P.land : P.prejump;
    k = 0.5;
  } else if (st === 'air') {
    target = f.flip ? { ...P.tuck, rot: f.flipRot(), pin: 55 } : P.tuck;
    k = f.flip ? 1 : 0.3;
  } else if (st === 'attack') {
    const mv = f.move;
    const d = mv.d;
    const names = ANIMS[d.anim] || ANIMS.jab;
    const wind = P[names[0]];
    const hit = P[names[1]];
    if (mv.t < d.s) {
      target = mv.t < d.s * 0.55 ? wind : hit;
      k = mv.t < d.s * 0.55 ? 0.45 : 0.6;
    } else if (mv.t < d.s + d.a) {
      target = hit;
      k = 0.75;
    } else {
      target = d.air ? P.tuck : f.crouching ? P.crouch : P.stance;
      k = 0.18;
    }
    if (d.air && f.flip) target = { ...target, rot: 0 };
  } else if (st === 'block' || st === 'blockstun') {
    target = f.crouching ? P.crouchBlock : P.block;
    k = 0.6;
  } else if (st === 'hit') {
    target = f.crouching ? P.crouchHit : P.hit;
    k = t < 3 ? 0.8 : 0.25;
    if (f.hp <= 0) target = { ...P.dizzy, lean: 0.1 + Math.sin(t * 0.3) * 0.3 };
  } else if (st === 'fall' || st === 'ko') {
    const spin = st === 'ko' ? -t * 0.32 : -0.5 - Math.min(1.0, t * 0.06);
    target = { ...P.fall, rot: spin + (f.throwRot || 0) };
    k = st === 'ko' ? 1 : 0.4;
  } else if (st === 'thrown') {
    const by = f.m.f[1 - f.idx];
    target = by.def.throw.kind === 'ear' ? P.earPulled : { ...P.thrown, rot: f.throwRot || 0, pin: f.grabPin() };
    k = 0.5;
  } else if (st === 'down' || st === 'out') {
    target = P.down;
    k = 0.3;
  } else if (st === 'rise') {
    target = mixPose(P.down, P.crouch, Math.min(1, t / 12));
    k = 0.5;
  } else if (st === 'stun' || st === 'dizzy') {
    target = { ...P.dizzy, lean: 0.08 + Math.sin(t * 0.12) * 0.18, head: 0.25 + Math.sin(t * 0.21) * 0.3, aN: [0.2 + Math.sin(t * 0.12) * 0.3, 0.3], aF: [0.1 - Math.sin(t * 0.12) * 0.3, 0.4] };
    k = 0.3;
  } else if (st === 'pulled') {
    target = { ...P.hit, lean: 0.45, head: 0.1, aN: [1.2, 0.2], aF: [1.4, 0.2] };
    k = 0.5;
  } else if (st === 'special') {
    target = specialPose(f, P);
    k = 0.45;
  } else if (st === 'recover') {
    target = P.stance;
    k = 0.2;
  } else if (st === 'throwing') {
    const g = f.grab;
    if (f.def.throw.kind === 'lift') target = t < 9 ? P.grab : t < 26 ? P.lift : P.toss;
    else target = t < 10 ? P.grab : t < 29 ? { ...P.lift, aN: [P.lift.aN[0] + Math.sin(t * 1.3) * 0.15, P.lift.aN[1]] } : P.toss;
    if (!g && t > 30) target = P.stance;
    k = 0.4;
  } else if (st === 'win') {
    if (f.def.id === 'apa') target = { ...P.win, aF: [P.win.aF[0], P.win.aF[1] + Math.sin(t * 0.35) * 0.35] };
    else target = { ...P.win, aF: [P.win.aF[0] + Math.sin(t * 0.25) * 0.1, P.win.aF[1]] };
    k = 0.2;
  } else if (st === 'lose') {
    target = P.lose;
    k = 0.15;
  } else if (st === 'whistle') {
    target = P.whistle;
    k = 0.3;
  } else if (st === 'clap') {
    const c = Math.sin(t * 0.5);
    target = { ...P.clap, aN: [P.clap.aN[0] + c * 0.25, P.clap.aN[1] - c * 0.4], aF: [P.clap.aF[0] - c * 0.25, P.clap.aF[1] + c * 0.4], lean: 0.05 + Math.abs(c) * 0.04 };
    k = 0.6;
  } else if (st === 'dance') {
    target = zhorga(f, P);
    k = 0.6;
  } else if (st === 'carried') {
    const s = Math.sin(t * 0.3);
    target = { ...P.carried, lN: [0.2 + s * 0.5, -0.2], lF: [-0.1 - s * 0.5, -0.3], pin: f.def.body.th + f.def.body.sh };
    k = 0.5;
  }
  f.pose = smooth(f.pose, target, k);
}

// kara zhorga: shoulders bounce, arms like holding the reins, feet trot; it gets faster
function zhorga(f, P) {
  f.dancePh = (f.dancePh || 0) + 0.16 * f.dance;
  const ph = f.dancePh;
  const s = Math.sin(ph);
  const s2 = Math.sin(ph * 2);
  const tired = f.dance > 3 ? (f.dance - 3) * 0.5 : 0;
  return {
    ...P.stance,
    lean: 0.06 + s2 * 0.06 + tired * 0.4,
    head: s * 0.15 + tired * 0.4,
    aN: [0.75 + s * 0.35, 1.7 - s * 0.3],
    aF: [0.75 - s * 0.35, 1.7 + s * 0.3],
    lN: [0.25 + Math.max(0, s) * 0.5, -0.1 - Math.max(0, s) * 0.9],
    lF: [-0.15 + Math.max(0, -s) * 0.5, -0.1 - Math.max(0, -s) * 0.9],
    pin: null,
  };
}

function specialPose(f, P) {
  const sp = f.def.spec;
  const t = f.t;
  if (sp.kind === 'lasso') {
    if (t < sp.s) return { ...P.lassoWind, aF: [2.6 + Math.sin(t * 0.9) * 0.35, 0.6 + Math.cos(t * 0.9) * 0.3] };
    if (f.lasso && f.lasso.caught) return P.lassoPull;
    if (f.lasso) return t < sp.s + 5 ? P.lassoThrow : P.lassoHold;
    return P.stance;
  }
  if (t < sp.s) return P.throwWind;
  return P.throwOut;
}

Fighter.prototype.flipRot = function flipRot() {
  // a forward jump is a somersault, a back jump flips the other way
  const air = (2 * this.def.jump) / GRAV;
  const k = Math.min(1, (this.t + 4) / (air * 60));
  return this.flip * k * Math.PI * 2;
};

Fighter.prototype.grabPin = function grabPin() {
  return this.y > 1 ? 70 : null;
};

const ANIMS = {
  jab: ['jabWind', 'jab'],
  ladle: ['jabWind', 'jab'],
  kick: ['kickWind', 'kick'],
  upper: ['upperWind', 'upper'],
  kazan: ['upperWind', 'upper'],
  sweep: ['sweepWind', 'sweep'],
  ladleLow: ['sweepWind', 'sweep'],
  airP: ['tuck', 'airP'],
  airLadle: ['tuck', 'airP'],
  airK: ['tuck', 'airK'],
};
