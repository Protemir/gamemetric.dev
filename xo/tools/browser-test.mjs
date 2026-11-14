// Plays the real page in headless Chrome: the menu, both modes, the score, the languages, the Back
// button and the layout on phones, tablets and computers. Run through:  node xo/tools/test.mjs --browser
// Add --shots <folder> to save pictures of the main screens.
import fs from 'node:fs';
import path from 'node:path';
import { serve, chrome } from '../../oyu/tools/cdp.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// width × height of the visible page: phones with and without the browser's bars, tablets, computers
const PORTRAIT = [[320, 454], [320, 568], [360, 560], [360, 640], [375, 553], [375, 667], [390, 664], [390, 844], [412, 915], [768, 1024]];
const LANDSCAPE = [[568, 270], [568, 320], [640, 360], [667, 331], [667, 375], [844, 340], [844, 390], [915, 412]];
const DESKTOP = [[1024, 768], [1280, 720], [1366, 650], [1920, 950]];

// what the page looks like right now: sizes, places of the main parts, texts that did not fit
const PROBE = `(() => {
  const shown = (el) => el && el.getClientRects().length > 0;
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!shown(el)) return null;
    const r = el.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
  };
  const cut = [];
  for (const el of document.querySelectorAll('.who, .tag, .btn, .status, .level, .mode-text b, .mode-text small, h1, .lead, .home, .back')) {
    if (!shown(el)) continue;
    if (el.scrollWidth > el.clientWidth + 1) cut.push((el.id || el.className) + ': ' + el.textContent.trim());
  }
  const cells = [...document.querySelectorAll('.cell')].map((c) => c.getBoundingClientRect());
  const doc = document.documentElement;
  return {
    vw: innerWidth, vh: innerHeight, sw: doc.scrollWidth, sh: doc.scrollHeight, cut,
    cell: cells.length && shown(document.querySelector('.cell')) ? Math.min(...cells.map((r) => Math.min(r.width, r.height))) : 0,
    top: box('.top'), back: box('#back'), home: box('#home'), tag: box('#modeTag'), sound: box('#sound'), langs: box('#langs'),
    score: box('.score'), board: box('#board'), status: box('#status'), actions: box('.actions'),
    intro: box('.intro'), art: box('#art'), h1: box('h1'), modes: box('.modes'), duo: box('.mode.duo'), bot: box('.mode.bot'), foot: box('#foot'),
  };
})()`;

const apart = (a, b) => !a || !b || a.r <= b.l + 0.5 || b.r <= a.l + 0.5 || a.b <= b.t + 0.5 || b.b <= a.t + 0.5;
const inside = (a, p) => !a || (a.l >= -0.5 && a.t >= -0.5 && a.r <= p.vw + 0.5 && a.b <= p.vh + 0.5);

