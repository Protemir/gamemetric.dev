// HUD: radar, crosshair, health, ammo, kill feed, scores, buy menu. Plain DOM + one canvas.
import { W, H } from './map.js';
import { WEAPONS, GEAR } from './weapons.js';
import { t, lang } from './i18n.js';
import { levelOf, rankName, medalsOf, xpOf, award } from './rank.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const S = 3; // radar pixels per metre

export const BUY_ITEMS = [
  { key: '1', item: 'pistol', group: 'pistols' },
  { key: '2', item: 'deagle', group: 'pistols' },
  { key: '3', item: 'smg', group: 'primaries' },
  { key: '4', item: 'shotgun', group: 'primaries' },
  { key: '5', item: 'rifle', group: 'primaries' },
  { key: '6', item: 'm4', group: 'primaries' },
  { key: '7', item: 'scout', group: 'primaries' },
  { key: '8', item: 'sniper', group: 'primaries' },
  { key: '9', item: 'mg', group: 'primaries' },
  { key: 'Z', item: 'armor', group: 'gear' },
  { key: 'X', item: 'helmet', group: 'gear' },
  { key: 'G', item: 'he', group: 'gear' },
  { key: 'V', item: 'flash', group: 'gear' },
  { key: 'N', item: 'smoke', group: 'gear' },
];

const ICON = {
  knife: '🗡', pistol: '🔫', deagle: '🔫', smg: '▬', shotgun: '▬', rifle: '▬', sniper: '▬', m4: '▬', scout: '▬', mg: '▬', he: '💥', flash: '✸', smoke: '☁',
};

const MEDAL_ICON = { immortal: '🛡️', grinder: '🌪️', triple: '🔥', sniper: '🎯', ninja: '🔪', boomer: '💥', chickens: '🐔', eagle: '🦅', unstoppable: '🚂', swimmer: '🏊', pacifist: '🕊️', fodder: '🥩', teamplayer: '🤝' };

export class Hud {
  constructor() {
    this.radar = $('radar');
    this.rctx = this.radar.getContext('2d');
    this.feedEl = $('feed');
    this.centerEl = $('center-msg');
    this.bannerEl = $('banner');
    this.centerUntil = 0;
    this.bannerUntil = 0;
    this.hitUntil = 0;
    this.lastDom = 0;
    this.hurtEls = [];
    this.mapImg = null;
    this.buyOpen = false;
  }

  attach(game) {
    this.game = game;
    $('board').hidden = true;
    this.mapImg = this.drawMap(game.map);
    this.feedEl.innerHTML = '';
    this.buildBuy();
    $('match-over').hidden = true;
    this.bannerEl.hidden = true;
  }

  drawMap(map) {
    const c = document.createElement('canvas');
    c.width = W * S;
    c.height = H * S;
    const g = c.getContext('2d');
    g.fillStyle = '#1d2a1a';
    g.fillRect(0, 0, c.width, c.height);
    for (let z = 0; z < H; z++)
      for (let x = 0; x < W; x++) {
        const i = z * W + x, h = map.h[i];
        let col;
        if (map.noWalk[i]) col = '#2d6f93';
        else if (h >= 3) col = '#b9b2a2';
        else if (h >= 2) col = '#6f6a5c';
        else if (h > 0) col = '#555046';
        else if (map.indoor[i]) col = '#3c3830';
        else if (map.floor[i] === 2 || map.floor[i] === 3 || map.floor[i] === 11) col = '#34352f';
        else col = '#22301e';
        g.fillStyle = col;
        g.fillRect(x * S, z * S, S, S);
      }
    if (this.game.mode === 'hostage') {
      const R = map.rescue;
      g.strokeStyle = '#4fe08a';
      g.lineWidth = 2;
      g.strokeRect(R.x0 * S, R.z0 * S, (R.x1 - R.x0 + 1) * S, (R.z1 - R.z0 + 1) * S);
    }
    return c;
  }

