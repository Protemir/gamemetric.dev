import { fighterById, VICTIM, goldPalette } from './fighters.js';
import { posesFor, mixPose, copyPose, solve } from './pose.js';
import { rng, clamp } from './util.js';

// The fight itself: two fighters, projectiles, hazards, effects, rounds. No DOM and no sound here,
// everything the outside world cares about goes out through emit(type, data).
// It only uses its own seeded random numbers, so the same inputs always give the same fight
// (replays and network play rely on that).

export const DT = 1 / 60;
export const STAGE = 680;
export const ROUND_TIME = 60;
export const WINS = 2;
const GRAV = 2600;
const GAP = 58;
const MAX_SEP = 640;

export const NO_INPUT = Object.freeze({ left: false, right: false, up: false, down: false, block: false, punch: false, kick: false, special: false, taunt: false });

const ACTIONABLE = new Set(['idle', 'walk', 'crouch', 'block']);
const TURNABLE = new Set(['idle', 'walk', 'crouch', 'block', 'land', 'stun', 'dizzy', 'prejump', 'blush', 'wrapped']);
const THROWABLE = new Set(['idle', 'walk', 'crouch', 'block', 'land', 'prejump', 'attack', 'taunt', 'blush', 'stun', 'wrapped']);
const NO_HURT = new Set(['down', 'rise', 'out', 'thrown', 'carried', 'dance', 'pulled', 'win', 'lose', 'blast', 'blind', 'yawn', 'sleep', 'flag', 'inCar', 'play', 'keys', 'wave', 'clap', 'whistle', 'eagleLaunch', 'sneezeIn', 'sneezeOut', 'heli', 'heliLift', 'stroll', 'offer', 'thank', 'drink']);
const SCRIPTED = new Set(['thrown', 'carried', 'inCar', 'blind', 'heli', 'stroll']);
const PROJ_SOLID = new Set(['baursak', 'wave', 'card', 'words', 'blanket', 'horn', 'candy']);
const FALLING = new Set(['baursak', 'blanket', 'candy', 'boulder']);
const LETTERS = ['Ә', 'Ғ', 'Қ', 'Ң', 'Ө', 'Ұ', 'Ү', 'І', 'А', 'Ж', 'С', 'Т'];
const ARENA_RULES = {
  aul: { hazard: 'sheep' },
  medeu: { ice: true },
  koktobe: {},
  charyn: { hazard: 'weed' },
  bazaar: { hazard: 'melon' },
  astana: { hazard: 'wind' },
};

// the steppe wind in Astana: a warning, then a long push to one side
const WIND = { warn: 40, rise: 20, hold: 100, fall: 30 };
const WIND_LIFE = WIND.warn + WIND.rise + WIND.hold + WIND.fall;

export class Fighter {
  constructor(def, idx, palette, m, gold) {
    this.def = def;
    this.idx = idx;
    const pal = def.palettes[palette % def.palettes.length];
    this.pal = gold ? goldPalette(pal) : pal;
    this.m = m;
    // the giant gets his full health only as the arcade boss
    this.hpMax = def.boss && !m.opts.bossFight ? 90 : def.hp || 100;
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
    this.hp = this.hpMax;
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
    this.slowT = 0;
    this.meterT = 0;
    this.meterBy = null;
    this.hood = false;
    this.hidden = false;
    this.birdOut = false;
    this.noReturn = false;
    this.calm = 0;
    this.throwRot = 0;
    this.pose = copyPose(this.poses.stance);
  }

  set(state, dur = 0) {
    this.state = state;
    this.t = 0;
    this.dur = dur;
  }

  get grounded() { return this.y <= 0 && !['air', 'fall', 'ko', 'thrown', 'carried', 'blast'].includes(this.state); }
  get actionable() { return ACTIONABLE.has(this.state) || (this.state === 'land' && this.t > 3); }

  say(key, force) {
    const list = this.def.say[key] || VICTIM[key];
    if (!list || (!force && this.sayCool > 0)) return;
    const text = list[Math.floor(this.m.rand() * list.length)];
    this.bubble = { text, t: 95 };
    this.sayCool = 150;
    this.m.emit('say', { f: this, text });
  }

  hurtbox() {
    if (NO_HURT.has(this.state) || this.hidden) return null;
    // once knocked out nothing can touch them again, outside the АЯҚТА window
    if (this.hp <= 0 && this.m.phase !== 'finish') return null;
    if (this.state === 'fall' && this.juggle >= 4) return null;
    // the loser can't be touched until "АЯҚТА!" has been shown
    if (this.m.phase === 'finish' && this.m.loser === this && this.m.pt < 40) return null;
    const h = this.def.hurt;
    const w = h.w;
    if (this.y > 0 || this.state === 'fall' || this.state === 'ko') return [this.x - w, this.y + 8, this.x + w, this.y + h.stand * 0.85];
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
    // back, then forward: the classic motion for the second special
    if (back) this.backAt = m.frame;
    if (fwd && !this.fwdHeld) this.fwdStart = m.frame;
    this.fwdHeld = !!fwd;
    const motion = !!fwd && this.backAt != null && this.fwdStart > this.backAt && m.frame - this.backAt <= 14;
    for (const b of ['punch', 'kick', 'special']) if (inp[b]) this.buffer = { b, t: 9, down: inp.down, fwd, motion };
    const buf = this.buffer;
    if (buf && --buf.t <= 0) this.buffer = null;

    // the winner can start a finisher during "АЯҚТА!"
    if (m.phase === 'finish' && m.winner === this && buf && buf.b === 'special' && this.actionable && Math.abs(op.x - this.x) < 330) {
      this.buffer = null;
      m.startFinisher(this, op, buf.down && m.opts.friendship ? 'friend' : null);
      return;
    }
    if (inp.taunt && this.actionable && m.phase === 'fight') {
      this.set('taunt', 54);
      this.crouching = false;
      this.say('taunt', true);
      // showing off charges the special a little
      this.cool = Math.max(0, this.cool - 45);
      m.emit('taunt', { f: this });
    }
    this.control(inp, op, fwd, back, buf);
    this.tick(op);
  }