export async function browserTests(repo, check, shots) {
  const S = await serve(repo);
  const B = await chrome();
  const page = `${S.url}/xo/`;
  const text = (sel) => B.js(`document.querySelector(${JSON.stringify(sel)}).textContent.trim()`);
  const click = (sel) => B.js(`document.querySelector(${JSON.stringify(sel)}).click()`);
  const cell = (i) => B.js(`document.querySelectorAll('.cell')[${i}].click()`);
  // a real press of the mouse in the middle of an element; click() above looks like a key press to the page
  const tap = async (sel) => {
    const [x, y] = await B.js(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    await B.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await B.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  const marks = () => B.js(`[...document.querySelectorAll('.cell')].map((c) => c.dataset.m || '.').join('')`);
  const view = () => B.js(`document.body.dataset.view`);
  const shot = async (name) => {
    if (!shots) return;
    fs.mkdirSync(shots, { recursive: true });
    await B.shot(path.join(shots, name + '.png'));
  };
  // A real reload. Going to the same address with another #part does not load the page again,
  // and open() would wait for a load that never comes.
  const fresh = async (url, w, h) => {
    await B.open('about:blank', w, h);
    await B.open(url, w, h);
  };
  // the other screen of the same page
  const to = (hash) => B.js(`(location.hash = ${JSON.stringify(hash)}, new Promise((r) => setTimeout(r, 60)))`);

  try {
    // timers run at once, so a game with the bot takes milliseconds; the first load also clears what was saved
    await B.init(`{ const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, Math.min(ms || 0, 4), ...a); }
      try { if (!sessionStorage.getItem('xo.test')) { sessionStorage.setItem('xo.test', '1'); localStorage.clear(); } } catch {}`);
    await B.open(page + '?lang=ru', 390, 700);

    // ---------- menu ----------
    check('page: opens on the menu', (await view()) === 'menu' && (await text('h1')) === 'Крестики-нолики');
    check('page: four ways to start', (await B.js(`document.querySelectorAll('[data-start]').length`)) === 4);
    check('page: the menu picture is drawn', (await B.js(`document.querySelectorAll('#art .m').length`)) === 7);
    check('page: the link to all games keeps the language', (await B.js(`document.querySelector('#home').getAttribute('href')`)) === '../?lang=ru');

    // ---------- two players ----------
    await click('[data-start="duo"]');
    check('duo: the game opens', (await view()) === 'game' && (await B.js('location.hash')) === '#duo');
    check('keys: started from the keyboard, the focus goes to the middle of the board', (await B.js(`document.activeElement.dataset.i`)) === '4');
    check('duo: crosses move first', (await text('#status')) === 'Ход крестиков' && (await text('#modeTag')) === 'Вдвоём');
    check('duo: both sides are people', (await text('#whoX')) === 'Игрок 1' && (await text('#whoO')) === 'Игрок 2');
    await cell(0);
    check('duo: a tap puts a cross', (await marks()) === 'x........' && (await text('#status')) === 'Ход ноликов');
    await cell(0);
    check('duo: a taken cell stays as it is', (await marks()) === 'x........');
    for (const i of [3, 1, 4, 2]) await cell(i);
    check('duo: three in a row ends the round', (await marks()) === 'xxxoo....' && (await text('#status')) === 'Крестики победили!');
    check('duo: the winning cells are marked', (await B.js(`[...document.querySelectorAll('.cell.win')].map((c) => c.dataset.i).join('')`)) === '012');
    check('duo: the line is drawn through them', (await B.js(`document.querySelectorAll('.strike path').length`)) === 1);
    check('duo: the score counts the win', (await text('#numX')) === '1' && (await text('#numO')) === '0' && (await text('#numD')) === '0');
    await cell(8);
    check('duo: a tap right after the end does not start a round', (await marks()) === 'xxxoo....');
    check('duo: the button offers one more round', (await text('#again')) === 'Ещё раунд' && (await B.js(`document.querySelector('#again').classList.contains('primary')`)));
    await click('#again');
    check('duo: the next round is empty and noughts start', (await marks()) === '.........' && (await text('#status')) === 'Ход ноликов');
    check('duo: the line is gone', (await B.js(`document.querySelectorAll('.strike path').length`)) === 0);
    for (const i of [0, 1, 2, 4, 3, 5, 7, 6, 8]) await cell(i);
    check('duo: a full board is a draw', (await marks()) === 'oxooxxxoo' && (await text('#status')) === 'Ничья' && (await text('#numD')) === '1');
    await wait(750);
    await cell(4);
    check('duo: a tap on the board later starts the next round', (await marks()) === '.........' && (await text('#status')) === 'Ход крестиков');
    await cell(4);
    await click('#again');
    check('duo: a restarted round keeps its first move', (await marks()) === '.........' && (await text('#status')) === 'Ход крестиков');
    check('duo: nothing to restart on an empty board', await B.js(`document.querySelector('#again').disabled`));

    // keyboard: arrows walk, Enter plays
    await B.js(`document.querySelectorAll('.cell')[4].focus()`);
    const key = async (k) => {
      await B.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: { ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, ArrowDown: 40, Enter: 13 }[k], text: k === 'Enter' ? '\r' : undefined });
      await B.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: { ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, ArrowDown: 40, Enter: 13 }[k] });
    };
    await key('ArrowRight');
    await key('ArrowUp');
    check('keys: arrows move over the cells', (await B.js(`document.activeElement.dataset.i`)) === '2');
    await key('ArrowRight');
    check('keys: the arrow does not jump to the next row', (await B.js(`document.activeElement.dataset.i`)) === '2');
    await key('Enter');
    check('keys: Enter puts the mark', (await marks()) === '..x......');

    await click('#reset');
    check('duo: the score can be cleared', (await text('#numX')) === '0' && (await text('#numD')) === '0' && (await B.js(`document.querySelector('#reset').disabled`)));

    // ---------- back to the menu ----------
    await click('#back');
    await wait(150);
    check('menu: the button returns to it', (await view()) === 'menu' && (await B.js('location.hash')) === '');
    check('keys: and the focus returns to the button that started the game', (await B.js(`document.activeElement.dataset.start`)) === 'duo');
    await B.js('history.forward()');
    await wait(150);
    check('menu: the browser can go forward into the game again', (await view()) === 'game' && (await B.js('location.hash')) === '#duo');
    await B.js('history.back()');
    await wait(150);
    check('menu: the browser Back button returns to it', (await view()) === 'menu');

    // with a mouse or a finger the focus stays out of the way
    await tap('[data-start="duo"]');
    await wait(100);
    check('mouse: a click opens the game', (await view()) === 'game');
    check('mouse: no focus ring is put on the board', !(await B.js(`document.activeElement.classList.contains('cell')`)));
    await tap('.cell');
    check('mouse: a click plays', (await marks()) === 'x........');
    await tap('#back');
    await wait(150);
    check('mouse: Menu returns to the menu', (await view()) === 'menu');

    // ---------- the bots ----------
    const play = (rounds) => B.js(`(async () => {
      const nap = () => new Promise((r) => setTimeout(r, 4));
      const board = document.querySelector('#board');
      const cells = [...document.querySelectorAll('.cell')];
      const out = { won: 0, lost: 0, draws: 0, botFirst: 0, stuck: 0 };
      for (let g = 0; g < ${rounds}; g++) {
        let moved = false;
        for (;;) {
          let k = 0;
          while (!board.dataset.go && !board.dataset.over && k++ < 500) await nap();
          if (!board.dataset.go && !board.dataset.over) { out.stuck++; break; }
          if (board.dataset.over) { out[{ x: 'won', o: 'lost', draw: 'draws' }[board.dataset.over]]++; break; }
          const empty = cells.filter((c) => !c.dataset.m);
          if (!moved && empty.length === 8) out.botFirst++;
          moved = true;
          empty[Math.floor(Math.random() * empty.length)].click();
        }
        document.querySelector('#again').click();
      }
      return out;
    })()`);

    await click('[data-start="bot-hard"]');
    check('bot: the game opens', (await view()) === 'game' && (await text('#modeTag')) === 'Бот: непобедимый');
    check('bot: you against the bot', (await text('#whoX')) === 'Ты' && (await text('#whoO')) === 'Бот' && (await text('#status')) === 'Твой ход');
    check('bot: its own score, apart from the two-player one', (await text('#numX')) === '0' && (await text('#numO')) === '0');
    const hard = await play(60);
    check('bot: the unbeatable one never loses on the page', hard.won === 0 && hard.stuck === 0 && hard.lost + hard.draws === 60, JSON.stringify(hard));
    check('bot: it moves first in every second round', hard.botFirst === 30);
    check('bot: the score on the page matches', (await text('#numO')) === String(hard.lost) && (await text('#numD')) === String(hard.draws) && (await text('#numX')) === '0');

    await fresh(page + '?lang=ru#bot-hard', 390, 700);
    check('bot: the score survives a reload', (await text('#numO')) === String(hard.lost) && (await text('#numD')) === String(hard.draws));
    check('link: #bot-hard opens the game at once', (await view()) === 'game' && (await text('#modeTag')) === 'Бот: непобедимый');
    await click('#back');
    await wait(100);
    check('link: Menu works after a direct link', (await view()) === 'menu' && (await B.js('location.hash')) === '' && (await B.js('location.search')) === '?lang=ru');

    await click('[data-start="bot-easy"]');
    const easy = await play(60);
    check('bot: the easy one can be beaten by random taps', easy.won > 10 && easy.stuck === 0, JSON.stringify(easy));
    await click('#back');
    await wait(100);
    await click('[data-start="bot-mid"]');
    const mid = await play(60);
    check('bot: the medium one plays every round to the end', mid.stuck === 0 && mid.won + mid.lost + mid.draws === 60, JSON.stringify(mid));
    await click('#back');
    await wait(100);

    // leaving while the bot is thinking must not leave a move behind
    await click('[data-start="bot-mid"]');
    await B.js(`document.querySelectorAll('.cell')[0].click(); document.querySelector('#back').click()`);
    await wait(150);
    await click('[data-start="duo"]');
    await wait(60);
    check('bot: no stray move after leaving mid-turn', (await marks()) === '.........' && (await text('#status')) === 'Ход крестиков');
    await click('#back');
    await wait(100);

    // ---------- languages ----------
    await click('[data-lang="en"]');
    check('language: English menu', (await text('h1')) === 'Tic-Tac-Toe' && (await B.js('document.title')).startsWith('Tic-Tac-Toe') && (await B.js('document.documentElement.lang')) === 'en');
    check('language: remembered for the list of games', (await B.js(`localStorage.getItem('gm.lang')`)) === 'en' && (await B.js(`document.querySelector('#home').getAttribute('href')`)) === '../?lang=en');
    await click('[data-start="duo"]');
    await cell(4);
    check('language: English game', (await text('#status')) === 'O to move' && (await text('#whoX')) === 'Player 1' && (await text('#again')) === 'Restart');
    check('language: cells are named for screen readers', (await B.js(`document.querySelectorAll('.cell')[4].getAttribute('aria-label')`)) === 'Row 2, column 2: X');
    await click('#back');
    await wait(100);
    await click('[data-lang="ru"]');
    check('language: and back to Russian', (await text('h1')) === 'Крестики-нолики' && (await B.js(`document.querySelectorAll('.cell')[4].getAttribute('aria-label')`)) === 'Ряд 2, столбец 2: крестик');

    // ---------- sound switch ----------
    check('sound: on by default', (await B.js(`document.querySelector('#sound').getAttribute('aria-pressed')`)) === 'true');
    await click('#sound');
    check('sound: the switch is remembered', (await B.js(`document.querySelector('#sound').getAttribute('aria-pressed')`)) === 'false' && (await B.js(`localStorage.getItem('xo.sound')`)) === '0');

    // ---------- layout ----------
    // menu and game, both languages, with the longest mode name
    const bad = [];
    const note = (ok, where, what) => {
      if (!ok) bad.push(`${where}: ${what}`);
    };
    for (const lang of ['ru', 'en']) {
      await fresh(`${page}?lang=${lang}`, 390, 700);
      // things are measured where they stand, not halfway through an animation
      await B.js(`(() => { const s = document.createElement('style'); s.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }'; document.head.append(s); })()`);
      for (const [w, h] of [...PORTRAIT, ...LANDSCAPE, ...DESKTOP]) {
        const side = w > h && h <= 540;
        const where = `${lang} ${w}x${h}`;

        await B.size(w, h);
        await to('');
        let p = await B.js(PROBE);
        note(p.sw <= p.vw, where + ' menu', `page is wider than the screen (${p.sw})`);
        note(!p.cut.length, where + ' menu', 'text cut: ' + p.cut.join(' | '));
        note(apart(p.top, p.intro) && apart(p.top, p.modes) && apart(p.intro, p.modes) && apart(p.modes, p.foot) && apart(p.duo, p.bot), where + ' menu', 'parts overlap');
        note(apart(p.home, p.sound) && apart(p.sound, p.langs), where + ' menu', 'top bar overlaps');
        // the menu fits one screen on everything but the smallest phone held on its side
        if ((side && h >= 320) || (!side && h >= 454)) note(p.sh <= p.vh, where + ' menu', `scrolls (${p.sh} > ${p.vh})`);
        for (const part of ['home', 'sound', 'langs', 'duo']) note(inside(p[part], p), where + ' menu', part + ' is off the screen');

        await to('#bot-hard');
        p = await B.js(PROBE);
        note(p.sw <= p.vw, where + ' game', `page is wider than the screen (${p.sw})`);
        note(!p.cut.length, where + ' game', 'text cut: ' + p.cut.join(' | '));
        note(p.sh <= p.vh, where + ' game', `scrolls (${p.sh} > ${p.vh})`);
        note(Math.abs(p.board.w - p.board.h) < 0.6, where + ' game', `board is not square (${p.board.w}x${p.board.h})`);
        note(p.cell >= 44, where + ' game', `cells are too small (${p.cell.toFixed(0)} px)`);
        for (const part of ['back', 'tag', 'sound', 'score', 'board', 'status', 'actions']) note(inside(p[part], p), where + ' game', part + ' is off the screen');
        const parts = ['top', 'score', 'board', 'status', 'actions'];
        for (let a = 0; a < parts.length; a++) for (let b = a + 1; b < parts.length; b++) note(apart(p[parts[a]], p[parts[b]]), where + ' game', `${parts[a]} overlaps ${parts[b]}`);
        note(apart(p.back, p.tag) && apart(p.tag, p.sound), where + ' game', 'top bar overlaps');
      }
    }
    check(`layout: ${2 * (PORTRAIT.length + LANDSCAPE.length + DESKTOP.length)} screens in two languages`, bad.length === 0, bad.slice(0, 12).join('\n       '));

    check('page: no errors in the console', B.errors.length === 0, B.errors.slice(0, 5).join(' | '));

    // ---------- pictures ----------
    if (shots) {
      await B.init(`try { localStorage.setItem('xo.sound', '0'); localStorage.setItem('xo.score', JSON.stringify({ duo: { x: 3, o: 2, d: 1 }, 'bot-hard': { x: 0, o: 2, d: 4 } })); } catch {}`);
      const scenes = [
        ['phone', 390, 760, 'ru'],
        ['small-phone', 320, 454, 'ru'],
        ['phone-side', 844, 390, 'ru'],
        ['desktop', 1366, 768, 'ru'],
        ['phone-en', 390, 760, 'en'],
      ];
      for (const [name, w, h, lang] of scenes) {
        await fresh(`${page}?lang=${lang}`, w, h);
        await wait(2400);
        await shot(`${name}-menu`);
        await to('#duo');
        for (const i of [4, 0, 2, 6, 3]) await cell(i);
        await wait(700);
        await shot(`${name}-play`);
        for (const i of [8, 5]) await cell(i);
        await wait(900);
        await shot(`${name}-win`);
        await to('#bot-hard');
        await cell(0);
        await wait(250);
        await shot(`${name}-bot`);
      }
    }
  } finally {
    B.close();
    S.close();
  }
}