  buildBuy() {
    const el = $('buy-grid');
    el.innerHTML = '';
    let group = '';
    for (const b of BUY_ITEMS) {
      if (b.group !== group) {
        group = b.group;
        const h = document.createElement('div');
        h.className = 'buy-group';
        h.textContent = t(group);
        el.appendChild(h);
      }
      const d = WEAPONS[b.item] || GEAR[b.item];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'buy-item';
      btn.dataset.item = b.item;
      btn.innerHTML = `<kbd>${b.key}</kbd><span class="bi-name">${d.name[lang]}</span><span class="bi-price"></span>`;
      el.appendChild(btn);
    }
  }

  refreshBuy() {
    const g = this.game, p = g.player;
    const free = g.mode === 'dm';
    $('buy-money').textContent = free ? t('free') : `$${p.money}`;
    const left = g.buyTimeLeft();
    $('buy-time').textContent = free ? '' : left > 0 ? `${Math.ceil(left)} ${lang === 'ru' ? 'с' : 's'}` : t('buyClosed');
    for (const btn of document.querySelectorAll('.buy-item')) {
      const item = btn.dataset.item;
      const price = g.priceOf(p, item);
      btn.querySelector('.bi-price').textContent = free ? '' : `$${price}`;
      btn.classList.toggle('poor', !free && p.money < price);
      const have = (WEAPONS[item] && (p.slots[1] === item || p.slots[2] === item)) || (item === 'helmet' && p.helmet && p.armor >= 100) || (item === 'armor' && p.armor >= 100) || (item === 'he' && p.he > 0) || (item === 'flash' && p.flash >= 2) || (item === 'smoke' && p.smoke > 0);
      btn.classList.toggle('have', !!have);
    }
  }

  variantInfo(game) {
    const el = document.getElementById('variant');
    if (!el) return;
    const v = game.variant, p = game.player;
    if (v === 'gun') el.textContent = `${t('level')} ${(p.gunLevel || 0) + 1}/10`;
    else if (v === 'zombie') el.textContent = `${t('peopleLeft')}: ${game.soldiers.filter((s) => s.team === 'A' && s.alive).length}`;
    else if (v === 'knife') el.textContent = t('modeKnife');
    el.hidden = !v;
  }

  // low health shows as red pulsing edges
  lowHealth(hp) {
    const el = document.getElementById('lowhp');
    if (el) el.classList.toggle('low', hp > 0 && hp <= 30);
  }

  // a big word in the middle of the screen with a punch
  announce(text, level = 1) {
    const el = document.getElementById('announce');
    if (!el) return;
    el.textContent = text;
    el.className = '';
    void el.offsetWidth;
    el.className = 'go l' + level;
  }

  center(text, dur = 2) {
    this.centerEl.textContent = text;
    this.centerEl.classList.add('show');
    this.centerUntil = performance.now() + dur * 1000;
  }

  banner(title, sub, good) {
    this.bannerEl.hidden = false;
    this.bannerEl.className = 'banner ' + (good ? 'good' : 'bad');
    this.bannerEl.querySelector('b').textContent = title;
    this.bannerEl.querySelector('span').textContent = sub;
    this.bannerUntil = performance.now() + 4200;
  }

  feed(killer, victim, weapon, head) {
    const row = document.createElement('div');
    const me = this.game.player;
    row.className = 'feed-row' + (killer === me || victim === me ? ' mine' : '');
    const name = (s) => `<span class="${s.team === 'A' ? 'ta' : 'tb'}">${esc(s.name)}</span>`;
    const w = WEAPONS[weapon]?.name[lang] || '';
    row.innerHTML = killer && killer !== victim ? `${name(killer)} <i>${esc(w)}${head ? ' ◉' : ''}</i> ${name(victim)}` : `<i>☠</i> ${name(victim)}`;
    this.feedEl.prepend(row);
    while (this.feedEl.children.length > 5) this.feedEl.lastChild.remove();
    setTimeout(() => row.remove(), 6000);
  }

  notice(text) {
    if (!this.feedEl) return;
    const row = document.createElement('div');
    row.className = 'feed-row note';
    row.textContent = text;
    this.feedEl.prepend(row);
    while (this.feedEl.children.length > 6) this.feedEl.lastChild.remove();
    setTimeout(() => row.remove(), 7000);
  }

  hit(head, kill) {
    const el = $('hitmark');
    el.className = 'hitmark show' + (head ? ' head' : '') + (kill ? ' kill' : '');
    this.hitUntil = performance.now() + (kill ? 300 : 160);
  }