  control(inp, op, fwd, back, buf) {
    // directions held when the button was pressed still count (presses made during a hit freeze)
    const down = inp.down || (buf && buf.down);
    const toward = fwd || (buf && buf.fwd);
    // a direction pressed while crouching for the jump still counts
    if (this.state === 'prejump' && (fwd || back)) this.jdir = fwd ? 1 : -1;
    if (this.actionable || (this.state === 'land' && buf)) {
      if (buf) {
        this.buffer = null;
        if (buf.b === 'punch') {
          if (buf.motion && this.def.spec2 && this.cool <= 0) return this.startSpecial(op, 2);
          if (toward && this.canThrow(op)) return this.startThrow(op);
          return this.startMove(down ? 'upper' : 'jab');
        }
        if (buf.b === 'kick') return this.startMove(down ? 'sweep' : 'kick');
        if (buf.b === 'special') {
          if (this.cool <= 0) return this.startSpecial(op, down && this.def.spec2 ? 2 : 1);
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
        const v = this.face * (fwd ? this.def.walk : -this.def.back);
        // on ice you build up speed and keep sliding
        if (this.m.ice) this.push += (v * 1.15 - this.push) * 0.06;
        else this.x += v * DT;
      } else {
        this.crouching = false;
        if (this.state !== 'idle') this.set('idle');
      }
      return;
    }

    // combos: a move that hit can be cancelled into the next one
    if (this.state === 'attack' && this.move.hit && buf && this.move.d.cancel && !this.move.d.air) {
      const two = (buf.b === 'punch' && buf.motion) || (buf.b === 'special' && down);
      const want = two || buf.b === 'special' ? 'special' : buf.b === 'punch' ? (down ? 'upper' : 'jab') : buf.b === 'kick' ? (down ? 'sweep' : 'kick') : 'special';
      if (this.move.d.cancel.includes(want)) {
        this.buffer = null;
        if (want !== 'special') return this.startMove(want);
        if (this.cool <= 0) return this.startSpecial(op, two && this.def.spec2 ? 2 : 1);
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
      this.vx = this.jdir * this.def.jumpX * this.face + (m.ice ? this.push * 0.6 : 0);
      this.flip = this.jdir;
      this.airUsed = false;
      m.emit('jump', { f: this });
    }
    if (st === 'attack') {
      const mv = this.move;
      mv.t++;
      const d = mv.d;
      if (d.dash && !mv.hit && mv.t >= d.s - 2 && mv.t < d.s + d.a) this.x += this.face * d.dash * DT;
      if (d.multi && mv.hit && mv.t > d.s && mv.t < d.s + d.a && (mv.t - d.s) % d.multi === 0) mv.hit = false;
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
    if ((st === 'recover' || st === 'taunt') && this.t >= this.dur) this.set('idle');
    if ((st === 'stun' || st === 'blush' || st === 'wrapped') && this.t >= this.dur) {
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
    if (st === 'blast') this.tickBlast();

    // physics
    const airborne = this.y > 0 || st === 'air' || st === 'fall' || st === 'ko' || (st === 'blast' && !this.hidden) || (st === 'attack' && this.move && this.move.d.air);
    if (SCRIPTED.has(st) || (st === 'blast' && this.hidden)) return;
    if (airborne) {
      this.vy -= GRAV * DT * (st === 'blast' ? 0.35 : 1);
      this.x += this.vx * DT;
      this.y += this.vy * DT;
      if (this.y <= 0 && this.vy < 0) this.landNow();
    } else if (st !== 'pulled') {
      this.x += this.push * DT;
      this.push *= m.ice ? (st === 'walk' ? 1 : 0.955) : 0.84;
      if (Math.abs(this.push) < 4) this.push = 0;
    }
  }

  // sent flying into the sky: a twinkle, then (usually) a drop back down
  tickBlast() {
    const m = this.m;
    if (!this.hidden && (this.y > 1050 || Math.abs(this.x) > STAGE + 520)) {
      this.hidden = true;
      this.blastT = 0;
      this.vx = 0;
      this.vy = 0;
      m.fx.push({ k: 'twinkle', x: Math.max(-STAGE, Math.min(STAGE, this.x)), y: 430, t: 0, life: 50 });
      m.emit('twinkle', { f: this });
    }
    if (this.hidden && !this.noReturn && ++this.blastT === 75) {
      this.hidden = false;
      this.x = Math.max(-STAGE + 60, Math.min(STAGE - 60, this.x));
      this.y = 950;
      this.vy = -300;
      this.vx = 0;
      this.state = 'ko';
      this.t = 20;
      this.throwWord = 'ГҮРС!';
      m.emit('fallback', { f: this });
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
    if (st === 'fall' || st === 'ko' || st === 'blast') {
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
      if (st !== 'fall' || this.hp <= 0) this.set('out');
      else this.set('down', 34);
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
      Math.abs(op.x - this.x) <= this.def.throw.range && this.m.phase === 'fight' && !op.hidden;
  }

  startThrow(op, dmg, kind) {
    this.set('throwing');
    this.grab = { op, kind: kind || this.def.throw.kind, dmg: dmg || this.def.throw.dmg };
    this.crouching = false;
    op.set('thrown');
    op.move = null;
    op.dropLasso();
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
    } else if (g.kind === 'spin') {
      // a dance step: the rival goes once around and off
      if (t <= 30) {
        const a = (t / 30) * Math.PI * 2;
        op.x = this.x + f * Math.cos(a) * 62;
        op.y = Math.abs(Math.sin(a)) * 30;
        op.face = Math.sin(a) > 0 ? f : -f;
        if (t % 10 === 0) this.m.emit('shake', { f: this });
      }
      if (t === 30) {
        op.face = -f;
        this.release(op, f * 460, 380);
      }
      if (t >= 42) this.endThrow();
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
    op.set('fall');
    op.vx = vx;
    op.vy = vy;
    op.y = Math.max(op.y, 1);
    op.throwRot = 0;
    op.throwWord = this.def.throw.word;
    m.damage(this, op, this.grab ? this.grab.dmg : this.def.throw.dmg);
    m.shake = Math.max(m.shake, 8);
    m.emit('throw', { f: this, op });
  }

  // a throw that gets interrupted drops the rival instead of keeping them in the air
  dropGrab() {
    const g = this.grab;
    this.grab = null;
    if (!g || g.op.state !== 'thrown') return;
    const op = g.op;
    op.set('fall');
    op.vx = 0;
    op.vy = 200;
    op.y = Math.max(op.y, 1);
    op.throwRot = 0;
  }

  endThrow() {
    this.grab = null;
    this.set('idle');
  }

  startSpecial(op, which = 1) {
    const sp = which === 2 && this.def.spec2 ? this.def.spec2 : this.def.spec;
    this.curSpec = sp;
    this.cool = sp.cd;
    this.coolMax = sp.cd;
    this.crouching = false;
    this.say(which === 2 ? 'special2' : 'special', true);
    this.target = op.x;
    this.m.emit('special', { f: this, kind: sp.kind });
    if (sp.kind === 'move') {
      this.move = { id: 'special2', d: sp.move, t: 0, hit: false };
      this.set('attack');
      this.m.emit('whoosh', { f: this, heavy: true });
      return;
    }
    this.set('special');
  }

  tickSpecial(op) {
    const sp = this.curSpec || this.def.spec;
    const m = this.m;
    const f = this.face;
    const t = this.t;
    switch (sp.kind) {
      case 'lasso': {
        if (!this.lasso && t > sp.s) {
          this.set('idle');
          return;
        }
        if (t === sp.s) {
          this.lasso = { dist: 0, out: true, caught: null };
          m.emit('lasso', { f: this });
        }
        const L = this.lasso;
        if (!L) return;
        if (L.out) {
          L.dist += sp.speed * DT;
          if (L.dist >= sp.range) L.out = false;
        } else if (L.caught) {
          L.dist = Math.max(0, L.dist - sp.speed * 0.9 * DT);
          L.caught.x = this.x + f * (40 + L.dist);
          if (L.dist <= 32) {
            const v = L.caught;
            v.set('stun', sp.stun);
            v.x = this.x + f * 72;
            v.face = -f;
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
        return;
      }
      case 'baursak':
        if (t === sp.s) {
          m.proj.push({ k: 'baursak', owner: this, x: this.x + f * 40, y: 128, vx: f * sp.vx, vy: sp.vy, g: sp.g, spin: 0, t: 0 });
          m.emit('toss', { f: this });
        }
        break;
      case 'eagle':
        if (t === sp.s) {
          this.birdOut = true;
          m.proj.push({ k: 'eagle', owner: this, x: this.x + f * 40, y: 150, dir: f, phase: 'up', t: 0, tx: op.x });
          m.emit('eagle', { f: this });
        }
        break;
      case 'wave':
        if (t === sp.s) {
          m.proj.push({ k: 'wave', owner: this, x: this.x + f * 50, y: 110, vx: f * sp.vx, dir: f, dist: 0, t: 0 });
          m.emit('strum', { f: this });
        }
        break;
      case 'card':
        if (t === sp.s) {
          m.proj.push({ k: 'card', owner: this, x: this.x + f * 40, y: 134, vx: f * sp.vx, spin: 0, t: 0 });
          m.emit('flick', { f: this });
        }
        break;
      case 'words':
        if (t === sp.s) {
          const list = this.def.words;
          const text = list[Math.floor(m.rand() * list.length)];
          m.proj.push({ k: 'words', owner: this, x: this.x + f * 60, y: 140, vx: f * sp.vx, text, t: 0 });
          m.emit('words', { f: this });
        }
        break;
      case 'stomp':
        if (t === sp.s) {
          m.proj.push({ k: 'stomp', owner: this, x: this.x + f * 70, y: 0, vx: f * sp.vx, dist: 0, t: 0 });
          m.shake = Math.max(m.shake, 14);
          m.dust(this.x + f * 40, 1.6);
          m.emit('stomp', { f: this });
        }
        break;
      case 'blanket':
        if (t === sp.s) {
          m.proj.push({ k: 'blanket', sp, owner: this, x: this.x + f * 40, y: 140, vx: f * sp.vx, vy: sp.vy, g: sp.g, spin: 0, t: 0 });
          m.emit('toss', { f: this });
        }
        break;
      case 'gust':
        if (t === sp.s) {
          m.proj.push({ k: 'gust', sp, owner: this, x: this.x + f * 60, y: 110, vx: f * sp.vx, dir: f, dist: 0, t: 0 });
          m.emit('gust', { f: this });
        }
        break;
      case 'horn':
        if (t === sp.s) {
          m.proj.push({ k: 'horn', sp, owner: this, x: this.x + f * 60, y: 125, vx: f * sp.vx, dir: f, dist: 0, t: 0 });
          m.emit('horn', { f: this });
        }
        break;
      case 'candy':
        if (t === sp.s) {
          for (let k = 0; k < 3; k++) {
            m.proj.push({ k: 'candy', sp, owner: this, x: this.x + f * 40, y: 130, vx: f * sp.vx * (0.75 + k * 0.22), vy: 220 + k * 150, g: 900, spin: k, color: k, t: 0 });
          }
          m.emit('words', { f: this });
        }
        break;
      case 'boulder':
        if (t === sp.s) {
          // a lob aimed at where the rival stands right now
          const x0 = this.x + f * 50;
          const fly = (sp.vy + Math.sqrt(sp.vy * sp.vy + 2 * sp.g * 200)) / sp.g;
          const vx = clamp(Math.abs(op.x - x0) / fly, 160, sp.vx);
          m.proj.push({ k: 'boulder', sp, owner: this, x: x0, y: 230, vx: f * vx, vy: sp.vy, g: sp.g, spin: 0, t: 0 });
          m.emit('whoosh', { f: this, heavy: true });
        }
        break;
      case 'grab':
        // a low dash; whoever is standing in the way gets grabbed by the belt
        if (t >= sp.s && t < sp.s + 16) {
          this.x += f * sp.dash * DT;
          if (op.grounded && !NO_HURT.has(op.state) && !op.hidden && Math.abs(op.x - this.x) < 86 && Math.sign(op.x - this.x) === f && m.phase === 'fight') {
            this.startThrow(op, sp.dmg, 'lift');
            m.word(op.x, 150, 'БЕЛБЕУ!');
            return;
          }
        }
        if (t >= sp.s + 16 + sp.r) this.set('idle');
        return;
      default:
        break;
    }
    if (t >= sp.s + (sp.r || 14)) this.set('idle');
  }

  lassoPoint() {
    return [this.x + this.face * (40 + this.lasso.dist), 128];
  }

  // drop the lasso; whoever it was pulling is free again
  dropLasso() {
    const L = this.lasso;
    if (L && L.caught && L.caught.state === 'pulled') L.caught.set('idle');
    this.lasso = null;
  }
}

export class Match {
  constructor(opts) {
    const { p1 = 'batyr', p2 = 'apa', seed = 7, arena = 'aul', gold = [false, false] } = opts;
    const pal2 = p1 === p2 ? 1 : 0;
    this.opts = opts;
    this.rand = rng(seed);
    this.emit = opts.onEvent || (() => {});
    this.arena = arena;
    const rules = ARENA_RULES[arena] || {};
    this.ice = !!rules.ice;
    this.hazardKind = opts.training || opts.noHazards ? null : rules.hazard || null;
    this.training = !!opts.training;
    this.f = [new Fighter(fighterById(p1), 0, 0, this, gold[0]), new Fighter(fighterById(p2), 1, pal2, this, gold[1])];
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
    this.log = { finishers: [0, 0], flawless: [0, 0], timeLeft: [0, 0] };
    this.startRound();
  }

  startRound() {
    this.round++;
    this.time = this.training ? 99 * 60 : ROUND_TIME * 60;
    this.phase = 'intro';
    this.pt = 0;
    for (const f of this.f) f.reset();
    this.proj = [];
    this.fx = [];
    this.winner = null;
    this.loser = null;
    this.fin = null;
    this.eagle = null;
    this.car = null;
    this.hazardT = 600 + Math.floor(this.rand() * 600);
    this.wind = null;
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
    const keep = (f, i) => {
      const fwd = f.face > 0 ? ins[i].right : ins[i].left;
      for (const b of ['punch', 'kick', 'special']) if (ins[i][b]) f.buffer = { b, t: 9, down: ins[i].down, fwd, motion: false };
    };

    if (this.hitstop > 0) {
      this.hitstop--;
      // keep presses made during the freeze
      this.f.forEach(keep);
      return;
    }

    const [a, b] = this.f;
    this.prevX = [a.x, b.x];
    for (const [f, o, i] of [[a, b, 0], [b, a, 1]]) {
      // a fighter hit by the kui moves at half speed for a while
      if (f.slowT > 0) {
        f.slowT--;
        if (f.slowT % 14 === 0) this.fx.push({ k: 'note', x: f.x + (this.rand() - 0.5) * 60, y: f.def.hurt.stand + 10, t: 0, life: 50, text: this.rand() < 0.5 ? '♪' : '♫' });
        if (this.frame % 2) {
          keep(f, i);
          continue;
        }
      }
      f.update(ins[i], o);
    }
    this.collide();
    this.stepProj();
    this.checkHits(a, b);
    this.checkHits(b, a);
    this.stepLasso(a, b);
    this.stepLasso(b, a);
    this.stepMeter();
    this.stepWind();
    if (this.phase === 'fight') {
      this.stepHazard();
      if (!this.training) {
        this.time--;
        if (this.time <= 0) this.timeUp();
      } else {
        this.refill();
      }
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
      if (this.pt === (this.training ? 20 : 76)) {
        this.phase = 'fight';
        this.pt = 0;
        this.emit('fight', {});
      }
    } else if (this.phase === 'ko') {
      const v = this.loser;
      if ((v.state === 'out' && v.t === 60) || (v.hidden && v.noReturn && this.pt === 120)) {
        this.winner.set('win');
        this.winner.say('win', true);
        this.phase = 'roundEnd';
        this.pt = 0;
        this.emit('roundWin', { f: this.winner });
      }
    } else if (this.phase === 'finish') {
      if (this.pt === 26) this.emit('finishHim', {});
      if (this.pt === 26 + 270 && this.loser.state === 'dizzy') {
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
      if (this.pt === 1 && this.winner) {
        const w = this.winner;
        if (w.hp >= w.hpMax) this.log.flawless[w.idx]++;
        this.log.timeLeft[w.idx] += Math.ceil(this.time / 60);
      }
      if (this.pt === 120) {
        const done = this.wins[0] >= WINS || this.wins[1] >= WINS || this.round >= 6;
        if (done) {
          this.phase = 'over';
          const w = this.wins[0] === this.wins[1] ? null : this.wins[0] > this.wins[1] ? a : b;
          this.result = { winner: w, wins: [...this.wins], flawless: !!w && w.hp >= w.hpMax, log: this.log };
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
    this.clearProj();
    for (const f of this.f) {
      f.dropLasso();
      f.move = null;
      if (f.y <= 0 && !['down', 'rise', 'fall'].includes(f.state)) f.set('idle');
    }
    const ka = a.hp / a.hpMax;
    const kb = b.hp / b.hpMax;
    if (ka !== kb) {
      this.winner = ka > kb ? a : b;
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

  // training: health comes back once a combo is over
  refill() {
    for (const f of this.f) {
      if (f.hp < f.hpMax && f.combo === 0 && ['idle', 'walk', 'crouch', 'block'].includes(f.state)) {
        if (++f.calm > 50) {
          f.hp = f.hpMax;
          f.calm = 0;
        }
      } else {
        f.calm = 0;
      }
    }
  }

  clearProj() {
    this.proj = this.proj.filter((p) => !p.owner);
    for (const f of this.f) f.birdOut = false;
  }

  collide() {
    const [a, b] = this.f;
    const solid = (f) => !['thrown', 'carried', 'out', 'down', 'pulled', 'blast', 'inCar', 'blind', 'heli'].includes(f.state) && !f.hidden;
    if (solid(a) && solid(b) && Math.abs(a.y - b.y) < 110) {
      const dx = b.x - a.x;
      const d = Math.abs(dx);
      const gap = GAP + (a.def.boss || b.def.boss ? 24 : 0);
      if (d < gap) {
        const s = dx === 0 ? (a.face > 0 ? 1 : -1) : Math.sign(dx);
        const need = (gap - d) / 2;
        a.x -= s * need;
        b.x += s * need;
      }
    }
    for (const f of this.f) if (!SCRIPTED.has(f.state) && f.state !== 'blast') f.x = Math.max(-STAGE, Math.min(STAGE, f.x));
    // never further apart than one screen
    const dx = b.x - a.x;
    const free = (f) => !SCRIPTED.has(f.state) && f.state !== 'blast' && !f.hidden;
    if (Math.abs(dx) > MAX_SEP && free(a) && free(b)) {
      const over = Math.abs(dx) - MAX_SEP;
      const s = Math.sign(dx);
      // whoever moved away this frame is held back; if nobody did (knockback), both share it
      const px = this.prevX || [a.x, b.x];
      const awayA = Math.max(0, (px[0] - a.x) * s);
      const awayB = Math.max(0, (b.x - px[1]) * s);
      const sum = awayA + awayB;
      const ka = sum > 0 ? awayA / sum : 0.5;
      a.x += s * over * ka;
      b.x -= s * over * (1 - ka);
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
    if (this.phase !== 'fight' && this.phase !== 'finish') return null;
    const dir = def.x === att.x ? att.face : Math.sign(def.x - att.x);
    if (this.canBlock(def, d.lvl, dir)) {
      def.set('blockstun', d.bs || 10);
      def.push = dir * (d.push || 120) * 0.8;
      if (opts.chip) this.damage(att, def, opts.chip, true);
      this.hitstop = 5;
      this.fx.push({ k: 'block', x, y, t: 0, life: 14 });
      this.emit('block', { f: def, att });
      return 'block';
    }
    const scale = Math.max(0.4, 1 - 0.12 * def.combo);
    const dmg = Math.max(1, Math.round(d.dmg * scale));
    def.combo++;
    def.flash = 6;
    def.dropLasso();
    if (def.grab) def.dropGrab();
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
      this.ko(att, def, dir, false, heavy || opts.special);
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
    else if (def.combo === 3) this.word(x, y + 30, ['ТАРС!', 'ШАРТ!', 'ДҮҢК!', 'ТЫҚ!'][Math.floor(this.rand() * 4)]);
    this.crowd = Math.min(1, this.crowd + (heavy ? 0.35 : 0.08) + (def.combo >= 3 ? 0.2 : 0));
    if (this.rand() < 0.22) def.say('hurt');
    if (def.combo === 3 || (heavy && this.rand() < 0.4)) att.say('taunt');
    this.emit('hit', { att, def, d, dmg, heavy, combo: def.combo, x, y });
    return 'hit';
  }

  damage(att, def, dmg, chip) {
    const before = def.hp;
    // a chip never finishes anyone, and in training nobody goes down
    const floor = chip || this.training ? Math.min(def.hp, 1) : 0;
    def.hp = Math.max(floor, def.hp - dmg);
    if (att) att.stats.dmg += before - def.hp;
    if (def.hp <= 0 && this.phase === 'fight' && !chip && def.state === 'fall' && def.throwWord) this.ko(att, def, Math.sign(def.vx) || att.face, true);
  }

  ko(att, def, dir, thrown, heavy) {
    if (this.phase !== 'fight') return;
    this.winner = att;
    this.loser = def;
    this.wins[att.idx]++;
    this.clearProj();
    att.dropLasso();
    def.meterT = 0;
    def.slowT = 0;
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
      if (heavy && this.rand() < 0.35) {
        // sometimes a big hit just sends them into the sky
        def.set('blast');
        def.vx = dir * 520;
        def.vy = 1750;
        def.y = Math.max(def.y, 1);
        this.word(def.x, 200, 'ДЫЗ!');
      } else {
        def.set('ko');
        def.vx = dir * 300;
        def.vy = 820;
        def.y = Math.max(def.y, 1);
      }
    }
    this.phase = 'ko';
    this.pt = 0;
    this.slow = 42;
    this.crowd = 1;
    this.emit('ko', { f: def, att, final });
  }

  // ---------- projectiles ----------

  projHit(p, op, d, x, y, opts) {
    const res = this.applyHit(p.owner, op, d, x, y, { chip: 1, special: true, ...opts });
    return res;
  }

  stepProj() {
    for (const p of this.proj) {
      p.t++;
      if (!p.owner) {
        this.stepHazardProj(p);
        continue;
      }
      const op = this.f[1 - p.owner.idx];
      const sp = p.owner.def.spec;
      const hurt = op.hurtbox();
      const touch = (r, h = r) => hurt && overlap([p.x - r, p.y - h, p.x + r, p.y + h], hurt);
      const ps = p.sp || sp;
      if (FALLING.has(p.k)) {
        p.vy -= p.g * DT;
        p.x += p.vx * DT;
        p.y += p.vy * DT;
        p.spin += p.k === 'boulder' ? 0.12 : 0.3;
        const r = p.k === 'boulder' ? 30 : p.k === 'candy' ? 10 : p.k === 'blanket' ? 26 : 16;
        const floor = p.k === 'boulder' ? 28 : 10;
        if (p.y < floor || Math.abs(p.x) > STAGE + 300) {
          p.dead = true;
          if (p.y < floor && p.k === 'boulder') {
            this.dust(p.x, 1.4);
            this.shake = Math.max(this.shake, 9);
            this.emit('thud', { big: true });
          } else if (p.y < floor && p.k === 'baursak') this.crumbs(p.x, 12, 6);
        } else if (touch(r)) {
          p.dead = true;
          if (p.k === 'baursak') {
            this.crumbs(p.x, p.y, 10);
            this.projHit(p, op, { dmg: ps.dmg, lvl: 'mid', hs: 22, bs: 14, push: 280, sfx: 'mid', word: 'ТАРС!' }, p.x, p.y);
            this.emit('splat', { f: op });
          } else if (p.k === 'blanket') {
            const res = this.projHit(p, op, { dmg: ps.dmg, lvl: 'mid', hs: 14, bs: 12, push: 60, sfx: 'light', word: 'ОРАЛДЫ!' }, p.x, p.y);
            if (res === 'hit' && op.hp > 0 && op.state === 'hit') {
              op.set('wrapped', ps.stun);
              op.bubble = { text: 'Ммм-ммм!', t: 70 };
            }
          } else if (p.k === 'candy') {
            this.projHit(p, op, { dmg: ps.dmg, lvl: 'mid', hs: 10, bs: 6, push: 70, sfx: 'light' }, p.x, p.y);
            this.emit('splat', { f: op });
          } else {
            this.projHit(p, op, { dmg: ps.dmg, lvl: 'mid', trip: true, bs: 16, push: 220, sfx: 'heavy', word: 'ГҮРС!' }, p.x, p.y);
            this.shake = Math.max(this.shake, 12);
          }
        }
      } else if (p.k === 'gust' || p.k === 'horn') {
        p.x += p.vx * DT;
        p.dist += Math.abs(p.vx) * DT;
        if (p.dist > ps.range || Math.abs(p.x) > STAGE + 300) {
          p.dead = true;
          continue;
        }
        if (!touch(30, p.k === 'gust' ? 80 : 50)) continue;
        p.dead = true;
        if (p.k === 'gust') {
          this.projHit(p, op, { dmg: ps.dmg, lvl: 'mid', bs: 12, push: 200, launch: [ps.push, 420], sfx: 'light', word: 'ЖЕЛ!' }, p.x, p.y);
        } else {
          const res = this.projHit(p, op, { dmg: ps.dmg, lvl: 'mid', hs: 10, bs: 10, push: 140, sfx: 'mid', word: 'БИИП!' }, p.x, p.y);
          if (res === 'hit' && op.hp > 0 && op.state === 'hit') op.set('stun', ps.stun);
        }
      } else if (p.k === 'wave' || p.k === 'card' || p.k === 'words' || p.k === 'stomp') {
        p.x += p.vx * DT;
        p.dist = (p.dist || 0) + Math.abs(p.vx) * DT;
        p.spin = (p.spin || 0) + 0.5;
        if (p.dist > 760 || Math.abs(p.x) > STAGE + 300) {
          p.dead = true;
          continue;
        }
        if (p.k === 'stomp' && p.t % 6 === 0) this.dust(p.x, 0.5);
        const hit = p.k === 'wave' ? touch(22, 46) : p.k === 'card' ? touch(12, 8) : p.k === 'words' ? touch(46, 18) : hurt && overlap([p.x - 40, 0, p.x + 40, 40], hurt);
        if (!hit) continue;
        p.dead = true;
        if (p.k === 'wave') {
          const r = this.projHit(p, op, { dmg: sp.dmg, lvl: 'mid', hs: 18, bs: 12, push: 160, sfx: 'dombra', word: 'ДЫҢ!' }, p.x, p.y);
          if (r === 'hit' && op.hp > 0) {
            op.slowT = sp.slow;
            op.say('slow', true);
          }
        } else if (p.k === 'card') {
          const r = this.projHit(p, op, { dmg: sp.dmg, lvl: 'high', hs: 14, bs: 8, push: 80, sfx: 'light', word: 'ТЫҚ!' }, p.x, p.y);
          if (r === 'hit' && op.hp > 0) {
            op.meterT = sp.meter;
            op.meterBy = p.owner;
            op.say('meter', true);
            this.emit('meter', { f: op });
          }
        } else if (p.k === 'words') {
          const r = this.projHit(p, op, { dmg: sp.dmg, lvl: 'mid', hs: 12, bs: 10, push: 100, sfx: 'slap', word: 'ҚЫЗАРДЫ!' }, p.x, p.y);
          if (r === 'hit' && op.hp > 0 && op.state === 'hit') {
            op.set('blush', sp.stun);
            op.say('blush', true);
          }
        } else {
          this.projHit(p, op, { dmg: sp.dmg, lvl: 'low', trip: true, bs: 12, push: 120, sfx: 'heavy', word: 'ГҮРС!' }, p.x, 20);
        }
      } else if (p.k === 'eagle') {
        this.stepEagle(p, op, sp);
      }
    }
    // two flying things from different sides knock each other out; a boulder or a gust wins
    const strong = (k) => k === 'boulder' || k === 'gust';
    for (let i = 0; i < this.proj.length; i++) {
      const p = this.proj[i];
      if (p.dead || !p.owner || !(PROJ_SOLID.has(p.k) || strong(p.k))) continue;
      for (let j = i + 1; j < this.proj.length; j++) {
        const q = this.proj[j];
        if (q.dead || !q.owner || q.owner === p.owner || !(PROJ_SOLID.has(q.k) || strong(q.k))) continue;
        if (Math.abs(p.x - q.x) < 36 && Math.abs(p.y - q.y) < 46) {
          if (strong(p.k) && strong(q.k)) continue;
          p.dead = !strong(p.k);
          q.dead = !strong(q.k);
          this.crumbs((p.x + q.x) / 2, (p.y + q.y) / 2, 8);
          this.word((p.x + q.x) / 2, p.y + 40, 'ПУФ!');
          this.emit('splat', {});
        }
      }
    }
    // a lasso can catch anything flying
    for (const f of this.f) {
      if (!f.lasso || !f.lasso.out) continue;
      const [lx, ly] = f.lassoPoint();
      for (const p of this.proj) {
        if (!p.dead && p.owner && p.owner !== f && PROJ_SOLID.has(p.k) && (p.x - lx) ** 2 + (p.y - ly) ** 2 < 34 * 34) {
          p.dead = true;
          f.lasso.out = false;
          this.crumbs(p.x, p.y, 8);
          this.emit('splat', {});
        }
      }
    }
    this.proj = this.proj.filter((p) => !p.dead);
  }

  stepEagle(p, op, sp) {
    const owner = p.owner;
    const hurt = op.hurtbox();
    if (p.phase === 'up') {
      // climb towards the spot above the target
      p.x += p.dir * sp.speed * 0.45 * DT;
      p.y += (340 - p.y) * 0.08;
      if (p.t >= 26) {
        p.phase = 'dive';
        const tx = op.x;
        const dx = tx - p.x;
        const dy = 70 - p.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx = (dx / len) * sp.speed * 1.3;
        p.vy = (dy / len) * sp.speed * 1.3;
        p.dir = dx >= 0 ? 1 : -1;
        this.emit('screech', { small: true });
      }
    } else if (p.phase === 'dive') {
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      if (hurt && overlap([p.x - 32, p.y - 32, p.x + 32, p.y + 32], hurt)) {
        this.projHit(p, op, { dmg: sp.dmg, lvl: 'mid', hs: 30, bs: 12, push: 100, sfx: 'mid', word: 'ШАҢҚ!' }, p.x, p.y);
        p.phase = 'back';
      } else if (p.y < 40 || Math.abs(p.x) > STAGE + 200) {
        p.phase = 'back';
        this.dust(p.x, 0.6);
      }
    } else {
      // home to the glove
      const hx = owner.x + owner.face * 30;
      const hy = 150;
      const dx = hx - p.x;
      const dy = hy - p.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      p.dir = dx >= 0 ? 1 : -1;
      if (len < 30) {
        p.dead = true;
        owner.birdOut = false;
      } else {
        p.x += (dx / len) * 820 * DT;
        p.y += (dy / len) * 820 * DT;
      }
    }
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
    op.dropLasso();
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

  // the taxi meter: one health point every half a second
  stepMeter() {
    for (const f of this.f) {
      if (f.meterT <= 0) continue;
      if (this.phase !== 'fight') {
        f.meterT = 0;
        continue;
      }
      f.meterT--;
      if (f.meterT % 30 === 0 && f.hp > 1) {
        f.hp--;
        if (f.meterBy) f.meterBy.stats.dmg++;
        this.fx.push({ k: 'coin', x: f.x + (this.rand() - 0.5) * 40, y: f.def.hurt.stand * 0.7, t: 0, life: 40, vy: 90 });
        this.emit('coin', { f });
      }
    }
  }

  // ---------- arena hazards: a sheep, a melon or a tumbleweed crossing the carpet ----------

  stepHazard() {
    if (!this.hazardKind || --this.hazardT > 0) return;
    this.hazardT = 900 + Math.floor(this.rand() * 700);
    const dir = this.rand() < 0.5 ? 1 : -1;
    if (this.hazardKind === 'wind') {
      this.wind = { dir, t: 0, k: 0 };
      this.emit('hazard', { kind: 'wind' });
      return;
    }
    const speed = this.hazardKind === 'sheep' ? 430 : this.hazardKind === 'melon' ? 360 : 300;
    this.proj.push({ k: this.hazardKind, owner: null, x: -dir * (STAGE + 220), y: 0, vx: dir * speed, dir, t: 0, spin: 0, hitSet: [] });
    this.emit('hazard', { kind: this.hazardKind });
  }

  stepWind() {
    const w = this.wind;
    if (!w) return;
    w.t++;
    if (w.t >= WIND_LIFE) {
      this.wind = null;
      return;
    }
    const t = w.t - WIND.warn;
    w.k = t < 0 ? 0 : t < WIND.rise ? t / WIND.rise : t < WIND.rise + WIND.hold ? 1 : 1 - (t - WIND.rise - WIND.hold) / WIND.fall;
    if (t === 0) {
      this.emit('gust', { wind: true });
      this.word((this.f[0].x + this.f[1].x) / 2, 250, 'ЖЕЛ!');
    }
    if (w.k <= 0 || this.phase !== 'fight') return;
    for (const f of this.f) {
      if (SCRIPTED.has(f.state) || f.hidden || f.state === 'blast') continue;
      // blocking or crouching you hold on better, in the air you fly
      const hold = f.state === 'block' || f.state === 'blockstun' || f.crouching;
      f.x = clamp(f.x + w.dir * w.k * (f.y > 0 ? 170 : hold ? 40 : 95) * DT, -STAGE, STAGE);
    }
    for (const p of this.proj) if (p.owner && FALLING.has(p.k)) p.x += w.dir * w.k * 120 * DT;
  }

  stepHazardProj(p) {
    p.x += p.vx * DT;
    p.spin += p.vx * DT / 26;
    if (p.k === 'weed') p.y = Math.abs(Math.sin(p.t * 0.09)) * 40;
    if (Math.abs(p.x) > STAGE + 320) {
      p.dead = true;
      return;
    }
    if (this.phase !== 'fight') return;
    for (const f of this.f) {
      if (p.hitSet.includes(f.idx) || f.y > 34 || NO_HURT.has(f.state) || f.hidden || f.state === 'air') continue;
      if (Math.abs(f.x - p.x) < f.def.hurt.w + 22) {
        p.hitSet.push(f.idx);
        f.set('fall');
        f.move = null;
        f.dropLasso();
        f.dropGrab();
        f.vx = p.dir * 140;
        f.vy = 420;
        f.y = 1;
        this.word(f.x, 120, p.k === 'sheep' ? 'БЭЭ!' : p.k === 'melon' ? 'ДҮҢК!' : 'ШЫРТ!');
        this.crowd = Math.min(1, this.crowd + 0.5);
        this.emit('tripped', { f, kind: p.k });
      }
    }
  }

  // ---------- finishers ----------

  startFinisher(w, v, pick) {
    this.phase = 'finisher';
    this.pt = 0;
    this.fin = { kind: pick || w.def.finisher || 'eagle', w, v };
    this.log.finishers[w.idx]++;
    w.move = null;
    w.dropLasso();
    v.bubble = null;
    w.say(this.fin.kind === 'friend' ? 'friend' : 'finisher', true);
    this.emit('finisher', { f: w, kind: this.fin.kind });
    const kind = this.fin.kind;
    if (kind === 'friend') {
      w.set('stroll');
    } else if (kind === 'eagle') {
      w.set('whistle');
      this.emit('whistle', { f: w });
    } else if (kind === 'dance') {
      w.set('clap');
      v.set('dance');
      v.dance = 0;
      this.emit('zhorga', { f: w });
    } else if (kind === 'hood') {
      w.set('eagleLaunch');
      w.birdOut = true;
      this.eagle = { x: w.x + w.face * 30, y: 150, flap: 0, hood: true, t: 0, from: [w.x + w.face * 30, 150] };
      this.emit('screech', {});
    } else if (kind === 'sleep') {
      w.set('play');
      this.emit('lullaby', { f: w });
    } else if (kind === 'taxi') {
      w.set('keys');
      const dir = Math.sign(v.x - w.x) || w.face;
      this.car = { x: w.x - dir * 900, dir, t: 0, moving: true, front: null, back: null, wheel: 0, stopX: v.x + dir * 60 };
      this.emit('horn', {});
    } else if (kind === 'heli') {
      w.set('heliLift');
      v.set('heli');
      v.face = -w.face;
      this.emit('grab', {});
    } else if (kind === 'flag') {
      w.set('wave');
      v.set('blush');
      v.dur = 9999;
    } else if (kind === 'sneeze') {
      w.set('sneezeIn');
    }
  }

  stepFinisher() {
    const { kind, w, v } = this.fin;
    const t = this.pt;
    const away = Math.sign(v.x - w.x) || w.face;
    if (kind === 'friend') {
      // Достық: nobody gets knocked out, the winner brings a bowl of tea and they make peace
      if (w.state === 'stroll') {
        w.face = away;
        if (Math.abs(v.x - w.x) > 112 && t < 70) w.x += away * 3.2;
        else {
          w.set('offer');
          w.cup = true;
        }
      }
      if (t === 80) {
        v.set('thank');
        v.face = -away;
        v.say('thanks', true);
      }
      if (t === 120) {
        w.cup = false;
        v.cup = true;
        v.set('drink');
        w.set('clap');
      }
      if (t === 150) v.hp = Math.round(v.hpMax * 0.3);
      if (t === 175) {
        v.cup = false;
        v.set('wave');
        w.set('win');
        this.crowd = 1;
        this.word((w.x + v.x) / 2, 270, 'ДОСТЫҚ!');
        this.confetti((w.x + v.x) / 2, 40);
        this.emit('friend', {});
      }
      if (t >= 120 && t < 230 && t % 9 === 0) {
        const x = (w.x + v.x) / 2 + (this.rand() - 0.5) * 120;
        this.fx.push({ k: 'note', x, y: 170 + this.rand() * 40, t: 0, life: 60, text: '♥', color: '#ff6b8a' });
      }
      if (t === 300) this.endFinisher();
    } else if (kind === 'eagle') {
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
      if (t === 175) this.ujat();
      if (t === 260) this.endFinisher();
    } else if (kind === 'dance') {
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
      if (t === 216) this.ujat();
      if (t === 300) this.endFinisher();
    } else if (kind === 'hood') {
      const e = this.eagle;
      if (e) {
        e.flap += 0.4;
        e.t++;
        const head = [v.x, v.def.hurt.stand + 34];
        const home = [w.x + w.face * 30, 150];
        if (t <= 40) {
          const k = t / 40;
          e.x = e.from[0] + (head[0] - e.from[0]) * k;
          e.y = e.from[1] + (head[1] - e.from[1]) * k + Math.sin(k * Math.PI) * 120;
          e.dir = head[0] >= e.from[0] ? 1 : -1;
        } else if (t <= 80) {
          const k = (t - 40) / 40;
          e.hood = false;
          e.x = head[0] + (home[0] - head[0]) * k;
          e.y = head[1] + (home[1] - head[1]) * k + Math.sin(k * Math.PI) * 100;
          e.dir = home[0] >= head[0] ? 1 : -1;
        } else {
          this.eagle = null;
          w.birdOut = false;
          w.set('win');
        }
      }
      if (t === 40) {
        v.hood = true;
        v.set('blind');
        v.say('blind', true);
        this.emit('grab', {});
      }
      if (t > 40) {
        // wandering blind: a few wrong steps, then off the arena the wrong way
        if (t < 120) v.x += Math.sin(t * 0.08) * 1.6;
        else v.x += away * 2.6;
        v.face = t < 120 ? (Math.sin(t * 0.08) > 0 ? 1 : -1) : away;
        if (t === 130) v.say('blind', true);
      }
      if (t === 190) this.ujat();
      if (t === 280) this.endFinisher();
    } else if (kind === 'sleep') {
      if (t === 30) {
        v.set('yawn');
        v.say('sleepy', true);
        this.emit('yawn', { f: v });
      }
      if (t === 100) {
        v.set('sleep');
        this.dust(v.x, 0.6);
      }
      if (t > 100 && t % 26 === 0) this.fx.push({ k: 'zzz', x: v.x + v.face * 20, y: 70, t: 0, life: 70 });
      if (t === 135) v.say('snore', true);
      if (t === 200) w.set('win');
      if (t === 190) this.ujat();
      if (t === 290) this.endFinisher();
    } else if (kind === 'taxi') {
      const car = this.car;
      car.t++;
      if (t <= 70) {
        const k = t / 70;
        const start = w.x - car.dir * 900;
        const nx = start + (car.stopX - start) * (1 - (1 - k) * (1 - k));
        car.wheel += (nx - car.x) / 30;
        car.x = nx;
      } else if (t === 72) {
        car.moving = false;
        v.say('taxi', true);
      } else if (t === 90) {
        v.hidden = true;
        v.set('inCar');
        car.back = v;
        this.emit('door', {});
      } else if (t > 95 && t < 150) {
        const door = car.x + car.dir * 50;
        if (Math.abs(w.x - door) > 6) {
          if (w.state !== 'stroll') w.set('stroll');
          w.face = Math.sign(door - w.x) || 1;
          w.x += w.face * 3.2;
        } else if (!w.hidden) {
          w.hidden = true;
          w.set('inCar');
          car.front = w;
          this.emit('door', {});
        }
      } else if (t === 155) {
        if (!w.hidden) {
          w.hidden = true;
          w.set('inCar');
          car.front = w;
        }
        this.word(car.x, 230, 'БИП-БИП!');
        this.emit('horn', {});
      } else if (t > 160) {
        car.moving = true;
        const sp = Math.min(14, (t - 160) * 0.35);
        car.x += car.dir * sp;
        car.wheel += sp / 30;
        if (t % 6 === 0) this.fx.push({ k: 'dust', x: car.x - car.dir * 220, y: 20, vx: -car.dir * 40, s: 0.6, t: 0, life: 28, color: '#cfcfcf' });
      }
      if (t === 205) this.ujat();
      if (t === 290) this.endFinisher();
    } else if (kind === 'heli') {
      // spinning the rival overhead like a helicopter, then up and away
      if (t <= 120) {
        const ang = t * (0.12 + t * 0.0018);
        v.x = w.x + Math.cos(ang) * 46;
        v.y = 150 + Math.sin(t * 0.2) * 6;
        v.face = Math.sin(ang) > 0 ? 1 : -1;
        v.throwRot = -1.57;
        if (t % 40 === 0) {
          this.word(w.x, 330, 'ВЖЖЖ!');
          this.emit('whirl', {});
        }
        if (t === 30) v.say('fly', true);
      }
      if (t === 121) {
        v.set('blast');
        v.noReturn = true;
        v.vx = w.face * 240;
        v.vy = 2100;
        v.throwRot = 0;
        w.set('win');
        this.emit('throw', { f: w, op: v });
      }
      if (t === 185) this.ujat();
      if (t === 270) this.endFinisher();
    } else if (kind === 'flag') {
      // words rain on the rival until they wave a white scarf
      if (t < 40) v.x += (w.x + w.face * 150 - v.x) * 0.08;
      if (t > 10 && t < 170 && t % 4 === 0) {
        const text = LETTERS[Math.floor(this.rand() * LETTERS.length)];
        const colors = ['#ffd25a', '#ff9a6a', '#9fe0ff', '#d6b8ff', '#ffffff'];
        this.fx.push({ k: 'letter', x: v.x + (this.rand() - 0.5) * 110, y: 520, vy: -200 - this.rand() * 200, stop: 10 + this.rand() * Math.min(120, t * 0.8), text, color: colors[Math.floor(this.rand() * colors.length)], rot: (this.rand() - 0.5) * 0.8, t: 0, life: 330 });
      }
      if (t % 40 === 20 && t < 170) this.emit('words', {});
      if (t === 175) {
        v.set('flag');
        v.say('flag', true);
      }
      if (t === 200) this.ujat();
      if (t === 300) this.endFinisher();
    } else if (kind === 'sneeze') {
      if (t === 10) this.word(w.x, w.def.hurt.stand + 60, 'АП...');
      if (t === 34) this.word(w.x, w.def.hurt.stand + 80, 'АП...');
      if (t === 60) {
        w.set('sneezeOut');
        this.word(w.x + w.face * 120, w.def.hurt.stand, 'АПЧХИ!');
        this.fx.push({ k: 'gust', x: w.x + w.face * 80, y: 140, dir: w.face, t: 0, life: 40 });
        this.shake = 16;
        v.set('blast');
        v.noReturn = true;
        v.vx = w.face * 1300;
        v.vy = 1200;
        v.y = 1;
        this.emit('sneeze', {});
      }
      if (t === 64) v.say('sneeze', true);
      if (t === 100) w.set('win');
      if (t === 160) this.ujat();
      if (t === 250) this.endFinisher();
    }
  }

  ujat() {
    this.crowd = 1;
    this.emit('ujat', { name: this.fin.w.def.finisherName });
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

  confetti(x, n) {
    const colors = ['#ffd25a', '#ff6b5b', '#5fb4ff', '#7dff8a', '#d6b8ff'];
    for (let k = 0; k < n; k++) {
      this.fx.push({ k: 'confetti', x: x + (this.rand() - 0.5) * 300, y: 420 + this.rand() * 100, vx: (this.rand() - 0.5) * 120, vy: -60 - this.rand() * 80, rot: this.rand() * 6, color: colors[k % colors.length], t: 0, life: 160 });
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
      } else if (e.k === 'coin') {
        e.y += e.vy * DT;
      } else if (e.k === 'note' || e.k === 'zzz') {
        e.y += 40 * DT;
      } else if (e.k === 'letter') {
        if (e.y > e.stop) {
          e.vy -= 900 * DT;
          e.y = Math.max(e.stop, e.y + e.vy * DT);
        }
      } else if (e.k === 'confetti') {
        e.x += e.vx * DT;
        e.y += e.vy * DT;
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

const lifts = new Map();
const tuckLift = (f) => {
  if (!lifts.has(f.def.id)) lifts.set(f.def.id, solve(f.poses.tuck, f.def.body).lift);
  return lifts.get(f.def.id);
};

const walkCycle = (f, P, speed = 0.22) => {
  const ph = f.t * speed * (f.def.walk / 200);
  const s = P.stance;
  return {
    ...s,
    lN: [s.lN[0] * 0.5 + Math.sin(ph) * 0.42, -0.25 - Math.max(0, Math.sin(ph + 1.4)) * 0.7],
    lF: [s.lF[0] * 0.5 + Math.sin(ph + Math.PI) * 0.42, -0.25 - Math.max(0, Math.sin(ph + Math.PI + 1.4)) * 0.7],
    lean: s.lean + 0.04,
  };
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
  } else if (st === 'walk' || st === 'stroll') {
    target = walkCycle(f, P);
    k = 0.4;
  } else if (st === 'crouch') {
    target = P.crouch;
    k = 0.45;
  } else if (st === 'prejump' || st === 'land') {
    target = st === 'land' ? P.land : P.prejump;
    k = 0.5;
  } else if (st === 'air') {
    target = f.flip ? { ...P.tuck, rot: f.flipRot(), pin: tuckLift(f) } : P.tuck;
    k = f.flip ? 1 : 0.3;
  } else if (st === 'attack') {
    const mv = f.move;
    const d = mv.d;
    const names = ANIMS[d.anim] || ANIMS.jab;
    const wind = P[names[0]];
    const hit = P[names[1]];
    if (d.anim === 'flurry' && mv.t >= d.s && mv.t < d.s + d.a) {
      const sw = Math.sin(mv.t * 1.7);
      target = { ...hit, aN: [hit.aN[0] + sw * 0.35, hit.aN[1] - sw * 0.3], lean: hit.lean + 0.15 };
      k = 0.8;
    } else if (mv.t < d.s) {
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
  } else if (st === 'fall' || st === 'ko' || st === 'blast') {
    const spin = st === 'fall' ? -0.5 - Math.min(1.0, t * 0.06) : -t * (st === 'blast' ? 0.45 : 0.32);
    target = { ...P.fall, rot: spin + (f.throwRot || 0) };
    k = st === 'fall' ? 0.4 : 1;
  } else if (st === 'heliLift') {
    target = { ...P.lift, lean: -0.1 + Math.sin(t * 0.3) * 0.08 };
    k = 0.4;
  } else if (st === 'thrown' || st === 'heli') {
    const by = f.m.f[1 - f.idx];
    target = st === 'thrown' && by.def.throw.kind === 'ear' ? P.earPulled : { ...P.thrown, rot: f.throwRot || 0, pin: f.y > 1 ? 70 : null };
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
  } else if (st === 'wrapped') {
    const w = Math.sin(t * 0.6);
    target = { ...P.crouch, lean: 0.45 + w * 0.12, head: -0.2, aN: [1.6 + w * 0.5, 0.6], aF: [1.4 - w * 0.5, 0.7] };
    k = 0.5;
  } else if (st === 'blush') {
    target = { ...P.blush, lean: P.blush.lean + Math.sin(t * 0.3) * 0.05 };
    k = 0.4;
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
    if (g && g.kind === 'lift') target = t < 9 ? P.grab : t < 26 ? P.lift : P.toss;
    else if (g && g.kind === 'spin') target = t < 30 ? { ...P.grab, lean: 0.05 + Math.sin(t * 0.4) * 0.1 } : P.toss;
    else target = t < 10 ? P.grab : t < 29 ? { ...P.lift, aN: [P.lift.aN[0] + Math.sin(t * 1.3) * 0.15, P.lift.aN[1]] } : P.toss;
    if (!g && t > 30) target = P.stance;
    k = 0.4;
  } else if (st === 'win') {
    const w = P.win;
    if (f.def.id === 'apa') target = { ...w, aF: [w.aF[0], w.aF[1] + Math.sin(t * 0.35) * 0.35] };
    else if (f.def.id === 'baluan') target = { ...w, lean: Math.sin(t * 0.15) * 0.08 };
    else if (f.def.id === 'taxi') target = { ...w, aF: [w.aF[0] + Math.sin(t * 0.4) * 0.3, w.aF[1]] };
    else target = { ...w, aF: [w.aF[0] + Math.sin(t * 0.25) * 0.1, w.aF[1]] };
    k = 0.2;
  } else if (st === 'lose') {
    target = P.lose;
    k = 0.15;
  } else if (st === 'whistle' || st === 'eagleLaunch' || st === 'keys' || st === 'sneezeIn' || st === 'sneezeOut') {
    target = P[st];
    if (st === 'sneezeIn') target = { ...target, lean: target.lean - Math.min(0.25, t * 0.005), head: target.head - Math.min(0.3, t * 0.006) };
    k = 0.3;
  } else if (st === 'offer' || st === 'thank' || st === 'drink' || st === 'wave') {
    target = P[st];
    if (st === 'wave') target = { ...target, aF: [target.aF[0] + Math.sin(t * 0.3) * 0.25, target.aF[1] + Math.sin(t * 0.3) * 0.3] };
    if (st === 'drink') target = { ...target, head: target.head - Math.min(0.3, t * 0.012), lean: target.lean - Math.min(0.12, t * 0.005) };
    if (st === 'thank') target = { ...target, lean: target.lean + Math.sin(Math.min(t, 40) * 0.08) * 0.15 };
    k = 0.25;
  } else if (st === 'clap') {
    const c = Math.sin(t * 0.5);
    target = { ...P.clap, aN: [P.clap.aN[0] + c * 0.25, P.clap.aN[1] - c * 0.4], aF: [P.clap.aF[0] - c * 0.25, P.clap.aF[1] + c * 0.4], lean: 0.05 + Math.abs(c) * 0.04 };
    k = 0.6;
  } else if (st === 'play') {
    // strumming: the near hand goes up and down over the strings
    const s = Math.sin(t * 0.9);
    target = { ...(P.play || P.stance), aN: [(P.play || P.stance).aN[0] + s * 0.18, (P.play || P.stance).aN[1] - s * 0.2] };
    k = 0.6;
  } else if (st === 'dance') {
    target = zhorga(f, P);
    k = 0.6;
  } else if (st === 'carried') {
    const s = Math.sin(t * 0.3);
    target = { ...P.carried, lN: [0.2 + s * 0.5, -0.2], lF: [-0.1 - s * 0.5, -0.3], pin: f.def.body.th + f.def.body.sh };
    k = 0.5;
  } else if (st === 'blind') {
    const wk = walkCycle(f, P, 0.18);
    const g = Math.sin(t * 0.25) * 0.2;
    target = { ...wk, lean: 0.08, head: -0.1, aN: [P.blind.aN[0] + g, P.blind.aN[1]], aF: [P.blind.aF[0] - g, P.blind.aF[1]] };
    k = 0.4;
  } else if (st === 'yawn') {
    target = P.yawn;
    k = 0.15;
  } else if (st === 'sleep') {
    target = { ...P.sleep, lean: P.sleep.lean + Math.sin(t * 0.08) * 0.03 };
    k = 0.15;
  } else if (st === 'taunt') {
    const s = Math.sin(t * 0.4);
    const tp = P.taunt;
    target = { ...tp, aF: [tp.aF[0], tp.aF[1] + s * 0.5], lean: tp.lean + Math.abs(s) * 0.05 };
    k = 0.5;
  } else if (st === 'wave') {
    const s = Math.sin(t * 0.3);
    target = { ...P.win, aN: [2.2 + s * 0.2, 0.3], aF: [2.4 - s * 0.2, 0.3] };
    k = 0.4;
  } else if (st === 'flag') {
    const s = Math.sin(t * 0.4);
    target = { ...P.lose, aF: [2.7 + s * 0.2, 0.3], head: 0.2 };
    k = 0.4;
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
  const sp = f.curSpec || f.def.spec;
  const t = f.t;
  switch (sp.kind) {
    case 'lasso':
      if (t < sp.s) return { ...P.lassoWind, aF: [2.6 + Math.sin(t * 0.9) * 0.35, 0.6 + Math.cos(t * 0.9) * 0.3] };
      if (f.lasso && f.lasso.caught) return P.lassoPull;
      if (f.lasso) return t < sp.s + 5 ? P.lassoThrow : P.lassoHold;
      return P.stance;
    case 'eagle':
      return t < sp.s ? { ...P.stance, aN: [0.8, 2.0], lean: 0.05 } : P.eagleLaunch;
    case 'wave': {
      const s = Math.sin(t * 1.1);
      return { ...(P.play || P.stance), aN: [(P.play || P.stance).aN[0] + s * 0.25, (P.play || P.stance).aN[1] - s * 0.3], lean: t < sp.s ? 0.02 : 0.2 };
    }
    case 'stomp':
      return t < sp.s ? P.stompWind : P.stomp;
    case 'grab':
      return t < sp.s ? P.crouch : P.dash;
    case 'gust':
      return t < sp.s ? { ...P.stance, aN: [0.8, 2.0] } : P.eagleLaunch;
    case 'boulder':
      return t < sp.s ? P.lift : P.toss;
    case 'candy':
      return t < sp.s ? P.throwWind : { ...P.throwOut, aN: [2.0, 0.2] };
    default:
      return t < sp.s ? P.throwWind : P.throwOut;
  }
}

Fighter.prototype.flipRot = function flipRot() {
  // a forward jump is a somersault, a back jump flips the other way
  const air = (2 * this.def.jump) / GRAV;
  const k = Math.min(1, (this.t + 4) / (air * 60));
  return this.flip * k * Math.PI * 2;
};

const ANIMS = {
  jab: ['jabWind', 'jab'],
  ladle: ['jabWind', 'jab'],
  palm: ['jabWind', 'jab'],
  dombra: ['jabWind', 'jab'],
  club: ['jabWind', 'jab'],
  kick: ['kickWind', 'kick'],
  upper: ['upperWind', 'upper'],
  kazan: ['upperWind', 'upper'],
  dombraUp: ['upperWind', 'upper'],
  clubUp: ['upperWind', 'upper'],
  sweep: ['sweepWind', 'sweep'],
  ladleLow: ['sweepWind', 'sweep'],
  dombraLow: ['sweepWind', 'sweep'],
  clubLow: ['sweepWind', 'sweep'],
  airP: ['tuck', 'airP'],
  airLadle: ['tuck', 'airP'],
  airDombra: ['tuck', 'airP'],
  airK: ['tuck', 'airK'],
  charge: ['block', 'charge'],
  ram: ['prejump', 'ram'],
  flurry: ['play', 'play'],
};