  hurt(angle, dmg) {
    const el = document.createElement('div');
    el.className = 'hurt';
    el.style.transform = `translate(-50%,-50%) rotate(${-angle}rad)`;
    el.style.opacity = Math.min(1, 0.4 + dmg / 40);
    $('hurt-layer').appendChild(el);
    setTimeout(() => el.remove(), 900);
    const v = $('vignette');
    v.style.opacity = Math.min(0.8, 0.25 + dmg / 60);
    clearTimeout(this._vt);
    this._vt = setTimeout(() => (v.style.opacity = 0), 220);
  }

  matchOver(win, game) {
    const el = $('match-over');
    el.hidden = false;
    if (this.buyOpen) this.onBuyClosed?.();
    $('pause').hidden = true;
    $('settings').hidden = true;
    $('click-to-play').hidden = true;
    document.exitPointerLock?.();
    $('mo-title').textContent = t(win === null ? 'draw' : win ? 'matchWin' : 'matchLose');
    $('mo-title').className = win === null ? '' : win ? 'good' : 'bad';
    $('mo-again').hidden = game.role !== 'solo';
    $('mo-score').textContent = game.variant === 'zombie' ? `${t('peopleLeft')}: ${game.soldiers.filter((s) => s.team === 'A' && s.alive).length}` : game.variant === 'gun' ? '' : game.mode === 'dm' ? `${game.dmKills.A} : ${game.dmKills.B}` : `${game.score.A} : ${game.score.B}`;
    const p = game.player;
    const st = game.stats;
    const acc = st.shots ? Math.round((100 * st.hits) / st.shots) : 0;
    $('mo-stats').innerHTML = [
      [t('kills'), p.kills],
      [t('deaths'), p.deaths],
      [t('headshots'), st.hs],
      [t('accuracy'), st.shots ? acc + '%' : '—'],
      [t('damage'), Math.round(st.dmg)],
      [t('bestStreak'), st.best],
    ]
      .map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`)
      .join('');
    const medals = medalsOf(st, p, !!win);
    $('mo-medals').innerHTML = medals
      .map((m, i) => `<div class="medal" style="animation-delay:${0.25 + i * 0.18}s"><i>${MEDAL_ICON[m]}</i><b>${t('medal_' + m)}</b><small>${t('medal_' + m + '_d')}</small></div>`)
      .join('');
    $('mo-medals').hidden = !medals.length;
    // experience: kept between visits; the bar fills from where it was
    const played = p.kills + p.deaths > 0 || st.shots > 0;
    const xp = xpOf(st, p, !!win && played, played);
    const { before, after } = award(xp.total);
    $('mo-xpgain').textContent = '+' + xp.total + ' ' + t('xp');
    $('mo-xpparts').textContent = xp.parts.map(([k, v]) => `+${v} ${t(k)}`).join(' · ');
    this.xpBar(before, after);
    document.exitPointerLock?.();
  }

  // the bar after a match: fills to the new amount, through a rank-up if there is one
  xpBar(before, after) {
    clearTimeout(this.xpTimer);
    const bar = $('mo-xpbar'), name = $('mo-rank'), up = $('mo-rankup'), next = $('mo-xpnext');
    const a = levelOf(before), b = levelOf(after);
    const show = (lv, frac, anim) => {
      bar.style.transition = anim ? 'width 0.9s cubic-bezier(.2,.8,.2,1)' : 'none';
      bar.style.width = (Math.max(0, Math.min(1, frac)) * 100).toFixed(1) + '%';
      name.textContent = rankName(lv);
    };
    const tail = () => {
      const left = b.span - b.into;
      next.textContent = t('xpToNext').replace('{n}', left).replace('{r}', rankName(b.level + 1));
    };
    up.hidden = true;
    show(a.level, a.into / a.span, false);
    tail();
    if (b.level === a.level) {
      this.xpTimer = setTimeout(() => show(b.level, b.into / b.span, true), 450);
      return;
    }
    // to the end of the old rank, then the new one from zero
    this.xpTimer = setTimeout(() => {
      show(a.level, 1, true);
      this.xpTimer = setTimeout(() => {
        show(b.level, 0, false);
        if ($('match-over').hidden) return;
        up.hidden = false;
        up.textContent = t('rankUp') + ' ' + rankName(b.level);
        sfx('streak', null, { n: 5 });
        this.xpTimer = setTimeout(() => show(b.level, b.into / b.span, true), 60);
      }, 1000);
    }, 450);
  }

  // a live grenade or flashbang close by: a pulsing icon round the crosshair, on the side it lies
  nadeWarn(game) {
    const el = $('nade-warn'), p = game.player;
    let best = null, bd = 8;
    if (p.alive && !game.over)
      for (const n of game.nades) {
        // a teammate's grenade does not hurt us, but his flashbang blinds us all the same
        if (n.kind === 'smoke' || (n.kind === 'he' && n.owner && n.owner !== p && n.owner.team === p.team)) continue;
        const d = Math.hypot(n.x - p.x, n.z - p.z, (n.y - p.feet - 1) * 0.5);
        if (d < bd) {
          bd = d;
          best = n;
        }
      }
    if (!best) {
      if (!el.hidden) el.hidden = true;
      return;
    }
    el.hidden = false;
    const a = Math.atan2(-(best.x - p.x), -(best.z - p.z)) - p.yaw;
    el.style.transform = `translate(-50%,-50%) rotate(${-a}rad)`;
    const icon = el.firstChild;
    icon.style.transform = `translateX(-50%) rotate(${a}rad)`;
    el.style.setProperty('--k', (1 - bd / 8).toFixed(2));
    const sym = best.kind === 'he' ? '💣' : '⚡';
    if (icon.textContent !== sym) icon.textContent = sym;
  }

  // ---------- per frame ----------
  update(game, now, settings, fps) {
    this.lowHealth(game.player.alive ? game.player.hp : 0);
    this.nadeWarn(game);
    const p = game.player;
    this.drawRadar(game);
    // crosshair gap follows the real spread
    const src = game.specTarget || p;
    const w = WEAPONS[src.kind] || WEAPONS.knife;
    const hs = Math.hypot(src.vx, src.vz);
    let gap = 4;
    if (w.spread) {
      gap = 4 + (w.moveSpread * Math.max(0, Math.min(1, (hs - 1.4) / Math.max(1, w.speed - 1.4))) + (src.onGround ? 0 : 0.1) + (w.auto ? Math.min(src.shots || 0, 10) * w.spread * 0.12 : 0)) * 260;
      if (w.scope) gap += 14;
    }
    if (src.crouchK > 0.5) gap *= 0.8;
    const ch = $('crosshair');
    ch.style.setProperty('--gap', `${Math.min(46, gap).toFixed(1)}px`);
    // like the real thing: no crosshair on a sniper rifle without the scope
    ch.hidden = !src.alive || (src === p && p.scoped) || !!w.scope;
    $('scope').hidden = !(src === p && p.alive && p.scoped);
    if (now > this.hitUntil) $('hitmark').className = 'hitmark';
    // flash
    const fw = $('flash-white');
    if (game.flashWhite > 0) {
      fw.style.opacity = Math.min(1, game.flashWhite / 1.2);
      fw.hidden = false;
    } else fw.hidden = true;

    if (now - this.lastDom < 66) return;
    this.lastDom = now;
    this.variantInfo(game);
    if (now > this.centerUntil) this.centerEl.classList.remove('show');
    if (now > this.bannerUntil) this.bannerEl.hidden = true;
    // vitals of whoever we are watching
    $('hp').textContent = Math.max(0, Math.ceil(src.hp ?? 0));
    $('hp-box').classList.toggle('low', (src.hp ?? 0) <= 25);
    $('armor').textContent = Math.ceil(src.armor || 0);
    $('helmet').hidden = !src.helmet;
    $('money').textContent = `$${p.money}`;
    $('money').hidden = game.mode === 'dm';
    const a = src.ammoOf(src.kind);
    const wk = WEAPONS[src.kind];
    $('wname').textContent = wk?.name[lang] || '';
    if (wk && wk.mag && src !== p && game.role === 'client') {
      $('ammo').textContent = '';
      $('reserve').textContent = '';
      $('ammo-box').classList.remove('low');
    } else if (wk && wk.mag) {
      $('ammo').textContent = a.mag;
      $('reserve').textContent = `/ ${a.res}`;
      $('ammo-box').classList.toggle('low', a.mag <= Math.ceil(wk.mag * 0.2));
    } else if (wk && wk.nade) {
      $('ammo').textContent = src.kind === 'he' ? src.he : src.kind === 'smoke' ? src.smoke : src.flash;
      $('reserve').textContent = '';
      $('ammo-box').classList.remove('low');
    } else {
      $('ammo').textContent = '';
      $('reserve').textContent = '';
      $('ammo-box').classList.remove('low');
    }
    $('reloading').hidden = !(src === p && p.reloadUntil);
    // slots
    const slots = [];
    for (const n of [1, 2, 3, 4, 5, 6]) {
      if (!src.hasSlot(n)) continue;
      const k = n === 4 ? 'he' : n === 5 ? 'flash' : n === 6 ? 'smoke' : src.slots[n];
      slots.push(`<span class="${src.cur === n ? 'on' : ''}">${n} ${WEAPONS[k].name[lang].replace(/«|»|"/g, '')}${n === 5 && src.flash > 1 ? ' ×2' : ''}</span>`);
    }
    $('slots').innerHTML = slots.join('');
    // top bar
    if (game.mode === 'dm') {
      $('sc-a').textContent = game.dmKills.A;
      $('sc-b').textContent = game.dmKills.B;
      const left = Math.max(0, game.phaseEnd - game.time);
      $('timer').textContent = fmt(left);
      $('timer').classList.remove('freeze', 'low');
    } else {
      $('sc-a').textContent = game.score.A;
      $('sc-b').textContent = game.score.B;
      const left = Math.max(0, game.phaseEnd - game.time);
      $('timer').textContent = game.phase === 'end' ? '—' : fmt(left);
      $('timer').classList.toggle('freeze', game.phase === 'freeze');
      $('timer').classList.toggle('low', game.phase === 'live' && left < 15);
    }
    const dots = (team) => game.soldiers.filter((s) => s.team === team).map((s) => `<i class="${s.alive ? '' : 'dead'}${s.isPlayer ? ' me' : ''}"></i>`).join('');
    $('alive-a').innerHTML = dots('A');
    $('alive-b').innerHTML = dots('B');
    $('hostages').innerHTML = game.hostages.map((h) => `<i class="h-${h.state}"></i>`).join('');
    // spectate / respawn
    const spec = $('spec');
    if (!p.alive) {
      spec.hidden = false;
      if (game.mode === 'dm' && p.respawnAt) spec.textContent = `${t('respawn')} ${Math.max(0, Math.ceil(p.respawnAt - game.time))}`;
      else spec.textContent = game.specTarget ? `${t('spectating')}: ${game.specTarget.name}` : t('youDied');
    } else spec.hidden = true;
    // hostage prompt
    const nh = game.nearHostage();
    const pr = $('prompt');
    // a grenade with the pin out: nothing under the crosshair but the arc
    if (p.pinAt) pr.hidden = true;
    else if (nh) {
      pr.hidden = false;
      pr.textContent = nh.leader === p ? t('pressEstop') : nh.state === 'idle' ? t('pressE') : '';
      if (!pr.textContent) pr.hidden = true;
    } else if (game.nearDrop(p)) {
      pr.hidden = false;
      pr.textContent = `${t('pickUp')} ${WEAPONS[game.nearDrop(p).kind].name[lang]}`;
    } else if (p.alive && game.canBuy(p) && game.phase !== 'end') {
      pr.hidden = false;
      pr.textContent = `${document.body.classList.contains('touch') ? '$' : 'B'} — ${t('buy')}`;
    } else pr.hidden = true;
    // freeze countdown
    if (game.phase === 'freeze' && performance.now() > (this.centerUntil || 0) - 150) this.center(`${t('round')} ${game.round} · ${t('freeze')} ${Math.ceil(game.phaseEnd - game.time)}`, 0.2);
    if (game.phase === 'wait') this.center(t('inMatch'), 0.2);
    // the buy menu closes itself when buying is no longer possible
    if (this.buyOpen && (!p.alive || !game.canBuy(p))) this.onBuyClosed?.();
    if (this.buyOpen) this.refreshBuy();
    $('fps').hidden = !settings.showFps;
    $('fps').textContent = `${fps} FPS`;
    if (!$('board').hidden) this.drawBoard(game);
  }

  drawBoard(game) {
    const dm = game.mode === 'dm';
    const sc = dm ? game.dmKills : game.score;
    const mine = game.player.team;
    const rows = (team) =>
      game.soldiers
        .filter((s) => s.team === team)
        .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)
        .map((s) => `<tr class="${s.alive ? '' : 'dead'}${s.isPlayer ? ' me' : ''}"><td>${esc(s.name)}</td><td>${s.kills}</td><td>${s.deaths}</td>${dm ? '' : `<td>${team === mine ? '$' + s.money : ''}</td>`}</tr>`)
        .join('');
    const head = `<tr><th>${t('player')}</th><th>${t('kills')}</th><th>${t('deaths')}</th>${dm ? '' : `<th>${t('money')}</th>`}</tr>`;
    const alive = (team) => game.soldiers.filter((s) => s.team === team && s.alive).length;
    const you = (team) => (team === mine ? ` · ${t('yourTeam')}` : '');
    const v = game.variant;
    const lead = v === 'gun' ? game.soldiers.reduce((b, s) => ((s.gunLevel || 0) > (b.gunLevel || 0) ? s : b), game.soldiers[0]) : null;
    const sub = v === 'gun' ? `${t('modeGun')} · ${t('leader')}: ${esc(lead.name)} (${(lead.gunLevel || 0) + 1}/10)` : v === 'zombie' ? `${t('modeZombie')} · ${t('peopleLeft')}: ${game.soldiers.filter((s) => s.team === 'A' && s.alive).length}` : v === 'knife' ? t('toKills').replace('{n}', 30) : dm ? t('toKills').replace('{n}', 60) : `${t('round')} ${game.round} · ${t('toWins').replace('{n}', 8)}`;
    $('board-head').innerHTML = `<div class="bh-team ta">${t('sideA')}</div><div class="bh-score"><span class="ta">${sc.A}</span><i>:</i><span class="tb">${sc.B}</span></div><div class="bh-team tb">${t('sideB')}</div><div class="bh-sub">${sub}</div>`;
    $('board-a').innerHTML = `<caption>${t('aliveN')} ${alive('A')}/5${you('A')}</caption>${head}${rows('A')}`;
    $('board-b').innerHTML = `<caption>${t('aliveN')} ${alive('B')}/5${you('B')}</caption>${head}${rows('B')}`;
  }

  drawRadar(game) {
    const g = this.rctx, c = this.radar, R = c.width / 2;
    const v = game.view;
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#10160f';
    g.fillRect(0, 0, c.width, c.height);
    g.translate(R, R);
    g.rotate(v.yaw);
    g.globalAlpha = 0.9;
    g.drawImage(this.mapImg, -v.x * S, -v.z * S);
    g.globalAlpha = 1;
    const me = game.player;
    const dot = (x, z, col, r = 3.2) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc((x - v.x) * S, (z - v.z) * S, r, 0, Math.PI * 2);
      g.fill();
    };
    for (const h of game.hostages) if (h.state === 'idle' || h.state === 'follow') dot(h.x, h.z, '#ffd23f', 3);
    for (const s of game.soldiers) {
      if (!s.alive || s === game.specTarget || (s.isPlayer && !game.specTarget)) continue;
      if (s.team === me.team) dot(s.x, s.z, s.team === 'A' ? '#5aa9ff' : '#ff6a5a');
      else {
        const seen = game.spotted.get(s);
        if (seen && seen.by === me.team && game.time - seen.t < 1.5) dot(seen.x, seen.z, '#ff3030', 3.4);
      }
    }
    g.restore();
    // me
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(R, R - 6);
    g.lineTo(R + 4.5, R + 5);
    g.lineTo(R, R + 2.5);
    g.lineTo(R - 4.5, R + 5);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.25)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.stroke();
  }
}

function fmt(s) {
  s = Math.ceil(s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
